# Codex-UI｜No.68 採用UIの現在地・Digest準備登録の検証記録

## 本人向け詳細（2026-10-11、検査修正6・7反映後）

ZEVで、素材から動画を作る順番が画面上で分かる案内を実装しました。依頼を書いて下書きを保存し、内容確認、作成前確認、作成、動画確認という順番を表示します。下書きを保存するだけではAI処理や動画作成を始めません。別の依頼や新しい編集コピーに移ると、前の構成・動画・確認状態が新しい依頼へ混ざらないようにしました。

保存済みの資料が正しく登録されていれば、候補のタイトル・短い要約・元の発話本文を読めます。「他の候補を見る」は閲覧用で、開くだけでは採用を変えたり、AIへ送ったり、候補動画をまとめて作ったりしません。登録資料に推奨案や候補プレビューの情報がある場合だけ、その情報を表示します。情報が無いものを推奨・準備中・作成済みとは表示しません。

ダイジェストでは、登録済みの保存構成・本文・元音声を保持する指定・入力時計を作成前に確認できるようになりました。ただし、通常画面からダイジェスト動画を作る接続はまだ完成していないため、採用変更と作成開始は止めています。完成動画の映像・音声検査と本人の採用判断は、作成前の資料確認と分けています。

最新の保存版、修正範囲の確認と取消、元の結果を残す編集コピー、失敗からの復帰、登録済み動画の保存先を扱う画面と操作を実装しました。素材の新規取得、正式な推奨・プレビュー生成、外部AIへの送信対象と料金の承認、今回の実素材から完成動画までの通し確認は未完了です。動画の実再生・音声・完成品質は今回の人工検査では確認していません。

人工データで、異なる2素材の登録と読取、候補の開閉・再表示・取消、繰返し操作、戻る、新しい依頼への切替、旧結果との混同防止を確認しました。有料AI送信と実動画製造は行っていません。**No.68は全体未完成のままです。本人への同じレイアウト承認の再依頼は不要です。**

## AI note・監査証拠

以下は当時の停止と新版検査の記録。設営修正6・7の個別承認、累積、資格境界、コマンド結果、Git受渡しはここで追えるように保持する。上の本人向け詳細は親が管理するNo.68の表示更新へ渡す本文であり、このローカル環境からタスクボードの保存・再読を実施したという記録ではない。

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

## 2026-10-11 03:55 UTC｜相談役返信受領・新版検査

親のZEV相談役から、前checkpoint `588134c6c654c79bac56c61f3c28a638c4f2d596` と旧失敗・提案patchを独立読取した上で、以下の**個別2件**の承認を受領した。一般上限5回を変更せず、設営修正の累積は7回として保持する。新しいAPI/費用、製品・品質採用、製造許可、契約変更を伴わない検査表現とmock配線に閉じ、No.68の検証に直接必要なため、本人へ再判断を求めず相談役判断の範囲である。

- **設営6回目の例外承認**：`proposed-setup-6.patch` だけを適用。繰返し読取結果をHTTPのJSON表現へ揃える1行で、本文・音声指定・byte不変・state不変のassertionは保持した。資格reader、fixture値、製品動作、課金確認は変更0。
- **設営7回目の例外承認**：`proposed-setup-7.patch` だけを適用。mockの正規factoryへ制作系統を最初から渡し、後付けの系統/工程変異を削除。通常clipの既定値、guard、製品動作、素材/品質/製造の境界は保持した。6回目の原因と混同せず別件で記録する。

その他のsource修正は0。以前の不合格記録と提案patchは保持し、旧検査を合格へ書き換えていない。追加費用はUS$0、新たな契約追補は0、同日中の作業で3日上限へ未到達。停止回数の一般上限をリセットしていない。

### 新版の検証結果

