# ZEVOタイトルC工程 完全実装設計v001

- 作成日: 2026-08-08
- 状態: 実装前・実現性調査済み
- 調査対象commit: `a47793d65be4a68ccc75cb555fbcc03fcc582ee8`
- 親契約1: `presentation-meaning-information-package-contract-design-20260803-v001.md`
  - SHA-256: `a38ef995c5c838f742c1de6c18acd5a7fd166ea57fb7537e51cf9a89abd4c0de`
- 親契約2: `presentation-output-side-acceptance-contract-design-20260803-v001.md`
  - SHA-256: `c349d544e9cc954d2f5b9e5e05334801e6a11cdce383f57829c04ae301b678de`
- 外部通信: 0回
- API費用: US$0
- 人間作業: 完成横型1本・縦型1本の目視2判断だけ

## 1. 結論

C工程は、既存ZEVO v001を改造せず、**タイトルなしで完成・検証済みのZEVO出力へ、非空titleを持つ意味情報パッケージとstyle profileを束縛して重ねるforward-onlyのZEVOタイトルcompositor**として実装する。

実装範囲は新規5 path、正式検査60件で閉じる。既存production、既存schema、既存検査の期待値、既存3本の正式成果物、5つの保護tree、stable tagは変更しない。旧成果物からの変換、fallback、旧schemaの拡張、旧新併産、cropの再計算、タイトル文言の自動生成は作らない。

責務は次の一方向で固定する。

```text
ZEVG
  人間指定のtitle文字列を意味情報パッケージへ載せる
       |
       v
ZEVOタイトルcompositor
  style registryから、折り・表示時間・位置・見た目を決定する
       |
       v
検証済みの既存ZEVO動画へタイトル1件を描画し、新しい版付き出力として公開する
```

初回実証タイトルは`全部やりかけ`。文言は実行入力であり、コード・style registryへ焼き込まない。横型と縦型の値はprofile dataで分け、同一compositorと同一runnerを使う。

## 2. 本来の目的との照合

本工事の目的は見た目の凝ったタイトルを作ることではない。ZEVGが文字列だけを供給し、ZEVOが画面形式ごとの表現を所有する境界を、実データの横型・縦型で初めて通すことである。

- タイトル文言の意味はZEVGに残る。
- 折り、文字サイズ、書体、位置、安全領域、表示時間はZEVO style入力へ移す。
- crop済みの最終キャンバス上で配置し、source viewportやcrop係数をタイトル契約へ持ち込まない。
- G4〜G7、タイトル自動生成、凝った入退場は混ぜない。
- 人間は完成動画2本だけを見て、文言・位置・可読性・表示時間を一度に判定する。

この境界が成立すれば、将来タイトル文言やstyleを替えてもZEVGの字幕・時刻・区間を再設計せずに済む。

## 3. 実現性調査

本節は設計本文より先に行ったread-only現物調査である。行位置は調査対象commitの現物に対する1始まり行番号、SHAは作業開始時のbyte SHA-256である。

### 3.1 承認済み契約の実在

| 確認事項 | 現物 | SHA-256・行 | 判定 |
|---|---|---|---|
| titleの意味schema | `evals/clip_composition/reports/presentation/presentation-meaning-information-package-contract-design-20260803-v001.md` | `a38ef995c5c838f742c1de6c18acd5a7fd166ea57fb7537e51cf9a89abd4c0de`、225〜239行 | exact 2 keyの`text/inputMode`が実在。空は`none`、非空はCR/LFなしの`human` |
| ZEVOの責務 | `evals/clip_composition/reports/presentation/presentation-output-side-acceptance-contract-design-20260803-v001.md` | `c349d544e9cc954d2f5b9e5e05334801e6a11cdce383f57829c04ae301b678de`、31〜53行 | 折り・幅・format・preset・配置・safe areaは出力側、title文字列は変更禁止 |
| 現行v001のtitle capability | `evals/clip_composition/presentation_output_contract_v001.mjs` | `95f1da2029a3cf0dda4fa873490321d2aa92ea6bfb548f38d939a0800f5bd5b8`、404〜410行 | `TITLE_STYLE_UNAVAILABLE`の実枝あり |
| 現行v001のstyle exact型 | 同上 | 同SHA、595〜604行 | 8 key exact。今回ここを拡張せず別入口にする必要を確認 |
| 意味projection正本 | 同上 | 同SHA、955〜990行 | caption本文・時刻・timeline・title stateを導出する既存入口あり |
| 現行v001の非空title拒否 | `evals/clip_composition/presentation_output_render_plan_v001.mjs` | `72789a7ec0b9d272c226543d7aa17e5a2e1f866e2cc31c21abb89311adf28c5b`、365〜390行 | 非空titleを拒否し、空titleだけを`not-requested`へする実枝あり |

判定: 親契約は非空titleを意味情報として許可しているが、既存ZEVO v001の表示計画は意図的に拒否する。したがって既存v001を書き換える方式でなく、新規生成だけを受けるforward-only入口が必要である。

### 3.2 再利用する実装入口の実在

| 処理の意味 | path | SHA-256・行 | 実在する入口・利用方法 |
|---|---|---|---|
| 非caption文字の機械折り | `evals/clip_composition/presentation_renderer_text_layout_v001.mjs` | `066a62adaa7fa3f8b8eda92c82e9a85940e43f372af976edc4b327ef4cf9ce5e`、61〜141行 | `layoutUnicodeCodePointsV001`。入力本文を変えずcode point index付きで折る |
| generic文字描画 | `evals/clip_composition/presentation_renderer_entry_v001.tsx` | `884c2361feab659264ed0e00e65ae726e681b030c1a594c80985bd0225d7dce7`、35〜65・261〜310行 | visual stateで描き、最終canvasのsafe areaへ`top-center`配置できる |
| common描画・QC | `evals/clip_composition/render_presentation_v002.mjs` | `ea775b314cc149c65d384603dbc39f3260e3ba8e4a32d99a6275941bf31dd223`、1324〜1619行 | `executeValidatedPresentationDrawAndQcV001`。描画、決定性、配置、合成、post-render QCを一つの正本で実行 |
| element→overlay props | 同上 | 同SHA、701〜717行 | kindをcaptionへ限定せず、text/indexedLines/visualStateをgenericに投影 |
| 4 frame fade | 同上 | 同SHA、787〜825行 | 共通合成の既存alpha処理をそのまま利用。新しいtransition係数は作らない |
| 既存ZEVO出力runner | `evals/clip_composition/run_presentation_output_job_v001.ts` | `b325908f0e13ffdc34120d01dae820b37328d6eae395e2cd543669f4b7505d49`、900〜935・1038〜1165行 | 正式job、source artifact、runtime、implementation、no-replace公開の検証作法を参照 |
| 意味package正式製造 | `evals/clip_composition/presentation_meaning_information_package_v001.mjs` | `46562003fabb1032b1422c2fe266e79f8a6f30f8c27214302f8436c670276567`、232〜258・1059〜1062行 | 非空titleを正式jobからpackageへそのまま載せる既存正本 |
| 意味package runner | `evals/clip_composition/run_presentation_meaning_information_package_job_v001.mjs` | `d76e4de69893aaaa954939627859ffa25788b8aee1b8801a832ee7539b2be8df` | 正式serializer、live binding、no-replace公開を再利用。変更しない |
| 横型の人間認定済み文字値 | `evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json` | `8e9b0a039c8a4c9edf2c66b1df343c1d892d4688ebc4886a9af322bd44a6e5a8`、62・70・87行 | readable-popの96px・幅36をtitle profileへdataとして引用 |
| 縦型の人間認定済み文字値 | `evals/clip_composition/registries/presentation/vertical-short-preset-registry-v001/preset-registry.json` | `3a3e0b7b9ce4e349f778b8035c60085a101f7631373404bdc8252a9cc7532133`、130・139・156行 | speaker-onlyの134px・幅14をtitle profileへdataとして引用 |
| 描画layout rules | `evals/clip_composition/registries/presentation/presentation-renderer-trust-v001/trust.json` | `04ec4971d078413b68c19869b0285130ec553f14601f45d27125738a7498eddc`、95〜108行 | 現行実装と照合するlayout rules一式を再利用 |

