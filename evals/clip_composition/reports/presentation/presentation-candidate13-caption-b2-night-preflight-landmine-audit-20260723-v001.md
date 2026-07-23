# candidate 13 基本テロップ B2夜間走行前 地雷探知監査 v001

- 実施日: 2026-07-23
- 対象: 承認済みB1 JSON・表示信頼境界追補の実装修正3点から、B2全検査、既存回帰、candidate 13読み取り専用preflight、次ゲート承認依頼起草まで
- 状態: **静的監査完了。2026-07-24にQ1:A・Q2:Aを人間確定し、改訂版夜間指示で実装からpreflight・次ゲート承認依頼起草までの走行を承認**
- 停止点: §6のC分類、固定期待値不成立、第四原因、新しい設計判断、契約の曖昧さ・矛盾、実測前提の不一致を検出した時点。修正・再試行しない
- 人間作業: B分類への2判断。時間計測なし

## 1. 目的

夜間走行を始めてから契約不足や工程間の縫い目を見つけ、停止と追補を繰り返すことを避ける。そのため、次の経路を実行前に静的に総ざらいした。

1. JSON復号object形式の修正
2. B1整数限定領域と、人間認定済み表示台帳の小数領域の分離
3. 検査indexのfile hashとcanonical hashの意味分離
4. package側全検査
5. 意味回答側全検査
6. ゲートA回帰
7. 残存source atom回帰
8. candidate 13読み取り専用preflight
9. 次ゲートである正式source-only package生成の承認依頼起草

今回の目的は地雷の分類である。合格の見込みを作ることでも、既知の不合格を直すことでもない。

## 2. 監査した正本

- `DECISIONS.md`
- `presentation-candidate13-caption-gate-b1-implementation-contract-design-20260723-v001.md`
- `presentation-candidate13-caption-gate-b1-gate-a-report-transfer-entrypoint-addendum-20260723-v001.md`
- `presentation-candidate13-caption-gate-b2-completion-rerun-stop-report-20260723-v001.md`
- `presentation-candidate13-caption-gate-b1-json-and-width-trust-contract-addendum-20260723-v001.md`
- B1 package / semanticの実装4ファイルと検査2ファイル
- ゲートA job・完了報告・残存source atom成果物
- 表示preset、検査index、信頼binding、renderer trustの固定資産

監査対象の実装・検査・契約文書は、開始時点でGit上の未コミット差分を持っていなかった。candidate 13用B1 preflight jobと正式7ファイル出力先は、開始時点では存在しなかった。これらは実行直前にも再確認する。

## 3. 分類結果

| 分類 | 件数 | 扱い |
|---|---:|---|
| A: 契約から導出可能 | 16 | 本書で導出を固定。人間へ質問しない |
| B: 人間の1判断で確定 | 2 | §5の質問として提出 |
| C: 実測まで不明 | 12 | §6の夜間停止条件として事前登録 |

## 4. A分類: 契約から導出した事項

### A-01. 承認済み修正の範囲

実装修正は次の3点に限る。

1. 厳密JSON復号器が作る全objectを、入れ子を含めnull prototypeへ統一する。
2. Gemini往復・B1成果物・時刻は整数限定のまま、人間認定済み表示台帳を読む固定経路だけ、承認済み4箇所・4値の小数を許可する。
3. preset/material検査indexについて、信頼bindingの値はcanonical hashとして照合し、file hashはjobとsnapshotのbyte同一性検査として別に維持する。

公開export、job schema、57違反コード、CLI、台帳値、時刻表現は変えない。ただし§5のQ1で人間が正式なjob準備入口を選んだ場合の狭い追補と、A-14の検査fixture非破壊化は例外とする。前者は改訂版夜間指示で明示承認された契約改訂、後者はproduction仕様を変えない検査入力の安全修正として扱う。

### A-02. JSON objectの正本形

- 復号された全objectは再帰的にnull prototypeとする。
- `__proto__`、`constructor`、`prototype`も通常のown data propertyとして保持する。
- 復号時はsource member順を保持し、canonical化時だけUTF-16順にする。
- 整数風keyをJavaScriptの通常列挙順へ任せない。canonical文字列は固定順から直接生成する。
- メモリ内入力は、既存契約どおり通常objectとnull prototype objectの双方を受理する。

