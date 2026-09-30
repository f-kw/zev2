# Codex2｜9. 通常依頼の制作意図接続

## 受領・着手（2026-10-01 JST）

状態：v001のcaller欠落を相談役へ返し、v002を受領して限定接続を実装。通常API→承認→claim→実factory→探索・採否・保持の保存／再読がattempt-005で成立。追加検査attempt-006は27結果・21捕捉、関連型検査も合格。実装・保存・再読の限定範囲は技術完了、通常commit/pushと直接監査報告へ進む。通常UIからの採用／製造は未接続。

- 受領：`Codex2 続行指示｜9. 通常の依頼から制作意図を渡す接続`、`decision: continue`、`kawafmm承認済み`。本人の「終わったら次に進んで」に基づく後続限定作業。
- 指示書：`docs/work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v001.md`（保存05c042ae）、指示・現在地の保存HEAD `46219d1037afcf36a5b48bf92f6323946ab9c566`。
- 開始main/local/origin：`68a32038ebcd6dbee62454deca8999bd3d27d33c`、Git clean・staged0・tracked未commit0・untracked0。fetchとfast-forward後、local/originは46219d10で一致。他者の3文書の更新を保持。branch/worktree追加0。
- DECISIONSを参照後、START_HERE→HANDOVER_INDEX全文→今回指示全文→運用3文書とCURRENT_GOALを復元。DECISIONSは追記しない。
- 実行turn metadata：`gpt-6.1-sol`、workspace `/Users/kawafmm/workspace/zev2`。モデル比較は行わない。
- 担当はCodex2のみ、Codex1再起動0。前回b69e168cの実案・局所検査は受理済み、68a32038で終了済みとして保持。
- 報告先はインデックス確認済みZEV Build Loop。同URLの自分専用Edgeタブだけを使う。今回のGPT_DECISIONは専用タブから送信・表示確認済み（下記記録）。

## 目的と進め方の確認

通常依頼に指定された全文の制作意図を、保存・承認後の命令から既存の探索・採否・保持の判断入力へ渡す。入力を試験用に組み直して成立したことにはしない。隔離したローカル保存・通常callerの捕捉・別process再読で確認する。既存接続があれば利用し、不足する受渡しだけを修正する。通常runner全体の新設や契約変更が必要なら、現物と最小差分を保存してGPT_DECISIONへ返す。

新しい採用判断・素材取得・STT・動画・外部推論API・実キュー・本番設定・人間視聴は行わない。新しい人間回答／作業要求0、費用0。開始時は設営修正0・限定修正0。後続の失敗・修正回数は各checkpointと末尾で累積保存する。

## 最初の追跡checkpoint

通常APIは下書き作成と承認時にsharedの処理を呼び、依頼の目的を各命令へ保存する。runnerの工程builderも命令を受け取っている。ところが現時点の`runner/src`と`backend/src`検索では、既存の探索・比較採否・内部保持skillの通常callerが見つからない。通常のテーマ作成はfixed/transcript/sample、構成はテーマの発話群を組み立てる処理であり、前回のDigest判断と同じ実経路かを確認中。型の存在だけで接続完成へしない。

## 通常経路の対応（46219d10の現物）

| 区間 | 実際の呼出しと到達点 | 判定 |
| --- | --- | --- |
| 通常の依頼→保存下書き | control.ts:479のPOSTがshared:615へ渡し、目的を前後空白だけ除去してstate.jsonへ保存 | 接続済み、今回API実測 |
| 人間承認→工程命令 | control.ts:502→shared:647。承認下書きの目的全文・素材URI・編集条件を7工程へ複写 | 接続済み、別意図2入力・新process復元一致 |
| 命令取得→通常runner | index.ts:667/681/800→workflow-step-builders.ts:148/204/239 | 通常factoryへ命令を渡す実callerあり。CLI全体の実走は今回禁止工程を含むため未実行 |
| 通常テーマ作成 | index.ts:438→steps/theme-options.ts:182。sample/fixed/transcript、目的を読まない | Digest探索caller無し。transcript実builderは異なる2目的でも同じ成果物 |
| 通常構成作成 | workflow-step-builders.ts:239→steps/composition.ts:100。目的は渡るが探し直し指示の末尾だけ採取。選ばれた一テーマの発話群を組立 | 比較採否・内部保持caller無し。一般目的を変えても同じ構成 |
| 既存Digest探索・採否・保持 | 3 skillの呼出しはevals、前回acceptance-v001.mts、試験に存在する。runner/src・backend/src・client/srcには定義以外のcaller無し | 通常命令・通常成果物からの接続無し |

