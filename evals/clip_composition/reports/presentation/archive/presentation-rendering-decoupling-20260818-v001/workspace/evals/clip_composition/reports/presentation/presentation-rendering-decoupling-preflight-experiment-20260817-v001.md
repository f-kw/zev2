# レンダリング疎結合化 着工前実験：注文書の手動抽出と復元可能性の机上確認 v001

- 実施日: 2026-08-17
- 種別: 読み取り専用の机上確認（本書だけを新規作成）
- 目的: 表示内容・表示frame・対象と合格済みstyle profile IDだけを持つ注文書から、動画出力側が現行の描画入力をどこまで復元できるかを確かめる。
- 結論: 注文書は、表示内容・cue終端・表示frame・意味上の対象・style profileの選択を欠落なく表現できた。一方、元の行分割を一意に復元する規則と、媒体・canvas・crop等を束縛する独立受領書が現行台帳にはないため、元のrender plan v003全体を注文書と既存台帳だけから完全復元することはできない。注文書へ描画値を戻すのではなく、出力側の決定的な行分割規則と独立受領書の契約を閉じる必要がある。

## 1. 使用した正式成果物

### 1.1 正本としたrender plan

- case: voice-013 / horizontal-formal
- path: `evals/clip_composition/outputs/presentation/zevo-caption-quality-v002-test/f-gate-attempt-0011/voice-013/horizontal-formal/render-plan-v003.json`
- SHA-256: `c7eb5d279ea118f77c50b4b4d41e925dbab298f8302eb524b555c64ad9f0f773`
- schema: `presentation-output-render-plan-v003`
- plan ID: `zcq-caption-quality-proof-f-gate-attempt-0009-voice-013-render-v003`

調査資料§1.1に記録されたSHA-256と現物が一致したため、このfileを実験対象とした。

### 1.2 注文書の参照元

| 役割 | path | file SHA-256 | canonical SHA-256 |
|---|---|---|---|
| 意味情報package | `evals/clip_composition/outputs/presentation/a-v002/meaning-information-packages/a-v002-proof-0b0d371a67d39824cb47c008-meaning-v001/zev-meaning-information-package-v002.json` | `40e3c5811ad77c420a3e3c996a4fb65588f1bac611764bdb31275bf1b7ab1422` | `94197d658cbb08b2782d824b346e7737e5d60b1767dc751864b3c15536eb318f` |
| 採用元時刻と出力frameのtimeline | `evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260810-v008/layer1-v3-nE_bNeBNp4E_multiblock_material_v001-2-voice-013/base-media-timeline-v002.json` | `c72550e162531a04c791248638b7d52d3a33ce1ea931bc8a5347e4f0b01f09bf` | `5d4e3249d0108b5895e963f4e339d4a545fd4d125b7934228e32bee4637605f6` |
| AI選択結果 | `evals/clip_composition/reports/presentation/test-runs/20260814-zevo-caption-quality-v002-f-gate-attempt-0011/fixtures/selection-v001.json` | `725daed83828a08396fd4ae524d44b3d03029e28809bed12bcb2c002062eb980` | `2a1014d1743d274495527c221557d3707e6c14d53a38bfdfa3680a3ecb6d7a5e` |
| style profile台帳 | `evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json` | `8e9b0a039c8a4c9edf2c66b1df343c1d892d4688ebc4886a9af322bd44a6e5a8` | 対象外 |
| renderer trust台帳 | `evals/clip_composition/registries/presentation/presentation-renderer-trust-v001/trust.json` | `04ec4971d078413b68c19869b0285130ec553f14601f45d27125738a7498eddc` | 対象外 |

## 2. 手で書き起こした注文書下書き

これは契約ではなく、調査資料§2.2のschema骨格と2026-08-17裁定①〜③を当該caseへ手作業で当てはめた机上用JSONである。`selectionOrHumanDecision`は選択の来歴を示す参照であり、そこに含まれる旧行末情報を注文として利用してよいという意味ではない。

