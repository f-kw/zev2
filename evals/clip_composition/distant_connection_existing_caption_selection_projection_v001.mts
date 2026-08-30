import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  buildDistantConnectionPresentationMeaningInputFromFilesV001,
  serializeDistantConnectionPresentationMeaningInputV001,
} from '../../runner/src/distant-connection-presentation-meaning-input-v001.ts';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {
  buildPresentationCueEndProjectionV001,
} from './presentation_cue_end_projection_v001.mjs';
import {
  validatePresentationOutputCaptionCueSourcePackageV001,
} from './presentation_output_caption_cue_source_package_v001.mjs';

export const JOB_SCHEMA = 'distant-connection-existing-caption-selection-projection-job-v001';
const TASK_DESCRIPTION =
  '各captionの境界片を記載順に一度ずつ全量使用してください。cueは、直前から続く発話がそれだけで意味を読める短いまとまりになり、その末尾で発話の意味が一区切りつくように、cue終端を提示されたboundaryIdから選んでください。cue終端を意味の基準で先に決め、そのcueが一行に収まらない場合だけ行末を提示されたboundaryIdから選んでください。cue終端と行末は、語、固有名詞、反復語、読みとして一続きの文節の途中に置かないでください。必要な行末候補が複数ある場合は、二行の幅が大きく偏らない候補を選んでください。各cueはstyleLimits.maxLinesPerCue以下とし、一行に収まるcueを改行しないでください。最後のcueはcaption最後のboundaryIdで終えてください。本文、境界片、ID、順序を変更しないでください。';
const WIDTH_RULE = 'U+0000..U+00FF=1; other Unicode code point=2';
const SHA = /^[0-9a-f]{64}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const RESPONSIBILITY =
  '本jobは既存動画で実使用された字幕区切りと行末を、正式意味入力の本文・発話順と完全照合して既存selection契約へ無変更投影する。新しい字幕判断、要約、言い換え、候補選択、区間判断を行わない。';

type Ref = {path: string; fileSha256: string};
type Job = {
  schemaVersion: typeof JOB_SCHEMA;
  jobId: string;
  candidateId: string;
  artifactId: string;
  inputs: {
    candidateResponse: Ref;
    semanticUtterance: Ref;
    intervalizationPlan: Ref;
    editPlanProjection: Ref;
    assemblyDecision: Ref;
    baseMediaRoot: string;
    historicalInstruction: Ref;
    historicalLineLayout: Ref;
    styleSourcePackage: Ref;
  };
  outputs: {
    root: string;
    meaningInputPath: string;
    sourcePackagePath: string;
    selectionPath: string;
  };
  implementationBinding: Ref & {role: 'distant-connection-existing-caption-selection-projection-v001'};
  responsibilityPrinciple: typeof RESPONSIBILITY;
};

const isObj = (v: unknown): v is Record<string, any> => v !== null && typeof v === 'object' && !Array.isArray(v);
const formalBytes = (v: unknown) => Buffer.from(`${JSON.stringify(v, null, 2)}\n`, 'utf8');
const sha = (v: Uint8Array) => createHash('sha256').update(v).digest('hex');
const canonicalSha = (v: unknown) => sha(Buffer.from(canonicalJson(v), 'utf8'));
const fail = (message: string): never => { throw new Error(`DISTANT_CONNECTION_EXISTING_SELECTION_V001: ${message}`); };
const parse = (bytes: Uint8Array, label: string) => {
  try {
    const value = JSON.parse(Buffer.from(bytes).toString('utf8'));
    if (!isObj(value)) fail(`${label}のrootがobjectではありません`);
    return value;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('DISTANT_CONNECTION_')) throw error;
    return fail(`${label}がJSONではありません`);
  }
};
const binding = (schemaVersion: string, filePath: string, value: unknown) => ({
  schemaVersion, path: filePath, fileSha256: sha(formalBytes(value)), canonicalSha256: canonicalSha(value),
});
const byteRef = async (root: string, ref: Ref, label: string) => {
  const bytes = await readFile(path.join(root, ref.path));
  if (!SHA.test(ref.fileSha256) || sha(bytes) !== ref.fileSha256) fail(`${label} SHAが一致しません`);
  return bytes;
};

