import assert from 'node:assert/strict';
import {lstat,realpath,statfs,readdir} from 'node:fs/promises';
import path from 'node:path';

export function uploadCapacityDecision(sourceBytes:number,devices:{device:number,availableBytes:number}[]) {
  assert(Number.isSafeInteger(sourceBytes) && sourceBytes>0);
  assert.equal(devices.length,3);
  const sameVolume=devices.every(v=>v.device===devices[0].device);
  const knownPeakBytes=3*sourceBytes,requiredAvailableBytes=4*sourceBytes;
  const availableBytes=Math.min(...devices.map(v=>v.availableBytes));
  return {sameVolume,knownPeakBytes,requiredAvailableBytes,availableBytes,
    deficitBytes:Math.max(0,requiredAvailableBytes-availableBytes),
    passed:sameVolume && availableBytes>=requiredAvailableBytes,
    rule:'capacity-preflight work-order §6.2; this isolated upload test only',
    ...(sameVolume?{}:{reason:'Different-volume layout needs its own per-volume proof; no execution'})};
}
async function existingParent(p:string):Promise<string> {
  try {await lstat(p);return p;} catch(e) {
    if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;
    assert.notEqual(path.dirname(p),p);return existingParent(path.dirname(p));
  }
}
export async function uploadCapacitySnapshot(source:string,roots:string[]) {
  const sourceStatus=await lstat(source);assert(sourceStatus.isFile() && !sourceStatus.isSymbolicLink());
  const devices=await Promise.all(roots.map(async intendedRoot=>{
    const measuredPath=await realpath(await existingParent(intendedRoot)),status=await lstat(measuredPath),space=await statfs(measuredPath,{bigint:true});
    return {intendedRoot,measuredPath,device:status.dev,availableBytes:Number(space.bavail*space.bsize),
      blockSize:Number(space.bsize),filesystemType:Number(space.type)};
  }));
  return {measuredAt:new Date().toISOString(),source:{path:source,byteSize:sourceStatus.size,device:sourceStatus.dev},
    devices,decision:uploadCapacityDecision(sourceStatus.size,devices)};
}
export async function assertNewUploadPaths(paths:string[]) {
  for(const p of paths)await assert.rejects(lstat(p),(e:NodeJS.ErrnoException)=>e.code==='ENOENT',p+' already exists');
}
export async function sourceSizeFiles(directory:string,sourceBytes:number):Promise<{path:string,byteSize:number,allocatedBytes:number}[]> {
  const files:{path:string,byteSize:number,allocatedBytes:number}[]=[];
  async function walk(p:string) {
    let status;try {status=await lstat(p);}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return;throw e;}
    assert(!status.isSymbolicLink(),p);
    if(status.isDirectory())for(const name of await readdir(p))await walk(path.join(p,name));
    else if(status.isFile() && status.size===sourceBytes)files.push({path:p,byteSize:status.size,allocatedBytes:status.blocks*512});
  }
  await walk(directory);return files;
}
if(process.argv[2]==='preflight-checks') {
  const sourceBytes=4803412827,device=123,at=Array.from({length:3},()=>({device,availableBytes:4*sourceBytes}));
  assert.equal(uploadCapacityDecision(sourceBytes,at).passed,true);
  assert.equal(uploadCapacityDecision(sourceBytes,at.map(v=>({...v,availableBytes:v.availableBytes-1}))).passed,false);
  assert.equal(uploadCapacityDecision(sourceBytes,at.map(v=>({...v,availableBytes:2145939456}))).passed,false);
  assert.equal(uploadCapacityDecision(sourceBytes,at.map((v,i)=>({...v,device:device+i}))).passed,false);
  console.log(JSON.stringify({status:'passed',checks:4,sourceRead:false,copy:false,PUT:false,runtimeCreated:false}));
}
