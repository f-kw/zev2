# ZEVO字幕品質v002 契約設計 v001

日付: 2026-08-10

現物調査基準commit: `542b35684a3ad67dbab042ca2bb3bff022e42023`

状態: 方式裁定待ち。実装・描画・API通信は未承認

通信: 0回

費用: US$0

## 0. この文書だけで判断できる結論

A-v002の切断は正しく動いている。残る問題はZEVOの字幕表示だけである。

現行ZEVOは、一つの字幕pageを次の二つへ兼用している。

1. どの文字を同時に見せるかという時間単位
2. どこで改行するかという配置単位

さらにpage数を最少にするため、横型では一つのpageが最大12.533秒間、全文を最初から静止表示する。この構造が、読み終えた文字の残留と、まだ話していない文字の先出しを同時に生む。改行候補は全ての文字atom境界なので、日本語の語中でも切れる。

推奨は次の組合せである。

- **表示方式P1: 意味小単位replace**
  - 一つの短い意味小単位だけを、その単位の発話時間に表示する。
  - 次の単位へ進んだら、前の字幕全体を入れ替える。
- **選択方式S3: AIによる境界ID選択**
  - AIは本文を作らず、機械が列挙したatom境界から「意味小単位の終端」と「行末」だけをIDで選ぶ。
  - 本文・時刻・順序は機械が復元する。
  - 不受理時に決定的方式へ切り替えるsilent fallbackは作らない。

この組合せを以下では**案A1**と呼ぶ。

案A1は品質面で最も目的に近い。一方でAPI通信と費用が発生するため、本書の承認だけでは実走しない。実装設計、B5 token計測、費用上限、B6一回実走を別途承認する。

今回kawafmmに求める人間作業は、案A1を採用するかの**1判断、目安2分以内**である。

## 1. 実現性調査

### 1.1 現物の入口と責務

| 現物 | SHA-256 | 行 | 調査結果 |
|---|---|---:|---|
| `presentation_a_meaning_information_package_v002.mjs` | `40a85f526666dd5f68bf64d141a5236146ae5b8e2baf285d4390bef41410e1a2` | 142–164, 273–275, 373–391 | ZEVGはatomの文字・元時刻・採用時刻片を保持する。proof 3候補はいずれも全文をcaption 1件へ載せ、発話ID・文節ID・意味小単位IDは持たない |
| `presentation_output_page_line_planner_v001.mjs` | `ebafe022060aaf9b98d9f7f27ae60af5e139295e0390ccca4db5caa99f590879` | 339–349, 470–513, 689–700 | ZEVOは全atom境界で1行・2行pageを作り、page数→総行数→最大幅→幅差→境界順で選ぶ |
| `presentation_output_page_line_planner_v002.mjs` | `8c943d68e1d08aadd48ab80e100006e091d2163c8fcb88a005e9f07f050b7f83` | 329–353, 406–449, 613–620 | page内の全採用時刻片を包絡し、pageの表示開始・終了へ使う。v001の物理page graphを共用する |
| `presentation_output_render_plan_v002.mjs` | `80623c9690be58ea4db59eec40d76af3c0f51e3f5c860b0c985c78832e88fe01` | 282–349 | page本文・行・開始frame・終了frameを共通描画へそのまま渡す |
| `render_presentation_v002.mjs` | `c90dc00456ade415e46cf8c692c49f3d08ae0ab21186b10227cdb5676f445292` | 704–720, 790–829 | page全文の静止PNGを一枚作り、そのpageの全frameで表示する。表示途中の文字更新はない |
| `presentation_segmenter_boundary_evidence_v001.mjs` | `dac613292e463897ee2757be75a7d64f3ece9928141765a195ba54a0ebc6007a` | 323–379, 410–418 | Gate Aでは固定Nodeの`Intl.Segmenter('ja', {granularity:'word'})`を既に使い、UTF-16位置をsource atom境界へexact写像している |
| `run_presentation_segmenter_boundary_preflight_v001.mjs` | `e83157cfe72197940193c9bd07a4f8c9be4b1716617dc55bf90e1e8c4f33812e` | 591以降 | Node実体SHA、Node版、ICU版、Unicode版、CLDR版、locale、granularityを実行来歴へ残す入口がある |

現物はすべて実在し、上記SHAを読み取り照合した。

### 1.2 正本fixture 6 plan

正本root:

`evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260810-v008/`

