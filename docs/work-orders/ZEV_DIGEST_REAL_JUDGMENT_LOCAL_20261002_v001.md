# 9の後続 — 通常依頼から実判断付きDigest計画を一件保存する v001

発行日：2026-10-02（JST）
発行者：ZEV Build Loop相談役
状態：発行済み。Codex2への新しい手貼り指示の受領後に着手。
decision: continue
kawafmm承認済み：本書に限定する既存素材一件の開発運転。
基準main：ccd907a52d15b65083557110700222d1b072c44f

## 0. 旧案の停止と今回の指示を分ける

本人の「未調整なんで止めた」を保持する。旧提案の貼付を承認だったと遡及解釈しない。今回の「新しい指示にして」に応じて、制作目的、実回答の経路、素材・容量、許可差分、終点を具体化した新指示を発行する。

旧提案 `相談役/方針/2026-10-02_v005完了後_状況整理と次作業案_v001.md` は経緯・検討記録として保持し、実行指示には使わない。新しい作業の範囲は本書だけを使う。v005の技術完了・最終acceptは不変。本番適用、一般委任、動画許可を承認したものではない。

Codex2単独。最初はkawafmmが本書を指す一つのキック文を手貼りする。相談役の保存だけでは受領・稼働にならない。保存時点でMacのprocess、停止した旧貼付後の変更、空き、SSDは未観測。

## 1. 目的と終点

既に完成した通常依頼・保存経路に、その要求を読んだCodex自身の内容判断を返す。

通常依頼→承認→旧source/STTの正規登録→通常runner/index/factory→探索・比較採否・内部保持の実回答→計画complete→既存consumerによる検証complete→別processの保存再読。

完成物は「今回の依頼に対応する採用区間・構成の保存計画一件」。動画は作らない。選定機能や推論providerを新設しない。v005の固定回答generator・2候補fixtureを実判断にしない。

## 2. 今回固定する制作目的

新しいDigest下書きのpurposeは、次の全文をそのまま使う。

> この保存済み配信素材から、初見でも何をしているかと各見どころの面白さが分かるDigestの採用区間・構成を一案作る。素材中にある自然な導入と、理解に必要なゲーム説明を比較して残す。各見どころの前振り・展開・反応・結末を保ち、ゲーム／本編の終了がある場合は締めとして比較する。商品紹介・スパチャ読みは原則除外するが、本編の主題に直接関係し追加価値がある会話は、位置や単語だけで除外せず内容で比較する。不要な反復・脱線は省き、候補件数や完成尺は先に固定しない。映像や音声を未確認の事実は断定しない。今回は字幕・演出・動画を作らず、採用と不採用の理由、残す元断片、順序、既存処理で解決した時計を持つ計画を保存する。

これは9/28の既存制作要求を今回の計画用途へ具体化したもの。文字サイズ・縁・配色の採用判断をこのpurposeへ混ぜない。設定・policyはv005の受理済みlocal JSON登録経路の保存値を参照し、内容や承認条件を変更せず、新依頼との対応を保存する。

## 3. 素材・既存判断の使用

対象素材は `-2UUTkv9qvk` 一件のみ。workspace基準の既存入力：
- `runtime/artifacts/digest-new-material-20260926-v001/source/source-video.mp4`
- 同directoryの `transcript.json`
- 同directoryの `base-attempt-002/source-media-inspection.json`
- 共通発話は既存の厳密処理で保存STTから復元する。

素材の既知sizeは4,803,412,827 bytes、SHA-256は `504650457fc6650bf27d6a6094402add0b684c5f32977cde27e201fe4c40a6c4`。存在・実bytes・正式参照は着手時に必要範囲で確認する。旧証拠のSHAを無検査で現物同一性の代わりにしない。

9.構成改善v001の11候補・7採用・9保持区間、通常接続前15:23.033案、採否理由と心霊回帰会話の補足を参照してよい。これは判断根拠であり正解ラベルではない。現要求・原文に対して妥当なら同じ結果でよく、違いを作る目的の再選定はしない。

新しい発話IDや時刻を創作しない。有限IDの列挙、原文検索、被覆・順序の機械計算はコードで補助してよいが、採否・内容境界・理由は実要求と原文を読んで決める。旧回答のrequest SHAだけを付け替えて新回答にしない。

## 4. 実行・保存方式を固定する

### 4.1 local一系列と通常承認

新規隔離rootは `runtime/artifacts/request-intent-real-judgment-20261002-v001/attempt-001/`。
既存業務runtimeとは分離し、既存設定で自動runnerを無効化する。既存control router/store/認証とartifact PUT/GETを使う。通常APIで一件の明示digest下書きを作成し、本書の一件限定許可を根拠に通常approveを行う。人間が実際にクリックしたとは記録しない。

sourceはJSON参照方式に固定する。元動画URIは保存STTのsourceUriと正規resolverの対応を維持する。source JSONには今回のpurposeと、実SHA照合した既存inspectionへの今回用の正規bindingを持たせる。旧source JSONやinspection本体を修正しない。旧STT・inspectionのbytesを今回の正式な保存先へ小データとして登録することは許可する。source/STTは通常claim/PUT/completeで新しいOutput/FileRefを作り、旧命令・旧owner・成功stateを転用しない。取得・STT・inspection処理自体は起動しない。

MP4直接登録・inspection未提供・upload多rootの枝は今回走らせない。現行codeではMP4直接登録だとinspectionがnullになるため、時計付き計画を今回の終点とする本書ではJSON参照方式を使う。

### 4.2 素材コピーと容量

