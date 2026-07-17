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

export function usePlayerData() {
  const [data, setData] = useState<PlayerData>(() => {
    try { return { ...initial, ...JSON.parse(localStorage.getItem('hidegames.player-data') ?? '{}') } } catch { return initial }
  })
  useEffect(() => localStorage.setItem('hidegames.player-data', JSON.stringify(data)), [data])
  const updateProfile = useCallback((displayName: string) => setData(current => ({ ...current, displayName: displayName.trim() || current.displayName })), [])
  const recordMatch = useCallback((game: string, result: MatchRecord['result'], snapshot?: unknown) => setData(current => {
    const replay = { id: crypto.randomUUID(), game, result, playedAt: new Date().toISOString(), summary: result === 'win' ? '勝利した試合の記録' : result === 'loss' ? '敗北した試合の記録' : '引き分けた試合の記録', snapshot }
    const matches = [{ id: crypto.randomUUID(), game, result, playedAt: replay.playedAt, replayId: replay.id }, ...current.matches].slice(0, 50)
    const achievement = result === 'win' && !current.achievements.includes('勝利者') ? [...current.achievements, '勝利者'] : current.achievements
    return { ...current, xp: current.xp + (result === 'win' ? 40 : 10), matches, replays: [replay, ...(current.replays ?? [])].slice(0, 50), achievements: achievement }
  }), [])
  const toggleFavourite = useCallback((game: string) => setData(current => ({ ...current, favourites: current.favourites.includes(game) ? current.favourites.filter(item => item !== game) : [...current.favourites, game] })), [])
  return { data, updateProfile, recordMatch, toggleFavourite }
}
