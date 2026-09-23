/** Q1 work-order-only technical replay of the already reviewed Digest choices.
 * This does not obtain or claim a fresh AI judgment, migrate production saved
 * records, or certify old observations under new drawing rules. */
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createOrchestrationContextV001, createOrchestrationJudgmentInputV001,
  fixOrchestrationJudgmentV001, resolveOrchestrationDrawingViewV001,
  exportOrchestrationDrawingViewEvidenceV001, editOrchestrationOverrideV001}
  from './presentation_orchestration_v001.mjs';
import {editAutoPresentationOverrideV001, sha256AutoPresentationV001} from './presentation_auto_effects_v001.mjs';
import {loadAutoPresentationContextV001} from './presentation_auto_effects_io_v001.mjs';
import {bindEditingFileV001} from './presentation_editing_state_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from './presentation_output_directory_v001.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const omit = (value, keys) => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
export async function prepareQualityQ1CandidatesV001({sourceEvidencePath, outputDirectory}) {
  assert(path.isAbsolute(sourceEvidencePath) && path.isAbsolute(outputDirectory));
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory});
  const sourceRef = await bindEditingFileV001(sourceEvidencePath);
  const oldBytes = await readFile(sourceEvidencePath), old = JSON.parse(oldBytes);
  assert.equal(old.schemaVersion, 'presentation-orchestration-drawing-evidence-v001');
  assert.equal(sha256AutoPresentationV001(omit(old, ['evidenceSha256'])), old.evidenceSha256);
  // The historical recipe must remain rejected by the current rule boundary.
  assert.throws(() => createOrchestrationContextV001(old.source), /rendering rules/);
  const {context: captionContext} = await loadAutoPresentationContextV001({
    baselinePath: old.source.captionContext.baselineRef.path,
    decisionInputPath: old.source.captionContext.decisionInputRef.path});
  assert.deepEqual(omit(captionContext, ['renderingRulesRef']), omit(old.source.captionContext, ['renderingRulesRef']));
  const source = {...structuredClone(old.source), captionContext};
  assert.deepEqual(omit(source, ['captionContext']), omit(old.source, ['captionContext']));
  const context = createOrchestrationContextV001(source), priorInput = old.state.selectionRecord.input;
  const evidenceKeys = ['productionPurpose', 'captions', 'contexts', 'observations', 'audioEvidence', 'audioCandidates'];
  const input = createOrchestrationJudgmentInputV001({context,
    evidence: Object.fromEntries(evidenceKeys.map(key => [key, priorInput[key]]))});
  assert.deepEqual(omit(input, ['contextSha256', 'inputSha256']), omit(priorInput, ['contextSha256', 'inputSha256']));
  const originalReplyBytes = old.state.selectionRecord.replyBytes;
  assert.equal(hash(originalReplyBytes), old.state.selectionRecord.replySha256);
  const originalReply = JSON.parse(originalReplyBytes);
  const replayedReply = {...originalReply, inputSha256: input.inputSha256};
  assert.deepEqual(omit(replayedReply, ['inputSha256']), omit(originalReply, ['inputSha256']));
  const replyBytes = JSON.stringify(replayedReply, null, 2) + '\n';
  let state = fixOrchestrationJudgmentV001({context, input, replyBytes});
  assert.deepEqual(state.selectionRecord.captions, old.state.selectionRecord.captions);
  assert.deepEqual(state.selectionRecord.connections, old.state.selectionRecord.connections);
  assert.deepEqual(state.captionAuto.proposal.effects, old.state.captionAuto.proposal.effects);
  assert.deepEqual(state.captionAuto.proposal.exceptions, old.state.captionAuto.proposal.exceptions);
  assert.deepEqual(state.connectionAuto, old.state.connectionAuto);
  const baselinePlan = JSON.parse(source.planBytes);
  for (const entry of old.state.captionOverrides.entries) {
    const {captionId, ...selection} = entry;
    state = {...state, captionOverrides: editAutoPresentationOverrideV001({baselinePlan, context: captionContext,
      autoProposal: state.captionAuto, overrides: state.captionOverrides, captionId, selection})};
  }
  state = {...state, connectionOverrides: structuredClone(old.state.connectionOverrides)};
  assert.deepEqual(state.captionOverrides.entries, old.state.captionOverrides.entries);
  const view = resolveOrchestrationDrawingViewV001({context, state});
  await mkdir(outputDirectory);
  await writeFile(path.join(outputDirectory, 'historical-drawing-evidence.json'), oldBytes, {flag: 'wx'});
  await writeFile(path.join(outputDirectory, 'historical-reply.json'), originalReplyBytes, {flag: 'wx'});
  await save(path.join(outputDirectory, 'replayed-input.json'), input);
  await writeFile(path.join(outputDirectory, 'local-replayed-reply.json'), replyBytes, {flag: 'wx'});
  const lineage = {schemaVersion: 'quality-q1-technical-replay-v001', sourceRef,
    workOrder: 'docs/work-orders/DIGEST_Q1_Q2_WORK_ORDER_v001.md',
    purpose: '修正済み描画規則の短尺確認だけ。保存済み意味判断の技術replay。新しいAI判断ではない。',
    oldRules: old.source.captionContext.renderingRulesRef, newRules: captionContext.renderingRulesRef,
    originalReplySha256: hash(originalReplyBytes), localReplayedReplySha256: hash(replyBytes),
    originalInputSha256: priorInput.inputSha256, localReplayedInputSha256: input.inputSha256,
    unchangedSemanticChoices: true, unchangedOldSavedBytes: true, oldObservationRevalidated: false,
    freshAutomaticSelectionSuccess: false, humanQuality: 'not-evaluated'};
  await save(path.join(outputDirectory, 'lineage.json'), lineage);
  const panelId = 'digest-human-caption-repair-20260907-v001-instruction-instruction-000010';
  assert.equal(view.resolvedPlan.elements.find(row => row.instructionId === panelId).text, '逃げるやつ?');
  const jobs = [];
  for (const spec of [
    {name: 'motion', startFrame: 0, endFrameExclusive: 170},
    {name: 'panel-short', startFrame: 456, endFrameExclusive: 593},
    {name: 'panel-wide', startFrame: 1731, endFrameExclusive: 1830},
    {name: 'panel-graph-paper', startFrame: 486, endFrameExclusive: 568, preset: 'panel-graph-paper'},
    {name: 'panel-comic-frame', startFrame: 486, endFrameExclusive: 568, preset: 'panel-comic-frame'},
  ]) {
    const selectedState = spec.preset ? editOrchestrationOverrideV001({context, state, kind: 'caption',
      itemId: panelId, selection: {preset: spec.preset}}) : state;
    const selectedView = spec.preset ? resolveOrchestrationDrawingViewV001({context, state: selectedState}) : view;
    const drawingPath = path.join(outputDirectory, spec.name + '-drawing-evidence.json');
    await save(drawingPath, exportOrchestrationDrawingViewEvidenceV001(selectedView));
    const job = {drawingEvidenceRef: await bindEditingFileV001(drawingPath),
      outputDirectory: path.join(outputDirectory, spec.name + '-render'),
      evidenceDirectory: path.join(outputDirectory, spec.name + '-evidence'),
      range: {startFrame: spec.startFrame, endFrameExclusive: spec.endFrameExclusive},
      nativeAssetReuse: path.join(outputDirectory, 'native-assets')};
    await save(path.join(outputDirectory, spec.name + '-job.json'), job);
    jobs.push({name: spec.name, jobPath: path.join(outputDirectory, spec.name + '-job.json'),
      manualBackgroundSelection: !!spec.preset, viewSha256: selectedView.viewSha256, range: job.range});
  }
  assert.deepEqual(await bindEditingFileV001(sourceEvidencePath), sourceRef);
  await save(path.join(outputDirectory, 'candidate-jobs.json'), {lineage, jobs});
  return {lineage, jobs};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [sourceEvidencePath, outputDirectory] = process.argv.slice(2);
  process.stdout.write(JSON.stringify(await prepareQualityQ1CandidatesV001({sourceEvidencePath, outputDirectory}), null, 2) + '\n');
}
