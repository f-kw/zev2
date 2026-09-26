/** 13.1–13.2 only: human comparison, never an automatic palette contract. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile, spawn} from 'node:child_process';
import {mkdir, readFile, writeFile, access, copyFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import {once} from 'node:events';
import {promisify} from 'node:util';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createOrchestrationProjectionV001} from '../../evals/clip_composition/presentation_orchestration_projection_v001.mjs';
import {deriveOrchestrationBackgroundRangeV001, inspectOrchestrationEncodedAudioV001} from '../../evals/clip_composition/presentation_orchestration_background_v001.mjs';
import {buildConnectionExpressionTimelineFiltersV001} from '../../evals/clip_composition/connection_expression_v001.mjs';
import {editAutoPresentationOverrideV001, resolveAutoPresentationV001, sha256AutoPresentationV001} from '../../evals/clip_composition/presentation_auto_effects_v001.mjs';
import {buildPresentationColorRunsV001} from '../../evals/clip_composition/presentation_renderer_text_layout_v001.mjs';
import {createPresentationRendererOverlayJobV001, composePresentationMediaV001} from '../../evals/clip_composition/render_presentation_v002.mjs';
import {createPresentationRendererProcessObserverV001} from '../../evals/clip_composition/presentation_renderer_process_observation_v001.mjs';
import {inspectOverlayPngWithToolV001, inspectRenderedMediaWithToolsV001} from '../../evals/clip_composition/presentation_renderer_qc_v002.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from '../../evals/clip_composition/presentation_output_directory_v001.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const prior = path.join(repo, 'evals/clip_composition/outputs/presentation/stage4-editing-variation-20260923-v001');
const sourceDirectory = path.join(repo, 'docs/reports/digest-presentation-orchestration-stage3-inputs-20260918');
export const comparison = Object.freeze({
  startFrame: 3032, endFrameExclusive: 4417, fps: 30,
  cyan: '#87CEFA', yellow: '#FFD65A', cyanOrigin: 'ImageMagick SVG/X11 named color LightSkyBlue = 135,206,250',
  changes: [
    {suffix: '000021', text: 'アングルで怖がらせんの', reason: '怖がらせる仕組みへ絞り、評価の「マジ上手い」は白へ戻す。'},
    {suffix: '000025', text: '分かってくる', reason: '経験によって来る場面を予測する、という後続説明の前提。結末は先に強調しない。'},
  ],
  cyanSuffixes: ['000021', '000025'],
});
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async p => JSON.parse(await readFile(p, 'utf8'));
const save = (p, value) => writeFile(p, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const ref = async p => {const b = await readFile(p); return {path: p, bytes: b.length, fileSha256: sha(b)};};
const exec = promisify(execFile);
const run = async (command, args) => (await exec(command, args, {maxBuffer: 128 * 1024 * 1024, encoding: 'buffer'})).stdout;
const ffmpegPath = '/opt/homebrew/bin/ffmpeg', ffprobePath = '/opt/homebrew/bin/ffprobe', imageMagickPath = '/opt/homebrew/bin/magick';
const tools = {ffmpegPath, ffprobePath, imageMagickPath};
const stem = e => e.instructionId.slice(-6);
const withoutColor = value => {const x = structuredClone(value); delete x.presentationColorRange; return x;};
const selectedText = e => e.presentationColorRange ? Array.from(e.text).slice(e.presentationColorRange.startCodePoint, e.presentationColorRange.endCodePointExclusive).join('') : null;

export function makeVariants(baselinePlan, autoPresentation) {
  const original = structuredClone({baselinePlan, autoPresentation});
  const a = resolveAutoPresentationV001({baselinePlan, ...autoPresentation});
  let overrides = autoPresentation.overrides;
  for (const choice of comparison.changes) {
    const target = a.plan.elements.find(e => stem(e) === choice.suffix);
    assert(target && target.startFrame >= comparison.startFrame && target.endFrameExclusive <= comparison.endFrameExclusive);
    const current = a.resolution.captions.find(e => e.captionId === target.instructionId);
    assert(['Normal', 'Focus'].includes(current.role));
    assert.equal(current.hasOverride, false, 'do not overwrite an existing human choice');
    overrides = editAutoPresentationOverrideV001({baselinePlan, ...autoPresentation, overrides,
      captionId: target.instructionId, selection: {role: 'Focus', presentation: 'provisional-focus', scope: 'partial-caption', targetText: choice.text}});
  }
  const b = resolveAutoPresentationV001({baselinePlan, ...autoPresentation, overrides});
  const c = structuredClone(b.plan);
  for (const e of c.elements) if (comparison.cyanSuffixes.includes(stem(e))) e.presentationColorRange.fontColor = comparison.cyan;
  assert.deepEqual({baselinePlan, autoPresentation}, original);
  assert.deepEqual({...a.plan, elements: null}, {...b.plan, elements: null});
  assert.equal(a.plan.elements.length, b.plan.elements.length);
  for (let i = 0; i < a.plan.elements.length; i++) {
    assert.deepEqual(withoutColor(a.plan.elements[i]), withoutColor(b.plan.elements[i]));
    assert.deepEqual(withoutColor(b.plan.elements[i]), withoutColor(c.elements[i]));
    if (!comparison.changes.some(x => x.suffix === stem(a.plan.elements[i]))) assert.deepEqual(a.plan.elements[i], b.plan.elements[i]);
    const br = b.plan.elements[i].presentationColorRange, cr = c.elements[i].presentationColorRange;
    assert.deepEqual(br && {...br, fontColor: null}, cr && {...cr, fontColor: null});
    if (cr) assert([comparison.yellow, comparison.cyan].includes(cr.fontColor));
    buildPresentationColorRunsV001({...c.elements[i], fontColor: c.elements[i].visualState.textStyle.fontColor});
  }
  return {A: a.plan, B: b.plan, C: c, bOverrides: overrides};
}

async function prepare(output) {
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory: output});
  await mkdir(output);
  const drawPath = path.join(prior, 'render-evidence/draw-result.json'), draw = await json(drawPath);
  const completionPath = path.join(prior, 'completion.json'), completion = await json(completionPath);
  assert.equal(completion.status, 'passed');
  assert.equal((await ref(completion.video.path)).fileSha256, completion.video.fileSha256);
  const baseline = draw.completedFrameQc.evidence.finiteState.baselinePlan;
  assert.equal(sha256AutoPresentationV001(baseline), draw.autoPresentationInputs.context.baselineRef.canonicalSha256);
  const variants = makeVariants(baseline, draw.autoPresentationInputs);
  assert.deepEqual(variants.A, draw.resolvedPlan);
  const sourcePath = path.join(sourceDirectory, 'source-bindings.json'), source = await json(sourcePath);
  const connectionsPath = path.join(sourceDirectory, 'connectionAuto.json'), connections = await json(connectionsPath);
  const projection = createOrchestrationProjectionV001({
    ...Object.fromEntries(['digestRef', 'planRef', 'timelineRef', 'mediaRef', 'planBytes', 'timelineBytes', 'playbackSampleRate', 'observationSampleRate'].map(k => [k, source[k]])),
    connections: connections.connections.map(({connectionId, preset, presetVersion}) => ({connectionId, preset, presetVersion})),
  });
  const lineagePath = path.join(repo, 'docs/reports/review-reflection-r1-r3-20260921-v002/r2-full-background-reuse-readonly-v001.json');
  const lineage = await json(lineagePath);
  assert.equal(projection.projectionSha256, lineage.projection.projectionSha256);
  assert.equal((await ref(source.mediaRef.path)).fileSha256, source.mediaRef.fileSha256);
  const prefix = draw.autoPresentationInputs.context.pulseTimingProjection.frameOffset;
  assert.equal(prefix, lineage.projection.addedFrames);
  const recipe = deriveOrchestrationBackgroundRangeV001({projection,
    range: {startFrame: comparison.startFrame - prefix, endFrameExclusive: comparison.endFrameExclusive - prefix}});
  const rows = variants.A.elements.filter(e => e.endFrameExclusive > comparison.startFrame && e.startFrame < comparison.endFrameExclusive);
  assert.equal(rows.length, 12);
  for (const e of rows) assert(e.startFrame >= comparison.startFrame && e.endFrameExclusive <= comparison.endFrameExclusive);
  assert(rows.every(e => !e.presentationMotion && !e.presentationPulse && !e.presentationPreset));
  const inputs = await Promise.all([drawPath, completionPath, completion.video.path, sourcePath, connectionsPath, lineagePath, source.mediaRef.path].map(ref));
  const records = draw.overlayRecords.filter(r => rows.some(e => e.instructionId === r.element.instructionId)).map(r => ({
    element: r.element, props: r.props, pngPath: path.join(prior, 'render/overlays', path.basename(r.pngPath)), pngSha256: r.pngSha256,
  }));
  for (const r of records) {const binding = await ref(r.pngPath); assert.equal(binding.fileSha256, r.pngSha256); inputs.push(binding);}
  const inventory = rows.map(e => ({id: e.instructionId, text: e.text, startFrame: e.startFrame, endFrameExclusive: e.endFrameExclusive,
    role: e.visualState.background ? 'Panel' : e.presentationColorRange ? 'Color' : 'Normal',
    scope: !e.presentationColorRange ? null : selectedText(e) === e.text ? 'whole' : 'partial', selectedText: selectedText(e),
    range: e.presentationColorRange ?? null}));
  const prepared = {schemaVersion: 'color-emphasis-comparison-only-v001', sourceHead: '67dce6ae4aeb2a654b040cfcc5f8daa348410de8',
    comparison, inputs, source, projection, recipe, records, variants, inventory, originalVideo: completion.video,
    newAiJudgment: false, officialPaletteChanged: false, humanAdoption: 'not-performed'};
  await save(path.join(output, 'prepared.json'), prepared);
  console.log(JSON.stringify({prepared: output, inventory}));
}

async function draw(output) {
  const p = await json(path.join(output, 'prepared.json'));
  for (const r of p.inputs) assert.equal((await ref(r.path)).fileSha256, r.fileSha256);
  const scratch = path.join(output, 'evidence'); await mkdir(scratch);
  const observer = createPresentationRendererProcessObserverV001({observationDirectory: path.join(scratch, 'processes')});
  const overlay = createPresentationRendererOverlayJobV001({remotionPath: path.join(repo, 'runner/node_modules/@remotion/cli/remotion-cli.js'),
    chromiumPath: path.join(repo, 'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell'), processObserver: observer});
  const raw = file => run(imageMagickPath, [file, '-depth', '8', 'rgba:-']);
  const raster = [], records = {A: [], B: [], C: []};
  try {
    for (const original of p.records) {
      const suffix = stem(original.element), changed = comparison.changes.some(c => c.suffix === suffix);
      const paths = {A: original.pngPath};
      if (changed) {
        const props = structuredClone(original.props);
        // Saved final properties, including measured placement, are held fixed.
        for (const name of ['A', 'B', 'C']) {
          const e = p.variants[name].elements.find(e => e.instructionId === original.element.instructionId);
          const current = {...props};
          delete current.presentationColorRange;
          if (e.presentationColorRange) current.presentationColorRange = e.presentationColorRange;
          paths[name] = path.join(scratch, `${name}-${suffix}.png`);
          await overlay.renderStill(current, paths[name]);
          await save(path.join(scratch, `${name}-${suffix}-props.json`), current);
        }
        assert.deepEqual(await raw(paths.A), await raw(original.pngPath), 'current native drawing differs from saved A');
        const b = await raw(paths.B), c = await raw(paths.C);
        const bp = p.variants.B.elements.find(e => stem(e) === suffix).presentationColorRange;
        const maskPaths = [];
        // White/blue differ in every observed selected glyph pixel. A black
        // selection is unsuitable here: Chromium paints some edges like white.
        // These diagnostic colors never enter the comparison videos.
        for (const color of ['#FFFFFF', '#0000FF']) {
          const maskPath = path.join(scratch, `${suffix}-mask-${color.slice(1)}.png`);
          await overlay.renderStill({...props, presentationColorRange: {...bp, fontColor: color}}, maskPath); maskPaths.push(maskPath);
        }
        const [white, blue] = await Promise.all(maskPaths.map(raw));
        let changes = 0, exactCyan = 0, outside = 0, alpha = 0;
        for (let i = 0; i < b.length; i += 4) {
          if (b[i + 3] !== c[i + 3]) alpha++;
          const changedPixel = b[i] !== c[i] || b[i + 1] !== c[i + 1] || b[i + 2] !== c[i + 2];
          if (changedPixel) {
            changes++;
            if (white.subarray(i, i + 4).equals(blue.subarray(i, i + 4))) outside++;
            if (c[i] === 135 && c[i + 1] === 206 && c[i + 2] === 250) exactCyan++;
          }
        }
        assert(changes > 0 && exactCyan > 0); assert.equal(outside, 0); assert.equal(alpha, 0);
        const inspections = [];
        for (const name of ['A', 'B', 'C']) {
          const inspection = await inspectOverlayPngWithToolV001({instructionId: original.element.instructionId, pngPath: paths[name], imageMagickPath});
          const b = inspection.alphaBounds, canvas = props.canvas, safe = canvas.safeAreaPx;
          assert(b && b.left >= safe.left && b.top >= safe.top && b.right <= canvas.width - safe.right && b.bottom <= canvas.height - safe.bottom);
          inspections.push({name, ...inspection});
        }
        raster.push({id: original.element.instructionId, changedPixels: changes, exactCyanPixels: exactCyan,
          changedPixelsOutsideSelectedGlyphs: outside, alphaDifferences: alpha, inspections});
      } else paths.B = paths.C = paths.A;
      for (const name of ['A', 'B', 'C']) {
        const originalElement = p.variants[name].elements.find(e => e.instructionId === original.element.instructionId);
        const element = {...originalElement, startFrame: originalElement.startFrame - comparison.startFrame,
          endFrameExclusive: originalElement.endFrameExclusive - comparison.startFrame};
        records[name].push({element, pngPath: paths[name]});
      }
      console.log(JSON.stringify({caption: suffix, changed}));
    }
  } finally {await overlay.close();}
  await save(path.join(output, 'raster.json'), raster);
  await save(path.join(output, 'records.json'), records);
  console.log('local drawing passed');
}

async function background(output) {
  const p = await json(path.join(output, 'prepared.json'));
  assert.equal((await json(path.join(output, 'raster.json'))).length, 2);
  for (const r of p.inputs) assert.equal((await ref(r.path)).fileSha256, r.fileSha256);
  const scratch = path.join(output, 'evidence'), recipe = p.recipe;
  const common = ['-hide_banner', '-nostdin', '-v', 'error', '-n', '-filter_complex_threads', '1'];
  const lossless = ['-map', '[v]', '-map', '[a]', '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'yuv420p', '-fps_mode', 'passthrough', '-c:a', 'pcm_f32le', '-ar', '44100', '-ac', '2', '-f', 'nut'];
  const trim = r => `[0:v]trim=start_frame=${r.startFrame}:end_frame=${r.endFrameExclusive},setpts=N/(30*TB)[v];[0:a]atrim=start_sample=${r.startSample}:end_sample=${r.endSampleExclusive},asetpts=N/SR/TB[a]`;
  const input = path.join(scratch, 'source-range.nut'), working = path.join(scratch, 'working.nut'), base = path.join(scratch, 'base.nut');
  await run(ffmpegPath, [...common, '-i', p.source.mediaRef.path, '-filter_complex', trim(recipe.sourceRange), ...lossless, input]);
  const graph = buildConnectionExpressionTimelineFiltersV001({presentationTimeline: recipe.presentationTimeline,
    canvas: {width: 1920, height: 1080, fps: 30}, audio: {sampleRate: 44100, channelLayout: 'stereo'}, softWindows: recipe.softWindows});
  const graphPath = path.join(scratch, 'connection-filter.txt'); await writeFile(graphPath, graph.join(';'), {flag: 'wx'});
  await run(ffmpegPath, [...common, '-i', input, '-filter_complex_script', graphPath,
    ...lossless.map(x => x === '[v]' ? '[timelineVideo]' : x === '[a]' ? '[timelineAudio]' : x), working]);
  await run(ffmpegPath, [...common, '-i', working, '-filter_complex', trim(recipe.trimRange), ...lossless, base]);
  // Extract current completed audio once; every side copies this same packet stream.
  const audio = path.join(scratch, 'shared-audio.m4a');
  const count = comparison.endFrameExclusive - comparison.startFrame;
  await run(ffmpegPath, [...common, '-i', p.originalVideo.path, '-vn', '-af',
    `atrim=start_sample=${comparison.startFrame * 1470}:end_sample=${comparison.endFrameExclusive * 1470},asetpts=N/SR/TB`, '-c:a', 'aac', audio]);
  await save(path.join(output, 'background.json'), {base, audio, frameCount: count});
}

async function render(output) {
  const p = await json(path.join(output, 'prepared.json')), records = await json(path.join(output, 'records.json'));
  const {base, audio, frameCount: count} = await json(path.join(output, 'background.json'));
  for (const r of p.inputs) assert.equal((await ref(r.path)).fileSha256, r.fileSha256);
  const clips = [];
  for (const [name, file] of [['A', 'A-current.mp4'], ['B', 'B-yellow-selection.mp4'], ['C', 'C-yellow-cyan.mp4']]) {
    const plan = {...p.variants[name], elements: records[name].map(r => r.element)};
    const outputPath = path.join(output, file);
    await assertNewFile(outputPath);
    console.log(JSON.stringify({render: name, frames: count}));
    await composePresentationMediaV001({baseMediaPath: base, audioMediaPath: audio, plan, overlayRecords: records[name],
      expectedFrameCount: count, outputPath, ffmpegPath, serializePngAndFilters: true});
    const media = await inspectRenderedMediaWithToolsV001(outputPath, tools);
    assert.equal(media.video.frameCount, count); assert.equal(media.video.fps, 30);
    assert.equal(media.video.width, 1920); assert.equal(media.video.height, 1080);
    const audioEvidence = await inspectOrchestrationEncodedAudioV001({audioPath: outputPath, logicalSampleCount: count * 1470, sampleRate: 44100, ...tools});
    clips.push({name, ...await ref(outputPath), media, audioEvidence});
  }
  for (const clip of clips) {
    assert.equal(clip.audioEvidence.packetPayloadSha256, clips[0].audioEvidence.packetPayloadSha256);
    assert.equal(clip.audioEvidence.logicalDecodedPayloadSha256, clips[0].audioEvidence.logicalDecodedPayloadSha256);
  }
  for (const r of p.inputs) assert.equal((await ref(r.path)).fileSha256, r.fileSha256);
  await save(path.join(output, 'rendered.json'), {status: 'passed', clips, frameCount: count,
    sourceFilesUnchanged: true, audioIdentical: true, officialPaletteChanged: false, humanReview: 'pending-13.3'});
}

async function assertNewFile(file) {
  try {await access(file);} catch (error) {if (error.code === 'ENOENT') return; throw error;}
  throw new Error(`comparison output already exists: ${file}`);
}

async function verify(output) {
  const p = await json(path.join(output, 'prepared.json'));
  const records = await json(path.join(output, 'records.json'));
  const rendered = await json(path.join(output, 'rendered.json'));
  const {base} = await json(path.join(output, 'background.json'));
  const scratch = path.join(output, 'evidence');
  const raw = file => run(imageMagickPath, [file, '-depth', '8', 'rgba:-']);
  const capture = async (video, frame, file) => {
    await run(ffmpegPath, ['-v', 'error', '-nostdin', '-n', '-ss', String(frame / 30), '-i', video,
      '-frames:v', '1', '-an', file]);
  };
  const rows = [];
  for (const original of records.A) {
    const suffix = stem(original.element);
    const frame = Math.floor((original.element.startFrame + original.element.endFrameExclusive) / 2);
    const bg = path.join(scratch, `background-${suffix}.png`); await capture(base, frame, bg);
    const backgroundPixels = await raw(bg);
    const sides = {};
    for (const name of ['A', 'B', 'C']) {
      const record = records[name].find(r => stem(r.element) === suffix);
      const actualPath = path.join(scratch, `final-${name}-${suffix}.png`);
      await capture(rendered.clips.find(c => c.name === name).path, frame, actualPath);
      const expectedPath = path.join(scratch, `reference-${name}-${suffix}.png`);
      await run(ffmpegPath, ['-v', 'error', '-nostdin', '-n', '-filter_complex_threads', '1',
        '-i', bg, '-i', record.pngPath, '-filter_complex', '[0:v][1:v]overlay=0:0,format=yuv420p[v]',
        '-map', '[v]', '-frames:v', '1', expectedPath]);
      const inspection = await inspectOverlayPngWithToolV001({instructionId: record.element.instructionId,
        pngPath: record.pngPath, imageMagickPath});
      const bounds = inspection.alphaBounds, {safeAreaPx: safe, width, height} = p.records.find(r => stem(r.element) === suffix).props.canvas;
      assert(bounds && bounds.left >= safe.left && bounds.top >= safe.top && bounds.right <= width - safe.right && bounds.bottom <= height - safe.bottom);
      const [actual, expected, overlay] = await Promise.all([actualPath, expectedPath, record.pngPath].map(raw));
      let expectedError = 0, omittedCaptionError = 0, opaquePixels = 0;
      for (let i = 0; i < overlay.length; i += 4) if (overlay[i + 3] === 255) {
        opaquePixels++;
        for (let ch = 0; ch < 3; ch++) {
          expectedError += Math.abs(actual[i + ch] - expected[i + ch]);
          omittedCaptionError += Math.abs(actual[i + ch] - backgroundPixels[i + ch]);
        }
      }
      // Compare integer pixel errors, without an invented tolerance or score.
      assert(opaquePixels > 0 && expectedError < omittedCaptionError);
      sides[name] = {actual, expected, overlay};
      rows.push({variant: name, id: record.element.instructionId, frame, originalFrame: frame + comparison.startFrame,
        actualFrame: await ref(actualPath), alphaBounds: bounds, opaquePixels,
        expectedError, omittedCaptionError, visibleCaption: true});
    }
    if (comparison.cyanSuffixes.includes(suffix)) {
      let cyanPixels = 0, bCorrect = 0, bWrong = 0, cCorrect = 0, cWrong = 0;
      for (let i = 0; i < sides.C.overlay.length; i += 4) {
        assert.equal(sides.A.overlay[i + 3], sides.B.overlay[i + 3]);
        assert.equal(sides.B.overlay[i + 3], sides.C.overlay[i + 3]);
        if (!sides.C.overlay.subarray(i, i + 4).equals(Buffer.from([135, 206, 250, 255]))) continue;
        cyanPixels++;
        for (let ch = 0; ch < 3; ch++) {
          bCorrect += Math.abs(sides.B.actual[i + ch] - sides.B.expected[i + ch]);
          bWrong += Math.abs(sides.B.actual[i + ch] - sides.C.expected[i + ch]);
          cCorrect += Math.abs(sides.C.actual[i + ch] - sides.C.expected[i + ch]);
          cWrong += Math.abs(sides.C.actual[i + ch] - sides.B.expected[i + ch]);
        }
      }
      assert(cyanPixels > 0 && bCorrect < bWrong && cCorrect < cWrong);
      for (const row of rows.filter(r => r.id === original.element.instructionId)) row.completedColorCheck = {
        cyanPixels, bCorrect, bWrong, cCorrect, cWrong, passed: true};
    }
  }
  for (const r of p.inputs) assert.equal((await ref(r.path)).fileSha256, r.fileSha256);
  await save(path.join(output, 'final-frames.json'), {status: 'passed', sampledFrames: rows.length, rows,
    method: 'Every caption midpoint in each completed clip; native full-opacity pixels compared with same-background intended drawing and omitted caption. B/C also compared with the wrong color. Native raster checks cover exact unchanged pixels; lossy MP4 is not claimed byte-identical outside the glyphs.'});
}

async function serve(output) {
  // Reuse the repository's loopback-only, allow-listed HTTP Range handler.
  await access(path.join(output, 'rendered.json'));
  const page = path.join(output, 'review.html');
  try {await copyFile(path.join(repo, 'docs/reports/color-emphasis-20260926/review.html'), page, constants.COPYFILE_EXCL);}
  catch (error) {if (error.code !== 'EEXIST') throw error;}
  const code = `
import sys,json
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
sys.path.insert(0,sys.argv[1])
import serve_digest_review_v001 as review
directory=Path(sys.argv[2]).resolve(strict=True)
review.FILES={'review.html','A-current.mp4','B-yellow-selection.mp4','C-yellow-cyan.mp4'}
assert all((directory/n).is_file() and not (directory/n).is_symlink() for n in review.FILES)
server=ThreadingHTTPServer(('127.0.0.1',0),partial(review.ReviewHandler,directory=str(directory)))
print(json.dumps({'origin':f'http://127.0.0.1:{server.server_port}','files':sorted(review.FILES)}),flush=True)
try: server.serve_forever()
except KeyboardInterrupt: pass
finally: server.server_close()
`;
  const process = spawn('python3', ['-u', '-c', code, path.join(repo, 'evals/clip_composition'), output], {stdio: 'inherit'});
  const [codeValue] = await once(process, 'exit');
  assert.equal(codeValue, 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.version, 'v20.19.6');
  const [command, output] = process.argv.slice(2);
  assert(path.isAbsolute(output));
  if (command === 'prepare') await prepare(output);
  else if (command === 'draw') await draw(output);
  else if (command === 'background') await background(output);
  else if (command === 'render') await render(output);
  else if (command === 'verify') await verify(output);
  else if (command === 'serve') await serve(output);
  else throw new Error('prepare | draw | background | render | verify | serve, followed by a comparison output directory');
}
