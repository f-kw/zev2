/** Reproduce one-caption entrance changes through the existing CLI, without drawing. */
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {promisify} from 'node:util';
import {loadAutoPresentationV001} from './presentation_auto_effects_io_v001.mjs';
import {resolveAutoPresentationV001} from './presentation_auto_effects_v001.mjs';
import {PRESENTATION_CAPTION_MOTION_PRESETS_V001, getPresentationCaptionMotionProgramV001}
  from './presentation_caption_motion_v001.mjs';

const run = promisify(execFile);
const directory = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(directory, '../..');
const cliPath = path.join(directory, 'edit_auto_presentation_v001.mjs');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
async function bind(file) {
  const bytes = await readFile(file);
  return {path: path.resolve(file), bytes: bytes.length, fileSha256: sha(bytes)};
}
async function verify(refs) {
  for (const ref of refs) assert.deepEqual(await bind(ref.path), ref, 'A fixed input or implementation changed');
}

function oppositeAutomaticTarget(baselinePlan, automatic, action) {
  const expectedRole = action === 'bounce' ? 'Shake accent' : 'Bounce accent';
  for (const originalSelection of automatic.resolution.captions) {
    if (originalSelection.role !== expectedRole || originalSelection.origin !== 'automatic'
      || originalSelection.automaticStatus !== 'selected' || originalSelection.hasOverride) continue;
    const target = baselinePlan.elements.find(element => element.instructionId === originalSelection.captionId);
    assert(target);
    try {
      // This checks only the finite clock and normal-input constraints. No layout or media is drawn.
      for (const preset of Object.values(PRESENTATION_CAPTION_MOTION_PRESETS_V001)) {
        getPresentationCaptionMotionProgramV001({canvas: baselinePlan.canvas, element: {...target,
          presentationMotion: {presentation: preset.presentation, presetVersion: preset.version}}});
      }
      return {target, originalSelection};
    } catch (error) {
      if (!(error instanceof TypeError) || !error.message.startsWith('Caption motion:')) throw error;
    }
  }
  throw new TypeError(`No saved automatic ${expectedRole} supports both finite entrance programs`);
}

