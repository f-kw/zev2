実行した:
はい

実行できなかった場合:
該当なし。機械検査・正式描画・成果物照合は実行した。
ただし、人間による全編の見た目・聴こえ方の確認はまだ実施していない。

---

# 完成物検証レポート

## 1. 結論

意図どおり動いている（機械検査範囲）。

candidate 59の同じ意味情報31件と同じ基礎映像から、横型1920×1080と縦型1080×1920を別々の表現設定で生成できた。横型は31表示、縦型は38表示へ出力側が折り直し、両方とも字幕適用・配置・映像・音声のQCに合格した。動画現物、QC、manifestのSHAも一致している。

未確認なのは、人間の目と耳による読みやすさ、cropの自然さ、音声・終端の違和感である。したがって、公開可能や人間合格とはまだ判定しない。

## 2. ユーザーから見た変化

- ZEVが作る「何を、いつ表示するか」という意味情報と、横型・縦型で「どう見せるか」を分けた新経路が、初めて実データで最後まで通った。
- 同じ51.566秒の内容を、横型は通常横長プリセット・1行幅36・cropなし、縦型は話者単独プリセット・1行幅14・人間認定済みcropで出力できた。
- 字幕の意味まとまり31件は両形式で共通のまま、画面に収めるためのページ分割だけが横31ページ、縦38ページへ変わった。
- 既存3本と既存の安定tagは変更していない。今回の成果物は新規生成専用のforward-only経路に保存した。

## 3. 実行した操作

1. `DECISIONS.md`を読み、正式描画のネイティブ実行条件と既存の工程来歴を確認した。
2. 監視対象を、元の承認済み12ファイルと大容量媒体対応の承認済み2ファイルを分けた14ファイル集合へ更新した。監視の拒否規則は変えていない。
3. 固定Node・固定TSX・`NODE_OPTIONS`なし・Chromium起動可能なネイティブ環境で、関連検査33件を先頭から1回実行した。
4. 33/33合格後、参照先の正式byte・file SHA・canonical SHA・未使用出力先を確認した。
5. 横型の工程入場、表示計画構築、正式描画、描画後QCを実行した。
6. 人間認定済みcrop v006の選択内容を変えず、新しい基礎映像への適用来歴を検査した。
7. 縦型の工程入場、表示計画構築、正式描画、描画後QCを実行した。
8. 2本の動画現物について、SHA、解像度、フレーム数、尺、音声payloadをQC記録と再照合した。
9. 今回の新規成果物と検査記録をsecret文字列で走査し、生keyが保存されていないことを確認した。

追加API通信は0回、追加費用はUS$0である。

## 4. 保存データの確認

確認した主な正本は次のとおり。

- 実行入力記録: `evals/clip_composition/outputs/presentation/meaning-output-run-input-records/qdczJpv8RCc-candidate-59-meaning-output-first-run-v001/run-input-record.json`
  - SHA-256: `5ac80deeb0daac08ea32cad7fa9b016cf04ab95ea551fa6981e6c8151ee28680`
  - 元配信: `youtube:qdczJpv8RCc`
  - candidate: 59
  - `sourceStartMs`: 5,941,162
  - `sourceEndMs`: 5,992,736
  - title: 空
- 意味情報パッケージ: `evals/clip_composition/outputs/presentation/meaning-information-packages/qdczJpv8RCc-candidate-59-meaning-output-first-run-meaning-package-v002-meaning-information/meaning-information-package.json`
  - SHA-256: `27769faadce76c5becec8ad03549300b8a037f728410ca058cc5e376cd3e9613`
  - timeline: 1区間
  - 字幕意味まとまり: 31件
  - `semanticObservations`: 0件
- 基礎映像: `evals/clip_composition/outputs/presentation/meaning-output-base-media/qdczJpv8RCc-candidate-59-meaning-output-first-run-meaning-package-v002-meaning-information/base-media.mp4`
  - SHA-256: `faad660c7623cdbf3a8f3b55cdaffc34729d06683ce391997c51f10fbc076967`
  - 1,547 frame、2,475,200 sample
