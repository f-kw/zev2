# ZEVO字幕品質v002 selection再読実値配線追補 v003

- 日付: 2026-08-11
- 状態: 起草提示・承認待ち
- 開始HEAD: 542b35684a3ad67dbab042ca2bb3bff022e42023
- 実装: 0 path
- 正式検査: 0件
- API通信: 0回
- 描画: 0件
- 費用: US$0

## 0. 結論

本追補は、selectionが実際に使う意味情報package、基礎映像時刻表、style台帳実値、基礎映像4束縛値を、検証済みbindingからstable再読し、実在する正本関数のactual引数へ渡す配線だけを追加する。

14 path内のselection production path #5へ、次の三入口を追加する。

1. bindingからcaseごとの実値を一度だけstable再読し、module-onlyの検証済みcase inputへ組み立てる入口。
2. そのcase inputと選択済み境界から、全captionのcue範囲とsource closureを一度だけ組み立てる入口。
3. 同じsource closure resultから、物理配置、時間写像、projection、正式caption displayを一度だけ組み立てる入口。

selection runnerとproof runnerは別processなので、それぞれの実行時点で同じbindingを再読する。ただし、読取、case input組立て、atom record組立て、cue範囲組立て、物理・時間projection組立て、caption display組立ては、両processとも上記の同じ三exportを同じ順で呼ぶ。planner v003、proof runner、render v003に別reader、別record組立て、別style・timeline計算を作らない。

formal成果物schema、14 path、47 violation code、46検査ID、既存status、終了code、既存成果物は不変である。既存proof item 393件へ本追補V3の67件を加え、承認後の期待を460件へ改訂する。

現在のS/A局所合格4 pathは正式attemptではなく、現物監査でSのexact item schema差を確認した。L凍結1 pathには空projectionと架空引数が残る。この5 pathはSHA証拠を保持した後に全て除去し、新attemptではSから全面再実装する。局所17/17の記録は歴史証拠として保持するが、実装完了証明には使わない。

## 1. 正本、適用順、限定上書き

### 1.1 読む正本

| 順 | 文書 | SHA-256 | 扱い |
|---:|---|---|---|
| 1 | presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md | 33b61ee497d765fbe9eb63fb1b05bce16a99488d238eb27b732550b4daac24ba | 親契約 |
| 2 | presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md | 44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4 | 完全実装設計 |
| 3 | presentation-zevo-caption-quality-v002-complete-implementation-design-binding-wiring-addendum-20260811-v002.md | a3c8c3ef8e57cd557e4a7cae17ecc188dc523df1508a45de6e2bce36691c7e4d | 累積追補v002 |
| 4 | presentation-zevo-caption-quality-v002-full-reimplementation-correction-design-20260811-v001.md | 2e7905588da53e14fd762750ab2a6b753fb352c07a164096141175e4464e2fdc | S→A→L→P→R→F→Uの実装順を定める実行計画。formal jobのapprovedContractBindingsには含めない |
| 5 | 本追補v003 | 承認時に実fileから算出しDECISIONSの承認行へ記録 | selection実値配線だけを限定上書き |

起草根拠はpresentation-zevo-caption-quality-v002-full-reimplementation-l-gate-input-closure-stop-report-20260811-v001.md、SHA-256 543e3c4f7275e31c70cfd03bc18c495e934ffa1504411450319db286d09a5494である。

承認済み追補v001は履歴としてbyte不変保持する。累積追補v002がv001を包含する扱いは変えない。本追補はv002を包含・置換せず、selection実値配線の追加正本として読む。

### 1.2 限定上書き箇所

| 正本箇所 | v003での扱い |
|---|---|
| 完全実装設計§3.1 path #5 projection builder surface | 3 builderへ共用cueRangesと必要なcanonical/hash capabilityを追加し、共用reader、全case source-closure、全case projection-setを同pathのnamed exportへ追加 |
| 完全実装設計§3.1 dependency surface | selectionの5 keyへ値整合用3 keyとfatal classifier 1 keyを追加して9 keyへ置換。再読用10 key、projection-set/planner用8 keyを別exact objectとして追加 |
| 完全実装設計§3.1 共通builder rejected union | 既存builder/admissionの`code,path,relatedPaths` unionは不変。新しい全case source-closureとprojection-setだけはconsumerごとにcode所有が異なるため、§3.4のowner-neutral module-only rejectedを返し、selectionはformal `relatedIds`、plannerは既存module unionの`relatedPaths=[]`へ一意変換する |
| 累積追補v002 §3.3 selection admission exact 8 key | workspaceRootと10-key rereadDependenciesを加えたexact 10 keyへ置換。caseInputResultはrunnerから受けず、admissionが既存provider検査の後に共用readerをexact一回呼んで得る |
| 累積追補v002 §3.4 runner固定順3〜4 | runnerは上流照合後にworkspaceRoot、10-key rereadDependencies、9-key verifiedDependenciesを組み立ててadmissionへ渡す。admissionは既存provider検査の先頭8件を先に確定し、その全件成立後だけ共用実値再読入口を呼ぶ。atomClosureは共用source-closure、logicalWidthは既存検査、deterministicReconstructionは共用projection-setのreconstruction binding/projection phaseの順で確定してから後段へ進む。固定literal import順へ§3.1の実在exportを追加 |
| 累積追補v002 §4.5 proof runner 12段固定順 | 検証済みproof job/source/selection/selection report/implementation/contractの前後照合完了後、かつ最初のoutput request製造前に、共用readerをexact一回呼ぶ段を追加する。以後のoutput request製造〜公開前再読の相対順は不変 |
| 累積追補v002 §4.2 planner exact 8 key | meaningPackageを全件caseInputResultへ、4-key verifiedDependenciesを8-key projectionDependenciesへ置換したexact 8 keyへ置換 |
| 完全実装設計§3.1 planner passed value | formal pageLinePlanだけを持つ1 keyから、同じprojection-set由来のmodule-only renderSupportを加えたexact 2 keyへ限定置換。formal plan schemaは不変 |
| 累積追補v002 §6 approvedContractBindings | selection/proofだけ本追補を4件目へ追加。source/B5/B6の3件は不変 |
| 累積追補v002 §8.6〜8.8 | 本追補§6の実値field行を追加 |
| 完全実装設計§5.6 fatal/check表・selection内部状態→CLI写像表 | 本追補§7の意味実値再読、style・基礎映像再読、resolver/projection failure行だけを限定上書きし、formal report status・13 checks・CLI stage・primaryCodeを一組で固定 |
| 完全実装設計§9 code owner・§10 violation owner説明 | code集合と所有検査IDは不変。CUE_SELECTION_INPUT_BINDING_MISMATCHの対象を上流4入力に加えて共用readerが検証するmeaning/style/base binding不一致へ限定拡張し、そのcodeはZCQ018だけが所有する。ZCQ024はmeaning closure、ZCQ026は物理/timeline checked rejection、ZCQ027はfatal/status写像を所有 |
| 累積追補v002 §10.1 数量表 | proof item期待を393から460へ置換。approved contract binding/jobはsource/B5/B6=3、selection/proof=4へ分離。selection production exportはpure finalizerに加え、共用stable reader、全case source-closure、全case projection-set、3 builderの改訂surfaceを持つ。proof production exportのfade照合pure exportは不変で、共用exportはpath #5から固定literal importする |
| 累積追補v002 §10.2〜10.3 | V3=67の追加と、本追補だけに適用する§10.2のmarker抽出規則を追加 |
| 全面再実装修正設計全文 | S→A→L→P→R→F→Uの直列局所ゲート、旧部分実装非流用、各production完成直後の閉包は維持する。同設計内の全ての「正本3件／承認済み契約3件」「proof item 393件」と、それを参照する開始前、局所ゲート、追加監査、正式attempt、停止、完全性、完了条件だけを、selection/proofの正本4件、P/V1/V2/V3=460件へ限定置換する。source/B5/B6のformal job契約3件は不変 |

上表以外は変更しない。

### 1.3 保証境界

保証するのは、検証済みbindingが指す実fileを各runnerの実行時にstable再読し、同じ共用exportが実値をactual引数へ組み立てたこと、その同じ組立て結果からselection reportとplannerの正式caption displayを得たことである。

別process間で同じJavaScript object identityを共有することは保証しない。両processが同じbinding、同じ正式byte、同じ既存named export、同じexact module-only schemaを使うことを保証する。global状態、process.cwd、hidden metadata、path推測、その場のbinding製造、独自reader、独自SHA、正本関数のwrapperを禁止する。

## 2. 実現性調査

### 2.1 actual引数の現物逆引き

| 実在export | 現物path / SHA-256 / 位置 | actual引数・戻り値 | v003での用途 |
|---|---|---|---|
| readPresentationMeaningWorkspaceFileStableV001({workspaceRoot,relativePath,allowHardlink=false}) | presentation_timeline_composition_decision_v001.mjs / 6bd3adba0b12d118df93ffd978c29a727db49003c8391d47f82f23a14ea796ba / 407行 | 安全なworkspace相対pathからstable Bufferを返す | JSON実byte再読の唯一の正本 |
| hashAbsoluteStableStreaming(absolute) | 同file / 同SHA / 384行 | 大容量媒体をchunk読取しSHA文字列を返す | 基礎映像byte照合の唯一の正本 |
| classifyPresentationFatalInnerCodeV002(evidence) | presentation_fatal_observation_v002.mjs / cf95c2ba8785be681dcecc03dc4ec009d6f02b4161e3c39f7edbf431b92b6115 / 335行 | 閉じたstructured evidenceから14 inner codeの一つを返す | reader/projection例外のfatal分類正本 |
| canonicalSha256PresentationAJsonV002(value) | presentation_a_source_sequence_v002.mjs / c20401d398956710842823e9ec2677f07cf5686c9f04b03c1df1532d540e09ec / 93行 | 整数限定meaning JSONのcanonical SHA文字列を返す | 意味package binding照合 |
| sha256PresentationCaptionB1BytesV001(bytes) | presentation_caption_semantic_source_package_v001.mjs / ac3dcbbc671af6f56dcceeea6a41c8ae9cbf9fc4ba28a8a00bbc5d6faff45bcd / 1710行 | exact {status:hashed,sha256} | 再読byteのfile SHA |
| validatePresentationAMeaningInformationPackageFormalBytesV002(bytes,context={}) | presentation_a_meaning_information_package_v002.mjs / 40a85f526666dd5f68bf64d141a5236146ae5b8e2baf285d4390bef41410e1a2 / 413行 | 成功時status=passed,value | 意味package formal検証 |
| decodePresentationOutputFiniteJsonV001(bytes) | presentation_output_crop_application_v001.mjs / 322fdc1e06a13600c522f577913336c6f042851305880e5053b8728f2d8640d3 / 158行 | 正当な有限整数・有限小数を保持するformal JSON decode union | style 5とbase JSON 3の復号 |
| serializePresentationOutputCropApplicationFormalJsonV001(value) | 同file / 同SHA / 181行 | 有限数値JSONのformal byteを返す | style/base再読byteのformal一致 |
| canonicalSha256PresentationOutputFiniteJsonV001(value) | 同file / 同SHA / 186行 | 有限数値JSONのcanonical SHA文字列を返す | style/base 4-key binding照合 |
| sha256PresentationOutputCropApplicationBytesV001(bytes) | 同file / 同SHA / 193行 | SHA-256文字列を返す | style/base再読byteのfile SHA |
| resolvePresentationOutputStyleV001({...}) | presentation_output_style_resolver_v001.ts / e63e4b4cf47d94d763333e13513570abe2dbac418e5ac5b396e1295b22956403 / 224行 | exact objectを受け成功status=resolved | style解決 |
| validatePresentationOutputResolvedStyleV002(value) | presentation_output_page_line_planner_v002.mjs / 8c943d68e1d08aadd48ab80e100006e091d2163c8fcb88a005e9f07f050b7f83 / 242行 | boolean | resolved style検証 |
| buildPresentationOutputPhysicalPageGraphV001({...}) | presentation_output_page_line_planner_v001.mjs / ebafe022060aaf9b98d9f7f27ae60af5e139295e0390ccca4db5caa99f590879 / 448行 | dense edge arrayを直接返す | 物理配置正本 |
| mapPresentationOutputPiecewiseTimelineV002({...}) | presentation_output_piecewise_timeline_v002.mjs / 72305c31005fa8b64d3b881a07a315e619eba36677bf1f8b691b2af4c4623516 / 162行 | 成功status=mapped | cue時間写像正本 |

全14 exportは開始HEADの現物で実在し、path・SHA・signatureを照合した。整数限定読取器をrenderer trustへ試用すると、正当な`0.04,0.02,0.98`を含むため`rejected`となることも現物で確認した。したがって意味packageは専用の整数契約、style/base JSONは既存の有限数値契約へ分ける。実装再開時に一つでも差があれば停止する。

### 2.2 現物で確認した縫い目

source packageは、意味package binding、caption/atom ID、case context、基礎映像・style binding、保存済みresolved styleを保持する。atom本文、retained spans、時刻表JSON、style台帳JSONは意図的に複製しない。この非複製は維持する。

現L実装は、style resolverをpositional引数で呼び、boolean validatorをstatus wrapperとして読み、physical/timelineへ実在しないnamed keyを渡している。reconstructionはretained spansの空配列SHAを固定し、physical graph、frame mappingにも空値が残る。したがって現Lは契約到達実装ではない。

現S実装のcaseInputs itemも承認済みexact schemaと一致しない。局所17/17はこの差を検出できていないため、S/Aの無条件保持はできない。

### 2.3 方式比較

| 方式 | 二重実装 | 値レベル閉包 | 採否 |
|---|---:|---:|---|
| selectionとproofが各自reader・cue組立てを持つ | あり | 将来の同値を保証できない | 不採用 |
| source packageへ本文・時刻表・style実値を追加する | なし | formal schemaと非複製方針を変更する | 不採用 |
| path #5に共用stable reader、source-closure、projection-setを置き、selection/proofが同じ三exportを同順で呼ぶ | なし | actual引数と正式caption displayまで閉じる | 採用 |

