# 通常動画向け 演出レンダラー 合成データ実装 完了報告 v001

日付: 2026-07-21

状態: **承認範囲である合成データ実装まで完了。実データ描画、比較媒体、LLM実走、本体接続は未着手・凍結継続。**

人間作業: **0件・0分。**

## 1. 結論

ZEVが作った版付き演出指示書を、承認済みの通常横長プリセットへ意味を変えずに解決し、透明画像の生成、基礎映像への合成、描画後検査、来歴付き成果物の確定まで行う評価環境内レンダラーを実装した。

合成入力では、正式な空素材台帳で到達可能な9種類を描画できた。新規17/17、既存83/83、合計100/100の自動検査に合格し、レンダラー固有の違反コード47件も全件を意図入力で発火させた。

これは**契約と合成処理が成立したことの確認**である。実配信での見た目、G4〜G7の意味判断、公開品質、教師動画との優劣は測っておらず、品質達成を主張しない。

## 2. 実装した処理

### 2.1 承認済みの見た目を固定して読む

- レンダラーが読む信頼情報の場所と正規化SHA-256をコード側へ固定した。実行指示や環境変数から別の信頼情報へ差し替える入口は持たない。
- 正式プリセット台帳、正式binding、承認済みpreview、管理font、描画部品、実行tool、配置値と計算規則を信頼鎖として照合する。
- fontは管理ファイルを明示的に読み込み、代替fontへ落ちた場合は停止する。
- 文字の太さ、安全余白、下側配置、描画倍率、縁取り・glow・余白の計算規則は、人間が認定したpreviewの構成要素として固定した。**値または規則を変える場合は、版番号の変更だけでは足りず、新しい実描画previewと人間の再認定を必須とする。**

### 2.2 元素材と基礎映像の時間対応を明示する

- 解決パッケージ生成記録について、版、生成処理、元素材、話者正規化、出力パッケージIDと各hashを検査する。元素材は申告だけを信じず、実ファイルを開いてbyte単位のSHA-256を照合する。
- 初期版は元素材1件だけを受理する。複数素材の順序やIDから時間軸を推測しない。
- 基礎映像は前工程で既に組み立て済みであることを前提とし、元時間と出力時間の対応表を必須入力とする。
- 各対応区間は正の長さ、速度変更なし、出力側は0msから隙間・重なりなく連続、元側は時刻順で正の重なりなし、とした。
- 演出区間の全体が1つの対応区間へ一意に収まる場合だけ、次の明示式で出力時刻へ写す。対応なし、複数候補、複数区間またぎは停止する。

```text
出力時刻 = 対応区間の出力開始 + (元時刻 - 対応区間の元開始)
```

- 基礎映像の実ファイルhashとframe数も対応表の申告値に照合する。レンダラー内では元配信の切り出し、内部カット、並べ替え、速度変更を推測して行わない。

### 2.3 本文・時刻・話者を変えずに描画計画へ解決する

- 発話テロップは、既存G1〜G3契約の本文、明示行分け、開始anchor、終了anchorをそのまま使う。
- 発話テロップ以外は、対象として明示された元発話を指定順に無区切りで連結する。空白、句読点、元改行を削除・追加せず、前後空白除去、Unicode正規化、全半角変換、誤字修正を行わない。
- 元本文の各Unicode文字へ元位置番号を付け、欠落、重複、並べ替え、別文字への置換がないことを検査する。行分けはこの位置番号を保ったまま行うため、折返し都合で末尾の句点を消す既存経路を通らない。
- 話者表示は明示された人物targetの表示名だけを使う。元発話に付いた配信内声クラスタを人物名として推測利用しない。
- 30fpsへの時刻変換は全種類で同じ丸め規則を使い、種類別補正を置かない。表示の出入りは区間内4frameずつのfadeとし、短い表示では入口と出口の包絡を重ねる。

### 2.4 実描画と受入検査

