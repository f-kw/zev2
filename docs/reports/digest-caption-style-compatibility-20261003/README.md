# 9の後続 — 144px技術候補と表示回答の適合

全218表示単位・289行・3,613atomを、本文・行末・cue終端・元断片・所属・順序・計画時計不変で診断した。既存144px／縁A=8/4のNormal入力では**適合120・不適合98・評価不能0**。9要求すべてに不適合がある。これらは正常な診断結果であり、runはexit0。元条件の表示候補・計画時計acceptは維持する。人間品質や最終styleの合格とは扱わない。

## 技術入力と参照

親正本SHA 4e244e34f9b3f04ed338574801a38eccc76e7b1be4fafb5b6a6fed6827b363b5は不変。設営27/28の追補は別path/SHAでevidenceへ保存。最終受領main f83625b4f8d2e259ad5f3af433fe876e38d0bba1。

一つの正常候補は比較runtimeのattempt-003/verification.json、SHA 2eb9421958f975f9fd0f5200626711c8b61d53fcbf6970b034d5c5ef9c456f0d、raster[tag=0-A,label=0].props。本文「そうなんか男性でも」のNormal静止候補の保存引数を使い、今回の各cue本文・既存関数が索引化した行・診断用識別子だけを入れ替えた。正式instruction/sourcePackage/renderer jobは作らない。

1920×1080、144px、border8/glow4、glow82%、lineSpacing150%、safe area左右4・上下40、horizontal margin0、bottom-center／offsetY -6%、背景nullを同じpropsから使用。元candidate-plan/raster-recordsは比較保存参照のsize/SHAを照合し、元4/4へ戻したelementの全内容一致からA8/4だけの差分を確認。初期7A4/4、B8/12、初期96px/余白80のfieldは混ぜない。

フォントは同参照鎖のpreset-registry（SHA 8e9b0a03…）fontAssetsにあるLINESeedJP_A_OTF_Eb.otf、line-seed-jp-extra-bold-v001。保存propsのfont名／file名と台帳宣言が一致し、current-inspectionの同宣言とも一致。宣言SHA 4f20353d…を保存したが、font binaryは開いておらず、この実行のbyte検証済みにしない。

既存indexExplicitLinesV001で保存行だけを索引化し、元要求の境界片・保存回答の行末/cue末・意味入力のatom本文と元断片IDを照合。候補6の三非連続区間を個別に維持。既存buildExactTextModelとinspectPresentationRenderLayoutV001をそのまま呼んだ。対象processだけNODE_PATHを既存runner/node_modulesへ設定し、React18.3.1/Remotion4.0.481と既存関数の実import/export確認を通過。module importを描画実行へ読み替えず、documentなしの既存推定幅経路だけを使用した。

## 診断と最小対象

不適合98件の既存codeはすべてLAYOUT_SAFE_AREA_VIOLATION。右端を越える行が116あり、左・上・下の越境は0。行数超過・行間の正面積重なりは0。安全領域とstroke/glow/paddingは不変、自動折返し・縮小・省略・再分割はしない。全件の既存違反詳細、wrapper／行矩形、入力style参照、元要求・回答・atom・計画時計をcompatibility.jsonへ保存した。

| 元要求 | 保持区間 | 表示単位 | 適合 | 不適合 | 不適合の元cue番号 |
|---|---|---:|---:|---:|---|
| 1 | segment-0001 | 14 | 9 | 5 | 1, 5, 7, 8, 9 |
| 2 | segment-0002 | 36 | 19 | 17 | 1, 2, 3, 4, 6, 7, 9, 10, 13, 15, 17, 20, 23, 26, 30, 32, 34 |
| 3 | segment-0003 | 5 | 0 | 5 | 1, 2, 3, 4, 5 |
| 4 | segment-0004 | 67 | 41 | 26 | 2, 4, 7, 11, 12, 14, 20, 24, 25, 29, 30, 32, 35, 37, 39, 40, 42, 47, 49, 51, 52, 54, 56, 57, 63, 64 |
| 5 | segment-0005 | 41 | 21 | 20 | 4, 5, 6, 7, 8, 11, 19, 20, 21, 22, 24, 29, 31, 32, 33, 35, 36, 38, 40, 41 |
| 6 | segment-0006 | 15 | 8 | 7 | 4, 5, 8, 10, 11, 12, 15 |
| 7 | segment-0007 | 11 | 6 | 5 | 2, 3, 5, 8, 10 |
| 8 | segment-0008 | 13 | 7 | 6 | 1, 5, 6, 9, 10, 11 |
| 9 | segment-0009 | 16 | 9 | 7 | 3, 4, 5, 6, 7, 10, 15 |

