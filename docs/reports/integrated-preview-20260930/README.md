# 540p統合候補の生成・検証

## 結果：Aの技術検証と独立準備は完了、A/B工事全体は未完了

2026-09-30 JST。A=縁8px・外周4pxの**960×540/30fps・9分47.1秒**を生成し、保存・別process再読・局所Normal/off/Resetまで確認した。**B=8/12は論理領域21件不合格のまま、全編未生成**。相談役の663c8c72監査により、今回はBの診断を終了し、余白・配置・保証を変更せず保存する。Bの見た目を不採用と決めたわけではない。

- [機械検証と媒体・時間・資源](verification.json)
- [Aの独立再読と全体未完了](independent-read.json)
- [局所操作の独立再読](operations-independent-read.json)
- [対象5試験：5合格・skip 0](tests.tap)
- [確認待ちのreview data](review-data-v001.json)／[既存テンプレートの媒体照合](review-build-verification.json)
- [既存確認待ち台帳](../../HUMAN_REVIEW_PENDING.md)

### Aの保存先

`runtime/artifacts/integrated-preview-20260930-v001/attempt-002/A/integrated-preview.mp4`

SHA256：`3311bda4128cb5e04a256bcda5fc67efa3fd6d3e96e86381ee5c14391a8778df`、96,079,005 bytes。全体の保存入口は同attemptの`completion.json`（状態は **incomplete**）。A単独の保存入口は`A/completion.json`。

**縁の人間選択はnull。** Aの先行生成を人間によるA採用へ読み替えない。540pの技術検査は1080p最終native QC・人間品質採用の代わりではない。今回は再生・回答を要求しない。

## 固定入力と検証範囲

指示書commit `239abd110bc67b7c2a60548ea1bd1a7f96920121`をmainへfast-forwardし、既存の統合準備attempt-002を専用readerで読み戻して開始。7Bの17,613frame・265字幕・307状態、144pxの1080p論理設定、18 ColorのYellow＋LightSkyBlue、字幕000119の固定1.2倍・9771〜9853未満の82frameを維持した。Panelの固有設定と校正、Pulse/Motionの途中状態、本文・改行・元時計・構成・音声は変更しない。

| 確認 | 結果 |
|---|---|
| A全307状態の実描画、論理/実alpha領域、Panel・動き | 合格。307画像は初回完了分の入力/設定/PNG/実alphaを再照合し再利用 |
| B全307状態 | 実描画完了。論理領域21件不合格、実alpha境界違反0。合格にしない |
| 共有背景 | 17,613frame、指定82frameだけ復号画素変化、残り一致。PCM音声一致 |
| A全編 | 17,613frame、960×540/30fps、全PTS一致。保存音声のAAC payload・sample時計一致 |
| A/B設定 | 縁以外の字幕本文・時計・2色対象・Panel・有限状態・背景・音声を保持 |
| 独立再読 | 別processで607物理PNG、元準備、背景、A動画、音声、時計、旧保護対象を検証。全体の返値はincomplete-evidence-verifiedで両案合格ではない |
| Normal/off | Aを明示した局所210frameで同じ通常画角状態へ解除。全編再生成なし |
| Reset | 未選択原案＋元の局所アップへ復帰。7秒動画SHAが既存候補と完全一致（c0b92e33896f4f4874149edfc2755e412e8bdfac25c6020e305cfd583d659425） |
| 旧成果物 | 元準備readerの保護対象を開始・終了・独立再読でSHA照合。旧7A/7B/13/アップ/縁/準備・束縛済み実装は不変 |

描画状態は614論理、607物理。A307枚は前attemptから検証付き再利用、Bは300枚新規＋同一Panel7枚共有。背景と全編音声は一つを使う。B不合格のため全編A/Bの復号画素比較は未実施であり、設定同一性と混同しない。

## 時間と資源（今回の実測）

