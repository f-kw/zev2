# 実行入力記録・crop適用 6不合格診断／限定修正記録 v001

- 診断日: 2026-08-03
- 対象: 正式228件 attempt v002 の `OEE001 / OEE002 / OEE005 / OEE007 / OEE008 / OSR010`
- 入力TAP: `evals/clip_composition/reports/presentation/test-runs/20260803-meaning-output-run-input-crop-v001/formal-228-attempt-v002.tap`
- 入力TAP SHA-256: `d267f7371dc7e155e9698376eba91e85daead84574a006feefda6e96830c39c4`
- 診断中の正式228件再実行: 0回
- 外部通信: 0回
- 費用: US$0
- 本裁定以後の修正周回: 1 / 2

## 1. 結論

契約矛盾は見つからなかった。6件は三群へ分かれる。

1. 縦型の意味入力からcrop適用を受け渡す境界で、厳密JSON読取器の内部object表現をcrop検査が通常のJSON objectとして受け取れないproduction欠陥: `OEE002`。
2. 正式な媒体tool pathがHomebrewのsymlinkであるのに、crop適用runnerが一般成果物用の「symlinkではないfile」規則で拒否したproduction欠陥: `OSR010`。
3. 横型描画が非空動画の成立前にfatalとなり、正常経路とその後段の故障注入へ到達しなかった実行環境／派生検査群: `OEE001 / OEE005 / OEE007 / OEE008`。

crop適用という新工程が6件共通の原因ではない。直接cropを通る`OEE002`と`OSR010`も互いに別原因であり、横型4件はcrop適用を通らない。

## 2. ID別の三分法と同根性

| ID | 内側停止段階 | 観測した値・path・tool挙動 | 帰属 | 同根性 | 限定対処 |
|---|---|---|---|---|---|
| `OEE001` | 横型描画。非空の作業動画が成立する前 | v002は`fatal`、2,666.413459 ms。保存TAPに内側stderrなし。crop適用枝へ入らない | fixture／正式検査の実行環境 | `OEE005/007/008`の上流 | productionを変えず、固定Nodeを先頭にしたnative環境で正式attemptを実行 |
| `OEE002` | 縦型style解決内のcrop適用照合 | 意味入力の基礎映像4参照はnull-prototype object。crop検査の通常object判定で失敗し、`CROP_APPLICATION_TARGET_BINDING_MISMATCH`が上位の`CROP_BINDING_MISMATCH`へ写る | production実装 | 単独 | 受け渡し点で4参照を内容同一の通常objectへ複製してから既存crop検査へ渡す |
| `OEE005` | 横型描画。既存QCの空字幕拒否より前 | 期待exit 1に対しexit 2、2,288.234875 ms。保存TAPに内側stderrなし | fixture／正式検査の実行環境 | `OEE001`と同じ上流 | `OEE001`と同じ。QCや期待codeは変えない |
| `OEE007` | 故障注入のhandshake前 | 非空作業動画待ちの注入回数が0。狙ったstaging検査は未実行 | fixtureの派生不成立 | `OEE001`の派生 | 独自修正なし。横型描画が成立した後に既存handshakeで1回注入する経路を再観測 |
| `OEE008` | 故障注入のhandshake前 | 非空作業動画待ちの注入回数が0。狙った公開競合は未実行 | fixtureの派生不成立 | `OEE001`の派生 | 独自修正なし。横型描画が成立した後に既存handshakeで1回注入する経路を再観測 |
| `OSR010` | crop適用runnerのjob検査 | `/opt/homebrew/bin/ffmpeg`と`ffprobe`は正式bindingのpathだがsymlink。旧読取は`runtime-file-unsafe`で停止 | production実装 | 単独 | pathが指す実体を前後で固定し、その実体を既存の安定regular-file読取へ渡す |

## 3. 確定したproduction欠陥

### 3.1 `OEE002`: 厳密JSONとcrop検査のobject表現の縫い目

事実:

- 正式要求の厳密JSON読取器は、objectを`Object.create(null)`で構築する。
- style解決は、その読取結果に含まれる基礎映像4参照をcrop適用検査へ直接渡していた。
- crop適用検査は、通常のJSON objectだけをexact shapeとして受理する。
- application、crop決定、選択package、基礎映像のbyte値自体に差はない。
- null-prototype objectを`structuredClone`すると、JSON値を変えず通常objectへ戻る。

