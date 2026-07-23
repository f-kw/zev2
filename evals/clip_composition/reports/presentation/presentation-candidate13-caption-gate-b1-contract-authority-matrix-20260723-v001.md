# candidate 13 基本テロップ ゲートB1実装契約 権限・由来マトリクス v001

- 作成日: 2026-07-23
- 区分: 人間待ち充填方式による副線・読み取り専用監査
- 主線: `presentation-candidate13-caption-planning-gate-b-direction-design-20260723-v001.md`の方向判断待ち
- 状態: **既存の決定と、B1設計で初めて提案すべき事項の境界を整理した。方向承認・契約確定・実装・実走なし**
- 書き込み範囲: 本レポート1件だけ。共有文書、承認済み設計、コード、正式成果物は変更していない
- 人間作業: 0件。独立した確認依頼は追加しないが、主線の方向承認文には§2.1の既存設計差分を統合してから同じ1判断として提示する必要がある

## 1. 目的

既存の棚卸しは、ゲートB1で再利用できる資産と未実装部分を既に特定している。本レポートは同じ棚卸しを繰り返さず、B1実装契約を起草するときの各判断について、次を分ける。

1. 既に承認済みの正本から、そのまま転記しなければならないもの。
2. 現在未承認のゲートB方向設計が承認された場合に、方向として固定されるもの。
3. 方向承認後も、B1設計者が具体案を作り、人間の契約承認へ出さなければならないもの。
4. B1では決めず、B4〜B6へ残さなければならないもの。

目的は、B1の起草を速めることではなく、実装者や設計者が「既存方針から自動的に決まる」と誤認して独自判断を混ぜる経路を先に見える形にすることである。

## 2. 結論

ゲートB方向設計が承認されても、直ちにコードへ進める状態にはならない。

既存正本と方向設計から一意に引き継げるのは、処理の目的、責務分離、禁止事項、入力の由来、正式保存先、停止点、最低限検査すべき事象である。一方、次はB1で初めて版付きの具体案を作り、契約承認を受ける必要がある。

- 正確な成果物schemaと許可file。
- ID、field順、直列化、相互hash。
- 違反コード全集、固定順、併発・抑制規則。
- CLIの入口、引数、0/1/2への帰属。
- 環境、入力、実装を安定読取する手順。
- ゲートA形の内包検査と、B1全体検査を接続する正本入口。
- lock、作業場所、原子的公開、公開後検品。
- `complete`と`abstained`の正確なJSON形。
- 意味分割の一時的なまとまりと、B4の正式cueとの関係。

これらは実装者が埋めてよい空欄ではない。**B1実装契約の承認対象そのもの**である。

逆に、caption prompt、Edge上のモデル確認、run 1、raw回答、タブ終了、正式cue・target・指示書・v003・描画はB1へ前倒ししない。B1で検査する意味出力の形だけを固定し、実際のpromptとWeb実走はB5・B6、正式表示成果物はB4・B7へ残す。

### 2.1 現行の方向承認文へ統合しなければならない既存設計との差分

文書照合で、未承認の方向設計と承認済み元設計の間に、黙って選べない差分が一件見つかった。

- 承認済み元設計§7.2は、モデルへ`timeline segment ID`と`発話まとまりID`を渡す。
- 未承認の方向設計§6は、モデル可視情報を「次だけ」と限定し、`container ID`へ集約して、上記二IDを列挙していない。

したがって、現在の方向設計を承認する場合は、**構造を示す可視IDを、timeline segment ID・発話まとまりIDからcontainer IDへ集約し、方向設計§6のほかの可視項目は維持する改訂承認を兼ねる**ことを明示する必要がある。B1設計者がどちらかを暗黙選択してはならない。

現行の方向設計§10.1と§14の承認文は、承認済み元設計§10.2のB1/B4分割だけを改訂対象としており、この§7.2差分を明記していない。したがって、**現在の承認文のまま方向承認を受領しても、この可視ID差分は解消しない。** 主線では方向設計そのものを書き換えるか、承認文へ§7.2の上記差分を加えたうえで、既存の方向判断と同じ一件へまとめる必要がある。本副線から別の承認セッションを追加するものではない。

また、方向設計§6は「仕事の説明」をモデルへ見せることを固定している。一方、同節はB3 packageへ「モデルへ渡す構造化入力」を置き、prompt全文はB5で初めて固定すると分けているが、仕事の説明そのものをどちらの正本へ置くかまでは明示していない。B1で一意化するのは次である。

- B3の構造化packageへ版付きの仕事本文を入れるか、B5で固定するprompt内の仕事本文を一意に参照する版付きtask ID・hashだけを入れるか。
- B3とB5のどちらを仕事本文の唯一の正本とし、他方がどう参照・束縛するか。

