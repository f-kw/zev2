# 工程II：接続表現の拡張 — 作業・引継ぎ記録

**状態：工程IIの小型技術検証が完了。** 3実接続のフェード、窓外画素・保持PCM・字幕時計、保存とReset、4種類の実故障拒否、25.2秒の候補MP4を確認した。[軽量証拠](digest-connection-expression-stage2-evidence-20260918.json)に実測と原記録のSHAを保存する。commit／push・remote読戻し・相談役監査の記録は、この技術結果を固定してから追記する。人間品質や通常file入口の正式受入は未評価・未完了のままである。

## 1. 目的と現在位置

通常カット・採用済みの12frame黒へ、短いフェードで黒を経由する接続能力を一種類追加し、工程III「許容される表現の全体使い分け」へ渡す。仮称はSoft Separator。同じ「区切る」役割に、既存黒とは異なる有限な見せ方を加える。

工程Iの字幕表現・保存・QCを保持し、既存接続部品へ小さな専用入口を追加した。今回の到達範囲は、有限仕様、保存と一件変更・Reset、既存3短尺の描画、独立した全画素／PCM／時計検査、候補1本、証拠と報告。全体の自動選択、正式job受入、通常rendererの認定は後続事項として残す。

| 項目 | 記録 |
|---|---|
| 実装指示 | [工程II指示書v001](digest-connection-expression-stage2-sources-20260918/work-order-v001.md) |
| 上位計画 | [表現拡張・自動配置・後修正の開発計画v001](digest-connection-expression-stage2-sources-20260918/parent-plan-v001.md) |
| 指示・参照の来歴 | [保存path・byte数・SHA](digest-connection-expression-stage2-sources-20260918/provenance-v001.json) |
| 作業branch | `codex/digest-connection-expression-stage2` |
| 開始base | `29d7863b2e5f6aebc71b20310c50e742ae136e9e` |
| baseの内容 | 工程Iの相談役受理結果と工程II指示書の参照を保存したcommit。工程I監査対象 `93a8a551a625f50b4d2c7c64ab13af5ca384ba5d` を含む |
| 作業tree | `/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-connection-stage2-r7ddhyxp/worktree` |
| 実装・監査checkpoint | **未記録：commit後に追記** |
| compare・remote読戻し | **未記録：pushと読戻し後に追記** |
| 総合結果 | 技術検証合格。正常中間物7件、意図した画素故障4件、最終756frameの媒体QCを確認 |

## 2. 追加した処理と参照一覧

既存の接続解決・映像音声連結部品を変更せず、有限presetの受入、原案と変更指定の分離、黒spanに対応する前後フェードの描画を追加する。通常カットと既存黒の計算、字幕の等量移動は既存部品を呼ぶ。任意の長さ・係数・曲線・filter式を入力する仕組みは追加していない。

| ファイル | 処理の意味 |
|---|---|
| [有限指定・保存・解決・描画接続](../../evals/clip_composition/connection_expression_v001.mjs) | 生byteに束縛した元入力から、許可された接続だけを解決する。原案を保持し、別保存した一件変更とResetを適用する |
| [型・保存・時計・拒否の試験](../../evals/clip_composition/connection_expression_v001.test.mjs) | 不正指定、版・SHA違い、二重移動、窓不足・重複、別接続を保ったReset等を検査する |
| [固定実入力と既存証拠の束縛](../../evals/clip_composition/connection_expression_fixture_inputs_20260918.json) | 接続1・2・11の保存短尺、元正本、時間表、字幕計画、tool、旧証拠を固定する |
| [全体時計から短尺を描画する処理](../../evals/clip_composition/connection_expression_fixture_v001.mjs) | 全325字幕と全体時計を解決し、検証済みの240frame短尺へ該当部分を投影する。原案・変更・Resetと各frameの元対応を保存する |
| [独立した媒体検査](../../evals/clip_composition/connection_expression_media_check_v001.py) | 全YUV画素を元frameと固定算術から照合し、保持PCM全量・ゼロ挿入・媒体時計を検査する。最終AACのpaddingと実復号状態を記録する |
| [実故障検査・候補梱包・最終観測](../../evals/clip_composition/connection_expression_finish_v001.py) | 四つの実故障の拒否、Reset後の全画素／PCM一致、候補1本の梱包と最終媒体検査を行う |
| [接続表現一覧](digest-connection-expression-catalogue-20260918.md) | 通常カット・既存黒・新Softの役割、外観、採用状態、適用不能、工程III残件を整理する |
| [既存字幕表現一覧](digest-caption-expression-catalogue-20260918.md) | 工程Iから保持する字幕能力と採用状態 |

