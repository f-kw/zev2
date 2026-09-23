# Codex2 報告｜2. AIモデル更新

調査日: 2026-09-23。状態: 調査中・移行範囲の判断待ち。モデル更新・API比較の完了報告ではない。

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

UIの選択肢には3.5 Flash、3 Flash Preview、2.5 Flashが残っている。旧選択肢を消すかどうかは、通常runnerの比較結果と合わせて今回の最小整理として決める。

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

## 判断依頼に出す最小案

1. 現在のAPIを使わないSkillをOpenAI APIへ置換する工事、汎用送信client、model routerは作らない。
2. 過去の正式成果物・旧モデルに束縛した契約/検証を一括変更しない。GPT-6 Lunaは保存済み代表要求の比較実走でAPI・応答schema・意味上の参照検証・時間/token/料金を確認する案とする。旧応答のモデル名を書換えてparser成功を装わない。
3. 通常runnerのGeminiについては、3.5と3.8を動画・音声入力およびJPEG配置選択で小さく比較し、問題がないときだけ共有の既定と選択肢を最小更新する。既に3.8の動画理解経路は変更不要。
4. GPT-6へ切替える現行の標準API経路がないため、上記の比較結果と用途別の維持判断で本エピックを閉じてよいか相談役へ確認する。正式な旧モデル検証の契約改訂が必要なら、本指示の範囲だけで黙って進めない。

## 今回の検証・未完了

現時点は読み取り調査のみ。API実走0回、今回のAPI費用US$0、モデル変更0件、test未実行。接続情報は既存の環境fileに存在することだけを確認し、値は表示・保存・送信していない。

GPT-6比較、移行判断、Gemini比較・更新判断、必要なtest、最終commit/push、全18完了条件の確認、相談役への完了報告は未完了。調査reportの監査checkpointは完成承認ではない。
