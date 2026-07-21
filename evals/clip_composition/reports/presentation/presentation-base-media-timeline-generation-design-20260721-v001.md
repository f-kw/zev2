# 通常動画向け 基礎映像＋時間対応表生成 実装設計 v001

日付: 2026-07-21

状態: **人間承認済み。合成データ範囲の生成器・時間対応表v002・レンダラーv002入口を実装完了。実データ生成・実描画は未着手。**

人間作業: **設計承認1判断は完了。実装・検査工程の追加人間作業は0件。**

今回の1承認で実装するのは、次の3点だけである。

1. 人間承認済みの最終区間列から基礎映像を作る評価環境内生成器。
2. 30/60fpsの元動画を30fpsのframe番号で正確に対応付ける時間対応表v002。
3. 既存レンダラーの見た目を変えず、v002のframe番号を使う合成データ用入口。

**実データ生成・人間視聴・G4〜G7・LLM・本体接続は、この承認に含めない。**

## 1. 本来の目的

人間が最終的に承認した実行可能な映像区間列から、次の2成果物を必ず対で作る。

1. テロップや演出をまだ重ねていない、通常横長の基礎映像。
2. 元動画の各区間と元時刻が、基礎映像のどのframeへ移ったかを示す`presentation-base-media-timeline-v002`。

これにより、演出レンダラーが元動画の時刻を推測でずらしたり、基礎映像だけを人手で切り出して時間対応表を後付けしたりする経路をなくす。

本工程は、切り抜きとして使う場面を選び直さない。内部カットを考えない。旧テロップや旧縦型画面構成を再現しない。人間承認と同じhashに束縛された**最終区間列を、順序を変えずに連結することだけ**を担当する。

## 2. 成立済みの前提と、今回埋める穴

通常動画向け演出レンダラーv001は、合成された基礎映像と時間対応表v001を入力にして次を完了している。

- 新規17/17、既存83/83、合計100/100の自動検査。
- 1元動画、速度変更なし、出力側が連続する複数区間の明示写像。
- 基礎映像のhash・frame数照合。
- 透明画像、合成映像、音声packet、来歴、決定性の検査。

ただし、実データの基礎映像と時間対応表を作る正式前工程は存在しない。ここを手作業で補うと、レンダラー側の厳密契約を迂回できてしまう。本設計は、レンダラー実装設計§3.3および完了報告§7の最優先残件だけを扱う。

現行`EditPlanArtifact`単体には、人間がその区間列を承認した事実、調整後の最終区間列、未解決編集が0件である事実が入っていない。したがって、現行編集案をそのまま公開用の実行正本にはしない。本設計では、人間が認定したpayload hashを持つ新しい保存形式を入力境界に置く。

また、時間対応表v001は元時刻と出力時刻のミリ秒差を保持し、レンダラー側でそれぞれを30fpsへ丸める。区間の開始位相が異なると、区間全体のframe数が同じでも内部の発火点が1frameずれる反例が成立する。実データ候補の元動画は60fpsである一方、基礎映像は30fpsである。この2点を暗黙の許容差で隠さず、**30fpsの論理frameを正本にする時間対応表v002**へ改訂する。レンダラーはv002のframe写像を使う版へ更新し、ミリ秒へ戻して再丸めしない。

## 3. 責務境界

### 3.1 前工程が決め、保存すること

- 元になった編集案のfile hash。
- 1件の元動画の`sourceProvenance`、`sourceRef`、元URI、実file SHA-256。
- 実行する最終区間列。
- 未解決編集が0件であること。
- 人間が承認したpayloadのSHA-256と承認記録。
- 成功成果物を置く評価環境内の出力先。

この保存物を`presentation-base-media-assembly-decision-v001`と呼ぶ。その正式な保存工程は、実データゲートまでに別途成立させる。今回の合成実装では、人工データの決定を使って入力検査と生成器だけを作る。

### 3.2 本工程が決定的に行うこと

- 承認済み組立決定から、明示された元区間列だけを読む。
- 人間承認hash、未解決編集、元動画、元編集案とのbindingを検査する。
- 区間列の順序、長さ、重なり、元動画内への包含、30fpsでの表現可能性を検査する。
- 元動画から各区間を切り出し、同じ順序で隙間なく連結する。
- 基礎映像と時間対応表を対で生成する。
- 入出力、使用区間、tool版、hash、映像・音声検査結果をmanifestへ残す。

### 3.3 本工程が判断しないこと

- 候補の採否、外側境界の変更、区間の追加・削除・並べ替え。
- 「無音を詰める」「途中を切る」等の定性的な要求を、具体的な切断点へ変換すること。
- 発話本文、テロップ、演出、話者表示、G4〜G7、プリセットの決定。
- 旧`telopPlan`、旧`screenLayout`、題名、冒頭文、旧テロップ短文の描画。
- 別解像度の元動画を、独自の拡大・crop規則で1920×1080へ作り替えること。

## 4. 入力契約

CLIは`presentation-base-media-build-job-v001`を1件だけ受ける。

```json
{
  "schemaVersion": "presentation-base-media-build-job-v001",
  "jobId": "一意な実行ID",
  "assemblyDecision": {
    "path": "保存済みassembly-decision.json",
    "fileSha256": "64桁のSHA-256"
  },
  "sourceArtifact": {
    "sourceProvenance": "元STT・元入力選択から引き継ぐ識別子",
    "sourceRef": "元時間軸の一意な参照",
    "sourceUri": "元動画URI",
    "path": "元動画ファイル",
    "fileSha256": "64桁のSHA-256"
  },
  "outputDirectory": "評価環境内の新規出力先"
}
```

必須fieldの不足、未知field、空文字、hash形式不正を拒否する。path、ファイル名、配列位置から版・元動画・来歴を推測しない。

### 4.1 承認済み組立決定

`presentation-base-media-assembly-decision-v001`は、次の形を厳密に検査する。

```json
{
  "schemaVersion": "presentation-base-media-assembly-decision-v001",
  "decisionId": "一意な決定ID",
  "payload": {
    "basisEditPlan": {
      "kind": "edit_plan_json",
      "path": "由来となった編集案",
      "fileSha256": "64桁のSHA-256"
    },
    "sourceArtifact": {
      "sourceProvenance": "元入力から引き継いだ識別子",
      "sourceRef": "元時間軸の一意な参照",
      "sourceUri": "元動画URI",
      "fileSha256": "人間が承認対象に含めた元動画のSHA-256"
    },
    "segments": [
      {"sourceStartMs": 1000, "sourceEndMs": 4000}
    ],
    "unresolvedEdits": []
  },
  "approval": {
    "status": "approved",
    "approverType": "human",
    "recordId": "人間確認記録ID",
    "recordedAt": "ISO 8601",
    "targetPayloadSha256": "payloadのcanonical JSON SHA-256"
  }
}
```

- `approval.targetPayloadSha256`は`payload`のcanonical JSONと完全一致する。
- `unresolvedEdits`は空配列でなければならない。定性的な編集要求が残る決定は実行しない。
- job、決定payload、元動画の`sourceProvenance`、`sourceRef`、元URI、file SHA-256は完全一致する。承認後に同じURIを名乗る別byteへ差し替えることはできない。
- `basisEditPlan`は来歴であり、実行区間を読み直す正本ではない。実ファイルのkindとhashだけを照合する。
- `sourceProvenance`は元STT・元入力選択の識別子としてそのまま保持する。生成器版、編集案hash、区間列を連結して作り直さない。
- 承認recordは暗号署名ではない。信頼された人間確認保存工程が作った記録を、改変されていないpayloadへ機械的に束縛するものとする。

