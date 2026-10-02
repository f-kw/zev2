# CURRENT_GOAL — 現在の目的と復元入口

更新日：2026-10-03（JST）

## 1. 復元

プロジェクトのZEV_START_HERE.mdを全文読み、GitHub mainの現在HEADと同一SHAの[HANDOVER_INDEX](HANDOVER_INDEX.md)、現行指示を読む。保存・発行・受領・実行・技術受理・人間採用を区別する。

更新前の準備接続・製品6/設営20の修正指示・初回失敗・完成checkpointの全文は[a98f569a固定版](https://github.com/f-kw/zev2/blob/a98f569aae8a12fe99a2c17314a802c1e1b6e275/docs/CURRENT_GOAL.md)へ不変保持。f577bfbaの初回停止、4556e389入力対応、7bb5de02実判断運転、ccd907a5までのv005履歴を辿れる。過去の未完了・次の試験を現在へ戻さない。

## 2. 完了・監査受理

**v005通常キュー接続は技術完了。** 成果7c8f34ceに対する[親v005 §13](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)のacceptを維持し、再検証工事へ戻さない。

**実判断付きDigest計画一件は7bb5de02でaccept。** 12候補/7採用/9保持、keep3,613/drop3,460、通常4工程succeeded、27,691frame/40,705,770sample、別process再読exit0。15:23案の区間・順序・時計を維持し、心霊回帰会話を正式比較へ追加。未見素材汎化・映像音声・人間品質とは別。

**字幕演出入口の入力対応は4556e389でaccept。** 9区間/3,613断片/18項目、供給元/不足/旧成果再利用条件。静的対応の完成であり、presentation consumer受理ではない。

**字幕判断入力の準備接続はa98f569aae8a12fe99a2c17314a802c1e1b6e275で今回技術完了としてaccept。必須追加修正なし。** 判定は[保存表示要求への実回答指示§1](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001.md)、保存b14ef8f51ed040556d4f43e45a322a5affda1e91。

新二path→既存表示入力validator→保存が成立。3,613atom/9group/9要求、候補6の非連続3group、drop非混入。旧正常658断片の純粋比較、対象11拒否、別process元JSON再構築と全bytes/SHA一致、旧JSON/実装54件不変を確認。型検査/preflight/準備/再読exit0。manifest SHA 83052a914317ae8b5a056ff641635ff061ebf59830df68a8090d180f2f0cfb75、11file/2,591,297bytes。

監査はGitHub上のreport/evidence/コード/差分の照合であり、Macのignored runtime・媒体を相談役が直接再実行したものではない。準備完了を実表示回答・描画・動画・人間採用へ広げない。

15分初稿レビュー、構成改善v001の局所検証、一件後修正/Reset、旧9:47案1080p低メモリ生成も完了範囲を維持。初回f577bfbaのexit1/保存0、失敗runtime、製品修正6/設営20適用は別履歴として保持する。

## 3. 現在の一件 — 保存表示要求への実回答

**保存済み9要求をCodex2が読み、表示単位と行末の候補回答を作り、既存Skill/validatorで検査・保存・別process再検査する。背景・動画は作らない。**

正本：[ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001.md](work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001.md)、保存b14ef8f51ed040556d4f43e45a322a5affda1e91。kawafmm承認済みID9主線と「終わったら次に進んで」に基づき、この一件の候補回答だけを明示した続行指示。一般の字幕判断委任・本適用・動画許可は含めない。

入力はruntime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002/bundle/。上記manifest SHA、意味入力SHA 6e16d247d36f841783d59badc4c4a3f35c8cf4739b6acae29baccc32a7d061a3、同attempt-002/parameters.jsonを使い、readPreparedDigestCaptionJudgmentInputsV001でJSON-only復元。prepareや通常4工程は再実行しない。

元purpose/承認snapshot/親scope/準備manifest/要求bytesは変更しない。今回の実回答許可は新正本のpath/SHAとして回答manifestに別束縛する。旧purposeの「今回は字幕・演出・動画を作らず」を書換えたり、旧製造authorization.recordIdを創作したりしない。

runCaptionDisplayBoundariesV001に実要求と今回のCodex回答を渡し、validateDisplayForAdoptionV001、readValidatedDisplayTracesV001をそのまま使用する。内部回答schemaはdigest-caption-judgment-display-response-v001、resultは既存caption-display-skill-result-v001。WeakMap tokenを保存しない。再読時は保存result/responseを同じvalidatorで再検査してtraceを復元する。

要求のtaskDescription・36論理幅/2行/既存文字幅規則は不変。今回候補条件であって144pxの最終style/物理幅/表示時間/見心地の合格ではない。条件付き分割の既回答を維持し、説明や否定・言い直しを不必要に細切れにしない。本文を変更・削除・創作せず、全3,613atomを所属要求内で一度ずつ覆う。候補6三groupを結合しない。cue出力時計・演出判断はしない。

新出力：runtime/artifacts/digest-caption-display-answers-20261003-v001/attempt-001/。実回答/result/trace、元参照/今回scope/実装SHAのmanifestだけ。元bundle/stateに書かない。製品code、新二path、既存製造/validator/通常factory/index/backend/sharedは変更しない。

補助とreportはdocs/reports/digest-caption-display-answers-20261003/のrun-display.mts、README.md、evidence.jsonのみ。薄い補助を作成・適用する場合だけ個別承認の設営21を計上。現累積製品6/設営20、新二path初実装を保持し、一般上限・強制停止・自己承認権は変更しない。

確認は9実回答の実Skill/validator、本文/所属/全被覆/論理幅、今回受渡しのSHA差替え小clone一件、別processの保存result/trace再検査一回。旧11拒否・全suite・動画QC・人間レビューを再実行しない。完成物は検査済み表示回答候補で、完成source package/renderer artifact/queue completeを名乗らない。

## 4. 容量と保全

本人承認の旧8コピー35.79GiB削除、33旧参照の再作成要を保持。旧runtime全体の即時再読を認定しない。006/007と実判断運転の正実走は別の完了実績。

実判断運転の追加媒体4,803,412,827bytes、終了時空き12,933,283,840bytesは過去観測。現在空き・SSDは未確認。今回は小JSONのみ。元MP4/PNG read/hash/copy/PUT、旧コピー復元、容量整理・SSD操作・追加削除は許可しない。

## 5. 承認外・人間回答

presentation=not-connected／executionPermission=not-approved／humanQuality=pending／outlineChoice=null。ID9-PD-01一般本適用、ID9-PD-02動画許可、旧業務state移行、本番・公開、人間採用は未承認。

144pxと「読む必要がある文章でなかったら」の条件付き分割、水色肯定、縁B21論理不合格、他色/強調・アップ・修正版7点・鬼武者Q3-2は[人間台帳](HUMAN_REVIEW_PENDING.md)と一次回答へ保持。旧字幕/307状態/18色/82frameアップは一括移植しない。済んだレビューを再要求しない。

背景4参照、最終style/renderer束縛、後段ROOT基準読取接続、演出、動画許可と見心地は残る。今回の候補回答の許可でそれらを消さない。前の未調整案停止と後の明示受領を分け、当時の貼付を承認へ遡及変換しない。

## 6. 起動・問い合わせ・Git

初回は本人手貼り。開始後はCodex2専用Edgeで同じZEV Build Loopへ直接送信し、返信生成完了・全文読了まで受領。同じ指定範囲を続行し、本人を通常の中継役へ戻さない。

a98f569aの準備完了・対象process残存0・Git cleanはCodex報告と保存証拠で確認し、相談役のMac直接観測とはしない。

**Codex2実行checkpoint（2026-10-03）：新指示を全文受領、c18ac0d6へ同期し、設営21を適用。第一表示要求217atomへの14単位の実回答と既存Skill resultを保存し、既存validatorは受理。その直後のSHA差替えcloneも正しく拒否したが、補助の比較値が既存エラー接頭辞を欠きprocess exit1。製品6/設営21を維持して追加作用を止め、比較一行と新attempt-002への追従・同一要求SHAの第一回答byte同一再利用をGPT_DECISIONへ返す。未修正・未再実行。旧入力21件不変、attempt-001失敗証拠を保持。残8回答/trace/manifest/別process再読は未実施。[今回report](reports/digest-caption-display-answers-20261003/README.md)、[証拠](reports/digest-caption-display-answers-20261003/evidence.json)。**

main、担当fileのみ明示stage、他者変更保全、stage/commit/push直列化。Codex1起動・受理だけの独立commitは不要。新しい実質問題がなければ回答→検査→保存→別process再検査→通常commit/push→直接報告まで。今回完了から演出・動画へ自動着工しない。
