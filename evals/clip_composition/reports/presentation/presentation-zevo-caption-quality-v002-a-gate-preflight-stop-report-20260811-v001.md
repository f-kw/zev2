# ZEVO字幕品質v002 A局所ゲート正式attempt前監査 停止報告 v001

- 日付: 2026-08-11 JST
- 開始HEAD: `542b35684a3ad67dbab042ca2bb3bff022e42023`
- 対象: A工程（B5 countTokens準備・B6一回生成準備）の新規production/test 2 path
- 外部通信: 0回
- 費用: US$0
- A正式attempt: 0回
- L以降: 未着手

## 1. 結論

S局所ゲートは正式6/6、S所有proof item 39/39で終了した。その後、Aの正式attempt開始前監査で、承認済み契約に届かない現物差を検出したため、A正式attemptを開始せず停止した。

停止の主因は次の2件である。

1. 契約が要求する「一回の原子的な上書き禁止directory公開」を、現行14 pathと既存束縛実体だけで実現できる処理が存在しない。
2. B6通信前のローカル再読失敗を所有する外側codeが、承認済み契約内で一意に閉じていない。

いずれも実装者判断で既存処理へ寄せたりcodeを選んだりできない。したがって、開始前監査で止め、同attemptで修正・正式実行を行わなかった。

## 2. 正本と開始実体

| 種別 | path | SHA-256 |
|---|---|---|
| 親契約 | `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md` | `33b61ee497d765fbe9eb63fb1b05bce16a99488d238eb27b732550b4daac24ba` |
| 完全実装設計 | `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md` | `44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4` |
| 累積追補v002 | `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-binding-wiring-addendum-20260811-v002.md` | `a3c8c3ef8e57cd557e4a7cae17ecc188dc523df1508a45de6e2bce36691c7e4d` |
| 実値配線追補v003 | `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-selection-runtime-value-wiring-addendum-20260811-v003.md` | `632aa7fdec88da47fe8639fb10f74f390aa0cc5f191a114b797c08115bee4c9e` |
| 全面再実装修正設計 | `evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-full-reimplementation-correction-design-20260811-v001.md` | `2e7905588da53e14fd762750ab2a6b753fb352c07a164096141175e4464e2fdc` |

停止時のA部分実装は次の2 pathである。正式成果物ではなく、停止時の作業実体として現状保持する。

| path | 行数 | SHA-256 | 状態 |
|---|---:|---|---|
| `evals/clip_composition/run_presentation_output_caption_cue_b5_b6_v001.mjs` | 2,644 | `9059b97b197b9952e2fbbbc068d87a2373f25f97cc6d257e82c4460aaaf74b1c` | 未承認修正を加えず凍結 |
| `evals/clip_composition/run_presentation_output_caption_cue_b5_b6_v001.test.mjs` | 1,585 | `993061c33c3e55cfd4340d353923943ed4ccf725e3aa5e7f3b5651e8eef904fb` | 未実行、未承認修正を加えず凍結 |

## 3. 直前のS局所ゲート

| 項目 | 観測 |
|---|---|
| production SHA | `dd38dd2b3de9e3946da0fb7fb2e509cc1973515a8f32ae72b262c48ec667dee7` |
| test SHA | `f30e02552b7eeb422f54f6bc157d05f24084929f6a632bd9c24ac093446191ac` |
| 正式結果 | 6/6 passed、S所有proof item 39/39 |
| TAP | `evals/clip_composition/reports/presentation/diagnostics/presentation-zevo-caption-quality-v002-s-gate-deterministic-mutation-20260811-v001/attempt-0001.tap` |
| TAP SHA | `564a508c1f6aa09bff792aa426fe7642600426ccff8995af5c8d3748511c4da5` |
| stderr | 0 byte |

この数値結果は保存する。ただし§4.1の原子的公開の現物差はSが使う既存共用公開処理にも存在するため、6/6をその保証の成立証明とは扱えない。Sの既存root再実行拒否は成立しているが、不存在確認後に空directoryが競合する枝は実装・検査とも閉じていない。

## 4. 人間裁定が必要な2件

### 4.1 原子的な上書き禁止公開

#### 契約

