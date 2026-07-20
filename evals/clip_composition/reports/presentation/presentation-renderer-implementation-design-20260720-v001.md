# 通常動画向け 演出レンダラー 実装設計 v001

日付: 2026-07-20

状態: **2026-07-21に人間承認済み。§16の合成データ実装と合成検査は完了。実データ描画、比較媒体、LLM実走、本体接続は未承認。**

人間作業: **本設計の承認判断は完了。承認範囲のコード実装と合成検査は0件・0分。** 実データ描画と人間確認は別承認とする。

改訂履歴: 2026-07-21、kawafmmが相談役レビューを承認済み指示として提示し、§16の合成データ実装までを最終承認した。同時に、layout値変更時の新preview・人間再認定、基礎映像組み立て工程の実データゲート化、単一プリセットでの同時発火制約、実装完了報告の必須内訳を本版へ追記した。同日、承認範囲の実装と合成検査を完了し、結果を`presentation-renderer-implementation-completion-20260721-v001.md`へ記録した。

## 1. 本来の目的

ZEVが意味決定した版付き演出指示書を、意味を変えず、承認済みの見た目で通常横長動画へ描画できるようにする。

レンダラーは次を判断しない。

- どこを強調するか。
- 何の種類の演出にするか。
- 誰を表示するか。
- どの素材を使うか。
- どのプリセットを選ぶか。

これらはZEV側の指示書の責任である。レンダラーは、指示を承認済み台帳へ機械的に解決し、描画不良を受入検査で止める。教師完成版との総合見た目競争、G4〜G7の意味生成、本体接続は本設計の目的にしない。

## 2. 実装前提として成立済みの正本

| 正本 | 現在の版・値 | 本実装での役割 |
|---|---|---|
| 演出指示書・解決パッケージ外枠 | `presentation-instruction-check-v002` | 描画前の唯一の意味・接続検査 |
| ZEV指示書 | `zev-presentation-instruction-v002` | 発火点・種類・対象・プリセットID・素材参照の正本 |
| 解決パッケージ | `presentation-resolution-package-v002` | 本文・時刻・話者・表示終了anchorの正本 |
| レンダラー境界 | `zev-renderer-boundary-v002` | ZEVとレンダラーの責務境界 |
| 正式プリセット台帳 | `normal-landscape-preset-registry-v001` | 描画値と種類別表示状態の正本 |
| 正式プリセット台帳canonical SHA-256 | `5915d6aae47681c43ea202a20eee16cbf669abfe24fdc832f75fb127ad46dca4` | 見た目値の実体照合 |
| 正式空素材index | `presentation-material-registry-empty-v001` | 初期版で外部素材が無いことの正本 |
| 正式信頼binding | `presentation-registry-trust-v001` | プリセット／素材検査indexの版とhashの正本 |
| 話者非人物値台帳 | `presentation-source-speaker-non-identity-registry-v001` | package v002の話者正規化来歴の照合 |

既存83/83検査は、上記の受渡し契約が成立することを確認済みである。見た目、描画後QC、映像・音声成果物は未検査なので、レンダラー側で別に検査する。

## 3. 初期実装の範囲

### 3.1 含む

- 通常横長、1920×1080、正式台帳の30fps出力。
- 正式空素材indexで成立する9種類。
- 指示書から決定的な論理描画計画を作る処理。
- 承認済み文字造形を透明PNGへ描画する処理。
- 区間選択・内部カットを済ませた基礎映像へ、明示された時間対応だけを使って透明PNGを重ね、基礎映像の音声をstream copyする処理。
- 元配信時刻と基礎映像時刻の対応を固定する、レンダラー搬送用timeline manifest。
- 指示別適用結果、生成manifest、描画後QC。
- 合成入力だけを使う自動検査。
- 既存workspaceのRemotion、FFmpeg／FFprobe、ImageMagickだけを使う。新規ライブラリは追加しない。

### 3.2 含まない

