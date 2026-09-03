# ZEV 候補動画理解 設計資料

**v0.1 — 候補発見後の実映像・音声理解を共通化するための比較実験設計**

**確定日:** 2026-09-03

## 1. 目的

この工程の目的はGeminiを追加することではない。

> 候補発見後の実動画理解を共通化し、既存ZEVで分散している区間化の内容判断と映像適性の一次確認を減らせるか、実測できる状態にする。

候補発見方式は一つに固定しない。通常候補、コメント起点候補、遠方接続候補、将来のカタルシス候補、その他の候補を、同じ後段へ渡せる構造を目標とする。

長尺配信全体をGeminiへ渡して候補地点を網羅探索させる使い方は主線にしない。3時間18分の動画を使ったAgentic動画理解実験は、Agentic処理が動作し非常に短い候補を返せる一方、長尺全域の探索範囲を証明できないことを確認した観測履歴として保持する。

## 2. 正式な責務分離

処理の流れは次とする。

```text
複数の候補発見方式
  ↓
意味上の候補・根拠となる発話ID
  ↓
ZEVの決定的処理
  粗い候補動画
  元動画への時刻写像
  正式発話との束縛
  ↓
Gemini候補動画理解
  実映像・音声・発話から内容を観測
  ↓
ZEVの決定的検査
  候補内時刻の検査
  元動画時刻への投影
  正式発話との包含・重なり記録
  SHA束縛
  ↓
人間による区間・採否確認
  ↓
既存の正式工程
  字幕意味入力
  base-media
  frame mapping
  presentation instruction
  renderer admission
  renderer
  技術QC
  ↓
最終人間確認
```

Geminiが観測するのは次である。

- 映像上で実際に起きている主要な出来事。
- 主要な出来事の核となる候補内時間範囲。
- 原因またはきっかけとして必要な映像。
- 理解に必要な最小限の導入。
- 配信者または登場人物の反応。
- 反応が収束する自然な終端。
- 外しても出来事や反応を損なわない前後。
- 静止画、文章読み、メニュー操作、画面上で確認できない出来事、弱い反応、音声依存などの映像上の注意。
- 候補動画だけでは原因、前提、結果または反応を確認できないという判断材料不足。

Geminiは次を所有しない。

- 配信全体からの候補発見。
- 最終的な「良い動画」の定義、点数、順位、合否、最終採否。
- 遠方接続の意味関係やカタルシスの線の探索。
- 元動画や候補動画のSHAの正当性。
- 正式発話IDの確定。
- Gemini回答時刻の正式動画境界への昇格。
- frame mapping、字幕全量閉包、renderer入場判定、renderer、技術QC。

## 3. 現行後段との対応

repository現物では、候補発見後から完成確認までに次の責務がある。

| 工程 | 入力 | 判断または処理 | 所有者 | 実映像を見るか |
| --- | --- | --- | --- | --- |
| 意味上の発話ID選択 | 文字起こし、意味候補 | 候補の根拠となる発話を選ぶ | AI探索または人間 | 主に文字起こし |
| 発話IDから時刻への変換 | 正式発話ID、正式発話表 | 発話開始・終了を決定的に解決する | 決定的処理 | 見ない |
| 区間化の内容判断 | 意味候補、発話時刻、候補映像 | 原因、導入、反応、自然な終端を追加する | 現在は人間観測を入力した計画 | 見る |
| base-media生成 | 人間承認済み区間、元動画 | 区間を連結した基礎媒体を作る | 決定的処理 | 内容判断はしない |
| frame mapping | 元動画、基礎媒体、フレーム・音声時刻 | 出力と元動画の対応を固定する | 決定的処理 | 内容判断はしない |
| 字幕用意味入力 | 人間承認済み選択、正式発話 | 字幕判断に使う意味情報を閉じる | 決定的処理 | 見ない |
| cue / line-end selection | 字幕意味入力 | 字幕単位と行末候補を選ぶ | Geminiの文字判断と決定的検査 | 動画は見ない |
| presentation instruction | 承認済み意味・配置情報 | 描画命令へ変換する | 決定的処理 | 内容判断はしない |
| renderer admission | 全束縛と閉包 | rendererへ入れてよいか検査する | 決定的処理 | 内容判断はしない |
| renderer | 入場済み命令、基礎媒体 | 完成候補を描画する | 決定的処理 | 内容判断はしない |
| 技術QC | 描画結果、期待する媒体条件 | 尺、映像、音声、フレーム対応などを検査する | 決定的処理 | 技術的に検査する |
| 人間確認動画 | 候補区間または描画結果 | 人間が見られる媒体を作る | 決定的処理 | 作成処理は判断しない |
| 映像適性評価 | 確認動画 | 映像として成立するかを判断する | 人間 | 見る |
| 遠方接続の品質評価 | 前半・後半確認動画 | 接続、回収、映像、区間、採否を判断する | 人間 | 見る |
| 通常切り抜きの演出作成 | 固定済み動画断片、発話、文字起こし | 画面種類、表示対象、テロップを作る | Geminiと決定的処理 | Geminiが見る |

