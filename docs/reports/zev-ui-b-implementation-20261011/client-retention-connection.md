# Codex-UI｜No.68 追加場面の確認要求を画面へ接続

**2026-10-11 07:25 UTCの更新：** 親が個別承認した限定実装修正5をstore/App/unitの3fileだけへ適用し、下記で止めていたclientの残りのEdge検査まで完了した。型検査/buildはexit0、unitは33/33成功。これは追加場面の未回答確認要求を扱うclient接続の検証であり、No.68全体は未完成、No.70は未着手。正式保持回答・全体時計・字幕・製造・人間品質を完成扱いにしない。以下の初稿停止記録と失敗証拠は当時の結果として保持する。

2026-10-11 07:01 UTC。親がc1ab70d2のbackend人工8/8を受領し、既存client/shared導線で明示prepare/readとEdge確認を行う一件を承認した。正式保持回答/全体時計/字幕/製造は対象外。開始時Git枠SSDで編集検証を先行し、SSDが自分の5文書を24f1ef18へpushした後、親からUIへGit枠を受領した。

既存の構成確認画面へ「追加した場面の確認を準備」を追加した。対象場面・保存作用・AI処理/課金/動画作成が始まらないことを表示し、送信前の取消と明示保存を分けた。構成保存と確認要求保存を既存2endpointへ接続し、現在の依頼/表示fingerprint・全編集要求ID・変更前/後の候補順・元採用参照・保存hashを確認する。保存結果は追加場面名/未回答に限り、旧結果を現在版へ付替えない。

「確認要求を読み直す」は保存構成と確認要求のGETだけで、同じrequestHashと現在の構成/追加場面を照合する。準備/読取中だけloadingにし、連打を止める。古い画面・別依頼・遅延した応答を破棄し、不整合/不足時には旧成功表示を消す。画面内の受領記録は依頼/表示版に束縛された一件のmemory projectionで、ledger/製造資格ではない。ブラウザーreload直後は保存状況を「未確認」とし、明示準備でサーバー上の同じ既存版を照合してから読み直せる。reloadだけでPOSTせず、未確認を未作成と書かない。

変更範囲はApp.vue・既存API/store・共有UI型（既存応答のconsumer型だけ）と既存client unit/mockの6file。backend/制作serve/test/runner・正式契約・normal queue/dispatch・state/store writerは変更しない。巨大画面/新service/新素材/STT/有料API/動画製造/公開なし。

## 検証結果と停止

[client build/type-check](client-retention-evidence/client-build-v001.txt)はexit0。[関連unit](client-retention-evidence/client-unit-v001.txt)は32/32成功（新対象8＋既存24）、失敗0/exit0。正しい版で1組だけ準備、連打拒否、current chain/元採用参照の照合、別hash/候補/題名/回答済み/実行許可の偽応答拒否、GETのみ再読、不足時の旧結果消去/検証済みretry、版変更時の非表示、navigation/資料再読後のlate応答破棄を確認。旧backend8件は再実行しない。

専用Edge `1516875462`、127.0.0.1:5179の全/apiを隔離mockへ閉じて確認した。[API原記録](client-retention-evidence/browser-calls-v001.json)と[観測記録](client-retention-evidence/browser-observations-v001.json)へ保存。閲覧/候補を閉じるとPOST0。追加要求保存後、準備確認を開いて取消しても新準備POST0。保存のダブルクリックで構成POSTと要求POSTは各1件だけ、実際の応答待ち中だけ「準備中」とdisabledを表示。再読は同一hashのGET2件のみ。依頼画面へ戻る/作業へ戻る、ブラウザーreload後の未確認表示、明示再準備による同じbody/hashの既存版照合を確認。実行/承認/製造POST0。これはmockでのclient操作で、正式資格の実走や人間品質ではない。

**新たな不具合を発見したためブラウザー全体合格とはしない。** 不足資料のGET失敗直後は[理由を表示](client-retention-evidence/missing-materials-v001.jpg)し旧成功表示を消したが、既存App.vue1342行の2秒state再読でcontrolQueue.ts275行が共通errorMessageを空にするため、[理由も消える](client-retention-evidence/missing-after-refresh-v001.jpg)。[その時点のAX本文](client-retention-evidence/missing-after-refresh-v001.txt)では準備状況未確認だけが残る。不足からのbrowser retry、古いserver版への送信、別hashのbrowser表示、新候補版のbrowser照合は停止により未実施。unitの対応成功をブラウザー確認済みへ転用しない。

