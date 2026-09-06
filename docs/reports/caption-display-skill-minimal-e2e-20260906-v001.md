# 字幕表示区切りSkill — 最小実動画E2Eの第一完成報告

## 1. 結果

**固定planから新しい字幕表示区切り判断を実際に通し、既存ZEV Coreで別成果物の動画を生成した。technical QCと由来の再検証は合格。人間の品質評価は未判定である。**

2026-09-06「ZEV進行管理２」経由のkawafmm承認済み実装指示に基づく。開始HEADはmain `95f8852982a179c3915f2ec03e3dfd6c8ff8d735`。直接設計根拠は `docs/reports/first-skill-selection-and-minimal-e2e-design-20260906-v001.md`。

比較資料: `evals/clip_composition/outputs/presentation/work-caption-display-skill-doctor-20260906-v004/review.md`。2本を資料内で再生でき、字幕を重ねる前の既存入力と元動画にもリンクする。同じフォルダの `review.html` は並列再生・音声切替・共通シーク・元動画の対象区間再生を備えた補助資料である。

新しい動画は1920×1080、30fps、1073frame、35.766秒、H.264/AAC、11,764,243byte。既存完成版の本文・映像・音声・場面順・表示規約を維持し、字幕表示の単位と行末だけを新しい判断へ接続した。旧版7表示・13行に対し、新版は14表示・17行。本文は双方190文字で完全一致する。表示数の増減を品質の点数にはしていない。

## 2. 実装した責務の境界

| 処理の責務 | 実装 |
| --- | --- |
| 「確定済み字幕本文をどの表示単位・行末で見せるか」という一つの問いを呼び出し、権限のない回答を返す | `runner/src/skills/caption-display-boundaries-v001.ts` |
| 遠方接続の医者失踪→鬼の母の既存完成例、本文・媒体・表示規約・出力先・review用採用方針を固定する | `evals/clip_composition/jobs/presentation/caption-display-skill-e2e/fixed-plan-v001.json` |
| 入力照合、回答検査、review用採用、正式入力への決定的昇格、既存renderer呼出、由来照合 | `evals/clip_composition/run_caption_display_skill_e2e_v001.mts` |
| Skill入口の入出力・実呼出・辞退と例外を検査する | `runner/test/caption-display-boundaries-v001.test.mts` |
| 不正回答拒否、採用境界、決定的昇格、既存Core接続、保存した実判断からの再開を検査する | `evals/clip_composition/run_caption_display_skill_e2e_v001.test.mts` |

新規の実装・固定plan・testはこの5path。既存production、renderer、契約、Goal、DECISIONSは変更していない。巨大framework・registry・自由なPlanner・新しい技法は追加していない。

Skillへ渡すのは既存形式の確定本文断片・境界ID・行幅規約。Skillの回答は完了または辞退で、完了時には表示末尾と行末の境界IDだけを返す。時刻・frame・字幕本文の生成・採用宣言・素材pathは回答に許さない。検査関数は製造側から呼び、Skill自体は正式化・描画・admission・QCを行わない。

製造側は元本文・境界所属・順序・全文被覆・行幅・SHAを検査し、検査済みの内部snapshotからだけ昇格する。生回答やコピーした検査トークンを正式値にできない。同じ固定入力と同じ採用回答から同じ正式byteを再現する。LLMへ再度問い合わせた場合の回答一致を保証するという意味ではない。

既存のsource検査、表示末尾projection、意味に基づく行末projection、正式注文書v002、行組みv002、renderer admission、renderer、technical QCを再利用した。過去B6の由来を新しい判断へ付け替えていない。新しい由来は固定plan→入力→現Codex回答→権限なしSkill結果→検査・採用→正式入力→動画の連鎖で記録する。Coreには昇格後の正式入力だけを渡す。

## 3. 実際の新規判断と許可された再判断

今回の指示には「新しい判断を通す」「API通信を行わない」の両条件がある。この作業中の現Codexが固定本文を読み、その場で新しく判断してローカル標準入力へ回答を渡す方式を、相談役が今回のE2E実証に限って許可した。独立した推論provider/API/clientが完成したとの主張はしない。

最初の新規判断は13表示・16行。入力、回答、Skill結果を保存して検査・昇格・admissionを通した。出力先の接続不備を直して同じ回答から再開したところ、18文字の1行表示が実描画の安全領域を16px超え、正しく拒否された。

相談役から同一Skillの新しい判断を1回だけ行う指示を受け、同じ190文字を読み直した。母の死と、その後の行為をそれぞれ読める単位として「やがて女は死に」「若い子を捕らえて喰らう」に分けた。他の本文・素材・表示規約は変更していない。新しい文字数上限・係数・重み・style変更で救済せず、別の回答記録から通常の検査・昇格・描画を通した。この2回目の判断から生成した動画がtechnical QCに合格した。

