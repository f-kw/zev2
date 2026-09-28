# 14.3 Jev shadow比較 — credential確認で停止

作成日：2026-09-28 / 担当：Codex1

**14.3：未完了。結論：`inconclusive`。状態：`HUMAN_DECISION` / 利用可能な既存credential待ち。**

今回の指示書は、既存TypeSafe利用環境・API keyが使える場合だけ、字幕の演出要否のshadow比較を許可した。外部API費用上限は1.00 USD、推論POST上限は12回。同指示書§5の「既存API key・既存利用権限がなければ、そこまでの準備結果を保存して停止」に従い、認証情報の確認で停止した。API障害・Jevの品質不合格ではない。

## 確認結果と判断依頼

現在のlogin shellから起動したprocess環境にTypeSafe / Jev関連の設定名は0件。リポジトリの既存`.env`にも該当設定は0件。標準候補のユーザー設定directory（`.config/typesafe`、`.typesafe`）は存在しなかった。既存の実装・設定にTypeSafe接続の手掛かりも得られなかった。値・Authorization header・他サービスcredentialは表示も保存もしていない。

これは**この作業で利用できるcredentialが確認できない**という結果であり、別の秘密保管場所やユーザーのアカウント自体の不存在を断定するものではない。無関係な秘密保管場所を広く探索せず、新しいaccount / key / planの取得、支払方法登録、規約同意も行っていない。

相談役へ送る停止理由：

> HUMAN_DECISION：14.3 shadow実走には既存TypeSafe API credentialがありません。新規account / API key取得が必要です。

上記は指示書指定の停止文。既存の利用権限・keyが別途ある場合は、安全な環境設定で利用可能にする判断を先に求める。ない場合の新規取得・契約は今回の許可外。key本文を会話へ貼り付けるよう求めない。相談役経由の明示的な再開指示まで停止する。

## 公開仕様の確認と未確認

