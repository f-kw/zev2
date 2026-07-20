# 通常動画版 G1〜G3機械検査 実装設計 v001

日付: 2026-07-20

状態: **人間・相談役承認済み。設計どおりG1〜G3検査器を実装し、24/24合成テスト完了。実データ実走、比較動画、LLM呼び出しは未承認。**

## 0. 目的と今回の範囲

人間認定済みの通常動画演出文法第2版のうち、次の3項目だけを決定的に検査する。

- G1: 表示対象の発話に、元発話から追跡可能なテロップがある。
- G2: テロップの表示切替と改行が明示され、対象文字の欠落・重複・逆順がない。
- G3: 表示時刻が参照した時刻付き文字単位から再計算でき、表示順と重なり契約を壊していない。

今回はG4〜G7の意味検出、styleの選択、演出生成、レンダリング、比較動画、人間ペア比較を扱わない。ショート文法の蒸留後に、通常動画固有部分と共通部分を再検討する。

## 1. 現行資産をそのまま検査入力にできない理由

### 1.1 現行テロップ計画の不足

現行`EditPlanArtifact.telopPlan`が持つのは、参照する発話ID、全文、役割だけである。次が無いため、G2とG3を検査できない。

- どこで表示を切り替えたか
- 同じ表示内のどこで改行したか
- 表示開始・終了がどの時刻付き文字に結び付くか
- 削除した文字が何か
- 同時表示を意図したか

現行形式を推測で補完する互換処理は作らない。G1〜G3用の新しい評価専用契約だけを受け付け、現行形式は入力形式不成立として止める。

### 1.2 「単語時刻」の実態

保存済み`word-timestamps.json`は、少なくとも日本語素材では1文字に近い粒度の要素を多く含む。したがって、要素境界で切れていることは検査できても、言語学的な単語の途中でないことまでは証明できない。

初版では次を分離する。

- **機械で検査する**: 時刻付き最小単位の途中で切らない、欠落・重複・逆順がない、改行と表示切替が明示されている。
- **未検査として明記する**: 意味として読みやすい短さ、言語学的な単語境界、表示の小気味よさ。

時刻付き最小単位が文字相当の場合、G2を完全合格とは書かず、`部分検査`と記録する。未検査項目を独自の文字数や推測の分かち書きで埋めない。

## 2. 新しい評価専用入力契約

契約名は`presentation-caption-check-v001`とする。通常動画用の初版であり、旧`telopPlan`との後方互換は持たない。

### 2.1 入力全体

```json
{
  "schemaVersion": "presentation-caption-check-v001",
  "format": "normal-landscape",
  "source": {
    "atomGranularity": "character-timestamp",
    "atomProvenance": "保存済みSTT時刻データのパスと版",
    "atoms": [],
    "captionTargets": [],
    "allowedSimultaneousGroups": []
  },
  "captionPlan": {
    "cues": []
  }
}
```

`source`は検査対象のテロップ生成より先に固定する。テロップ生成側が、検査を通すために表示対象を減らしてはならない。

### 2.2 時刻付き最小単位

```json
{
  "atomId": "a-000001",
  "speechId": 12,
  "speaker": "SPEAKER_00",
  "text": "船",
  "startMs": 1200,
  "endMs": 1320
}
```

必須条件:

- `atomId`は入力内で一意。
- `text`は空でない。
- `startMs`と`endMs`は有限の整数で、`startMs < endMs`。
- 配列は元動画上の順序で並ぶ。同時刻の場合は保存元の順序を維持する。
- `speechId`は選択済み発話との対応を保持する。
- 話者が無い場合は省略できるが、話者なしの要素を同時表示例外へ使えない。

source atom同士の時刻重なりは、同時発話またはSTT時刻の揺れとして実在し得るため、入力全体を拒否しない。前atomの終了より次atomの開始が早く、交差長が正なら`SOURCE_ATOM_TIME_OVERLAP_RECORDED`として関係IDと交差長を記録する。境界が同時刻で接するだけなら重なりではない。一方、配列上で次atomの開始が前atomの開始より前へ戻る時刻逆転は、保存元順序を決定できないため`SOURCE_ATOM_TIME_ORDER_REVERSED`として入力不成立にする。重なり記録を同時表示許可へ自動転用しない。

