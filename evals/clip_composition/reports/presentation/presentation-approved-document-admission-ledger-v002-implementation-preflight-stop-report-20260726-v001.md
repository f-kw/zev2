# approved-document-admission-ledger-v002 実装前preflight停止報告 v001

- 日付: 2026-07-26
- 対象承認: `approved-document-admission-ledger-v002`実装契約追補v001 §17・§18
- 基準commit: `c5e19208a56ce6b52c60e93e1c4a068d105eb3e0`
- 状態: **実装前停止**
- 撤退条件上の数え方: 本承認時点からの停止イベント **1件目 / 2件**

## 1. 結論

実装前の読み取り専用監査で、承認済み契約だけから実装を一意に導けない箇所を2点検出した。

同じ監査パスで同時に見つけたため、撤退条件上は一つの停止イベントとして数える。二つの欠陥を別々の再試行で発見したものではない。

仮の字句解析器、検査対象外という暗黙の扱い、違反code・検査件数の独自追加は行わない。schema、台帳、検査器、runner、test、承認記録、bootstrap jobは一つも作成していない。

## 2. 成立を確認できた前提

次は読み取り専用監査で成立した。

- `HEAD`と`refs/heads/main`は
  `c5e19208a56ce6b52c60e93e1c4a068d105eb3e0`で一致する。
- bootstrap対象10 pathは、HEAD・index・worktree・全ref履歴の全てで不存在。
- indexはstaged 0件で、対象10 pathだけを将来stageできる。
- 行11の追補正本はcommit `c5e19208...`のbyteへ一意に再導出できる。
- 固定Node・Gitの実体、版、SHA-256は契約値と一致する。
- shallow、replace、alternates、partial clone、禁止環境変数は観測されない。
- v001承認文書照合は6/6合格し、既存6件のidentityも契約値と一致する。

Git自己参照やbootstrapのexact 10 pathに関する新しい停止要因は見つからなかった。

## 3. 停止理由1: import範囲検査の解釈規則が未固定

### 3.1 契約で固定されていること

追補は次を要求する。

- §8.5: Node組み込みmoduleと固定toolGraph内の相対pathだけを許す。
- package解決、`node_modules`、作業ツリー、絶対path、動的import、network importを拒否する。
- 違反code 68
  `TOOL_GRAPH_IMPORT_OUTSIDE_GRAPH`を固定する。
- 統合検査I019でtoolGraph外import、package解決、絶対path importの拒否を確認する。

### 3.2 一意に導けないこと

JavaScript sourceからimportを取り出す次の契約がない。

- 字句・構文の解釈規則。
- 静的`import`、`export ... from`、動的`import()`、`require`、
  `import.meta`の扱い。
- comment、文字列、template、正規表現、hashbang内の見かけ上の
  `import`をどう除外するか。
- 許可するspecifierのrole別対応表。
- toolGraphのmoduleを評価する前に、どの正式入口がこの検査を行うか。

既存repositoryにはprivateなJavaScript scannerが複数あるが、exportされておらず、どれを正本にするかも指定されていない。v002のtoolGraphは新規5実体に固定され、toolGraph外importも禁止される。

固定Node v20.19.6にも、通常起動で使える公開JavaScript parserはない。実験flagで有効になる`SourceTextModule`は契約のexact起動外で、静的依存しか列挙せず、動的`import()`の拒否を単独では担えない。

したがって、次のどれを採るかが実装者判断になる。

- 生文字列の正規表現。
- 既存private scannerの一方を複製する。
- 新しいscannerを設計する。
- module評価時の失敗だけに任せる。

どれを選ぶかで、同じsourceが違反code 68になるか、fatalになるか、見逃されるかが変わる。これは実装詳細ではなく、検査結果を左右する未固定契約である。

### 3.3 推奨する確定方向

toolGraphを5実体のまま保つなら、既存scannerの**一つをcommit・由来関数・受理構文ごと名指し**し、v002共有処理内の唯一のscannerとして抽出する追補を推奨する。

同時に、role別の許可specifier、上記の各JavaScript表現、module評価前に検査する入口、違反code 68の所有条件を固定する。

別案は共有scannerをtoolGraphの6件目にすることだが、bootstrap path数・toolGraph件数・検査表の改訂が必要になる。

## 4. 停止理由2: 非登録commitでの一時改変を履歴検査が捕捉しない

### 4.1 契約で固定されていること

§4.4は、承認済み文書の改訂について次を要求する。

- 改訂文書byte、承認記録、ledgerの新entry、版付きadmission jobを
  同じrevision登録commitへ入れる。
- 旧entryを変更せず、`supersedes`の一意な版鎖を作る。
- 現在のworktreeは版鎖の末尾と照合する。

### 4.2 検出できない履歴

formal phaseの状態機械は、全first-parent commitでledgerの有無と
`admissions`のprefix・件数・内容を検査する。一方、承認済み文書pathの実体diffを再検査するのは登録commitである。

そのため、次の履歴を現在の違反codeと検査表だけでは拒否できない。

1. 非登録commit Xで承認済み文書を変更する。
2. 後続の非登録commit Yで元のbyteへ戻す。
3. 現在のledger・現在のworktree・全登録commitは正しい状態になる。

§4.4の運用要求には反するが、履歴検査が見る値には違反が残らない。これを拒否する違反code・所有条件・検査も固定されていない。

### 4.3 推奨する確定方向

承認済み文書の保証を維持するなら、各first-parent隣接commitで、その時点の有効版pathのidentityを追跡する案を推奨する。

- 文書identityが変わるcommitは、そのpathを
  `revisedDocument`とする唯一のrevision登録commitだけ許可する。
- 非登録commitでの変更、削除、type change、変更後の復元を拒否する。
- 所有違反codeと検査を版付きで追加し、70違反・101検査の件数も改訂する。

別案は「中間commitでの一時改変は保証外」と§3.2へ明記し、§4.4を登録時の運用手順に限定することである。ただし台帳の改変検知範囲は狭くなる。

## 5. 人間判断が必要な内容

一つの確認セッションで、次の2判断だけを求める。

1. import範囲検査の正本を、既存scanner由来のv002内単一scannerとして固定するか、toolGraphへ共有scannerを追加するか。
2. 非登録commitでの一時改変も履歴違反として検出するか、保証外として明記するか。

推奨は、1が「既存scanner由来のv002内単一scanner」、2が「履歴違反として検出」である。

人間作業は2判断・1セッション。時間は計測しない。

## 6. 停止時の実体

- 実装ファイル新規作成: 0件
- schema・台帳・bootstrap job新規作成: 0件
- 承認記録新規作成: 0件
- index変更: 0件
- bootstrap commit: 未作成
- B5設計・B5実装・token計測・API通信・Gemini実走: 未着手

承認内容と撤退起算点だけを先行して正本化したcommit
`c5e19208a56ce6b52c60e93e1c4a068d105eb3e0`は保持する。

## 7. 再開条件

上記2点を版付き契約追補で一意に確定し、人間承認を受けること。

次のpreflightで別の人間判断を要する独立停止が発生した場合は、本承認時点から数えて2件目となる。その時点で追加patchや3件目の掘削を行わず、「どの文書へ台帳束縛が必要か」の範囲問題としてkawafmmへ戻し、スケルトン設計の議題へ接続する。
