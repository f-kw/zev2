# 再現の入口

媒体はローカル保持。新しい描画には、既存の出力を上書きしない未使用directoryを指定する。ここにあるCLIや関数は開発用の共通描画経路であり、通常file入口の正式受入を意味しない。

## 固定した入力から

1. `presentation_orchestration_inputs_20260918.json` にある元の媒体・確定字幕・保持区間・音響観測をSHAで照合する。
2. `presentation_orchestration_prepare_v001.mjs` で新判断用の入力を再構成する。過去のrequestから本文・文脈・音響根拠だけを取り出す明示的な項目集合を使い、過去の回答・演出割当を入れない。今回の再構成は保存入力と一致済み。
3. 今回の再現では保存済みの生回答を使い、再判断しない。判断固定処理で字幕・接続の自動原本とそれぞれの上書き、選択根拠を復元する。
4. 描画用の導出処理で一つの表示時計を作る。元資料のSHA、4保存物、具体的な接続が一致しなければ古い導出結果を拒否する。
5. `presentation_orchestration_background_v001.mjs` の背景生成処理へ、その表示時計・元映像・新しい出力先を渡す。接続後背景を全YUV画素・全PCMで検査し、音声sample番号から時刻を付けたAACを別に作る。
6. `presentation_orchestration_candidate_v001.mjs` に、保存入力directory、元入力一覧、背景検証記録、新しい描画／証拠directoryを記したjob JSONを渡す。完成映像、再描画一致、有限字幕状態、音声packet、入力と実装の前後SHAを検査してから既存の確定処理で新directoryへ出す。
7. `presentation_orchestration_soft_overlay_probe_v001.mjs` で、完成候補のSoft窓と文字内部を確認する。SHA付きの完成映像・描画結果・背景検証記録・導出結果を引数にする。完成映像は再encodeしない。

## 今回の実行条件

Node.js 20.19.6、既存のpnpm依存、FFmpeg 8.0.1、既存ImageMagickとChromiumを使用。新しい依存や媒体の取得は行っていない。Remotion／tsxにはこの環境のローカルIPC実行許可が必要。

最終候補の実行形式：

```sh
PATH=/Users/kawafmm/.nvm/versions/node/v20.19.6/bin:$PATH \
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node \
evals/clip_composition/presentation_orchestration_candidate_v001.mjs \
/private/tmp/zev-stage3-orchestration-34ktdfcx/candidate-job-v003.json
```

この実行で使ったjobは [候補生成job](evidence/candidate-job.json) に保存する。同じ出力先をもう一度使うと拒否されるため、再実行時は出力先2箇所を別の未使用directoryにする。入力のSHAや自動選択の変更は必要ない。

実保存状態の変更・Reset・時計故障は、[実行コマンド付き完了記録](state-check-persisted/completion.json)と `presentation_orchestration_state_check_v001.mjs` で再現する。この検査は元の4保存ファイルを書き換えず、変更した状態を別の検査directoryへ実ファイルとして保持し、実際に読み直す。

手指定した合成順fixtureと自動候補は別である。小型fixtureの2字幕とSoft指定を、今回の自動判断実績に数えない。

非ゼロ移動後のPulse・Shakeと時計故障の実画素確認は、`presentation_orchestration_physical_clock_probe_v001.mjs` と[コマンド付き索引](evidence/physical-clock-proof-index-v001.json)で再現する。実候補のnative PNGを同SHAで使い、検査用の静止背景と時計で少数のframeを作る。公開後のPNG directoryを明示する必要がある。出力先は未使用のものへ変更する。完成候補の再encodeや変更は行わない。
