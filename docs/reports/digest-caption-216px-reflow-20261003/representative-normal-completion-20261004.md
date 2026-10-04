# 代表確認方式を通常の完了結果へ渡す接続

確認：2026-10-04 03:48 UTC。親monaの限定技術判断と、本人22:20/22:21 UTCの「数件確認、全体はルール」、01:23 UTCの次工程検討、02:12 UTCの固定値除去指示に基づく。

**今回の限定接続は実装・対象検証を完了した。** 承認済みNormal jobが明示した代表方式をrenderer→caller→Core→最終製造結果へ同じprivate結果として渡す。新動画、保存済み15:23動画の再検査、既存6件/可読性評価の再実施は0。過去の全件QC失敗は保持する。

|判定|通常経路での結果|
|---|---|
|全体ルール・媒体・音声が成立し、代表記録も対応|`passed-representative`、`complete:true`。全件視認QCの`passed`にはしない。|
|代表記録がまだない|`confirmation-pending`、`complete:false`、`completedAt:null`。生成済み媒体を保存し、確認待ちとして返す。|
|本文/配置の欠落、媒体/元音声不成立、記録/計画/設定/実MP4の差替え|拒否。代表方式を従来の全件QCへ自動fallbackしない。|
|方式の指定がない既存job|従来のfull QC条件と戻り値を維持。|

開始前はjobの`verificationPolicy`に代表instruction IDs、許される方法、完成後記録の専用pathだけを指定し、別の実承認記録にも同一policyを束縛する。まだ無いMP4のSHAは要求しない。6件、372字幕、216px等を新しい定数にしていない。代表選択が実planにあるかは生成前に検査する。

完成後の記録は実MP4のSHA/size、job/承認/manifest/文字設定、実描画計画のcanonical SHA、各代表の位置/方法/結果/説明/根拠file SHAへ束縛する。方法は静止画、本文・時計・文脈、代表区間実再生を分ける。全編再生/音声聴取/人間品質採用はこの接続の自動判定範囲外で、未評価を保持する。

元normal入力の本文/atom ID/時計/設定照合、既存overlayルール、完成媒体の寸法/frame/audio検査、元AAC packet payload保持検査を再利用する。代表方式では全件completed-frame/counterfactual視認QCを呼ばない。既存`evaluateQc(requireFinalVisibility:false)`の戻り値はルール/媒体の根拠に限り、`layoutAndVisibility:passed`を全件視認成功として最終結果へ流用しない。

公開資格は実storage contextとprivate WeakMapの同じ結果に限る。JSONコピー/pure評価/fake contextは公開できない。公開前、既存atomic rename後、Core受取時に実MP4をstream hashで再照合し、代表記録・根拠bytesと現在のgrant/保存先/実装を再確認する。一般trust/default、任意jobの許可、元ID/時計/音声、排他、容量/メモリ/停止条件は変えていない。

検証は共通8、job/最終結果9、renderer9＋既存1、caller/Core7＋既存2、supervisor12、実保存入力7の計55件成功。runner/Remotion型検査・syntax・差分検査も成功。保存入力試験は依存参照を省いた初回6/7失敗を保持し、正式runnerと同じNODE_PATHで7/7成功。private資格の偽造拒否と、本番と同じpure projection/renderer分岐のspy検査を区別した。owner/deviceを持つ本番contextで媒体を製造・公開する全面正例は未実行。[実file SHA・対象試験・未実施範囲](representative-normal-completion-verification-20261004.json)。

監視summaryの`completed`はworker exit0を表す。動画の完成判断には製造receiptの`status`/`complete`を使う。今回の実装完了を動画品質の採用やZEV全体の完成にはしない。

**次の具体的一手：確認待ちで終了した保存媒体を、代表記録の追加後に再描画せず確定する入口の限定接続。** 現修正は確認待ちの保存/状態伝達までで、process終了後のrecord-only finalize入口は未実装。新たに全動画を作るのでなく、保存済み最終結果/plan/実MP4/記録を同許可・新ownerの下で再束縛し、同じ検査とatomic確定へ渡す差分を次に絞る。判断担当は親mona、具体指示後の実装担当は同じMac実装者。今回その入口や新製造へ先行着手しない。
