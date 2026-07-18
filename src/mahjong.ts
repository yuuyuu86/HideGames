export type MahjongTile = { suit: 'm' | 'p' | 's' | 'z'; rank: number }
export type MahjongWinType = 'tsumo' | 'ron'
export type MahjongPayment = { ron: { dealer: number; nonDealer: number }; tsumo: { dealerPays: number; nonDealerPays: number } }
export type MahjongWinInfo = { yaku: string[]; han: number; fu: number; points: number; payments: MahjongPayment; limit?: string }
export type MahjongWinOptions = {
  winType: MahjongWinType
  riichi?: boolean
  winningTile?: MahjongTile
  seatWind?: 1 | 2 | 3 | 4
  roundWind?: 1 | 2 | 3 | 4
  doraIndicators?: MahjongTile[]
}

type Group = { kind: 'pair' | 'sequence' | 'triplet' | 'quad'; tiles: MahjongTile[]; open: boolean }

const key = (tile: MahjongTile) => `${tile.suit}${tile.rank}`
const tileFromKey = (value: string): MahjongTile => ({ suit: value[0] as MahjongTile['suit'], rank: Number(value.slice(1)) })
const order = (value: string) => ({ m: 0, p: 9, s: 18, z: 27 }[value[0]] ?? 99) + Number(value.slice(1))
const terminalKeys = ['m', 'p', 's'].flatMap(suit => [`${suit}1`, `${suit}9`]).concat(['z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7'])
const isTerminalOrHonor = (tile: MahjongTile) => tile.suit === 'z' || tile.rank === 1 || tile.rank === 9
const isSimple = (tile: MahjongTile) => tile.suit !== 'z' && tile.rank > 1 && tile.rank < 9

function countTiles(tiles: MahjongTile[]) {
  const counts = new Map<string, number>()
  tiles.forEach(tile => counts.set(key(tile), (counts.get(key(tile)) ?? 0) + 1))
  return counts
}

function fixedGroups(melds: MahjongTile[][]) {
  return melds.map(tiles => ({
    tiles,
    open: true,
    kind: tiles.length === 4 ? 'quad' as const : tiles.every(tile => key(tile) === key(tiles[0])) ? 'triplet' as const : 'sequence' as const,
  }))
}

function standardDecompositions(hand: MahjongTile[], melds: MahjongTile[][]): Group[][] {
  const needed = 14 - melds.length * 3
  if (hand.length !== needed) return []
  const counts = countTiles(hand)
  const fixed = fixedGroups(melds)
  const results: Group[][] = []
  const take = (value: string, amount: number) => {
    const current = counts.get(value) ?? 0
    if (current < amount) return false
    counts.set(value, current - amount)
    return true
  }
  const put = (value: string, amount: number) => counts.set(value, (counts.get(value) ?? 0) + amount)
  const collect = (groups: Group[]) => {
    const current = [...counts.keys()].filter(value => (counts.get(value) ?? 0) > 0).sort((a, b) => order(a) - order(b))[0]
    if (!current) { results.push([...groups, ...fixed]); return }
    const tile = tileFromKey(current)
    if (take(current, 3)) {
      collect([...groups, { kind: 'triplet', tiles: [tile, tile, tile], open: false }])
      put(current, 3)
    }
    if (tile.suit !== 'z' && tile.rank <= 7) {
      const next = `${tile.suit}${tile.rank + 1}`, after = `${tile.suit}${tile.rank + 2}`
      if ((counts.get(current) ?? 0) >= 1 && (counts.get(next) ?? 0) >= 1 && (counts.get(after) ?? 0) >= 1) {
        take(current, 1); take(next, 1); take(after, 1)
        collect([...groups, { kind: 'sequence', tiles: [tile, tileFromKey(next), tileFromKey(after)], open: false }])
        put(current, 1); put(next, 1); put(after, 1)
      }
    }
  }
  for (const pair of [...counts.keys()].sort((a, b) => order(a) - order(b))) {
    if (!take(pair, 2)) continue
    const tile = tileFromKey(pair)
    collect([{ kind: 'pair', tiles: [tile, tile], open: false }])
    put(pair, 2)
  }
  return results
}

function sameTile(left: MahjongTile, right: MahjongTile) { return left.suit === right.suit && left.rank === right.rank }

function waitFu(groups: Group[], winningTile?: MahjongTile) {
  if (!winningTile) return 0
  return Math.max(0, ...groups.map(group => {
    if (!group.tiles.some(tile => sameTile(tile, winningTile))) return 0
    if (group.kind === 'pair') return 2
    if (group.kind !== 'sequence') return 0
    const ranks = group.tiles.map(tile => tile.rank).sort((left, right) => left - right)
    if (winningTile.rank === ranks[1]) return 2
    if ((ranks[0] === 1 && winningTile.rank === 3) || (ranks[0] === 7 && winningTile.rank === 7)) return 2
    return 0
  }))
}

