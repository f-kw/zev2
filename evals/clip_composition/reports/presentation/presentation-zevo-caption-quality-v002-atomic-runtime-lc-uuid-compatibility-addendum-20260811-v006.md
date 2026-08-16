# ZEVO字幕品質v002 atomic runtime LC_UUID互換性 最小追補 v006

- 日付: 2026-08-11 JST
- 状態: kawafmm条件付き起草承認に基づく正本候補。§10の一致監査成立時だけ承認発効
- 対象: path #17 native runtimeの固定compile入力と実行前機能ゲート
- 外部通信: 0回
- 費用: US$0
- S→A→L→P→R→F→U、正式46件、API通信、描画: 本書の実行範囲外

## 0. 結論

追補v004 §3の固定compile commandから`-Wl,-no_uuid`だけを除く。他のflag、source、SDK指定、deployment target、正式basenameは一byteも変えない。UUIDは固定linkerが生成した値をruntime byteの一部としてそのまま使い、後付け、手編集、binary patch、別toolによる加工を禁止する。

新版runtimeは現行path #17を同じpathで置換する。18 path目は作らない。旧runtimeのSHA-256 `15f73dcf286ebed88300bb7ad8366f2b31631288816ceb4c9edd3f509d71e02c`と失敗観測は、`ZEVO字幕品質v002 v005実装 atomic runtime preflight停止報告v001`に保持し、削除・上書きしない。旧runtime byteを別pathへ複製して18 path目を作ることは証拠保持に含めない。

同一basename独立二回build byte同一、`LC_UUID` exact 1件、親環境0件対照でC source所有の終了25、JavaScript共用入口経由のAPFS正常公開、実native late collisionの五条件が全て成立した場合だけ、v004 §10第3手を完了とする。成立後の再開順はS→A→L→P→R→F→Uで変えない。

## 1. 正本と適用順

| 種別 | SHA-256 | 扱い |
|---|---|---|
| 親契約 | `33b61ee497d765fbe9eb63fb1b05bce16a99488d238eb27b732550b4daac24ba` | 不変 |
| 完全実装設計v001 | `44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4` | 不変 |
| 累積追補v002 | `a3c8c3ef8e57cd557e4a7cae17ecc188dc523df1508a45de6e2bce36691c7e4d` | 不変 |
| 実値配線追補v003 | `632aa7fdec88da47fe8639fb10f74f390aa0cc5f191a114b797c08115bee4c9e` | 不変 |
| atomic公開・B6所有追補v004 | `39e7c9b9005fb8ec762c19c0e6fde86acb398f1e99c75dd5d7100eabf452eade` | 本書が固定compile command、runtime SHA、contract binding件数、該当proofだけを上書き |
| B6 credential追補v005 | `573b705f80935ba0015a2f509371f17911d6aa0ea2fd7130b097ed98262b07dd` | 不変 |
| v005 atomic runtime preflight停止報告 | `7aa38bbe6cad8279baa6ccfa4688134dd067a8b39f642a43f981cb70ebfa421d` | 旧runtime SHAと失敗・訂正履歴の不変証拠 |

適用順は、親契約→完全実装設計v001→累積追補v002→実値配線追補v003→追補v004→追補v005→本書とする。本書承認時の実測SHAはDECISIONSへ記録し、§6のformal jobへrole `caption-quality-atomic-runtime-lc-uuid-compatibility-addendum`として束縛する。

## 2. compile入力のexact差分

### 2.1 旧入力からの差分

削除する引数はexact一件だけである。

```text
-Wl,-no_uuid
```

追加flagは0件である。UUID値の指定、固定UUID、後付け署名、`install_name_tool`、`vtool`、`codesign`再実行、hex編集、別linker、別compiler fallbackを禁止する。

### 2.2 新しい固定command

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

source SHAは`6c237ceac499a83db74324165d630e14857a86165267cdbbc88c46b92c01150c`で不変、正式basenameは`presentation_atomic_directory_publish_v001-darwin-arm64`で不変である。隔離候補二回の実測から、新runtimeの期待SHA-256を`ba5067dd933ae9b1213ab39236bf07c7e87513afbb384643347cefe0a75084b3`へ固定する。正式pathへの一回製造後、この期待値と一致しなければ同attemptで受理・再製造せず停止する。

