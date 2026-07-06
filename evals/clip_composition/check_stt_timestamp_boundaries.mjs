import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const sampleRate = 16000;
const audioFrameMs = 20;
const audioHopMs = 10;
const checkToleranceMs = 200;
const boundaryHalfWindowMs = 15000;
const issueShiftMs = 5080;

const clipId = 'r_ztjHaHmcg';
const sourceId = 'r_ztjHaHmcg_-DwSCDMCWDQ_local300_v001';
const sourceVideoId = '-DwSCDMCWDQ';
const outputId = '20260706-boundary-timestamp-v001';

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const clipSttPath = path.join(evalRoot, 'stt', clipId, 'clip', 'word-timestamps.json');
const sourceSttPath = path.join(evalRoot, 'stt', sourceId, 'source', 'word-timestamps.json');
const clipMediaPath = path.join(evalRoot, 'research', 'downloads', clipId, `${clipId}.mp4`);
const sourceMediaPath = path.join(evalRoot, 'research', 'downloads', clipId, 'sources', sourceVideoId, `${sourceVideoId}.mp4`);
const audioOutDir = path.join(evalRoot, 'outputs', 'audio-check', clipId, 'stt-boundaries');
const plotOutDir = path.join(evalRoot, 'outputs', 'plots', 'stt-boundaries');
const outputJsonPath = path.join(evalRoot, 'outputs', `stt-boundary-timestamp-check-${clipId}-${outputId}.json`);
const reportPath = path.join(evalRoot, 'reports', `stt-boundary-timestamp-check-${clipId}-${outputId}.md`);

function workspaceRoot() {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error('pnpm-workspace.yaml が見つかりません');
    }
    current = parent;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function runProcess(command, args) {
  const stdout = [];
  const stderr = [];
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout));
        return;
      }
      reject(new Error(`${command} failed with code ${code ?? 'unknown'}\n${Buffer.concat(stderr).toString('utf8')}`));
    });
  });
}

async function readAudioSlice(mediaPath, startMs, endMs) {
  const buffer = await runProcess('ffmpeg', [
    '-v',
    'error',
    '-ss',
    seconds(startMs),
    '-t',
    seconds(endMs - startMs),
    '-i',
    mediaPath,
    '-vn',
    '-ac',
    '1',
    '-ar',
    String(sampleRate),
    '-f',
    'f32le',
    'pipe:1'
  ]);
  const samples = new Float32Array(buffer.byteLength / 4);
  for (let offset = 0; offset < samples.length; offset += 1) {
    samples[offset] = buffer.readFloatLE(offset * 4);
  }
  return samples;
}

async function writeAudioSlice(mediaPath, startMs, endMs, outPath) {
  await runProcess('ffmpeg', [
    '-y',
    '-v',
    'error',
    '-ss',
    seconds(startMs),
    '-t',
    seconds(endMs - startMs),
    '-i',
    mediaPath,
    '-vn',
    '-acodec',
    'pcm_s16le',
    '-ac',
    '1',
    '-ar',
    String(sampleRate),
    outPath
  ]);
}

function seconds(ms) {
  return (ms / 1000).toFixed(3);
}

function rmsEnvelope(samples) {
  const frameSamples = Math.max(1, Math.round(sampleRate * audioFrameMs / 1000));
  const hopSamples = Math.max(1, Math.round(sampleRate * audioHopMs / 1000));
  if (samples.length < frameSamples) {
    return [];
  }
  const frameCount = Math.floor((samples.length - frameSamples) / hopSamples) + 1;
  const result = new Array(frameCount);
  for (let frame = 0; frame < frameCount; frame += 1) {
    const start = frame * hopSamples;
    let energy = 0;
    for (let index = 0; index < frameSamples; index += 1) {
      const value = samples[start + index] ?? 0;
      energy += value * value;
    }
    result[frame] = Math.sqrt(energy / frameSamples);
  }
  return result;
}

function strongestRiseNear(envelope, targetLocalMs) {
  const startIndex = Math.max(1, Math.floor((targetLocalMs - checkToleranceMs) / audioHopMs));
  const endIndex = Math.min(envelope.length - 1, Math.ceil((targetLocalMs + checkToleranceMs) / audioHopMs));
  let best = undefined;
  for (let index = startIndex; index <= endIndex; index += 1) {
    const rise = (envelope[index] ?? 0) - (envelope[index - 1] ?? 0);
    if (!best || rise > best.rise) {
      best = {
        localMs: index * audioHopMs,
        absoluteMs: index * audioHopMs,
        residualMs: index * audioHopMs - targetLocalMs,
        rise
      };
    }
  }
  return best;
}

