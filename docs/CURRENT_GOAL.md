# CURRENT_GOAL — 現在の目的と復元入口

更新日：2026-10-02（JST）

## 1. 復元

プロジェクトのZEV_START_HERE.mdを全文読み、GitHub mainの現在HEADと同一SHAの[HANDOVER_INDEX](HANDOVER_INDEX.md)、指定された現行指示を読む。保存・発行・受領・実行・技術受理・人間採用を区別する。

更新前の全文とv005の設営／容量／再開履歴は[ccd907a5固定版](https://github.com/f-kw/zev2/blob/ccd907a52d15b65083557110700222d1b072c44f/docs/CURRENT_GOAL.md)へ保持する。そこにある旧「次の試験」「未完了」を現在へ戻さない。

## 2. 完了済み

**9. 明示Digestの通常キュー接続v005は技術完了。** 成果7c8f34ceに対する[親v005 §13](work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md)の最終accept、保存df9fce022d78527724625e00503965a697b2e994を維持する。local/upload、MP4、inspection未提供、通常保存・再読、各拒否資格まで完了。製品5／設営15の履歴を保持し、追加試験工事へ戻さない。

15分初稿レビュー、構成改善v001の実案・局所検証、一件後修正・Reset、旧9:47案1080p低メモリ生成も完了済みの範囲を維持する。

## 3. 現在の新指示

**9の後続：通常依頼から実判断付きDigest計画を一件保存する。Codex2が設営17を適用し、通常4工程completeと別process再読を完了した。担当成果の保存と最終監査報告へ進む。**

親正本：[ZEV_DIGEST_REAL_JUDGMENT_LOCAL_20261002_v001.md](work-orders/ZEV_DIGEST_REAL_JUDGMENT_LOCAL_20261002_v001.md)。指示保存83c06014a3b39147c5907b751619447866d4a194。
今回の再開正本：[親directory修正](work-orders/ZEV_DIGEST_REAL_JUDGMENT_LOCAL_20261002_v001_PARENT_DIRECTORY_FIX.md)。保存9ecf3ae3893ab0c9c8d06783f3837720c51d4815。

前案について本人が「未調整なんで止めた」と申告したことは保持する。その後の「新しい指示にして」に応じ、制作目的・実回答経路・保存方式・容量・終点を具体化して新たに発行した。以前のキックを承認だったと遡及解釈しない。旧提案は実行指示として使わない。

今回だけの範囲：
- 既存素材-2UUTkv9qvk、保存STT、既存inspectionを使う。
- 正本§2で固定した目的を一件の新隔離Digest依頼へ渡す。
- source JSON＋inspectionを通常登録し、通常localの実index/factory/3Skillへ進む。
- Codex2が各実要求を読み、既存stdinへ今回の回答を一件ずつ返す。固定回答generatorや新APIは使わない。
- 既存15:23案は根拠として利用する。同じ判断でもよく、件数／尺を正解固定せず旧回答SHA付替えもしない。
- 通常の計画・検証completeと別process再読まで。字幕・演出・動画は作らない。

### 3.1 初回停止と設営17

f1d716243ded9c6a783404ffc27a4b84ff209e6fのrun-local.mtsとevidence.jsonを相談役が照合した。設営16の薄い補助は作成・適用済み。親directoryが存在せず、mkdir(runtime,{recursive:false})でENOENT、process exit1。保存証拠ではstateCreated=false、mediaActionStarted=false。通常API・runner・実判断はまだ開始していない。

許可差分はその直前の `await mkdir(path.dirname(runtime), {recursive:true});` 一行。attempt自身のrecursive:falseと既存拒否を維持する。今回の固定root外へ作らず、既存attemptを削除・上書きしない。不存在を再確認できれば未作成のattempt-001を使う。

製品5／設営16を保持し、この修正は適用時に設営17を計上する。コード内の累積値・受領metadataと失敗履歴の記録追従を含む。初回のerror/stop/開始時刻は別の失敗履歴と固定Git版で保持し、成功に付け替えない。一般枠・過去履歴・強制停止条件・自己承認権は変更しない。製品code変更は許可していない。

## 4. 容量と保全

旧8素材コピー35.79GiBの削除は本人承認に基づく完了履歴。33旧参照は整理済みで、旧runtime全体の即時再読を認定しない。その後の006/007の正実走・保存再読は別の完了実績として保持する。追加削除・SSD操作は許可しない。

今回のsource JSON経路で現行準備処理が作るsource-media.mp4一つだけを許可。実行直前に新規大容量実体が一つ、対象volumeのavailableBytesが2×sourceBytes以上（既知sizeで9,606,825,654 bytes）を確認する。Codex報告の空き17,751,695,360 bytesは過去観測で、再開時には再実測する。現在空きとSSD接続は相談役未観測。三重コピーやupload多rootの再試験はしない。

## 5. 承認外・人間回答

ID9-PD-01の一般本適用、ID9-PD-02の動画許可、旧業務state移行、本番有効化、未見素材の実AI品質、人間品質採用、公開は別事項。本書の限定運転をこれらの承認にしない。

144pxと条件付き分割の肯定、縁選択null、縁Bの21論理不合格、色・アップ・旧修正版7点等の未確認は[人間台帳](HUMAN_REVIEW_PENDING.md)と既存一次回答へ保持する。人間待ちだけで独立作業を止めず、済んだレビューを再要求しない。

## 6. 起動・問い合わせ・実行状態

初回キックは相談役が一つのテキストブロックで渡し、kawafmmがCodex2へ手貼りする。7e0de670の新指示受領・設営16適用・初回停止は今回の報告と保存証拠で確認。旧未調整案の差分/processなし・Git cleanはCodex報告であり、相談役のMac直接観測ではない。**設営17の受領・適用、通常4工程succeeded、別process再読exit0はCodex2の実行証拠で確認済み。相談役の最終監査は別段階。**

開始後はCodex2専用Edgeから同じZEV Build Loopへ直接問い合わせ、返信生成完了と全文を自ら受領して同じ範囲を続行する。送信済み・返信生成中だけで本人へ戻らない。Gitはmain、担当のみ明示stage、他者変更保全、stage/commit/pushは直列化する。

新しい実判断計画一件の完成後は監査へ提出し、未承認の字幕・演出・動画工事へ自動着工しない。

### Codex2実行checkpoint — 2026-10-02

新指示を手貼り受領して着手。旧未調整案の差分/processは0。初回設営16の親directory不存在停止をf1d71624へ保存し、相談役の設営17個別承認58e1bcb4を全文受領・適用した。通常local一系列でsource/STTの登録を完了し、実探索12候補・採否7採用・保持9区間の今回回答を逐次stdinへ戻した。計画/検証の通常completeと別process再読exit0を確認済み。3要求の目的全文一致、全7,073断片の被覆、9区間・frame/sample時計、API/store完全一致、state不変を保存した。新規媒体実体は4,803,412,827bytesの一つだけ。製品5／設営17。[主report](reports/request-intent-real-judgment-20261002/README.md)を監査へ提出する。字幕演出・動画・本適用・人間品質の承認外は不変。
