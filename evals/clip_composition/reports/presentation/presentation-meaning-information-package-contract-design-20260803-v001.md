# 意味情報パッケージ契約 設計v001

- 日付: 2026-08-03
- 状態: **起草・人間承認待ち**
- 対象: 新規生成分におけるZEVの最終出力
- 非対象: 実装、API通信、既存成果物の変換・再生成、描画

## 1. 結論

ZEVが出力するのは、**何を、どの順で、いつ伝えるか**を固定した`meaning-information-package.json`一つとする。

含めるもの:

1. 使用する元媒体とそのbyte束縛。
2. 採用区間と意味上の接続順。
3. 改行前の字幕本文、元発話atom、発話時刻。
4. タイトル文字列。当面は人間入力だけとし、空を許す。
5. 将来のG4〜G7意味観測を置く欄。
6. 判断元を追跡するSHA-256来歴。

含めないもの:

- 画面上の行、ページ、論理幅、最大行数、文字幅規則。
- 横型・縦型等のformat、screen layout、preset、visual state。
- crop、viewport、座標、安全領域。
- 文字サイズ、書体、縁、光彩、色、animation。
- 素繋ぎ、暗転、fade等の場面転換表現。
- SE、BGM、音量等の音響表現。

同じ意味情報を、横型、縦型、将来の別styleへ渡せることが本契約の目的である。表示の都合でZEVが意味境界を変えることを禁止する。

## 2. 現行実装で確認した切断点

現行の意味情報は次の正本へ既に存在する。

| 意味 | 現行正本 |
|---|---|
| 発話本文・文字単位時刻 | `presentation_retained_source_atoms_v001.mjs`と`source-atoms.json` |
| 意味境界候補 | `presentation_segmenter_boundary_evidence_v001.mjs`と`segmenter-boundary-evidence.json` |
| 採用区間 | 正式組立決定と`presentation_base_media_timeline_v002.mjs` |

密結合はその後に生じている。

- B3がpreset、行幅、最大2行、文字幅規則を意味入力へ入れる。
- B5/B6の`lineEndBoundaryCandidateIds`は、末尾を意味まとまり終端、途中を画面上の行末として兼用する。
- B1は意味回答を行幅・行数でも拒否する。
- B4は意味復元に加え、format、preset、幅、crop、明示行を正式表示計画へ入れる。

新契約の切断点は、各meaning groupの最後の境界候補から本文・atom参照・発話時刻を機械復元した直後とする。途中の表示行末はZEV最終出力へ持ち込まない。

## 3. 正式byteと共通型

### 3.1 正式成果物

- 固定名: `meaning-information-package.json`
- schema: `zev-meaning-information-package-v001`
- UTF-8、BOMなし、2 space indentation、末尾LF 1 byte。
- objectのkey順は本書の列挙順。
- duplicate key、未知key、欠落key、疎なarrayを拒否する。
- 文字列へtrim、Unicode正規化、句読点付与、表記修正を行わない。
- 数値はsafe integerだけ。小数点表記、指数表記、negative zeroを拒否する。
- 正式直列化は既存の厳密JSON直列化処理を一つだけ再利用し、第二serializerを作らない。

下流へ渡すZEV最終payloadはこの1ファイルだけとする。生成job、検査report、入力来歴は伴走記録であって第二の意味payloadではない。正式jobと下流jobはfile SHA-256とcanonical SHA-256を記録する。互換copy、表示用copy、manifestの名目で同じ本文の第二正本を作らない。

### 3.2 文字列・ID

- `FormalId`: ASCII正規表現`^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`に一致する文字列。
- `Sha256`: 小文字16進64文字。
- `sourceRef`: v001では`^youtube:[A-Za-z0-9_-]{11}$`だけ。別媒体種別は契約改訂とする。
- workspace相対path: `/`区切り、先頭`/`・空要素・`.`・`..`・NULなし。解決先はworkspace内のregular fileで、symlink・hardlinkを拒否する。

### 3.3 Binding

JSON bindingは次の4 keyだけを、この順で持つ。

1. `schemaVersion`
2. `path`
3. `fileSha256`
4. `canonicalSha256`

media bindingは次の2 keyだけを持つ。

1. `path`
2. `fileSha256`

全SHAは開始時と正式公開直前の安定読取で現物と一致させる。

### 3.4 AtomRef

atom参照は次の3 keyだけを、この順で持つ。

