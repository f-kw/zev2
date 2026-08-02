# 縦型正式経路・違反 code 実発火観測表 v001

- 作成日: 2026-07-30
- 対象: `PRESENTATION_VERTICAL_RENDER_VIOLATION_CODES` の36件
- 一覧正本: `evals/clip_composition/render_presentation_vertical_review_v001.ts:66-103`
- 調査方法: 現行worktreeに存在する実装と既存テストを読み取り専用で照合
- Git基準点: `382670466eb7cd4ae39b40005cb2cd7ffbcc9203`
- この文書の性質: 実測結果そのものではなく、既存テストがどのcodeを実際に返却させて観測しているかの事前監査

## 1. 92件の合否

固定Nodeと固定TSX実体を介したNode test runnerで、9検査fileを直列に一括実行した。生TAPに92件それぞれの検査ID、合否、所要時間が記録されている。

| 項目 | 現在値 |
|---|---|
| 92件の実行状態 | 完了 |
| 合格数 | 92 |
| 不合格数 | 0 |
| cancelled / skipped / todo | 0 / 0 / 0 |
| Node test runner実測所要時間 | 9234.448833 ms |
| 生TAP | `evals/clip_composition/reports/presentation/test-runs/20260730-vertical-formal-path-v001/node-test-92-tsx-v001.tap` |
| 生TAP SHA-256 | `fa373040f1675037c048bb00fdc1c2c54db3664ddbf70bdf5881408d2c72eccc` |

最初に通常Nodeだけで起動したattemptは、TypeScript検査fileを読み込めず71/72で停止した。実装不合格と混同せず、実行入口誤りの証拠として次へ別保存した。

| 失敗attempt | 値 |
|---|---|
| 生TAP | `evals/clip_composition/reports/presentation/test-runs/20260730-vertical-formal-path-v001/node-test-92.tap` |
| 生TAP SHA-256 | `9b4574f1b4967908916b69fae426a1160171404c1c6e84f49e31caf94eba30ca` |
| 観測 | `.ts`を通常Nodeが直接読み、`ERR_UNKNOWN_FILE_EXTENSION`で停止 |
| 修正 | コード・fixture・期待値は変えず、束縛済みTSX実体を通す正式入口へ変更 |

## 2. 実発火の判定基準

`actual_fire=yes` と数えるのは、既存テストが次の両方を満たす場合だけである。

1. 不正入力または不正状態を作り、対象の検査・runner・validatorの拒否枝を実際に起動している。
2. その呼出しが返した違反codeを、同じ文字列でassertまたは観測している。

次は実発火に数えない。

- code一覧の件数・順序・所有表だけを確認する静的検査
- source内にcode文字列があることだけを確認する検査
- `status: rejected`やexit codeだけを確認し、返却された違反codeを確認しない検査
- 呼出し側がcodeを手入力し、failure表示へそのまま渡すだけの検査
- 一つのテストIDに複数の拒否枝があるが、どの枝がどのcodeを返したかを観測していない検査

この基準で、**実発火確認済みは24/36、未発火または返却code未観測は12/36**である。

## 3. 36 codeの実発火対応表

`evidence`は、テストIDの宣言行と返却codeを観測する根拠行を示す。`actual_fire=no`の行へ、設計上の所有IDを代表枝として割り当てていない。