2026-09-28に[公式API reference](https://docs.typesafe.ai/api)と[Models](https://docs.typesafe.ai/models)を再確認した。

- 認証はBearer。モデル一覧はGET `/v1/models`、推論はPOST `/v1/systemone`。
- 共通の状態と複数の質問を一つのrequestに入れ、質問IDに対応する回答を返す。質問ID自体は推論へ渡されない。
- yes/no型は確率値を返す。Choice型は選択・分布・確信度、usageは入力・出力tokenのfieldが文書化されている。
- 公開Models掲載は`jev-1.13.0`、入力1百万tokenあたり0.042 USD、出力無料。64k/request、状態＋最長質問32k。textのみ。公開rate limitは250,000 token/秒、1,200 request/分で変動し得る。
- 429 / 529とbackoffは文書化されている。provider timeoutの保証値は今回確認できていない。

以上は公開文書の記載であり、実APIとの一致や当該アカウントの契約価格・権限は未確認。**GETもPOSTも実行していないため、利用modelは未取得・未固定**。文書上のmodel名を実走modelに代入していない。Customer Dataの取扱い、現行利用規約・MCAの今回の再確認は停止時点で未実施。再開時には公式仕様・価格・データ条件の再確認から行う。

## 比較対象・未実行項目

[14.2の棚卸し](../jev-decision-inventory-20260928/README.md)を参照する。保存判断は人間正解ではない。

| 区分 | 場面 | 字幕数 | 保存Normal | 保存effect | 今回取得したJev回答 |
|---|---|---:|---:|---:|---:|
| tuning | candidate-0001 | 53 | 45 | 8 | 0 |
| held-out | candidate-0002 | 84 | 69 | 15 | 0 |
| held-out | candidate-0003 | 61 | 49 | 12 | 0 |
| held-out | candidate-0004 | 101 | 88 | 13 | 0 |
| held-out | candidate-0005 | 27 | 23 | 4 | 0 |
| 合計 | 5場面 | 326 | 274 | 52 | 0 |

326件すべて未取得理由は既存credential未確認。held-outは273件（Normal229 / effect44）で、tuning53件と混ぜていない。今回、字幕本文・問題箇所時刻・個別品質指摘を公開reportへ複写していない。

| 項目 | 今回の結果 |
|---|---|
| model / API version | model未取得・未固定。文書のendpointはv1、実応答なし |
| request / question | GET 0 / POST 0 / 送信question 0、目標は5場面326questions |
| success / failure / retry / timeout / rate limit | すべて0回。API未実行で成功率・可用性評価なし |
| tuning attempt / freeze | 0回 / 未実施 |
| 送信payload / response | 未作成 / なし。送信0 byte |
| reduced-input Codex comparator | 未実施。保存判断を複写して比較済みにしていない |
| 3者agreement・Normal/effect別・方向 | 未計測。accuracyではない |
| probability / confidence / percentile | 未取得。擬似生成・threshold設定なし |
| disagreement技術診断 / 日本語ケース | 未実施。一般日本語の品質を判断できない |
| wall latency / shadow wall time / usage | 未計測 / 未計測 / provider応答なし（tokenを0と捏造しない） |
| 追加外部API費用 | 0.00 USD（API呼出0）。請求書の実測ではない |
| 外部素材送信 | 字幕・動画・音声・全transcriptいずれも0 |
| production / 動画 / 字幕 / 演出 / QC変更 | すべて0 |

旧演出全体170.480秒との速度比較、費用削減率、採用可否の評価は行わない。本番接続・fallback・14.4以後は未着手。

## 保存と検証

軽量集計は[summary.json](summary.json)。credential確認の値を含まない証拠は既存ignored領域`runtime/artifacts/jev-shadow-20260928-v001/credential-preflight.json`に保存する。API request / response / モデルmetadata / freeze / 個別判断のartifactは存在しない。

今回の変更は本report、summary、現在地、開発計画の状態記録のみ。JSON整合、全22完了条件の記録、0回/未取得の区別、参照先、秘密値・字幕本文を含まないこと、差分の空白を確認する。製品codeを変更しないため製品test・API実走testは未実施。監査checkpointのcommit / push / Git cleanと相談役への送信結果は直接報告で実測値を示す。

## 完了条件の一件ずつの確認

| # | 条件 | 停止時点 |
|---:|---|---|
| 1 | 現行API仕様再確認 | 部分確認。API / Models読取済み、データ条件・規約等は未確認 |
| 2 | APIからmodel取得・固定 | 未実施 |
| 3 | credential非保存・非表示 | 確認済み |
| 4 | 外部送信の範囲限定 | 送信0 |
| 5 | tuning / held-out分離 | 対象計画を分離、推論未実施 |
| 6 | held-out前のfreeze | 未実施 |
| 7 | 326件取得または未取得理由 | 全326件：credential未確認で未取得 |
| 8 | 1字幕1requestにしない | POST 0、退化なし |
| 9 | 3者比較 | 未実施 |
| 10 | agreementをaccuracyとしない | 維持、指標未計測 |
| 11 | confidenceをcorrectnessとしない | 維持、値未取得 |
| 12 | API latency実測 | 未実施 |
| 13 | usage・費用 | usage未取得、API費用0.00 USD |
| 14 | 総費用1ドル以下 | 0.00 USD |
| 15 | 動画・音声・全transcript送信0 | 確認済み |
| 16 | production変更0 | 確認済み |
| 17 | 動画・字幕・演出変更0 | 確認済み |
| 18 | 人間初見を汚す具体報告なし | 維持 |
| 19 | report / summary保存 | 本directory |
| 20 | 軽量成果のmain commit / push | 監査checkpointとして直接報告時に確認 |
| 21 | clean / untracked 0 | 直接報告時に確認 |
| 22 | 相談役へ直接報告 | HUMAN_DECISIONとして送信・本文表示確認を行う |

未完了を完了扱いしない。14.3はWaiting、結論は実走前の`inconclusive`であり、Jevが有望でないという結論ではない。