判定: 折り、最終canvas配置、描画、QC、正式意味package生成の各計算正本は現物に実在する。新compositorはこれらを呼ぶadapterだけで成立し、第二の文字幅計算、第二の描画器、crop計算の複製は不要である。

実装後・正式attempt前の現物再監査で、Remotion起動入口はsymlinkではなくpnpm生成のshell shimであり、末尾の`cmd-shim-target`が正式CLI本体を指す構造だと確定した。したがってruntime topologyはsymlink同一性を要求せず、shim内の対象記録と実際の相対CLI呼出しを照合し、CLI本体そのものは従来どおりpath・SHAで束縛する。またfont実体は`runner/public/font/<fileName>`にあり、registryのexact pathと同じ階層をrunnerも照合する。この2点は契約・描画計算・成果物schemaを変えない実物構造への限定修正である。

### 3.3 約束する要素の全数照合

| 要素 | 実枝 | 本設計の扱い |
|---|---|---|
| 非空titleのZEVG入力 | 既存meaning package job/validatorに実在 | 変更なしで使用 |
| format別style | 横・縦の正式preset registryに実在 | 人間認定済み字幕値を新title registryへdataとして引用 |
| top-center配置 | generic rendererに実在 | profileで選択、コード分岐なし |
| 機械折り | `layoutUnicodeCodePointsV001`に実在 | profileの幅・最大行数を渡す |
| 最終canvas safe area | generic rendererに実在 | crop情報をtitle planへ入れず、source完成canvasへ適用 |
| 描画後QC | common draw coreに実在 | 既存renderer QCを実行し、新QCが結果を束縛 |
| frame/audio維持 | source/output media観測が既存runnerに実在 | 同frame数・同audio packet payload SHAを必須化 |
| no-replace公開 | v1 runner/common publicationに実在 | 新版rootでも同じ作法を使う |

### 3.4 実在しないものと、設計への反映

| 実在しないもの | 処理 |
|---|---|
| 現行ZEVO v001での非空title表示 | v001を緩和せず、新しいtitle-only compositorを作る |
| title専用style registry | 新規1 fileとしてexact schemaを固定する |
| title専用job/plan/QC/manifest | 新規coreとrunnerでexact schemaを固定する |
| タイトルとcaptionを同時に再構築する新runner | 作らない。検証済みtitleless ZEVO動画をsource underlayにする |
| タイトル文言自動生成 | 作らない。`inputMode: human`だけを受理する |
| 任意の新packageを最初から一発で描く完全ZEVO v2 | 本v001の保証範囲外。下書き期に全面清書を先行させない |

### 3.5 candidate 59の工程間縫い目は現物で成立済み

保存済みB6応答をAPI通信0回で現行B1へ再検証し、現行fatal-observability bindingを持つ正式非空title packageまで既に製造できている。

| 成果物 | path | SHA-256 | 観測 |
|---|---|---|---|
| B1 v003 job | `evals/clip_composition/outputs/presentation/meaning-boundary-validation-jobs/qdczJpv8RCc-candidate-59-c-title-b1-v003.json` | `85c96bcc1606d7f49773ade617e88dab87f9e7d2e02305ce821d64ac9b587656` | 現行実装bindingを持つ |
| B1 selection | `evals/clip_composition/outputs/presentation/meaning-boundary-validations/qdczJpv8RCc-candidate-59-c-title-b1-v003/attempt-v003/meaning-boundary-selection.json` | `82fa5d238fc6d06d89d33d9dfa91551930484f0d31ae83a520ab863042e5f236` | 保存済み回答から再検証 |
| B1 report | 同directoryの`meaning-boundary-validation-report.json` | `c7b876683f051e15316df72aa10fdb063b2fe6dfeb706c3eabda243d87ab6011` | `passed`、違反0件 |
| title package job | `evals/clip_composition/outputs/presentation/meaning-information-jobs/qdczJpv8RCc-candidate-59-c-title-v001.json` | `0c052e8793d76618a8fe3fea41d295b1d72cc08f61c3b79515883d8e1bc90f8f` | titleを正式入力として固定 |
| title package | `evals/clip_composition/outputs/presentation/meaning-information-packages/qdczJpv8RCc-candidate-59-c-title-v001-meaning-information/meaning-information-package.json` | `61a756e3b217b49e185ac988771cc0812ea0f35ea7d0f84c520f80395b197e2a` | `title={text:"全部やりかけ",inputMode:"human"}`、caption 31、semantic observation 0 |

初回job fixture不足2件のfailureは証拠として保持する。契約変更やAPI再通信は行っていない。本実証では上表の合格packageをそのまま入力に使い、意味packageを手編集しない。

既存titleless packageと新title packageから`sourceMedia / timelineComposition.segments / captions / semanticObservations`だけを同一key順で投影した実測SHAは、双方とも`61c158cea71a0cbf9df82b2ed081695bfc57c7346bf82b8d8af7e70b29d5a6b7`だった。title以外の意味内容が同一であることは、設計上の期待だけでなく現物でも成立している。

### 3.6 実現性調査の訂正: runtime graphとmodule-load data

実装後・正式attempt前の現物再監査で、初回のlocal static importだけを数えた48 code／132 edgeと「module import時I/O 0件」は不完全だった。value/typeの区別、literal dynamic import、縦型review runnerの固定computed dynamic target、`@zev2/shared`のpackage exportと再exportまで追うと、project-owned runtime codeは54件、owner→targetのunique runtime edgeは138件になる。

