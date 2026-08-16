import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import test, {before} from 'node:test';

import ts from '../../packages/shared/node_modules/typescript/lib/typescript.js';

import {
  buildPresentationOutputCaptionCueSourcePackageV001,
  decodePresentationOutputCaptionCueSourceJobV001,
  executePresentationOutputCaptionCueSourceJobV001,
  validatePresentationOutputCaptionCueSourcePackageV001,
  validatePresentationOutputCaptionCueSourceJobV001,
} from './presentation_output_caption_cue_source_package_v001.mjs';
import {
  canonicalizePresentationCaptionB1JsonV001,
  serializePresentationCaptionB1FormalJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  classifyPresentationAtomicDirectoryPublishObservationV001,
  executePresentationAtomicDirectoryNativeHelperV001,
  preparePresentationDirectoryAtomicPublishV001,
  publishPresentationDirectoryAtomicallyNoReplaceV001,
} from './presentation_atomic_directory_publish_v001.mjs';

const ROOT = process.cwd();
const NODE = '/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node';
const TSX = '/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs';
const SOURCE_PATH = 'evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs';
const JOB_ROOT = 'evals/clip_composition/jobs/presentation/output-caption-cue-source-jobs';
const OUTPUT_ROOT = 'evals/clip_composition/outputs/presentation/output-caption-cue-source-packages';
const MEANING_PATH = 'evals/clip_composition/outputs/presentation/a-v002/meaning-information-packages/a-v002-proof-0b0d371a67d39824cb47c008-meaning-v001/zev-meaning-information-package-v002.json';
const OUTPUT_REQUEST_PATH = 'evals/clip_composition/outputs/presentation/meaning-output-jobs/qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v003/output-request.json';
const WIDTH_RULE = 'U+0000..U+00FF=1; other Unicode code point=2';
const SHA = value => createHash('sha256').update(value).digest('hex');
const clone = value => structuredClone(value);

const CONTRACTS = Object.freeze([
  ['evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md', '33b61ee497d765fbe9eb63fb1b05bce16a99488d238eb27b732550b4daac24ba'],
  ['evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md', '44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4'],
  ['evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-binding-wiring-addendum-20260811-v002.md', 'a3c8c3ef8e57cd557e4a7cae17ecc188dc523df1508a45de6e2bce36691c7e4d'],
  ['evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-selection-runtime-value-wiring-addendum-20260811-v003.md', '632aa7fdec88da47fe8639fb10f74f390aa0cc5f191a114b797c08115bee4c9e'],
  ['evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-atomic-publication-b6-owner-scope-revision-addendum-20260811-v004.md', '39e7c9b9005fb8ec762c19c0e6fde86acb398f1e99c75dd5d7100eabf452eade'],
  ['evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-b6-credential-unavailable-owner-addendum-20260811-v005.md', '573b705f80935ba0015a2f509371f17911d6aa0ea2fd7130b097ed98262b07dd'],
  ['evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-atomic-runtime-lc-uuid-compatibility-addendum-20260811-v006.md', 'bd4b52901081c418b5c5ebe6a71ba4a02895fde3c86223ec433653af53530e1e'],
  ['evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-source-final-package-validator-addendum-20260811-v007.md', '787d401d2939f58cbc10562c1ed29ab2118f6169607e05bbb2d7c5c5971c8053'],
  ['evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-runtime-live-binding-separation-addendum-20260811-v008.md', '6a5d2115763f97f473f1a66690da05561339c1f51f7412b644ae259dfc61d8a1'],
  ['evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-proof-capability-and-tsx-namespace-addendum-20260812-v009.md', 'b22aab0ef923b459b1785e32841f9df215ee9f095cf78afc188518523966285a'],
  ['evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-formal-capability-read-entry-addendum-20260812-v010.md', '6b2cd93d0ab366806160f05457d861899b87b0b08234f051f241ca2510988110'],
  ['evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-tsx-wrapper-descriptor-addendum-20260812-v011.md', '61f2c3ddbe5a3bcb2bfaba39e0ce1cc2e18a77fb2f1f5337d3fd166044b41010'],
  ['evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-pre-staging-inner-observation-addendum-20260813-v012.md', '668158f99ff6bacafe2ccbc9f182493a191fd3896469a972117714c86427d27f'],
  ['evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-dependency-unit-observation-addendum-20260813-v013.md', '77e579582fdfaad131172564b8ce81790db6b779540f338244cbc65b0d1c7501'],
  ['evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-dependency-load-stage-observation-addendum-20260813-v014.md', '446cd7df58d61fd345a9f6ef73510c1e225ebc4f078de9d001fcb84d1ba5d7bc'],
  ['evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-resolved-url-evaluation-addendum-20260814-v015.md', '42874101356eac7c2d76d8a7c75cdc1c77097f7c4ee8391dda2bb80b8d0ce275'],
  ['evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-meaning-small-unit-criteria-addendum-20260816-v021.md', '7532e5e5ad788a47f9c672486e183e2dc859b83334f94954c9317538fb53a4a9'],
  ['evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-logical-width-physical-alignment-addendum-20260816-v022.md', 'f1e0eb7061b44b27785a30842220bcaa9adb83c12dc4984176eb5383dd01c651'],
]);
const V1_PROOF_CONTRACT = Object.freeze([
  'evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-binding-wiring-addendum-20260810-v001.md',
  '6de44032c8215253b1bb9e1b71b6ed33273d983d022d2f6737e3696c3609ce23',
]);

