import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FaRegBell as Bell, FaCircleCheck as CheckCircle2, FaChevronDown as ChevronDown, FaChevronLeft as ChevronLeft,
  FaRegCircle as Circle, FaCircleQuestion as CircleHelp, FaCopy as Copy, FaCrown as Crown, FaGamepad as Gamepad2,
  FaHouse as Home, FaRegCommentDots as MessageCircle, FaDisplay as MonitorDown, FaPause as Pause, FaPlay as Play,
  FaPlus as Plus, FaTowerBroadcast as Radio, FaMagnifyingGlass as Search, FaLink as LinkIcon, FaMicrophone as Mic,
  FaMicrophoneSlash as MicOff, FaGear as Settings, FaShield as Shield, FaWandMagicSparkles as Sparkles, FaUsers as Users,
  FaVideo as Video, FaXmark as X, FaChessBoard, FaDoorOpen, FaGem, FaKey, FaMoon, FaPaperPlane, FaPersonRunning,
  FaRegStar, FaUserSecret,
} from 'react-icons/fa6'
import { useRoomSession, type RoomMember } from './useRoomSession'
import { usePlayerData, type PlayerData } from './usePlayerData'
import { evaluateMahjongWin, type MahjongWinInfo } from './mahjong'
import QRCode from 'qrcode'
import './ranking.css'
import './presence.css'

type Page = 'home' | 'games' | 'room' | 'youtube' | 'friends' | 'profile' | 'settings' | 'play'
type GameKey = string
type ChatMessage = { name: string; text: string; time: string; tone: string }
type DrawPoint = { x: number; y: number }
type DrawLine = { points: DrawPoint[]; color: string }

const games = [
  { key: 'tag', title: 'オンライン鬼ごっこ', players: '2–8人', time: '3–5分', kind: 'アクション', Icon: FaPersonRunning, ready: true, description: '逃げる、追いかける、隠れる。短時間で盛り上がる2D鬼ごっこ。' },
  { key: 'othello', title: 'オセロ', players: '2人', time: '5–15分', kind: 'ボード', Icon: Circle, ready: true, description: '石を挟んで自分の色に変える、定番の頭脳戦。' },
  { key: 'gomoku', title: '五目並べ', players: '2人', time: '3–10分', kind: 'ボード', Icon: FaRegStar, ready: true, description: '先に5つ並べた方の勝ち。シンプルで奥深い。' },
  { key: 'connect4', title: '四目並べ', players: '2人', time: '3–10分', kind: 'ボード', Icon: FaChessBoard, ready: true, description: '縦・横・斜めに4つ並べる、短時間の戦略ゲーム。' },
  { key: 'shiritori', title: 'しりとり', players: '2–8人', time: '5–15分', kind: 'パーティー', Icon: FaRegStar, ready: true, description: '言葉をつなげる、みんなで遊べる定番パーティーゲーム。' },
  { key: 'escape', title: '片方だけ見える脱出室', players: '2人', time: '15–25分', kind: '協力・推理', Icon: FaDoorOpen, ready: true, description: '異なる情報を伝え合い、ふたりで脱出を目指す。' },
  { key: 'future', title: '1人だけ未来を知っている', players: '2–5人', time: '10–20分', kind: '協力・推理', Icon: FaChessBoard, ready: true, description: '未来の情報をもとに、みんなで災害を防ぐ。' },
  { key: 'werewolf', title: '人狼', players: '4–12人', time: '15–30分', kind: 'パーティー', Icon: FaMoon, ready: true, description: '正体を隠して議論と投票を行う会話ゲーム。' },
  { key: 'shogi', title: '将棋', players: '2人', time: '10–30分', kind: 'ボード', Icon: FaChessBoard, ready: true, description: '共有盤面で駒の手を記録して対局する。' },
  { key: 'chess', title: 'チェス', players: '2人', time: '10–30分', kind: 'ボード', Icon: FaChessBoard, ready: true, description: '戦略を考えながら一手ずつ進める。' },
  { key: 'go', title: '囲碁', players: '2人', time: '15–40分', kind: 'ボード', Icon: Circle, ready: true, description: '陣地を囲う伝統的なボードゲーム。' },
  { key: 'daifugo', title: '大富豪', players: '2–6人', time: '10–20分', kind: 'カード', Icon: FaRegStar, ready: true, description: '手札を早く出し切るカードゲーム。' },
  { key: 'uno', title: 'UNO風カードゲーム', players: '2–8人', time: '10–20分', kind: 'カード', Icon: FaRegStar, ready: true, description: '色と数字を合わせてカードを出そう。' },
  { key: 'oldmaid', title: 'ババ抜き', players: '2–6人', time: '5–15分', kind: 'カード', Icon: FaRegStar, ready: true, description: 'ジョーカーを最後まで持たないようにする。' },
  { key: 'memory', title: '神経衰弱', players: '2–4人', time: '5–15分', kind: 'カード', Icon: FaRegStar, ready: true, description: '同じ数字のカードを揃える。' },
  { key: 'sevens', title: '7並べ', players: '2–6人', time: '10–20分', kind: 'カード', Icon: FaRegStar, ready: true, description: '数字を順番につなげて出す。' },
  { key: 'mahjong', title: '麻雀', players: '2–4人', time: '20–45分', kind: 'ボード', Icon: FaChessBoard, ready: true, description: '牌と役を組み合わせる対局ゲーム。' },
  { key: 'sugoroku', title: 'すごろく', players: '2–6人', time: '10–20分', kind: 'パーティー', Icon: FaPersonRunning, ready: true, description: 'サイコロを振ってゴールを目指す。' },
  { key: 'mines', title: '協力マインスイーパー', players: '1–4人', time: '10–20分', kind: '協力・推理', Icon: FaGem, ready: true, description: '地雷の位置を共同で推理する。' },
  { key: 'tetris', title: 'テトリス風対戦', players: '2人', time: '5–15分', kind: 'アクション', Icon: FaChessBoard, ready: true, description: 'ライン消去で相手へ妨害を送る。' },
  { key: 'puzzle', title: '落ちものパズル', players: '1–4人', time: '5–15分', kind: 'アクション', Icon: FaGem, ready: true, description: '同じ色をつなげて消すパズル。' },
  { key: 'wordwolf', title: 'ワードウルフ', players: '3–10人', time: '10–15分', kind: 'パーティー', Icon: FaMoon, ready: true, description: '少数派のお題を見抜く会話ゲーム。' },
  { key: 'quiz', title: 'クイズ早押し', players: '2–10人', time: '5–20分', kind: 'パーティー', Icon: FaRegStar, ready: true, description: '早押しと正答数で勝負する。' },
  { key: 'drawrelay', title: 'お絵描き伝言', players: '3–10人', time: '10–20分', kind: 'パーティー', Icon: FaGem, ready: true, description: '絵でお題を伝えていく。' },
  { key: 'association', title: '連想ゲーム', players: '2–10人', time: '5–15分', kind: 'パーティー', Icon: FaRegStar, ready: true, description: '言葉のつながりを楽しむ。' },
  { key: 'delivery', title: '地図なし配達', players: '2–4人', time: '10–20分', kind: '協力・推理', Icon: FaPersonRunning, ready: true, description: '道と地図を分担して連携する。' },
  { key: 'newsroom', title: '偽ニュース編集部', players: '3–6人', time: '15–25分', kind: '協力・推理', Icon: FaDoorOpen, ready: true, description: '情報の真偽を判断して記事を完成。' },
  { key: 'alien', title: '宇宙人の通訳', players: '2–5人', time: '15–25分', kind: '協力・推理', Icon: FaDoorOpen, ready: true, description: '未知の言語を解読して交渉する。' },
  { key: 'museum', title: '逃げる美術館', players: '2–5人', time: '15–25分', kind: '協力・推理', Icon: FaDoorOpen, ready: true, description: '監視映像の異常を止める。' },
  { key: 'thief', title: '怪盗のアリバイ工作', players: '2–5人', time: '15–25分', kind: '協力・推理', Icon: FaUserSecret, ready: true, description: '証言と行動の矛盾をなくす。' },
  { key: 'orchestra', title: '声なしオーケストラ', players: '2–6人', time: '10–20分', kind: '協力・推理', Icon: FaRegStar, ready: true, description: '合図だけで演奏パートを同期する。' },
  { key: 'guard', title: '泥棒と警備AI', players: '2–6人', time: '10–20分', kind: 'アクション', Icon: FaUserSecret, ready: true, description: '侵入側と警備側に分かれる非対称対戦。' },
  { key: 'sports', title: 'ルールを発明するスポーツ', players: '2–8人', time: '10–20分', kind: 'アクション', Icon: FaPersonRunning, ready: true, description: '得点方法と特殊能力を決めて戦う。' },
  { key: 'movie', title: '映画監督バトル', players: '3–8人', time: '10–20分', kind: 'パーティー', Icon: FaRegStar, ready: true, description: '演出カードで場面を作り、投票する。' },
  { key: 'meeting', title: '同時にしゃべれない会議', players: '3–8人', time: '10–20分', kind: 'パーティー', Icon: FaMoon, ready: true, description: '発言制限下で事件を解く。' },
  { key: 'election', title: '架空の国を作る選挙ゲーム', players: '3–8人', time: '15–25分', kind: 'パーティー', Icon: FaRegStar, ready: true, description: '法案と交渉で国の歴史を作る。' },
  { key: 'story', title: '最後の一文を守る物語ゲーム', players: '3–8人', time: '10–20分', kind: 'パーティー', Icon: FaDoorOpen, ready: true, description: '共同で物語を作り、秘密の結末を狙う。' },
  { key: 'letter', title: '手紙だけの冒険', players: '2–6人', time: '15–25分', kind: '協力・推理', Icon: FaDoorOpen, ready: true, description: '短い手紙だけで冒険を進める。' },
  { key: 'ghost', title: '幽霊の引っ越し', players: '2–4人', time: '10–20分', kind: '協力・推理', Icon: FaDoorOpen, ready: true, description: '幽霊の感情を読み安全に新居へ移す。' },
  { key: 'soundmaze', title: '音だけ迷路', players: '2–4人', time: '10–20分', kind: '協力・推理', Icon: FaRegStar, ready: true, description: '音だけを頼りに位置を推理する。' },
  { key: 'detective', title: '時間を編集する刑事', players: '1–4人', time: '15–25分', kind: '協力・推理', Icon: FaDoorOpen, ready: true, description: '映像を時間操作して因果を解く。' },
  { key: 'court', title: '夢の中の法廷', players: '3–8人', time: '15–25分', kind: '協力・推理', Icon: FaMoon, ready: true, description: '感情や記憶を証拠にした弁論ゲーム。' },
  { key: 'bug', title: 'バグを仕様にするゲーム', players: '1–4人', time: '10–20分', kind: '協力・推理', Icon: FaGem, ready: true, description: '壊れた世界のルールを利用して進む。' },
]

const people = [
  { name: 'yuta', state: '準備OK', color: 'mint', host: true },
  { name: 'hana', state: '準備OK', color: 'purple' },
  { name: 'sora', state: '準備OK', color: 'blue' },
  { name: 'ken', state: '準備中', color: 'orange' },
]

const initialMessages: ChatMessage[] = [
  { name: 'hana', text: '次、鬼ごっこやろう！', time: '20:15', tone: 'purple' },
  { name: 'sora', text: 'いいね、宝石回収で！', time: '20:16', tone: 'blue' },
  { name: 'ken', text: '了解！', time: '20:16', tone: 'orange' },
]

function initials(name: string) { return name.slice(0, 1).toUpperCase() }

function Sidebar({ page, setPage, unread, player }: { page: Page; setPage: (p: Page) => void; unread: number; player: PlayerData }) {
  const items: { key: Page; label: string; icon: typeof Home }[] = [
    { key: 'home', label: 'ホーム', icon: Home }, { key: 'games', label: 'ゲーム', icon: Gamepad2 },
    { key: 'room', label: 'ルーム', icon: Users }, { key: 'youtube', label: 'YouTube', icon: Video },
    { key: 'friends', label: 'フレンド', icon: Users }, { key: 'profile', label: 'プロフィール', icon: Shield }, { key: 'settings', label: '設定', icon: Settings },
  ]
  return <aside className="sidebar">
    <button className="brand" onClick={() => setPage('home')}><span className="brand-mark"><Gamepad2 size={16} /></span><span>HideGames</span></button>
    <nav>{items.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => setPage(key)} className={`nav-item ${page === key ? 'active' : ''}`}>
      <Icon size={18} /><span>{label}</span>{key === 'room' && unread > 0 && <b className="nav-badge">{unread}</b>}
    </button>)}</nav>
    <div className="sidebar-foot">
      <div className="online-pill"><i />オンライン <ChevronDown size={14} /></div>
      <button className="profile-chip" onClick={() => setPage('profile')}><span className="avatar mint">{initials(player.displayName)}</span><span><b>{player.displayName}</b><small>レベル {player.level}</small></span></button>
    </div>
  </aside>
}

function ChatDock({ messages, addMessage, paused }: { messages: ChatMessage[]; addMessage: (text: string) => void; paused: boolean }) {
  const [open, setOpen] = useState(true)
  const [text, setText] = useState('')
  const notifiedCount = useRef(messages.length)
  const seenMessages = useRef(messages.length)
  const [unread, setUnread] = useState(0)
  const [visible, setVisible] = useState(() => { try { return JSON.parse(localStorage.getItem('hidegames.preferences') ?? '{}').chat !== false } catch { return true } })
  useEffect(() => { const refresh = () => { try { setVisible(JSON.parse(localStorage.getItem('hidegames.preferences') ?? '{}').chat !== false) } catch { setVisible(true) } }; window.addEventListener('hidegames-preferences', refresh); return () => window.removeEventListener('hidegames-preferences', refresh) }, [])
  useEffect(() => { const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false) } }; window.addEventListener('keydown', closeOnEscape); return () => window.removeEventListener('keydown', closeOnEscape) }, [open])
  useEffect(() => {
    const added = Math.max(0, messages.length - seenMessages.current)
    seenMessages.current = messages.length
    if (open) { setUnread(0); return }
    if (added) setUnread(current => current + added)
  }, [messages.length, open])
  useEffect(() => {
    const previous = notifiedCount.current
    notifiedCount.current = messages.length
    if (messages.length <= previous || !document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return
    try {
      const prefs = JSON.parse(localStorage.getItem('hidegames.preferences') ?? '{}') as { notifications?: boolean; chatNotifications?: boolean }
      const latest = messages.at(-1)
      if (prefs.notifications !== false && prefs.chatNotifications !== false && latest) new Notification(`HideGames - ${latest.name}`, { body: latest.text })
    } catch { /* Notification failure must not affect chat. */ }
  }, [messages])
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (text.trim()) { addMessage(text.trim()); setText('') } }
  if (!visible) return null
  return <section className={`chat-dock ${open ? 'expanded' : ''}`} aria-label="ゲームチャット">
    <button className="chat-title" onClick={() => setOpen(value => !value)} aria-expanded={open}><MessageCircle size={17} /><span>チャット</span>{!open && unread > 0 && <b className="unread-dot" aria-label={`${unread}件の未読メッセージ`}>{unread > 99 ? '99+' : unread}</b>}<ChevronDown size={16} /></button>
    {open && <>
      <div className="chat-list">{messages.slice(-5).map((m, i) => <div className="chat-line" key={`${m.time}-${i}`}><span className={`tiny-avatar ${m.tone}`}>{initials(m.name)}</span><p><b>{m.name}</b><small>{m.time}</small><span>{m.text}</span></p></div>)}</div>
      <div className="chat-stamps" aria-label="定型メッセージ"><button type="button" onClick={()=>addMessage('よろしくお願いします')}>よろしく</button><button type="button" onClick={()=>addMessage('ナイスプレイ')}>ナイス</button><button type="button" onClick={()=>addMessage('少し待ってください')}>待って</button><button type="button" onClick={()=>addMessage('おつかれさまでした')}>おつかれ</button></div><form className="chat-form" onSubmit={submit}><input aria-label="チャットメッセージ" value={text} onChange={e => setText(e.target.value)} placeholder={paused ? '待機中のメッセージ…' : 'メッセージを入力…'} /><button aria-label="送信"><FaPaperPlane /></button></form>
    </>}
  </section>
}
function useRoomStatusNotifications(events: { name: string; away: boolean }[]) {
  const notifiedCount=useRef(events.length)
  useEffect(()=>{const previous=notifiedCount.current;notifiedCount.current=events.length;if(events.length<=previous||!document.hidden||!('Notification'in window)||Notification.permission!=='granted')return;try{const prefs=JSON.parse(localStorage.getItem('hidegames.preferences')??'{}')as{notifications?:boolean;roomNotifications?:boolean};const latest=events.at(-1);if(prefs.notifications!==false&&prefs.roomNotifications!==false&&latest)new Notification('HideGames - ルーム状態',{body:`${latest.name} さんが${latest.away?'離席':'復帰'}しました`})}catch{/* Notification failure must not affect room state. */}},[events])
}

function useGameStartNotifications(event: { game: string; by: string; byId: string; at: number } | null, localMemberId: string) {
  const seen = useRef(0)
  useEffect(() => {
    if (!event || event.at <= seen.current) return
    seen.current = event.at
    if (event.byId === localMemberId || !document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return
    try {
      const prefs = JSON.parse(localStorage.getItem('hidegames.preferences') ?? '{}') as { notifications?: boolean; gameNotifications?: boolean }
      if (prefs.notifications !== false && prefs.gameNotifications !== false) new Notification('HideGames - ゲーム開始', { body: `${event.by} さんがゲームを開始しました` })
    } catch { /* Notifications must never affect room navigation. */ }
  }, [event, localMemberId])
}

function useInviteNotifications(invitations: import('./useRoomSession').RoomInvitation[]) {
  const seen = useRef(new Set(invitations.map(invitation => invitation.id)))
  useEffect(() => {
    const fresh = invitations.filter(invitation => !seen.current.has(invitation.id))
    fresh.forEach(invitation => seen.current.add(invitation.id))
    if (!fresh.length || !document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return
    try {
      const prefs = JSON.parse(localStorage.getItem('hidegames.preferences') ?? '{}') as { notifications?: boolean; inviteNotifications?: boolean }
      const latest = fresh[0]
      if (prefs.notifications !== false && prefs.inviteNotifications !== false) new Notification('HideGames - ルーム招待', { body: `${latest.from} さんからルーム ${latest.code} へ招待されました` })
    } catch { /* Notifications must never affect invitation delivery. */ }
  }, [invitations])
}

function useCaptionPreference() {
  const read = () => { try { return JSON.parse(localStorage.getItem('hidegames.preferences') ?? '{}').captions === true } catch { return false } }
  const [enabled, setEnabled] = useState(read)
  useEffect(() => { const refresh = () => setEnabled(read()); window.addEventListener('hidegames-preferences', refresh); return () => window.removeEventListener('hidegames-preferences', refresh) }, [])
  return enabled
}

function useBrightnessPreference() {
  const read = () => { try { return JSON.parse(localStorage.getItem('hidegames.preferences') ?? '{}').bright !== false } catch { return true } }
  const [enabled, setEnabled] = useState(read)
  useEffect(() => { const refresh = () => setEnabled(read()); window.addEventListener('hidegames-preferences', refresh); return () => window.removeEventListener('hidegames-preferences', refresh) }, [])
  return enabled
}

function StatusCaptions({ messages, history }: { messages: ChatMessage[]; history: { name: string; away: boolean }[] }) {
  const latestRoom = history.at(-1)
  const latestMessage = messages.at(-1)
  const text = latestRoom ? `${latestRoom.name} さんが${latestRoom.away ? '一時離席しました' : '戻りました'}` : latestMessage ? `${latestMessage.name}: ${latestMessage.text}` : 'ルームの状態をここに表示します'
  return <aside className="status-captions" aria-live="polite" aria-label="画面内の状態字幕"><span>状態字幕</span><p>{text}</p></aside>
}

type VoiceSignal = { from: string; target?: string; data: RTCSessionDescriptionInit | RTCIceCandidateInit }
type VolumePreference = 'voice' | 'youtube' | 'bgm' | 'sfx'
function useSavedVolume(key: VolumePreference) {
  const read = () => { try { const value=JSON.parse(localStorage.getItem('hidegames.preferences') ?? '{}')[key]; return typeof value==='number'?Math.max(0,Math.min(100,value)):80 } catch { return 80 } }
  const [volume,setVolume]=useState(read)
  useEffect(()=>{const refresh=()=>setVolume(read());window.addEventListener('hidegames-preferences',refresh);return()=>window.removeEventListener('hidegames-preferences',refresh)},[key])
  return volume
}
function useInterfaceAudio(active: boolean) {
  const bgm=useSavedVolume('bgm');const sfx=useSavedVolume('sfx')
  const context=useRef<AudioContext|null>(null);const gain=useRef<GainNode|null>(null);const oscillators=useRef<OscillatorNode[]>([]);const activeRef=useRef(active);const bgmRef=useRef(bgm);const sfxRef=useRef(sfx)
  activeRef.current=active;bgmRef.current=bgm;sfxRef.current=sfx
  const ensure=()=>{if(context.current)return context.current;const AudioContextClass=window.AudioContext??(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!AudioContextClass)return null;const next=new AudioContextClass();context.current=next;return next}
  const startBgm=(audio:AudioContext)=>{if(gain.current)return;const output=audio.createGain();output.gain.value=0;output.connect(audio.destination);gain.current=output;oscillators.current=[196,246.94].map((frequency,index)=>{const oscillator=audio.createOscillator();oscillator.type=index?'triangle':'sine';oscillator.frequency.value=frequency;oscillator.detune.value=index?7:-7;oscillator.connect(output);oscillator.start();return oscillator});output.gain.linearRampToValueAtTime(Math.min(.06,bgmRef.current/1500),audio.currentTime+.35)}
  useEffect(()=>{const onPointer=(event:PointerEvent)=>{const target=event.target as Element|null;if(!target?.closest('button:not(:disabled), [role="button"]'))return;const audio=ensure();if(!audio)return;void audio.resume();if(activeRef.current)startBgm(audio);const oscillator=audio.createOscillator();const output=audio.createGain();oscillator.type='sine';oscillator.frequency.setValueAtTime(620,audio.currentTime);oscillator.frequency.exponentialRampToValueAtTime(420,audio.currentTime+.07);output.gain.setValueAtTime(Math.max(.00001,Math.min(.13,sfxRef.current/500)),audio.currentTime);output.gain.exponentialRampToValueAtTime(.00001,audio.currentTime+.08);oscillator.connect(output);output.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+.085)};document.addEventListener('pointerdown',onPointer);return()=>document.removeEventListener('pointerdown',onPointer)},[])
  useEffect(()=>{const audio=context.current;if(!audio)return;if(active){void audio.resume();startBgm(audio);gain.current?.gain.linearRampToValueAtTime(Math.min(.06,bgm/1500),audio.currentTime+.2)}else gain.current?.gain.linearRampToValueAtTime(0,audio.currentTime+.15)},[active,bgm])
  useEffect(()=>()=>{oscillators.current.forEach(oscillator=>oscillator.stop());void context.current?.close()},[])
}
function VoiceChat({ playerId, sendSignal, onSignal, announceVoice, onVoice }: { playerId: string; sendSignal: (target: string, data: RTCSessionDescriptionInit | RTCIceCandidateInit) => void; onSignal: (handler: (signal: VoiceSignal) => void) => () => void; announceVoice: (joined: boolean) => void; onVoice: (handler: (event: { id: string; joined: boolean }) => void) => () => void }) {
  const [active, setActive] = useState(false)
  const [muted, setMuted] = useState(false)
  const [status, setStatus] = useState('ボイス未参加')
  const [showConsent, setShowConsent] = useState(false)
  const stream = useRef<MediaStream | null>(null)
  const peers = useRef(new Map<string, RTCPeerConnection>())
  const audios = useRef(new Map<string, HTMLAudioElement>())
  const activeRef = useRef(false)
  const volume=useSavedVolume('voice')
  activeRef.current = active
  const closePeer = (id: string) => { peers.current.get(id)?.close(); peers.current.delete(id); const audio=audios.current.get(id);audio?.pause();audio?.remove();audios.current.delete(id) }
  const close = () => { if(activeRef.current)announceVoice(false); peers.current.forEach(peer => peer.close()); peers.current.clear(); audios.current.forEach(audio => { audio.pause();audio.remove() }); audios.current.clear(); stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; setActive(false); setMuted(false); setStatus('ボイス未参加') }
  const peer = (target: string) => {
    const existing = peers.current.get(target); if (existing) return existing
    const turnUrl=import.meta.env.VITE_TURN_URL;const turnUser=import.meta.env.VITE_TURN_USERNAME;const turnCredential=import.meta.env.VITE_TURN_CREDENTIAL
    const connection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, ...(turnUrl&&turnUser&&turnCredential?[{urls:turnUrl,username:turnUser,credential:turnCredential}]:[])] })
    stream.current?.getTracks().forEach(track => connection.addTrack(track, stream.current!))
    connection.onicecandidate = event => { if (event.candidate) sendSignal(target, event.candidate.toJSON()) }
    connection.ontrack = event => { const audio = new Audio(); audio.autoplay = true; audio.volume=volume/100; audio.srcObject = event.streams[0]; audios.current.set(target, audio); void audio.play().catch(() => undefined) }
    peers.current.set(target, connection); return connection
  }
  useEffect(() => onSignal(async signal => {
    if (!active || signal.target !== playerId) return
    const connection = peer(signal.from)
    if ('type' in signal.data && (signal.data.type === 'offer' || signal.data.type === 'answer')) {
      await connection.setRemoteDescription(signal.data as RTCSessionDescriptionInit)
      if (signal.data.type === 'offer') { const answer = await connection.createAnswer(); await connection.setLocalDescription(answer); if (answer) sendSignal(signal.from, answer) }
    } else if ('candidate' in signal.data) await connection.addIceCandidate(signal.data as RTCIceCandidateInit)
  }), [active, onSignal, playerId])
  useEffect(() => onVoice(async event => {
    if (!event.joined) return closePeer(event.id)
    if (!activeRef.current || event.id === playerId) return
    const connection = peer(event.id)
    const offer = await connection.createOffer(); await connection.setLocalDescription(offer); sendSignal(event.id, offer)
  }), [onVoice, playerId, sendSignal])
  useEffect(() => () => close(), [])
  useEffect(()=>{audios.current.forEach(audio=>{audio.volume=volume/100})},[volume])
  const join = async () => {
    setShowConsent(false)
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      setActive(true); setStatus('接続中'); announceVoice(true)
    } catch { setStatus('マイクを利用できません。OSまたはブラウザの許可を確認してください。') }
  }
  return <section className="voice-dock"><button className={`voice-main ${active ? 'active' : ''}`} onClick={active ? close : () => setShowConsent(true)}>{active ? <Mic size={15}/> : <MicOff size={15}/>}<span>{active ? 'ボイス参加中' : 'ボイスに参加'}</span></button>{active && <button className="voice-mute" onClick={()=>{const next=!muted;stream.current?.getAudioTracks().forEach(track=>track.enabled=!next);setMuted(next)}} aria-label="マイクをミュート">{muted?<MicOff size={15}/>:<Mic size={15}/>}</button>}{showConsent && <div className="voice-consent" role="dialog" aria-label="マイクの利用確認"><b>マイクを使いますか？</b><p>音声は参加中のルームメンバーへ直接送信されます。いつでもミュート・退出できます。</p><div><button className="secondary" onClick={()=>setShowConsent(false)}>今は使わない</button><button className="primary" onClick={()=>void join()}>マイクを有効にする</button></div></div>}<small>{status}</small></section>
}

function PauseOverlay({ awayNames, resume, playerId, memberCount, isHost, onReady, onCancel, sendMessage }: { awayNames: string[]; resume: { readyIds: string[]; startsAt?: number }; playerId: string; memberCount: number; isHost: boolean; onReady: (ready: boolean) => void; onCancel: () => void; sendMessage: (message: string) => void }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { if (!resume.startsAt) return; const timer = window.setInterval(() => setNow(Date.now()), 100); return () => window.clearInterval(timer) }, [resume.startsAt])
  const count = resume.startsAt ? Math.max(0, Math.ceil((resume.startsAt - now) / 1000)) : null
  const ready = resume.readyIds.includes(playerId)
  const allReady = resume.readyIds.length >= memberCount
  return <div className="pause-overlay" role="dialog" aria-modal="true">
    <div className="pause-card">
      <div className="pause-icon"><Pause size={32} fill="currentColor" /></div>
      {count !== null ? <><p className="eyebrow">全員の準備ができました</p><h2>{count || '再開！'}</h2><p>全員の画面で同時にゲームを再開します</p>{isHost && <button className="secondary" onClick={onCancel}>再開を取り消す</button>}</> : <><p className="eyebrow">ゲームは一時停止中です</p><h2>{awayNames.length ? `${awayNames.join('、')} さんが一時的に離席しています` : 'ゲームを一時停止しています'}</h2><p>戻るまでお待ちください。待機中もチャットできます。</p><div className="pause-status"><button className="secondary" onClick={()=>sendMessage('すぐ戻ります')}>すぐ戻る</button><button className="secondary" onClick={()=>sendMessage('少し待ってください')}>少し待って</button></div>{awayNames.length === 0 && <div className="pause-status"><span className="status-dot" />全員が戻りました。{resume.readyIds.length} / {memberCount} 人が準備OKです</div>}<button className="primary wide" disabled={awayNames.length > 0 || allReady} onClick={() => onReady(!ready)}><Play size={17} fill="currentColor" />{awayNames.length ? '全員の復帰を待っています' : allReady ? '再開を準備しています' : ready ? '準備OKを取り消す' : '準備OKにする'}</button></>}
    </div>
  </div>
}

function ConnectionOverlay() {
  return <div className="pause-overlay" role="status" aria-live="assertive"><div className="pause-card"><div className="pause-icon"><Radio size={32} /></div><p className="eyebrow">RECONNECTING</p><h2>接続を待機中です</h2><p>ゲームは安全に停止しています。ネットワーク接続を確認し、自動再接続をお待ちください。</p></div></div>
}