module解決・評価時に読むdataは2件へ閉じる。`packages/shared/package.json`は`@zev2/shared`の`.` exportを`dist/index.js`へ解決するために読み、話者policyは`presentation-source-speaker-non-identity-registry-v001/registry.json`をmodule評価時に同期読取する。前者はloaderの暗黙読取、後者はproject codeの`readFileSync` 1件であり、他のmodule-load file I/O・自動CLI起動・書込みは観測されない。この2件もjobのlive SHA bindingへ加える。

保証限界として、話者registryの欠落・破損はtitle runner本体のtry/catchより前のmodule評価で失敗し得るため、その失敗をtitle runnerの構造化fatal reportへ必ず変換できるとは主張しない。56 bindingは実行前の同一性を閉じるが、loaderより前に別bootstrapを新設したことにはならない。本訂正はtitle schema、折り、描画、QC、公開方式を変えず、実行graphの閉包と保証境界だけを現物へ合わせる。

### 3.7 初回正式実行で確定した生成時jobとlive契約の分離

横型の初回正式attemptは描画前のsource-validationで検査済み拒否となった。読み取り診断では、source manifestと生成時formal jobのruntime・implementation来歴は相互に完全一致し、title以外の意味内容も完全一致していた。一方、現行の出力job validatorは、生成時11件のimplementation roleを現在12件のrole集合へ一致させるため、凍結済みの正しい生成記録を拒否していた。

これはsource成果物の欠陥や契約衝突ではなく、案C原則で分離済みの「生成時来歴」と「現在実行のlive束縛」をtitle runnerのsource検証へ適用し切れていなかった実装欠陥である。修正は次の範囲へ限定する。

- 生成時implementation集合はsource manifestと生成時formal jobのbyte・順序完全一致で検査する。
- 生成時集合を現在集合へ一致させる要求は置かない。
- 生成時formal job内のrequest bindingはjob保存側、source manifest内のrequest bindingはcontrol公開側を指すため、path同一を要求しない。schema・file SHA・canonical SHAの一致と既存validatorによるrequest ID・出力path対応を要求する。
- formal jobのそれ以外のschema、request束縛、出力path、実行方針、承認契約束縛は既存validatorを再利用して検査する。
- title job自身の現在56 implementation bindingとlive file SHA照合は一切緩めない。
- 初回拒否記録と未使用の出力rootを証拠として保持し、job値・title・source成果物は変えない。

この修正は生成来歴の証明とlive実行束縛を別役割とする既存裁定の適用であり、旧成果物の変換、fallback、現在実装への再生成を導入しない。

### 3.8 共通QCの成果物名profileをtitle経路へ接続

生成時job分離後の横型attemptはoverlay-preflightで検査済み拒否となった。保安保持されたlayout・PNG・line maskを既存検査処理で再読した結果、layout、安全領域、行数、alpha、preset、SHAは全て合格し、違反は`INSTRUCTION_RENDER_MISSING` 1件だけだった。

内訳は、共通描画処理がcustom artifact namesで`title-display-plan-v001.json`を製造した一方、QC呼出しが既定の`presentation-render-plan-v002.json`を参照していた成果物名profileの接続漏れである。同じ保存済み証拠へ既存QCをtitle plan名で適用すると、違反0件で合格した。

修正はtitle runnerが既存QC入口へtitle plan名を明示する一箇所だけとする。違反集合、配置計算、安全領域、alpha検査、媒体検査、common renderer、成果物schemaは変更しない。失敗workとlockは削除せず保持し、修正後は新しい版付きjob/output rootを使う。

## 4. 保証境界とforward-only方式

### 4.1 入力

タイトルcompositorは次の3組を受ける。

1. 非空titleを持つ正式ZEVG意味情報パッケージ。
2. 同じsource/timeline/captions/semantic observationsから既に完成・合格した、titleなしのZEVO v001出力一式。
3. format別title style profile。

source packageとtitle packageでは`packageId`、`timelineId`、`provenance`の世代差を許す。ただし、次はobject・順序込みで同じでなければ拒否する。

- `sourceMedia`
- `timelineComposition.segments`
- `captions`
- `semanticObservations`
- caption本文projection
- caption時刻projection

source titleはexact `{"text":"","inputMode":"none"}`、新titleは非空・CR/LFなし・`inputMode:"human"`でなければならない。違いを許す意味内容はtitleだけである。

### 4.2 証明すること

- source ZEVO v001のmanifest、render plan、QC、videoが相互に束縛され、現物SHAと一致する。さらにmanifestが参照するformal job、output request、acceptance report、meaning package、base media 4成果物、application resultsを全てstable readし、file/canonical SHAを現物へ照合する。
- source manifestが束縛する正式jobと意味packageを辿り、生成時runtime/implementation来歴をそのjobとの間で照合する。
- 新title jobのruntime/implementation bindingは実行時のlive実体と一致する。
- title本文がbyte上変わらず、profile規則で折られ、タイトル要素1件として適用された。
- 出力frame数とaudio packet payload SHAがsourceと一致する。現行媒体観測が実測しないsample countは証明対象へ書かない。
- 新成果物の全JSON・video・overlayがbindingで閉じ、未束縛sidecarがない。

### 4.3 証明しないこと

- source生成時実装SHAと現在実装SHAの同一性は要求しない。生成来歴とlive実行束縛を分離する案C原則を維持する。
- source動画のcaptionを新packageから再描画したとは主張しない。既に検証済みのsource videoをunderlayとして使う。
- タイトルの面白さ、完成動画としての読みやすさ、表示時間の最良性は機械合格にしない。完成横・縦2本をkawafmmが目視する。
- titleと焼き込み済みcaptionの知覚上の競合は、titleのsafe area検査と完成目視で扱う。source captionを画像から逆推定しない。

### 4.4 後方互換を作らない

- `presentation-output-render-plan-v001`をtitle planとして受理しない。
- title planを旧planへ変換しない。
- 非空titleを旧B4へfallbackしない。
- 既存output rootへsidecarを足さない。
- 既存3本を移行・再公開しない。

## 5. exact schema

全objectは記載順のexact keyで、未知keyを拒否する。JSONは既存formal serializerの2-space・末尾LF、canonical SHAは既存canonical JSON正本を使う。独自serializerを作らない。

### 5.1 共通binding

- JSON binding: `[schemaVersion,path,fileSha256,canonicalSha256]`
- media binding: `[path,fileSha256]`
- implementation binding: `[path,fileSha256,role]`
- runtime profile: `[node,tsx,remotion,browser,ffmpeg,ffprobe,imageMagick]`
- runtime各項目: `[path,version,fileSha256]`

既存validatorを直接呼ぶ。pathはworkspace-relative、runtime pathだけabsoluteである。

### 5.2 title style registry

schema: `zevo-title-style-registry-v001`

