import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

import ts from '../../packages/shared/node_modules/typescript/lib/typescript.js';

import {
  ZEVO_TITLE_IMPLEMENTATION_BINDINGS_V001,
  ZEVO_TITLE_IMPLEMENTATION_ROLES_V001,
} from './presentation_output_title_compositor_v001.mjs';
import {
  ZEVO_TITLE_OUTPUT_ARTIFACT_NAMES_V001,
  ZEVO_TITLE_OUTPUT_JOB_ROOT_V001,
  ZEVO_TITLE_OUTPUT_ROOT_V001,
  inspectZevoTitleJobTopologyV001,
  inspectZevoTitleRemotionLauncherV001,
  inspectZevoTitleRunnerLaunchV001,
  runZevoTitleOutputJobV001,
  validateZevoTitleFrozenSourceFormalJobV001,
} from './run_presentation_output_title_job_v001.ts';

const SHA = 'a'.repeat(64);
const REPOSITORY_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const LOCAL_IMPORT_STARTS = Object.freeze([
  'evals/clip_composition/run_presentation_output_title_job_v001.ts',
  'evals/clip_composition/presentation_output_title_compositor_v001.mjs',
  'evals/clip_composition/render_presentation_v002.mjs',
  'evals/clip_composition/presentation_renderer_entry_v001.tsx',
  'evals/clip_composition/inspect_presentation_render_layout_v001.ts',
]);
const LOCAL_IMPORT_EXTENSIONS = Object.freeze([
  '', '.mjs', '.js', '.ts', '.tsx', '/index.js', '/index.ts',
]);
const EXTERNAL_RUNTIME_SPECIFIERS = Object.freeze(new Set(['react', 'remotion']));
const SHARED_PACKAGE_MANIFEST = 'packages/shared/package.json';
const SPEAKER_REGISTRY =
  'evals/clip_composition/registries/presentation/'
    + 'presentation-source-speaker-non-identity-registry-v001/registry.json';
const MODULE_LOAD_DATA_BINDINGS = Object.freeze([
  SHARED_PACKAGE_MANIFEST,
  SPEAKER_REGISTRY,
]);
const MODULE_LOAD_DATA_OWNERS = Object.freeze(new Map([
  [
    'evals/clip_composition/presentation_source_speaker_policy_v001.mjs',
    SPEAKER_REGISTRY,
  ],
]));
const COMPUTED_DYNAMIC_IMPORTS = Object.freeze(new Map([
  [
    'evals/clip_composition/render_presentation_vertical_review_v001.ts',
    Object.freeze({
      callCount: 5,
      targets: Object.freeze([
        'runner/src/screen-layout.ts',
        'runner/src/telop/telop-render-model.ts',
        'runner/src/telop-remotion.ts',
      ]),
    }),
  ],
]));
const FILE_IO_MODULES = Object.freeze(new Set([
  'node:fs', 'node:fs/promises', 'node:child_process',
]));

const resolveLocalImport = async (fromPath, specifier) => {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(
    path.dirname(path.join(REPOSITORY_ROOT, fromPath)),
    specifier,
  );
  for (const extension of LOCAL_IMPORT_EXTENSIONS) {
    try {
      const candidate = `${base}${extension}`;
      if ((await stat(candidate)).isFile()) {
        return path.relative(REPOSITORY_ROOT, candidate);
      }
    } catch {}
  }
  return null;
};

const hasRuntimeImportClause = clause => {
  if (clause === undefined) return true;
  if (clause.isTypeOnly || clause.name !== undefined) return !clause.isTypeOnly;
  if (ts.isNamespaceImport(clause.namedBindings)) return true;
  return clause.namedBindings.elements.some(element => !element.isTypeOnly);
};

const hasRuntimeExportClause = declaration => {
  if (declaration.isTypeOnly) return false;
  if (declaration.exportClause === undefined
    || ts.isNamespaceExport(declaration.exportClause)) return true;
  return declaration.exportClause.elements.some(element => !element.isTypeOnly);
};

