# ④.5 レンダリング疎結合化 停止報告 v005

## CURRENT_GOAL 4項

1. 今の目的: 動画出力を別プログラムへ分けて疎結合にする。これにより同時に開発を進められ、中間生成物をレビューでき、修正の影響が小さくなって検証しやすくなり、クオリティを上げやすくなる。
2. 主計画上の現在位置: ④字幕品質v002は完了（`stable/caption-quality-v002-20260816`）。④.5 レンダリング疎結合化（演出指示書境界の実装）。
3. 今の作業: 契約設計v001に基づき、注文書・受領書・出力側行分割・新renderer runnerを作り、字幕横型1本とタイトル2本で注文書を人間がレビューできる状態を実証する。正本path上限18件。
4. 今回やらないこと: 字幕縦型 / G4〜G7 / renderer表現力の拡張 / 旧プログラムの物理削除 / A-v002の目視合格・tag / commit・tag・公開 / API通信・費用支出。

## 1. 停止結論

追補v002のschema・受入・値供給の実装と契約検査を進めた後、描画直前の実引数逆引きで、renderer jobが束縛したRemotionとChromiumをoverlay描画へ渡す入口が存在しないことを確定した。

これは本裁定の停止条件「暗黙補完なしでは値の供給経路がない箇所が新たに見つかる」に該当する。追加の正式描画attempt、修正、PRM計上を行わず停止する。

- API通信: 0回。
- 費用: US$0。
- commit / tag / 公開: 0件。
- 既存成果物・stable tagの変更: 0件。
- 同attempt内修正: 0件（本turnでは描画attempt自体を開始していない）。

## 2. 追補v002の到達点

### 2.1 契約と実装

- 追補v002を版付きで起草した。SHA-256は`f19a0ff9a27de640959bbbc81fcf7920b63f7a0c19354bc7bf7c6b2a5fcdf47b`。
- renderer jobの実行入力へ明示的な表示状態IDを追加した。
- admissionは注文書が選ぶprofile一件と、その配下でjobが選ぶ表示状態一件を検査する。
- receiptは同じ表示状態IDを独立転記し、rendererはjobとreceiptの一致を開始条件にする。
- title側は選択済みprofile内の単一表示状態からrenderer jobへ転記する。
- caption側は正式source contextのstable再読値からrenderer jobを組み立てるpure入口まで実装し、保存済みv022正式入力でstrict decode合格を確認した。ただしformal proof実行経路の旧直結処理からの全面切替は未完了である。

### 2.2 検査

追補v002適用後のPRP・PRI・PRL・PRAを新attemptで頭から実行し、36/36合格した。

- TAP SHA-256: `2ae3012a8fba2dce470603860db3900120c6cc9574fa7291dcf9ba48bc1c55a6`
- stderr: 0 byte。
- 終了code: 0。
- signal: none。

44 IDのうちPRM 8件は未実行・未計上であり、44/44とは主張しない。

## 3. 値供給経路の欠落

### 3.1 正式jobが束縛する値

保存済みtitle attempt-0005のrenderer jobは、Remotionとして次を束縛している。

`runner/node_modules/@remotion/cli/remotion-cli.js`

file SHA-256は`a10a711f052487d302dcf52dc08729c84c4deca0dc41c5b708edd1a7b7b48bfa`で、stable再読一致済みである。Chromiumもjob内のabsolute path・file SHAで束縛されている。

### 3.2 実描画が使う値

既存共通描画coreは、overlay描画用Remotionをmodule-private定数`runner/node_modules/.bin/remotion`から取得し、Chromiumもmodule-private定数から取得する。Remotion wrapperの実測SHA-256は`ce899305774fa463310f739b6ee326e55218f86c8d9f423e4c96d77d441d70a3`で、jobが束縛した実体とは別byteである。

新renderer runnerから共通描画入口へ渡している外部実体は、FFmpeg・FFprobe・ImageMagick・TSXとlayout inspectorだけである。Remotion・Chromiumのjob値はadmissionで照合されるが、overlay childの実行引数には到達しない。

### 3.3 許可path内で閉じない理由

1. 共通描画coreのdefault overlay adapterはmodule-privateで、外部からjob-bound runtimeだけを差し替える正式入口がない。
2. 新renderer runner内に同じoverlay props製造とRemotion起動を再実装すると、共通描画処理の計算複製になる。
3. jobのRemotion bindingだけを固定定数のpathへ合わせても、描画がjob値を消費した証明にはならず、追補v001の「rendererは6件をjob fieldからだけ取得する」を満たさない。
4. 共通描画coreを変更可能pathへ加える場合は、親正本§9の18件以外の既存path変更、すなわち19 path目の承認が必要になる。

したがって、暗黙補完、偶然のpath一致、計算複製のいずれも使わずに現行18 path内で閉じる方法はない。

## 4. attempt-0005との関係

停止報告v004のtitle attempt-0005は、layout inspection完了後・最初のoverlay file生成前にchild process非0で停止した。今回のsource実読は、overlay childがjob-bound Remotionを使っていなかった事実を確定する。

ただしattempt-0005は子processのstderr本文を保存していないため、この配線欠落を当該非0終了の単独原因とは認定しない。原因を推測で埋めず、次の契約判断に必要な独立欠陥として報告する。

## 5. 三分法

- 契約設計の意味: 変更不要。外部実行体はrenderer jobとreceiptが所有し、実描画が一致値だけを使う既承認方針は明確である。
- production実装: 欠陥あり。admissionまで届いたRemotion・Chromium bindingがoverlay実行入口へ配線されていない。
- 検査設営: 今回のsource実読停止には該当しない。正式描画を開始していない。

修正には許可path表の改訂が必要なため、第1層のpath判断として停止する。

## 6. 試行枠記録の齟齬

最新裁定は停止回数3、検査設営修正2/5、限定実装修正枠3件を起点としている。一方、作業treeに不変保持されている停止報告v004は停止回数4相当、検査設営修正5/5、限定実装修正3/3を記録している。

本報告ではいずれも上書きせず、正式attemptや追加修正を行っていない。再開時には、v004を試行枠へ算入するかを正本台帳で一意にする必要がある。

## 7. 次の裁定に必要な一問

共通描画coreを変更可能pathへ加えて上限を19へ改訂し、default overlay adapterへjob-bound Remotion・Chromiumを明示入力する最小追補を起草してよいか。併せて、停止報告v004の試行枠実績を現work-order会計へ算入するかを確定してほしい。

許可されても、既存のoverlay props製造・描画・QCは一実装のまま維持し、新renderer runner側へ複製しない。

## 8. 作業領域

- title attempt-0005のjob、receipt、line layout、layout inspection、lock/work rootは不変保持した。
- 新しい動画、overlay、QC、review pageは0件。
- 作業path枠の一時成果物は未整理。完了報告工程へ未到達のためである。
- 退避・削除・再利用は0件。