新規の意味判断は合計2回。描画準備は合計3回（出力先不合格、実レイアウト不合格、成功）。別に、回答を受け取る前に標準入力が閉じた起動配線失敗が1回ある。API通信・追加有料API費用・新素材取得は0。GitHub・Drive・相談役への監査送信は今回明示された共有操作として実施する。

## 4. 比較の条件とHUMAN_DECISION

比較は実際の既存完成動画に対応する正式命令から確認した。元本文・媒体とタイムライン・音声・描画設定・描画ツール・表示規約の束縛が新旧で一致する。素材templateが元々参照していた別動画の字幕を比較対象にはしていない。全表示本文の照合結果と新旧の表示・行末一覧は成功出力の `comparison-evidence.json` に保存した。

| 比較対象 | repository path | SHA-256 |
| --- | --- | --- |
| Skillなし既存完成版 | `evals/clip_composition/outputs/presentation/distant-connection-presentation-execution/candidate-doctor-disappearance-to-ogre-mother-v001/render-output-v001/presentation-rendered-v002.mp4` | `d9ce7d6f45c9eb46807402d379dc176397dc38d06b9f4ceeb180565a94593861` |
| Skill使用版 | `evals/clip_composition/outputs/presentation/work-caption-display-skill-doctor-20260906-v004/render/presentation-rendered-v002.mp4` | `561a6d7c74dcee39684a4040f5a7e892cb729ef3ae19857d294bb4bf25835e6d` |
| 元動画 | `evals/clip_composition/outputs/work-distant-connection-real-input-preparation-ymUsGrT6EaA-v001/source/ymUsGrT6EaA.mp4` | `79e9cf231000c18448d52541449f65ceecd6068ae800e18736c2a0c358c90537` |

元動画の対象区間は前半28:44.755–28:59.800、後半1:34:53.397–1:35:14.097。比較資料から既存の2場面合成入力も確認できる。巨大な元動画は複製していない。

人間に判断してもらう事項は次の3点に限定する。

- Skill使用版の方が見やすいか。（良い・同等・以前の方が良い・保留）
- 意味上、不自然に切れた字幕はあるか。（なし・あり・保留）
- 字幕の出方が動画の気持ちよさを損なっていないか。（保てている・損なっている・保留）

**人間目視結果は未判定。Codexは代行していない。** 本文に含まれる「医療策」等の元の表記を直すSkillではなく、本文修正は今回の範囲外である。本文だけから表示単位を判断するため、映像を見た自然さや視聴の快適さはこの人間レビューで確かめる。

比較MarkdownをCodex内で開く操作はキューへ登録済み。補助HTMLの媒体参照先存在・JavaScript構文を確認した。Browser Useはローカルfile URLを禁止したため、ブラウザでの補助HTMLの再生操作テストは未実施である。別のbrowserやローカルserverによる迂回は行わず、実動画を埋め込んだMarkdownを主導線にした。人間が比較可能な動画現物と参照は用意済みだが、自動UI再生試験を合格したとは報告しない。

## 5. 検証結果

| 検証 | 結果 |
| --- | --- |
| 新規テスト | 13件合格。入出力検査、不存在ID、所属・順序・全文被覆、不正改行、余分な時刻・本文・採用field、SHA不一致、生回答の直接昇格、再開時の入力差替えと回答・結果の同時改変を検査 |
| Skillのstrict TypeScript検査 | 合格 |
| 既存字幕経路の回帰 | 7ファイル・53件の合格を確認。既存source検査、字幕選択、両projection、注文書v002、行組みv002、renderer呼出、遠方接続意味入力を対象とした |
| renderer admission | 合格。既存媒体・正式注文書・行末投影・実行設定を検査して受理 |
| 実レイアウト | 14表示すべて合格、違反0 |
| technical QC | 合格。14表示の適用、透明度・境界・可視性、字幕を除いた比較映像との差分、媒体形式・frame数・音声payloadを確認 |
| 映像・音声 | 1920×1080、30fps、1073frame、35.766秒。AAC packet payload SHAは期待値と一致し、音声内容を維持 |
| 決定的昇格と由来 | 完成manifestから入力・回答・採用・全昇格成果物を再読込みして再構成一致。動画SHA一致。字幕画像14枚すべてQC記録のSHAと一致 |
| 作業外の保持 | 開始時の別作業13pathのSHA一致。今回のcommitへ含めない |
| 比較資料 | 新旧の全本文一致、実際の既存完成版と媒体・設定一致、全媒体リンク先存在。補助HTML構文合格。人間評価と自動再生UI検査は未実施 |

関連回帰の初回は53件中52件合格、1件でmacOS `otool` の標準エラー長が期待値0に対し216byteとなった。空の環境でmacOS一時ディレクトリを取得できないsandbox警告を再現した。対象test・source実装・native helperは開始HEADと同一byteで、今回のコードをimportしない。同じ6件のsource testを制限外で実行し、コードや期待値を変更せず6件すべて合格した。初回失敗と再実行の両方を成功出力の `technical-evidence.json` に保存している。全repositoryの無関係なシナリオまで合格したという主張はしない。

