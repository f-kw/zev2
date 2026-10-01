# ID9 v005 — 容量整理受理後の通常入力拒否・Clip回帰（媒体コピーなし）

発行日：2026-10-01（JST） / 発行者：ZEV Build Loop相談役
`decision: continue`

**kawafmm承認済みID9、「終わったら次に進んで」、軽微な技術判断の相談役委任に基づく限定続行。** SSD準備前の大容量試験停止は維持する。同じCodex2セッションで進め、Codex1再起動・本人への視聴／採点／転記／再承認要求は不要。

監査対象：`78805d861a41955ccf3f3914d5946f0446e4178d`。
親：[v005](ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)。先行する小容量検証の許可：[容量preflight](ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CAPACITY_PREFLIGHT.md)。今回閉じる整理：[本人承認の削除指示](ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_STORAGE_CLEANUP.md)。

## 1. 容量整理の監査受理

相談役は同SHAの主report、削除前一覧・実行結果・別process確認、明示8pathを扱う一回実行script、`9aaa5f5b..78805d86`の5file差分一覧を照合した。削除前保存`04c21bfdeccde7210193d731bcf205f4ea19a03e`と実績保存`78805d86`を区別する。

検証用素材コピー8本の削除と容量回復は、指示された限定範囲の完了として受理する。論理削除38,427,302,616 bytes、削除直後の同volume空き40,604,250,112 bytes（37.82GiB）。空き増加38,458,310,656 bytesはvolume全体の観測差であり、論理削除量と同一ではない。これは削除時の観測で、現在の空き保証ではない。

保持元3file、旧記録69件のSHA、その他634fileのmetadata、8path不存在の別process確認は保存証拠として受理した。相談役がMac上で削除・再hash・process観測を実行したものではない。初回の一覧組立て失敗は削除0、成功後にpushして削除した履歴も保持する。不存在だったpartialは削除実績に数えない。

削除済み8本に結び付く33参照は、元動画から復元するまで旧runtimeの即時再読不可。過去時点の技術受理を取り消さず、現在の再実行資格へも読み替えない。削除scriptを再実行・一般化せず、この容量整理は閉じる。SSD接続・保存先・利用開始は未確認のまま。

## 2. 今回の一件・完了対象

**通常の依頼入力とキュー制御が不正な依頼を拒否し、Clipの既存工程・人間確認条件を壊していないことを、媒体なしで検証する。** 先行preflight指示に既に含む未実施検証を具体化する。大容量試験の準備や容量棚卸しを再び独立工事にしない。

### A. 通常API／storeを通す入力・命令の検証

既存control routerと通常storeを、新しい隔離runtimeで起動する。自動runnerは既存設定`ZEV2_DISABLE_AUTO_RUNNER=1`で無効にする。既存の人間／agent認証境界をそのまま使う。

- productionType欠損・未知値、空／空白purposeなど、現行validateRequestDraftInputが拒否する入力を確認。拒否が依頼・工程・成果物を新規登録しないことを観測する。監査ログの正当な追加は業務オブジェクトの不正変更と混同しない。
- 未承認下書きから命令が生まれず、nextに実行命令が出ないこと。不存在の命令へのclaimも成功扱いにしない。
- 正常なclip／digestを別の依頼として作成・承認し、実API応答と通常storeを読む。Clipは既存7工程・各kind・依存順を維持、Digestはsource/STT＋prepare_digest_plan＋validate_digest_planの4工程のみ。Digestの動画命令を作らない。
- 目的全文・制作系統・編集条件が承認下書きから全命令へ対応すること。現行の外側trimは認め、途中の改行や文章を落とさない。これは命令到達の確認であり、3Skillへの再到達や内容品質の試験ではない。
- 重複承認で工程が重複作成されず、未完了依存を持つ後段への直接claimが拒否されること。必要な最初のclaimは認証済みagentの通常APIだけで行い、工程の実処理・completeは行わない。
- 新processで同じ隔離storeから依頼・命令・拒否後状態を読み、応答と保存内容が一致することを確認する。旧業務stateや旧成功runtimeを起動しない。

### B. 制御関数の局所回帰

