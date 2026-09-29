# 元解像度描画・QCへの限定接続

## 続行指示（作業記録、承認行の新設ではない）

2026-09-30、ZEV Build Loopから受信。監査基準67bb2a2。Aの540p技術成立を受理、B不合格と人間未選択は維持。

Codex2への次作業指示
decision: continue
対象：同一Digestの元解像度描画・QCへの限定接続

kawafmm承認済みの「人間確認事項を蓄積し、相談役との監査ループで
主線を進める」という継続委任に基づく指示です。
今回追加して許可するのは、既存7秒区間の1080p接続実装・実走・検証です。
1080p全編生成や見た目の正式採用は許可しません。

監査基準commit：
67bb2a2cbfd7ec02cca34cfe7085f20d839bbd32

【1．目的・対象】
既存の表情アップ実証と同じ表示frame 9708〜9918未満、
05:23.600〜05:30.600の7秒・210frameを対象に、
元動画から1920×1080／30fpsで生成し、字幕合成・QC・保存・独立再読まで通す。

縁A=8/4を技術試験の入力として明示する。
人間のoutlineChoiceはnullのまま。Aの正式採用や標準設定にはしない。
Bの不合格・診断終了状態は変更しない。

【2．実装してよい範囲】
tools/digest-quality/内の最終出力用の限定接続と、その対象試験、
今回の作業記録・report・関連する現在地更新。

既存の元解像度描画器、音声・時計処理、字幕解決、局所scope、
native QC、証拠保存を再利用する。
旧540p専用guardの解除、旧reader・束縛済み実装・旧指示書の
書換えで通さない。新しい汎用基盤は作らない。

本指示を今回の作業記録へ保存し、最新mainと作業ツリーを確認して着手する。
対象ファイルと入力対応の確認後、問題がなければ実装・実走まで続ける。
準備完了だけの再承認待ちは挟まない。

【3．元解像度で作る】
final-output-inputs.jsonと保存済みprojectionから入力を解決する。

・表示frameと元動画frame／音声sampleの対応を保存情報から導く。
  接続24frameを含む表示時計と、接続前のbase時計を混同しない。
・保存済み1920×1080の元動画を使用する。
  540p背景や540p字幕PNGの拡大はしない。
・対象区間の字幕を、保存済み本文・改行・144px基準・縁A・色・
  動き・Panel設定を保持して元解像度で描画する。
・アップは既存の正規化viewportと9771〜9853未満の82frameだけ。
  元解像度のcropは保存比率から導き、位置や倍率を新しく判断しない。
・音声は既存の正規抽出・sample対応を再利用する。
  映像の解像度変更を理由に、発話内容・音声処理・時計を変えない。

【4．局所の実走・QC・独立再読まで行う】
背景→アップ→字幕の順で7秒候補を生成する。

対象区間へ既存方式で絞ったplan・baseline・描画viewを使い、
実領域、文字欠け、対象字幕の各描画状態、全210frameの時計、
音声、82frameだけの背景変更を確認する。

この7秒範囲で必要な再描画照合、native画素QC、結果保存、
別processでの独立再読まで実行する。
QCの比較対象・合格基準を減らしたり、既存の成功値を転記したりしない。
540pのreceiptを1080p合格へ読み替えない。

元動画・時刻対応・設定・実装・実媒体・検査結果を結び付け、
別入力、時刻ずれ、欠損、改変、未完了を合格として読めないことを
対象試験で確認する。

既存QCへ接続するために契約や保証の変更が必要と判明した場合は、
その箇所だけ止め、期待する入力・実際の不一致・最小修正案を
GPT_DECISIONで直接報告する。検査を迂回して完成扱いしない。

【5．資源と確認待ち】
開始前・重い工程前に実空きを確認し、今回の短区間で必要な容量を見積もる。
旧成果物削除や7A限定容量guardの一般化はしない。
正常な短区間成果・共有可能な証拠は照合して再利用する。

