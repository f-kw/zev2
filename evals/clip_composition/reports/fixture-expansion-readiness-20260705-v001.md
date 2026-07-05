# fixture拡張readiness

- 結果JSON: outputs/fixture-expansion-readiness-20260705-v001.json

## まとめ

- 境界遷移を検証できるfixtureは 1 件。
- 回帰確認用の境界一致fixtureは 2 件。
- composition評価用として未検証のfixtureは 1 件。
- 単一区間fixtureとして保留すべき候補は 1 件。

## expected付きfixture

| fixture | 役割 | composition評価 | 境界 | 境界候補payload | 次の処理 |
| --- | --- | --- | --- | ---: | --- |
| IMQYaT_RWRA_audio_v001 | control_fixture | yes | start:segment_start, end:segment_end | 0 | 期待境界が発話境界と一致しているため、境界遷移promptの回帰確認用として使います。 |
| IMQYaT_RWRA_clip_audio_v001 | not_eval_usable | no | start:segment_start, end:segment_end | 0 | expected側でcomposition評価に使わない指定があるため、別fixtureを使います。 |
| IMQYaT_RWRA_context_v001 | control_fixture | yes | start:segment_start, end:segment_end | 0 | 期待境界が発話境界と一致しているため、境界遷移promptの回帰確認用として使います。 |
| UpRyakf5j80_clip_audio_v001 | boundary_transition_candidate | yes | start:inside_segment, end:inside_segment | 1 | 発話途中の期待境界と、expectedを含まない境界候補payloadがあるため、境界遷移promptの検証対象にできます。 |
| draft_w4Lp9IJC6pQl3FsRfFL9t | legacy_or_unverified_fixture | 未指定 | start:segment_start, end:segment_end | 0 | composition評価に使える指定がないため、回帰確認には使わず、必要ならexpectedの検証状態を更新します。 |

## STT target候補

| target | 役割 | expected fixture | 視覚確認 | 音声チャンク対応 | 次の処理 |
| --- | --- | --- | --- | --- | --- |
| IMQYaT_RWRA | already_has_expected | IMQYaT_RWRA_audio_v001, IMQYaT_RWRA_clip_audio_v001, IMQYaT_RWRA_context_v001 | 未確認 | なし | すでにexpected付きfixtureがあるため、そのfixture側のreadinessを優先します。 |
| UpRyakf5j80 | already_has_expected | UpRyakf5j80_clip_audio_v001 | 未確認 | chunk1 7500-50178ms | すでにexpected付きfixtureがあるため、そのfixture側のreadinessを優先します。 |
| r_ztjHaHmcg | candidate_requires_multicut_or_different_clip | なし | rejected | chunk1 2179930-2209930ms<br>chunk2 2309360-2339360ms / 前から99430ms<br>chunk3 2361159-2391159ms / 前から21799ms<br>chunk4 2404730-2433322ms / 前から13571ms | 切り抜き連続チャンクが元動画側の離れた範囲に対応しているため、単一区間fixtureとして凍結せず、複数区間expected対応か別の短尺連続候補を選びます。 |

## 読み取り

- v010相当の境界遷移promptを試す前に、境界遷移候補が有効かを2件目で確認する必要がある。
- `r_ztjHaHmcg` は切り抜きチャンクが元動画側の離れた範囲に対応しているため、単一区間expectedへ押し込まない。
- 現時点では `UpRyakf5j80_clip_audio_v001` が境界遷移検証、`IMQYaT_RWRA_context_v001` が回帰確認の役割。2件目の境界遷移fixtureは追加候補探しが必要。
