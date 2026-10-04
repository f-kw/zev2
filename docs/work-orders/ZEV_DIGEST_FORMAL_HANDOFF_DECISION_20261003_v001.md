# 9の後続 — 正式後段接続案の監査と一件製造の承認待ち

## 工程完了後の必須検討 — 2026-10-04 01:35 UTC、kawafmm指示

本人01:22 UTC（Sentinel_08c49e970c988191bb969812641e2b5b）「作業が正常なのに継続できてない」、01:23 UTC（Sentinel_3eca05b7afd08191a29b0d63711c4f4e）「絶対に絶対に作業が終わったら次に進める検討しろ」を親mona経由で受領。

**各工程が終わったら、ZEVの製品目的へ向けた次の具体的一手を必ず検討する。** 推奨、理由、次担当、既承認で直ちに進める部分、本当に新判断が要る部分を記録し、既承認の必要作業は同じセッションで続ける。工程完了だけを継続停止の理由にしない。検討を、新素材/費用/公開/一般設定拡張や新製造の自動着工許可とは扱わない。

今回の次は、次回承認済み一本の「計画/設定/実許可/未使用保存先/代表確認方式」を通常後段へ渡す最小接続範囲の確定を推奨する。固定一件入口と通常完了への未接続を必要範囲で読取済み、[具体的な不足と差分候補](../reports/digest-caption-216px-reflow-20261003/delivery-next-step-20261004.md)へ記録。実装着工や別計画製造は今回開始していない。完成済み動画を再製造・全件検査へ戻さず、本人に過去レビュー/全字幕採点を再要求しない。

---
以下は各時点の作業履歴。

## 最新の本人指示・仕上げ結果 — 2026-10-03 23:40 UTC

本節は以下の作成時点の「本人未承認/144px/243cue」記載を現在の指示として扱わないための追記であり、過去の判断履歴は削除しない。製造の元承認と216px/半文字108px/372cueへの既承認変更は既存recordを参照する。

本人22:20 UTC（Sentinel_7f196b317c108191a237f8edbdf8660e）は「以前も言ったけど、数件確認して全体にはルールベースでやるだけでいいよ」、22:21 UTC（Sentinel_d424eac539fc8191aa03f52f0e55dc5b）は「忘れないようにしてくれ」、23:18 UTC（Sentinel_d46653138290819188ddcc49f764b6dc）は「なぜ？再開して」と明示した。親相談役からこの実行環境へ伝達された今回の範囲は、保存済み字幕PNG/全尺MP4を利用し、代表数件＋全体の同一ルール＋必要最小限の基本媒体確認で同じ一本を仕上げ、正本へ方針を保存すること。

従って全372encoded画像比較/全尺比較、16時台のQC-only復帰契約案、再描画/再合成を今回の完了条件に戻さない。本文/ID/原時計/元音声/9区間/許可・manifestを保持し、旧QC失敗はKEEP。一般trust/default/既存gate改変、公開、remote pushや旧成果削除は新たに許可されていない。

仕上げ結果は完了。6字幕の実MP4中心フレームと最短cue前後6フレームを観察し、端切れ/文字欠けは見つからなかった。全372設定・本文ID時計は保存記録で一致。AAC payloadは元baseと同一、同じ598,323,447B MP4を専用SSD子領域へ同一byteで保存・再読した。通常速/全編/音声実聴取と人間最終品質採用は未確認、旧正式encoded QCは未合格を保持する。[確認結果](../reports/digest-caption-216px-reflow-20261003/representative-finish.md)、[今回確定result](../reports/digest-caption-216px-reflow-20261003/representative-validation-result.json)。

本人へ過去レビュー/全字幕再採点/通常復旧の再許可を求めない。代表で実際に問題があれば時刻と影響範囲を記録する。今回完了を旧全件QC合格や品質本採用にせず、新指示なしに再製造を起動しない。GitHub pushの既存HOLDは継続し、再試行/別経路実行はしない。

---
以下は作成時点の履歴。


