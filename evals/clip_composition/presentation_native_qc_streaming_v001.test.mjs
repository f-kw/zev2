import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {copyFile, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, stat, unlink, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {buildPresentationNativeLayerPlanV001, buildPresentationNativeLayerDecodeArgumentsV001,
  buildPresentationNativeReferenceArgumentsV001} from './presentation_native_frame_qc_v001.mjs';
import {processPresentationNativeSampleV001, revalidatePresentationNativeSampleV001,
  verifyPresentationNativeSampleReceiptsV001, hashPresentationNativeFileV001,
  createPresentationNativePublicationBindingV001, PRESENTATION_NATIVE_STREAM_EXECUTION_V001} from './presentation_native_qc_streaming_v001.mjs';
import {readPresentationQcEvidenceV001, writePresentationQcEvidenceV001} from './presentation_qc_evidence_store_v001.mjs';

const exec = promisify(execFile), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const moduleUrl = new URL('./presentation_native_qc_streaming_v001.mjs', import.meta.url).href;
const run = async (command, args) => {
  const {stdout, stderr} = await exec(command, args, {encoding: 'buffer', maxBuffer: 4 * 1024 * 1024});
  return {code: 0, signal: null, stdout, stderr};
};
const temporary = async fn => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zev-native-stream-test-'));
  try {await fn(root);} finally {await rm(root, {recursive: true});}
};
const ref = async pathname => ({path: pathname, fileSha256: await hashPresentationNativeFileV001(pathname)});
const readJson = async pathname => JSON.parse(await readFile(pathname, 'utf8'));
const observation = sample => ({frame: sample.frame, instructionId: sample.instructionId,
  completedRgbSha256: sample.completedRgbSha256, classes: sample.classes, visible: sample.visible,
  expectedClassId: sample.expectedClassId, omittedClassId: sample.omittedClassId,
  references: sample.references.map(({rgbPath: _rgbPath, ...row}) => row)});

// Only 8 x 8 PNGs and native planar/RGB reference files are generated. There is
// no final video, encode, subtitle rendering, model call or external material.
async function fixture(root, {passing = true, publishing = false} = {}) {
  const input = path.join(root, 'input'); await mkdir(input);
  const ffmpegPath = await realpath('/opt/homebrew/bin/ffmpeg');
  const magickPath = await realpath('/opt/homebrew/bin/magick');
  const tools = {ffmpeg: await ref(ffmpegPath), imageMagick: await ref(magickPath)};
  const stagingDirectory = path.join(root, 'work', 'publish');
  if (publishing) await mkdir(path.join(stagingDirectory, 'overlays'), {recursive: true});
  const base = path.join(input, 'base.png'), png = publishing ? path.join(stagingDirectory, 'overlays', 'caption.png') : path.join(input, 'caption.png');
  await run(magickPath, ['-size', '8x8', 'xc:#101010', base]);
  await run(magickPath, ['-size', '8x8', 'xc:none', '-fill', '#ffffff80', '-draw', 'rectangle 2,2 5,5', png]);
  const pngRef = await ref(png);
  const sceneBindings = [{instructionId: 'caption-000103',
    states: [{bindingId: 'caption-state', pngPath: png, pngSha256: pngRef.fileSha256}], alternates: []}];
  const layer = {bindingId: 'caption-state', localFrame: 3, displayFrameCount: 10};
  const sample = {instructionId: 'caption-000103', frame: 4, mediaFrame: 4, expectedState: 'native-static',
    expectedOverlaySha256: pngRef.fileSha256, crop: {left: 0, top: 0, width: 8, height: 8},
    baseFrame: await ref(base), completedFrame: null,
    references: [{id: 'expected', kind: 'expected', layers: [layer]}, {id: 'omitted', kind: 'omitted', layers: []},
      {id: 'equivalent', kind: 'equivalent', layers: [structuredClone(layer)]},
      {id: 'duplicate', kind: 'duplicate', layers: [structuredClone(layer), structuredClone(layer)]}]};
  const layerDirectory = path.join(input, 'layers'); await mkdir(layerDirectory);
  const nativeLayers = buildPresentationNativeLayerPlanV001({samples: [sample], sceneBindings,
    directory: layerDirectory, canvas: {width: 8, height: 8}});
  await run(ffmpegPath, buildPresentationNativeLayerDecodeArgumentsV001(nativeLayers.layers));
  const preparedArtifacts = await Promise.all(nativeLayers.layers.map(row => ref(row.decodedPath)));
  const completed = path.join(input, 'completed.png');
  if (passing) {
    const expected = path.join(input, 'expected.rgb');
    await run(ffmpegPath, buildPresentationNativeReferenceArgumentsV001({
      sample: {...sample, references: [sample.references[0]]}, sceneBindings, nativeLayers,
      baseFramePath: base, outputPaths: [expected]}));
    await run(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-f', 'rawvideo',
      '-pixel_format', 'rgb24', '-video_size', '8x8', '-i', expected, '-frames:v', '1',
      '-c:v', 'png', '-pix_fmt', 'rgb24', completed]);
  } else await copyFile(base, completed);
  sample.completedFrame = await ref(completed);
  return {sample, sceneBindings, nativeLayers, tools, preparedArtifacts, stagingDirectory};
}