| 候補 | 形式 | render plan SHA-256 | page数 | 最大page表示時間 | 切断点を含むpageの切断後残り |
|---|---|---|---:|---:|---:|
| voice-013 | 横型 | `86d8769415b00c5a9379164fdaa209e07b78a0179745382d67612cb1a19cbd5e` | 3 | 11.767秒 | 2.200秒 |
| voice-013 | 縦型診断 | `5ebed5a6bb21e29af5c347e17af619737e2b06db55fd4d82336c8ad43cce1ca5` | 8 | 5.867秒 | 0.967秒 |
| voice-067 | 横型 | `4c82f3ecd81153befcc4ce470322a4fdbe6a777441fb0ff89f03a2d9c256c0e3` | 3 | 9.567秒 | 3.233秒 |
| voice-067 | 縦型診断 | `476fe41ad5b0e659641819f78e49f7b992044f37cf2f9bb56b6973decad1ff92` | 6 | 6.767秒 | 0.333秒 |
| voice-190 | 横型 | `613f2862bc6ed7a331a37dad0c03b94fbf0d17b8a1d04958790d9f80d3b72e01` | 3 | 12.533秒 | 5.833秒 |
| voice-190 | 縦型診断 | `f153fc409cbb07a9514a80c0f27c6c7f165495ffd23c6eda68ed0b49b139d317` | 7 | 6.767秒 | 3.700秒 |

「切断後残り」は、切断接続点から、その点を含むpage終了までの値である。現schemaには発話終端がないため、「発話終了後の厳密な残留秒数」とは主張しない。

人間観測とplanで一致した不自然改行には、少なくとも次がある。

- `ス / イちゃん`
- `じ / ゃ報告`
- `言ってほし / いみたいな`
- `マリ / ン`
- `サク / サク`

完成物検証レポートv002のSHA-256は`4897128c2771a3d2678e43b73e511ab90a6984ed69d7a8dcef6001977331f4ae`である。

### 1.3 日本語分節手段の現物

| 手段 | workspace内実体 | 決定性 | 現fixtureで分かったこと |
|---|---|---|---|
| `Intl.Segmenter` | あり。Gate Aで正式使用中 | 固定Node・ICU・Unicode・CLDRを束縛すれば検査可能 | 6 planの全segment最大論理幅は12で、横幅36・縦幅14の双方へ配置可能。既知の`ス/イ`、`じ/ゃ`、`ほし/い`を防げる |
| BudouX | `package.json`、`pnpm-lock.yaml`、`node_modules/.pnpm`の全てで0件 | packageとmodelを固定できれば決定的と見込むが、現物未確認 | API、version、license、modelが未取得。現時点では実装可能と主張できない |
| Kuromoji / TinySegmenter / Sudachi / MeCab | manifest・lock・実体0件 | 未確認 | 形態素境界は表示用改行の品質を直接保証しない |
| 独自句読点・文字種規則 | なし | 決定的 | voice-190は句読点0。独自規則や係数を品質根拠にすることは禁止 |

固定Node実測は`v20.19.6`、ICU `77.1`、Unicode `16.0`、CLDR `47.0`、resolved locale `ja`、granularity `word`である。

`Intl.Segmenter`は有用だが、自然さを保証しない。現fixtureでも`コ / ロ`、`デ / スカ / ード`、`う / な / ず / き`のような細分が観測された。境界候補を出すことと、実際にその境界で切ることは別である。

### 1.4 実現性判定

事実:

- ZEVG成果物を変えず、ZEVOが既存atom文字・時刻から新しい表示単位を作ることは可能。
- 現rendererは「静止pageを指定frameだけ表示する」機能を既に持つ。意味小単位replaceには新しい描画アルゴリズムが要らない。
- 日本語の自然な境界を機械だけで一意に選ぶ品質規則は、現物には存在しない。
- BudouXは未導入であり、通信0の今回にAPI・version・licenseを確定できない。
- AI候補選択は、既存atom境界IDだけを入力にすれば、ZEVG変更も日本語分節処理の二重実装も避けられる。

結論:

- **意味小単位replaceは現物で実装可能。**
- **決定的日本語分節は候補生成としては実装可能だが、表示単位の自然なまとまりを選ぶ完全解ではない。**
- **品質優先なら、§9.3で予約済みのAI候補選択を正式化するのが最短。**

## 2. 目的と非目的

### 2.1 目的

1. 読み終えた前方文字を、後続発話中まで長く残さない。
2. まだ話していない後方文字を、長いpageの開始時からまとめて先出ししない。
3. 日本語の語中・不自然な文節位置で改行しない。
4. A-v002の文字非重複・非欠損と切断時刻無丸めを維持する。

