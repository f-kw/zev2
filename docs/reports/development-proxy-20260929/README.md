# 7P 開発用軽量proxy

担当: Codex2。開始: 2026-09-29 JST。開始main: `767bf743b822f08edf16e09e249a4e5fe8a12628`。

## 目的と承認範囲

相談役の「Codex2｜7P 開発用軽量proxy 実装指示」（kawafmm承認済み）に基づき、開発・構造検証を960×540/30fpsへ分ける。最終1080pの文字幅・clipping・画素QC・人間品質は540pの合格で代替しない。7Aの全編・replay・529点・最終QC・独立再読は技術完了済みで、その保存物と描画実装を変更しない。

受信した指示原文は既存連絡記録 `runtime/artifacts/caption-readability-native-recovery-20260929-v001/advisor-next-instruction-7p.txt`。7A技術完了報告は同じZEV相談役会話で表示を確認し、`accepted / 7A技術完了`と今回の個別指示を受信した。

## 実装前に固定した方式

- 有限な明示profile `dev-proxy-540p-v001` と1080p最終経路を区別する。未知・未指定profile、proxy入口へのFinal指定は拒否する。
- 保存planは1080p論理座標とする。字幕本文・改行・ID・分割・Color範囲・有限state順・元映像対応・全時計を保持し、描画出力全体だけ承認値0.5で投影する。個々のpaddingやPanel定義を別の丸めで作り直さない。
- 既存Remotion入口を使用する新しいproxy専用描画sessionを外側に追加する。既存sessionは7Aの保存規則にSHA束縛されているため変更しない。bundle/browser再利用、取消、失敗、上書き拒否の既存処理を維持する。
- 元入力SHA・profile・時計・tool・実装とproxy実体を束縛し、検証後に同じproxyを再利用する。元素材や1080p背景を毎回複製しない。30fpsは保持、元60fpsを扱う場合は既存の全体偶数frame抽出を維持する。
- 音声は媒体proxy作成ではcopyする。PCMを保持する投影背景はNUT、AAC素材はMP4として、音声形式と時計を保存する。局所動画の音声切出しは既存のsample時計に従い、必要な局所AAC encodeとpacket copyの境界を明記する。
- 既存の保存viewを正式readerで復元し、有限state、Panel中央補正、fade、合成を既存処理で解決する。新しい開発用保存・再読結果は最終画素QCと異なる版付き記録とし、最終品質未検証を残す。

本来の目的は開発中の時間・容量を減らすことであり、字幕判断やQCの合格条件を変えることではない。任意解像度framework、別cache基盤、1080p全編の再描画、STT/AI、新素材取得、旧成果物削除は行わない。

## 代表入力と検証境界

代表区間は保存済みDigestの7347–7872frame（Normal/Motion）と10058–10552frame（部分Color/Panel/Motion/接続）。同一の投影背景proxyを使い、必要な局所描画、保存・別process再読、再利用、時計・音声・有限状態・配置の検証を行う。PNG・RGB・raw/GBRAP・MP4/NUTの容量は実fileで測り、理論値と混同しない。

全背景の入力は保存済み投影背景（1920×1080、30fps、27,949frame、19,423,708,759 bytes、SHA256 `7f3121a8640b23b29c9093a12f150d5ebfc6fc4f4eb9dbe25b773cf5e9ef6229`）。元動画3時間20分を再取得・再解析せず、完成済みの構成・音声時計に束縛された背景を再利用する。元60fps素材の30fps対応は小型7frame→偶数4frameの実画素試験で確認しており、元動画全体のproxy化を今回実行したとは報告しない。

## 小型試験と局所の解像度確認