Gemini候補動画理解で統合を検討するのは、区間化のうち映像内容を読む部分と、人間より前に行う映像適性の一次観測である。時刻変換、媒体束縛、正式字幕、描画、技術QC、最終人間判断は残す。

## 4. 比較対象5本の読み取り専用検査

2026-09-03に既存byteを変更せず、ファイル実在、SHA-256、ffprobeによる尺とstream、生成結果に保存された元動画区間、正式候補、人間評価を照合した。5本の元動画は全て `ymUsGrT6EaA` で、元動画SHA-256は `79e9cf231000c18448d52541449f65ceecd6068ae800e18736c2a0c358c90537` で一致した。

| 候補 | 動画SHA-256 | 実測尺 | 映像 / 音声 | 元動画区間（順に連結） | 人間評価正本 |
| --- | --- | ---: | --- | --- | --- |
| `camera-fear-escalation` | `4a878fee763a148ad2f0169decb34aee6b450921ea7a65eeeba4d3f5c5c609ee` | 55.700秒 | H.264 1920×1080 30fps / AAC 44.1kHz stereo | 664354–671316ms、1377918–1426649ms | `human-review-result-v002.json` / `fac03dc688f28e64831a7b8241cec560313cf7da3aacc585b30bf8efab270a92` |
| `medicine-effect-payoff` | `455839bab76056af72e5ce57ca67672a475517c8fac6664d9520b9f11094ff32` | 29.000秒 | H.264 1920×1080 30fps / AAC 44.1kHz stereo | 1680130–1686233ms、4389098–4412003ms | 同上 |
| `candidate-doctor-disappearance-to-ogre-mother` | `8b29f9bbe6025e31c909a080ebad5578c9ec0f363b8522bd678131d8d480cb3a` | 35.733秒 | H.264 1920×1080 30fps / AAC 44.1kHz stereo | 1724755–1739800ms、5693397–5714097ms | `human-quality-review-result-v001.json` / `1087dcab775f89d6d344cf061063a33f614c94af6fb7305f4f39a48e7402dffd` |
| `candidate-horror-claim-to-speed-up` | `f86ca4550ad198a5153564c8ba7dd3368084105e3686ebd3ab8de5686e5a27b7` | 25.333秒 | H.264 1920×1080 30fps / AAC 44.1kHz stereo | 246000–255324ms、1980000–1996000ms | 同上 |
| `candidate-horror-game-to-screams-001` | `d2f6d8c3eceae5178703a01f3b8947ef3571219ab7d329af37c8a5569d875af0` | 13.183秒 | H.264 1920×1080 60fps / AAC 44.1kHz stereo | 249378–255324ms、6134433–6141636ms | `candidate-human-review-result-v001.json` / `24ec180fcba4d88cc17afd20a2fcb189da104c99e80e1388595e2a5ae0d4780e` |

