# Liar's Bar candidate 59 最小一般化実装設計 v001

日付: 2026-07-27  
状態: **設計提示のみ。未実装・外部通信0回・正式成果物生成0件**  
基準commit: `cfa7811c917892fccd39edf9c85aa6e3af2dde97`  
入力調査:
`presentation-liars-bar-generality-readiness-20260727-v001.md`
（SHA-256 `15c5dfad44220a0a70e3b463e54b4ca65825465d8a8f773f3a85c25986285a3e`）

## 1. 結論

candidate 59をcandidate 13と同じ横型字幕経路へ通すための**新しい実行入口は3つだけ**にする。

1. 元配信、STT、候補、組立確認結果を受ける入口
2. 新素材のB5 token計測を初回だけ行う入口
3. 固定済みB5 requestからB1受入、B4表示計画まで進むjob入力式B6入口

実装時に触るコードと検査は合計9ファイルとする。

- 新規7ファイル
- 既存の限定修正2ファイル
- candidate 59の正式job 5ファイルは、各actionの入力が確定した後の別ゲートで作る。今回も実装ゲートでも仮値は作らない

candidate 13の正式成果物、固定入口の外部動作、出力schema、処理結果を変えない。
ただし、計算を複製せず共有するため、既存実装2ファイルのsource byteとSHAは変わる。
実装fileのbyteまで不変にすると、別素材用に同じ計算を複製するしかなくなるため、
「candidate 13不変」は**既存入口の処理結果と、保存済み正式成果物の不変**として扱う。
将来同じ正式処理を再実行すれば実装来歴のSHA欄は正当に変わるので、
新旧bundle全体のbyte同一までは主張しない。

## 2. 先に判明した重要事項

### 2.1 candidate 59

- 元配信: `qdczJpv8RCc`
- candidate: 59
- 題名: `マリンのADHD的？な片付け事情と無意識の脱衣`
- 外側境界: `5,941,162ms`〜`5,992,736ms`
- 尺: **51.574秒**
- 現行の400ms提示規則で確認対象になる内部の間: **0件**
- 末尾のSTT文字: `と`、20ms
- 元動画とSTT入力は同じmp4実体を指している
- 現行STTの読み取り診断では候補内281文字、発話まとまり2件
  （162文字と119文字）、まとまり間182ms、機械cut 0件、保護候補0件
- 現行の30fps時間対応へ保存境界を通した読み取り診断では、60fps元映像の
  偶数frameを選ぶ論理30fps格子のframe
  `[178235, 179782)`、出力`1,547 frame`、音声`2,475,200 sample`になる
- この実媒体の長さは約51.567秒で、保存開始より約4.667ms後から始まり、
  保存終了より約2.667ms前で終わる

### 2.2 3入口だけでは隠れていた問題

candidate 13用の候補manifestは「確認対象の間が1件以上ある」ことを必須にしている。さらに残存発話の抽出は、各間の前後にある発話を集めて候補内の全文字を復元している。

candidate 59は確認対象の間が0件なので、現行manifestへそのまま入れると発話が0件になる。通すために架空の間を作る案は、正本に存在しないデータの捏造になるため採らない。

そこで、1つ目の入口は候補内の発話まとまりをSTTから明示的に保存する。
既存v001へ新しい入力形式を追加する後方互換分岐は作らない。
候補から文字を選び、現行の残存発話bundleを組み立てる処理を
入力形式に依存しない純粋処理へ切り出し、
既存v001入口と新入口がそれぞれ自分の入力を検査してから同じ純粋処理を呼ぶ。
4つ目の実行入口は作らない。

## 3. ファイル構成

### 3.1 実装・検査で触る9ファイル

