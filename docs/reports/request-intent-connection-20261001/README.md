# Codex2｜9. 通常依頼の制作意図接続

## 受領・着手（2026-10-01 JST）

状態：v002（11809f6f）・v003（7b600a64）は相談役技術受理済み。v004をee032be8で受領し、通常キュー接続の最小仕様案一つと既存境界の10実測を保存、別process再読も合格。製品コード変更0。通常commit/push後、GPT_DECISION＋NEXT_REQUESTを専用Edgeから直接送る。公開契約・承認方式・本番既定・動画の有効化は未承認。

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

## v002直接送信checkpoint

2026-10-01T07:08:49.296653+09:00：通常commit `11809f6f6bebed82014971c966b79b383b921a1d` のpush後、Codex2専用EdgeタブからZEV Build Loopへ `Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9. 通常callerからのDigest計画接続` を直接送信。送信本文・応答中の表示を確認、画像 `/private/tmp/codex2-intent-final-sent.jpg` を保存。送信時はmain/local/origin一致、Git clean、staged0・untracked0。担当Git操作終了と次指示依頼を同じ本文で伝達。他セッション／共有／ユーザーのタブ操作0。現時点は相談役の最終監査・次指示待ち。送信実績だけの追加commitをせず、次の実質checkpointへこの記録を合わせる。

## v003受領checkpoint

2026-10-01T07:19:57.049980+09:00：同じ専用Edgeタブで相談役の最終返答 `decision: continue` を確認。`11809f6f`のv002限定準備を技術受理、範囲内必須追加修正なし。固定providerと実AI品質、Mac試験未再実行の監査範囲を区別した返答。次指示は `docs/work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v003.md`、保存HEAD `ce1d4665ddc7c628a7665f5707261c6b9f036315`。保存済み採用・保持計画を再判断せず既存Digest編集・製造入力の実消費側へ渡し、保存／別process再読まで接続する。動画描画・通常一テーマ出力／人間承認変更はしない。旧16実装参照・18保存物とSHA検査を維持し、新しい消費側の別領域だけに保存する。設営修正3・製品限定修正2を保持。受理だけの独立commit・終了・再起動を挟まず、最新main同期・v003全文復元から続行する。

v003実装方針checkpoint：ce1d4665へfast-forwardし、START_HERE・HANDOVER全文・v003全文を復元。既存Digestの採用／編集形式と、製造入力job検査・区間時計解決の実consumerを確認した。通常一テーマ型や人間assembly承認へ偽装せず、既存jobの技術入力検査と保持区間→frame/sample解決まで渡す。旧source SHAに束縛されたinspectionを明示依存で受け取り、旧元動画と独立copyの実SHAを照合して使う。新消費側モジュール／試験／出所記録だけを追加し、旧16実装参照・18保存物・前回コードを変更しない。目的は保存済み内容を後段入力へ欠落なく渡すことであり、新しい選定・字幕・製造は行わない。

v003実走checkpoint：最初の接続試験attempt-001は15対象結果・6入力捕捉が合格。通常API→store→claim→変更しない実factory→新消費側→既存製造入力job検査／区間時計validatorが成立。二つの非連続保持fixtureは各2候補・4keep区間を渡し、dropの断片・中間時刻を復活させずframe/sample対応を確認。旧v002の2計画も新consumerで消費・新process再読し、元の保存物とstateは不変。最終agent-runner型検査も合格。製品実装の追加修正0、累積設営3・製品限定修正2を維持。未完了・未承認・条件違い・消費記録欠損・別inspection参照の拒否を、同じ消費関数の追加局所検査で補う。

## v003技術完了｜保存計画の後段入力接続

### 実装した処理と、実際の消費先

新しいrunner内消費モジュールだけを追加した。通常factoryの実呼出し後、同じ命令・state・素材参照を受け、旧厳密readerから完了済み準備を再検証する。保存採否と保持解決から、前回実案で使う既存版のDigest採用／編集計画と製造入力を作る。新しい選定・タイトル・字幕・構成役割は加えない。保持の理由・意味役割・境界根拠は受理済み保存物から継承する。

製造入力は `validatePresentationBaseMediaBuildJobV001`、各keep区間と実素材時計は `validatePresentationBaseMediaSegmentPlanV002`（ともに既存presentation_base_media_build_v003.mjs）へ実際に渡し、passedを要求する。後者が元ms→30fps出力frame→音声sampleを解決する。既存job検査と区間時計入口までの受理であり、動画build関数・旧人間assembly承認入口・renderは起動しない。

同じ候補の複数keepを別々の製造区間に保つ。区間ID・候補ID・断片列・順序・始終時刻を保ち、候補のmin/maxへ戻さない。各区間のclock mappingは保持区間の件数・ID・元始終時計と1対1に照合する。除外ブロックの断片や中間時刻を復活させない。

通常下書き・目的・条件・policy・素材・承認版は準備bindingに束縛したまま引き継ぐ。元の18保存物と16実装参照を変更しない。新しい消費出力は同じ依頼の別子領域へ保存し、一種類の内部記録で準備binding・inspection・元動画とcopyのSHA対応・新消費側5実装・4出力・実consumer受理を結ぶ。既存のsource SHAに束縛されたinspectionを再利用し、inspectionの元動画側の実SHAも検査してcopyと対応させる。動画・音声のinspection再走査／再製造0。

### 最終証拠と対象試験

- [接続試験](consumer-connection-test.mts)、[15対象結果・6入力捕捉](consumer-connection-evidence-attempt-001.json)：隔離した通常API→store→承認・claim→変更しないv002実factory→新しい消費関数→既存製造入力／時計検査を一系列で実行。必要な非連続保持2依頼だけを通信しない固定providerで作成した。各2候補・4keep区間、異なる目的、dropを復活させない元断片・順序・ms・frame・sample対応を確認。完全保存の再利用は追加判断0、新process再読2件は再計算一致。
- 旧v002の既存2依頼もそのまま再検証・消費し、新processで消費結果を再読した。旧claimに期限設定はなく、延長・更新・移譲はしない。新出力だけを別子領域へ追加し、旧stateと元準備記録／18保存物のbytes不変を比較した。
- 別依頼・目的・素材・承認版・期限切れclaim、未知出力版・不正参照・出力欠損／改変・区間欠落／重複・元準備改変を拒否。区間欠落／重複は出力のSHAも更新した否定fixtureを使い、保存準備から再構築した内容との不一致で拒否する。
- [追加拒否試験](consumer-rejection-test.mts)、[5件の保存不変証拠](consumer-rejection-evidence.json)：未承認・条件変更・元準備未完了・消費記録欠損・異なるbytesへ結び付いたinspectionを拒否。provider／state／準備／消費出力の作用0。
- [4件の消費binding証拠](consumer-binding-proof.json)：新2依頼と旧2依頼、各4出力・5新実装・元準備binding・inspection参照を現在bytesで照合。v002の全3完了binding・18保存物・16実装参照も元proofのSHAと不変一致。

agent-runnerの関連type-checkはshared build・runner・Remotionが合格。凍結済みfactory／index／準備executor／builder／validatorとbackendの変更0。旧27試験・前回111試験・媒体QCの再実行はしていない。今回の新しい実走失敗・設営／製品修正は0、累積設営3・製品限定修正2を維持。固定回答は配線fixtureであり、人間品質や実AIの意味判断の合格とはしない。

```sh
corepack pnpm --filter @zev2/agent-runner type-check
node --import ./runner/node_modules/tsx/dist/loader.mjs docs/reports/request-intent-connection-20261001/consumer-connection-test.mts run attempt-001
node --import ./runner/node_modules/tsx/dist/loader.mjs docs/reports/request-intent-connection-20261001/consumer-rejection-test.mts
```

### 成立範囲と残り

保存された採用・保持計画を再判断せず、既存Digest形式の編集・製造入力として実job検査・時計解決まで受理・保存・再読できる。製造実行、字幕／演出、通常backend完了登録・後続キュー起動、通常UIや本番既定は接続していない。人間品質はpending、テーマ承認・架空selectedThemeId・人間assembly承認の捏造0。費用・外部推論・STT・新素材・動画・実業務state変更・公開0。

次の推奨一件は、**通常の承認済み依頼と内部Digest出力を、通常キューの出力・消費へどう正式接続するかを、既存承認／出力契約と照合して限定すること**。本番default・公開保存物・人間確認の意味変更が必要な箇所は相談役判断へ残す。今回通ったjobのshape検査だけから動画実行や人間採用の権限を推測しない。

本実質checkpointにv002の送信・技術受理とv003の受領・実装・検査を合わせて通常commit/pushする。基準main/originはce1d4665、担当差分だけを明示stageする。push後のSHA・Git状態・直接送信確認は監査本文と次の受領checkpointへ保存し、応答保存だけの独立commitは増やさない。

## v003直接送信checkpoint

2026-10-01T07:43:40.269750+09:00：通常commit `7b600a648cf4ee5228601b72b0a6b6629038fa75` のpush成功後、同じCodex2専用EdgeタブからZEV Build Loopへ `Codex2 AUDIT_ONLY＋NEXT_REQUEST｜9. 保存Digest計画の後段入力接続` を直接送信。本文送信・応答中表示を確認、画像 `/private/tmp/codex2-intent-v003-sent.jpg` を保存。送信時main/local/origin一致、Git clean、staged0・untracked0、担当Git操作終了を同本文で連絡。実consumerの受理までと未接続の通常UI／正式キュー／動画を区別し、次の具体的指示を依頼した。現在は監査・次指示待ち。送信だけの独立commitはせず、次の実質checkpointと合わせる。

## v004受領checkpoint

2026-10-01T07:55:12.067292+09:00：同じ専用Edgeタブで相談役の最終返答 `decision: continue` を確認。`7b600a64`のv003限定消費接続を技術受理、範囲内必須追加修正なし。次指示は `docs/work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v004.md`、保存HEAD `ee032be8b2f19a0dcb0f795a459725de125ff1f4`。今回は通常依頼・共通キュー・出力登録・後続消費・実行承認を結ぶ最小仕様案一つと、保存v003出力の既存次段validator境界probeだけを行う。製品コード／公開契約／人間承認方式／実キュー／本番defaultは変更しない。形式検査と実製造資格を分け、live実装SHAの旧版保持案も具体化する。累積設営3・製品限定修正2を保持し、同じセッションで最新mainへ同期して続行する。

v004境界実測checkpoint：保存v003の第一計画からJSON4件だけを隔離runtimeへbyte一致copyし、実exported validatorへ10件を投入。編集計画のbackend kind検査と製造jobの参照形状は受理2件。別draft／欠損path2件、kind2件、runner詳細構造3件、機械採否を専用人間組立判断へ渡した1件は想定拒否。編集計画はkindが一致してもClipの作成方法でなく詳細検査が拒否。組立判断はschema／payload／human approvalを欠いて拒否。元state・binding・18準備保存物・4消費保存物とvalidator bytes不変。complete POST・動画copy・provider・inspection・render・業務state書込0。前の20試験を再実行せず、累積設営3・製品限定修正2を維持する。一案では明示Digest種別と専用成果物を共通キューへ載せ、旧一テーマ型・旧承認へ偽装しない。

## v004設計・境界確認完了

[最小仕様案一つ](queue-integration-contract-proposal-v001.md)に、実API→下書き→承認・命令→claim→factory→完了登録→依存参照再読と、製造許可の境界を保存した。明示制作系統、共通キュー内のDigest固有工程・kind/schema、正規FileRefと参照閉包保存、登録出力の所有者、実素材bytesと参照JSONの分離が必要。通常Clipのテーマ／場面承認・詳細型は維持する。Digestの後段は機械採否・保持を実再読し、未接続の字幕／ZEVO・動画許可を不足として保存する案。通常indexの既存ローカルstdin判断callerを接続し、試験で置換するのは判断通信だけとする。

