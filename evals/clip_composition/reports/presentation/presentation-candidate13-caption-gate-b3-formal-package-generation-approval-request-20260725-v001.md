# candidate 13 基本テロップ ゲートB3 正式入力package生成 承認依頼 v001

- 日付: 2026-07-25
- 状態: **設計提示・人間承認待ち**
- 前提: B2完了、`stable/b2-complete-20260725`
- 対象: candidate 13の正式source-only packageを1件だけ生成
- 人間作業: 承認判断1件。媒体視聴・時刻入力・時間計測なし
- LLM費用: 0。B3ではGeminiを実走しない

## 1. 目的

B2で合成検査と読み取り専用preflightを通した同じproduction経路へ、事前固定した正式jobを1回だけ渡し、candidate 13の固定7ファイルを正式出力先へ原子的に公開する。

B3の目的は、**Geminiへ渡す入力を、元文字・時刻・ID・候補対応・表示幅の来歴を保ったまま正式成果物にすること**である。日本語の改行品質を採点したり、Geminiを実走したり、描画したりする段階ではない。

## 2. B2から固定して引き継ぐもの

次はB2の結果を見て変更しない。

- source文字354件。
- container 3件。
- 行末候補205件。
- container別のsource文字126 / 122 / 106件。
- container別の候補60 / 78 / 67件。
- Gate Aのjob、完了報告、入力、実装のpathとhash。
- package生成・検査、runner、表示信頼情報読取の実装とhash。
- 人間認定済みプリセット台帳、空素材index、信頼binding。
- Node `v20.19.6`、ICU `77.1`、locale `ja`、granularity `word`、Node実体SHA-256。
- 正式package ID:
  `DmWu0jVQfTE-candidate-13-caption-semantic-source-package-v001`
- 正式出力先:
  `evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/DmWu0jVQfTE-candidate-13-v001`

B2のpreflight jobをmodeだけ書き換えて使わない。B3用の正式jobを別artifactとして作り、実行前に実byte hashを固定する。実行結果を見てjob、期待件数、入力範囲、出力先を変更しない。

## 3. 正式出力先の親directory

現在、正式出力先の直近親

`evals/clip_composition/outputs/presentation/segmenter-boundary-evidence`

は存在しない。production runnerの再帰作成へ暗黙依存しない。

B3承認に、次の一回限りの準備を含める。

1. workspace rootから直近親までの既存ancestorを、symlinkを追わず安全なdirectoryとして確認する。
2. 直近親だけが不存在であることを確認する。
3. 評価環境の準備工程が、その直近親を非再帰・排他的に1件だけ作る。
4. 作成後に実体path、kind、device、inodeを再確認する。
5. production runner、package core、正式jobのいずれにも親の自動作成・fallback探索を追加しない。

既存、symlink、非directory、root外化、作成競合、再確認不一致があれば正式jobを実行せず停止する。親作成をproduction仕様へ一般化する判断は本承認に含めない。

## 4. 実行前preflight

正式jobを実行する前に、次を読み取りだけで確認する。

1. B3正式jobのschema、mode、ID、入力path、入力hash、期待件数、正式出力先。
2. 正式root、同名lock、同名workが全て不存在。
3. 正式rootの直近親が前節の安全なdirectoryである。
4. B2のpreflight jobと正式jobの差が、job ID、mode、正式公開に必要なfieldだけである。
5. B2完了時のproduction実装3件、Gate A入力、残存発話入力、台帳・信頼情報、Node実体のhashが不変。
6. 正式jobを結果に合わせて再生成しないため、job実bytehashと実行対象commitを実行記録へ先に固定する。

一つでも不一致なら、正式生成0回のまま停止する。期待値を更新して同attemptで進めない。

## 5. 正式生成

preflight合格時だけ、production runnerへB3正式jobを渡して**1回だけ**実行する。

- 自動再試行: 0回。
- 別jobへの切替: しない。
- 既存rootの上書き、merge、削除: しない。
- 既存lock/workの自動削除: しない。
- tmp fileを正式rootへ先に公開: しない。
- 失敗時の期待値短縮、許容差化、部分成果物の合格扱い: しない。