5本の純再生時間は合計158.950秒、最長は55.700秒である。全て内容観測、反応観測、映像上の注意、判断材料不足の比較入力として使える。

元動画正本pathは `evals/clip_composition/outputs/work-distant-connection-real-input-preparation-ymUsGrT6EaA-v001/source/ymUsGrT6EaA.mp4` である。候補動画pathは次である。

- `camera-fear-escalation`: `evals/clip_composition/outputs/presentation/distant-connection-video-intervalization-improvement-ymUsGrT6EaA-v001/candidates/camera-fear-escalation/render/presentation-rendered-v002.mp4`
- `medicine-effect-payoff`: `evals/clip_composition/outputs/presentation/distant-connection-video-intervalization-improvement-ymUsGrT6EaA-v001/candidates/medicine-effect-payoff/render/presentation-rendered-v002.mp4`
- `candidate-doctor-disappearance-to-ogre-mother`: `evals/clip_composition/outputs/presentation/distant-connection-video-prototype-concrete-payoff-ymUsGrT6EaA-v001/candidates/candidate-doctor-disappearance-to-ogre-mother/render/presentation-rendered-v002.mp4`
- `candidate-horror-claim-to-speed-up`: `evals/clip_composition/outputs/presentation/distant-connection-video-prototype-concrete-payoff-ymUsGrT6EaA-v001/candidates/candidate-horror-claim-to-speed-up/render/presentation-rendered-v002.mp4`
- `candidate-horror-game-to-screams-001`: `evals/clip_composition/outputs/work-distant-connection-candidate-review-v001/candidate-horror-game-to-screams-001/candidate-review-v001.mp4`

人間評価正本pathは次である。

- `camera-fear-escalation` と `medicine-effect-payoff`: `evals/clip_composition/outputs/work-distant-connection-human-review-result-ymUsGrT6EaA-v002/human-review-result-v002.json`
- `candidate-doctor-disappearance-to-ogre-mother` と `candidate-horror-claim-to-speed-up`: `evals/clip_composition/outputs/work-distant-connection-human-quality-review-result-ymUsGrT6EaA-v001/human-quality-review-result-v001.json`
- `candidate-horror-game-to-screams-001`: `evals/clip_composition/outputs/work-distant-connection-candidate-review-v001/candidate-horror-game-to-screams-001/candidate-human-review-result-v001.json`

正式候補との束縛は次で確認した。

- `camera-fear-escalation` と `medicine-effect-payoff`: 正式候補SHA `8c8f1aa5bf69eb38076ce9ccdffab2f94cb2e8c2348695da2f3b45b9ad3b114d`。
- `candidate-doctor-disappearance-to-ogre-mother` と `candidate-horror-claim-to-speed-up`: 正式候補SHA `4239b6b51d3dd3dd548a9083ac0434860182d497321a89cf07c8f53eb66586b8`。
- `candidate-horror-game-to-screams-001`: 正式候補SHA `cd21549ffa65b749e76c44710ccc6a92bdcf3ca99d07df4e281f5becf3277216`。

### 4.1 盲検としての制約

5本が物理的に有効であることと、全ての測定が完全な盲検になることは同じではない。

最初の4本は、人間観測に基づいて改善または選択された区間を既に連結した動画である。人間評価JSONや採否理由をGeminiへ送らなくても、動画の両端には人間が選んだ境界が暗黙に入っている。この4本でGeminiが動画端と同じ境界を返しても、「広い粗抽出から正しい境界を発見できた」という独立証拠にはならない。

したがって、5本は次のように使い分ける。

- 5本全て: 出来事、原因、反応、自然な終端候補、映像上の注意、判断材料不足を観測できるかの比較に使う。
- 最初の4本: 人間区間との開始差・終了差を記録するが、境界発見能力の合否には使わない。
- 5本目: 正式候補発話から作られた不採用確認動画として、意味採否へ越境せず映像上の事実だけを返せるかを見る。
- 粗い範囲からの境界発見能力を検証するには、人間の正解境界から導かない規則で候補範囲を作り、その元動画時刻写像を束縛した別入力が必要である。今回、新しい動画は生成しない。

