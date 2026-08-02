# 縦型正式経路 実装完了報告 v001

- 日付: 2026-07-30
- 対象: `speaker_only` 縦型presetの正式経路
- 結論: 実装・全92検査・横型二層比較・正式preset登録が完了
- 外部API通信: 0回
- API費用: US$0
- 人間作業: 0件

## 1. 今回できるようになったこと

人間が目視合格した縦型字幕の見た目を、
候補動画専用のpreviewではなく、版付きの正式presetとして登録した。

正式登録値:

- format: `vertical-short-1080x1920`
- 画面型: `speaker_only`
- preset: `vertical-short-speaker-only-readable-pop-v001`
- 文字サイズ: 134 px
- 1行の安全上限: logical width 14
  - 現行の日本語全角文字では約7文字
- 最大行数: 2
- 縁取り: 11 px
- 光彩: 17 px
- 安全余白: 上下38 px、左右43 px
- 位置: 下中央、縦方向 -6%

画面型の許可語彙は
`speaker_only / screen_speaker / speaker_pair`の3型である。
今回登録したのは`speaker_only` 1型だけで、
他2型を登録済みと報告しない。

## 2. 実装範囲

実装ファイルは承認上限どおり42件である。

- 新規24件
- 既存限定変更16件
- 直接起動修正2件

42件目を越える実装は行っていない。
正式job、検査TAP、完了報告、正式登録reportは
実装ファイル数へ含めないという承認済み区分に従った。

後方互換用の変換、v003からv002への偽装、
候補動画IDや認定境界のコードへの焼き込みは追加していない。

## 3. 全92検査

### 正式実行

固定Nodeと固定TSX実体を使い、
9検査fileを直列のNode test runnerで一度に実行した。

| 項目 | 実測 |
|---|---:|
| tests | 92 |
| pass | 92 |
| fail | 0 |
| cancelled | 0 |
| skipped | 0 |
| todo | 0 |
| duration | 9234.448833 ms |

生TAP:

`evals/clip_composition/reports/presentation/test-runs/20260730-vertical-formal-path-v001/node-test-92-tsx-v001.tap`

SHA-256:

`fa373040f1675037c048bb00fdc1c2c54db3664ddbf70bdf5881408d2c72eccc`

生TAPには92件それぞれのID、合否、所要時間が入っている。

### 先行失敗attempt

最初のattemptは通常Nodeだけで起動したため、
TypeScript検査fileを読めず71/72で停止した。
コード・fixture・期待値の不合格ではなく、実行入口の誤りである。

失敗TAPは上書きせず保持した。

`evals/clip_composition/reports/presentation/test-runs/20260730-vertical-formal-path-v001/node-test-92.tap`

SHA-256:

`9b4574f1b4967908916b69fae426a1160171404c1c6e84f49e31caf94eba30ca`

この停止を新計画の1/2として記録した。
固定TSX実体を通す既存契約から次の実行方法を一意に導けたため、
人間判断を追加せず正式実行へ進んだ。

## 4. H01〜H06と横型二層比較

H01〜H06は全て合格した。

| ID | 実測した内容 | 結果 |
|---|---|---|
| H01 | candidate 13の横型正式95 path、candidate 59の横型正式91 pathを各安定tagとbyte照合 | 合格 |
| H02 | candidate 13 B3先頭5成果物のbyteと共有計算入口 | 合格 |
| H03 | 正式B3 7成果物と保存済み意味回答から意味入力をlive再構築 | 合格 |
| H04 | live意味入力と正式残存発話から表示containerをlive再構築 | 合格 |
| H05 | v002字幕回帰24件 | 24/24 |
| H06 | 正式描画資料からQCをlive再計算し保存済みQCとbyte照合 | 合格 |

主要な処理結果:

- candidate 13 tree SHA-256:
  `2c68a23d126586b5e071848858edba637e79839bcb5d0906613d4398e9c62464`
