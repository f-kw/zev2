# 出力側受け入れ契約 設計v001

- 日付: 2026-08-03
- 状態: **起草・人間承認待ち**
- 対象: 意味情報パッケージを横型・縦型の表示／描画へ接続する暫定出力システム
- companion: `presentation-meaning-information-package-contract-design-20260803-v001.md`
- 非対象: 実装、API通信、既存成果物の変更、描画

## 1. 結論

現行B4、横型renderer、縦型rendererが担っていた処理のうち、意味判断より後を**暫定出力システム**として切り出す。

出力側は次の二つを別入力として受ける。

1. ZEVが作った純粋な意味情報パッケージ。
2. format、style preset、行幅、crop等を持つstyle入力。

出力側は両者から、新しい出力側固有のrender planを組み立て、既存の共通描画coreとQCへ渡す。旧B4 display plan、旧instruction bundle、旧resolution packageを新経路で作らない。

## 2. 責務

### 2.1 ZEV側に残るもの

- 採用する元区間と意味上の接続順。
- 各字幕の意味まとまり全文。
- captionとsource atom occurrenceの対応。
- 発話anchorと整数ms時刻。
- タイトル文字列。
- 将来のG4〜G7意味観測。

### 2.2 出力側へ移すもの

- 一つのsemantic captionを何ページ・何行で見せるか。
- 行末、ページ末、論理幅、最大行数、文字幅規則。
- source時刻から完成timeline上のframe/sampleへの機械写像。
- format、screen layout、preset、visual state。
- 文字サイズ、書体、縁、光彩、色、配置、安全領域。
- crop decisionの適用。
- 場面接続を素繋ぎ・暗転・fade等でどう見せるか。
- 将来のG4〜G7観測からstyleに合う具体演出を選ぶこと。
- 将来のSE等の音響表現。
- caption→表示page→表示line→描画elementの追跡記録。

### 2.3 出力側が変えてはいけないもの

- semantic caption本文と意味境界。
- source atom occurrenceの所属・順序。
- source側の発話時刻。
- timeline segmentの内容・意味上の順序。
- title文字列。
- 意味観測の内容。

source時刻とderived output frameは別層である。source時刻は意味来歴として不変、output frame/sampleは表示・合成用に既存の時間対応正本から導く。derived値を意味packageへ書き戻さない。

## 3. 正式入力

描画受け入れの正式入力は`output-request.json`一つとする。これに先立つbase media生成は§5.1の別jobであり、最終描画directoryを予約しない。

- schema: `presentation-output-request-v001`
- 新規生成用入口だけが受理する。
- 旧B4 job、旧display plan、旧instruction bundleを入力として受けない。
- JSON byte、ID、SHA、pathの規則はcompanion契約§3を使う。

rootは次の7 keyだけを、この順で持つ。

1. `schemaVersion`
2. `requestId`
3. `mode`
4. `meaningInformationPackage`
5. `baseMediaInput`
6. `styleInput`
7. `publication`

固定値:

```text
schemaVersion = presentation-output-request-v001
mode = formal-generation
```

`requestId`は実行前に固定した`FormalId`。stdin、環境変数、暗黙defaultで入力値を差し替えない。本書で文字列連結から導出する全IDもcompanion契約の`FormalId`に一致しなければ、directoryや成果物を作る前に拒否する。桁切り・hash省略で短縮しない。

### 3.1 `meaningInformationPackage`

companion契約§3.3のJSON binding。`schemaVersion`は`zev-meaning-information-package-v001`。

出力側は正式validatorを同一pure入口から呼ぶ。report件数や要約からpackage本文を再構成しない。

### 3.2 `baseMediaInput`

意味packageから§5.1の前段で生成済みのbase media bundleを束縛する。次の4 keyだけを、この順で持つ。

1. `baseMedia`
2. `timeline`
3. `generationManifest`
4. `validationReceipt`

`baseMedia`はmedia binding、他3件はcompanion契約§3.3のJSON binding。schemaVersionは順に`presentation-base-media-timeline-v002 / presentation-output-base-media-generation-manifest-v001 / presentation-output-base-media-validation-receipt-v001`。4件は同じ前段生成attemptと意味package SHAを指し、validation receiptのstatusが`passed`の場合だけ受理する。

### 3.3 `styleInput`

次の8 keyだけを、この順で持つ。

1. `format`
2. `screenLayoutId`
3. `presetBinding`
4. `captionLayoutPolicy`
5. `cropPolicy`
6. `sceneTransitionPolicy`
7. `audioPolicy`
8. `materials`

#### `format`

v001の許可値:

- `normal-landscape`
- `vertical-short-1080x1920`

#### `screenLayoutId`

`null`または`FormalId`。

- `normal-landscape`では`null`だけ。
- `vertical-short-1080x1920`では選択presetの登録値と完全一致させる。
- 縦型語彙は`speaker_only / screen_speaker / speaker_pair`。v001台帳で正式登録済みの`speaker_only`以外をfallbackしない。

#### `presetBinding`

次の6 keyだけを、この順で持つ。

1. `trustedRegistryBindings`
2. `presetRegistry`
3. `presetValidationIndex`
4. `materialValidationIndex`
5. `rendererTrust`
6. `presetId`

先頭5件はcompanion契約§3.3のJSON binding。preset IDはregistryに登録済みの一件と完全一致させる。別formatのpreset、未登録ID、暗黙defaultを許さない。字幕のvisual stateは入力させず、選択presetの`kindPolicies`に一件だけ存在する`kind: "speech-caption"`の`stateId`から機械導出する。0件、複数件、未登録stateなら`PRESET_CAPABILITY_MISMATCH`で拒否し、G4〜G7用stateを字幕へ流用しない。

bindingの`schemaVersion`は参照先の先頭識別値を正本とし、format別に次へ固定する。

