# fatal観測性 実害一覧 更新 v002

日付: 2026-08-03  
状態: 観測記録。契約・実装の変更指示ではない。

## 1. 位置づけ

既存v001の4例は変更せず、意味／表現境界の正式検査で確認した2例を追加する。外側の汎用fatalだけでは原因を判断できず、別の読み取り診断を要した実害は計6例になった。

既存4例の正本:

`evals/clip_composition/reports/presentation/presentation-fatal-observability-impact-examples-update-20260802-v001.md`  
SHA-256: `a7f13da4d2bdc2f919cd6a1dced45b0fa62b2dd99d8f4f4afd85405b3f561962`

## 2. 実例5: pathを持たない描画QC違反

診断の正本:

`evals/clip_composition/reports/presentation/presentation-meaning-output-boundary-oee-downstream-fatal-diagnosis-and-contract-gap-20260803-v001.md`  
SHA-256: `204655d4e82862ea0ebdb55f3220523c695ce26f984e694514a20d0d23941b5b`

### 事実

- 既存描画QCは、新経路が渡した内部計画名を見つけられず、`INSTRUCTION_RENDER_MISSING`を返した。
- QC違反にはcodeと対象IDがあったが、正式失敗記録が必須とするpathはなかった。
- 外側は包括的fatalになり、QC code、対象ID、計画名不一致をそのまま確認できなかった。
- 読み取り診断後、既知のpath無しQC codeだけをRFC 6901 root `""`へ写し、対象IDを保持する契約が承認された。
- 正式attempt v004の`OEE009`で、既知codeの写像、未知code拒否、重複拒否が合格した。

### 根本原因と観測性の実害

根本原因は新経路の内部計画名と既存QCの参照名の不一致だった。観測性の実害は、内側に構造化されたQC codeと対象IDがあるのに、path要件の縫い目で失われ、別診断なしに原因が分からなかったことである。

## 3. 実例6: 意味パッケージ参照のobject境界不一致

対象: 正式205件attempt v004の`OEE001/002/005〜008`。

### 事実

- 外側結果はstage `execution`、diagnostic `OUTPUT_ACCEPTANCE_EXECUTION_FAILED`のfatalだった。
- 内側停止位置は、共通描画計画を正式byteへ変える直列化処理だった。
- 内側例外は`TypeError: output formal JSON value is invalid`だった。
- 正式JSON値として不成立だった唯一の箇所は`/meaningPackageBinding`だった。
- 厳密JSON読取器が返したnull-prototype objectを、描画計画がそのまま保持していた。
- 意味内容は正しかったが、後段直列化はplain objectだけを受理するため拒否した。

### 根本原因と観測性の実害

根本原因は、厳密読取器と出力直列化の間でobject表現を揃えなかったproduction実装欠陥だった。外側fatalだけでは対象field、prototype、停止した処理を特定できず、6枝の同根性を判断するためにメモリ内の値型まで読む診断を要した。

契約を変えず、意味パッケージ参照だけを既存のplain-object複製処理へ通したattempt v005では`OEE006`が合格し、`OEE007/008`も故障注入後まで進んだ。ただし正式205件は200/205で、別の後段原因が残っている。残る原因は未診断であり、本例へ推測で混ぜない。

## 4. 6例から見える共通問題

1. 外側codeが複数の内側原因を束ね、原因field・path・stageを失っている。
2. 正しく拒否した場合とproduction欠陥の場合を、外側fatalだけでは区別できない。
3. 同じ外側codeでも、環境、fixture、工程間の型、QC写像など異なる原因が積層する。
4. 原因が見えないため、本来不要な人間判断停止と読み取り診断が増える。
5. 生stackや非公開本文を公開せずとも、信頼済みの段階名と閉語彙の内側理由を残す余地がある。

## 5. 将来のv002で検討する最小情報

- 外側のfailure stageとdiagnostic code。
- 信頼できる場合だけ、閉語彙の内側stageとinner code。
- 対象を一意に示せる場合だけ、RFC 6901 pathまたは既知のpath無しmarker。
- 対象IDがある場合のrelatedIds。
- 安全に分類できる有限なreason category。

保存しないもの:

- API key等のsecret。
- 発話全文や非公開本文。
- 生stack trace。
- 任意のtool stderr全文。
- 推測で補ったpathやcode。

内側情報を信頼できない場合は、欠けた事実を明示し、もっともらしい値で埋めない。

## 6. 事実・推測・未確認

### 事実

- 実害例は既存4例と本書の2例で計6例。
- 追加2例とも、外側fatalだけでは内側原因を確定できなかった。
- 実例5はpath無しQC違反の写像不足、実例6はnull-prototypeとplain-object直列化の型境界不一致だった。

### 推測

- trustedな内側stage・code・pathを閉語彙で保存すれば、同型の診断停止を減らせる可能性が高い。

### 未確認

- fatal観測性v002のexact schema、違反code、保存先、既存reportとの関係。
- 全fatal経路で安全に取得できるinner情報の範囲。
- 改訂後に人間判断停止がどれだけ減るか。
- attempt v005に残る5不合格の内側原因。

## 7. 停止点

本書は観測記録だけであり、fatal観測性契約、production code、検査、正式成果物を変更しない。改訂着手はkawafmmの別判断とする。
