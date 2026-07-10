実行した:
いいえ

実行できなかった場合:
ZEV本体のUIは起動していない。今回の対象は本体から隔離された `evals/clip_composition/` の評価環境であり、仕様上も本体UI、API、キュー、DB、承認ゲートへ接続しないため。

代替で確認した内容
保存済みのモデル入力・モデル出力・採点結果・STT・DP照合・素材ブロック・確認パッケージを再集計し、型検査、JSON構文検査、時刻とIDの整合検査、確認媒体160件の再生時間検査を実施した。

---

# 完成物検証レポート

対象: 切り抜き評価環境の引き継ぎ、生成系統モデル名付与、B素材 `nOEWCNc77MI` のテーマ生成方向確認とfixture凍結前工程

検証日: 2026-07-10

対象コミット:

- `453a51a evals: 引き継ぎ文書とB素材テーマ評価を確定`
- `3680a7e evals: B素材の凍結前確認パッケージを完成`
- Q4追補: 本レポートと同一コミットの汎用複数区間凍結preview

訂正: 初稿の「合格判定チェック」には、全体用検証テンプレートから本体候補選抜機能の語彙が混入していた。`ShortDraftPlan`、`CandidatePool`、`CandidateSelectionLedger`、`CandidateSelectionBinding`、`comparisonItems`、出力本数・完成ショートに関する項目は今回の評価環境と無関係であり、本稿から削除した。末尾のChatGPT投稿項目も、投稿指定がない今回の検証には無関係だったため削除した。

## 1. 結論

意図どおり動いている。

ただし、これはB素材のfixture凍結前工程までの判定であり、theme-llm-v002の正式な範囲hit成績を合格と判定したものではない。元配信単体入力のリーク検査、8窓のWeb Gemini出力、形式品質監査、元配信全域STT、DP照合、17素材ブロック・16境界の確認媒体までは成立している。人間による16境界の確認と固定テーマが未入力なので、fixture/expectedを作らず正式採点を止めている点も設計どおりである。

## 2. ユーザーから見た変化

- 新しい実行部隊が文脈を復元できるよう、プロジェクトの目的、評価方針、fixture状態、未完了作業をまとめた引き継ぎ文書が `docs/HANDOVER.md` に入った。
- 2026-07-10以後の新規LLM採点結果は、プロンプト系統だけでなく実モデル名も含む。例えば `llm-v012@gemini-web-flash` と表示され、同じプロンプトを別モデルで実行した結果を混同しにくくなった。過去結果は書き換えていない。
- B素材の元配信だけから、発話量上位50チャンクを8窓に分けてテーマ候補を生成できた。25候補・27根拠範囲が得られ、途中切れ0、根拠範囲なし0、漏洩検査9/9 passだった。
- STTサーバーが処理途中で停止しても、保存済みのチャンク応答を再利用して再開できた。人間が追加した自動再起動対策と組み合わせ、3時間17分の元配信を395/395チャンクまで完走した。
- B素材は17素材ブロック・16境界まで再構成され、ブラウザーで人間が前後の対応を確認するHTMLパッケージが用意された。
- 現在のユーザー操作は、16境界の確認結果と固定テーマ1行を返すこと。これが揃うまで正解データは凍結されない。

## 3. 実行した操作

1. `docs/order.md`、`docs/review-brief.md`、`docs/HANDOVER.md`、`DECISIONS.md`、評価環境README、プロンプト版台帳、fixture製造手順書を読んだ。
2. 2件の対象コミットと、そこに含まれる保存データ・レポートを確認した。
3. 新規採点結果と既存採点結果の生成系統ラベルを比較した。
4. B素材の元配信単体入力9件について、保存済みリーク検査結果を再集計した。
5. 保存済みWeb Gemini出力から、8窓、25候補、27根拠範囲、数値時刻補正1件を再集計した。
6. 全域STTのチャンク数、発話数、単語数、ID連続性、正の時間幅、時刻逆転、動画時間外の単語を検査した。
7. 全域DP、選択窓DPとの候補統合、素材ブロック、凍結状態を再集計した。
8. HTML確認パッケージの参照448件、全ファイル、境界見出し、動画・音声160件の再生時間、過去fixture文言の混入を検査した。
9. ワークスペース全体の型検査、追加スクリプトの構文・型検査、対象JSONの構文検査を実行した。

この検証タスクでは、STT、Web Gemini、DP照合、素材再構成を再実行していない。保存済み成果物の完全性と相互関係を検証した。

