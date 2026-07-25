# B4 T082・T083診断 夜間まとめ v001

- 日付: 2026-07-26
- 主線: B4正式合成検査の残り2件
- 人間作業: 夜間0件。朝の必要判断は修正設計の承認1件

## 1. 到達地点

B4正式検査85/87の残りT082・T083について、正式87件を再実行せず、両CLIの完全なstdout・stderrと内部停止位置を読み取った。さらに、B3正式packageの205境界候補を既存timeline mapperへ全件通す読み取り専用診断を行った。

結論:

- T082・T083の共通停止原因は一件だけ。
- 20msの「っ」を合成正常fixtureが独立表示単位にしたため、30fpsで表示時間0になった。
- 既存時間対応処理は`INSTRUCTION_SOURCE_INTERVAL_ZERO_FRAME`で正しく拒否した。
- runnerはこの内側codeを上位報告へ運ばず、理由欄を空にしていた。
- 契約矛盾ではなく、正常fixtureの欠陥とrunnerの診断情報欠落である。

主線の正本:

- [T082・T083診断／修正設計](./presentation-candidate13-caption-gate-b4-t082-t083-timeline-mapping-diagnosis-and-repair-design-20260726-v001.md)

## 2. 各段の検査結果

### 2.1 既存の正式検査

| 段 | 結果 |
|---|---:|
| 内部画面幾何の数値検査 | 12/12 |
| B4表示計画の正式合成検査 | 85/87 |
| 意味回答側 | 未実行 |
| 回帰 | 未実行 |
| candidate 13 preflight v002 | 未実行 |

### 2.2 T082・T083限定観測

| 項目 | T082 | T083 |
|---|---|---|
| process終了 | 1 | 1 |
| stderr | 0 byte | 0 byte |
| trusted report | 成立 | 成立 |
| semantic seam | passed | passed |
| runtime binding | passed | passed |
| source atom | passed | passed |
| 停止 | timeline | timeline |
| 外側違反 | `TIMELINE_MAPPING_FAILED` | 同左 |

観測:

- `evals/clip_composition/outputs/presentation/test-runs/20260726-caption-b4-t082-t083-diagnosis-v001/observations.json`
- SHA-256: `5db13c6057cf9ba498d50ab5c481e33441740e823c983936780ece33c492ab3c`

### 2.3 205候補の全走査

| 結果 | 件数 |
|---|---:|
| timelineへ写せた | 204 |
| 0 frameで拒否 | 1 |
| その他の失敗 | 0 |

唯一の不成立はcandidate 74「っ」`1952663–1952683ms`で、開始・終了ともframe 58580だった。前後を含む「なった」は8 frameで正常に写せる。

観測:

- `evals/clip_composition/outputs/presentation/test-runs/20260726-caption-b4-t082-t083-diagnosis-v001/timeline-mapping-inspection.json`
- SHA-256: `37b36f9463f4a5f7d0915c9d1a2320d42a211218c6d61363abf768e46099c645`

## 3. 停止条件と現在状態

修正設計を提示したため、主線はコード変更前で停止した。

未実施:

- fixture／runner修正。
- 正式88件への検査追加・再実行。
- 意味回答133件、回帰95件、preflight v002。
- B4完了報告、安定点tag、JOURNAL。
- B5、B6、Gemini API、正式表示計画、描画。

最新の安定点は`stable/b3-complete-20260725`のまま。

修正案:

1. 合成正常fixtureのcandidate 73〜75を「なった」一つの意味groupにする。
2. 正式B3 package、205候補、354文字、timeline、mapperは変えない。
3. runnerがmapperの内側codeを上位報告へ欠落なく運ぶ。
4. 時間対応負例を一件追加し、正式合成検査を88件にする。

## 4. 副線の完了

主線停止後、人間作業0件・新規レポートだけの範囲で次を整理した。

1. [B5設計入力 差分棚卸し](./presentation-candidate13-caption-b5-design-input-delta-inventory-20260726-v001.md)
   - 正式意味判断はAPI、Web Geminiは品質評価。
   - B5はtoken計測と費用上限、実費はB6。
2. [B6実走 受入要件棚卸し](./presentation-candidate13-caption-b6-run-acceptance-requirements-inventory-20260726-v001.md)
   - run 1、再試行0、raw応答、実usage・実費、失敗停止。
3. [ゲートC接続準備 差分](./presentation-candidate13-caption-gate-c-connection-preparation-delta-20260726-v001.md)
   - B2・B3完了後の現在値とB4→B7の残り直列依存。
4. [残件起動条件・依存棚卸し](./presentation-remaining-task-activation-dependency-inventory-20260726-v001.md)
   - 起動条件の無い凍結課題へ着手しない一覧。
5. [次のJOURNAL安定点 根拠索引](./presentation-next-journal-evidence-index-20260726-v001.md)
   - B4完了tagに必要な三条件と証拠。現時点では発行不可。

副線から独立した承認依頼はない。

## 5. 朝に必要な人間判断

優先1件だけ:

> candidate 13 B4 T082・T083 時間対応診断／修正設計v001を承認する。formal success fixtureではcandidate 73〜75の`なった`を一つのmeaning groupへまとめ、合成期待値をmeaning group・cue・line各203件へ固定する。正式B3 package・205境界候補・354 source atom・timeline・mapperは変更しない。runnerは既存mapperの内側違反codeをcue順のまま上位報告へ運ぶ。時間対応負例1件を追加して正式合成検査を88件とし、88件頭から→意味回答133件→回帰95件→preflight v002を一回実行する。不合格1件でも同attemptで直さず停止し、全合格時だけB4完了報告・安定点・B5起草へ進む。

動画視聴、時間指定、複数問への回答は不要である。