1. `timelineSegmentId`
2. `sourceMediaId`
3. `atomId`

`atomId`単独では参照しない。これにより、別媒体で同じatom IDが存在する場合と、同じ元atomを別segment occurrenceで再利用する場合を区別する。

## 4. root exact schema

rootは次の8 keyだけを、この順で持つ。

1. `schemaVersion`
2. `packageId`
3. `sourceMedia`
4. `timelineComposition`
5. `captions`
6. `title`
7. `semanticObservations`
8. `provenance`

固定・導出規則:

```text
schemaVersion = zev-meaning-information-package-v001
packageId = <formal jobId> + "-meaning-information"
timelineId = packageId + "-timeline"
```

formal jobIdは`FormalId`であり、上式の導出後IDも`FormalId`でなければ開始前に拒否する。結果を見てIDを動かさない。

## 5. `sourceMedia`

1件以上999,999件以下のdense array。各要素は次の6 keyだけを持つ。

1. `sourceMediaId`
2. `ordinal`
3. `sourceRef`
4. `mediaBinding`
5. `sourceIdentityBinding`
6. `retainedSourceAtomsBinding`

`sourceIdentityBinding`は§3.3のJSON binding。`retainedSourceAtomsBinding`は次の3 keyだけを、この順で持つ。

1. `sourceAtoms`
2. `generationManifest`
3. `validationReport`

3件は全て§3.3のJSON bindingで、同じretained-source-atoms attemptを指す。

規則:

- `sourceMediaId`は`source-media-000001`から1始まり6桁の連続採番。
- `ordinal`は1始まりの連続整数で、配列順と一致する。
- 配列順は`timelineComposition.segments`で各sourceが最初に現れる順。
- `sourceMediaId`と`sourceRef`は各々unique。全sourceはsegmentから1回以上参照される。
- `mediaBinding`は実行に使う元媒体のmedia binding。
- `sourceIdentityBinding.schemaVersion`は`presentation-real-data-source-identity-v001`または`presentation-material-source-identity-v001`の二値だけ。前者は第一素材、後者は第三素材で現存を確認した上流source identityであり、別schemaを受ける時は契約版を上げる。
- `sourceAtoms.schemaVersion`は`presentation-retained-source-atoms-v001`、`generationManifest.schemaVersion`は`presentation-retained-source-atoms-generation-manifest-v001`、`validationReport.schemaVersion`は`presentation-retained-source-atoms-validation-report-v001`。
- retained source atomsの3成果物は同じartifact ID・job・入力hash graphを指し、validation reportの全checkがpassedでなければ拒否する。
- source identityと`sourceAtoms`の`sourceRef`が本要素の`sourceRef`と完全一致すること。
- どちらのsource identity型でも、その`executionMedia`の`path / fileSha256`が本要素の`mediaBinding`と完全一致すること。schemaごとの別名読替えやsource URLからの推測を行わない。

現行retained source atomsがbase media来歴を含むことは、下書き期に残る上流依存である。新packageはそのbase media bindingやoutput frameを複写せず、atom本文・source時刻・区間対応だけを意味入力として使う。全面的な生成順の清書は2機能後のスケルトン再構築へ残す。

## 6. `timelineComposition`

exact 2 key:

1. `timelineId`
2. `segments`

`segments`は1件以上9,999件以下のdense array。各要素は次の5 keyだけを持つ。

1. `segmentId`
2. `ordinal`
3. `sourceMediaId`
4. `sourceStartMs`
5. `sourceEndMs`

規則:

- `segmentId`は`segment-0001`から1始まり4桁の連続採番。
- `ordinal`は1始まりの連続整数で、配列順と一致する。
- `sourceMediaId`は`sourceMedia`の一件を参照する。
- 元区間は整数msの半開区間`[sourceStartMs, sourceEndMs)`で、`0 <= start < end`。
- 配列順がZEVの決めた意味上の接続順である。
- 別source、source時刻の非単調順、同じ元区間の別segmentとしての再利用をschema上は表現できる。
- crop、transition、source/output frame、sample、速度、表示時刻補正を持たない。

意味packageが表現できる範囲と、暫定出力システムv001が描画できる範囲は分ける。出力側v001の対応subsetはcompanion契約で固定し、対応外は意味packageを壊さず構造化拒否する。

## 7. 字幕対象atom occurrenceの一意な導出

`captions`の欠落・重複を検査する正本列を`ExpectedAtomOccurrences`と呼ぶ。次の規則だけで導出する。

