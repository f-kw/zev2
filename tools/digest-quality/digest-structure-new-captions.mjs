/** New intro/closure only. Saved transcript bytes and the existing 7A resolver
 * own text/clock/partition semantics; existing main captions never enter here. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFile, writeFile, realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {canonicalJson, canonicalSha256} from './clock.mjs';
import {buildCaptionReadabilityPlanV001, restoreCaptionReadabilityPlanV001,
  captionReadabilityMeasurementContextSha256V001} from './caption-readability-plan.mjs';
import {READABILITY_CANDIDATE_PROFILE_V001} from './caption-readability-candidate.mjs';
import {indexExplicitLinesV001} from '../../evals/clip_composition/presentation_renderer_text_layout_v001.mjs';
import {frameBoundaryWithVideoOffsetV001, sourceEndFrameBoundaryWithVideoOffsetV001,
  logicalSourceFrameCountV002, videoPresentationOffsetMsV001} from '../../evals/clip_composition/presentation_base_media_timeline_v004.mjs';
import {validatePresentationBaseMediaSegmentPlanV002} from '../../evals/clip_composition/presentation_base_media_build_v003.mjs';
import {projectCaptionIntervalV001} from '../../evals/clip_composition/presentation_orchestration_projection_v001.mjs';
import {buildPresentationRendererOverlayAdapterV001} from '../../evals/clip_composition/render_presentation_v002.mjs';

const VERSION = 'digest-structure-new-captions-v001', MEASURE = 'digest-structure-new-caption-widths-v001';
const clone = structuredClone, sha = bytes => createHash('sha256').update(bytes).digest('hex');
const same = (a, b, label) => assert.equal(canonicalJson(a), canonicalJson(b), label);
const integer = n => Number.isSafeInteger(n) && n >= 0;
const ownPath = fileURLToPath(import.meta.url);
const bound = async file => {const bytes = await readFile(file); return {path: file, bytes: bytes.length, fileSha256: sha(bytes)};};
const seal = body => ({...body, canonicalSha256: canonicalSha256(body)});
const verifySeal = value => {const {canonicalSha256: saved, ...body} = value; assert.equal(saved, canonicalSha256(body), 'saved envelope changed');};
function indexed(text) {const result = indexExplicitLinesV001([text]); assert.equal(result.status, 'passed'); return result.indexedLines;}

/** This checks only the source-to-Digest clock. The new 540p background receipt
 * owns media validation; the old 1080p timeline validator fixes an MP4 filename
 * and must neither be bypassed nor fed a fabricated name for this NUT media. */
function validateCaptionClockEnvelope(timeline) {
  const clock = timeline.sourceFrameClock, fps = {'30/1': 30, '60/1': 60}[clock?.inputFrameRate];
  assert(fps && clock.logicalFrameRate === '30/1', 'unsupported source frame clock');
  assert.equal(clock.extractionRuleId, fps === 60 ? 'source-frame-60fps-global-even-v001' : 'source-frame-30fps-identity-v001');
  assert(integer(clock.decodedFrameCount) && clock.decodedFrameCount > 0);
  assert.equal(clock.containerStartTimeMs, 0);
  assert(integer(clock.videoFirstPts) && integer(clock.videoPtsStep) && clock.videoPtsStep > 0);
  assert(integer(clock.videoPresentationOffsetMs));
  assert.equal(clock.videoPresentationOffsetMs, videoPresentationOffsetMsV001({firstPts: clock.videoFirstPts,
    timeBase: clock.videoStreamTimeBase, containerStartTimeMs: clock.containerStartTimeMs}), 'source presentation offset differs');
  assert(Array.isArray(timeline.segments) && timeline.segments.length > 0);
  const checked = validatePresentationBaseMediaSegmentPlanV002(timeline.segments.map(s => ({
    sourceStartMs: s.sourceStartMs, sourceEndMs: s.sourceEndMs})), {fps, decodedFrameCount: clock.decodedFrameCount,
    logicalFrameCount: logicalSourceFrameCountV002(clock.inputFrameRate, clock.decodedFrameCount),
    presentationOffsetMs: clock.videoPresentationOffsetMs});
  assert.equal(checked.status, 'passed', 'invalid source interval plan: ' + JSON.stringify(checked.violations));
  const fields = ['segmentId', 'sourceStartMs', 'sourceEndMs', 'sourceStartFrame30', 'sourceEndFrame30', 'outputStartFrame', 'outputEndFrame'];
  const clockFields = segment => Object.fromEntries(fields.map(key => [key, segment[key]]));
  same(timeline.segments.map(clockFields), checked.mappings.map(clockFields), 'saved base clock differs from source conversion');
  assert(typeof timeline.baseMedia?.path === 'string' && timeline.baseMedia.path.length > 0, 'actual base media path required');
  assert.equal(timeline.baseMedia.frameRate, '30/1');
  assert.equal(timeline.baseMedia.expectedFrameCount, checked.mappings.at(-1).outputEndFrame, 'base clock length differs');
}

