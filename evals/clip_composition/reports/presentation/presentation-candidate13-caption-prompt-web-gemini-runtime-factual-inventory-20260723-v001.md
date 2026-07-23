# candidate 13 caption用プロンプト・Web Gemini実行経路 事実棚卸し v001

- 作成日: 2026-07-23
- 区分: 人間待ち充填方式による副線・読み取り専用調査
- 主線: `presentation-candidate13-caption-planning-gate-b-direction-design-20260723-v001.md`の方向判断待ち
- 状態: **現存資産の事実確認のみ。プロンプト未登録・実行契約未確定・未実装・未実走**
- 書き込み範囲: 本レポート1件だけ。共有文書、承認済み設計、コード、prompt台帳、正式成果物は変更していない
- 人間作業: 0件。副線から新しい確認依頼は出さない

## 1. 目的

未承認のゲートB方向設計が承認された場合、captionの意味分割をWeb版Geminiへ初めて依頼する工程が必要になる。

その前に、次の三点を事実として分ける。

1. caption用prompt名と版台帳に、既存版との衝突があるか。
2. 現行Web Gemini実行経路を、そのままcaption用の正式入口にできるか。
3. 直接再利用できない場合でも、どの運用・実装慣行は参考になり、何が未整備か。

本レポートは仕様を決めない。prompt本文、出力schema、違反種類、実行回数、retry、成果物構成を新たに固定しない。

## 2. 結論

### 2.1 prompt版

- `evals/clip_composition/prompts/`にcaption意味分割用promptは存在しない。
- `caption_planning_prompt_v001`という名前は、未承認のゲートB方向設計で初めて提案された。
- 同名のprompt file、prompt台帳行、過去の同名prompt版は存在しない。**名前衝突はない**。
- ただし、承認済みの古い段階設計には、別の版空間として`caption-plan-v001@gemini-web-flash`、`presentation-caption-semantic-plan-v001`、`presentation-caption-display-plan-v001`、将来予約名`presentation-caption-check-v003`が既出である。これらはprompt file名ではない。
- 新promptを作る場合は、`prompts/README.md`の規律により、prompt fileと台帳更新を同一コミットにする必要がある。既存版の意味を変える再利用はできない。

### 2.2 実行入口

**caption planningを現在のコードへそのまま接続して、正式に実走できる入口は0件である。**

現行`run_web_gemini_prompt.ts`は、任意のUTF-8 promptをWeb Geminiへ送る画面操作を持つ。しかし成功出力として認識するのは、次の6形式だけである。

- 区間選択
- テーマ候補
- 境界微調整
- 候補順位
- callback探索
- callback判定

未承認方向設計が想定する`status`と`containers`を持つcaption出力は、この6形式のどれにも該当しない。完全なJSONが返っても成功結果として認識・保存できず、`abstained`だけの出力も同じである。

### 2.3 安全・来歴

既存の用途別runnerには、次の慣行が部分的に存在する。

- 実行前にprompt、入力、漏洩検査、生成系統、run番号をmanifestへ記録する。
- 途中切れ抽出を禁止するoptionを使う。
- 出力先が既にある場合の扱いは用途別であり、停止するrunner、skip/reuseするrunnerの両方がある。
- 実行終了後にGeminiタブを閉じるoptionを使う。
- 回答本文、会話URL、申告モデル名、実行parameterを結果へ残す。

ただし、これらは用途ごとのwrapperに分散しており、caption用の正式契約を満たす共通入口にはなっていない。特に次は現存しない。

- Web画面上の実モデルを選択・確認し、その証拠を保存する処理。
- CDP接続先がMicrosoft Edgeであることの確認。
- その実行が開いたタブだけを閉じたことの所有・消滅確認。
- 実行直前のprompt実byteと入力実byteのhash照合。
- 回答本文、抽出済み出力、保存JSON実byteのhash束縛。
- Web送信前の一回分の実行権確保と、失敗後も同じrunを再送しない一回性証明。
- caption出力を未知fieldや不正itemの脱落なしで丸ごと検査する入口。
- 検査済み結果一式の原子的公開。

## 3. prompt台帳の現状

対象:

- `evals/clip_composition/prompts/README.md`
- `evals/clip_composition/prompts/`

台帳の現行規律は次である。

