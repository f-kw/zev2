# fatal観測性v002 正式attempt前・閉包監査停止報告 v001

- 日付: 2026-08-07
- 状態: **STOP**
- 開始commit: `84c723362de8a0ee0d74fd0303eabab0992c879f`
- 承認済み完全実装設計SHA-256: `945b3337b90fde6969963a4dc051778b3aaf015be90e57193b97bd2d63dc7369`
- 承認済み対象file接続停止報告SHA-256: `348408ad4ef10addf7ea84c7867f0c79b2c306fa17be3349766001132cf5d5e0`
- 外部通信: 0回
- 費用: US$0

## 1. 結論

承認されたF08の限定修正は成立した。意味終端のjob以外の入力3種について、呼出側の汎用名を廃止し、検証済みjob・B5/B6 manifest・provider envelopeに実在する正式field名へ接続した。固定許可field表は変更していない。

その後、正式81件の開始前条件である追加監査6項目を全数照合したところ、次の2項目が不成立だった。

1. 監査4: timelineと意味情報packageの公開前再読exportが、呼出側から渡された許可field名・path・SHAを自分で「検証済み」として対象fileへできる。
2. 監査6: F03の40 IDは件数上は揃ったが、正常／既存rejectedの一部が正式runner・正式出力byte・exact codeまで届かず、実経路証明が閉じていない。

これは指示された「新たな現物差」に該当する。F04、F11、F03への追加変更、正式81件、後続回帰、commit Aへ進まず停止した。

## 2. 今回成立した限定修正

対象: `evals/clip_composition/presentation_meaning_boundary_selection_v001.mjs`

- 現在SHA-256: `52ea9c4505c515ed998297136c242b2a19e1e02ff0f7ad80e9f0aa7a7db33771`
- job byteは既存strict decoderと既存job validatorで検証する。
- B6 manifest、B5 manifest、provider envelopeは既存validatorで検証する。
- 各対象はpathとSHAが検証済みrecordにexact一件一致した場合だけ正式field名を得る。
- 一致0件・複数件・未検証recordでは対象fileを`null`にする。
- 旧汎用名`job.binding`、`accepted-input-observation`、`validated-graph-snapshot`はF08から0件になった。
- 新しい対象file計算、decoder、validatorは作っていない。

固定許可field表の正本は不変である。

- `evals/clip_composition/presentation_fatal_observation_v002.mjs`
- SHA-256: `cf95c2ba8785be681dcecc03dc4ec009d6f02b4161e3c39f7edbf431b92b6115`

構文検査と差分空白検査は合格した。正式検査はまだ実行していないため、この節は実装の静的成立だけを示す。

## 3. 追加監査6項目の結果

| 項目 | 判定 | 現物照合の要点 |
| --- | --- | --- |
| 1. 定義・import・export実在 | PASS | 5境界、共通観測器、検査から参照する定義とimport/exportを全数照合し、動的import・fallback・重複owner 0件を確認した |
| 2. rejectedとfatalのcatch分離 | PASS | 既存の検査済み拒否を先に返し、未処理例外だけをfatalへ送る構造を確認した |
| 3. child process工程値と生出力非漏洩 | PASS | 全child callの固定stageと、生stdout・stderr・元Errorを上位へ保存しない構造を確認した |
| 4. targetFileと検証済みsource recordの接続 | **FAIL** | F08、旧B1、outputは成立。timelineと意味情報packageの公開exportに呼出側自己認定が残る |
| 5. 保存先不正と公開失敗のowner分離 | PASS | 固定sentinelと、claim後のno-replace・write・I/O失敗が別ownerであることを確認した |
| 6. 正常経路と既存rejected経路の実検査 | **FAIL** | F03の一部がproduction core後の手製object、正式runner迂回、exact code未確認、静的文字列確認に留まる |

総合: **4/6 PASS、2/6 FAIL**。正式attempt開始条件の6/6を満たさない。

## 4. 監査4で確定したproduction側の穴

### 4.1 timeline公開前再読

`presentation_timeline_composition_decision_v001.mjs:101-113`は、呼出側から渡された`sourceField`・path・SHAをそのまま一件の`verifiedTargetSources`へ入れ、`sourceRecordVerified: true`として共通selectorへ渡す。

同file `819-855`のexportは任意の`tracked`を受け取り、読取失敗時にその値を使う。したがって呼出側が固定表に存在するfield名を渡せば、jobや上流recordの検証を経ずに対象fileを作れる。

正式runner内部の通常経路（同file `1029-1070`、`1103-1106`）は、検証済みjobと実読取から`tracked`を作っており安全である。しかし公開export単体の保証が閉じていないため、「全呼出しで呼出側自己許可0」という監査条件には不合格である。