- root: `[schemaVersion,registryId,fontAssets,layoutRules,profiles]`
- font asset: `[fontAssetId,fileName,path,fileSha256,licensePath]`
- profile: `[profileId,format,canvas,safeArea,displayFrameRange,maxLogicalWidth,maxLines,visualState]`
- canvas: `[width,height,fps]`
- safe area: `[top,right,bottom,left]`
- display range: `[startFrame,endFrameExclusive]`
- visual state: `[stateId,textStyle,position,background,layout,transitionId]`
- text style: `[fontAssetId,fontSizePx,fontColor,borderColor,borderWidthPx,lineSpacingPercent,glowColor,glowWidthPx,glowOpacityPercent]`
- position: `[preset,alignment,offsetXPercent,offsetYPercent]`
- layout: `[maxCharsPerLine,maxLines,singleLine]`

`layoutRules`は`PRESENTATION_RENDERER_IMPLEMENTED_LAYOUT_RULES_V001`とobject単位で完全一致し、character widthは既存正本と一致する。profileの`maxLogicalWidth/maxLines`はvisual stateのlayoutと一致しなければならない。registryとjob/planにはcrop、viewport、source座標を置かない。

初回registry値は次のとおり。

| profile | format/canvas | safe area | 表示frame | 幅/行 | 文字・縁・光彩 | 位置 |
|---|---|---|---|---|---|---|
| `zevo-title-normal-landscape-top-v001` | `normal-landscape`、1920×1080、30fps | top40/right80/bottom40/left80 | `[0,180)` | 36、最大2行 | LINESeed JP ExtraBold、96px、縁8px、光彩12px/82% | top-center、center、offset 0/0 |
| `zevo-title-vertical-short-top-v001` | `vertical-short-1080x1920`、1080×1920、30fps | top38/right43/bottom38/left43 | `[0,180)` | 14、最大2行 | LINESeed JP ExtraBold、134px、縁11px、光彩17px/82% | top-center、center、offset 0/0 |

色は両profileとも本文`#FFFDF8`、縁`#111827`、光彩`#000000`、行間150%。font SHAは`4f20353d5ba41012fb8eaaa653d2ac46f80d63880301a6590765897bbdfedbfb`、licenseは`runner/public/font/OFL_LINESeedJP.txt`。横型96/36と縦型134/14は各形式で人間認定済みの現行caption preset値をそのまま再利用した。0〜180 frameはC v001のstyle入力として置く冒頭6秒の暫定値であり、コード定数ではない。位置・時間の最良性は完成2本の目視対象とし、差し替える場合は新registry/profileと新jobにする。

### 5.3 title output job

schema: `zevo-title-output-job-v001`

exact root:

```text
[schemaVersion,jobId,outputId,titleMeaningPackageBinding,sourceOutput,
 styleRegistryBinding,profileId,publication,runtimeProfile,implementationBindings]
```

- `sourceOutput`: `[manifest,renderPlan,qc,video]`
- `publication`: `[outputRoot]`
- `outputRoot`末尾は`outputId`と一致する。
- `titleMeaningPackageBinding`は非空human titleの正式packageだけを指す。
- `profileId`はregistryにexact一件存在する。
- implementation bindingは、runner・compositor・共通描画・描画entry・layout inspectorから再帰的に到達するproject-owned runtime code 54件（unique runtime edge 138件）と、module解決・module評価で読む既知data 2件の計56 role/path exact集合で、順序も表の順とする。value static import/export-from、literal dynamic import 2件、固定されたcomputed dynamic import 3 target、`@zev2/shared`のpackage export解決を含み、type-only importは実行graphから除く。role/path重複、欠落、余分、roleとpathの入替を拒否する。SHAはjob固定時のlive実体から取得し、設計書へ焼き込まない。

| 順 | role | path |
|---:|---|---|
| 1 | `formal-json-serializer` | `evals/clip_composition/presentation_caption_contract_v002.mjs` |
| 2 | `meaning-package-contract` | `evals/clip_composition/presentation_meaning_information_package_v001.mjs` |
| 3 | `output-contract` | `evals/clip_composition/presentation_output_contract_v001.mjs` |
| 4 | `title-text-layout` | `evals/clip_composition/presentation_renderer_text_layout_v001.mjs` |
| 5 | `renderer-plan-contract` | `evals/clip_composition/presentation_renderer_plan_v002.mjs` |
| 6 | `title-compositor` | `evals/clip_composition/presentation_output_title_compositor_v001.mjs` |
| 7 | `stable-workspace-reader` | `evals/clip_composition/presentation_timeline_composition_decision_v001.mjs` |
| 8 | `finite-json-decoder` | `evals/clip_composition/presentation_output_crop_application_v001.mjs` |
| 9 | `source-output-contract` | `evals/clip_composition/presentation_output_render_plan_v001.mjs` |
| 10 | `renderer-qc` | `evals/clip_composition/presentation_renderer_qc_v002.mjs` |
| 11 | `common-renderer` | `evals/clip_composition/render_presentation_v002.mjs` |
| 12 | `title-output-runner` | `evals/clip_composition/run_presentation_output_title_job_v001.ts` |
| 13 | `instruction-contract` | `evals/clip_composition/presentation_instruction_contract_v002.mjs` |
| 14 | `base-media-timeline` | `evals/clip_composition/presentation_base_media_timeline_v002.mjs` |
| 15 | `fatal-observation` | `evals/clip_composition/presentation_fatal_observation_v002.mjs` |
| 16 | `title-renderer-entry` | `evals/clip_composition/presentation_renderer_entry_v001.tsx` |
| 17 | `title-layout-inspector` | `evals/clip_composition/inspect_presentation_render_layout_v001.ts` |
| 18 | `landscape-layout-inspector` | `evals/clip_composition/inspect_presentation_preset_layout.ts` |
| 19 | `base-media-builder` | `evals/clip_composition/presentation_base_media_build_v001.mjs` |
| 20 | `caption-api-cost-guard` | `evals/clip_composition/presentation_caption_api_cost_guard_v001.mjs` |
| 21 | `caption-contract-v003` | `evals/clip_composition/presentation_caption_contract_v003.mjs` |
| 22 | `caption-display-pair-v003` | `evals/clip_composition/presentation_caption_display_pair_v003.mjs` |
| 23 | `caption-display-pair-v004` | `evals/clip_composition/presentation_caption_display_pair_v004.mjs` |
| 24 | `caption-semantic-output` | `evals/clip_composition/presentation_caption_semantic_output_v001.mjs` |
| 25 | `caption-semantic-source-package` | `evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs` |
| 26 | `instruction-contract-v003` | `evals/clip_composition/presentation_instruction_contract_v003.mjs` |
| 27 | `instruction-contract-v004` | `evals/clip_composition/presentation_instruction_contract_v004.mjs` |
| 28 | `meaning-boundary-selection` | `evals/clip_composition/presentation_meaning_boundary_selection_v001.mjs` |
| 29 | `meaning-boundary-source-package` | `evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs` |
| 30 | `meaning-output-run-input-record` | `evals/clip_composition/presentation_meaning_output_run_input_record_v001.mjs` |
| 31 | `output-base-media` | `evals/clip_composition/presentation_output_base_media_v001.mjs` |
| 32 | `page-line-planner` | `evals/clip_composition/presentation_output_page_line_planner_v001.mjs` |
| 33 | `output-style-resolver` | `evals/clip_composition/presentation_output_style_resolver_v001.ts` |
| 34 | `retained-source-atoms` | `evals/clip_composition/presentation_retained_source_atoms_v001.mjs` |
| 35 | `segmenter-boundary-evidence` | `evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs` |
| 36 | `source-speaker-policy` | `evals/clip_composition/presentation_source_speaker_policy_v001.mjs` |
| 37 | `vertical-review-renderer` | `evals/clip_composition/render_presentation_vertical_review_v001.ts` |
| 38 | `caption-display-pair-job` | `evals/clip_composition/run_presentation_caption_display_pair_job_v001.mjs` |
| 39 | `caption-gate-b6-runner` | `evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs` |
| 40 | `caption-semantic-output-check` | `evals/clip_composition/run_presentation_caption_semantic_output_check_v001.mjs` |
| 41 | `meaning-boundary-b5-b6-runner` | `evals/clip_composition/run_presentation_meaning_boundary_b5_b6_v001.mjs` |
| 42 | `segmenter-boundary-preflight` | `evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs` |
| 43 | `shared-runtime-activity` | `packages/shared/dist/activity.js` |
| 44 | `shared-runtime-common` | `packages/shared/dist/common.js` |
| 45 | `shared-runtime-index` | `packages/shared/dist/index.js` |
| 46 | `shared-runtime-web-gemini-review` | `packages/shared/dist/web-gemini-review.js` |
| 47 | `telop-text-component` | `runner/src/remotion/components/TelopText.tsx` |
| 48 | `telop-font-utils` | `runner/src/remotion/utils/telop-font.ts` |
| 49 | `screen-layout` | `runner/src/screen-layout.ts` |
| 50 | `telop-glow` | `runner/src/shared/telop-glow.ts` |
| 51 | `telop-remotion` | `runner/src/telop-remotion.ts` |
| 52 | `telop-line-break` | `runner/src/telop/telop-line-break.ts` |
| 53 | `telop-render-model` | `runner/src/telop/telop-render-model.ts` |
| 54 | `telop-text-metrics` | `runner/src/telop/text-metrics.ts` |
| 55 | `shared-package-manifest` | `packages/shared/package.json` |
| 56 | `source-speaker-registry-v001` | `evals/clip_composition/registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json` |

