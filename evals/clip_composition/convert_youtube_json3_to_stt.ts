import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  inputPath: string;
  id: string;
  role: 'clip' | 'source';
  sourceUri: string;
};

type Json3File = {
  events?: Array<{
    tStartMs?: number;
    dDurationMs?: number;
    segs?: Array<{
      utf8?: string;
      tOffsetMs?: number;
    }>;
  }>;
};

type WordTimestamp = {
  text: string;
  startMs: number;
  endMs: number;
  speaker: string;
  segmentId: number;
};

const evalRoot = path.join(workspaceRoot(), 'evals', 'clip_composition');

function workspaceRoot(): string {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error('pnpm-workspace.yaml が見つからないため評価環境の位置を確認できません');
    }
    current = parent;
  }
}

function parseOptions(argv: string[]): CliOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      continue;
    }

    const inlineValueIndex = item.indexOf('=');
    if (inlineValueIndex >= 0) {
      values.set(item.slice(2, inlineValueIndex), item.slice(inlineValueIndex + 1));
      continue;
    }

    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      values.set(key, 'true');
      continue;
    }

    values.set(key, next);
    index += 1;
  }

  const inputPath = values.get('input')?.trim();
  const id = values.get('id')?.trim();
  const role = values.get('role')?.trim();
  if (!inputPath) {
    throw new Error('--input にYouTube json3字幕ファイルを指定してください');
  }
  if (!id) {
    throw new Error('--id に保存先のSTT IDを指定してください');
  }
  if (role !== 'clip' && role !== 'source') {
    throw new Error('--role は clip または source を指定してください');
  }

  return {
    inputPath: path.resolve(inputPath),
    id: sanitizePathPart(id),
    role,
    sourceUri: values.get('sourceUri')?.trim() || inputPath
  };
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function textFromEvent(event: NonNullable<Json3File['events']>[number]): string {
  return (event.segs ?? [])
    .map((segment) => segment.utf8 ?? '')
    .join('')
    .replace(/\s+/g, '')
    .trim();
}

function wordsFromJson3(payload: Json3File): WordTimestamp[] {
  const words: WordTimestamp[] = [];
  for (const event of payload.events ?? []) {
    if (!event.segs || typeof event.tStartMs !== 'number') {
      continue;
    }

    const text = textFromEvent(event);
    if (!text || text === '[音楽]') {
      continue;
    }

    const offsets = event.segs
      .map((segment) => typeof segment.tOffsetMs === 'number' ? segment.tOffsetMs : 0)
      .filter((offset) => offset >= 0);
    const offsetEndMs = offsets.length > 0 ? Math.max(...offsets) : 0;
    const durationMs = Math.max(event.dDurationMs ?? 0, offsetEndMs, 1);
    const startMs = event.tStartMs;
    const endMs = startMs + durationMs;
    words.push({
      text,
      startMs,
      endMs,
      speaker: 'youtube-auto-caption',
      segmentId: words.length + 1
    });
  }

  return words.sort((left, right) => left.startMs - right.startMs);
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const payload = await readJson<Json3File>(options.inputPath);
  const words = wordsFromJson3(payload);
  const outputDir = path.join(evalRoot, 'stt', options.id, options.role);
  await mkdir(outputDir, { recursive: true });

  const generatedAt = new Date().toISOString();
  const wordPayload = {
    kind: 'youtube_json3_auto_caption_word_timestamps',
    sourceUri: options.sourceUri,
    generatedAt,
    wordCount: words.length,
    notes: [
      'YouTube自動字幕json3を評価環境用STT形式へ変換したもの。',
      '単語単位ではなく字幕イベント単位の時刻であり、expectedCuts固定前に音声確認する。'
    ],
    words
  };
  const transcriptPayload = {
    kind: 'youtube_json3_auto_caption_transcript',
    sourceUri: options.sourceUri,
    generatedAt,
    segmentCount: words.length,
    segments: words.map((word) => ({
      id: word.segmentId,
      startMs: word.startMs,
      endMs: word.endMs,
      text: word.text,
      speaker: word.speaker
    }))
  };

  const wordPath = path.join(outputDir, 'word-timestamps.json');
  const transcriptPath = path.join(outputDir, 'transcript.json');
  await writeFile(wordPath, `${JSON.stringify(wordPayload, null, 2)}\n`, 'utf8');
  await writeFile(transcriptPath, `${JSON.stringify(transcriptPayload, null, 2)}\n`, 'utf8');
  console.log(`word timestamps: ${wordPath}`);
  console.log(`transcript: ${transcriptPath}`);
  console.log(`events: ${words.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