- crop適用記録: `evals/clip_composition/outputs/presentation/meaning-output-crop-applications/qdczJpv8RCc-candidate-59-meaning-output-first-run-crop-v001-application/crop-application.json`
  - SHA-256: `6b24cc347c7672d1d9c1b285b192d1dcfeb6b7ceb049713aa8a5a881a75dacc2`
  - v006の`screenLayoutId=speaker_only`、`selectedCandidateId=speaker_only_body`を維持
  - source、区間、frame写像、寸法、公開来歴の10検査に合格
- B5計測manifest: `evals/clip_composition/outputs/presentation/meaning-boundary-b5-attempts/qdczJpv8RCc-candidate-59-meaning-output-first-run-b5-v001/attempt-v001/b5-manifest.json`
  - 入力92,769 token、導出最大出力48,112 token
  - 送信前上限見積りUS$0.4999935、承認上限US$0.50
- B6実走manifest: `evals/clip_composition/outputs/presentation/meaning-boundary-b6-attempts/qdczJpv8RCc-candidate-59-meaning-output-first-run-b6-v001/attempt-v001/b6-manifest.json`
  - Gemini `gemini-3.6-flash`、生成1回、再試行0
  - 実測usage: prompt 92,769、回答989、thinking 3,912、合計97,670 token
  - 公式単価による実測usage見積り: US$0.175911
  - 請求書実額は観測しておらず、これはusageに基づくlist-price estimateである

今回の新経路は候補プール／候補選抜ログを作り直す工程ではない。candidate 59の接続は、人間承認済み組立決定と実行入力記録のID・素材・区間・SHAによって追跡した。候補選抜ログ固有の`CandidateSelectionBinding`や採用理由表示は今回の検証対象外である。

## 5. UI確認

画面確認は実施していない。ZEVのUIは起動していない。

このため、UI上の文言、操作導線、2本の比較表示は未確認である。完成動画はファイルとして生成し、機械検査した。

## 6. 出力動画の確認

### 横型

- path: `evals/clip_composition/outputs/presentation/meaning-output-renders/qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v002-output/presentation-output-rendered-v001.mp4`
- SHA-256: `c324de226a63397fb83eba13b341b96aa17963bc9c1d49bd5a66987dc8338aa1`
- 尺: 51.566667秒
- 映像: H.264、1920×1080、30fps、1,547 frame
- 音声: AAC LC、48kHz、stereo、2,419 packet
- 字幕: 意味31件から31ページ・62行。31/31描画済み
- QC: 字幕適用、配置・可視性、媒体の3群すべて合格、違反0件

### 縦型

- path: `evals/clip_composition/outputs/presentation/meaning-output-renders/qdczJpv8RCc-candidate-59-meaning-output-first-run-vertical-v001-output/presentation-output-rendered-v001.mp4`
- SHA-256: `e1e3c14e73b511b7cadf24ca2cc71592eff60216168b91d25c7bbb31f0c3c58d`
- 尺: 51.566016秒
- 映像: H.264、1080×1920、30fps、1,547 frame
- 音声: AAC LC、48kHz、stereo、2,419 packet
- 字幕: 同じ意味31件から38ページ・76行。38/38描画済み
- QC: 字幕適用、配置・可視性、媒体の3群すべて合格、違反0件

両動画の音声payload SHAは`d18469bd3132356b03870ee8bc3d63e95947bd254961157e09d59cf9a53459ec`で、基礎映像・QC期待値・QC観測値が一致した。元動画範囲は両方とも`[5941162, 5992736)`msである。

このrunで新しい人間カットやAIによる区間削除はしていない。人間承認済みの単一区間を維持し、AIは意味まとまり終端だけを選び、出力側が形式別に改行・ページ分割・crop・presetを適用した。プレビューと本番の目視比較は未実施である。

## 7. 正本の分離確認

- 実データ上、意味情報パッケージには字幕本文・発話時刻・区間・空title・空の意味観測だけがあり、preset、行幅、crop、画面配置は入っていない。
- 横型／縦型のpreset、行幅、cropは出力要求側にのみあり、同じ意味情報から形式別の表示計画を組み立てている。
- `comparisonItems`、`ShortDraftPlan`、`CandidatePool`、`CandidateSelectionLedger`、`CandidateSelectionBinding`、`ReviewPacket`は、今回確認した意味情報・出力要求・描画成果物の正本として使われていない。
- `comparisonItems`から採用理由を復元した形跡、近い時刻だけで候補を接続した形跡は確認していない。
- 旧経路の正本を新形式へ暗黙変換せず、新規生成だけに新契約を適用した。

