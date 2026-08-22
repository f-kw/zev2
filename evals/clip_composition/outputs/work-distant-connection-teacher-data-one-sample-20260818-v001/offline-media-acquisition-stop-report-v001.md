# 遠方接続X5 オフライン動画取得 停止報告 v001

- 日時: 2026-08-19 JST
- 帰属: 実行環境・取得toolとYouTube現行配信方式の不整合
- 結果: 取得失敗。確認ページは未変更
- 代替手段: 未実行（指示どおり人間判断へ戻す）

## 実行した取得

- 対象: 人間確認済みfixture `XauLZgnWHtA_part01_partial_material_v001` が束縛するまとめ動画 `XauLZgnWHtA`
- URL: `https://www.youtube.com/watch?v=XauLZgnWHtA`
- 取得範囲: 274〜292秒（X5の確認済み範囲276.055〜289.838秒を外向きの整数秒へ閉じた18秒）
- 実行体: `/opt/homebrew/bin/yt-dlp` version `2025.12.08`
- 終了code: 1
- 内側FFmpeg終了code: 8
- signal: なし
- 実行時間: 約1.2秒（実行器のwall time）
- 取得file: 0件
- 取得byte: 0 byte

## 原因として確認できた事実

1. YouTubeのn challengeをdeno providerが解けず、`found 0 n function possibilities`となった。
2. yt-dlpは一部formatのURLを得られず、YouTube側のSABR streamingに関する警告を記録した。
3. 区間取得を担当したFFmpegがcode 8で終了し、yt-dlp全体はcode 1となった。
4. 出力動画は作成されていない。

## 保存証拠

- `acquisition-process-observations-v001/0001-x5-human-verified-clip-download/exit-code.txt`
- `acquisition-process-observations-v001/0001-x5-human-verified-clip-download/signal.txt`
- `acquisition-process-observations-v001/0001-x5-human-verified-clip-download/stderr.txt`
- `acquire-offline-review-media-v001.mjs`（実行command・取得元・範囲の正本）

## 未実行

- yt-dlpの更新
- 別YouTube clientの指定
- browser cookieの利用
- ブラウザまたは別toolによる取得
- 元配信2本からの個別取得
- 確認ページの変更
- オフライン再生確認

これらは代替手段に当たるため、自動選択していない。
