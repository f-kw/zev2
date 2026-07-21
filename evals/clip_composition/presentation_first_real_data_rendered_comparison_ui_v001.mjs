import vm from 'node:vm';

export const PRESENTATION_RENDERED_COMPARISON_PAGE_SCHEMA_V001 =
  'presentation-first-real-data-rendered-comparison-page-v001';
export const PRESENTATION_RENDERED_COMPARISON_MANIFEST_SCHEMA_V001 =
  'presentation-first-real-data-rendered-comparison-manifest-v001';
export const PRESENTATION_RENDERED_COMPARISON_RESULT_SCHEMA_V001 =
  'presentation-first-real-data-rendered-comparison-human-result-v001';
export const PRESENTATION_RENDERED_COMPARISON_VARIANT_IDS_V001 = Object.freeze([
  'keep-both',
  'cut-both',
  'cut-gap1',
  'cut-gap2',
]);

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const exactFields = (value, fields) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());
const validCandidate = (candidate) => exactFields(
  candidate,
  ['candidateId', 'title', 'startMs', 'endMs'],
)
  && Number.isInteger(candidate.candidateId)
  && typeof candidate.title === 'string'
  && candidate.title.length > 0
  && Number.isInteger(candidate.startMs)
  && Number.isInteger(candidate.endMs)
  && candidate.startMs < candidate.endMs;
const validMediaVariants = (mediaVariants) => Array.isArray(mediaVariants)
  && mediaVariants.length === PRESENTATION_RENDERED_COMPARISON_VARIANT_IDS_V001.length
  && mediaVariants.every((variant, index) => {
    const expectedId = PRESENTATION_RENDERED_COMPARISON_VARIANT_IDS_V001[index];
    return exactFields(variant, ['variantId', 'url', 'fileSha256'])
      && variant.variantId === expectedId
      && variant.url === `/preview/${expectedId}.mp4`
      && SHA256_PATTERN.test(variant.fileSha256);
  });

export const validatePresentationRenderedComparisonManifestV001 = (manifest) => {
  if (!exactFields(
    manifest,
    ['schemaVersion', 'manifestId', 'human_review_only', 'formalOutput', 'candidate', 'gaps', 'mediaVariants'],
  )) throw new TypeError('comparison manifest fields are invalid');
  if (
    manifest.schemaVersion !== PRESENTATION_RENDERED_COMPARISON_MANIFEST_SCHEMA_V001
    || typeof manifest.manifestId !== 'string'
    || manifest.manifestId.length === 0
    || manifest.human_review_only !== true
    || manifest.formalOutput !== false
    || !validCandidate(manifest.candidate)
    || !Array.isArray(manifest.gaps)
    || manifest.gaps.length !== 2
    || !manifest.gaps.every((gap, index) => exactFields(gap, ['gapId', 'startMs', 'endMs'])
      && gap.gapId === `gap-0${index + 1}`
      && Number.isInteger(gap.startMs)
      && Number.isInteger(gap.endMs)
      && manifest.candidate.startMs < gap.startMs
      && gap.startMs < gap.endMs
      && gap.endMs < manifest.candidate.endMs)
    || !validMediaVariants(manifest.mediaVariants)
  ) throw new TypeError('comparison manifest value is invalid');
  return manifest;
};

export const validatePresentationRenderedComparisonPageV001 = (page) => {
  if (!exactFields(
    page,
    ['schemaVersion', 'pageId', 'pageRevision', 'comparisonManifest', 'candidate', 'mediaVariants'],
  )) throw new TypeError('comparison page fields are invalid');
  if (
    page.schemaVersion !== PRESENTATION_RENDERED_COMPARISON_PAGE_SCHEMA_V001
    || typeof page.pageId !== 'string'
    || page.pageId.length === 0
    || !Number.isInteger(page.pageRevision)
    || page.pageRevision < 1
    || !exactFields(page.comparisonManifest, ['path', 'fileSha256'])
    || typeof page.comparisonManifest.path !== 'string'
    || page.comparisonManifest.path.length === 0
    || !SHA256_PATTERN.test(page.comparisonManifest.fileSha256)
    || !validCandidate(page.candidate)
    || !validMediaVariants(page.mediaVariants)
  ) throw new TypeError('comparison page value is invalid');
  return page;
};