今回の人間作業は0件。動画を作るたびの即時確認は要求しない。
既存の確認待ち台帳を維持し、技術試験を新たな見た目判断へ変換しない。

【6．完了条件と次の報告】
完了は「元動画由来の1080p局所候補が、QC・保存・独立再読まで成立」。
入力棚卸しや接続コードだけで完了にしない。

局所で確認できた能力と、区間に含まれず未検証の能力を分ける。
この7秒の成功を、全265字幕・全307状態・全構成接続や
9分47.1秒の1080p最終品質へ一般化しない。

実装・証拠を通常commit/pushし、Git状態を確認して、
このZEV Build LoopへCodex2自身が直接報告する。
報告は到達点、QC結果、未解決、時間・容量、commit／Git状態を示す。

NEXT_REQUESTには、今回の結果から最終全編へ残る作業を具体化し、
人間回答なしで進められる次の1件を添える。
通常の技術判断は相談役へ直接送り、kawafmmへ中継を依頼しない。

対象外：
B保証の修正、1080p全編生成、新素材・STT・AI再判断・新規API／費用、
production default／trust／registryの正式切替、
QC基準変更、旧成果物の削除・上書き、正式採用・公開。

## 着手時の接続不一致（GPT_DECISION）

main/originは67bb2a2で一致、他作業の変更なし。既存palette readerで正当に再構築した6字幕・7秒viewを、既存native参照準備・証拠export/restoreへ渡す小型probeで拒否を再現した（qc-boundary.json）。この段階では画素QCは未実行。

既存nativeは内部で登録されたorchestration/readability viewだけを受理する。7B structureと13 paletteは別の厳密readerで再構築するviewであり、そのまま通らない。縁Aの明示解決を加える前から不一致である。元のorchestration証拠へ偽装したり、旧readerの検査を外したりしない。

期待入力：元の7B保存構成・配色・縁Aの明示設定から再構築したplan/baselineと、表示9708〜9918の局所範囲。現行nativeのprepare/inspect/save再読は、これを再構築する入口を持たない。

推奨する限定方針：統合候補の保存入力を厳密に再構築する版付き入口を定め、既存nativeの参照列挙・距離・クラス・判定を維持して接続する。変更が必要なのはnativeの描画view検証と証拠export/restoreの境界。既存の束縛済み実装へ直接追記すると旧証拠のhashを変えるため、対象file/版の扱いを相談役へ確認する。汎用化・検査省略・旧証拠書換えは提案しない。

この接続点のみ判断を依頼し、独立した元解像度7秒生成と時計・音声・実描画検証は既存指示内で継続する。

## 独立実走の事前確認

対象fileはoriginal-resolution-local.mjsと対象試験。旧描画/readerは不変。原動画60fpsのglobal-even抽出を既存recipeから導出し、表示9708〜9918、接続前9696〜9906、原動画30fps格子65339〜65549（60fps130678〜131098未満）、音声sample96048330〜96357030へ対応する。元1920×1080から直接製造する。局所アップは保存比率の320/180/1600/900、局所frame63〜145だけ。144px基準と既存Scale192pxを保持する。

対象は6字幕・6静止状態（Panel1、Scale1、Normal4）。Color/Pulse/Bounce/Shakeや構成接続はこの7秒にはなく、未検証として残す。

実空きは開始前約19.79GB。容量の参考算定は未圧縮YUV420p背景2本で1920×1080×1.5×210×2=1,306,368,000bytes、RGBA字幕12枚で99,532,800bytes、音声2本で4,939,200bytes。動画2本・ログ等は別。これは格納上限でも恒久guardでもない。実際のFFV1/PNG圧縮量・終了残量を別に測る。native比較領域は接続監査後に候補/矩形に基づき見積もる。


## native接続の限定修正指示（65d47fa9監査後）

Codex2への限定修正・続行指示
decision: revise
対象：元解像度7秒のnative QC保存入力接続
監査基準：65d47fa9

今回の指示で、前指示の「tools/digest-quality内のみ」を、
以下の新版入口の追加まで拡張する。
旧保証・判定基準の変更、旧証拠の更新は許可しない。
独立して進めている元解像度7秒生成は継続する。

