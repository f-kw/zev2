# presentation リポジトリ実体棚卸し 差分 v002

- 日付: 2026-07-26
- 基準v001: `presentation-repository-inventory-map-20260726-v001.md`
- 基準commit: `d38ca02f35ac549363c1061c70ded338fb717700`
- 対象安定点: `stable/b4-complete-20260726`
- 目的: B4完了までに実測された重複と、残る同型リスクだけを差分更新する

## 1. 規模差分

production・検査・支援・休眠のソース分類と、ソース総数309件はv001から変わらない。
既存production file一件へ読み取り専用入口を追加した。

| file | v001 | v002 | 変更 |
|---|---:|---:|---|
| `run_presentation_caption_display_pair_static_preflight_v001.mjs` | 364行 | 411行 | production監視投影の版付き読取入口とimport時非実行guard |

新しい正式job、実行記録、完了報告は成果物・報告であり、ソース309件へ加算しない。

## 2. v001に無かった実害発見

### 2.1 static preflightの監視tree投影

状態: **実害確定・是正済み**

| 側 | v002停止時の実装 |
|---|---|
| job作成 | 監視root自身を含め、UTF-16順 |
| production | rootの子から始め、英語locale順 |

この二重実装により、preflightは他11件へ合格しながら
読み取り専用検査だけが期待開始投影不一致となった。

是正後はproduction内部処理を正本とし、
`inspectPresentationCaptionDisplayPairStaticPreflightProjectionV001`
から正式job作成が同じ処理を読み取り専用で参照する。
第三の列挙・順序実装は作っていない。

新attemptは開始・終了・期待が同じSHA-256となり、12/12に合格した。

## 3. 同型の水平確認

### 3.1 残る同型疑い

状態: **疑い継続・本修正の対象外**

`run_presentation_caption_display_pair_job_v001.mjs`と
`test_presentation_caption_display_pair_v003.mjs`は、
正式表示計画生成時の監視treeをそれぞれ独立して列挙する。

観測上は両方ともroot自身を含め、UTF-16順であり、現在値は一致している。
今回のstatic preflight不合格には関与していない。
ただし、片側だけが変われば同じ種類の不一致を再発できるため、
将来この正式生成経路へ実データを通す前の共用候補として残す。
本B4修正では契約の異なる生成runnerへ変更を広げない。

runtime内のNode module tree hashについても、productionとfixture準備に
独立した列挙がある。今回のruntime検査は合格しており実害は観測されていないが、
列挙・順序変更時の同型リスクとして残す。

### 3.2 共用済み

`run_presentation_caption_semantic_source_package_job_v001.mjs`は、
production内部の監視投影を
`inspectPresentationCaptionSemanticSourcePackagePreflightProjectionV001`
からjob準備・検査へ共用している。
test側もこの入口を呼び、同じ投影の第三実装を持たない。

### 3.3 別契約のため統合対象としないもの

- B3 package内容の固定7ファイル列挙
- renderer台帳の固定4ファイル列挙
- artifact内容集合の並び
- report一覧・コード地図の列挙

これらは監視root、包含規則、並びの意味がstatic preflightと異なる。
関数名や`readdir`の使用だけを根拠に同じ正本へ統合しない。

## 4. v001の疑い項目の状態

| v001項目 | v002状態 |
|---|---|
| canonical JSONの複数実装 | 継続。版固有byte契約と共用可能計算の切り分けが未完 |
| caption/instruction v001〜v003並存 | 継続。v002/v003のG1〜G3は共有処理へ集約済み |
| telop-line-break/text-metricsの二path | 二重実装ではない判定を維持 |
| candidate 13名を含む文書binding列挙 | 継続。次素材前に汎用台帳化を再検討 |
| 監視treeの列挙・順序 | **v002で新規追加。static preflightは是正済み、正式生成runner側は疑い継続** |

## 5. スケルトン設計への入力

スケルトンでは「同じ集合の完全一致を比較する両側」がある場合、
集合の列挙・正規化・順序を片側ずつ実装しない。
production処理を版付きの読み取り専用入口として参照できるかを先に確認する。

ただし、契約が異なる列挙を名前の類似だけで統合しない。
共用単位は「同じ入力集合・同じ包含規則・同じ順序・同じhash意味」が
全て一致する範囲に限る。