## 4. 保存データの確認

確認した主な保存データ:

- 引き継ぎ正本: `docs/HANDOVER.md`
- 意思決定記録: `DECISIONS.md`
- B素材作業台帳: `evals/clip_composition/stt-targets/nOEWCNc77MI.json`
- テーマ生成入力: `evals/clip_composition/outputs/theme-generation/nOEWCNc77MI_rough_top50_speech_chars_source_only_v001/theme-llm-v002/nOEWCNc77MI-rough-top50-theme-input-after-stt-20260710-v001/prompt-input.json`
- リーク検査: 同ディレクトリの `leakage-inspection.json`
- Web Gemini統合出力: 同ディレクトリの `run-01-gemini-output.json`
- 候補監査: `evals/clip_composition/outputs/theme-generation-audit/nOEWCNc77MI-rough-top50-theme-v002-candidate-audit-20260710-v001.json`
- 全域STT: `evals/clip_composition/stt/nOEWCNc77MI_YE-faluP7zY_local30_v001/source/`
- 全域DP: `evals/clip_composition/outputs/global-dp-word-alignment-nOEWCNc77MI_YE-faluP7zY_20260710-full-local30-freeze-v001_dp.json`
- DP候補統合: `evals/clip_composition/outputs/dp-candidate-run-union-nOEWCNc77MI-YE-faluP7zY-20260710-full-plus-selected-v001.json`
- 素材ブロック: `evals/clip_composition/outputs/material-blocks-nOEWCNc77MI-20260710-full-plus-selected-union-v001.json`
- 人間確認パッケージ: `evals/clip_composition/outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/index.html`

確認結果:

- テーマ候補25件の根拠範囲27件は、すべて `sourceVideoId=YE-faluP7zY` で、終了時刻が開始時刻以下の範囲は0件だった。
- 元配信全域STTは395/395チャンク、53,180発話、53,180単語、`partial=false`。発話IDは1から53,180まで連続し、非正時間幅0、時刻逆転0、元配信時間外0、発話IDなし単語0だった。
- 分割音声境界の正規化では、チャンク外の16発話・16語を評価入力から除外し、境界をまたぐ32発話・32語を実音声境界で補正した。生のチャンク別応答は保持されている。
- 全域DPは1,432対応、545直線分、10語以上の候補29件。選択窓DPの候補13件と統合し、完全一致8件だけを重複除去して34候補になった。
- 素材ブロックは、元配信 `YE-faluP7zY` に対する17ブロック・16境界。開始以上の終了を持たない不正範囲は0件だった。
- B素材台帳は `human_review_package_ready` だが、`readyForFreeze=false`。理由は人間確認と固定テーマが未完了だからである。
- B素材用fixture/expectedは存在しない。これは欠落ではなく凍結ガードの正常動作である。

テーマ生成の `run-manifest.json` にある `llmCall=false` は、入力・実行台帳を作った処理自身がLLMを呼ばなかったという意味である。Web実行結果がないという意味ではなく、別保存された統合出力には `model=gemini-web-flash` と25候補が記録されている。候補監査の `llmCall=false` も、保存済み出力を読む機械監査が追加のLLMを呼ばなかったことを表す。

本体の候補選抜機能や完成ショート生成は今回の検証対象ではない。リポジトリ内の型・履歴・作業文書を再確認した結果、初稿に記載した本体候補選抜用語に対応する並行開発は確認されず、検証テンプレートの流用による混入と判定した。

## 5. UI確認

ZEV本体UIの実行確認はしていない。評価環境は本体UIへ接続しない設計である。

人間確認用HTMLについても、今回のエージェントによる画面目視はしていない。代替として次を確認した。

- HTMLサイズ: 100,472 bytes
- HTML内参照: 448件、全件一意
- 欠落または空ファイル: 0件
- 境界見出し: 16件
- パッケージ内ファイル: 481件
- 動画・音声: 160件
- 再生時間が0または取得不能の媒体: 0件
- 過去fixtureの `全run一致`、`aX-axQMWR3c` 文言: 0件

最終的な画面上の見やすさと、各境界の素材一致はユーザー確認待ちである。

## 6. 出力動画の確認

完成ショート動画は生成していない。今回生成・確認した動画は、B素材の境界前後を比較するための確認媒体であり、投稿用動画ではない。

確認パッケージには、切り抜き連続再生、元配信前後の人工連結、境界前の左右比較、境界後の左右比較、補助音声・静止画がある。動画・音声160件はすべてffprobeで正の再生時間を確認した。