## 3. module-only実値schemaと共用入口

### 3.1 共用stable再読入口

path #5へ次のnamed exportを追加する。

~~~text
rereadPresentationOutputCaptionCueCaseInputsV001({
  workspaceRoot,
  sourcePackage,
  rereadDependencies,
})
~~~

top-levelは3 key exactである。module import時のI/Oは0件であり、stable再読は呼出し後だけ行う。

workspaceRootはselection runnerとproof runnerがそれぞれ実行開始後に、次の一式で得た同じ実体pathである。selection runnerはこの値をadmissionへ明示的に渡し、admissionがreaderへ渡す。proof runnerはreaderへ直接渡す。

~~~text
await realpath(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
)
~~~

process.cwd、環境変数、job内pathからworkspace rootを選ばない。

rereadDependenciesは次の10 key exactである。

~~~text
readWorkspaceFileStable
validateMeaningPackageFormalBytes
canonicalSha256MeaningJson
hashMeaningBytes
decodeFiniteJson
serializeFiniteJson
canonicalSha256FiniteJson
hashFiniteBytes
hashStableMedia
classifyFatalInnerCode
~~~

対応は次のexact十件で、全値は§2.1の既存named exportそのものとする。

| key | existing named export |
|---|---|
| readWorkspaceFileStable | readPresentationMeaningWorkspaceFileStableV001 |
| validateMeaningPackageFormalBytes | validatePresentationAMeaningInformationPackageFormalBytesV002 |
| canonicalSha256MeaningJson | canonicalSha256PresentationAJsonV002 |
| hashMeaningBytes | sha256PresentationCaptionB1BytesV001 |
| decodeFiniteJson | decodePresentationOutputFiniteJsonV001 |
| serializeFiniteJson | serializePresentationOutputCropApplicationFormalJsonV001 |
| canonicalSha256FiniteJson | canonicalSha256PresentationOutputFiniteJsonV001 |
| hashFiniteBytes | sha256PresentationOutputCropApplicationBytesV001 |
| hashStableMedia | hashAbsoluteStableStreaming |
| classifyFatalInnerCode | classifyPresentationFatalInnerCodeV002 |

意味package bindingは次の順で検証する。

1. workspaceRootとbindingのworkspace相対pathをreadWorkspaceFileStable({workspaceRoot,relativePath:binding.path,allowHardlink:false})へ渡す。
2. 同じbyteをvalidateMeaningPackageFormalBytes(bytes,{})へ渡し、status=passedとvalueを要求する。この専用入口が整数・formal byte・exact schemaを所有する。
3. hashMeaningBytes(bytes)のstatus=hashedかつsha256とbinding.fileSha256の一致を要求する。
4. canonicalSha256MeaningJson(value)とbinding.canonicalSha256を一致させる。
5. value.schemaVersionとbinding.schemaVersionを一致させる。

style 5成果物とbase JSON 3成果物は次の順で検証する。

1. 同じstable readerでbyteを読む。
2. decodeFiniteJson(bytes)がstatus=decodedであることを要求する。
3. serializeFiniteJson(value)と読取byteの完全一致を要求する。
4. hashFiniteBytes(bytes)とbinding.fileSha256を一致させる。
5. canonicalSha256FiniteJson(value)とbinding.canonicalSha256を一致させる。
6. 次のrole別version fieldとbinding.schemaVersionを一致させる。

| artifact role | version field |
|---|---|
| base timeline / generationManifest / validationReceipt | value.schemaVersion |
| trustedRegistryBindings / presetRegistry / rendererTrust | value.schemaVersion |
| presetValidationIndex / materialValidationIndex | value.registryVersion |

表外のfield名、schemaVersionの代わりにregistryVersionを使うべき2 roleへschemaVersionを要求すること、逆の混用を禁止する。

意味packageへ有限数値入口だけを適用して整数契約を広げること、style/baseへ整数限定入口を適用して正当な有限小数を拒否することを、ともに禁止する。

同一process内では、同じpathを宣言する全bindingがobject単位で一致することを先に要求し、unique pathごとにJSONを一回、媒体を一回だけ再読する。別SHA・別schemaを同じpathへ宣言した場合は読まずに拒否する。cacheは一回の入口呼出し内だけで、global cacheを持たない。

基礎映像はpath.resolve(workspaceRoot,binding.path)がworkspace root配下であることを確認し、hashStableMedia(absolute)へ渡す。動画全byteをBufferへ載せない。

selection runnerの固定literal import順は、累積追補v002の順へmeaning information package v002 → timeline composition decision v001 → A source sequence v002 → caption semantic source package v001 → crop application v001 → fatal observation v002をstyle resolverより前に追加する。proof runnerも同6 moduleをselection moduleより前に同順で追加する。job、環境、任意pathからimport先を選ばない。

### 3.2 validated meaning caseとfull case

validatedMeaningCase itemは次の6 key exactである。

~~~text
caseId
inputCaptionId
meaningPackageBinding
meaningPackage
semanticCaption
records
~~~

recordsはcaptionのatom occurrence順dense arrayで、item exact keysは次の5 keyである。

~~~text
atomRef
text
startMs
endMs
retainedSpans
~~~

atomRefはatomOccurrenceId,sourceMediaId,sourceAtomIdの3 key exactである。startMs,endMsはsourceAtomInterval.sourceStartMs,sourceEndMsを無変更転記し、retainedSpansは元配列の順序と値を変えない。この写像は共用readerだけが所有する。

path #5のprivate pure helperを次の3 key exact入口で一つだけ持つ。

~~~text
derivePresentationOutputCaptionCueMeaningValuesV001({
  sourcePackage,
  sourceCaseContext,
  meaningPackage,
})
~~~

入口は3 key exact、戻り値は`semanticCaption,records`の2 key exactである。sourceCaseContext.inputCaptionIdと一致するreconstruction captionをsourcePackage.reconstructionMap.captionsからexact一件選ぶ。対象packageは、そのreconstruction captionのmeaningPackageOrdinalが1-origin safe integerであることを確認し、`sourcePackage.reconstructionMap.meaningPackageBindings[meaningPackageOrdinal - 1]`をexact一件選び、そのbindingがcase context.meaningPackageBindingとobject単位で一致する場合に限る。対象meaningPackageの`captions`から`captionId===reconstructionCaption.semanticCaptionId`のitemをexact一件選び、そのitemの`ordinal`が同package captions配列の1-origin indexと一致し、`atomOccurrenceIds`全列がreconstruction captionの同名列とobject単位で一致することを要求する。0件、2件以上、ordinal不一致、binding入替、caption IDまたはatom列の片側一致を全て拒否する。

共用readerはこの実戻り値をcaseInputへ入れる。共用projection-setは同じhelperを同じsource caseとmeaningPackageに再適用し、caseInput.semanticCaptionとcaseInput.recordsの全5 fieldを実戻り値へexact一致させる。reader用とplanner用の別record組立て、別時刻転記、別validatorを0件とする。

full caseInput itemは次の9 key exactである。

~~~text
caseId
inputCaptionId
meaningPackageBinding
meaningPackage
semanticCaption
records
baseMediaBindings
baseMediaResolverInput
styleArtifacts
~~~

baseMediaBindingsはsource caseのbaseMediaInputを無変更転記した、次の4 binding object exactである。

~~~text
baseMedia
timeline
generationManifest
validationReceipt
~~~

baseMediaResolverInputはstyle resolverが現物で要求する次の4 key exactであり、共用readerが一度だけ組み立てる。基礎映像byteはここへ保持しない。

~~~text
baseMedia
timeline
generationManifest
validationReceipt
~~~

`baseMedia`は`baseMediaBindings.baseMedia`と同じbinding object、残る3 fieldは対応bindingからstable再読したformal JSON valueである。4 bindingだけをresolverへ渡す経路、3 JSON実値を別の場所で再組立てする経路を禁止する。

styleArtifactsはstable再読したformal JSON valueの次の5 key exactである。

~~~text
trustedRegistryBindings
presetRegistry
presetValidationIndex
materialValidationIndex
rendererTrust
~~~

full caseInputは9 key exactである。style resolutionはcaseInputへ保存しない。共用projection-setが検証済み実値から同じresolverを呼び、その同じ戻りをphysical projectionとcaption displayへ使う。cropContextは横型selectionへ渡さず保存しない。

### 3.3 caseInputResultの閉union

共用readerはPromise<caseInputResult>を返す。

| status | exact keys | closed vocabulary |
|---|---|---|
| passed | status,validatedMeaningCases,caseInputs | 両配列はsource caseと同件数・同順序。caseInputs各itemの先頭6 fieldは同index validatedMeaningCaseとobject単位で一致 |
| rejected | status,failedInputClass,primaryCode,violations,failureDetail,validatedMeaningCases | 下表のexact三対だけ。violationsはexact一件 |
| fatal | status,failedInputClass,failureDetail,validatedMeaningCases | 下表のexact三値だけ |

rejectedの固定対は次である。

| failedInputClass | primaryCode |
|---|---|
| meaning-binding | CUE_SELECTION_INPUT_BINDING_MISMATCH |
| meaning-closure | CUE_ATOM_COVERAGE_INVALID |
| style-or-base-binding | CUE_SELECTION_INPUT_BINDING_MISMATCH |

fatalのfailedInputClassはmeaning-read、style-or-base-readの二値である。rejectedとfatalのfailureDetailはmodule-onlyのexact 6 key `caseId,inputCaptionId,violationPath,innerCode,targetFile,toolExitCode`である。rejectedでは`violationPath`が下表のJSON Pointer、`innerCode=null`、fatalでは`violationPath=null`、`innerCode`が既存selectionの許可9値`ERR_FS_FILE_TOO_LARGE|FILE_CHANGED_DURING_READ|NUMERIC_TOKEN_INVALID|FORMAL_JSON_VALUE_INVALID|BINDING_REFERENCE_MISMATCH|REQUIRED_EXPORT_MISSING|OS_PERMISSION_DENIED|PUBLICATION_FAILED|UNCLASSIFIED`の一つである。toolExitCodeは本入口が子processを持たないため常にnullである。

readerは二段で走査する。第1 passはsource case順で全caseのmeaning binding→meaning read→caption/atom closureを完了し、全件成立した場合だけ第2 passへ進む。第2 passはsource case順、同case内はstyleの上表5 role順→base mediaの`baseMedia,timeline,generationManifest,validationReceipt`順で走査する。各pass内の最初の不成立だけを返し、第1 pass不成立後に第2 passを起動しない。これによりstyle/base不成立時のvalidatedMeaningCasesは全case、meaning不成立時は失敗caseより前のdense prefixとなる。rejectedの`violations` itemは親正本どおりexact keys `code,path,relatedIds`で、`code=primaryCode`、`path=failureDetail.violationPath`、`relatedIds`は影響するcaseIdとinputCaptionIdを重複除去してUTF-8 byte狭義昇順にした配列である。pathと所有は次で固定する。

| 不成立 | violationPath |
|---|---|
| meaning binding | `/reconstructionMap/caseContexts/<0-origin case index>/meaningPackageBinding` |
| meaning caption/atom closure | `/reconstructionMap/captions/<0-origin caption index>` |
| style artifact binding/value | `/reconstructionMap/caseContexts/<0-origin case index>/styleBindings/<role>` |
| base media binding/value | `/reconstructionMap/caseContexts/<0-origin case index>/baseMediaInput/<role>` |

failureDetail.targetFileは全statusで`null`またはkey順`path,fileSha256`のexact 2 key byte bindingだけである。検証済み4-key以上のbinding objectをそのまま転記せず、実読取証拠とexact一件一致したbindingからpathとfileSha256だけを値変更なしで投影する。role、schemaVersion、canonicalSha256その他のkeyを混入させない。binding検証前、実読取証拠なし、0件、複数、不一致はnullである。

同じartifact pathを複数caseが参照している場合も、path/fileSha256が全参照で同一かつ実読取証拠と一致するならtargetFile exact 2 keyは一意なので保持するが、caseId/inputCaptionIdはexact一caseへ帰属できる場合だけ設定し、それ以外は両方nullとする。共有artifactのrejected violationPathは`/reconstructionMap/caseContexts`、relatedIdsは影響する全caseのcaseId/inputCaptionIdを上記順で持つ。caseを推測で一件へ帰属させない。

readerがcatchした値からclassifierへ渡すevidenceは次で尽きる。(1) own `code`がstringの値は生objectを渡さずexact `{kind:'node-error',code}`へ縮約する。(2) exact一keyの`kind`が`file-changed-during-read|formal-json-value-invalid|binding-reference-mismatch|required-export-missing|publication-failed|unclassified`の一つなら同じ一key objectだけを渡す。(3) それ以外はexact `{kind:'unclassified'}`を渡す。`rereadDependencies.classifyFatalInnerCode`をexact一回呼び、戻り値が上記9値かつ§7の当該stage許可値でなければ`UNCLASSIFIED`へ固定する。strict decoderが返すchecked invalidやbinding不一致をthrowへ変えずrejectedのまま扱う。caught objectのmessage、stack、stderr、字幕本文、secretは読まず、保存しない。

意味package段で失敗したvalidatedMeaningCasesは失敗caseより前のdense prefix、style・基礎映像段で失敗した場合は全caseのvalidatedMeaningCaseを持つ。

selection admissionはprovider側の先行checkを実行した後、対応するcheckへ到達した時点でrejectedを既存checked rejectionへ写す。fatalを受けた場合はfailureDetailからselection用fatal observationを作るためのPromise rejectionへ写し、親正本の「admission fatalはPromise rejection」の意味を変えない。

proof runnerはselection用schemaを転記しない。caseInputResultの非passedを次へexactに写す。