- candidate 59 tree SHA-256:
  `983763b52a60e10fd99126265e7178e4a600fd3024e00614f8abfcc90a724397`
- live意味入力:
  3 container / 20 meaning group / 40 line /
  205 boundary candidate / 354 source atom / 最大論理幅30
- live表示container:
  3 container / 20 cue /
  canonical SHA-256
  `3cf117fe8404db38bcc3f4db29b70a341c889e2d50e3589bc0c159d44f602490`
- live QC:
  20 instruction /
  formal byte SHA-256
  `cd12027b6292024d00c6fbef7161ffefd2bd69ee2bfaaeea76105d2ef2847eb9`

保存済み横型成果物の処理結果は1 byteも変更していない。
生成時実装SHAと現在SHAの同一要求は再導入していない。

### 承認済み来歴差

処理結果とは別に、現在実体との一致を確認した来歴差は次の13件だけである。

| 処理の意味 | path | 現在SHA-256 |
|---|---|---|
| B3共有計算 | `evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs` | `ac3dcbbc671af6f56dcceeea6a41c8ae9cbf9fc4ba28a8a00bbc5d6faff45bcd` |
| B1共有計算 | `evals/clip_composition/presentation_caption_semantic_output_v001.mjs` | `9b9bb011dcd198e02cb075b70e79d3090ddfe17694198f56b83726f004e78c6d` |
| B6共有送信入口 | `evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs` | `eb4c8a62e636b16cbcf0f0bf5fb0f134e04eede6a100daa6a7153a3594452e66` |
| 指示書共有検査 | `evals/clip_composition/presentation_instruction_contract_v003.mjs` | `c0a3c791c74a8c303e97e1fe0c81b8017c5dee35bd93e57668d8e11fa24925e7` |
| B4共有計算 | `evals/clip_composition/presentation_caption_display_pair_v003.mjs` | `a22aa6ad44a7cd07c75ba1ebde4d40601efe29915ca6cfe915f4e1a3d8808a04` |
| B4正式runner | `evals/clip_composition/run_presentation_caption_display_pair_job_v001.mjs` | `567757847273ba52dd82ea7c497531f5767a28ed8082072331d38e15605d8204` |
| 境界検査runner | `evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs` | `e83157cfe72197940193c9bd07a4f8c9be4b1716617dc55bf90e1e8c4f33812e` |
| 描画共通処理 | `evals/clip_composition/render_presentation_v002.mjs` | `d02d603f3fc04f9ab58ce889644f5e63bf17d7ec5cb19019e09110c6167a720b` |
| 描画後QC | `evals/clip_composition/presentation_renderer_qc_v002.mjs` | `73ede4f3556f80afac98b8e0e3c4b81019f718b4644d2b3f8cb1ac037989f0d3` |
| Remotion root | `runner/src/remotion/Root.tsx` | `a08c4c888a0fcd356dc0911732aeb51badd3420305056b1d02ac109b39d0fd23` |
| テロップ描画 | `runner/src/remotion/renderer/TelopRenderer.tsx` | `7fe1296f6884c90acadb61dcd2e45c81d24e2fddac14cf78b120897f05ca289b` |
| Remotion入力 | `runner/src/telop-remotion.ts` | `4d641312585a41f0a0f539738f27c3df09c8b289952c6bb36d8e9f33dcc53812` |
| テロップstyle | `runner/src/telop-style.ts` | `22d4fea92a0cb96f83cbf0dc85a80cc320950cc9052e357056218d24fc100847` |

## 5. 違反codeの実発火

36 code全件について、代表枝を推測せず既存検査を監査した。

| 項目 | 件数 |
|---|---:|
| 返却codeを実際に観測済み | 24 |
| 未発火または返却code未観測 | 12 |

未発火・未観測の12件:

