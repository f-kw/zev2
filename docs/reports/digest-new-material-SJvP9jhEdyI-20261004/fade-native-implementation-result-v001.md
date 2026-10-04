# 短い字幕の濃さと代表検査の接続を実装

記録：2026-10-04T14:59:03.950748+00:00。時刻はUTC。親の継続指示に従い、次の合成に使う短字幕の濃さと、代表だけの二重描画・行画像検査を3製品pathへ接続した。今回の新動画製造は0、現正式動画と過去の証拠は保持した。

## 実装と実施範囲

- `render_presentation_v002.mjs`：表示FフレームからD=min(4,ceil(F/2))を導き、短い字幕にも100％の濃さのフレームを残す。表示時刻と長さを変えず、区間途中のphaseを維持。7フレーム以上は従来の式と同じ。opaque approved job/authの実policyから代表を選び、全primary実画像とalpha/bounds、必要な配置calibrationを維持する。
- `presentation_renderer_qc_v002.mjs`：別の代表用入口と内部だけのscopeで検査。全primaryの実SHA/alpha/bounds・props・設定・論理ID/時計・媒体/元音声を維持。選択されたrepeat/mask、全top-band/panelのcalibrationと補正後maskを確認する。従来full入口は不足maskを引き続き拒否する。
- `digest_representative_completion_v001.mjs`：plan/policy canonicalSHA、job/auth/codeSHAと全primary順を束縛したcoverageをprivate完了→technical→pending/get→record-only→初回completed読取に保持。非代表の未実施検査を全件passedへ言い換えない。coverageを落とした新結果や代表失敗は完了しない。旧coverageなしは既存fullの厳格な検査でのみ扱う。

現保存計画のmetadataを原SHA/sizeで再読して導出すると、**primary651・repeat8・診断mask14、未実施repeat643・mask1028、必要calibration0**。8/14は固定値ではなく実policyと入力行数から導く。特別な背景配置では必要maskが追加され、その範囲と件数も記録する。Remotion673回＋Magick1330回＝2003childは次回の静的予算であり、実速度や実製造成功ではない。[元計画と計数](native-sampling-static-planning-v001.json)。

非代表への推定line bounds/偽repeatSHAは作らない。未補正calibrationを補正後の実測maskに見せない。一般trust/default/共有契約/Core/caller/監視・保存先・ownerを変更せず、browser共有・汎用cache・資格検査削除も実装0。低メモリ合成は同じbuilderを使い、別の短区間経路や別alphaを作っていない。古い復帰入口は全保存maskの実再検査を維持し、新8/14へ無言で切り替えない。

## 小規模検証と制限

実8×8px FFmpegで1/2frame100％、3frame50→100→50％、4frame50→100→100→50％、5/6/8frameの倍率とrange phaseを確認。従来の合成器を固定した64px byte/clock oracleで7frame以上、Normal/Color/Panel/Pulse/Bounce/Shake・区間境界の不変とfault検出を確認した。本文/PNG/時計は濃さ計算で変わらない。0.1秒そのものの読了性を解決した結果ではない。

小adapterは全primary・非代表の不要描画0・特別配置のcalibrationと補正後mask・選択repeat不一致の停止を検査。QCは全primary欠落/実画面外/本文props/clock/音声/coverage差替え・選択mask欠け/失敗を拒否。保存/get/record-only/completedはin-memoryの実関数fixtureで同scopeを確認し、実callerと同じapplicationResultsなしの外枠からも保存原配列を読めることを確認した。現SSDの本番get/finalizeを新コードで実行した証明ではない。

関連統合は**129件中127成功、2拒否、skip0、5.473755秒**。2件は旧固定fixtureがrenderer SHA3322cc6cを要求し、現在7e568933だけでなく変更前3940cb6eのrenderer8090b687とも異なるためproducer入口で拒否した。旧fixture/hashを更新・免除せず、旧経路合格として数えない。[実TAP](fade-native-regression-v001.tap)・[全commandと実時刻](fade-native-integration-verification-v001.json)・[旧拒否の照合](historical-renderer-fixture-rejection-v001.json)。baseline suite自体は再実行していない。runner/Remotion型・3module構文・実装diff checkは成功。[型](fade-native-types-verification-v001.json)・[構文](fade-native-syntax-verification-v001.json)。

