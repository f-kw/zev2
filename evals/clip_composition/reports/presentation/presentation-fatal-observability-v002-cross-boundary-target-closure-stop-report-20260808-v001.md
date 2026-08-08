# fatal観測性v002 全境界targetFile閉包 停止報告 v001

- 日付: 2026-08-08
- 状態: **STOP**
- 開始commit: `84c723362de8a0ee0d74fd0303eabab0992c879f`
- 承認元停止報告SHA-256: `1af2da62282f6eccd934262d4a0718984b0cfe4d88d0fe9aab28fcf6a78bff77`
- 今回の修正設計SHA-256: `e2ca2820c4a5507ec77e59cc993402ac37a7c72bd733503d79b174341f91d693`
- 外部通信: 0回
- 費用: US$0

## 1. 結論

承認範囲だったF04 timelineとF11意味情報packageの通常早期fatalは、公開前再読と同じ処方へ一本化できた。呼出側のfield名を対象fileの根拠にせず、既存decoder・validatorで検証済みのjob／上流recordと実読取path・SHAのexact一件一致からだけ正式field名を導出する。

しかし、正式81件より前に行う追加監査4を全5境界へ広げたところ、**旧B1に同型の呼出側自己認定経路が1件残っている**ことを確認した。旧B1のhelperは、呼出側から渡されたfield名・path・SHAを一件の「検証済み集合」へ自分で入れ、検証済みフラグをtrueにして共通selectorへ渡している。

したがって、完了条件「全境界・全経路で対象file自己認定0件」は成立しない。これは停止条件「新たな現物差」に該当するため、旧B1へ承認範囲外の横展開を行わず、正式81件を起動せず停止した。

## 2. 今回成立した限定修正

### 2.1 F04 timeline

- path: `evals/clip_composition/presentation_timeline_composition_decision_v001.mjs`
- 現在SHA-256: `6bd3adba0b12d118df93ffd978c29a727db49003c8391d47f82f23a14ea796ba`
- jobを既存strict decoder・validatorで検証した直後に、既存処理で検証済み対象集合を一度だけ作る。
- source identity、媒体、残存発話、実装・契約bindingの通常早期fatalへ同じ集合を明示的に渡す。
- helperはbindingのpath・SHAが集合内でexact一件に一致したときだけ、その集合に記録された正式field名を使う。
- 0件・複数件・未検証・固定許可表外では対象fileをnullにする。
- 公開前再読も同じ集合構築処理を使い続ける。

### 2.2 F11 意味情報package

- path: `evals/clip_composition/run_presentation_meaning_information_package_job_v001.mjs`
- 現在SHA-256: `d76e4de69893aaaa954939627859ffa25788b8aee1b8801a832ee7539b2be8df`
- job検証後にjob由来集合を作り、実装・契約bindingとtimeline decision自身の読取失敗に使う。
- timeline decisionの実byte、file SHA、canonical SHA、既存validatorが全て成立した後に、job＋timeline由来の集合を作る。
- source identity、媒体、残存発話、意味検証、意味選択の通常早期fatalへ同じ集合を明示的に渡す。
- helperにあったfield名引数、検証済みtrueの既定値、一件集合の自作を廃した。
- 固定許可表外の`semanticValidation.sourcePackageBinding`は従来どおり対象fileをnullにする。

### 2.3 変えていないもの

- 固定許可field表と共通selector
- 新しい対象file計算の追加
- schema、status、既存違反code、終了code
- 正常経路の処理結果と正式serializer
- 正式成果物と既存5 tree
- F03の40 ID

F03 SHA-256は`b9d1c12aea0ee69040d32050335433eb59443d68edfe536992858b4e13f9dea5`、共通selector所有file SHA-256は`cf95c2ba8785be681dcecc03dc4ec009d6f02b4161e3c39f7edbf431b92b6115`のままである。

## 3. 追加監査6項目

正式testは未実行である。以下は正式attempt開始前の読み取り監査と構文照合の結果である。