プレビューと本番レンダリングの一致、人間カット、AI削除意図は、完成ショートを作っていないため対象外である。

## 7. 正本の分離確認

今回の変更は `evals/clip_composition/` と承認済み文書に限られ、runtime、本体UI/API/キュー/DB、runner本体工程には書き込んでいない。

評価環境内では、次の責務が分かれている。

- 元配信単体のモデル入力: テーマ生成入力
- LLMの生出力: 窓別Gemini出力
- 数値時刻の正規化・候補監査: 集計結果と監査結果
- 凍結根拠候補: STT、DP照合、素材ブロック
- 最終正解: 人間確認後のfixture/expected。現時点では未作成

過去の評価結果を書き換える処理、近い時間範囲から正解を推測する処理、人間確認なしでfixtureを凍結する処理は追加していない。

## 8. 合格判定チェック

今回の評価環境に対応するチェック:

1. 引き継ぎ文書と意思決定が現在状態を表す: OK
2. 新規LLM採点結果に実モデル名が付く: OK
3. 既存result.jsonが旧ラベルのまま残る: OK
4. 元配信単体入力に正解・切り抜き・照合情報が混入しない: OK（9/9 pass）
5. 発話量上位50の8窓が完全出力される: OK
6. 形式品質判定に必要な候補根拠が揃う: OK（25候補、根拠なし0、途中切れ0）
7. 長尺STTを停止後に再開して完走できる: OK
8. STT時刻が音声チャンク境界内に収まる: OK
9. 全域DPと選択窓DPを由来付きで非競合統合できる: OK
10. 人間確認前にfixture/expectedを書かない: OK
11. 確認パッケージの媒体が欠落していない: OK
12. 汎用複数区間凍結previewが17ブロック・16境界を扱える: OK
13. 人間確認未入力で実凍結指定を拒否する: OK
14. theme-llm-v002の正式な範囲hit成績: 要確認（fixture凍結と採点表示改修後に実施）

## 9. 問題点

確認範囲では重大な問題なし。

問題:
人間による16境界の画面確認が未完了。

該当箇所:
`evals/clip_composition/outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/index.html`

なぜ問題か:
DP照合には偽陽性の実績があり、機械検査だけでは正解区間を確定できない。これは実装不具合ではなく、正解データ認定の未完了状態である。

再現手順:
上記HTMLを開き、境界1から16まで、前側一致、後側一致、素材切替の有無を確認する。

修正案:
判定結果と固定テーマ1行を入力し、凍結前ガードを通す。判定不能はunresolvedとして採点対象外にする。

優先度:
最優先

## 10. まだ未実装のこと

- B素材17ブロック・16境界の人間確認結果保存。
- 正解区間から人間が逆算した固定テーマの保存。
- B素材のfixture/expected凍結。
- 保存済みB素材実走bundleを明示して正式採点する経路。
- expectedがモデル入力内か入力外かを分離する正式採点表示。
- B素材に対するtheme-llm-v002の正式な範囲hit採点。
- 範囲hit候補だけを対象にした二段目の意味判定。
- 正式結果に基づくtheme-llm-v003の設計判断。
- 成功テーマからllm-v012区間選択へつなぐ接続評価と通し評価。
- 第一関門、第二関門、第三関門の通過判定。

## 11. 参考: 不足している可能性のある機能

### 1. B素材の複数区間凍結経路

- 根拠: 単一元動画の複数素材ブロックを扱う汎用凍結previewを追加し、B素材17ブロック・16境界で実行した。全17ブロックに861 STT区間が対応し、人間確認未入力の実書き込み指定は失敗した。fixture/expectedは未作成である。
- ユーザー影響: 人間確認後に新たな凍結処理を作り始める待ち時間は解消した。確認結果をdecisionへ記録すれば、書き込みなしのpost-human dry-runへ進める。
- 扱い: 人間確認前の経路は実装・検証済み。post-human draftと実凍結は人間確認結果がないため意図的に未実行。

### 2. 確認パッケージの別環境再現性

- 根拠: 222MBの確認媒体はローカル製造作業物であり、正本コミットには含まれていない。
- ユーザー影響: 別PCや別checkoutでは、そのままHTMLを開けず、元動画から確認媒体を再生成する必要がある。
- 扱い: 意図された中間成果物運用。将来、複数端末で確認する必要が出た場合の未実装機能。

### 3. 全域DPレポートの過去用診断表示

