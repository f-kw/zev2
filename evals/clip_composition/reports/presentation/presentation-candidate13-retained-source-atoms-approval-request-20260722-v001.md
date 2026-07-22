# candidate 13 残存source atom抽出 実装承認依頼 v001

- 作成日: 2026-07-22
- 対象: `DmWu0jVQfTE` candidate 13
- 状態: **実装前・人間承認待ち**
- 人間作業: 承認判断1件、媒体視聴なし、目安1分未満

## 1. 現在地

candidate 13では、人間が採用した2区間から正式基礎映像と時間対応表を生成し、実データ入口の検査に合格した。

| 成立済み条件 | 実測 |
|---|---:|
| 元動画の絶対音声時刻格子 | 423,073,008 sample |
| 人間採用Dとの映像一致 | 2,535 frame |
| 人間採用Dとの音声一致 | 4,056,000 sample |
| 基礎映像生成検査 | 7項目すべて合格、違反0 |
| 修正後の回帰検査 | 56/56合格 |

正式基礎映像は次の4成果物として固定済みである。

- `base-media.mp4`
- frame正本の`timeline.json`
- `generation-manifest.json`
- `validation-report.json`

まだ存在しないのは、**切断後に残った発話だけを後段へ渡す正式成果物**である。現状のSTT全文をそのまま参照すると、切除済み区間の発話をテロップや演出が再び参照できてしまう。

## 2. 今回実装する処理

人間採用区間、正式基礎映像、STT、candidate manifestを実byteで照合し、正式区間へ完全に含まれる発話要素だけを抽出する。

出力対象は次の3件だけである。

1. 文字粒度の残存source atom成果物
2. 入力・実装・抽出規則・件数・hashを記録する生成記録
3. 全検査の合否を記録する検査報告

この工程は、表示文、改行、テロップ切替、G4〜G7の演出判断を行わない。人間が採用した映像を再編集する工程でもない。

## 3. 承認を求める範囲

承認対象は、実装設計v001の§4〜§13で固定した次の作業である。

- 汎用の残存source atom抽出器
- 正式jobを受け取る実行器
- 合成testdataと検査
- 固定違反コード全件の意図的な発火確認
- 既存の話者契約・指示書契約・renderer系の全回帰
- candidate 13の正式入力を使う**読み取り専用preflight**
- 実装を固定するcommit A
- commit Aの実装byteとpreflight値を束縛した正式job JSON
- 正式jobと実装完了報告だけを固定するcommit B

preflightはmemory上の投影だけを行い、正式出力先へ成果物を公開しない。

## 4. 承認に含まれない作業

次は今回の承認対象外であり、自動では進めない。

- candidate 13の正式jobを1回実行すること
- 正式なsource atom成果物を公開すること
- 文字から語境界を作ること
- 意味の読めるテロップ単位・改行・表示切替を決めること
- G4〜G7の意味判断またはLLM実走
- 解決パッケージ、テロップ・演出指示書の生成
- 動画描画、確認UI、人間視聴
- candidate 11・12・36への展開
- 新素材の取得・STT・実走
- `DECISIONS.md`、`docs/HANDOVER.md`、承認済み文書の変更

正式jobの実行は、今回の実装完了報告を確認した後の別承認とする。

## 5. 実装で維持する重要条件

### 5.1 切除済み発話を戻さない

- 発話要素の半開区間全体が、正式timeline segmentのちょうど1件へ完全包含される場合だけ採用する。
- 正式区間の境界を部分的にまたぐ要素は、分割・丸め・許容せず停止する。
- 複数segmentへ所属する場合も停止する。
- 元IDを維持し、切除後の再番号付けをしない。

### 5.2 文字粒度を単語と偽らない

STTファイル名に`word-timestamps`とあるが、candidate 13の実体は1文字単位である。出力は`character-timestamp`と明記する。

読み取り監査では354文字から205語候補を作れることを確認したが、語候補は正式成果物ではない。粒度名だけを`word-timestamp`へ変えて現行G2検査を通すことは禁止する。

### 5.3 話者を推測しない

- `SPEAKER_00`は人物名でなく、不透明な話者クラスタのまま保持する。
- `unknown`は抽出時に`null`や既知人物へ変えない。
- 話者正規化は、後段の正式解決パッケージ生成器だけが行う。

### 5.4 入力と実装をbyteで固定する

