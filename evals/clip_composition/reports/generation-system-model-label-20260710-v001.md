# 採点結果の生成系統モデル名付与 2026-07-10 v001

## 目的

同じプロンプト版でも実行モデルが違う結果を混同しないように、2026-07-10以後に新規作成するLLM採点結果の生成系統ラベルへ実モデル名を含める。

## 実装

- composition採点結果は `llm-v012@gemini-web-flash` の形式で記録する。
- `baseId` にはプロンプト系統だけの `llm-v012` を残す。
- LLM出力JSONの `model` と `--model` が両方ある場合、一致しなければ採点を拒否する。
- どちらにも実モデル名がない場合、採点を拒否する。
- theme採点結果は `theme-llm-v002@gemini-web-flash` の形式で記録する。
- theme採点では、異なるモデルのrunまたはfixtureを1件の採点結果へ混在させない。
- 既存result.jsonを探索・移行・書き換えする処理は追加しない。

## 実動作確認

既存のGemini出力を入力に、新しいresult.jsonを生成した。

- 新規結果: `evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v012/20260710-082308/result.json`
- 新規ラベル: `llm-v012@gemini-web-flash`
- プロンプト系統: `llm-v012`
- 実モデル: `gemini-web-flash`

比較用の既存結果:

- `evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v012/20260708-122001/result.json`
- 既存ラベルは `llm-v012` のまま変更していない。

モデル不一致確認:

- 入力JSON: `gemini-web-flash`
- CLI指定: `gpt-5.6`
- 結果: `--model gpt-5.6 とLLM出力のモデル gemini-web-flash が一致しません` として拒否。

## 検証

- `pnpm run type-check`: pass
- 既存result.jsonの一括更新: なし
- 本体側、runtime、fixture、expectedの変更: なし
