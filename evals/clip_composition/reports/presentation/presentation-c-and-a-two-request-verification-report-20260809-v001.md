実行した:
いいえ

実行できなかった場合:
本レポート作成時にはZEV本体UIを起動していない。C工程の動画生成は直前の実行で完了済みであり、今回は保存済み動画・QC・来歴を読み取り再照合した。A工程は契約衝突を検出して実装前に停止したため、A完成動画は存在しない。

代替で確認した内容:
C工程の横型・縦型mp4の現物SHA、尺、解像度、映像・音声stream、QC 6項目、正式検査・回帰の保存報告を確認した。A工程はVAD実測、STT文字atomとの重なり、現行意味packageとZEVOの拒否条件、停止報告、記録commitを確認した。

---

# 完成物検証レポート

## 1. 結論

**一部ズレあり**。

C工程は、タイトル`全部やりかけ`を横型・縦型へ載せた動画2本とQC 6/6まで機械完了している。全編の人間目視と安定tagは未実施である。

A工程は完成していない。candidate 59で見つかった短い発話不在6件が全て字幕の文字atom途中にあり、現契約では正当に切れないため、実装前の安全停止となった。これはproductionの退行ではなく、新しい契約判断が必要な境界発見である。

## 2. ユーザーから見た変化

### 依頼1: C工程（タイトル）

- candidate 59の同じ内容を、横型と縦型の両方でタイトル付き動画として確認できるようになった。
- タイトルは`全部やりかけ`で、動画冒頭6秒だけ上部に1回表示される。
- 元の字幕、映像frame数、音声packetは維持されている。
- タイトル文言は仮置きであり、人間が採用または差し替えできる構造である。

### 依頼2: A工程（無音・間の調整）

- 層1の正式凍結は解除され、VADを削除器ではなく候補提示器として使う方針まで記録された。
- candidate 59では、現在の文字・字幕契約を守ったまま切れる候補が成立しなかった。
- 無理に短縮せず、別区間で実証するか、文字atom・字幕をまたぐ切断契約を新設するかを選ぶ状態になった。

## 3. 実行した操作

1. C工程の横型・縦型mp4をSHA-256で再照合した。
2. 2本を`ffprobe`で読み、尺、解像度、映像・音声streamを確認した。
3. 横型・縦型のQC記録を読み、タイトル本文、表示、配置、frame、音声の6項目が合格していることを確認した。
4. C工程commitとA工程停止記録commitの変更範囲を確認した。
5. A工程の停止報告、契約設計draft、DECISIONSの凍結解除記録を確認した。

本レポートでは動画生成、API通信、コード変更、再検査、UI起動を行っていない。

## 4. 保存データの確認

### C工程

- 横型動画: `evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-landscape-v002-output/title-rendered-v001.mp4`
- 横型QC: `evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-landscape-v002-output/title-output-qc-v001.json`
- 縦型動画: `evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-vertical-v002-output/title-rendered-v001.mp4`
- 縦型QC: `evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-vertical-v002-output/title-output-qc-v001.json`
- 意味情報package: `evals/clip_composition/outputs/presentation/meaning-information-packages/qdczJpv8RCc-candidate-59-c-title-v001-meaning-information/meaning-information-package.json`
- C完了報告: `evals/clip_composition/reports/presentation/presentation-zevo-title-c-completion-verification-report-20260809-v001.md`

素材は`qdczJpv8RCc`、元区間は`sourceStartMs=5941162`、`sourceEndMs=5992736`で、横型・縦型とも同じcandidate 59へ束縛されている。

### A工程

- 停止報告: `evals/clip_composition/reports/presentation/presentation-a-candidate59-vad-contract-stop-report-20260809-v001.md`
- 契約設計draft: `evals/clip_composition/reports/presentation/presentation-a-timeline-composition-silence-trim-contract-design-draft-20260809-v001.md`
- B工程用の副線資料: segment役割、変化量来歴、fixture選定条件の3文書。

