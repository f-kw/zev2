# ZEVO字幕品質v002 v012 F局所正式attempt前record v001

- 日付: 2026-08-13
- 通信: 0回
- 費用: US$0
- 描画: 0回

## 1. 正本・proof・来歴

- 追補v012 SHA-256: `668158f99ff6bacafe2ccbc9f182493a191fd3896469a972117714c86427d27f`
- proof期待/一意: 489/489
- 重点owner: ZCQ001=22、ZCQ007=17、ZCQ018=30、ZCQ027=34、ZCQ042=36、ZCQ043=12、ZCQ044=35
- proof置換: V11の7件を失効しV12の7件へ一対一置換、総数増減0
- approved contract binding: source/B5/B6/selection/proof = 11/11/12/13/13
- implementation binding: source/B5/B6/selection/proof = 36/11/19/41/51

proof 489件の文書byte抽出、ID一意性、owner別件数は固定Nodeで再計算し、全項目が追補v012と一致した。

## 2. 観測契約の閉包

- Fの返却envelopeだけへ`innerObservation`一fieldを追加した。
- staging取得前では固定checkpoint、固定operation、workspace相対target、許可errnoのexact 4 fieldをfreezeして返す。
- staging取得後と正常完了では`null`を返す。
- completion、rejected report、fatal observationの保存schemaへ同fieldを転記しないことを検査へ固定した。
- 不一致時のTAP diagnosticは4 fieldだけを構造化表示し、生message、stack、stderr、本文、secretを出さない。
- F moduleのsource authored named exportは従来6件exactのままで、固定TSXによるimport照合に合格した。

よって返却envelopeの拡張は保存成果物schemaの変更を強制せず、契約判断を要する事項は0件だった。

## 3. fixture・実体preflight

- 環境preflight: `presentation-zevo-caption-quality-v002-v012-f-u-environment-preflight-20260813-v004.json`
- 同SHA-256: `675f1c9aaeb919415f3d330111c70ffafedb51f6839e1bd3115bea956d7c0946`
- 読み取り対象: 97/97
- runtime実体: 7/7（登録SHA一致）
- implementation実体: 51/51
- directory前提: 5/5
- 正式output/staging未使用: 2/2
- F正式attempt rootとfixture rootは新規版付きpathで、正式開始前は空である。

## 4. 起動前checklist

- native環境: Darwin arm64
- 固定Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`、登録SHA一致
- 固定TSX: `/Users/kawafmm/workspace/zev2/runner/node_modules/tsx/dist/cli.mjs`、登録SHA一致、絶対path起動
- `NODE_OPTIONS`: 不存在
- Chromium: 登録SHA一致、headless `about:blank`起動成功、終了0
- FFmpeg: `/opt/homebrew/Cellar/ffmpeg/8.0.1_1/bin/ffmpeg`へ実体解決、登録SHA一致
- FFprobe: `/opt/homebrew/Cellar/ffmpeg/8.0.1_1/bin/ffprobe`へ実体解決、登録SHA一致
- ImageMagick: 登録実体へ解決、登録SHA一致
- shellはlogin modeを使わず、固定NodeをPATH先頭、`/opt/homebrew/bin`を`/usr/local/bin`より前に置いた。

## 5. 判定

v012裁定1〜4との一致、proof会計、返却と保存schemaの分離、fixture・環境前提、起動条件の全項目が合格した。F局所3件の正式attempt-0004を開始できる。