- `reference-supplement`の実描画。正式素材indexが空なので、G7指示は既存外枠検査で停止する。
- G4〜G7の発火点・種類・対象を生成するモデル。
- BGM、SE、アイキャッチ、背景効果、独自画面再構成、縦型ショート。
- 旧`telopPlan`、v001指示書、v001解決パッケージの変換・受理。
- 実データ描画、比較媒体、人間A/B、公開。
- 元配信からの区間切出し、区間の並べ替え、内部カット、速度変更。これらはレンダラーへ渡す基礎映像を作る前工程の責任とする。
- 複数元動画を組み合わせた基礎映像。初期版は1つの`sourceRef`だけを受け、複数source対応は将来の版改訂対象とする。
- 同時話者captionの自動再配置。G3外枠が同時表示groupを許可しても、現行1プリセットで実alpha領域が重なれば明示停止する。初期版で位置をずらすfallbackは作らず、必要なら別プリセットを先に認定する。
- `runner/`、`backend/`、`client/`、`scripts/`、`runtime/`の変更。

### 3.3 実データ描画前の残件

既存の編集指示保存から、区間選択・内部カット済みの基礎映像と`presentation-base-media-timeline-v001`を対で生成する**基礎映像組み立て工程の正式化**は未実装である。本承認は、この前工程を模した合成基礎映像と合成timeline manifestを入力にしたレンダラー実装までに限る。

実データ描画へ進む前に、この前工程について入力、出力、来歴、映像hash、segment対応、失敗条件を版付きで設計し、人間承認後に実装・検査する。基礎映像だけ、またはtimeline manifestだけを手作業で補って実データゲートを通過させない。この残件の成立を実データ描画の必須前提とする。

## 4. 実装配置

変更は`evals/clip_composition/`内だけに置く。既存runnerの描画部品は読み取り依存として使えるが、変更しない。

| 新設候補 | 処理の意味 |
|---|---|
| `presentation_base_media_timeline_v001.mjs` | 元配信時刻と、既に組み立て済みの基礎映像時刻の明示対応を検査する純粋処理 |
| `presentation_renderer_plan_v001.mjs` | 合格済みv002入力を、指示ごとの本文・開始・終了・表示状態へ解決する純粋処理 |
| `presentation_renderer_text_layout_v001.mjs` | 文字を削除・置換せず、元文字indexを保ったまま承認済み行幅へ分ける純粋処理 |
| `presentation_renderer_entry_v001.tsx` | 元文字index付きの確定行と正式台帳の値だけを透明PNGへ描く評価環境専用Remotion入口 |
| `inspect_presentation_render_layout_v001.ts` | 実文字の行領域、安全領域、要素領域を検査する入口 |
| `presentation_renderer_qc_v001.mjs` | 指示追跡、表示領域、映像・音声、適用プリセットを合成点なしで検査する処理 |
| `render_presentation_v001.mjs` | 描画前検査、PNG生成、FFmpeg合成、QC、成果物確定を順に行うCLI |
| `presentation_renderer_v001.test.mjs` | 論理計画、異常系、実描画、音声保全の検査 |
| `testdata/presentation-renderer-v001/` | 合成v002入力と固定期待値 |
| `registries/presentation/presentation-renderer-trust-v001/trust.json` | 正式プリセット台帳本体hashとfont実体hashを固定するレンダラー専用信頼情報 |

`build_presentation_initial_preset_review.mjs`全体は、固定scene listを描く認定媒体製造器なので流用しない。次の低水準処理だけを由来明記の上で分離する。

- 既存`TelopText`のSVG描画、font読み込み、文字計測、配置計算。ただし、確定済みの本文を正規化する既存`TelopRenderer`全体は使わない。
- Remotionによる透明PNG生成。
- ImageMagickによる実alpha領域取得。
- FFmpeg／FFprobeによる映像・音声・尺の確認。

既存`runner/src/telop/telop-line-break.ts`には、折返し改善のため末尾の日本語句点を削る経路がある。これはG1〜G3の厳密本文契約と両立しない。`runner/`を変更したり、削除後の本文を許容したりせず、評価環境内に文字不変の行分け処理を置く。既存部品の見た目だけを再利用し、本文の決定権は渡さない。