| # | path | 種別 | 入力 | 出力 | 役割 |
| ---: | --- | --- | --- | --- | --- |
| 1 | `evals/clip_composition/run_presentation_source_assembly_job_v001.mjs` | 新規・入口1 | 版付きsource job。正式化時は人間結果、後段接続時は正式組立・基礎映像・timelineも受ける | 確認bundle、正式組立、または残存発話bundle。actionごとに別の版付き出力先 | 元配信/STT/候補を束縛し、確認媒体を作り、人間結果を正式化する。後段では明示発話を共有選択処理へ渡す |
| 2 | `evals/clip_composition/test_presentation_source_assembly_job_v001.mjs` | 新規・検査 | 合成source job、合成STT、人間結果、故障fixture | TAP | source identity、0件の間、音響診断、結果束縛、明示発話の全件性、確認媒体と正式組立の一致を検査 |
| 3 | `evals/clip_composition/presentation_retained_source_atom_pipeline_core_v001.mjs` | 新規・内部共用 | 各adapterで検査済みの発話集合、正式segments、文字時刻、来歴参照 | 現行schemaの残存発話3成果物を作る純粋な値とbyte列 | 入力schemaやfile I/Oを持たず、文字選択・区間対応・現行bundle構築を一度実装する。公開実行入口ではない |
| 4 | `evals/clip_composition/presentation_retained_source_atoms_v001.mjs` | 既存・限定修正 | 従来v001 jobと従来v001 manifestだけ | 従来v001残存発話bundle | 従来入力を従来どおり検査し、正規化後だけ共有純粋処理を呼ぶ。新manifestを受理する分岐は作らない |
| 5 | `evals/clip_composition/run_presentation_caption_gate_b5_initial_v001.mjs` | 新規・入口2 | 版付きB5初回job、B3意味入力、API keyは環境のみ | 生成request、計測request/生応答各2件、初回計測manifest | 現行B5 v004のrequest構築を呼び、入力と最大有効回答の`countTokens`を初回だけ各1回行う |
| 6 | `evals/clip_composition/test_presentation_caption_gate_b5_initial_v001.mjs` | 新規・検査 | 合成B3意味入力、合成B5 job、通信fixture | TAP | request byte同一、通信各1回、再試行0、初回manifest、secret 0、候補固着なしを検査 |
| 7 | `evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs` | 既存・限定修正 | 従来candidate 13固定config、または検査済み新config | 生応答、B1結果、合格時だけB4表示計画 | candidate 13固定照合を薄い既存adapterへ残し、送信・B1・B4の同じ本体を新jobからも呼べるようにする |
| 8 | `evals/clip_composition/run_presentation_caption_gate_b6_job_v001.mjs` | 新規・入口3 | 版付きB6 job、B5初回manifest、固定request、B3 package、B4 template | 既存B6本体が作る版付きB6/B1/B4成果物 | 素材対応を通信前に検査して既存B6本体を1回だけ呼ぶ |
| 9 | `evals/clip_composition/test_presentation_caption_gate_b6_job_v001.mjs` | 新規・検査 | 合成B5/B3/B4/jobと通信fixture | TAP | 素材混入防止、request byte同一送信、生応答先行保存、再試行0、不受理時停止、合格時だけB4を検査 |

### 3.2 後で作る正式job 5ファイル

これらは実装物ではなく、その時点の正式入力とSHAを固定するデータである。上流が未完成の今は作らない。

| job | 作成できる時点 |
| --- | --- |
| `evals/clip_composition/outputs/presentation/source-review-preparation-jobs/qdczJpv8RCc-candidate-59-v001.json` | 実装検査が合格し、組立確認媒体の準備を承認するとき |
| `evals/clip_composition/outputs/presentation/source-assembly-formalization-jobs/qdczJpv8RCc-candidate-59-v001.json` | 人間結果を受領し、正式化を別承認するとき |
| `evals/clip_composition/outputs/presentation/source-finalization-jobs/qdczJpv8RCc-candidate-59-v001.json` | 正式組立・基礎映像・timelineが完成し、残存発話生成を別承認するとき |
| `evals/clip_composition/outputs/presentation/caption-gate-b5-initial-jobs/qdczJpv8RCc-candidate-59-v001.json` | candidate 59のB3正式packageが完成した後 |
| `evals/clip_composition/outputs/presentation/caption-gate-b6-jobs/qdczJpv8RCc-candidate-59-v001.json` | B5のrequest・token・manifestが正式確定した後 |

