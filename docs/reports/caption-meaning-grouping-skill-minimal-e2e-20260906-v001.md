# 字幕意味まとまりSkill — 最小実動画E2E

## 現在地

2026-09-06「ZEV進行管理２」経由のkawafmm承認済み続行指示に基づく第2 Skill工事。開始HEADはmain `b3f688944b53243633615c9a9d805a0d0b0521c3`。字幕表示区切りSkillの人間評価3項目を既存報告へ追記し、`63bb9ea3e066ae945c1bc93597585825d16a0789` でcommit/push、local/remote main一致を確認した。未判定だった履歴と当時の動画・manifestは保持した。

本工事の目的は、確定発話列を意味のまとまりへ区切る問いを独立したSkillにし、既存の字幕表示区切りSkillを無変更で再利用して実動画へ通すこと。技術合格と人間品質評価を分け、第一完成時には人間目視だけをHUMAN_DECISIONとして残す。

## 現物調査と接続上の判断点

| 現物 | 再利用できる処理・確認した制約 |
| --- | --- |
| `evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs` | 意味が完結するまとまりの終端を提示済み境界IDから選ぶ既存の問い。入力の順序と本文を保持し、表示幅・行末を混ぜない |
| `evals/clip_composition/presentation_meaning_boundary_selection_v001.mjs` | 厳格な回答復号、順序付き範囲の全文被覆検査、元atom列の保存検査を再利用できる。正式selectionの入口はB5/B6実行証拠専用なので、今回のローカル判断の証拠を偽装して渡さない |
| `evals/clip_composition/presentation_meaning_information_package_v001.mjs` | 既存意味境界の製造と参照検査。旧意味情報v001を現行遠方接続入力へ無条件変換しない |
| `runner/src/distant-connection-presentation-meaning-input-v001.ts` | 同じ人間合格素材は190個の確定本文片と発話IDを持つ。前半・後半の所属と全量保持が検査済み。ただし現行形式は全本文を一つの字幕containerとして保持し、字幕配列の件数を1に固定している |
| `runner/src/skills/caption-display-boundaries-v001.ts` | 複数の確定字幕本文を入力できる独立Skill。意味まとまりごとに入力すれば、コードを変更せず表示終端・行末を判断できる |
| `evals/clip_composition/run_caption_display_skill_e2e_v001.mts` | 固定済み素材・媒体・styleの閉包を読み込む入口を再利用できる。一方、現物executorの正式化は一つの字幕containerを前提にし、新規判断のrequest/resultを検査する。別の判断入力をこの実呼出記録と偽る接続はしない |
| `evals/clip_composition/presentation_instruction_artifact_v002.mjs` | 現行Coreの字幕注文書は対象caseから一つの字幕containerを選び、その全本文を表示単位へ分割する。複数の意味字幕をそのまま渡すと最初の一つだけになり、必要な全文被覆を満たさない |

意味境界の既存検査実績は `presentation_meaning_boundary_source_package_v001.test.mjs`、`presentation_meaning_boundary_selection_v001.test.mjs`、`presentation_meaning_information_package_v001.test.mjs` にある。旧実動画実績は `evals/clip_composition/reports/presentation/presentation-meaning-output-first-real-run-stable-point-completion-report-20260806-v001.md`。過去の実績を今回の成功と数えない。

同じ医者失踪→鬼の母の2場面を使用する方針。本文・映像・音声・場面順・styleを固定でき、意味の区切りを独立して試す余地がある。新素材取得や素材変更は不要。

## GPT_DECISION：意味の正本を保持したまま現行Coreへ接続する

### 推奨する最小接続