`source-bindings.json`に上記実装15参照のSHAを固定した。通常の演出案生成には目的をプロンプトへ渡す処理もあるが、これは探索・比較採否・内部保持の接続証明ではない。

## 保存した局所試験・制限

`connection-probe.mts` / `partial-path-observation.json`。既存control routerをloopbackに載せ、下書き作成・承認は通常POSTを利用した。入力builderは試験専用に再実装していない。試験だけのruntimeを作成し自動runnerを止め、外部推論は呼ばず、実キュー・旧保存物は変更しない。

- 異なる目的2件を通常APIへ入力し、素材・編集条件と一緒に7命令ずつへ全文保存することを確認。
- 未承認下書きは命令0・次命令null。別の目的で作った下書きは旧承認を継承せず、新たな承認まで命令0。重複承認409、空目的400。
- 別processで通常storeから再読した状態はAPIから読んだ保存状態と完全一致。
- 保存済み同素材の44,002断片を読み、通常テーマ・構成の実builderを呼んだ。日時だけ除外して比較すると、異なる一般目的で成果物は一致。内容品質の再選定はしていない。テーマ人間承認・通常runner全工程のE2Eとはしない。
- 既存業務stateと保存全文の試験前後bytes一致。隔離runtimeは削除済み、外部推論・STT・動画・新素材・費用0。
- Digest3判断の実入力捕捉、旧回答／別素材の通常経路拒否は、通常caller自体が無いため未成立。この部分を合格に付け替えない。

実行：shared build、backend type-check、agent-runner type-check（runner+Remotion）合格。probeは初回sandboxのloopback EPERMで未実行、同じcommandを隔離試験の承認scopeで実行し合格。自動審査の拒否なし。pnpmのrunner名誤指定は「該当project無し」だったため合格へ数えず、現物package名へ修正して実施。command修正1、production限定修正0。最初の空の一時dirも削除した。前回工事の設営修正履歴は変更しない。

## GPT_DECISIONへ渡す不足・最小提案

単に目的欄を追加すれば解決する欠落ではない。通常runnerは「候補テーマから人間が一つ選ぶ→関連発話群を構成」の保存物を扱い、Digestは「全文→候補集合→全候補の比較採否→採用候補の全断片keep/drop」の独立保存要求・受理方式を扱う。通常成果物に後者の要求・回答SHA、採否集合、保持被覆を保存／再開するcallerは無い。

推奨する次の一件は、**承認済み通常命令を既存Digestの判断requestへ渡す限定executorの接続**。次の境界を相談役に確定してもらう。

1. 承認済み依頼ID・素材・保存全文参照を検証し、命令に保存した目的全文を探索要求・採否要求・保持指示へ転記する。別目的への旧回答使い回しは既存の要求SHA検査で拒否する。
2. 発話列・候補集合・採否・保持は既存のbuilder／厳密受理を再利用する。前回の素材、文面、件数、尺は固定しない。時刻・ID集合・全断片被覆の検査も維持する。
3. 通常のどの工程から呼び、既存テーマ一件の人間確認・構成保存とどう接続するかを確定する。既存schemaの意味を黙って変えない。必要な新保存形式があれば、その承認前に実装しない。
4. まず通常caller→各判断入力の生成・保存・再読・拒否の範囲に止め、通信しない判断providerで隔離試験する。renderer、キュー体系、UI、API、STT、動画へ広げない。