現行sharedの`assertApprovedAgentRequestInput`、`getRequiredControlReviewKind`、`isAgentRequestReady`等を実関数として使う。承認済み入力の目的／条件／素材／系統／依存を変えたメモリ上の否定入力が拒否されることを確認する。

Clipのtheme_selection／material_confirmation／render_readinessが対応する工程に残ること、policy=falseを単独の根拠にゲートを免除しないことを確認する。依存不成立による拒否だけを人間確認ゲートの検証済みとしない。独立した制御条件の比較に必要な小さいメモリfixtureは許可するが、これは制御関数単体の回帰と表示し、通常storeへ成功命令・架空FileRef・人間承認状態を注入してE2E成立とすることは禁止する。実際の人間レビュー回答は変更しない。

API／通常storeの実測と制御関数の単体fixtureを結果で区別する。現行実装にない期待値を捏造せず、想定と異なる挙動は実際の返却・原因を保存する。

## 3. 試験入口と設営7の扱い

変更してよい試験fileは同report directoryの既存`queue-integration-test.mts`と、必要なら新しい`queue-no-media-regression-test.mts`。最小の一経路を選ぶ。既存backend起動・認証・API呼出しの仕組みは再利用してよいが、製品の入力／保存／検査ロジックを試験用へ写して合格させない。

**現行の引数なしrunはlocal→upload→MP4へ進むため、今回呼ばない。** 新しい明示的な媒体なし入口で、媒体コピー・取得・STT・inspection・製造を起動しない。引数なしで大容量経路へ落ちるfallbackを作らない。通常runner本体も起動しない。

先行preflight指示で許可した設営7の未適用枠を、このコピー不要入口の最小分離に使ってよい。適用時に設営累積7として記録し、同じ変更を重複計上しない。製品累積5は維持する。今回不要な汎用preflight、storage基盤、監視装置、新しい数値上限は作らない。別の試験欠陥・製品変更が必要なら証拠と最小差分をGPT_DECISIONへ返し、軽微なら相談役が本人確認なしで判定する。

## 4. 容量を埋め直さない境界

書き込むのは新しい隔離state・小JSON・ログ・試験結果だけ。媒体内容のread／hash／copy／PUT、source/STT complete、素材を必要とするDigest準備・消費、削除した33参照の復元、hardlink／symlink／sparse等による代用は行わない。入力sourceUriは既存素材の参照文字列を使ってよいが、内容の読取り・存在検査を迂回して媒体経路の成功を装わない。

削除済みコピーに依存する旧readerは起動しない。欠損で拒否されることを新しい不具合扱いにしない。旧local成功は過去の証拠として参照し、今回の成功へ合算しない。

upload、worker/backend分離root・転送先だけの消費再読、MP4直接登録、inspection未提供の通常complete、目的2件の全3判断は未実施／未確認のまま残す。これらはSSD等の保存先と具体的再開条件が決まってから行う。空き37.82GiBという削除時観測だけで再開しない。

追加削除・SSD探索／移行／format・外部転送・購入、外部推論／費用、新素材・STT／inspection実行・動画・新UI・製品code・本番・公開は対象外。ID9-PD-01/02、字幕演出未接続、動画許可未承認、人間品質pendingは維持する。

## 5. 保存と報告

主report：`docs/reports/request-intent-connection-20261001/README.md`。
今回結果：同directoryの`queue-no-media-regression-evidence-v001.json`。

各検査の実route／実関数、期待値・結果、API実測／メモリfixture／保存再読の別、新しいruntime path・増加bytes・媒体作用0、旧記録を変更しないこと、残るnot-runを記録する。新しい試験が今回完了条件を満たしたかを対象ごとに確認する。旧15／111試験・全動画QC・人間レビュー・削除処理は再実行不要。

現在地・report・必要試験だけを担当として明示stageし、通常mainへcommit/push。Code変更なしの範囲の全repo型検査を再実施せず、新しい試験自身と必要な依存確認を行う。

報告：`Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9. 通常入力拒否・Clip回帰（媒体コピーなし）`。
同じZEV Build LoopへCodex2専用Edgeタブで直接送信する。受理だけの再commit・終了連絡・再起動・Codex1起動は不要。

本指示の受領・再稼働・新試験結果は発行時点では未確認。容量整理は受理済みだが、v005全体・通常動画制作・SSD利用は未完了／未認定である。