export function assertJob(value: unknown): asserts value is Job {
  if (!isObj(value) || JSON.stringify(Object.keys(value)) !== JSON.stringify([
    'schemaVersion', 'jobId', 'candidateId', 'artifactId', 'inputs', 'outputs',
    'implementationBinding', 'responsibilityPrinciple',
  ]) || value.schemaVersion !== JOB_SCHEMA || !ID.test(value.jobId)
    || !ID.test(value.candidateId) || !ID.test(value.artifactId)
    || value.responsibilityPrinciple !== RESPONSIBILITY || !isObj(value.inputs)
    || !isObj(value.outputs) || !isObj(value.implementationBinding)
    || value.implementationBinding.role !== 'distant-connection-existing-caption-selection-projection-v001') {
    fail('job rootが不正です');
  }
  const refs = [
    value.inputs.candidateResponse, value.inputs.semanticUtterance,
    value.inputs.intervalizationPlan, value.inputs.editPlanProjection,
    value.inputs.assemblyDecision, value.inputs.historicalInstruction,
    value.inputs.historicalLineLayout, value.inputs.styleSourcePackage,
    value.implementationBinding,
  ];
  if (refs.some(ref => !isObj(ref) || typeof ref.path !== 'string' || !SHA.test(ref.fileSha256))) {
    fail('job bindingが不正です');
  }
  const outputKeys = ['root', 'meaningInputPath', 'sourcePackagePath', 'selectionPath'];
  if (JSON.stringify(Object.keys(value.outputs)) !== JSON.stringify(outputKeys)
    || outputKeys.some(key => typeof value.outputs[key] !== 'string')
    || !value.outputs.meaningInputPath.startsWith(`${value.outputs.root}/`)
    || !value.outputs.sourcePackagePath.startsWith(`${value.outputs.root}/`)
    || !value.outputs.selectionPath.startsWith(`${value.outputs.root}/`)) fail('output pathが不正です');
}