- 正式空素材台帳で描画できる9種類を、1指示につき1つの透明PNGへ描画する。外部素材が必須のG7は合成カードで代用せず、上流検査で停止する。
- 各PNGは同じ入力から2回描画し、SHA-256が一致することを確認する。
- 行の重なりは推定矩形ではなく、各行を実際に描いた透明PNGのalpha領域で検査する。幅・高さの交差長がともに正の場合だけ違反とし、境界接触は許容する。
- 文字、縁、glow、背景板を含む実alpha領域について、空画像、画面外、安全領域外、時間と空間の同時衝突を個別に検出する。暗黙の位置移動や重なり順で救済しない。
- 基礎映像へ全指示を合成した映像と、検査対象の1指示だけ透明画像に置き換えて同じ合成経路を通した対照映像を作り、同じ代表frame・当該指示の実alpha領域内で差分画素を確認する。圧縮差を基礎映像との差と誤認せず、各指示が最終映像へ実際に寄与したことを検査する。
- entry／exitの4frame、短い区間で包絡が重なる状態、区間外で表示されない状態を、合成後のframe画像で確認する。
- 基礎映像の音声は再符号化せずstream copyし、出力のcodecと音声packet payloadのSHA-256が入力と一致することを確認する。入力に音声が無い場合は音声を創作しない。

### 2.5 来歴と出力安全性

- 成功時は、描画済み動画、描画計画、指示別適用結果、描画後検査結果、透明PNG一式、生成manifestを一組で出す。
- 生成manifestには、入力artifactとそのhash、元素材、時間対応表、基礎映像、固定信頼情報、正式台帳・binding、font、描画部品、tool版、レンダラー実装ファイルhash、実行前のGit HEADと作業木状態、各出力hashを記録する。
- 指示別適用結果には、要求されたプリセットと実適用したプリセット、台帳版、実際の描画設定hash、透明PNGの保存先・hash、最終描画要素への参照を残す。描画後の実PNG検査が観測した保存先・hashと機械照合し、複数指示が同じ保存先を共有する状態も拒否する。
- 書き込み先は評価環境の`outputs/presentation/`配下に限定し、workspaceから承認済み出力root、さらに個別出力先までの全階層でsymbolic linkを拒否する。実体パスもworkspace内であることを確認する。指示IDをそのままファイル名へ使わず、順序番号とhashを使う。
- 作業中は一時領域へ出し、全検査合格後に成功成果物を確定する。失敗時は成功動画・成功manifest等を除去し、失敗記録だけを残す。生成manifestは一組の公開完了標識として最後に確定する。

## 3. 自動検査結果

| 系統 | 結果 | 意味 |
|---|---:|---|
| 新規レンダラー検査 | **17/17** | 入力、信頼鎖、9種類の解決、文字・話者、時間対応、実PNG、合成映像、音声、出力・失敗処理を合成入力で確認 |
| 既存検査 | **83/83** | caption、演出指示書、プリセット認定・正式化、GT-03同期、話者欄契約v002を維持 |
| 合計 | **100/100** | 既存83件を削除・緩和・期待値変更せず、新規17件を追加した状態で合格 |

新規17件は、次の処理単位をそれぞれ独立したトップレベル検査にした。

1. 実行指示と時間対応表の形式。
2. 固定信頼根、台帳、preview、描画部品、tool、font。
3. v002だけの受理と旧形式の拒否。
4. 上流外枠の完全合格だけを通す停止契約。
5. 9種類の1指示1要素解決。
6. 発話テロップの本文・行・開始・終了保持。
7. 非発話テロップの本文・終了責任・文字位置保持。
8. 明示人物targetだけを使う話者表示。
9. 1元素材、複数cut、速度・frame数、対応不能・曖昧・区間またぎ。
10. 共通frame変換と短尺fade。
11. 台帳の種類、状態、font、背景、transitionを使ったfallbackなしの解決。
12. 行数、行の正の交差、安全領域、空alpha。
13. 時間と空間の正の交差による衝突検出。
14. 空素材台帳におけるG7停止。
15. 9種類の実PNG、実alpha、安全領域、再描画一致。
16. 合成MP4、指示除外対照frame、transition frame、音声packet一致。
17. 適用結果、生成manifest、描画後検査、終了コード0/1/2、失敗時清掃、違反コード全集合。

## 4. レンダラー固有違反コード

実装が公開する次の47コードを、合成した異常入力で**47/47件すべて意図的に発火**させた。テストで観測した集合と公開集合の完全一致も検査した。

