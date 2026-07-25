# candidate 13 基本テロップ ゲートB2 完了報告 v001

- 完了日: 2026-07-25
- 状態: **合格。B2の承認範囲を完了**
- 対象: 正式入力packageの生成処理、意味回答の受入処理、既存回帰、candidate 13読み取り専用preflight
- 最終限定修正commit: `88506d69c937f248aaa2e982acea9e99594f8cb6`
- 人間作業: 0件。媒体視聴、時刻入力、時間計測なし

## 1. 何ができるようになったか

人間が採用したcandidate 13の残存354文字と、ゲートAが作った205個の機械的な区切り候補から、次を決定的に行える配管ができた。

1. Geminiへ渡す前の、固定7ファイルからなる入力packageを組み立てる。
2. 元文字・時刻・IDをGeminiに作り直させず、Geminiが選べる範囲を「行末候補」と「1〜2行のまとまり」へ限定する。
3. Geminiが候補外の位置、本文の改変、順序変更、不正な形式を返した場合は自動修復せず拒否する。
4. package生成、意味回答の受入、既存の境界証拠、残存発話の四系統を独立に検査する。

ここで完成したのは**正式入力を安全に作り、意味回答を安全に受ける配管**である。正式7ファイルの生成、prompt登録、Gemini実走、表示計画、演出指示書、描画はまだ行っていない。

## 2. 最終不合格と限定修正

意味回答側155件のうち最後まで残った1件は、macOSの一時領域が同じファイルを二つの絶対パスで表すことにより、検査用の別processがproduction CLI入口を起動できない問題だった。

| 論理パス | 実体パス |
|---|---|
| `/var/folders/...` | `/private/var/folders/...` |

欠陥は検査側の実行環境解釈にあり、production本体・契約・束縛hashにはなかった。commit `88506d69`では、production CLIを実processで起動する検査の**起動対象だけ**を、起動直前にファイルシステム上の実体パスへ解決した。

維持したもの:

- 実processによるproduction CLI入口の検査。
- 正常完了0、判断辞退1、usage不正2の終了コードとstdout/stderr排他。
- production runnerの実byteとSHA-256。
- job、成果物、違反コード、一般的なパス比較規則。

行っていないもの:

- mock、skip、同一process内呼出しへの置換。
- production側のsymlink解決追加。
- 期待値や束縛hashの変更。
- 不合格後の別方式による再試行。

完了時の帰属を確定する。以前の10件の束縛不一致は古いhashへの再束縛不足ではなく、合成読取器がパス末尾を正規化できていなかった検査側欠陥だった。束縛対象とhashは無傷であり、re-bindingは不要だった。最後の1件も上記のmacOS別名パスによる検査側欠陥で、production本体・契約は無傷である。

## 3. package生成側の全件検査

承認済み最終修正後、新しいattemptとして全件を先頭から1回実行した。

| 項目 | 結果 |
|---|---:|
| test総数 | 133 |
| 合格 | **133** |
| 不合格・skipped・todo・cancelled | **0** |
| stderr | 0 byte |
| TAP SHA-256 | `e34aef5bfeba9b4939bab04bbc6813adba35d52d41fe532614d7527edc822f7c` |
| TAP記録 | `test-runs/20260725-caption-b2-cli-realpath-repair-v001/package.tap` |

正式公開の段階停止、固定7ファイルのbyte・file hash・canonical hash・相互参照、入力差し替え、lock・work・rename、公開後再読、失敗帰属、決定性、違反コードと担当検査の完全対応を含む。部分合格ではなく133件全件が完走した。

## 4. 意味回答側の全件検査

package側合格後、意味回答側を全件実行した。

| 項目 | 結果 |
|---|---:|
| test総数 | 155 |
| 合格 | **155** |
| 不合格・skipped・todo・cancelled | **0** |
| stderr | 0 byte |
| TAP SHA-256 | `1de922a82db4b1aa5e5e9f79ec6790c2adea24bb30824dfadeae6e64aecb8f47` |
| TAP記録 | `test-runs/20260725-caption-b2-cli-realpath-repair-v001/semantic-output.tap` |

最後の実process検査も合格し、正常完了・判断辞退・usage不正の3形がproduction CLIを本当に起動して検証された。無効回答を自動修復しないこと、候補外ID・本文・時刻・理由・scoreを受けないこと、元文字へ機械的に戻すことも維持した。

## 5. 既存回帰

### 5.1 ゲートA

| 項目 | 結果 |
|---|---:|
| test総数 | 21 |
| 合格 | **21** |
| 不合格 | **0** |
| TAP SHA-256 | `2736835538681aed0e7aabd6430bbb4fd9994d16a20c4bcb3390ed227b351efb` |

354文字から205個の機械境界候補を、欠落・重複・順序変更なしで作る既存処理は維持された。

### 5.2 残存発話

| 項目 | 結果 |
|---|---:|
| test総数 | 50 |
| 合格 | **50** |
| 不合格 | **0** |
| TAP SHA-256 | `c5afffd7fd01c69710ab746bcdbb4a01e1a8a81f36c1ce619188ff657adf3930` |

人間が採用した区間から残った354文字、区間別248/106件、切除済み発話の再参照禁止を含む既存処理は維持された。

## 6. candidate 13 読み取り専用preflight

全自動検査と回帰の合格後、次の固定jobを排他的に作り、読み取り専用preflightを**1回だけ**実行した。