| caseInputResult | proof report | stage / primaryCode | checks | evidence |
|---|---|---|---|---|
| rejected meaning-binding / meaning-closure / style-or-base-binding | rejection | input-read / CUE_PROOF_JOB_INVALID | input=failed、後続5件blocked | proof rejection schemaにviolationsは保存せず、targetFileは対応binding実証拠、最初のoutput request前なのでevidenceBindings=[]、rendererWorkEvidence=[],retentionPaths=[] |
| fatal meaning-read / style-or-base-read | fatal | input-read / CUE_PROOF_EXECUTION_FAILED | rejection checksは作らない | proofJobBindingは検証済みjob、failureDetailのcaseId/targetFile/innerCodeを同値使用、checkpointはinput-read/enteredだけ、toolExitCode=null、rendererWorkEvidence=[],retentionPaths=[] |

proofのcheckpoint itemはselectionのinputCaptionId fieldを流用せず、caseInputResult.failureDetail.caseIdをproof schemaのcaseIdへ写す。selection側は同detailのinputCaptionIdを使う。どちらもstageとcheckpointを各自の既存schemaで製造し、別schema間のobject転記を禁止する。

### 3.4 共用source closure、projection、display組立て入口

path #5へ次のnamed pure exportを追加する。

~~~text
buildPresentationOutputCaptionCueSourceClosureV001({
  sourcePackage,
  selection,
  validatedMeaningCases,
})
~~~

top-levelは3 key exact、I/Oは0件である。validatedMeaningCasesはreader実戻りの同名dense arrayそのもので、source case全件と同件数・同順序でなければ拒否する。この入口は§3.2の同じprivate meaning helperと§4.1の唯一のboundary ordinal式を使い、全captionをsource順でmeaning-case-binding→atom/本文/retained span/boundary closureの順に検査する。caption一件を完了して後段物理処理へ進む機能を持たない。

passedはtop-level exact keys `status,cases`、`status=passed`である。cases itemはexact keys `caseId,inputCaptionId,cueRanges`、source caption順であり、cueRangesは§4.1のexact schemaである。rejectedはtop-level exact keys `status,failedProjectionClass,failureDetail`、`status=rejected`、failedProjectionClassは`meaning-case-binding|source-closure`、failureDetailはprojection-setと同じexact keys `caseId,inputCaptionId,violationPath,relatedIds`である。meaning-case-binding pathは§3.3のmeaning source pointer、source-closure pathは`/reconstructionMap/captions/<0-origin caption index>`とする。最初の不成立だけを返す。

selection admissionはreaderがmeaning全件を返した直後、logicalWidthより前にこのexportをexact一回呼ぶ。rejectedならatomClosure=failed、後続4件blockedで停止する。passedならatomClosure=passedを確定し、既存logicalWidthの数値規則を同じsourceClosureResultのcueRanges/lineRangesへ適用する。境界IDを再解決して別rangeを作らない。logicalWidth成立後もdeterministicReconstructionは未確定であり、同じsourceClosureResultをprojection-setへ渡し、reconstruction binding phaseと全captionのreconstruction projection builderが成立した時点で初めてpassedへ固定する。plannerもpath #5からこの同じexportを固定static importし、共用readerのpassed validatedMeaningCasesへexact一回呼ぶ。別boundary解決、別cueRanges組立て、source closureの再計算を0件とする。

path #5へ次のnamed exportを追加する。

~~~text
buildPresentationOutputCaptionCueProjectionSetV001({
  sourcePackage,
  selection,
  caseInputResult,
  sourceClosureResult,
  projectionDependencies,
})
~~~

projectionDependenciesは次の8 key exactである。

~~~text
resolveStyle
validateResolvedStyle
buildPhysicalPageGraph
mapPiecewiseTimeline
canonicalSha256MeaningJson
canonicalSha256FiniteJson
serializeFiniteJson
hashBytes
~~~

selectionとproofは、それぞれ検証済みdependency集合から同じ8つの既存named function objectをwrapperなしで渡す。selection admissionは9-key verifiedDependenciesからfatal classifierを除くprojection用8件を選び、`hashBytes=verifiedDependencies.hashRawResponseBytes`とした8-key objectを作る。proof runnerは固定literal import後のprojection用8-key集合をそのまま渡し、fatal classifierはprojection-set外の例外写像にだけ使う。hashBytesの実体は`sha256PresentationCaptionB1BytesV001`である。余分keyをprojection-setへ渡さない。

passedはtop-level exact keys `status,value`、`status=passed`である。valueは次の7 key exactである。

~~~text
reconstructionProjection
physicalProjection
timelineProjection
selectionProjection
captionProjection
captionDisplays
renderSupports
~~~

selectionProjectionとcaptionProjectionは親正本§5.6のformal exact schemaそのものである。selectionProjectionの3 projection SHAとphysical projection内のresolvedStyle/layoutContext SHAは、projectionDependencies.canonicalSha256FiniteJsonとして渡された`canonicalSha256PresentationOutputFiniteJsonV001`だけで計算する。cue/lineのtextSha256はprojectionDependencies.hashBytesとして渡された`sha256PresentationCaptionB1BytesV001`の`status=hashed`戻り値から取る。path #5のlocal canonicalizer、local createHash、JSON.stringify直接hash、別SHA関数を0件とする。

この入口はI/Oを行わず、formal 13 checksの所有順を全captionへ横断適用する次のphaseだけを実行する。caption一件を最後まで処理してから次captionへ進む方式を禁止する。

1. **reconstruction binding phase**: sourceClosureResultは§3.4前段exportのpassed exact objectだけを受ける。caseInputResultがpassedならcaseInputs、style-or-base-binding rejectedまたはstyle-or-base-read fatalならvalidatedMeaningCasesをworkingCasesとする。この3形以外を受けない。sourcePackageのcase context、selection.response.captions、workingCases、sourceClosureResult.casesをsource caption順で全件一対一に照合する。不足、余分、入替、重複を拒否する。全caseについてcaseId,inputCaptionId,meaningPackageBinding、meaningPackage実値のcanonical SHA、semanticCaption/records全5 fieldを§3.2の同じprivate helperの実戻りへ再照合し、sourceClosureResultのcueRangesを対応caseへ一致させる。一件でも不成立なら`meaning-case-binding`で停止する。
2. **reconstruction projection phase**: phase 1が全caption成立した後だけ、sourceClosureResultの同じcueRangesを使ってreconstruction projection builderをcaptionごとにexact一回呼ぶ。rejectedは`reconstruction-invalid`、throw/shape不正は同名stage errorとし、全caption成立前にstyle/baseへ進まない。
3. **style/base binding phase**: reconstruction projection phaseが全caption成立した後だけ進む。caseInputResultがstyle-or-base-binding rejectedなら、failureDetailのcaseId/inputCaptionId/violationPathと、caseInputResult.violations exact一件のrelatedIdsを値変更せずowner-neutral `style-base-case-binding`へ写して停止する。reader failureDetailに存在しないrelatedIdsを読まない。style-or-base-read fatalなら、後述のinput-fatalとして同じfailureDetailを返して停止する。passedの場合だけ、caseInput.baseMediaBindingsとsource case baseMediaInput、baseMediaResolverInputの4値、styleArtifacts 5実値を全caseで再照合する。baseMediaResolverInput.baseMediaはbaseMediaBindings.baseMediaとのobject同値を要求する。projection非影響fieldを含む不一致は`style-base-case-binding`で停止する。
4. **physical phase**: style/base binding phaseが全case成立した後だけ、同じ実値から§4.2のresolverをcaseごとに一回呼び、status、保存済みresolvedStyleとのformal byte一致、validatorを確認する。その後にphysical graphをcaption一件につき一回だけ呼び、各cueのexact edgeを一回選び、physical projection builderを同captionへexact一回呼ぶ。全captionの物理成立前にtimeline mapperを呼ばない。
5. **timeline phase**: physical phaseが全caption成立した後だけ、§4.3のpiecewise mapperをsource caption順・cue順で一件につき一回呼ぶ。各captionの全mapper戻り成立後にtimeline projection builderをexact一回呼び、隣接cueの正重なりを後続cueへ到達した時点で検査する。
6. **assembly phase**: 全5 phase成立後、builderが返したcaption単位の3 projection item、sourceClosureResultの同じcueRanges、resolver戻り、selectedPhysicalEdges、mapper戻りからcaptionDisplay、renderSupport、captionProjection itemを作る。caption単位projection itemをsource caption順で全件連結し、親正本§5.6のglobal `captions`配列を持つ3 projectionを一回だけ作る。同じ3 projection実objectからcanonicalSha256FiniteJsonで3 SHAを一回ずつ作り、実caption/cue/line/boundary/frame配列からselectionProjectionとcaptionProjectionを作る。per-caption SHAを新設しない。

reconstruction binding phaseの最初の不一致は、(a)4配列の件数・dense性・順序・重複をこの順で全体照合し、不成立なら`/reconstructionMap/caseContexts`、(b)source caption順の各caseで`caseId,inputCaptionId,meaningPackageBinding,meaningPackage canonical SHA,semanticCaption,records,sourceClosureResult.cueRanges`をこの順で照合する。caseId/inputCaptionId/meaningPackageBinding/canonical SHAの不一致pathは`/reconstructionMap/caseContexts/<0-origin case index>/<caseId|inputCaptionId|meaningPackageBinding>`とし、canonical SHAはmeaningPackageBinding pathが所有する。semanticCaption/records/sourceClosureResult.cueRangesは`/reconstructionMap/captions/<0-origin caption index>`が所有する。同一項目内のobject比較はformal key順、配列は0-origin順の最初の差だけを返す。

style/base binding phaseはsource case順、各case内でstyleを`trustedRegistryBindings,presetRegistry,presetValidationIndex,materialValidationIndex,rendererTrust`、baseを`baseMedia,timeline,generationManifest,validationReceipt`の順に照合する。style不一致は`/reconstructionMap/caseContexts/<case index>/styleBindings/<role>`、baseMediaBindings、baseMediaResolverInput、対応再読実値のいずれの不一致も`/reconstructionMap/caseContexts/<case index>/baseMediaInput/<role>`とする。同一role内はbinding→再読実値→resolver inputの順、objectはformal key順、配列は0-origin順の最初の差だけを返す。別順、全違反列挙、後続不一致への上書きを禁止する。

各phaseはsource caption順、同caption内cue順の最初の一件だけを返す。先行phaseで不成立があれば後続phaseを0回とし、caption 1の物理不成立がcaption 2のmeaning/source不成立を隠すこと、caption 1のtimeline不成立がcaption 2の物理不成立を隠すことを禁止する。

captionDisplays、renderSupports、captionProjectionはsource caption順で、renderSupport itemは`caseId,inputCaptionId,resolvedStyle,layoutContext`の4 key exactである。selectionProjectionとcaptionProjectionは次の式だけで作る。

- `selectionProjection.captionCount = sourcePackage.promptInput.captions.length`。
- `selectionProjection.cueCount = Σ selection.response.captions[].cues.length`。
- `selectionProjection.lineCount = Σ cues[].lineEndBoundaryIds.length`。
- `selectionProjection.selectedBoundaryCount = Σ cues[] (1 + cue.lineEndBoundaryIds.length)`。cue終端と最終line終端が同じboundary IDでも出現回数として2件を数え、unique化しない。
- captionProjection itemの`cueCount=selectionCaption.cues.length`、`lineCount=Σ cue.lineEndBoundaryIds.length`、`selectedCueEndBoundaryIds=selectionCaption.cues.map(cue => cue.cueEndBoundaryId)`、`selectedLineEndBoundaryIds=selectionCaption.cues.flatMap(cue => cue.lineEndBoundaryIds)`、`atomOccurrenceCount=caseInput.records.length`である。
- `firstStartFrame`は先頭cue mapper戻りのstartFrame、`lastEndFrameExclusive`は末尾cue mapper戻りのendFrameExclusiveである。captionは一件以上、cueは一件以上なのでnullを許さない。

別count、IDのunique化、別timeline計算を0件とする。

戻り値はPromise<passed/rejected/input-fatal>である。rejectedはtop-level exact keys `status,failedProjectionClass,failureDetail`、`status=rejected`である。failedProjectionClassは`meaning-case-binding,reconstruction-invalid,style-base-case-binding,style-resolution,selected-edge-not-found,physical-invalid,timeline-invalid,overlap-invalid`の閉語彙である。failureDetailはexact keys `caseId,inputCaptionId,violationPath,relatedIds`、relatedIdsは両IDを重複除去してUTF-8 byte狭義昇順にした配列である。全case共通値の不一致でexact一caseへ帰属できなければ両IDはnull、relatedIdsは影響する全case/input ID、violationPathは`/reconstructionMap/caseContexts`とする。

input-fatalは`status,failedInputClass,failureDetail`の3 key exact、status=`input-fatal`、failedInputClass=`style-or-base-read`だけである。failureDetailはreader fatalのexact 6 keyを同じobjectとして保持し、innerCodeを再classifierへ渡さず、targetFileを再投影しない。この値はselection admissionだけが§7の既存fatal reportCoreへ写す。plannerはpassed caseInputResult以外をprojection-setへ渡さない。

violationPathはmeaning-case-bindingとstyle-base-case-bindingが§3.3の該当source pointer、reconstruction-invalidが`/reconstructionMap/captions/<caption index>`、style-resolutionが`/reconstructionMap/caseContexts/<case index>/resolvedStyle`、selected-edge-not-found/physical-invalid/timeline-invalidが`/response/captions/<caption index>/cues/<cue index>`である。overlap-invalidは二つ目のcueへ到達して初めて観測できるため、必ず後続cueの同pathを使う。caption単位projection builderのrejectedは§3.5の固定caption pathを使う。selection admissionはこの3-key rejectedだけからformal selection violation exact一件`{code:<§7 selection写像code>,path:failureDetail.violationPath,relatedIds:failureDetail.relatedIds}`を作る。plannerは既存builder rejected unionへ`{status:'rejected',primaryCode:<§7 planner写像code>,violations:[{code:<同code>,path:failureDetail.violationPath,relatedPaths:[]}]}`とexact変換する。proof rejection reportはviolations fieldを持たないため、plannerのprimaryCodeをstage=page-line-plannerへ写し、検証済み入力fileを一意に示せる場合だけtargetFile exact 2 keyを設定する。別path選択、複数違反の追加、consumerごとの順序変更を禁止する。I/Oは0件である。plannerは先にcaseInputResult.caseInputsと同じindexのrenderSupportをcaseId,inputCaptionIdでexact一件確定し、そのinputCaptionIdを持つcaptionDisplayをexact一件選ぶ。captionDisplayに存在しないcaseIdを参照せず、cue・lineを組み立て直さない。