55・56は実行codeではなく、package export解決とmodule評価時の同期読取に必要な既知dataである。fontとlicenseはimplementationではなくtitle style registry assetであり、registryのpath/SHAと実体を別に照合する。両者をimplementation bindingへ重複登録しない。

### 5.4 title display plan

schema: `zevo-title-display-plan-v001`

```text
[schemaVersion,planId,jobBinding,titleMeaningPackageBinding,sourceOutput,
 styleRegistryBinding,profileId,format,canvas,safeArea,displayFrameRange,
 titleDisplay,sourceMeaningProjection,titleMeaningProjection]
```

`titleDisplay` exact:

```text
[displayId,text,indexedLines,requestedProfileId,appliedProfileId,
 startFrame,endFrameExclusive,displayFrameCount]
```

- `requestedProfileId == appliedProfileId == profileId`。
- `text`はZEVG titleとbyte同一。
- `indexedLines`は既存文字折り入口の結果そのもの。
- `start/end/count`はprofileのrangeと一致。
- source projectionは`titleState:"empty"`、新projectionは`titleState:"provided"`。

### 5.5 common draw coreへの投影

common planのschemaは既存`presentation-output-common-core-plan-v001`をそのまま使う。

```text
[schemaVersion,format,canvas,layoutRules,elements]
```

`elements`はexact 1件。title elementは次のkeyを持つ。

```text
[instructionId,kind,text,indexedLines,sourceStartMs,sourceEndMs,
 startFrame,endFrameExclusive,displayFrameCount,requestedProfileId,
 appliedProfileId,requestedPresetId,appliedPresetId,presetId,
 registryVersion,presetRegistryVersion,stateId,visualState,transition,
 timelineSegmentId,targetProvenance,materialRefs]
```

- `kind:"title-cover"`
- source時刻・timeline segmentは`null`
- `transition:null`。入退場はcommon coreの既存4-frame alphaだけを使う。
- provenanceは`targetType:"meaning-title"`、`sourceAtomIds:[]`
- material refsは空。

### 5.6 renderer evidence

schema: `zevo-title-renderer-evidence-v001`

```text
[schemaVersion,evidenceId,planBinding,applicationResults,rendererQc]
```

common coreの生`applicationResults`と`finalQc`を一つの正式artifactへ保存する。application resultはタイトル1件だけ、renderer QCは`presentation-render-qc-v002`のpassed、instruction count 1、violations 0でなければならない。これにより描画証拠をinlineだけで済ませず、未束縛sidecarも作らない。

### 5.7 title QC

schema: `zevo-title-output-qc-v001`

```text
[schemaVersion,qcId,status,jobBinding,planBinding,rendererEvidenceBinding,
 outputVideo,checks,evidence]
```

checks exact 6:

```text
[sourceBinding,titleTextIntegrity,titleApplication,titleLayoutAndVisibility,
 mediaFramePreservation,audioPreservation]
```

全て`passed`だけを正式公開する。evidence exact:

```text
[sourceVideoFileSha256,outputVideoFileSha256,titleTextCanonicalSha256,
 titleDisplayCount,sourceFrameCount,outputFrameCount,
 sourceAudioPacketPayloadSha256,
 outputAudioPacketPayloadSha256]
```

title countは1、frameはsourceと同数、audio packet payload SHAは同一とする。

### 5.8 manifest

schema: `zevo-title-output-manifest-v001`

```text
[schemaVersion,manifestId,status,jobBinding,titleMeaningPackageBinding,
 sourceOutput,styleRegistryBinding,profileId,planBinding,
 rendererEvidenceBinding,qcBinding,video,runtimeProfile,
 implementationBindings]
```

job、title package、source 4成果物、registry、plan、renderer evidence、QC、video、live runtime/implementationを全て束縛する。

### 5.9 CLI・status・失敗

- module import時のproject-owned明示file I/Oは、話者registryを読む`readFileSync` 1件だけ。加えて`@zev2/shared`解決時にpackage manifestをloaderが読む。両dataは56 bindingへ含め、これ以外のmodule-load file I/O・自動CLI起動・書込みを拒否する。
- CLI引数は正式job path 1件。
- exit 0: 6成果物をno-replace公開済み。
- exit 1: 検査済み拒否。正式output rootは公開しない。
- exit 2: I/O、resource、tool、報告不能等のfatal。正式output rootは公開しない。
- secret・生stderr・stack・字幕本文をfatal reportへ増やさない。既存fatal観測性v002の安全なstage/code/target file規則に従う。

