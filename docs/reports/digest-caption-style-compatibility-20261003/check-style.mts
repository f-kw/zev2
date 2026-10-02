/** Setup 26: unchanged saved cues into existing Node-only geometry functions. No production caller. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir, access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = 'runtime/artifacts/digest-caption-style-compatibility-20261003-v001/attempt-001';
const REPORT = 'docs/reports/digest-caption-style-compatibility-20261003';
type Obj = Record<string, unknown>;
type Binding = {path: string; fileSha256: string; sizeBytes: number};
function isObj(v: unknown): v is Obj { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function obj(v: unknown): Obj { assert(isObj(v)); return v; }
function arr(v: unknown): unknown[] { assert(Array.isArray(v)); return v; }
function str(v: unknown): string { assert.equal(typeof v, 'string'); if (typeof v !== 'string') throw Error('not string'); return v; }
function num(v: unknown): number { assert(typeof v === 'number' && Number.isFinite(v)); return v; }
const same = (a: unknown, b: unknown) => assert.deepEqual(a, b);
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const observed = new Map<string, Binding>();
const cache = new Map<string, Obj>();
async function bytes(rel: string, expected?: string) {
  assert(!path.isAbsolute(rel) && !rel.split('/').includes('..'));
  assert(/\.(json|md|mts|mjs|ts|tsx)$/.test(rel), 'metadata/code only');
  const b = await readFile(path.join(ROOT, rel));
  if (expected) assert.equal(sha(b), expected, rel);
  const binding = {path: rel, fileSha256: sha(b), sizeBytes: b.length};
  if (observed.has(rel)) same(observed.get(rel), binding);
  observed.set(rel, binding); return b;
}
async function json(rel: string, expected?: string) {
  const b = await bytes(rel, expected); const v = obj(JSON.parse(b.toString('utf8')));
  cache.set(rel, v); return v;
}
async function ref(value: unknown) { const b = obj(value); return json(str(b.path), str(b.fileSha256)); }
async function save(rel: string, value: unknown) {
  const b = Buffer.from(JSON.stringify(value, null, 2) + '\n');
  await writeFile(path.join(ROOT, rel), b, {flag: 'wx'});
  return {path: rel, fileSha256: sha(b), sizeBytes: b.length};
}
async function main() {
  assert.equal(process.argv[2], 'run'); assert.equal(process.argv.length, 3);
  assert.equal(typeof document, 'undefined', 'existing estimate path only');
  try { await access(path.join(ROOT, OUT)); throw Error('new output already exists'); }
  catch (e) { if (!e || typeof e !== 'object' || !('code' in e) || e.code !== 'ENOENT') throw e; }
  const started = performance.now();
  const evidence = obj(JSON.parse(await readFile(path.join(ROOT, REPORT, 'evidence.json'), 'utf8')));
  await ref(evidence.workOrder);
  const map = await json('runtime/artifacts/digest-caption-plan-timing-20261003-v001/attempt-001/cue-time-map.json', '72eab2201c0bb3e918aabf314ec3c0613f61ef4641a20402db5e7316282a2761');
  const timing = await json('runtime/artifacts/digest-caption-plan-timing-20261003-v001/attempt-001/manifest.json', '36f41a965c891aa5cf35c00c81b2aaf171284a1941d9d9d20a9c64532db44179');
  same(obj(timing.outputBinding).fileSha256, observed.get('runtime/artifacts/digest-caption-plan-timing-20261003-v001/attempt-001/cue-time-map.json')?.fileSha256);
  const display = await ref(map.displayManifestBinding); const prep = await ref(map.inputManifestBinding);
  same(display.inputManifestBinding, map.inputManifestBinding);
  const meaning = await ref(display.meaningBinding);
  const atoms = new Map(arr(meaning.atomOccurrences).map(v => { const a = obj(v); return [str(a.atomOccurrenceId), a]; }));
  const comparePath = 'runtime/artifacts/caption-outline-comparison-20260929-v001/attempt-003/verification.json';
  const compare = await json(comparePath);
  const raster = arr(compare.raster).map(obj).find(r => r.tag === '0-A' && r.label === '0');
  assert(raster, 'saved Normal A candidate missing');
  const props = obj(raster.props), style = obj(props.visualState), textStyle = obj(style.textStyle);
  same(props.schemaVersion, 'presentation-renderer-overlay-props-v001');
  same([textStyle.fontSizePx, textStyle.borderWidthPx, textStyle.glowWidthPx], [144, 8, 4]);
  same(style.background, null); same(style.stateId, 'caption-core-v001');
  same(obj(style.position).preset, 'bottom-center'); same(props.inspectionLineIndex, null);
  assert(!('presentationColorRange' in props) && !('renderVisibleCenterCorrectionPx' in props));
  const inputs = arr(compare.inputs).map(obj);
  for (const name of ['candidate-render-plan.json', 'raster-records.json']) {
    const b = inputs.find(b => str(b.path).endsWith('/' + name)); assert(b);
    const rel = path.relative(ROOT, str(b.path)); const actual = await bytes(rel, str(b.fileSha256)); same(actual.length, b.bytes);
  }
  const oldPlan = cache.get('runtime/artifacts/caption-readability-20260928-preview-v004/candidate-render-plan.json')
    ?? obj(JSON.parse((await bytes('runtime/artifacts/caption-readability-20260928-preview-v004/candidate-render-plan.json')).toString()));
  same(props.canvas, oldPlan.canvas); same(props.layoutRules, oldPlan.layoutRules);
  const originalRecords = arr(JSON.parse((await bytes('runtime/artifacts/caption-readability-20260928-preview-v004/raster-records.json')).toString())).map(obj);
  const original = originalRecords.map(r => obj(r.element)).find(e => e.instructionId === raster.captionId); assert(original);
  const restored = structuredClone(obj(raster.element));
  Object.assign(obj(obj(restored.visualState).textStyle), {borderWidthPx: 4, glowWidthPx: 4}); same(restored, original);
  const inspection = await json('docs/reports/caption-readability-splitting-20260928/current-inspection.json');
  const registryRef = arr(inspection.refs).map(obj).find(r => str(r.path).endsWith('/preset-registry.json')); assert(registryRef);
  const registry = await json(str(registryRef.path), str(registryRef.sha256));
  const font = arr(registry.fontAssets).map(obj).find(f => f.fontAssetId === textStyle.fontAssetId); assert(font);
  same(font.fileName, props.fontFileName); same('zev-renderer-' + str(font.fontAssetId), props.fontFamilyName);
  const declaredFont = arr(inspection.fonts).map(obj).find(f => f.fontAssetId === font.fontAssetId); same(font, declaredFont);
  await bytes('docs/reports/caption-readability-splitting-20260928/human-feedback-20260929-v001.md');
  const toolRef = arr(compare.implementation).map(obj).find(b => str(b.path).endsWith('/tools/digest-quality/caption-outline-comparison.mjs')); assert(toolRef);
  await bytes(path.relative(ROOT, str(toolRef.path)), str(toolRef.fileSha256));
  const implementation = ['evals/clip_composition/presentation_renderer_entry_v001.tsx', 'evals/clip_composition/inspect_presentation_render_layout_v001.ts', 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs', 'evals/clip_composition/render_presentation_v002.mjs', 'evals/clip_composition/presentation_panel_presets_v002.mjs', 'runner/src/telop/text-metrics.ts', 'runner/src/telop/telop-line-break.ts', REPORT + '/check-style.mts'];
  for (const p of implementation) await bytes(p);
  const renderer = await import(pathToFileURL(path.join(ROOT, implementation[0])).href);
  const inspector = await import(pathToFileURL(path.join(ROOT, implementation[1])).href);
  const indexer = await import(pathToFileURL(path.join(ROOT, implementation[2])).href);
  assert.equal(typeof renderer.buildExactTextModel, 'function');
  assert.equal(typeof inspector.inspectPresentationRenderLayoutV001, 'function');
  assert.equal(typeof indexer.indexExplicitLinesV001, 'function');
  const groups = arr(meaning.orderedCandidates).map(obj), responses = arr(display.responses).map(obj);
  same(groups.length, responses.length); const cues = arr(map.cues).map(obj); const diagnosed: Obj[] = [], groupSummary: Obj[] = [];
  const diagnosticStart = performance.now();
  for (const [i, group] of groups.entries()) {
    const r = responses[i]; assert(r); same(r.ordinal, i + 1); same(r.candidateId, group.candidateId); same(r.timelineSegmentId, group.timelineSegmentId);
    assert(arr(prep.outputs).map(obj).some(b => b.path === obj(r.requestBinding).path && b.fileSha256 === obj(r.requestBinding).fileSha256));
    const request = await ref(r.requestBinding), response = await ref(r.responseBinding), result = await ref(r.resultBinding);
    same(response.requestFileSha256, obj(r.requestBinding).fileSha256); same(response.answer, result.answer);
    const rc = arr(obj(response.answer).captions).map(obj); same(rc.length, 1);
    const caption = obj(arr(obj(request.input).captions)[0]); same(rc[0]?.captionId, caption.captionId);
    const boundaries = arr(caption.boundaryCandidates).map(obj), answers = arr(rc[0]?.cues).map(obj);
    const groupCues = cues.filter(c => c.groupOrdinal === i + 1); same(groupCues.length, answers.length);
    same(groupCues.flatMap(c => arr(c.atomOccurrenceIds)), group.atomOccurrenceIds);
    let from = 0; const current: Obj[] = [];
    for (const [j, cue] of groupCues.entries()) {
      same(cue.cueOrdinal, j + 1); same(cue.captionId, caption.captionId);
      same(cue.candidateId, group.candidateId); same(cue.timelineSegmentId, group.timelineSegmentId);
      same(cue.requestBinding, r.requestBinding); same(cue.responseBinding, r.responseBinding); same(cue.resultBinding, r.resultBinding);
      same(cue.cueEndBoundaryId, answers[j]?.cueEndBoundaryId); same(cue.lineEndBoundaryIds, answers[j]?.lineEndBoundaryIds);
      const lines = arr(cue.lines).map(obj); same(lines.length, arr(cue.lineEndBoundaryIds).length);
      for (const [k, line] of lines.entries()) {
        same(line.lineEndBoundaryId, arr(cue.lineEndBoundaryIds)[k]);
        const end = boundaries.findIndex(b => b.boundaryId === line.lineEndBoundaryId); assert(end >= from);
        const text = boundaries.slice(from, end + 1).map(b => str(b.text)).join(''); same(text, line.text); from = end + 1;
        const lineAtoms = arr(line.atomOccurrenceIds).map(id => { const a = atoms.get(str(id)); assert(a); return a; });
        same(lineAtoms.map(a => a.text).join(''), line.text); same(lineAtoms.map(a => a.sourceSegmentId), line.sourceSegmentIds);
      }
      same(lines.flatMap(l => arr(l.atomOccurrenceIds)), cue.atomOccurrenceIds); same(lines.flatMap(l => arr(l.sourceSegmentIds)), cue.sourceSegmentIds);
      const index = obj(indexer.indexExplicitLinesV001(lines.map(l => str(l.text)))); same(index.status, 'passed'); same(index.sourceText, lines.map(l => str(l.text)).join(''));
      const diagnosticId = 'diagnostic-group-' + String(i + 1) + '-cue-' + String(j + 1);
      const diagnosticProps = {...structuredClone(props), instructionId: diagnosticId, text: index.sourceText, indexedLines: index.indexedLines};
      const exact = obj(renderer.buildExactTextModel(diagnosticProps));
      const layout = obj(inspector.inspectPresentationRenderLayoutV001({canvas: props.canvas, overlays: [diagnosticProps]}));
      assert(layout.status === 'passed' || layout.status === 'failed');
      const item = obj(arr(layout.items)[0]), canvas = obj(props.canvas), safe = obj(canvas.safeAreaPx);
      const lineGeometry = arr(item.lineRects).map((value, k) => {
        const rect = obj(value), reasons: string[] = [];
        if (num(rect.left) < num(safe.left)) reasons.push('left');
        if (num(rect.top) < num(safe.top)) reasons.push('top');
        if (num(rect.right) > num(canvas.width) - num(safe.right)) reasons.push('right');
        if (num(rect.bottom) > num(canvas.height) - num(safe.bottom)) reasons.push('bottom');
        return {lineIndex: k, line: lines[k], rect, safeAreaSidesExceeded: reasons};
      });
      const row = {...cue, styleCandidateReference: {path: comparePath, field: 'raster[tag=0-A,label=0].props', fileSha256: observed.get(comparePath)?.fileSha256}, compatibility: layout.status === 'passed' ? 'compatible' : 'incompatible', measurement: 'existing-estimated-width-without-document', existingInspection: layout, existingTextModel: exact, lineGeometry};
      diagnosed.push(row); current.push(row);
    }
    same(from, boundaries.length);
    const failed = current.filter(c => c.compatibility === 'incompatible');
    groupSummary.push({groupOrdinal: i + 1, candidateId: group.candidateId, timelineSegmentId: group.timelineSegmentId, requestBinding: r.requestBinding, responseBinding: r.responseBinding, cueCount: current.length, compatible: current.length - failed.length, incompatible: failed.length, unassessable: 0, incompatibleCueOrdinals: failed.map(c => c.cueOrdinal), action: failed.length ? 'new-technical-condition-preparation-needed-only-for-listed-cues' : 'unchanged-answer-is-geometrically-reusable-under-this-candidate'});
  }
  same(diagnosed.length, cues.length); same(diagnosed.map(c => { const {styleCandidateReference, compatibility, measurement, existingInspection, existingTextModel, lineGeometry, ...original} = c; return original; }), cues);
  const summary = {groups: groups.length, cues: diagnosed.length, lines: cues.reduce((n, c) => n + arr(c.lines).length, 0), atoms: cues.reduce((n, c) => n + arr(c.atomOccurrenceIds).length, 0), compatible: diagnosed.filter(c => c.compatibility === 'compatible').length, incompatible: diagnosed.filter(c => c.compatibility === 'incompatible').length, unassessable: 0, minimalAffectedRequestOrdinals: groupSummary.filter(g => num(g.incompatible) > 0).map(g => g.groupOrdinal), whollyReusableRequestOrdinals: groupSummary.filter(g => g.incompatible === 0).map(g => g.groupOrdinal)};
  const diagnosticMs = performance.now() - diagnosticStart;
  const admission = evidence.admission;
  const output = {schemaVersion: 'digest-caption-style-compatibility-diagnostic-v001', status: 'complete-diagnostic-not-human-adoption', scopeBinding: evidence.workOrder, mapBinding: timing.outputBinding, displayManifestBinding: map.displayManifestBinding, inputManifestBinding: map.inputManifestBinding, technicalCandidate: {source: observed.get(comparePath), field: 'raster[tag=0-A,label=0].props', props, fontLedgerBinding: {...observed.get(str(registryRef.path)), field: 'fontAssets[fontAssetId=' + str(font.fontAssetId) + ']'}, declaredFont: font, fontBytesReadOrVerified: false, original4By4ToA8By4Only: true, rendererImplementationBindings: implementation.map(p => observed.get(p)), formalStyleAdopted: false}, summary, requestSummary: groupSummary, cues: diagnosed, admission, unchangedClockSummary: map.summary, isFormalRendererInput: false, limitations: ['Node document-free estimated widths; no physical glyph/raster/alpha observation', 'No new request/answer or automatic wrapping/shrinking', 'Original 36-width answers remain accepted under their original condition', 'Missing background references/formal ROOT connection/video permission remain separate']};
  await mkdir(path.dirname(path.join(ROOT, OUT)), {recursive: true}); await mkdir(path.join(ROOT, OUT));
  const outputBinding = await save(OUT + '/compatibility.json', output);
  const rereadStart = performance.now(), reread = await readFile(path.join(ROOT, outputBinding.path));
  same(sha(reread), outputBinding.fileSha256); same(reread.length, outputBinding.sizeBytes); same(JSON.parse(reread.toString()), output);
  const readbackMs = performance.now() - rereadStart;
  for (const b of observed.values()) { const now = await readFile(path.join(ROOT, b.path)); same(now.length, b.sizeBytes); same(sha(now), b.fileSha256); }
  const manifest = {schemaVersion: 'digest-caption-style-compatibility-bundle-v001', scopeBinding: evidence.workOrder, outputBinding, summary, inputAndImplementationBindings: [...observed.values()], oldInputsUnchanged: true, readback: {count: 1, objectEqual: true, bytesAndShaEqual: true, readbackMs}, history: {product: 6, setup: 26}, admission, elapsed: {diagnosticMs, totalBeforeManifestMs: performance.now() - started}, effects: {mediaAndFontBinaryRead: 0, mediaCopies: 0, rendering: 0, rejudgment: 0, requestOrResponseChanges: 0, productChanges: 0, apiCalls: 0}};
  const manifestBinding = await save(OUT + '/manifest.json', manifest);
  console.log(JSON.stringify({status: output.status, outputBinding, manifestBinding, summary, observedInputs: observed.size, diagnosticMs, readbackMs}));
}
await main();
