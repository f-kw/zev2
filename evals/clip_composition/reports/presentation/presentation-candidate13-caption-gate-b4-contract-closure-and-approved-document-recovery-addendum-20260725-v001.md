# candidate 13 基本テロップ B4 契約閉包・承認済み文書復元 追補v001

- 作成日: 2026-07-25
- 状態: **設計提示・人間承認待ち**
- 主線: B4表示計画・v003対生成
- 最新安定点: `stable/b3-complete-20260725`
- 本書で許可を求めるもの:
  1. 三つの未固定契約の確定
  2. 承認済み追補の承認時commitからのbyte同一復元
  3. 承認済み文書hash照合の標準化
  4. 既承認範囲でのB4実装再開
- 本書で許可を求めないもの:
  - B5 prompt・費用固定
  - B6 Gemini実走
  - 正式表示計画の生成
  - 描画
  - 人間確認
- 人間作業: 本書の承認または却下1件。動画視聴、時刻入力、時間計測はない

## 1. 結論

承認済みB4文書、承認時commit、現行v002実装、candidate 13正式残存発話成果物を再照合した。

三つの未固定は、既存の正本から次のように一意化できる。

1. 解決パッケージの発話列hashは、**正規化後の発話列だけのcanonical SHA-256**を正本とする。
2. 共有G1〜G3処理は、**版固有の外枠と来歴を除いた文法入力**を受け、**検査本文だけ**を返す。
3. v003字幕検査の発話来歴は、正式残存発話成果物が持つ**四つの参照を束ねた来歴object**を正本とする。

承認済み追補のGit上の正本は失われていない。commit `07c60b03`と現在の`HEAD`／indexは同じ23,327 byteのblobを指し、作業ツリーだけが1 byteの`"s"`になっている。本書の承認後に、承認時commitのbyteをそのまま復元し、SHA-256、byte数、modeを完全一致させる。

B4実装面全体へ地雷探知パスを再適用した。契約から導出できない人間判断は本書の三点と復元承認だけであり、本書で全て閉じる。実測待ちの値は残るが、取得方法、不一致時の停止、正式値へ昇格する段階は既に固定されており、実装者判断で埋める未固定ではない。

## 2. 本書が改訂する承認済み正本

次の三文書を一組のB4実装正本として扱う。

1. `presentation-candidate13-caption-gate-b4-display-plan-contract-design-20260725-v001.md`
2. `presentation-candidate13-caption-gate-b4-implementation-contract-addendum-20260725-v001.md`
3. `presentation-candidate13-caption-gate-b4-v003-contract-core-implementation-addendum-20260725-v001.md`

本書の承認をもって、次を版名を維持した追補改訂として扱う。

- 元設計§6.2の発話列hash定義を正本として維持する。
- 実装契約追補§6.5の`sourceAtomsSha256`行を、本書§4.3で明示訂正する。
- v003検査実体追補§3.2、§5.1、§6の共有入口・来歴定義を、本書§5〜6で閉じる。
- v003検査実体追補の承認時byteを、本書§3の手順で作業ツリーへ復元する。

既存文書を黙って編集しない。復元対象は承認時byteそのもので、契約変更は本書にだけ記録する。

## 3. 承認済み追補の破損監査と復元契約

### 3.1 照合表

対象:

`evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b4-v003-contract-core-implementation-addendum-20260725-v001.md`

| 観測 | 承認時／Git正本 | 現在の作業ツリー |
|---|---|---|
| 承認時commit | `07c60b0364b7b6661e47e25c245dcc12a85f0644` | 該当なし |
| commit時刻 | 2026-07-25 13:16:45 JST | 該当なし |
| Git mode | `100644` | `-rw-r--r--` |
| Git blob object | `c22eb4a2237b3c01158be77b2cbacbae1245b02a` | `2f259b79aa7e263f5829bb6e98096e7ec976d998`相当 |
| byte数 | `23,327` | `1` |
| SHA-256 | `abeb8e098d830af1af5c540759b3971a508faa53bb75e8380e6f8352a0ccee16` | `043a718774c572bd8a25adbeb1bfcd5c0256ae11cecf9f9c3f925d0e52beaf89` |
| 内容 | 承認済み追補全文 | byte `0x73`、文字`"s"` |
| 更新時刻 | commit時刻 | 2026-07-25 13:35:16 JST |

現在の`HEAD`とindexもGit blob `c22eb4a...`を指す。破損は未stageの作業ツリー変更であり、現在のcommit treeへは入っていない。

### 3.2 履歴から分かる事実

