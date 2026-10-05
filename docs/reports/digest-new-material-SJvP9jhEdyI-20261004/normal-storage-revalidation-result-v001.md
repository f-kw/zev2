# ZEV ID9 — 通常処理の重複資格確認を削減

記録：2026-10-05T01:11:31.812128+00:00。入力main：`827d68b220cc74d1d093ae23c5684918d1e04950`。親monaが本人 `Sentinel_358a0af31e1c8191ba2851c11ffab0cc` の「進めて」を明記し、この限定修正・実runner検証・記録・main pushを指示した。

通常処理の同じ保存資格を前後で二回確認していた入口を、一回へ整理した。前段は復旧指定がある場合だけ残し、後段の `assertCurrent()` は全て保持する。分岐は既存の復旧選択と同じ `recoveryBinding !== undefined`。判定に使うjobは深く凍結され、contextは私有WeakMapに登録された凍結済み実体なので、呼出側の似たオブジェクトやフラグで変更できない。製品変更は `runner/src/digest-approved-job-runner-v001.ts` 一個、専用回帰一個。

通常は後段 `currentRaw()` のjob/許可/コードの実ファイル確認が毎回走る。復旧は900msの結果再利用・進行中Promise共有があるため、前段の新しい確認を維持。4入力参照、Node、所有者/permit/生存PID、device/UUID/image、guestと内蔵のreserve、next-unit、読み込み/公開/資源確認/元媒体copy前後の検査を変更していない。個別ファイル内の二回readと前後identity比較は、読取中の変更検出に必要なので保持。最終確認から操作までの新しい待機区間や、操作間で使う新cacheを追加していない。全工程をatomicにしたという主張ではない。

実runnerの私有 `createStorage/current/currentRaw` と私有context、実job資格factory/`readBytes` を使う33件は全成功。通常単発1回、連続2回・同時2回なら計2回の実資格再照合を、job/許可の実2readから観測した。実publish・chmod・安定保存再読も通る。復旧900ms内のpublic呼出は前段1回、期限後は前段＋後段2回、進行中の後段を共有してもpublic前段は新しく検査する。偽context/clone・7plan項目、job/許可bytesとidentity、読取途中write/rename/同bytes置換、HEAD/code/4入力、owner/permit/PID、device/UUID/image/Node、dirty、guest/内蔵reserveとnext-unit不足を、出力作成前の拒否で確認した。

外部機器の観測、supervisor argv、dirty観測、900ms用時計と負例のPID/Node/HEAD観測は試験内モデル。今回対象外の入力資格と旧復旧原本資格もモデルで、その契約の本番合格は主張しない。資格確認と保存側の検査の中身は実コードで、製品にtest用trust/exportを追加していない。実mount/実SSDの成立・持続速度・本番製造は未検証。

既存job/failed-work46件成功、既存inputsは6成功/1拒否。合計86件中85成功、1件の旧SHA拒否を保持。旧準備記録 inputReferences[31] の `runner/src/digest-plan-preparation-v001.ts` は期待SHA5100d864…6072、実5c0bb684…2d2f。入力main827でもその実bytesは現在と同一で、今回触っていない。変更前testの再実行はしておらず、旧記録と変更前・現在fileの実SHA読取で不一致を確認した。旧fixture/拒否条件を書換えて通していない。runner型は専用testの最終版を含め成功、Remotion型、TypeScript構文/変換後JavaScript構文、差分も成功。独立読取reviewの未解消blocker0。

初回は専用Normal一件が安定読取の `unstable-file` で失敗した。仮想lstat.devと実FileHandle.stat.devの不一致が原因で、test-onlyのopen handleにも同じdevice観測を適用する設営補正1回で解決。読取reviewで並行期待数とcleanupのawait抜けも実走前に補正し、拒否条件は維持。最終33成功/失敗0/skip0、16.346980秒は試験時間で、本番高速化の実測ではない。[実行TAP](normal-storage-revalidation-regression-v001.tap)・[実SHA/モデル範囲/失敗履歴JSON](normal-storage-revalidation-result-v001.json)。

削減はこの通常入口の資格確認 **2回→1回**。他操作の確認、個別二回read、復旧処理を含む全処理数が半分になるという意味ではない。全体時間の短縮は未測定。新製造・新STT・AI推論・追加課金・renderer/無関係cache/サーバ変更0、実映像・音声・人間品質は今回未評価。

今回の最終33小fixtureはown finally削除とENOENTを確認、初回失敗fixtureも整理。2026-10-05 01:08:52 UTC、今回prefixのstorage/input directory0、対象検証/製造process0。旧素材/完成物/lock/正式record/他session成果の削除0。小さなリンク済み監査TAP/検証JSONはKEEP、統合後の自作draftを整理した。mainはown pathのみstage/commit/pushし、固定commit SHA・remote一致・Git clean/untracked0を最終実行報告で確定する。

次の明示指示として、本人がSTTマシンはGitHubと差分なしと確認した（2026-10-05受領）。現在配備に差分があると旧実行hashだけで断定しない。保存資格修正の反映後に取得済みGitHubの処理コードを読み、本文欠落とscore0時刻の経路・最小対策を整理する。別PC接続/過去版探索/新STT/サーバ変更/製造は再開しない。
