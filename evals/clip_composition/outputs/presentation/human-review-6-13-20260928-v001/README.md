# 6＋13.3 人間確認パッケージ

確認入口：**http://127.0.0.1:60965/**

1. **STEP 1：新素材Digest 15:31.633** — 最初は動画だけを普通に見る。
2. 「見終わったら次へ」で **STEP 2：字幕色A/B/C 各46.167秒** へ進む。

感想はZEV相談役の会話へ自由に返す。採点フォームは設けていない。
これは確認入口の準備記録であり、6の回答・13.3の採否は未確定。

## 再生server

一時的なローカルserverを起動済み。127.0.0.1だけへbindし、入口と指定4動画のみを配信する。
セッション終了や再起動で止まる可能性がある。停止時は次の一行を実行し、上記URLを開く。

```sh
python3 -u /Users/kawafmm/workspace/zev2/tools/digest-quality/serve-human-review-6-13.py --port 60965
```

終了は起動したterminalでCtrl+C。daemon登録・外部公開は行っていない。
既存の `serve_digest_review_v001.py` にあるGET/HEAD/Range処理を再利用し、動画をコピーせず元pathから読む。
起動時に4動画のSHAを確認し、不一致や欠損があれば配信を開始しない。

## 入口の内容

- STEP 1に表示するのは見出し、視聴案内、尺、player、次へボタンだけ。AIコメント・問題時刻・技術QC・色比較情報は表示しない。
- STEP 2は次へ操作後に初めて表示・読込みする。Aは現在、Bは強調箇所を調整、CはBと同じ強調箇所で一部だけ水色。
- 質問は「BはAより自然に要点が伝わるか」「CはBより自然な変化が増えているか」の2点だけ。
- 別の動画を再生すると前の動画を停止し、音声の同時再生を避ける。再読込み時はSTEP 1の冒頭へ戻る。

## 再生確認（2026-09-28 JST）

Microsoft Edgeの実playerを操作し、4本とも読み込み、時計の進行、中間へのseek、音声出力表示を確認した。
音声はplayer非ミュート・音量100・Edgeの「オーディオを再生中」表示で確認した。動画内容・聴感の品質評価は行っていない。

| 動画 | ブラウザ実尺（秒） | 時計の進行例（秒） | 中間へのseek（秒） |
|---|---:|---|---:|
| Digest | 931.633333 | 0.079 → 36.211 | 465.817、その後496.406へ進行 |
| A | 46.166667 | 0.151 → 9.197 | 23.113 |
| B | 46.166667 | 0.094 → 46.167（末尾） | 23.083、再生再開を確認 |
| C | 46.166667 | 0.248 → 17.134 | 23.113 |

4本とも媒体エラーなし。配信については各HEAD、先頭/suffix Rangeの206応答と元byte一致、未知path/traversalの404、範囲外の416を確認した。
ページ表示だけを再生確認とはしていない。静的な導線・配信監査も別担当が確認した。
詳細：[playback-verification.json](playback-verification.json)。これは入口の再生確認であり、既存QCの再実行ではない。

## 使用した元ファイル

pathはrepository root基準。A/B/Cは `evals/clip_composition/outputs/presentation/stage4-editing-color-emphasis-20260926-v001/` 内。

| 動画 | 元ファイル | SHA256 |
|---|---|---|
| Digest | `evals/clip_composition/outputs/presentation/new-material-digest-20260926-first-draft-qc-resume-v001/presentation-rendered-v002.mp4` | `11611ff2071aa21325eb672094b90f5c495b77af311aa409a460c69e7cb16b8a` |
| A | `A-current.mp4` | `4f95335e118c6f2ff5439f75d1d8f9e87c5eeaaa000ddd5eb2d2a2801d711aef` |
| B | `B-yellow-selection.mp4` | `de64e90904a9fcd7620d4c3234e04b8aea362cca46845a570e2bc1a7776ab348` |
| C | `C-yellow-cyan.mp4` | `d05fa1a91140abb190ca62f8b5783787a62a0d269770a5adcf5f062ba59b0292` |

使用動画4本と、別の統合動画・既存review・既存verification・関連reportを含む11ファイルの前後SHA/サイズを確認。
元成果物変更0、媒体コピー0、再生成0、AI分析0、有料API0、QC再実行0。
今回作成したのは新入口HTML、最小serve script、本README、軽量再生確認記録だけ。

## 完了確認

- 一つのURLから、誘導なしのDigest初見→2質問だけのA/B/C比較へ進める。
- 4本の実再生・seek・音声出力表示と元ファイル不変を確認。
- Git対象は上記4ファイルだけ。commit/push・local/remote一致・clean/untracked 0と直接送信結果は、この記録を含むcommitの完了報告へ記載する。
- 人間の感想・採否は未取得。今回の準備完了から7、13.4、13.5、8、Jevへ進まない。
