import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdir, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {evaluatePresentationRendererQcV002} from './presentation_renderer_qc_v002.mjs';
import {
  buildPresentationCompositeArgumentsV001,
  buildPresentationFrameExtractionArgumentsV001,
  renderPresentationCounterfactualEncodedFrameV001,
} from './render_presentation_v002.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WORK = path.join(ROOT, 'evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001');
const FFMPEG = '/opt/homebrew/bin/ffmpeg';
const MAGICK = '/opt/homebrew/bin/magick';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalHash = value => hash(canonicalJson(value));
const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe']});
  const stdout = [], stderr = [];
  child.stdout.on('data', value => stdout.push(value));
  child.stderr.on('data', value => stderr.push(value));
  child.on('error', reject);
  child.on('close', (code, signal) => {
    const result = {code, signal, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr)};
    if (code === 0 && signal === null) resolve(result);
    else reject(new Error(JSON.stringify({code, signal, stderr: result.stderr.toString()})));
  });
});
const pixels = async image => (await run(MAGICK, [image, '-depth', '8', 'rgba:-'])).stdout;

test('counterfactual frame input refuses an out-of-range frame before any process', async () => {
  await assert.rejects(renderPresentationCounterfactualEncodedFrameV001({
    instructionId: 'target', ffmpegPath: FFMPEG, compositeArguments: [],
    representativeFrame: 900, expectedFrameCount: 900, outputPath: '/private/tmp/not-created-zev024.png',
  }), /input is invalid/u);
  assert.throws(() => buildPresentationFrameExtractionArgumentsV001({
    inputPath: 'unused', frame: 1, outputPath: 'unused', fps: 29.97,
  }), /integer frame rate/u);
});