## 5. レンダラー専用信頼情報

現行の正式bindingがhash固定するのは検査indexであり、見た目の全値を持つプリセット台帳本体ではない。レンダラーは見た目を実現するため、別のレンダラー専用信頼情報で次を固定する。

- schema版と信頼情報版。
- 正式プリセット台帳版とcanonical SHA-256。
- 台帳が列挙する2 fontのID、path、SHA-256。
- 正式信頼bindingの版とcanonical SHA-256。
- 対応する境界契約`zev-renderer-boundary-v002`。
- 人間が承認したpreview manifestのpathとfile SHA-256、そのmanifestが記録した描画部品hashとNode／Remotion／browser／FFmpeg／FFprobeの版。
- 正式レンダラーが実際に読む既存描画部品のpathとfile SHA-256。
- preview時の配置を支えた台帳外layout値・計算規則を全て列挙する。少なくともfont weight 800、文字安全余白4%、左右安全余白4%、上下安全余白2%、lower-third anchor 67%、render scale 1、縁・glow幅の計算規則を値または閉じた規則として持ち、未登録defaultが必要になったら停止する。

これらの台帳外layout値と計算規則は、人間がpreviewで認定した見た目の構成要素である。値または規則を変更するときは、版付き信頼情報とレンダラー版の改訂だけでは足りず、変更後の実描画previewを新しく作り、人間の再認定を必須とする。新previewと再認定なしに、font weight、安全余白、anchor、render scale、縁・glow規則を変更しない。

これはZEV指示書の5項目を増やさず、レンダラー側が自分の描画資産を固定する情報である。したがって境界契約v002の意味は変えない。既存正式台帳・bindingの本文は変更せず、新規artifactとして追加する。

信頼情報そのものをjob側の自己申告へ委ねない。固定path`registries/presentation/presentation-renderer-trust-v001/trust.json`と、その期待canonical SHA-256をレンダラーv001のコード定数に埋め込む。jobには信頼情報path/hash欄を持たせず、起動時に固定pathの実体を固定hashと照合してから他の信頼鎖を読む。実行時引数や環境変数で別trust、別台帳、別font、別描画部品へ差し替えない。将来いずれかを変える場合は、版付き信頼情報とレンダラー版を改訂する。

正式レンダラー自身の版、Git commit、実装ファイルhashは生成manifestへ記録する。自分自身のfile hashを同じファイル内の定数で循環固定したとは主張しない。信頼情報が固定するのは、人間認定の根になった外部正本、描画部品、layout規則、tool実体である。

## 6. 入力job

CLIは、自由な複数引数ではなく、次を明示した`presentation-render-job-v001` 1件を受け取る。

- v002のbundleファイル参照とfile SHA-256。
- 正式信頼bindingファイル参照とfile SHA-256。
- 正式プリセット台帳ファイル参照とcanonical SHA-256。
- package生成manifestの参照とfile SHA-256。
- 基礎映像timeline manifest `presentation-base-media-timeline-v001`の参照とfile SHA-256。
- 出力ディレクトリ。

未知field、欄の欠落、空文字、hash形式不正を拒否する。pathから版、ID、hashを推測しない。jobが持つfile SHA-256は搬送中のbyte実体照合、コード固定のrenderer trustが持つcanonical SHA-256は承認済みJSON内容の照合、と役割を分ける。出力manifestにも`bindingFileSha256`と`bindingCanonicalSha256`を別欄で記録し、単に「binding hash」とまとめない。package生成manifestと実packageのID・hash・話者正規化版・台帳版・台帳hash・写像前後atom列hashが一致しない場合は停止する。

### 6.1 基礎映像timeline manifest

レンダラーは2時間の元配信を切り出したり、package時刻を0起点映像へ暗黙にずらしたりしない。前工程が作った基礎映像と、その時間対応を次の専用manifestで受け取る。

