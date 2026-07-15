# 切り抜きfixture製造手順書

この手順書は、切り抜きURL 1本から `clip_composition` 評価用fixtureを作るまでの運用手順です。目的はfixture量産ではなく、区間選択能力を固定して比較可能にすることです。5件目以降は、評価で足りない型が見つかったときだけオンデマンドで作ります。

## 到達状態

人間確認前まで自走した時点で、次がそろっていることを成功とします。

- 切り抜き動画と元動画候補が `evals/clip_composition/research/downloads/` に保存されている
- 切り抜き側と元動画側のローカルSTT結果が `evals/clip_composition/stt/` に保存されている
- 単語対応の大域照合結果と散布図が `outputs/` と `reports/` に出ている
- 素材ブロック再構成結果が `outputs/material-blocks-*.json` に出ている
- 人間確認用HTMLが `outputs/block-check/` または `outputs/boundary-check/` に出ている
- fixture凍結は、人間確認と固定テーマがそろうまで実行しない

## 守る制約

- 本体のUI、API、キュー、DB、承認ゲート、`runtime/` は触らない。
- 書き込み先は `evals/clip_composition/` 配下だけにする。
- YouTube自動字幕や粗探索は候補探しにだけ使う。凍結根拠にはしない。
- ローカルSTTサーバーが落ちている場合は停止し、ユーザーへ起動を依頼する。別のSTTへ勝手に切り替えない。
- 照合結果だけで正解を凍結しない。人間が音声または映像で素材対応を確認してから凍結する。
- 固定テーマは、確定した素材区間から人間が逆算して書く。システム生成テーマをcomposition評価の固定入力にしない。
- 期待区間の境界は「元動画の別位置へ素材対応が切り替わる点」とする。同一素材内の詰めは `internalGapMs` 系の注記にする。

## 0. 作業IDを決める

作業開始時に次を決めます。

```bash
CLIP_ID="YouTube動画IDまたは安全な短縮ID"
CLIP_URL="https://www.youtube.com/watch?v=..."
RUN_ID="$(date +%Y%m%d)-material-manufacturing-v001"
STT_SERVER="http://192.168.1.4:8000"
```

`CLIP_ID` はディレクトリ名とSTT保存IDに使います。すでに同じIDがある場合は、既存fixtureを壊さないように別IDを使います。

## 1. 切り抜きとメタ情報を取得する

```bash
mkdir -p "evals/clip_composition/research/downloads/${CLIP_ID}"

yt-dlp \
  -f "bv*+ba/b" \
  --merge-output-format mp4 \
  -o "evals/clip_composition/research/downloads/${CLIP_ID}/${CLIP_ID}.%(ext)s" \
  "${CLIP_URL}"

yt-dlp \
  --skip-download \
  --write-info-json \
  --write-description \
  -o "evals/clip_composition/research/downloads/${CLIP_ID}/${CLIP_ID}.%(ext)s" \
  "${CLIP_URL}"
```

説明欄に元動画URLがある場合は候補として採用します。ない場合は、YouTube検索やWeb版Geminiで候補を探してよいですが、その結果は粗探索扱いです。凍結根拠にはしません。

元動画候補を取得します。

```bash
SOURCE_VIDEO_ID="元動画ID"
SOURCE_URL="https://www.youtube.com/watch?v=..."

mkdir -p "evals/clip_composition/research/downloads/${CLIP_ID}/sources/${SOURCE_VIDEO_ID}"

yt-dlp \
  -f "bv*+ba/b" \
  --merge-output-format mp4 \
  -o "evals/clip_composition/research/downloads/${CLIP_ID}/sources/${SOURCE_VIDEO_ID}/${SOURCE_VIDEO_ID}.%(ext)s" \
  "${SOURCE_URL}"
```

候補が複数ある場合は、同じ手順を候補ごとに繰り返します。切り抜きが複数の元動画をまたぐことは正常にあり得ます。

## 2. STT対象定義を保存する

`evals/clip_composition/stt-targets/${CLIP_ID}.json` を作ります。形式は既存の `stt-targets/*.json` に合わせます。