test('real encoded frames remain pixel-identical to the captured full-length renderer', async () => {
  const directory = await mkdtemp(path.join(WORK, 'qc-integrated-fixture-v001-'));
  const implementationSha256AtStart = hash(await readFile(path.join(ROOT, 'evals/clip_composition/render_presentation_v002.mjs')));
  const diagnosis = JSON.parse(await readFile(path.join(WORK, 'render-qc-scaling-diagnosis-v001.json'), 'utf8'));
  const captured = diagnosis.files.find(row => row.path === 'evals/clip_composition/render_presentation_v002.mjs');
  assert.equal(hash(captured.content), captured.fileSha256);
  const begin = captured.content.indexOf('const composite = async (');
  const end = captured.content.indexOf('const DEFAULT_PRESENTATION_OVERLAY_ADAPTER_V001', begin);
  assert(begin >= 0 && end > begin);
  const legacyCalls = [];
  const legacy = vm.runInNewContext(captured.content.slice(begin, end) + '\ncomposite;', {
    runPresentationRendererChildProcessV001: async (command, args) => {
      legacyCalls.push({command, args: Array.from(args)});
      return run(command, Array.from(args));
    },
  });
  const canvas = {width: 1920, height: 1080, fps: 30,
    safeAreaPx: {left: 80, right: 80, top: 40, bottom: 40}};
  const expectedFrameCount = 900;
  const baseMediaPath = path.join(directory, 'base.mp4');
  await run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i',
    'testsrc2=size=1920x1080:rate=30', '-frames:v', String(expectedFrameCount),
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', baseMediaPath]);
  const png = name => path.join(directory, name + '.png');
  for (const [name, rectangle, color] of [
    ['target', '120,820 1000,970', 'white'], ['other', '1250,100 1720,260', 'yellow'],
    ['moved', '420,700 1300,850', 'white'],
  ]) await run(MAGICK, ['-size', '1920x1080', 'xc:none', '-fill', color,
    '-draw', 'rectangle ' + rectangle, 'PNG32:' + png(name)]);
  await run(MAGICK, ['-size', '1920x1080', 'xc:none', 'PNG32:' + png('transparent')]);
  const oldFrame = async (video, frame, outputPath) => run(FFMPEG, [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', video,
    '-vf', `select=eq(n\\,${frame})`, '-frames:v', '1', outputPath,
  ]);
  const evidence = [];
  for (const [name, startFrame, displayFrameCount, otherStart, otherCount, transparent] of [
    ['regular', 90, 61, 10, 25, false],
    ['short-fade', 190, 3, 10, 25, false],
    ['simultaneous', 280, 41, 270, 61, false],
    ['transparent', 410, 31, 400, 61, true],
  ]) {
    const representativeFrame = startFrame + Math.floor(displayFrameCount / 2);
    const records = [
      {element: {instructionId: 'target', startFrame, displayFrameCount}, pngPath: png(transparent ? 'transparent' : 'target')},
      {element: {instructionId: 'other', startFrame: otherStart, displayFrameCount: otherCount}, pngPath: png('other')},
    ];
    const omitted = records.map((record, index) => index === 0 ? {...record, pngPath: png('transparent')} : record);
    const common = {baseMediaPath, plan: {canvas}, expectedFrameCount, ffmpegPath: FFMPEG};
    const oldVideo = path.join(directory, name + '-legacy-omitted.mp4');
    await legacy({...common, overlayRecords: omitted, outputPath: oldVideo});
    const newArgs = buildPresentationCompositeArgumentsV001({...common, overlayRecords: omitted});
    assert.deepEqual([...newArgs, '-movflags', '+faststart', oldVideo], legacyCalls.at(-1).args,
      'main video and counterfactual encoder arguments must retain the captured implementation exactly');
    const oldPng = path.join(directory, name + '-legacy-omitted.png');
    await oldFrame(oldVideo, representativeFrame, oldPng);
    const request = {instructionId: 'target', ffmpegPath: FFMPEG, compositeArguments: newArgs,
      representativeFrame, expectedFrameCount, outputPath: path.join(directory, name + '-stream-omitted.png')};
    const outcome = await renderPresentationCounterfactualEncodedFrameV001(request);
    assert.equal(outcome.status, 'completed');
    assert.equal(outcome.encoder.code, 0); assert.equal(outcome.decoder.code, 0);
    assert.deepEqual(await pixels(request.outputPath), await pixels(oldPng), name + ': omitted pixel mismatch');
    const seekPng = path.join(directory, name + '-seek.png');
    await run(FFMPEG, buildPresentationFrameExtractionArgumentsV001({
      inputPath: oldVideo, frame: representativeFrame, outputPath: seekPng, fps: 30,
    }));
    assert.deepEqual(await pixels(seekPng), await pixels(oldPng), name + ': accurate seek mismatch');
    const recordEvidence = {name, representativeFrame, omittedPixelsIdentical: true,
      exactMainEncoderArguments: true, accurateSeekPixelsIdentical: true, outcome};
    if (name === 'simultaneous' || transparent) {
      const fullVideo = path.join(directory, name + '-legacy-full.mp4');
      await legacy({...common, overlayRecords: records, outputPath: fullVideo});
      const fullPng = path.join(directory, name + '-legacy-full.png');
      await oldFrame(fullVideo, representativeFrame, fullPng);
      const fullRequest = {...request, compositeArguments: buildPresentationCompositeArgumentsV001({...common, overlayRecords: records}),
        outputPath: path.join(directory, name + '-stream-full.png')};
      await renderPresentationCounterfactualEncodedFrameV001(fullRequest);
      assert.deepEqual(await pixels(fullRequest.outputPath), await pixels(fullPng));
      recordEvidence.fullPixelsIdentical = true;
      if (transparent) {
        assert.deepEqual(await pixels(fullPng), await pixels(oldPng));
        recordEvidence.transparentTargetDifferencePixels = 0;
        // Simulate an opaque declared subtitle absent from the actual encoded
        // output. Feed the measured zero difference into the unchanged QC.
        const element = {...records[0].element, presetId: 'fixture', registryVersion: 'fixture',
          indexedLines: [{lineIndex: 0}], visualState: {layout: {maxLines: 1}}};
        const targetSha = hash(await readFile(png('target')));
        const propertiesSha = canonicalHash(element);
        const bounds = {left: 120, top: 820, right: 1000, bottom: 970, width: 880, height: 150};
        const qc = evaluatePresentationRendererQcV002({plan: {canvas, elements: [element]}, canvas,
          applicationResults: [{instructionId: 'target', requestedPresetId: 'fixture', appliedPresetId: 'fixture',
            appliedPresetRegistryVersion: 'fixture', overlayFile: 'overlays/target.png', overlaySha256: targetSha,
            appliedOverlayPropsCanonicalSha256: propertiesSha, finalPlanElementReference: {
              planFile: 'presentation-render-plan-v002.json', instructionId: 'target',
              canonicalSha256: canonicalHash({...element, overlaySha256: targetSha}),
            }}],
          overlayInspections: [{instructionId: 'target', alphaMax: 1, alphaBounds: bounds,
            lineCount: 1, lineRects: [bounds], lineAlphaBounds: [{lineIndex: 0, ...bounds}],
            overlayFile: 'overlays/target.png', overlaySha256: targetSha,
            appliedOverlayPropsCanonicalSha256: propertiesSha,
            visibilityComparisonBasis: 'same-composite-with-instruction-omitted', representativeFrame,
            changedPixelsAgainstInstructionOmittedFrame: 0}],
          mediaInspection: {durationMs: 30000,
            video: {codecName: 'h264', width: 1920, height: 1080, fps: 30, frameCount: 900}},
          expectedFrameCount: 900, expectedAudio: {present: false},
        });
        assert.equal(qc.status, 'failed');
        assert(qc.violations.some(row => row.code === 'OUTPUT_ELEMENT_NOT_VISIBLE'));
        recordEvidence.missingEncodedSubtitleRejected = qc.violations;
      } else {
        const wrong = records.map((record, index) => index === 1 ? {...record, pngPath: png('transparent')} : record);
        const wrongRequest = {...request, compositeArguments: buildPresentationCompositeArgumentsV001({...common, overlayRecords: wrong}),
          outputPath: path.join(directory, 'wrong-omission.png')};
        await renderPresentationCounterfactualEncodedFrameV001(wrongRequest);
        assert.notDeepEqual(await pixels(wrongRequest.outputPath), await pixels(oldPng));
        const moved = [{...records[0], pngPath: png('moved')}, records[1]];
        const movedRequest = {...request, compositeArguments: buildPresentationCompositeArgumentsV001({...common, overlayRecords: moved}),
          outputPath: path.join(directory, 'moved-target.png')};
        await renderPresentationCounterfactualEncodedFrameV001(movedRequest);
        assert.notDeepEqual(await pixels(movedRequest.outputPath), await pixels(fullPng));
        recordEvidence.wrongOmissionRejectedByCanonicalFrame = true;
        recordEvidence.targetPositionMutationRejectedByCanonicalFullFrame = true;
        const inputPath = path.join(directory, 'subprocess-input.json');
        await writeFile(inputPath, JSON.stringify({...request, outputPath: path.join(directory, 'subprocess-frame.png')}));
        const cli = await run(process.execPath, [path.join(ROOT, 'evals/clip_composition/render_presentation_v002.mjs'),
          '--counterfactual-frame', inputPath]);
        const cliEvidence = JSON.parse(cli.stdout.toString());
        assert.equal(cliEvidence.status, 'completed');
        assert.deepEqual(await pixels(path.join(directory, 'subprocess-frame.png')), await pixels(oldPng));
        assert.deepEqual(JSON.parse(cli.stderr.toString()), cliEvidence);
        recordEvidence.observedSubprocessEvidenceComplete = true;
      }
    }
    evidence.push(recordEvidence);
    process.stdout.write('# ' + name + ': pixel-identical, encoder ' + outcome.encodedFrames + '/900 frames\n');
  }
  assert(evidence.some(row => row.outcome.encodedFrames < 900), 'no actual early stop was observed');
  assert.equal(hash(await readFile(path.join(ROOT, 'evals/clip_composition/render_presentation_v002.mjs'))),
    implementationSha256AtStart, 'renderer changed while its equivalence test was running');
  await writeFile(path.join(directory, 'result.json'), JSON.stringify({
    status: 'passed', capturedLegacySha256: captured.fileSha256, evidence,
    implementationSha256: implementationSha256AtStart,
  }, null, 2) + '\n');
  process.stdout.write('# evidence: ' + directory + '\n');
});
