# 9. 通常依頼の制作意図接続 — 通常キュー接続の最小仕様案と境界実測 v004

発行日：2026-10-01（JST）
発行者：ZEV Build Loop相談役
`decision: continue`
着工根拠：kawafmm承認済みID9と本人の「終わったら次に進んで」。その主線の次の設計・境界確認を同じCodex2へ指示する。**公開契約の改訂・本番有効化・人間承認方式の変更を承認したものではない。**
監査対象：`7b600a648cf4ee5228601b72b0a6b6629038fa75`。前指示v001〜v003、成果・失敗記録は保持する。
担当：Codex2単独、同じセッションで続行。Codex1再起動・人間転記・視聴要求は不要。

## 1. v003の監査結果と完了範囲

相談役は、新消費側182行、接続試験・追加拒否試験、15対象結果＋5追加拒否の保存結果、主report、9ファイル差分を照合した。v003の限定技術作業を受理し、その範囲に必須の追加修正は見つからなかった。通常API／store／claimから、変更しないfactoryと既存準備reader、新消費側、既存の製造job形状・区間時計検査までつながっている。複数候補とkeep/drop/keepの個々の保持、元断片・順序・元ms、frame/sample対応を保持している。

旧v002計画の消費・別process再読、旧保存物と実装の保全はCodexの保存証拠と報告として確認。相談役がMacの保存物を直接再hash・試験再実行した判定ではない。source/STT成功依存と判断providerは隔離fixtureであり、AI選定品質・通常UI全工程・人間採用・動画製造は未実証。

監査で確認した次の境界を明記する。
- `digest-plan-consumption-v001.ts`の`manufacturing-values.json`では、`assemblyDecision`が機械採否の保存物を参照する。
- `validatePresentationBaseMediaBuildJobV001`は参照のpath/SHA等の形状を検査する。別の`validatePresentationBaseMediaAssemblyDecisionV001`は専用schema・payload・対象SHA付きhuman approvalを要求する。前者のpassedは後者の受理や製造実行資格の証明ではない。
- backendの`validateCompletionFileRef`は工程から期待kindを決め、JSONのkind等を確認する。そこを通ることと、runnerの詳細schema・後段がDigestを消費することも別である。

これらはv003で明示的に対象外だった境界であり、v003を未完了へ戻す指摘ではない。次工程で偽装して通さないための具体的な確認点である。

## 2. 次の成果

**「Digestとして依頼する → 採用・保持計画を通常の作業結果として保存する → 正しい後段が読み、必要な実行承認に到達する」ための最小仕様案を一つに絞る。**

これ以上、通常経路から使われない別保存adapterや任意依存を足すだけの作業にはしない。一方、現在禁止されている公開schema・人間確認の意味を、continueの一語で変更しない。

今回の終点は、現行契約・実callerの対応、保存実物を使う境界実測、推奨する一つの接続案、実装対象と必要な承認差分が揃った状態。一般論の調査報告や選択肢の羅列で終わらせない。製品コードへの適用は、次の監査で具体的な差分を許可してから行う。

## 3. 実物を照合して一案に決める事項

1. **実行系統の明示**：現在の依頼・承認snapshotのどこでDigestと既存Clipを識別できるか、実際の型とcallerを追う。既存の明示項目があれば再利用し、なければ最小の識別追加案を示す。purposeのキーワード、素材ID、presetの偶然、ファイルの存在から自動推測しない。今回その項目を本番へ実装しない。
2. **工程と成果物**：通常の下書き→命令→claim→処理→complete→成果物参照→次工程の実経路へ、準備binding・採否・保持・編集計画を対応付ける。既存の共通キューを使う案を第一候補とし、別runner／別キューの新設を前提にしない。どの工程が何を生産・消費するか、kindに加えてschema/versionまで明記する。一テーマ型へ複数採否を包む、架空のselectedThemeIdを作る、固定provider出力を製品既定にする案は不可。
3. **承認の帰属**：依頼実行の承認、内容の採否判断、人間の品質回答、特定計画の動画実行許可、公開を分ける。通常テーマ確認が現在どの条件で実際に発生するか、code・policy・運用正本を照合する。古い文書の「常に確認」と型の存在だけで新しい人間作業を足さない。逆に、policyがfalseだから人間採用済みとはしない。Digestで必要な承認と不要な旧Clip専用確認を一案で提案し、変更に別判断が必要な部分だけを示す。今回、承認レコード・review status・実キューは変更しない。
4. **実際の製造入口**：v003の形状／時計検査の先で、どの関数がassembly根拠、入力path、素材、字幕・演出、実行許可を要求するか確認する。現在の機械採否参照をそのままhuman assembly decisionとして使わない。元来別の承認済みDigest経路があるなら根拠と差分を比較し、古いClipの承認を無理に移植しない。
5. **保存・変更・再開**：新しい命令・出力登録・後続消費で、目的・条件・素材・採否・保持・承認対象が変わった際に無効になる範囲を示す。v002はfactory/index/shared等のlive実装SHAに束縛されるため、それらの変更で旧readerが拒否する問題も設計対象とする。旧証拠は保持し、hash免除・旧回答の付け替え・大量のreader複製・全動画再製造を移行案にしない。既存の来歴管理・移行手段があれば先に確認する。どのファイル変更がどの保存版に影響するかを具体化する。

