# candidate 13 字幕表示計画 B4 内部配置有限数値読取 実装修正設計 v001

- 日付: 2026-07-25
- 対象: B4正式合成検査 T082・T083
- 種別: 承認済み契約追補に基づく版付き実装修正設計
- 状態: **設計提示。実装承認待ちで停止**
- コード変更: なし
- 検査再実行: なし
- Gemini、正式表示計画、描画: なし
- 人間作業: 承認または却下1件
- 正本:
  - `presentation-candidate13-caption-gate-b4-native-fatal-layout-number-boundary-diagnosis-and-contract-addendum-20260725-v001.md`
  - 2026-07-25 kawafmm承認

## 1. 目的

配置検査が正常に返した画面上の小数座標を、意味データ用の整数限定読取器が拒否している工程間の縫い目を直す。

目的は「小数を広く許す」ことではない。次の三領域を別々の読取契約で守ることである。

1. Gemini往復、正式package、正式B4成果物、時刻、件数、indexは整数限定。
2. 人間認定済み表示台帳は、既存の固定4係数だけ小数可。
3. 配置検査が返す内部画面幾何は、列挙したfieldだけ有限小数可。

配置式、プリセット、認定済み4係数、時刻、正式成果物のschema、B4違反コード69件は変更しない。

## 2. 診断の位置づけ

障害は二層だった。

| 層 | 観測 | 現在の扱い |
|---|---|---|
| 1 | 制限環境でTSX内部Unix socketが`EPERM` | その層の正しい診断として保持。正式検査はsocket作成可能環境を使う |
| 2 | 配置検査の小数幾何を整数限定読取器が拒否 | 本設計の修正対象 |

ネイティブ実行により層1を越えたため、層2が初めて露出した。前回診断を誤診として消さない。

配置検査processは終了0、110,996 byteの通常JSONを作り、`status: "passed"`だった。描画配置処理は正当な結果を返している。修正対象は、配置検査の出力を正式runnerへ渡す受け渡し部分である。

## 3. 承認済み数値境界

### 3.1 整数限定を維持する領域

- B1 source-only package。
- Geminiへ渡す入力とGeminiから受ける意味回答。
- B4正式7 JSON。
- 時刻ms。
- frame、sample。
- 件数、配列index、ID。
- 表示内容、話者、意味分類。

既存の
`decodePresentationCaptionB1StrictJsonV001`
を変更しない。汎用の`allowDecimals`引数を加えない。

### 3.2 人間認定済み表示台帳

既存の専用読取経路が許す次の4係数だけを維持する。

1. `textSafePaddingRatio = 0.04`
2. `horizontalSafeMarginRatio = 0.04`
3. `verticalSafeMarginRatio = 0.02`
4. `fallbackTextAreaRatio = 0.98`

値、path、台帳版、canonical hashを変更しない。今回の配置結果読取へ流用もしない。

### 3.3 内部配置結果

次のfieldだけ、有限JSON numberを受理する。

| field | 許可 |
|---|---|
| `items[*].lineRects[*].left` | finite number |
| `items[*].lineRects[*].top` | finite number |
| `items[*].lineRects[*].right` | finite number |
| `items[*].lineRects[*].bottom` | finite number |
| `items[*].wrapper.top` | finite number |
| `items[*].wrapper.left` | finite number |
| `items[*].wrapper.width` | finite number |
| `items[*].wrapper.height` | finite number |
| `items[*].wrapper.renderScale` | finite number |
| `items[*].wrapper.displayWidth` | finite number |
| `items[*].wrapper.displayHeight` | finite number |
| `items[*].lineHeightPx` | finite number |
| `violations[LINE_BOX_OUTSIDE_SAFE_AREA].details.rect.left / top / right / bottom` | finite number |
| `violations[LINE_BOX_POSITIVE_INTERSECTION].details.overlapWidth / overlapHeight` | finite number |

finite numberは`Number.isFinite`が真でなければならない。NaN、Infinity、非数、negative zero、safe範囲外整数を拒否する。

次は整数のままである。

