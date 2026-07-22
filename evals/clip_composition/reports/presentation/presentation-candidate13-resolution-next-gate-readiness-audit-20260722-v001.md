# candidate 13 残存発話解決 次ゲート準備監査 v001

- 作成日: 2026-07-22
- 区分: 人間待ち中の副線・読み取り監査
- 状態: **実行前。コード、既存成果物、共有文書は変更していない**
- 主線: candidate 13の正式基礎映像は合格済み。次工程の個別承認待ち
- 人間作業: 本監査は0件。次の判断は承認1件、媒体視聴なし

## 1. 結論

現行の低水準生成器を直接実行して、最終的な「解決パッケージ」だけを先に作ることはできない。

理由は3点ある。

1. 正式STTと採用済み2区間から、残す発話要素を決定して来歴を証明する正式な変換工程・jobがまだ無い。
2. 承認済み契約では、解決パッケージは1つの演出指示書と対で作る専用品である。表示対象と指示が無い空パッケージを先に作ると、後で作り直す使い捨てになる。
3. 保存済み`word-timestamps.json`の実体は日本語の文字粒度である。正しく`character-timestamp`と宣言するとG2は限界付き合格となり、正式レンダラーは描画前に停止する。`word-timestamp`と偽装して通してはならない。

したがって、現在地の「残存発話の解決パッケージ生成」は、次の2段へ正して扱う必要がある。

1. 正式区間内の**残存source atom一覧と抽出来歴**を独立成果物として固定する。
2. G1〜G3の表示単位・改行・切替規則が決まった後、演出指示書と最終解決パッケージを**一対で生成**する。

次に承認を求めるべき範囲は、第1段の実装設計と合成検査である。最終解決パッケージ、演出指示書、描画までを一括承認しない。

## 2. 本来の目的の再確認

目的はJSONファイルを1個増やすことではない。

人間が採用したcandidate 13の切り方と同じ映像に対して、残っている発話だけをテロップ・演出の参照先にし、切った部分を後段が誤参照できない状態を作ることが目的である。さらに、その参照関係を元STT、正式組立決定、実生成済み時間対応表のhashから後で追跡できなければならない。

## 3. 正式入力として利用できる資産

| 意味 | path | SHA-256 |
|---|---|---|
| STT実行来歴 | `evals/clip_composition/stt/DmWu0jVQfTE_first_gate_unseen_local120_v001/source/manifest.json` | `f7d2c04f8f9e67e27ff5b461236f01d3b68bb4f53ba448c0c4b5387c95a6d03b` |
| 文字時刻列 | `evals/clip_composition/stt/DmWu0jVQfTE_first_gate_unseen_local120_v001/source/word-timestamps.json` | `ebf0190c9ce0fd96b4e1faa18717f41d73126fc914172474ac791df7f17ad065` |
| 元媒体・STTの同一性 | `evals/clip_composition/outputs/presentation/20260721-first-real-data-assembly-gate-v001/source-identity.json` | `a7c9e9a8c3917662bcf3b66fad46cedc56f5ca558467226453339ea370108993` |
| 発話まとまりと文字IDの対応 | `evals/clip_composition/outputs/presentation/20260721-first-real-data-assembly-gate-v001/candidate-manifest.json` | `3937747e947ef0dd27a67e289d06cece8c17a55b655c85fa7d6aaf21f696ec12` |
| 人間承認済み組立決定 | `evals/clip_composition/outputs/presentation/20260722-first-real-data-assembly-decision-v001/assembly-decision.json` | `b2360d5e2aa56075728d692a7d456455d2cac168d47325631cfea4d919e3aa32` |
| 人間が見たDとの照合票 | `evals/clip_composition/outputs/presentation/20260722-first-real-data-assembly-decision-v001/formalization-receipt.json` | `a0979241643d77494443ab80880cd3c4dd75be5c0241424a7634082f65275fca` |
| 実生成済み時間対応表 | `evals/clip_composition/outputs/presentation/base-media/DmWu0jVQfTE-candidate-13-v002/timeline.json` | `802f570dd4f8ea90ef63b0b9afb9a026abf0b18e43e51f2aab51bd62c2180fec` |
| 基礎映像の生成記録 | `evals/clip_composition/outputs/presentation/base-media/DmWu0jVQfTE-candidate-13-v002/generation-manifest.json` | `e06a606e7348a8c30a743edd9acd5da96e035125b2b69a33257d0c31cf9b81db` |
| 基礎映像の合格記録 | `evals/clip_composition/outputs/presentation/base-media/DmWu0jVQfTE-candidate-13-v002/validation-report.json` | `e906b4424609176d019ddc4c8d314df056feb87de1e993bf84f247eff5c21079` |