現行`EditPlanArtifact`の検査処理は、人間承認と未解決編集0件を証明できず、評価側の`.mjs`からTypeScript正本を読む実行依存も増やすため、本生成器の実行正本には使わない。編集案はhash固定した来歴としてだけ保持し、実行区間は新契約を唯一の正本とする。

### 4.2 受理しない入力

次は拒否する。

- `EditPlanArtifact`、`patch_json`、人間確認メモ、fixtureの`expectedCuts`を、承認済み組立決定の代わりに直接渡したもの。
- 人間確認結果の「無音・言い淀みを詰める」「途中を切る」等の種類だけを持ち、具体的な残存区間が無いもの。
- payload hashと承認対象hashが一致しないもの。
- 承認者種別が人間でないもの、未承認、却下、変更要求中のもの。
- `unresolvedEdits`が1件以上あるもの。
- 旧形式や未知形式を、近いfield名で読み替えさせるもの。

定性的な内部編集要求を勝手に具体化しない。人間が実行可能な最終区間列を改めて承認・保存した後に、新しいjobとしてやり直す。

### 4.3 1元動画の固定

- source artifactは1件だけ。複数元動画はv001で拒否する。
- `sourceRef`、元URI、`sourceProvenance`はjobで明示し、自動生成しない。
- 将来複数元動画へ対応する場合は、各区間とsourceを明示対応させる別版を先に設計する。

## 5. 区間列とframe写像の固定規則

`segments`の配列順を正本とし、生成器は並べ替えない。timelineの`segmentId`は入力順から`segment-0001`、`segment-0002`のように決定的に作る。初期版では次を全て満たす必要がある。

1. 開始・終了は整数で、各区間は正の長さ。
2. 配列は元動画時刻の昇順で、前区間と次区間に正の重なりがない。境界接触は許可する。
3. 各区間が元動画の観測尺内に完全に入る。
4. 速度変更、逆再生、同じ元場面の再利用、source順序の入替を許可しない。
5. 元区間の間に空きがある場合、その部分は明示的なカットである。出力側には空きを作らない。

映像の正本は30fpsの**論理source frame**とする。入力が30fpsなら入力frameをそのまま使い、60fpsなら時間軸0を起点として偶数番号のframeだけを採る。補間や近傍frameの独自選択は行わない。その他のfpsはv001で拒否する。

各区間は、既存の30fps丸め規則`frameBoundaryV001`で次のように写す。ただし入力は整数msしか持たず、60fpsのdecoded frame数が奇数の場合は媒体終端を整数msで厳密に表せない。そこで**終了端だけ**、`sourceEndMs`が`floor(decodedFrameCount * 1000 / inputFps)`と完全一致した場合を「decoded媒体終端の整数ms表現」とし、30fps論理frame総数へ写す。内部終端と開始端にはこの規則を適用しない。

```text
sourceStartFrame30 = frameBoundaryV001(sourceStartMs)
sourceEndFrame30 = decoded媒体終端ならlogicalFrameCount、その他はframeBoundaryV001(sourceEndMs)
outputStartFrame = それ以前の区間の論理frame数の合計
outputEndFrame = outputStartFrame + (sourceEndFrame30 - sourceStartFrame30)
```

媒体終端の特例は許容幅ではない。`sourceEndMs * inputFps <= decodedFrameCount * 1000`の有理比較を維持し、1msでも真の媒体尺を越える値は拒否する。各区間で`sourceEndFrame30 - sourceStartFrame30 > 0`を必須とする。元時刻の内部点は、一度ミリ秒の出力時刻へ変換せず、次の式で直接output frameへ写す。

```text
sourceFrame30 = frameBoundaryV001(sourceMs)
outputFrame = outputStartFrame + (sourceFrame30 - sourceStartFrame30)
```

時間対応表v002は、各segmentの`sourceStartFrame30`、`sourceEndFrame30`、`outputStartFrame`、`outputEndFrame`を正本として持つ。元の`sourceStartMs`・`sourceEndMs`は人間決定の来歴として併記するが、レンダラーは出力位置をミリ秒へ戻して再丸めしない。これにより、区間開始の位相が異なっても内部発火点の1frameずれを起こさない。

60fps入力では、元frame `2 * sourceStartFrame30`から`2 * sourceEndFrame30`までの偶数frameを採る。30fps入力では`sourceStartFrame30`から`sourceEndFrame30`までを採る。奇偶判定は必ず元動画全体のframe 0を起点に行い、segmentごとに番号をresetして選び直さない。非frame境界を含む合成検査で、区間境界だけでなく区間内部の複数発火点と人工色を照合する。

## 6. 出力契約とhashの一方向性

成功時は、1つの新規ディレクトリへ次を不可分な一組として確定する。

| 成果物 | 意味 |
|---|---|
| `base-media.mp4` | テロップ・演出を含まない1920×1080・30fpsの基礎映像 |
| `timeline.json` | `presentation-base-media-timeline-v002`に適合する元時刻・論理source frame→output frameの対応。基礎映像hashを参照 |
| `generation-manifest.json` | 入力、区間列、tool版、基礎映像hash、timeline hash、映像・音声検査、除外した旧演出fieldの来歴。自分自身とreportのhashは持たない |
| `validation-report.json` | manifest hashと検査結果を記録する終端report。自分自身のhashは持たない |

hash参照は次の有向関係だけにする。

```text
base-media <- timeline
base-media + timeline + 入力群 <- generation-manifest
base-media + timeline + generation-manifest <- validation-report
```

自己hashと相互hashの循環を禁止する。`generation-manifest.json`と`validation-report.json`自身の実file hashは、実装完了報告とGit commitで外側から記録する。

`timeline.json`のsegmentは、入力区間と同じ配列順・同じ件数で作る。1論理source frameを1 output frameへ写し、速度変更はない。`expectedFrameCount`は最後の`outputEndFrame`とする。

### 6.1 来歴ID

- `sourceProvenance`は承認済み組立決定から変更せず引き継ぐ。
- timeline IDと基礎映像artifact IDだけを、元動画hash、組立決定payload hash、入力順の区間列、本生成器版のcanonical JSONから決定的に作る。
- 実行日時、出力path、job ID、Gitの汚れ状態をID計算へ混ぜない。
- 実行環境の来歴はmanifestへ別記録する。
- 後続の解決パッケージ生成は、同じ`sourceProvenance`と`sourceRef`を使い、別名を手入力しない。

### 6.2 時間対応表v002とレンダラーの接続

時間対応表v002のtop-level、子object、segmentは次のfieldだけを持つ。省略、追加、近似field名を拒否する。