```json
{
  "schemaVersion": "presentation-instruction-artifact-v001-draft",
  "artifactId": "preflight-voice-013-horizontal-instruction-v001",
  "sourceBindings": {
    "meaningInformationPackage": {
      "path": "evals/clip_composition/outputs/presentation/a-v002/meaning-information-packages/a-v002-proof-0b0d371a67d39824cb47c008-meaning-v001/zev-meaning-information-package-v002.json",
      "fileSha256": "40e3c5811ad77c420a3e3c996a4fb65588f1bac611764bdb31275bf1b7ab1422",
      "canonicalSha256": "94197d658cbb08b2782d824b346e7737e5d60b1767dc751864b3c15536eb318f"
    },
    "timeline": {
      "path": "evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-runs/a-v002-layer1-v3-option-b-proof-20260810-v008/layer1-v3-nE_bNeBNp4E_multiblock_material_v001-2-voice-013/base-media-timeline-v002.json",
      "fileSha256": "c72550e162531a04c791248638b7d52d3a33ce1ea931bc8a5347e4f0b01f09bf",
      "canonicalSha256": "5d4e3249d0108b5895e963f4e339d4a545fd4d125b7934228e32bee4637605f6"
    },
    "selectionOrHumanDecision": {
      "path": "evals/clip_composition/reports/presentation/test-runs/20260814-zevo-caption-quality-v002-f-gate-attempt-0011/fixtures/selection-v001.json",
      "fileSha256": "725daed83828a08396fd4ae524d44b3d03029e28809bed12bcb2c002062eb980",
      "canonicalSha256": "2a1014d1743d274495527c221557d3707e6c14d53a38bfdfa3680a3ecb6d7a5e"
    }
  },
  "outputIntent": {
    "format": "normal-landscape",
    "styleProfileId": "normal-landscape-readable-pop-v001"
  },
  "instructions": [
    {
      "instructionId": "instruction-caption-voice-013-cue-000001",
      "semanticKind": "speech-caption",
      "content": {
        "text": "マジ殺してやる!見ろ!バカが!なぁ!マリン疑ってんじゃねぇ!マリンが"
      },
      "outputTime": {
        "startFrame": 0,
        "endFrameExclusive": 179
      },
      "targetProvenance": {
        "displayCaptionId": "display-caption-000001",
        "inputCaptionId": "input-caption-000001",
        "semanticCaptionId": "caption-000001",
        "cueId": "cue-000001-000001",
        "cueEndBoundaryId": "display-boundary-000001-000034",
        "atomOccurrenceIds": [
          "atom-occurrence-000001",
          "atom-occurrence-000002",
          "atom-occurrence-000003",
          "atom-occurrence-000004",
          "atom-occurrence-000005",
          "atom-occurrence-000006",
          "atom-occurrence-000007",
          "atom-occurrence-000008",
          "atom-occurrence-000009",
          "atom-occurrence-000010",
          "atom-occurrence-000011",
          "atom-occurrence-000012",
          "atom-occurrence-000013",
          "atom-occurrence-000014",
          "atom-occurrence-000015",
          "atom-occurrence-000016",
          "atom-occurrence-000017",
          "atom-occurrence-000018",
          "atom-occurrence-000019",
          "atom-occurrence-000020",
          "atom-occurrence-000021",
          "atom-occurrence-000022",
          "atom-occurrence-000023",
          "atom-occurrence-000024",
          "atom-occurrence-000025",
          "atom-occurrence-000026",
          "atom-occurrence-000027",
          "atom-occurrence-000028",
          "atom-occurrence-000029",
          "atom-occurrence-000030",
          "atom-occurrence-000031",
          "atom-occurrence-000032",
          "atom-occurrence-000033",
          "atom-occurrence-000034"
        ]
      },
      "materialRefs": []
    },
    {
      "instructionId": "instruction-caption-voice-013-cue-000002",
      "semanticKind": "speech-caption",
      "content": {
        "text": "好きなんじゃなかったんか!てで!何生き残ってんだよぉ!生き残んなお前"
      },
      "outputTime": {
        "startFrame": 179,
        "endFrameExclusive": 402
      },
      "targetProvenance": {
        "displayCaptionId": "display-caption-000001",
        "inputCaptionId": "input-caption-000001",
        "semanticCaptionId": "caption-000001",
        "cueId": "cue-000001-000002",
        "cueEndBoundaryId": "display-boundary-000001-000068",
        "atomOccurrenceIds": [
          "atom-occurrence-000035",
          "atom-occurrence-000036",
          "atom-occurrence-000037",
          "atom-occurrence-000038",
          "atom-occurrence-000039",
          "atom-occurrence-000040",
          "atom-occurrence-000041",
          "atom-occurrence-000042",
          "atom-occurrence-000043",
          "atom-occurrence-000044",
          "atom-occurrence-000045",
          "atom-occurrence-000046",
          "atom-occurrence-000047",
          "atom-occurrence-000048",
          "atom-occurrence-000049",
          "atom-occurrence-000050",
          "atom-occurrence-000051",
          "atom-occurrence-000052",
          "atom-occurrence-000053",
          "atom-occurrence-000054",
          "atom-occurrence-000055",
          "atom-occurrence-000056",
          "atom-occurrence-000057",
          "atom-occurrence-000058",
          "atom-occurrence-000059",
          "atom-occurrence-000060",
          "atom-occurrence-000061",
          "atom-occurrence-000062",
          "atom-occurrence-000063",
          "atom-occurrence-000064",
          "atom-occurrence-000065",
          "atom-occurrence-000066",
          "atom-occurrence-000067",
          "atom-occurrence-000068"
        ]
      },
      "materialRefs": []
    },
    {
      "instructionId": "instruction-caption-voice-013-cue-000003",
      "semanticKind": "speech-caption",
      "content": {
        "text": "はぁ!デスカード、デビルカード来ないんだけど来るのかないつか来ない"
      },
      "outputTime": {
        "startFrame": 402,
        "endFrameExclusive": 755
      },
      "targetProvenance": {
        "displayCaptionId": "display-caption-000001",
        "inputCaptionId": "input-caption-000001",
        "semanticCaptionId": "caption-000001",
        "cueId": "cue-000001-000003",
        "cueEndBoundaryId": "display-boundary-000001-000101",
        "atomOccurrenceIds": [
          "atom-occurrence-000069",
          "atom-occurrence-000070",
          "atom-occurrence-000071",
          "atom-occurrence-000072",
          "atom-occurrence-000073",
          "atom-occurrence-000074",
          "atom-occurrence-000075",
          "atom-occurrence-000076",
          "atom-occurrence-000077",
          "atom-occurrence-000078",
          "atom-occurrence-000079",
          "atom-occurrence-000080",
          "atom-occurrence-000081",
          "atom-occurrence-000082",
          "atom-occurrence-000083",
          "atom-occurrence-000084",
          "atom-occurrence-000085",
          "atom-occurrence-000086",
          "atom-occurrence-000087",
          "atom-occurrence-000088",
          "atom-occurrence-000089",
          "atom-occurrence-000090",
          "atom-occurrence-000091",
          "atom-occurrence-000092",
          "atom-occurrence-000093",
          "atom-occurrence-000094",
          "atom-occurrence-000095",
          "atom-occurrence-000096",
          "atom-occurrence-000097",
          "atom-occurrence-000098",
          "atom-occurrence-000099",
          "atom-occurrence-000100",
          "atom-occurrence-000101"
        ]
      },
      "materialRefs": []
    }
  ],
  "provenance": {
    "extractionMode": "manual-preflight-only",
    "sourceRenderPlan": {
      "path": "evals/clip_composition/outputs/presentation/zevo-caption-quality-v002-test/f-gate-attempt-0011/voice-013/horizontal-formal/render-plan-v003.json",
      "fileSha256": "c7eb5d279ea118f77c50b4b4d41e925dbab298f8302eb524b555c64ad9f0f773"
    }
  }
}
```