1. 対象pathを変更したcommitは、`git log --all --follow -- <path>`上では`07c60b03`の一件だけである。
2. `HEAD`のreflogは、13:16:45の`07c60b03`から13:40:27の停止報告commit `3dbf2ef2`へ通常のcommit移動を記録している。
3. 作業ツリー実体のmtime／ctimeは13:35:16で、承認時commit後、停止報告commit前である。
4. reflogは未stageの作業ツリー書込みを記録しない。このため、Git履歴とreflogから変更したprocess、session、人を特定できない。
5. ownerや原因を推測で特定しない。確定できるのは「承認時blobはGitに残り、作業ツリーだけが13:35:16に1 byteとなった」までである。

### 3.3 復元手順

本書の承認後、実装開始前に次の順で一度だけ復元する。

1. `07c60b03:<対象path>`のblob object、byte数、SHA-256、modeを§3.1の承認時値と再照合する。
2. 現在の作業ツリー実体を安定読取し、現状を復元前記録へ残す。現状が§3.1から変わっていた場合は復元せず停止する。
3. 承認時commitのblob byteを、内容の手修正やmergeをせず対象pathへ置く。
4. 復元後の実体について、通常file、mode `100644`、23,327 byte、SHA-256 `abeb8e...`、Git blob `c22eb4a...`を照合する。
5. `git diff 07c60b03 -- <対象path>`が空であることを確認する。
6. 復元結果を「編集」ではなく「承認時byteの復元」として完了報告へ記録する。

復元後に内容を直す必要が見つかった場合は、本書または別の版付き追補で改訂する。復元と改訂を同じ差分へ混ぜない。

## 4. 契約確定1: 発話列hash

### 4.1 正本

`presentation-resolution-package-v003.sourceAtomsSha256`の正本は、次である。

> 話者正規化後に解決パッケージへ格納する`sourceAtoms`配列だけを、既存`canonicalJson`でcanonical化したbyteのSHA-256。

計算は既存`presentation_source_speaker_policy_v001.mjs`の`canonicalSha256(sourceAtoms)`を使う。別のcanonical化、formal serializer、ファイル読取を実装しない。

### 4.2 根拠

1. 元B4設計§6.2が同じ意味を明記している。
2. 現行`presentation_instruction_contract_v002.mjs`は、解決パッケージ内の`sourceAtoms`配列へ`sha256Canonical`を適用して照合している。
3. v003検査実体追補§7の責務も、正式残存発話全件のcanonical SHA照合である。
4. 発話配列の意味hashと、schema・来歴・選択情報を含む正式入力ファイルのbyte hashを分ける既存原則に一致する。

### 4.3 他方の扱い

実装契約追補§6.5の次の行は、本書の承認により意味指定として廃止する。

> `sourceAtomsSha256` | `source-atoms.json`のformal file byte

正式`source-atoms.json`全体のfile SHA-256自体は廃止しない。B3正式入力bindingの`fileSha256`として保持し、入力実体の同一性照合に使う。ただし、その値を`sourceAtomsSha256`へ転記しない。

したがって、二つのhashは次の別責務を持つ。

| hash | 対象 | 責務 |
|---|---|---|
| `sourceAtomsSha256` | 正規化後のpackage内発話配列 | 解決パッケージ内の発話集合・順序・内容 |
| retained source input `fileSha256` | 正式`source-atoms.json`のformal file byte | 上流正式入力実体の同一性 |

同値を要求せず、片方から他方を導出しない。

## 5. 契約確定2: 共有G1〜G3入口

### 5.1 責務境界

`validatePresentationCaptionGrammarSharedV001`は、v002／v003のformal入口ではない。

共有するのは、現行v002実装のうち次だけである。

- 発話要素、表示対象、同時表示group、cue、line、anchorの検査。
- 発話の正重なり観測。
- G1〜G3違反の生成。
- 宣言済みG2限界の生成。
- 既存順序によるissue整列。

共有しないもの:

- schema version。
- `format`。
- `atomProvenance`の版固有shape。
- display plan binding。
- checker version。
- formal入力全体のhash。
- scope exclusionの版固有外枠。
- v002／v003の未知field検査。

### 5.2 exact input

引数は次の一引数exact objectとする。field順も次で固定する。

```text
{
  source: {
    atomGranularity,
    atoms,
    captionTargets,
    allowedSimultaneousGroups
  },
  captionPlan
}
```

unknown fieldは受け付けない。

- `source.atomGranularity`: `character-timestamp`または`word-timestamp`
- `source.atoms`: 現行v002のatom列
- `source.captionTargets`: 現行v002のtarget列
- `source.allowedSimultaneousGroups`: 現行v002のgroup列
- `captionPlan`: `{cues}`を持つ現行v002の計画

