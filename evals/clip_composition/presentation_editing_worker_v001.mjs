import {readFile, writeFile, rename} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {renderEditedOrchestrationV001} from './presentation_orchestration_edited_render_v001.mjs';
const [jobPath] = process.argv.slice(2);
if (!jobPath) throw new Error('A registered immutable editing job is required');
const job = JSON.parse(await readFile(jobPath, 'utf8'));
const save = async (file, value) => {
  const pending = file + '.' + randomUUID() + '.pending';
  await writeFile(pending, JSON.stringify(value, null, 2) + '\n', {flag: 'wx', mode: 0o600});
  await rename(pending, file);
};
const phases = {prepare: '保存した内容と描画の準備を確認しています。',
  background: '確認範囲の映像と音声を準備しています。',
  'native-assets': '字幕の描画素材を準備しています。',
  composite: '字幕と接続の表現を動画へ反映しています。',
  'range-qc': '確認範囲の映像と音声を検査しています。',
  complete: '出力した動画の登録を準備しています。'};
let progressWrites = Promise.resolve();
try {
  const result = await renderEditedOrchestrationV001({...job.renderOptions, onProgress: value => {
    const phase = typeof value === 'string' ? value : value.phase;
    if (typeof phase !== 'string') return;
    progressWrites = progressWrites.then(async () => {
      const temporary = job.progressPath + '.pending';
      await writeFile(temporary, JSON.stringify({phase: phases[phase] ?? '動画の準備を進めています。',
        observedAt: new Date().toISOString()}) + '\n');
      await rename(temporary, job.progressPath);
    });
  }});
  await progressWrites;
  await save(job.resultPath, result);
} catch (error) {
  await save(job.failurePath, {status: 'failed', message: String(error.message), stack: error.stack,
    observedAt: new Date().toISOString()});
  process.exitCode = 1;
}