- **結合検査v002：6/6合格**。異素材人工fixture A/Bの両方が実際のreaderとHTTP登録を通過し、原本文・時計・元音声保持の指定と登録参照を確認した。重複登録byte不変、state不変、資格済み閉包の投影、差替え拒否、未登録のunknown、非SSD拒否、新しいcompiled backend processからBの読取がすべて通った。[新版検査](digest-registration-evidence/integration-v002-passed.txt)。
- **実Edge操作：人工mockのみ**。保存資料の作成前確認、他候補の開閉・Escape・再表示・繰返し選択・資料の繰返し再読を確認。閲覧による変更APIは0件。Digestの採用変更は無効、作成前資料の操作には製造ボタンが無い。生成済み動画へ変換せず、入力の音声指定と完成媒体QC/人間採用の未実施を区別して表示。[作成前の表示](digest-registration-evidence/digest-precreation-v002.png)、[候補閲覧](digest-registration-evidence/digest-candidates-readonly-v002.png)。
- **新しい下書きと旧構成の分離**。別素材の新規下書き保存をdouble clickしてもPOSTは1件。戻って修正→作業へ戻るで新しい版が保たれ、旧Digest構成は表示されない。旧依頼・producer・出力記録は不変、製造request追加0。[作用の記録](digest-registration-evidence/browser-mutation-observations-v002.json)、[新規版の画面](digest-registration-evidence/new-digest-draft-v002.png)。
- **旧動画参照との混同防止**。別のmockで旧動画FileRefが登録されている状態から新しいDigest依頼を保存。旧動画の登録記録と旧依頼を保持したまま、新しい下書きにはvideo elementも旧動画URIも表示されず、再読込後も同じ新規版を表示。開始は無効。旧mock動画は再生媒体を持たず、読込不能を表示しているため、再生・音声・完成動画品質の合格証拠にはしない。[観測記録](digest-registration-evidence/browser-old-video-observations-v002.json)、[再表示の画面](digest-registration-evidence/old-video-not-carried-reload-v002.png)。

先のclient unit 20/20、既存backend UI unit 29/29、client/backend type/build合格を保持。今回のsource差分は上記2つの検査修正だけで、製品codeやtypes/build入力へ追加変更がないため、必要な結合検査と実Edge操作を新版で実施した。有料API・実動画製造・外部公開は0。mock中のモデル名は下書き属性の保存のみで送信していない。

### 新版のcleanup・現在地

結合検査は終了0。自分のSSD人工fixture rootとrepo内の人工source rootは残件0。自分のmock server 2件を終了し、localhost:5179のlistenerなし、専用Edge検査タブを閉じた。今回生成した巨大媒体は無く、削除bytesは未測定。正式媒体・他担当物の削除0、制作アプリ/4配信の停止0。[cleanup記録](digest-registration-evidence/cleanup-v002.json)。

03:55 UTCのGitはmain、HEAD/originはSSD担当の `f18fbd5999cb4bf5360a39cf119f3576257dc1b1` へ更新済み、staged 0。他担当の6文書は同担当のcommitに保存され、今回の変更へ混ぜていない。現在は自分の検査2pathと新版証拠/この追記/新work logだけが未保存。Git操作権はSSD担当からの返却が必要で、stage/commit/pushはまだ行っていない。

**No.68は全体未完成、Doneへ動かさない。** 今回の2件の検査修正と新版検証は完了したが、Git保存が残る。No.70の通常の製造job/permit/prepare・課金確認・動画実行接続、完成動画の実媒体QC/代表確認/人間採用とend-to-end操作は本検証の対象外で未完了。新しい工事や製造許可へ自走しない。

## Git保存の指示受領（03:55 UTC後の追送）

親がSSD担当からGit枠返却を確認し、UIへ枠を渡した返信本文を受領。検証済みの設営修正6・7、その証拠と既存記録だけのcommit/pushを許可された。現在mainは `f18fbd5999cb4bf5360a39cf119f3576257dc1b1`。SSD担当がその後追記したCURRENT_GOAL/HANDOVER/制作時間台帳md/json/統合scope/同担当work logの6文書は未commitのまま保持し、保存対象に含めない。

親から新素材の通常取得・原音声検査が完了し、13:06 JSTから同じLAN STTを処理中と受領。これはUIからの実素材通し確認の成功を意味しない。No.70の実素材通し確認は未開始。Git枠返却後に既存計画と現codeを照合し、次に必要な接続を具体化する指示であり、未承認の製造/API/契約変更を始める指示ではない。
