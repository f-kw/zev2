# ゲートA 実装完了報告 v001

- 完了日: 2026-07-23
- 状態: **合格。ゲートAの承認範囲を完了**
- 対象: 機械境界証拠の生成・契約検査・読み取り専用preflight
- commit A: `051613f25d3259417e5a3522f98bc8946db22deb`
- 人間作業: 実行に伴う媒体視聴・時刻入力・時間計測は0件

## 1. 何ができるようになったか

正式に残った発話文字を唯一の正本として、日本語の機械的な区切り候補を作り、次を一括で検査できるようになった。

- 元の文字が一件も欠けず、重複せず、順番も変わっていないこと。
- 区切り候補が発話や正式区間をまたいでいないこと。
- 実装、入力、Node実体、期待件数が事前固定値と一致すること。
- 同じ入力から同じbyteの証拠を二度生成できること。
- preflightが正式成果物を一切書かず、監視先も前後で変化しないこと。

ここで確認したのは**機械的な完全対応**である。日本語として自然な語の切れ目、読みやすいテロップ分割、公開品質はまだ認定していない。

## 2. 実装と来歴

commit A `051613f25d3259417e5a3522f98bc8946db22deb`で次を固定した。

| 処理上の意味 | path | SHA-256 |
|---|---|---|
| 境界候補の生成と契約検査 | `evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs` | `dac613292e463897ee2757be75a7d64f3ece9928141765a195ba54a0ebc6007a` |
| 既存の残存発話正本の検査（固定再利用、今回変更なし） | `evals/clip_composition/presentation_retained_source_atoms_v001.mjs` | `11036f09ceac1d1f5e19f5487eeae8d39c84ec7675cc8f9d693a203182d27f28` |
| 読み取り専用preflight runner | `evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs` | `3f35066d43746de3b7527b0e1dc3317faeea828f8beab8bb4dde8ae072a50352` |

新規coreはgeneratorとcheckerを同居させ、既存の残存発話検査を別実装せず再利用した。runnerが実際に使うreport検査関数と合成検査が使う関数も同一exportであり、テスト専用の複製ロジックはない。

## 3. 最初の不合格と修正の帰属

最初の正式合成検査は21件中12件合格・9件不合格となり、`ba1d6668`の停止報告を作って、修正・再実行をせず一度停止した。人間承認後、次の2系統だけを修正した。

| 系統 | 欠陥の所在 | 修正 | 水平確認 |
|---|---|---|---|
| 実測投影のcontainer集計 | 検査集計側が配列の戻り値をobjectとして受け取っていた | 既存の配列戻り値契約どおり直接受領する1行へ修正 | 同型追加0件 |
| 読取専用openの静的検査 | 正しい末尾カンマ付きJavaScript構文を誤検出した | 引数・順序・安全flagは固定したまま末尾カンマだけを許容 | 同型追加1件を同時修正（`node:fs`のnamed import） |

帰属はどちらも**検査器側の欠陥**である。生成する境界の規則、checkerの公開契約と35違反code、runnerの入出力・書込禁止契約には違反がなく、変更もしていない。物理的には新規core内の実測投影集計1行を直したが、generatorやcheckerの判定規則を変えたものではない。runner本体は修正前後で同一hashのままである。

静的検査の修正も、検出の廃止や例外追加ではない。`pathValue`、`O_RDONLY | O_NOFOLLOW`、引数順、直接呼出1回、write API禁止を維持し、正しい末尾カンマ構文だけを受理した。

## 4. 新規合成検査

承認後の新しい正式実行として、21件全件を最初から1回だけ実行した。

| 項目 | 結果 |
|---|---:|
| test総数 | 21 |
| 合格 | **21** |
| 不合格・skipped・todo・cancelled | **0** |
| 固定違反codeの発火 | **35/35** |
| CLI | 0 / 1 / 2を実processで確認 |
| 二重生成の決定性 | 合格 |
| job・入力・実装の安定読込 | 合格 |
| 読み取り専用adapterと正式CLIの注入口禁止 | 合格 |
| 実物runnerとexport済みreport検査の同一経路 | 合格 |

合格済みだった旧12件を含む全件を流し直しており、修正による退行はない。

## 5. 既存回帰

正式残存source atomの既存検査を1回だけ全件再実行した。

| 項目 | 結果 |
|---|---:|
| test総数 | 50 |
| 合格 | **50** |
| 不合格・skipped・todo・cancelled | **0** |

残存発話の抽出、正式区間・内部gap、媒体来歴、原子的公開、31違反code、既存candidate 13の354件preflightを含め、既存挙動は維持された。

## 6. candidate 13 読み取り専用preflight

新規検査21/21と既存回帰50/50の合格後、次のjobを正式に**1回だけ**実行した。

- job: `evals/clip_composition/outputs/presentation/segmenter-boundary-preflight-jobs/DmWu0jVQfTE-candidate-13-v001.json`
- job SHA-256: `e72d2f3ae91ca337cceca0c2d4ba3e5954f02372eeca0a0d02f8eb324de54ee0`
- 結果: exit 0、10 checks全件passed、violations 0、failureStage null

