# Claude直接相談 ZEV01 schema不正試験結果 v004

受領日時: 2026-08-16T14:16:28+0900

consultationId: `zev-consult-ui-trial-20260816-004`

試験種別: `schema-invalid / fail-closed`

request SHA-256: `f0910c8c8d7e1b46d7b9effd10f0e430f07a620ed58688afd201e95b822148db`

## 受信した固定マーカー内の応答

BEGIN_ZEV_CONSULT_RESPONSE
{"consultationId":"zev-consult-ui-trial-20260816-004","decision":"stop","assessment":"合成schema不正試験","requiredSafeguards":["受信側はexact schema不一致として拒否する"],"trialObservations":["余分なkeyを黙って捨てない"],"kawafmmQuestion":"","unexpectedField":"synthetic-schema-error"}
END_ZEV_CONSULT_RESPONSE

## Codex側の観測

- ZEV01会話名・URL: 一意照合
- 固定マーカー: 一意抽出
- JSON parse: 合格
- consultationId: 一致
- exact key集合: 不合格
- 不合格理由: 許可された6 keyに加えて `unexpectedField` が存在
- fail-closed: 合格。余分なkeyを破棄・正規化せず、応答全体を正式判断として不受理にした
- 不受理後のproject作用: 0件
- 実project情報の送信: 0件
- API通信: 0回（Claude Web UI操作のみ）
- API費用: US$0

本試験は合成異常系であり、応答内容を正式裁定・作業指示・運用設定へ流用しない。