【1．対象ファイルと版の扱い】

新設対象：
・tools/digest-quality/integrated-native-qc-input-v001.mjs
・evals/clip_composition/presentation_native_frame_qc_preparation_integrated_v001.mjs
・evals/clip_composition/presentation_native_frame_qc_integrated_v001.mjs
・上記の対象試験と、今回新設している元解像度7秒の実行・再読側
・今回のreport／作業記録／現在地更新

nativeの新設2ファイルは、65d47fa9の対応する旧ファイルを
基準にした限定派生とする。差分は入力接続、証拠識別、
再構築、必要な非同期呼出し、import/exportに限定する。
全面リファクタリングやnative一式の複製はしない。

旧orchestration、native本体・preparation、scope、
streaming、証拠store、描画器、7B／palette readerは変更しない。
旧ファイルを別名へ移して元pathを新版へ差し替えることも禁止。

新しい入口・保存入力には固有の版と実装SHAを記録する。
旧証拠の期待SHA更新、旧形式への偽装、実行時のソース置換、
WeakMap／WeakSet検査の解除は行わない。
本番側の既存import先は切り替えず、今回の実行側だけが新版を呼ぶ。

【2．保存入力から正当に再構築する】

新入口は、既存palette evidenceとその厳密readerを起点に、
7B構成・元source対応・配色・明示した技術入力の縁Aを再構築する。

受け取ったplanや「検証済み」というフラグを信頼して登録する
入口にはしない。保存参照・実byte・版を検証し、
再構築した結果との完全照合によってのみ受理する。

以下を同じ入力証拠へ束縛する：
・元の保存参照と再構築結果
・技術入力A=8/4
・人間のoutlineChoice=null
・plan／baseline／effectiveSelections
・projectionと表示9708〜9918未満、全体17,613frame
・元解像度の背景、完成媒体、字幕PNG、使用実装・tool

既存の人間判断や未回答状態は変更しない。
保存後の別processでも同じ入力から再構築する。

palette readerは非同期なので、新版の復元処理と呼出側で
必要なawaitを明示する。Promiseを検証済みviewとして扱わない。
プロセス内登録や前回の成功キャッシュだけで再読を通さない。

【3．baselineと参照候補を正しく接続する】

baselineは、再構築した7B／paletteのprojectedNormalPlanから導く。
縁Aを通常字幕の共通描画条件として扱い、選択側と通常参照側で
意図せず縁だけが異なる比較にしない。
新しいbaselineの保存byte・canonical hashを明示して照合する。

旧sourceContext.baselineRefを付け足して旧入力に見せたり、
旧7Aのbaseline参照を今回のbaselineとして流用したりしない。

局所plan／baselineは、完全な保存viewと同じ表示時計からscopeし、
対象ID・順序・本文・時刻・各描画状態の一致を検査する。
旧scope関数の純粋な切出し処理は再利用してよいが、
旧orchestration viewの検査を通ったことにはしない。

参照候補は既存nativeと同じ意味・順序・網羅性を維持する。
Normal、必要なwhole-color、Panelの板だけを除いた対照、
各motion状態などを勝手に省略しない。

Colorの対照は保存されたpaletteと対象範囲を使う。
水色の対照が旧既定の黄色へ戻らないことを確認する。
今回の7秒に存在しない表現を、実動画で検証済みとしない。

【4．準備・検査・保存再読を一つの新版で閉じる】

新版preparation、native inspect、証拠export/restore、
独立再読のすべてが、上記の同じ再構築入口を使用すること。
準備だけ新版、再読だけ旧版という接続は残さない。

既存streaming／RGB処理／証拠storeはそのまま再利用する。
参照frame、候補列挙、RGB、整数距離、class、可視性判定、
必要な検査範囲と保持方式は変更しない。

新形式を旧validatorで拒否されたとき、検査を省略したり、
旧形式へラベルだけ変えて通したりしない。

