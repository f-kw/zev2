import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonical, validateReview, validateAnswers, REVIEW_SCHEMA} from './core.mjs';
import {sha256, verifyReviewMedia} from './build.mjs';
import {createSessionPackage, validateSessionPackage, blankSessionAnswers} from './session-core.mjs';

const here=dirname(fileURLToPath(import.meta.url));
export function verifySessionDigests(session){
  validateSessionPackage(session);
  for(const source of session.sources){
    if(sha256(canonical(source.review))!==source.review_sha256)throw new Error('元レビューの内容とSHAが一致しません');
  }
  if(sha256(canonical(session.display_review))!==session.display_review_sha256)throw new Error('一括表示の内容とSHAが一致しません');
  return session;
}
export async function buildReviewSession({manifestPath,outputDir,probe}){
  const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
  const sources=[],inputs=[];
  for(const ref of manifest.sources){
    const reviewPath=resolve(dirname(manifestPath),ref.review_path),answersPath=resolve(dirname(manifestPath),ref.answers_path);
    const reviewBytes=await readFile(reviewPath),answerBytes=await readFile(answersPath);
    const review=validateReview(JSON.parse(reviewBytes)),reviewSha=sha256(canonical(review));
    if(reviewSha!==ref.review_sha256)throw new Error('保存した元レビュー版と一致しません');
    if(review.media.some(m=>!m.path.startsWith('/')))throw new Error('一括入口は保存済み絶対媒体pathを使ってください');
    const initial_answers=validateAnswers(JSON.parse(answerBytes),review,reviewSha);
    sources.push({review,review_sha256:reviewSha,initial_answers});
    inputs.push({review_path:reviewPath,review_file_sha256:sha256(reviewBytes),answers_path:answersPath,answers_file_sha256:sha256(answerBytes),batch_id:review.batch_id,revision:review.revision,review_sha256:reviewSha});
  }
  const display_review={schema_version:REVIEW_SCHEMA,batch_id:manifest.session_id,revision:'v001',title:manifest.title,intro:manifest.intro,
    media:sources.flatMap(s=>structuredClone(s.review.media)),points:sources.flatMap(s=>structuredClone(s.review.points))};
  if(canonical(display_review.points.map(p=>p.point_id))!==canonical(manifest.point_order))throw new Error('一括入口の順番と元ポイントが一致しません');
  const session=createSessionPackage({session_id:manifest.session_id,title:manifest.title,intro:manifest.intro,display_review,
    display_review_sha256:sha256(canonical(display_review)),sources});
  verifySessionDigests(session);
  const {sources:media_sources,checked}=await verifyReviewMedia(display_review,manifestPath,{...(probe?{probe}:{})});
  const names=['template.html','style.css','core.mjs','player.mjs','app.mjs','session-core.mjs','session-app.mjs'];
  const files=await Promise.all(names.map(name=>readFile(join(here,name),'utf8')));
  const script=files.slice(2).map(source=>source.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')).join('\n')+
    '\ntry { mountPointReviewSession(document, window, JSON.parse(document.getElementById("review-package").textContent)); } catch (error) { document.getElementById("save-status").textContent = "レビューを開けません: " + error.message; }';
  const bundle={review:display_review,review_sha256:session.display_review_sha256,media_sources,session_package:session};
  const safeJson=JSON.stringify(bundle).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
  const html=files[0].replace('/*__STYLE__*/',()=>files[1]).replace('/*__DATA__*/',()=>safeJson).replace('/*__SCRIPT__*/',()=>script);
  const output=resolve(outputDir);await mkdir(output,{recursive:false});
  const save=(name,value)=>writeFile(join(output,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  await save('session-package.json',session);
  await save('answers-pending.json',blankSessionAnswers(session));
  await writeFile(join(output,'review.html'),html,{flag:'wx'});
  const record={schema_version:'zev-point-review-session-build-v001',created_at:new Date().toISOString(),session_id:session.session_id,
    output_path:join(output,'review.html'),html_sha256:sha256(html),display_review_sha256:session.display_review_sha256,
    template_sha256:sha256(files[0]),source_files:names.map((name,i)=>({name,sha256:sha256(files[i])})),inputs,
    points:display_review.points.length,media_references:checked.length,unique_media_files:new Set(checked.map(m=>m.path)).size,media:checked,
    browser_checked:false,human_quality_checked:false,new_video_encodes:0};
  await save('build-verification.json',record);
  return record;
}
