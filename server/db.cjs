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
    create index if not exists hidegames_reports_room_idx on hidegames_reports (room_code, created_at desc);
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

async function loadRoom(code) {
  if (!pool) return null
  const result = await pool.query('select state from hidegames_rooms where code = $1', [code])
  return result.rows[0]?.state ?? null
}

async function saveRoom(code, room) {
  if (!pool) return
  const serializable = { ...room, access: { passwordHash: room.access?.passwordHash ?? null } }
  await pool.query(`insert into hidegames_rooms (code, state) values ($1, $2::jsonb)
    on conflict (code) do update set state = excluded.state, updated_at = now()`, [code, JSON.stringify(serializable)])
}

async function saveReport(report) {
  if (!pool) return
  await pool.query(`insert into hidegames_reports (id, room_code, reporter_id, target_id, reason, created_at)
    values ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0)) on conflict (id) do nothing`, [report.id, report.code, report.reporterId, report.targetId, report.reason, report.createdAt])
}

module.exports = { initializeDatabase, loadRoom, saveRoom, saveReport, createUser, findUserByEmail, enabled: Boolean(pool) }
