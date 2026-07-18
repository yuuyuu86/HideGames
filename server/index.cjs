const http = require('http')
const fs = require('fs')
const path = require('path')
const { Server } = require('socket.io')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const database = require('./db.cjs')

const port = Number(process.env.PORT || 3001)
const jwtSecret = process.env.AUTH_JWT_SECRET || null
const distDirectory = path.resolve(__dirname, '..', 'dist')
const requestLimits = new Map()
const sendJson = (response, status, body, headers = {}) => { response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', ...headers }); response.end(JSON.stringify(body)) }
const readJson = request => new Promise((resolve, reject) => { let body = ''; request.on('data', chunk => { body += chunk; if (body.length > 20_000) request.destroy() }); request.on('end', () => { try { resolve(body ? JSON.parse(body) : {}) } catch { reject(new Error('invalid JSON')) } }); request.on('error', reject) })
const clientKey = request => String(request.headers['cf-connecting-ip'] || request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown').split(',')[0].trim()
function rateLimit(bucket, key, maximum, windowMs) {
  const now = Date.now(); const id = `${bucket}:${key}`; const current = requestLimits.get(id)
  if (!current || current.resetAt <= now) { requestLimits.set(id, { count: 1, resetAt: now + windowMs }); return null }
  if (current.count >= maximum) return Math.max(1, Math.ceil((current.resetAt - now) / 1000))
  current.count += 1
  return null
}
function clearRateLimit(bucket, key) { requestLimits.delete(`${bucket}:${key}`) }
setInterval(() => { const now = Date.now(); for (const [id, value] of requestLimits) if (value.resetAt <= now) requestLimits.delete(id) }, 60_000).unref()
function readAuthenticatedUser(request) {
  if (!jwtSecret) return null
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.authorization ?? '')
  if (!match) return null
  try { return jwt.verify(match[1], jwtSecret, { issuer: 'hidegames' }) }
  catch { return null }
}
function serveStatic(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false
  const pathname = new URL(request.url, 'http://localhost').pathname
  const requested = path.resolve(distDirectory, `.${pathname === '/' ? '/index.html' : pathname}`)
  const file = requested.startsWith(distDirectory) && fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(distDirectory, 'index.html')
  if (!fs.existsSync(file)) return false
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' }
  response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': file.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable' })
  if (request.method === 'HEAD') response.end(); else fs.createReadStream(file).pipe(response)
  return true
}
async function handleHttp(request, response) {
  if (request.method === 'OPTIONS') return sendJson(response, 204, {})
  if (request.method === 'GET' && request.url === '/health') return sendJson(response, 200, { ok: true, persistence: database.enabled, auth: Boolean(jwtSecret) })
  const url = new URL(request.url, 'http://localhost')
  if (url.pathname === '/api/matches' || url.pathname === '/api/rankings') {
    if (!database.enabled || !jwtSecret) return sendJson(response, 503, { error: '記録サービスはまだ設定されていません' })
    try {
      if (url.pathname === '/api/matches' && request.method === 'GET') {
        const user = readAuthenticatedUser(request)
        if (!user?.sub) return sendJson(response, 401, { error: 'ログインが必要です' })
        return sendJson(response, 200, { matches: await database.listMatchResults(user.sub) })
      }
      if (url.pathname === '/api/matches' && request.method === 'POST') {
        const user = readAuthenticatedUser(request)
        if (!user?.sub) return sendJson(response, 401, { error: 'ログインが必要です' })
        const retryAfter = rateLimit('match-write', user.sub, 60, 60_000)
        if (retryAfter) return sendJson(response, 429, { error: '記録の送信が多すぎます。少し待ってからもう一度試してください' }, { 'Retry-After': String(retryAfter) })
        const { game, result, snapshot } = await readJson(request)
        if (typeof game !== 'string' || !game.trim() || game.length > 80 || !['win', 'loss', 'draw'].includes(result)) return sendJson(response, 400, { error: '戦績の内容が正しくありません' })
        if (snapshot !== undefined && JSON.stringify(snapshot).length > 180_000) return sendJson(response, 413, { error: 'リプレイの記録が大きすぎます' })
        const match = await database.saveMatchResult(user.sub, { game: game.trim(), result, snapshot })
        return sendJson(response, 201, { match })
      }
      if (url.pathname === '/api/rankings' && request.method === 'GET') {
        const game = url.searchParams.get('game')?.trim() ?? ''
        if (!game || game.length > 80) return sendJson(response, 400, { error: 'ゲーム名を指定してください' })
        return sendJson(response, 200, { rankings: await database.listRankings(game) })
      }
      return sendJson(response, 405, { error: 'Method not allowed' })
    } catch (error) { console.error('Could not handle match API:', error.message); return sendJson(response, 500, { error: '記録の処理に失敗しました' }) }
  }
  if (url.pathname === '/api/friends' || url.pathname.startsWith('/api/friends/')) {
    if (!database.enabled || !jwtSecret) return sendJson(response, 503, { error: 'フレンドサービスはまだ設定されていません' })
    const user = readAuthenticatedUser(request)
    if (!user?.sub) return sendJson(response, 401, { error: 'ログインが必要です' })
    try {
      if (url.pathname === '/api/friends' && request.method === 'GET') return sendJson(response, 200, { friends: await database.listFriends(user.sub) })
      if (url.pathname === '/api/friends' && request.method === 'POST') {
        const retryAfter = rateLimit('friend-write', user.sub, 20, 60_000)
        if (retryAfter) return sendJson(response, 429, { error: 'フレンド操作が多すぎます。少し待ってからもう一度試してください' }, { 'Retry-After': String(retryAfter) })
        const { email: rawEmail } = await readJson(request)
        const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
        if (!/^\S+@\S+\.\S+$/.test(email)) return sendJson(response, 400, { error: 'フレンドのメールアドレスを入力してください' })
        return sendJson(response, 201, { friend: await database.createFriendship(user.sub, email) })
      }
      if (url.pathname.startsWith('/api/friends/') && request.method === 'DELETE') {
        const friendId = decodeURIComponent(url.pathname.slice('/api/friends/'.length))
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(friendId)) return sendJson(response, 400, { error: 'フレンドIDが正しくありません' })
        const removed = await database.removeFriendship(user.sub, friendId)
        return sendJson(response, removed ? 200 : 404, removed ? { ok: true } : { error: 'フレンドが見つかりません' })
      }
      return sendJson(response, 405, { error: 'Method not allowed' })
    } catch (error) {
      const status = error.code === 'FRIEND_NOT_FOUND' ? 404 : error.code === 'FRIEND_SELF' ? 400 : 500
      return sendJson(response, status, { error: error.message === 'DATABASE_URL is not configured' ? 'フレンドサービスはまだ設定されていません' : error.message || 'フレンドの処理に失敗しました' })
    }
  }
  if (url.pathname === '/api/profile') {
    if (!database.enabled || !jwtSecret) return sendJson(response, 503, { error: 'プロフィールサービスはまだ設定されていません' })
    const user = readAuthenticatedUser(request)
    if (!user?.sub) return sendJson(response, 401, { error: 'ログインが必要です' })
    if (request.method !== 'PATCH') return sendJson(response, 405, { error: 'Method not allowed' })
    try {
      const retryAfter = rateLimit('profile-write', user.sub, 10, 60_000)
      if (retryAfter) return sendJson(response, 429, { error: 'プロフィール更新が多すぎます。少し待ってからもう一度試してください' }, { 'Retry-After': String(retryAfter) })
      const { displayName } = await readJson(request)
      const name = typeof displayName === 'string' ? displayName.trim().slice(0, 32) : ''
      if (!name) return sendJson(response, 400, { error: '表示名を入力してください' })
      const updated = await database.updateUserDisplayName(user.sub, name)
      if (!updated) return sendJson(response, 404, { error: 'アカウントが見つかりません' })
      const token = jwt.sign({ sub: updated.id, name: updated.display_name }, jwtSecret, { expiresIn: '7d', issuer: 'hidegames' })
      return sendJson(response, 200, { token, user: { id: updated.id, displayName: updated.display_name } })
    } catch (error) { return sendJson(response, 500, { error: 'プロフィールを更新できませんでした' }) }
  }
  if (request.method !== 'POST' || !['/auth/signup', '/auth/login'].includes(url.pathname)) return serveStatic(request, response) || sendJson(response, 404, { error: 'Not found' })
  if (!database.enabled || !jwtSecret) return sendJson(response, 503, { error: '認証サービスはまだ設定されていません' })
  const identity = clientKey(request)
  const retryAfter = rateLimit('auth', identity, 10, 15 * 60_000)
  if (retryAfter) return sendJson(response, 429, { error: '認証の試行回数が多すぎます。しばらく待ってから再試行してください' }, { 'Retry-After': String(retryAfter) })
  try {
    const { email: rawEmail, password, displayName } = await readJson(request)
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
    if (!/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length < 8) return sendJson(response, 400, { error: 'メールアドレスと8文字以上のパスワードを入力してください' })
    let user
    if (url.pathname === '/auth/signup') {
      const name = typeof displayName === 'string' ? displayName.trim().slice(0, 32) : ''
      if (!name) return sendJson(response, 400, { error: '表示名を入力してください' })
      user = await database.createUser({ email, passwordHash: await bcrypt.hash(password, 12), displayName: name })
    } else {
      const stored = await database.findUserByEmail(email)
      if (!stored || !await bcrypt.compare(password, stored.password_hash)) return sendJson(response, 401, { error: 'メールアドレスまたはパスワードが正しくありません' })
      user = stored
    }
    const token = jwt.sign({ sub: user.id, name: user.display_name }, jwtSecret, { expiresIn: '7d', issuer: 'hidegames' })
    clearRateLimit('auth', identity)
    return sendJson(response, 200, { token, user: { id: user.id, email: user.email, displayName: user.display_name } })
  } catch (error) { return sendJson(response, error.code === '23505' ? 409 : 500, { error: error.code === '23505' ? 'このメールアドレスは登録済みです' : '認証処理に失敗しました' }) }
}
const server = http.createServer(handleHttp)
const io = new Server(server, { cors: { origin: true, methods: ['GET', 'POST'] } })
const rooms = new Map()
const reports = []
const disconnectTimers = new Map()
const disconnectGraceMs = Math.max(1_000, Number(process.env.DISCONNECT_GRACE_MS || 15_000))
const tagGems = [{ x: 3, y: 1 }, { x: 8, y: 2 }, { x: 6, y: 6 }, { x: 10, y: 4 }]
const tagKeys = [{ x: 1, y: 1 }, { x: 10, y: 6 }]
const tagExit = { x: 11, y: 1 }
const tagWarps = [{ from: { x: 0, y: 7 }, to: { x: 11, y: 7 } }, { from: { x: 11, y: 7 }, to: { x: 0, y: 7 } }]
const tagWall = (x, y) => (x === 4 && y > 1 && y < 6) || (y === 3 && x > 6 && x < 10)
const sharedStateGames = new Set(['memo', 'drawing', 'youtube'])
const playerTurnGames = new Set(['oldmaid', 'uno', 'daifugo', 'sevens', 'mahjong', 'tetris', 'puzzle', 'memory', 'sugoroku', 'shiritori'])
const colorTurnGames = {
  othello: ['b', 'w'], gomoku: ['black', 'white'], connect4: ['red', 'yellow'], shogi: ['b', 'w'], go: ['b', 'w'], chess: ['w', 'b'],
}