source-closure内のprivate helper、resolver、physical graph、piecewise mapper、3 projection builderの実呼出しが投げた場合、または七対の各dependency戻りshapeが不成立の場合だけ、当該共用exportはその呼出し境界で値を捕捉し、次のmodule-only exact 6 key objectをthrowまたはPromise rejection値として外側へ渡す。戻りshape不正ではraw戻り値を破棄し、causeをexact一key `{kind:'formal-json-value-invalid'}`へ固定する。実呼出しがthrow/rejectした場合だけcaught raw値をcauseへ一時保持する。

~~~text
{
  tag: 'presentation-output-caption-cue-shared-stage-error-v001',
  failedProjectionClass: 'source-closure' | 'reconstruction-invalid' | 'style-resolution' | 'physical-layout' | 'timeline-mapping',
  dependencyKey: <下表の閉語彙>,
  caseId: <検証済み現在case>,
  inputCaptionId: <検証済み現在caption>,
  cause: <caught raw value>,
}
~~~

failedProjectionClassとdependencyKeyは次のexact七対だけである。

| failedProjectionClass | dependencyKey | targetFileの検証済みimplementation role | selection fatal stage → CLI stage |
|---|---|---|---|
| source-closure | `buildPresentationOutputCaptionCueSourceClosureV001` | `caption-cue-selection` | `case-context-reread → input-reread` |
| reconstruction-invalid | `buildPresentationOutputCaptionCueReconstructionProjectionV001` | `caption-cue-selection` | `case-context-reread → input-reread` |
| style-resolution | `resolveStyle` | `dep-style-resolver-v001` | `style-resolution → style-resolution` |
| physical-layout | `buildPhysicalPageGraph` | `dep-page-line-planner-v001` | `physical-layout → style-resolution` |
| physical-layout | `buildPresentationOutputCaptionCuePhysicalProjectionV001` | `caption-cue-selection` | `physical-layout → style-resolution` |
| timeline-mapping | `mapPiecewiseTimeline` | `dep-piecewise-timeline-v002` | `timeline-mapping → selection-validation` |
| timeline-mapping | `buildPresentationOutputCaptionCueTimelineProjectionV001` | `caption-cue-selection` | `timeline-mapping → selection-validation` |

source-closureは現在処理中のsource case、projection-setは現在処理中の同caseから検証済みcaseId/inputCaptionIdをobjectへ無変更転記する。selection admissionとproof runnerはtag、上表の対、caseId/inputCaptionIdがsource case exact一件と一致することを検査し、causeから§3.3と同じ安全なevidenceだけを作る。selectionはverifiedDependencies.classifyFatalInnerCode、proof runnerは固定literal importした`classifyPresentationFatalInnerCodeV002`をexact一回呼び、許可inner codeを得た後にraw causeを破棄する。cause、生message、stack、stderr、本文をformal成果物・log・TAP diagnosticへ保存しない。

上表roleが検証済みimplementationBindings内でexact一件かつ実読取証拠と一致する場合だけ、そのbindingから`path,fileSha256`をこの順で投影したexact 2-key targetFileを作る。4-key以上のimplementation bindingを転記せず、0件・複数・不一致ならnullとする。上表外のtag/key対、case pair不一致、wrapper shape不正はselectionでは`stage=case-context-reread,innerCode=UNCLASSIFIED,targetFile=null,caseId/inputCaptionId=null`、proofでは`stage=page-line-planner,innerCode=UNCLASSIFIED,targetFile=null,caseId=null`へ固定する。source-closure呼出し境界の不正wrapperならselectionは先頭8件passed、atomClosure=failed、後続4件blocked、projection-set呼出し境界なら先頭10件passed、deterministicReconstruction=failed、後続2件blockedとする。selectionの外側CLI stageは親正本の固定写像どおりinput-reread、proofはpage-line-plannerで、いずれも終了2である。推測によるstage、case、fileの補完を禁止する。このobjectはformal schemaではなく、47 code集合を変えない。

同じselection reportのselectionProjectionとcaptionProjectionは全caption分の値なので、一件caseの結果から比較しない。selection admissionとplannerはこの全case projection-set exportだけを呼び、projection、SHA、count、captionProjectionを各自で連結・再計算しない。

### 3.5 既存projection builderの限定surface改訂

完全実装設計§3.1の3入口を次へ限定置換する。

~~~text
buildPresentationOutputCaptionCueReconstructionProjectionV001({
  sourceCaseContext,
  selectionCaption,
  cueRanges,
  canonicalSha256FiniteJson,
  hashBytes,
})

buildPresentationOutputCaptionCuePhysicalProjectionV001({
  sourceCaseContext,
  selectionCaption,
  cueRanges,
  resolvedStyle,
  layoutContext,
  selectedPhysicalEdges,
  canonicalSha256FiniteJson,
  hashBytes,
})

buildPresentationOutputCaptionCueTimelineProjectionV001({
  sourceCaseContext,
  selectionCaption,
  cueRanges,
  timelineMappings,
})
~~~

canonicalSha256FiniteJsonとhashBytesはprojectionDependenciesの同名function objectそのものであり、builderの入口でfunction型を検査する。reconstructionのretainedSpansCanonicalSha256は該当cueRange.retainedSpansの実配列からcanonicalSha256FiniteJsonで作り、空配列固定を禁止する。reconstruction cueとphysical lineのtextSha256はUTF-8 BufferをhashBytesへ渡し、戻り値が`status,sha256`の2 key exactかつstatus=hashedの場合だけsha256を転記する。physical builderはresolvedStyleCanonicalSha256とlayoutContextCanonicalSha256をcanonicalSha256FiniteJsonだけで作る。selectedPhysicalEdgesはprojection-setが§4.2のexact一致で一度だけ選んだcue順dense arrayで、cueRangesと同件数・同index対応である。physical builderはこの配列を検証して投影するだけで、full physical graphを受けずedge探索・再選択を行わない。caption displayも同じselectedPhysicalEdges objectを使う。3 builderはcue範囲を再計算せず、渡された同じcueRangesを検証して投影する。

3 builderの戻りunionは親正本の共通builder unionを維持する。passedはtop-level exact keys `status,value`、`status=passed`、valueはexact一key `projection`である。projectionは各global projectionの`captions`配列へ入る当該caption item一件のexact schemaであり、top-level `captions` wrapperやSHAをbuilderへ持たせない。projection-setは同じobjectを値変更せずsource caption順へ連結する。

rejectedは親正本どおりtop-level exact keys `status,primaryCode,violations`、status=rejected、violations一件以上である。次の対だけを受理してowner-neutral failureへ一意に写し、builder自身のpathをformal pathへ転記しない。

| builder | 許可primaryCode | failedProjectionClass | 固定violationPath |
|---|---|---|---|
| reconstruction | `CUE_RECONSTRUCTION_FAILED` | `reconstruction-invalid` | `/reconstructionMap/captions/<0-origin caption index>` |
| physical | `CUE_PLANNER_PHYSICAL_INVALID` | `physical-invalid` | `/response/captions/<0-origin caption index>` |
| timeline | `CUE_PLANNER_TIMELINE_INVALID` | `timeline-invalid` | `/response/captions/<0-origin caption index>` |

表外primaryCode、余分key、空violations、projection item shape不正はchecked rejectionへ緩和しない。raw戻り値を即時破棄し、causeをexact一key `{kind:'formal-json-value-invalid'}`に固定して、当該builder実呼出し境界のstage errorへ入れる。builderがthrowした場合だけcaught raw値をcauseに保持し、consumerで安全縮約後に破棄する。reconstruction/physical/timeline builderのrejected、戻りshape不正、throwを混同しない。

## 4. cue範囲、actual named object、caption display

### 4.1 boundary IDからrecord範囲への唯一の写像

prompt captionのboundaryCandidates[i]はexact keys `boundaryId,text`を持ち、0-origin record iの直後、すなわちend-exclusive boundary ordinal i+1を表す。boundaryCandidates.length、reconstruction captionのboundaries.length、records.lengthは一致させる。candidate[i].boundaryIdはmap boundary[i].boundaryId、candidate[i].textはrecord[i].text、map boundary[i].ordinalはi+1、map boundary[i].afterAtomOccurrenceIdはrecord[i].atomRef.atomOccurrenceIdへ、それぞれexact一致を要求する。candidateに存在しないordinalまたはafterAtomOccurrenceIdを読まない。

最初のcueのstartBoundaryOrdinalは0、以後は直前cueのendBoundaryOrdinalとする。選択されたcueEndBoundaryIdのcandidate indexをiとしたときendBoundaryOrdinalはi+1である。cue endは狭義増加し、最後はrecords.lengthでなければならない。

行末も同じ式でordinalへ変換する。各行末はcue startより大きくcue end以下、狭義増加、最後はcue endと一致する。cue recordsはrecords.slice(startBoundaryOrdinal,endBoundaryOrdinal)、各line recordsは直前line endから当該line endまでのsliceである。

cueRanges item exact keysは次である。

~~~text
cueId
cueOrdinal
cueEndBoundaryId
lineEndBoundaryIds
startBoundaryOrdinal
endBoundaryOrdinal
lineEndBoundaryOrdinals
atomOccurrenceIds
text
retainedSpans
lineRanges
~~~

lineRanges item exact keysは次である。

~~~text
lineId
lineOrdinal
startBoundaryOrdinal
endBoundaryOrdinal
atomOccurrenceIds
text
~~~

ID規則は次でexactである。

- globalCaptionOrdinalはsourcePackage.promptInput.captionsの全件順における1-origin indexである。inputCaptionIdが`input-caption-<globalCaptionOrdinal 6桁>`と一致することを要求し、meaning package内ordinalをIDへ使わない。
- cueOrdinalは対象captionのselectionCaption.cues配列における1-origin index、lineOrdinalは対象cueのlineEndBoundaryIds配列における1-origin indexである。0-origin indexやmeaning package ordinalから作らない。
- cueIdは`cue-<globalCaptionOrdinal 6桁>-<cueOrdinal 6桁>`。
- lineIdは`line-<globalCaptionOrdinal 6桁>-<cueOrdinal 6桁>-<lineOrdinal 2桁>`。

cue/lineのatomOccurrenceIds,textは上記sliceから作る。retainedSpansはcue recordsの同名配列をrecord順・配列順でflatMapする。全cueをflatMapしたatom IDと本文はsourceのatom ID列と意味package本文へ非重複・非欠損で一致させる。

### 4.2 style resolverとphysical graph

style resolverへ次の4 keyをexactに渡す。

~~~text
{
  styleInput: sourceCaseContext.horizontalStyleInput,
  artifacts: caseInput.styleArtifacts,
  baseMediaInput: caseInput.baseMediaResolverInput,
  baseMediaInspection: null,
}
~~~

runtimeProfileとimplementationBindingsはkey自体を省略する。baseMediaResolverInputは`baseMedia`だけが検証済みbinding、timeline/generationManifest/validationReceiptがstable再読済みJSON実値である混合exact objectである。resolvedはexact keys `status,resolvedStyle,layoutContext,cropContext`、`status=resolved`だけを受ける。`serializeFiniteJson(resolvedStyle)`と`serializeFiniteJson(sourceCaseContext.resolvedStyle)`のBufferがbyte一致し、validateResolvedStyle(resolvedStyle)がtrueの場合だけ進む。layoutContextは同じ戻りから取り、cropContextはshapeだけを検査してselection/plannerへ保存・転記しない。

checked rejectedは`status=rejected`で、exact keys `status,violations`または`status,violations,resolvedStyle,layoutContext,cropContext`の二形だけを受ける。後者のcropContextはnullでなければならない。両形のviolationsはdense非空かつ既存resolver violation item schema成立を要求し、`style-resolution`へ写す。これ以外のstatus、余分key・不足key・型不正を含む戻りshape不正はrawを破棄して`{kind:'formal-json-value-invalid'}`をcauseとするstage errorへ固定する。

physical graphへ次の5 keyをexactに渡す。

~~~text
{
  caption: caseInput.semanticCaption,
  records: caseInput.records,
  styleResolution: {resolvedStyle, layoutContext},
  resolvedStyleValidator: projectionDependencies.validateResolvedStyle,
  resourceObserver: undefined,
}
~~~

戻りはwrapperではなくdense accepted-edge arrayである。配列でない戻り、疎配列、またはedge/line/sourceIntervalのexact shape不正はchecked rejectionへ入れず、rawを破棄して`{kind:'formal-json-value-invalid'}`をcauseとするphysical-layout stage errorへ固定する。shape成立後、各cueについてstartBoundaryOrdinal,endBoundaryOrdinal,lineEndBoundaryOrdinalsがcueRangeとexact一致するedgeを数える。0件は`selected-edge-not-found`、2件以上は`physical-invalid`で拒否する。exact一件のedgeは`startBoundaryOrdinal,endBoundaryOrdinal,lineEndBoundaryOrdinals,lines,sourceInterval`の5 key exactで、lineは`atomRefs,text,logicalWidth`の3 key exact、sourceIntervalは`sourceStartMs,sourceEndMs`の2 key exactとする。line.atomRefsは対応するrecord sliceのatomRef配列、textは同sliceの本文連結、logicalWidthは返却値そのままである。sourceInterval.sourceStartMs/sourceEndMsはcue先頭record.startMs/末尾record.endMsとexact一致させる。shape成立後の内容不一致は`physical-invalid`で拒否する。

安全領域、行交差、line rect、有限座標は既存physical graphの内部inspectionが各候補に対して検査し、合格edgeだけを返す。その座標はedgeに残らないため後段が再読できると主張しない。同じ実関数の返却edge集合に所属すること自体を内部物理検査合格の証拠とし、別座標検査、別edge選択、座標の推測を0件とする。