## 3. 再現性の保証境界とtoolchain来歴

byte同一を保証する範囲は次の実体集合とOS上だけである。別toolchainや将来OSで同じsourceから同じbyteになる一般保証は主張しない。

| 項目 | 固定実体・値 |
|---|---|
| OS | macOS 26.5.1、build 25F80 |
| architecture | arm64 |
| compiler path | `/usr/bin/clang` |
| compiler SHA-256 | `179301dcb41ea78accc3fa0048a7e6f6710d891945a751a34addd622020c1818` |
| compiler version | Apple clang 21.0.0 (`clang-2100.1.1.101`)、target `arm64-apple-darwin25.5.0` |
| linker path | `/Library/Developer/CommandLineTools/usr/bin/ld` |
| linker SHA-256 | `765e5fa4e30980ddf2803c8a973b20fcc63e403098d2dd9b6cefa38e0cde3c2e` |
| linker version | ld-1267、build `18:30:29 Apr 22 2026` |
| SDK path | `/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk` |
| SDK version | 26.5 |
| SDK header witness | `usr/include/stdio.h` SHA-256 `d2220614f42d3cb678ae0de176ba0ab3256e15fb45b3efdb5d17b8ac1f6a4b54` |
| source SHA-256 | `6c237ceac499a83db74324165d630e14857a86165267cdbbc88c46b92c01150c` |
| output basename | `presentation_atomic_directory_publish_v001-darwin-arm64` |
| deployment target | 11.0 |

製造時刻、上表、command全引数、新runtime SHA、`LC_UUID`件数、五条件の観測結果を版付きruntime製造・機能検査記録へ保存する。将来の再buildでは同じtoolchain実体をSHA照合してから実行し、正式basenameを含む同じ入力でもbyte不一致なら黙って受理、runtime SHA更新、再試行、別toolchain fallbackをせず停止する。

## 4. 新runtimeの五合格条件

次を一つのAND条件とする。一件でも不成立ならpath #17をformal jobへ束縛せず、Sへ進まない。

| # | 合格条件 | exact観測 |
|---:|---|---|
| 1 | 同一basename独立二回build | 別々の未使用隔離directoryへ§2.2で各一回製造し、二runtimeがbyte同一、かつ正式pathへ一回製造したruntimeともbyte同一 |
| 2 | `LC_UUID` | Mach-O load commandを構造読取し`LC_UUID` exact 1件。UUID値はlinker生成byteをそのまま保持し加工0件 |
| 3 | C source到達 | 親環境entry 0件、fd 3/4未供給、引数`source target`の対照でsignal終了ではなくC source所有の終了25、stdout/stderr 0 byte |
| 4 | APFS正常公開 | JavaScript共用combined入口を使い、兄弟stagingを実native一回で不存在targetへ公開し`published`、成果物byte一致、staging不存在 |
| 5 | late collision | 同じprepare結果の後に空targetを明示作成してcommitし、実native終了20、`late-target-exists`、target identity・empty不変、staging identity・byte保持 |

条件4・5は正式path #15の共用prepare/commit、正式path #17のnative runtime、正式classifierだけを使う。直接rename、別wrapper、simulated childを合格へ数えない。検査中は同じ監視領域へ並行書込みしない。

## 5. path #17の版付き置換と旧証拠

- path #15 JavaScript入口とpath #16 C sourceは変更しない。
- path #17だけを§2.2で同じformal pathへ一回製造し、mode 0555にする。
- 18 path目、旧runtime copy、backup binary、後付け加工用tool、別OS runtimeを作らない。
- 旧runtime SHA `15f73dcf286ebed88300bb7ad8366f2b31631288816ceb4c9edd3f509d71e02c`は停止報告と本書に不変保持する。旧runtimeの物理byteを別pathへ残すことは要求しない。
- 新runtime期待SHAは`ba5067dd933ae9b1213ab39236bf07c7e87513afbb384643347cefe0a75084b3`。formal製造、隔離A、隔離Bの三者一致を要する。