function isMahjongCall(room, previous, nextState, senderId) {
  const discard = previous.lastDiscard
  const call = nextState.calledMeld
  if (!discard?.owner || discard.owner === senderId || !call || !['pon', 'chi', 'kan'].includes(call.kind)) return false
  if (nextState.turn !== senderId || (nextState.melds?.[senderId]?.length ?? 0) !== (previous.melds?.[senderId]?.length ?? 0) + 1) return false
  const beforeHand = previous.hands?.[senderId] ?? []
  const afterHand = nextState.hands?.[senderId] ?? []
  const tilesUsed = call.kind === 'kan' ? 3 : 2
  if (afterHand.length !== beforeHand.length - tilesUsed) return false
  const meld = nextState.melds?.[senderId]?.at(-1)
  if (!Array.isArray(meld) || meld.length !== tilesUsed + 1) return false
  const keys = meld.map(tile => `${tile?.suit}${tile?.rank}`)
  const discardKey = `${discard.tile?.suit}${discard.tile?.rank}`
  const matchingDiscardTiles = keys.filter(key => key === discardKey).length
  if (call.kind === 'kan') return matchingDiscardTiles === 4
  if (matchingDiscardTiles !== 1) return false
  if (call.kind === 'pon') return keys.every(key => key === discardKey)
  const ownerIndex = room.members.findIndex(member => member.id === discard.owner)
  if (room.members[(ownerIndex + 1) % room.members.length]?.id !== senderId) return false
  const suits = meld.map(tile => tile?.suit)
  const ranks = meld.map(tile => Number(tile?.rank)).sort((a, b) => a - b)
  return suits.every(suit => suit === suits[0] && suit !== 'z') && ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1
}

