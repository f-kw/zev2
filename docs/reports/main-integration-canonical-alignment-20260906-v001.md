# main統合・正本整合工事報告 — 2026-09-06 v001

## 1. 工事の目的と位置づけ

「ZEV進行管理２」経由のkawafmm承認済み統合・正本整合指示に基づき、並行して進んだPC側mainとGitHub mainの履歴を統合し、GitHub mainを共有正本へ一本化する。A/B較正終了後の現在地を同期し、同じ現物を監査できる状態にする。本書は副線の工事・調査報告であり、製品方針、Goal定義、契約、work-orderの新設や承認を代替しない。

製品の目的は「見たものが気持ちいい動画を作る」。Gemini候補動画理解A/B較正は終了し、共通後段は不採用、映像固有情報の限定観測だけを将来候補として残す。次の主線は安定したSkillから固定plan・決定的executorを通してレビューし、必要ならplanを変更する構成である。本工事では次に実装するSkillを選定せず、新Skillを実装しない。

## 2. 統合前のGit状態と統合方法

| 項目 | 値 |
| --- | --- |
| repository | `f-kw/zev2` |
| branch | `main` |
| PC側 main | `6701a8e238e5cd9b154c09618c50cd57c8d16d90` |
| GitHub main | `694fc032e00b7d520639457fdc055b520f24c539` |
| 共通祖先 | `5acd231fa3bf4dc480ee7065b97a93b7e46947b7` |
| 分岐後のcommit数 | PC側10、GitHub側3 |
| 方法 | remoteを取得し、PC側main上で両親を持つ通常のmerge commitを作成。rebase・squash・force pushは使用しない |

`git fetch --no-tags origin`でGitHubの現物を取得し、`git merge --no-ff --no-commit origin/main`で統合を準備した。共通祖先と両HEADを照合してから、両分岐のcommitをそのまま祖先として保持する。統合に必要な文書更新と保存済み証拠の追加も監査checkpointに含める。pushは通常の`git push origin main`だけを用い、完了時にPC側mainとremote mainの同一HEADを確認する。

### PC側 main の10commit

| commit | 内容 |
| --- | --- |
| `4c3038a620dcb5ddbc27918f047070f5a262fc81` | docs(goal): Gemini長尺動画探索の主線へ同期 |
| `f8260db559e0c0b4352cfeb5e6d1787f04bb9bfa` | feat(candidate-discovery): Gemini長尺動画の保存応答を正式検証 |
| `39d84faa2f17ccfc750bf014596351f3a89b6772` | docs(goal): 候補発見後のGemini動画理解へ主線を切り替える |
| `fb7b1951c6c182fb57f2f18eaee291c43a1fe01a` | docs(design): 候補発見後のGemini動画理解を共通後段として設計する |
| `0707e1394f9f736b5cce3d8bc7d1fcb75bc7801e` | feat(video-understanding): 候補動画理解契約と5本のPTS投影を固定 |
| `3a5fc9376c8e69eb36cc95cae63fd8373fe1283f` | feat(video-understanding): 比較実験計画v002と候補動画理解の設計正本を固定 |
| `85d939c7b8958234ec367d2676215ac17a690648` | docs(architecture): agent・skillsによるZEV完成形を固定 |
| `bd36d5b82db78d68ef8b047bc8fe2e462f279b0f` | feat(video-understanding): 較正用探索動画5本と実PTS対応を固定 |
| `70c4d5aa2a303273aac025b3be718f8282cd4289` | Prepare candidate video understanding without live API calls |
| `6701a8e238e5cd9b154c09618c50cd57c8d16d90` | docs(agents): 目的の正本参照と必要時の人間操作依頼を明確化 |

### GitHub main の3commit

