# 複数区間expected 人間確認パケット

- 対象: r_ztjHaHmcg
- タイトル: 同接100人いたら食べていけるの？
- 元動画候補: -DwSCDMCWDQ
- 結果JSON: outputs/multicut-expected-review-r_ztjHaHmcg-20260705-v001.json
- 候補JSON: evals/clip_composition/outputs/multicut-expected-candidate-r_ztjHaHmcg-20260705-v001.json
- Gemini確認サマリー: evals/clip_composition/outputs/r_ztjHaHmcg/visual_verification/20260705-gemini-web-flash-multicut-summary-v001.json

## 凍結判断

- 単一区間として固定: no
- 人間確認後に複数区間として固定可能: yes
- 今expectedへ固定済み: no
- 理由: 元動画側に空白があるため単一区間では固定しない。Gemini確認は揃ったので、人間の目視確認後に複数区間expectedとして固定できる。

## expectedCuts草案

| part | clip | source | review | evidence |
| ---: | --- | --- | --- | --- |
| 1 | 0:02.555-0:32.555 | 36:19.930-36:49.930 | needs_human_visual_confirmation | STT 76.4% / audio 0.298622 / confirmed_by_gemini |
| 2 | 0:32.555-1:02.555 | 38:29.360-38:59.360 | needs_human_visual_confirmation | STT 56.4% / audio 0.612458 / confirmed_by_gemini_with_response_index_mismatch |
| 3 | 1:02.555-1:32.555 | 39:21.159-39:51.159 | needs_human_visual_confirmation | STT 75.3% / audio 0.526415 / confirmed_by_gemini |
| 4 | 1:32.555-2:01.147 | 40:04.730-40:33.322 | needs_human_visual_confirmation | STT 81.6% / audio 0.593818 / confirmed_by_gemini |

## 人間確認チェック

- 4本の左右比較動画を開き、左の切り抜き側と右の元動画側が同じ元場面か確認する。
- チャンク2はGemini応答の番号だけずれているため、時刻範囲と映像内容を重点確認する。
- 4区間の元動画側に空白があるため、単一区間expectedとして固定しない。
- 確認できた場合だけ、expected/ へ複数区間expectedとしてコピーする。
- 固定テーマは、この4区間の内容から人間が1行で逆算して書く。

## 固定テーマ

- 状態: needs_human_reverse_written_theme
- 作業: 確認済みの複数区間を見て、「この切り抜き師は何をテーマとして切ったか」を人間が1行で逆算して書く。
- このパケットではAIが固定テーマを確定しない。

## 本体影響

- runtime/ への書き込みなし
- 本番UI/API/キュー/DBへの変更なし
- expected/ への書き込みなし

