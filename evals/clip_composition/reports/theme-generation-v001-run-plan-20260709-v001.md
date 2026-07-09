# theme-llm-v001 実走計画

作成日: 2026-07-09

## 実走前の前提

この計画は実走前の確認用であり、まだWeb Gemini実行も採点も行わない。

- 生成系統: `theme-llm-v001`
- プロンプト: `evals/clip_composition/prompts/theme_generation_prompt_v001.md`
- 入力: 元配信単体から作ったtranscriptと配信メタ情報
- 禁止入力: 切り抜き動画、expected、DP照合結果、人間確認メモ、人間逆算テーマ、既存切り抜きタイトル
- 区間選択側の接続先: 実走後に範囲hitと意味等価が確認できた候補だけ、別工程で `llm-v012` compositionへ渡す

## 正解ラベル

| fixture | 正解ラベル |
| --- | --- |
| `UpRyakf5j80_clip_audio_v001` | 登録者数世界2位扱いへの照れと順位変動への冷静な反応 |
| `r_ztjHaHmcg_partial_material_v001` | 配信者が食べていける同接規模について現実的に答える場面 |
| `aX-axQMWR3c_single_material_v001` | Vの組織内あれこれ |
| `XauLZgnWHtA_part01_partial_material_v001` | 逆凸遊戯王 / スタッフと相談 / 変態女装おじさん / 拍手の音 / 実装から2年 朝4時 / 取りたい資格 |

4件目の固定テーマ `4. 【2023年6月①週】10分でわかる先週のにじさんじ爆笑シーンまとめ / 前半 0:00-7:05` は、まとめ切り抜きの編成方針であり、単一元配信から導出できない。そのため、採用済み素材ブロックの章名をテーマ生成の正解候補として使う。未解決章と人間却下ブロックは正解ラベルに入れない。

## 採点

一段目は機械判定:

- 候補の `sourceVideoId` がexpectedと一致する。
- 候補の根拠範囲がexpected区間と時間的に重なる。
- 重なりがない場合、その候補は意味判定へ回さない。
- fixtureまたは正解ラベル単位で範囲hitが1件もない場合は自動失敗。

二段目は人間判定:

- 範囲hitした候補だけを対象に、正解ラベルと意味的に等価かを見る。
- 表現違いは許容する。
- 広すぎて切る対象が定まらない候補、別話題、根拠本文なし、入力漏えい疑いは失敗として記録する。

## 実走単位

- 既存4fixtureを対象にする。
- LLM出力の揺れを見るため、各fixtureで複数runを行う。
- 候補数Nは実験パラメータとして記録する。実走前に値を確定する。
- モデル名、temperature、入力分割方法、候補統合方法をresultに必ず記録する。

## 出力予定

- `outputs/theme-generation/<fixture>/<generationSystem>/<timestamp>/result.json`
- `reports/theme-generation/<fixture>/<generationSystem>/<timestamp>/summary.md`
- 4fixture横断の比較表

resultには最低限次を記録する。

```json
{
  "generationSystem": "theme-llm-v001",
  "promptVersion": "theme_generation_prompt_v001",
  "model": "使用モデル名",
  "params": {
    "temperature": 0,
    "requestedThemeCount": "実走前に確定"
  },
  "fixtureId": "xxx",
  "sourceVideoId": "xxx",
  "themes": [],
  "rangeHits": [],
  "autoFailures": [],
  "humanSemanticJudgements": []
}
```

## 着手前に確認すること

- 候補数Nをいくつにするか。
- Web Geminiで使うモデル名。
- 長尺transcriptを一括投入できない場合、入力分割を発話境界で行うことを許容するか。