## 3. 検査A：注文書の境界

### 3.1 禁止情報の混入

JSON下書き本体を対象に確認した。

| 禁止する描画情報 | 下書き内 | 判定 |
|---|---:|---|
| 行の分け方・行末・行ID | 0件 | 合格 |
| 書体・文字サイズ | 0件 | 合格 |
| 文字色 | 0件 | 合格 |
| 縁 | 0件 | 合格 |
| 光彩 | 0件 | 合格 |
| 背景 | 0件 | 合格 |
| 座標・offset | 0件 | 合格 |
| safe area | 0件 | 合格 |
| crop | 0件 | 合格 |
| fade・transition・animation | 0件 | 合格 |

styleの生値は入れず、合格済みprofileのIDだけを持たせた。cueの終了位置は3件とも注文書へ明記し、時刻はmsではなく出力frameで記録した。

### 3.2 注文として必要な情報

| 必要な意味 | 結果 | 根拠 |
|---|---|---|
| 何を表示するか | 充足 | 3 cueの本文を保持 |
| いつ表示するか | 充足 | 0–179、179–402、402–755 frame |
| どこで字幕を切り替えるか | 充足 | cue終端boundary 34、68、101 |
| 何を対象にした指示か | 充足 | caption、cue、atom occurrenceの来歴を保持 |
| どの合格済み見せ方を使うか | 充足 | `normal-landscape-readable-pop-v001` |
| 外部materialの指定 | 充足 | この3 cueには追加materialがなく空集合 |

