/** Local Normal/Reset execution for the saved integrated preview, no full rerender. */
import assert from 'node:assert/strict';
import {mkdir,readFile,realpath} from 'node:fs/promises';
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {canonicalSha256 as hash} from './clock.mjs';
import {bindDigestStructureFileV001 as bind,verifyDigestStructureFileV001 as verify,saveDigestStructureFileV001 as save} from './digest-structure-evidence.mjs';
import {editIntegrationPreviewV001 as edit,resolveIntegrationPreviewV001 as resolve} from './integration-preparation.mjs';
import {integratedRecordsV001 as records} from './integrated-preview.mjs';
import {scopeOrchestrationPlanV001 as scope} from '../../evals/clip_composition/presentation_orchestration_render_scope_v001.mjs';
import {composePresentationMediaV001 as compose,buildPresentationCompositeArgumentsV001 as args} from '../../evals/clip_composition/render_presentation_v002.mjs';
import {inspectRenderedMediaWithToolsV001 as media} from '../../evals/clip_composition/presentation_renderer_qc_v002.mjs';
const json=async p=>JSON.parse(await readFile(p,'utf8')),same=assert.deepEqual;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const range={startFrame:9708,endFrameExclusive:9918,fullFrameCount:17613};
async function input(file){const completionRef=await bind(file),c=await json(file);assert.equal(c.status,'development-preview-ready');await verify(c.preparationRef);
 const prep=await json(c.preparationRef.path);await verify(prep.draftRef);const draft=await json(prep.draftRef.path),proof=await json(draft.input.refs.reaction.path),job=await json(draft.input.refs.paletteJob.path);
 const b=c.outputs.find(v=>v.variant==='B');await verify(b.rowRef);const raster=await json(b.rowRef.path);
 const initial=edit(draft,null,{outline:null,framing:'Reset'}),selected=edit(draft,initial,{outline:'B',framing:'Reset'}),normal=edit(draft,selected,{outline:'B',framing:'Normal'}),reset=edit(draft,normal,{outline:'Reset',framing:'Reset'});same(reset,initial);
 const rows=[];for(const [name,state]of [['normal',normal],['reset',reset]]){const d=resolve(draft,state);d.plan=scope(d.plan,range);const ids=new Set(d.plan.elements.map(e=>e.instructionId));assert.equal(ids.size,6);d.states=d.states.filter(s=>ids.has(s.captionId));
 const source=name==='reset'?proof.states:raster.rows;const kept=source.filter(r=>ids.has(r.captionId));same(kept.map(r=>r.element),d.states.map(s=>s.element));for(const row of kept)await verify(row.png);
 const bg=proof.rows.find(r=>r.name===(name==='reset'?'candidate':'normal')).background;await verify(bg);await verify(proof.audio);
 rows.push({name,state,d,kept,bg});}
 return {completionRef,c,proof,draft,rows,tools:job.tools};}
function options(i,r,video){return {baseMediaPath:r.bg.path,plan:r.d.plan,overlayRecords:records(r.d,r.kept),audioMediaPath:i.proof.audio.path,expectedFrameCount:210,renderRange:range,serializePngAndFilters:true,outputPath:video,ffmpegPath:i.tools.ffmpegPath};}
export async function runIntegratedOperationsV001(completion,destination){assert(path.resolve(destination).startsWith(path.join(root,'runtime/artifacts/integrated-preview-20260930-v001')+path.sep));await mkdir(destination);const i=await input(completion),start=performance.now();const rows=[];
 for(const r of i.rows){const stateRef=await save(path.join(destination,r.name+'-state.json'),r.state);same(await json(stateRef.path),r.state);
 const video=path.join(destination,r.name+'.mp4'),o=options(i,r,video);await compose(o);const observed=await media(video,i.tools);same(observed.video,{codecName:'h264',width:960,height:540,fps:30,frameCount:210});
 rows.push({name:r.name,stateRef,video:await bind(video),observed,command:args(o)});}
 const original=i.proof.rows[0].video;await verify(original);same(rows[1].video.fileSha256,original.fileSha256);same(rows[0].observed.audio,rows[1].observed.audio);
 const implementation=await Promise.all([fileURLToPath(import.meta.url),process.execPath].map(async p=>bind(await realpath(p))));
 return save(path.join(destination,'completion.json'),{schemaVersion:'integrated-preview-operations-v001',status:'passed',integrationRef:i.completionRef,rows,originalResetReference:original,resetUnselected:true,originalDraftSha256:i.draft.recordSha256,implementation,seconds:(performance.now()-start)/1000});}
export async function readIntegratedOperationsV001(file){const ref=await bind(file),c=await json(file);assert.equal(c.schemaVersion,'integrated-preview-operations-v001');assert.equal(c.status,'passed');await verify(c.integrationRef);const i=await input(c.integrationRef.path);same(c.originalDraftSha256,i.draft.recordSha256);same(c.resetUnselected,true);same(c.rows.map(r=>r.name),['normal','reset']);
 for(const r of c.implementation)await verify(r);for(const [n,r]of c.rows.entries()){await verify(r.stateRef);same(await json(r.stateRef.path),i.rows[n].state);await verify(r.video);same(await media(r.video.path,i.tools),r.observed);same(r.command,args(options(i,i.rows[n],r.video.path)));}
 same(c.originalResetReference,i.proof.rows[0].video);await verify(c.originalResetReference);same(c.rows[1].video.fileSha256,c.originalResetReference.fileSha256);same(c.rows[0].observed.audio,c.rows[1].observed.audio);await verify(ref);return {status:'passed',localFrames:210,resetByteIdentical:true,outlineChoice:null};}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const [cmd,a,b]=process.argv.slice(2);const start=performance.now();const result=cmd==='run'?await runIntegratedOperationsV001(path.resolve(a),path.resolve(b)):cmd==='read'?await readIntegratedOperationsV001(path.resolve(a)):assert.fail('run/read');console.log(JSON.stringify({result,seconds:(performance.now()-start)/1000},null,2));}