function mapNewCaptionInterval(timeline, sourceStartMs, sourceEndMs) {
  assert(integer(sourceStartMs) && integer(sourceEndMs) && sourceStartMs < sourceEndMs);
  const containing = timeline.segments.filter(s => s.sourceStartMs <= sourceStartMs && sourceEndMs <= s.sourceEndMs);
  assert.equal(containing.length, 1, 'new caption must map to exactly one source interval');
  const segment = containing[0], clock = timeline.sourceFrameClock;
  const first = frameBoundaryWithVideoOffsetV001(sourceStartMs, clock.videoPresentationOffsetMs);
  const end = sourceEndFrameBoundaryWithVideoOffsetV001(sourceEndMs, clock);
  assert(first < end && first >= segment.sourceStartFrame30 && end <= segment.sourceEndFrame30, 'invalid new caption frame envelope');
  return {timelineSegmentId: segment.segmentId, startFrame: segment.outputStartFrame + first - segment.sourceStartFrame30,
    endFrameExclusive: segment.outputStartFrame + end - segment.sourceStartFrame30};
}

/** projection:null deliberately emits the pre-connection Digest clock, so the
 * caller can combine old/new captions before constructing one final projection. */
export function prepareDigestStructureNewCaptionsV001({transcript, segments, baseTimeline, projection = null,
  baseTimelineBytes = null, normalTemplate, registry, semanticDecisions}) {
  assert(Array.isArray(transcript?.segments) && Array.isArray(segments) && segments.length > 0);
  assert(segments.length <= 2 && new Set(segments.map(s => s.role)).size === segments.length,
    'only one intro and one closure may be generated');
  const p = READABILITY_CANDIDATE_PROFILE_V001, template = normalTemplate.element;
  assert.equal(template.kind, 'speech-caption');
  for (const key of ['presentationColorRange', 'presentationPreset', 'presentationPulse', 'presentationMotion', 'overlaySha256'])
    assert(!Object.hasOwn(template, key), 'new captions require a true normal template');
  assert.equal(template.visualState.background, null);
  for (const [key, value] of Object.entries({fontSizePx: p.normalFontSizePx, borderWidthPx: p.borderWidthPx,
    glowWidthPx: p.glowWidthPx, borderColor: p.outlineColor, glowColor: p.outlineColor}))
    assert.equal(template.visualState.textStyle[key], value, 'new captions must use the saved 7A normal style');
  same(normalTemplate.canvas.safeAreaPx, p.safeAreaPx, '7A safe area differs');
  assert.equal(normalTemplate.canvas.width, 1920); assert.equal(normalTemplate.canvas.height, 1080); assert.equal(normalTemplate.canvas.fps, 30);
  assert.equal(normalTemplate.layoutRules.horizontalSafeMarginRatio, p.horizontalSafeMarginRatio);
  for (const side of ['entry', 'exit']) same(template.transition[side], {type: 'alpha-fade', frames: 4}, 'saved fade differs');
  validateCaptionClockEnvelope(baseTimeline);
  const segmentIds = new Map(baseTimeline.segments.map(s => [s.segmentId, s]));
  const sourceById = new Map();
  for (const atom of transcript.segments) {assert(!sourceById.has(atom.id), 'duplicate source fragment'); sourceById.set(atom.id, atom);}
  if (projection !== null) {
    assert(baseTimelineBytes !== null, 'projected input needs original timeline bytes');
    same(JSON.parse(Buffer.from(baseTimelineBytes).toString('utf8')), baseTimeline, 'timeline bytes differ');
    assert.equal(sha(Buffer.from(baseTimelineBytes)), projection.sourceClock.timelineRef.fileSha256, 'projection timeline binding differs');
  }
  const normalPlan = {schemaVersion: 'presentation-output-common-core-plan-v001', format: 'normal-landscape',
    canvas: clone(normalTemplate.canvas), layoutRules: clone(normalTemplate.layoutRules), elements: []};
  const captions = [], measurementRequests = [];
  const props = buildPresentationRendererOverlayAdapterV001({remotionPath: '/not-executed/remotion',
    chromiumPath: '/not-executed/browser', processObserver: {run() {throw Error('pure props only');}}}).buildProps;
  assert(Array.isArray(semanticDecisions) && semanticDecisions.length === segments.length, 'semantic decision coverage differs');
  for (const [index, requested] of segments.entries()) {
    assert(['intro', 'closure'].includes(requested.role), 'existing main is not a new caption');
    const segment = segmentIds.get(requested.segmentId); assert(segment, 'unknown new base segment');
    assert(integer(requested.startSourceSegmentId) && integer(requested.endSourceSegmentId));
    const original = transcript.segments.filter(a => a.id >= requested.startSourceSegmentId && a.id <= requested.endSourceSegmentId);
    assert(original.length === requested.endSourceSegmentId - requested.startSourceSegmentId + 1, 'new source fragment gap');
    original.forEach((a, i) => {
      assert.equal(a.id, requested.startSourceSegmentId + i, 'new source fragment order');
      assert(typeof a.text === 'string' && a.text.length > 0 && integer(a.startMs) && integer(a.endMs) && a.startMs <= a.endMs);
      assert(!i || a.startMs >= original[i - 1].endMs, 'overlapping source fragment clock');
    });
    assert.equal(original[0].startMs, requested.sourceStartMs); assert.equal(original.at(-1).endMs, requested.sourceEndMs);
    assert.equal(requested.sourceStartMs, segment.sourceStartMs); assert.equal(requested.sourceEndMs, segment.sourceEndMs);
    const outer = mapNewCaptionInterval(baseTimeline, requested.sourceStartMs, requested.sourceEndMs);
    assert.equal(outer.timelineSegmentId, requested.segmentId);
    const captionId = '7b-' + requested.role + '-0001';
    let shift = 0;
    if (projection !== null) {
      const displayed = projectCaptionIntervalV001({projection, caption: {clock: 'digest-original',
        sourceClockSha256: projection.sourceClockSha256, captionId, startFrame: outer.startFrame,
        endFrameExclusive: outer.endFrameExclusive}});
      shift = displayed.startFrame - outer.startFrame;
      assert.equal(displayed.endFrameExclusive - outer.endFrameExclusive, shift, 'new caption crosses a connection');
    }
    const offset = segment.outputStartFrame - segment.sourceStartFrame30 + shift;
    const atoms = original.map(a => ({atomId: `7b-${requested.role}-source-${a.id}`, text: a.text,
      startFrame: offset + frameBoundaryWithVideoOffsetV001(a.startMs, baseTimeline.sourceFrameClock.videoPresentationOffsetMs),
      endFrameExclusive: offset + sourceEndFrameBoundaryWithVideoOffsetV001(a.endMs, baseTimeline.sourceFrameClock),
      sourceStartMs: a.startMs, sourceEndMs: a.endMs, timelineSegmentId: segment.segmentId}));
    const text = original.map(a => a.text).join(''), parent = {...clone(template), instructionId: captionId, text,
      indexedLines: indexed(text), sourceStartMs: requested.sourceStartMs, sourceEndMs: requested.sourceEndMs,
      startFrame: outer.startFrame + shift, endFrameExclusive: outer.endFrameExclusive + shift,
      displayFrameCount: outer.endFrameExclusive - outer.startFrame, timelineSegmentId: segment.segmentId,
      targetProvenance: {targetRefId: '7b-' + requested.role, targetType: 'semantic-caption', sourceAtomIds: atoms.map(a => a.atomId)}, materialRefs: []};
    normalPlan.elements.push(parent);
    const decision = semanticDecisions[index]; assert.equal(decision.role, requested.role);
    assert(Array.isArray(decision.parts) && decision.parts.length > 0 && decision.parts.every(x => typeof x === 'string' && x.length > 0));
    assert.equal(decision.parts.join(''), text, 'semantic phrases changed saved text');
    assert(typeof decision.reason === 'string' && decision.reason.length > 0);
    assert(decision.required === false || decision.required === true, 'explicit semantic boundary requirement needed');
    let characterEnd = 0; const atomEnds = new Map([[0, 0]]);
    atoms.forEach((a, i) => {characterEnd += [...a.text].length; atomEnds.set(characterEnd, i + 1);});
    let cursor = 0;
    const boundaries = decision.parts.slice(0, -1).map(part => {
      cursor += [...part].length; const at = atomEnds.get(cursor); assert(at > 0 && at < atoms.length, 'meaning boundary cuts a source atom');
      return {atomEndIndexExclusive: at, frame: atoms[at].startFrame, kind: 'semantic', reason: decision.reason, required: decision.required};
    });
    const points = [0, ...boundaries.map(b => b.atomEndIndexExclusive), atoms.length], spans = [];
    const exceptions = decision.twoLineExceptions ?? [];
    assert(Array.isArray(exceptions), 'two-line exceptions must be explicit');
    exceptions.forEach(e => assert(typeof e.text === 'string' && e.text.length > 0 && Array.isArray(e.lines) && e.lines.length === 2
      && e.lines.every(line => typeof line === 'string' && line.length > 0)
      && e.lines.join('') === e.text
      && typeof e.reason === 'string' && e.reason.length > 0, 'two-line exception needs exact lines and reason'));
    const usedExceptions = new Set();
    for (let a = 0; a < points.length; a++) for (let b = a + 1; b < points.length; b++) {
      const start = points[a], end = points[b], spanText = atoms.slice(start, end).map(v => v.text).join('');
      const key = captionId + ':' + start + ':' + end;
      measurementRequests.push({key, props: props({...parent, text: spanText, indexedLines: indexed(spanText)}, normalPlan, registry)});
      const matches = exceptions.map((e, i) => ({...e, index: i})).filter(e => e.lines.join('') === spanText);
      assert(matches.length <= 1, 'duplicate two-line exception');
      let twoLine = null;
      if (matches.length) {
        const match = matches[0], before = atoms.slice(0, start).reduce((n, a) => n + [...a.text].length, 0);
        assert(atomEnds.has(before + [...match.lines[0]].length), 'two-line break cuts a source atom');
        const keys = match.lines.map((line, i) => {
          const lineKey = key + ':line-' + (i + 1);
          measurementRequests.push({key: lineKey, props: props({...parent, text: line, indexedLines: indexed(line)}, normalPlan, registry)});
          return lineKey;
        });
        twoLine = {lines: clone(match.lines), keys, reason: match.reason}; usedExceptions.add(match.index);
      }
      spans.push({key, startAtomIndex: start, endAtomIndexExclusive: end, twoLine});
    }
    assert.equal(usedExceptions.size, exceptions.length, 'two-line exception is not a finite semantic span');
    captions.push({captionId, role: requested.role, sourceFragmentIds: original.map(a => a.id), atoms, boundaries, spans});
  }
  normalPlan.elements.forEach((e, i) => assert(!i || e.startFrame >= normalPlan.elements[i - 1].endFrameExclusive, 'new captions overlap/out of order'));
  captions.forEach(c => {c.measurementContextSha256 = captionReadabilityMeasurementContextSha256V001(normalPlan, c.captionId);});
  return seal({schemaVersion: VERSION + '-prepared', clock: projection === null ? 'digest-original' : 'digest-display',
    clockId: projection?.projectionSha256 ?? canonicalSha256(baseTimeline), normalPlan, captions, measurementRequests,
    bindings: {transcriptSha256: canonicalSha256(transcript), segmentsSha256: canonicalSha256(segments),
      baseTimelineSha256: canonicalSha256(baseTimeline), projectionSha256: projection?.projectionSha256 ?? null,
      normalTemplateSha256: canonicalSha256(normalTemplate), registrySha256: canonicalSha256(registry), semanticDecisionsSha256: canonicalSha256(semanticDecisions)}});
}

