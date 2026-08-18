# ④.5 レンダリング疎結合化 契約設計 v001

- 起草日: 2026-08-17
- 状態: **起草・未承認・実装前**
- 目的: 動画出力を別プログラムへ分け、表示内容と時刻を記した注文書を人間が中間成果物としてレビューできるようにする。字幕やタイトルの意味判断を変えず、行分割・見た目・媒体処理を動画出力プログラムの責務へ分離する。
- 入力正本:
  - `evals/clip_composition/reports/presentation/presentation-rendering-decoupling-feasibility-and-contract-materials-20260815-v001.md`
  - `evals/clip_composition/reports/presentation/presentation-rendering-decoupling-preflight-experiment-20260817-v001.md`（SHA-256 `7a2ab578a5e34a6df5cef33376966527e3d9225b8a0d257463ee1a78fadfee8e`）
  - `docs/ADVISOR_LEDGER.md` entry 019 / 026
- 本書の作用: 契約設計の提示だけ。実装、検査実行、API通信、費用支出、既存成果物変更、commit、tag、DECISIONS書込みは行わない。

## 0. 結論

注文書を、本文・cue終端・出力frame・意味対象・合格済みstyle profile IDだけに閉じる。旧selectionは注文書から参照せず、cue終端だけを取り出した新しいprojectionを介する。動画出力プログラムは、別のformal jobとして媒体・canvas・format・各台帳・実装を受け、描画前に独立受領書を公開する。

元成果物と同じ行分割を再現するため、出力側に二つの決定的な版付き規則を置く。

- 字幕: cue内のsource atom境界を候補にし、行数、最大行幅、幅差、境界順の順に一意選択する。
- タイトル: Unicode code point順に、各行へ入る最長prefixを採る現行方式を版付きで固定する。

現物から閉じた正本pathは**17件（新規11、既存変更6）**である。既存のpage/line plan、render plan、title compositor、共通描画core、台帳は変更しない。正式caption/title runnerから旧直結呼出しを外して使用禁止にし、物理削除は骨格清書へ送る。

## 1. 現物調査と不変境界

### 1.1 現行の直接接続

#### 字幕

`run_presentation_zevo_caption_quality_v002_proof_job_v001.ts`は、selectionからpage/line plan v003、render plan v003、common core planを同一process内で作り、そのまま共通描画coreへ渡す。line末、行本文、見た目、frame、媒体が描画直前のplanへ同居する。

#### タイトル

`run_presentation_output_title_job_v001.ts`は、title compositorで行分割済みdisplay planとcommon core planを作り、同一process内で共通描画coreへ渡す。

### 1.2 今回変更しない正本

| 現物 | SHA-256 | 理由 |
|---|---|---|
| `presentation_output_caption_cue_selection_v001.mjs` | `fbe7152f1a26837af51f26a4c673b2cddbc889370988b6e3c85dedb50d741cd6` | AI回答のstrict受入は変更しない |
| `presentation_output_page_line_planner_v003.mjs` | `f5f783f9a50c9657c74a9e6e3b7a8c82abc4ebf09a4704ba8797f0a96657a811` | 工事前byte oracleとして保持 |
| `presentation_output_render_plan_v003.mjs` | `5c16cf593aeb070a32e9bdb4936647a2a1a1becc6a17e276be33214dd69a03d6` | 工事前byte oracleとして保持 |
| `presentation_output_title_compositor_v001.mjs` | `26c2f3a5591b7f2ba465ff86d9e2875851ec25b97b38dca0ee0ee99d85731984` | 旧経路の証拠。物理削除は骨格清書 |
| `render_presentation_v002.mjs` | `c90dc00456ade415e46cf8c692c49f3d08ae0ab21186b10227cdb5676f445292` | 描画coreは再利用し、境界の外へ置く |
| 横型style profile台帳 | `8e9b0a039c8a4c9edf2c66b1df343c1d892d4688ebc4886a9af322bd44a6e5a8` | 合格済みprofileを変更しない |
| 横型material検査台帳 | `98213035bc6e395b090d7cff2639d4bf707fb838b7df50cb51bc60ab95d4758e` | 既存material閉包を利用 |
| renderer trust台帳 | `04ec4971d078413b68c19869b0285130ec553f14601f45d27125738a7498eddc` | 書体実体・配置規則・依存実体を利用 |
| title style台帳v004 | `27e58b9405d599a85c58c957725a992fc38db47b2a19170d724b4849fbe66634` | 人間合格済みtitle profileを変更しない |

注: title compositor SHAは現物実測値`26c2f3a...`を正とする。上表のpathは変更対象外であり、既存formal成果物とstable tagへ遡及しない。

### 1.3 本来の目的との照合

本工事の目的はmodule名の変更や別directoryへの移動ではない。次の境界をformal artifactとstable再読で実在させることである。

```text
表示判断側
  → cue終端projection
  → 注文書（人間レビュー可能）
  → 動画出力job
  → 独立受領書（描画開始前）
  → 出力側の行分割
  → 共通描画core
  → 動画・QC・application trace
```

注文書を保存しても、同じrunnerが注文書を無視して旧planを直接描画できるなら目的未達である。そのため移行完了時には、formal caption/title runnerのsourceと実行時capabilityの両方で旧直結呼出し0件を証明する。

## 2. 共通binding型

全schemaは、列挙したkey以外を拒否し、記載順もformal byteの順とする。JSONはUTF-8、先頭`{`、末尾LF一件、2 space indent、非有限数値・prototype差・疎配列を拒否する。

### 2.1 `FormalJsonBindingV001`

| 順 | key | 型・制約 |
|---:|---|---|
| 1 | `schemaVersion` | 非空文字列 |
| 2 | `path` | workspace相対、`..`・backslash・重複separatorなし |
| 3 | `fileSha256` | lowercase SHA-256 |
| 4 | `canonicalSha256` | lowercase SHA-256 |

