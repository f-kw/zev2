# candidate 13 残存source atom抽出 正式実行報告 v001

- 日付: 2026-07-22
- 対象: `DmWu0jVQfTE` candidate 13「実家の母ちゃんから届いた謎の仕送り『月刊ムー』」
- 結果: **合格**
- 正式job実行回数: **1回**
- 人間作業: **0件・0分**

## 1. 結論

承認済みの正式jobを、事前固定した実装・入力・期待値のまま1回だけ実行した。終了コードは0で、正式な残存発話片354件を3成果物として原子的に公開した。結果を見た後の期待値変更と再実行は行っていない。

正式結果は、全354件、区間別248件/106件、発話別126件/122件/106件で固定値と完全一致した。固定投影との差はmissing 0・extra 0、切除区間内0、境界部分交差0、元発話片同士の正重なり0だった。

解決パッケージ、テロップ・演出指示、描画、新素材には進んでいない。

## 2. 実行前確認

正式実行の直前に次を再確認した。

- job schema: 合格、違反0
- job SHA-256: `89b8b880a760b52b080ea31485dac002b9248bae599f5dca127ac8421e830f54`
- 抽出処理 SHA-256: `11036f09ceac1d1f5e19f5487eeae8d39c84ec7675cc8f9d693a203182d27f28`
- 正式実行器 SHA-256: `5242a56558b8c8ff5c6974c287e3b7b4fbb9528bc9a8239e7f4b2881cc7d5555`
- 承認済み実装commit `55df477fdd7212edf06f470902ac743f4de935bd`内の2ファイルと、実際に読み込む作業treeのbyte: 一致
- 組立決定payload SHA-256: `7fbdc54c548be6e7a475cb54f221644c3d7ff5ce89442cd6a38fbccc7bd13755`
- 直接入力7件・参照を辿る入力7件・組立決定payload: 15/15で固定値と一致
- 正式出力、排他lock、作業directory、公開用一時directory: いずれも不存在

## 3. 正式実行

実行したjob:

`evals/clip_composition/outputs/presentation/20260722-first-real-data-retained-source-atoms-job-v001/job.json`

実行結果:

- 実行回数: 1回
- 終了コード: 0
- status: `passed`
- 公開先: `evals/clip_composition/outputs/presentation/retained-source-atoms/DmWu0jVQfTE-candidate-13-v001`
- failure report: なし

正式実行器は成功時にも所有lockと空の作業directoryを診断用に保持する承認済み契約である。今回も次を保持した。

- lock: `evals/clip_composition/outputs/presentation/retained-source-atoms/DmWu0jVQfTE-candidate-13-v001.lock`
- 空の作業directory: `evals/clip_composition/outputs/presentation/retained-source-atoms/.DmWu0jVQfTE-candidate-13-v001.work-1aMPfY`
- 公開用一時directory: 原子的renameで正式出力になったため残留なし

lockと空の作業directoryは削除していない。正式jobは再実行していない。

## 4. 公開成果物

正式出力directoryには次の3ファイルだけがある。

| 成果物 | 処理上の意味 | file SHA-256 |
|---|---|---|
| `source-atoms.json` | 正式区間内に完全包含された文字時刻付き発話片 | `8656549ec3fbbc0fb9447be7b9c2e784d22ebd18f08ee3e24c474ee62225c6d3` |
| `generation-manifest.json` | 使用job・実装・入力・抽出結果の来歴 | `18094dd3729eead88c498f997e883253a1481ee8a33279882350aacfcf869cf1` |
| `validation-report.json` | 13検査の合格記録 | `be32244280a2564eda9a716a83d04da38f241120a6d2ba40e72e867072fc2ae6` |

公開後に3成果物をbyteから再読込し、正式検査器へ通した結果は合格、違反0だった。job、実装、期待投影、人間承認、基礎映像、元媒体、STT完了、STT照合、候補内の発話統合、区間包含、発話片契約、hash連鎖、公開条件の13検査がすべて合格している。

## 5. 固定期待値との照合

### 5.1 全体・区間

| 区分 | 固定値 | 正式結果 | 判定 |
|---|---:|---:|---|
| 全発話片 | 354 | 354 | 一致 |
| 1区間目 | 248 | 248 | 一致 |
| 2区間目 | 106 | 106 | 一致 |

- 生の354件列のcanonical SHA-256
  - 固定値: `cd76bfd2fe7ab3b5156433f6d9e2229b20c3d3bbd7d94f2b9e9abbc804a6efb3`
  - 正式結果: 同一
- 1区間目のID列SHA-256
  - 固定値: `a64bec1a03ec93037cddecbc29487c4e8734f65da205cbb3e8a06e4dd06856bb`
  - 正式結果: 同一
- 2区間目のID列SHA-256
  - 固定値: `664ffc9e9b4cfae1f5840d9426f0714f147e0b29498bcef969cc81a7be495959`
  - 正式結果: 同一

### 5.2 発話まとまり

| 発話まとまり | 固定値 | 正式結果 | ID範囲 |
|---|---:|---:|---|
| speech 1 | 126 | 126 | `word-6932`〜`word-7057` |
| speech 2 | 122 | 122 | `word-7058`〜`word-7179` |
| speech 3 | 106 | 106 | `word-7180`〜`word-7285` |

候補資料へ二重掲載されていたspeech 2は、内容一致を確認した1まとまりとして数えられており、重複混入していない。

### 5.3 除外・交差

| 観測 | 正式結果 |
|---|---:|
| 固定投影から欠けた発話片 | 0 |
| 固定投影へ余分に入った発話片 | 0 |
| 切除区間内の発話片 | 0 |
| 正式境界をまたぐ発話片 | 0 |
| 元発話片同士の正重なり | 0 |

## 6. 実行後の不変確認

正式実行後に、job、実装2件、直接入力7件、参照を辿る入力7件を再度byte照合した。17ファイルすべて実行前と同じSHA-256だった。組立決定payloadも固定値のままである。

特に次の実データは不変だった。

- STT manifest: `f7d2c04f8f9e67e27ff5b461236f01d3b68bb4f53ba448c0c4b5387c95a6d03b`
- transcript: `c0e006b381d60c2160a4ef59787bd32e47257baf9acc77b8706d74b5c8d3556d`
- 文字時刻: `ebf0190c9ce0fd96b4e1faa18717f41d73126fc914172474ac791df7f17ad065`
- 基礎映像: `c0677893902b5a1eaf79b2a3937d67a477f270810200f7c6c01457b42b803c48`

## 7. 独立監査

正式jobを実行していない別監査で、公開物を元STT・候補資料まで遡って突合した。

- 354件、区間別248/106件、発話別126/122/106件: 一致
- raw/区間ID列の3hash: 独立再計算で一致
- missing、extra、切除区間内、境界部分交差、source正重なり: 全て0
- 二重掲載されたspeech 2の内容不一致: 0
- 発話片の本文・時刻・発話まとまり割当の不一致: 0
- 3成果物間のfile/canonical hash参照: 一致
- job、実装2件、直接入力7件、参照を辿る入力7件: 固定SHAと一致
- failure report: 0件
- 同じ正式jobを示す追加実行痕跡: なし

独立監査はファイルを変更せず、正式jobも再実行していない。

## 8. 停止点

正式な残存source atom抽出は完了した。ここで停止する。

次の工程は、今回の354件を使って指示書と対になる解決パッケージを作るゲートである。これは今回の承認範囲外なので、設計・実行とも開始していない。テロップ・演出指示、描画、残り3候補、新素材にも進んでいない。