- `items[*].lineCount`
- `items[*].fontSizePx`
- `LINE_COUNT_EXCEEDS_CANDIDATE_LIMIT`の`actual / allowed`
- `LINE_BOX_OUTSIDE_SAFE_AREA`の`lineIndex`
- 同違反の`safeAreaPx.top / right / bottom / left`
- `LINE_BOX_POSITIVE_INTERSECTION`の`leftIndex / rightIndex`

## 4. 実装する専用入口

### 4.1 配置先

`evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs`
へ、次の一件だけをexportする。

```text
decodePresentationCaptionB4LayoutInspectionJsonV001(bytes)
```

このfileは、現在の厳密JSON字句解析処理を一つだけ所有している。字句解析処理を別fileへ複製せず、既存private処理を再利用する最小変更とする。

### 4.2 入力

- `Buffer`だけ。
- 配置検査
  `evals/clip_composition/inspect_presentation_preset_layout.ts`
  が書いたJSON byte。
- job、CLI引数、環境変数から数値profileを差し替えられない。

### 4.3 返値

成功:

```json
{
  "status": "decoded",
  "value": {
    "status": "passed",
    "items": [],
    "violations": []
  }
}
```

失敗:

```json
{
  "status": "invalid",
  "reason": "schema-invalid"
}
```

字句解析に失敗した場合は、既存入口と同じ
`invalid-utf8 / bom-present / code-fence / trailing-content / duplicate-key / number-invalid / surrogate-invalid / syntax-invalid`
のいずれかを返す。字句解析後のexact schema不一致だけは
`schema-invalid`
とする。その他のreasonを作らない。

schema不一致は新しい汎用違反コードを作らず、専用入口の`invalid`として正式runnerを既存fatalへ閉じる。B4正式成果物や69違反コードは変更しない。

### 4.4 exact schema

rootは`status / items / violations`だけ。

各itemは次だけ。

1. `layerId`
2. `stateId`
3. `resolvedText`
4. `lineCount`
5. `lineRects`
6. `wrapper`
7. `fontSizePx`
8. `lineHeightPx`

各line rectangleは`left / top / right / bottom`だけ。

wrapperは
`top / left / width / height / renderScale / displayWidth / displayHeight`
だけ。

違反は次の三種類だけ。

| code | details |
|---|---|
| `LINE_COUNT_EXCEEDS_CANDIDATE_LIMIT` | `actual / allowed` |
| `LINE_BOX_OUTSIDE_SAFE_AREA` | `lineIndex / rect / safeAreaPx` |
| `LINE_BOX_POSITIVE_INTERSECTION` | `leftIndex / rightIndex / overlapWidth / overlapHeight` |

未知field、未知code、型不一致、BOM、重複key、trailing content、code fence、不正UTF-8、lone surrogateを拒否する。

構造間の関係も固定する。

1. `items`と`violations`は欠けのない配列。
2. `items[*].layerId`は一意。
3. `lineRects.length === lineCount`。
4. 全violationの`layerId`は、同じ出力内のitem一件だけを参照する。
5. `violations.length === 0`のときだけ`status === "passed"`。
6. `violations.length > 0`のときだけ`status === "failed"`。

## 5. runnerの変更

対象:

`evals/clip_composition/run_presentation_caption_display_pair_job_v001.mjs`

配置検査出力を読む一箇所だけを、既存整数限定入口から§4の専用入口へ置き換える。

変更しないもの:

- 配置検査processの起動方法。
- 固定Node、TSX、esbuild。
- 配置検査の入力。
- 終了code 0/1の扱い。
- 配置検査失敗時の停止。
- 正式reportの作成条件。
- CLI 0/1/2。
- T082の期待0、T083の期待1。

`JSON.parse`だけの別読取器、丸め、mock、skip、fallbackは作らない。

## 6. 実装bindingの閉包

§4の実体fileは、現在のB4 runnerが既にimportしているが、B4 jobの正式依存12件に含まれていない。このまま実体だけを変更すると、変更した読取契約がjobの実装bindingへ束縛されない。

