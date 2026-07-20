#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  serializePresentationCaptionReport,
  validatePresentationCaptionContract,
} from './presentation_caption_contract.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, '..', '..');
const outputRoot = path.join(
  scriptDir,
  'outputs',
  'presentation',
  'minimum-sufficiency-diagnosis-20260720-v001',
);
const mediaDir = path.join(outputRoot, 'media');
const planDir = path.join(outputRoot, 'caption-plans');
const imageDir = path.join(outputRoot, 'caption-images');

const STYLE = Object.freeze({
  id: 'default-conservative-v001',
  width: 1920,
  height: 1080,
  fontFamily: 'LINESeedJP_A_OTF_Bd.otf',
  fontSize: 120,
  fontColor: '#ffffff',
  borderColor: '#000000',
  borderWidth: 3,
  lineSpacing: 50,
  glowColor: '#000000',
  glowColorMode: 'fixed',
  glowWidth: 20,
  glowOpacity: 100,
  maxLineWeight: 16,
  maxLines: 2,
  positionPreset: 'bottom-center',
});

const CASE_DEFINITIONS = Object.freeze([
  {
    caseId: 'minimum-sufficiency-01',
    fixtureId: 'nOEWCNc77MI_multiblock_material_v001',
    teacherVideoId: 'nOEWCNc77MI',
    sourceVideoId: 'YE-faluP7zY',
    sourceSttId: 'nOEWCNc77MI_YE-faluP7zY_local30_v001',
    blockIndex: 10,
  },
  {
    caseId: 'minimum-sufficiency-02',
    fixtureId: '9dtwF5Exu5w_multiblock_material_v001',
    teacherVideoId: '9dtwF5Exu5w',
    sourceVideoId: 'o8rZAhARXAc',
    sourceSttId: '9dtwF5Exu5w_o8rZAhARXAc_local30_v001',
    blockIndex: 10,
  },
]);

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));
const writeJson = async (filePath, value) => writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const fileSha256 = async (filePath) => sha256(await readFile(filePath));

const run = (command, args, options = {}) => new Promise((resolve, reject) => {
  const output = [];
  const child = spawn(command, args, {
    cwd: options.cwd ?? workspaceRoot,
    env: { ...process.env, ...(options.env ?? {}) },
  });
  child.stdout.on('data', (chunk) => output.push(chunk.toString()));
  child.stderr.on('data', (chunk) => output.push(chunk.toString()));
  child.on('error', reject);
  child.on('close', (code) => {
    if (code === 0) {
      resolve(output.join(''));
      return;
    }
    reject(new Error(`${command} failed with code ${code ?? 'unknown'}\n${output.join('')}`));
  });
});

const getTextWeight = (text) => {
  let weight = 0;
  for (const character of text) {
    weight += /^[\u0000-\u00ff]$/.test(character) ? 1 : 2;
  }
  return weight;
};

const normalizeSpeaker = (speaker) => (
  typeof speaker === 'string' && speaker.trim() ? speaker.trim() : 'unknown'
);

const buildTokens = (atoms) => {
  const text = atoms.map((atom) => atom.text).join('');
  const atomSpans = [];
  let offset = 0;
  for (const atom of atoms) {
    const start = offset;
    offset += atom.text.length;
    atomSpans.push({ atom, start, end: offset });
  }

  const segments = [...new Intl.Segmenter('ja', { granularity: 'word' }).segment(text)];
  return segments.map((segment, tokenIndex) => {
    const start = segment.index;
    const end = start + segment.segment.length;
    const memberAtoms = atomSpans
      .filter((span) => span.start < end && span.end > start)
      .map((span) => span.atom);
    if (memberAtoms.length === 0) {
      throw new Error(`token ${tokenIndex} has no source atom: ${segment.segment}`);
    }
    const sourceText = memberAtoms.map((atom) => atom.text).join('');
    if (sourceText !== segment.segment) {
      throw new Error(`Intl.Segmenter mapping changed source text: ${sourceText} != ${segment.segment}`);
    }
    return {
      tokenIndex,
      text: sourceText,
      weight: getTextWeight(sourceText),
      atoms: memberAtoms,
    };
  });
};

