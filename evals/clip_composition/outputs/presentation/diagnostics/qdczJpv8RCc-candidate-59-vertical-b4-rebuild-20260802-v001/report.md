# candidate 59 縦型 B4再構築失敗 読み取り診断 v001

- 診断日: 2026-08-02
- 対象: `SEMANTIC_COMPILER_REBUILD_FAILED`
- 結論: B1とB4の保存内容・SHAに不一致はない。B4内の汎用実装欠陥が2件連続している。
- 外部通信: 0回
- 費用: US$0
- 正式成果物・production codeの変更: 0件
- 停止カウント: 1/2のまま

## 結論

最初の停止原因は、B4が決定性確認用に入力を複製した際、8個のbyte列を `Buffer` から `Uint8Array` へ変えたことです。byte内容とSHAは変わっていませんが、意味入力の再構築器は `Buffer` を必須としているため、SHA比較より前の入力形状検査で停止しました。

この型変化だけを診断上で戻して先へ進めると、表示計画のSHA欄を組み立てる箇所に未定義の値名があり、次に必ず停止します。両方をメモリ内だけで補正した読み取り診断では、正式runnerが終了0・`passed_pending_human_review`まで到達しました。これは修正後の正式結果ではなく、二つの原因が現在見えている経路を閉じることの診断証拠です。

## B1とB4の具体差

B1はfileから読んだbyte列を `Buffer` のまま再構築器へ渡します。B4も読み込み時点では同じ `Buffer` ですが、正式runnerがcontext全体を `structuredClone` してから二回の決定性buildへ渡します。Node 20ではこの複製により `Buffer` が `Uint8Array` になります。

| 入力成果物 | byte数 | file SHA-256 | B1 | B4複製後 |
|---|---:|---|---|---|
| 境界証拠 | 96,020 | `98ebe52b21ff8abd7e478be4ade7b8e418aa004a3af491c901748111854d216b` | Buffer | Uint8Array |
| Gate A検査報告 | 4,920 | `2866be3e60f44b1aa9b6d524c96d0d495684f410b23ede84dc4997103f9e7dc4` | Buffer | Uint8Array |
| 意味入力 | 24,257 | `28c6f6bf75e4798ed1582f64fde2d893eafa420cc6417fb293916deb5cbf988b` | Buffer | Uint8Array |
| 展開対応表 | 69,689 | `b2115c65b0cd6c68fbd6f9aae848ee42bd4049814d78a65e18afc217602e07a3` | Buffer | Uint8Array |
| 漏洩検査報告 | 2,040 | `7d404e744c56f210f6ee68a56e5de2a9a0eb429f2da92df85ed84f5e573b6020` | Buffer | Uint8Array |
| package manifest | 10,098 | `2ece4fe5335fa7a64f6fe56d801fe571f3feaaef137661cc26134b5815ed6d78` | Buffer | Uint8Array |
| package検査報告 | 5,047 | `581568832eb280a48f1b1d2fe42a33aa65ee1449ae22a2b512c21d846f20d8e6` | Buffer | Uint8Array |
| Gemini意味回答 | 4,581 | `944c1bbf4d150c67252af5901660ff12e58d0956daf5abae2466654d17c1d08d` | Buffer | Uint8Array |

8件とも複製前後のbyte内容とSHAは同一です。差はruntime型だけです。

保存物を直接再構築した値も、B1合格報告と完全一致しました。

- 正式byte SHA-256: `289d505f7f51ff442c740b23c6ff154290dc5c97005fef736d001cf69fecb929`
- canonical SHA-256: `a0fb6e5160dc4c36c44717c97d259409e8b0c8eacd6687af408ab4c594db0f03`

したがって、依頼された「B1が合格させた実体とB4が再構築した実体の差」は、本文・値・SHAの差ではありません。B4の複製後だけ、8つの `.bytes` の型が `Buffer` から `Uint8Array` に変わっています。

## 失敗の順序

1. B4 runnerが保存物8件を正しく読み、byteとSHAを確認する。
2. 決定性確認の二回buildへ渡す前にcontextを複製する。
3. 複製によって8つのbyte列の型だけが変わる。
4. 意味入力再構築器が `invalid compiler input context` で拒否する。SHA比較には到達しない。
5. B4の広い例外処理が内側理由を捨て、`SEMANTIC_COMPILER_REBUILD_FAILED` とだけ報告する。
6. 型だけを診断上で戻すと、表示計画の `semanticCompilerInputBinding.compilerInputObservedByteSha256` を作る直前で、未定義名 `compilerInputObservedByteSha256` を参照して停止する。実際に計算済みの値名は `compilerObservedByteSha256` で、意図値は `289d505f...b929` である。

二つとも素材固有ではなく、B4経路の汎用実装欠陥です。契約矛盾や検査期待の誤りは見つかっていません。

## なぜ既存検査を通ったか

core側の検査は `Buffer` を保ったcontextを直接渡しています。runner側の該当検査は正式buildをstubへ置き換えています。そのため、正式な「読み込み → context複製 → 正式build → 表示計画組立」を最後まで通す正常経路がありませんでした。

修正時は、保存物相当の `Buffer` contextを正式runnerから正式buildへ二回通し、同一成果物と正常終了を確認する回帰が必要です。

## 修正候補

| 案 | 修正箇所 | 契約への影響 | 素材固有 / 汎用 | 追加費用 |
|---|---|---|---|---:|
| A（推奨） | B4 runnerの決定性用複製で8 byte列の `Buffer` 型を維持し、B4 coreの誤参照名1件を正す。正式runner正常経路の回帰を追加 | なし。schema・内容検査・SHA検査・二回buildを維持 | 汎用 | US$0 |
| B | 共有意味再構築器を `Uint8Array` 受理へ広げ、誤参照名も正す | B1/B4共有の入力境界を広げる契約判断が必要 | 汎用だが範囲大 | US$0 |
| C | B4 runnerのcontext複製を外し、誤参照名も正す | schemaは不変だが、二回build間の入力変異隔離が弱くなる | 汎用 | US$0 |
| D（却下） | Geminiを再実走する | 実装欠陥が残るため直らない | 素材attemptだけ | 約US$0.0618 |

案Aが最小です。内容・SHA・契約を一切緩めず、正式経路で失われたbinary型と単純な値名誤りだけを直せます。原因1だけを直す案は、原因2で必ず次に停止するため候補にしません。

## fatal観測性

本件は既知のfatal観測性残件と同型です。B4の広い例外処理が再構築以後の例外を一律のcodeへ畳み、内側理由を正式報告へ残していません。今回は診断を優先し、観測性契約の改訂は行っていません。

## 不変確認と未実施

- 横型正式成果物: 変更0件。
- 読み取り専用H01: 1/1合格。
- candidate 13: 95 path、tree SHA `2c68a23d126586b5e071848858edba637e79839bcb5d0906613d4398e9c62464`。
- candidate 59横型: 91 path、tree SHA `983763b52a60e10fd99126265e7178e4a600fd3024e00614f8abfcc90a724397`。
- 未実施: production修正、正式B4再実行、縦型描画、QC、完成mp4生成。

## 次の判断

次の承認対象は案Aの限定実装です。人間作業は承認1件だけで、追加視聴はまだ不要です。実装後は保存済みB1合格物を使ってB4から再開でき、API通信と追加費用は不要です。
