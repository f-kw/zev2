# candidate 13 caption用 Edge・モデル・タブ・一回性証拠 事実棚卸し v001

- 作成日: 2026-07-23
- 区分: 人間待ち充填方式による副線・読み取り専用調査
- 主線: `presentation-candidate13-caption-planning-gate-b-direction-design-20260723-v001.md`の方向判断待ち
- 状態: **現存資産の事実確認のみ。未実装・未実走・契約未確定**
- 書き込み範囲: 本レポート1件だけ。共有文書、承認済み設計、コード、prompt台帳、正式成果物は変更していない
- 人間作業: 0件。副線から新しい確認依頼は出さない

## 1. 目的

先行棚卸し
`presentation-candidate13-caption-prompt-web-gemini-runtime-factual-inventory-20260723-v001.md`
では、現行の共通Web Gemini runnerに次の証拠がないと確認した。

- CDP接続先がMicrosoft Edgeであること
- 実画面上のモデル名
- その実行が開いたタブだけを閉じたこと
- 回答本文のhash
- Web送信の一回分の実行権と再送していないこと

本レポートでは対象をリポジトリ全体へ広げ、別用途の実装・成果物に転用可能な先例がないかを確認する。

目的は、未承認のゲートB方向を先に実装することではない。既存資産を次の三種類へ分け、将来の設計で「既にできている」と過大評価しないための事実整理である。

1. caption実走へそのまま使える。
2. 実装方法または記録形式の参考にはなるが、caption用の正式証拠にはならない。
3. 先例がなく、新しい契約と実装が必要である。

## 2. 結論

**caption用Web Gemini実走へ、そのまま使える証拠実装は、調査した全対象で0件だった。**

一方、次の強い実装・記録先例は存在する。

- Microsoft Edgeを絶対pathから自前起動し、その子processのCDP pipeへ直結して、画面UAと再生媒体hashを検査する実装
- Web Gemini実走成果物へ、画面で見たモデル名と回答内自己申告を別fieldで保存した記録
- CDPの対象IDへclose要求を送り、HTTP応答を記録する実装
- ローカル成果物生成で、出力先の原子的予約や二重claimを拒否する実装

ただし、どれもcaptionのWeb送信を対象にした完成部品ではない。特に不足しているのは次である。

- 既に起動しているログイン済みEdgeのCDP接続先を、実processまで遡ってEdgeと証明する共通入口
- Web Geminiのモデルを送信前後に機械読取し、期待値と照合して証拠保存する処理
- 新規作成したGeminiタブの所有を記録し、close後に同じ対象IDが消えたことを確認する処理
- raw回答実byteのhashと、抽出・保存結果を束縛する処理
- 外部送信前にrun 1の実行権を原子的に確保し、送信後失敗でも同じrunを再送しない処理

## 3. 分類表

| 対象 | captionへ直接再利用 | 参考先例 | 未整備の核心 |
| --- | --- | --- | --- |
| Edge実体とCDP接続先 | なし | 自前起動したEdge子processのCDP pipeへ直結し、`Edg/` UAを検査する媒体観測器 | 既存CDP portの所有processをEdgeと証明する共通処理 |
| Web画面モデル | なし | `uiModelSelector: "Flash"`等を保存した成果物 | モデル選択・読取・照合・送信前後同一性・証拠保存 |
| タブ所有と新規作成 | なし | 専用Edge process内でtargetを作る例、共通runnerの`/json/new` | 作成/流用区分、target ID、作成証拠の正式保存 |
| close後消滅 | なし | close HTTP応答の保存、終了後のGemini総タブ数記録 | 対象IDを再照会し、消滅まで確認して合否化 |
| raw回答hash | なし | 回答文字列の保存、汎用SHA-256 helper | raw回答実byte・抽出結果・保存結果の相互束縛 |
| Web送信一回性 | なし | AgentRequest claim、ローカル出力lock | 外部送信前claim、送信済み状態、失敗後も再送禁止 |

## 4. Edge実体を確認する先例

### 4.1 強い先例

対象:

- `evals/clip_composition/observe_presentation_first_real_data_edge_playback_v001.mjs`
- `evals/clip_composition/serve_presentation_first_real_data_gate_v001.mjs`
- `evals/clip_composition/presentation_source_media_equivalence_v001.mjs`
- `evals/clip_composition/outputs/presentation/20260721-first-real-data-assembly-gate-v001/browser-playback-observation.json`

正式な媒体対応証明は、固定配信server、媒体観測器、最終照合器の合成契約で成立する。