runnerは承認済みの逐次処理どおり、lockを排他的に保持し、workへ固定7ファイルを書き、fileとdirectoryを永続化し、全入力を再照合し、rename直前の所有と同一filesystemを確認してから、work全体を正式rootへ一度だけrenameする。

## 6. 合格条件

次を全て満たした場合だけB3合格とする。

1. CLI exit 0、stderr 0 byte。
2. 正式rootへ固定7ファイルだけが存在する。
3. 欠落、余分、改名、subdirectory、symlink、hardlinkが0。
4. 各ファイルの実byte SHA-256、canonical SHA-256、相互参照がrun reportと完全一致。
5. source文字354、container 3、候補205、container別126/122/106・60/78/67が事前固定値と一致。
6. Gate A内包証拠とB1固有検査が全てpassed。
7. input、job、実装、Node、台帳・信頼情報が開始時と公開前・報告前で不変。
8. lockは所有確認後に解放され、workは正式rootへ移動済み。
9. 公開後の固定7ファイル再読が、生成時のbyte・hash・値と完全一致。
10. 同じ正式jobを二度実行していない。

不合格、exit 1、exit 2、I/O異常のいずれでも、そのattemptを保存して停止する。同attemptで修正・削除・再生成しない。

## 7. 完了報告

B3完了報告には、少なくとも次を分けて記録する。

- 直近親directory準備の検査結果。
- 実行前preflightの結果。
- 正式jobのpath、SHA-256、実行commit。
- CLI終了、stdout/stderrのbyte数とSHA-256。
- 固定7ファイルごとのpath、byte数、file SHA-256、canonical SHA-256。
- source文字・container・候補の件数。
- 入力と実装の再照合結果。
- lock、work、rename、親directory永続化、公開後再読の結果。
- 実行回数が1回であること。
- 停止時は、正式root・lock・workの実状態と、後続へ進んでいないこと。

正式7ファイルが合格しても、自動で次へ進まない。B3完了報告を作成して停止する。

## 8. 今回含めないもの

- prompt台帳の登録。
- execution payloadの作成。
- Gemini・他LLMの実走。
- 意味回答、表示計画、cue、target、演出指示書、解決package。
- 描画、人間確認。

既存の段階契約は、B3の次にB4で表示計画契約、B5でpromptと実行payload、B6でGemini run 1と分けている。B3とGeminiを一括実行すると、正式入力の不備とモデル実行の不備を分離できないため、統合しない。

## 9. Gemini実走の見通し

B6の第一候補は、kawafmm指定の`gemini-3.6-flash`。モデル名は実装へ定数化せず、正式execution manifestへ設定モデルID、実行日、APIレスポンスのモデル表記を記録する。

B6承認前に、B3正式packageから実測した入力token数、呼出回数、出力上限を使い、入力費・出力費を分けて申告する。354文字・205候補を独自係数でtokenへ換算しない。モデル版をattempt途中で変更しない。

## 10. 人間作業量

- B3承認: 1判断。
- B3実行中: 0件。
- 媒体視聴・時刻入力・文字分割・時間計測: なし。
- B3合格後: 次工程の設計／実行承認を別に依頼する。

## 11. 承認依頼文

> candidate 13 基本テロップのゲートB3を承認する。B2で固定した入力・実装・期待件数を変更せず、B3専用正式jobを実行前にhash固定する。正式出力先の直近親が不存在であるため、安全なancestor確認後に評価環境の準備工程が直近親だけを非再帰・排他的に一度作り、production runnerへ親作成やfallbackを追加しない。正式root・lock・work不存在と全入力hashをpreflightし、合格時だけ正式source-only packageを1回生成する。固定7ファイル、hash、相互参照、件数、入力再照合、原子的公開、公開後再読の全条件が成立した場合だけ合格とし、不合格時は修正・削除・再実行せず停止する。承認範囲はB3の正式package生成と完了報告までで、prompt登録、Gemini実走、意味回答、指示書、描画は含めない。