## 6. 証拠と整理

成功出力の基点は `evals/clip_composition/outputs/presentation/work-caption-display-skill-doctor-20260906-v004/manifest.json`。`review-manifest.json` は人間用比較資料、技術証拠、全保持ファイルのpath・SHA・byte数をまとめる。

| 連鎖 | 成功出力内のファイル | SHA-256 |
| --- | --- | --- |
| 実際に判断した入力 | `judgment-request.json` | `946e4283a0b2c64639caae414ffb836f25fafdcb760a5a8d8df77fec227bff4f` |
| 今回の新回答 | `judgment-response.json` | `e1c2c1aa00c1b86249f7bb73970532c850df323869c70404c23fdba925168ee2` |
| 権限なしSkill結果 | `skill-result.json` | `6315e7167b6ab19f9509173ba52c953c112eb462ce3584081bcc806f5c0cbf11` |
| 検査・review用採用 | `validation-and-adoption.json` | `1adb8eeae12aa755fd64568d9c801d2049d7510ff7ac8ab40519d0d5f87dcf89` |
| Coreに渡す正式注文書 | `instruction.json` | `9a8ca9f82566af7b44591efe629300496e9736580030068a7c0b8670890b3875` |
| renderer実行と全QC結果 | `renderer-result.json` | `b678db131ad587ab5be188d65646c882b48c81c4a6821b4915207218d1450274` |

元の失敗証拠は上書きせず保存した。初回判断・出力先失敗は `outputs/work-caption-display-skill-doctor-20260906-v001/`、同じ判断の実レイアウト失敗は `outputs/presentation/work-caption-display-skill-doctor-20260906-v002/`、回答前の標準入力閉鎖は `outputs/presentation/work-caption-display-skill-doctor-20260906-v003/`。いずれも先頭は `evals/clip_composition/` である。過去回答を成功に書き換えていない。

成功実行のローカル子処理171件の終了値・signal・標準エラー、実レイアウト結果、テストログ、再検証結果を `technical-evidence.json` へ集約した。その後、成功実行だけが作った一時ファイル590件・176,563,612byteを削除した。公開動画、字幕画像14枚、正式入力、admission、QC、manifestは保持し、整理後も由来再検証は合格した。既存rendererの出力構造を使い、証拠のために新しい一般基盤は作っていない。

## 7. 再現・照合コマンド

workspace rootから、既存のNode 20.19.6とインストール済み依存を使用する。

```sh
node --import ./runner/node_modules/tsx/dist/loader.mjs --test runner/test/caption-display-boundaries-v001.test.mts evals/clip_composition/run_caption_display_skill_e2e_v001.test.mts
node runner/node_modules/typescript/bin/tsc --noEmit --strict --target ES2022 --module NodeNext --skipLibCheck runner/src/skills/caption-display-boundaries-v001.ts
node --import ./runner/node_modules/tsx/dist/loader.mjs evals/clip_composition/run_caption_display_skill_e2e_v001.mts verify evals/clip_composition/outputs/presentation/work-caption-display-skill-doctor-20260906-v004/manifest.json
```

完成済み出力に対して `run` を再実行する手順ではない。出力は排他的に作成する。新しい意味判断や新規製造の再試行は、その時点の指示・許可に従う。

## 8. 監査経過と最終同期

| checkpoint | 相談役の回答と作用 |
| --- | --- |
| `f89d16dfa2242e999199e90902985fb8dc4a4984` | continue。現Codexが新しく判断し標準入力で渡す方式を今回の実証に限定して許可 |
| `72ed4cced4746c0d3f3dfc25f154ae9e270a609d` | continue。既存renderer許可配下へ出力先を直し、同じ新規判断から再開 |
| `e022b8d8f8e61da574e41d2ddfacc0c8db5f5a1d` | continue。実測不合格を受けた新しい判断を1回だけ許可。再不合格なら3回目を自動で行わずGPT_DECISIONへ戻す指示 |

本書と完成成果物を含む最終checkpointをcommit/pushし、local/remote mainの同一HEADを照合する。最終commitは自身の本文に自己参照させず、Drive MANIFESTとAUDIT_ONLY本文に40桁SHAを記録する。`git log -1 --format=%H -- docs/reports/caption-display-skill-minimal-e2e-20260906-v001.md` でも特定できる。

Driveには同じHEADの実装・報告原文と、review manifest・比較証拠・技術証拠・実行結果を同期し、全文を読み戻して照合する。動画はrepositoryの現物とSHAで示し、Driveには重ねて複製しない。「ZEV進行管理２」への第一完成AUDIT_ONLY後も、人間の見やすさ・自然さ・気持ちよさはHUMAN_DECISIONとして残す。次のSkill・Goal改訂・tag・stable昇格・releaseへは進まない。
