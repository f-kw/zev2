# A-v002 縦型render plan不一致 診断・限定修正設計 v001

日付: 2026-08-10  
通信: 0回  
費用: US$0  
正式proof再実行: 0回

## 1. 結論

保存済みv006入力と既存pure入口だけで原因を確定した。

縦型診断の正式styleは`cropMode: diagnostic-contain`であり、v002のstyle検査とrender plan検査には合格する。その直後、v002が共用するv001のelement投影入口だけが、縦型styleを`cropMode: bound-decision`に限定して再検査するため、8 page全件を拒否していた。

これは**productionの版間接続欠陥**である。fixture・実行設営の欠陥ではなく、契約矛盾でもない。planner、字幕本文、改行、frame写像、保存済み入力は不一致の原因ではない。

## 2. 実現性調査

| 現物 | SHA-256 | 照合結果 |
|---|---|---|
| v006を作った正式job v008 | `0c5fcf0320bfa72d60350182a40462ae700e4515e172ba7f6c4e3e608b183fcf` | decoder入力と保存byteを使用 |
| 縦型診断style生成 | `4782b56fce59702bdb002deafd1989f86f19dc7936c7341d890be0adf51876c9` | `diagnostic-contain`を生成 |
| v002 page/line planner | `8c943d68e1d08aadd48ab80e100006e091d2163c8fcb88a005e9f07f050b7f83` | 101 atom、8 pageを`planned` |
| v002 render plan | `80623c9690be58ea4db59eec40d76af3c0f51e3f5c860b0c985c78832e88fe01` | 診断styleを`built` |
| v001共通element投影 | `fb7a7ea2839444955ab7a8da6c86d38ab7007c2627af4e00e210d6bda2b7ab82` | 旧縦型style条件で8 page全件を拒否 |

production呼出しは、v001 common planとv002 common planの2箇所だけである。v001はelement投影より前にv001 render plan全体を正式検査する。v002も同様にv002 render plan全体を正式検査する。したがって、各版の正式受理条件を変えず、共通投影入口が受け取れる「各版で検証済みのstyle」の接続だけを直せる。

追加するimport edge `render-plan-v001 → page-line-planner-v002`から元へ戻る経路はなく、循環依存は0件である。

## 3. field・値・byteの確定

| 項目 | 実測 |
|---|---|
| page/line plan | `planned` |
| v002 render plan | `built`、8 page |
| v002 common core | `rejected` |
| 内側違反 | `OUTPUT_V002_RENDER_PROJECTION_MISMATCH /captionDisplays/0` |
| 正式style | `vertical-short-1080x1920 / screenLayoutId:null / diagnostic-full-frame-contain-v001 / diagnostic-contain` |
| style compact byte | 397 byte / SHA `474a14f6c536e8c6f0363ce15eeaaa76dbf49b4ea68ead8ecd8b617fabf7348c` |
| pure再構成render plan | 40,601 byte / SHA `299062f1e826a1f069d77b250397db5260b8d8764819abd4ea0d462bee0894b1` |
| 正式公開済み縦型render plan | 0 byte。描画・QC後公開のため拒否時点では未公開 |

不一致fieldは`/resolvedStyle/cropMode`である。

- 実値`diagnostic-contain`: 18 byte、hex `646961676e6f737469632d636f6e7461696e`
- 旧投影入口の要求`bound-decision`: 14 byte、hex `626f756e642d6465636973696f6e`
- 実値のまま: built 0 / rejected 8 page
- `screenLayoutId`だけ変える対照: built 0 / rejected 8 page
- `cropMode`だけ変える対照: built 8 / rejected 0 page

cropだけを変えた診断用planは40,597 byte、SHA `6fc692d0b158d3d35a815b068d3ae94cd6978640863b13752b50eb2540ba9919`、最初の差は0始まり3442 byteである。ただし、この対照値はv002正式契約に反し、v002 validatorが拒否する。したがって、jobやplanの値を`bound-decision`へ変える案は不採用とする。

診断機械記録:

- `reports/presentation/diagnostics/a-v002-vertical-render-plan-mismatch-20260810-v001.json`

## 4. 三分法

| 帰属 | 判定 | 根拠 |
|---|---|---|
| productionが契約に届いていない | 該当 | v002が正当に受理したexact診断styleを、共用v001投影入口が旧style条件で再拒否 |
| fixture・検査・設営のずれ | 非該当 | 保存済みpreset SHA・meaning package・timelineが一致し、plannerとv002 render planは合格 |
| 契約矛盾 | 非該当 | v002契約は診断styleを明示受理し、既承認の6本実証は同じ共通描画計算の再利用を要求 |

## 5. 限定修正

変更はproduction 1 file、test 2 fileの計3 pathに閉じる。

1. `presentation_output_render_plan_v001.mjs`
   - v001正式style判定とv001 render plan validatorは一切変更しない。
   - v002の既存正式style validatorを再利用するprivate判定を、共通element投影入口だけに追加する。
   - 追加受理は`vertical-short-1080x1920 / screenLayoutId:null / diagnostic-full-frame-contain-v001 / diagnostic-contain`のexact組だけとする。
   - v1/v2とも同じelement投影計算を使い続け、別実装、値変換、偽装、fallbackを作らない。
2. `presentation_output_render_plan_v002.test.mjs`
   - ORPV2005内で、正式診断styleがv002 render planだけでなくcommon coreまで`built`になり、本文・line・frame・preset・state・registry・来歴が入力と一致することを確認する。
   - 誤presetと`bound-decision`はv002 render planで引き続き拒否する。
3. `presentation_output_render_plan_v001.test.mjs`
   - ORP017の既存v001 common plan SHAを維持する。
   - v001正式validatorとv001 common planが診断styleを引き続き拒否することを追加確認する。
   - ORP018の単一共用入口・非複製検査を維持する。

## 6. 検査と再開条件

既存IDを強化し、正式件数は92のまま維持する。

| 証明 | ID | 合格条件 |
|---|---|---|
| 新しい実枝 | ORPV2005 | exact診断styleがcommon coreまでbuilt、近似値は拒否 |
| v001結果不変・正式契約不変 | ORP017 | 既存SHA一致、v001正式経路は診断style拒否 |
| 計算単一正本 | ORP018 | v1/v2の共用入口一致、v2側の複製0件 |
| 保存済みC工程byte oracle | OPL028 | 横型・縦型captionDisplays byte一致 |
| 正式閉包 | formal92 | 92/92、fail 0、TAP全文を新attemptへ保存 |

正式92件合格時だけ、現物20 implementation pathを再hashしたv009 jobを正式serializerでno-replace発行する。変更値はjob ID、未使用v007 root、今回変化したproduction SHAだけとする。未使用rootでproofを1回実行し、残る横型3本・縦型診断3本、QC、確認ページ、完成報告まで進む。

不合格1件、新しい現物差、契約改訂、通信の必要、既存横型第1号SHA `b12ec0af708af0a5afa69488b72bf55a6300bbed162877c59cc9154f79f14fcf`の変化を観測した場合は同attemptで直さず停止する。

## 7. 保証範囲

本修正が保証するのは、v002正式validatorに合格したexact縦型診断styleを、既存の単一共通element投影計算へ接続できることまでである。縦型診断を正式preset品質として認定せず、日本語字幕の目視品質も機械合格とはしない。既存v001/v002契約、保存済み正式成果物、使用済みv006 root、横型第1号動画は変更しない。
