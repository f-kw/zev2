# zev2 control-ready checkpoint

## 戻り先

- タグ: `checkpoint-control-ready-20260627`
- 実装状態: 7工程の処理をrunner本体から分離した段階
- 代表コミット: `77ad75f 動画生成工程をrunner本体から分離`

## この段階の意味

AIコーディングで開発物が人間の制御を離れないようにするため、処理を工程ごとに読み分けられる状態へ整理した。

この段階では、runner本体は全体の流れを担当し、各工程の細かい処理は `runner/src/steps/` に分かれている。

## できていること

- 動画取り込み、STT、内容候補整理、使用素材構成案作成、演出案作成、微調整、動画生成の7工程に分かれている。
- 各工程の入出力を追いやすくするため、工程ごとの処理を個別ファイルへ移した。
- 共通処理は `runner/src` 配下の補助処理へ寄せ、同じ処理を何度も書かない方針にしている。
- 発話IDを使って、演出案とテロップがどの発話に対応するか追える。
- Remotionでテロップ付き動画を作り、ffmpegで音声の有無を確認する流れがある。

## まだ固定しないこと

- UIの完成形
- テロップ表現の最終デザイン
- Geminiへの依頼文の細部
- 動画の見栄えを評価する自動判定

この段階では、細かい機能追加よりも、工程ごとに人間が読めることを優先する。

## 戻り方

実装状態だけ確認する場合:

```bash
git switch --detach checkpoint-control-ready-20260627
```

この状態から新しい作業ブランチを作る場合:

```bash
git switch -c restore/control-ready checkpoint-control-ready-20260627
```

## 次に見る場所

- `docs/control-log.md`
- `runner/src/index.ts`
- `runner/src/steps/`