async function publishFixture(root, input, result) {
  // Only the publication mechanics are represented by these synthetic media
  // bytes. The PNG, planar inputs, sample RGBs and proof are actual tool output.
  const media = path.join(input.stagingDirectory, 'presentation-rendered-v002.mp4');
  await writeFile(media, 'SYNTHETIC STORAGE FIXTURE, NOT VIDEO');
  const completed = {...await ref(media), role: 'completed-media'};
  const finiteState = {executionMethod: PRESENTATION_NATIVE_STREAM_EXECUTION_V001,
    inputManifest: {inputRefs: [completed, {...await ref(input.sceneBindings[0].states[0].pngPath), role: 'png-caption-state'}]},
    sceneBindings: input.sceneBindings, nativeLayers: input.nativeLayers, samples: [result.sample]};
  const publication = {status: 'published', outputDirectory: path.join(root, 'published')};
  await rename(input.stagingDirectory, publication.outputDirectory);
  const candidateVideo = {...await ref(path.join(publication.outputDirectory, path.basename(media))), bytes: (await stat(path.join(publication.outputDirectory, path.basename(media)))).size};
  const binding = await createPresentationNativePublicationBindingV001({finiteState, stagingDirectory: input.stagingDirectory,
    publication, candidateVideo});
  return {binding, finiteState, publication, candidateVideo};
}

test('published PNGs use an explicit rename binding; another process rereads and regenerates released pass and retained failure', async () => temporary(async root => {
  for (const passing of [true, false]) {
    const directory = path.join(root, String(passing)); await mkdir(directory);
    const input = await fixture(directory, {passing, publishing: true});
    const baseline = await processPresentationNativeSampleV001({...input, directory: path.join(directory, 'baseline')});
    const result = await processPresentationNativeSampleV001({...input, directory: path.join(directory, 'sample'),
      retention: 'verified-pass-regenerable-v001'});
    assert.equal(result.sample.referenceRetention.state, passing ? 'released-verified-pass' : 'retained');
    const originalProof = await readFile(result.sample.referenceRetention.checkpoint.path);
    const publication = await publishFixture(directory, input, result);
    await assert.rejects(verifyPresentationNativeSampleReceiptsV001({samples: [result.sample]}), /ENOENT/);
    const contextPath = path.join(directory, 'published-context.json'), resultPath = path.join(directory, 'regeneration.json');
    await writeFile(contextPath, JSON.stringify(publication), {flag: 'wx'});
    await exec(process.execPath, ['--input-type=module', '-e', `
      import {readFile,writeFile} from 'node:fs/promises';
      import {verifyPresentationNativeSampleReceiptsV001,revalidatePresentationNativeSampleV001} from ${JSON.stringify(moduleUrl)};
      const publication=JSON.parse(await readFile(process.argv[1],'utf8'));
      const sample=publication.finiteState.samples[0];
      const receipt=await verifyPresentationNativeSampleReceiptsV001({samples:[sample],publication});
      const result=await revalidatePresentationNativeSampleV001({sample,publication,directory:process.argv[2]});
      await writeFile(process.argv[3],JSON.stringify({receipt,result}),{flag:'wx'});
    `, contextPath, path.join(directory, 'regenerated'), resultPath], {maxBuffer: 1024 * 1024});
    const regenerated = await readJson(resultPath);
    assert.equal(regenerated.receipt.status, 'passed');
    assert.deepEqual(observation(regenerated.result.sample), observation(result.sample));
    assert.deepEqual(regenerated.result.publicationRevalidation.sourceCheckpoint, result.sample.referenceRetention.checkpoint);
    assert.match(regenerated.result.publicationRevalidation.publicationBindingSha256, /^[a-f0-9]{64}$/);
    for (const [index, row] of regenerated.result.sample.references.entries())
      assert.deepEqual(await readFile(row.rgbPath), await readFile(baseline.sample.references[index].rgbPath));
    assert.deepEqual(await readFile(result.sample.referenceRetention.checkpoint.path), originalProof);
  }
}));

