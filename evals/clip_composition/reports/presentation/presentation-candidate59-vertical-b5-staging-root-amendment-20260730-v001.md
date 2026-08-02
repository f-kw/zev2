# candidate 59 縦型B5 一時作業場所追補 v001

- 日付: 2026-07-30
- 対象:
  `presentation-caption-gate-b5-initial-job-v002`
- 親設計:
  `presentation-vertical-formal-path-contract-design-20260729-v001.md`
- 根拠:
  `presentation-candidate59-vertical-connection-b5-self-monitor-stop-report-20260730-v001.md`
- 承認:
  kawafmm、2026-07-30

## 1. 変更する契約

B5の一時作業directoryを、上流不変監視rootの外へ固定する。

```text
staging root:
  evals/clip_composition/outputs/presentation-caption-gate-b5-work/

jobごとの一時作業directory:
  evals/clip_composition/outputs/presentation-caption-gate-b5-work/<jobId>/
```

正式出力先は変更しない。

```text
evals/clip_composition/outputs/presentation/caption-gate-b5/<jobId>/
```

## 2. 維持する契約

- 上流監視root:
  `evals/clip_composition/outputs/presentation`
- 上流監視から除外するpath:
  B4静的検査用sentinel 1件だけ
- 開始時・正式公開直前の上流投影SHA完全一致
- B5 job schema、正式出力schema、正式出力path
- Google公式資料6件、要求byte、token計測、費用計算
- 自動再試行0回、秘密の非保存
- 一時directoryをfsync済み成果物として構築し、
  directory renameを正式公開のcommit pointとする手順

上流監視の除外pathを増やさず、実行後の監視値へ期待値を合わせない。

## 3. 実行前条件

1. jobごとの一時作業directoryと正式出力先がともに未使用である。
2. staging rootと正式出力先の親directoryが通常directoryであり、
   symlinkではない。
3. staging rootと正式出力先の親directoryは同じfilesystem deviceにある。
4. 3を満たさない場合はAPI通信前に停止する。
5. job固有の一時directoryを今回のprocessが新規作成できた場合だけ、
   今回のprocessが失敗時にそのdirectoryを削除できる。
   実行前から存在するdirectory・file・symlinkは変更も削除もしない。
6. 一時directory内のpathを正式pathへ記録するときは、
   一時directory直下であることをprefix検査し、
   空suffix、絶対path、`.`、`..`を拒否してから正式出力先へ写す。

## 4. 検査

既存の固定値fakeを使う単体検査は、個別の拒否枝検査として維持する。
これとは別に、正式な
`inspectPresentationCaptionDisplayPairStaticPreflightProjectionV001`
を差し替えずに呼ぶ正常系検査を1件追加する。

正常系検査は次を確認する。

1. 実行前に実物の上流投影SHAを固定できる。
2. B5が監視外の一時作業directoryへ成果物を作る。
3. `countTokens`相当の検査transportが2回だけ呼ばれる。
4. 正式公開直前の実物投影SHAが開始時と一致する。
5. 正式出力が現在の契約pathへ一度だけ公開される。
6. jobごとの一時作業directoryが公開後に残らない。
7. 実行前から存在する同名一時directoryを検出した場合、
   API通信0回・正式出力0件で停止し、既存byteを変更しない。

正式検査中は、検査process自身を含め、
同じ上流監視rootへ別の書込みを行わない。

## 5. 変更範囲

実装変更は次の2ファイルだけに限定する。

1. `evals/clip_composition/run_presentation_caption_gate_b5_initial_v002.mjs`
2. `evals/clip_composition/test_presentation_caption_gate_b5_initial_v002.mjs`

静的監視処理、上流成果物、B3 package、B1/B4、
renderer、横型正式成果物は変更しない。