完全実装設計§5.1は、全成果物を兄弟stagingへ作り、検査・公開直前再読後に、root全体を一回の`no-replace atomic rename`で公開することを要求する。予約後に初めて競合した場合はfatal・終了2とし、検査済みstagingを保持する。

#### 現物

A productionの公開処理は、出力先の不存在を`lstat`で確認した後、通常のdirectory `rename`を行う。確認とrenameの間に空directoryが作られた場合、macOSの通常renameはそのdirectoryを置換し得る。したがって、任意の競合相手に対する上書き禁止を原子的に保証しない。

既存の共用処理`publishPresentationMeaningOwnedStagingRootNoReplaceV001`も同じ`lstat→通常rename`であり、名前どおりの強い保証を持たない。repository内に`renamex_np(..., RENAME_EXCL)`、`renameat2(..., RENAME_NOREPLACE)`等の束縛済み実体は存在しない。既存共用処理へ接続するだけでは解消せず、AのB5 8件・B6 16件の実装束縛集合も変わる。

#### 帰属

- 実装: 契約未達。
- 実装設計・範囲: 厳密な原子的公開を担う利用可能な実体と束縛が閉じていない。
- 契約: 要求自体は明確で矛盾していない。ただし現14 pathのまま達成する手段がない。

#### 必要な裁定

推奨は、OSに束縛した排他的rename実体を正式path・SHA・失敗分類とともに追加する範囲改訂である。既存共用処理を正しいものとして扱う案、または協調publisher間だけの保証へ黙って狭める案は採らない。

### 4.2 B6通信前ローカル失敗の外側code所有

#### 現物

B6は、有効jobのstaging開始後、B5の13成果物と固定requestを通信前に再読する。欠落、読取不能、読取中変化、SHA不一致、request byte不一致は内側で`b5-artifact-reread`または`request-reread`へ正しく分かれるが、外側は`CUE_PROVIDER_TRANSPORT_FAILED`になる。保存済みrawとtransport返却rawの不一致も同じcodeになる。

#### 契約

code所有表とZCQ015は`CUE_PROVIDER_TRANSPORT_FAILED`を一回通信のHTTP・timeout・non-responseに割り当てる。一方、結果表には「B6のI/O・resource」を同codeへ含める行があり、通信前ローカル再読のexact ownerは一意でない。`CUE_API_PUBLICATION_FAILED`も、現定義では成果物・report・rootの書込み／再読を所有し、上流入力の再読を明示的に所有しない。

#### 帰属

契約の所有境界が未閉包であり、実装者判断でどちらかへ写せない。内側stageとfailure report成果物集合は閉じているため、必要なのは外側code所有の最小追補である。

## 5. 契約解釈を変えず修正できる実装欠陥

| 群 | 現物 | 正しい方向 |
|---|---|---|
| A1 workspace実体逸脱 | 字句上はworkspace内でも、中間symlinkがworkspace外を指す入力を読める。出力親も安全確認前に再帰作成するためworkspace外へ副作用を出し得る | workspaceの実realpath、全入力の前後realpath、root内包含、実体identityを照合する。出力親は既存ancestorを先に検証する |
| A2 公開失敗の分類 | staging集合不一致、staging identity変化、親実体変化を全て`no-replace`へ潰す | 実際の競合と、file集合・identity・I/O失敗を閉語彙どおり分ける |
| A3 B6 writer返値 | B6のwriterがbindingを返すが、契約は保存・stable再読後の`Promise<void>` | evidence登録を保ち、値を返さず完了する |
| A4 未成立成果物の残留 | 公式snapshot群、B5 manifest、B6 envelope、B6 manifestの保存後検査が失敗すると未成立fileがstagingへ残り、固定失敗集合を公開できない | 未成立成果物を所有確認後に除外し、不存在を確認できた場合だけ契約済みfailure rootへ進む。除外不能はCLI-only・staging保持 |
| A5 raw除外失敗の握り潰し | probe/final/B6 rawの除外失敗を空catchで無視する | 除外・不存在を証明できない場合は正式root 0件・staging保持で停止する |
| A6 B5 source再読stage | source再読I/Oが外側catchで`artifact-publication`へ変わる | CLIも契約固定の`source-reread`を保持する |