function Othello({ paused, sharedState, syncState, members, playerId }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  type State = { board?: (string | null)[][]; turn?: 'b' | 'w'; winner?: 'b' | 'w' | null; finished?: boolean }
  const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
  const fresh = () => { const b = Array.from({ length: 8 }, () => Array<string | null>(8).fill(null)); b[3][3]='w'; b[3][4]='b'; b[4][3]='b'; b[4][4]='w'; return b }
  const [board, setBoard] = useState(fresh); const [turn, setTurn] = useState<'b'|'w'>('b'); const [winner, setWinner] = useState<'b'|'w'|null>(null); const [finished, setFinished] = useState(false)
  useEffect(() => { const state = sharedState as State | undefined; if (state?.board?.length === 8 && state.turn) { setBoard(state.board); setTurn(state.turn); setWinner(state.winner ?? null); setFinished(Boolean(state.finished)) } }, [sharedState])
  const valid = (r: number, c: number, who = turn, b = board) => !b[r][c] && dirs.some(([dr,dc]) => { let y=r+dr,x=c+dc,n=0; while(y>=0&&y<8&&x>=0&&x<8&&b[y][x]&&b[y][x]!==who){n++;y+=dr;x+=dc} return n>0&&y>=0&&y<8&&x>=0&&x<8&&b[y][x]===who })
  const hasMove = (who:'b'|'w', b=board) => b.some((row,r) => row.some((_,c) => valid(r,c,who,b)))
  const end = (b:(string|null)[][]) => { const black=b.flat().filter(x=>x==='b').length, white=b.flat().filter(x=>x==='w').length; return black===white ? null : black>white ? 'b' : 'w' }
  const advance = (b:(string|null)[][], justPlayed:'b'|'w') => { const other=justPlayed==='b'?'w':'b'; const otherCan=hasMove(other,b); const sameCan=hasMove(justPlayed,b); const done=!otherCan&&!sameCan||b.flat().every(Boolean); const nextTurn=otherCan?other:justPlayed; const nextWinner=done?end(b):null; setBoard(b);setTurn(nextTurn);setWinner(nextWinner);setFinished(done);syncState({board:b,turn:nextTurn,winner:nextWinner,finished:done}) }
  const playerIndex = members.findIndex(member => member.id === playerId); const myColor = playerIndex === 0 ? 'b' : playerIndex === 1 ? 'w' : null; const myName = members.find(member => member.id === playerId)?.name ?? 'あなた'; const opponentName = members.find(member => member.id !== playerId)?.name ?? '相手'; const myTurn = turn === myColor; const host = members[0]?.id === playerId
  const place = (r:number,c:number) => { if (paused || finished || !myTurn || !valid(r,c)) return; const next=board.map(row=>[...row]); dirs.forEach(([dr,dc])=>{let y=r+dr,x=c+dc,flips:[number,number][]=[];while(y>=0&&y<8&&x>=0&&x<8&&next[y][x]&&next[y][x]!==turn){flips.push([y,x]);y+=dr;x+=dc}if(flips.length&&y>=0&&y<8&&x>=0&&x<8&&next[y][x]===turn)flips.forEach(([fy,fx])=>next[fy][fx]=turn)}); next[r][c]=turn; advance(next,turn) }
  const pass = () => { if (paused || finished || !myTurn || hasMove(turn)) return; advance(board,turn==='b'?'w':'b') }
  const reset = () => { if (!host) return; const next=fresh();setBoard(next);setTurn('b');setWinner(null);setFinished(false);syncState({board:next,turn:'b',winner:null,finished:false}) }
  const black=board.flat().filter(x=>x==='b').length, white=board.flat().filter(x=>x==='w').length
  return <div className="board-game"><div className="game-top"><div><span className="tag">ボードゲーム</span><h1>オセロ</h1></div><div className="turn-pill">{finished ? winner ? `${winner==='b'?'黒':'白'}の勝ち` : '引き分け' : <><span className={`stone ${turn}`} />{myTurn ? 'あなたの番です' : `${opponentName} の番です`}</>}</div></div><div className="othello-wrap"><div className="score-card"><p>{myColor === 'b' ? myName : opponentName} <span className="stone b" /></p><strong>{black}</strong></div><div className="othello-board">{board.map((row,r)=>row.map((cell,c)=><button key={`${r}-${c}`} disabled={paused||finished||!myTurn} onClick={()=>place(r,c)} aria-label={`${r+1}行${c+1}列`} className={`othello-cell ${myTurn && valid(r,c) ? 'valid' : ''}`}>{cell&&<i className={`stone ${cell}`} />}</button>))}</div><div className="score-card"><p>{myColor === 'w' ? myName : opponentName} <span className="stone w" /></p><strong>{white}</strong></div></div><div className="go-actions">{!finished&&!hasMove(turn)&&<button className="secondary" disabled={paused || !myTurn} onClick={pass}>パスする</button>}{finished&&<button className="primary" disabled={!host} onClick={reset}>{host ? 'もう一度遊ぶ' : 'ホストが再戦を開始します'}</button>}</div></div>
}

function Gomoku({ paused, sharedState, syncState, members, playerId }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  const size=13; const [board,setBoard]=useState<(string|null)[][]>(()=>Array.from({length:size},()=>Array<string|null>(size).fill(null))); const [turn,setTurn]=useState<'black'|'white'>('black'); const [winner,setWinner]=useState<string|null>(null)
  useEffect(() => { const state = sharedState as { board?: (string | null)[][]; turn?: 'black' | 'white'; winner?: string | null } | undefined; if (state?.board?.length === size && state.turn) { setBoard(state.board); setTurn(state.turn); setWinner(state.winner ?? null) } }, [sharedState])
  const playerIndex=members.findIndex(member=>member.id===playerId);const myColor=playerIndex===0?'black':playerIndex===1?'white':null;const myName=members.find(member=>member.id===playerId)?.name??'あなた';const opponentName=members.find(member=>member.id!==playerId)?.name??'相手';const myTurn=turn===myColor;const host=members[0]?.id===playerId
  const put=(r:number,c:number)=>{if(paused||winner||!myTurn||board[r][c])return;const b=board.map(row=>[...row]);b[r][c]=turn;setBoard(b);const ds=[[1,0],[0,1],[1,1],[1,-1]];const won=ds.some(([dr,dc])=>{let n=1;for(const k of[-1,1]){let y=r+dr*k,x=c+dc*k;while(y>=0&&y<size&&x>=0&&x<size&&b[y][x]===turn){n++;y+=dr*k;x+=dc*k}}return n>=5});const nextTurn=turn==='black'?'white':'black';if(won)setWinner(turn);else setTurn(nextTurn);syncState({board:b,turn:nextTurn,winner:won?turn:null})}
  const reset=()=>{if(!host)return;const next=Array.from({length:size},()=>Array<string|null>(size).fill(null));setBoard(next);setTurn('black');setWinner(null);syncState({board:next,turn:'black',winner:null})}
  return <div className="board-game"><div className="game-top"><div><span className="tag">ボードゲーム</span><h1>五目並べ</h1></div><div className="turn-pill">{winner ? `${winner===myColor?myName:opponentName} の勝ち！` : <><span className={`stone ${turn==='black'?'b':'w'}`} />{myTurn?'あなたの番です':`${opponentName} の番です`}</>}</div></div><div className="gomoku-board">{board.map((row,r)=>row.map((cell,c)=><button key={`${r}-${c}`} disabled={paused||Boolean(winner)||!myTurn} onClick={()=>put(r,c)} className="gomoku-cell">{cell&&<i className={`stone ${cell==='black'?'b':'w'}`} />}</button>))}</div>{winner&&<button className="secondary center" disabled={!host} onClick={reset}>{host?'もう一度遊ぶ':'ホストが再戦を開始します'}</button>}</div>
}

function ConnectFour({ paused, sharedState, syncState, members, playerId }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  const rows = 6, cols = 7
  const empty = () => Array.from({ length: rows }, () => Array<string | null>(cols).fill(null))
  const [board, setBoard] = useState<(string | null)[][]>(empty)
  const [turn, setTurn] = useState<'red' | 'yellow'>('red')
  const [winner, setWinner] = useState<string | null>(null)
  useEffect(() => { const state = sharedState as { board?: (string | null)[][]; turn?: 'red' | 'yellow'; winner?: string | null } | undefined; if (state?.board?.length === rows && state.turn) { setBoard(state.board); setTurn(state.turn); setWinner(state.winner ?? null) } }, [sharedState])
  const playerIndex=members.findIndex(member=>member.id===playerId); const myColor=playerIndex===0?'red':playerIndex===1?'yellow':null; const myName=members.find(member=>member.id===playerId)?.name??'あなた'; const opponentName=members.find(member=>member.id!==playerId)?.name??'相手'; const myTurn=turn===myColor; const host=members[0]?.id===playerId
  const drop = (column: number) => {
    if (paused || winner || !myTurn) return
    const row = [...Array(rows).keys()].reverse().find(index => !board[index][column])
    if (row === undefined) return
    const next = board.map(line => [...line]); next[row][column] = turn
    const directions = [[1, 0], [0, 1], [1, 1], [1, -1]]
    const won = directions.some(([dr, dc]) => { let n = 1; for (const sign of [-1, 1]) { let y = row + dr * sign, x = column + dc * sign; while (y >= 0 && y < rows && x >= 0 && x < cols && next[y][x] === turn) { n++; y += dr * sign; x += dc * sign } } return n >= 4 })
    const nextTurn = turn === 'red' ? 'yellow' : 'red'; setBoard(next); setTurn(nextTurn); setWinner(won ? turn : null); syncState({ board: next, turn: nextTurn, winner: won ? turn : null })
  }
  const reset = () => { if(!host)return; const next = empty(); setBoard(next); setTurn('red'); setWinner(null); syncState({ board: next, turn: 'red', winner: null }) }
  return <div className="board-game"><div className="game-top"><div><span className="tag">ボードゲーム</span><h1>四目並べ</h1></div><div className="turn-pill">{winner ? `${winner===myColor?myName:opponentName} の勝ち！` : <><span className={`connect-stone ${turn}`} />{myTurn?'あなたの番です':`${opponentName} の番です`}</>}</div></div><div className="connect-board">{Array.from({ length: cols }, (_, column) => <button key={column} disabled={paused||Boolean(winner)||!myTurn} className="connect-column" onClick={() => drop(column)} aria-label={`${column + 1}列に置く`}>{board.map((line, row) => <span className={`connect-slot ${line[column] ?? ''}`} key={row} />)}</button>)}</div>{winner && <button className="secondary center" disabled={!host} onClick={reset}>{host?'もう一度遊ぶ':'ホストが再戦を開始します'}</button>}</div>
}

