# candidate 13 基本テロップ意味分割 Gemini初実走 承認依頼 起草v001

- 起草日: 2026-07-25
- 対象: `DmWu0jVQfTE` candidate 13
- 状態: **承認依頼の起草。Gemini実走なし**
- 人間指示上の呼称: B4（Gemini実走）
- 承認済み段階契約上の呼称: B6（Gemini run 1）
- 現在の安定点: `stable/b3-complete-20260725`

## 1. 先に結論

B3で、Geminiへ意味判断させるための正式packageは完成している。

ただし、**現時点のままGemini実走を承認する依頼文にはできない**。実走前に固定すると承認済み正本で決めた次の二点が、まだ未完了だからである。

1. Gemini回答を見る前に固定する、表示計画への変換契約
2. prompt、送信payload、実行面、正確なtoken数と費用

また、今回の指示は「B4=Gemini実走、成功後に表示計画への変換ゲート」としているが、承認済み正本は次の順序である。

| 承認済み段階 | 意味 | 停止点 |
|---|---|---|
| B4 | Gemini回答を表示計画へ変換する契約を先に固定 | コード・Geminiなし |
| B5 | promptと送信payloadを正式package・B4契約へ束縛 | Geminiなし |
| B6 | Geminiを1回だけ実行し、生回答を検査 | 表示計画の生成なし |

この分離は、Gemini回答を見た後に都合よく表示計画契約を作らないための過適合防止である。したがって、今回の呼称へ黙って読み替えたり、B4/B5を飛ばしたりしない。

**推奨は、既存のB4→B5→B6を維持すること。** 本文書は、最終的なGemini実走承認依頼へ必要な条件を一枚に集約した起草として保存し、次にB4とB5を完成させて、実測token数・費用を入れた時点で実走承認依頼を確定する。

## 2. B3で正式確定した入力

正式root:

`evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/DmWu0jVQfTE-candidate-13-v001`

正式生成job:

`evals/clip_composition/outputs/presentation/caption-semantic-source-package-jobs/DmWu0jVQfTE-candidate-13-caption-b1-v001.json`

job SHA-256:

`cefcc699d2a4c47c6da4e5799dd5adb218c163668c1f9c212bbb483d9e173278`

B3は1回生成、再試行0、19/19合格である。正式値は次のとおり。

- 元文字: 354文字
- 発話まとまり: 3件
- 行末候補: 205件
- 正式file: 7件
- 正式7 file合計: 254,977 bytes

### 2.1 正式7 fileの役割

| file | bytes | 役割 |
|---|---:|---|
| `segmenter-boundary-evidence.json` | 118,391 | 元文字と機械的な行末候補の対応証拠 |
| `embedded-gate-a-validation-report.json` | 5,331 | 前工程の検査記録 |
| `semantic-source-input.json` | 30,279 | **Geminiへ見せる意味判断用入力** |
| `deterministic-expansion-map.json` | 85,529 | 回答を元文字へ機械復元する対応表 |
| `source-only-leakage-report.json` | 2,040 | 正解・教師情報が混入していない検査記録 |
| `package-manifest.json` | 8,680 | 7 fileの来歴とhash |
| `package-validation-report.json` | 4,727 | package全体の受入検査記録 |

### 2.2 Geminiへ実際に送る範囲

「入力はB3正式7 fileのみ」は、**B3 package以外を情報源にしない**という意味で適用する。

モデルへ見せる本文は、7 fileのうち`semantic-source-input.json`一件だけとする。残り6 fileは、改変・漏洩・復元対応をローカルで検査するための証拠であり、モデルへ送らない。

7 file全部をモデルへ送ると、モデルに不要なhash、検査記録、復元対応を見せることになり、B1で固定したsource-only入力契約を破るためである。

`semantic-source-input.json`の実測:

- file size: 30,279 bytes
- 本文: 354 Unicode code points
- container: 3件
- 行末候補: 205件
- container別:
  - 126文字・60候補
  - 122文字・78候補
  - 106文字・67候補

モデルに見せないもの:

- 正解・教師切り抜き
- expected
- 人間評価
- 過去の表示計画
- 時刻
- 元文字ID
- 話者
- G4〜G7
- 描画物

## 3. 実行構成案

### 3.1 モデル

第一候補:

`gemini-3.6-flash`

モデル名は検査器やpromptの定数へ焼き込まず、承認済み実行構成のパラメータとする。

正式manifestへ必ず記録するもの:

- 人間が指定したrequested model ID
- 実行日
- 実行面
- APIレスポンスが返した実モデル表記
- prompt版と実byte SHA-256
- B3正式package manifestの実byte SHA-256
- モデルへ送った入力の実byte SHA-256
- raw response全体の実byte SHA-256
- 抽出したraw JSONの実byte SHA-256
- attempt ID
- 呼出回数1
- 自動再試行0

同じattemptの途中でモデル版を変えない。変更する場合は、旧attemptを保持して停止し、新attempt・新manifest・別承認へ戻る。

