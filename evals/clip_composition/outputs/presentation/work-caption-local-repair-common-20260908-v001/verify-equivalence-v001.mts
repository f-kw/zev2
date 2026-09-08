/** Read-only final comparison; never starts a renderer or modifies old evidence. */
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile, writeFile, readdir, stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {captionRepairEffectiveInputsV001} from '../../../caption_local_repair_common_v001.mts';
import {loadHistoricalCaptionRepairFixtureV001} from '../../../replay_caption_local_repair_v001.mts';

const work = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(work, '../../../../..');
const read = async (p: string) => JSON.parse(await readFile(p, 'utf8'));
const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const cases = [];
for (const id of ['digest', 'distant'] as const) {
  const fixture = await loadHistoricalCaptionRepairFixtureV001(id);
  const fixtureScope = await read(path.join(work, `${id}-v001/scope-verification.json`));
  assert.equal(fixtureScope.status, 'passed');
  assert.equal(fixtureScope.purpose, 'fixture-replay');
  assert.equal(fixtureScope.newHumanJudgment, false);
  const expected = captionRepairEffectiveInputsV001(fixture.expected);
  assert.deepEqual(fixtureScope.effectiveInputs, expected);
  const uiRoot = path.join(work, 'ui-equivalence-v001');
  const matched = [];
  for (const name of await readdir(uiRoot)) {
    if (!name.startsWith('caption-repair-')) continue;
    const dir = path.join(uiRoot, name);
    const adoption = await read(path.join(dir, 'caption-adoption.json'));
    if (adoption.originalSource.sourceId === fixture.source.sourceId) matched.push({dir, adoption});
  }
  assert.equal(matched.length, 1, 'EXACTLY_ONE_ACTUAL_RENDER_PER_CASE');
  const {dir, adoption} = matched[0];
  assert.equal(adoption.purpose, 'ui-verification');
  assert.equal(adoption.newHumanJudgment, false);
  const scope = await read(path.join(dir, 'scope-verification.json'));
  assert.equal(scope.status, 'passed');
  const core: any = {};
  for (const [key, file] of Object.entries({instruction:'instruction.json', sourcePackage:'source-package.json', selection:'selection.json'})) core[key] = await read(path.join(dir, file));
  assert.deepEqual(captionRepairEffectiveInputsV001(core), expected);
  assert.deepEqual(scope.effectiveInputs, expected);
  const execution = await read(path.join(dir, 'renderer-result.json'));
  assert.equal(execution.exitCode, 0); assert.equal(execution.result.status, 'completed');
  const qc = execution.result.qc;
  assert.equal(qc.status, 'passed'); assert.deepEqual(qc.violations, []);
  assert.equal(qc.mediaEvidence.observed.audio.packetPayloadSha256, fixture.source.audioPacketSha256);
  const timeline = await read(path.join(root, fixture.source.base.timeline.path));
  assert.equal(qc.mediaEvidence.observed.video.frameCount, timeline.baseMedia.expectedFrameCount);
  const videoPath = path.join(execution.result.publication.outputDirectory, 'presentation-rendered-v002.mp4');
  const videoBytes = await readFile(videoPath), actualSha = sha(videoBytes);
  assert.equal(actualSha, fixture.fixture.expectedVideo.fileSha256);
  cases.push({id, status:'passed', purpose:'common-path-equivalence', newHumanJudgment:false,
    formalCaptionCount:expected.instructions.length,
    effectiveFormalCaptionInputs:'exact-content-textIds-frame-intervals-cue-and-line-end-textIds',
    wholeArtifactBytesIdentical:false,
    wholeArtifactDifferenceReason:'new artifact IDs, observation purpose, approval and provenance hashes',
    fixtureRoot:path.relative(root,path.join(work,`${id}-v001`)),
    actualUiRenderRoot:path.relative(root,dir),
    requestedFinalRenderCount:1,
    scope:{remainingCaptions:scope.remainingCaptions,excludedCaptions:scope.excludedCaptions,changedCaptions:scope.changedCaptions,
      mediaAudioAndAdoptedSegments:scope.mediaAudioAndAdoptedSegments,rendererStyleAndQc:scope.rendererStyleAndQc},
    observedMedia:qc.mediaEvidence.observed,qcStatus:qc.status,qcViolations:qc.violations,
    completedVideo:{path:path.relative(root,videoPath),fileSha256:actualSha,sizeBytes:videoBytes.length},
    historicalCompletedVideo:fixture.fixture.expectedVideo,completedVideoSha256Matches:true,
    expectedCaptionInputs:fixture.fixture.expected});
}
const preservation = await read(path.join(work,'preservation-verification-v001.json'));
assert.equal(preservation.status,'passed');assert.deepEqual(preservation.differences,[]);
for (const previous of preservation.baseline.files) {
  const p=path.join(root,previous.path), digest=createHash('sha256');
  assert.equal((await stat(p)).size,previous.sizeBytes,'PREVIOUS_FILE_SIZE_CHANGED');
  for await (const chunk of createReadStream(p)) digest.update(chunk);
  assert.equal(digest.digest('hex'),previous.fileSha256,`PREVIOUS_FILE_CHANGED: ${previous.path}`);
}
const result={schemaVersion:'caption-local-repair-final-equivalence-v001',status:'passed',cases,
  preservation:{checkedFiles:preservation.baseline.files.length,differences:[],freshlyCheckedAt:new Date().toISOString()},
  newHumanJudgment:false,paidApiCalls:0,paidApiCostUsd:0};
await writeFile(path.join(work,'final-equivalence-verification-v001.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:result.status,cases:cases.map(c=>({id:c.id,captions:c.formalCaptionCount,qc:c.qcStatus,videoShaMatch:c.completedVideoSha256Matches})),preservedFiles:preservation.checkedFiles}));