### 4.3 piecewise timeline

各cueで次の2 keyをexactに渡す。

~~~text
{
  retainedSpans: cueRange.retainedSpans,
  baseMediaTimeline: caseInput.baseMediaResolverInput.timeline,
}
~~~

戻りstatus=mappedだけを成功として受ける。成功戻りはexact keys `status,retainedSpans,sourceSpanEnvelopes,frameMappings,displayFrameRange`、displayFrameRangeはexact keys `startFrame,endFrameExclusive,displayFrameCount`である。checked rejectedはexact keys `status,code,retainedSpans,sourceSpanEnvelopes,frameMappings`、`status=rejected`かつmapper既存code閉語彙の場合だけ受け、codeが`OUTPUT_V002_FRAME_OVERLAP`なら`overlap-invalid`、それ以外は`timeline-invalid`へ固定する。passed/rejectedの余分key・不足key・型不正を含む戻りshape不正または未知codeはchecked rejectionへ入れず、rawを破棄して`{kind:'formal-json-value-invalid'}`をcauseとするtimeline-mapping stage errorへ固定する。shape成立後の非正frameは`timeline-invalid`である。各cueのmapped戻りを得た後にcaption内隣接cueの正frame重なりを観測した場合も`overlap-invalid`である。retainedSpans,sourceSpanEnvelopes,frameMappings,displayFrameRangeを順序と値を変えず使う。timelineMappings itemはexact keys `cueEndBoundaryId,retainedSpans,sourceSpanEnvelopes,frameMappings,startFrame,endFrameExclusive,displayFrameCount`で、cueEndBoundaryIdをcueRangeから、残る配列と3 frame値を同じmapped戻りから無変更転記する。

### 4.4 caption display

captionDisplay top-level exact keysは親正本どおり次である。

~~~text
displayCaptionId
inputCaptionId
semanticCaptionId
ordinal
cues
~~~

displayCaptionIdは`display-caption-<globalCaptionOrdinal 6桁>`とする。cueとlineのexact keysは親正本§5.7を維持する。複数meaning packageでpackage内ordinalが再び1になっても、IDは全packageを平坦化した通し序数なので衝突しない。

inputCaptionIdはsourcePackage.promptInput.captions[globalCaptionOrdinal - 1].captionIdとcaseInput.inputCaptionIdの両方に一致、semanticCaptionIdは§3.2で選び済みのsemanticCaption.captionIdに一致、ordinalはglobalCaptionOrdinalそのものとする。semanticCaption.ordinalをcaptionDisplay.ordinalへ使わない。

cueのID・境界・atom ID・本文・retained spansは同じcueRange、sourceSpanEnvelopes,frameMappings,startFrame,endFrameExclusive,displayFrameCountは同じmapper戻り、lineのID・ordinal・atom ID・本文は同じlineRange、logicalWidthはexact一致したphysical edgeの同じlineから転記する。plannerはこのobjectを作り直さない。

## 5. selection、planner、renderへの受け渡し

### 5.1 selection admission exact 10 key

累積追補v002 §3.3を次へ限定置換する。

~~~text
admitPresentationOutputCaptionCueSelectionV001({
  job,
  selectionJobBinding,
  sourcePackage,
  b6Manifest,
  providerEnvelope,
  rawResponseBytes,
  rawResponseBinding,
  workspaceRoot,
  rereadDependencies,
  verifiedDependencies,
})
~~~

runnerはjob、source、B6、envelope、raw、code/data/contractの前読が全て成立した後、§3.1のworkspaceRoot、10-key rereadDependencies、次の9-key verifiedDependenciesを組み立て、admissionへ一度渡す。admissionはprovider/responseの既存checkを`sourceBinding`から`lineOrder`まで8件だけ固定順で先に実行する。一件でも不成立ならreaderを呼ばず、既存rejected/abstainedを返す。先頭8件が全て成立した場合だけ、admission自身が`rereadPresentationOutputCaptionCueCaseInputsV001({workspaceRoot,sourcePackage,rereadDependencies})`をexact一回呼ぶ。runnerによるeager read、admission外でのprovider応答再parse、別readerを0件とする。

readerがmeaning-binding/meaning-closure rejectedまたはmeaning-read fatalを返した場合は、その場で`atomClosure=failed`、後続4件blockedへ写し、source-closureとprojection-setを呼ばない。readerがpassed、style-or-base-binding rejected、style-or-base-read fatalのいずれかならvalidatedMeaningCasesが全case揃っているため、admissionは`buildPresentationOutputCaptionCueSourceClosureV001({sourcePackage,selection,validatedMeaningCases:caseInputResult.validatedMeaningCases})`をexact一回呼ぶ。source-closure rejectedまたは同呼出し境界のstage errorなら`atomClosure=failed`、後続4件blockedで停止する。passedなら同じsourceClosureResultから`atomClosure=passed`を確定し、同resultのcueRanges/lineRangesを使って既存`logicalWidth`を実行する。

logicalWidth成立後だけ、admissionは`buildPresentationOutputCaptionCueProjectionSetV001({sourcePackage,selection,caseInputResult,sourceClosureResult,projectionDependencies})`をexact一回呼ぶ。`meaning-case-binding`または`reconstruction-invalid` rejected、reconstruction builder stage error、projection-set呼出し境界の不正wrapperでは先頭10件passed、`deterministicReconstruction=failed`、後続2件blockedである。reconstruction binding/projection phase成立後に初めて`deterministicReconstruction=passed`とし、その後だけ保持済みstyle/base不成立をphysicalLayoutへ返すか、passed入力のphysical/timeline phaseへ進む。これによりformal check 1〜13の最初の不成立順と、共用readerの実I/O順を一意に両立する。

readerのcase-context-reread checkpointは実際の入場・完了順を保持する。style/base不成立はreader内で先に観測されても、先行するatomClosure/logicalWidth/source closureの判定が済むまでformal ownerへ確定しない。先行checkが不成立ならそのcheckだけを報告し、style/base不成立を後段fatal/rejectionとして併記しない。provider先頭8件の不成立がreader I/O fatalに隠されず、readerが未起動なのにread checkpointを作ることもない。

selectionのverifiedDependenciesは次の9 key exactへ限定置換し、全値は§2.1の既存named exportそのものである。

~~~text
resolveStyle
validateResolvedStyle
buildPhysicalPageGraph
mapPiecewiseTimeline
hashRawResponseBytes
canonicalSha256MeaningJson
canonicalSha256FiniteJson
serializeFiniteJson
classifyFatalInnerCode
~~~

`classifyFatalInnerCode`は`classifyPresentationFatalInnerCodeV002`そのものである。10-key rereadDependenciesと9-key verifiedDependenciesで名前が重なるcanonical/hash/classifierの各値は同じ固定literal importから得た同一function objectでなければjob不成立とする。caseInputResult、source-closure、projection-setの各unionは§7の固定checkへ写す。passed時は共用projection-setの戻りだけからselection reportのglobal 3 projectionとcaption projectionを作る。admission内でstyle、physical、timeline、cue本文、global captions配列を別に再構成しない。

caseInputResult、source-closure、projection-setのrejectedは、累積追補v002 §3.3のadmission rejected exact unionへ写す。top-levelは`status,primaryCode,violations,value`、valueはexact一key`reportCore`である。reportCoreは同節のexact key順を維持し、§7の13 checks、formal violation exact一件、`fatalObservation=null,selectionProjection=null,captionProjection=[]`を入れる。reportId、job・上流・raw binding、implementationBindingsは検証済み入力から無変更転記し、ここで再製造しない。

meaning-readのcaseInputResult fatal、projection-setのinput-fatal、またはsource-closure/projection-setの検証済みexact stage-error wrapperは、累積追補v002 §3.3のexact admission fatalだけへ写す。Promise rejection値はexact keys `schemaVersion,status,primaryCode,reportCore`、schemaVersion=`presentation-output-caption-cue-selection-admission-fatal-v001`、status=`fatal`、primaryCode=`CUE_SELECTION_EXECUTION_FAILED`である。reportCoreは同節のexact key順、status=fatal、§7の13 checks、`violations=[]`、`selectionProjection=null`、`captionProjection=[]`とし、fatalObservationは親正本のexact 7 keyを使う。readerが既に分類したmeaning-read failureDetail、またはprojection-set input-fatalが保持したstyle-or-base-read failureDetailのinnerCode/targetFile/toolExitCodeは再classifierへ渡さず同値転記する。検証済みexact stage-error wrapperだけを§3.4のclassifier exact一回で分類し、不正wrapperはclassifierへ渡さずUNCLASSIFIEDへ固定する。checkpointはそれまで実際に完了したstageのentered/completedを保持し、失敗stageのentered一件だけを末尾へ置く。caseId/inputCaptionId/targetFileは§3.3・§3.4の検証済み値だけを使う。raw cause、生message、stack、stderr、本文、secretをreportCoreへ入れない。runnerはこのobjectを累積追補v002 §3.4のfinalizerへ渡し、別fatal schemaや別reportを作らない。

### 5.2 planner v003 exact 8 key

累積追補v002 §4.2を次へ限定置換する。

~~~text
buildPresentationOutputPageLinePlanV003({
  sourcePackage,
  selection,
  selectionReport,
  selectionReportBinding,
  caseInputResult,
  caseId,
  proofJobId,
  projectionDependencies,
})
~~~

旧meaningPackage keyは削除し、全意味packageを含む検証済みcaseInputResultへ置換する。旧4-key verifiedDependenciesは共用projection-setが実際に使う8-key projectionDependenciesへ置換する。

path #7 plannerはpath #5から`buildPresentationOutputCaptionCueSourceClosureV001`と`buildPresentationOutputCaptionCueProjectionSetV001`を固定static named importする。import時I/Oは0件であり、proof jobの検証済みstatic import graphにpath #5がexact一件含まれることを前後照合する。両functionをplanner引数、job、環境、globalから選ばず、wrapper、動的import、別source closure・projection実装を作らない。plannerはまず前者へ`{sourcePackage,selection,validatedMeaningCases:caseInputResult.validatedMeaningCases}`のexact 3 keyを渡してexact一回呼ぶ。`meaning-case-binding` rejectedはCUE_PLANNER_BINDING_MISMATCH、`source-closure` rejectedはCUE_RECONSTRUCTION_FAILEDへ写し、stage-errorまたは不正unionはpage-line-planner/CUE_PROOF_EXECUTION_FAILEDのfatalへ写す。passedの場合だけ、その同じsourceClosureResultを後者へ`{sourcePackage,selection,caseInputResult,sourceClosureResult,projectionDependencies}`のexact 5 keyで渡してexact一回呼ぶ。selectionとは別processなのでsource closureの実行自体は各processで一回ずつ必要だが、各process内で別boundary解決・別cueRanges組立ては0件である。

proof runnerはproof job、source、selection、selection report、implementation bindings、approved contract bindingsをstrict検証し、全対象をstable再読して前後一致させた直後、最初のoutput requestを製造する前に共用readerを一度呼ぶ。passed resultのcaseInputs全件がsource caption全件と同件数・同順序であることを確認し、proof jobのcaseId/inputCaptionId対がsourcePackage.reconstructionMap.caseContextsのexact一件と一致することをplanner前に検査する。その同じcaseInputResult objectとcaseIdだけを無変更でplannerへ渡す。plannerがproof job objectをhidden参照しない。readerのrejected/fatalではoutput requestがまだ0件なのでevidenceBindings=[]である。累積追補v002 §4.5の旧12段はこの一段挿入だけを限定上書きし、以後のoutput request製造、stable再読、planner、render、公開前再読の相対順を変えない。

plannerは共用projection-setを全caseに対して一度呼び、戻りselectionProjectionの7 field全体とcaptionProjection全itemをselection reportの同名値へobject単位でexact一致させる。3 canonical SHAだけの比較で済ませない。selectionProjectionはformal key順で最初に異なるfieldを`/selectionProjection/<field>`、captionProjectionは件数差なら`/captionProjection/<min(actual length,expected length)>`、同件数のitem差なら最初に異なる0-origin indexを`/captionProjection/<index>`とする固定pathのCUE_PLANNER_BINDING_MISMATCH、`relatedPaths=[]`で拒否する。その後だけ、sourcePackage.reconstructionMap.caseContextsから引数caseIdに一致するcontextをexact一件選び、そのcontext.inputCaptionIdを対象IDとする。caseInputsとrenderSupportsの同じindexからcaseId/inputCaptionIdの両方が一致する対象をexact一件確定し、同じinputCaptionIdのcaptionDisplayをexact一件選び、一件配列captionDisplaysへ無変更で入れる。captionDisplayへ存在しないcaseIdを要求しない。pageLinePlan.meaningPackageBindingは対象caseInput.meaningPackageBinding、pageLinePlan.resolvedStyleは対象renderSupport.resolvedStyleをそれぞれ無変更で転記する。passed valueは`pageLinePlan,renderSupport`の2 key exactで、pageLinePlanだけをformal保存し、resolvedStyle/layoutContextを持つrenderSupportは当該呼出しのmodule-only値としてproof runnerへ返す。planner内file I/O、meaning package再読、record再組立て、style再解決、timeline別計算、cue/line再組立て、global projection再連結は0件とする。

### 5.3 render v003

proof runnerは、plannerへ渡した同じcaseInputResult.caseInputsからcaseIdとinputCaptionIdが一致するexact一件をtargetCaseInputとして選び、そのmeaningPackage objectをrender v003へ次の既存exact 9-key入口だけで無変更に渡す。renderDependenciesは完全実装設計v001 §3.1の既存exact 2 key `deriveMeaningProjection,buildCommonCoreElementProjection`である。

~~~text
buildPresentationOutputRenderPlanV003({
  outputRequest,
  outputRequestBinding,
  pageLinePlan,
  sourcePackage,
  selection,
  selectionReport,
  meaningPackage: targetCaseInput.meaningPackage,
  proofJobId,
  verifiedDependencies: renderDependencies,
})
~~~