| role | `normal-landscape` | `vertical-short-1080x1920` |
|---|---|---|
| `trustedRegistryBindings` | `presentation-registry-trust-v001` | `presentation-registry-trust-v002` |
| `presetRegistry` | `presentation-preset-registry-v001` | `presentation-preset-registry-v002` |
| `presetValidationIndex` | `normal-landscape-preset-registry-v001` | `vertical-short-preset-registry-v001` |
| `materialValidationIndex` | `presentation-material-registry-empty-v001` | `presentation-material-registry-empty-v001` |
| `rendererTrust` | `presentation-renderer-trust-v001` | `presentation-vertical-renderer-trust-v001` |

`presetValidationIndex`と`materialValidationIndex`は参照先の`registryVersion`、他3件は参照先の`schemaVersion`との一致を検査する。field名の違いを理由に値を推測しない。

#### `captionLayoutPolicy`

exact 4 key:

1. `maxLogicalWidthPerLine`
2. `maxLinesPerDisplayPage`
3. `characterWidthRule`
4. `pageBreakPolicy`

固定・許可規則:

```text
maxLogicalWidthPerLine = 正整数
maxLinesPerDisplayPage = 1以上99以下の整数
characterWidthRule = U+0000..U+00FF=1; other Unicode code point=2
pageBreakPolicy = split-at-source-atom-boundary-or-reject
```

整数はsafe integerで、小数点・指数表記を拒否する。この値は素材・formatごとのstyle入力であり、意味packageへ複写しない。

format別のpreset能力解決は次を正本とする。

| format | 幅能力field | 行数field | 文字幅規則 |
|---|---|---|---|
| `normal-landscape` | 選択visual stateの`layout.maxCharsPerLine` | `layout.maxLines` | renderer trustの`layoutRules.characterWidthRule` |
| `vertical-short-1080x1920` | 選択visual stateの`layout.maxSupportedLogicalWidthPerLine` | `layout.maxLines` | 選択visual stateの`layout.characterWidthRule` |

要求幅・行数は対応するpreset能力以下、文字幅規則は上表の正本と完全一致させる。横型fieldを縦型へ、縦型fieldを横型へ読み替えない。registryへ共通fieldを追加して既存台帳を変えない。

#### `cropPolicy`

二つのexact unionだけを許す。

```json
{"mode":"identity"}
```

または次の4 key。

```json
{
  "mode": "bound-decision",
  "scope": "all-segments",
  "decision": {
    "schemaVersion": "vertical-preset-type-crop-decision-v006",
    "path": "workspace-relative-path",
    "fileSha256": "sha256",
    "canonicalSha256": "sha256"
  },
  "selectionPackageManifest": {
    "schemaVersion": "vertical-preset-type-crop-selection-package-v006",
    "path": "workspace-relative-path",
    "fileSha256": "sha256",
    "canonicalSha256": "sha256"
  }
}
```

- 横型は`identity`だけ。
- 縦型は`bound-decision / all-segments`だけ。
- crop decision内の`provenance.selectionPackageManifest`をdecision fileの親directoryから解決したpath・SHAが、明示した`selectionPackageManifest` bindingと完全一致すること。
- selection package manifestの`sourceMedia.path / fileSha256`は§3.2の`baseMedia`と完全一致し、crop decisionの`selectedPlan.screenLayoutId`はstyle入力と完全一致すること。decision単体に存在しないsourceRefや元媒体SHAを推測しない。
- crop filterは既存`buildLayoutVideoFilter`を唯一の計算正本として呼ぶ。filter文字列の直接入力、別crop実装、別素材decisionの流用を禁止する。

#### `sceneTransitionPolicy`

v001は`{"mode":"straight-cut-only"}`だけ。

これはtimeline segment間の見せ方である。caption自身の出入りanimationは選択presetのtransitionを出力側が解決する。暗転・fadeを使う版は時間・音声への影響を固定してから契約版を上げる。

#### `audioPolicy`

v001は`{"mode":"preserve-source-only"}`だけ。

追加SE、BGM、音量変更は行わない。source音声の欠落・sample不整合はQC不合格にする。将来の音響演出は出力側契約の版付き拡張とする。

#### `materials`

v001は空のdense arrayだけ。意味観測も空のため素材利用を認めない。将来G7を接続する時に、material validation index内のrole参照をtyped schemaとして追加する。

### 3.4 `publication`

exact 3 key:

1. `outputId`
2. `controlRoot`
3. `renderOutputRoot`

`outputId`は`requestId + "-output"`。pathは次へ固定する。

```text
controlRoot = evals/clip_composition/outputs/presentation/meaning-output-control/<requestId>
renderOutputRoot = evals/clip_composition/outputs/presentation/meaning-output-renders/<outputId>
```

`controlRoot`はrequest、acceptance report、native render planを原子的に保存する専用root。`renderOutputRoot`は共通描画coreが予約・公開する最終描画専用rootであり、描画予約時まで不存在でなければならない。control、前段base media、最終描画を同じdirectoryへ置かない。

既存横型・縦型rootやstable tag配下を指定できない。

## 4. 暫定出力システムv001のtimeline能力

意味packageは将来用に複数source・任意segment順を表現できるが、現行部品を使う暫定出力システムv001のaccepted条件は次へ限定する。

1. `sourceMedia.length == 1`。
2. 全segmentが同じsource mediaを参照する。
3. 元映像は1920×1080、rotation 0。
4. input frame rateは`30/1`または`60/1`、論理出力は`30/1`。
5. segmentはpackage順かつsource時刻の昇順。
6. 前segmentのendと次segmentのstartの境界接触は許す。正の重なり、逆順、同一区間再利用は拒否する。
7. 速度変更なし、出力segmentはframe 0から隙間なく連続。
8. 一つのsemantic captionと一つのdisplay pageは一segmentへ完全内包される。
9. crop decision一件を全segmentへ適用できる。
10. 入力と生成後base mediaに音声streamが一件あり、正のsample数とpacket payload SHAを既存媒体検査で取得できる。無音媒体はv001の能力外。

