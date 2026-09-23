# OpenChatCut研究 — Checkpoint 1：対象版・導入条件

確認日：2026-09-15（日本時間）。状態：**導入条件の静的確認完了。インストール・起動は未実施。Checkpoint 1 で停止。**

## 1. 結論と今回の範囲

OpenChatCutは、ZEV自身が演出の自動配置と一件単位の後修正を持つための研究対象とする。製品の制作フローやproduction dependencyへの採用を提案する報告ではない。

今回の指示書§11に従い、対象版、起動方法、必要依存、外部通信、APIキー要否、使用範囲までを確認した。字幕・motionの内部構造、自動判断、少数実機試験、ZEVへの実装提案は次のcheckpointで扱う。今回、それらへ着手していない。

**標準起動をそのまま実行すると、外部通信や既存認証の取り込みが発生し得る。** キー未設定での編集を公式は説明しているが、「外部通信なし」「ユーザーの既存認証から隔離済み」と同じ意味ではない。依存追加は指示書§13の事前承認事項であり、今回は導入せず条件を承認窓口へ返す。

## 2. 研究対象を固定する

| 項目 | 確認結果 |
| --- | --- |
| 公式repository | [0xsline/OpenChatCut](https://github.com/0xsline/OpenChatCut) |
| 今回読んだsource commit | `8411023f8411f3c16538c3dab8fee4b7f9e97661` |
| そのcommitの時刻 | 2026-09-15 10:58:39 UTC |
| sourceのpackage表示版 | `0.2.14` |
| 取得時点の最新公開release | `v0.2.14`、2026-09-04公開 |
| release tagが指すcommit | `b6b842a8e4576a74289386f74a19ac3d5ebefff4` |
| 上流のライセンス表記 | `AGPL-3.0-or-later` |
| 今回の入手・起動状態 | 公開コードをGitHub connectorで読取。OpenChatCut本体のclone、依存導入、起動なし |

**表示版は同じでも、今回のsourceと公開インストーラーは別のcommitである。** この報告のコード所見は上記source commitについてのものとする。今後も同じcommitの読取を推奨し、公開インストーラーの動作へそのまま一般化しない。

根拠：[source commit](https://github.com/0xsline/OpenChatCut/commit/8411023f8411f3c16538c3dab8fee4b7f9e97661)、[package](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/package.json#L1)、[release](https://github.com/0xsline/OpenChatCut/releases/tag/v0.2.14)、[tag参照先](https://api.github.com/repos/0xsline/OpenChatCut/git/tags/b9cb9c9ae036661bc902a36aae158ece574bd6eb)。ライセンスは表記の確認だけで、再利用可否の法的判断は行っていない。

## 3. 起動方法・必要依存とこのPCの状態

公式のsource起動手順は、repository取得、依存導入、環境設定ファイルの用意、開発サーバー起動である。公式コマンドは `npm install` と `npm run dev`、案内URLは `http://localhost:5199`。ここでは手順の記録にとどめ、実行していない。[公式手順](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/README.md#L257)

| 必要なもの | 上流コード上の条件・用途 | 今回の確認 |
| --- | --- | --- |
| Node.js | 24系、24以上25未満 | 現シェル20.19.6、nvm内18.20.8/20.19.6、別の既存実行ファイル23.7.0。確認した場所に24系なし |
| package manager | 公式はnpm、上流の起動前処理にもnpm呼出しあり | ZEV規則はpnpm固定。既存pnpmは10.28.0。置換起動を検証した事実はない |
| 画面・開発環境 | React 19、Vite 8、TypeScript 6、tsx | OpenChatCut用の依存導入なし |
| 描画環境 | Remotion 4.0.509関連package、FFmpeg/FFprobe、書出し時のブラウザ | PCのFFmpeg/FFprobe実行ファイルは存在。OpenChatCutがそれらを使えるかは未確認 |
| 推論関連 | ONNX Runtime、MediaPipe等がpackageの依存に含まれる | 推論・モデル導入なし |
| macOSの通常起動準備 | Whisper CLIがなければwhisper.cppの取得・CMake buildへ進む | CMake buildなし。今回STTは使わないが、通常起動の前処理に含まれる |
| desktop版 | Electron 43が開発依存に含まれる。別途desktop起動手順あり | desktop版は今回使用対象外。ZEVへElectronを追加しない |

通常の開発起動は、まずモデル準備と音声認識CLI準備、カタログ照合を行い、その後に開発用profileを作ってViteを起動する。profileはユーザー領域の `.openchatcut/dev-profiles/` に作られ、親プロセスの環境設定も引き継ぐ。画面は自動でブラウザを開く設定なので、将来起動する際はEdgeを使う条件も満たす必要がある。[起動script](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/package.json#L14)、[profile準備](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/scripts/dev-profile.mjs)、[サーバー設定](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/config/vite.config.ts)

OpenChatCut名のdirectoryはworkspace、ユーザーdirectory、`/private/tmp`の浅い範囲、アプリは `/Applications` とユーザーのApplicationsで未発見。PC全体の未導入を断定する検索ではない。退避folderは調べていない。

## 4. APIキーと外部通信

### キー要否

公式READMEでは、クラウドサービスのキーがなくてもローカルのタイムライン編集と内蔵機能を使えると説明している。起動設定のコードも、キーを持つ機能を個別に有効化する構造である。**これは文書・コード上の確認であり、実機起動の成功報告ではない。** [公式のキー説明](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/README.md#L275)

### 起動または操作に付随する通信・認証作用

| 処理 | 条件と送受信・ローカル作用 | 今回の扱い |
| --- | --- | --- |
| 依存導入 | package registryやバイナリ配布元からの取得が必要になる | 未実施。導入と取得範囲は承認待ち |
| 人物・顔検出モデル準備 | 通常起動前に、モデルが未存在または内容不一致ならGoogle Storageから取得する | 未実施。無料でも外部通信がある |
| 音声認識CLI準備 | macOSで既存CLIを解決できなければGitHubからwhisper.cppを取得しbuildする | 未実施。STTを使わない意図だけではこの前処理は除外されない |
| 更新確認 | ホーム画面の表示からGitHubの最新release情報へ自動GETする | APIキー不要。未起動なので実送信なし |
| 既存Codex認証の取り込み | 初期画面のCodex状態確認から補助プロセスを起動する経路がある。専用側に認証がなければ通常のCodex保存先から認証ファイルをコピーする | 公開ソースだけを確認。ユーザー認証の読取・コピーは一切実施していない |
| Codexモデル一覧 | CLIがあり、取得したアカウントがAPI key型以外なら一覧を要求する | CLI内部の外部通信は未検証。既存認証を使わせない隔離が必要 |
| 書体 | 初期UIの同梱書体はローカル。同梱されないGoogle Fontsを選ぶと追加の書体ロードへ進む | 追加書体を使う実機試験なし。依存ライブラリ内の通信先は未検証 |
| 書出し用ブラウザ | 開発起動wrapperは既存の対応ブラウザを探すが、その段階のdownloadは抑止する。後段rendererの必要時取得は別である | render未実施。起動確認と書出し条件を混同しない |
| AI・生成・外部素材・クラウド保存 | provider等の設定・各機能の実行に応じて外部接続する経路を持つ | 今回すべて使用しない |

重要な根拠：

- [モデル準備](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/scripts/sync-mediapipe.mjs#L20)、[Whisper準備](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/scripts/sync-whisper-cli.mjs#L264)
- [ホーム画面](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/components/Dashboard.tsx#L16) → [更新通知の初期処理](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/ui/UpstreamUpdateNotice.tsx#L25) → [更新情報取得](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/ui/upstreamUpdate.ts#L108)
- [初期画面のbackend確認](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/app/appShell.ts#L69) → [ローカルCodexの起動入口](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/server/plugins/codex-agent.ts#L143) → [認証コピー処理](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/server/codex/app-server.ts#L234)
- [追加書体](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/src/fonts/googleFonts.ts#L69)、[既存描画ブラウザの探索](https://github.com/0xsline/OpenChatCut/blob/8411023f8411f3c16538c3dab8fee4b7f9e97661/scripts/dev-profile.mjs#L199)

したがって、空の環境設定ファイルを置くだけの起動は推奨しない。起動を承認する段階で、既存認証・親環境の継承を防ぐ方法、事前取得物、実行中の通信制限、保存場所、Edge利用を具体化する必要がある。今回これらの隔離機構を新設したり、OpenChatCutやZEVを改変したりしていない。

調査した起動入口に専用telemetry実装は見つからなかったが、依存ライブラリを含む全通信の監査ではない。「telemetryなし」「完全offline可」とは断定しない。

## 5. 今回使う機能・使わない機能

| 範囲 | 扱い |
| --- | --- |
| Checkpoint 1で実際に使ったもの | 公開コード・文書の読取、ローカル実行環境の読取、Git差分確認、報告書作成 |
| 次の承認後に読む予定のもの | 字幕の本文と見た目、時間からのmotion計算、保存と局所変更、preview/renderの関係。その後にAIの配置判断を別checkpointで調べる |
| 必要と判断・承認された場合だけ実機で使うもの | 少数の字幕style・部分強調・motion・追加削除・保存再読込。まず合成テキスト等で必要性を切り分け、ZEV素材利用は限定箇所だけとする |
| 今回使わないもの | 内蔵/外部AIによる制作、STT、候補の選び直し、保持区間変更、全編編集、クラウド生成・アップロード、外部素材取得、desktop版、汎用NLEとしての評価 |

今回はZEVの成立済み素材を読み込んでいない。字幕本文・順序・時刻・確定ID、採用箇所、元動画対応、基礎映像、renderer、来歴の変更・再生成は0件。

借りるものの三分類はCheckpoint 2以降の実物調査を根拠に確定する。現時点では①設計思想と②独自実装の候補は未判定、③OpenChatCut本体の製品依存・汎用NLE・自由な毎動画JSX制作は今回の対象外である。コード、Skill本文、素材、presetの転載・取り込みは0件。

## 6. 検証結果と限界

- 公開repositoryの固定commit、package、最新releaseとtagの参照先を読取で照合した。
- 起動script、開発profile、サーバー設定、更新通知、認証取り込みの呼出経路を静的に確認した。
- Node.js、pnpm、FFmpeg/FFprobeの所在、既存アプリの限定検索を行った。
- 初回のshellによる公開Git参照読取はDNS制限で終了code 128。GitHub connectorの読取で情報を取得した。依存取得の失敗・アプリ起動失敗ではない。
- 実機起動、通信capture、字幕操作、保存再読込、preview/render比較、動画生成、STT、外部AI推論は未実施。
- 調査の公開GitHub読取、報告のGit保存、指定相談先へのテキスト報告を、OpenChatCutの処理通信とは分ける。有料API・生成APIの呼出し0回、今回追加費用US$0、動画・音声・ZEV成果物のクラウドアップロード0件。
- 本文は調査報告のみで、ZEV実装やテストの変更を含まない。アプリの既存テストは再実行していない。報告差分、保存対象、既存差分の保全、保存後のbyte一致を確認して納品する。

## 7. Git運用と保存対象

作業開始時のZEV作業ツリー：

| 項目 | 状態 |
| --- | --- |
| 作業中branch | `codex/digest-effects-step2` |
| 作業中HEAD | `43380006bc4f8e1c902c067dcb53669790b6ce2c` |
| GitHub上で確認した既存branchの先端 | `9f8fb04ac440c69466708e7ea529190b573f1089` |
| 既存の未push commit | 上記HEADの1件。前作業の演出architectureレビュー報告。今回対象外 |
| 既存tracked未commit差分 | `docs/policies/PRODUCTION_QC_LAYER_POLICY_v001.md`、15追加・1削除。今回対象外 |
| 既存staged差分 | 0件 |
| 既存untracked | 59,152 file、すべてevals配下。今回対象外 |

本報告だけを `codex/openchatcut-research-cp1` に監査checkpointとして保存する。基点はGitHub確認済みの `9f8fb04ac440c69466708e7ea529190b573f1089` とし、今回対象外の未push commitを含めない。元作業ツリーは切り替えず、一時的なローカル共有cloneで本報告だけをcheckoutして保存する。

保存対象は `docs/reports/openchatcut-checkpoint1-20260915.md` の1 fileだけ。公開OpenChatCutコード、動画、cache、依存directory、初期Git状態の大量一覧、既存未commit差分を含めない。承認記録、Goal、work-order、実装、tag、mainへのmerge、releaseは変更しない。

本報告自身のcommit SHAとpush結果は、確定後のcheckpoint送信と最終回答へ記載する。元作業ツリーに残す同内容の報告書コピーは、そのbranchでは未追跡だが、研究branchへ保存済みの内容と照合する。これは保存漏れと既存の未追跡成果物を混同しないための扱いである。

## 8. ZEV進行管理4への判断依頼

宛先：[ZEV進行管理4](https://chatgpt.com/g/g-p-6a8aab6b92308191b44f77a03945fed4/c/6aa7f7e5-03d8-83ee-aae1-6c4b66fb8303)。今回のSkillは [chatgpt-workflow](/Users/kawafmm/.codex/skills/chatgpt-workflow/SKILL.md)。依頼されたcheckpoint報告にのみ使用する。新しい指示書の生成依頼やモデル変更は行わない。

**推奨案：次は同じsource commitを対象に、導入を伴わないCheckpoint 2の読取調査を行う。起動は必要性を確認してから別途承認する。**

判断事項は、Checkpoint 1の受理と、上記条件によるCheckpoint 2の続行可否。依存追加、標準起動に含まれる取得・認証継承、既存認証を使う外部AI、素材送信を今回の続行に含めない。実機確認が必要になった時点で、導入対象と隔離方法を具体的に提示する。

ユーザー本人への素材確認・目視・操作依頼は今回0件・0分。相談先の判断を受けても、このcheckpointの結果と応答を報告していったんturnを終了する。

## 9. Checkpoint 1の送信・応答記録（2026-09-16追記）

調査本体を `5139bd3cf5e2f12ad0c471167625641ffd28a1ae` にcommitし、`codex/openchatcut-research-cp1` へpush済み。GitHubから報告を読戻し、ローカルcommitのblobと一致を確認した。監査対象の報告本文SHA-256は `031b57b04a9516c966f1aba1dbdea0e6b4e34000fec4b6720270d4b2c3828c95`。

Edgeの「ZEV進行管理4」へ要約・監査commit・報告へのリンク・続行判断依頼を送信した。対象会話への表示と応答を確認済み。モデル条件の指定はなく、UIの選択は「最新」、思考量は「極高」のまま維持した。新規指示書の依頼、モデル切替、更新・再生成・再送は0回。

相談先の回答：**Checkpoint 1を受理し、同じsource commitのCheckpoint 2静的読取調査を承認。導入・起動は未承認。** 回答は、監査commitが報告1件だけの追加であることと、上流packageの版・ライセンス表記・Node条件・起動前処理を確認したと述べている。

次工程の範囲として、依存導入、Node導入、build、dev server起動、アプリのtest実行、外部AI・有料API、ユーザー認証や環境変数の読取・コピー、OpenChatCutコードの実行・ZEVへの転載を含めないことが示された。Checkpoint 2の対象は字幕・部分style・発話中のstyle・motion・時刻駆動・preview/render・保存の関係と、一件単位の自動演出と後修正へ応用できる考え方。Checkpoint 3や実機試験へ自動で進まず、再び報告して停止する。

元作業ツリーの未追跡報告コピーは、監査対象commitとbyte一致する状態のまま保持するよう回答された。この応答記録は研究branch側の報告にだけ追記し、元作業ツリーのコピーは変更しない。元の既存差分、59,152件の未追跡群、既存HEADも保持する。

本回答をkawafmmの新しい第1層承認や着工範囲の拡張へ読み替えない。**本turnではCheckpoint 2を開始せず、Checkpoint 1で終了する。** 本追記のcommitは応答と送信結果の保存だけで、監査対象だった§1〜8の調査結果を変更しない。