注文の意味を表すために埋められないfieldは0件だった。

### 3.3 境界上の注意

現行の`selection-v001.json`は、cue終端だけでなく旧来の行末選択も同じ成果物に含む。下書きの`selectionOrHumanDecision`は来歴参照としてこれを束縛しているため、出力側が参照全体を読めば、禁止した行分割を間接的に取り込めてしまう。注文書JSONそのものへの混入は0件だが、正式化時には次のどちらかが必要である。

1. cue終端だけを公開する版付きprojectionを正本にする。
2. 受入処理で旧行末fieldを利用不能と証明する。

この点を閉じずに「行分割の所有を出力側へ移した」と主張してはならない。

## 4. 検査B：既存台帳からの復元

注文書、preset台帳、renderer trust台帳、文字幅規則、意味情報package、timelineだけを使い、元render planの各入力を人手で逆引きした。旧selection内の行末を読む行為は、検証対象の疎結合境界を迂回するため復元根拠に数えていない。

| 元render planの情報 | 復元 | 根拠・不足 |
|---|---|---|
| cue本文 | 可能 | 注文書に全文がある |
| cue終端 | 可能 | 注文書に3 boundary IDがある |
| 出力frame | 可能 | 注文書に3区間がある |
| 対象atomとcaption来歴 | 可能 | 注文書の対象来歴と意味情報packageで照合できる |
| 意味上の表示種別 | 可能 | `speech-caption`がある |
| profile選択 | 可能 | 注文書のstyle profile IDがpreset台帳の1件へ一致 |
| visual state選択 | 可能 | preset台帳で`speech-caption`から`caption-core-v001`へ一意に写る |
| 書体・色・縁・光彩・背景 | 可能 | profileとrenderer trust台帳から逆引きできる。注文書へ生値を戻す必要はない |
| 元時刻と出力frameの対応 | 可能 | atom来歴、意味情報package、timelineから再計算できる |
| 元と同じ行分割 | **不可能** | 1 cue内に幅上限を満たす複数候補があるが、元の釣り合った2行を一意に選ぶ版付き規則が既存profileにない |
| 元の行ID・行ごとのatom集合・行幅 | **不可能** | 行分割が決まらないため一意に導出できない |
| 媒体・canvasの正式な組合せ | **不可能** | 注文書とstyle台帳だけには、crop適用済み媒体・canvas・renderer実体を一組にする受領書がない |
| 配置の根拠 | **条件付き** | profileの配置方針とtrust台帳の計算規則は読めるが、適用対象canvasと媒体を独立受領書で束縛する必要がある |
| crop・scene切替・audioの実行条件 | **不可能** | 現行ではoutput request側の値で、注文書のprofile IDだけからは確定しない |
| renderer実体と依存台帳の採用版 | **不可能** | 独立受領書で束縛する予定だが、本実験時点では成果物が存在しない |

### 4.1 行分割が一意にならない具体例

元render planの3 cueは、それぞれ論理幅が31/32、32/33、33/32となる2行へ分かれている。しかし既存profileが示すのは一行上限と最大行数であり、「上限内の候補が複数ある時にどの境界を採るか」という版付きの決定規則ではない。単純に上限まで詰める方法と、二行の幅を釣り合わせる方法では異なる結果になり得る。したがって、元の行末boundary 17、51、85を、禁止fieldを読まずに一意復元したとはいえない。

### 4.2 配置を閉じる受領書

調査資料の独立受領書案どおり、少なくとも次を一組として束縛しないと、配置の根拠は再現可能な正式入力にならない。