```json
{
  "schemaVersion": "presentation-base-media-timeline-v002",
  "timelineId": "決定的ID",
  "sourceProvenance": "承認済み組立決定から継承",
  "sourceRef": "承認済み組立決定から継承",
  "sourceFrameClock": {
    "inputFrameRate": "30/1 または 60/1",
    "logicalFrameRate": "30/1",
    "extractionRuleId": "source-frame-30fps-identity-v001 または source-frame-60fps-global-even-v001",
    "decodedFrameCount": 181
  },
  "baseMedia": {
    "artifactId": "決定的ID",
    "path": "base-media.mp4",
    "fileSha256": "64桁SHA-256",
    "frameRate": "30/1",
    "expectedFrameCount": 90
  },
  "segments": [
    {
      "segmentId": "segment-0001",
      "sourceStartMs": 1000,
      "sourceEndMs": 4000,
      "sourceStartFrame30": 30,
      "sourceEndFrame30": 120,
      "outputStartFrame": 0,
      "outputEndFrame": 90
    }
  ]
}
```

`inputFrameRate`と`extractionRuleId`の組合せは上記2通りだけ。`decodedFrameCount`は生成manifestが実mediaから観測した値と完全一致させる。targetの元ms半開区間は、先に人間由来msで1segment内へ完全包含されることを確認する。開始は`frameBoundaryV001`、終了は§5の媒体終端特例を含む同一関数で30fps論理frameへ写す。そのframe差が正の場合だけ、segmentのsource/output frame差で直接output frameへ移す。segmentをまたぐtarget、0frameへ潰れるtarget、timeline v001は拒否する。

既存レンダラーの意味検査、文字配置、preset、描画、音声stream-copyは変更しない。変更するのは、対象の元時刻を描画frameへ解決する入口だけである。

- `presentation-render-plan-v002`は、時間対応表v002の式で元時刻をoutput frameへ直接解決する。
- v001のように`outputStartMs`へ写してから30fpsへ再丸めしない。
- 同じtargetの開始・終了が1segment内へ一意に収まる既存制約は維持する。
- layout値、文字造形、preset、表示終了責務を変更しないため、新しい見た目previewの認定は要求しない。
- 新しい実行入口はv002だけを受け付ける。v001を自動変換するfallbackや二重受理を実装しない。v001実装と結果は実験記録として保持するが、正式な実データ入口には使わない。

現行`validatePresentationBaseMediaTimelineV001`へ互換viewを偽装して通さない。v002専用検査器を作り、既存v001検査で確立した1 source、hash、連続性、速度不変の意味検査を、frame正本として明示的に移す。

### 6.3 基礎映像生成manifestの外部契約

`generation-manifest.json`のschemaは`presentation-base-media-generation-manifest-v001`とし、top-levelを次のfieldへ固定する。

```json
{
  "schemaVersion": "presentation-base-media-generation-manifest-v001",
  "buildId": "論理build planから決めたID",
  "job": {"jobId": "...", "schemaVersion": "presentation-base-media-build-job-v001", "fileSha256": "..."},
  "source": {
    "sourceProvenance": "...",
    "sourceRef": "...",
    "sourceUri": "...",
    "path": "評価環境内相対path",
    "fileSha256": "...",
    "video": {"width": 1920, "height": 1080, "frameRate": "60/1", "timeBase": "1/60", "decodedFrameCount": 1, "firstPts": 0, "lastPts": 0, "rotation": 0},
    "audio": {
      "present": true,
      "codec": "aac",
      "sampleRate": 48000,
      "channels": 2,
      "channelLayout": "stereo",
      "timeBase": "1/48000",
      "firstDecodedPts": 312,
      "lastDecodedPts": 312,
      "presentationClock": {
        "authority": "stream-and-packet-v001",
        "endSample": 192000,
        "streamEndSample": 192000,
        "packetEndSample": 192000,
        "skipSamples": 1024,
        "discardPadding": 0
      }
    }
  },
  "assemblyDecision": {"decisionId": "...", "fileSha256": "...", "payloadSha256": "...", "approvalRecordId": "..."},
  "basisEditPlan": {"kind": "edit_plan_json", "path": "...", "fileSha256": "..."},
  "segments": [
    {
      "segmentId": "segment-0001",
      "sourceStartMs": 1000,
      "sourceEndMs": 4000,
      "sourceStartFrame30": 30,
      "sourceEndFrame30": 120,
      "outputStartFrame": 0,
      "outputEndFrame": 90,
      "audioSamples": {"sourceStart": 48000, "sourceEnd": 192000, "outputStart": 0, "outputEnd": 144000}
    }
  ],
  "audio": {
    "present": true,
    "sampleRate": 48000,
    "channels": 2,
    "channelLayout": "stereo",
    "channelOrder": ["FL", "FR"],
    "canonicalPcmFormat": {"sampleFormat": "f32le", "packing": "interleaved"},
    "insertedSilenceSpans": [{"startSample": 0, "endSample": 312}],
    "sourceGrid": {"sampleCount": 192000, "byteCount": 1536000, "payloadSha256": "...", "decodedSampleCount": 192608, "decodedTailPaddingSampleCount": 608},
    "encodeInput": {"sampleCount": 144000, "byteCount": 1152000, "payloadSha256": "..."},
    "encoded": {
      "codec": "aac",
      "bitRate": "192k",
      "movieTimeScale": 30,
      "timeBase": "1/48000",
      "startPts": 0,
      "durationTs": 144000,
      "containerDurationSamples": 144000,
      "presentationDurationSamples": 144000,
      "videoPresentationDurationSamples": 144000,
      "trailingVideoOnlySampleCount": 0,
      "tailPolicy": "frame-aligned-v001",
      "rawDecodedSampleCount": 144384,
      "effectiveDecodedSampleCount": 144000,
      "effectiveDecodedPayloadSha256": "...",
      "packetPayloadSha256": "...",
      "skipSamples": 1024,
      "discardPadding": 0,
      "encoderDelay": 1024
    }
  },
  "execution": {
    "commands": [
      {
        "stage": "video-build",
        "tool": "ffmpeg",
        "arguments": ["...", "<SOURCE_MEDIA>", "...", "<TEMP_VIDEO>"],
        "filterGraph": "実際に使用した固定filter graph"
      }
    ],
    "trustedSourceFiles": [
      {"role": "renderer-v001-encode-source", "path": "evals/clip_composition/render_presentation_v001.mjs", "fileSha256": "..."},
      {"role": "preview-builder-aac-source", "path": "evals/clip_composition/build_presentation_initial_preset_review.mjs", "fileSha256": "..."},
      {"role": "caption-canonical-json-source", "path": "evals/clip_composition/presentation_caption_contract_v002.mjs", "fileSha256": "..."}
    ]
  },
  "tools": {
    "expected": {"nodeVersion": "v20.19.6", "ffmpegVersion": "...", "ffprobeVersion": "..."},
    "observed": {"nodeVersion": "v20.19.6", "ffmpegVersion": "...", "ffprobeVersion": "..."}
  },
  "versions": {"generatorVersion": "presentation-base-media-builder-v001", "timelineCheckerVersion": "presentation-base-media-timeline-checker-v002"},
  "git": {"head": "40桁commit ID", "dirty": true},
  "implementationFiles": [{"path": "evals/clip_composition/...", "fileSha256": "..."}],
  "outputs": {
    "baseMedia": {"artifactId": "...", "path": "base-media.mp4", "fileSha256": "...", "frameRate": "30/1", "frameCount": 90, "audioPacketPayloadSha256": "..."},
    "timeline": {"timelineId": "...", "schemaVersion": "presentation-base-media-timeline-v002", "path": "timeline.json", "fileSha256": "..."}
  },
  "excludedLegacyFields": ["screenLayout", "telopPlan"]
}
```

