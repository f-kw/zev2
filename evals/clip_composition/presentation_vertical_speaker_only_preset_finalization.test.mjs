import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {
  chmod,
  copyFile,
  link,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  VERTICAL_APPROVED_MEDIA_FILE_SHA256,
  VERTICAL_APPROVED_MEDIA_PATH,
  VERTICAL_COMPONENT_PROVENANCE,
  VERTICAL_FONT,
  VERTICAL_PIXEL_PROBES,
  VERTICAL_PRESET_ID,
  VERTICAL_PRESET_VIOLATION_CODES,
  VERTICAL_PREVIEW_MANIFEST_FILE_SHA256,
  VERTICAL_PREVIEW_MANIFEST_PATH,
  VERTICAL_PREVIEW_PREFLIGHT_FILE_SHA256,
  VERTICAL_PREVIEW_PREFLIGHT_PATH,
  buildVerticalFinalizationReportV001,
  buildVerticalFinalizerFatalV001,
  buildVerticalFormalArtifactsV001,
  buildVerticalMaterialValidationIndexV001,
  buildVerticalOutputBindingsV001,
  buildVerticalPixelProbeInputsV001,
  buildVerticalPresetRegistryV002,
  buildVerticalRendererTrustV001,
  buildVerticalTrustedRegistryBindingsV002,
  decodeRemotionHelpVersionV001,
  decodeRgbaWithFixedImageMagickV001,
  deriveVerticalPresetValidationIndexV001,
  finalizeVerticalSpeakerOnlyPresetV001,
  resolveVerticalPresetV001,
  validateVerticalPreviewBindingsV001,
  validateVerticalPresetRegistryV002,
  validateVerticalRendererTrustV001,
  verifyVerticalPublishedRootsV001,
  verifyPixelEquivalenceV001,
  verifyVerticalRendererImportGraphV001,
  verifyVerticalRuntimeProfileObservationV001,
  verticalToolCommandV001,
} from './finalize_presentation_vertical_speaker_only_preset_v001.mjs';
import {
  serializeJsonFileV001,
  sha256BytesV001,
  sha256CanonicalV001,
} from './presentation_retained_source_atoms_v001.mjs';

const hex = (character) => character.repeat(64);
const componentBindings = () =>
  VERTICAL_COMPONENT_PROVENANCE.map((entry, index) => ({
    role: entry.role,
    path: entry.path,
    fileSha256: (index + 1).toString(16).padStart(64, '0'),
  }));
const runtimeProfile = () => ({
  node: {
    path: '/runtime/node',
    version: 'v20.19.6',
    fileSha256: hex('1'),
  },
  tsx: {
    path: '/runtime/tsx',
    version: 'tsx v4.22.3',
    fileSha256: hex('2'),
  },
  remotion: {
    path: '/runtime/remotion',
    version: '4.0.481',
    fileSha256: hex('3'),
  },
  browser: {
    path: '/runtime/browser',
    version: 'HeadlessChrome 149.0.7790.0',
    fileSha256: hex('4'),
  },
  ffmpeg: {
    path: '/runtime/ffmpeg',
    version: 'ffmpeg version 8.0.1',
    fileSha256: hex('5'),
  },
  ffprobe: {
    path: '/runtime/ffprobe',
    version: 'ffprobe version 8.0.1',
    fileSha256: hex('6'),
  },
  imageMagick: {
    path: '/runtime/magick',
    version: 'Version: ImageMagick 7.1.2-13',
    fileSha256: hex('7'),
  },
});
const runtimeObservations = (profile) =>
  Object.fromEntries(
    Object.entries(profile).map(([role, binding]) => [
      role,
      {
        exitCode: 0,
        stdout: Buffer.from(
          role === 'remotion'
            ? '@remotion/cli 4.0.481\nCommands:\n'
            : `${binding.version}\n`,
        ),
        stderr: Buffer.alloc(0),
        fileSha256: binding.fileSha256,
      },
    ]),
  );
const regeneratedProbeHashes = () =>
  Object.fromEntries(
    VERTICAL_PIXEL_PROBES.map((probe) => [
      probe.probeId,
      probe.approvedRgbaSha256,
    ]),
  );
const clone = (value) => structuredClone(value);
const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const FINALIZER_PATH =
  'evals/clip_composition/finalize_presentation_vertical_speaker_only_preset_v001.mjs';
