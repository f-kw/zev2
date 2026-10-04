# 新素材一個だけをSSDから読む接続案 — 未適用

状態：GPT_DECISION用DRAFT。実装・製造許可の発行・媒体copyは行っていない。
最新の容量確認：2026-10-04T06:24:36.004588+00:00。内蔵空き13,028,868,096B、元動画1,016,332,396B、２copy＋12GB reserveで最低14,032,664,792B、さらに小JSONが必要。無変更案は成立しない。詳細は[素材準備証拠](preparation-evidence.json)。06:04の一copy不足は当時の観測で、現在の必須停止根拠は２copy分の不足である。

今回の実ユーザーmessageIdは親の補足で `Sentinel_24d44e15c2e48191a4d4aefe81a99466` と確認済み。追加の本人回答待ちはない。古い素材・許可・IDを流用しない。

推奨は『通常JSONのbyte同一repo snapshot＋その準備manifestが明示する新素材一つのguest読取』。jobに新fieldを足すより小さい。ただし通常入力の物理配置とCore input-readの契約を拡張するので、少量bug修正として自己着工する案ではない。ここで固定するのは親のGPT_DECISION用DRAFT。repo変更・媒体copy・API・STT・試験0。

追加job inputを避ける案

jobのinputs五項目と別authorizationはそのまま。既存preparationManifestBindingの実SHAが『新normal JSONの置き場所と一媒体の実SSD場所』を束縛する。未生成MP4 SHAを開始入力へ追加しない。

通常prepareの前に、新source producer所有の実guest companionを通常artifactRoot内へ置く。sourceURIはその実fileのURIとして新draftへ固定する。元downloadがそこに無ければ、親がown guest hardlinkまたは実byte同一copyを明示して用意する必要がある。原本を削除・移動・chmodして代用しない。別file名への対応は元YouTube、元source hash、同byteの実照合で来歴を保持する。これは新しい描画/合成ではないが、この資料はその操作を実行しない。

normalprepの新branchは『現在のapproved draftのsourceURIと同一・現在のnormal artifactRoot内・現在のprepare_video producerのcanonical companion filename』に限定する。guest全体を読み取れるprefix、呼出元任意resolver、他producerのmediaは許さない。sourceVideoBindingはその実companionの既存Digest logical bindingを使い、dataBindings内の実fileはguestに存在する。normalprepがrepoのsource-media.mp4を作ったと主張しない。従来repo branchのコピーと保存形は変えない。

通常Plannerとconsumptionはguestの正常runtimeで完了させる。既存state/plan/execution/registryから列挙されるJSON閉包だけをrepoの新snapshotへbyte同一copyし、転送前後SHA/sizeを記録する。state本文のFileRef URI、owner/request ID、sourceURI、approval本文、発話本文、時計、回答を変更しない。宣言media一つはsnapshotから明示除外する。元normal media-consuming readerを媒体無しrepo snapshotに対して呼ぶのではなく、媒体を意図的に読まない既存caption reconstructionで検査する。

新caption manifest.logicalToPhysicalは、JSONすべてについて実repo fileとbytesVerified:trueを保つ。宣言media一つだけphysicalPath=normal sourceOrigin.declaredSourceUriという実guest絶対path、bytesVerified:false、placement='normal-declared-guest-source-v001'、sizeBytes=normal sourceOrigin.byteSizeにする。『媒体のbytesはこのJSON準備段階で再検査していない』という意味であり、repoに媒体が実在するという意味ではない。意味・時計・logical source IDは同じnormal値を持つ。

approved-inputsはその一entryだけをJSONのsafe-relative path処理から分ける。normal draft.sourceURI＝全producer.target.sourceURI＝transcript.sourceURI＝元sourceOrigin.declaredSourceUri＝mapping.physicalPath、normal source binding SHA＝sourceOrigin SHA＝inspection source SHA、byteSizeを厳密に校正する。job.storage.guestRoot内かつ生成outputRoot外に限定する。残りJSONは従来qualified.readBindingでrepoのみを読む。新外部rootやgeneric callbackを追加しない。

normalrunnerがprivate登録した既存opaque/frozen storageContextに、専用resolveApprovedDigestSourceV001(sourceArtifact)を作る。この関数は同job・同正常ownerが校正した一素材のsourceRef/logical path/SHA/URIしか受け取らず、実read前に既存guest UUID/device/image/current owner/code/Nodeを再検査し、symlink無し・regular file・device・size・実stream hash/安定statを確認する。一般resolveとreadBound/publishの対象は増やさない。入力読取で大JSON readFileに1GBを載せず、既存fileSha型のstream検査を使う。

