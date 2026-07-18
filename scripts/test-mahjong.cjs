const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'hidegames-mahjong-'))

try {
  execFileSync(path.join(process.cwd(), 'node_modules/.bin/tsc'), [
    'src/mahjong.ts', '--outDir', outputDirectory, '--module', 'commonjs', '--target', 'ES2022', '--skipLibCheck', '--ignoreConfig',
  ], { stdio: 'inherit' })
  const { evaluateMahjongWin } = require(path.join(outputDirectory, 'mahjong.js'))
  const tile = value => ({ suit: value[0], rank: Number(value.slice(1)) })
  const assert = (condition, message) => { if (!condition) throw new Error(message) }

  const kokushi = evaluateMahjongWin(['m1', 'm9', 'p1', 'p9', 's1', 's9', 'z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7', 'm1'].map(tile), [], { winType: 'ron', winningTile: tile('m1') })
  assert(kokushi?.yakuman === 2 && kokushi.limit === 'ダブル役満' && kokushi.payments.ron.nonDealer === 64_000, '国士無双十三面待ちの支払いが正しくありません')

  const churen = evaluateMahjongWin(['m1', 'm1', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm9', 'm9', 'm5'].map(tile), [], { winType: 'tsumo', winningTile: tile('m5') })
  assert(churen?.yakuman === 2 && churen.yaku.includes('純正九蓮宝燈'), '純正九蓮宝燈が正しくありません')

  const daisuushi = evaluateMahjongWin(['z1', 'z1', 'z1', 'z2', 'z2', 'z2', 'z3', 'z3', 'z3', 'z4', 'z4', 'z4', 'm5', 'm5'].map(tile), [], { winType: 'tsumo', winningTile: tile('m5') })
  assert(daisuushi?.yakuman === 3 && daisuushi.limit === '3倍役満' && daisuushi.yaku.includes('大四喜') && daisuushi.yaku.includes('四暗刻'), '複合役満が正しくありません')

  const concealedKanHand = ['m2', 'm3', 'm4', 'p2', 'p3', 'p4', 's2', 's3', 's4', 'z5', 'z5'].map(tile)
  const concealedKan = [['m1', 'm1', 'm1', 'm1'].map(tile)]
  const closedKanWin = evaluateMahjongWin(concealedKanHand, concealedKan, { winType: 'tsumo', riichi: true, meldOpen: [false] })
  const openKanWin = evaluateMahjongWin(concealedKanHand, concealedKan, { winType: 'tsumo', riichi: true, meldOpen: [true] })
  assert(closedKanWin?.yaku.includes('リーチ') && closedKanWin.yaku.includes('門前清自摸和') && !openKanWin?.yaku.includes('リーチ') && !openKanWin?.yaku.includes('門前清自摸和'), '暗槓の門前判定が正しくありません')

  const ippatsuHand = ['m1', 'm2', 'm3', 'm1', 'm2', 'm3', 'p1', 'p2', 'p3', 'p1', 'p2', 'p3', 's5', 's5'].map(tile)
  const ippatsuWin = evaluateMahjongWin(ippatsuHand, [], { winType: 'tsumo', riichi: true, ippatsu: true })
  const ordinaryRiichiWin = evaluateMahjongWin(ippatsuHand, [], { winType: 'tsumo', riichi: true, ippatsu: false })
  assert(ippatsuWin?.yaku.includes('一発') && !ordinaryRiichiWin?.yaku.includes('一発'), '一発の判定が正しくありません')

  console.log('Mahjong scoring tests passed')
} finally {
  fs.rmSync(outputDirectory, { recursive: true, force: true })
}