現行のテーマ・場面・生成前確認は実callerと共通準備判定が常に要求し、policy=falseでは解除されないことを確認。人間品質pendingと動画許可・公開を区別した。旧16/5実装のlive SHA変更影響をfileごとに示し、旧固定Git版・保存proofの履歴確認と、新しい依頼／binding版の現行実行を分ける保全案を保存。古い回答SHA・承認の付け替え、hash免除、旧reader大量コピー、旧動画再製造は採らない。旧readerを新HEADで利用できるという主張もしない。

[境界probe](queue-contract-probe.mts)は受理2・想定拒否8、実行失敗0。[保存結果](queue-contract-evidence.json)を別processで再読し、26保護pathとcopy・実装参照のSHA一致を確認した。再読はvalidator再実行0・state書込0。製品コード／依頼stateを変えていないため、前工程で完了したtype-check・20試験・動画QCを再実行しない。型検査を今回の新しい製品修正に適用したとは報告しない。

```sh
node --import ./runner/node_modules/tsx/dist/loader.mjs docs/reports/request-intent-connection-20261001/queue-contract-probe.mts
node --import ./runner/node_modules/tsx/dist/loader.mjs docs/reports/request-intent-connection-20261001/queue-contract-probe.mts read
```

今回の完了は設計・境界実測。通常キューの製品接続そのものは未実装。次の推奨一件は、相談役が最小仕様の型・工程・出力差分を限定したうえで、明示Digest依頼→通常計画登録→次の実消費を隔離実装すること。一般の機械採否委任・計画SHAへの動画許可方式は別判断。人間へ視聴・採点・技術方式選択は要求していない。新規人間品質Pendingなし、既存未回答は維持。費用・外部推論・素材／STT／動画／inspection・公開・Decisions・Codex1操作0。

基準main/originはee032be8。今回の6担当fileだけを明示stageし、通常commit/push後のSHA・Git clean・untracked0と担当Git操作終了を直接報告する。送信・監査・次指示の受領は次の実質checkpointへ保存し、受理記録だけの独立commit・終了・再起動は増やさない。累積設営3・製品限定修正2を引き継ぐ。

## v004直接送信checkpoint

2026-10-01T08:18:08.928650+09:00：通常commit `d77f2a5ddc48016e6e1c7f22bee454fc231ffda7` のpush成功後、同じCodex2専用EdgeタブからZEV Build Loopへ `Codex2 GPT_DECISION＋NEXT_REQUEST｜9. 通常キュー接続の最小仕様案` を直接送信。本文送信・応答中表示を確認し、画像 `/private/tmp/codex2-intent-v004-sent.jpg` を保存・会話へ提示。送信時main/local/origin一致、Git clean・staged0・untracked0、Git操作終了。現時点は監査と次の具体的な許可差分待ち。送信記録だけの独立commitは行わず、次の実質checkpointへ合わせる。

## v005受領checkpoint

2026-10-01T08:29:25.734136+09:00：同じCodex2専用Edgeタブで最終返答 `decision: continue` を確認。v004は `d77f2a5d` で設計・境界確認を受理。明示Digestと共通queueの骨格を開発候補として採用し、計画成果物のconsumptionBindingは必須から外して次の検証成果物へ移す。次の正本は `docs/work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005.md`、保存HEAD `999346faabe282e23d5c41329455e1556c8e66a9`。通常approve/claim/PUT/completeから計画登録・次工程の実消費・検証結果completeまで、実業務と分離した開発候補実装のみ許可。製品本適用・一般委任・動画許可改訂・動画命令は未承認のまま。旧成功依存fixture注入を使わず、OutputEntity所有者・素材JSONと動画bytes・local/upload閉包を実登録で検査する。累積設営3・製品限定修正2を維持し、最新main同期・v005全文読了後、同じセッションで続行する。


v005開始checkpoint：main/origin 999346faへ同期し、START_HERE・HANDOVER全文・v005全文を復元。実業務backend／runner／Vite／tsx watcherの稼働はprocess・port実測で見つからず、既存サービス操作0。変更前の旧proof・binding・参照データと固定Git版11809f6f／7b600a64の対応をqueue-history-preservation-proof.jsonへ保存した。履歴検査であり旧reader再実行・現行資格の認定ではない。モデル表記gpt-6.1-sol、比較／旧成果再生成0。目的は通常の明示依頼から保存計画・次工程の再読までを接続することであり、新しい選定基盤や動画工程の追加ではない。

v005実装checkpoint：共通の明示系統、Digest2工程・専用kind、通常factory／indexとstdin transport、登録OutputEntity所有者、素材参照JSONと実bytesの分離、同一draft論理参照・全データ閉包の転送を実装作成中。shared/backend/runner/Remotion型検査は通過。clientは既存表示名の全kind型が新2kindへ未追従で不一致。App.vueは明示clip入力だけを変更し、表示名二行の追加はv005の限定から外れるためqueue-client-type-followup-request.mdの一差分をGPT_DECISIONへ返す。新しい画面・入力・契約本適用を求めない。初回正式接続試験は未実行。累積設営3・製品限定修正2を維持し、独立するAPI／runner検査は進める。

v005型追従の直接相談checkpoint：c37ab096b716b9a3b017dd107fba03bc345c2816をmainへpushし、Git clean・staged0・untracked0を確認してGit操作を終了。Codex2専用Edgeから二表示名だけのGPT_DECISIONを送信し、本文表示・応答中表示を確認。画像 /private/tmp/codex2-intent-v005-type-sent.jpg を保存・会話へ提示。client該当二行は未変更。許可済み隔離接続試験attempt-001を開始し、判断中も独立工程を継続する。

v005実走失敗checkpoint：attempt-001でsource/STTの通常claim・PUT・completeは成功し、OutputEntity所有者を実登録した。実runnerの人間UI用GET /stateはagent認証で401となり、Digest準備はfail登録・検証はqueuedのまま。失敗現物とstateを保持し、queue-integration-auth-failure.jsonを保存。正常なclaim応答は実requestと全stateを既に返すため、その応答を実factoryへ渡す限定修正を行い、人間UI認証・agent権限を広げない。製品限定修正を累積3へ計上。試験親の終了保存が確認できず証拠保存後に今回の隔離process二件だけを停止、以後の失敗記録はstack展開へ依存しない。設営修正はこの変更を4として計上。以後同種の追加修正が必要なら枠を照合して停止報告する。


## v005中断checkpoint｜参照一式の不整合・限定修正枠

実業務は変更していない。attempt-001の認証停止を、実claimが返す承認済みrequest／stateを実factoryへ渡す一差分で修正した。人間UI用状態APIをagentへ開放せず、認証・承認条件は維持。runner／Remotion型検査が合格し、製品限定修正は累積3へ到達した。設営修正は失敗記録のstack展開への依存を除く変更を4として計上した。

attempt-002では旧source/STTの通常登録、実index→factory→既存3Skill、採否・保持18保存物、薄い計画の通常completeまで成功した。制作意図全文は探索・採否・保持の3要求に一致し、固定回答は各要求SHAに対応した。登録JSONと実動画のSHAは別であり、FileRef所有者は実OutputEntity ID。ここまでの部分実測であって、次工程消費や参照閉包の合格ではない。

試験自体は、stdoutに出た元発話の「失敗」を失敗ログと誤認して止まった。実queueの準備命令はsucceeded、検証命令はqueued。既存runnerの--max-steps=1による工程境界停止は予定したもので、命令失敗ではない。queue-integration-evidence.jsonに診断を保存した。判定をexitとstateへ限定する設営修正がもう一件必要だが、まだ実施していない。

さらに読取調査で、採否要求の候補一覧bindingはdraft直下のcandidate-set.jsonを指す一方、実保存registryはrequest ID付きfileNameを指す不整合を確認した。両者は同じ内容SHAだが、要求内の宣言pathは存在しない。凍結済み純粋builderがoutputRootへ固定basenameを足し、今回の準備保存がfileNameへrequest IDを付けたため。これは参照閉包の技術未解決であり、queue-logical-reference-gap-evidence.jsonへ現物対応を保存した。kind／通常completeが通っても詳細graphを合格にしない。

推奨最小差分は、新しい論理参照をdraft/request/fileへ束縛し、共通resolverが安全な既存PUTのrequest--fileへ解決すること。準備の論理outputRootとregistry basename対応だけを合わせ、内容builder／validator・PUT/GET endpoint・安全検査は変更しない。旧JSONや旧回答SHAを書き換えず、修正後の新しい隔離attemptだけへ適用する。主な差分候補はsharedの薄い成果物参照解決と準備module。追加製品修正が必要だが累積3に達しているため、実装・追加実走を止め、枠と最小方針をGPT_DECISIONへ返す。独自の枠再設定・リセットは行わない。

未実施：次の検証命令complete、uploadとworker/backend分離、転送先だけの別process消費、MP4枝、inspection未提供枝、否定試験・Clip対象回帰・client最終再合格。保存／別processの読取診断は消費E2Eや品質評価と区別する。字幕／演出は未接続、動画許可は未承認、人間品質はpending。ID9-PD-01／02と業務state移行・本適用は保留を維持する。

同じ専用Edgeで相談役の型追従返答を受領：App.vue既存辞書の二表示名のみを許可、保存83f9112939457ddc0f4dcfc4e172b39b7d19b785。新画面ではなく型追従との判断。今回の停止理由はその判断待ちではない。参照不整合・修正枠へ停止したため二表示名は未適用、client不一致も保持。正本を他者差分を消さず同期し、この受領は中断checkpointへ合わせる。

停止処理は証拠保存→追加作用停止→通常checkpoint commit/push→専用EdgeからGPT_DECISION直接送信・表示確認→turn終了。完了報告と称さず、新指示を受領するまでは自走再開しない。外部推論・費用・新素材取得・STT・inspection・映像／音声製造・実業務サービス操作・公開0。旧素材bytesの独立copyは隔離保存のみ。

中断の別process読取checkpoint：queue-interruption-readback-proof.jsonへ、旧96保護fileと固定Git版21blobのSHA不変、今回の25登録参照fileの実bytes、source/STT/計画の実所有者3鎖、隔離stateのSHAを保存した。旧reader・新consumer・uploadは起動0。宣言された候補一覧pathが不存在である不整合を別記録と対応付け、全閉包accepted=falseを維持した。今回の隔離backend／runner／試験親processは残っていない。主report・CURRENT_GOAL・HANDOVERの担当行を中断へ同期し、担当差分だけをmainへ通常commit/pushしてGPT_DECISIONへ直接報告する。型追従許可の正本83f91129は保持。Git・送信確認だけの再commitは増やさない。


## v005 §11 再開受領checkpoint

2026-10-01：本人回答「良い。指示書作って」に基づく参照対応だけの追加1回と検証続行を受領。mainを87c53aded07af838cf400092a1d4f60daf13cfcbへfast-forwardし、START_HERE・HANDOVER全文・v005全文（§10／11含む）と運用資料を復元した。実行環境で確認できるモデル表記はgpt-6.1-sol。旧成果再生成・モデル比較は行わない。Codex2単独、他者変更なし・staged0・untracked0、相談役のGit保存終了後に担当操作を引き継いだ。

目的は通常の依頼から探索・採否・保持と次の登録済み計画消費まで参照を欠落なく渡すこと。旧attempt-001/002、旧要求／回答SHA、旧96保護file・21固定Git blobは保持する。製品修正は現在3、今回の対応修正を適用時に4、stdout設営修正は適用時に5と記録する。一般上限・AGENTS・履歴を変更しない。ID9-PD-01/02、字幕／演出未接続、動画許可未承認、人間品質pendingは維持する。

前回debd5897の中断報告はCodex2専用EdgeからZEV Build Loopへ直接送信・表示確認済み（画像/private/tmp/codex2-intent-v005-interruption-sent.jpg、送信receipt同ディレクトリ）。今回の再開はその後の明示指示による。


## v005 §11 修正checkpoint・局所試験の設営枠停止