旧ファイルとの差分を保存し、数値処理・判定部分に
意図しない変更がないことを機械確認する。
直接呼ぶ旧処理と新版接続の両方の実装SHAを残す。

【5．検証して、元の7秒作業へ戻る】

対象試験では少なくとも次を確認する：
・正当な保存入力の再構築とexport→別process restore
・plan／baseline／scope／縁／paletteの不一致拒否
・欠損・別入力・改変・未完了・未知の版の拒否
・必要な参照候補や描画状態の欠落拒否
・旧入口と旧証拠が不変であること

小型の接続確認が通ったら、再承認待ちを挟まず、
元解像度7秒の実描画→再描画照合→native QC→保存→独立再読まで続行する。
生成済みの媒体・PNGは、入力・設定・実装との一致を検証して再利用する。
接続修正だけを理由に全工程を作り直さない。

今回の完了条件は引き続き
「元動画由来の1080p局所候補がQC・保存・独立再読まで成立」。
adapter単体完成で区切らない。

上記の新版入口以外にも旧保証の変更が必要と分かった場合は、
該当箇所だけを止め、実際の不一致と最小差分をGPT_DECISIONで報告する。
独立作業は継続し、人間への即時作業依頼は行わない。

【6．報告】

今回の変更対象と旧版との差分、入力再構築の検証結果、
7秒媒体・native QC・独立再読の到達点、未確認範囲、
時間・容量、commit／push／Git状態をこの会話へ直接報告する。

B保証の修正、1080p全編生成、新素材・STT・AI再判断・API／費用、
production default／trust／registry切替、正式採用・公開は対象外のまま。


## 原寸7秒の結果（2026-09-30 JST）

**媒体・native QC・共有保存・別process再読まで成立。** A=8/4は今回の技術入力であり、人間の縁選択は未回答（null）。Bの保証問題、全編1080p、正式採用は未完了のまま。

- 媒体：`runtime/artifacts/original-resolution-connection-20260930-v001/attempt-002/normal.mp4`。同directoryの`repeat.mp4`と全byte一致。詳しいSHA・容量・命令は[measurement.json](measurement.json)と保存receiptを参照。
- 1920×1080・30fps・210frame・7秒。完成時計5:23.600〜5:30.600未満、6字幕（Panel1、Scale1、Normal4）。原動画60fpsのglobal-evenから直接製造し、540p拡大なし。保存された局所アップ82frameだけ背景画素が変わり、その他128frameは元背景と一致。音声sample・時計・既存局所入力とのPCM一致。
- 144px基準と既存Scale192pxを保持。実PNG・再描画PNGは6枚ずつ全byte一致、実alphaのsafe area超過なし。元の保存判断・本文・改行・時計・旧画像・旧媒体は不変。
- nativeは22検査点・289論理候補、22/22合格・違反0。新しい入力入口と限定派生nativeを今回の実行だけで使用。旧本番import先は不変。
- 物理RGB生成274、再利用15、距離計算272。正常22点の新規比較RGBを採用済み方式で整理し、receiptと入力を保持。比較RGBの実測ピーク24,279,696bytes、終了0bytes。累積候補RGBの算定501,202,296bytesとは異なる。
- 新しい共有証拠を別processで再読し、保存入力の再構築・全検査点の候補と判定・99必須参照を確認。[native-independent-read.json](native-independent-read.json)。正常整理済みRGBを再生成した検証とは報告しない。媒体の独立検証は[media-independent-read.json](media-independent-read.json)。

### 時間・資源・失敗の区別

