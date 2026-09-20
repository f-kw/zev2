import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';
import test from 'node:test';
import {buildPresentationCompositeArgumentsV001} from './render_presentation_v002.mjs';
import {buildPresentationPulseStateElementsV001} from './presentation_pulse_v001.mjs';
import {buildPresentationCaptionMotionStateElementsV001} from './presentation_caption_motion_v001.mjs';
import {inspectRenderedMediaWithToolsV001} from './presentation_renderer_qc_v002.mjs';

const execute = promisify(execFile), ffmpeg = '/opt/homebrew/bin/ffmpeg', magick = '/opt/homebrew/bin/magick';
const canvas = {width: 64, height: 48, fps: 30};
const run = (command, args) => execute(command, args, {maxBuffer: 16 * 1024 * 1024});
const hashes = text => text.split('\n').filter(line => line && !line.startsWith('#'))
  .map(line => line.split(',').at(-1).trim());
function precompressionArguments(input) {
  const args = buildPresentationCompositeArgumentsV001(input);
  const encoder = args.indexOf('-c:v');
  return [...args.slice(0, encoder), '-an', '-c:v', 'rawvideo', '-pix_fmt', 'yuv420p', '-f', 'framemd5', '-'];
}

test('range compositing matches every precompression full-program frame through finite state and fade cuts', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'zev-range-compositor-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const base = path.join(directory, 'base.nut');
  await run(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=64x48:r=30', '-frames:v', '72',
    '-c:v', 'ffv1', '-pix_fmt', 'yuv420p', base]);
  for (const kind of ['static', 'pulse', 'bounce', 'shake']) {
    const element = {instructionId: 'caption', kind: 'speech-caption', text: '固定字幕',
      indexedLines: [{lineIndex: 0, text: '固定字幕'}], startFrame: 10, endFrameExclusive: 62, displayFrameCount: 52,
      visualState: {textStyle: {fontSizePx: 96},
        position: {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0, offsetYPercent: -6}},
      ...(kind === 'pulse' ? {presentationPulse: {presentation: 'provisional-pulse', anchorPeakId: 'measured', anchorFrame: 35}}
        : kind === 'static' ? {} : {presentationMotion: {presentation: 'provisional-' + kind,
          presetVersion: 'presentation-caption-motion-v002'}})};
    const states = kind === 'pulse' ? buildPresentationPulseStateElementsV001({element, canvas})
      : kind === 'static' ? [{state: 'static', element}] : buildPresentationCaptionMotionStateElementsV001({element, canvas});
    const records = [];
    for (const [index, state] of states.entries()) {
      const pngPath = path.join(directory, kind + '-' + state.state + '.png');
      await run(magick, ['-size', '64x48', 'xc:none', '-fill', `rgb(${32 + index * 29},${220 - index * 23},${41 + index * 19})`,
        '-draw', `rectangle ${5 + index},10 ${30 + index},35`, pngPath]);
      records.push({...state, pngPath});
    }
    const overlay = {...records[0], element, ...(kind === 'pulse' ? {pulseStates: records}
      : ['bounce', 'shake'].includes(kind) ? {motionStates: records} : {})};
    const plan = {canvas, elements: [element]};
    const full = hashes((await run(ffmpeg, precompressionArguments({baseMediaPath: base, plan,
      overlayRecords: [overlay], expectedFrameCount: 72, serializePngAndFilters: true}))).stdout);
    assert.equal(full.length, 72);
    for (const [startFrame, endFrameExclusive] of [[12, 13], [12, 18], [33, 41], [59, 64]]) {
      const clipped = path.join(directory, `${kind}-${startFrame}-${endFrameExclusive}.nut`);
      await run(ffmpeg, ['-v', 'error', '-n', '-i', base, '-vf',
        `trim=start_frame=${startFrame}:end_frame=${endFrameExclusive},setpts=PTS-STARTPTS`, '-an', '-c:v', 'ffv1', clipped]);
      if (endFrameExclusive - startFrame === 1) {
        const inspected = await inspectRenderedMediaWithToolsV001(clipped,
          {ffmpegPath: ffmpeg, ffprobePath: '/opt/homebrew/bin/ffprobe'});
        assert.equal(inspected.video.frameCount, 1); assert.equal(inspected.video.fps, 30);
      }
      const actual = hashes((await run(ffmpeg, precompressionArguments({baseMediaPath: clipped, plan,
        overlayRecords: [overlay], expectedFrameCount: endFrameExclusive - startFrame, serializePngAndFilters: true,
        renderRange: {startFrame, endFrameExclusive, fullFrameCount: 72}}))).stdout);
      assert.deepEqual(actual, full.slice(startFrame, endFrameExclusive), kind + ' / ' + startFrame);
    }
  }
});
