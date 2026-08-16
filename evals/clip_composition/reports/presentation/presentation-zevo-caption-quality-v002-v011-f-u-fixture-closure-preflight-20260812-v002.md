# ZEVO字幕品質v002 F/U fixture閉包preflight記録 v002

- 日付: 2026-08-12
- 外部通信: 0回
- API費用: US$0
- production・契約・既存正式成果物の変更: 0件
- 実行条件: 固定Node、固定TSX絶対path、`NODE_OPTIONS`不存在、native Darwin arm64

## 1. 目的

F正式attemptのfixture製造とU確認画面検査について、保存済み成果物から実際に使う値までの供給経路を現物byteから逆引きした。名前の似た旧schemaと新schemaを混用せず、3 caseがproduction自身の読取・閉包・投影・表示計画入口を通過することを正式attempt前に確認した。

## 2. schema分離

| 用途 | 現物のexact key | 意味packageを指すfield | 判定 |
|---|---|---|---|
| A-v002保存済みoutput request | `requestId`, `meaningInformationPackage`, `baseMediaInput` | `meaningInformationPackage` | 合格 |
| 保存済み横型style request | `schemaVersion`, `requestId`, `mode`, `meaningInformationPackage`, `baseMediaInput`, `styleInput`, `publication` | `meaningInformationPackage` | 合格 |
| Fが新規製造するformal output request | `schemaVersion`, `requestId`, `caseId`, `inputCaptionId`, `sourcePackageBinding`, `selectionBinding`, `selectionReportBinding`, `meaningPackageBinding`, `baseMediaInput`, `styleInput`, `publication` | `meaningPackageBinding` | 合格 |

旧schemaから新field名を読む黙った読み替えは0件。新formal requestへ旧field名を残す経路も0件。

## 3. F fixture値の逆引き一件表

| 使用する意味 | 保存済み成果物 | 実在schemaの供給field | consumerへ渡す値 | 事前検査 |
|---|---|---|---|---|
| 3 caseの意味package | A-v002横型output request | `meaningInformationPackage` | 意味packageのpath・file SHA・canonical SHA | 3/3合格 |
| 基礎映像・timeline来歴 | 同上 | `baseMediaInput` | source contextの基礎映像入力 | 旧render planのbindingと3/3一致 |
| 横型style実値 | candidate 59横型style request | `styleInput` | source contextの横型style入力 | production style resolverで3/3合格 |
| style台帳成果物 | 同上 | `styleInput.presetBinding`の5 formal binding | style再解決用の5成果物 | `presetId`を成果物bindingへ混入せず5/5読取合格 |
| 既存のcue終端・行末 | A-v002横型render plan | `captionDisplays[0].pages` | 境界IDだけのfixture回答 | 3/3構築可能 |
| 新formal output request | source context・proof job | 新schemaの各binding・style・基礎映像 | F runnerの表示計画入力 | exact key集合を検査 |

横型style requestの現物file SHA-256は `ac07ac8382444126df270ac2c48f7b0fd813053f45faafa69d2da58c1216e214`。

## 4. 3 case読み取りpreflight

| case | 意味package file SHA-256 | caption | atom / code point | 全文閉包 | 正式意味package検査 | production planner |
|---|---|---:|---:|---|---|---|
| voice-013 | `40e3c5811ad77c420a3e3c996a4fb65588f1bac611764bdb31275bf1b7ab1422` | 1 | 101 / 101 | 合格 | 合格 | 合格・3 cue |
| voice-067 | `276f9de8866041f386607b0977861852156d94ea36e0b1e61391791bfb3ee19c` | 1 | 72 / 72 | 合格 | 合格 | 合格・3 cue |
| voice-190 | `2dfce7547b759b62a1caaed9b620f5c14f2ce5462fbc2ca0fc42f835cbec4d69` | 1 | 80 / 80 | 合格 | 合格 | 合格・3 cue |

production自身の入口による結果:

- 意味package・style・基礎映像のstable再読: 合格
- 意味captionとatomの全量閉包: 合格
- selectionからの全case投影: 合格
- page/line planner v003: 3/3合格

独自の簡易計算による代用は行っていない。

## 5. U fixture値の逆引き一件表

| 使用する意味 | 供給元 | consumerへ渡す値 | 事前検査 |
|---|---|---|---|
| 旧表示との比較対象 | A-v002の横型3 plan・縦型診断3 plan | 6件のformal binding | exact 9 key・file SHA・canonical SHAを6/6照合 |
| 人間確認の質問 | 契約固定5問 | 確認画面の質問列 | 固定順・固定件数 |
| 新F完了物の映像・QC・cue timing | F runnerのcompletion/review製造 | review inputの3 item | U testでは決定的なplain fixture、正式F経路ではF成果物から供給 |

U testの保存済み成果物読取は旧render plan 6件だけであり、意味package field名の読み替え経路はない。

## 6. 判定

F/Uのfixture供給経路は、保存済み成果物→実在schema→供給field→consumer引数まで全件閉じた。3 caseのproduction正常経路predicateも正式attempt前に成立した。F局所3件の新attempt開始条件を満たす。

診断に用いた読み取り専用scriptのSHA-256は `8e4213e3c1f4515d209af580d37d2c90de2e0d7143d107d40d5520bf3d25fbdf`。scriptは一時領域のみで、正式成果物へ含めない。