検査期待を通常objectへ戻す、`JSON.parse`へ逃がす、特殊keyを例外扱いする、という解決は契約外である。

### A-03. 小数を許可する境界

小数を許可するのは、固定された外部表示台帳5枠のうち、renderer trustにある次の4箇所・4値だけである。

- `textSafePaddingRatio`: `0.04`
- `horizontalSafeMarginRatio`: `0.04`
- `verticalSafeMarginRatio`: `0.02`
- `fallbackTextAreaRatio`: `0.98`

profileはjob、CLI、環境変数、Gemini出力から選ばせない。slot、role、固定path、実snapshot pathの一致を確認してから、package内部だけで選ぶ。

### A-04. 時刻の正本

時刻は今後も整数ミリ秒、実行段階は整数frame/sampleに限る。今回の小数許可を時刻へ広げない。Gemini往復、正式package、意味回答にも4係数を運ばない。

### A-05. 表示台帳の検査順

外部表示資産は次の順で検査する。

1. slot、role、固定path、安全性
2. file hash
3. 厳密復号とschema
4. canonical hash
5. 台帳間の信頼鎖

jobが申告した新しいhashへ追従しない。承認済みのfile/canonical hash対を不変値とする。

### A-06. 既存契約の検査を同時に完成させる範囲

次の二点は新しい仕様ではなく、承認済み修正の内側にある既存契約の実装漏れである。

- preset validation indexの`registryVersion`と、bindingの`presetRegistryVersion`の一致
- renderer trustの`layoutRules`全field・型・固定値の厳密検査

前者は修正3の信頼鎖、後者は修正2の専用読取profileを正しく成立させるために必要である。承認済み正本から導けない新field意味や許容値が必要になった場合だけ、C分類として停止する。

### A-07. 検査は実物と同じ経路を使う

外部表示台帳専用の影checker、test専用decoder、semantic側への同等実装複製は作らない。package側のproduction builder/checkerと同じ経路を検査し、semantic側はpackage coreの厳密入口をそのまま利用する。

### A-08. 追加検査の最低範囲

少なくとも次を既存検査の削除・置換なしで追加する。

- root・入れ子objectのnull prototype
- 特殊keyのown property保持
- 整数風keyを含むcanonical UTF-16順
- B1領域の小数拒否
- 承認済み4箇所・4値だけの受理
- 別path、別値、他の外部JSONの小数拒否
- file hashとcanonical hashの取り違え検出
- 小数の時刻・frame・sample拒否
- 正式7 JSONとGemini可視入力への小数漏洩なし
- profileをjob・CLI・環境変数から選べないこと

検査総数は実装で増えるため事前に独自固定しない。既存55件と追補追加件数は分けて報告する。

### A-09. 実行順

改訂版夜間指示で走行が承認された場合の順序は次で一意である。

1. package側の既存55件と追補追加検査を全件
2. 意味回答側を全件
3. ゲートA 21件
4. 残存source atom 50件
5. candidate 13読み取り専用preflight
6. B2完了報告
7. 次ゲートB3の承認依頼起草

途中の一件でも不成立なら、後段へ進まず停止する。不合格箇所だけの部分再実行や、その場の修正再試行はしない。

### A-10. 実行環境

全検査とpreflightは固定Node実体
`/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`
を使う。合否値はNode実体hash、Node `v20.19.6`、ICU `77.1`、locale `ja`、granularity `word`である。ネットワーク、Gemini、STT、FFmpegを使わない。

### A-11. candidate 13 preflightの固定内容

- preflight job path:
  `evals/clip_composition/outputs/presentation/caption-semantic-source-package-preflight-jobs/DmWu0jVQfTE-candidate-13-caption-b1-v001.json`
- mode: `read-only-preflight`
- source atom: 354
- container: 3
- boundary candidate: 205
- container別source atom: 126 / 122 / 106
- container別candidate: 60 / 78 / 67
- formal output path:
  `evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/DmWu0jVQfTE-candidate-13-v001`
- expected state: `absent`
- 除外path: CLIへ渡すpreflight job自身の一件だけ