```json
{
  "targetId": "CLIP_ID",
  "title": "切り抜きタイトル",
  "createdAt": "2026-07-08T00:00:00+09:00",
  "clip": {
    "id": "CLIP_ID",
    "sttId": "CLIP_ID",
    "url": "CLIP_URL",
    "localVideoPath": "evals/clip_composition/research/downloads/CLIP_ID/CLIP_ID.mp4",
    "sttRole": "clip",
    "notes": [
      "BGM、SE、字幕、追加ナレーションは正常なノイズとして扱う。"
    ]
  },
  "sourceCandidates": [
    {
      "id": "SOURCE_VIDEO_ID",
      "sttId": "CLIP_ID_SOURCE_VIDEO_ID_local300_v001",
      "url": "SOURCE_URL",
      "localVideoPath": "evals/clip_composition/research/downloads/CLIP_ID/sources/SOURCE_VIDEO_ID/SOURCE_VIDEO_ID.mp4",
      "sttRole": "source",
      "notes": [
        "対応確定はローカルSTT照合、素材ブロック確認、人間確認後。"
      ]
    }
  ],
  "freezeStatus": {
    "readyForFreeze": false,
    "reason": "人間確認と固定テーマが未完了。"
  }
}
```

このファイルは作業台帳です。fixtureではありません。

## 3. ローカルSTTを実行する

最初に疎通を確認します。

```bash
curl "${STT_SERVER}/health"
```

疎通できない場合はここで停止し、ユーザーにSTT起動を依頼します。

切り抜き側をSTTします。

```bash
runner/node_modules/.bin/tsx evals/clip_composition/run_local_stt.ts \
  --input "evals/clip_composition/research/downloads/${CLIP_ID}/${CLIP_ID}.mp4" \
  --id "${CLIP_ID}" \
  --role clip \
  --server "${STT_SERVER}"
```

元動画側は長尺なので分割STTを使います。まず300秒チャンクで試します。

```bash
SOURCE_STT_ID="${CLIP_ID}_${SOURCE_VIDEO_ID}_local300_v001"

runner/node_modules/.bin/tsx evals/clip_composition/run_local_stt_chunked.ts \
  --input "evals/clip_composition/research/downloads/${CLIP_ID}/sources/${SOURCE_VIDEO_ID}/${SOURCE_VIDEO_ID}.mp4" \
  --id "${SOURCE_STT_ID}" \
  --role source \
  --server "${STT_SERVER}" \
  --chunkSec 300 \
  --timeoutMs 1800000
```

300秒チャンクで同じ箇所が落ちる場合だけ、理由をレポートに残して短いチャンクで再実行します。

```bash
SOURCE_STT_ID="${CLIP_ID}_${SOURCE_VIDEO_ID}_local30_v001"

runner/node_modules/.bin/tsx evals/clip_composition/run_local_stt_chunked.ts \
  --input "evals/clip_composition/research/downloads/${CLIP_ID}/sources/${SOURCE_VIDEO_ID}/${SOURCE_VIDEO_ID}.mp4" \
  --id "${SOURCE_STT_ID}" \
  --role source \
  --server "${STT_SERVER}" \
  --chunkSec 30 \
  --timeoutMs 1800000
```

STT後に最低限確認すること:

- `evals/clip_composition/stt/${CLIP_ID}/clip/word-timestamps.json` がある
- `evals/clip_composition/stt/${SOURCE_STT_ID}/source/word-timestamps.json` がある
- 元動画側に単語タイムスタンプがある
- 切り抜き側にSTT 0語の区間があっても、BGM、SE、加工、無音なら異常とは限らない

## 4. 単語列を大域照合する

切り抜き側の全単語列と元動画側の全単語列を、単調増加制約つきで照合します。