test('published mappings reject omissions, duplicates, foreign roots/identities and replaced or missing files', async () => temporary(async root => {
  const input = await fixture(root, {publishing: true});
  const result = await processPresentationNativeSampleV001({...input, directory: path.join(root, 'sample'), retention: 'verified-pass-regenerable-v001'});
  const publication = await publishFixture(root, input, result);
  for (const mutate of [
    p => {p.binding.files.pop();}, p => {p.binding.files.push(p.binding.files[0]);},
    p => {p.binding.files[1].publishedPath += '.other';}, p => {p.binding.files[1].sourcePath += '.other';},
    p => {p.binding.files[1].captionBindings[0].instructionId = 'caption-other';},
    p => {p.binding.files[1].fileSha256 = '0'.repeat(64);},
    p => {p.binding.outputDirectory = path.dirname(p.binding.outputDirectory);},
    p => {p.binding.stagingDirectory = path.dirname(p.binding.stagingDirectory);},
    p => {p.binding.files[1].publishedPath = path.join(p.binding.outputDirectory, '..', 'foreign.png');},
    p => {p.candidateVideo.path += '.other';}, p => {p.binding.schemaVersion = 'unknown';},
  ]) {
    const forged = structuredClone(publication); mutate(forged);
    await assert.rejects(verifyPresentationNativeSampleReceiptsV001({samples: [result.sample], publication: forged}),
      /published|publication/);
  }
  const png = publication.binding.files.find(row => row.captionBindings.length).publishedPath, bytes = await readFile(png);
  await copyFile(input.sample.baseFrame.path, png);
  await assert.rejects(verifyPresentationNativeSampleReceiptsV001({samples: [result.sample], publication}), /SHA mismatch/);
  await writeFile(png, bytes); await rename(png, png + '.hidden');
  try {await assert.rejects(revalidatePresentationNativeSampleV001({sample: result.sample, publication,
    directory: path.join(root, 'must-not-start'), run: async () => assert.fail('missing publication must not run tools')}), /ENOENT/);}
  finally {await rename(png + '.hidden', png);}
  assert.equal((await verifyPresentationNativeSampleReceiptsV001({samples: [result.sample], publication})).status, 'passed');
}));