Geminiへ送るrequestには、人間評価正本、人間の採否、理由、分類、正解区間、説明的なcandidate ID、説明的なファイル名を含めない。候補動画理解jobも人間評価を束縛しない。provider requestは無意味な実験内番号、動画byte、観測指示、出力schemaだけで構成する。人間評価はGemini resultの保存後に、別の比較manifestを入力とする比較器だけが読む。

今回はAPI実行前の設計段階であり、providerへ送るexact requestはまだ存在しない。そのため「実requestに人間評価が混入していない」という検査は未実施である。契約実装後、exact request byteを固定してallowlist検査を通すことを実行前の必須停止条件とする。

## 5. API方式の推奨

2026-09-03時点のGoogle公式仕様では、静的処理は固定1 FPSで動画全体を一度にcontextへ置き、5分未満の短いclipやclip全体の精度が必要な場合に適する。Agentic処理は長尺動画または特定時点を探す問いに適し、必要箇所だけを動的に読む。

今回の入力は13〜56秒で、目的は入力全体から役割区間を観測することである。そのため初回は次を推奨する。

| 項目 | 初回案 | 理由 |
| --- | --- | --- |
| モデル | `gemini-3.8-flash` | 2026-09-02公開の安定版で、動画、structured output、low / medium / high thinkingを正式対応する |
| 動画処理 | `static` | 全て5分未満で、clip全体の観測が目的である |
| frame sampling | 既定1 FPS | 初回の標準条件を固定する。速い動きを落とし得る制約は結果へ明記する |
| media resolution | `high` | 文字中心か、画面上の細部があるかも観測対象であり、公式仕様上高解像度は細字・小さい対象の認識を改善する |
| thinking | `medium` | 最新Flashの既定で、複数の役割区間を一度に整理する初回品質を優先する |
| 応答 | JSON Schemaによるstructured output | 余分fieldや型違反をprovider側とローカル側の両方で防ぐ |
| 推論回数 | 1動画1回、計5回 | 候補間の混入を避け、1件の失敗を他4件から分離する |
| 自動再試行 | 0回 | 初回応答と失敗証拠をそのまま保存する |
| repair呼び出し | 0回 | 異常応答を別の有料呼び出しで補正しない |

静的処理の既定1 FPSは、速い動きや短い画面変化を落とす可能性がある。`candidate-horror-claim-to-speed-up` で出来事を拾えなかった場合も、直ちに映像上の出来事が存在しないとは判定しない。1 FPSという観測条件の限界と、人間正本との差をそのまま記録する。FPSを変えた再実験は別の承認対象とする。

5本のうち1本は34,338,974 bytesで、base64化すると45,785,300 bytesとなり、公式がinlineに示すrequest全体20MB未満を超える。他4本もrequest全体の実測が必要である。初回実装は媒体の渡し方をjobの責務から分離し、実行時は次のいずれかを正式に選ぶ。

- 5本ともFiles APIへ個別uploadし、同じ渡し方に統一する。
- request全体20MB未満をexact byteで事前確認できた4本だけinline、34MBの1本だけFiles APIとする。

比較品質には媒体byteと処理設定を束縛し、upload時の表示名は説明を含まない番号にする。推論回数は5回である。Files APIを使う場合は、これとは別にuploadと処理状態確認の通信が発生するため、実行承認では「5推論」と「付随するfile通信」を分けて明記する。

公式根拠:

- [Google: Video understanding](https://ai.google.dev/gemini-api/docs/video-understanding)
- [Google: Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)
- [Google: Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- [Google: Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Google: Gemini thinking](https://ai.google.dev/gemini-api/docs/thinking)

## 6. Tokenと費用の事前見込み

5本の実測尺合計は158.950秒である。Google公式の静的動画処理の概算は、低解像度で約100 tokens/秒、高解像度で約300 tokens/秒である。初回案の高解像度では動画部分が約47,685 input tokens、2026-12-31までの `gemini-3.8-flash` Standard入力単価US$0.75 / 100万tokensでは約US$0.035764である。

structured outputの可視回答を1件4,096 tokensまでとする案では、5件の可視回答上限は20,480 tokensであり、出力単価US$3.75 / 100万tokensではUS$0.076800となる。動画入力と可視回答上限の合計は約US$0.112564である。

これは総額上限ではない。次はまだ含まれない。

- prompt、JSON Schema、metadataの入力tokens。
- `medium` thinkingが実際に使うtokens。
- 価格変更、課金tier、provider側集計差。

Google公式仕様ではthinking levelは相対的な深さであり、厳密なtoken保証ではない。したがって、この段階で「5件総額は必ず約11.3セント」とは言えない。正確な事前手順は、exact requestを固定し、送信前token countを保存し、kawafmmが別途決める合計費用上限と残余リスク承認に照らしてから送ることである。実行後はprovider usageから推定費用を記録し、実請求額とは表現しない。

4,096 tokens、`medium`、高解像度はまだ提案値であり、kawafmmの承認前に実行設定へ確定しない。

## 7. Provider structured output案

providerへ要求するJSONは観測だけを持ち、candidate ID、source時刻、人間評価、点数、合否を持たせない。

```json
{
  "schemaVersion": "candidate-video-understanding-provider-output-v001",
  "summary": "映像と音声で実際に確認できた内容の短い説明",
  "roleIntervals": [
    {
      "observationId": "observation-001",
      "role": "core-event",
      "startTimeMs": 1000,
      "endTimeMs": 4200,
      "factualDescription": "画面と音声で確認できた事実",
      "evidenceModalities": ["video", "audio", "speech"]
    }
  ],
  "removableIntervals": [
    {
      "startTimeMs": 0,
      "endTimeMs": 1000,
      "factualDescription": "外しても観測された出来事・反応を損なわない理由"
    }
  ],
  "visualNotes": [
    {
      "kind": "text-reading-centered",
      "startTimeMs": 5000,
      "endTimeMs": 9000,
      "factualDescription": "映像上で確認できた注意"
    }
  ],
  "insufficientEvidence": {
    "present": true,
    "missingRoles": ["cause", "premise"],
    "factualDescription": "候補動画だけでは確認できない材料"
  }
}
```

役割は `core-event`、`cause`、`minimal-introduction`、`reaction`、`natural-ending` に限定する。判断材料不足の対象は `cause`、`premise`、`result`、`reaction`、`visual-event` に限定する。映像上の注意は `static-image-centered`、`text-reading-centered`、`menu-operation-centered`、`on-screen-event-not-confirmed`、`weak-reaction`、`audio-dependent` に限定する。証拠媒体は `video`、`audio`、`speech` に限定する。

同じ時間範囲に出来事と反応が重なることはあり得るため、異なる役割間の重なりは違反にしない。完全重複した同一内容、動画尺外、`endTimeMs <= startTimeMs`、未知enum、余分field、重複IDは拒否する。異常値を丸めたり、近い値へ補正したりしない。

## 8. 共通job / result契約案

名称は候補発見方式に依存しない次の形とする。

- `candidate-video-understanding-job-v001`
- `candidate-video-understanding-result-v001`

### 8.1 jobが所有するもの

- job IDと一意な実験内item番号。
- 候補の正本path、schema、SHA。ただし内容はproviderへ送らない。
- 元動画ID、元動画path、SHA。
- 候補動画path、SHA、MIME、実測尺、映像stream、音声stream。
- 候補動画の連結区間ごとの候補内時間と元動画時間の写像。
- 正式発話正本path、schema、SHA。
- prompt byteとSHA、response JSON Schema byteとSHA。
- model、endpoint、static処理、frame sampling、media resolution、thinking、可視回答上限。
- inlineまたはFiles APIという媒体transport。providerへ見せる表示名は無意味な番号とする。
- 1 job 1推論、自動再試行0、repair 0という実行設定。
- 送信前token計測、価格snapshot、kawafmmの費用・回数承認への束縛。
- 人間評価をprovider入力に含めないことを示すprovider input allowlistとexact request SHA。

### 8.2 resultが所有するもの

- result IDとjob path/schema/SHA。
- attempt ID、実行時刻、HTTP status、completion status、実際のmodel。
- exact requestとraw responseのpath/SHA。
- structured outputの厳密検査結果。
- 候補内時刻の役割区間、外せる区間、映像上の注意、判断材料不足。
- 各候補内区間を写像した一つ以上の元動画区間。
- 各元動画区間と正式発話の包含・重なり結果。無発話の原因映像では空の重なりを正当な観測として保持する。
- provider usage、価格snapshot、usageから算出した推定費用。
- providerが正式に返した実行識別子。存在しない識別子は必須にせず、捏造しない。

resultは最終採否、人間区間承認、正式selection、字幕、renderer入場を所有しない。

### 8.3 時刻投影

5本は離れた元動画区間を連結している。候補内の1区間が連結点をまたぐ場合、元動画上では一つの連続区間にならない。このため単純な一つのoffset加算は禁止する。

jobは連結片ごとに候補内時間と元動画時間を束縛する。ローカル検査はGemini区間を連結点で分割し、片ごとに元動画へ投影する。既存MP4のcontainer尺と元区間尺にはencoding由来の数ms差があるため、独自の許容係数を置かない。正確な写像を提供する既存のrender provenanceまたは新しい決定的mapping artifactをjobへ束縛できない限り、元動画時刻の正式投影を完了扱いにしない。

## 9. 比較実験の保存と測定

比較は2段階に分ける。

1. Gemini入力と結果を、人間評価を読まない実行経路で保存する。
2. 5件全てのresultが閉じた後、別の比較器が保存済み人間評価を読み、差だけを測る。

各候補で次を記録する。

- Geminiが特定した核、原因、反応、導入、自然な終端。
- 人間区間との開始差と終了差。
- Geminiが残す候補とした尺、外せるとした尺。
- 映像適性に関する事実観測。
- 判断材料不足の申告。
- 人間が実際に必要とした内容との一致・不一致。
- 1 FPSで失われ得る速い動きが関係したか。

合否閾値、重み、係数、総合点は事前にも事後にも追加しない。最終採否との一致は参考値に留める。長くすれば成立するという救済は行わない。

人間確認へ進む前に、対象本数、各候補尺、Geminiが残す候補とした各区間尺、純再生時間合計、最長区間、最低確認時間を決定的に算出して提示する。

## 10. 既存通常切り抜きGemini経路との関係

`runner/src/steps/edit-plan.ts` は既に、固定済みの動画断片を640px幅へ変換し、MP4をbase64 inline dataとしてGeminiへ渡している。Geminiは動画を直接見て、画面種類、表示対象、テロップの発話ID単位を作る。候補選定は済み、断片順と時刻範囲は変えないという契約である。

現在固定されている `@google/genai` 1.52.0 の型定義には、Files API upload、response JSON Schema、media resolution、thinking levelの入口が存在する。これは実装可能性の確認であり、現行依存関係や既存edit-planを今回変更する根拠にはしない。

将来共通化できるもの:

- 元動画から候補動画を決定的に用意し、MIME、尺、stream、SHAを束縛する媒体入力層。
- `@google/genai` clientの生成、認証、model指定を行うprovider transportの下層。
- inlineとFiles APIをrequest byteに応じて扱う媒体添付adapter。
- exact request、raw response、HTTP、model、usageをraw-firstで保存するattempt層。
- 価格snapshotとprovider usageから推定費用を算出する層。

そのまま共通化できないもの:

- 既存edit-planのpromptとresponse shape。既存経路は固定区間への演出を作り、新工程は区間候補と映像事実を観測する。
- 既存の `generateGeminiJsonContent`。現状はJSON MIMEを指定してSDK応答を保存するが、response JSON Schema、動画処理方式、thinking、Files API、exact request SHA、HTTP envelope、厳密なusage/cost契約を所有しない。
- 既存edit-planが持つscreen layout、crop候補、テロップ、表示候補選択の責務。

したがって、既存edit-planへ分岐を足さない。新しい共通provider adapterが検証された後、edit-planと候補動画理解が下層だけを別工事で共有できるかを判断する。今回 `edit-plan.ts` は変更しない。

## 11. 成功時に削減候補となる工程

実験で人間観測との対応が確認できた場合、削減を検討できるのは次である。

- 区間化で原因、導入、反応、自然な終端を別々に人間が探す前処理。
- STTだけでは判定できない映像適性を、全候補について最初から人間へ回す作業。
- AIが映像を見るためだけに重複生成する中間review MP4。
- 自然な終了点に関する字幕意味判断の重複。ただし正式字幕契約は残す。

残すものは、候補発見、最終採否、人間用確認媒体、正式区間承認、元動画投影、発話包含、SHA束縛、base-media、frame mapping、字幕閉包、renderer admission、renderer、技術QC、最終人間確認である。

## 12. 最初の実装単位

最初の実装は一つに絞る。

> API transportやmain workflowへ接続せず、`candidate-video-understanding-job-v001` と `candidate-video-understanding-result-v001` の型、厳密validator、canonical serializer、連結動画の決定的時刻投影を、fixture test付きで実装する。

この単位ではAPIを呼ばず、5件をjobへ束縛できるか、人間評価がprovider input allowlistへ混入しないか、時刻投影を正式に閉じられるかだけを証明する。既存媒体から正確な候補内時刻写像を作れないと判明した場合は、不正確なoffsetで通さず停止する。

最低限のtest計画:

- job/resultのexact key、schema、canonical byte round-trip。
- candidate、source video、candidate video、正式発話、prompt、schema、exact request、raw responseのSHA不一致拒否。
- 動画なし、音声なし、尺不一致、unsafe pathの拒否。
- source mappingの順序、重複、逆転、隙間、連結点の検査。
- 候補尺外、`end <= start`、未知role、未知注意、余分field、重複観測の拒否。
- 連結点をまたぐ区間を複数の元動画区間へ分ける投影。
- 発話と重ならない原因映像を推測で発話へ寄せず、空の重なりとして保持すること。
- provider inputにhuman review path、SHA、採否、理由、正解区間、説明的candidate IDが入った場合の拒否。
- provider失敗時にrawとexecution evidenceを保持し、retry/repairを開始しないこと。
- resultに最終採否、score、rank、renderer admissionが入った場合の拒否。

## 13. 実行前にkawafmmが承認する事項

次の承認が届くまで、契約実装もAPI実行も開始しない。

1. 最初の実装単位と正本path上限。
2. `candidate-video-understanding-job-v001` / `result-v001` という責務と名称。
3. 既存5本を内容・映像注意・材料不足の比較へ使い、最初の4本を独立した境界発見の合否には使わないこと。
4. 粗い入力範囲を別途作る場合、その決定規則、素材、動画生成、元動画時刻mappingの責務。
5. model `gemini-3.8-flash`、static、1 FPS、高解像度、medium thinking、structured output、可視回答4,096 tokensという実行設定。
6. 1動画1推論の5回、retry 0、repair 0。
7. Files APIを5本へ使うか、1本だけ使い4本をinlineにするか。uploadと状態確認通信を含むこと。
8. exact request固定後の送信前token数、5回合計費用上限、厳密停止を保証できない残余リスク。
9. raw response、exact request、execution record、usage/cost、比較結果を保存する正本pathとcommit/tag可否。
10. 5 result保存後に人間評価正本を読む比較工程と、その後の人間確認を実施するか。

## 14. 現在の停止点

CURRENT_GOAL、遠方接続設計、共通候補動画理解設計、5本の現物検査、API方式、費用算定、structured output、job/result、共通化方針、最初の実装単位、次の承認事項を揃えた。API通信、新動画生成、既存工程変更、main workflow接続は行っていない。
