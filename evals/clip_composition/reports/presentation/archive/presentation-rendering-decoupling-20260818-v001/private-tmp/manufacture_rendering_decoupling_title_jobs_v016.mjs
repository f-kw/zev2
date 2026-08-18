import {createHash} from 'node:crypto';
import {mkdir, readFile, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {
  validateZevoTitleOutputJobV001,
} from '/Users/kawafmm/workspace/zev2/evals/clip_composition/presentation_output_title_compositor_v001.mjs';

const root = '/Users/kawafmm/workspace/zev2';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const formalBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');

for (const kind of ['landscape', 'vertical']) {
  const oldId = `qdczJpv8RCc-candidate-59-c-title-${kind}-decoupled-v015`;
  const newId = `qdczJpv8RCc-candidate-59-c-title-${kind}-decoupled-v017`;
  const sourcePath = path.join(
    root,
    'evals/clip_composition/outputs/presentation/title-output-jobs',
    oldId,
    'formal-title-output-job.json',
  );
  const destinationDirectory = path.join(
    root,
    'evals/clip_composition/outputs/presentation/title-output-jobs',
    newId,
  );
  const destinationPath = path.join(destinationDirectory, 'formal-title-output-job.json');
  const job = JSON.parse(await readFile(sourcePath, 'utf8'));
  job.jobId = newId;
  job.outputId = `${newId}-output`;
  job.publication.outputRoot = `evals/clip_composition/outputs/presentation/title-output-renders/${job.outputId}`;
  job.implementationBindings = await Promise.all(job.implementationBindings.map(async binding => {
    const bytes = await readFile(path.join(root, binding.path));
    return {...binding, fileSha256: sha256(bytes)};
  }));
  if (!validateZevoTitleOutputJobV001(job)) throw new Error(`${kind}: manufactured job invalid`);
  for (const item of [destinationDirectory, path.join(root, job.publication.outputRoot)]) {
    try {
      await stat(item);
      throw new Error(`${kind}: destination already exists: ${item}`);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  await mkdir(destinationDirectory, {recursive: false});
  const bytes = formalBytes(job);
  await writeFile(destinationPath, bytes, {flag: 'wx', mode: 0o444});
  process.stdout.write(`${kind}\t${path.relative(root, destinationPath)}\t${sha256(bytes)}\n`);
}