対象fileが既知なのにB5成果物再読fatalの`targetFile`が`null`になる箇所もある。schema上は`null`を許すが、検証済みbindingから対象を特定できる場合は自己認定せずそのbindingを保持できる。

## 6. 正式attempt前に見つかった検査欠陥

| 群 | 現物 | 影響 | 正しい方向 |
|---|---|---|---|
| T1 import順の偽観測 | A testはproduction sourceの最初のpath文字列位置を比較し、実import呼出しでなく冒頭のbinding定数表を拾う | B5側は必ず期待と不一致。B6側は偶然trueだが実import順を証明しない | import呼出しの構文・実観測を対象にし、binding表の文字列を証拠にしない |
| T2 正式CLI起動条件 | secret拒否枝のchild CLIが固定Nodeは使うが固定TSX絶対loaderを付けない | 正式起動checklistと不一致。対象枝が必ず失敗するかは未確認 | 固定Node・固定TSX絶対path・`NODE_OPTIONS`不存在を同じcommandで記録・適用する |

T1は正式attemptを実行すればZCQ007を確実に落とす。開始前監査で確定したため、失敗TAPを作る目的だけの実行は行わなかった。

## 7. 三分法と対応表

| 原因群 | 実装未達 | 検査・設営 | 契約解釈 | 解消見込み |
|---|---|---|---|---|
| 原子的no-replace | 該当 | 既存検査もlate collisionを証明しない | path/runtime範囲の改訂が必要 | native排他rename実体を束縛すれば解消可能 |
| B6通信前失敗owner | 現実装は誤帰属 | 該当なし | exact ownerの追補が必要 | code集合を増やすか既存codeへ明示割当て後に解消可能 |
| A1〜A6 | 該当 | 該当なし | 原則不要 | 同じproduction path内の限定修正で解消可能 |
| T1〜T2 | 該当なし | 該当 | 不要 | 同じtest path内の限定修正で解消可能 |

## 8. 実施済み・未実施

### 実施済み

1. watcher・polling・timerを使わないSの決定的差替え検査。
2. S局所正式6件とTAP全文の版付き保存。
3. `DECISIONS.md`への正式検査の決定的観測規律の記録。
4. `DECISIONS.md`への軽量作業の自動委譲規律の記録。
5. 委譲されたexact key数の誤りを親が検出し、当該種別を以後委譲しない縮小記録。
6. A production/test 2 pathの作成と正式attempt前の全file読み取り監査。

### 未実施

- A局所正式11件: 0/11（未実行）
- A所有proof item: 0/102（正式観測未実行）
- A TAP・stderr: 未生成
- L、P、R、F、U: 未着手
- 正式46件、直接影響回帰、green 287、baseline 86/203、tree照合: 未実施
- API通信、countTokens、generateContent、費用支出、正式描画: 0件
- commit、tag: 0件

## 9. 停止時の保存状態

S正式TAP、S stderr、S環境記録、Aの2 path、既存正式成果物、stable tagを変更・削除しない。Aの2 pathへ本報告後のpatchを加えず、裁定まで凍結する。既存正式成果物・既存stable tagへのbyte変化は0件である。

## 10. 承認依頼文案

> A正式attempt前監査の停止を受理する。原子的no-replaceの保証を現行14 path内で実現できる既存実体がないこと、およびB6通信前ローカル再読失敗の外側code所有が一意でないことを確認した。次は、この2点を一組にした版付き範囲改訂追補の起草を承認する。追補は、(1) OS束縛済みの排他的directory rename実体・path・SHA・失敗分類・S/A双方への接続とlate collision実発火検査、(2) B6の`b5-artifact-reread`、`request-reread`、保存raw照合不一致の外側code owner、(3) 本報告§5の実装6群と§6の検査2群の限定修正表、(4) Sの6/6記録を保持しつつ原子的公開の未証明を補う再検査範囲、を値レベルで閉じる。既存共用処理を厳密なno-replaceとみなす案、保証を協調publisher間へ黙って狭める案は採らない。起草提示で停止し、実装・正式再検査は別承認とする。API通信0・費用US$0、既存正式成果物とstable tag不変を維持する。