Aの正式候補記録、採用区間列、描画job、完成動画は未生成である。

## 5. UI確認

実行した: いいえ。

C工程は評価環境の版付きjobとrunnerで生成されており、本レポートではZEV本体UIを起動していない。保存済み完了報告には冒頭静止画で横型・縦型ともタイトル表示を確認した記録があるが、全編の人間目視は未実施である。

A工程は実装前停止のため、確認UIは存在しない。

## 6. 出力動画の確認

### C横型

- SHA-256: `d58fd412fa71208f67e01ef230ebf349233e3997618d68dd1839e586f3540234`
- 尺: 51.566016秒
- 画面: 1920×1080、30fps
- 映像・音声stream: あり
- QC: 6/6合格

### C縦型

- SHA-256: `f14624f4edd0ff1bcc24885b7ea593b52487e8e52f8ac183454f015c67060053`
- 尺: 51.566016秒
- 画面: 1080×1920、30fps
- 映像・音声stream: あり
- QC: 6/6合格

両動画とも、元動画と出力動画のframe数は1,547で一致し、音声packet payload SHAも一致している。

A工程の横型・縦型動画は生成していない。

## 7. 正本の分離確認

- C工程でZEVGが供給したものはタイトル文字列であり、表示位置・時間・折り方はZEVO側の正式jobとstyleが所有している。
- A工程では、VAD観測、意味による除去可否、採用された元区間列、ZEVOの表示・接続を別責務として設計draftへ分離した。
- ZEVGのA出力へhard cut等の見せ方を入れず、初版の繋ぎ表現はZEVO style側が所有する形に訂正済みである。
- 既存の候補プール、候補選抜ログ、`comparisonItems`等は今回のC/A経路の合否対象ではなく、本報告へ混載していない。

## 8. 合格判定チェック

1. Cのタイトル文字列が意味情報packageに保存される: OK
2. 横型と縦型で同じタイトル文字列を使う: OK
3. 表示方法をZEVO側が所有する: OK
4. 元の映像frame数を維持する: OK
5. 元の音声packetを維持する: OK
6. 横型QC 6項目: OK
7. 縦型QC 6項目: OK
8. C完成2本の人間目視: 要確認
9. AでVADを自動削除器にしない: OK
10. Aで過去の400ms／120ms／2秒を新品質閾値にしない: OK
11. Aで契約外の文字atom途中切断を行わない: OK
12. Aの実データ時間圧縮: 未完成

## 9. 問題点

問題: A工程で、candidate 59の短い発話不在を切ると文字atom・字幕区間を途中で分断する。

該当箇所: 400ms以上のmode 0/3共通候補6件。最長800ms。

なぜ問題か: 現行意味packageはatomの部分交差を拒否し、現行ZEVOは1字幕区間を複数segmentへ分けて写像しない。独自判断で切ると、意味情報と表示時刻の対応が壊れる。

再現手順: A停止報告と契約設計draftのcandidate 59実測表を参照する。

修正案: 推奨は、人間合格済みの旧v3安全区間をA初回実証素材に使うこと。candidate 59を維持する場合は、文字atom・字幕をまたぐ切断のforward-only契約を先に設計する。

優先度: 高。A工程の実装開始条件である。

## 10. まだ未実装のこと

- A工程の候補観測成果物、意味採否、採用元区間列の正式schemaとproduction入口。
- A工程による横型・縦型の時間圧縮動画。
- candidate 59で文字atom・字幕をまたぐ無音を扱う契約。
- Cタイトル候補のLLM生成と人間による選択・部分修正の運用。
- C完成2本の人間目視合格と安定tag。

## 11. 参考: 不足している可能性のある機能

1. **Aの文字・字幕再構成**
   - 根拠: candidate 59の6候補が全て文字atom内部にあることを実測。
   - ユーザー影響: candidate 59をそのままA実証に使えない。
   - 扱い: 確認済みの未実装契約。production不具合ではない。