再利用先は[既存接続・連結部品](../../evals/clip_composition/presentation_effects_v001.mjs)。同部品と共有型に差分はない。既存部品は接続技術baselineと同一byte（SHA `d47414ce90b40bd0d3595c0b5818291653c24ea197ed268a121f1bbea8ec05bc`）である。工程Iの字幕部品、正式契約、Goal、DECISIONS、stable tagを今回の接続実装で変更しない。最終の変更一覧と既存作業保全の照合結果は§10へ追記する。

## 3. 有限な映像仕様

| 項目 | 固定した内容 |
|---|---|
| 意味役割 | 通常カットは「通常につなぐ」。既存黒・新Softは「区切る」 |
| 許可preset | `normal-cut`、`black-separator`、`soft-separator`。各版は `v001` |
| 新Softの前窓 | 前の保持区間の末尾6frame。保持係数は順に5/5、4/5、3/5、2/5、1/5、0/5 |
| 挿入 | 元frame参照のない黒12frame。30fpsで0.4秒 |
| 新Softの後窓 | 後の保持区間の先頭6frame。保持係数は順に0/5、1/5、2/5、3/5、4/5、5/5 |
| 画素形式 | 8bit YUV420p。Y平面とU/V平面の各byteへ同じ整数算術を適用 |
| 数値上の黒 | limited rangeの黒に対応するY=16、U=128、V=128 |
| 元映像への復帰 | 前窓の最初と後窓の最後の係数5/5では、その時点の元画素を保持する |
| 音声への新しい効果 | なし。挿入分のゼロ以外は保持PCMをそのままつなぐ |

画素の計算は次の一式に固定した。係数の分子は上表の0〜5であり、品質点数・入力ごとの最適化には使わない。

```text
出力画素値 = floor((元画素値 × 係数の分子 + 黒値 × (5 − 係数の分子) + 2) / 5)
```

### 黒12frameの挿入と、完全黒14frameの区別

前後のフェードは元から保持するframeへの画素処理なので、時間は追加しない。新たに増えるのは黒の12frameだけである。前の最後の保持frameと後の最初の保持frameも係数0/5で完全黒になるため、仕様が作る連続黒はこの2frameを含む14frameとなる。元画面が周辺でも黒い場合、実観測の連続黒はさらに延び得る。実際に完全黒となったframeの一覧は、挿入数とは別に記録する。

保持frameの複製・削除・並べ替え、場面どうしの重ね合わせは行わない。窓外の全画素は可逆中間物で元frameと一致させ、窓内は所定の算術で変化させる。所定の6frame窓が元の保持区間へ収まらない、同じ保持frameへ二つの窓が重なる、挿入境界を字幕が跨ぐ場合は拒否する。

### 色域タグの証拠境界

既存の可逆短尺は色域タグが未記録／unknownである。この状態をタグからlimited rangeだと判定したことにはしない。今回固定するのは、保存済みYUV値へ作用する黒の数値16/128/128と上の算術である。full rangeからlimited rangeへの変換、入力画素の再正規化、色域タグの書換えを行わない。媒体検査は明示的なfull rangeを対象外とし、未記録のタグはその状態のまま証拠へ残す。最終候補でもcolor range・space・transfer・primariesのタグは未記録だった。数値上の黒とタグの観測を区別している。

### 焼込字幕への作用

今回の実素材には字幕が既に焼き込まれている。前後の窓では字幕画素も映像と一緒に黒へ変化する。字幕本文・元表示長・時計の保持は、字幕の画素や可読時間の不変を意味しない。この全画面処理は接続表現の作用として記録し、工程Iの字幕presetや動作処理を変更しない。

