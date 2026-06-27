import type { PatchArtifact } from '../workflow-artifacts.js';

export function buildPatchArtifact(editPlanUri: string): PatchArtifact {
  return {
    kind: 'patch_json',
    mode: 'fixed-adjustment',
    generatedAt: new Date().toISOString(),
    editPlanUri,
    changes: [
      {
        target: '動画の流れ',
        action: '複数の発話箇所をこの順番で使う',
        reason: 'テーマの入口から展開までを確認用動画として見られるようにするため'
      },
      {
        target: '画面とテロップ',
        action: '各断片で見せる範囲と表示文を決める',
        reason: '動画にしたときに必要な場面が切れず、内容を追えるようにするため'
      }
    ],
    renderReady: true
  };
}