さらに同じplanner passed valueのrenderSupportについてcaseId,inputCaptionIdの一致を再確認し、pageLinePlan.resolvedStyleがrenderSupport.resolvedStyleとobject単位でexact一致することを検査する。common-coreは次の既存exact 3-key入口だけで呼ぶ。

~~~text
buildPresentationOutputCommonCorePlanV003({
  renderPlan,
  layoutContext: renderSupport.layoutContext,
  verifiedDependencies: renderDependencies,
})
~~~

renderDependenciesはproof jobの検証済みimplementationBindingsを固定literal import graphへ前後照合した後に得た、上記2 named functionそのものをkey順で持つ。proof runnerはこの同じobjectをrender v003とcommon-coreへ渡す。render/common-core用の別meaning package再読、別style resolver、別resolvedStyle/layoutContext組立ては0件である。

## 6. 供給者から転記先までの実値一件表

| 実値field | 供給者 | stable再読・検証時点 | exact引数 | consumer | 転記先・保持先 |
|---|---|---|---|---|---|
| workspaceRoot | selection/proof runner自身のmodule URL | runner開始後に`path.resolve(moduleDir,'../..')`をrealpathしworkspace包含を確認後 | admission.workspaceRootまたはreader.workspaceRoot | selection admission、共用reader、proof runner | formal保存0。process.cwd/job/envから補完しない |
| rereadDependencies 10 function | §2.1の固定literal import | job implementation/contract前後照合とfunction identity確認後 | admission.rereadDependenciesまたはreader.rereadDependencies | selection admission、共用reader、proof runner | module-only exact 10 key。同名関数をwrapper化しない |
| verifiedDependencies 9 / projectionDependencies 8 function | 同じ固定literal import | 9-key identity確認後、classifierを除きhash aliasを固定して8-keyへ投影 | admission.verifiedDependencies、projection-set.projectionDependencies、planner.projectionDependencies | selection admission、共用projection-set、planner | module-only。余分key、別function、local hash 0件 |
| caseInputResult | 共用readerの二pass実戻り | reader完了またはstyle/base非passedを保持した時点 | source-closure.validatedMeaningCases、projection-set.caseInputResult、planner.caseInputResult | selection admission、共用source-closure、共用projection-set、proof runner、planner | 全3形が同じvalidatedMeaningCases fieldを持ち、selectionは同じunion、plannerはpassedだけを無変更使用 |
| caseId / inputCaptionId / proofJobId | source case contextと検証済みproof job | source全件対応、proof job pair、ID式のexact一致後 | planner.caseId、planner.proofJobId、内部target選択 | planner、render、proof runner | 対象case/inputの選択と正式IDへ無変更転記。推測0件 |
| meaningPackageBinding | source reconstruction mapとcase context | source/B6/envelope/raw成立後、binding一意性確認後 | reader.sourcePackage | 共用reader、planner | validatedMeaningCase.meaningPackageBinding。対象case確定後にpageLinePlan.meaningPackageBindingへ無変更転記 |
| meaningPackage | bindingが指すformal package | §3.1のmeaning専用5段検証後 | validateMeaningPackageFormalBytes(bytes,{}) | 共用reader | validatedMeaningCase.meaningPackage。formal成果物へ複製しない |
| semanticCaption | meaningPackage captions | ordinal、semanticCaptionId、inputCaptionIdがsource mapと一致後 | meaningPackage + sourcePackage | 共用reader | validatedMeaningCase.semanticCaption |
| records[].atomRef | meaningPackage atom occurrences | captionのatom ID列と全件一対一後 | semanticCaption + atomOccurrences | 共用reader | caseInput.records[].atomRef |
| records[].text,startMs,endMs,retainedSpans | 同atom occurrence | 本文、時刻、retained spanの型・順序・全量閉包後 | 同上 | 共用reader | caseInput.recordsと共用projection-set |
| baseMediaBindings | source case baseMediaInput | 4 binding exact、同path矛盾0、全実体SHA一致後 | reader.sourcePackage | 共用reader | caseInput.baseMediaBindings。来歴照合を所有 |
| baseMediaResolverInput.baseMedia | source case baseMediaInput.baseMedia | streaming SHAとbinding一致後 | reader.sourcePackage | 共用reader、style resolver | caseInput.baseMediaResolverInput.baseMedia。同じbinding objectを転記 |
| baseMediaResolverInput.timeline | timeline binding実file | finite formal byte、file/canonical/schema一致後 | stable reader + finite codec/hash | 共用reader、style resolver、timeline mapper | caseInput.baseMediaResolverInput.timeline、baseMediaTimeline |
| baseMediaResolverInput.generationManifest,validationReceipt | 各binding実file | 同上 | 同上 | 共用reader、style resolver | caseInput.baseMediaResolverInputの同名field |
| styleArtifacts 5 field | source case styleBindingsが指す5実file | 各unique pathを一回stable再読しfinite formal/file/canonical/schema一致後 | stable reader + finite codec/hash | 共用reader、style resolver | caseInput.styleArtifacts |
| resolvedStyle | 正式style resolver実戻り | status resolved、保存値formal byte一致、boolean validator true後 | §4.2 exact 4 key | 共用projection-set、physical graph、planner | renderSupport.resolvedStyleからpageLinePlan.resolvedStyleへ無変更転記し、physical projection/caption displayと同じ値を使用 |
| layoutContext | 同じresolver実戻り | resolvedStyleと同じ一回の戻りであることを確認後 | 同上 | 共用projection-set、physical graph、planner、proof runner | renderSupport.layoutContextへmodule-only保持し、対象case一致後にcommon-core layoutContextへ無変更転記。formal planへ保存しない |
| sourceClosureResult / cueRanges全field | 共用source-closure export | readerのmeaning全件成立後、`{sourcePackage,selection,validatedMeaningCases}` exact 3 keyから§4.1のboundary ordinal式と全量閉包が成立した時点 | projection-set.sourceClosureResult | selection admission、planner、共用projection-set、3 projection builder | 同process内の同じpassed objectを無変更転記し、caption単位3 projection itemとcaption displayへ使用。formal単独成果物0、再組立て0 |
| physicalPageGraph / selectedPhysicalEdges | 正式physical graph実戻り / projection-setの唯一のedge選択 | §4.2 exact 5 key照合後、cueごとexact一件をcue順dense arrayへ固定 | buildPhysicalPageGraph戻り、physical builder.selectedPhysicalEdges | 共用projection-set、physical builder | physical projectionとcaption displayが同じselectedPhysicalEdgesを使用。再探索0件 |
| timelineMappings | 正式piecewise mapper実戻り | §4.3 exact 2 key、status mapped、正frame・正重なり0後 | mapPiecewiseTimeline | 共用projection-set | timeline projectionとcaption display |
| global reconstructionProjection | 既存projection builder改訂入口のcaption item全件 | 全caseで実retained spansを含むcueRanges閉包後 | source caption順のcaption projection item | 共用projection-set | selection report SHAとplanner再照合 |
| global physicalProjection | 同caption item全件 | 全caseでaccepted edgeとstyle/layout一致後 | §3.5 exact 8 keyをcaseごとに一回 | 共用projection-set | selection report SHAとplanner再照合 |
| global timelineProjection | 同caption item全件 | 全caseでmapper戻りとcueRanges一致後 | §3.5 exact 4 keyをcaseごとに一回 | 共用projection-set | selection report SHAとplanner再照合 |
| selectionProjection | 同じglobal 3 projectionとsource/selection実件数 | §3.4の7 field式と3 canonical SHA成立後 | 共用projection-set成功値.selectionProjection | selection admission、planner | selection report.selectionProjectionへ無変更転記し、plannerが7 field全体をobject単位で再照合 |
| captionProjection | 同じcase records、selection cue/line ID列、mapper戻り | §3.4の9 field式をsource caption順で全件構築後 | 共用projection-set成功値.captionProjection | selection admission、planner | selection report.captionProjectionへ無変更転記し、plannerが全itemをobject単位で再照合 |
| captionDisplays | 各caseの同じcueRanges、accepted edge、mapper戻り | global 3 projection成立後 | 共用projection-set成功値 | planner | caseInputs/renderSupportsで対象caseを確定後、inputCaptionId exact一件をpage/line plan captionDisplays[0]へ転記 |
| renderのmeaningPackage | plannerへ渡した同じcaseInputResultの対象case | planner成功後 | targetCaseInput.meaningPackage | render v003 | 既存meaning projection。再読0 |
| reader/source-closure/projection rejectionのpath・関連値 | source順の最初の不成立と検証済みcase対応 | §3.3または§3.4の固定走査・JSON Pointer式成立後 | caseInputResult、source-closure、projection-set rejected | selection admission、planner、proof runner | selectionはformal `code,path,relatedIds` exact一件、plannerはmodule-only `code,path,relatedPaths=[]` exact一件へ固定変換。proof rejection reportにはviolationを保存せずprimaryCode/stage/targetFileだけを転記 |
| fatal innerCode・targetFile | caught値を縮約した閉じたevidenceと検証済みbinding | classifier exact一回、role/path/SHA exact一件照合後 | reader/shared-stage-error consumerのfailureDetail | selection admission、proof runner | formal fatal observationへ値を変えず転記。raw causeは破棄 |

表にない実値、hidden closure、global cache、その場のSHA・binding製造を使わない。

## 7. failure帰属と13 checks

| 観測 | caseInputResult / formal report | 13 checks | formal fatal stage | CLI stage / primaryCode / exit |
|---|---|---|---|---|
| meaning packageのpath/file/canonical/schema/formal byte不一致 | rejected meaning-binding | 先頭8件P、atomClosure=F、後続4件B | なし | input-reread / CUE_SELECTION_INPUT_BINDING_MISMATCH / 1 |
| meaning packageのI/O・資源・読取中変化 | fatal meaning-read | 先頭8件P、atomClosure=F、後続4件B | case-context-reread | input-reread / CUE_SELECTION_EXECUTION_FAILED / 2 |
| case/caption/atom ID、本文、retained spanの全量不一致 | rejected meaning-closure | 先頭8件P、atomClosure=F、後続4件B | なし | selection-validation / CUE_ATOM_COVERAGE_INVALID / 1 |
| source-closureのmeaning case binding再照合不一致 | source-closure rejected meaning-case-binding | 先頭8件P、atomClosure=F、後続4件B | なし | input-reread / CUE_SELECTION_INPUT_BINDING_MISMATCH / 1 |
| 選択境界からのcue range・atom/本文/retained span閉包不成立 | source-closure rejected source-closure | 先頭8件P、atomClosure=F、後続4件B | なし | selection-validation / CUE_ATOM_COVERAGE_INVALID / 1 |
| source-closure throw・戻りshape不正 | shared stage error | 先頭8件P、atomClosure=F、後続4件B | case-context-reread | input-reread / CUE_SELECTION_EXECUTION_FAILED / 2 |
| projection-setのmeaning/sourceClosureResult再照合不一致 | projection-set rejected meaning-case-binding | 先頭10件P、deterministicReconstruction=F、後続2件B | なし | input-reread / CUE_SELECTION_INPUT_BINDING_MISMATCH / 1 |
| reconstruction builder rejected | projection-set rejected reconstruction-invalid | 先頭10件P、deterministicReconstruction=F、後続2件B | なし | selection-validation / CUE_ATOM_COVERAGE_INVALID / 1 |
| reconstruction builder throw・戻りshape不正 | shared stage error | 先頭10件P、deterministicReconstruction=F、後続2件B | case-context-reread | input-reread / CUE_SELECTION_EXECUTION_FAILED / 2 |
| style 5、base JSON 3、base media 1のpath/file/canonical/schema/formal byte/SHA不一致 | rejected style-or-base-binding | 先頭11件P、physicalLayout=F、timelineMapping=B | なし | input-reread / CUE_SELECTION_INPUT_BINDING_MISMATCH / 1 |
| style 5、base JSON 3、base media 1のI/O・資源・読取中変化 | reader fatal style-or-base-readをprojection-set input-fatalで同値保持 | 先頭11件P、physicalLayout=F、timelineMapping=B | case-context-reread | input-reread / CUE_SELECTION_EXECUTION_FAILED / 2 |
| resolver rejected、保存resolvedStyle不一致、validator false | projection-set rejected style-resolution | 先頭11件P、physicalLayout=F、timelineMapping=B | なし | style-resolution / CUE_PHYSICAL_LAYOUT_INVALID / 1 |
| resolver例外・必須export欠落 | projection-set Promise rejection | 先頭11件P、physicalLayout=F、timelineMapping=B | style-resolution | style-resolution / CUE_SELECTION_EXECUTION_FAILED / 2 |
| selected edge 0件・複数、返却edge不一致、physical builder rejected | projection-set rejected | 先頭11件P、physicalLayout=F、timelineMapping=B | なし | style-resolution / CUE_PHYSICAL_LAYOUT_INVALID / 1 |
| physical graph/physical builder例外・戻りshape不正 | projection-set Promise rejection | 先頭11件P、physicalLayout=F、timelineMapping=B | physical-layout | style-resolution / CUE_SELECTION_EXECUTION_FAILED / 2 |
| mapper rejected、非正frame、cue正重なり、timeline builder rejected | projection-set rejected | 先頭12件P、timelineMapping=F | なし | selection-validation / CUE_TIMELINE_MAPPING_INVALID / 1 |
| mapper/timeline builder例外・戻りshape不正 | projection-set Promise rejection | 先頭12件P、timelineMapping=F | timeline-mapping | selection-validation / CUE_SELECTION_EXECUTION_FAILED / 2 |

先頭8件はsourceBindingからlineOrderまで、後続4件はlogicalWidthからtimelineMappingまでを指す。意味packageはcaptionSetではなく、実値を初めて必要とするatomClosureが所有する。