### 2.2 `ByteBindingV001`

| 順 | key | 型・制約 |
|---:|---|---|
| 1 | `path` | workspace相対path |
| 2 | `fileSha256` | lowercase SHA-256 |

### 2.3 `DigestProvenanceV001`

pathを下流へ渡さず、製造時に使った成果物の同一性だけを残す型である。

| 順 | key | 型・制約 |
|---:|---|---|
| 1 | `schemaVersion` | 非空文字列 |
| 2 | `artifactId` | formal ID |
| 3 | `fileSha256` | lowercase SHA-256 |
| 4 | `canonicalSha256` | lowercase SHA-256 |

### 2.4 `OwnerValueBindingV001`

renderer job内のcanvas/format等を独立bindingとしてreceiptへ写す。値を別fileへ複製しない。

| 順 | key | 型・制約 |
|---:|---|---|
| 1 | `ownerJobBinding` | `FormalJsonBindingV001` |
| 2 | `jsonPointer` | `/executionInputs/...`から始まる固定pointer |
| 3 | `valueCanonicalSha256` | pointer先値のcanonical SHA-256 |

## 3. cue終端projection契約

### 3.1 schema

schemaVersionは`presentation-cue-end-projection-v001`とする。

```json
{
  "schemaVersion": "presentation-cue-end-projection-v001",
  "projectionId": "<formal-id>",
  "sourcePackageBinding": {
    "schemaVersion": "presentation-output-caption-cue-source-package-v001",
    "path": "<workspace-relative-path>",
    "fileSha256": "<sha256>",
    "canonicalSha256": "<sha256>"
  },
  "sourceSelectionDigest": {
    "schemaVersion": "presentation-output-caption-cue-selection-v001",
    "artifactId": "<selection-id>",
    "fileSha256": "<sha256>",
    "canonicalSha256": "<sha256>"
  },
  "captions": [
    {
      "caseId": "<case-id>",
      "inputCaptionId": "<caption-id>",
      "semanticCaptionId": "<semantic-caption-id>",
      "ordinal": 1,
      "cues": [
        {
          "cueId": "<cue-id>",
          "cueOrdinal": 1,
          "cueEndBoundaryId": "<boundary-id>"
        }
      ]
    }
  ],
  "provenance": {
    "producerJobBinding": {
      "schemaVersion": "<producer-job-schema>",
      "path": "<workspace-relative-path>",
      "fileSha256": "<sha256>",
      "canonicalSha256": "<sha256>"
    }
  }
}
```

exact条件:

1. root keyは上記6件だけ、caption rowは上記5件だけ、cue rowは上記3件だけ。
2. caption集合と順序はsource packageのcase contextとexact一致する。
3. cueOrdinalは1始まり連続、cueEndBoundaryIdは同captionの境界列内に一件だけ存在し、strict増加する。
4. 最終cueEndBoundaryIdはcaption末尾boundaryと一致する。
5. cue区間をsource packageへ再適用した時、atomは欠落0・重複0・逆順0で全量を一度ずつ覆う。
6. `sourceSelectionDigest`はpathを持たない。動画出力側は旧selectionを見つけたり再読したりできない。
7. `lineEndBoundaryIds`、行本文、行ID、行幅、style値はschema上存在しない。

### 3.2 製造規則

1. producerは正式selection、selection report、source packageを公開直前にstable再読する。
2. selection reportがpassedで、selection bindingとsource package bindingが一致することを確認する。
3. selectionの各cueから`cueId / cueOrdinal / cueEndBoundaryId`だけを順序どおり投影する。
4. source packageへ再適用し、§3.1の全量閉包を確認する。
5. selectionのpathを捨て、schema/ID/file SHA/canonical SHAだけをdigestとして残す。
6. formal byteを未使用pathへno-replaceで保存し、stable再読・byte一致後にbindingを作る。
7. projection製造後にselectionを変更・修復・再解釈しない。

## 4. 注文書（instruction artifact）契約

### 4.1 schema

schemaVersionは`presentation-instruction-artifact-v001`とする。

```json
{
  "schemaVersion": "presentation-instruction-artifact-v001",
  "artifactId": "<formal-id>",
  "artifactKind": "caption",
  "sourceBindings": {
    "meaningInformationPackage": {
      "schemaVersion": "<meaning-schema>",
      "path": "<workspace-relative-path>",
      "fileSha256": "<sha256>",
      "canonicalSha256": "<sha256>"
    },
    "timeline": {
      "schemaVersion": "<timeline-schema>",
      "path": "<workspace-relative-path>",
      "fileSha256": "<sha256>",
      "canonicalSha256": "<sha256>"
    },
    "cueEndProjection": {
      "schemaVersion": "presentation-cue-end-projection-v001",
      "path": "<workspace-relative-path>",
      "fileSha256": "<sha256>",
      "canonicalSha256": "<sha256>"
    }
  },
  "styleProfileId": "<approved-profile-id>",
  "instructions": [
    {
      "instructionId": "<instruction-id>",
      "semanticKind": "speech-caption",
      "content": {
        "text": "<exact-display-text>"
      },
      "outputTime": {
        "startFrame": 0,
        "endFrameExclusive": 1
      },
      "cueEndReference": {
        "projectionId": "<projection-id>",
        "inputCaptionId": "<caption-id>",
        "cueId": "<cue-id>",
        "cueOrdinal": 1,
        "cueEndBoundaryId": "<boundary-id>"
      },
      "targetProvenance": {
        "targetRefId": "<semantic-target-id>",
        "targetType": "semantic-caption",
        "atomOccurrenceIds": ["<atom-occurrence-id>"]
      },
      "materialRefs": []
    }
  ],
  "provenance": {
    "producerJobBinding": {
      "schemaVersion": "<producer-job-schema>",
      "path": "<workspace-relative-path>",
      "fileSha256": "<sha256>",
      "canonicalSha256": "<sha256>"
    },
    "sourceCaseId": "<case-id>"
  }
}
```