正式依存の末尾へ次を追加し、13件にする。

| role | path |
|---|---|
| `sharedJsonContractCore` | `evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs` |

追加対象:

1. generation jobのbinding検査。
2. static preflight jobのbinding検査。
3. 合成fixtureのgeneration job builder。
4. 合成fixtureのpreflight job builder。
5. production runnerの実体hash再照合。
6. static preflight runnerの実体hash再照合。

既存12件のrole、順序、pathを変更せず、13件目へ追加する。読取器をjobから差し替えられない。

## 7. 正式preflight jobの版

既存v001 jobは、旧12依存と旧実装hashで行った診断の証拠である。上書きしない。

修正実装が承認された場合、新しい読み取り専用jobを次へ固定する。

| 項目 | 値 |
|---|---|
| job path | `evals/clip_composition/outputs/presentation/caption-display-pair-static-preflight-jobs/DmWu0jVQfTE-candidate-13-caption-display-pair-b4-v002.json` |
| job ID | `DmWu0jVQfTE-candidate-13-caption-display-pair-b4-preflight-v002` |
| artifact ID | `DmWu0jVQfTE-candidate-13-v002` |
| mode | `read-only-preflight` |

入力内容、354文字、3まとまり、205候補、2区間はpreflight照合値であり、変換器・読取器へ焼き込まない。

## 8. 検査設計

### 8.1 専用読取入口

新規:

`evals/clip_composition/test_presentation_caption_layout_inspection_json_v001.mjs`

12件を固定する。

| 番号 | 検査 |
|---:|---|
| 1 | 全許可幾何fieldに小数を含む`passed`を受理 |
| 2 | 三違反種類と小数幾何を含む`failed`を受理 |
| 3 | `lineCount`の小数を拒否 |
| 4 | `fontSizePx`の小数を拒否 |
| 5 | negative zeroを拒否 |
| 6 | NaN・Infinity・非数を拒否 |
| 7 | safe範囲外整数を拒否 |
| 8 | `safeAreaPx`の小数を拒否 |
| 9 | 未知field・時刻風fieldを拒否 |
| 10 | 未知違反code・details形不一致を拒否 |
| 11 | BOM・重複key・trailing content・code fence・不正Unicodeを拒否 |
| 12 | 指数表記は許可幾何fieldの有限値だけ受理し、整数fieldでは拒否 |

### 8.2 既存厳密JSONの回帰

`test_presentation_caption_semantic_source_package_v001.mjs`
の正確なexport集合へ専用入口を一件追加し、既存133件を全件再実行する。

回帰で確認する。

1. B1整数限定入口は小数を拒否し続ける。
2. 表示台帳の専用入口は固定4係数以外を拒否し続ける。
3. 時刻・意味・packageに小数を入れられない。

既存133件を「新検査込み134件」と言い換えない。新規12件と既存133件を別系統で報告する。

### 8.3 B4合成検査

既存85件へ次の2件を追加し、87件とする。

| 番号 | 検査 |
|---:|---|
| T086 | 13件目の`sharedJsonContractCore`が欠落・別path・hash不一致なら実装binding不成立 |
| T087 | production runnerが配置結果専用入口を直接使い、配置結果へB1整数限定入口・独自`JSON.parse`・profile注入口を使わない |

既存69違反コードの集合・順序・所有者は変えない。69件全発火とexport集合=観測集合の完全一致を再確認する。

T082・T083はfixtureや期待終了codeを変えず、実process経路が専用入口を通って本来の0/1へ到達するかを検査する。

### 8.4 既存回帰

B4 87/87の場合だけ、既存95件を同じ固定環境で実行する。

- v002字幕検査24件を含む。
- 指示書、話者、timeline、レンダラーの既存検査を含む。
- 既存95件の内訳を変更しない。

## 9. 実装対象

承認後に変更を許すfileは次だけ。

