実行した:
はい

実行できなかった場合:

- A-v002の正式proof、横型3本・縦型字幕診断3本、QC、確認ページは既に実行済みである。
- kawafmmは確認ページで6本を目視した。エージェント自身はブラウザ制御の安全制限によりローカル`file://`動画を直接再生していない。
- 代替として、保存済み採用区間列、基礎映像時刻表、表示計画、完成動画を読み取り専用で照合し、切断の実在と字幕表示の構造を確定した。

---

# 完成物検証レポート

## 1. 結論

**一部ズレあり。**

A-v002の本体である「認定済み時刻を切断し、切断をまたぐ文字を重複・欠損させない」は、3候補すべてで成立した。kawafmmは切断を知覚できず、字幕の重複・欠損もないと確認した。読み取り専用の媒体照合でも、1.820〜2.480秒の切断が完成動画へ実際に入っていることを確認した。

一方、既に読み終わった文字が長い字幕page内に残り続けることと、日本語の語・文節を壊す改行が全候補で観測された。これはA-v002の文字保持処理の失敗ではなくZEVOの表示時間・page粒度・行折り品質の問題である。機械検査の合否範囲外だが、今回の人間完成確認の範囲内であり、全体を人間合格とはしない。

## 2. ユーザーから見た変化

今回できるようになったことは次のとおりである。

1. 一つの文字時刻の途中にある無音・間でも、人間認定済み切断時刻を丸めずに除ける。
2. 切断をまたぐ文字を左右へ複製せず、一つの文字として保持できる。
3. 切断後の映像・音声を自然に連結し、横型と縦型字幕診断へ同じ意味情報を渡せる。
4. 切断が本当に入ったかを、採用元区間列、frame写像、完成媒体の三層で追跡できる。

同時に、字幕表示がまだ「公開品質」ではないことも実物で判明した。字幕本文は正しいが、長いpageをまとめて表示するため前方の文字が残り、行折りは幅条件だけを満たして日本語として不自然になる場合がある。

## 3. 実行した操作

1. kawafmmが確認ページで横型3本・縦型字幕診断3本を目視した。
2. 人間観測として「切断を発見できなかった」「字幕の重複・欠損はない」「前の発話の文字が残る」「適切な改行ができていない」を受領した。
3. 3候補の採用元区間列と基礎映像時刻表を再読し、各削除区間の前後2区間だけが完成時刻表に入っていることを確認した。
4. 基礎映像と完成動画の尺・frame数をFFprobeで再読した。
5. 各接続点直後の1秒を元配信の「切断後」および「無切断継続」の二仮説と比較した。
6. 基礎映像と横型・縦型完成動画の全編音声を比較した。
7. 6つの表示計画を再読し、page表示時間、全文、行分割を一覧化した。
8. A-v002契約、意味／表現境界の完全実装設計、DECISIONSを照合し、今回の機械検査と人間確認の保証範囲を分離した。

診断は既存成果物の読み取りだけで、正式runnerの再実行、成果物変更、API通信、費用発生は0件である。

## 4. 保存データの確認

確認対象root:

`evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260810-v008/`

| 保存物 | 意味 | 確認結果 |
|---|---|---|
| `human-approval-v001.json` | 旧層1 v3で人間認定した3切断 | 3候補の正式jobと一致 |
| `<candidate>/source-sequence-job-v002.json` | 外側区間と削除認定 | 各候補1切断、値変更なし |
| `<candidate>/base-media-timeline-v002.json` | 切断前後を連結したframe写像 | 各候補2区間、出力上で隙間なく接続 |
| `<candidate>/base-media.mp4` | 切断済み基礎映像 | 記録SHA・frame・尺と一致 |
| `<candidate>/horizontal-formal/render-plan-v002.json` | 横型の表示時間・行折り | 長いpage残留と不自然改行を確認 |
| `<candidate>/vertical-caption-diagnostic/render-plan-v002.json` | 縦型診断の表示時間・行折り | 同型の残留と不自然改行を確認 |
| `<variant>/video.mp4` | 横型3本・縦型診断3本 | 6本実在、記録SHAと一致 |
| `<variant>/renderer-qc-v001.json` | 描画後の機械QC | 6/6 passed、違反0 |
| `review-input-v001.json` / `review.html` | 人間確認用の束縛と画面 | 3候補×2形式を表示 |