限定修正:

- `presentation_output_style_resolver_v001.ts`のcrop適用検査への受け渡し点だけで、基礎映像4参照を内容同一複製する。
- crop検査、schema、違反code、幅、preset、viewport、正式成果物byteの規則は変えない。

### 3.2 `OSR010`: 正式tool pathと成果物用symlink拒否の混同

事実:

- 正式path `/opt/homebrew/bin/ffmpeg` は `/opt/homebrew/Cellar/ffmpeg/8.0.1_1/bin/ffmpeg`へのsymlinkである。
- 正式path `/opt/homebrew/bin/ffprobe` も同じCellar版へのsymlinkである。
- 現物SHA-256は、ffmpegが`d105f770f53607ec1532b27e354ca7c3166a706dc1ccc6f96e3c8d3f54d7e798`、ffprobeが`dcb242647fedaa21618f7048c5f2982e584fdfbcfca098553b3121d1a5d509d9`で、正式bindingと一致する。
- 旧runnerは、正式tool pathそのものへ「symlinkではないこと」を要求していたため、version確認、媒体検査、cropの値検査より前に`runtime-file-unsafe`となった。

限定修正:

- 正式pathの実体pathを実行前後で照合する。
- 実体fileは従来の安定regular-file読取でbyte、inode、size、時刻、link数を検査する。
- SHAとversionは従来どおり正式bindingへ完全一致させる。
- symlink全般を成果物読取へ許可せず、runtime toolの正式pathだけに適用範囲を限定する。

## 4. 横型4件の事実・推測・未確認

### 事実

- `OEE001 / OEE005 / OEE007 / OEE008`は横型であり、新しいcrop適用工程を通らない。
- `OEE007 / OEE008`の注入処理は、非空の作業動画ができるまで待つ。v002ではその条件が成立せず、注入回数は0だった。
- 直前の同じ横型検査群は、native環境かつ固定NodeをPATH先頭へ置いた正式attempt v007で成立済みである。
- v002の横型fatal所要時間は、過去にRemotion配下のChromium起動で止まったsandbox側の観測と近く、正常native描画より短い。

### 推測

- 第一原因は、v002がnative描画条件を記録・固定せず、Remotion／Chromiumの起動段階で止まったことである可能性が高い。
- `OEE007 / OEE008`は独立したproduction不具合ではなく、その上流fatalの派生である。

### 未確認

- v002のfixtureは終了時に削除され、正式TAPには子processのstdout／stderr、実行環境表、内側failure reportが保存されていない。このため、v002固有の内側tool error文字列は復元できない。
- 次の正式attemptでnative・固定実体条件を明示し、4件が全て本来の正常／拒否枝へ到達することをもって確定する。1件でも不成立なら、新原因として同attemptで直さず停止する。

これは診断不足を成功扱いするものではない。保存済み証拠が証明できる範囲と、次attemptで初めて確定する範囲を分けた記録である。

## 5. 修正範囲と契約影響

| 修正file | 変更の意味 | 契約影響 | 12 file範囲 |
|---|---|---|---|
| `evals/clip_composition/presentation_output_style_resolver_v001.ts` | 厳密JSON内部objectをcrop契約へ渡す直前に内容同一の通常objectへする | なし | 既存承認file |
| `evals/clip_composition/run_presentation_output_crop_application_job_v001.mjs` | 正式runtime tool symlinkの実体を前後固定して読む | なし | 既存承認file |

追加file、4つ目の入口、正本計算の複製、検査期待値変更、既存3本の変更はない。横型4件にはコード変更を加えない。

## 6. 新attemptの固定条件

1. 同じ監視領域へ書き込む並行processがないことを開始前に確認する。
2. 固定Nodeと固定TSXを使い、固定Nodeを子processのPATH先頭へ置く。
3. 正式228件を頭から1回だけ実行し、TAP全228 IDとstderrを版付き保存する。
4. 不合格が1件でもあれば同attemptで直さず停止する。
5. 228/228の場合だけ、既存合格gate 287/287、既知baseline 64/181、既存3本tree SHAを照合する。
6. 全て成立した場合だけ実行入力記録を正式固定し、固定済み5項目の実行前下書きを提示する。

本attemptは、2026-08-03裁定後の診断→修正→新attempt周回の1 / 2である。
