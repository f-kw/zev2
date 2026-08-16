# ZEVO字幕品質v002 v014 F局所正式attempt前record v001

- 日付: 2026-08-13
- 通信: 0回
- 費用: US$0
- 描画: 0回

## 1. 読み取り診断

- 現行F productionのdirect dependencyは19件で、v013診断済み19件とordinal・key・pathが19/19一致した。
- 従来の20件目は同集合直前のatomic publisher loaderであり、診断集合の欠落ではなかった。
- 最初のsource依存は、productionとv012でF module基点のrelative literal、v013診断でabsolute file URLだった。
- 固定TSXでproduction同文脈を再現するとcode識別子なしで失敗し、物理`.mjs`対照は成功した。
- resolve、evaluate、wrapper、namespaceのいずれかまでは確定できず、推測0件のままv014の細段階観測へ進んだ。
- 診断record SHA-256: `c8cc8e409c1f5d134a57926897776e5157e3806c1f754c53a8bb763a4a37dcc9`

## 2. v014契約と会計

- 追補v014 SHA-256: `446cd7df58d61fd345a9f6ef73510c1e225ebc4f078de9d001fcb84d1ba5d7bc`
- dependency loadを`dependency-resolve`、`dependency-evaluate`、`dependency-namespace-verify`、`dependency-store`の固定4段へ分けた。
- v012の返却観測へ`errorCodeIdentifier`一件を追加し、errno名または`ERR_*`以外は`null`とした。
- V13の7 proofをV14の7 proofへ一対一置換し、proof総数489、owner件数を不変とした。
- approved contract bindingはsource/B5/B6/selection/proof=13/13/14/15/15。
- implementation bindingはsource/B5/B6/selection/proof=36/11/19/41/51。
- path 17、code 49、検査ID 46、proof総数489、owner件数は増減0。

## 3. 不変条件の実装確認

- 19件のrelative literal指定子、順序、返却key、loaderは変更していない。
- resolve照合は`new URL`と既存workspace相対化だけを使用し、新しいreaderを作っていない。
- retry、fallback、並列化、二重importは0件。
- staging前filesystem書込0件、保存report schema変更0件。
- 生message、stack、生stderr、本文、secret、絶対path、workspace外pathの返却・保存0件。
- F production/test以外のproduction計算は変更していない。全formal jobの変更は承認契約binding一件の追加だけである。

## 4. fixture・実体preflight

- 環境preflight: `presentation-zevo-caption-quality-v002-v014-f-u-environment-preflight-20260813-v006.json`
- 同SHA-256: `d4b9b6cc1afdd89f4a86ac7d3c8241852ab2fce9331d881a0ce2922972ccb1a2`
- 読み取り対象: 99/99
- runtime実体: 7/7、登録SHA一致
- implementation実体: 51/51
- directory前提: 5/5
- 正式output/staging未使用: 2/2
- F正式attempt rootとfixture rootは新規版付きpathで、正式開始前は空である。

## 5. 起動前checklist

- native環境: Darwin arm64
- 固定NodeをPATH先頭へ置く。
- 固定TSX loaderを絶対pathで`--import`する。
- `NODE_OPTIONS`は不存在。
- 登録Chromiumはnative headless `about:blank`で終了0。
- `/opt/homebrew/bin`を`/usr/local/bin`より前へ置き、登録FFmpeg/FFprobe/ImageMagickの実体とSHAを環境preflightで照合した。
- TAP、stderr、終了codeは三つの独立fileへ保存する。

## 6. 判定

診断、v014契約、会計、不変条件、fixture・環境前提、起動条件は閉じた。F局所正式attempt-0006を開始する。新しい不合格は同attemptで修正せず、観測結果に従って停止する。
