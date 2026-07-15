# 複数素材ブロックfixture凍結preview

- 結果JSON: evals/clip_composition/outputs/multiblock-material-fixture-freeze-preview-nE_bNeBNp4E_multiblock_material_v001-20260715-post-human-dry-run-v001.json
- 人間確認テンプレート: evals/clip_composition/outputs/multiblock-material-human-decision-template-nE_bNeBNp4E_multiblock_material_v001-20260715-post-human-dry-run-v001.json
- fixture ID: nE_bNeBNp4E_multiblock_material_v001
- 素材ブロック: 7
- 素材境界: 6
- 人間確認decision: あり
- fixture書き込み可能: yes
- fixture/expected書き込み実行: no

## 凍結を止めている条件


## 素材ブロックとSTT

| block | clip | source | STT segments | preview |
| ---: | --- | --- | ---: | --- |
| 1 | 90098-137396 | 3932652-3987910 | 171 | たらさ忘れちゃうことってあるじゃんそういうことねじゃあポムさんはコロネの命を懸けてアンワンドンさんはマリの命を懸けるわけにはいかないからペコラの命を懸けて戦おうやるのかあーツッキさん星になるんかスイちゃんの命がかかってんのにたーてぼーくはほーしーどーく耐えていくナイス耐えマリンは誰の命かけてんの?は?マリンはマリンの命 |
| 2 | 144521-164139 | 4009379-4016766 | 31 | ここは一旦迷いなく出していくよ君はでもさマリンがさ好きだったね |
| 3 | 188483-298173 | 4070075-4198226 | 461 | ですかその態度は!やれ!やれ!やれ!じゃないんだよ!やれ!やれ!じゃないんだよ!おい!んだてめえその態度は!は?お前さ!マジ殺してやる!見ろ!バカが!なぁ!マリン疑ってんじゃねぇ!マリンが好きなんじゃなかったんか!てで!何生き残ってんだよぉ!生き残んなお前はぁ!デスカード、デビルカード来ないんだけど来るのかないつか来な |
| 4 | 309885-328730 | 4230098-4251308 | 72 | さすがにそれはないだろうというタイミングでえ?2枚?これでもう4枚出てるって計算になるよねみんなまあ一旦進めよ一旦進めよこの勝負マリンまで回して |
| 5 | 338552-381924 | 4274958-4327614 | 114 | エースが出てるって計算じゃんなのにエース出してるマリンのことどう思うこれ?怪しい?いや、一回さ、ライアーしてみて?いいからみんな!みんな頑張れ!生き残れ!おいおいおいおい!何本当に耐えて!全員死ぬとこでしょ!なんで全員耐えるんだ |
| 6 | 405518-687624 | 4366870-4700965 | 908 | 枚くらいは当然持っていますと3キングベッ!??まあまあまあまあ、みんな一旦、一旦マリンまで回して一旦マリンまで回してこれはちょっと、くぅーくぅー空気読み空気読みみんな怖い?みんな一緒なら怖くないよ一味!そんな!よりによって一味が死んじゃった空気読みしてくれてたのにあそっかペコラの命ペコラさようならペコラペコラの命が尊き |
| 7 | 706442-759546 | 4730747-4787332 | 164 | コロさんの命がかかってんのに何目そらしてんの?ああ他の女を見ちゃいけないから?まあコロさんの命がかかってんのに初手から2枚も嘘をつくとは思わないかなさすがに君がさいきなり2枚も嘘をつくとは思わないそれも本当だと思うここからが本番ってことよ君のコロネの命うさんくさいうなずきだねバカだねそのうなずきライアー何嘘てめえコロネ |

## 書き込み予定先

- fixture: evals/clip_composition/fixtures/nE_bNeBNp4E_multiblock_material_v001/fixture.json
- transcript: evals/clip_composition/fixtures/nE_bNeBNp4E_multiblock_material_v001/transcript.json
- themes: evals/clip_composition/fixtures/nE_bNeBNp4E_multiblock_material_v001/themes.json
- expected: evals/clip_composition/expected/nE_bNeBNp4E_multiblock_material_v001.json

## 制約確認

- 人間確認前はpreviewとdecisionテンプレートだけを出す。
- fixture/expectedへの書き込みは実行していない。
- runtime、本体UI/API/キュー/DBへの書き込みはない。
- 独自係数、重み付け、照合結果からの自動採否は追加していない。