test('retained and released passing samples keep every candidate, then a separate Node regenerates byte-identical evidence', async () => temporary(async root => {
  const input = await fixture(root);
  const retained = await processPresentationNativeSampleV001({...input, directory: path.join(root, 'retained'), batchSize: 1});
  assert.equal(retained.sample.visible, true);
  assert.equal(retained.sample.referenceRetention.state, 'retained');
  assert.equal(retained.sample.references.length, 4);
  assert.equal(retained.metrics.logicalReferenceCount, 4);
  assert.equal(retained.metrics.referenceRgbOutputs, 3);
  assert.equal(retained.metrics.reusedReferenceRgbCount, 1);
  assert.equal(retained.processes.filter(row => row.purpose === 'native-reference-composite').length, 3);
  const released = await processPresentationNativeSampleV001({...input, directory: path.join(root, 'released'),
    retention: 'verified-pass-regenerable-v001', baselineSample: retained.sample});
  assert.deepEqual(observation(released.sample), observation(retained.sample));
  assert.equal(released.sample.referenceRetention.state, 'released-verified-pass');
  assert.equal(released.metrics.retainedReferenceBytes, 0);
  assert.equal(released.sample.referenceRetention.artifacts.length, 3);
  for (const artifact of released.sample.referenceRetention.artifacts) await assert.rejects(stat(artifact.path), {code: 'ENOENT'});
  for (const artifact of retained.sample.referenceRetention.artifacts) assert.equal((await stat(artifact.path)).size, 8 * 8 * 3);
  const checkpoint = released.sample.referenceRetention.checkpoint;
  const proof = await readPresentationQcEvidenceV001(checkpoint.path, {expectedFileSha256: checkpoint.fileSha256});
  assert.deepEqual(proof.sample.classes, retained.sample.classes);
  assert.equal(await hashPresentationNativeFileV001(released.sample.completedRgb.path), released.sample.completedRgbSha256);
  const sampleFile = path.join(root, 'released-sample.json'), resultFile = path.join(root, 'regenerated-result.json');
  await writeFile(sampleFile, JSON.stringify(released.sample), {flag: 'wx'});
  await exec(process.execPath, ['--input-type=module', '-e', `
    import {readFile, writeFile} from 'node:fs/promises';
    import {revalidatePresentationNativeSampleV001} from ${JSON.stringify(moduleUrl)};
    const sample = JSON.parse(await readFile(process.argv[1], 'utf8'));
    const result = await revalidatePresentationNativeSampleV001({sample, directory: process.argv[2]});
    await writeFile(process.argv[3], JSON.stringify(result), {flag: 'wx'});
  `, sampleFile, path.join(root, 'regenerated'), resultFile], {maxBuffer: 1024 * 1024});
  const regenerated = await readJson(resultFile);
  assert.deepEqual(observation(regenerated.sample), observation(retained.sample));
  assert.equal(regenerated.sample.referenceRetention.state, 'retained');
  for (const [index, row] of regenerated.sample.references.entries())
    assert.deepEqual(await readFile(row.rgbPath), await readFile(retained.sample.references[index].rgbPath));
  assert.equal(released.processes.filter(row => row.purpose === 'native-reference-composite').length, 1);
}));

test('a failed sample retains all references even when passing-sample release is requested', async () => temporary(async root => {
  const input = await fixture(root, {passing: false});
  const result = await processPresentationNativeSampleV001({...input, directory: path.join(root, 'failed'),
    retention: 'verified-pass-regenerable-v001'});
  assert.equal(result.sample.visible, false);
  assert.equal(result.sample.referenceRetention.state, 'retained');
  assert.equal(result.metrics.retainedReferenceBytes, 3 * 8 * 8 * 3);
  for (const artifact of result.sample.referenceRetention.artifacts)
    assert.equal(await hashPresentationNativeFileV001(artifact.path), artifact.fileSha256);
  const regenerated = await revalidatePresentationNativeSampleV001({sample: result.sample, directory: path.join(root, 'failed-revalidation')});
  assert.deepEqual(observation(regenerated.sample), observation(result.sample));
  assert.equal(regenerated.sample.visible, false);
}));

test('unknown state, modified observation, changed or missing checkpoint are rejected without regeneration', async () => temporary(async root => {
  const input = await fixture(root), result = await processPresentationNativeSampleV001({...input, directory: path.join(root, 'source')});
  let caseIndex = 0;
  const reject = async (change, expected) => {
    const sample = structuredClone(result.sample); change(sample);
    await assert.rejects(revalidatePresentationNativeSampleV001({sample, directory: path.join(root, 'reject-' + caseIndex++),
      run: async () => assert.fail('invalid checkpoint must not run media tools')}), expected);
  };
  await reject(sample => {sample.referenceRetention.state = 'unknown';}, /unknown saved retention state/);
  await reject(sample => {sample.referenceRetention.schemaVersion = 'unknown';}, /unknown saved retention state/);
  await reject(sample => {sample.frame++;}, /saved sample proof differs/);
  await reject(sample => {sample.referenceRetention.checkpoint.fileSha256 = '0'.repeat(64);}, /SHA mismatch/);
  await reject(sample => {sample.referenceRetention.checkpoint.path += '.missing';}, /ENOENT/);
  const checkpoint = result.sample.referenceRetention.checkpoint;
  await writeFile(checkpoint.path, (await readFile(checkpoint.path, 'utf8')).replace('caption-000103', 'caption-000104'));
  await reject(() => {}, /SHA mismatch/);
}));