### 2.2 対象外

- ZEVGの意味情報パッケージ、atom、採用元時刻片、切断契約の変更
- 縦型正式preset `screen_speaker`
- candidate 59の実切断
- O1
- G4〜G7、タイトル、演出
- API実走、費用支出
- 既存3本・A-v002 proof 6本・stable tagの変更

## 3. 不変条件

どの案でも次を変えない。

1. 一つのatom occurrenceは一度だけ保持する。
2. 各atomの採用元時刻片は1件以上で、元時刻を丸めない。
3. 全cueを連結した本文・atom ID列はZEVG captionと完全一致する。
4. 欠落、重複、逆順、候補外境界、本文改変を拒否する。
5. 本文・時刻・IDは機械復元し、AI応答へ本文を再出力させない。
6. 表示時間は整数frame、元時刻は整数ms、論理幅は整数とする。
7. 物理safe area、行交差0、正frame、page間正の重なり0を維持する。
8. silent fallback、互換変換、旧v002成果物の再解釈を作らない。
9. 既存成果物は凍結し、新規生成だけへforward-onlyで適用する。

## 4. 二つの問題を分離する

ZEVO字幕品質v002は次の二段に分ける。

### 4.1 意味小単位選択

captionのatom列を、表示中に同時に見せる短い意味小単位へ全量分割する。各単位を`cue`と呼ぶ。

cueの表示開始は先頭atomの最初の採用frame、表示終了は末尾atomの最後の採用frameとする。cue間の無発話frameには字幕を出さない。cue同士は本文・atomを共有しない。

### 4.2 cue内の行折り

一つのcueだけを、styleの最大論理幅・最大行数へ収める。1行に収まれば改行しない。1行に収まらない場合だけ、許可された境界から最大2行へ分ける。

この分離により、page数を減らす都合で表示時間まで長くなる構造を廃止する。

## 5. page表示方式の比較

| ID | 方式 | 残留への効果 | 契約影響 | 品質・リスク | 判定 |
|---|---|---|---|---|---|
| P0 | 現行page包絡固定 | 直らない | なし | 最大12.533秒の静止page。人間NG済み | 不採用 |
| P1 | **意味小単位replace** | 前cueを次cueへ持ち越さない | cue列をpage列として表すforward-only改訂 | 現rendererを再利用可能。cue内だけ後方文字を先出しするが範囲は短い | **推奨** |
| P2 | 2行rolling | 直前cueを意図的に残す | 同じ文字を複数表示stateへ再掲するschemaと来歴が必要 | 今回の「前の文字を残さない」と逆向き。確認動画も6本へ増える | 非推奨 |
| P3 | atom逐次・karaoke | 時刻追随は最大 | rendererとoverlay stateを大幅改訂 | 単独0-frame atomが6 fixtureで8件。72〜101回の高速更新 | 非推奨 |

P1を採用する場合、現rendererの「一つの静止PNGを指定frameだけ表示する」機能は維持し、入力pageを短いcueへ変えるだけでよい。

## 6. 日本語境界選択方式の比較

### 6.1 比較表

| ID | 方式 | 追加費用 | 決定性 | 日本語品質 | 実装上の論点 |
|---|---|---:|---|---|---|
| S1 | `Intl.Segmenter`境界だけで機械選択 | US$0 | 固定runtimeならbyte検査可能 | 既知の語中切断を防ぐが、口語・固有語のまとまり選択は保証しない | cueをどの長さへ束ねるかに、人間承認済みの規則または数値入力が別途必要 |
| S2 | BudouX等の決定的line-break engine | 実行自体はUS$0。dependency取得工事が必要 | package/model固定後に検証可能 | line-break用途に近い見込みだが現物未確認。cue timingは別問題 | package、lock、license、modelの取得・照合が先。今回の通信0範囲では閉じない |
| S3 | **AIがatom境界IDを選択** | API費用あり | 生成は非決定的。受理後の機械復元は決定的 | 文脈・口語・固有名詞を含む意味単位と行末を同時に判断できる | raw、model、usage、選択binding、B5/B6、支出上限が必要 |

### 6.2 費用の扱い

S1とS2のローカル実行費用はUS$0である。S2のpackage取得は通信と実装変更が別途必要である。

S3の正確な費用は、正式payloadが未作成のため現時点では未確認である。独自係数による概算は行わない。実装後のB5で正式payloadを固定し、公式単価snapshotと`countTokens`実測を用いて次の整数計算で上限を出す。

