# Codex-SSD — J16の汎用製造入力・採否接続の読み取り調査

表示採否→J16製造経路を読み取り調査し、2026-10-11 00:07 JSTに調査を終了。稼働記録開始2026-10-10 23:57:17.151 JST（その前の初動読み取りの正確な秒は未取得）。base main a56a4ed9dca55fde92cbb09cb5abca702ada04ea。69の承認済み個別採否データ保存/再読は前cycleで終了しているが、「汎用製造入力が採否を受理し非表示を適用できる」状態は未完成。今回は実装・候補変更・試験実行・製造・API送信0。コードと候補の実SHA不変を確認し、公式MCP board153/Check61 item20を相談役待ちに戻して稼働欄0を再読。他未完了/削除履歴を保持、次担当mona。

結論：readerへvisibility pathを1個追加するだけでは足りない。既存の承認済み製造jobと入力資格化・採否resolver・低メモリ合成・完成再読を再利用するのが最小の筋。ただしJ16の原本/投影/背景/別音声をその承認済み境界へ接続する改修が要る。旧Normal guardの無条件解除や、採否JSONを任意callerが渡すだけのtrustは提案しない。主変更候補は10path（実装9＋型宣言1）、追加候補2path。実装なしの読み取り段階なので厳密な最少path・許可上限を確定したとはしない。以前の6実装path内だけの軽微修正とは扱わず、入力契約/許可適用範囲を明示して次の着工承認を要する。新しいAI入力/回答形式や監査基盤を先行増設せず、既存candidate/state/visibility-selectionを原本として再利用する。

現在のcandidate-record.jsonは未採用候補の参照束、individual-adoption-record.jsonは本人承認と個別採否の監査データであり、どちらにも正式Digest入力schemaVersionはない。visibility-selection.jsonだけは既存汎用selection schemaに合う。正式Digest adoptionはschemaVersion/mode/bindings/decisions/countsと完全なcue対応を要求するため、この監査recordをschema名だけ付け替えて通さない。既存J16原本を資格化し、正規jobが宣言・承認した同じselectionへ接続する。元のJ16許可はAPI5回と段階候補rootに固定しているので、移動copyを元候補と偽ることやAPI許可を製造許可と解釈することも不可。通常render()のsaved旧stateから新候補を読めたと扱わない。

| 主変更候補 | 最小責務 |
|---|---|
| `runner/src/digest-approved-job-v001.ts` | 既存job/authorizationへ、承認対象のJ16 candidateと採否bindingを明示束縛する入力種別を追加。旧Normalの必須閉包・SHA/サイズ/root/実装/permit/製造許可は保持。入力契約の適用範囲変更として次の明示承認が必要。 |
| `runner/src/digest-approved-inputs-v001.ts` | 既存の資格化・採否readerを再利用。J16原本を再読してCore view/全ID/本文/時計/4接続と採否を照合し、同じvisibility selectionを返す。過去31登録や意味/対応表/clock-mapを架空補完しない。未束縛のcaller配列を信用しない。 |
| `runner/src/digest-approved-job-runner-v001.ts` | 同じqualified storage/現在性/監視/製造recordへ、承認済みJ16 view・背景・別音声の受渡しを接続。resolveCaptionVisibilitySelectionとcompose時の再読/差替え拒否を使う。旧owner/permitを流用しない。 |
| `evals/clip_composition/presentation_j16_staged_boundary_v001.mjs` | source-specific .mtsにある既存stage/candidateの保存再読処理を汎用部へ移して共有する。既存manifest/stateとCoreの原本資格化を使い、素材固定rootやID条件を共通処理へ持ち込まない。新API質問/回答形式や別監査基盤は作らない。 |
| `evals/clip_composition/presentation_j16_staged_boundary_v001.d.mts` | 共有した既存readerと資格化済みview/採否参照の型を明示する。値だけを渡して資格化済みと扱う型の抜け道を作らない。 |
| `evals/clip_composition/run_new_material_digest_20260926_presentation.mts` | 既存CLI/初回段階readerを共有readerへ委譲する互換配線だけ。今回素材専用の非表示条件を足さず、旧saved()を新候補とみなさない。製造実行は共通qualified runner側へ接続する。 |
| `evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts` | 正式file rendererが承認済みcontextからJ16 view/背景/audioを取り出し、既存admission/job/実装/runtime/出力検査を維持してdrawへ渡す。既存Normalルート保持、単なる外部visibility引数への信任はしない。 |
| `evals/clip_composition/render_presentation_v002.mjs` | opaqueなapprovedJobが資格化したJ16 viewだけを受け入れる。Normal-only guardを無条件に外さず、全論理captionのprimary検査を残し、同じ採否resolver→compositor→completionを使う。QC免除や全件目視の追加はしない。 |
| `tools/digest-quality/original-resolution-low-memory-composite.mjs` | 静的Normal/Colorの既存PNG合成と既存show/suppress選別を再利用し、資格化された別AAC入力を元packetのままコピーできるようにする。未承認Pulse/Motionや新効果へ一般化せず、plan/全論理数/選別数/graphの証拠を保持。 |
| `evals/clip_composition/presentation_orchestration_background_v001.mjs` | 既存projection/background照合は使い、qualified SSD output・unused/no-symlink・resource check・監視process observerへ接続する。repo専用output guardの単純削除、無制限外部path許可、黙った一般ROOT変更はしない。 |

