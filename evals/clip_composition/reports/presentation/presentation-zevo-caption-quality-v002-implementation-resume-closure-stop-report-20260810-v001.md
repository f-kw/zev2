# ZEVO字幕品質v002 実装再開・閉包監査停止報告 v001

- 日付: 2026-08-10
- 開始HEAD: `542b35684a3ad67dbab042ca2bb3bff022e42023`
- 親正本: `presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md`
- 親正本SHA-256: `44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4`
- 承認済み追補: `presentation-zevo-caption-quality-v002-complete-implementation-design-binding-wiring-addendum-20260810-v001.md`
- 承認済み追補SHA-256: `6de44032c8215253b1bb9e1b71b6ed33273d983d022d2f6737e3696c3609ce23`
- 状態: **実装前停止**
- 実装: 0 path
- 正式検査: 0件・未開始
- API通信: 0回
- 費用: US$0

## 1. 結論

承認済み追補が対象にしたplanner v003とrender v003のbinding受け渡しは、現物上も閉じている。

しかし、同じ「供給者→stable再読→exact引数→成果物への転記」の監査を14 path全体へ再適用したところ、追補より上流にあるsource packageとselection reportに、同型の未閉包が3件残っていた。加えて、正式byteを左右するID literal、承認契約来歴、fade値の取得方法にも未固定が残る。

これらを実装者判断で埋めると、今回の追補が明示的に禁止したbinding推測、path合成、その場のSHA製造、自己認定のいずれかが必要になる。そのため、14 pathを一件も作らず、正式46件を開始せず停止した。

本停止はproductionの退行でも検査不合格でもない。**承認済み実装契約の値・工程間配線が、実装可能なところまで閉じていない契約未閉包**である。

## 2. 確定した観測

### 2.1 source packageの生成job binding

親正本§3.1のpure builder入口は次の2 keyだけである。

```text
buildPresentationOutputCaptionCueSourcePackageV001({job,caseInputs})
```

一方、正式source packageの`provenance.sourcePackageJobBinding`はformal JSON bindingの必須fieldである。source job自身には自己bindingがなく、pure builderはjob path・stable再読byte・file SHA・canonical SHAを受け取らない。

CLIの`executePresentationOutputCaptionCueSourceJobV001(jobPath)`は実jobをstable再読してbindingを所有できるが、その検証済みbindingをbuilderへ渡すexact引数がない。job値の再直列化や固定pathの組立てで埋める方法は、実在fileのstable再読証拠にならない。

既存前例`buildPresentationMeaningBoundarySourcePackageV001`は、`jobBinding`を明示入力として受け、runnerが実job byteから作ったbindingを渡している。今回の入口だけがその縫い目を欠く。

### 2.2 selection reportの生成job binding

親正本§3.1のselection admission入口は次の6 keyだけである。

```text
admitPresentationOutputCaptionCueSelectionV001({
  job,
  sourcePackage,
  b6Manifest,
  providerEnvelope,
  rawResponseBytes,
  verifiedDependencies,
})
```

正式selection reportは全statusで`selectionJobBinding`を必須かつnon-nullとする。しかしadmissionは検証済みselection job bindingを受け取らず、job schemaにも自己bindingはない。したがって、reportへ転記する正規の供給元がない。

### 2.3 passed selection reportのselection binding

admissionは成功時に`{selection,report}`を同時に返す。passed reportはnon-nullの`selectionBinding`を必須とする。

一方、正式selection bindingが成立するのは、selectionをstagingへ保存し、stable再読・strict decode・SHA照合を終えた後である。これはadmissionが戻った後になる。現行入口のままでは、正式保存前のselection objectからbindingを自己製造する以外にreportを完成できない。

したがって、少なくとも次のどちらかを契約で一意に決める必要がある。

1. admissionはselectionとreport coreまでを返し、runnerがselectionを正式保存・stable再読した後、別のpure finalizerへ`selectionJobBinding`と`selectionBinding`を渡してreportを完成する。
2. runner所有の正式publisher capabilityをadmissionへ明示注入し、selectionの保存・stable再読後にだけreportを完成する。

どちらを採るかはmodule surface、I/O所有、拒否時成果物集合を変えるため、実装者が選ばない。

### 2.4 正式IDのliteralと写像

親正本§5.10はmanifest/report IDを`<jobId>-<artifact-kind>`とするが、`artifact-kind`のexact文字列を固定していない。またprovider envelopeの`envelopeId`には生成規則自体がない。

現時点で未固定なのは、top-level 8 fieldとcommon-core projection内の2 fieldである。

| 成果物 | 必須field | 未固定内容 |
|---|---|---|
| B5 manifest | `manifestId` | artifact-kind literal |
| B5 failure report | `reportId` | artifact-kind literal |
| provider response envelope | `envelopeId` | ID全体の生成式 |
| B6 manifest | `manifestId` | artifact-kind literal |
| B6 failure report | `reportId` | artifact-kind literal |
| selection report | `reportId` | artifact-kind literal |
| proof completion report | `reportId` | artifact-kind literal |
| proof rejection report | `reportId` | artifact-kind literal |
| common-core element | `instructionId` | どの検証済み上流IDを無変更転記するか |
| `targetProvenance` | `targetRefId` | 同displayのどの意味IDを無変更転記するか |

