# ZEVO字幕品質v002 S局所ゲート 限定修正後停止報告 v001

- 日付: 2026-08-11
- 状態: S局所ゲート不成立・A工程未着手
- API通信: 0回
- 費用: US$0

## 1. 結論

承認されたS工程の限定修正4点を2 pathへ反映し、正式6件を頭から一度実行した。結果は0/6、test runner終了code 1で停止した。

ただし、6件のproduction検査がそれぞれ不合格になったのではない。全testに共通する開始前監査が一度失敗し、6件全てが本体へ入る前に同じhook failureとして終了した。

原因は今回追加した検査側の文書読取処理である。承認済み設計の「次の`## 11.`見出し直前」を、行全体が`## 11.`だけである見出しとして探索した。現物の見出しは`## 11. API実走後の正式受入4件`であるため、見出しを0件と誤判定した。production、fixtureの4修正、契約の不成立を示す観測ではない。

不合格1件で止める規律に従い、このattempt内では検査側の読取処理を直していない。

## 2. 今回反映した限定修正

次の変更は作業ツリーに保持しているが、正式6件による合格確認は未成立である。

1. productionを、固定TSX loader下で実在するstyle resolverのnamed exportへ接続した。default wrapper、fallback、代替objectは作っていない。
2. 合成fixtureがpure builderへ渡す3項目を、job、job byte binding、case inputsの正式順に直した。productionのexact判定は変えていない。
3. 正式成果物の再読で、通常成果物は`schemaVersion`、preset検査台帳と素材検査台帳だけは`registryVersion`を照合する固定表へ接続した。SHA・canonical SHA・既存validatorは維持した。
4. V2証明を、実job byte binding、契約3件、公開直前の契約差替え拒否、同一実job bindingからのbyte決定性を観測する枝へ割り当て直した。また、承認済み4文書からP/V1/V2/V3を再導出し、297+41+55+67=460件とS所有39件を照合する開始前監査を追加した。

## 3. 正式attemptの観測

実行条件:

- 固定Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
- 固定TSX loader: `/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs`
- `NODE_OPTIONS`: 不存在
- 実行回数: 1回

| 証拠 | SHA-256 |
|---|---|
| `reports/presentation/diagnostics/presentation-zevo-caption-quality-v002-s-gate-limited-fix-20260811-v001/attempt-0001.tap` | `e33df3e9f0e605e1a65d3d11e26a5a76fd6601002d2ca192f21f2c2082f697d3` |
| `reports/presentation/diagnostics/presentation-zevo-caption-quality-v002-s-gate-limited-fix-20260811-v001/attempt-0001.stderr` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

TAPは6件全てについて、共通開始前監査の`section end count: ## 11.`が0件だったことを記録している。stderrは0 byteである。

停止時の2 path SHA-256:

| path | SHA-256 |
|---|---|
| `evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs` | `dd38dd2b3de9e3946da0fb7fb2e509cc1973515a8f32ae72b262c48ec667dee7` |
| `evals/clip_composition/presentation_output_caption_cue_source_package_v001.test.mjs` | `e6ca04c225586dd6741d2995f068e109b50fedbc7cf75bf85348b63b06b951d9` |

## 4. 三分法と対応表

| 観測 | 帰属 | 根拠 | 解消見込み |
|---|---|---|---|
| S局所6件が共通hookで停止 | fixture・検査側の欠陥 | 文書に実在する題名付き`## 11.`見出しを、検査側だけが行全体一致で0件とした | 見出し番号を保った題名付きH2を一意に読む限定修正で解消見込み |
| production限定修正 | 未確認 | 共通hookがproduction実枝より前に停止した | 新attemptで確認が必要 |
| 契約 | 矛盾なし | 契約文の「次の`## 11.`見出し」は、実文書に実在する11節見出しを指しており値は一意 | 契約改訂不要 |

## 5. 次の限定修正案

検査側の文書区間抽出だけを、開始見出しの後に最初に現れる「行頭が`## 11.`であるH2見出し」を終了境界として一意に読む方式へ直す。題名本文はproof itemへ含めない。production、fixture値、proof item分割規則、460件期待、39件のS割当は変えない。

修正後は、新しい版付きattemptとしてS局所6件を頭から一度実行し、TAP全文を保存する。6/6の場合だけA工程へ進む。不合格1件で再び停止する。

## 6. 事実・推測・未確認

### 事実

- 正式attemptは0/6、終了code 1だった。
- 全6件は同じ開始前hook failureで、本体testは開始されなかった。
- 承認済み設計の現物には`## 11. API実走後の正式受入4件`が一件実在する。
- TAP全文とstderrを版付き保存した。
- API通信、費用支出、正式描画、A工程実装は0件である。

### 推測

- なし。

### 未確認

- 4点の限定修正後のS局所6/6。
- proof item 460件とS所有39件の開始前監査完走。
- A工程以後の実装・検査。

## 7. 停止点

本報告で停止する。検査側の区間抽出修正、S局所ゲート再実行、A工程進行は別承認とする。
