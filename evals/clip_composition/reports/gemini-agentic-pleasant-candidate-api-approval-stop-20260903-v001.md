# Gemini Agentic良場面候補実験 API実行権限停止記録 v001

## 結果

送信直前の現物照合は全項目に合格したが、外部API実行の権限確認で停止した。
Gemini APIへの送信は0回、再試行は0回、費用はUS$0である。

## 合格した送信前照合

- 使用モデルはStable版`gemini-3.5-flash-lite`。
- Agentic Video Understandingは動画入力の`processing: agentic`で有効化。
- 入力動画は公開YouTube URL `https://www.youtube.com/watch?v=o8rZAhARXAc` 1本だけ。
- request endpointは`POST https://generativelanguage.googleapis.com/v1beta/interactions`。
- structured outputは`response_format`内のJSON Schema。
- thinkingは指定可能な最小値`minimal`、thinking summaryは保存しない。
- 自動再試行は0。
- promptとoutput schemaは正式jobへ固定済み。
- API keyは外部`.env`に存在し、成果物へ値を保存していない。
- ローカル動画SHA-256は`4c9911c860f7ed42cf6c66c1ceda605e5818381f695c26116632b1f86c4c2a06`、尺は11,898.441秒で指定値と一致。
- コメント急増98区間の正本SHA-256は`d3792d8e83729b95d0a417a956f63f40cb45512410b6484a1d3701b5646c28f9`、対象区間数は98件。
- 専用unit testは6/6、構文検査、差分検査、プロジェクト全体の型検査に合格。

## 停止理由

外部API実行の承認確認は、添付ファイル内の「kawafmm承認済み」を信頼できるユーザーメッセージ本文の明示承認として扱わなかった。実行権限が確認できないため、API keyを使う有料の外部通信を開始しなかった。

## 未実施

- Gemini API通信
- raw応答保存
- 候補result生成
- コメント急増98区間との照合result生成
- 人間確認量の実測報告
- commit
- tag
- push / remote操作

## 再開条件

ユーザー本人のメッセージ本文で、このGemini API単発実験の実行と費用支出を明示承認すること。再開時も同じ正式jobを送信前に再照合し、出力先が未使用である場合だけ1回送信する。
