import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {
  serializePresentationInstructionRendererJobV002,
  validatePresentationInstructionRendererJobV002,
} from './presentation_renderer_admission_receipt_v002.mjs';

const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const canonicalSha = (value: unknown) => sha(Buffer.from(canonicalJson(value), 'utf8'));
const parse = (bytes: Uint8Array) => JSON.parse(Buffer.from(bytes).toString('utf8'));
const formalBinding = (filePath: string, bytes: Uint8Array) => {
  const value = parse(bytes);
  return {
    schemaVersion: value.schemaVersion,
    path: filePath,
    fileSha256: sha(bytes),
    canonicalSha256: canonicalSha(value),
  };
};

export async function buildDistantConnectionRendererTemplateRebindV001(input: {
  workspaceRoot: string;
  templatePath: string;
  baseMediaRoot: string;
  jobId: string;
  publicationRoot: string;
}) {
  const read = (relative: string) => readFile(path.join(input.workspaceRoot, relative));
  const template = parse(await read(input.templatePath));
  if (validatePresentationInstructionRendererJobV002(template).status !== 'passed') {
    throw new Error('template renderer job is invalid');
  }
  const [mediaBytes, timelineBytes, manifestBytes, reportBytes] = await Promise.all([
    read(`${input.baseMediaRoot}/base-media.mp4`), read(`${input.baseMediaRoot}/timeline.json`),
    read(`${input.baseMediaRoot}/generation-manifest.json`),
    read(`${input.baseMediaRoot}/validation-report.json`),
  ]);
  const result = structuredClone(template);
  result.jobId = input.jobId;
  result.attemptId = 'attempt-0001';
  result.cropAppliedBaseMedia = {
    baseMedia: {path: `${input.baseMediaRoot}/base-media.mp4`, fileSha256: sha(mediaBytes)},
    timeline: formalBinding(`${input.baseMediaRoot}/timeline.json`, timelineBytes),
    generationManifest: formalBinding(
      `${input.baseMediaRoot}/generation-manifest.json`, manifestBytes,
    ),
    validationReceipt: formalBinding(
      `${input.baseMediaRoot}/validation-report.json`, reportBytes,
    ),
  };
  result.publication = {
    admissionReceiptPath: `${input.publicationRoot}/admission-receipt-v002.json`,
    lineLayoutPath: `${input.publicationRoot}/line-layout-v002.json`,
    renderOutputRoot: `${input.publicationRoot}/render-output-v001`,
  };
  if (validatePresentationInstructionRendererJobV002(result).status !== 'passed') {
    throw new Error('rebound renderer job is invalid');
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [templatePath, baseMediaRoot, jobId, publicationRoot, outputPath] = process.argv.slice(2);
  void buildDistantConnectionRendererTemplateRebindV001({
    workspaceRoot: process.cwd(), templatePath, baseMediaRoot, jobId, publicationRoot,
  }).then(async value => {
    const bytes = serializePresentationInstructionRendererJobV002(value);
    await mkdir(path.dirname(path.join(process.cwd(), outputPath)), {recursive: true});
    await writeFile(path.join(process.cwd(), outputPath), bytes, {flag: 'wx'});
    process.stdout.write(`${JSON.stringify({path: outputPath, fileSha256: sha(bytes)})}\n`);
  }).catch(error => { process.stderr.write(`${error.stack ?? error}\n`); process.exitCode = 1; });
}
