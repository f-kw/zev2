# ZEVO字幕品質v002 人間合格・成果固定 完了報告 v002

日時: 2026-08-16

## 1. 結論

ZEVO字幕品質v002は、A-v002実データの横型3本で機械検証と人間目視の両方を完了し、安定点へ固定した。

- kawafmm目視: 5/5、総評「完璧」
- 成果固定commit: `84222296e8810a1675fc9bbab0ac444dce146980`
- stable tag: `stable/caption-quality-v002-20260816`
- tag object: `a467d15dc97a3fb52c6a268f5e52762958e71053`
- tag作成時刻: 2026-08-16T14:07:20+09:00

字幕工事はこの安定点で閉じる。次の主線は、未確定事項から三者合意で選ぶ。

## 2. 人間が確認した完成物

確認ページSHA-256は`88db5c70b3d0dd5f17be07bd15dc3811b1894c7499f835d2c585e8e2212488ae`。

| 素材 | video SHA-256 | 機械QC | 人間確認 |
|---|---|---:|---:|
| voice-013 | `c7fc6c07fbd1ad94851e02774d735f4ef8da82052b67dc9afd8cd6100ef21811` | 合格 | 合格 |
| voice-067 | `85dac1f3bdb22083c1d3cf67e23a2ac82f39a4cf1b207cfd95fd718b14dc2ad3` | 合格 | 合格 |
| voice-190 | `dd27a406c5339952b8f94e6e186b09975a6d4c5918836f8be51725c99e324cbe` | 合格 | 合格 |

目視した五項目は、前の文字の残留なし、短文の不要改行なし、長文の自然な二行化、全文の欠落・重複・逆順なし、最短字幕の4frame fadeが自然、である。

意味の小単位の判断基準v021を入れたことでAIが三字幕全件の選択を完遂した。論理幅と物理配置を整合したv022により、以前は一行扱いで拒否された長文が自然な二行となった。

## 3. 最終機械検証

| 項目 | 結果 | 証拠SHA-256 |
|---|---:|---|
| 正式検査 | 48/48 | `d38d27e9d0d896c963114703bf3f7b3c8b7f98f7b8790cf20abab28af3598341` |
| 証明項目 | 523/523 | 同上 |
| baseline | 86/203、既知不合格117、ID別差0 | `491c3ac6ae13a6b39415ffc38779e4b618e99a7f7179f061274a367986514242` |
| baseline比較 | exact | `69bdb12aaa708642da3874f4b1f0963f566f00eafa9e97adbb1a0e666bcf3e62` |
| 既存5 tree | 5/5 | `6842bd13718d765b73b43292458b77a953f330297f187fe53be046d88d46b3dd` |
| A-v002記録対象 | 2,887件、欠落0、byte差0 | `386462402f325e92daa378319f8b8681d979f2f41ad2d3195c0cab2fbbf0bc47` |

greenの現行実測526/538は全合格と主張しない。12件は旧固定期待、全未追跡path列挙、旧E2E内側観測の問題として「旧green・旧レンダラー信頼台帳の現行再確定」へ分離済みである。

## 4. 固定した成果物

主commitは2,243 fileを同期した。

- 契約設計と累積追補v001〜v022。
- 字幕source、AI送受信、selection、page/line plan、render plan、proof、確認画面の実装と検査。
- F/U fixture製造、48 file package、receipt、環境・保持manifest、局所・正式TAP。
- Gemini 3.7/3.6のschema、安全性、棄権、診断、正式回答、usage、費用の版付き観測。
- 正式selection、正式proof job、横型3本、描画後QC、確認ページ。
- 描画疎結合化、renderer表現力、provider再評価、旧green再確定の調査素材。
- Claude Webの相談packet試験、Goal・強制上限・定期報告の事実調査。
- AGENTSの設営起因自走規律とDECISIONSの全裁定履歴。

`.env`、API key、secretはcommit対象0件。再生成可能な一時renderer作業領域2,766 fileは、正式proof runと重複するため安定点の正本へ含めていない。正式公開された動画、QC、plan、completion、reviewは全て含めた。