話者registryの欠落・不正byteはrunner本体の起動前module評価でloader fatalになり得る。その場合まで構造化title fatal reportを保証せず、実行前の56 binding照合と固定loader条件が保証境界である。

新しい違反code集合は作らない。coreのpure builderは`built/passed/rejected`を返し、runnerは既存common drawの検査済み拒否とfatalをその所有stageのまま透過する。

## 6. 正式pathと成果物閉包

```text
evals/clip_composition/registries/presentation/
  zevo-title-style-registry-v001/registry.json

evals/clip_composition/outputs/presentation/title-output-jobs/<jobId>/
  formal-title-output-job.json

evals/clip_composition/outputs/presentation/title-output-renders/<outputId>/
  title-rendered-v001.mp4
  overlays/
  title-display-plan-v001.json
  title-application-results-v001.json  # schemaはzevo-title-renderer-evidence-v001
  title-output-qc-v001.json
  title-output-manifest-v001.json
```

正式artifact集合は上記6項目だけ。`overlays/`内はtitle 1件のPNG 1 file。temporary work、layout input、counterfactual video、frame画像を正式rootへ混ぜない。新QCとmanifestはrenderer evidenceを束縛し、未参照のapplication-results fileを作らない。

## 7. 決定的な処理順

1. job pathの固定root、basename、symlink/hardlink、byte安定読取を検査する。
2. jobをstrict decodeし、exact schema・正式serializer byte・値を検査する。
3. runtime、implementation、registry/font/licenseを実体からlive照合する。
4. source manifest→source formal job→source meaning package→source plan/QC/videoを辿り、各bindingを現物へ照合する。
5. source生成時runtime/implementationはsource formal jobとの一致だけを検査する。現在実装との世代一致を要求しない。
6. title packageを検証し、sourceとの意味差がtitleだけであることを検査する。
7. registry profileを一件選び、既存機械折り入口でindexed linesを作る。
8. title planとcommon core planを作り、exact validatorへ自己適用する。
9. native環境でcommon draw coreを一度実行する。
10. plan、renderer evidence、QC、manifestをformal serializeし、video・overlayと合わせたstaging閉包を再検査する。
11. no-replaceでoutput rootへ一度だけ公開し、公開後に全bindingを再読する。

同じ入力byteと同じruntime/implementation/registryならplan・JSON成果物はbyte同一である。MP4の決定性を外部toolを越えて一般化せず、同attemptではcommon coreが実施するoverlay repeat SHA一致を証明する。

## 8. 実装path 5件

| ID | path | 種別 | 役割 | 既存変更 |
|---|---|---|---|---|
| C01 | `evals/clip_composition/presentation_output_title_compositor_v001.mjs` | production core | registry/job/plan/evidence/QC/manifestのexact validator・builder、意味差検査、既存折りとcommon planへの投影 | 新規 |
| C02 | `evals/clip_composition/presentation_output_title_compositor_v001.test.mjs` | test | core 44件、全schema・分岐・閉包を証明 | 新規 |
| C03 | `evals/clip_composition/run_presentation_output_title_job_v001.ts` | production runner | 安定読取、source一式・live束縛、common draw、no-replace公開、CLI 0/1/2 | 新規 |
| C04 | `evals/clip_composition/run_presentation_output_title_job_v001.test.mjs` | test | runner contract/unit 16件、54 code／138 edge・既知data 2件の閉包、source束縛・公開規則を証明 | 新規 |
| C05 | `evals/clip_composition/registries/presentation/zevo-title-style-registry-v001/registry.json` | data | 横・縦profile、font、layout rulesの唯一のstyle入力 | 新規 |

既存fileの変更は0件。5 path目を超えるproduction/test/registry変更が必要なら停止する。正式job・実証成果物・TAP・完了reportは実行結果であり、実装path上限へ数えない。

## 9. 正式検査60件

### 9.1 core 44件

| ID | 証明 |
|---|---|
| ZTC001 | 横・縦profileを持つexact registryを受理 |
| ZTC002 | registry未知root keyを拒否 |
| ZTC003 | profileのcrop keyを拒否 |
| ZTC004 | profileのviewport keyを拒否 |
| ZTC005 | profile ID重複を拒否 |
| ZTC006 | 未束縛fontを拒否 |
| ZTC007 | 横formatの縦canvasを拒否 |
| ZTC008 | 縦formatの横canvasを拒否 |
| ZTC009 | human title packageを持つexact jobを受理 |
| ZTC010 | job未知keyを拒否 |
| ZTC011 | implementation binding空を拒否 |
| ZTC012 | 空title packageをtitle jobで拒否 |
| ZTC013 | package/timeline/provenanceの世代差だけを許可 |
| ZTC014 | target title空を拒否 |
| ZTC015 | sourceが既にtitle付きなら拒否 |
| ZTC016 | source mediaの意味差を拒否 |
| ZTC017 | timeline segment差を拒否 |
| ZTC018 | caption差を拒否 |
| ZTC019 | semantic observation差を拒否 |
| ZTC020 | 長いtitleを本文不変で機械折り |
| ZTC021 | 短いtitleは1行のまま |
| ZTC022 | max lines超過を拒否 |
| ZTC023 | requested/applied profile一致 |
| ZTC024 | profileのframe rangeをplanへexact投影 |
| ZTC025 | plan未知keyを拒否 |
| ZTC026 | planのcrop keyを拒否 |
| ZTC027 | common planはtitle-cover 1件だけ |
| ZTC028 | title本文・index・frame区間をcommon planで維持 |
| ZTC029 | 最終canvas座標だけを使いcrop field 0件 |
| ZTC030 | 縦型も同じcommon contractで構築 |
| ZTC031 | title 1件＋passed renderer QCのevidenceを受理 |
| ZTC032 | title application 2件を拒否 |
| ZTC033 | renderer evidenceからQC 6項目合格 |
| ZTC034 | frame数変化を拒否 |
| ZTC035 | audio packet payload変化を拒否 |
| ZTC036 | QC未知keyを拒否 |
| ZTC037 | manifestがjob/plan/evidence/QC/videoを全束縛 |
| ZTC038 | manifest未知keyを拒否 |
| ZTC039 | ZEVO v1 planをtitle planとして拒否 |
| ZTC040 | formal serializerの決定性・2-space・末尾LF |
| ZTC041 | common coreが描画直前にindexed title本文を再検査 |
| ZTC042 | manifest contextがrenderer evidence bindingの差し替えを拒否 |
| ZTC043 | implementation bindingのroleとpathの誤対応を拒否 |
| ZTC044 | 正しい56 role/path集合でも順序違いを拒否し、exact順を固定 |

### 9.2 runner 16件