- `source`は上記fieldだけを持つ。音声なしの場合、子`audio`は`{"present": false}`だけとする。音声ありの場合、`presentationClock`はstream終端と全packet終端がsample単位で完全一致した`stream-and-packet-v001`だけを許す。時計が取れないcodecをdecoded frame長へfallbackしない。skip/discardは既にpacket時計へ反映された診断事実として記録し、終端から再減算しない。
- `assemblyDecision`はdecision ID、file SHA-256、payload SHA-256、承認record IDだけを持つ。
- `basisEditPlan`はkind、相対path、file SHA-256だけを持つ。
- `segments`は上記8 fieldを入力順で持つ。音声なしの場合の`audioSamples`は`null`とする。
- top-level `audio`は音声なしなら`{"present": false}`だけ。音声ありなら上記fieldだけを持つ。`sourceGrid.sampleCount`は提示終端で物理的に切ったcanonical PCM長、`decodedSampleCount`は切断前のdecoder出力長、両者の差は`decodedTailPaddingSampleCount`と一致させる。`containerDurationSamples`、`presentationDurationSamples`、`videoPresentationDurationSamples`を混同せず、映像だけの末尾を`trailingVideoOnlySampleCount`へ記録する。`skipSamples`、`discardPadding`、`encoderDelay`は診断値であり、合否の減算式へ使わない。
- `job`、`versions`、`git`は上記fieldだけを持つ。`tools`は§7.3の期待値と実測値、`implementationFiles`は実行した評価環境内fileの相対pathとSHA-256を固定順で持つ。
- `execution`は実行したFFmpeg工程を固定順で持つ。音声なしは`video-build`、音声ありは`video-build`→`audio-grid`→`audio-mux`だけを許し、実pathは固定placeholderへ置換する。`trustedSourceFiles`は上記3件のrole・path・承認時hashを固定順で持つ。
- `outputs`は上記2子objectとfieldだけを持つ。音声なしの場合の`audioPacketPayloadSha256`は`null`とする。manifest自身とvalidation reportを参照しない。
- `excludedLegacyFields`は旧テロップ・旧画面構成等、実行へ渡さなかったfield名を固定順で持つ。

各子objectの正確なfield集合は上記列挙から増減させず、合成fixtureでunknown/missing fieldを拒否する。レンダラーv002はこのmanifestをjobからfile SHA-256付きで受け、timeline・基礎映像・source来歴・tool版を相互照合する。

### 6.4 検証reportの外部契約

`validation-report.json`は`presentation-base-media-validation-report-v001`とし、top-levelを`schemaVersion`、`buildId`、`status`、`violations`、`inputs`、`outputs`、`checks`の7 fieldへ固定する。

```json
{
  "schemaVersion": "presentation-base-media-validation-report-v001",
  "buildId": "generation-manifestと同じID",
  "status": "passed",
  "violations": [],
  "inputs": {
    "assemblyDecision": {"path": "...", "fileSha256": "...", "payloadSha256": "..."},
    "basisEditPlan": {"path": "...", "fileSha256": "..."},
    "sourceMedia": {"path": "...", "fileSha256": "..."}
  },
  "outputs": {
    "baseMedia": {"artifactId": "...", "path": "base-media.mp4", "fileSha256": "..."},
    "timeline": {"timelineId": "...", "path": "timeline.json", "fileSha256": "..."},
    "generationManifest": {"buildId": "...", "path": "generation-manifest.json", "fileSha256": "..."}
  },
  "checks": {
    "approvalBinding": {"status": "passed", "violationCodes": []},
    "sourceBinding": {"status": "passed", "violationCodes": []},
    "videoQc": {"status": "passed", "violationCodes": []},
    "audioQc": {"status": "passed", "violationCodes": []},
    "timelineQc": {"status": "passed", "violationCodes": []},
    "hashGraph": {"status": "passed", "violationCodes": []},
    "publishPreconditions": {"status": "passed", "violationCodes": []}
  }
}
```

失敗reportもtop-levelは同じ7 fieldを使い、`status`を`failed`、各違反を`code`、`path`、`relatedIds`、`details`の4 fieldへ固定する。`details`が無い場合も`null`を置く。初期失敗で未確定の事実を捏造しないため、失敗reportに限り`buildId`を`null`にできる。`inputs`は3つ、`outputs`は3つの子field名を必ず維持し、まだ安全に読めていない入力または未生成の成果物の**子値全体**を`null`にする。部分的な仮objectは作らない。各checkも上記7件を省略せず、未到達は`status: "not_run"`とその理由コードを記録する。成功reportではこれらの`null`を一切許可しない。

`publishPreconditions`が意味するのは、同一親の一時ディレクトリ、lock保持、最終先不在、全成果物hash確定までである。ディレクトリrenameの成功はreport生成後に起きるため、report内で成功済みと偽らない。rename成功はCLI終了値と実装完了報告から外側に記録し、report自身のSHA-256も同じ外側で記録する。validation reportは自分自身のhashを持たない。

### 6.5 レンダラーv002の外部契約と成果物名

新入口は`presentation-render-job-v002`だけを受ける。top-level fieldは次の8件に固定する。

```json
{
  "schemaVersion": "presentation-render-job-v002",
  "instructionBundle": {"path": "...", "fileSha256": "..."},
  "registryBinding": {"path": "...", "fileSha256": "..."},
  "presetRegistry": {"path": "...", "canonicalSha256": "..."},
  "resolutionGenerationManifest": {"path": "...", "fileSha256": "..."},
  "baseMediaGenerationManifest": {"path": "...", "fileSha256": "..."},
  "baseMediaTimeline": {"path": "...", "fileSha256": "..."},
  "outputDirectory": "評価環境内の新規出力先"
}
```

rendererの外部版とfile名は次へ固定する。

| 対象 | v002での固定値 |
|---|---|
| renderer版 | `presentation-renderer-v002` |
| timeline検査report | `presentation-base-media-timeline-report-v002` |
| plan build report | `presentation-render-plan-build-report-v002` |
| 最終plan | `presentation-render-plan-v002` / `presentation-render-plan-v002.json` |
| 適用結果 | `presentation-render-application-results-v002` / `presentation-render-application-results-v002.json` |
| render manifest | `presentation-render-manifest-v002` / `presentation-render-manifest-v002.json` |
| 描画済み動画 | `presentation-rendered-v002.mp4` |
| failure report | `presentation-render-failure-v002` / `presentation-render-failure-v002.json` |
| overlay directory | `overlays`（変更なし） |
| 描画後QC | `presentation-render-qc-v002` / `presentation-render-qc-v002.json` |
| overlay props・描画entry | v001（見た目を変更しないため変更なし） |

plan build report内の描画前planは`presentation-render-plan-draft-v002`とし、最終fileとはschemaを分ける。描画前planと最終planのtop-level fieldは、`schemaVersion`、`rendererVersion`、`instructionSetId`、`resolutionPackageId`、`timelineId`、`timelineSchemaVersion`、`presetRegistryVersion`、`format`、`canvas`、`layoutRules`、`elements`の11件だけとする。