export async function buildFromJob(workspaceRoot: string, jobPath: string) {
  const jobBytes = await readFile(path.join(workspaceRoot, jobPath));
  const job = parse(jobBytes, 'job');
  assertJob(job);
  if (!formalBytes(job).equals(jobBytes)) fail('jobがformal byteではありません');
  if (sha(await readFile(path.join(workspaceRoot, job.implementationBinding.path)))
    !== job.implementationBinding.fileSha256) fail('implementation SHAが一致しません');

  const [candidateBytes, semanticBytes, planBytes, projectionBytes, assemblyBytes,
    instructionBytes, layoutBytes, styleBytes] = await Promise.all([
    byteRef(workspaceRoot, job.inputs.candidateResponse, '正式候補'),
    byteRef(workspaceRoot, job.inputs.semanticUtterance, '正式意味発話'),
    byteRef(workspaceRoot, job.inputs.intervalizationPlan, '一般区間化計画'),
    byteRef(workspaceRoot, job.inputs.editPlanProjection, 'edit plan projection'),
    byteRef(workspaceRoot, job.inputs.assemblyDecision, '組立決定'),
    byteRef(workspaceRoot, job.inputs.historicalInstruction, '既存字幕instruction'),
    byteRef(workspaceRoot, job.inputs.historicalLineLayout, '既存行layout'),
    byteRef(workspaceRoot, job.inputs.styleSourcePackage, '既存style source package'),
  ]);
  const meaning = await buildDistantConnectionPresentationMeaningInputFromFilesV001({
    workspaceRoot, artifactId: job.artifactId, candidateId: job.candidateId,
    candidateResponsePath: job.inputs.candidateResponse.path, candidateResponseBytes: candidateBytes,
    expectedCandidateResponseSha256: job.inputs.candidateResponse.fileSha256,
    semanticUtterancePath: job.inputs.semanticUtterance.path, semanticUtteranceBytes: semanticBytes,
    expectedSemanticUtteranceSha256: job.inputs.semanticUtterance.fileSha256,
    intervalizationPlanPath: job.inputs.intervalizationPlan.path, intervalizationPlanBytes: planBytes,
    expectedIntervalizationPlanSha256: job.inputs.intervalizationPlan.fileSha256,
    editPlanProjectionPath: job.inputs.editPlanProjection.path, editPlanProjectionBytes: projectionBytes,
    expectedEditPlanProjectionSha256: job.inputs.editPlanProjection.fileSha256,
    assemblyDecisionPath: job.inputs.assemblyDecision.path, assemblyDecisionBytes: assemblyBytes,
    expectedAssemblyDecisionSha256: job.inputs.assemblyDecision.fileSha256,
  });
  const instruction = parse(instructionBytes, '既存字幕instruction');
  const lineLayout = parse(layoutBytes, '既存行layout');
  const styleSource = parse(styleBytes, '既存style source package');
  if (instruction.schemaVersion !== 'distant-connection-video-prototype-instruction-v001'
    || !Array.isArray(instruction.instructions) || instruction.instructions.length < 1
    || lineLayout.schemaVersion !== 'distant-connection-video-prototype-line-layout-v001'
    || !Array.isArray(lineLayout.entries)
    || lineLayout.entries.length !== instruction.instructions.length) fail('既存字幕成果物の形が不正です');

  const atoms = meaning.atomOccurrences;
  const atomIndexBySemantic = new Map(atoms.map((atom: any, index: number) => [atom.semanticUtteranceId, index]));
  const used: string[] = [];
  const cueEnds: number[] = [];
  const lineEnds: number[][] = [];
  for (const [index, item] of instruction.instructions.entries()) {
    const ids = item?.targetProvenance?.atomOccurrenceIds;
    const layout = lineLayout.entries[index];
    if (!Array.isArray(ids) || ids.length < 1 || layout?.instructionId !== item.instructionId
      || !Array.isArray(layout.lines) || layout.lines.length < 1) fail('既存字幕と行layoutの対応が不正です');
    const indexes = ids.map((id: string) => atomIndexBySemantic.get(id));
    if (indexes.some((value: unknown) => typeof value !== 'number')) fail('既存字幕に未知の正式発話IDがあります');
    if (indexes.some((value: number, offset: number) => offset > 0 && value !== indexes[offset - 1] + 1)) {
      fail('既存字幕の正式発話順が連続していません');
    }
    const selected = indexes.map((value: number) => atoms[value]);
    if (selected.map((atom: any) => atom.text).join('') !== item?.content?.text) fail('既存字幕本文が正式意味入力と一致しません');
    const layoutIds = layout.lines.flatMap((line: any) => line.sourceUnitIds);
    if (JSON.stringify(layoutIds) !== JSON.stringify(ids)
      || layout.lines.some((line: any) => line.sourceUnitIds.map((id: string) => atoms[atomIndexBySemantic.get(id)!].text).join('') !== line.text)) {
      fail('既存行末が既存字幕本文と一致しません');
    }
    used.push(...ids);
    cueEnds.push(indexes.at(-1)!);
    lineEnds.push(layout.lines.map((line: any) => atomIndexBySemantic.get(line.sourceUnitIds.at(-1))!));
  }
  if (JSON.stringify(used) !== JSON.stringify(atoms.map((atom: any) => atom.semanticUtteranceId))) {
    fail('既存字幕が正式意味入力を時系列順に完全被覆していません');
  }

  const captionId = `${job.candidateId}-input-caption`;
  const boundaries = atoms.map((atom: any, index: number) => ({
    boundaryId: `${captionId}-boundary-${String(index + 1).padStart(6, '0')}`,
    ordinal: index + 1,
    afterAtomOccurrenceId: atom.atomOccurrenceId,
  }));
  const readFormal = async (relative: string) => {
    const bytes = await readFile(path.join(workspaceRoot, relative));
    const value = parse(bytes, relative);
    if (!formalBytes(value).equals(bytes)) fail(`${relative}がformal byteではありません`);
    return {value, binding: binding(value.schemaVersion, relative, value)};
  };
  const base = await Promise.all([
    readFile(path.join(workspaceRoot, job.inputs.baseMediaRoot, 'base-media.mp4')),
    readFormal(`${job.inputs.baseMediaRoot}/timeline.json`),
    readFormal(`${job.inputs.baseMediaRoot}/generation-manifest.json`),
    readFormal(`${job.inputs.baseMediaRoot}/validation-report.json`),
  ]);
  const meaningBinding = binding(meaning.schemaVersion, job.outputs.meaningInputPath, meaning);
  const jobBinding = binding(job.schemaVersion, jobPath, job);
  const style = styleSource.reconstructionMap?.caseContexts?.[0];
  if (!isObj(style)) fail('style contextを解決できません');
  const sourcePackage = {
    schemaVersion: 'presentation-output-caption-cue-source-package-v001',
    packageId: `${job.jobId}-source-package-v001`,
    promptInput: {
      schemaVersion: 'presentation-zevo-caption-selection-input-v001',
      taskDescription: TASK_DESCRIPTION,
      captions: [{captionId, boundaryCandidates: atoms.map((atom: any, index: number) => ({
        boundaryId: boundaries[index].boundaryId, text: atom.text,
      }))}],
      styleLimits: {maxLogicalWidthPerLine: 36, maxLinesPerCue: 2, characterWidthRule: WIDTH_RULE},
    },
    reconstructionMap: {
      meaningPackageBindings: [meaningBinding],
      captions: [{
        captionId, meaningPackageOrdinal: 1, semanticCaptionId: meaning.captions[0].captionId,
        atomOccurrenceIds: [...meaning.captions[0].atomOccurrenceIds], boundaries,
      }],
      caseContexts: [{
        caseId: job.candidateId, inputCaptionId: captionId, meaningPackageBinding: meaningBinding,
        baseMediaInput: {
          baseMedia: {path: `${job.inputs.baseMediaRoot}/base-media.mp4`, fileSha256: sha(base[0])},
          timeline: base[1].binding, generationManifest: base[2].binding,
          validationReceipt: base[3].binding,
        },
        horizontalStyleInput: style.horizontalStyleInput,
        styleBindings: style.styleBindings,
        resolvedStyle: style.resolvedStyle,
      }],
    },
    provenance: {
      sourcePackageJobBinding: jobBinding,
      implementationBindings: [job.implementationBinding],
      approvedContractBindings: [
        meaningBinding,
        binding(instruction.schemaVersion, job.inputs.historicalInstruction.path, instruction),
        binding(lineLayout.schemaVersion, job.inputs.historicalLineLayout.path, lineLayout),
      ],
    },
  };
  if (validatePresentationOutputCaptionCueSourcePackageV001(sourcePackage).status !== 'passed') {
    fail('source packageが既存contractを通りません');
  }
  const sourceBinding = binding(sourcePackage.schemaVersion, job.outputs.sourcePackagePath, sourcePackage);
  const selection = {
    schemaVersion: 'presentation-output-caption-cue-selection-v001',
    selectionId: `${job.jobId}-selection-v001`,
    sourcePackageBinding: sourceBinding,
    response: {captions: [{captionId, cues: cueEnds.map((end, index) => ({
      cueEndBoundaryId: boundaries[end].boundaryId,
      lineEndBoundaryIds: lineEnds[index].map(lineEnd => boundaries[lineEnd].boundaryId),
    }))}]},
  };
  const digest = {
    schemaVersion: selection.schemaVersion, artifactId: selection.selectionId,
    fileSha256: sha(formalBytes(selection)), canonicalSha256: canonicalSha(selection),
  };
  const projection = buildPresentationCueEndProjectionV001({
    projectionId: `${job.jobId}-validation-projection-v001`, sourcePackageBinding: sourceBinding,
    sourceSelectionDigest: digest, producerJobBinding: jobBinding, sourcePackage, selection,
  });
  if (projection.status !== 'built') fail('selectionが既存projection contractを通りません');
  return {job, meaning, sourcePackage, selection};
}

export async function materialize(workspaceRoot: string, jobPath: string) {
  const built = await buildFromJob(workspaceRoot, jobPath);
  await mkdir(path.join(workspaceRoot, built.job.outputs.root), {recursive: true});
  const entries: [string, Uint8Array][] = [
    [built.job.outputs.meaningInputPath, serializeDistantConnectionPresentationMeaningInputV001(built.meaning)],
    [built.job.outputs.sourcePackagePath, formalBytes(built.sourcePackage)],
    [built.job.outputs.selectionPath, formalBytes(built.selection)],
  ];
  for (const [relative, bytes] of entries) await writeFile(path.join(workspaceRoot, relative), bytes, {flag: 'wx'});
  return entries.map(([relative, bytes]) => ({path: relative, fileSha256: sha(bytes)}));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void materialize(process.cwd(), process.argv[2] ?? '').then(value => {
    process.stdout.write(`${JSON.stringify(value)}\n`);
  }).catch(error => { process.stderr.write(`${error.stack ?? error}\n`); process.exitCode = 1; });
}