ゲートA、source、表示台帳、runtimeの固定hashは承認済み契約の値を使う。実装後に変わるpackage core/runnerのfile hashと、監視投影hashだけを、正式なjob準備工程で実行前に固定する。

preflight jobの親directoryは静的監査時点で存在しない。親directoryも監視投影へ含まれるため、準備順は次で固定する。

1. 固定preflight job rootを、symlinkでない安全な実directoryとして作成または確認する
2. target job pathが存在しないことを確認する
3. Q1で確定する正式入口から監視投影hashを一度計算する
4. target job自身を排他的に作成する。監視投影から除外するのはこのjob一件だけ
5. 読み取り専用preflightを一度実行する

監視hash計算後に親directoryを作ると、job以外の監視treeが変わり必ず不一致になる。この順序をjob作成側の都合で入れ替えない。

### A-12. 実装commitの扱い

`implementationBinding.gitCommit`は人間が任意に選ぶ値ではない。「承認済み3修正と、その検査を固定した実装commit」を記録する。exact SHAはそのcommit成立時に機械的に確定する。HEAD一致を合格条件にはしないが、来歴を偽る別commitは使わない。

### A-13. preflightの合格条件

preflightは正式7ファイルを作らず、packageをメモリ内で二度作る。合格条件は次である。

- core 15検査、読み取り専用検査、job安定性検査の全17検査が合格
- 違反0
- exit 0
- 二回の生成byteが一致
- 監視treeが前後不変
- stdout正式byteのSHA-256を完了報告へ記録

stdout reportを独立JSON成果物として保存しない。

### A-14. 検査用一時job

package検査は実process用の固定一時jobを作成して削除する。静的監査時点の検査実装は、固定pathへ通常書込を行い、終了時に強制削除している。既存fileの排他確認と所有確認は未実装であり、「上書きしない」とはまだ言えない。

非破壊原則から、夜間検査前に検査fixture側を次へ合わせる。

- 最初の作成を排他的にし、既存なら上書きせず検査不成立とする
- 検査自身が作った同一実体だけを書き換える
- 終了時も所有している同一実体だけを削除する
- pathの差し替え、所有変化、cleanup不成立があれば停止する

これはproduction経路の仕様変更ではなく、検査入力の所有を明示する安全修正である。修正・検査後も、非協調processとの競合を完全に防いだとは主張しない。削除直前のidentity再確認までを保証境界とする。

### A-15. 次ゲート

B2が全て成立した場合に起草する次ゲートは、B3「正式source-only package一件の生成承認」である。B4の表示計画、prompt、Gemini実走、意味回答、指示書、描画を承認依頼へ混ぜない。

B3承認依頼は、B2の実測件数、違反コード網羅、回帰、preflight stdout hash、実装commit/file hashを根拠にする。B2不成立時は起草しない。

### A-16. B3の正式生成契約

B3が将来承認された場合も、正式root、7ファイル、lock/work、原子的公開、二回生成、15検査、公開後再検証は既存契約から一意である。正式packageの出力hashを今作って期待値にしない。B3は今回の夜間走行対象ではなく、承認依頼起草だけが対象である。

## 5. B分類: 夜間開始前に必要な人間判断

### Q1. preflight jobの監視hashを作る正式入口

背景: preflight jobには、実行前の出力treeを契約どおりに要約したhashを、job作成時点で入れる必要がある。しかし、その計算処理は現在production runner内部の非公開処理であり、承認済み契約はpublic exportの追加を禁じている。別実装で同じ計算を作ると、job作成側と実行側が食い違う。

選択肢:

- **A.** package runnerへ版付き・読み取り専用の監視投影hash入口を一件追加し、runner本体とjob準備が同じ処理を使うよう狭い追補でpublic export集合を改訂する。production CLIのjob path一引数契約は変えない。
- **B.** public入口は増やさず、今回限りの独立計算器を承認し、runner側の実測との一致で検品する。
- **C.** 今回の夜間走行は回帰までとし、preflight job準備の設計を別ゲートへ戻す。

推奨: **A**。job作成時と実行時が同じ計算経路になり、二重実装のずれを恒久的に防げる。選択しても、今夜許可されるのはcandidate 13 preflight job一件の準備までであり、正式package生成へは進まない。

