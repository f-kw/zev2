# candidate 13 字幕表示計画 B4 T082・T083 fixture修正 正式検査停止報告 v001

- 日付: 2026-07-25
- 対象: T082・T083検査fixture修正
- 状態: **正式合成検査83/85。不合格2件のため修正・再実行をせず停止**
- 人間作業: 0件

## 1. 到達地点

承認された1ファイル限定修正を実装した。

正式CLI検査用の意味判断結果を検査固有pathへ保存した後、その実ファイルを読み直して次を一式で生成するようにした。

1. 意味判断結果の入力snapshot
2. B3正式packageと組み合わせた意味入力
3. 意味入力のbyte SHA-256とcanonical SHA-256を持つ検査報告
4. 正式jobが期待する同じ2つのhash

さらに、fixture生成時に次を完全一致で確認するようにした。

- 意味入力に保存された来歴pathと、正式CLIが実際に読むpath
- 意味入力に保存されたファイルhashと、保存後の実ファイルから計算したhash
- 意味入力に保存されたcanonical hashと、意味判断結果の正規化hash

変更したのは次の検査ファイル1件だけである。

```text
evals/clip_composition/test_presentation_caption_display_pair_v003.mjs
```

production実装、runner、契約、schema、違反code、終了code、T082・T083の合否期待は変更していない。

## 2. 正式合成検査

正式85件を先頭から1回実行した。

```text
node --test evals/clip_composition/test_presentation_caption_display_pair_v003.mjs
```

| 項目 | 件数 |
|---|---:|
| 全件 | 85 |
| 合格 | 83 |
| 不合格 | 2 |
| skipped / todo / cancelled | 0 |
| process終了code | 1 |

T001〜T081、T084、T085は合格した。

## 3. 不合格2件の観測

| 検査 | 期待 | 今回の観測 |
|---|---|---|
| T082 | 正式CLI正常経路が終了code 0 | 終了code 2 |
| T083 | 正式CLI契約違反経路が終了code 1 | 終了code 2 |

両検査とも、終了codeを確認する最初のassertで停止した。したがって、このattemptではstdout内のfatal内容、違反内容、失敗段階を確定していない。

前回の終了code 1から今回は2へ変化したことは観測事実である。ただし、これだけを根拠に前回の意味入力再構築失敗が解消した、または新しい根本原因が何であるとは判定しない。

## 4. 停止条件の適用

「不合格1件でも同attemptで直さず停止」に該当したため、次は行っていない。

- T082・T083のstdout追加観測
- 原因診断
- fixtureの追加修正
- 正式85件の再実行
- 回帰95件
- candidate 13読み取り専用preflight
- B4完了報告
- `DECISIONS.md`、`docs/HANDOVER.md`のB4完了同期
- B4安定点tag、`JOURNAL.md`追記
- B5（prompt・費用固定）承認依頼の起草

既存B3正式7ファイルは変更していない。直近の撤退可能点は引き続き
`stable/b3-complete-20260725`
である。

## 5. 次に必要な判断

次へ進む場合は、別承認でT082・T083のstdoutを読み取り専用で確定し、両件が同一原因かを判定する必要がある。

帰属は従来どおり、次の三分法で行う。

1. 実装が契約に届いていない
2. 検査fixture・環境準備が契約とずれている
3. 契約自体が矛盾している

今回、人間へ求める動画視聴・UI操作は0件である。
