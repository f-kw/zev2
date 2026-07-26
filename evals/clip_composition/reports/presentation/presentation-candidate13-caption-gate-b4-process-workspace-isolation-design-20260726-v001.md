# candidate 13 B4 別process検査workspace隔離 設計 v001

- 日付: 2026-07-26
- 対象: 意味回答側検査131
- 状態: kawafmmの2026-07-26一括承認に基づく限定実装前設計
- 人間作業: 0件

## 1. 目的

別processでproduction CLIを起動する検査131を、検査所有の一時workspaceへ閉じる。
本番workspaceに既に存在する正式成果物の件数が増えても、合成検査の正常経路が
「正式出力先はまだ無い」という合成前提を維持できる状態にする。

production CLI、正式job、正式成果物へ検査専用の分岐や変更は入れない。

## 2. 実装前の読み取り専用観測

対象検査だけを再実行し、assertの直前で子processの終了状態・標準出力・標準エラーを
一時loaderから観測した。loaderは観測後に削除し、リポジトリは変更していない。

観測:

- 子process終了: 1
- 標準出力: 0 byte
- 標準エラー: 信頼済み失敗報告
- 失敗段階: Gate A入力文脈の検査
- 違反: `GATE_A_CONTEXT_INVALID` 1件だけ
- それより前のjob、実装、入力、実行環境の検査: 全て合格
- それより後の生成: 上流失敗により未実行

帰属:

**親processの合成ファイルシステム隔離が別processへ届かず、実workspaceに存在する
Gate A正式出力を子processが見たことだけが原因である。重なった第二原因は観測されない。**

## 3. 隔離方式

### 3.1 一時workspace

検査ごとにOSの一時領域へ一意なdirectoryを作る。一意性は同じ固定prefixに対する
原子的な一時directory作成で確保し、並行実行で同じpathを共有しない。

一時workspaceには、合成jobが正規のproduction経路で読む次の通常fileだけを、
元fileと同じrepository-relative pathへbyte同一コピーする。

1. package jobが束縛する実装3件
2. 表示幅方針6件
3. Gate A job
4. Gate A完了報告
5. Gate A jobが束縛する実装3件
6. Gate A jobが束縛する入力3件
7. 検査が生成するpackage job 1件

重複pathは一度だけコピーする。コピー対象はjobの束縛から導出し、
candidate 13の件数・素材ID・正式出力pathを隔離処理へ焼き込まない。

Gate A正式出力、B3正式package、そのほかの正式成果物はコピーしない。
これによりGate A jobが宣言する「正式出力先は不存在」を一時workspace内で自然に再現する。

### 3.2 正規入口だけを使う

コピーしたproduction runnerを、束縛済みNode実体から通常の
`node <runner> <job>`形式で起動する。

runnerは自身の配置から通常どおりworkspace rootを解決する。
検査専用引数、検査専用環境変数、production側の特殊モード、注入口は追加しない。
変えるのはCLIへ渡す通常のrunner path、job path、作業directoryだけである。

### 3.3 読み取り専用preflight値

一時workspace内のコピー済みproduction runnerを通常moduleとして読み、
既存の公開済み読み取り専用preflight入口から、その一時workspaceの開始状態を計算する。
その値を合成jobへ固定してから、別processのCLIを起動する。

preflightとCLIは同じ一時workspace・同じrunner byte・同じ入力fileを読む。
合成検査用の同等ロジックは作らない。

## 4. 正式成果物の不可侵

本番workspaceの正式成果物は読むだけで、退避・削除・改名・上書きを行わない。
一時workspaceへのコピー元fileも変更しない。

検査終了時は`finally`で検査所有の一時workspaceだけを再帰削除する。
本番workspace内のpathを削除対象へ渡さない。

## 5. 検査

検査131で次を確認する。

1. 一時workspaceは検査ごとに一意な実directoryである。
2. コピーした各fileは元fileとbyte同一である。
3. Gate A正式出力先は一時workspace内に存在しない。
4. 一時workspaceのproduction preflightが信頼済み投影を返す。
5. 通常jobの別process実行が終了0、標準エラー0 byte、信頼済み合格報告となる。
6. Gate A期待hashだけを壊したjobの別process実行が終了1、標準出力0 byte、
   所定の`EVIDENCE_EXPECTED_HASH_MISMATCH`だけを返す。
7. 両実行とも、本番workspaceの正式成果物は変更しない。
8. 終了時に一時workspaceが削除される。

限定修正後は意味回答側133件を先頭から一回だけ実行する。
133/133の場合だけ、承認済み順序に従い回帰95件、candidate 13 preflight v002へ進む。
一件でも不合格なら同attemptで直さず停止する。

## 6. 恒久性

隔離対象は現在存在する正式成果物の一覧ではなく、合成jobが読む束縛入力の閉集合から作る。
したがって、B5以降や別素材で正式成果物が増えても、それらを一時workspaceへ暗黙コピーせず、
合成検査は自前の開始状態だけで完結する。

この設計が対象にするのは別process経路である。同process経路は
commit `265cc3e6`の合成ファイルシステム隔離を引き続き使用する。

## 7. 観測性の残件

今回、正式TAPには子processの終了1だけが残り、内側の違反は追加の読み取り専用診断まで
分からなかった。これは登録済みfatal観測性課題と同根の実害例としてB4完了記録へ加える。
本修正では診断表示契約を変更せず、隔離修正と観測性改訂を混ぜない。