### 3.2 実行面

**API実行を推奨する。**

理由:

- APIレスポンス上の実モデル表記を保存できる
- 送信byteとraw responseをそのまま保存できる
- 公式のtoken計測経路を使える
- 1回実行・再試行0を機械的に固定しやすい

ただし、caption専用API入口はまだ正式化されていない。実走前にB5で次を一意に固定する必要がある。

- 使用するSDKと版
- endpoint
- 認証情報の読み方。ただし秘密値そのものは成果物へ保存しない
- timeout
- token計測方法
- raw responseを保存するfieldとbyte化規則
- APIレスポンス上のモデル表記を読むfield
- CLI終了コード
- 通信開始前・通信完了後の停止条件

Web版Geminiを選ぶ場合は、APIレスポンス上のモデル表記と公式token計測を取得できないため、本依頼のmanifest・費用契約をWeb実測証拠に合わせて別版化する必要がある。Chromeへは逃げずMicrosoft Edgeを使い、処理完了後は対象Geminiタブを閉じる。

## 4. 1回実行契約

- 正式attemptは1件
- モデル呼出しは1回
- 自動再試行は0回
- timeout、通信失敗、拒否、空回答、`abstained`、形式不成立のいずれでも同じattempt内で再送しない
- 複数回答の結合、best-of、majority、部分救済をしない
- モデル回答を人間や別LLMが書き直して受理しない
- 無効出力はrawのまま保存し、理由を報告して停止する
- 再実行が必要なら新attempt・新manifest・別承認を要する

Geminiの仕事は次だけである。

1. 各発話まとまりの行末候補を、記載順どおり一度ずつ使う
2. 本文を変更せず、読みやすい短い行へ分ける
3. 連続する1行または2行を、一つの意味まとまりにする
4. 各行の終わりを既存候補IDから選ぶ

Geminiに作らせないもの:

- 本文
- 時刻
- 新しいID
- 行頭位置
- source atom
- anchor
- 話者
- 表示開始・終了
- テロップの見た目
- 演出指示

これらは、受理した行末候補から機械が正式packageを使って復元する。

## 5. raw回答の受入契約

### 5.1 許される結果

有効な結果は二種類だけである。

1. `complete`: 3 containerすべての行末選択を返す
2. `abstained`: 判断不能として結果を作らない

`complete`では、各意味まとまりに1件または2件の行末候補IDだけを置く。本文、理由、score、時刻、自由ID、未知fieldは返せない。

### 5.2 機械検査

受信後、次を機械検査する。

- JSON全体が厳密に復号できる
- 許可されたfieldとfield順だけである
- containerが3件とも一度ずつ元順にある
- 各意味まとまりが1行または2行である
- 全行末IDが205候補のいずれかである
- 別containerの候補を参照しない
- 候補の重複・逆順・欠落がない
- 各containerの最後がそのcontainer最後の候補で終わる
- 機械復元した各行の幅が36以下である
- 機械復元後、354文字を欠落・重複・順序変更なく一度ずつ覆う
- Geminiが本文・時刻・未知IDを追加していない
- B3正式packageとraw回答のhash鎖が成立する
- 同じ入力とraw回答から二度作った検査結果が一致する

候補外位置、本文改変、順序変更、幅超過、部分回答のどれも、推測修復せず拒否する。

## 6. 漏洩検査

### 6.1 実行前

- モデル可視入力が`semantic-source-input.json`の実byteと一致する
- 入力fieldがsource-only allowlistと一致する
- 教師、expected、人間評価、過去表示計画、時刻、話者、G4〜G7、描画物への参照がない
- promptが、入力file内の仕事本文を別の表現へ書き換えていない
- promptと送信payloadの実byte・hashを実行前に固定する

### 6.2 実行後

- raw response全体を無加工で保存する
- 検査対象のraw JSON byte列を一意に抽出する
- 自由文の中から都合のよいJSONを探さない
- 漏洩検査を通った同じ入力hashへ回答を束縛する
- 出力検査が不合格でもraw responseを破棄しない

## 7. コスト見積り

### 7.1 現時点で実測済みの規模

- モデル可視source入力: 30,279 bytes
- 本文: 354文字
- 行末候補: 205件
- 呼出予定: 1回
- 自動再試行: 0回

kawafmm指定の計画用単価:

- input: US$1.5 / 1M tokens
- output: US$7.5 / 1M tokens

### 7.2 現時点で金額を埋めない理由

正式promptと送信payloadはまだB5で固定されていない。また、選択モデルの公式token計測をまだ実施していない。

354文字・205候補・30,279 bytesを独自係数でtokenへ換算することは禁止されているため、推測token数や推測金額は書かない。

実走承認依頼の確定前に、B5で次を機械計測する。

- 送信するprompt＋構造化入力の正確な入力token数
- 事前固定した最大出力token数
- 計測に使ったmodel ID・SDK・API