```text
input cost  = input token実測 × 公式input単価 / 1,000,000
output cost = 契約から導出した最大有効回答token × 公式output単価 / 1,000,000
```

モデル、tier、支出上限、countTokens回数、B6一回送信は別承認とする。本書では通信しない。

### 6.3 決定的方式だけでは閉じない理由

`Intl.Segmenter`は境界候補を出せるが、隣接する単語をどこまで一つのcueへ束ねるかは決めない。

- cue数最少を優先すると、現行と同じ長時間残留へ戻る。
- cue数最大を優先すると、短い語ごとの高速切替になる。
- 最大cue時間や目標文字数を置くには、人間承認済みの入力値が必要である。
- 句読点だけではvoice-190を分割できない。
- 独自係数や暗黙thresholdは使用禁止である。

したがってS1/S2は有用な候補生成手段だが、今回の二つの品質問題を単独では解決しない。

## 7. 推奨案A1の契約

### 7.1 機械が作る候補

ZEVOはZEVG meaning packageのcaptionごとに、atom occurrenceの各末尾へ決定的な境界IDを振る。

```text
captionId
boundaryId
afterAtomOccurrenceId
ordinal
```

IDと順序は機械だけが作る。AIへはcaption本文、順序付きatom text、境界ID、styleの最大論理幅と最大行数を渡す。元動画、元時刻、retained span、秘密、既存の正解境界は送らない。

### 7.2 AIが返す最小回答

provider本文の意味objectは次の形だけを許可する。

```json
{
  "status": "complete",
  "captions": [
    {
      "captionId": "caption-000001",
      "cues": [
        {
          "cueEndBoundaryId": "display-boundary-000008",
          "lineEndBoundaryIds": ["display-boundary-000008"]
        }
      ]
    }
  ]
}
```

AIは本文、時刻、幅、理由文を返さない。理由を保存する場合はproviderの意味回答とは別の監査欄に閉語彙で持たせ、受理対象の本文を増やさない。具体schemaは完全実装設計で一意に固定する。

### 7.3 機械受入

次を全て満たす場合だけ受理する。

1. captionが入力とexact一対一で順序一致する。
2. cue終端は候補ID集合内で狭義単調増加する。
3. 最後のcueがcaption最後のatomで終わる。
4. cueごとの行末は1件または2件で、狭義単調増加する。
5. 各cueの最後の行末はcue終端と一致する。
6. 全cue・全行を平坦化したatom列と本文がZEVG captionに完全一致する。
7. 各行がstyleの論理幅上限以下である。
8. 各cueが既存の実配置検査でsafe area、行交差0、有限座標を満たす。
9. 各cueの既存piecewise timeline写像が正frameを持ち、cue間に正の重なりがない。
10. provider rawは解析前にbyte保存し、trim、fence除去、修復、再試行を行わない。

不受理、abstained、物理不成立、時間不成立は、その結果を保存して停止する。S1/S2へ切り替えない。

### 7.4 表示

受理した一つのcueから静止overlay一枚を作る。cueの先頭frameで表示を開始し、末尾frameで終了する。次cueは別overlayとして入れ替える。

現行の4frame fade、preset、文字style、crop、音声、映像、A-v002のpiecewise timelineは変更しない。cueが短く、既存fadeの見え方に問題が出た場合は、字幕品質v002とは別の人間目視結果として戻し、独自の最短時間を追加しない。

### 7.5 forward-only

新しい正式成果物は、少なくとも次を旧v002と別schema・別pathで持つ。

- ZEVO字幕候補入力
- provider rawと受入記録
- cue/line選択
- page/line plan次版
- render plan次版
- 版付き横型3本

旧planを変換して新成果物と名乗る処理、旧plan受理、fallback、二重併産は作らない。既存6 planは正本fixtureとして読み取りだけに使う。

## 8. S1またはS2を選ぶ場合に残る人間判断

S1またはS2を採用する場合、意味小単位を束ねる規則が未固定である。実装前に次のいずれかを別途選ぶ必要がある。

- style入力として最大cue表示時間を人間認定する。
- style入力として最大cue論理幅を人間認定する。
- 句読点・分節種別の優先順を人間認定する。

いずれも現fixtureだけから自動導出せず、独自係数を置かない。よってS1/S2は、案A1より人間判断が少なくとも1件増える。

## 9. 実装規模見込み

方式裁定前のため、完全実装pathはまだ正本化しない。役割から見た上限見込みは次である。

