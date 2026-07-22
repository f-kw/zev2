# 初回実データ基礎映像 音声時刻格子修正 実装設計 v001

- 日付: 2026-07-22
- 対象: `DmWu0jVQfTE` candidate 13で検出した48 sample内部空白欠落
- 状態: **実装承認済み。実装修正・追加検査・全回帰・正常系不変比較・正式元媒体の読み取り専用走査まで進行中。正式媒体の再生成・途中物削除は未承認**
- 人間作業: **0件・0分**

## 1. 結論

現行生成器がFFmpegの暗黙補正へ任せていた音声時刻格子の作り方をやめる。復号された実音声を連続PCMとして一度だけ取り出し、全復号frameの時刻から確定した位置へNode側で明示配置する。音声が存在しない全区間には、記録された長さと完全に同じ数のzero sampleを入れる。

これは契約変更ではなく、既存契約への適合修正である。承認済み設計はすでに「復号時刻の正の空白を同じ長さの無音として保持する」と定めている。正式組立決定、元媒体、期待する423,073,008 sample、時間対応表v002、レンダラーv002入口は変更しない。

本設計が承認された場合も、許可範囲は修正実装、合成回帰、正式元媒体の読み取り専用全時計走査、完了報告までとする。candidate 13の正式生成再試行は別承認であり、自動では行わない。

## 2. 修正対象と原因

正式元媒体の音声冒頭付近には次の構造がある。

| 種類 | sample範囲 | 長さ |
|---|---:|---:|
| 先頭空白 | `[0, 312)` | 312 |
| 復号音声1 | `[312, 960)` | 648 |
| 内部空白 | `[960, 1,008)` | 48 |
| 復号音声2 | `[1,008, 1,968)` | 960 |

元媒体全体では、連続して復号される実音声が423,072,648 sample、記録済み空白が312+48 sampleで、絶対時刻格子は423,073,008 sampleになる。

現行の`aresample=first_pts=0:min_hard_comp=0:max_soft_comp=0`は先頭312 sampleを補ったが、直後の48 sample内部空白を補わず、後続音声を1ms前へ詰めた。同型の短い合成AACでも、必要4,144 sampleに対して現方式、`async=1`、`async=1000`はいずれも4,096 sampleだった。係数変更では解消しない。

元媒体の破損、正式組立決定、人間採用Dの写像、1msという数値の大小は原因ではない。修正対象は、音声を絶対sample位置へ置かずFFmpegの補正挙動へ委ねた実装だけである。

## 3. 維持する契約と版

### 3.1 外部契約は変更しない

次を維持する。

- `presentation-base-media-build-job-v001`
- `presentation-base-media-assembly-decision-v001`
- `presentation-base-media-generation-manifest-v001`
- `presentation-base-media-validation-report-v001`
- `presentation-base-media-builder-v001`
- `presentation-base-media-timeline-v002`とchecker v002
- `presentation-renderer-v002`正式入口

理由は、外部が要求する入力、出力、時刻、空白、hash、検査の意味を変えないためである。現行manifestには、全空白区間、提示終端で切った最終音声格子のsample数・byte数・payload hash、切断前の絶対時刻格子長、末尾decoder paddingがすでにある。今回必要なのは、その宣言どおりのbyte列を作ることである。

`sourceGrid.decodedSampleCount`は、先頭空白をFFmpegが補っていた既存合成結果でも純粋な実音声数ではなく、**空白配置後・提示終端切断前の絶対時刻格子長**として使われていた。新実装でもこの実質的な意味を維持する。連続復号PCMの実音声数は内部検査と事前走査成果物へ別に記録し、既存fieldの意味を入れ替えない。

### 3.2 実装来歴

`execution.commands`は従来どおり外部FFmpeg呼出しを記録する。FFmpegは同じ`<SOURCE_GRID>`作業fileへ、空白を前詰めした連続復号PCMを出す。その後のNodeによる絶対位置再配置は、現行の提示終端切断・区間コピーと同じ`audio-grid`工程内の決定的な内部処理とする。

