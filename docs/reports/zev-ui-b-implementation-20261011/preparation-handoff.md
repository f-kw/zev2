# Codex-UI｜No.68 制作資料の受渡し接続・検証記録

最新：設営8回目の個別承認を受領し、工程名2箇所だけを修正。同じ8件のv003は8/8合格。STT失敗・原文保持の状態は登録せず、HTTP409・state不変・原文保持・承認/実行呼出しなしを確認した。人工検証とconsumer helperは検査済み。実素材への受渡しとSSD caller組込みは未実施、No.68全体/No.70は未完成。以下の旧停止記録は当時の結果として保持する。

2026-10-11 04:26 UTC。既存の準備結果をUIへ渡すconsumer helperを実装した。人工の異素材を通す7検査は合格。追加したSTT失敗の検査は設営ミスで未検証であり、この一件は未完成。No.68全体・No.70も未完成。

## 本人向け詳細

制作側で保存した準備資料を、いま確認している依頼へ結び付けて画面で読めるようにする受渡し処理を追加しました。資料を渡すときに現在の依頼を読み直し、別の依頼や古い内容へ取り違えないよう確認します。保存資料の登録だけを行い、素材取得・文字起こし・AI処理・動画作成を始めません。

異なる2つの人工素材で、保存構成・元の本文・音声保持の指定を既存の登録口から読めることを確認しました。準備が未完成のとき、資料が差し替わったとき、別の依頼や認証不足のときは登録されません。失敗を理由に自動で準備を作り直したり、変わった依頼へ再送したりしません。

実素材の文字起こしは、親から「原文を保持して終了コード3で失敗、原因調査中」と受領しました。未完成の原文を完成資料として登録していません。この状態を直接扱う人工検査には工程名の誤記があり、修正の個別判断待ちです。実素材の資料が揃うまで、UIは未登録のままです。

制作担当の準備完了時の呼出しと、今回の残る一検査がまだ必要です。通常画面の採用確定・作成前承認から動画作成、完成動画検査への接続を今回完成させたわけではありません。

## AI note｜指示・所有境界

親の同No.68の推奨1「制作資料受渡し」の続行指示を受領。新素材固有値を補作せず、現在依頼へ正式parameters/manifestBindingを渡す最小接続に限定。次工程2/3、正式計画、製造承認、job/permit内容の変更、新素材取得、重複STT、paid API/実媒体処理、配信停止は含まない。

開始main `dedcc3354354591bd56938d481fc00201ef94cb3`、当初Git枠SSD。独立の編集/検査を先行した後、親からSSD保存 `12ee5592b9f9b806607ce0ca5080b30dc459ce0c` とGit枠UIへの返却を受領。実HEAD/remote一致を確認。表示更新と正式producer呼出しは親/別担当側。

source対象は `scripts/digest-ui-preparation-handoff.mjs` と `backend/test/digest-ui-handoff.test.mjs` の新規2pathだけ。既存fixture、backend登録口/登録簿/資格reader、runnerの準備・計画・consumption・approved reader/runner、制作配信fileは変更0。[10path byte照合](preparation-handoff-evidence/producer-and-registration-boundaries-v001.json)。

## AI note｜具体的な受渡し

既存 `prepareDigestCaptionJudgmentInputsV001(p)` の入力 `p` と正常返却の `result.manifestBinding` を使う。prepareの返却形・manifest・jobを改訂しない。

```js
import { handOffPreparedDigestUiMaterials } from '<repo>/scripts/digest-ui-preparation-handoff.mjs';
// 正規の準備保存が成功した後だけ、既存callerで実行する。
await handOffPreparedDigestUiMaterials(p, result.manifestBinding, {
  backendOrigin: currentLoopbackBackendOrigin,
  humanToken: existingHumanApiToken
});
```

callerの最小差分は上のimportと保存成功後の呼出し。**この正式callerへの組込みはSSD所有で未実施**。親経由で該当callerを指定・調整してもらう。受渡し失敗はconsumer登録の未完了として扱い、正常な正式準備の失敗へ変換したり、準備やSTTを再実行しない。

helperは明示したHTTP loopback originへ、人間APIの既存認証のままGET `/api/state` を行う。`p.expected.requestDraftId` に一意に一致する現在の承認済みDigestだけを選び、全draftIdentityを取得する。sourceURI・件数・元ID・hash・上限・承認値を作らない。producerのworkspaceRootは送らず、serverがコードrootを決める。