| ID | 証明 |
|---|---|
| ZTOR001 | module import時に自動起動せずpure検査入口を公開し、module-load data読取を束縛済み2件へ閉じる |
| ZTOR002 | 正式job pathは版付きroot直下のexact fileだけを受理 |
| ZTOR003 | CLIはjob pathちょうど1件だけを受理 |
| ZTOR004 | job root外・nested・traversal pathを拒否 |
| ZTOR005 | NODE_OPTIONSは空値を含め存在自体を拒否 |
| ZTOR006 | 成果物集合を6名称へexact固定 |
| ZTOR007 | output rootをoutputIdから一意に導出 |
| ZTOR008 | source manifest/QC/videoを同じ既存v1 render rootへ束縛 |
| ZTOR009 | source planが既存control root外なら拒否 |
| ZTOR010 | title packageが正式meaning package root外なら拒否 |
| ZTOR011 | source v1 schemaと成果物名を変更しない |
| ZTOR012 | common draw coreを一度だけ呼び、no-replace commitを一度だけ使う |
| ZTOR013 | source成果物へのwrite/rename/unlink経路0件 |
| ZTOR014 | registry/font/license/source/implementation/runtimeを実読取監査 |
| ZTOR015 | runner開始時にもimplementation 56 role/path集合の欠落・余分・role/path入替を拒否し、project-owned runtime 54 code／138 unique edgeの閉包を照合 |
| ZTOR016 | source manifestの全参照(formal job/request/acceptance/meaning/base media 4/application results/plan/QC/video)を実byteで閉包し終了前再読 |

正式attemptは2 test fileを頭から1回実行し、TAP全文とstderrを版付きpathへ保存する。60/60でなければ同attemptで直さず停止する。60件はschema・pure計算・拒否枝・静的閉包のcontract/unit証明であり、正常時のsource全量読取、common draw、no-replace公開を身代わりなしで通すintegration証明は§12の横型・縦型正式run各1回が所有する。unit検査だけをrunner正常実経路の証明とは申告しない。

## 10. 既存回帰と逆影響

### 10.1 逆影響一覧

| 既存領域 | 影響 | 検証 |
|---|---|---|
| ZEVG meaning package v001 | 実装変更0。非空human titleの既存正式入口を使用 | candidate59 title package validator合格 |
| ZEVO v001 contract/plan/runner | 実装変更0。非空title拒否を維持 | green gateとORP006継続合格 |
| page/line planner | 変更0。captionの折り規則へ影響なし | green 287/287 |
| 横型・縦型preset | 変更0。値を新registryへdataとして引用するだけ | source tree照合 |
| crop | 変更0。title job/schemaにcrop keyなし | ZTC003/004/026 |
| common renderer | 変更0。既存exportを呼ぶ | runner実経路＋green |
| fatal観測性v002 | 変更0。既存安全な報告境界を利用 | direct/green回帰 |
| API | 呼ばない | 実行記録で通信0・費用0 |

### 10.2 回帰完了条件

1. 新規60/60。
2. 既存green gate 287/287。
3. baseline exact 86/203、failed 117不変。
4. 既存5 treeのpath/mode/blob OID完全一致。
5. 既存3本の正式動画・manifest・QC・plan SHA不変。

green gateは次の8 fileを同一aggregateで実行し、`tests=287 / pass=287 / fail=0 / skipped=0`、stderr 0 byte、終了0を必須とする。

| test file | 件数 |
|---|---:|
| `presentation_retained_source_atoms_v001.test.mjs` | 50 |
| `presentation_segmenter_boundary_evidence_v001.test.mjs` | 21 |
| `test_presentation_caption_semantic_source_package_v002.mjs` | 10 |
| `test_presentation_caption_semantic_output_v001.mjs` | 161 |
| `test_presentation_caption_semantic_output_v002.mjs` | 8 |
| `presentation_base_media_timeline_v002.test.mjs` | 15 |
| `test_presentation_caption_layout_inspection_json_v001.mjs` | 12 |
| `test_presentation_caption_api_cost_guard_v001.mjs` | 10 |

baselineは次の6 fileを同一aggregateで実行し、`tests=203 / pass=86 / fail=117 / cancelled=0 / skipped=0 / todo=0`をexact指紋とする。既知不合格117件を保持するため終了1は正常であり、終了codeだけで判定しない。

| test file | pass/tests |
|---|---:|
| `test_presentation_caption_semantic_source_package_v001.mjs` | 43/133 |
| `presentation_base_media_build_v001.test.mjs` | 6/20 |
| `presentation_renderer_v002.test.mjs` | 12/19 |
| `presentation_vertical_review_renderer_v001.test.mjs` | 22/23 |
| `presentation_vertical_formal_path_integration_v001.test.mjs` | 3/6 |
| `presentation_base_media_renderer_v002.integration.test.mjs` | 0/2 |

保護treeは次の5件を現在のstable tagから導出する。

| ID | rootの意味 | stable tag | tree OID | files |
|---|---|---|---|---:|
| FOVT001 | candidate 13横型 | `stable/first-clip-complete-20260727` | `27affa2cff1e099d263f5a00ed9c4558be1300bd` | 25 |
| FOVT002 | candidate 59旧横型 | `stable/second-clip-generality-20260728` | `454fcf002ac90b0d6ce72f63f55476ed9f8ffc72` | 21 |
| FOVT003 | candidate 59旧縦型 | `stable/vertical-first-clip-20260802` | `53076722863d2c36d470cc4ce9503739406ec03a` | 35 |
| FOVT004 | 意味/表現分離candidate59横型v003 | `stable/meaning-output-first-real-run-20260806` | `ce2f5807db5ff63b83e1200bcec9f40796210327` | 35 |
| FOVT005 | 意味/表現分離candidate59縦型v002 | `stable/meaning-output-first-real-run-20260806` | `5e65c51ad30a65f43b087a71b50f6172162b2c49` | 42 |

FOVT001〜005だけをname patternで選んだNode TAPは、同file内の他35件をskipとして列挙するため、合格指紋は`tests=40 / pass=5 / fail=0 / skipped=35`である。

## 11. 実装前・実装後監査

### 11.1 実装前

- 本書§3の全path・SHA・行位置を再読する。
- 親契約2件と本書のSHAを記録する。
- 5実装path以外に変更予定がないことを確認する。
- registry全数、profile全数、font/license実体、source output 4 bindingを確認する。
- 固定Node `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node`（SHA-256 `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c`）をPATH先頭へ置く。
- 固定TSX loader `/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs`（SHA-256 `f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f`）をabsolute `--import`で使う。
- NODE_OPTIONS不存在・native Chromium起動可能を記録する。
- 正式test中は監視rootへの並行書込みを行わない。
- 既存5 treeを開始時に照合する。

### 11.2 実装後・正式attempt前の標準監査