const CANONICAL_CORE_PATH =
  'evals/clip_composition/presentation_retained_source_atoms_v001.mjs';
const FINALIZATION_JOB_ROOT =
  'evals/clip_composition/outputs/presentation/vertical-preset-finalization-jobs';
const REGISTRY_ROOT =
  'evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001';
const TRUST_ROOT =
  'evals/clip_composition/registries/presentation/presentation-vertical-renderer-trust-v001';

const writeFixtureFile = async (workspaceRoot, relativePath, bytes) => {
  const target = path.join(workspaceRoot, ...relativePath.split('/'));
  await mkdir(path.dirname(target), {recursive: true});
  await writeFile(target, bytes, {flag: 'wx'});
  return target;
};

const copyFixtureFile = async (workspaceRoot, relativePath) => {
  const source = path.join(REPOSITORY_ROOT, ...relativePath.split('/'));
  const target = path.join(workspaceRoot, ...relativePath.split('/'));
  await mkdir(path.dirname(target), {recursive: true});
  try {
    await link(source, target);
  } catch {
    await copyFile(source, target);
  }
  return target;
};

const shaOfFile = async (filePath) =>
  sha256BytesV001(await readFile(filePath));

const executableFixture = async (workspaceRoot, name, source) => {
  const filePath = await writeFixtureFile(
    workspaceRoot,
    `tools/${name}`,
    Buffer.from(source),
  );
  await chmod(filePath, 0o755);
  return filePath;
};

const findImageMagick = async () => {
  for (const candidate of ['/opt/homebrew/bin/magick', '/usr/local/bin/magick']) {
    try {
      await readFile(candidate);
      return candidate;
    } catch {
      // Continue to the next fixed installation path.
    }
  }
  throw new Error('ImageMagick executable for R09 is unavailable');
};

const commandVersion = (command, args) => {
  const result = spawnSync(command, args, {encoding: null});
  assert.equal(result.status, 0);
  assert.deepEqual(Buffer.from(result.stderr ?? []), Buffer.alloc(0));
  const bytes = Buffer.from(result.stdout);
  assert.equal(bytes.at(-1), 0x0a);
  return new TextDecoder('utf-8', {fatal: true}).decode(
    bytes.subarray(0, bytes.length - 1),
  );
};

const buildR09RuntimeProfile = async (workspaceRoot) => {
  const nodeVersion = commandVersion(process.execPath, ['--version']);
  const fakeTsx = await executableFixture(
    workspaceRoot,
    'fake-tsx.cjs',
    `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
if (process.argv[2] === '--version') {
  process.stdout.write(${JSON.stringify(`tsx v-test\nnode ${process.version}\n`)});
  process.exit(0);
}
const args = process.argv.slice(2);
const inputPath = args[args.indexOf('--input') + 1];
const outputPath = args[args.indexOf('--output') + 1];
const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
fs.copyFileSync(
  path.resolve(process.cwd(), input.sourceBinding.approvedPath),
  outputPath,
);
`,
  );
  const fakeRemotion = await executableFixture(
    workspaceRoot,
    'fake-remotion.cjs',
    `#!/usr/bin/env node
process.stdout.write('@remotion/cli 4.0.481\\nCommands:\\n');
`,
  );
  const fakeBrowser = await executableFixture(
    workspaceRoot,
    'fake-browser',
    "#!/bin/sh\nprintf 'Browser test 1.0\\n'\n",
  );
  const fakeFfmpeg = await executableFixture(
    workspaceRoot,
    'fake-ffmpeg',
    "#!/bin/sh\nprintf 'ffmpeg test 1.0\\n'\n",
  );
  const fakeFfprobe = await executableFixture(
    workspaceRoot,
    'fake-ffprobe',
    "#!/bin/sh\nprintf 'ffprobe test 1.0\\n'\n",
  );
  const imageMagick = await findImageMagick();
  return {
    node: {
      path: process.execPath,
      version: nodeVersion,
      fileSha256: await shaOfFile(process.execPath),
    },
    tsx: {
      path: fakeTsx,
      version: `tsx v-test\nnode ${process.version}`,
      fileSha256: await shaOfFile(fakeTsx),
    },
    remotion: {
      path: fakeRemotion,
      version: '4.0.481',
      fileSha256: await shaOfFile(fakeRemotion),
    },
    browser: {
      path: fakeBrowser,
      version: 'Browser test 1.0',
      fileSha256: await shaOfFile(fakeBrowser),
    },
    ffmpeg: {
      path: fakeFfmpeg,
      version: 'ffmpeg test 1.0',
      fileSha256: await shaOfFile(fakeFfmpeg),
    },
    ffprobe: {
      path: fakeFfprobe,
      version: 'ffprobe test 1.0',
      fileSha256: await shaOfFile(fakeFfprobe),
    },
    imageMagick: {
      path: imageMagick,
      version: commandVersion(imageMagick, ['-version']),
      fileSha256: await shaOfFile(imageMagick),
    },
  };
};