function canUpdateTetrisState(room, previous, nextState, senderId) {
  const beforePlayers = previous.players
  const afterPlayers = nextState.players
  if (!beforePlayers || !afterPlayers || !room.members.some(member => member.id === senderId) || !afterPlayers[senderId]) return false
  for (const member of room.members) {
    if (member.id === senderId) continue
    const before = beforePlayers[member.id]
    const after = afterPlayers[member.id]
    if (!before || !after) return false
    const { pendingGarbage: beforeGarbage = 0, ...beforeRest } = before
    const { pendingGarbage: afterGarbage = 0, ...afterRest } = after
    if (JSON.stringify(beforeRest) !== JSON.stringify(afterRest) || !Number.isInteger(afterGarbage) || afterGarbage < beforeGarbage || afterGarbage > beforeGarbage + 4) return false
  }
  return true
}

function canUpdatePuzzleState(room, previous, nextState, senderId) {
  const beforePlayers = previous.players
  const afterPlayers = nextState.players
  if (!beforePlayers || !afterPlayers || previous.turn !== senderId || !afterPlayers[senderId]) return false
  const senderIndex = room.members.findIndex(member => member.id === senderId)
  const nextPlayer = Array.from({ length: room.members.length }, (_, offset) => room.members[(senderIndex + 1 + offset) % room.members.length]?.id).find(id => id && (id === senderId || !beforePlayers[id]?.lost))
  if (nextState.turn !== senderId && nextState.turn !== nextPlayer) return false
  for (const member of room.members) {
    if (member.id === senderId) continue
    const before = beforePlayers[member.id]
    const after = afterPlayers[member.id]
    if (!before || !after) return false
    const { pendingGarbage: beforeGarbage = 0, ...beforeRest } = before
    const { pendingGarbage: afterGarbage = 0, ...afterRest } = after
    if (JSON.stringify(beforeRest) !== JSON.stringify(afterRest) || !Number.isInteger(afterGarbage) || afterGarbage < beforeGarbage || afterGarbage > beforeGarbage + 3) return false
  }
  return true
}

