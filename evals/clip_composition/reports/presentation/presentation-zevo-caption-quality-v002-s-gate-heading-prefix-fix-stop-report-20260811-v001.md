# ZEVO字幕品質v002 S局所ゲート 見出し境界修正後停止報告 v001

- 日付: 2026-08-11
- 状態: S局所ゲート5/6で停止・A工程未着手
- API通信: 0回
- 費用: US$0
- 正式描画: 0件

## 1. 結論

承認された検査側の見出し境界修正だけを反映し、S局所6件を新しい版付きattemptとして頭から一度実行した。結果は5/6、test runner終了code 1で停止した。

前attemptを止めた文書区間抽出は解消した。承認済み実文書byteに対する開始前確認では、開始見出しの後に最初に現れる行頭`## 11.`を題名付き終了見出しとして一件取得し、ZCQ表46行を抽出し、終了見出し本文をproof itemへ含めないことを確認した。正式attemptも共通開始前監査を越えて6件の本体検査へ入った。

今回の不合格はZCQ001の検査専用観測枝である。公開直前に契約fileを差し替えてproductionの再読拒否を実測するため、隔離workspaceのstaging root生成を`node:fs`のwatcherで待つ処理がある。このwatcherの作成時に`EMFILE: too many open files, watch`が発生し、当該枝のproduction起動・差替え・拒否観測へ進めなかった。

不合格1件で停止する規律に従い、watcher処理の変更、再実行、A工程への進行は行っていない。

## 2. 承認範囲の反映

検査側だけに、終了境界専用の読取処理を追加した。

1. 開始見出しは従来どおりexact一致で読む。
2. 終了境界だけは、開始位置より後で最初に現れる行頭`## 11.`のH2見出しを読む。
3. `## 11. API実走後の正式受入4件`という題名付き見出し自身は抽出内容へ含めない。
4. V1/V2/V3の既存区間抽出はexact一致のまま変えない。
5. production、fixture値、proof item分割規則、460件期待、S割当39件は変えていない。

DECISIONSへ、文書見出し境界は行頭prefixで実在形を読み、正式attempt前に実文書byteで確認する規律を追記した。

## 3. 実文書byteの開始前確認

| 項目 | 観測 |
|---|---|
| 開始見出し行 | 1629 |
| 終了見出し行 | 1684 |
| 終了見出し実体 | `## 11. API実走後の正式受入4件` |
| 抽出したZCQ行 | 46件 |
| 終了見出し本文の混入 | 0件 |
| test file構文検査 | 合格 |

この確認後にだけ正式attemptを開始した。

## 4. 正式attemptの実行条件と証拠

実行条件:

- 固定Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- 固定TSX loader: `/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs`
- `NODE_OPTIONS`: 不存在
- 実行回数: 1回
- test runner終了code: 1

| 証拠 | byte数 | SHA-256 |
|---|---:|---|
| `reports/presentation/diagnostics/presentation-zevo-caption-quality-v002-s-gate-heading-prefix-fix-20260811-v001/attempt-0001.tap` | 3390 | `9ea58477d2c83e61ecb61101217d2d028695c5f1cd6d8c3f7ec9045b505cb8e6` |
| `reports/presentation/diagnostics/presentation-zevo-caption-quality-v002-s-gate-heading-prefix-fix-20260811-v001/attempt-0001.stderr` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

停止時のS工程2 path:

| path | SHA-256 |
|---|---|
| `evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs` | `dd38dd2b3de9e3946da0fb7fb2e509cc1973515a8f32ae72b262c48ec667dee7` |
| `evals/clip_composition/presentation_output_caption_cue_source_package_v001.test.mjs` | `d9ee22b6a6278822a8355572085c0f9ecf55c948b5b6fe6a50f323b58a6bdf3b` |

## 5. 6件の結果

| ID | 結果 | 観測 |
|---|---|---|
| ZCQ001 | 不合格 | 検査専用watcherの作成が`EMFILE`で失敗。P01〜P17、V2-01、V2-02は合格。V2-03のproduction実枝は未観測 |
| ZCQ002 | 合格 | 3 proof item合格 |
| ZCQ003 | 合格 | 3 proof item合格 |
| ZCQ004 | 合格 | 4 proof item合格 |
| ZCQ005 | 合格 | 5 proof item合格 |
| ZCQ006 | 合格 | P 3件とV2 1件が合格 |

S所有39 proof itemのうち38件はpassed行として保存された。未保存の1件は、watcher開始失敗より後にあるZCQ001-V2-03である。

## 6. 三分法

| 対象 | 帰属 | 根拠 | 現在の判定 |
|---|---|---|---|
| 見出し境界抽出 | fixture・検査側 | 実文書の題名付き`## 11.`をprefixで一意に取得し、正式検査本体へ入った | 解消を観測 |
| ZCQ001の今回の不合格 | fixture・検査設営側 | 失敗箇所はtest fileだけが使う`node:fs` watcherの作成。production側に同watcherはなく、V2-03のproduction実枝へ到達していない | 新たな検査観測手段の不成立 |
| production限定修正 | 実装が契約に届かない観測なし | ZCQ002〜006は合格。ZCQ001もV2-03より前の正常・拒否・binding証明まで合格 | V2-03だけ未確認のためS工程全体の完成は未成立 |
| 契約 | 矛盾なし | 今回の失敗は契約値やproduction判定ではなく、検査観測手段の開始失敗 | 契約改訂不要 |

## 7. 事実・推測・未確認

### 事実

- 正式attemptは5/6、終了code 1だった。
- ZCQ001のuncaught exceptionは`EMFILE: too many open files, watch`だった。
- watcher作成より前に実行されたZCQ001のP01〜P17、V2-01、V2-02は合格した。
- ZCQ001-V2-03はproduction実枝を発火できず、passed行がない。
- ZCQ002〜006は全件合格した。
- TAP全文と0 byte stderrを版付き保存した。
- A工程、API通信、費用支出、正式描画は実施していない。

### 推測

- なし。

### 未確認

- watcher作成が`EMFILE`になったOS・実行環境側の具体的理由。
- watcherを使わず、隔離workspace内の公開直前だけを決定的に観測・差し替えできる検査方式。
- ZCQ001-V2-03が要求する、公開前再読による契約差替え拒否の実枝証明。
- S局所6/6とA工程以後。

## 8. 修正方向の比較と次の判断

今回の承認は再修正を含まないため、次のいずれも実施していない。

| 方向 | 変更側 | 契約影響 | 評価 |
|---|---|---|---|
| watcher資源不成立の読み取り診断 | 実行環境・検査設営の観測のみ | なし | `EMFILE`の具体因を確定してから方式を選べる |
| watcherを使わない決定的同期へ置換 | 検査側のみ | なしの見込み | production hookや検査専用分岐を作らず、公開直前実枝を確実に発火できる設計証明が必要 |
| production判定を緩める | production | 契約違反 | 不採用。今回production判定は未発火であり修正根拠がない |
| V2-03証明を削除する | 検査期待 | 証明消失 | 不採用。460件・S39件の契約を破る |

次は、保存済み証拠を使ってwatcher開始失敗を読み取り診断するか、同じ証明をwatcherなしで実枝発火させる限定修正設計を承認する一判断が必要である。

## 9. 停止点

本報告で停止する。検査観測手段の修正、S局所ゲート再実行、A工程進行は行わない。