複数source、非単調順、区間再利用、segment別crop、fade、速度変更は`TIMELINE_COMPOSITION_UNSUPPORTED`として拒否する。意味packageを修正・並べ替え・部分利用しない。

このsubsetは無音・間を除いた同一配信内の複数区間を表せる。遠距離接続で非単調順や別媒体が必要になった場合は、意味packageを変えず出力側契約をv002へ拡張する。

## 5. source時刻からoutput frame/sampleへの写像

### 5.1 base mediaとtimeline

現行base media正式runnerは、旧assembly decision、human approval、basis edit planを入力契約に持つ。そのjobを新meaning packageへ偽装して再利用しない。新経路は、意味packageだけを入力にする**出力側の新規専用前段**を設け、そこで既存の次の計算正本を直接呼ぶ。

- `presentation_base_media_build_v001.mjs`
- `presentation_base_media_timeline_v002.mjs`

既存の`frameBoundaryV001`、`sourceEndFrameBoundaryV002`、audio grid処理を唯一の計算正本とする。別の丸め、許容差、比例換算、末尾補填を作らない。

前段jobは`presentation-output-base-media-build-job-v001`で、次の6 keyだけを持つ。

1. `schemaVersion`
2. `jobId`
3. `mode`
4. `meaningPackageBinding`
5. `outputRoot`
6. `expectedTimelineCompositionCanonicalSha256`

固定値:

```text
schemaVersion = presentation-output-base-media-build-job-v001
jobId = packageId + "-output-base-media"
mode = formal-generation
outputRoot = evals/clip_composition/outputs/presentation/meaning-output-base-media/<packageId>
```

`meaningPackageBinding`はcompanion契約§3.3のJSON bindingで、schemaVersionは`zev-meaning-information-package-v001`。`expectedTimelineCompositionCanonicalSha256`はSha256で、束縛済みpackageの`timelineComposition`を既存の厳密canonical serializerへ渡した値と一致させる。

meaning packageを合格検査した後、その唯一のsourceとaccepted subsetのsegmentsだけから生成する。既存assembly decision、formalization receipt、basis edit planを作らず、旧jobへ変換しない。`outputRoot`は最終描画rootと別で、開始時不存在を要求する。

成功時だけ次の4成果物を原子的に公開する。

1. `base-media.mp4`
2. `timeline.json`: `presentation-base-media-timeline-v002`
3. `generation-manifest.json`: `presentation-output-base-media-generation-manifest-v001`
4. `validation-receipt.json`: `presentation-output-base-media-validation-receipt-v001`

generation manifestは`schemaVersion / manifestId / jobBinding / meaningPackageBinding / sourceMediaBindings / baseMedia / timeline / semanticProjection / mediaBuildProjection`のexact 9 key。

- `schemaVersion = presentation-output-base-media-generation-manifest-v001`。
- `manifestId = jobId + "-generation-manifest"`。
- `jobBinding`はcompanion契約§3.3のJSON bindingで、schemaVersionは`presentation-output-base-media-build-job-v001`。実行したjob byteと一致する。
- `meaningPackageBinding`はjob内bindingとobject単位で一致する。
- `sourceMediaBindings`は意味packageのsource順と同じmedia bindingのdense arrayで、各objectはcompanion契約§3.3のmedia bindingと完全一致する。v001 accepted経路では1件だけ。
- `baseMedia`はcompanion契約§3.3のmedia bindingで、pathは`<outputRoot>/base-media.mp4`。
- `timeline`はcompanion契約§3.3のJSON bindingで、schemaVersionは`presentation-base-media-timeline-v002`、pathは`<outputRoot>/timeline.json`。
- `semanticProjection`は`sourceMediaCount / segmentCount / sourceMediaBindingsCanonicalSha256 / timelineCompositionCanonicalSha256`のexact 4 key。前2件は正整数でpackageの件数と一致する。後2件はSha256で、それぞれsource mediaのmedia binding列とpackageのtimelineCompositionを既存の厳密canonical serializerへ渡した値と一致させる。timeline composition側はjobの期待SHAとも一致する。
- `mediaBuildProjection`は`frameCount / sampleCount / audioPacketPayloadSha256`のexact 3 key。前2件は正整数で、既存base media生成coreが算出した映像提示frame総数とencoderへ渡す音声sample総数に一致する。SHAは既存媒体検査が生成後`base-media.mp4`の音声packet payloadから算出した値とする。旧generation manifestを新経路の隠れた第五成果物として作らず、同じ既存計算と媒体検査の必要projectionだけをここへ保存する。

validation receiptは`schemaVersion / receiptId / status / jobBinding / manifestBinding / checks / mediaProjection`のexact 7 key。

- `schemaVersion = presentation-output-base-media-validation-receipt-v001`。
- `receiptId = jobId + "-validation-receipt"`。
- `status = passed`だけ。
- `jobBinding`はmanifestのjobBinding、`manifestBinding`はschemaVersionが`presentation-output-base-media-generation-manifest-v001`の§3.3 JSON bindingで、公開済みmanifest byteと一致する。
- `checks`は`meaningBinding / timelineMapping / videoFrameCount / audioSampleGrid / publicationHashGraph`のexact 5 key object。各valueは文字列`passed`だけで、objectや自由メッセージを許さない。
- `mediaProjection`は`frameCount / sampleCount / audioPacketPayloadSha256 / baseMediaFileSha256 / timelineFileSha256`のexact 5 key。先頭3件はmanifestの`mediaBuildProjection`と一致し、frame数とsample数は公開直前の媒体／timeline検査結果にも一致する。後2件はSha256で、`base-media.mp4`と`timeline.json`のfile SHAに一致する。