仕事の説明をモデルへ見せることは`direction-pending`であり、その正本配置、exact schema、B3/B5間の参照方法は`b1-design-required`である。B1は説明を消す選択をせず、同じ意味の独立正本を二つ作る選択もしない。

## 3. 権限の分類

| ラベル | 意味 | B1起草者ができること |
|---|---|---|
| `approved-root` | 人間承認済みの規則、または実装・検査まで完了した成果物。各行の由来に応じて成立段階を区別する | 値と意味を変えず参照する。未実装の方針を実装済みと呼ばず、実装済み成果物を概念方針へ弱めない |
| `direction-pending` | 現在のゲートB方向設計に書かれ、主線の1判断で承認待ち | 承認前は採用しない。承認後は方向として維持し、B1契約で具体化する |
| `b1-design-required` | 方向だけからは一意にならず、実装前契約で初めて固定が必要 | 具体案、根拠、検査可能性を一組で提示し、人間承認前に実装しない |
| `later-gate` | B1の責務外 | B1のschema・成果物へ混ぜず、指定された後段まで着手しない |

## 4. 処理別マトリクス

### 4.1 目的・責務・停止点

| 論点 | 由来 | 現在の権限 | B1での扱い |
|---|---|---|---|
| 初の一本は基本テロップだけで、「読める・ズレない・欠けない」を見る | `DECISIONS.md`、`docs/HANDOVER.md`、元設計§2・§10 | `approved-root` | G4〜G7、素材、SE、タイトル等を追加しない |
| 354文字が本文・時刻・話者証拠の唯一の正本 | 元設計§1・§3・§5、正式残存文字成果物 | `approved-root` | LLM出力を本文や時刻の正本にしない |
| LLMは行末候補と1〜2行のまとまりだけを意味判断する | 方向設計§5・§7 | `direction-pending` | 承認後に意味出力schemaへ具体化する |
| B1は入力・意味出力・compiler入力の契約提示で停止 | 方向設計§10 | `direction-pending` | コード、testdata、正式package、prompt、Geminiへ進まない |
| B4は正式表示計画・v003対、B5はprompt/payload、B6はrun 1、B7は生成・描画 | 方向設計§9〜§10 | `direction-pending` | 後段のfieldや実物をB1へ混ぜない |

### 4.2 ゲートA信頼根と入力

| 論点 | 由来 | 現在の権限 | B1での扱い |
|---|---|---|---|
| ゲートA job、3入力、実装、Node/ICU/locale/granularity、完了報告を参照する | ゲートA承認済み追補・job・完了報告 | `approved-root` | 既存byteを変更せず、新しいB jobから参照する |
| ゲートA正式runnerを再実行しない | ゲートA正式1回記録、方向設計§1・§4 | `direction-pending` | export済み純粋処理だけを使う |
| 完了後観測のevidence 3 hashを、B実行前の期待値に固定する | 方向設計§3 | `direction-pending` | 結果を見て期待値へ採用し直さない |
| 固定入力をどの順に二度読みし、差し替え・symlink・実体変更をどう止めるか | 既存完全性規律はあるが、B1固有手順はない | `b1-design-required` | 読取順、fstat、hash時点、失敗帰属を契約化する |
| 合否環境と診断環境をどのfieldへ保存するか | ゲートAに先例はあるが、B1 schemaはない | `b1-design-required` | B1の結果へ影響する項目だけを合否として事前固定する |

### 4.3 ゲートA形の再検査とB1固有検査

| 論点 | 由来 | 現在の権限 | B1での扱い |
|---|---|---|---|
| 境界生成処理と10検査・35違反コードは既存exportを使う | ゲートA実装・完了報告 | `approved-root` | 同等ロジックを複製しない |
| 既存report validatorが検査できるのは、元job・snapshot・runtime・二度生成・監視を揃えたゲートA形の記録 | 実装照合、承認準備監査§4.1 | `approved-root`の実装限界 | B1全体の合格へ拡張しない |
| ゲートA形の内包記録をどう決定的に組み立てるか | 既存runnerのprivate処理で、B1入口はない | `b1-design-required` | field、順序、入力、validator呼出しを固定する |
| B job、モデル可視入力、漏洩、manifest、公開状態の検査 | ゲートAの責務外 | `b1-design-required` | B1固有checker/report validatorを定義する |
| 本番と合成検査が同じ正本validatorを使うこと | `DECISIONS.md`の検査可能性規律 | `approved-root` | 純粋な検査入口を先に契約へ含め、複製を禁止する |

### 4.4 source-onlyモデル入力

