# candidate 13 B6 同一request 2回比較 v001

- 実行日: 2026-07-27
- 対象: `DmWu0jVQfTE` / candidate 13「実家の母ちゃんから届いた謎の仕送り『月刊ムー』」
- 固定request SHA-256: `7fa902580b78bb5da3d36025135e4655ab2528e401ba5a76537f2af3c1939ed2`
- 2回目の送信前実装commit: `074cd42f`
- 結果: **2回目も行幅超過だけでB1検査済み不受理**
- 人間作業: 0件

## 結論

同じrequestを同じ条件で2回送ったが、どちらも正式表示計画として受理されなかった。

初回の超過2箇所は、2回目にも同じ位置・同じ幅で再現した。2回目にはさらに3箇所の超過が加わり、超過数は2件から5件へ増えた。単なる再実行では行幅制約を安定して守れないことが、candidate 13の2回で確認された。

承認どおり、2回目の後に回答修復、prompt変更、追加送信は行っていない。B4表示計画と描画も未実行である。

## 事実

### 1. 実行結果

| 項目 | 初回 | 2回目 |
|---|---:|---:|
| request | 同じ固定byte | 同じ固定byte |
| model表記 | `gemini-3.6-flash` | `gemini-3.6-flash` |
| HTTP | 200 | 200 |
| service tier表記 | `standard` | `standard` |
| API送信 | 1回 | 1回 |
| 自動再試行 | 0回 | 0回 |
| B1結果 | 行幅超過で不受理 | 行幅超過で不受理 |
| 行幅超過 | 2箇所 | 5箇所 |
| B4表示計画 | 未実行 | 未実行 |
| 入力token | 9,212 | 9,212 |
| 出力token | 830 | 800 |
| 利用量ベース費用 | US$0.02004300 | US$0.01981800 |

2回の合計は入力18,424 token、出力1,630 token、利用量ベースでUS$0.03986100である。実際の請求額はAPI応答から観測できないため未確認。

### 2. 行幅超過の全件

上限は論理幅36である。位置は人間向けに1始まりで示し、JSON indexも併記する。

| 実走 | 位置 | 境界 | 幅 | 超過 | 本文 |
|---|---|---|---:|---:|---|
| 初回 | container 1 / group 1 / line 2（index 0/0/1） | `000004`→`000017` | 66 | +30 | リアル母ちゃんちょっとそのリアル母ちゃんの贈り物の話をするんだけど |
| 初回 | container 3 / group 2 / line 2（index 2/1/1） | `000159`→`000172` | 38 | +2 | 前に読みたいっておはすば聞かれてるそう |
| 2回目 | container 1 / group 1 / line 2（index 0/0/1） | `000004`→`000017` | 66 | +30 | リアル母ちゃんちょっとそのリアル母ちゃんの贈り物の話をするんだけど |
| 2回目 | container 2 / group 3 / line 2（index 1/2/1） | `000098`→`000112` | 50 | +14 | それでスバル人生で初めてそのムーを人からもらったの |
| 2回目 | container 3 / group 2 / line 2（index 2/1/1） | `000159`→`000172` | 38 | +2 | 前に読みたいっておはすば聞かれてるそう |
| 2回目 | container 3 / group 3 / line 1（index 2/2/0） | `000173`→`000185` | 48 | +12 | でもなんか母ちゃんからムーが家に届くことあるんだ |
| 2回目 | container 3 / group 4 / line 1（index 2/3/0） | `000186`→`000198` | 38 | +2 | 仕送りの中にムーが入ってることあるんだ |

B1では、job、実装、入力、実行環境、package、読み取り専用、job安定性の検査が合格した。意味回答の行幅検査だけが不合格だった。

### 3. 不変・秘密情報

- B5固定requestのSHA-256は2回目の後も一致した。
- 初回の正式5成果物は2回目の後も全SHA-256が一致した。
- 2回目は新しい版付きdirectoryだけを使用した。
- 2回目の正式5成果物を実APIキーで走査し、生key出現は0件だった。
- 2回目の生HTTP応答は解析前に保存した。回答本文への`trim`、code fence除去、修復は行っていない。

## 次に動かす1変数の比較