const jsonBinding = async (workspaceRoot, relativePath) => {
  const bytes = await readFile(
    path.join(workspaceRoot, ...relativePath.split('/')),
  );
  const value = JSON.parse(bytes);
  return {
    path: relativePath,
    fileSha256: sha256BytesV001(bytes),
    canonicalSha256: sha256CanonicalV001(value),
  };
};

const fileBinding = async (workspaceRoot, relativePath) => ({
  path: relativePath,
  fileSha256: await shaOfFile(
    path.join(workspaceRoot, ...relativePath.split('/')),
  ),
});

const writeR09Job = async (workspaceRoot, baseJob, jobId, mutate = () => {}) => {
  const job = clone(baseJob);
  job.jobId = jobId;
  mutate(job);
  const relativePath = `${FINALIZATION_JOB_ROOT}/${jobId}.json`;
  await writeFixtureFile(
    workspaceRoot,
    relativePath,
    serializeJsonFileV001(job),
  );
  return {job, relativePath};
};

const prepareR09Workspace = async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), 'vertical-preset-r09-'),
  );
  const requiredPaths = new Set([
    FINALIZER_PATH,
    CANONICAL_CORE_PATH,
    ...VERTICAL_COMPONENT_PROVENANCE.map((entry) => entry.path),
    VERTICAL_PREVIEW_MANIFEST_PATH,
    VERTICAL_PREVIEW_PREFLIGHT_PATH,
    VERTICAL_APPROVED_MEDIA_PATH,
    VERTICAL_FONT.path,
    VERTICAL_FONT.licensePath,
    ...VERTICAL_PIXEL_PROBES.map((probe) => probe.approvedPath),
  ]);
  for (const relativePath of requiredPaths) {
    await copyFixtureFile(workspaceRoot, relativePath);
  }
  assert.equal(
    await shaOfFile(
      path.join(workspaceRoot, ...VERTICAL_APPROVED_MEDIA_PATH.split('/')),
    ),
    VERTICAL_APPROVED_MEDIA_FILE_SHA256,
  );
  assert.equal(
    await shaOfFile(path.join(workspaceRoot, ...VERTICAL_FONT.path.split('/'))),
    VERTICAL_FONT.sha256,
  );
  assert.equal(
    await shaOfFile(
      path.join(workspaceRoot, ...VERTICAL_FONT.licensePath.split('/')),
    ),
    VERTICAL_FONT.licenseFileSha256,
  );
  const runtime = await buildR09RuntimeProfile(workspaceRoot);
  const baseJob = {
    schemaVersion: 'presentation-vertical-preset-finalization-job-v001',
    jobId: 'placeholder',
    implementationBinding: {
      entry: await fileBinding(workspaceRoot, FINALIZER_PATH),
      localImportClosure: [
        {
          role: 'canonical-json-core',
          ...(await fileBinding(workspaceRoot, CANONICAL_CORE_PATH)),
        },
      ],
    },
    inputBindings: {
      previewManifest: await jsonBinding(
        workspaceRoot,
        VERTICAL_PREVIEW_MANIFEST_PATH,
      ),
      previewPreflight: await jsonBinding(
        workspaceRoot,
        VERTICAL_PREVIEW_PREFLIGHT_PATH,
      ),
      approvedMedia: await fileBinding(
        workspaceRoot,
        VERTICAL_APPROVED_MEDIA_PATH,
      ),
      font: await fileBinding(workspaceRoot, VERTICAL_FONT.path),
      fontLicense: await fileBinding(
        workspaceRoot,
        VERTICAL_FONT.licensePath,
      ),
    },
    runtimeProfile: runtime,
    publication: {
      presetRegistryRoot: REGISTRY_ROOT,
      rendererTrustRoot: TRUST_ROOT,
      finalizationReportPath: `${REGISTRY_ROOT}/preset-finalization-report.json`,
    },
  };
  return {workspaceRoot, baseJob};
};

