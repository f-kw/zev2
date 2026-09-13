# ダイジェストv1 Phase 2 — 保持区間解決と字幕表示棄権

2026-09-13。別素材の7候補・12保持ブロックを正式な元動画時刻へ解決し、Phase 1の共通全採用・時刻順整列・重複統合を通して字幕入力を作成した。新しい字幕表示判断を全12区間に対して1回実行したが、区切りのない長い叫び声の全量表示を現行指示から確定できず、回答は棄権となった。字幕採用、字幕時刻対応、Core、renderer、technical QC、完成MP4は未実行。GPT_DECISIONを依頼する。

## 直前の監査指示への対応

branchは `codex/digest-v1`、直前checkpointは `60c0d85f5297d2fb38095fbf34132c5d38556f02`。ZEV進行管理３は同checkpointへのGPT_DECISIONに対し、原観測全体の拒否を維持し、最初の違反より前の最大有効接頭部分を独立検証して指定された開始端点だけに使う限定修正を指示した。応答完了を確認し、`supplemental-prefix-advisor-decision.json` に保存した。再送・再生成なし。

新しい `digest_v1_phase2_prefix.mts` は原観測の先頭から最初の契約違反を求め、その直前までの全文と連続する正式本文片を照合する。同じ音声長・窓位置・音声参照のまま、原値を変えない接頭部分を既存validatorで独立検証する。対象境界がこの部分の内部にあり、一意・有限・正の単位長・観測窓先頭以外・親区間内部であることを要求する。

実データでは39番目の「メ」が元音声の終端を8ms越えるため、元の観測全体は拒否のまま。38単位の接頭部分は合格し、20番目の「や」の開始を元素材5,032,496msとして解決した。38や20、本文ID、時刻を実装へ固定していない。他の補助開始2件と長さ0の観測済み終了2件も再検証し、5端点すべてが解決した。追加alignment、音声抽出、元観測・原意味回答の変更はしていない。

7候補・12保持ブロックの正式採用を保存し、再構築による読戻しを通した。Phase 1の全採用と時刻順整列・重複統合はそのまま使用した。今回の実データに統合される候補間重複はなく、12区間の合計は1,480,234ms（24分40.234秒）。映像製造後の実測durationではない。

## 字幕への接続

追加した `digest_v1_phase2_captions.mts` は、検証済みの新しい保持採用からPhase 1共通処理へ接続する薄いadapterである。既存本文製造を使用し、統合された候補の全ID来歴を保持する。字幕本文は4,437片で、元の文字・正式ID・順序を保持する。元の字幕styleから、各行の論理幅36、最大2行、U+0000〜U+00FFは1、それ以外のUnicode文字は2という既存規則を継承した。

既存caption-display-boundariesへ、12区間を一つの入力にまとめ、現在のCodex＋既存stdin方式で1回渡した。区間別validatorへの投影は、全体回答が成立した後の決定的な分配だけであり、追加の意味判断ではない。今回の回答は棄権なので、この投影や字幕時刻処理へは進んでいない。過去素材の完成字幕、caption-meaning-grouping、新しいSkillは使用していない。

## 棄権した箇所と解釈

| 保持区間 | 確定本文 | 元本文ID | 表示境界通番 | 論理幅 |
| --- | --- | --- | --- | --- |
| 6 | 「あ゛」が70回連続、140文字。その後に「あ�」 | 14969〜15108（連続部分） | 1988〜2127 | 280 |
| 12 | 「あ」が448文字連続 | 32346〜32793 | 3965〜4412 | 896 |

区間6の直前は「え、もう次で最後?やばくない?」。区間12は「分かった分かったストライク」の後から、「涙出た辛かった本当にもう嫌だやった!勝ちましたね!」の前まで続く叫び声表記である。全文と前後本文、全IDは `caption-abstention-diagnostic-v001.json` に保存した。

現行の表示判断指示は、意味が一区切りつく終端を先に決めること、反復語の途中で区切らないこと、本文を一度ずつ全量使うこと、固定幅と最大行数を守ることを求める。Codexは、上記の無区切りの長い発声について、本文だけでは意味上の終端を確定できないと判断した。任意文字数ごとの分割、反復の圧縮・省略、音声から新しい意味境界を追加する処理を先行せず、棄権した。

これは「叫び声の連続表記も反復表現の途中で分割しないという条件の対象になる」としたCodexの解釈を含む。契約上あらゆる表示方法が不可能であることや、人間が不適切と判定したことを意味しない。棄権の原回答と既存Skillの結果を保存した後、完全回答を要求する採用検査が `PHASE2_DISPLAY_ABSTAINED` で停止した。回答を修正・再実行していない。

## 検証と修正記録

