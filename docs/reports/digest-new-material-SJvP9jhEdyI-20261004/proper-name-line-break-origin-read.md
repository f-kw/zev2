本人の実文には、名前内部の改行禁止は確認できなかった。216px・左右半文字の採用は維持する。禁止は旧正式promptの規則で、216対応の候補要求では文字途中の禁止と同cue内の構成語境での改行を区別した。

| 来歴 | 確認した原文と意味 | 原本SHA |
|---|---|---|
| 本人09:52指示 | 「フォントは１.５倍くらい」「左右には半文字分くらい」「それで進めて」。名前規則の明示なし。 | `8884e977e5761be373c04daceacd993671e263b15565fcfaace80db31142e419` |
| 本人10:30採用 | 「これでいこう」。見本の216px/108px採用、全字幕品質採用ではない。 | `f0e1466475034e396478d7bfb3fef716050f0d17c6d53ab174bd1fc1666b3884` |
| 本人10:31指示 | 「システムとしては固定じゃなくて可変にして」。名前規則の明示なし。 | `a7e228fe5814b32cb168e737bcc23b7f287d43f3ee852546172e3c56ab6c67bf` |
| 旧正式prompt | source-package-v001.mjs:18はcue末・行末を語/固有名詞/反復語/一続き文節の途中に置かない。8月16日commitに存在。commitのhuman-approvedという題だけから本人の各文言を推定しない。 | `7225a3f874e523600cb82f1a93c1e4e5084bdff36594220a7731ffd5830c7cbb` |
| 実装者の新候補task | reflow216-attempt002.mts:20は「文字途中」禁止を保持し、長文節の同cue内構成語/助詞助動詞境改行を明記。旧/new要求はsaved-candidate-rules.jsonへ保存。 | `cc11b610b88834227e8d55ffe64e61f01f8cf654a243dc32c872549e8956c781` |
| 相談役10:56判断 | source-connection-decision-record.jsonが必要な限定接続修正と拒否検査を受理。本文/ID/境界/順序/幅/行数/hash保持、任意task通過や新権限ではない。 | `8255c2579b072ddb2bf339fd56f179e87b97154bc763aecd44f04a199cd71a40` |

既存Skill (`runner/src/skills/caption-display-boundaries-v001.ts:55,87`) はtask文字列と入出力形を検査し、固有名詞の語構成を自動判定しない。制約は外から渡すpromptにある。DECISION/PLANの今回入力化・原handoff該当節にも、本人が名前内部を明示禁止した引用はない。

解釈の限界：語として不可分な名前の文字途中を切ってよいことにはならない。一方、全ての複合名称に含まれる構成語境まで絶対禁止するという定義も記録にない。同cue内で意味の構成語境と説明できるかに判断の余地があり、文字数だけで境界を作ることはできない。

限定した既存例：saved-manifest group3/cue1には「日本事故物件／監視協会」が同cueの二行として保存され、judgmentNoteも「名前の意味構成」と説明する。request/response/result/trace/correspondenceの実bytes SHAを5件とも照合し、lines本文とIDを確認した。correspondence SHA `c856effe6cd88924a75b4e8b2e29720587bb290203ef3ea6d2533593757f03e5`。saved-readbackはpassed。ただし本人が各名称の改行や全動画品質を採用した証拠ではなく、一般例外の根拠にも広げない。

今回の「デスビッグデイム」は親から示された原文のまま。STT表記、音声/画面、語構成は未照合。216px採用・本文/ID/時計/既存検査を維持し、語の中を切る例外・設定変更・正式受理をこの読取では作っていない。

実読取の時刻、原本の全path/size/SHA、旧commitの実bytes SHA、引用位置、例の実IDと時刻は同名JSONに固定。repo/SSD/code/Git変更、媒体/API、他字幕の再採点は0。