manifestとreceiptの全bindingは開始時と公開直前に現物再読し、job・package・timeline・mediaのhash graphを一つのattemptへ閉じる。失敗attemptをpassed receiptとして公開しない。失敗記録のpath・codeは完全実装設計で固定する。

正式timelineは次を保持する。

timeline自体のexact schemaは既存`presentation-base-media-timeline-v002`を変更せず使い、値の由来を次へ限定する。

- `timelineId = jobId + "-timeline"`。
- `sourceProvenance`はpackageが束縛したsource identityの同名値、`sourceRef`はpackageの値と完全一致する。
- `sourceFrameClock`は束縛済み元媒体を既存媒体検査で観測した`inputFrameRate / decodedFrameCount`と、既存規則から導く`logicalFrameRate / extractionRuleId`だけで作る。
- `baseMedia`は`artifactId = jobId + "-base-media"`、path `base-media.mp4`、現物file SHA、frame rate `30/1`、下記segment列の最後の`outputEndFrame`を持つ。
- `segments`はpackageのsegmentと同件数・同順・同IDで、source msを変更せず、下式のframe値だけを追加する。別segmentの挿入、削除、並べ替えを行わない。

```text
sourceStartFrame30 = frameBoundaryV001(sourceStartMs)
sourceEndFrame30   = sourceEndFrameBoundaryV002(sourceEndMs, sourceFrameClock)
outputStartFrame   = 先頭0、以後は前segment.outputEndFrame
outputEndFrame     = outputStartFrame + sourceEndFrame30 - sourceStartFrame30
```

audioのframe/sample配置は同base media生成器が担い、全sample数・空白無音・packet hashを既存検査で照合する。

工程順は一意に次とする。

1. 意味packageを固定する。
2. 上記前段jobでbase media bundleを生成・検査する。
3. 縦型の場合はその`base-media.mp4`を見たcrop選択packageとdecisionを作る。横型はidentityとする。
4. base media bundleとstyle判断を束縛した`output-request.json`を固定する。
5. acceptance、native plan、共通描画coreの順に進む。

crop判断を先に作って未知のbase mediaへ流用する循環を禁止する。

### 5.2 captionとdisplay page

各display pageのsource半開区間を、既存`mapPresentationSourceIntervalV002`へ渡す。成功時の次の値をnative render planのpageへ保存する。semantic caption全体のsource時刻は意味packageを正本とし、重複したframe写像fieldをcaption直下へ持たない。

1. `timelineSegmentId`
2. `sourceStartMs`
3. `sourceEndMs`
4. `sourceStartFrame30`
5. `sourceEndFrame30`
6. `startFrame`
7. `endFrameExclusive`
8. `displayFrameCount`

0 frame、複数segment跨ぎ、曖昧写像、base media外を拒否する。source msは不変で、frame/sampleはderived表現値である。

## 6. semantic captionから表示page・lineへの展開

一つのsemantic captionを、出力側は1件以上の時間方向の`displayPage`へ分けられる。これは意味captionの改訂ではなく、表示projectionである。

規則:

1. page境界とline境界はsource atom occurrence境界だけ。
2. page列はcaptionのAtomRef列を欠落・重複・順序変更なく完全分割する。
3. 各pageのline列もpageのAtomRef列を完全分割する。
4. 全page本文のbyte連結はsemantic caption本文と一致する。
5. page本文、line本文は各AtomRefが指す元atom本文のbyte連結。
6. page source時刻は先頭atom.startMsと末尾atom.endMsから導く。独自durationや比例配分を使わない。
7. 各lineのlogical widthは§3.3の固定文字幅規則で算出し、要求上限以下。
8. page内line数は1以上、`maxLinesPerDisplayPage`以下。
9. pageは正のdisplay frame数を持つ。
10. 隣接pageのoutput frame区間は正に重ならない。境界接触は許す。
11. 一つのcaptionのpage数は999以下、一つのpageのline数は99以下。IDの桁を暗黙拡張しない。

一つのcaptionが一pageへ収まらないことを理由に、ZEV側へ意味境界変更を要求しない。複数pageでも表現不能な場合だけ`DISPLAY_PAGE_LAYOUT_UNREPRESENTABLE`で拒否する。

page・lineの選び方は出力style側の仕事である。v001の具体的plannerと、そのAI利用有無・決定性・検査一件表は次の完全実装設計で固定する。契約に適合するかの判定は本節だけで一意であり、planner実装の都合で本節を緩めない。

## 7. native render plan

新経路は`render-plan.json`一つを作る。

- schema: `presentation-output-render-plan-v001`
- 旧B4 schemaとして保存・偽装しない。

rootは次の9 keyだけを、この順で持つ。

1. `schemaVersion`
2. `planId`
3. `outputRequestBinding`
4. `meaningPackageBinding`
5. `baseMediaBinding`
6. `resolvedStyle`
7. `captionDisplays`
8. `titleDisplay`
9. `meaningProjection`

固定値とbinding:

```text
schemaVersion = presentation-output-render-plan-v001
planId = requestId + "-render-plan"
```

`outputRequestBinding`と`meaningPackageBinding`はcompanion契約§3.3のJSON binding。前者はこのplanを生成した`presentation-output-request-v001`、後者はrequestが指した`zev-meaning-information-package-v001`とbyte単位で一致する。これにより、preset・cropを含むstyle入力の来歴をplanから辿れる。`meaningProjection`は§8.3と同じexact 7 keyで、意味packageからの再計算値と完全一致させる。

### 7.1 `baseMediaBinding`

exact 4 key:

1. `baseMedia`
2. `timeline`
3. `generationManifest`
4. `validationReceipt`

