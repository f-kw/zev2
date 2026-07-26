# candidate 13 基本テロップ B4 完了報告 v001

- 日付: 2026-07-26
- 状態: **B4完了**
- 人間作業: 0件
- Gemini実走: 0回
- 正式表示計画・描画: 未生成
- 安定点: `stable/b4-complete-20260726`

## 1. 結論

B4は、表示計画を作る契約・検査・変換経路を実装し、
candidate 13の正式入力を読み取りだけで通せるところまで完了した。

合格した検査は次の四系統である。

| 系統 | 結果 |
|---|---:|
| B4表示計画の正式合成検査 | 88/88 |
| Gemini回答受入前段の意味回答検査 | 133/133 |
| 既存字幕・指示・話者・時間対応・描画の回帰 | 95/95 |
| candidate 13読み取り専用preflight | 12/12 |

B4の完了は、Geminiが意味判断を返したことや、実際の字幕を描いたことを意味しない。
現時点で保証するのは、B3の正式入力を変えずに受け取り、
将来の回答を表示計画へ変換・検査する配管が成立したことである。

## 2. 直前停止の解消

preflight v002は、job作成側とproduction runnerが監視treeを別々に列挙していたため
11/12で停止した。

二つの差は次だった。

1. job作成側は監視root自身を一行として含めた。
2. job作成側はUTF-16順、productionは英語locale順で名前を並べた。

修正では期待値を不合格後の観測値へ直接書き換えていない。
production runnerが実際に使う投影処理へ版付き読み取り専用入口を設け、
新attemptの正式job作成がその入口を一度だけ使用した。

| 項目 | 記録 |
|---|---|
| production共用実装commit | `a5d3bacc56d25098157d400657c4d20241d586e9` |
| 失敗attempt | v002、変更せず保持 |
| 新attempt job | `DmWu0jVQfTE-candidate-13-caption-display-pair-b4-v003.json` |
| job SHA-256 | `8a4c45a90ba14293c9eef11124391e61d054b10f3bf59354405a3f130f879620` |
| job生成回数 | 1 |
| preflight実行回数 | 1 |
| 自動再試行 | 0 |

v002から変えたのはjob ID、artifact ID、実装commit、runner実体hash、
除外するjob path、production共用入口が返した開始投影hashの6箇所だけである。
入力素材、354文字、3まとまり、205候補、timeline 2区間、registry、runtime固定値は変えていない。

## 3. 正式preflight 12件

実行結果:

| 項目 | 結果 |
|---|---:|
| process終了 | 0 |
| check | 12 |
| 合格 | 12 |
| 不合格 | 0 |
| stderr | 0 byte |

全て合格した項目:

1. jobの実体一致
2. 実装の実体一致
3. B3正式packageの一致
4. 残存発話の一致
5. 基礎映像・時間対応表の一致
6. 表示台帳の一致
7. 実行環境の一致
8. 元発話354件
9. 発話まとまり3件
10. 境界候補205件
11. timeline 2区間
12. 読み取り専用性

監視投影:

| 値 | SHA-256 |
|---|---|
| jobへ固定した開始投影 | `2f4a098dfb4072dc74c0b1864ddc56fe3502184de0eeadf3fcc20dca14ca1bfe` |
| productionが観測した開始投影 | `2f4a098dfb4072dc74c0b1864ddc56fe3502184de0eeadf3fcc20dca14ca1bfe` |
| productionが観測した終了投影 | `2f4a098dfb4072dc74c0b1864ddc56fe3502184de0eeadf3fcc20dca14ca1bfe` |

stdout:

`evals/clip_composition/reports/presentation/test-runs/20260726-caption-b4-shared-projection-preflight-v003/candidate13-preflight-v003.stdout.json`

SHA-256:

`34087e7a0250f397045dc87507bab4d221e2d70da937ce3faae5d416edbd3ec8`

## 4. 前段検査の証拠

| 系統 | 証拠 | SHA-256 |
|---|---|---|
| B4正式88件 | `outputs/presentation/test-runs/20260726-caption-b4-timeline-repair-v001/display-pair-v003-88.tap` | `09ac95fc72d11146acb6fda895fd9bd3b564dee4a97a894b1eac155556ac1f29` |
| 意味回答133件 | `reports/presentation/test-runs/20260726-caption-b4-semantic-source-process-workspace-isolation-v001/semantic-source-package-133.tap` | `6bf8310186e81045f226ccea2daa8e9b5ca27428636ba869cda7b20cf2aaaaff` |
| 回帰95件 | `reports/presentation/test-runs/20260726-caption-b4-semantic-source-process-workspace-isolation-v001/regression-95.tap` | `0d17d6d7f62ed2a9987fa42ae926eb44c5d2db7115a77a26b43bf0e6d9b2d077` |
| preflight 12件 | 上記stdout | `34087e7a0250f397045dc87507bab4d221e2d70da937ce3faae5d416edbd3ec8` |

途中の不合格attemptは削除せず、各停止報告とTAPを保持する。

## 5. 棚卸しへの反映

コード地図v001は一般的な二重実装疑いを挙げていたが、
今回の監視tree列挙・並び順の二重実装は個別に挙げていなかった。
したがって棚卸しv002へ、新規発見として
「実害確定・static preflightではproduction処理へ共用化済み」と記録した。

水平確認で、正式表示計画を生成するrunnerとその合成fixtureには、
監視tree列挙を別々に持つ同型の疑いが残ることも確認した。
現行両者は同じroot包含・UTF-16順で一致しており今回の不合格原因ではないため、
B4修正へ混ぜず残存リスクとして記録した。

semantic source packageのpreflightは既にproduction共用入口を使っており、
今回と同じjob作成側の第三実装は観測されなかった。

## 6. 安定点3条件

| 条件 | 結果 |
|---|---|
| 全検査合格 | 88/88、133/133、95/95、12/12 |
| 正式成果物・入力hash一致 | preflightの実装・B3 package・残存発話・基礎映像・台帳・静的件数が全合格 |
| DECISIONS・HANDOVER同期 | 本完了commitで同期 |

3条件成立により`stable/b4-complete-20260726`を本完了commitへ付ける。

この撤退点へ戻すと、B5以降のprompt、API payload、token・費用固定、
Gemini回答、正式表示計画、指示書、描画が失われる。
B4時点ではそれらは未作成なので、撤退で失う完成動画はない。

## 7. 保留

fatalの外側報告だけでは内側原因を区別できず追加診断を要した実例が複数ある。
観測性の契約改訂候補は優先度を上げた保留のまま維持し、
B4完了へ混ぜて実装していない。

## 8. 次の停止点

次はB5で、次を設計・事前固定する。

- prompt全文とbyte/hash
- API送信payloadと漏洩検査
- 実行モデル構成
- 正式payloadのtoken計測方法
- 一回実行の費用上限
- B6へ渡す一回性・raw応答保存・停止契約

B5はGeminiを実行しない。Geminiの一回実走はB6の別承認である。

