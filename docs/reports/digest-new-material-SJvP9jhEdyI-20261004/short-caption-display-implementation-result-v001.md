# 短字幕の表示調整 — 実装と計算確認の結果

記録：2026-10-05T06:42:31.350753+00:00。親monaの今回の実装指示を受け、新helper＋通常readerの製品2path、専用試験2pathへ実装した。コードcheckpointは `fa4c504b79bfa7320026466ed8f6453e120fc060`。元STTの精度追究は終了したまま、本文・元ID・順序・元音声/動画・原入力・過去の不合格を保護した。実装と保存JSONの検査は済んだが、実映像の確認と完成動画の更新は未実施である。

## 字幕の変化

表示frameは完成側の30fps時計。元STT観測値を訂正した時刻ではない。世界周辺の27 atomは派生meaningのretainedSpansだけを変更し、元meaningは別参照のまま保持。「お!」の8 atomは元時計を変更せず、質問と一緒に表示する。

| 本文 | 旧表示frame | 新表示frame | 新表示時間 |
|---|---|---|---|
| 世界が終わる | [24988,24991)・3f | [24988,25020)・32f | 約1.067秒 |
| なんか | [24991,24993)・2f | [25020,25029)・9f | 0.300秒 |
| いい雰囲気に／しないで! | [24993,25004)・11f | [25029,25056)・27f | 0.900秒 |
| いい雰囲気に! | [25004,25015)・11f | [25056,25070)・14f | 約0.467秒 |
| 何人いるの?お! | 570の31f＋571の1f | [32545,32577)・32f、一行 | 約1.067秒 |

世界の次469は25070開始のまま。「なんか」とツッコミの統合は、語「雰囲気」を割らずにlogical幅15×2行へ収められなかったため採用しなかった。世界周辺は旧cue/改行を維持。上の時間は今回の局所表示案であり、全字幕へ新しい最低時間値を設けたものではない。時間と幅の計算だけで通常速度の可読性を合格にしない。

新候補は650cue／1041行／5450atom／31group。37,619frameと55,299,930sample、元本文・全量一度被覆・ID・順序を保持。[保存候補](/Users/kawafmm/workspace/zev2/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/inputs-v001/caption-display-adjustment-v001/manifest.json)、manifest実SHA `fa9545b722d698c42adab5a348771f29fb1390914ab376fc43445cb481395c0f`。原manifest/meaning/correspondence/時計の4binding、宣言・派生meaningのcanonical SHAを表示adoptionに保存。原意味と表示意味をmanifestで分け、製造へ渡るsource/adoptionの参照にも接続した。新jobの実helper SHAは通常readerで必須確認する。新しい製造grant/ownerは作っていない。

## 実装と検査

`digest-caption-display-adjustment-v001.ts` が指定した局所から表示spanを導き、元本文/ID/順序/非対象値・世界の旧行境界・収容/非重複・frame往復を検査する。`digest-approved-inputs-v001.ts` は元prepared meaningとSTT由来の正常参照の厳密一致を保ち、実SHAに束縛された表示adoptionを再導出して、派生meaningを既存Coreへ渡す。無調整入力は従来の時計一致を維持し、隠れたoverrideは拒否する。Core・renderer・Python・trust/defaultの製品変更はない。

helper26件、reader11件が成功、失敗0。readerは新候補の通過、実helper binding欠如、adoption欠如、byteに束縛しても改変されたmeaning、旧schemaへのoverride、元651cue/3f/1f経路の保持と偽資格拒否を確認。無関係な旧2件はname指定で未実施であり合格へ数えない。readerのanchorは明示した試験用であり、人間の製造許可やownerではない。runner/Remotionの型検査exit0、diff検査成功。独立読み取りreviewでも未解消blockingなし。[数値・実SHA・試験参照](short-caption-display-implementation-result-v001.json)。

設営補正は計4回：Nodeの既存runner依存解決、readerの元URI prefix、metadata-only fixtureの参照不足、helper testの型注釈。製品拒否条件や試験期待を免除していない。1回目の失敗記録もKEEP。過去suiteの一斉実行・全字幕画像検査・新ASR/alignment/API・新HTMLは0。

## 実映像確認の不足と追加範囲

実glyph、新表示の通常速可読性、音声同期、正式Core資格、新動画反映は未確認。現rendererはstorageContext付きrangeを拒否し、現在の正式Core準備にはlive full-workerのowner/contextが必要。公開metadata builderや保存JSONだけで資格は付かない。旧保存baseの復帰入口は旧full plan/時計/全props一致が条件なので、今回へ流用できない。

正規資格で変更箇所だけを確かめるには、現在の2pathに加え以下の3製品pathが必要な見込み。