**GPT_DECISION・最小案（未適用）：** 新しいprepare/read操作の失敗理由だけをrequestDraftId/draftIdentity/fingerprintに束縛してstoreへ保持し、同じ既存確認欄へ表示する。一般のrefresh/error挙動は変更せず、次の明示prepare/readで消し、依頼/版が変われば表示しない。対象はstore/App/今回unitの3file、回帰検査は「不足失敗→同じstateのrefresh後も理由保持→retry成功で消去→版変更では旧理由非表示」。**限定実装修正5件目の個別例外**として親へ判定を求める。source修正は未適用で、別不具合をまとめない。原保持/判断理由/要約・API body/SHA/validator/許可/製造・既存一般error意味は変えない。

根拠はAGENTS.mdの限定実装修正一般枠3と、枠超過の一件だけ相談役が個別判断する規則。今回までの適用累積は設営10/実装修正4、今回の明示停止を7とする。追補0・費用US$0。型訂正4の個別承認を別の表示不具合5へ流用しない。過去の失敗証拠は保持し、32/32だけでNo.68をDoneにしない。

## cleanup・Git・次状態

[検証索引](client-retention-evidence/verification-v001.json)へ自分の6sourceと既存保護inventory20件を固定。今回所有のApp/shared UI型2件を区別し、他18件は観測HEAD bytesと一致。旧TS2345/backend8成功/indexもHEAD bytes一致を保持。中央Goal/HANDOVER/DECISIONS・SSD/制作文書は操作しない。

自分のEdgeタブを閉じ、mock session62770へCtrl-Cを送り終了。5179 listener0、今回build/unit/mock process0を確認。他担当process/アプリ/配信は停止しない。監査コピーのbyte一致再読後に自分の/tmp重複28,174bytesを削除し、4枚の軽量画面とAX/原log/観測記録を保持。新fixture/大容量媒体0、元素材/正式/退避物への作用0。空き観測Mac17,220,224KiB/SSD1,903,313,408KiB。共有変動をcleanup回収量へ換算しない。

最新mainの開始側観測は24f1ef18a1b0863bd6dd02cdcbd0da43d7a863ef。UI Git枠で自分の初稿/検証/失敗証拠だけを監査checkpointへ固定・pushし、親へ現物と未適用の一件を返す。No.68全体未完成、No.70未着手。正式保持回答/全体統合・新版時計・字幕/要求反映・UI再資格確認/作成・実媒体/人間品質は後続境界として維持する。

監査checkpointは`7e34cf8b67f45a54a73e221e71b9b6df5f4f9bcc`（対象17file）。[停止session log](../../work-logs/2026-10/2026-10-11T0707_Codex-UI_No68-client-retention-stop_7e34cf8b.md)とこの参照行を後続doc commitへ保存し、両checkpointをpush後に親へ実結果を返す。理由保持5の修正は未適用、ブラウザー未完了を維持する。

## 個別承認5の適用と残りのclient検証完了

親は、不足理由が定期再読で消えることを表示欠陥と判断し、依頼ID/下書き内容/表示版に束縛した理由保持を限定実装修正5として個別承認した。既存の承認済みUI接続に必要な表示修正で、製品方針や人間判断を変えないため相談役判断の範囲とされた。一般上限は増やさず、旧証拠・停止7・設営10を保持する。

追加確認のprepare/read失敗理由だけを専用store値に保持し、同じ確認欄へ表示した。同じ版の定期state再読では残り、別依頼/下書き内容/表示版では隠れる。次の明示prepare/read開始時に消す。共通errorMessageへこの理由を流さず、一般refresh/API/権限/制作資格の挙動は変更しない。修正はApp.vueの表示1行、controlQueue.tsの専用理由束縛、今回unitの回帰検査だけで、API/shared consumer型/mock/backend/制作serve/test/runner/契約は追加変更しない。

