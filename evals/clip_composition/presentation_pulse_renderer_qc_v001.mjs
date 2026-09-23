import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {getPresentationPulseProgramV001, PRESENTATION_PULSE_PRESET_V001} from './presentation_pulse_v001.mjs';

const hashFile = async file => createHash('sha256').update(await readFile(file)).digest('hex');

export const presentationPulseAlphaUnionV001 = states => {
  const boxes = states.map(state => state.inspection?.alphaBounds ?? state.alphaBounds);
  if (boxes.length !== PRESENTATION_PULSE_PRESET_V001.states.length || boxes.some(box => !box
    || !['left', 'top', 'right', 'bottom'].every(key => Number.isInteger(box[key])))) {
    throw new TypeError('all finite inspected Pulse alpha bounds are required');
  }
  const left = Math.min(...boxes.map(box => box.left));
  const top = Math.min(...boxes.map(box => box.top));
  const right = Math.max(...boxes.map(box => box.right));
  const bottom = Math.max(...boxes.map(box => box.bottom));
  return {left, top, right, bottom, width: right - left, height: bottom - top};
};

/** Integer RGB distance, without an empirical threshold or channel weights. */
export function absolutePresentationPulseRgbDifferenceV001(left, right) {
  if (!Buffer.isBuffer(left) || !Buffer.isBuffer(right) || left.length === 0 || left.length !== right.length) {
    throw new TypeError('Pulse reference and completed frame RGB crops must have the same size');
  }
  let total = 0;
  for (let index = 0; index < left.length; index++) total += Math.abs(left[index] - right[index]);
  if (!Number.isSafeInteger(total)) throw new TypeError('Pulse frame distance exceeds exact integer range');
  return total;
}

/**
 * Decode the actual completed frames. For each, independently composite the
 * same source frame with each native state; the intended state must be the
 * unique nearest reference. This avoids calling compression differences a
 * pulse, and avoids requiring lossy MP4 pixels to equal a native PNG.
 */
export async function inspectPresentationPulseCompletedFramesV001({
  record, canvas, baseMediaPath, completedMediaPath, scratchDirectory,
  ffmpegPath, imageMagickPath, processObserver, runProcess, extractFrame,
}) {
  const program = getPresentationPulseProgramV001({element: record.element, canvas});
  const samples = program.samples.map(({frame, expectedState}) => ({frame, state: expectedState}));
  const bounds = presentationPulseAlphaUnionV001(record.pulseStates);
  const geometry = `${bounds.width}x${bounds.height}+${bounds.left}+${bounds.top}`;
  const crop = async file => {
    const result = await runProcess(imageMagickPath,
      [file, '-crop', geometry, '+repage', '-alpha', 'off', '-depth', '8', 'rgb:-'], {
        fatalInnerStage: 'post-render-qc', processObserver, observationLabel: 'pulse-frame-rgb-crop',
      });
    if (result.stdout.length !== bounds.width * bounds.height * 3) {
      throw new TypeError('Pulse frame crop does not match its native alpha union');
    }
    return result.stdout;
  };
  const evidence = [];
  for (const sample of samples) {
    const stem = `${record.fileStem}-pulse-frame-${sample.frame}`;
    const baseFrame = path.join(scratchDirectory, `${stem}-base.png`);
    const outputFrame = path.join(scratchDirectory, `${stem}-completed.png`);
    await extractFrame(baseMediaPath, sample.frame, baseFrame, canvas.fps, ffmpegPath, processObserver);
    await extractFrame(completedMediaPath, sample.frame, outputFrame, canvas.fps, ffmpegPath, processObserver);
    const output = await crop(outputFrame);
    const distances = [];
    for (const state of record.pulseStates) {
      const referenceFrame = path.join(scratchDirectory, `${stem}-reference-${state.state}.png`);
      // The excursion and its static borders lie outside the common fade, so alpha is exactly
      // one. No free timing, scaling, or user-authored filter enters this QC.
      await runProcess(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y',
        '-i', baseFrame, '-i', state.pngPath,
        '-filter_complex', '[1:v]format=rgba[pulse];'
          + '[0:v][pulse]overlay=0:0:eof_action=pass:shortest=0:repeatlast=0,format=yuv420p[video]',
        '-map', '[video]', '-frames:v', '1', referenceFrame], {
        fatalInnerStage: 'post-render-qc', processObserver, observationLabel: 'pulse-native-frame-reference',
      });
      distances.push({state: state.state, overlaySha256: state.pngSha256,
        absoluteRgbDifference: absolutePresentationPulseRgbDifferenceV001(output, await crop(referenceFrame)),
        referenceFrameFile: referenceFrame, referenceFrameSha256: await hashFile(referenceFrame)});
    }
    evidence.push({frame: sample.frame, expectedState: sample.state,
      comparisonBasis: 'same-source-frame-finite-native-pulse-states',
      expectedOverlaySha256: record.pulseStates.find(state => state.state === sample.state).pngSha256,
      alphaUnion: bounds, baseFrameFile: baseFrame, baseFrameSha256: await hashFile(baseFrame),
      outputFrameFile: outputFrame, outputFrameSha256: await hashFile(outputFrame), stateDistances: distances});
  }
  return evidence;
}