type UnoCard = { id: string; color: 'red' | 'blue' | 'yellow' | 'green' | 'wild'; value: string }
type ShogiBase = 'K'|'R'|'B'|'G'|'S'|'N'|'L'|'P'
type ShogiKind = ShogiBase|'PR'|'PB'|'PS'|'PN'|'PL'|'PP'
type ShogiPiece = `${'b'|'w'}${ShogiKind}`
function ShogiGame({ paused, sharedState, syncState, members, playerId }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  const blank=()=>Array.from({length:9},()=>Array<ShogiPiece|null>(9).fill(null))
  const initial=()=>{const board=blank();board[0]=['wL','wN','wS','wG','wK','wG','wS','wN','wL'];board[1][1]='wR';board[1][7]='wB';board[2]=Array(9).fill('wP');board[6]=Array(9).fill('bP');board[7][1]='bB';board[7][7]='bR';board[8]=['bL','bN','bS','bG','bK','bG','bS','bN','bL'];return board as (ShogiPiece|null)[][]}
  const emptyHands=():Record<'b'|'w',ShogiBase[]>=>({b:[],w:[]})
  const [board,setBoard]=useState<(ShogiPiece|null)[][]>(initial);const [turn,setTurn]=useState<'b'|'w'>('b');const [selected,setSelected]=useState<[number,number]|null>(null);const [selectedHand,setSelectedHand]=useState<ShogiBase|null>(null);const [hands,setHands]=useState<Record<'b'|'w',ShogiBase[]>>(emptyHands);const [winner,setWinner]=useState<'b'|'w'|null>(null)
  useEffect(()=>{const state=sharedState as {board?:(ShogiPiece|null)[][];turn?:'b'|'w';hands?:Record<'b'|'w',ShogiBase[]>;winner?:'b'|'w'|null}|undefined;if(state?.board?.length===9&&state.turn){setBoard(state.board);setTurn(state.turn);setHands(state.hands??emptyHands());setWinner(state.winner??null);setSelected(null);setSelectedHand(null)}},[sharedState])
  const gold=(dy:number,dx:number,forward:number)=>(dy===forward&&Math.abs(dx)<=1)||(dy===0&&Math.abs(dx)===1)||(dy===-forward&&dx===0)
  const valid=(from:[number,number],to:[number,number],piece=board[from[0]][from[1]],source=board)=>{if(!piece||from[0]===to[0]&&from[1]===to[1])return false;const target=source[to[0]][to[1]];if(target?.[0]===piece[0])return false;const dy=to[0]-from[0],dx=to[1]-from[1],ay=Math.abs(dy),ax=Math.abs(dx),forward=piece[0]==='b'?-1:1,kind=piece.slice(1) as ShogiKind;const clear=()=>{const sy=Math.sign(dy),sx=Math.sign(dx);for(let y=from[0]+sy,x=from[1]+sx;y!==to[0]||x!==to[1];y+=sy,x+=sx)if(source[y][x])return false;return true};if(kind==='K')return ay<=1&&ax<=1;if(kind==='P')return dy===forward&&dx===0;if(kind==='L')return dx===0&&Math.sign(dy)===forward&&clear();if(kind==='N')return dy===2*forward&&ax===1;if(kind==='R')return (dx===0||dy===0)&&clear();if(kind==='B')return ay===ax&&clear();if(kind==='G'||kind==='PP'||kind==='PL'||kind==='PN'||kind==='PS')return gold(dy,dx,forward);if(kind==='S')return (dy===forward&&ax<=1)||(dy===-forward&&ax===1);if(kind==='PR')return ((dx===0||dy===0)&&clear())||(ay===1&&ax===1);if(kind==='PB')return (ay===ax&&clear())||((ay+ax===1));return false}
  const playerIndex=members.findIndex(member=>member.id===playerId);const myColor=playerIndex===0?'b':playerIndex===1?'w':null;const host=members[0]?.id===playerId
  const base=(piece:ShogiPiece):ShogiBase=>{const kind=piece.slice(1) as ShogiKind;return kind==='PR'?'R':kind==='PB'?'B':kind==='PS'?'S':kind==='PN'?'N':kind==='PL'?'L':kind==='PP'?'P':kind as ShogiBase}
  const promoted=(piece:ShogiPiece,from:number,to:number)=>{const kind=piece.slice(1) as ShogiKind;if(!['P','L','N','S','R','B'].includes(kind))return piece;const zone=piece[0]==='b'?(from<=2||to<=2):(from>=6||to>=6);const forced=(kind==='P'||kind==='L')&&(to===0||to===8)||(kind==='N')&&(piece[0]==='b'?to<=1:to>=7);if(!zone)return piece;const nextKind=(`P${kind}`.replace('PP','PP').replace('PL','PL').replace('PN','PN').replace('PS','PS').replace('PR','PR').replace('PB','PB')) as ShogiKind;return forced||window.confirm('成りますか？')?`${piece[0]}${nextKind}` as ShogiPiece:piece}
  const inCheck=(source:(ShogiPiece|null)[][],color:'b'|'w')=>{let king:[number,number]|null=null;source.forEach((line,row)=>line.forEach((piece,col)=>{if(piece===`${color}K`)king=[row,col]}));return !king||source.some((line,row)=>line.some((piece,col)=>Boolean(piece&&piece[0]!==color&&valid([row,col],king!,piece,source))))}
  const legalDrop=(kind:ShogiBase,row:number,col:number,source=board,color=turn)=>{if(source[row][col])return false;if((kind==='P'||kind==='L')&&(color==='b'?row===0:row===8))return false;if(kind==='N'&&(color==='b'?row<=1:row>=7))return false;if(kind==='P'&&source.some(line=>line[col]===`${color}P`))return false;return true}
  const legalMove=(from:[number,number],to:[number,number],piece=board[from[0]][from[1]],source=board)=>{const target=source[to[0]][to[1]];if(!piece||target?.slice(1)==='K'||!valid(from,to,piece,source))return false;const next=source.map(line=>[...line]);next[to[0]][to[1]]=piece;next[from[0]][from[1]]=null;return !inCheck(next,piece[0] as 'b'|'w')}
  const hasLegalMove=(source:(ShogiPiece|null)[][],color:'b'|'w',hand:ShogiBase[])=>{
    const boardMove=source.some((line,row)=>line.some((piece,col)=>piece?.[0]===color&&source.some((targetLine,targetRow)=>targetLine.some((_,targetCol)=>legalMove([row,col],[targetRow,targetCol],piece,source)))))
    if(boardMove)return true
    return hand.some(kind=>source.some((line,row)=>line.some((_,col)=>{if(!legalDrop(kind,row,col,source,color))return false;const next=source.map(item=>[...item]);next[row][col]=`${color}${kind}` as ShogiPiece;return !inCheck(next,color)})))
  }
  const drop=(row:number,col:number)=>{if(paused||winner||turn!==myColor||!selectedHand||!legalDrop(selectedHand,row,col))return;const next=board.map(line=>[...line]);next[row][col]=`${turn}${selectedHand}` as ShogiPiece;if(inCheck(next,turn))return;const nextHands={...hands,[turn]:hands[turn].filter((kind,index)=>kind!==selectedHand||index!==hands[turn].indexOf(selectedHand))};const nextTurn=turn==='b'?'w':'b';const won=inCheck(next,nextTurn)&&!hasLegalMove(next,nextTurn,nextHands[nextTurn])?turn:null;setBoard(next);setHands(nextHands);setTurn(nextTurn);setWinner(won);setSelectedHand(null);syncState({board:next,hands:nextHands,turn:nextTurn,winner:won})}
  const move=(row:number,col:number)=>{if(paused||winner||turn!==myColor)return;if(selectedHand)return drop(row,col);const piece=board[row][col];if(!selected){if(piece?.[0]===turn)setSelected([row,col]);return}if(selected[0]===row&&selected[1]===col){setSelected(null);return}const moving=board[selected[0]][selected[1]];if(piece?.[0]===turn){setSelected([row,col]);return}if(!legalMove(selected,[row,col],moving))return;const next=board.map(line=>[...line]);const captured=next[row][col];const resolved=promoted(moving!,selected[0],row);next[row][col]=resolved;next[selected[0]][selected[1]]=null;if(inCheck(next,turn))return;const nextHands=captured?{...hands,[turn]:[...hands[turn],base(captured)]}:hands;const nextTurn=turn==='b'?'w':'b';const won=inCheck(next,nextTurn)&&!hasLegalMove(next,nextTurn,nextHands[nextTurn])?turn:null;setBoard(next);setHands(nextHands);setTurn(nextTurn);setWinner(won);setSelected(null);syncState({board:next,hands:nextHands,turn:nextTurn,winner:won})}
  const glyph:Record<ShogiPiece,string>={bK:'王',bR:'飛',bB:'角',bG:'金',bS:'銀',bN:'桂',bL:'香',bP:'歩',bPR:'竜',bPB:'馬',bPS:'全',bPN:'圭',bPL:'杏',bPP:'と',wK:'玉',wR:'飛',wB:'角',wG:'金',wS:'銀',wN:'桂',wL:'香',wP:'歩',wPR:'竜',wPB:'馬',wPS:'全',wPN:'圭',wPL:'杏',wPP:'と'}
  const reset=()=>{if(!host)return;const next=initial();setBoard(next);setTurn('b');setHands(emptyHands());setWinner(null);setSelected(null);setSelectedHand(null);syncState({board:next,hands:emptyHands(),turn:'b',winner:null})}
  return <div className="board-game shogi-game"><div className="game-top"><div><span className="tag">BOARD / SHOGI</span><h1>将棋</h1></div><div className="turn-pill">{winner?`${winner==='b'?'先手':'後手'}のチェックメイト`:inCheck(board,turn)?`${turn===myColor?'あなた':'相手'}は王手です`:`${turn===myColor?'あなた':'相手'}の番`}</div></div><p className="game-hint">持ち駒は盤上の空きマスへ打てます。成りを選択でき、二歩や行き所のない駒打ち、王手の放置は防止されます。</p><section className="go-actions"><span>あなたの持ち駒</span>{hands[myColor??'b'].length?hands[myColor??'b'].map((kind,index)=><button key={`${kind}-${index}`} className={`secondary ${selectedHand===kind?'selected':''}`} disabled={paused||Boolean(winner)||turn!==myColor} onClick={()=>{setSelected(null);setSelectedHand(selectedHand===kind?null:kind)}}>{glyph[`${turn}${kind}` as ShogiPiece]}</button>):<small>なし</small>}</section><div className="shogi-board">{board.map((line,row)=>line.map((piece,col)=>{const active=selected?.[0]===row&&selected?.[1]===col;const destination=selected&&legalMove(selected,[row,col],board[selected[0]][selected[1]]);return <button key={`${row}-${col}`} disabled={paused||Boolean(winner)||turn!==myColor} className={`${active?'active':''} ${destination?'move-target':''}`} onClick={()=>move(row,col)}>{piece&&<span className={piece[0]==='w'?'opponent-piece':''}>{glyph[piece]}</span>}</button>}))}</div>{winner&&<button className="secondary center" disabled={!host} onClick={reset}>{host?'新しい対局':'ホストが再戦を開始します'}</button>}</div>
}
function DaifugoGame({ paused, sharedState, syncState, members, playerId }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  type State={hands:Record<string,number[]>;turn:string;pile?:{rank:number;count:number;owner:string};passed:string[];ranking:string[];revolution?:boolean}
  const state=sharedState as State|undefined
  const [playCount,setPlayCount]=useState(1)
  const next=(id:string,hands:Record<string,number[]>,ranking:string[])=>{for(let step=1;step<=members.length;step++){const member=members[(members.findIndex(item=>item.id===id)+step)%members.length];if(!ranking.includes(member.id)&&(hands[member.id]??[]).length)return member.id}return id}
  const start=()=>{const deck=Array.from({length:52},(_,index)=>3+(index%13));const hands:Record<string,number[]>={};members.forEach((member,index)=>hands[member.id]=deck.filter((_,cardIndex)=>cardIndex%members.length===index).sort((a,b)=>a-b));setPlayCount(1);syncState({hands,turn:members[0]?.id??playerId,passed:[],ranking:[],revolution:false})}
  const canPlay=(rank:number)=>{if(!state)return false;const count=state.pile?.count??playCount;const available=state.hands[playerId]?.filter(card=>card===rank).length??0;const stronger=!state.pile||(state.revolution?rank<state.pile.rank:rank>state.pile.rank);return count>=1&&available>=count&&stronger}
  const play=(rank:number)=>{if(!state||paused||state.turn!==playerId||!canPlay(rank))return;const count=state.pile?.count??playCount;let removed=0;const hands={...state.hands,[playerId]:state.hands[playerId].filter(card=>{if(card===rank&&removed<count){removed++;return false}return true})};const ranking=hands[playerId].length===0?[...state.ranking,playerId]:state.ranking;const revolution=Boolean(state.revolution)!==(count===4);const eightCut=rank===8;const nextTurn=eightCut?(hands[playerId].length?playerId:next(playerId,hands,ranking)):next(playerId,hands,ranking);setPlayCount(1);syncState({...state,hands,pile:eightCut?undefined:{rank,count,owner:playerId},turn:nextTurn,passed:[],ranking,revolution})}
  const pass=()=>{if(!state||paused||state.turn!==playerId||!state.pile)return;const active=members.filter(member=>!state.ranking.includes(member.id)&&state.hands[member.id]?.length>0);const passed=[...state.passed,playerId];if(passed.length>=active.length-1){const owner=state.pile.owner;const lead=(state.hands[owner]??[]).length?owner:next(owner,state.hands,state.ranking);setPlayCount(1);syncState({...state,pile:undefined,passed:[],turn:lead})}else syncState({...state,passed,turn:next(playerId,state.hands,state.ranking)})}
  if(!state)return <div className="board-game daifugo-game"><div className="game-top"><div><span className="tag">CARD / DAIFUGO</span><h1>大富豪</h1></div></div><section className="round-card"><h2>強い数字を出して手札をなくそう</h2><p>同じ枚数のより強い数字を出します。</p><button className="primary" disabled={paused||members.length<2} onClick={start}>ゲームを開始</button></section></div>
  const ranks=[...new Set(state.hands[playerId]??[])];const label=(rank:number)=>rank===14?'A':rank===15?'2':String(rank);const finished=state.ranking.length>=members.length-1;const selectedCount=state.pile?.count??playCount
  return <div className="board-game daifugo-game"><div className="game-top"><div><span className="tag">CARD / DAIFUGO</span><h1>大富豪</h1></div><div className="turn-pill">{finished?'順位決定':`${members.find(member=>member.id===state.turn)?.name??'あなた'} の番`}</div></div><div className="uno-players">{members.map(member=><span key={member.id} className={member.id===state.turn?'active':''}>{state.ranking.includes(member.id)?`${state.ranking.indexOf(member.id)+1}位`:`${member.name} ${state.hands[member.id]?.length??0}枚`}</span>)}</div><section className="daifugo-pile panel"><p className="eyebrow">TABLE</p>{state.pile?<><b>{label(state.pile.rank)}</b><span>{state.pile.count}枚組 ・ {members.find(member=>member.id===state.pile?.owner)?.name}</span></>:<p>新しい場です。{selectedCount}枚組を選んで出せます。</p>}<small>{state.revolution?'革命中: 数字が小さいほど強い':'通常: 数字が大きいほど強い'}。8を出すと場を流して続けて出せます。</small></section>{!state.pile&&<div className="go-actions">{[1,2,3,4].map(count=><button key={count} className={`secondary ${playCount===count?'selected':''}`} disabled={paused||state.turn!==playerId||finished} onClick={()=>setPlayCount(count)}>{count}枚組</button>)}</div>}<div className="sevens-hand">{ranks.map(rank=><button key={rank} disabled={paused||state.turn!==playerId||!canPlay(rank)||finished} className={canPlay(rank)&&state.turn===playerId?'playable':''} onClick={()=>play(rank)}><small>{state.hands[playerId].filter(card=>card===rank).length}枚</small><b>{label(rank)}</b></button>)}</div><div className="go-actions"><button className="secondary" disabled={paused||state.turn!==playerId||!state.pile||finished} onClick={pass}>パスする</button>{finished&&<button className="primary" onClick={start}>もう一度遊ぶ</button>}</div></div>
}
function SevensGame({ paused, sharedState, syncState, members, playerId }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  type Card = { id: string; suit: '赤'|'青'|'緑'|'黄'; rank: number }
  type State = { hands: Record<string,Card[]>; placed: Record<string,number[]>; turn: string; winner?: string; passes: Record<string,number> }
  const state = sharedState as State | undefined
  const suits: Card['suit'][]=['赤','青','緑','黄']
  const next = (id:string)=>members[(members.findIndex(member=>member.id===id)+1)%members.length]?.id??playerId
  const start=()=>{const cards=suits.flatMap(suit=>Array.from({length:13},(_,index)=>({id:`${suit}-${index+1}`,suit,rank:index+1})));const placed=Object.fromEntries(suits.map(suit=>[suit,[7]]));const available=cards.filter(card=>card.rank!==7);const hands:Record<string,Card[]>={};members.forEach((member,index)=>hands[member.id]=available.filter((_,cardIndex)=>cardIndex%members.length===index));syncState({hands,placed,turn:members[0]?.id??playerId,passes:Object.fromEntries(members.map(member=>[member.id,0]))})}
  const playable=(card:Card)=>{if(!state)return false;const row=state.placed[card.suit];return card.rank===Math.min(...row)-1||card.rank===Math.max(...row)+1}
  const play=(card:Card)=>{if(!state||paused||state.turn!==playerId||state.winner||!playable(card))return;const hands={...state.hands,[playerId]:state.hands[playerId].filter(item=>item.id!==card.id)};const placed={...state.placed,[card.suit]:[...state.placed[card.suit],card.rank].sort((a,b)=>a-b)};syncState({...state,hands,placed,turn:next(playerId),winner:hands[playerId].length===0?playerId:undefined})}
  const pass=()=>{if(!state||paused||state.turn!==playerId||state.winner)return;syncState({...state,turn:next(playerId),passes:{...state.passes,[playerId]:(state.passes[playerId]??0)+1}})}
  if(!state)return <div className="board-game sevens-game"><div className="game-top"><div><span className="tag">CARD / SEVENS</span><h1>7並べ</h1></div></div><section className="round-card"><h2>7から前後へカードをつなげよう</h2><p>全ての手札を出し切った人が勝ちです。</p><button className="primary" disabled={paused||members.length<2} onClick={start}>ゲームを開始</button></section></div>
  const hand=state.hands[playerId]??[];const winner=state.winner?members.find(member=>member.id===state.winner):null
  return <div className="board-game sevens-game"><div className="game-top"><div><span className="tag">CARD / SEVENS</span><h1>7並べ</h1></div><div className="turn-pill">{winner?`${winner.name} の勝ち`:`${members.find(member=>member.id===state.turn)?.name??'あなた'} の番`}</div></div><div className="uno-players">{members.map(member=><span key={member.id} className={member.id===state.turn?'active':''}>{member.name} <b>{state.hands[member.id]?.length??0}</b>枚</span>)}</div><section className="sevens-table">{suits.map(suit=><div key={suit}><b>{suit}</b><span>{Array.from({length:13},(_,index)=>index+1).map(rank=><i key={rank} className={state.placed[suit].includes(rank)?'placed':''}>{state.placed[suit].includes(rank)?rank:''}</i>)}</span></div>)}</section><div className="sevens-hand">{hand.sort((a,b)=>a.suit.localeCompare(b.suit)||a.rank-b.rank).map(card=><button key={card.id} disabled={paused||state.turn!==playerId||!playable(card)||Boolean(winner)} className={playable(card)&&state.turn===playerId?'playable':''} onClick={()=>play(card)}><small>{card.suit}</small><b>{card.rank}</b></button>)}</div><div className="go-actions"><button className="secondary" disabled={paused||state.turn!==playerId||Boolean(winner)} onClick={pass}>パスする ({state.passes[playerId]??0})</button>{winner&&<button className="primary" onClick={start}>もう一度遊ぶ</button>}</div></div>
}
function OldMaidGame({ paused, sharedState, syncState, members, playerId }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  type State = { hands: Record<string,string[]>; turn: string; loser?: string }
  const state = sharedState as State | undefined
  const clean = (cards: string[]) => cards.filter((card,index)=>card==='JOKER'||(cards.filter(item=>item===card).length%2===1&&index===cards.indexOf(card)))
  const start = () => { const deck=['A','A','2','2','3','3','4','4','5','5','6','6','7','7','8','8','JOKER'];const hands:Record<string,string[]>={};members.forEach((member,index)=>hands[member.id]=clean(deck.filter((_,cardIndex)=>cardIndex%members.length===index)));syncState({hands,turn:members[0]?.id??playerId}) }
  const nextWithCards = (from:string,hands:Record<string,string[]>) => { for(let step=1;step<=members.length;step++){const member=members[(members.findIndex(item=>item.id===from)+step)%members.length];if((hands[member.id]??[]).length)return member.id}return from }
  const draw = (index:number) => { if(!state||paused||state.turn!==playerId||state.loser)return;const target=nextWithCards(playerId,Object.fromEntries(Object.entries(state.hands).map(([id,cards])=>[id,id===playerId?[]:cards])));const card=state.hands[target]?.[index];if(!card)return;const hands={...state.hands,[target]:state.hands[target].filter((_,cardIndex)=>cardIndex!==index),[playerId]:clean([...(state.hands[playerId]??[]),card])};const remaining=members.filter(member=>(hands[member.id]??[]).length>0);syncState({...state,hands,turn:nextWithCards(playerId,hands),loser:remaining.length===1?remaining[0].id:undefined}) }
  if(!state)return <div className="board-game oldmaid-game"><div className="game-top"><div><span className="tag">CARD / OLD MAID</span><h1>ババ抜き</h1></div></div><section className="round-card"><h2>ジョーカーを最後まで持たないようにしよう</h2><p>同じ数字のペアは自動で捨てられます。</p><button className="primary" disabled={paused||members.length<2} onClick={start}>ゲームを開始</button></section></div>
  const target=nextWithCards(playerId,Object.fromEntries(Object.entries(state.hands).map(([id,cards])=>[id,id===playerId?[]:cards])));const canDraw=state.turn===playerId&&!state.loser;const loser=state.loser?members.find(member=>member.id===state.loser):null
  return <div className="board-game oldmaid-game"><div className="game-top"><div><span className="tag">CARD / OLD MAID</span><h1>ババ抜き</h1></div><div className="turn-pill">{loser?`${loser.name} が最後の一人です`:`${members.find(member=>member.id===state.turn)?.name??'あなた'} の番`}</div></div><div className="uno-players">{members.map(member=><span key={member.id} className={member.id===state.turn?'active':''}>{member.name} <b>{state.hands[member.id]?.length??0}</b>枚</span>)}</div><section className="oldmaid-target"><p>{canDraw?`${members.find(member=>member.id===target)?.name??'相手'} のカードを1枚選ぶ`:'手番の人がカードを引いています'}</p><div>{(state.hands[target]??[]).map((_,index)=><button key={index} disabled={!canDraw} onClick={()=>draw(index)}>?</button>)}</div></section><section className="oldmaid-hand"><h2>あなたの手札</h2><div>{(state.hands[playerId]??[]).map((card,index)=><span key={`${card}-${index}`}>{card==='JOKER'?'JOKER':card}</span>)}</div></section>{loser&&<button className="primary center" onClick={start}>もう一度遊ぶ</button>}</div>
}
function UnoGame({ paused, sharedState, syncState, members, playerId }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  type State = { hands: Record<string, UnoCard[]>; pile: UnoCard; activeColor: UnoCard['color']; turn: string; direction: 1|-1; drawIndex: number; winner?: string }
  const deck = useMemo<UnoCard[]>(() => { const colors: UnoCard['color'][]=['red','blue','yellow','green']; return [...colors.flatMap(color=>[0,1,2,3,4,5,'skip','reverse','+2'].map((value,index)=>({id:`${color}-${value}-${index}`,color,value:String(value)}))),{id:'wild-1',color:'wild',value:'WILD'},{id:'wild-2',color:'wild',value:'+4'}] }, [])
  const state = sharedState as State | undefined
  const [pendingWild, setPendingWild] = useState<string | null>(null)
  const begin = () => { const hands:Record<string,UnoCard[]>={};let cursor=0;members.forEach(member=>{hands[member.id]=deck.slice(cursor,cursor+7);cursor+=7});const pile=deck[cursor];syncState({hands,pile,activeColor:pile.color,turn:members[0]?.id??playerId,direction:1,drawIndex:cursor+1}) }
  const nextId=(turn:string,direction:1|-1,steps=1)=>members[(members.findIndex(member=>member.id===turn)+direction*steps+members.length*4)%members.length]?.id??playerId
  const playable=(card:UnoCard)=>!state||card.color==='wild'||card.color===state.activeColor||card.value===state.pile.value
  const play=(card:UnoCard,wildColor:UnoCard['color']='red')=>{if(!state||paused||state.turn!==playerId||!playable(card)||state.winner)return;let hands={...state.hands,[playerId]:state.hands[playerId].filter(item=>item.id!==card.id)};const direction=card.value==='reverse'?(state.direction*-1) as 1|-1:state.direction;const target=nextId(state.turn,direction);const drawCount=card.value==='+2'?2:card.value==='+4'?4:0;let drawIndex=state.drawIndex;if(drawCount){hands={...hands,[target]:[...(hands[target]??[]),...Array.from({length:drawCount},(_,index)=>deck[(drawIndex+index)%deck.length])]};drawIndex+=drawCount}const steps=card.value==='skip'||drawCount?2:1;setPendingWild(null);syncState({...state,hands,pile:card,activeColor:card.color==='wild'?wildColor:card.color,direction,drawIndex,turn:nextId(state.turn,direction,steps),winner:hands[playerId].length===0?playerId:undefined})}
  const draw=()=>{if(!state||paused||state.turn!==playerId||state.winner)return;const card=deck[state.drawIndex%deck.length];const hands={...state.hands,[playerId]:[...state.hands[playerId],card]};syncState({...state,hands,drawIndex:state.drawIndex+1,turn:nextId(state.turn,state.direction)})}
  const cardLabel=(card:UnoCard)=>card.value
  if(!state)return <div className="board-game uno-game"><div className="game-top"><div><span className="tag">CARD / UNO STYLE</span><h1>UNO風カードゲーム</h1></div></div><section className="round-card"><h2>みんなの手札を配ります</h2><p>色か数字を合わせて手札を先に出し切りましょう。</p><button className="primary" disabled={paused||members.length<2} onClick={begin}>ゲームを開始</button></section></div>
  const hand=state.hands[playerId]??[];const winner=state.winner?members.find(member=>member.id===state.winner):null
  return <div className="board-game uno-game"><div className="game-top"><div><span className="tag">CARD / UNO STYLE</span><h1>UNO風カードゲーム</h1></div><div className="turn-pill">{winner?`${winner.name} の勝ち`:`${members.find(member=>member.id===state.turn)?.name??'あなた'} の番`}</div></div><div className="uno-players">{members.map(member=><span key={member.id} className={member.id===state.turn?'active':''}>{member.name} <b>{state.hands[member.id]?.length??0}</b>枚</span>)}</div><section className="uno-table"><button className="uno-deck" disabled={paused||state.turn!==playerId||Boolean(winner)} onClick={draw}>DRAW</button><div className={`uno-card ${state.pile.color}`}><b>{cardLabel(state.pile)}</b><small>{state.activeColor}</small></div></section><p className="game-hint">場札と同じ色、または同じ数字・記号のカードを出せます。ワイルドでは出す色を選びます。</p>{pendingWild&&<div className="go-actions">{(['red','blue','yellow','green'] as const).map(color=><button key={color} className="secondary" onClick={()=>{const card=hand.find(item=>item.id===pendingWild);if(card)play(card,color)}}>{color}</button>)}</div>}<div className="uno-hand">{hand.map(card=><button key={card.id} className={`uno-card ${card.color} ${playable(card)&&state.turn===playerId&&!winner?'playable':''}`} disabled={paused||state.turn!==playerId||!playable(card)||Boolean(winner)} onClick={()=>card.color==='wild'?setPendingWild(card.id):play(card)}><b>{cardLabel(card)}</b><small>{card.color==='wild'?'WILD':card.color}</small></button>)}</div>{winner&&<button className="primary center" onClick={begin}>もう一度遊ぶ</button>}</div>
}
type ChessPiece = `${'w' | 'b'}${'k' | 'q' | 'r' | 'b' | 'n' | 'p'}`
function GoGame({ paused, sharedState, syncState, members, playerId }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  type Stone = 'b' | 'w' | null
  const size = 9
  const blank = () => Array.from({ length: size }, () => Array<Stone>(size).fill(null))
  const [board, setBoard] = useState<Stone[][]>(blank)
  const [turn, setTurn] = useState<'b' | 'w'>('b')
  const [captures, setCaptures] = useState({ b: 0, w: 0 })
  const [passes, setPasses] = useState(0)
  const [winner, setWinner] = useState<'b' | 'w' | null>(null)
  const [previousBoard, setPreviousBoard] = useState<Stone[][] | null>(null)
  const [finalScore, setFinalScore] = useState<{ b:number; w:number; territory:{b:number;w:number} } | null>(null)
  const [ruleNotice, setRuleNotice] = useState('')
  useEffect(() => { const state = sharedState as { board?: Stone[][]; turn?: 'b'|'w'; captures?: {b:number;w:number}; passes?: number; winner?: 'b'|'w'|null; previousBoard?: Stone[][] | null; finalScore?: { b:number;w:number;territory:{b:number;w:number} } | null } | undefined; if (state?.board?.length === size && state.turn) { setBoard(state.board);setTurn(state.turn);setCaptures(state.captures ?? {b:0,w:0});setPasses(state.passes ?? 0);setWinner(state.winner ?? null);setPreviousBoard(state.previousBoard?.length===size?state.previousBoard:null);setFinalScore(state.finalScore??null);setRuleNotice('') } }, [sharedState])
  const neighbors = (row: number, col: number) => [[row-1,col],[row+1,col],[row,col-1],[row,col+1]].filter(([y,x])=>y>=0&&y<size&&x>=0&&x<size)
  const group = (next: Stone[][], row: number, col: number) => { const color=next[row][col]; const seen=new Set<string>();const liberties=new Set<string>();const cells:[number,number][]=[];const visit=(y:number,x:number)=>{const key=`${y},${x}`;if(seen.has(key))return;seen.add(key);cells.push([y,x]);neighbors(y,x).forEach(([ny,nx])=>{if(next[ny][nx]===color)visit(ny,nx);else if(!next[ny][nx])liberties.add(`${ny},${nx}`)})};if(color)visit(row,col);return {cells, liberties} }
  const place = (row: number, col: number) => {
    if (paused || winner || finalScore || turn !== (members[0]?.id === playerId ? 'b' : 'w') || board[row][col]) return
    const next=board.map(line=>[...line]);next[row][col]=turn;const other=turn==='b'?'w':'b';let taken=0
    neighbors(row,col).forEach(([y,x])=>{if(next[y][x]===other){const target=group(next,y,x);if(target.liberties.size===0){target.cells.forEach(([gy,gx])=>next[gy][gx]=null);taken+=target.cells.length}}})
    if (group(next,row,col).liberties.size===0) return
    if (previousBoard && JSON.stringify(next) === JSON.stringify(previousBoard)) { setRuleNotice('コウのため、直前と同じ盤面には戻せません。別の手を打つかパスしてください。'); return }
    const nextCaptures={...captures,[turn]:captures[turn]+taken};const nextTurn=other;setBoard(next);setTurn(nextTurn);setCaptures(nextCaptures);setPasses(0);setPreviousBoard(board);setFinalScore(null);setRuleNotice('');syncState({board:next,turn:nextTurn,captures:nextCaptures,passes:0,winner:null,previousBoard:board,finalScore:null})
  }
  const playerIndex=members.findIndex(member=>member.id===playerId); const myColor=playerIndex===0?'b':playerIndex===1?'w':null; const host=members[0]?.id===playerId
  const territory=()=>{const seen=new Set<string>();const total={b:0,w:0};board.forEach((line,row)=>line.forEach((stone,col)=>{const key=`${row}:${col}`;if(stone||seen.has(key))return;const cells:[number,number][]=[];const borders=new Set<'b'|'w'>();const visit=(y:number,x:number)=>{const id=`${y}:${x}`;if(seen.has(id))return;seen.add(id);cells.push([y,x]);neighbors(y,x).forEach(([ny,nx])=>{const next=board[ny][nx];if(next)borders.add(next);else visit(ny,nx)})};visit(row,col);if(borders.size===1){const color=[...borders][0];total[color]+=cells.length}}));return total}
  const pass = () => { if(paused||winner||finalScore)return;if(turn!==myColor)return;const nextPasses=passes+1;const land=nextPasses>=2?territory():null;const score=land?{b:captures.b+land.b,w:captures.w+land.w,territory:land}:null;const won=score?(score.b===score.w?null:score.b>score.w?'b':'w'):null;const nextTurn=turn==='b'?'w':'b';setTurn(nextTurn);setPasses(nextPasses);setWinner(won);setPreviousBoard(null);setFinalScore(score);setRuleNotice('');syncState({board,turn:nextTurn,captures,passes:nextPasses,winner:won,previousBoard:null,finalScore:score}) }
  const reset=()=>{if(!host)return;const next=blank();setBoard(next);setTurn('b');setCaptures({b:0,w:0});setPasses(0);setWinner(null);setPreviousBoard(null);setFinalScore(null);setRuleNotice('');syncState({board:next,turn:'b',captures:{b:0,w:0},passes:0,winner:null,previousBoard:null,finalScore:null})}
  return <div className="board-game go-game"><div className="game-top"><div><span className="tag">BOARD / GO</span><h1>囲碁</h1></div><div className="turn-pill">{finalScore?(winner?`${winner==='b'?'黒':'白'}の勝ち`:'同点'):`${turn===myColor?'あなた':'相手'}の番`}</div></div><div className="go-score"><span><i className="stone b"/>黒: {finalScore?`${finalScore.b} 点（地 ${finalScore.territory.b}・アゲハマ ${captures.b}）`:`${captures.b} 石を取る`}</span><span><i className="stone w"/>白: {finalScore?`${finalScore.w} 点（地 ${finalScore.territory.w}・アゲハマ ${captures.w}）`:`${captures.w} 石を取る`}</span></div>{ruleNotice&&<p className="setting-status" role="alert">{ruleNotice}</p>}<div className="go-board">{board.map((line,row)=>line.map((stone,col)=><button key={`${row}-${col}`} disabled={paused||Boolean(finalScore)||turn!==myColor} onClick={()=>place(row,col)} aria-label={`${row+1}行${col+1}列`}><span>{stone&&<i className={`stone ${stone}`}/>}</span></button>))}</div><div className="go-actions"><button className="secondary" disabled={paused||Boolean(finalScore)||turn!==myColor} onClick={pass}>パスする {passes ? `(${passes}/2)` : ''}</button>{finalScore&&<button className="primary" disabled={!host} onClick={reset}>新しい対局</button>}</div></div>
}
function ChessGame({ paused, sharedState, syncState, members, playerId }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  type EnPassant = { row:number; col:number; pawnRow:number; pawnCol:number; capturableBy:'w'|'b' } | null
  type State = { board?: (ChessPiece | null)[][]; turn?: 'w'|'b'; winner?: 'w'|'b'|null; draw?: boolean; moved?: Record<string,boolean>; enPassant?: EnPassant }
  const initial = (): (ChessPiece | null)[][] => [
    ['br','bn','bb','bq','bk','bb','bn','br'], Array(8).fill('bp'), ...Array.from({length:4},()=>Array(8).fill(null)), Array(8).fill('wp'), ['wr','wn','wb','wq','wk','wb','wn','wr'],
  ] as (ChessPiece | null)[][]
  const [board, setBoard] = useState<(ChessPiece | null)[][]>(initial)
  const [turn, setTurn] = useState<'w' | 'b'>('w')
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [winner, setWinner] = useState<'w' | 'b' | null>(null)
  const [draw, setDraw] = useState(false)
  const [moved, setMoved] = useState<Record<string,boolean>>({})
  const [enPassant, setEnPassant] = useState<EnPassant>(null)
  useEffect(() => { const state = sharedState as State | undefined; if (state?.board?.length === 8 && state.turn) { setBoard(state.board); setTurn(state.turn); setWinner(state.winner ?? null); setDraw(Boolean(state.draw)); setMoved(state.moved ?? {}); setEnPassant(state.enPassant ?? null); setSelected(null) } }, [sharedState])
  const valid = (from: [number,number], to: [number,number], piece: ChessPiece | null | undefined = board[from[0]][from[1]], source=board) => {
    if (!piece || from[0] === to[0] && from[1] === to[1]) return false
    const target = source[to[0]][to[1]]
    if (target?.[0] === piece[0]) return false
    const dy = to[0]-from[0], dx = to[1]-from[1], ay=Math.abs(dy), ax=Math.abs(dx); const kind=piece[1]
    const clear = () => { const sy=Math.sign(dy), sx=Math.sign(dx); for(let y=from[0]+sy,x=from[1]+sx;y!==to[0]||x!==to[1];y+=sy,x+=sx) if(source[y][x]) return false; return true }
    if (kind==='p') { const direction=piece[0]==='w'?-1:1, start=piece[0]==='w'?6:1; return dx===0 && !target && (dy===direction || dy===2*direction && from[0]===start && !source[from[0]+direction][from[1]]) || ay===1 && dx!==0 && dy===direction && Boolean(target) }
    if (kind==='n') return ay*ax===2
    if (kind==='k') return ay<=1&&ax<=1
    if (kind==='r') return (dy===0||dx===0)&&clear()
    if (kind==='b') return ay===ax&&clear()
    return (dy===0||dx===0||ay===ax)&&clear()
  }
  const inCheck=(source:(ChessPiece|null)[][],color:'w'|'b')=>{let king:[number,number]|null=null;source.forEach((line,row)=>line.forEach((piece,col)=>{if(piece===`${color}k`)king=[row,col]}));return !king||source.some((line,row)=>line.some((piece,col)=>Boolean(piece&&piece[0]!==color&&valid([row,col],king!,piece,source))))}
  const castle=(from:[number,number],to:[number,number],piece:ChessPiece|null|undefined,source:(ChessPiece|null)[][],movedState:Record<string,boolean>)=>{if(!piece||piece[1]!=='k'||from[0]!==to[0]||Math.abs(to[1]-from[1])!==2||movedState[`${piece[0]}k`]||inCheck(source,piece[0] as 'w'|'b'))return false;const rookCol=to[1]>from[1]?7:0,step=to[1]>from[1]?1:-1,rook=source[from[0]][rookCol];if(rook!==`${piece[0]}r`||movedState[`${piece[0]}r${rookCol}`])return false;for(let col=from[1]+step;col!==rookCol;col+=step)if(source[from[0]][col])return false;for(const col of [from[1]+step,to[1]]){const stage=source.map(line=>[...line]);stage[from[0]][from[1]]=null;stage[from[0]][col]=piece;if(inCheck(stage,piece[0] as 'w'|'b'))return false}return true}
  const isEnPassant=(from:[number,number],to:[number,number],piece:ChessPiece|null|undefined,ep:EnPassant,source=board)=>Boolean(piece?.[1]==='p'&&ep&&ep.capturableBy===piece[0]&&to[0]===ep.row&&to[1]===ep.col&&from[1]!==to[1]&&!source[to[0]][to[1]])
  const apply=(source:(ChessPiece|null)[][],from:[number,number],to:[number,number],piece:ChessPiece,ep:EnPassant,isCastle:boolean,isEp:boolean)=>{const next=source.map(line=>[...line]);next[from[0]][from[1]]=null;if(isEp&&ep)next[ep.pawnRow][ep.pawnCol]=null;next[to[0]][to[1]]=piece[1]==='p'&&(to[0]===0||to[0]===7)?`${piece[0]}q` as ChessPiece:piece;if(isCastle){const rookFrom=to[1]>from[1]?7:0,rookTo=to[1]>from[1]?5:3;next[from[0]][rookTo]=next[from[0]][rookFrom];next[from[0]][rookFrom]=null}return next}
  const legal=(from:[number,number],to:[number,number],piece:ChessPiece|null|undefined,source:(ChessPiece|null)[][],movedState:Record<string,boolean>,ep:EnPassant)=>{if(!piece)return false;const castling=castle(from,to,piece,source,movedState);const passant=isEnPassant(from,to,piece,ep,source);if(!castling&&!passant&&!valid(from,to,piece,source))return false;return !inCheck(apply(source,from,to,piece,ep,castling,passant),piece[0] as 'w'|'b')}
  const hasLegalMove=(source:(ChessPiece|null)[][],color:'w'|'b',movedState:Record<string,boolean>,ep:EnPassant)=>source.some((line,row)=>line.some((piece,col)=>piece?.[0]===color&&source.some((targetLine,targetRow)=>targetLine.some((_,targetCol)=>legal([row,col],[targetRow,targetCol],piece,source,movedState,ep)))))
  const playerIndex=members.findIndex(member=>member.id===playerId);const myColor=playerIndex===0?'w':playerIndex===1?'b':null;const host=members[0]?.id===playerId
  const move = (row: number, col: number) => {
    if (paused || winner || draw || turn!==myColor) return
    const piece = board[row][col]
    if (!selected) { if (piece?.[0] === turn) setSelected([row,col]); return }
    if (selected[0] === row && selected[1] === col) return setSelected(null)
    const moving = board[selected[0]][selected[1]]
    if (piece?.[0] === turn) return setSelected([row,col])
    if (!legal(selected,[row,col],moving,board,moved,enPassant)) return
    const castling=castle(selected,[row,col],moving,board,moved);const passant=isEnPassant(selected,[row,col],moving,enPassant);const next=apply(board,selected,[row,col],moving!,enPassant,castling,passant);const nextMoved={...moved};if(moving==='wk'||moving==='bk')nextMoved[`${moving[0]}k`]=true;if(moving?.[1]==='r'&&selected[1]===0)nextMoved[`${moving[0]}r0`]=true;if(moving?.[1]==='r'&&selected[1]===7)nextMoved[`${moving[0]}r7`]=true;const nextEp=moving?.[1]==='p'&&Math.abs(row-selected[0])===2?{row:(row+selected[0])/2,col:row===selected[0]?col:selected[1],pawnRow:row,pawnCol:col,capturableBy:moving[0]==='w'?'b' as const:'w' as const}:null;const nextTurn=turn==='w'?'b':'w';const checked=inCheck(next,nextTurn);const noMoves=!hasLegalMove(next,nextTurn,nextMoved,nextEp);const won=checked&&noMoves?turn:null;const drawn=!checked&&noMoves;setBoard(next);setTurn(nextTurn);setWinner(won);setDraw(drawn);setMoved(nextMoved);setEnPassant(nextEp);setSelected(null);syncState({board:next,turn:nextTurn,winner:won,draw:drawn,moved:nextMoved,enPassant:nextEp})
  }
  const glyph: Record<ChessPiece,string> = {wk:'♔',wq:'♕',wr:'♖',wb:'♗',wn:'♘',wp:'♙',bk:'♚',bq:'♛',br:'♜',bb:'♝',bn:'♞',bp:'♟'}
  const reset = () => { if(!host)return; const next=initial();setBoard(next);setTurn('w');setWinner(null);setDraw(false);setMoved({});setEnPassant(null);setSelected(null);syncState({board:next,turn:'w',winner:null,draw:false,moved:{},enPassant:null}) }
  return <div className="board-game chess-game"><div className="game-top"><div><span className="tag">BOARD / CHESS</span><h1>チェス</h1></div><div className="turn-pill">{winner ? `${winner==='w'?'白':'黒'}のチェックメイト` : draw?'ステイルメイトで引き分け':inCheck(board,turn)?`${turn===myColor?'あなた':'相手'}は王手です`:`${turn===myColor?'あなた':'相手'}の番`}</div></div><p className="game-hint">ポーンは最終列でクイーンへ昇格します。王手を放置する手、王手を通過するキャスリングはできません。</p><div className="chess-board">{board.map((line,row)=>line.map((piece,col)=>{const active=selected?.[0]===row&&selected?.[1]===col;const destination=selected&&legal(selected,[row,col],board[selected[0]][selected[1]],board,moved,enPassant);return <button key={`${row}-${col}`} disabled={paused||Boolean(winner)||draw||turn!==myColor} onClick={()=>move(row,col)} className={`${(row+col)%2?'dark':'light'} ${active?'active':''} ${destination?'move-target':''}`} aria-label={`${row+1}行${col+1}列`}>{piece&&<span className={piece[0]==='w'?'white-piece':'black-piece'}>{glyph[piece]}</span>}</button>}))}</div>{(winner||draw)&&<button className="secondary center" disabled={!host} onClick={reset}>{host?'新しい対局':'ホストが再戦を開始します'}</button>}</div>
}

function TagGame({ paused, sharedState, moveTag, rematch, setMode, onFinished, playerId, members }: { paused: boolean; sharedState: unknown; moveTag: (position: { x: number; y: number }) => void; rematch: () => void; setMode: (mode: 'gems'|'escape'|'classic'|'infection'|'transform'|'team') => void; onFinished: (result: 'win' | 'loss') => void; playerId: string; members: RoomMember[] }) {
  const gems=[{x:3,y:1},{x:8,y:2},{x:6,y:6},{x:10,y:4}]
  const keys=[{x:1,y:1},{x:10,y:6}];const exit={x:11,y:1};const warps=[{x:0,y:7},{x:11,y:7}]
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [collected, setCollected] = useState<number[]>([])
  const [keysCollected, setKeysCollected] = useState<number[]>([])
  const [mode,setModeState]=useState<'gems'|'escape'|'classic'|'infection'|'transform'|'team'>('gems');const [remainingMoves,setRemainingMoves]=useState(120);const [infected,setInfected]=useState<string[]>([]);const [transformed,setTransformed]=useState<string[]>([]);const [teamHunters,setTeamHunters]=useState<string[]>([])
  const [hunterId, setHunterId] = useState<string | null>(null)
  const [winner, setWinner] = useState<string | null>(null)
  const recorded = useRef(false)
  useEffect(() => { const state = sharedState as { positions?: Record<string, { x: number; y: number }>; collected?: number[]; keys?: number[]; infected?: string[]; transformed?: string[]; teamHunters?: string[]; mode?: 'gems'|'escape'|'classic'|'infection'|'transform'|'team'; remainingMoves?: number; hunterId?: string | null; winner?: string | null } | undefined; if (state?.positions) setPositions(state.positions); if (state?.collected) setCollected(state.collected); if (state?.keys) setKeysCollected(state.keys); if (state?.infected) setInfected(state.infected); if (state?.transformed) setTransformed(state.transformed); if (state?.teamHunters) setTeamHunters(state.teamHunters); if (state?.mode) setModeState(state.mode); if (typeof state?.remainingMoves==='number') setRemainingMoves(state.remainingMoves); if (state?.hunterId !== undefined) setHunterId(state.hunterId); if (state?.winner !== undefined) setWinner(state.winner) }, [sharedState])
  const pos = positions[playerId] ?? { x: 1, y: 5 }
  useEffect(() => {
    const move = (e: KeyboardEvent) => {
      if (paused || winner) return
      const k = e.key.toLowerCase()
      const dx = k === 'arrowright' || k === 'd' ? 1 : k === 'arrowleft' || k === 'a' ? -1 : 0
      const dy = k === 'arrowdown' || k === 's' ? 1 : k === 'arrowup' || k === 'w' ? -1 : 0
      if (dx || dy) {
        e.preventDefault()
        const next = { x: Math.max(0, Math.min(11, pos.x + dx)), y: Math.max(0, Math.min(7, pos.y + dy)) }
        moveTag(next)
      }
    }
    window.addEventListener('keydown', move)
    return () => window.removeEventListener('keydown', move)
  }, [paused, pos, winner, moveTag])
  const hunterName = members.find(member => member.id === hunterId)?.name ?? '鬼'
  const host=members[0]?.id===playerId;const modeLabel={gems:'宝石回収',escape:'鍵で脱出',classic:'クラシック',infection:'感染鬼',transform:'変身鬼',team:'チーム鬼'}[mode];const taggerNames=(mode==='infection'?infected:mode==='team'?teamHunters:[hunterId]).map(id=>members.find(member=>member.id===id)?.name).filter(Boolean).join('・')||hunterName
  const winnerText = winner === 'runners' ? '逃げる側の勝ちです' : winner === 'infected' ? '感染鬼側の勝ちです' : winner ? `${members.find(member => member.id === winner)?.name ?? '鬼'} の勝ちです` : null
  useEffect(() => { if (!winner) { recorded.current = false; return } if (!recorded.current) { recorded.current = true; onFinished(winner === 'runners' || winner === playerId ? 'win' : 'loss') } }, [winner, playerId, onFinished])
  return <div className="board-game tag-game"><div className="game-top"><div><span className="tag">ACTION / {modeLabel.toUpperCase()}</span><h1>オンライン鬼ごっこ</h1></div><div className="turn-pill">鬼: <b>{taggerNames}</b>{(mode==='gems'||mode==='transform')&&<span className="gem-count"><FaGem /> {collected.length} / {gems.length}</span>}{mode==='escape'&&<span className="gem-count"><FaKey /> {keysCollected.length} / {keys.length}</span>}{(mode==='classic'||mode==='infection'||mode==='transform'||mode==='team')&&<span>残り {remainingMoves} 手</span>}</div></div>{host&&<div className="go-actions">{(['gems','escape','classic','infection','transform','team']as const).map(item=><button key={item} className={`secondary ${mode===item?'selected':''}`} disabled={paused||Boolean(winner)} onClick={()=>setMode(item)}>{({gems:'宝石回収',escape:'鍵で脱出',classic:'クラシック',infection:'感染鬼',transform:'変身鬼',team:'チーム鬼'}[item])}</button>)}</div>}<p className="game-hint">{mode==='gems'?'宝石を全て回収すると逃げる側の勝ちです。':mode==='escape'?'鍵を集め、出口へ到達すると逃げる側の勝ちです。':mode==='classic'?'鬼が全員を捕まえる前に、逃げる側は残り手数を耐えよう。':mode==='infection'?'感染鬼に捕まると鬼側へ加わります。残り手数まで逃げ切ろう。':mode==='transform'?'宝石を取ると変身し、変身中に鬼へ触れると逃げる側の勝ちです。':'3人以上では鬼が2人になります。鬼が全員を捕まえる前に残り手数を耐えよう。'} WASD または矢印キーで移動。ワープ床で反対側へ移動できます。</p>{winnerText && <div className="tag-result">{winnerText}<button className="secondary" onClick={rematch}>再戦する</button></div>}<div className="tag-map">{Array.from({length:96},(_,i)=>{const x=i%12,y=Math.floor(i/12);const self=pos.x===x&&pos.y===y;const other=Object.entries(positions).find(([id, point])=>id!==playerId&&point.x===x&&point.y===y);const gemIndex=gems.findIndex(gem=>gem.x===x&&gem.y===y);const keyIndex=keys.findIndex(key=>key.x===x&&key.y===y);const gem=(mode==='gems'||mode==='transform')&&gemIndex>=0&&!collected.includes(gemIndex);const key=mode==='escape'&&keyIndex>=0&&!keysCollected.includes(keyIndex);const wall=(x===4&&y>1&&y<6)||(y===3&&x>6&&x<10);const warp=warps.some(point=>point.x===x&&point.y===y);const isExit=mode==='escape'&&exit.x===x&&exit.y===y;const otherState=infected.includes(other?.[0]??'')?'（感染鬼）':transformed.includes(other?.[0]??'')?'（変身中）':teamHunters.includes(other?.[0]??'')?'（鬼チーム）':'';return <span key={i} className={wall?'wall':''}>{self?<FaPersonRunning />:other?<span className="remote-player" title={`${members.find(member=>member.id===other[0])?.name??'参加者'}${otherState}`}><FaUserSecret /></span>:gem?<FaGem />:key?<FaKey />:isExit?<FaDoorOpen />:warp?<FaMoon />:null}</span>})}</div></div>
}

