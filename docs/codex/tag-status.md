# zev2 tag status

## 目的

AIコーディングで作業が先に進みすぎても、人間が理解できる復帰点へ戻れるようにする。

この文書には、戻ってよいタグ、タグを付けた時点の意味、次に再開するとき見る場所を記録する。

## 運用ルール

- 大きな方針変更、安定した実装区切り、復旧点にしたい状態でタグを付ける。
- タグ名は `checkpoint-目的-日付` を基本にする。
- タグを追加したら、この文書にも1行追加する。
- タグは「戻れる状態」を表す。未検証の途中作業には付けない。
- タグを戻り先として使う場合は、直接作業せず、新しいブランチを作ってから作業する。

## タグ一覧

| タグ | 状態 | 意味 | 次に見る場所 |
| --- | --- | --- | --- |
| `v0.0.1` | 過去の基準点 | control plane 仕様を置いた初期基準。現在の復帰点としては古い。 | `docs/codex/control-plane-spec.md` |
| `checkpoint-control-ready-20260627` | 有効な復帰点 | 7工程の処理をrunner本体から分離し、人間が工程ごとに読み分けられる状態。 | `docs/codex/control-ready-checkpoint-20260627.md` |
| `checkpoint-web-gemini-review-ready-20260628` | 有効な復帰点 | 固定データで一通り実行でき、Web Geminiの演出レビューを追加検討する前の状態。確認用動画のエンコード設定、AI作業中LED、キャンセル表示整理を含む。 | `docs/runner-dry-run.md`, `docs/codex/tag-status.md` |
| `checkpoint-web-gemini-review-loop-20260629` | 現在の復帰点 | 完成動画のWeb Gemini演出レビューについて、レビュー保存、実行ログ表示、失敗ログ、現在動画との一致確認、演出作成前からの再生成、標準テストまで入った状態。 | `docs/codex/web-gemini-review-loop-checkpoint-20260629.md` |

## 現在のタグの意味

`checkpoint-web-gemini-review-loop-20260629` は、Web Geminiレビューのフィードバックループを実装した後の復帰点にする。

この時点では、レビュー保存、実行ログ表示、失敗ログ、現在動画との一致確認、演出作成前からの再生成、標準テストが入っている。

次の作業候補:

- 実際の完成動画をGoogle Gemini Webへアップロードし、回答取得からレビュー保存まで確認する。
- Web Geminiレビューで得た改善指示を、実LLMの演出作成へ反映して品質確認する。
- GitHub認証を通してpushする。

## 戻り方

実装状態だけ確認する場合:

```bash
git switch --detach checkpoint-web-gemini-review-ready-20260628
```

この状態から新しい作業ブランチを作る場合:

```bash
git switch -c restore/web-gemini-review-ready checkpoint-web-gemini-review-ready-20260628
```

Web Geminiレビュー実装済みの復帰点へ戻る場合:

```bash
git switch --detach checkpoint-web-gemini-review-loop-20260629
```