| 条件付き追加候補 | 判断点 |
|---|---|
| `evals/clip_composition/adopted_media_manufacturing_v001.mts` | 現状のNormal instruction→rendererJob受渡しだけでJ16 view/背景の束縛を保てない場合、既存Core handoffへ限定配線を追加する。直接drawでCore/owner/admissionを飛ばす代替は不可。 |
| `evals/clip_composition/digest_representative_completion_v001.mjs` | 共通入力資格化の拡張だけで既存pending/get/finalize/完成再読がJ16由来bindingを再検証できるかを確認。schema/pathや保存source束の追加が必要なら限定変更。他の再読/record-finalize pathが必要になったら差分を親へ返し、範囲を無断追加しない。 |

- 入力・許可：既存digest-approved-job-v001.test.ts / digest-approved-inputs-v001.test.ts。J16 source kindでも原本SHA/サイズ/全ID/順序/本文/6frame/原clockと投影clock/4接続/採否bindingが一致。欠落/重複/未承認binding/clock改変/古いauthorization/任意output/mutable sourceは拒否。旧Normalの必須閉包を保持。
- 汎用性：既存openai-decisions-j16-v001.test.ts / presentation_orchestration_v001.test.mjsへ任意の別素材名・ID・文言・区間でも同じ契約を通るfixtureを追加。0.2秒や69への一致条件なし。全表示/nullと1件/複数件/全部非表示の既存動作・全論理記録保持を確認。
- 製造入力→描画→合成：既存run_presentation_instruction_renderer_job_v002.test.mjs / presentation_orchestration_renderer_v001.test.mjs / tools/digest-quality/original-resolution-low-memory-composite.test.mjs。qualified current inputを経由してrendererの同じresolverが採否を取得、全326のprimaryは維持し、実投入overlay/filter graphだけ325となることを準備段階で確認する。採否非受理/null fallback/旧saved状態/差替えを拒否。今回はこの試験自体は未実施。
- 背景/audio/保存境界：既存presentation_orchestration_background_v001.test.mjs / digest-approved-storage-revalidation-v001.test.ts。元projection frame/sample clock、別AACのpacket payload/時刻、SSD/no-symlink/未使用出力/next-unit reserve/再読を確認。音声再encode・延長・時刻補正で通さない。
- 保存・完成再読：既存digest_representative_completion_v001.test.mjs / digest_representative_publication_v001.test.mts / digest-approved-record-finalize-v001.test.ts。pending/get/finalizeで同じ原本/採否/plan/graph/集計を再計算し、旧完成record・採否・合成証拠差替えを拒否。非表示の実画像/動画確認要件は維持。
- 構文/型/差分：変更に対応した既存suite、runner/必要なRemotion型検査、caller strict baseline比較、diff check。既存未合格fixtureやskipは保持し、実行しなかった検査を合格としない。実行対象suiteは実装差分に合わせ、無関係な全件反復を増やさない。

完了条件を分ける。①採否保存（済）：元326を保持したshow325/suppress1のデータが保存再読できる。②今回調査が示す必要な実装完了（未）：汎用の承認済み製造入力が、J16原本・採否・本文/ID/時計/背景/音声・実装SHA/出力root/許可を一致させて受理し、rendererが同じ採否を取得し、全326論理記録/primaryを残したまま合成投入だけ325/非表示1にし、graph/集計と保存再読が一致する。任意素材fixtureで同じ契約を通り、69・文言・秒数に条件分岐を持たない。単に新readerがJSONを読めるだけ、試験が保存fileだけを照合するだけでは②を完了にしない。③実製造・実媒体の非表示成立/可読性/演出品質（未）：別の具体的製造許可後に現物で確認し、代表確認を既存方針どおり行う。②の構造/拒否/準備graph試験を③の品質合格へ変換しない。今は②の実装も未着手。

未実装の概算工数：実装6〜12時間、既存suiteを使う限定検証4〜8時間、記録/監査2〜4時間、合計12〜24時間。Codex実走/CPU/本人active時間の測定値ではなく、読み取りからの作業量見積。全尺媒体処理・本人確認/承認待ち・STT/API・新base再利用機能を含めない。Coreの登録/owner/source-package対応や保存再読の別pathが必要なら、原因と最小差分を親へ返し範囲追加前に止める。10pathを必ず守れる上限、既存5/5設営枠のリセット、費用/製造許可、品質採用の承認にはしない。

コード/設定/採否/原本変更0、検査実行0（上記は必要な将来検査）、媒体/worker/API生成0。調査helper/公式MCPを閉じ、不要物なし削除0B。受領/開始/調査/保存再読証拠はKEEP。既存設営修正累積5/5を保持し、今回修正0。今回report/CURRENT/HANDOVER/new月別logの4docsだけを監査checkpoint commit/通常pushしremote一致/clean/untracked0を確認して返す。映像確認、具体的製造承認、入力契約適用差分の着工判断を相談役へ残す。

根拠は[同じ既存報告](../../reports/openai-decisions-j16-integration-20261008/next-integration-scope-v001.md)の現物path/lineとprivate workspaceのSHA束。