1. 定義/import/exportが現物に実在し、project-owned runtime graphが54 code／138 unique edge、module-load dataが束縛済み2件、その他のmodule-load I/O・自動起動が0件である。
2. rejectedとfatalをcatchで混同しない。
3. child processへ必要な固定実体だけを渡し、生stdout/stderrを成果物へ漏らさない。
4. target fileは検証済みjob/recordと実読取証拠からだけ導く。
5. output path不正、reservation、staging、publish競合のownerを分離する。
6. 正常・rejected・fatalの実経路を身代わり関数でなく可能な限り実物で通す。
7. 生成時来歴と現在live SHAを二層に分け、同一要求を再導入しない。
8. native環境・固定Node先頭PATH・固定TSX絶対path・NODE_OPTIONS不存在・Chromium起動可能を記録する。

監査不合格は正式60件を始めず停止する。

## 12. candidate 59実データ実証

### 12.1 固定入力

- ZEVG title package: SHA `61a756e3b217b49e185ac988771cc0812ea0f35ea7d0f84c520f80395b197e2a`
- title: `全部やりかけ`
- input mode: `human`
- 横型source: `qdczJpv8RCc-candidate-59-meaning-output-first-run-landscape-v003`
- 縦型source: `qdczJpv8RCc-candidate-59-meaning-output-first-run-vertical-v002`
- 横profile: `zevo-title-normal-landscape-top-v001`
- 縦profile: `zevo-title-vertical-short-top-v001`
- API通信: 0回
- 費用: US$0

sourceの保存済み主要値:

| format | manifest SHA | render plan SHA | QC SHA | video SHA |
|---|---|---|---|---|
| 横型 | `0b1085a57e44f06bdef3e70fcbbd90412690cfb3b7fb477b47971efe9c715219` | `17a2c8a499bc8a7c49a8bdcf4993fa6e0e7618c6d64a6650c6ffda3755f44988` | `70c95612a478ef53f9c8001d137d9ab90c12876d94f76e650d043f5921148f7c` | `175dc67489e86b2fc364894a737693a14a9c7c27fab492c0cb1873aedd6a77bc` |
| 縦型 | `109199c1c59e83ceb78c6fdf93e2de4a695526a83730fde5c6100b07594593a3` | `282389a256088fd374bd49453ee0c7c75f7e0a1828a157c99e99818a1a4778ad` | `ee302ace93d101e49d5c4fd50f02ceed760250c26a07ecfc075e4f09afa9c94f` | `eeb72350373be88022966059f09cd9b3f474a005ffa3cc18db8417eafdaa9618` |

両sourceは1,547 frame、audio packet payload SHA `d18469bd3132356b03870ee8bc3d63e95947bd254961157e09d59cf9a53459ec`。

### 12.2 実行

1. registryをformal serializeしSHA固定する。
2. 横・縦jobを別ID・別未使用output rootで固定する。
3. jobと全参照先を起動直前に再読する。
4. 横型をnative環境で1回、縦型を同じ環境で1回実行する。
5. 各出力で6成果物閉包、frame 1,547、audio packet payload SHA維持、QC 6/6を確認する。
6. 既存source rootへ追加・変更がないことを再照合する。

API通信やZEVG再生成は行わない。失敗した場合、同じoutput rootを再利用せず、失敗証拠を保持して停止する。

### 12.3 人間確認

人間へ渡すのは完成MP4 2本だけ。各51.566秒を全編一度見る。

- 横型: タイトル位置、読みやすさ、冒頭6秒の長さ、既存字幕との共存。
- 縦型: タイトル位置、読みやすさ、冒頭6秒の長さ、crop済み画面・字幕との共存。
- 共通: 文言`全部やりかけ`が素材内容と合うか。文言だけを替えたい場合、新title package/jobで替えられ、コード・registry変更は不要であること。

人間作業は2判断、視聴実尺合計約103秒、操作を含む目安2〜4分。目視前の機械照合を人間へ回さない。目視合格まではstable tagを切らない。

## 13. 完全性チェック

| 項目 | 判定 | 根拠 |
|---|---|---|
| 値レベル閉包 | 合格 | 初回profile全値、title、source SHA、frame/audio値を固定 |
| 参照実体存在 | 合格 | §3.1〜3.3でSHA・行位置付き照合 |
| 発火枝全数 | 合格 | title受理、折り、top-center、draw、QC、publishの実枝を全数確認 |
| 工程間受け渡し | 合格 | B1 v003→title package→source output→title job→6成果物をSHAで閉包 |
| 観測データ取得可能性 | 合格 | applicationResults/finalQcをrenderer evidenceへ保存しQC/manifestが束縛 |
| 数値区分 | 合格 | source時刻は既存整数msのまま、title表示は整数frame、style幾何はregistry finite number |
| byte閉包 | 合格 | formal serializer・canonical・file SHA・no-replace・公開後再読 |
| 件数閉包 | 合格 | 実装5 path、新規60件、artifact 6項目、human 2判断 |
| 保証境界 | 合格 | §4でsource再描画を証明しない限界まで宣言 |
| 後方互換禁止 | 合格 | v1変更0、変換/fallback/併産なし |
| candidate固有値漏洩 | 合格 | title文字列とsource bindingsはjobだけ、styleはregistry、code固定0 |
| secret | 合格 | 外部通信0、secret入力0、報告保存0 |
| 現物照合深度 | 合格 | 所有、逆影響、値、argv/runtime、artifact閉包まで確認 |

人間判断を要する未固定事項は0件。0〜180 frameの品質は未固定ではなく初回style値であり、最良性を完成目視で判定する。目視不合格時は検査を緩めず、新profileの設計判断としてkawafmmへ戻す。

## 14. 停止条件

- 6つ目の実装pathが必要。
- 既存production、schema、違反code、検査期待値の変更が必要。
- sourceとtitle packageにtitle以外の意味差がある。
- common drawにtitle要素を通すため計算複製やfallbackが必要。
- 新規60件に1件でも不合格がある。
- green 287、baseline 86/203・failed117、5 treeのいずれかが変わる。
- 既存3本またはstable tagへ変更が出る。
- API通信、費用、G4〜G7、タイトル自動生成が必要。
- 同一計画内の軽微な検査・fixture修正が2周で収束しない。

停止時は事実・推測・未確認を分け、同attemptで直さない。

## 15. 完了報告に含める事実

- 実装5 pathのSHA表。
- 新規60/60のTAP path。
- green 287/287、baseline 86/203・failed117、5 tree一致。
- 横・縦のjob、plan、renderer evidence、QC、manifest、videoのpath/SHA。
- 各動画のframe数、尺、audio packet payload SHA、QC 6項目。
- 外部通信0回、費用US$0。
- 人間へ見てほしい点4つと、必要判断が2件だけであること。
- 既存3本・stable tagが不変であること。
- 保証限界: 既存titleless出力へのforward-only overlay実証であり、任意の新packageを一発生成する全面ZEVO v2ではないこと。

本設計は、タイトルC工程を「ZEVGが文字列を運ぶ／ZEVOが表現する」という確定境界のまま、最小の実体で横型・縦型へ到達させる。実装・検査・実データ実証は2026-08-08のkawafmm一括承認範囲内であり、上記停止条件がなければ連続して完成報告まで進める。