参照対応の一連の最小修正を累積製品4回目として適用した。新しい論理参照はdraft／生成元request／basename、物理名は生成元request--basename。登録URIから戻す際も検証済み生成元を要求し、依存鎖だけを許す。探索・採否・保持の要求、前段計画・採否・保持保存物の内部bindingをregistryと列挙データへ照合する共通検査を追加し、登録前と次工程の再読へ接続した。物理名衝突・別draft・依存外・traversalを拒否する規則を設けたが、拒否試験の完了とはまだ認定しない。

必要な追従は保存準備、消費、通常indexの取得／転送、backend完了前検査の同じ参照対応だけ。内容builder／validator・時計処理・認証・PUT/GET endpointは不変。App.vueは§10の二表示名だけを追加、既存七表示名を維持した。shared build、backend type-check、runner＋Remotion type-check、client type-checkは全てexit0。

stdout本文から「失敗」を検索する判定を除き、実process exitと実queue工程状態を基準にする設営修正を累積5回目として適用。証拠ファイルは新attempt別名とし、旧attempt-001/002の証拠・保存物を上書きしない。

最初の小さい局所参照試験attempt-003は、探索計画JSONの保存前にexit1。試験用保存が書き起こしへ存在しない版情報を含むJSON参照を作り、既存正式JSON直列化が未定義値を拒否した。queue-reference-setup-failure-attempt-003.jsonへ実失敗・3保存file・未実施範囲を保存。製品の許可済み参照修正を取り消したり、旧JSON／要求／回答SHAを付け替えたりしていない。局所参照の合格も通常接続の合格も未認定。

必要な設営一差分は書き起こし旧bytesと版なしbytes参照を局所registryへ保存すること。queue-reference-setup-followup-request.mdに具体案を保存し、未適用。設営5回枠に到達したため§11どおり追加修正・通常接続実走を停止し、GPT_DECISIONへ返す。一般枠や過去累積は変更しない。通常source/STT登録→計画complete→validate complete、upload・分離root／別process、MP4／inspection未提供、否定試験・Clip回帰は再開後の未完了として保持。今回旧動画／STT／inspection／外部推論／費用／製造／公開／人間作業0。

停止後の別process読取確認：旧96保護file・21固定Git blob・debd5897の旧証拠5件はSHA／bytes不変。局所失敗記録と新規保存3fileも別processで再読・SHA／size一致。queue-reference-stop-readback-attempt-003.jsonへ保存。これは履歴と失敗証拠の保全確認であり、旧reader実行・新consumer・通常completeの合格ではない。


| 今回追従した担当path | 同じ参照欠陥との関係 |
|---|---|
| packages/shared/src/digest-plan-artifacts-v001.ts | 論理参照と単一保存名の対応、生成元依存鎖、衝突と内部参照の共通照合 |
| runner/src/digest-plan-preparation-v001.ts | 純粋builderへ渡す保存領域とregistry basenameを統一し、保存要求本文まで照合 |
| runner/src/digest-plan-consumption-v001.ts | 登録された計画と書き起こし、消費出力の論理参照を同じ生成元規則へ統一 |
| runner/src/index.ts | 正規依存出力だけを読取対象にし、取得／転送の論理参照を単一ファイル名へ解決 |
| backend/src/artifacts/validation.ts | 通常完了の前に全bytes・内部参照・生成元の対応を検査 |
| backend/src/routes/control.ts | 上の完了前検査へ実stateを渡し、消費計画の実所有者との参照対応を確認 |

App.vueは既許可の二表示名、試験は設営5回目と局所参照／新attempt証拠の追加のみ。業務state・旧attempt・旧回答へ作用しない。停止時のGit基準はmain/local/origin 87c53ade一致。担当14fileだけを明示stageし、通常checkpoint commit/push後のSHAとclean・staged0・untracked0を専用Edgeの停止報告で示す。受領記録だけの独立commitは行わない。


## v005 §12 再開・設営6回目checkpoint

2026-10-01：本人の「独断で決めれる程度なら自動で承認して」に基づく相談役の自動承認を受領。mainを9f0312295266ceb0e5c497eeaa01d187ac3303afへ他者変更を保持して同期し、START_HERE・HANDOVER全文・v005全文と更新AGENTSの軽微技術判断規則を確認。モデル表記gpt-6.1-sol、比較・旧成果再生成0。Codex2単独、担当Git操作を引き継ぎ、専用Edgeだけを使う。

保存済み4行案をreferences枝だけへ適用。旧書き起こしを版付きJSON参照へせず、旧bytesをそのまま保存して版なしbytes参照をregistryへ登録する。設営修正は累積6回目、製品修正4回目を維持。一般枠・履歴・AGENTSはCodex側で変更しない。attempt-003と旧証拠は保持し、新局所attempt-004へ進む。局所合格後は通常接続の既承認試験へそのまま進み、未承認の品質・一般委任・動画／本番／公開へ広げない。

前回01ad1e54の停止報告は同じ専用EdgeからZEV Build Loopへ直接送信・表示確認済み。画像/private/tmp/codex2-intent-reference-setup-stop-sent.jpgとreceiptを保存し、会話へ提示した。この再開はその後の明示指示による。

局所attempt-004はexit0、内部参照5件・拒否9件が合格。queue-reference-evidence-attempt-004.jsonへ実純粋builderと宣言path・物理名・SHAの対応を保存。これは参照検査の局所fixtureであり、内容判断の受理・通常complete・製造資格ではない。通常接続の新attempt-004へそのまま進む。


## v005 §12 通常attempt-004：内部参照成立・時計参照の新しい停止

source/STTの実claim・PUT・complete→実index/factory→探索／採否／保持→計画completeは成功。新要求からSHAを作り、目的全文は3判断へ一致した。探索・採否・保持の内部参照5件を保存registryと実bytesへ照合し、計画の通常登録前検査も通過。旧candidate-set参照不整合はこの新attemptで解消した。queue-integration-evidence-attempt-004.jsonは途中失敗も保存し、completed=[]を維持。局所attempt-004の5参照／拒否9件と通常経路の部分成功を区別する。

次のvalidate_digest_planは正規登録計画を実再読し、非連続keepの4区間・既存時計検査・製造job形状検査へ進んだ。4出力JSONを保存したが、消費記録を正式JSONへする時点で時計結果の参照に未定義の版情報が入り、保存前に拒否された。工程はfailed、消費記録と薄い検証成果物／OutputEntityは未登録。この失敗を予定されたmax-steps停止や元発話の語句と混同しない。

原因は版情報を持たない純粋時計結果（status／violations／mappings）を新consumerが一律に版付きJSON参照へしたこと。内容・時計の計算結果やserializerを緩める問題ではない。queue-clock-binding-failure-attempt-004.jsonへ4出力のSHA／版の有無・実所有者3鎖・内部参照対応を保存。製品4／設営6を維持し、追加製品修正は未適用。

推奨する個別一差分は、時計結果だけを版なしbytes参照にして薄い検証成果物の同じ参照検査を合わせること。runner消費moduleとsharedの薄い成果物moduleの二pathだけ、3JSON参照と既存時計bytesを維持。queue-clock-binding-followup-request.mdへ具体案を保存し、AGENTSの軽微技術判断規則による相談役の自動承認へGPT_DECISIONで返す。Codex自己承認・一般枠リセット・他の欠陥追加は行わない。

未実施：validate complete、upload／worker・backend別root／転送先だけの別process消費、MP4／inspection未提供、通常queueの否定・Clip回帰。今回製品file変更0のため01ad1e54時の全対象型検査結果は保持し、新しい型検査の実行と称さない。字幕／演出未接続・動画未承認・人間品質pending、ID9-PD-01/02は維持。外部推論／費用／新素材／STT／inspection／動画／本番／公開・人間作業0。


停止時の別process確認：実registered planを現行readerで再構築し、保存計画と完全一致。24参照データと内部参照5件を確認し、provider再実行0・state不変。保存された消費4出力のSHAと、旧attempt-003の3保存fileのSHA不変を確認。queue-clock-stop-readback-attempt-004.jsonへ保存。消費completeは未成立のまま。今回の隔離backend・runner・試験親processは終了済み、既存サービス操作0。

Git基準はmain/local/origin 9f031229。§12の設営4行差分と失敗／局所合格／別process証拠・担当共通状態の9fileだけを明示stageし、通常監査checkpoint commit/push後に相談役へGPT_DECISIONで直接提出する。製品コード追加修正は0、累積は製品4／設営6。自動承認の具体的範囲が返るまでCodexが例外を自己適用しない。

## 時計参照追補の受領・適用 checkpoint（2026-10-01）

相談役保存HEAD `8cbde0b9359ab090ab30561862d49dcfd83b1e0a`へ他者差分を保持してfast-forward。main／受領時Git clean。時計参照追補全文・親v005・AGENTSの相談役自動承認節を確認した。実行metadataのモデル表記は `gpt-6.1-sol`。モデル比較・旧成果再生成は行わない。

実行前に失敗attempt-004の実4出力を再読し、採用・編集・製造入力には版がある一方、時計結果には版がないことを照合した。時計結果は1,610 bytes、SHA `7038fdd9db7a2aff035a178b07001eb631e20bfacd041515aba5f02bbec47271`。旧failed stateと4出力を変更しない。稼働中backend／runner／watcherはprocess一覧で観測されず、隔離を確認した。

許可された二pathだけに時計byte参照と既存byte検査を適用した。時計本文・計算・serializer・他JSON参照・null・admissionを維持する。同一欠陥の製品修正累積 **5**、設営累積 **6**。一般上限と履歴は変更しない。対象試験／新attemptの通常消費completeはこのcheckpoint時点では未確認。次は時計参照の局所試験、その後通常キュー検証。

## 時計参照修正の検証結果・容量不足で中断（attempt-005）

| 確認 | 実結果 |
|---|---|
| 局所参照 | 15検査exit0。時計byte保存／再読、欠損field・別参照・架空版・欠損bytes・改変拒否、他3JSONの版必須、未提供のnull／理由条件 |
| 型検査 | shared build、backend、runner（Remotion含む）、clientすべてexit0 |
| 通常local JSON | 実APIの下書き／承認→source/STT実claim・PUT・complete→実index/factoryの3判断→計画complete→検証の実消費complete。全文意図・要求SHAを対応する通信しない新回答へ渡した |
| 消費の参照 | 時計はbyte参照、消費記録／編集／製造入力は版付きJSON。元4区間・時計SHA `7038fdd9db7a2aff035a178b07001eb631e20bfacd041515aba5f02bbec47271` は同条件の旧attempt-004と一致 |
| 別process再読 | 通常の消費readerで1完成経路を再構築、provider不要。旧96保護file確認。upload転送先の再読とは区別する |
| 通常upload | source/STT登録後、素材独立copy中ENOSPCで計画failed。計画／検証FileRef未登録、次工程queued。空き1.9GiB、素材4,803,412,827 bytes |
| 未実施 | upload／分離root／転送先のみ再読、MP4／inspection未提供の通常complete、通常否定・Clip回帰 |

新しい試験作用を停止し、今回の試験親と二backendのみSIGTERM（親exit143）。通常index子processは停止前に既に観測されなかった。stdout文言を成否判定には使っていない。試験全体は未完了であり、時計修正・local成立を取り消さない。累積は製品5／設営6、容量不足への追加修正・削除は行わない。

[15参照検査](queue-clock-reference-evidence-attempt-005.json)、[部分接続](queue-integration-evidence-attempt-005.json)、[容量停止現物](queue-capacity-stop-evidence-attempt-005.json)、[停止後再読／保全](queue-clock-capacity-readback-attempt-005.json)、[相談役への一点](queue-capacity-followup-request.md)。旧attempt-004の失敗state・4出力、既存Git管理のqueue証拠は基準HEADと不変。保護96fileに含まれない業務stateの新しい全repo棚卸しは行わず、実業務への作用はない。

ID9-PD-01/02未承認、字幕演出未接続、動画許可未承認、人間品質pending維持。外部推論・費用・新素材・取得・STT実行・inspection実行・動画製造0。相談役へGPT_DECISIONで容量準備を返す。報告送信表示はcommit/push後に専用Edgeで確認する。受領記録だけの再commit・人間転記は要求しない。

