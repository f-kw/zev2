# candidate 13 基本テロップ ゲートC接続準備 差分監査 v001

- 作成日: 2026-07-25
- 種別: 主線停止後の副線②・読み取り専用差分調査
- 比較元: `presentation-candidate13-caption-gate-c-connection-readiness-audit-20260724-v001.md`
- 比較元commit: `3cba06214f2bd39f797e96bac06f57dba6a163bb`
- 主線停止commit: `feb97613a95d2d20f1a3bfa552a4d4ad9eb9e642`
- 状態: 調査のみ。コード、契約、正式成果物、共有文書を変更していない
- 人間作業: 0件

## 1. 結論

前回監査以後、B1のpackage生成・意味回答検査を支える実装と契約は大幅に具体化した。しかし、ゲートCへ接続できる前提はまだ成立していない。

現時点の主線は、package側132件を一度実行して128件合格・4件不合格で停止した地点である。意味回答側、Gate A回帰、残存source atom回帰、candidate 13読み取り専用preflight、前提P再照合は、このattemptでは全て0回である。

したがって、次工程を「正式package生成からGemini実走までの一括実行」として扱ってはいけない。承認済みの停止点は引き続き次の順である。

1. B2を全件合格させる。
2. B3で正式7ファイルpackageを1回生成し、そこで停止する。
3. B4で表示計画・v003対生成・確認描画入口の完全契約を固定する。
4. B5でprompt・実行payload・実行面・費用を固定する。
5. B6でGeminiをrun 1、自動再試行0で実行する。

一つの承認依頼文書にB3〜B6の見通しを並べることはできるが、実行許可を一つへ畳むには、承認済みの段階分離を改定する別の明示判断が要る。

## 2. 前回監査から進んだこと

### 2.1 B1/B2の実装資産

次の実装は存在する。

- source-only packageの構築・検査処理
- package正式実行処理
- Gemini回答を厳密に検査し、元文字へ戻す決定的処理
- 意味回答検査の正式実行処理
- package側と意味回答側の合成検査

前回監査以後、次の契約が追加・具体化された。

- strict JSONの正本形式
- B1/Gemini往復における整数限定
- package側・意味回答側の版付きchunk読取
- hashbangと正当な字句の限定受理
- 壊れた子を部分利用しない集計
- 公開後7ファイルの内容・path・hash再照合
- production内部の取得不能な生観測を増築せず、test専用fault traceと実ファイル操作へ置き換える契約
- staging/published rootの子孫pathだけを観測対象とする契約
- fault後も実際に発生した操作を全件保存する契約
- fault snapshotを厳密一件のentryとして記録する契約

これはゲートCの入力契約を強くする進展だが、B2全体の合格実証ではない。

### 2.2 最新のB2実測

正本:

`presentation-candidate13-caption-gate-b2-observation-replacement-full-test-stop-report-20260725-v001.md`

実測:

- package側: 132件
- 合格: 128件
- 不合格: 4件
- 再実行: なし
- 意味回答側: 0回
- Gate A回帰: 0回
- 残存source atom回帰: 0回
- candidate 13 preflight: 0回
- 前提P再照合: 未成立
- B2安定tag: 未発行

不合格4件は、内容hash不一致の帰属、staging後のjob再読取、published側open故障の帰属、先行停止による決定性負例未観測である。

128件を部分合格や品質率として使わない。

## 3. 現在成立している前提

| 前提 | 状態 |
|---|---|
| candidate 13の正式基礎映像 | 成立。2,535 frame・4,056,000 sample |
| source時刻から完成映像frameへの対応 | timeline v002で成立 |
| 切除後に残った発話正本 | 354件で成立 |
| 機械的な区切り候補 | 205件。Gate A合格済み |
| Gate A安定点 | `stable/gate-a-complete-20260723` |
| Geminiが選べる意味回答形式 | B1契約で固定済み |
| 回答から元本文・時刻・IDを機械復元する処理 | 実装済み |
| 指示書外枠、正式プリセット、renderer v002、QC | 合成検査済み |
| formal package | 未生成 |
| caption prompt | 未登録 |
| Gemini raw回答 | 未生成 |
| v003テロップ計画・指示書・解決package | 未設計・未生成 |
| 実描画 | 未生成 |

## 4. 現在存在しない正式成果物

次は調査時点で存在しない。

- B2 candidate 13 preflight job  
  `outputs/presentation/caption-semantic-source-package-preflight-jobs/DmWu0jVQfTE-candidate-13-caption-b1-v001.json`
- B3 formal job
- 正式7ファイルpackage
- 正式packageのrun report
- `caption_planning_prompt_v001.md`
- prompt台帳行
- execution payload
- Gemini raw回答
- 意味回答検査report
- 正式compiler入力
- v003表示計画・指示書・専用解決package
- candidate 13の基本テロップ描画

formal rootとして予約された次のpathも未作成である。

`outputs/presentation/segmenter-boundary-evidence/DmWu0jVQfTE-candidate-13-v001`

## 5. ゲートCへ進む前の未成立前提

優先順は次である。