const buildCueGroups = (tokens) => {
  const cues = [];
  let lines = [];
  let currentLine = [];
  let currentWeight = 0;

  const flushLine = () => {
    if (currentLine.length === 0) return;
    lines.push(currentLine);
    currentLine = [];
    currentWeight = 0;
  };
  const flushCue = () => {
    flushLine();
    if (lines.length === 0) return;
    cues.push(lines);
    lines = [];
  };

  for (const token of tokens) {
    if (token.weight > STYLE.maxLineWeight) {
      throw new Error(`word token exceeds fixed line capacity: ${token.text}`);
    }
    if (currentLine.length > 0 && currentWeight + token.weight > STYLE.maxLineWeight) {
      flushLine();
    }
    if (lines.length >= STYLE.maxLines) {
      flushCue();
    }
    currentLine.push(token);
    currentWeight += token.weight;
  }
  flushCue();
  return cues;
};

const buildCaptionContract = ({ caseDefinition, expectedCut, sourceWords }) => {
  const selectedWords = sourceWords.filter((word) => (
    word.startMs >= expectedCut.sourceStartMs
    && word.endMs <= expectedCut.sourceEndMs
    && typeof word.text === 'string'
    && word.text.length > 0
  ));
  if (selectedWords.length === 0) throw new Error(`${caseDefinition.caseId}: source words are empty`);

  const atoms = selectedWords.map((word, index) => ({
    atomId: `${caseDefinition.caseId}-atom-${String(index + 1).padStart(4, '0')}`,
    speechId: Number.isInteger(word.segmentId) ? word.segmentId : index + 1,
    speaker: normalizeSpeaker(word.speaker),
    text: word.text,
    startMs: word.startMs,
    endMs: word.endMs,
  }));
  const tokens = buildTokens(atoms);
  const groups = buildCueGroups(tokens);
  const cues = groups.map((lines, cueIndex) => {
    const flattenedAtoms = lines.flatMap((line) => line.flatMap((token) => token.atoms));
    const firstAtom = flattenedAtoms[0];
    const lastAtom = flattenedAtoms.at(-1);
    return {
      cueId: `${caseDefinition.caseId}-cue-${String(cueIndex + 1).padStart(2, '0')}`,
      targetId: `${caseDefinition.caseId}-target-01`,
      lines: lines.map((line) => {
        const lineAtoms = line.flatMap((token) => token.atoms);
        return {
          atomIds: lineAtoms.map((atom) => atom.atomId),
          renderedText: lineAtoms.map((atom) => atom.text).join(''),
        };
      }),
      startAnchor: { atomId: firstAtom.atomId, edge: 'start' },
      endAnchor: { atomId: lastAtom.atomId, edge: 'end' },
      startMs: firstAtom.startMs,
      endMs: lastAtom.endMs,
    };
  });

  return {
    schemaVersion: 'presentation-caption-check-v001',
    format: 'normal-landscape',
    source: {
      atomGranularity: 'character-timestamp',
      atomProvenance: `${caseDefinition.sourceSttId}/source/word-timestamps.json`,
      atoms,
      captionTargets: [{
        targetId: `${caseDefinition.caseId}-target-01`,
        requiredAtomIds: atoms.map((atom) => atom.atomId),
        allowedOmissionAtomIds: [],
      }],
      allowedSimultaneousGroups: [],
    },
    captionPlan: { cues },
  };
};

const validateExpectedCut = (definition, expectedCut) => {
  if (!expectedCut) throw new Error(`${definition.caseId}: expected block missing`);
  if (expectedCut.sourceVideoId !== definition.sourceVideoId) {
    throw new Error(`${definition.caseId}: source video mismatch`);
  }
  if (expectedCut.clipId !== definition.teacherVideoId) {
    throw new Error(`${definition.caseId}: teacher video mismatch`);
  }
  if (expectedCut.humanVerification?.status !== 'confirmed') {
    throw new Error(`${definition.caseId}: human verification is not confirmed`);
  }
  const transitions = expectedCut.materialBlock?.internalTransitions ?? [];
  if (transitions.some((transition) => transition.materialJumpMs !== 0)) {
    throw new Error(`${definition.caseId}: non-zero internal material jump exists`);
  }
  const internalGap = expectedCut.materialBlock?.internalGapMs ?? {};
  if ((internalGap.sourceExtraInsideMs ?? 0) !== 0 || (internalGap.clipExtraInsideMs ?? 0) !== 0) {
    throw new Error(`${definition.caseId}: internal gap difference exists`);
  }
};