### 2.3 表示対象

```json
{
  "targetId": "target-01",
  "requiredAtomIds": ["a-000001", "a-000002", "a-000003"],
  "allowedOmissionAtomIds": []
}
```

- `requiredAtomIds`は、上流で採用された発話群から独立に作る。
- `allowedOmissionAtomIds`は`requiredAtomIds`の部分集合とし、別工程で確定した削除結果だけを入れる。テロップ生成側は追加できない。
- 初版では層1が凍結中のため、通常は空配列とする。
- 削除の妥当性はG1〜G3で採点しない。ここでは、削除が別工程に由来し追跡可能かだけを見る。
- cueがちょうど1回参照すべき集合は、`requiredAtomIds`から`allowedOmissionAtomIds`を引いたものとする。
- `targetId`は一意とし、同じ要素を複数targetへ入れない。

### 2.4 テロップ表示単位

```json
{
  "cueId": "cue-01",
  "targetId": "target-01",
  "lines": [
    {
      "atomIds": ["a-000001", "a-000002"],
      "renderedText": "船長"
    },
    {
      "atomIds": ["a-000003"],
      "renderedText": "です"
    }
  ],
  "startAnchor": { "atomId": "a-000001", "edge": "start" },
  "endAnchor": { "atomId": "a-000003", "edge": "end" },
  "startMs": 1200,
  "endMs": 1680
}
```

- `cue`が表示切替の単位。
- `lines`が同じ表示内の改行。表示切替と改行を1つの改行文字へ畳み込まない。
- `renderedText`は、その行の`atomIds`が参照する文字列の厳密な連結と一致させる。空白除去・表記正規化・言い換えで一致させない。
- `startAnchor`はcue先頭の参照要素の開始、`endAnchor`はcue末尾の参照要素の終了を指す。
- `startMs`と`endMs`はanchorから厳密に再計算できなければならない。許容ミリ秒は作らない。

同時表示が必要な場合だけ、cueへ`simultaneousGroupId`を付ける。ただし、テロップ生成側の自己申告だけでは許可しない。`source.allowedSimultaneousGroups`へ上流が事前固定したgroupだけを参照でき、同一groupのcueは異なる既知話者を参照することを必須とする。G6が未実装の初版では許可groupを空にし、全ての重なりを拒否する。将来G6が作った固定入力を受け取っても、G3が行うのは明示契約と時刻の構造検査だけで、同時表示の意味的妥当性は採点しない。

将来の同時表示を受け取る事前契約は、次の形に固定する。

```json
{
  "simultaneousGroupId": "group-01",
  "targetIds": ["target-speaker-a", "target-speaker-b"]
}
```

- `simultaneousGroupId`は入力内で一意。
- `targetIds`は2件以上で、すべて`captionTargets`に実在し、重複しない。
- groupへ属する各targetが参照する全要素には、既知の`source.atoms[].speaker`が必要。
- group内のtarget同士は異なる話者でなければならない。
- cueは自分の`targetId`を含むgroupだけを参照できる。
- これは将来の受け口の定義であり、G6が未実装の現在の通常入力では`allowedSimultaneousGroups: []`を必須とする。

## 3. G1の機械検査

検査する事実:

1. 各`captionTarget`に1件以上のcueがある。
2. 全参照IDが`source.atoms`に実在する。
3. cueの`renderedText`が参照文字の厳密な連結と一致する。
4. 参照要素が元順序を逆転していない。
5. 許可されていない要素を表示対象外にしていない。
6. 表示対象外の要素を混ぜていない。

主な違反コード:

- `G1_TARGET_WITHOUT_CAPTION`
- `G1_UNKNOWN_ATOM_REFERENCE`
- `G1_TEXT_NOT_SOURCE_DERIVED`
- `G1_SOURCE_ORDER_REVERSED`
- `G1_UNDECLARED_OMISSION`
- `G1_ATOM_OUTSIDE_TARGET`