1. `DISPLAY_POLICY_BINDING_INVALID`
2. `DISPLAY_POLICY_REGISTRY_MISMATCH`
3. `DISPLAY_POLICY_WIDTH_MISMATCH`
4. `DISPLAY_FORMAT_BINDING_MISMATCH`
5. `DISPLAY_PRESET_BINDING_MISMATCH`
6. `VERTICAL_LAYOUT_INPUT_HASH_MISMATCH`
7. `VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH`
8. `API_COUNT_TOKENS_BILLING_UNVERIFIED`
9. `API_COUNT_TO_PROMPT_BOUND_UNVERIFIED`
10. `API_MAX_OUTPUT_BILLING_BOUND_UNVERIFIED`
11. `API_USAGE_BUDGET_VIOLATION`
12. `VERTICAL_RENDER_INPUT_BINDING_MISMATCH`

No.8〜10は36件一覧に残る旧名で、
現行費用検査は人間が受容した残余リスク記録の不一致を拒否する名称へ変わっている。
旧名を現行名へ推測で読み替えて全発火とは報告しない。

詳細:

`evals/clip_composition/reports/presentation/presentation-vertical-formal-path-actual-violation-code-observations-20260730-v001.md`

## 6. 正式preset登録

正式jobを1回だけ実行した。

job:

`evals/clip_composition/outputs/presentation/vertical-preset-finalization-jobs/vertical-speaker-only-preset-finalization-20260730-v001.json`

job SHA-256:

`ffbe179b0dce0ba861b3c88b30d9321944d2fe37eaea684cb6b81539a263aba5`

結果:

- status: `passed`
- violations: 0件
- 再試行: 0回
- 正式出力: 5成果物
- report: 1成果物
- 公開後の読み取り専用再照合: 合格

| 役割 | path | SHA-256 |
|---|---|---|
| preset台帳 | `evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/preset-registry.json` | `3a3e0b7b9ce4e349f778b8035c60085a101f7631373404bdc8252a9cc7532133` |
| preset検査index | `evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/preset-validation-index.json` | `6d2eb554f2752383b54180a3c9d21f81620734aef760a2894be8c4914a8ff9e2` |
| 素材検査index | `evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/material-validation-index.json` | `98213035bc6e395b090d7cff2639d4bf707fb838b7df50cb51bc60ab95d4758e` |
| 台帳間の信頼束縛 | `evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/trusted-registry-bindings.json` | `e980be0b96e8ff5b69e57fa4787e503fd77ca21e51764cf96098df5d65449ece` |
| 縦型renderer trust | `evals/clip_composition/registries/presentation/presentation-vertical-renderer-trust-v001/trust.json` | `af0738e2c96b7e6a8f6efc1d035191cd989f3c0adf52f939cb46fb945205e72e` |
| 正式化report | `evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/preset-finalization-report.json` | `64b821f1d61bfffe69f1d4415d894c53dec4c02f4e4bbda8d5258871522cb85e` |

## 7. 事実・推測・未確認

### 事実

- `speaker_only`縦型presetは正式登録済みである。
- 全92検査は92/92合格した。
- 横型の保存済み正式成果物は安定tagとbyte一致した。
- 横型の意味入力・表示container・QCは現行正本計算で再構築し、保存結果と一致した。
- 36違反codeのうち実発火確認は24件である。
- 外部API通信とAPI費用は0である。

### 推測

- なし。

### 未確認

- `screen_speaker`と`speaker_pair`の正式preset。
- 動画から3型を選ぶLLM接続。
- candidate 59の縦型正式B3・B5・B6・B4・描画。
- 完成した縦型mp4の人間目視。
- 未発火12 codeを追加実装なしで観測できるか。

## 8. 現在の停止点

本ゲートは正式preset登録で停止した。
Gemini通信、candidate 59の縦型正式job、表示計画、縦型mp4は生成していない。

次工程は、正式登録した`speaker_only` presetを使い、
candidate 59について縦型B3 package作成、B5 token計測、
B6 1回実走、B4表示計画、縦型描画、QCへ接続する工程である。

この次工程では、API通信と費用が発生するため別承認を要する。
想定する人間作業は完成mp4の目視1件だけである。
