# candidate 59 縦型B6 `thoughtSignature`応答契約追補 v001

日付: 2026-08-02  
状態: kawafmm承認済み・実装対象

## 目的

Geminiが本文と一緒に返した`thoughtSignature`を、本文の一部へ混ぜず、provider由来の不透明なメタデータとして正直に保存できるようにする。

## 改訂内容

- 応答本文partは、必須の非空`text`だけ、または非空`text`と非空文字列`thoughtSignature`の組を受理する。
- `text`だけを意味回答のbyte列としてB1へ渡す。
- `thoughtSignature`は生応答の中にだけ残す。解読、意味判定、真正性検証、下流入力への転記は行わない。
- `text`と`thoughtSignature`以外のkeyは従来どおり拒否する。
- 過去attemptの生応答からfieldを削除して救済しない。過去の拒否記録と生byteは不変に保つ。

## 検査

- `text`と`thoughtSignature`を含む応答が、生応答を先に保存した後で受理されること。
- 下流へ渡る意味回答が`text`のbyteだけであること。
- 結果objectへ`thoughtSignature`を露出しないこと。
- 未契約keyを含む応答が、生応答保存後に引き続き拒否されること。

## 新attempt

契約検査に合格した場合だけ、固定済みB5 requestを無改変で新しいB6 attemptへ1回送る。自動再試行は行わず、結果に応じて既承認のB1、B4、縦型描画、QCへ進むか停止する。
