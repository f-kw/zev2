# candidate 13 字幕表示計画 B4 T082・T083 時間対応診断／修正設計 v001

- 日付: 2026-07-26
- 状態: 読み取り専用診断完了、修正設計提示、実装未承認
- 対象: B4正式合成検査 T082・T083
- 人間作業: 本文書の承認1件。確認媒体の視聴や位置指定は0件

## 1. 結論

T082・T083は同じ一件で停止している。

正常経路用の合成意味回答は、205件の機械境界候補を一件ずつ独立した表示単位にしている。このうち
`segmenter-boundary-000074`の「っ」は、元時刻が`1952663–1952683ms`の20msしかなく、30fpsの時間格子では開始・終了がともにframe `58580`になる。既存の時間対応処理はこれを表示時間0として
`INSTRUCTION_SOURCE_INTERVAL_ZERO_FRAME`で正しく拒否した。

したがって主因は、**正常経路fixtureがB4で表示できない意味分割を正常例として作った検査fixtureの欠陥**である。時間対応処理、B1の正式package、残存発話、基礎映像、productionの表示計画契約を緩めない。

同時に、正式runnerは各表示単位に付いた内側の違反名を保持しているのに、上位報告へ集約していない。そのため外側報告は`TIMELINE_MAPPING_FAILED`までしか示さず、`nestedViolationCodes`が空になった。これは**runnerの診断情報実装の欠陥**であり、停止そのものの主因とは分けて直す。

契約同士の矛盾は見つからなかった。B1が受理した意味分割をB4が時間格子上で追加検査し、表示不能なら停止することは承認済み契約どおりである。今回誤っていたのは、その停止対象を「formal CLI success」のfixtureへ使った点である。

## 2. 実施した診断

正式87件の再実行は行っていない。

### 2.1 T082・T083の正式CLI出力観測

現在の検査harnessから、T082・T083が実際に使うjob生成処理だけをリポジトリ外の一時観測器から呼び、各正式CLIを一度ずつ実行した。生成した一時job、意味回答、検査報告、出力先は観測後に削除した。

観測正本:

- `evals/clip_composition/outputs/presentation/test-runs/20260726-caption-b4-t082-t083-diagnosis-v001/observations.json`
- SHA-256: `5db13c6057cf9ba498d50ab5c481e33441740e823c983936780ece33c492ab3c`

| 項目 | T082 | T083 |
|---|---|---|
| process終了 | 1 | 1 |
| stderr | 0 byte | 0 byte |
| trusted report | 成立 | 成立 |
| report状態 | failed | failed |
| 停止段階 | timeline | timeline |
| 外側違反 | `TIMELINE_MAPPING_FAILED` | `TIMELINE_MAPPING_FAILED` |
| 内側違反列 | 空 | 空 |
| semantic seam | passed | passed |
| source atom | passed | passed |
| timelineより後 | 未実行扱い | 未実行扱い |

T083は本来の`OUTPUT_ROOT_ALREADY_EXISTS`へ到達する前に、T082と同じ時間対応で停止している。

### 2.2 205候補の時間対応全走査

B3正式7ファイル、残存source atom、正式timelineだけを読み、既存の
`mapPresentationSourceIntervalV002`へ205候補の元区間を一件ずつ渡した。正式検査や正式成果物の生成は行っていない。

観測正本:

- `evals/clip_composition/outputs/presentation/test-runs/20260726-caption-b4-t082-t083-diagnosis-v001/timeline-mapping-inspection.json`
- SHA-256: `37b36f9463f4a5f7d0915c9d1a2320d42a211218c6d61363abf768e46099c645`

| 結果 | 件数 |
|---|---:|
| 走査候補 | 205 |
| 1区間へ正しく写せた | 204 |
| 表示時間0で拒否 | 1 |
| 区間外・複数区間・曖昧 | 0 |

唯一の不成立:

| 項目 | 値 |
|---|---|
| container | `segmenter-container-000002` |
| candidate | `segmenter-boundary-000074` |
| atom | `word-7077` |
| 本文 | `っ` |
| 元区間 | `1952663–1952683ms` |
| 30fps開始・終了 | `58580–58580` |
| 既存mapperの判定 | `INSTRUCTION_SOURCE_INTERVAL_ZERO_FRAME` |

隣接候補との結合も同じ既存mapperで確認した。

| 固定した文字列 | 元区間 | 表示frame | 判定 |
|---|---:|---:|---|
| `なっ` | `1952543–1952683ms` | 4 | passed |
| `った` | `1952663–1952803ms` | 4 | passed |
| `なった` | `1952543–1952803ms` | 8 | passed |

独自の時間余白、許容差、frame延長は使っていない。

## 3. 過去三層の現在値

今回の読み取り診断は、過去の修正を次の範囲で再確認した。

| 層 | 今回の到達 | 判定 |
|---|---|---|
| 意味回答fixtureの保存後hash修正 | 入力binding、意味検査報告、compiler再構築、semantic seamがpassedとなりtimelineまで到達 | 動的に再確認済み |
| TSXのUnix socket／実行環境 | 固定Node・TSX・esbuild bindingが一致し、実配置検査後の表示計画が作られたうえでtimeline検査へ到達 | EPERM再発なし。動的に再確認済み |
| 内部画面幾何の有限小数 | 事前の専用12検査は12/12。今回も内部配置検査を通過して表示計画が存在 | 既存修正維持。今回の停止原因ではない |

今回の時間対応不成立は、これら三層の修正を巻き戻す理由にならない。

## 4. 帰属

| 観測 | 帰属 | 根拠 |
|---|---|---|
| T082がexit 1 | 検査fixtureの欠陥 | formal success用意味回答が20msの「っ」を独立cueにした。既存mapperの拒否は契約どおり |
| T083が`OUTPUT_ROOT_ALREADY_EXISTS`へ届かない | 上記からの派生 | 共通fixtureがtimelineで先に止まる |
| `nestedViolationCodes: []` | runner実装の欠陥 | cueごとのmappingには内側codeがあるが、上位timeline観測へ集約していない |
| 205件中1件だけ表示時間0 | 診断データ | B1の機械候補の誤りではない。機械候補は意味groupより細かくてよく、B4で独立表示できないことがある |
| 時間対応処理の拒否 | 正常動作 | 20msを独自延長せず、0 frameを拒否した |

## 5. 修正設計

### R1. formal success fixtureをB4で表示可能な意味分割へ直す

正式B3 package、境界候補205件、残存source atom 354件、timelineは変更しない。

合成意味回答のcontainer 2だけを次のようにする。

- candidate 73、74、75を三つの独立meaning groupにしない。
- 三候補の連続本文`なった`を一つのline・一つのmeaning groupにする。
- 意味回答に書く行末IDは`segmenter-boundary-000075`一件とする。
- compilerが既存対応表からcandidate 73〜75、atom `word-7076`〜`word-7078`、本文`なった`、元区間`1952543–1952803ms`を復元する。
- 既存mapperで8 frameへ一意に写ることをfixture生成直後に確認する。

この変更後の合成正常例は次の固定値になる。

| 項目 | 修正前 | 修正後 |
|---|---:|---:|
| source atom | 354 | 354 |
| boundary candidate | 205 | 205 |
| container | 3 | 3 |
| meaning group | 205 | 203 |
| cue | 205 | 203 |
| line | 205 | 203 |
| timeline segment | 2 | 2 |

203は正式B6結果の期待値ではなく、合成正常fixtureの値である。B4読み取り専用preflightの正本どおり、正式meaning group・cue・line件数はB6まで`not_available_before_b6`のままにする。

禁止:

- 20msを1 frameへ切り上げる。
- mapperの`ZERO_FRAME`拒否を弱める。
- source atom時刻、timeline、B3正式packageを変更する。
- productionで隣接cueを黙って結合する。
- candidate 13固有IDをproductionへ焼き込む。