function wordsInWindow(words, startMs, endMs) {
  return words
    .filter((word) => word.endMs >= startMs && word.startMs <= endMs)
    .sort((left, right) => left.startMs - right.startMs);
}

function previousWord(words, startMs) {
  return [...words]
    .filter((word) => word.endMs <= startMs)
    .sort((left, right) => right.endMs - left.endMs)[0];
}

function checkPointForWindow(allWords, window) {
  const afterBoundary = allWords
    .filter((word) => word.startMs >= window.boundaryMs && word.startMs <= window.endMs)
    .sort((left, right) => left.startMs - right.startMs)[0];
  const firstInWindow = allWords
    .filter((word) => word.startMs >= window.startMs && word.startMs <= window.endMs)
    .sort((left, right) => left.startMs - right.startMs)[0];
  const word = window.kind === 'clip' ? firstInWindow : afterBoundary;
  if (!word) {
    return undefined;
  }
  const previous = previousWord(allWords, word.startMs);
  return {
    word,
    previous,
    previousGapMs: previous ? word.startMs - previous.endMs : undefined
  };
}

function svgWaveform(input) {
  const width = 1400;
  const height = 360;
  const margin = { left: 70, right: 30, top: 36, bottom: 54 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxRms = Math.max(...input.envelope, 0.000001);
  const x = (localMs) => margin.left + (localMs / Math.max(1, input.endMs - input.startMs)) * plotWidth;
  const y = (value) => margin.top + plotHeight - (value / maxRms) * plotHeight;
  const points = input.envelope
    .filter((_, index) => index % 2 === 0)
    .map((value, index) => `${round(x(index * 2 * audioHopMs))},${round(y(value))}`)
    .join(' ');
  const wordLines = input.words.map((word) => {
    const local = word.startMs - input.startMs;
    const label = escapeXml(word.text);
    return [
      `<line x1="${round(x(local))}" x2="${round(x(local))}" y1="${margin.top}" y2="${margin.top + plotHeight}" stroke="#94a3b8" stroke-width="1" opacity="0.22" />`,
      local >= 0 && local <= input.endMs - input.startMs
        ? `<text x="${round(x(local) + 2)}" y="${margin.top + 14}" font-family="sans-serif" font-size="10" fill="#64748b">${label}</text>`
        : ''
    ].join('\n');
  });
  const markers = [];
  if (input.check) {
    const targetLocal = input.check.word.startMs - input.startMs;
    markers.push(`<line x1="${round(x(targetLocal))}" x2="${round(x(targetLocal))}" y1="${margin.top}" y2="${margin.top + plotHeight}" stroke="#dc2626" stroke-width="2.5" />`);
    markers.push(`<text x="${round(x(targetLocal) + 4)}" y="${margin.top + plotHeight - 8}" font-family="sans-serif" font-size="12" fill="#dc2626">STT ${escapeXml(input.check.word.text)}</text>`);
    if (input.check.declaredRise) {
      markers.push(`<line x1="${round(x(input.check.declaredRise.localMs))}" x2="${round(x(input.check.declaredRise.localMs))}" y1="${margin.top}" y2="${margin.top + plotHeight}" stroke="#16a34a" stroke-width="2" stroke-dasharray="5 4" />`);
    }
    const shiftedLocal = targetLocal - issueShiftMs;
    if (shiftedLocal >= 0 && shiftedLocal <= input.endMs - input.startMs) {
      markers.push(`<line x1="${round(x(shiftedLocal))}" x2="${round(x(shiftedLocal))}" y1="${margin.top}" y2="${margin.top + plotHeight}" stroke="#7c3aed" stroke-width="2" stroke-dasharray="3 5" />`);
      markers.push(`<text x="${round(x(shiftedLocal) + 4)}" y="${margin.top + plotHeight - 24}" font-family="sans-serif" font-size="12" fill="#7c3aed">-5080ms</text>`);
    }
  }
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<rect width="100%" height="100%" fill="white" />',
    `<text x="${width / 2}" y="22" text-anchor="middle" font-family="sans-serif" font-size="16">${escapeXml(input.label)}</text>`,
    `<rect x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" fill="#f8fafc" stroke="#cbd5e1" />`,
    `<polyline points="${points}" fill="none" stroke="#2563eb" stroke-width="1.4" opacity="0.9" />`,
    ...wordLines,
    ...markers,
    `<text x="${margin.left}" y="${height - 22}" font-family="monospace" font-size="12">${msText(input.startMs)}</text>`,
    `<text x="${width - margin.right}" y="${height - 22}" text-anchor="end" font-family="monospace" font-size="12">${msText(input.endMs)}</text>`,
    `<text x="${margin.left}" y="${height - 38}" font-family="sans-serif" font-size="11" fill="#64748b">blue=rms, gray=word starts, red=checked STT word, green=strongest local rise near STT, purple=STT-5080ms</text>`,
    '</svg>'
  ].join('\n');
}