| commit | 内容 |
| --- | --- |
| `104a8ce403c13bc8ddaa21ea1908c609db24154d` | docs: add advisor ZEV policy for 2026-09-06 |
| `07ac9de06443f1f821cb2488a19f81c360fcdeae` | docs: add Codex-ChatGPT audit protocol |
| `694fc032e00b7d520639457fdc055b520f24c539` | ops: adopt Codex-ChatGPT audit protocol |

## 3. conflictと文書間の意味の整合

### 3.1 Gitのconflict

Gitの未解決conflictは0件。AGENTS.mdは両方の追記を自動mergeできたが、その結果を内容で照合した。architecture参照、9月6日監査プロトコル参照、監査checkpointの限定commit/push権限、従来の第1層判断・承認・停止規則が残っていることを確認する。片側採用による解消は行っていない。

### 3.2 9月6日方針と9月4日architecture

上位は`相談役/方針/2026-09-06_ZEV_方針整理.md`、詳細は`docs/architecture/ZEV_AGENT_SKILL_ARCHITECTURE_v001.md`として双方を保持する。9月6日方針の原文は変更しない。architectureの変更は、上位文書の参照関係、製品範囲、較正終了後の現在地、旧移行案の位置づけに限定する。

| 論点 | 現物にある記述・差 | 今回の扱い |
| --- | --- | --- |
| 製品範囲 | 9月4日architectureの目的と製品完成に切り抜き中心の旧Goal参照が残る。9月6日方針は汎用動画生成基盤 | 今回の明示指示どおり上位方針を参照し、旧関門との対応は履歴・未決の適用範囲として残す。Goal定義本文は変更しない |
| Geminiの現在地 | architecture §15・Phase 4は「現在進行中」「較正後validation」、実装状況はAPI実走・比較を未完了とする | 終了記録どおりA/B較正終了・共通後段不採用へ同期する。旧一般化条件は制定時の検討条件として保持し、続行予定としない |
| 最小試作と製品第一完成 | 詳細設計は通常候補一件の責務分離試作、上位方針はダイジェストと遠方接続の2系統E2E | 試作と製品第一完成は対象が異なる。試作で製品完成を代替しない。次のSkill着工は今回決めず相談役監査へ戻す |
| Plannerの採否・組合せ・範囲・尺の判断と正式値 | 上位方針はPlannerが編集仕様を確定する役割、詳細設計は検査済みSkill結果、人間承認、決定的昇格から正式値を作る制約 | 役割と正式化手順として併存する。Plannerの判断を、正式時刻・発話・契約値の自由記述権限へ拡大しない |
| 編集仕様と薄い実行封印 | 上位方針は編集仕様をCoreへ渡す。詳細設計はZEVG/ZEVOの別正本とSHAで結ぶ薄い実行封印 | 上位の処理順だけを根拠に、両正本を巨大JSONへ集積しない。封印と決定的投影・製造を維持する |
| Skill追加による成長 | 上位方針はSkill追加・強化を基本とする。詳細設計は現在の出力契約とrendererが表現できない能力は別拡張が必要 | 基本的な成長モデルと能力限界は併存する。新しい画面効果や音声加工をSkill登録だけで実現済みとしない |

上記の明確な時点差は今回の明示指示で処理できる。独断で新しい契約・昇格規則・採否基準を作らない。解決不能な既存文書同士の内容衝突として別途GPT_DECISIONを要する事項は、今回の照合では確認しなかった。Goal改訂は別のHUMAN_DECISIONとして§7に残す。

## 4. 未commitのA/B終了記録と証拠の採否

終了記録の原文を作り直さず、開始時のPC作業ツリーと同一byteで正式保存する。直接参照4件に加え、実行計画がpathとSHAで参照する通信記録1件までを保存する。これで新規保存は終了記録を含む6件となる。raw応答、固定入力、usage、既存人間評価、実行記録を再生成・再評価していない。