続いて既存POST `/api/request-drafts/:id/ui-digest-preparation` へ `draftIdentity`、workspaceRoot以外の正式parameters、正常返却のmanifestBindingだけを送る。既存のstate排他/SSD資格/原本文・時計・保持/出力byte再構築と現在producer照合を維持する。409/401、欠損、redirectでは再送0。成功応答の同依頼・同参照・verifiedも確認し、動画完成/QC合格へ読み替えない。

CLIも同じ関数を使う。必要引数は `--backend-origin`、`--parameters-file`（正規のpを保存したJSON）、`--manifest-path` と `--manifest-sha256`（正常返却のmanifestBindingの値）。認証は既存 `ZEV2_HUMAN_API_TOKEN` から読み、argv/出力へ出さない。missing fileや未完成参照を探索・推測で補わない。CLI出力は依頼ID・準備ID・準備status・登録時刻だけ。

実素材へは未実行。表示は既存の資料再読で行える。登録だけで内容採用・製造操作を有効にしない。

## AI note｜検証・設営8回目の個別判断

- Node v23.7.0の構文検査2pathは合格。JS helper/専用testだけで製品TS/types/build入力を変えないため、既に合格したclient/backend type/buildを反復しない。
- [v001結合検査](preparation-handoff-evidence/integration-v001.txt)：7/7。人工A/Bの正規prepare/consumption/字幕準備と実router/readerを使い、GET現在版→POST既存登録口→資料verifiedまで通した。state・producer directory不変、二度の明示受渡しで登録byte不変、実CLI新process、欠損/権限外field/他依頼/agent認証拒否、同ID異source/manifest、GETとPOST間の依頼変更拒否、非loopback/redirect拒否を確認。
- 親からSTT失敗を追加受領し、その状態の一検査を追加した。[v002](preparation-handoff-evidence/integration-v002-failed.txt)は7/8、1失敗。未完成producerの未登録維持と以前の7件は合格。追加ケースは `source.fileRefIds` の前で、実工程 `prepare_video` を誤って `import_video` と検索しsourceがundefinedになった。HTTP登録前の設営失敗で、STT失敗/raw保持の本assertionへ未到達。
- **GPT_DECISION：設営修正8回目の個別一件**。[提案patch](preparation-handoff-evidence/proposed-setup-8.patch)の2箇所だけを `prepare_video` へ揃える。実型は `packages/shared/src/index.ts:12` と既存fixtureの `request('prepare_video')` で確定済み。製品code、fixture値、資格reader、job/permit、承認、API/費用を変えず、この同No.68の失敗STT検証に直接必要。未適用。旧証拠と適用済累積7回を保持し、一般5回枠を自己増加・リセットしない。

相談役への推奨は、この2箇所だけを8回目の個別例外として承認し、同じ8件を新版で検証すること。回数だけを理由にHUMAN_DECISIONへ上げず、AGENTSの個別軽微技術判断として相談役へ返す。他の失敗が出たら同じ例外へまとめない。

## cleanup・Git・次状態

v001/v002とも自分のSSD fixtureとrepo人工source rootはafter hookで削除し残件0。テストserver/CLI終了、ブラウザーtab作成0、大容量媒体作成0。回収bytes未測定。正式/旧成果/他session削除0、制作/配信停止0。[v001 cleanup](preparation-handoff-evidence/cleanup-v001.json)、[v002 cleanup](preparation-handoff-evidence/cleanup-v002.json)。追加費用US$0、新契約追補0、実素材処理0。

未確認の一件を完成/Doneにしない。自分のsource2pathと専用report/evidenceだけを監査checkpointへ保存し、別担当差分を含めない。実commit/push・HEAD・Git状態とGit枠返却は親への報告で示す。次は設営8回目の個別返信を受領して同No.68で続行。正式producer callerのimport/保存後呼出しは親経由でSSDへ渡し、実素材の未完成STTを登録しない。次工程2/3、実素材通しNo.70は未着手のまま。

source/証拠/reportの自分10pathを `9928f12f456a1995d7f47272c9d0e1b1d14e1faf` に監査checkpoint保存。staged対象は明示所有pathと一致、他担当混入0、直後のtracked/untracked差分0。この保存結果追記と[専用log](../../work-logs/2026-10/2026-10-11T0429_Codex-UI_No68-preparation-handoff_9928f12f.md)を記録commitへ保存してmainにpushする。最終HEAD/push結果とGit枠返却は親へ実観測を渡す。

## 設営8回目の承認受領・v003結果

親が `0ca79b40` の提案patch・拒否assertion・AGENTSの例外/強制停止規定を独立読取し、2箇所の `import_video` → `prepare_video` と同じ8件だけを個別承認した返信本文を受領。適用前に記録を照合した。明示的なGPT判断待ち停止は03:12読取境界、03:42設営6/7同一停止、04:29設営8の3回。正常な段階handoff、Git受渡し待ち、個々のunit exitを設営修正数へ混同しない。新契約追補0、費用US$0、同日作業で3日上限未到達。強制停止条件への到達証拠なし。今回適用後の設営修正累積は8回、一般枠5回を保持。