attempt-002は2026-09-30 00:58:51〜01:07:14 JST。初回失敗・診断・監査待ちを含む全作業時間ではない。

| 工程 | 秒 | 範囲 |
|---|---:|---|
| 入力再読・A再検証・A/B字幕準備 | 148.862 | 実走開始から共有背景前まで |
| 共有背景生成と画素/音声/時計検査 | 179.554 | 新規背景1本。元との全frame比較込み |
| A本体合成 | 150.406 | 合成子processのみ |
| A本体合成＋媒体検査 | 173.534 | 上の150.406秒を含む |
| 保存まで | 502.546 | 上記工程を含む総wall time。A/B両方の完成時間ではない |
| 保存後の独立再読 | 251.134 | 保存までの時間と別 |
| 局所Normal/Reset生成・検査 | 5.180 | 210frame×2。全編を作り直さない |
| 局所操作の独立再読 | 0.939 | 別process |

入れ子時間を加算しない。Node親の最大RSSは実走618,692,608 bytes、独立再読510,328,832 bytes。子tool RSSと親子同時ピークは未計測。開始空き23,216,254,976 bytes、保存時19,708,063,744 bytes。安全値や恒久的上限は新設していない。

今回の新領域は計測時3,482,417,970論理bytes（失敗・A再利用元・B診断・共有背景・A全編・局所操作・証拠を含む）。割当量と計測時刻はverification.json。作業中容量ピークと物理I/Oは未計測。既存7A限定guardは一般化せず、旧巨大成果物を削除して容量を作っていない。

## 初回失敗・継続・監査

- attempt-001：A307状態が完了後、B論理検査のexit 1で全体から抜けた。[初回記録](initial-layout-failure.json)とA PNGを保持。
- checkpoint `c833d076`をpushして相談役へ直接報告。相談役はA続行とB局所診断、Aを使うNormal/Reset、全体未完了の分離を指示。
- 新規接続コードだけで案ごとの不合格保存を扱い、attempt-002でA完了画像を照合して再利用。Bの論理不合格は保持し、Bの実描画・診断を行った。旧readerの制限やQC基準は変更していない。
- checkpoint `663c8c72`をpushしてGPT_DECISION。相談役はBの余白・配置・領域保証を今回は変更しないと判断し、Aと独立準備を完了する続行指示を返した。Bの追加診断・全編生成・合格扱いは行わない。
- 5対象試験では、固定82frameと音声copy、全状態から合成への対応、AのNormal/off/Reset、B不合格を全体完成へ偽装しない拒否、改ざん入力の拒否を確認。実走自体でB失敗時のA保存継続を確認した。過去の8統合準備試験・7P/13/アップ試験は既存report参照であり、新規試験数へ加算しない。

## 再現・独立確認

既存出力へ上書きしない。新しい許可領域だけを指定する。

```sh
# 今回実行した経路（再実行は新directoryが必要）
node tools/digest-quality/integrated-preview.mjs run runtime/artifacts/integrated-preview-20260930-v001/attempt-002 runtime/artifacts/integrated-preview-20260930-v001/attempt-001/A/raster.json
node tools/digest-quality/integrated-preview.mjs read-incomplete runtime/artifacts/integrated-preview-20260930-v001/attempt-002/completion.json
node tools/digest-quality/integrated-preview-operations.mjs run runtime/artifacts/integrated-preview-20260930-v001/attempt-002/completion.json runtime/artifacts/integrated-preview-20260930-v001/operations-001
node tools/digest-quality/integrated-preview-operations.mjs read runtime/artifacts/integrated-preview-20260930-v001/operations-001/completion.json
INTEGRATION_DRAFT=runtime/artifacts/integration-preparation-20260930-v001/attempt-002/draft.json node --test tools/digest-quality/integrated-preview.test.mjs
```

通常の`read`は全体未完了を拒否する。`read-incomplete`はAと不合格証拠を照合して未完了のまま返す。完了への変換や画像欠損の無視を行わない。