## 本人承認済みの検証用コピー整理：受領・削除前checkpoint

2026-10-01：mainを相談役保存HEAD `9aaa5f5b1b6259fce96e66ee4dad3cf8469d4a58`へ他者変更を保持して同期し、START_HERE・HANDOVER全文・[削除正本](../../work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_STORAGE_CLEANUP.md)・現行AGENTSを確認。本人原文「また容量が問題になってるのか。SSD用意するから一旦削除して」に基づく一回の容量整理を受領した。Codex2単独、main／受領時clean、モデル表記は同じセッションの `gpt-6.1-sol`。旧成果再生成・モデル比較・Codex1起動0。

試験の書込みprocessは観測されず、保持元と候補のopen-file確認でも利用中fileを観測しなかった。既存の容量調査とENOSPC記録を再利用し、request-intent系試験領域から8本の独立した素材コピーを個別確認する。symlink・hardlink・Git管理fileを削除対象に含めない。失敗uploadの指定先は現在存在せず、削除済みと装わない。元素材・書き起こし・inspection、完成／確認用媒体、全判断・要求／回答・state・ログ・旧検査証拠を保持する。

[一回実行script](queue-storage-cleanup-20261001-v001.py)は明示8pathだけを対象に、実size／stream SHA・保存済み参照・保持元・使用状況を検査して[削除前一覧と実行結果](queue-storage-cleanup-20261001-v001.json)へ保存する。削除前一覧の通常commit/pushを確認してから同じ一覧だけを削除し、削除直前のidentity確認、削除後の空きと保全を記録する。このcheckpoint時点では実削除未実施。本人への一覧再承認は要求しない。

先行容量preflightの設営7回目は未適用、製品累積5／設営累積6を維持。今回の本人承認による削除は一般修正枠の変更・リセットではない。大容量copy／upload／MP4は再開せず、SSDの接続・移行先・利用開始を推測しない。旧技術受理は履歴として保持し、削除する試験コピーに依存する旧runtimeの即時再読は認定しない。

削除前検査の実結果：8本すべて4,803,412,827 bytes・SHA `504650457fc6650bf27d6a6094402add0b684c5f32977cde27e201fe4c40a6c4`で保持元素材と一致、合計38,427,302,616 bytes（35.79GiB）。各fileは別inode・単一link・通常file、Git管理外、利用中0。保存済み33参照で複製の由来と削除後の再作成対象を記録。旧binding／state／Git管理のJSON証拠69件のSHAと、その他runtime file634件のmetadata集計を保存した。保持元3fileの実SHAも一致。調査時の同volume空き2,161,881,088 bytes。

整理scriptの初回は旧attempt-002の実参照形状の照合だけでexit1となり、削除0。当該保存pathをそのまま物理fileへ対応させて一覧作成はexit0となった。初回の実stream SHA9件を、先行inode／size・更新時刻と再確認して再利用し、残り2素材を実hashした。製品reader／validatorの変更や旧参照の書換えではない。削除前記録は約40KB、新たな大容量backupなし。

## 検証用コピー削除の完了・容量回復（2026-10-01）

削除前一覧を `04c21bfdeccde7210193d731bcf205f4ea19a03e` として通常commit/pushし、main／origin一致・cleanを確認してから個別削除を実施した。実行はexit0。8本を `retired-by-user-approved-cleanup` と記録し、全8pathの不存在を別processで確認した。未削除の適格候補0。失敗uploadのpartial指定先はもともと不存在のため削除件数0、旧ENOSPC証拠を保持した。

| 実測項目 | 結果 |
|---|---|
| 削除件数／論理量 | 8本／38,427,302,616 bytes（35.79GiB） |
| 削除直前の同volume空き | 2,145,939,456 bytes（2.00GiB）、06:01:30 UTC |
| 削除直後の同volume空き | 40,604,250,112 bytes（37.82GiB）、06:01:38 UTC |
| volume全体の実空き増加 | 38,458,310,656 bytes（35.82GiB）。論理削除量とは別の観測値 |
| 元入力の保全 | 元素材・書き起こし・inspectionの同一identity／size維持。削除前の実SHAを再利用 |
| 旧記録の保全 | 旧binding／state／Git管理JSON証拠69件のSHA不変 |
| その他の試験file | 634件のpath・identity／size等のmetadata集計不変 |

完成／確認用媒体・他領域・他担当file・業務state・Git管理の旧原本へ削除作用0。旧proof／成功・失敗stateの書換え0。削除前情報を残して結果を[軽量記録](queue-storage-cleanup-20261001-v001.json)へ追記した。旧96保護fileの全走査・旧全動画QC・111試験・人間レビューは再実行しない。製品code変更0のため既存型検査の再実行は不要、今回の検証は削除条件・不存在・保持元／旧記録不変・空き実測に限る。

削除した素材8本を使う保存済み33参照は、保持元から対応するbytesを再作成するまで旧runtimeとしてそのまま再読できない。旧技術受理は過去時点の事実として維持するが、runtime全体の復元・即時再読合格へ読み替えない。書き起こし・inspection・計画・要求／回答・採否／保持・時計4出力・state・ログは残っている。

大容量copy／upload／MP4は再開0、SSD探索・移行・format・外部転送0。製品5／設営6、先行preflight設営7は未適用、一般枠・履歴リセット0。v005のupload／分離root／転送先再読、MP4／inspection未提供の通常complete、通常否定・Clip回帰は未完了のまま。ID9-PD-01/02未承認、字幕演出未接続、動画許可未承認、人間品質pending維持。次の一点は相談役による残検証の具体的な再開順・条件の指示であり、容量回復だけで大容量工程を再開しない。

担当fileのみの通常commit/push・clean確認後、Codex2専用EdgeのZEV Build Loopへ `AUDIT_ONLY＋NEXT_REQUEST` で直接報告する。受領だけの再commit・終了連絡・人間転記を要求しない。

削除後記録の別process再読もexit0。push済み削除前データの全fieldは進捗status以外不変、旧進捗statusも別fieldへ保持した。8path不存在・保持元3fileの同一identity・旧証拠69件SHA・その他634fileのmetadata対応を再確認。これは整理記録の保存再読であり、素材を削除した旧runtimeの通常reader合格ではない。

## 媒体なし通常入力拒否・Clip回帰：再開・設営7 checkpoint

2026-10-01：本人の「キックしろ」に基づく相談役のcontinueを受領し、最新main `6f72ce8ac5b5a53c5337dc686b410acb3c074e24`へ他者変更を保持して同期。START_HERE・HANDOVER v019全文・媒体なし回帰正本を確認した。同じCodex2、受領時main／Git clean、同じ試験の稼働なし、モデル表記gpt-6.1-sol。相談役応答待ちは終了し、容量整理・旧媒体／旧111試験を再実行しない。

目的は不正・未承認の依頼を通常API／storeで拒否し、Clip7工程・Digest4工程と目的／条件、既存人間確認ゲートを維持していることの検証。新しい[媒体なし専用入口](queue-no-media-regression-test.mts)一経路を追加し、先行承認済みの設営累積7回目として適用した。製品5回目は不変、一般上限・履歴リセット0。既存queue-integration-test.mtsの引数なしrunと通常runnerを呼ばず、既存control router／通常store・認証・auto-runner無効設定を使う。新しい小stateだけを別processで再読し、ゲートのメモリfixtureは通常storeへ保存しない。このcheckpoint時点の実試験結果は未確認。

新規人間品質Pending追加0、既存ID9-PD-01/02未承認・字幕演出未接続・動画許可未承認・人間品質pendingを維持。媒体read／hash／copy／PUT／complete・削除コピー復元・追加削除・大容量upload・SSD操作・外部推論・費用・動画製造0の範囲で進める。

## 媒体なしattempt-001：通常API成立・局所fixtureの設営停止

実コマンド `node --import ./runner/node_modules/tsx/dist/loader.mjs docs/reports/request-intent-connection-20261001/queue-no-media-regression-test.mts no-media` はexit1。新試験のsyntax transpileはexit0、既存Node v20.19.6／tsx・shared dist／control router／通常storeを使用した。製品code変更0なので全repo型検査は再実行していない。

[失敗現物と部分結果](queue-no-media-regression-evidence-v001.json)に38検査を保存：入口1、通常API／store28、制御関数メモリ9。引数なし入口の拒否、現行認証境界3、制作系統欠損／未知・目的空／空白と入力条件の拒否9、未承認2下書きの命令0／nextなし／不存在claim404、正常承認のClip7工程・各kind／Digest4工程と依存順、目的全文・改行／条件、重複承認409、未完了依存9工程の直接claim409、source最初の2命令だけ認証済み実claimを確認した。素材処理・completeは行わず、保存stateは2命令running／9命令waiting、成功命令・FileRef・Output・人間確認／承認0。

局所制御では目的・条件・素材参照・制作系統・policy・依存不存在／工程違い／別draftの不一致拒否9件を確認した。次の「下書き未承認」fixtureが検査対象を配列先頭で選び、Digest下書きを変更していた。Clip命令の承認元は別の下書きなので、既存関数は正当に一致したまま。例外を期待したtestが失敗したもので、製品の未承認拒否が壊れている証拠ではない。

別processの原因照合で、通常storeの下書き先頭がDigest・対象Clipが2番目であることを確認。先頭だけの変更は対象Clip命令に作用せず、同じメモリ上で命令に束縛された依頼IDを選んで未承認へ変えると、現行の承認入力検査は拒否した。test本体へこの修正は未適用。通常storeの読取も通り、stateは26,434 bytes、SHA `f3099a3aa295522196b1d31fbecebdddc32ad27a63f2eaa14cc27634c7759294` のまま不変。新runtimeのfileはこの小state1件のみ。旧report証拠6件SHAも不変。試験／backend processの残存なし。

未完了：残る5件の承認入力否定、確認生成元3件・依存を満たした独立ゲート3件、完成時API応答と保存stateの完全対照による別process再読、対象試験全体の合格。停止後の保存state読取を完成時の保存再読へ合算しない。旧localや旧15／111試験も今回へ合算しない。

最小推奨案を同JSONへ未適用で保存した。局所fixtureの未承認・重複・工程列の3caseだけ、命令に束縛された依頼IDで下書きを選ぶ。失敗attempt-001・v001証拠・code SHAを不変で保持し、attempt-002／別証拠filenameで同じ媒体なし入口を再実行する。目的・入力／保存・認証・通常route・制御関数・期待値・製品は変更しない。設営累積7適用後に判明した別の試験欠陥なので、[媒体なし正本§3](../../work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261001_v005_NO_MEDIA_REGRESSION.md)の「別の試験欠陥・製品変更が必要なら証拠と最小差分をGPT_DECISIONへ返し」に従い、同じ欠陥の局所修正を設営8として個別例外判断へ提出する。Codexは自己承認しない。

製品5／設営7を維持、追加修正未適用・正式再実行0、一般上限・累積リセット0。新素材read／hash／copy／PUT・source/STT complete・通常runner・削除コピー復元・追加削除・大容量upload・SSD操作・外部推論・費用・動画製造0。ID9-PD-01/02未承認・字幕演出未接続・動画許可未承認・人間品質pending、新規人間Pending0。

範囲内checkpointを担当のみ通常commit/pushして、同じCodex2専用EdgeからZEV Build LoopへGPT_DECISIONで直接報告する。本人への再確認・転記・視聴／採点・Codex1起動は要求しない。媒体なし回帰は完了とは報告しない。


## 媒体なしattempt-002：設営8の受領・適用checkpoint

2026-10-01（JST）：相談役の個別承認・再開指示をmain `5cb6c94c213390abefc187ce0553c8bcd2f9aab3`へfast-forward同期して受領。START_HERE、HANDOVER v021全文、媒体なし正本全文と§6、現行AGENTS・監査／人間確認方針、対象testを確認。同じCodex2、受領時Git clean、実行環境のモデル表記gpt-6.1-sol。既読DECISIONSとAGENTSは前checkpointから変更なし。通常依頼の拒否・Clip/Digest工程と確認条件を媒体なしで確認する目的を維持する。

