# STTチャンク境界タイムスタンプ検査

- 元動画STT: r_ztjHaHmcg_-DwSCDMCWDQ_local300_v001
- 切り抜きSTT: r_ztjHaHmcg
- 検査窓: 元動画 300s/600s/900s 各±15秒、切り抜き 0:00-0:15
- 波形比較: 20msフレーム、10ms刻みのRMS包絡。これは既存の音声カット点検出と同じ解像度。
- 判定許容: ±200ms。これは今回の指示値。
- 検算対象の既知ずれ: -5080ms

## 結論

- 序盤ずれ: なし
- 最大ずれ: 109ms
- チャンク間で一貫した秒単位のずれ: 確認されない
- 確認済みペア側で見えた -5080ms をこのずれで説明できるか: 説明できない

## 比較表

| 窓 | 確認したSTT語 | 直前STTギャップ | STT時刻近傍の波形立ち上がり | 立ち上がり強度 | 参考: STT-5080ms近傍の波形変化 | ±200ms内 |
| --- | --- | ---: | --- | ---: | --- | --- |
| source 300s boundary | 5:02.553「指」 | +2606ms | 5:02.610 (+57ms) | 0.031276 | 4:57.660 (+187ms) | yes |
| source 600s boundary | 10:00.111「肩」 | +284ms | 10:00.220 (+109ms) | 0.129451 | 9:55.090 (+59ms) | yes |
| source 900s boundary | 15:00.111「と」 | +164ms | 15:00.120 (+9ms) | 0.117471 | 14:55.150 (+119ms) | yes |
| clip head 0-15s | 0:02.555「動」 | n/a | 0:02.570 (+15ms) | 0.035028 | 範囲外 | yes |

## 成果物

- source 300s boundary 音声: `outputs/audio-check/r_ztjHaHmcg/stt-boundaries/source_300s.wav`
- source 300s boundary 波形: `outputs/plots/stt-boundaries/source_300s.svg`
- source 600s boundary 音声: `outputs/audio-check/r_ztjHaHmcg/stt-boundaries/source_600s.wav`
- source 600s boundary 波形: `outputs/plots/stt-boundaries/source_600s.svg`
- source 900s boundary 音声: `outputs/audio-check/r_ztjHaHmcg/stt-boundaries/source_900s.wav`
- source 900s boundary 波形: `outputs/plots/stt-boundaries/source_900s.svg`
- clip head 0-15s 音声: `outputs/audio-check/r_ztjHaHmcg/stt-boundaries/clip_head_0_15s.wav`
- clip head 0-15s 波形: `outputs/plots/stt-boundaries/clip_head_0_15s.svg`

## 補足

- 波形の緑線は、確認したSTT語の開始時刻±200ms内で、RMSが最も強く上がった点。
- 紫線は、同じSTT語が仮に5080ms早く実音声に出ていた場合の位置。ただし、音声には他の発話や環境音の波形変化もあるため、紫線近傍に波形変化があることだけでは時刻ずれの根拠にならない。
- 900s境界は直前STTギャップが200ms未満なので、発話開始点としての強さは他より弱い。それでも、300s/600sと同じ方向の秒単位ずれは出ていない。
- fixture/expected/confirmedペアは変更していない。
