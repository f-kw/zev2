/** Small, mechanical completed-frame audit of the saved 7A human package.
 * Uses the production compositor and native exact-RGB classifier. No AI,
 * perceptual score, new threshold, full-Digest rendering or source mutation. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {mkdir, readFile, writeFile, unlink} from 'node:fs/promises';
import {promisify} from 'node:util';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPresentationCompositeArgumentsV001} from '../../evals/clip_composition/render_presentation_v002.mjs';
import {getPresentationCaptionMotionProgramV001} from '../../evals/clip_composition/presentation_caption_motion_v001.mjs';
import {classifyPresentationNativeFrameRgbV001} from '../../evals/clip_composition/presentation_native_frame_qc_v001.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const execute = promisify(execFile);
const ffmpeg = '/opt/homebrew/bin/ffmpeg', ffprobe = '/opt/homebrew/bin/ffprobe', magick = '/opt/homebrew/bin/magick';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async p => JSON.parse(await readFile(p, 'utf8'));
const save = (p, x) => writeFile(p, JSON.stringify(x, null, 2) + '\n', {flag: 'wx'});
const binding = async p => {const bytes = await readFile(p);return {path: p, bytes: bytes.length, sha256: hash(bytes)};};

async function verifyPackage(directory, outputName = 'frame-check') {
  assert(outputName === 'frame-check' || /^frame-check\/[a-z0-9-]+$/.test(outputName));
  const started = new Date().toISOString(), output = path.join(directory, outputName);
  await mkdir(output, {recursive: false});
  const commands = [], checks = [], inputBindings = [], generatedReferenceImages = [];
  const run = async (command, args) => {
    const began = Date.now();
    try {
      const {stdout} = await execute(command, args, {encoding: 'buffer', maxBuffer: 64 * 1024 * 1024});
      commands.push({command, args, startedAt: new Date(began).toISOString(), elapsedMs: Date.now() - began,
        stdoutBytes: stdout.length, stdoutSha256: hash(stdout), status: 'passed'});
      return stdout;
    } catch (error) {
      commands.push({command, args, startedAt: new Date(began).toISOString(), elapsedMs: Date.now() - began,
        status: 'failed', error: String(error.stderr ?? error.message)});
      throw error;
    }
  };
  const bind = async p => {const b = await binding(p);inputBindings.push(b);return b;};
  const checkBound = async ref => {assert.deepEqual(await bind(ref.path), ref);};
  const shiftedRecords = new Map();
  const shiftRecord = async (record, dx, dy) => {
    const key = `${record.element.instructionId}:${dx}:${dy}`;
    if (shiftedRecords.has(key)) return shiftedRecords.get(key);
    const shiftImage = async native => {
      const bounds = native.inspection.alphaBounds;
      assert(bounds.left > 0 && bounds.right < 1920 && bounds.top > 0 && bounds.bottom < 1080,
        'position probe must not wrap visible source pixels');
      const pngPath = path.join(output, 'shifted-rgba-' + generatedReferenceImages.length + '.png');
      // Shift the actual RGBA pixels. A 1px overlay coordinate is rounded away
      // by yuv420p's chroma grid and is therefore not a position counterexample.
      await run(magick, [native.pngPath, '-roll', `+${dx}+${dy}`, pngPath]);
      const b = await binding(pngPath);
      generatedReferenceImages.push({source: await binding(native.pngPath), offsetPx: {x: dx, y: dy}, generated: b});
      return {...native, pngPath, sha256: b.sha256};
    };
    let shifted;
    if (record.motionStates) {
      const motionStates = [];
      for (const state of record.motionStates) motionStates.push(await shiftImage(state));
      shifted = {...record, pngPath: motionStates[0].pngPath, motionStates};
    } else shifted = await shiftImage(record);
    shiftedRecords.set(key, shifted);return shifted;
  };
  const extract = async (media, frame, crop = null) => {
    const seconds = Math.floor(frame / 30), local = frame - seconds * 30;
    const filter = `select=eq(n\\,${local}),format=rgb24` + (crop ? `,crop=${crop.width}:${crop.height}:${crop.left}:${crop.top}:exact=1` : '');
    const bytes = await run(ffmpeg, ['-hide_banner', '-v', 'error', '-nostdin', '-ss', String(seconds), '-i', media,
      '-vf', filter, '-frames:v', '1', '-an', '-c:v', 'rawvideo', '-threads', '1', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1']);
    assert.equal(bytes.length, (crop ? crop.width * crop.height : 1920 * 1080) * 3);
    return bytes;
  };
  const audio = async media => JSON.parse((await run(ffprobe, ['-v', 'error', '-select_streams', 'a:0', '-show_streams', '-show_packets',
    '-show_entries', 'stream=time_base,start_pts,duration_ts,sample_rate,channels:packet=pts,dts,duration,size,data_hash',
    '-show_data_hash', 'sha256', '-of', 'json', media])).toString());
  try {
    const planPath = path.join(directory, 'candidate-render-plan.json'), rasterPath = path.join(directory, 'raster-records.json');
    const packagePath = path.join(directory, 'human-package-final.json');
    const plan = await json(planPath), records = await json(rasterPath), pkg = await json(packagePath);
    await Promise.all([planPath, rasterPath, packagePath, fileURLToPath(import.meta.url), ffmpeg, ffprobe, magick,
      path.join(root, 'evals/clip_composition/render_presentation_v002.mjs'),
      path.join(root, 'evals/clip_composition/presentation_caption_motion_v001.mjs'),
      path.join(root, 'evals/clip_composition/presentation_native_frame_qc_v001.mjs')].map(bind));
    await checkBound(pkg.video);
    assert.equal(pkg.exactCfrPts, true);assert.equal(pkg.videoTimeBase, '1/30');
    const videoFrames = JSON.parse((await run(ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_frames',
      '-show_entries', 'frame=best_effort_timestamp', '-of', 'json', pkg.video.path])).toString()).frames;
    assert.equal(videoFrames.length, pkg.totalFrames);
    videoFrames.forEach((f, i) => assert.equal(Number(f.best_effort_timestamp), i));
    const audioChecks = [], packageSides = [];
    let cursor = 0;
    for (let pairIndex = 0; pairIndex < pkg.pairs.length; pairIndex++) {
      const pair = pkg.pairs[pairIndex], count = pair.endFrameExclusive - pair.startFrame;
      await checkBound(pair.base);await checkBound(pair.audio);
      const shared = await audio(pair.audio.path), observations = [];
      const preparation = await json(path.join(directory, 'review-v002', `${pairIndex}-preparation-command.json`));
      assert(preparation.audioArgs.includes(`atrim=start_sample=${pair.startFrame * 1470}:end_sample=${pair.endFrameExclusive * 1470},asetpts=N/SR/TB`));
      for (const side of pair.sides) {
        await checkBound(side.media);await checkBound(side.labeled);
        const observed = await audio(side.media.path);
        assert.deepEqual(observed.packets, shared.packets, 'audio packet payload/timing changed between shared input and side');
        assert.equal(observed.streams[0].start_pts, 0);
        assert.equal(Number(observed.streams[0].sample_rate), 44100);
        assert.equal(observed.streams[0].duration_ts, count * 1470);
        observations.push({side: side.name, packetCount: observed.packets.length,
          packetSha256: hash(Buffer.from(JSON.stringify(observed.packets))), durationSamples: observed.streams[0].duration_ts});
        packageSides.push({...side, packageStartFrame: cursor});cursor += count;
      }
      assert.equal(observations[0].packetSha256, observations[1].packetSha256);
      audioChecks.push({caption: pair.suffix, sourceRangeSamples: [pair.startFrame * 1470, pair.endFrameExclusive * 1470],
        status: 'identical-packets-and-clock', observations,
        note: 'The shared M4A container duration can differ by edit-list rounding; packet clocks match exactly.'});
    }
    assert.equal(cursor, pkg.totalFrames);
    // Independent audio-only execution of the package's existing six-side trim
    // and concat, then the same AAC encoder. No video is generated here.
    const expectedAudio = path.join(output, 'expected-package-audio.m4a');
    const audioArgs = ['-hide_banner', '-v', 'error', '-nostdin', '-n'];
    packageSides.forEach(s => audioArgs.push('-i', s.labeled.path));
    const graph = packageSides.map((s, i) => `[${i}:a]atrim=end_sample=${s.frameCount * 1470},asetpts=N/SR/TB[a${i}]`);
    graph.push(packageSides.map((_, i) => `[a${i}]`).join('') + `concat=n=${packageSides.length}:v=0:a=1[a]`);
    audioArgs.push('-filter_complex', graph.join(';'), '-map', '[a]', '-vn', '-c:a', 'aac', '-movie_timescale', '30', expectedAudio);
    await run(ffmpeg, audioArgs);
    const actualAudio = await audio(pkg.video.path), rebuiltAudio = await audio(expectedAudio);
    assert.deepEqual(actualAudio.packets, rebuiltAudio.packets, 'final continuous AAC differs from independent same-input audio assembly');
    assert.equal(actualAudio.streams[0].duration_ts, pkg.totalFrames * 1470);
    const finalAudioCheck = {status: 'identical-independent-AAC-packets-and-clock', packetCount: actualAudio.packets.length,
      packetSha256: hash(Buffer.from(JSON.stringify(actualAudio.packets))), durationSamples: actualAudio.streams[0].duration_ts,
      reference: await binding(expectedAudio),
      limitation: 'Final AAC is a continuous re-encoding, not byte-identical to the six input AAC streams.'};

    const sourceBackground = path.join(root, 'runtime/artifacts/digest-new-material-20260926-v001/presentation/background/background.nut');
    for (const suffix of ['000260', '000095']) {
      const pair = pkg.pairs.find(p => p.suffix === suffix);assert(pair);
      const side = pair.sides.find(s => s.name === 'candidate');
      const packageSide = packageSides.find(s => s.media.path === side.media.path);
      const children = pair.children.map(c => records.find(r => r.element.instructionId === c.captionId));
      assert(children.every(Boolean));
      for (const r of children) {
        assert.deepEqual(plan.elements.find(e => e.instructionId === r.element.instructionId), r.element);
        for (const native of r.motionStates ?? [r]) {
          const b = await bind(native.pngPath);assert.equal(b.sha256, native.sha256);
        }
      }
      const samples = suffix === '000095'
        ? getPresentationCaptionMotionProgramV001({element: children[0].element, canvas: plan.canvas}).samples
        : [...new Set(children.flatMap(r => [r.element.startFrame, r.element.startFrame + 3, r.element.endFrameExclusive - 1]))]
          .sort((a, b) => a - b).map(frame => ({frame, expectedState: null}));
      for (const sample of samples) {
        const frame = sample.frame, localFrame = frame - pair.startFrame;
        const record = children.find(r => r.element.startFrame <= frame && frame < r.element.endFrameExclusive);assert(record);
        const natives = record.motionStates ?? children;
        const bounds = natives.map(r => r.inspection.alphaBounds);
        // Union of actual saved alpha bounds plus the one-pixel position probes.
        const left = Math.max(0, Math.min(...bounds.map(b => b.left)) - 1);
        const right = Math.min(1920, Math.max(...bounds.map(b => b.right)) + 1);
        const top = Math.max(0, Math.min(...bounds.map(b => b.top)) - 1);
        const bottom = Math.min(1080, Math.max(...bounds.map(b => b.bottom)) + 1);
        const crop = {left, top, width: right - left, height: bottom - top};
        const baseRgb = await extract(pair.base.path, localFrame), sourceRgb = await extract(sourceBackground, frame);
        assert(baseRgb.equals(sourceRgb), 'review background is not the bound source frame');
        const baseFrame = path.join(output, `${suffix}-${frame}-base.nut`);
        const seconds = Math.floor(localFrame / 30), remaining = localFrame - seconds * 30;
        await run(ffmpeg, ['-hide_banner', '-v', 'error', '-nostdin', '-n', '-ss', String(seconds), '-i', pair.base.path,
          '-vf', `select=eq(n\\,${remaining}),setpts=PTS-STARTPTS`, '-frames:v', '1', '-an', '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'yuv420p', baseFrame]);
        const recipes = [{id: 'expected', overlayRecords: [record]}, {id: 'omitted', overlayRecords: []}];
        if (record.motionStates) {
          for (const state of record.motionStates.filter(s => s.state !== sample.expectedState)) recipes.push({id: 'wrong-state-' + state.state,
            overlayRecords: [{element: state.element, pngPath: state.pngPath}]});
        } else {
          for (const other of children.filter(r => r !== record)) recipes.push({id: 'wrong-child-' + other.element.instructionId,
            overlayRecords: [{element: record.element, pngPath: other.pngPath}]});
        }
        recipes.push({id: 'wrong-position-right-1px', overlayRecords: [await shiftRecord(record, 1, 0)]},
          {id: 'wrong-position-down-1px', overlayRecords: [await shiftRecord(record, 0, 1)]});
        const references = [];
        for (const recipe of recipes) {
          const args = buildPresentationCompositeArgumentsV001({baseMediaPath: baseFrame, plan,
            overlayRecords: recipe.overlayRecords, expectedFrameCount: 1, serializePngAndFilters: true,
            renderRange: {startFrame: frame, endFrameExclusive: frame + 1, fullFrameCount: 27949}});
          const at = args.indexOf('-filter_complex') + 1;
          args[at] = args[at].replace('format=yuv420p[video]',
            `format=yuv420p,format=rgb24,crop=${crop.width}:${crop.height}:${crop.left}:${crop.top}:exact=1[video]`);
          for (const option of ['-preset', '-crf', '-c:a', '-movie_timescale']) {
            const i = args.indexOf(option);if (i !== -1) args.splice(i, 2);
          }
          args[args.indexOf('-c:v') + 1] = 'rawvideo';args[args.indexOf('-pix_fmt') + 1] = 'rgb24';
          args.push('-an', '-threads', '1', '-f', 'rawvideo', 'pipe:1');
          const rgb = await run(ffmpeg, args);assert.equal(rgb.length, crop.width * crop.height * 3);
          references.push({id: recipe.id, rgb});
        }
        const observations = [];
        for (const target of [{kind: 'candidate-clip', path: side.media.path, frame: localFrame},
          {kind: 'final-cfr-package', path: pkg.video.path, frame: packageSide.packageStartFrame + localFrame}]) {
          const rgb = await extract(target.path, target.frame, crop);
          const classified = classifyPresentationNativeFrameRgbV001({completedRgb: rgb, references});
          const expectedClass = classified.classes.find(c => c.id === classified.expectedClassId);
          assert.deepEqual(expectedClass.referenceIds, ['expected'], 'a supposed counterexample has the same actual RGB as expected');
          observations.push({...target, completedRgbSha256: hash(rgb), ...classified});
        }
        const row = {caption: suffix, childCaptionId: record.element.instructionId, frame, localFrame,
          expectedState: sample.expectedState, crop, backgroundRgbSha256: hash(baseRgb), sourceBackground,
          backgroundMatchesExactSourceFrame: true, observations,
          status: observations.every(o => o.visible) ? 'passed' : 'failed'};
        checks.push(row);await save(path.join(output, `${suffix}-${frame}.json`), row);
        // Only this run's completed, successful temporary lossless frame.
        if (row.status === 'passed') await unlink(baseFrame);
        else throw new Error('Expected reference is not the unique minimum: ' + suffix + '/' + frame);
      }
    }
    const result = {schemaVersion: 'caption-readability-frame-check-v001', status: 'passed', startedAt: started,
      finishedAt: new Date().toISOString(), inputBindings, generatedReferenceImages, frameChecks: checks, pairedAudioChecks: audioChecks, finalAudioCheck,
      packageFrames: pkg.totalFrames, comparisonRule: 'Existing native RGB absolute difference; expected class must be the unique minimum and differ from omitted.',
      scope: 'Small saved-source candidate excerpts and their final CFR comparison package only; no full-Digest QC or human-quality adoption.',
      backgroundScope: 'Every sampled lossless background matches the corresponding source frame by all RGB bytes. Encoded final frames are classified against that background plus native overlays.',
      originalFilesChanged: false};
    await save(path.join(output, 'verification.json'), result);
    await save(path.join(output, 'commands.json'), commands);
    for (const image of generatedReferenceImages) await unlink(image.generated.path);
    console.log(JSON.stringify({status: result.status, frames: checks.length, completedFrameObservations: checks.length * 2,
      result: path.join(output, 'verification.json')}, null, 2));
  } catch (error) {
    await save(path.join(output, 'failure.json'), {status: 'failed', startedAt: started, finishedAt: new Date().toISOString(),
      error: String(error.stack ?? error), checks});
    await save(path.join(output, 'commands.json'), commands);
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = path.resolve(process.argv[2] ?? path.join(root, 'runtime/artifacts/caption-readability-20260928-preview-v004'));
  await verifyPackage(directory, process.argv[3] ?? 'frame-check');
}