const inspectRuntimeModuleSpecifiers = (relativePath, source) => {
  const sourceFile = ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    relativePath.endsWith('.tsx') ? ts.ScriptKind.TSX
      : relativePath.endsWith('.ts') ? ts.ScriptKind.TS
        : ts.ScriptKind.JS,
  );
  const staticSpecifiers = [];
  const literalDynamicSpecifiers = [];
  const typeOnlySpecifiers = [];
  let computedDynamicImportCount = 0;
  const visit = node => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      if (hasRuntimeImportClause(node.importClause)) {
        staticSpecifiers.push(node.moduleSpecifier.text);
      } else {
        typeOnlySpecifiers.push(node.moduleSpecifier.text);
      }
    } else if (ts.isExportDeclaration(node)
      && node.moduleSpecifier !== undefined
      && ts.isStringLiteral(node.moduleSpecifier)) {
      if (hasRuntimeExportClause(node)) {
        staticSpecifiers.push(node.moduleSpecifier.text);
      } else {
        typeOnlySpecifiers.push(node.moduleSpecifier.text);
      }
    } else if (ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [argument] = node.arguments;
      if (argument !== undefined
        && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) {
        literalDynamicSpecifiers.push(argument.text);
      } else {
        computedDynamicImportCount += 1;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return {
    sourceFile,
    staticSpecifiers,
    literalDynamicSpecifiers,
    typeOnlySpecifiers,
    computedDynamicImportCount,
  };
};

const inspectModuleLoadFileIo = sourceFile => {
  const directBindings = new Map();
  const namespaceBindings = new Map();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)
      || !ts.isStringLiteral(statement.moduleSpecifier)
      || !FILE_IO_MODULES.has(statement.moduleSpecifier.text)
      || statement.importClause === undefined
      || statement.importClause.isTypeOnly) continue;
    const bindings = statement.importClause.namedBindings;
    if (bindings !== undefined && ts.isNamespaceImport(bindings)) {
      namespaceBindings.set(bindings.name.text, statement.moduleSpecifier.text);
    } else if (bindings !== undefined && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        if (element.isTypeOnly) continue;
        directBindings.set(element.name.text, {
          module: statement.moduleSpecifier.text,
          imported: element.propertyName?.text ?? element.name.text,
        });
      }
    }
  }
  const calls = [];
  const visitEvaluation = node => {
    if (ts.isFunctionLike(node) || ts.isClassLike(node)) return;
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && directBindings.has(node.expression.text)) {
        calls.push(directBindings.get(node.expression.text));
      } else if (ts.isPropertyAccessExpression(node.expression)
        && ts.isIdentifier(node.expression.expression)
        && namespaceBindings.has(node.expression.expression.text)) {
        calls.push({
          module: namespaceBindings.get(node.expression.expression.text),
          imported: node.expression.name.text,
        });
      }
    }
    ts.forEachChild(node, visitEvaluation);
  };
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) visitEvaluation(statement);
  }
  return calls;
};

