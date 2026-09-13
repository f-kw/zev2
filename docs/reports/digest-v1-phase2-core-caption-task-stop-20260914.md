# ダイジェストv1 Phase 2 — 土台映像合格とCore字幕入力の説明文不一致

**現在の扱い：当初案は不承認となり、実815文字の来歴を保持する専用接続への修正が承認された。** ZEV進行管理３の判断は `REJECT-AS-WRITTEN / APPROVE-MODIFIED-BRIDGE`。下記の「説明文だけ384文字へ投影」は実施していない。Phase 2専用接続の18/18検査と描画前検査には合格したが、文字配置検査のローカル実行制限と、その権限追加の自動審査拒否により現在は停止している。[専用接続の記録](digest-v1-phase2-caption-bridge-20260914.md)を参照。以下は停止時観測と当初提案の履歴である。

2026-09-14 JST。**採用済み12区間の映像・音声製造は合格した。続く字幕のCore入力製造が、固定説明文との不一致で停止した。** 実際のrenderer呼出しは0回。第8回の設営訂正を自走せず、ZEV進行管理３へGPT_DECISIONを依頼する。

branchは `codex/digest-v1`。直前の中間checkpoint `387bc939b3e04097367799174bf64e1cc2e6c37c` は、復旧・来歴照合・325字幕の正式時刻保存について、ZEV進行管理３の完了済み応答でPASS / CONTINUEとなった。

## 今回到達した地点

Phase 1で合格済みの共通処理を変更せず、元動画の713,904フレーム（60fps）と音声時刻を全編検査し、採用済み12区間を結合した。出力の映像・音声・タイムライン・参照hashの検査はすべて合格した。

| 項目 | 実測 |
| --- | --- |
| 字幕前の土台MP4 | `evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/base-media/base-media.mp4` |
| フレーム数 | 44,408（30fps） |
| 長さ | 1,480.2666666666667秒、約24分40.267秒 |
| 映像 | 1920×1080 |
| MP4 SHA-256 | `0de24b8c9b18d33d38e163f0e1eaed8a35aaeea4b2411c507d7947c992545c04` |
| 検証receipt | `base-media/validation-receipt.json`、`passed` |

元動画範囲の合計24分40.234秒と、既存のフレーム単位への投影を通した動画の実測値を区別する。土台映像の製造と全編検査を再実行する必要はない。共通処理が今回の呼出しで作った一時コピー・PCMは、正常終了時の既存処理で片付け済み。

## 拒否の現物

保存済み325字幕から共通Coreの入力を作る既存の製造adapterを一度実行した。入力の再検証と時刻再構築の一致確認を通過した後、字幕再構築用packageの検証で次の一件が返った。

```text
PHASE2_CAPTION_SOURCE_INVALID
/promptInput/taskDescription : task-description
```

新規adapter `digest_v1_phase2_manufacturing.mts` の入力投影は、字幕Skillへ渡した指示全体を再構築用packageへコピーする。今回の指示には、kawafmmが承認した「長い非語彙的な持続発声を既存表示容量内で継続分割する」429文字の追記がある。元の384文字と空行を合わせて815文字になっている。

一方、既存の `presentation_output_caption_cue_source_package_v001.mjs` は、説明文が固定の384文字と完全一致することを要求する。初回の字幕指示はその固定文と一致するが、承認後の追加判断の指示は追記を持つため一致しない。既存validatorはその仕様どおり拒否している。

原因は、**意味判断で実際に使用した承認済み指示と、既存Coreが要求する再構築用入力の固定説明文を、adapterが区別して接続していなかったこと**。字幕回答の棄権や本文・時刻の不合格ではない。原回答・325字幕・4,437本文片・保持区間・時刻・styleは変更していない。

字幕packageを公開する前の拒否であり、意味入力、字幕package、字幕採用、表示選択、cue/line投影、描画命令、renderer job、admission、layout、render出力、renderer結果、完成検証の13出力はすべて未作成。合格済み土台MP4は保持している。

## GPT_DECISION — 推奨する限定接続

既存Coreやvalidatorの固定文・検査を変更せず、**共通Coreへ渡す形式と、意味判断で実際に使った指示の来歴を明示的に分ける薄いadapter**で接続する案を推奨する。

1. 実際に判断した新版request、承認記録、原回答、正式字幕時刻、保持採用、土台MP4は不変で保持する。実判断の指示から追記を削除したり、旧方針で判断したと記録したりしない。
2. 共通Coreへ渡す再構築用packageの説明文には、検証済み既存templateが持つ固定値を使う。本文片・境界ID・順序・幅・行数・採用されたcueと行末・時刻は一切変換しない。
3. このpackageが実際のSkill requestそのものではないことと、固定文へ投影した一項目を、版付き接続記録に明示する。実際の新版requestと承認のbinding、入力・出力のhashを記録し、既存の字幕採用が持つ全12件の実判断request/response/resultへのbindingも保持する。
4. 正式字幕時刻に実装SHAを固定済みの既存製造moduleは変更せず、独立した小さな接続入口を追加する。既存の時刻・本文・来歴の再構築と一致検査を維持し、合格済み土台映像を再利用する。既存Coreとrendererはそのまま呼ぶ。
5. 正式な描画前に、実データで再構築用package、選択、cue/line投影、描画命令、論理配置、renderer入力までの全接続をメモリ上で検証する。判断指示・承認・325字幕・4,437本文片・時刻・土台映像の不変、および他の契約違反をこの変換で受理しないことを検査する。全件合格時だけ未使用の出力先へ公開し、新しい実行ログで描画を再開する。

今回の指示は第8回を自走せず同セッションへ報告し、既存work-order・契約内の限定修正なら同セッションで判断するよう明記している。上記の意味判断来歴を保つ形式接続を、その範囲で実施してよいかを判断してほしい。もしこの固定説明文が実際の判断指示との同一性を必須とする契約なら、単なる形式接続では扱えないため、その契約上の理由と必要な判断を示してほしい。

この案はまだ実装・実行していない。既存validatorの期待を変える対応、意味判断の追加、原文・時刻・styleの補正、土台映像の作り直しはしていない。

## 証拠と未完了

証拠は `evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/` 配下の `core-caption-task-stop-v001.json`、`renderer-execution-v001.log`、`base-media-bindings.json`、`base-media-execution-v001.log`、`source-media-inspection.json`、土台映像のtimeline・generation manifest・validation receipt。停止記録には実指示と固定文の両方、関連入力・実装のSHA、未作成出力の一覧を保存した。

復旧後の追加意味判断・音響再観測・API課金通信・新素材取得・費用は0。今回の不合格に対するsource修正は0。人間品質は未評価、完成承認は未申告。字幕付きの完成MP4、renderer、描画後の技術検査は未完了。main merge、tag、stable、releaseは行っていない。
