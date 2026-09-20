import {validateReview} from '../point-review/core.mjs';
import {validateQualityInput, validateQualityReply} from './validate.mjs';

const fail = message => { throw new Error(`Q3 review: ${message}`); };
const nonempty = value => typeof value === 'string' && value.trim();
function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join('|') === [...keys].sort().join('|');
}
export function convertQualityReview(packet, rawReply, comparison, {batchId='HRB-Q3-001',revision='v001'}={}) {
  validateQualityInput(packet);
  const accepted=validateQualityReply(packet,rawReply);
  if (!accepted.reviewEligible) fail('incomplete or failed judgment cannot create review points');
  if (!exactKeys(comparison,['schemaVersion','inputSha256','rawReplySha256','references','judgmentConditions','entries']) ||
      comparison.schemaVersion !== 'digest-quality-post-comparison-v001' || comparison.inputSha256 !== packet.inputSha256 ||
      comparison.rawReplySha256 !== accepted.rawReplySha256 || !nonempty(comparison.judgmentConditions) ||
      !Array.isArray(comparison.references) || !Array.isArray(comparison.entries)) fail('post-judgment comparison binding is invalid');
  const candidates=accepted.reply.candidates;
  if (comparison.entries.length !== candidates.length || new Set(comparison.entries.map(e=>e.candidateId)).size !== candidates.length) fail('candidate dispositions are incomplete or duplicated');
  const points=[];
  for (const entry of comparison.entries) {
    if (!exactKeys(entry,['candidateId','disposition','reason','knownRelations','reviewId','reviewTitle','scopeExclusions','contextRange']) ||
        !['present','withheld','technical-followup'].includes(entry.disposition) || !nonempty(entry.reason) || !Array.isArray(entry.knownRelations)) fail('candidate disposition is invalid');
    const c=candidates.find(v=>v.id===entry.candidateId);
    if (!c) fail('unknown candidate in post-judgment comparison');
    for (const known of entry.knownRelations) if (!exactKeys(known,['id','relationship']) || !nonempty(known.id) || !nonempty(known.relationship)) fail('known relation is invalid');
    if (entry.disposition!=='present') {
      if (entry.reviewId!==null || entry.reviewTitle!==null || entry.contextRange!==null || !Array.isArray(entry.scopeExclusions) || entry.scopeExclusions.length) fail('withheld candidate cannot carry a review point');
      continue;
    }
    const r=entry.contextRange;
    if (!nonempty(entry.reviewId) || !nonempty(entry.reviewTitle) || !Array.isArray(entry.scopeExclusions) || !entry.scopeExclusions.length ||
        entry.scopeExclusions.some(value=>!nonempty(value)) || new Set(entry.scopeExclusions).size!==entry.scopeExclusions.length ||
        !exactKeys(r,['startFrame','endFrameExclusive']) ||
        !Number.isSafeInteger(r.startFrame) || !Number.isSafeInteger(r.endFrameExclusive) ||
        r.startFrame<0 || r.startFrame>c.range.startFrame || r.endFrameExclusive<c.range.endFrameExclusive || r.endFrameExclusive>packet.media.frameCount) fail('review context is outside this media clock');
    const labels=c.unitIds.map(id=>{
      const u=packet.units.find(unit=>unit.id===id);
      const time=frame=>(frame*packet.media.fpsDen/packet.media.fpsNum).toFixed(3);
      return `${u.text || (u.kind==='no-caption'?'字幕のない区間':'接続')}（${time(u.range.startFrame)}–${time(u.range.endFrameExclusive)}秒）`;
    });
    points.push({point_id:c.id,review_id:entry.reviewId,related_review_ids:entry.knownRelations.map(v=>v.id),
      title:entry.reviewTitle,question:c.humanQuestion,target_function:c.reflectionTargets.join('／'),
      change_summary:'完成動画の現状を確認します。修正版はまだ作成していません。',
      why_human_review:`字幕と測定値から考えた仮説です。${c.missingInformation.join(' ')}`,
      scope:{level:c.unitIds.length===1?'point':'bundle',applies_to:labels,
        does_not_apply_to:[...entry.scopeExclusions,'動画全体の品質判定','他の動画・別の版','未提示の修正案の採用']},
      views:[{view_id:`${c.id}-current`,label:'現在の完成動画',role:'candidate',media_id:packet.media.id,
        start_frame:c.range.startFrame,end_frame:c.range.endFrameExclusive,
        context_start_frame:r.startFrame,context_end_frame:r.endFrameExclusive}]});
  }
  if (!points.length) return {status:'complete-no-presented-candidates',qualityApproved:false,review:null,
    inputSha256:packet.inputSha256,rawReplySha256:accepted.rawReplySha256,internalCandidates:candidates.length,limitations:accepted.reply.limitations};
  const review=validateReview({schema_version:'zev-point-review-v001',batch_id:batchId,revision,
    title:'完成Digestの確認ポイント',intro:'字幕・時間の対応と音声の数値から挙げた確認候補です。短い区間を再生して、現状を保つか、直したい点があるかを回答してください。',
    media:[{media_id:packet.media.id,label:'無修正の自動演出版',path:packet.media.path,sha256:packet.media.sha256,
      fps_num:packet.media.fpsNum,fps_den:packet.media.fpsDen,total_frames:packet.media.frameCount,
      timeline_id:`completed-${packet.media.sha256}`,timeline_start_frame:0}],points});
  return {status:'complete-review-ready',qualityApproved:false,review,inputSha256:packet.inputSha256,
    rawReplySha256:accepted.rawReplySha256,internalCandidates:candidates.length,presentedCandidates:points.length};
}
