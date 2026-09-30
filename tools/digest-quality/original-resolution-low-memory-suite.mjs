/** Fixed short-scope execution and direct comparison, one supervised run at a time. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {EXECUTION_AREA} from './original-resolution-execution-input.mjs';
import {saveDigestStructureFileV001 as save} from './digest-structure-evidence.mjs';

const scopes=[
  ['representative-01','representative-01-001',1],
  ['representative-02','representative-02-001',12],
  ['representative-03','representative-03-001',12],
  ['representative-04','representative-04-001',12],
  ['representative-05','black-001',7],
  ['representative-06','representative-06-001',12],
  ['representative-07','representative-07-001',60],
];
const json=async p=>JSON.parse(await readFile(p,'utf8'));
async function command(program,args){
  const child=spawn(program,args,{stdio:'inherit'});
  const {code,signal}=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal}));});
  assert.equal(signal,null);assert.equal(code,0,`${program} failed: ${args.join(' ')}`);
}
function monitor(name,program,args){return command('python3',['tools/digest-quality/original-resolution-low-memory-supervised.py',
  path.join(EXECUTION_AREA,`lowmem-monitor-${name}`),program,...args]);}
export async function runSuiteV001(){
  const rows=[];
  for(const [scope,existing,maxFrames] of scopes){
    const suffix=scope,source=path.join(EXECUTION_AREA,existing,'completion.json'),
      output=path.join(EXECUTION_AREA,`lowmem-${suffix}`),compareDir=path.join(EXECUTION_AREA,`lowmem-compare-${suffix}`);
    await monitor(`trial-${suffix}`,'node',['tools/digest-quality/original-resolution-low-memory-composite.mjs',
      'trial',scope,source,output,String(maxFrames)]);
    await mkdir(compareDir);
    await monitor(`compare-${suffix}`,'node',['tools/digest-quality/original-resolution-low-memory-compare.mjs',
      path.join(output,'completion.json'),path.join(compareDir,'comparison.json')]);
    const trial=await json(path.join(output,'completion.json')),comparison=await json(path.join(compareDir,'comparison.json')),
      trialResources=await json(path.join(EXECUTION_AREA,`lowmem-monitor-trial-${suffix}`,'summary.json')),
      compareResources=await json(path.join(EXECUTION_AREA,`lowmem-monitor-compare-${suffix}`,'summary.json'));
    assert.equal(trialResources.status,'completed');assert.equal(compareResources.status,'completed');
    assert.equal(trialResources.remainingRunning.length,0);assert.equal(compareResources.remainingRunning.length,0);
    assert(comparison.rows.every(r=>r.rawYuvEqual&&r.decodedEqual&&r.aacEqual&&r.pcmEqual&&r.mp4ByteEqual));
    assert.equal(trial.videos[0].output.fileSha256,trial.videos[1].output.fileSha256);
    rows.push({scope,maxFrames,trial:trial.videos.map(v=>({series:v.series,segments:v.segments.length,
      maximumCaptions:v.maximumCaptions,maximumStates:v.maximumStates,maximumInputs:v.maximumInputs,
      mp4Sha256:v.output.fileSha256,originalMp4Sha256:v.existing.fileSha256,
      rawYuvSha256:v.rawYuvSha256})),comparison:comparison.rows.map(r=>({series:r.series,
      rawYuvEqual:r.rawYuvEqual,decodedEqual:r.decodedEqual,aacEqual:r.aacEqual,pcmEqual:r.pcmEqual,
      mp4ByteEqual:r.mp4ByteEqual,videoFrames:r.newProbe.streams.find(s=>s.codec_type==='video').nb_frames,
      videoRate:r.newProbe.streams.find(s=>s.codec_type==='video').r_frame_rate})),
      trialResources,compareResources});
  }
  return save(path.join(EXECUTION_AREA,'lowmem-short-suite-v001.json'),{schemaVersion:'original-resolution-low-memory-short-suite-v001',rows});
}
if(process.argv[1]&&path.resolve(process.argv[1])===new URL(import.meta.url).pathname)console.log(JSON.stringify(await runSuiteV001()));
