# ④.5 レンダリング疎結合化 停止報告 v004

## CURRENT_GOAL 4項

1. 今の目的: 動画出力を別プログラムへ分けて疎結合にする。これにより同時に開発を進められ、中間生成物をレビューでき、修正の影響が小さくなって検証しやすくなり、クオリティを上げやすくなる。
2. 主計画上の現在位置: ④字幕品質v002は完了（`stable/caption-quality-v002-20260816`）。④.5 レンダリング疎結合化（演出指示書境界の実装）。
3. 今の作業: 契約設計v001に基づき、注文書・受領書・出力側行分割・新renderer runnerを作り、字幕横型1本とタイトル2本で注文書を人間がレビューできる状態を実証する。正本path上限18件。
4. 今回やらないこと: 字幕縦型 / G4〜G7 / renderer表現力の拡張 / 旧プログラムの物理削除 / A-v002の目視合格・tag / commit・tag・公開 / API通信・費用支出。

## 1. 停止結論

2026-08-17、title landscapeの新renderer正式attempt-0005が、受領書公開・出力側行分割・layout inspection合格後、overlayを作るchild processの非0終了で停止した。

- 検査設営修正枠: 5/5使用済み。
- 限定実装修正枠: 3/3使用済み。
- 同attempt内修正: 0件。
- 追加作用: 停止。
- API通信: 0回。
- 費用: US$0。
- commit / tag / 公開: 0件。

枠を使い切ったため、原因候補を推測して追加修正せず停止する。

## 2. 到達点

### 2.1 契約・受入

- 追補v001: renderer job/receiptの外部実行体6件binding、renderer trust v002、path上限18を実装。
- PRP 6/6、PRI 10/10、PRL 8/8、PRA 12/12。契約側36/36合格。
- PRA正式再attempt TAP SHA-256: `3e6cb353564d7edd4227150cd0f782b00b3920bb55f8f57a644dce6c02a725b7`。
- renderer trust v002 SHA-256: `6e21352ff105e3b77acc351625fed22ff97486fb21d0ce9ee5b1821750a9047a`。
- 追補v001 SHA-256: `2643e7bf7ad8cdac6dd81a4fa1f1bb5c884b6f2968ec4db465554ad91bee1fad`。

### 2.2 title landscape attempt-0005

次の独立成果物までは正式に成立した。

| 成果物 | SHA-256 |
|---|---|
| 注文書 | `6ba2ad745801c12bb02376c37639888018999a39b9706cff4691c0b5928df8be` |
| renderer job | `815f91698bdf72226bfcf2c42bebc1e4c677494ed4d0e4dec57f9fc11774db31` |
| admission receipt | `c50c6072331a483ae80f50dbbd5d732f7b889b3aa03d125e8cb69c4728ceff00` |
| line layout | `c16da63a82b29945373a6c064665ddc6ab2f6c24b970e24f60ac35f18210083e` |
| layout inspection | `248d9610b6ca7c8d4bf4a51cc72fb4720c50eaed502bcd50191ba0e9d9cd7c5d` |

layout inspectionは`status=passed`、1920×1080・30fps、title一行、違反0件である。したがって、注文書、renderer job、外部実行体/実装/trustの受入、行分割、物理配置検査までは成立している。

動画、overlay、QC、review pageは未成立である。PRM 8件は正式計上していない。

## 3. attempt履歴

| attempt | 到達点 | 帰属・処置 |
|---|---|---|
| 0001 | TSX起動前 | sandbox内IPCの`EPERM`。証拠保持し新jobへ移行 |
| 0002 | 旧title runner bootstrap | offline installでRemotion起動shimの固定CLI markerが消失。設営を復元 |
| 0003 | 注文書・renderer job公開後、入力再読 | material台帳の正式識別子`registryVersion`を`schemaVersion`として読んだ新runner欠陥。役割別識別へ限定修正 |
| 0004 | admission | admission用媒体要約へ描画用解析本体を余分な8項目目として混在させた新runner欠陥。引数を分離 |
| 0005 | receipt・line layout・layout inspection後 | overlay child process非0。work/lockを安全保持して停止 |

0005 stdout SHA-256は`5276f9662a038659ffc4481a6a703f76b6b0c4c81a75396b2f7a8407dd559094`。stderrは0 byte、終了code 2、signalなし。

## 4. 三分法と未確認事項

- 契約起因: 未確定。注文書・receipt・line layout・layout inspectionまでは承認済み契約どおり合格している。
- production実装起因: 未確定。overlay childへ渡した入力または起動配線の可能性は残るが、保存failureは子processの非0だけで、stderr本文を正式証拠へ残していない。
- 実行設営起因: 未確定。固定TSX、runtime6件、trust8件はadmissionで合格したが、overlay child内部の実体利用までは保存証拠から一意に読めない。

確定事実は「layout inspector完了後、最初のoverlay fileができる前にchild processが非0終了した」までである。具体的な内側code・対象実体・値は診断可能性不足であり、推測0件を維持する。

## 5. もう一つの保留点

caption側は停止報告v003のとおり、注文書がstyle profile IDだけを持つ一方、横型presetが複数visual stateを持つため、暗黙の先頭/default選択なしでは表示状態を一意に決められない。これは第1層の契約判断待ちとして保留しており、本attemptでは触れていない。

## 6. 次の裁定に必要な一問

試行錯誤枠を増やして、overlay childの終了code・閉語彙stage・対象入口を正式証拠へ残す最小観測を先に追加し、その観測だけで原因を確定する新attemptを許可するか。

許可する場合も、captionのvisual state ID問題は別の第1層判断として残る。

## 7. 作業領域

- attempt-0005のlock/work rootは安全保持し、削除・再利用していない。
- landscape job/control rootはv001〜v005を履歴として保持。
- verticalはjob v001と空の未使用control rootだけで、実行していない。
- 一時fileの退避・削除は未実施。完了報告前の整理工程へ到達していないためである。
- 既存正式成果物・stable tagは変更していない。