検査内の工程名2箇所だけを修正し、他のsource変更0。旧HEADのtest全文へこの2置換だけを適用した結果が現fileとbyte一致するため、HTTP409・登録なし・state不変・原文保持・approve/claim/resume/complete呼出しなしを含む全assertionは不変。helper本体、正式reader/準備/製造/登録口/契約/素材値/費用は変更0。[適用と停止回数の証拠](preparation-handoff-evidence/setup-8-applied-v003.json)。

[v003結合検査](preparation-handoff-evidence/integration-v003-passed.txt)は**8/8合格**。人工A/Bの正常受渡し、CLI新process、欠損/別依頼/認証/差替え/競合/redirect拒否に加え、失敗STTと保持された認識原文を完成準備へ登録しないことを確認。v001 7/7、v002 7/8と例外承認前patchは保持し、旧失敗を合格へ書き換えない。再検証はこの同じ8件一回だけ。新有料API/実素材処理/実動画製造は0。

v003終了0、自分のSSD/local fixture root残件0、テストserver/CLI終了、browser作成0、他担当process停止0。回収bytes未測定。[cleanup](preparation-handoff-evidence/cleanup-v003.json)。

## SSD callerへ渡す正確な関数・呼出し位置・入力

- consumer関数：`scripts/digest-ui-preparation-handoff.mjs:27` の `handOffPreparedDigestUiMaterials(parameters, manifestBinding, {backendOrigin, humanToken})`。
- 正式準備関数：`runner/src/digest-caption-input-preparation-v001.ts:329` の `prepareDigestCaptionJudgmentInputsV001(p)`。line339の正常返却は、すべての出力/manifest保存と最終directory資格確認が済んだ後。**callerでそのawaitが成功した直後**にconsumer関数を呼ぶ。正式関数本体へHTTP副作用を追加しない。
- `parameters` はその呼出しに使った **p全体**：`workspaceRoot/inputRoot/inputPrefix/sourceRuntimeRoot/outputRoot/preparationId/stateBinding/scopeBinding/styleTemplateBinding/expected` の10項目。各bindingは既存の `{path,fileSha256}`、expectedは今回の `requestDraftId/planRequestId/executionRequestId/planSha256/executionSha256`。他素材・昔のID/数値を流用せず、欠損を補わない。workspaceRootはconsumerがserverへ送らない。
- `manifestBinding` は同じ正常返却の **prepared.manifestBindingそのもの**。inputRoot内の既存相対pathと実SHAであり、partial原文や別manifestから生成しない。
- `backendOrigin` は使用中の明示HTTP loopback origin（IPv4 `127.0.0.1` またはIPv6 `[::1]`、path/queryなし）。`humanToken` は既存人間API認証。agent tokenへの権限拡張はせず、credentialをjob/argv/ログへ保存しない。portと認証値をUI担当が仮置きしない。
- 前提：backendの同じ現在依頼に、正規source/STT/plan/executionのproducer/output/FileRefとsnapshotが登録済みで、正常な保存字幕準備があること。helperは承認やproducer登録を補作しない。STT失敗/原文保持だけでは前提を満たさず、未登録のまま。登録後は既存UIの資料再読で表示し、採用/製造を開始しない。

repoで確認できる正常呼出し例は `backend/test/digest-ui-fixture.mts:105` と過去の検査用 `docs/reports/digest-caption-input-preparation-20261003/prepare-test.mts:137`。これらを実素材callerとして流用しない。**現No.61のSSD private callerのfile pathは本repo内で特定できず、親/SSD担当が現在の正規prepare呼出し箇所を指定する必要がある。** 渡す最小差分は次の2呼出しの間の保存後hookのみ。

```js
const prepared = await prepareDigestCaptionJudgmentInputsV001(p);
// この位置：正常保存が終わってから。pとpreparedの値をそのまま渡す。
await handOffPreparedDigestUiMaterials(p, prepared.manifestBinding, {
  backendOrigin: currentLoopbackBackendOrigin,
  humanToken: existingHumanApiToken
});
```

consumer登録失敗はその未登録/不一致として保存し、STTや正規prepareを再実行しない。実素材callerへのこの組込み、実素材受渡し、次工程2/3は本cycleで未実施。今回の限定修正と検証結果を保存/pushし、Git枠返却後は次の明示指示まで停止する。