- 注文書
- crop適用済みの基礎映像
- canvasと出力形式
- style profile台帳
- material台帳
- 書体台帳
- renderer trust台帳
- renderer実装

これは注文書へ座標等を追加する理由ではなく、動画出力側が実際に受け取った組合せを独立成果物で証明する理由である。

## 5. 復元不能情報の全件一覧

1. 元render planの3つの行末boundary（17、51、85）を一意に決める版付き規則。
2. その行末に従属する行ID、各行のatom集合、各行本文、各行の論理幅。
3. 注文書へ適用するcrop済み基礎映像とcanvasの正式な組合せ。
4. profile外に残るcrop、scene切替、audio条件の所有先と採用値。
5. その描画に使ったrenderer実体と依存台帳の採用版を証明する受領情報。
6. `selectionOrHumanDecision`から旧行末情報を遮断する正式な参照境界。

0件ではない。1〜2は行分割の所有移管、3〜5は独立受領書、6は旧selectionの過剰な公開面という別の論点である。

## 6. 所見

### 6.1 注文書に足すべき項目

このcaseの意味上の注文については、現下書きへ生の描画値を追加する必要はない。特に、元の行末、書体、色、座標、crop、fadeを注文書へ追加すると、疎結合化の目的を壊す。

正式schema化に際して検討できる追加は、描画値ではなく次の識別・来歴情報に限る。

- `selectionOrHumanDecision`をcue終端だけのprojectionへ差し替えるための正式binding。
- 将来、profileだけで出力側の決定規則を一意に選べない場合の、出力側所有の版付きlayout policy ID。ただしprofileまたは独立受領書から一意に導出できるなら、注文書へ重複保持しない。

### 6.2 kawafmm裁定が必要な項目

1. **行分割の再現性**: 元成果物と同じ行分割のbyte同一を要求するか、出力側の新しい決定的規則による再配置を許容するか。前者なら元の選択を注文書へ戻すのではなく、同じ選択を再現する版付き規則を出力側へ用意する必要がある。
2. **旧selectionの公開境界**: cue終端だけの新projectionを作るか、既存selectionを束縛したまま行末fieldの不使用を受入検査で証明するか。
3. **受領書の閉包**: 媒体・canvas・profile・台帳・renderer実装を独立受領書の必須bindingとする範囲。
4. **profile外の実行条件**: crop、scene切替、audio、screen layoutの既定をprofileの意味へ含めるか、renderer job/受領書が所有するか。

### 6.3 実験の判定

- 注文書抽出: **成立**。表示内容・cue終端・frame・対象・profile IDを、禁止する描画値なしで記録できた。
- 現行描画入力の完全復元: **未成立**。行分割規則と独立受領書が不足する。
- 前提崩壊: **なし**。不足は注文書へ描画値を戻さず、出力側の契約を閉じることで解ける範囲にある。

## 7. 事実・推測・未確認

### 事実

- 指定SHAのvoice-013横型render plan v003が現物に存在した。
- 下書きは3 cueの本文、cue終端、frame、対象来歴、style profile IDを保持し、禁止する描画情報を直接保持しない。
- preset台帳は`normal-landscape-readable-pop-v001`と`speech-caption`からvisual stateを一意に選べる。
- 現行selectionにはcue終端と行末の両方が含まれる。
- 現行profileには、複数の有効な行末候補から元の行末を一意に選ぶ版付き規則がない。
- 独立受領書は本実験時点で設計考慮に留まり、正式成果物として存在しない。

### 推測・設計上の所見

- cue終端だけのprojectionを設ける方が、旧selection全体を渡して不使用を証明する方式より、所有境界を監査しやすい。
- 行分割の規則は注文書ではなくstyle profileまたはrenderer側の版付きpolicyとして所有する方が、確定済み分業と整合する。

### 未確認

- 新しい出力側規則が元render planと同じ3つの行末を選ぶべきか、それとも新規則による視覚差を許容するか。
- crop、scene切替、audio、screen layoutをprofileとrenderer jobのどちらが最終所有するか。
- 独立受領書のexact schema、公開時点、再読範囲。

## 8. 外部作用

- API通信: 0回
- 費用: US$0
- 実装変更: 0件
- 既存file変更: 0件
- commit: 0件
- tag: 0件