## 4. 実素材と保存済み証拠の再利用

接続技術baseline `543ec3356f5bf976a5378317c09249aac61bea0d` で、元正本の指定窓との全画素・全float32 PCM一致が確認された接続1・2・11を使う。現在の入力byteと保存済みSHAを開始前に再照合した記録を参照する。**元正本全編のdecodeと窓の一致検査は、今回再実行していない。** その部分は旧証拠の再利用であり、新フェードの画素・PCM検査とは区別する。

| 接続 | 保存済み短尺 | 元Digestのframe区間 | 接続境界 | 入力SHA-256 |
|---|---|---|---:|---|
| 1 | `/private/tmp/zev-connection-study-_ijhcn1e/observations/connection-01/baseline-lossless.nut` | [1669, 1909) | 1789 | `3cb2ff17bfa826194b7ebe0950242a27fe2e713fb362ea85cb2b68d6ec253232` |
| 2 | `/private/tmp/zev-connection-study-_ijhcn1e/observations/connection-02-v002/baseline-lossless.nut` | [6001, 6241) | 6121 | `36b66e025b3c34a553dfde96ebdfd8636fdb14ed9a10a3dc411cd0fe463a7173` |
| 11 | `/private/tmp/zev-connection-study-_ijhcn1e/observations/connection-11-v002/baseline-lossless.nut` | [26102, 26342) | 26222 | `7800f1fbe0d901117e7d4676cc2fd342f641622fcfe1799dccffe7e3fbacd8dc` |

各短尺は240frame、境界は短尺内120frame。映像は1920×1080・30fpsのFFV1/YUV420p、音声は48kHz・2chのfloat32 PCMという既存条件に限定する。工程Iの44.1kHz媒体は今回の入力ではない。

| 再利用する正本・証拠 | SHA-256 |
|---|---|
| 元の完成Digest | `665c31638dcf55af4bf1e6327f915839bbed31d905c007a6a9281e29776b8c34` |
| 元の保持時間表 | `42bd0d376648eacaba13d469dd1780a6acd330d470e1a4f2cd2fc9404252d53e` |
| 元の字幕計画 | `420bac69fb75c878a770406155171d5f09167ac22e41c1cd0c707f580229a778` |
| 旧実媒体の全量一致証拠 | `93e2509ee84c474fc3f3c4069fd13dfc8a0f835d057e83b52d8fb895d714d1c4` |

旧証拠の現物は `/private/tmp/zev-connection-study-_ijhcn1e/technical-fixtures-v001/physical-fixture-result.json`。正本・toolを含む固定pathとSHAは[実入力記録](../../evals/clip_composition/connection_expression_fixture_inputs_20260918.json)に収録する。短尺SHAだけでなく、元開始位置・境界・frame数・正本参照も旧証拠の短尺記録と一致させ、媒体と元対応が別々に差し替わらないようにする。

代表例の梱包は `56d31b71febebe124397c9015812b7077cbe6a51`、原案・別保存・Resetの意味論は `005cd82e8844405639c168e827553e6737e9a5fe` を参照した。旧branch全体や旧rendererへ戻さず、今回必要な処理と証拠だけを利用する。

## 5. 三つの時計、全325字幕、PCM

| 時計 | 今回の扱い |
|---|---|
| 元動画の時計 | 既存の元対応を参照し、保持区間・順序・元時刻を変更しない。既存の論理30fpsと入力60fps偶数frameの対応規則を確認する |
| 保持後・挿入前のDigest時計 | 接続のID・前後区間・元境界と字幕計画を固定する。元時間表は44,408frame |
| 挿入後の表示時計 | 有効な黒／Softの挿入だけを加算し、保持映像・PCM・字幕を同じ時間表へ写す |

全325字幕について、本文・改行・ID・元表示長・その他の属性を維持し、開始と終了へ同じ先行挿入量を加える検査を用意した。境界で終わる字幕は前側、境界から始まる字幕は挿入後の後側へ置く。境界を跨ぐ字幕は拒否する。実走は合格し、別担当も元字幕計画から2状態・計650行の時刻を独立に計算して一致を確認した。