| 項目 | 判定 | 根拠 |
| --- | --- | --- |
| 1. 定義・import・export実在 | PASS | 共通selectorと5境界のimport、F04・F11の集合構築処理と全callsiteを現物照合。F04・F11は固定Nodeの構文検査にも合格 |
| 2. rejectedとfatalのcatch分離 | PASS | 既存の検査済み拒否は従来status・違反code・終了1を維持し、未分類I/O・資源・子process失敗だけがfatal・終了2へ進む |
| 3. child process工程値と生出力非漏洩 | PASS | 子processは固定stageへ接続し、親報告にstdout・stderr・message・stack・字幕本文・secretを保存しない |
| 4. 全targetFile経路と検証済みrecordの接続 | **FAIL** | F04・F08・F11・outputは成立。旧B1の1経路だけが呼出側の値から検証済み集合を自作する |
| 5. 保存先不正と実公開失敗のowner分離 | PASS | 公開前の保存先不正と、write・rename・no-replace・公開後照合の失敗を別ownerで維持 |
| 6. 正常・rejected実経路と証明割当て | PASS（静的） | F03は13 stageの実経路・実害対応、F02は14 inner codeのproduction実枝を担う事前固定分担。81件全体で証明損失なし |

総合は**6/6不成立**である。監査4のFAILだけで、正式attempt開始条件を満たさない。

なお、F03の一部が旧実害を手製の観測値として併記することは、新たな不成立ではない。exact inner codeの実発火所有はF02へ明示移管済みであり、F03は境界とstageのproduction実経路を所有する。正式81件全体の証明割当てとして評価した。

## 4. 新たに確認した現物差

### 4.1 旧B1の自己認定helper

対象:

- `evals/clip_composition/run_presentation_caption_semantic_output_check_v002.mjs:216-228`

現物は次の順で対象fileを選ぶ。

1. 呼出側から`sourceField`とbindingを受け取る。
2. その3値をそのまま一件の検証済み集合へ入れる。
3. 検証済みフラグをtrueにする。
4. 共通selectorへ渡す。

唯一のcallsiteは同file `613-618`で、読取直前に保存した`fatalRead`のfield名とbindingをそのままhelperへ渡す。たとえば意味回答読取前には、同file `507-511`でjobの意味回答bindingを`fatalRead`へ入れる。

共通selectorは固定許可field・path・SHA exact一件一致を正しく検査する。しかし旧B1 helper自身が、そのexact一件を呼出側の値から製造できる。このため、固定許可表内のfieldでは「検証済みrecordから導出した」という保証にならない。

### 4.2 他境界の横断確認

| 境界 | 結果 | 確認内容 |
| --- | --- | --- |
| F04 timeline | PASS | job検証後の集合を通常早期fatal・公開前再読へ共用。caller fieldからの一件集合自作0件 |
| F06 旧B1 | **FAIL** | private helperがcaller field・bindingから一件集合を自作 |
| F08 意味終端 | PASS | job／上流record検証後の集合と実読取path・SHAからのみ導出 |
| F11 意味情報package | PASS | job集合とjob＋timeline集合を検証段階に応じて共用。一件集合自作0件 |
| output | PASS | request経路はjob validator合格後の固定field、描画core経路はjob検証・実file再読・SHA一致後だけ登録 |

残存する呼出側自己認定は、読み取り横断監査では旧B1の1経路だけである。ただし監査4がFAILなので、完了報告で要求された「全境界・全経路0件」は申告できない。

## 5. 帰属

### 5.1 事実

- F04・F11の承認済み限定修正は静的に成立した。
- 旧B1に同型の自己認定helperが実在する。
- 旧B1は承認済み18 path内のF06であるが、今回の変更許可はF04・F11に限定されていた。
- 固定許可表、共通selector、契約、schema、status、違反code、終了codeに矛盾は見つかっていない。
- 正式81件は0回、正式TAPは未作成である。

### 5.2 帰属判定

**production実装の対象file閉包不足**である。契約矛盾や固定許可表の不足ではない。

### 5.3 推測