G1は内容の言い換え品質を評価しない。厳密一致しない文言は、良い言い換えであっても初版契約では不成立とする。削除型整文を導入する場合は、別工程で削除対象を固定してから契約を改訂する。

この厳密一致契約では、STT誤字修正、句読点付与、表記正規化を含む現実的な公開品質テロップもv001では不成立になる。実装都合で暗黙に緩和しない。将来の置換・挿入は削除型整文と同じく、別工程で対象と根拠を先に固定し、その後に契約を改訂する場合だけ許可する。

## 4. G2の機械検査

検査する事実:

1. cueとlineが空でない。
2. 1つの要素を複数のcueまたはlineから重複参照していない。
3. 必須要素がcue列全体でちょうど1回参照される。
4. cue内、line内、cue間の参照順が元順序と同じ。
5. 改行は`lines`、表示切替は`cues`として別々に表現される。
6. 時刻付き最小単位の途中を分割しない。

主な違反コード:

- `G2_EMPTY_CUE`
- `G2_EMPTY_LINE`
- `G2_DUPLICATE_ATOM`
- `G2_REQUIRED_ATOM_MISSING`
- `G2_ATOM_ORDER_REVERSED`
- `G2_BOUNDARY_REPRESENTATION_INVALID`

`atomGranularity`が`character-timestamp`の場合、次は`unverified`へ必ず出す。

- 言語学的な単語途中ではないか
- 意味が読める短いまとまりか
- 1画面の読みやすい情報量か

したがってG2の状態は`passed`ではなく`passed_with_declared_limit`とする。将来、出所の明確な語単位データが入った版でだけ完全検査へ昇格する。

## 5. G3の機械検査

検査する事実:

1. start anchorがcueの最初の参照要素を指す。
2. end anchorがcueの最後の参照要素を指す。
3. `startMs`と`endMs`がanchorの保存時刻と厳密一致する。
4. `startMs < endMs`。
5. 選択済み区間内の論理テロップ計画では、後の元発話を参照するcueが、先のcueより先に表示されない。
6. cue同士の交差長が正で、許可宣言が無い場合だけ重なり違反とする。前cueの`endMs`と次cueの`startMs`が同時刻で接する場合は違反にしない。
7. 同時表示例外は、上流が事前固定した同一`simultaneousGroupId`かつ異なる既知話者に限る。G6未実装中は許可groupを空にする。

主な違反コード:

- `G3_START_ANCHOR_NOT_FIRST_ATOM`
- `G3_END_ANCHOR_NOT_LAST_ATOM`
- `G3_START_TIME_NOT_ANCHORED`
- `G3_END_TIME_NOT_ANCHORED`
- `G3_INVALID_TIME_RANGE`
- `G3_CUE_ORDER_REVERSED`
- `G3_UNDECLARED_OVERLAP`
- `G3_INVALID_SIMULTANEOUS_GROUP`

小気味よさ、先出し、残し時間、読了時間はstyleと人間比較の領分であり、G3の機械合否へ独自閾値を足さない。

ルール5は選択済み区間内の論理テロップ計画だけに適用する。教師観測にある「強い発話を冒頭で先出しする」構成は発話より上の構成層であり、本契約の順序違反へ混ぜない。将来の構成層設計で、経緯を失ったままルール5を緩和しない。

本契約が検査する時刻は論理計画のanchor時刻であり、最終レンダリング時刻ではない。将来style層が先出し、残し、fade等で時刻を加工する場合は、論理計画からの宣言付き変換を別契約として定義する。無宣言の時刻加工でanchor追跡性を壊すことは禁止する。

## 6. 検査結果の形

出力は決定的なJSONとし、実行時刻を入れない。同じ入力から同じ順序・同じ内容を返す。

```json
{
  "checkerVersion": "presentation-caption-checker-v001",
  "inputSha256": "...",
  "overallStatus": "passed_with_declared_limit",
  "contract": {
    "status": "passed",
    "violations": [],
    "observations": []
  },
  "checks": {
    "G1": { "status": "passed", "violations": [], "unverified": [] },
    "G2": {
      "status": "passed_with_declared_limit",
      "violations": [],
      "unverified": [
        "linguistic_word_boundary",
        "semantic_chunk_readability",
        "on_screen_readability"
      ]
    },
    "G3": { "status": "passed", "violations": [], "unverified": [] }
  }
}
```