接続1・2・11をSoftにした原案では、全体時計の計算結果は44,408＋36＝44,444frame。一件を通常カットへ変更し、別の一件を黒へ変更する状態では44,432frameとなる。黒の個数・長さだけでなく、隣接する前後区間と、元境界へ先行挿入量を加えた表示位置を照合する。全体の時計を解決してから、検証済み240frame窓に対応する部分だけを描画する。

音声は1映像frameにつき1,600sample/channel。各接続で19,200sample/channelの厳密なゼロを追加するため、短尺一件は384,000から403,200sample/channelになった。保持PCMの値・順序・チャンネルは全量で比較する。音声fade、音量正規化、crossfade、click補修、再sampleは追加しない。

## 6. 保存・再読・一件変更・Reset

元の字幕計画と時間表は、生byteのSHAに束縛して読み込む。解決処理はその内容だけを保持し、移動済みの計画を別渡しして二重に時間を加える経路を持たない。元Digestの版・SHA、隣接区間、元境界、有限presetと版、原案へのSHA参照を検査する。

原案と変更指定は別ファイルへ保存し、技術手指定の作成者を記録する。Resetは対象一件の変更指定を削除する操作であり、原案そのものを書き換えない。次の二つの原案を実媒体検査へ接続する。

| 保存した原案 | 検査する変更・復元 |
|---|---|
| 接続1・2・11がSoft | 接続1を通常カット、接続2を黒へ変更して保存・再読。一件だけのResetで接続2の指定を保ち、全Resetで保存済みSoft原案を復元する |
| 接続1が既存黒 | 接続1を通常カットへ変更して保存・再読。Reset後は保存済み黒へ戻り、元入力から同じ画素列・PCMを描画する |

保存前後の原案byte、再解決した時間表、Soft／黒それぞれの元描画とReset描画の全frame・全PCMを照合する。正常保存・再読・Resetは合格した。8保存物の内部SHA・元入力参照・作成者を独立照合し、対象だけのResetと他の変更指定の保持を確認した。Soft原案・黒原案の各252frameと各3,225,600byteのfloat32 PCMは、保存後のReset描画と全量一致した。実AIによる原案生成と人間評価は今回行わない。

## 7. 独立画素検査と実故障

独立検査は描画実装やpresetをimportせず、入力の全frame、固定係数、黒の数値、整数丸めから期待結果を計算する。窓外は元frameそのもの、窓内は所定の変換、挿入部は黒の全画素を比較する。元frameの消費順序・個数と、対応するPCM全量も別に確認する。

通常カット、既存黒、Soft、保存後のResetを小型媒体で確認する構成である。工程Iの字幕部品を変更していないため、工程Iの全候補やDigest全編の再描画を今回の必須検査にはしていない。

| 実故障 | 作る誤り | 検出すべき内容 | 結果 |
|---|---|---|---|
| フェードなし | 黒版の実媒体をSoftとして検査 | 前後の期待画素が成立しない | 意図どおり拒否。最初の不一致は表示frame115、計10frame |
| 窓が1frame遅い | 前後の変化を一つ後ろへずらして描画 | 予定位置の画素が一致しない | 意図どおり拒否。最初の不一致は表示frame115、計11frame |
| 元映像へ戻らない | 後窓の終端以降も暗い変換を残す | 復帰frameと窓外の元画素保持が成立しない | 意図どおり拒否。復帰端点の表示frame137から計115frame |
| 窓外を改変 | 対象窓の外の一frameを変更 | 変えてはいけない画素の一致が崩れる | 意図どおり拒否。表示frame20だけ不一致 |

故障検査は、映像の画素不一致を記録し、音声検査が正常で、tool失敗がない場合にだけ意図した拒否として数える。入力読取失敗、decode失敗、probe失敗、証拠欠落を「故障を検出できた」という成功へ変換しない。

## 8. 候補1本と最終媒体観測

既存3短尺へSoftを適用し、完成物として渡す候補は1本にまとめる。各例は予定どおり252frameとなり、合計756frame・25.2秒、可逆PCMは1,209,600sample/channelだった。以下の対応を実動画と保存時間表で確認した。

