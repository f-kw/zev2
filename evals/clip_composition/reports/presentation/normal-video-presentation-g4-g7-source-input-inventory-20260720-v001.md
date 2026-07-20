# 通常動画版 G4〜G7 元配信側入力 棚卸し v001

日付: 2026-07-20

状態: **読み取り棚卸し完了。人間確認済みの正確な教師→元配信対応が5件とも未凍結のため停止。入力生成・実装・動画解析・LLM実走なし。**

## 1. 目的と停止条件

凍結済みGT-01〜05を、教師切り抜きの映像を生成入力へ漏らさず、未編集元配信の発話・構造化情報だけで検査できるかを確認した。既存ファイルの読み取りだけを行い、教師時刻から元配信時刻を比例換算・補間・推測していない。

次のいずれかが欠けた場合は入力を作らず停止する。

- 教師の一点・区間を元配信側の発話へ対応させた、人間確認済みの対応。
- G5の情報種別、G6の話者対応、G7の利用可能素材と参照先対応。
- 元配信の未編集媒体と発話台帳。

## 2. 5件の棚卸し

| GT | 元配信媒体・発話 | 既存の対応記録 | 検出入力の不足 | 判定 |
|---|---|---|---|---|
| GT-01 / G4肯定 / `nE_bNeBNp4E` 00:12:30 | `qdczJpv8RCc`の動画とローカルSTTあり | 発火点は人間採用済みblock 7（教師706442〜759546ms、元配信4730747〜4787332ms）の内側 | block内には内部の詰めがあり、一点750000msに対応する元配信発話は人間確認されていない | `unscorable_source_mapping` |
| GT-02 / G4抑制 / `9dtwF5Exu5w` 00:15:49 | `o8rZAhARXAc`の動画とローカルSTTあり | 発火点949000msは採用block 29の終了936132msとblock 31の開始1021834msの間。block 30は966892ms開始で人間却下 | 発火点を含む採用済み素材対応が存在しない | `unscorable_source_mapping` |
| GT-03 / G7 / `tljIGk4y5Do` 00:09:08 | 教師動画だけあり | 元配信候補、元配信STT、教師→元配信対応が未登録 | 発話台帳、利用可能素材台帳、参照先と素材の確認済み対応がない | `input_not_available` |
| GT-04 / G5 / `UpRyakf5j80` 00:00〜00:12（対比00:16〜00:40） | `kNX-wQTvsws`の55秒スライスとYouTube字幕由来発話あり | 音声比較で元配信3:09:17付近との同一素材を確認した記録はある | 教師の2区間に対応する元配信発話の人間確認済み範囲と、`listener-comment`/`streamer-response`の構造化入力がない | `unscorable_source_mapping` + `information_type_not_available` |
| GT-05 / G6 / `nOEWCNc77MI` 00:01:50〜00:01:54 | `YE-faluP7zY`の動画とローカルSTTあり | 110000〜113446msは人間採用済みblock 8内、残り554msは同block外。元配信側は3180410〜3190215ms | 区間全体の確認済み対応がなく、発話はほぼ`SPEAKER_00`でマリン/ころねの話者対応を保持していない | `unscorable_source_mapping` + `speaker_binding_not_available` |

## 3. 処理別の準備状態

### 意味モデルで検査する3件

- GT-01: 元配信とSTTはあるが、発火点を元配信発話へ固定できない。
- GT-02: 正解点が採用素材ブロック外で、既存confirmed対応を利用できない。
- GT-03: 元配信、STT、素材台帳のすべてが未整備。

よってG4×2件・G7×1件はいずれも、現状のまま実走して採点できない。

### 決定的な配管を検査する2件

- GT-04: G5の情報種別フィールドが元配信側にない。LLMで本文から再推測するのは禁止。
- GT-05: G6の人物別話者IDが元配信側にない。単一の`SPEAKER_00`を複数人へ推測分割するのは禁止。

よってGT-04・05はモデル用プロンプトの問題ではなく、構造化入力と対応関係の不足である。

## 4. 人間確認の不足件数

将来、5件を1セッションで確認できる媒体へまとめる場合の**確認項目は5件**（GTごとに1件）である。各項目で、教師の一点・区間と元配信側の対応を確定する。GT-03では利用可能素材との対応、GT-04では情報種別、GT-05では話者対応も同じ項目内の必須欄にする。

ただし、現時点ですぐ人間へ依頼できる状態ではない。GT-03の元配信・素材台帳、GT-04の情報種別を保持する入力、GT-05の話者候補を先に用意する必要がある。これらの整備は今回未承認のため開始しない。人間作業は今回0件。次の確認パッケージを作る場合も5件・1セッション上限内だが、作成前に別承認を得る。

## 5. 結論

設計上の次段は検出器実装ではなく、**正解を漏らさない採点側対応と、元配信単体由来の構造化入力の整備**である。現在のデータを使って動かすと、教師時刻の推測対応、G5/G6の再推測、G7の教師素材代用のいずれかが必要になり、既存原則を破る。したがって本棚卸しで停止する。

## 6. 根拠

- `outputs/presentation/g4-g7-ground-truth-v001/ground-truth-v001.json`
- `fixtures/nE_bNeBNp4E_multiblock_material_v001/fixture.json`
- `fixtures/9dtwF5Exu5w_multiblock_material_v001/fixture.json`
- `fixtures/nOEWCNc77MI_multiblock_material_v001/fixture.json`
- `fixtures/UpRyakf5j80_clip_audio_v001/fixture.json`
- `outputs/multiblock-material-fixture-freeze-preview-nE_bNeBNp4E_multiblock_material_v001-20260715-human-confirmed-freeze-v001.json`
- `outputs/multiblock-material-fixture-freeze-preview-9dtwF5Exu5w_multiblock_material_v001-20260712-human-confirmed-freeze-v001.json`
- `outputs/multiblock-material-fixture-freeze-preview-nOEWCNc77MI_multiblock_material_v001-20260711-human-confirmed-freeze-v001.json`
- `reports/audio-compare-chunks-UpRyakf5j80_audio_confirmed_20260705_v002.md`