const renderCaptionPng = async ({ cue, outputPath }) => {
  const props = {
    text: cue.lines.map((line) => line.renderedText).join('\n'),
    style: {
      fontFamily: STYLE.fontFamily,
      fontSize: STYLE.fontSize,
      fontColor: STYLE.fontColor,
      borderColor: STYLE.borderColor,
      borderWidth: STYLE.borderWidth,
      lineSpacing: STYLE.lineSpacing,
      glowColor: STYLE.glowColor,
      glowColorMode: STYLE.glowColorMode,
      glowWidth: STYLE.glowWidth,
      glowOpacity: STYLE.glowOpacity,
    },
    position: { preset: STYLE.positionPreset, alignment: 'center' },
    maxCharsPerLine: STYLE.maxLineWeight,
    singleLine: false,
    width: STYLE.width,
    height: STYLE.height,
    glowSeedHint: STYLE.id,
  };
  const remotion = path.join(workspaceRoot, 'runner', 'node_modules', '.bin', 'remotion');
  await run(remotion, [
    'still',
    path.join(workspaceRoot, 'runner', 'src', 'remotion', 'index.ts'),
    'TelopStill',
    outputPath,
    '--props',
    JSON.stringify(props),
    '--image-format',
    'png',
    '--public-dir',
    path.join(workspaceRoot, 'runner', 'public'),
    '--log',
    'error',
  ], { cwd: path.join(workspaceRoot, 'runner') });
};

const renderTeacherMedia = async ({ inputPath, startMs, endMs, outputPath }) => {
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', (startMs / 1000).toFixed(3),
    '-t', ((endMs - startMs) / 1000).toFixed(3),
    '-i', inputPath,
    '-vf', `scale=${STYLE.width}:${STYLE.height}:force_original_aspect_ratio=decrease,pad=${STYLE.width}:${STYLE.height}:(ow-iw)/2:(oh-ih)/2:black`,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    outputPath,
  ]);
};

const renderConservativeMedia = async ({ inputPath, startMs, endMs, cues, cueImages, outputPath }) => {
  const durationSec = (endMs - startMs) / 1000;
  const args = [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', (startMs / 1000).toFixed(3),
    '-t', durationSec.toFixed(3),
    '-i', inputPath,
  ];
  for (const imagePath of cueImages) {
    args.push('-loop', '1', '-framerate', '30', '-i', imagePath);
  }

  const filters = [
    `[0:v]scale=${STYLE.width}:${STYLE.height}:force_original_aspect_ratio=decrease,pad=${STYLE.width}:${STYLE.height}:(ow-iw)/2:(oh-ih)/2:black,setpts=PTS-STARTPTS[base]`,
  ];
  let previous = 'base';
  cues.forEach((cue, index) => {
    const output = `overlay${index + 1}`;
    const relativeStart = Math.max(0, (cue.startMs - startMs) / 1000);
    const relativeEnd = Math.min(durationSec, (cue.endMs - startMs) / 1000);
    filters.push(
      `[${previous}][${index + 1}:v]overlay=0:0:enable='between(t,${relativeStart.toFixed(3)},${relativeEnd.toFixed(3)})'[${output}]`,
    );
    previous = output;
  });

  args.push(
    '-filter_complex', filters.join(';'),
    '-map', `[${previous}]`, '-map', '0:a?',
    '-t', durationSec.toFixed(3),
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    '-shortest',
    outputPath,
  );
  await run('ffmpeg', args);
};