2. **Aの正式runtime束縛**
   - 根拠: 今回のVADは`webrtcvad-wheels==2.0.14`を一時環境で診断した。
   - ユーザー影響: 正式jobとして再現可能な候補記録をまだ作れない。
   - 扱い: 完全実装時に必要な未実装項目。
3. **C完成物の人間目視**
   - 根拠: 機械QCは合格したが、全編目視は未実施。
   - ユーザー影響: タイトルの見た目と文言を最終採用できない。
   - 扱い: 検証待ち。欠陥とは未確認。

## 12. 次に直すべきこと

1. Cの横型・縦型2本を人間がまとめて目視し、タイトルの見た目と文言を採否する。
2. A初回実証を、保存済みの人間合格v3区間へ変更するか決める。推奨は変更する案。
3. candidate 59を維持する場合だけ、文字atom・字幕をまたぐ切断契約を別途起草する。

人間判断は、Cの2本目視とA方針1件である。

## 13. 実行コマンドとテスト結果

成功:

```text
shasum -a 256 evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-landscape-v002-output/title-rendered-v001.mp4 evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-vertical-v002-output/title-rendered-v001.mp4 evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-landscape-v002-output/title-output-qc-v001.json evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-vertical-v002-output/title-output-qc-v001.json evals/clip_composition/reports/presentation/presentation-zevo-title-c-completion-verification-report-20260809-v001.md evals/clip_composition/reports/presentation/presentation-a-candidate59-vad-contract-stop-report-20260809-v001.md
```

```text
/opt/homebrew/bin/ffprobe -v error -show_entries format=duration:stream=index,codec_type,width,height,r_frame_rate -of json evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-landscape-v002-output/title-rendered-v001.mp4
```

```text
/opt/homebrew/bin/ffprobe -v error -show_entries format=duration:stream=index,codec_type,width,height,r_frame_rate -of json evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-vertical-v002-output/title-rendered-v001.mp4
```

```text
git show --stat --oneline --no-renames 6b366d3cf309112fa3ba637733b9d303e04d7983
git show --stat --oneline --no-renames 3da8b1f50d76f15ad25d918f1e1823c06b694213
```

結果:

- C動画2本のSHAは完了報告・QC記録と一致。
- 尺、解像度、映像・音声streamは期待どおり。
- C commitはタイトル経路と完成成果物、A commitは凍結解除・停止記録・設計資料だけを含む。

失敗:

- なし。

未実行:

- ZEV UI起動。
- 動画再生成。
- 正式検査の再実行。
- API通信。
- ChatGPT投稿。投稿先・投稿コマンドの指定がないため実施していない。

## 14. 証拠

- C完了commit: `6b366d3cf309112fa3ba637733b9d303e04d7983`
- A停止記録commit: `3da8b1f50d76f15ad25d918f1e1823c06b694213`
- C完了報告SHA-256: `1ec28265f3b94c7edd62e8ffedc31c640b47e5905e9a44a9c85fbc0d5796d7f9`
- A停止報告SHA-256: `467c68fa130db534c82242536019544a765791abd6cbadb16b16b33153ad9c06`
- C横型動画SHA-256: `d58fd412fa71208f67e01ef230ebf349233e3997618d68dd1839e586f3540234`
- C縦型動画SHA-256: `f14624f4edd0ff1bcc24885b7ea593b52487e8e52f8ac183454f015c67060053`
- 横型QC記録SHA-256: `13e52fa270b45ef7a3f52417b02cc11416b5de8c438648c2da6a4c9b00169d3c`
- 縦型QC記録SHA-256: `2b043ee548f1f81d28f6ef22050155b5275f9b485efceb95183faa57b03c8714`

事実: C機械工程は完了し、Aは契約衝突で実装前停止した。

推測: candidate 59の長い文字atom時刻はSTTの配分誤差を含む可能性があるが、切断根拠には使っていない。

未確認: Cタイトルの全編見た目、candidate 59の短い無音を切った場合の自然さ、別素材でのA再現性。