export async function checkCaptionExpressionStage1EditsV001({outputDirectory, baselinePath,
  decisionInputPath, autoProposalPath}) {
  assert.equal(process.version, 'v20.19.6', 'Use the existing fixed Node 20 runtime');
  const files = Object.fromEntries(Object.entries({baselinePath, decisionInputPath, autoProposalPath})
    .map(([key, file]) => [key, path.resolve(file)]));
  const out = path.resolve(outputDirectory);
  const original = await Promise.all(Object.values(files).map(bind));
  const implementation = await Promise.all([
    'caption_expression_stage1_edit_check_v001.mjs', 'edit_auto_presentation_v001.mjs',
    'presentation_auto_effects_io_v001.mjs', 'presentation_auto_effects_v001.mjs',
    'presentation_caption_motion_v001.mjs', 'presentation_pulse_v001.mjs',
    'presentation_pulse_evidence_v001.mjs', 'presentation_effects_v001.mjs',
    'presentation_caption_contract_v002.mjs',
  ].map(name => bind(path.join(directory, name))));
  const loaded = await loadAutoPresentationV001(files);
  assert.equal(loaded.autoPresentation.overrides, undefined);
  const automatic = resolveAutoPresentationV001({baselinePlan: loaded.baselinePlan, ...loaded.autoPresentation});
  const captions = loaded.baselinePlan.elements.filter(element => element.kind === 'speech-caption');
  const targets = ['bounce', 'shake'].map(action => ({action,
    ...oppositeAutomaticTarget(loaded.baselinePlan, automatic, action)}));
  await verify(original); await verify(implementation);
  await mkdir(out); // Exclusive directory creation; a previous run is never replaced.
  const env = {...process.env}; delete env.NODE_OPTIONS;
  const results = [];
  try {
    await save(path.join(out, 'start.json'), {schemaVersion: 'stage1-caption-edit-check-start-v001',
      original, implementation, runtime: {path: process.execPath, version: process.version},
      captionCount: captions.length, targets: targets.map(({action, target, originalSelection}) =>
        ({action, captionId: target.instructionId, originalAutomaticSelection: originalSelection})),
      eligibilityScope: 'Finite program constraints only; no native layout or media rendering'});
    for (const {action, target, originalSelection} of targets) {
      let previous;
      const steps = [];
      for (const step of [action, 'normal', 'reset']) {
        await verify(original); await verify(implementation);
        const outputPath = path.join(out, `${action}-${step}.json`);
        const args = [cliPath, step, '--baseline', files.baselinePath, '--decision-input', files.decisionInputPath,
          '--auto', files.autoProposalPath, '--caption-id', target.instructionId, '--output', outputPath,
          ...(previous ? ['--overrides', previous] : [])];
        const processResult = await run(process.execPath, args, {cwd: repo, env});
        await writeFile(path.join(out, `${action}-${step}.stdout`), processResult.stdout, {flag: 'wx'});
        assert.equal(processResult.stderr, '', 'The CLI must complete without diagnostic errors');
        const saved = await loadAutoPresentationV001({...files, overridesPath: outputPath});
        const resolved = resolveAutoPresentationV001({baselinePlan: saved.baselinePlan, ...saved.autoPresentation});
        const item = resolved.plan.elements.find(element => element.instructionId === target.instructionId);
        const resolution = resolved.resolution.captions.find(row => row.captionId === target.instructionId);
        assert(item && resolution);
        if (step === action) {
          assert.deepEqual(item.presentationMotion, {presentation: `provisional-${action}`,
            presetVersion: PRESENTATION_CAPTION_MOTION_PRESETS_V001[action].version});
          const {presentationMotion: _motion, ...normal} = item;
          assert.deepEqual(normal, target, 'Only the selected finite motion metadata may change');
        } else if (step === 'normal') assert.deepEqual(item, target);
        else {
          assert.deepEqual(saved.autoPresentation.overrides.entries, []);
          assert.deepEqual(resolved.plan, automatic.plan);
          assert.deepEqual(resolution, originalSelection, 'Reset must restore the saved automatic motion and its origin');
        }
        assert.deepEqual(resolved.plan.elements.filter(element => element.instructionId !== target.instructionId),
          automatic.plan.elements.filter(element => element.instructionId !== target.instructionId));
        assert.deepEqual(resolved.resolution.captions.filter(row => row.captionId !== target.instructionId),
          automatic.resolution.captions.filter(row => row.captionId !== target.instructionId));
        assert.deepEqual(saved.autoPresentation.autoProposal, loaded.autoPresentation.autoProposal);
        await verify(original); await verify(implementation);
        steps.push({action: step, command: process.execPath, args, exitCode: 0,
          output: await bind(outputPath), stdout: await bind(path.join(out, `${action}-${step}.stdout`)),
          resolution, otherCaptionCount: captions.length - 1, otherCaptionsIdentical: true,
          otherElementsIdentical: true, fixedAutoUnchanged: true});
        previous = outputPath;
      }
      results.push({expression: action, originalAutomaticSelection: originalSelection,
        targetCaptionId: target.instructionId, targetText: target.text, steps});
    }
    await verify(original); await verify(implementation);
    const completion = {schemaVersion: 'stage1-real-caption-cli-check-v003', status: 'passed',
      scope: 'Saved automatic motion -> other motion -> Normal -> Reset; existing CLI and file readback only',
      renderingExecuted: false, aiJudgmentRerun: false, candidateOverrides: 0,
      diagnosticOverridesOnly: true, captionCount: captions.length, original, implementation, results};
    await save(path.join(out, 'completion.json'), completion);
    process.stdout.write(`PASS ${captions.length} captions: both saved automatic motions restored; fixed files and other captions unchanged\n`);
    return completion;
  } catch (error) {
    await save(path.join(out, 'failure.json'), {status: 'failed', message: String(error),
      ...(error?.stdout === undefined ? {} : {stdout: error.stdout}),
      ...(error?.stderr === undefined ? {} : {stderr: error.stderr}), original, implementation, results});
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [outputDirectory, baselinePath, decisionInputPath, autoProposalPath] = process.argv.slice(2);
  if (process.argv.length !== 6) throw new Error('usage: stage1-edit-check new-evidence-directory normal-plan decision-input fixed-auto');
  await checkCaptionExpressionStage1EditsV001({outputDirectory, baselinePath, decisionInputPath, autoProposalPath});
}
