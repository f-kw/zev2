# 工程I：字幕表現の拡張 — 作業・引継ぎ記録

開始日: 2026-09-18（日本時間）。状態: **工程Iの候補動画と技術検証が完了。監査用checkpointのcommit／pushと読戻しを続けて行う。** 人間の採用・視聴品質の判定とは分ける。

## 最優先方針と今回の範囲

当面の第一優先は、静的外観と短い動きを一体で広げ、既存Panel／Pulseを並行整理する工程Iである。次は工程IIの接続表現、工程IIIの全体配置、工程IVの後修正操作の順とする。今回の着工は工程Iだけ。

- [受領した実装指示書v001](digest-caption-expression-stage1-sources-20260918/implementation-instructions-v001.md): 21,672 bytes、SHA-256 `b6a9de467cd8af8691cb2b01bd748e9c7781cd45290bce90bcf79bf07887a3b3`。
- [上位計画v001](digest-caption-expression-stage1-sources-20260918/parent-plan-v001.md): 28,997 bytes、SHA-256 `29b827089bb624590b073e55fd645c925d6c6137f69d04aa01c29444c141452c`。[Drive正本](https://drive.google.com/file/d/1pWMYQ4t3Rp-TAlRRhNyj5YRKSDt4eJsV/view)を全文取得し、指示書に記されたサイズ・SHAと一致確認した。

両資料を全文読んだ。これらは今回受領した指示と計画の内容を保存した参照資料であり、正式Goal・DECISIONS・既存契約の定義を書き換えるものではない。

目的は新しい見せ方が実際に入った候補動画1本を出すことである。資料整理や部品の試作だけで終わらせず、固定案・一件修正・Reset・既存自動選択・共通描画・必要なQCまでつなぐ。微差の個別採点を途中の必須条件にしない。黒の再確認、全11接続の人間観測、接続だけの大規模統合は今回の先行条件へ戻さない。

## 作業系統と既存作業の保護

- branch: `codex/digest-caption-expression-stage1`
- base: `43a9382bdac0dd2881777f2cd442c21158173da9`
- このbaseはColor／Scale、Panel、Pulse、訂正版の高速QC、一件後修正E2Eの受理済み系統を含む。直前のQC実装`9d9e48b75a8c683d4103e0ed9edfb3744f89c708`からの差分は報告2件で、実装は同じ。後続のNormal・trust調査や接続研究にも字幕演出の本番実装差分はない。
- 作業tree: `/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/worktree`
- 元workspaceのHEADは`43380006bc4f8e1c902c067dcb53669790b6ce2c`、branchは`codex/digest-effects-step2`。追跡差分1件、staged差分0、未追跡一覧59,153件を開始時に保存した。本文を変更しない。
- 開始時のHEAD・branch・追跡差分・staged差分・全未追跡一覧の保存先: `/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/original-tree-baseline.json`。この件数は既存状態の観測であり、新しい運用上限ではない。

2026-09-18 00:59:01（日本時間）に、元workspaceのHEAD・branch・追跡差分・staged差分・未追跡一覧を開始記録と再照合し、全5記録のbyte数・SHA-256一致を確認した。未追跡ファイルの本文全件をhashしたという意味ではなく、元の未追跡一覧が同じであることを確認した。[元作業treeの保全記録](/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/original-tree-preservation-v001/verification.json)。

既存の保存資料と媒体を不変入力として再利用する。特定job用のtrust snapshotを流用せず、正式trust再発行・正式renderer版変更・main merge・tag・stable・releaseは行わない。

## 実装と検証の順序

1. 落ち着いた別外観、出現時に一度弾む表現、拡大以外の短い動きを、既存部品との重複を避けて具体化する。
2. 有限の外観・状態・時間をpreset側へ固定し、各状態の実画素、安全域、安定表示、復帰を小型fixtureで検証する。
3. 保存・一件override・Normal固定・Reset・自動判断入力を同じ経路で更新する。旧固定自動案は保存したまま、新判断を別版へ固定する。
4. 既存の全32字幕と文脈・保存音声観測から自動判断し、161.033秒・4,831frameの候補動画1本を共通描画へ通す。開発者による手配置を自動出力と呼ばない。
5. 内容・元時計・音声・他対象の保全、新表現の画素と動作、故障拒否を確認し、変更と証拠をcommit／pushする。同じZEV Build Loop会話へAUDIT_ONLYと次工程の指示を求める。

## 実装した見せ方と既存能力の再利用

落ち着いて読ませる別外観は、既存Panelの明るい不透明な板と黒い文字を再利用した。新しく作ったのは、字幕出現時に一度弾むBounceと、左右へ短く揺れて元の位置に戻るShakeである。三方向をこの三案で具体化し、表現全体を見送った候補はない。特定字幕で使えない条件は別に記録した。

| 表現 | 有限の動きと安定状態 | 必要な元字幕期間 |
|---|---|---|
| Bounce（仮称） | 表示開始から2frameずつ88→104→112→104px。8frame後から元の96pxに戻る | 20frame以上 |
| Shake（仮称） | 96pxのまま2frameずつ横方向へ−12→＋12→−8→＋8→−4→＋4px。12frame後から元の位置に戻る | 24frame以上 |

どちらも30fpsの字幕表示開始を基準とする。精密な発声開始を推定していない。動作後に、開始fadeが完了した安定表示8frameと終了fade4frameを確保する。開始・終了fadeは元字幕に一度だけ適用し、状態ごとに重ねない。中央の基準位置と保存済みの縦位置へ復帰する。

管理済みの書体・輪郭・発光・字幕部品から各状態の原寸画像を作り、既存共通rendererで合成する。一字幕一選択を維持し、自由な動作編集や任意の重ね合わせは追加していない。AIは有限名称と全文指定だけを選び、文字サイズ・変位・時刻・状態列を決めない。保存規則はv007、AI判断形式はv005へ更新した。旧版を黙って読み替える処理はなく、過去の固定自動案を上書きしていない。

Colorの原文完全一致・連続部分範囲・書記素境界・カラー字形保持、Scaleの全表示期間拡大、Pulseの実測した局所頂点への結び付けは保持した。Pulseの再実装やPanelの作り直しは行っていない。用途・適用条件・版・採用状態の詳細は[表現一覧](digest-caption-expression-catalogue-20260918.md)を参照。

## 固定入力と新しい自動判断

対象は既存の1920×1080・30fps・4,831frame（161.033…秒）・32字幕のDigest。本文、改行、字幕区間、順序、元動画対応を保持した通常計画を、新しい判断用に同一byteで保存した。全32字幕の文脈と、利用許可済みの保存音声観測から得た27候補を既存の判断経路へ渡した。追加の音声解析・有料API・外部素材送信は行っていない。

字幕なし基礎媒体は既存の `internal-edit-v001/base-media/base-media.mp4`。SHA-256は `8c36b25a30e8acf5ac97475646092adeca5336d1c9a447dc9f2ffd0f7fd5ce2d`。判断用の音声観測に結び付く字幕付き動画は、合成背景へ使っていない。

| 固定入力 | SHA-256 |
|---|---|
| 通常計画 | `9a4550ee0f9d3ccaf7ddedac26ed5af8af2bf64e23c505f082830b9031c3311e` |
| 新しい判断と根拠の保存 | `ede1bf8678a10a69ab7466e6a6e2eaaea51319fd7dd7191b9691d8f724e1750f` |
| 検証後の固定自動案 | `1392edbad1ac7063aecbccb60b2bb0da245e4d64eb512134c7e79f165381bb7e` |

実フォントによる全状態の配置検査で、Panelは32字幕、Scale／Pulseの幾何条件は23字幕、Bounceは26字幕、Shakeは29字幕で成立した。Pulseには別途、元の表示期間に実測頂点と前後の復帰が収まる条件を課す。これは使用件数の目標ではない。短い字幕、安全域超過、行の衝突、所定の変位を失う位置補正を、本文変更・縮小・再改行・時間延長で救済しない。

新しい判断は現行Codexの独立判断を既存stdin入口へ渡したもの。旧割当の転記、役割の手配置、候補動画への人間修正は行っていない。

| 32字幕の判断 | 件数 |
|---|---:|
| 通常表示を選択 | 11 |
| Color | 13 |
| Panel | 2 |
| Bounce | 1 |
| Shake | 2 |
| 表現不能 | 1 |
| 未解決 | 2 |

選択は18件。Scale／Pulseは今回の案では0件であり、未実装を意味しない。表現不能1件と未解決2件は、通常表示を選んだ11件へ合算していない。音声27候補は選択17・未解決10で、字幕との対応がない候補も省略していない。構造・根拠対応の検証通過を、自動選択品質や人間評価の合格として扱わない。

| 新表現を割り当てた字幕番号 | 本文 | 表現 | 固定表示frame（終了端を含まない） | 秒位置の参考値 |
|---|---|---|---|---|
| 4 | もうリカちゃんやめてー! | Shake | 71〜154 | 2.367〜5.133秒 |
| 11 | 逃げるんだ | Bounce | 544〜614 | 18.133〜20.467秒 |
| 15 | どこ? | Shake | 2673〜2708 | 89.100〜90.267秒 |

この表は固定案での割当であり、全編候補の実画素にも反映されたことを確認した。選択理由は本文・前後の意味に基づき、低い声確率から叫びや恐怖、音の起源を確定していない。

根拠: [32字幕の準備記録](/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/inputs-v001/preparation.json)、[新判断の検証結果](/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/judgment-v001/validation.json)、[全字幕・全候補への回答](/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/judgment-v001/result.json)。

## 小型実証と回帰確認

結果の件数・入力と出力の結び付き・実故障・元tree保全・全編候補の完成結果を、[軽量な機械検証記録](digest-caption-expression-stage1-evidence-20260918.json)へまとめた。生動画・PNG・巨大なJSONはpathとhashで参照する。

既存Node 20.19.6と保存済み依存を使用した。次の件数は検査の実行単位であり、製品の品質点数ではない。

| 確認対象 | 結果 | 確認した処理 |
|---|---:|---|
| 保存・一件修正・部分Color・Pulse・新表現・CLI | 268件通過 | 未知ID、旧版、任意描画値、重複、不正範囲の拒否。再読とReset、他対象と固定入力の保持 |
| AI判断の構造と根拠 | 96件通過 | 全字幕・全候補の順序と網羅、部分Color、正確なPulse頂点、新表現の独立した適用不能、旧応答拒否 |
| 既存Panelと部分Colorの実描画 | 23件通過 | 不透明な板、カラー字形、原文範囲、安全域、行衝突、NormalとResetの回帰 |
| 保存から共通rendererへの回帰 | 6件通過 | 保存入力の検証、共通描画への受渡し、既存経路の保全 |
| 新しい有限動作と既存Pulse | 12件通過 | 固定状態・期間・復帰・位置、短期間の拒否、実合成の回帰 |
| 全編一致・有限状態・描画後検査 | 68件通過 | 入力と実行証拠の結び付き、未知状態や不正な検査記録の拒否 |
| 共有型のbuild・実行側・Remotionの型検査 | 3系統通過 | 型の整合 |
| 新表現の小型実描画 | 1シナリオ通過 | 24観測frameと6本の実故障動画を確認 |

小型動画は、合成背景・合成音声に二つの字幕を置いた60frameの技術fixtureである。自動割当の品質評価用動画ではない。Bounceは動作中の全8frameと復帰・安定の2frame、Shakeは動作中の全12frameと復帰・安定の2frame、計24frameを観測した。描画状態数はBounceが4、Shakeが7であり、「24種類の状態」ではない。各安定状態の画像は、元のNormal画像とbyte一致した。

実故障は各表現について「動かない」「2frame遅れる」「元に戻らない」の3種、計6本を合成した。6本すべてで、指定frameの状態識別と全編一致検査の双方が拒否した。実際に異なる映像frameを確認し、処理自体の失敗を故障検出成功へ数えていない。これとは別に、拡大状態だけの安全域超過、二行の衝突、位置補正で左右移動を失う条件を拒否した。

保存担当の記録ではPanel／部分Colorの実描画が未実行とされているが、その後、別の描画回帰として上記23件を実行済みである。検査時点を混同しない。

証拠: [保存・AI・型検査記録](/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/storage-selection-verification-v001/verification.json)、[既存描画23件](/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/existing-raster-regression-v001.tap)、[描画接続6件](/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/auto-renderer-regression-v001.tap)、[動作とPulseの12件](/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/motion-pulse-regression-node20-v001.tap)、[QCの68件](/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/qc-owned-tests-node20-v001.tap)、[native試験終了記録](/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/motion-native-v002.tap)、[実frameと6故障の測定記録](/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/motion-native-v002/measurement.json)。

## 実32字幕での一件修正と復元

新しい固定自動案を入力に、既存CLIを別processとして6回実行し、保存した人修正を毎回読み直した。

| 対象 | 元の自動選択 | 実行した変更 | Reset後 |
|---|---|---|---|
| 字幕4「もうリカちゃんやめてー!」 | Shake | Bounce → Normal → Reset | 元のShakeと自動由来へ復元 |
| 字幕11「逃げるんだ」 | Bounce | Shake → Normal → Reset | 元のBounceと自動由来へ復元 |

各段階で他31字幕の描画計画と選択状態、固定通常計画・判断根拠・固定自動案のbyteを保った。Resetは対象の人修正を削除し、保存済み自動案から全体計画を復元する。再判断していない。検査用の6修正ファイルを候補動画へ渡していない。

この検査の再実行helperは、新しい証拠directory、通常計画、判断根拠、固定自動案の4引数だけを受ける。特定の一時pathや準備記録に依存せず、元自動案で反対側の動きが選ばれ、両有限動作の時間・通常入力条件を満たす字幕を選ぶ。描画は行わないため、このCLI試験単体を修正動画の完成実証とはしない。

再現用source: [実字幕のCLI復元確認](../../evals/clip_composition/caption_expression_stage1_edit_check_v001.mjs)。結果: [v003完了記録](/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/real-caption-edit-check-v003/completion.json)（SHA-256 `4a0c0cf6f4a6e6cd5f6b47f596f7688e2f6f38d26ea74ea2f121c7d3d624e2b9`）。途中で生成した6修正ファイルと6出力記録も、後続操作終了後に保存時hashへ再照合した。[追加のbyte照合](/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/real-caption-edit-check-v003/artifact-integrity.json)。

## 失敗を含む実行記録

### 小型native試験の幅条件

最初の試験では、18文字の通常状態が既に安全域を越えており、「通常は収まり、最大拡大だけ収まらない」という故障fixtureの前提が成立しなかった。失敗した配置と記録を保存し、17文字で通常は収まり最大状態は越えることを独立計測した後、別の試行v002を実行した。productionの描画、安全域の判定、合格期待値を緩めた修正ではない。

[最初の不成立記録](/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/motion-native-v001/attempt-result.json)、[置換fixtureの独立計測](/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/motion-geometry-recheck-v001/result.json)、[修正後のnative通過](/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/motion-native-v002.tap)。

### 全編候補の出力path表記

候補v001は描画前の出力先検査で拒否された。worktreeの実体は `/private/var/…` である一方、指定した出力先が `/var/…` 表記だったため、既存の安全な出力先条件と一致しなかった。初回の失敗記録を保持し、実体と一致するpath表記で別の候補v002を開始した。出力先の安全検査を外していない。v001を完成動画の失敗や成功として数えず、描画着手前の設営不成立として区別する。

[候補v001の拒否記録](/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/candidate-v001/failure.json)、[候補v002の開始記録](/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/candidate-v002/start.json)。

保存・AI検査の初期試行では、役割名を短縮したエラー文と既存の期待文の不一致を直して全対象を再実行した。TypeScript実行器の補助socketがsandboxで拒否された試行は、同じ導入済みloaderを既存Nodeから使う形へ変更した。詳細は保存・AI検査記録に残し、最終通過結果とは区別する。

## 主要な再現コマンド

実行記録の引数を、共通pathだけ短く表記した。実行directoryはこの専用worktree。出力directoryはすべて新規作成を要求するため、保存済みの同名出力へ再実行しない。再試行時は出力名を新しくし、AI応答も新しい要求のSHAへ結び付ける。既存Node 20.19.6と導入済みtsx loaderを使い、依存取得・外部APIは実行しない。

```sh
STAGE1_NODE_BIN=/Users/kawafmm/.nvm/versions/node/v20.19.6/bin
STAGE1_NODE="$STAGE1_NODE_BIN/node"
STAGE1_ROOT=/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_
cd "$STAGE1_ROOT/worktree"
STAGE1_REAL_TREE=$(pwd -P)
STAGE1_CODE=evals/clip_composition
STAGE1_LOADER=./runner/node_modules/tsx/dist/loader.mjs
STAGE1_OLD_INPUT=/private/tmp/zev-pulse-accent-fswa9cuw/inputs/horror
STAGE1_AUDIO=/private/tmp/zev-vocal-accent-6mnpszdq/audio-probe/run-v001/horror/audio-candidates.json
STAGE1_MEDIA=/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/presentation/work-digest-caption-sync-internal-edit-20260907-v001/internal-edit-v001/base-media/base-media.mp4
```

### 入力準備・新判断・候補・実字幕の修正検査

```sh
# 固定本文と文脈を保持して、有限表現の実配置条件を測定
 env -u NODE_OPTIONS NODE_PATH=./runner/node_modules TSX_DISABLE_CACHE=1 \
  "$STAGE1_NODE" --import "$STAGE1_LOADER" \
  "$STAGE1_CODE/caption_expression_stage1_prepare_v001.mts" \
  "$STAGE1_ROOT/inputs-v001" "$STAGE1_OLD_INPUT/normal-plan.json" "$STAGE1_OLD_INPUT/context.json"

# 新しい要求を保存してstdinのAI応答を待つ既存入口
 env -u NODE_OPTIONS PATH="$STAGE1_NODE_BIN:$PATH" \
  NODE_PATH="$STAGE1_REAL_TREE/runner/node_modules" TSX_DISABLE_CACHE=1 \
  "$STAGE1_NODE" --import "$STAGE1_LOADER" \
  "$STAGE1_CODE/presentation_focus_selection_v001.mts" \
  "$STAGE1_ROOT/inputs-v001/normal-plan.json" "$STAGE1_ROOT/inputs-v001/context.json" \
  "$STAGE1_AUDIO" "$STAGE1_ROOT/judgment-v001"

# 固定自動案からの全編候補。出力先はworktreeの実体pathに限定
 env -u NODE_OPTIONS PATH="$STAGE1_NODE_BIN:/opt/homebrew/bin:/usr/bin:/bin" \
  NODE_PATH=./runner/node_modules TSX_DISABLE_CACHE=1 \
  "$STAGE1_NODE" "$STAGE1_CODE/caption_expression_stage1_candidate_v001.mjs" \
  "$STAGE1_ROOT/candidate-v002" \
  "$STAGE1_REAL_TREE/$STAGE1_CODE/outputs/presentation/stage1-caption-expression-20260918-v001/render-v002" \
  "$STAGE1_ROOT/inputs-v001/normal-plan.json" "$STAGE1_ROOT/judgment-v001/decision-input.json" \
  "$STAGE1_ROOT/judgment-v001/fixed-auto.json" "$STAGE1_MEDIA"

# 実自動Shake／Bounceを、一件変更→Normal→Resetする6操作
"$STAGE1_NODE" "$STAGE1_CODE/caption_expression_stage1_edit_check_v001.mjs" \
  "$STAGE1_ROOT/real-caption-edit-check-v003" "$STAGE1_ROOT/inputs-v001/normal-plan.json" \
  "$STAGE1_ROOT/judgment-v001/decision-input.json" "$STAGE1_ROOT/judgment-v001/fixed-auto.json"
```

AI実行時は、要求保存を待って現行Codexが全32字幕・全27音声候補への応答を作成した。応答を意味変更せず1行JSONへ直列化し、末尾改行を付けて同processのstdinへ一度だけ渡した。上のAI commandだけでは自動応答は生成されない。旧応答の再利用やAPI呼出しを隠した短縮表記ではない。[起動argvと作業directory](/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/judgment-start-v001.json)、[応答と送信行のhash・一回送信・終了code](/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/judgment-transport-v001.json)を保存した。候補生成の標準出力・標準エラーは`candidate-v002.log`へ保存した。

### 対象回帰と型検査

以下は実行した主要対象の引数。波括弧は同じdirectory内の列挙したfileへ展開するshellの短縮表記であり、対象を追加するwildcardではない。他の動作・QC・native試験については上記のTAPと機械検証記録を正本とする。

```sh
# 保存・CLIの268件
"$STAGE1_NODE" --test \
  "$STAGE1_CODE"/presentation_auto_effects_{v001,io_v001,partial_v001,pulse_v001,motion_v001}.test.mjs \
  "$STAGE1_CODE/edit_auto_presentation_v001.test.mjs"

# AI判断の96件
TSX_DISABLE_CACHE=1 "$STAGE1_NODE" --import "$STAGE1_LOADER" --test \
  "$STAGE1_CODE/presentation_focus_selection_v001.test.mts"

# 既存実描画の23件
 env -u NODE_OPTIONS PATH="$STAGE1_NODE_BIN:/opt/homebrew/bin:/usr/bin:/bin" \
  ZEV_PANEL_QC_OUTPUT="$STAGE1_ROOT/panel-regression-v001" \
  ZEV_SPAN_QC_OUTPUT="$STAGE1_ROOT/span-regression-v001" \
  "$STAGE1_NODE" --test --test-concurrency=1 \
  "$STAGE1_CODE"/presentation_auto_effects_{panel,span}_v001.test.mjs

# 保存から共通描画への6件
 env -u NODE_OPTIONS NODE_PATH=./runner/node_modules TSX_DISABLE_CACHE=1 \
  "$STAGE1_NODE" --import "$STAGE1_LOADER" --test \
  "$STAGE1_CODE/presentation_auto_effects_renderer_v001.test.mjs"

# 共有型buildと実行側・Remotionの型検査
"$STAGE1_NODE" packages/shared/node_modules/typescript/bin/tsc -p packages/shared/tsconfig.json
"$STAGE1_NODE" runner/node_modules/typescript/bin/tsc -p runner/tsconfig.json --noEmit
"$STAGE1_NODE" runner/node_modules/typescript/bin/tsc -p runner/tsconfig.remotion.json
```

## 全編候補の完成結果

**候補v002は2026-09-18 01:22:41（日本時間）に完了し、実行終了code 0、最終QC通過。** 人間向けに提出する新しい全編候補はこの1本である。

- [候補動画](/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/worktree/evals/clip_composition/outputs/presentation/stage1-caption-expression-20260918-v001/render-v002/presentation-rendered-v002.mp4)
- SHA-256: `36f3863fdd3c3c601459d5b5547e1a7c3df014dd8b026c3570c31d176a3e405b`。75,378,768 bytes。
- 完成動画: 1920×1080、30fps、4,831frame、161.033秒、AAC・44,100Hz・stereo。
- [開始・描画・確定後の照合を含む完了記録](/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/candidate-v002/completion.json)。巨大な原記録はGitへ入れず、軽量証拠に内容hashを保存する。

| 検査 | 実際に確認したこと |
|---|---|
| 指示適用・配置・可視性・媒体 | 全32字幕について最終QC通過、違反0。47枚の有限状態PNGを使用 |
| 全編再現との一致 | 同じ固定入力・描画指示で1回再encodeしたMP4と、完成MP4が全byte一致。両者4,831frameと時計情報も一致 |
| 完成動画の有限状態 | 32字幕に対応する67frame観測が期待状態を識別。新表現はShakeの字幕4・15で各14観測、Bounceの字幕11で10観測、残る29字幕は各1観測 |
| 新表現の実反映 | 上記3字幕の出現から動作全frame、安定状態・復帰を確認。通常字幕だけの動画を成功扱いしていない |
| 本文・改行・字幕区間・元対応・他指定 | 実効計画から選択された外観・動作だけを戻すと、元の通常計画全体と完全一致。元入力そのものも変更なし |
| 音声 | 元媒体と完成動画の圧縮音声packet内容のSHA-256が一致: `475233b0648161e3014ef52ffa1d7f4400b8dca1b0dc66214a2d66af9cd1b56e` |
| 検査対象と提出動画の一致 | 検査に結び付いた作業中MP4と、出力先へ確定したMP4のサイズ・SHAが一致。全編再現と有限状態検査の双方が同じ完成動画へ結び付く |
| 固定入力と実装 | 入力7参照と実装・実行環境24参照を完了時にも再hashし、開始記録と一致 |

全編一致は今回、MP4全体のbyte一致で成立した。別途全frameをdecodeして比較した件数や、音声packetを比較した件数を創作していない。有限状態の識別だけで未知の動画を保証せず、全編一致と組み合わせた結果である。

総所要時間は2,170.473秒（約36分10秒）。全編再現検査548.422秒、有限状態の事前準備71.763秒、状態検査実行761.072秒。状態検査は元媒体67frame・完成動画67frameを取り出し、期待・省略・別状態等の参照画像6,181枚と照合した。参照画像数を独立した動画frame数や品質点数と数えない。

実証範囲は、許可された共通rendererの開発入口での候補生成である。通常のfile入口からの正式受入、正式trust再発行、Normalの再認定を実証したことにはしない。過去job限定のtrust snapshotは使っていない。小型故障検査と完成動画の検査を分け、全字幕ごとの全編反実仮想再encodeは行わない。

## 八つの完成条件との対応

| 指示書§12 | 根拠と到達点 | 判定 |
|---|---|---|
| 1. 三方向を具体化し、新しい見せ方を実描画 | Panel再利用、Bounce／Shake新規実装。小型・全編候補で両動作を確認 | 確認済み |
| 2. 有限presetとAIの自由描画値禁止 | 2表現の固定状態・時間、保存v007／判断v005、未知値・任意値の拒否 | 確認済み |
| 3. 内容・時計・元対応を保ち、意図した変更を分離 | 同一通常計画の保存、実CLIの他31字幕不変、全編の計画・音声・frame保全 | 確認済み |
| 4. 固定案・一件修正・Resetへ接続 | 実自動Shake／Bounceから他方へ変更し、Normal経由で元の自動動作へ復元 | 確認済み |
| 5. 小型実frame・故障注入・関係する既存回帰 | 24観測frame、6本の実故障拒否、対象回帰・型検査 | 確認済み |
| 6. 自動判断と共通描画を経た候補1本をQC付き提出 | 新判断を別版へ固定。新表現3箇所を含む候補v002と全編・67frameの検査通過 | 確認済み |
| 7. 表現一覧と技術・採用・品質状態の区別 | 表現一覧、既存採用と技術試用の区別、小型と全編の出力参照 | 確認済み |
| 8. 指示・実装・試験・報告を選別してcommit／push、読戻しと旧作業保全 | 専用branch、対象37ファイル確定、元treeの5記録は開始時と一致 | **checkpoint・remote読戻しは保留** |

## 出力例、採用状態と未検証事項

新表現の小型出力は上記native測定記録の60frame動画と各状態画像を参照。実測動画のSHA-256は `2c3aee9c7ffc27b939b697631de3df8a31b6a4fb2f6bd6442e6afb1c319d6dcd`。手指定した技術fixtureであり、人間向けの候補を追加提出する目的ではない。

既存能力の出力例と成立範囲は、[Panelの報告](auto-effects-visual-variation-20260917.md)、[Pulseの報告](auto-effects-pulse-accent-20260917.md)、[Color／Scaleと音声候補の報告](auto-effects-vocal-accent-20260916.md)を参照する。過去報告中の旧名称・旧版は当時の記録として保持する。

Color／Scaleの人間採用は上位計画の既存記録を維持した。Panel／Pulse／Bounce／Shakeは技術試用で、正式名称・デザイン採用、人間視聴、今回の自動選択品質、通常版に対する優位、一般視聴者への効果は未評価である。技術通過からこれらを推定しない。

候補完成までの作業では、新素材・書体・依存取得、有料API、新たな外部素材送信は行っていない。技術試験の費用記録は0米ドル。正式trust・契約・Goal・DECISIONS・main merge・tag・stable・releaseを変更していない。

## checkpointと次工程 — 保留

- branch: `codex/digest-caption-expression-stage1`
- base: `43a9382bdac0dd2881777f2cd442c21158173da9`
- checkpoint SHA／compare: **保留。対象は下記37ファイルへ固定した。**
- remote読戻し: **保留。** 元workspaceは上記の保全記録でHEAD・branch・追跡差分・staged差分・未追跡一覧の一致を確認済み。
- 同じ相談役会話へのAUDIT_ONLYと監査結果: **保留。動画・巨大な生証拠は送信せず、まとまった報告を一回送る。**

### 選別したcheckpoint対象37ファイル

受領資料・表現一覧・この報告・軽量検証記録、実装、試験、再現helperを対象とする。候補動画、状態画像、巨大な生証拠、依存へのsymlinkを含めない。以下は対象一覧であり、commit／push完了の記録ではない。

```text
docs/reports/digest-caption-expression-catalogue-20260918.md
docs/reports/digest-caption-expression-stage1-20260918.md
docs/reports/digest-caption-expression-stage1-evidence-20260918.json
docs/reports/digest-caption-expression-stage1-sources-20260918/implementation-instructions-v001.md
docs/reports/digest-caption-expression-stage1-sources-20260918/parent-plan-v001.md
evals/clip_composition/caption_expression_stage1_candidate_v001.mjs
evals/clip_composition/caption_expression_stage1_edit_check_v001.mjs
evals/clip_composition/caption_expression_stage1_prepare_v001.mts
evals/clip_composition/edit_auto_presentation_v001.mjs
evals/clip_composition/edit_auto_presentation_v001.test.mjs
evals/clip_composition/presentation_auto_effects_io_v001.mjs
evals/clip_composition/presentation_auto_effects_io_v001.test.mjs
evals/clip_composition/presentation_auto_effects_motion_v001.test.mjs
evals/clip_composition/presentation_auto_effects_panel_v001.test.mjs
evals/clip_composition/presentation_auto_effects_partial_v001.test.mjs
evals/clip_composition/presentation_auto_effects_pulse_v001.test.mjs
evals/clip_composition/presentation_auto_effects_renderer_v001.test.mjs
evals/clip_composition/presentation_auto_effects_span_v001.test.mjs
evals/clip_composition/presentation_auto_effects_v001.mjs
evals/clip_composition/presentation_auto_effects_v001.test.mjs
evals/clip_composition/presentation_caption_motion_renderer_native_v001.test.mjs
evals/clip_composition/presentation_caption_motion_renderer_v001.test.mjs
evals/clip_composition/presentation_caption_motion_v001.mjs
evals/clip_composition/presentation_caption_motion_v001.test.mjs
evals/clip_composition/presentation_exact_replay_qc_v001.mjs
evals/clip_composition/presentation_exact_replay_qc_v001.test.mjs
evals/clip_composition/presentation_focus_selection_v001.mts
evals/clip_composition/presentation_focus_selection_v001.test.mts
evals/clip_composition/presentation_native_frame_qc_preparation_v001.mjs
evals/clip_composition/presentation_native_frame_qc_preparation_v001.test.mjs
evals/clip_composition/presentation_native_frame_qc_v001.mjs
evals/clip_composition/presentation_native_frame_qc_v001.test.mjs
evals/clip_composition/presentation_renderer_qc_v002.mjs
evals/clip_composition/prompts/presentation_focus_selection_v001.md
evals/clip_composition/render_presentation_v002.mjs
packages/shared/src/auto-presentation.ts
runner/src/skills/presentation-focus-selection-v001.ts
```

工程Iの監査後、計画上の次は工程II「D：接続表現の拡張」である。次の指示書で着工範囲を切り出すまでは開始しない。黒の再確認、全11接続の人間採点、ショート移行へ主作業を戻さない。