- schema版、timeline ID、`sourceProvenance`。
- 基礎映像のartifact ID、path、file SHA-256、想定frame数。
- 元時間軸を識別する1件の`sourceRef`。
- 順序付きsegment列。各segmentは`segmentId`、`sourceStartMs`、`sourceEndMs`、`outputStartMs`、`outputEndMs`を持つ。

初期版の適合条件は次で固定する。

1. package生成manifestの`sourceArtifacts`は1件だけで、その`sourceRef`とtimeline manifestの`sourceRef`が完全一致する。
2. segmentは全欄が整数、各区間は正の長さで、`sourceEndMs - sourceStartMs = outputEndMs - outputStartMs`。速度変更を認めない。
3. output側は0msから始まり、隙間・重なりなく連続する。source側も時刻順で正の重なりを持たない。元場面の再利用・順序入替は初期版で認めない。
4. 基礎映像はsegment列どおりに既に組み立て済みである。FFprobeのframe数は`frameBoundary(最後のoutputEndMs)`と一致する。
5. 描画要素のsource側半開区間全体が、ちょうど1つのsegment内に入る。複数segmentへまたがる表示、除去済み区間にある発火点、対応が0件または複数件になる時刻は停止する。

適合する要素だけ、次の明示写像でoutput時刻へ移す。

```text
outputMs = segment.outputStartMs + (sourceMs - segment.sourceStartMs)
```

指示書、解決パッケージ、元atom時刻は変更しない。描画計画にはsource時刻とoutput時刻を両方残す。切出しや内部カットをレンダラーが推測して補う実装は作らない。

### 6.2 初期版の1 source制限

現行package v002の`sourceAtoms`はatomごとの`sourceRef`を保持せず、生成manifestに元artifact列だけを保持する。複数source入力では、atomをどの時間軸へ写すかをレンダラーが安全に決められない。このため初期版は、生成manifestの元artifactが1件のpackageだけを受理する。

複数元動画を扱うときは、atomとsourceを明示対応させる版付き搬送契約を先に設計する。配列順、atom IDの接頭辞、時刻の近さから推測する後方互換分岐は作らない。

## 7. 描画開始までの固定順

1. jobのschemaとfile hashを検査する。
2. コード固定のpath/hashからレンダラー専用信頼情報を開き、正式プリセット台帳本体、正式binding、2 font、描画部品、layout規則、tool版を検査する。
3. `validatePresentationInstructionContractV002`を1回だけ実行する。
4. 外枠結果が`passed`のときだけ描画へ進む。`failed`と`passed_with_declared_limit`は区別して停止し、nested reportを無変換で保存する。
5. package生成manifestとpackage実体を照合する。
6. timeline manifestを検査し、packageが1 sourceであること、segmentの時間対応、基礎映像hash・frame数を照合する。
7. FFprobeで基礎映像を読み、映像stream、1920×1080、正の尺、音声streamの有無を記録する。
8. 指示をsource時刻の論理描画要素へ解決し、1 segmentだけに対応することを確認してoutput時刻へ写す。
9. 全要素の文字不変、font読込、レイアウト、時間・空間衝突をpreflightする。
10. 全指示の透明PNG生成に成功してから、FFmpeg合成へ進む。
11. 描画後QCに全件合格した場合だけ、成功video・manifest・適用結果を最終出力名へ確定する。

途中失敗時は、成功video・成功manifestを残さない。診断用の失敗reportだけを残し、どの段で止まったかを記録する。

単一プリセットの初期版では、同時刻または近接時刻の複数指示、たとえばcaptionと強調が同じ領域へ発火すると、時間・空間衝突として正しく停止しうる。レンダラーは自動移動や暗黙のz-orderで回避しない。これはG4〜G7生成側の設計で参照する**同時発火の既知制約**であり、停止した場合は指示側またはプリセット語彙の課題として扱う。

## 8. 指示から論理描画要素への解決

### 8.1 共通