1. 固定planは前回の固定素材を参照し、2つの場面の所属を保持する。意味まとまりSkillへの入力は、既存発話IDと既存表示入力の境界ID、確定本文だけから作る。時刻・画面幅・過去回答を渡さない。
2. 新しい意味判断を現Codexがローカル標準入力で実際に返す。既存の意味境界回答と同じ形の「各containerの意味終端ID列」を使用する。過去のB5/B6実行を称さない。
3. 独立した検査・昇格処理でID存在、所属、順序、全文被覆を検査し、確定本文とatom参照から意味まとまりの採用成果物を作る。生Skill resultや模造した検査済み印では正式化できない。これは今回の意味判断の正本であり、元の一つの字幕containerの入力を改変しない。
4. 採用済み意味まとまりを複数の確定字幕として、第1 Skillへ実際に渡す。各まとまり内の本文と境界IDは元入力からそのまま使用する。第1 Skillの実装byteは変更しない。意味まとまりをまたぐ表示判断は認めない。
5. 表示結果を各意味まとまり内で検査した後、全表示を元の本文順へ一対一で並べる。この最後の配線は、既存Coreが受け取る一つの字幕containerに対する表示終端・行末の列を決定的に作るだけで、意味を再判断したり隣接表示を結合したりしない。意味まとまり正本と各表示の所属対応を保持し、Coreの表示すべてからどの意味まとまりに属するか追跡できるようにする。
6. 既存source検査・表示終端/行末projection・注文書v002・renderer admission・実レイアウト・technical QCをそのまま通す。新しい意味まとまり正本→表示Skill入力/回答→検査/採用→Core入力→動画を一つのmanifestで束縛する。

### 判断が必要な理由

現行Coreは一つの字幕containerを前提とするため、意味まとまり正本とCore向けの表示列を別に維持する接続が必要である。この接続が責務分離に適合するかを確認したい。意味まとまりを消して第1 Skillへ全本文を渡す方法、意味まとまりを表示行末と同一視する方法、別入力への回答を第1 Skillの実呼出記録と称する方法は採らない。

推奨案なら既存renderer/style規約と旧入力契約を変更せず、意味まとまりの結果が第1 Skillの入力と表示境界の制約に実際に作用する。後方互換分岐や旧意味情報v001への変換は追加しない。新規の専用executorは入力/回答の来歴と段階間の配線だけを担当し、時刻投影・文字幅計算・描画・QCは既存関数を呼ぶ。

判断依頼はこの接続の妥当性だけ。現Codexによるローカル新規判断は今回の指示で明示的に許可されており、新providerやAPI費用の承認を求めるものではない。新しい正本path上限や試行回数を独断で設定しない。

## 実装予定の最小単位

- `runner/src/skills/caption-meaning-grouping-v001.ts`：一つの意味上の問いと権限なしの回答。
- `runner/test/caption-meaning-grouping-v001.test.mts`：入力・出力・実呼出の検査。
- `evals/clip_composition/run_caption_meaning_grouping_skill_e2e_v001.mts`：固定plan、意味/表示の独立した検査・昇格、既存Coreへの接続、由来再検証。
- 同executorの `.test.mts`：不正ID・所属・順序・欠落・本文/時刻生成・直接正式化の拒否、段階間の接続と再現性。
- `evals/clip_composition/jobs/presentation/caption-meaning-grouping-skill-e2e/fixed-plan-v001.json`：今回の2 Skillと同じ固定素材・既存規約・出力先。

これは必要な役割と候補pathの一覧であり、運用上限の設定ではない。既存Skill・renderer・style・Goal・DECISIONS・別作業13pathは変更しない。実動画と実証manifestは別出力へ保存する。

## 検証と比較

現時点では第1 Skillの完成manifestを再検証し、決定的昇格の一致と動画SHA一致を確認した。今回の人間評価は新しい追記が正本となるため、当時の技術manifestに保存された未判定状態は履歴として保持する。第2 Skillの新規判断・実動画・testの合格はまだ主張しない。

第一完成時は、Skill導入前・表示区切りSkillのみ・意味まとまり+表示区切りSkillの3本を示す。前2本は既存動画を再利用する。前回は資料リンクで動画が見られなかったため、比較Markdownに加え、完了時に会話へ3本の動画を直接表示する。人間の問いは内容の追いやすさ、意味の自然さ、字幕の過不足、気持ちよさの4項目とする。
