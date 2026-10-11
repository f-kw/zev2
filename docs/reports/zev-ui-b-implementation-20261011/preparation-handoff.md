# Codex-UI｜No.68 制作資料の受渡し接続・GPT_DECISION

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