- 違反が1件でもあれば`failed`。
- 検査可能部分に違反が無くても未検査項目があれば`passed_with_declared_limit`。
- 違反は文法、コード、JSON上の場所、人間向け説明、関係IDを持つ。
- 件数を合成点へ変換しない。
- 同じ根本原因から複数違反が出ても隠さず、違反コード別件数を並べる。
- source atomの時刻重なりは`contract.observations`へ記録し、単独では`failed`にしない。時刻逆転、atomId重複、同一atomの複数target登録など、追跡性を壊すsource/target不正は`contract.violations`へ出し、全体を`failed`にする。

## 7. 実装ファイル案

人間承認後、`evals/clip_composition/`配下だけに次を作る。

- `presentation_caption_contract.mjs`: 純粋な検査関数。ファイルI/Oなし。
- `validate_presentation_caption_contract.mjs`: JSONを1件読み、検査結果を標準出力または指定先へ保存するCLI。
- `presentation_caption_contract.test.mjs`: Node標準テストだけを使う。
- `testdata/presentation-caption-contract-v001/`: 合成した最小入力。凍結fixture・expectedとは分離する。

外部ライブラリ、新規モデル、Web Gemini、renderer、runner、backend、clientは使わない。現行`telopPlan`変換器は作らない。

## 8. 実装時のテスト計画

最低限、次の独立ケースを固定する。G1〜G3だけでなく、前提となるsource・target層の不正も、意図した違反コードで検出する。

1. 単一話者、2回の表示切替、1回の改行を含む正常系。
2. 表示対象にcueが無い。
3. 入力に無いIDを参照する。
4. 元発話に無い文言を`renderedText`へ入れる。
5. 要素の欠落、重複、逆順をそれぞれ検出する。
6. 空cueと空lineをそれぞれ検出する。
7. anchorは正しいがms値を創作したケースを検出する。
8. cue順の逆転を検出する。
9. 前cue終了と次cue開始が同時刻の境界接触は許可し、交差長が正の無宣言重なりだけを検出する。
10. 合成入力では、上流固定group・異なる既知話者を満たす明示同時表示だけを構造上許可し、自己申告groupや同一話者を拒否する。実データ入力ではG6未実装中の許可groupは空とする。
11. 文字相当の時刻データではG2が`passed_with_declared_limit`になる。
12. 旧`telopPlan`を渡すとschema不成立で止まり、推測変換しない。
13. sourceの`atomId`重複を検出する。
14. source配列の時刻逆転を検出する。
15. source atomの正の時刻重なりは拒否せず記録し、境界接触は記録しない。
16. 同一atomを複数targetへ登録した入力を検出する。
17. cueが自target外のatomを参照した入力を検出する。
18. 同じ入力を2回検査し、JSONがバイト単位で一致する。

実装完了条件は、正常系を通すことではなく、上記の各違反を意図したコードで検出し、未検査範囲を完全合格と表示しないこととする。

## 9. 次段へのゲート

1. 本設計は相談役レビューを含めて人間承認済み。**完了**
2. G1〜G3検査器とsource・target層を含む合成テストだけを実装する。**完了**
3. 全テストと決定性検査の結果を報告する。**24/24 passで完了**
4. 検査器が動いた後に、G4〜G7正解候補の棚卸し設計を別途提示する。
5. その後も、演出生成側の接続・styleプリセット実装計画を別設計として提示する。

比較動画生成、LLM実走、G4〜G7検出実装、生成側実装は、各段の個別承認が出るまで開始しない。

## 10. 人間作業量

本設計を実装してよいかの判断 **1件・1セッション**は完了した。時間計測は行っていない。

G1〜G3コード作成・合成テストの人間作業は **0件・0分**。結果確認にも動画視聴や手入力を要求しない。