`atomProvenance`を共有入力へ含めない。来歴はformal wrapperが版ごとに検査し、G1〜G3計算へは使わない。

共有処理が返すissueのpathは、現行v002と同じ論理文法rootを使う。

- 発話、target、group: `$.source...`
- cue、line、anchor: `$.captionPlan...`

これは外側artifactの物理配置を表すpathではない。v003の外側schema違反pathはv003 wrapperが別に返す。

### 5.3 exact return

返値は次のexact objectとし、field順も固定する。

```text
{
  overallStatus,
  contract: {
    status,
    violations,
    observations
  },
  checks: {
    G1: {status, violations, unverified},
    G2: {status, violations, unverified},
    G3: {status, violations, unverified}
  }
}
```

各issueは現行v002のexact shapeを維持する。

```text
{
  grammar,
  code,
  path,
  message,
  relatedIds,
  details?
}
```

- `details`は現行v002と同じ条件でだけ存在する。
- `relatedIds`の重複除去・順序、`details`のcanonical化、issueの並びは現行v002と同じ処理を使う。
- G1／G3の`unverified`は空配列。
- character粒度のG2は次の固定3件をこの順で持つ。
  1. `linguistic_word_boundary`
  2. `semantic_chunk_readability`
  3. `on_screen_readability`
- status規則は現行v002と同じで、G2固定限界がある正常系は`passed_with_declared_limit`。

### 5.4 v002 wrapper

現行`validatePresentationCaptionContract`は、次を担当する薄いv002 formal入口へ変更する。

1. v002入力全体がobjectであること。
2. `presentation-caption-check-v002`であること。
3. `format`が`normal-landscape`であること。
4. `source.atomProvenance`が非空文字列であること。
5. v002入力から§5.2の共有入力を一意に投影すること。
6. 共有返値へ、現行checker version、現行入力全体のcanonical hash、現行scope exclusionを付けて、現在とbyte同一のreportを再構成すること。

v002外枠のcontract違反と共有処理のcontract違反は、現行`sortIssues`を一回適用した同じ`contract.violations`へ統合する。
統合後に`contract.status`と`overallStatus`を現行規則で再計算する。v002外枠違反がある場合に、共有返値の合格statusをそのまま採用しない。G1〜G3の各checkは共有返値を変更せず使う。

次を合格条件として維持する。

- v002字幕回帰24/24。
- 既存3 fixture formal report aggregate SHA-256:
  `dd0fada3ba59572f80256a708eb10e0e117ea7c4515e59b792f3db571f14d234`
- 現行v002 core基準SHA-256:
  `0fcb9f9c6b0ae2f50b4ca68ba1190c75dc0acfe9e7d27a3d504bd46a5d4ce789`
  は共有化前の比較元として保存し、共有化後の新実装SHAへ無断で同一性を要求しない。意味不変は24件とaggregate byteで判定する。

### 5.5 v003 wrapper

`validatePresentationCaptionContractV003`は、承認済みの外側exact inputと13 reasonを検査した後、schema成立時だけ§5.2へ投影する。

その返値は承認済みどおり次である。

```text
{
  status,
  schemaViolations,
  grammarReport
}
```

- `grammarReport`は§5.3のexact return。
- schema不成立時は`grammarReport: null`で、共有処理を呼ばない。
- `status`はschema違反があれば`failed`、なければ`grammarReport.overallStatus`。
- B4 coreは`grammarReport`からcaption check reportの`contract`と`checks`を作り、正重なりと境界接触を承認済みの`observations`へ分離保存する。
- B4 code 54は`contract`またはG1〜G3のfailedだけを要約し、内側issueを別codeへ読み替えない。
- B4 code 55はG2固定3件と`passed_with_declared_limit`の欠落だけを検出する。

## 6. 契約確定3: `atomProvenance`

### 6.1 v003の正本

v003字幕検査の`source.atomProvenance`は、正式残存発話成果物の同名objectをbyte内容の正本とする。

exact shapeとfield順:

```text
{
  sttManifest: {path, fileSha256},
  transcript: {path, fileSha256},
  wordTimestamps: {path, fileSha256},
  candidateManifest: {path, fileSha256}
}
```

各参照は、空でないworkspace相対pathと64桁小文字hexのSHA-256を持つ。unknown fieldを拒否する。

### 6.2 根拠