/** The same browser-loaded font and buildExactTextModel used by 7A. Only this
 * short browser bridge is repeated because the old CLI helper is not exported. */
export async function measureDigestStructureNewCaptionWidthsV001({prepared, repositoryRoot, chromiumPath}) {
  verifySeal(prepared); assert(path.isAbsolute(repositoryRoot) && path.isAbsolute(chromiumPath));
  const req = createRequire(path.join(repositoryRoot, 'runner/package.json'));
  const remotion = createRequire(req.resolve('@remotion/cli/package.json'));
  const {openBrowser} = remotion('@remotion/renderer');
  const {build} = createRequire(req.resolve('tsx/package.json'))('esbuild');
  const fontPath = path.join(repositoryRoot, 'runner/public/font/LINESeedJP_A_OTF_Eb.otf');
  const paths = [ownPath, fileURLToPath(new URL('./caption-readability-plan.mjs', import.meta.url)), fontPath,
    await realpath(chromiumPath), path.join(repositoryRoot, 'evals/clip_composition/presentation_renderer_entry_v001.tsx'),
    path.join(repositoryRoot, 'runner/src/telop/text-metrics.ts')];
  const refs = await Promise.all(paths.map(bound));
  assert(prepared.measurementRequests.every(r => r.props.fontFamilyName === 'zev-renderer-line-seed-jp-extra-bold-v001'
    && r.props.fontFileName === 'LINESeedJP_A_OTF_Eb.otf'), 'only the existing permitted font is measured');
  const bundle = await build({stdin: {contents: `export {buildExactTextModel} from './evals/clip_composition/presentation_renderer_entry_v001.tsx';`,
    resolveDir: repositoryRoot, loader: 'ts'}, bundle: true, write: false, platform: 'browser', format: 'iife',
    globalName: 'ReadabilityMetrics', nodePaths: [path.join(repositoryRoot, 'runner/node_modules')],
    define: {'process.env.NODE_ENV': '"production"'}, logLevel: 'silent'});
  const browser = await openBrowser('chrome', {browserExecutable: chromiumPath, forceDeviceScaleFactor: 1, logLevel: 'error'});
  const started = performance.now();
  try {
    const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {}});
    await page.setViewport({width: 1920, height: 1080, deviceScaleFactor: 1}); await page.goto({url: 'about:blank', timeout: 30000});
    await page.evaluate(bundle.outputFiles[0].text);
    const fontUrl = 'data:font/otf;base64,' + (await readFile(fontPath)).toString('base64');
    await page.evaluate(`(async()=>{const f=await new FontFace('zev-renderer-line-seed-jp-extra-bold-v001','url('+${JSON.stringify(fontUrl)}+')',{weight:'800'}).load();document.fonts.add(f);await document.fonts.ready;if(!document.fonts.has(f))throw Error('font not active')})()`);
    const rows = await page.evaluate(`(()=>{const ctx=document.createElement('canvas').getContext('2d');return ${JSON.stringify(prepared.measurementRequests)}.map(r=>{const p=r.props;ctx.font='800 '+p.visualState.textStyle.fontSizePx+'px "'+p.fontFamilyName+'"';const exact=ReadabilityMetrics.buildExactTextModel(p);return {key:r.key,fullWidthPx:exact.wrapper.width,wrapper:exact.wrapper,measuredLines:p.indexedLines.map(l=>{const m=ctx.measureText(l.text);return {text:l.text,advanceWidthPx:m.width,inkWidthPx:m.actualBoundingBoxLeft+m.actualBoundingBoxRight}})};})})()`);
    same(await Promise.all(paths.map(bound)), refs, 'font/tool/implementation changed during measurement');
    return seal({schemaVersion: MEASURE, origin: 'loaded-font-browser', preparedSha256: prepared.canonicalSha256,
      requestsSha256: canonicalSha256(prepared.measurementRequests), refs, rows, wallMilliseconds: performance.now() - started,
      limitation: 'actual font/renderer width; final raster clipping and human quality are not evaluated here'});
  } finally {await browser.close({silent: true});}
}