const inspectMedia = async (filePath) => {
  const raw = await run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration:stream=codec_type,width,height',
    '-of', 'json',
    filePath,
  ]);
  const data = JSON.parse(raw);
  const durationSec = Number(data.format?.duration);
  const video = data.streams?.find((stream) => stream.codec_type === 'video');
  const audio = data.streams?.find((stream) => stream.codec_type === 'audio');
  if (!Number.isFinite(durationSec) || durationSec <= 0 || !video || !audio) {
    throw new Error(`media validation failed: ${filePath}`);
  }
  if (video.width !== STYLE.width || video.height !== STYLE.height) {
    throw new Error(`media size mismatch: ${filePath}`);
  }
  return {
    durationMs: Math.round(durationSec * 1000),
    width: video.width,
    height: video.height,
    hasVideo: true,
    hasAudio: true,
    sha256: await fileSha256(filePath),
  };
};

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const buildReviewHtml = (manifest) => {
  const publicItems = manifest.items.map((item, index) => ({
    itemNumber: index + 1,
    caseId: item.caseId,
    mediaA: item.assignment.A.publicPath,
    mediaB: item.assignment.B.publicPath,
  }));
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>最小演出十分性 A/B比較</title>
<style>
:root{color-scheme:dark;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif;background:#0c111b;color:#f4f7fb}*{box-sizing:border-box}body{margin:0;padding:0 0 104px}header{padding:16px 20px;background:#151d2b;border-bottom:1px solid #2b3850}h1{font-size:20px;margin:0 0 8px}.lead{margin:0;color:#cad4e5;line-height:1.5}.progress{margin-top:10px;color:#98a9c2}.item{padding:14px 18px}.videos{display:grid;grid-template-columns:1fr 1fr;gap:14px;max-width:1500px;margin:0 auto}.card{background:#151d2b;border:1px solid #2b3850;border-radius:12px;padding:10px}.card h2{font-size:18px;margin:0 0 8px}.card video{display:block;width:100%;max-height:37vh;background:#000;border-radius:8px}.media-actions{display:flex;gap:8px;margin-top:8px}.media-actions button,.dock button,.result-actions button{border:0;border-radius:9px;padding:11px 16px;font-size:15px;font-weight:700;cursor:pointer;background:#26344b;color:#fff}.note{max-width:1100px;margin:12px auto 0;color:#aebbd0}.dock{position:fixed;left:0;right:0;bottom:0;z-index:5;background:#151d2b;border-top:1px solid #32415a;padding:12px 16px}.choices{display:flex;gap:10px;justify-content:center}.choice{min-width:150px}.choice.active{background:#2f8f63}.nav{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:9px;color:#aebbd0}.result{padding:20px;max-width:900px;margin:0 auto}.result textarea{width:100%;height:230px;background:#0b1018;color:#fff;border:1px solid #40516d;border-radius:10px;padding:12px}.result-actions{display:flex;gap:10px;margin-top:10px}.reasons{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:8px;font-size:13px;color:#c9d3e4}.reasons label{background:#202b3e;padding:6px 9px;border-radius:8px}.free-note{display:flex;align-items:center;justify-content:center;gap:8px;margin:8px auto 0;max-width:920px;color:#c9d3e4;font-size:13px}.free-note input{flex:1;min-width:180px;background:#0b1018;color:#fff;border:1px solid #40516d;border-radius:8px;padding:8px 10px}@media(max-width:800px){.videos{grid-template-columns:1fr}.card video{max-height:27vh}.choice{min-width:0;flex:1;padding:12px 6px}.choices{gap:6px}.free-note{align-items:stretch;flex-direction:column}}
</style></head><body>
<header><h1>基本テロップだけで十分か：A/B比較</h1><p class="lead"><strong>見ること:</strong> 同じ内容のAとBを見て、全体として良い方を選んでください。どちらが教師かは伏せています。細かな時刻探しや修正は不要です。</p><div class="progress" id="progress"></div></header>
<main id="items"></main>
<section class="result" id="result" hidden><h2>回答結果</h2><p>コピーして、そのままチャットへ貼ってください。回答は戻って修正できます。</p><textarea id="resultText" readonly></textarea><div class="result-actions"><button id="back">回答へ戻る</button><button id="copy">結果をコピー</button></div></section>
<div class="dock" id="dock"><div class="reasons"><span>差の理由（任意・回答前に選択）:</span><label><input type="checkbox" value="caption_readability">テロップの読みやすさ</label><label><input type="checkbox" value="caption_timing">テロップのタイミング</label><label><input type="checkbox" value="emphasis_fun">強調や楽しさ</label><label><input type="checkbox" value="reference_clarity">話者・参照先の分かりやすさ</label><label><input type="checkbox" value="audio">音・効果音・BGM</label></div><label class="free-note"><span>任意メモ（どこで差を感じたか・回答前に入力）</span><input id="differenceNote" type="text" autocomplete="off"></label><div class="choices"><button class="choice" data-answer="A">Aが良い</button><button class="choice" data-answer="same">差はない</button><button class="choice" data-answer="B">Bが良い</button></div><div class="nav"><button id="prev">前へ</button><span id="status"></span><button id="next">次へ</button><button id="showResult">結果を確認</button></div></div>
<script>
const ITEMS=${JSON.stringify(publicItems)};const answers=ITEMS.map(()=>({answer:null,reasons:[],note:''}));let current=0;
const itemsEl=document.getElementById('items'),progress=document.getElementById('progress'),dock=document.getElementById('dock'),result=document.getElementById('result');
itemsEl.innerHTML=ITEMS.map((item,index)=>'<section class="item" data-index="'+index+'" hidden><div class="videos"><article class="card"><h2>A</h2><video controls preload="metadata" src="'+item.mediaA+'"></video><div class="media-actions"><button data-play="A">Aを先頭から再生</button></div></article><article class="card"><h2>B</h2><video controls preload="metadata" src="'+item.mediaB+'"></video><div class="media-actions"><button data-play="B">Bを先頭から再生</button></div></article></div><p class="note">比較 '+(index+1)+' / '+ITEMS.length+'。尺のわずかな差は対応測定の粒度によるものです。演出を含む完成度で判断してください。</p></section>').join('');
function pauseAll(){document.querySelectorAll('video').forEach(v=>v.pause())}function render(){result.hidden=true;itemsEl.hidden=false;dock.hidden=false;document.querySelectorAll('.item').forEach((el,i)=>el.hidden=i!==current);progress.textContent='比較 '+(current+1)+' / '+ITEMS.length;document.querySelectorAll('.choice').forEach(b=>b.classList.toggle('active',b.dataset.answer===answers[current].answer));document.querySelectorAll('.reasons input').forEach(box=>box.checked=answers[current].reasons.includes(box.value));document.getElementById('differenceNote').value=answers[current].note;document.getElementById('prev').disabled=current===0;document.getElementById('next').disabled=current===ITEMS.length-1;document.getElementById('status').textContent=answers[current].answer?'回答済み':'未回答';pauseAll()}
document.addEventListener('click',event=>{const play=event.target.closest('[data-play]');if(play){const section=play.closest('.item');const video=section.querySelectorAll('video')[play.dataset.play==='A'?0:1];pauseAll();video.currentTime=0;video.play();return}const choice=event.target.closest('.choice');if(choice){answers[current].answer=choice.dataset.answer;document.querySelectorAll('.reasons input').forEach(box=>{if(box.checked&&!answers[current].reasons.includes(box.value))answers[current].reasons.push(box.value)});if(current<ITEMS.length-1){current+=1}render()}});
document.querySelectorAll('.reasons input').forEach(box=>box.addEventListener('change',()=>{answers[current].reasons=[...document.querySelectorAll('.reasons input:checked')].map(x=>x.value)}));
document.getElementById('differenceNote').addEventListener('input',event=>{answers[current].note=event.target.value});
document.getElementById('prev').onclick=()=>{if(current>0){current-=1;render()}};document.getElementById('next').onclick=()=>{if(current<ITEMS.length-1){current+=1;render()}};
function resultText(){const labels={A:'Aが良い',same:'差はない',B:'Bが良い'};return ['最小演出十分性診断 人間A/B比較結果','確認者: kawafmm','時間計測: なし','',...ITEMS.map((item,i)=>'比較'+(i+1)+': '+(labels[answers[i].answer]||'未回答')+' / 理由='+(answers[i].reasons.join(',')||'なし')+' / メモ='+(answers[i].note.trim()||'なし'))].join('\\n')}
document.getElementById('showResult').onclick=()=>{document.getElementById('resultText').value=resultText();itemsEl.hidden=true;dock.hidden=true;result.hidden=false;pauseAll()};document.getElementById('back').onclick=render;document.getElementById('copy').onclick=async()=>{const text=document.getElementById('resultText').value;try{await navigator.clipboard.writeText(text);document.getElementById('copy').textContent='コピーしました'}catch{document.getElementById('resultText').focus();document.getElementById('resultText').select()}};render();
</script></body></html>`;
};

const validateReviewHtml = (html, expectedItemCount) => {
  const scriptStart = html.indexOf('<script>');
  const scriptEnd = html.indexOf('</script>', scriptStart);
  if (scriptStart < 0 || scriptEnd < 0) throw new Error('review script is missing');
  const embeddedScript = html.slice(scriptStart + '<script>'.length, scriptEnd);
  // 結果コピーの改行エスケープなど、ブラウザを開く前に構文破損を止める。
  new Function(embeddedScript);
  if ((html.match(/<video /g) ?? []).length !== 2) {
    throw new Error('review UI must contain exactly two reusable video elements');
  }
  if ((html.match(/data-answer=/g) ?? []).length !== 3) {
    throw new Error('review UI must contain exactly three answer buttons');
  }
  if (!html.includes('id="differenceNote"') || !html.includes("' / メモ='")) {
    throw new Error('optional difference note is missing from review UI or copied result');
  }
  if (!html.includes(`比較 '+(index+1)+' / '+ITEMS.length`)) {
    throw new Error('review UI item progress is missing');
  }
  if (expectedItemCount < 1 || expectedItemCount > 5) {
    throw new Error('human review item count must stay between 1 and 5');
  }
};

