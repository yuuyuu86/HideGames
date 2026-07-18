import { useCallback, useEffect, useState } from 'react'

export type ReplayRecord = { id: string; game: string; result: 'win' | 'loss' | 'draw'; playedAt: string; summary: string; snapshot?: unknown }
export type MatchRecord = { id: string; game: string; result: 'win' | 'loss' | 'draw'; playedAt: string; replayId?: string }
export type PlayerData = {
  displayName: string
  title: string
  level: number
  xp: number
  favourites: string[]
  achievements: string[]
  matches: MatchRecord[]
  replays: ReplayRecord[]
}

const initial: PlayerData = {
  displayName: 'yuta', title: '夜更かしプレイヤー', level: 12, xp: 480,
  favourites: ['tag', 'othello', 'gomoku'],
  achievements: ['初勝利', '連続ログイン', '鬼から逃げ切る'],
  matches: [],
  replays: [],
}

const apiBase = () => {
  const localHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  return import.meta.env.VITE_SOCKET_URL || (localHost ? `http://${window.location.hostname}:3001` : window.location.origin)
}
const summaryFor = (result: MatchRecord['result']) => result === 'win' ? '勝利した試合の記録' : result === 'loss' ? '敗北した試合の記録' : '引き分けた試合の記録'
const fromServer = (saved: { id: string; game: string; result: MatchRecord['result']; snapshot?: unknown; created_at: string }): { match: MatchRecord; replay: ReplayRecord } => {
  const replay = { id: saved.id, game: saved.game, result: saved.result, playedAt: saved.created_at, summary: summaryFor(saved.result), snapshot: saved.snapshot }
  return { match: { id: saved.id, game: saved.game, result: saved.result, playedAt: saved.created_at, replayId: saved.id }, replay }
}

export function usePlayerData() {
  const [data, setData] = useState<PlayerData>(() => {
    try { return { ...initial, ...JSON.parse(localStorage.getItem('hidegames.player-data') ?? '{}') } } catch { return initial }
  })
  useEffect(() => localStorage.setItem('hidegames.player-data', JSON.stringify(data)), [data])
  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem('hidegames.auth-token')
      if (!token) return
      const accountName = localStorage.getItem('hidegames.account-name')?.trim()
      if (accountName) setData(current => current.displayName === accountName ? current : { ...current, displayName: accountName })
      try {
        const response = await fetch(`${apiBase()}/api/matches`, { headers: { Authorization: `Bearer ${token}` } })
        const body = await response.json() as { matches?: Array<{ id: string; game: string; result: MatchRecord['result']; snapshot?: unknown; created_at: string }> }
        if (!response.ok || !body.matches) return
        const records = body.matches.map(fromServer)
        setData(current => ({ ...current, matches: records.map(item => item.match), replays: records.map(item => item.replay) }))
      } catch { /* Offline use keeps the local history. */ }
    }
    void load()
    window.addEventListener('hidegames-auth', load)
    return () => window.removeEventListener('hidegames-auth', load)
  }, [])
  const updateProfile = useCallback((displayName: string) => setData(current => ({ ...current, displayName: displayName.trim() || current.displayName })), [])
  const recordMatch = useCallback((game: string, result: MatchRecord['result'], snapshot?: unknown) => {
    const token = localStorage.getItem('hidegames.auth-token')
    if (token) {
      void fetch(`${apiBase()}/api/matches`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ game, result, snapshot }) }).catch(() => undefined)
    }
    setData(current => {
    const replay = { id: crypto.randomUUID(), game, result, playedAt: new Date().toISOString(), summary: summaryFor(result), snapshot }
    const matches = [{ id: crypto.randomUUID(), game, result, playedAt: replay.playedAt, replayId: replay.id }, ...current.matches].slice(0, 50)
    const achievement = result === 'win' && !current.achievements.includes('勝利者') ? [...current.achievements, '勝利者'] : current.achievements
    return { ...current, xp: current.xp + (result === 'win' ? 40 : 10), matches, replays: [replay, ...(current.replays ?? [])].slice(0, 50), achievements: achievement }
    })
  }, [])
  const toggleFavourite = useCallback((game: string) => setData(current => ({ ...current, favourites: current.favourites.includes(game) ? current.favourites.filter(item => item !== game) : [...current.favourites, game] })), [])
  return { data, updateProfile, recordMatch, toggleFavourite }
}