1. 固定配信serverが代替媒体pathを受けず、信頼済み正式媒体を検査済みfile handleで開き、固定`/media`から配信する。
2. 媒体観測器が`/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`を絶対pathで自前起動する。
3. `--remote-debugging-pipe`を付け、起動した同じ子processの専用pipeへCDP命令を送る。
4. そのprocess内で対象pageを新規作成する。
5. page内の`navigator.userAgent`を読み、`Edg/<version>`を抽出する。
6. 観測器へ渡した正式媒体fileをSHA-256化し、固定URLでの再生、解像度、seek、再生進行、媒体errorとともに記録する。
7. 最終照合器が、観測記録の媒体hashと正式成果物の媒体hash、URL、寸法等を完全一致させる。

観測器単体がEdgeのHTTP response byteをhashしているわけではない。固定serverが検査済みfile handleを配信し、観測器が同じ固定URLでの再生を確認し、最終照合器がhashを束縛する責務分担である。

正式成果物には、Microsoft Edge 150、`Edg/150.0.0.0`を含むUA、正式媒体のhashが記録されている。これは「指定したEdge子processへ接続し、固定serverが配った正式媒体をその画面で見た」ことの強い合成先例である。

### 4.2 captionへ直接使えない理由

この観測器はcandidate 13の媒体確認専用である。

- 固定page URLと固定media URLを使う。
- candidate 13の固定seek位置を使う。
- 1920×1080と固定媒体hashを要求する。
- 独立したheadless profileを使い、ユーザーがログイン済みのWeb Gemini環境へ接続しない。
- Edge実行fileの署名、binary hash、PIDは成果物へ記録しない。

したがって、実装方法は参考になるが、Web Geminiの既存ログインsessionへそのまま移植できる共通部品ではない。

### 4.3 既存のWeb Gemini用Edge起動処理

対象:

- `scripts/web-gemini-review-edge.mjs`
- `evals/clip_composition/run_xau_part01_web_gemini_review.mjs`

これらはMicrosoft EdgeをAppleScriptまたは`open -na`で起動し、CDP portへ接続する。しかし、指定portが既に応答した場合は、その所有process、実行file、UAを確認せず既存接続先を採用する。

共通runner
`evals/clip_composition/run_web_gemini_prompt.ts`
も`127.0.0.1:<cdpPort>`へ接続するだけであり、既定parameterの
`runner: "edge-cdp-text-prompt"`
は申告文字列である。Edge実体の証拠にはならない。

リポジトリ内に、任意のCDP portを所有するOS processを特定し、その実行fileをMicrosoft Edgeと照合する共通処理は見つからなかった。

## 5. Web画面モデルを確認した記録

### 5.1 成果物の先例

次の成果物は、CLI申告値とは別に画面上のモデルを保存している。

- `g5-location-upRyakf5j80-gemini-web-flash-v001.json`
- `g6-location-nOEWCNc77MI-gemini-web-flash-v001.json`

両方に次の記録がある。

```json
{
  "modelEvidence": {
    "uiModelSelector": "Flash",
    "selfReportedModel": null
  }
}
```

縦型ショート候補の成果物
`vertical-short-candidate-narrowing-20260720-v001/gemini-web-output.json`
には、次を別fieldで保存している。

- 実走直前の画面表示: `Flash`
- 回答本文の自己申告: `Gemini 2.5 Pro`
- 両者が不一致なので、画面表示を生成系統の根拠とし、自己申告も削除せず保持したという注記

この不一致は`DECISIONS.md`にも事故を隠さない観測として記録されている。

通常動画教師候補の
`exemplar-collection-v001/candidate-narrowing-20260719/selection.md`
には、使用した画面上のモデルを`Web Gemini Pro`と記録した先例もある。ただし、対応する回答JSONにmodel evidence fieldはなく、画面capture、DOM selector、選択操作の記録もない。これはoperatorが残した文書記録であり、機械証明ではない。

### 5.2 実装として不足するもの

上記成果物を作った、再現可能なモデル選択・読取専用codeは見つからなかった。

- model selectorのDOM識別子
- 選択状態の一意判定
- 期待モデルとの機械照合
- 送信前後でモデルが変わっていないことの確認
- target ID、観測時刻、DOM要約、画面証拠の保存

が存在しない。

したがって、`uiModelSelector`は**成果物schemaの参考**にはなるが、機械的な実モデル証明ではない。

また、Git追跡済みのGemini出力JSONのうち716 filesは、画面本文から切り出した派生文字列に
`Flash\n\nGemini`
という文字列を含む。棚卸し時のローカルworktree全体では、未追跡の旧出力20 filesを含め736 filesだった。これらには失敗診断や実走前snapshotも含まれるため、独立した736回の実走を意味しない。

この文字列は、同じpageのUI chromeが回答の派生文字列へ混入した間接的痕跡にすぎない。full bodyの保存でもmodel selector要素を特定した記録でもないため、正式証拠へ昇格できない。

### 5.3 CLI申告モデルとの区別

共通runnerの`--model`既定値は`gemini-web-flash`であり、成功結果と失敗診断へその文字列を写す。採点器のモデル照合も、この申告値同士を比べる。