§3.2の`baseMediaInput`とobject単位で完全一致する。plan生成時に再選択・再生成・別pathへの複写をしない。

### 7.2 `resolvedStyle`

exact 10 key:

1. `format`
2. `screenLayoutId`
3. `presetId`
4. `visualStateId`
5. `maxLogicalWidthPerLine`
6. `maxLinesPerDisplayPage`
7. `characterWidthRule`
8. `cropMode`
9. `sceneTransitionMode`
10. `audioMode`

全値はrequestとregistryから復元する。横型の`screenLayoutId`だけ`null`、他はnon-null。

### 7.3 `captionDisplays`

semantic captionと同件数・同順のdense array。各要素は次の4 key。

1. `displayCaptionId`
2. `semanticCaptionId`
3. `ordinal`
4. `pages`

`displayCaptionId`は`display-caption-000001`から連続。`semanticCaptionId`とordinalは意味packageと一致する。

各pageは次の13 key。

1. `pageId`
2. `pageOrdinal`
3. `atomRefs`
4. `text`
5. `sourceStartMs`
6. `sourceEndMs`
7. `timelineSegmentId`
8. `sourceStartFrame30`
9. `sourceEndFrame30`
10. `startFrame`
11. `endFrameExclusive`
12. `displayFrameCount`
13. `lines`

`pageId`は`display-page-<caption 6桁>-<page 3桁>`。pageOrdinalはcaption内1始まり連続。

各lineは次の5 key。

1. `lineId`
2. `lineOrdinal`
3. `atomRefs`
4. `text`
5. `logicalWidth`

`lineId`は`display-line-<caption 6桁>-<page 3桁>-<line 2桁>`。lineOrdinalはpage内1始まり連続。全AtomRefはcompanion契約§3.4のexact object。

### 7.4 `titleDisplay`

v001ではtitleが空の場合の`{"status":"not-requested"}`だけを許す。

現行の正式横型・縦型presetにはtitle region、表示区間、title visual stateの契約がない。したがって非空titleは常に`TITLE_STYLE_UNAVAILABLE`で拒否する。字幕領域への代用、title無視、未契約の表示時間を置くことはしない。非空titleを表示する時は、region・表示区間・visual stateを出力側v002で固定する。

### 7.5 common描画coreへの接続

新adapterはnative planの1 display pageを共通描画coreの1 elementへ直接写す。横型は共通overlay adapter、縦型は既存crop／vertical overlay adapterを使う。

共通入口は`executeValidatedPresentationDrawAndQcV001`。新経路では次を一件も生成しない。

- `presentation-caption-display-plan-v001/v002`
- 旧instruction bundle
- 旧resolution package
- 旧B4 manifest／report
- それらのin-memory偽装、converter、fallback

共通描画coreの再利用は計算の再利用であり、旧入力契約の後方互換ではない。

## 8. 出力側受け入れreport

正式reportは`output-acceptance-report.json`一つ。

- schema: `presentation-output-acceptance-report-v001`

rootは次の11 keyだけを、この順で持つ。

1. `schemaVersion`
2. `reportId`
3. `status`
4. `requestBinding`
5. `checks`
6. `violations`
7. `timelineProjection`
8. `captionDisplayProjection`
9. `meaningProjection`
10. `resolvedStyleProjection`
11. `renderPlanBinding`

`reportId = requestId + "-acceptance"`。`status`は`accepted-for-render / rejected`。

`requestBinding`はcompanion契約§3.3のJSON bindingで、`schemaVersion`は`presentation-output-request-v001`。reportを作った正式requestのbyteとcanonical値へ一致させる。

### 8.1 checks

各checkは`name / status / violationCodes`のexact 3 key。statusは`passed / failed / blocked`。次の16件を固定順で一度ずつ持つ。

1. `requestSchema`
2. `meaningPackageBinding`
3. `meaningPackage`
4. `baseMediaInput`
5. `sourceMediaCapability`
6. `timelineCapability`
7. `timelineFrameMapping`
8. `styleResolution`
9. `cropResolution`
10. `captionSourceResolution`
11. `captionDisplayLayout`
12. `captionDisplayTimeline`
13. `titleCapability`
14. `meaningPreservation`
15. `publicationTarget`
16. `commonRenderPlan`

`violationCodes`は当該checkが所有するcodeだけを固定code順・重複なしで持つ。passedとblockedでは空、failedでは1件以上とする。

依存DAGは次へ固定する。`[]`は依存なし、複数依存は全てpassedを要する。

```text
requestSchema <- []
meaningPackageBinding <- [requestSchema]
meaningPackage <- [meaningPackageBinding]
baseMediaInput <- [meaningPackage]
sourceMediaCapability <- [meaningPackage, baseMediaInput]
timelineCapability <- [meaningPackage]
timelineFrameMapping <- [timelineCapability, baseMediaInput]
styleResolution <- [requestSchema]
cropResolution <- [styleResolution, baseMediaInput]
captionSourceResolution <- [meaningPackage, timelineCapability]
captionDisplayLayout <- [captionSourceResolution, styleResolution]
captionDisplayTimeline <- [captionDisplayLayout, timelineFrameMapping]
titleCapability <- [meaningPackage, styleResolution]
meaningPreservation <- [captionDisplayTimeline, titleCapability]
publicationTarget <- [requestSchema]
commonRenderPlan <- [meaningPreservation, cropResolution, publicationTarget]
```

値の所有境界を次へ固定する。

