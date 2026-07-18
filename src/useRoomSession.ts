import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

export type RoomMember = {
  id: string
  name: string
  color: 'mint' | 'purple' | 'blue' | 'orange'
  ready: boolean
  host?: boolean
  away?: boolean
  connected?: boolean
}

export type RoomMessage = {
  id: string
  name: string
  text: string
  time: string
  tone: string
}

export type AwayHistoryItem = { id: string; name: string; away: boolean; at: number }
export type ResumeState = { readyIds: string[]; startsAt?: number }
export type VoiceEvent = { id: string; joined: boolean }
export type GameStartEvent = { game: string; by: string; byId: string; at: number }
export type RoomInvitation = { id: string; code: string; game: string; from: string; at: number; token: string }

type Event =
  | { type: 'chat'; message: RoomMessage }
  | { type: 'ready'; id: string; ready: boolean }
  | { type: 'game'; game: string }
  | { type: 'pause'; paused: boolean }
  | { type: 'away'; id: string; away: boolean }
  | { type: 'resume-ready'; id: string; ready: boolean }
  | { type: 'resume-cancel' }
  | { type: 'game-state'; game: string; state: unknown }
  | { type: 'tag-mode'; mode: 'gems' | 'escape' | 'classic' | 'infection' | 'transform' | 'team' }

const memberPalette: RoomMember[] = [
  { id: 'yuta', name: 'yuta', color: 'mint', ready: true, host: true },
  { id: 'hana', name: 'hana', color: 'purple', ready: true },
  { id: 'sora', name: 'sora', color: 'blue', ready: true },
  { id: 'ken', name: 'ken', color: 'orange', ready: true },
]

const initialMessages: RoomMessage[] = [
  { id: 'seed-1', name: 'hana', text: '次、鬼ごっこやろう！', time: '20:15', tone: 'purple' },
  { id: 'seed-2', name: 'sora', text: 'いいね、宝石回収で！', time: '20:16', tone: 'blue' },
]

