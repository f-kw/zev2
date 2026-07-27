# Liar's Bar candidate 59: Gate A SHA分離 事前確認停止報告 v001

日付: 2026-07-27  
対象: candidate 59一般性実証の実装ゲート  
基準commit: `cfa7811c917892fccd39edf9c85aa6e3af2dde97`

## 結論

承認条件の停止側に該当したため、B1契約・実装を変更せず停止した。

Gate Aの境界候補生成処理そのものはB1から呼ばれていない。一方で、Gate A実装3ファイルはB1のstatic import連鎖に含まれ、B1実行時にNode moduleとして読み込まれ、top-levelが評価される。したがって「B1は3ファイルをSHA照合にしか使わない」という前提は成立しない。

## 事実

1. B6はB1のCLI関数を同一process内で呼ぶ。
   - `run_presentation_caption_gate_b6_v001.mjs:798-810`
2. B1 runnerはsource package coreをstatic importする。
   - `run_presentation_caption_semantic_output_check_v001.mjs:15-26`
3. source package coreはGate A coreとGate A preflight runnerをstatic importする。
   - `presentation_caption_semantic_source_package_v001.mjs:8-14`
4. Gate A coreは残存発話coreをstatic importする。
   - `presentation_segmenter_boundary_evidence_v001.mjs:5-10`
5. Gate A preflight runnerのCLI本体はentrypoint guardによりimport時には起動しない。
   - `run_presentation_segmenter_boundary_preflight_v001.mjs:1275-1295`
6. B1は3ファイルのbyteを読み、終了前に再読し、現在実体とのSHA一致とimport graphも検査する。
   - `run_presentation_caption_semantic_output_check_v001.mjs:828-835,938-962`
   - `presentation_caption_semantic_output_v001.mjs:961-1047`
7. 削除候補だった生成時SHAと現在SHAの同一要求は、`presentation_caption_semantic_output_v001.mjs:2401-2411`にある。

## 推測

なし。static importによるmodule評価と、Gate A生成処理が直接呼ばれていないことをコード経路で分けて確認した。

## 未確認

生成時SHAと現在SHAの同一要求を、安全に置き換えられる別契約は未設計である。今回の承認は、その設計まで含まない。

## 実施しなかったこと

- B1契約・実装・fixture・期待値の変更: 0件
- candidate 13 B6回帰の再実行: 0件
- source入口の最終構文検査・合成13件: 0件
- candidate 59正式job・確認媒体・通信・正式生成: 0件

## 現在地

停止前から存在するcandidate 59一般化用の途中実装は保持した。B1の対象2ファイルには今回の変更を加えていない。次の判断は、static importによる実行時依存を維持したままSHA世代差を許すのか、import依存自体を分離するのか、計画単位でkawafmmへ戻す必要がある。

人間作業: 判断1件。確認動画や長文照合は不要。