- 1指示から1描画要素を作る。
- source側の表示開始は`trigger.startAtomId`の`startMs`。
- 指示配列の順序と`instructionId`を保持する。
- `presetId`から正式台帳の1 preset、`kind`から1 policy、policyから1 visual stateを解決する。
- 要求されたプリセットID・台帳版と、実際に解決した値を別欄で持つ。
- source atomの`speaker`文字列を人物名・人物ID・表示文字へ使わない。
- source側の表示半開区間が1つのtimeline segmentに完全包含されることを確認してから、同じ長さのoutput側半開区間へ写す。segmentをまたぐ場合は要素を分割せず停止する。

### 8.2 `speech-caption`

- `caption-target`から対応caption contractとcueを1件だけ解決する。
- 表示本文と行分けは、cueの`lines[].renderedText`を正本とする。
- 開始はcueのstart anchor、終了はcueのend anchorを正本とし、プリセットで延長・短縮しない。
- 文字列の追加、削除、trim、句読点補完、表記正規化をしない。

### 8.3 非caption 8種類

- `source-atom-range`または`information-item`の表示本文は、対象が明示したsource atomを対象順に並べ、各atomの文字列を無区切りで連結する。空白や句読点を追加しない。
- 開始はtrigger atom、終了は正式台帳の`resolved-target-final-atom-v001`に従い、対象の最終atomの`endMs`とする。
- `speaker-identification`だけは、明示speaker targetの`speakerDisplayName`を表示本文とする。source atomのクラスタ名を代用しない。
- `information-item.speakerId`は明示speaker targetへの参照確認にだけ使い、表示名を独自生成しない。

正式空素材indexで到達可能なのは以上の9種類である。`reference-supplement`は描画計画を作る前の外枠検査で停止する。

### 8.4 本文不変検査

行分けは、元の各Unicode code pointに入力内indexを付けたまま行へ配る。空白や句読点を削除せず、trim、Unicode正規化、全半角変換、表記修正をしない。`speech-caption`はcueの明示行をそのまま使い、非captionだけ、既存の文字幅単位を再利用してcode point境界で行分けする。

描画モデルは、layoutが追加した改行を文字列から除いて比較する方式にはしない。元文字index列が`0..N-1`を欠落・重複・並べ替えなしで一度ずつ持つことを検査し、各indexの文字が入力と完全一致することを確認する。これにより、入力に元からある改行とlayout専用改行も区別できる。

評価環境専用Remotion入口は、確定行から直接作ったrender modelを既存`TelopText`へ渡す。既存`TelopRenderer`や`breakTelopText`へ本文を再投入しない。特に、末尾の`。`を折返し都合で削る既存経路はレンダラーへ入れない。

## 9. 時刻とtransition

source時刻、output時刻とも半開区間`[startMs, endMs)`として扱う。§6の明示写像後、30fpsのoutput frame境界は全種類で次の1規則だけを使う。

```text
frameBoundary(ms) = round(ms * 30 / 1000)
```

同じoutput msは必ず同じframe境界になる。種類別offset、補正係数、epsilonは置かない。`endFrameExclusive <= startFrame`になった指示は停止する。

正式台帳の`quick-fade-4f-v001`は、表示区間の内側でentry 4 frame、exit 4 frameを行い、区間外へ延長しない。表示frame数が8未満でも、指示を捨てたり区間を伸ばしたりしない。入口と出口のalpha包絡が重なるframeでは、両方を満たす小さい方のalphaを採る。相対frameを`r`、表示frame数を`D`としたとき、alphaは次で固定する。

```text
alpha(r) = min(1, (r + 1) / 4, (D - r) / 4),  0 <= r < D
```

これは4 frameという承認済み値の適用規則であり、種類別の補正ではない。停止するのは、frame写像後に正の表示frameが1つも無い場合だけとする。

## 10. 描画と合成

### 10.1 透明PNG

- 評価環境専用Remotion入口は、正式台帳の文字造形、背景、配置、fontと、§8.4で確定した文字index付き行だけを受け付ける。本文や行分けを入口で再解釈しない。
- 未知positionを中央、未知fontをOS fontへ落とすfallbackを禁止する。
- 管理fontは描画前に明示読込し、`document.fonts.check`で台帳指定font・weightの利用を確認する。既存`TelopRenderer`のように読込例外を捕捉して代替fontで続行せず、読込失敗またはfallback検出で停止する。
- 1指示1ファイルとし、`instructionId`から追跡できる固定名を使う。
- 実alpha領域が空なら停止する。
- 同じ論理計画から再描画したPNG hashが一致することを検査する。