費用計算式:

- 入力費 = 実測入力token数 × 1.5 / 1,000,000
- 出力上限費 = 最大出力token数 × 7.5 / 1,000,000
- 合計上限 = 入力費 + 出力上限費

正式な数値入り費用欄は、prompt・payloadのbyte固定と公式token計測後に作る。**費用欄が空のままGemini実走へ進まない。**

## 8. 成功時・失敗時の後続

### 8.1 成功

次をすべて満たした場合だけ、Gemini意味回答の取得成功とする。

- API呼出し1回
- requested modelとresponse modelの記録成立
- raw response保存成立
- raw JSONの厳密検査合格
- 205候補の決定的写像合格
- 354文字の機械復元合格
- 漏洩検査合格
- 全hash鎖成立

成功しても、自動で表示計画・指示書・描画を作らない。保存と完了報告で停止する。

既存段階契約を維持する場合、成功後は、Gemini前に固定済みのB4契約を使う決定的変換の実装・実行を別承認へ出す。

### 8.2 `abstained`

契約上有効な「結果なし」としてrawを保存する。失敗出力へ書き換えず、同じattemptで再試行せず停止する。

### 8.3 形式不成立・通信失敗・モデル不一致

観測したraw responseまたは通信記録を保存し、不合格理由を報告して停止する。

- 同じattemptで修正しない
- modelを変えない
- promptを変えない
- payloadを変えない
- checkerの期待値を変えない
- 部分結果を受理しない

## 9. この承認依頼を実走可能版へ確定する前の残件

| 残件 | 現状 | 実走前の必須成果 |
|---|---|---|
| 段階順 | 最新指示と承認済みB4/B5/B6が衝突 | 維持か明示改定かの人間判断 |
| 表示計画変換 | B4未作成 | Gemini前にfield・状態・検査を固定 |
| prompt | 未登録 | 版、全文、実byte hash |
| execution payload | 未生成 | B3 packageとB4契約hashへの束縛 |
| 実行面 | API/Webが未確定 | 一方へ固定 |
| token数 | 未計測 | 公式経路による実測 |
| 出力上限 | 未固定 | token上限と根拠 |
| 費用 | 未確定 | 入力・出力上限・合計 |
| raw response抽出 | 未固定 | API fieldまたはWeb抽出規則 |
| timeout・終了コード | 未固定 | 実行前契約 |

## 10. 人間作業量

本起草が要求する人間作業:

- 必須判断: 1件
- 内容: 既存のB4→B5→B6分離を維持するか
- 推奨回答: **維持する**
- 時間計測: しない

B4/B5完成後のGemini実走承認:

- 必須判断: 1件
- 人間が正解を作る作業: 0件
- Gemini出力の人間修復: 0件

## 11. 承認文案

### 11.1 推奨案

> candidate 13 Gemini初実走承認依頼の起草v001を確認した。B3正式packageの唯一性、モデル可視入力を`semantic-source-input.json`一件へ限定する扱い、run 1・自動再試行0・無効出力を修復せず停止する契約、漏洩検査、受入検査、成功・失敗後の停止点に異議なし。
>
> 段階は既存正本どおりB4（表示計画変換契約）→B5（prompt・execution payload・実行面・token/費用固定）→B6（Gemini run 1）を維持する。今回の「B4=Gemini実走」は工程全体の通称としては使用できるが、正式段階IDを上書きしない。
>
> 次工程として、B4の完全契約設計とB5の実走準備契約をこの順で提示してよい。Gemini実走は、B4/B5完了後に、実測token数・出力上限・費用を入れたB6承認依頼を確認するまで行わない。

### 11.2 非推奨案を選ぶ場合に必要な明示

B4をGemini実走へ正式に改称し、表示計画変換契約を回答取得後へ移す場合は、次を人間が明示承認する必要がある。

- 既存B4/B5/B6段階契約の改定
- 「Gemini回答を見る前に下流契約を固定する」過適合防止策の撤回または代替策
- prompt・payload・費用をどの停止点で固定するか
- 過去文書、DECISIONS、HANDOVERの段階番号同期

本起草は、この改定を暗黙には行わない。

## 12. 今回実施していないこと

- prompt登録
- execution payload生成
- token計測APIの呼出し
- Gemini・他LLM実走
- raw response生成
- 表示計画契約の作成
- 表示計画への変換
- 指示書生成
- 描画
- `DECISIONS.md`、`HANDOVER.md`の変更
- 安定点tagの追加

## 13. 参照した正本

- `DECISIONS.md`
- `evals/clip_composition/reports/presentation/presentation-candidate13-caption-planning-gate-b-direction-design-20260723-v001.md`
- `evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b1-implementation-contract-design-20260723-v001.md`
- `evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-c-connection-readiness-delta-audit-20260725-v001.md`
- `evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b3-formal-package-generation-completion-report-20260725-v001.md`
- B3正式7 file
