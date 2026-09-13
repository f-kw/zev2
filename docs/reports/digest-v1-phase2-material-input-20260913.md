# ダイジェストv1 Phase 2 — 第一候補の動画不在と既存代替素材の判断依頼

2026-09-13。`ZEV ダイジェストv1 Phase 2 実装指示`（kawafmm承認済み）を受領した。Phase 1を再工事せず、別素材について既存の候補探索・内部保持・字幕表示判断を新規実行し、C全採用から同じ共通製造経路へつなぐことが今回の目的である。

## 着手前のrepository確認

branchは `codex/digest-v1`。HEADとremote branchはともにPhase 1 PASS checkpoint `665e5f1b42820950ce189847ec61e3e5331b6004`。staged変更、unstaged tracked変更、未追跡のsource・Markdownは0件だった。既存の動画・cache・検査出力は保持し、Phase 0 recovery branchには触れていない。

## 第一候補の現物

指示された `9dtwF5Exu5w` の使用実績・人間に提示できる素材であることは、`DECISIONS.md`の2026-07-19「演出教師候補の誤選定訂正」（現行407行）で確認できる。同記録は、承認済み配信者の4本にこの素材を明記している。7月12日の別素材検証報告にも正式実験での使用履歴がある。

一方、指定の動画 `evals/clip_composition/research/downloads/9dtwF5Exu5w/9dtwF5Exu5w.mp4` は現在存在しない。対象directoryの列挙と、repositoryの無視対象を含む同IDのMP4検索でも見つからなかった。退避folderは探索・操作していない。

次のSTT資産は存在する。

- `evals/clip_composition/stt/9dtwF5Exu5w/clip/manifest.json`
- `evals/clip_composition/stt/9dtwF5Exu5w/clip/transcript.json`
- `evals/clip_composition/stt/9dtwF5Exu5w/clip/word-timestamps.json`

内容は指示どおり全35チャンク処理済み、部分処理ではなく、3,676字幕単位と同数の単語時刻を持つ。長さは1,026.821秒で、参照先は上記の存在しない17分版MP4である。これを別の元配信の時刻へ置き換えたり、原本の動画があると扱ったりしない。

## 既存代替案の現物

同じ題材の元配信 `o8rZAhARXAc` は現存する。これは指定された17分の切り抜き `9dtwF5Exu5w` とは別の動画である。

| 確認項目 | 実測・根拠 |
| --- | --- |
| 元動画 | `evals/clip_composition/research/downloads/9dtwF5Exu5w/sources/o8rZAhARXAc/o8rZAhARXAc.mp4` |
| 動画byte数 | 2,923,277,322 |
| 動画SHA-256 | `4c9911c860f7ed42cf6c66c1ceda605e5818381f695c26116632b1f86c4c2a06` |
| 過去の素材使用承認 | `evals/clip_composition/jobs/gemini-agentic-pleasant-candidates/o8rZAhARXAc-v001.json` にkawafmm承認と当該source ID・path・hashがある。今回読み直した動画byteのhashと一致 |
| 全編STT | `evals/clip_composition/stt/9dtwF5Exu5w_o8rZAhARXAc_local30_v001/source/manifest.json` |
| STT処理状況 | 全397チャンク処理済み、部分処理ではない |
| 本文と単語時刻 | 34,507字幕単位、34,507単語時刻 |
| 元動画の長さ | 11,898.441秒（約3時間18分） |
| 正式発話入力への接続 | 既存の正式発話生成処理をメモリ上だけで実行し、全34,507字幕単位から1,323発話を生成できた。新adapter・新STT・新判断は不要だった |

元動画に対応する本文は `evals/clip_composition/stt/9dtwF5Exu5w_o8rZAhARXAc_local30_v001/source/transcript.json`、SHA-256は `cd79fbf244bdb73b2eb7ddcffa3fca55e087046b72cbf26b69b87856dae01389`。単語時刻は同directoryの `word-timestamps.json`、SHA-256は `fa43146d457125d8768cf11b7e9cbcd51c9a242ebc16d25ab77f998afe9ec950`。本文の動画参照は今回確認した元動画pathと一致する。

過去jobのAPI承認や候補数指定、推論結果を今回へ流用しない。過去jobは素材使用の履歴と動画byteの根拠としてだけ参照する。今回の意味判断は、指示された既存3 SkillのCodex／stdin方式だけを新しく実行する前提であり、まだ0回である。

この元配信には過去の人間評価履歴がある。その事実は既存の `docs/reports/unseen-material-thin-plan-024-material-decision-v001.md` でも申告されている。今回はPhase 1とは別素材での共通経路の成立確認であり、完全に未知の素材での品質や一般性能の証明とは主張しない。過去の正解区間・採否・候補回答を新しいSkillの入力または回答へ渡さず、全編の正式発話列から新規に判断する。

ほかに現存し、7月19日の許可記録にもある `UpRyakf5j80` は43秒の既編集切り抜きで、自動字幕由来の17単位を持つ。今回は人間が先に場面を選ばない候補探索からの接続を確認するため、代替案としては全編の元配信がそろう `o8rZAhARXAc` を推奨する。配信者条件外と記録された素材や、Phase 1成功素材を選び直すことはしない。

## GPT_DECISION

指定の第一候補は使用履歴を確認できたが、動画原本がないという入力前提の差がある。新規取得なしで実行できる元配信 `o8rZAhARXAc` へ対象を切り替え、上記の過去評価履歴を申告したままPhase 2を続行する案を推奨する。

この切替を、今回承認された既存使用可能素材からの選択の範囲で扱ってよいか、ZEV進行管理３へ確認する。17分版 `9dtwF5Exu5w` 自体が必須であれば、新規取得または別の保存元が必要であり、取得を先行しない。

今回追加するファイルは本報告だけ。実装・Skill・validator・Core・renderer・契約・Goal・DECISIONSは変更していない。3 Skillの意味判断、候補採否、動画製造、外部API通信、新素材取得はすべて0回。実装変更がないため回帰試験・Phase 1再証明も実行していない。上記の正式発話生成の読取確認だけを行った。

本checkpointは素材の入力前提を相談する証拠保存であり、Phase 2の技術完成・人間品質合格を意味しない。

## 2026-09-13 判断回答受領後の状況

ZEV進行管理３から、全編正式入力の事前確認と既存3判断の各1回実行等を条件に `o8rZAhARXAc` への切替・Phase 2続行を受領した。受領記録は `evals/clip_composition/jobs/digest-v1/phase2-20260913-v001/received-instruction.json`。その後の新規候補・内部保持判断と、正式な切断位置5か所の未解決は [後続報告](digest-v1-phase2-retention-boundary-20260913.md) を参照。本報告前節の未実行状態は最初の判断依頼時点の履歴として保持する。