| 例 | 候補内のframe区間 | 黒の挿入区間 | 前窓／後窓 |
|---|---|---|---|
| 接続1 | [0, 252) | [120, 132) | [114, 120)／[132, 138) |
| 接続2 | [252, 504) | [372, 384) | [366, 372)／[384, 390) |
| 接続11 | [504, 756) | [624, 636) | [618, 624)／[636, 642) |

frame252と504の連結は例を梱包するための接合であり、元Digestの実接続ではない。各例の元境界との対応を保存する。この候補は技術手指定の出力例であり、全体を無修正で自動割当したDigestではない。

可逆の梱包結果について、各例の全frame・PCMを順に並べたものと一致するかを確認する。その後、同じ固定条件でH.264/AACへ符号化し、独立算術で確認した中間物からの技術用再符号化と、最終候補の全復号frame・音声を比較する。再符号化の一致は出力経路の証拠であり、フェード成立の根拠は別に計算した可逆画素の期待値である。

最終MP4では、寸法、fps、予定frame数、各frameのPTS・長さ、音声packetの連続性・終端時刻、先頭skip、末尾padding、実復号sample数を記録する。AACの予定終端を越える復号末尾、各挿入区間、挿入前後のsampleの実値・ゼロ分布も別に観測する。旧素材の末尾+256sampleや挿入端の非ゼロ384sampleは今回の期待値にしない。

| 最終候補の項目 | 実測結果 |
|---|---|
| 候補の絶対path | [候補MP4](/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-connection-stage2-r7ddhyxp/verification-v001/connection-expression-stage2-candidate-v001.mp4) |
| byte数・SHA-256 | 9,765,910 bytes / `38fe5cb7e5a4bd546a667926f71d98815af1dc848242d947d620f205ceb3d662` |
| 寸法・frame数・動画時間 | 1920×1080、30fps、756frame、映像／音声とも25.200000秒 |
| 映像／音声の時計・padding | 全映像PTSと各frame長は30fps格子に一致。AAC 1,183packetは連続、先頭−1,024sample＋skip1,024で表示開始0。packet終端1,209,600sample。最後のpacketは表示上256sample。末尾discard paddingの明示はなし |
| 実復号sample数・末尾・挿入端 | 1,210,368sample/channel。予定終端から＋768sample（非ゼロ192＋ゼロ576、両ch）。各挿入19,200sampleの中央18,816sampleはゼロ、両端計384sampleは非ゼロ（3区間・両ch） |
| 色域タグ・音声条件 | YUV420p、色域等のタグは未記録。AAC 48kHz・2ch |
| 再符号化との全復号比較 | 最終候補756frameの全復号画素と全復号PCMが技術用再符号化と一致。可逆入力との圧縮後byte一致は主張しない |
| ローカルUIでの再生 | 未検証。既存の操作制約を迂回しない |
| 人間の見心地・音の自然さ・字幕可読性 | 未評価 |

## 9. 完了条件との対応と実測欄

| 指示書の完了条件 | 本書・実装の対応 | 完了を判断する実測欄 |
|---|---|---|
| 1. 有限フェード一種類と出力例 | §2・3・8、有限presetと描画接続 | 完了。3実接続で描画し、候補1本へ梱包 |
| 2. 変更窓・挿入量・三時計・字幕作用 | §3・5、画素算術と全体／局所時間対応 | 完了。挿入12frame・保持端点込み黒14frameを区別。8描画の対応表を確認 |
| 3. 元内容・窓外画素・PCM・字幕の保持 | §4・5・7、全画素／PCM比較と全325字幕の照合 | 完了。各Softの窓外228frame・窓内12frame・黒12frame、保持384,000sample/channel、325字幕を照合 |
| 4. 保存・再読・描画・Resetと他指定の保持 | §6、Soft原案と黒原案の二経路 | 完了。二原案へ各252frame・全PCM復元。一件Resetで他の指定を保持 |
| 5. 全frame検査・実故障・通常／黒回帰 | §7、四故障と関連媒体の検査 | 完了。正常7件と画素故障4件。tool失敗を拒否成功に数えていない |
| 6. 実接続の候補1本と媒体QC、証拠境界 | §8、技術手指定・AAC観測・未評価事項 | 完了。756frame・25.2秒・H.264/AAC候補の全媒体時計を確認。自動選択0・人間評価0 |
| 7. 表現一覧と工程IIIの残件 | [接続表現一覧](digest-connection-expression-catalogue-20260918.md)と§12 | 完了。有限仕様・結果と工程III残件を記録 |
| 8. 指示・source・試験・再現・履歴・報告のcommit／push | §1・2・10・11 | **未記録：checkpoint・remote読戻し・既存作業保全を追記** |