| No. | code | actual_fire | test_id | evidence | 判定根拠 |
|---:|---|:---:|---|---|---|
| 1 | `VERTICAL_PRESET_REGISTRY_INVALID` | yes | R08 | `evals/clip_composition/presentation_vertical_speaker_only_preset_finalization.test.mjs:591,623-626` | 8種類の認定値改変を各々validatorへ渡し、例外codeをassert |
| 2 | `VERTICAL_SCREEN_LAYOUT_VOCABULARY_INVALID` | yes | R02, R03 | `evals/clip_composition/presentation_vertical_speaker_only_preset_finalization.test.mjs:401-407,410-416` | 許可語彙の欠落・余分追加を各々実行し、例外codeをassert |
| 3 | `VERTICAL_SCREEN_LAYOUT_NOT_REGISTERED` | yes | R04, R05 | `evals/clip_composition/presentation_vertical_speaker_only_preset_finalization.test.mjs:419-424,427-432` | 未登録の2画面型を各々解決させ、例外codeをassert |
| 4 | `VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH` | yes | R06, R09 | `evals/clip_composition/presentation_vertical_speaker_only_preset_finalization.test.mjs:500-508,718-744,748-770` | pixel照合改変、3入力binding改変、実processの返却codeを観測 |
| 5 | `VERTICAL_PRESET_TRUST_BINDING_MISMATCH` | yes | R07 | `evals/clip_composition/presentation_vertical_speaker_only_preset_finalization.test.mjs:511,518-524,546-551,578-587` | component path、import graph、trust hashの各改変で例外codeをassert |
| 6 | `DISPLAY_POLICY_BINDING_INVALID` | no | — | — | 一覧・設計文書以外に現行実装の発火箇所がない。S07は`rejected`だけを観測 |
| 7 | `DISPLAY_POLICY_REGISTRY_MISMATCH` | no | — | — | 一覧・設計文書以外に現行実装の発火箇所がない。S08は例外文だけを観測 |
| 8 | `DISPLAY_POLICY_WIDTH_MISMATCH` | no | — | — | 一覧・設計文書以外に現行実装の発火箇所がない。W03はexit 1だけを観測 |
| 9 | `DISPLAY_FORMAT_BINDING_MISMATCH` | no | D02（statusのみ） | `evals/clip_composition/test_presentation_caption_display_pair_v004.mjs:489-493` | 拒否枝は起動するが、返却codeをassertしていないため未観測 |
| 10 | `DISPLAY_PRESET_BINDING_MISMATCH` | no | — | — | 一覧・設計文書以外に現行実装の発火箇所がない。W05は`rejected`だけを観測 |
| 11 | `DISPLAY_SCREEN_LAYOUT_BINDING_MISMATCH` | yes | D03 | `evals/clip_composition/test_presentation_caption_display_pair_v004.mjs:495-500` | packageとcropの画面型不一致を作り、返却codeをassert |
| 12 | `VERTICAL_LAYOUT_DECISION_INVALID` | yes | V02 | `evals/clip_composition/presentation_vertical_review_renderer_v001.test.mjs:161-167` | 必須viewportを欠落させ、返却code配列をassert |
| 13 | `VERTICAL_LAYOUT_INPUT_HASH_MISMATCH` | no | V05（手入力） | `evals/clip_composition/presentation_vertical_review_renderer_v001.test.mjs:184-191` | codeを入力済みのfailureを整形しているだけで、hash不一致検出枝を起動していない |
| 14 | `VERTICAL_LAYOUT_IMPLEMENTATION_HASH_MISMATCH` | yes | V06 | `evals/clip_composition/presentation_vertical_review_renderer_v001.test.mjs:194-205` | screen-layout実装SHAを改変し、返却codeをassert |
| 15 | `VERTICAL_LAYOUT_FILTER_BUILD_FAILED` | yes | V07 | `evals/clip_composition/presentation_vertical_review_renderer_v001.test.mjs:212-220` | 無効なsource幅でcrop filter構築を実行し、返却codeをassert |
| 16 | `VERTICAL_BASE_FORMAT_MISMATCH` | yes | V08 | `evals/clip_composition/presentation_vertical_review_renderer_v001.test.mjs:223-228` | crop後の幅を1079へ改変し、返却codeをassert |
| 17 | `VERTICAL_BASE_FRAME_COUNT_MISMATCH` | yes | V09 | `evals/clip_composition/presentation_vertical_review_renderer_v001.test.mjs:231-236` | 出力frame数を改変し、返却codeをassert |
| 18 | `VERTICAL_BASE_AUDIO_MISMATCH` | yes | V10 | `evals/clip_composition/presentation_vertical_review_renderer_v001.test.mjs:239-244` | 音声packet payload SHAを改変し、返却codeをassert |
| 19 | `VERTICAL_RENDER_TEXT_MODEL_MISMATCH` | yes | V11 | `evals/clip_composition/presentation_vertical_review_renderer_v001.test.mjs:247-254` | B4明示行と文字model入力を不一致にし、返却codeをassert |
| 20 | `VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH` | no | — | — | V15/V16/V18/V19は正常経路・source・symlinkの確認であり、runtime不一致の拒否codeを観測していない |
| 21 | `API_BUDGET_BINDING_INVALID` | yes | W09 | `evals/clip_composition/test_presentation_caption_gate_b5_initial_v002.mjs:288-305` | 幅binding不一致を含むB5実行を行い、通信0回と返却codeをassert |
| 22 | `API_MODEL_OR_PRICE_UNVERIFIED` | yes | C01 | `evals/clip_composition/test_presentation_caption_api_cost_guard_v001.mjs:83-89` | 必須claimを未確認へ変え、返却codeをassert |
| 23 | `API_COUNT_TOKENS_BILLING_UNVERIFIED` | no | — | — | 現行API違反code集合に存在しない旧名 |
| 24 | `API_COUNT_TO_PROMPT_BOUND_UNVERIFIED` | no | — | — | 現行API違反code集合に存在しない旧名 |
| 25 | `API_MAX_OUTPUT_BILLING_BOUND_UNVERIFIED` | no | — | — | 現行API違反code集合に存在しない旧名 |
| 26 | `API_COST_PROBE_INVALID` | yes | C06 | `evals/clip_composition/test_presentation_caption_api_cost_guard_v001.mjs:154-169` | 不正なcountTokens応答をparserへ渡し、返却codeをassert |
| 27 | `API_BUDGET_EXCEEDED_BEFORE_SEND` | yes | C08 | `evals/clip_composition/test_presentation_caption_api_cost_guard_v001.mjs:184-188` | 送信前上限を超える入力token値を導出器へ渡し、返却codeをassert |
| 28 | `API_BUDGET_REQUEST_MISMATCH` | yes | C18 | `evals/clip_composition/test_presentation_caption_gate_b6_job_v002.mjs:520-530` | `candidateCount=2`へ改変し、通信0回と返却codeをassert |
| 29 | `API_TRANSPORT_CONTRACT_VIOLATION` | yes | C12 | `evals/clip_composition/test_presentation_caption_gate_b6_job_v002.mjs:409-416` | 応答外形へ余分keyを加え、raw保存後の返却codeをassert |
| 30 | `API_USAGE_ACCOUNTING_INVALID` | yes | C14, C19 | `evals/clip_composition/test_presentation_caption_gate_b6_job_v002.mjs:441-463,536-542` | usage算術不一致と複数candidateを各々実行し、返却codeをassert |
| 31 | `API_RESPONSE_TIER_MISMATCH` | yes | C16 | `evals/clip_composition/test_presentation_caption_gate_b6_job_v002.mjs:491-497` | 応答tierを`batch`へ変え、返却codeをassert |
| 32 | `SECRET_LEAK_DETECTED` | yes | C13 | `evals/clip_composition/test_presentation_caption_gate_b6_job_v002.mjs:429-435` | API keyを応答へ反射させ、返却codeをassert |
| 33 | `API_USAGE_BUDGET_VIOLATION` | no | C17（status/reasonのみ） | `evals/clip_composition/test_presentation_caption_gate_b6_job_v002.mjs:503-515` | 事後上限超過枝は起動するが、返却codeをassertしていないため未観測 |
| 34 | `B6_DOWNSTREAM_EXECUTION_FAILED` | yes | C21 | `evals/clip_composition/test_presentation_caption_gate_b6_job_v002.mjs:570-582` | child終了2を返し、B6の返却codeをassert |
| 35 | `VERTICAL_RENDER_INPUT_BINDING_MISMATCH` | no | V20（手入力） | `evals/clip_composition/presentation_vertical_review_renderer_v001.test.mjs:343-353` | codeを入力済みのfailure summaryを整形しているだけで、入力不一致検出枝を起動していない |
| 36 | `VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH` | yes | V21 | `evals/clip_composition/presentation_vertical_review_renderer_v001.test.mjs:356-374` | 空の実装bindingをjob validatorへ渡し、返却codeをassert |