### 4.2 caption/titleの条件差

rootとinstruction rowのkey集合は共通とし、値だけを閉語彙で分ける。

| artifactKind | semanticKind | timeline | cueEndProjection | cueEndReference | targetType | atomOccurrenceIds |
|---|---|---|---|---|---|---|
| `caption` | `speech-caption` | formal binding必須 | formal binding必須 | object必須 | `semantic-caption` | 1件以上 |
| `title` | `title` | `null` | `null` | `null` | `meaning-title` | 空配列 |

titleでも意味情報package binding、styleProfileId、本文、start/end frame、targetRefIdは必須である。format、canvas、screen layoutは注文書へ入れない。

### 4.3 注文書出口のexact条件

1. instruction IDはartifact内で一意、配列順は`startFrame / endFrameExclusive / instructionId`の昇順。
2. `startFrame`は0以上、`endFrameExclusive`はstartより大きい。title/captionともframeだけを使い、msを持たない。
3. caption本文はprojectionで区切ったatom本文の連結とbyte一致する。
4. captionの各cueEndReferenceはprojectionの同じcue rowとexact一致する。
5. captionのatomOccurrenceIdsは意味情報package内に全件一度だけ存在し、本文・順序・時刻を変更しない。
6. title本文は意味情報packageのtitle文字列とbyte一致する。
7. styleProfileIdはproducerが受け取った合格済みprofile IDと一致する。styleの生値は注文書へ複製しない。
8. materialRefsはformal material IDの昇順・重複0件。空集合を許す。
9. formal byteの再構築はbyte同一、builderは時刻・本文・IDを推測しない。

### 4.4 禁止fieldの閉集合

exact schemaの未知key拒否に加え、root以下の全key名を再帰走査し、次の閉集合との一致を一件でも検出したら`INSTRUCTION_FORBIDDEN_FIELD`とする。

```text
selectionBinding
selectionReportBinding
lineEndBoundaryIds
lines
indexedLines
lineId
lineOrdinal
lineTexts
logicalWidth
maxLogicalWidth
maxLogicalWidthPerLine
maxLines
maxLinesPerDisplayPage
characterWidthRule
resolvedStyle
styleIntent
visualStateId
stateId
requestedPresetId
appliedPresetId
fontAssetId
fontFamily
fontSizePx
fontColor
fillColor
borderColor
borderWidthPx
glowColor
glowWidthPx
glowBlurPx
backgroundColor
backgroundOpacity
position
x
y
offsetX
offsetY
safeArea
safeAreaPx
canvas
format
screenLayoutId
cropMode
cropViewport
cropFilter
sceneTransitionMode
audioMode
transition
fadeFrames
easing
animation
animationCurve
rendererImplementationBinding
```

この集合をregexや部分一致へ拡大しない。未知keyはexact schemaが別途拒否するため、`timeline`等の正当なkeyを語の部分一致で誤拒否しない。

## 5. 出力側の版付き行分割規則

### 5.1 所有

行分割規則は注文書・style台帳へ入れず、renderer jobの実行入力`lineLayoutRules`が所有する。実装は`presentation_renderer_line_layout_rule_v001.mjs`だけに置き、caption/title runner、検査fixture、receipt builderへ計算を複製しない。

### 5.2 `balanced-source-boundary-v001`（caption）

入力:

- 注文書のcaption instruction一件
- cueEndProjection
- 意味情報packageのatom本文と順序
- jobが束縛したstyle profileから解決した最大行幅・最大行数・文字幅規則

規則:

1. candidateはcue内のsource atom境界だけ。atom内部、文字index、旧selectionの行末は候補にしない。
2. 一行全体の論理幅が最大行幅以下なら一行だけを採る。
3. 超える場合、1以上`maxLines`以下の全partitionを列挙する。各行は非空、全atomを順序どおり一回ずつ使い、各行幅が最大行幅以下でなければならない。
4. 候補tupleを次のlexicographic順で昇順比較し、先頭一件だけを採る。
   1. 行数
   2. 候補内の最大行幅
   3. 最大行幅と最小行幅の差
   4. source boundary ordinal列
5. 候補0件はreject。係数、重み、許容差、安全率、乱数を使わない。

voice-013の旧render planへ適用すると、cue 1はboundary 17（17/18の同点をordinalで解決）、cue 2は51、cue 3は85となり、元の31/32、32/33、33/32を一意再現する。検査はこの3件をold page/line planから投影したcanonical byteと比較する。

### 5.3 `greedy-code-point-v001`（title）

1. candidateはUnicode code point境界。
2. 残り全文が最大行幅以下なら一行にする。
3. 超える場合、現在位置から最大行幅以下となる最長の非空prefixを一行にし、残りへ同じ処理を繰り返す。
4. `maxLines`を超える、または一code pointでも最大行幅を超える場合はreject。
5. 係数、重み、辞書、AI、fallbackを使わない。

title C v009では、横型は全文一行、縦型は「片付けの「やりかけ癖」」/「を語るマリン船長」の2行となり、元成果物を一意再現する。

### 5.4 line layout成果物

rendererが描画前に製造する`presentation-renderer-line-layout-v001`は次のexact schemaとする。これは出力側成果物であり、注文書ではない。