## 4. 入口1: source identity・組立正式化

### 4.1 入力

入口はactionごとに別の不変jobを1件受ける。確認前のjobへ後から人間結果を書き足さない。
候補本文やSTTをコードへ埋め込まない。

- 元配信ID、URL
- 元mp4のpath、SHA-256
- STT manifest、transcript、word timestampsのpath、SHA-256
- candidate ID、題名、外側境界
- 版付き出力先
- 正式化時だけ、人間結果のpath、SHA-256
- 残存発話生成時だけ、正式組立、基礎映像、timelineのpath、SHA-256

STT manifestが宣言するのは入力媒体の`inputPath`だけで、媒体SHAは宣言しない。
入口はSTT manifest自体のSHAをjobと照合し、`inputPath`の実byte SHAを別に再計算して、
jobが束縛した元mp4 SHAと比較する。一致しない場合は確認媒体を作る前に停止する。

### 4.2 action 1: 確認媒体の準備

既存の次の計算を直接呼ぶ。

- 安定したfile読取とSHA照合
- STTの文字時刻と発話まとまりの復元
- 元媒体の映像・音声情報検査
- frame/sample写像
- 1区間の映像生成、音声生成、結合、出力検査
- HTTP Rangeによる確認媒体配信

確認用mp4は、元配信の保存境界`5,941,162ms`〜`5,992,736ms`
（指定尺51.574秒）を、現行の30fps frame/sample正本で**実際に1区間として切り出す**。
長い元配信をseekしただけの模擬表示にはしない。

既存の時間対応で生成される実媒体は`1,547 frame`・`2,475,200 sample`、
約51.567秒になる。UIには「保存境界の指定尺51.574秒」と
「実際に確認する媒体約51.567秒」の両方を表示し、同じ値だと偽らない。

出力:

- `source-identity.json`
- `source-media-binding.json`
- `source-artifact-summary.json`
- `basis-edit-plan.json`
- `candidate-speech-manifest.json`
- `assembly-review.mp4`
- `assembly-review-manifest.json`
- `assembly-review-provenance.json`
- `review.html`
- `audio-end-diagnostic.json`

`candidate-speech-manifest.json`には、外側境界内へ完全に含まれるSTT文字を、元の発話まとまりごとに一度ずつ保存する。間が0件でも全文字を失わない。

schemaはそれぞれ新しい候補非依存の
`presentation-material-source-identity-v001`、
`presentation-material-source-media-binding-v001`、
`presentation-material-source-artifact-summary-v001`、
`presentation-candidate-basis-edit-plan-v001`、
`presentation-candidate-speech-manifest-v001`として分ける。
`presentation-material-source-media-binding-v001`の中では、次の3者を混ぜずに保持する。

- jobが束縛した元媒体path/SHA
- jobが束縛したSTT manifest path/SHAと、manifestが宣言した`inputPath`
- その`inputPath`から実byteを読んで再計算した媒体SHA

元媒体のjob束縛SHAと、STT参照媒体の再計算SHAの同一性検査結果も記録する。
source identityはこのbindingとSTT 3成果物を参照し、artifact summaryは
確認bundle内の正式なpath/SHA対応を列挙する。
candidate 13の旧媒体と新媒体を対応づける既存
`presentation-source-media-equivalence-v001`は意味が違うため、名前も実装も再利用しない。
`basis-edit-plan`は保存済み情報どおり「具体的な内部カット指示なし」を記録し、
存在しない「無音を詰める」指示をcandidate 59へ持ち込まない。

### 4.3 音響終端の扱い

現在のframe/sample計算が証明するのは、保存境界を現行の論理30fps格子へ丸めた
`[178235, 179782)`と、それに対応する`2,475,200 sample`が確認mp4へ
欠落なく入ったことまでである。保存終了`5,992,736ms`そのものまで音声が入った、
または「発話が自然に終わった」とは証明しない。