| 論点 | 由来 | 現在の権限 | B1での扱い |
|---|---|---|---|
| 可視情報はcontainer ID、候補ID・本文、container全文、候補幅、幅制約、仕事説明だけ | 方向設計§6 | `direction-pending` | 承認後、この集合からexact allowlistを作る |
| 構造識別子をtimeline segment ID・発話まとまりIDからcontainer IDへ集約する | 承認済み元設計§7.2と方向設計§6の差分 | `direction-pending`の明示改訂事項 | 方向承認が元設計§7.2の当該二項目を上書きする旨を記録し、方向設計§6の他の可視項目は維持する |
| 教師、expected、fixture、DP、人間評価、過去表示計画、生時刻、ranking/G4〜G7、描画物を見せない | 既存漏洩原則、方向設計§6 | `approved-root` + `direction-pending` | 各階層の未知field拒否と値の由来検査へ落とす |
| 元文字ID、anchor、raw話者、path、hash、runtimeはモデル非可視 | 方向設計の可視集合と後発監査 | `direction-pending` | 決定的対応・来歴側で保持し、可視JSONへ混ぜない。timeline segment ID・発話まとまりIDは上記の明示改訂成立後に同じ非可視側へ置く |
| root/container/candidateの正確なfield名・型・順序 | 方向設計は役割だけを記載 | `b1-design-required` | strict schemaとして提示する |
| 仕事の説明をモデルへ見せる | 方向設計§6 | `direction-pending` | B1/B5で説明自体を削らない |
| 仕事本文の唯一の正本をB3構造化入力とB5 promptのどちらへ置き、他方からどう参照するか | 方向設計はモデル可視性と停止点だけを固定 | `b1-design-required` | 同じ意味の独立正本を二つ作らないexact schema・ID・hash参照を定義する |
| container全文・候補本文・候補所属を何へ照合するか | 正本は実在するがB1検査はない | `b1-design-required` | 固定境界証拠と354文字へ戻す検査を定義する |
| preset・trust・文字幅処理のどの版・hashを束縛するか | 幅36・最大2行・幅規則は承認済み | `approved-root`の値 + `b1-design-required`のbinding | 値を変えず、参照する具体的artifactと実装byteを固定する |

### 4.5 意味出力と決定的展開

| 論点 | 由来 | 現在の権限 | B1での扱い |
|---|---|---|---|
| statusは`complete`または`abstained`のみ | 元設計§7、方向設計§7 | `approved-root` + `direction-pending` | 第三の状態や部分救済を追加しない |
| containerを元順に一度ずつ使い、一表示単位は1〜2行 | 方向設計§7 | `direction-pending` | strict checkerへ落とす |
| 行末IDはcontainer内で昇順、最後はcontainer末尾 | 方向設計§7 | `direction-pending` | ID文字列を解析して順序推測せず、固定位置表で解決する |
| 205候補・354文字を欠落・重複・逆順なく一度ずつ使う | 元設計、方向設計§7、決定展開実測 | `approved-root` + `direction-pending` | LLM申告でなくcompilerが再計算する |
| text、時刻、理由、自由ID、score、未知fieldを受けない | 方向設計§7 | `direction-pending` | 一項目でもあれば出力全体を不成立にする |
| `complete`と`abstained`の正確なobject shape | 概念形だけでexact schemaは未固定 | `b1-design-required` | 未知field拒否を含む完全な二分schemaを提示する |
| 意味上のまとまりの名称・IDと、B4の正式cueとの関係 | 方向設計§7・§9には概念語`cues`がある | `b1-design-required` | B1用概念とB4正式cueを混同しない名称・変換責務を固定する |
| 特殊文字を含むJSON、`undefined`、非有限数の扱い | candidate 13実データだけでは一般安全性を証明できない | `b1-design-required` | strict JSON前処理と合成検査を契約化する |

### 4.6 正式packageと公開

| 論点 | 由来 | 現在の権限 | B1での扱い |
|---|---|---|---|
| 境界専用の別正式成果物を作らず、B1 packageへ直接封入する | 方向設計§1・§4 | `direction-pending` | 中間mirror・互換copyを作らない |
| 正式rootはゲートA jobの`formalOutputPath`一箇所 | 既存job、方向設計§6 | `direction-pending` | candidate固有pathはjobだけに置く |
| B3で一括公開し、既存rootがあれば上書きせず停止 | 方向設計§6・§10 | `direction-pending` | B1は契約、B2はread-only、B3で初めて公開する |
| packageの許可file名、各schema、field順、相互hash | 未固定 | `b1-design-required` | package全体を一意に再読込できる形で提示する |
| canonical hashと実byte hashの役割 | 既存規律は承認済み、B1直列化は未固定 | `approved-root`の分離原則 + `b1-design-required` | 同値と同byteを別に検査する |
| lock、owner、work、staging、rename、失敗残留、公開直前再検査、公開後検品 | 既存先例はあるがB1入口はない | `b1-design-required` | どの先例を限定再利用するかも含めて契約化する |
| B1読み取り専用preflightが正式rootを作らない | 方向設計§10・§11 | `direction-pending` | 出力監視範囲と前後不変を検査する |

