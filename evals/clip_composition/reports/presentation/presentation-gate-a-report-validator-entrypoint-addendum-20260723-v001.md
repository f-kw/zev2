# ゲートA report相互一致検査入口 追補 v001

- 作成・承認日: 2026-07-23
- 承認者: kawafmm
- 状態: **承認済み。ゲートA実装へ適用**
- 追補先: `presentation-gate-a-implementation-contract-addendum-20260723-v001.md` §10・§11.1
- 起草根拠: `presentation-gate-a-second-night-stop-report-20260723-v001.md`と、2026-07-23のkawafmm承認
- 人間作業: 0件。媒体視聴なし。時間計測なし

## 1. 目的

追補先§10が要求するpreflight report相互一致の改変検査を、productionとは別の複製ロジックではなく、runnerが実際に使う検査実装そのものへ通せるようにする。

production CLIの契約は変更しない。job path一つだけを受け、report、checker、filesystem adapter、期待値を引数・環境変数・stdinから注入する入口を作らない。

## 2. 追加する唯一の検査入口

runnerは、現在のreport相互一致検査実装そのものを、次の版付きpure functionとしてexportする。

```js
validatePresentationSegmenterBoundaryPreflightReportV001({
  report,
  expectedExitCode,
  jobValue,
  jobSnapshot,
  inputSnapshots,
  runtimeBinding,
  evidencePasses,
  readOnlyGuard,
}) => boolean
```

- 新しい検査ロジックを別実装しない。
- runner本体もこのexport済みfunction bindingを直接呼ぶ。
- filesystem I/O、時刻、PID、環境変数、process終了を行わない。
- 合格なら`true`、一項目でも相互不一致なら`false`を返す。
- production CLIから上記8項目を受け取る経路は作らない。
- このexportは検査可能性を確保するためのpure validatorであり、preflight reportを正式成果物として保存する入口ではない。

## 3. 必須合成検査

同じexport済みfunctionへ、正常reportと次の単独改変をそれぞれ渡す。

1. top-levelの値だけを変える。
2. `checkReport`だけを変える。
3. `failureStage`だけを変える。
4. 第一読取または第二読取のhashに由来するreport値だけを変える。

正常reportだけが`true`、各改変は`false`でなければならない。

さらに次を検査する。

- runner sourceが上記export済みfunctionを呼び、同等ロジックを持つ別関数へ迂回していない。
- production CLIは引き続き引数1件だけを許す。
- 追加引数、stdin、環境変数でreport、checker、filesystem adapter、期待値を注入できない。
- 承認範囲外入力を既存の違反検査が引き続き拒否する。

## 4. 変更しない契約

- 固定10 check、35違反コード、CLI終了コード0/1/2。
- read-only filesystem adapterと正式出力不作成。
- candidate固有値をjobだけに置く分離。
- 正式合成検査、既存回帰、candidate 13 preflightを各一度だけ行い、不一致時は修正再試行せず停止する夜間規律。
- v003、Gemini、正式指示書、正式解決パッケージ、描画は未承認。

## 5. 承認記録

> ゲートA runnerのreport相互一致検査関数を、合成検査から直接呼べる版付きの純粋関数としてexportする追補を承認する。production CLIはjob path一つだけを受ける契約を維持し、report・checker・filesystem adapter・期待値をCLI引数、環境変数、stdinから注入する入口は作らない。合成検査は最上位、内部検査記録、最初の不合格段、第一・第二hashの各単独改変を実際に不合格へできることを確認する。その他の契約と夜間停止条件は変更しない。