各elementは`instructionId`、`kind`、`text`、`indexedLines`、`sourceStartMs`、`sourceEndMs`、`startFrame`、`endFrameExclusive`、`displayFrameCount`、`requestedPresetId`、`appliedPresetId`、`presetId`、`registryVersion`、`presetRegistryVersion`、`stateId`、`visualState`、`transition`、`timelineSegmentId`、`targetProvenance`、`materialRefs`の20件だけを描画前に持つ。最終planのelementだけが21件目の`overlaySha256`を持つ。v001の`outputStartMs`・`outputEndMs`は削除し、3つのframe値を唯一の出力時刻正本とする。各nested objectの契約、instruction、本文index、preset、visual state、transition、target来歴、material参照の意味はv001から変更しない。

適用結果v002はv001と同じ厳密field集合を維持し、schema版と`finalPlanElementReference.planFile`だけをv002へ更新する。

render manifest v002のtop-levelは、`schemaVersion`、`rendererVersion`、`rendererTrustCanonicalSha256`、`git`、`rendererFiles`、`tools`、`trustedAppearance`、`inputs`、`instructionSetId`、`resolutionPackageId`、`resolutionPackageCanonicalSha256`、`resolutionPackageGenerationManifestFileSha256`、`baseMediaBuildId`、`baseMediaGenerationManifestFileSha256`、`baseMediaToolVerification`、`timelineId`、`presetRegistryVersion`、`output`の18 fieldだけとする。`inputs`はv001の7 fieldへ`baseMediaGenerationManifest: {path, fileSha256}`を追加した8 fieldとし、その位置でjob入力を記録する。`baseMediaBuildId`と`baseMediaGenerationManifestFileSha256`は照合対象をtop-levelでも一意に示す。

`baseMediaToolVerification`は`status`、`expected`、`observed`の3 fieldだけを持つ。`status`は`passed`だけを成功manifestで許可し、`expected`と`observed`はそれぞれ`nodeVersion`、`ffmpegVersion`、`ffprobeVersion`の3 fieldを持つ。その他のtop-level、`inputs`以外の子object、`output`の厳密field集合は承認時hashのv001から変更せず、成果物file名だけを上表のv002へ更新する。

現行QC v001はplan file名`presentation-render-plan-v001.json`を固定検査するため、v002へそのまま流用しない。`presentation_renderer_qc_v002.mjs`を別契約として作り、schemaと期待plan file名だけを上表のv002へ更新する。重なり、画面外、欠落、音声packet、適用結果照合の式・閾値・違反コードはv001から変更しない。QC v1へv2名を偽装せず、QC v001実装と既存結果は無変更で保持する。

基準にするv001実装は、承認時hash `13dc1c76ccdca415cb398ba1f3e0cb77e8cac5918f92c3647a273c4a6e4a281d`の`render_presentation_v001.mjs`である。ここに列挙していないschema、field、file名を実装時の判断で変えない。v2-only入口はv001 job、timeline、planを受理せず、自動変換もしない。

## 7. 映像・音声の組み立て

### 7.1 入力mediaの事前検査

- 実ファイルのSHA-256がjobと一致する。
- 映像streamが1件で、1920×1080、`r_frame_rate`と`avg_frame_rate`がともに30/1または60/1のCFR、先頭frameが0の時間軸である。
- 全decoded video frameのPTS列が、申告fpsの連続frame indexへ一意に対応する。
- 音声streamは0件または1件。複数音声streamは初期版で拒否する。
- 音声がある場合のsample rateは44,100Hzまたは48,000Hz、channel layoutはmonoまたはstereoだけを受け付ける。AAC encoderが暗黙にrate・channel数・channel orderを変換する入力は受け付けず、出力にも同じ値を明示する。
- decoded音声の先頭PTSが0であることは要求しない。decoded frameごとのPTSとsample数を元動画のpresentation time上のsample gridへ厳密に写し、PTSの逆転・負値・sample区間の重複は拒否する。正の空白は無音として同じ長さを保持し、区間ごとの開始・終了をmanifestへ記録する。現行YouTube由来Opusのように先頭audio PTSが映像frame 0より後でも、発話を前へ詰めない。
- 音声の提示終端はstreamの開始・durationと全packetのPTS・durationをsampleへ厳密換算し、双方の終端が完全一致した場合だけ確定する。decoderがcodec frame幅へ展開した物理長は提示終端の正本にしない。時計の欠落・不一致をdecoded尺へfallbackせず拒否する。
- rotation等により表示向きの解釈が必要なmediaは拒否する。
- FFprobeで観測した尺が全区間を含む。

1920×1080以外を独自のcrop・拡大で救わない。別解像度を受け入れる場合は、正規化規則を版付きで設計し、実描画previewと人間認定を先に行う。

### 7.2 組み立て方法

- 映像は、§5の規則で30fps論理frameを決定的に抽出し、`setpts`後に入力順でconcatする。
- 出力は1920×1080・30fpsとする。画角変更、crop、拡大、速度変更、色補正は行わない。
- 映像encode引数は、承認済みレンダラーv001と同じ`libx264 / preset fast / CRF 20 / yuv420p / +faststart`を固定する。由来正本`render_presentation_v001.mjs`の承認時file hash `13dc1c76ccdca415cb398ba1f3e0cb77e8cac5918f92c3647a273c4a6e4a281d`と実byteを起動時に完全一致検査する。
- 音声境界を人間決定の生msから独立に丸めない。`samplesPerVideoFrame = sourceSampleRate / 30`を整数として求め、§5の実効映像frame境界から音声境界も決める。
- 各区間に、元動画のpresentation time 0を起点とする`sourceStartSampleOnPresentationClock = sourceStartFrame30 * samplesPerVideoFrame`、`sourceEndSampleOnPresentationClock = sourceEndFrame30 * samplesPerVideoFrame`と、出力先頭を起点とする`outputStartSample = outputStartFrame * samplesPerVideoFrame`、`outputEndSample = outputFrame差に対応するsample終端`を作る。通常区間では全端点は非負整数、各区間長は正、source/output区間長は一致し、outputは連続でなければならない。
- 唯一の例外として、最後のsegmentが§5のdecoded媒体終端に一致し、最後の論理映像frameの音声窓より実在PCM gridが短い場合は、**実在する最後sampleまでだけ**をsource/outputへコピーする。無音paddingを作らず、途中segmentや媒体終端以外の不足は従来どおり拒否する。映像尺、MP4 containerが宣言する音声track尺、実AAC packetのpresentation尺、映像だけが残る末尾sample数、適用したtail policyを別々にmanifestへ記録する。
- decode後、`aresample=first_pts=0:min_hard_comp=0:max_soft_comp=0`を固定してpresentation time 0起点の連続PCM gridを作る。soft stretchは使わず、PTSの正の空白だけを同長のzero sampleで埋める。追加した無音区間をmanifestへ保存し、元音声streamが無い入力へ新しい音声trackを作る処理とは分離する。
- 連続gridは`f32le`・interleaved・元channel order不変をcanonical PCM表現とし、sample数・byte数・SHA-256を保存する。そのgridを上記frame由来sample境界でsample ordinal trimし、時刻を0へresetして入力順でconcatする。これにより、先頭audio PTSが0でない元動画でも内容を前へずらさず、映像と音声を同じframe境界で切り替え、複数区間で位相差を累積させない。
- 音声encodeは、人間が実描画previewで確認済みの媒体生成と同じ`AAC / 192k`を固定する。出力sample rate・channel layout・channel orderは入力と同じ値を明示し、自動変換を禁止する。MP4のmovie time scaleは出力fpsと同じ30へ固定し、1frame単位の音声尺を既定1000単位へ丸めない。由来正本`build_presentation_initial_preset_review.mjs`の承認時file hash `97cd4c4cfb2369103228c5156297b3b7a8ea2f14746f0ebd58927074f7ca2646`と実byteを起動時に完全一致検査する。
- 元動画に音声が無ければ無音を創作しない。
- metadataは成果物の意味に不要な実行日時を持たせない。FFmpeg filter graphと引数配列をmanifestへ保存する。
- shell文字列を組み立てず、引数配列または固定filter scriptを使う。