- 初回の原動画／背景製造は2.256秒。続く字幕準備でTSXのIPCがsandboxに拒否され、未完了として保存。既存の実行許可で再開し、完成背景の入力・実装・原動画画素・音声を照合して再利用した。初回失敗・背景・証拠を保持し、全工程を再製造していない。
- 再開後の媒体実走は46.631秒。本体と検査9.856秒、再描画と検査9.526秒。背景は保存結果再利用であり0秒実行とはしない。
- その後のnative接続・参照準備・QC・証拠保存／再読は50.757秒。その内、参照PNG準備3.978秒、native本体27.258秒。各工程は包含関係があり足し合わせない。native内部の比較合成4.349秒、RGB比較1.101秒、整理0.379秒などはmeasurementに記録。
- 実装・試験・相談役監査待ちと初回失敗を含む総開発経過時間ではない。独立再読の単独wall、親／子RSS、実物理I/Oは未計測。未計測を0や推測値で補完しない。
- native開始前空き19,581,689,856bytes、終了19,310,030,848bytes。新実行の終了容量は[storage.json](storage.json)に論理bytesと割当てbytesを分離。旧成果物の容量・比較RGBだけの容量と混ぜない。新しい上限値・恒久guardは追加していない。

### 入力・版・検証方式

`integrated-native-qc-input-v001.mjs`は既存paletteの厳密readerから7B構成・配色・全265字幕を再構築し、A共通描画条件の通常baselineを新規保存する。callerが渡すplanや検証済みflagを登録せず、保存byte・入力hash・実装hash・全体時計・局所scopeが一致したviewだけを登録する。旧sourceContextへの参照偽装はしない。非同期の復元はprepare／inspect／別process readerで同じ入口を使う。

新版native2ファイルは65d47fa9の限定派生。[native-input-diff.json](native-input-diff.json)に旧新版SHAと全diffを保存。候補生成、距離、RGB実byteの等価class、unique minimum、可視判定、比較合成の数値処理は旧版とbyte一致する区間を機械確認した。streaming／共有store／旧scope／旧nativeは未変更。全viewの水色whole-color対照が保存水色のままであることも試験したが、今回の7秒の実動画にはColorは存在しない。

再現入口：

```sh
node --test tools/digest-quality/original-resolution-local.test.mjs
node --test tools/digest-quality/integrated-native-qc-input-v001.test.mjs
node --test tools/digest-quality/original-resolution-native-qc.test.mjs
node tools/digest-quality/original-resolution-local.mjs read runtime/artifacts/original-resolution-connection-20260930-v001/attempt-002/completion.json
node tools/digest-quality/original-resolution-native-qc.mjs read runtime/artifacts/original-resolution-connection-20260930-v001/native-001/completion.json
```

実行入口の`run`は未使用directoryだけに出力する。既存の媒体・PNGが検証済みなので、この結果を確認するための再生成は不要。

### 未確認・次へ残る範囲

今回の局所にはColor／Pulse／Bounce／Shake／構成接続がない。全265字幕・307状態、全接続、9分47.1秒の原寸映像・音声・最終QCは未検証。7秒合格から全編品質へ一般化しない。Bの21論理領域不合格、縁選択未回答、局所アップのHUD欠け制約と人間品質未確認を保持する。

次の候補1件：未確認のColorとmotion・構成接続について、同じ保存入力から原寸の有限代表区間を選び、必要な範囲だけQC・保存再読へ接続する。区間数・対象範囲の許可はNEXT_REQUESTで相談役へ確認し、この報告だけで全編や追加改善を開始しない。


### 試験と終了確認

対象試験は9件合格・0件失敗・skip 0（[媒体3件](tests.tap)、[接続3件](connection-tests.tap)、[native保存・故障注入3件](native-tests.tap)）。範囲・本文時計・縁・paletteに対応するplan不一致、未登録view、Promise、未知版、保存参照改変／欠損、未完了媒体、native候補／sample／状態欠落、共有証拠の途中保存／改変を拒否。欠落・二重挿入・別字幕画素を模した小型整数RGBは旧分類と同じ不合格を確認した。

終了確認：原動画由来の原寸局所製造、本文・時計・音声・実PNG、再描画一致、22点native、共有保存、別process再読、旧成果物不変、未確認範囲の分離は完了。大容量媒体・比較RGBは既存ignore領域に保持し、Gitへは今回の実装・試験・軽量結果・report・現在地だけを追加する。Gitと相談役への直接送信結果は最終報告に記す。