1. 新しいprompt版は台帳と同一コミットで登録する。
2. 採点結果には、実際に生成した系統を記録する。
3. テーマ、composition、rankingなど、測定対象が違う版空間を混同しない。
4. 旧版の移動・削除前に、参照中のoutputs/reportsを確認する。
5. 既存版の意味を後から変えず、実験意図が変わる場合は新番号を作る。

### 3.1 caption名の実在確認

本レポート自身を除くと、`caption_planning_prompt_v001`の完全一致検索結果は、未承認の方向設計にある提案1件だけである。

存在しないもの:

- `evals/clip_composition/prompts/caption_planning_prompt_v001.md`
- caption planning用の台帳行
- caption planning専用のprompt builder
- caption planning専用の実行runner
- caption planning専用の出力checker

したがって、名前の空きは確認できるが、登録済み版として扱うことはできない。

### 3.2 近い既存promptを直接使えない理由

#### `presentation_meaning_detection_prompt_v001.md`

G4の強調・抑制候補とG7の補足素材候補を検出するpromptである。基本テロップの意味分割、行末選択、表示切替は対象外である。

#### clip composition系

元配信から採用する区間と発話群を選ぶ。captionの一行終端を選ぶ仕事ではなく、出力schemaも異なる。

#### boundary refinement系

仮区間の開始・終了を単語境界から選ぶ。外側境界を変えないcaption分割とは責務が異なる。

#### candidate ranking系

題名と理由から候補の優先順位を返す。発話文字列や境界候補を扱わない。

#### callback系

別時刻の前振り候補を探し、因果・情報参照を判断する。連続本文のテロップ分割ではない。

以上は、出力を推測変換してcaption版として再利用できない。使えるのは、版管理、source-only入力、ID選択、低確信時停止といった設計上の先例だけである。

### 3.3 本体旧資産との境界

`runner/src/steps/edit-plan.ts`には、Geminiへ`telopPlan`を作らせるinline promptがある。しかし次の違いがある。

- 画面構成、人物検出、title、hookと結合された旧工程である。
- 発話ID単位で、本文と役割もモデルが生成する。
- 1テロップに複数発話IDを要求する。
- 版台帳で管理されたcaption意味分割promptではない。

`runner/src/telop/telop-line-break.ts`は決定的な折返し処理であり、意味分割promptではない。文字幅で折り、句点を落とす経路もあるため、元文字を変えず境界候補IDだけを選ばせる未承認方向とは契約が違う。

両資産とも、後方互換や推測変換で新caption入口へつなぐ対象ではない。

## 4. 現行Web Gemini共通runnerの処理

対象:

- `evals/clip_composition/run_web_gemini_prompt.ts`

### 4.1 直接できること

- 指定されたprompt fileをUTF-8文字列として読み、Web Geminiの入力欄へ送る。
- CDPの指定portへ接続する。
- `evals/clip_composition/outputs/`配下だけを出力先として許す。
- Gemini画面の回答本文から、code fenceまたは釣り合ったJSON objectを探す。
- 通常の完全出力経路では、生成停止後、抽出結果が一定時間変化しないことを待つ。途中切れ救出を許した場合は、timeout時にこの安定確認を満たさない最新抽出を返せる別経路がある。
- 成功結果へ実行時刻、CLIで申告したモデル名とparameter、prompt相対path、会話URL、抽出回答本文を保存する。
- 診断情報を伴う出力待ちtimeoutでは、採点・人間確認に使えない診断結果として回答本文と画面末尾を保存する。途中切れ拒否、CDP、UI操作など別経路の失敗では、診断fileが残らない場合がある。
- option指定時、途中切れ救出を拒否する。
- option指定時、CDP接続後に通常の`try`へ入った処理では、finallyで対象tab IDへclose要求を送る。tab作成後のWebSocket URL欠落やCDP接続失敗は、このfinallyより前に失敗する。

これらは**実装慣行として参考になる**。ただし内部関数はexportされておらず、caption用ライブラリ入口として直接呼べる形ではない。

共通runnerは、prompt fileを`prompts/`配下へ限定せず、台帳登録済みかも検査しない。任意parameterもJSON objectであること以外は用途別に検査しない。

### 4.2 caption出力を読めない

成功JSONの入口は、既存6配列のどれかがあることを必須にしている。captionで予定される次の形は受理されない。

```json
{
  "status": "complete",
  "containers": []
}
```

`status: "abstained"`も同様である。