export const derivePresentationRenderedComparisonResolutionV001 = ({primaryChoice, secondaryChoice}) => {
  if (primaryChoice === 'cut_both') {
    return {status: 'resolved', gapDecisions: {gap01: 'cut', gap02: 'cut'}, variantId: 'cut-both'};
  }
  if (primaryChoice === 'keep_both') {
    return {status: 'resolved', gapDecisions: {gap01: 'keep', gap02: 'keep'}, variantId: 'keep-both'};
  }
  if (primaryChoice !== 'one_or_different') return null;
  if (secondaryChoice === 'cut_gap1') {
    return {status: 'resolved', gapDecisions: {gap01: 'cut', gap02: 'keep'}, variantId: 'cut-gap1'};
  }
  if (secondaryChoice === 'cut_gap2') {
    return {status: 'resolved', gapDecisions: {gap01: 'keep', gap02: 'cut'}, variantId: 'cut-gap2'};
  }
  if (secondaryChoice === 'needs_other_editing') {
    return {status: 'needs_other_editing', gapDecisions: null, variantId: null};
  }
  return null;
};

export const buildPresentationRenderedComparisonHumanReviewResultV001 = ({
  page,
  primaryChoice,
  secondaryChoice = null,
  finalAssessment,
}) => {
  validatePresentationRenderedComparisonPageV001(page);
  const resolution = derivePresentationRenderedComparisonResolutionV001({primaryChoice, secondaryChoice});
  if (!resolution) throw new TypeError('comparison answers are incomplete');
  const allowedFinal = resolution.status === 'needs_other_editing'
    ? ['needs_more_editing']
    : ['comparison_sufficient', 'needs_more_editing'];
  if (!allowedFinal.includes(finalAssessment)) throw new TypeError('final assessment is invalid');
  return {
    schemaVersion: PRESENTATION_RENDERED_COMPARISON_RESULT_SCHEMA_V001,
    reviewId: page.pageId,
    candidate: page.candidate,
    primaryChoice,
    secondaryChoice,
    resolution,
    finalAssessment,
    comparisonManifest: {...page.comparisonManifest},
    selectedVariant: resolution.variantId
      ? page.mediaVariants.find(({variantId}) => variantId === resolution.variantId)
      : null,
    mediaBindings: page.mediaVariants.map(({variantId, fileSha256}) => ({variantId, fileSha256})),
    timeMeasurement: 'not_measured',
    formalAssemblyDecision: false,
  };
};

export const buildPresentationRenderedComparisonHumanReadableSummaryV001 = (result) => {
  const gapLabel = result.resolution.gapDecisions
    ? `間1=${result.resolution.gapDecisions.gap01 === 'cut' ? '切る' : '残す'} / 間2=${result.resolution.gapDecisions.gap02 === 'cut' ? '切る' : '残す'}`
    : '4状態では決められず、別の編集が必要';
  const finalLabel = result.finalAssessment === 'comparison_sufficient'
    ? 'この切り分け候補でよい'
    : '追加編集が必要';
  return [
    'candidate 13 実動画比較結果',
    `候補: ${result.candidate.title}`,
    `比較結果: ${gapLabel}`,
    `最終判断: ${finalLabel}`,
    '時間計測: なし',
    '正式組立決定: まだ作成しない',
  ].join('\n');
};

const escapeEmbeddedJson = (value) => JSON.stringify(value)
  .replaceAll('<', '\\u003c')
  .replaceAll('>', '\\u003e')
  .replaceAll('&', '\\u0026')
  .replaceAll('\u2028', '\\u2028')
  .replaceAll('\u2029', '\\u2029');

