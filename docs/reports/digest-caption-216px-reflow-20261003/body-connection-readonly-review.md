# 限定body再開実装の独立読み取りレビュー

2026-10-03T13:38:28.564862+00:00、HEAD `cc9bdaa362f641d4fa4669b8a24d811c35e052e1`、未commitのadapter＋Core二ファイルを確認。明確なコード上の阻害・危険は今回の読取範囲では見つからなかった。 実行・テストの合格とはしない。

- Coreの固定child追加を取り除いた実bytesは、旧base製造SHA `e37361ca38c9e89507ebb2d40b616cad886a5d79` のCoreと完全一致。opaque qualifier・plan/root同値・generated prefix検査は維持。
- 変更対象外の5実装pathは、実file hashが旧permitと全一致。現行adapter/Core hashは付属JSONへ保存した。新permitのcurrentSHA/clean条件はcommit後の実入口で確認する。
- sourcefactoryは意味・style・sourcePackage・core-plan bindingをNEWOUTで作る。source資格検査のCC.baseRefsはcontinuation.baseの旧四参照と`m.same`で完全一致する場合だけ旧rootを許す。旧sourcePackageの内容・本文を新実装で再受理する処理ではない。
- 旧sourcePackageの実hashと小base三JSONの実hash/sizeをfailure evidenceへ照合した。旧4refsは元path/hash/canonicalのまま、Core assembleのtimelineとrendererJob.cropAppliedBaseMediaへ渡される。
- Core assemble/renderはNEWOUT plan/contextの一致で通常経路へ入る。新renderer-job・meaning/projection/source/style/publicationはNEWOUT、base4入力だけOLDOUT。正式callerは新publicationをcontext.outputRootに照合し、base参照をcontext.resolveでguestへ解決するため、この旧新参照の組合せでprefix拒否される箇所はない。
- source-package publish/readbackはNEWOUTで特別扱いし、private source資格と実bodySHAを検査する。callerの再parse後はprojection/line-layoutが保存済source実hash/canonicalと本文/atom/line対応を確認するため、parseによりWeakSet identityが失われるだけで既存callerが拒否する経路はない。
- 生成書込は固定NEWOUT配下だけ。旧failure31refs・base4refs・元grant/manifest/clock/settingsは維持。generic generated()は既存OLDOUT envelopeをguest読取へ解決するが、publish gateとfactory資格はNEWOUT/旧base4refsでさらに狭くなっている。
- leaseowner hash/親supervisor PID/command・owned-group一致が実入口で確認される。旧PGID残存・旧render/result等存在・NEWOUT使用済み・Core追加差分・他5変更は拒否。自動再開や任意prefixは追加されていない。

未確認：新permit/controller ownershipの実成立、commit後clean/currentSHA、fresh三deviceとpressure/RSS/next-unit、実glyph/完成動画/既存必須QC/実視聴品質。639MB動画の再hash/decodeや追加描画をこの読取レビューでは行っていない。

実code/hash・旧base参照は `implementation-readonly-review.json`。コードがこのhashから変われば、本結果を変更後実装へ流用しない。repo編集・テスト・媒体生成・process操作はゼロ。