- `requestSchema`はexact key、token型、固定union、`sceneTransitionPolicy == straight-cut-only`、`audioPolicy == preserve-source-only`、`materials == []`までを所有する。構造・固定値が違う入力を後段の能力違反へ読み替えない。
- `meaningPackage`はcompanion契約全体を所有し、`semanticObservations == []`もここで検査する。非空観測を到達不能な別codeへ付け替えない。
- `baseMediaInput`はbundle内部のschema・status・job／manifest／receipt hash graphだけを所有する。`sourceMediaCapability`は、passed bundleのsource media列と意味packageのsource media列の不一致、および意味packageとしては正当だが暫定出力v001で扱えないmedia能力を所有する。
- `timelineCapability / titleCapability`は、意味packageとしては正当だが暫定出力v001の能力subset外である値だけを所有する。
- `styleResolution / cropResolution`は、schemaに適合したbinding実体・preset能力・crop来歴の不一致だけを所有する。

したがってv001には、到達不能となるsemantic observation、transition、audio、material専用違反codeを置かない。依存failedまたはblockedのcheckだけをblockedとし、独立枝は引き続き実測する。blockedへ推測した違反codeを付けない。accepted-for-renderは16件全てpassed、violations空、4 projectionとrenderPlanBindingがnon-nullの場合だけ。

### 8.2 violations

各違反は`code / path / relatedIds`のexact 3 key。`path`はRFC 6901 JSON Pointerとし、rootは空文字列、他は`/`始まりで`~0 / ~1`以外のescapeを許さない。relatedIdsは辞書順unique文字列array。code固定順と所有check:

| 順 | code | 所有check |
|---:|---|---|
| 1 | `OUTPUT_REQUEST_INVALID` | `requestSchema` |
| 2 | `OUTPUT_REQUEST_BINDING_MISMATCH` | `requestSchema` |
| 3 | `MEANING_PACKAGE_INVALID` | `meaningPackage` |
| 4 | `MEANING_PACKAGE_BINDING_MISMATCH` | `meaningPackageBinding` |
| 5 | `BASE_MEDIA_INPUT_MISMATCH` | `baseMediaInput` |
| 6 | `SOURCE_MEDIA_CAPABILITY_UNSUPPORTED` | `sourceMediaCapability` |
| 7 | `SOURCE_MEDIA_BINDING_MISMATCH` | `sourceMediaCapability` |
| 8 | `TIMELINE_COMPOSITION_UNSUPPORTED` | `timelineCapability` |
| 9 | `TIMELINE_FRAME_MAPPING_INVALID` | `timelineFrameMapping` |
| 10 | `CAPTION_SOURCE_RESOLUTION_FAILED` | `captionSourceResolution` |
| 11 | `DISPLAY_PAGE_LAYOUT_UNREPRESENTABLE` | `captionDisplayLayout` |
| 12 | `DISPLAY_PAGE_TIMELINE_UNREPRESENTABLE` | `captionDisplayTimeline` |
| 13 | `TITLE_STYLE_UNAVAILABLE` | `titleCapability` |
| 14 | `STYLE_BINDING_MISMATCH` | `styleResolution` |
| 15 | `PRESET_CAPABILITY_MISMATCH` | `styleResolution` |
| 16 | `CROP_BINDING_MISMATCH` | `cropResolution` |
| 17 | `MEANING_PROJECTION_CHANGED` | `meaningPreservation` |
| 18 | `OUTPUT_PUBLICATION_TARGET_INVALID` | `publicationTarget` |
| 19 | `COMMON_RENDER_PLAN_INVALID` | `commonRenderPlan` |

各codeは表のcheckだけが所有し、重複所有しない。併発時はcode順、pathのUTF-8 byte順、relatedIds連結byte順で並べる。全codeの発火検査と`export code集合 == test観測集合`完全一致を実装完了条件にする。

### 8.3 projection exact型

`timelineProjection`はnullまたは次の5 key。

1. `sourceMediaCount`: safe integer
2. `segmentCount`: safe integer
3. `outputFrameCount`: safe integer
4. `sourceToOutputMappingCanonicalSha256`: Sha256
5. `baseMediaFileSha256`: Sha256

`captionDisplayProjection`はnullまたは次の5 key。

1. `semanticCaptionCount`: safe integer
2. `displayPageCount`: safe integer
3. `displayLineCount`: safe integer
4. `maxObservedLogicalWidth`: safe integer
5. `captionPageLineMapCanonicalSha256`: Sha256

`meaningProjection`はnullまたは次の7 key。

1. `timelineSegmentCount`: safe integer
2. `captionCount`: safe integer
3. `titleState`: `empty / provided`
4. `semanticObservationCount`: safe integer
5. `captionTextSequenceCanonicalSha256`: Sha256
6. `captionTimingSequenceCanonicalSha256`: Sha256
7. `timelineCompositionCanonicalSha256`: Sha256

`resolvedStyleProjection`はnullまたは次の7 key。

1. `format`: 許可format
2. `screenLayoutId`: 横型null、縦型FormalId
3. `presetId`: FormalId
4. `visualStateId`: FormalId
5. `cropMode`: `identity / bound-decision`
6. `sceneTransitionMode`: `straight-cut-only`
7. `audioMode`: `preserve-source-only`

`renderPlanBinding`はnullまたはcompanion契約§3.3のJSON binding。accepted-for-render時は`presentation-output-render-plan-v001`を指す。

rejected時のnull規則を次へ固定する。

- `meaningProjection`: `meaningPackage`がpassedならnon-null、それ以外はnull。
- `timelineProjection`: `timelineFrameMapping`がpassedならnon-null、それ以外はnull。
- `captionDisplayProjection`: `captionDisplayTimeline`がpassedならnon-null、それ以外はnull。
- `resolvedStyleProjection`: `styleResolution`と`cropResolution`が両方passedならnon-null、それ以外はnull。
- `renderPlanBinding`: `commonRenderPlan`がpassedならnon-null、それ以外はnull。

後段失敗を理由に、既にpassedの前段projectionをnullへ戻さない。同じ入力・同じ実体から同じreport byteを得る。

### 8.4 CLI