局所聴取を毎回必須にせず、既存の声VAD基盤を**終端確認の振り分け**にだけ使う。
新しい検出器、学習済みmodel、重み、400msの安全閾値は追加しない。

機械確認は、保存終了の2,000ms前から終了の20ms後までを同じ元媒体からPCM化し、
既存WebRTC VAD 2.0.14のmode 0とmode 3で20ms frameごとに見る。
この2,000msは人間確認位置を探させないための既存表示範囲、
20msは既存VADの測定粒度であり、いずれも「安全な無音長」の判定値にはしない。

`audio-end-diagnostic.json`は次を保存する。

- 診断した元媒体path/SHAと区間
- VAD実装path/SHA、実行環境、mode 0/3のframe判定
- 保存終了をまたぐ声区間の有無
- 保存終了直後の`[5,992,736, 5,992,756)ms` frameが声かどうか
- `clear_for_extra_listen`または`ambiguous`と、その理由

`clear_for_extra_listen`にできるのは、mode 0とmode 3の両方で
「声区間が保存終了をまたがない」かつ「終了直後の1 frameが声ではない」が
一致した場合だけとする。それ以外、両modeの不一致、依存不足、decode失敗、
frame不足はすべて`ambiguous`とする。

これは人間へ提示する境界候補の品質確認であり、VADが自動でcutや正式承認を行うものではない。
現在の環境では`webrtcvad`依存をそのまま利用できないことは確認済みだが、
candidate 59の実音声へ上記確認をまだ実走していない。
したがって局所聴取が実際に発火するかは**未確認**であり、今ここで必須とは決めない。
実装承認に新規依存の導入は含めず、正式準備時にも依存を利用できなければ
`ambiguous`として局所聴取へ安全に戻す。

### 4.4 人間へ見せる媒体

#### 通常の組立確認

- 画面中央: 「保存上は51.574秒の区間」と明記したうえで、保存境界を現行格子で実際に切り出した
  `1,547 frame`・約51.567秒のmp4 1本
- 必須操作: 全編を1回再生し、`この切り分けでよい`または`追加編集が必要`を1回選ぶ
- 時刻入力、文字位置選択、場所探索、複数動画比較はなし
- 回答後に結果をコピーできる

#### 音響終端が曖昧な場合だけ出す局所確認

- `元配信を終端2秒前から確認`と`組立後を末尾2秒前から確認`の2ボタンを出す
- 元配信側は予定終端を越えてそのまま聞けるようにする
- 組立後側は、人間が正式採用する実媒体の末尾をそのまま聞かせる
- 予定終端を画面上で明示するが、そこで音を止めない
- 人間は`語尾を切っていない`または`境界修正が必要`を1回選ぶ
- `境界修正が必要`の場合も、人間に正確な時刻を入力させない。正式化せず停止し、次の機械提案へ戻す

この局所確認は1判断で、元配信側と組立後側を最大2再生する。
`audio-end-diagnostic.json`が`clear_for_extra_listen`なら表示しない。
`ambiguous`の場合だけ表示し、実際の音を聞く前に「問題なし」とは記録しない。

### 4.5 action 2: 人間結果の正式化

`この切り分けでよい`かつ、必要な局所確認が`語尾を切っていない`の場合だけ正式化する。

既存の補集合計算へ`cuts: []`を渡し、採用区間を外側境界の1区間として復元する。正式組立のsegmentsは、人間が見た確認mp4のframe/sample写像と完全一致させる。

出力:

- `assembly-decision.json`
- `formalization-receipt.json`
- `viewed-media-mapping-receipt.json`

`追加編集が必要`、局所確認未回答、媒体SHA不一致のいずれかなら`unresolvedEdits: []`を偽装せず停止する。

### 4.6 action 3: 残存発話への接続

基礎映像とtimelineが既存jobで完成した後、同じ入口を`finalize-source` actionで使う。

