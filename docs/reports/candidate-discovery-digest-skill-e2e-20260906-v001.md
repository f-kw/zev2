# 候補探索Skillからダイジェスト実動画へのE2E

## 第一完成の結果（2026-09-07 02:39 JST）

**候補探索Skillの新規判断から、3場面・237.6秒の実ダイジェストを生成し、既存Coreのtechnical QCに合格した。** 採用と字幕/Core入力の決定的再構築、採用した発話IDから映像区間への対応、元素材と完成動画のSHAも一致した。完了した検査の現物は下記出力にある。

- [レビュー動画](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/presentation/work-candidate-digest-skill-ymUsGrT6EaA-20260906-v002/render/presentation-rendered-v002.mp4)
- [人間レビューの入口](/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/presentation/work-candidate-digest-skill-ymUsGrT6EaA-20260906-v002/review.md)
- [Drive共有folder（今回の報告・検査証拠・MANIFESTを追加保存）](https://drive.google.com/drive/folders/1sVj-mZU-MXEqLKeaIlI5x2jicvte_C8i)
- 出力root: `evals/clip_composition/outputs/presentation/work-candidate-digest-skill-ymUsGrT6EaA-20260906-v002`
- 完成動画: 1920×1080、30fps、H.264 / AAC、7,128frame、237,600ms、110,090,024bytes。
- 完成動画SHA-256: `fa4733dca128f3ab146c2f8cde3f8b8b6e22586304fa13d34c65cf47f6264df0`。
- 実行manifest SHA-256: `e45785cf67a0b3ed780eeb8df2ebb1b55775d0bb8520d592985578302239e08e`。

第2 Skillは `44db92f52caaf96aca85216f510dcb29590ac831` で技術実証として終了済み。独立実装・既存表示Skillの無変更再利用・validation・決定的昇格・Core接続・技術検査は成功した。追加前後の本文・字幕区切り・表示時刻・完成動画は同一であり、今回素材での可視品質改善は確認できず。第2 Skillの人間A/B比較とHUMAN_DECISIONは撤回し、残していない。

今回の人間未判定事項は、完成したダイジェストの **見どころの妥当性・不要部分・文脈不足・全体として気持ちよく見られるか** の4点だけである。人間評価を代行していない。技術工事の最終AUDIT_ONLYには、本報告・実装・検査証拠を同じcommitで提出する。

## 要求から動画までの実行結果

| 工程 | 確認した処理と結果 | 出力root内の現物 |
| --- | --- | --- |
| 固定planと入力 | 制作要求・素材・Skill・複数の独立した見どころという構成条件・Core接続を固定。候補や採用時刻の事前記入なし。元の10,723本文片から既存方式で束縛された431発話を入力 | `plan-snapshot.json`、`candidate-request.json` |
| 候補探索Skill | 現Codexが全確定発話列を読んで行った新規判断1回から、根拠発話IDと必要文脈IDによる3候補を提案。自由時刻・正式採用・描画値を返さない | `candidate-response.json`、`candidate-result.json` |
| 検査と正式採用 | ID存在・素材所属・順序・根拠包含・文脈全量・重複なし・複数候補を独立executorで検査。検査済み候補を事前許可に束縛して採用し、元素材順へ並べ、元発話位置から区間を解決 | `machine-adoption.json`、`edit-plan.json` |
| 既存Coreの基礎映像製造 | 新しい機械採用正本を専用adapterで検査し、既存v003のframe投影・音声sample配置・映像化・mux・媒体/timeline QCを実行。旧個別人間承認入口は呼んでいない | `core-invocation.json`、`base-media/generation-manifest.json`、`base-media/validation-receipt.json` |
| 既存字幕Skill | 表示区切りSkillを無変更で3回実呼出し。実寸検査が拒否した3表示だけを1回再判断し、全体51表示へ確定。元の693本文片は同一 | `display-1/2/3-request.json`、各response/result、`caption-repair-scope-verification.json` |
| 字幕の正式注文と描画 | 既存の表示終端・行末投影、正式注文書、renderer admission、実レイアウト、描画を通過 | `instruction.json`、`renderer-job.json`、`admission-receipt.json`、`line-layout.json` |
| 最終QC | 51字幕の適用、安全領域、行配置、代表frameでの実反映、映像frame数、音声packetの保持を検査し、全項目合格 | `renderer-result.json` |
| 来歴と同一性 | 採用・字幕・Core入力を再構築して一致。元発話IDから正式区間、製造時の元動画SHA、rendererが使った新しい基礎映像、完成動画SHAまで一致 | `verification.json`、`provenance-verification.json`、`post-cleanup-verification.json` |

候補探索には既存の候補生成promptの編集上の問いを再利用した。発話の集約と元書き起こしへの束縛検査、発話ID集合から正式区間を求める既存の構成処理の下位関数、字幕表示Skill、字幕の正式注文・renderer・QCを再利用した。自由なLLM Planner、巨大registry、sensor一般化、第4 Skillは実装していない。意味まとまりSkillは、この素材で追加実行する責務上の必要がないため通していない。

## 候補選択が実動画内容に反映された根拠

| 採用順 | 共通発話IDの範囲 | 元の正式区間（ms） | 基礎映像の出力frame範囲 |
| --- | --- | --- | --- |
| 1 | 109–115 | 1,268,581–1,287,598 | 0–570 |
| 2 | 174–181 | 1,958,422–2,065,294 | 570–3,776 |
| 3 | 421–424 | 5,917,144–6,028,882 | 3,776–7,128 |

frame範囲は終端を含まない。正式時刻は、モデルが生成した時刻ではなく既存発話の位置から求めた。frameへの丸めと音声配置は現行Coreの規約に従った。

1. 固定planには採用するID集合がなく、新規の候補回答に初めて上記の根拠・文脈IDが現れる。
2. 採用した各文脈の元本文片IDを再列挙し、編集仕様の本文片集合と区間が完全一致することを検証した。
3. 基礎映像の製造記録には、この3区間から得た実際の映像filterと音声のsource/output sample範囲がある。採用正本と編集仕様のSHAも一致する。
4. 字幕rendererの実行入力は、その新しく生成した基礎映像と同一SHAである。完成動画のframe数7,128と、音声packetのSHA保持も最終QCで確認した。
5. 合成入力の拒否・変化検査でも、候補の発話IDを変えると正式区間と映像に使用する発話集合が変わることを確認した。この検査用の回答を実素材の新規判断と数えていない。

以上により、事前に選択済みの映像を表示しただけの実証ではなく、今回の候補選択が映像内容を決めたことを追跡できる。意味品質の合格は主張していない。

## 検証・保存・対象範囲

必要testは **79件合格、失敗0**。新規Skill・採用・配線・同一判断からの復帰20件、既存表示Skillとexecutor13件、字幕/Core24件、基礎映像Core22件。新規Skillのstrict型検査も合格。実走後は既存executorによる正式値再現・元区間対応・SHA照合、独立の来歴照合、3表示だけの修正範囲確認、旧実装7ファイルのGit byte照合、保存した失敗証拠40ファイルのSHA照合を通した。

主な実行コマンド:

```sh
node --import ./runner/node_modules/tsx/dist/loader.mjs --test runner/test/candidate-discovery-v001.test.mts evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.test.mts
node --import ./runner/node_modules/tsx/dist/loader.mjs --test runner/test/caption-display-boundaries-v001.test.mts evals/clip_composition/run_caption_display_skill_e2e_v001.test.mts
node runner/node_modules/typescript/bin/tsc --noEmit --strict --target ES2022 --module NodeNext --skipLibCheck runner/src/skills/candidate-discovery-v001.ts
node --import ./runner/node_modules/tsx/dist/loader.mjs evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts verify evals/clip_composition/outputs/presentation/work-candidate-digest-skill-ymUsGrT6EaA-20260906-v002/manifest.json
```

実走と再開の入口、回答原文、旧実装へのSHA参照、すべての検証結果を保存した。初回の候補request/response/resultは再開後もbyte同一である。実装上の修正2件、設営上の修正2件、表示Skillの回答限定修正1件の経過は下段に記載する。最終QCは現行Coreの51件の全尺比較を省略せず完了した。機械採用を個別候補の人間承認として記録していない。

生成時のGit記録 `664380fbd73378693066d02ea1be84043b1be462` とdirty状態は、その時点の実測値として保持した。初回の実装は同commitのblobと、再開後の実装は固定planのSHAと一致する。過去の失敗記録にある元path/SHAは、`recovery-history-resolution.json` の保存先対応で解決できる。

主な監査資料は `manifest.json`、`audit-evidence.json`、`test-evidence.json`、`process-observation-evidence.json`、`recovery-history-resolution.json`。process観測1,833ファイルは全byteとSHAを一つの証拠へ保存した。今回の完了済みrendererが作った検査用一時映像・scratch・lockと保存済み観測の一時物約5.6GBは整理し、完成動画SHAの不変と正式値再検証の合格を確認した。失敗履歴、基礎映像、完成動画、元素材は保持した。整理記録は `temporary-cleanup-evidence.json` にある。

実装と小さな正本・検査証拠・字幕画像はGitへ保存する。大型の基礎映像と完成動画はローカルにSHA付きで保持し、Driveには完成動画のローカル保存先・SHAと報告・検査証拠を保存する。Git追跡対象から外した媒体の識別は実行manifestにあり、共有先の現在のcommit・動画・報告の対応はDriveのMANIFESTへ同期する。入力の元動画は既存のローカル素材を使用しており、新素材取得は行っていない。

モデルAPI通信・新provider・追加API費用・新素材取得・Goal/DECISIONS改訂・renderer/style規約変更は行っていない。開始時から存在した別作業13pathはbyte不変を確認し、今回のcommit対象から除外する。

以下は着工判断・実装・失敗修正の履歴であり、現在の完了状態は上段のとおりである。

## 最新指示：ZEV進行管理２ 指示-001

2026-09-06、同じEdge会話で監査checkpoint `bafcfbfa11751c59d7ef98417902d3284060b0e8` とDrive報告を提示し、生成完了した `decision: continue` を確認した。現在モデルInstantを維持し、再送なし。

相談役は、旧v003の個別人間承認入口を変更せず、今回の事前許可から生じる候補を専用の機械採用正本として保持し、専用adapterから既存の決定的製造関数へ接続する案は今回の着工範囲とarchitectureに収まると判断した。機械採用を旧人間承認型へ変換する、旧validatorを緩和する、個別人間承認と同等扱いする場合は契約変更の境界となるため禁止。

以後の対応指示番号は **ZEV進行管理２ 指示-001**。固定planに候補を事前記入せず、既存431発話から新規に候補と必要文脈IDを提案する。検査済み候補だけから採用し、正式区間・尺・元素材順は決定的に解決する。採用正本は事前許可、plan、入力artifact、Skill result、検査結果へSHAで束縛し、名称・schema・provenanceで個別人間承認と区別する。表示Skillを無変更で実呼出しし、既存Core・描画・QC、実ダイジェスト1本、来歴、test、commit/push、Drive/MANIFEST同期、AUDIT_ONLYまで同じ工事を続行する。人間品質評価は完成後の4項目だけとする。

## 着工時の確認と接続判断の履歴

2026-09-06「ZEV進行管理２」経由のkawafmm承認済み続行指示に基づく。目的は、既存素材の確定発話列から候補探索Skillが新しく見どころを提案し、固定planと決定的executorが検査・採用し、既存字幕Skill・Core・実動画・technical QCへ通すこと。調査で完了にせず、接続上の判断を解決して同じ着工範囲で第一完成まで続行する。

第2 Skillは `44db92f52caaf96aca85216f510dcb29590ac831` で結果を正式記録・push済み。独立実装、表示Skillの無変更再利用、検査・昇格・Core接続、技術検査は成功。本文・字幕区切り・表示時刻・完成動画は同一で、今回素材での可視品質改善は確認できず。人間A/B比較を撤回し、HUMAN_DECISIONを残さず技術実証として閉じた。Driveの同一report・review・MANIFESTも更新し、取得byteとの一致を確認した。

ダイジェスト側は既存処理の現物調査と接続検査まで。新規Skill判断、採用、描画、品質合格をまだ主張しない。

## 再利用する既存処理と制約

| 対象 | 現物から確認した処理・制約 |
| --- | --- |
| `evals/clip_composition/prompts/theme_generation_prompt_v002.md` | 書き起こしから、導入・展開・反応・結論を持つ具体的な見どころを探し、根拠発話を示す既存の問い。今回もこの編集基準を包み、自由時刻を返す部分は使わず既存発話IDに限定する |
| `runner/src/steps/theme-options.ts` | 書き起こしからの決定的な先頭抽出は存在するが、新しい意味判断の代用にはならない |
| `runner/src/distant-connection-common-utterance-artifact-v001.ts` | 既存の発話集約、元本文・元発話ID・順序・時刻・SHAの検査を再利用できる。新しい集約係数を設けない |
| `runner/src/steps/composition.ts` | 選んだ発話IDから構成区間を解決する既存処理。Skillの自由時刻生成は不要 |
| `runner/src/distant-connection-edit-plan-projection-v001.ts` | 遠方接続の2場面と旧判断来歴に限定されるため、新しいダイジェスト判断をこの形式の過去判断と偽って接続しない |
| `runner/src/skills/caption-display-boundaries-v001.ts` | 採用後の確定本文から表示終端・行末を選ぶ既存Skillを無変更で呼び出せる。意味まとまりSkillは必要性がない限り呼ばない |
| `evals/clip_composition/presentation_instruction_artifact_v002.mjs` | 確定本文片の列から表示の正式注文書を作る既存Core。字幕の対象containerと全文被覆の対応を保持する必要がある |
| `evals/clip_composition/presentation_base_media_build_v003.mjs` | 現行の映像区間化、音声sample grid、mux、媒体検査、timeline QCを再利用できる。ただし公開job入口の採用記録は、具体的区間を含むpayloadのSHAに束縛した人間承認だけを受理する |
| `evals/clip_composition/run_presentation_output_base_media_job_v001.mjs` | 専用の入力検査の後で既存の映像・音声製造関数を呼ぶ構成は既にある。ただし旧意味境界・保持atomの来歴に束縛されており、今回の新しい候補判断を旧B5/B6の検査証拠として流用できない |
| `evals/clip_composition/presentation_timeline_composition_decision_v001.mjs` | 承認範囲内の機械記録という区分が存在する。これを具体的区間の人間確認済みと同一視しない |

素材候補は既存の `ymUsGrT6EaA`。元動画は `evals/clip_composition/outputs/work-distant-connection-real-input-preparation-ymUsGrT6EaA-v001/source/ymUsGrT6EaA.mp4`。確定書き起こしは `evals/clip_composition/stt/ymUsGrT6EaA_local30_v001/source/transcript.json`、SHA-256は `28938e70d267c617a50568f2782c541c9d6814eda7537349fefae1b45053960f`。既存の共通発話artifactは `evals/clip_composition/outputs/work-distant-connection-comparison-input-ymUsGrT6EaA-v001/common-utterance-artifact-v001.json` で、元の10,723本文片を431発話に束縛している。既に選ばれた2場面だけを入力にせず、この全確定発話列から新しく候補を判断する。動画解析をCodexで代行せず、今回の問いは許可された確定発話列の意味判断に限定する。

## 解決済みGPT_DECISION：固定planの採用と既存Coreの接続

### 依頼する判断

今回の指示にある「固定plan / 決定的executorによる採用」と、architecture第4・9・10・11節の承認責務を、次の最小形で満たせるかを判断してほしい。特に、既存の個別区間人間承認形式を偽装せず、今回の事前許可に束縛した採用記録から既存Coreの製造関数を再利用する専用adapterが着工範囲に適合するかが判断点である。

### 推奨する最小形

1. 固定planは「内容上重要または見どころになる複数箇所を短いダイジェストにする」という承認済み要求、既存素材・確定発話列、候補探索と表示区切りSkill、API禁止、既存出力規約を固定する。候補ID・採用区間を事前に埋めない。独自の候補数上限、尺上限、係数を設けず、今回許可された構成条件を使用する。
2. 候補探索Skillは現Codexのローカル新規判断で、既存の発話IDによる見どころの根拠と、必要な文脈を含む連続発話範囲を提案する。時刻、最終順、採用済み印、renderer値を返さない。
3. 独立validatorはID存在・素材所属・順序・区間被覆・根拠包含・重複/重なりなしを検査する。固定planの構成条件を満たす検査済み候補をexecutorが採用し、元素材順に並べる。必要な前後範囲は提案された文脈ID列を検査して決定し、時刻は元発話の正式位置からのみ解決する。候補数は採用集合の件数、最終尺は正式区間と既存frame投影から決まる。Skill resultを直接正式値にしない。
4. 採用正本は、今回の事前許可・固定plan・入力・新規Skill result・検査結果へSHAで束縛した機械による昇格として記録する。人間が具体的候補を目視済み、個別区間payloadを承認済みとは記録しない。意味の妥当性をvalidatorが合格にしたとも主張しない。
5. 専用adapterはこの採用正本と正式区間を厳格に検査してから、現行v003の既存映像区間化・音声配置・mux・媒体/timeline QCを呼ぶ。旧入口の人間承認validatorは変更しない。旧承認形式の偽造や旧B5/B6の来歴偽装をしない。もしこの新しい入力接続自体が契約変更に当たり着工範囲外なら、代案を勝手に実装せず、この一点を明示してほしい。
6. 採用した本文片・発話ID・timelineの対応を保持した字幕入力を作り、表示区切りSkillを無変更で実呼出しする。既存の正式時刻投影・注文書・renderer admission・実レイアウト・描画・technical QCを通す。必要なschema対応を偽装せず、接続が閉じないときは原因を検査する。
7. 採用範囲・元動画SHA・編集仕様・基礎映像・字幕・完成動画を一つの来歴記録で追跡し、候補の選択が実際の映像内容に反映されたことを検証する。比較のための無意味な別動画は作らない。人間には完成したダイジェストの見どころ妥当性、不要部分、文脈不足、全体の見やすさだけを依頼する。

第1層事項を相談役承認で変更してよいかを求めるものではない。今回の明示的着工指示と現行architectureの範囲内で上記接続が成立するかを先にGPT_DECISIONとする。通常の実装・test・renderer配線修正は、回答後も同じ着工範囲で自律的に進める。

## 接続判断checkpoint時点の検証（履歴）

- 既存の共通発話validatorを実際の書き起こしbyteへ適用し、431発話・10,723本文片のID、順序、本文、正式時刻、元書き起こしSHA、決定的再構築との一致を確認した。
- 第2 Skillの既存executorによる由来・正式値再現・完成動画SHA再照合は合格。実行当時のmanifestにある未判定欄は履歴として保持し、現在のHUMAN_DECISIONと扱わない。
- 現行v003の採用記録validatorを描画なしで直接呼び、機械記録区分を与えると承認不適合だけで拒否されることを確認した。これは期待どおりの契約拒否であり、緩和する根拠にしない。合成検査payloadはメモリ上のみで、承認recordや成果物として保存・実行していない。
- 第3 Skillの実装・新規判断・実動画・technical QCは未実行。今回のcheckpointは第2 Skill終了とダイジェスト接続判断の現物を固定するための監査資料であり、第一完成ではない。
- API、新provider、新素材、Goal/DECISIONS変更、第4 Skill、renderer/style規約変更は0件。作業開始前からの別作業13pathを変更・commit対象にしない。

## 新規候補判断・実装checkpoint

新規Skill・採用・字幕接続の19件、既存表示Skillとexecutorの13件、既存注文書・字幕投影・行組み・renderer admissionの24件、既存基礎映像v003の22件、Skill strict型検査が合格した。合成入力による配線検査は実素材の新規判断と区別する。

現Codexが全431発話を新しく読み、覗く相手への反応、急加速して捕まる場面、カメラワークと時間差の怖さの振り返りの3候補を提案した。ID存在・所属・根拠包含・文脈・重複・正式位置の検査と機械採用、編集仕様生成まで合格。元発話位置から解決した区間は1,268,581–1,287,598ms、1,958,422–2,065,294ms、5,917,144–6,028,882ms。候補探索の入力には時刻を渡していない。

事前検査では3.5GB元動画を一括読み込みするSHA関数の選択誤りを、既存のストリーミング検査への接続に限定して修正した。入力端末では長文JSONが行長制限で途切れたため、未送信bufferを消して当該専用端末の行長制限とエコーを解除し、同一回答を送信した。これを新しい意味判断とは数えない。

初回実行は採用後、直接CLIの最上位awaitと動的に読み込むadapterの相互依存により終了code13となった。元の候補request・response・result・採用・編集仕様・failureを出力v001へ保持した。基礎映像生成・描画は未実行。実行入口を修正し、元入力と回答の同一性を検査して同じ候補判断から後続工程を再開する。旧結果を新規判断と称すること、候補の再選択、既存人間承認validatorの変更はしない。

初回判断の実装・固定plan・全判断byte・失敗地点は `664380fb` の監査checkpointへ保存し、pushした。入口修正後は最上位module評価とCLIの非同期実行を分ける。再開用plan v002は元plan・request・response・result・失敗記録をSHAで参照し、素材・制作要求・Skill・採用規則・意味判断実装が不変であること、元の入力と回答がbyte同一であることを検査する。旧planを新規実行形式として受理する後方互換分岐は置かず、履歴の証拠としてだけ読む。

再開用planの事前検査は合格。再開時の同一候補判断の維持と、回答差し替え拒否を加えた新規20件も合格。既存の表示13件・字幕/Core24件・基礎映像22件を合わせて79件合格である。初回の一括読み込み選択とCLI循環依存の実装修正は2件、端末入力の設営修正は1件。追加の意味判断は0回。別作業13pathのSHAも不変を確認した。

今回の専用接続は、機械採用正本をその新schemaのまま保持する。既存の製造値形式と製造manifestへは、実際に用いた区間・source・Core関数・実行command・観測値を投影するだけで、旧人間承認入口へ送らない。製造manifestの許可参照は今回の固定plan実行許可を指し、個別候補目視を主張しない。専用の接続記録と検査receiptが、旧人間承認入口を呼んでいない事実と、個別候補人間承認未実施を明示する。


## 描画前検査と限定修正の経過

基礎映像は既存v003の元映像検査、正式区間のframe投影、音声sample grid、映像・音声製造、mux、媒体検査、timeline QC、SHA graphを通過し、3区間・7,128frame・237.6秒を生成した。元映像は60fps、370,924frame。元動画と書き起こしは既存repository素材のみを使った。

採用後の確定本文693片について、無変更の字幕表示区切りSkillを3場面で実呼出しした。初回は48表示。意味まとまりSkillは形式実績のためには呼ばず、候補文脈内の確定本文をそのまま表示Skillへ渡した。

最初のrenderer実行は、検査ツールtsxの内部socketがsandboxに拒否され、実レイアウト結果を取得できず終了した。今回生成した失敗記録・lock・作業一時物を同じ出力folder内の `failed-renderer-attempt-v001` へbyte/SHA一致を確認して保存し、同じ候補・字幕・Core入力を決定的に再構築した上で、環境許可を得た実行で同一jobを再検査した。これは設営修正の2件目であり、意味判断の変更ではない。

環境拒否の解消後、実寸検査が3字幕の安全領域超過を正しく拒否した。本文上の論理幅36以内でも、現在のfont・装飾を描画した幅が右側安全領域を16px超えた。既存のfont・style・規約・validatorを変更せず、該当3表示を既存表示Skillで再判断した。「しかも」「いやカメラワークと」「なんかやっぱさ」を接続・導入の意味で区切り、元の27終端・行末をすべて保持しながら3終端を追加した。第3場面は30表示、全体は51表示となった。他の表示判断、本文、候補、区間は同一である。修正前のCore入力・回答・不合格結果も `failed-layout-attempt-v001` に保存した。

修正後の実寸検査は合格。全字幕の実描画と文字領域検査を進行中。この時点では完成動画と最終QCの合格をまだ主張しない。

実装修正は2件、設営修正は2件、既存表示Skillの実測拒否に応じた回答の限定修正は1件。新規候補判断は全工事で1回、表示判断は初回3回と限定修正1回。API通信・費用・新素材・人間品質評価は行っていない。


## Drive共有の保存方法

既存報告の同一ID更新は、自動承認レビューが「既存snapshotを上書きしない制約に反する」として拒否した。このため、同じ共有folderへ今回の報告・レビュー入口・実行manifest・監査証拠・動画の保存先/SHA・共有MANIFESTを新しいファイルとして追加する。既存Driveファイルの内容・ID・配置を変更しない。今回のcommitと新しい共有ファイルの対応は、追加する共有MANIFESTの先頭に記載する。技術成果・動画・検査結果はこの保存方法の変更によって変わらない。

動画本体のDrive送信も、自動承認レビューが「動画本体の外部共有は明示承認されておらず、ローカルpathとSHAの報告が許可されている」として拒否した。動画本体は外部送信せず、このPC上の完成動画を人間レビューの主導線とする。Drive側には保存先・SHA・媒体情報を含む実行manifestと監査証拠を共有する。この方法で実動画の提示と監査資料の共有を完了し、動画送信の追加承認は要求しない。