これは「実画面でFlashを選択し、その選択を確認した」証拠ではない。Gemini APIのmodel optionやAPI応答のmodel versionも、Web画面モデルとは別の系統である。

## 6. タブの所有・作成・終了

### 6.1 現行共通runner

現行共通runnerの作成・流用・close経路と不足は、先行棚卸し§5.3で確認済みなので再掲しない。比較に必要な要点だけを述べると、`/json/new`失敗時に既存tabを流用し、作成/流用区分とtarget IDを成果物へ残さず、close要求後の対象ID消滅も確認しない。

### 6.2 別用途の先例

`cleanup_web_gemini_tabs.mjs`は、target IDへ送ったclose要求について、HTTP成否、status、本文を記録する。これは共通runnerより強いclose記録の先例である。

`run_callback_detection_v001_web_gemini.mjs`は、実行後のGemini tab総数を数える。しかし、対象target IDの消滅を確認するものではない。他tabの増減があっても、個別の所有と終了を証明できない。

媒体観測器は、自分で起動した専用Edge子process内でtargetを作り、最後にpage closeを送り、finallyで子processへ`SIGTERM`を送る。process所有は明確だが、page close後のtarget消滅も、signal後のprocess終了も検査しない。また、ログイン済みGemini tabの運用とは異なる。

リポジトリ内に、次を一続きに行う実装は見つからなかった。

1. 作成前のtarget一覧を固定する。
2. 新規target IDを記録する。
3. そのIDだけを処理対象にする。
4. 結果保存後にcloseする。
5. 同じIDが一覧から消えるまで待つ。
6. 消滅を成果物へ記録し、不成立なら失敗にする。

## 7. raw回答hashと一回送信

### 7.1 raw回答hash

共通runnerが回答の派生文字列を保存する一方、そのhashや抽出・保存結果との相互束縛を持たないことは、先行棚卸し§6で確認済みである。リポジトリ全体へ広げると汎用SHA-256処理は多数あるが、Web回答の取得、parser入力、抽出結果、保存成果物の四段を結ぶ先例は見つからなかった。

### 7.2 一回送信

共通runnerに送信前claimと送信済み永続状態がないことは、先行棚卸し§6で確認済みである。本調査では、別用途に転用可能な一回性の先例を探した。

参考になる別用途の仕組みはある。

- backendのAgentRequest claimは、同時に二者が同じrequestを取得することを拒否する。
- rendererは、出力先の親directoryに所有lockを原子的に確保する。
- 複数の評価用生成器は、新規出力を排他的に予約し、既存成果物を上書きしない。
- 一部の用途別wrapperは、保存済み出力が妥当なら実走をskipする。

ただし、いずれもWeb送信buttonを押す前の一回性へ接続されていない。

AgentRequest claimは期限切れ後に再取得できるため、送信後に失敗した外部副作用を再実行しない契約としては不足する。rendererのlockもローカル成果物公開の所有権であり、外部送信済み状態を表さない。保存済み出力のskipも、送信後・保存前に停止した場合の再送を防げない。

## 8. 将来設計へ持ち込めるもの

未承認のゲートB方向が承認された場合、事実上再利用できるのは次の**考え方と小部品**である。

### 8.1 参考にできるもの

- Edgeを絶対pathから自前起動し、その子processのCDP pipeへ直結する所有証明
- UAから`Edg/<version>`を読み、申告値でなく実画面からbrowserを確定する方法
- 実byteをSHA-256化して入力・観測・成果物を束縛する既存慣行
- `modelEvidence`で画面表示と回答内自己申告を分離して保存するschemaの考え方
- target IDを明示してclose要求を出し、HTTP結果を記録する処理
- 新規出力先を原子的に予約し、既存物を上書きしないlockの考え方

### 8.2 新規設計と実装が必要なもの

- ログイン済みWeb Geminiを利用しながら、Edge実体を証明する運用
- model selectorの選択・読取・送信前後照合
- tab作成の所有証拠とclose後消滅検査
- prompt、source-only入力、raw回答、抽出結果、保存成果物のhash連鎖
- 外部送信の永続claimと送信済み状態
- 送信後失敗時に「自動再実行しない」を機械的に守る状態遷移

これらは、既存runnerへ例外を足して済ませる小変更とは扱えない。実装するなら、caption専用の完全契約で成果物schema、違反種類、停止点、実行入口を先に固定する必要がある。

## 9. 本副線の停止点

本レポートは既存事実を整理しただけである。

- EdgeまたはGeminiを起動していない。
- Web Geminiへ送信していない。
- prompt、runner、checker、tab cleanupを変更していない。
- 未承認のゲートB方向を承認済みとして扱っていない。
- 本レポートの不足一覧を、実装要件として自動確定していない。

主線へ戻す判断は一つだけである。未承認のゲートB方向設計が承認された場合、B1完全実装契約では、既存runnerの直接再利用を前提にせず、上記不足をどの段階で満たすかを明示する必要がある。
