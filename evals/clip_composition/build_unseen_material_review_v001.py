"""Create a human explanation and playback page only after the new render passes."""
import html
import json
import os
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'evals/clip_composition/outputs/work-unseen-material-thin-plan-024-v001'
FORMAL = WORK / 'formal-v004'


def read(p):
    return json.loads(Path(p).read_text())


def main():
    completed = read(FORMAL / 'render-completion.json')
    assert completed['status'] == 'technical-render-complete' and completed['qc'] == 'passed'
    selected = read(FORMAL / 'selection-adoption.json')
    execution = read(FORMAL / 'machine-adoption.json')
    assessment = read(FORMAL / 'retention-assessment.json')
    utterances = {u['utteranceId']: u['text'] for u in read(FORMAL / 'utterances.json')['utterances']}
    intent = read(WORK / 'thin-plan-v0.json')['productionIntent']
    all_candidates = sorted(selected['adoptedCandidates'] + selected['rejectedCandidates'],
                            key=lambda p: p['sourceInterval']['sourceStartMs'])
    cards, markdown = [], ['# 初見の鬼武者：理解と予想の変化', '', intent, '']
    for i, p in enumerate(all_candidates, 1):
        retained = p['judgment']['decision'] == 'adopt'
        label = '採用' if retained else '不採用'
        reason = p['judgment']['reason']
        text = ''.join(utterances[u] for u in p['includedUtteranceIds'])
        start, end = p['sourceInterval']['sourceStartMs'] / 1000, p['sourceInterval']['sourceEndMs'] / 1000
        cards.append(f'''<article class="candidate {'adopted' if retained else 'rejected'}">
          <div class="candidate-heading"><span class="badge">{label}</span><h3>場面{i} · {html.escape(p['title'])}</h3></div>
          <p>{html.escape(reason)}</p>
          <details><summary>判断に使った発話</summary><p class="transcript">{html.escape(text)}</p></details>
          <button type="button" class="source-play" data-start="{start}" data-end="{end}"
            data-title="{html.escape(p['title'], quote=True)}">元動画でこの場面を見る</button>
        </article>''')
        markdown.extend([f'## 場面{i}：{p["title"]} — {label}', '', reason, '', '判断に使った発話：', text, ''])
    timeline = read(FORMAL / 'base-media/timeline.json')
    assert len(timeline['segments']) == len(execution['selectedCandidates'])
    fps = int(timeline['baseMedia']['frameRate'].split('/')[0])
    duration = timeline['baseMedia']['expectedFrameCount'] / fps
    duration_label = f'{int(duration // 60)}分{round(duration % 60)}秒'
    composition = ''.join(
        f'<li>{html.escape(p["title"])} '
        f'<button type="button" class="finished-seek" data-start="{segment["outputStartFrame"] / fps}">この場面から再生</button></li>'
        for p, segment in zip(execution['selectedCandidates'], timeline['segments']))
    limits = ''.join(f'<li>{html.escape(s)}</li>' for s in assessment['perceptualLimitations'])
    review = WORK / 'review-v001'
    review.mkdir()
    report = ROOT / 'docs/reports/unseen-material-thin-plan-024-20260909.md'
    assert report.is_file(), 'Explain the completed result before preparing human review'
    shutil.copyfile(report, review / 'report.md')
    os.link(ROOT / completed['video']['path'], review / 'edited.mp4')
    os.link(ROOT / execution['sourceVideoBinding']['path'], review / 'source.mp4')
    (review / 'review.md').write_text('\n'.join(markdown), encoding='utf-8')
    page = '''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>初見の鬼武者：理解と予想の変化 · ZEV 指示-024</title>
    <style>
      :root{color-scheme:light;--ink:#183231;--muted:#576c69;--line:#d8e1dc;--accent:#216c56}
      *{box-sizing:border-box}body{margin:0;background:#f2f5f0;color:var(--ink);font:16px/1.8 system-ui,-apple-system,sans-serif}
      main{max-width:1040px;margin:auto;padding:40px 24px 80px}h1{font-size:clamp(26px,4vw,42px);line-height:1.35;margin:12px 0 28px}
      h2{font-size:23px;margin:0 0 18px}h3{font-size:18px;margin:0}.eyebrow{color:var(--accent);font-size:13px;letter-spacing:.12em}
      .panel,.candidate{background:#fff;border:1px solid var(--line);border-radius:14px;padding:24px;margin:20px 0}
      .intent{font-size:21px;font-weight:600}.muted{color:var(--muted)}p{margin:12px 0}.intro-links{display:flex;gap:12px;flex-wrap:wrap}
      a,button{color:var(--accent)}a{font-weight:600}button{background:#f4f8f3;border:1px solid #acc8bc;border-radius:8px;padding:9px 14px;font:inherit;cursor:pointer}
      button:hover{background:#e9f1e8}button:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid #da9b39;outline-offset:3px}
      video{display:block;width:100%;max-height:660px;background:#122120;border-radius:10px;margin:18px 0}
      .candidate-heading{display:flex;gap:12px;align-items:baseline}.badge{font-size:13px;white-space:nowrap;border:1px solid var(--line);border-radius:4px;padding:0 8px}
      .adopted .badge{background:#e4f2e8;color:#1d654c}.rejected .badge{background:#f0f0ec;color:#64645e}
      details{margin:14px 0}summary{cursor:pointer;color:var(--accent)}.transcript{white-space:pre-wrap;background:#f5f6f1;padding:16px}
      .note{border-left:3px solid #9aaa91;padding-left:16px}.axes li{margin:8px 0}.source-status{min-height:2em}
      #source-panel[hidden]{display:none}@media(max-width:600px){main{padding:24px 14px 60px}.panel,.candidate{padding:18px}.candidate-heading{display:block}.badge{display:inline-block;margin-bottom:8px}}
    </style><main>
    <div class="eyebrow">ZEV · 新しい素材での制作意図の検証</div><h1>初見の鬼武者：理解と予想の変化</h1>
    <section class="panel"><h2>今回見せたいもの</h2><p class="intent">__INTENT__</p>
      <p>元配信全体の発話から場面を新しく探し、上の意図に沿って採用を判断しました。先に人間の正解区間や採用件数を決めていません。</p>
      <p class="muted">今回は初めて生成した動画です。探索17場面のうち10場面を採用し、完成動画は__DURATION__です。以下に全候補の採否理由と完成構成を示します。構成一覧から各場面へ移動できます。</p>
      <nav class="intro-links"><a href="#decisions">候補と判断を見る</a><a href="#composition">完成構成を見る</a><a href="#finished">完成動画へ進む</a></nav>
    </section>
    <section id="decisions"><h2>見つかった候補と採否</h2>__CARDS__</section>
    <section class="panel" id="composition"><h2>完成した構成</h2><ol>__COMPOSITION__</ol>
      <p>採用場面を元配信の順に並べています。今回は各場面の文脈をそのまま保持しています。</p>
      <div class="note"><strong>発話本文だけでは確定できなかった点</strong><ul>__LIMITS__</ul></div>
    </section>
    <section class="panel" id="finished"><h2>完成動画 · __DURATION__</h2><video id="finished-video" controls preload="none" src="edited.mp4"></video>
      <p class="muted">技術検査は合格しています。制作意図への適合や見心地は、今回初めて確認をお願いします。</p>
    </section>
    <section class="panel" id="source-panel" hidden><h2>元動画の候補場面</h2><p id="source-status" class="source-status" aria-live="polite"></p>
      <video id="source-video" controls preload="none" src="source.mp4"></video><button id="stop-source" type="button">候補の再生を止める</button>
    </section>
    <section class="panel"><h2>確認していただきたいこと</h2><ol class="axes">
      <li>今回の制作意図に合っているか。</li><li>採用された候補は妥当か。</li><li>落とした候補に、必要なものがなかったか。</li>
      <li>候補の内部に、残しすぎ・不足がないか。</li><li>全体として見心地がよいか。</li>
      </ol><p>気になる場面があれば、場面名と感じたことを教えてください。全件一致を求める検証ではありません。</p>
      <p><a href="review.md">候補説明をテキストで読む</a> · <a href="report.md">検証報告を読む</a></p>
    </section></main>
    <script>
      const finished=document.getElementById('finished-video'),source=document.getElementById('source-video');
      const panel=document.getElementById('source-panel'),status=document.getElementById('source-status');let end=null;
      finished.addEventListener('play',()=>source.pause());source.addEventListener('play',()=>finished.pause());
      document.querySelectorAll('.finished-seek').forEach(button=>button.addEventListener('click',async()=>{
        source.pause();finished.currentTime=Number(button.dataset.start);
        document.getElementById('finished').scrollIntoView({behavior:'smooth',block:'start'});
        try{await finished.play()}catch(error){finished.focus();}
      }));
      document.querySelectorAll('.source-play').forEach(button=>button.addEventListener('click',async()=>{
        finished.pause();source.pause();panel.hidden=false;end=Number(button.dataset.end);
        status.textContent=button.dataset.title+'（候補の終わりで停止します）';source.currentTime=Number(button.dataset.start);
        panel.scrollIntoView({behavior:'smooth',block:'start'});
        try{await source.play()}catch(error){status.textContent='再生ボタンを押して、この候補をご確認ください。'}
      }));
      source.addEventListener('timeupdate',()=>{if(end!==null&&source.currentTime>=end){source.pause();end=null;}});
      document.getElementById('stop-source').addEventListener('click',()=>{source.pause();end=null;});
    </script></html>'''
    page = page.replace('__INTENT__', html.escape(intent)).replace('__CARDS__', ''.join(cards))
    page = page.replace('__COMPOSITION__', composition).replace('__LIMITS__', limits)
    page = page.replace('__DURATION__', duration_label)
    (review / 'review.html').write_text(page, encoding='utf-8')
    print(str(review))


if __name__ == '__main__':
    main()