外側区間外の字幕文字混入は0件だった。各候補は外側区間全体を一つの意味字幕として保持し、横型では3page、縦型診断では6〜8pageへ分割している。

## 5. UI確認

kawafmmが確認ページを開き、6動画を目視した。

人間観測:

- 切断点は知覚できなかった。
- 字幕本文の重複・欠損はなかった。
- 前の発話の文字が画面に残っていた。
- 日本語として適切でない改行があった。

エージェントは画面を直接再生していないため、人間観測をAI観測として書き換えていない。保存済み表示計画には、人間観測と整合する長時間pageと不自然改行が実在することを別途確認した。

確認ページ:

`evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260810-v008/review.html`

## 6. 出力動画の確認

### 切断の実在

| 候補 | 元の外側区間 | 除いた時間 | 出力frame | 基礎映像の実測尺 | 完成動画上の接続点 |
|---|---:|---:|---:|---:|---:|
| `2:voice-013` | 27,640ms | 2,480ms | 755 | 25.166667秒 | 3.766667秒 |
| `5:voice-067` | 23,212ms | 1,820ms | 641 | 21.366667秒 | 9.433333秒 |
| `5:voice-190` | 29,108ms | 2,240ms | 807 | 26.900000秒 | 21.066667秒 |

各時刻表では、接続frameの直前が削除区間より前、直後が削除区間より後の元frameを指す。接続直後1秒の映像一致度は、切断後仮説が`0.993 / 0.994 / 0.993`、無切断仮説が`0.874 / 0.807 / 0.801`だった。音声も3候補すべて切断後仮説へ一致し、無切断仮説とは不一致だった。

基礎映像から横型・縦型へ渡った復号後の全編音声は6本すべて完全一致した。したがって、切断は記録上だけでなく完成mp4へ実際に入っている。

### 6動画

| 候補 | 形式 | 尺 / frame / 解像度 | SHA-256 | QC |
|---|---|---|---|---|
| `2:voice-013` | 横型正式 | 25.167秒 / 755 / 1920×1080 | `b12ec0af708af0a5afa69488b72bf55a6300bbed162877c59cc9154f79f14fcf` | passed |
| `2:voice-013` | 縦型字幕診断 | 25.167秒 / 755 / 1080×1920 | `d157a1758cb5aa964d7832eb1119913c39ac27fd53e7094eb505575a8780bc5b` | passed |
| `5:voice-067` | 横型正式 | 21.367秒 / 641 / 1920×1080 | `ff8571395187d26a609576fa107422a2aa1c05c6c7a5e17ce3928f569e643cdd` | passed |
| `5:voice-067` | 縦型字幕診断 | 21.367秒 / 641 / 1080×1920 | `e49a3424470805b2cdee3de773ecea9bbfdf7d682dda24b2a1cc1114a45a6471` | passed |
| `5:voice-190` | 横型正式 | 26.900秒 / 807 / 1920×1080 | `5745e6b282759db7b10f4af28c332225df5db8869f8784a3e527cb5ed207d9f0` | passed |
| `5:voice-190` | 縦型字幕診断 | 26.900秒 / 807 / 1080×1920 | `42d0979a6fa2283e7caa25ae73ba94b4bd764cae1393e4ddcabdeb32071da659` | passed |

縦型3本は字幕跨ぎ診断専用であり、正式preset、crop、公開品質の合格を主張しない。

## 7. 正本の分離確認