const IMPLEMENTATION_ROLE_PATHS = Object.freeze([
  ['atomic-directory-publisher-adapter-v001', 'evals/clip_composition/presentation_atomic_directory_publish_v001.mjs'],
  ['atomic-directory-publisher-native-darwin-arm64-v001', 'evals/clip_composition/presentation_atomic_directory_publish_v001-darwin-arm64'],
  ['atomic-directory-publisher-native-source-v001', 'evals/clip_composition/presentation_atomic_directory_publish_v001.c'],
  ['caption-cue-source-contract', SOURCE_PATH],
  ['dep-base-media-timeline-v002', 'evals/clip_composition/presentation_base_media_timeline_v002.mjs'],
  ['dep-caption-contract-v002', 'evals/clip_composition/presentation_caption_contract_v002.mjs'],
  ['dep-caption-contract-v003', 'evals/clip_composition/presentation_caption_contract_v003.mjs'],
  ['dep-caption-display-pair-v003', 'evals/clip_composition/presentation_caption_display_pair_v003.mjs'],
  ['dep-caption-display-pair-v004', 'evals/clip_composition/presentation_caption_display_pair_v004.mjs'],
  ['dep-caption-semantic-output-v001', 'evals/clip_composition/presentation_caption_semantic_output_v001.mjs'],
  ['dep-fatal-observation-v002', 'evals/clip_composition/presentation_fatal_observation_v002.mjs'],
  ['dep-formal-json-codec', 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'],
  ['dep-inspect-preset-layout', 'evals/clip_composition/inspect_presentation_preset_layout.ts'],
  ['dep-instruction-contract-v002', 'evals/clip_composition/presentation_instruction_contract_v002.mjs'],
  ['dep-instruction-contract-v003', 'evals/clip_composition/presentation_instruction_contract_v003.mjs'],
  ['dep-instruction-contract-v004', 'evals/clip_composition/presentation_instruction_contract_v004.mjs'],
  ['dep-meaning-package-v001', 'evals/clip_composition/presentation_meaning_information_package_v001.mjs'],
  ['dep-meaning-package-v002', 'evals/clip_composition/presentation_a_meaning_information_package_v002.mjs'],
  ['dep-output-base-media-v001', 'evals/clip_composition/presentation_output_base_media_v001.mjs'],
  ['dep-output-crop-application-v001', 'evals/clip_composition/presentation_output_crop_application_v001.mjs'],
  ['dep-renderer-core-v002', 'evals/clip_composition/render_presentation_v002.mjs'],
  ['dep-renderer-plan-v002', 'evals/clip_composition/presentation_renderer_plan_v002.mjs'],
  ['dep-renderer-qc-v002', 'evals/clip_composition/presentation_renderer_qc_v002.mjs'],
  ['dep-renderer-text-layout-v001', 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'],
  ['dep-retained-source-atoms-v001', 'evals/clip_composition/presentation_retained_source_atoms_v001.mjs'],
  ['dep-segmenter-boundary-evidence-v001', 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs'],
  ['dep-segmenter-boundary-preflight-v001', 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs'],
  ['dep-source-sequence-v002', 'evals/clip_composition/presentation_a_source_sequence_v002.mjs'],
  ['dep-source-speaker-policy-v001', 'evals/clip_composition/presentation_source_speaker_policy_v001.mjs'],
  ['dep-style-resolver-v001', 'evals/clip_composition/presentation_output_style_resolver_v001.ts'],
  ['dep-telop-glow', 'runner/src/shared/telop-glow.ts'],
  ['dep-telop-line-break', 'runner/src/telop/telop-line-break.ts'],
  ['dep-telop-render-model', 'runner/src/telop/telop-render-model.ts'],
  ['dep-text-metrics', 'runner/src/telop/text-metrics.ts'],
  ['dep-timeline-composition-decision-v001', 'evals/clip_composition/presentation_timeline_composition_decision_v001.mjs'],
  ['dep-vertical-review-renderer-v001', 'evals/clip_composition/render_presentation_vertical_review_v001.ts'],
]);

const PROOFS = Object.freeze({
  ZCQ001: ['ZCQ001-P-01-13c0f4fa9b24', 'ZCQ001-P-02-eec89906405e', 'ZCQ001-P-03-850e16d958ce', 'ZCQ001-P-04-bfa4a1b9c46d', 'ZCQ001-P-05-b8ff0c3b79be', 'V4-ZCQ001-01', 'V15-ZCQ001-01', 'ZCQ001-P-08-e3cff4d98376', 'ZCQ001-P-09-e55f181b8f6a', 'ZCQ001-P-10-ec1eb56272fc', 'ZCQ001-P-11-6044e9f095e0', 'ZCQ001-P-12-80f70afeef3c', 'ZCQ001-P-13-c972c530f95a', 'ZCQ001-P-14-42330d1b09c4', 'ZCQ001-P-15-842ae1113f59', 'ZCQ001-P-16-e1304a457d97', 'ZCQ001-P-17-877c9602a746', 'ZCQ001-V2-01-38e27cb76066', 'V4-ZCQ001-02', 'ZCQ001-V2-03-5f660c8cc348', 'V4-ZCQ001-03', 'V8-ZCQ001-02'],
  ZCQ002: ['ZCQ002-P-01-167db456a837', 'ZCQ002-P-02-4b8fe2566ede', 'ZCQ002-P-03-df11878b850b'],
  ZCQ003: ['ZCQ003-P-01-f194c81fac64', 'ZCQ003-P-02-8073a63752e1', 'ZCQ003-P-03-9dc4b2c72978'],
  ZCQ004: ['V7-ZCQ004-01', 'V7-ZCQ004-02', 'V7-ZCQ004-03', 'V7-ZCQ004-04'],
  ZCQ005: ['ZCQ005-P-01-45440c1d3fb3', 'ZCQ005-P-02-5e698b570508', 'ZCQ005-P-03-341f8b2db3e3', 'ZCQ005-P-04-ab5e7a3ec0f1', 'ZCQ005-P-05-9046b29ea2f5', 'V4-ZCQ005-01', 'V4-ZCQ005-02', 'V4-ZCQ005-03', 'V4-ZCQ005-04', 'V4-ZCQ005-05', 'V4-ZCQ005-06', 'V4-ZCQ005-07', 'V4-ZCQ005-08'],
  ZCQ006: ['ZCQ006-P-01-0e4db82712cf', 'ZCQ006-P-02-b7c7ba6f37b1', 'ZCQ006-P-03-e7de2476355c', 'ZCQ006-V2-01-8920d8468d0b', 'V4-ZCQ006-01'],
});
export const declaredSourceCaptionQualityProofIdsV001 = () => Object.values(PROOFS).flat();

const prove = (t, id, observation, expected) => {
  assert.deepEqual(observation, expected, id);
  t.diagnostic(`proof-item:${id}:passed`);
};
const exactSection = (text, start, end) => {
  const lines = text.split('\n');
  const startIndexes = lines.flatMap((line, index) => line === start ? [index] : []);
  const endIndexes = lines.flatMap((line, index) => line === end ? [index] : []);
  assert.equal(startIndexes.length, 1, `section start count: ${start}`);
  assert.equal(endIndexes.length, 1, `section end count: ${end}`);
  assert.ok(startIndexes[0] < endIndexes[0], `section order: ${start}`);
  return lines.slice(startIndexes[0] + 1, endIndexes[0]).join('\n');
};
const exactSectionUntilHeadingPrefix = (text, start, endPrefix) => {
  const lines = text.split('\n');
  const startIndexes = lines.flatMap((line, index) => line === start ? [index] : []);
  assert.equal(startIndexes.length, 1, `section start count: ${start}`);
  const endIndex = lines.findIndex(
    (line, index) => index > startIndexes[0] && line.startsWith(endPrefix),
  );
  assert.notEqual(endIndex, -1, `section end count: ${endPrefix}`);
  return lines.slice(startIndexes[0] + 1, endIndex).join('\n');
};
const splitOutsideBackticks = (text, delimiter) => {
  const result = [];
  let current = '';
  let inBackticks = false;
  for (let index = 0; index < text.length;) {
    if (text[index] === '`') {
      inBackticks = !inBackticks;
      current += text[index];
      index += 1;
      continue;
    }
    if (!inBackticks && text.startsWith(delimiter, index)) {
      result.push(current);
      current = '';
      index += delimiter.length;
      continue;
    }
    current += text[index];
    index += 1;
  }
  assert.equal(inBackticks, false, 'unpaired backtick');
  result.push(current);
  return result;
};
const markdownCells = line => {
  assert.ok(line.startsWith('| ') && line.endsWith(' |'), `invalid markdown row: ${line}`);
  return splitOutsideBackticks(line.slice(2, -2), ' | ');
};
const proofSegments = cell => splitOutsideBackticks(cell, '\u0000').flatMap(part => {
  const result = [];
  let current = '';
  let inBackticks = false;
  for (const character of part) {
    if (character === '`') inBackticks = !inBackticks;
    if (!inBackticks && ['。', '、', '；', '・'].includes(character)) {
      const segment = current.replace(/^ +| +$/gu, '');
      if (segment.length > 0) result.push(segment);
      current = '';
    } else {
      current += character;
    }
  }
  assert.equal(inBackticks, false, 'unpaired backtick in proof cell');
  const segment = current.replace(/^ +| +$/gu, '');
  if (segment.length > 0) result.push(segment);
  return result;
});
const proofIdsFromTable = ({text, start, end, endIsHeadingPrefix = false, prefix, cellIndex}) => {
  const section = endIsHeadingPrefix
    ? exactSectionUntilHeadingPrefix(text, start, end)
    : exactSection(text, start, end);
  const rows = section.split('\n').filter(line => /^\| ZCQ[0-9]{3} \|/u.test(line));
  const seen = new Set();
  const result = [];
  for (const row of rows) {
    const cells = markdownCells(row);
    const owner = cells[0];
    assert.match(owner, /^ZCQ[0-9]{3}$/u);
    assert.equal(seen.has(owner), false, `${prefix} duplicate owner: ${owner}`);
    seen.add(owner);
    const segments = proofSegments(cells[cellIndex]);
    segments.forEach((segment, index) => {
      result.push(`${owner}-${prefix}-${String(index + 1).padStart(2, '0')}-${SHA(Buffer.from(segment)).slice(0, 12)}`);
    });
  }
  return result;
};
const v3ProofIds = text => {
  const section = exactSection(
    text,
    '### 10.2 V3-PROOF-ITEMS-BEGIN',
    '### 10.2 V3-PROOF-ITEMS-END',
  );
  const ordinals = new Map();
  const result = [];
  for (const line of section.split('\n').filter(line => line.length > 0)) {
    const match = /^- V3-(ZCQ(?:018|024|026|027|028|035|036|042))-([0-9]{2}) \| (.+)$/u.exec(line);
    assert.ok(match, `invalid V3 proof line: ${line}`);
    const expectedOrdinal = (ordinals.get(match[1]) ?? 0) + 1;
    assert.equal(Number(match[2]), expectedOrdinal, `V3 ordinal: ${match[1]}`);
    ordinals.set(match[1], expectedOrdinal);
    result.push(`${match[1]}-V3-${match[2]}-${SHA(Buffer.from(match[3])).slice(0, 12)}`);
  }
  return result;
};
const markerProofIds = ({text, start, end, prefix}) => {
  const section = exactSection(text, start, end);
  const result = [];
  const ordinals = new Map();
  for (const line of section.split('\n').filter(line => line.length > 0)) {
    const match = new RegExp(`^- ${prefix}-(ZCQ[0-9]{3})-([0-9]{2}) \\| .+$`, 'u').exec(line);
    assert.ok(match, `invalid ${prefix} proof line: ${line}`);
    const expectedOrdinal = (ordinals.get(match[1]) ?? 0) + 1;
    assert.equal(Number(match[2]), expectedOrdinal, `${prefix} ordinal: ${match[1]}`);
    ordinals.set(match[1], expectedOrdinal);
    result.push(`${prefix}-${match[1]}-${match[2]}`);
  }
  return result;
};
const applyProofRevision = (current, superseded, additions, expectedCount) => {
  assert.equal(new Set(superseded).size, superseded.length, 'superseded proof IDs unique');
  assert.equal(new Set(additions).size, additions.length, 'added proof IDs unique');
  for (const id of superseded) assert.equal(current.includes(id), true, `missing superseded proof: ${id}`);
  const next = current.filter(id => !superseded.includes(id)).concat(additions);
  assert.equal(next.length, expectedCount, `revised proof count ${expectedCount}`);
  assert.equal(new Set(next).size, next.length, 'revised proof IDs unique');
  return next;
};
export const ownerForApprovedCaptionQualityProofIdV001 = id => {
  assert.equal(typeof id, 'string', 'proof ID must be a string');
  const matches = [...id.matchAll(/(?:^|-)(ZCQ[0-9]{3})(?=-|$)/gu)].map(match => match[1]);
  assert.equal(matches.length, 1, `proof ID owner: ${id}`);
  return matches[0];
};
export const deriveApprovedCaptionQualityProofIdsV006 = ({parent, v1, v2, v3, v4, v5, v6}) => {
  const base = [
    ...proofIdsFromTable({
    text: parent,
    start: '## 10. 新規46検査の一件表',
    end: '## 11.',
    endIsHeadingPrefix: true,
    prefix: 'P',
    cellIndex: 2,
  }),
    ...proofIdsFromTable({
    text: v1,
    start: '### 7.3 検査ID差分',
    end: '### 7.4 証明消失0のassert',
    prefix: 'V1',
    cellIndex: 1,
  }),
    ...proofIdsFromTable({
    text: v2,
    start: '### 10.2 既存IDへ追加するsubcase',
    end: '### 10.3 証明消失0の機械assert',
    prefix: 'V2',
    cellIndex: 1,
  }),
    ...v3ProofIds(v3),
  ];
  assert.equal(base.length, 460, 'v003 proof count');
  const afterV4 = applyProofRevision(base, [
    'ZCQ001-P-06-b310cc503b06', 'ZCQ001-P-07-c88eea09ccd5',
    'ZCQ007-P-02-8c139deea6e7', 'ZCQ007-P-03-c88eea09ccd5',
    'ZCQ007-P-04-f310b51240ef', 'ZCQ007-P-05-c88eea09ccd5',
    'ZCQ018-P-03-94a0ff1ec3ad', 'ZCQ018-P-04-c88eea09ccd5',
    'ZCQ042-P-01-2f145c5a367f', 'ZCQ042-P-02-c88eea09ccd5',
    'ZCQ001-V2-02-e250b696c320', 'ZCQ007-V2-01-192529ed7d93',
    'ZCQ018-V2-04-5c9437d65eef', 'ZCQ042-V2-01-2787e1e00733',
    'ZCQ018-V3-01-9500091bbb90', 'ZCQ018-V3-14-5b0b8fadf8cb',
    'ZCQ042-V3-01-a3add0d8af5d',
  ], markerProofIds({
    text: v4,
    start: '### 9.3 V4-PROOF-ITEMS-BEGIN',
    end: '### 9.4 V4-PROOF-ITEMS-END',
    prefix: 'V4',
  }), 488);
  const afterV5 = applyProofRevision(afterV4, [
    'V4-ZCQ007-02', 'V4-ZCQ015-03', 'V4-ZCQ016-09', 'V4-ZCQ018-01',
    'V4-ZCQ018-03', 'V4-ZCQ027-04', 'V4-ZCQ042-01',
  ], markerProofIds({
    text: v5,
    start: '### 6.3 V5-PROOF-ITEMS-BEGIN',
    end: '### 6.4 V5-PROOF-ITEMS-END',
    prefix: 'V5',
  }), 489);
  return applyProofRevision(afterV5, [
    'V4-ZCQ001-04', 'V4-ZCQ001-05', 'V5-ZCQ007-01', 'V5-ZCQ018-01',
    'V5-ZCQ018-02', 'V5-ZCQ027-01', 'V5-ZCQ042-01',
  ], markerProofIds({
    text: v6,
    start: '### 7.2 V6-PROOF-ITEMS-BEGIN',
    end: '### 7.3 V6-PROOF-ITEMS-END',
    prefix: 'V6',
  }), 489);
};
export const deriveApprovedCaptionQualityProofIdsV007 = ({
  parent, v1, v2, v3, v4, v5, v6, v7,
}) => applyProofRevision(deriveApprovedCaptionQualityProofIdsV006({
  parent, v1, v2, v3, v4, v5, v6,
}), [
  'V6-ZCQ001-01',
  'ZCQ004-P-01-bf7a27f4d607',
  'ZCQ004-P-02-37f5cbb4704b',
  'ZCQ004-P-03-78319f76f785',
  'ZCQ004-P-04-b7300cb7db88',
  'V6-ZCQ007-01',
  'V6-ZCQ018-01',
  'V6-ZCQ018-02',
  'V6-ZCQ027-01',
  'V6-ZCQ042-01',
], markerProofIds({
  text: v7,
  start: '### 7.2 V7-PROOF-ITEMS-BEGIN',
  end: '### 7.3 V7-PROOF-ITEMS-END',
  prefix: 'V7',
}), 489);
export const deriveApprovedCaptionQualityProofIdsV008 = ({
  parent, v1, v2, v3, v4, v5, v6, v7, v8,
}) => applyProofRevision(deriveApprovedCaptionQualityProofIdsV007({
  parent, v1, v2, v3, v4, v5, v6, v7,
}), [
  'V7-ZCQ001-01',
  'V6-ZCQ001-02',
  'V7-ZCQ007-01',
  'V7-ZCQ018-01',
  'V7-ZCQ018-02',
  'V7-ZCQ027-01',
  'V7-ZCQ042-01',
], markerProofIds({
  text: v8,
  start: '### 6.2 V8-PROOF-ITEMS-BEGIN',
  end: '### 6.3 V8-PROOF-ITEMS-END',
  prefix: 'V8',
}), 489);
export const deriveApprovedCaptionQualityProofIdsV009 = ({
  parent, v1, v2, v3, v4, v5, v6, v7, v8, v9,
}) => applyProofRevision(deriveApprovedCaptionQualityProofIdsV008({
  parent, v1, v2, v3, v4, v5, v6, v7, v8,
}), [
  'V8-ZCQ001-01', 'V8-ZCQ007-01', 'V8-ZCQ018-01', 'V8-ZCQ018-02',
  'V8-ZCQ027-01', 'V8-ZCQ042-01', 'V4-ZCQ042-02',
  'ZCQ044-P-01-856857e3f29e', 'ZCQ044-P-02-b4931a6bd37e',
  'ZCQ044-P-03-04bd780a7a0a', 'ZCQ044-P-04-7fde4f94b904',
  'ZCQ044-P-05-c97ace4c8fef', 'ZCQ044-P-06-21606b5837ee',
  'ZCQ044-P-07-87426c82cffa', 'ZCQ044-P-08-da4dceb08f41',
  'ZCQ044-P-09-360ed62e792c', 'ZCQ044-P-10-7282fba5870d',
  'ZCQ044-P-11-d50726493a94', 'ZCQ044-P-12-5ae193f9680d',
  'ZCQ044-P-13-7ed512eefda0', 'ZCQ044-P-14-caeffb5e116f',
  'ZCQ044-P-15-4c4e13d8fc77', 'ZCQ044-P-16-98ea829d78bd',
  'ZCQ044-P-17-e60dc895c532', 'ZCQ044-P-18-065db44fc09e',
  'ZCQ044-P-19-dd7e5413e3ca', 'ZCQ044-P-20-f57436ceb69f',
  'ZCQ044-V1-01-131e15d1a561', 'ZCQ044-V1-02-d65e4643688c',
  'ZCQ044-V1-03-1792ecd7a971', 'ZCQ044-V1-04-4a0878ed8ef9',
  'ZCQ044-V1-05-6d32189a0b84', 'ZCQ044-V1-06-d07782bcb056',
  'ZCQ044-V2-01-5de64dec7a37', 'ZCQ044-V2-02-d8e690c30980',
  'ZCQ044-V2-03-8a6fce523db0', 'ZCQ044-V2-04-9cf9522d6eef',
  'ZCQ044-V2-05-08c6ece58f5b', 'V4-ZCQ044-01', 'V4-ZCQ044-02',
  'V4-ZCQ044-03', 'V4-ZCQ044-04',
], markerProofIds({
  text: v9,
  start: '## 8. V9-PROOF-ITEMS-BEGIN',
  end: '## 9. V9-PROOF-ITEMS-END',
  prefix: 'V9',
}), 489);
export const deriveApprovedCaptionQualityProofIdsV010 = ({
  parent, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10,
}) => applyProofRevision(deriveApprovedCaptionQualityProofIdsV009({
  parent, v1, v2, v3, v4, v5, v6, v7, v8, v9,
}), [
  'V9-ZCQ001-01', 'V9-ZCQ007-01', 'V9-ZCQ018-01', 'V9-ZCQ018-02',
  'V9-ZCQ027-01', 'V9-ZCQ042-01', 'V9-ZCQ042-02',
], markerProofIds({
  text: v10,
  start: '## 6. V10-PROOF-ITEMS-BEGIN',
  end: '## 7. V10-PROOF-ITEMS-END',
  prefix: 'V10',
}), 489);
export const deriveApprovedCaptionQualityProofIdsV011 = ({
  parent, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11,
}) => applyProofRevision(deriveApprovedCaptionQualityProofIdsV010({
  parent, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10,
}), [
  'V10-ZCQ001-01', 'V10-ZCQ007-01', 'V10-ZCQ018-01', 'V10-ZCQ018-02',
  'V10-ZCQ027-01', 'V10-ZCQ042-01', 'V10-ZCQ042-02',
], markerProofIds({
  text: v11,
  start: '## 6. V11-PROOF-ITEMS-BEGIN',
  end: '## 7. V11-PROOF-ITEMS-END',
  prefix: 'V11',
  }), 489);
export const deriveApprovedCaptionQualityProofIdsV012 = ({
  parent, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12,
}) => applyProofRevision(deriveApprovedCaptionQualityProofIdsV011({
  parent, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11,
}), [
  'V11-ZCQ001-01', 'V11-ZCQ007-01', 'V11-ZCQ018-01', 'V11-ZCQ018-02',
  'V11-ZCQ027-01', 'V11-ZCQ042-01', 'V11-ZCQ042-02',
], markerProofIds({
  text: v12,
  start: '## 6. V12-PROOF-ITEMS-BEGIN',
  end: '## 7. V12-PROOF-ITEMS-END',
  prefix: 'V12',
}), 489);
export const deriveApprovedCaptionQualityProofIdsV013 = ({
  parent, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13,
}) => applyProofRevision(deriveApprovedCaptionQualityProofIdsV012({
  parent, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12,
}), [
  'V12-ZCQ001-01', 'V12-ZCQ007-01', 'V12-ZCQ018-01', 'V12-ZCQ018-02',
  'V12-ZCQ027-01', 'V12-ZCQ042-01', 'V12-ZCQ042-02',
], markerProofIds({
  text: v13,
  start: '## 6. V13-PROOF-ITEMS-BEGIN',
  end: '## 7. V13-PROOF-ITEMS-END',
  prefix: 'V13',
}), 489);
export const deriveApprovedCaptionQualityProofIdsV014 = ({
  parent, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14,
}) => applyProofRevision(deriveApprovedCaptionQualityProofIdsV013({
  parent, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13,
}), [
  'V13-ZCQ001-01', 'V13-ZCQ007-01', 'V13-ZCQ018-01', 'V13-ZCQ018-02',
  'V13-ZCQ027-01', 'V13-ZCQ042-01', 'V13-ZCQ042-02',
], markerProofIds({
  text: v14,
  start: '## 8. V14-PROOF-ITEMS-BEGIN',
  end: '## 9. V14-PROOF-ITEMS-END',
  prefix: 'V14',
}), 489);
export const deriveApprovedCaptionQualityProofIdsV015 = ({
  parent, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15,
}) => applyProofRevision(deriveApprovedCaptionQualityProofIdsV014({
  parent, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14,
}), [
  'V14-ZCQ001-01', 'V14-ZCQ007-01', 'V14-ZCQ018-01', 'V14-ZCQ018-02',
  'V14-ZCQ027-01', 'V14-ZCQ042-01', 'V14-ZCQ042-02',
], markerProofIds({
  text: v15,
  start: '## 6. V15-PROOF-ITEMS-BEGIN',
  end: '## 7. V15-PROOF-ITEMS-END',
  prefix: 'V15',
}), 489);
const formalBytes = value => {
  const serialized = serializePresentationCaptionB1FormalJsonV001(value);
  assert.equal(serialized.status, 'serialized');
  return serialized.bytes;
};
const canonicalBytes = value => {
  const canonicalized = canonicalizePresentationCaptionB1JsonV001(value);
  assert.equal(canonicalized.status, 'canonicalized');
  return canonicalized.bytes;
};
const formalBinding = (schemaVersion, relativePath, value) => ({
  schemaVersion,
  path: relativePath,
  fileSha256: SHA(formalBytes(value)),
  canonicalSha256: SHA(canonicalBytes(value)),
});
const dummyFormalBinding = (schemaVersion, label) => ({
  schemaVersion,
  path: `fixtures/${label}.json`,
  fileSha256: SHA(Buffer.from(`${label}:file`)),
  canonicalSha256: SHA(Buffer.from(`${label}:canonical`)),
});
const dummyByteBinding = label => ({
  path: `fixtures/${label}.bin`,
  fileSha256: SHA(Buffer.from(label)),
});

const resolvedStyle = Object.freeze({
  format: 'normal-landscape',
  screenLayoutId: null,
  presetId: 'normal-landscape-readable-pop-v001',
  visualStateId: 'normal-landscape-readable-pop-v001:default',
  maxLogicalWidthPerLine: 36,
  maxLinesPerDisplayPage: 2,
  characterWidthRule: WIDTH_RULE,
  cropMode: 'identity',
  sceneTransitionMode: 'straight-cut-only',
  audioMode: 'preserve-source-only',
});

const styleInput = () => {
  const names = ['trustedRegistryBindings', 'presetRegistry', 'presetValidationIndex', 'materialValidationIndex', 'rendererTrust'];
  const presetBinding = Object.fromEntries(names.map(name => [name, dummyFormalBinding(`schema-${name}`, name)]));
  presetBinding.presetId = 'normal-landscape-readable-pop-v001';
  return {
    format: 'normal-landscape',
    screenLayoutId: null,
    presetBinding,
    captionLayoutPolicy: {
      maxLogicalWidthPerLine: 36,
      maxLinesPerDisplayPage: 2,
      characterWidthRule: WIDTH_RULE,
      pageBreakPolicy: 'split-at-source-atom-boundary-or-reject',
    },
    cropPolicy: {mode: 'identity'},
    sceneTransitionPolicy: {mode: 'straight-cut-only'},
    audioPolicy: {mode: 'preserve-source-only'},
    materials: [],
  };
};
const baseMediaInput = () => ({
  baseMedia: dummyByteBinding('base-media'),
  timeline: dummyFormalBinding('presentation-base-media-timeline-v002', 'timeline'),
  generationManifest: dummyFormalBinding('presentation-output-base-media-generation-manifest-v001', 'generation-manifest'),
  validationReceipt: dummyFormalBinding('presentation-output-base-media-validation-receipt-v001', 'validation-receipt'),
});
const meaningPackage = (packageId, captions) => {
  const atoms = captions.flatMap(caption => caption.parts).map((text, index) => ({
    atomOccurrenceId: `${packageId}-atom-${String(index + 1).padStart(3, '0')}`,
    text,
  }));
  let offset = 0;
  return {
    schemaVersion: 'zev-meaning-information-package-v002',
    packageId,
    sourceMedia: [],
    timelineComposition: {},
    atomOccurrences: atoms,
    captions: captions.map((caption, index) => {
      const ids = atoms.slice(offset, offset + caption.parts.length).map(atom => atom.atomOccurrenceId);
      offset += caption.parts.length;
      return {
        captionId: `caption-${String(index + 1).padStart(6, '0')}`,
        ordinal: index + 1,
        text: caption.parts.join(''),
        atomOccurrenceIds: ids,
      };
    }),
    title: {text: '', inputMode: 'none'},
    semanticObservations: [],
    provenance: {},
  };
};

const exactApprovedContracts = () => [
  {role: 'caption-quality-atomic-publication-b6-owner-scope-revision-addendum', path: CONTRACTS[4][0], fileSha256: CONTRACTS[4][1]},
  {role: 'caption-quality-atomic-runtime-lc-uuid-compatibility-addendum', path: CONTRACTS[6][0], fileSha256: CONTRACTS[6][1]},
  {role: 'caption-quality-complete-implementation-design', path: CONTRACTS[1][0], fileSha256: CONTRACTS[1][1]},
  {role: 'caption-quality-complete-implementation-design-addendum', path: CONTRACTS[2][0], fileSha256: CONTRACTS[2][1]},
  {role: 'caption-quality-dependency-load-stage-observation-addendum', path: CONTRACTS[14][0], fileSha256: CONTRACTS[14][1]},
  {role: 'caption-quality-dependency-unit-observation-addendum', path: CONTRACTS[13][0], fileSha256: CONTRACTS[13][1]},
  {role: 'caption-quality-formal-capability-read-entry-addendum', path: CONTRACTS[10][0], fileSha256: CONTRACTS[10][1]},
  {role: 'caption-quality-parent-contract', path: CONTRACTS[0][0], fileSha256: CONTRACTS[0][1]},
  {role: 'caption-quality-pre-staging-inner-observation-addendum', path: CONTRACTS[12][0], fileSha256: CONTRACTS[12][1]},
  {role: 'caption-quality-proof-capability-and-tsx-namespace-addendum', path: CONTRACTS[9][0], fileSha256: CONTRACTS[9][1]},
  {role: 'caption-quality-resolved-url-evaluation-addendum', path: CONTRACTS[15][0], fileSha256: CONTRACTS[15][1]},
  {role: 'caption-quality-runtime-live-binding-separation-addendum', path: CONTRACTS[8][0], fileSha256: CONTRACTS[8][1]},
  {role: 'caption-quality-source-final-package-validator-addendum', path: CONTRACTS[7][0], fileSha256: CONTRACTS[7][1]},
  {role: 'caption-quality-tsx-wrapper-descriptor-addendum', path: CONTRACTS[11][0], fileSha256: CONTRACTS[11][1]},
  {role: 'caption-quality-meaning-small-unit-criteria-addendum', path: CONTRACTS[16][0], fileSha256: CONTRACTS[16][1]},
  {role: 'caption-quality-logical-width-physical-alignment-addendum', path: CONTRACTS[17][0], fileSha256: CONTRACTS[17][1]},
];

const syntheticFixture = () => {
  const packages = [
    meaningPackage('meaning-a', [{parts: ['短', 'い']}, {parts: ['二', '件', '目']}]),
    meaningPackage('meaning-b', [{parts: ['別', '包']}]),
  ];
  const bindings = packages.map((item, index) => dummyFormalBinding(
    'zev-meaning-information-package-v002',
    `meaning-${index + 1}`,
  ));
  const contexts = [];
  const caseInputs = [];
  let ordinal = 0;
  packages.forEach((item, packageIndex) => {
    item.captions.forEach(() => {
      ordinal += 1;
      const horizontalStyleInput = styleInput();
      contexts.push({
        caseId: `case-${String(ordinal).padStart(3, '0')}`,
        inputCaptionId: `input-caption-${String(ordinal).padStart(6, '0')}`,
        meaningPackageBinding: clone(bindings[packageIndex]),
        baseMediaInput: baseMediaInput(),
        horizontalStyleInput,
        styleBindings: Object.fromEntries(
          ['trustedRegistryBindings', 'presetRegistry', 'presetValidationIndex', 'materialValidationIndex', 'rendererTrust']
            .map(name => [name, clone(horizontalStyleInput.presetBinding[name])]),
        ),
      });
      caseInputs.push({
        caseId: `case-${String(ordinal).padStart(3, '0')}`,
        meaningPackage: item,
        resolvedStyle: clone(resolvedStyle),
        layoutContext: {visualState: {}, transition: {}},
      });
    });
  });
  const jobId = 'synthetic-source-job';
  const job = {
    schemaVersion: 'presentation-output-caption-cue-source-package-job-v001',
    jobId,
    packageId: 'synthetic-source-package',
    meaningPackageBindings: bindings,
    styleLimits: {maxLogicalWidthPerLine: 36, maxLinesPerCue: 2, characterWidthRule: WIDTH_RULE},
    caseContexts: contexts,
    outputPath: `${OUTPUT_ROOT}/synthetic-source-package/source-package-v001.json`,
    runtimeProfile: {
      node: {path: NODE, fileSha256: 'de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c'},
      tsx: {path: TSX, fileSha256: 'f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f'},
    },
    implementationBindings: IMPLEMENTATION_ROLE_PATHS.map(([role, filePath]) => ({role, path: filePath, fileSha256: '0'.repeat(64)})),
    runtimeDataBindings: [{role: 'renderer-core-speaker-registry', path: 'evals/clip_composition/registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json', fileSha256: '0'.repeat(64)}],
    approvedContractBindings: exactApprovedContracts(),
  };
  const sourcePackageJobBinding = {
    schemaVersion: job.schemaVersion,
    path: `${JOB_ROOT}/${jobId}.json`,
    fileSha256: SHA(Buffer.from('synthetic-job')),
    canonicalSha256: SHA(Buffer.from('synthetic-job-canonical')),
  };
  return {job, sourcePackageJobBinding, caseInputs};
};

const IS_DIRECT_TEST_ENTRY = typeof process.argv[1] === 'string'
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (IS_DIRECT_TEST_ENTRY) {
let contractTexts;
before(async () => {
  contractTexts = new Map();
  for (const [relativePath, expectedSha] of CONTRACTS) {
    const bytes = await readFile(path.join(ROOT, relativePath));
    assert.equal(SHA(bytes), expectedSha, `approved contract changed: ${relativePath}`);
    contractTexts.set(relativePath, bytes.toString('utf8'));
  }
  const v1ProofBytes = await readFile(path.join(ROOT, V1_PROOF_CONTRACT[0]));
  assert.equal(SHA(v1ProofBytes), V1_PROOF_CONTRACT[1], 'approved v001 proof contract changed');
  const proofs = deriveApprovedCaptionQualityProofIdsV015({
    parent: contractTexts.get(CONTRACTS[1][0]),
    v1: v1ProofBytes.toString('utf8'),
    v2: contractTexts.get(CONTRACTS[2][0]),
    v3: contractTexts.get(CONTRACTS[3][0]),
    v4: contractTexts.get(CONTRACTS[4][0]),
    v5: contractTexts.get(CONTRACTS[5][0]),
    v6: contractTexts.get(CONTRACTS[6][0]),
    v7: contractTexts.get(CONTRACTS[7][0]),
    v8: contractTexts.get(CONTRACTS[8][0]),
    v9: contractTexts.get(CONTRACTS[9][0]),
    v10: contractTexts.get(CONTRACTS[10][0]),
    v11: contractTexts.get(CONTRACTS[11][0]),
    v12: contractTexts.get(CONTRACTS[12][0]),
    v13: contractTexts.get(CONTRACTS[13][0]),
    v14: contractTexts.get(CONTRACTS[14][0]),
    v15: contractTexts.get(CONTRACTS[15][0]),
  });
  assert.equal(proofs.length, 489, 'approved proof item count');
  assert.equal(new Set(proofs).size, 489, 'approved proof item IDs must be unique');
  assert.deepEqual(Object.fromEntries([
    'ZCQ001', 'ZCQ007', 'ZCQ018', 'ZCQ027', 'ZCQ042',
  ].map(owner => [owner, proofs.filter(id => id.includes(owner)).length])), {
    ZCQ001: 22,
    ZCQ007: 17,
    ZCQ018: 30,
    ZCQ027: 34,
    ZCQ042: 36,
  });
  const sourceProofs = proofs.filter(id => {
    const owner = ownerForApprovedCaptionQualityProofIdV001(id);
    const ordinal = Number.parseInt(owner.slice(3), 10);
    return ordinal >= 1 && ordinal <= 6;
  }).sort();
  assert.deepEqual(sourceProofs, Object.values(PROOFS).flat().sort(), 'S proof item closure');
  const parent = contractTexts.get(CONTRACTS[1][0]);
  const addendum = contractTexts.get(CONTRACTS[2][0]);
  const atomicAddendum = contractTexts.get(CONTRACTS[4][0]);
  const runtimeAddendum = contractTexts.get(CONTRACTS[6][0]);
  const validatorAddendum = contractTexts.get(CONTRACTS[7][0]);
  const liveBindingAddendum = contractTexts.get(CONTRACTS[8][0]);
  assert.match(parent, /schemaVersion\njobId\npackageId\nmeaningPackageBindings\nstyleLimits\ncaseContexts\noutputPath\nruntimeProfile\nimplementationBindings\nruntimeDataBindings\napprovedContractBindings/u);
  assert.match(parent, /schemaVersion\npackageId\npromptInput\nreconstructionMap\nprovenance/u);
  assert.match(addendum, /buildPresentationOutputCaptionCueSourcePackageV001\(\{\n  job,\n  sourcePackageJobBinding,\n  caseInputs,\n\}\)/u);
  assert.match(atomicAddendum, /executePresentationOutputCaptionCueSourceJobV001\(\{jobPath,atomicDirectoryPublisherLoader\}\)/u);
  assert.match(runtimeAddendum, /\| source \| 36 \|/u);
  assert.match(runtimeAddendum, /\| source \| 4 \| 5 \| parent、complete design、v002、v004、v006 \|/u);
  assert.match(validatorAddendum, /\| source \| 5 \| 6 \| parent、complete design、v002、v004、v006、本書 \|/u);
  assert.match(liveBindingAddendum, /\| source \| 6 \| 7 \| parent、complete design、v002、v004、v006、v007、本書 \|/u);
  assert.match(liveBindingAddendum, /proof item489件/u);
});

const buildSynthetic = () => {
  const fixture = syntheticFixture();
  const result = buildPresentationOutputCaptionCueSourcePackageV001(fixture);
  assert.equal(result.status, 'passed');
  return {...fixture, sourcePackage: result.value.sourcePackage};
};

const actualRoleBindings = async () => Promise.all(IMPLEMENTATION_ROLE_PATHS.map(async ([role, relativePath]) => ({
  role,
  path: relativePath,
  fileSha256: SHA(await readFile(path.join(ROOT, relativePath))),
})));
const actualFormalBinding = async relativePath => {
  const bytes = await readFile(path.join(ROOT, relativePath));
  const value = JSON.parse(bytes.toString('utf8'));
  return {
    schemaVersion: value.schemaVersion,
    path: relativePath,
    fileSha256: SHA(bytes),
    canonicalSha256: SHA(canonicalBytes(value)),
  };
};
const makeActualJob = async suffix => {
  const request = JSON.parse(await readFile(path.join(ROOT, OUTPUT_REQUEST_PATH), 'utf8'));
  const meaningPackageBinding = await actualFormalBinding(MEANING_PATH);
  const jobId = `zcq-source-${suffix}`;
  const packageId = `zcq-source-package-${suffix}`;
  return {
    schemaVersion: 'presentation-output-caption-cue-source-package-job-v001',
    jobId,
    packageId,
    meaningPackageBindings: [meaningPackageBinding],
    styleLimits: {maxLogicalWidthPerLine: 36, maxLinesPerCue: 2, characterWidthRule: WIDTH_RULE},
    caseContexts: [{
      caseId: `zcq-case-${suffix}`,
      inputCaptionId: 'input-caption-000001',
      meaningPackageBinding: clone(meaningPackageBinding),
      baseMediaInput: clone(request.baseMediaInput),
      horizontalStyleInput: clone(request.styleInput),
      styleBindings: Object.fromEntries(
        ['trustedRegistryBindings', 'presetRegistry', 'presetValidationIndex', 'materialValidationIndex', 'rendererTrust']
          .map(name => [name, clone(request.styleInput.presetBinding[name])]),
      ),
    }],
    outputPath: `${OUTPUT_ROOT}/${packageId}/source-package-v001.json`,
    runtimeProfile: {
      node: {path: NODE, fileSha256: 'de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c'},
      tsx: {path: TSX, fileSha256: 'f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f'},
    },
    implementationBindings: await actualRoleBindings(),
    runtimeDataBindings: [{
      role: 'renderer-core-speaker-registry',
      path: 'evals/clip_composition/registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json',
      fileSha256: SHA(await readFile(path.join(ROOT, 'evals/clip_composition/registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json'))),
    }],
    approvedContractBindings: [
      {role: 'caption-quality-atomic-publication-b6-owner-scope-revision-addendum', path: CONTRACTS[4][0], fileSha256: CONTRACTS[4][1]},
      {role: 'caption-quality-atomic-runtime-lc-uuid-compatibility-addendum', path: CONTRACTS[6][0], fileSha256: CONTRACTS[6][1]},
      {role: 'caption-quality-complete-implementation-design', path: CONTRACTS[1][0], fileSha256: CONTRACTS[1][1]},
      {role: 'caption-quality-complete-implementation-design-addendum', path: CONTRACTS[2][0], fileSha256: CONTRACTS[2][1]},
      {role: 'caption-quality-dependency-load-stage-observation-addendum', path: CONTRACTS[14][0], fileSha256: CONTRACTS[14][1]},
      {role: 'caption-quality-dependency-unit-observation-addendum', path: CONTRACTS[13][0], fileSha256: CONTRACTS[13][1]},
      {role: 'caption-quality-formal-capability-read-entry-addendum', path: CONTRACTS[10][0], fileSha256: CONTRACTS[10][1]},
      {role: 'caption-quality-parent-contract', path: CONTRACTS[0][0], fileSha256: CONTRACTS[0][1]},
      {role: 'caption-quality-pre-staging-inner-observation-addendum', path: CONTRACTS[12][0], fileSha256: CONTRACTS[12][1]},
      {role: 'caption-quality-proof-capability-and-tsx-namespace-addendum', path: CONTRACTS[9][0], fileSha256: CONTRACTS[9][1]},
      {role: 'caption-quality-resolved-url-evaluation-addendum', path: CONTRACTS[15][0], fileSha256: CONTRACTS[15][1]},
      {role: 'caption-quality-runtime-live-binding-separation-addendum', path: CONTRACTS[8][0], fileSha256: CONTRACTS[8][1]},
      {role: 'caption-quality-source-final-package-validator-addendum', path: CONTRACTS[7][0], fileSha256: CONTRACTS[7][1]},
      {role: 'caption-quality-tsx-wrapper-descriptor-addendum', path: CONTRACTS[11][0], fileSha256: CONTRACTS[11][1]},
      {role: 'caption-quality-meaning-small-unit-criteria-addendum', path: CONTRACTS[16][0], fileSha256: CONTRACTS[16][1]},
      {role: 'caption-quality-logical-width-physical-alignment-addendum', path: CONTRACTS[17][0], fileSha256: CONTRACTS[17][1]},
    ],
  };
};
const withJob = async (job, action) => {
  const jobPath = path.join(ROOT, JOB_ROOT, `${job.jobId}.json`);
  const outputRoot = path.join(ROOT, path.posix.dirname(job.outputPath));
  const stagingRoot = `${outputRoot}.staging`;
  await mkdir(path.dirname(jobPath), {recursive: true});
  await rm(outputRoot, {recursive: true, force: true});
  await rm(stagingRoot, {recursive: true, force: true});
  await writeFile(jobPath, formalBytes(job), {flag: 'wx'});
  try {
    return await action(jobPath, outputRoot, stagingRoot);
  } finally {
    await rm(jobPath, {force: true});
    await rm(outputRoot, {recursive: true, force: true});
    await rm(stagingRoot, {recursive: true, force: true});
  }
};
const runCli = (jobPath = null) => new Promise((resolve, reject) => {
  const args = ['--import', TSX, path.join(ROOT, SOURCE_PATH)];
  if (jobPath !== null) args.push(jobPath);
  const child = spawn(NODE, args, {
    cwd: ROOT,
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'NODE_OPTIONS')),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdout = [];
  const stderr = [];
  child.stdout.on('data', chunk => stdout.push(chunk));
  child.stderr.on('data', chunk => stderr.push(chunk));
  child.once('error', reject);
  child.once('close', code => resolve({code, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr)}));
});
const spawnCaptured = (command, args, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    cwd: options.cwd ?? ROOT,
    env: options.env ?? {},
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
  });
  const stdout = [];
  const stderr = [];
  child.stdout?.on('data', chunk => stdout.push(chunk));
  child.stderr?.on('data', chunk => stderr.push(chunk));
  child.once('error', reject);
  child.once('close', (code, signal) => resolve({
    code,
    signal,
    stdout: Buffer.concat(stdout),
    stderr: Buffer.concat(stderr),
  }));
});
const literalAwaitImports = source => {
  const parsed = ts.createSourceFile(
    SOURCE_PATH,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  assert.equal(parsed.parseDiagnostics.length, 0, 'source syntax diagnostics');
  const specifiers = [];
  let computed = 0;
  const visit = node => {
    if (ts.isAwaitExpression(node)
      && ts.isCallExpression(node.expression)
      && node.expression.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [argument] = node.expression.arguments;
      if (argument !== undefined && ts.isStringLiteral(argument)) specifiers.push(argument.text);
      else computed += 1;
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  return {specifiers, computed};
};
const observeV8RuntimeLiveBinding = async () => {
  const basename = 'presentation_atomic_directory_publish_v001-darwin-arm64';
  const formalPath = path.join(ROOT, 'evals/clip_composition', basename);
  const formal = await readFile(formalPath);
  const otool = await spawnCaptured('/usr/bin/otool', ['-l', formalPath]);
  const invalidInvocation = await spawnCaptured(formalPath, ['source', 'target'], {
    cwd: ROOT,
    env: {},
  });
  return {
    runtimeSha: SHA(formal),
    otool: {
      exitCode: otool.code,
      signal: otool.signal,
      stderrBytes: otool.stderr.length,
      uuidCount: (otool.stdout.toString('utf8').match(/^\s*cmd LC_UUID$/gmu) ?? []).length,
    },
    invalidInvocation: {
      exitCode: invalidInvocation.code,
      signal: invalidInvocation.signal,
      stdoutBytes: invalidInvocation.stdout.length,
      stderrBytes: invalidInvocation.stderr.length,
    },
  };
};
const formalAtomicDirectoryPublisherLoader = async function formalAtomicDirectoryPublisherLoader() {
  assert.equal(arguments.length, 0);
  return publishPresentationDirectoryAtomicallyNoReplaceV001;
};
const executeSource = (jobPath, atomicDirectoryPublisherLoader = formalAtomicDirectoryPublisherLoader) =>
  executePresentationOutputCaptionCueSourceJobV001({
    jobPath,
    atomicDirectoryPublisherLoader,
  });
const actualImplementationBindings = async () => actualRoleBindings();
const makeAtomicRoots = async label => {
  const logicalRoot = await mkdtemp(path.join(tmpdir(), `zevo-${label}-`));
  const workspaceRoot = await realpath(logicalRoot);
  for (const relativePath of [
    'evals/clip_composition/presentation_atomic_directory_publish_v001.mjs',
    'evals/clip_composition/presentation_atomic_directory_publish_v001.c',
    'evals/clip_composition/presentation_atomic_directory_publish_v001-darwin-arm64',
  ]) {
    const destination = path.join(workspaceRoot, relativePath);
    await mkdir(path.dirname(destination), {recursive: true});
    await copyFile(path.join(ROOT, relativePath), destination);
  }
  const outputRoot = path.join(workspaceRoot, 'output');
  const stagingRoot = `${outputRoot}.staging`;
  await mkdir(stagingRoot);
  await writeFile(path.join(stagingRoot, 'artifact.txt'), Buffer.from(label), {flag: 'wx'});
  return {workspaceRoot, outputRoot, stagingRoot};
};
const exists = async absolutePath => {
  try {
    await stat(absolutePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
};
const sourceJobBinding = (job, jobBytes) => ({
  schemaVersion: job.schemaVersion,
  path: `${JOB_ROOT}/${job.jobId}.json`,
  fileSha256: SHA(jobBytes),
  canonicalSha256: SHA(canonicalBytes(job)),
});
const jobInputPaths = job => {
  const result = new Set([
    ...job.implementationBindings.map(item => item.path),
    ...job.runtimeDataBindings.map(item => item.path),
    ...job.approvedContractBindings.map(item => item.path),
    ...job.meaningPackageBindings.map(item => item.path),
  ]);
  for (const context of job.caseContexts) {
    for (const binding of Object.values(context.baseMediaInput)) result.add(binding.path);
    for (const binding of Object.values(context.styleBindings)) result.add(binding.path);
  }
  return [...result].sort();
};
const runCliWithInvalidMeaningCaptionId = async job => {
  const logicalTempRoot = await mkdtemp(path.join(tmpdir(), 'zevo-zcq004-upstream-dominance-'));
  const tempRoot = await realpath(logicalTempRoot);
  try {
    const requiredPaths = new Set([
      ...job.implementationBindings.map(item => item.path),
      ...job.runtimeDataBindings.map(item => item.path),
      ...job.approvedContractBindings.map(item => item.path),
      ...job.meaningPackageBindings.map(item => item.path),
    ]);
    for (const relativePath of [...requiredPaths].sort()) {
      const destination = path.join(tempRoot, relativePath);
      await mkdir(path.dirname(destination), {recursive: true});
      await copyFile(path.join(ROOT, relativePath), destination);
    }
    const invalidJob = clone(job);
    const meaningPath = invalidJob.meaningPackageBindings[0].path;
    const meaning = JSON.parse(await readFile(path.join(tempRoot, meaningPath), 'utf8'));
    meaning.captions[0].captionId = '';
    const meaningBytes = formalBytes(meaning);
    await writeFile(path.join(tempRoot, meaningPath), meaningBytes);
    const invalidMeaningBinding = {
      schemaVersion: meaning.schemaVersion,
      path: meaningPath,
      fileSha256: SHA(meaningBytes),
      canonicalSha256: SHA(canonicalBytes(meaning)),
    };
    invalidJob.meaningPackageBindings[0] = invalidMeaningBinding;
    invalidJob.caseContexts.forEach(context => {
      if (context.meaningPackageBinding.path === meaningPath) {
        context.meaningPackageBinding = clone(invalidMeaningBinding);
      }
    });
    const jobPath = path.join(tempRoot, JOB_ROOT, `${invalidJob.jobId}.json`);
    await mkdir(path.dirname(jobPath), {recursive: true});
    await writeFile(jobPath, formalBytes(invalidJob), {flag: 'wx'});
    const result = await new Promise((resolve, reject) => {
      const stdout = [];
      const stderr = [];
      const child = spawn(NODE, [
        '--import', TSX, path.join(ROOT, SOURCE_PATH), jobPath,
      ], {
        cwd: tempRoot,
        env: Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'NODE_OPTIONS')),
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      child.stdout.on('data', chunk => stdout.push(chunk));
      child.stderr.on('data', chunk => stderr.push(chunk));
      child.once('error', reject);
      child.once('close', code => resolve({
        code,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
      }));
    });
    return {
      exitCode: result.code,
      stderrBytes: result.stderr.length,
      cli: JSON.parse(result.stdout.toString('utf8')),
    };
  } finally {
    await rm(tempRoot, {recursive: true, force: true});
  }
};
const runCliWithPrepublicationContractMutation = async job => {
  const logicalTempRoot = await mkdtemp(path.join(tmpdir(), 'zevo-zcq001-contract-reread-'));
  const tempRoot = await realpath(logicalTempRoot);
  try {
    for (const relativePath of jobInputPaths(job)) {
      const destination = path.join(tempRoot, relativePath);
      await mkdir(path.dirname(destination), {recursive: true});
      await copyFile(path.join(ROOT, relativePath), destination);
    }
    const jobPath = path.join(tempRoot, JOB_ROOT, `${job.jobId}.json`);
    await mkdir(path.dirname(jobPath), {recursive: true});
    await writeFile(jobPath, formalBytes(job), {flag: 'wx'});
    const outputParent = path.join(tempRoot, OUTPUT_ROOT);
    await mkdir(outputParent, {recursive: true});
    const finalRoot = path.join(outputParent, job.packageId);
    const stagingRoot = `${finalRoot}.staging`;
    const stagedPackagePath = path.join(stagingRoot, 'source-package-v001.json');
    const contractPath = path.join(tempRoot, job.approvedContractBindings[0].path);
    const contractBefore = await readFile(contractPath);
    const preloadPath = path.join(tempRoot, 'zcq001-prepublication-contract-mutation.cjs');
    const preloadBytes = Buffer.from([
      "'use strict';",
      "const {syncBuiltinESMExports} = require('node:module');",
      "const fsPromises = require('node:fs/promises');",
      `const stagedPackagePath = ${JSON.stringify(stagedPackagePath)};`,
      `const contractPath = ${JSON.stringify(contractPath)};`,
      'const originalReadFile = fsPromises.readFile;',
      'const originalWriteFile = fsPromises.writeFile;',
      'let mutationCount = 0;',
      'fsPromises.writeFile = async function(targetPath, ...args) {',
      '  const result = await originalWriteFile.call(this, targetPath, ...args);',
      '  if (String(targetPath) === stagedPackagePath) {',
      '    mutationCount += 1;',
      "    if (mutationCount !== 1) throw new Error('contract-mutation-count-invalid');",
      '    const contractBytes = await originalReadFile(contractPath);',
      "    await originalWriteFile(contractPath, Buffer.concat([contractBytes, Buffer.from('\\n')]));",
      '  }',
      '  return result;',
      '};',
      'syncBuiltinESMExports();',
      '',
    ].join('\n'), 'utf8');
    await writeFile(preloadPath, preloadBytes, {flag: 'wx'});
    const result = await new Promise((resolve, reject) => {
      const stdout = [];
      const stderr = [];
      const child = spawn(NODE, [
        '--require', preloadPath,
        '--import', TSX,
        path.join(ROOT, SOURCE_PATH),
        jobPath,
      ], {
        cwd: tempRoot,
        env: Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'NODE_OPTIONS')),
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      child.stdout.on('data', chunk => stdout.push(chunk));
      child.stderr.on('data', chunk => stderr.push(chunk));
      child.once('error', reject);
      child.once('close', code => resolve({
        code,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
      }));
    });
    const contractAfter = await readFile(contractPath);
    return {
      ...result,
      mutationObserved: contractAfter.equals(Buffer.concat([contractBefore, Buffer.from('\n')])),
      finalRootExists: await exists(finalRoot),
      stagingRootExists: await exists(stagingRoot),
    };
  } finally {
    await rm(tempRoot, {recursive: true, force: true});
  }
};

test('ZCQ001 source job schema, fixed loader, bound import graph, and CLI guard', async t => {
  const fixture = syntheticFixture();
  const sourceNamespace = await import('./presentation_output_caption_cue_source_package_v001.mjs');
  const actual = await makeActualJob('zcq001-positive');
  prove(t, PROOFS.ZCQ001[0], fixture.job.schemaVersion, 'presentation-output-caption-cue-source-package-job-v001');
  prove(t, PROOFS.ZCQ001[1], Object.keys(fixture.job), ['schemaVersion', 'jobId', 'packageId', 'meaningPackageBindings', 'styleLimits', 'caseContexts', 'outputPath', 'runtimeProfile', 'implementationBindings', 'runtimeDataBindings', 'approvedContractBindings']);
  prove(t, PROOFS.ZCQ001[2], validatePresentationOutputCaptionCueSourceJobV001(fixture.job).status, 'passed');
  prove(t, PROOFS.ZCQ001[3], Object.keys(fixture.job.caseContexts[0]), ['caseId', 'inputCaptionId', 'meaningPackageBinding', 'baseMediaInput', 'horizontalStyleInput', 'styleBindings']);
  prove(t, PROOFS.ZCQ001[4], fixture.job.runtimeProfile, {node: {path: NODE, fileSha256: 'de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c'}, tsx: {path: TSX, fileSha256: 'f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f'}});
  prove(t, PROOFS.ZCQ001[5], actual.implementationBindings.map(item => [item.role, item.path]), IMPLEMENTATION_ROLE_PATHS);
  prove(t, PROOFS.ZCQ001[6], {
    contracts: actual.approvedContractBindings,
    implementationCount: actual.implementationBindings.length,
    runtimeBinding: actual.implementationBindings.find(item => (
      item.role === 'atomic-directory-publisher-native-darwin-arm64-v001'
    )),
  }, {
    contracts: exactApprovedContracts(),
    implementationCount: 36,
    runtimeBinding: {
      role: 'atomic-directory-publisher-native-darwin-arm64-v001',
      path: 'evals/clip_composition/presentation_atomic_directory_publish_v001-darwin-arm64',
      fileSha256: 'ba5067dd933ae9b1213ab39236bf07c7e87513afbb384643347cefe0a75084b3',
    },
  });
  prove(t, PROOFS.ZCQ001[7], fixture.job.runtimeDataBindings.map(item => [item.role, item.path]), [[
    'renderer-core-speaker-registry',
    'evals/clip_composition/registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json',
  ]]);
  const positive = await withJob(actual, async (jobPath, outputRoot) => {
    const jobBytes = await readFile(jobPath);
    const run = await runCli(jobPath);
    const packageBytes = await readFile(path.join(outputRoot, 'source-package-v001.json'));
    return {run, jobBytes, packageBytes, sourcePackage: JSON.parse(packageBytes.toString('utf8'))};
  });
  prove(t, PROOFS.ZCQ001[8], positive.run.code, 0);
  prove(t, PROOFS.ZCQ001[9], positive.run.stderr.length, 0);
  prove(t, PROOFS.ZCQ001[10], JSON.parse(positive.run.stdout).status, 'passed');
  prove(t, PROOFS.ZCQ001[11], JSON.parse(positive.run.stdout).jobId, actual.jobId);
  const invalidSha = clone(actual);
  invalidSha.implementationBindings[0].fileSha256 = '0'.repeat(64);
  const rejectedSha = await withJob(invalidSha, jobPath => executeSource(jobPath));
  prove(t, PROOFS.ZCQ001[12], [rejectedSha.status, rejectedSha.stage, rejectedSha.primaryCode], ['rejected', 'job-read', 'CUE_SOURCE_JOB_INVALID']);
  t.diagnostic('code-owner:CUE_SOURCE_JOB_INVALID:passed');
  const missing = clone(fixture.job); delete missing.runtimeDataBindings;
  prove(t, PROOFS.ZCQ001[13], validatePresentationOutputCaptionCueSourceJobV001(missing).status, 'rejected');
  const extra = clone(fixture.job); extra.unexpected = true;
  prove(t, PROOFS.ZCQ001[14], validatePresentationOutputCaptionCueSourceJobV001(extra).status, 'rejected');
  const wrongPath = clone(fixture.job); wrongPath.outputPath = 'elsewhere/source-package-v001.json';
  prove(t, PROOFS.ZCQ001[15], validatePresentationOutputCaptionCueSourceJobV001(wrongPath).status, 'rejected');
  const wrongLoader = clone(fixture.job); wrongLoader.runtimeProfile.tsx.path = '/tmp/loader.mjs';
  prove(t, PROOFS.ZCQ001[16], validatePresentationOutputCaptionCueSourceJobV001(wrongLoader).status, 'rejected');
  assert.deepEqual(Object.keys(sourceNamespace).sort(), ['buildPresentationOutputCaptionCueSourcePackageV001', 'decodePresentationOutputCaptionCueSourceJobV001', 'executePresentationOutputCaptionCueSourceJobV001', 'validatePresentationOutputCaptionCueSourceJobV001', 'validatePresentationOutputCaptionCueSourcePackageV001'].sort());
  const usage = await runCli();
  assert.deepEqual([usage.code, usage.stdout.length, usage.stderr.toString('utf8')], [2, 0, 'usage: presentation_output_caption_cue_source_package_v001.mjs <job-path>\n']);
  prove(
    t,
    PROOFS.ZCQ001[17],
    positive.sourcePackage.provenance.sourcePackageJobBinding,
    sourceJobBinding(actual, positive.jobBytes),
  );
  const atomicNamespace = await import('./presentation_atomic_directory_publish_v001.mjs');
  const adapterRoots = await makeAtomicRoots('zcq001-adapter-contract');
  let oneShot;
  try {
    const bindings = await actualImplementationBindings();
    const sideEffectsBefore = await readdir(adapterRoots.workspaceRoot);
    assert.throws(() => classifyPresentationAtomicDirectoryPublishObservationV001({}), TypeError);
    assert.throws(() => executePresentationAtomicDirectoryNativeHelperV001({}), TypeError);
    assert.throws(() => preparePresentationDirectoryAtomicPublishV001({}), TypeError);
    assert.throws(() => publishPresentationDirectoryAtomicallyNoReplaceV001({}), TypeError);
    const prepared = await preparePresentationDirectoryAtomicPublishV001({
      workspaceRoot: adapterRoots.workspaceRoot,
      stagingRoot: adapterRoots.stagingRoot,
      outputRoot: adapterRoots.outputRoot,
      verifiedImplementationBindings: bindings,
      nativeProcessExecutor: async () => ({
        exitCode: 20,
        signal: null,
        stdoutBytes: Buffer.alloc(0),
        stderrBytes: Buffer.alloc(0),
      }),
    });
    assert.equal(prepared.status, 'prepared');
    const committed = prepared.commit();
    assert.throws(() => prepared.commit(), TypeError);
    assert.throws(() => prepared.cancel(), TypeError);
    oneShot = await committed;
    prove(t, PROOFS.ZCQ001[18], {
      exports: Object.keys(atomicNamespace),
      exportTypes: Object.values(atomicNamespace).map(value => typeof value),
      classified: classifyPresentationAtomicDirectoryPublishObservationV001({
        exitCode: 20,
        signal: null,
        stdoutBytes: Buffer.alloc(0),
        stderrBytes: Buffer.alloc(0),
      }),
      oneShot,
      importCreatedTopLevelEntry: (await readdir(adapterRoots.workspaceRoot)).length > sideEffectsBefore.length,
    }, {
      exports: [
        'classifyPresentationAtomicDirectoryPublishObservationV001',
        'executePresentationAtomicDirectoryNativeHelperV001',
        'preparePresentationDirectoryAtomicPublishV001',
        'publishPresentationDirectoryAtomicallyNoReplaceV001',
      ],
      exportTypes: ['function', 'function', 'function', 'function'],
      classified: {status: 'failed', reason: 'late-target-exists', toolExitCode: 20},
      oneShot: {status: 'failed', reason: 'late-target-exists', toolExitCode: 20},
      importCreatedTopLevelEntry: false,
    });
  } finally {
    await rm(adapterRoots.workspaceRoot, {recursive: true, force: true});
  }
  const contractMutationJob = await makeActualJob('zcq001-prepublication-contract-change');
  const contractMutation = await runCliWithPrepublicationContractMutation(contractMutationJob);
  const contractMutationCli = JSON.parse(contractMutation.stdout.toString('utf8'));
  prove(t, PROOFS.ZCQ001[19], {
    mutationObserved: contractMutation.mutationObserved,
    exitCode: contractMutation.code,
    stderrBytes: contractMutation.stderr.length,
    status: contractMutationCli.status,
    stage: contractMutationCli.stage,
    primaryCode: contractMutationCli.primaryCode,
    finalRootExists: contractMutation.finalRootExists,
    stagingRootExists: contractMutation.stagingRootExists,
  }, {
    mutationObserved: true,
    exitCode: 2,
    stderrBytes: 0,
    status: 'fatal',
    stage: 'package-validation',
    primaryCode: 'CUE_SOURCE_PUBLICATION_FAILED',
    finalRootExists: false,
    stagingRootExists: true,
  });

  const sourceText = await readFile(path.join(ROOT, SOURCE_PATH), 'utf8');
  const imports = literalAwaitImports(sourceText);
  const loaderCalls = [];
  const loaderJob = await makeActualJob('zcq001-loader-contract');
  const loaderResult = await withJob(loaderJob, async jobPath => executeSource(jobPath, async function () {
    loaderCalls.push(arguments.length);
    return async input => {
      loaderCalls.push(Object.keys(input));
      return publishPresentationDirectoryAtomicallyNoReplaceV001(input);
    };
  }));
  const invalidEntry = await executePresentationOutputCaptionCueSourceJobV001({
    jobPath: 'invalid',
    atomicDirectoryPublisherLoader: formalAtomicDirectoryPublisherLoader,
    extra: true,
  });
  const loaderThrowJob = await makeActualJob('zcq001-loader-throw');
  const loaderThrow = await withJob(loaderThrowJob, jobPath => executeSource(jobPath, async () => {
    throw new Error('discarded');
  }));
  prove(t, PROOFS.ZCQ001[20], {
    imports,
    loaderCalls,
    passed: [loaderResult.status, loaderResult.stage, loaderResult.primaryCode],
    invalidEntry: [invalidEntry.status, invalidEntry.stage, invalidEntry.primaryCode],
    loaderThrow: [loaderThrow.status, loaderThrow.stage, loaderThrow.primaryCode],
  }, {
    imports: {
      specifiers: [
        './presentation_output_style_resolver_v001.ts',
        './presentation_caption_semantic_source_package_v001.mjs',
        './presentation_a_meaning_information_package_v002.mjs',
        './presentation_output_crop_application_v001.mjs',
        './presentation_timeline_composition_decision_v001.mjs',
        './presentation_atomic_directory_publish_v001.mjs',
      ],
      computed: 0,
    },
    loaderCalls: [0, ['workspaceRoot', 'stagingRoot', 'outputRoot', 'verifiedImplementationBindings']],
    passed: ['passed', 'completed', null],
    invalidEntry: ['rejected', 'job-read', 'CUE_SOURCE_JOB_INVALID'],
    loaderThrow: ['fatal', 'root-publication', 'CUE_SOURCE_PUBLICATION_FAILED'],
  });

  prove(t, PROOFS.ZCQ001[21], await observeV8RuntimeLiveBinding(), {
    runtimeSha: 'ba5067dd933ae9b1213ab39236bf07c7e87513afbb384643347cefe0a75084b3',
    otool: {exitCode: 0, signal: null, stderrBytes: 0, uuidCount: 1},
    invalidInvocation: {exitCode: 25, signal: null, stdoutBytes: 0, stderrBytes: 0},
  });
});

test('ZCQ002 multiple meaning packages preserve input order and deterministic IDs', t => {
  const {sourcePackage} = buildSynthetic();
  prove(t, PROOFS.ZCQ002[0], sourcePackage.reconstructionMap.meaningPackageBindings.map(item => item.path), ['fixtures/meaning-1.json', 'fixtures/meaning-2.json']);
  prove(t, PROOFS.ZCQ002[1], sourcePackage.promptInput.captions.map(item => item.captionId), ['input-caption-000001', 'input-caption-000002', 'input-caption-000003']);
  prove(t, PROOFS.ZCQ002[2], sourcePackage.promptInput.captions.flatMap(item => item.boundaryCandidates.map(boundary => boundary.boundaryId)), ['display-boundary-000001-000001', 'display-boundary-000001-000002', 'display-boundary-000002-000001', 'display-boundary-000002-000002', 'display-boundary-000002-000003', 'display-boundary-000003-000001', 'display-boundary-000003-000002']);
});

test('ZCQ003 every atom is retained once and case context remains one-to-one', t => {
  const {sourcePackage, caseInputs} = buildSynthetic();
  const ids = sourcePackage.reconstructionMap.captions.flatMap(item => item.atomOccurrenceIds);
  prove(t, PROOFS.ZCQ003[0], new Set(ids).size, ids.length);
  prove(t, PROOFS.ZCQ003[1], sourcePackage.promptInput.captions.map(item => item.boundaryCandidates.map(boundary => boundary.text).join('')), caseInputs.flatMap(item => item.meaningPackage.captions).filter((item, index, all) => all.findIndex(candidate => candidate.captionId === item.captionId && candidate.text === item.text) === index).map(item => item.text));
  prove(t, PROOFS.ZCQ003[2], sourcePackage.reconstructionMap.caseContexts.map(item => item.inputCaptionId), sourcePackage.promptInput.captions.map(item => item.captionId));
  const atomClosureFixture = syntheticFixture();
  atomClosureFixture.caseInputs.pop();
  const atomClosure = buildPresentationOutputCaptionCueSourcePackageV001(atomClosureFixture);
  assert.deepEqual([atomClosure.status, atomClosure.primaryCode], ['rejected', 'CUE_SOURCE_ATOM_CLOSURE_INVALID']);
  t.diagnostic('code-owner:CUE_SOURCE_ATOM_CLOSURE_INVALID:passed');
});

test('ZCQ004 final package validator, code trigger, upstream dominance, and projection predicates', async t => {
  const {sourcePackage} = buildSynthetic();
  const visible = JSON.stringify(sourcePackage.promptInput);
  const validResult = validatePresentationOutputCaptionCueSourcePackageV001(sourcePackage);
  prove(t, PROOFS.ZCQ004[0], {
    validation: validResult,
    taskDescription: sourcePackage.promptInput.taskDescription,
    boundaryTexts: sourcePackage.promptInput.captions
      .flatMap(item => item.boundaryCandidates).map(item => item.text),
    styleLimits: sourcePackage.promptInput.styleLimits,
    localContextWords: ['path', 'Sha256', 'retainedSpan', 'presetId', 'crop', 'title']
      .filter(word => visible.includes(word)),
  }, {
    validation: {status: 'passed', violations: []},
    taskDescription: '各captionの境界片を記載順に一度ずつ全量使用してください。cueは、直前から続く発話がそれだけで意味を読める短いまとまりになり、その末尾で発話の意味が一区切りつくように、cue終端を提示されたboundaryIdから選んでください。cue終端を意味の基準で先に決め、そのcueが一行に収まらない場合だけ行末を提示されたboundaryIdから選んでください。cue終端と行末は、語、固有名詞、反復語、読みとして一続きの文節の途中に置かないでください。必要な行末候補が複数ある場合は、二行の幅が大きく偏らない候補を選んでください。各cueはstyleLimits.maxLinesPerCue以下とし、一行に収まるcueを改行しないでください。最後のcueはcaption最後のboundaryIdで終えてください。本文、境界片、ID、順序を変更しないでください。',
    boundaryTexts: ['短', 'い', '二', '件', '目', '別', '包'],
    styleLimits: {
      maxLogicalWidthPerLine: 36,
      maxLinesPerCue: 2,
      characterWidthRule: WIDTH_RULE,
    },
    localContextWords: [],
  });

  const width35Fixture = syntheticFixture();
  width35Fixture.job.styleLimits.maxLogicalWidthPerLine = 35;
  for (const context of width35Fixture.job.caseContexts) {
    context.horizontalStyleInput.captionLayoutPolicy.maxLogicalWidthPerLine = 35;
  }
  for (const input of width35Fixture.caseInputs) {
    input.resolvedStyle.maxLogicalWidthPerLine = 35;
  }
  const width35Result = buildPresentationOutputCaptionCueSourcePackageV001(width35Fixture);
  assert.equal(width35Result.status, 'passed');
  assert.deepEqual([
    width35Result.value.sourcePackage.promptInput.styleLimits.maxLogicalWidthPerLine,
    ...width35Result.value.sourcePackage.reconstructionMap.caseContexts.map(
      context => context.resolvedStyle.maxLogicalWidthPerLine,
    ),
  ], [35, 35, 35, 35]);

  const builderFixture = syntheticFixture();
  builderFixture.caseInputs[0].meaningPackage.captions[0].captionId = '';
  const builderRejected = buildPresentationOutputCaptionCueSourcePackageV001(builderFixture);
  const runnerJob = await makeActualJob('zcq004-upstream-dominance');
  const runnerRejected = await runCliWithInvalidMeaningCaptionId(runnerJob);
  prove(t, PROOFS.ZCQ004[1], {
    builderBranchLabel: 'reconstruction-map-code-trigger',
    builderResult: [builderRejected.status, builderRejected.primaryCode],
    runnerBranchLabel: 'upstream-meaning-validator-dominance',
    runnerResult: [
      runnerRejected.exitCode,
      runnerRejected.stderrBytes,
      runnerRejected.cli.status,
      runnerRejected.cli.stage,
      runnerRejected.cli.primaryCode,
    ],
  }, {
    builderBranchLabel: 'reconstruction-map-code-trigger',
    builderResult: ['rejected', 'CUE_SOURCE_PROMPT_PROJECTION_INVALID'],
    runnerBranchLabel: 'upstream-meaning-validator-dominance',
    runnerResult: [1, 0, 'rejected', 'input-reread', 'CUE_SOURCE_INPUT_BINDING_INVALID'],
  });
  t.diagnostic('code-owner:CUE_SOURCE_PROMPT_PROJECTION_INVALID:passed');

  const localContext = clone(sourcePackage);
  Object.assign(localContext.promptInput.captions[0].boundaryCandidates[0], {
    path: 'forbidden.json',
    fileSha256: '0'.repeat(64),
    sourceStartMs: 1,
  });
  const emptyText = clone(sourcePackage);
  emptyText.promptInput.captions[0].boundaryCandidates[0].text = '';
  const duplicateBoundary = clone(sourcePackage);
  duplicateBoundary.promptInput.captions[0].boundaryCandidates[1].boundaryId
    = duplicateBoundary.promptInput.captions[0].boundaryCandidates[0].boundaryId;
  duplicateBoundary.reconstructionMap.captions[0].boundaries[1].boundaryId
    = duplicateBoundary.reconstructionMap.captions[0].boundaries[0].boundaryId;
  const styleMismatch = clone(sourcePackage);
  styleMismatch.reconstructionMap.caseContexts[0].resolvedStyle.maxLogicalWidthPerLine = 35;
  prove(t, PROOFS.ZCQ004[2], {
    localContext: validatePresentationOutputCaptionCueSourcePackageV001(localContext).violations,
    emptyText: validatePresentationOutputCaptionCueSourcePackageV001(emptyText).violations,
    duplicateBoundary: validatePresentationOutputCaptionCueSourcePackageV001(duplicateBoundary).violations,
    styleMismatch: validatePresentationOutputCaptionCueSourcePackageV001(styleMismatch).violations,
  }, {
    localContext: [{path: '/promptInput/captions/0/boundaryCandidates/0', rule: 'exact-key-set'}],
    emptyText: [{path: '/promptInput/captions/0/boundaryCandidates/0/text', rule: 'nonempty-string'}],
    duplicateBoundary: [{path: '/promptInput/captions/0/boundaryCandidates/1/boundaryId', rule: 'unique-id'}],
    styleMismatch: [{path: '/reconstructionMap/caseContexts/0/resolvedStyle', rule: 'style-limit-mismatch'}],
  });

  const orderedInvalid = clone(sourcePackage);
  orderedInvalid.promptInput.captions[0].boundaryCandidates[0].text = '';
  orderedInvalid.promptInput.captions[0].boundaryCandidates[1].boundaryId
    = orderedInvalid.promptInput.captions[0].boundaryCandidates[0].boundaryId;
  orderedInvalid.reconstructionMap.captions[0].boundaries[1].boundaryId
    = orderedInvalid.reconstructionMap.captions[0].boundaries[0].boundaryId;
  orderedInvalid.reconstructionMap.caseContexts[0].resolvedStyle.maxLogicalWidthPerLine = 35;
  const firstValidation = validatePresentationOutputCaptionCueSourcePackageV001(orderedInvalid);
  const secondValidation = validatePresentationOutputCaptionCueSourcePackageV001(orderedInvalid);
  const sourceText = await readFile(path.join(ROOT, SOURCE_PATH), 'utf8');
  const validatorReferences = sourceText.match(
    /validatePresentationOutputCaptionCueSourcePackageV001\s*\(/gu,
  ) ?? [];
  prove(t, PROOFS.ZCQ004[3], {
    keys: Object.keys(firstValidation),
    violationKeys: firstValidation.violations.map(item => Object.keys(item)),
    violations: firstValidation.violations,
    frozen: Object.isFrozen(firstValidation)
      && Object.isFrozen(firstValidation.violations)
      && firstValidation.violations.every(Object.isFrozen),
    deterministic: JSON.stringify(firstValidation) === JSON.stringify(secondValidation),
    validatorReferences: validatorReferences.length,
    privateValidatorDeclarations: (sourceText.match(/const validatePackage\b/gu) ?? []).length,
    executionEntryKeys: ['jobPath', 'atomicDirectoryPublisherLoader'],
  }, {
    keys: ['status', 'violations'],
    violationKeys: [
      ['path', 'rule'], ['path', 'rule'], ['path', 'rule'],
    ],
    violations: [
      {path: '/promptInput/captions/0/boundaryCandidates/0/text', rule: 'nonempty-string'},
      {path: '/promptInput/captions/0/boundaryCandidates/1/boundaryId', rule: 'unique-id'},
      {path: '/reconstructionMap/caseContexts/0/resolvedStyle', rule: 'style-limit-mismatch'},
    ],
    frozen: true,
    deterministic: true,
    validatorReferences: 4,
    privateValidatorDeclarations: 0,
    executionEntryKeys: ['jobPath', 'atomicDirectoryPublisherLoader'],
  });
});

test('ZCQ005 input bindings, resolved style, reread, and no-replace publication reject correctly', async t => {
  const canonicalMismatch = await makeActualJob('zcq005-canonical');
  canonicalMismatch.meaningPackageBindings[0].canonicalSha256 = '0'.repeat(64);
  canonicalMismatch.caseContexts[0].meaningPackageBinding.canonicalSha256 = '0'.repeat(64);
  const canonicalResult = await withJob(canonicalMismatch, jobPath => executeSource(jobPath));
  prove(t, PROOFS.ZCQ005[0], canonicalResult.primaryCode, 'CUE_SOURCE_INPUT_BINDING_INVALID');
  prove(t, PROOFS.ZCQ005[1], canonicalResult.stage, 'input-reread');
  t.diagnostic('code-owner:CUE_SOURCE_INPUT_BINDING_INVALID:passed');
  const fixture = syntheticFixture();
  const mismatchedBinding = clone(fixture.sourcePackageJobBinding);
  mismatchedBinding.path = `${JOB_ROOT}/different-job.json`;
  const bindingResult = buildPresentationOutputCaptionCueSourcePackageV001({...fixture, sourcePackageJobBinding: mismatchedBinding});
  prove(t, PROOFS.ZCQ005[2], bindingResult.primaryCode, 'CUE_SOURCE_INPUT_BINDING_INVALID');
  const styleMismatch = clone(fixture);
  styleMismatch.caseInputs[0].resolvedStyle.maxLogicalWidthPerLine = 35;
  const styleResult = buildPresentationOutputCaptionCueSourcePackageV001(styleMismatch);
  prove(t, PROOFS.ZCQ005[3], styleResult.primaryCode, 'CUE_SOURCE_STYLE_INVALID');
  const width35Mismatch = clone(fixture);
  width35Mismatch.job.styleLimits.maxLogicalWidthPerLine = 35;
  for (const context of width35Mismatch.job.caseContexts) {
    context.horizontalStyleInput.captionLayoutPolicy.maxLogicalWidthPerLine = 35;
  }
  const width35MismatchResult = buildPresentationOutputCaptionCueSourcePackageV001(width35Mismatch);
  assert.equal(width35MismatchResult.primaryCode, 'CUE_SOURCE_STYLE_INVALID');
  t.diagnostic('code-owner:CUE_SOURCE_STYLE_INVALID:passed');
  const executionFailure = await executeSource(path.join(ROOT, JOB_ROOT, 'missing-source-job.json'));
  assert.deepEqual([executionFailure.status, executionFailure.primaryCode], ['fatal', 'CUE_SOURCE_EXECUTION_FAILED']);
  t.diagnostic('code-owner:CUE_SOURCE_EXECUTION_FAILED:passed');
  const noReplace = await makeActualJob('zcq005-no-replace');
  await withJob(noReplace, async (jobPath, outputRoot) => {
    const first = await executeSource(jobPath);
    assert.equal(first.status, 'passed');
    const original = await readFile(path.join(outputRoot, 'source-package-v001.json'));
    const second = await executeSource(jobPath);
    prove(t, PROOFS.ZCQ005[4], [second.status, second.primaryCode, SHA(await readFile(path.join(outputRoot, 'source-package-v001.json')))], ['rejected', 'CUE_SOURCE_PUBLICATION_FAILED', SHA(original)]);
  });

  const atomicSuccess = await makeActualJob('zcq005-atomic-success');
  const atomicSuccessObserved = await withJob(atomicSuccess, async (jobPath, outputRoot, stagingRoot) => {
    const result = await executeSource(jobPath);
    const bytes = await readFile(path.join(outputRoot, 'source-package-v001.json'));
    const value = JSON.parse(bytes.toString('utf8'));
    return {
      result: [result.status, result.stage, result.primaryCode],
      packageSchema: value.schemaVersion,
      formalEnding: bytes.subarray(-1).equals(Buffer.from('\n')),
      stagingExists: await exists(stagingRoot),
    };
  });
  prove(t, PROOFS.ZCQ005[5], atomicSuccessObserved, {
    result: ['passed', 'completed', null],
    packageSchema: 'presentation-output-caption-cue-source-package-v001',
    formalEnding: true,
    stagingExists: false,
  });

  const lateCollisionJob = await makeActualJob('zcq005-late-collision');
  let lateCollisionObserved;
  const lateCollision = await withJob(lateCollisionJob, async (jobPath, outputRoot, stagingRoot) => {
    const result = await executeSource(jobPath, async () => async input => {
      const prepared = await preparePresentationDirectoryAtomicPublishV001({
        ...input,
        nativeProcessExecutor: executePresentationAtomicDirectoryNativeHelperV001,
      });
      assert.equal(prepared.status, 'prepared');
      await mkdir(input.outputRoot);
      const targetBefore = await lstat(input.outputRoot, {bigint: true});
      const stagingBefore = await lstat(input.stagingRoot, {bigint: true});
      const publication = await prepared.commit();
      const targetAfter = await lstat(input.outputRoot, {bigint: true});
      const stagingAfter = await lstat(input.stagingRoot, {bigint: true});
      lateCollisionObserved = {
        publication,
        targetIdentityUnchanged: targetBefore.dev === targetAfter.dev && targetBefore.ino === targetAfter.ino,
        stagingIdentityUnchanged: stagingBefore.dev === stagingAfter.dev && stagingBefore.ino === stagingAfter.ino,
      };
      return publication;
    });
    return {
      result: [result.status, result.stage, result.primaryCode],
      targetEntries: await readdir(outputRoot),
      stagingEntries: await readdir(stagingRoot),
    };
  });
  prove(t, PROOFS.ZCQ005[6], {...lateCollisionObserved, ...lateCollision}, {
    publication: {status: 'failed', reason: 'late-target-exists', toolExitCode: 20},
    targetIdentityUnchanged: true,
    stagingIdentityUnchanged: true,
    result: ['fatal', 'root-publication', 'CUE_SOURCE_PUBLICATION_FAILED'],
    targetEntries: [],
    stagingEntries: ['source-package-v001.json'],
  });
  t.diagnostic('code-owner:CUE_SOURCE_PUBLICATION_FAILED:passed');

  const prePrepareCollisionJob = await makeActualJob('zcq005-pre-prepare-collision');
  let helperCalls = 0;
  const prePrepareCollision = await withJob(
    prePrepareCollisionJob,
    async (jobPath, outputRoot, stagingRoot) => {
      const result = await executeSource(jobPath, async () => async input => {
        await mkdir(input.outputRoot);
        const prepared = await preparePresentationDirectoryAtomicPublishV001({
          ...input,
          nativeProcessExecutor: async () => {
            helperCalls += 1;
            return {exitCode: 0, signal: null, stdoutBytes: Buffer.alloc(0), stderrBytes: Buffer.alloc(0)};
          },
        });
        return prepared;
      });
      return {
        result: [result.status, result.stage, result.primaryCode],
        targetEntries: await readdir(outputRoot),
        stagingEntries: await readdir(stagingRoot),
      };
    },
  );
  prove(t, PROOFS.ZCQ005[7], {helperCalls, ...prePrepareCollision}, {
    helperCalls: 0,
    result: ['fatal', 'root-publication', 'CUE_SOURCE_PUBLICATION_FAILED'],
    targetEntries: [],
    stagingEntries: ['source-package-v001.json'],
  });

  const siblingRoots = await makeAtomicRoots('zcq005-sibling');
  try {
    const wrongSibling = await preparePresentationDirectoryAtomicPublishV001({
      workspaceRoot: siblingRoots.workspaceRoot,
      stagingRoot: siblingRoots.stagingRoot,
      outputRoot: path.join(siblingRoots.workspaceRoot, 'other-output'),
      verifiedImplementationBindings: await actualImplementationBindings(),
      nativeProcessExecutor: executePresentationAtomicDirectoryNativeHelperV001,
    });
    prove(t, PROOFS.ZCQ005[8], wrongSibling, {
      status: 'failed', reason: 'unsafe-path', toolExitCode: null,
    });
  } finally {
    await rm(siblingRoots.workspaceRoot, {recursive: true, force: true});
  }

  prove(t, PROOFS.ZCQ005[9], Object.fromEntries(
    [20, 21, 22, 23, 24, 25, 26].map(exitCode => [
      exitCode,
      classifyPresentationAtomicDirectoryPublishObservationV001({
        exitCode,
        signal: null,
        stdoutBytes: Buffer.alloc(0),
        stderrBytes: Buffer.alloc(0),
      }),
    ]),
  ), {
    20: {status: 'failed', reason: 'late-target-exists', toolExitCode: 20},
    21: {status: 'failed', reason: 'filesystem-unsupported', toolExitCode: 21},
    22: {status: 'failed', reason: 'unsafe-path', toolExitCode: 22},
    23: {status: 'failed', reason: 'source-invalid', toolExitCode: 23},
    24: {status: 'failed', reason: 'cross-device', toolExitCode: 24},
    25: {status: 'failed', reason: 'helper-invocation-invalid', toolExitCode: 25},
    26: {status: 'failed', reason: 'helper-execution-failed', toolExitCode: 26},
  });

  const prepareObservations = {};
  const missingRoots = await makeAtomicRoots('zcq005-missing');
  await rm(missingRoots.stagingRoot, {recursive: true, force: true});
  let missingHelperCalls = 0;
  const missingResult = await preparePresentationDirectoryAtomicPublishV001({
    workspaceRoot: missingRoots.workspaceRoot,
    stagingRoot: missingRoots.stagingRoot,
    outputRoot: missingRoots.outputRoot,
    verifiedImplementationBindings: await actualImplementationBindings(),
    nativeProcessExecutor: async input => {
      missingHelperCalls += 1;
      return executePresentationAtomicDirectoryNativeHelperV001(input);
    },
  });
  prepareObservations.missing = {result: missingResult, helperCalls: missingHelperCalls};
  await rm(missingRoots.workspaceRoot, {recursive: true, force: true});

  const nonDirectoryRoots = await makeAtomicRoots('zcq005-non-directory');
  await rm(nonDirectoryRoots.stagingRoot, {recursive: true, force: true});
  await writeFile(nonDirectoryRoots.stagingRoot, Buffer.from('not-a-directory'), {flag: 'wx'});
  let nonDirectoryHelperCalls = 0;
  const nonDirectoryResult = await preparePresentationDirectoryAtomicPublishV001({
    workspaceRoot: nonDirectoryRoots.workspaceRoot,
    stagingRoot: nonDirectoryRoots.stagingRoot,
    outputRoot: nonDirectoryRoots.outputRoot,
    verifiedImplementationBindings: await actualImplementationBindings(),
    nativeProcessExecutor: async input => {
      nonDirectoryHelperCalls += 1;
      return executePresentationAtomicDirectoryNativeHelperV001(input);
    },
  });
  prepareObservations.nonDirectory = {
    result: nonDirectoryResult,
    helperCalls: nonDirectoryHelperCalls,
  };
  await rm(nonDirectoryRoots.workspaceRoot, {recursive: true, force: true});

  const symlinkRoots = await makeAtomicRoots('zcq005-symlink');
  const symlinkTarget = path.join(symlinkRoots.workspaceRoot, 'staging-target');
  await mkdir(symlinkTarget);
  await rm(symlinkRoots.stagingRoot, {recursive: true, force: true});
  await symlink(symlinkTarget, symlinkRoots.stagingRoot, 'dir');
  let symlinkHelperCalls = 0;
  const symlinkResult = await preparePresentationDirectoryAtomicPublishV001({
    workspaceRoot: symlinkRoots.workspaceRoot,
    stagingRoot: symlinkRoots.stagingRoot,
    outputRoot: symlinkRoots.outputRoot,
    verifiedImplementationBindings: await actualImplementationBindings(),
    nativeProcessExecutor: async input => {
      symlinkHelperCalls += 1;
      return executePresentationAtomicDirectoryNativeHelperV001(input);
    },
  });
  prepareObservations.symlink = {result: symlinkResult, helperCalls: symlinkHelperCalls};
  await rm(symlinkRoots.workspaceRoot, {recursive: true, force: true});

  const identityRoots = await makeAtomicRoots('zcq005-identity-type');
  const movedStaging = `${identityRoots.stagingRoot}.original`;
  let identityHelperCalls = 0;
  const identityPrepared = await preparePresentationDirectoryAtomicPublishV001({
    workspaceRoot: identityRoots.workspaceRoot,
    stagingRoot: identityRoots.stagingRoot,
    outputRoot: identityRoots.outputRoot,
    verifiedImplementationBindings: await actualImplementationBindings(),
    nativeProcessExecutor: async input => {
      identityHelperCalls += 1;
      await rename(identityRoots.stagingRoot, movedStaging);
      await mkdir(identityRoots.stagingRoot);
      return executePresentationAtomicDirectoryNativeHelperV001(input);
    },
  });
  assert.equal(identityPrepared.status, 'prepared');
  const identityResult = await identityPrepared.commit();
  prepareObservations.identityType = {
    result: identityResult,
    helperCalls: identityHelperCalls,
  };
  await rm(identityRoots.workspaceRoot, {recursive: true, force: true});

  const invalidBindingRoots = await makeAtomicRoots('zcq005-invalid-binding');
  let invalidBindingHelperCalls = 0;
  const invalidBindingResult = await preparePresentationDirectoryAtomicPublishV001({
    workspaceRoot: invalidBindingRoots.workspaceRoot,
    stagingRoot: invalidBindingRoots.stagingRoot,
    outputRoot: invalidBindingRoots.outputRoot,
    verifiedImplementationBindings: (await actualImplementationBindings()).slice(1),
    nativeProcessExecutor: async input => {
      invalidBindingHelperCalls += 1;
      return executePresentationAtomicDirectoryNativeHelperV001(input);
    },
  });
  prepareObservations.invalidBinding = {
    result: invalidBindingResult,
    helperCalls: invalidBindingHelperCalls,
  };
  await rm(invalidBindingRoots.workspaceRoot, {recursive: true, force: true});
  const changedBindingRoots = await makeAtomicRoots('zcq005-changed-binding');
  const changedBindings = await actualImplementationBindings();
  changedBindings.find(item => item.role === 'atomic-directory-publisher-native-source-v001').fileSha256 = '0'.repeat(64);
  let changedBindingHelperCalls = 0;
  const changedBindingResult = await preparePresentationDirectoryAtomicPublishV001({
    workspaceRoot: changedBindingRoots.workspaceRoot,
    stagingRoot: changedBindingRoots.stagingRoot,
    outputRoot: changedBindingRoots.outputRoot,
    verifiedImplementationBindings: changedBindings,
    nativeProcessExecutor: async input => {
      changedBindingHelperCalls += 1;
      return executePresentationAtomicDirectoryNativeHelperV001(input);
    },
  });
  prepareObservations.changedBinding = {
    result: changedBindingResult,
    helperCalls: changedBindingHelperCalls,
  };
  await rm(changedBindingRoots.workspaceRoot, {recursive: true, force: true});

  const ordinaryIoRoots = await makeAtomicRoots('zcq005-ordinary-io');
  let ordinaryIoHelperCalls = 0;
  const ordinaryIoPrepared = await preparePresentationDirectoryAtomicPublishV001({
    workspaceRoot: ordinaryIoRoots.workspaceRoot,
    stagingRoot: ordinaryIoRoots.stagingRoot,
    outputRoot: ordinaryIoRoots.outputRoot,
    verifiedImplementationBindings: await actualImplementationBindings(),
    nativeProcessExecutor: async () => {
      ordinaryIoHelperCalls += 1;
      throw new Error('discarded');
    },
  });
  assert.equal(ordinaryIoPrepared.status, 'prepared');
  const ordinaryIoResult = await ordinaryIoPrepared.commit();
  prepareObservations.ordinaryIo = {
    result: ordinaryIoResult,
    helperCalls: ordinaryIoHelperCalls,
  };
  await rm(ordinaryIoRoots.workspaceRoot, {recursive: true, force: true});
  prove(t, PROOFS.ZCQ005[10], prepareObservations, {
    missing: {
      result: {status: 'failed', reason: 'source-invalid', toolExitCode: null},
      helperCalls: 0,
    },
    nonDirectory: {
      result: {status: 'failed', reason: 'source-invalid', toolExitCode: null},
      helperCalls: 0,
    },
    symlink: {
      result: {status: 'failed', reason: 'source-invalid', toolExitCode: null},
      helperCalls: 0,
    },
    identityType: {
      result: {status: 'failed', reason: 'source-invalid', toolExitCode: 23},
      helperCalls: 1,
    },
    invalidBinding: {
      result: {status: 'failed', reason: 'helper-invocation-invalid', toolExitCode: null},
      helperCalls: 0,
    },
    changedBinding: {
      result: {status: 'failed', reason: 'helper-execution-failed', toolExitCode: null},
      helperCalls: 0,
    },
    ordinaryIo: {
      result: {status: 'failed', reason: 'helper-execution-failed', toolExitCode: null},
      helperCalls: 1,
    },
  });

  prove(t, PROOFS.ZCQ005[11], {
    ordinary: classifyPresentationAtomicDirectoryPublishObservationV001({exitCode: 99, signal: null, stdoutBytes: Buffer.alloc(0), stderrBytes: Buffer.alloc(0)}),
    signal: classifyPresentationAtomicDirectoryPublishObservationV001({exitCode: null, signal: 'SIGTERM', stdoutBytes: Buffer.alloc(0), stderrBytes: Buffer.alloc(0)}),
    stdout: classifyPresentationAtomicDirectoryPublishObservationV001({exitCode: 20, signal: null, stdoutBytes: Buffer.from('x'), stderrBytes: Buffer.alloc(0)}),
    invalidTuple: classifyPresentationAtomicDirectoryPublishObservationV001({exitCode: null, signal: null, stdoutBytes: Buffer.alloc(0), stderrBytes: Buffer.alloc(0)}),
  }, {
    ordinary: {status: 'failed', reason: 'helper-execution-failed', toolExitCode: 99},
    signal: {status: 'failed', reason: 'helper-execution-failed', toolExitCode: null},
    stdout: {status: 'failed', reason: 'helper-execution-failed', toolExitCode: 20},
    invalidTuple: {status: 'failed', reason: 'helper-execution-failed', toolExitCode: null},
  });

  const branchResults = [];
  for (const [label, executor] of [
    ['numeric-success', async () => ({exitCode: 0, signal: null, stdoutBytes: Buffer.alloc(0), stderrBytes: Buffer.alloc(0)})],
    ['numeric-failure', async () => ({exitCode: 20, signal: null, stdoutBytes: Buffer.alloc(0), stderrBytes: Buffer.alloc(0)})],
    ['signal', async () => ({exitCode: null, signal: 'SIGTERM', stdoutBytes: Buffer.alloc(0), stderrBytes: Buffer.alloc(0)})],
    ['throw', async () => { throw new Error('discarded'); }],
  ]) {
    const roots = await makeAtomicRoots(`zcq005-${label}`);
    const observedHandles = [];
    const prepared = await preparePresentationDirectoryAtomicPublishV001({
      workspaceRoot: roots.workspaceRoot,
      stagingRoot: roots.stagingRoot,
      outputRoot: roots.outputRoot,
      verifiedImplementationBindings: await actualImplementationBindings(),
      nativeProcessExecutor: async input => {
        observedHandles.push(input.parentDirectoryHandle, input.stagingDirectoryHandle);
        return executor(input);
      },
    });
    const result = await prepared.commit();
    const closed = [];
    for (const handle of observedHandles) {
      try {
        await handle.stat();
        closed.push(false);
      } catch (error) {
        closed.push(error?.code === 'EBADF');
      }
    }
    branchResults.push({label, result, closed});
    await rm(roots.workspaceRoot, {recursive: true, force: true});
  }
  const cancelRoots = await makeAtomicRoots('zcq005-cancel');
  const cancelPrepared = await preparePresentationDirectoryAtomicPublishV001({
    workspaceRoot: cancelRoots.workspaceRoot,
    stagingRoot: cancelRoots.stagingRoot,
    outputRoot: cancelRoots.outputRoot,
    verifiedImplementationBindings: await actualImplementationBindings(),
    nativeProcessExecutor: executePresentationAtomicDirectoryNativeHelperV001,
  });
  const cancelled = await cancelPrepared.cancel();
  assert.throws(() => cancelPrepared.commit(), TypeError);
  await rm(cancelRoots.workspaceRoot, {recursive: true, force: true});
  prove(t, PROOFS.ZCQ005[12], {branchResults, cancelled}, {
    branchResults: [
      {label: 'numeric-success', result: {status: 'published'}, closed: [true, true]},
      {label: 'numeric-failure', result: {status: 'failed', reason: 'late-target-exists', toolExitCode: 20}, closed: [true, true]},
      {label: 'signal', result: {status: 'failed', reason: 'helper-execution-failed', toolExitCode: null}, closed: [true, true]},
      {label: 'throw', result: {status: 'failed', reason: 'helper-execution-failed', toolExitCode: null}, closed: [true, true]},
    ],
    cancelled: {status: 'cancelled'},
  });
});

test('ZCQ006 source package bytes and binding provenance are deterministic', async t => {
  const job = await makeActualJob('zcq006-deterministic');
  const observed = await withJob(job, async (jobPath, outputRoot) => {
    const jobBytes = await readFile(jobPath);
    const run = await runCli(jobPath);
    assert.equal(run.code, 0);
    const publishedBytes = await readFile(path.join(outputRoot, 'source-package-v001.json'));
    const published = JSON.parse(publishedBytes.toString('utf8'));
    const meaning = JSON.parse(await readFile(path.join(ROOT, MEANING_PATH), 'utf8'));
    const caseInputs = [{
      caseId: job.caseContexts[0].caseId,
      meaningPackage: meaning,
      resolvedStyle: clone(published.reconstructionMap.caseContexts[0].resolvedStyle),
      layoutContext: {},
    }];
    const input = {
      job,
      sourcePackageJobBinding: clone(published.provenance.sourcePackageJobBinding),
      caseInputs,
    };
    const first = buildPresentationOutputCaptionCueSourcePackageV001(input);
    const second = buildPresentationOutputCaptionCueSourcePackageV001(input);
    assert.equal(first.status, 'passed');
    assert.equal(second.status, 'passed');
    return {jobBytes, publishedBytes, published, first: first.value, second: second.value};
  });
  const firstBytes = formalBytes(observed.first.sourcePackage);
  const secondBytes = formalBytes(observed.second.sourcePackage);
  prove(t, PROOFS.ZCQ006[0], firstBytes.equals(secondBytes), true);
  prove(t, PROOFS.ZCQ006[1], SHA(firstBytes), SHA(secondBytes));
  prove(t, PROOFS.ZCQ006[2], SHA(canonicalBytes(observed.first.sourcePackage)), SHA(canonicalBytes(observed.second.sourcePackage)));
  prove(t, PROOFS.ZCQ006[3], {
    firstBinding: observed.first.sourcePackage.provenance.sourcePackageJobBinding,
    secondBinding: observed.second.sourcePackage.provenance.sourcePackageJobBinding,
    publishedBinding: observed.published.provenance.sourcePackageJobBinding,
    publishedBytesMatch: firstBytes.equals(observed.publishedBytes),
  }, {
    firstBinding: sourceJobBinding(job, observed.jobBytes),
    secondBinding: sourceJobBinding(job, observed.jobBytes),
    publishedBinding: sourceJobBinding(job, observed.jobBytes),
    publishedBytesMatch: true,
  });
  prove(t, PROOFS.ZCQ006[4], {
    stagedByteSha: SHA(observed.publishedBytes),
    formalByteSha: SHA(firstBytes),
    byteEqual: observed.publishedBytes.equals(firstBytes),
  }, {
    stagedByteSha: SHA(firstBytes),
    formalByteSha: SHA(firstBytes),
    byteEqual: true,
  });
});
}