1. package側132/132
2. 意味回答側の全件合格
3. Gate A 21/21回帰
4. 残存source atom 50/50回帰
5. candidate 13読み取り専用preflight合格
6. 前提Pの再照合
7. B2完了報告・正式成果物hash再照合・文書同期
8. `stable/b2-complete-*`と同一commitのJOURNAL entry
9. B3正式jobの事前固定とformal packageの1回生成
10. B4の完全実装契約
11. B5のprompt・payload・実行面・manifest契約
12. B6のrun 1

1〜8が成立する前にB3を始めない。9で停止せず10〜12へ連続しない。

## 6. 次ゲート承認依頼へ追加すべき更新点

### 6.1 B3正式package

承認依頼には次を入れる。

- formal-generation jobを実行前に固定する。
- 生成先は既存Gate A jobが指定した一箇所だけとする。
- 生成先、work、lockのいずれかが存在したら停止する。
- 1回実行、自動再試行0。
- 固定7ファイルを原子的に公開する。
- 公開後にpath、byte、file hash、canonical hash、相互参照を再照合する。
- B3完了後はprompt作成やGeminiへ進まず停止する。
- formal packageの実byteとhashをB5の唯一の入力正本にする。

### 6.2 B4をGeminiより前へ置く

Gemini回答を見た後に下流契約を都合よく作らないため、次をB6前に固定する。

- 正式cue、target、instruction、resolution packageの全field
- 354文字のexactly once被覆
- cue・target・instructionの一対一
- `pending_human_review`の状態遷移
- v003からrendererへの入口
- raw回答、意味検査report、正式packageまで戻れるhash鎖
- CLI 0/1/2、違反種類、検査順、原子的公開
- 合成検査とproductionが同じ処理を使う入口

### 6.3 実行面を一意にする

現在は、旧方向設計の「Microsoft Edge上のWeb Gemini」と、後の「APIレスポンス上のモデル表記をmanifestへ残す」が併存している。

B5で次のどちらかを一意にする必要がある。

- API実行
- Edge上のWeb実行

API実行を選ぶ場合:

- caption専用の承認済みAPI入口は現存しない。
- workspaceには`@google/genai`依存があるが、runner本体の既存利用を無断で評価環境の正式入口へ流用しない。
- endpoint、認証の読み方、token計測方法、raw response保存、モデル表記の取得field、timeout、終了コードを事前固定する。

Web実行を選ぶ場合:

- APIレスポンス上のモデル表記は取得できないので、manifest schemaをWeb実測証拠へ合わせて別途固定する。
- Edge実体確認、画面上のモデル確認、実行所有tabだけの終了確認、raw回答抽出範囲を固定する。
- 既存共通Web runnerはcaption出力の厳密全体拒否を保証しないため、そのまま正式入口にしない。

### 6.4 モデルとattempt

実行構成には次を記録する。

- requested model ID: `gemini-3.6-flash`
- 実行日
- 実行面
- APIならレスポンス上のモデル表記
- Webなら画面上のモデル表記と証拠
- prompt版と実byte hash
- formal package全体のhash
- raw回答実byte hash
- attempt ID
- run: 1
- automatic retry: 0

同一attempt途中のモデル変更は禁止する。変更時は旧attemptを保持し、新attempt・新manifest・別承認へ戻る。

### 6.5 費用

現時点で正式な費用額は出せない。

既知の18,956 bytesは2026-07-23の事前構造化入力であり、正式package・prompt・tokenizerで測ったtoken数ではない。独自係数でtokenへ換算しない。

B6承認依頼の費用欄は、B3とB5完了後に次の実測値から作る。

- 実際に送るprompt＋構造化入力のtoken数
- 事前固定する最大出力token数
- 呼出回数1
- 入力単価: US$1.5 / 1M tokens
- 出力単価: US$7.5 / 1M tokens
- 入力費、出力上限費、合計上限を別表示

token計測方法自体も、実行するモデル・APIの正本に合わせB5で固定する。

## 7. ゲートC監査の結論更新

2026-07-24の監査結論は維持される。

- 上流と下流の両端はある。
- B4の縫い目は未完成。
- 初描画の目的は「読める・ズレない・欠けない」だけ。
- G4〜G7、素材、SE、タイトル、サムネイルは初描画の不合格理由にしない。
- 意味モデルの回答を見てからv003契約を作らない。

今回の差分は、B1/B2内部が契約・実装とも前進した一方、B2の合格、formal package、prompt、Gemini、v003、描画は依然として未成立であることを確認した点である。

## 8. この副線で行っていないこと

- B2不合格の修正
- package・意味回答側・回帰・preflightの実行
- formal job・正式package生成
- prompt登録
- Gemini・他LLM実走
- v003契約の起草
- 指示書、解決package、描画
- `DECISIONS.md`、`HANDOVER.md`の変更
- 人間確認依頼

## 9. 人間作業

- 本監査: 0件
- 現時点で副線から独立して求める判断: なし
- 主線B2完了後: B3承認1件
- B4契約提示後: B4承認1件
- B5費用・実行面提示後: B6実走承認1件
