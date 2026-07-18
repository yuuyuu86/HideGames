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

type Event =
  | { type: 'chat'; message: RoomMessage }
  | { type: 'ready'; id: string; ready: boolean }
  | { type: 'game'; game: string }
  | { type: 'pause'; paused: boolean }
  | { type: 'away'; id: string; away: boolean }
  | { type: 'resume-ready'; id: string; ready: boolean }
  | { type: 'game-state'; game: string; state: unknown }

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
  const [roomError, setRoomError] = useState('')
  const [authRevision, setAuthRevision] = useState(0)
  const channel = useRef<BroadcastChannel | null>(null)
  const socket = useRef<Socket | null>(null)
  const signalHandlers = useRef(new Set<(signal: { from: string; target?: string; data: RTCSessionDescriptionInit | RTCIceCandidateInit }) => void>())
  const localMember = useMemo(() => {
    const existing = sessionStorage.getItem('hidegames.member-id')
    const id = existing ?? `player-${crypto.randomUUID()}`
    if (!existing) sessionStorage.setItem('hidegames.member-id', id)
    return { ...memberPalette[0], id }
  }, [])

  const apply = useCallback((event: Event) => {
    if (event.type === 'chat') setMessages(current => current.some(message => message.id === event.message.id) ? current : [...current, event.message])
    if (event.type === 'ready') setMembers(current => current.map(member => member.id === event.id ? { ...member, ready: event.ready } : member))
    if (event.type === 'game') setSelectedGame(event.game)
    if (event.type === 'pause') setPausedState(event.paused)
    if (event.type === 'away') setMembers(current => current.map(member => member.id === event.id ? { ...member, away: event.away } : member))
    if (event.type === 'resume-ready') setResume(current => ({ ...current, readyIds: event.ready ? [...new Set([...current.readyIds, event.id])] : current.readyIds.filter(id => id !== event.id) }))
    if (event.type === 'game-state') setGameState(current => ({ ...current, [event.game]: event.state }))
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
    const client = io(url, { autoConnect: true, reconnectionAttempts: 3, timeout: 2000, auth: { token: localStorage.getItem('hidegames.auth-token') ?? undefined } })
    socket.current = client
    client.on('connect', () => { setConnected(true); client.emit('room:join', { code: roomCode, member: localMember, password: roomPassword }) })
    client.on('disconnect', () => setConnected(false))
    client.on('connect_error', () => setConnected(false))
    client.on('room:state', (next) => {
      if (Array.isArray(next.members)) setMembers(next.members)
      if (Array.isArray(next.messages)) setMessages(next.messages)
      if (typeof next.game === 'string') setSelectedGame(next.game)
      if (typeof next.paused === 'boolean') setPausedState(next.paused)
      if (next.gameState && typeof next.gameState === 'object') setGameState(next.gameState)
      if (Array.isArray(next.awayHistory)) setAwayHistory(next.awayHistory)
      if (next.resume && typeof next.resume === 'object') setResume(next.resume)
      if (typeof next.access?.locked === 'boolean') setRoomLocked(next.access.locked)
    })
    client.on('room:error', ({ message }) => {
      const nextMessage = typeof message === 'string' ? message : 'ルームに参加できませんでした'
      setRoomError(nextMessage)
      window.dispatchEvent(new CustomEvent('hidegames-room-error', { detail: nextMessage }))
    })
    client.on('room:private', ({ game, state }) => { if (typeof game === 'string') setPrivateState(current => ({ ...current, [game]: state })) })
    client.on('room:signal', (signal) => { if (signal?.from && signal?.data) signalHandlers.current.forEach(handler => handler(signal)) })
    return () => { client.close() }
  }, [authRevision, localMember, roomCode, roomPassword])

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
    localMember,
    roomCode,
    joinRoom: (rawCode: string, password = '') => {
      const normalized = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (!/^[A-Z0-9]{6}$/.test(normalized)) return false
      sessionStorage.setItem('hidegames.room-password', password)
      setRoomPassword(password)
      setRoomError('')
      localStorage.setItem('hidegames.room-code', normalized)
      setRoomCode(normalized)
      return true
    },
    createRoom: () => {
      const code = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')
      localStorage.setItem('hidegames.room-code', code)
      setRoomCode(code)
      return code
    },
    sendChat,
    toggleReady: () => publish({ type: 'ready', id: localMember.id, ready: !members.find(member => member.id === localMember.id)?.ready }),
    selectGame: (nextGame: string) => publish({ type: 'game', game: nextGame }),
    setPaused: (nextPaused: boolean) => publish({ type: 'pause', paused: nextPaused }),
    setAway: (away: boolean) => publish({ type: 'away', id: localMember.id, away }),
    setResumeReady: (ready: boolean) => publish({ type: 'resume-ready', id: localMember.id, ready }),
    setGameState: (game: string, state: unknown) => publish({ type: 'game-state', game, state }),
    setRoomPassword: (password: string) => socket.current?.connected && socket.current.emit('room:set-password', { password }),
    reportMember: (targetId: string, reason: string) => socket.current?.connected && socket.current.emit('room:report', { targetId, reason }),
    removeMember: (targetId: string) => socket.current?.connected && socket.current.emit('room:kick', { targetId }),
    sendSignal: (target: string, data: RTCSessionDescriptionInit | RTCIceCandidateInit) => socket.current?.connected && socket.current.emit('room:signal', { target, data }),
    onSignal: (handler: (signal: { from: string; target?: string; data: RTCSessionDescriptionInit | RTCIceCandidateInit }) => void) => { signalHandlers.current.add(handler); return () => signalHandlers.current.delete(handler) },
    moveTag: (position: { x: number; y: number }) => {
      if (socket.current?.connected) socket.current.emit('room:event', { type: 'tag-move', position })
      else publish({ type: 'game-state', game: 'tag', state: { positions: { [localMember.id]: position }, collected: [] } })
    },
    rematchTag: () => {
      if (socket.current?.connected) socket.current.emit('room:event', { type: 'tag-rematch' })
      else publish({ type: 'game-state', game: 'tag', state: { positions: {}, collected: [] } })
    },
  }
}