| 保存したrepository path | bytes | 保存前後共通の内容SHA-256 |
| --- | ---: | --- |
| `docs/ZEV_候補動画理解_AB較正終了記録_v001.md` | 22447 | `13391f2c0f4cb743e6717647386128231e531c7dea3ceffb01656349a3eadf75` |
| `evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/stage1-communication-record-v001.jsonl` | 179475 | `680b4800fb208523ffe9f7ba59d57c69579d2ddf181e89daf342c69c3995bb61` |
| `evals/clip_composition/outputs/work-candidate-video-understanding-recalibration-v001/execution-plan-v001.json` | 2589 | `7ea7f87550363b98ff49c98d503e98060dcac70972dc5e0820e412f9ffec47b7` |
| `evals/clip_composition/outputs/work-candidate-video-understanding-recalibration-v001/execution-record-v001.jsonl` | 4329602 | `115b4c4398cb2a967d13608e16c1f4e3dec89500cfff3762715cc9096ee24ca8` |
| `evals/clip_composition/outputs/work-candidate-video-understanding-recalibration-v001/execution-record-v002.jsonl` | 4333255 | `1c1b029f1825d21fdeacba9a11a6bdd7bcd7a8431ef9f5bef603265ae1fb79a0` |
| `evals/clip_composition/outputs/work-candidate-video-understanding-recalibration-v001/input-id-table-v001.json` | 556169 | `7243419b0906b741f4d434c78ba47bb9e39b4d1aca9d88de8e4c2765032b6a53` |

終了記録から、4096版・8192版の実行記録、固定入力表、実行計画へ辿れる。raw応答とusageは保存済み実行記録の内部にあり、新しい分割ファイルへ書き換えない。実行計画からは元の通信記録を内容SHAで照合できる。保存済み3実行記録の全271行について連鎖SHAを検証し、埋め込みraw応答50件・合計365,156 bytesの内容SHAとbyte数が一致した。実行計画に束縛された固定入力表と元通信記録の内容SHAも一致した。これは保存証拠の同一性検査であり、拒否されたモデル応答を正式観測へ昇格する検査ではない。

次の未commitファイルは、今回の終了記録と現行architectureから正式に参照される保存依存に含まれないため、この工事のcommitには入れない。内容の採否や削除は決めず、PC作業ツリーの現物をそのまま保持する。

- `docs/ZEV_候補動画理解_ID参照再較正計画_v001.md`
- `docs/ZEV_候補動画理解_v1_較正結果_v001.md`
- `docs/reports/candidate-video-understanding-numeric-time-calibration-summary-v001.md`
- `evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/item-0001-inference-record-v001.jsonl`
- `evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/item-0001-local-revalidation-v001.json`
- `evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/item-0005-inference-record-v001.jsonl`
- `evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/remaining-four-inference-record-v001.jsonl`
- `evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/remaining-three-inference-record-v001.jsonl`
- `evals/clip_composition/outputs/work-candidate-video-understanding-api-preparation-v001/stage1-measurement-v001.json`

工事開始前から変更されていた次の実装・test 4件も、本工事の変更ではなく、今回のcommit対象から除外する。開始時の内容SHAと工事後の内容SHAを照合し、改変・破棄していないことを確認する。

- `runner/src/candidate-video-understanding-transport-v001.test.ts`（SHA-256: `038b3b23f294590aeb6e9e2ef22b6b0b4ce3db94243e25f23c2027a747b759f2`）
- `runner/src/candidate-video-understanding-transport-v001.ts`（SHA-256: `dfceab4619d77b1611ffa9573e0053d59cde29ca658ebf059e0ae7fc08a450cc`）
- `runner/src/candidate-video-understanding-v001.test.ts`（SHA-256: `3bde6ca28bae5e97a433c772332aa5d5c6ec14fdce86881e072d215d802cb541`）
- `runner/src/candidate-video-understanding-v001.ts`（SHA-256: `2c04253e2f4d15738b5d27906c6a788226381d7c33aad4d4ff4dea99e621d833`）