export function useRoomSession() {
  const [roomCode, setRoomCode] = useState(() => localStorage.getItem('hidegames.room-code') ?? 'A7K9P2')
  const [members, setMembers] = useState(memberPalette)
  const [spectators, setSpectators] = useState<RoomMember[]>([])
  const [messages, setMessages] = useState(initialMessages)
  const [game, setSelectedGame] = useState('tag')
  const [paused, setPausedState] = useState(false)
  const [gameState, setGameState] = useState<Record<string, unknown>>({})
  const [privateState, setPrivateState] = useState<Record<string, unknown>>({})
  const [awayHistory, setAwayHistory] = useState<AwayHistoryItem[]>([])
  const [resume, setResume] = useState<ResumeState>({ readyIds: [] })
  const [roomLocked, setRoomLocked] = useState(false)
  const [connected, setConnected] = useState(false)
  const [roomPassword, setRoomPassword] = useState(() => sessionStorage.getItem('hidegames.room-password') ?? '')
  const [roomInviteToken, setRoomInviteToken] = useState(() => sessionStorage.getItem('hidegames.room-invite-token') ?? '')
  const [roomError, setRoomError] = useState('')
  const [lastGameStart, setLastGameStart] = useState<GameStartEvent | null>(null)
  const [invitations, setInvitations] = useState<RoomInvitation[]>([])
  const [authRevision, setAuthRevision] = useState(0)
  const channel = useRef<BroadcastChannel | null>(null)
  const socket = useRef<Socket | null>(null)
  const joinDetails = useRef({ roomCode, roomPassword, roomInviteToken })
  const signalHandlers = useRef(new Set<(signal: { from: string; target?: string; data: RTCSessionDescriptionInit | RTCIceCandidateInit }) => void>())
  const voiceHandlers = useRef(new Set<(event: VoiceEvent) => void>())
  const localMember = useMemo(() => {
    const existing = sessionStorage.getItem('hidegames.member-id')
    const id = existing ?? `player-${crypto.randomUUID()}`
    if (!existing) sessionStorage.setItem('hidegames.member-id', id)
    return { ...memberPalette[0], id }
  }, [])
  joinDetails.current = { roomCode, roomPassword, roomInviteToken }

  const apply = useCallback((event: Event) => {
    if (event.type === 'chat') setMessages(current => current.some(message => message.id === event.message.id) ? current : [...current, event.message])
    if (event.type === 'ready') setMembers(current => current.map(member => member.id === event.id ? { ...member, ready: event.ready } : member))
    if (event.type === 'game') setSelectedGame(event.game)
    if (event.type === 'pause') setPausedState(event.paused)
    if (event.type === 'away') setMembers(current => current.map(member => member.id === event.id ? { ...member, away: event.away } : member))
    if (event.type === 'resume-ready') setResume(current => ({ ...current, readyIds: event.ready ? [...new Set([...current.readyIds, event.id])] : current.readyIds.filter(id => id !== event.id) }))
    if (event.type === 'game-state') setGameState(current => ({ ...current, [event.game]: event.state }))
    if (event.type === 'tag-mode') setGameState(current => ({ ...current, tag: { ...(current.tag as Record<string, unknown> | undefined), mode: event.mode, collected: [], keys: [], caught: [], infected: [], remainingMoves: 120, winner: null } }))
  }, [])

  useEffect(() => {
    if (!('BroadcastChannel' in window)) return
    channel.current = new BroadcastChannel(`hidegames-room-${roomCode.toLowerCase()}`)
    channel.current.onmessage = ({ data }: MessageEvent<Event>) => apply(data)
    return () => channel.current?.close()
  }, [apply, roomCode])

  useEffect(() => {
    const localHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    const url = import.meta.env.VITE_SOCKET_URL || (localHost ? `http://${window.location.hostname}:3001` : window.location.origin)
    const client = io(url, { autoConnect: true, reconnectionAttempts: Infinity, reconnectionDelay: 1000, reconnectionDelayMax: 10_000, timeout: 5000, auth: { token: localStorage.getItem('hidegames.auth-token') ?? undefined } })
    socket.current = client
    client.on('connect', () => { const details = joinDetails.current; setConnected(true); client.emit('room:join', { code: details.roomCode, member: localMember, password: details.roomPassword, inviteToken: details.roomInviteToken || undefined, spectator: sessionStorage.getItem('hidegames.spectator') === 'true' }) })
    client.on('disconnect', () => setConnected(false))
    client.on('connect_error', () => setConnected(false))
    client.on('room:state', (next) => {
      if (Array.isArray(next.members)) setMembers(next.members)
      if (Array.isArray(next.spectators)) setSpectators(next.spectators)
      if (Array.isArray(next.messages)) setMessages(next.messages)
      if (typeof next.game === 'string') setSelectedGame(next.game)
      if (typeof next.paused === 'boolean') setPausedState(next.paused)
      if (next.gameState && typeof next.gameState === 'object') setGameState(next.gameState)
      if (Array.isArray(next.awayHistory)) setAwayHistory(next.awayHistory)
      if (next.resume && typeof next.resume === 'object') setResume(next.resume)
      if (typeof next.access?.locked === 'boolean') setRoomLocked(next.access.locked)
      if (typeof next.code === 'string' && next.code === joinDetails.current.roomCode && Array.isArray(next.members) && next.members.some((member: { id?: unknown }) => member?.id === localMember.id)) { sessionStorage.removeItem('hidegames.room-invite-token'); setRoomInviteToken('') }
      if (typeof next.code === 'string' && next.code === joinDetails.current.roomCode && Array.isArray(next.members) && next.members.some((member: { id?: unknown }) => member?.id === localMember.id)) setInvitations(current => current.filter(invitation => invitation.code !== next.code))
    })
    client.on('room:error', ({ message }) => {
      const nextMessage = typeof message === 'string' ? message : 'ルームに参加できませんでした'
      setRoomError(nextMessage)
      window.dispatchEvent(new CustomEvent('hidegames-room-error', { detail: nextMessage }))
    })
    client.on('room:private', ({ game, state }) => { if (typeof game === 'string') setPrivateState(current => ({ ...current, [game]: state })) })
    client.on('room:signal', (signal) => { if (signal?.from && signal?.data) signalHandlers.current.forEach(handler => handler(signal)) })
    client.on('room:voice', (event) => { if (typeof event?.id === 'string' && typeof event.joined === 'boolean') voiceHandlers.current.forEach(handler => handler(event)) })
    client.on('room:game-start', (event) => { if (typeof event?.game === 'string' && typeof event?.by === 'string' && typeof event?.byId === 'string' && typeof event?.at === 'number') setLastGameStart(event) })
    client.on('room:invite', (event) => { if (typeof event?.id === 'string' && typeof event?.code === 'string' && typeof event?.game === 'string' && typeof event?.from === 'string' && typeof event?.at === 'number' && typeof event?.token === 'string') setInvitations(current => [event, ...current.filter(item => item.id !== event.id)].slice(0, 8)) })
    return () => { client.close() }
  }, [authRevision, localMember])

  useEffect(() => {
    if (!socket.current?.connected) return
    socket.current.emit('room:join', { code: roomCode, member: localMember, password: roomPassword, inviteToken: roomInviteToken || undefined, spectator: sessionStorage.getItem('hidegames.spectator') === 'true' })
  }, [localMember, roomCode, roomPassword, roomInviteToken])

  useEffect(() => { const refresh = () => setAuthRevision(value => value + 1); window.addEventListener('hidegames-auth', refresh); return () => window.removeEventListener('hidegames-auth', refresh) }, [])

  const publish = useCallback((event: Event) => {
    apply(event)
    if (socket.current?.connected) socket.current.emit('room:event', event)
    else channel.current?.postMessage(event)
  }, [apply])

  const sendChat = useCallback((text: string) => {
    publish({ type: 'chat', message: { id: `${Date.now()}-${Math.random()}`, name: localMember.name, text, time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }), tone: localMember.color } })
  }, [localMember, publish])

  return {
    members,
    spectators,
    messages,
    game,
    paused,
    gameState,
    privateState,
    awayHistory,
    resume,
    roomLocked,
    connected,
    roomError,
    lastGameStart,
    invitations,
    localMember,
    roomCode,
    joinRoom: (rawCode: string, password = '', spectator = false, inviteToken = '') => {
      const normalized = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (!/^[A-Z0-9]{6}$/.test(normalized)) return false
      sessionStorage.setItem('hidegames.room-password', password)
      sessionStorage.setItem('hidegames.spectator', String(spectator))
      if (inviteToken) sessionStorage.setItem('hidegames.room-invite-token', inviteToken); else sessionStorage.removeItem('hidegames.room-invite-token')
      setRoomPassword(password)
      setRoomInviteToken(inviteToken)
      setRoomError('')
      localStorage.setItem('hidegames.room-code', normalized)
      setRoomCode(normalized)
      return true
    },
    createRoom: () => {
      const code = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')
      sessionStorage.setItem('hidegames.spectator', 'false')
      sessionStorage.removeItem('hidegames.room-password')
      sessionStorage.removeItem('hidegames.room-invite-token')
      setRoomPassword('')
      setRoomInviteToken('')
      setRoomError('')
      localStorage.setItem('hidegames.room-code', code)
      setRoomCode(code)
      return code
    },
    sendChat,
    toggleReady: () => publish({ type: 'ready', id: localMember.id, ready: !members.find(member => member.id === localMember.id)?.ready }),
    selectGame: (nextGame: string) => publish({ type: 'game', game: nextGame }),
    startGame: () => socket.current?.connected && socket.current.emit('room:event', { type: 'game-start' }),
    inviteFriend: (targetId: string) => new Promise<{ ok: boolean; message?: string }>(resolve => {
      if (!socket.current?.connected) return resolve({ ok: false, message: '接続を確認しています。少し待ってから再試行してください' })
      socket.current.emit('room:invite', { targetId }, (result: { ok?: boolean; message?: string }) => resolve({ ok: Boolean(result?.ok), message: result?.message }))
    }),
    dismissInvitation: (id: string) => setInvitations(current => current.filter(invitation => invitation.id !== id)),
    setPaused: (nextPaused: boolean) => publish({ type: 'pause', paused: nextPaused }),
    setAway: (away: boolean) => publish({ type: 'away', id: localMember.id, away }),
    setResumeReady: (ready: boolean) => publish({ type: 'resume-ready', id: localMember.id, ready }),
    cancelResume: () => publish({ type: 'resume-cancel' }),
    setGameState: (game: string, state: unknown) => publish({ type: 'game-state', game, state }),
    setRoomPassword: (password: string) => socket.current?.connected && socket.current.emit('room:set-password', { password }),
    reportMember: (targetId: string, reason: string) => socket.current?.connected && socket.current.emit('room:report', { targetId, reason }),
    removeMember: (targetId: string) => socket.current?.connected && socket.current.emit('room:kick', { targetId }),
    leaveRoom: () => new Promise<{ ok: boolean; message?: string }>(resolve => {
      if (!socket.current?.connected) return resolve({ ok: false, message: '接続を確認しています。少し待ってから再試行してください' })
      socket.current.emit('room:leave', (result: { ok?: boolean; message?: string }) => {
        if (result?.ok) {
          sessionStorage.removeItem('hidegames.spectator')
          sessionStorage.removeItem('hidegames.room-password')
          sessionStorage.removeItem('hidegames.room-invite-token')
          localStorage.removeItem('hidegames.room-code')
          setMembers([localMember])
          setSpectators([])
          setMessages([])
          setRoomCode('LOCAL01')
        }
        resolve({ ok: Boolean(result?.ok), message: result?.message })
      })
    }),
    sendSignal: (target: string, data: RTCSessionDescriptionInit | RTCIceCandidateInit) => socket.current?.connected && socket.current.emit('room:signal', { target, data }),
    onSignal: (handler: (signal: { from: string; target?: string; data: RTCSessionDescriptionInit | RTCIceCandidateInit }) => void) => { signalHandlers.current.add(handler); return () => signalHandlers.current.delete(handler) },
    announceVoice: (joined: boolean) => socket.current?.connected && socket.current.emit('room:voice', { joined }),
    onVoice: (handler: (event: VoiceEvent) => void) => { voiceHandlers.current.add(handler); return () => voiceHandlers.current.delete(handler) },
    promoteSpectator: () => new Promise<{ ok: boolean; message?: string }>(resolve => {
      if (!socket.current?.connected) return resolve({ ok: false, message: '接続を確認しています。少し待ってから再試行してください' })
      socket.current.emit('room:join-player', (result: { ok?: boolean; message?: string }) => {
        if (result?.ok) sessionStorage.setItem('hidegames.spectator', 'false')
        resolve({ ok: Boolean(result?.ok), message: result?.message })
      })
    }),
    moveTag: (position: { x: number; y: number }) => {
      if (socket.current?.connected) socket.current.emit('room:event', { type: 'tag-move', position })
      else publish({ type: 'game-state', game: 'tag', state: { positions: { [localMember.id]: position }, collected: [] } })
    },
    rematchTag: () => {
      if (socket.current?.connected) socket.current.emit('room:event', { type: 'tag-rematch' })
      else publish({ type: 'game-state', game: 'tag', state: { positions: {}, collected: [] } })
    },
    setTagMode: (mode: 'gems' | 'escape' | 'classic' | 'infection' | 'transform' | 'team') => {
      if (socket.current?.connected) socket.current.emit('room:event', { type: 'tag-mode', mode })
      else publish({ type: 'tag-mode', mode })
    },
  }
}