- 根拠: 全域DP自動レポートには、新規B素材の判定ではない「確認済みペア再現」診断が残る。製造手順書と人間確認前レポートでは、B素材の採否に使わないよう明記済み。
- ユーザー影響: 注意書きを読まずに自動レポートだけを見ると、B素材の確認結果と誤解する可能性がある。
- 扱い: コード・仕様確認で確認した表示上の不足。凍結ロジックの不具合ではなく、低優先度の改善候補。

### 4. theme-llm-v002正式採点の入力可視性

- 根拠: 既存採点処理は複数expectedとの範囲重なりを計算できるが、B素材の保存済み実走bundleを現在の配置から直接読めず、モデル入力外のexpectedも通常missとして数える。
- ユーザー影響: 現状のままでは、入力選定でモデルに見えなかった区間と、見えていたのに選べなかったモデル失敗を区別できない。
- 扱い: B fixture凍結後、正式採点前に実走bundleの明示指定と、入力内/入力外expectedの別表示を追加する。独自の重みや補正は使わない。

## 12. 次に直すべきこと

1. ユーザーが確認パッケージの16境界を判定し、固定テーマを1行で決める。
2. 実行部隊が人間確認をdecisionへ保存し、実装済みの汎用経路でpost-human dry-runしてからfixture/expectedを作る。
3. 採点処理に保存済み実走bundleの明示指定と入力可視性の別表示を追加する。
4. 凍結済みexpectedでtheme-llm-v002を正式採点し、結果に応じてv003設計またはllm-v012接続評価へ進む。

## 13. 実行コマンドとテスト結果

成功:

```bash
node --check evals/clip_composition/freeze_multiblock_material_fixture.mjs
node evals/clip_composition/freeze_multiblock_material_fixture.mjs --fixture nOEWCNc77MI_multiblock_material_v001 --target evals/clip_composition/stt-targets/nOEWCNc77MI.json --materialBlocks evals/clip_composition/outputs/material-blocks-nOEWCNc77MI-20260710-full-plus-selected-union-v001.json --reviewPackage evals/clip_composition/outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/index.html --sourceSttId nOEWCNc77MI_YE-faluP7zY_local30_v001 --sourceVideoId YE-faluP7zY --outputId 20260710-pre-human-v001
jq empty evals/clip_composition/outputs/multiblock-material-fixture-freeze-preview-nOEWCNc77MI_multiblock_material_v001-20260710-pre-human-v001.json evals/clip_composition/outputs/multiblock-material-human-decision-template-nOEWCNc77MI_multiblock_material_v001-20260710-pre-human-v001.json
test ! -e evals/clip_composition/fixtures/nOEWCNc77MI_multiblock_material_v001
test ! -e evals/clip_composition/expected/nOEWCNc77MI_multiblock_material_v001.json
sed -n '1,220p' DECISIONS.md
if test -f docs/order.md; then sed -n '1,260p' docs/order.md; else echo 'docs/order.md: not found'; fi
rg --files docs | rg '(task-|spec-|HANDOVER|目標|FIXTURE|clip|評価)' | sort
git show --format=fuller --stat 453a51a && git show --format=fuller --stat 3680a7e
rg --files evals/clip_composition | rg '(RUNBOOK|README|report|stt-target|HANDOVER)' | sort | sed -n '1,240p'
rg --files docs | sort | sed -n '1,260p'
sed -n '1,220p' docs/HANDOVER.md
find evals/clip_composition -maxdepth 2 -type f \( -name '*RUNBOOK*.md' -o -name 'README.md' \) -print | sort
wc -l evals/clip_composition/FIXTURE_MANUFACTURING_RUNBOOK.md evals/clip_composition/README.md evals/clip_composition/prompts/README.md docs/review-brief.md
sed -n '1,280p' evals/clip_composition/FIXTURE_MANUFACTURING_RUNBOOK.md
sed -n '281,420p' evals/clip_composition/FIXTURE_MANUFACTURING_RUNBOOK.md
sed -n '1,260p' evals/clip_composition/README.md
sed -n '261,520p' evals/clip_composition/README.md
sed -n '521,800p' evals/clip_composition/README.md
sed -n '1,140p' evals/clip_composition/prompts/README.md
sed -n '1,240p' docs/review-brief.md
git show --name-only --format='' 453a51a | sed -n '1,260p'
wc -l evals/clip_composition/reports/generation-system-model-label-20260710-v001.md evals/clip_composition/reports/theme-redo-B-rough-top50-result-20260710-v001.md evals/clip_composition/reports/theme-generation-audit/nOEWCNc77MI-rough-top50-theme-v002-candidate-audit-20260710-v001.md evals/clip_composition/reports/theme-generation/nOEWCNc77MI_rough_top50_speech_chars_source_only_v001/theme-llm-v002/nOEWCNc77MI-rough-top50-theme-input-after-stt-20260710-v001/leakage-inspection.md evals/clip_composition/reports/local-stt-completion/nOEWCNc77MI-YE-faluP7zY-full-source-stt-completion-20260710-v001.md evals/clip_composition/reports/material-blocks-nOEWCNc77MI-20260710-full-plus-selected-union-v001.md
sed -n '1,220p' evals/clip_composition/reports/generation-system-model-label-20260710-v001.md && sed -n '1,260p' evals/clip_composition/reports/theme-redo-B-rough-top50-result-20260710-v001.md
sed -n '1,260p' evals/clip_composition/reports/theme-generation-audit/nOEWCNc77MI-rough-top50-theme-v002-candidate-audit-20260710-v001.md && sed -n '1,220p' evals/clip_composition/reports/theme-generation/nOEWCNc77MI_rough_top50_speech_chars_source_only_v001/theme-llm-v002/nOEWCNc77MI-rough-top50-theme-input-after-stt-20260710-v001/leakage-inspection.md
sed -n '1,220p' evals/clip_composition/reports/local-stt-completion/nOEWCNc77MI-YE-faluP7zY-full-source-stt-completion-20260710-v001.md
sed -n '1,140p' evals/clip_composition/reports/material-blocks-nOEWCNc77MI-20260710-full-plus-selected-union-v001.md
jq 'keys' evals/clip_composition/outputs/theme-generation/nOEWCNc77MI_rough_top50_speech_chars_source_only_v001/theme-llm-v002/nOEWCNc77MI-rough-top50-theme-input-after-stt-20260710-v001/run-manifest.json
jq 'keys' evals/clip_composition/outputs/theme-generation/nOEWCNc77MI_rough_top50_speech_chars_source_only_v001/theme-llm-v002/nOEWCNc77MI-rough-top50-theme-input-after-stt-20260710-v001/leakage-inspection.json
jq 'keys' evals/clip_composition/outputs/theme-generation-audit/nOEWCNc77MI-rough-top50-theme-v002-candidate-audit-20260710-v001.json
jq '.windowingResult' evals/clip_composition/outputs/theme-generation/nOEWCNc77MI_rough_top50_speech_chars_source_only_v001/theme-llm-v002/nOEWCNc77MI-rough-top50-theme-input-after-stt-20260710-v001/run-01-gemini-output.json
rg --files evals/clip_composition | rg '/?freeze.*(nOEWCNc77MI|multi|material).*\.(mjs|ts)$' | sort
pnpm run type-check
node --check evals/clip_composition/merge_dp_candidate_runs.mjs && runner/node_modules/.bin/tsc --noEmit --target ES2022 --module Node16 --moduleResolution Node16 --skipLibCheck --types node --typeRoots node_modules/.pnpm/@types+node@25.9.1/node_modules/@types evals/clip_composition/run_local_stt_chunked.ts
jq empty evals/clip_composition/stt-targets/nOEWCNc77MI.json evals/clip_composition/stt/nOEWCNc77MI_YE-faluP7zY_local30_v001/source/manifest.json evals/clip_composition/stt/nOEWCNc77MI_YE-faluP7zY_local30_v001/source/transcript.json evals/clip_composition/stt/nOEWCNc77MI_YE-faluP7zY_local30_v001/source/word-timestamps.json evals/clip_composition/outputs/theme-generation/nOEWCNc77MI_rough_top50_speech_chars_source_only_v001/theme-llm-v002/nOEWCNc77MI-rough-top50-theme-input-after-stt-20260710-v001/run-01-gemini-output.json evals/clip_composition/outputs/dp-candidate-run-union-nOEWCNc77MI-YE-faluP7zY-20260710-full-plus-selected-v001.json evals/clip_composition/outputs/material-blocks-nOEWCNc77MI-20260710-full-plus-selected-union-v001.json && git diff --check
test ! -e evals/clip_composition/fixtures/nOEWCNc77MI_material_v001 && test ! -e evals/clip_composition/expected/nOEWCNc77MI_material_v001.json && git show --name-only --format='' 453a51a 3680a7e | rg '^(runtime/|backend/|client/|packages/shared/|runner/src/steps/|evals/clip_composition/fixtures/|evals/clip_composition/expected/)' || true
```

