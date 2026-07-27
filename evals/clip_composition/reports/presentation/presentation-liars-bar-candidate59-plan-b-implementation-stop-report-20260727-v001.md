# Liar's Bar candidate 59 案B実装・契約衝突停止報告 v001

- 日付: 2026-07-27
- 正本設計: `presentation-liars-bar-candidate59-minimal-generalization-implementation-design-20260727-v001.md`
- 差し替え設計: `presentation-liars-bar-candidate59-minimal-generalization-plan-b-replacement-20260727-v001.md`
- 結果: **8コードfile内で実装を進めたが、candidate 13回帰7/9で既存B1契約との衝突を確認し停止**

## 1. 結論

案Bどおり、現在の残存発話処理を唯一の計算正本として純粋関数を公開すると、そのfileのSHA-256は変わる。

candidate 13の正式B3 packageは、生成当時の残存発話処理SHAを来歴として保存している。一方、B1は実行時に現在の同処理SHAをjobへ入れ、package内の生成時SHAと現在SHAの完全一致を要求する。

そのため、本文・境界・選択・成果物を変えていなくても、純粋関数の公開だけでcandidate 13の実package経路2件がB1に拒否された。

この一致要求を維持したまま解消するには、candidate 13正式packageの再生成か、既存処理を変更しない別計算の追加が必要になる。前者は正式成果物不変に反し、後者は計算複製禁止に反する。B1の一致要求を改訂する場合は契約改訂になる。

したがって、承認条件④「既存検査の期待値変更、契約改訂が必要になったら停止」に該当する。期待値、fixture、正式package、B1契約は変更していない。

## 2. 確定した原因

### 生成時の記録

candidate 13正式packageの`sourceGateBinding.gateAImplementationFiles`は、生成時の残存発話処理SHAを記録している。

- 生成時SHA: `11036f09ceac1d1f5e19f5487eeae8d39c84ec7675cc8f9d693a203182d27f28`

### 現在の実装

案Bの純粋関数公開後:

- 現在SHA: `f28178327ddc0cc64f11527d850c71bfb5043b4e13f59f6da7997fd8f6d6cad0`

### B1の一致要求

`presentation_caption_semantic_output_v001.mjs`の既存処理は、package内のGate A実装file列と、B1 jobが現在の実体から作った依存file列をpath・SHAとも完全一致で比較する。

不一致の帰属:

- code: `PACKAGE_BINDING_MISMATCH`
- path: `$.sourcePackage.files[5].value.sourceGateBinding.gateAImplementationFiles`

既存candidate 13 B6回帰の後半2件は、どちらもこの不一致により外側結果`B1_SEMANTIC_OUTPUT_REJECTED`となった。

## 3. 現在の8コードfile

| file | 状態 | SHA-256 |
| --- | --- | --- |
| `run_presentation_source_assembly_job_v001.mjs` | 新規・途中、最終検査未実施 | `c6d141dbfe8ad678b06572cb06b91c23dbaeebbaacd34b9c13ef5f4c2e2e26ab` |
| `test_presentation_source_assembly_job_v001.mjs` | 新規・13検査、未実行 | `b78f0028a7e0b8fb68649d8efedfad6d7c1979d92ef01a4f024945255a38f2ea` |
| `presentation_retained_source_atoms_v001.mjs` | 既存・純粋関数公開と旧入口接続 | `f28178327ddc0cc64f11527d850c71bfb5043b4e13f59f6da7997fd8f6d6cad0` |
| `run_presentation_caption_gate_b5_initial_v001.mjs` | 新規・合成検査済み | `c8134e9d0bbb8a9fd9ae3fede3cbb4acafc44c772317d71c3f996fdd59503752` |
| `test_presentation_caption_gate_b5_initial_v001.mjs` | 新規・合格 | `3096205ab4f7cd79d4c84ae3424db697a24aa4c40f8d314ba16f10fcf1f339cb` |
| `run_presentation_caption_gate_b6_v001.mjs` | 既存・共通wrapper追加、全回帰未成立 | `ef91b20545e5e48936a28ab86fbd0f2b19a1f208ac08bd4eb713c53022e07cb7` |
| `run_presentation_caption_gate_b6_job_v001.mjs` | 新規・合成検査済み | `c9f494fe2b2c3670268cc6699f41f32d6ebbe52ca1ff3f1825bd77b6d6c453bf` |
| `test_presentation_caption_gate_b6_job_v001.mjs` | 新規・合格 | `3a6d17633742dbd6790b55f5925134824ac1033f81e0980b7af5bada99d9fa12` |

9 file目、独立共通処理file、4つ目の入口は作っていない。

## 4. 検査結果

| 対象 | 結果 | 扱い |
| --- | ---: | --- |
| 既存残存発話回帰 | 50/50合格 | 旧adapterの処理結果と複数違反報告を維持 |
| 新source入口の合成検査 | 0/13実行 | 停止確定時点で未実行。合格とは扱わない |
| 新B5初回入口 | 8/8合格 | 合成通信のみ |
| candidate 13 B5 v004回帰 | 7/7合格 | 既存request byteを維持 |
| 新B6 job入口 | 11/11合格 | 合成通信のみ |
| candidate 13 B6回帰 | 7/9合格 | 実package経路2件がB1で不受理。全体合格ではない |

正式通信、candidate 59正式job、確認媒体、正式成果物、描画は0件である。

## 5. candidate 13正式成果物の保全

保存済み正式成果物69 fileは、作業前後で同じ集約SHA-256だった。

| 時点 | file数 | 集約SHA-256 |
| --- | ---: | --- |
| 作業前 | 69 | `2eb817ceab6584fad13b98de53a04685d5e10c8800345d44dacf78994ac0dda8` |
| 停止時 | 69 | `2eb817ceab6584fad13b98de53a04685d5e10c8800345d44dacf78994ac0dda8` |

保存済み正式成果物の変更・再生成は0件である。

## 6. 次の一判断

### 推奨: 生成時来歴と現在実装の役割を分離する最小B1契約改訂

削除候補は、「packageに保存されたGate A実装の生成時SHA」と「B1 jobが束縛した現在の実装SHA」の**同一要求だけ**とする。

維持するもの:

- package内の生成時SHA記録
- B1 jobの現在実装SHAと実file byteの一致
- 実装fileのpath・role・import graph検査
- source atom、境界候補、意味入力、全内容SHAの検査
- packageの改変検知

これは、過去にB1 package coreで確定した「生成来歴の証明とlive実行の束縛は別役割」という整理を、Gate A依存file列にも適用する案である。期待値を書き換えて通す案ではなく、契約の役割分離なので別承認を要する。

不採用:

- candidate 13 packageを新SHAで再生成する: 正式成果物不変に反する。
- 既存処理を戻して新入口へ計算を複製する: 計算複製禁止に反する。
- fixtureだけを新SHAへ合わせる: 正式package経路の問題を隠す。

次に必要な人間作業は、上記の最小B1契約改訂を設計してよいかの1判断だけである。動画確認は発生しない。

## 7. 未確認

- 新source入口の現在byteは、停止時点の途中状態であり、最終構文検査と13合成検査を通していない。
- B1契約改訂後にcandidate 13 B6回帰が9/9となるかは未確認である。
- candidate 59へ実適用できることは未実証である。

## 8. 固定設定の限界

> 行幅36と`normal-landscape-readable-pop-v001`を固定した横型経路の一般性だけを確認する計画であり、行幅、プリセット、画面形式を入力で自由に差し替えられることは未実証である。