function pairFu(tile: MahjongTile | undefined, options: MahjongWinOptions) {
  if (!tile || tile.suit !== 'z') return 0
  if (tile.rank >= 5) return 2
  return (tile.rank === options.seatWind ? 2 : 0) + (tile.rank === options.roundWind ? 2 : 0)
}

function calculateFu(groups: Group[], options: MahjongWinOptions, sevenPairs: boolean) {
  if (sevenPairs) return 25
  const pair = groups.find(group => group.kind === 'pair')
  const nonPair = groups.filter(group => group.kind !== 'pair')
  const allSequences = nonPair.every(group => group.kind === 'sequence')
  const pairValue = pairFu(pair?.tiles[0], options)
  if (allSequences && pairValue === 0 && waitFu(groups, options.winningTile) === 0) return options.winType === 'tsumo' ? 20 : 30
  let fu = 20 + (options.winType === 'tsumo' ? 2 : nonPair.every(group => !group.open) ? 10 : 0)
  fu += pairValue + waitFu(groups, options.winningTile)
  nonPair.filter(group => group.kind === 'triplet' || group.kind === 'quad').forEach(group => {
    const terminal = isTerminalOrHonor(group.tiles[0])
    const closed = !group.open
    if (group.kind === 'triplet') fu += terminal ? (closed ? 8 : 4) : (closed ? 4 : 2)
    else fu += terminal ? (closed ? 32 : 16) : (closed ? 16 : 8)
  })
  return Math.ceil(fu / 10) * 10
}

function doraForIndicator(indicator: MahjongTile): MahjongTile {
  if (indicator.suit === 'z') {
    if (indicator.rank >= 1 && indicator.rank <= 4) return { suit: 'z', rank: indicator.rank === 4 ? 1 : indicator.rank + 1 }
    return { suit: 'z', rank: indicator.rank === 7 ? 5 : indicator.rank + 1 }
  }
  return { suit: indicator.suit, rank: indicator.rank === 9 ? 1 : indicator.rank + 1 }
}

function pointInfo(han: number, fu: number) {
  let base = fu * 2 ** (han + 2)
  let limit: string | undefined
  if (han >= 13) { base = 8000; limit = '役満' }
  else if (han >= 11) { base = 6000; limit = '三倍満' }
  else if (han >= 8) { base = 4000; limit = '倍満' }
  else if (han >= 6) { base = 3000; limit = '跳満' }
  else if (han >= 5 || base >= 2000) { base = 2000; limit = '満貫' }
  const round = (value: number) => Math.ceil(value / 100) * 100
  return { points: round(base * 4), payments: { ron: { dealer: round(base * 6), nonDealer: round(base * 4) }, tsumo: { dealerPays: round(base * 2), nonDealerPays: round(base) } }, limit }
}

