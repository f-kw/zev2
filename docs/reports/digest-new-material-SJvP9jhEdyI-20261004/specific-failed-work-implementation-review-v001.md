# 今回の保存済み成果の復帰実装・独立読取レビュー

確認時刻: 2026-10-04T13:23:08.141526+00:00。HEAD: `68df5d7afde60b3b8e938b71ad19678289cb5ba1`。製品6pathの凍結前の読取snapshotです。

重大な未解消問題は、この読取範囲では見つかりませんでした。旧rootと異なるだけの条件が子rootを受け入れる点を指摘し、`path.posix.dirname`同一＋root不同で真の兄弟領域だけを受け入れる修正を実ファイルで確認しました。旧root・子root・祖先・別plan拒否と兄弟正例の実テスト結果は親が確認します。

## 保たれている接続

- 通常job/current code/独立authorizationの資格は維持。実descriptorはSHA `84370d9611ed428f2bdcdf83321ea3c91c2e1f82edd56c96d420de0cb00eb349`、1,010,509Bに固定し、旧job・実原本・停止ownerを読み直します。
- 私的WeakMapに登録されたcontextだけが保存済みviewを取得でき、旧base quartetはsame-object条件を要求します。cloneが旧baseの資格を継承する形にはなっていません。
- rendererは計画全文のcanonical等値と651 native props全文等値を先に検査します。旧originは旧originとして保持し、metadataは新job/auth/codeに束縛します。
- 新reservation/stageへのコピーはEXCL、実source SHA、コピー後SHA、サイズ・regular・realpath・guest deviceを検査。保存済みPNG/maskの数値と媒体・元AACの検査を実際に再取得してprivate finishへ渡します。
- 既存atomic publication→公開後verification再束縛→実technical evidence→新pending receiptの2bindingを既存Core/shared/getに渡します。未保存のpassedを作ったり、再利用を新しい描画・合成として表示する配線はありません。
- 900ms coalesceはqualified recoveryだけです。通常経路はcurrentRawのまま。Python監視の設計は既存1秒のままです。ただし今回復帰中の実sample gapは未評価です。

## 実動作の限界

今回こちらで行ったのはコード読取だけです。新復帰のcopy、画像数値・媒体検査、private finish、pending保存、getの実成功や視聴品質は未評価です。親が追加予定のcopy単位next-unit＋reserveの3disk別チェックは、このsnapshot後に追加される可能性があり最終freeze版の検査に含めてください。repo/SSD/Git変更、媒体処理、process操作、test実行は0です。

## 読み取った実コード

- `/Users/kawafmm/workspace/zev2/runner/src/digest-approved-job-v001.ts` — SHA `48927f7734c127b1ab52866a1a9fbcbbf0fe86a0ceef3c8a1c1477e9dc14f01b`, 15846B。主要行: 63, 108.
- `/Users/kawafmm/workspace/zev2/tools/digest-quality/original-resolution-full-supervisor-v002.py` — SHA `82e94c8456807826955b0e1b7b9f9a4fdc6192c0d746f7aeec11b79a576a7f1e`, 77064B。主要行: 333, 387.
- `/Users/kawafmm/workspace/zev2/runner/src/digest-approved-job-runner-v001.ts` — SHA `8ae322c664e5403805852592d3b556a4d52be21bc40deeabd85cb57ad6b8d4e4`, 52012B。主要行: 177, 169, 265, 275, 240, 414, 419.
- `/Users/kawafmm/workspace/zev2/runner/src/digest-approved-inputs-v001.ts` — SHA `5d5776ceeef39144ae9161b0afb63187981c98ed374ef1eed4514887786fd037`, 41185B。主要行: 392, 395.
- `/Users/kawafmm/workspace/zev2/evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts` — SHA `da6b1b865f5bb70674f1a04b96aa492a282794ef2285a5cb780b608c082f39d8`, 38567B。主要行: 49, 524, 562, 566, 589, 601.
- `/Users/kawafmm/workspace/zev2/evals/clip_composition/render_presentation_v002.mjs` — SHA `8090b68772a6fca4e116729d2285f0ad258957755461bbe9b2aec9240a52a1fe`, 163371B。主要行: 2733, 2740, 2749, 2761, 2791, 2798, 2811, 2825.

marker別の正確な行は同名JSONの`codeBindings[].lineRefs`に記録しました。