AAC encode前に、連結済みPCMのsample frame数とpayload SHA-256を正本として保存し、本節の導出値へ完全一致させる。AACは1024 sample単位のencoder delay・末尾paddingを持ち得るため、**復号した生sample総数そのもの**を導出値と同一とは主張しない。また、decoderが既に適用したskipをpacket情報からもう一度差し引く算式も使わない。

AAC後の合格条件は次の1経路へ固定する。

1. 実AAC packetの0以降のPTSとdurationが連続し、packetが示すpresentation sample数がencode前PCMのsample数と完全一致する。期待終端より後のpacketを許可しない。
2. AACを通常decodeした後、出力先頭からencode前PCMと同じsample数へ**明示的にtrim**する。この有効範囲のdecoded sample数が期待値と一致することを検査し、そのpayload SHA-256を記録する。lossy encodeなのでencode前PCMのhashとの一致は要求しない。
3. containerのdurationは実packet尺以上・映像尺以下を必須とし、実packet尺との差を音声の創作とは数えない。通常区間では実packet尺と映像尺が一致しなければならない。§5の媒体終端特例だけは、映像尺から実packet尺を引いた非負差を`trailingVideoOnlySampleCount`として明示する。
4. trim前の生decode sample数、container duration、packet presentation duration、skip samples、discard padding、encoder delayは別々の診断値として記録し、相互に減算して都合のよい合否値を作らない。

44,100Hz・48,000Hzそれぞれについて、1frame・2frameという非1024倍のsample数を持つ合成音声で検査する。raw decodeには末尾paddingが現れても、containerのpresentation durationと明示trim後の有効sample数が期待値へ一致しなければならない。durationをsample数へ一意に変換できない場合や、明示trim後に期待数を得られない場合は独自許容幅で通さず停止する。各streamの先頭PTS、末尾PTS、duration、time base、音声packet payload SHA-256も記録する。演出レンダラーは、この検査済み基礎音声をstream copyして保持する。

### 7.3 実行toolの信頼固定

基礎映像生成器は、承認済みrenderer trustと同じ次の値をコード定数として持つ。jobや環境変数から差し替えられない。

- Node: `v20.19.6`
- FFmpeg: `ffmpeg version 8.0.1 Copyright (c) 2000-2025 the FFmpeg developers`
- FFprobe: `ffprobe version 8.0.1 Copyright (c) 2007-2025 the FFmpeg developers`

起動直後に実測した3値が完全一致しなければ、mediaを開く前に停止する。基礎映像生成manifestには、実測値と期待値を両方保存する。レンダラーv002もこのmanifestを入力としてhash固定し、3値が同じ期待値へ一致しなければ描画を開始しない。後からrendererだけを承認環境へ戻して、別toolで作った基礎映像を通すことはできない。

## 8. 生成後検査

成功確定前に、少なくとも次を個別に検査する。

1. 組立決定、元編集案、元動画、jobの実byte hash。
2. 人間承認payload hashと`unresolvedEdits: []`。
3. 生成された基礎映像のfile SHA-256。
4. 映像stream 1件、1920×1080、30fps、区間別frame数、想定総frame数との一致。
5. 人工色検査で各区間の先頭・末尾frameと遷移順が正しいこと。
6. 元動画に音声がある場合は出力音声1件、無い場合は出力音声0件。
7. 音声がある場合は、選択区間のPTS被覆、encode前PCMのsample数・hash、AAC containerのpresentation duration、期待数へ明示trimしたdecode sample数・hash、raw decodeとskip/discardの診断値、人工周波数の区間順、先頭・末尾PTS、packet payloadを記録・検査。
8. timelineのsource/output frame数、順序、連続性、1 source制限、区間内部のframe写像。
9. `validatePresentationBaseMediaTimelineV002`へ実ファイルのhash・frame数を渡した結果が`passed`。
10. manifestのsegment列とtimelineのsegment列の完全一致。
11. 旧テロップ・旧画面構成が基礎映像の描画工程へ渡されていないこと。
12. 成功成果物が全て同じ組立決定と同じ来歴IDを参照していること。
13. §6のhash参照が一方向で、自己hash・相互循環を持たないこと。

## 9. path安全性と原子的な成果物確定

- job、組立決定、元編集案のJSON入力は`evals/clip_composition/`配下に限定する。CLIはjob file pathを受け、job自体もread前に同じ検査を通す。
- 元動画入力は`evals/clip_composition/research/downloads/`または`evals/clip_composition/testdata/`配下に限定する。
- 出力先は`evals/clip_composition/outputs/presentation/base-media/`配下の新規ディレクトリに限定する。
- workspaceから入力・出力までの全階層についてsymlinkを拒否し、実体pathが許可root内にあることを確認する。
- すべての入力は、open・read・hashより前に許可root、realpath、全祖先symlinkを検査する。安全性未確認のpathを読んでから拒否しない。
- 既存の成功ディレクトリへ上書きしない。同じjob IDが存在する場合も先勝ち・追記をせず停止する。
- 出力jobごとに同一親のlock fileを排他的作成で取得する。lock取得後に、公開成果物だけを置くpublication temporary directoryと、source snapshot・encode中間物を置くworking directoryを分けて作る。lockのfile handleはfinallyでcloseするが、lock path、working directory、失敗時のpublication temporary directoryは成功・失敗とも自動unlink・自動削除しない。path検査と削除の間のsymlink競合をNodeのpath APIだけで完全に閉じられないため、**掃除より安全を優先し、安全を証明できない外部pathへ削除操作を出さない**ことを契約とする。残留pathは実行戻り値`retainedBuildPaths`と失敗reportの第1違反detailsへ記録し、既存出力またはlockがある再実行は従来どおり停止する。
- 最終pathを先に決め、JSONには最終ディレクトリからの相対pathだけを記録する。一時pathは成果物へ残さない。
- 最終出力と同じ親のpublication temporary directoryへ公開成果物だけを生成する。rename直前には最終path自身だけでなく、workspaceから出力・一時先までの全親階層についてsymlink、realpath許可root、同一実親、最終先不在を再検査し、全検査合格後にディレクトリ単位でrenameする。
- 失敗時は成功名のMP4、timeline、manifestを残さない。診断reportは`outputs/presentation/base-media-failures/`配下へ別保存し、残留したpublication temporary directory・working directory・lockは診断pathとして保持する。
- fixture、expected、confirmed、正式preset/material台帳、信頼binding、runner、本体を変更しない。

## 10. 検査順と違反コード

検査は次の順で行い、前段の汎用例外で後段の固有違反を覆い隠さない。

1. job JSON parseと厳密schema。
2. 組立決定、元編集案、元動画、出力先のpath安全性。入力はここを通るまで読まない。
3. 組立決定file hash、JSON parse、厳密schema。
4. approvalの値とpayload hash。
5. `unresolvedEdits`。
6. 元編集案と元動画のhash、組立決定とのbinding。
7. 区間列とframe/sample写像、media形式。
8. FFmpeg生成、生成後QC、原子的確定。

