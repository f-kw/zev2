# ZEVO字幕品質v002 atomic runtime v006 製造・機能ゲート記録 v001

- 実行日時: 2026-08-11T17:47:15+0900
- 対象追補: atomic runtime LC_UUID互換性 最小追補v006
- 追補SHA-256: `bd4b52901081c418b5c5ebe6a71ba4a02895fde3c86223ec433653af53530e1e`
- 結論: v006五条件 5/5 passed。v004 §10第3手のnative成功・late collision実発火まで成立
- 外部通信: 0回
- 費用: US$0
- S→A→L→P→R→F→U、正式46件、API通信、描画: 未実施

## 1. 正本・開始証拠

| 対象 | 観測 | 判定 |
|---|---|---|
| v006文書 | 条件付き承認6項目 6/6、proof 7置換7、検査ID46、proof総数489 | passed |
| 旧runtime SHA | `15f73dcf286ebed88300bb7ad8366f2b31631288816ceb4c9edd3f509d71e02c` | v005 preflight停止報告とv006へ不変保持 |
| JavaScript共用入口 SHA | `7dac5ada527c2f73b08c385a119e921c1e3777054b99c5679175a1b8b00e41c6` | 不変 |
| native source SHA | `6c237ceac499a83db74324165d630e14857a86165267cdbbc88c46b92c01150c` | 不変 |
| path集合 | 既存17 pathのpath #17だけを同じpathで置換 | 18 path目0件 |

旧runtimeの物理byteを別pathへ複製していない。旧SHA、起動前拒否、出力名違いによる最初の測定誤りと訂正は、停止報告に残したまま変更していない。

## 2. toolchain来歴

| 項目 | 実測値 |
|---|---|
| OS | macOS 26.5.1、build 25F80 |
| architecture | arm64 |
| compiler | `/usr/bin/clang` |
| compiler SHA-256 | `179301dcb41ea78accc3fa0048a7e6f6710d891945a751a34addd622020c1818` |
| compiler version | Apple clang 21.0.0 (`clang-2100.1.1.101`)、target `arm64-apple-darwin25.5.0` |
| linker | `/Library/Developer/CommandLineTools/usr/bin/ld` |
| linker SHA-256 | `765e5fa4e30980ddf2803c8a973b20fcc63e403098d2dd9b6cefa38e0cde3c2e` |
| linker version | ld-1267、build `18:30:29 Apr 22 2026` |
| SDK | `/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk`、version 26.5 |
| SDK header witness | `usr/include/stdio.h` SHA-256 `d2220614f42d3cb678ae0de176ba0ab3256e15fb45b3efdb5d17b8ac1f6a4b54` |
| source SHA-256 | `6c237ceac499a83db74324165d630e14857a86165267cdbbc88c46b92c01150c` |
| deployment target | 11.0 |
| formal basename | `presentation_atomic_directory_publish_v001-darwin-arm64` |
| filesystem | APFS（workspace deviceのDiskManagement実測） |

byte同一の保証は上表の実体集合とOSに限定する。別toolchain・将来OSへ一般化しない。

## 3. compile入力

v004固定入力との差は`-Wl,-no_uuid`の除去一件だけである。追加flag、UUID値指定、後付け署名、binary patch、手編集、別linker、fallbackは0件。

```text
/usr/bin/clang
-std=c11
-O2
-Wall
-Wextra
-Werror
-arch arm64
-isysroot /Library/Developer/CommandLineTools/SDKs/MacOSX.sdk
-mmacosx-version-min=11.0
-o evals/clip_composition/presentation_atomic_directory_publish_v001-darwin-arm64
evals/clip_composition/presentation_atomic_directory_publish_v001.c
```

新版formal runtime SHA-256は`ba5067dd933ae9b1213ab39236bf07c7e87513afbb384643347cefe0a75084b3`、modeは0555。

## 4. 五条件の実測

| # | 条件 | 実測 | 判定 |
|---:|---|---|---|
| 1 | 同一basename独立二回buildとformal runtimeのbyte同一 | 隔離A=隔離B=formal、新SHA三者一致 | passed |
| 2 | `LC_UUID` exact 1件 | formal Mach-Oで1件 | passed |
| 3 | 親環境0件対照でC source終了25 | exit 25、signal null、stdout 0 byte、stderr 0 byte | passed |
| 4 | JavaScript共用入口経由APFS正常公開 | `published`、成果物byte一致、staging不存在 | passed |
| 5 | late collision実発火 | native exit 20、`late-target-exists`、target identity・empty不変、staging identity・byte保持 | passed |

合計5/5。simulated child、直接rename、別wrapperを合格へ数えていない。

## 5. 実行中の訂正履歴

### 5.1 formal出力の書込み権限

最初のcompile commandは、旧runtimeがmode 0555であるためlinkerが出力を開けず、binary製造前に終了した。旧runtime SHAが不変であることを確認後、同一path置換の準備としてowner書込みだけを一時許可し、v006固定commandを一回実行、完了後にmode 0555へ戻した。compile flag・source・basenameの差は0件。

### 5.2 filesystem種別の測定

最初に用いたmacOS `stat -f %T`はfilesystem名ではなくdirectory種別`/`を返したため、機能処理を実行する前に測定を停止した。次にDiskManagementへdirectory pathを直接渡した呼出しもdisk指定不成立で、機能処理前に停止した。

workspaceのdeviceを既存mount表から特定し、そのdeviceをDiskManagementで読んでAPFSを確定した。その後に共用入口の機能処理を一回だけ実行し、正常公開とlate collisionを同じ実native経路で観測した。前二回はnative helper・prepare・commitを実行しておらず、機能retryには数えない。誤った測定結果は上書きせず本節へ残す。

## 6. bindingと数量

| 項目 | v006後 |
|---|---|
| implementation binding件数 source/B5/B6/selection/proof | 36 / 11 / 19 / 41 / 51 |
| approved contract binding件数 source/B5/B6/selection/proof | 5 / 5 / 6 / 7 / 7 |
| code | 49 |
| 検査ID | 46 |
| proof item | 489 |

implementation bindingはrole/path/件数を変えず、atomic native runtime roleのSHAだけを新版へ置換する。approved contractにはv006を全formal jobへ一件追加する。既存proof 7件をV6 7件へexact置換するため証明消失・総数増減は0件。

## 7. 現在地

| 工程 | 状態 |
|---|---|
| v006起草・6条件監査 | 完了 |
| DECISIONS承認記録 | 完了 |
| 新runtime製造 | 完了 |
| v004 §10第3手の五条件 | 5/5 passed |
| S局所ゲート | 未開始。本裁定範囲外 |
| A局所ゲート | 未開始 |
| L→P→R→F→U | 未実装 |
| 正式46件 | 別承認、未実施 |
| API通信・描画 | 別承認、未実施 |

次の再開点はv004 §10第4手のSである。既存順序S→A→L→P→R→F→Uを変えない。