- accepted-for-render: exit 0。
- 検査済みrejected: exit 1。
- I/O、実行環境、report不能: exit 2。
- 0/1はstdoutへreport 1件、stderr 0 byte。

fatal観測性v002は既存残件であり、今回の境界工事へ混ぜない。

## 9. 保証と非保証

accepted-for-renderが保証するもの:

- 意味packageとstyle入力を仕様どおり解決した。
- caption本文・source時刻、timeline構成、title、意味観測を変更していない。
- page・lineを連結するとcaption本文とAtomRef列に完全一致する。
- source→output frame写像は既存正本の結果である。
- preset、幅、crop、transitionを暗黙defaultへ置換していない。
- native planが共通描画coreへ渡せる。

保証しないもの:

- 人間にとって読みやすい。
- cropやtitle位置が美しい。
- 演出が作風に合う。
- 描画後QC合格。
- 配信できる完成品質。

見た目・聴こえ方・違和感の最終判断は完成物の通常確認へ載せる。境界専用の人間確認を増やさない。

## 10. 既存成果物との方式比較

| 方式 | 既存3本 | 新規生成 | 評価 |
|---|---|---|---|
| A. 新規専用入口＋native plan | byte不変で凍結 | 新契約だけ | **採用**。境界を作り、全面清書を先取りしない |
| B. 現行B3〜rendererを一括改訂 | 成果物は保持できるが現行27 file以上へ波及 | in-place | 不採用。2機能前の全面清書に近い |
| C. 旧→新converter | 再包装が必要 | 互換shimを維持 | 禁止。意味由来の読み替えになる |
| D. 新packageから旧B4 schemaを併産 | 保持 | 旧preset・幅・crop契約を温存 | 不採用。境界が名目だけになる |

採用方式:

- 既存3本とstable tagは変更しない。
- 旧B4経路は安定点再現用の凍結記録。
- 新入口は旧schemaを受理しない。
- 新経路は旧B4成果物を生成しない。
- 新経路が横型・縦型各1本で成立した後、旧入口を新規生成の選択肢から外す。
- 旧コードの整理・削除は2機能後のスケルトン再構築で行う。

## 11. 現行工程への影響

| 工程 | 現行 | 新契約での扱い |
|---|---|---|
| 組立決定 | base media生成用区間 | 新timeline composition decisionの意味入力。旧成果物は変換しない |
| retained source atoms | base media/timeline来歴を含む | 下書き期の意味package入力として再利用。表示frameは複写しない |
| B3 | style、幅、2行制約を意味入力へ格納 | source/segment scopeと意味境界候補だけを渡す新version |
| B5/B6 | 意味groupと画面行末を同時選択 | 意味group終端だけを選択。API transport規律は維持 |
| B1 | 意味・幅・行数を同時検査 | 意味、候補、全量被覆だけを検査 |
| B4 | 意味復元と表示計画を同時所有 | 旧B4は凍結。新package builderとoutput composerへ責務分割 |
| base media | 旧assembly decision・approval・basis edit planを受けて意味package前に生成 | meaning packageを受ける新規専用前段へ移す。旧job用artifactを偽造しない |
| crop | 既存base media上の選択packageとdecision | 新前段base media後に選択し、decision＋selection manifest＋base media SHAを正式requestで束縛 |
| 横型renderer | 明示済み行とpresetを消費 | native plan adapterから共通描画coreへ直結 |
| 縦型renderer | 明示行、preset、cropを消費 | native plan adapterから既存crop／overlay／共通coreへ直結 |
| 検査 | G1〜G3と物理QCがB4周辺で混在 | 意味不変検査と物理表現検査を境界で分離 |

現行production/testの表示項目参照は少なくとも27 fileで観測した。B4の1〜2 file変更だけで完了すると見積もらない。

## 12. 実装ファイル数の見込み

現時点の役割積み上げは、新規25 file＋既存pure export追加0〜2 file、合計**25〜27 fileの初期見込み**である。これは承認上限ではない。実装承認前の完全実装設計でpathと件数を固定する。

意味側 production／runner 6件:

1. timeline composition decision契約。
2. meaning package schema／validator／builder。
3. meaning package正式runner。
4. 意味境界専用B3 input builder。
5. 意味境界専用B5/B6 request・response処理。
6. 意味境界専用B1 compiler。

意味側 test 4件:

7. meaning package exact schema・AtomRef全量検査。
8. B3入力検査。
9. B5/B6 exact union・候補全量検査。
10. B1・package決定性検査。

出力側 production／runner 7件:

11. output base media job／manifest／receipt schemaと既存計算adapter。
12. output base media正式runner。
13. output request・report schema／validator。
14. caption→page→line composer。
15. 横型／縦型preset・crop能力resolver。
16. native render planとcommon core直接adapter。
17. formal output runner。

出力側 test／preflight 8件:

18. output base media新入口・旧job非偽装・frame/sample写像。
19. request／report exact schema・全code発火。
20. timeline subset・frame写像。
21. page／line完全分割。
22. 横型／縦型preset field差とcrop→base media束縛。
23. 旧B4成果物0件・common core直結。
24. 横型・縦型一気通貫。
25. 既存3本・stable tag不変。

既存変更候補は、参照するpure計算またはoverlay adapterのexportが不足する場合だけ最大2件。計算複製、旧schema受理、fallbackのための変更は含めない。

## 13. 人間作業

- 今回の設計認定: 1判断。
- 実装・機械回帰: 0件。
- 新経路の初回受入: 横型1本＋縦型1本の通常完成確認へ統合し、2判断。作業時間は各動画の再生尺＋回答操作30秒以内で、素材決定時に再申告する。
- 既存3本の再視聴・再認定: 0件。
- 非空titleを出力側v002で初めて有効化する時: 実行前下書きへの文言入力1件。見た目確認は同じ完成確認へ統合する。

## 14. 実装契約完全性チェック