## 4. No.23〜25の旧名と現行名

縦型36件一覧のNo.23〜25は旧名のままだが、現行のAPI費用検査実装は「未確認を即拒否」ではなく「人間が受容した残余リスク記録の不一致を拒否」する名称へ変更されている。

現行集合は`evals/clip_composition/presentation_caption_api_cost_guard_v001.mjs:8-24`にある。

| No. | 36件一覧に残る旧名 | 現行実装名 | 現行テストの実発火 |
|---:|---|---|---|
| 23 | `API_COUNT_TOKENS_BILLING_UNVERIFIED` | `API_COUNT_TOKENS_BILLING_RISK_ACCEPTANCE_INVALID` | 未確認。C02は正常受理のみ |
| 24 | `API_COUNT_TO_PROMPT_BOUND_UNVERIFIED` | `API_PROMPT_TOKEN_BOUND_RISK_ACCEPTANCE_INVALID` | C03、C20で実発火 |
| 25 | `API_MAX_OUTPUT_BILLING_BOUND_UNVERIFIED` | `API_OUTPUT_TOKEN_BOUND_RISK_ACCEPTANCE_INVALID` | C04で実発火 |

根拠:

- C02〜C04: `evals/clip_composition/test_presentation_caption_api_cost_guard_v001.mjs:92-130`
- C20: `evals/clip_composition/test_presentation_caption_gate_b6_job_v002.mjs:548-563`

