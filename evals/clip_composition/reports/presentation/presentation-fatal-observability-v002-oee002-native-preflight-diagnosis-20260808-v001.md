# fatal観測性v002 OEE002読み取り診断・ネイティブ実行前記録 v001

- 日付: 2026-08-08
- 対象: 直接影響130件の最終周回2/2
- 外部通信: 0回
- 費用: US$0
- production・契約・正式成果物の変更: 0件

## 事実

OEE002は、保存済みTAPで同じ環境差を二度示している。

| 対照 | 制限環境 | ネイティブ環境 |
| --- | --- | --- |
| 2026-08-03 正式228件 | attempt-v002で`actual: rejected` | attempt-v003で合格 |
| 2026-08-06 表示計画検査 | 制限環境版で不合格 | native-v002で合格 |

今回のattempt-0001も制限環境で実行され、OEE002は`actual: rejected`だった。過去のネイティブ合格後に、OEE002のproduction・fixture・契約を不受理へ変える変更は今回の3検査ファイル限定修正に含まれない。

## 帰属

OEE002の残存不合格は、production・fixture・契約の欠陥ではなく、Chromiumを使う正式描画検査を制限環境で起動した実行手順の不備に帰属する。保存済みの制限環境／ネイティブ環境の対照だけで確定できるため、診断用の再実行は行わない。

OEE006は別原因である。productionは`overlay-render / CHILD_PROCESS_EXIT_NONZERO / targetFile null`まで内側原因を正式観測できている。検査だけが旧来の`unknown / UNCLASSIFIED`を期待していたため、観測性向上を維持する具体値へ期待を置換する。

## 実行前条件

attempt-0002は、次の全項目を実測して記録してから開始する。

1. Codex制限外のネイティブ環境である。
2. 固定Node実体を`PATH`の先頭に置く。
3. 固定TSX loaderを使う。
4. `NODE_OPTIONS`環境変数が存在しない。
5. 束縛済みChromium実体が起動可能である。

この環境確認を、以後の実現性調査の標準確認項目へ含める。

### 実測結果

| 項目 | 実測 |
| --- | --- |
| 実行日時 | `2026-08-08T11:59:25+09:00` |
| 実行環境 | Codex制限外のネイティブ環境 |
| `PATH`先頭のNode | `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node` |
| Node版 | `v20.19.6` |
| Node実体SHA-256 | `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c` |
| TSX loader SHA-256 | `f06fb3da72f722ec9a2c3e8502f750ae1b6300b93fb76e8a52548dba69b6730f` |
| `NODE_OPTIONS` | 不存在 |
| Chromium実体SHA-256 | `b469d05c698ccf9f4ae3dc43fb194fbdcf56f9da1fc46dcc19f2bf9fe2aa20b8` |
| Chromium起動 | 終了0、`about:blank`のDOM取得成功 |

## 停止規則

直接影響130件を頭から一度だけ実行し、1件でも不合格なら修正せず停止する。3周目は行わず、範囲改訂案へ戻す。

## 事後訂正

attempt-0002のネイティブ実測で、OEE002は再び`rejected`となった。したがって、過去2組の環境対照から「今回も実行環境だけが原因」とした上記帰属は、現在のOEE002については成立しない。

過去の対照は当時のコード・fixtureに対する事実として維持する。一方、現在の内側原因は未確認へ戻し、`presentation-fatal-observability-v002-integration-rebind-attempt-0002-final-stop-report-20260808-v001.md`の範囲改訂案で扱う。元の診断文を削除せず、事前判断と反証の両方を記録する。