## 8. 合格判定チェック

1. 出力本数入力が廃止されている: 要確認（今回の工程外）
2. 抽出時に完成ショートが自動生成されない: 要確認（今回の工程外）
3. 候補プールが保存される: 要確認（今回の工程外）
4. 候補選抜ログが保存される: 要確認（今回の工程外）
5. 上位漏れ候補が not_selected として残る: 要確認（今回の工程外）
6. 人間が候補を選んでショート化できる: 要確認（candidate 59は既に人間承認済みだが、選択UIは未確認）
7. 完成ショートに CandidateSelectionBinding が保存される: 要確認（今回の新経路は組立決定と実行入力記録で接続）
8. 採用理由は厳密接続できる場合だけ表示される: 要確認（UI未確認）
9. comparisonItems を正本にしていない: OK（確認した新経路成果物に不在）
10. 旧データは再生成案内になる: 要確認（UI未確認）
11. sourceStartMs / sourceEndMs を使っている: OK
12. startMs / endMs を新しい正本にしていない: OK

## 9. 問題点

確認範囲では重大な問題なし。

問題: 人間による見た目・聴感が未確認
該当箇所: 横型・縦型の完成mp4 2本
なぜ問題か: 機械QCは欠落・重なり・媒体維持を確認できるが、読みやすさ、cropの自然さ、音声や終端の違和感は人間判断が正本であるため。
再現手順: 2本を全編再生し、同じ内容が形式別に自然に見えるか確認する。
修正案: まず目視・聴取する。不合格があれば、その具体的な違和感だけを次工程へ戻す。
優先度: 高

既知の運用上の注意として、正式描画はChromiumを起動できるネイティブ環境が必要である。また、描画終了後の安全lock/work領域は保持されており、後始末方針は今回の範囲外である。

## 10. まだ未実装のこと

- titleは空であり、画面内タイトル表示はしていない。
- `semanticObservations`はv001契約どおり空で、G4〜G7の意味観測と演出は入っていない。
- 無音・間の調整、遠距離の意味サポート場面接続は未実装。
- 公開用タイトル、サムネイル、公開工程は含まない。
- 人間の全編目視合格、安定点commit/tag化はまだ行っていない。

## 11. 参考: 不足している可能性のある機能

1. 人間確認用の2形式比較導線
   - 根拠: UIを起動しておらず、完成mp4はファイルとしてのみ存在する。
   - ユーザー影響: 2本を自分で開いて比較する必要がある。
   - 扱い: 確認不足。UI機能の欠陥とはまだ断定しない。
2. 非空titleの正式表示
   - 根拠: 実行入力と意味情報パッケージのtitleが空。契約文書でも非空title表示は将来項目。
   - ユーザー影響: 公開前に必要な画面内タイトルをこの経路だけでは付けられない。
   - 扱い: 今後の未実装。
3. G4〜G7意味観測から演出への接続
   - 根拠: `semanticObservations=[]`を現物確認。
   - ユーザー影響: 今回の2本は基本字幕だけの保守的な見た目になる。
   - 扱い: 今後の未実装。
4. 描画後の一時領域・lockの整理運用
   - 根拠: 成果物とQCは合格したが、安全のためlock/workを保持した。
   - ユーザー影響: 連続運用時にディスク使用量が増える可能性がある。
   - 扱い: コード欠陥ではなく運用確認項目。

## 12. 次に直すべきこと

1. まず横型・縦型の2本を全編見て、字幕の読みやすさ、crop、音声、終端を合否判断する。
2. 合格なら、この実データ実証を完了記録として同期し、安定点化するかを判断する。
3. 不合格なら、違和感が出た時刻と内容だけを記録し、意味情報か表現側かを分けて次の修正範囲を決める。

## 13. 実行コマンドとテスト結果

最終照合で実行した主なコマンド:

