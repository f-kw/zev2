# Codex-UI｜No.68 Digest作成前読取の接続境界

previewの「準備中」は、取得owner・取得時刻に加え、**実在する有効期限**を必須に修正した。期限欠損・空文字・不正日付はunknownとし、stateを書き換えない。[backend 29/29](digest-boundary-evidence/backend-unit.txt)、[backend/shared型検査](digest-boundary-evidence/backend-type.txt)成功。

Digestの元媒体・音声・時計を正規readerでUIへ渡す作業は、以下の具体的な読取境界を親へ返す。**Digest人工正例の表示、DigestのUI投影、正式な媒体/音声資格の確認はまだ実装・検証していない。** preview修正の29件をDigest接続成功とは数えない。新素材取得/API/実製造/公開は0。No.68全体未完成、Doing rev3を維持する。

## 現物から分かった境界

1. [DigestExecutionInput](../../../packages/shared/src/digest-plan-artifacts-v001.ts)はsourceInspection/clockResolution/manufacturingInput/editPlan/consumptionのbindingを持つが、音声保持指定のstyle bindingを持たない。schemaはexact field検査なので、UI側がaudioModeやstyle fieldを足すと既存契約変更になる。
2. [readConsumedDigestPlanV001](../../../runner/src/digest-plan-consumption-v001.ts)は既存の承認依頼・登録計画・採否/保持を再構築し、元媒体hashとinspection、編集区間、時計、manufacturing inputの同じ対応を検査する。write=falseでprovider/保存/state作用はない。返却はartifact/件数までで、qualified inspection/edit/manufacturing/clockの本文をbackendへ返す公開口はない。
3. [readApprovedDigestInputsV001](../../../runner/src/digest-approved-inputs-v001.ts)は先頭で製造jobのqualified grantを要求する。音声指定はこのreaderが読む別のcaption preparation/styleTemplateBindingにあり、後の `resolvedStyle.audioMode = preserve-source-only` 検査で確認する。この製造専用readerを作成前UIへ直結したり、偽のqualified jobを作って使ったりしない。
4. 承認前に読める候補は[readPreparedDigestCaptionJudgmentInputsV001](../../../runner/src/digest-caption-input-preparation-v001.ts)。その既存manifestはexpected plan/execution SHAとstyleTemplateBindingを持ち、同じ入力への所属を正規再構築で検査できる。ただし、そのmanifest/parametersが今回UI対象へ登録参照として渡されていない。任意local pathや最近のstyleファイルをUIが探索して代用しない。
5. backendの現在のDigest validatorはdataBindingsの全実bytesを確認する。一方、caption準備の正規readerは、宣言元媒体をmetadataとして保持し、実媒体bytesは正式製造境界で検査する。元媒体の**宣言・参照の一致**と**実bytes/音声の資格確認済み**を混ぜず、既存gateを緩めてUIの表示だけを通さない。
6. backendのrootDirはsrcで、runner source直接importはbuild境界を越える。今回、runnerにread-only subpath exportだけを追加した。backendのworkspace依存はまだ追加していない。Digestの通常登録は自動工程でrender_readiness reviewを作らない。後のUI投影は読取専用事前確認とし、reviewや製造許可を新設しない。

## 公開した最小差分と残る読取接続

既存の製造job/permit/実行入口、DigestExecutionInputのexact shape、readApprovedDigestInputsV001は変更しない。全文adapterや正規validatorの複製もしない。

- **readonly export境界 — 実装済み**: 新規 `runner/src/digest-ui-readonly-v001.ts` は既存 `readConsumedDigestPlanV001` と `readPreparedDigestCaptionJudgmentInputsV001` の同一関数をそのまま再exportする6行のbridge。必要な引数型2つも型exportする。新しい読取資格、本文検査、資料生成は加えていない。runner/package.jsonに `@zev2/agent-runner/digest-readonly` subpathを追加。writer、readApprovedDigestInputsV001、製造job/permit/実行入口は公開していない。
- **backendから使うpackage境界 — 未接続**: backend/package.jsonのworkspace依存と対応pnpm-lock更新が次の消費側配線候補。backend buildから未buildのrunner sourceや任意pathを直接importしない。今回その2fileは変更0。公開口をbackendが使い、登録executionのID/hash/bytesとreadConsumedの再構築artifactが同じであることを再照合してから記述を投影する工程は未実装。
- **同入力の音声指定参照**: 既存caption preparationのmanifest/parametersを、現在のplan/execution ID/hashに束縛された既存登録参照として渡す出所を親/制作担当が指定する必要がある。bridgeは `readPreparedDigestCaptionJudgmentInputsV001` の再読を使い、そのmanifestのstyleTemplateBindingの実bytesと対応を確認して指定を記述する。未提供ならaudioModeはunknown。新しいartifact field/承認token/permitを作らない。
- **UI投影**: その記述をshared/UI型とbackend readerへ渡す。元媒体はdeclared reference、音声は指示/参照、時計は保存区間と既存validatorで再構築した対応として表示する。`executionPermission: not-approved`、`humanQuality: pending`を保持し、実媒体資格を未実施と表示する。すべて揃っても製造承認buttonは有効にしない。