`candidate-speech-manifest.json`は新入口自身が厳密検査して、検査済みの発話集合へ正規化する。
その集合を新しい内部共用の純粋処理へ渡す。純粋処理は文字選択だけでなく、
現行の`source-atoms.json`、`generation-manifest.json`、
`validation-report.json`の組み立てまでを一度だけ担当する。
既存v001入口は従来manifestだけを
従来どおり検査し、同じ形へ正規化した後に同じ純粋処理を呼ぶ。
既存v001が新manifestを受ける分岐や暗黙変換は作らない。
出力する残存発話のschemaと意味は現行のままにし、Gate A以後の入口は増やさない。
内部共用fileへ移すのは既存v001にある計算だけで、選択規則、並び順、
hash、直列化、検査結果の意味を新設・変更しない。

新adapterから内部共用処理への役割対応は次で固定する。role名は現行bundleの来歴欄を
維持するための内部名であり、各fileのschemaは新adapterが先に検査する。

| 内部role | 新経路の正本 |
| --- | --- |
| `sourceIdentity` | `source-identity.json` |
| `candidateManifest` | `candidate-speech-manifest.json` |
| `assemblyDecision` | `assembly-decision.json` |
| `formalizationReceipt` | `formalization-receipt.json` |
| `timeline` | 既存v002 timeline |
| `baseMediaGenerationManifest` / `baseMediaValidationReport` / `baseMedia` | 既存基礎映像bundle |
| `sttManifest` / `transcript` / `wordTimestamps` | source identityが束縛したSTT 3成果物 |
| `mediaEquivalence` | `source-media-binding.json`。旧schemaは使わない |
| `trustedArtifactSummary` | `source-artifact-summary.json` |
| `basisEditPlan` | `basis-edit-plan.json` |

このactionが必要なのは、間0件のcandidate 59を既存の「間の前後発話」だけでは表現できないためである。架空のgapや空の発話を作る処理は検査で拒否する。

## 5. 入口2: B5初回token計測

### 5.1 再利用する正本

現行B5 v004が公開しているrequest構築処理を唯一の正本にする。この処理は次を既に一意に作れる。

- Gemini生成request
- 入力token計測request
- 全候補を使った最大有効回答
- 最大有効回答token計測request

新入口はprompt、意味入力、最大回答、回答schemaを作り直さない。通信順序、生応答保存、停止だけを担当する。

### 5.2 job入力

- B3の`semantic-source-input.json` path/SHA
- 上流の読み取り専用投影 path/SHA
- 文字数、発話まとまり数、行末候補数の正式実測値
- B5 v004 request構築処理 path/SHA
- 出力directory
- 実行日に公式照合したmodel ID、入力/出力上限、Standard単価、照合日

仕事本文、行幅36、本文、境界候補はB3意味入力を正本とし、jobへ複製しない。

### 5.3 正式実行時の出力

1. `generate-content-request.json`
2. `input-token-count-request.json`
3. `input-token-count-response.raw.json`
4. `maximum-response-token-count-request.json`
5. `maximum-response-token-count-response.raw.json`
6. `b5-initial-manifest.json`

正式通信は別承認とする。承認された場合も入力用・最大回答用を各1回、timeout 600秒、自動再試行0回、Gemini生成0回とする。API keyは環境だけから読み、生keyを保存しない。

現行v004の正式実行はcandidate 13の「以前に計測済み」という来歴を要求するため、新素材の初回計測入口としては呼ばない。使うのはv004の公開request構築処理だけである。

`b5-initial-manifest.json`は新しい
`presentation-caption-gate-b5-initial-manifest-v001`とする。
既存`presentation-caption-gate-b5-manifest-v002`を意味変更して再利用しない。
最低限、次の欄を正本として固定する。

| 欄 | 内容 |
| --- | --- |
| `sourceBinding` | B3意味入力のpath/SHA、文字数、発話まとまり数、行末候補数 |
| `requestBindings` | 生成request、入力token計測request、最大回答token計測requestのpath/SHA/byte数 |
| `officialVerification` | 実行日、model ID、上限、Standard単価、公式参照 |
| `transport` | `countTokensCalls: 2`、`generateContentCalls: 0`、timeout 600秒、再試行0 |
| `tokenDiagnosis` | 入力tokenと最大有効回答token。両方を`measured-in-this-attempt`、各1回と記録 |
| `cost` | 公式単価による上限・計測通信の観測。実課金が応答から不明なら不明と記録 |
| `checks` | request同一性、上流不変、secret 0、通信回数、上限内、成果物集合の10要件 |
| `nextStage` | B6を自動開始していないこと |