```text
RENDER_JOB_SCHEMA_INVALID
RENDER_JOB_UNKNOWN_FIELD
RENDER_JOB_INPUT_HASH_MISMATCH
FONT_LOAD_FAILED
FONT_FALLBACK_DETECTED
RESOLUTION_GENERATION_MANIFEST_MISMATCH
INSTRUCTION_CONTRACT_NOT_PASSED
INSTRUCTION_CONTRACT_PARTIAL
OVERLAY_RENDER_NONDETERMINISTIC
RENDERER_TRUST_ROOT_MISMATCH
RENDERER_COMPONENT_HASH_MISMATCH
RENDERER_TOOL_VERSION_MISMATCH
PRESET_REGISTRY_CANONICAL_HASH_MISMATCH
FONT_ASSET_HASH_MISMATCH
RENDER_SOURCE_COUNT_UNSUPPORTED
BASE_MEDIA_TIMELINE_INVALID
BASE_MEDIA_HASH_MISMATCH
BASE_MEDIA_FRAME_COUNT_MISMATCH
TIMELINE_SOURCE_REF_MISMATCH
TIMELINE_SEGMENT_SOURCE_OVERLAP
TIMELINE_SEGMENT_OUTPUT_NONCONTIGUOUS
TIMELINE_SPEED_CHANGE_UNSUPPORTED
INSTRUCTION_SOURCE_INTERVAL_UNMAPPED
INSTRUCTION_SOURCE_INTERVAL_AMBIGUOUS
INSTRUCTION_SOURCE_INTERVAL_MULTIPLE_SEGMENTS_UNSUPPORTED
TARGET_RESOLUTION_FAILED
TARGET_TEXT_MUTATED
TARGET_TEXT_INDEX_GAP
TARGET_TEXT_INDEX_DUPLICATED
TARGET_TIMELINE_INVALID
TARGET_DURATION_ZERO_AFTER_FRAME_MAPPING
PERSON_TARGET_REQUIRED
APPLIED_PRESET_MISMATCH
LAYOUT_LINE_COUNT_EXCEEDED
LAYOUT_LINE_POSITIVE_INTERSECTION
LAYOUT_SAFE_AREA_VIOLATION
OVERLAY_ALPHA_EMPTY
INSTRUCTION_TEMPORAL_SPATIAL_COLLISION
INSTRUCTION_RENDER_MISSING
INSTRUCTION_RENDER_DUPLICATED
OVERLAY_RENDER_ARTIFACT_MISMATCH
OVERLAY_RENDER_PATH_DUPLICATED
OUTPUT_VIDEO_STREAM_MISSING
OUTPUT_AUDIO_STREAM_MISSING
OUTPUT_AUDIO_PACKET_HASH_MISMATCH
OUTPUT_FORMAT_MISMATCH
OUTPUT_ELEMENT_NOT_VISIBLE
```

## 5. 決定性

同じ合成入力に対し、次が一致することを確認した。

- 論理描画計画。
- 指示別適用結果。
- 描画後検査結果。
- 9種類の透明PNGそれぞれのSHA-256。

MP4のbyte一致は、エンコーダーやcontainer metadataの影響を受けるため完了条件にしていない。代わりに、映像形式、frame数、指示ごとの可視差分、transition frame、音声streamとpacket payload、論理来歴を検査した。

## 6. 話者欄契約v002の来歴

本レンダラーが前提にする話者欄契約v002は、設計artifact `presentation-resolution-source-atom-speaker-contract-revision-implementation-design-20260720-v001.md`を2026-07-20の会話上でkawafmmが一括承認し、commit `e80740ca`で実装・完了記録・DECISIONS同期を行ったもの。**設計だけの独立した事前commitは存在せず、別commitで承認済みだったとは記録しない。**

非人物値台帳の版管理は同設計§5、正式パッケージ生成時だけの`null`写像は§6、既存検査を維持する影響表は§11に記録され、実装結果は同契約の完了報告と既存83/83で確認している。レンダラーはこのv002来歴を検査し、元発話の配信内声クラスタから人物名を生成しない。

## 7. 未完了・凍結中

次は今回の承認範囲に含めず、着手していない。

1. **基礎映像＋時間対応表の生成工程**: 既存の編集指示保存結果から、組み立て済み基礎映像と時間対応表を正式に作る前工程。実データ描画の必須前提である。
2. **G4〜G7生成側**: 発火点、種類、対象、プリセット、素材を意味判断して演出指示書を作る処理。単一プリセットでは同時・近接発火が空間衝突で停止しうるため、この既知制約を入力設計で扱う必要がある。
3. **実データ描画**: 実配信、fixture、教師動画を使った描画と人間確認。
4. **LLM実走、比較媒体、本体接続**。

実データゲートを開くには、少なくとも1の正式化、G4〜G7側の入力契約確認、実データ描画の個別承認が必要である。今回の結果だけで実運用の品質や公開可能性を判定しない。

## 8. 人間へ求める次の作業

本実装完了時点で必須の人間作業は**0件**。次工程は、本報告を材料にkawafmmが優先順と承認範囲を決めるまで停止する。