const collectLocalRuntimeImportGraph = async () => {
  const paths = new Set();
  const edges = new Set();
  const literalDynamicEdges = new Set();
  const typeOnlyEdges = new Set();
  const moduleLoadDataPaths = new Set();
  const moduleLoadFileIo = [];
  const computedOwners = new Set();
  const addRuntimeEdge = async (fromPath, specifier, edgeKind = 'static') => {
    if (specifier.startsWith('node:') || EXTERNAL_RUNTIME_SPECIFIERS.has(specifier)) return;
    let imported;
    if (specifier === '@zev2/shared') {
      moduleLoadDataPaths.add(SHARED_PACKAGE_MANIFEST);
      const packageManifest = JSON.parse(await readFile(
        path.join(REPOSITORY_ROOT, SHARED_PACKAGE_MANIFEST),
        'utf8',
      ));
      assert.equal(packageManifest.exports?.['.']?.import, './dist/index.js');
      imported = 'packages/shared/dist/index.js';
    } else if (specifier.startsWith('.')) {
      imported = await resolveLocalImport(fromPath, specifier);
      assert.notEqual(imported, null, `unresolved local import: ${fromPath} -> ${specifier}`);
    } else {
      assert.fail(`unapproved bare runtime import: ${fromPath} -> ${specifier}`);
    }
    const edge = `${fromPath}\u0000${imported}`;
    edges.add(edge);
    if (edgeKind === 'literal-dynamic') literalDynamicEdges.add(edge);
    await visit(imported);
  };
  const visit = async relativePath => {
    if (paths.has(relativePath)) return;
    paths.add(relativePath);
    const source = await readFile(path.join(REPOSITORY_ROOT, relativePath), 'utf8');
    const inspection = inspectRuntimeModuleSpecifiers(relativePath, source);
    for (const specifier of inspection.typeOnlySpecifiers) {
      typeOnlyEdges.add(`${relativePath}\u0000${specifier}`);
    }
    for (const specifier of inspection.staticSpecifiers) {
      await addRuntimeEdge(relativePath, specifier);
    }
    for (const specifier of inspection.literalDynamicSpecifiers) {
      await addRuntimeEdge(relativePath, specifier, 'literal-dynamic');
    }
    if (inspection.computedDynamicImportCount > 0) {
      const fixed = COMPUTED_DYNAMIC_IMPORTS.get(relativePath);
      assert.notEqual(fixed, undefined,
        `unfixed computed dynamic import owner: ${relativePath}`);
      assert.equal(inspection.computedDynamicImportCount, fixed.callCount);
      computedOwners.add(relativePath);
      for (const target of fixed.targets) {
        const edge = `${relativePath}\u0000${target}`;
        edges.add(edge);
        await visit(target);
      }
    }
    const dataPath = MODULE_LOAD_DATA_OWNERS.get(relativePath);
    if (dataPath !== undefined) moduleLoadDataPaths.add(dataPath);
    for (const call of inspectModuleLoadFileIo(inspection.sourceFile)) {
      moduleLoadFileIo.push({path: relativePath, ...call});
    }
  };
  for (const start of LOCAL_IMPORT_STARTS) await visit(start);
  assert.deepEqual([...computedOwners].sort(), [...COMPUTED_DYNAMIC_IMPORTS.keys()].sort());
  return {
    paths: [...paths].sort(),
    edgeCount: edges.size,
    literalDynamicEdgeCount: literalDynamicEdges.size,
    typeOnlyEdges: [...typeOnlyEdges].sort(),
    moduleLoadDataPaths: [...moduleLoadDataPaths].sort(),
    moduleLoadFileIo: moduleLoadFileIo.sort((left, right) => (
      `${left.path}\u0000${left.module}\u0000${left.imported}`
        .localeCompare(`${right.path}\u0000${right.module}\u0000${right.imported}`)
    )),
  };
};
const jsonBinding = (schemaVersion, path) => ({
  schemaVersion,
  path,
  fileSha256: SHA,
  canonicalSha256: SHA,
});
const mediaBinding = path => ({path, fileSha256: SHA});
const runtimeBinding = role => ({
  path: `/opt/zevo/${role}`,
  version: `${role}-v1`,
  fileSha256: SHA,
});