cue一件をelement一件へ写すことと`targetType=semantic-caption`までは固定されているが、既存common-core pure入口はcallerが渡したIDをそのまま使うため、再利用だけでは後ろ2件を決めない。file basename、schemaVersion、近い上流IDから暗黙に推測すると、同じ承認済み契約から複数の正式byteが作れる。ID literalと無変更転記元は追補で一件ずつ固定する必要がある。

### 2.5 承認契約binding集合

親正本§5.4は、全5 jobの`approvedContractBindings`を次の2件exactに固定する。

1. 親契約
2. 完全実装設計v001

今回承認されたbinding受け渡し追補v001は、この正式来歴集合へ含まれない。このまま実装すると、formal jobは実際に適用した追補を承認契約来歴へ記録できない。

追補v001を3件目として加えるか、未閉包を統合した次版追補を正本として3件目にするかを、人間裁定で一意にする必要がある。

### 2.6 `observedFadeFrameCount`の取得方法

値の二つの供給元は実在する。

- preset registry: `quick-fade-4f-v001`のentry/exitが各4 frame
- renderer: `render_presentation_v002.mjs`のalpha式の除数4

ただし、親正本は「両方を独立照合して一致した場合だけ4を記録する」とする一方、runnerが各値を得るexact入口・解析方式を固定していない。UIへ4を焼き込むことは禁止されているため、実装方法を選べない。

これはbinding未閉包とは別の実装方法未固定だが、review inputの正式byteを左右する。同じ追補で、既存decoder/exportを使うのか、束縛済みsourceへの固定静的検査を使うのかを一意にする必要がある。

## 3. 閉包済みと確認した範囲

- planner v003の`proofJobId`と`selectionReportBinding`
- render v003の`proofJobId`と`outputRequestBinding`
- output request、page/line plan、render planの正式保存・stable再読順
- completionでのpage/line plan bindingとrender plan bindingの対束縛
- proof output request、video、QC、review input、review HTMLの各binding
- B5/B6のjob path、countTokens raw、generate raw、request、manifestの実読取binding

planner/renderへpage/line plan bindingを追加しない裁定も、proof runnerのstable再読とcompletionの対束縛により成立する。

## 4. 帰属の三分法

| 区分 | 判定 | 根拠 |
|---|---|---|
| productionが契約に届かない | 該当しない | 新規14 pathは一件も作っていない |
| 検査・fixtureが契約とずれる | 該当しない | 正式検査は未開始 |
| 契約が実装に必要な値・順序を閉じていない | **該当** | 必須binding、ID literal、正式来歴、fade取得方法をexact入口から確定できない |

既存production・既存正式成果物・stable tagへ、本attemptによる変更はない。

## 5. 実現性調査での検出経路

今回の未閉包は、実装fileを作る前のsource module surface照合で検出できた。したがって「実現性調査で事前検出できたか」の自己評価は**できた**である。

一方、前回停止報告§4.3はsource packageについて「job ID、固定job path、formal byte規則からjob bindingを閉じられる」と記したが、**そのbindingをpure builderへ渡すexact引数の実在を確認していなかった**。今回の追補もplanner/renderだけを影響pathとし、この誤った閉包判定を継承した。

原因は、値の導出可能性を見ただけで「供給者→検証時点→exact引数→consumer→成果物field」の全線を成果物ごとに照合しなかったことである。新しい標準確認を部分適用したことが見逃し経路であり、次追補では14 path全成果物を一件表で再閉包する。

## 6. 推奨する次の一手

承認済み追補v001を黙って編集せず、**binding・ID・来歴・fade取得を統合した版付き契約追補v002**を起草する。

追補v002で最低限固定する項目は次のとおり。

1. source builderへ検証済み`sourcePackageJobBinding`を渡すexact引数と、無変更転記・不一致拒否。
2. selection admissionへ検証済み`selectionJobBinding`を渡すexact引数。
3. selection正式保存・stable再読後にpassed reportへ`selectionBinding`を渡す二段構造と、rejected/abstained/fatal各枝の成果物順。
4. §2.4のtop-level 8 IDを作るexact literal/式と、common-core内2 IDの無変更転記元。
5. formal jobが束縛する承認契約文書のexact集合と件数。
6. preset側4 frameとrenderer側4 frameを得る既存実体・入口・比較方法。
7. 影響するmodule surface、14 path、47 code、46検査IDの差分表。総数を維持する場合は既存IDへ加えるsubcaseと証明消失0を固定する。
8. 14 path全成果物について、供給者・stable再読時点・exact引数・consumer検査・転記先を閉じた全件表。

schema、path数、code数、検査ID数を維持できる見込みはあるが、selection reportの二段化と承認契約binding件数は契約本文の改訂を要するため、承認なしに確定しない。

## 7. attempt状態

- 新規14 implementation path: **14/14不在**
- 途中実装: **0 path**
- 既存implementation path変更: **0件**
- DECISIONS: 本日受領した追補承認の正本行だけを追記
- 正式46件/TAP: **未開始**
- 回帰: **未開始**
- API通信/countTokens/generateContent: **0回**
- 正式描画・成果物生成: **0件**

## 8. 承認依頼文案

> ZEVO字幕品質v002 実装再開・閉包監査停止報告v001を受理する。承認済み追補v001は不変保持し、§6の8項目を一つの版付き契約追補v002として起草することを承認する。追補は14 path全成果物のbinding/ID/来歴/値取得を供給者→検証時点→exact引数→consumer→転記先まで全件閉じ、差分表と証明消失0を提示する。起草・提示で停止し、実装・検査・API通信・描画は別承認とする。