既存test一pathだけの未承認・下書き重複・工程列変更を、対象命令の依頼IDで一意の下書きへ作用させるよう修正。基準が承認元と一致すること、メモリ内の配列逆順でも同じ対象が選ばれること、3caseが他の下書きを変更しないことを限定確認する。設営累積8回目を適用、製品5回は不変、一般上限・履歴リセット0。通常caller・製品制御関数・認証・期待値・人間判断の意味は変更しない。

新runtimeと新証拠は§6指定のattempt-002へ固定し、親／隔離backend／別process readerが共通の参照先を使う。旧attempt-001のstate SHA `f3099a3aa295522196b1d31fbecebdddc32ad27a63f2eaa14cc27634c7759294`、旧失敗証拠SHA `946b023b2633487ecf23d5812f027b12fee066157f1126550ecc7a6576598e33`、固定Git失敗版test SHA `107ab6270807c3b29d98be147852415746bd7d028d1fa683711f85821cdf533f`を実行前に確認・保存。旧証拠／旧stateは上書きせず、旧reader・媒体内容には触れない。このcheckpoint時点では新実行結果は未確認。受領記録だけのcommitは行わず、実試験・保存まで続行する。


## 媒体なしattempt-002：限定検証完了

新しい一系列を明示no-media入口で実行し、親process exit0、隔離backend終了0、別processの通常store reader exit0。52結果すべてpassed：入口1／通常API-store28／対象下書き選択1／制御関数メモリ20／保存・保全2。旧attempt-001の38結果との合算ではない。[新実結果](queue-no-media-regression-evidence-attempt-002.json)に実route・HTTP状態・期待値・結果、実装SHA、実行時test SHAと修正履歴を保存した。

今回の修正では、対象命令の承認元が一意に存在すること、逆順のメモリ配列でも同じ下書きを選ぶこと、変更が他の下書きに作用しないことが成立した。前回未実施の5否定（未承認・不存在・重複・工程列変更・Clip外工程）を含む承認入力14否定で、実sharedの承認入力検査が例外を返し、実行可能判定もfalse。正常入力の目的改行全文・条件・素材参照・制作系統・policy・依存検査の意味は変更していない。

Clipの確認生成元3件と独立ゲート3件も成立。テーマ提案→テーマ選択確認、構成作成→場面確認、調整→生成前確認を生成する既存対応を維持した。後段の構成／編集／動画命令に対し、依存成功はメモリ内だけで作り、未回答・回答待ち・却下・修正要求では実行不可、対応する確認の承認で実行可能。別依頼・別確認種類の承認と最新の回答待ちは実行不可。生成前承認のpolicyがfalseでも、対応する人間確認を単独で免除しない。これは実制御関数の単体回帰で、実際の人間品質承認・動画E2Eではない。

通常APIの51通信はGET／POSTのみ。認証境界、9入力拒否で不正な業務オブジェクト増殖なし、未承認で命令0、Clip7／Digest4工程のkind・依存順・目的改行全文・条件、2依頼の重複承認409、未完了依存9工程のclaim409、最初のsource命令2件だけ実claimを確認した。通常storeは11命令running2／waiting9、成功0／成果物0／人間確認・承認0で終了。成功工程や架空成果物の注入、source/STT処理・complete、通常runner起動は0。

完成時GET応答を保存し、隔離backendを通常終了してから、新processが実loadState／readStateSnapshotで全stateを完全対照した。保存bytesは不変、state26,434 bytes／SHA `edfe0338610c0f86aa38023592e2e4010a2ec4d2c5859279ae1289d1b2e2c74a`。新領域はstate・API応答・backend log・reader proofの4小file、増加53,218 bytes。停止後診断の流用ではない。自分の試験／backend process残存0。

旧report証拠6件と旧attempt-001のstate／v001失敗証拠は前後のsize・SHAが一致。失敗時testはb47999f7固定Git版と旧記録のSHAが一致して保持され、新しいtestの改訂と区別する。製品・通常caller・認証・shared distを含む実装SHA5件はattempt-001と同一、製品code差分0。新test自身の実実行と関数／型の対応・diff --checkを確認し、製品変更なしの全repo型検査・旧15／111試験・全動画QC・人間レビューは再実行しない。

今回媒体なし正本§2／§6の残件はすべて検証完了。設営8適用／製品5を維持、追加修正0、一般上限・履歴リセット0。素材read/hash/copy/PUT、source/STT complete、通常runner、大容量upload、SSD操作、削除コピー復元・追加削除、外部推論・費用・動画製造0。新規人間Pending0、ID9-PD-01/02未承認・字幕演出未接続・動画許可未承認・人間品質pendingを維持する。

v005全体は未完了。upload転送／worker-backend分離root／転送先のみ消費再読、MP4直接登録／inspection未提供の通常complete、目的2件の全3判断はnot-run。相談役へ次の一件として、保留中の転送検証の実確認済み保存先・必要容量・再開条件の具体化を依頼する。SSDは接続先も利用開始も未確認で、今回操作していない。大容量経路の自動再開はしない。

現在地とHANDOVERを同期し、担当5fileだけ明示stage・通常main commit/push・Git clean確認後、Codex2専用Edgeから `AUDIT_ONLY＋NEXT_REQUEST｜9. 通常入力拒否・Clip回帰（媒体コピーなし）` を直接送信する。本人の視聴／採点／転記、Codex1起動、受領だけの再commitは不要。

## 2026-10-01 upload-json単独指示受領・設営9・実行前checkpoint

相談役の媒体なし52件限定受理と容量preflight §6を同じ専用Edgeで受領し、mainを82c244729409ecd4bbd177ab0611ddaf86996a99へ同期した。upload-json一件だけの明示入口と無作用preflightを設営累積9として適用、製品5は不変。通常scenario本文・API／runner／factory／PUT／GET／固定判断・内容／時計検査は変更しない。結果名を新attempt-006のupload単独証拠へ追従し、local・MP4・未提供・目的2件はnot-runにした。

preflight境界4検査exit0。source本文read／copy／PUTなしでsize・device・現在空きと新root不存在を確認。3rootは同device16777234、空き40,662,228,992 bytes、必要19,213,651,308 bytes（相談役の今回限定4本条件）、通過。実走入口でも直前に再測定する。旧request-intent小JSON／state／ログと証拠の前hash、製品8pathの前hash、削除済みpathを軽量記録へ保存済み。受領だけのcommitは作らず、これから通常upload系列へ進む。現在のEdge表示は極高、環境Node v20.19.6。外部推論／費用0、ID9-PD-01/02と人間品質pending等は維持。

## 2026-10-01 attempt-006 upload系列成立・保存後readerの局所設営停止

新upload-json単独attemptは、旧source/STTの通常claim／PUT／complete、実index／factoryの3判断、計画の実upload／complete、workerとbackendから分離したreceiverでのdownload／消費／completeまで成立した。新stateの4命令すべてsucceeded、4 OutputEntity／FileRefの相互参照と成果物所有者一致、人間確認0。計画24データ参照、入力全文の3判断到達、keep/drop/keepから4編集区間、既存時計検査とadmission（字幕演出未接続・動画許可未承認・人間品質pending）を通常処理で確認。生成元のsource JSONと実動画SHAは別に束縛されている。判断回答は新要求SHAに対応する通信しないfixture、実AI品質の認定ではない。

実prepare runner exit1は予定したmax-steps=1停止で、計画stateはsucceeded。receiver runnerはexit0。receiverの既存guardはworker・元素材・保存STT・inspectionへの直接readを禁止した状態で消費できた。実API／runner／consumer／PUT／GETや製品8pathは変更していない。親試験の保存statusはpassedで2結果、toolは終了時exit codeを返していないため親exit0の実測とは報告しない。自分の試験／runner／backend残存0をprocess一覧で確認した。

容量：直前空き40,661,536,768 bytes→worker/backend転送後31,008,292,864→receiver消費後26,188,054,528。新source-size実体は0→2→3本、合計14,410,238,481 bytesで見積りと一致。停止保存時の新runtimeは90file・論理14,435,157,718 bytes、割当14,464,991,232 bytes、空き26,188,337,152 bytes。空き差は他のfilesystem変動を含む実測で、排他的な使用量や共有blockは断定しない。新copyは保持、追加削除・SSD操作0。

**終了後にもう一度保存計画を再構築する追加reader試験はexit1で停止した。** 実通常storeの非同期snapshot読取にawaitを付けず、Promiseをstateとして扱ったため、命令一覧の検索時にTypeErrorとなった。消費readerを呼ぶ前の試験側不具合で、製品の転送／消費欠陥とは認定しない。失敗code全文・SHAと実エラー、未適用一行案（非同期snapshot読取をawaitする）を[局所失敗証拠](queue-upload-readback-setup-failure-attempt-006.json)へ固定。設営9適用済み、製品5不変。追加修正は未適用。既存枠を自己承認で増やさず、相談役にこの一行を設営10として個別判断依頼する。再開は既存attempt-006の保存後receiver-only再読だけを推奨し、素材copy／PUT／通常runner／大容量系列の再実行は不要。

旧request-intent小JSON／state／ログとreport証拠669件の前後size／SHA不変、製品8path SHA不変、削除済み8pathは不存在のまま。旧成功／失敗proofと33参照は復元していない。新state21,458 bytes／SHA335243e67c81bae5d4ae3ebbcb9035d9344ee3b7bde99282114c3d3eae042f65。新[転送証拠](queue-upload-transfer-evidence-attempt-006.json)と局所停止を区別し、保存後追加再読を合格へ足していない。

現在は追加作用停止。upload通常系列は成立したが、今回の保存後再読は未確認として完了報告にはせずGPT_DECISIONする。local-json再製造・MP4直接登録・inspection未提供通常complete・目的2件の全3判断はnot-run。前回52検査や旧15／111／動画QC／人間レビューは再実行0。取得・STT／inspection処理・外部推論・費用・動画・新UI・本番・正式採用・公開0。ID9-PD-01/02未承認等は維持。担当fileだけ通常commit/pushし、Codex2専用Edgeで直接相談役へ返す。

## 2026-10-01 設営10受領・保存後再読の実行前checkpoint

main f0df4fb629eef60b6b6e05bc6964f81007ce0cf8へ他者変更を保持して同期し、upload readback追補全文を受領。失敗証拠内の実code/SHAと旧一時scriptを照合し、一致を確認した。保存後readerへ非同期snapshotを待つawait一語だけを適用、設営累積10・製品5。出力小proofの別filenameへの追従を除き、対象state／命令／FileRef／receiver root／実consumer／SHA／deepEqual／guard条件は不変。失敗codeと旧証拠は書き換えない。新readerは別processで起動し、既存attempt-006だけを再読する。旧90fileの小JSON SHAと3素材copyのmetadata、stateと旧証拠SHAを実行前保存。backend／通常runner／factory／upload／download・再判断・再登録・completeは起動しない。今回の目的は保存物だけで同じ検証成果物を再構築できることの実証であり、v005全体・動画品質の完成とはしない。

## 2026-10-01 設営10適用後：guard拒否確認の新しい局所設営停止

承認されたawait一語を適用し、新別process readerを実行した。実loadStateとawait付きreadStateSnapshotで既存attempt-006の保存stateを取得し、検証命令succeeded、receiverの保存済み検証成果物8,540 bytesとFileRef SHA61090777442a301927129d30ae9cccaa99c14a78dfd04db03d9d03daaf184134の一致まで進んだ。修正意味は非同期読取を待つ一語だけ、別proof名への追従以外の対象と検査条件を維持した。製品5／設営10、一般枠・履歴リセット0。

