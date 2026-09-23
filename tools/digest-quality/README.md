# 完成Digestの改善候補をPoint Reviewへ渡す

Q3の許可範囲で、保存済みHRB-001を入力として使う小さなローカル経路。
完成動画と字幕・接続・元区間の対応を確認し、完成動画から音声の数値を測る。
現行Codexが保存字幕と観測表から判断した実回答を受け取り、根拠と範囲を検証して
既存の `tools/point-review` へ渡す。自動採点や自動修正は行わない。

## 実行

新しい出力directoryを指定する。既存出力は上書きしない。

```sh
node tools/digest-quality/run.mjs prepare /absolute/new-output-directory
```

この処理は保存済み資料を照合し、完成MP4の音声をそのままのチャンネル数でPCMへ復号する。
保存済み16kHz観測と完成媒体の44.1kHz音声を分け、挿入を跨ぐ根拠を分割する。
全字幕と字幕なし区間で全体を覆い、接続も別の確認対象として扱う。
`judgment-input.json` と `judgment-prompt.md` を現行Codexの判断へ渡し、実回答を新規ファイルへ保存する。
準備処理が仮のAI回答を生成することはない。

```sh
node tools/digest-quality/run.mjs accept /absolute/output-directory /absolute/actual-reply.json
```

受信byteを先に保存する。その後で入力と根拠の同一性、全対象の処理記録、候補範囲と根拠の帰属を検査する。
未処理・不正回答を黙って補完しない。自然文の推測を機械が証明した事実とは扱わない。

初回判断を保存した後に、保存済みの生成理由・許容集合・既知の人間回答と照合する。
すべての内部候補へ「提示」「非提示」「技術的な追跡」の区別と理由を付け、対応記録を保存する。

```sh
node tools/digest-quality/run.mjs review /absolute/output-directory /absolute/post-comparison.json
```

提示候補がある場合だけ、元完成動画を参照する標準HTMLと未回答データを作る。
修正版の生成、Before/Afterの捏造、既知回答の新しい候補への流用は行わない。
0件は結果記録だけを作り、品質合格や未観測箇所の合格を意味しない。

## 観測の限界

- 新しい意味的映像観測・聴覚レビューはない。外部へ動画・音声・frameを送信しない。
- PCMは混合音声。音量や頂点だけから声・感情・演出の必要性を決めない。
- 全対象を処理した記録と、全frameを意味的に見た記録を分ける。
- HTML生成・コード試験・人間の直接open・ブラウザー操作検証を別に記録する。
- HRB-002は別版・別時計の拒否に使い、独立した別内容への一般化実証とは呼ばない。

実装境界は [INTERFACE.md](INTERFACE.md)、今回の個別指示は
[Q3受領記録](../../docs/reports/digest-quality-q3-20260920-v001/instruction-received-v001.md) を参照。