## 完了条件の照合と次の1件

1. A/B全編：A完了、B未完了。**工事全体は未完了**。
2. 全字幕：A/B307状態ずつ実描画、A合格、B論理21件不合格を保存。
3. 保存/独立再読/Normal/off/Reset/旧成果不変：Aと局所操作で確認済み。
4. 人間確認蓄積：既存台帳・固定テンプレートへ登録。既存回答を保持、即時依頼0件。
5. 1080p入力と手順：棚卸し完了、不足3件を明記。全編実走・最終QCは未実施。
6. Gitと直接報告：今回ファイルだけをmainへcommit・通常pushし、この報告とNEXT_REQUESTを新しいZEV Build Loopへ直接送る。送信前には報告済みと扱わない。

次の提案は「元解像度の保存入力から最終描画・QCへ接続する限定準備」。既存540pのguardを解除せず、保存されたsource時計と描画判断を守る最終用入口の対象ファイル・入力・短区間試験を具体化する。1080p全編やBの保証修正は開始せず、相談役の次の限定指示に従う。

## Bの実画素診断

[307状態の診断](b-raster-diagnosis.json)では、論理レイアウトの21件以外に実alphaの領域違反は0。切れた画像のalphaだけでは不足するため、21件とも入力の論理canvas・本文・位置・縁・フォントを固定し、Remotionの出力viewportのみ右へ拡張した。

[拡張viewport診断](b-viewport-diagnosis.json)：元960×540領域のRGBAは全byte一致、拡張した右側の非透明画素は全21件で0。SVGは既存実装でoverflow visible。これは画面右端のclipping診断であり、論理検査の免除・B合格・人間採用ではない。Bの全編合成は行わない。

既存のレイアウトは字幅、縁と外周、余白を含む枠で検査し、Bの該当字幕は枠幅1924px、safe area内幅1912px。今の本文・144px・位置・縁8/12をすべて固定したまま、この枠が収まるとは報告できない。文字や余白・配置・検査の保証へ変更が必要なら相談役判断に戻す。

診断の初回はpnpmのシンボリックパスからbundler依存を解決できず未実行。既存sessionと同じCLI実体から解決するよう検査スクリプトだけを修正した。失敗ログを保持、新依存追加0。

## 1080pへの引継ぎ（実行なし）

[入力・時刻対応・実装入口と不足](final-output-inputs.json)を保存。元1920×1080/60fps動画のSHAを実体照合。保存STT・採否・5保持区間・元時計・接続24frame・265字幕・307状態・18 Colorの設定を再利用する。

1. 人間選択は未回答のまま保管する。最終生成承認時に選択した縁を明示し、本文・改行・時計・色・motion・Panelを固定する。
2. 元動画から保存5区間を1920×1080/30fpsで製造する。既存540p専用の背景製造器のguardは解除しない。保存した元音声sample対応と補正済み音声処理を使う。
3. 保存projectionのsoft/black接続24frameを含め17,613frameへ結び付ける。既存540p NUTを拡大しない。
4. 000119の82frameだけ元解像度で同じcropの比率・時計を適用する必要がある。新規なcrop位置を判断しない。今回は入力と手順の整理のみ。
5. 最終縁・2色による307状態を1080pで実描画し、従来の領域・動き・Panel・文字欠けを検査する。540p PNGを拡大しない。
6. 元解像度背景→字幕合成→全編媒体/音声/時計→必須full replay→native全比較→共有証拠・正常点整理→最終QC→別process再読、の既存検査意味を維持する。今回の540p検証をその合格証拠にしない。

不足は7B元解像度背景、統合307状態の1080p PNG、統合入力と最終QC/保存を束縛する実行receipt。これらは未製造・未接続であり、実行可能な最終job完成とは扱わない。元解像度資産不足を540pの拡大で埋めず、次の限定指示へ渡す。
