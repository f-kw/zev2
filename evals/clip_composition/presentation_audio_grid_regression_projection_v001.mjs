import {createHash} from 'node:crypto';
import {lstat, open, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';

export const PRESENTATION_AUDIO_GRID_REGRESSION_PROJECTION_SCHEMA_VERSION =
  'presentation-audio-grid-regression-projection-v001';

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const OUTPUT_ROOT = path.join(
  MODULE_DIRECTORY,
  'outputs/presentation/20260722-audio-grid-regression-projection-v001',
);
const FIXED_OUTPUT_FILE_BY_SUITE_AND_ROLE = Object.freeze({
  'presentation-base-media-audio-normal-cases-v001:before-fix': 'before-builder.json',
  'presentation-base-media-audio-normal-cases-v001:after-fix': 'after-builder.json',
  'presentation-builder-renderer-audio-integration-v001:before-fix': 'before-integration.json',
  'presentation-builder-renderer-audio-integration-v001:after-fix': 'after-integration.json',
  'presentation-builder-renderer-audio-integration-v002:before-fix': 'before-integration-v002.json',
  'presentation-builder-renderer-audio-integration-v002:after-fix': 'after-integration-v002.json',
});

const sha256Bytes = (value) => createHash('sha256').update(value).digest('hex');
const fileSha256 = async (filePath) => sha256Bytes(await readFile(filePath));

const assertNoSymlinkParent = async (targetPath) => {
  const relative = path.relative(WORKSPACE_ROOT, targetPath);
  if (relative === '' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('projection output escapes workspace');
  }
  const parts = relative.split(path.sep);
  let cursor = WORKSPACE_ROOT;
  for (let index = 0; index < parts.length - 1; index += 1) {
    cursor = path.join(cursor, parts[index]);
    const info = await lstat(cursor);
    if (info.isSymbolicLink()) throw new Error(`projection output has symlink parent: ${cursor}`);
  }
};

const writeNewFixedProjection = async ({outputPath, suiteId, role, bytes}) => {
  const fileName = FIXED_OUTPUT_FILE_BY_SUITE_AND_ROLE[`${suiteId}:${role}`];
  if (!fileName) throw new Error(`projection suite/role is not registered: ${suiteId}:${role}`);
  const expectedPath = path.join(OUTPUT_ROOT, fileName);
  if (path.resolve(outputPath) !== expectedPath) {
    throw new Error(`projection output must be ${path.relative(WORKSPACE_ROOT, expectedPath)}`);
  }
  await assertNoSymlinkParent(expectedPath);
  const handle = await open(expectedPath, 'wx');
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
};

const normalizeCheck = (check) => ({
  status: check?.status ?? null,
  violationCodes: [...(check?.violationCodes ?? [])],
});

export const capturePresentationBaseMediaProjectionCaseV001 = async ({
  caseId,
  outputDirectory,
}) => {
  const [manifestBytes, timelineBytes, reportBytes] = await Promise.all([
    readFile(`${outputDirectory}/generation-manifest.json`),
    readFile(`${outputDirectory}/timeline.json`),
    readFile(`${outputDirectory}/validation-report.json`),
  ]);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const timeline = JSON.parse(timelineBytes.toString('utf8'));
  const report = JSON.parse(reportBytes.toString('utf8'));
  return {
    caseId,
    sourceFileSha256: manifest.source.fileSha256,
    assemblyDecisionPayloadSha256: manifest.assemblyDecision.payloadSha256,
    baseMediaFileSha256: await fileSha256(`${outputDirectory}/base-media.mp4`),
    timelineFileSha256: sha256Bytes(timelineBytes),
    timeline: {
      schemaVersion: timeline.schemaVersion,
      sourceFrameClock: timeline.sourceFrameClock,
      presentationClock: timeline.presentationClock,
      segments: timeline.segments,
      baseMedia: timeline.baseMedia,
    },
    segments: manifest.segments,
    audio: manifest.audio.present === false ? {present: false} : {
      present: true,
      sampleRate: manifest.audio.sampleRate,
      channels: manifest.audio.channels,
      channelLayout: manifest.audio.channelLayout,
      channelOrder: manifest.audio.channelOrder,
      canonicalPcmFormat: manifest.audio.canonicalPcmFormat,
      insertedSilenceSpans: manifest.audio.insertedSilenceSpans,
      sourceGrid: manifest.audio.sourceGrid,
      encodeInput: manifest.audio.encodeInput,
      encoded: manifest.audio.encoded,
    },
    output: {
      frameCount: manifest.outputs.baseMedia.frameCount,
      audioPacketPayloadSha256: manifest.outputs.baseMedia.audioPacketPayloadSha256,
    },
    validation: {
      status: report.status,
      checks: Object.fromEntries(Object.entries(report.checks).map(([key, value]) => [
        key,
        normalizeCheck(value),
      ])),
    },
  };
};

export const capturePresentationRendererProjectionV001 = async ({
  caseId,
  baseOutputDirectory,
  renderOutputDirectory,
  outputNames,
  plan,
  qc,
}) => ({
  caseId,
  baseMedia: await capturePresentationBaseMediaProjectionCaseV001({
    caseId: `${caseId}:base-media`,
    outputDirectory: baseOutputDirectory,
  }),
  renderedMediaFileSha256: await fileSha256(
    `${renderOutputDirectory}/${outputNames.video}`,
  ),
  renderPlan: {
    schemaVersion: plan.schemaVersion,
    timelineSchemaVersion: plan.timelineSchemaVersion,
    frameRate: plan.frameRate,
    frameCount: plan.frameCount,
    elements: plan.elements,
  },
  renderQc: {
    schemaVersion: qc.schemaVersion,
    status: qc.status,
    violationCodes: [...(qc.violationCodes ?? [])],
    checks: qc.checks ?? null,
  },
});

export const writePresentationAudioGridRegressionProjectionV001 = async ({
  outputPath,
  suiteId,
  role,
  gitHead,
  builderPath,
  harnessPaths,
  tools,
  cases,
}) => {
  const artifact = {
    schemaVersion: PRESENTATION_AUDIO_GRID_REGRESSION_PROJECTION_SCHEMA_VERSION,
    suiteId,
    role,
    capturedFrom: {
      gitHead,
      builderFileSha256: await fileSha256(builderPath),
      harnessFiles: await Promise.all(harnessPaths.map(async (filePath) => ({
        path: path.relative(WORKSPACE_ROOT, filePath),
        fileSha256: await fileSha256(filePath),
      }))),
      tools,
    },
    cases: [...cases].sort((left, right) => left.caseId.localeCompare(right.caseId)),
  };
  const bytes = Buffer.from(`${JSON.stringify(artifact, null, 2)}\n`);
  await writeNewFixedProjection({outputPath, suiteId, role, bytes});
  return {
    artifact,
    fileSha256: sha256Bytes(bytes),
    canonicalSha256: sha256Bytes(canonicalJson(artifact)),
  };
};