- job: `evals/clip_composition/outputs/presentation/caption-semantic-source-package-preflight-jobs/DmWu0jVQfTE-candidate-13-caption-b1-v001.json`
- job SHA-256: `5bf004876d3973999f5d5c07c9165088de40bc8eaf53b4862bfaf56d3d975bdb`
- 実行結果: exit 0、17 checks全件passed、violations 0、failureStage null
- stdout: 3,200 byte
- stdout SHA-256: `ab0118b903bce67b9fa88dd130f5d99caf9371329fa144ad99cb456170072505`
- stderr: 0 byte
- 読み取り専用状態: verified、前後不変
- 意味品質・自然な改行品質: **未検査のまま**

固定投影:

| 単位 | source文字 | 境界候補 |
|---|---:|---:|
| 全体 | 354 | 205 |
| container 1 | 126 | 60 |
| container 2 | 122 | 78 |
| container 3 | 106 | 67 |

正式出力先
`evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/DmWu0jVQfTE-candidate-13-v001`
は実行前後とも不存在で、正式7ファイル、lock、work、tmpを作っていない。

## 7. 前提Pの再照合

前提Pは「正式公開された固定7ファイルを、生成時の期待byte・hash・値・正規rootへ再照合できること」であり、合成正式公開の検査としてpackage側全件へ含めた。

確認結果:

- 正常公開と故障注入の各段階を固有の検査・pathへ帰属: 合格。
- staging、入力再照合、rename直前で後続I/Oを止める: 合格。
- 個別ファイルのopen/read失敗を公開失敗へ帰属し、完全snapshotの不一致を別違反として維持: 合格。
- 正式root・固定7名称・実byte・file hash・canonical hash・相互参照・公開後再読: 合格。
- 合格した133件の担当検査と動的違反組合せの完全対応: 合格。

これは**合成データによる公開契約の成立確認**である。candidate 13の正式7ファイルを生成済みという意味ではない。

## 8. 実行環境

| 項目 | 実測 |
|---|---|
| platform / arch | `darwin` / `arm64` |
| Node | `v20.19.6` |
| Node実体 | `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node` |
| Node SHA-256 | `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c` |
| ICU | `77.1` |
| locale / granularity | `ja` / `word` |
| 論理一時領域 | `/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T` |
| 実体一時領域 | `/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T` |
| 実process起動 | 実体パスを使用 |
| B4 v003正式検査の追加環境条件 | 固定TSXが内部IPC用Unix socketを作成できる環境を要する。socketは外部ネットワーク接続を伴わない。2026-07-25の承認済みネイティブ権限実行でもT082・T083は終了code 2のままで、この能力の成立は未確認 |

productionの主要3ファイルは最終限定修正で変更していない。

| 処理上の意味 | SHA-256 |
|---|---|
| packageの生成・検査 | `db3b5968207479d8f6849c9995224140b8286844ed1c17b1e75c89ac718bf224` |
| 正式runner | `1a1537f279cf8b69a90b4236e69a048e7bec2d1118f1819e5bad807373c8cbff` |
| 描画信頼情報の読取 | `bedb4d9e66622372d9a564b26006dbb7b6cc689db86fd353ad8b7187ca3079de` |

## 9. 安定点3条件

| 条件 | 結果 |
|---|---|
| B2で事前登録した全検査 | **合格**。133/133、155/155、21/21、50/50、preflight 17/17 |
| 既存の正式成果物を現物から再計算したhash | **一致**。基礎映像4件、残存発話3件を再照合 |
| `DECISIONS.md`と`docs/HANDOVER.md` | **本完了記録と同じcommitで同期** |

再計算した正式成果物:

| 成果物 | SHA-256 |
|---|---|
| 基礎映像 | `c0677893902b5a1eaf79b2a3937d67a477f270810200f7c6c01457b42b803c48` |
| frame時間対応表 | `802f570dd4f8ea90ef63b0b9afb9a026abf0b18e43e51f2aab51bd62c2180fec` |
| 基礎映像の生成記録 | `e06a606e7348a8c30a743edd9acd5da96e035125b2b69a33257d0c31cf9b81db` |
| 基礎映像の検査記録 | `e906b4424609176d019ddc4c8d314df056feb87de1e993bf84f247eff5c21079` |
| 残存発話354件 | `8656549ec3fbbc0fb9447be7b9c2e784d22ebd18f08ee3e24c474ee62225c6d3` |
| 残存発話の生成記録 | `18094dd3729eead88c498f997e883253a1481ee8a33279882350aacfcf869cf1` |
| 残存発話の検査記録 | `be32244280a2564eda9a716a83d04da38f241120a6d2ba40e72e867072fc2ae6` |

発行する安定点タグは`stable/b2-complete-20260725`。`JOURNAL.md`の同名entryをタグ対象commitへ同時に入れる。

このタグへ撤退すると、B2より後に作る正式7ファイル、prompt、Gemini回答、表示計画、指示書、描画を失う。タグ発行時点ではこれらはまだ存在しないため、撤退で失う完成動画はない。

## 10. 未実施と次の停止点

未実施:

- candidate 13の正式7ファイルpackage生成。
- prompt台帳登録と実行payload。
- Geminiまたは他LLMの実走。
- 正式表示計画、演出指示書、解決package。
- 基本テロップの描画と人間の「読める・ズレない・欠けない」確認。

次はB3として正式source-only packageを1件だけ生成する承認判断へ戻す。B3ではGeminiを実走しない。正式package生成後に、表示計画契約、prompt登録、実測tokenに基づく費用申告、Gemini run 1をそれぞれ既存の停止点どおり別承認へ進める。

## 11. 人間作業量

- 本完了まで: 0件。
- 次: B3生成承認1件。媒体視聴なし、時間計測なし。