### 4.2 意味情報package公開前再読

`run_presentation_meaning_information_package_job_v001.mjs:153-165`は、既定値で`sourceRecordVerified: true`とし、呼出側のfield名・path・SHAを一件の検証済み集合へする。

同file `603-640`のexportも任意の`tracked`を受け取り、読取失敗時にその値を対象file選択へ渡す。固定表の許可名を知る呼出側なら、未検証recordから対象fileを作れる。

正式runner内部の通常経路（同file `835-905`、`942-1037`、`1160-1163`）は、検証済みjob・timeline・意味成果物と実読取へ接続している。しかし公開export単体の保証が閉じていない。

### 4.3 帰属

両件は、固定許可field表の不足ではない。表の許可範囲を広げる必要もない。公開前再読入口が、検証済みsource recordからfield・path・SHAを導出せず、呼出側入力を検証済み扱いしているproduction実装の閉包不足である。

既存status、既存違反code、終了code、成功成果物byte、正式成果物へ影響する事実は観測していない。通常の正式runner経路が未検証recordを使った事実も観測していない。

## 5. 監査6で確定した検査証明不足

F03は静的な検査ID数として40件を維持しているが、次の証明が閉じていない。

| ID・群 | 不足 |
| --- | --- |
| `FOVI003` | Gate Aのproduction core結果の後に手製のrejected objectを置いており、正式な拒否報告そのものを証明していない |
| `FOVI007` | 描画QC evaluatorの結果後に手製reportを置いており、上位の正式なrejected経路を証明していない |
| `FOVB006` | 旧B1のpassed／rejected／abstainedは実行しているが、rejectedのexact codeと各正式出力byteの全比較がない |
| `FOVB009` | 意味終端のevaluator・report builder・writerは通るが正式job runnerを迂回し、拒否codeの所有を明示確認していない |
| timeline拒否4枝 | 実runnerとwriterは通るが、正式出力byte内のexact code・path・statusを一件ごとに照合していない |
| `FOVF006` | timeline以外の境界はsource中の語の静的確認で、実際のrejected結果と終了codeを横断証明していない |

F03の現在SHA-256:

- `bf97e971a370fa7343bef18ac08a5fa1dcdca41baef0cf7277586394f6f47719`

これはproduction契約の矛盾を示すものではなく、81件が約束した実枝証明へ検査が届いていない検査実装の不足である。

## 6. 停止時点

- F08限定修正: 静的実装済み
- 追加監査: 4/6 PASS、2/6 FAIL
- F03: 40 IDの件数は存在、実枝証明は未完成
- 正式81件: **0回**
- 正式TAP: 未作成
- 正式attempt root: 未作成
- 直接影響130件: **0回**
- green 287件: **0回**
- baseline 181件: **0回**
- 5 tree最終照合: **0回**
- commit A: 未作成
- 正式成果物変更: 0件
- API通信: 0回
- 費用: US$0

不合格を見て期待値を動かす行為、同attemptでの修正、固定許可field表の拡張は行っていない。

## 7. 次の限定修正案

次attemptでは、次の2群を一つの版付き修正設計として閉じる必要がある。

1. F04とF11の公開前再読入口が、呼出側のfield名を信用せず、既存decoder・validatorで検証したjob／上流recordと実読取証拠から対象fileを一意に導出する。固定表、新しい対象file計算、既存code集合は変えない。
2. F03の既存40 ID内で、手製object・正式runner迂回・静的語確認を、productionの正常／rejected実経路と正式出力byte・exact codeの照合へ置き換える。ID数を増やす場合は81件閉包への影響を事前固定する。

この方向は18 path内で閉じる見込みだが、未承認のため実装していない。F04／F11で既存recordから安全に再構成できず新しい入口・schema・validatorが必要と判明した場合は、限定修正ではなく契約・範囲改訂として戻す。

## 8. 再開に必要な判断

承認依頼文案:

> 正式attempt前・閉包監査停止報告v001の停止を受理し、§7の2群を一つの版付き修正設計として閉じることを承認する。F04とF11の公開前再読入口は、呼出側の許可field自己申告を廃し、既存decoder・validatorで検証済みのjob／上流recordと実読取証拠からのみ対象fileを導出する。固定許可field表、新しい対象file計算、既存status・違反code・終了code、正式成果物は変更しない。F03は既存40 ID内を第一候補として、正常／rejected実経路、正式出力byte、exact codeまで証明する。修正後は追加監査6/6を最初から行い、合格時だけ正式81件の新attempt、直接影響130、green 287、baseline exact、5 tree、commit Aと18 path SHA表へ進む。新たな現物差、不合格1件、19 path目、契約解釈が必要な場合は同attemptで直さず停止する。
