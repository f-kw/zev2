#!/usr/bin/env python3
"""研究用の既存3候補を束ねる。再描画・外部送信・人間観測の生成は行わない。"""
import hashlib
import json
import os
import subprocess
from pathlib import Path

ROOT = Path('/private/tmp/zev-connection-study-_ijhcn1e')
OUT = ROOT / 'candidate-review-v002'
BASELINE = '543ec3356f5bf976a5378317c09249aac61bea0d'


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


PAGE = r'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; media-src 'self' file:; connect-src 'none'; base-uri 'none'; form-action 'none'">
<title>Digest 接続候補の比較</title>
<style>
:root{font:16px/1.7 system-ui,-apple-system,"Hiragino Sans",sans-serif;color:#192f2a;background:#f3f6f4;--green:#165d52;--line:#cbd9d2}*{box-sizing:border-box}body{margin:0}main{max-width:1180px;margin:auto;padding:34px 24px 70px}h1{font-size:clamp(1.6rem,4vw,2.2rem);line-height:1.35;margin:6px 0 16px}h2{margin:0 0 14px;font-size:1.3rem}h3{font-size:1rem;margin:0 0 7px}.eyebrow{font-size:.8rem;letter-spacing:.12em;color:var(--green);font-weight:700}header{max-width:900px}p{margin:0 0 14px}.guide{border-left:4px solid var(--green);padding:15px 18px;background:#e5eee8;margin:22px 0}.case{background:white;border:1px solid var(--line);border-radius:14px;padding:24px;margin:24px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px}.candidate p,.note{font-size:.85rem;color:#526760}video{display:block;width:100%;aspect-ratio:16/9;background:#000;margin-bottom:8px}.field{margin:20px 0}label{display:block;font-weight:600}textarea{font:inherit;width:100%;padding:12px;border:1px solid #aebfb6;border-radius:8px;min-height:95px;resize:vertical;margin-top:6px;color:inherit}.watched{font-size:.9rem;display:flex;gap:9px;align-items:flex-start;font-weight:500}.watched input{width:19px;height:19px;margin-top:5px;accent-color:var(--green)}button{font:inherit;background:var(--green);color:white;padding:12px 18px;border:0;border-radius:8px;cursor:pointer}button:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid #c17d1b;outline-offset:3px}#status{min-height:1.7em;font-size:.88rem}#export{min-height:230px;font-size:.85rem}.error{color:#984a17;font-size:.88rem}.footer{border-top:1px solid var(--line);padding-top:24px}noscript{color:#984a17}@media(max-width:740px){main{padding:22px 14px 45px}.pair{grid-template-columns:1fr}.case{padding:17px}}
</style></head><body><main>
<header><div class="eyebrow">DIGEST · 接続候補の比較</div><h1>3つの接続で、見せ方を比べる</h1>
<p>元のつながりと、間に区切りを加えた候補を見比べます。どちらも未採用です。改善した、悪化した、追加は不要、判断できないなど、感じたことを自由に残してください。</p>
<div class="guide"><p><strong>先に元の接続を見て、その印象を書いてから、区切りを加えた候補を見てください。</strong></p>
<p>元の動画は8秒、接続は4秒地点です。比較候補は同じ位置に0.4秒の黒と無音を加えています。切り出しの最初と最後は評価対象に含めません。</p>
<p>音声が聞こえる状態で通常速度で再生してください。動画は一度に1本だけ再生します。再生できない場合は記入を止め、状況を伝えてください。</p></div></header>
<noscript>このページの記録にはJavaScriptが必要です。</noscript>
<p id="progress" aria-live="polite">確認・記入済み 0 / 3</p><div id="cases"></div>
<section class="footer"><h2>比較の記録</h2><p class="note">入力はこのブラウザーに保存します。閉じる前にテキストをダウンロードしてください。途中の記録も保存できます。未確認や未記入の状態は、そのまま記録に残ります。</p>
<button id="download" type="button">記録をダウンロード</button> <button id="show" type="button">記録を表示</button><p id="status" role="status"></p><textarea id="export" aria-label="比較記録の全文" readonly hidden></textarea></section>
</main><script>
(() => {
 'use strict';
 const pack = __PACKAGE_DATA__;
 const key = 'zev-connection-candidate-review-_ijhcn1e-v002';
 const fields = [['original','元の接続に問題を感じるか'],['comparison','区切りを加えた候補で、どう変わったか'],['reason','そう感じた理由']];
 const blank = () => pack.cases.map(c => ({id:c.id,original:'',comparison:'',reason:'',normalWatched:false,separatorWatched:false}));
 let records = blank(); let storageReadable = true;
 const status = document.getElementById('status');
 try { const raw=localStorage.getItem(key); if(raw!==null){const s=JSON.parse(raw);if(s.packageId!==pack.packageId||!Array.isArray(s.records)||s.records.length!==3)throw Error('記録不一致');s.records.forEach((r,i)=>{if(r.id!==pack.cases[i].id||fields.some(([f])=>typeof r[f]!=='string')||typeof r.normalWatched!=='boolean'||typeof r.separatorWatched!=='boolean')throw Error('記録不一致');});records=s.records;} } catch(_){storageReadable=false;status.textContent='保存済み記録を読めませんでした。上書きせず、今回の入力はダウンロードで保存します。';}
 const complete = r => r.normalWatched&&r.separatorWatched&&fields.every(([f])=>r[f].trim()!=='');
 const progress = () => {document.getElementById('progress').textContent=`確認・記入済み ${records.filter(complete).length} / 3`;};
 function save(){progress();if(!storageReadable)return;try{localStorage.setItem(key,JSON.stringify({packageId:pack.packageId,records}));status.textContent='入力をブラウザーに保存しました。';}catch(_){status.textContent='ブラウザーに保存できません。閉じる前にダウンロードしてください。';}}
 const videos=[];
 pack.cases.forEach((c,i)=>{
  const section=document.createElement('section');section.className='case';
  const h=document.createElement('h2');h.textContent=`接続 ${c.ordinal}`;section.append(h);
  const pair=document.createElement('div');pair.className='pair';section.append(pair);
  [['normal','元の接続','何も加えていないつながり · 8秒','normalWatched'],['separator','区切りを加えた候補','4秒地点から黒と無音を0.4秒追加 · 8.4秒','separatorWatched']].forEach(([kind,label,note,field])=>{
   const box=document.createElement('div');box.className='candidate';const title=document.createElement('h3');title.textContent=label;
   const video=document.createElement('video');video.controls=true;video.playsInline=true;video.preload='metadata';video.src=c[kind].file;video.setAttribute('aria-label',`接続${c.ordinal} ${label}`);video.muted=false;video.defaultPlaybackRate=1;video.playbackRate=1;
   const normalSpeed=()=>{if(video.playbackRate!==1)video.playbackRate=1;};video.addEventListener('ratechange',normalSpeed);video.addEventListener('play',()=>{normalSpeed();videos.forEach(v=>{if(v!==video)v.pause();});});videos.push(video);
   const help=document.createElement('p');help.textContent=note;const error=document.createElement('p');error.className='error';error.hidden=true;error.textContent='再生できません。この候補の確認は未実施のままにしてください。';video.addEventListener('error',()=>{error.hidden=false;});
   const checkLabel=document.createElement('label');checkLabel.className='watched';const check=document.createElement('input');check.type='checkbox';check.checked=records[i][field];check.addEventListener('change',()=>{records[i][field]=check.checked;save();});const text=document.createElement('span');text.textContent='映像と音声を実際に確認した';checkLabel.append(check,text);box.append(title,video,help,error,checkLabel);pair.append(box);
  });
  fields.forEach(([field,label])=>{const div=document.createElement('div');div.className='field';const lab=document.createElement('label');lab.textContent=label;lab.htmlFor=`${c.id}-${field}`;const input=document.createElement('textarea');input.id=lab.htmlFor;input.value=records[i][field];input.addEventListener('input',()=>{records[i][field]=input.value;save();});div.append(lab,input);section.append(div);});
  document.getElementById('cases').append(section);
 });
 function report(){const lines=['Digest 接続候補の比較 — 人間記録',`作成日時：${new Date().toISOString()}`,`確認・記入済み ${records.filter(complete).length} / 3`,''];records.forEach((r,i)=>{const c=pack.cases[i];lines.push(`【接続 ${c.ordinal}】`,`元の接続の視聴：${r.normalWatched?'本人が確認済み':'未確認'}`,`候補の視聴：${r.separatorWatched?'本人が確認済み':'未確認'}`);fields.forEach(([f,label])=>{lines.push(label,r[f].trim()?r[f]:'（未記入）');});lines.push('');});lines.push('照合用の対象情報',`研究パッケージ：${pack.packageId}`,`正本SHA-256：${pack.canonicalSha256}`,`技術検査基準：${pack.technicalBaseline}`);pack.cases.forEach(c=>lines.push(`${c.id} / 正本境界 ${c.canonicalBoundaryFrame} frame / 元の接続 ${c.normal.sha256} / 候補 ${c.separator.sha256}`));return lines.join('\n');}
 document.getElementById('show').addEventListener('click',()=>{videos.forEach(v=>v.pause());const box=document.getElementById('export');box.value=report();box.hidden=false;});
 document.getElementById('download').addEventListener('click',()=>{save();const url=URL.createObjectURL(new Blob(['\ufeff',report()],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='Digest接続候補の比較記録.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);status.textContent='記録のダウンロードを開始しました。';});
 progress();
})();
</script></body></html>
'''


def main():
    tree = Path(__file__).resolve().parents[2]
    evidence_name = 'docs/reports/digest-connection-technical-evidence-20260917.json'
    evidence_bytes = subprocess.check_output(['git', 'show', BASELINE + ':' + evidence_name], cwd=tree)
    assert (tree / evidence_name).read_bytes() == evidence_bytes
    evidence = json.loads(evidence_bytes)
    fixture_path = ROOT / 'technical-fixtures-v001/physical-fixture-result.json'
    binding = next(x for x in evidence['rawEvidenceBindings'] if x['path'] == str(fixture_path))
    assert sha(fixture_path) == binding['sha256'] and fixture_path.stat().st_size == binding['bytes']
    fixture = json.loads(fixture_path.read_text())
    assert fixture['status'] == 'passed' and fixture['inputBindingsUnchanged']
    selected = ['connection-01', 'connection-02', 'connection-11']
    assert [c['connectionId'] for c in fixture['results']] == selected
    canonical_shas = {c['excerpt']['canonicalSha256'] for c in fixture['results']}
    assert len(canonical_shas) == 1
    OUT.mkdir(exist_ok=False)
    pack = {'packageId': 'digest-connection-candidates-20260917-v002',
            'technicalBaseline': BASELINE, 'canonicalSha256': canonical_shas.pop(),
            'scope': '未検証の2候補。人間の知覚・採用は未判定。既存媒体のみ再利用。',
            'fixtureEvidence': {'path': str(fixture_path), 'sha256': sha(fixture_path)},
            'cases': []}
    preserved = []
    for case in fixture['results']:
        assert case['resetFromOriginalInputRestoredVideoAudioAndCaptionClock']
        entry = {'id': case['connectionId'], 'ordinal': int(case['connectionId'][-2:]),
                 'canonicalBoundaryFrame': case['canonicalBoundaryFrame'],
                 'beforeSegmentId': case['beforeSegmentId'], 'afterSegmentId': case['afterSegmentId']}
        for variant in case['variants']:
            path = Path(variant['path'])
            assert sha(path) == variant['sha256']
            assert variant['completeRetainedFrameSequenceEqual'] and variant['completeRetainedPcmEqual']
            assert not variant['videoClock']['gapOrOverlap'] and not variant['audioClock']['gapOrOverlap']
            preserved.append({'path': str(path), 'sha256': variant['sha256']})
            media = variant['reviewMp4']
            source = Path(media['path'])
            assert sha(source) == media['sha256']
            preserved.append({'path': str(source), 'sha256': media['sha256']})
            if variant['variant'] == 'reset':
                entry['resetEvidence'] = {'path': str(path), 'sha256': variant['sha256']}
                continue
            name = {'baseline': 'normal', 'black': 'separator'}[variant['variant']]
            target = OUT / (case['connectionId'] + '-' + name + '.mp4')
            os.link(source, target)
            assert sha(target) == media['sha256']
            entry[name] = {'file': target.name, 'sha256': media['sha256'], 'sourcePath': str(source),
                           'frames': variant['frameCount'],
                           'logicalSamplesPerChannel': media['expectedTimelineSamplesPerChannel'],
                           'decodedSamplesPerChannel': media['decodedSamplesPerChannel'],
                           'decodedTailSamplesPerChannel': media['decodedTailDifferenceSamplesPerChannel'],
                           'identityScope': '可逆fixtureで全保持画素・floatPCM照合済み。AAC再圧縮は同一性を主張しない。'}
        assert {'normal', 'separator', 'resetEvidence'}.issubset(entry)
        pack['cases'].append(entry)
    page = PAGE.replace('__PACKAGE_DATA__', json.dumps(pack, ensure_ascii=False).replace('<', '\\u003c'))
    page_path = OUT / 'review.html'
    page_path.write_text(page)
    manifest = {'package': pack, 'page': {'path': str(page_path), 'sha256': sha(page_path)},
                'baselineEvidenceSha256': hashlib.sha256(evidence_bytes).hexdigest(),
                'mediaRendered': 0, 'mediaHardlinks': 6, 'preservedInputBindings': preserved,
                'browserExecution': '未実施。既存のfile URL拒否を迂回していない。',
                'humanRecords': '未記入・未受領', 'scope': '研究候補パッケージ。production契約ではない。'}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'status': 'passed', 'out': str(OUT), 'cases': len(pack['cases']),
                      'hardlinkedMp4': 6, 'sourceBindingsVerified': len(preserved), 'rendered': 0}, ensure_ascii=False))


if __name__ == '__main__':
    main()