```json
{
  "schemaVersion": "presentation-renderer-line-layout-v001",
  "layoutId": "<formal-id>",
  "instructionArtifactBinding": {
    "schemaVersion": "presentation-instruction-artifact-v001",
    "path": "<workspace-relative-path>",
    "fileSha256": "<sha256>",
    "canonicalSha256": "<sha256>"
  },
  "entries": [
    {
      "instructionId": "<instruction-id>",
      "lineLayoutRuleId": "balanced-source-boundary-v001",
      "lines": [
        {
          "lineIndex": 0,
          "sourceUnitIds": ["<atom-or-code-point-id>"],
          "text": "<line-text>",
          "logicalWidth": 1
        }
      ]
    }
  ]
}
```

entriesはinstruction順、linesは0始まり連続。本文連結はinstruction本文とbyte一致し、source unitは欠落0・重複0・逆順0とする。

## 6. renderer job契約

### 6.1 exact schema

schemaVersionは`presentation-instruction-renderer-job-v001`とする。

```json
{
  "schemaVersion": "presentation-instruction-renderer-job-v001",
  "jobId": "<formal-id>",
  "attemptId": "attempt-0001",
  "instructionArtifactBinding": {
    "schemaVersion": "presentation-instruction-artifact-v001",
    "path": "<workspace-relative-path>",
    "fileSha256": "<sha256>",
    "canonicalSha256": "<sha256>"
  },
  "cropAppliedBaseMedia": {
    "baseMedia": {
      "path": "<workspace-relative-path>",
      "fileSha256": "<sha256>"
    },
    "timeline": {
      "schemaVersion": "<timeline-schema>",
      "path": "<workspace-relative-path>",
      "fileSha256": "<sha256>",
      "canonicalSha256": "<sha256>"
    },
    "generationManifest": {
      "schemaVersion": "<manifest-schema>",
      "path": "<workspace-relative-path>",
      "fileSha256": "<sha256>",
      "canonicalSha256": "<sha256>"
    },
    "validationReceipt": {
      "schemaVersion": "<validation-schema>",
      "path": "<workspace-relative-path>",
      "fileSha256": "<sha256>",
      "canonicalSha256": "<sha256>"
    }
  },
  "executionInputs": {
    "format": "normal-landscape",
    "canvas": {
      "width": 1920,
      "height": 1080,
      "fps": 30
    },
    "screenLayoutId": null,
    "cropPolicy": {
      "mode": "already-applied"
    },
    "sceneTransitionPolicy": {
      "mode": "straight-cut"
    },
    "audioPolicy": {
      "mode": "preserve-source"
    },
    "lineLayoutRules": {
      "speech-caption": "balanced-source-boundary-v001",
      "title": "greedy-code-point-v001"
    }
  },
  "registryBindings": {
    "styleProfileRegistry": {
      "schemaVersion": "<registry-schema>",
      "path": "<workspace-relative-path>",
      "fileSha256": "<sha256>",
      "canonicalSha256": "<sha256>"
    },
    "materialRegistry": {
      "schemaVersion": "<material-index-schema>",
      "path": "<workspace-relative-path>",
      "fileSha256": "<sha256>",
      "canonicalSha256": "<sha256>"
    },
    "fontLedger": {
      "schemaVersion": "presentation-renderer-trust-v001",
      "path": "<workspace-relative-path>",
      "fileSha256": "<sha256>",
      "canonicalSha256": "<sha256>",
      "jsonPointer": "/fontAssets",
      "valueCanonicalSha256": "<sha256>"
    },
    "rendererTrust": {
      "schemaVersion": "presentation-renderer-trust-v001",
      "path": "<workspace-relative-path>",
      "fileSha256": "<sha256>",
      "canonicalSha256": "<sha256>"
    }
  },
  "rendererImplementationBindings": [
    {
      "role": "instruction-renderer-runner-v001",
      "path": "evals/clip_composition/run_presentation_instruction_renderer_job_v001.ts",
      "fileSha256": "<sha256>"
    }
  ],
  "approvedContractBindings": [
    {
      "role": "rendering-decoupling-contract-design-v001",
      "path": "evals/clip_composition/reports/presentation/presentation-rendering-decoupling-contract-design-20260817-v001.md",
      "fileSha256": "<approved-sha256>"
    }
  ],
  "publication": {
    "admissionReceiptPath": "<unused-workspace-relative-path>",
    "lineLayoutPath": "<unused-workspace-relative-path>",
    "renderOutputRoot": "<unused-workspace-relative-path>"
  }
}
```

実装時にはrendererImplementationBindingsへ、line layout、admission、共通描画core、overlay entry、QC、layout inspector、atomic publisher、実行toolの全live dependencyを一件ずつ固定順で列挙する。一覧をrunner内で手書き複製せず、一つの正本配列からjob検査とreceiptへ供給する。

### 6.2 renderer jobが所有する実行入力

| 所有値 | 注文書へ入れない理由 | receiptでの証明 |
|---|---|---|
| `format` | 出力形式であり意味内容ではない | job内value binding |
| canvas width/height/fps | 出力媒体の物理条件 | job内value binding |
| `screenLayoutId` | 画面構成は出力側判断 | job内value binding |
| crop policy | 媒体準備・出力側責務 | job内value binding + crop済み媒体binding |
| scene transition policy | 場面接続の見せ方 | job内value binding |
| audio policy | 音声の出力方法 | job内value binding |
| semantic kindごとのline rule ID | 行分割は出力側責務 | job内value binding +実装binding |
| crop適用済み基礎映像一組 | 注文書は媒体を加工しない | 4 bindingを直接保持 |
| style profile台帳 | 注文書はIDだけを選ぶ | file binding + ID実在check |
| material台帳 | 素材の実在・採用版 | file binding +全material ref照合 |
| 書体台帳 | 書体実体のpath/SHA | trust file `/fontAssets` section binding |
| renderer trust台帳 | 配置規則・tool/依存信頼 | file binding |
| renderer実装 | 描画した実体 | implementation binding全件 |

