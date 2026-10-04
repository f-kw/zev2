# 次の動画でコードを書き換えないための入力化

確認：2026-10-04 03:08 UTC。本人02:12 UTC「値を直接書くなよ。。すぐ修正しろ」（Sentinel_ba8cec65481c819192de895a52c0f1a2）を親mona経由で受領。02:13 UTCの「省略せず情報を整理して説明する」指示も保持する。

**実装した範囲：動画ごとの値を、承認済みの一件の計画と明示設定から通常入口へ渡す接続。** 定数を別ファイルへ移しただけではなく、実入力の読み直し、許可との一致検査、Core・字幕source package・監視・合成への接続を追加した。大きな新動画や既存15:23の再製造は行っていない。

|埋め込まれていた値|新しい取得元と検査|
|---|---|
|今回の計画ID、manifestのpath/SHA、素材の論理/実path、元の正常処理owner|`digest-approved-job-v001`の束縛した準備済み入力・candidate manifestを読み、既存normal state/approved request/採用・編集計画からownerと素材参照を再構成する。手書きhandoffの要約を権限の根拠にしない。|
|27,691frame、40,705,770sample、9区間、3,613atom、372字幕|元clockの最終mapping、meaningの区間・atom、受理済み回答から導出し、job.expectedと一致することを確認する。同じ値をCoreから合成まで渡す。|
|216px、左右108px等の今回文字設定と表示容量|束縛したtypography settingsとcandidate propsから計算する。本文・改行・元ID・時計を保持し、全request、保存geometry、style、出力の同一設定を照合する。|
|今回のSSD path/UUID/device、image上限、出力root、22.8/22.9GB等の段階容量見積り|job.storageとallocationBudgetを明示する。実ボリューム・backing image・保存先・原本SHAを再確認。source snapshot/PCMの必要最低量はこの素材のsizeと音声clockから計算し、見積り不足を拒否。圧縮出力の増加は継続監視と既存の次単位+reserve検査で判断する。|
|今回だけの承認ID・日時・旧失敗情報、特定Node path|別に渡す実承認記録がjobの実SHA、計画、manifest、設定、保存先、実装、Node実bindingを束縛する。信頼できる呼出元がjob/承認のSHAを独立指定する。通常jobにはentryRetry/bodyContinuation/previousGrantを入れられない。|

開始50GB、reserve12GB、親子RSS16GiB、pressure1、1秒観測は既存の安全境界として維持する。外付け・image host・内蔵を合算しない。通常のROOT/trust/default、検査免除、任意計画の自動承認は追加していない。1920×1080/30fpsの既存Normal合成方式と有限分割・音声保持を再利用する。

## 通常入口

`runner/src/digest-approved-job-v001.ts`が実job/承認/現在の実装を照合してprivate資格を作り、`digest-approved-inputs-v001.ts`が保存されたnormal入力・表示回答の資格を再構築する。`digest-approved-job-runner-v001.ts`がその資格をCoreへ渡す。Coreの保存先固定は、資格が束縛した計画・出力rootとの等値検査へ置き換えた。JSONやcaller resolverのコピーから資格は作れない。

監視の`--prepare-job`は読み取りだけ、`--launch-job`は同じ検査後に未使用の専用領域を排他的に確保して実行する。ownerのUUID/PID、permitの実SHA、専用PGIDはプログラムが作るので、人が毎回PIDを書き込まない。変更されたjob/承認/owner/permit/実装/Nodeや接続断を検出すると、自分のprocess groupを停止し残存確認する。途中の領域を黙って再利用・削除しない。

```sh
python3 -B tools/digest-quality/original-resolution-full-supervisor-v002.py \
  --prepare-job \
  --job-file "$job_file" --authorization-file "$authorization_file" \
  --approved-job-sha256 "$approved_job_sha256" \
  --authorization-sha256 "$authorization_sha256" \
  --node-path "$approved_node_path"
```