| 追加path | 今回に限定した差分 |
|---|---|
| `runner/src/digest-approved-job-v001.ts` | 実2範囲、保存base参照、診断だけの動作をjob/承認へ束縛 |
| `runner/src/digest-approved-job-runner-v001.ts` | 実owner/contextを作り、束縛した保存baseだけを再資格し、Core後に局所描画・合成して終了 |
| `tools/digest-quality/original-resolution-full-supervisor-v002.py` | 限定job/固定commandの照合、資源監視、own PGID終了を維持 |

既存readerにも、その再資格済みbaseだけを受け付ける限定接続が必要。Core/renderer変更は不要の見込みだが未実装のため保証しない。現在の「helper＋通常reader」の指示を越えるので、追加入口は実装せずここで停止する。架空context、旧receipt差替え、full製造を起動して途中で止める代替は行っていない。

## 完成動画を更新する場合

現入口では650 primaryの新描画と全37,619frame（20:53.967）の新合成が必要。物理的に旧PNGがあることは正式再利用許可の代わりにならない。旧全製造は3時間17分42.007秒。その内数は字幕描画/画像検査2時間29分34.579秒、合成22分00.550秒で、二重加算しない。[既存時間台帳](production-time-and-test-ledger-v001.md)。

repeat/mask・重複読取削減後の実全工程は未測定。今回の正確な所要時間は不明で、前回全3時間17分を新製造の見積へそのまま当てはめない。素材取得/STT/上流判断は再実行しない。初回準備/人間介入は別である。child件数減少率を時間へ換算しない。2時間以上の可能性がある工程は先に報告し、今回その工程は開始していない。大容量開始前には、新candidate/実装SHA/許可/owner/device/空きと既存保護条件を実確認する必要がある。

状態：実装と計算/保存JSON検査は完了、局所実映像確認は相談役待ち。次担当は親monaが上の限定局所入口追加か、現正式入口の長時間全尺更新かを具体的に判断し、同じMac実装者へ指示する。旧STT不合格・issue-found・completed receipt未成立は保持、本人へ過去レビュー/開始位置確認/全字幕採点を再要求しない。

cleanup：今回生成媒体0、巨大途中物0、削除0。新候補と失敗/成功の小証拠は後続入力/監査用にKEEP。試験fixtureは試験finallyで整理済み、2026-10-05T06:36:27.832573+00:00に残存0・今回候補/試験/型process0。元媒体/旧job/音声/HTML/旧確認serverは保護。他者process、スティッキーズ、監視設定、旧CUA往復は変更0。[session log](../../work-logs/2026-10/2026-10-05T0642_Codex-SSD_ID9-short-caption-display-implementation_fa4c504b.md)。Git反映の最終SHA/remote/cleanは親への最終報告で確定する。

## 再利用入口の追加確認と今回の時間内訳

原動画、STT、通常採用計画、元時計/検査参照、原字幕回答、変更外本文/境界、font/styleは再利用できる。素材取得・STT・上流判断は不要。しかし現Normalの[542行](/Users/kawafmm/workspace/zev2/runner/src/digest-approved-job-runner-v001.ts:542)ではrecoveryなしならbaseを新生成し、rendererの[2402行](/Users/kawafmm/workspace/zev2/evals/clip_composition/render_presentation_v002.mjs:2402)の全drawStatesから[2463行](/Users/kawafmm/workspace/zev2/evals/clip_composition/render_presentation_v002.mjs:2463)でprimaryを描画する。650新primaryと全尺新合成が今の入口の動作である。

別の[generic resume](/Users/kawafmm/workspace/zev2/evals/clip_composition/render_presentation_v002.mjs:2884)は完成body/exact replay後のQCだけで、旧view/全plan/全PNGrecords/output/reservation一致が条件。表示変更/部分再描画の入口ではない。実props/profileに束縛するnative cacheはあるが、Normal callerは[425行](/Users/kawafmm/workspace/zev2/evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts:425)で注入capabilities/adapterを拒否し、別editing/orchestration入口だけに接続。local repairはrepo限定参照・人間frame観測/UI資格で今回のSSD/display-rule候補に対応せず、renderも全尺。今回の変更箇所だけ再描画してbase/他PNGを使う現行の正式入口は見つからなかった。再利用が原理的に不可能との判断ではなく、正式な接続の不足である。新接続・媒体・測定0。

着手06:08 UTC頃。大まかな経過窓は実装/読取06:08〜06:30、試験/設営補正06:30〜06:36、記録/Git06:36〜06:44、その後は親の再利用確認を受けた読取。これは活動時間・ツール待ちの実測内訳ではない。readerの4回の実試験は合計18.366秒（最後5.175秒）、helper最終26件は0.614秒。型検査・実装・自動承認を含むツール待ち・資料保存の厳密な所要時間は未計測。新たな計測試験や製造を足していない。
