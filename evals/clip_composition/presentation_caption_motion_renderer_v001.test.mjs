import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {buildPresentationCaptionMotionStateElementsV001} from './presentation_caption_motion_v001.mjs';
import {buildPresentationCompositeArgumentsV001} from './render_presentation_v002.mjs';

test('both entrance programs select the independently specified state on every real frame and apply the shared fade once', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'zev-motion-frame-mapping-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const run = args => execFileSync('/opt/homebrew/bin/ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args],
    {maxBuffer: 4 * 1024 * 1024});
  const canvas = {width: 64, height: 36, fps: 30}, frameCount = 45, frameBytes = 64 * 36 * 3 / 2;
  const baseMediaPath = path.join(directory, 'base.nut');
  run(['-f', 'lavfi', '-i', 'testsrc2=size=64x36:rate=30:duration=1.5', '-f', 'lavfi', '-i',
    'sine=frequency=440:sample_rate=48000:duration=1.5', '-c:v', 'ffv1', '-c:a', 'pcm_s16le', baseMediaPath]);
  const baseAudio = run(['-i', baseMediaPath, '-map', '0:a', '-f', 's16le', '-']);
  const schedules = {
    bounce: ['small', 'stable', 'middle', 'between-middle-maximum', 'maximum', 'maximum', 'middle', 'between-middle-stable'],
    shake: ['left-12', 'left-12', 'right-12', 'right-12', 'left-8', 'left-8',
      'right-8', 'right-8', 'left-4', 'left-4', 'right-4', 'right-4'],
  };
  for (const kind of ['bounce', 'shake']) {
    const element = {instructionId: kind, kind: 'speech-caption', text: 'finite fixture',
      startFrame: 5, endFrameExclusive: 40, displayFrameCount: 35,
      visualState: {textStyle: {fontSizePx: 96},
        position: {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0, offsetYPercent: -6}},
      presentationMotion: {presentation: `provisional-${kind}`, presetVersion: 'presentation-caption-motion-v002'}};
    const states = buildPresentationCaptionMotionStateElementsV001({element, canvas}).map((row, index) => {
      const pngPath = path.join(directory, `${kind}-${row.state}.png`);
      // These simple images isolate the compositor clock and alpha. Native font geometry has its own test.
      execFileSync('/opt/homebrew/bin/magick', ['-size', '64x36', 'xc:none', '-fill',
        ['red', 'green', 'blue', 'yellow', 'magenta', 'cyan', 'white'][index],
        '-draw', 'rectangle 12,12 51,31', 'PNG32:' + pngPath]);
      return {...row, pngPath};
    });
    const logical = {...states[0], element, motionStates: states};
    const plan = {canvas, elements: [element]};
    const encode = (record, name, mutateGraph) => {
      const output = path.join(directory, `${kind}-${name}.nut`);
      const args = buildPresentationCompositeArgumentsV001({baseMediaPath, plan,
        overlayRecords: [record], expectedFrameCount: frameCount, serializePngAndFilters: true});
      if (mutateGraph) {
        const index = args.indexOf('-filter_complex') + 1;
        const previous = args[index]; args[index] = mutateGraph(previous);
        assert.notEqual(args[index], previous, 'the declared fault changed the actual compositor graph');
      }
      run([...args, '-c:v', 'ffv1', '-c:a', 'pcm_s16le', output]);
      return {video: run(['-i', output, '-map', '0:v', '-pix_fmt', 'yuv420p', '-f', 'rawvideo', '-']),
        audio: run(['-i', output, '-map', '0:a', '-f', 's16le', '-'])};
    };
    const wanted = encode(logical, 'motion');
    const references = new Map(states.map(state => [state.state, encode(state, state.state).video]));
    const mismatches = bytes => Array.from({length: frameCount}, (_, frame) => {
      const expected = schedules[kind][frame - 5] ?? 'stable';
      return bytes.subarray(frame * frameBytes, (frame + 1) * frameBytes)
        .equals(references.get(expected).subarray(frame * frameBytes, (frame + 1) * frameBytes)) ? null : frame;
    }).filter(frame => frame !== null);
    assert.equal(wanted.video.length, frameCount * frameBytes);
    assert.deepEqual(mismatches(wanted.video), [], kind + ': all frames, stable interval and fade boundaries');
    assert.deepEqual(wanted.audio, baseAudio, kind + ': audio unchanged');
    const noMotion = structuredClone(logical);
    for (const row of noMotion.motionStates) row.pngPath = states[0].pngPath;
    assert(mismatches(encode(noMotion, 'no-motion').video).length > 0);
    const noReturn = structuredClone(logical);
    noReturn.motionStates[0].pngPath = states[kind === 'bounce' ? 3 : 1].pngPath;
    assert(mismatches(encode(noReturn, 'no-return').video).includes(kind === 'bounce' ? 13 : 17));
    const late = encode(logical, 'late', graph => graph.replace('setpts=PTS+5/30/TB[overlay0]', 'setpts=PTS+7/30/TB[overlay0]'));
    assert(mismatches(late.video).length > 0);
    const missing = structuredClone(logical); missing.motionStates.pop();
    assert.throws(() => buildPresentationCompositeArgumentsV001({baseMediaPath, plan, overlayRecords: [missing],
      expectedFrameCount: frameCount}), /all bound native states/);
  }
});
