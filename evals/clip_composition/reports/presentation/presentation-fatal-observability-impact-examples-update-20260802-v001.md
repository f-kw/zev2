# fatal観測性 実害例更新 v001

日付: 2026-08-02  
状態: 読み取り整理。観測性契約・実装は変更していない。

## 結論

既知の3実例では、外側の包括的な失敗表示だけでは内側原因を区別できず、追加診断や再実行が必要になった。2026-08-02の正式縦型描画でも同じ型が再発し、実害例は合計4件となった。さらに同じ正式描画を、既知のB4契約不一致を解消した新入力で1回実行しても、byte同一の外側fatalが返った。二つの実行で内部状態が違うのに、外形だけでは区別できないことが実測された。

## 既知の3実例

| 実例 | 外側で見えたもの | 失われた内側情報 | 実害 |
|---|---|---|---|
| B4 T082/T083 | 終了2、`CAPTION_B4_FORMAL_CLI_JOB_CONTEXT_UNAVAILABLE` | 第1層のTSX Unix socket `EPERM`と、第2層の内部配置小数を整数限定読取器が拒否したこと | ネイティブ再実行と限定診断を複数回行い、数値境界の契約追補が必要になった |
| 意味回答検査131 | 親側の終了1だけで子processの違反がTAPに残らない | 親processの合成隔離が子processへ届かず、実workspaceを見て返した`GATE_A_CONTEXT_INVALID` | 133件が132/133で停止し、stdout/stderr追加診断、一時workspace隔離、全件再実行が必要になった |
| candidate 59縦型B4初回 | `SEMANTIC_COMPILER_REBUILD_FAILED`、details空 | 決定性用複製で8個のbyte列が`Buffer`でなくなったことと、その先のSHA参照名不一致 | 読み取り診断、限定修正、B4・横型回帰、正式B4再生成が必要になった |

## 今回追加された実例

### 第1正式描画

正式縦型rendererは、job schema、実装29/29、runtime 7/7の事前照合後に終了2となった。stdoutは`VERTICAL_RENDER_V001_RUNNER_FATAL`だけで、正式出力directoryも作られなかった。後続の読み取り診断で、B4表示計画が4項目の来歴を出し、rendererの承認済み3項目入口が拒否したことを特定した。

### 契約復元後の第2正式描画

B4生成側を正本3項目へ戻し、B4検査13/13、縦型renderer検査21/21、横型回帰6/6、正式B4検査9/9に合格した。新しいrenderer preflightではjob schema、実装29/29、runtime 7/7、入力15/15がすべて合格し、前回の来歴形不一致が解消したことを確認した。

それでも正式rendererは終了2となり、第1回とbyte同一の`VERTICAL_RENDER_V001_RUNNER_FATAL`だけを返した。正式出力directoryは作られず、mp4とQCも生成されていない。第2回の内側原因は未確認である。

このため、完成動画へ進むには再実行とは別の読み取り診断が必要になった。観測性不足が最終目標への直結工程を二度止め、同一点2/2停止による計画差し戻しへ至った実例である。

証拠:

- 第1停止報告:
  `evals/clip_composition/reports/presentation/presentation-candidate59-vertical-b4-rebuild-render-fatal-stop-report-20260802-v001.md`
- 第2停止報告:
  `evals/clip_composition/reports/presentation/presentation-candidate59-vertical-b4-contract-restoration-second-render-fatal-stop-report-20260802-v001.md`
- 第1・第2生fatal SHA-256: いずれも`f23ce48d77560e9bb3fd9b468fd0423478d8ba30029f313710bde5d2c94cf231`。

## 将来改訂時の最小論点

1. v001を暗黙変換せず、版付きfatal v002として分離する。
2. 外側報告には、最後に完了した固定stageと、閉語彙の原因分類を最低1件ずつ残す。
3. 子processが信頼済みの構造化違反を返した場合だけ、その閉語彙codeを一段上へ欠落なく伝える。生messageは渡さない。
4. 生path、stack、字幕本文、API key、provider本文は引き続き出さない。
5. 信頼済み内側報告を作れない場合は、`report_untrusted`等の粗い固定分類へ閉じる。
6. 複数原因時の所有者と優先順を固定し、実装者判断で代表原因を選ばせない。
7. 上記4実例を回帰fixtureにし、異なる内側原因が同じ外側分類へ潰れないことと、秘密非露出を同時に検査する候補とする。
8. 改訂が保証するのは診断範囲の絞り込みまでで、根本原因の自動証明ではないと明記する。
9. 次は保存済み入力で原因を読む。観測性改訂を描画修正へ便乗させない。

## 未確認

今回のfatalの内側原因。原因が観測性契約の改訂なしに保存済み成果物だけで特定できるかも未確認である。