| 実行結果の集約欄 | 結果／証拠 |
|---|---|
| 有限入力・保存・時計の試験 | [12項目すべて合格](digest-connection-expression-stage2-sources-20260918/unit-tests-v001.tap)。最終試験の失敗0 |
| 全325字幕と全体時計 | 原案44,444frame、2変更後44,432frame。本文等の全属性保持。独立担当の650時計行も一致 |
| 実3短尺のSoft | 各252frameすべて期待画素と一致。完全黒の実測は各14frame。PCMは各403,200sample/channelで保持部分とゼロが全量一致 |
| 通常／黒・二原案のReset | 通常240frame、黒252frame、Soft Reset252frame、黒Reset252frameが合格 |
| 実故障4件 | 全件を映像画素の不一致で拒否。PCM検査は全件合格、実行tool失敗0 |
| 候補梱包・最終MP4 | 可逆梱包は各例の全frame／PCM連結と一致。最終756frameの時計、AAC終端・復号余りを確認 |
| 保存入力・原案・既存作業の保全 | 実入力8件と保存原案のSHA不変。元作業tree、工程I tree、工程I候補が開始時と一致 |
| 軽量証拠のpath・SHA | [軽量証拠JSON](digest-connection-expression-stage2-evidence-20260918.json)にsource・入力・原記録のSHAを収録 |

## 10. 検証時の履歴と保全

実走前レビューで、正本の画面設定が持つ安全域情報を保持したまま寸法・fpsを渡す処理、旧短尺の元位置・参照情報との照合、全体時計上の黒挿入位置の照合を補強した。保存原案と空の変更指定の最終byte再照合、および元60fpsの偶数frameを使う前提の明示も加えた。これらは実走前の処理・証拠接続の補強であり、実媒体試験の合格記録ではない。

実媒体の描画は`render-v001`一回、仕上げは`verification-v001`一回で正常終了した。描画8本の内訳は正常7本と意図した窓ずれ故障1本。仕上げで残りの3故障を確認し、計4件の期待した拒否を保存した。予期しない実装・媒体検査の失敗、実走後の限定修正・再実行は0回。単体試験は初版、既存画面設定の実値対応後、作成者の固定後の3回とも12／12合格した。補助的なログ読取では相対pathの取り違えが1回あり、絶対pathで読み直した。テスト本体の失敗や再実行には数えていない。

| 最終保全・記録 | 状態 |
|---|---|
| 元正本・保存短尺・原案byteの最終照合 | 描画の前後と独立媒体検査の前後で一致。元入力8件・原案保存byteを保持 |
| 既存作業treeと工程I候補の保全 | 元treeのHEAD・branch・全status・差分・staged状態、工程Iの同項目と候補SHAが開始時に一致。元treeの既存差分は2,604bytesのまま |
| 最終変更file一覧・commit漏れ確認 | **未記録・要追記** |
| checkpoint・push・remote読戻し | **未記録・要追記** |
| 通信・費用の集計 | 新素材・依存取得0、媒体upload0、有料API呼出0、API費用US$0。監査用Git pushと同じ相談役への報告だけを指示範囲で行う |

実MP4、可逆媒体、巨大な生証拠をGitや外部サービスへ無断で追加しない。再現source、試験、指示・参照、文書、軽量証拠を選別して残す。正式成果物の上書き、main merge、tag、stable、releaseは今回の範囲に含めない。

## 11. 再現方法