#### Q1でAを選んだ場合に同時承認するexact契約

回答Aだけで方向のみを承認し、実装者へ細部を残すことを避けるため、Aは次のexact契約を含む。

- package runnerのpublic exportへ
  `inspectPresentationCaptionSemanticSourcePackagePreflightProjectionV001(jobPath, {filesystemAdapter})`
  を一件追加する
- `jobPath`はworkspace相対のpreflight job pathを表すstring一件。既存のpreflight許可root直下、正規化済み`.json`、対象path不存在を必須とする
- 第二引数は既存runnerと同じexact形で`filesystemAdapter`一件だけを持ち、既存の版付きadapter契約を満たす。root、除外path、期待値は受け取らない
- 正式job準備では、既存のproduction filesystem adapter factoryが返したadapterだけを渡す。CLI、job、環境変数からadapterを選べない。合成検査だけが既存規律どおり検査adapterを明示してよい
- 固定preflight job rootが、symlinkでない安全な既存実directoryでなければuntrustedとする。この入口自身はdirectoryを作らない
- 成功返値のfield順と形を
  `{kind:"trusted-projection", watchedRoot, excludedPaths, expectedBeforeCanonicalSha256}`
  に固定する。`watchedRoot`は既存固定root、`excludedPaths`は入力job path一件だけ、hashは64桁lowercase hexとする
- 失敗返値を
  `{kind:"untrusted", diagnostic:"CAPTION_B1_PACKAGE_PREFLIGHT_PROJECTION_UNAVAILABLE"}`
  に固定し、throwを外へ漏らさない。CLI、終了コード、57違反コードは変えない
- file・directory・symlinkの走査、UTF-16順、実byte hash、canonical SHAは、production runnerがpreflight開始・終了に使う一つのprivate処理を共有する。同等処理を複製しない
- 書込、副作用、job生成、正式package生成を行わない
- 合成検査は、許可外path、既存target、unsupported tree entry、読取中変化を拒否し、正常時は同じtreeを読んだproduction runnerの開始投影hashと完全一致すること、両入口が同じprivate処理を呼ぶことを確認する
- 元B1契約の「全public export集合」へこの一件だけを追加する追補を、コード変更より先に記録する

Q1でAを選ぶ回答は上記exact契約の承認を兼ねる。実装開始自体は、別途届く改訂版夜間指示の許可範囲に従う。

### Q2. candidate 13 preflight jobの識別子

背景: jobファイルのpathは固定済みだが、job ID・成果物ID・package IDは書式だけが決まり、exact値は未固定である。特に成果物IDをゲートAから引き継ぐかが未確定で、package IDはpathや成果物IDから実行時に再生成することも禁止されている。

選択肢:

- **A.** 同じ元成果物を加工するため成果物IDはゲートAと共通にし、工程とpackageだけを別IDにする。
  - job ID: `DmWu0jVQfTE-candidate-13-caption-semantic-source-package-preflight-v001`
  - 成果物ID: `DmWu0jVQfTE-candidate-13-v001`
  - package ID: `DmWu0jVQfTE-candidate-13-caption-semantic-source-package-v001`
- **B.** 成果物IDもB1専用の`DmWu0jVQfTE-candidate-13-caption-b1-v001`へ分ける。job IDとpackage IDはA案と同じにする。
- **C.** 別の3値を人間が指定する。

推奨: **A**。formal rootと内包する境界証拠はゲートAの同じ成果物を継承し、B1固有性はpackage IDで十分区別できる。

## 6. C分類: 夜間に実測し、不成立なら停止する事項

### C-01. 未到達検査の潜在不合格

既知22不合格のうち20件は、本来の検査本文へ未到達だった。3修正後に第四原因が初めて見える可能性がある。1件でもfail、skip、todo、cancel、違反コード網羅不成立が出たら停止する。

### C-02. JSON・canonical化修正の波及

特殊keyや整数風keyを正しく扱う修正により、承認済み固定canonical hashが変わる可能性は実走まで確定しない。固定値と不一致なら、期待値を更新せず停止する。

### C-03. 外部表示資産の実体