保存データの再集計には `jq` を使用した。主な結果は、生成系統ラベル `llm-v012@gemini-web-flash`、リーク検査9/9 pass、8窓25候補、STT 395/395、DP統合34候補、17ブロック・16境界、`readyForFreeze=false` である。

汎用複数区間凍結previewは17ブロック・16境界を認識し、全ブロックに合計861 STT区間が対応した。人間確認decision未入力のため `fixtureWriteReady=false` となった。`--writeFixture true` を付けた負のテストは「人間確認decisionが未入力」として終了コード1になり、fixture/expectedが存在しないことを再確認した。この失敗は凍結ガードの期待動作である。

確認パッケージ検査:

```bash
node -e 'const fs=require("fs"),path=require("path"),cp=require("child_process"); const root=path.resolve("evals/clip_composition/outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001"); const html=fs.readFileSync(path.join(root,"index.html"),"utf8"); const refs=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]).filter(x=>!x.includes("://")); const uniq=[...new Set(refs)]; const missing=uniq.filter(x=>{const p=path.join(root,x);return !fs.existsSync(p)||fs.statSync(p).size===0}); const files=[]; const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);e.isDirectory()?walk(p):files.push(p)}}; walk(root); const media=files.filter(p=>/[.](mp4|wav)$/.test(p)); const invalid=[]; for(const p of media){try{const out=cp.execFileSync("ffprobe",["-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",p],{encoding:"utf8"}).trim(); if(!(Number(out)>0)) invalid.push(path.relative(root,p));}catch{invalid.push(path.relative(root,p));}} const boundaryHeadings=(html.match(/<h2>境界[0-9]+:/g)||[]).length; const forbidden=["全run一致","aX-axQMWR3c"].filter(x=>html.includes(x)); const result={htmlBytes:Buffer.byteLength(html),referenceCount:refs.length,uniqueReferenceCount:uniq.length,missingOrEmptyCount:missing.length,boundaryHeadings,fileCount:files.length,mediaCount:media.length,invalidMediaCount:invalid.length,forbidden}; console.log(JSON.stringify(result,null,2)); if(missing.length||invalid.length||forbidden.length||boundaryHeadings!==16||refs.length!==uniq.length) process.exit(1);'
```

結果: pass。参照448件、欠落0、境界16、媒体160件、無効媒体0、禁止文言0。

失敗:

最初の再集計で、保存JSONの配列名を `windows`、`payloads` と仮定した2件の `jq` が終了コード5になった。ファイル破損ではなく検証コマンド側のスキーマ仮定違いであり、`keys` を確認後、実在する `runOutputs`、`results`、`analysis`、`windowingResult` から再集計してpassした。データ変更はない。

未実行:

- ZEV本体UI起動
- STT再実行
- Web Gemini再実行
- DP照合・素材再構成の再実行
- 人間による16境界確認
- fixture/expected凍結
- theme-llm-v002正式範囲hit採点

## 14. 証拠

生成系統:

```json
{
  "id": "llm-v012@gemini-web-flash",
  "baseId": "llm-v012",
  "model": "gemini-web-flash"
}
```

既存結果は `id: llm-v012` のまま残っている。

テーマ生成形式品質:

```json
{
  "windowCount": 8,
  "preMergeCandidateCount": 25,
  "postMergeCandidateCount": 25,
  "timingCorrectionCount": 1,
  "leakagePass": "9/9",
  "missingEvidenceRangeCount": 0,
  "partialWindowCount": 0
}
```

全域STT:

```json
{
  "fullChunkCount": 395,
  "processedChunkCount": 395,
  "partial": false,
  "segmentCount": 53180,
  "wordTimestampCount": 53180,
  "timeInversions": 0,
  "outOfRangeWords": 0
}
```

素材再構成と停止位置:

```json
{
  "mergedCandidateRunCount": 34,
  "blockCount": 17,
  "boundaryCount": 16,
  "fixtureCreated": false,
  "expectedCreated": false,
  "readyForFreeze": false,
  "reason": "人間による16境界の確認と固定テーマ入力が未完了"
}
```

確認開始地点:

`evals/clip_composition/outputs/boundary-check/nOEWCNc77MI/20260710-full-plus-selected-union-v001/index.html`

回答形式:

```text
境界1: 前一致 / 後一致 / 切替あり・なし・判定不能 - 理由
```

16境界の回答後に、正解区間から逆算した固定テーマを1行で指定する。
