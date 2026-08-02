# speaker_only縦型一本・実装前契約停止報告 v001

日付: 2026-07-29

## 結論

承認された連続作業は、実装前照合で停止した。

停止理由は、今回必要な「縦型幅を入力にすること」「画面型IDを正式台帳からcrop・指示書・rendererまで通すこと」が現行契約に存在せず、既存横型契約を改訂しないと正式経路を構成できないためである。これはkawafmmが指定した停止条件「契約改訂が必要」に該当する。

API通信、`countTokens`、Gemini生成、正式台帳登録、コード変更、正式動画生成は行っていない。費用はUS$0。

## 1. 到達地点

読み取り専用の実装前照合まで完了した。

- 人間合格値: `speaker_only`、1行最大7文字、最大2行、134px、縁11px、光彩17px
- crop正本候補: `type-crop-v006/crop-decision-v006.json`
- 元発話: 281文字・2まとまり・境界候補164件
- 基礎映像: candidate 59の約51.6秒
- 既存横型の完成経路: B5/B6、B1、B4、v003描画、QC 6項目まで実績あり

ここから先の正式登録・通信・描画へは進んでいない。

## 2. 確認した事実

### 2.1 正式字幕入力は行幅36と横型presetを固定している

`evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs` は、次を定数として扱う。

- preset: `normal-landscape-readable-pop-v001`
- 1行の最大論理幅: `36`
- 最大行数: `2`

生成する意味入力にも36を記録し、読み戻し検査でも36との一致を必須とする。幅14へデータだけを差し替えると正式検査を通らない。

### 2.2 B1受入も行幅36と横型presetを固定している

`evals/clip_composition/presentation_caption_semantic_output_v001.mjs` は、次を受入条件にする。

- 意味入力の最大論理幅が36
- 幅方針のpresetが`normal-landscape-readable-pop-v001`
- 幅方針の最大論理幅が36

B5のrequest生成処理自体は別の幅をデータとして読めるが、その回答を現行の正式B1へ渡すと、縦型幅の来歴を正式に保持できない。B1を迂回して通すことは、正本計算の複製または検査回避になる。

### 2.3 B4表示計画は横型台帳を固定している

`evals/clip_composition/presentation_caption_display_pair_v003.mjs` は、次を固定している。

- 台帳path: `normal-landscape-preset-registry-v001`
- format: `normal-landscape`
- preset: `normal-landscape-readable-pop-v001`

新しい縦型台帳path、preset ID、画面型IDをjob入力から選ぶ入口はない。

### 2.4 現行正式台帳は画面型IDを持たない

現行`presentation-preset-registry-v001`はcanvas・format・presetを持つが、`speaker_only / screen_speaker / speaker_pair`を表す`screenLayoutId`を正式な選択入力として持たない。

任意fieldをJSONへ足すだけでは、検査もrendererもその値を読まないため、「型IDを正式に登録して照合した」ことにはならない。

### 2.5 現行正式rendererはcrop decisionを入力に持たない

`evals/clip_composition/render_presentation_review_v003.mjs` は、横型の基礎映像へ字幕PNGを重ねる。review requestには`cropDecision`または`screenLayoutId`のbindingがなく、縦型cropを正式入力として検査する入口がない。

確認用previewは`runner/src/screen-layout.ts`の共通crop処理を呼んでいるが、候補専用scriptである。これを正式実装として流用することは、今回の明示条件に反する。

### 2.6 現行B6の理論上限はUS$0.50をわずかに越える

保存済みのcandidate 59横型B5実測値と単価を使うと、現行request上限は次のとおり。

- 入力: 7,474 token × US$1.50 / 1M
- 最大出力: 65,536 token × US$7.50 / 1M
- 合計理論上限: **US$0.502731**

実際の前回B6費用換算はUS$0.041451だったが、今回の縦型入力token数は未計測で、生成時のthinking量も事前確定できない。現行のまま「US$0.50を越えない」と保証できないため、費用上限の停止条件にも該当する。

## 3. 推測

縦型281文字の実費は、前回横型と同程度ならUS$0.50を大きく下回る可能性が高い。ただし、これは過去実績からの推測であり、上限保証ではない。

縦型幅14では意味まとまりと行数が増えるため、横型より出力tokenが増える可能性がある。増加量は未実走のため不明。

## 4. 未確認

- 縦型幅14の入力token数
- Geminiが返す意味まとまり数、1行／2行比率
- B4物理違反の件数
- 51.6秒縦型全編の描画結果
- 完成動画の見た目と聴感
- 実際のAPI課金額

## 5. 正式に進めるため必要な版改訂

必要なのは候補59専用patchではなく、次の版付き契約を一度に閉じることである。

1. **縦型preset台帳契約**
   - formatを`vertical-short-1080x1920`として持つ。
   - `screenLayoutId`を入力値として持つ。
   - 許可する型IDは3型だが、v001で登録するpresetは`speaker_only`だけにする。
   - crop decisionの型IDとpresetの型IDを照合する。

2. **字幕幅入力契約**
   - preset台帳の認定値から最大論理幅14・最大2行を意味入力へ束縛する。
   - B1は固定36ではなく、束縛済み入力値との一致を検査する。
   - 横型の正式成果物は変更せず、新しい版の縦型経路だけに適用する。

3. **表示計画契約**
   - registry path、registry version、preset ID、format、screenLayoutIdをjob入力から受け取る。
   - 固定文字列やcandidate 59固有値をコードへ焼き込まない。

4. **縦型renderer入力契約**
   - crop decisionをSHA付き正式入力にする。
   - cropは既存の共通`buildLayoutVideoFilter`を唯一の計算正本として呼ぶ。
   - crop済み1080×1920映像へ、既存の共通描画・QCを適用する。
   - 横型v003経路と保存済みcandidate 13・59成果物は不変にする。

5. **費用上限契約**
   - B5の実測入力token後、US$0.50を越えない送信条件を事前固定する。
   - thinkingを含む出力費用を保証できない設定なら通信前に停止する。
   - 独自係数による期待費用への置換は行わない。

## 6. 停止条件との対応

| 停止条件 | 結果 |
|---|---|
| 費用上限超過見込み | 現行の理論上限US$0.502731のため該当 |
| 契約改訂が必要 | 字幕幅・台帳型ID・表示計画・renderer入力で該当 |
| 正本計算の複製が必要 | 複製せず停止 |
| candidate 13・59横型成果物への影響 | 変更前に停止したため影響0 |
| 同一実行点の人間判断停止2回 | 今回は1/2 |

## 7. 今回変更したもの

- `DECISIONS.md`: 承認範囲と停止事実を1行記録
- 本停止報告

コード、正式台帳、正式成果物、既存横型成果物は変更していない。

## 8. 次の人間判断

必要な判断は1件だけ。

上記5領域をまとめた**縦型正式経路の版付き契約設計**へ進むか。

承認された場合も、まず設計で値・入力・検査・費用上限を閉じる。契約を黙って変更しながら実装することはしない。