最終音声格子の内容は次で追跡できる。

- 元媒体のfile SHA-256
- manifestの全空白区間
- 最終格子のsample数・byte数・payload SHA-256
- 実行したFFmpeg引数
- 生成器実装fileのSHA-256とGit来歴

版を増やして旧実装も受ける分岐は作らない。修正前の挙動は既存commit、失敗記録、保持中の作業先で履歴化済みであり、実行時の後方互換は不要である。

承認済み元設計§7.2に固定されている旧`aresample`方式は、本設計が実装承認された時点で「不適合実装として置換」と追補する。承認前に元設計本文を編集しない。

## 4. 修正方式

### 4.1 配置計画の正本

元媒体の全復号音声frameを順に走査し、各frameの開始sampleとsample数から次を決定する。

1. 実音声区間の順序。
2. 先頭空白と全内部空白。
3. 最後の復号frame終端。
4. 全frameのsample数合計。

負の時刻、逆転、重複、整数sampleへ写せない時刻は従来どおり拒否する。波形の小ささを無音と推定したり、今回の2空白だけを特例で埋めたりしない。

次の完全一致を先に要求する。

```text
全frameのsample数合計
= 最後の復号frame終端 - 全空白のsample数合計
```

### 4.2 連続復号PCM

FFmpegから、時刻空白を補正しない`f32le`・interleaved・元sample rate・元channel orderの連続PCMを1回だけ作る。現行`aresample=first_pts=0...`は使わない。

連続PCMのsample数は全frameのsample数合計と完全一致させる。1 sampleでも短い・長い場合は停止する。末尾補填や切り捨てで合わせない。

### 4.3 絶対sample位置への配置

巨大な音声全体をメモリへ載せず、固定長bufferで処理する。

1. 連続PCMの各実音声runについて、元byte列のhashを配置前に記録する。
2. 同じ作業fileを最後の復号frame終端まで拡張する。
3. 後ろの実音声runから順に、絶対sample位置へbyte単位で移す。重なる移動は末尾側から処理し、まだ読んでいない元byteを上書きしない。
4. 全空白へ、長さ×channel数×4 byteのzeroを明示的に書く。file拡張時の暗黙zeroには依存しない。
5. 配置後の各実音声runを再読し、配置前hashと完全一致させる。
6. 全空白を再読し、canonical zero表現として全byteが`0x00`であることを確認する。数値比較だけで`-0.0`等の別byte表現を通さない。
7. 連続PCMの全byteを過不足なく一度ずつ配置し、最後の復号frame終端とfile長を完全一致させる。

その後だけ、既存契約どおりstream/packetが一致した提示終端で物理的に切る。decoder末尾paddingの診断と除外、選択区間のbyteコピー、AAC結合、映像だけの末尾処理は変更しない。

### 4.4 停止条件

次は既存の音声時計不正または音声品質不正として停止する。

- 連続復号PCMの長さが全frameのsample数合計と1 sampleでも違う。
- 空白または実音声runが逆転・重複する。
- 実音声runを配置した後のbyteが配置前と違う。
- zero区間に`0x00`以外のbyteが1つでもある。
- 連続PCMの読込byteが余る、または不足する。
- 配置後の全長が最後の復号frame終端と違う。
- 提示終端との差が既存のdecoder末尾padding規則で説明できない。

48 sampleの許容差化、期待423,073,008 sampleの短縮、末尾への48 sample補填、波形からの独自補正は禁止する。

## 5. 追加する検査

### 5.1 今回の構造をそのまま持つ単体検査

次の固定構造を使う。

```text
空白 [0,312)
実音声 [312,960)   648 sample
空白 [960,1008)     48 sample
実音声 [1008,1968) 960 sample
```

検査値は、実音声1,608 sample、空白360 sample、配置後1,968 sampleである。2空白の全byte `0x00`、sample 959以前と1,008以後の実音声byte不変、1,008以後を960へ前詰めしないことを確認する。

### 5.2 48 sample内部空白を持つ実media統合検査