また、既存parserは厳密な全体拒否ではない。

- 配列中の不正itemをfilterで落とし、有効itemが1件でも残れば全体を受理できる。
- 未知fieldを保持する。
- 出力安定判定は既存6用途の主要fieldだけを見る。
- 複数用途の配列が同居した場合、固定優先順の一つだけで安定判定する。

したがって、「元順に全containerを一度ずつ」「未知field拒否」「不正itemが1件でもあれば全体停止」のようなcaption向け完全一致契約を、現runnerのparserが保証するとは扱えない。

### 4.3 途中切れと補完

`--rejectPartialExtraction`を付けない場合、未完JSONから区間選択またはテーマ候補だけを正規表現で救出し、欠けた理由や題名へrunner側の文言を補う経路がある。

- caption、ranking、callback、boundaryには同じ部分救出はない。
- `--rejectPartialExtraction`を付ければ、この部分救出は拒否できる。
- 完全JSON内で不正itemだけをfilterする挙動は、このoptionとは別に残る。

既存wrapperがこのoptionを使っている事実は参考になるが、それだけでcaptionの非補完・全体厳密拒否は成立しない。

## 5. ブラウザ・モデル・タブの実測可能性

### 5.1 Microsoft Edge

共通runnerは`127.0.0.1:<cdpPort>`へ接続する。接続先processがMicrosoft Edgeかは確認しない。

CLI parameterの既定値に`runner: edge-cdp-text-prompt`という文字列はあるが、これは実ブラウザ確認の証拠ではない。

### 5.2 モデル名

`--model`の既定値は`gemini-web-flash`であり、その文字列を成功結果と失敗診断へ保存する。

しかし、Web画面から現在のモデル名を読む、指定モデルへ切り替える、画面表示とCLI申告を照合する処理はない。したがって既存結果の`model`は**CLI申告値**であり、実画面で観測したモデル名ではない。

### 5.3 タブの所有と終了

通常実行は、まず新しいGemini tabの作成を試みる。作成に失敗すると、既存Gemini tabの先頭を流用する。

`--closeTabAfterRun`を付け、CDP接続後に通常の`try`へ入った処理では、success/failureどちらでもfinallyで対象IDへclose要求を送る。ただし次の限界がある。

- 新規作成tabか、既存流用tabかを来歴へ記録しない。
- tab作成後のWebSocket URL欠落やCDP接続失敗ではclose処理へ到達しない。
- close要求の失敗を握りつぶす。
- close後に対象IDが消えたことを確認しない。
- 新規作成失敗時には、流用した既存tabを閉じ得る。
- `--extractExisting`と診断modeは通常のclose経路を通らない。

「その実行で開いたtabを、結果保存後に閉じた」という正式証明には不足する。

## 6. 回答本文と成果物の来歴

### 6.1 現在保存されるもの

共通runnerの成功JSONには次が同居する。

- 抽出済みの既存用途出力
- 実行時刻
- CLI申告モデル名
- 任意parameter
- prompt相対path
- Gemini会話URL
- 画面本文から切り出した回答文字列

この回答文字列は、ネットワーク応答の生byteでも、常に画面全体を保存したものでもない。通常は「Gemini の回答」以降を切り出し、prompt echoと推定した末尾を除く。該当markerがない場合はprompt先頭行を基準にし、それも見つからなければ画面本文全体へfallbackする。

### 6.2 現在保存されないもの

- prompt実byte hash
- 構造化入力実byte hash
- 送信payload全体のhash
- 回答文字列hash
- 抽出済み出力hash
- 保存JSON実byte hash
- Web画面で確認したモデル名とその証拠
- tab新規作成・流用・close確認の証拠

共通runnerの成功保存は通常の`writeFile`であり、既存path拒否、lock、作業場所、検査後の一括公開を持たない。

## 7. 用途別wrapperにある参考慣行

### 7.1 connection・boundary

入力準備時に、prompt実文字列のSHA-256、prompt path、入力path、漏洩検査path、出力先、生成系統、上流生成系統、prompt版、run識別をmanifestへ記録する例がある。

実走時は、準備済みprompt hashをparameterへ転記する。しかし、送信直前に現在のprompt実byteを再hashして準備時値と照合する共通処理はない。

既存connection runnerには、保存済み結果のモデル申告と対象配列だけを見て再利用するものがある。これは厳密な一回性証明ではなく、caption runの正式入口へそのまま採用できない。

