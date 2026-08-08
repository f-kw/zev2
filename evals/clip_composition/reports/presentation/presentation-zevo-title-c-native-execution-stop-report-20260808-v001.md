# ZEVOタイトルC工程 ネイティブ実行前停止報告 v001

- 日付: 2026-08-08
- 基準commit: `a47793d65be4a68ccc75cb555fbcc03fcc582ee8`
- 基準tag: `stable/fatal-observability-v002-20260808`
- 対象: candidate 59、タイトル`全部やりかけ`
- 外部通信: 0回
- 費用: US$0

## 1. 結論

タイトルをZEVGの意味情報として運び、ZEVOが横型・縦型の形式別styleで表示するC工程は、実装と正式検査60/60まで成立した。横型は正式描画とQC 6項目まで合格した。

縦型は、jobと全参照先の事前照合に合格し、出力先も未使用だった。しかし、Chromiumを起動できるネイティブ実行環境をCodexから開始する段階で、実行枠の利用上限によりprocess開始前に拒否された。このため縦型の描画、最終回帰の再取得、C工程完了同期、コミットには進んでいない。

## 2. 事実

### 2.1 実装・契約

- ZEVGは人間指定のタイトル文字列だけを意味情報パッケージへ載せる。
- ZEVOは横型・縦型で共通の描画処理を使い、位置、文字寸法、折り、表示時間、安全領域を形式別style入力から決める。
- 実証用文言は`全部やりかけ`。コードやstyle台帳へ焼き込んでいない。
- タイトル自動生成、G4〜G7、既存3本の正式成果物変更、API通信は行っていない。

### 2.2 検査

- C工程正式検査: 60/60合格。TAPは`attempt-0006/formal-60.tap`へ保存。
- 既存合格gate: 287/287合格。ただし証拠は最後のrunner限定修正前なので、完了時に再取得する。
- 既知baseline: 86/203・不合格117で一致。ただし同じく完了時に再取得する。
- 既存5 tree: 5/5一致。ただし同じく完了時に再取得する。

### 2.3 横型の正式成果物

- 動画: `evals/clip_composition/outputs/presentation/title-output-renders/qdczJpv8RCc-candidate-59-c-title-landscape-v002-output/title-rendered-v001.mp4`
- SHA-256: `d58fd412fa71208f67e01ef230ebf349233e3997618d68dd1839e586f3540234`
- 尺: 51.566016秒
- 画面: 1920×1080、30fps、1,547 frame
- QC: source束縛、タイトル本文、描画適用、配置と可視性、frame維持、音声維持の6項目すべて合格
- 音声packet payload SHAは元動画と一致: `d18469bd3132356b03870ee8bc3d63e95947bd254961157e09d59cf9a53459ec`

### 2.4 縦型の現在地

- job byteと正式serializer: 合格
- style台帳: 合格
- 意味情報差し替え: 合格
- implementation束縛: 56件、差異0
- 全追跡束縛: 62件、差異0
- 出力先: 未使用
- 描画process: 未開始
- 正式成果物: 未生成

## 3. 推測

なし。ネイティブprocessが開始されていないため、縦型productionの合否や見た目を推測しない。

## 4. 未確認

- 縦型の正式描画とQC 6項目
- 最終runner byteを含む状態でのgreen 287/287、baseline 86/203・不合格117、既存5 tree一致
- 横型と縦型を並べた人間目視
- C工程の同期commitと、目視後の安定点化

## 5. 再開条件と順序

ネイティブ実行枠が利用可能になった後、固定Node、固定TSX絶対path、`NODE_OPTIONS`不存在、Node先頭PATH、Chromium起動可能を再確認する。縦型v002 jobを値変更なしで1回実行し、合格時だけ最終回帰、完成検証レポート、DECISIONS/HANDOVER同期、対象path限定commitへ進む。

process開始前に拒否されたため、縦型の正式実行回数は消費していない。迂回実行、別binary、mock、出力先変更は行わない。

## 6. 保全

- 既存3本とstable tagは不変。
- 横型v001の2拒否記録は上書きせず保持。
- 横型v002の正式成果物とQCは保持。
- 縦型v002の未使用出力先条件を維持。
- stage・commitは行っていない。

## 7. 副線の完了

主線停止中に、許可された`reports/`配下の新規文書だけで次の3件を作成した。コード、契約、正式成果物は変更していない。

- 前ZEV・凍結済み層1 v3資産棚卸し: `presentation-a-layer1-prior-zev-asset-inventory-20260808-v001.md`
- 複数区間・遠距離接続の契約論点: `presentation-b-multi-interval-connection-contract-issues-20260808-v001.md`
- STT単語タイムスタンプ精度の検証計画案: `presentation-stt-word-timestamp-accuracy-validation-plan-20260808-v001.md`

3文書ともZEV設計理論メモv1の(3)遠距離の基準点、(5)変化量の符号、(7)ミニドキュメンタリー原型を参照事項として明記した。実装、通信、人間作業は0件。