旧B1でも、既存strict decoder・validator合格後にjob由来の検証済み集合を一度だけ作り、fatal時の実読取bindingをpath・SHA exact一件で照合すれば、F06の既存1 path内で閉じる見込みである。ただし未承認・未実装・未検査なので、成立は未確認である。

### 5.4 未確認

- 旧B1修正後の追加監査6/6
- 正式81/81とTAP全件
- 直接影響130/130
- green 287/287
- baseline `tests 181 / pass 64 / fail 117 / cancelled 0 / skipped 0 / todo 0` exact不変
- 既存5 tree最終照合
- commit Aと18 path SHA表

## 6. 実現性調査で事前検出できたか

**検出できた。**

今回の修正設計は「F01・F03・F04・F08・F11の全target選択wrapperとcallsiteを照合した」と記録したが、実際には承認報告で名指しされたF04・F11を中心に閉じ、F06旧B1のprivate wrapperを同じ深度で列挙できていなかった。設計書の「全」という記載と調査実体が一致していなかった。

最新承認が要求した「全境界・全経路0件」を正式attempt前に横断照合したことで検出した。原因は契約の不足ではなく、実現性調査の対象境界閉包不足である。

## 7. 次の最小修正案（未実装）

F06旧B1の1 pathだけを対象に、版付き修正設計で次を固定する。

1. 既存strict decoder・validatorでjobが成立した後に、job自身と許可されたjob bindingから検証済み対象集合を一度だけ作る。
2. `fatalRead`は実際に読もうとしたbindingを保持するが、field名を対象file認定の根拠にしない。
3. fatal時はbindingのpath・SHAを検証済み集合へ照合し、exact一件の集合側field名だけを共通selectorへ渡す。
4. 0件・複数件・未検証・固定許可表外はnullにする。
5. 新しい対象file計算、decoder、validator、固定許可表、schema、status、既存違反code、終了codeを作らない・変えない。
6. F02／F03の既存81 ID内で証明できるかを先に一件表で閉じ、証明損失がある場合だけ件数改訂を提示する。
7. 修正後は追加監査6項目を全境界について最初から再実行し、6/6の場合だけ正式81件へ進む。

F06は承認済み18 path内にあるため19 path目は不要と見込むが、現物調査で追加pathまたは契約解釈が必要と判明した場合は実装せず戻す。

## 8. 停止時点

- F04・F11通常早期fatalの限定修正: 静的実装済み
- 固定Node構文検査: 合格
- 差分空白検査: 合格
- 追加監査: 監査4でFAIL、総合6/6不成立
- 正式81件: **0回**
- 正式TAP: 未作成
- 正式attempt root: 未作成
- 直接影響130件: **0回**
- green 287件: **0回**
- baseline 181件: **0回**
- 5 tree最終照合: **0回**
- commit A: 未作成
- 正式成果物変更: 0件
- API通信: 0回
- 費用: US$0

不合格を見て期待値を動かす行為、固定許可表の拡張、旧B1への承認外修正、正式attemptの部分起動は行っていない。

## 9. 再開に必要な判断

承認依頼文案:

> 全境界targetFile閉包停止報告v001の停止を受理し、§7のF06旧B1限定修正設計の起草を承認する。旧B1の通常fatalでは、呼出側のfield名・bindingから検証済み集合を自作するprivate helperを廃し、既存strict decoder・validatorで検証済みのjobから一度だけ作った集合と実読取bindingのpath・SHA exact一件一致だけで正式field名を導出する。0件・複数件・未検証・許可外はnullにする。新しい対象file計算、decoder、validator、固定許可field表、schema、status、既存違反code、終了code、正式成果物は変更しない。F02／F03既存81 ID内での証明閉包を先に一件表で確認し、修正後は追加監査6/6を全境界について最初から行う。6/6の場合だけ正式81件の新attempt、直接影響130、green 287、baseline exact、5 tree、commit Aと18 path SHA表へ進む。新たな現物差、不合格1件、19 path目、契約解釈が必要な場合は同attemptで直さず停止する。