```text
shasum -a 256 evals/clip_composition/reports/presentation/test-runs/20260805-common-draw-core-native-v002/presentation-output-render-plan.tap
shasum -a 256 evals/clip_composition/outputs/presentation/meaning-output-renders/qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v002-output/presentation-output-rendered-v001.mp4 evals/clip_composition/outputs/presentation/meaning-output-renders/qdczJpv8RCc-candidate-59-meaning-output-first-run-vertical-v001-output/presentation-output-rendered-v001.mp4
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,nb_frames -show_entries format=duration,size -of json evals/clip_composition/outputs/presentation/meaning-output-renders/qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v002-output/presentation-output-rendered-v001.mp4
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,nb_frames -show_entries format=duration,size -of json evals/clip_composition/outputs/presentation/meaning-output-renders/qdczJpv8RCc-candidate-59-meaning-output-first-run-vertical-v001-output/presentation-output-rendered-v001.mp4
rg -n --hidden 'AIza|GEMINI_API_KEY|Bearer [A-Za-z0-9._-]{20,}' <今回のjob・描画成果物・検査記録path>
```

正式描画は、固定Node v20.19.6、固定TSX 4.22.3、固定Remotion 4.0.481、固定Chromium 149.0.7790.0を束縛したjobでネイティブ実行した。個別のshell command文字列は独立成果物として保存していないため、推測で再構成せず、formal jobとpreflightのruntime記録を証拠とする。

成功:

- 関連検査: 33/33、失敗0、TAP SHA `b9c69c34e584d0064cf02fd499162e09500c588c6e6b6415bbf4c98b65a52a81`
- 横型工程入場・正式描画・QC: 合格
- crop適用: 10/10合格
- 縦型工程入場・正式描画・QC: 合格
- 動画現物とmanifest/QCのSHA照合: 2/2一致
- secret走査: 一致0件

失敗:

- 今回の承認後attemptでは0件。

未実行:

- 追加API通信
- ZEV UI起動
- 人間による完成動画2本の全編目視・聴取
- ChatGPTへのレポート投稿
- commit、tag、既存成果物の変更

## 14. 証拠

- 33件TAP: `evals/clip_composition/reports/presentation/test-runs/20260805-common-draw-core-native-v002/presentation-output-render-plan.tap`
- 横型preflight: `evals/clip_composition/reports/presentation/test-runs/20260805-meaning-output-horizontal-v002/formal-output-preflight.json`
- 横型manifest: `evals/clip_composition/outputs/presentation/meaning-output-renders/qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v002-output/presentation-output-render-manifest-v001.json`
- 横型QC: `evals/clip_composition/outputs/presentation/meaning-output-renders/qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v002-output/presentation-output-render-qc-v001.json`
- 横型動画: `evals/clip_composition/outputs/presentation/meaning-output-renders/qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v002-output/presentation-output-rendered-v001.mp4`
- crop適用: `evals/clip_composition/outputs/presentation/meaning-output-crop-applications/qdczJpv8RCc-candidate-59-meaning-output-first-run-crop-v001-application/crop-application.json`
- 縦型preflight: `evals/clip_composition/reports/presentation/test-runs/20260805-meaning-output-vertical-v001/formal-output-preflight.json`
- 縦型manifest: `evals/clip_composition/outputs/presentation/meaning-output-renders/qdczJpv8RCc-candidate-59-meaning-output-first-run-vertical-v001-output/presentation-output-render-manifest-v001.json`
- 縦型QC: `evals/clip_composition/outputs/presentation/meaning-output-renders/qdczJpv8RCc-candidate-59-meaning-output-first-run-vertical-v001-output/presentation-output-render-qc-v001.json`
- 縦型動画: `evals/clip_composition/outputs/presentation/meaning-output-renders/qdczJpv8RCc-candidate-59-meaning-output-first-run-vertical-v001-output/presentation-output-rendered-v001.mp4`

証拠の要点:

- 横型と縦型は同じ意味情報パッケージSHA `27769faa...613`と基礎映像SHA `faad660c...967`を束縛している。
- 両方とも1,547 frame、2,475,200 sample、同じ音声payload SHAを維持している。
- 横型は31ページ、縦型は38ページで、違いは出力側の形式別折りだけである。
- 既存3本とstable tagの不変検査は関連テスト内で合格した。
- UI、人間目視、公開可否は未確認である。