必要な入力は「最新の登録execution requestとstate」「その依頼の正規読取root」「同じplan/executionに束縛された既存caption preparation参照（ある場合）」だけ。clientから任意path/manifest/資格を受けて通さない。正規readerのrootと登録参照をbackendへ渡す経路は、親/制作担当の明示範囲が必要。

### 関数と音声指定の正しい参照経路

公開する引数/返却は既存のまま:

```ts
readConsumedDigestPlanV001(
  { preparation: { workspaceRoot, artifactRoot } },
  { request: currentValidateDigestPlanRequest, state }
)
// saved normal plan/consumptionを再構築。artifact/segmentCount等を返す。write=false。

readPreparedDigestCaptionJudgmentInputsV001(
  { workspaceRoot, inputRoot, inputPrefix, sourceRuntimeRoot, outputRoot,
    preparationId, stateBinding, scopeBinding, styleTemplateBinding,
    expected: { requestDraftId, planRequestId, executionRequestId,
      planSha256, executionSha256 } },
  manifestBinding
)
// 同じSSDの保存manifestと全output bytesを再構築照合。
// manifest/meaning/requests/segmentsを返す。style本文自体は返さない。
```

音声の出所は `DigestExecutionInput` や `PatchArtifact.renderReady` ではない。既存 `digest-caption-input-preparation-v002` manifestの `styleTemplateBinding.path/fileSha256` → そのbindingの実保存JSON → `reconstructionMap.caseContexts[0].resolvedStyle.audioMode`。既存値 `preserve-source-only` は `runner/src/digest-approved-inputs-v001.ts` の `buildApprovedDigestSourcePackageValueV001`（462行）で確認する。`digest-formal-handoff-v001.ts` の376行でも同じstyleTemplateBindingを読み、868行で値を検査している。これは現コードの追跡根拠であり、これらの旧固定handoffのpath・9場面・値を新素材へ使う指示ではない。

同入力への所属はcaption readerの123〜149行のproducer/request資格、plan/execution ID・登録SHA・実bytes・planFileRefBinding、同149行以降の閉じたregistry、297行のstyle binding実byte照合、344行以降のmanifest全byte再構築を通して確かめる。inputRootには既存のSSD実体/正規path/device条件がある。任意fixture用にこの条件を緩めない。styleの記述を返す消費側では、この正規manifestに結び付いたstyle bindingを同じstable read/hash確認で読まなければならない。今はそのcaption preparation参照/parametersの登録経路がないので不足のまま。

## 公開境界の検証

[runner build](digest-boundary-evidence/runner-build.txt)成功。[公開口unit](digest-boundary-evidence/readonly-export-unit.txt) **3/3 pass**。通常のnodeでsubpath importでき、公開値は既存2関数と同一、manufacturing capabilityは0。未承認依頼・登録計画欠損・SSD以外のrootを従来どおり拒否し、state不変を確認。これは有効なDigest資料の正例検査ではない。

[7file不変照合](digest-boundary-evidence/qualified-readers-unchanged.json): 既存plan/consumption/caption/approved reader、Digest artifact契約、backend artifact gate、runner実行入口は `bef8c0b8` と実byte一致。移設・検査複製・旧記録互換分岐0。

公開口testの初回はfixtureの必須モデル名欠落とMac tmpdirのrealpath表記差で2件失敗。[旧結果](digest-boundary-evidence/readonly-export-before-fixture-fix.txt)を保持し、モデル名と一時rootの実体pathだけを補正した。資格条件は不変。今回の設営修正2件、前cycleまでの保存記録上3件と合わせ累計5件を保持し、上限を変更・リセットしていない。

許可後の人工検査は、異なるsourceURI・発話ID・区間数・duration/時計で正例を組む。別素材、未解決/欠損binding、同ID新hash、区間件数/時計不一致、違うcaption preparation/style、未承認executionを拒否し、全読取でstate/provider/製造作用0を確認する。新素材の実媒体資格・実製造の成功には読み替えない。

## 保存状態

前handoff時にはGit枠がSSD担当のため保存0だった。その後、親から `bef8c0b8bfc3c76f6f99138addfdcab6c5d3f7f3` 保存完了とGit枠返却、資格不変の薄いbridge公開・自分の保存許可を受領した。自分のsource/test/config5path、専用証拠とこのreport/既存・今回logだけを保存対象にする。既存reader・製造契約・共有正本・backend package/lockは変更0。隔離runtime/tmp fixtureはafter/finallyで削除、test/type/build process終了0、大容量物/ブラウザー/mock server0。最終commit/push/statusは親への報告で実観測を示す。

実装・証拠11pathは `7349e260bd6e2d3ba87cef1cf2a872b3f8807f7c` へ保存済み。境界報告と専用log計3pathは別記録commitで保存する。[今回log](../../work-logs/2026-10/2026-10-11T0317_Codex-UI_No68-readonly-publication_7349e260.md)。No.68全体、Digest有効入力のUI投影、実製造は未完のまま。