同一性の正本は次で固定されている。

- `sourceRef`: `youtube:DmWu0jVQfTE`
- `sourceProvenance`: `youtube-format299-video+frozen-format251-audio-v001`
- 正式区間1: `[1,920,260, 1,977,670) ms`
- 正式区間2: `[1,981,394, 2,008,506) ms`

## 4. 読み取り実測

正式入力だけを読み取り、残存要素を机上投影した結果は次のとおり。

| 項目 | 実測 |
|---|---:|
| 残存する文字時刻要素 | 354件 |
| 発話まとまり1 | 126件、`word-6932`〜`word-7057` |
| 発話まとまり2 | 122件、`word-7058`〜`word-7179` |
| 発話まとまり3 | 106件、`word-7180`〜`word-7285` |
| 第1正式区間内 | 248件 |
| 第2正式区間内 | 106件 |
| 切除した3,724ms内 | 0件 |
| 正式境界をまたぐ要素 | 0件 |
| ID重複 | 0件 |
| 時刻逆転・正の時刻重複 | 0件 |
| `SPEAKER_00` | 325件 |
| `unknown` | 29件 |

`unknown` 29件は、既存の正式話者正規化規則によりパッケージ化時に`null`へ写す対象である。`SPEAKER_00` 325件は同一入力内だけの不透明な声クラスタとして保持し、人物名へ変換しない。

未凍結の監査投影値は次のとおり。将来の正式成果物IDではなく、実装後の不一致検出用の比較材料である。

- 写像前354件のcanonical SHA-256: `cd76bfd2fe7ab3b5156433f6d9e2229b20c3d3bbd7d94f2b9e9abbc804a6efb3`
- 話者正規化後354件のcanonical SHA-256: `c0e627ec7c0096910991d965b04e5bd3b4e101bec0bdd4e54f0754cfd21fcac0`

今回の切除区間には発話要素が0件だったため、実データだけでは「切除区間内の要素を除外できる」検査にならない。合成回帰には、切除区間内の要素と境界をまたぐ要素を別々に必ず入れる必要がある。

## 5. 現行生成器でできること・できないこと

既存入口は`build_presentation_resolution_package_v002.mjs`である。

できること:

- 呼出側が完成させた元発話要素、表示対象、caption契約を版付きパッケージへ格納する。
- 登録済み非人物話者値を`null`へ写す。
- 写像前後の発話列hashとパッケージhashを生成記録へ残す。

できないこと:

- STTから正式区間内の要素を抽出する。
- 組立決定、時間対応表、基礎映像の合格状態を読む。
- 申告された元artifactの実byte hashを生成時に再計算する。
- 区間境界をまたぐ要素を検出する。
- 表示対象、改行、表示切替、演出指示を決める。
- 既存出力への上書きを防ぐ。
- 単体で正式な終端検査報告を作る。

したがって、手入力でbuild requestを作って直接CLIを実行しても、「正式区間から正しく抽出した」という証明にはならない。

## 6. 解決パッケージ単独先行が契約に合わない理由

承認済み境界契約は、未参照target・未参照cueを拒否する。その帰結として解決パッケージを「1つの指示書と対で生成する専用品」と定義している。

現時点ではG1〜G3の表示対象、cue、改行、表示切替、演出指示書が未確定である。`targets: []`、`captionContracts: []`の空パッケージは空指示書との組なら形式上通るが、後続の実指示書から参照できない。実指示書を作る時にはパッケージ本体とhashを作り直す必要がある。

このため、空パッケージを「正式な残存発話解決パッケージ」と呼んで凍結しない。先に固定できるのは、表示対象を持たない**残存source atom成果物**とその抽出来歴までである。

## 7. 文字粒度による正式描画の停止条件

