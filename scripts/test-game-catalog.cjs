const fs = require('fs')
const path = require('path')

const root = process.cwd()
const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8')
const server = fs.readFileSync(path.join(root, 'server/index.cjs'), 'utf8')

const games = [
  ['tag', 'オンライン鬼ごっこ'], ['othello', 'オセロ'], ['gomoku', '五目並べ'], ['shogi', '将棋'], ['chess', 'チェス'], ['go', '囲碁'],
  ['daifugo', '大富豪'], ['uno', 'UNO風カードゲーム'], ['oldmaid', 'ババ抜き'], ['memory', '神経衰弱'], ['sevens', '7並べ'], ['mahjong', '麻雀'],
  ['sugoroku', 'すごろく'], ['mines', '協力マインスイーパー'], ['tetris', 'テトリス風対戦'], ['puzzle', '落ちものパズル'],
  ['werewolf', '人狼'], ['wordwolf', 'ワードウルフ'], ['quiz', 'クイズ早押し'], ['drawrelay', 'お絵描き伝言'], ['association', '連想ゲーム'],
  ['movie', '映画監督バトル'], ['meeting', '同時にしゃべれない会議'], ['election', '架空の国を作る選挙ゲーム'], ['story', '最後の一文を守る物語ゲーム'],
  ['escape', '片方だけ見える脱出室'], ['delivery', '地図なし配達'], ['future', '1人だけ未来を知っている'], ['newsroom', '偽ニュース編集部'],
  ['alien', '宇宙人の通訳'], ['letter', '手紙だけの冒険'], ['museum', '逃げる美術館'], ['thief', '怪盗のアリバイ工作'], ['ghost', '幽霊の引っ越し'],
  ['soundmaze', '音だけ迷路'], ['detective', '時間を編集する刑事'], ['orchestra', '声なしオーケストラ'], ['court', '夢の中の法廷'], ['bug', 'バグを仕様にするゲーム'],
  ['guard', '泥棒と警備AI'], ['sports', 'ルールを発明するスポーツ'],
]

for (const [key, title] of games) {
  if (!app.includes(`key: '${key}'`) || !app.includes(`title: '${title}'`)) throw new Error(`ゲーム一覧に不足しています: ${title}`)
  if (!server.includes(`'${key}'`)) throw new Error(`サーバーのゲーム許可一覧に不足しています: ${key}`)
}

console.log(`Game catalog tests passed (${games.length} games)`)
