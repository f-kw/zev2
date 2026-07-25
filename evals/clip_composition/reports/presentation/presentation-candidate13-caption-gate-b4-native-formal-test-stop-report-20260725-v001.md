# candidate 13 字幕表示計画 B4 ネイティブ正式検査 停止報告 v001

- 日付: 2026-07-25
- 対象: B4正式合成検査85件
- 状態: **83/85で停止**
- 再実行: 0回
- コード・fixture・契約・期待値の変更: 0件
- 人間作業: 0件

## 1. 結論

kawafmmの承認に基づき、制限sandbox外として申請したネイティブ権限の実行で、
固定済みの正式85件を先頭から一回だけ実行した。

結果は83/85だった。

- T082: 正常経路で期待した終了code 0に対し、実測は2
- T083: 契約不成立経路で期待した終了code 1に対し、実測は2
- T084: 使い方不成立の終了code 2は合格
- その他82件: 合格

承認済み停止条件に従い、同じattemptでの原因観測、修正、再実行は行っていない。
回帰95件、candidate 13読み取り専用preflight、B4完了報告、安定点tag、
`JOURNAL.md`追記、B5承認依頼の起草にも進んでいない。

## 2. 実行した正式command

```text
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node --test evals/clip_composition/test_presentation_caption_display_pair_v003.mjs
```

実行時にpreload、loader差し替え、環境flag、socket回避設定、検査対象の限定を追加していない。
検査ファイル、production runner、fixture、期待終了codeも変更していない。

## 3. 実行環境

実行直前に正式jobの固定値と実byteを照合した。

| 項目 | 実測 | 固定値との関係 |
|---|---|---|
| 実行日 | 2026-07-25 JST | 記録値 |
| 実行直前の記録時刻 | `2026-07-25T17:47:16+0900` | 記録値 |
| platform / arch | macOS `26.5.1` build `25F80` / `arm64` | 記録値 |
| Node | `v20.19.6` | 一致 |
| Node実体 | `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node` | 一致 |
| Node SHA-256 | `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c` | 一致 |
| TSX | `4.22.3` | 一致 |
| TSX実体 | `/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/cli.mjs` | 一致 |
| TSX SHA-256 | `5c916fa6ecad44aedbb01ca5815536d00ea07de6b73eeb9443d317326b0218d8` | 一致 |
| esbuild | `0.28.0` | 一致 |
| esbuild入口SHA-256 | `41abefec8704d24e069532fb38a418905d16f8fee4da88e54ecd65adc71f5507` | 一致 |
| esbuild binary SHA-256 | `6f0e1237f63fa3bc03963e58f0b0be1b9bfacd8f2dc9a3f28483e8f97e4ef2d6` | 一致 |
| 論理一時領域 | `/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T` | 既存環境記録と一致 |
| 実体一時領域 | `/private/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T` | 既存環境記録と一致 |
| 実行権限 | Codexからネイティブ権限を明示要求して起動 | sandbox実行との差分 |

Node、TSX、esbuildの同一binary原則は満たした。変更したのは実行権限だけである。

TSXが作るUnix socketはTypeScript実行器のprocess間内部通信に使うものであり、
外部ネットワーク接続ではない。

ただし、今回の結果だけから「実行した環境でUnix socket作成が実際に成立した」とは認定できない。
正式検査はT082・T083で再び終了code 2を返しており、assertより内側のstdoutと停止位置は
このattemptでは観測していない。前回と同じ`EPERM`だったか、別のfatalだったかを推測で確定しない。

## 4. 検査結果

| 検査群 | 結果 | 判定 |
|---|---:|---|
| B4正式合成検査 | 83/85 | 不合格 |
| 69違反codeの個別検査 | 69/69 | 合格 |
| T080 正常な5成果物の組立 | 合格 | 合格 |
| T081 同一入力のbyte決定性 | 合格 | 合格 |
| T082 正式CLI正常経路 | 終了2、期待0 | 不合格 |
| T083 正式CLI契約不成立経路 | 終了2、期待1 | 不合格 |
| T084 正式CLI使い方不成立 | 終了2、期待2 | 合格 |
| production入口・fixture注入口禁止 | 合格 | 合格 |

85件全体のTAP要約:

```text
tests 85
pass 83
fail 2
cancelled 0
skipped 0
todo 0
```

## 5. 変更・後続の有無

正式検査により、次の対象に作業差分がないことを確認した。

- B4表示計画の組立・検査処理
- 正式runner
- 読み取り専用preflight runner
- B4合成fixture
- v003字幕検査
- v003指示書検査

後続は次の状態である。

| 後続 | 状態 |
|---|---|
| 回帰95件 | 未実行 |
| candidate 13読み取り専用preflight | 未実行 |
| B4完了報告 | 未作成 |
| `stable/b4-complete-20260725` | 未発行 |
| `JOURNAL.md` B4 entry | 未追記 |
| B5承認依頼 | 未起草 |

最新の検証済み撤退点は引き続き`stable/b3-complete-20260725`である。

## 6. 次に必要な判断

本attemptから確定したのは「同じ固定binaryをネイティブ権限として起動しても、
正式CLI正常・契約不成立の二経路が終了code 2のままだった」ことまでである。

次へ進む場合は、正式85件を再実行せず、T082・T083が受け取ったstdoutと
TypeScript実行器の停止位置だけを読み取り専用で確定する別承認が必要である。
その観測で、Unix socket作成能力が実際には成立していなかったのか、
ネイティブ移行後に別のfatalが現れたのかを分ける。