初期版は少なくとも次の意味を別コードで固定し、未知エラーへまとめない。

| 違反 | 意味 |
|---|---|
| `BASE_MEDIA_JOB_INVALID` | jobのschema、必須field、未知fieldが不正 |
| `ASSEMBLY_DECISION_INVALID` | 組立決定のschema、必須field、未知fieldが不正 |
| `ASSEMBLY_DECISION_HASH_MISMATCH` | 組立決定の実byteがjobの申告hashと不一致 |
| `ASSEMBLY_DECISION_APPROVAL_INVALID` | 人間承認状態・対象payload hashが不正 |
| `ASSEMBLY_DECISION_UNRESOLVED_EDITS` | 未解決編集が1件以上残る |
| `ASSEMBLY_DECISION_BASIS_MISMATCH` | 元編集案のkind・実byte hashが決定payloadと不一致 |
| `BASE_MEDIA_SOURCE_BINDING_MISMATCH` | 来歴、元参照、元URI、元動画hashのbindingが不一致 |
| `BASE_MEDIA_SEGMENT_INVALID` | 区間が整数・正長等の条件を満たさない |
| `BASE_MEDIA_SEGMENT_ORDER_INVALID` | 入力順が昇順でない、または正の重なりがある |
| `BASE_MEDIA_SEGMENT_OUT_OF_SOURCE` | 元動画の観測尺外を参照 |
| `BASE_MEDIA_FRAME_MAPPING_UNREPRESENTABLE` | 30fps論理source frameへ一意に写せない、または内部frame写像が不正 |
| `BASE_MEDIA_FORMAT_UNSUPPORTED` | 解像度、CFR、stream数、PTS、rotation等が初期版外 |
| `BASE_MEDIA_AUDIO_SOURCE_CLOCK_INVALID` | decoded音声のPTSが負・逆転・重複、またはsample gridへ厳密に写せない |
| `BASE_MEDIA_TOOL_PROFILE_MISMATCH` | Node・FFmpeg・FFprobe、承認時のencode由来file hash、固定引数列のいずれかが不一致 |
| `BASE_MEDIA_GENERATION_MANIFEST_INVALID` | §6.3の厳密field、来歴、tool、成果物対応を満たさない |
| `BASE_MEDIA_INPUT_PATH_UNSAFE` | 入力が許可root外またはsymlink |
| `BASE_MEDIA_OUTPUT_PATH_UNSAFE` | 出力が許可root外、symlink、既存成功先への衝突 |
| `BASE_MEDIA_OUTPUT_LOCK_CONFLICT` | 同じ成功先を別processが確保済み |
| `BASE_MEDIA_BUILD_FAILED` | FFmpeg処理自体が失敗 |
| `BASE_MEDIA_VIDEO_QC_FAILED` | 解像度、fps、区間別frame、総frame等が不一致 |
| `BASE_MEDIA_AUDIO_QC_FAILED` | 音声stream、sample数、順序、PTS等が不一致 |
| `BASE_MEDIA_TIMELINE_QC_FAILED` | v002 timeline検査器またはmanifest対照に不合格 |
| `BASE_MEDIA_HASH_GRAPH_INVALID` | 成果物hash参照に自己参照または循環がある |
| `BASE_MEDIA_ATOMIC_COMMIT_FAILED` | 検査済み一式を不可分に確定できない |

exportした固有コード集合と、合成testで実際に発火させたコード集合の完全一致を検査する。

## 11. 決定性と生成manifest

決定性は、実行IDと出力pathを含むjob byteではなく、承認済みpayload、元動画hash、元編集案hash、生成器版から作る**論理build plan**に対して検査する。同じ論理build planを、異なるjob IDと2つの新規sandbox出力先で生成する。

MP4のbyte一致はエンコーダーとcontainer metadataの影響を受けるため完了条件にしない。各runの実file hashは、timelineと来歴の照合に使い、そのrunのmanifestへ記録する。

2回の生成では次の意味内容が一致することを完了条件とする。

- 入力区間列、30fps論理source→output frame写像、区間別audio sample frame写像、ID。
- 基礎映像をdecodeしたframe payload、frame数、映像stream情報。
- 音声がある場合のPTS被覆、encode前PCM payload・sample数・区間順、AAC containerのpresentation duration、期待数へ明示trimしたdecode payload・sample数、音声stream情報。
- 基礎映像の実file hash欄を除いた論理timeline。
- job ID、出力path、実file hash、実行環境欄を除いたmanifestの論理内容。
- validation status、違反集合、QCの意味内容。

manifestには次を残す。

- job ID・schema版・job file SHA-256。
- 組立決定ID、file SHA-256、payload SHA-256、人間承認record ID、承認対象に含まれる元動画SHA-256。
- 元編集案のkind、file SHA-256。
- 元動画のsourceProvenance、sourceRef、元URI、相対path、file SHA-256、観測media情報。
- 入力順の区間列、30fps論理frame写像、presentation clock上のaudio sample写像、各区間の出力対応。
- 新演出へ持ち越さなかった旧field一覧。
- 生成器版、timeline検査器版、Node、FFmpeg、FFprobe、Git HEAD、実装ファイルhash、固定encode由来file hash。
- 基礎映像とtimelineの相対path・実file hash。
- 映像・音声QCの生値。

manifest自身とvalidation reportのhashはmanifestへ入れない。

## 12. 実装配置と合成検査

承認後も変更は`evals/clip_composition/`内だけに置く。

| 新設候補 | 処理の意味 |
|---|---|
| `presentation_base_media_build_v001.mjs` | job・承認済み組立決定・元mediaを検査し、基礎映像とtimelineを原子的に生成するCLI |
| `presentation_base_media_build_v001.test.mjs` | 正常系、異常系、実media、決定性の合成検査 |
| `testdata/presentation-base-media-build-v001/` | 人工色・人工周波数を持つ1元動画、合成編集案、合成承認決定 |
| `presentation_base_media_timeline_v002.mjs` | 30fps論理source frameとoutput frameの厳密な対応検査・写像 |
| `presentation_renderer_plan_v002.mjs` | 指示対象の元時刻をv002 timelineから描画frameへ直接解決する計画器 |
| `presentation_renderer_qc_v002.mjs` | v002 plan file名を検査し、v001と同じ描画後QC規則を別schemaで実行する検査器 |
| `render_presentation_v002.mjs` | v002計画器だけを使い、承認済み描画部品へ接続する合成データ用入口 |

検査は教師動画、fixture、expected、人間確認済み実データを正解へ使わない。合成mediaだけで次を確認する。