### 10.2 レイアウト

- 行数上限は正式台帳から読む。
- 行同士は幅・高さとも正の交差がある場合だけ違反とする。境界接触は違反にしない。
- 文字、縁、glow、背景板を含む実alpha領域がsafe area外へ出たら停止する。
- 表示時間が正に重なり、かつ実alpha領域も正に交差する2要素があれば停止する。初期台帳に許可重なり宣言は無いため、暗黙のz-orderで隠さない。

複数話者captionを同時表示できるかは、現プリセットの実配置でこの検査を通る場合に限る。通らない場合、レンダラーが位置をずらさず、新しいプリセットまたは指示設計の課題として返す。

### 10.3 FFmpeg合成

- §6で検査済みの組み立て済み基礎映像を30fpsへ映像再符号化し、透明PNGをoutput frame区間だけoverlayする。レンダラー内でtrim、concat、速度変更、source区間の再編成を行わない。
- 静的PNGをそのまま全区間へ置くのではなく、各overlayのalphaを§9のframe式で毎frame変化させてから合成する。entry／exitとも4 frameであること、1〜7 frame区間では包絡が重なること、区間外alphaが0であることをframe画像から検査する。
- 基礎映像の音声は`-c:a copy`相当のstream copyとし、再符号化fallbackをしない。
- 入力に音声が無い場合は、音声なしをmanifestへ明示し、音声を創作しない。
- 入力に音声がある場合、出力にも同じcodecの音声streamを持ち、stream-copyしたpacket payloadのSHA-256が一致しなければ停止する。

## 11. 出力

成功時は次を一組で出す。

1. 描画済みMP4。
2. `presentation-render-plan-v001.json`: 指示ごとの論理本文、元文字index、source時刻、timeline segment、output時刻、frame、target来歴、状態、PNG hash。
3. `presentation-render-application-results-v001.json`: 指示IDごとの要求／実適用プリセットID・台帳版、最終描画要素、結果。
4. `presentation-render-manifest-v001.json`: 全入力artifact、契約版、package ID/hash、package生成manifest hash、timeline manifest ID/hash、基礎映像hash、レンダラー版、renderer trust canonical hash、プリセット台帳本体hash、bindingのfile/canonical両hash、font hash、描画部品hash、tool版、出力hash。
5. `presentation-render-qc-v001.json`: 各QCの個別結果。合成スコアなし。

実行時刻を論理計画とQCへ入れない。同じ入力から、論理計画、適用結果、QC、透明PNGが一致することを決定性の対象とする。MP4のバイト一致はエンコーダー・container metadataの影響があるため完了条件にせず、映像stream、可視要素、音声packet、論理来歴の一致を検査する。出力MP4の実file hash自体はmanifestへ記録する。

## 12. 描画後QC

次を独立して報告する。

- 全指示がちょうど1回描画された。
- 指示IDからtarget、source atom、source時刻、timeline segment、output時刻、表示状態、PNG、最終出力まで追跡できる。
- 要求と実適用のプリセットID・台帳版が一致する。
- 全PNGが非空でsafe area内にある。
- 行の正の交差がない。
- 時間と空間の両方で衝突する要素がない。
- 各指示の代表frameで、基礎映像との差分画素が存在する。
- 出力に1920×1080、30fps、正の尺の映像streamがある。
- 入力に音声がある場合、出力音声streamがあり、codecとpacket payload hashが一致する。
- 指示・素材を黙って省略、複製、代替していない。

表示が面白いか、強調頻度が適切か、発火点が意味上正しいかはQCへ混ぜない。たとえば、音楽の無い箇所へ`information-lyrics`が指示されていた場合、レンダラーが通常字幕へ変換したり黙って消したりせず、指示書側の意味判断問題として来歴付きで残す。これらはZEV指示書・G4〜G7・公開実測の責任である。