B6 jobが読むのは、このmanifestの`sourceBinding`、生成requestのbinding、
`officialVerification`、`tokenDiagnosis`だけとする。
候補本文や仕事本文をmanifestへ複製しない。

## 6. 入口3: job入力式B6

### 6.1 現在の状態

現行B6の送信、raw保存、B1 job構築、B4 job構築、B1からB4への継続は既にconfig駆動である。candidate 13固有なのは、request SHA、attempt ID、path、package rootを定数と比較する部分と、正式preflightの固定値である。

### 6.2 限定修正

現行B6本体から候補固有の照合だけをconfig検査へ移す。

- candidate 13の固定入口は、従来の固定configを同じ本体へ渡す薄い入口として残す
- 新job入口は、版付きjobからconfigを作って同じ本体へ渡す
- B1受入、B4変換、監視値計算、費用計算を複製しない

### 6.3 job入力

- attempt ID、run directory ID
- B5 manifest path/SHA
- B5固定request path/SHA
- B3 package root、manifest/report path/SHA
- B4 static template path/SHA
- B1/B4の版付き出力先

model、単価、使用上限はB5 manifestを正本とし、B6 jobへ重複記載しない。
新job入口が受理するB5 schemaは
`presentation-caption-gate-b5-initial-manifest-v001`だけとする。
candidate 13固定入口は従来のmanifestと固定configだけを使い、
一方を他方へ変換する互換処理は作らない。

通信前に次を検査する。

- requestの実byte SHAがB5 manifestと一致
- B5 manifestの`sourceBinding`、`requestBindings`、`officialVerification`、
  `tokenDiagnosis`がstrict schemaに適合
- B5が参照するB3意味入力と、B4 templateが参照するB3 packageが同一素材
- 出力先が未使用
- 実装と読み取り専用投影のSHAがjobと一致

### 6.4 正式実行時

1. 固定requestをbyte同一で1回送る
2. timeout 600秒、自動再試行0回
3. HTTP生応答を解析前に版付き保存
4. model表記、usage、実費を事実として記録
5. 生回答を修復、trim、fence除去せずB1へ渡す
6. B1不受理、`abstained`、無効回答なら保存して停止
7. B1合格時だけ既存B4を呼ぶ
8. 表示計画で停止し、描画へ自動進行しない

## 7. 全体の実行順

| 段階 | 実行 | 人間 | この設計で新しいもの |
| ---: | --- | ---: | --- |
| 1 | source jobの正式固定 | 0 | 入口1 |
| 2 | 保存境界51.574秒から約51.567秒の実確認媒体生成 | 0 | 入口1 |
| 3 | 組立確認 | 1 | 既存UXを簡略化 |
| 4 | 終端局所確認 | 0〜1判断。発火時は最大2再生 | 音響診断が`ambiguous`の場合だけ、入口1の同じ確認画面 |
| 5 | 正式組立決定 | 0 | 入口1 |
| 6 | 基礎映像＋timeline | 0 | 既存job |
| 7 | 残存発話 | 0 | 入口1の内部共用action |
| 8 | Gate A | 0 | 既存job |
| 9 | B3 package | 0 | 既存job |
| 10 | 初回token計測 | 0 | 入口2。通信は別承認 |
| 11 | B6→B1→B4 | 0 | 入口3。通信は別承認 |
| 12 | v003描画＋QC | 0 | 既存job |
| 13 | 完成字幕の目視 | 1 | 既存の人間最終判定 |

どの段階も、前段が正式合格する前に次へ進まない。実装承認だけで通信、正式生成、描画へ自動進行しない。

## 8. 検査と停止条件

