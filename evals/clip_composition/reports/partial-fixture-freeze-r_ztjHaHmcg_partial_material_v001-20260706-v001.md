# 部分fixture凍結結果

- 結果JSON: outputs/partial-fixture-freeze-r_ztjHaHmcg_partial_material_v001-20260706-v001.json
- fixture ID: r_ztjHaHmcg_partial_material_v001
- 書き込み実行: yes
- 人間確認済み: yes
- 固定テーマ: 配信者が食べていける同接規模について現実的に答える場面

## 書き込み先

- fixture: evals/clip_composition/fixtures/r_ztjHaHmcg_partial_material_v001/fixture.json
- transcript: evals/clip_composition/fixtures/r_ztjHaHmcg_partial_material_v001/transcript.json
- themes: evals/clip_composition/fixtures/r_ztjHaHmcg_partial_material_v001/themes.json
- expected: evals/clip_composition/expected/r_ztjHaHmcg_partial_material_v001.json
- human decision: evals/clip_composition/outputs/partial-fixture-human-decision-r_ztjHaHmcg_partial_material_v001-20260706-v001.json

## 除外した未解決区間

| id | clip | source | 理由 |
| --- | --- | --- | --- |
| boundary2_unresolved_clip_33504_51810 | 33504-51810 | 2241469-2314526 | 人間確認で、境界2-Aは2回切り替わり、境界2-Bも無音だが切り替わっていると判定された。単一の素材境界ではなく再分割が必要なため、部分fixtureから除外する。 |

## 区間別文字起こし

| part | source | segments | preview |
| ---: | --- | ---: | --- |
| 1 | 2208172-2224490 | 93 | 結構だねだって僕がPUBGでちょうど伸び始めた時期が100人ぐらいだったはずだけどうん常に100人来るなら全然多分普通のサラリーマンぐらいの月収あるんじゃないかちょい下回るかなぐらいか多 |
| 2 | 2237847-2241469 | 12 | だし昔のアナリティクス見 |
| 3 | 2314526-2316828 | 20 | 100人だとまあでも多分生活できると思う |
| 4 | 2333847-2350553 | 89 | 00人はサラリーマン32人分そんな単純計算かなって思うけどまあ穴勝ち間違ってないこともないかもしれない多分でもそうか単純計算ではあるかそうなんだ単純計算なんだよなそれがすごいよな |
| 5 | 2369790-2382581 | 87 | 同説数とチャンネル登録者数どっちがお金になるのだろうかチャンネル登録者数は別に何のお金にもなんないよチャンネル売るぐらいしかできなくない?分からんけど同説がまあなんだろう結局 |
| 6 | 2399621-2440868 | 219 | あの単純計算だからさマジでだってそうじゃんあのー広告収入が例えば100人に見られてる人は広告収入がじゃあ1円ですと1000人に見られてるなら広告収入が0.5円になりますとかだったらさじゃないじゃんじゃないのよまあなんか日本のサイトとかはそういうことするところありそうだけどYouTubeはそういう仕様じゃないから別に10 |

## 本体影響

- runtime/ への書き込みなし
- 本番UI/API/キュー/DBへの変更なし
- evals/clip_composition/fixtures と expected だけにfixtureを固定