```bash
DP_OUTPUT_ID="${CLIP_ID}_${SOURCE_VIDEO_ID}_${RUN_ID}_dp"

runner/node_modules/.bin/tsx evals/clip_composition/global_dp_word_alignment.ts \
  --clipId "${CLIP_ID}" \
  --sourceId "${SOURCE_STT_ID}" \
  --outputId "${DP_OUTPUT_ID}" \
  --skipCurrentComparison
```

出力:

- `evals/clip_composition/outputs/global-dp-word-alignment-${DP_OUTPUT_ID}.json`
- `evals/clip_composition/reports/global-dp-word-alignment-${DP_OUTPUT_ID}.md`
- `evals/clip_composition/outputs/plots/global-dp-word-alignment-${DP_OUTPUT_ID}.svg`

読むポイント:

- 散布図で直線分があるか
- 直線分が複数の元動画へ分かれていないか
- 対応語数が極端に少ない候補を確定扱いしていないか
- DPは偽陽性を出すため、ここでは候補に留める

注意: 現在の大域照合スクリプトには、過去の確認済みペアを再採点するための既定診断が残っています。新規fixture製造では、確認済みペアの合否欄ではなく、単語対応の直線分、対応語数、散布図、素材ブロック再構成結果を読みます。既定診断の数値を新規動画の成否として扱ってはいけません。

元動画候補が複数ある場合は候補ごとに実行し、候補を横並びで比較します。

## 5. 素材ブロックを再構成する

DPの直線分と対応位置の飛びから、素材対応ブロックを作ります。

```bash
BLOCK_OUTPUT_ID="${RUN_ID}"

node evals/clip_composition/reconstruct_material_blocks.mjs \
  --clipId "${CLIP_ID}" \
  --sourceVideoId "${SOURCE_VIDEO_ID}" \
  --outputId "${BLOCK_OUTPUT_ID}" \
  --dpResult "evals/clip_composition/outputs/global-dp-word-alignment-${DP_OUTPUT_ID}.json" \
  --clipMedia "evals/clip_composition/research/downloads/${CLIP_ID}/${CLIP_ID}.mp4" \
  --sourceMedia "evals/clip_composition/research/downloads/${CLIP_ID}/sources/${SOURCE_VIDEO_ID}/${SOURCE_VIDEO_ID}.mp4"
```

出力:

- `evals/clip_composition/outputs/material-blocks-${CLIP_ID}-${BLOCK_OUTPUT_ID}.json`
- `evals/clip_composition/reports/material-blocks-${CLIP_ID}-${BLOCK_OUTPUT_ID}.md`
- `evals/clip_composition/outputs/boundary-check/${CLIP_ID}/${BLOCK_OUTPUT_ID}/index.html`

素材ブロックの読み方:

- 元動画の対応位置が大きく飛ぶ点だけをブロック境界にする。
- 同一場面内のジャンプカットや詰めは境界ではなく、内部の詰めとして記録する。
- crossfadeは素材切り替わりとして扱い、遷移方法を注記する。
- 長く説明できない区間、STT 0語の区間、比較材料がない区間は unresolved または excluded 候補にする。

## 6. 人間確認パッケージを作る

画面変化が少ない切り抜きでは、左右同時再生だけでは判定できません。音声を分けて、切り抜き側と元動画側を別々に確認できるパッケージを作ります。

```bash
REVIEW_OUTPUT_ID="${RUN_ID}-audio-review-v001"

node evals/clip_composition/build_material_block_audio_review_package.mjs \
  --clipId "${CLIP_ID}" \
  --outputId "${REVIEW_OUTPUT_ID}" \
  --materialBlocks "evals/clip_composition/outputs/material-blocks-${CLIP_ID}-${BLOCK_OUTPUT_ID}.json" \
  --dpResult "evals/clip_composition/outputs/global-dp-word-alignment-${DP_OUTPUT_ID}.json" \
  --clipMedia "evals/clip_composition/research/downloads/${CLIP_ID}/${CLIP_ID}.mp4" \
  --sourceMedia "evals/clip_composition/research/downloads/${CLIP_ID}/sources/${SOURCE_VIDEO_ID}/${SOURCE_VIDEO_ID}.mp4"
```

出力:

- `evals/clip_composition/outputs/block-check/${CLIP_ID}/${REVIEW_OUTPUT_ID}/index.html`
- `evals/clip_composition/reports/material-block-audio-review-${CLIP_ID}-${REVIEW_OUTPUT_ID}.md`

注意: 現在の `build_material_block_audio_review_package.mjs` には、過去のaX確認で使った判定表示と「全run一致」の文言が残っています。新規fixtureでは、生成されたHTMLと切り出し動画を確認素材として使い、レポート内の既存判定文言をそのまま凍結根拠にしません。人間確認後に、新しい確認結果を別レポートまたは凍結メタデータへ明示します。

人間に依頼する問い:

- 各素材ブロックは、切り抜き側と元動画側で同じ素材か。
- 境界の前後で、元動画の対応位置が実際に切り替わっているか。
- crossfadeの場合、どこからどこへ切り替わるように見えるか。
- 判定不能なら判定不能と答えてよい。無理に一致へ寄せない。

人間に依頼しない問い:

- 静止画だけで口元の同期を判定すること。
- 片側が無音の素材を、同時再生だけで一致判定すること。
- STT 0語で比較材料がない区間を採否判断すること。
- 期待区間に入れるべきかを、テーマ評価やプロンプト評価込みで判断すること。

確認セッションの分割:

- 採用する全素材ブロックと必要な全境界を人間確認する要件は維持する。ただし、それらを1回で連続提示しない。
- 候補カード数ではなく、素材対応・前側境界・後側境界など、人間が独立に答える問いを判定数として数える。1セッションは5判定前後を上限とし、fixtureの正解認定は重要判断なので、必要に応じてさらに少数へ絞る。
- 総判定数、1セッションの判定数、予定セッション数、分割順を、確認パッケージ生成前に申告する。上限を超える場合は、日を分けるか、凍結判断に必要な優先箇所から提示する。
- 各セッションは人間可読な結果をコピーして終了し、次のバッチへ自動遷移しない。機械側が回答を結合・整合確認してから、次のセッションを別に提示する。
- 最終段階で全ブロックをもう一度見せない。全対象が各セッションで確認済みであることを機械照合し、未解決・回答変更・整合しない箇所だけを別セッションへ戻す。凍結許可は、この結合結果と差分要約に対する独立した最終判断として扱う。

複数素材ブロックの確認では、確認媒体HTMLと人間確認decisionテンプレートから、入力・回答保存・JSON出力を行う別HTMLを作れます。元の確認媒体HTMLは変更せず、同じディレクトリに出力します。

```bash
node evals/clip_composition/build_multiblock_decision_review_html.mjs \
  --sourceHtml "evals/clip_composition/outputs/boundary-check/${CLIP_ID}/${BLOCK_OUTPUT_ID}/index.html" \
  --decisionTemplate "人間確認decisionテンプレートJSON" \
  --output "evals/clip_composition/outputs/boundary-check/${CLIP_ID}/${BLOCK_OUTPUT_ID}/decision-review.html" \
  --checkedBy "kawafmm" \
  --checkedAt "2026-07-11"
```

入力HTMLで行うこと:

- 各境界について、切り抜き側の切り替わり、元配信位置の切り替わり、境界前後の素材対応を入力する。
- 不一致・判定不能を合格へ寄せず、そのまま理由付きで記録する。
- 境界回答からブロック採否の下書きを作り、分割した各セッションの回答を機械側で結合する。人間へ全17ブロックを再提示せず、未解決・回答変更・整合しないブロックだけを別セッションで確認する。
- 確認者、確認日、固定テーマ1行、最終確認を入力する。
- チャットへ返す回答文と、凍結処理が読むdecision JSONを出力する。

回答はブラウザー内へ自動保存されます。HTML自身はfixture/expectedへ書き込みません。出力JSONを受け取った後も、実凍結前に書き込みなしのpost-human dry-runを行います。

## 7. 人間確認結果を記録する

確認後、レポートまたは凍結用メタデータに次を残します。