1. `presentation_retained_source_atoms_v001.mjs`は、この四参照objectを`atomProvenance`として正式生成・検査している。
2. これは、STT manifest、transcript、文字時刻、候補manifestを別々のpathとhashで保存する既存の写像来歴構造である。
3. `sourceProvenance`文字列は媒体由来を表し、発話要素がどの文字・時刻資料から作られたかを表す四参照objectとは責務が異なる。
4. v003は正式残存発話成果物と1対1で接続するため、同名の構造化来歴を失わず運ぶ。

### 6.3 v002との分離

v002 formal入口の`source.atomProvenance`非空文字列契約は変更しない。

§5.2の共有G1〜G3入力から来歴を外したため、次の二つを同じ型へ読み替える必要はない。

- v002: 非空文字列の媒体・発話由来ラベル。
- v003: 四参照の写像来歴object。

formal wrapperが各版の来歴shapeを検査した後、同じ文法入力へ投影する。v002をobject対応へ緩和せず、v003を文字列へ縮退させない。

### 6.4 搬送と照合

1. B4 display pair coreは、strict decode済み正式残存発話成果物の`atomProvenance`をstructured copyする。
2. v003字幕入力の`source.atomProvenance`と、正式残存発話成果物の同名objectをcanonical byteで完全一致させる。
3. 各四参照のpath／file SHAはB3入力bindingとも照合する。
4. 一件でも不一致なら、v003 caption schema reason `source-invalid`、外側B4 code 53として停止する。
5. `atomProvenance`を解決パッケージの`sourceProvenance`文字列へ置換しない。

## 7. B4実装面の地雷探知パス

### 7.1 A: 契約から導出できた項目

| 領域 | 導出結果 | 参照元 |
|---|---|---|
| 正式7成果物path | 既承認の固定root・固定名 | B4実装契約追補§4 |
| 上位ID・6桁採番 | 既承認式を使用 | 同§5 |
| formal／canonical JSON | B1 serializerを共有 | 同§3、§6 |
| 69違反の順序・path・抑制 | 一件表どおり | 同§10 |
| B4 pure入口とrunner | 同じexportを使用 | 同§7、T085 |
| timeline写像 | v002 validator／mapperを共有 | 同§8.1 |
| 文字index・幅 | 既存layout処理を共有 | 同§8.2 |
| 実配置 | 既存TypeScript入口から既存render modelを呼ぶ | 同§8.3 |
| v003二検査file | 承認時追補の別file・別formal入口 | v003検査実体追補§3 |
| v002/v003のG1〜G3 | 本書§5の一つの共有処理 | 本書§5 |
| 発話列hash | 正規化後配列canonical SHA | 本書§4 |
| v003発話来歴 | 四参照object | 本書§6 |
| v002回帰 | 24件とaggregate byteを維持 | v003検査実体追補§10、本書§5.4 |
| 合成85件 | 修正済み一件表、69 code全発火 | B4実装契約追補§11、v003検査実体追補§9 |
| 既存回帰95件 | v002字幕24件を含む固定5file | 同§10〜11 |
| candidate 13固有値 | preflight期待へだけ置く | B4実装契約追補§13 |
| 承認済み文書の正本 | approval commitのblob byte | 本書§3 |

### 7.2 B: 人間の一判断を要した項目

本書起草前は次の四件だった。

1. 発話列hashの正本。
2. 共有G1〜G3のexact input／return。
3. v003の発話来歴shape。
4. 破損した承認済み追補を承認時byteへ復元するか。

本書で推奨を一意に固定した。**本書が承認されれば、B分類の残件は0件**である。

### 7.3 C: 実測まで値が決まらない項目

次は実測待ちだが、契約未固定ではない。

| 実測項目 | 取得時点 | 固定済みの扱い |
|---|---|---|
| Node／ICU／locale | job作成前preflight | job期待へ固定。不一致で`RUNTIME_MISMATCH` |
| TypeScript loader／変換器／platform binaryの実体hash | job作成前preflight | 11値へ固定。差し替え・不一致で停止 |
| 正式B1意味回答 | B6の一回実走 | B1契約で受入。無効回答を修復せず停止 |
| B4正式成果物のfile／canonical hash | 正式pair生成時 | manifestへ記録し、公開前後で再照合 |
| candidate 13のcue／target／instruction件数 | B1正式回答の受入後 | 汎用実装へ焼き込まず、正式preflight値と一致させる |
| layout実測値 | B4 preflight／正式生成 | 承認済み台帳・実行実体と照合し、不一致で停止 |

これらは結果を見て期待値を動かす項目ではない。既定の取得段階で一度固定し、食い違えば同attemptで直さず停止する。

### 7.4 地雷探知の結論

確認した範囲:

- 成果物schema、field順、path、ID、hash意味。
- v003二fileの実体、export、exact入出力、呼出元。
- v002共有化の投影、返値、byte不変検査。
- B1→B4、B4→caption／instruction／layout／reviewの工程間受け渡し。
- 69違反と85検査の発火・path・抑制。
- 回帰95件とcandidate 13 preflight。
- 実行環境、観測データ、公開、決定性、停止点。
- 承認済み文書の作業ツリー実体。

本書の確定を適用すれば、**実装者判断を要する既知の未固定は尽きた**と宣言する。

これは実装や検査の合格を予告するものではない。実測不一致、新しい矛盾、契約外判断が現れた場合は、従来の夜間規律どおり修正・再試行せず停止する。

## 8. 承認済み文書hash照合の恒久化

### 8.1 標準binding

人間承認済み文書を実装正本として参照する場合、次を実装前チェックのbindingへ持つ。

```text
{
  path,
  approvalCommit,
  gitMode,
  gitBlobObjectId,
  byteLength,
  fileSha256
}
```

値は承認を記録したcommitから取得する。現在の作業ツリーや最新`HEAD`を正しいものと仮定して期待値を作らない。

### 8.2 検査時点

最低でも次の三時点で照合する。

1. 実装着手直前。
2. 正式合成検査・回帰の開始直前。
3. 完了報告・安定点tagの直前。

### 8.3 照合内容

1. pathがworkspace内の期待pathである。
2. symlinkでなく通常fileである。
3. approval commitが期待blobを持つ。
4. 作業ツリー実体のmode、byte数、SHA-256が期待と一致する。
5. 安定読取の前後でstatとbyte hashが変わらない。
6. 不一致時は承認済み文書差し替えとして停止し、自動復元・最新内容への期待値更新・黙ったmergeをしない。

この検査はB4の69違反語彙へ追加しない。実装正本が信頼できる前提を確認するpreflightであり、B4 formal artifactの違反ではない。

## 9. 変更範囲

本書承認後に許可する復元・実装範囲:

1. §3の対象文書一件を承認時byteへ復元。
2. `presentation_caption_contract_v003.mjs`の新設。
3. `presentation_instruction_contract_v003.mjs`の新設。
4. `presentation_caption_contract_v002.mjs`の共有処理呼出し化。
5. 承認済みB4 core、runner、preflight runner、testdata、合成検査の実装。
6. 合成85件、回帰95件、candidate 13読み取り専用preflight。
7. 完了報告。三条件成立時だけ安定点tagとJOURNALを同一commitで作る。
8. B5承認依頼の起草まで。

含まないもの:

- B5実装。
- B6、Gemini実走。
- 正式pair生成。
- 描画。
- 人間確認。
- v002成果物の後方互換分岐。
- v003をv002へ読み替えるadapter。
- 契約不一致時の自動修復、期待値変更、再試行。

## 10. 完了条件

1. 承認済み追補の復元後byteが§3.1の承認時値と完全一致。
2. 承認済み文書hash照合が実装前チェックへ追加され、対象B4正本全件で合格。
3. §4〜6の契約がコードと検査へ一意に反映される。
4. v002字幕24/24と3 fixture aggregate SHAが不変。
5. B4合成85/85。
6. B4固定69違反codeのexport集合と観測集合が完全一致。
7. 現行回帰95/95。
8. candidate 13読み取り専用preflightが承認済み期待へ完全一致。
9. B3正式7ファイル、既存安定点、正式基礎映像、正式残存発話を変更しない。
10. 一件でも不成立なら同attemptで修正・再実行せず停止報告へ切り替える。

## 11. 人間への承認依頼

次の一件を判断してほしい。

> candidate 13 基本テロップ B4 契約閉包・承認済み文書復元 追補v001を承認する。本承認は、①`sourceAtomsSha256`を正規化後発話列のcanonical SHAへ一意化し、正式入力ファイルSHAは入力bindingだけに保持すること、②共有G1〜G3入口を本書§5のexact input／returnへ固定し、v002の既存report byteを回帰で維持すること、③v003の`atomProvenance`を正式残存発話成果物の四参照objectへ固定すること、④commit `07c60b03`から承認済み追補をbyte同一復元し、承認済み文書hash照合を実装前標準へ追加すること、を一括承認する。承認後は本書§9の範囲でB4実装、合成85件、回帰95件、candidate 13読み取り専用preflight、完了報告、B5承認依頼起草まで進めてよい。不成立が一件でもあれば同attemptで修正・再実行せず停止する。B5実装、B6、Gemini、正式pair、描画、人間確認は含めない。