### 本命: `thinkingLevel`を`minimal`から`medium`へ上げる

| 項目 | 内容 |
|---|---|
| 変更箇所 | `generationConfig.thinkingConfig.thinkingLevel`の1 fieldだけ |
| 変更値 | `minimal` → `medium` |
| 変えないもの | system instruction、仕事本文、回答schema、model、B1/B4検査 |
| 根拠 | Google公式では`gemini-3.6-flash`の既定thinking levelが`medium`で、`medium`は均衡した設定として案内されている |
| B5への影響 | B5を新しい版へ改訂し、新request byte・SHA・版付き出力を固定する。正式requestが変わるため入力tokenを`countTokens`で再計測する |
| 追加費用の見込み | 実額は未確認。Standardでは出力・thinking tokenがUS$7.50／100万tokenなので、2回目との差額は実測後に`(新入力token−9,212)×1.50/1,000,000 + (新出力token−800)×7.50/1,000,000`で確定する |
| 契約上の上限ガード | 入力が9,212のままで出力上限65,536を全消費した場合、合計US$0.505338、2回目との差は最大US$0.485520。これは予想額ではなく既存上限からのガード |

この案を本命とする理由は、仕事の文面を変えず、モデルへ許す思考量だけを公式既定へ戻せるためである。成功は未確認であり、1回の正式実走で判定する。

### 対抗: system instructionで行幅の最終確認を強調する

| 項目 | 内容 |
|---|---|
| 変更箇所 | `systemInstruction.parts[0].text`だけ |
| 変更内容 | 返答前に各行の論理幅が入力の上限以下か確認し、超える場合は境界を追加して分けるよう明記する |
| 変えないもの | `thinkingLevel: minimal`、仕事本文、回答schema、model、B1/B4検査 |
| B5への影響 | system instructionと「仕事本文だけが唯一の意味指示」という契約の整合を改訂し、新request byte・SHA・版付き出力を固定する。入力tokenを`countTokens`で再計測する |
| 追加費用の見込み | 実額は未確認。入力差額は`追加input token×1.50/1,000,000`、出力差額は実測tokenで計算する。独自係数による予想は置かない |

この案は直接的だが、仕事本文の単一正本というB5の契約にも触れるため、本命より影響範囲が広い。

## 推測

- 2回とも同じ2箇所が同じ幅で超過したため、今回の`thinkingLevel: minimal`では、行幅の算数検査を安定して最後まで行えていない可能性が高い。
- ただしN=2・1素材だけなので、`medium`で必ず直る、または他素材でも同じになるとはまだ言えない。

## 未確認

- `thinkingLevel: medium`で行幅超過がなくなるか。
- system instructionの強調で行幅超過がなくなるか。
- どちらの案でも、受理後のテロップが自然に読めるか。
- 実際の請求額。

## 公式参照

- Gemini 3.6 FlashのgenerateContent向けthinking level: <https://ai.google.dev/gemini-api/docs/generate-content/thinking>
- Gemini 3.6 Flashのmodel情報: <https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash>
- Gemini Developer API pricing: <https://ai.google.dev/gemini-api/docs/pricing>

参照日: 2026-07-27。

## 2回目の保存物

| 成果物 | SHA-256 |
|---|---|
| B6 manifest | `5278bf2bbb010d8af8a8fa58d8fc9b8576f4a8e5738928eef79d55d03e445569` |
| 生HTTP応答 | `e5e6a354ad7ae1e4739118a7693d937d31fea9ea4e7cef4c2640a696288982a6` |
| Gemini意味回答 | `990a9221778b7012a805e9e78e35ed4937a3beecdfac88aa044c1d6b0f08758a` |
| B1 job | `d84e8a50463e4f614a5d8206a063665df0ebc15905b7bf6ce1af9a810f45629f` |
| B1検査報告 | `09de42fb1bdc7e4f6269278489dc0cda389a3639dbdf4b29e659215d5e9e07d3` |

## 停止点

追加送信、回答修復、prompt改訂、B4表示計画、描画は行っていない。

次の人間判断は1件だけである。本命の`thinkingLevel: medium`案を採るか、対抗のsystem instruction強調案を採るかを選ぶ。推奨は本命である。