更新日：2026-10-03（JST）／発行者：ZEV Build Loop相談役
対象：86875908579d4edf96efdc2117d382b8191c3169
判定：今回の読取・二文書作成は decision: accept。次の実装・候補trust・媒体製造は decision: human_decision。
本書は監査結果と許可依頼の正本であり、新しい実装・製造の着工指示ではない。

## 1. 今回の文書作業は完了

親 ZEV_DIGEST_FORMAL_HANDOFF_PLAN_20261003_v001.md の範囲に対し、README.md、handoff-plan.json、元参照・候補style・実作用・容量・変更対象・許可案、b4a497dcからの4文書差分を照合した。今回の案作成を完了として受理し、必須の文書修正・追加診断は要求しない。

- 対象は素材 -2UUTkv9qvk、9保持区間、243cue/390行/3,613atom、27,691frame/40,705,770sample。
- 受理済み候補manifest SHAは 04ad8b3f019d6afed4038f376e101d15e155cc7822a2527b46fcfbd5b5041e41。元ID・9要求の回答SHAと全体集約viewを区別した接続案になっている。
- 元正常owner/state・承認snapshot・採否保持/edit/clockと小JSONの論理/物理参照、74小参照の読取時SHA・文書保存確認はCodexの記録。媒体内容の再hash・実製造の証拠とはしていない。
- 製品変更・helper追加・媒体作用は0。製品修正6/設営29を保持し、設営30を計上しない。
- 文書の完成はadapter実装、候補trust受理、正式sourcePackage/renderer job、背景四参照、動画完成の合格ではない。これらは未実装・未製造である。

相談役はGitHub保存資料と既存コードを監査した。Macのignored runtimeの全bytes照合・実process観測・媒体視聴を実行していない。86875908のremote存在と4文書差分はGitHubで確認。Git clean/untracked0・対象process0はCodex報告として扱う。

## 2. 技術方針の判断 — 一案として維持、着工は未許可

### 採る方向

保存243cueを再判断せず、正規owner/依存/resolver/SHA検査で読み、既存Digest Coreへ渡す一計画adapterを使う。元意味・断片・atom・boundary・9保持区間を保持し、集約viewは新しい判断要求や元9captionIdの書換えとして扱わない。

低メモリ経路は既存の有限分割・同renderer graph・逐次producer・連続encoderを再利用し、旧固定17,613frame/307状態から明示frame/overlayRecordsへ一般化する方向を推奨する。合成直前の接続とcaller伝達に限定し、executeDraw全体の差替えやrenderer/QCの作り直しは採らない。

変更候補は次の4technical pathと監視1path。これは提出案の対象であり、今回の書換え許可や恒久path上限ではない。

1. runner/src/digest-formal-handoff-v001.ts — 新しい一計画adapter。
2. tools/digest-quality/original-resolution-low-memory-composite.mjs — 既存方式の明示frame/records入力化。
3. evals/clip_composition/render_presentation_v002.mjs — compose段だけの限定接続。
4. evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts — 同接続のcaller伝達。
5. tools/digest-quality/original-resolution-full-supervisor-v002.py — 新計画の正規permit。旧resumeの偽装をしない。

承認後の着工正本で凍結2pathの変更箇所と新実装SHAの束縛を明示する。実装で別の契約・path・固定検査の変更が必要になれば、その差分だけを相談役へ返し、四pathだけで必ず通ると保証しない。

### 候補trustは単なるstyle値変更と区別する

既存 presentation_output_style_resolver_v001.ts の validateLandscapeTrustArtifacts は固定trust rootのcanonical SHAと固定pathを検査する。候補trustを差し替えるだけでは通らないという指摘は正しい。

このため「元registryを編集しないから追加の権限はない」とは扱わない。一計画限定のcandidate contextも、どの候補を実行可能とするかという許可境界を持つ。相談役の軽微設営委任だけで有効化しない。

推奨は、本人が許可した一計画だけに限定する独立candidate入口。固定baselineの実SHA、許可差分、対象manifest、実行コード、出力先、実製造recordを一致させ、許可外の差分・別計画・別rootを拒否する。一般resolverの固定root・一般registry/trust/defaultは変更しない。一般resolverで拒否されたら自動的に候補入口へ流すfallbackも禁止する。

