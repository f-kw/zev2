# fatal観測性v002 範囲改訂attempt-0001停止報告 v001

- 日付: 2026-08-08
- 判定: **停止**
- 改訂計画の周回: 1/2
- 通信: 0回
- 費用: US$0
- 正式成果物変更: 0件
- commit A: 未作成

## 1. OEE002診断

検査側だけの診断入口で、既存runnerが作った受入報告を版付き保存した。production専用分岐は作っていない。

| 項目 | 実測 |
| --- | --- |
| status / exit | `rejected / 1` |
| 失敗check | `styleResolution` |
| 違反code | `STYLE_BINDING_MISMATCH` |
| path | `/styleInput/presetBinding` |
| request・意味package・基礎映像・timeline・字幕source | 全て合格 |

診断JSONは`evals/clip_composition/reports/presentation/diagnostics/20260808-fatal-observability-v002-oee002/attempt-0001/oee002-diagnostic.json`、SHA-256は`19a4002d37c3b043257ce61bdf15e60cbc3a30da8bfda3c38afc34416bf9aa50`である。

## 2. 帰属

原因はproduction実装欠陥である。縦型renderer trustの15依存中、13件は生成時SHAと現在実体SHAが一致する。世代差がある2件は次のとおり。

| role | 生成時SHA | 現在SHA |
| --- | --- | --- |
| vertical-renderer | `b9f35e6a17a060286139367e2ffedcd3378239f47e74e4c178fea00659d67f54` | `e12117c04f7bbfe6a67459fc815dd609809ec02fa8792d548e183f58b8ececdd` |
| renderer-core | `d02d603f3fc04f9ab58ce889644f5e63bf17d7ec5cb19019e09110c6167a720b` | `ea775b314cc149c65d384603dbc39f3260e3ba8e4a32d99a6275941bf31dd223` |

両pathは正式jobにも現在実体SHAでlive束縛されている。2026-08-02裁定は、trustの依存SHAを生成時来歴として保持し、現在実体照合をjobのlive束縛へ置く。現行実装はvertical-rendererだけ世代差を許し、renderer-coreには生成時SHAと現在SHAの同一を再要求していた。

したがって契約矛盾やfixture欠陥ではなく、承認済みの来歴／live分離をrenderer-coreへ適用し切れていない実装欠陥である。

## 3. 限定修正

縦型trust検査を次の一規則へ限定修正した。

- trust依存pathが正式jobにも存在する場合: 現在実体SHAとjobのlive SHAを照合する。
- trustだけに存在する場合: 従来どおり現在実体SHAとtrustの生成時SHAを照合する。

fixtureのtrust SHA、契約、schema、status、違反code、終了code、表示・crop計算、正式成果物は変更していない。

## 4. 正式attempt結果

起動前にネイティブ環境、固定Node、固定TSXの絶対path、`NODE_OPTIONS`不存在、Chromium起動可能、競合processなし、attempt root未使用を確認した。直接影響130件を新計画attempt-0001として頭から一度だけ実行した。

結果は **129/130**。OEE002とOPF012は合格した。1件不合格の停止条件に従い、同attempt内では直していない。

| 証拠 | 値 |
| --- | --- |
| TAP | `evals/clip_composition/reports/presentation/test-runs/20260808-fatal-observability-v002-scope-revision/attempt-0001/direct-impact-130.tap` |
| TAP SHA-256 | `2900a1f7591ad4dd1d6afba817c87c07494a02524335a7e1295760b2f506872d` |
| stderr | 0 byte |
| 合格 / 不合格 | `129 / 1` |

green 287、baseline exact、既存5 tree照合、commit Aへは進んでいない。

## 5. 残る1件

OPF002が、限定修正後の縦型renderer実体SHA `6fb4edfd9c9a9161f474921368b05bd32c0aaef2b1fd5155e148d291134c8c75`を、修正前の承認済み現在SHA `e12117c04f7bbfe6a67459fc815dd609809ec02fa8792d548e183f58b8ececdd`と比較して不合格にした。

これはproductionの処理結果不一致ではなく、OPF002の二層来歴表が、今回承認された限定修正をまだ承認済み変更pathとして再束縛していない検査側の更新漏れである。検査の意図は、開始SHAを来歴として保持し、承認済み変更だけを現在SHAへ束縛することにある。縦型rendererを承認済み変更集合へ追加しても、無承認変更の拒否は維持される。

## 6. 周回2/2の限定案

次の一件だけを検査側で更新する。

1. OPF002の承認済み現在SHA表へ縦型renderer pathと上記SHAを追加する。
2. 表の件数期待を1件から2件へ更新する。
3. production・契約・正式成果物は変更しない。
4. ネイティブ環境、固定Node、固定TSX絶対path、`NODE_OPTIONS`不存在、Chromium起動可能を再確認する。
5. 直接影響130件をattempt-0002として頭から一度だけ実行する。
6. 130/130の場合だけgreen 287、baseline exact、既存5 tree、commit Aへ進む。

今回の縦型rendererは元のfatal観測性18 path外だが、kawafmmが本範囲改訂で承認したOEE002の限定production修正である。完了時は既存18 path SHA表を維持し、この追加1 pathを範囲改訂補助pathとして別行で申告する。これを黙って18 pathへ混ぜない。

## 7. 停止点

本報告の提示で停止する。OPF002の再束縛、attempt-0002、green、baseline、tree照合、commit Aは未実施である。