export function buildDigestStructureNewCaptionsV001({prepared, measurements}) {
  verifySeal(prepared); verifySeal(measurements); assert.equal(prepared.schemaVersion, VERSION + '-prepared');
  assert.equal(measurements.schemaVersion, MEASURE);
  assert(['loaded-font-browser', 'synthetic-test'].includes(measurements.origin));
  assert.equal(measurements.preparedSha256, prepared.canonicalSha256);
  assert.equal(measurements.requestsSha256, canonicalSha256(prepared.measurementRequests));
  assert.equal(measurements.rows.length, prepared.measurementRequests.length, 'measurement coverage differs');
  const widths = new Map();
  measurements.rows.forEach((row, i) => {assert.equal(row.key, prepared.measurementRequests[i].key, 'measurement order differs');
    assert(Number.isFinite(row.fullWidthPx) && row.fullWidthPx >= 0); assert(!widths.has(row.key)); widths.set(row.key, row.fullWidthPx);});
  const evidence = {schemaVersion: 'caption-readability-evidence-v001', sourcePlanSha256: canonicalSha256(prepared.normalPlan),
    clockId: prepared.clockId, maxWidthPx: prepared.normalPlan.canvas.width - prepared.normalPlan.canvas.safeAreaPx.left - prepared.normalPlan.canvas.safeAreaPx.right,
    captions: prepared.captions.map(c => ({captionId: c.captionId, measurementContextSha256: c.measurementContextSha256,
      atoms: clone(c.atoms), boundaries: clone(c.boundaries), effect: {kind: 'normal'}, measurements: c.spans.map(span => ({
        startAtomIndex: span.startAtomIndex, endAtomIndexExclusive: span.endAtomIndexExclusive, singleLineWidthPx: widths.get(span.key),
        twoLine: span.twoLine === null ? null : {lines: span.twoLine.lines,
          widthsPx: span.twoLine.keys.map(key => widths.get(key)), reason: span.twoLine.reason}}))}))};
  const resolution = buildCaptionReadabilityPlanV001({normalPlan: prepared.normalPlan, evidence});
  return seal({schemaVersion: VERSION, status: measurements.origin === 'synthetic-test' ? 'synthetic-test-only' : 'font-measured-new-captions',
    prepared: clone(prepared), measurements: clone(measurements), readabilityEvidence: evidence, resolution,
    normalPlan: clone(resolution.normalPlan), resolvedPlan: clone(resolution.normalPlan),
    sourceAtoms: clone(prepared.captions.map(c => ({role: c.role, sourceFragmentIds: c.sourceFragmentIds, atoms: c.atoms}))),
    humanQuality: 'not-evaluated', rasterClipping: 'not-evaluated'});
}

