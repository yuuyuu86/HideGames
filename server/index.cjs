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
const sendJson = (response, status, body) => { response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }); response.end(JSON.stringify(body)) }
const readJson = request => new Promise((resolve, reject) => { let body = ''; request.on('data', chunk => { body += chunk; if (body.length > 20_000) request.destroy() }); request.on('end', () => { try { resolve(body ? JSON.parse(body) : {}) } catch { reject(new Error('invalid JSON')) } }); request.on('error', reject) })
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
  if (request.method !== 'POST' || !['/auth/signup', '/auth/login'].includes(request.url)) return serveStatic(request, response) || sendJson(response, 404, { error: 'Not found' })
  if (!database.enabled || !jwtSecret) return sendJson(response, 503, { error: '認証サービスはまだ設定されていません' })
  try {
    const { email: rawEmail, password, displayName } = await readJson(request)
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
    if (!/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length < 8) return sendJson(response, 400, { error: 'メールアドレスと8文字以上のパスワードを入力してください' })
    let user
    if (request.url === '/auth/signup') {
      const name = typeof displayName === 'string' ? displayName.trim().slice(0, 32) : ''
      if (!name) return sendJson(response, 400, { error: '表示名を入力してください' })
      user = await database.createUser({ email, passwordHash: await bcrypt.hash(password, 12), displayName: name })
    } else {
      const stored = await database.findUserByEmail(email)
      if (!stored || !await bcrypt.compare(password, stored.password_hash)) return sendJson(response, 401, { error: 'メールアドレスまたはパスワードが正しくありません' })
      user = stored
    }
    const token = jwt.sign({ sub: user.id, name: user.display_name }, jwtSecret, { expiresIn: '7d', issuer: 'hidegames' })
    return sendJson(response, 200, { token, user: { id: user.id, email: user.email, displayName: user.display_name } })
  } catch (error) { return sendJson(response, error.code === '23505' ? 409 : 500, { error: error.code === '23505' ? 'このメールアドレスは登録済みです' : '認証処理に失敗しました' }) }
}
const server = http.createServer(handleHttp)
const io = new Server(server, { cors: { origin: true, methods: ['GET', 'POST'] } })
const rooms = new Map()
const reports = []
const tagGems = [{ x: 3, y: 1 }, { x: 8, y: 2 }, { x: 6, y: 6 }, { x: 10, y: 4 }]
const tagWall = (x, y) => (x === 4 && y > 1 && y < 6) || (y === 3 && x > 6 && x < 10)

function blankRoom() {
  return { members: [], messages: [], game: 'tag', paused: false, gameState: {}, awayHistory: [], resume: { readyIds: [] }, access: { passwordHash: null } }
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
      const room = { ...blankRoom(), ...saved, access: { passwordHash: saved.access?.passwordHash ?? null } }
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
    room.gameState.tag = { positions: {}, collected: [], hunterId: room.members[0]?.id ?? null, winner: null }
  }
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
    const room = await hydrateRoom(code)
    if (room.access?.passwordHash && !await bcrypt.compare(typeof password === 'string' ? password : '', room.access.passwordHash)) return socket.emit('room:error', { message: 'このルームにはパスワードが必要です' })
    socket.data.roomCode = code
    socket.data.memberId = member.id
    socket.join(code)
    const existing = room.members.findIndex(item => item.id === member.id)
    if (existing >= 0) room.members[existing] = { ...room.members[existing], ...member }
    else room.members.push(member)
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
    if (event.type === 'game-state' && typeof event.game === 'string' && event.game.length <= 40 && event.state && JSON.stringify(event.state).length <= 200000) room.gameState[event.game] = event.state
    if (event.type === 'tag-move') {
      const state = tagState(room)
      const point = event.position
      if (!state.winner && point && Number.isInteger(point.x) && Number.isInteger(point.y) && point.x >= 0 && point.x < 12 && point.y >= 0 && point.y < 8 && !tagWall(point.x, point.y)) {
        state.positions[socket.data.memberId] = point
        const gemIndex = tagGems.findIndex((gem, index) => !state.collected.includes(index) && gem.x === point.x && gem.y === point.y)
        if (gemIndex >= 0) state.collected.push(gemIndex)
        const hunterPoint = state.positions[state.hunterId]
        const caught = room.members.find(member => member.id !== state.hunterId && state.positions[member.id] && hunterPoint && state.positions[member.id].x === hunterPoint.x && state.positions[member.id].y === hunterPoint.y)
        if (caught) state.winner = state.hunterId
        if (state.collected.length === tagGems.length) state.winner = 'runners'
      }
    }
    if (event.type === 'tag-rematch') {
      const previous = tagState(room).hunterId
      const index = Math.max(0, room.members.findIndex(member => member.id === previous))
      const hunter = room.members.length ? room.members[(index + 1) % room.members.length].id : null
      room.gameState.tag = { positions: Object.fromEntries(room.members.map((member, memberIndex) => [member.id, { x: 1 + (memberIndex % 3), y: 5 }])), collected: [], hunterId: hunter, winner: null }
    }
    broadcastRoom(code)
  })

  socket.on('room:signal', ({ target, data }) => {
    const code = socket.data.roomCode
    if (!code || !target || !data || typeof target !== 'string') return
    io.to(code).emit('room:signal', { from: socket.data.memberId, target, data })
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

  socket.on('disconnect', () => {
    const code = socket.data.roomCode
    const memberId = socket.data.memberId
    if (!code || !memberId) return
    const room = getRoom(code)
    room.members = room.members.filter(member => member.id !== memberId)
    room.resume = { readyIds: room.resume.readyIds.filter(id => id !== memberId) }
    if (room.members.length === 0) rooms.delete(code)
    else broadcastRoom(code)
  })
})

database.initializeDatabase()
  .then(enabled => console.log(enabled ? 'Neon persistence enabled' : 'Neon persistence disabled (DATABASE_URL is not set)'))
  .catch(error => console.error('Could not initialize Neon persistence:', error.message))
  .finally(() => server.listen(port, () => console.log(`HideGames realtime server listening on :${port}`)))