job/env/defaultから暗黙選択しない。全値はformal job byteに存在し、欠落・余分・未承認binding・使用済み出力先を拒否する。

## 7. admission receipt契約

### 7.1 exact schema

schemaVersionは`presentation-renderer-admission-receipt-v001`とする。acceptedだけをreceiptとして公開し、rejected/fatalは別の失敗記録でありreceiptを名乗らない。

```json
{
  "schemaVersion": "presentation-renderer-admission-receipt-v001",
  "receiptId": "<job-id>-admission-receipt-v001",
  "status": "accepted",
  "rendererJobBinding": {
    "schemaVersion": "presentation-instruction-renderer-job-v001",
    "path": "<workspace-relative-path>",
    "fileSha256": "<sha256>",
    "canonicalSha256": "<sha256>"
  },
  "instructionArtifactBinding": {
    "schemaVersion": "presentation-instruction-artifact-v001",
    "path": "<workspace-relative-path>",
    "fileSha256": "<sha256>",
    "canonicalSha256": "<sha256>"
  },
  "instructionSourceBindings": {
    "meaningInformationPackage": "<formal-binding>",
    "timeline": "<formal-binding-or-null>",
    "cueEndProjection": "<formal-binding-or-null>"
  },
  "cropAppliedBaseMediaBinding": {
    "baseMedia": "<byte-binding>",
    "timeline": "<formal-binding>",
    "generationManifest": "<formal-binding>",
    "validationReceipt": "<formal-binding>"
  },
  "canvasFormatBinding": {
    "ownerJobBinding": "<formal-renderer-job-binding>",
    "jsonPointer": "/executionInputs",
    "valueCanonicalSha256": "<sha256>"
  },
  "styleProfileRegistryBinding": "<formal-binding>",
  "materialRegistryBinding": "<formal-binding>",
  "fontLedgerBinding": {
    "schemaVersion": "presentation-renderer-trust-v001",
    "path": "<workspace-relative-path>",
    "fileSha256": "<sha256>",
    "canonicalSha256": "<sha256>",
    "jsonPointer": "/fontAssets",
    "valueCanonicalSha256": "<sha256>"
  },
  "rendererTrustBinding": "<formal-binding>",
  "rendererImplementationBindings": ["<implementation-binding>"],
  "executionInputBindings": [
    {
      "ownerJobBinding": "<formal-renderer-job-binding>",
      "jsonPointer": "/executionInputs/cropPolicy",
      "valueCanonicalSha256": "<sha256>"
    }
  ],
  "checks": [
    {"checkId": "instruction-artifact", "status": "passed"},
    {"checkId": "cue-end-projection", "status": "passed"},
    {"checkId": "crop-applied-base-media", "status": "passed"},
    {"checkId": "canvas-format", "status": "passed"},
    {"checkId": "style-profile-registry", "status": "passed"},
    {"checkId": "material-registry", "status": "passed"},
    {"checkId": "font-ledger", "status": "passed"},
    {"checkId": "renderer-trust", "status": "passed"},
    {"checkId": "renderer-implementation", "status": "passed"},
    {"checkId": "renderer-execution-inputs", "status": "passed"}
  ]
}
```

文字列placeholderはschema説明用であり、実値では§2のobjectを置く。root key、nested key、checks 10件の順序・件数はexactとする。runtime timestamp、message、stack、stderr、secretを含めない。

### 7.2 公開時点

1. renderer jobと全bindingをstable再読する。
2. 注文書の出口検査と、projection/意味情報/timelineの追跡を再検査する。
3. crop済み媒体、canvas/format、style/material/font/trust/implementation、crop/scene/audio/screen layout/line ruleを全件照合する。
4. output・staging・work rootが未使用であることを照合する。
5. **行分割、overlay製造、renderer work directory作成より前**にreceiptを未使用pathへno-replace公開する。
6. 公開後receiptをstable再読し、byte/SHA/schema/checks 10/10を照合する。
7. render phaseはrenderer job bindingとreceipt bindingを受け、両者およびreceiptが束縛する全入力を開始時に再読する。receiptの自己申告だけで続行しない。
8. 一件でも差があれば描画を開始せず、旧plan、default、fallbackへ進まない。

receiptは独立成果物であり、render completionやQC内へ埋め込んだだけの形を認めない。

### 7.3 閉語彙failure code

```text
INSTRUCTION_INPUT_INVALID
INSTRUCTION_BINDING_MISMATCH
INSTRUCTION_CONTENT_INVALID
INSTRUCTION_TIME_INVALID
INSTRUCTION_TARGET_INVALID
INSTRUCTION_FORBIDDEN_FIELD
CUE_END_PROJECTION_INVALID
CUE_END_PROJECTION_BINDING_MISMATCH
LINE_LAYOUT_INPUT_INVALID
LINE_LAYOUT_NO_VALID_PARTITION
LINE_LAYOUT_ORACLE_MISMATCH
RENDER_ADMISSION_INPUT_INVALID
RENDER_ADMISSION_BINDING_MISMATCH
RENDER_ADMISSION_MEDIA_INVALID
RENDER_ADMISSION_CANVAS_FORMAT_INVALID
RENDER_ADMISSION_STYLE_INVALID
RENDER_ADMISSION_MATERIAL_INVALID
RENDER_ADMISSION_FONT_INVALID
RENDER_ADMISSION_TRUST_INVALID
RENDER_ADMISSION_IMPLEMENTATION_INVALID
RENDER_ADMISSION_EXECUTION_INPUT_INVALID
RENDER_ADMISSION_PUBLICATION_FAILED
DIRECT_RENDER_PATH_FORBIDDEN
```

既存共通描画core以後のQC codeは変更せず伝播する。新codeを旧codeへ曖昧に丸めない。

## 8. 検査一覧

### 8.1 cue終端projection（6 ID）

