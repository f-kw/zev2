# ZEVO字幕品質v002 全面再実装 Lゲート入力閉包 停止報告 v001

日付: 2026-08-11

状態: 停止（正式46件は未開始）

通信: 0回

費用: US$0

## 0. 結論

SゲートとAゲートの局所検査を完了し、Lゲートのselection実装へ進んだ時点で、承認済み契約のexact入口だけではselectionが必須とする物理配置・時間写像を実正本で再構築できない入力閉包不足を確認した。

実装者判断で、隠れたclosure、追加field、正本関数のwrapper、空の物理・時間projectionを入れると、承認済み契約の「exact引数」「既存named exportそのもの」「全量閉包」「silent fallback 0」に反する。そのためLゲートを合格扱いにせず停止した。

これは正式検査の不合格ではない。直列局所ゲートの実装中に、承認済み契約の工程間入力配線が不足していることを検出した停止である。

## 1. 実施済み

1. 完全実装設計v001のSHA誤記をDECISIONSへerrataとして記録し、実装照合には正値64桁 `44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4`を使用した。
2. proof itemを承認済み同一抽出規則で再計算し、`P=297 / V1=41 / V2=55 / 合計393`の一致を確認した。
3. Sゲートを実装し、ZCQ001〜006の局所検査は6/6合格した。
4. Aゲートを実装し、ZCQ007〜017の局所検査は11/11合格した。検査transportだけを使用し、外部API通信は0回である。
5. Lゲートproduction pathの実装途中で下記不足を確認した。Lゲートtest path、P/R/F/Uの各pathは未作成である。

ここまでの局所検査は正式46件attemptではない。正式TAPは開始していない。

## 2. 観測事実

### 2.1 selectionのexact入口に実データがない

累積追補v002 §3.3はselection admissionを次のexact 8 keyに固定している。

```text
job
selectionJobBinding
sourcePackage
b6Manifest
providerEnvelope
rawResponseBytes
rawResponseBinding
verifiedDependencies
```

`verifiedDependencies`も、実関数5件だけに固定されている。

```text
resolveStyle
validateResolvedStyle
buildPhysicalPageGraph
mapPiecewiseTimeline
hashRawResponseBytes
```

意味packageの実値、base media timelineの実値、style台帳5成果物の実値、base media 4成果物の実値を渡す引数はない。

### 2.2 source packageが保持するのは復元用IDとbindingである

完全実装設計v001 §5.3により、source packageのreconstruction mapは次だけを保持する。

- meaning packageのbinding
- caption ID、meaning package ordinal、元caption ID、atom occurrence ID列、boundaryからatom IDへの対応
- case ID、input caption ID、meaning package binding、base media binding群、style input、style binding群、保存済みresolved style

atom本文・retained span・base media timelineの実値・style台帳実値はsource packageへ複製しない。Gemini可視promptにも時刻・retained span・元atom IDは含めない。この設計自体は意味情報の非複製として整合している。

### 2.3 selectionの合格条件は実値を必要とする

完全実装設計v001 §6.1〜§6.4は、selection公開前に次を必須としている。

1. cue/行を平坦化したatom ID、本文、retained spanの非重複・非欠損。
2. cue本文と元atom時刻片からの時間写像。
3. 実style resolverの再実行と保存済みresolved styleのbyte一致。
4. 実physical page graphによる安全領域・行交差・有限座標の検査。
5. 実piecewise timeline mapperによるframe写像と正重なり0の検査。
6. 上記projection SHAをselection reportへ保存してからselectionを公開。

### 2.4 現行正本関数の実引数

現物では次の入力が必要である。

- style resolver: style input、style台帳成果物の実値、base media 4成果物の実値。
- physical page graph: caption、全文record列、style resolver実戻り、resolved style validator。
- piecewise timeline mapper: retained span列、base media timelineの実値。

いずれもselection admissionのexact 8 keyまたはsource packageの保持値だけでは作れない。

## 3. 不成立となる実装方法

| 方法 | 不成立理由 |
|---|---|
| source packageへ非契約fieldを足す | exact schema違反。正式source成果物の意味変更になる |
| selection runnerが実値を読み、source package objectへ非列挙fieldとして埋める | 隠れた状態であり、工程間binding閉包と自己申告禁止に反する |
| `mapPiecewiseTimeline`等を実値を捕捉したwrapperへ置換する | verifiedDependenciesは既存named exportそのものに固定されており、正本関数のwrapperは契約外 |
| selection admission内でbinding pathを直接読む | pure admissionのexact入口にreader capabilityがなく、I/O責務を勝手に追加することになる |
| retained spanやphysical graphを空値・固定値で通す | 全量閉包、実正本、物理成立の合格条件を満たさない |
| 物理・時間検査をplannerまで先送りする | selection公開前に成立させる承認済み停止点を緩める |