## 13. 失敗の帰属とコード

上流検査の違反コードは複製せず、v002 reportをnestedで保存する。レンダラー固有の失敗は少なくとも次の群へ分け、固定順で出す。

| 群 | 代表コード | 意味 |
|---|---|---|
| job・信頼 | `RENDER_JOB_SCHEMA_INVALID` / `RENDER_JOB_UNKNOWN_FIELD` / `RENDERER_TRUST_ROOT_MISMATCH` / `RENDERER_COMPONENT_HASH_MISMATCH` / `RENDERER_TOOL_VERSION_MISMATCH` / `PRESET_REGISTRY_CANONICAL_HASH_MISMATCH` / `FONT_ASSET_HASH_MISMATCH` / `FONT_LOAD_FAILED` / `FONT_FALLBACK_DETECTED` | 入力、信頼根、描画部品、tool、fontの実体が承認済み値と違う |
| package・媒体 | `RESOLUTION_GENERATION_MANIFEST_MISMATCH` / `RENDER_SOURCE_COUNT_UNSUPPORTED` / `BASE_MEDIA_TIMELINE_INVALID` / `BASE_MEDIA_HASH_MISMATCH` / `BASE_MEDIA_FRAME_COUNT_MISMATCH` | package、明示timeline、基礎映像を安全に結べない |
| 時間対応 | `TIMELINE_SOURCE_REF_MISMATCH` / `TIMELINE_SEGMENT_SOURCE_OVERLAP` / `TIMELINE_SEGMENT_OUTPUT_NONCONTIGUOUS` / `TIMELINE_SPEED_CHANGE_UNSUPPORTED` / `INSTRUCTION_SOURCE_INTERVAL_UNMAPPED` / `INSTRUCTION_SOURCE_INTERVAL_AMBIGUOUS` / `INSTRUCTION_SOURCE_INTERVAL_MULTIPLE_SEGMENTS_UNSUPPORTED` | source時刻からoutput時刻への対応が無い、曖昧、または初期版の責任を超える |
| 上流停止 | `INSTRUCTION_CONTRACT_NOT_PASSED` / `INSTRUCTION_CONTRACT_PARTIAL` | v002外枠が描画開始条件を満たさない |
| 計画 | `TARGET_RESOLUTION_FAILED` / `TARGET_TEXT_MUTATED` / `TARGET_TEXT_INDEX_GAP` / `TARGET_TEXT_INDEX_DUPLICATED` / `TARGET_TIMELINE_INVALID` / `TARGET_DURATION_ZERO_AFTER_FRAME_MAPPING` / `PERSON_TARGET_REQUIRED` | 指示を承認済み意味のまま表示要素へ解けない |
| レイアウト | `LAYOUT_LINE_COUNT_EXCEEDED` / `LAYOUT_LINE_POSITIVE_INTERSECTION` / `LAYOUT_SAFE_AREA_VIOLATION` / `OVERLAY_ALPHA_EMPTY` / `INSTRUCTION_TEMPORAL_SPATIAL_COLLISION` | 描画すると読めない、欠ける、重なる |
| 適用・媒体QC | `INSTRUCTION_RENDER_MISSING` / `INSTRUCTION_RENDER_DUPLICATED` / `APPLIED_PRESET_MISMATCH` / `OUTPUT_VIDEO_STREAM_MISSING` / `OUTPUT_AUDIO_STREAM_MISSING` / `OUTPUT_AUDIO_PACKET_HASH_MISMATCH` / `OUTPUT_FORMAT_MISMATCH` / `OUTPUT_ELEMENT_NOT_VISIBLE` | 指示どおりの成果物になっていない |

実装時にexportする固有コード集合は、合成testで全件を意図的に発火させ、テスト観測集合との完全一致をassertする。未知エラーへ一括変換しない。CLIは成功0、契約・QC失敗1、処理自体の失敗2を返す。

## 14. 自動検査の事前登録

既存83件を変更せず、次の新規17トップレベル検査を追加し、合計100件を完了条件とする。各検査の内部で複数異常ケースを扱ってよいが、期待値緩和や既存ケース削除は行わない。

