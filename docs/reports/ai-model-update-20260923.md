# Codex2 報告｜2. AIモデル更新

調査日: 2026-09-23。状態: API比較・最小更新・必要な限定検証済み。最終監査提出用。全工程シナリオの既知の固定入力欠落は下記に明記する。

## 目的と調査基準

大量処理の費用と速度を改善し、現行品質を不必要に落とさず、既存経路を小さく整理する。prompt・候補採否・Prospect・STT・QC・renderer・新しいprovider基盤は今回の変更対象にしない。

開始時はmain、HEAD `df5d8eca4754fe34f1b57766f876a9f98079ccfa`、staged 0、tracked未commit変更0、untracked 0。DECISIONS.md、AGENTS.md、監査protocol、CURRENT_GOALと今回の個別指示を照合した。過去のAPI実績と今回の実測を区別する。

指示元は[ZEV Build Loop](https://chatgpt.com/c/6ab30b1e-1f6c-83e8-9c83-56f3030d5ad7)。ユーザーの並列運用修正に従い、担当範囲を分けて調査・実装・testを進め、commit/pushのみ順番に行う。QC担当の変更を取り込まない。

## 実コードから確認した経路

| 処理・現在の位置づけ | モデルと設定元 | 呼出方式・入力・応答 | 推論設定・通信制御 |
| --- | --- | --- | --- |
| 通常runnerの演出案作成、その後の画面配置候補選択 | 依頼のモデル指定を優先。空の場合は環境の指定、さらに共有の既定 `gemini-3.5-flash`。UIの新規依頼も共有の既定を使用 | `@google/genai` 1.52.0の`models.generateContent`。Gemini API keyまたはVertex projectで接続。演出案は本文+音声を含むMP4、配置選択は本文+JPEG。JSON MIME指定、provider向けJSON Schema指定なし。既存JSON parser→演出案検証→配置候補検証 | thinking指定なし。アプリのtimeout指定なし。retry指定なし。導入済みSDKはretry設定なしでfetchを1回実行。モデルfallbackなし。fixed/sample入力は明示した別経路であり、API失敗時fallbackではない |
| 候補動画理解のA/B較正用実装。共通後段としての採用は終了記録で不採用 | `gemini-3.8-flash`を要求・job・応答検証に固定 | 独自のHTTPS REST。Files upload→metadata→countTokens→generateContent。本文+動画・音声、JSON Schema、既存の内容・usage・来歴検証 | MEDIUM。timeoutは実行承認で渡す正整数。retry 0、repair 0、fallbackなし。importだけでは通信せず専用callerが必要 |
| 遠方接続の過去API実験と保存結果検証 | `gpt-5.6-luna`をsource package、要求作成、応答検証、価格snapshot検証に固定 | Responses API用の要求を作成し、生応答を読み取るローカル実装。入力は確定発話本文・anchor等のJSON text。strict JSON Schema。tool/function callingなし。保存transportに実際の`https://api.openai.com/v1/responses`成功記録あり | medium、store false。保存transportは自動retry false。一般的なOpenAI送信clientや環境で切替可能な標準OpenAIモデルは、追跡した現在の実行コードに存在しない。要求作成・結果検証モジュール自体は通信しない。過去の送信処理のtimeoutは保存transportから未確認 |
| 現在の候補探索、採否、字幕表示判断をつなぐSkill実走 | repository内のAPI model IDなし。実行中Codexセッションが判断 | 固定plan→型付き判断依頼→標準入力の回答→既存の検証・投影。候補探索planはAPI禁止を明示。本文の判断であり、動画を新たに解析した事実とは区別 | HTTP APIのreasoning/timeout/retry/fallback設定は該当なし。APIへの置換はモデルID更新だけでは成立しない |
| 旧字幕の意味境界・表示区切りのAPI工事 | 通常の検証は`gemini-3.6-flash`。価格・通信guardには`gemini-3.7-flash`版も存在し、個別job/契約が束縛 | 専用B5/B6 runnerのcountTokens/generateContent REST。本文、JSON Schema、既存parser・全字被覆等の検証 | medium、生成timeout 600秒、one-shot/retry禁止。旧成果物再現の版付き契約であり、モデルだけの一括置換は不適切 |
| 旧縦型配置実走script | `gemini-3.6-flash`をscriptに固定 | SDK generateContent。動画で演出案→静止画で配置選択の2段。JSON MIMEのみ | thinking未指定、記録上retry 0。保存応答再利用モードあり。現在の通常runnerの既定とは別 |
| 旧映像全体探索の実験要求作成・応答検証 | `gemini-3.5-flash-lite`固定 | Interactions API用要求。公開YouTube URLのagentic video処理、JSON Schema。要求作成モジュール自体に送信処理なし | minimal、thinking summary none、store false。3.8 Flashはminimal非対応のためIDのみ置換不可 |
| Web版Geminiでの確認 | Web UIの選択モデル。APIモデルIDから同一性を推定しない | EdgeのWeb版Gemini操作、保存回答の取り込み | APIモデルの更新だけではWebのモデルは切り替わらない |

上表は更新前の調査結果。更新後は共有の既定と新規依頼向けの選択肢を3.8 Flashへ統一した。既存依頼に明示されたモデルや版付き実験契約は書き換えない。環境とrootの.envにモデル上書き指定はなかった。

## 呼出経路と証拠ファイル

- 通常runner: `runner/src/index.ts` の演出作成→`runner/src/steps/edit-plan.ts` の動画入力・演出案受理→同じfileのJPEG候補選択→`runner/src/index.ts` の共通Gemini呼出。既定は `packages/shared/src/index.ts`、新規依頼は `client/src/App.vue`。
- SDKの実挙動: lockfileは `@google/genai` 1.52.0。導入済みSDKの`apiCall`はretry設定未指定なら単発fetch。SDK独自の別API clientの既定timeoutをgenerateContentへ混同していない。
- 動画理解: `runner/src/candidate-video-understanding-v001.ts` と `runner/src/candidate-video-understanding-transport-v001.ts`。現在地は `docs/CURRENT_GOAL.md` と `docs/reports/main-integration-canonical-alignment-20260906-v001.md`。
- OpenAI要求: `runner/src/distant-connection-luna-b5-local-v003.ts`、`runner/src/distant-connection-comparison-luna-b5-local-v001.ts`。source packageとのモデル一致も検査する。
- OpenAI応答: `runner/src/distant-connection-luna-b6-result-v003.ts`、`runner/src/distant-connection-comparison-luna-b6-result-v001.ts`。モデル名と旧価格snapshotの固定を変えずにGPT-6応答を正式成功として通すことはできない。
- 保存済み比較入力の例: `evals/clip_composition/outputs/work-distant-connection-comparison-input-o8rZAhARXAc-v001/exact-request-v001.json`。345,661 bytes、GPT-5.6 Luna、medium、strict JSON、toolなし。
- その過去実走: `evals/clip_composition/outputs/work-distant-connection-comparison-luna-b6-candidates-o8rZAhARXAc-v001/attempt-0001/transport-v001.json`。2026-09-01、HTTP 200、39.464秒、自動再送なし。今回の実測値ではない。
- 現行Skill: `evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts`、`evals/clip_composition/run_candidate_selection_e2e_v001.mts` と `runner/src/skills/`。判断関数が回答を受け取り、API providerを内部で呼ぶ実装ではない。
- 旧字幕: `evals/clip_composition/run_presentation_output_caption_cue_b5_b6_v001.mjs`、`evals/clip_composition/presentation_caption_api_cost_guard_v001.mjs` および版付きの関連B5/B6 runner。
- その他の旧経路: `runner/scripts/run-vertical-preset-legacy-crop-v001.ts`、`evals/clip_composition/gemini_agentic_pleasant_candidate_v001.mjs`。

## 公式仕様との照合

- [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna): ResponsesとChat Completions、structured output対応。Chat Completionsのfunction callingはreasoning noneのみ。今回見つかった旧OpenAI要求はResponses・toolなしなので、その制約に当たらない。Standardの通常text料金は入力US$0.10/M、出力US$0.50/M。長文・cache等の条件は別途適用される。
- [OpenAI移行案内](https://developers.openai.com/api/docs/guides/latest-model): 既存の実効推論設定を対応範囲内で保つ。今回のmediumは対応範囲内。
- [Gemini 3.8 Flash移行案内](https://ai.google.dev/gemini-api/docs/latest-model): 3.8はGA、thinkingはlow/medium/high、minimal非対応。導入価格は2026-12-31まで入力US$0.75/M、出力US$3.75/M。旧sampling指定等を含めた互換確認が必要。

公式ページを検索結果だけでなく本文まで開いて確認した。料金は請求実績ではない。

## 相談役の判断と実装

調査checkpoint `718f51fcbfaea048794b585e4c29ccd3ef3f0a3c` をmainへpushし、同じ相談役会話へCodex2自身がGPT_DECISIONを送信した。相談役から `decision: continue` を確認し、次を今回の範囲として確定した。

- OpenAI: 現行SkillをAPIへ置換せず、過去の契約を改訂しない。保存済みGPT-5.6 Luna要求のモデル指定だけをGPT-6 Lunaに変えて実走し、旧保存実績と比較する。**GPT-6 Lunaは利用可能性を確認したが、現在切替可能な標準OpenAI API経路は存在しないため、今回の本番切替対象なし**。旧実験のGPT-5.6 Lunaは履歴・再現用として維持する。
- Gemini: 通常runnerの演出案とJPEG配置選択を3.5/3.8で比較した。既定を **gemini-3.5-flash → gemini-3.8-flash** へ更新し、新規依頼の古い3 Flash Preview/2.5 Flash選択肢を整理した。UIは元から共有の既定を参照するため、UI側の重複変更は不要。API形態・prompt・JSON処理・保存経路・描画処理は変更しない。
- 既に3.8の候補動画理解は変更なし。旧字幕3.6/3.7、旧縦型3.6、旧全体探索3.5 Flash-Liteは版付き実験の再現用に維持。新しいfallbackや共通routerは作らない。

製品コードの変更は `packages/shared/src/index.ts` の既定値・選択肢のみ。ほかは限定比較script、本report、生応答と測定証拠の計4file。Codex1のQC変更は別commitで、Codex2のcommit対象に含めない。

## 代表入力・比較方法

比較script: `runner/scripts/compare-ai-models-20260923.mts`。証拠: `docs/reports/ai-model-update-20260923.evidence.json`。証拠には送信開始時刻・要求SHA・入力媒体SHA・生応答の原文とSHA・parser結果・使用token・時間・料金算定根拠を残した。API keyは含まない。

OpenAIは上記の確定発話1,323件を含む保存要求を再使用。本文・medium・Responses・strict schema・store false・toolなしを保持し、モデル名だけ変更した。旧モデルの比較対象は2026-09-01の同一要求の保存実走で、今回同時に再実走した数値ではない。要求・生応答のSHAを再検証し、両回答へ既存の意味参照検証を適用した。

Geminiは既存のcandidate-59の51.566667秒MP4（H.264映像、AAC音声）と候補JPEG2枚を使用。通常runner入口から現在のprompt・payloadを取り出し、3.5と3.8へ各段1回ずつ同一byteで送信。保存当時のpromptからは既存の画面分類指示が更新されているため、当時の3.6応答を今回の新旧モデル比較の成績には使っていない。発話本文・動画・JPEGは保存済みのものをそのまま使用。

動画生成とJPEG選択は独立に固定入力比較した。動画応答は現在の通常runner入口から既存の画面検出・テロップ・候補生成検証を通し、JPEG製造へ到達した時点で止めた。JPEG応答は保存済み候補集合に対して通常の配置選択検証を通し、演出案の最終返却形まで確認した。試験用の媒体コピーを、実際のffmpeg描画成功として扱わない。新動画の制作や新Digest生成は行っていない。

両GeminiともSDK `models.generateContent`、JSON MIMEのみ、thinking・sampling・retry・timeoutの追加指定なし。新モデル専用parameter調整は不要だった。動画には音声trackを含むが、API usageはVIDEOとしてまとめて返り、音声だけの使用量は分離できない。

## 実測結果

出力tokenはreasoning/thinkingを含む。料金は公式Standard有料枠の公開単価による見積りで、請求書の確定額ではない。各条件1回なので速度の一般的な優劣までは断定しない。

| 処理 | モデル | 経過秒 | 入力token | 出力token（推論内数） | 見積US$ | API・parser |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 遠方の発話接続・旧保存実績 | GPT-5.6 Luna | 39.464 | 97,818 | 3,244（2,624） | 0.02834715 | HTTP 200・合格 |
| 同一要求・今回実走 | GPT-6 Luna | 47.099 | 97,818 | 4,410（3,692） | 0.014432175 | HTTP 200・合格 |
| 動画・音声から演出案 | Gemini 3.5 Flash | 15.312 | 7,056 | 2,716（2,095） | 0.035028 | 成功・STOP・合格 |
| 同上 | Gemini 3.8 Flash | 7.059 | 7,056 | 1,027（479） | 0.00914325 | 成功・STOP・合格 |
| JPEGから配置候補選択 | Gemini 3.5 Flash | 4.162 | 2,569 | 313（252） | 0.0066705 | 成功・STOP・合格 |
| 同上 | Gemini 3.8 Flash | 5.572 | 2,569 | 278（220） | 0.00296925 | 成功・STOP・合格 |

今回の外部API生成は5回、見積合計 **US$0.068243175**。自動再送0、timeout0、通信例外0。Gemini SDKの成功応答はHTTP status数値を公開していないため、数値の200を捏造せず成功・STOPで記録した。function/tool利用が必要な対象経路はなく、その実走項目は該当なし。

OpenAIは両方とも入力の97,815 tokenがcache write、cached read 0、通常入力3 token。通常入力料金にcache write料金を重複加算せず、write単価を適用した。新モデルの見積費用は約49.1%減だが、今回は旧保存実績より7.635秒長く、速度改善とは判定しない。

Geminiの固定2段の時間合計は19.475→12.632秒（約35.1%減）、費用合計はUS$0.0416985→0.0121125（約71.0%減）。3.8の導入価格は2026-12-31までで、2027-01-01以降の公表価格なら同じ使用量でUS$0.024225となる。これは同一入力の2段の測定値合計で、実際に前段の新出力から描画し直したE2E測定値ではない。[Gemini公式料金](https://ai.google.dev/gemini-api/docs/pricing)

### 内容と必須項目

- OpenAI: strict JSONと必須項目、参照範囲、順序、anchorとの方向一致、重複なしを既存parserで確認。旧7候補・新9候補。新回答を元の発話へ照合し、オリジナル球種の相談→習得、スーパーノヴァ習得→被打、勝利宣言→勝利という対応を確認した。候補の選び方は一致せず、野球の戦術判断の短い接続も含むが、今回の代表入力で明白な破綻は認めなかった。候補の全体的な採用品質向上や再現性までは主張しない。
- Gemini動画: 両方とも話者単独の配置を選択し、コメント欄・装飾は独立映像ではないという理由を返した。タイトル・導入文・断片役割・字幕・画面分類・検出座標・発話参照に欠落なし。両方の字幕は同じ6グループ（発話1–3、4–6、7–8、9–12、13–14、15–16）で、片付け中の脱線→最終的には片付く→無意識に服を脱いだという内容を保持。明らかな内容理解の悪化は認めなかった。
- Gemini JPEG: 両方とも顔と衣装を収める同じ候補を選択し、既存候補参照検証に合格。新しい画面配置や例外処理は追加していない。

## test・未確認事項

| 検査 | 結果 |
| --- | --- |
| `corepack pnpm run type-check` | shared / backend / client / runnerすべて合格 |
| `node scripts/ui-contract-test.mjs` | 合格 |
| `corepack pnpm run web-gemini:review:test` | 既存mockレビュー検査合格 |
| 旧OpenAI要求・結果の既存B5/B6 test | 22 passed、0 failed。旧契約が引き続き異モデルを拒否することも確認 |
| 比較scriptのoffline preflight | 通常runnerから固定媒体の要求作成・既存応答の受理まで合格、外部通信0 |
| 比較scriptの`verify` | 保存した今回5応答と旧OpenAI応答のSHA・要求同一性・parser再検証に合格、外部通信0 |
| 全工程 `node scripts/agent-scenario-test.mjs` | **未完走**。既存固定書き起こしがなく、モデル呼出し前のSTTでENOENT。下記既知事項 |

全工程testが必要とする `runtime/artifacts/draft_w4Lp9IJC6pQl3FsRfFL9t/transcript.json` の欠落は、`docs/reports/main-integration-20260923/README.md` と9月6日統合reportにも記録済み。今回変更していない箇所であり、書き起こしの捏造や別素材による置換は行わない。全体シナリオ合格とは報告しない。必要なモデル検証は上記の実走・既存validator・型/UI/reviewで確認したが、この既知の不足を最終監査にも明示する。

未確認: 多素材での一般化、反復時の速度分布、請求書確定額、音声単独token内訳、Vertex接続での実走、新応答から最後まで描画した映像品質、固定入力欠落によって未完走の全工程シナリオ。今回の小規模なモデル比較を超える検証として区別する。

再検証は `cd runner` で `node --import tsx scripts/compare-ai-models-20260923.mts verify`。live modeは追加費用を生じるため再検証には使わない。初期のtsx CLIのIPC権限エラーはnodeのimport方式で回避。保存当時と現在のprompt完全一致を要求してしまった検査設定は、発話と媒体の固定および現在の同一prompt比較へ修正した。API送信前の設営修正であり、製品prompt変更は0。

## 完了条件の逐次確認

1. OpenAI利用箇所と現行モデル: 特定済み。
2. Gemini利用箇所と現行モデル: 特定済み。
3. GPT-6 Luna代表入力実走: 1件成功。
4. GPT-6 Luna移行可否: 現在切替可能な標準API経路なし、本番切替対象なしと判断（相談役指示に合致）。
5. OpenAI移行実装: 移行対象なしのため該当なし。
6. Gemini更新要否: 通常runnerは3.8採用、既に3.8の経路は変更不要、旧版契約は再現用として維持。
7. Gemini比較・実装: 動画/音声2件、JPEG2件成功、共有の既定更新済み。
8. 必要test: 限定検証合格。全工程シナリオの既知の固定入力欠落は上記の未完走事項として最終監査へ提示。
9. API実走結果: 5件すべて確認済み。
10. 時間・token・費用: 上表と生応答証拠へ保存済み。
11. docs/report: 本reportと証拠を保存済み。
12. unrelated変更: Codex2変更はモデル設定1file・比較script・report・証拠のみ。
13. main commit: 本reportを含む変更を明示stageし、最終報告でSHAを確定する。
14. main push: 最終報告でremote反映を確認する。
15. git status clean: commit後に再確認して最終報告する。
16. untracked 0: commit後に再確認して最終報告する。
17. 全条件再確認: 1〜12は現物を確認済み、13〜18はGit確定と直接送信時に確認する。
18. 相談役会話への直接完了報告: Git確定後にCodex2自身が送信し、送信済み表示を確認する。

終了後は別エピックへ着手しない。