したがって、現行の36件一覧をそのまま使う限り、No.23〜25を現行実装から実発火させることはできない。これは92件の実行合否とは別の、一覧と実装語彙の不一致である。

## 5. 未発火12件の内訳

| 種類 | 件数 | code |
|---|---:|---|
| 一覧・設計文書にだけあり、現行実装の発火箇所がない | 4 | `DISPLAY_POLICY_BINDING_INVALID`, `DISPLAY_POLICY_REGISTRY_MISMATCH`, `DISPLAY_POLICY_WIDTH_MISMATCH`, `DISPLAY_PRESET_BINDING_MISMATCH` |
| 拒否枝はあるが、既存テストが返却codeを観測していない | 3 | `DISPLAY_FORMAT_BINDING_MISMATCH`, `VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH`, `API_USAGE_BUDGET_VIOLATION` |
| codeを手入力した表示整形だけで、検出枝を起動していない | 2 | `VERTICAL_LAYOUT_INPUT_HASH_MISMATCH`, `VERTICAL_RENDER_INPUT_BINDING_MISMATCH` |
| 現行実装から除かれた旧名 | 3 | No.23〜25 |
| 合計 | 12 | — |

## 6. 現時点で言えること

### 事実

- 36件のうち24件には、既存テストで拒否枝を起動し、返却codeを同名で観測した根拠がある。
- 12件には、その根拠がない。
- V14は`PRESENTATION_VERTICAL_RENDER_VIOLATION_CODES.length === 36`を確認するが、現行API集合との名称一致や36件全発火は確認しない。
- 固定Node・固定TSX入口による正式実行は92/92合格し、生TAPへ全ID・合否・所要時間を保存した。

### 未確認

- 未発火12件を現行契約のまま補えるか、一覧または契約の改訂が必要か。

### 推測しない事項

- `status: rejected`だけのテストがどのcodeを返したか。
- 複数の拒否枝を含むテストIDで、観測されていない枝の代表code。
- 旧名No.23〜25を現行名へ読み替えた場合の36件達成扱い。