const makeJob = () => ({
  schemaVersion: 'zevo-title-output-job-v001',
  jobId: 'candidate-59-title-landscape-v001',
  outputId: 'candidate-59-title-landscape-v001-output',
  titleMeaningPackageBinding: jsonBinding(
    'zev-meaning-information-package-v001',
    'evals/clip_composition/outputs/presentation/meaning-information-packages/'
      + 'candidate-59-title-v001/meaning-information-package.json',
  ),
  sourceOutput: {
    manifest: jsonBinding(
      'presentation-output-render-manifest-v001',
      'evals/clip_composition/outputs/presentation/meaning-output-renders/'
        + 'candidate-59-landscape-output/presentation-output-render-manifest-v001.json',
    ),
    renderPlan: jsonBinding(
      'presentation-output-render-plan-v001',
      'evals/clip_composition/outputs/presentation/meaning-output-control/'
        + 'candidate-59-landscape/render-plan.json',
    ),
    qc: jsonBinding(
      'presentation-output-render-qc-v001',
      'evals/clip_composition/outputs/presentation/meaning-output-renders/'
        + 'candidate-59-landscape-output/presentation-output-render-qc-v001.json',
    ),
    video: mediaBinding(
      'evals/clip_composition/outputs/presentation/meaning-output-renders/'
        + 'candidate-59-landscape-output/presentation-output-rendered-v001.mp4',
    ),
  },
  styleRegistryBinding: jsonBinding(
    'zevo-title-style-registry-v001',
    'evals/clip_composition/registries/presentation/'
      + 'zevo-title-style-registry-v004/registry.json',
  ),
  profileId: 'landscape-title-v001',
  publication: {
    outputRoot: `${ZEVO_TITLE_OUTPUT_ROOT_V001}/candidate-59-title-landscape-v001-output`,
  },
  runtimeProfile: {
    node: runtimeBinding('node'),
    tsx: runtimeBinding('tsx'),
    remotion: runtimeBinding('remotion'),
    browser: runtimeBinding('browser'),
    ffmpeg: runtimeBinding('ffmpeg'),
    ffprobe: runtimeBinding('ffprobe'),
    imageMagick: runtimeBinding('imageMagick'),
  },
  implementationBindings: ZEVO_TITLE_IMPLEMENTATION_BINDINGS_V001.map(({role, path}) => ({
    path,
    fileSha256: SHA,
    role,
  })),
});

test('ZTOR001 importは自動起動せずpure入口を公開し既知data読取だけを束縛する', async () => {
  assert.equal(typeof inspectZevoTitleRunnerLaunchV001, 'function');
  assert.equal(typeof inspectZevoTitleJobTopologyV001, 'function');
  const graph = await collectLocalRuntimeImportGraph();
  assert.deepEqual(graph.moduleLoadDataPaths, [...MODULE_LOAD_DATA_BINDINGS].sort());
  assert.deepEqual(graph.moduleLoadFileIo, [{
    path: 'evals/clip_composition/presentation_source_speaker_policy_v001.mjs',
    module: 'node:fs',
    imported: 'readFileSync',
  }]);
  assert.deepEqual(
    ZEVO_TITLE_IMPLEMENTATION_BINDINGS_V001
      .filter(binding => MODULE_LOAD_DATA_BINDINGS.includes(binding.path))
      .map(binding => binding.path)
      .sort(),
    [...MODULE_LOAD_DATA_BINDINGS].sort(),
  );
});

test('ZTOR002 正式job pathは版付きroot直下のexact fileだけを受理する', () => {
  const jobPath = `${ZEVO_TITLE_OUTPUT_JOB_ROOT_V001}/job-v001/formal-title-output-job.json`;
  assert.deepEqual(inspectZevoTitleRunnerLaunchV001({argv: [jobPath], env: {}}), {
    status: 'passed',
    jobPath,
    jobId: 'job-v001',
  });
});

test('ZTOR003 CLIはjob引数ちょうど1件だけを受理しfatalを閉語彙で返す', async () => {
  assert.equal(inspectZevoTitleRunnerLaunchV001({argv: [], env: {}}).code,
    'TITLE_OUTPUT_CLI_ARITY_INVALID');
  assert.equal(inspectZevoTitleRunnerLaunchV001({argv: ['a', 'b'], env: {}}).code,
    'TITLE_OUTPUT_CLI_ARITY_INVALID');
  const execution = await runZevoTitleOutputJobV001({
    jobPath: 'outside/formal-title-output-job.json',
    env: {},
  });
  assert.equal(execution.exitCode, 2);
  assert.deepEqual(execution.result.fatalObservation, {
    schemaVersion: 'presentation-fatal-observation-v002',
    innerStage: 'unknown',
    targetFile: null,
    innerCode: 'UNCLASSIFIED',
  });
  assert.equal(JSON.stringify(execution.result).includes('outside/'), false);
});