- ZEVGは、人間認定済み削除、採用された元区間列、一つの意味文字、複数の保持元時刻片、字幕本文を所有する。
- ZEVOは、元時刻から出力frameへの写像、字幕pageの表示時間、行分割、style、crop、描画を所有する。
- 切断をまたぐ`ぁ`、`が`、`ク`は、それぞれ一つの意味文字として一度だけ保持されている。
- 前方文字の長時間残留は、一つの意味字幕を長いpageで表示するZEVO側の問題であり、ZEVGの文字複製ではない。
- 不自然改行はZEVOの決定的plannerによるもので、字幕本文の改変ではない。
- `ShortDraftPlan`等の候補選抜系正本は今回のA-v002 proofへ接続しておらず、別系統の候補選抜項目を合否へ混載していない。

## 8. 合格判定チェック

1. 人間認定済み3切断を時刻変更なしで適用した: **OK**
2. 切断前後の2区間だけを基礎映像へ連結した: **OK**
3. 切断が完成mp4へ実際に反映された: **OK**
4. 切断をまたぐ文字を一度だけ保持した: **OK**
5. 字幕本文の重複・欠損がない: **OK（kawafmm目視）**
6. 切断点が自然に繋がっている: **OK方向（kawafmmは切断を知覚できず）**
7. 横型・縦型のQCが6/6合格した: **OK**
8. 既に読み終わった文字が不自然に残らない: **NG**
9. 日本語の語・文節として自然に改行される: **NG**
10. 縦型の正式preset・crop・公開品質: **対象外**
11. API通信0・費用US$0: **OK**
12. A-v002全体の人間完成合格: **未成立**

## 9. 問題点

### 問題1: 前方文字が長い字幕page内に残る

問題:
既に読み終わった前方の文字が、pageの最後の文字まで表示され続ける。

該当箇所:
全3候補の横型・縦型診断。切断接続後だけでも、同じpageが候補順に横型で約2.20秒、3.23秒、5.83秒残る。縦型診断では約0.97秒、0.33秒、3.70秒残る。

なぜ問題か:
字幕本文は正しくても、視聴者が現在聞いている発話と画面に残る文字の対応が悪くなる。切断をまたぐ1文字の連続保持に必要な時間を超え、page全体が残っている。

再現手順:
確認ページで各候補の接続点、約3.77秒、9.43秒、21.07秒の直後を見る。

修正案:
A-v002の文字保持契約は変えず、ZEVO側で字幕pageの意味単位と表示終了時刻を再設計する。個別候補の固定時刻をコードへ焼き込まない。

優先度:
高。字幕品質として人間不合格が実測されたため。

### 問題2: 日本語として不自然な位置で改行する

問題:
幅と行数は守るが、語や助詞の途中で改行する。

該当例:

- 横型: `ス / イちゃん`、`じ / ゃ報告`
- 縦型診断: `言ってほし / いみたいな`、`マリ / ンが好きなん`

なぜ問題か:
機械的に表示可能でも、読む際の認知負荷が高い。現在のplannerは日本語の語・文節自然さを保証しないと正本設計で明記されている。

再現手順:
確認ページの各候補で、横型と縦型診断の改行位置を見る。

修正案:
個別境界を修正せず、正本設計どおり、ZEVO側でAIが自然な境界候補を選ぶv002の要否を比較設計へ戻す。silent fallbackは作らない。

優先度:
高。正式横型3本にも実在するため。

## 10. まだ未実装のこと

1. 発話の進行に合わせて、既に読み終わった文字を適切な単位で切り替えるZEVO字幕page設計。
2. 日本語の語・文節を考慮した行分割。現行は幅・行数・決定性までである。
3. `screen_speaker`向けの正式縦型presetとcrop。今回の縦型3本は診断専用である。
4. candidate 59のVAD 6件をA-v002で実描画すること。
5. O1の複数区間・物語順対応。
6. 人間不合格を反映した次版の完成物とstable tag。現時点ではtagを発行しない。

## 11. 参考: 不足している可能性のある機能