想定差分箇所：通常の工程caller（runner/src/workflow-step-builders.tsとindex.tsのruntime構築）、命令と保存参照から既存requestを作る限定adapter、同じcallerを通る隔離試験。3判断が必要な保存物を既存theme/compositionへ載せるのが契約変更になる場合は、別の明示指示が必要。通常runner全体の新設・保存契約の意味変更は今回指示書§3の範囲外なので、本checkpointでは製品コードを変更せず追加作用を止め、現物を送る。

現時点では「接続完成」のAUDIT_ONLYを出せない。GPT_DECISIONで、上記の限定接続を現行承認内でどこまで行えるか、または次の最小工事として具体化するかを相談役へ返す。人間の追加視聴・採点・転記依頼0。送信前、Git checkpoint保存中。

## 直接送信checkpoint

2026-10-01T06:22:24.696325+09:00：`cc288f8ea5d0ab0937ffb74b952fcf5826616209`を通常push後、Codex2専用Edgeタブ（今回1516875418）でZEV Build Loopへ `Codex2 GPT_DECISION｜9. 通常依頼の制作意図接続` を直接送信。本文の送信表示と応答中表示を確認。送信先はHANDOVER_INDEXの指定URL、モデル条件の追加指定無し、表示Proを維持。共有・Codex1・ユーザーの別タブ操作0。送信表示画像 `/private/tmp/codex2-intent-decision-sent.jpg`。送信時main/local/originはcc288f8e、Git clean、untracked0。次指示はまだ未受領。送信実績だけの独立commit／終了連絡は行わず、次の実質checkpointと合わせる。

## v002受領・再開checkpoint

2026-10-01T06:32:42.781397+09:00：専用Edgeで相談役の最終返答 `decision: continue` を確認。正本v002全文を読み、mainを127aa06a35bde302f81e6ba44d5b00dd012453ecへfast-forward。v001記録と送信実績差分を保持。通常factoryの文字起こし検証直後に、明示準備依存がある場合だけ具体的executorを呼ぶ。既存の3判断と厳密受理・別保存・再開を接続し、通常起動のdefault・一テーマ人間確認・既存theme/composition/APIは変更しない。今回のcommand修正1、production限定修正0を維持し、v002でリセットしない。実装と通常API→store→factory試験を同じセッションで開始する。

試験設営checkpoint：factory試験初回は業務runtime/state.jsonの不存在を試験が想定せずENOENTで停止。通常API・provider起動前、製品変更なし。不存在をnullとして保存前後に維持するよう検査だけ修正（設営修正2、v001のpnpm名修正1を保持）。既に作った自分の空dirだけrmdir後に再実行する。

設営checkpoint：次の試験は既存stable streaming検査のhardlink禁止（nlink != 1）でprovider前に拒否。失敗stateをfactory-failed-attempt-002.jsonへ保存、自分が作ったsource linkのみunlinkして原sourceの単独linkを復元した。検査を緩和せず独立copy（対応FSのclone）へ変更。設営修正3、製品限定修正0。失敗runtimeは未完了証拠として保持し、次attemptを別領域で実行する。

限定修正checkpoint：三判断は実factoryから到達したが、保持の解決値に版欄が無いまま参照binding化し、既存有限JSON serializerがundefinedを拒否。未完了bindingと生解決値を保持しfactory-failed-attempt-003.jsonへ証拠保存。既存のnew-material-retention-validation-v001保存wrapper（要求・transcript参照付き）を再利用する修正1。検査緩和0、設営修正3を維持。失敗段階を完了にはしない。

型検査checkpoint：依存参照の共用化で、STT contextが関数値として渡す既存の任意参照処理まで削除してしまいtype-checkが未定義を検出。進行中の試験の実装SHAを途中で変えず、試験終了後にその元処理を同一内容で復元する（予定限定修正2）。新しい分岐・検査緩和は追加しない。型検査はまだ合格ではない。