| 項目 | 判定 | 根拠 |
|---|---|---|
| 目的との一致 | closed | DECISIONS 2026-08-03の意味／表現境界方針 |
| 意味package exact schema | closed | companion §3〜11 |
| output request exact schema | closed | 本書§3 |
| base media前段job・成功bundle | closed | 本書§3.2、§5.1 |
| timeline capability | closed | 本書§4 |
| source→output時刻写像 | closed | 本書§5、既存pure正本を参照 |
| caption→page→line全量 | closed | 本書§6〜7 |
| native plan・旧B4非併産 | closed | 本書§7 |
| acceptance report exact型 | closed | 本書§8 |
| 値レベル閉包 | closed | format、policy、key順、ID、数値tokenを§3〜8で固定 |
| 参照実体存在 | observed | base media timeline pure関数、crop関数、共通描画core、横縦registryを読取確認 |
| 工程間受け渡し | closed | package SHA→前段base media→crop/style→request→native plan→common core |
| 観測データ取得可能性 | closed | 正式入力、pure mapping、native plan、manifest、QCで観測しdebug公開面を増やさない |
| 数値区分 | closed | source時刻ms・幅・行数・frame/sampleは整数。crop・内部幾何だけ既存有限小数契約 |
| title空／非空 | closed | 空は非表示、非空でstyle未対応なら拒否 |
| G4〜G7 | closed for v001 | 空array限定。非空はv002まで拒否 |
| 旧新の関係 | closed | §10。変換、fallback、旧schema併産0 |
| 既存3本 | closed | tag tree SHA前後一致を実装完了条件にする |
| 人間未確認 | closed | acceptedを見た目合格と呼ばず、通常完成確認へ統合 |
| planner実装方式 | deferred | 契約合否は§6でclosed。local／AI方式と決定性は完全実装設計で固定 |
| base media失敗attemptのreport code・path | deferred | passed bundleへ混ぜず、完全実装設計で固定 |
| 実装path・file SHA・検査ID | deferred | §12は見込み。次の完全実装設計で一件表化し、未固定のまま実装へ進まない |
| secret・外部通信 | not applicable | 本設計作業は通信0。B5/B6実装時は既存secret・1回実行規律を再束縛 |

`deferred`項目は今回の設計範囲外であり、実装者判断で埋めることを許さない。次工程は完全実装設計の提示で必ず停止する。

### 14.1 承認済み文書のSHA照合

作業ツリーと`stable/vertical-first-clip-20260802`のbyte一致を確認した。

| 正本 | SHA-256 |
|---|---|
| 基礎映像＋timeline v002設計 | `69bbb4ed88d44be81107c3e5bc2ec3bca28ba8300e62eb04e19c2852eac4bc14` |
| retained source atoms実装設計 | `052fe49ac12f782ff893cf48acc6452ab80cf97c1c2c2ccd151a671267744402` |
| B4表示計画契約設計 | `d16aa8fb366157ef4be30a822831e95eaed5f3616d959f8b3751c74d72c86281` |
| B5最小設計v002 | `93bdc9e40ddf95b5cec9baba73501d9a0507d50a05329244c8123eb098e161cd` |
| B5 v004読みやすさ改訂 | `caf54f70f48849e5109a67e7135299118c15b5a529fb8eb0f5bc28d353bbbaa4` |
| 縦型5領域設計 | `db62f752ce19c5a727de9890898885a4e1a68b65ed500da5842de34b12cd6e69` |
| instruction／renderer境界契約v002 | `578dc405ed70a87c63ded9b1b7fb4205653c3c7c92974a7d127b20bb96648001` |
| renderer初期要求v002 | `b7bf442787221757d521aba49740ceda43cb563702ddc831c79242d18342fd52` |

新しい文書binding台帳や同一commit防御は作らない。DECISIONSの一行承認と対象文書SHAで足りる。

## 15. 事実・設計判断・未確認

事実:

- 現行rendererは純意味captionから正式なpage／line計画を作らない。
- 現行base media正式runnerは旧assembly decision、human approval、basis edit planを要求するため、新meaning packageをそのまま受けられない。
- 現行base media timelineは単一source、30/60fps入力、30fps出力、source順・非重複segmentを検査する。
- 共通描画core`executeValidatedPresentationDrawAndQcV001`、縦型crop計算、横型・縦型overlay adapterは実在する。
- 横型registryと縦型registryでは幅能力field名が異なる。
- 既存横型2本・縦型1本はstable tagで保持されている。

設計判断:

- 意味packageの表現能力は狭めず、暫定出力側の能力subsetを明示する。
- semantic captionを複数display pageへ分け、縦型の狭い表示に意味境界を従属させない。
- base mediaを出力側の前段生成へ移し、その生成物を見てcropを決めてから最終output requestを固定する。
- 新規生成だけをnative plan入口へ切り替え、旧B4 schemaを併産しない。
- 25〜27 fileは役割一件表から数えた初期見込みで、独自係数による推定ではない。

未確認:

- page／line plannerの具体方式と、人間目視での読みやすさ。
- 非空titleを表示する正式preset。
- G4〜G7非空観測とstyle AIの実接続。
- 複数source・非単調segment・segment別cropへの出力対応。
- 暗転、fade、SE等を含む出力側拡張。

## 16. 今回の停止点と承認依頼

設計提示で停止する。実装、API通信、既存成果物変更、正式package、base media生成、render plan、描画は行わない。

承認を求める事項は1件にまとめる。

> 意味情報パッケージ契約v001と出力側受け入れ契約v001を一組で承認し、新規生成専用・既存3本凍結・旧schema変換／fallback／併産なしの方式を実装設計の正本とする。次段は25〜27 file見込みをpath単位へ閉じる完全実装設計の提示までとし、実装・API通信・描画は別承認とする。
