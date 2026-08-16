# ZEVO字幕品質v002 v011 F局所正式attempt前record v001

- 日付: 2026-08-12
- 通信: 0回
- 費用: US$0
- 描画: 0回

## 1. 正本とproof

- 追補v011 SHA-256: `61f2c3ddbe5a3bcb2bfaba39e0ce1cc2e18a77fb2f1f5337d3fd166044b41010`
- proof期待/一意: 489/489
- 重点owner: ZCQ001=22、ZCQ007=17、ZCQ018=30、ZCQ027=34、ZCQ042=36、ZCQ044=35
- proof置換: V10 7件失効、V11 7件追加、総数増減0

## 2. bindingとschema byte照合

- proof formal jobのapproved contract: production/testとも12件exact
- 12文書の現物SHA: 登録値と12/12一致
- v011のsource authored export: 6件
- F testの期待export: 文書byteから得た6件と一致
- wrapper descriptor期待: own property exact 7件、named getter 6件、setter 0件、`__esModule` readonly、symbol 0件を検査sourceへ接続済み
- formal Fのreport root/output root: いずれも未使用

## 3. 固定TSX物理import実測

- source authored named: 6件exact
- runtime namespace: named 6件+`default`一件exact
- wrapper own property: named 6件+非列挙`__esModule`一件exact
- named 6件: getter、setterなし、enumerable=true、configurable=false、返却参照一致
- `__esModule`: value=true、enumerable=false、configurable=false、writable=false
- symbol: 0件
- formal capability object: 19 key、object/関数ともfreeze済み

## 4. 起動前checklist

- ネイティブ: Darwin arm64
- 固定Node: 登録path・SHA一致
- 固定TSX: 絶対path・SHA一致
- `NODE_OPTIONS`: 不存在
- Chromium: 登録SHA一致、headless起動成功、終了0
- FFmpeg/FFprobe: `/opt/homebrew`実体へ解決し、登録SHAと一致

最初の診断commandは内側にlogin shellを使ったためPATHが`/usr/local`系へ上書きされた。これは正式checklistに採用せず、login shellを除いた同一ネイティブ環境で再計測し、上記の登録済み`/opt/homebrew`系一致を得た。コード・job・正式成果物の変更は伴わない。

## 5. 判定

v011裁定1〜5との一致は6/6、新たな契約判断は0件。F局所正式attemptを開始できる。
