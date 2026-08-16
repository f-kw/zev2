# Claude直接相談 ZEV01 試験回答 v001

受領日時: 2026-08-16T12:42:50+0900  
consultationId: `zev-consult-ui-trial-20260816-002`  
送信先: Claude Webの会話名完全一致 `ZEV01`  
性質: 相談役の提案。kawafmm裁定・追加権限・実装承認ではない。

BEGIN_ZEV_CONSULT_RESPONSE
{"consultationId":"zev-consult-ui-trial-20260816-002","decision":"continue","assessment":"第一候補5点は妥当。Claude Web+Edge CDPを試験経路とし、Desktopは画面読取安定まで正式経路にしない判断、packet構成、固定マーカー内strict JSONのみ採用しfail-closed、runner hard limitをClaude continueより常に優先し裁定を追加権限と解釈しない、本格設計前の3〜5往復試験、はいずれもkawafmmが表明した『空中分解の恐れ』への対処として整合している。ただし試験の範囲は次に限定する: 対象は運用体制試験のみで字幕工事の判断・実装・API通信・費用・描画・contract・path・成果物・stable tagへ一切触れない。試験packetの相談内容は本packetのような体制事項か、既に承認済みの裁定の再確認に限る。試験中に第1層(契約新設・改訂、path/費用/素材の根幹値、API・費用承認、目視判定、着工順・凍結、正式成果物の削除・上書き・commit・tag・公開)へ触れる質問は相談役が必ずneeds-kawafmmで返し、Codexはturn終了しkawafmm入力を待つ。相談役側の約束: 各回答は本形式で返し、同時にkawafmm向けの平易な要約を同じ返信内(マーカー外)に添える。相談役は現物SHA・実在入口・失敗証拠を伴わないpacketにはcontinueを返さず、証拠不足としてstopまたは追加情報要求を返す。","requiredSafeguards":["packetにwork-order SHAとその許可範囲(変更可能path・attempt上限・停止条件・外部作用上限)を必ず含め、相談役のcontinueは『その範囲内の行動のみ許可』を意味し範囲外は自動でneeds-kawafmm扱いとする","runner永続counter ledgerによる判断非依存の強制停止: 一工事あたりの追補件数・停止回数・実走経過日数・累計費用・相談packet件数の固定上限をwork-orderに置き、到達時は相談役回答に関係なくturn終了+kawafmm通知。counter更新は正式attemptごとに版付き保存","定期check-in: 判断の有無に関係なく一定間隔(1日1回または正式attempt N回ごと)で現在地・費用累計・追補数・停止数・目的までの残工程をkawafmmへread-only reporterで届ける","はまり検知の即時報告: 同一工程3回連続停止、同型停止の2回目、実走区間2日超、追補短期連鎖、相談役指定ミス2回目、のいずれかで層に関係なくkawafmmへ『連鎖状況』を報告し、対策未定でも報告を先行","相談役ハンドオーバー: 現在の裁定基準・三層線引き・不変条件・字幕工事の現在地を版付き文書として保持し、packetから参照可能にする。相談役セッションが別実体へ変わった場合も同一基準で裁定できる形を保つ","巻き戻し可能性: 各工事開始時にstable tagを切り、相談役裁定台帳(consultationId・decision・根拠・許可範囲・kawafmm差し戻し欄)を版付き保存。kawafmmが差し戻した裁定は無効とし影響範囲を巻き戻す","相談経路の完全性: 送信byteのSHA一致、回答マーカーの一意性、consultationId一致、schema検証、UI変更時fail-closed、timeout・沈黙・重複はcontinueへ変換しない。Claude UIの生ログを保存するがcredential・secretは保存しない","二者推測循環の防止: packetと回答の双方でfact/inference/unverifiedをfieldで分け、相談役は推測をfactとして引用しない。Codexも相談役の推測を根拠にfixture・期待値を変えない","並行Goalのcheckout衝突防止: 体制試験と字幕工事を同一checkoutで同時に変更しない。試験は読み取りとreports配下の版付き文書に限定"],"trialObservations":["送信完全性: Codexが送ったpacket byteのSHAと、Claude UI上に実際に入力・送信された本文の一致(3〜5件全件)","応答抽出の決定性: BEGIN/ENDマーカー内のJSONを一意に抽出できるか、マーカー外の説明文(kawafmm向け要約)が混入しないか、strict JSON parseの成否","consultationId往復一致と、別packetの回答混入がない(順序・ID照合)","needs-kawafmm検知: 相談役が意図的にneeds-kawafmmを返す1件を含め、Codexがturn終了+版付き状態保存+kawafmm通知へ正しく遷移するか。continueへ誤変換しないか","fail-closed: timeout・UI要素未検出・schema不正・マーカー欠落を各1件以上意図的に発生させ、全てが停止に倒れることの実測(少なくともtimeoutとschema不正の2件)","所要時間と安定性: 1往復あたりの経過時間、Edge CDPでの入力欄・送信ボタン特定の再現性、Claude UIのレート制限や再認証の発生有無","ledger動作: 相談packet件数counterが正しく加算され、上限到達で停止することを小さい上限(例: 5)で1回実測","kawafmm可視性: 往復ログとkawafmm向け要約がZEV01上でkawafmmに追える形で残るか"],"kawafmmQuestion":null}
END_ZEV_CONSULT_RESPONSE

## Codex側の受入結果

- 固定マーカー: 一意に抽出成功
- JSON parse: 合格
- key集合: exact一致
- consultationId: exact一致
- decision: `continue`
- 自動採用: 0件。回数・日数・stable tag等の具体案は三者設計前の提案としてのみ保持する。