今回必要な変更はcommitする。「全変更」は本工事に属する文書整合と保存証拠を指し、既存の別作業まで一括commitして見かけ上cleanにする扱いはしない。これらの残存は両mainのcommit分岐を意味しないが、後続の作業で作業ツリーの現物と共有HEADを混同しないため、ここに明示する。

## 5. CURRENT_GOALの同期

- 目的を「見たものが気持ちいい動画を作る」とし、ショート専用ではない汎用動画生成基盤を明記した。
- Gemini候補動画理解A/B較正終了、候補理解・区間化・映像適性確認をまとめた共通後段不採用、限定的な映像固有情報の観測だけを将来候補とする現在地へ同期した。
- 主線をZEV本体のSkill構造へ戻し、安定したSkill → 固定plan / 決定的executor → レビュー → 必要ならplan変更を明記した。
- どのSkillから再開するかは統合後の「ZEV進行管理２」の監査で決定する。この工事内では新Skill実装へ進まない。
- 新Skill、Gemini追加較正、API実走、新素材、有料推論、自由なPlanner agent、巨大registry、一般基盤先行、Goalの独断改訂、tag等を対象外にした。
- 古いpush禁止は今回の承認範囲に同期し、履歴統合・commit/push・Drive更新・監査依頼を今回の作業として明記した。
- 更新経路と報告方法を今回の相談役経由の明示指示および監査プロトコルへ揃えた。新しい承認行をDECISIONS.mdへ追加していない。

## 6. AGENTSの統合

GitHub側の監査プロトコル節と監査checkpointの限定権限を保持し、PC側のarchitecture参照と必要時だけ人間操作を依頼する規則を保持した。さらに目的節で9月6日方針を上位、architectureを詳細、CURRENT_GOALを現在地として参照する。旧Goal定義の適用範囲・改訂が第1層判断待ちであることを明示し、そのまま最新上位目標と扱う不整合を除いた。監査プロトコルの原文は変更していない。

既存の七工程・型付き依頼・ファイル参照・人間承認は既存実装の説明として保持する。上位方針や較正終了記録を根拠に既存工程を削除・置換したり、Geminiを正式な共通後段として再採用したりしない。

## 7. GOAL_DEFINITION v3.6の不整合とHUMAN_DECISION

### 7.1 現在方針と一致しない箇所・適用範囲が不足する箇所

| v3.6の箇所 | 現在方針との関係 | 必要な扱い |
| --- | --- | --- |
| §1・§2の文書位置づけと最終目標 | 製品全体を毎配信の切り抜き出力で定義している。上位方針は汎用動画生成基盤 | 汎用の上位目標と、切り抜き用途で使う既存目標を区別する必要がある |
| §3「選択の質が現在の主戦場」 | 現在はGemini較正を終え、Skill構造と共通製造の主線へ戻る | 過去の主戦場を現在の着工順にしない |
| §5第一・第二関門の終点 | 編集指示の保存までで、動画の書き出しを含めない。9月6日第一完成は2系統の完成動画まで | 旧関門の通過だけで現在の製品第一完成とは判定できない |
| §5・§8の上位5候補、公開3〜5本、合計10分程度、再現率6割 | 1配信の実在切り抜きと対応する単位。ダイジェストと遠方接続の共通E2E全体の採否単位は定まっていない | 数値を独断で変更せず、残す用途・追加する評価単位を第1層で決める必要がある |
| §2の「バズは物差しにしない」と9月6日§6の「バズを狙えるショート」 | 評価指標と品質上の狙いの違いであり、直ちに同じ意味の衝突とは言えない | バズを新しい数値関門にするとは解釈しない。指標を変えるなら第1層判断を要する |
| §8のGoal改訂時の同時更新手続き | Goal定義はDECISIONSへの同時記録を求めるが、現行AGENTSでは明示指示なしの記録追加と承認行追加を禁止 | 将来の改訂指示で必要な記録を具体化する。今回DECISIONS・HANDOVER・Goal定義を変更しない |