### 6.1 入力と実装の束縛

| role | SHA-256 |
|---|---|
| source atoms | `8656549ec3fbbc0fb9447be7b9c2e784d22ebd18f08ee3e24c474ee62225c6d3` |
| source generation manifest | `18094dd3729eead88c498f997e883253a1481ee8a33279882350aacfcf869cf1` |
| source validation report | `be32244280a2564eda9a716a83d04da38f241120a6d2ba40e72e867072fc2ae6` |
| Gate A core | `dac613292e463897ee2757be75a7d64f3ece9928141765a195ba54a0ebc6007a` |
| retained-source core | `11036f09ceac1d1f5e19f5487eeae8d39c84ec7675cc8f9d693a203182d27f28` |
| Gate A runner | `3f35066d43746de3b7527b0e1dc3317faeea828f8beab8bb4dde8ae072a50352` |

source意味正本:

- source artifact canonical SHA-256: `0bf1e10ab94388ec9521cb2270e6c339e7c7b6d8317443b469606b6b353df43c`
- raw source atoms canonical SHA-256: `cd76bfd2fe7ab3b5156433f6d9e2229b20c3d3bbd7d94f2b9e9abbc804a6efb3`

### 6.2 環境の合否値

| 項目 | 実測 |
|---|---|
| Node binary SHA-256 | `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c` |
| Node | `v20.19.6` |
| ICU | `77.1` |
| locale | `ja` |
| granularity | `word` |

診断記録はdarwin/arm64、V8 `11.3.244.8-node.33`、Unicode `16.0`、CLDR `47.0`。全合否値がjobと一致した。

### 6.3 実測投影

| 単位 | source文字 | 境界候補 |
|---|---:|---:|
| 全体 | **354** | **205** |
| `segment-0001` | 248 | 138 |
| `segment-0002` | 106 | 67 |
| container 1 / speech 1 | 126 | 60 |
| container 2 / speech 2 | 122 | 78 |
| container 3 / speech 3 | 106 | 67 |

- container: 3件
- word-like / non-word-like: 205 / 0
- 複数raw話者値を含む候補: 12件
- raw話者集合が`["unknown"]`だけの候補: 11件
- source正重なり: 0件
- 欠落・重複・順序逆転・segment越え・speech越え: 全て0件

### 6.4 evidence hash

| 対象 | SHA-256 |
|---|---|
| boundary candidates | `0f8e7b07c32befc4e4703e1945b61e7656a2e978a8ba959fd169a753efe454b6` |
| source atom membership | `b2da8ee1b3fef9c23b5598d73713d77831f392471cf98a9723392ef115ea50fd` |
| evidence全体 | `be4344dd5d97596a815a92ae283d0da3c7353600b2983e93cf53b1947c5338eb` |

### 6.5 書込なしの確認

正式出力先は開始前・終了後とも不存在だった。監視した`evals/clip_composition/outputs/presentation`直下は前後とも29件、一覧hashは`f3fa706a61921c0ea4747a5ee6d734b3e06d5fdca7514c34c123667a9023b4a4`で不変だった。

runnerによるformal output、formal failure artifact、lock、work、tmpは作っていない。`ba1d6668`の人間可読な停止報告は正式runner成果物ではなく、最初の検査不合格を記録したリポジトリ文書である。

## 7. 実装契約完全性チェックの所在

`DECISIONS.md`の標準確認事項は、今回個別ではなく今後の実装系設計全般へ適用する記述になっている。

> 実装系の設計は、人間承認を求める前に実装契約完全性チェックを通す。少なくとも、成果物schema、採番・anchor・相互参照、違反コード集合と固定順、CLI終了コード、環境とinput hash、入出力範囲、停止点を実装者判断なしに一意にする。

> 実装契約完全性チェックの標準項目へ、検査可能性を追加する。設計に列挙した全検査について、どの正本定義済み入口から入力し、合否を観測できるかを承認前に確認する。

正本位置は`DECISIONS.md:356-357`。今回のpure report validator追補は、この一般原則をゲートAで実際に適用したものになる。

## 8. 未着手・停止点

次は行っていない。

- 正式な機械境界evidenceの永続化。
- `presentation-resolution-package-v003`。
- `presentation-instruction-bundle-v003`。
- `presentation-caption-check-v003`。
- Geminiや他LLMの実走。
- 正式指示書、正式解決パッケージ、テロップ配置、描画。
- 「自然な語の切れ目」の人間認定。

次工程は、上記v003成果物とpair-generation manifestを結ぶfield-level契約の**設計起草だけ**である。実装・実走は別承認まで停止する。

## 9. 人間作業量

- 本実装・合成検査・回帰・preflightに必要だった媒体視聴、時刻入力、文字分割判断: **0件**。
- 時間計測: 行っていない。
- 次の人間作業: 次ゲート設計書の承認判断1件。媒体視聴なし。