現行 `digest-plan-preparation-v001.ts` のJSON参照経路は、新しい計画の出力先へ `source-media.mp4` を一つ作る。この既存処理による一つのコピーだけを本書で明示許可する。事前に手動コピーを追加しない。worker/backend/receiverの三重構成は作らない。

初回の大容量作用前に、保持元size、今回出力rootのdevice/実空き、新規source-size実体が一つであることを確認する。今回限定の開始条件は、既存の一コピー検証と同じ `availableBytes >= 2 × sourceBytes`。既知sizeでは9,606,825,654 bytes。これは一コピー分と同量の余裕であり、製品の恒久上限ではない。コピー以外の大きな追加保持が判明した場合はこの算定で開始しない。

条件を満たせば追加の容量判断待ちを挟まず続行する。不足時だけ大容量作用前に実測と不足をGPT_DECISIONで返す。SSDを推測して使わず、旧成果削除・hardlink/symlink置換はしない。再開は同一request・同一bindingで既存の正規再利用が成立する段階から扱い、コピーを毎回増やさない。既存の厳密readerが要求するread/hashは許可し、無意味な全動画再hashは加えない。

### 4.3 実判断は既存stdinへ戻す

通常 `runner/src/index.ts` と実factory/3Skillを使用する。既存 `judgeThroughStdinV001` の `candidate-digest-judgment-required` が出すrequestとrequestFileSha256を保存する。

各段階で、Codex2が今回の要求・原文・既存案を読み、今回のresponseを作り、その一件だけを実runnerのstdinへ返す。stdinは次の要求まで開いたままにし、未発行の後続回答を先にまとめて流さない。独立した外部API推論・別provider・固定回答自動生成・evalの動画生成CLIは使わない。

必要な補助は通常processの起動、要求/応答の保存と手渡し、結果確認だけ。JSON envelope・ID列・SHAを機械的に組み立てることはよいが、判断本文を固定fixtureや旧回答から無確認に作らない。既存のlive stdin入出力を使えない実障害があれば、推論providerを新設せず、その境界だけを相談役へ返す。

## 5. 許可する変更と検証量

製品code、公開API schema、承認gate、builder/validator、renderer/native QCは変更しない。

今回の薄い実行補助を個別に設営16として許可する。製品5／設営15の過去履歴は保持し、16は実際に補助を作成・適用した場合だけ計上する。一般枠・停止条件・Codex自己承認権は変更しない。

実装を置けるのは `docs/reports/request-intent-real-judgment-20261002/` 内の以下のみ。
- `run-local.mts`：通常API/既存runner起動とstdin受渡し。判断・通常処理の再実装は禁止。
- `readback.mts`：既存readerを呼ぶ小さい別process確認。必要な場合だけ作る。
- `README.md`、`evidence.json`：今回結果と根拠。要求本文・回答・素材はignored runtime側を正本にし、Gitへ大量重複しない。

CURRENT_GOAL/HANDOVERの自分の実行状態は実質checkpointで同期してよい。前の未調整貼付で既に差分・processがあれば、由来を確認して保持し、未確認のまま上書き・削除・stageしない。

開始前は薄い補助のsyntax、実export、API正常応答、対象ID・root・stdin開閉を小さく確認する。終了確認は新しい通常一系列、要求SHA/本文/被覆/時計、別processの保存再読一回に限定する。旧52/9/15/19/4/111試験、upload006、MP4007、全動画QC、15分レビューを再実行しない。

## 6. 完了条件

1. 固定purposeが通常の承認snapshotと探索・採否・保持の3要求に全文到達している。
2. 各要求に対応するCodexの今回の実回答・判断理由が保存され、既存の要求SHA・ID・被覆検査を通っている。
3. 正規source/STT登録から計画・検証の通常completeまで成立し、FileRef/Output/所有者/実bytesが対応する。inspectionを提供しているので、時計未提供null枝で今回の完成にしない。
4. 既存consumerで採用区間・保持断片・順序・元時刻とframe/sample対応を得る。keep/drop/keepをmin/maxへ戻さない。
5. 別processから同じ保存計画・検証結果を再判断・再登録・state更新なしに再構築できる。
6. 前15:23案からの維持点・変更点と理由、導入/説明/局所結末/締め/除外要求との対応、未観測の映像音声・品質を一つのreportへ示す。
7. 判断に要した時間と処理時間、待機、コピー量・容量前後を分け、通常製品の全自動性能値に読み替えない。
8. 担当のみcommit/pushし、自分の子process終了、Git状態と残存差分を確認して相談役へ直接報告する。

## 7. 承認の外側

ID9-PD-01の一般本適用、ID9-PD-02の動画許可、旧業務state移行、本番有効化、実AIの未見素材汎化、人間品質採用、公開は本書で承認しない。

字幕/演出/動画生成、既存案の人間採用、縁B修正、Short、新UI、新API・追加推論費用、素材取得、STT/inspection実行、SSD操作、旧成果削除は対象外。144px・条件付き分割の既回答、縁選択null、その他既存Pendingを保持する。今回の内容計画作成をそれらの解決にしない。

## 8. 問い合わせと終了

通常技術判断はCodex2専用Edgeから同じZEV Build LoopへGPT_DECISIONで直接送る。送信表示だけで終わらず返信生成完了・全文読了まで受領し、同じ範囲の具体指示で続行する。実際に返信を取得できないUI/通信障害だけを未受領として記録し、本人へ通常の転記を求めない。

報告名：Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9の後続・通常依頼の実判断付き計画一件

この一件の完成後は相談役が監査する。字幕・演出・動画への次工事は本書から自動着工しない。受領記録だけの独立commitや終了通知commitは不要。