最終[build/type-check v003](client-retention-evidence/client-build-v003.txt)はexit0、[unit v003](client-retention-evidence/client-unit-v003.txt)は33/33成功（今回の接続対象9＋既存24）。prepare/readの両方で、同版refresh後の理由保持、別版/別依頼/内容変更での非表示、明示retry開始時の即時解除と成功復帰を検査した。v002は途中の著者検査として別保存し、最終ソースの結果へ転用しない。backend人工8件は再実行していない。

専用Edge `1516875464` と隔離mockで残りを確認した。[全操作原記録](client-retention-evidence/browser-calls-v002.json)、[観測索引](client-retention-evidence/browser-observations-v002.json)、[同版の定期更新後にも残る理由](client-retention-evidence/missing-fixed-after-poll-v002.jpg)を保存した。

- 不足する保存資料の読み直しでは旧成功表示を消し、数秒後の同版定期再読でも理由を保持した。正常資料に戻して明示GET再読すると理由が消え、同じ保存hashの未回答表示へ戻った。読取はAX取得前に完了したため、ブラウザーで一瞬の読取中を観測したとは書かない。即時解除はdeferred unitで確認した。
- 別hashを返す人工応答は拒否し、旧成功表示を消した。正しい応答に戻して明示再読すると復帰した。
- 古い版の確認を開いた後、人工サーバーだけを後の構成へ変更した。旧確認からの構成POSTは停止し、後続確認要求POSTは0件だった。資料再読後は古い理由/結果を隠し、旧hashによる読み直しはdisabledになった。
- 現在版の準備で不足条件を返した場合も理由を表示し、依頼画面から戻る/準備確認を開いて取消しても保持した。取消によるPOSTは0件。正常資料へ戻した明示準備では実際の応答待ち中に理由が消え、操作をdisabledにし、[現在の追加2場面だけを未回答として表示](client-retention-evidence/current-two-additions-v002.jpg)した。元の採用場面は保持した。
- 別の人工下書きを保存すると旧Digest確認結果を持ち込まず、送信/実行確認は未承認のままだった。履歴の開閉も確認した。

今回記録は24件（構成POST4、確認要求POST3、場面追加POST1、別人工下書きPOST1、構成GET4、確認GET2、fixture GET9）。AI/dispatch/製造/承認POSTは0件。以前のv001で確認済みの閲覧/候補を閉じる/取消/ダブルクリック/通常reload/同版再準備と合わせ、今回のclient検査を閉じる。正式保存資料への実走・追加場面の採否回答・全体時計/字幕・完成動画・人間品質は未確認のまま。reload後のmemory projection消失と「未確認→明示準備で照合」の制限も維持する。

[検証索引 v002](client-retention-evidence/verification-v002.json)で対象3sourceを固定し、保護inventoryの他19件と従来API/shared型/mock3件が開始HEAD bytesと一致することを確認。旧client失敗/成功原記録とbackend証拠13件も変更していない。ソース3件のdiff checkはexit0。原AX記録のAXListMarkerにある末尾空白は、全証拠のwhitespace checkで検出されたが、原記録のbytesを改変しない。設営/実装の追加修正にはしていない。

自分のEdgeだけを閉じ、mock session61569をCtrl-Cで終了。5179 listener0、対象mock/build process0を確認。自分のtmp重複132,587bytesだけを再読/照合後に削除し、旧4画像と新3画像/AX/原logを監査証拠として保持した。新たな大容量媒体は0、他担当process停止0。今回終了時の空き容量観測はMac17,247,488KiB、KIOXIA1,903,312,896KiBで、共有変動を回収量へ換算しない。

今回の実装・検証checkpointは`abc1c478192e62e435ad7923fcfb93e2dedf6460`（3source＋25証拠）。[今回session log](../../work-logs/2026-10/2026-10-11T0725_Codex-UI_No68-client-retention-correction5_abc1c478.md)とこの追記を別doc commitへ保存し、push/最終HEAD/Git cleanの実結果は親への報告へ示す。適用累積は設営10・実装修正5・停止7・追補0・費用US$0。次状態は親へUI Git枠を返し、次の明示指示まで停止する。
