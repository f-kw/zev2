# CURRENT_GOAL — 目的ファイル

本ファイルはkawafmmの言葉に基づく相談役のみが書き換える。Codexは作業着手時・停止からの再開時に読み、報告冒頭へ4項を転記する。転記できない・食い違う場合は停止。

## 1. 今の目的（1行・kawafmmの言葉）

遠方接続の正式入力と返答形式は完成した。次はLunaへ送るexact requestと、token計測・生成の直前検査を作る。（2026-08-23 kawafmm）

## 2. 主計画上の現在位置

正式意味発話、コメント流量アンカー、Luna source package・返答schemaまで実装・検査・commit・tag済み。現在はLuna B5のローカル実装段階。字幕の見た目は途中状態を保持する。

## 3. 今の作業とそれが目的へどう繋がるか

固定済みsource packageから、実際にLunaへ送るrequestをbyte単位で固定する。次工程ではこの同じrequestだけをtoken計測し、合格した場合だけ生成へ進める。

## 4. 今回やらないこと

Luna/API通信 / token外部計測 / 実際の候補生成 / 人間採否 / composition / 注文書 / renderer・動画出力 / 既存正式成果物の削除・上書き / push・remote操作 / 費用発生 / 各種閾値・件数の正式固定
