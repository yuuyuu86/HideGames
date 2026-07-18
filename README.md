# HideGames

友達とルームコードで集まり、定番ゲーム・協力ゲームを遊ぶためのElectronデスクトップゲームハブです。

## 起動

```bash
npm install
npm run dev
```

デスクトップアプリとして起動する場合は、次を実行します。

```bash
npm run desktop
```

`EADDRINUSE: address already in use :::3001` と表示された場合は、以前のリアルタイムサーバーが残っています。まず確認し、表示されたPIDだけを停止してから再実行してください。

```bash
lsof -nP -iTCP:3001 -sTCP:LISTEN
kill <PID>
```

`kill` の対象は上の確認結果に表示された `node server/index.cjs` のPIDに限定してください。

デスクトップ版では `Ctrl/Cmd + Shift + H` でウィンドウを非表示にし、同じキーで再表示できます。

ブラウザ版だけをリアルタイムサーバーと起動する場合は、次を実行します。

```bash
npm run online
```

別PCから接続する場合は、ホストPCのIPアドレスを使って `VITE_SOCKET_URL=http://<ホストIP>:3001` を設定して起動します。

本番ビルドは次で実行できます。

```bash
npm run build
```

## Neon を使った永続化

1. `.env.example` を `.env.local` にコピーし、Neonの接続文字列を `DATABASE_URL` に設定します。`AUTH_JWT_SECRET` には32文字以上のランダムな秘密値を設定します。
2. `npm run server` を起動します。初回起動時にルーム状態・通報用テーブルを作成します。
3. 公開したSocket.IOサーバーのHTTPS URLを `VITE_SOCKET_URL` に設定します。

接続文字列はパスワードを含みます。`.env.local` だけに保存し、Git管理・チャット・フロントエンド環境変数へは入れないでください。

プロフィール画面からメールアドレスと8文字以上のパスワードでアカウントを作成・ログインできます。パスワードはハッシュ化してNeonに保存し、ブラウザには署名済みセッショントークンのみを保存します。

## 公開（Render）

`render.yaml` を含んでいるため、GitHubへリポジトリを送信後にRenderの「New +」→「Blueprint」からこのリポジトリを選ぶだけで、Web画面とSocket.IOサーバーを同じURLで公開できます。

- `DATABASE_URL`: Neonの接続文字列を設定
- `AUTH_JWT_SECRET`: Renderが生成する値を使用
- `CORS_ORIGIN`: 同一URLで配信する場合は空欄のままで可
- `YOUTUBE_API_KEY`: アプリ内YouTube検索を使う場合のみ設定
- `TURN_URL` / `TURN_USERNAME` / `TURN_CREDENTIAL`: NAT越え用TURNサーバーを使う場合のみ設定

公開URLはフロントエンドとSocket.IOで共有されるため、`VITE_SOCKET_URL` の追加設定は不要です。

`/health` では永続化・認証の設定状態、稼働時間、接続数、リリース識別子を確認できます。

## 現在実装済み

- ホーム、ゲーム一覧、ルーム、YouTube、フレンド、設定の画面
- ルームコード・QR・ディープリンク・フレンド招待、招待限定ルーム、メンバーの準備状態、ゲーム開始導線
- 右下の折りたたみ式ゲーム内チャット
- Socket.IOによるルーム同期、ホスト権限検証、ルームパスワード保護、期限付き招待トークン、未接続時の`BroadcastChannel`フォールバック
- 全員停止の離席モーダル、復帰・3秒カウントダウンの体験
- ブラウザ版の `Ctrl + Shift + H` 離席停止デモと、Electron版の実ウィンドウ非表示・復帰
- 離席時の明るさ連動の設定UI
- オセロ、五目並べ、四目並べ、チェス、囲碁、鬼ごっこ、クイズ、神経衰弱、マインスイーパー、すごろく、しりとり、お絵描き伝言、人狼、ワードウルフ、UNO風、ババ抜き、7並べ、大富豪
- YouTube URLからの公式埋め込みプレーヤー
- YouTube URL・再生・停止・再生位置の同期視聴操作
- 鬼ごっこのサーバー判定（鬼役、壁の通行制限、宝石回収、捕獲、勝敗）
- ローカルプロフィール、実績、戦績、リプレイ、トーナメント、デイリーチャレンジ、フレンド、ボイスチャット、アクセシビリティ設定
- 鬼ごっこの再戦、鬼役の自動交代、結果の戦績保存

## 残る外部設定

- `YOUTUBE_API_KEY` を設定するとアプリ内検索を有効化できます。
- `TURN_URL`、`TURN_USERNAME`、`TURN_CREDENTIAL` を設定すると、STUNだけでは接続できないネットワークでもボイスチャットを中継できます。
- macOS/Windowsおよび接続ディスプレイごとの物理的な明るさ変更は、OS・モニターの対応状況に依存します。非対応でも離席と全員停止は動作します。

詳細な実装状況は [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) を参照してください。

## 制約

このリポジトリには、ブラウザ版とElectronデスクトップ版が含まれます。Electron版では実際のアプリウィンドウを隠せます。複数PCでのリアルタイム同期とハードウェア明るさ制御には、バックエンドおよびOS・モニターごとのネイティブ実装が必要です。
