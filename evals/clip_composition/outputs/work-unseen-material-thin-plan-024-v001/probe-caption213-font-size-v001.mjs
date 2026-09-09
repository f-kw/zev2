import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {buildPresentationRendererOverlayAdapterV001, buildPresentationRenderApplicationResults,
  PRESENTATION_RENDERER_OUTPUT_NAMES} from '../../render_presentation_v002.mjs';
import {createPresentationRendererProcessObserverV001} from '../../presentation_renderer_process_observation_v001.mjs';
import {buildPresentationInstructionCommonCorePlanV001} from '../../run_presentation_instruction_renderer_job_v002.ts';
import {inspectPresentationRenderLayoutV001} from '../../inspect_presentation_render_layout_v001.ts';
import {inspectOverlayPngWithToolV001, evaluatePresentationRendererQcV002} from '../../presentation_renderer_qc_v002.mjs';

const root = path.resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const work = path.dirname(fileURLToPath(import.meta.url));
const read = async p => JSON.parse(await readFile(p, 'utf8'));
const hash = value => createHash('sha256').update(value).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const canonicalHash = value => hash(JSON.stringify(canonical(value)));
const binding = async p => ({path:path.relative(root,p), fileSha256:hash(await readFile(p))});
const save = async (p, value) => writeFile(p,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const bound = async ref => {
  const p=path.join(root,ref.path);assert.equal(hash(await readFile(p)),ref.fileSha256);return read(p);
};
const decisionPath=path.join(work,'advisor-font-size-decision-v003.json');
const decision=await read(decisionPath);
assert.equal(decision.decision,'continue');assert.equal(decision.startingFontSizePx,94);assert.equal(decision.decrementPx,1);
assert.equal(decision.auditedCheckpoint,'394edfb648ca25020635d5efc75811c83412af4f');
const diagnosisPath=path.join(work,'font95-actual-alpha-diagnosis-v001.json');
const diagnosis=await read(diagnosisPath);
const execution=await bound(diagnosis.execution);
const job=await bound(execution.rendererJobBinding);
const instructionArtifact=await bound(job.instructionArtifactBinding);
const originalStyle=await bound(job.registryBindings.styleProfileRegistry);
const rendererTrust=await bound(job.registryBindings.rendererTrust);
const lineLayout=await read(path.join(root,job.publication.lineLayoutPath));
const former=execution.result.failure.nested;
for(const ref of job.rendererImplementationBindings) assert.equal(hash(await readFile(path.join(root,ref.path))),ref.fileSha256);
for(const ref of Object.values(job.runtimeBindings)) assert.equal(hash(await readFile(ref.path)),ref.fileSha256);
const out=path.join(work,'font-size-actual-probe-v001');await mkdir(out);
let selected=null;const attempts=[];
for(let fontSize=decision.startingFontSizePx;fontSize>=rendererTrust.layoutRules.minimumFontSizePx;fontSize-=decision.decrementPx){
  const dir=path.join(out,`font-${fontSize}`);await mkdir(dir);
  const registry=structuredClone(originalStyle);
  const state=registry.presets[0].visualStates.find(x=>x.stateId===job.executionInputs.visualStateId);
  assert.equal(state.textStyle.fontSizePx,95);state.textStyle.fontSizePx=fontSize;
  const common=buildPresentationInstructionCommonCorePlanV001({job,visualStateId:job.executionInputs.visualStateId,
    instructionArtifact,lineLayout,styleProfileRegistry:registry,rendererTrust});
  assert.equal(common.status,'built');
  const element=common.plan.elements.find(x=>x.instructionId===diagnosis.failingProps.instructionId);assert(element);
  const observer=createPresentationRendererProcessObserverV001({observationDirectory:path.join(dir,'process-observations')});
  const adapter=buildPresentationRendererOverlayAdapterV001({remotionPath:job.runtimeBindings.remotion.path,
    chromiumPath:job.runtimeBindings.chromium.path,processObserver:observer});
  const props=adapter.buildProps(element,common.plan,registry);
  const expected=structuredClone(diagnosis.failingProps);expected.visualState.textStyle.fontSizePx=fontSize;
  assert.deepEqual(props,expected,'ONLY_FONT_SIZE_MAY_CHANGE');
  await save(path.join(dir,'props.json'),props);
  const pre=inspectPresentationRenderLayoutV001({canvas:common.plan.canvas,overlays:[props]});
  await save(path.join(dir,'pre-render-layout-calculation.json'),pre);
  const png=path.join(dir,'caption.png'), repeat=path.join(dir,'caption-repeat.png');
  await adapter.renderStill(props,png);await adapter.renderStill(props,repeat);
  const pngSha=hash(await readFile(png));assert.equal(pngSha,hash(await readFile(repeat)));
  const lineBounds=[];
  for(const line of element.indexedLines){
    const linePath=path.join(dir,`line-${line.lineIndex}.png`);await adapter.renderLineMask(props,line.lineIndex,linePath);
    const inspection=await inspectOverlayPngWithToolV001({instructionId:element.instructionId,pngPath:linePath,
      imageMagickPath:job.runtimeBindings.imageMagick.path,processObserver:observer,observationLabelPrefix:'line-inspection'});
    assert(inspection.alphaBounds);lineBounds.push({lineIndex:line.lineIndex,...inspection.alphaBounds});
  }
  const inspection=await inspectOverlayPngWithToolV001({instructionId:element.instructionId,pngPath:png,
    imageMagickPath:job.runtimeBindings.imageMagick.path,processObserver:observer,observationLabelPrefix:'caption-inspection',
    lineRects:pre.items[0].lineRects,lineAlphaBounds:lineBounds,appliedOverlayPropsCanonicalSha256:canonicalHash(props),
    overlayFile:'overlays/caption.png',overlaySha256:pngSha});
  const applications=buildPresentationRenderApplicationResults([{element,props,fileStem:'caption',pngPath:png,pngSha256:pngSha,inspection}],PRESENTATION_RENDERER_OUTPUT_NAMES);
  const qc=evaluatePresentationRendererQcV002({plan:{...common.plan,elements:[element]},applicationResults:applications,
    overlayInspections:[inspection],mediaInspection:former.mediaEvidence.observed,
    expectedAudio:former.mediaEvidence.expectedAudio,canvas:common.plan.canvas,requireFinalVisibility:false});
  const result={fontSizePx:fontSize,preRenderCalculation:pre,actualPngInspection:inspection,qc,
    mainImage:await binding(png),repeatImage:await binding(repeat),props:await binding(path.join(dir,'props.json')),
    onlyFontSizeChanged:true,redrawDeterministic:true,scope:'single-caption-actual-alpha-probe-not-final-video-qc'};
  await save(path.join(dir,'result.json'),result);attempts.push({...await binding(path.join(dir,'result.json')),fontSizePx:fontSize,status:qc.status});
  console.log(JSON.stringify({fontSizePx:fontSize,actualBounds:inspection.alphaBounds,status:qc.status,violations:qc.violations}));
  if(qc.status==='passed'){selected=fontSize;break;}
  assert(qc.violations.every(x=>x.code==='LAYOUT_SAFE_AREA_VIOLATION'),'UNAPPROVED_STRUCTURAL_CHANGE_REQUIRED');
}
assert.notEqual(selected,null,'NO_ALLOWED_EXISTING_FONT_SIZE_PASSES');
const result={schemaVersion:'unseen-material-actual-font-size-selection-v001',status:'single-caption-probe-passed',
  selectedFontSizePx:selected,selectionRule:decision.selectionRule,decisionBinding:await binding(decisionPath),
  diagnosisBinding:await binding(diagnosisPath),rendererJobBinding:execution.rendererJobBinding,
  probeImplementation:await binding(fileURLToPath(import.meta.url)),attempts,all343ActualPngQc:'pending',
  mainVideoEncoded:false,finalVisibilityQc:'pending',humanQuality:'not-evaluated'};
await save(path.join(work,'font-size-selection-v001.json'),result);console.log(JSON.stringify(result));