**新readerは最初のguard拒否probeでexit1、実consumerの再構築前で停止した。** worker直接readを拒否する既存fs wrapperは同期的にthrowする。試験側はその呼出を先に評価してPromiseの拒否検査へ渡していたため、検査関数に渡る前に正しい拒否が外へ出た。guardが破られた製品欠陥とは認定せず、guard自体は緩和していない。まだ実consumer／保存artifact deepEqual／再構築中の禁止read 0／残り4probeの合格は未確認。失敗code全文・SHA・実exit／エラー・一語差分・未適用最小案を[設営10失敗証拠](queue-upload-readback-setup010-failure-attempt-006.json)へ保存した。

最小案は既存の拒否検査へasync callbackを渡し、その中で同じreadを呼ぶ一行だけ。拒否error pattern、5禁止path、guard、consumer、SHAとdeepEqual条件を変えず、同期throwをPromiseの拒否として正しく検査する。**この修正は未適用**、次の設営11として相談役の個別判断へ返す。自己承認で枠を増やさない。保存物だけのreader再実行で足り、backend・通常runner・factory・upload／download・大容量copyを再実行する理由はない。

attempt-006の旧90fileは小JSON SHAと全fileのsize／inode／device／更新時刻／割当bytesが前後不変、旧669小証拠SHA不変、旧転送証拠とawait不足の旧失敗証拠2件もSHA不変。製品8path SHA不変。新3copyは保持、削除済み8path不存在、state21,458 bytes／SHA335243e67c81bae5d4ae3ebbcb9035d9344ee3b7bde99282114c3d3eae042f65不変。新runtime proofは未生成、大容量file生成0。旧一時失敗scriptも変更していない。

追加作用停止、保存後receiver-only再構築は未完了。backend／通常runner／factory／upload／download・再判断・再登録・complete・state更新0。MP4・inspection未提供・目的2件の全3判断はnot-run、SSD・追加削除・外部推論・費用・動画・本番・正式採用・公開0。旧52／15／111・全動画QC・人間レビューや型検査は製品無変更なので再実行しない。ID9-PD-01/02、字幕演出未接続、動画許可未承認、人間品質pendingを維持。本人への視聴・採点・転記は要求せず、同じ専用EdgeへGPT_DECISIONする。

## 2026-10-01 設営11受領・保存後再読の実行前checkpoint

main bf8814a1へ他者変更を保持して同期し、相談役保存2530d966のguard-probe追補全文を受領。設営10失敗code全文／SHAと旧一時scriptの一致を確認し、拒否probeの同じreadをasync callback内で呼ぶ一行だけを新readerへ適用した。別proof filenameへの追従を除き、5禁止path、guard本文、期待error、実consumer、入力、SHA比較、deepEqual、最終成功条件は不変。製品5／設営11、一般枠・履歴リセット0。旧90runtime fileの小SHAと全metadata、旧669小証拠、旧転送／await失敗／設営10失敗の3証拠、製品8path、削除8pathの不在を実行前に照合・保存。attempt-006保存物だけの別processを実行し、backend／runner／factory／upload／download・再判断・登録・complete・state更新は起動しない。受領だけのcommitは作らず、このまま再読検証へ進む。

## 2026-10-01 設営11適用・upload保存後receiver-only再構築の限定完了

相談役の個別承認を保存bf8814a1で受領し、拒否probeの一行を修正して別process readerを実行した。実process exit0、5禁止pathの拒否probeすべて成立、実consumerによる保存物からの再構築と保存済み検証成果物のdeepEqualが一致。再構築中の禁止readは0。保存stateの実取得からconsumer再構築まで同じ一系列で通過した。設営11適用・製品5、一般上限と過去履歴は不変。専用Edgeの最終続行返信も確認し、相談役の非競合CURRENT_GOAL更新を9225e894へ同期した。許可・実行対象を変える差分はない。

[新実証拠](queue-upload-receiver-readback-evidence-attempt-006.json)に実reader code全文・SHA、意味差分一行、実command／exit0／stdout、小proofの全文／SHA、要求ごとの完了対照と旧物保全を保存した。新reader SHAはe13291f2519a540ab13319e425e7fc8e049ed8a11c8dca0795a7d19353dd2315。実行commandは `node --import ./runner/node_modules/tsx/dist/loader.mjs /private/tmp/codex2-upload-receiver-read-attempt006-setup011.mts`。通常runner全体を起動せず、製品側の保存消費readerを直接呼ぶ既存試験を維持した。

| 今回の完了条件 | 実証 |
|---|---|
| 保存stateを実通常storeで取得 | 実loadStateとawait付きsnapshot取得が成立、元の4命令すべてsucceeded |
| 計画検証命令の成功を確認 | 対象依頼IDのvalidate命令を選択して成功状態を確認 |
| 成果物参照とreceiver保存bytesのSHA一致 | 検証成果物8,540 bytes、SHA61090777442a301927129d30ae9cccaa99c14a78dfd04db03d9d03daaf184134 |
| 5禁止pathの直接readを拒否 | worker、元素材、保存STT、元inspection、backend artifactsの全probeで期待した拒否が成立 |
| receiver側の保存先だけから再構築 | 実readConsumedDigestPlanV001が保存計画・内部参照・データ・消費記録を検査して再構築 |
| 保存済み成果物と完全一致 | 実consumerの再構築成果物と保存済み実行入力のdeepEqual成立 |
| 再構築中の禁止読取0 | probe後の拒否回数が増えていないことをassertで確認、0 |
| 再判断・再登録・complete・state更新なし | 読取専用consumer、provider/API/runner起動なし、旧90fileとstateのbytes／metadata不変 |
| 新しい小proofと旧失敗現物の保全 | 新proofは別filenameでwx保存、旧669小証拠と旧転送／2失敗証拠3件が不変 |

新proofはattempt-006内のreceiver-readback-proof-setup-011.json、1,162 bytes／SHA0b61eef381f59fb14a1318a7e68caead3572606f9cf92c5dfce0d9409db49964、再構築4,565ms。旧90runtime fileは小SHAと全fileのsize／inode／device／mtime／ctime／割当metadataが一致し、追加はこの小proof1件だけ。state21,458 bytes／SHA335243e67c81bae5d4ae3ebbcb9035d9344ee3b7bde99282114c3d3eae042f65不変。旧669小証拠、旧転送・await失敗・設営10失敗3証拠のsize/SHAと旧失敗code SHA、製品8path SHA不変。新3素材copyは保持、削除済み8pathは不存在のまま。全repo棚卸し、容量調査、元素材の再hash・copy・PUTは実施していない。

実readerの前後で自分のbackend／通常runner／試験の残存なしを確認。backend／runner／factory／upload／download起動0、再判断・登録・complete・state更新0、大容量file追加0。旧52／15／111試験・全動画QC・人間レビューと製品無変更の型検査は再実行0。今回のreader実実行、記録の別process再読、差分検査に限定する。

これで今回のupload-json転送＋保存後receiver-only再構築は限定検証完了。旧親試験のtool終了code未返却という記録は変更せず、今回別process readerのexit0と区別する。v005全体完成ではない。MP4直接登録／inspection未提供の通常complete、目的2件の全3判断はnot-run。外部推論・費用・新素材・STT／inspection処理・動画・新UI・SSD・追加削除・本番・正式採用・公開0。ID9-PD-01/02未承認、字幕演出未接続、動画許可未承認、人間品質pendingを維持する。

次に進む一件は、相談役が残る通常登録枝（MP4直接登録／inspection未提供）の承認範囲と容量作用を具体化して選ぶこと。Codexは今回それらを起動しない。担当4fileのみ明示stage・通常main commit/push・Git clean確認後、専用EdgeからAUDIT_ONLY＋NEXT_REQUESTで限定完成監査と次指示を同じ会話へ送る。本人への視聴・採点・転記、Codex1起動、受領だけの再commitは不要。

## 2026-10-02 local-mp4指示受領・設営12・実行前checkpoint

同じ専用Edgeの監査と相談役保存e22a87c5の正本を受領し、main85b077a3へ他者変更を保持して同期。upload-json転送＋保存後再読は限定技術受理済み、Goalの当該保存再読も完了扱いにした。次は既存local-mp4 scenario一件だけで、MP4 bytes直接登録、inspection未提供、異なる目的の全3判断到達を検証する。明示入口・一copy用の無作用preflight・新attempt名／証拠名／実行metadataだけを設営12として適用、製品5不変。通常登録／runner／factory／消費／complete／固定回答／期待値、upload入口の実作用とpreflight helperは維持。

新入口のTypeScript5.9.3 syntax transpileはexit0、生成file0。preflight-onlyもexit0、同device16777234、source4,803,412,827 bytes、空き26,243,956,736 bytes、必要9,606,825,654 bytes（相談役が今回だけ指定した2本条件）を満たした。新attempt-007と新証拠は未作成、媒体read／PUT／backend起動0。旧669小証拠、attempt-006の91file、旧upload／失敗／成功5証拠・helper、製品8path、削除8pathの不在を実行前保存。受領だけのcommitは作らず、実走入口でも直前空きを再測定して新local-mp4系列へ進む。外部推論・費用・取得／STT／inspection処理・動画・SSD・追加削除・本番・公開0、ID9-PD-01/02と人間品質pending等は維持。

## 2026-10-02 local-mp4直接登録・inspection未提供の限定検証完了

専用Edgeで85b077a3の最終続行返信も確認した。設営12の入口と無作用preflightだけを適用、製品5不変。新attempt-007を一回実行し、実process exit0、通常4命令すべてsucceeded。計画工程のexit1は指定max-steps=1の予定停止で、計画の失敗ではないことを実stateと出力登録で確認。検証工程exit0。stdoutの語句から成否を判定していない。

実行command：`node --import ./runner/node_modules/tsx/dist/loader.mjs docs/reports/request-intent-connection-20261001/queue-integration-test.mts run attempt-007 local-mp4`。隔離backendの通常API／承認／next／claim／PUT／completeと実index／factory／Skillを使用した。判断通信だけを要求SHAに対応する通信しない回答へ置換し、入力経路と保存・検証を変更していない。source/STTの処理成功を証明するものではなく、旧保存物の通常登録を証明する。

| 今回の確認 | 実証 |
|---|---|
| 作用前の容量条件 | 実走直前の空き26,240,741,376 bytes、必要9,606,825,654 bytes、同volume、新path不存在を通過 |
| MP4直接登録 | video/mp4 4,803,412,827 bytes。元素材とPUT先とFileRefのSHA504650457fc6650bf27d6a6094402add0b684c5f32977cde27e201fe4c40a6c4が一致。JSON偽装なし |
| 正規登録と所有者 | source／STT／計画／検証の4組すべて、命令の完了結果→Output→FileRefの対応・所有者・kind・実size／SHAを照合 |
| 計画 | 素材由来はvideo-bytes、登録素材と実動画の参照が同じ。22データ参照と要求内部の参照を通常readerが再検証 |
| inspection未提供 | 保存計画のinspectionがnull。検証成果物のinspection／消費記録／編集／製造入力／時計がすべて明示null、未提供理由あり |
| 架空出力を生成しない | source inspection・消費記録・採用変換・編集・製造入力・時計の各fileは不存在。大容量新実体はPUT先MP4一件だけ |
| 異なる2目的 | 保存済みupload006と新MP4007の各探索・採否・保持の実要求bytes SHA／目的全文／対応回答SHAを6組照合。目的は異なり、旧回答SHAの付替えなし |
| 保存後の別process再読 | 実loadStateとawait付きsnapshot取得、実消費readerでinspection-missingを再構築、保存済み5,777 bytesの検証成果物とdeepEqual一致。state bytes不変、再判断・再登録・completeなし |
| 未承認境界 | 字幕演出未接続、動画許可未承認、人間品質pending。検証成功を動画実行資格へ変更しない |

[実走証拠](queue-local-mp4-no-inspection-evidence-attempt-007.json)は252,513 bytes、SHA5c9633a55e719305f9937daa1614370cda01191d8dec70cddc1faccf6f84c895。[別process再読・2目的・保全・親条件対照](queue-local-mp4-readback-cross-purpose-proof-attempt-007.json)はreader全文／SHA、実exit0、全4登録出力、実bytes、各目的の3要求と回答、旧物不変を保存する。実走証拠のcross-attempt未確認時点の記録は書換えず、後続proofで成立を示す。reader SHA4ebb64b5d51a44bf381535cbddfe4306b057c71f9f48bc23c876b769c85f4e28。