保存ファイル名は`word-timestamps.json`だが、candidate 13の対象354件は全件1文字である。正しい申告は`character-timestamp`である。

G1〜G3契約では、文字粒度入力について次を未検査として明示する。

- 言語学的な単語途中ではないか。
- 意味が読める短いまとまりか。
- 1画面の読みやすい情報量か。

この状態は`passed_with_declared_limit`であり、正式レンダラーv002は`INSTRUCTION_CONTRACT_PARTIAL`として描画前に停止する。ファイル名だけを根拠に`word-timestamp`と宣言して通すことは禁止する。

したがって、後続の指示書設計では次のいずれかを版付きで決める必要がある。

1. 由来と処理版を固定した真の語単位成果物を作り、文字列・時刻・構成文字IDの完全対応を保存する。
2. 文字粒度の限界付き合格をどの追加認定で正式描画へ進めるか、契約とレンダラーを版付き改訂する。
3. 解決できるまで描画前で停止する。

現時点では1〜3のどれも承認されていない。係数、独自の文字数閾値、ファイル名の読み替えで穴埋めしない。

## 8. 推奨する次ゲート

### 8.1 今回承認を求める範囲

`candidate 13 残存source-atom adapter/job 実装設計v001`を主線として作成・承認する。

設計に必須の処理は次のとおり。

1. §3の正式入力を全て実byte hashで照合する。
2. 組立決定と実生成済み時間対応表の区間列、sourceRef、sourceProvenanceが完全一致することを検査する。
3. STT文字時刻列、STT transcript、candidate manifestのID・本文・時刻・raw話者・発話まとまり対応を354/354で完全照合する。
4. 1つの正式区間へ要素全体が包含される場合だけ採用する。
5. 境界への部分重複、複数区間対応、時刻逆転、ID重複、入力hash不一致は救済せず停止する。
6. `word-<元segmentId>`を要素IDとして保持し、発話まとまりID 1〜3をcandidate manifestから保持する。本文、時刻、話者を修正しない。
7. 残存source atom成果物と、全入力hash、区間別件数、除外件数、停止検査、出力canonical hashを持つ抽出receiptを対生成する。
8. 同じ入力から同じbyteを得る決定性、既存出力拒否、CLI終了コードを検査する。
9. 合成回帰に、切除区間内要素と境界またぎ要素を含める。
10. 実装・合成検査の完了報告で停止する。candidate 13実データへの正式実行はさらに別承認とする。

### 8.2 その次の設計

残存source atomが固定された後、次を1つの契約変更単位として設計する。

- 語単位または限界付き文字単位の扱い。
- G1〜G3の表示対象、改行、表示切替。
- timeline segmentをまたがないcue分割。今回の2区間を1 cueへ束ねると正式レンダラーが停止するため、切断前後は必ず別cueにする。
- 演出指示書と専用解決パッケージの対生成。
- 指示書検査後の停止。描画は別承認。

## 9. この承認で進めないもの

- 最終解決パッケージの生成。
- 演出指示書、G4〜G7、LLM実走。
- 本文修正、句読点追加、表記正規化、フィラー削除。
- レンダラーjob、実描画、比較媒体、確認UI。
- candidate 11・12・36。
- 新素材の取得・選定。
- `character-timestamp`から`word-timestamp`への無根拠な読み替え。
- 契約検査や未参照拒否の緩和。

## 10. 主線で回収する共有文書追記案

副線のため、現時点では`DECISIONS.md`と`docs/HANDOVER.md`を変更しない。次の主線節目で以下を回収する。

- 「残存発話解決パッケージ生成」を「残存source atomと抽出来歴の固定 → 指示書と最終解決パッケージの対生成」へ訂正する。
- 実データ用adapter/jobが未実装であることを現在地へ明記する。
- 保存済みSTTは文字粒度であり、現行renderer v002が限界付きG2を正式描画へ通さないことを残件登録する。

## 11. 人間作業申告

- 本監査: **0件。媒体視聴なし。時間計測なし。**
- 次の判断: **設計着手の承認1件。媒体視聴なし。1分未満の規模目安。**
- 次の設計・実装・合成検査: 人間作業0件。
- candidate 13実データ実行、指示書、描画は、各段の作業量を改めて申告して別承認とする。