test('ZTOR004 job root外・nested・traversal pathを拒否する', () => {
  const rejected = [
    'tmp/job-v001/formal-title-output-job.json',
    `${ZEVO_TITLE_OUTPUT_JOB_ROOT_V001}/job-v001/nested/formal-title-output-job.json`,
    `${ZEVO_TITLE_OUTPUT_JOB_ROOT_V001}/../job-v001/formal-title-output-job.json`,
  ];
  for (const jobPath of rejected) {
    assert.equal(inspectZevoTitleRunnerLaunchV001({argv: [jobPath], env: {}}).code,
      'TITLE_OUTPUT_JOB_PATH_INVALID');
  }
});

test('ZTOR005 NODE_OPTIONSは空値を含め存在自体を拒否する', () => {
  const jobPath = `${ZEVO_TITLE_OUTPUT_JOB_ROOT_V001}/job-v001/formal-title-output-job.json`;
  assert.equal(inspectZevoTitleRunnerLaunchV001({
    argv: [jobPath], env: {NODE_OPTIONS: ''},
  }).code, 'TITLE_OUTPUT_NODE_OPTIONS_PRESENT');
  assert.equal(inspectZevoTitleRunnerLaunchV001({argv: [jobPath], env: {}}).status,
    'passed');
});

test('ZTOR006 成果物集合は6名称へexact固定される', () => {
  assert.deepEqual(ZEVO_TITLE_OUTPUT_ARTIFACT_NAMES_V001, {
    video: 'title-rendered-v001.mp4',
    overlays: 'overlays',
    plan: 'title-display-plan-v001.json',
    applicationResults: 'title-application-results-v001.json',
    qc: 'title-output-qc-v001.json',
    manifest: 'title-output-manifest-v001.json',
  });
  assert.equal(Object.isFrozen(ZEVO_TITLE_OUTPUT_ARTIFACT_NAMES_V001), true);
});

test('ZTOR007 output rootはoutputIdから一意に導出する', () => {
  const job = makeJob();
  assert.deepEqual(inspectZevoTitleJobTopologyV001(job), {
    status: 'passed',
    outputRoot: `${ZEVO_TITLE_OUTPUT_ROOT_V001}/${job.outputId}`,
  });
  job.publication.outputRoot = `${ZEVO_TITLE_OUTPUT_ROOT_V001}/different-output`;
  assert.equal(inspectZevoTitleJobTopologyV001(job).code,
    'TITLE_OUTPUT_JOB_INVALID');
});

test('ZTOR008 source manifest・QC・videoは同じ既存v1 rootへ束縛する', () => {
  const job = makeJob();
  job.sourceOutput.qc.path =
    'evals/clip_composition/outputs/presentation/meaning-output-renders/'
      + 'other-output/presentation-output-render-qc-v001.json';
  assert.equal(inspectZevoTitleJobTopologyV001(job).code,
    'TITLE_OUTPUT_PATH_TOPOLOGY_INVALID');
});

test('ZTOR009 source planは既存control root外を拒否する', () => {
  const job = makeJob();
  job.sourceOutput.renderPlan.path =
    'evals/clip_composition/outputs/presentation/meaning-output-renders/'
      + 'candidate-59-landscape-output/render-plan.json';
  assert.equal(inspectZevoTitleJobTopologyV001(job).code,
    'TITLE_OUTPUT_PATH_TOPOLOGY_INVALID');
});

test('ZTOR010 title packageは意味情報package正式root外を拒否する', () => {
  const job = makeJob();
  job.titleMeaningPackageBinding.path = 'tmp/meaning-information-package.json';
  assert.equal(inspectZevoTitleJobTopologyV001(job).code,
    'TITLE_OUTPUT_PATH_TOPOLOGY_INVALID');
  const wrongRegistry = makeJob();
  wrongRegistry.styleRegistryBinding.path =
    'evals/clip_composition/registries/presentation/other-title-registry/registry.json';
  assert.equal(inspectZevoTitleJobTopologyV001(wrongRegistry).code,
    'TITLE_OUTPUT_PATH_TOPOLOGY_INVALID');
});