test('R01: v002 registry resolves exactly one approved speaker_only preset', () => {
  const registry = buildVerticalPresetRegistryV002(componentBindings());
  assert.equal(validateVerticalPresetRegistryV002(registry), true);
  const resolved = resolveVerticalPresetV001(registry, 'speaker_only');
  assert.equal(resolved.presetId, VERTICAL_PRESET_ID);
  assert.equal(resolved.screenLayoutId, 'speaker_only');
  assert.equal(registry.presets.length, 1);
  assert.equal(registry.presets[0].visualStates.length, 1);
});

test('R02: a missing screen-layout vocabulary member is rejected', () => {
  const registry = buildVerticalPresetRegistryV002(componentBindings());
  registry.screenLayoutVocabulary.pop();
  assert.throws(
    () => validateVerticalPresetRegistryV002(registry),
    (error) => error.code === 'VERTICAL_SCREEN_LAYOUT_VOCABULARY_INVALID',
  );
});

test('R03: an extra screen-layout vocabulary member is rejected', () => {
  const registry = buildVerticalPresetRegistryV002(componentBindings());
  registry.screenLayoutVocabulary.push('unknown_layout');
  assert.throws(
    () => validateVerticalPresetRegistryV002(registry),
    (error) => error.code === 'VERTICAL_SCREEN_LAYOUT_VOCABULARY_INVALID',
  );
});

test('R04: screen_speaker remains allowed vocabulary but unregistered', () => {
  const registry = buildVerticalPresetRegistryV002(componentBindings());
  assert.throws(
    () => resolveVerticalPresetV001(registry, 'screen_speaker'),
    (error) => error.code === 'VERTICAL_SCREEN_LAYOUT_NOT_REGISTERED',
  );
});

test('R05: speaker_pair remains allowed vocabulary but unregistered', () => {
  const registry = buildVerticalPresetRegistryV002(componentBindings());
  assert.throws(
    () => resolveVerticalPresetV001(registry, 'speaker_pair'),
    (error) => error.code === 'VERTICAL_SCREEN_LAYOUT_NOT_REGISTERED',
  );
});

test('R06: approved preview, five exact probe inputs, and RGBA decoder are bound', async () => {
  const [manifestBytes, preflightBytes] = await Promise.all([
    readFile(VERTICAL_PREVIEW_MANIFEST_PATH),
    readFile(VERTICAL_PREVIEW_PREFLIGHT_PATH),
  ]);
  const manifest = JSON.parse(manifestBytes);
  const preflight = JSON.parse(preflightBytes);
  assert.equal(
    sha256BytesV001(manifestBytes),
    VERTICAL_PREVIEW_MANIFEST_FILE_SHA256,
  );
  assert.equal(
    sha256BytesV001(preflightBytes),
    VERTICAL_PREVIEW_PREFLIGHT_FILE_SHA256,
  );
  assert.equal(
    validateVerticalPreviewBindingsV001({
      previewManifest: manifest,
      previewManifestFileSha256: sha256BytesV001(manifestBytes),
      previewPreflight: preflight,
      previewPreflightFileSha256: sha256BytesV001(preflightBytes),
    }),
    true,
  );

  const registry = buildVerticalPresetRegistryV002(componentBindings());
  const inputs = buildVerticalPixelProbeInputsV001({
    registry,
    preflightCanonicalSha256: sha256CanonicalV001(preflight),
    runtimeProfile: runtimeProfile(),
  });
  assert.deepEqual(
    inputs.map((entry) => entry.probeId),
    VERTICAL_PIXEL_PROBES.map((entry) => entry.probeId),
  );
  assert.deepEqual(inputs[1].lines, ['やり始めるから', 'あっちこっちで']);
  assert.equal(inputs[3].fontSizeOverridePx, null);
  assert.equal(inputs[4].fontSizeOverridePx, 135);

  const expectedRgba = Buffer.from([
    0, 1, 2, 3, 4, 5, 6, 7,
    8, 9, 10, 11, 12, 13, 14, 15,
  ]);
  const decoded = decodeRgbaWithFixedImageMagickV001({
    imageMagickPath: '/runtime/magick',
    inputPngPath: '/fixture/2x2.png',
    expectedWidth: 2,
    expectedHeight: 2,
    spawn: (_command, args) => {
      assert.deepEqual(args, [
        '/fixture/2x2.png',
        '-alpha',
        'on',
        '-colorspace',
        'sRGB',
        '-depth',
        '8',
        '-define',
        'quantum:format=unsigned',
        'RGBA:-',
      ]);
      return {status: 0, stdout: expectedRgba, stderr: Buffer.alloc(0)};
    },
  });
  assert.deepEqual(decoded, expectedRgba);
  assert.equal(verifyPixelEquivalenceV001(regeneratedProbeHashes()).length, 5);
  assert.throws(
    () =>
      verifyPixelEquivalenceV001({
        ...regeneratedProbeHashes(),
        'width-probe-135': hex('0'),
      }),
    (error) => error.code === 'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
  );
});

