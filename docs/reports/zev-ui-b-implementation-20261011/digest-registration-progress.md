# Codex-UI｜No.68 Digest準備登録のcheckpoint・GPT_DECISION

2026-10-11 03:38 UTC。No.68の同じ承認範囲とUI Git継続枠で実施。全体は未完成、Doneではない。

## 変更結果

現在の依頼と結び付く保存済み字幕準備を、`POST /api/request-drafts/:id/ui-digest-preparation` へ登録し、同じ依頼の `GET .../ui-review` から表示する経路を追加した。登録は人間APIの既存認証とstate operation queue内で行い、consumer参照だけを `runtime/ui-digest-preparations.json` へatomic保存する。producer成果物やstate、job、permitを作らず、同一内容の繰返し登録は保存済みbyteを変えない。

bodyは `draftIdentity`、`parameters`、`manifestBinding` のexact三項目。parametersは既存caption readerの値からworkspaceRootを除いたものだけ。コードrootはserver側で決める。inputRoot/inputPrefix/sourceRuntimeRoot/outputRoot/preparationId/stateBinding/scopeBinding/styleTemplateBinding/expectedを欠損補完しない。保存readerのSSD、実path、device、snapshot、原本文/ID/時計/keep、style/manifest/output bytes資格をそのまま通す。現在stateのdraft、依存する全producer、FileRef、outputも保存snapshotへ再照合する。現在の最新plan/executionのID/SHAが異なる場合や、元clock/参照の差替えは保存前に拒否する。

読取は公開口 `@zev2/agent-runner/digest-readonly` の既存二readerだけを使う。caption準備と正常なplan consumptionを再構築し、registered executionと同一か確認する。表示用の本文、候補title、discovery reason、元音声参照は同じ資格済み閉包から読む。未登録/不一致時は候補・構成を空に戻し、音声指定を未確認にする。宣言された元媒体の資格と完成動画のQCを混同しない。

UIは作成前の保存構成と本文、**「元の音声を保持する指定」**、元音声の登録参照/入力時計、完成動画の実媒体検査と人間採用が未実施であることを表示する。保存候補の別画面は閲覧専用で、Digestの採用変更や動画作成へのボタンを有効にしない。製造接続が未完成であるblockerを維持する。現在の資格済み準備と依頼版が一致する場合だけ案内を作成前確認へ進める。

backend workspace dependencyとlockのlinkを接続した。runner buildが公開typesに指定された`.d.ts`を出していなかったため、runner compilerにdeclaration出力を付けた。backend startは、既存.mtsがsourceの`.js` specifierを参照するため既存TSX loaderを使う。資格検査reader本体、製造契約、制作担当の配信ファイルは変更0。pnpmの通常offline installはno-TTYで作用前中断。frozen lockfile-only/offline検査は合格し、既存backend node_modulesにworkspace linkのみ設営、新package取得0。

## 検証結果と停止

- backend現codeのtype/build：合格。最初のtype不合格（公開declaration未生成・union narrowing）は旧証拠を保持。
- client unit：20/20、既存backend UI unit：29/29、client type/build：合格。bundle size警告は残る。
- 実readerを通す異素材人工fixture A/Bは、正常plan、consumption、caption準備のJSONを独立作成。動画デコード/製造/AI通信なし。
- 統合v001：4/6合格、2不合格。人工AのHTTP登録は200/verified、保持本文・audio指定・source clock・候補の投影を観測し、state不変・重複登録byte不変も確認。その後の「HTTPのJSONにはundefined fieldが無い」比較で停止したためBのHTTP登録へ未到達。新process試験は未登録Bを読んだ連鎖不合格。2件とも合格に書き換えない。
- 別素材、同ID異SHA、未登録output、新しいexecution、manifest SHA差替え、clock bytes差替えの拒否は合格。拒否でstate/registration byte変化0、clock差替え後のGETはrejected/音声unknown/候補と本文空。
- 実Edge表示検査：mock起動で制作系統と工程列の不一致を既存factoryが拒否し、未着手。実操作の閉じる/再表示/古い結果混同・画面表示は未検証。

旧設営修正累計5回を保持し、以下は適用・再実行を止めた。一般枠を自己更新しない。

1. **GPT_DECISION 設営6回目**：`backend/test/digest-ui-review.test.mjs:49` の比較をHTTP表現へ揃える1行。`proposed-setup-6.patch`参照。原因はローカルの`review: undefined`とwireの省略の差。fixture値、reader、承認、製品を変更せず、この2素材正例/新process検証に直接必要。
2. **GPT_DECISION 設営7回目**：`client/test/guided-ui-mock.mjs`のfactoryにproductionTypeを渡し、Digestを最初から正規factoryで作る1箇所。`proposed-setup-7.patch`参照。別の原因なので6回目へまとめない。guard、製品、素材、費用、製造は変更せず、今回の実Edge操作検証に直接必要。

両件とも相談役の個別判定を受領してから同No.68で修正し、旧証拠・累積を保った新版検査へ進む提案。未受領である。

## 制作側・cleanup・残件

制作担当の03:02 UTC以降の保存済みwork logでは、新素材映像は403、日本語自動字幕の通常取得と限定的な内容下調べは保存済み。LAN STT接続先は現設定で未指定、STT/製造/有料APIは未実施。通常取得への対応と現LAN接続先は親の担当で、字幕を正式STTや品質合格へ変換しない。旧326字幕/5場面の製造案を今回新素材に流用しない。4配信とボードは停止しない。UI本検査は人工素材なのでこの待ちへ依存しない。

統合終了でSSD上の自分専用fixture root一件とrepo runtime内の人工source root一件を削除した。回収bytesは未測定。テスト用mediaは非再生の小さなplaceholderだけで、正式媒体/他担当物は削除0。server/test processは各終了codeを受領。mock serverは起動前exit1、Edge検査タブを作成していない。pnpm既存node_modulesは保持し、アプリ/配信process停止0。

No.70には現在の実入力を使う製造側job/permit/正規prepare/課金確認・実行接続、動画完成後の実媒体QC/代表確認/人間採用とend-to-end操作が残る。本checkpointはproducer契約や製造許可の代替ではない。No.68自体も上記検査2件と実Edge操作未完了。

Gitはmain、開始HEAD `afc5d7f50526170b67463524947ba03a253ef367`。対象pathだけをcheckpoint保存する。CURRENT_GOAL/HANDOVER/制作report/SSD work logの他担当6pathは編集・stage・commitしない。全体Git cleanは他担当保存待ちであり、未完成を完了報告にしない。