1. 各`sourceMedia`の`retainedSourceAtomsBinding` 3件を読み、generation manifestとvalidation reportのhash graphを照合する。全checkがpassedの場合だけ、束縛済み`sourceAtoms`から`selection.segments`と`rawSourceAtoms`を得る。
2. 各semantic segmentについて、同じsource mediaのselection segmentから`sourceStartMs / sourceEndMs`が完全一致する一件を探す。0件または複数なら拒否する。
3. 同一sourceにおけるsemantic segmentの**重複を除いた区間集合**と、retained artifactのselection segment区間集合が完全一致しなければ、余剰・欠落として拒否する。
4. semantic segmentをtimeline順に走査し、対応selection segmentの`atomIds`を記載順に読む。
5. 各atomIdを`{timelineSegmentId, sourceMediaId, atomId}`へscopeして列へ追加する。同じ元区間を別segmentで再利用した場合は、別timelineSegmentIdを持つ別occurrenceになる。
6. 参照atomは`rawSourceAtoms`に一件だけ存在し、そのsourceRef、本文、startMs、endMsが正式artifactと一致しなければ拒否する。
7. source atomとsemantic segmentが正の長さで交差するのに完全内包されない場合は拒否する。丸め、切断、隣区間への付け替えをしない。

これにより、複数source、segment順の変更、明示的な区間再利用があっても、字幕対象atomの全量と順序を一意に検査できる。

## 8. `captions`

`ExpectedAtomOccurrences`が非空なら1件以上999,999件以下、空なら0件のdense array。各要素は次の9 keyだけを持つ。非空occurrenceから1,000,000件以上のcaptionが必要になる回答は受理しない。

1. `captionId`
2. `ordinal`
3. `timelineSegmentId`
4. `text`
5. `atomRefs`
6. `startAnchor`
7. `endAnchor`
8. `sourceStartMs`
9. `sourceEndMs`

anchorは`atomRef / edge`のexact 2 keyで、`atomRef`は§3.4、startは`edge: "start"`、endは`edge: "end"`だけを許す。

規則:

- `captionId`は`caption-000001`から1始まり6桁の連続採番。
- `ordinal`は1始まりの連続整数で、配列順と一致する。
- `atomRefs`は同一timeline segment内の`ExpectedAtomOccurrences`の連続した非空slice。
- 全captionの`atomRefs`をcaption順に平坦化した列は、`ExpectedAtomOccurrences`とobject単位・順序込みで完全一致する。
- したがって欠落、重複、順序変更、segment横断captionを許さない。
- `text`は参照atomの元本文を順にbyte連結した非空文字列で、CR/LFを含まない。表示行ではなく一つの意味まとまり全文である。
- start/end anchorは先頭・末尾AtomRefと一致する。
- source時刻は先頭atomのstartMs・末尾atomのendMsと一致する整数ms半開区間。
- source atom同士の時刻重なりは観測値として保存する。出力側が時刻を黙って変更する理由にはしない。

## 9. `title`、`semanticObservations`、`provenance`

### 9.1 `title`

exact 2 key:

1. `text`
2. `inputMode`

対応は次の二通りだけ。

- `text == ""`なら`inputMode == "none"`。
- `text`が非空かつCR/LFなしなら`inputMode == "human"`。

非空文字列はformal job固定時に人間が入力した値そのものとし、theme titleや候補名を自動投入しない。titleごとのDECISIONS追記や専用承認台帳は作らず、通常の実行前下書きの確認へ含める。将来自動生成を使う場合は`inputMode`を増やす契約改訂を行う。

### 9.2 `semanticObservations`

v001では**空のdense arrayだけ**を許す。`null`、placeholder object、自由payloadを許さない。

これは将来G4〜G7意味観測を置く位置を固定する欄である。最初の非空観測を生成する前に、typed union、対象参照、由来を版付きv002で固定する。

### 9.3 `provenance`

exact 3 key:

1. `formalJobBinding`
2. `timelineCompositionBinding`
3. `semanticSelectionValidationBinding`

3件とも§3.3のJSON binding。

