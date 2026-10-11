# Codex-UI｜短いテキストで見せ方を選ぶ・次の最小接続案

2026-10-11 10:10 UTC。**親から本人方針と着手範囲を受領し、既存sourceを読んで返す具体的な最小案。新機能のsourceはまだ編集していない。** 現在の新版反映照合は新7/関連54/client37・build/types・Edge隔離mockまで検証成立。No.68全体未完成、No.70未着手。追加作業のボード登録は別担当へ依頼済みとの通知のみで、登録完了/番号は未受領。

## 本人から受領した方針

本人は、文脈が伝わるかを自律採点する代わりに、ユーザーが短いテキストの複数案でどこまで文脈を補うか選ぶ方針を指示した。「動画じゃなくて短いテキストで説明」「字幕を発話通りにするは難しいのでSTT通りで許容」「バグっぽい部分に限り除去」「選び方を工夫する方向」。親はBを保ち、2〜3案の表示/選択/同依頼同版の編集要求保存、「補わず簡潔にする」も選べる最小範囲を指示した。案番号や長文羅列にせず、短い名称と一文で違いを示し、詳細は開いた時だけ。存在しない前置き/内容を創作しない。閲覧/選択/製造・費用承認を分離し、比較動画/追加AI送信なし。PDF待ちにしない。

## 既存の根拠と保存境界

| 現在の実物 | 再利用できるもの・今回必要な差分 |
| --- | --- |
| `packages/shared/src/ui-confirmation.ts:25`の`UiSavedCandidate` | 保存タイトル/短いreason・元STTのID/本文/元時刻/区間を持つ。既存候補dialogで閲覧済み。文脈案の異なる内容/採択済み役割/案ごとの保持IDは持たない。`backend/src/domain/digest-ui-review.ts:151`のsummaryは保存discovery answer.reasonから取得する。 |
| 現在のUI準備/新版表示 | 元構成、新版keep本文/ID/時計/反映IDは照合済みで使える。「何が起きる」は保存タイトル、「それで何が伝わる」は保存reasonをそのまま根拠として示せる。要約を新しくAI生成/根拠なく言換えしない。 |
| `backend/src/store/digest-ui-edit-requests.ts:17` | 全recordのexact fieldと`before+一場面`を検査し、一場面追加だけをappendする。`backend/src/domain/digest-ui-edit-requests.ts:25`のchain readerも全recordを追加として再構築する。文脈choice/no-change/字幕観察をこのrecordへ偽装して保存できない。 |
| `runner/src/digest-approved-inputs-v001.ts:517` | 既存明示非表示は資格化済み全cueの原文/ID/時計を完全一致させ、show/suppressと理由、全件countを保存/検査する。表示保留という最終decisionはない。未回答をshow/suppressへ推測補完しない。 |
| `packages/shared/src/caption-local-repair-v001.ts:47` | exclude-caption＋理由の観察は存在するが、正式instruction/meaning/timeline/完成媒体/音声SHAを備えた許可targetが前提。今回の人間新版は未回答表示要求までで、完成媒体や正式cueは未準備。元speech IDだけを正式instructionとして扱わない。 |
| backend/clientの現接続 | caption-local-repair/visibility-adoptionのroute/UI readerは見つからない。既存formal consumer/runnerの意味を変えずに接続所有を閉じる必要がある。 |

## 独立して始められるUI部分

Bの内容確認と既存候補dialogを再利用する。閉じた状態は短い名称＋一文だけ、開いた状態で元本文/元時計/含める保存場面を示す。正常な元STTを編集せず表示し、完成字幕の描画/完全同期を確認済みと書かない。保存資料のtitle/reason/ID/区間が不足または版不一致なら未準備とし、その案の選択保存を無効にする。

まず「補わず簡潔にする」は現在の照合済み構成を使う案とし、元keepのID/区間を表示する。追加する案は、**実在する保存候補/保持記録にある根拠だけ**から、含めるID/区間が違うものを2〜3案以内で示す。現資料に別の見せ方の記録がなければ不足と表示し、2〜3案を埋めるために前置き/反応を創作しない。`前置きから見せる`/`反応を中心に見せる`は実際の保存role/理由が対応する時だけ名称に使い、素材専用の固定分岐にしない。保存sceneの追加だけで成立する案は既存一場面追加routeをそのまま再利用できる。これだけを文脈案生成・字幕採用まで接続済みと書かない。

クリックは閲覧→案の選択→含める範囲と現在版の確認→編集要求保存と分ける。取消/閉じるでは保存しない。保存は人間の希望だけで、元AI採否/旧keepや媒体を上書きしない。pendingの選択を製造入力や文脈品質合格にしない。新API/比較動画/閾値/時刻補正/元映像音声削除はない。

## 親へ返す具体的な接続差分

1. **文脈choiceの保存形式**：現`UiDigestEditRequest`は一場面追加限定なので、「現在の構成を選ぶ」や同scene内の異なる文脈範囲を保存する型がない。候補案は現在のbasis/確認fingerprint/案ID/含める元scene・STT ID・区間/bindingを明示したdata-only recordとして資格化し、同依頼同版の人間選択をその案bindingとともに保存する必要がある。既存storeへ別kindを追加するなら、追加chainだけを既存readerへ渡す分離と全旧record保全が必要。無断で追加recordのschemaやformal preparation consumerの解釈を変更しない。親が保存口の所有/型範囲を閉じたら、その最小store/domain/route/共有型/clientへ着手する。
2. **保存文脈案がない時の生成境界**：current UI readerのtitle/reason/全文だけでは、同じ内容の「前置き」「反応」等の異なる保持案を得られない。元保持recordのroles/理由/元IDと、保存済み文脈案bindingを読む限定helperなら新AIなしで表示できる。案自体が保存されていなければ未準備として止める。新しい生成契約や推論は今回UIが作らない。
3. **字幕疑い/保留の保存口**：現在版の原STT/意味atom bindingをtargetにし、本人が選んだ「非表示希望（理由必須）／判断保留」を**観察・希望として保存**する接続は作れるが、既存正式cue採用とは別段階である。正式cue/許可targetが存在する場合だけ既存show/suppressまたはexclude-captionへ対応させる。未準備の完成媒体SHA/targetを捏造せず、保留を非表示/合格へ自動変換しない。この観察保存型/readerと、formal採用を行う所有担当を親へ調整する。

人工検証は実在保存根拠と元本文/時刻を保つ正例、根拠不足/別案/旧版/改変、取消/連打/閉じる/再表示、旧要求混同、選択保存と製造承認の分離。旧source/request/caption原本を保持し、異常閾値や素材専用値は追加しない。新ボード登録完了と上の保存口/根拠helperの境界が届けば、PDFを待たず独立して閉じた部分から実装する。新機能の完了や保存成立を現在の照合検査から導出しない。