合成AACへ次の復号構造を作る。

```text
[0,1024)
[1024,2048)
空白 [2048,2096)
[2096,3120)
[3120,4144)
```

現実装では4,096 sampleになり失敗するケースである。修正後は4,144 sample、48 sampleの全byte `0x00`、空白前後の実音声ありを要求する。既存のAAC検査を置き換えず追加する。

### 5.3 異常系

- 連続PCMが期待より1 sample短い。
- 連続PCMが期待より1 sample長い。
- 配置後の実音声runが1 byte違う。
- 空白へ`0x00`以外のbyteを1つ混ぜる。
- 配置後総数を1 sample違わせる。

各入力で意図した既存違反コードと停止位置を確認する。期待値を修正実装へ合わせて書き換えない。

## 6. 既存全回帰と結果不変検査

### 6.1 置き換えず維持する既存検査

- 正の先頭PTS。
- 3,072 sampleの大きな内部空白。
- AAC末尾padding。
- 44.1kHz / 48kHz。
- 1frame / 2frame。
- stereo左右順。
- 非連続区間の音声順。
- 音声時計欠落時にdecoded尺へfallbackしないこと。

現行基準は、基礎映像生成器20、timeline v002 15、renderer v002 19、生成器からrendererへの通し2、既存renderer・前提契約群100の**合計156トップレベル検査**である。修正後は次を直列で全実行し、追加回帰の件数と既存156件を分けて報告する。

```bash
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node \
  --test \
  --test-concurrency=1 \
  evals/clip_composition/presentation_caption_contract.test.mjs \
  evals/clip_composition/presentation_instruction_contract.test.mjs \
  evals/clip_composition/presentation_initial_preset_review.test.mjs \
  evals/clip_composition/presentation_initial_preset_finalization.test.mjs \
  evals/clip_composition/presentation_gt03_classification_sync.test.mjs \
  evals/clip_composition/presentation_source_speaker_contract_v002.test.mjs \
  evals/clip_composition/presentation_renderer_v001.test.mjs \
  evals/clip_composition/presentation_base_media_build_v001.test.mjs \
  evals/clip_composition/presentation_base_media_timeline_v002.test.mjs \
  evals/clip_composition/presentation_renderer_v002.test.mjs \
  evals/clip_composition/presentation_base_media_renderer_v002.integration.test.mjs
```

### 6.2 修正前後の不変比較

コード変更前に、現在合格している全音声正常系から比較用projectionを保存する。対象は通常44.1/48kHz、1/2frame、正の先頭PTS、既存大空白、AAC奇数frame末尾、非連続3音区間、stereo左右、30fps音声あり通しである。

修正後、同じ論理入力で次を完全一致させる。

- `base-media.mp4`と`timeline.json`のSHA-256。
- 区間のframe/sample写像。
- 最終音声格子とAAC入力のsample数・payload SHA-256。
- AAC packet payload SHA-256、提示尺、末尾方針。
- 映像frame数、channel順。
- 通し検査の描画済みMP4、描画計画、QCの意味結果。

差を許すのは、事前に列挙した生成器実装file hash、Git状態、音声復号のFFmpeg引数、実jobを分けた場合のjob ID・job file hashだけである。それ以外の差は「修正に伴う当然の差」にせず停止する。

## 7. 正式元媒体の全時計走査

修正実装と合成回帰が合格した後、candidate 13を再生成する前に、正式元媒体hash
`a2c4548d07eb387f095a198b8f6892121134c46e8c0d5315e4debf3e083234ee`
を読み取り専用で全走査する。

packet時刻だけでは今回の48 sample空白を検出できないため、次を分けて調べる。

1. **全音声packet時計**: 全packetの順番、開始、長さ、終端、重複、逆転、空白、skip/discard情報。
2. **全復号frame時計**: 全frameの順番、開始、`nb_samples`、終端、重複、逆転、先頭空白、内部空白、末尾。

走査成果物`presentation-source-audio-clock-coverage-scan-v001`には次を保存する。

