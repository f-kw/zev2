# ID9 v005 — 本人承認済みの検証用複製・失敗copy削除

発行日：2026-10-01（JST） / 発行者：ZEV Build Loop相談役
`decision: continue`（下記の容量整理のみ。大容量試験の再開許可ではない）

## 1. 本人指示・現在地

**kawafmm承認済み。本人原文：「また容量が問題になってるのか。SSD用意するから一旦削除して」。** 今回はこの明示的な削除依頼に基づく。軽微技術判断の委任だけを根拠に削除権限を作ったものではない。

直前の相談役保存HEAD：`034503d72e70665615879686e07f1acf24f6cbd1`。実装・実測checkpoint：`60b959d91d0885ac2bf9cf4aaae66eff93454bab`。時計二path・15検査・local計画／検証complete・別process再読は限定技術受理済み。uploadは素材copy中のENOSPCで未完了。容量停止時の空き約1.9GiB、元素材4,803,412,827 bytesは当時の観測で、削除前に現在値を取り直す。

[容量preflight指示](ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_CAPACITY_PREFLIGHT.md)の「旧物の削除未許可」は、本書で明示する検証用複製・失敗copyだけについて更新する。元素材・完成媒体・判断／検査記録等の保全は維持。候補整理だけで止めず、条件を満たす対象は今回の作業内で削除・回収量確認まで行う。本人への追加の一覧承認は不要。

担当は同じCodex2単独。前指示の受領・実行状態は相談役から未確認なので、現在の作業を確認してから切り替える。進行中の自分の試験があれば安全に区切り、対象への書込みがなくなってから削除する。他担当・他アプリのprocessを停止しない。

## 2. 今回削除してよい範囲

探索範囲は、実workspaceの `runtime/artifacts/` 直下にある **`request-intent-` で始まるID9通常接続試験領域**に限定する。領域名のprefixは探索条件であり、ワイルドカード一括削除の指定ではない。各attempt、local、worker、backend、readerの実pathと由来を確認する。

削除許可は次の二分類に該当する通常fileだけ。

1. **検証用に複製した素材動画**：元素材または削除対象外の保全コピーが実在し、対象とsize／SHA-256が一致し、試験記録から複製と確認できるもの。成功／失敗attemptの双方を含む。参照記録に載っている複製でも、この条件を満たせば削除してよい。原本との一致確認は読取り・stream hashで行い、削除のために新たな大容量バックアップを作らない。
2. **中断した素材copy／転送のpartial・一時file**：今回の試験が作った未完成コピーと実行ログ・命令・pathから特定でき、残す完整な元素材が確認できるもの。partialのSHAは完全コピーと区別して保存し、一致したと装わない。唯一の成果物や未知fileをpartialと推測しない。

例として容量停止記録にある `request-intent-connection-20261001-v005-attempt-005/upload-json-worker/runner-artifacts/` 配下の失敗した `agent_jGgk6ywiuluA2Sv0IkOrQ--source-media.mp4` は、実在と上記条件を確認する削除候補である。例示だけで存在・削除可を認定しない。

次は**削除しない**。

- 元素材 `runtime/artifacts/digest-new-material-20260926-v001/source/source-video.mp4` と、書き起こし・inspection等の元入力。
- 旧15分版、7B、完成1080p本体／replay、540p preview、Point Review等の完成・確認用媒体。今回の探索範囲外の `original-resolution-*`、`integrated-preview-*`、`selection-structure-improvement-*` 等も対象外。
- JSON、state、要求／回答、採否／保持、binding、manifest、検査結果、ログ、SHA、失敗証拠、ソースコード、Git管理file、`.git`。容量の小さい判断・再開情報は残す。
- 他担当の作業、Git管理の原本、由来不明のfile、使用中file、唯一の実体、本人の一般ファイル、OS cache／snapshot／ゴミ箱の他の内容。

条件不成立のfileは残して理由を記録する。他の適格なfileの削除は進め、範囲を勝手に広げない。

## 3. 削除前後の最小手順

