# 意味／表現分離 初回実データrun 入力固定停止報告 v001

日付: 2026-08-03
状態: **通信前停止。正式jobは未作成**

## 結論

指定された入力値は、既存の人間承認記録と正式台帳へ照合できた。しかし、縦型の既存crop記録が旧経路の基礎映像pathへ固定されており、新しいforward-only経路の基礎映像へそのまま接続すると必ず拒否される。さらに、現在の正式契約には下記5項目を一つに保持する統合run jobがない。

このため、実行可能と偽った版付きjobを作らず、API通信0回・費用US$0で停止した。本書が固定値を保持する一枚の下書き兼停止記録であり、条件付き実行承認はまだ発効させない。

## 固定された入力

| 項目 | 固定値 | 正本・照合結果 |
|---|---|---|
| 素材と区間 | 元配信`qdczJpv8RCc`、candidate 59、`5941162 <= t < 5992736` ms | 人間承認済み組立決定。未解決編集0件。1,547 frame、51.5667秒への既承認格子写像 |
| 横型 | `normal-landscape-readable-pop-v001`、幅36、identity crop | 正式preset台帳と一致。identity cropは独立fileでなく`{"mode":"identity"}`という入力値 |
| 縦型 | 型`speaker_only`、`vertical-short-speaker-only-readable-pop-v001`、幅14、`crop-decision-v006` | 正式preset台帳とcrop選択内容に一致 |
| API支出上限 | US$0.50 | B5実測が上限内と確認できた場合だけB6を許可 |
| title | 空 | v001の正式値`{"text":"","inputMode":"none"}` |

主な照合先:

- 組立決定: `evals/clip_composition/outputs/presentation/source-assembly-formalizations/qdczJpv8RCc-candidate-59-v001/assembly-decision.json`（SHA-256 `72a1d9c95839a62a3f4dae395ffa9e67877910d75040c65796ca994ad3dd51a4`）
- 横型preset台帳: `evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json`（SHA-256 `8e9b0a039c8a4c9edf2c66b1df343c1d892d4688ebc4886a9af322bd44a6e5a8`）
- 縦型preset台帳: `evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/preset-registry.json`（SHA-256 `3a3e0b7b9ce4e349f778b8035c60085a101f7631373404bdc8252a9cc7532133`）
- crop決定: `evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/type-crop-v006/crop-decision-v006.json`（SHA-256 `4fba3f371412310fc5122ccfb58634e390a5725aec185172bcf041dd0152a4ed`）

## 停止理由（事実）

`crop-decision-v006`と対になる選択記録は、入力媒体を次へ固定している。

```text
evals/clip_composition/outputs/presentation/base-media/qdczJpv8RCc-candidate-59-v001/base-media.mp4
SHA-256 faad660c7623cdbf3a8f3b55cdaffc34729d06683ce391997c51f10fbc076967
```

一方、新経路の基礎映像は契約上、次の別rootへ新規生成される。

```text
evals/clip_composition/outputs/presentation/meaning-output-base-media/<packageId>/base-media.mp4
```

出力側は、crop選択記録内の媒体pathとSHAが、今回描画する基礎映像のbindingに完全一致することを要求する。既存のv006を無変更で渡すと`CROP_BINDING_MISMATCH`になる。検査fixtureでは一時的に選択記録とcrop決定を新基礎映像へ作り直しているが、productionで同じことを行う正式入口は存在しない。

また、正式経路は「区間決定job → 意味境界B3 job → B5 job → B6 job → B1 job → 意味package job → 基礎映像job → 横型／縦型それぞれの出力job」に分かれており、5項目をまとめる単一job schemaは存在しない。ここで新schemaを仮設すると、承認範囲を越えた契約設計になる。

## 推測・未確認

- cropの選択内容（型、候補、viewport）を変えず、新しい基礎映像のpathとSHAだけへ版付きで来歴を結び直す最小工程なら、素材固有値の再解釈を避けられる見込みがある。ただし正式契約とproduction入口は未設計である。
- 5項目の入力固定記録を、既存の分割job群にどう束縛するかも未確定である。統合runnerを新設する必要があるとはまだ判定していない。

## 実施していないこと

- 版付き正式job作成: 0件
- `countTokens`: 0回
- `generateContent`: 0回
- 基礎映像・意味package・横型／縦型成果物の新規生成: 0件
- 既存正式成果物の変更: 0件

## 次に必要な判断

推奨は、**固定済み5項目だけを保持する実行入力記録の最小schema**と、**v006のcrop選択値を変えず新基礎映像へ来歴だけを再束縛する正式工程**を一つの最小契約設計として先に提示すること。その承認後に版付きjobを作り直せば、今回の条件付き実行承認を変更せず再利用できる。