これは実承認済みjob/実SHAを渡す使い方。製造する場合は承認済み範囲で`--launch-job`を使う。架空の承認JSONやhashを補う入口ではない。旧固定一本の回復経路は`--legacy-recovery-only`を明示した履歴経路として保持する。

tsxのレイアウトCLIは、このjobが資格確認したNodeで起動する。専用tempを同じ保存先内で相対指定し、計画名・保存先の長さからIPC名が膨らむ既知の停止を避ける。通常のNODE_PATHはrepo内runner依存へ明示し、任意のNODE_OPTIONSは拒否する。

## 確認した結果

|検査|結果と範囲|
|---|---|
|共通job/許可/文字設定/見積り・コピーした資格の拒否|6/6。異なる61/421/27,691frame、144/216/240px設定、許可・manifest・保存先・入力不足・実装不足の拒否。|
|元の保存入力との結合|7/7。実9区間/372cue/3,613atom/27,691frame/40,705,770sample、本文・時計・geometry・元ownerを確認。外部options変更でも元参照を再読し、元byte改変は拒否。テスト用grantはsyntheticで実製造承認ではない。|
|合成の別尺・旧アルゴリズム|対象9/9。1/211/421/17,613/27,691/32,000frameの分割、欠落・不一致・上書き等の拒否。FFmpeg/媒体生成0。|
|通常jobの監視/prepare/launch|28/28。独立SHA、owner/Node、未使用root、開始条件、継続差替え、任意NODE_PATHの上書きを確認。volume/Git等を置き換えたfixtureの部分を含む。|
|既存の停止処理|8/8。own PGIDの停止・残存0・他process保全。最後の通常専用NODE_PATH差分の直前結果で、旧branchはその後不変。|
|既存sourceの意味・default・資格|関連4/4。指定外の基盤publication等3件は再走していない。|
|型・小CLI|runner/Remotionの型検査、差分空白検査成功。156byte長の実temp絶対pathでも相対tempで実レイアウトCLI exit0/passed。0overlayの小probe、自作temp整理済み。|

対象試験は計62件成功。旧合成の全suiteは9/11で、凍結renderer SHAが現在と違う既存2件は変更前から失敗している。旧凍結hash・receiptを書き換えず、その失敗を保持した。独立読取レビューの指摘2件（合成APIの明示引数、外部optionsの不変snapshot）は修正・再読済み。

[実file SHAと試験証拠](approved-job-verification-20261004.json)。本番の新jobによるSSD確保、source公開・再読、全製造・速度・映像品質の正例は未実行。入力・構造・資格・小プロセス試験の成功を、実動画製造成功とは扱わない。旧成果・SSD contents・原本・回答は変更0。

## 次の動画に残ること

**動画固有値のコード変更は不要になった。** 次の一件では、既存normal経路で承認した素材/計画、採用済み字幕manifest、文字設定、実保存先、段階容量見積りをjobへまとめ、実承認記録と独立SHAを渡す。新素材や次の計画をこの修正が自動承認することはない。

**別の残件：本人指定の「代表数件＋全体は同じルール」による仕上げを、通常の完了結果へ接続する。** 現Core/rendererは従来のfull QC gateを維持しているため、この入力化だけで代表方式の通常完了まで成立したとは言えない。

次の具体的一手は、(1)計画に束縛した確認方法・代表記録の参照を入力へ追加し、(2)全体の本文/ID/時計/設定と媒体基本成立を確認し、(3)同じ完成MP4に結び付く代表確認結果・未視聴範囲を完了結果へ渡す限定接続を確定すること。候補はjobの確認参照、caller/rendererの終了結果型、Coreの終了判定。既存技術QCの失敗をpassedへ偽装せず、全件検査へ自動で戻すfallbackも作らない。今回はこの残件の具体化まで行い、追加実装・新製造は行っていない。判断担当は親mona、次の実装担当は同じMac実装者。

今回動画の[代表区間の読みやすさ評価](readability-assessment-20261004.md)は完了し、現状維持を推奨した。0.4秒の挨拶だけから再製造を始めず、本人へ全件採点を戻さない。