attempt-004：factory接続23結果・21provider捕捉は合格。ただしindex型検査不合格の版なので最終成立とはしない。source-video contextへ渡していた既存任意参照の関数を元内容で復元（限定修正2）。実装SHAが変わるため、次attempt-005で対応する保存版を新たに検査する。前回結果はfactory-connection-evidence.jsonとして保持。

最終検査checkpoint：attempt-005は接続25結果・21provider捕捉、別process再読2件が合格。関連agent-runner型検査（shared build・runner・Remotion）も合格。製品実装はこの版で固定。完了条件の保存不変と通常Composition出力の証拠を明示するため、試験だけにDigest保存全体のSHA比較と既存構成builderの比較を追加し、attempt-006へ別保存する。製品限定修正2・設営修正3を維持する。

## v002実装と接続経路

通常control APIで依頼を作成・保存し、人間承認後の命令を通常claim APIで取得する。その命令・state・文字起こし実参照を、通常factoryのテーマ作成処理が受け取る。文字起こし検証の直後、明示した準備依存があればrunner内executorへ渡し、既存の全文探索→候補比較採否→採用候補の全断片保持を呼ぶ。三つの判断に、通常命令の制作意図全文をそのまま渡す。試験だけの入力生成・別runner・専用キューは作っていない。

- 工程factoryへ任意の準備依存と具体的executor呼出しを追加。通常indexの必須依存参照処理を共用化し、試験も同じ依存参照処理を使う。STT contextで使う任意参照処理は元内容を維持。
- 通常の承認下書き・命令・claim・source/STT成功依存とFileRefの所有者・実SHAを、provider呼出し・Digest保存より先に検査する。保存文字起こしと共通発話の出所・本文・全断片は既存validatorで照合する。
- 一種類の内部出所記録で、承認下書きと命令snapshot・SHA、素材・全文・共通発話の実参照、編集条件・policy、16実装参照、各段階の要求・回答・受理、完了／未完了を対応付ける。既存版のplan／要求／回答／結果を再利用する。通常のテーマ・構成出力とは別保存。
- 各段階の要求SHA、候補／発話／断片ID、候補採否集合、全断片keep/drop被覆、既存の時刻解決を保つ。未知版・欠損・改変・旧要求回答は拒否する。結果0件を件数や尺の強制規則で増やさない。採用0件で既存保持の入力が成立しない場合も成功偽装しない。
- 再開は保存SHAと既存validatorを再実行し、既に受理した段階のproviderを再呼出ししない。読取確認では実行claim・provider・保存・review変更を作用させない。未完了は読取完成確認に失敗する。
- 凍結済みbuilder／validatorは変更0。既存tsx実行環境から副作用のないexportを利用し、CLI本体のmain guardを起動しない。既定ではこれらの.mtsを読まず、外部推論を起動しない。

明示依存未指定では追加計画保存0。通常indexに依存を指定する変更、環境変数・公開mode・API・UIは追加していない。テーマ成果物の意味、人間の一テーマ選択、7工程、完成命令、FileRefKind、control reviewを維持する。Digest複数採否を一テーマへ包まず、通常構成・編集案・renderはこの計画を読まない。

## 試験の実体・限界

`factory-connection-test.mts`は隔離runtimeの通常control API、通常store、通常claim、実factory、具体的executor、既存三判断builder／validatorを使う。判断providerだけが通信しない固定回答である。テーマ・構成builderも通常実装を使う。入出力I/O依存は隔離artifactへ向ける。既存の保存動画を独立copy（FS clone可能時はclone）し、保存済みSTTの同一bytesをfixtureとしてsource/STT工程の成功と参照に結び付けた。素材取得・STT実走・通常後段のテーマ人間承認を通った全工程E2Eではない。固定回答の2候補は配線試験だけの値で、製品既定やAI選定品質の実測にしない。