- 新規4moduleの試験45件が合格。その後、NUT中間動画の開始時刻修正に対応する描画moduleの7件を再実行して合格。全frame PTSとPCM先頭・sample数を実データで確認した。[試験記録](tests.json)
- 既存1080p関連の22件（投影・時計14、局所合成1、保存candidate境界7）は全件合格、skip 0。既存7Aの全編は再描画していない。
- 保存Scale1件と合成Pulse5状態を、それぞれ1080p／540pで計12 PNGとして描画。元時計・状態順・論理配置、実画像の非空・safe areaを確認した。保存動画にPulseは0件であり、合成試験を実動画の演出として数えない。
- その6状態のPNG合計は769,804→290,257 bytes。実生成したRGB24は37,324,800→9,331,200 bytes、RGBA／GBRAPはそれぞれ49,766,400→12,441,600 bytes。これは累積生成量であり、同時保持量・物理I/Oとは異なる。割当てbytesは軽量証拠に別記する。
- 計測済みの新規診断raw36件だけを削除し、再生成元PNGと各SHA・容量を保存した。旧7Aの画像・証拠は変更していない。
- 縮小後の輪郭端には元alpha範囲×0.5に対し−1〜＋1.5px、幅には最大＋2pxの差を観測した。ラスタ化の観測値として記録し、新しい許容閾値や1080p最終品質合格にはしない。

## 接続修正と保護確認

H.264とPCMをNUTへ保存する際、B-frameにより時刻原点が移動する挙動を小型試験で検出した。全背景proxyと局所NUT中間だけB-frameなしを明示し、時計の検査を維持した。最終1080pのcodec／preset／CRF／合成処理は変更していない。

実Chromium描画はmacOSのsandboxで起動できないため、承認されたホスト実行で確認した。失敗ログを残し、完成保存として扱っていない。

2026-09-29 10:52 JSTの独立確認で、7A描画実装69ファイル、元実行記録、保存描画入力、背景proof、7A全編MP4のSHA不変を確認。7A MP4のSHA256は `c5191911e77c2b20da19b5a4d6156a9c7eabe011134e5bcfa2fb1a6226d6a4fa`。この不変確認は新しい全編QC実行ではない。

## 実走・保存・再読の結果

全て2026-09-29 JST。詳細な入力・出力SHA、時計、音声、開始終了時刻、容量は [measurement.json](measurement.json)。動画と生の実行証拠は `runtime/artifacts/development-proxy-20260929-v001/` に保持し、Gitへ媒体本体を追加しない。

| 工程 | 実測 | 結果 |
| --- | ---: | --- |
| 全背景の初回proxy作成・検証 | 882.789秒 | 27,949frame、全PTS、40,130音声packetと時計が一致 |
| 別processで背景再利用 | 10.296秒 | 再encode・probeなし。入力／出力・実装・toolのSHA再照合 |
| 7347–7872frameの描画・保存 | 35.932秒 | 17.5秒、13字幕・30状態、3,255,122 bytes |
| 同区間の独立再読 | 27.459秒 | 実PNG、PCM範囲、全frame時計、AAC・保存構造の再照合合格 |
| 10058–10552frameの描画・保存 | 40.208秒 | 16.467秒、7字幕・12状態、3,006,231 bytes |
| 同区間の独立再読 | 15.942秒 | 同上、部分Color・Panel・Motion・接続を含む |

初回882.789秒の内訳は、元FFV1背景の全frame時計検査725.885秒、encode107.938秒、出力の全frame時計検査23.950秒、音声packet照合4.640秒、その他SHA・metadata等。元背景の全frame検査は初回のみで、再利用時は記録と実体のSHAを確認する。再利用は0秒ではない。

最初の独立再読と二番目の描画は一部並行した。上表は各処理の経過時間であり、単純合計や旧1080p全編との速度比較には使わない。描画内の小工程と外側の経過時間も加算しない。親Node最大RSSは別記し、子processを含めた同時ピークと物理I/Oは未計測。

### 容量