export function restoreDigestStructureNewCaptionsV001({input, saved}) {
  verifySeal(saved); const prepared = prepareDigestStructureNewCaptionsV001(input);
  same(prepared, saved.prepared, 'saved source/clock/meaning/template changed');
  restoreCaptionReadabilityPlanV001({normalPlan: prepared.normalPlan, evidence: saved.readabilityEvidence, saved: saved.resolution});
  const rebuilt = buildDigestStructureNewCaptionsV001({prepared, measurements: saved.measurements});
  same(rebuilt, saved, 'saved new captions changed'); return rebuilt;
}
async function verifyMeasurementFiles(saved) {
  assert.equal(saved.measurements.origin, 'loaded-font-browser', 'synthetic widths cannot be saved or published');
  assert(saved.measurements.refs.length >= 6, 'font/tool/geometry bindings missing');
  for (const ref of saved.measurements.refs) same(await bound(ref.path), ref, 'measurement dependency bytes changed');
}
export async function saveDigestStructureNewCaptionsV001({input, saved, outputPath}) {
  assert(path.isAbsolute(outputPath)); restoreDigestStructureNewCaptionsV001({input, saved}); await verifyMeasurementFiles(saved);
  await writeFile(outputPath, JSON.stringify(saved, null, 2) + '\n', {flag: 'wx'}); return bound(outputPath);
}
export async function readDigestStructureNewCaptionsV001({input, savedRef}) {
  same(await bound(savedRef.path), savedRef, 'saved new caption bytes changed');
  const saved = JSON.parse(await readFile(savedRef.path, 'utf8'));
  const result = restoreDigestStructureNewCaptionsV001({input, saved}); await verifyMeasurementFiles(saved); return result;
}