const main = async () => {
  await rm(outputRoot, { recursive: true, force: true });
  await Promise.all([mediaDir, planDir, imageDir].map((directory) => mkdir(directory, { recursive: true })));

  const manifestItems = [];
  for (const definition of CASE_DEFINITIONS) {
    const expectedPath = path.join(scriptDir, 'expected', `${definition.fixtureId}.json`);
    const expected = await readJson(expectedPath);
    const expectedCut = expected.expectedCuts.find((cut) => cut.materialBlock?.blockIndex === definition.blockIndex);
    validateExpectedCut(definition, expectedCut);

    const sourceWordsPath = path.join(scriptDir, 'stt', definition.sourceSttId, 'source', 'word-timestamps.json');
    const sourceWords = await readJson(sourceWordsPath);
    const captionContract = buildCaptionContract({
      caseDefinition: definition,
      expectedCut,
      sourceWords: sourceWords.words,
    });
    const validation = validatePresentationCaptionContract(captionContract);
    if (validation.overallStatus === 'failed') {
      throw new Error(`${definition.caseId}: G1-G3 contract failed`);
    }
    if (validation.contract.status === 'failed' || validation.checks.G1.status === 'failed' || validation.checks.G3.status === 'failed') {
      throw new Error(`${definition.caseId}: required contract check failed`);
    }

    const captionPlanPath = path.join(planDir, `${definition.caseId}-caption-contract.json`);
    const captionReportPath = path.join(planDir, `${definition.caseId}-caption-check-report.json`);
    await writeJson(captionPlanPath, captionContract);
    await writeFile(captionReportPath, serializePresentationCaptionReport(validation));

    const cueImageRoot = path.join(imageDir, definition.caseId);
    await mkdir(cueImageRoot, { recursive: true });
    const cueImages = [];
    for (const cue of captionContract.captionPlan.cues) {
      const imagePath = path.join(cueImageRoot, `${cue.cueId}.png`);
      await renderCaptionPng({ cue, outputPath: imagePath });
      cueImages.push(imagePath);
    }

    const teacherInput = path.join(
      scriptDir,
      'research', 'downloads', definition.teacherVideoId, `${definition.teacherVideoId}.mp4`,
    );
    const sourceInput = path.join(
      scriptDir,
      'research', 'downloads', definition.teacherVideoId, 'sources', definition.sourceVideoId, `${definition.sourceVideoId}.mp4`,
    );
    const teacherOutput = path.join(mediaDir, `${definition.caseId}-teacher.mp4`);
    const conservativeOutput = path.join(mediaDir, `${definition.caseId}-conservative.mp4`);
    await renderTeacherMedia({
      inputPath: teacherInput,
      startMs: expectedCut.clipStartMs,
      endMs: expectedCut.clipEndMs,
      outputPath: teacherOutput,
    });
    await renderConservativeMedia({
      inputPath: sourceInput,
      startMs: expectedCut.sourceStartMs,
      endMs: expectedCut.sourceEndMs,
      cues: captionContract.captionPlan.cues,
      cueImages,
      outputPath: conservativeOutput,
    });

    const teacherInspection = await inspectMedia(teacherOutput);
    const conservativeInspection = await inspectMedia(conservativeOutput);
    const generatedIsA = Number.parseInt(sha256(definition.caseId)[0], 16) % 2 === 0;
    const teacherPublicPath = `media/${path.basename(teacherOutput)}`;
    const conservativePublicPath = `media/${path.basename(conservativeOutput)}`;
    const assignment = generatedIsA
      ? {
        A: { kind: 'conservative', publicPath: conservativePublicPath },
        B: { kind: 'teacher', publicPath: teacherPublicPath },
      }
      : {
        A: { kind: 'teacher', publicPath: teacherPublicPath },
        B: { kind: 'conservative', publicPath: conservativePublicPath },
      };
    manifestItems.push({
      ...definition,
      selectionBasis: '人間確認済みホロライブ教師ごとの、内部materialJumpが全て0msである最長連続ブロック',
      sourceRangeMs: [expectedCut.sourceStartMs, expectedCut.sourceEndMs],
      teacherRangeMs: [expectedCut.clipStartMs, expectedCut.clipEndMs],
      captionCueCount: captionContract.captionPlan.cues.length,
      captionCheckStatus: validation.overallStatus,
      captionPlanPath: path.relative(outputRoot, captionPlanPath),
      captionReportPath: path.relative(outputRoot, captionReportPath),
      generationInputExcludesTeacherPresentation: true,
      media: {
        teacher: { publicPath: teacherPublicPath, ...teacherInspection },
        conservative: { publicPath: conservativePublicPath, ...conservativeInspection },
      },
      assignment,
    });
  }

  const manifest = {
    kind: 'normal-video-minimum-presentation-sufficiency-review-manifest',
    version: 'v001',
    generatedAt: new Date().toISOString(),
    modelRun: null,
    llmUsed: false,
    selectionPolicy: {
      type: 'deterministic-availability-sample',
      randomized: false,
      representative: false,
      convenienceSample: true,
      rule: '承認済み配信者の人間確認済み教師から、内部materialJumpと内部gapが0msで再構成不要な最長連続blockを教師ごとに1件選ぶ',
      interpretationLimit: '無作為抽出でも代表標本でもなく、公開前の飛行前点検に使う可用性標本',
      replacementAfterResults: false,
    },
    style: STYLE,
    humanWork: {
      requiredJudgements: manifestItems.length,
      sessions: 1,
      answerContract: ['A', 'same', 'B'],
      exactTimeEntry: false,
      freeTextRequired: false,
      optionalFreeTextFieldsPerItem: 1,
      timeMeasurement: false,
    },
    items: manifestItems,
  };
  const reviewHtml = buildReviewHtml(manifest);
  validateReviewHtml(reviewHtml, manifestItems.length);
  await writeJson(path.join(outputRoot, 'manifest.json'), manifest);
  await writeFile(path.join(outputRoot, 'review.html'), reviewHtml);
  await writeFile(path.join(outputRoot, 'result-template.md'), [
    '# 最小演出十分性診断 人間A/B比較結果',
    '',
    '確認者: kawafmm',
    '時間計測: なし',
    '',
    ...manifestItems.map((_, index) => `- 比較${index + 1}: Aが良い / 差はない / Bが良い / 理由=任意 / メモ=任意`),
    '',
  ].join('\n'));
  // 透明PNGは保守版mp4生成時だけ使う中間物で、確認画面と再現記録には不要。
  await rm(imageDir, { recursive: true, force: true });
  process.stdout.write(`${JSON.stringify({ outputRoot, itemCount: manifestItems.length }, null, 2)}\n`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