- job、実装2ファイル、直接入力、展開入力、実基礎映像を実byte hashで照合する。
- symlink、root外path、処理中の差し替え、既存出力、他の実行が持つlockを拒否する。
- 既存成果物の削除・上書き・後方互換用fallbackを作らない。
- 成功成果物は決定的にし、同じ意味入力から同じbyteを得る。

## 6. preflightの事前固定値

読み取り専用preflightは、次へ完全一致することを要求する。

| 区分 | 件数 | ID範囲 |
|---|---:|---|
| speech 1 | 126 | `word-6932`〜`word-7057` |
| speech 2 | 122 | `word-7058`〜`word-7179` |
| speech 3 | 106 | `word-7180`〜`word-7285` |
| 合計 | 354 |  |

追加条件:

- segment 1: 248件
- segment 2: 106件
- `SPEAKER_00`: 325件
- `unknown`: 29件
- missing 0件、extra 0件
- cut内atom 0件
- 境界交差0件
- source atomの正の時間重なり0件
- raw atom列のcanonical SHA-256: `cd76bfd2fe7ab3b5156433f6d9e2229b20c3d3bbd7d94f2b9e9abbc804a6efb3`

speech 2はcandidate manifestへ2回掲載されている。両コピーの内容を完全一致検査してから1件へ統合し、単純連結による476件化を拒否する。

## 7. 実装完了の判定

次を全て満たした場合だけ完了と報告する。

1. schema、抽出器、正式job実行器、合成testdataを実装した。
2. 固定違反コード集合と、検査で実際に観測したコード集合が完全一致した。
3. 新規検査と既存全回帰が全件合格した。
4. 同じ意味入力からsource atom成果物がbyte単位で一致した。
5. 入力差し替え、既存出力、lock、symlink、rename競合で安全停止した。
6. candidate 13の読み取り専用preflightが§6へ完全一致した。
7. 実装commit A内の実装byte、実際に読み込むmodule、正式jobの実装bindingが完全一致した。
8. 正式jobと完了報告をcommit Bへ記録し、その前後で実装byteが変わっていないことを確認した。
9. テスト件数、全違反コード発火、決定性、入力不変、preflight値、実装binding、正式job SHAを完了報告へ明記した。

どれか一つでも満たさない場合は、正式jobを作ったことにせず原因を報告して停止する。

## 8. この後の見通し

この実装が成立しても、candidate 13は完成ではない。次は別承認で正式jobを1回実行し、残存354文字を正式成果物へ固定する。

その後は、次の順で進める。

1. 文字と完全対応する語境界証拠
2. 意味の読めるテロップ分割・改行・表示切替
3. G4〜G7の意味判断
4. 指示書と専用解決パッケージの対生成
5. 描画と描画後QC

candidate 13の完走後は、candidate 11・12・36へ展開しない。3候補の既存記録を凍結保持し、チャットリプレイ取得可能な新素材を複数案から人間が選ぶ。

## 9. 人間作業量

- 今回: **承認判断1件、媒体視聴なし、目安1分未満**
- 承認後の実装・検査・preflight: **人間作業0件**
- 正式job実行: 完了報告後の別承認1件
- テロップ・演出・描画: 各段の設計時に改めて申告

## 10. 承認依頼文（貼り付け用）

> candidate 13残存source atom抽出工程 実装設計v001を承認する。承認範囲は、残存source atom抽出器、正式job実行器、合成検査、既存全回帰、candidate 13の読み取り専用preflight、正式job JSON固定、実装完了報告までとする。正式jobの実行、正式source atom出力の公開、語境界生成、テロップ・演出指示書、LLM実走、描画、共有文書の変更、他候補・新素材への展開は含まない。設計§13の完了条件を全て満たしたら報告して停止する。

## 11. 参照文書

- 実装設計: `presentation-candidate13-retained-source-atoms-implementation-design-20260722-v001.md`
- 正式基礎映像完了報告: `presentation-first-real-data-base-media-attempt-v002-completion-20260722-v001.md`
- 残存発話の前提監査: `presentation-candidate13-resolution-next-gate-readiness-audit-20260722-v001.md`
- テロップ表示単位監査: `presentation-candidate13-caption-granularity-readiness-audit-20260722-v001.md`
- テロップ・演出指示接続監査: `presentation-candidate13-caption-instruction-connection-readiness-audit-20260722-v001.md`