1. [来歴記録](digest-connection-expression-stage2-sources-20260918/provenance-v001.json)と[実入力記録](../../evals/clip_composition/connection_expression_fixture_inputs_20260918.json)に従い、元正本・保存短尺・旧証拠・toolの所在、byte数、SHAを照合する。旧証拠の再利用範囲を確認する。
2. 固定したNodeで[有限入力の試験](../../evals/clip_composition/connection_expression_v001.test.mjs)を `--test` で実行し、全結果を保存する。
3. [短尺描画処理](../../evals/clip_composition/connection_expression_fixture_v001.mjs)へ、絶対pathの `--manifest` と、存在しない新規directoryを `--output` として渡す。保存・再読・時計検査・可逆描画を行う。
4. 固定したPythonで[仕上げ処理](../../evals/clip_composition/connection_expression_finish_v001.py)を実行する。前段の出力を `--fixture-directory`、別の新規directoryを `--output` として渡す。独立検査、実故障、Reset比較、候補梱包、最終MP4観測の順に進む。
5. 全結果を照合し、入力・既存作業の保全を再確認した上で、本書と一覧へ実測を追記する。候補の絶対pathとSHA、sourceと軽量証拠のcheckpoint、remote読戻しを記録する。

既存の出力directoryへ再実行して上書きしない。実行時に固定したNode・Python・FFmpeg・ffprobeの実体とSHA、実行command、出力rootは、[軽量証拠](digest-connection-expression-stage2-evidence-20260918.json)と各出力rootのcommand記録に保存した。Node 20.19.6、Python 3.12.12、FFmpeg／ffprobe 8.0.1の既存実体を使用した。

### 実行したコマンド

次のコマンドを専用worktreeで実行した。再現時は、出力先の`render-v001`と`verification-v001`を未使用のdirectory名へ置き換える。元入力や既存出力は上書きしない。

```sh
cd /var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-connection-stage2-r7ddhyxp/worktree
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node --test evals/clip_composition/connection_expression_v001.test.mjs
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node evals/clip_composition/connection_expression_fixture_v001.mjs --manifest /var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-connection-stage2-r7ddhyxp/worktree/evals/clip_composition/connection_expression_fixture_inputs_20260918.json --output /var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-connection-stage2-r7ddhyxp/render-v001
/Users/kawafmm/miniforge3/bin/python3 evals/clip_composition/connection_expression_finish_v001.py --fixture-directory /var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-connection-stage2-r7ddhyxp/render-v001 --output /var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-connection-stage2-r7ddhyxp/verification-v001
```

媒体の実行引数と終了codeは各出力directoryのcommand記録、各全frameの比較は独立検査のJSONL、時計・全float32 PCM・復号末尾は各proofに保存した。再現には固定された既存入力が必要であり、所在やSHAが異なれば取得や再sampleで黙って補わず拒否する。

## 12. 未統合事項と工程IIIへの引継ぎ

| 後続事項 | 必要な処理 |
|---|---|
| 映像と字幕の合成順 | 焼込前の基礎映像へ接続を適用する順序と、字幕画素へ接続効果を掛ける範囲を定める |
| 共通表示時計 | 保持映像、PCM、字幕、接続挿入を同じ表示時刻へ投影する |
| Pulseの根拠ピーク | 元の音声ピークとの対応を保ち、挿入後の表示時計へ写す |
| Bounce／Shakeの開始基準 | 投影後の字幕開始を基準に、有限動作を一度だけ行う |
| 接続と字幕の変更指定の独立性 | 一方の変更やResetで他方の割当・見た目を失わず、共通時計を再解決する |
| 全体の使い分け | 採用状態と適用可能性を材料に有限表現を選び、保存した具体presetと根拠を残す |
| 正式な受入・信頼 | 通常file入口、正式job、renderer正式版、Normal再認定、trust再発行を別管理で閉じる |

新Softの正式名称・デザイン採用、人間品質、音の自然さ、ローカルUIでの再生は未評価／未検証である。今回の小型媒体から、通常job全般、異なるfps・音声sample rate、全Digestの自動割当へ合格を一般化しない。

工程IIの正常技術結果と相談役監査を得た後、同じ相談役会話へ工程IIIの指示書を求める。工程IIは接続能力を一種類増やして次へ渡す工程として完了条件を閉じる。