### 4.7 違反、CLI、検査

| 論点 | 由来 | 現在の権限 | B1での扱い |
|---|---|---|---|
| 検査すべき13群 | 方向設計§11 | `direction-pending` | 削らず合成検査へ落とす |
| 正常0、契約不成立1、使い方・内部異常2 | 方向設計§11、既存CLI規律 | `approved-root` + `direction-pending` | exact入口ごとの帰属を定義する |
| 違反コードを閉じた集合・固定順にし、全件発火させる | `DECISIONS.md`、ゲートA追補 | `approved-root` | B1固有コードを新しい版で定義する |
| コード名、総数、事象との帰属、併発・抑制 | 未固定 | `b1-design-required` | 実測後に増減せず、実装前に完全表を提示する |
| CLI名、必須引数、相互排他、stdout/stderr、report形 | 未固定 | `b1-design-required` | productionと検査が同じ正本処理を通る形で提示する |
| ゲートA 21/21、残存文字50/50の維持 | 方向設計§11 | `direction-pending` | B2の完了条件へ入れる。B1で再実行しない |

### 4.8 B1では決めないもの

| 論点 | 由来 | 現在の権限 | 指定された段階 |
|---|---|---|---|
| prompt本文・版台帳・execution payload | 方向設計§8・§10 | `later-gate` | B5 |
| Edge実体、画面上のモデル名、run 1、送信一回性、raw回答、タブ所有・終了 | 方向設計§8、実行経路棚卸し | `later-gate` | B6の実装前契約と実走 |
| 正式cue、target、時刻、指示書、解決package、状態遷移 | 方向設計§9〜§10 | `later-gate` | B4で契約、B7で実物 |
| G4〜G7、素材、SE、callback、層1・層2 | 現在の凍結・初描画範囲 | `later-gate` | 別の人間承認まで停止 |
| 自然な区切り・読みやすさの最終認定 | 元設計・ゲートA完了報告 | `later-gate` | B7の人間確認 |

## 5. B1起草時の順序

方向設計が承認された場合、B1起草は次の順で行う必要がある。

1. `approved-root`を、意味を変えずに入力制約として列挙する。
2. 承認済みの方向を改訂履歴へ案内し、`direction-pending`を方向固定へ切り替える。このとき、元設計§7.2のモデル可視二IDをcontainer IDへ集約する差分を明記する。
3. `b1-design-required`の全項目について、具体案と検査入口を同時に定義する。
4. 成果物schema、違反コード、CLI、環境・hash、入出力範囲、停止点、検査可能性を完全性チェックする。
5. `later-gate`がB1へ混入していないことを検査する。
6. B1実装契約を一件の人間承認へ提示して停止する。

コードやtestdataを作ってから空欄を発見する順序には戻さない。

## 6. 既存棚卸しとの関係

本レポートは次の既存文書を置き換えない。

- `presentation-candidate13-caption-gate-b1-contract-readiness-inventory-20260723-v001.md`: 再利用できる資産と未固定事項の全体棚卸し。
- `presentation-candidate13-caption-gate-b1-contract-precedent-factual-inventory-20260723-v001.md`: 公開・漏洩・厳密検査の既存実装慣行。
- `presentation-candidate13-caption-gate-b-direction-approval-readiness-audit-20260723-v001.md`: 現在の方向判断が一件で成立するかの監査。
- `presentation-candidate13-caption-gate-b-direction-post-inventory-delta-audit-20260723-v001.md`: 後発実測が方向を反証しないかの再照合。

本レポートが追加したのは、各未固定事項を「既存正本の転記」「方向承認で固定」「B1で提案・承認」「後段へ残す」のどこへ属させるかという権限の対応表だけである。

## 7. 今回行っていないこと

- ゲートB方向設計の承認・修正。
- B1のschema名、field名、違反コード名、件数、CLI名、path、lock名、直列化規則の決定。
- コード、testdata、runner、prompt、正式package、Gemini出力、v003成果物、描画の作成。
- `DECISIONS.md`、`docs/HANDOVER.md`、承認済み設計、プロンプト台帳の変更。
- 人間への新しい質問・承認依頼。

## 8. 人間作業と現在地

- 本副線: **0件。媒体視聴・時刻入力・文字分割・時間計測なし。**
- 主線で既に必要な判断: ゲートB方向設計の承認1件。ただし、承認文へ元設計§7.2の可視ID差分を統合した補正版でなければならない。
- 本副線が追加する独立判断: **0件。** 上記差分は同じ方向判断へ畳む。
- 方向承認後に次に提示するもの: B1の完全な実装契約1件。

現時点でコードへ進めない理由は、実装が難しいからではなく、`b1-design-required`の具体値と検査入口がまだ人間承認済み契約になっていないためである。