function canUpdateGameState(room, game, nextState, senderId, isHost) {
  if (game === 'tag' || !nextState || typeof nextState !== 'object') return false
  if (game === 'tournament') return isHost
  if (sharedStateGames.has(game)) return true
  if (game !== room.game) return false
  const previous = room.gameState[game]
  if (!previous || typeof previous !== 'object') return isHost
  if (previous.winner || previous.loser || previous.lost || previous.draw) return isHost
  if (game === 'tetris') return canUpdateTetrisState(room, previous, nextState, senderId)
  if (game === 'puzzle') return canUpdatePuzzleState(room, previous, nextState, senderId)
  if (game === 'mahjong' && nextState.winner === senderId && nextState.winType === 'ron' && previous.lastDiscard?.owner && previous.lastDiscard.owner !== senderId) return true
  if (game === 'mahjong' && isMahjongCall(room, previous, nextState, senderId)) return true
  const colors = colorTurnGames[game]
  if (colors) {
    const playerIndex = colors.indexOf(previous.turn)
    return playerIndex >= 0 && room.members[playerIndex]?.id === senderId
  }
  if (!playerTurnGames.has(game)) return true
  return typeof previous.turn !== 'string' || previous.turn === senderId
}

function hasOnlySafeExternalLinks(state) {
  if (!Object.hasOwn(state, 'links')) return true
  if (!Array.isArray(state.links) || state.links.length > 12) return false
  return state.links.every(link => {
    if (!link || typeof link.url !== 'string' || typeof link.label !== 'string' || link.url.length > 2000 || link.label.length > 120) return false
    try { return ['http:', 'https:'].includes(new URL(link.url).protocol) } catch { return false }
  })
}

function blankRoom() {
  return { members: [], messages: [], game: 'tag', paused: false, gameState: {}, awayHistory: [], resume: { readyIds: [] }, access: { passwordHash: null } }
}

function normalizeHosts(room) {
  room.members = room.members.map((member, index) => ({ ...member, host: index === 0 }))
}

const disconnectKey = (code, memberId) => `${code}:${memberId}`
function cancelPendingDisconnect(code, memberId) {
  const key = disconnectKey(code, memberId); const timer = disconnectTimers.get(key)
  if (timer) clearTimeout(timer)
  disconnectTimers.delete(key)
}

function announceHostTransfer(room, member) {
  room.messages = [...room.messages.slice(-99), { id: `host-${Date.now()}-${member.id}`, name: 'HideGames', tone: 'mint', text: `${member.name} さんが新しいホストになりました`, time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) }]
}