1. 最新main／AGENTS／本指示を読み、Git担当と未commitの由来、自分の実processを確認する。前の容量調査を既に実施しているなら使い、同じ調査を作り直さない。
2. 対象候補の絶対path・workspace相対path・size・割当bytes（取得できる範囲）・実SHA・複製元の保持pathと実SHA・分類・影響する旧attempt／参照を一覧へ保存する。partialはその由来と失敗recordを付ける。削除対象をfile単位の明示allowlistにし、保持先が同じ削除一覧に入っていないことを検査する。
3. 元素材のSHA検証は同一不変fileに対して再利用し、全動画や全96保護fileを新たに総走査する工事にしない。消す対象の根拠と保持元の存在確認は省かない。
4. 削除前一覧を軽量recordとしてGitへ保存・通常pushし、記録が保持されたことを確認する。その後、同じ作業内で条件を満たすallowlistのfileだけを削除する。削除前の記録保存は破壊的操作の根拠保全であり、本人の再承認待ちにはしない。実行前に対象のidentity／size等を再確認し、調査後に変更・使用開始されたfileはスキップする。
5. symlinkを辿らず、realpathが許可root内の通常fileであることを確認する。未知のhardlinkや保持先と同一実体の扱いは推測しない。`rm -rf runtime`、`git clean`、prefixや拡張子だけによる一括削除、ユーザーのゴミ箱全消去は禁止。削除するのは個別列挙した適格な複製／partial。ゴミ箱へ移しただけで容量回収済みと報告しない。
6. 各fileの削除／未削除と理由、保持元の存続、同volumeの削除前後の利用可能bytesを記録する。論理削除量と実際の空き増加は分ける。共有blockやsnapshot等で期待ほど空かなくても、それらを追加削除しない。

必要ならこの用途だけの小さい一回実行scriptを既存report directoryへ置いてよい。汎用クリーナー・自動定期削除・製品側storage改修は作らない。今回は本人が別途明示した容量整理であり、設営／製品修正回数を勝手に増枠・リセットしない。前の設営7の適用有無は実態を報告する。

## 4. 履歴・再読・その後

旧JSON・旧proof・旧成功／失敗判定は書換えない。削除した複製は新記録に `retired-by-user-approved-cleanup` と残し、保持元から再作成が必要な参照を列挙する。**過去の技術受理は過去時点の事実として維持するが、削除後も旧runtime一式がそのまま再読可能とは主張しない。** 元素材1本とhash一覧だけで旧実行環境全体を復元済みとは扱わない。欠損を合格にするreader修正や、確認目的の即時再コピーは不要。

空きが増えても、SSD準備前に大容量copy／upload／MP4試験を自動再開して埋め直さない。今回優先は容量回復。前指示の小JSONのみの独立検証は削除対象へ依存せず十分に小さい場合だけ既承認範囲で可能だが、容量整理完了報告を先延ばししない。

SSDは本人が用意する意向を受領しただけで、購入・接続・mount先・利用開始を確認したものではない。SSDへの移行・format・外部送信・購入代行は開始しない。残るupload等はSSDまたは具体的な次の実行許可が整うまで保留する。人間品質・ID9-PD-01/02・本適用・動画許可・公開は従来どおり未承認／pending。

## 5. 保存・報告

既存主report：`docs/reports/request-intent-connection-20261001/README.md`
削除前一覧と実行結果：同directoryの `queue-storage-cleanup-20261001-v001.json`（実行後は削除前情報を残して結果を追記）。必要なscriptも同directoryに限定する。CURRENT_GOAL／HANDOVERへ今回担当の結果、回復空き、削除による再読制約を同期する。

報告：`Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9. 検証用複製の削除・容量回復`
削除件数、削除量、実空きの前後、保持した原本、残した例外、旧参照への影響、大容量試験の保留を簡潔に返す。候補一覧だけを完成とせず、実削除結果を含める。できなかった分は未実施とする。通常main・担当のみ明示stage・直列commit/push・Codex2専用Edgeタブで同じ相談役へ直接報告。Codex1起動、受理だけの再commit・終了連絡、本人への転記・再確認は不要。

指示発行時点：削除は本人承認済みだが、Codex2の受領・実削除・空き回復・SSD準備は未確認。相談役はMacのfileを直接操作していない。