1. `evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs`
2. `evals/clip_composition/run_presentation_caption_display_pair_job_v001.mjs`
3. `evals/clip_composition/presentation_caption_display_pair_v003.mjs`
4. `evals/clip_composition/run_presentation_caption_display_pair_static_preflight_v001.mjs`
5. `evals/clip_composition/test_presentation_caption_semantic_source_package_v001.mjs`
6. `evals/clip_composition/test_presentation_caption_display_pair_v003.mjs`
7. `evals/clip_composition/test_presentation_caption_layout_inspection_json_v001.mjs`（新規）
8. 新しいcandidate 13 preflight v002 jobと、その読み取り専用実行記録。
9. 完了または停止報告、DECISIONS、HANDOVER、JOURNAL（安定点条件成立時だけ）。

実装監査で別fileの変更が必要と判明した場合は、独自に広げず停止する。

## 10. 実行順と停止条件

承認後の順序を固定する。

1. 承認済み契約文書の作業ツリーbyteと承認時commitを照合。
2. §9の範囲だけ実装。
3. 専用読取入口12件。
4. B1 source package既存133件。
5. B4正式合成87件を頭から一回。
6. 87/87の場合だけ既存回帰95件。
7. 新しいcandidate 13 preflight v002を読み取り専用で一回。
8. 完了報告または停止報告。

次のいずれかで停止し、同attemptで修正・再実行しない。

- 一件でも不合格。
- 実装者判断を要する未定義。
- 契約同士の新しい矛盾。
- 許可外file変更の必要。
- 新しい数値区分。
- 既存整数契約または固定4係数契約の変化。
- T082・T083より後段の新しい不合格。

最後の項目は本修正の失敗と自動判定せず、新しく到達した下流原因として分離記録する。

## 11. 成功時と含まないもの

成功時に言えること:

- 内部配置の有限小数を、意味データの整数契約を壊さず受け渡せた。
- 配置検査結果のexact schemaと有限性を検査できた。
- candidate 13の読み取り専用B4 preflightが新実装bindingで成立した。

成功時にも言えないこと:

- テロップが人間に読みやすい。
- 正式表示計画が完成した。
- Geminiの区切り判断が良い。
- 描画品質が良い。
- B4全体が完了した。

Gemini、正式pair生成、描画、B5、B6へ自動では進まない。

## 12. fatal観測性の残件

現行fatal v001を変更しない。

残件:

> 固定fatalの公開情報だけでusage／I/O／runtime／report-untrustedを分類できない。次にfatal診断が公開情報だけでは分類不能になった時点で、閉語彙の原因分類を持つfatal v002の契約改訂要否を再評価する。

今回の実装修正へ診断表示の改訂を混ぜない。

## 13. 実装契約完全性チェック

| 項目 | 状態 | 根拠 |
|---|---|---|
| 成果物schema | 固定 | §4.4 |
| 数値field区分 | 固定 | §3.3 |
| 入出力入口 | 固定 | §4、§5 |
| 工程間の受け渡し | 固定 | 配置検査output byte→専用入口→runner |
| 実装binding | 固定 | §6の13件目 |
| 違反コード | 変更なし | B4既存69件 |
| CLI終了code | 変更なし | 0/1/2 |
| 検査可能性 | 固定 | §8の12+133+87+95 |
| 参照実体存在 | 確認済み | 配置検査、runner、厳密JSON所有fileはいずれも実在 |
| 観測データ取得可能性 | 確認済み | 配置検査output fileをrunnerが既に読む |
| 数値区分の受け渡し | 固定 | §3、§4、§5 |
| candidate固有値の分離 | 固定 | §7のpreflightだけ |
| 停止点 | 固定 | §10 |

実装者判断を要する未確定は0件。

## 14. 承認依頼

次を一括で承認してほしい。

1. 本設計を実装正本とする。
2. §9の限定fileへ実装する。
3. 専用読取入口12件、既存B1回帰133件、B4 87件を順に実行する。
4. B4 87/87の場合だけ既存回帰95件とcandidate 13読み取り専用preflight v002を実行する。
5. 完了報告または最初の不合格で停止する。

承認範囲に、Gemini、正式表示計画、正式pair、描画、B5、B6は含めない。