| ID | 検査 |
|---|---|
| PRP001 | formal byte・exact root/nested schema・決定的再構築 |
| PRP002 | source packageとcaption集合・順序・IDがexact一致 |
| PRP003 | cue終端がstrict増加し、最終boundaryまでatom全量を一度ずつ覆う |
| PRP004 | 旧selectionのlineEndBoundaryIdsがprojection byteへ0件 |
| PRP005 | sourceSelectionDigestにpathがなく、旧selection bindingを入れるとreject |
| PRP006 | 同一source/selectionから2回製造したprojection byteが一致 |

### 8.2 注文書出口（10 ID、調査資料§2.3）

| ID | 検査 |
|---|---|
| PRI001 | formal byteとexact schema、未知key拒否 |
| PRI002 | source binding全件のstable再読・SHA一致 |
| PRI003 | instruction ID一意性と決定順 |
| PRI004 | frame範囲が正でtimeline内に閉じる。ms field 0件 |
| PRI005 | caption本文・atom順・cue終端の全量閉包 |
| PRI006 | title本文と意味情報package titleのbyte一致 |
| PRI007 | semanticKind/targetType/artifactKindの条件表一致 |
| PRI008 | target/material参照実在と重複0 |
| PRI009 | 禁止field閉集合全件の実発火と、正当な`timeline`の誤拒否0 |
| PRI010 | 同一入力から注文書formal byteが一致 |

### 8.3 行分割（8 ID）

| ID | 検査 |
|---|---|
| PRL001 | 一行に収まるcaptionを一行にする |
| PRL002 | voice-013 cue 1をboundary 17へ分け、同点18をordinalで退ける |
| PRL003 | voice-013 cue 2/3を51/85へ分ける |
| PRL004 | 3 cueのline text・atom集合・論理幅が旧page/line plan projectionとbyte一致 |
| PRL005 | title landscape v009を一行で再現 |
| PRL006 | title vertical v009を11/8 code pointの二行で再現 |
| PRL007 | 有効partition 0件、maxLines超過、unit欠落/重複をreject |
| PRL008 | 乱数・係数・旧selection読取・別計算実装0件をsource実読で確認 |

### 8.4 renderer受入（12 ID、調査資料§2.4）

| ID | 検査 |
|---|---|
| PRA001 | renderer job exact schema・formal byte・未使用出力先 |
| PRA002 | 注文書・projection・意味情報・timelineのstable再読と相互binding一致 |
| PRA003 | crop適用済み媒体4 bindingとframe/audio実体 |
| PRA004 | format/canvas/fpsの有限整数と媒体実体の整合 |
| PRA005 | instructionのstyleProfileIdが束縛台帳に一件だけ存在 |
| PRA006 | materialRefs全件がmaterial台帳に存在 |
| PRA007 | 使用書体がfont ledger sectionと実file SHAへ閉じる |
| PRA008 | renderer trust台帳・layout規則・tool binding成立 |
| PRA009 | renderer implementation全件のlive SHA一致 |
| PRA010 | crop/scene/audio/screen layout/line ruleのjob所有と注文書内0件 |
| PRA011 | receiptを描画work作成前に独立no-replace公開し、公開後再読一致 |
| PRA012 | receiptなし・差替え・既使用root・旧plan fallbackを全てfail-closed |

### 8.5 移行・一気通貫（8 ID）

| ID | 検査 |
|---|---|
| PRM001 | voice-013横型でprojection→注文書→receipt→line layout→描画→QCが一気通貫 |
| PRM002 | voice-013の注文書を旧render planなしで描画できる |
| PRM003 | 工事前後でcue本文・cue終端・frame・行分割projectionがbyte一致 |
| PRM004 | instruction一件ごとのapplication resultとoverlay/QCが一対一 |
| PRM005 | title landscape/verticalが同じ注文書外枠とrenderer jobを使用 |
| PRM006 | title v009の本文・180frame・行分割・style適用結果が旧oracleと一致 |
| PRM007 | caption/title formal runnerのsource・import graph・実capabilityで旧direct builder呼出し0件 |
| PRM008 | 既存正式成果物・stable tag・既存5 tree・A-v002記録対象treeにbyte差0 |

検査IDは合計**44件**。各IDはtest source宣言、TAP observed、TAP passed、契約期待の四者をexact一致させる。検査の統合でIDを減らす、proof一件へ観測を複数渡す、静的主張だけで実枝を数えることを禁止する。

## 9. exact path表

### 9.1 新規11 path

| # | exact path | 種別 | 責務 |
|---:|---|---|---|
| 1 | `evals/clip_composition/reports/presentation/presentation-rendering-decoupling-contract-design-20260817-v001.md` | contract design | 本書 |
| 2 | `evals/clip_composition/presentation_cue_end_projection_v001.mjs` | production | projection schema/codec/builder/validator |
| 3 | `evals/clip_composition/presentation_cue_end_projection_v001.test.mjs` | test | PRP001〜006 |
| 4 | `evals/clip_composition/presentation_instruction_artifact_v001.mjs` | production | 注文書schema/codec/caption+title builder/validator |
| 5 | `evals/clip_composition/presentation_instruction_artifact_v001.test.mjs` | test | PRI001〜010 |
| 6 | `evals/clip_composition/presentation_renderer_line_layout_rule_v001.mjs` | production | 2 line rule、line layout schema/codec/builder |
| 7 | `evals/clip_composition/presentation_renderer_line_layout_rule_v001.test.mjs` | test | PRL001〜008 |
| 8 | `evals/clip_composition/presentation_renderer_admission_receipt_v001.mjs` | production | renderer job/receipt schema、admission、binding再読 |
| 9 | `evals/clip_composition/presentation_renderer_admission_receipt_v001.test.mjs` | test | PRA001〜012 |
| 10 | `evals/clip_composition/run_presentation_instruction_renderer_job_v001.ts` | production runner | admission phase、receipt公開、render phase、line layout、共通core接続、QC/trace公開 |
| 11 | `evals/clip_composition/run_presentation_instruction_renderer_job_v001.test.mjs` | integration test | PRM001〜004とrunner fail-closed |