### 7.2 ranking

ranking runnerには複数の扱いがある。

- v002通常runnerは、manifestの生成系統とrun数を確認し、出力が既にあれば停止する。
- 正式初見runnerは、manifestの生成系統、prompt版、run数を確認し、出力が既にあれば停止する。
- v001 runnerは、出力が既にあれば当該項目をskipする。

いずれも共通runnerへ途中切れ拒否、実行後tab close、生成系統、run番号を渡す。prompt版はmanifestで宣言・確認する例があるが、共通runnerの保存parameterへは渡していない。

ただし、順位重複、欠落、候補ID実在性などの厳密検査は後段の用途別処理にある。共通runner単体の保証ではない。

### 7.3 theme・callback

- windowed theme runnerは保存済み出力を検査し、不成立物を退避して再試行できる。
- callback runnerは事前漏洩状態を検査し、入力内IDや時間順を用途別に検査する。
- 用途によってretry、skip、archive、部分無効化の方針が異なる。

これらは各実験の契約であり、caption用の一回性や全体厳密拒否を既に提供する共通規約ではない。

## 8. 再利用分類

| 対象 | 直接再利用 | 実装慣行として参考 | 現時点で未整備 |
|---|---|---|---|
| caption prompt | 0件 | prompt版を新番号で登録し台帳と同一コミットにする規律 | prompt本文、台帳行、builder |
| caption出力解析 | 0件 | ID参照・元順・未知field拒否を用途別checkerで検査する既存慣行 | `complete/abstained`、container、cue、行末IDの厳密parser/checker |
| Web画面操作 | task-readyなexport済み部品は0件 | prompt送信、生成停止待ち、回答本文抽出、failure診断、finally close | caption契約へ束縛した正式runner |
| モデル確認 | 0件 | CLI申告値の記録 | Web画面上のモデル選択・確認・証拠保存 |
| Edge確認 | 0件 | 指定CDP portへの接続 | 接続先browser実体の確認 |
| tab終了 | 0件 | close optionとfinally | 実行所有tabの証明、close成功・消滅確認 |
| 実行来歴 | 0件 | manifest、prompt hash、生成系統、run番号を準備時に残す用途別慣行 | 実行直前再hash、input/raw/output/hashの一体束縛 |
| 一回性 | 0件 | 出力が既にある場合に停止またはskip/reuseする用途別wrapper | 送信前の実行権確保、同時起動防止、失敗後再送禁止 |
| 結果公開 | 0件 | 別工程にあるlock・原子的directory公開の慣行 | caption実走結果一式の検査済み原子的公開 |

ここでの「直接再利用0件」は、既存コードを参考にできないという意味ではない。**captionの正式要件を満たしたまま、そのまま呼べるtask-ready部品がない**という意味である。

## 9. 未承認方向設計との照合

未承認方向設計が承認された場合、同設計§8で求めている次の事実は、現行共通runnerだけでは満たせない。

- prompt版と台帳の正式登録
- captionの`complete/abstained`出力受理
- 全container・全cue・行末IDの厳密検査
- 実画面モデル名の確認
- prompt/input/raw出力hashの保存
- その実行で開いたGemini tabのclose証明
- run 1の一回性

したがって、方向承認後のB1契約または後続実行契約では、既存runnerを「既に要件を満たすもの」として暗黙採用できない。

一方で、本棚卸しは次を決めない。

- 共通runnerを改訂するか、caption専用runnerを作るか。
- 既存private処理をexportするか、責務を分離して新しい共通層を作るか。
- retryを一切持たないか、送信前失敗だけを再開可能にするか。
- rawを独立artifactにするか、manifestとの同一packageへ入れるか。

これらは主線の方向承認後、完全な実装契約として人間判断へ提示すべき事項である。

## 10. 今回の処理結果

- prompt file・台帳・Git履歴を照合し、caption prompt名の衝突なしを確認した。
- 共通Web Gemini runner、theme、ranking、connection、boundary、callbackの用途別実行経路を読み取り確認した。
- caption用のtask-readyな直接再利用部品は0件と確認した。
- 参考にできる運用慣行と、現在不足する正式契約を分離した。
- code変更、prompt作成、台帳更新、Gemini実走、正式出力生成は行っていない。
- 新しい人間判断は要求しない。主線の方向判断1件だけが引き続き待ち状態である。
