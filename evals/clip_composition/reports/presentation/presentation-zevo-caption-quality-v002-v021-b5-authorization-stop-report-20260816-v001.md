# ZEVO字幕品質v002 v021 B5 authorization停止報告 v001

## 1. 結論

承認されたsnapshot path修正は成立した。6件はbyte同一で新job専用directoryへ配置され、job IDからjob、snapshot、出力先を一箇所で導出した。新しいB5 jobは正式decoder・値validatorの両方に合格した。

その後のB5正式実行は、`countTokens`より前の支出authorizationで`CUE_B5_JOB_INVALID`となり停止した。

- API通信: 0回
- `countTokens`: 0回
- `generateContent`: 0回
- 費用: US$0
- B5正式出力root: 未作成
- B6・selection・描画・QC: 未実施

## 2. snapshot修正の結果

- 公式根拠snapshot: 6/6 byte一致
- 新job ID専用path: 6/6一致
- path共用導出: job、snapshot root、出力rootを一箇所から生成
- 公開前値validator: 合格
- 公開後正式decoder: 合格
- 公開後値validator: 合格

拒否済みv005 jobとその承認行は不変保持している。

## 3. 新しい停止原因

B5の残余リスク受入記録は、課金上の未確認事項3件を人間が受容したことに加え、**どのsource packageに対する受入か**をfile SHAまで固定している。

新B5 jobはv021 source packageを入力にしたが、残余リスク受入記録は旧source packageを指したままだった。正式authorizationは両bindingのexact一致を要求するため拒否した。

これはsnapshot修正の不成立ではなく、job製造時にsource packageを進めながら、それに従属する残余リスク受入bindingを旧版のまま引き継いだ別の配線漏れである。

## 4. 三分法

- production／実装: **job製造処理の実装欠陥**
- fixture・実行設営: 該当なし
- 契約解釈: 不要

正式runnerは意図どおり、旧sourceへの人間受入を新版sourceへ暗黙流用せず停止した。authorization規則は緩めない。

## 5. 推奨するforward-only修正

同attempt内では修正しない。次を推奨する。

1. v006 job、snapshot 6件、実行記録、承認行を不変保持する。
2. v021 source packageをexactに束縛する新版の残余リスク受入記録を発行する。
3. 未確認claim 3件の判定、受入scope、US$1.00上限は既承認値から変えない。
4. 新しい版付きB5 job、job専用snapshot directory、未使用出力rootを発行する。
5. decoder・値validatorに加え、残余リスクbindingと承認行の実照合まで通信前preflightへ追加する。

## 6. 証拠

- 構造化診断: `presentation-zevo-caption-quality-v002-v021-b5-authorization-diagnosis-20260816-v001.json`
- B5正式実行記録: `20260816-zevo-caption-quality-v002-v021-b5-formal-attempt-0001`
- snapshot複製記録: `presentation-zevo-caption-quality-v002-v021-b5-snapshot-copy-record-20260816-v001.json`
- v006 job製造記録: `presentation-zevo-caption-quality-v002-v021-b5-job-build-record-20260816-v002.json`
