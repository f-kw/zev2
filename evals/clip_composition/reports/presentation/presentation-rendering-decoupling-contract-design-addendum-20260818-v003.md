# ④.5 レンダリング疎結合化 契約設計追補 v003

- 親正本: `presentation-rendering-decoupling-contract-design-20260817-v001.md`
- 親正本SHA-256: `aec224048ac6131173eb8b69b4b4d45cda88d5646ab3b67e8fa8b5561310df94`
- 累積追補: v001、v002
- 工事ID: `PRESENTATION-RENDERING-DECOUPLING-V001`
- 日付: 2026-08-18
- 状態: kawafmm承認済み

## 1. 目的

追補v001でrenderer jobとreceiptへ束縛した外部実行体6件を、受入検査だけでなく実描画まで同じ値で使用する。特にoverlay childは、jobと公開後再読済みreceiptで一致したRemotion・Chromiumをexact引数として受け取り、module-private定数や環境から選ばない。

同時に、全外部processについて終了code・stderr全文・signalを出力file読取より先に独立保存し、子process非0の原因を正式証拠だけから確定可能にする。

## 2. 正本path会計

正本path上限を25件へ改訂する。

- 19件目: `evals/clip_composition/render_presentation_v002.mjs`。既存overlay props製造・描画・QCへ明示実行体と観測入口を追加するため。
- 20件目: `evals/clip_composition/presentation_renderer_qc_v002.mjs`。ImageMagick・FFprobe・FFmpegを含むQC内の外部processも同じ観測正本へ接続し、観測処理を外側だけに限定しないため。
- 21件目: `evals/clip_composition/presentation_renderer_process_observation_v001.mjs`。外部processの終了証拠保存を描画coreとQCで複製せず、一つの実装へ固定するため。

20件目以降は使用理由を完了報告へ残す。25件に到達した時点で停止する。

## 3. overlay実行体の明示注入

共通描画coreは、既存のoverlay props製造とRemotion起動を一実装のまま維持し、次のexact引数でoverlay adapterを製造する版付き入口を追加する。

```json
{
  "remotionPath": "<renderer job/receipt一致済みabsolute path>",
  "chromiumPath": "<renderer job/receipt一致済みabsolute path>",
  "processObserver": "<正式な外部process観測入口>"
}
```

新renderer runnerはjobとreceiptのruntime binding一致を再確認した後、この二pathだけを共通描画coreへ渡す。Remotion command、Chromium引数、overlay props、public directory、entry point、composition ID、画像形式は既存実装を変更しない。

旧renderer経路のmodule-private定数とdefault adapterは物理削除せず残す。新経路はdefault adapterを使用せず、job/receipt一致値から製造したadapterを必ず明示する。test専用分岐、PATH探索、環境変数選択、fallback、別overlay実装を禁止する。

## 4. 外部process観測

新renderer経路が起動する全外部processは、共用観測入口を通る。各processは固定順のordinalと閉じたlabelを持ち、次の3 fileを別々に保存する。

```text
<ordinal>-<label>/exit-code.txt
<ordinal>-<label>/stderr.txt
<ordinal>-<label>/signal.txt
```

1. `exit-code.txt`は整数またはspawn前失敗を示す`null`。
2. `stderr.txt`はprocessが返した全byte。本文の要約・切詰め・置換をしない。
3. `signal.txt`はsignal名または`none`。
4. 3 fileをno-replace保存し終えた後だけprocess結果をcallerへ返す。callerはその後にだけprocess出力fileを読む。
5. command引数・環境変数・secretは観測成果物へ保存しない。
6. spawn失敗、非0、signal終了でも同じ3 fileを成立させ、保存失敗はprocess結果を成功扱いせずfatalとする。

対象は少なくとも、基礎映像inspection、layout inspection、overlay、line mask、ImageMagick検査、動画合成、FFprobe、音声payload検査、反実仮想動画、frame抽出、差分検査である。

## 5. 検査

検査IDは44件のまま増減しない。

- PRA009: job/receipt一致済みRemotion・Chromiumが共通overlay入口へexactに渡り、別path・欠落・差替えを拒否する。
- PRA010: 実行体が注文書内0件、job/receiptに同値一件、描画入口に同値一件である。
- PRM001/005: caption/titleの実描画で全外部processの3 fileが出力読取前に成立し、overlay commandがjob-bound Remotion、browser引数がjob-bound Chromiumである。
- PRM007: 新runner経路でmodule-private default adapter、PATH、環境変数、旧direct builder、別overlay実装を使用しない。

契約期待、test宣言、TAP observed、TAP passedの四者exact一致を維持する。

## 6. 不変条件

注文書schema・本文・cue終端・frame・style profile、overlay props、描画アルゴリズム、QC判定、既存正式成果物、stable tagは変更しない。旧経路の物理削除を行わない。API通信・費用・commit・tag・公開は0件とする。

## 7. 停止条件

正本25 path到達、親契約の意味変更、観測追加後も原因確定不能、工事前後の行分割または表示内容差、改訂枠の枯渇だけを停止条件とする。それ以外の原因確定可能な実装・設営・配線欠陥は証拠保存後に枠内で修正して続行する。

## 8. 承認記録

kawafmmは2026-08-18、正本path上限25、共通描画coreへのRemotion・Chromium明示注入、全外部processの終了証拠先行保存を一組として承認した。追補件数は3/5、停止回数は5/12、検査設営修正は5/8、限定実装修正は3/6である。
