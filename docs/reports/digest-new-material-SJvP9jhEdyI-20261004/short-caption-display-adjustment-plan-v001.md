# 短い字幕を読める時間表示するための最小案

記録：2026-10-05 06:02 UTC。本人の最新方針は「発話時刻の精度改善はSTTに任せる」「短い発話・1文字でも読める表示時間を確保する」。約1秒のずれを厳密に排除するための分析、手動精密時刻追究、追加alignment、同じ本人確認は終了した。用意した局所聴取案は未実行のまま取り下げた。返却STT時刻・needs_review・score0・過去の不採用を合格へ書き換えない。元STT、本文、ID、元音声は保護する。

## 現行と今回の差

現行の短字幕fadeは1frameでも100％の濃さになるよう実装済みだが、表示時間は変えていない。正式計画の「お!」は1frame（約0.033秒）、「世界が終わる」は3frame（0.1秒）のまま。濃さの修正を読める時間の確保と混同しない。[実装済みの濃さ対策](fade-native-implementation-result-v001.md)。

通常readerは表示cueの開始・終了を原atomの先頭・末尾から導き、完全一致を検査する（[169行](/Users/kawafmm/workspace/zev2/runner/src/digest-approved-inputs-v001.ts:169)、[243行](/Users/kawafmm/workspace/zev2/runner/src/digest-approved-inputs-v001.ts:243)）。そのため、rendererで終了だけを伸ばして記録を旧時計のままにする方法は使わない。表示用時計の限定変更を入力と記録で一致させる。

元STTを保存して派生表示spanだけ変更する既存例はある（[distant修正90行](/Users/kawafmm/workspace/zev2/evals/clip_composition/repair_distant_caption_human_v001.mts:90)、[164行](/Users/kawafmm/workspace/zev2/evals/clip_composition/repair_distant_caption_human_v001.mts:164)、[共通修正280行](/Users/kawafmm/workspace/zev2/evals/clip_composition/caption_local_repair_common_v001.mts:280)）。旧人間観測tokenや旧固定対象を今回へ流用せず、今回の表示ルール・自然統合に基づく新しい限定adoptionをmanifestへ束縛する。元時計と、Coreが表示に使う派生span時計を明示して分ける。

## 保存済み案を使える箇所

「お!」は直前の質問と一行 **「何人いるの?お!」** へまとめる既存案を使える。元570＋571の境界004778を外し、cue/行末を004780にする。元ID8660〜8667、atom4773〜4780、順序、元時計を維持し、表示は完成側[32545,32577)の32frame、約1.067秒。一行logical幅14で現上限15に収まり、次572は変えない。独立1frameの切替をなくし、質問と驚きを同じ表示にする。音声精度の採用とは別の表示改善として扱う。[保存済みの具体差分](digest-new-material-short-cue-context-assessment-v002-20261004.json)。

この統合だけなら製品の表示時間コード変更は不要。group31の境界回答、既存validator/result/trace、対応表・geometry、manifestを新しい候補として作り直し、既存正式readerで確認する。旧候補や旧受理記録は上書きしない。変更後のcue件数を実導出して新jobへ束縛し、旧651等を固定値で押し込まない。

「世界が終わる」は前の句と統合しても8frame、約0.267秒。元時計を保つ境界変更だけでは可読性の解決にならない。表示時間の調整が必要。直後の「なんか」「いい雰囲気にしないで!」「いい雰囲気に!」は切れ目なく続き、対象終了だけを伸ばすと衝突する。表示順序を保持し、意味の自然な隣接統合と、次の字幕前にある空き時間の利用を同じ局所表示計画で扱う。

保存計画では463〜468が完成側[24980,25015)、次469開始は25070なので、その後55frame（約1.833秒）の空きがある。まず[24980,25070)の局所範囲で、保護本文とIDを残し、表示区間を非重複に組み直せるかを計算する。この空きだけで読みやすさが保証されるとはしない。危機の説明と後のツッコミを不自然に一文へ混ぜたり、本文を削ったりしない。今回、一律の最低秒数や具体的な新表示frameは設定していない。本人の約1秒STTずれ許容を表示時間の下限値へ流用しない。

## 実装する場合の最小範囲

最小候補は二つの製品path。

- `runner/src/digest-caption-display-adjustment-v001.ts`（新helper、仮称）：今回の承認済み表示ルールと自然統合から、派生表示区間・元入力参照・変更記録を作り、本文/ID/順序、局所収容、非重複、既存frame時計への往復一致を検査する。
- `runner/src/digest-approved-inputs-v001.ts`：原prepared meaningの保存と照合を維持し、manifestに束縛され資格を検査した派生meaning/表示対応表だけを既存Coreへ渡す。新helperの実SHAをjob実装bindingで必須確認する。未調整の既存入力は従来の厳格な検査を維持する。

jobと承認は既にcandidateManifestBindingを一致させる（[118行](/Users/kawafmm/workspace/zev2/runner/src/digest-approved-job-v001.ts:118)）。追加実装pathのbindingも受け入れるため、jobの新項目、Python、Core、renderer、合成器の製品変更は現読取では必須ではない。二pathだけで成立すると保証せず、別変更が必須ならその具体差分で止める。汎用trust/G3拒否の削除、無言override、旧人間観測tokenの流用、原STT訂正はしない。

必要な確認は今回の差分に絞る。既存validatorによる本文全被覆・ID/順序・行幅、表示frameの収容/非重複・元時計保管・manifest/実装/承認束縛を軽量に確認し、表示adoptionの欠如/差替え等を必要な小fixtureで検査する。変更表示の実映像は対象の代表で確認し、全字幕の目視採点・全件画像比較・過去suiteの一斉再実行を追加しない。未実施を合格にしない。新glyphや媒体確認は正式な依存と次の実行許可が成立した段階で行う。

状態：最新方針と最小案の整理は完了。次の一件は、親monaが表示方針の更新と適用範囲を確認し、上記の表示調整・自然統合を正式候補へ接続する具体的な実装指示を出すこと。今回の製品変更・試験・音声処理・確認画面制作・製造は0。新しい精密時刻確認は要求しない。表示の実視聴と新候補の正式通過は未実施。

Git：診断6文書のa3a771ceは、本人2026-10-04 00:25 UTC「反映していいよ。許可不要」の直接承認を確認し、通常pushを一回だけ再試行して成功した。main/remote一致。初回自動承認拒否と結果履歴は保持。動画・音声・秘密情報はpushしていない。
