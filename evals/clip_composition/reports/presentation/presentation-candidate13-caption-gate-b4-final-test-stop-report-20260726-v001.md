# candidate 13 字幕表示計画 B4 最終検査停止報告 v001

- 日付: 2026-07-26
- 対象: candidate 13 基本テロップ B4
- 状態: **結果・来歴二層比較と数値読取12件は合格。表示計画87件が85/87のため停止**
- 修正・再実行: なし
- Gemini、正式表示計画、描画: なし
- 人間作業: 0件・0分

## 1. 結論

承認済みの順序で処理を再開した。

1. 承認済み文書6件の実体照合: 6/6合格。
2. 既存結果と承認済み実装来歴の二層比較: 合格。
3. 内部配置JSONの数値読取検査: 12/12合格。
4. B4表示計画の正式合成検査: **85/87。T082・T083が不合格。**

一件でも不合格なら同じ試行で直さない契約に従い、意味回答側133件、回帰95件、
candidate 13読み取り専用preflight v002へ進まず停止した。

B4は完了していない。安定点tagとJOURNALは追加せず、最新の撤退点は
`stable/b3-complete-20260725`のままである。

## 2. 文書照合と二層比較

承認済み改訂commit `a651e73b043bd8cb97bfffe2f284a35ede90abd7`へ
2文書のbindingを同期した後、文書照合を新しい試行で一回実行し、6/6合格した。

二層比較は次を確認した。

| 層 | 結果 |
|---|---|
| B3正式JSON、外部表示6枠、先頭5成果物、固定hashの処理結果 | 完全不変 |
| 承認済みpackage core実体の変更 | before/after commit実体SHAと一致 |
| manifestの変更 | 事前登録2 leafだけ |
| validation reportの変更 | 事前登録3 leafだけ |
| 想定外の変更 | 0件 |
| 総合 | `passed` |

成果物:

```text
evals/clip_composition/outputs/presentation/
  caption-b4-number-token-invariance-v002/
    result-provenance-comparison-v001.json
```

SHA-256:

```text
27a3d19603613ddf41f05c671a1d5d6d51ea9d1b7af2d50608811dcf44136c0b
```

過去の`comparison.json: failed`は変更していない。成立済みの処理結果観測も
取り直していない。

## 3. 正式検査結果

実行環境は、既定どおりUnix socketを作成できるネイティブ環境とし、固定済み実体を
使った。

| 実体 | SHA-256 |
|---|---|
| Node v20.19.6 | `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c` |
| TSX 4.22.3 | `5c916fa6ecad44aedbb01ca5815536d00ea07de6b73eeb9443d317326b0218d8` |
| esbuild JS 0.28.0 | `41abefec8704d24e069532fb38a418905d16f8fee4da88e54ecd65adc71f5507` |
| esbuild binary 0.28.0 | `6f0e1237f63fa3bc03963e58f0b0be1b9bfacd8f2dc9a3f28483e8f97e4ef2d6` |

### 3.1 内部配置JSON

- 結果: **12/12合格**
- TAP:
  `evals/clip_composition/outputs/presentation/test-runs/20260726-caption-b4-final-v001/layout-inspection-12.tap`
- TAP SHA-256:
  `5162cd4b97bb3d94a66ad776948baa06d1220b3688cfee99bc248dfb58078c17`

整数の時刻・意味データと、内部画面幾何の有限小数をfield別に読み分け、
指数・小数点表記の事前契約も含めて合格した。

### 3.2 B4表示計画

- 結果: **85/87合格、2不合格**
- TAP:
  `evals/clip_composition/outputs/presentation/test-runs/20260726-caption-b4-final-v001/display-pair-v003-87.tap`
- TAP SHA-256:
  `0df0337d158739de49699c925a07d0cde9e981b257f66d16a9299a746d5b840d`

不合格:

| 検査 | 期待 | 観測 |
|---|---|---|
| T082 正常CLI | exit 0 | exit 1 |
| T083 契約不成立CLI | 最初の違反`OUTPUT_ROOT_ALREADY_EXISTS` | 最初の違反`TIMELINE_MAPPING_FAILED` |

今回のTAPから確定できるのは上表までである。T082のstdout内容、T082とT083が
同じ根本原因か、実装・検査設営・契約のどこへ帰属するかは未診断である。
過去の停止原因を今回へ推測流用しない。

## 4. 実行していないもの

- 意味回答側133件。
- 回帰95件。
- candidate 13読み取り専用preflight v002。
- B4完了報告。
- `stable/b4-complete-*` tagとJOURNAL追記。
- B5 prompt・費用固定承認依頼。
- Gemini実走。
- 正式表示計画、演出指示書、描画。

## 5. 変更と記録

| commit | 内容 |
|---|---|
| `01adea08` | 承認済み改訂へ文書bindingを同期 |
| `75b7ab96` | 処理結果と承認済み来歴差を分ける照合器 |
| `66dad089` | 合格した二層比較成果物 |

今回の停止時点では、B4 production実装、正式入力、既存正式成果物を変更していない。

## 6. 次の判断

推奨する次工程は、**87件を再実行せず**、T082・T083のstdout・stderrと内部停止位置を
読み取り専用で確定し、次の三分法へ帰属する診断である。

1. 実装が契約に届いていない。
2. 検査fixture・環境設営・期待が契約とずれている。
3. 契約自体が矛盾している。

診断結果に修正が必要なら、版付き修正設計を提示して停止する。実装・再実行は
さらに別承認とする。

人間へお願いする作業は、この診断着手の承認または却下1判断だけである。