## 6. bindingのexact更新

### 6.1 implementation binding

role/path集合と件数は変えず、role `atomic-directory-publisher-native-darwin-arm64-v001`のfile SHAだけを旧runtime SHAから新runtime SHAへ置換する。

| formal job | implementation binding件数 |
|---|---:|
| source | 36 |
| B5 | 11 |
| B6 | 19 |
| selection | 41 |
| proof | 51 |

path #15と#16のSHAは追補v005開始時証拠から不変である。正式job作成時は三実体を改めてstable再読し、表の件数と新runtime SHAへ一致させる。

### 6.2 approved contract binding

本書はatomic runtimeの製造・実行保証に関係するため、source、B5、B6、selection、proofの全formal jobへ一件加える。

| formal job | v005後 | v006後 | exact contract構成 |
|---|---:|---:|---|
| source | 4 | 5 | parent、complete design、v002、v004、v006 |
| B5 | 4 | 5 | parent、complete design、v002、v004、v006 |
| B6 | 5 | 6 | parent、complete design、v002、v004、v005、v006 |
| selection | 6 | 7 | parent、complete design、v002、v003、v004、v005、v006 |
| proof | 6 | 7 | parent、complete design、v002、v003、v004、v005、v006 |

各構成はrole狭義昇順で保存し、本書role/path/SHAの不足・余分・不一致をdynamic import前の既存job invalid ownerへ写す。v003をsource/B5/B6へ、v005をsource/B5へ追加しない。

## 7. proof itemと検査ID

code集合49件、検査ID46件は増減0である。既存proof 7件をexact失効し、同じ所有IDのV6 proof 7件へ一対一置換するため、proof item総数489件も増減0である。

### 7.1 exact失効7件

| 失効ID | 理由 | 置換先 |
|---|---|---|
| `V4-ZCQ001-04` | source contract 4件を要求 | V6-ZCQ001-01 |
| `V4-ZCQ001-05` | UUID無し旧compile入力を参照 | V6-ZCQ001-02 |
| `V5-ZCQ007-01` | B5=4、B6=5を要求 | V6-ZCQ007-01 |
| `V5-ZCQ018-01` | selection contract 6件を要求 | V6-ZCQ018-01 |
| `V5-ZCQ018-02` | selection contract 6件の不正拒否を要求 | V6-ZCQ018-02 |
| `V5-ZCQ027-01` | selection contract 6件の公開直前照合を要求 | V6-ZCQ027-01 |
| `V5-ZCQ042-01` | proof contract 6件を要求 | V6-ZCQ042-01 |

表外proofを失効しない。V4のAPFS正常公開`V4-ZCQ005-01`とlate collision`V4-ZCQ005-02`は、本書§4条件4・5のownerとして維持する。

### 7.2 V6-PROOF-ITEMS-BEGIN

- V6-ZCQ001-01 | source implementation 36件のatomic runtime roleが新SHAへ一致し、approved contract bindingがparent、complete design、v002、v004、本書の5件へexact一致する
- V6-ZCQ001-02 | §3のtoolchain全実体をpath・SHA・versionで照合し、§2.2の同一basename独立二回buildとformal runtimeがbyte同一、新runtime SHA一致、LC_UUID exact 1件、親環境0件対照がsignalでなく終了25・stdout/stderr 0 byteとなり、後付け加工0件であることを実観測する。V4-ZCQ005-01/02とのANDで五条件全件を閉じる
- V6-ZCQ007-01 | B5 approved contract bindingがparent、complete design、v002、v004、本書の5件、B6がそれらとv005の6件へexact一致し、implementation 11/19件のatomic runtime roleが新SHAへ一致する
- V6-ZCQ018-01 | selection implementation 41件とapproved contract 7件のexact role/path/SHA集合を前読・import後・公開直前の三時点で実再読し、atomic runtime roleが新SHAへ一致する
- V6-ZCQ018-02 | selection approved contract 7件の不足・余分・本書SHA不一致をdynamic import前のjob-read/CUE_SELECTION_JOB_INVALIDで拒否し、meaning/style/base/media実値binding不一致だけをCUE_SELECTION_INPUT_BINDING_MISMATCHの単一owner枝で実発火する
- V6-ZCQ027-01 | selection approved contract 7件とatomic helper 3 implementation bindingを公開直前まで照合し、runtime roleを新SHAへ一致させる
- V6-ZCQ042-01 | proof implementation 51件とapproved contract 7件のexact role/path/SHA集合を前読・import後・公開直前の三時点で実再読し、atomic runtime roleを新SHAへ一致させる