### 8.1 入口1

実装ゲートの合成検査:

- source/STT/candidate値がコードにない
- 0件の間を持つ合成入力を正式に受理
- 明示発話から共有純粋処理へ渡した文字が欠落0、重複0、順序変更0
- mode 0/3とも終了直後が非音声なら局所確認不要
- 境界をまたぐ声、mode不一致、依存不足、decode失敗は`ambiguous`
- 確認mp4と正式segmentsのframe/sample完全一致
- 架空gap、空発話、時刻手入力を拒否
- candidate 13の従来v001入力だけを受ける回帰と、残存発話既存検査が継続合格

正式jobを固定した後のcandidate 59読み取り専用preflight:

- sourceとSTT入力実体のSHA一致
- 保存境界`5,941,162–5,992,736ms`が論理30fps格子
  `[178235, 179782)`、`1,547 frame`、`2,475,200 sample`へ写像される
- 読み取り診断値281文字・2発話まとまりと正式job入力が一致
- candidate内のSTT文字が明示発話へ欠落0、重複0、順序変更0
- 出力先が未使用で、確認媒体生成はまだ行っていない

このpreflight値は版付きjobの期待値であり、runner・共有処理・合成fixtureへ焼き込まない。
正式jobの作成とpreflight実行は、今回求める実装承認の外に置く。

### 8.2 入口2

- 3種類のrequest byteがB5 v004の公開構築結果と完全一致
- 初回manifestが`countTokens`を本attemptで2回行った事実を記録し、
  既存v004の「最大回答計測を過去から再利用」というschemaを受理しない
- `serviceTier`を送らない
- `thinkingLevel: medium`、2行schemaを維持
- 通信は最大2回、各request 1回、再試行0
- raw responseを解析前に保存
- tokenは非負の安全な整数
- 生key出現0件
- candidate 13のB5 v004既存検査を継続合格し、保存済み正式成果物へ書き込まない

### 8.3 入口3

- jobのstrict schemaと未知field拒否
- B5/B3/B4の素材対応不一致は通信前停止
- request byte同一、送信1回、再試行0
- raw応答先行保存
- B1不受理時はB4を呼ばない
- B1合格時だけB4を呼び、表示計画で停止
- candidate 13固定入口の既存検査9件を継続合格
- candidate 13の保存済み正式output treeは、非再生成のまま前後SHA不変

### 8.4 共通停止

- 9ファイルを超えるコード変更が必要
- 4つ目の実行入口が必要
- 既存の正本計算を複製する必要が出た
- candidate 13既存入口の処理結果projectionが変わった
- candidate 59固有値をrunnerへ焼き込む必要が出た
- 新しい音響安全閾値を決める必要が出た
- 実装前提と実測が食い違った

いずれか1件で、その場のpatchや仮値へ進まず停止する。

## 9. 人間作業量

### 基本

| 人間作業 | 件数 | 視聴量 |
| --- | ---: | ---: |
| 組立確認 | 1 | 実媒体約51.567秒を1回 |
| 完成字幕の目視 | 1 | 完成尺を1回。現行写像のままなら約51.567秒 |

基本の動画再生量は合計約103.133秒である。操作込みの壁時計は未計測なので、
所要時間の実測とは扱わない。
前段レポートの103.148秒は保存ms範囲51.574秒を2回足した値だった。
本設計では、人間が確認した実体と後の正式組立を一致させるため、
新たに判明した論理30fps格子の実媒体約51.567秒を2回足す値へ15ms訂正する。
保存範囲の意味や外側境界を変更したのではない。

### 条件付き

音響終端が`ambiguous`の場合に限り、局所確認を1件追加する。
これは1判断だが、同じ確認項目の中で元配信側と組立後側を各1回、最大2再生する。
どちらも終端2秒前へ直接移動するため、場所探索と時刻入力はない。
局所再生の終了は人間が聞き終えた時点とし、独自の秒数上限は置かない。

