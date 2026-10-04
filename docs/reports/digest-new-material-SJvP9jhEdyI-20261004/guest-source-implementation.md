# SSD上の元動画を通常経路へ接続する限定修正

検査時刻：2026-10-04T07:02:57.513986+00:00（UTC）。状態：作業中。親monaが6pathの一素材限定案を承認し、今回の新planと一本製造まで続行を指示した。追加の本人回答待ちはない。

今回の実装は、実prepare_video producerのSSD companion一個だけを許し、JSONは元byteを保持してrepo snapshotへ渡す。字幕原本のURLは保持し、通常transcriptの参照URIだけを別ファイルで変える。本文・ID・時計・その他全項目を元原本と比較し、GPU原応答の入力SHA/size、producerとownerも照合する。実source読取はprivate登録されたfrozen job contextだけで、現在のNode/code/owner/device/UUIDとstream SHA/安定statを確認する。Coreは排他copy前後の元素材一致とsnapshot SHAを確かめてから処理する。

製品6pathは303追加/25削除、必須Core test一個を追加した。shared schema、通常Python、renderer、一般ROOT/trust/default、QC閾値を変更していない。既存pending→finalize→getを維持する。[実SHAと検査の証拠](guest-source-implementation-verification.json)。

対象44件、重複を除く関連回帰を含め69件成功。正式Node20.19.6のrunner/Remotion型検査とshared通常buildが成功。別途、過去の保存入力試験は6成功・1拒否。これは旧planが保存した実装SHAと今回の新実装が異なるための既存検査による拒否で、旧planやtrustを変更して通していない。新素材では今回の実装を束縛した新planで実資格を確認する。試験設営のsandbox writeと依存参照省略の失敗も記録し、未実施を成功にしない。

保存先説明を訂正する。前記の内蔵2copy見積は、元SSD動画を手動でrepoへ置き、その後normal preparationがrepo source-mediaを作る案を指した。Core snapshotは既にSSD guest内であり、内蔵の二つ目copyと書いた説明が誤っていた。14,032,664,792B見積自体はその旧案の2copy＋12GB reserve。新接続ではcompanion、Core snapshot、PCM、背景、字幕PNG、QC、完成MP4を今回guestへ置き、repoはJSONだけ。deviceごとの必要量・reserveを確認し、合算しない。

次は新規の実draft/4requestを既存typed通常builderで作り、通常API claim/PUT/completeとPlanner/Skillsを実行する。旧15:23/9区間/代表6件は固定しない。実新planから字幕準備、現在code/設定/manifest/実指示IDの新job/grant、正式prepare/launch、代表確認、record-only finalize/getへ進む。初回準備、処理時間、今回修正、本人介入を分けて残す。実glyph/製造/QC/動画品質はまだ未評価。
