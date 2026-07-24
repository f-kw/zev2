# ゲートA 遡及安定点 読み取り監査 v001

- 監査日: 2026-07-24
- 対象commit: `23a709a1b1ea7ccc02966702e1048add965725c0`
- 発行するtag: `stable/gate-a-complete-20260723`
- 監査方式: 過去commitと保存済み完了記録の読み取り。実装、検査再実行、正式成果物変更は0件
- 結論: **安定点の3条件を満たす**

## 1. 全検査合格

対象commitに存在するゲートA完了報告を読み取り、次の完了記録を確認した。

| 検査 | 保存済み結果 |
|---|---:|
| ゲートA正式合成検査 | 21/21合格 |
| 固定違反の発火 | 35/35 |
| 残存発話の既存回帰 | 50/50合格 |
| candidate 13読み取り専用preflight | 10/10合格、違反0 |

正本:

- `presentation-gate-a-implementation-completion-report-20260723-v001.md`

今回の遡及監査では検査を再実行していない。保存済み完了記録と対象commitの実装・成果物を照合した。

## 2. 正式成果物のhash一致

対象commitから正式7成果物のbyteを直接読み、SHA-256を再計算した。承認済み完了記録との不一致は0件。

| 正式成果物 | 再計算SHA-256 |
|---|---|
| 基礎映像 | `c0677893902b5a1eaf79b2a3937d67a477f270810200f7c6c01457b42b803c48` |
| frame時間対応表 | `802f570dd4f8ea90ef63b0b9afb9a026abf0b18e43e51f2aab51bd62c2180fec` |
| 基礎映像の生成来歴 | `e06a606e7348a8c30a743edd9acd5da96e035125b2b69a33257d0c31cf9b81db` |
| 基礎映像の検査記録 | `e906b4424609176d019ddc4c8d314df056feb87de1e993bf84f247eff5c21079` |
| 残存発話354件 | `8656549ec3fbbc0fb9447be7b9c2e784d22ebd18f08ee3e24c474ee62225c6d3` |
| 残存発話の生成来歴 | `18094dd3729eead88c498f997e883253a1481ee8a33279882350aacfcf869cf1` |
| 残存発話の検査記録 | `be32244280a2564eda9a716a83d04da38f241120a6d2ba40e72e867072fc2ae6` |

根拠:

- `presentation-first-real-data-base-media-attempt-v002-completion-20260722-v001.md`
- `presentation-candidate13-retained-source-atoms-formal-execution-20260722-v001.md`

## 3. DECISIONSとHANDOVERの同期

対象commitの両文書は、次の同じ現在地を記録している。

- candidate 13の正式基礎映像と残存発話354件は確定済み。
- ゲートAは205件の機械境界候補を作り、21/21、35/35、50/50、10/10に合格済み。
- 自然な読みやすさ、正式入力package、Gemini、字幕指示書、描画は未実現。
- B1受け渡し入口は承認済みだが、B2の完成成果物はまだない。

対象commitの次からB2実装・停止診断が始まるため、このcommitはB2作業へ入る直前に戻れる最も新しい検証済み地点である。

## 4. 初回遡及の例外

安定点制度より前のcommitには`JOURNAL.md`が存在しない。人間裁定により初回遡及だけ、次の分離を許可する。

1. 本監査、`DECISIONS.md`、`docs/HANDOVER.md`、`JOURNAL.md`初回entryを現在HEADの新規commitへ保存する。
2. tagは、検証済み実体である過去commit `23a709a1b1ea7ccc02966702e1048add965725c0`を指す。
3. `JOURNAL.md`にtag名、対象commit、3条件の根拠、撤退時に失う範囲を残す。
4. 以後の新規tagではこの例外を使わず、JOURNAL entryをtag対象commitへ同時記録する。

## 5. 撤退時に失う範囲

このtagへ撤退すると、次を失う。

- B2の字幕入力package実装、複数回の安全停止、検査修正、127/132停止までの診断と設計文書。
- `presentation-candidate13-caption-gate-c-connection-readiness-audit-20260724-v001.md`に保存した、ゲートC以降の接続準備監査。
- `presentation-new-material-candidate-preselection-delta-audit-20260724-v001.md`に保存した、新素材候補の再照合監査。

正式入力package、Gemini実走、字幕指示書、描画は対象commit以後も完成していないため、撤退で失う完成動画や正式な字幕成果物はない。