fatal inner codeは親正本の既存許可語彙だけを使う。新codeを作らず、生message、stack、stderr、字幕本文、secretを保存しない。CUE_SELECTION_INPUT_BINDING_MISMATCHの単一所有者はZCQ018のままであり、meaning/style/baseのbinding不一致実発火もZCQ018のV3 subcaseが所有する。ZCQ024はmeaning caption/atom closure、ZCQ026は物理・timelineの検査済み拒否、ZCQ027はfatalとstatus/checkpoint写像だけを所有し、同じcodeを二つのtop-level IDへ割り当てない。

planner側のcaseInputResult欠落・余分・型不正はCUE_PLANNER_INPUT_INVALID、source/selection/report/caseInputResultのbinding・projection不一致（意味packageやrecords実値の変更を含む）はCUE_PLANNER_BINDING_MISMATCHが所有する。検証済みbindingと実値が一致した後、選択境界から再構築したcueのatom・本文・retained span全量がsource closureを満たさない場合だけCUE_RECONSTRUCTION_FAILEDが所有する。既存7 planner codeのowner順は変えない。

共用source-closureと共用projection-setのowner-neutral rejectedはconsumerごとに次へ一意に写す。source-closureの二行は前者だけ、残る八行は後者だけが返し、表外の再分類を禁止する。

| 入口 / failedProjectionClass | selection report / checks / CLI | planner result / proof report・CLI |
|---|---|---|
| source-closure / meaning-case-binding | rejected CUE_SELECTION_INPUT_BINDING_MISMATCH / atomClosure=failed / input-reread・同code・exit 1 | CUE_PLANNER_BINDING_MISMATCH / page-line-planner rejection・同code・exit 1 |
| source-closure / source-closure | rejected CUE_ATOM_COVERAGE_INVALID / atomClosure=failed / selection-validation・同code・exit 1 | CUE_RECONSTRUCTION_FAILED / page-line-planner rejection・同code・exit 1 |
| projection-set / meaning-case-binding | rejected CUE_SELECTION_INPUT_BINDING_MISMATCH / deterministicReconstruction=failed / input-reread・同code・exit 1 | CUE_PLANNER_BINDING_MISMATCH / page-line-planner rejection・同code・exit 1 |
| projection-set / reconstruction-invalid | rejected CUE_ATOM_COVERAGE_INVALID / deterministicReconstruction=failed / selection-validation・同code・exit 1 | CUE_RECONSTRUCTION_FAILED / page-line-planner rejection・同code・exit 1 |
| style-base-case-binding | rejected CUE_SELECTION_INPUT_BINDING_MISMATCH / physicalLayout=failed / input-reread・同code・exit 1 | CUE_PLANNER_BINDING_MISMATCH / page-line-planner rejection・同code・exit 1 |
| style-resolution | rejected CUE_PHYSICAL_LAYOUT_INVALID / physicalLayout=failed / style-resolution・同code・exit 1 | CUE_PLANNER_PHYSICAL_INVALID / page-line-planner rejection・同code・exit 1 |
| selected-edge-not-found | rejected CUE_PHYSICAL_LAYOUT_INVALID / physicalLayout=failed / style-resolution・同code・exit 1 | CUE_SELECTED_EDGE_NOT_FOUND / page-line-planner rejection・同code・exit 1 |
| physical-invalid | rejected CUE_PHYSICAL_LAYOUT_INVALID / physicalLayout=failed / style-resolution・同code・exit 1 | CUE_PLANNER_PHYSICAL_INVALID / page-line-planner rejection・同code・exit 1 |
| timeline-invalid | rejected CUE_TIMELINE_MAPPING_INVALID / timelineMapping=failed / selection-validation・同code・exit 1 | CUE_PLANNER_TIMELINE_INVALID / page-line-planner rejection・同code・exit 1 |
| overlap-invalid | rejected CUE_TIMELINE_MAPPING_INVALID / timelineMapping=failed / selection-validation・同code・exit 1 | CUE_PLANNER_OVERLAP_INVALID / page-line-planner rejection・同code・exit 1 |

source-closureまたはprojection-set内の既存dependency/projection builderが例外を投げた場合はrejectedへ変換しない。§3.4のexact七対と同表のformal stage→CLI stageを値変更なく使う。physical/timeline projection builderのthrow・shape不正も、それぞれgraph/mapperと同じ段が所有する。proofはいずれもplanner内の実行なのでfatal observation `page-line-planner`、CLI `page-line-planner/CUE_PROOF_EXECUTION_FAILED/2`へ写す。selectionのprimaryCodeは全七対で`CUE_SELECTION_EXECUTION_FAILED`、終了2である。targetFileは§3.4の検証済みimplementation bindingから`path,fileSha256`だけをこの順で投影したexact 2 key、不明ならnull、toolExitCodeはnullであり、生例外文字列を保存しない。不正wrapperは呼出し境界に応じてsource-closureならatomClosure、projection-setならdeterministicReconstructionをfailedとし、同じ`case-context-reread→input-reread`固定写像を使う。

## 8. approvedContractBindings

### 8.1 source/B5/B6

累積追補v002 §6の3件exactを維持する。本追補の処理を実行しないためv003を追加しない。

### 8.2 selection/proof

次の4件exact、role/path狭義昇順へ限定置換する。

| role | path | SHA検証元 |
|---|---|---|
| caption-quality-complete-implementation-design | evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md | 44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4 |
| caption-quality-complete-implementation-design-addendum | evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-complete-implementation-design-binding-wiring-addendum-20260811-v002.md | a3c8c3ef8e57cd557e4a7cae17ecc188dc523df1508a45de6e2bce36691c7e4d |
| caption-quality-parent-contract | evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md | 33b61ee497d765fbe9eb63fb1b05bce16a99488d238eb27b732550b4daac24ba |
| caption-quality-selection-runtime-value-wiring-addendum | evals/clip_composition/reports/presentation/presentation-zevo-caption-quality-v002-selection-runtime-value-wiring-addendum-20260811-v003.md | 人間承認時にDECISIONSへ記録した本書実測SHA |

selection/proof runnerは4文書をdynamic import前、固定literal import直後、正式root公開直前にstable再読する。不足、余分、順違い、SHA不一致を拒否する。source/B5/B6へ4件を要求せず、selection/proofへ3件を許さない。

## 9. 14 path差分と現在の5 path

### 9.1 path差分

| # | path | v003差分 | path数増分 |
|---:|---|---|---:|
| 1 | presentation_output_caption_cue_source_package_v001.mjs | v003機能差分0。親/v002 exact surfaceで再作成 | 0 |
| 2 | presentation_output_caption_cue_source_package_v001.test.mjs | v003機能差分0。既存ZCQ001〜006を再実装 | 0 |
| 3 | run_presentation_output_caption_cue_b5_b6_v001.mjs | v003機能差分0。直列attempt再開のため再作成 | 0 |
| 4 | run_presentation_output_caption_cue_b5_b6_v001.test.mjs | v003機能差分0。既存ZCQ007〜017を再実装 | 0 |
| 5 | presentation_output_caption_cue_selection_v001.mjs | 共用reader、全case source-closure、全case projection-set、projection builder改訂、10-key admission、契約4件 | 0 |
| 6 | presentation_output_caption_cue_selection_v001.test.mjs | ZCQ018/024/026/027へV3 subcase | 0 |
| 7 | presentation_output_page_line_planner_v003.mjs | 全件caseInputResultと8-key dependencyを受け、共用source-closure resultを共用projection-setへ渡して成功値だけを使用 | 0 |
| 8 | presentation_output_page_line_planner_v003.test.mjs | ZCQ028/035/036へV3 subcase | 0 |
| 9 | presentation_output_render_plan_v003.mjs | v003機能差分0 | 0 |
| 10 | presentation_output_render_plan_v003.test.mjs | v003機能差分0 | 0 |
| 11 | run_presentation_zevo_caption_quality_v002_proof_job_v001.ts | 共用reader、全件caseInputResult、同じ対象meaningPackage受け渡し、契約4件 | 0 |
| 12 | run_presentation_zevo_caption_quality_v002_proof_job_v001.test.mjs | ZCQ042へV3 subcase | 0 |
| 13 | presentation_zevo_caption_quality_v002_review_ui_v001.mjs | v003機能差分0 | 0 |
| 14 | presentation_zevo_caption_quality_v002_review_ui_v001.test.mjs | v003機能差分0 | 0 |

production 7、test 7、合計14 pathのまま、既存path変更0、15 path目0である。

### 9.2 現在の5 pathの扱い

| path | 停止時SHA-256 | 扱い |
|---|---|---|
| presentation_output_caption_cue_source_package_v001.mjs | aea444134f9824d6098aca6bcf832eb4b1b4f3feeca6c1055b5f1828e918252e | SHA証拠確認後に除去しSから全面再作成 |
| presentation_output_caption_cue_source_package_v001.test.mjs | b1e924429ce88c5a0e1c56712b20d79c110d84b5d256368a8abf48508532da20 | 同上 |
| run_presentation_output_caption_cue_b5_b6_v001.mjs | 488893d937ea58aedc4055e6f4c40a235da3d617fa44a605b35acedb8e018c41 | SHA証拠確認後に除去しAを全面再作成 |
| run_presentation_output_caption_cue_b5_b6_v001.test.mjs | a058bb9426bbe716796bb8065e9ff8b62c8a02feda8de9cbb99cdd7def1e5892 | 同上 |
| presentation_output_caption_cue_selection_v001.mjs | 9bfffac136d8b851f96f6133860967e3cd9f7364ba5e461df2f8570e21569d76 | 空projection・架空引数を含むため除去しLを全面再作成 |

実装再開を別承認された場合の最初の手順は、上表5 SHAの一致、残る9 path未作成、既存成果物tree不変を確認し、5 pathを除去して14 path全て未作成の状態を成立させることである。その後S→A→L→P→R→F→Uを再開する。旧5 pathからのcopy、継ぎ足し、部分流用を禁止する。

S/Aの局所17/17は停止報告内の観測として保持する。S exact surface差が判明したため正式合格とは扱わず、新attemptで同じIDを頭から再実行する。

## 10. V3 proof item 67件

既存P=297、V1=41、V2=55は不変である。本追補からV3=67を追加し、期待総数を460とする。

### 10.1 V3件数

| 検査ID | V3件数 | 改訂後 P/V1/V2/V3=合計 |
|---|---:|---:|
| ZCQ018 | 14 | 13/0/5/14=32 |
| ZCQ024 | 9 | 5/0/0/9=14 |
| ZCQ026 | 12 | 6/0/1/12=19 |
| ZCQ027 | 9 | 14/0/7/9=30 |
| ZCQ028 | 7 | 7/2/1/7=17 |
| ZCQ035 | 2 | 1/2/1/2=6 |
| ZCQ036 | 9 | 1/6/3/9=19 |
| ZCQ042 | 5 | 20/9/4/5=38 |

記載のない38 IDはV3=0で既存値不変である。

### 10.2 V3-PROOF-ITEMS-BEGIN