attempt-005の25結果・21捕捉と、先行attempt-004の23結果を別保存。004はその時点のindex型検査不合格を保持し、最終成立に数えない。最終版attempt-006は27結果・21捕捉が合格。最終証拠は[factory-connection-evidence-attempt-006.json](factory-connection-evidence-attempt-006.json)、3件の完了保存と16実装参照／18artifactのSHA一致は[factory-binding-proof.json](factory-binding-proof.json)。通常業務state（当環境では不存在）と旧保存STTを不変比較し、実キュー・旧入力を更新しない。動画原本に自作したhardlinkは失敗checkpointで解除し、その後は独立copyのSHAを旧保存参照と照合。新素材・外部推論・費用・STT・動画・人間作業0。

最終コマンド：

```sh
corepack pnpm --filter @zev2/agent-runner type-check
node --import ./runner/node_modules/tsx/dist/loader.mjs docs/reports/request-intent-connection-20261001/factory-connection-test.mts run attempt-006
```

関連型検査はshared build・runner・Remotionの検査が合格。backendはv001の型検査合格後変更0。対象試験はpurposeの異なる2通常入力、保存再利用／別process再読2件、provider中断から受理済み探索を再呼出しせず採否から再開、未承認・claim無し／期限切れ・別依頼・目的／条件／素材不一致、旧要求SHA回答、未知ID、採否／保持の欠落・重複、保存欠損・改変・不正参照・未知版・受理段階欠損・別承認版・他の保存文字起こし参照の拒否を実行する。

累積：設営修正3、製品限定修正2。既存枠をv002でリセットしていない。失敗002・003は小さい証拠JSONと未完了runtimeを保存し、004・005・006の版を区別する。追加作用の停止を要する枠超過・外部費用は発生していない。

## 残る接続と次に進むべき一件

成立範囲は、明示依存を渡した通常factoryから、承認済み依頼に束縛されたDigest計画を準備・保存・再読できるところまで。通常UI／通常起動は依存未指定であり、Digest複数候補の採用と通常構成・編集案・動画製造は未接続。人間品質・最終採用・公開の確認も行っていない。

次の一件の推奨は、**保存済みの受理済みDigest計画を、通常後段へ接続する際の出力・人間承認境界を具体化すること**。一テーマ選択の意味を変更する必要がある部分を相談役が判断し、既存の構成／編集案に何を渡せるかを実物で限定する。未指定依存を本番へ自動有効化することや、新たな外部推論・動画・人間視聴の承認を今回の成果から推測しない。相談役の次指示を受領後、同じセッションで続行する。

## 最終checkpoint（2026-10-01 JST）

attempt-006は27結果・21provider捕捉が合格。異なる制作意図2件が各段階へ欠落なく渡り、要求SHAも各段階で異なることを確認。完全保存は再判断0、別process再読2件が成功。資格不成立8種ではprovider0に加えてDigest保存全体のSHA不変。通常APIの未承認入力は命令0・Digest保存0。通常Theme/Composition出力は追加準備の有無で同一（生成日時だけ除外）、control review変更0。Compositionは独立builder比較であり、テーマ承認や製造の実走ではない。

最終3記録の全18artifactと16実装参照を現在fileのbytesで照合し、出所記録のsnapshot／SHAを上記proofへ保存した。依存未指定の既定、凍結済みvalidator、旧素材／全文、業務stateは保持。費用0、製品限定修正2・設営修正3。主report・自分のCURRENT_GOAL/HANDOVER行を技術成立範囲と通常採用／製造未接続に同期する。DECISIONS・Codex1点検・前回成果は変更0。

Git保存は本checkpoint commitで行う。基準main/origin `127aa06a35bde302f81e6ba44d5b00dd012453ec`から担当差分のみを明示stageし、通常push後にSHA、Git clean・untracked0、Git操作終了を直接報告本文で示す。self SHAのためだけの追記commitは増やさない。直接報告の送信表示・監査応答・次指示はその受領checkpointへ保存する。現在は送信前であり、報告済みとはしない。