test('changed and missing inputs or retained references cannot be accepted from saved pass flags', async () => temporary(async root => {
  const input = await fixture(root), result = await processPresentationNativeSampleV001({...input, directory: path.join(root, 'source')});
  const targets = [input.sample.baseFrame.path, input.sample.completedFrame.path,
    input.nativeLayers.layers[0].decodedPath, input.sceneBindings[0].states[0].pngPath,
    result.sample.referenceRetention.artifacts[0].path];
  let index = 0;
  for (const pathname of targets) {
    const original = await readFile(pathname);
    await writeFile(pathname, Buffer.concat([original, Buffer.from([1])]));
    await assert.rejects(revalidatePresentationNativeSampleV001({sample: result.sample,
      directory: path.join(root, 'changed-' + index), run: async () => assert.fail('changed input must precede media work')}), /SHA mismatch/);
    await writeFile(pathname, original);
    const hidden = pathname + '.test-hidden'; await rename(pathname, hidden);
    try {await assert.rejects(revalidatePresentationNativeSampleV001({sample: result.sample,
      directory: path.join(root, 'missing-' + index++), run: async () => assert.fail('missing input must precede media work')}), /ENOENT/);}
    finally {await rename(hidden, pathname);}
  }
}));

test('released references must remain absent, and a forged released failed sample is rejected', async () => temporary(async root => {
  const input = await fixture(root), result = await processPresentationNativeSampleV001({...input,
    directory: path.join(root, 'released'), retention: 'verified-pass-regenerable-v001'});
  const artifact = result.sample.referenceRetention.artifacts[0];
  await writeFile(artifact.path, Buffer.alloc(artifact.bytes), {flag: 'wx'});
  await assert.rejects(revalidatePresentationNativeSampleV001({sample: result.sample,
    directory: path.join(root, 'unexpected'), run: async () => assert.fail('unexpected retained file must precede media work')}),
  /released file unexpectedly exists/);
  await unlink(artifact.path);
  const changed = structuredClone(result.sample); changed.visible = false;
  await assert.rejects(revalidatePresentationNativeSampleV001({sample: changed, directory: path.join(root, 'forged')}), /saved sample proof differs|failed evidence cannot be released/);
}));

test('a storage failure keeps actual references and incomplete diagnostics, without claiming cleanup success', async () => temporary(async root => {
  const input = await fixture(root), directory = path.join(root, 'storage-failure');
  await assert.rejects(processPresentationNativeSampleV001({...input, directory,
    retention: 'verified-pass-regenerable-v001', run: async (command, args, purpose) => {
      const result = await run(command, args);
      if (purpose === 'native-reference-composite') await mkdir(path.join(directory, 'sample-proof.json'));
      return result;
    }}), /EEXIST|EISDIR/);
  const incomplete = await readJson(path.join(directory, 'incomplete.json'));
  assert.equal(incomplete.status, 'incomplete');
  assert.match(incomplete.message, /EEXIST|EISDIR/);
  assert.equal((await readdir(path.join(directory, 'references'))).length, 3);
  assert.equal((await stat(path.join(directory, 'completed.rgb'))).size, 8 * 8 * 3);
}));