したがって人間作業は、基本が「保存上51.574秒の区間の組立確認1回」と
「完成字幕の目視1回」の2判断である。局所聴取は0〜1判断で、
実際に発火するかは正式準備時の音響診断で決まる。

## 10. 行幅とプリセット

今回も次を固定して使う。

- 行幅上限: 36
- 1まとまり: 最大2行
- プリセット: `normal-landscape-readable-pop-v001`
- 形式: 1920×1080横型

これで確認できるのは、**別の元配信でも同じ横型設定を通せるか**だけである。

完了報告には必ず次を残す。

> 行幅36と`normal-landscape-readable-pop-v001`を固定した横型経路の一般性だけを確認した。行幅、プリセット、画面形式を入力で自由に差し替えられることは未実証である。

## 11. candidate 13の保護

変更しないもの:

- candidate 13のsource identity、組立決定、基礎映像、残存発話
- B3、B5、B6、B4、表示計画、描画mp4
- 既存のcandidate 13固定CLIの引数なし動作
- 既存成果物のpath、byte、SHA

変更する実装file:

- 残存発話計算: 従来v001入力adapterの後ろに、候補非依存の共有純粋計算を置く。
  新manifestをv001へ受け入れる分岐は追加しない
- B6: candidate固定照合を共通本体の外側へ移す

両方ともcandidate 13既存経路の合成回帰を先に通す。本文、時刻、選択、停止点などの
処理結果projectionが変われば、一般化成功ではなく回帰として停止する。
既存正式成果物は再実行せず、作業前後のtree SHA不変を確認する。

実装fileのSHAを来歴へ含むため、将来candidate 13を新attemptとして再実行したbundleは
来歴欄だけが変わり得る。そこまで含めたbyte同一を要求すると正しい来歴記録と矛盾するため、
この設計の不変条件にはしない。

## 12. 事実・設計判断・未確認

### 事実

- candidate 59は51.574秒、400ms以上の提示対象0件、末尾STT文字20ms
- 現行30fps写像では約51.567秒、保存終了より約2.667ms前で終わる
- 現行候補manifestはreview item 1件以上を必須にする
- 現行残存発話処理はreview itemの前後発話から候補全文字を復元する
- B5 v004にはrequestと最大有効回答を作る公開済み正本計算がある
- B5 v004の既存manifestは、最大有効回答tokenを過去attemptから再利用した来歴であり、
  新素材の初回2通信を同じ意味では表せない
- B6の送信、B1、B4の本体は既にconfig駆動である
- `webrtcvad`は現在の実行環境で利用できない

### 設計判断

- 架空のgapを作らず、候補内発話を明示保存する
- 実行入口は3つのまま、既存v001と新入口のadapterを分け、
  残存発話の純粋計算だけ内部共用化する
- 音響終端を新しい閾値で自動合格にせず、曖昧なら人間へ局所確認を1件だけ戻す
- B5初回計測には新しいmanifest schemaを使い、再利用来歴の既存schemaを意味変更しない
- candidate 13不変は、既存入口の処理結果projectionと保存済み正式成果物のbyte不変として検査する

### 未確認

- candidate 59の実音声で語尾が境界を越えて続くか
- VAD mode 0/3による終端確認が`clear_for_extra_listen`か`ambiguous`か
- 正式組立後のframe/sample総数
- 正式成果物として確定する残存文字数、発話まとまり数、行末候補数
- B3の各SHA
- B5の入力token、最大有効回答token、費用
- Gemini回答がB1を通るか
- B4表示計画、描画、QCが一度で成立するか

未確認値は正式な前段成果物ができた時点で測ってjobへ固定する。今は推測値を置かない。

## 13. この設計の承認範囲案

承認を求める次段は、上記9コードfileの実装と合成検査・candidate 13回帰までに限定する。

含めないもの:

- candidate 59の正式job作成
- 確認媒体の正式生成
- 人間確認
- 基礎映像、残存発話、B3の正式生成
- `countTokens`
- Gemini生成
- B4正式表示計画
- 描画

実装と検査の完了報告後、candidate 59の組立確認開始を別途判断する。