26/2、144px/A8/4、既存font宣言の使用は今回候補の技術条件であり、人間の縁選択・正式style採用ではない。既存style等値、font/code/runtime/媒体の実SHA、admission、QC、原子的保存は維持する。候補入口の実装・拒否確認は承認後の接続検証で行い、今回通過済みとはしない。

## 3. 製造と容量は別の実行前条件

Codexのmetadata観測は2026-10-02T20:03:59.334588+00:00、device=16777234、空き13,411,098,624bytes。現在時刻の再測定ではない。

保存inspectionと既存製造手順に基づく新同時保持の既知部分：
- source snapshot 4,803,412,827bytes
- 全source音声grid 4,246,331,392bytes
- 保持区間PCM 325,646,160bytes
- 合計9,375,390,379bytes。さらにvideo-only/base MP4等の可変圧縮分が必要。

既知部分に12,000,000,000bytesのreserveを加えただけで21,375,390,379bytesとなり、観測空きでは7,964,291,755bytes不足する。旧50,000,000,000bytesの開始条件も満たさない。現在deviceでの製造開始は許可しない。

将来の一件製造で再承認を求める既存安全条件：開始空き50,000,000,000bytes以上、reserve12,000,000,000bytes、親子RSS17,179,869,184bytes、pressure=1、1秒観測、次unit+reserve確認、既存PGID停止と残存確認。今回これらを有効化・緩和しない。50GBだけで全工程の成功を保証せず、可変出力・実行時の監視と段階ごとの容量確認が必要である。

保存先は未確定。未確認SSDを探索・format・移行・書込みしない。外部保存先を使う場合も、実path/device/空きと既存ROOT読取・一時物の保存先が整合することを、着工/実行指示へ束縛する。symlink追加やrootの無言差替えで済ませない。

## 4. 本人へ求める判断は一件にまとめる

ID9-PD-02に関連する一計画限定の製造許可として、次を相談役から提示する。ID9-PD-01の一般本適用とは分ける。

> 保存済み一素材の15分23秒案と243字幕を、144px/A8/4・Normalの確認用動画一本へ仕上げるための限定接続実装と候補専用の信頼設定を許可し、保存先の実確認・安全容量条件の充足後に、素材一時コピー/再inspection・映像音声/字幕画像生成・技術QC・今回作成した一時物だけの整理まで進めてよいですか。正式採用・公開・旧成果削除は含めません。

この質問の提示は承認ではない。本人回答は未受領。許可が得られても保存先/容量不成立のまま媒体を起動しない。相談役が回答を記録し、具体的な着工範囲・許可差分・出力先/停止条件を確定した指示を発行してから実作業を開始する。

新素材取得、STTや新判断API/費用、一般の本番有効化、旧成果削除、演出追加をこの一件へ混ぜない。最初の候補は同じNormal技術条件・順接続/identity crop/元音声。未接続の演出を廃止・完了扱いにはしない。人間品質、実glyph、見心地は製造許可と別である。

## 5. Codex2への現在の指示

- decision: human_decision。前件の読取・二文書案作成はaccept、必須追加修正なし。
- 本返信を専用Edgeで全文受領したら、人間の一件製造許可と新着工正本待ちとして区切る。これはhelper不具合・字幕未完了・v005未完了ではない。
- 未承認の新adapter、凍結renderer/compositor/supervisor変更、candidate trust作成・登録、背景/PNG/動画、SSD/削除は開始しない。
- 待つための追加診断・容量再ポーリング・新helper・別エピック・Codex1起動を増やさない。受理だけの再commit・終了通知commitは不要。
- Codexから本人へ技術方式の選択・転記・手貼り・視聴・採点を要求しない。必要な一問は相談役が提示する。

製品6/設営29、新二path初実装と過去失敗を保持。presentation=not-connected、executionPermission=not-approved、humanQuality=pending、outlineChoice=null、ID9-PD-01/02未承認を維持。v005、実判断計画、字幕準備/回答、計画時計、144px診断/再調整の各acceptも不変。

保存時点：監査受理・本人判断待ちを正本へ反映。Codexの本返信受領/待機移行とMacの現在processは未確認。