- `formalJobBinding.schemaVersion`は新規生成用`zev-meaning-information-package-job-v001`。binding先のjob ID、package ID、title全文・inputMode、下記2 binding、正式出力pathが本packageと完全一致すること。これにより、人間入力titleとpackage IDの判断元をfile SHAで追跡する。
- `timelineCompositionBinding.schemaVersion`は新規生成用`zev-timeline-composition-decision-v001`。binding先はsource media列とsegment列だけを所有し、本packageの`sourceMedia / timelineComposition`と完全一致すること。B6後にしか分からないcaption数をこの成果物へ要求しない。
- `semanticSelectionValidationBinding.schemaVersion`は新規B1の`presentation-caption-meaning-boundary-validation-report-v001`。binding先はB3入力、B6生回答、meaning group列、caption数、atom occurrence列の検査結果を所有し、本packageの`captions`投影と完全一致すること。timeline decisionのsource/segment判断を再所有しない。
- source identityとatom来歴は`sourceMedia`内bindingを正本とし、ここへ重複掲載しない。

上記3成果物のfull exact schema、checks、違反code、正式pathは、次の完全実装設計で一件表化する。本境界設計ではpackage側のbinding型と照合projectionまでを固定し、未定義のまま実装へ進むことは許さない。

## 10. 表示情報混入の禁止

package全体を再帰走査し、次のkeyが一件でもあれば拒否する。

```text
lines
lineOrdinal
displayPage
logicalWidth
maxLogicalWidthPerLine
maxLinesPerPage
characterWidthRule
format
screenLayoutId
presetId
visualStateId
crop
cropDecision
viewports
fontSizePx
fontFamily
safeAreaPx
position
transition
audioPolicy
```

字幕、title等の文字列値に同じ語が現れることは拒否理由にしない。JSON keyとして出現した場合だけ違反とする。

## 11. B3・B5/B6・B1の新契約

Geminiは残すが、仕事を意味境界選択だけへ狭める。

### 11.1 B3入力

各containerは機械側で`containerId / sourceMediaId / timelineSegmentId / boundaryCandidates`へ束縛する。preset、format、幅、最大行数、logicalWidth、cropをモデル可視入力から除く。本文・atom・時刻は候補として提示するが、回答で再申告させない。

### 11.2 B6生回答

completeは次のexact unionとする。

```json
{
  "status": "complete",
  "containers": [
    {
      "containerId": "segmenter-container-000001",
      "meaningGroups": [
        {
          "meaningGroupEndBoundaryCandidateId": "segmenter-boundary-000005"
        }
      ]
    }
  ]
}
```

abstainedは`{"status":"abstained"}`だけ。理由、score、本文、時刻、lines、幅等の追加keyを許さない。

受理規則:

1. 全入力containerを入力順に一度ずつ返す。
2. 各`meaningGroups`は非空。
3. 終端IDは当該containerの既知候補だけ。
4. 終端位置は厳密増加し、重複・逆順を許さない。
5. 最後のgroup終端はcontainer最後の候補と一致する。
6. 隣接終端間を機械展開した候補列がcontainer全候補を一度ずつ被覆する。
7. container間を含む全展開atom occurrenceが、B3入力の対象列と完全一致する。

### 11.3 B1とpackage builder

B1はschema、container対応、候補実在、単調性、全量被覆だけを受け入れ判定する。本文、atom参照、anchor、source時刻、caption IDは機械がB3正式入力から復元する。

B1は行幅、行数、preset、crop、formatを検査しない。package builderは合格済み意味groupを§7〜8のcaptionへ変換する。同一入力と同一合格回答から同一package byteが得られなければ停止する。

現行回答の`lineEndBoundaryCandidateIds`末尾だけを取る変換は作らない。旧回答を新契約へ読み替える後方互換になるためである。

### 11.4 B5/B6の実行・費用への影響

- 意味の切れ目を選ぶGemini判断自体はZEV側に残る。画面行の切れ目、幅、format、preset、cropはrequestにもresponseにも入れない。
- B3入力byteとB6回答schemaが変わるため、既存B5 request SHA、countTokens値、費用見積り、B6生回答は新経路へ流用できない。
- 完全実装後の初回実走前に、新requestをB5で固定してcountTokensを再計測し、承認済み支出上限の範囲内かを通信前に検査する。現時点ではtoken差や費用差を独自係数で推定しない。
- model、tier省略、secret非保存、1回実行、再試行0、生応答先行保存、無改変受入のtransport規律は維持する。
- 本設計ではrequest生成、countTokens、B6通信を一件も行わない。

## 12. 既存3本と適用方式

採用案は**新規生成だけを新契約へ切り替えるforward-only方式**とする。