| 証拠区分 | 機能 | 根拠 | ユーザー影響 | 扱い |
|---|---|---|---|---|
| 実行で確認 | 発話に追従する字幕page切替 | 長いpageが接続後最大5.83秒継続 | 前の発話文字が残る | 確認済み問題 |
| 実行で確認 | 日本語として自然な境界選択 | 全6 planに語途中の改行 | 読みづらい | 確認済み問題 |
| 仕様で確認 | AI候補選択を持つZEVO v002 | 完全実装設計§9.3が、人間不合格時に要否を戻すと規定 | 個別patchを避けて一般化できる | 将来設計候補 |
| 実行で確認 | 正式な縦型`screen_speaker`表示 | 縦型3本は全画面fitの字幕診断 | 公開用縦型としては未認定 | 今後の未実装 |
| 予約済み | O1複数区間・物語順対応 | A完了後の予約 | 遠距離接続へ未到達 | 今後の未実装 |

## 12. 次に直すべきこと

1. ZEVOの字幕page表示時間・意味単位を、前方文字が長く残らない形で設計する。
2. 決定的plannerと、AIが自然な改行候補を選ぶZEVO v002を比較し、今回の6 planをfixtureにする。
3. 上記2点を直した横型で人間確認し、合格後にA-v002の安定点化を判断する。縦型正式品質は別工程のままにする。

## 13. 実行コマンドとテスト結果

正式proofと正式92件はv001レポート記載の保存済みattempt-0012を再利用し、今回は再実行していない。

### 尺・frame・解像度

```sh
root='evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260810-v008'; find "$root" -type f \( -name 'base-media.mp4' -o -name 'video.mp4' \) -print0 | while IFS= read -r -d '' f; do printf '%s\t' "$f"; /opt/homebrew/bin/ffprobe -v error -select_streams v:0 -show_entries stream=duration,nb_frames,avg_frame_rate,width,height -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$f" | tr '\n' ','; printf '\n'; done
```

結果:
基礎映像3本と完成動画6本のframe数・尺・解像度が保存記録と一致した。

### 接続点直後の映像比較

各候補について、保存済み時刻表の接続frameと元frameを用い、切断後仮説と無切断仮説を次の処理で各1回比較した。

```sh
/opt/homebrew/bin/ffmpeg -hide_banner -loglevel info -ss <baseSeamSec> -t 1 -i '<base-media.mp4>' -ss <sourceHypothesisSec> -t 1 -i 'evals/clip_composition/research/downloads/nE_bNeBNp4E/sources/qdczJpv8RCc/qdczJpv8RCc.mp4' -filter_complex '[1:v]fps=30,setpts=PTS-STARTPTS[s];[0:v]setpts=PTS-STARTPTS[b];[b][s]ssim' -an -f null - 2>&1 | rg 'SSIM'
```

| 候補 | 接続点 | 切断後の元時刻 | 無切断の元時刻 |
|---|---:|---:|---:|
| `2:voice-013` | 3.766667 | 4086.900000 | 4084.433333 |
| `5:voice-067` | 9.433333 | 4457.100000 | 4455.266667 |
| `5:voice-190` | 21.066667 | 4613.466667 | 4611.233333 |

結果:
切断後仮説の映像一致度が3候補とも約0.993、無切断仮説は0.801〜0.874だった。

### 接続点直後の音声比較

上表の同じ6組を次の処理で比較した。

```sh
/opt/homebrew/bin/ffmpeg -hide_banner -loglevel info -ss <baseSeamSec> -t 1 -i '<base-media.mp4>' -ss <sourceHypothesisSec> -t 1 -i 'evals/clip_composition/research/downloads/nE_bNeBNp4E/sources/qdczJpv8RCc/qdczJpv8RCc.mp4' -filter_complex '[0:a]aresample=48000,asetpts=PTS-STARTPTS[b];[1:a]aresample=48000,asetpts=PTS-STARTPTS[s];[b][s]asdr' -vn -f null - 2>&1 | rg -o 'SDR ch[01]: [-0-9.]+ dB'
```