既存端点・補助端点・接頭部分の単体検査および実データintegrationに、全体字幕回答の決定的投影の検査を加えて16/16合格。原観測の拒否維持、5端点解決、7候補・12ブロックと原回答の不変、全候補来歴の重複統合、字幕集合の欠落・重複・別ID、全文被覆、幅、回答bindingを検査した。この16件の合格は、棄権した新素材の字幕採用や動画の完成を意味しない。

新規adapter開発中の合成検査で、既存本文製造の単数来歴欄への集合の接続漏れを検出し、公開前の決定的写像で修正した。修正前sourceを保存した。また合成検査の文字幅規則名の誤記を既存styleの実値へ訂正した。失敗TAPと合格TAPを保存し、この検査設営修正を累計5回目として記録した。意味判断のやり直し、既存validatorの変更、正式入力の上書きはない。

実行した主なcommand：

```text
PHASE2_ENDPOINT_JOB=evals/clip_composition/jobs/digest-v1/phase2-20260913-v001/job.json node --import ./runner/node_modules/tsx/dist/loader.mjs --test evals/clip_composition/digest_v1_phase2_prefix.test.mts evals/clip_composition/digest_v1_phase2_endpoints.test.mts evals/clip_composition/digest_v1_phase2_captions.test.mts
node --import ./runner/node_modules/tsx/dist/loader.mjs evals/clip_composition/digest_v1_phase2_endpoints.mts resolve evals/clip_composition/jobs/digest-v1/phase2-20260913-v001/job.json
node --import ./runner/node_modules/tsx/dist/loader.mjs evals/clip_composition/digest_v1_phase2_captions.mts prepare evals/clip_composition/jobs/digest-v1/phase2-20260913-v001/job.json
node --import ./runner/node_modules/tsx/dist/loader.mjs evals/clip_composition/digest_v1_phase2_captions.mts execute evals/clip_composition/jobs/digest-v1/phase2-20260913-v001/job.json < evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/display-stdin-answer-v001.json
```

順に、検査16合格、5端点解決・7候補12ブロック保存、全12区間4,437片の入力保存、原回答保存後の棄権拒否。Phase 1のPASS済みsourceを変更していない。素材IDや実データの本文ID・時刻への専用分岐を追加していない。

## 主な証拠

すべて `evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001` 配下。

| ファイル | SHA-256 |
| --- | --- |
| `retention-adoption.json` | `f70c1b3afe80b9fb99b5a48ac50aa3f95ebf4d873e23de4853b6fcbdf0012374` |
| `retention-endpoint-resolution-v001.json` | `d472fa9063f4cb3d18868dda64cef7fa01441aa2946f519f10d8bbc4f46c39cf` |
| `supplemental-prefix-evidence-chunk-0001-v001.json` | `c0d1b2ead1f01a488bfba1d014edbd7b85dcb700f69948759cd86804d902c5be` |
| `machine-adoption.json` | `48d8a351777849a7db7588c045e6ec27d54232066b3fca5400b06f985b45e8fb` |
| `display-all-request.json` | `2ff590eadd8fef6f7f57745049915f6355b8aeed2b74598d2790f19ad56a3ad8` |
| `display-all-response.json` | `c77344c15d8c20a441860e78f640765dc9666bf33ba64fd34d4c3db808d937b3` |
| `display-all-result.json` | `a884225bfc80575217e16b893f4b125452cdfe45cd598ed2b20744d4b623aa19` |
| `caption-abstention-diagnostic-v001.json` | `ab316bc061aa77a78247b70eabef9d641ad8ffc58df8985037a23a07db84bd48` |
| `prefix-and-caption-tests-v001.tap` | `660dadca58c8c6566baa3fb737d54678529de73245c41718e213c257d00b1d1f` |

## GPT_DECISION

現行指示の「反復語の途中で区切らない」を、長い叫び声の連続表記に適用した上記の棄権判断が妥当か、既存範囲で表示を成立させる解釈・限定対応があるかを判断してほしい。

推奨は、本文を削る・短縮する・意味上の終端を文字数だけで決める処理を加える前に、既存契約内で認められる扱いを明示すること。解釈の訂正だけで進められる場合も、原棄権回答を保持し、どの範囲の再判断または決定的処理が許されるかを具体化してほしい。本文の圧縮や表示方針の変更など第1層に属する場合だけ、人間へ上げる事項を整理してほしい。

累計の意味判断実行は候補探索1回、内部保持1回、字幕表示1回（棄権）。外部API通信・新素材取得・追加費用は0。元の音響63窓と補助3窓の追加再実行なし。完成MP4はまだない。`humanQuality = not-evaluated`、`completionApproval = not-claimed`。