function getRoom(code) {
  if (!rooms.has(code)) rooms.set(code, blankRoom())
  return rooms.get(code)
}

async function hydrateRoom(code) {
  if (rooms.has(code)) return rooms.get(code)
  try {
    const saved = await database.loadRoom(code)
    if (saved && typeof saved === 'object') {
      const room = { ...blankRoom(), ...saved, members: [], resume: { readyIds: [] }, access: { passwordHash: saved.access?.passwordHash ?? null } }
      normalizeHosts(room)
      rooms.set(code, room)
      return room
    }
  } catch (error) { console.error('Could not load room from database:', error.message) }
  return getRoom(code)
}

function broadcastRoom(code) {
  const room = getRoom(code)
  io.to(code).emit('room:state', { ...room, access: { locked: Boolean(room.access?.passwordHash) } })
  database.saveRoom(code, room).catch(error => console.error('Could not save room to database:', error.message))
}

function tagState(room) {
  if (!room.gameState.tag) {
    room.gameState.tag = { positions: {}, collected: [], keys: [], caught: [], infected: [], transformed: [], teamHunters: [room.members[0]?.id].filter(Boolean), mode: 'gems', remainingMoves: 120, hunterId: room.members[0]?.id ?? null, winner: null }
  }
  if (!Array.isArray(room.gameState.tag.keys)) room.gameState.tag.keys = []
  if (!Array.isArray(room.gameState.tag.caught)) room.gameState.tag.caught = []
  if (!Array.isArray(room.gameState.tag.infected)) room.gameState.tag.infected = [room.gameState.tag.hunterId].filter(Boolean)
  if (!Array.isArray(room.gameState.tag.transformed)) room.gameState.tag.transformed = []
  if (!Array.isArray(room.gameState.tag.teamHunters)) room.gameState.tag.teamHunters = [room.gameState.tag.hunterId].filter(Boolean)
  if (!['gems', 'escape', 'classic', 'infection', 'transform', 'team'].includes(room.gameState.tag.mode)) room.gameState.tag.mode = 'gems'
  if (!Number.isInteger(room.gameState.tag.remainingMoves)) room.gameState.tag.remainingMoves = 120
  return room.gameState.tag
}

io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next()
  if (!jwtSecret) return next(new Error('Authentication is not configured'))
  try { socket.data.user = jwt.verify(token, jwtSecret, { issuer: 'hidegames' }); return next() }
  catch { return next(new Error('Invalid session')) }
})