| 同じ対象の比較 | 1080p | 540p | 条件 |
| --- | ---: | ---: | --- |
| 全投影背景 | 19,423,708,759 B | 535,800,247 B | FFV1→H.264を含む。解像度だけの効果ではない。PCM音声は完全copy |
| 5秒MP4小型容量試験 | 3,606,356 B | 995,277 B | 同じ150frame・libx264/fast/CRF20・共有AAC。差2,611,079 B、72.402%減 |
| Scale/Pulseの6 PNG | 769,804 B | 290,257 B | 同じ論理文字・時計・状態を実描画 |
| 同6画像のRGB24 | 37,324,800 B | 9,331,200 B | 実decodeした累積論理量 |
| 同6画像のRGBA raw／GBRAP（各） | 49,766,400 B | 12,441,600 B | 実decodeした累積論理量 |

5秒MP4試験は保存済み7A動画の7347–7497frameだけを使用し、音声を一度だけ局所AAC変換して両出力へ同一packetをcopyした。音声packet・復号区間SHAと全PTSを照合。これは容量の解像度比較であり、代表proxy描画経路や7Aの再生成・最終品質確認とは別である。全編へ削減率を外挿しない。

記録時の新規実行directoryは574,671,781 logical bytes／581,914,624 allocated bytes。作業中ピークではない。残る大容量物は再利用する全背景proxyと局所媒体であり、旧素材・旧7Aを複製していない。空きは26,053,816,320 bytes。

### 開発用動画

- Normal／Motion: `runtime/artifacts/development-proxy-20260929-v001/normal-motion/development-proxy.mp4`
- 部分Color／Panel／Motion／接続: `runtime/artifacts/development-proxy-20260929-v001/color-panel-connection/development-proxy.mp4`

どちらも開発・構造検証用。人間への最終確認動画としては提出しない。

## 呼出し・再現入口

- 媒体の生成／検証済み再利用: `ensurePresentationDevProxyMediaV001`。入力SHA、明示profile、元時計、tool、実装が一致する既存directoryだけを再利用する。途中保存や不一致は上書きせず拒否する。
- 保存判断から局所／全体の開発描画: `renderPresentationDevProxyV001`。正式に復元した描画入力、投影背景proofとproxy、明示profile、未使用の出力先を渡す。
- 別process再読: `readPresentationDevProxyV001`。保存completionの実体SHAを指定し、入力・実装・tool・state・PNG・音声・全frame時計を検証する。
- 今回の固定入力・区間の実行: `tools/digest-quality/development-proxy-run.mjs` の `prepare`、`media`、`reuse`、`render 0/1`、`reread 0/1`、`preserved`。各記録は上書き禁止なので、記録済みmodeの再実行を新規生成やresumeの代わりにしない。
- 追加の局所容量／幾何試験は同directoryの `development-proxy-geometry-check.mjs` と `development-proxy-mp4-capacity-check.mjs`。旧成果物を入力として読むだけで、新しい診断directoryへ出力する。

既存1080p入口を暗黙に540pへ変更していない。7B以後の開発は今回追加した明示入口を使う。新しい構成には、その構成に一致する投影背景の証拠が必要であり、旧構成のproxyを無条件に流用しない。

## 完了範囲と残る確認

有限profile・1080pとの分離・30fps・0.5投影・保存／再読・再利用・代表描画・実容量・元時計・旧1080p非破壊を確認した。新規試験は最終46項目（変更対象7項目を再実行）、既存小型回帰22項目が合格。Git固定と相談役への直接技術報告をもって7Pを閉じる。

540pでは最終文字サイズ、1080p clipping、細い縁、画素単位のMotion、native距離、人間品質を正式合格にしない。Pulseは小型合成試験のみ。元3時間20分全体のproxy化と新構成の背景製造は今回未実施。これらを実行済みとしない。

7A技術完了と人間最終確認待ちは維持。7Bは相談役から個別指示を受けて続行する。水色の正式採用、STT／AI、新素材取得は今回実行していない。