### 9.2 既存変更6 path

| # | exact path | 現在SHA-256 | 変更 |
|---:|---|---|---|
| 12 | `evals/clip_composition/run_presentation_zevo_caption_quality_v002_proof_job_v001.ts` | `ae789a4cc8e9aeaeecc493a5ca13b2137ce56b33b84712f141e9f23cf90f86ee` | projection/注文書を公開し、新renderer runnerだけを起動。page-line/render/common直結を使用禁止 |
| 13 | `evals/clip_composition/run_presentation_zevo_caption_quality_v002_proof_job_v001.test.mjs` | `61573af7f233741dcdc545b42da3b750981ce83aeadafe50481df76ab7004d32` | 新成果物・byte oracle・PRM001〜004/007/008、旧呼出し0件 |
| 14 | `evals/clip_composition/run_presentation_zevo_caption_quality_v002_fixture_job_v001.mjs` | `b92803515b833999a7ea38c28bd87d32391f5c7156c4d0974a6a77aa04b3535e` | proof jobの新implementation/contract bindingとprojection/注文書/receipt fixtureへ更新 |
| 15 | `evals/clip_composition/run_presentation_zevo_caption_quality_v002_fixture_job_v001.test.mjs` | `c826f9ef26d0b3e147d4f8f6ad55deff0d17f34acb63e880d9fe0a0cce88c78e` | binding件数・新fixture/admissionのexact検査。旧F/U証明を失わない |
| 16 | `evals/clip_composition/run_presentation_output_title_job_v001.ts` | `b95779bc360e6a701ddb072132b5f1e596b19302bc60d08c43b6652c715b7f54` | title注文書を公開し、新renderer runnerだけを起動。旧display/common直結を使用禁止 |
| 17 | `evals/clip_composition/run_presentation_output_title_job_v001.test.mjs` | `876c29d065c99d6b0f18cdbdf37c2991b67157f53432014d60d0e9e843793f1d` | PRM005〜008、title旧呼出し0件 |

**件数: 新規11、既存変更6、合計17。**

### 9.3 明示的な変更外

次は参照・byte oracle・共用実装として使うが変更しない。

- `presentation_output_caption_cue_selection_v001.mjs`とtest
- `presentation_output_page_line_planner_v003.mjs`とtest
- `presentation_output_render_plan_v003.mjs`とtest
- `presentation_output_title_compositor_v001.mjs`とtest
- `render_presentation_v002.mjs`
- `presentation_renderer_v002.test.mjs`
- preset/style/material/font/trust台帳
- atomic publisher 3 path
- 既存正式job、selection、plan、動画、QC、確認ページ、stable tag

18 path目、上表外の既存変更、新registry、別font台帳、旧schemaへのfallbackを必要とした時点で停止し、path上限改訂をkawafmmへ戻す。

生成するjob、projection、注文書、receipt、line layout、TAP、診断record、動画はwork pathであり、正本path上限17とは別にAGENTS.mdの作業path枠へ数える。完了時に正本へ残す生成成果物は、work-orderでexact一覧を固定してからのみ正本扱いにする。

## 10. 移行順

### Phase 0: byte oracle固定

1. caption voice-013の正式selection、page/line plan v003、render plan v003、動画、QCのpath/SHAを再読する。
2. title C v009 landscape/verticalのdisplay plan、動画、QCのpath/SHAを再読する。
3. 既存5 treeとA-v002記録対象treeを不変oracleとして記録する。

### Phase 1: contract module

1. projection、注文書、line rule、admission/receipt、renderer runnerを新規実装する。
2. PRP/PRI/PRL/PRAを頭から実行し44 IDのうち36 IDを閉じる。
3. receipt公開前には描画workが0件であることを実測する。

### Phase 2: caption横型1 case

1. voice-013の正式selectionからcue終端projectionを製造する。
2. projectionから注文書を製造し、ここで独立fileとしてレビュー可能にする。
3. renderer jobを発行し、receiptを描画前に公開する。
4. line layoutが旧boundary 17/51/85とbyte一致することを確認する。
5. 新renderer runnerだけで横型1本を描画し、既存と意味・frame・line・QCを比較する。
6. PRM001〜004を合格させる。最初の実証はvoice-013一件から広げない。

### Phase 3: title接続

1. title C v009 landscape/verticalのmeaning titleから同じ注文書schemaを製造する。
2. format/canvas/screen layout/crop/scene/audioを各renderer jobだけへ置く。
3. title line layoutを旧一行/二行とbyte比較する。
4. 同じrenderer runnerで2形式を描画し、PRM005/006へ合格する。

### Phase 4: 旧直結経路の使用禁止

1. caption formal runnerからpage/line plan、render plan、common coreの直接build/call capabilityを除去する。
2. title formal runnerからtitle display plan、title common coreの直接build/call capabilityを除去する。
3. source import graph、module namespace、実行時capability、正式成果物集合の4面で旧呼出し0件を確認する。
4. 新規生成は注文書+receipt経路だけとし、旧pathへfallbackしない。
5. 旧module/fileは証拠とbyte oracleとして残し、物理削除は骨格清書で行う。

### Phase 5: A-v002判断と停止

注文書を人間がレビューできる状態を確認した後、A-v002の目視合格・tag判断へ戻る。caption縦型、G4〜G7、renderer表現力拡張、旧module物理削除へ自動接続しない。

## 11. work-order案

### 11.1 基本情報

