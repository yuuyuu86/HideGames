const { Pool } = require('pg')

const databaseUrl = process.env.DATABASE_URL
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: true } }) : null

async function initializeDatabase() {
  if (!pool) return false
  await pool.query(`
    create table if not exists hidegames_rooms (
      code varchar(12) primary key,
      state jsonb not null,
      updated_at timestamptz not null default now()
    );
    create table if not exists hidegames_reports (
      id text primary key,
      room_code varchar(12) not null,
      reporter_id text not null,
      target_id text not null,
      reason text not null,
      created_at timestamptz not null default now()
    );
    create table if not exists hidegames_users (
      id uuid primary key default gen_random_uuid(),
      email text unique not null,
      password_hash text not null,
      display_name text not null,
      created_at timestamptz not null default now()
    );
    create table if not exists hidegames_match_results (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references hidegames_users(id) on delete cascade,
      game varchar(80) not null,
      result varchar(8) not null check (result in ('win', 'loss', 'draw')),
      snapshot jsonb,
      created_at timestamptz not null default now()
    );
    create table if not exists hidegames_friendships (
      user_id uuid not null references hidegames_users(id) on delete cascade,
      friend_id uuid not null references hidegames_users(id) on delete cascade,
      created_at timestamptz not null default now(),
      primary key (user_id, friend_id),
      check (user_id <> friend_id)
    );
    create index if not exists hidegames_reports_room_idx on hidegames_reports (room_code, created_at desc);
    create index if not exists hidegames_match_results_user_idx on hidegames_match_results (user_id, created_at desc);
    create index if not exists hidegames_match_results_game_idx on hidegames_match_results (game, result, created_at desc);
    create index if not exists hidegames_friendships_friend_idx on hidegames_friendships (friend_id, created_at desc);
  `)
  return true
}

async function createUser({ email, passwordHash, displayName }) {
  if (!pool) throw new Error('DATABASE_URL is not configured')
  const result = await pool.query(`insert into hidegames_users (email, password_hash, display_name)
    values ($1, $2, $3) returning id, email, display_name`, [email, passwordHash, displayName])
  return result.rows[0]
}

async function findUserByEmail(email) {
  if (!pool) return null
  const result = await pool.query('select id, email, display_name, password_hash from hidegames_users where email = $1', [email])
  return result.rows[0] ?? null
}

async function saveMatchResult(userId, { game, result, snapshot }) {
  if (!pool) throw new Error('DATABASE_URL is not configured')
  const saved = await pool.query(`insert into hidegames_match_results (user_id, game, result, snapshot)
    values ($1, $2, $3, $4::jsonb) returning id, game, result, snapshot, created_at`, [userId, game, result, snapshot === undefined ? null : JSON.stringify(snapshot)])
  return saved.rows[0]
}

async function listMatchResults(userId) {
  if (!pool) return []
  const saved = await pool.query(`select id, game, result, snapshot, created_at
    from hidegames_match_results where user_id = $1 order by created_at desc limit 50`, [userId])
  return saved.rows
}

async function listRankings(game) {
  if (!pool) return []
  const saved = await pool.query(`select u.display_name, count(*) filter (where m.result = 'win')::int as wins,
    count(*)::int as matches
    from hidegames_match_results m join hidegames_users u on u.id = m.user_id
    where m.game = $1 group by u.id, u.display_name
    order by wins desc, matches asc, min(m.created_at) asc limit 20`, [game])
  return saved.rows
}

async function listFriends(userId) {
  if (!pool) return []
  const result = await pool.query(`select u.id, u.display_name, f.created_at
    from hidegames_friendships f join hidegames_users u on u.id = f.friend_id
    where f.user_id = $1 order by lower(u.display_name), f.created_at`, [userId])
  return result.rows
}

async function createFriendship(userId, email) {
  if (!pool) throw new Error('DATABASE_URL is not configured')
  const target = await findUserByEmail(email)
  if (!target) { const error = new Error('フレンドのアカウントが見つかりません'); error.code = 'FRIEND_NOT_FOUND'; throw error }
  if (target.id === userId) { const error = new Error('自分自身はフレンドに追加できません'); error.code = 'FRIEND_SELF'; throw error }
  await pool.query(`insert into hidegames_friendships (user_id, friend_id) values ($1, $2), ($2, $1)
    on conflict (user_id, friend_id) do nothing`, [userId, target.id])
  return { id: target.id, display_name: target.display_name }
}

async function removeFriendship(userId, friendId) {
  if (!pool) throw new Error('DATABASE_URL is not configured')
  const result = await pool.query(`delete from hidegames_friendships
    where (user_id = $1 and friend_id = $2) or (user_id = $2 and friend_id = $1)`, [userId, friendId])
  return result.rowCount > 0
}

async function loadRoom(code) {
  if (!pool) return null
  const result = await pool.query('select state from hidegames_rooms where code = $1', [code])
  return result.rows[0]?.state ?? null
}

function serializeRoom(room) {
  return { ...room, members: [], resume: { readyIds: [] }, access: { passwordHash: room.access?.passwordHash ?? null } }
}

async function saveRoom(code, room) {
  if (!pool) return
  const serializable = serializeRoom(room)
  await pool.query(`insert into hidegames_rooms (code, state) values ($1, $2::jsonb)
    on conflict (code) do update set state = excluded.state, updated_at = now()`, [code, JSON.stringify(serializable)])
}

async function saveReport(report) {
  if (!pool) return
  await pool.query(`insert into hidegames_reports (id, room_code, reporter_id, target_id, reason, created_at)
    values ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0)) on conflict (id) do nothing`, [report.id, report.code, report.reporterId, report.targetId, report.reason, report.createdAt])
}

module.exports = { initializeDatabase, loadRoom, saveRoom, saveReport, createUser, findUserByEmail, saveMatchResult, listMatchResults, listRankings, listFriends, createFriendship, removeFriendship, serializeRoom, enabled: Boolean(pool) }