### R2. mapperの内側違反を上位報告へ欠落なく運ぶ

formal runnerの時間対応走査で、各cueについて既に得ている
`mapped.violations[].code`をcue順・mapper内順で上位timeline観測の
`nestedViolationCodes`へ集約する。

- codeの名前・順序は既存mapperの返値を正本とする。
- B4側で別名へ変換しない。
- 重複を独自に除去しない。
- cueごとの`mappingByCue`は現状どおり保持する。
- checker core、mapper、schema、違反所有者は変更しない。

旧fixtureのcandidate 74を独立cueにした負例では、外側codeが
`TIMELINE_MAPPING_FAILED`、内側列が
`["INSTRUCTION_SOURCE_INTERVAL_ZERO_FRAME"]`となる。

## 6. 検査設計

現在の87件へ、時間対応の内側code伝達を実processで固定する一件を追加し、正式合成検査を88件とする。この件数変更は本修正設計の承認範囲に含める。

追加する一件:

1. formal success fixtureのうちcandidate 74だけを再び独立meaning groupにした版を作る。
2. 正式CLIを実processで起動する。
3. exit 1、stderr 0 byte、trusted failed report v002を要求する。
4. 最初の外側違反を`TIMELINE_MAPPING_FAILED`へ固定する。
5. `details.nestedViolationCodes`を
   `["INSTRUCTION_SOURCE_INTERVAL_ZERO_FRAME"]`へ固定する。
6. 正式出力、lock、workが残らないことを確認する。

既存T082はexit 0、T083は`OUTPUT_ROOT_ALREADY_EXISTS`を先頭に持つexit 1のまま期待を変更しない。

承認後の一回実行順:

1. test fixtureとrunnerの限定修正。
2. 新規時間対応負例を含む正式88件を頭から一回。
3. 1件でも不合格なら同attemptで直さず停止。
4. 88/88の場合だけ、意味回答側133件、回帰95件、candidate 13読み取り専用preflight v002。
5. 全て合格した場合だけB4完了報告、安定点3条件の確認、tag＋JOURNAL、B5承認依頼起草へ進む。

## 7. 水平確認

- candidate 13の205境界候補を同じmapperへ全走査し、0 frameはcandidate 74の一件だけだった。
- 区間外、複数segment、曖昧写像は0件だった。
- runnerの内側code欠落は特定candidate固有ではなく、全timeline mapping failureに共通する実装経路である。
- mapper、timeline、B3 package、残存source atomに修正対象はない。

## 8. 変更範囲

承認後に変更する候補は次の2ファイルだけである。

- `evals/clip_composition/test_presentation_caption_display_pair_v003.mjs`
- `evals/clip_composition/run_presentation_caption_display_pair_job_v001.mjs`

必要な設計記録・完了報告・TAP・観測JSONは
`evals/clip_composition/reports/`と`evals/clip_composition/outputs/`へ新規保存する。

本体UI、backend、client、正式B3 package、凍結fixture・expected、基礎映像、timeline、registry、Gemini、描画は変更しない。

## 9. 停止点と承認依頼

現時点では診断と設計までで停止する。コード修正、正式88件、回帰、preflight、B4完了、tag、JOURNAL、B5は未実施である。

承認依頼:

> candidate 13 B4 T082・T083 時間対応診断／修正設計v001を承認する。formal success fixtureではcandidate 73〜75の`なった`を一つのmeaning groupへまとめ、合成期待値をmeaning group・cue・line各203件へ固定する。正式B3 package・205境界候補・354 source atom・timeline・mapperは変更しない。runnerは既存mapperの内側違反codeをcue順のまま上位報告へ運ぶ。時間対応負例1件を追加して正式合成検査を88件とし、88件頭から→意味回答133件→回帰95件→preflight v002を一回実行する。不合格1件でも同attemptで直さず停止し、全合格時だけB4完了報告・安定点・B5起草へ進む。