## 4. 帰属

三分法では**契約の入力配線閉包不足**である。

- production欠陥として直せない理由: 既存正本関数は必要な実値を要求しており、挙動は契約と整合している。
- fixture・検査欠陥ではない理由: 正常実経路そのものへ必要値を渡す正式引数がない。
- 契約側の不足: source packageで非複製にした実値をselection runnerが再読した後、admissionへ渡すexact配線が定義されていない。

現在のL production pathには、この不足を仮置きした空projection・簡易style処理が残っているため、契約到達実装ではない。追記せず現状凍結した。Lゲートは未完了である。

## 5. 実現性調査で事前検出できたか

**できた。**

完全実装設計と累積追補の実現性調査は、既存exportの実在とbindingの供給者・転記先を確認したが、正本関数を実際に呼ぶための値レベル引数をselection admissionまで逆向きにたどる確認が不足していた。具体的には、`mapPiecewiseTimeline`の関数実在だけで閉じ、同関数が要求する`retainedSpans`と`baseMediaTimeline`の供給経路まで照合していなかった。

今後の実現性調査では、既存exportごとに「actual引数名→値の供給成果物→検証時点→工程間exact引数」を一件ずつ逆引きし、一つでも途切れればclosedと判定しない必要がある。

## 6. 最小追補で確定が必要な事項

契約の意味を維持する最小方向は、selection runnerが既存bindingからstrict再読・検証した実値を、selection admissionへ明示入力として渡す配線を追加することである。追補では最低限、次を値レベルで固定する必要がある。

1. admissionへ追加するexact引数名とitem schema。
2. caseごとのmeaning package実値、base media timeline実値、style台帳5成果物実値、base media 4成果物実値の供給者とstable再読時点。
3. source package内のcase/caption/bindingと追加実値を一対一に照合する規則。
4. 実style resolver、physical page graph、piecewise mapperへ渡すactual named objectのexact組立て。
5. 例外・binding不一致の既存14 codeへの所有割当てと13 checksの停止位置。
6. plannerが同じprojectionを再構築するときに同一配線を再利用し、別の読取・組立てを作らない方式。
7. ZCQ018、ZCQ024、ZCQ026、ZCQ027およびproof item集合への差分。検査ID・code・14 pathは増やさず閉じられる見込みだが、追補で確定が必要である。

## 7. 現在の作業ツリーで本attemptが所有するpath

| path | 状態 | SHA-256 |
|---|---|---|
| `presentation_output_caption_cue_source_package_v001.mjs` | S局所ゲート合格 | `aea444134f9824d6098aca6bcf832eb4b1b4f3feeca6c1055b5f1828e918252e` |
| `presentation_output_caption_cue_source_package_v001.test.mjs` | S局所ゲート合格 | `b1e924429ce88c5a0e1c56712b20d79c110d84b5d256368a8abf48508532da20` |
| `run_presentation_output_caption_cue_b5_b6_v001.mjs` | A局所ゲート合格 | `488893d937ea58aedc4055e6f4c40a235da3d617fa44a605b35acedb8e018c41` |
| `run_presentation_output_caption_cue_b5_b6_v001.test.mjs` | A局所ゲート合格 | `a058bb9426bbe716796bb8065e9ff8b62c8a02feda8de9cbb99cdd7def1e5892` |
| `presentation_output_caption_cue_selection_v001.mjs` | L未完了・凍結 | `9bfffac136d8b851f96f6133860967e3cd9f7364ba5e461df2f8570e21569d76` |

L test、P/R/F/Uの9 pathは未作成である。既存正式成果物、stable tag、ZEVG、A-v002記録対象treeは変更していない。

## 8. 停止点

契約追補の承認なしにL実装を続けない。正式46件、直接影響回帰、green 287、baseline、tree照合は未実施である。

起草承認を得る場合は、§6のselection再読実値配線だけを対象にした版付き最小追補を提示し、親契約・完全実装設計・累積追補v002のその他の条件、14 path、47 code、46検査IDを不変にする。