- V3-ZCQ018-01 | selection契約4件のroleとpathとSHAを実再読でexact照合する
- V3-ZCQ018-02 | path #5の共用reader・source-closure・projection-set named export全3件の実在と契約外export不在を観測する
- V3-ZCQ018-03 | selectionがreaderを3-key exactで一回、source-closureを3-key exactで一回呼び、同じsourceClosureResultをprojection-setの5-key exact入口へ渡す実配線を観測する
- V3-ZCQ018-04 | workspace rootがmodule所在から得たrealpathでありprocess cwdへ依存しないことを観測する
- V3-ZCQ018-05 | selection admissionの10-key exact実呼出しと、missing/extra/旧8・9-key拒否、verifiedDependenciesの9-key exactと既存named function identityを観測する
- V3-ZCQ018-06 | rereadDependenciesの10-key exactと数値区分別の既存named function identityを観測する
- V3-ZCQ018-07 | caseInputResultのpassed/rejected/fatal closed union、rejected violation exact一件、fatal evidence縮約、targetFileのnullまたはpath/fileSha256 exact 2-key投影、classifier許可値を全枝実発火する
- V3-ZCQ018-08 | full caseの9-key exactとbase media bindings/resolver実値分離を観測する
- V3-ZCQ018-09 | readerが全case meaning/closureを先に完了してから全case style/baseへ進む二pass順、source caseとcaseInputの件数・順序・三つのIDの一対一を観測する
- V3-ZCQ018-10 | 同じJSON pathがprocess内で一回だけstable再読されることを観測する
- V3-ZCQ018-11 | 同じ媒体pathがprocess内で一回だけstreaming hashされることを観測する
- V3-ZCQ018-12 | 実style 5とbase JSON 3を有限数値入口で全件decodeし意味packageは整数専用入口でformal byteとfile canonical schemaを照合する
- V3-ZCQ018-13 | 固定literal import順で§2.1の14 exportを取得し前後code照合を維持する
- V3-ZCQ018-14 | 契約4件の不足・余分・v003 SHA不一致は既存job-read/CUE_SELECTION_JOB_INVALIDでdynamic import前に拒否し、meaning/style/base/media実値binding不一致だけをCUE_SELECTION_INPUT_BINDING_MISMATCHの単一owner枝で実発火する
- V3-ZCQ024-01 | source-closureの3-key exact入口をselectionで実呼出しし、passed/rejectedのtop-level exact unionと余分・不足key拒否を観測し、meaning packageとsourceのcaption ID・package内ordinal・atom ID列を一対一照合して全package通し序数のcaption display cue line IDを親規則へ一致させる
- V3-ZCQ024-02 | atom occurrenceをcaption宣言順のdense recordsへ写す
- V3-ZCQ024-03 | recordsの5-key exactを実値で検査する
- V3-ZCQ024-04 | atomRefの3-key exactを実値で検査する
- V3-ZCQ024-05 | startMsとendMsを元区間から無変更転記する
- V3-ZCQ024-06 | 本文連結が意味packageとsource境界片へ一致する
- V3-ZCQ024-07 | retained spansの順序と全量が元atomと一致する
- V3-ZCQ024-08 | 検証済みmeaning binding成立後のsource-closure rejectedとreconstruction-invalid rejectedを別subcaseでCUE_ATOM_COVERAGE_INVALIDとして実発火し、atomClosureとdeterministicReconstructionの異なるcheck位置を照合してbinding ownerへ混在させない
- V3-ZCQ024-09 | atom重複と欠損をCUE_ATOM_COVERAGE_INVALIDで拒否する
- V3-ZCQ026-01 | style resolverへ4-key named objectをexactに渡す
- V3-ZCQ026-02 | runtimeProfileとimplementationBindingsをkeyごと省略する
- V3-ZCQ026-03 | resolverのbaseMediaだけへ検証済み媒体bindingを渡す
- V3-ZCQ026-04 | resolverのtimeline generationManifest validationReceiptへstable再読済みJSON実値を渡す
- V3-ZCQ026-05 | resolverのresolved exact 4-key unionとrejected exact 2形を実観測し、cropContextをselection/plannerへ転記しない
- V3-ZCQ026-06 | projection-setがresolverを一回呼び保存resolvedStyleとのformal byte一致とboolean validator trueを観測する
- V3-ZCQ026-07 | physical graphへ5-key named objectをexactに渡す
- V3-ZCQ026-08 | physical graphのdense edge直接戻りを観測する
- V3-ZCQ026-09 | selected edge 0件をnot found、複数または内容不一致をphysical invalidへ分離し、cue順selectedPhysicalEdgesを一回だけ選んでbuilderとcaption displayへ同じobjectで渡す
- V3-ZCQ026-10 | mapperへ実retained spansと再読timelineの2-key objectを渡す
- V3-ZCQ026-11 | mapper overlapとcue間正重なりをoverlap invalidへ分け他のmapping不成立と区別して転記する
- V3-ZCQ026-12 | 3 projection builderの入口がreconstruction exact5・selectedPhysicalEdgesを含むphysical exact8・timeline exact4、戻りがpassed value.projectionまたは固定rejected unionであり、渡すcanonical/hash function identityが既存正本そのもの、wrapper・fallback・local hash・別計算が0件であることを観測する
- V3-ZCQ027-01 | ZCQ018所有のmeaning binding rejected実枝についてatomClosure位置のstatus・13 checks・checkpoint写像だけをexact照合する
- V3-ZCQ027-02 | meaning read fatalをatomClosure位置で実発火し、preclassified innerCodeを再分類せずexact fatal objectへ写す
- V3-ZCQ027-03 | ZCQ024所有のmeaning closure rejected実枝についてatomClosure位置のstatus・13 checks・checkpoint写像だけをexact照合する
- V3-ZCQ027-04 | ZCQ018所有のstyle binding rejected実枝について、全case meaning/source closure成立後のphysicalLayout位置のstatus・13 checks写像だけをexact照合する
- V3-ZCQ027-05 | ZCQ018所有のbase JSON binding rejected実枝について、全case meaning/source closure成立後のphysicalLayout位置のstatus・13 checks写像だけをexact照合する
- V3-ZCQ027-06 | ZCQ018所有のmedia SHA rejected実枝について、全case meaning/source closure成立後のphysicalLayout位置のstatus・13 checks写像だけをexact照合する
- V3-ZCQ027-07 | style/base read fatalと§3.4 exact七対の6-key stage errorを各一枝実発火し、formal stage・case/input ID・targetFile exact 2 key・innerCode・親固定CLI写像を照合し、不正wrapperをclassifierへ渡さずUNCLASSIFIEDへ固定する
- V3-ZCQ027-08 | projection-setのrejected/input-fatal exact union、ZCQ026所有のstyle/physical/timeline checked rejection実枝と対応throwを観測し、余分・不足keyまたはdependency戻りshape不正はrawを破棄したfatalへ分離する
- V3-ZCQ027-09 | caption 1の後段不成立とcaption 2の先行不成立を同時に与え、全caption横断phase順で先行ownerだけが選ばれること、全枝のcheck/checkpointと生文字列0をexact照合する
- V3-ZCQ028-01 | plannerの8-key exact入口を実呼出しする
- V3-ZCQ028-02 | caseInputResult全件をsource caption全件へ同件数同順序で一対一照合する
- V3-ZCQ028-03 | projectionDependenciesの8-key exactと既存function identityを観測する
- V3-ZCQ028-04 | plannerがpath #5のsource-closureと全case projection-setを固定static importし、source-closureを3-key exactで一回呼び、その同じpassed resultを含む5-key exactでprojection-setを一回呼んでselectionと同じphase順を使う
- V3-ZCQ028-05 | 全captionを含む三global projectionのcanonical SHAをselection reportへ一致させ、source-closure不成立とreconstruction-invalidを別枝でCUE_RECONSTRUCTION_FAILEDとして拒否する
- V3-ZCQ028-06 | caseと同indexのrenderSupportを照合し、対象meaningPackageBindingとresolvedStyleをformal pageLinePlanへ、captionDisplay一件とlayoutContextをmodule-only passed valueへ無変更で入れる
- V3-ZCQ028-07 | planner内のI/Oと別読取と別cue line組立てとglobal projection再連結が0件であることを観測する
- V3-ZCQ035-01 | 同じcaseInputResultとselectionから二回のplan byteが一致する
- V3-ZCQ035-02 | projection-set passedのtop-level exact `status,value`とvalue 7-keyを観測し、selectionとplannerの全case成功値7件がbyte一致し、selectedBoundaryCountがcueごとの1+lineEnd件数の総和で重複IDをunique化しないことを観測する
- V3-ZCQ036-01 | caseInputResult欠落をCUE_PLANNER_INPUT_INVALIDで拒否する
- V3-ZCQ036-02 | caseInputResult余分keyをCUE_PLANNER_INPUT_INVALIDで拒否する
- V3-ZCQ036-03 | caseInputsの不足余分入替をCUE_PLANNER_BINDING_MISMATCHで拒否する
- V3-ZCQ036-04 | meaning packageのprojection非影響fieldを含む改変をCUE_PLANNER_BINDING_MISMATCHで拒否する
- V3-ZCQ036-05 | 検証済みcaseInputResultのrecords改変をCUE_PLANNER_BINDING_MISMATCHで拒否する
- V3-ZCQ036-06 | style 5実値のprojection非影響fieldを含む改変をCUE_PLANNER_BINDING_MISMATCHで拒否する
- V3-ZCQ036-07 | timeline実値改変をCUE_PLANNER_BINDING_MISMATCHで再構築前に拒否する
- V3-ZCQ036-08 | media bindingまたはgeneration manifest validation receipt実値改変をCUE_PLANNER_BINDING_MISMATCHで拒否する
- V3-ZCQ036-09 | 旧meaningPackage単独入力と旧4-key dependenciesを拒否し、3 projection SHAを同じままselectionProjectionの非SHA fieldを変えた入力は`/selectionProjection/<最初のfield>`、captionProjectionの件数・itemを変えた入力は`/captionProjection/<最初の0-origin index>`のCUE_PLANNER_BINDING_MISMATCH・relatedPaths空で拒否する
- V3-ZCQ042-01 | proof契約4件を三時点でexact照合する
- V3-ZCQ042-02 | proofが全job/input/implementation/contract照合後かつ最初のoutput request前に共用reader exportを一回だけ呼び、passedはplannerへ渡し、rejectedはinput-read rejectionとevidenceBindings空、fatalはinput-read fatalと同じinnerCodeおよびnullまたはpath/fileSha256 exact 2-key targetFileへ変換する
- V3-ZCQ042-03 | stable再読した同じ全件caseInputResultをplannerへ渡す
- V3-ZCQ042-04 | 同じcaseInputResult内の対象meaningPackageとmeaningPackageBindingをrender/pageLinePlanへ、同じplanner renderSupportのresolvedStyleをformal planへ、layoutContextをcommon coreへ無変更で渡す
- V3-ZCQ042-05 | proof内の別readerとrecord style timeline cue line組立てが0件であることを観測する

### 10.2 V3-PROOF-ITEMS-END

### 10.3 V3抽出と証明消失0

P/V1/V2の抽出規則は累積追補v002 §10.3から変更しない。V3だけは本書SHA照合後、exact見出し「### 10.2 V3-PROOF-ITEMS-BEGIN」と「### 10.2 V3-PROOF-ITEMS-END」の間を取り、行全体が次の正規表現へ一致する行だけを順に取る。

~~~text
^- (V3-ZCQ(?:018|024|026|027|028|035|036|042)-[0-9]{2}) \| (.+)$
~~~

開始・終了見出しが各一件でない、宣言tokenが重複する、ID別ordinalが01から欠番なく上表件数へ一致しない、本文が空、対象外の非空行がある場合は不成立である。

各行のproof item IDはZCQID-V3-ordinal-segmentSha12とする。segmentSha12は正規表現group 2のUTF-8 byte SHA-256先頭12 lowercase hexであり、group 2のbyteを正規化しない。

各proof itemは所有ZCQ top-level test内に専用assertを一件以上持ち、実行時の非literal観測値を要求値へ比較し、成功直後にexact proof-item:proofItemId:passedを一回だけdiagnosticへ出す。既存の静的代用禁止、代表assert禁止、実発火語の実枝要求をV3にも適用する。

正式attempt開始前に、期待集合P ∪ V1 ∪ V2 ∪ V3、test source literal集合、TAP observed集合、TAP passed集合を別々に作ってexact一致させる。V3が67件、総数が460件でない場合は正式46件を開始せず停止する。

## 11. 完全性チェック

| 項目 | 判定 | 根拠 |
|---|---|---|
| 最終目標との接続 | closed | ZEVO字幕品質v002を実データ実証へ進めるL/P配線でありA-v002完了条件へ直結 |
| 現物export実在 | closed | §2.1の14 exportをpath・SHA・行位置で照合 |
| actual引数逆引き | closed | §3〜§6で引数名、供給成果物、検証時点、exact引数、consumerを全件固定 |
| 値レベル閉包 | closed | meaning、atom、retained span、style 5、base 4、resolver、physical、timelineを分離して閉包 |
| 工程間受け渡し | closed | selection/proofが同じreader→source-closure→projection-setを使用し、plannerへcaseInputResult全件、同process内でprojection-setへ同じsourceClosureResultを明示渡し |
| planner再利用 | closed | 同じ全件caseInputResult、sourceClosureResult、cueRanges、global projection成功値を再利用し別読取・別組立て・別連結0 |
| formal schema | closed | 成果物schema変更0。module-only unionと引数だけを改訂 |
| binding来歴 | closed | source/B5/B6は3件、selection/proofはv003を含む4件exact |
| status/code/終了code | closed | 既存status、47 code、終了0/1/2を維持し§7でowner固定 |
| 検査可能性 | closed | 46 ID維持、V3 67件を既存8 IDへ一件割当て |
| path・件数閉包 | closed | 14 path、47 code、46 ID、proof item 460 |
| 大容量媒体 | closed | 動画Buffer一括読取0、既存streaming hashだけを使用 |
| 数値区分 | closed | meaning・時刻・frameは既存整数契約、style/baseの有限小数は既存有限数値codec、NaN/Infinity/非数は同入口で拒否 |
| 既存成果物 | closed | 変更、変換、fallback、併産0。既存5 treeとA-v002記録対象treeを最終照合 |
| 後方互換 | closed | 旧meaningPackage単独planner入力と旧dependency shapeを受理せずforward-only |
| 現5 path | closed | SHA証拠保持後に全除去し旧codeを流用せずSから再実装 |
| 承認済み文書SHA | closed | §1.1の正本を実測。v003自身は承認時SHAをDECISIONSへ記録 |
| 人間判断残件 | 1件 | 本追補の承認可否だけ。実装は別承認 |

## 12. 実装再開時の停止条件

本書の承認だけでは実装しない。別途実装再開が承認された場合も、次の一件で直ちに停止し、同attemptで直さない。

1. §1.1の正本SHA、§2.1の実装SHA、§9.2の5 SHAに差がある。
2. 15 path目、48 code目、47検査ID目が必要になる。
3. actual exportのsignatureまたは戻り値が§2.1と異なる。
4. source/B5/B6の契約3件、selection/proofの契約4件をexactに表現できない。
5. planner/proofに別reader、別record・cue・line組立て、別style/timeline計算が必要になる。
6. 基礎映像のBuffer一括読取、新しいSHA計算、正本関数wrapper、silent fallbackが必要になる。
7. V3 67件または総proof item 460件を実発火へ割り当てられない。
8. 既存成果物、stable tag、ZEVG、A-v002記録対象treeにbyte差が出る。
9. 契約解釈を追加で要する現物差が見つかる。

## 13. 承認依頼文案

相談役レビュー済み。kawafmm裁定: §13の承認依頼文案どおり、ZEVO字幕品質v002 selection再読実値配線追補v003を承認する。

親契約、完全実装設計v001、累積追補v002のその他の条件は不変とし、path #5の共用stable再読入口、全case source-closure入口、全case projection-set入口を、selectionとplanner/proofが同じ順・同じ実値配線として使用する。selection admissionはworkspaceRootと10-key rereadDependenciesを受け、caseInputResultを内部で共用readerから得るexact 10 keyと9-key verifiedDependenciesを使用する。selectionとplannerはsource-closureをexact 3 keyで一回呼び、その同じpassed resultを含むexact 5 keyでprojection-setを一回呼ぶ。planner v003はmeaningPackageを全件caseInputResultへ、4-key dependencyを8-key projectionDependenciesへ置換したexact 8 keyとする。workspace root、意味package整数入口、style/base有限数値入口、媒体読取、mixed baseMedia resolver input、全caption global projection、boundary ordinal式、projection builder改訂、failure帰属、13 checks、selection/proofの承認契約4件を提示どおり固定する。

14 path、47 code、46検査IDは維持し、proof itemはV3 67件を加え460件とする。現S/A/Lの5 pathは停止時SHAを照合して証拠保持後に除去し、旧codeを流用せずSから全面再実装する。

実装再開は別承認とし、本承認ではコード変更、検査、API通信、費用支出、描画を行わない。

目標接続判定: ZEVO字幕品質v002のselection実値配線閉包。

## 14. 停止

本追補の起草・提示で停止する。実装、正式検査、API通信、描画には進まない。
