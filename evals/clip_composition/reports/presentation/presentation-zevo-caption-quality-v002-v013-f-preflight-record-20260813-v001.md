# ZEVO字幕品質v002 v013 F局所正式attempt前record v001

- 日付: 2026-08-13
- 通信: 0回
- 費用: US$0
- 描画: 0回

## 1. 読み取り診断

- F productionの依存一覧は現物からdirect import 19件として抽出した。直前のatomic publisher loader一件を加えると周辺load操作は20件である。
- 物理`.mjs` importerから19件を固定順で一件ずつimportし、19/19成功、errno 0件だった。
- 診断record: `presentation-zevo-caption-quality-v002-v013-dynamic-dependency-import-diagnosis-20260813-v001.json`
- 診断record SHA-256: `63ed44133755a62e5ae822ea31e77455f4df5fb009376851ac08ea15314f0282`
- この対照だけではattempt-0004の原因帰属を確定せず、正式attemptの依存単位観測を待つ。

## 2. 正本・proof・来歴

- 追補v013 SHA-256: `77e579582fdfaad131172564b8ce81790db6b779540f338244cbc65b0d1c7501`
- proof期待/一意: 489/489
- 重点owner: ZCQ001=22、ZCQ007=17、ZCQ018=30、ZCQ027=34、ZCQ042=36、ZCQ043=12、ZCQ044=35
- proof置換: V12の7件を失効しV13の7件へ一対一置換、総数増減0
- approved contract binding: source/B5/B6/selection/proof = 12/12/13/14/14
- implementation binding: source/B5/B6/selection/proof = 36/11/19/41/51
- path 17、code 49、検査ID 46、owner件数は増減0

追補v013を含む文書byteからproof 489件を再導出し、ID一意性・owner別件数・7件の失効置換を機械照合した。全formal jobの来歴配線へv013を一件追加し、role狭義昇順を維持した。

## 3. 観測実装の閉包

- 19 direct importを一つのfreeze済みprivate閉集合へ置いた。
- importは固定順で一件ずつawaitし、各import直前に現在依存のworkspace相対pathをv012返却観測へ設定する。
- 一件失敗時は後続importを行わず、当該pathを保持したまま外側fatalへ返す。
- 全件成功時のkey、module namespace参照、後段consumerを変更していない。
- checkpoint/operation語彙の追加0、staging前書込0、保存report schema変更0、生message・stack・stderr・本文・secret保存0を維持した。
- F productionのsource authored named exportは従来6件exactのままで、固定TSXによる物理import照合に合格した。

## 4. fixture・実体preflight

- 環境preflight: `presentation-zevo-caption-quality-v002-v013-f-u-environment-preflight-20260813-v005.json`
- 同SHA-256: `f1b4e5a1260f953a17d961af04e0687f12f45e7a62df88919c80a2a9f176afcb`
- 読み取り対象: 98/98
- runtime実体: 7/7、登録SHA一致
- implementation実体: 51/51
- directory前提: 5/5
- 正式output/staging未使用: 2/2
- F正式attempt rootとfixture rootは新規版付きpathで、正式開始前は空である。

## 5. 起動前checklist

- native環境: Darwin 25.5.0 arm64
- 固定Node: `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`、登録SHA一致
- 固定TSX: `/Users/kawafmm/workspace/zev2/runner/node_modules/tsx/dist/cli.mjs`、登録SHA一致、絶対path起動
- `NODE_OPTIONS`: 不存在
- Chromium: 登録SHA一致、headless `about:blank`起動成功、終了0
- FFmpeg/FFprobe: `/opt/homebrew`側の登録実体へ解決し、登録SHA一致
- ImageMagick: 登録実体へ解決し、登録SHA一致
- shellはlogin modeを使わず、固定NodeをPATH先頭、`/opt/homebrew/bin`を`/usr/local/bin`より前に置く。

## 6. 判定

v013裁定1〜3、proof会計、依存単位の対象特定、返却と保存schemaの分離、fixture・環境前提、起動条件はすべて合格した。新しいF局所正式attempt-0005を開始できる。
