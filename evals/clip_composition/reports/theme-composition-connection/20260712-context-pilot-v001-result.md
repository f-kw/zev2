# theme-llm-v002 → llm-v012 文脈パイロット結果

- 評価の種類: hit済みテーマ限定の条件付き接続評価
- 生成系統: llm-v012@gemini-web-flash
- 上流系統: theme-llm-v002@gemini-web-flash
- 成功基準: 一致=対象expected全件へ到達し両境界±1000ms以内、到達=少なくとも1件と重なる、不達=重なり0または形式不成立
- 未ラベル選択は即減点しない

## 条件別の三段階分布

| 文脈 | 一致 | 到達 | 不達 | 出力形式 | 根拠範囲外へ出た監査 |
| --- | ---: | ---: | ---: | ---: | ---: |
| theme-window-only | 0 | 8 | 1 | 1 | 3 |
| theme-window-plus-minus-5m | 0 | 9 | 0 | 0 | 3 |

## 候補×条件の3 run集計

| 候補 | 文脈 | 一致 | 到達 | 不達 | 最良 | 多数決 | 揺れ | 選択/根拠 長さ比 |
| ---: | --- | ---: | ---: | ---: | --- | --- | --- | --- |
| 3 | theme-window-only | 0 | 3 | 0 | 到達 | 到達 | stable | 1.7742 / 1.7742 / 1.7742 |
| 3 | theme-window-plus-minus-5m | 0 | 3 | 0 | 到達 | 到達 | boundary | 1.7742 / 2.0098 / 2.0098 |
| 52 | theme-window-only | 0 | 3 | 0 | 到達 | 到達 | stable | 1.0000 / 1.0000 / 1.0000 |
| 52 | theme-window-plus-minus-5m | 0 | 3 | 0 | 到達 | 到達 | stable | 1.0000 / 1.0000 / 1.0000 |
| 53 | theme-window-only | 0 | 2 | 1 | 到達 | 到達 | structural | 0.0000 / 0.6134 / 0.6134 |
| 53 | theme-window-plus-minus-5m | 0 | 3 | 0 | 到達 | 到達 | boundary | 1.0000 / 0.6134 / 1.0000 |

## 広い根拠範囲を絞れたか

- theme-window-only: 根拠88.988秒に対する選択長の比は 0.0000 / 0.6134 / 0.6134。
- theme-window-plus-minus-5m: 根拠88.988秒に対する選択長の比は 1.0000 / 0.6134 / 1.0000。
- 比が1未満なら根拠範囲より短く絞った、1なら全範囲、0は採点可能な区間を得られなかったことを表す。

## run別

| 候補 | 文脈 | run | 判定 | 到達expected | 一致expected | 選択数 | 失敗型 |
| ---: | --- | ---: | --- | --- | --- | ---: | --- |
| 52 | theme-window-only | 1 | 到達 | 11 | - | 1 | - |
| 52 | theme-window-only | 2 | 到達 | 11 | - | 1 | - |
| 52 | theme-window-only | 3 | 到達 | 11 | - | 1 | - |
| 52 | theme-window-plus-minus-5m | 1 | 到達 | 11 | - | 1 | - |
| 52 | theme-window-plus-minus-5m | 2 | 到達 | 11 | - | 1 | - |
| 52 | theme-window-plus-minus-5m | 3 | 到達 | 11 | - | 1 | - |
| 3 | theme-window-only | 1 | 到達 | 2 | - | 1 | outside-theme-range-audit |
| 3 | theme-window-only | 2 | 到達 | 2 | - | 1 | outside-theme-range-audit |
| 3 | theme-window-only | 3 | 到達 | 2 | - | 1 | outside-theme-range-audit |
| 3 | theme-window-plus-minus-5m | 1 | 到達 | 2 | - | 1 | outside-theme-range-audit |
| 3 | theme-window-plus-minus-5m | 2 | 到達 | 2 | - | 1 | outside-theme-range-audit |
| 3 | theme-window-plus-minus-5m | 3 | 到達 | 2 | - | 1 | outside-theme-range-audit |
| 53 | theme-window-only | 1 | 不達 | - | - | 0 | output-format, format:selectedCuts[0]のusedSpeechIdsが不正 |
| 53 | theme-window-only | 2 | 到達 | 12 | - | 1 | - |
| 53 | theme-window-only | 3 | 到達 | 12 | - | 1 | - |
| 53 | theme-window-plus-minus-5m | 1 | 到達 | 12 | - | 1 | - |
| 53 | theme-window-plus-minus-5m | 2 | 到達 | 12 | - | 1 | - |
| 53 | theme-window-plus-minus-5m | 3 | 到達 | 12 | - | 1 | - |

## 条件差

- 事前登録規則による本走候補: theme-window-plus-minus-5m
- 決定理由: 事前登録順で比較し、多数決一致 0、多数決到達 3、最良一致 0、最良到達 3、構造揺れ 0 だったため。
- 2条件とも候補単位の多数決と最良は3候補すべて「到達」で、「一致」は0候補だった。選択差は、テーマ窓のみで1件の出力形式不成立が構造揺れとして残り、拡張条件では不達が0件だった点。
- 拡張条件は境界精度を改善したとは読まない。候補3では終端が長くなる揺れ、候補53では根拠全体を使うrunと61.34%まで絞るrunの境界揺れがあった。

