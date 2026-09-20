import {readFile, writeFile, realpath, stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {canonical, validateReview} from './core.mjs';

const run=promisify(execFile), here=dirname(fileURLToPath(import.meta.url));
export const sha256=value=>createHash('sha256').update(value).digest('hex');
async function fileHash(path) { const hash=createHash('sha256');for await (const part of createReadStream(path))hash.update(part);return hash.digest('hex'); }
export async function probeMedia(path) {
  const read=async count=>JSON.parse((await run('ffprobe',['-v','error',...(count?['-count_frames']:[]),'-select_streams','v:0','-show_entries','stream=avg_frame_rate,nb_frames,nb_read_frames','-of','json',path],{maxBuffer:1024*1024})).stdout).streams?.[0];
  let stream=await read(false);
  if(!stream)throw new Error('動画streamがありません');
  if(!/^\d+$/.test(stream.nb_frames ?? ''))stream=await read(true);
  const [num,den]=(stream.avg_frame_rate ?? '').split('/').map(Number);
  return {fps_num:num,fps_den:den,total_frames:Number(stream.nb_frames === undefined || stream.nb_frames === 'N/A' ? stream.nb_read_frames : stream.nb_frames)};
}
export async function buildReview({dataPath,outputPath,probe=probeMedia}) {
  const input=resolve(dataPath),output=resolve(outputPath);
  const review=validateReview(JSON.parse(await readFile(input,'utf8')));
  const sources={}, checked=[];
  for(const media of review.media){
    const path=await realpath(resolve(dirname(input),media.path));
    if(!(await stat(path)).isFile())throw new Error(`${media.media_id}: ファイルではありません`);
    const hash=await fileHash(path);
    if(hash!==media.sha256)throw new Error(`${media.media_id}: 動画SHA-256が一致しません`);
    const observed=await probe(path);
    if(!Number.isSafeInteger(observed.fps_num)||!Number.isSafeInteger(observed.fps_den)||observed.fps_num<=0||observed.fps_den<=0||observed.total_frames!==media.total_frames||BigInt(observed.fps_num)*BigInt(media.fps_den)!==BigInt(media.fps_num)*BigInt(observed.fps_den))throw new Error(`${media.media_id}: 動画のframe数またはfpsが一致しません`);
    sources[media.media_id]=pathToFileURL(path).href;checked.push({media_id:media.media_id,path,sha256:hash,...observed});
  }
  const reviewSha=sha256(canonical(review));
  const files=await Promise.all(['template.html','style.css','core.mjs','player.mjs','app.mjs'].map(name=>readFile(resolve(here,name),'utf8')));
  const script=files.slice(2).map(source=>source.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')).join('\n')+'\ntry { mountReview(document, window, JSON.parse(document.getElementById("review-package").textContent)); } catch (error) { document.getElementById("save-status").textContent = "レビューを開けません: " + error.message; }';
  const bundle={review,review_sha256:reviewSha,media_sources:sources};
  const safeJson=JSON.stringify(bundle).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
  const html=files[0].replace('/*__STYLE__*/',()=>files[1]).replace('/*__DATA__*/',()=>safeJson).replace('/*__SCRIPT__*/',()=>script);
  await writeFile(output,html,{flag:'wx'});
  return {output_path:output,review_sha256:reviewSha,html_sha256:sha256(html),template_sha256:sha256(files[0]),media:checked,points:review.points.length,browser_checked:false,human_quality_checked:false};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.length!==4){console.error('Usage: node tools/point-review/build.mjs <review.json> <new-output.html>');process.exitCode=1;}
  else buildReview({dataPath:process.argv[2],outputPath:process.argv[3]}).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