export function evaluateMahjongWin(hand: MahjongTile[], melds: MahjongTile[][], options: MahjongWinOptions): MahjongWinInfo | null {
  const all = [...hand, ...melds.flat()]
  const counts = countTiles(hand)
  const sevenPairs = melds.length === 0 && counts.size === 7 && [...counts.values()].every(count => count === 2)
  const kokushi = melds.length === 0 && hand.length === 14 && terminalKeys.every(value => (counts.get(value) ?? 0) >= 1)
  if (kokushi) return { yaku: ['国士無双'], han: 13, fu: 0, ...pointInfo(13, 0) }
  const decompositions = sevenPairs ? [[]] : standardDecompositions(hand, melds)
  if (!decompositions.length) return null
  const closed = melds.length === 0
  const candidates: MahjongWinInfo[] = decompositions.map((groups): MahjongWinInfo | null => {
    const yaku: string[] = []
    let han = 0
    const add = (name: string, value: number) => { yaku.push(name); han += value }
    const yakuman = (name: string) => { yaku.push(name); han = Math.max(han, 13) }
    if (options.riichi && closed) add('リーチ', 1)
    if (options.winType === 'tsumo' && closed) add('門前清自摸和', 1)
    if (sevenPairs) add('七対子', 2)
    if (all.every(isSimple)) add('断么九', 1)
    const suits = new Set(all.filter(tile => tile.suit !== 'z').map(tile => tile.suit))
    const honors = all.some(tile => tile.suit === 'z')
    if (suits.size === 1 && honors) add('混一色', closed ? 3 : 2)
    if (suits.size === 1 && !honors) add('清一色', closed ? 6 : 5)
    if (all.every(isTerminalOrHonor)) add('混老頭', 2)
    if (all.every(tile => tile.suit === 'z')) yakuman('字一色')
    if (all.every(tile => tile.suit !== 'z' && (tile.rank === 1 || tile.rank === 9))) yakuman('清老頭')
    const green = all.every(tile => (tile.suit === 's' && [2, 3, 4, 6, 8].includes(tile.rank)) || (tile.suit === 'z' && tile.rank === 6))
    if (green) yakuman('緑一色')
    if (!sevenPairs) {
      const groupsWithoutPair = groups.filter(group => group.kind !== 'pair')
      const sequences = groupsWithoutPair.filter(group => group.kind === 'sequence')
      const triplets = groupsWithoutPair.filter(group => group.kind === 'triplet' || group.kind === 'quad')
      const pair = groups.find(group => group.kind === 'pair')
      if (groupsWithoutPair.every(group => group.kind === 'triplet' || group.kind === 'quad')) add('対々和', 2)
      const pairValue = pairFu(pair?.tiles[0], options)
      if (closed) {
        const duplicateSequences = new Map<string, number>()
        sequences.forEach(group => { const value = group.tiles.map(key).join(''); duplicateSequences.set(value, (duplicateSequences.get(value) ?? 0) + 1) })
        const pairs = [...duplicateSequences.values()].filter(value => value >= 2).length
        if (pairs >= 2) add('二盃口', 3)
        else if (pairs === 1) add('一盃口', 1)
      }
      if (closed && sequences.length === 4 && pairValue === 0 && waitFu(groups, options.winningTile) === 0) add('平和', 1)
      for (const rank of [1, 4, 7]) {
        if (['m', 'p', 's'].every(suit => sequences.some(group => group.tiles[0].suit === suit && group.tiles[0].rank === rank))) { add('一気通貫', closed ? 2 : 1); break }
      }
      for (let rank = 1; rank <= 7; rank++) {
        if (['m', 'p', 's'].every(suit => sequences.some(group => group.tiles[0].suit === suit && group.tiles[0].rank === rank))) { add('三色同順', closed ? 2 : 1); break }
      }
      for (let rank = 1; rank <= 9; rank++) {
        if (['m', 'p', 's'].every(suit => triplets.some(group => group.tiles[0].suit === suit && group.tiles[0].rank === rank))) { add('三色同刻', 2); break }
      }
      if (triplets.filter(group => group.kind === 'quad').length >= 3) add('三槓子', 2)
      const groupHasOutside = (group: Group) => group.tiles.some(isTerminalOrHonor)
      if (groups.every(groupHasOutside)) {
        if (all.every(tile => tile.suit !== 'z')) add('純全帯么九', closed ? 3 : 2)
        else add('混全帯么九', closed ? 2 : 1)
      }
      const dragonTriplets = triplets.filter(group => group.tiles[0].suit === 'z' && group.tiles[0].rank >= 5)
      dragonTriplets.forEach(group => add(`役牌 ${['白', '發', '中'][group.tiles[0].rank - 5]}`, 1))
      if (dragonTriplets.length === 3) yakuman('大三元')
      if (dragonTriplets.length === 2 && pair?.tiles[0].suit === 'z' && pair.tiles[0].rank >= 5) add('小三元', 2)
      const windTriplets = triplets.filter(group => group.tiles[0].suit === 'z' && group.tiles[0].rank <= 4)
      windTriplets.forEach(group => {
        if (group.tiles[0].rank === options.seatWind) add(`自風 ${['東', '南', '西', '北'][group.tiles[0].rank - 1]}`, 1)
        if (group.tiles[0].rank === options.roundWind) add(`場風 ${['東', '南', '西', '北'][group.tiles[0].rank - 1]}`, 1)
      })
      if (windTriplets.length === 4) yakuman('大四喜')
      if (windTriplets.length === 3 && pair?.tiles[0].suit === 'z' && pair.tiles[0].rank <= 4) yakuman('小四喜')
      const ronCompletedTriplet = options.winType === 'ron' && options.winningTile && triplets.some(group => !group.open && group.tiles.some(tile => sameTile(tile, options.winningTile!)))
      const concealedTriplets = triplets.filter(group => !group.open).length - (ronCompletedTriplet ? 1 : 0)
      if (concealedTriplets >= 3) add('三暗刻', 2)
      const pairWait = Boolean(options.winningTile && pair?.tiles.some(tile => sameTile(tile, options.winningTile!)))
      if (triplets.length === 4 && closed && (options.winType === 'tsumo' || pairWait)) yakuman(pairWait && options.winType === 'ron' ? '四暗刻単騎' : '四暗刻')
      if (triplets.filter(group => group.kind === 'quad').length === 4) yakuman('四槓子')
    }
    if (closed && !honors && suits.size === 1) {
      const suit = [...suits][0]
      const rankCounts = Array.from({ length: 9 }, (_, index) => all.filter(tile => tile.suit === suit && tile.rank === index + 1).length)
      if (rankCounts[0] >= 3 && rankCounts[8] >= 3 && rankCounts.slice(1, 8).every(count => count >= 1)) yakuman('九蓮宝燈')
    }
    if (!yaku.length) return null
    const dora = (options.doraIndicators ?? []).map(doraForIndicator).reduce((total, doraTile) => total + all.filter(tile => sameTile(tile, doraTile)).length, 0)
    if (dora) add(`ドラ ${dora}`, dora)
    const fu = calculateFu(groups, options, sevenPairs)
    const points = pointInfo(han, fu)
    return { yaku, han, fu, ...points }
  }).filter((value): value is MahjongWinInfo => value !== null)
  if (!candidates.length) return null
  return candidates.sort((left, right) => right.points - left.points || right.han - left.han || right.fu - left.fu)[0]
}
