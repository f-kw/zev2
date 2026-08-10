# A-v002正式proof fatal 読み取り診断 v001

日付: 2026-08-09  
対象job SHA-256: `a07944411b08b72702c1d60b3792ceed7387f61f40d099f7eb7909b812a00e86`  
通信: 0回  
再実行: 0回  
費用: US$0

## 1. 結論

**診断可能性不足のため、根本原因は確定できない。**

保存済みjob、実行記録、stdout、現行proof runnerの制御経路だけでは、fatalが次のどこで発生したかを一意に区別できない。

- jobの実行時再読・JSON復号
- 既存production依存の初期化
- 開始時の入力・実装・tool実体の再読
- fixture構築冒頭の出力root取得
- 上記の外から最上位catchへ抜けた例外

したがって、依存初期化と開始時再読のどちらかを推測で選ばない。修正、正式proof jobの新attempt、6本の描画、QC、確認ページ生成は行わず停止する。

## 2. 使用した証拠

| 証拠 | 保存値 |
|---|---|
| 正式job | `a-v002-layer1-v3-option-b-proof-20260809-v001.json`、SHA-256 `a07944411b08b72702c1d60b3792ceed7387f61f40d099f7eb7909b812a00e86` |
| 実行時刻 | `2026-08-09T08:10:13.632Z`〜`2026-08-09T08:10:15.368Z` |
| 起動条件 | ネイティブ、固定Node、固定TSX絶対path、固定Node先頭PATH、`NODE_OPTIONS`不存在、Chromium起動preflight合格 |
| 終了 | code `2`、status `fatal`、violations `0` |
| stdout | 235 byte、SHA-256 `1b19a0d01ff0fcce576e13bdfd547e857d987a671103fcd523ea49f7f07c87ba` |
| stderr | 0 byte、SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| fatal観測 | `innerStage=unknown / targetFile=null / innerCode=UNCLASSIFIED` |

Chromiumの外側preflight合格は、proof runner内部の依存初期化、入力再読、tool照合のどこまで通過したかを証明しない。

## 3. 現行runnerで失われる情報

現行runnerは、各catchから本来の段階名を次のように渡している。

| catch位置 | 渡す段階名 |
|---|---|
| job再読・JSON復号 | `job-read` |
| 依存初期化 | `runner-bootstrap` |
| 開始時入力再読 | `input-read` |
| fixture構築 | `semantic-rebuild` |

しかし内側codeが`UNCLASSIFIED`になると、fatal変換は呼出側が渡した段階名を`unknown`へ置換し、対象fileも常に`null`にする。さらに最上位catchも段階指定なしの同じfatalを出す。

このため、少なくとも次の異なる事象が保存結果上で同じ三つ組へ収斂する。

| 候補経路 | 区別に必要だが保存されていないもの |
|---|---|
| jobの読取・復号 | job-readへ入った事実、読取完了、復号完了 |
| 依存初期化 | 個々のmodule読込開始・完了、必須export確認結果 |
| 開始時再読 | どの正式入力・実装file・runtime実体・tool照合で止まったか |
| fixture構築冒頭 | 出力親root取得開始・完了、正式root取得開始・完了 |
| 最上位catch | 内側catchを通らず外へ抜けた事実 |

保存されたstdoutには、失敗した値、path、tool、例外種別を区別できる構造化欄がない。stderrも0 byteである。したがって環境対照、実行時間、消去法だけで原因を確定できない。

## 4. 三分法の帰属

| 帰属 | 判定 | 根拠 |
|---|---|---|
| 実装修正が必要 | **未確定・除外不可** | 依存初期化またはrunner内の再読処理で、未分類例外が発生した可能性を保存値から除外できない |
| job・設営の問題 | **未確定・除外不可** | 実行時のjob読取、入力path、runtime/tool実体のどこまで成立したかを示すcheckpointがない |
| 契約解釈が必要 | **積極的証拠なし・最終除外不可** | 検査済み拒否の違反は0件だが、fatalの発生位置自体が不明であるため契約との照合点を固定できない |

現時点の正直な帰属は、**「具体的な境界・値・path・toolが未確認の未分類fatal」**である。契約に触れない軽微な修正と確定できないため、残周回2/2は開始しない。

## 5. 診断を成立させるために不足する観測

生message、stack、stderr、字幕本文、secretを保存する必要はない。最低限、次の閉じた構造化観測が必要である。

1. `UNCLASSIFIED`でも、呼出側が確定した段階名を失わないこと。
2. `dependency-initialization`と`start-input-reread`の入場・完了を区別するcheckpoint。
3. 開始時再読内では、job、上流JSON、source media、実装file、runtime実体、tool診断のどの閉語彙工程か。
4. 対象fileは検証済みbindingまたは実読取証拠からのみ記録し、確定不能なら`null`とすること。
5. 例外型を、生文字列なしの閉語彙で`module-load`、`json-decode`、`file-read`、`tool-inspection`等へ写すこと。

## 6. fatal観測性v002との関係

A-v002正式proof runnerは、fatal観測性v002で固定済みの5境界へ含まれない新設runnerである。共通のfatal observation schemaと分類入口は利用しているが、5境界で成立した対象file接続・内側stage保持・永続失敗報告の保証を持たない。

今回`UNCLASSIFIED`しか残らなかった構造上の理由は、**proof runnerが固定5境界外にあり、ローカルfatal変換が分類済みcodeまたは構造化証拠を得られない場合、caller stageを`unknown`へ落とし、targetFileを`null`固定にすること**である。どの例外型・入口がこのfallbackを発火させたかは未確認であり、根本原因とは分けて扱う。

「新設runnerへ、初の正式実走前から最小fatal観測性を装備すること」は将来工事の在庫へ登録する。今回の診断では観測性契約・production codeを改訂しない。

## 7. 実施・未実施

### 事実

- 保存証拠と現行runnerの読み取りだけを行った。
- 独立監査3件も、一意確定不能で一致した。
- API通信0回、費用US$0、再実行0回、コード変更0件。

### 未実施

- 根本原因の推測確定
- 修正実装
- 正式proof jobの新attempt
- 横型3本、縦型字幕診断3本、QC、確認ページ
- stable tag発行
- O1への接続

人間目視前のtag禁止と、A完了報告後にだけO1へ接続する予約を維持する。