別process command：`node --import ./runner/node_modules/tsx/dist/loader.mjs /private/tmp/codex2-local-mp4-readback-attempt007.mts`、実exit0。保存stateと登録出力の検査・実消費readerによる再構築であり、通常runner／backendは停止後、再判断・再登録・complete・state更新0。再読proofと実行前保全一覧はattempt-007内へ小JSONとして別名wx保存。

旧669小証拠のsize／SHA、旧attempt-006の91fileの小SHAと全metadata、旧upload・2失敗・再読成功・容量helperの5file、製品8path SHAは前後不変。既存3copyは未再hash・未変更、削除済み8pathは不存在のまま。新MP4一件を保持し、追加削除やSSD操作は行っていない。登録後の空き21,414,846,464、計画後21,412,904,960、検証後21,423,218,688 bytes。新素材コピーの論理量とvolumeの空き変化を混同しない。古い削除済み33参照を含む旧runtime一式の即時再読が可能とは報告しない。

### 親v005完了条件の実証範囲と残件

| 親条件 | 対応する保存実績・今回の扱い |
|---|---|
| §8.1 通常承認・登録・2目的・MP4 | 旧local005／upload006のJSON登録2件と今回MP4007。旧local005の素材copyは整理済みで現在の即時再読資格とは区別。006／007の目的3判断は今回実bytesで照合 |
| §8.2 通常dispatch・転送・完了・消費 | 006の実upload4工程とreceiver-only再読、007のlocal4工程と保存後実reader再読。通常処理の実証 |
| §8.3 非連続保持・時計・別root・別process | 006の複数候補／keep-drop-keep／4区間・時計・転送先だけからの再構築、007の未提供枝と2目的。旧動画QCや内容判断を再実行していない |
| §8.4 入力・参照・不完全転送の拒否 | 現行52媒体なし、参照9拒否、時計15検査は保存済み合格。以前の準備27／消費15＋5の否定試験は旧内部版の履歴。所有者不一致、期限切れclaim、保存承認版／素材不一致、意図的な不完全uploadの完了拒否は現行経路の静的対応を確認したが、v005版での直接否定実行は未確認 |
| §8.5 Clip回帰・確認ゲート・admission | 現行52結果のClip7工程／Digest4工程、確認生成元3件と独立確認ゲート3件。006／007とも動画命令なし、admissionの不足を保持 |
| §8.6 旧保全・固定履歴・型検査 | 旧保存物保全・固定Git来歴は保持。製品SHAは60b959d9時のshared／backend／runner＋Remotion／client型検査合格版と不変。現行callerによる旧内部版／旧stateの拒否は静的確認、旧版否定の実行証拠とは分ける |

今回のMP4枝・inspection未提供・異なる2目的の3判断到達は限定検証完了。親v005の全否定条件が現行版で直接実行されたとは認定せず、**v005全体の技術完了候補はまだ提出しない**。新たな製品欠陥・試験失敗は観測なし。次の一件として、残る資格・旧版・不完全転送の拒否を大容量copy／素材PUTなしの小さい隔離試験で埋める範囲を相談役へ求める。歴史上の合格を取り消さず、製品修正や一般上限変更を提案していない。

製品5／設営12、一般枠・累積履歴リセット0。今回の構文transpile・無作用preflight・実走・実reader・保存証拠の別process照合を実施し、製品無変更の全型検査・旧52／15／111・全動画QC・人間レビューは再実行しない。外部推論・費用・新素材取得・STT／inspection処理・動画製造・新UI・本番・正式採用・公開0。ID9-PD-01/02未承認、人間品質pendingを維持。Codex1起動・他者タブ操作・本人への視聴／採点／転記要求0。担当6fileのみ明示stage・通常commit/push・Git clean確認後、同じ専用EdgeへAUDIT_ONLY＋NEXT_REQUESTを直接送る。

## 2026-10-02 現行否定資格指示受領・設営13・実行前checkpoint

local-mp4限定成果をf32d4523で通常pushし、Git clean／untracked0を確認、専用Edgeから完成監査＋次依頼を直接送信・表示確認した。相談役の最終返信で限定技術受理と次の現行否定資格指示を受領。同じセッションで79292676へmainを同期し、START_HERE、HANDOVER v031全文、[今回正本](../../work-orders/ZEV_REQUEST_INTENT_CONNECTION_20261002_v005_CURRENT_NEGATIVE_QUALIFICATION.md)全文を確認した。モデル実行表記gpt-6.1-sol、専用Edge表示極高、変更・比較0。

新しい否定試験一pathを設営13として用意した。対象は通常APIでのclaim所有者不一致・期限切れ回復、保存stateのメモリcloneによる承認入力／旧state拒否、登録依存の所有者／出力対応拒否、tiny JSONの版拒否、不完全転送の通常complete拒否。正のE2Eやsource/STT成功を作る試験ではない。試験側guardを製品import前に設定し、元・保存MP4のopen／read／streamと旧006／007への書込みを拒否する。製品5不変、一般枠・履歴リセット0。

syntax transpileはexit0・生成file0。preflightは実exit0、保存007の対象下書きdraft_iWiSs9jXaGXk2mzN9ifr5と計画命令agent_DP8CY1tvAZ9_asnnlywJXをIDで一意に照合、4実関数の存在、保存state／計画SHA、旧006／007の120fileと684小保護fileを確認した。新runtime／証拠不存在、媒体read試行0・旧書込み試行0、backend／通常runner／PUT起動0。設営13を適用して、このまま新隔離小試験へ進む。受領だけのcommit・人間確認・転記は不要。

## 2026-10-02 現行否定資格attempt-001：下書き作成HTTP期待値の設営停止

新[試験](queue-current-negative-qualification-test.mts)の実runはexit1。通常control routerで最初の下書きを作成した実応答はHTTP201だったが、試験helperがHTTP200を期待していた。製品側503行の `response.status(201).json({ draft, state });` と一致する正常応答を試験側が拒否しており、製品の資格拒否欠陥とは認定しない。作成応答を確認せず200とした設営の誤りだった。approveはまだ呼ばれず、claim・complete・各否定検査へ到達していない。合格結果0。

[実失敗証拠](queue-current-negative-qualification-evidence-v001.json)は書換えず保持。[停止後保全・試験全文／SHA・未適用最小案](queue-current-negative-qualification-setup-failure-v001.json)へ実command／exit1／error、routerの対応、停止state、旧物不変と残件を保存。失敗試験SHA53a4f8fc7548a08f57d489fcaeebaa554c67e08babdbfa4b7bfae562245afb96。新runtimeの状態はdraft1件、命令0、claim0、FileRef0、Output0、成功0。state1,789 bytes／SHAfd4b176867120d1f5f4a6bbac1ec132d4fbcb26c9612cd6804219419c723d4b0。新runtimeは実行前保全一覧とstateの2小file、262,031 bytesのみ。

今回のbackendはfinallyで停止し実exit0、親／backend／通常runner残存0。親preflightとbackendのguardは媒体read試行0・旧006／007書込み試行0。素材hash／copy／PUT、通常runner、外部推論・費用、STT／inspection処理・動画・SSD・削除0。旧684小保護fileのsize／SHA、旧006／007の120fileの小SHAと保存metadata、製品8path不変、削除8path不存在。metadataの時刻は旧保存と同じJavaScript Number精度で比較し、追加のns精度を主張しない。停止記録の補助整形では一度そのNumber精度をPython整数との直接比較にしたため保存前停止し、両側を同じ元精度へそろえて再照合した。試験本体の修正・再実行や旧物変更ではない。

**未適用の最小案**は、作成応答一箇所の期待値だけ200→201にすること。承認HTTP200、claim、拒否HTTP409／400、資格・版・SHA／bytes・出力不増加の期待値は変えない。旧attempt-001／v001失敗証拠・失敗時Git版を保持し、新attempt-002／v002証拠名／受領metadataへ追従して同じ否定試験を実行する案を、次の設営14として相談役へGPT_DECISIONする。Codexが例外を自己適用しない。累積は製品5／設営13、14は未承認・未適用、一般上限／履歴不変。

期限切れ回復、claim所有者、保存承認入力／旧state、登録依存所有者、旧・未知成果物版、旧準備版、不完全転送validator／通常complete、完成時別process再読は全てnot-run。旧52や以前の合格へ合算しない。既に受理された006／007の正常経路を取り消さず、v005全体は未完了・技術完了候補ではない。新たな人間視聴・採点・技術確認・転記は要求せず、原因と最小案が確定した軽微設営一点を相談役へ直接返す。追加作用停止、担当6fileのみ通常checkpoint commit/push後に専用Edgeへ停止報告を送る。


## 2026-10-02 初回キック受領・設営14適用・attempt-002実行前checkpoint

最新main0d1b0810eda4b4f9938b3882e3f52d8381c688adへcleanでfast-forward同期。START_HERE、HANDOVER v035、CURRENT_GOAL、AGENTS、監査プロトコル、COMMUNICATION、手動初回キック、HTTP201追補、現行否定資格正本を全文読了。DECISIONSは前回読了版から差分なしで再利用し、追記0。今回の目的は製品や媒体を変更せず現行版の資格・版・不完全転送拒否を直接実証すること。初回貼付を受領し、問い合わせは専用Edgeで返信全文まで取得する現行運用へ従う。

承認された作成HTTP期待一箇所200→201だけを設営累積14として適用し、attempt-002／v002証拠名／受領HEAD・累積metadataへ追従した。承認200／claim200／拒否409・400、guard、validator、state不変・成果物不増加条件は無変更。製品5不変、一般上限・過去履歴リセット0。旧失敗testはfa9f56a3固定Git版と停止証拠の全文SHA53a4f8fc7548a08f57d489fcaeebaa554c67e08babdbfa4b7bfae562245afb96で保持し、旧attempt-001の2小file／v001失敗証拠／停止証拠4fileの実size・SHAを修正前に保存した。旧媒体read／hash0。新runtime／新証拠不存在を確認。

今回の新一系列をsyntax・無作用preflightから実行し、所有者・期限切れ回復・承認入力・旧state・依存出力・旧未知版・準備版・不完全転送通常complete・別process保存再読まで続ける。Codex1起動0、製品・外部推論・費用・STT／inspection・動画・SSD・追加削除0。既存品質pendingとID9-PD-01/02未承認を維持する。前回turnは失敗原因と停止現物を固定した進捗であり、実行中と推測して二重起動しない。


## 2026-10-02 現行否定資格attempt-002：設営14・19件の限定検証完了

正式commandは `node --import ./runner/node_modules/tsx/dist/loader.mjs docs/reports/request-intent-connection-20261001/queue-current-negative-qualification-test.mts run`。**実親process exit0、隔離backend2件とも終了0、完成時の別process通常store reader exit0、19結果すべてpassed**。新しい実質不具合・追加修正なし。構文transpileと無作用preflightもexit0。stdoutの語句や過去合格の合算で判定していない。

| 実証の分類 | 結果と意味 |
|---|---|
| 通常API／store：2件 | owner-A取得後のowner-B完了をHTTP409、state bytes不変・FileRef／Output／成功0。期限切れは実通常読取でrunning→queued、取得4field clear、期限切れ時刻と回復logを記録。旧owner complete409で回復後state不変・成果物／成功不増加 |
| 現行実関数＋memory：10件 | 承認目的、下書き素材、命令素材、設定、条件、制作系統欠損・未知値、旧工程列の8件を直接throwで拒否。依存出力のownerと参照の不一致2件はDIGEST_DEPENDENCY_REFERENCE_INVALID。メモリ変更をstoreへ保存0 |
| 現行artifact validator＋tiny：6件 | 計画／検証各2旧・未知版、5tiny bindingを閉じた現行計画からの旧準備版、実計画JSONだけ転送して元動画bindingを欠損させた不完全転送を拒否。旧準備版は「Digest準備の版・完了対応が不正です」、欠損は新rootのlstat ENOENT。実動画／実transcriptのcopyなし |
| 否定専用の通常complete：1件 | 不完全計画をHTTP400拒否。state18,848 bytes／SHAacc70aa0fcc75f9eab8f804a71aac8ddc5f972c54291fcb0fa054fef1d7c77ceが前後一致。対象runningのまま・新resultなし、FileRef／Output／成功は歴史依存の各2から増加0。歴史成功依存を持つ否定専用fixtureであり、新しい正のE2E成功ではない |