export const buildPresentationRenderedComparisonHtmlV001 = (pageInput, manifestInput) => {
  const page = validatePresentationRenderedComparisonPageV001(structuredClone(pageInput));
  const manifest = validatePresentationRenderedComparisonManifestV001(structuredClone(manifestInput));
  if (JSON.stringify(page.candidate) !== JSON.stringify(manifest.candidate)) {
    throw new TypeError('page and manifest candidate differ');
  }
  if (JSON.stringify(page.mediaVariants) !== JSON.stringify(manifest.mediaVariants)) {
    throw new TypeError('page and manifest media bindings differ');
  }
  const embeddedPage = escapeEmbeddedJson(page);
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>candidate 13 実動画比較</title>
  <style>
    :root{color-scheme:dark;--bg:#10131a;--panel:#1a2030;--line:#39445d;--text:#f4f7ff;--muted:#bac3d8;--accent:#78d5ff;--button:#283653;--selected:#125b78}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif;padding-bottom:116px}
    main{width:min(1180px,96vw);margin:0 auto;padding:18px 0 28px}h1{font-size:clamp(21px,3vw,30px);margin:0 0 8px}.lead{color:var(--muted);line-height:1.65;margin:0 0 14px}.notice{padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:#141a27;margin-bottom:14px}.notice strong{color:var(--accent)}
    .comparison{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:10px}.card h2{font-size:17px;margin:0 0 8px}.card p{color:var(--muted);margin:6px 0 0;font-size:14px}video{display:block;width:100%;max-height:min(43vh,440px);background:#000;object-fit:contain;border-radius:8px}
    .hidden{display:none!important}.question{margin:16px 0 0;font-size:18px;font-weight:700}.footer{position:fixed;z-index:4;left:0;right:0;bottom:0;background:rgba(12,15,21,.97);border-top:1px solid var(--line);padding:10px max(2vw,12px)}.choices{width:min(1180px,96vw);margin:0 auto;display:flex;flex-wrap:wrap;gap:8px;justify-content:center}.choices button,.actions button{border:1px solid #52617f;background:var(--button);color:var(--text);border-radius:10px;padding:12px 16px;font-size:16px;font-weight:700;cursor:pointer}.choices button.active{background:var(--selected);border-color:var(--accent)}button.secondary{background:#222836}.result{margin-top:16px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px}.result textarea{width:100%;min-height:210px;background:#0b0e14;color:var(--text);border:1px solid var(--line);border-radius:8px;padding:10px;font:13px ui-monospace,monospace}.actions{display:flex;gap:8px;margin-top:8px}.status{color:var(--accent);min-height:1.5em}
    @media(max-width:720px){body{padding-bottom:120px}video{max-height:28vh}.choices button{padding:9px 10px;font-size:14px}}
    @media(max-width:420px){body{padding-bottom:178px}.comparison{grid-template-columns:1fr}video{max-height:24vh}.footer .choices{display:grid;grid-template-columns:1fr}.choices button{width:100%}}
  </style>
</head>
<body>
<main>
  <h1>2つの「間」を、実際に切った動画で比べます</h1>
  <p class="lead">candidate 13「${page.candidate.title}」。編集後を想像する必要はありません。まず下の2本だけを見て、自然な方を選んでください。</p>
  <div class="notice"><strong>見ること:</strong> 話の流れと、切り替わりが自然か。<br><strong>見なくてよいこと:</strong> テロップや演出の見た目。これは切断・接続だけの確認用動画です。</div>

  <section id="primaryStage">
    <div class="comparison">
      <article class="card"><h2>動画A — 2つの間を残した実物</h2><video controls preload="metadata" src="/preview/keep-both.mp4"></video><p>元候補を、そのまま1本にした状態です。</p></article>
      <article class="card"><h2>動画B — 2つの間を切った実物</h2><video controls preload="metadata" src="/preview/cut-both.mp4"></video><p>提示された2つの間を、実際に削除して接続した状態です。</p></article>
    </div>
    <p class="question">どの切り方がよいですか？</p>
  </section>

  <section id="secondaryStage" class="hidden">
    <button id="backPrimary" class="secondary">← 最初の2本へ戻る</button>
    <p class="lead">片方だけ切った2本です。ここでも決まらなければ「別の編集が必要」を選べます。</p>
    <div class="comparison">
      <article class="card"><h2>動画C — 間1だけ切った実物</h2><video controls preload="metadata" data-lazy-src="/preview/cut-gap1.mp4"></video></article>
      <article class="card"><h2>動画D — 間2だけ切った実物</h2><video controls preload="metadata" data-lazy-src="/preview/cut-gap2.mp4"></video></article>
    </div>
    <p class="question">片方だけ切るなら、どちらですか？</p>
  </section>

  <section id="finalStage" class="hidden">
    <button id="backComparison" class="secondary">← 比較を選び直す</button>
    <p id="resolvedText" class="question"></p>
    <p class="lead">これは比較結果です。正式な組立決定や動画生成は、結果確認後の別工程です。</p>
  </section>

  <section id="resultPanel" class="result hidden">
    <h2>コピーして貼り付ける結果</h2>
    <textarea id="resultText" readonly></textarea>
    <div class="actions"><button id="copyResult">結果をコピー</button><button id="changeAnswer" class="secondary">回答を変更</button></div>
    <p id="copyStatus" class="status"></p>
  </section>
</main>

<footer class="footer">
  <div id="primaryChoices" class="choices">
    <button data-primary="cut_both">2か所とも切る方がよい</button>
    <button data-primary="keep_both">2か所とも残す方がよい</button>
    <button data-primary="one_or_different">片方だけ切る／この2本では決まらない</button>
  </div>
  <div id="secondaryChoices" class="choices hidden">
    <button data-secondary="cut_gap1">間1だけ切る</button>
    <button data-secondary="cut_gap2">間2だけ切る</button>
    <button data-secondary="needs_other_editing">この4本では決まらない</button>
  </div>
  <div id="finalChoices" class="choices hidden">
    <button data-final="comparison_sufficient">この切り分け候補でよい</button>
    <button data-final="needs_more_editing">別の編集が必要</button>
  </div>
</footer>

<script>
  const PAGE=${embeddedPage};
  const state={primaryChoice:null,secondaryChoice:null,finalAssessment:null};
  const byId=(id)=>document.getElementById(id);
  const resolution=()=>{
    if(state.primaryChoice==='cut_both')return{status:'resolved',gapDecisions:{gap01:'cut',gap02:'cut'},variantId:'cut-both'};
    if(state.primaryChoice==='keep_both')return{status:'resolved',gapDecisions:{gap01:'keep',gap02:'keep'},variantId:'keep-both'};
    if(state.primaryChoice!=='one_or_different')return null;
    if(state.secondaryChoice==='cut_gap1')return{status:'resolved',gapDecisions:{gap01:'cut',gap02:'keep'},variantId:'cut-gap1'};
    if(state.secondaryChoice==='cut_gap2')return{status:'resolved',gapDecisions:{gap01:'keep',gap02:'cut'},variantId:'cut-gap2'};
    if(state.secondaryChoice==='needs_other_editing')return{status:'needs_other_editing',gapDecisions:null,variantId:null};
    return null;
  };
  const pauseAll=()=>document.querySelectorAll('video').forEach((video)=>video.pause());
  const loadSecondaryMedia=()=>document.querySelectorAll('video[data-lazy-src]').forEach((video)=>{
    if(video.getAttribute('src'))return;
    video.setAttribute('src',video.dataset.lazySrc);
    video.load();
  });
  const show=(id,visible)=>byId(id).classList.toggle('hidden',!visible);
  const finalText=(resolved)=>resolved.status==='needs_other_editing'?'4本のどれでもなく、別の編集が必要です。':resolved.variantId==='cut-both'?'「2か所とも切る」を選びました。':resolved.variantId==='keep-both'?'「2か所とも残す」を選びました。':resolved.variantId==='cut-gap1'?'「間1だけ切る」を選びました。':'「間2だけ切る」を選びました。';
  const render=()=>{
    const resolved=resolution();
    const secondary=state.primaryChoice==='one_or_different'&&!resolved;
    const final=Boolean(resolved)&&resolved.status==='resolved'&&!state.finalAssessment;
    const complete=Boolean(resolved)&&Boolean(state.finalAssessment);
    show('primaryStage',!state.primaryChoice);show('primaryChoices',!state.primaryChoice);
    show('secondaryStage',secondary);show('secondaryChoices',secondary);
    show('finalStage',final);show('finalChoices',final);
    show('resultPanel',complete);
    if(resolved)byId('resolvedText').textContent=finalText(resolved);
    if(complete){
      const result={schemaVersion:'${PRESENTATION_RENDERED_COMPARISON_RESULT_SCHEMA_V001}',reviewId:PAGE.pageId,candidate:PAGE.candidate,primaryChoice:state.primaryChoice,secondaryChoice:state.secondaryChoice,resolution:resolved,finalAssessment:state.finalAssessment,comparisonManifest:{...PAGE.comparisonManifest},selectedVariant:resolved.variantId?PAGE.mediaVariants.find(({variantId})=>variantId===resolved.variantId):null,mediaBindings:PAGE.mediaVariants.map(({variantId,fileSha256})=>({variantId,fileSha256})),timeMeasurement:'not_measured',formalAssemblyDecision:false};
      const gapLabel=resolved.gapDecisions?'間1='+(resolved.gapDecisions.gap01==='cut'?'切る':'残す')+' / 間2='+(resolved.gapDecisions.gap02==='cut'?'切る':'残す'):'4状態では決められず、別の編集が必要';
      const summary=['candidate 13 実動画比較結果','候補: '+PAGE.candidate.title,'比較結果: '+gapLabel,'最終判断: '+(state.finalAssessment==='comparison_sufficient'?'この切り分け候補でよい':'追加編集が必要'),'時間計測: なし','正式組立決定: まだ作成しない','','--- 厳密JSON ---',JSON.stringify(result,null,2)].join('\\n');
      byId('resultText').value=summary;
    }
    document.querySelectorAll('[data-primary]').forEach((button)=>button.classList.toggle('active',button.dataset.primary===state.primaryChoice));
    document.querySelectorAll('[data-secondary]').forEach((button)=>button.classList.toggle('active',button.dataset.secondary===state.secondaryChoice));
  };
  document.querySelectorAll('[data-primary]').forEach((button)=>button.addEventListener('click',()=>{pauseAll();state.primaryChoice=button.dataset.primary;state.secondaryChoice=null;state.finalAssessment=null;if(state.primaryChoice==='one_or_different')loadSecondaryMedia();render();window.scrollTo({top:0,behavior:'smooth'});}));
  document.querySelectorAll('[data-secondary]').forEach((button)=>button.addEventListener('click',()=>{pauseAll();state.secondaryChoice=button.dataset.secondary;state.finalAssessment=state.secondaryChoice==='needs_other_editing'?'needs_more_editing':null;render();window.scrollTo({top:0,behavior:'smooth'});}));
  document.querySelectorAll('[data-final]').forEach((button)=>button.addEventListener('click',()=>{state.finalAssessment=button.dataset.final;render();byId('resultPanel').scrollIntoView({behavior:'smooth'});}));
  byId('backPrimary').addEventListener('click',()=>{pauseAll();state.primaryChoice=null;state.secondaryChoice=null;state.finalAssessment=null;render();});
  byId('backComparison').addEventListener('click',()=>{state.finalAssessment=null;if(state.primaryChoice==='one_or_different')state.secondaryChoice=null;else state.primaryChoice=null;render();});
  byId('changeAnswer').addEventListener('click',()=>{const resolved=resolution();state.finalAssessment=null;if(resolved?.status==='needs_other_editing')state.secondaryChoice=null;render();});
  byId('copyResult').addEventListener('click',async()=>{const text=byId('resultText');try{await navigator.clipboard.writeText(text.value);byId('copyStatus').textContent='コピーしました。チャットへ貼り付けてください。';}catch{ text.focus();text.select();byId('copyStatus').textContent='結果欄を選択しました。通常のコピー操作を使ってください。';}});
  document.querySelectorAll('video').forEach((video)=>video.addEventListener('play',()=>document.querySelectorAll('video').forEach((other)=>{if(other!==video)other.pause();})));
  render();
</script>
</body>
</html>`;
};

export const validatePresentationRenderedComparisonGeneratedHtmlV001 = (html) => {
  if (typeof html !== 'string' || !html.startsWith('<!doctype html>')) {
    throw new TypeError('generated HTML is invalid');
  }
  const script = html.match(/<script>([\s\S]*?)<\/script>/u)?.[1];
  if (!script) throw new TypeError('generated HTML script is missing');
  new vm.Script(script);
  const required = [
    '/preview/keep-both.mp4',
    '/preview/cut-both.mp4',
    '/preview/cut-gap1.mp4',
    '/preview/cut-gap2.mp4',
    '時間計測: なし',
    '正式組立決定: まだ作成しない',
  ];
  required.forEach((text) => {
    if (!html.includes(text)) throw new TypeError(`generated HTML is missing: ${text}`);
  });
  if (/localStorage|sessionStorage|<input[^>]+type=["'](?:time|number)/u.test(html)) {
    throw new TypeError('generated HTML includes prohibited persistence or time entry');
  }
  return {status: 'passed'};
};