結果:
切断後仮説は高一致、無切断仮説は3候補とも不一致だった。

### 基礎映像から完成動画への音声一致

```sh
root='evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260810-v008'; for d in "$root"/layer1-v3-*; do [ -d "$d" ] || continue; echo "### $(basename "$d")"; for kind in horizontal-formal vertical-caption-diagnostic; do echo -n "$kind "; /opt/homebrew/bin/ffmpeg -hide_banner -loglevel info -i "$d/base-media.mp4" -i "$d/$kind/video.mp4" -filter_complex '[0:a]aresample=48000,asetpts=PTS-STARTPTS[b];[1:a]aresample=48000,asetpts=PTS-STARTPTS[o];[b][o]asdr' -vn -f null - 2>&1 | rg -o 'SDR ch[01]: (inf|[-0-9.]+) dB' | tr '\n' ';'; echo; done; done
```

結果:
6本すべて左右channelとも`inf dB`で、復号後PCMが一致した。

### 保存JSONの確認

`jq`で3件の`source-sequence-job-v002.json`、`base-media-timeline-v002.json`、6件の`render-plan-v002.json`を読み、削除区間、出力接続frame、page表示時間、本文、行分割を照合した。

成功:

- 読み取り診断は全て完了した。
- 正式成果物への書込み0件。
- API通信0回、費用US$0。

失敗:

- なし。

未実行:

- 正式proofと正式92件の再実行。
- 字幕修正、再描画、stable tag、O1。
- ChatGPT投稿。投稿指示と投稿先セッション名は提供されていない。

## 14. 証拠

| 証拠 | path / 値 |
|---|---|
| 機械実証v001レポート | `evals/clip_composition/reports/presentation/presentation-a-v002-layer1-v3-proof-completion-verification-20260810-v001.md` |
| 最終正式92 TAP | `evals/clip_composition/reports/presentation/test-runs/20260810-presentation-a-v002-option-b/attempt-0012/formal-92-preflight.tap` |
| proof全体の実行記録 | `.../a-v002-layer1-v3-option-b-proof-20260810-v008/proof-run-v001.json`、SHA `27d747ed2d0244d01a0d89a757d4ca0820af5450bd24d96a5fdfa4c63cbe79c7` |
| 人間確認入力 | `.../a-v002-layer1-v3-option-b-proof-20260810-v008/review-input-v001.json`、SHA `bb37481d7707b09d0b22959102d7242cba4cafa5a56f635fd44a6395e6383583` |
| 確認ページ | `.../a-v002-layer1-v3-option-b-proof-20260810-v008/review.html`、SHA `81f26b7bb60291a315329a5133a22cb2f6de19880f12790e62313eb20bbd6fa8` |
| A-v002字幕契約 | `evals/clip_composition/reports/presentation/presentation-a-v002-partial-source-atom-caption-contract-design-20260809-v001.md` |
| A-v002完全実装設計 | `evals/clip_composition/reports/presentation/presentation-a-v002-exact-implementation-closure-20260809-v001.md` |
| 読みやすさの保証境界 | `evals/clip_composition/reports/presentation/presentation-meaning-output-boundary-complete-implementation-design-20260803-v001.md` §9.3 |

### 事実

- 3候補すべての切断は完成動画へ入っている。
- kawafmmは切断を知覚できず、字幕の重複・欠損はないと確認した。
- 前方文字の長時間残留と不自然改行は保存済み表示計画に実在する。
- 機械QCはこれら二つの日本語表示品質を合否判定していない。

### 推測

- 切断を知覚できなかった理由は、無音・間の切断が自然に繋がったためと考えられる。切断の実在は推測ではなく媒体照合で確定している。

### 未確認

- 字幕表示時間と改行を直した次版の人間品質。
- 縦型`screen_speaker`の正式preset・crop・公開品質。
- A-v002全体の人間合格、stable tag、O1。