## 5. API実測と費用

countTokensは無償、HTTP 400は非課金として既存記録どおり除外した。保存usageと採用価格snapshotから再集計したStandard list price換算は次である。

| 区間 | 費用 |
|---|---:|
| v021前のschema・安全性・棄権診断・正式実測 | US$0.14528850 |
| v021正式B6 | US$0.03676725 |
| v022正式B6 | US$0.02627100 |
| 累計 | **US$0.20832675** |

完了指示時の概算は約US$0.17だったが、完了報告では保存usageの再集計値、約US$0.21を正とする。API keyの値、providerの生エラー本文、stack、secretは保存していない。

## 6. F/U fixture製造

F/Uは検査内で入力を都度合成する方式から、版付きpackageを独立製造しreceiptで受け取る方式へ変えた。

- 44入力payload、600環境行、26保持条件を一組で固定。
- packageは48 fileを排他的に公開。
- consumerのpath・basename・環境変数規則までadmissionで確認。
- 使用済みfixtureSetと出力rootの削除・再利用は0件。
- 局所fixture 2/2・34/34、F 3/3、U 2/2、正式48/48へ合格。

失敗attemptと個別修正の履歴は、機械検証完了報告v001に全件保存した。

## 7. 体制試験の現在地

Claude Webの`ZEV01`会話をEdge経由で使う相談packet往復は、通常応答、`needs-kawafmm`、schema不正、timeoutの4種類を実測済みである。

- Codexが名乗り、固定マーカー内のJSONを一意抽出できた。
- `needs-kawafmm`を`continue`へ誤変換せず、証拠保存後に追加作用を止められた。
- schema不正では余分なkeyを黙って捨てず、exact key不一致として応答全体を不受理にした。
- timeoutでは存在しないconsultation IDを10.186秒待ち、回答・許可・`continue`へ変換せず追加作用0件で終了した。
- Goalにagent用の明示pause操作がないため、現在の停止形は「証拠保存→追加作用停止→通知→turn終了」。
- 強制上限は自然言語判断でなく、版付きwork-orderとrunnerの永続counter ledgerを正本にする案まで整理済み。
- 4種類の試験は相談経路の実現性とfail-closedの確認に限る。体制設計の確定は字幕工事へ混ぜず、三者合意を待つ。

## 8. 要裁定一覧

### 描画疎結合化 8件

style所有、cue終端と行末の分業、時刻単位、admission receipt、初回実証範囲、旧経路削除時期、path上限、着工順の8件。

### renderer表現力 11件

初版画面形、書体、色、行分割、motion、opening hook、G4/G5範囲、外部renderer、教師素材、人間確認段階、同一工事範囲の11件。

### provider再評価 3件

開始時期、第二provider候補、provider別job分離の3件。Geminiの正式入力・回答pairは比較教師として固定済み。

### 旧green・旧レンダラー信頼台帳の現行再確定

後続承認済み成果への旧期待追随、未追跡作業領域と列挙境界、OEE 6件の内側観測が要裁定である。

### 三者運用体制設計

Claude相談の正式経路、packet schema、runner hard limit、定期check-in、timeout・schema不正時のfail-closed、正式な`needs-kawafmm`通知形が未確定である。

## 9. 在庫一覧

- 最上位: 旧green・旧レンダラー信頼台帳の現行再確定。
- 描画疎結合化の正式契約設計。
- 分離rendererの表現力調査。
- 字幕境界選択LLM provider再評価。
- S〜U全gateへのfixture製造統合。
- 契約件数を整数で固定するproof群の置換連鎖解消。
- 新設runnerの観測性標準化。
- 観測契約・loader構造変更時のtoolchain変換範囲照合。
- A-v002未追跡作業fileの配置・列挙境界。
- 三者運用体制のwork-order・counter ledger・定期check-in設計。

## 10. 停止点

字幕品質v002は人間合格・commit・stable tagまで完了した。次の主線は要裁定一覧から三者合意で選ぶため、ここで停止する。

stable tag後の体制試験2件も完了した。追加API通信、費用、正式描画、production・契約・正式成果物の変更は行っていない。
