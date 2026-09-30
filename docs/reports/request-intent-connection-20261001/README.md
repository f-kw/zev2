# Codex2｜9. 通常依頼の制作意図接続

## 受領・着手（2026-10-01 JST）

状態：通常依頼→保存→承認後命令は実測成立。Digestの探索・採否・内部保持には通常callerが無く未接続。範囲境界を保存しGPT_DECISIONへ返すcheckpoint。今回工事の完成ではない。

- 受領：`Codex2 続行指示｜9. 通常の依頼から制作意図を渡す接続`、`decision: continue`、`kawafmm承認済み`。本人の「終わったら次に進んで」に基づく後続限定作業。
- 指示書：`docs/work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v001.md`（保存05c042ae）、指示・現在地の保存HEAD `46219d1037afcf36a5b48bf92f6323946ab9c566`。
- 開始main/local/origin：`68a32038ebcd6dbee62454deca8999bd3d27d33c`、Git clean・staged0・tracked未commit0・untracked0。fetchとfast-forward後、local/originは46219d10で一致。他者の3文書の更新を保持。branch/worktree追加0。
- DECISIONSを参照後、START_HERE→HANDOVER_INDEX全文→今回指示全文→運用3文書とCURRENT_GOALを復元。DECISIONSは追記しない。
- 実行turn metadata：`gpt-6.1-sol`、workspace `/Users/kawafmm/workspace/zev2`。モデル比較は行わない。
- 担当はCodex2のみ、Codex1再起動0。前回b69e168cの実案・局所検査は受理済み、68a32038で終了済みとして保持。
- 報告先はインデックス確認済みZEV Build Loop。同URLの自分専用Edgeタブだけを使う。今回報告は未送信。

## 目的と進め方の確認

通常依頼に指定された全文の制作意図を、保存・承認後の命令から既存の探索・採否・保持の判断入力へ渡す。入力を試験用に組み直して成立したことにはしない。隔離したローカル保存・通常callerの捕捉・別process再読で確認する。既存接続があれば利用し、不足する受渡しだけを修正する。通常runner全体の新設や契約変更が必要なら、現物と最小差分を保存してGPT_DECISIONへ返す。

新しい採用判断・素材取得・STT・動画・外部推論API・実キュー・本番設定・人間視聴は行わない。新しい人間回答／作業要求0、費用0。今回の設営修正0・限定修正0。

## 最初の追跡checkpoint

通常APIは下書き作成と承認時にsharedの処理を呼び、依頼の目的を各命令へ保存する。runnerの工程builderも命令を受け取っている。ところが現時点の`runner/src`と`backend/src`検索では、既存の探索・比較採否・内部保持skillの通常callerが見つからない。通常のテーマ作成はfixed/transcript/sample、構成はテーマの発話群を組み立てる処理であり、前回のDigest判断と同じ実経路かを確認中。型の存在だけで接続完成へしない。

## 通常経路の対応（46219d10の現物）

| 区間 | 実際の呼出しと到達点 | 判定 |
| --- | --- | --- |
| 通常の依頼→保存下書き | control.ts:479のPOSTがshared:615へ渡し、目的を前後空白だけ除去してstate.jsonへ保存 | 接続済み、今回API実測 |
| 人間承認→工程命令 | control.ts:502→shared:647。承認下書きの目的全文・素材URI・編集条件を7工程へ複写 | 接続済み、別意図2入力・新process復元一致 |
| 命令取得→通常runner | index.ts:667/681/800→workflow-step-builders.ts:148/204/239 | 通常factoryへ命令を渡す実callerあり。CLI全体の実走は今回禁止工程を含むため未実行 |
| 通常テーマ作成 | index.ts:438→steps/theme-options.ts:182。sample/fixed/transcript、目的を読まない | Digest探索caller無し。transcript実builderは異なる2目的でも同じ成果物 |
| 通常構成作成 | workflow-step-builders.ts:239→steps/composition.ts:100。目的は渡るが探し直し指示の末尾だけ採取。選ばれた一テーマの発話群を組立 | 比較採否・内部保持caller無し。一般目的を変えても同じ構成 |
| 既存Digest探索・採否・保持 | 3 skillの呼出しはevals、前回acceptance-v001.mts、試験に存在する。runner/src・backend/src・client/srcには定義以外のcaller無し | 通常命令・通常成果物からの接続無し |