io.on('connection', socket => {
  socket.on('room:join', async ({ code, member, password }) => {
    if (!code || !member?.id || !member?.name) return
    if (socket.data.user) { member = { ...member, id: socket.data.user.sub, name: socket.data.user.name } }
    member = {
      ...member,
      id: String(member.id).slice(0, 80),
      name: String(member.name).trim().slice(0, 32),
      color: ['mint', 'purple', 'blue', 'orange'].includes(member.color) ? member.color : 'mint',
      ready: Boolean(member.ready),
    }
    if (!member.id || !member.name) return socket.emit('room:error', { message: '参加者情報が正しくありません' })
    const room = await hydrateRoom(code)
    if (room.access?.passwordHash && !await bcrypt.compare(typeof password === 'string' ? password : '', room.access.passwordHash)) return socket.emit('room:error', { message: 'このルームにはパスワードが必要です' })
    const existing = room.members.findIndex(item => item.id === member.id)
    if (existing < 0 && room.members.length >= 8) return socket.emit('room:error', { message: 'このルームは8人までです' })
    socket.data.roomCode = code
    socket.data.memberId = member.id
    socket.join(code)
    cancelPendingDisconnect(code, member.id)
    if (existing >= 0) room.members[existing] = { ...room.members[existing], ...member, connected: true }
    else room.members.push({ ...member, connected: true })
    normalizeHosts(room)
    if (room.game === 'tag') {
      const state = tagState(room)
      if (!state.positions[member.id]) state.positions[member.id] = { x: 1 + (room.members.length % 3), y: 5 }
      if (!state.hunterId) state.hunterId = member.id
    }
    broadcastRoom(code)
  })

  socket.on('room:event', event => {
    const code = socket.data.roomCode
    if (!code || !event?.type) return
    if (rateLimit('socket-event', socket.id, 180, 10_000)) return
    const room = getRoom(code)
    const sender = room.members.find(member => member.id === socket.data.memberId)
    const isHost = room.members[0]?.id === socket.data.memberId
    if (!sender) return
    if (event.type === 'chat' && typeof event.message?.text === 'string' && event.message.text.trim().length <= 500) {
      room.messages = [...room.messages.slice(-99), { ...event.message, id: `${Date.now()}-${socket.data.memberId}`, name: sender.name, tone: sender.color, text: event.message.text.trim() }]
    }
    if (event.type === 'ready' && event.id === socket.data.memberId) room.members = room.members.map(member => member.id === event.id ? { ...member, ready: Boolean(event.ready) } : member)
    if (event.type === 'game') {
      if (!isHost || typeof event.game !== 'string' || event.game.length > 40) return broadcastRoom(code)
      room.game = event.game
      if (event.game === 'tag') {
        const state = tagState(room)
        room.members.forEach((member, index) => { if (!state.positions[member.id]) state.positions[member.id] = { x: 1 + (index % 3), y: 5 } })
      }
      if (event.game === 'werewolf' || event.game === 'wordwolf') {
        const roles = event.game === 'werewolf' ? ['人狼', '市民', '市民', '占い師'] : ['少数派', '多数派', '多数派', '多数派']
        room.gameState[event.game] = { phase: 'discussion', votes: {}, round: 1 }
        const members = room.members
        for (const client of io.sockets.sockets.values()) {
          if (!client.rooms.has(code)) continue
          const memberIndex = members.findIndex(member => member.id === client.data.memberId)
          if (memberIndex >= 0) client.emit('room:private', { game: event.game, state: { role: roles[memberIndex % roles.length], word: event.game === 'wordwolf' ? (memberIndex % roles.length === 0 ? '紅茶' : 'コーヒー') : undefined } })
        }
      }
    }
    if (event.type === 'pause') {
      if (!isHost) return broadcastRoom(code)
      room.paused = Boolean(event.paused)
      if (room.paused) room.resume = { readyIds: [] }
    }
    if (event.type === 'away') {
      if (event.id !== socket.data.memberId) return broadcastRoom(code)
      room.members = room.members.map(member => member.id === event.id ? { ...member, away: Boolean(event.away) } : member)
      room.paused = room.members.some(member => member.away)
      room.awayHistory = [...room.awayHistory.slice(-49), { id: `${Date.now()}-${event.id}`, name: room.members.find(member => member.id === event.id)?.name ?? '参加者', away: Boolean(event.away), at: Date.now() }]
      room.resume = { readyIds: [] }
    }
    if (event.type === 'resume-ready') {
      if (event.id !== socket.data.memberId) return broadcastRoom(code)
      if (room.members.some(member => member.away)) return broadcastRoom(code)
      const readyIds = event.ready ? [...new Set([...room.resume.readyIds, event.id])] : room.resume.readyIds.filter(id => id !== event.id)
      room.resume = { readyIds }
      if (room.paused && room.members.length > 0 && room.members.every(member => readyIds.includes(member.id))) {
        const startsAt = Date.now() + 3000
        room.resume = { readyIds, startsAt }
        setTimeout(() => {
          const current = rooms.get(code)
          if (!current || current.resume?.startsAt !== startsAt || current.members.some(member => member.away)) return
          current.paused = false
          current.resume = { readyIds: [] }
          broadcastRoom(code)
        }, 3050)
      }
    }
    if (event.type === 'game-state' && typeof event.game === 'string' && event.game.length <= 40 && event.state && JSON.stringify(event.state).length <= 200000) {
      if (!canUpdateGameState(room, event.game, event.state, socket.data.memberId, isHost)) return broadcastRoom(code)
      if (event.game === 'youtube' && !hasOnlySafeExternalLinks(event.state)) return broadcastRoom(code)
      room.gameState[event.game] = event.state
    }
    if (event.type === 'tag-move') {
      const state = tagState(room)
      const point = event.position
      const memberIndex = room.members.findIndex(member => member.id === socket.data.memberId)
      const previousPoint = state.positions[socket.data.memberId] ?? { x: 1 + (Math.max(memberIndex, 0) % 3), y: 5 }
      const adjacent = point && Math.abs(point.x - previousPoint.x) + Math.abs(point.y - previousPoint.y) === 1
      const caughtPlayer = (state.mode === 'classic' || state.mode === 'team') && state.caught.includes(socket.data.memberId)
      if (!room.paused && !caughtPlayer && !state.winner && adjacent && point && Number.isInteger(point.x) && Number.isInteger(point.y) && point.x >= 0 && point.x < 12 && point.y >= 0 && point.y < 8 && !tagWall(point.x, point.y)) {
        const warp = tagWarps.find(item => item.from.x === point.x && item.from.y === point.y)
        state.positions[socket.data.memberId] = warp ? warp.to : point
        const currentPoint = state.positions[socket.data.memberId]
        const gemIndex = tagGems.findIndex((gem, index) => !state.collected.includes(index) && gem.x === currentPoint.x && gem.y === currentPoint.y)
        if (gemIndex >= 0) state.collected.push(gemIndex)
        if (gemIndex >= 0 && state.mode === 'transform' && socket.data.memberId !== state.hunterId && !state.transformed.includes(socket.data.memberId)) state.transformed.push(socket.data.memberId)
        const keyIndex = tagKeys.findIndex((key, index) => !state.keys.includes(index) && key.x === currentPoint.x && key.y === currentPoint.y)
        if (keyIndex >= 0) state.keys.push(keyIndex)
        const taggers = state.mode === 'infection' ? state.infected : state.mode === 'team' ? state.teamHunters : [state.hunterId]
        if (!taggers.includes(socket.data.memberId)) state.remainingMoves = Math.max(0, state.remainingMoves - 1)
        const caught = room.members.filter(member => !taggers.includes(member.id) && (state.mode !== 'classic' && state.mode !== 'team' || !state.caught.includes(member.id)) && state.positions[member.id] && taggers.some(id => state.positions[id] && state.positions[id].x === state.positions[member.id].x && state.positions[id].y === state.positions[member.id].y))
        const transformedHunterCatch = state.mode === 'transform' && state.transformed.some(id => state.positions[id] && state.positions[state.hunterId] && state.positions[id].x === state.positions[state.hunterId].x && state.positions[id].y === state.positions[state.hunterId].y)
        if (transformedHunterCatch) state.winner = 'runners'
        if (caught.length && state.mode === 'infection') { state.infected.push(...caught.map(member => member.id)); if (state.infected.length === room.members.length) state.winner = 'infected' }
        else if (caught.length && (state.mode === 'classic' || state.mode === 'team')) { state.caught.push(...caught.map(member => member.id)); if (state.caught.length >= room.members.length - taggers.length) state.winner = state.hunterId }
        else if (caught.length && !transformedHunterCatch) state.winner = state.hunterId
        if (state.mode === 'gems' && state.collected.length === tagGems.length) state.winner = 'runners'
        if (state.mode === 'escape' && state.keys.length === tagKeys.length && currentPoint.x === tagExit.x && currentPoint.y === tagExit.y) state.winner = 'runners'
        if ((state.mode === 'classic' || state.mode === 'infection' || state.mode === 'transform' || state.mode === 'team') && state.remainingMoves === 0) state.winner = 'runners'
      }
    }
    if (event.type === 'tag-mode' && isHost && ['gems', 'escape', 'classic', 'infection', 'transform', 'team'].includes(event.mode)) {
      const state = tagState(room)
      const hunterIndex = Math.max(0, room.members.findIndex(member => member.id === state.hunterId))
      const teamHunters = event.mode === 'team' && room.members.length >= 3 ? [state.hunterId, room.members[(hunterIndex + 1) % room.members.length]?.id].filter(Boolean) : [state.hunterId].filter(Boolean)
      state.mode = event.mode; state.positions = Object.fromEntries(room.members.map((member, memberIndex) => [member.id, { x: 1 + (memberIndex % 3), y: 5 }])); state.collected = []; state.keys = []; state.caught = []; state.infected = event.mode === 'infection' ? [state.hunterId].filter(Boolean) : []; state.transformed = []; state.teamHunters = [...new Set(teamHunters)]; state.remainingMoves = 120; state.winner = null
    }
    if (event.type === 'tag-rematch') {
      const previous = tagState(room).hunterId
      const index = Math.max(0, room.members.findIndex(member => member.id === previous))
      const hunter = room.members.length ? room.members[(index + 1) % room.members.length].id : null
      const mode = tagState(room).mode
      const teamHunters = mode === 'team' && room.members.length >= 3 ? [hunter, room.members[(index + 2) % room.members.length]?.id].filter(Boolean) : [hunter].filter(Boolean)
      room.gameState.tag = { positions: Object.fromEntries(room.members.map((member, memberIndex) => [member.id, { x: 1 + (memberIndex % 3), y: 5 }])), collected: [], keys: [], caught: [], infected: mode === 'infection' ? [hunter].filter(Boolean) : [], transformed: [], teamHunters: [...new Set(teamHunters)], mode, remainingMoves: 120, hunterId: hunter, winner: null }
    }
    broadcastRoom(code)
  })

  socket.on('room:signal', ({ target, data }) => {
    const code = socket.data.roomCode
    if (!code || !target || !data || typeof target !== 'string') return
    if (JSON.stringify(data).length > 20_000) return
    if (rateLimit('socket-signal', socket.id, 120, 10_000)) return
    for (const client of io.sockets.sockets.values()) {
      if (client.data.roomCode === code && client.data.memberId === target) client.emit('room:signal', { from: socket.data.memberId, target, data })
    }
  })

  socket.on('room:set-password', async ({ password }) => {
    const code = socket.data.roomCode
    if (!code || typeof password !== 'string') return
    const room = getRoom(code)
    if (room.members[0]?.id !== socket.data.memberId) return
    const normalized = password.trim().slice(0, 80)
    room.access = { passwordHash: normalized ? await bcrypt.hash(normalized, 12) : null }
    broadcastRoom(code)
  })

  socket.on('room:report', ({ targetId, reason }) => {
    const code = socket.data.roomCode
    if (!code || typeof targetId !== 'string' || typeof reason !== 'string') return
    const room = getRoom(code)
    const reporter = room.members.find(member => member.id === socket.data.memberId)
    const target = room.members.find(member => member.id === targetId)
    if (!reporter || !target || reporter.id === target.id || reason.trim().length > 300) return
    reports.push({ id: `${Date.now()}-${reporter.id}`, code, reporterId: reporter.id, targetId: target.id, reason: reason.trim(), createdAt: Date.now() })
    database.saveReport(reports.at(-1)).catch(error => console.error('Could not save report to database:', error.message))
    if (reports.length > 1000) reports.shift()
    socket.emit('room:report-ack')
  })

  socket.on('room:kick', ({ targetId }) => {
    const code = socket.data.roomCode
    if (!code || typeof targetId !== 'string') return
    const room = getRoom(code)
    if (room.members[0]?.id !== socket.data.memberId || targetId === socket.data.memberId) return
    const target = room.members.find(member => member.id === targetId)
    if (!target) return
    cancelPendingDisconnect(code, targetId)
    room.members = room.members.filter(member => member.id !== targetId)
    normalizeHosts(room)
    for (const client of io.sockets.sockets.values()) {
      if (client.data.roomCode !== code || client.data.memberId !== targetId) continue
      client.leave(code)
      delete client.data.roomCode
      delete client.data.memberId
      client.emit('room:error', { message: 'ホストによりルームから退出しました' })
    }
    broadcastRoom(code)
  })

  socket.on('disconnect', () => {
    clearRateLimit('socket-event', socket.id)
    clearRateLimit('socket-signal', socket.id)
    const code = socket.data.roomCode
    const memberId = socket.data.memberId
    if (!code || !memberId) return
    const hasAnotherConnection = [...io.sockets.sockets.values()].some(other => other.id !== socket.id && other.data.roomCode === code && other.data.memberId === memberId)
    if (hasAnotherConnection) return
    const room = getRoom(code)
    const member = room.members.find(item => item.id === memberId)
    if (!member) return
    room.members = room.members.map(item => item.id === memberId ? { ...item, connected: false } : item)
    broadcastRoom(code)
    const key = disconnectKey(code, memberId)
    cancelPendingDisconnect(code, memberId)
    disconnectTimers.set(key, setTimeout(() => {
      disconnectTimers.delete(key)
      const current = rooms.get(code)
      const stillDisconnected = current?.members.find(item => item.id === memberId && item.connected === false)
      if (!current || !stillDisconnected) return
      const wasHost = current.members[0]?.id === memberId
      current.members = current.members.filter(item => item.id !== memberId)
      current.resume = { readyIds: current.resume.readyIds.filter(id => id !== memberId) }
      if (current.members.length === 0) rooms.delete(code)
      else {
        normalizeHosts(current)
        if (wasHost) announceHostTransfer(current, current.members[0])
        broadcastRoom(code)
      }
    }, disconnectGraceMs))
  })
})

database.initializeDatabase()
  .then(enabled => console.log(enabled ? 'Neon persistence enabled' : 'Neon persistence disabled (DATABASE_URL is not set)'))
  .catch(error => console.error('Could not initialize Neon persistence:', error.message))
  .finally(() => server.listen(port, () => console.log(`HideGames realtime server listening on :${port}`)))