- candidate 13横型、candidate 59横型、candidate 59縦型の正式成果物とstable tagはbyte不変で保持する。
- 旧B3〜B4経路は安定点再現用の下書き実績として凍結する。
- 新jobは新schemaだけを受理する。
- 旧schema受理、旧→新変換、fallback、旧成果物の再包装を作らない。
- 新経路が横型・縦型で各1本成立した後、旧入口を新規jobの選択肢から外す。
- 旧コードの物理削除とdirectory清書は、2機能後のスケルトン再構築で行う。

## 13. 検査と停止

意味packageの機械検査:

1. exact schema、key順、数値token、正式byte。
2. 全bindingの実byte SHA・canonical SHAと、formal job／timeline decision／semantic validationへの所有分離。
3. source media、segment、source atom artifactの参照閉包。
4. `ExpectedAtomOccurrences`導出の一意性。
5. caption atomRefsの全量bijection、連続slice、segment内包。
6. caption本文、anchor、source時刻のbyte・値不変。
7. titleの空／非空と`inputMode`対応。
8. `semanticObservations == []`。
9. 表示情報keyの混入0。
10. 同一入力から同一package byte。
11. 既存3本のtag tree SHA前後不変。

契約違反は終了1、I/O・実行環境・報告不能は終了2、正常生成だけ終了0。終了1を部分成功へ読み替えない。

## 14. 人間作業

- 今回の設計認定: 1判断。
- 実装・機械検査: 0件。
- 初回の新経路確認: 横型1本と縦型1本の通常完成確認へ統合し、2判断。作業時間は各動画の再生尺＋回答操作30秒以内で、素材決定時に再申告する。
- 既存3本の再視聴・再認定: 0件。
- 非空titleを初めて使う時: 実行前下書きへの短い文字入力1件。確認セッションは完成確認へ統合する。

## 15. 事実・設計判断・未確認

事実:

- 現行B5/B6回答は意味group終端と表示行末を同じ配列で返す。
- candidate 59縦型は30意味groupを51表示行へしている。
- 現行retained source atomsはatom本文・時刻・segment対応を機械検査済みで持つ。
- 既存横型2本・縦型1本はstable tagで保持されている。

設計判断:

- AtomRefをsource mediaとsegment occurrenceでscopeすることで、複数sourceと明示再利用を一意に扱う。
- 新規生成だけを新入口へ切り替え、旧schemaを変換しない。
- titleごとの専用承認記録を増やさず、通常の実行前下書きへ含める。

未確認:

- 新しい意味境界だけを返すB5/B6の実回答品質。
- G4〜G7の非空観測schema。
- AI生成titleの由来契約。
- 複数source・非単調segment順を受ける出力システム。

## 16. 実装契約完全性チェック

| 項目 | 判定 | 根拠 |
|---|---|---|
| 最終packageのexact schema・値 | closed | §3〜11 |
| atom全量・複数source scope | closed | §7〜8 |
| B5/B6 exact union | closed | §11 |
| 新規provenance入力3成果物のfull schema | deferred | §9.3。次の完全実装設計でchecks・code・pathまで固定 |
| 表示情報の排除 | closed | §10 |
| title空／人間入力 | closed | §9.1 |
| G4〜G7 v001 | closed | 空arrayだけ |
| 既存3本との関係 | closed | §12 |
| 観測データ取得可能性 | observed | 現行source identity、retained atoms、boundary evidenceを読取確認 |
| 数値区分 | closed | 意味側は整数msだけ。frame/sample/幾何値を持たない |
| 承認済み文書hash | passed | companion契約§14の照合表 |
| 新artifactの実装path・file SHA | deferred | 次の完全実装設計で一件表化。未固定のまま実装承認へ進まない |
| 検査ID・違反code・CLI job | deferred | 次の完全実装設計で固定。今回の承認範囲外 |

本チェックの`deferred`は実装者判断へ委ねる意味ではない。今回が境界契約設計までであるため、次段の完全実装設計を必須停止点として残す。

## 17. 今回の停止点と承認依頼

本書は設計起草である。schema、runner、B5/B6 request、API通信、正式package、表示計画、描画は作らない。

承認を求める事項:

1. exact schemaとAtomRefによる全量閉包。
2. v001で`semanticObservations`を空に固定すること。
3. B5/B6を意味終端だけへ非互換改訂すること。
4. 新規生成専用、既存3本凍結、変換・fallbackなしの適用方式。