Coreは既存assertQualifiedDigestStorageContextV001が通ったこのapproved-job contextからだけ一素材を解決する。sourceArtifact.pathはnormal logical bindingを持ち、実pathは明示mappingから得る。生成物のstorage.absは今のoutput prefixのみ。copy先は今のown guest source-snapshot.mp4で、chmod0444、SHA、再source時計検査、range mapping、動画/PCM/音声/媒体QC、原音声保持、own workだけの整理、正式publicationを維持する。媒体を差し替えたらsnapshot hashが拒否する。

必要な製品差分は6path、概算140〜250行

|path|責務|概算行数|
|---|---|---:|
|runner/src/digest-plan-preparation-v001.ts|上記approved producer companionだけをartifactRoot内で読む新branch。同じ実logical source bindingを保持、repo copyを偽装しない。|25〜50|
|runner/src/digest-plan-consumption-v001.ts|外部guest branchだけsourceProvenanceをnormal-approved-guest-media-v001等として正直に保存。既存repo値は維持。|5〜10|
|runner/src/digest-caption-input-preparation-v001.ts|宣言media mappingだけを実normal sourceURIへ。JSON snapshot mapping、媒体未再読の表記を保つ。|20〜35|
|runner/src/digest-approved-inputs-v001.ts|media一つのnormal URI/hash/size/ownerとjob.storageを校正。その他JSON/意味/時計/geometryの検査不変。|45〜75|
|runner/src/digest-approved-job-runner-v001.ts|opaque contextの専用source解決、source hash/stat/budget読取をその一fileへ接続。|35〜60|
|evals/clip_composition/adopted_media_manufacturing_v001.mts|qualified一素材だけを既存source-snapshotへ渡す。既存Coreの製造・検査・確定は維持。|10〜20|

consumptionの現sourceProvenance='existing-repository-media'固定はguest sourceを表せない。これをrunnerで黙って書き換える案にはしない。base/timeline/caller validatorは非空文字列と互いの等値を検査するため、新enumの一般schema変更は不要。normal記録から新しい由来を同一値で流す。

job共通schema、authorization、Python supervisorのinputs exact判定と四つの入力SHA loop、shared Digest logical-reference schema、通常Node command/owner/permit、generated ROOT、renderer/caller、QC方法/閾値、代表pending/finalize/getは変更0。変更した6fileを新jobの実implementation bindingsへ明示し、current HEAD/bytes/cleanを守る。既存readQualified job資格や旧templateのcode保護を外さない。

注意：render_presentation_v002.mjsの旧一括entryにはresolution sourceArtifactのrepo hash読取がある。今回の正式経路はCore→runPresentationInstructionRendererJobFileV002→executePresentationInstructionRendererJobV002→executeValidatedPresentationDrawAndQcV001で、cropAppliedBaseMedia/base timeline/receiptを読むため、その旧entryへ接続しない。この案でrendererを改変する必要は見つからない。

比較：job.inputs.sourceMediaBindingを追加する案は同じ6pathにcommon job validatorとPython supervisorを加え、およそ40〜80行増える。absolute external bindingを既存repo JSON bindingsとは分け、exact入力判定と四つのread loopを同期する必要がある。準備manifestの既存SHAで場所を束縛できる以上、その追加契約は推奨しない。どちらも外部媒体の新保存/読取契約である点は同じ。

検証は小fixture2系統・8caseの見込み

既存repo source正例と、新guest一媒体＋実repo JSON snapshot正例を使う。caseは(1)既存branch不変、(2)新branchでrepo MP4存在/コピー0・宣言sourceへの一致、(3)producer/URI/path差替え拒否、(4)SHA/size差替え拒否、(5)symlink/guest外/output内拒否、(6)UUID/device/image差替え拒否、(7)JSON/normal owner/clock差替えと二素材目拒否、(8)opaque clone/任意callback/qualification後source差替え拒否。対象の既存代表pending/finalize/get suiteも回帰確認する。実製造の成功/速度/品質は小file試験で合格としない。今回はfixture作成・実行0。

## 次に必要な判断

親monaが、この一媒体限定の保存配置・正式読取接続を現在の新素材指示の範囲で承認できるか技術判断し、具体的な着工範囲を同じMac実装者へ返す。実装時にこの案より広い保存契約や権限変更が必要と分かった場合は、具体差分を保存して追加作用を止める。新しい本人回答を既定の停止条件にしない。

判断後は、実companionと正常な新draft、今回の実指示ID、実plan/manifest、採用済み文字設定、現在code/HEAD、今回storageを新job/grantへ束縛する。旧job/grantや旧15:23の固有値を代用せず、通常prepare/launch→確認待ち保存→代表記録→record-only finalize→getを使う。