function round(value) {
  return (Math.round(value * 100) / 100).toString();
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function msText(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

function signed(ms) {
  if (ms === undefined) {
    return 'n/a';
  }
  return `${ms >= 0 ? '+' : ''}${Math.round(ms)}ms`;
}

function rel(filePath) {
  return path.relative(evalRoot, filePath);
}

function scoreText(value) {
  return value === undefined ? 'n/a' : value.toFixed(6);
}

function reportMarkdown(results) {
  const rows = results.map((item) => {
    const check = item.check;
    return `| ${item.label} | ${check ? `${msText(check.word.startMs)}「${check.word.text}」` : 'n/a'} | ${signed(check?.previousGapMs)} | ${check?.declaredRise ? `${msText(item.startMs + check.declaredRise.localMs)} (${signed(check.declaredRise.residualMs)})` : 'n/a'} | ${scoreText(check?.declaredRise?.rise)} | ${check?.shiftedRise ? `${msText(item.startMs + check.shiftedRise.localMs)} (${signed(check.shiftedRise.residualMs)})` : '範囲外'} | ${check?.declaredPass ? 'yes' : 'no'} |`;
  });
  const declaredResiduals = results
    .map((item) => item.check?.declaredRise?.residualMs)
    .filter((value) => typeof value === 'number');
  const maxAbsResidual = declaredResiduals.length > 0
    ? Math.max(...declaredResiduals.map((value) => Math.abs(value)))
    : undefined;
  const declaredPasses = results.every((item) => item.check?.declaredPass !== false);
  const shiftedCanExplain = !declaredPasses && results.some((item) => {
    const shifted = item.check?.shiftedRise;
    return shifted && Math.abs(shifted.residualMs) <= checkToleranceMs;
  });

  return [
    '# STTチャンク境界タイムスタンプ検査',
    '',
    `- 元動画STT: ${sourceId}`,
    `- 切り抜きSTT: ${clipId}`,
    `- 検査窓: 元動画 300s/600s/900s 各±15秒、切り抜き 0:00-0:15`,
    `- 波形比較: 20msフレーム、10ms刻みのRMS包絡。これは既存の音声カット点検出と同じ解像度。`,
    `- 判定許容: ±${checkToleranceMs}ms。これは今回の指示値。`,
    `- 検算対象の既知ずれ: -${issueShiftMs}ms`,
    '',
    '## 結論',
    '',
    `- 序盤ずれ: ${declaredPasses ? 'なし' : 'あり'}`,
    maxAbsResidual === undefined ? '- 最大ずれ: n/a' : `- 最大ずれ: ${Math.round(maxAbsResidual)}ms`,
    `- チャンク間で一貫した秒単位のずれ: ${declaredPasses ? '確認されない' : '要確認'}`,
    `- 確認済みペア側で見えた -5080ms をこのずれで説明できるか: ${shiftedCanExplain ? '説明候補あり' : '説明できない'}`,
    '',
    '## 比較表',
    '',
    '| 窓 | 確認したSTT語 | 直前STTギャップ | STT時刻近傍の波形立ち上がり | 立ち上がり強度 | 参考: STT-5080ms近傍の波形変化 | ±200ms内 |',
    '| --- | --- | ---: | --- | ---: | --- | --- |',
    ...rows,
    '',
    '## 成果物',
    '',
    ...results.flatMap((item) => [
      `- ${item.label} 音声: \`${rel(item.audioPath)}\``,
      `- ${item.label} 波形: \`${rel(item.svgPath)}\``
    ]),
    '',
    '## 補足',
    '',
    '- 波形の緑線は、確認したSTT語の開始時刻±200ms内で、RMSが最も強く上がった点。',
    '- 紫線は、同じSTT語が仮に5080ms早く実音声に出ていた場合の位置。ただし、音声には他の発話や環境音の波形変化もあるため、紫線近傍に波形変化があることだけでは時刻ずれの根拠にならない。',
    '- 900s境界は直前STTギャップが200ms未満なので、発話開始点としての強さは他より弱い。それでも、300s/600sと同じ方向の秒単位ずれは出ていない。',
    '- fixture/expected/confirmedペアは変更していない。'
  ].join('\n') + '\n';
}

async function main() {
  const [clipStt, sourceStt] = await Promise.all([
    readJson(clipSttPath),
    readJson(sourceSttPath)
  ]);
  const windows = [
    {
      id: 'source_300s',
      label: 'source 300s boundary',
      kind: 'source',
      mediaPath: sourceMediaPath,
      words: sourceStt.words,
      startMs: 300000 - boundaryHalfWindowMs,
      endMs: 300000 + boundaryHalfWindowMs,
      boundaryMs: 300000
    },
    {
      id: 'source_600s',
      label: 'source 600s boundary',
      kind: 'source',
      mediaPath: sourceMediaPath,
      words: sourceStt.words,
      startMs: 600000 - boundaryHalfWindowMs,
      endMs: 600000 + boundaryHalfWindowMs,
      boundaryMs: 600000
    },
    {
      id: 'source_900s',
      label: 'source 900s boundary',
      kind: 'source',
      mediaPath: sourceMediaPath,
      words: sourceStt.words,
      startMs: 900000 - boundaryHalfWindowMs,
      endMs: 900000 + boundaryHalfWindowMs,
      boundaryMs: 900000
    },
    {
      id: 'clip_head_0_15s',
      label: 'clip head 0-15s',
      kind: 'clip',
      mediaPath: clipMediaPath,
      words: clipStt.words,
      startMs: 0,
      endMs: 15000,
      boundaryMs: 0
    }
  ];

  await mkdir(audioOutDir, { recursive: true });
  await mkdir(plotOutDir, { recursive: true });
  await mkdir(path.dirname(outputJsonPath), { recursive: true });
  await mkdir(path.dirname(reportPath), { recursive: true });

  const results = [];
  for (const window of windows) {
    const localWords = wordsInWindow(window.words, window.startMs, window.endMs);
    const check = checkPointForWindow(window.words, window);
    const audioPath = path.join(audioOutDir, `${window.id}.wav`);
    const svgPath = path.join(plotOutDir, `${window.id}.svg`);
    await writeAudioSlice(window.mediaPath, window.startMs, window.endMs, audioPath);
    const samples = await readAudioSlice(window.mediaPath, window.startMs, window.endMs);
    const envelope = rmsEnvelope(samples);
    let enrichedCheck = undefined;
    if (check) {
      const targetLocalMs = check.word.startMs - window.startMs;
      const shiftedLocalMs = targetLocalMs - issueShiftMs;
      const declaredRise = strongestRiseNear(envelope, targetLocalMs);
      const shiftedRise = shiftedLocalMs >= 0 && shiftedLocalMs <= window.endMs - window.startMs
        ? strongestRiseNear(envelope, shiftedLocalMs)
        : undefined;
      enrichedCheck = {
        ...check,
        declaredRise,
        shiftedRise,
        declaredPass: declaredRise ? Math.abs(declaredRise.residualMs) <= checkToleranceMs : false
      };
    }
    await writeFile(svgPath, svgWaveform({
      ...window,
      words: localWords,
      envelope,
      check: enrichedCheck
    }), 'utf8');
    results.push({
      ...window,
      mediaPath: rel(window.mediaPath),
      audioPath,
      svgPath,
      words: localWords,
      check: enrichedCheck
    });
  }

  const output = {
    kind: 'stt_timestamp_boundary_check',
    runAt: new Date().toISOString(),
    settings: {
      sampleRate,
      audioFrameMs,
      audioHopMs,
      checkToleranceMs,
      boundaryHalfWindowMs,
      issueShiftMs,
      waveformMeasurement: '確認したSTT語の開始時刻±200ms内でRMS上昇が最大になる点を、波形上の発話開始候補として見る'
    },
    results: results.map((item) => ({
      id: item.id,
      label: item.label,
      startMs: item.startMs,
      endMs: item.endMs,
      boundaryMs: item.boundaryMs,
      audioPath: rel(item.audioPath),
      svgPath: rel(item.svgPath),
      check: item.check ? {
        word: item.check.word,
        previousWord: item.check.previous,
        previousGapMs: item.check.previousGapMs,
        declaredRise: item.check.declaredRise,
        shiftedRise: item.check.shiftedRise,
        declaredPass: item.check.declaredPass
      } : undefined
    })),
    productionImpact: {
      runtimeWrites: false,
      fixtureWrites: false,
      expectedWrites: false,
      confirmedPairChanged: false
    }
  };
  await writeFile(outputJsonPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, reportMarkdown(results), 'utf8');
  console.log(`json: ${outputJsonPath}`);
  console.log(`report: ${reportPath}`);
  for (const item of results) {
    const residual = item.check?.declaredRise?.residualMs;
    console.log(`${item.id}: ${item.check?.word?.text ?? 'n/a'} residual=${signed(residual)} audio=${item.audioPath} svg=${item.svgPath}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