1. jobとtimeline manifestの必須field・未知field・hash形式。
2. コード固定の信頼根、正式binding、台帳本体、preview由来、描画部品、tool版、fontの実体照合。jobから別trustを指定できないこと、font読込失敗時にfallbackせず止まることも含む。
3. v002だけを受理し、v001・旧`telopPlan`を拒否。
4. 外枠`passed`だけを描画へ通し、partial・failedを区別して停止。
5. 正式空素材で到達可能な9種類を論理計画へ解決。
6. captionの本文・明示行分け・開始・終了を無変更で保持。
7. 非captionの対象本文と終了責任を無変更で解決し、末尾`。`、前後空白、元改行を含む文字index列を欠落なく保持。
8. 明示speaker targetだけから表示名を解決し、source話者ラベルを人物へ使わない。
9. 1 source制限、segmentのsource/output対応、速度不変、基礎映像frame数、未対応・曖昧・複数segment跨ぎを検査。
10. output msからframeへの共有境界変換、0尺、8 frame未満で重なる4 frame alpha包絡。
11. 正式台帳の種類・状態・font・背景・transitionを暗黙fallbackなしで解決。
12. 行数、行の正の交差、安全領域の検査。
13. 時間×空間衝突を検出し、境界接触を違反にしない。同時caption groupが現プリセットで正に重なる合成例は、位置を自動変更せず`INSTRUCTION_TEMPORAL_SPATIAL_COLLISION`で停止する。
14. 空素材indexのG7を外枠で停止し、previewカードを代用しない。
15. 9種類の透明PNGが非空・safe area内・再描画hash一致。
16. 合成MP4の映像、代表frame差分、基礎映像音声stream-copy、packet hash一致。
17. 指示別適用結果、manifest、QC、CLI 0/1/2、失敗時の成功成果物不在、全固有コード発火。

新規トップレベル検査は17件、既存83件と合わせて合計100件を完了条件とする。実描画検査は、FFmpegで生成する短い1920×1080・音声付き基礎映像と、内部cutを持つ合成timelineだけを使う。教師動画、fixture動画、expected、承認済みpreviewを正解として再利用しない。

## 15. 実装完了条件と停止点

1. コード固定の信頼根から、正式台帳本体、binding、preview由来、描画部品、tool、fontを照合し、さらにtimeline manifestと基礎映像をhashで照合する。
2. v002外枠を1回だけ通し、`passed`以外を描画しない。
3. 1 source・複数cutの明示timelineで、source時刻を基礎映像時刻へ一意に写せる。
4. 9種類の論理計画・透明PNG・合成MP4・適用結果・manifest・QCが揃う。
5. 文字の暗黙変更、人物推測、未知値fallback、G7 placeholderを行わない。
6. 重なり、画面外、欠落、音声欠落を個別に検出する。
7. 全レンダラー固有コードを意図入力で発火する。
8. 既存83/83、新規17/17、合計100/100に合格する。
9. fixture、expected、confirmed、正式preset/material台帳、既存binding、runner、本体を変更しない。

実装完了報告には、次を必ず個別に記載する。

- 既存83/83、新規17/17、合計100/100の内訳。合計値だけに省略しない。
- exportしたレンダラー固有違反コードの全件発火と、テストで観測したコード集合との完全一致。
- 同一入力に対する論理計画、適用結果、QC、透明PNGの決定性検査結果。
- 既存83件を削除・緩和・変更せず83/83のまま維持したこと。

実装完了後は報告を提示して停止する。実データ描画、比較媒体、人間確認、G4〜G7生成側、本体接続は、結果を見た後の別承認まで開始しない。

## 16. 今回求める判断

本設計を承認する場合、許可範囲は次だけである。

- §4の評価環境内コード、合成testdata、新規レンダラー専用信頼情報の実装。
- §14の合成自動検査。
- 実装完了報告と正本の現在地同期。

承認範囲に、実データ描画、比較動画、人間確認、LLM、本体接続は含まない。