1. jobと組立決定の厳密field、hash、path安全性。
2. 人間承認payload hash、未解決編集0件、元編集案binding。
3. 現行編集案、patch、人間メモ、expectedを直接入力へ変換しないこと。
4. 1 source、元URI・sourceRef・sourceProvenance・元動画hash一致。
5. 30fps入力と60fps入力について、単一区間と、空きを持つ複数区間の順序どおりの連結。
6. 区間逆転、正の重なり、元尺外、0 frame区間、frame写像不一致の拒否。
7. 非frame境界を持つ複数区間で、区間別frame数、人工色の遷移位置、区間内部の複数発火点がtimeline v002と一致すること。
8. source側の空きがoutput側で連続区間になること。
9. 1920×1080・CFR 30fps・frame数と、音声有無の検査。
10. 先頭PTSが0でない人工音声と内部PTS空白を含め、空白が同長のzero sampleとして保持・記録され、人工周波数が前詰めされないこと。
11. 44,100Hz・48,000Hzの各1frame・2frame音声について、encode前PCM sample数、`-movie_timescale 30`、AAC containerのpresentation duration、期待数へ明示trimしたdecode sample数、raw decodeのpadding診断値、先頭・末尾PTSを検査すること。
12. sample rate・channel layoutの暗黙変換を拒否し、canonical PCMが`f32le`・interleaved・元channel order不変であること。
13. Node・FFmpeg・FFprobeの各不一致を個別に停止し、renderer v002も基礎映像生成manifestのtool来歴不一致を拒否すること。
14. §6の一方向hash参照と、timeline v002、manifest、実MP4の対応一致。
15. 旧telop・旧screen layoutを描画経路へ渡さず、除外来歴を残すこと。
16. symlink、既存出力、途中失敗時に成功成果物を残さないこと。
17. 2つの新規sandbox出力先で論理build planの決定性を検査すること。
18. CLI終了コードと全固有違反コードの発火。
19. 既存レンダラー100/100を実験記録として削除・緩和せず維持すること。
20. v002入口が§6.2〜6.5の厳密schema・file名だけを使い、v001を受理・自動変換せず、QC v002がv002 plan参照を検査し、layout・preset・文字造形・QCの式/閾値・音声stream-copyを変えていないこと。

テスト件数は、上記各条件に必要な正常・異常ケースを実装した結果として報告する。合格率を作るためにケースを水増し・統合しない。

## 13. 実データゲート

合成実装が完了しても、実データ生成を自動承認しない。実データへ進む前に、次を別途成立・提示する。

1. 人間の保存操作から`presentation-base-media-assembly-decision-v001`を作る正式工程。
2. 使用する元編集案、元動画、組立決定のpath・hash・由来。
3. 人間承認対象hash、採用区間列、未解決編集0件の機械一致。
4. G4〜G7側が使う解決パッケージと、同じ`sourceRef`・`sourceProvenance`を使えること。
5. 人間へ見せる確認媒体の件数と問い。
6. `unresolvedEdits: []`へ確定するため、人間が「無音・言い淀みを詰める」等の定性的要求を具体的な最終区間列へ変換できる確認UI。
7. その確認UIで人間へ要求する件数、1件あたりの見積り、合計、1セッションの判定数。生成器が定性的要求を自動で切断点へ変換する経路は作らない。

現時点で実データ候補は確定しない。正式な組立決定artifactが存在するかを棚卸しした後、最短候補を別ゲートで提示する。

## 14. 実装完了条件と停止点

承認後の実装は、次を満たした時点で完了報告を作り停止する。

1. 人間承認hashへ束縛された区間列だけから、基礎映像とtimelineを対生成する。
2. 定性的な内部編集要求や旧形式を推測変換しない。
3. 1 source、順序不変、速度不変、出力frame連続、区間内部までのframe写像を検査する。
4. 映像・音声・hash・timeline・manifest・tool信頼・原子的確定を検査する。
5. 全固有違反コードを意図入力で発火する。
6. 2つの新規sandbox出力先で論理決定性を確認する。
7. 既存レンダラー100/100を維持し、§6.2〜6.5のv002厳密外部契約とframe正本入口を別の合成検査で成立させる。
8. fixture、expected、confirmed、正式台帳、binding、runner、本体を変更しない。

実装完了後も、実データ基礎映像、実描画、確認媒体、G4〜G7生成側、LLM、本体接続は別承認まで開始しない。

## 15. 今回求める判断

本設計を承認する場合、許可範囲は次だけである。

- 評価環境内の基礎映像＋timeline生成器。
- `presentation-base-media-timeline-v002`の検査・写像と、レンダラーがv002のoutput frameを直接使う合成データ用入口。見た目、preset、文字造形、音声処理は変更しない。
- 合成編集案、合成人間承認決定、人工映像・音声、異常入力を使う自動検査。
- 実装完了報告。
- `DECISIONS.md`と`docs/HANDOVER.md`の現在地・残件の同期。承認済み契約・設計文書は変更しない。

次は含まない。

- 実データの組立決定保存、基礎映像生成・描画・人間視聴。
- G4〜G7生成側、意味検出LLM、比較媒体。
- 本体、runner、backend、client、scripts、runtimeの変更。

**判断は1件: この設計と上記の合成実装範囲をまとめて承認するか。**

## 16. 承認・実装記録

- 2026-07-21、kawafmmが相談役レビューを貼り付け、本設計の§15に限定した合成実装を最終承認した。生成器、時間対応表v002、レンダラーv002入口は密結合のため一括承認とするが、完了報告では3部品を分けて報告する。
- 実データの正式入口は時間対応表v002とレンダラーv002だけとする。時間対応表v001・レンダラーv001は削除せず実験記録として保持するが、実データへ使わない。
- 実データゲートでは、層1で人間領分と確定した定性的な詰め要求を最終区間列へ確定する確認UIと作業量見積りを先に提示する。エージェントは切断点を自動具体化しない。
- 実装前監査で、§7.2・§11はFFmpeg引数列とfilter graphのmanifest保存を必須としている一方、§6.3の厳密なtop-level例から保存欄`execution`が欠落している設計内矛盾を検出した。承認済みの記録要件を落とさない安全側で、`execution`を必須fieldとして本節・§6.3へ明示する欠落訂正を行った。同じschema名の意味を黙って変更したものとして扱わず、訂正理由と追加fieldを本記録、DECISIONS、完了報告へ残す。旧形を受けるfallbackは作らない。
- 最終独立監査で、(a)レンダラーv002が無効jobでも既存出力を消し得る、(b)生成中の親directory差し替えを公開直前だけでは閉じ切れない、(c)60fps奇数frame入力の最終global-even frameが整数ms入力から到達不能、の3件を検出した。実装を停止し、v002正式入口を新規先限定・所有lock・検証済みdirectory一括公開へ変更し、生成器とレンダラーの本番経路から自動`rm`/`unlink`を撤去した。working directoryとlockは診断用に保持し、掃除より外部誤削除防止を優先する。
- 60fps奇数frame終端は、`decodedFrameCount`をtimelineへ束縛し、整数msのdecoded媒体終端だけを論理frame総数へ写す。同じ監査の再確認で音声付き末尾の不足とAAC decode paddingの混入も検出し、stream/packet提示終端でcanonical PCMを物理的に切る契約へ補った。181frame・60fps・48kHz AACの実媒体では、stream/packet提示終端144,800 sample、decoder出力145,408 sample、診断padding 608 sampleを観測し、対象区間は実音声800 sampleだけを保存、映像1,600 sampleとの差800 sampleを映像のみの尾として検査した。これらの値は規則へ固定せず、各mediaの実時計から導出する。
- 合成実装は、元動画の固定snapshot、実job byte、人間承認payload、元編集案、実行コマンド、固定した実装由来、基礎映像、時間対応表、レンダラー入口を一方向のhashと来歴で結んだ。実データ生成、人間視聴、G4〜G7生成側、LLM、本体接続は引き続き未承認である。