- 元媒体のpath・SHA-256。
- Node・FFmpeg・FFprobe版と走査器実装hash。
- packet件数と、全行を固定表現にしたcanonical SHA-256。
- 復号frame件数と、全行を固定表現にしたcanonical SHA-256。
- 実音声sample数合計、最終復号frame終端、stream/packet提示終端。
- 全空白の`leading / internal / trailing`分類とsample範囲。
- 全重複・逆転・整数化不能の一覧。
- 既知空白`[0,312)`、`[960,1008)`、観測された追加空白の件数と一覧。
- 「実音声sample合計+全空白sample合計=最終復号frame終端」の完全一致結果。

44万件超のpacketや全frameを巨大JSONへ列挙せず、全行の件数・canonical hashと、空白・重複・逆転等の例外全件だけを保存する。未知の空白を既知2件へ丸めない。

既存preflightの全復号frame走査では空白は2件、追加0件と観測済みだが、現artifactは復号frame時計全体の件数・canonical hashと「追加0件」を独立証明していない。このため既存値を正式な事前走査完了とは扱わず、修正後に新成果物を作る。

走査結果が2件だけでも、追加空白があっても、candidate 13はその場で再生成しない。成果物path・hash、件数、追加空白、合成回帰を完了報告で申告し、人間へ再実行判断を戻す。逆転・重複・時計不一致があれば不合格として停止する。

## 8. 既存失敗物と再試行の扱い

次は診断証拠として保持し、修正実装で削除・再利用しない。

- 既存failure JSON。
- 既存build jobと正式組立決定。
- `DmWu0jVQfTE-candidate-13-v001.lock`。
- 既存working directory。
- 既存publish-tmp。

再試行が後で承認された場合は、別のjob IDと新規出力先`attempt v002`を使う。旧lockを解除して同じ出力先を使い回さない。

再試行の合格条件は次である。

- 元の絶対時刻格子423,073,008 sample。
- 全走査で観測した全空白がcanonical zero（全byte `0x00`）。
- 人間採用Dと2,535 frame・4,056,000 sampleで完全一致。
- timeline、generation manifest、validation report、renderer入口の全検査合格。

正式再試行に成功するまで、残存発話の解決パッケージ、テロップ・演出指示書、描画、残り3候補へ進まない。

## 9. 実装完了条件と停止点

本設計の実装承認後は、次を満たして完了報告を作り停止する。

1. 旧`aresample`依存を、全復号frame時計に基づく明示配置へ置換する。
2. 312+48 sample単体、48 sample実media、異常系を追加する。
3. 既存156件を削除・緩和・期待値変更なしで維持する。
4. 既存正常系の結果不変比較に合格する。
5. 全固有違反コード、決定性、CLI終了値を維持する。
6. 正式元媒体をpacketと復号frameの両方で全走査し、追加空白件数を申告する。
7. 既存失敗物を削除・再利用しない。
8. fixture、expected、confirmed、正式組立決定、人間採用D、正式台帳、binding、runner、本体を変更しない。

停止時点では、正式基礎映像、timeline、manifest、QC、演出指示書、描画はまだ存在しない。人間作業は0件である。

## 10. 今回求める判断

判断は1件だけである。

**本設計を承認し、音声格子の実装修正、追加合成検査、既存全回帰、正式元媒体の読み取り専用全時計走査、完了報告まで進めてよいか。**

承認にcandidate 13の正式再生成、旧途中物削除、演出指示書生成、描画、残り3候補への展開は含めない。

## 11. 承認記録

- 2026-07-22、kawafmmが相談役レビューを貼り付け、本設計の実装修正、追加合成検査、既存156件の全回帰、正常系結果不変比較、正式元媒体の読み取り専用全時計走査、完了報告までを最終承認した。
- 完了報告では、正常系projectionを保存した時点のcommit、比較結果、合格件数を追跡可能な形で明記する。
- candidate 13の正式再生成、既存failure・lock・working directory・publish-tmpの削除や再利用、演出指示書生成、描画、残り3候補への展開は、この承認に含まない。
