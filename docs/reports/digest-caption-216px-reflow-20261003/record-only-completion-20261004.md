# 確認待ちから通常の完了結果までの接続

最終確認：2026-10-04 04:53 UTC。

今回の目的は、代表箇所の確認を後から登録でき、その動画を作り直さずに通常の結果取得で「完了」と読めるようにすること。親monaから、record-only finalizeは別の将来工事ではなく今回の未完了部分として続け、工程全体を閉じる指示を受領した。本人の「数件を確認し、全体はルール」と、必要作業の承認、既承認のcommit/push範囲を適用する。

生成時に代表記録がない場合は、公開後の正規MP4参照と技術証拠を保存する。技術証拠には実描画計画、適用結果、実PNGのSHAとサイズ、既存媒体・音声検査を束縛する。元の `result.json` は確認待ちのまま読み取り保護し、外部へ返した実SHAとサイズを再開の独立した基準にする。消えたstaging pathは再開の参照に使わない。

別プロセスでの記録確定は、同じjob・承認・policy・実装・保存先・計画・動画を再照合して、非公開の実資格を作り直す。新しいUUID/PIDを持つ所有者が専用ロックを取り、確認記録と根拠ファイルを上書きなしで保存し、既存の代表判定を通す。元の動画・確認待ちreceiptは変更せず、`record-finalization-v001/completed-receipt.json` を読み取り保護した一時ファイルから原子的に確定する。同じ登録束の再送は既存の結果を返し、違う束や競合は拒否する。確定前に失敗しても元の確認待ちと動画は残り、自動再描画や自動再試行は行わない。

通常の結果取得 `getApprovedDigestJobResultV001` と `--get-job-result` は、元の確認待ちに結び付く確定receiptを解決して `status:completed` / `complete:true` を返す。最初から完了している通常full-QC結果、代表方式結果も、独立した原receipt SHA、実MP4、計画、実行記録、代表記録を照合して読める。結果を読むだけの処理は所有者や領域を作らず、追加QCの合格資格を発行しない。確定後は保存済み登録束と根拠から検証でき、元の登録用ファイルが外部で消えても取得を続けられる。

## 呼び出し方

生成を始める前のjob・承認は、既存の通常prepare/launchと同じ明示入力を使う。代表方式はその両方に同じpolicyを指定する。今回追加した実装を含む全code bindingと、同一の実装SHAが必要である。コード・HEADが変わった古いjobを免除して再開する入口ではない。

正式な記録確定は、監視プログラムを絶対pathで呼ぶ。以下の値は実ファイルの独立SHAとサイズを渡す引数であり、架空の承認記録を作る例ではない。

```sh
python3 -B /Users/kawafmm/workspace/zev2/tools/digest-quality/original-resolution-full-supervisor-v002.py \
  --finalize-job \
  --job-file "$job_file" --authorization-file "$authorization_file" \
  --approved-job-sha256 "$job_sha256" --authorization-sha256 "$authorization_sha256" \
  --pending-result-file "$original_result_file" \
  --pending-result-file-sha256 "$original_result_sha256" \
  --pending-result-size-bytes "$original_result_size_bytes" \
  --registration-bundle-file "$registration_file" \
  --registration-bundle-sha256 "$registration_sha256" \
  --registration-bundle-size-bytes "$registration_size_bytes"
```

結果取得は同じjob/承認/原resultの引数を `--get-job-result` に渡し、登録束の三引数を付けない。PythonはJSONの「passed」から完成を判断せず、固定Node処理が照合した結果を返す。監視の終了と動画の完成は別で、動画の状態は結果の `status` / `complete` を読む。

登録束 `digest-representative-registration-v001` は、job/承認/原pendingの参照と、確認recordの保存先・source binding、各根拠の保存先・source bindingを持つ。確認recordには完成MP4の実SHA/サイズ、計画・manifest・文字設定、代表ID・時計・方法・結果・説明・根拠参照を保持する。保存先は同じjobの専用root内に限定し、ロック・確定記録・元技術証拠・媒体などの保護領域を登録先に使えない。

## 検証と未評価

対象56件が成功。内訳は共通8、job/承認9、実保存入力7、caller/Core11、監視13、跨プロセス8。跨プロセス8件では、別processによる確定・完了取得、元source消失後の取得と同じ束の再送、媒体差替え/原pending欠如/別plan/別settings、確定直前失敗、同時実行、異なる登録束、最初から完了しているfull/代表結果を確認した。runner/Remotion型検査、syntax、差分検査も成功。初回の試験環境権限不足、試験shim不足、試験型宣言、出力形式の転記不足は、未成功として残し、限定補正後の結果を別記した。

試験用の動画は数十byteの非再生データ、PNGと検査値は小fixtureである。跨プロセス試験は実ファイルのSHA、非公開のjob資格・再資格、UUID/PID、排他mkdir、上書きしないlink、保護・再読を使い、Macのvolume/device・空き容量・監視親・dirty観測だけを試験loaderで置き換える。本番へ試験用trustや資格免除を追加していない。caller/Coreの描画・公開接続は明示した試験spyによる限定正例であり、全面の本番製造・公開成功や速度を証明しない。

今回は新動画、保存済み15:23動画の移行・再検査、FFmpeg、全字幕画像比較、既存代表6件や可読性評価のやり直しは0。旧全件QC失敗は保存したまま。実視聴品質、全編再生、音声実聴取、人間品質採用は今回評価していない。代表を実際に見たことと全体ルールの検査を分け、未評価を合格にしていない。

一般ROOT/trust/default、元ID・時計・音声、実許可、通常の未使用root条件、50GB開始/12GB確保/16GiB RSS/pressure1/1秒観測/次unit+確保/自分のPGID停止と残存確認を維持する。内蔵・guest・hostを合算しない。書込み前のhostは記録byte＋管理領域＋既存12GB確保を満たす。結果取得だけには50GB開始条件を課さない。

今回の通常経路接続は工程全体で完了とする。次に承認済みの計画を流す際は、このprepare/launch→確認待ち→記録確定→結果取得を使い、初回準備・処理時間・人間介入を分けて記録する。今回のために別動画や旧動画の再製造を始める必要はない。次の計画・素材・費用・公開の新しい許可を今回の接続完了から自動で作らない。次担当は親monaが今回成果と未評価範囲を説明し、具体的な承認済み計画がある場合に同じMac実装者へ渡す。

[実file SHA・試験・初回失敗・未評価の証拠](record-only-completion-verification-20261004.json)。元の製造・品質・制作負担は[一本の仕上げ記録](representative-finish.md)を保持し、今回の試験へ混ぜて再評価しない。