test('R07: all fifteen component paths, local imports, and renderer trust bindings are exact', async () => {
  const bindings = componentBindings();
  const registry = buildVerticalPresetRegistryV002(bindings);
  assert.deepEqual(
    registry.componentProvenance.map(({role, path}) => ({role, path})),
    VERTICAL_COMPONENT_PROVENANCE,
  );
  assert.throws(
    () =>
      buildVerticalPresetRegistryV002([
        ...bindings.slice(0, 14),
        {...bindings[14], path: 'runner/src/telop/other.ts'},
      ]),
    (error) => error.code === 'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
  );

  const rendererSources = {};
  for (const entry of VERTICAL_COMPONENT_PROVENANCE) {
    if (
      entry.path.startsWith('runner/src/remotion/') ||
      entry.path === 'runner/src/shared/telop-glow.ts' ||
      entry.path.startsWith('runner/src/telop/')
    ) {
      if (entry.path.endsWith('.css')) continue;
      rendererSources[entry.path] = await readFile(entry.path, 'utf8');
    }
  }
  const edges = verifyVerticalRendererImportGraphV001(rendererSources);
  assert.equal(
    edges.some(
      (edge) =>
        edge.resolvedPath === 'runner/src/remotion/styles/telop.css',
    ),
    true,
  );
  const tamperedSources = clone(rendererSources);
  tamperedSources['runner/src/remotion/Root.tsx'] +=
    "\nimport './unapproved-runtime';\n";
  assert.throws(
    () => verifyVerticalRendererImportGraphV001(tamperedSources),
    (error) => error.code === 'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
  );

  const presetIndex = deriveVerticalPresetValidationIndexV001(registry);
  const materialIndex = buildVerticalMaterialValidationIndexV001();
  const registryBinding = buildVerticalTrustedRegistryBindingsV002(
    presetIndex,
    materialIndex,
  );
  const trust = buildVerticalRendererTrustV001({
    registry,
    registryFileSha256: sha256BytesV001(serializeJsonFileV001(registry)),
    trustedRegistryBindings: registryBinding,
    trustedRegistryBindingsFileSha256: sha256BytesV001(
      serializeJsonFileV001(registryBinding),
    ),
    pixelEquivalence: verifyPixelEquivalenceV001(regeneratedProbeHashes()),
    runtimeProfile: runtimeProfile(),
  });
  assert.equal(
    validateVerticalRendererTrustV001({
      trust,
      registry,
      trustedRegistryBindings: registryBinding,
    }),
    true,
  );
  const tampered = clone(trust);
  tampered.rendererDependencies[8].fileSha256 = hex('f');
  assert.throws(
    () =>
      validateVerticalRendererTrustV001({
        trust: tampered,
        registry,
        trustedRegistryBindings: registryBinding,
      }),
    (error) => error.code === 'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
  );
});