`source-bindings.json`に上記実装15参照のSHAを固定した。通常の演出案生成には目的をプロンプトへ渡す処理もあるが、これは探索・比較採否・内部保持の接続証明ではない。

## 保存した局所試験・制限

`connection-probe.mts` / `partial-path-observation.json`。既存control routerをloopbackに載せ、下書き作成・承認は通常POSTを利用した。入力builderは試験専用に再実装していない。試験だけのruntimeを作成し自動runnerを止め、外部推論は呼ばず、実キュー・旧保存物は変更しない。

- 異なる目的2件を通常APIへ入力し、素材・編集条件と一緒に7命令ずつへ全文保存することを確認。
- 未承認下書きは命令0・次命令null。別の目的で作った下書きは旧承認を継承せず、新たな承認まで命令0。重複承認409、空目的400。
- 別processで通常storeから再読した状態はAPIから読んだ保存状態と完全一致。
- 保存済み同素材の44,002断片を読み、通常テーマ・構成の実builderを呼んだ。日時だけ除外して比較すると、異なる一般目的で成果物は一致。内容品質の再選定はしていない。テーマ人間承認・通常runner全工程のE2Eとはしない。
- 既存業務stateと保存全文の試験前後bytes一致。隔離runtimeは削除済み、外部推論・STT・動画・新素材・費用0。
- Digest3判断の実入力捕捉、旧回答／別素材の通常経路拒否は、通常caller自体が無いため未成立。この部分を合格に付け替えない。

実行：shared build、backend type-check、agent-runner type-check（runner+Remotion）合格。probeは初回sandboxのloopback EPERMで未実行、同じcommandを隔離試験の承認scopeで実行し合格。自動審査の拒否なし。pnpmのrunner名誤指定は「該当project無し」だったため合格へ数えず、現物package名へ修正して実施。command修正1、production限定修正0。最初の空の一時dirも削除した。前回工事の設営修正履歴は変更しない。

## GPT_DECISIONへ渡す不足・最小提案

単に目的欄を追加すれば解決する欠落ではない。通常runnerは「候補テーマから人間が一つ選ぶ→関連発話群を構成」の保存物を扱い、Digestは「全文→候補集合→全候補の比較採否→採用候補の全断片keep/drop」の独立保存要求・受理方式を扱う。通常成果物に後者の要求・回答SHA、採否集合、保持被覆を保存／再開するcallerは無い。

推奨する次の一件は、**承認済み通常命令を既存Digestの判断requestへ渡す限定executorの接続**。次の境界を相談役に確定してもらう。

1. 承認済み依頼ID・素材・保存全文参照を検証し、命令に保存した目的全文を探索要求・採否要求・保持指示へ転記する。別目的への旧回答使い回しは既存の要求SHA検査で拒否する。
2. 発話列・候補集合・採否・保持は既存のbuilder／厳密受理を再利用する。前回の素材、文面、件数、尺は固定しない。時刻・ID集合・全断片被覆の検査も維持する。
3. 通常のどの工程から呼び、既存テーマ一件の人間確認・構成保存とどう接続するかを確定する。既存schemaの意味を黙って変えない。必要な新保存形式があれば、その承認前に実装しない。
4. まず通常caller→各判断入力の生成・保存・再読・拒否の範囲に止め、通信しない判断providerで隔離試験する。renderer、キュー体系、UI、API、STT、動画へ広げない。

想定差分箇所：通常の工程caller（runner/src/workflow-step-builders.tsとindex.tsのruntime構築）、命令と保存参照から既存requestを作る限定adapter、同じcallerを通る隔離試験。3判断が必要な保存物を既存theme/compositionへ載せるのが契約変更になる場合は、別の明示指示が必要。通常runner全体の新設・保存契約の意味変更は今回指示書§3の範囲外なので、本checkpointでは製品コードを変更せず追加作用を止め、現物を送る。

現時点では「接続完成」のAUDIT_ONLYを出せない。GPT_DECISIONで、上記の限定接続を現行承認内でどこまで行えるか、または次の最小工事として具体化するかを相談役へ返す。人間の追加視聴・採点・転記依頼0。送信前、Git checkpoint保存中。