外部5 JSONと2実装のfile/canonical hash、固定4係数、版鎖が実行時にも契約値と一致するかを再確認する。不一致なら停止する。

### C-04. 意味回答側全検査

package coreの共通入口変更が意味回答側へ波及しないことは全件実測が必要である。一件でも不成立なら停止する。

### C-05. 既存回帰

ゲートA 21件と残存source atom 50件の結果不変は実測事項である。一件でも不成立なら停止する。

### C-06. runtime

Node実体hash、Node版、ICU、locale、granularityは実行直前の現物を検査する。固定値と違えば、その環境へ期待値を合わせず停止する。

### C-07. 実装fileと来歴

修正後のpackage core/runner file hashと実装commit SHAは実装完了後にしか確定しない。jobへ固定した値と実体が違えば停止する。

### C-08. 監視treeと競合

job準備時に作った監視投影が、preflight終了まで不変かは実測事項である。人間・別process・検査用一時jobの残留を含め、job自身以外の差分が出たら停止する。

### C-09. candidate 13固定投影

354 / 3 / 205、container別内訳、ゲートA証拠hash、全17検査、違反0、stdout byte hash、exit 0はpreflight実測で確認する。不一致時にjob期待値を変更したり、再実行したりせず停止する。

### C-10. 正式出力先と一時pathの状態

candidate 13正式root、lock、work、検査用一時job、preflight job root・targetの開始状態を実行直前に確認する。preflight job rootはA-11の順で安全な実directoryとして先に成立させ、targetは不存在を必須とする。契約上の不存在条件や所有条件を満たさなければ、削除・上書きせず停止する。

### C-11. 承認範囲外の修正要求

public export追加、汎用小数許可、job/schema/57コード/CLI変更、台帳値変更、小数時刻、semantic側への外部小数流入、ゲートAまたは残存source実装変更が必要になった場合は停止する。ただしQ1でAが承認された場合の、狭いjob準備入口追補だけはその承認範囲に含める。

### C-12. 次ゲート起草の前提

B2全検査・回帰・preflightが全て成立し、実測結果を既存B3契約へ代入できる場合に限り起草する。B3承認依頼の本来の仕事として提案する正式jobのpath・job IDはこの停止条件から除く。既存B3契約を越える新しい意味、合否期待値、契約解釈が必要になった場合は起草せず停止する。

## 7. 今回行っていないこと

- 実装・修正
- 検査の実行
- candidate 13 preflight jobの生成
- 監視tree hashの計算・固定
- 正式source-only package生成
- Gemini・他LLM実走
- prompt、意味回答、表示計画、指示書、描画
- DECISIONS・HANDOVER・承認済み契約文書の変更

## 8. 結論

夜間走行前に必要な人間判断は2件だけである。

1. 監視投影hashを作る正式入口
2. candidate 13 preflight jobの3識別子

残りは契約から導出できるか、実測時の停止条件へ落とせる。Q1・Q2への回答を受領しても自動では走行せず、改訂版夜間指示を待って停止する。

## 9. 人間回答と夜間走行承認

- 2026-07-24 / Q1: **A**。§5のexact契約どおり、package runnerへ版付き・読み取り専用の監視投影入口を一件追加する。runner本体とjob準備は同じprivate処理を使い、production CLI・job schema・57違反コードは変更しない。
- 2026-07-24 / Q2: **A**。識別子を次で固定する。
  - job ID: `DmWu0jVQfTE-candidate-13-caption-semantic-source-package-preflight-v001`
  - 成果物ID: `DmWu0jVQfTE-candidate-13-v001`
  - package ID: `DmWu0jVQfTE-candidate-13-caption-semantic-source-package-v001`
- 2026-07-24 / 追補: `presentation-candidate13-caption-gate-b1-json-and-width-trust-contract-addendum-20260723-v001.md`を第三原因のhash意味改訂込みで承認。
- 2026-07-24 / 走行範囲: 追補三点とQ1:A入口の実装、B2全検査、既存回帰、candidate 13読み取り専用preflight、完了報告、正式package＋Gemini runの次ゲート承認依頼起草まで。正式package生成、Gemini実走、指示書、描画は行わない。