```json
{
  "checkedBy": "kawafmm",
  "checkedAt": "2026-07-08",
  "method": "音声分離確認パッケージ",
  "acceptedBlocks": [1, 2, 3],
  "rejectedBlocks": [
    {
      "block": 4,
      "reason": "違う素材"
    }
  ],
  "unresolvedRanges": [
    {
      "clipStartMs": 115000,
      "clipEndMs": 148000,
      "reason": "STT 0語で比較材料がない"
    }
  ],
  "boundaryPrecision": "素材ブロック粒度",
  "notes": [
    "±1秒未満の境界差分は測定限界内として扱う"
  ]
}
```

確認済みブロックを後から書き換える場合は、旧確認を削除せず、確認手段の解像度と差分を履歴として残します。

## 8. 固定テーマを書く

固定テーマは、確定した素材区間から人間が逆算して1行で書きます。

よい例:

- `配信者が食べていける同接規模について現実的に答える場面`
- `Vの組織内あれこれ`
- `ナンバリング + 元動画タイトル`

避けること:

- 秒数、照合結果、期待区間を含める。
- 切り抜き側だけにある字幕や編集情報を根拠にする。
- システム生成テーマをそのまま固定入力にする。

## 9. fixtureを凍結する

凍結条件:

- 採用する素材ブロックがすべて人間確認済み。
- rejected と unresolved が採点対象外として明記されている。
- 固定テーマが人間の逆算テーマとして書かれている。
- `readyForFreeze` の理由が解消している。
- runtime、本体UI/API/キュー/DBへの書き込みがない。

単一区間fixtureの場合は、汎用凍結スクリプトをdry-runしてから実行します。

この凍結スクリプトは、素材ブロックが1件だけであることと、確認レポートに「結論: 全run一致」があることをガードにしています。新規fixtureで使う場合は、確認レポートの文言が今回の人間確認結果として正しく作られていることを先に確認します。過去fixture由来の文言を流用して通してはいけません。

```bash
FIXTURE_ID="${CLIP_ID}_material_v001"
THEME_TITLE="人間が逆算して書いた固定テーマ"

node evals/clip_composition/freeze_material_block_fixture.mjs \
  --fixture "${FIXTURE_ID}" \
  --target "evals/clip_composition/stt-targets/${CLIP_ID}.json" \
  --materialBlocks "evals/clip_composition/outputs/material-blocks-${CLIP_ID}-${BLOCK_OUTPUT_ID}.json" \
  --sourceSttId "${SOURCE_STT_ID}" \
  --sourceVideoId "${SOURCE_VIDEO_ID}" \
  --themeTitle "${THEME_TITLE}" \
  --checkedBy "kawafmm" \
  --checkedAt "2026-07-08" \
  --reviewReport "evals/clip_composition/reports/material-block-audio-review-${CLIP_ID}-${REVIEW_OUTPUT_ID}.md" \
  --dry-run
```

dry-runの出力が妥当なら `--dry-run` を外して実行します。

単一元動画から複数素材ブロックを凍結する場合は、汎用のpreview経路を使います。人間確認前に実行すると、全ブロックのSTT対応、素材ブロック数、境界数、書き込み予定先を検査し、人間確認decisionのテンプレートだけを作ります。この段階ではfixture/expectedへ書き込みません。

```bash
FIXTURE_ID="${CLIP_ID}_multiblock_material_v001"
PREVIEW_ID="pre-human-v001"

node evals/clip_composition/freeze_multiblock_material_fixture.mjs \
  --fixture "${FIXTURE_ID}" \
  --target "evals/clip_composition/stt-targets/${CLIP_ID}.json" \
  --materialBlocks "evals/clip_composition/outputs/material-blocks-${CLIP_ID}-${BLOCK_OUTPUT_ID}.json" \
  --reviewPackage "evals/clip_composition/outputs/boundary-check/${CLIP_ID}/${BLOCK_OUTPUT_ID}/index.html" \
  --sourceSttId "${SOURCE_STT_ID}" \
  --sourceVideoId "${SOURCE_VIDEO_ID}" \
  --outputId "${PREVIEW_ID}"
```