### 7.3 V6-PROOF-ITEMS-END

V6はmarker間の行頭exact `- V6-ZCQ` 7行だけを取る。新しい期待集合はexact `((v005適用後489件) − SUPERSEDED_V6) ∪ V6`で、`SUPERSEDED_V6`は§7.1の7件、V6は§7.2の7件である。期待、test source宣言、TAP observed、TAP passedを各489件へexact一致させる。各ID合計はZCQ001=22、ZCQ007=17、ZCQ018=30、ZCQ027=34、ZCQ042=36でv005後から不変である。

## 8. 製造・機能検査記録

本書の条件付き承認発効後、次を版付き記録へ残す。

1. 製造日時。
2. §3のOS、compiler、linker、SDK、header、sourceのpath・version・SHA照合結果。
3. §2.2の全引数と、削除引数が`-Wl,-no_uuid`一件だけである照合。
4. formal runtime、隔離A、隔離BのSHAと三者byte一致。
5. `LC_UUID`件数、C source終了25、APFS正常公開、late collisionの実測。
6. 旧runtime SHAと停止報告SHAを歴史証拠として保持した事実。
7. path #15/#16不変、18 path目0件、API通信0回、費用US$0。

生helper stderr、stack、成果物本文、secretは保存しない。

## 9. 再開点と停止条件

再開はv004 §10第3手だけである。§4の五条件成立後に第4手Sへ進む。S→A→L→P→R→F→Uの相対順、局所TAP保存、正式46件別承認を変えない。

本裁定で許可される実行は、本書のDECISIONS記録、path #17の一回製造、§4五条件の実測、版付き製造・機能検査記録までである。S以降、正式46件、API通信、countTokens、generateContent、費用支出、描画へ進まない。

次の一件で同attempt中に直さず停止する。

- `-Wl,-no_uuid`以外のcompile入力差が必要。
- linker生成UUIDへの後付け加工、手編集、別tool、別path、18 path目が必要。
- 新runtime SHAが期待値と不一致、または独立二回build・formal runtimeがbyte不一致。
- `LC_UUID`がexact 1件でない。
- 親環境0件対照が終了25・stdout/stderr 0 byteでない。
- APFS正常公開またはlate collision実発火が不成立。
- implementation binding 36/11/19/41/51、contract 5/5/6/7/7、49 code、46検査ID、489 proofを表現できない。
- toolchain実体・OS・SDKの固定値差、既存path #15/#16差、既存成果物・stable tag差、新たな契約判断が発生する。

## 10. 条件付き承認との一致監査

| kawafmm条件 | 本書固定 | 判定 |
|---|---|---|
| 1. compile差分は`-Wl,-no_uuid`除去のみ、後付け禁止 | §2 | closed |
| 2. 新runtime五合格条件 | §4 | closed |
| 3. path #17だけ置換、18 path目禁止、旧SHA保持 | §5 | closed |
| 4. binding、contract構成、proof/test差分exact | §6〜§7 | closed |
| 5. 記録toolchain内だけの再現性、将来不一致停止 | §3・§8〜§9 | closed |
| 6. v004 §10第3手から再開、S→U順不変 | §9 | closed |

六条件に追加判断はない。よって本書の実測SHAをDECISIONSへ記録した時点で、kawafmmの条件付き承認が発効する。