- 工事ID案: `PRESENTATION-RENDERING-DECOUPLING-V001`
- 目的: 注文書を中間成果物としてレビューでき、動画出力プログラムを独立して検査・交換できる境界をcaption横型1 caseとtitle Cで実証する。
- 変更可能path: §9の17 pathだけ。
- 正本path上限案: 17件（kawafmm確定待ち）。
- 作業path枠: 正本path上限確定後、AGENTS.mdどおり10倍まで。
- API通信: 0回。
- 費用支出: US$0。
- commit/tag/公開: 別のkawafmm承認まで0件。

### 11.2 不変条件

1. 意味情報package、selection、字幕本文、cue終端、frame、title本文、style profile台帳を変えない。
2. 既存正式成果物、stable tag、5 tree、A-v002記録対象treeを上書きしない。
3. 注文書へ§4.4の描画情報を入れない。
4. 旧selectionを注文書・renderer job・receiptのbindingにしない。
5. crop/scene/audio/screen layout/format/canvasはrenderer jobとreceiptだけが所有する。
6. receiptなしでline layout/描画を開始しない。
7. silent fallback、default補完、旧plan fallback、後方互換分岐を作らない。
8. 計算をfixture/test/runnerへ複製しない。

### 11.3 試行錯誤枠

AGENTS.mdの既定値をそのまま使う。

- 検査設営起因の修正: 5回/工事
- API probe: 10回・累計US$0.50（ただし本work-orderの許可範囲はAPI 0回・費用US$0のため、別の第1層改訂なしには使用不可）
- 限定修正権: 3回/工事
- 強制停止: 追補5件、停止8回、実走3日、費用US$1.00
- 定期報告: 1日1回または正式attempt 3回ごとの早い方

### 11.4 停止条件

1. 18 path目または§9外の既存path変更が必要。
2. 裁定済みschema責務の変更、注文書への描画値追加、旧selection参照が必要。
3. voice-013の旧行分割を§5規則でbyte再現できない。
4. receipt公開前にline layout、work root、overlay、動画が生成される。
5. renderer job外からcrop/scene/audio/screen layout/format/canvasを補完する。
6. 既存正式成果物・stable tag・byte oracleに差が出る。
7. 不合格一件、契約解釈、新しいfailure code、計算複製、API/費用の必要が出る。
8. AGENTS.mdの試行錯誤枠・強制停止上限・はまり条件へ到達する。

枠内の設営修正・限定実装修正以外は同attemptで直さず、証拠保存→停止報告とする。

### 11.5 完了条件

1. PRP 6/6、PRI 10/10、PRL 8/8、PRA 12/12、PRM 8/8、合計44/44。
2. voice-013の注文書・receipt・line layoutが独立formal artifactとして公開される。
3. voice-013のcue本文・終端・frame・行分割projectionが工事前byte oracleと一致する。
4. 新renderer runnerだけでcaption横型動画1本がQC合格する。
5. title landscape/verticalが同じ注文書/receipt境界へ接続し、旧表示計画と意味・frame・行分割が一致する。
6. formal caption/title runnerの旧直結経路使用0件。
7. 既存直接影響回帰、baseline 86/203 exact、既存5 tree、A-v002記録対象treeが不変。
8. 注文書レビュー手順と確認fileを準備して停止する。目視、commit、tagは別承認。

## 12. 事実・設計上の仮固定・未確認

### 12.1 事実

- voice-013の旧行は31/32、32/33、33/32で、最初のcueにはboundary 17/18の同順位候補がある。
- current selectionはcue終端と行末を同じfileに持つ。
- 現物には独立したcue終端projection、注文書、admission receipt、instruction renderer runnerがない。
- style profile台帳はfont assetを含み、renderer trust台帳は同じfontのpath/SHAと配置規則を持つ。独立font registry fileはない。
- F/U fixture runnerはproof runnerのimplementation binding件数をexact検査するため、proof runnerへの新依存追加はfixture runner/testの変更を要する。
- title v009は横型一行、縦型11/8 code pointの二行である。

### 12.2 設計上の仮固定

- captionの行分割は`balanced-source-boundary-v001`、titleは`greedy-code-point-v001`とする。
- font ledgerはrenderer trust fileの`/fontAssets` section bindingとして独立roleで束縛し、新registry fileを増やさない。
- title接続は人間合格済みv009のlandscape/vertical両形式を含む。
- source moduleを詰め込まず、projection/order/line/admission/runnerを5 production pathへ分ける。

### 12.3 未確認

- 17 path上限とwork-orderの着工承認。
- 仮固定3件のkawafmm承認。
- 実装後の新implementation binding exact件数、approved contract binding exact件数、既存正式検査総数。これらは実装前に現物から一件表で閉じ、推測値を契約へ書かない。
- 新renderer runnerの正式job/output root命名値。既存未使用root規律に従うが、実装設計時にexact path式を閉じる。

## 13. kawafmm確認事項（4件）

1. **正本path上限とwork-order**: §9の新規11・既存変更6、合計17 pathを上限として本work-orderを着工してよいか。
2. **行分割規則**: caption=`balanced-source-boundary-v001`、title=`greedy-code-point-v001`の二規則で元成果物を再現する設計を正本化してよいか。
3. **書体台帳binding**: 独立fileを増やさず、renderer trust台帳の`/fontAssets`をsection bindingとしてreceiptへ独立roleで綴じてよいか。
4. **title接続範囲**: caption横型voice-013の次に、title C v009のlandscape/vertical両形式を同じ境界へ接続してから旧直結経路を使用禁止にしてよいか。

## 14. 起草時の外部作用

- 新規文書: 本書1件
- 既存file変更: 0件
- 実装・検査コード: 0件
- API通信: 0回
- 費用: US$0
- commit: 0件
- tag: 0件
- DECISIONS書込み: 0件