### 7.2 現在も維持できる原則

意味判断と描画の責務分離、実績や正解をモデル出力へ寄せないこと、人間による最終品質・正解認定、初見データと開発データの区別、生成系統と版の保存、原因を分離した品質観測、強制された修正と人間が自発的に行う編集の区別、無断の係数・重み付けを作らないことは上位方針と両立する。既存の切り抜き評価へは従来の数値・手続きが保存されている。ただし、これらを新しいダイジェスト・遠方接続の正式関門へ転用したとの承認にはしない。

### 7.3 最小改訂で整合するか

参照関係を明示するだけなら、今回のAGENTS・CURRENT_GOAL・architectureの同期で旧Goalを最新上位目標と誤認することを防げる。しかし、2系統の完成動画を何で合格にするか、共通構造の成立をどの現物で証明するか、旧関門をどの用途に残すかは、見出しや一文の置換では確定しない。製品範囲と完成判定の改訂が必要になる。

新しいファイルを増やすこと自体は必須ではない。既存GOAL_DEFINITIONを改訂して「上位目標・2系統E2E・用途別関門」を区別する案と、上位定義を別文書にし旧関門を用途限定で残す案がある。どちらを正式に採用するかと各関門の意味・数値は本工事では決めない。

### 7.4 HUMAN_DECISION — 後続のGoal整合に必要な判断

kawafmmに必要な判断は、汎用動画生成基盤の第一完成に対し、旧v3.6の関門をどの用途に残し、ダイジェスト・遠方接続2系統の完成動画の合格条件をどこへ定義するか、である。既存GOAL_DEFINITIONの改訂か、新しい上位Goal定義と用途別関門への分離かを決める。これはGoalそのものの変更であり、今回正式化していない。本工事の履歴統合・保存・監査依頼を止める条件にはしない。

## 8. test・検証結果

commit対象のindexから隔離した検証用コピーを作り、別作業の未commit実装4件を含めず検証した。既存の元動画1件だけは、ローカルにある同じ現物を読み取り参照した。新しい素材取得、応答再生成、fixture値の変更は行っていない。依存パッケージは既存のインストールを使い、pnpm 10.28.0で実行した。

| 検査 | 結果と意味 |
| --- | --- |
| `corepack pnpm type-check` | 合格。shared、backend、client、runnerの型検査が完了 |
| 候補動画理解の既存test 2本 | 合格。`node --import tsx --test src/candidate-video-understanding-v001.test.ts src/candidate-video-understanding-transport-v001.test.ts`。341 assertion、PTS等の回帰71 check、通信準備49 checkを各スイートで確認。実API通信0、動画生成0 |
| `corepack pnpm test`のUI契約 | 合格 |
| `corepack pnpm test`のWeb Geminiレビュースクリプト | ローカルのmockサーバーを使って合格。Web Geminiへの実送信なし |
| `corepack pnpm test`の全体シナリオ | 未完走。固定入力 `runtime/artifacts/draft_w4Lp9IJC6pQl3FsRfFL9t/transcript.json` が存在せず、固定STT処理の読込みでENOENT。全体テスト成功とは報告しない |
| 保存済み証拠の同一性 | 6ファイルの開始時SHA一致、3記録全271行の連鎖SHA一致、埋め込み応答50件の内容SHA・byte数一致、固定入力・元通信記録の束縛一致 |
| 文書参照 | 編集した文書と工事報告のrepository参照先が存在することを確認 |
| 原文保持 | GOAL_DEFINITION・DECISIONSはPC側開始HEADと同一byte、9月6日方針・監査プロトコルはGitHub側開始HEADと同一byte |
| 工事外の現物保持 | 開始時の未commit資料15件と変更実装4件、計19件の内容SHA一致。うち必要な6件だけを保存対象にした |
| 差分の空白検査 | 既存終了記録の3〜6行にMarkdown改行用の末尾半角空白2個が各1件ある。原文保存指示を優先して保持。今回編集した他の文書に空白エラーなし |