| 方式 | code/test変更見込み | 追加の正式工程 |
|---|---:|---|
| P1+S1 | 6〜8 path | 分節runtime binding、決定的cue selector、planner次版 |
| P1+S2 | 9〜12 path | 上記にpackage/lock/license/model固定を追加 |
| **P1+S3** | **10〜14 path** | 候補package、B5/B6、raw保存、受入、planner次版、proof接続 |

案A1承認後、現物調査を再確認し、path単位、schema単位、検査ID単位へ閉じた完全実装設計を提示する。API実走はさらに別承認とする。

実装後の人間作業は、旧v3三候補の横型3本を一つの確認ページで見る**1セッション、目安5分**とする。個別境界の手入力は要求しない。縦型3本は本工程で再描画しない。

## 10. 検査計画

方式決定後の完全実装設計では、最低限次を一件表へ固定する。

1. ZEVG meaning packageとA-v002 source sequenceのbyte不変。
2. cue全量の本文・atom ID・retained span閉包。
3. cue間の欠落・重複・逆順0件。
4. cue/line境界IDの候補外拒否。
5. 1行に収まるcueの改行0件。
6. 2行時の各行幅、行数、物理配置。
7. cue開始・終了frameの既存piecewise mapper一致。
8. cue間正のframe重なり0件。
9. provider rawの無改変保存、応答schema、model、usage、費用。
10. 不受理時の停止とsilent fallback 0件。
11. 同一受理済み選択から同一plan byteを再構築できること。
12. 現6 planを旧fixtureとして再読し、既知の不自然改行5例を再発させないこと。
13. 旧v3三候補の横型3本を新規版付きrootへ再描画し、QC 6項目を通すこと。
14. green 287、baseline 86/203 exact、既存5 tree、A-v002記録commitの対象treeを不変確認すること。

## 11. 完全性チェック

| 項目 | 判定 | 根拠 |
|---|---|---|
| 本来目的 | closed | A-v002全体の合格を阻む字幕2問題だけを扱う |
| 現物入口 | closed | §1.1の実path・SHA・行位置を照合済み |
| fixture全数 | closed | 3候補×2形式の6 planをSHA付きで固定 |
| 人間観測 | closed | レポートv002と今回のkawafmm裁定を正本化。AI観測へ混ぜていない |
| ZEVG境界 | closed | meaning package、atom、retained spanを変更しない |
| ZEVO責務 | closed | cue選択、行折り、表示時間、描画projectionだけ |
| 数値区分 | closed | 元時刻ms・frame・論理幅・token・費用を分離。独自係数0 |
| 参照実体 | closed | Intl実装あり、BudouX等は不在と明記 |
| 観測取得可能性 | closed | text/atom/time/style/plan/QCは現物から取得可能。API値はB5/B6まで未確認と明記 |
| 既存成果物 | closed | 既存3本、A-v002 proof 6本、stable tagを不変保持 |
| silent fallback | closed | 全案間の暗黙切替を禁止 |
| 実装path | pending by design | S1/S2/S3で必要pathが異なるため、方式裁定後にexact閉包する |
| API費用 | pending by design | payload未作成。独自概算せず、別承認のB5実測へ送る |

現物差・契約矛盾は見つからなかった。方式裁定前に実装者判断で埋めてはいけない残件は、P1/S1〜S3の選択1件だけである。

## 12. 推奨裁定と停止点

推奨は**案A1（P1 意味小単位replace + S3 AI境界ID選択）**である。

理由:

1. 人間が不合格にした二問題を同時に扱える。
2. ZEVGとA-v002の文字保持契約を変えない。
3. 本文・時刻をAIへ決めさせず、候補ID選択へ限定できる。
4. 決定的分節だけでは未固定になるcue長規則を増やさない。
5. §9.3で人間不合格時の次案として既に予約された方向である。

案A1を選んでも、本書の承認範囲は完全実装設計の提示までとする。B5 countTokens、B6生成、API通信、費用、描画は別承認である。

### 承認文案

> ZEVO字幕品質v002契約設計v001の案A1を採用する。表示は意味小単位replace、境界選択はAIが機械列挙済みatom境界IDからcue終端と行末だけを選ぶ方式とする。ZEVG成果物・A-v002文字保持契約・既存成果物は不変、本文・時刻は機械復元、silent fallbackは禁止とする。次は10〜14 path見込みをexact path・schema・検査IDへ閉じた完全実装設計の提示までを承認し、API実走と費用支出は別承認とする。

本書はここで停止する。実装、通信、描画、stable tag、O1へは進まない。