今回の8指定群は現行実行で全て成立。完成時readerは現行通常loadState／readStateSnapshotと最終API応答を完全対照し、通常stateと否定stateのbytes不変を確認。通常state18,175 bytes／SHAbe5aff156c39b7fc758afed6ba338f57412e5441dc22feb442902d63eb526ca8、draft2／命令8（running1・queued7）、FileRef0／Output0／人間承認0。queuedの後工程がreadyであるとは主張していない。新runtime11小file・324,687 bytesのみ。

[新19結果](queue-current-negative-qualification-evidence-v002.json)は33,158 bytes／SHA5905abe22e40db9ece9a404a100d1caecfb5815c7cc8bbfc493e7d56a9f48b5a。[実行後別process照合・旧失敗保全・親条件対照](queue-current-negative-readback-parent-audit-v002.json)へ実exit、試験全文／SHA、分類、state、11file一覧とSHA、旧4file、参照した旧実績SHAと再実行0を保存。新試験SHAb1f164a02a84ecfc69b63603bc2f7ca797195b0a9e8e3a982aa1ce138f3f9d2e。

親guardとbackend2件の全存続期間guardで元／保存MP4 read試行0・旧006／007書込み試行0。元媒体hash／copy／PUT、通常runner、外部推論・費用、新素材、STT／inspection処理、動画、SSD、追加削除、本番／公開0。旧684小保護file・006／007の120fileの小SHA／全metadata、製品8path不変、削除8path不存在。旧attempt-001の2小file／v001失敗証拠／停止証拠4fileは修正前とsize・SHA一致、失敗時testはfa9f56a3の固定Git版と旧SHA一致。旧失敗を上書きせず、旧runtime全体の即時再読を主張しない。製品5／設営14、一般上限・履歴リセット0。

### 親v005 §8の再対照：明示的な拒否証拠の残り2点

| 条件 | 現物による対応 |
|---|---|
| 8.1 | local005／upload006の通常承認とsource JSON登録、MP4007の通常直接登録、006／007の異なる2目的と各3要求・対応回答SHA。source／STT処理は未実行、local005素材copyは整理済みの歴史 |
| 8.2 | 006／007の実index／factory、計画登録→次の検証complete、正規出力所有者、uploadと転送先だけの別root／別process再読。006親終了code未返却は旧記録のまま、今回exit0へ付け替えない |
| 8.3 | 006の複数候補／keep-drop-keep／4編集区間・元時計・転送先再構築、007の未提供枝・別process保存一致、異なる目的6組の要求／回答SHA。再実行なし |
| 8.4 | 現行52・参照9・時計15と今回19で、未承認・系統／工程・依存・承認入力・期限切れ・owner・別draft・依存外request・path・SHA／bytes・版・不完全転送complete拒否が対応。**「source JSONと動画bytesの混同」「Clip/Digest成果物の誤消費」を現行validator／consumerへ明示的に渡して拒否した保存結果は未確認**。正常な2登録分岐やClip工程資格の拒否をこの2つの拒否試験へ読み替えない |
| 8.5 | 現行52のClip7／Digest4、確認生成元3件・独立ゲート3件、policy=falseでも免除しない。006／007にDigest動画命令なし、admission不足維持 |
| 8.6 | 今回の旧／未知artifact・旧準備版・旧state直接拒否、旧保全・固定Git履歴。製品は60b959d9時のshared／backend／runner＋Remotion／client型検査exit0版と不変。無変更の全型・旧52／15／111・全動画QC・人間レビュー再実行0 |

今回正本の現行否定資格一件は検証完了。親の文言ごとに根拠を要求すると8.4の上記2拒否は直接証拠が足りないため、**親v005全体の「隔離実装試験 技術完了候補」はまだ提出しない**。不具合を観測したとは扱わず、静的／正常枝と直接否定を区別する。次の一件は相談役の現物監査により、この2誤消費拒否を小JSON／メモリfixtureで既存validatorへ通す範囲を具体化すること。今回の設営14へ追加fixtureをまとめない。

ID9-PD-01/02、本番有効化、実AI品質、字幕演出、動画許可、人間品質は未承認／pending。人間Pending新規0・人間採用への昇格0。Codex1起動・他者タブ操作・本人への確認／視聴／採点／転記要求0。専用Edgeの古い生成表示は一回reloadして今回の手貼り初回キックと最終相談役返信を取得し、同じ会話がmainを触らずCodex2監査待ちであることまで全文確認。モデル変更0。担当fileのみ通常commit/push・Git clean確認後にAUDIT_ONLY＋NEXT_REQUESTを直接送り、相談役返信完了・全文受領まで同じセッションで確認する。


## 2026-10-02 設営15受領・媒体型／制作系統の誤消費4拒否試験準備

19結果の報告を専用Edgeから送信・表示確認し、3m7sの返信生成完了・全文を受領。同じID9内のcontinueとして、相談役の個別設営15承認と正本 FINAL_CROSS_TYPE_REJECTIONS を読了し、main d0259442763d7e9ea9ac2fb2e80045aa6d065f00へcleanのままff同期。19件は限定技術受理、旧証拠・失敗現物不変。受領だけの独立commitや再起動は行わない。

今回の目的は残る2誤消費拒否の直接証拠を、A1 JSON→video MIME／A2 tiny ftyp→JSON MIME／B Clip kind→実Digest登録依存／C Digest plan→実Clip builder の4件で閉じること。製品変更0、元MP4・ffprobe・通常runner・媒体処理・通信／費用・動画・SSD・削除0。小test一本と小fixture／新証拠だけを設営累積15として適用し、製品5・一般履歴と未承認境界を維持する。formal run前に構文transpile、対象export・ID・新runtime不存在をpreflightする。


## 2026-10-02 設営15・素材型／制作系統の誤消費4拒否成立：v005技術完了候補

[小test](queue-source-kind-and-cross-production-rejection-test.mts) のsyntax transpileと無作用preflightはpassed／command exit0。5実export、既存Digest命令・依存IDとClip命令・STT依存ID、正規Digest計画kind、新runtime／新証拠不存在を確認した。正式commandは `node --import ./runner/node_modules/tsx/dist/loader.mjs docs/reports/request-intent-connection-20261001/queue-source-kind-and-cross-production-rejection-test.mts run`、**実親exit0、4件すべてpassed、別process小保存物reader exit0**。設営15の一回、追加修正・新実質問題なし。製品5／設営15、一般上限・累積履歴リセット0。

| 実経路 | 直接実証 | 拒否後の作用 |
|---|---|---|
| A1 current backend artifact validator | kind／mode／sourceUri／purposeを持つ167-byte source JSONをvideo/mp4として渡し、「動画成果物はMP4ファイルを指定してください」で拒否 | FileRef／Output／業務state変更0 |
| A2 同validator | 新しい16-byte ftyp header fixtureをapplication/jsonとして渡し、「成果物参照のJSONを読めません」で拒否 | 元MP4 read/hash/copy/PUT0。このheaderを実動画／品質合格とは扱わない |
| B 実Digest検証builder→実登録依存resolver | 正規保存依存をメモリcloneしてFileRefのkindだけcomposition_jsonへ変更。digest_plan_json要求にDIGEST_DEPENDENCY_REFERENCE_INVALID | 依存resolver1、成果物read0、判断0、build/write0、メモリstate SHA前後一致 |
| C 実Clipテーマbuilder→実依存resolver→書き起こしkind検査 | ClipのSTT依存へDigest plan kind／URIをメモリfixtureで接続。diskの代わりに正規kind検査済みDigest計画objectを一回返し、「テーマ作成が読む文字起こし成果物の種類が不正です」で拒否 | メモリread1、disk read0、テーマbuild0、manifest／JSON write0、判断0、メモリstate SHA前後一致 |

[新4結果・保全・親条件再対照](queue-source-kind-and-cross-production-rejection-evidence-v001.json)へ観測値・actual error・作用カウンタ・before/after SHAを保存。全705保護小fileのsize／SHA不変、006／007の120fileのsize・inode・device・mtime／ctime・割当量不変。旧19結果と証拠・旧失敗4file・元Clip storeも保護対象に含む。製品8pathに加え実workflow builder／kind validator／backend validatorの現物SHAを保存。削除済み8pathは不存在。旧失敗SHA・固定Git版を保持し、旧proofを書換え0。旧媒体のhash0、旧runtime全体の即時再読は主張しない。

新runtimeは `request-intent-final-cross-type-rejections-20261002-v001-attempt-001` の4小file／316,925 bytesだけ（2tiny fixture、メモリ入力、保全記録）。小fixture以外のopen/readStream、B/C中disk read／write、媒体read、copy、製品側外部process／通信をguardし、すべて試行0。readerの実起動を製品側外部processへ合算せず区別した。normal runner、source/STT／inspection／ffprobe、外部推論／費用、動画、SSD、追加削除、本番・公開0。成功値fixtureはメモリ内の否定単体のみ、通常storeへ注入0。

親v005§8.1〜8.6を旧保存実績と今回現行4拒否へ再対照した。

| 親完了条件 | 現行根拠と限界 |
|---|---|
| 8.1 通常依頼・登録・MP4枝・出所 | local005／upload006の通常承認・source JSON／旧STT実登録、MP4007実登録・正規出力所有者。006／007の異なる目的と各探索・採否・保持6要求／対応回答SHA。source取得／STT処理は実行していない。整理済みlocal005媒体の即時再読資格はない |
| 8.2 通常dispatch・転送・計画→検証complete | 006／007の実index／factory・通常4工程complete、006実upload・分離root・receiver-only reader exit0。006旧親exit未返却はそのまま、今回exit0へ付け替えない |
| 8.3 目的・断片・順序・時計・保存復元 | 006の複数候補、keep/drop/keep、4区間・frame/sample時計、転送先のみ再構築、007未提供時null・理由・再読一致、2目的6組の要求SHA対応。再判断・動画QCなし |
| 8.4 不正入力・資格・参照・版・転送・系統誤消費 | 現行52、参照9、時計15、現行19で従来の拒否を保存。今回A1/A2/B/Cが残る2誤消費拒否を実validator／workflowで閉じた。正常分岐や静的確認への読み替えなし |
| 8.5 Clip確認／Digest不足・人間品質区別 | 52の通常Clip7／Digest4、目的全文・条件、確認生成元3／独立ゲート3、policy=falseでも確認必須。006／007のDigest動画命令なし、字幕演出未接続・動画許可未承認・人間品質pending |
| 8.6 旧保全・現行旧版拒否・影響型検査 | 今回705小file・旧120metadata・旧失敗不変、19の旧state／旧未知成果物・旧準備版直接拒否。製品dirsは60b959d9のshared/backend/runner＋Remotion/client型検査exit0版とdiffなし。無変更の型検査・旧試験は再実行0 |

以上を **「v005隔離実装試験 技術完了候補」** として最終相談役監査へ提出する。限定実装試験の条件が揃ったという候補であり、相談役最終受理は未受領。ID9-PD-01/02、旧業務state移行／本番、実AI内容品質、字幕演出接続、動画許可、人間品質採用は別の未承認／pending。人間Pending新規0、正式採用0。担当5fileの通常commit/push・Git clean確認後、専用Edgeから AUDIT_ONLY＋NEXT_REQUEST を直接送信し、返信生成完了・全文読了まで受領する。