要求単位の最小集合は1〜9すべてだが、変更を検討するcueの最小集合は98件。残る120件のcue末・行末・本文はこの技術候補に適合しており、次要求で参照付きの再利用候補として保持できる。新条件に全量適合する旧回答ファイルは0。旧request SHAを新要求へ付替えたり、旧回答のSHAだけを修正したりはしない。今作業では新要求・新回答は作らない。

次の一案は、同一A候補のstyle/canvas/layoutRules/font宣言と現在実装、元意味・atom・境界・旧回答・時計の参照を束縛した新技術条件の要求を別に準備し、98不適合cueだけを内容判断し直すこと。適合120cueは根拠付き再利用候補として新要求に接続し、そのSHAに対する回答・全被覆検査を新規保存する必要がある。

現行式から、使える幅は1912px、wrapperのstroke/glow分24pxとpadding12px、144pxの1論理重みは72px。重み26ならwrapper1908px、27なら1980pxとなる。観測でも適合の最大文字幅1872px、不適合の最小1944px、全体最大2592pxだった。26はこの一候補に由来する**次条件の提案**であり、製品・旧36・styleLimitsを今回変更していない。二行に収まらない意味単位はcue末の判断も必要で、自動折返しでは閉じない。新条件準備と実回答は相談役の具体的次指示が必要。

## 保存・検証

新runtimeはruntime/artifacts/digest-caption-style-compatibility-20261003-v001/attempt-003/。compatibility.jsonは2,377,757bytes、SHA eb7a7a69c97722fc8433f73d4dbfd7733125d652903498cc1642f036c5336525。manifest SHA 948c1e11d2e6c6745c280f3c1797af956bd47a6b160810018525ba4b9516c02d。log込み3file/2,391,237bytes。

対象strict型検査/runともexit0、実import/export・新先不存在・wx保存を確認。新診断JSONの直後再読一回でobject・実bytes/size・SHA一致。読んだ旧小入力・回答・実装48件のsize/SHA不変。計画時計の全cue内容が診断前後でdeep一致。旧001/002の失敗記録5fileもsize/SHA不変。別process・新否定suite・旧52/9/15/19/4/111、旧QC・旧helper・通常4工程・人間レビューは追加再実行しない。

全件診断27.52ms、小保存再読9.97ms、manifest直前まで193.47ms。新内容判断0、媒体／font binary read/hash/copy/PUT0、copy0bytes、描画0、通常HTTP／新API／費用0。相談役返信待機はaudit-received.jsonに実時刻差を保存し、処理時間とは別。記録整形の独立時間は未計測。

## 設営と失敗保全

- 設営26：初回補助作成。型0後、Markdown正本をJSON readerへ渡してrun1・cue診断0。9dc72330固定版とattempt-001に保存。
- 設営27：相談役のSCOPE_READ_FIX承認でbyte/SHA読取一行＋OUT002＋累積のみ修正。型0後、既存renderer importのReact解決でrun1・cue診断0。0f103935固定版とattempt-002に保存。
- 設営28：相談役のNODE_PATH_FIX承認で対象childの依存path＋OUT003＋累積のみ追従。型0・run0・全218診断・保存再読一致。

製品6／設営28を個別履歴として記録。一般上限・強制停止・自己承認権を変更／リセットしない。親scope、既存reader/Skill/validator/renderer、製品コードや承認意味は不変。

## 未確認と境界

presentation=not-connected、executionPermission=not-approved、humanQuality=pending、outlineChoice=null、ID9-PD-01/02未承認。A8/4は既存技術入力であり縁選択ではない。物理glyph/raster/alpha、実媒体の見心地、最低表示時間・読速、映像音声、最終style、一般本適用は未確認。完成背景の4参照と正式ROOT基準後段接続、演出・動画許可は別残件。媒体・font binary・描画・背景・動画、SSD・削除・公開は行っていない。

担当5fileを通常commit/pushし、対象process終了とGit状態を確認して専用Edgeから直接報告する。相談役の完成返信全文を受領し、許可された具体的次指示だけを同セッションで扱う。新要求／実回答・背景製造・正式style採用・動画への自動着工はしない。
