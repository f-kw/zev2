# fatal観測性v002 OEE002 style束縛診断 v001

- 日付: 2026-08-08
- 診断結果: **production実装欠陥**
- 契約矛盾: なし
- 通信: 0回
- 費用: US$0

## 1. 保存済み観測

検査専用診断入口は、productionの正式出力を変更せず、OEE002が既に作った受入報告をcleanup前のメモリから版付き診断pathへ保存した。

| 証拠 | 値 |
| --- | --- |
| 診断JSON | `evals/clip_composition/reports/presentation/diagnostics/20260808-fatal-observability-v002-oee002/attempt-0001/oee002-diagnostic.json` |
| SHA-256 | `19a4002d37c3b043257ce61bdf15e60cbc3a30da8bfda3c38afc34416bf9aa50` |
| status / exit | `rejected / 1` |
| 失敗check | `styleResolution` |
| 違反code | `STYLE_BINDING_MISMATCH` |
| path | `/styleInput/presetBinding` |
| 他の先行check | request、意味package、基礎映像、timeline、字幕sourceは全て合格 |

## 2. 値レベル原因

縦型renderer trustの15依存を現在実体と照合すると、13件は一致し、次の2件だけが世代差を持つ。

| role | 生成時trust SHA | 現在実体SHA | 現在jobでlive束縛 |
| --- | --- | --- | --- |
| vertical-renderer | `b9f35e6a17a060286139367e2ffedcd3378239f47e74e4c178fea00659d67f54` | `e12117c04f7bbfe6a67459fc815dd609809ec02fa8792d548e183f58b8ececdd` | あり |
| renderer-core | `d02d603f3fc04f9ab58ce889644f5e63bf17d7ec5cb19019e09110c6167a720b` | `ea775b314cc149c65d384603dbc39f3260e3ba8e4a32d99a6275941bf31dd223` | あり |

現行trust検査は`vertical-renderer`だけを生成時SHAとの現在同一要求から除外するが、`renderer-core`には生成時SHAと現在実体SHAの同一を要求する。このため、正式jobが現在実体を正しくlive束縛していても、承認後の実装進化だけでstyle全体を拒否する。

## 3. 契約との照合

DECISIONSの2026-08-02裁定は、縦型renderer trust内の依存SHAを生成時来歴として保持し、現在実体の強制照合を正式jobのlive束縛へ一本化すると定めている。入力・tool・内容・改変検知は維持する。

したがって今回の不一致は契約矛盾ではなく、この裁定を`renderer-core`へ適用し切れていないproduction実装欠陥である。fixtureのtrust SHAを現在値へ書き換える修正は、生成時来歴を破壊するため採らない。

## 4. 限定修正

trust依存pathが正式jobにも存在する場合は、現在実体SHAとjobのlive SHAを一致させる。trustにだけ存在する依存は、従来どおり現在実体SHAとtrustの生成時SHAを一致させる。

これにより、生成時来歴とlive実行束縛を分離しつつ、jobにもtrustにも現れない依存の改変検知は維持する。計算、表示、crop、schema、status、違反code、終了code、正式成果物は変更しない。

## 5. 在庫

今回の検査専用診断入口は、`rejected`の内側理由を正式report外で先行観測したものである。`rejected`内側理由の恒久的な観測性は、fatal観測性v002とは別の将来工事として扱う。