test('failed child, missing child output and cancellation preserve diagnostic artifacts and never return success', async () => temporary(async root => {
  const input = await fixture(root);
  for (const mode of ['failed-child', 'missing-output', 'cancelled']) {
    const directory = path.join(root, mode), controller = new AbortController();
    await assert.rejects(processPresentationNativeSampleV001({...input, directory, signal: controller.signal,
      retention: 'verified-pass-regenerable-v001', run: async (command, args, purpose) => {
        if (purpose !== 'native-reference-composite') return run(command, args);
        const outputs = args.filter(value => value.startsWith(path.join(directory, 'references') + path.sep) && value.endsWith('.rgb'));
        if (mode === 'failed-child') {
          await writeFile(outputs[0], Buffer.alloc(8 * 8 * 3), {flag: 'wx'});
          return {code: 1, signal: null, stdout: Buffer.alloc(0), stderr: Buffer.from('synthetic failure')};
        }
        const result = await run(command, args);
        if (mode === 'missing-output') await unlink(outputs.at(-1));
        if (mode === 'cancelled') controller.abort(new Error('synthetic cancellation'));
        return result;
      }}), mode === 'failed-child' ? /unsuccessful child process/ : mode === 'missing-output' ? /ENOENT/ : /synthetic cancellation/);
    const incomplete = await readJson(path.join(directory, 'incomplete.json'));
    assert.equal(incomplete.status, 'incomplete');
    assert.equal(incomplete.processes.length, 2);
    if (mode !== 'missing-output') assert.equal(incomplete.processes.at(-1).failed, true);
    assert.ok((await readdir(path.join(directory, 'references'))).length > 0);
    await assert.rejects(stat(path.join(directory, 'sample-proof.json')), {code: 'ENOENT'});
  }
}));

test('missing or changed historical process evidence is rejected even when the modified checkpoint has a new valid file SHA', async () => temporary(async root => {
  const input = await fixture(root), result = await processPresentationNativeSampleV001({...input, directory: path.join(root, 'source')});
  const original = await readPresentationQcEvidenceV001(result.sample.referenceRetention.checkpoint.path,
    {expectedFileSha256: result.sample.referenceRetention.checkpoint.fileSha256});
  let index = 0;
  for (const change of [
    proof => {proof.processes.pop();},
    proof => {proof.processes.at(-1).code = 1;},
    proof => {proof.processes.at(-1).args.push('unexpected-argument');},
    proof => {proof.processes.at(-1).stdoutSha256 = hash('unexpected output');},
  ]) {
    const proof = structuredClone(original); change(proof);
    const checkpoint = path.join(root, 'modified-proof-' + index + '.json');
    const saved = await writePresentationQcEvidenceV001(checkpoint, proof);
    const sample = structuredClone(result.sample);
    sample.referenceRetention.checkpoint = {path: checkpoint, fileSha256: saved.fileSha256};
    await assert.rejects(revalidatePresentationNativeSampleV001({sample, directory: path.join(root, 'changed-process-' + index++),
      run: async () => assert.fail('invalid process evidence must precede regeneration')}),
    /process|execution|command|argument|stdout/);
  }
}));

test('an existing output directory and unknown retention policy cannot overwrite earlier files', async () => temporary(async root => {
  const input = await fixture(root), directory = path.join(root, 'existing'); await mkdir(directory);
  const marker = path.join(directory, 'marker'); await writeFile(marker, 'keep exactly', {flag: 'wx'});
  await assert.rejects(processPresentationNativeSampleV001({...input, directory}), {code: 'EEXIST'});
  assert.equal(await readFile(marker, 'utf8'), 'keep exactly');
  assert.deepEqual(await readdir(directory), ['marker']);
  await assert.rejects(processPresentationNativeSampleV001({...input, directory: path.join(root, 'unknown'), retention: 'unknown'}), /unknown retention policy/);
  await assert.rejects(stat(path.join(root, 'unknown')), {code: 'ENOENT'});
}));