previewは次を検査します。

- 素材ブロックが2件以上で、境界数がブロック数-1である。
- ブロックと境界の番号・前後関係・時間範囲が矛盾しない。
- 全ブロックに凍結用ローカルSTTの単語が対応する。
- 素材ブロックJSONと確認パッケージをSHA-256で人間確認decisionへ固定する。
- 人間確認、固定テーマ、凍結許可が未入力ならfixture/expected書き込み指定を失敗させる。

人間確認後は、生成されたdecisionテンプレートの全ブロックと全境界を確定し、固定テーマを入力します。採用ブロックは `accepted`、不採用は理由付き `rejected`、判定不能は理由付き `unresolved` とします。連続して採用する2ブロック間の境界は、前側一致・後側一致・元配信位置の切り替わりがすべて確認済みでなければ `confirmed` にできません。

まずdecisionを指定したまま書き込み指定なしで再実行し、`fixtureWriteReady: true` とfixture/transcript/themes/expectedのdraftを確認します。実凍結は、その同じdecisionを指定して `--writeFixture true` を追加したときだけ行います。既存fixture/expectedは上書きしません。

```bash
node evals/clip_composition/freeze_multiblock_material_fixture.mjs \
  --fixture "${FIXTURE_ID}" \
  --target "evals/clip_composition/stt-targets/${CLIP_ID}.json" \
  --materialBlocks "evals/clip_composition/outputs/material-blocks-${CLIP_ID}-${BLOCK_OUTPUT_ID}.json" \
  --reviewPackage "evals/clip_composition/outputs/boundary-check/${CLIP_ID}/${BLOCK_OUTPUT_ID}/index.html" \
  --sourceSttId "${SOURCE_STT_ID}" \
  --sourceVideoId "${SOURCE_VIDEO_ID}" \
  --decision "人間確認後のdecision JSON" \
  --outputId "post-human-dry-run-v001"
```

複数元動画を含むfixtureは、この汎用経路の対象外です。既存の `freeze_xau_part01_partial_fixture.mjs` はXau専用なので、別動画へそのまま使ってはいけません。新しい複数元動画fixtureは、`evals/clip_composition/` 内で別の凍結経路を作り、必ずdry-runと人間確認記録を通します。

## 10. 凍結後の確認

凍結後に確認すること:

- `evals/clip_composition/fixtures/${FIXTURE_ID}/fixture.json`
- `evals/clip_composition/fixtures/${FIXTURE_ID}/transcript.json`
- `evals/clip_composition/fixtures/${FIXTURE_ID}/themes.json`
- `evals/clip_composition/expected/${FIXTURE_ID}.json`
- expectedに `verificationStatus`、確認者、確認日、確認手段、品質等級、除外範囲が残っている
- prompt入力に、expected、切り抜き由来情報、照合結果由来情報が混入していない

凍結後の採点は別工程です。現在の区間選択基準は `baseline-rule` と `llm-v012` を比較対象にします。

## 判断分岐まとめ

| 状況 | 扱い |
| --- | --- |
| STTサーバーへ接続できない | 停止してユーザーへ起動を依頼する |
| 元動画URLが見つからない | Web検索やWeb版Geminiで候補探索。候補探索止まりで、凍結はしない |
| 切り抜きSTTにノイズや追加音声がある | 正常なノイズとして扱い、照合から外れても異常扱いしない |
| DPが短い一致を大量に出す | 素材ブロック候補に留め、人間確認へ出す候補を絞る |
| DP候補を人間が違う素材と判断 | false positiveとして除外し、expectedには入れない |
| STT 0語または比較材料なし | 人間確認に置かず、証拠不足として採点対象外にする |
| crossfadeで素材が切り替わる | 素材切り替わりとして扱い、transition noteを残す |
| 同一素材内の詰め | expected境界にせず、内部詰めとして注記する |
| 境界が±1秒未満で揺れる | 品質等級を素材ブロック粒度として記録する |