参照入口：`packages/shared/src/index.ts`、`backend/src/routes/control.ts`、`backend/src/artifacts/validation.ts`、通常のclaim／control-review／再開処理、`runner/src/index.ts`、`workflow-step-builders.ts`、`workflow-artifacts.ts`、`workflow-artifact-validation.ts`、v002/v003の新モジュール、`presentation_base_media_build_v003.mjs`。上位設計はAGENTSから参照される製品方針・Agent/Skill architectureを必要箇所で照合し、旧Step 1 READMEだけで判断しない。

## 4. 必要最小の境界実測

既に保存したv003の成果物と実装を利用し、読取り中心の小さいprobeで、既存の次段validatorがどこで受理／拒否するか確認する。前の3判断・準備・消費・20試験を再実行しない。

- backendのkind検査、runnerの詳細成果物検査、assembly判断検査を区別する。実物のkindが通っても意味が違うなら、結果をそのまま記録する。
- 新しい製品形式を試験だけで作って合格させない。通常の入力／出力契約や人間承認を模造してE2Eを主張しない。
- 必要なファイル参照だけ隔離領域へコピーし、元binding・元stateは不変にする。動画copy・新しいprovider・再inspectionは不要。URL解決に隔離runtimeが要る場合だけ使い、自動runnerは起動しない。実際のcomplete POSTで業務stateを更新しない。
- 想定拒否も成果であり、エラーを消すために現行validator・schema・承認条件を変更しない。参照pathだけの拒否か、構造・意味・資格の拒否かを分ける。未実行・静的確認は実測と区別する。

## 5. 出力・完了条件

主reportは既存の `docs/reports/request-intent-connection-20261001/README.md`。詳細一案は同directoryの `queue-integration-contract-proposal-v001.md`、必要な実測は `queue-contract-probe.mts` と `queue-contract-evidence.json`へ保存する。不要なファイルは増やさない。

一案には次を含める。
- 実入口から後続消費までの具体的な型・関数・保存物と、その変更前後の対応。
- 「そのまま使える」「最小実装修正」「明示的な契約／承認判断が必要」の区別。
- 推奨案の短い理由、退けた最有力代案がある場合だけその理由。
- 着工する場合の正確な対象file／field／consumer、完了条件・拒否試験、旧版証拠の保全、段階的有効化の条件。本番有効化と隔離実装試験を分ける。
- 相談役へ返す決定事項と推奨回答。人間への質問は素材再視聴や技術方式選択の丸投げにせず、本当に任せる範囲・承認の意味が変わる一点がある場合だけ理由を示す。

この一案の保存を製品契約の正式採用と呼ばない。旧成果や人間未回答を閉じず、完成したv002/v003を再工事に戻さない。

## 6. 実行制限・記録・次への接続

今回は製品コード・公開API/schema・キュー・本番設定・実依頼stateを変更しない。新UI、別保存adapter、旧実装の大量複製、外部推論/API費用、STT、新素材、動画、renderer/native QC、Decisions、正式採用・公開は行わない。文書と必要な隔離probeだけを担当し、累積設営修正3・製品限定修正2と既存停止条件を維持する。別版発行でカウンターをリセットしない。

mainの通常commit/push、担当fileだけの明示stage、他者変更保全、専用Edgeタブの運用を維持する。今回の相談役文書更新後に最新mainを取り込み、同じセッションで着手する。受理記録だけの再commit・終了・再起動・Codex1呼出しは不要。

報告は `Codex2 GPT_DECISION＋NEXT_REQUEST｜9. 通常キュー接続の最小仕様案`。相談役は現物と一案を監査して次の許可差分を同じ返答で出す。v004自体は設計・境界確認の着工指示であって、その先の公開契約変更の包括承認ではない。指示の保存だけで受領・再開済みとはしない。