test('receipt verification checks retained bytes on every call and distinguishes intentionally released references', async () => temporary(async root => {
  const input = await fixture(root);
  const retained = await processPresentationNativeSampleV001({...input, directory: path.join(root, 'retained')});
  const released = await processPresentationNativeSampleV001({...input, directory: path.join(root, 'released'),
    retention: 'verified-pass-regenerable-v001'});
  const samples = [retained.sample, released.sample];
  const first = await verifyPresentationNativeSampleReceiptsV001({samples});
  assert.equal(first.status, 'passed'); assert.equal(first.samples, 2); assert.equal(first.releasedSamples, 1);
  assert.ok(first.verifiedFileCount > 0);
  assert.match(first.scope, /absent RGB is regenerated only/);
  const completed = released.sample.completedRgb.path, original = await readFile(completed);
  const changed = Buffer.from(original); changed[0] ^= 1; await writeFile(completed, changed);
  await assert.rejects(verifyPresentationNativeSampleReceiptsV001({samples}), /SHA mismatch/);
  await writeFile(completed, original);
  const artifact = retained.sample.referenceRetention.artifacts[0], hidden = artifact.path + '.test-hidden';
  await rename(artifact.path, hidden);
  try {await assert.rejects(verifyPresentationNativeSampleReceiptsV001({samples}), /ENOENT/);}
  finally {await rename(hidden, artifact.path);}
  assert.deepEqual(await verifyPresentationNativeSampleReceiptsV001({samples}), first);
}));

test('missing or incorrect prepared-plane bindings cannot produce a releasable receipt', async () => temporary(async root => {
  const input = await fixture(root);
  for (const [index, preparedArtifacts] of [[], input.preparedArtifacts.map(row => ({...row, fileSha256: '0'.repeat(64)}))].entries()) {
    const directory = path.join(root, 'bad-prepared-' + index);
    await assert.rejects(processPresentationNativeSampleV001({...input, preparedArtifacts, directory,
      retention: 'verified-pass-regenerable-v001'}), /prepared plane lacks a prior hash binding|SHA mismatch/);
    assert.equal((await readJson(path.join(directory, 'incomplete.json'))).status, 'incomplete');
    assert.equal((await readdir(path.join(directory, 'references'))).length, 3);
    await assert.rejects(stat(path.join(directory, 'sample-proof.json')), {code: 'ENOENT'});
  }
}));

test('every required code binding must survive receipt reading and independent revalidation even after checkpoint SHA rebinding', async () => temporary(async root => {
  const input = await fixture(root), result = await processPresentationNativeSampleV001({...input, directory: path.join(root, 'source')});
  const original = await readPresentationQcEvidenceV001(result.sample.referenceRetention.checkpoint.path,
    {expectedFileSha256: result.sample.referenceRetention.checkpoint.fileSha256});
  const requiredCode = ['presentation_native_qc_streaming_v001.mjs', 'presentation_native_frame_qc_v001.mjs',
    'presentation_qc_evidence_store_v001.mjs', 'presentation_caption_contract_v002.mjs'];
  for (const [index, missing] of requiredCode.entries()) {
    assert.equal(original.inputRefs.filter(row => path.basename(row.path) === missing).length, 1, missing);
    const proof = structuredClone(original);
    proof.inputRefs = proof.inputRefs.filter(row => path.basename(row.path) !== missing);
    const checkpoint = path.join(root, 'missing-code-' + index + '.json');
    const saved = await writePresentationQcEvidenceV001(checkpoint, proof);
    const sample = structuredClone(result.sample);
    sample.referenceRetention.checkpoint = {path: checkpoint, fileSha256: saved.fileSha256};
    await assert.rejects(verifyPresentationNativeSampleReceiptsV001({samples: [sample]}), /required code input missing/, missing);
    const samplePath = path.join(root, 'missing-code-sample-' + index + '.json');
    await writeFile(samplePath, JSON.stringify(sample), {flag: 'wx'});
    const directory = path.join(root, 'rejected-code-' + index);
    await exec(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import {readFile} from 'node:fs/promises';
      import {revalidatePresentationNativeSampleV001} from ${JSON.stringify(moduleUrl)};
      const sample = JSON.parse(await readFile(process.argv[1], 'utf8'));
      await assert.rejects(revalidatePresentationNativeSampleV001({sample, directory: process.argv[2],
        run: async () => assert.fail('missing code binding must precede every regeneration process')}),
        /required code input missing/);
    `, samplePath, directory], {maxBuffer: 1024 * 1024});
    await assert.rejects(stat(directory), {code: 'ENOENT'});
  }
}));