全体シナリオが参照する固定書き起こしは元の作業ツリーにも存在しない。シナリオscriptおよび固定STT処理は、PC側開始HEAD、元の作業ツリー、隔離コピーで同一byteだった。そのため今回の統合差分から発生した内容変更ではなく、既存の検査入力欠落として記録する。見かけ上の合格を作るために入力を捏造したり、別素材へ置換したり、未承認の退避folderから取り出したりしない。今回の必要検証として合格した型・候補理解・UI・review・証拠同一性で足りるか、全体シナリオの欠落入力復旧を別途要するかは、相談役へGPT_DECISIONとして確認する。

途中の実行環境上の問題は証拠を残して限定的に調整した。ローカル待受をsandboxが拒否した実行は、承認済み検査の範囲で権限を調整して再実行した。子プロセスが全体のpnpm v11を選ぶ問題は検証用PATHで10.28.0を指定した。隔離コピーに含まれない元動画は既存現物への読取り参照で補った。正式fixture・実装・契約は変更していない。全体シナリオの残る固定書き起こし欠落は未解決として切り分ける。

## 9. 最終HEAD、Drive snapshot、監査

本書を含む最終監査checkpointのcommitが、本工事の最終HEADである。commitは自身のファイル内容をハッシュ対象にするため、本書自身に自己のcommit SHAを埋め込む方式は採らない。確定した40桁のSHAは、push後の`git rev-parse main`と`git ls-remote origin refs/heads/main`の一致結果、および同じHEADから作るDriveのMANIFEST.mdとAUDIT_ONLY本文に記録する。repositoryから本書の対象commitを特定する場合は`git log -1 --format=%H -- docs/reports/main-integration-canonical-alignment-20260906-v001.md`を使い、提出されたmanifestのHEADと照合する。

push後、統合後HEADからAGENTS、CURRENT_GOAL、GOAL_DEFINITION、監査プロトコル、詳細architecture、9月6日方針、A/B終了記録、本工事報告の原文8件とMANIFEST.mdを「ZEV共有」の新しいHEAD識別付きsnapshotへ保存する。manifestにはrepository、branch、HEAD、取得日時、各repository path、Git blob SHA、内容SHA-256、Drive上の参照先を記録する。既存snapshotは上書きせず履歴として残す。Driveへの保存後はconnectorで全文を読み戻し、Gitの原文と一致することを確認する。

第一完成状態のcommit/pushとsnapshot更新後、Web版ChatGPTの同じ「ZEV進行管理２」へAUDIT_ONLYを提出する。提出本文は一行説明、branch、最終commit SHA、本書path、Driveの本書リンク、検証要約、未解決事項だけとし、詳細を転載しない。監査の返答を新Skill着工の許可へ読み替えない。

## 10. 未解決事項と対象外

- GPT_DECISION: §8の全体シナリオの既存固定入力欠落と、本工事で必要な検証範囲。全体テスト合格とは報告していない。
- HUMAN_DECISION: §7.4のGoal定義の適用範囲・改訂方式・完成動画の合格条件。
- 次に再開するSkillは、統合後の相談役監査で決める。今回着工しない。
- §4の別作業の変更4件と非採用の未commit資料9件は現物のままPCに残る。不要と断定して削除せず、共有HEADの内容と区別する。
- 外部の映像理解・生成API呼出、新規素材取得、有料推論、新しい動画生成、tag・stable・releaseは実施しない。既存raw応答・usageの確認で新しい実験成績は作らない。
- 本工事のAPI実走0回、追加の有料推論費用0。GitHub同期、Drive snapshot、Web版ChatGPTへの監査送信だけを今回の承認範囲で行う。