test('ZTOR011 source v1 schemaと成果物名を変更しない', () => {
  const job = makeJob();
  assert.equal(job.sourceOutput.manifest.schemaVersion,
    'presentation-output-render-manifest-v001');
  assert.equal(job.sourceOutput.renderPlan.schemaVersion,
    'presentation-output-render-plan-v001');
  assert.equal(job.sourceOutput.qc.schemaVersion,
    'presentation-output-render-qc-v001');
  assert.match(job.sourceOutput.video.path, /presentation-output-rendered-v001\.mp4$/u);
});

test('ZTOR012 runnerは共通描画coreを一度呼び、no-replace commitを使う', async () => {
  const source = await readFile(
    new URL('./run_presentation_output_title_job_v001.ts', import.meta.url),
    'utf8',
  );
  assert.equal((source.match(/executeValidatedPresentationDrawAndQcV001\(\{/gu) ?? []).length, 1);
  assert.equal((source.match(/commitValidatedPresentationArtifactsV002\(\{/gu) ?? []).length, 1);
  assert.equal((source.match(/evaluatePresentationRendererQcWithProfileV001\(/gu) ?? []).length, 1);
  assert.match(source,
    /planFile: ZEVO_TITLE_OUTPUT_ARTIFACT_NAMES_V001\.plan/u);
  assert.doesNotMatch(source, /publishPresentationArtifactsV002/u);
});

test('ZTOR013 source成果物へのwrite・rename・unlink経路を持たない', async () => {
  const source = await readFile(
    new URL('./run_presentation_output_title_job_v001.ts', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(source, /\b(?:rename|unlink|rm)\s*\(/u);
  assert.match(source, /readPresentationMeaningWorkspaceFileStableV001/u);
});

test('ZTOR014 registry・font・license・source・implementation・runtimeを実読取監査する', async () => {
  const source = await readFile(
    new URL('./run_presentation_output_title_job_v001.ts', import.meta.url),
    'utf8',
  );
  for (const marker of [
    'observeJsonBinding(workspaceRoot, job.styleRegistryBinding)',
    'verifyRegistryAssets(workspaceRoot, registry)',
    'observeWorkspaceMediaBinding(workspaceRoot, job.sourceOutput.video)',
    'observeImplementationBindings(workspaceRoot, job.implementationBindings)',
    'observeRuntimeBinding(job.runtimeProfile[role])',
    'runner/public/font/${asset.fileName}',
  ]) assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
  const cliPath = '/workspace/runner/node_modules/@remotion/cli/remotion-cli.js';
  const launcher = Buffer.from(
    '#!/bin/sh\nexec node "$basedir/../@remotion/cli/remotion-cli.js" "$@"\n'
      + `# cmd-shim-target=${cliPath}\n`,
  );
  assert.deepEqual(inspectZevoTitleRemotionLauncherV001({
    launcherBytes: launcher,
    expectedCliPath: cliPath,
  }), {status: 'passed'});
  assert.equal(inspectZevoTitleRemotionLauncherV001({
    launcherBytes: launcher,
    expectedCliPath: `${cliPath}.other`,
  }).status, 'rejected');
  const actualLauncher = await readFile(
    new URL('../../runner/node_modules/.bin/remotion', import.meta.url),
  );
  const actualCliPath = fileURLToPath(
    new URL('../../runner/node_modules/@remotion/cli/remotion-cli.js', import.meta.url),
  );
  assert.deepEqual(inspectZevoTitleRemotionLauncherV001({
    launcherBytes: actualLauncher,
    expectedCliPath: actualCliPath,
  }), {status: 'passed'});
});

test('ZTOR015 implementation graphの欠落・余分・role-path swapを拒否する', async () => {
  assert.equal(ZEVO_TITLE_IMPLEMENTATION_ROLES_V001.length, 56);
  const graph = await collectLocalRuntimeImportGraph();
  assert.equal(graph.paths.length, 54);
  assert.equal(graph.edgeCount, 139);
  assert.equal(graph.literalDynamicEdgeCount, 2);
  assert.equal(
    graph.typeOnlyEdges.includes(
      'evals/clip_composition/presentation_renderer_entry_v001.tsx'
        + '\u0000../../runner/src/telop/telop-render-model',
    ),
    true,
  );
  assert.equal(graph.paths.includes('runner/src/telop/telop-style.ts'), false);
  const codeBindings = ZEVO_TITLE_IMPLEMENTATION_BINDINGS_V001.filter(
    binding => !MODULE_LOAD_DATA_BINDINGS.includes(binding.path),
  );
  assert.equal(codeBindings.length, 54);
  assert.deepEqual(
    graph.paths,
    codeBindings.map(binding => binding.path).sort(),
  );
  const missing = makeJob();
  missing.implementationBindings.pop();
  assert.equal(inspectZevoTitleJobTopologyV001(missing).code, 'TITLE_OUTPUT_JOB_INVALID');

  const extra = makeJob();
  extra.implementationBindings.push({
    path: 'evals/clip_composition/unapproved-title-helper.mjs',
    fileSha256: SHA,
    role: 'unapproved-title-helper',
  });
  assert.equal(inspectZevoTitleJobTopologyV001(extra).code, 'TITLE_OUTPUT_JOB_INVALID');

  const swapped = makeJob();
  [swapped.implementationBindings[0].path, swapped.implementationBindings[1].path] = [
    swapped.implementationBindings[1].path,
    swapped.implementationBindings[0].path,
  ];
  assert.equal(inspectZevoTitleJobTopologyV001(swapped).code, 'TITLE_OUTPUT_JOB_INVALID');
});

test('ZTOR016 source manifestの全JSON・media参照を実読取し終了前に再照合する', async () => {
  const source = await readFile(
    new URL('./run_presentation_output_title_job_v001.ts', import.meta.url),
    'utf8',
  );
  for (const marker of [
    'sourceManifest.formalOutputJobBinding',
    'sourceManifest.outputRequestBinding',
    'sourceManifest.acceptanceReportBinding',
    'sourceManifest.meaningPackageBinding',
    'sourceManifest.baseMediaBinding.baseMedia',
    'sourceManifest.baseMediaBinding.timeline',
    'sourceManifest.baseMediaBinding.generationManifest',
    'sourceManifest.baseMediaBinding.validationReceipt',
    'sourceManifest.applicationResultsBinding',
  ]) {
    assert.ok(source.split(marker).length >= 3, `${marker} must be observed and tracked`);
  }
  assert.match(source, /trackedBindingsFor\(\{job, jobBinding, sourceManifest\}\)/u);
  assert.match(source, /rereadTracked\(\{/u);
  const manifest = JSON.parse(await readFile(
    new URL('./outputs/presentation/meaning-output-renders/'
      + 'qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v003-output/'
      + 'presentation-output-render-manifest-v001.json', import.meta.url),
    'utf8',
  ));
  const formalJob = JSON.parse(await readFile(
    new URL(`../../${manifest.formalOutputJobBinding.path}`, import.meta.url),
    'utf8',
  ));
  const request = JSON.parse(await readFile(
    new URL(`../../${manifest.outputRequestBinding.path}`, import.meta.url),
    'utf8',
  ));
  assert.equal(validateZevoTitleFrozenSourceFormalJobV001({
    formalJob,
    request,
    manifest,
  }), true);
  const invalidGenerationJob = structuredClone(formalJob);
  invalidGenerationJob.executionPolicy.allowRetry = true;
  assert.equal(validateZevoTitleFrozenSourceFormalJobV001({
    formalJob: invalidGenerationJob,
    request,
    manifest: {...manifest, implementationBindings:
      invalidGenerationJob.implementationBindings},
  }), false);
});