test('R08: every human-approved layout boundary remains immutable', () => {
  const base = buildVerticalPresetRegistryV002(componentBindings());
  const mutations = [
    (value) => {
      value.canvas.width = 1079;
    },
    (value) => {
      value.canvas.safeAreaPx.right = 42;
    },
    (value) => {
      value.fontAssets[0].sha256 = hex('f');
    },
    (value) => {
      value.presets[0].visualStates[0].textStyle.fontSizePx = 133;
    },
    (value) => {
      value.presets[0].visualStates[0].textStyle.borderWidthPx = 10;
    },
    (value) => {
      value.presets[0].visualStates[0].textStyle.glowWidthPx = 16;
    },
    (value) => {
      value.presets[0].visualStates[0].layout.maxLines = 3;
    },
    (value) => {
      value.presets[0].visualStates[0].layout.maxSupportedLogicalWidthPerLine =
        15;
    },
  ];
  for (const mutate of mutations) {
    const value = clone(base);
    mutate(value);
    assert.throws(
      () => validateVerticalPresetRegistryV002(value),
      (error) => error.code === 'VERTICAL_PRESET_REGISTRY_INVALID',
    );
  }
});

test('R09: derivation, tool observation, reports, and output bytes are deterministic', async () => {
  const profile = runtimeProfile();
  const observations = runtimeObservations(profile);
  assert.equal(
    verifyVerticalRuntimeProfileObservationV001(profile, observations),
    true,
  );
  assert.deepEqual(verticalToolCommandV001('remotion', profile).args, [
    profile.remotion.path,
    '--help',
  ]);
  assert.equal(
    decodeRemotionHelpVersionV001(
      Buffer.from('@remotion/cli 4.0.481\nCommands:\n'),
    ),
    '4.0.481',
  );

  const artifactsA = buildVerticalFormalArtifactsV001({
    componentBindings: componentBindings(),
    runtimeProfile: profile,
    regeneratedRgbaSha256ById: regeneratedProbeHashes(),
  });
  const artifactsB = buildVerticalFormalArtifactsV001({
    componentBindings: componentBindings(),
    runtimeProfile: clone(profile),
    regeneratedRgbaSha256ById: regeneratedProbeHashes(),
  });
  assert.deepEqual(artifactsA, artifactsB);
  assert.deepEqual(
    artifactsA.presetValidationIndex.registeredScreenLayoutIds,
    ['speaker_only'],
  );
  const outputBindings = buildVerticalOutputBindingsV001(artifactsA);
  const report = buildVerticalFinalizationReportV001({
    status: 'passed',
    jobBinding: {
      path: 'evals/clip_composition/outputs/presentation/vertical-preset-finalization-jobs/test.json',
      fileSha256: hex('8'),
      canonicalSha256: hex('9'),
    },
    implementationBinding: {
      entry: {
        path: 'evals/clip_composition/finalize_presentation_vertical_speaker_only_preset_v001.mjs',
        fileSha256: hex('a'),
      },
      localImportClosure: [
        {
          role: 'canonical-json-core',
          path: 'evals/clip_composition/presentation_retained_source_atoms_v001.mjs',
          fileSha256: hex('b'),
        },
      ],
    },
    runtimeProfile: profile,
    violations: [],
    outputBindings,
  });
  assert.equal(report.status, 'passed');
  assert.equal(report.violations.length, 0);
  assert.equal(
    serializeJsonFileV001(report).equals(serializeJsonFileV001(clone(report))),
    true,
  );
  assert.deepEqual(Object.keys(outputBindings), [
    'presetRegistry',
    'presetValidationIndex',
    'materialValidationIndex',
    'trustedRegistryBindings',
    'rendererTrust',
  ]);
  assert.deepEqual(buildVerticalFinalizerFatalV001(), {
    schemaVersion: 'presentation-formal-runner-fatal-v001',
    runnerId: 'presentation-vertical-preset-finalizer-v001',
    status: 'fatal',
    diagnosticCode: 'VERTICAL_PRESET_FINALIZER_FATAL',
  });
  assert.deepEqual(VERTICAL_PRESET_VIOLATION_CODES.slice(0, 5), [
    'VERTICAL_PRESET_REGISTRY_INVALID',
    'VERTICAL_SCREEN_LAYOUT_VOCABULARY_INVALID',
    'VERTICAL_SCREEN_LAYOUT_NOT_REGISTERED',
    'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
    'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
  ]);

  const {workspaceRoot, baseJob} = await prepareR09Workspace();
  const finalizerEntry = path.join(REPOSITORY_ROOT, ...FINALIZER_PATH.split('/'));
  try {
    const rejectedJobs = {};
    for (const [role, jobId] of [
      ['approvedMedia', 'r09-rejected-media'],
      ['font', 'r09-rejected-font'],
      ['fontLicense', 'r09-rejected-license'],
    ]) {
      const written = await writeR09Job(
        workspaceRoot,
        baseJob,
        jobId,
        (job) => {
          job.inputBindings[role].fileSha256 = hex('0');
        },
      );
      rejectedJobs[role] = written.relativePath;
      const rejected = await finalizeVerticalSpeakerOnlyPresetV001({
        workspaceRoot,
        jobPath: written.relativePath,
        regeneratedRgbaSha256ById: regeneratedProbeHashes(),
        publish: false,
      });
      assert.equal(rejected.exitCode, 1);
      assert.equal(rejected.report.status, 'rejected');
      assert.deepEqual(
        rejected.report.violations.map((entry) => entry.code),
        ['VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH'],
      );
      assert.equal(rejected.report.outputBindings, null);
    }

    const rejectedProcess = spawnSync(
      process.execPath,
      [finalizerEntry, rejectedJobs.approvedMedia],
      {
        cwd: workspaceRoot,
        encoding: null,
        maxBuffer: 8 * 1024 * 1024,
      },
    );
    assert.equal(rejectedProcess.status, 1);
    assert.deepEqual(
      Buffer.from(rejectedProcess.stderr ?? []),
      Buffer.alloc(0),
    );
    const rejectedStdout = JSON.parse(
      new TextDecoder('utf-8', {fatal: true}).decode(
        Buffer.from(rejectedProcess.stdout),
      ),
    );
    assert.equal(rejectedStdout.status, 'rejected');
    assert.equal(
      rejectedStdout.violations[0].code,
      'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
    );

    const fatalJob = clone(baseJob);
    fatalJob.jobId = 'r09-fatal-path';
    const mismatchedFatalPath =
      `${FINALIZATION_JOB_ROOT}/r09-fatal-path-mismatch.json`;
    await writeFixtureFile(
      workspaceRoot,
      mismatchedFatalPath,
      serializeJsonFileV001(fatalJob),
    );
    const fatalProcess = spawnSync(
      process.execPath,
      [finalizerEntry, mismatchedFatalPath],
      {
        cwd: workspaceRoot,
        encoding: null,
        maxBuffer: 8 * 1024 * 1024,
      },
    );
    assert.equal(fatalProcess.status, 2);
    assert.deepEqual(Buffer.from(fatalProcess.stderr ?? []), Buffer.alloc(0));
    assert.deepEqual(
      JSON.parse(
        new TextDecoder('utf-8', {fatal: true}).decode(
          Buffer.from(fatalProcess.stdout),
        ),
      ),
      buildVerticalFinalizerFatalV001(),
    );

    const passedJob = await writeR09Job(
      workspaceRoot,
      baseJob,
      'r09-passed',
    );
    const passedProcess = spawnSync(
      process.execPath,
      [finalizerEntry, passedJob.relativePath],
      {
        cwd: workspaceRoot,
        encoding: null,
        maxBuffer: 8 * 1024 * 1024,
      },
    );
    assert.equal(passedProcess.status, 0);
    assert.deepEqual(Buffer.from(passedProcess.stderr ?? []), Buffer.alloc(0));
    const durableReportPath = path.join(
      workspaceRoot,
      ...`${REGISTRY_ROOT}/preset-finalization-report.json`.split('/'),
    );
    const durableReportBytes = await readFile(durableReportPath);
    assert.deepEqual(Buffer.from(passedProcess.stdout), durableReportBytes);
    const published = await verifyVerticalPublishedRootsV001({workspaceRoot});
    assert.equal(published.report.status, 'passed');
    assert.deepEqual(published.reportBytes, durableReportBytes);

    const orphanedRegistryPath = path.join(
      workspaceRoot,
      'orphan-evidence',
      'vertical-short-preset-registry-v001',
    );
    await mkdir(path.dirname(orphanedRegistryPath), {recursive: true});
    await rename(
      path.join(workspaceRoot, ...REGISTRY_ROOT.split('/')),
      orphanedRegistryPath,
    );
    await readFile(
      path.join(workspaceRoot, ...`${TRUST_ROOT}/trust.json`.split('/')),
    );
    await assert.rejects(
      () => verifyVerticalPublishedRootsV001({workspaceRoot}),
      /ENOENT|commit record/u,
    );
  } finally {
    await rm(workspaceRoot, {recursive: true, force: true});
  }
});