設営補正はrootの字幕-only観測時のfps穴埋め1回＋shared fixture依存3回、計4回。[root観測の履歴](root-opacity-fixture-history-v001.json)。shared最終15/15と旧失敗履歴、QC37/37を保持。[shared履歴](digest-native-coverage-shared-implementation-v001.json)・[QC証拠](digest-native-sampling-qc-verification-v001.json)。独立読取は特別配置scopeの優先とcompleted読取の保存配列欠落を指摘し、両修正を確認。最終3実SHAとレビュー束縛も一致した。[独立レビュー](specific-native-sampling-integration-review-v001.md)。失敗を合格へ上書きしていない。

## 成果、未解決、次担当

現正式動画は既存20:53.966667/37,619frame/617257203B/SHA6434a56bのまま。今回は実statだけ確認し、617MBのhash再計算・再視聴・新音声診断を増やしていない。既存get pending＋問題record2件＋正式完成未成立という保存状態を維持。[前工程の実成果](specific-recovery-result-v001.md)。新コードのglyph・全651描画・本番合成・新媒体QC/代表実視聴は未実施で、旧動画の品質を新コードの合格証拠にしない。

人間待ちの一点は、親が本人へ尋ねた原38:35〜38:55中の該当一文の発話開始/終了の目安。回答前の本文/時計変更0、追加ASR/音声診断0。465の0.1秒・571の1frameという読了性は残っている。本人回答を受けて親monaが隣接と整合する限定訂正を指示し、同じMac実装者が続ける。本人へ過去レビューや全字幕採点を再要求しない。

次回の製造には、この変更を固定した実装SHA/依存SHA・実入力・新しい未使用出力rootとownerを承認済みjobへ正式に束縛する必要がある。旧jobの8c3a20b5資格へ今回変更を免除して投入しない。全651描画・新合成・製造許可・公開は今回起動0。

最終読取は2026-10-04T14:52:57.890600+00:00、own製造process0、main/remote3940cb6e一致、旧正式MP4の実stat保持。小fixtureの自己所有tmpは各testが整理、SSD原本/旧work/成果/lockは保持。最終Git checkpoint SHA/cleanは報告時に確定する。[終了観測](fade-native-close-read-observation-v001.json)。この実行をメイン相談役モデルの正常稼働証明にしない。

本人14:54 UTC『終わったらかかった時間の分析と対応策一覧を作っておいて 無駄な試験をしている気がする』を受領。制作/検査/復旧/修正と待ち時間、重複の根拠を[分析用台帳](production-time-and-test-ledger-v001.md)へ整理した。分析のための追加試験・benchmark0。並行区間を足し合わせず、モデル経過を人間作業時間に換算しない。


14:55/14:57 UTCの本人の追加観点に従い、計算可能な幅/行数/clockは計算で扱い、実font/codec/I/Oだけを必要な現物境界へ分ける案を評価した。保存済み1042行の再集計だけで、新画像/試験0。ASCIIなし901行は推定幅以内、英字は最大237px広く、実最小余白は指定に対して17/26pxだった。通常の日本語を計算中心、上限付近/英字・数字・記号等を例外にする根拠と、未保証の範囲を[分析](calculation-vs-native-inspection-analysis-v001.md)へ記録。全primaryの位置測定にも計算layoutとの重複があり、次の削減候補として渡す。現在の承認済み3pathは全primary測定を保持し、新閾値・実装変更0。

Gitのstage後whitespace検査では、byteそのまま保存した失敗TAPの607/634行の診断空白を検出した。原ログSHAを保つためそのraw TAPだけをwhitespace規則から除き、製品・test・文書・他のartifactは検査を通す。試験の拒否/失敗を除外する操作ではない。