function EscapeRoomGame({ paused, sharedState, syncState, members, playerId }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  type State={steps?:string[];attempts?:number;solved?:boolean}
  const state=(sharedState as State|undefined)??{};const sequence=['月','鍵','星'];const clues=['壁の走り書き: 最初に月の印を押せ。','机のメモ: 鍵穴は月のあとに反応する。','窓の暗号: 星は出口を開く最後の合図。'];const clue=clues[Math.max(0,members.findIndex(member=>member.id===playerId))%clues.length];const steps=state.steps??[]
  const press=(symbol:string)=>{if(paused||state.solved)return;const next=[...steps,symbol];const correct=sequence.slice(0,next.length).every((item,index)=>item===next[index]);if(!correct)return syncState({steps:[],attempts:(state.attempts??0)+1,solved:false});syncState({steps:next,attempts:state.attempts??0,solved:next.length===sequence.length})}
  const reset=()=>syncState({steps:[],attempts:0,solved:false})
  return <div className="board-game escape-game"><div className="game-top"><div><span className="tag">CO-OP / ASYMMETRIC</span><h1>片方だけ見える脱出室</h1></div><div className="turn-pill">失敗 {state.attempts??0} 回</div></div><section className="secret-card"><p className="eyebrow">ONLY YOU CAN SEE THIS</p><h2>{clue}</h2><small>ヒントを仲間へ伝え、順番を相談してください。</small></section><section className="escape-panel panel"><p className="eyebrow">SHARED LOCK</p><h2>{state.solved?'扉が開きました':'3つの印を正しい順に押す'}</h2><div className="escape-progress">{sequence.map((_,index)=><span key={index}>{steps[index]??'?'}</span>)}</div><div className="escape-buttons">{sequence.map(symbol=><button key={symbol} disabled={paused||Boolean(state.solved)} onClick={()=>press(symbol)}>{symbol}</button>)}</div>{state.solved&&<button className="primary" onClick={reset}>新しい暗号に挑戦</button>}</section></div>
}
function FutureGame({ paused, sharedState, syncState, members, playerId }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  type State={round?:number;score?:number;choice?:string;resolved?:boolean;failed?:boolean}
  const events=[{name:'停電',answer:'予備電源'},{name:'浸水',answer:'水門'},{name:'通信障害',answer:'中継器'}];const state=(sharedState as State|undefined)??{};const round=state.round??0;const event=events[round%events.length];const future=members[Math.max(0,round%Math.max(members.length,1))]?.id===playerId
  const choose=(choice:string)=>{if(paused||state.resolved)return;const success=choice===event.answer;syncState({round,score:(state.score??0)+(success?1:0),choice,resolved:true,failed:!success})}
  const next=()=>syncState({round:round+1,score:state.score??0,choice:undefined,resolved:false,failed:false})
  return <div className="board-game future-game"><div className="game-top"><div><span className="tag">CO-OP / ASYMMETRIC</span><h1>1人だけ未来を知っている</h1></div><div className="turn-pill">防げた災害 {state.score??0}</div></div><section className="future-secret"><p className="eyebrow">FUTURE VISION</p><h2>{future?`次に起きること: ${event.name}`:'未来担当の話を聞いて、対策を選ぼう'}</h2><small>{future?'直接答えを言わず、仲間が判断できるように伝えよう。':'未来担当はあなたではありません。会話から正しい対策を推理してください。'}</small></section><section className="future-panel panel"><h2>{state.resolved?(state.failed?'災害を防げなかった':'災害を防いだ'):'対策を選ぶ'}</h2>{!state.resolved?<div>{['予備電源','水門','中継器'].map(choice=><button key={choice} disabled={paused} onClick={()=>choose(choice)}>{choice}</button>)}</div>:<><p>選択: {state.choice}</p><button className="primary" disabled={paused} onClick={next}>次の未来へ</button></>}</section></div>
}
function NewsroomGame({ paused, sharedState, syncState }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void }) {
  type State={index?:number;score?:number;decision?:string};const cases=[{headline:'市内全域で明日から停電',truth:'保留',proof:'発信元が公式ではなく、日時も不明確'},{headline:'公園の水質検査を実施',truth:'掲載',proof:'自治体の公表資料と検査番号が一致'}];const state=(sharedState as State|undefined)??{};const item=cases[(state.index??0)%cases.length];const decide=(decision:string)=>{if(paused||state.decision)return;syncState({...state,decision,score:(state.score??0)+(decision===item.truth?1:0)})};const next=()=>syncState({index:(state.index??0)+1,score:state.score??0,decision:undefined});return <div className="board-game newsroom-game"><div className="game-top"><div><span className="tag">CO-OP / FACT CHECK</span><h1>偽ニュース編集部</h1></div><div className="turn-pill">正確な記事 {state.score??0}</div></div><section className="round-card"><p className="eyebrow">HEADLINE</p><h2>{item.headline}</h2><p>根拠: {item.proof}</p>{!state.decision?<div className="future-panel"><div><button disabled={paused} onClick={()=>decide('掲載')}>掲載する</button><button disabled={paused} onClick={()=>decide('保留')}>保留する</button></div></div>:<><p>{state.decision===item.truth?'正しい判断です':'追加確認が必要でした'}</p><button className="primary" disabled={paused} onClick={next}>次の記事</button></>}</section></div>
}
function AssociationGame({ paused, sharedState, syncState, members, playerId }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  type State={words?:{text:string;name:string}[];turn?:string;theme?:string;round?:number};const [word,setWord]=useState('');const state=(sharedState as State|undefined)??{};const themes=['夏','宇宙','学校','冒険'];const round=state.round??0;const words=state.words??[];const turn=state.turn??members[0]?.id??playerId;const theme=state.theme??themes[round%themes.length]
  const submit=(event:React.FormEvent)=>{event.preventDefault();const text=word.trim();if(paused||turn!==playerId||!text||words.some(item=>item.text===text))return;const next=[...words,{text,name:members.find(member=>member.id===playerId)?.name??'プレイヤー'}];const nextTurn=members[(members.findIndex(member=>member.id===turn)+1)%members.length]?.id??playerId;syncState({words:next,turn:nextTurn,theme,round});setWord('')}
  const reset=()=>syncState({words:[],turn:members[0]?.id??playerId,theme:themes[(round+1)%themes.length],round:round+1})
  return <div className="board-game association-game"><div className="game-top"><div><span className="tag">PARTY / ASSOCIATION</span><h1>連想ゲーム</h1></div><div className="turn-pill">{members.find(member=>member.id===turn)?.name??'あなた'} の番</div></div><section className="association-theme panel"><p className="eyebrow">THEME</p><h2>{theme}</h2><p>テーマから連想する言葉を、重複なしでつなげよう。</p><form onSubmit={submit}><input value={word} disabled={paused||turn!==playerId} onChange={event=>setWord(event.target.value)} placeholder="連想した言葉"/><button className="primary" disabled={paused||turn!==playerId}>つなぐ</button></form></section><section className="association-chain">{words.length?words.map((item,index)=><span key={`${item.text}-${index}`}><b>{item.text}</b><small>{item.name}</small></span>):<p>最初の言葉を待っています。</p>}</section><button className="secondary center" disabled={paused} onClick={reset}>新しいテーマ</button></div>
}
type Tile = { suit: 'm' | 'p' | 's' | 'z'; rank: number }
const tileLabel = (tile: Tile) => tile.suit === 'z' ? ['東', '南', '西', '北', '白', '發', '中'][tile.rank - 1] : `${tile.rank}${tile.suit === 'm' ? '萬' : tile.suit === 'p' ? '筒' : '索'}`
const tileKey = (tile: Tile) => `${tile.suit}${tile.rank}`
const buildWall = (): Tile[] => { const tiles=['m', 'p', 's'].flatMap(suit => Array.from({ length: 9 }, (_, rank) => Array.from({ length: 4 }, () => ({ suit: suit as Tile['suit'], rank: rank + 1 }))).flat()).concat(Array.from({ length: 7 }, (_, rank) => Array.from({ length: 4 }, () => ({ suit: 'z' as const, rank: rank + 1 }))).flat()); for(let index=tiles.length-1;index>0;index--){const swap=Math.floor(Math.random()*(index+1));[tiles[index],tiles[swap]]=[tiles[swap],tiles[index]]}return tiles }
const winningHand = (hand: Tile[], melds = 0) => {
  if (hand.length !== 14 - melds * 3) return false
  const counts = new Map<string, number>(); hand.forEach(tile => counts.set(tileKey(tile), (counts.get(tileKey(tile)) ?? 0) + 1))
  const terminals=['m','p','s'].flatMap(suit=>[`${suit}1`,`${suit}9`]).concat(['z1','z2','z3','z4','z5','z6','z7'])
  if (melds === 0 && terminals.every(key => (counts.get(key) ?? 0) >= 1) && [...counts.values()].reduce((sum,count)=>sum+count,0)===14) return true
  if (melds === 0 && counts.size === 7 && [...counts.values()].every(count => count === 2)) return true
  const take = (key: string, amount: number) => { const count = counts.get(key) ?? 0; if (count < amount) return false; counts.set(key, count - amount); return true }
  const put = (key: string, amount: number) => counts.set(key, (counts.get(key) ?? 0) + amount)
  const groups = (left: number): boolean => {
    if (!left) return true
    const key = [...counts.keys()].find(item => (counts.get(item) ?? 0) > 0); if (!key) return true
    const suit = key[0] as Tile['suit'], rank = Number(key.slice(1))
    if (take(key, 3)) { const win = groups(left - 3); put(key, 3); if (win) return true }
    const sequence = [key, `${suit}${rank + 1}`, `${suit}${rank + 2}`]
    if (suit !== 'z' && sequence.every(item => (counts.get(item) ?? 0) > 0)) { sequence.forEach(item => take(item, 1)); const win = groups(left - 3); sequence.forEach(item => put(item, 1)); if (win) return true }
    return false
  }
  for (const key of counts.keys()) { if (!take(key, 2)) continue; const win = groups(12 - melds * 3); put(key, 2); if (win) return true }
  return false
}
function MahjongGame({ paused, sharedState, syncState, members, playerId }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  type State = { wall?: Tile[]; hands?: Record<string, Tile[]>; melds?: Record<string,Tile[][]>; turn?: string; discards?: Tile[]; winner?: string; winType?: 'tsumo'|'ron'; winInfo?: MahjongWinInfo; scores?: Record<string, number>; riichi?: Record<string,boolean>; lastDiscard?: { tile:Tile; owner:string }; calledMeld?: { kind:'pon'|'chi'|'kan'|'ankan'|'kakan' }; exhausted?: boolean; draw?: boolean; seatWinds?: Record<string,1|2|3|4>; roundWind?: 1|2|3|4; doraIndicators?: Tile[] }
  const state = (sharedState as State | undefined) ?? {}; const hands = state.hands ?? {}; const melds=state.melds??{};const myMelds=melds[playerId]??[];const concealed=13-myMelds.length*3;const active = state.turn ?? members[0]?.id; const mine = hands[playerId] ?? []
  const [declaringRiichi,setDeclaringRiichi]=useState(false)
  const host=members[0]?.id===playerId
  const tenpai=(hand:Tile[])=>{const choices:Tile[]=['m','p','s'].flatMap(suit=>Array.from({length:9},(_,rank)=>({suit:suit as Tile['suit'],rank:rank+1}))).concat(Array.from({length:7},(_,rank)=>({suit:'z' as const,rank:rank+1})));return choices.some(tile=>winningHand([...hand,tile],myMelds.length))}
  const winInfo=(hand:Tile[],type:'tsumo'|'ron',winningTile?:Tile)=>evaluateMahjongWin(hand,myMelds,{winType:type,riichi:state.riichi?.[playerId],winningTile,seatWind:state.seatWinds?.[playerId],roundWind:state.roundWind,doraIndicators:state.doraIndicators})
  const start = () => { if(!host)return;const wall = buildWall(); const nextHands = Object.fromEntries(members.map((member, index) => [member.id, wall.slice(index * 13, index * 13 + 13)])); const remaining=wall.slice(members.length * 13); const dora=remaining.at(-1); const seatWinds=Object.fromEntries(members.map((member,index)=>[member.id,((index%4)+1) as 1|2|3|4])); setDeclaringRiichi(false);syncState({ wall: dora?remaining.slice(0,-1):remaining, hands: nextHands, melds:{}, turn: members[0]?.id, discards: [], scores:Object.fromEntries(members.map(member=>[member.id,25000])), riichi: {}, lastDiscard: undefined, draw: false, seatWinds, roundWind: 1, doraIndicators:dora?[dora]:[] }) }
  const discard = (index: number) => { if (paused || active !== playerId || state.winner || state.draw || !state.wall?.length) return; const hand = mine.length === concealed ? [...mine, state.wall[0]] : mine; const discarded = hand[index]; if (!discarded) return; const nextHand=hand.filter((_, tileIndex) => tileIndex !== index); if(declaringRiichi&&!tenpai(nextHand))return;const nextHands = { ...hands, [playerId]: nextHand }; const nextTurn = members[(members.findIndex(member => member.id === playerId) + 1) % members.length]?.id ?? playerId; const remaining=mine.length===concealed?state.wall.slice(1):state.wall; setDeclaringRiichi(false);syncState({ ...state, wall: remaining, hands: nextHands, discards: [...(state.discards ?? []), discarded], turn: nextTurn, riichi: declaringRiichi?{...(state.riichi??{}),[playerId]:true}:state.riichi, lastDiscard:{tile:discarded,owner:playerId}, exhausted:remaining.length===0 }) }
  const settledScores = (info: MahjongWinInfo, type: 'tsumo' | 'ron', loserId?: string) => {
    const scores = { ...Object.fromEntries(members.map(member => [member.id, 25000])), ...(state.scores ?? {}) }
    const winnerIsDealer = state.seatWinds?.[playerId] === 1
    if (type === 'ron' && loserId) { const payment = winnerIsDealer ? info.payments.ron.dealer : info.payments.ron.nonDealer; scores[playerId] += payment; scores[loserId] = (scores[loserId] ?? 25000) - payment; return scores }
    for (const member of members) { if (member.id === playerId) continue; const payment = state.seatWinds?.[member.id] === 1 ? info.payments.tsumo.dealerPays : info.payments.tsumo.nonDealerPays; scores[playerId] += payment; scores[member.id] = (scores[member.id] ?? 25000) - payment }
    return scores
  }
  const tsumo=()=>{const drawn=mine.length===concealed?state.wall?.[0]:undefined;const hand=drawn?[...mine,drawn]:mine;const info=winInfo(hand,'tsumo',drawn);if(paused||active!==playerId||!info)return;syncState({...state,winner:playerId,winType:'tsumo',winInfo:info,scores:settledScores(info,'tsumo'),lastDiscard:undefined})}
  const ron=()=>{const info=state.lastDiscard?winInfo([...mine,state.lastDiscard.tile],'ron',state.lastDiscard.tile):null;if(paused||state.winner||state.draw||!state.lastDiscard||state.lastDiscard.owner===playerId||!info)return;syncState({...state,winner:playerId,winType:'ron',winInfo:info,scores:settledScores(info,'ron',state.lastDiscard.owner)})}
  const pon=()=>{const tile=state.lastDiscard?.tile;if(paused||state.winner||state.draw||!tile||state.lastDiscard?.owner===playerId||(mine.filter(item=>tileKey(item)===tileKey(tile)).length<2))return;let used=0;const nextHand=mine.filter(item=>{if(tileKey(item)===tileKey(tile)&&used<2){used++;return false}return true});syncState({...state,hands:{...hands,[playerId]:nextHand},melds:{...melds,[playerId]:[...myMelds,[tile,tile,tile]]},turn:playerId,lastDiscard:undefined,calledMeld:{kind:'pon'},exhausted:false})}
  const kan=()=>{const tile=state.lastDiscard?.tile;if(paused||state.winner||state.draw||!tile||state.lastDiscard?.owner===playerId||(mine.filter(item=>tileKey(item)===tileKey(tile)).length<3))return;let used=0;const nextHand=mine.filter(item=>{if(tileKey(item)===tileKey(tile)&&used<3){used++;return false}return true});syncState({...state,hands:{...hands,[playerId]:nextHand},melds:{...melds,[playerId]:[...myMelds,[tile,tile,tile,tile]]},turn:playerId,lastDiscard:undefined,calledMeld:{kind:'kan'},exhausted:false})}
  const chiOptions=(()=>{const tile=state.lastDiscard?.tile;if(!tile||tile.suit==='z')return [] as Tile[][];const ownerIndex=members.findIndex(member=>member.id===state.lastDiscard?.owner);if(active!==playerId||members[(ownerIndex+1)%members.length]?.id!==playerId)return [] as Tile[][];return [[tile.rank-2,tile.rank-1],[tile.rank-1,tile.rank+1],[tile.rank+1,tile.rank+2]].filter(ranks=>ranks.every(rank=>rank>=1&&rank<=9)).map(ranks=>ranks.map(rank=>mine.find(item=>item.suit===tile.suit&&item.rank===rank))).filter((items):items is Tile[]=>items.every(Boolean))})()
  const chi=(usedTiles:Tile[])=>{
    const tile=state.lastDiscard?.tile
    const isOption=chiOptions.some(option=>option.every((item,index)=>tileKey(item)===tileKey(usedTiles[index])))
    if(paused||state.winner||state.draw||!tile||!isOption)return
    const remaining=[...mine]
    for(const used of usedTiles){const index=remaining.findIndex(item=>tileKey(item)===tileKey(used));if(index<0)return;remaining.splice(index,1)}
    const meld=[...usedTiles,tile].sort((left,right)=>left.rank-right.rank)
    syncState({...state,hands:{...hands,[playerId]:remaining},melds:{...melds,[playerId]:[...myMelds,meld]},turn:playerId,lastDiscard:undefined,calledMeld:{kind:'chi'},exhausted:false})
  }
  const visibleHand = active === playerId && mine.length === concealed && state.wall?.[0] ? [...mine, state.wall[0]] : mine
  const closedKanOptions=active===playerId&&!state.winner&&!state.draw?[...new Set(visibleHand.map(tileKey))].filter(key=>visibleHand.filter(tile=>tileKey(tile)===key).length>=4):[]
  const closedKan=(key:string)=>{if(paused||active!==playerId||state.winner||state.draw||!closedKanOptions.includes(key))return;let used=0;const nextHand=visibleHand.filter(tile=>{if(tileKey(tile)===key&&used<4){used++;return false}return true});const meld=visibleHand.filter(tile=>tileKey(tile)===key).slice(0,4);const consumedDraw=mine.length===concealed&&Boolean(state.wall?.[0]);syncState({...state,wall:consumedDraw?state.wall?.slice(1):state.wall,hands:{...hands,[playerId]:nextHand},melds:{...melds,[playerId]:[...myMelds,meld]},turn:playerId,lastDiscard:undefined,calledMeld:{kind:'ankan'},exhausted:consumedDraw&&state.wall?.length===1})}
  const addedKanOptions=active===playerId&&!state.winner&&!state.draw?myMelds.filter(group=>group.length===3&&group.every(tile=>tileKey(tile)===tileKey(group[0]))).map(group=>tileKey(group[0])).filter(key=>visibleHand.some(tile=>tileKey(tile)===key)):[]
  const addedKan=(key:string)=>{if(paused||active!==playerId||state.winner||state.draw||!addedKanOptions.includes(key))return;let used=false;const nextHand=visibleHand.filter(tile=>{if(!used&&tileKey(tile)===key){used=true;return false}return true});const added=visibleHand.find(tile=>tileKey(tile)===key);if(!added)return;const consumedDraw=mine.length===concealed&&Boolean(state.wall?.[0]);const nextMelds=myMelds.map(group=>group.length===3&&group.every(tile=>tileKey(tile)===key)?[...group,added]:group);syncState({...state,wall:consumedDraw?state.wall?.slice(1):state.wall,hands:{...hands,[playerId]:nextHand},melds:{...melds,[playerId]:nextMelds},turn:playerId,lastDiscard:undefined,calledMeld:{kind:'kakan'},exhausted:consumedDraw&&state.wall?.length===1})}
  const draw=()=>{if(paused||active!==playerId||!state.exhausted||state.winner)return;syncState({...state,draw:true})}
  const canTsumo=active===playerId&&Boolean(winInfo(visibleHand,'tsumo',mine.length===concealed?state.wall?.[0]:undefined));const canRon=Boolean(state.lastDiscard&&state.lastDiscard.owner!==playerId&&winInfo([...mine,state.lastDiscard.tile],'ron',state.lastDiscard.tile));const canPon=Boolean(state.lastDiscard&&state.lastDiscard.owner!==playerId&&mine.filter(tile=>tileKey(tile)===tileKey(state.lastDiscard!.tile)).length>=2);const canKan=Boolean(state.lastDiscard&&state.lastDiscard.owner!==playerId&&mine.filter(tile=>tileKey(tile)===tileKey(state.lastDiscard!.tile)).length>=3);
  const seatName=['東','南','西','北'][(state.seatWinds?.[playerId]??1)-1]
  return <div className="board-game mahjong-game"><div className="game-top"><div><span className="tag">TABLE / RIICHI LITE</span><h1>麻雀</h1></div><div className="turn-pill">{state.winner ? `${members.find(m => m.id === state.winner)?.name} の${state.winType==='ron'?'ロン':'ツモ'}和了` : state.draw?'山切れで流局':state.exhausted?'最後の捨て牌を確認中':active ? `${members.find(m => m.id === active)?.name ?? 'プレイヤー'} の番` : '卓を開始'}</div></div>{!state.wall ? <section className="mahjong-start panel"><h2>4面子1雀頭を作ろう</h2><p>山から1枚引き、不要な牌を1枚捨てます。順子・刻子と雀頭で14枚をそろえると和了です。</p><button className="primary" disabled={paused||!host} onClick={start}>{host?'対局を開始':'ホストが対局を開始します'}</button></section> : <><section className="mahjong-table panel"><div><b>残り {state.wall.length} 枚</b><span>ドラ表示牌: {(state.doraIndicators??[]).map(tileLabel).join(' ')||'なし'}</span><span>{seatName}家 / {['東','南','西','北'][(state.roundWind??1)-1]}場</span><span>捨て牌: {(state.discards ?? []).slice(-12).map(tileLabel).join(' ') || 'なし'}</span></div>{state.winner&&state.winInfo?<p className="setting-status">{state.winInfo.yaku.join(' ・ ')}　{state.winInfo.han} 翻　{state.winInfo.fu} 符　{state.winInfo.limit ? `${state.winInfo.limit} ` : ''}{state.winInfo.points} 点（ロン換算）</p>:<p>{state.lastDiscard&&<>{members.find(member=>member.id===state.lastDiscard?.owner)?.name} が {tileLabel(state.lastDiscard.tile)} を捨てました。 </>}{state.exhausted?'ロンがなければ流局を確定します。':active === playerId ? '牌を1枚選んで捨ててください。' : '相手の手番を待っています。'}</p>}<div className="go-actions">{canTsumo&&<button className="primary" disabled={paused||Boolean(state.winner)||state.draw} onClick={tsumo}>ツモ</button>}{canRon&&<button className="primary" disabled={paused||Boolean(state.winner)||state.draw} onClick={ron}>ロン</button>}{canPon&&<button className="secondary" disabled={paused||Boolean(state.winner)||state.draw} onClick={pon}>ポン</button>}{canKan&&<button className="secondary" disabled={paused||Boolean(state.winner)||state.draw} onClick={kan}>大明槓</button>}{closedKanOptions.map(key=><button key={key} className="secondary" disabled={paused||Boolean(state.winner)||state.draw} onClick={()=>closedKan(key)}>暗槓 {tileLabel(visibleHand.find(tile=>tileKey(tile)===key)!)}</button>)}{addedKanOptions.map(key=><button key={`added-${key}`} className="secondary" disabled={paused||Boolean(state.winner)||state.draw} onClick={()=>addedKan(key)}>加槓 {tileLabel(visibleHand.find(tile=>tileKey(tile)===key)!)}</button>)}{chiOptions.map(option=><button key={option.map(tileKey).join('-')} className="secondary" disabled={paused||Boolean(state.winner)||state.draw} onClick={()=>chi(option)}>チー {option.concat(state.lastDiscard!.tile).sort((left,right)=>left.rank-right.rank).map(tileLabel).join('')}</button>)}{state.exhausted&&active===playerId&&<button className="secondary" disabled={paused||Boolean(state.winner)||state.draw} onClick={draw}>流局を確定</button>}{active===playerId&&!state.exhausted&&mine.length===concealed&&!myMelds.length&&!state.riichi?.[playerId]&&<button className={`secondary ${declaringRiichi?'selected':''}`} disabled={paused||Boolean(state.winner)||state.draw} onClick={()=>setDeclaringRiichi(!declaringRiichi)}>{declaringRiichi?'リーチ牌を選択中':'リーチを宣言する'}</button>}</div>{myMelds.length>0&&<small>副露: {myMelds.map(group=>group.map(tileLabel).join('')).join(' / ')}</small>}{declaringRiichi&&<small>テンパイになる牌を捨ててください。</small>}</section><section className="mahjong-hand">{visibleHand.map((tile, index) => <button key={`${tileKey(tile)}-${index}`} className={`mahjong-tile ${tile.suit}`} disabled={paused || active !== playerId || Boolean(state.winner)||state.draw||Boolean(state.exhausted)} onClick={() => discard(index)}>{tileLabel(tile)}</button>)}</section></>}</div>
}
type Block = 0 | 1 | 2 | 3 | 4 | 5
type FallingState = { board?: Block[][]; active?: { x: number; y: number; shape: number; rot: number }; turn?: string; score?: Record<string, number>; lastChain?: number; finished?: boolean }
type TetrisPlayerState = { board: Block[][]; active: { x: number; y: number; shape: number; rot: number }; score: number; pendingGarbage: number; lost?: boolean; seed: number }
type TetrisState = { players?: Record<string, TetrisPlayerState>; finished?: boolean }
type PuzzlePlayerState = { board: Block[][]; active: { x: number; y: number; shape: number; rot: number }; score: number; pendingGarbage: number; lastChain: number; lost?: boolean; seed: number }
type PuzzleState = { players?: Record<string, PuzzlePlayerState>; turn?: string; finished?: boolean }
const tetrominoes = [[[1,1,1,1]], [[2,2],[2,2]], [[0,3,0],[3,3,3]], [[4,0],[4,0],[4,4]], [[0,5],[0,5],[5,5]]]
const rotateShape = (shape: number[][], turns: number) => Array.from({ length: turns % 4 }, () => null).reduce(current => current[0].map((_, x) => current.map(row => row[x]).reverse()), shape)
const emptyBoard = (w: number, h: number) => Array.from({ length: h }, () => Array<Block>(w).fill(0))
const shapeCells = (active: NonNullable<FallingState['active']>) => rotateShape(tetrominoes[active.shape], active.rot).flatMap((row, y) => row.map((value, x) => value ? ({ x: active.x + x, y: active.y + y, value: value as Block }) : null).filter(Boolean) as { x: number; y: number; value: Block }[])
const resolvePuzzleChains = (source: Block[][]) => {
  const board=source.map(row=>[...row]);let cleared=0;let chains=0
  while(true){
    const seen=new Set<string>();const remove=new Set<string>()
    const visit=(x:number,y:number,value:Block,group:string[])=>{const key=`${x}:${y}`;if(seen.has(key)||x<0||x>=6||y<0||y>=12||board[y][x]!==value)return;seen.add(key);group.push(key);visit(x+1,y,value,group);visit(x-1,y,value,group);visit(x,y+1,value,group);visit(x,y-1,value,group)}
    board.forEach((row,y)=>row.forEach((value,x)=>{if(!value||seen.has(`${x}:${y}`))return;const group:string[]=[];visit(x,y,value,group);if(group.length>=4)group.forEach(key=>remove.add(key))}))
    if(!remove.size)break
    chains++;cleared+=remove.size;remove.forEach(key=>{const [x,y]=key.split(':').map(Number);board[y][x]=0})
    for(let x=0;x<6;x++){const column=board.map(row=>row[x]).filter(Boolean);for(let y=11;y>=0;y--)board[y][x]=(column.pop()??0) as Block}
  }
  return {board,cleared,chains}
}
function TetrisGame({ paused, sharedState, syncState, members, playerId }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  const state=(sharedState as TetrisState|undefined)??{}
  const blank=(seed:number):TetrisPlayerState=>({board:emptyBoard(10,16),active:{x:3,y:0,shape:seed%tetrominoes.length,rot:0},score:0,pendingGarbage:0,seed})
  const players=state.players??{}
  const me=players[playerId]
  const start=()=>{if(members[0]?.id!==playerId||paused)return;syncState({players:Object.fromEntries(members.map((member,index)=>[member.id,blank(index)])),finished:false})}
  const canPlace=(board:Block[][],piece:TetrisPlayerState['active'])=>shapeCells(piece).every(cell=>cell.x>=0&&cell.x<10&&cell.y>=0&&cell.y<16&&!board[cell.y][cell.x])
  const publish=(nextMe:TetrisPlayerState, attack=0)=>{
    const nextPlayers={...players,[playerId]:nextMe}
    if(attack){const target=members.find(member=>member.id!==playerId&&!players[member.id]?.lost);if(target&&nextPlayers[target.id])nextPlayers[target.id]={...nextPlayers[target.id],pendingGarbage:Math.min(20,nextPlayers[target.id].pendingGarbage+attack)}}
    const survivors=Object.values(nextPlayers).filter(player=>!player.lost)
    syncState({players:nextPlayers,finished:survivors.length<=1})
  }
  const lock=(hardDrop=false)=>{
    if(!me||paused||state.finished||me.lost)return
    let landed=me.active
    if(hardDrop)while(canPlace(me.board,{...landed,y:landed.y+1}))landed={...landed,y:landed.y+1}
    else if(canPlace(me.board,{...landed,y:landed.y+1})){publish({...me,active:{...landed,y:landed.y+1}});return}
    const settled=me.board.map(row=>[...row]);shapeCells(landed).forEach(cell=>{if(cell.y>=0)settled[cell.y][cell.x]=cell.value})
    const kept=settled.filter(row=>row.some(cell=>!cell));const cleared=16-kept.length;while(kept.length<16)kept.unshift(Array<Block>(10).fill(0))
    const cancelled=Math.min(me.pendingGarbage,cleared);const garbage=Math.min(me.pendingGarbage-cancelled,4);const overflow=garbage>0&&kept.slice(0,garbage).some(row=>row.some(Boolean));const raised=garbage?[...kept.slice(garbage),...Array.from({length:garbage},(_,index)=>Array.from({length:10},(_,x)=>x===((me.seed+index*3)%10)?0:6 as Block))]:kept
    const nextActive={x:3,y:0,shape:(me.seed+1)%tetrominoes.length,rot:0};const nextMe={board:raised,active:nextActive,score:me.score+cleared,pendingGarbage:0,seed:me.seed+1,lost:overflow||!canPlace(raised,nextActive)}
    publish(nextMe,Math.max(0,cleared-cancelled-1))
  }
  const move=(dx:number,rotation=0)=>{if(!me||paused||state.finished||me.lost)return;const next={...me.active,x:me.active.x+dx,rot:me.active.rot+rotation};if(canPlace(me.board,next))publish({...me,active:next})}
  useEffect(()=>{if(!me||paused||state.finished||me.lost)return;const timer=window.setInterval(()=>lock(),850);return()=>window.clearInterval(timer)},[me,paused,state.finished])
  if(!me)return <div className="board-game falling-game"><section className="mahjong-start panel"><h2>同時対戦を開始</h2><p>各自のブロックが自動で落下します。2ライン以上を消すと相手の盤面におじゃま行を送れます。</p><button className="primary" disabled={paused||members[0]?.id!==playerId} onClick={start}>{members[0]?.id===playerId?'対戦を開始':'ホストが対戦を開始します'}</button></section></div>
  const activeCells=new Map(shapeCells(me.active).map(cell=>[`${cell.x}:${cell.y}`,cell.value]))
  const winner=members.find(member=>players[member.id]&&!players[member.id].lost)
  return <div className="board-game falling-game"><div className="game-top"><div><span className="tag">VERSUS / LIVE TETRIS</span><h1>テトリス風対戦</h1></div><div className="turn-pill">{state.finished?`${winner?.name??'勝者'} の勝利`:me.lost?'ゲームオーバー':'同時対戦中'}</div></div><section className="falling-layout"><div className="falling-board tetris-board">{me.board.flatMap((row,y)=>row.map((value,x)=><i key={`${x}-${y}`} className={`block c${activeCells.get(`${x}:${y}`)??value}`}/>))}</div><section className="falling-side panel"><h2>操作</h2><p>ブロックは自動で落下します。2ライン以上を消すと相手へおじゃま行を送ります。</p><div className="falling-controls"><button disabled={paused||state.finished||me.lost} onClick={()=>move(-1)}>左</button><button disabled={paused||state.finished||me.lost} onClick={()=>move(0,1)}>回転</button><button disabled={paused||state.finished||me.lost} onClick={()=>move(1)}>右</button><button className="primary" disabled={paused||state.finished||me.lost} onClick={()=>lock(true)}>一気に落とす</button></div><div className="falling-score">{members.map(member=>{const player=players[member.id];return <div key={member.id}><span>{member.name}{member.id===playerId?' (あなた)':''}</span><b>{player?.lost?'OUT':`${player?.score??0} LINE`}{player?.pendingGarbage?` +${player.pendingGarbage}`:''}</b></div>})}</div></section></section></div>
}
function PuzzleGame({ paused, sharedState, syncState, members, playerId }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  const state=(sharedState as PuzzleState|undefined)??{};const players=state.players??{};const me=players[playerId];const turn=state.turn??members[0]?.id??playerId
  const blank=(seed:number):PuzzlePlayerState=>({board:emptyBoard(6,12),active:{x:2,y:0,shape:(seed+2)%tetrominoes.length,rot:0},score:0,pendingGarbage:0,lastChain:0,seed})
  const start=()=>{if(paused||members[0]?.id!==playerId)return;syncState({players:Object.fromEntries(members.map((member,index)=>[member.id,blank(index)])),turn:members[0]?.id,finished:false})}
  const canPlace=(board:Block[][],piece:PuzzlePlayerState['active'])=>shapeCells(piece).every(cell=>cell.x>=0&&cell.x<6&&cell.y>=0&&cell.y<12&&!board[cell.y][cell.x])
  const publish=(nextMe:PuzzlePlayerState,nextTurn=turn,attack=0)=>{const nextPlayers={...players,[playerId]:nextMe};if(attack){const target=members.find(member=>member.id!==playerId&&!players[member.id]?.lost);if(target&&nextPlayers[target.id])nextPlayers[target.id]={...nextPlayers[target.id],pendingGarbage:Math.min(12,nextPlayers[target.id].pendingGarbage+attack)}}const survivors=Object.values(nextPlayers).filter(player=>!player.lost);syncState({players:nextPlayers,turn:nextTurn,finished:survivors.length<=1})}
  const move=(dx:number,rotation=0)=>{if(!me||paused||state.finished||turn!==playerId||me.lost)return;const next={...me.active,x:me.active.x+dx,rot:me.active.rot+rotation};if(canPlace(me.board,next))publish({...me,active:next})}
  const drop=()=>{if(!me||paused||state.finished||turn!==playerId||me.lost)return;let landed=me.active;while(canPlace(me.board,{...landed,y:landed.y+1}))landed={...landed,y:landed.y+1};const settled=me.board.map(row=>[...row]);shapeCells(landed).forEach(cell=>{if(cell.y>=0)settled[cell.y][cell.x]=((cell.value%4)+1)as Block});const resolved=resolvePuzzleChains(settled);const garbage=Math.min(me.pendingGarbage,3);const overflow=garbage>0&&resolved.board.slice(0,garbage).some(row=>row.some(Boolean));const raised=garbage?[...resolved.board.slice(garbage),...Array.from({length:garbage},(_,row)=>Array.from({length:6},(_,x)=>x===((me.seed+row*2)%6)?0:((x+me.seed)%4+1)as Block))]:resolved.board;const nextActive={x:2,y:0,shape:(me.seed+3)%tetrominoes.length,rot:0};const nextMe={board:raised,active:nextActive,score:me.score+resolved.cleared*Math.max(1,resolved.chains),pendingGarbage:0,lastChain:resolved.chains,seed:me.seed+1,lost:overflow||!canPlace(raised,nextActive)};const playerIndex=members.findIndex(member=>member.id===playerId);const nextTurn=Array.from({length:members.length},(_,offset)=>members[(playerIndex+1+offset)%members.length]?.id).find(id=>id&&(id===playerId?!nextMe.lost:!players[id]?.lost))??playerId;const attack=Math.min(3,Math.max(0,resolved.chains-1)+Math.floor(resolved.cleared/8));publish(nextMe,nextTurn,attack)}
  if(!me)return <div className="board-game falling-game"><section className="mahjong-start panel"><h2>対戦を開始</h2><p>連鎖と大量消去で相手へおじゃま行を送り、相手の盤面を押し上げよう。</p><button className="primary" disabled={paused||members[0]?.id!==playerId} onClick={start}>{members[0]?.id===playerId?'対戦を開始':'ホストが対戦を開始します'}</button></section></div>
  const activeCells=new Map(shapeCells(me.active).map(cell=>[`${cell.x}:${cell.y}`,((cell.value%4)+1)as Block]));const winner=members.find(member=>players[member.id]&&!players[member.id].lost)
  return <div className="board-game falling-game"><div className="game-top"><div><span className="tag">VERSUS / CHAIN PUZZLE</span><h1>落ちものパズル</h1></div><div className="turn-pill">{state.finished?`${winner?.name??'勝者'} の勝利`:me.lost?'ゲームオーバー':`${members.find(member=>member.id===turn)?.name??'あなた'} の番`}</div></div><section className="falling-layout"><div className={`falling-board puzzle-board ${me.lastChain>1?'chain-flash':''}`}>{me.board.flatMap((row,y)=>row.map((value,x)=><i key={`${x}-${y}`} className={`block orb c${activeCells.get(`${x}:${y}`)??value}`}/>))}</div><section className="falling-side panel"><h2>4つつなげて消す</h2><p>連鎖・大量消去でおじゃま行を送り、受け取った行は次の手で盤面に積まれます。</p>{me.lastChain>1&&<p className="setting-status">{me.lastChain} 連鎖</p>}<div className="falling-controls"><button disabled={paused||turn!==playerId||state.finished||me.lost} onClick={()=>move(-1)}>左</button><button disabled={paused||turn!==playerId||state.finished||me.lost} onClick={()=>move(0,1)}>回転</button><button disabled={paused||turn!==playerId||state.finished||me.lost} onClick={()=>move(1)}>右</button><button className="primary" disabled={paused||turn!==playerId||state.finished||me.lost} onClick={drop}>落とす</button></div><div className="falling-score">{members.map(member=>{const player=players[member.id];return <div key={member.id}><span>{member.name}{member.id===playerId?' (あなた)':''}</span><b>{player?.lost?'OUT':`${player?.score??0} POINT`}{player?.pendingGarbage?` +${player.pendingGarbage}`:''}</b></div>})}</div></section></section></div>
}
function CoopMissionGame({ game, paused, sharedState, syncState, members, playerId }: { game: 'delivery' | 'alien' | 'museum' | 'thief' | 'letter' | 'ghost' | 'soundmaze' | 'detective' | 'bug' | 'guard' | 'sports'; paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  type Mission = { title: string; tag: string; briefing: string; privateClues: string[]; choices: string[]; answer: string; action: string }
  const sets: Record<typeof game, Mission[]> = {
    delivery: [{ title: '地図なし配達', tag: 'CO-OP / ROUTE', briefing: '荷物を制限時間内に灯台へ届けよう。道を見る人と地図を見る人で情報が分かれています。', privateClues: ['交差点の標識は青。青を通ると橋へ進める。', '灯台は川の北側。橋を渡った先で左折すると到着。', '荷物は壊れ物。石畳ルートは避けると安全。'], choices: ['青い標識から橋へ向かう', '石畳の近道を進む', '南へ迂回する'], answer: '青い標識から橋へ向かう', action: 'ルートを選ぶ' }],
    alien: [{ title: '宇宙人の通訳', tag: 'CO-OP / LANGUAGE', briefing: '宇宙船の入港許可を得るため、未知の三語を正しく解読してください。', privateClues: ['"mira" は歓迎の場面で使われた。', '"toko" の直後に貨物室が開いた。', '"sena" は危険信号と一緒に表示された。'], choices: ['mira: 歓迎、toko: 貨物、sena: 危険', 'mira: 危険、toko: 歓迎、sena: 貨物', 'mira: 貨物、toko: 危険、sena: 歓迎'], answer: 'mira: 歓迎、toko: 貨物、sena: 危険', action: '通訳を送信' }],
    museum: [{ title: '逃げる美術館', tag: 'CO-OP / SURVEILLANCE', briefing: '展示室ごとの監視映像を照合し、動き出した彫像を止める順番を決めよう。', privateClues: ['赤の展示室では彫像が東へ動いた。', '青の展示室では非常停止盤が西側にある。', '緑の展示室の扉は赤の展示室とつながる。'], choices: ['赤を封鎖して青の停止盤を押す', '緑の扉を先に開く', '青の展示室を封鎖する'], answer: '赤を封鎖して青の停止盤を押す', action: '対応を確定' }],
    thief: [{ title: '怪盗のアリバイ工作', tag: 'CO-OP / DEDUCTION', briefing: '目撃証言と入退室記録を整合させ、矛盾しない行動記録を作ろう。', privateClues: ['目撃者は20:10に青い傘を見た。', '美術館の入退室ログは20:12に北口が開いた。', 'タクシー記録では20:18に駅前へ到着している。'], choices: ['20:10 北口、20:12 展示室、20:18 駅前', '20:10 展示室、20:12 北口、20:18 駅前', '20:10 駅前、20:12 北口、20:18 展示室'], answer: '20:10 展示室、20:12 北口、20:18 駅前', action: '記録を提出' }],
    letter: [{ title: '手紙だけの冒険', tag: 'CO-OP / LETTER', briefing: '一度に送れるのは短い手紙だけ。遠くの仲間を導いて古い塔を抜けよう。', privateClues: ['窓から見える旗は「北」を指している。', '鍵穴は月形。月の紋章の扉が正解。', '階段は崩れている。ロープが必要。'], choices: ['月の扉へロープを持って進む', '北の窓から飛び降りる', '鍵のない鉄扉を開ける'], answer: '月の扉へロープを持って進む', action: '手紙の指示を送る' }],
    ghost: [{ title: '幽霊の引っ越し', tag: 'CO-OP / EMPATHY', briefing: '幽霊が安心できる新居を選び、無事に引っ越しを終えよう。', privateClues: ['幽霊は大きな音を怖がる。', '思い出の写真は日当たりのよい場所に置きたい。', '猫のいる家には近づけない。'], choices: ['静かで日当たりのよい家', '駅前のにぎやかな部屋', '猫のいる庭付き住宅'], answer: '静かで日当たりのよい家', action: '新居を選ぶ' }],
    soundmaze: [{ title: '音だけ迷路', tag: 'CO-OP / SOUND', briefing: '見えない迷路を、足音と反響だけで抜けよう。', privateClues: ['金属音は東の壁、低い反響は広間を示す。', '水音がする場所は行き止まり。', '短い反響が続く方向に出口がある。'], choices: ['短い反響の方向へ進む', '水音を追う', '金属音の壁を押す'], answer: '短い反響の方向へ進む', action: '進行方向を決める' }],
    detective: [{ title: '時間を編集する刑事', tag: 'CO-OP / TIME', briefing: '映像の順番を入れ替え、事件が起きた因果を復元しよう。', privateClues: ['停電は20:03、扉の開閉は20:05。', '犯人は停電の後に通路を通った。', '監視カメラは20:08に再起動した。'], choices: ['停電→扉→通路→再起動', '扉→停電→再起動→通路', '再起動→通路→停電→扉'], answer: '停電→扉→通路→再起動', action: '時系列を確定' }],
    bug: [{ title: 'バグを仕様にするゲーム', tag: 'CO-OP / SYSTEM', briefing: '壊れた世界の挙動を利用し、出口へ到達しよう。', privateClues: ['壁を二度押すと一時的に足場になる。', '青い床ではジャンプ距離が二倍になる。', '赤い床では操作が左右反転する。'], choices: ['青い床から壁を二度押す', '赤い床を走り抜ける', '壁を一度だけ押す'], answer: '青い床から壁を二度押す', action: '仕様を利用する' }],
    guard: [{ title: '泥棒と警備AI', tag: 'ASYMMETRIC / HEIST', briefing: '侵入側の情報と警備AIの監視情報を照合し、警備網を突破する方法を決めよう。', privateClues: ['侵入者は換気口から西棟へ入れる。', '警備AIは正面扉を20秒ごとに監視する。', 'レーザー網は青いカードで一度だけ停止する。'], choices: ['換気口から入り、青いカードでレーザーを止める', '正面扉を急いで通る', 'レーザー網をそのまま越える'], answer: '換気口から入り、青いカードでレーザーを止める', action: '侵入プランを確定' }],
    sports: [{ title: 'ルールを発明するスポーツ', tag: 'VERSUS / RULES', briefing: '試合前に、全員が納得する得点ルールを決めてから対戦を始めよう。', privateClues: ['広いコートでは長距離シュートが有利。', '接触プレーは禁止にしたい参加者がいる。', '逆転要素があると最後まで盛り上がる。'], choices: ['遠距離2点・接触禁止・終盤ボーナス', '近距離だけ3点・接触あり', '得点なしで時間だけを競う'], answer: '遠距離2点・接触禁止・終盤ボーナス', action: '試合ルールを採用' }],
  }
  type State = { round?: number; selection?: string; result?: boolean; score?: number; history?: string[] }
  const state = (sharedState as State | undefined) ?? {}; const mission = sets[game][(state.round ?? 0) % sets[game].length]; const clueIndex = Math.max(0, members.findIndex(member => member.id === playerId)) % mission.privateClues.length
  const decide = (selection: string) => { if (paused || state.selection) return; const result = selection === mission.answer; syncState({ ...state, selection, result, score: (state.score ?? 0) + (result ? 1 : 0), history: [...(state.history ?? []), result ? '作戦成功' : '作戦を見直す必要があります'] }) }
  const next = () => syncState({ round: (state.round ?? 0) + 1, score: state.score ?? 0, selection: undefined, result: undefined, history: state.history ?? [] })
  return <div className="board-game mission-game"><div className="game-top"><div><span className="tag">{mission.tag}</span><h1>{mission.title}</h1></div><div className="turn-pill">成功 {state.score ?? 0} 件</div></div><section className="mission-brief panel"><p className="eyebrow">MISSION</p><h2>{mission.briefing}</h2></section><section className="mission-clue"><p className="eyebrow">あなたにだけ見えている情報</p><h2>{mission.privateClues[clueIndex]}</h2><small>内容をチャットや通話で仲間に伝え、全員で答えを相談してください。</small></section><section className="mission-choice panel"><h2>{state.selection ? (state.result ? '作戦成功' : '作戦失敗') : mission.action}</h2>{state.selection ? <><p>{state.result ? '情報を正しくつなげられました。' : `正解は「${mission.answer}」でした。`}</p><button className="primary" disabled={paused} onClick={next}>次のケースへ</button></> : <div>{mission.choices.map(choice => <button key={choice} disabled={paused} onClick={() => decide(choice)}>{choice}</button>)}</div>}</section></div>
}
function OrchestraGame({ paused, sharedState, syncState, members, playerId }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  type State = { beat?: number; hits?: number[]; score?: number; completed?: boolean }
  const pattern = [0, 1, 2, 1, 0, 2, 1, 0]; const state = (sharedState as State | undefined) ?? {}; const beat = state.beat ?? 0; const assigned = pattern[beat % pattern.length] % Math.max(members.length, 1); const mine = members.findIndex(member => member.id === playerId); const hit = () => { if (paused || state.completed || mine !== assigned) return; const hits = [...(state.hits ?? []), beat]; const nextBeat = beat + 1; syncState({ beat: nextBeat, hits, score: (state.score ?? 0) + 1, completed: nextBeat >= pattern.length }) }
  const reset = () => syncState({ beat: 0, hits: [], score: 0, completed: false })
  return <div className="board-game orchestra-game"><div className="game-top"><div><span className="tag">CO-OP / RHYTHM</span><h1>声なしオーケストラ</h1></div><div className="turn-pill">成功拍 {state.score ?? 0} / {pattern.length}</div></div><section className="orchestra-panel panel"><p className="eyebrow">SILENT CONDUCTOR</p><h2>{state.completed ? '演奏成功' : `${members[assigned]?.name ?? 'あなた'} の拍です`}</h2><div className="orchestra-beats">{pattern.map((_, index) => <i key={index} className={index < beat ? 'done' : index === beat ? 'now' : ''}>{index + 1}</i>)}</div>{state.completed ? <button className="primary" disabled={paused} onClick={reset}>もう一度演奏</button> : <button className="primary orchestra-hit" disabled={paused || mine !== assigned} onClick={hit}>{mine === assigned ? '拍を打つ' : '仲間の拍を待つ'}</button>}<small>自分の番だけ拍を打ち、全員でリズムをつなげます。</small></section></div>
}
function CreativeGame({ game, paused, sharedState, syncState, members, playerId }: { game: 'movie' | 'election' | 'story' | 'meeting' | 'court'; paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  const config = {
    movie: { title: '映画監督バトル', tag: 'PARTY / PITCH', prompt: '「雨の駅」をテーマに、観客を引き込む短い演出案を書こう。', input: '演出案を書く', result: '最も観たい場面' },
    election: { title: '架空の国を作る選挙ゲーム', tag: 'PARTY / ELECTION', prompt: '新しい国の最初の法律を、国民が納得する一文で提案しよう。', input: '法案を書く', result: '採用する法案' },
    story: { title: '最後の一文を守る物語ゲーム', tag: 'PARTY / STORY', prompt: '物語を一文だけ続けよう。最後の一文へ自然につながる展開を目指します。', input: '一文を書く', result: '次に採用する一文' },
    meeting: { title: '同時にしゃべれない会議', tag: 'PARTY / SILENT MEETING', prompt: '停電した研究所から脱出する作戦を、発言枠を使って一文で提案しよう。', input: '発言枠を使う', result: '採用する作戦' },
    court: { title: '夢の中の法廷', tag: 'PARTY / COURT', prompt: '夢の証拠をもとに、被告を守る弁論を一文で作ろう。', input: '弁論を書く', result: '採用する弁論' },
  }[game]
  type State = { phase?: 'write' | 'vote' | 'result'; entries?: Record<string, string>; votes?: Record<string, string>; round?: number; score?: Record<string, number> }
  const state = (sharedState as State | undefined) ?? {}; const [text, setText] = useState(''); const entries = state.entries ?? {}; const votes = state.votes ?? {}; const phase = state.phase ?? 'write'; const allWritten = members.length > 0 && members.every(member => entries[member.id]); const tally = Object.values(votes).reduce<Record<string, number>>((total, id) => ({ ...total, [id]: (total[id] ?? 0) + 1 }), {}); const winner = Object.keys(tally).sort((a, b) => (tally[b] ?? 0) - (tally[a] ?? 0))[0]
  const submit = (event: React.FormEvent) => { event.preventDefault(); const value = text.trim(); if (paused || phase !== 'write' || entries[playerId] || !value) return; const next = { ...entries, [playerId]: value }; syncState({ ...state, entries: next, phase: members.every(member => next[member.id]) ? 'vote' : 'write' }); setText('') }
  const vote = (id: string) => { if (paused || phase !== 'vote' || votes[playerId]) return; const next = { ...votes, [playerId]: id }; const done = members.every(member => next[member.id]); syncState({ ...state, votes: next, phase: done ? 'result' : 'vote', score: done ? { ...(state.score ?? {}), [Object.keys(next).sort((a, b) => Object.values(next).filter(item => item === b).length - Object.values(next).filter(item => item === a).length)[0]]: ((state.score ?? {})[Object.keys(next)[0]] ?? 0) + 1 } : state.score }) }
  const reset = () => syncState({ phase: 'write', entries: {}, votes: {}, round: (state.round ?? 0) + 1, score: state.score ?? {} })
  return <div className="board-game creative-game"><div className="game-top"><div><span className="tag">{config.tag}</span><h1>{config.title}</h1></div><div className="turn-pill">ラウンド {(state.round ?? 0) + 1}</div></div><section className="creative-prompt panel"><p className="eyebrow">PROMPT</p><h2>{config.prompt}</h2><small>{phase === 'write' ? `投稿済み ${Object.keys(entries).length} / ${members.length}` : phase === 'vote' ? '全員の投稿がそろいました。ひとつ選んでください。' : '投票結果'}</small></section>{phase === 'write' && <section className="creative-write panel"><h2>{entries[playerId] ? 'あなたの案は投稿済みです' : config.input}</h2><form onSubmit={submit}><textarea value={text} maxLength={120} disabled={paused || Boolean(entries[playerId])} onChange={event => setText(event.target.value)} placeholder="120文字まで"/><button className="primary" disabled={paused || Boolean(entries[playerId])}>投稿する</button></form>{allWritten && <p>全員の投稿を確認中です。</p>}</section>}{phase !== 'write' && <section className="creative-entries">{members.map(member => <article key={member.id} className={`panel ${winner === member.id ? 'winner' : ''}`}><span className="avatar">{initials(member.name)}</span><b>{member.name}</b><p>{entries[member.id]}</p>{phase === 'vote' ? <button disabled={paused || Boolean(votes[playerId]) || member.id === playerId} onClick={() => vote(member.id)}>{config.result}に選ぶ</button> : <small>{tally[member.id] ?? 0} 票 {winner === member.id ? '選出' : ''}</small>}</article>)}</section>}{phase === 'result' && <button className="primary center" disabled={paused} onClick={reset}>次のラウンドへ</button>}</div>
}
function RoundGame({ game, paused, sharedState, syncState, members, playerId }: { game: typeof games[number]; paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  if (game.key === 'newsroom') return <NewsroomGame paused={paused} sharedState={sharedState} syncState={syncState} />
  if (game.key === 'association') return <AssociationGame paused={paused} sharedState={sharedState} syncState={syncState} members={members} playerId={playerId} />
  if (game.key === 'future') return <FutureGame paused={paused} sharedState={sharedState} syncState={syncState} members={members} playerId={playerId} />
  if (game.key === 'escape') return <EscapeRoomGame paused={paused} sharedState={sharedState} syncState={syncState} members={members} playerId={playerId} />
  if (game.key === 'shogi') return <ShogiGame paused={paused} sharedState={sharedState} syncState={syncState} members={members} playerId={playerId} />
  if (game.key === 'daifugo') return <DaifugoGame paused={paused} sharedState={sharedState} syncState={syncState} members={members} playerId={playerId} />
  if (game.key === 'sevens') return <SevensGame paused={paused} sharedState={sharedState} syncState={syncState} members={members} playerId={playerId} />
  if (game.key === 'mahjong') return <MahjongGame paused={paused} sharedState={sharedState} syncState={syncState} members={members} playerId={playerId} />
  if (game.key === 'tetris') return <TetrisGame paused={paused} sharedState={sharedState} syncState={syncState} members={members} playerId={playerId} />
  if (game.key === 'puzzle') return <PuzzleGame paused={paused} sharedState={sharedState} syncState={syncState} members={members} playerId={playerId} />
  if (game.key === 'delivery' || game.key === 'alien' || game.key === 'museum' || game.key === 'thief' || game.key === 'letter' || game.key === 'ghost' || game.key === 'soundmaze' || game.key === 'detective' || game.key === 'bug' || game.key === 'guard' || game.key === 'sports') return <CoopMissionGame game={game.key} paused={paused} sharedState={sharedState} syncState={syncState} members={members} playerId={playerId} />
  if (game.key === 'orchestra') return <OrchestraGame paused={paused} sharedState={sharedState} syncState={syncState} members={members} playerId={playerId} />
  if (game.key === 'movie' || game.key === 'election' || game.key === 'story' || game.key === 'meeting' || game.key === 'court') return <CreativeGame game={game.key} paused={paused} sharedState={sharedState} syncState={syncState} members={members} playerId={playerId} />
  const state = (sharedState as { round?: number; score?: Record<string, number>; log?: string[]; prompt?: string } | undefined) ?? {}
  const score = state.score ?? Object.fromEntries(members.map(member => [member.id, 0]))
  const round = state.round ?? 1
  const prompts = ['全員で作戦を決めよう', '最も良い答えをチャットで相談しよう', '制限時間内に役割を分担しよう', '投票で次の行動を選ぼう']
  const change = (id: string, delta: number) => { if (paused) return; const next = { ...score, [id]: Math.max(0, (score[id] ?? 0) + delta) }; syncState({ round, score: next, log: [...(state.log ?? []), `${members.find(member => member.id === id)?.name ?? 'プレイヤー'} が得点`], prompt: state.prompt ?? prompts[0] }) }
  const next = () => { if (paused) return; syncState({ round: round + 1, score, log: [...(state.log ?? []), `${round}ラウンド終了`], prompt: prompts[round % prompts.length] }) }
  return <div className="board-game round-game"><div className="game-top"><div><span className="tag">{game.kind} / 共有ラウンド</span><h1>{game.title}</h1></div><div className="turn-pill">ラウンド {round}</div></div><section className="round-card"><p className="eyebrow">CURRENT MISSION</p><h2>{state.prompt ?? prompts[0]}</h2><p>{game.description}。チャット・共有メモ・お絵描きボードを使って進行できます。</p><div className="score-list">{members.map(member => <div key={member.id}><span className={`avatar ${member.color}`}>{initials(member.name)}</span><b>{member.name}</b><strong>{score[member.id] ?? 0}</strong>{member.id === playerId && <button className="primary" disabled={paused} onClick={() => change(member.id, 1)}>得点を記録</button>}</div>)}</div><button className="secondary" disabled={paused} onClick={next}>次のラウンドへ</button></section><section className="round-log"><h2>進行ログ</h2>{(state.log ?? ['ゲームを開始しました']).slice(-6).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</section></div>
}

function QuizGame({ paused, sharedState, syncState, members, playerId }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  const questions = [
    { text: '日本で最も面積が大きい都道府県は？', choices: ['北海道', '岩手県', '福島県', '長野県'], answer: 0 },
    { text: 'オセロの開始時、盤上に置かれている石は何個？', choices: ['2個', '4個', '6個', '8個'], answer: 1 },
    { text: '太陽系で最も大きい惑星は？', choices: ['地球', '火星', '木星', '土星'], answer: 2 },
  ]
  const state = (sharedState as { index?: number; buzzedBy?: string | null; answered?: number | null; score?: Record<string, number> } | undefined) ?? {}
  const index = state.index ?? 0; const question = questions[index % questions.length]; const score = state.score ?? Object.fromEntries(members.map(member => [member.id, 0])); const buzzed = state.buzzedBy ? members.find(member => member.id === state.buzzedBy) : null
  const buzz = () => { if (!paused && !state.buzzedBy) syncState({ ...state, index, score, buzzedBy: playerId, answered: null }) }
  const answer = (choice: number) => { if (paused || state.buzzedBy !== playerId || state.answered !== null && state.answered !== undefined) return; const correct = choice === question.answer; const nextScore = { ...score, [playerId]: Math.max(0, (score[playerId] ?? 0) + (correct ? 1 : -1)) }; syncState({ index, score: nextScore, buzzedBy: playerId, answered: choice }) }
  const next = () => { if (!paused) syncState({ index: index + 1, score, buzzedBy: null, answered: null }) }
  const result = state.answered === undefined || state.answered === null ? null : state.answered === question.answer
  return <div className="board-game quiz-game"><div className="game-top"><div><span className="tag">PARTY / REALTIME BUZZER</span><h1>クイズ早押し</h1></div><div className="turn-pill">第 {index + 1} 問</div></div><section className="quiz-card"><p className="eyebrow">QUESTION</p><h2>{question.text}</h2>{!state.buzzedBy ? <button className="quiz-buzz" disabled={paused} onClick={buzz}>早押しする</button> : <><p className="quiz-status">{buzzed?.name ?? '誰か'} が早押ししました</p>{state.buzzedBy === playerId && result === null && <div className="quiz-choices">{question.choices.map((choice, choiceIndex) => <button key={choice} disabled={paused} onClick={() => answer(choiceIndex)}>{choice}</button>)}</div>}{result !== null && <div className={`quiz-result ${result ? 'correct' : 'wrong'}`}><b>{result ? '正解！' : '不正解'}</b><span>答え: {question.choices[question.answer]}</span><button className="primary" onClick={next}>次の問題</button></div>}</>}</section><section className="quiz-score panel"><h2>スコア</h2>{members.map(member => <div key={member.id}><span>{member.name}</span><strong>{score[member.id] ?? 0} pt</strong></div>)}</section></div>
}

function MemoryGame({ paused, sharedState, syncState, members, playerId }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  const deck = ['●','▲','■','◆','★','♥','●','▲','■','◆','★','♥']
  const state = (sharedState as { open?: number[]; matched?: number[]; turn?: string; score?: Record<string, number>; winner?: string } | undefined) ?? {}
  const open = state.open ?? []; const matched = state.matched ?? []; const turn = state.turn ?? members[0]?.id ?? playerId; const score = state.score ?? Object.fromEntries(members.map(member => [member.id, 0]))
  const flip = (index: number) => {
    if (paused || turn !== playerId || open.length >= 2 || open.includes(index) || matched.includes(index)) return
    const nextOpen = [...open, index]
    if (nextOpen.length < 2) { syncState({ open: nextOpen, matched, turn, score }); return }
    const paired = deck[nextOpen[0]] === deck[nextOpen[1]]
    const nextMatched = paired ? [...matched, ...nextOpen] : matched
    const nextScore = paired ? { ...score, [playerId]: (score[playerId] ?? 0) + 1 } : score
    const nextTurn = paired ? playerId : members[(members.findIndex(member => member.id === turn) + 1) % members.length]?.id ?? playerId
    const nextWinner=nextMatched.length===deck.length?members.reduce((best,member)=>(nextScore[member.id]??0)>(nextScore[best.id]??0)?member:best,members[0])?.id:undefined
    syncState({ open: nextOpen, matched: nextMatched, turn: nextTurn, score: nextScore, winner: nextWinner })
    window.setTimeout(() => syncState({ open: [], matched: nextMatched, turn: nextTurn, score: nextScore, winner: nextWinner }), 900)
  }
  const winner = state.winner ? members.find(member=>member.id===state.winner) : matched.length === deck.length ? members.reduce((best, member) => (score[member.id] ?? 0) > (score[best.id] ?? 0) ? member : best, members[0]) : null
  return <div className="board-game memory-game"><div className="game-top"><div><span className="tag">CARD / MEMORY</span><h1>神経衰弱</h1></div><div className="turn-pill">{winner ? `${winner?.name} の勝ち！` : `${members.find(member => member.id === turn)?.name ?? 'あなた'} の番`}</div></div><div className="memory-layout"><section className="memory-board">{deck.map((symbol, index) => { const shown = open.includes(index) || matched.includes(index); return <button key={index} className={`memory-card ${shown ? 'shown' : ''} ${matched.includes(index) ? 'matched' : ''}`} disabled={paused || Boolean(winner)} onClick={() => flip(index)} aria-label={`${index + 1}枚目のカード`}>{shown ? symbol : '?'}</button> })}</section><section className="memory-score panel"><h2>ペア数</h2>{members.map(member => <div key={member.id}><span>{member.name}</span><strong>{score[member.id] ?? 0}</strong></div>)}<p>{matched.length / 2} / {deck.length / 2} ペア発見</p></section></div></div>
}

function MinesGame({ paused, sharedState, syncState }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void }) {
  const width = 8; const mines = [3, 10, 14, 21, 26, 39, 45, 50, 59]
  const state = (sharedState as { revealed?: number[]; flags?: number[]; lost?: boolean; won?: boolean } | undefined) ?? {}
  const revealed = state.revealed ?? []; const flags = state.flags ?? []; const lost = Boolean(state.lost)
  const around = (index: number) => { const row = Math.floor(index / width), col = index % width; return [-1,0,1].flatMap(dy => [-1,0,1].map(dx => [row + dy, col + dx])).filter(([y,x]) => !(y === row && x === col) && y >= 0 && y < width && x >= 0 && x < width).map(([y,x]) => y * width + x).filter(cell => mines.includes(cell)).length }
  const open = (index: number) => { if (paused || lost || state.won || flags.includes(index) || revealed.includes(index)) return; if (mines.includes(index)) { syncState({ revealed: [...revealed, index], flags, lost: true, won: false }); return }; const next = new Set(revealed); const visit = (cell: number) => { if (next.has(cell) || mines.includes(cell) || flags.includes(cell)) return; next.add(cell); if (around(cell) === 0) { const row = Math.floor(cell / width), col = Math.floor(cell % width); [-1,0,1].forEach(dy => [-1,0,1].forEach(dx => { const y = row + dy, x = col + dx; if ((dx || dy) && y >= 0 && y < width && x >= 0 && x < width) visit(y * width + x) })) } }; visit(index); const nextRevealed=[...next]; syncState({ revealed: nextRevealed, flags, lost: false, won: nextRevealed.length === width * width - mines.length }) }
  const flag = (index: number) => { if (paused || lost || revealed.includes(index)) return; syncState({ revealed, flags: flags.includes(index) ? flags.filter(cell => cell !== index) : [...flags, index], lost }) }
  const won = Boolean(state.won) || !lost && revealed.length === width * width - mines.length
  const reset = () => syncState({ revealed: [], flags: [], lost: false, won: false })
  return <div className="board-game mines-game"><div className="game-top"><div><span className="tag">CO-OP / PUZZLE</span><h1>協力マインスイーパー</h1></div><div className="turn-pill">旗 {flags.length} / {mines.length}</div></div><p className="game-hint">左クリックで開く、右クリックで旗を置く。全員で地雷を避けよう。</p>{(lost || won) && <div className={`mines-result ${won ? 'win' : 'loss'}`}><b>{won ? '協力クリア！' : '地雷に当たりました'}</b><button className="primary" onClick={reset}>もう一度</button></div>}<section className="mines-board">{Array.from({ length: 64 }, (_, index) => { const opened = revealed.includes(index); const count = around(index); return <button key={index} className={`${opened ? 'opened' : ''} ${opened && mines.includes(index) ? 'mine' : ''}`} onClick={() => open(index)} onContextMenu={event => { event.preventDefault(); flag(index) }} disabled={paused || lost || won}>{opened ? (mines.includes(index) ? '地雷' : count || '') : flags.includes(index) ? '旗' : ''}</button> })}</section></div>
}

function SugorokuGame({ paused, sharedState, syncState, members, playerId }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  const length = 30
  const state = (sharedState as { positions?: Record<string, number>; turn?: string; lastRoll?: number; winner?: string } | undefined) ?? {}
  const positions = state.positions ?? Object.fromEntries(members.map(member => [member.id, 0])); const turn = state.turn ?? members[0]?.id ?? playerId
  const roll = () => { if (paused || turn !== playerId || state.winner) return; const value = Math.floor(Math.random() * 6) + 1; const current = positions[playerId] ?? 0; const nextPosition = Math.min(length, current + value); const nextPositions = { ...positions, [playerId]: nextPosition }; const winner = nextPosition >= length ? playerId : undefined; const nextTurn = members[(members.findIndex(member => member.id === turn) + 1) % members.length]?.id ?? playerId; syncState({ positions: nextPositions, turn: nextTurn, lastRoll: value, winner }) }
  const winner = state.winner ? members.find(member => member.id === state.winner) : null
  return <div className="board-game sugoroku-game"><div className="game-top"><div><span className="tag">PARTY / BOARD</span><h1>すごろく</h1></div><div className="turn-pill">{winner ? `${winner.name} がゴール！` : `${members.find(member => member.id === turn)?.name ?? 'あなた'} の番`}</div></div><section className="sugoroku-track">{Array.from({ length: length + 1 }, (_, index) => <div key={index} className={`track-cell ${index === 0 ? 'start' : index === length ? 'goal' : index % 7 === 0 ? 'event' : ''}`}><small>{index === 0 ? 'START' : index === length ? 'GOAL' : index}</small><div>{members.filter(member => positions[member.id] === index).map(member => <span className={`tiny-avatar ${member.color}`} key={member.id}>{initials(member.name)}</span>)}</div></div>)}</section><section className="dice-panel panel"><div><p className="eyebrow">LAST ROLL</p><strong>{state.lastRoll ?? '-'}</strong></div><button className="primary" disabled={paused || turn !== playerId || Boolean(winner)} onClick={roll}>サイコロを振る</button><p>{turn === playerId ? 'あなたの番です' : '他のプレイヤーを待っています'}</p></section></div>
}

function ShiritoriGame({ paused, sharedState, syncState, members, playerId }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  const [word, setWord] = useState('')
  const state = (sharedState as { words?: { text: string; name: string }[]; turn?: string; loser?: string } | undefined) ?? {}
  const words = state.words ?? []; const turn = state.turn ?? members[0]?.id ?? playerId; const last = words.at(-1)?.text ?? ''; const expected = last ? last.replace(/[ーゃゅょぁぃぅぇぉ]$/,'').slice(-1) : ''
  const submit = (event: React.FormEvent) => { event.preventDefault(); const value = word.trim(); if (paused || turn !== playerId || !value) return; const normalized = value.replace(/[\s　]/g,''); if ((expected && normalized[0] !== expected) || words.some(item => item.text === normalized)) return; const nextWords = [...words, { text: normalized, name: members.find(member => member.id === playerId)?.name ?? 'プレイヤー' }]; const loser = normalized.endsWith('ん') ? playerId : undefined; const nextTurn = members[(members.findIndex(member => member.id === turn) + 1) % members.length]?.id ?? playerId; syncState({ words: nextWords, turn: nextTurn, loser }); setWord('') }
  const loser = state.loser ? members.find(member => member.id === state.loser) : null
  return <div className="board-game shiritori-game"><div className="game-top"><div><span className="tag">PARTY / WORD</span><h1>しりとり</h1></div><div className="turn-pill">{loser ? `${loser.name} は「ん」で終了` : `${members.find(member => member.id === turn)?.name ?? 'あなた'} の番`}</div></div><section className="shiritori-current panel"><p className="eyebrow">NEXT WORD</p><h2>{expected ? `「${expected}」から始まる言葉` : '最初の言葉を入力'}</h2><form onSubmit={submit}><input disabled={paused || turn !== playerId || Boolean(loser)} value={word} onChange={event => setWord(event.target.value)} placeholder="ひらがなで入力"/><button className="primary" disabled={paused || turn !== playerId || Boolean(loser)}>つなぐ</button></form><small>同じ言葉、つながらない言葉、「ん」で終わる言葉は使えません。</small></section><section className="shiritori-log panel"><h2>言葉の履歴</h2>{words.length ? words.slice().reverse().map((item, index) => <div key={`${item.text}-${index}`}><b>{item.text}</b><small>{item.name}</small></div>) : <p>まだ言葉がありません。</p>}</section></div>
}

function DrawRelayGame({ paused, sharedState, syncState, members, playerId }: { paused: boolean; sharedState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  const prompts = ['海の生き物', '雨の日に使うもの', '空を飛ぶ乗り物', '甘い食べ物']
  const state = (sharedState as { lines?: DrawLine[]; round?: number; turn?: string; revealed?: boolean } | undefined) ?? {}
  const round = state.round ?? 0; const turn = state.turn ?? members[0]?.id ?? playerId; const canDraw = !paused && turn === playerId && !state.revealed
  const next = () => { if (paused) return; const nextRound = round + 1; const nextTurn = members[(members.findIndex(member => member.id === turn) + 1) % members.length]?.id ?? playerId; syncState({ lines: [], round: nextRound, turn: nextTurn, revealed: false }) }
  return <div className="board-game draw-relay-game"><div className="game-top"><div><span className="tag">PARTY / DRAWING</span><h1>お絵描き伝言</h1></div><div className="turn-pill">ラウンド {round + 1}</div></div><section className="draw-relay-card panel"><p className="eyebrow">DRAWER</p><h2>{members.find(member => member.id === turn)?.name ?? 'あなた'} が描いています</h2>{canDraw && <p>お題: <b>{prompts[round % prompts.length]}</b></p>}{!canDraw && <p>描く人以外は、チャットで答えを予想してください。</p>}<DrawingBoard lines={state.lines ?? []} onChange={lines => { if (canDraw) syncState({ ...state, lines, round, turn }) }} /><div className="draw-relay-actions"><button className="secondary" disabled={paused} onClick={() => syncState({ ...state, round, turn, revealed: !state.revealed })}>{state.revealed ? '答えを隠す' : '絵を公開する'}</button><button className="primary" disabled={paused || turn !== playerId} onClick={next}>次の人へ</button></div></section></div>
}

function DeductionGame({ title, gameKey, paused, sharedState, privateState, syncState, members, playerId }: { title: string; gameKey: 'werewolf' | 'wordwolf'; paused: boolean; sharedState: unknown; privateState: unknown; syncState: (state: unknown) => void; members: RoomMember[]; playerId: string }) {
  const state = (sharedState as { phase?: string; votes?: Record<string, string>; round?: number } | undefined) ?? {}; const secret = privateState as { role?: string; word?: string } | undefined; const votes = state.votes ?? {}; const voted = votes[playerId]
  const vote = (target: string) => { if (paused || voted || target === playerId) return; syncState({ ...state, votes: { ...votes, [playerId]: target } }) }
  const next = () => { if (paused) return; const complete = members.length > 0 && Object.keys(votes).length >= members.length; syncState({ phase: complete ? 'result' : 'discussion', votes: complete ? {} : votes, round: (state.round ?? 1) + (complete ? 1 : 0) }) }
  return <div className="board-game deduction-game"><div className="game-top"><div><span className="tag">PARTY / SECRET ROLE</span><h1>{title}</h1></div><div className="turn-pill">ラウンド {state.round ?? 1}</div></div><section className="secret-card"><p className="eyebrow">YOUR SECRET</p><h2>{secret?.role ?? '役職を配布中…'}</h2>{gameKey === 'wordwolf' && <p>あなたのお題: <b>{secret?.word ?? '配布中'}</b></p>}<small>この情報はあなたの画面だけに送信されます。</small></section><section className="deduction-panel panel"><h2>議論と投票</h2><p>チャットで話し合い、怪しいと思う相手に投票してください。</p><div className="vote-list">{members.map(member => <button key={member.id} disabled={paused || Boolean(voted) || member.id === playerId} className={votes[playerId] === member.id ? 'selected' : ''} onClick={() => vote(member.id)}><span className={`avatar ${member.color}`}>{initials(member.name)}</span>{member.name}<small>{Object.values(votes).filter(value => value === member.id).length}票</small></button>)}</div><button className="primary" disabled={paused} onClick={next}>{Object.keys(votes).length >= members.length ? '投票を締め切る' : '投票を確認する'}</button></section></div>
}

function GameResultTracker({ gameKey, gameName, state, playerId, members, recordMatch }: { gameKey: GameKey; gameName: string; state: unknown; playerId: string; members: RoomMember[]; recordMatch: (game: string, result: 'win' | 'loss' | 'draw', snapshot?: unknown) => void }) {
  const recorded = useRef('')
  const frames = useRef<Array<{ at: number; state: unknown }>>([])
  const lastFrame = useRef('')
  useEffect(() => { frames.current=[];lastFrame.current='';recorded.current='' }, [gameKey])
  useEffect(() => {
    if (!state || typeof state !== 'object') return
    const serialized=JSON.stringify(state)
    if(serialized===lastFrame.current||serialized.length>30_000)return
    lastFrame.current=serialized
    const next=[...frames.current,{at:Date.now(),state:JSON.parse(serialized)}].slice(-60)
    while(next.length>1&&JSON.stringify(next).length>45_000)next.shift()
    frames.current=next
  }, [state])
  useEffect(() => {
    if (gameKey === 'tag' || !state || typeof state !== 'object') return
    const game = state as { winner?: unknown; loser?: unknown; finished?: unknown; passes?: number; score?: Record<string, number>; revealed?: number[]; lost?: boolean }
    const firstColor: Record<string, string> = { othello: 'b', gomoku: 'black', connect4: 'red', shogi: 'b', go: 'b', chess: 'w' }
    const secondColor: Record<string, string> = { othello: 'w', gomoku: 'white', connect4: 'yellow', shogi: 'w', go: 'w', chess: 'b' }
    const localColor = members[0]?.id === playerId ? firstColor[gameKey] : secondColor[gameKey]
    let result: 'win' | 'loss' | 'draw' | null = null
    if (typeof game.winner === 'string') result = game.winner === playerId || game.winner === localColor ? 'win' : 'loss'
    else if (game.winner === null && ((gameKey === 'go' && game.passes === 2) || (gameKey === 'othello' && game.finished))) result = 'draw'
    else if (typeof game.loser === 'string') result = game.loser === playerId ? 'loss' : 'win'
    else if (gameKey === 'mines' && game.lost) result = 'loss'
    else if (gameKey === 'mines' && Array.isArray(game.revealed) && game.revealed.length === 55) result = 'win'
    else if (game.finished && game.score) {
      const mine = game.score[playerId] ?? 0; const top = Math.max(...members.map(member => game.score?.[member.id] ?? 0)); const leaders = members.filter(member => (game.score?.[member.id] ?? 0) === top)
      result = mine === top ? leaders.length > 1 ? 'draw' : 'win' : 'loss'
    }
    if (!result) { recorded.current = ''; return }
    const key = `${gameKey}:${result}:${JSON.stringify(game)}`
    if (recorded.current === key) return
    recorded.current = key
    recordMatch(gameName, result, { version: 1, frames: frames.current, final: state })
  }, [gameKey, gameName, members, playerId, recordMatch, state])
  return null
}

function App() {
  const [page,setPage]=useState<Page>('home'); const [selected,setSelected]=useState<GameKey>('tag'); const [showShortcut,setShowShortcut]=useState(false); const [youtubeUrl,setYoutubeUrl]=useState(() => localStorage.getItem('hidegames.youtube-url') ?? ''); const [brightness,setBrightness]=useState(() => Number(localStorage.getItem('hidegames.brightness') ?? 85)); const [shortcut,setShortcut]=useState(() => localStorage.getItem('hidegames.away-shortcut') ?? 'Ctrl + Shift + H'); const [openSpectatorGame,setOpenSpectatorGame]=useState(false); const [spectatorMessage,setSpectatorMessage]=useState(''); const room = useRoomSession(); const player = usePlayerData()
  const captionsEnabled = useCaptionPreference()
  const brightnessEnabled = useBrightnessPreference()
  useInterfaceAudio(page==='play'&&!room.paused)
  useRoomStatusNotifications(room.awayHistory)
  useGameStartNotifications(room.lastGameStart, room.localMember.id)
  useInviteNotifications(room.invitations)
  useEffect(()=>{if(page==='play'&&room.members.length>1)player.recordRecentPlayers(room.members,room.localMember.id)},[page,room.roomCode,room.members,room.localMember.id,player.recordRecentPlayers])
  useEffect(()=>{localStorage.setItem('hidegames.youtube-url',youtubeUrl)},[youtubeUrl])
  useEffect(()=>{localStorage.setItem('hidegames.brightness',String(brightness))},[brightness])
  useEffect(()=>{const offStarted=window.hideGamesDesktop?.onAwayStarted(()=>{if(brightnessEnabled)void window.hideGamesDesktop?.setBrightness(brightness);room.setAway(true);setShowShortcut(false)});const offReturned=window.hideGamesDesktop?.onAwayReturned(()=>{if(brightnessEnabled)void window.hideGamesDesktop?.setBrightness(brightness,true);room.setAway(false);setShowShortcut(false)});return()=>{offStarted?.();offReturned?.()}},[brightness,brightnessEnabled,room])
  useEffect(()=>{const offRoom=window.hideGamesDesktop?.onRoomLink(code=>{if(room.joinRoom(code)){setPage('room');setSelected(room.game as GameKey)}});return()=>offRoom?.()},[room])
  useEffect(()=>{const onShortcut=(e:KeyboardEvent)=>{if(window.hideGamesDesktop)return;const keys=shortcut.toLowerCase().replace(/\s/g,'').split('+');const key=keys.at(-1);const control=keys.includes('ctrl')||keys.includes('control')||keys.includes('commandorcontrol');const command=keys.includes('cmd')||keys.includes('command');const shift=keys.includes('shift');const alt=keys.includes('alt')||keys.includes('option');const primary=command?e.metaKey:control?(e.ctrlKey||e.metaKey):!e.ctrlKey&&!e.metaKey;if(key&&e.key.toLowerCase()===key&&e.shiftKey===shift&&e.altKey===alt&&primary){e.preventDefault();const away=Boolean(room.members.find(member=>member.id===room.localMember.id)?.away);room.setAway(!away);setShowShortcut(!away)}};window.addEventListener('keydown',onShortcut);return()=>window.removeEventListener('keydown',onShortcut)},[room,shortcut])
  useEffect(()=>{if(games.some(game=>game.key===room.game)) setSelected(room.game as GameKey)},[room.game])
  useEffect(()=>{const started=room.lastGameStart;if(!started||!games.some(game=>game.key===started.game))return;setSelected(started.game as GameKey);setPage('play')},[room.lastGameStart])
  useEffect(()=>{if(!openSpectatorGame)return;if(room.spectators.some(member=>member.id===room.localMember.id)){setSelected(room.game as GameKey);setPage('play');setOpenSpectatorGame(false)}},[openSpectatorGame,room.game,room.localMember.id,room.spectators])
  useEffect(()=>{if(room.roomError)setOpenSpectatorGame(false)},[room.roomError])
  useEffect(() => {
    const openHome = () => setPage('home')
    const openFriends = () => setPage('friends')
    const openYoutube = () => setPage('youtube')
    window.addEventListener('hidegames-open-home', openHome)
    window.addEventListener('hidegames-open-friends', openFriends)
    window.addEventListener('hidegames-open-youtube', openYoutube)
    return () => { window.removeEventListener('hidegames-open-home', openHome); window.removeEventListener('hidegames-open-friends', openFriends); window.removeEventListener('hidegames-open-youtube', openYoutube) }
  }, [])
  useEffect(() => {
    const removeMember = (event: Event) => {
      const targetId = (event as CustomEvent<string>).detail
      if (typeof targetId === 'string') room.removeMember(targetId)
    }
    window.addEventListener('hidegames-remove-member', removeMember)
    return () => window.removeEventListener('hidegames-remove-member', removeMember)
  }, [room.removeMember])
  const beginAway=()=>{setShowShortcut(false);if(window.hideGamesDesktop){void window.hideGamesDesktop.hideWindow()}else room.setAway(true)}
  const current=games.find(g=>g.key===selected) ?? games[0]
  // A game selection should always land in the lobby first.  Starting from the
  // library used to bypass ready checks and could open a two-player game alone.
  const openLobby=(key:GameKey)=>{setSelected(key);room.selectGame(key);setPage('room')}
  const launchGame=()=>room.startGame()
  return <div className="app-shell">
    {page !== 'play' && <Sidebar page={page} setPage={setPage} unread={room.messages.length > 3 ? 1 : 0} player={player.data} />}
    <main className={page === 'play' ? 'play-main' : 'main'}>
      {page === 'play' && <GameResultTracker gameKey={selected} gameName={current.title} state={room.gameState[selected]} playerId={room.localMember.id} members={room.members} recordMatch={player.recordMatch}/>}
      {page === 'home' && <HomeScreen setPage={setPage} start={openLobby} createRoom={room.createRoom} invitations={room.invitations} onAcceptInvitation={invitation=>{if(room.joinRoom(invitation.code,'',false,invitation.token))setPage('room')}} onDismissInvitation={room.dismissInvitation} favourites={player.data.favourites} matches={player.data.matches} />}
      {page === 'games' && <GamesScreen start={openLobby} favourites={player.data.favourites} onFavourite={player.toggleFavourite} />}
      {page === 'room' && <RoomScreen start={launchGame} selected={current} members={room.members} localMemberId={room.localMember.id} roomCode={room.roomCode} onJoinRoom={room.joinRoom} onWatchRoom={(code,password)=>{const joined=room.joinRoom(code,password,true);if(joined)setOpenSpectatorGame(true);return joined}} onCreateRoom={room.createRoom} onLeaveRoom={room.leaveRoom} sharedMemo={(room.gameState.memo as { text?: string } | undefined)?.text ?? ''} onMemo={(text)=>room.setGameState('memo',{text})} sharedDrawing={(room.gameState.drawing as { lines?: DrawLine[] } | undefined)?.lines ?? []} onDrawing={(lines)=>room.setGameState('drawing',{lines})} onToggleReady={room.toggleReady} onSelectGame={(key)=>{setSelected(key);room.selectGame(key)}} awayHistory={room.awayHistory} tournamentState={room.gameState.tournament} onTournament={(state)=>room.setGameState('tournament',state)} roomLocked={room.roomLocked} onSetPassword={room.setRoomPassword} roomInviteOnly={room.roomInviteOnly} onSetInviteOnly={room.setRoomInviteOnly} onReport={room.reportMember} />}
      {page === 'room' && room.spectators.length>0 && <section className="spectator-notice"><Users size={16}/><span>観戦中: {room.spectators.map(member=>member.name).join('、')}。観戦者はゲーム人数と開始条件に含まれません。</span></section>}
      {page === 'youtube' && <><YoutubeScreenV2 url={youtubeUrl} setUrl={setYoutubeUrl} paused={room.paused} sharedState={room.gameState.youtube} syncState={(state)=>room.setGameState('youtube',state)} /><YoutubeSearchPanel onSelect={url=>{setYoutubeUrl(url);room.setGameState('youtube',{...(room.gameState.youtube as Record<string,unknown> | undefined),url,playing:false,position:0,startedAt:Date.now()})}} /></>}
      {page === 'friends' && <><FriendsScreen roomCode={room.roomCode} onInvite={room.inviteFriend} /><RecentPlayersPanel players={player.data.recentPlayers} blockedPlayers={player.data.blockedPlayers} roomCode={room.roomCode} onInvite={room.sendChat} onBlock={player.blockPlayer} onUnblock={player.unblockPlayer}/></>}
      {page === 'profile' && <><AuthPanel defaultName={player.data.displayName}/><ProfileScreen data={player.data} onName={player.updateProfile} /><ProfileAppearance data={player.data} onSave={player.updateAppearance}/></>}
      {page === 'settings' && <SettingsScreenV2 brightness={brightness} setBrightness={setBrightness} shortcut={shortcut} setShortcut={setShortcut} />}
      {page === 'play' && <><header className="play-header"><button className="icon-button" onClick={()=>setPage('room')}><ChevronLeft /></button><span className="room-live"><i />ルーム {room.roomCode}　{room.members.length}人</span><button className="leave-button" onClick={beginAway}><MonitorDown size={17} />離席する <kbd>{shortcut}</kbd></button></header>{selected==='othello'?<Othello paused={room.paused} sharedState={room.gameState.othello} syncState={(state)=>room.setGameState('othello',state)} playerId={room.localMember.id} members={room.members}/>:selected==='gomoku'?<Gomoku paused={room.paused} sharedState={room.gameState.gomoku} syncState={(state)=>room.setGameState('gomoku',state)} playerId={room.localMember.id} members={room.members}/>:selected==='connect4'?<ConnectFour paused={room.paused} sharedState={room.gameState.connect4} syncState={(state)=>room.setGameState('connect4',state)} playerId={room.localMember.id} members={room.members}/>:selected==='oldmaid'?<OldMaidGame paused={room.paused} sharedState={room.gameState.oldmaid} syncState={(state)=>room.setGameState('oldmaid',state)} playerId={room.localMember.id} members={room.members}/>:selected==='uno'?<UnoGame paused={room.paused} sharedState={room.gameState.uno} syncState={(state)=>room.setGameState('uno',state)} playerId={room.localMember.id} members={room.members}/>:selected==='go'?<GoGame paused={room.paused} sharedState={room.gameState.go} syncState={(state)=>room.setGameState('go',state)} playerId={room.localMember.id} members={room.members}/>:selected==='chess'?<ChessGame paused={room.paused} sharedState={room.gameState.chess} syncState={(state)=>room.setGameState('chess',state)} playerId={room.localMember.id} members={room.members}/>:selected==='quiz'?<QuizGame paused={room.paused} sharedState={room.gameState.quiz} syncState={(state)=>room.setGameState('quiz',state)} playerId={room.localMember.id} members={room.members}/>:selected==='memory'?<MemoryGame paused={room.paused} sharedState={room.gameState.memory} syncState={(state)=>room.setGameState('memory',state)} playerId={room.localMember.id} members={room.members}/>:selected==='mines'?<MinesGame paused={room.paused} sharedState={room.gameState.mines} syncState={(state)=>room.setGameState('mines',state)} />:selected==='sugoroku'?<SugorokuGame paused={room.paused} sharedState={room.gameState.sugoroku} syncState={(state)=>room.setGameState('sugoroku',state)} playerId={room.localMember.id} members={room.members}/>:selected==='shiritori'?<ShiritoriGame paused={room.paused} sharedState={room.gameState.shiritori} syncState={(state)=>room.setGameState('shiritori',state)} playerId={room.localMember.id} members={room.members}/>:selected==='drawrelay'?<DrawRelayGame paused={room.paused} sharedState={room.gameState.drawrelay} syncState={(state)=>room.setGameState('drawrelay',state)} playerId={room.localMember.id} members={room.members}/>:selected==='werewolf'||selected==='wordwolf'?<DeductionGame title={current.title} gameKey={selected} paused={room.paused} sharedState={room.gameState[selected]} privateState={room.privateState[selected]} syncState={(state)=>room.setGameState(selected,state)} playerId={room.localMember.id} members={room.members}/>:selected==='tag'?<TagGame paused={room.paused} sharedState={room.gameState.tag} moveTag={room.moveTag} rematch={room.rematchTag} setMode={room.setTagMode} onFinished={(result)=>player.recordMatch('オンライン鬼ごっこ',result,room.gameState.tag)} playerId={room.localMember.id} members={room.members}/>:<RoundGame game={current} paused={room.paused} sharedState={room.gameState[selected]} syncState={(state)=>room.setGameState(selected,state)} playerId={room.localMember.id} members={room.members}/>}</>}
    </main>
    {page === 'play' && room.spectators.some(member=>member.id===room.localMember.id) && <section className="spectator-join panel"><div><b>観戦中です</b><small>{spectatorMessage || 'このラウンドが終わったら、参加者として次のラウンドに加われます。'}</small></div><button className="secondary" onClick={()=>void room.promoteSpectator().then(result=>setSpectatorMessage(result.ok?'参加準備ができました。ルームで準備OKにしてください。':result.message??'参加できませんでした'))}>次のラウンドに参加</button></section>}
    {(page === 'play' || page === 'room') && <ChatDock messages={room.messages} addMessage={room.sendChat} paused={room.paused} />}
    {captionsEnabled && (page === 'play' || page === 'room') && <StatusCaptions messages={room.messages} history={room.awayHistory} />}
    {(page === 'play' || page === 'room') && <VoiceChat playerId={room.localMember.id} sendSignal={room.sendSignal} onSignal={room.onSignal} announceVoice={room.announceVoice} onVoice={room.onVoice} />}
    {room.paused && <PauseOverlay awayNames={room.members.filter(member => member.away).map(member => member.name)} resume={room.resume} playerId={room.localMember.id} memberCount={room.members.length} isHost={room.members[0]?.id === room.localMember.id} onReady={room.setResumeReady} onCancel={room.cancelResume} sendMessage={room.sendChat} />}
    {(page === 'room' || page === 'play') && !room.connected && <ConnectionOverlay />}
    {showShortcut && <div className="shortcut-toast"><MonitorDown size={16} />離席モードを開始しました</div>}
  </div>
}

const dailyChallenges: { game: GameKey; title: string; description: string }[] = [
  { game: 'mines', title: '今日の協力ミッション', description: '協力マインスイーパーを地雷に当たらずクリアしよう。' },
  { game: 'quiz', title: '今日の早押し', description: 'クイズ早押しで3問連続の正解を目指そう。' },
  { game: 'tag', title: '今日の逃走ミッション', description: 'オンライン鬼ごっこで宝石を4つ集めて脱出しよう。' },
  { game: 'puzzle', title: '今日の連鎖チャレンジ', description: '落ちものパズルで2連鎖以上を決めよう。' },
  { game: 'othello', title: '今日の盤上対決', description: 'オセロで角を取り、最後まで対局を楽しもう。' },
  { game: 'shiritori', title: '今日のことばリレー', description: 'しりとりを10語以上つなげよう。' },
]
function todayChallenge() {
  const now = new Date()
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000)
  return dailyChallenges[day % dailyChallenges.length]
}
function HomeScreen({ setPage, start, createRoom, invitations, onAcceptInvitation, onDismissInvitation, favourites, matches }: { setPage:(p:Page)=>void; start:(g:GameKey)=>void; createRoom:()=>string; invitations: import('./useRoomSession').RoomInvitation[]; onAcceptInvitation:(invitation:import('./useRoomSession').RoomInvitation)=>void; onDismissInvitation:(id:string)=>void; favourites:string[]; matches: PlayerData['matches'] }) { const favouriteGames=games.filter(game=>favourites.includes(game.key)).slice(0,3);const recent=matches.map(match=>({match,game:games.find(game=>game.key===match.game||game.title===match.game)})).filter((item):item is {match:PlayerData['matches'][number];game:typeof games[number]}=>Boolean(item.game)).slice(0,3);const challenge=todayChallenge();return <div className="page home-page"><header className="topbar"><div><p className="eyebrow">FRIENDS, GAMES, ONE PLACE</p><h1>友達と、すぐ遊ぼう。</h1><p>ルームを作って集まる。急な離席も、みんなで待てる。</p></div><button className="icon-button"><Bell size={19}/></button></header><section className="hero-actions"><button className="action-card create" onClick={()=>{createRoom();setPage('room')}}><Plus/><span><b>ルームを作る</b><small>ゲームを選んで友達を招待</small></span><span className="action-arrow">→</span></button><button className="action-card join" onClick={()=>setPage('room')}><span className="join-icon"><Users /></span><span><b>コードで入る</b><small>ルームコードを入力して参加</small></span><span className="action-arrow">→</span></button></section>{invitations.length>0&&<section className="room-invitations panel" aria-label="届いたルーム招待"><p className="eyebrow">ROOM INVITATIONS</p>{invitations.map(invitation=><div key={invitation.id}><span><b>{invitation.from} さんからの招待</b><small>{games.find(game=>game.key===invitation.game)?.title??invitation.game} ・ ルーム {invitation.code}</small></span><button className="primary" onClick={()=>onAcceptInvitation(invitation)}>参加する</button><button className="text-button" onClick={()=>onDismissInvitation(invitation.id)}>閉じる</button></div>)}</section>}<section className="daily-card panel"><div><p className="eyebrow">DAILY CHALLENGE</p><h2>{challenge.title}</h2><p>{challenge.description}</p></div><button className="primary" onClick={()=>start(challenge.game)}>待機所へ</button></section>{favouriteGames.length>0&&<><section className="section-head compact"><div><p className="eyebrow">FAVOURITES</p><h2>お気に入り</h2></div></section><div className="favourite-row">{favouriteGames.map(game=>{const Icon=game.Icon;return <button key={game.key} onClick={()=>start(game.key)}><Icon/><span>{game.title}</span></button>})}</div></>}<section className="section-head compact"><div><p className="eyebrow">CONTINUE PLAYING</p><h2>最近遊んだゲーム</h2></div><button className="text-button" onClick={()=>setPage('profile')}>戦績を見る →</button></section><div className="room-list">{recent.length?recent.map(({match,game},index)=>{const Icon=game.Icon;const result=match.result==='win'?'勝利':match.result==='loss'?'敗北':'引き分け';return <button className="room-row" key={match.id} onClick={()=>start(game.key)}><span className={`game-orb orb-${index}`}>{<Icon />}</span><span><b>{game.title}</b><small>{new Date(match.playedAt).toLocaleDateString('ja-JP')} ・ {result}</small></span><span className="join-small">待機所へ</span></button>}):<section className="home-empty panel"><b>まだプレイ履歴はありません</b><small>ゲームを選んで最初の1戦を始めましょう。</small><button className="secondary" onClick={()=>setPage('games')}>ゲームを探す</button></section>}</div></div> }
const cooperativeGameKeys = new Set(['escape','future','mines','delivery','newsroom','alien','museum','thief','orchestra','letter','ghost','soundmaze','detective','bug'])
const advancedGameKeys = new Set(['shogi','chess','go','mahjong','werewolf','wordwolf','guard','sports','court'])
const gameFacts = (game: typeof games[number]) => {
  const [minimum = 1, maximum = minimum] = (game.players.match(/\d+/g) ?? ['1']).map(Number)
  const duration = Number((game.time.match(/\d+/) ?? ['10'])[0])
  return { minimum, maximum, duration, style: cooperativeGameKeys.has(game.key) ? '協力' : '対戦', difficulty: advancedGameKeys.has(game.key) ? 'じっくり' : duration <= 10 ? 'かんたん' : 'ふつう' }
}
function GamesScreen({ start, favourites, onFavourite }: { start:(g:GameKey)=>void; favourites:string[]; onFavourite:(game:string)=>void }) {
  const [filter,setFilter]=useState('すべて'); const [query,setQuery]=useState(''); const [players,setPlayers]=useState('すべて'); const [style,setStyle]=useState('すべて'); const [duration,setDuration]=useState('すべて'); const [difficulty,setDifficulty]=useState('すべて')
  const reset=()=>{setFilter('すべて');setQuery('');setPlayers('すべて');setStyle('すべて');setDuration('すべて');setDifficulty('すべて')}
  const activeFilters=[filter,query,players,style,duration,difficulty].some(value=>value!=='すべて'&&value!=='')
  const shown=games.filter(game=>{
    const facts=gameFacts(game); const playerMatches=players==='すべて'?true:players==='5+'?facts.maximum>=5:facts.minimum<=Number(players)&&facts.maximum>=Number(players)
    const durationMatches=duration==='すべて'||duration==='10分以内'?facts.duration<=10:duration==='20分以内'?facts.duration<=20:facts.duration>20
    return (filter==='すべて'||game.kind===filter)&&`${game.title} ${game.kind}`.includes(query.trim())&&playerMatches&&(style==='すべて'||facts.style===style)&&durationMatches&&(difficulty==='すべて'||facts.difficulty===difficulty)
  })
  return <div className="page"><header className="page-title"><div><p className="eyebrow">GAME LIBRARY</p><h1>ゲームを選ぶ</h1><p>人数や気分に合わせて、すぐルームを作れます。</p></div><label className="search"><Search size={17}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="ゲームを検索" /></label></header><div className="filters">{['すべて','ボード','カード','アクション','協力・推理','パーティー'].map(item=><button key={item} className={filter===item?'selected':''} onClick={()=>setFilter(item)}>{item}</button>)}</div><section className="game-filter-bar panel" aria-label="ゲームの絞り込み"><label>人数<select value={players} onChange={event=>setPlayers(event.target.value)}><option>すべて</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5+</option></select></label><label>遊び方<select value={style} onChange={event=>setStyle(event.target.value)}><option>すべて</option><option>対戦</option><option>協力</option></select></label><label>所要時間<select value={duration} onChange={event=>setDuration(event.target.value)}><option>すべて</option><option>10分以内</option><option>20分以内</option><option>じっくり</option></select></label><label>難易度<select value={difficulty} onChange={event=>setDifficulty(event.target.value)}><option>すべて</option><option>かんたん</option><option>ふつう</option><option>じっくり</option></select></label><button className="text-button" disabled={!activeFilters} onClick={reset}>絞り込みを解除</button></section><p className="game-result-count">{shown.length}件のゲーム</p><div className="game-grid">{shown.map(game=>{const Icon=game.Icon;const favourite=favourites.includes(game.key);return <article className={`game-card ${game.ready?'':'coming'}`} key={game.key}><div className="game-visual"><Icon /><button className={`favourite-button ${favourite?'saved':''}`} aria-label={`${game.title}をお気に入りにする`} onClick={()=>onFavourite(game.key)}><FaRegStar/></button><em>{game.ready?'今すぐ遊べる':'準備中'}</em></div><div className="game-copy"><div><span className="game-kind">{game.kind}</span><h2>{game.title}</h2></div><p>{game.description}</p><small><Users size={14}/>{game.players}<span/><Circle size={11}/> {game.time}</small></div><button className={game.ready?'primary':'secondary'} disabled={!game.ready} onClick={()=>game.ready&&start(game.key as GameKey)}>{game.ready?'このゲームで遊ぶ':'近日追加'}</button></article>})}</div>{shown.length===0&&<section className="empty-copy game-empty"><p>該当するゲームが見つかりません。</p><button className="secondary" onClick={reset}>絞り込みを解除する</button></section>}</div>
}
function DrawingBoard({ lines, onChange }: { lines: DrawLine[]; onChange: (lines: DrawLine[]) => void }) {
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const current = useRef<DrawLine | null>(null)
  const draw = (all: DrawLine[]) => { const ctx = canvas.current?.getContext('2d'); if (!ctx || !canvas.current) return; ctx.clearRect(0, 0, 320, 200); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 3; all.forEach(line => { if (line.points.length < 2) return; ctx.beginPath(); ctx.strokeStyle = line.color; ctx.moveTo(line.points[0].x, line.points[0].y); line.points.slice(1).forEach(point => ctx.lineTo(point.x, point.y)); ctx.stroke() }) }
  useEffect(() => draw(lines), [lines])
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => { const rect = event.currentTarget.getBoundingClientRect(); return { x: (event.clientX - rect.left) * 320 / rect.width, y: (event.clientY - rect.top) * 200 / rect.height } }
  return <div className="drawing-box"><canvas ref={canvas} width="320" height="200" onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);current.current={color:'#68d8df',points:[point(event)]}}} onPointerMove={event=>{if(!current.current)return;current.current.points.push(point(event));draw([...lines,current.current])}} onPointerUp={()=>{if(current.current)onChange([...lines,current.current]);current.current=null}}/><div><small>描いて共有できます</small><button className="text-button" onClick={()=>onChange([])}>消去</button></div></div>
}
type TournamentState = { game: string; round: number; matches: { id: string; a: string; b?: string; winner?: string }[]; champion?: string }
function TournamentPanel({ members, game, state: sharedState, syncState }: { members: RoomMember[]; game: typeof games[number]; state: unknown; syncState: (state: TournamentState) => void }) {
  const state = sharedState as TournamentState | undefined
  const names = (id?: string) => members.find(member => member.id === id)?.name ?? '不戦勝'
  const create = () => {
    if (members.length < 2) return
    const ids = members.map(member => member.id).sort(() => Math.random() - .5)
    const matches = Array.from({ length: Math.ceil(ids.length / 2) }, (_, index) => ({ id: `r1-${index}`, a: ids[index * 2], b: ids[index * 2 + 1] }))
    syncState({ game: game.key, round: 1, matches })
  }
  const selectWinner = (matchId: string, winner: string) => {
    if (!state) return
    const matches = state.matches.map(match => match.id === matchId ? { ...match, winner } : match)
    if (!matches.every(match => match.winner || !match.b)) return syncState({ ...state, matches })
    const winners = matches.map(match => match.winner ?? match.a)
    if (winners.length === 1) return syncState({ ...state, matches, champion: winners[0] })
    const nextRound = state.round + 1
    syncState({ ...state, round: nextRound, matches: Array.from({ length: Math.ceil(winners.length / 2) }, (_, index) => ({ id: `r${nextRound}-${index}`, a: winners[index * 2], b: winners[index * 2 + 1] })) })
  }
  return <section className="tournament panel"><div><p className="eyebrow">ROOM TOURNAMENT</p><h2>ルーム内大会</h2><p>{state ? `${game.title} ・ 第 ${state.round} ラウンド` : '参加者で自動トーナメントを作成します。'}</p></div>{!state ? <button className="secondary" disabled={members.length < 2} onClick={create}>大会を作成</button> : state.champion ? <div className="tournament-champion"><Crown size={17}/>{names(state.champion)} さんが優勝</div> : <div className="tournament-matches">{state.matches.map(match=><div key={match.id}><span>{names(match.a)} {match.b ? 'vs' : 'は不戦勝'} {match.b && names(match.b)}</span>{match.b && <span>{[match.a, match.b].map(id=><button key={id} className={match.winner===id?'selected':''} disabled={Boolean(match.winner)} onClick={()=>selectWinner(match.id,id)}>{names(id)} の勝ち</button>)}</span>}</div>)}</div>}</section>
}
function RoomQr({ roomCode }: { roomCode: string }) { const [src,setSrc]=useState('');useEffect(()=>{let active=true;QRCode.toDataURL(`hidegames://room/${roomCode}`,{width:160,margin:1,color:{dark:'#08111e',light:'#f4fbfc'}}).then(url=>{if(active)setSrc(url)});return()=>{active=false}},[roomCode]);return <aside className="room-qr panel"><p className="eyebrow">SCAN TO JOIN</p>{src?<img src={src} alt={`ルーム ${roomCode} のQRコード`}/>:<span>生成中</span>}<small>カメラで読み取って参加</small></aside>}
function RoomScreen({ start, selected, members, localMemberId, roomCode, onJoinRoom, onWatchRoom, onCreateRoom, onLeaveRoom, sharedMemo, onMemo, sharedDrawing, onDrawing, onToggleReady, onSelectGame, awayHistory, tournamentState, onTournament, roomLocked, onSetPassword, roomInviteOnly, onSetInviteOnly, onReport }: { start: () => void; selected: typeof games[number]; members: RoomMember[]; localMemberId: string; roomCode: string; onJoinRoom: (code: string, password?: string, spectator?: boolean) => boolean; onWatchRoom: (code: string, password?: string) => boolean; onCreateRoom: () => string; onLeaveRoom: () => Promise<{ ok: boolean; message?: string }>; sharedMemo: string; onMemo: (text: string) => void; sharedDrawing: DrawLine[]; onDrawing: (lines: DrawLine[]) => void; onToggleReady: () => void; onSelectGame: (game: GameKey) => void; awayHistory: { id: string; name: string; away: boolean; at: number }[]; tournamentState: unknown; onTournament: (state: TournamentState) => void; roomLocked: boolean; onSetPassword: (password: string) => void; roomInviteOnly: boolean; onSetInviteOnly: (inviteOnly: boolean) => void; onReport: (targetId: string, reason: string) => void }) {
  const [copied, setCopied] = useState(false)
  const [inputCode, setInputCode] = useState('')
  const [inputPassword, setInputPassword] = useState('')
  const [roomPassword, setRoomPassword] = useState('')
  const [roomError, setRoomError] = useState('')
  const [sideTab, setSideTab] = useState<'memo' | 'drawing'>('memo')
  const [showRules, setShowRules] = useState(false)
  useEffect(() => {
    const showError = (event: Event) => { const message = (event as CustomEvent<string>).detail; if (typeof message === 'string') setRoomError(message) }
    window.addEventListener('hidegames-room-error', showError)
    return () => window.removeEventListener('hidegames-room-error', showError)
  }, [])
  const GameIcon = selected.Icon
  const local = members.find(member => member.id === localMemberId)
  const reconnecting = members.filter(member => member.connected === false)
  const removableMembers = members.filter(member => member.id !== localMemberId && (member.connected === false || member.away))
  const minimumPlayers = Number(/^\d+/.exec(selected.players)?.[0] ?? 1)
  const maximumPlayers = Number((selected.players.match(/\d+/g) ?? [String(minimumPlayers)]).at(-1))
  const host = Boolean(local?.host)
  const canStart = host && members.length >= minimumPlayers && members.length <= maximumPlayers && members.every(member => member.ready && member.connected !== false)
  const modeTitle = selected.key === 'tag' ? '宝石回収' : selected.kind
  const modeDescription = selected.key === 'tag' ? '宝石を4つ集めて出口を目指そう。鬼はそれを阻止！' : selected.description
  const watchRoom=()=>{const code=window.prompt('観戦するルームコードを入力してください',roomCode);if(!code)return;const password=window.prompt('パスワードがある場合は入力してください','')??'';if(onWatchRoom(code,password))setRoomError('観戦ルームへ接続しています…');else setRoomError('英数字6文字のルームコードを入力してください')}
  return <div className="page room-page">
    <header className="room-header"><div><button className="back-link" onClick={()=>window.dispatchEvent(new Event('hidegames-open-home'))}><ChevronLeft size={17}/>ホーム</button><h1>{selected.title}</h1><p>ルームコード <b>{roomCode}</b></p></div><div className="room-invite-actions"><RoomQr roomCode={roomCode}/><button className="secondary" onClick={()=>{navigator.clipboard?.writeText(`hidegames://room/${roomCode}`);setCopied(true)}}><Copy size={16}/>{copied?'コピーしました':'招待リンクをコピー'}</button><button className="text-button room-leave" onClick={()=>{if(window.confirm(members.length===1?'このルームを退出して閉じますか？':'ルームを退出しますか？ 他の参加者はそのまま続けられます。'))void onLeaveRoom().then(result=>{if(result.ok)window.dispatchEvent(new Event('hidegames-open-home'));else setRoomError(result.message??'ルームを退出できませんでした')})}}>ルームを退出</button></div></header>
    <section className="room-access panel"><div><b>別のルームに参加</b><small>6文字のルームコードと、必要な場合はパスワードを入力</small></div><form onSubmit={event=>{event.preventDefault();if(onJoinRoom(inputCode,inputPassword)){setInputCode('');setInputPassword('');setRoomError('')}else setRoomError('英数字6文字のコードを入力してください')}}><input aria-label="ルームコード" value={inputCode} maxLength={6} onChange={event=>setInputCode(event.target.value.toUpperCase())} placeholder="例: A7K9P2"/><input aria-label="ルームパスワード" value={inputPassword} type="password" onChange={event=>setInputPassword(event.target.value)} placeholder="パスワード（任意）"/><button className="secondary">参加する</button><button type="button" className="primary" onClick={()=>{onCreateRoom();setRoomError('')}}>新しいルームを作る</button></form>{members.find(member=>member.id===localMemberId)?.host&&<div className="room-password"><label>このルームのパスワード<input type="password" value={roomPassword} onChange={event=>setRoomPassword(event.target.value)} placeholder={roomLocked?'設定済み':'空欄で公開ルーム'}/></label><button className="text-button" onClick={()=>onSetPassword(roomPassword)}>{roomLocked?'パスワードを更新':'パスワードを設定'}</button><label className="room-invite-only"><span><b>招待限定にする</b><small>ルームコードだけでは参加できず、フレンド招待が必要です。</small></span><button type="button" className={`switch ${roomInviteOnly?'on':''}`} aria-pressed={roomInviteOnly} onClick={()=>onSetInviteOnly(!roomInviteOnly)}><i/></button></label></div>}{roomError&&<p role="alert">{roomError}</p>}</section>
    <button className="text-button" onClick={watchRoom}>観戦で参加する</button><div className="room-layout">
      {local?.host && removableMembers.length > 0 && <section className="panel"><p className="eyebrow">HOST ACTION</p><h3>退出処理ができる参加者</h3><p className="host-action-copy">離席中または再接続待ちの参加者は、確認後にルームから退出させられます。</p>{removableMembers.map(member => <button key={member.id} className="text-button" onClick={() => { if (window.confirm(`${member.name} さんをルームから退出させますか？`)) window.dispatchEvent(new CustomEvent('hidegames-remove-member', { detail: member.id })) }}>{member.name} さんを退出させる</button>)}</section>}
      <section className="room-members panel"><div className="panel-title"><h2>参加メンバー <small>{members.length} / {maximumPlayers}</small></h2><span className={`live-dot ${reconnecting.length ? 'reconnecting' : ''}`}>{reconnecting.length ? `再接続中 ${reconnecting.length}人` : '全員接続中'}</span></div>{members.map(member=><div className={`member ${member.connected === false ? 'reconnecting' : ''}`} key={member.id}><span className={`avatar ${member.color}`}>{initials(member.name)}</span><span className="member-name">{member.name}{member.host&&<Crown size={14}/>}</span><span className={`ready ${member.ready?'yes':''}`}>{member.connected === false ? <><Radio size={13}/>再接続中</> : member.away ? '一時離席中' : <>{member.ready?<CheckCircle2 size={14}/>:<Circle size={14}/>} {member.ready?'準備OK':'準備中'}</>}</span>{member.id!==localMemberId&&<button className="member-report" onClick={()=>{if(window.confirm(`${member.name} さんを通報しますか？`))onReport(member.id,'ルーム内通報')}}>通報</button>}</div>)}<button className="secondary ready-toggle" onClick={onToggleReady}>{local?.ready?<Circle size={16}/>:' '} {local?.ready?'準備を解除':'準備OKにする'}</button><button className="invite" onClick={()=>window.dispatchEvent(new Event('hidegames-open-friends'))}><Plus size={16}/>フレンドを招待</button>{awayHistory.length>0&&<div className="away-history"><b>離席履歴</b>{awayHistory.slice(-3).reverse().map(item=><small key={item.id}>{item.name} さんが{item.away?'離席':'復帰'}しました</small>)}</div>}</section>
      <section className="room-center"><div className="selected-game panel"><div className="selected-icon"><GameIcon /></div><div><span className="game-kind">{selected.kind}</span><h2>{selected.title}</h2><p>{selected.players} ・ {selected.time}　{selected.description}</p></div><button className="text-button" onClick={()=>setShowRules(value=>!value)} aria-expanded={showRules}><CircleHelp size={16}/>{showRules?'ルールを閉じる':'ルール'}</button></div>{showRules&&<section className="panel"><p className="eyebrow">HOW TO PLAY</p><h3>{selected.title}</h3><p>{selected.description}</p><small>必要人数: {selected.players}。開始前に参加者全員が準備OKになる必要があります。</small></section>}<div className="mode-card panel"><p className="eyebrow">GAME MODE</p><h3>{modeTitle}</h3><p>{modeDescription}</p><div className="room-game-picker">{games.filter(game=>game.ready).map(game=>{const Icon=game.Icon;return <button key={game.key} disabled={!host} onClick={()=>host&&onSelectGame(game.key as GameKey)} className={game.key===selected.key?'active':''}><Icon />{game.title}</button>})}</div></div><TournamentPanel members={members} game={selected} state={tournamentState} syncState={onTournament}/><button className="primary start" onClick={start} disabled={!canStart}><Play size={18} fill="currentColor"/>{canStart?'ゲームを開始':!host?'ホストが開始します':reconnecting.length?'再接続を待っています':members.length<minimumPlayers?`あと${minimumPlayers-members.length}人の参加を待っています`:members.length>maximumPlayers?`このゲームは最大${maximumPlayers}人です`:'全員の準備を待っています'}</button></section>
      <section className="room-side panel"><div className="tabs"><button className={sideTab==='memo'?'active':''} onClick={()=>setSideTab('memo')}>共有メモ</button><button className={sideTab==='drawing'?'active':''} onClick={()=>setSideTab('drawing')}>お絵描き</button></div>{sideTab==='memo'?<div className="memo-box"><label htmlFor="shared-memo">ルームのみんなで編集できます</label><textarea id="shared-memo" value={sharedMemo} onChange={event=>onMemo(event.target.value)} placeholder="作戦、ルール、手がかりをメモ…" /></div>:<DrawingBoard lines={sharedDrawing} onChange={onDrawing}/>}<button className="youtube-mini" onClick={()=>window.dispatchEvent(new Event('hidegames-open-youtube'))}><Video size={16}/>動画URLを貼り付ける</button></section>
    </div>
  </div>
}
function YoutubeScreenV2({ url, setUrl, paused, sharedState, syncState }: { url: string; setUrl: (url: string) => void; paused: boolean; sharedState: unknown; syncState: (state: unknown) => void }) {
  const frame = useRef<HTMLIFrameElement | null>(null)
  const [input, setInput] = useState(url)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const volume=useSavedVolume('youtube')
  const shared = sharedState as { url?: string; playing?: boolean; position?: number; startedAt?: number; pauseOnAway?: boolean; links?: { url: string; label: string }[] } | undefined
  const pauseOnAway=shared?.pauseOnAway!==false
  const activeUrl = shared?.url || url
  const embed = useMemo(() => { try { const parsed=new URL(activeUrl);const list=parsed.searchParams.get('list');const id=activeUrl.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1];const base=list?`https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(list)}`:id?`https://www.youtube.com/embed/${id}`:'';return base?`${base}${base.includes('?')?'&':'?'}rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`:'' } catch { return '' } }, [activeUrl])
  const command = (func: string, args: unknown[] = []) => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*')
  const requestPosition = () => command('getCurrentTime')
  useEffect(() => { const onMessage = (event: MessageEvent) => { if (typeof event.data !== 'string' || !event.data.includes('currentTime')) return; try { const data = JSON.parse(event.data); if (typeof data.info?.currentTime === 'number') setPosition(data.info.currentTime) } catch { /* YouTube以外のpostMessageは無視 */ } }; window.addEventListener('message', onMessage); return () => window.removeEventListener('message', onMessage) }, [])
  useEffect(() => { if (!shared) return; setInput(shared.url ?? '');setUrl(shared.url ?? '');setPlaying(Boolean(shared.playing));const nextPosition=(shared.position ?? 0)+(shared.playing&&shared.startedAt?(Date.now()-shared.startedAt)/1000:0);setPosition(nextPosition);command('seekTo',[nextPosition,true]);command(shared.playing?'playVideo':'pauseVideo') }, [sharedState])
  useEffect(()=>{command('setVolume',[volume])},[embed,volume])
  const publish = (nextUrl=input,nextPlaying=playing,nextPosition=position) => { setUrl(nextUrl);setPlaying(nextPlaying);syncState({url:nextUrl,playing:nextPlaying,position:nextPosition,startedAt:Date.now(),pauseOnAway}) }
  useEffect(()=>{if(paused&&pauseOnAway)command('pauseVideo');else command(playing?'playVideo':'pauseVideo')},[paused,pauseOnAway,playing,embed])
  useEffect(() => { if (!playing) return; const timer=window.setInterval(requestPosition,2000); return () => window.clearInterval(timer) }, [playing])
  const links=Array.isArray(shared?.links)?shared.links.filter(link=>typeof link?.url==='string'&&typeof link?.label==='string').slice(0,12):[]
  return <div className="page youtube-page"><header className="page-title"><div><p className="eyebrow">WATCH TOGETHER</p><h1>YouTubeを一緒に見る</h1><p>動画URL、再生状態、再生位置をルームで同期します。</p></div></header><div className="youtube-box panel">{embed?<iframe ref={frame} src={embed} title="YouTube player" onLoad={()=>command('setVolume',[volume])} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>:<div className="video-empty"><Video size={40}/><h2>動画を再生しよう</h2><p>YouTubeの動画URLまたはプレイリストURLを貼り付けてください。</p></div>}<form onSubmit={event=>{event.preventDefault();publish(input,false,0)}}><input value={input} onChange={event=>setInput(event.target.value)} placeholder="https://www.youtube.com/watch?v=..."/><button className="primary">ルームに共有</button></form></div><div className="youtube-controls"><button className="primary" disabled={!embed||paused} onClick={()=>{requestPosition();command('playVideo');publish(input,true,position)}}><Play size={16} fill="currentColor"/>全員で再生</button><button className="secondary" disabled={!embed} onClick={()=>{requestPosition();command('pauseVideo');publish(input,false,position)}}><Pause size={16}/>全員で停止</button><span>{playing ? `再生中 ${Math.floor(position / 60)}:${String(Math.floor(position % 60)).padStart(2,'0')}` : '停止中'} ・ 音量 {volume}%</span></div><div className="sync-note"><Radio size={18}/><span><b>離席時の動画</b><small>{pauseOnAway?'誰かが離席すると動画も全員で停止します。':'ゲームだけを停止し、動画は各自で継続します。'}</small><button className="text-button" onClick={()=>syncState({...shared,url:activeUrl,playing,position,startedAt:Date.now(),pauseOnAway:!pauseOnAway})}>{pauseOnAway?'動画を各自で継続':'動画も全員で停止'}</button></span></div><ExternalLinksPanel links={links} onChange={nextLinks=>syncState({...shared,url:activeUrl,playing,position,startedAt:Date.now(),pauseOnAway,links:nextLinks})}/></div>
}
function ExternalLinksPanel({ links, onChange }: { links: { url: string; label: string }[]; onChange: (links: { url: string; label: string }[]) => void }) {
  const [input,setInput]=useState('');const [error,setError]=useState('')
  const add=(event:React.FormEvent)=>{event.preventDefault();try{const parsed=new URL(input.trim());if(!['https:','http:'].includes(parsed.protocol))throw new Error();if(links.some(link=>link.url===parsed.toString())){setError('このリンクはすでに共有されています');return}onChange([...links,{url:parsed.toString(),label:parsed.hostname.replace(/^www\./,'')}]);setInput('');setError('')}catch{setError('HTTPまたはHTTPSのURLを入力してください')}}
  return <section className="external-links panel" aria-label="外部リンク共有"><div><p className="eyebrow">SHARED LINKS</p><h2><LinkIcon size={18}/>外部リンク</h2><p>Twitch、SpotifyなどのURLをルームに共有できます。</p></div><form onSubmit={add}><input aria-label="外部リンクURL" value={input} onChange={event=>setInput(event.target.value)} placeholder="https://www.twitch.tv/... または SpotifyのURL"/><button className="secondary">共有する</button></form>{error&&<p className="link-error" role="alert">{error}</p>}{links.length>0?<ul>{links.map(link=><li key={link.url}><a href={link.url} target="_blank" rel="noreferrer"><LinkIcon size={14}/><span><b>{link.label}</b><small>{link.url}</small></span></a><button className="text-button" onClick={()=>onChange(links.filter(item=>item.url!==link.url))}>削除</button></li>)}</ul>:<p className="link-empty">まだ共有リンクはありません。</p>}</section>
}
function YoutubeSearchPanel({ onSelect }: { onSelect: (url: string) => void }) {
  const [query,setQuery]=useState('');const [items,setItems]=useState<{id:string;title:string;channel?:string;thumbnail?:string}[]>([]);const [status,setStatus]=useState('')
  const search=async(event:React.FormEvent)=>{event.preventDefault();const text=query.trim();if(!text)return;setStatus('検索中…');try{const response=await fetch(`/api/youtube/search?q=${encodeURIComponent(text)}`);const data=await response.json();if(!response.ok)throw new Error(data.error);setItems(Array.isArray(data.items)?data.items:[]);setStatus(data.items?.length?'':'見つかりませんでした')}catch(error){setItems([]);setStatus(error instanceof Error?error.message:'検索に失敗しました')}}
  return <section className="page youtube-search"><div className="panel"><p className="eyebrow">YOUTUBE SEARCH</p><h2>動画を検索</h2><form onSubmit={search}><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="動画タイトルやチャンネル名"/><button className="secondary">検索</button></form>{status&&<p className="setting-status">{status}</p>}{items.map(item=><button className="text-button" key={item.id} onClick={()=>onSelect(`https://www.youtube.com/watch?v=${item.id}`)}>{item.thumbnail&&<img src={item.thumbnail} alt=""/>}<span><b>{item.title}</b><small>{item.channel}</small></span></button>)}</div></section>
}
function YoutubeScreen({ url, setUrl, sharedState, syncState }: { url: string; setUrl: (url: string) => void; sharedState: unknown; syncState: (state: unknown) => void }) {
  const frame = useRef<HTMLIFrameElement | null>(null)
  const [input, setInput] = useState(url)
  const [playing, setPlaying] = useState(false)
  const shared = sharedState as { url?: string; playing?: boolean; startedAt?: number } | undefined
  const activeUrl = shared?.url || url
  const embed = useMemo(() => { const id = activeUrl.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1]; return id ? `https://www.youtube.com/embed/${id}?rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}` : '' }, [activeUrl])
  const command = (func: 'playVideo' | 'pauseVideo') => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*')
  useEffect(() => { if (!shared) return; setInput(shared.url ?? ''); setUrl(shared.url ?? ''); setPlaying(Boolean(shared.playing)); if (shared.playing) command('playVideo'); else command('pauseVideo') }, [sharedState])
  const publish = (nextUrl = input, nextPlaying = playing) => { setUrl(nextUrl); setPlaying(nextPlaying); syncState({ url: nextUrl, playing: nextPlaying, startedAt: Date.now() }) }
  return <div className="page youtube-page"><header className="page-title"><div><p className="eyebrow">WATCH TOGETHER</p><h1>YouTubeを一緒に見る</h1><p>ルームの参加者へ、動画URLと再生状態を共有します。</p></div></header><div className="youtube-box panel">{embed?<iframe ref={frame} src={embed} title="YouTube player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>:<div className="video-empty"><Video size={40}/><h2>動画を再生しよう</h2><p>YouTubeの動画URLまたはプレイリストURLを貼り付けてください。</p></div>}<form onSubmit={event=>{event.preventDefault();publish(input, false)}}><input value={input} onChange={event=>setInput(event.target.value)} placeholder="https://www.youtube.com/watch?v=..."/><button className="primary">ルームに共有</button></form></div><div className="youtube-controls"><button className="primary" disabled={!embed} onClick={()=>{command('playVideo');publish(input,true)}}><Play size={16} fill="currentColor"/>全員で再生</button><button className="secondary" disabled={!embed} onClick={()=>{command('pauseVideo');publish(input,false)}}><Pause size={16}/>全員で停止</button><span>{playing ? '再生状態を共有中' : '停止状態を共有中'}</span></div><div className="sync-note"><Radio size={18}/><span><b>同期視聴</b><small>動画URLと再生・停止をルーム内で同期します。自動再生はブラウザの音声ポリシーに従います。</small></span></div></div>
}
type FriendEntry = { id?: string; name: string; color: string; remote?: boolean; online?: boolean }
function RecentPlayersPanel({ players, blockedPlayers, roomCode, onInvite, onBlock, onUnblock }: { players: PlayerData['recentPlayers']; blockedPlayers: PlayerData['blockedPlayers']; roomCode: string; onInvite: (message: string) => void; onBlock: (player: { id: string; name: string }) => void; onUnblock: (id: string) => void }) {
  if(!players.length&&!blockedPlayers.length)return null
  return <section className="page recent-players"><header className="section-head"><div><p className="eyebrow">RECENT PLAYERS</p><h2>最近遊んだ相手</h2></div></header>{players.length>0&&<div className="panel">{players.slice(0,6).map(player=><div className="friend" key={player.id}><span className={`avatar ${player.color}`}>{initials(player.name)}</span><span><b>{player.name}</b><small>最近一緒に遊びました</small></span><button className="secondary" onClick={()=>onInvite(`${player.name} さんをルーム ${roomCode} に再招待しました`)}>再招待する</button><button className="text-button" onClick={()=>{if(window.confirm(`${player.name} さんをブロックしますか？ 再招待候補から除外されます。`))onBlock(player)}}>ブロック</button></div>)}</div>}{blockedPlayers.length>0&&<div className="panel blocked-players"><p className="eyebrow">BLOCKED</p>{blockedPlayers.map(player=><div className="friend" key={player.id}><span><b>{player.name}</b><small>再招待候補から除外中</small></span><button className="text-button" onClick={()=>onUnblock(player.id)}>ブロックを解除</button></div>)}</div>}</section>
}
function FriendsScreen({ roomCode, onInvite }: { roomCode: string; onInvite: (targetId: string) => Promise<{ ok: boolean; message?: string }> }) {
  const [localFriends, setLocalFriends] = useState<FriendEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('hidegames.friends') ?? 'null') ?? people.slice(1).map(({ name, color }) => ({ name, color })) }
    catch { return people.slice(1).map(({ name, color }) => ({ name, color })) }
  })
  const [remoteFriends, setRemoteFriends] = useState<FriendEntry[]>([])
  const [loggedIn, setLoggedIn] = useState(() => Boolean(localStorage.getItem('hidegames.auth-token')))
  const [input, setInput] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const apiBase = () => {
    const localHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    return import.meta.env.VITE_SOCKET_URL || (localHost ? `http://${window.location.hostname}:3001` : window.location.origin)
  }
  const loadRemoteFriends = async () => {
    const token = localStorage.getItem('hidegames.auth-token')
    if (!token) return
    setLoading(true)
    try {
      const response = await fetch(`${apiBase()}/api/friends`, { headers: { Authorization: `Bearer ${token}` } })
      const body = await response.json() as { friends?: { id: string; display_name: string; online?: boolean }[]; error?: string }
      if (!response.ok) throw new Error(body.error ?? 'フレンド一覧を取得できませんでした')
      setRemoteFriends((body.friends ?? []).map((friend, index) => ({ id: friend.id, name: friend.display_name, color: ['mint', 'purple', 'blue', 'orange'][index % 4], remote: true, online: Boolean(friend.online) })))
    } catch (error) { setNotice(error instanceof Error ? error.message : 'フレンド一覧を取得できませんでした') }
    finally { setLoading(false) }
  }
  useEffect(() => localStorage.setItem('hidegames.friends', JSON.stringify(localFriends)), [localFriends])
  useEffect(() => {
    const refresh = () => setLoggedIn(Boolean(localStorage.getItem('hidegames.auth-token')))
    window.addEventListener('hidegames-auth', refresh)
    return () => window.removeEventListener('hidegames-auth', refresh)
  }, [])
  useEffect(() => { if (!loggedIn) return; void loadRemoteFriends(); const timer = window.setInterval(() => void loadRemoteFriends(), 20_000); return () => window.clearInterval(timer) }, [loggedIn])
  const add = async (event: React.FormEvent) => {
    event.preventDefault()
    const next = input.trim()
    if (!next) return
    if (!loggedIn) {
      if (localFriends.some(friend => friend.name === next)) { setNotice('同じ名前のフレンドは追加済みです'); return }
      setLocalFriends(current => [...current, { name: next, color: 'blue' }])
      setInput(''); setNotice(`${next} さんをこの端末のフレンドに追加しました`)
      return
    }
    const token = localStorage.getItem('hidegames.auth-token')
    if (!token) return
    setLoading(true)
    try {
      const response = await fetch(`${apiBase()}/api/friends`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ email: next }) })
      const body = await response.json() as { friend?: { display_name: string }; error?: string }
      if (!response.ok) throw new Error(body.error ?? 'フレンドを追加できませんでした')
      setInput(''); setNotice(`${body.friend?.display_name ?? next} さんをフレンドに追加しました`)
      await loadRemoteFriends()
    } catch (error) { setNotice(error instanceof Error ? error.message : 'フレンドを追加できませんでした') }
    finally { setLoading(false) }
  }
  const remove = async (friend: FriendEntry) => {
    if (!friend.remote || !friend.id) { setLocalFriends(current => current.filter(item => item.name !== friend.name)); return }
    const token = localStorage.getItem('hidegames.auth-token')
    if (!token) return
    setLoading(true)
    try {
      const response = await fetch(`${apiBase()}/api/friends/${encodeURIComponent(friend.id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      const body = await response.json() as { error?: string }
      if (!response.ok) throw new Error(body.error ?? 'フレンドを削除できませんでした')
      setRemoteFriends(current => current.filter(item => item.id !== friend.id))
      setNotice(`${friend.name} さんをフレンドから削除しました`)
    } catch (error) { setNotice(error instanceof Error ? error.message : 'フレンドを削除できませんでした') }
    finally { setLoading(false) }
  }
  const invite = async (friend: FriendEntry) => {
    if (!friend.remote || !friend.id) { setNotice('オンライン同期したフレンドを招待できます'); return }
    setLoading(true)
    const result = await onInvite(friend.id)
    setLoading(false)
    setNotice(result.ok ? `${friend.name} さんへルーム ${roomCode} の招待を送りました` : result.message ?? '招待を送信できませんでした')
  }
  const friends = loggedIn ? remoteFriends : localFriends
  return <div className="page"><header className="page-title"><div><p className="eyebrow">YOUR PEOPLE</p><h1>フレンド</h1><p>{loggedIn ? 'メールアドレスで追加したフレンドは、ログインした他の端末にも同期されます。' : 'ログインするとフレンドを複数の端末で同期できます。'}</p></div></header><form className="friend-add panel" onSubmit={add}><input value={input} onChange={event => setInput(event.target.value)} placeholder={loggedIn ? 'フレンドのメールアドレス' : 'フレンド名を入力'} type={loggedIn ? 'email' : 'text'} required/><button className="primary" disabled={loading}><Plus size={17}/>{loading ? '同期中' : '追加'}</button></form><div className="friends-list panel">{loading && !friends.length ? <p className="empty-state">フレンドを読み込んでいます。</p> : friends.length ? friends.map(friend => <div className="friend" key={friend.id ?? friend.name}><span className={`avatar ${friend.color}`}>{initials(friend.name)}</span><span><b>{friend.name}</b><small><i className={friend.remote && !friend.online ? 'offline' : ''}/> {friend.remote ? `${friend.online ? 'オンライン' : 'オフライン'} ・ ルームへ招待できます` : 'この端末のフレンド'}</small></span><button className="secondary" disabled={loading || !friend.remote || !friend.online} onClick={() => void invite(friend)}>招待する</button><button className="text-button" onClick={() => void remove(friend)} disabled={loading}>削除</button></div>) : <p className="empty-state">{loggedIn ? 'まだフレンドはいません。メールアドレスで追加してください。' : 'フレンド名を追加するか、ログインして同期を始めてください。'}</p>}</div>{notice && <p className="setting-status">{notice}</p>}</div>
}
function AuthPanel({ defaultName }: { defaultName: string }) {
  const [mode,setMode]=useState<'login'|'signup'>('signup'); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [name,setName]=useState(defaultName); const [status,setStatus]=useState(''); const [loggedIn,setLoggedIn]=useState(()=>Boolean(localStorage.getItem('hidegames.auth-token')))
  useEffect(()=>{const refresh=()=>setLoggedIn(Boolean(localStorage.getItem('hidegames.auth-token')));window.addEventListener('hidegames-auth',refresh);return()=>window.removeEventListener('hidegames-auth',refresh)},[])
  const submit=async(event:React.FormEvent)=>{event.preventDefault();setStatus('認証中…');try{const localHost=['localhost','127.0.0.1'].includes(window.location.hostname);const base=import.meta.env.VITE_SOCKET_URL||(localHost?`http://${window.location.hostname}:3001`:window.location.origin);const response=await fetch(`${base}/auth/${mode}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,displayName:name})});const body=await response.json() as {token?:string;user?:{id:string;displayName:string};error?:string};if(!response.ok)throw new Error(body.error??'認証に失敗しました');localStorage.setItem('hidegames.auth-token',body.token??'');localStorage.setItem('hidegames.account-name',body.user?.displayName??name);if(body.user?.id)localStorage.setItem('hidegames.account-id',body.user.id);window.dispatchEvent(new Event('hidegames-auth'));setLoggedIn(true);setStatus(`${body.user?.displayName??name} としてログインしました`);setPassword('')}catch(error){setStatus(error instanceof Error?error.message:'認証に失敗しました')}}
  const logout=()=>{localStorage.removeItem('hidegames.auth-token');localStorage.removeItem('hidegames.account-name');localStorage.removeItem('hidegames.account-id');window.dispatchEvent(new Event('hidegames-auth'));setLoggedIn(false);setStatus('ログアウトしました')}
  if(loggedIn)return <section className="panel auth-panel"><div><p className="eyebrow">ACCOUNT</p><h2>ログイン中</h2><p>{localStorage.getItem('hidegames.account-name')??defaultName} として戦績とランキングを同期しています。</p></div><div className="auth-logged-in"><button className="secondary" onClick={logout}>ログアウト</button><small>ログアウトすると、この端末のオンラインルーム接続はゲストとして再接続されます。</small></div>{status&&<p className="setting-status">{status}</p>}</section>
  return <section className="panel auth-panel"><div><p className="eyebrow">ACCOUNT</p><h2>{mode==='signup'?'アカウントを作成':'アカウントにログイン'}</h2><p>戦績やフレンドを複数の端末で使うためのアカウントです。</p></div><form onSubmit={submit}>{mode==='signup'&&<input value={name} onChange={event=>setName(event.target.value)} placeholder="表示名" maxLength={32}/>}<input type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="メールアドレス" required/><input type="password" value={password} onChange={event=>setPassword(event.target.value)} placeholder="パスワード（8文字以上）" minLength={8} required/><button className="primary">{mode==='signup'?'登録する':'ログイン'}</button><button type="button" className="text-button" onClick={()=>setMode(mode==='signup'?'login':'signup')}>{mode==='signup'?'登録済みの方はこちら':'新規登録はこちら'}</button></form>{status&&<p className="setting-status">{status}</p>}</section>
}
type RankingEntry = { display_name: string; wins: number; matches: number }
function RankingPanel({ games: playedGames }: { games: string[] }) {
  const availableGames = playedGames.length ? playedGames : ['オンライン鬼ごっこ']
  const [game, setGame] = useState(availableGames[0])
  const [entries, setEntries] = useState<RankingEntry[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'guest' | 'error'>('loading')
  useEffect(() => { if (!availableGames.includes(game)) setGame(availableGames[0]) }, [game, availableGames.join('|')])
  useEffect(() => {
    const load = async () => {
      if (!localStorage.getItem('hidegames.auth-token')) { setEntries([]); setStatus('guest'); return }
      setStatus('loading')
      try {
        const localHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
        const base = import.meta.env.VITE_SOCKET_URL || (localHost ? `http://${window.location.hostname}:3001` : window.location.origin)
        const response = await fetch(`${base}/api/rankings?game=${encodeURIComponent(game)}`)
        const body = await response.json() as { rankings?: RankingEntry[] }
        if (!response.ok || !body.rankings) throw new Error('ranking unavailable')
        setEntries(body.rankings); setStatus('ready')
      } catch { setEntries([]); setStatus('error') }
    }
    void load()
    window.addEventListener('hidegames-auth', load)
    return () => window.removeEventListener('hidegames-auth', load)
  }, [game])
  return <section className="panel profile-block ranking-block"><p className="eyebrow">LEADERBOARD</p><div className="ranking-heading"><div><h2>ランキング</h2><p>保存済みの対戦結果から集計されます。</p></div><label>ゲーム<select value={game} onChange={event=>setGame(event.target.value)}>{availableGames.map(item=><option key={item}>{item}</option>)}</select></label></div>{status==='loading'&&<p className="empty-copy">ランキングを読み込んでいます。</p>}{status==='guest'&&<p className="empty-copy">ランキングを見るにはプロフィールからログインしてください。</p>}{status==='error'&&<p className="empty-copy">ランキングを取得できませんでした。通信状態を確認して、もう一度開いてください。</p>}{status==='ready'&&(entries.length?<ol className="ranking-list">{entries.map((entry,index)=><li key={entry.display_name}><span>{index+1}</span><b>{entry.display_name}</b><small>{entry.wins}勝 / {entry.matches}戦</small></li>)}</ol>:<p className="empty-copy">まだこのゲームの記録はありません。最初の勝利を記録しましょう。</p>)}</section>
}
function ProfileScreen({ data, onName }: { data: PlayerData; onName: (name: string) => void }) {
  const [name, setName] = useState(data.displayName)
  const [replayNotice, setReplayNotice] = useState('')
  const [openedReplay, setOpenedReplay] = useState<PlayerData['replays'][number] | null>(null)
  const [replayStep, setReplayStep] = useState(0)
  const [playingReplay, setPlayingReplay] = useState(false)
  const wins = data.matches.filter(match => match.result === 'win').length
  const replays = data.replays ?? []
  const rankingGames = [...new Set(data.matches.map(match => match.game))]
  const replayFrames=openedReplay&&openedReplay.snapshot&&typeof openedReplay.snapshot==='object'&&Array.isArray((openedReplay.snapshot as {frames?:unknown[]}).frames)?(openedReplay.snapshot as {frames:Array<{at:number;state:unknown}>}).frames:openedReplay?.snapshot?[{at:0,state:openedReplay.snapshot}]:[]
  const frame=replayFrames[Math.min(replayStep,Math.max(0,replayFrames.length-1))]
  useEffect(()=>{if(!playingReplay||!openedReplay||replayFrames.length<2)return;const timer=window.setInterval(()=>setReplayStep(step=>{if(step>=replayFrames.length-1){setPlayingReplay(false);return step}return step+1}),700);return()=>window.clearInterval(timer)},[openedReplay,playingReplay,replayFrames.length])
  return <div className="page profile-page"><header className="page-title"><div><p className="eyebrow">PLAYER PROFILE</p><h1>プロフィール</h1><p>戦績、実績、最近のプレイを確認できます。</p></div></header><section className="profile-hero panel"><span className="profile-avatar">{initials(data.displayName)}</span><div><span className="game-kind">{data.title}</span><h2>{data.displayName}</h2><p>レベル {data.level} ・ {data.xp} XP</p></div><form onSubmit={event=>{event.preventDefault();onName(name)}}><input aria-label="表示名" value={name} onChange={event=>setName(event.target.value)} /><button className="secondary">保存</button></form></section><section className="profile-metrics"><div className="panel"><small>プレイ回数</small><strong>{data.matches.length}</strong></div><div className="panel"><small>勝利数</small><strong>{wins}</strong></div><div className="panel"><small>実績</small><strong>{data.achievements.length}</strong></div></section><section className="profile-columns"><div className="panel profile-block"><p className="eyebrow">ACHIEVEMENTS</p><h2>実績</h2><div className="achievement-list">{data.achievements.map(item=><span key={item}><Sparkles size={15}/>{item}</span>)}</div></div><div className="panel profile-block"><p className="eyebrow">RECENT MATCHES</p><h2>最近の対戦</h2>{data.matches.length ? <div className="match-list">{data.matches.slice(0,5).map(match=><div key={match.id}><span>{match.game}</span><b className={match.result}>{match.result === 'win' ? '勝利' : match.result === 'loss' ? '敗北' : '引分'}</b></div>)}</div> : <p className="empty-copy">対戦を終えると、ここに戦績とリプレイ情報が保存されます。</p>}</div></section><RankingPanel games={rankingGames}/><section className="panel profile-block replay-block"><p className="eyebrow">REPLAYS</p><h2>リプレイ</h2>{replays.length ? <div className="replay-list">{replays.slice(0,8).map(replay=><div key={replay.id}><span><b>{replay.game}</b><small>{new Date(replay.playedAt).toLocaleString('ja-JP')} ・ {replay.summary}</small></span><button className="secondary" onClick={()=>{setOpenedReplay(replay);setReplayStep(0);setPlayingReplay(false)}}>再生</button><button className="secondary" onClick={()=>{navigator.clipboard?.writeText(JSON.stringify(replay));setReplayNotice('リプレイ情報をクリップボードにコピーしました')}}>共有</button></div>)}</div> : <p className="empty-copy">対戦を終えると、ここに戦績とリプレイ情報が保存されます。</p>}{replayNotice&&<p className="setting-status">{replayNotice}</p>}</section>{openedReplay&&<div className="replay-modal" role="dialog" aria-modal="true"><section className="panel"><button className="icon-button replay-close" aria-label="リプレイを閉じる" onClick={()=>{setOpenedReplay(null);setPlayingReplay(false)}}><X/></button><p className="eyebrow">REPLAY VIEWER</p><h2>{openedReplay.game}</h2><p>{new Date(openedReplay.playedAt).toLocaleString('ja-JP')} ・ {openedReplay.summary}</p>{replayFrames.length?<><div className="go-actions"><button className="secondary" disabled={replayStep===0} onClick={()=>setReplayStep(step=>step-1)}>前へ</button><button className="primary" disabled={replayStep>=replayFrames.length-1} onClick={()=>setPlayingReplay(!playingReplay)}>{playingReplay?'停止':'自動再生'}</button><button className="secondary" disabled={replayStep>=replayFrames.length-1} onClick={()=>setReplayStep(step=>step+1)}>次へ</button><small>{replayStep+1} / {replayFrames.length}</small></div><pre>{JSON.stringify(frame?.state, null, 2)}</pre></>:<pre>この試合には再生できる履歴が保存されていません。</pre>}</section></div>}</div>
}
function ProfileAppearance({ data, onSave }: { data: PlayerData; onSave: (title: string, tone: 'mint'|'purple'|'blue'|'orange') => void }) {
  const [title,setTitle]=useState(data.title);const [tone,setTone]=useState(data.avatarTone??'mint');const tones=['mint','purple','blue','orange'] as const;const titles=['夜更かしプレイヤー','ルームマスター','戦略家','協力プレイヤー','チャレンジャー']
  useEffect(()=>{setTitle(data.title);setTone(data.avatarTone??'mint')},[data.title,data.avatarTone])
  return <section className="page profile-appearance"><div className="panel profile-block"><p className="eyebrow">APPEARANCE</p><h2>アイコンと称号</h2><div className="profile-appearance-controls"><div className={`profile-avatar ${tone}`}>{initials(data.displayName)}</div><label>称号<select value={title} onChange={event=>setTitle(event.target.value)}>{titles.map(item=><option key={item}>{item}</option>)}</select></label><div><small>アイコンカラー</small><p className="avatar-tones">{tones.map(item=><button key={item} className={`avatar ${item} ${tone===item?'selected':''}`} aria-label={`${item}を選択`} onClick={()=>setTone(item)}>{tone===item?<CheckCircle2 size={16}/>:''}</button>)}</p></div><button className="secondary" onClick={()=>onSave(title,tone)}>保存</button></div></div></section>
}
function SettingsScreenV2({brightness,setBrightness,shortcut,setShortcut}:{brightness:number;setBrightness:(v:number)=>void;shortcut:string;setShortcut:(value:string)=>void}){
  type Preferences={bright:boolean;chat:boolean;notifications:boolean;chatNotifications:boolean;roomNotifications:boolean;gameNotifications:boolean;inviteNotifications:boolean;fontScale:number;colorSafe:boolean;reducedMotion:boolean;captions:boolean;bgm:number;sfx:number;voice:number;youtube:number}
  const defaults:Preferences={bright:true,chat:true,notifications:true,chatNotifications:true,roomNotifications:true,gameNotifications:true,inviteNotifications:true,fontScale:100,colorSafe:false,reducedMotion:false,captions:false,bgm:70,sfx:70,voice:80,youtube:80}
  const [prefs,setPrefs]=useState<Preferences>(()=>{try{return{...defaults,...JSON.parse(localStorage.getItem('hidegames.preferences')??'{}')}}catch{return defaults}});const [status,setStatus]=useState('')
  useEffect(()=>{localStorage.setItem('hidegames.preferences',JSON.stringify(prefs));document.documentElement.style.fontSize=`${prefs.fontScale}%`;document.documentElement.dataset.colorSafe=`${prefs.colorSafe}`;document.documentElement.dataset.reducedMotion=`${prefs.reducedMotion}`;window.dispatchEvent(new Event('hidegames-preferences'))},[prefs])
  const update=<K extends keyof Preferences>(key:K,value:Preferences[K])=>{if(key==='notifications'&&Boolean(value)&&'Notification'in window){if(Notification.permission==='denied'){setStatus('ブラウザまたはOSの設定で通知が拒否されています');return}if(Notification.permission==='default'){void Notification.requestPermission().then(permission=>{setPrefs(current=>({...current,notifications:permission==='granted'}));setStatus(permission==='granted'?'通知を許可しました':'通知は許可されていません')});return}}setPrefs(current=>({...current,[key]:value}))}
  const saveShortcut=async()=>{const result=await window.hideGamesDesktop?.setAwayShortcut(shortcut);if(!result){setStatus('デスクトップ版でのみ変更できます');return}if(result.ok){localStorage.setItem('hidegames.away-shortcut',shortcut);setStatus('グローバルショートカットを保存しました')}else setStatus(result.message??'設定できませんでした')}
  return <div className="page settings-page"><header className="page-title"><div><p className="eyebrow">PREFERENCES</p><h1>設定</h1><p>離席キー、明るさ、音量、通知、見やすさを自分好みに。</p></div></header><section className="settings-group"><div><span className="setting-icon"><MonitorDown/></span><h2>離席モード</h2><p>キーを押すと、ゲームを全員で停止してHideGamesを隠します。</p></div><div className="setting-fields"><label>離席・復帰キー<input value={shortcut} onChange={event=>setShortcut(event.target.value)}/></label><button className="secondary" onClick={saveShortcut}>キー競合を確認して保存</button>{status&&<p className="setting-status">{status}</p>}</div></section><section className="settings-group"><div><span className="setting-icon"><Sparkles/></span><h2>ディスプレイの明るさ</h2><p>離席時に明るさを上げ、復帰時に元へ戻します。</p></div><div className="setting-fields"><label className="switch-line"><span>離席時に明るくする</span><button className={`switch ${prefs.bright?'on':''}`} onClick={()=>update('bright',!prefs.bright)}><i/></button></label>{prefs.bright&&<label>離席時の明るさ <output>{brightness}%</output><input type="range" min="40" max="100" value={brightness} onChange={event=>setBrightness(Number(event.target.value))}/></label>}<button className="text-button" onClick={async()=>{const result=await window.hideGamesDesktop?.setBrightness(brightness);setStatus(result?.supported?'明るさをテストしました':'このディスプレイでは物理的な明るさ変更に対応していません')}}>明るさをテスト</button></div></section><section className="settings-group"><div><span className="setting-icon"><MessageCircle/></span><h2>通知とチャット</h2><p>通知の種類を個別に制御できます。</p></div><div className="setting-fields"><label className="switch-line"><span>ゲーム中にチャットを表示</span><button className={`switch ${prefs.chat?'on':''}`} onClick={()=>update('chat',!prefs.chat)}><i/></button></label><label className="switch-line"><span>OS通知を許可</span><button className={`switch ${prefs.notifications?'on':''}`} onClick={()=>update('notifications',!prefs.notifications)}><i/></button></label><label className="switch-line"><span>チャット通知</span><button className={`switch ${prefs.chatNotifications?'on':''}`} disabled={!prefs.notifications} onClick={()=>update('chatNotifications',!prefs.chatNotifications)}><i/></button></label><label className="switch-line"><span>ルーム招待の通知</span><button className={`switch ${prefs.inviteNotifications?'on':''}`} disabled={!prefs.notifications} onClick={()=>update('inviteNotifications',!prefs.inviteNotifications)}><i/></button></label><label className="switch-line"><span>離席・復帰の通知</span><button className={`switch ${prefs.roomNotifications?'on':''}`} disabled={!prefs.notifications} onClick={()=>update('roomNotifications',!prefs.roomNotifications)}><i/></button></label><label className="switch-line"><span>ゲーム開始の通知</span><button className={`switch ${prefs.gameNotifications?'on':''}`} disabled={!prefs.notifications} onClick={()=>update('gameNotifications',!prefs.gameNotifications)}><i/></button></label></div></section><section className="settings-group"><div><span className="setting-icon"><Radio/></span><h2>音量</h2><p>各種類の音量を個別に保存します。対応する再生機能に反映されます。</p></div><div className="setting-fields">{([{key:'bgm',label:'BGM'},{key:'sfx',label:'効果音'},{key:'voice',label:'ボイスチャット'},{key:'youtube',label:'YouTube'}] as const).map(item=><label key={item.key}>{item.label} <output>{prefs[item.key]}%</output><input type="range" min="0" max="100" value={prefs[item.key]} onChange={event=>update(item.key,Number(event.target.value))}/></label>)}</div></section><section className="settings-group"><div><span className="setting-icon"><CircleHelp/></span><h2>アクセシビリティ</h2><p>文字・色・動きと、ゲーム中の状態表示を調整できます。</p></div><div className="setting-fields"><label>文字サイズ <output>{prefs.fontScale}%</output><input type="range" min="90" max="125" value={prefs.fontScale} onChange={event=>update('fontScale',Number(event.target.value))}/></label><label className="switch-line"><span>色覚配慮テーマ</span><button className={`switch ${prefs.colorSafe?'on':''}`} onClick={()=>update('colorSafe',!prefs.colorSafe)}><i/></button></label><label className="switch-line"><span>モーションを減らす</span><button className={`switch ${prefs.reducedMotion?'on':''}`} onClick={()=>update('reducedMotion',!prefs.reducedMotion)}><i/></button></label><label className="switch-line"><span>画面内の状態字幕</span><button className={`switch ${prefs.captions?'on':''}`} onClick={()=>update('captions',!prefs.captions)}><i/></button></label><small>状態字幕では、離席・復帰と最新チャットをゲーム画面上に文字で表示します。</small></div></section></div>
}
function SettingsScreen({brightness,setBrightness,shortcut,setShortcut}:{brightness:number;setBrightness:(v:number)=>void;shortcut:string;setShortcut:(value:string)=>void}){const [bright,setBright]=useState(true);const [status,setStatus]=useState('');const saveShortcut=async()=>{const result=await window.hideGamesDesktop?.setAwayShortcut(shortcut);if(!result){setStatus('デスクトップ版でのみ変更できます');return}if(result.ok){localStorage.setItem('hidegames.away-shortcut',shortcut);setStatus('グローバルショートカットを保存しました')}else setStatus(result.message??'設定できませんでした')};return <div className="page settings-page"><header className="page-title"><div><p className="eyebrow">PREFERENCES</p><h1>設定</h1><p>離席キー、明るさ、音量、通知を自分好みに。</p></div></header><section className="settings-group"><div><span className="setting-icon"><MonitorDown/></span><h2>離席モード</h2><p>キーを押すと、ゲームを全員で停止してHideGamesを隠します。</p></div><div className="setting-fields"><label>離席・復帰キー<input value={shortcut} onChange={e=>setShortcut(e.target.value)}/></label><button className="secondary" onClick={saveShortcut}>キー競合を確認して保存</button>{status&&<p className="setting-status">{status}</p>}</div></section><section className="settings-group"><div><span className="setting-icon"><Sparkles/></span><h2>ディスプレイの明るさ</h2><p>離席時に明るさを上げ、復帰時に元へ戻します。</p></div><div className="setting-fields"><label className="switch-line"><span>離席時に明るくする</span><button className={`switch ${bright?'on':''}`} onClick={()=>setBright(!bright)} aria-label="明るさ連動を切り替える"><i/></button></label>{bright&&<label>離席時の明るさ <output>{brightness}%</output><input type="range" min="40" max="100" value={brightness} onChange={e=>setBrightness(Number(e.target.value))}/></label>}<button className="text-button">明るさをテスト →</button></div></section><section className="settings-group"><div><span className="setting-icon"><MessageCircle/></span><h2>ゲーム中チャット</h2><p>右下のチャットドックと通知の表示を設定します。</p></div><div className="setting-fields"><label className="switch-line"><span>ゲーム中に常に表示</span><button className="switch on"><i/></button></label><label className="switch-line"><span>新着メッセージを通知</span><button className="switch on"><i/></button></label></div></section></div>}

export default App
