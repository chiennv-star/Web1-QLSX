import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react'
import { Badge, Input, Spin } from 'antd'
import {
  MessageOutlined, SendOutlined, CloseOutlined,
  MinusOutlined, ArrowLeftOutlined, SearchOutlined,
  LoadingOutlined, PlusOutlined,
} from '@ant-design/icons'
import { Client } from '@stomp/stompjs'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
dayjs.locale('vi')

// ── Constants ─────────────────────────────────────────────────────────────────

const GROUP_ROOMS = [
  { key: 'chung',  label: 'Phòng chung',  emoji: '🏢', color: '#1D4ED8' },
  { key: 'pcpl1',  label: 'Tổ PCPL1',     emoji: '🟢', color: '#237804' },
  { key: 'pcpl2',  label: 'Tổ PCPL2',     emoji: '🟠', color: '#ad6800' },
  { key: 'pcpl3',  label: 'Tổ PCPL3',     emoji: '🔵', color: '#0958d9' },
  { key: 'bbc1',   label: 'Tổ BBC1',      emoji: '🟣', color: '#7c3aed' },
  { key: 'dg',     label: 'Tổ ĐG',        emoji: '🟤', color: '#b45309' },
]

const ROLE_ROOM_KEYS = {
  ADMIN:       ['chung', 'pcpl1', 'pcpl2', 'pcpl3', 'bbc1', 'dg'],
  ADMIN_KH:    ['chung', 'pcpl1', 'pcpl2', 'pcpl3', 'bbc1', 'dg'],
  TKSX:        ['chung', 'pcpl1', 'pcpl2', 'pcpl3', 'bbc1', 'dg'],
  ADMIN_PCPL1: ['chung', 'pcpl1'],
  ADMIN_PCPL2: ['chung', 'pcpl2'],
  ADMIN_PCPL3: ['chung', 'pcpl3'],
  ADMIN_BBC1:  ['chung', 'bbc1'],
  ADMIN_DG:    ['chung', 'dg'],
  ADMIN_PC:    ['chung', 'pcpl1', 'pcpl2'],
  ADMIN_PL:    ['chung', 'pcpl3'],
  NHAN_VIEN:   ['chung'],
  QUAN_DOC:    ['chung'],
}

const ROLE_LABELS = {
  ADMIN: 'Admin',           TKSX: 'TK Sản Xuất',
  ADMIN_KH: 'Kế Hoạch',    ADMIN_PCPL1: 'PCPL1',
  ADMIN_PCPL2: 'PCPL2',     ADMIN_PCPL3: 'PCPL3',
  ADMIN_DG: 'ĐG',           ADMIN_BBC1: 'BBC1',
  ADMIN_PC: 'PC',           ADMIN_PL: 'PL',
  NHAN_VIEN: 'Nhân viên',   QUAN_DOC: 'Quản lý',
}

const AVATAR_COLORS = [
  '#1D4ED8','#059669','#d97706','#7c3aed','#db2777',
  '#0891b2','#65a30d','#dc2626','#9333ea','#0369a1',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function strColor(str = '') {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function dmRoomKey(a, b) {
  return 'dm_' + [a, b].sort().join('__')
}

function fmtTime(dt) {
  if (!dt) return ''
  const d = dayjs(dt)
  const now = dayjs()
  if (d.isSame(now, 'day')) return d.format('HH:mm')
  if (d.isSame(now.subtract(1, 'day'), 'day')) return 'Hôm qua'
  return d.format('DD/MM')
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name = '', size = 36, online = false }) {
  const color = strColor(name)
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700,
        fontSize: size * 0.35,
        userSelect: 'none',
      }}>
        {getInitials(name)}
      </div>
      {online && (
        <div style={{
          position: 'absolute', bottom: 1, right: 1,
          width: 10, height: 10, borderRadius: '50%',
          background: '#22c55e',
          border: '2px solid #fff',
        }} />
      )}
    </div>
  )
}

// ── Message bubble ─────────────────────────────────────────────────────────────
function Bubble({ msg, isMine }) {
  if (msg.type === 'JOIN' || msg.type === 'LEAVE') {
    return (
      <div style={{
        textAlign: 'center', margin: '5px 0',
        fontSize: 11, color: '#94a3b8', fontStyle: 'italic',
      }}>
        {msg.content}
      </div>
    )
  }
  const time = msg.sentAt ? dayjs(msg.sentAt).format('HH:mm') : ''
  return (
    <div style={{
      display: 'flex',
      flexDirection: isMine ? 'row-reverse' : 'row',
      alignItems: 'flex-end', gap: 6, marginBottom: 8,
    }}>
      {!isMine && (
        <Avatar name={msg.senderName || msg.sender} size={28} />
      )}
      <div style={{ maxWidth: '74%' }}>
        {!isMine && (
          <div style={{
            fontSize: 10.5, color: '#64748b', fontWeight: 600,
            marginBottom: 2, paddingLeft: 2,
          }}>
            {msg.senderName || msg.sender}
          </div>
        )}
        <div style={{
          background: isMine
            ? 'linear-gradient(135deg,#1D4ED8,#3B82F6)' : '#f1f5f9',
          color: isMine ? '#fff' : '#1e293b',
          borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          padding: '8px 12px', fontSize: 13, lineHeight: 1.45,
          boxShadow: isMine
            ? '0 2px 8px rgba(29,78,216,0.22)' : '0 1px 3px rgba(0,0,0,0.07)',
          wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>
        <div style={{
          fontSize: 10, color: '#94a3b8', marginTop: 2,
          textAlign: isMine ? 'right' : 'left',
          padding: isMine ? '0 2px 0 0' : '0 0 0 2px',
        }}>
          {time}
        </div>
      </div>
    </div>
  )
}

// ── Conversation row ──────────────────────────────────────────────────────────
function ConvRow({ icon, name, sub, time, unread, color, online, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        background: hover ? '#f0f6ff' : '#fff',
        cursor: 'pointer', transition: 'background 0.12s',
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      {/* Avatar / icon */}
      {icon
        ? (
          <div style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: color + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, border: `1.5px solid ${color}33`,
          }}>
            {icon}
          </div>
        )
        : <Avatar name={name} size={40} online={online} />
      }

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{
            fontWeight: unread ? 700 : 600, fontSize: 13,
            color: '#1e293b',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 160,
          }}>
            {name}
          </span>
          <span style={{ fontSize: 10.5, color: '#94a3b8', flexShrink: 0, marginLeft: 4 }}>
            {time}
          </span>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 1,
        }}>
          <span style={{
            fontSize: 11.5, color: unread ? '#475569' : '#94a3b8',
            fontWeight: unread ? 600 : 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 175,
          }}>
            {sub || 'Chưa có tin nhắn'}
          </span>
          {unread > 0 && (
            <div style={{
              background: '#ef4444', color: '#fff',
              borderRadius: 10, minWidth: 18, height: 18,
              fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 5px', flexShrink: 0,
            }}>
              {unread}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main ChatWidget ───────────────────────────────────────────────────────────
export default function ChatWidget() {
  const { user }  = useAuth()
  const [open,      setOpen]      = useState(false)
  const [minimized, setMinimized] = useState(false)
  // 'list' | 'chat'
  const [view,      setView]      = useState('list')
  // activeConv: { key, name, type:'group'|'dm', color, emoji }
  const [activeConv, setActiveConv] = useState(null)
  const activeConvRef = useRef(null)
  const viewRef       = useRef('list')

  const [messages,  setMessages]  = useState({})   // { roomKey: [msg] }
  const [lastMsg,   setLastMsg]   = useState({})    // { roomKey: msg }
  const [unread,    setUnread]    = useState({})    // { roomKey: count }
  const [input,     setInput]     = useState('')
  const [connected, setConnected] = useState(false)
  const [onlineCount, setOnlineCount] = useState(0)
  const [onlineSet, setOnlineSet] = useState(new Set())
  const [userList,  setUserList]  = useState([])
  const [search,    setSearch]    = useState('')
  const [histLoading, setHistLoading] = useState(false)
  const [btnHover, setBtnHover]   = useState(false)

  const stompRef        = useRef(null)
  const subRefs         = useRef({})
  const bottomRef       = useRef(null)
  const inputRef        = useRef(null)
  const handleIncomingRef = useRef(null)

  // Sync refs để subscription handler dùng được giá trị mới nhất
  useEffect(() => { activeConvRef.current = activeConv }, [activeConv])
  useEffect(() => { viewRef.current = view }, [view])

  const myRooms = useMemo(() => {
    const keys = ROLE_ROOM_KEYS[user?.role] || ['chung']
    return GROUP_ROOMS.filter(r => keys.includes(r.key))
  }, [user?.role])

  const scrollBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
  }, [])

  // ── Load users ────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/chat/users')
      setUserList(data || [])
    } catch { /* silent */ }
  }, [])

  // ── Load history ──────────────────────────────────────────────────────────
  const loadHistory = useCallback(async (roomKey) => {
    if (!roomKey) return
    setHistLoading(true)
    try {
      const { data } = await api.get('/chat/messages', { params: { room: roomKey } })
      const msgs = data || []
      setMessages(prev => ({ ...prev, [roomKey]: msgs }))
      if (msgs.length) setLastMsg(prev => ({ ...prev, [roomKey]: msgs[msgs.length - 1] }))
      scrollBottom()
    } catch { /* silent */ }
    finally { setHistLoading(false) }
  }, [scrollBottom])

  // ── STOMP connect ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const proto  = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const wsUrl  = `${proto}://${window.location.host}/ws`
    const allKeys = [
      ...(ROLE_ROOM_KEYS[user.role] || ['chung']),
    ]

    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true)

        // Đăng ký presence channel
        client.subscribe('/topic/chat/presence', (frame) => {
          try {
            const p = JSON.parse(frame.body)
            setOnlineCount(p.count || 0)
            setOnlineSet(prev => {
              const next = new Set(prev)
              if (p.type === 'ONLINE')  next.add(p.sender)
              if (p.type === 'OFFLINE') next.delete(p.sender)
              return next
            })
          } catch { /* skip */ }
        })

        // ── Helper: xử lý tin nhắn đến (dùng chung group + DM) ──
        const handleIncoming = (roomKey, msg) => {
          setMessages(prev => ({
            ...prev,
            [roomKey]: [...(prev[roomKey] || []), msg],
          }))
          setLastMsg(prev => ({ ...prev, [roomKey]: msg }))
          // Chỉ tăng unread nếu không đang xem phòng này
          const isViewingRoom =
            viewRef.current === 'chat' &&
            activeConvRef.current?.key === roomKey
          if (!isViewingRoom) {
            setUnread(prev => ({
              ...prev,
              [roomKey]: (prev[roomKey] || 0) + 1,
            }))
          } else {
            scrollBottom()
          }
        }

        // Đăng ký tất cả group rooms của mình
        allKeys.forEach(roomKey => {
          if (subRefs.current[roomKey]) return
          subRefs.current[roomKey] = client.subscribe(
            `/topic/chat/${roomKey}`,
            (frame) => {
              try { handleIncomingRef.current?.(roomKey, JSON.parse(frame.body)) }
              catch { /* skip */ }
            }
          )
        })

        // Gửi online signal
        client.publish({
          destination: '/app/chat/online',
          body: JSON.stringify({
            sender: user.username,
            senderName: user.fullName || user.username,
          }),
        })
      },
      onDisconnect: () => {
        setConnected(false)
        // Gửi offline signal (best-effort)
        try {
          client.publish({
            destination: '/app/chat/offline',
            body: JSON.stringify({ sender: user.username }),
          })
        } catch { /* skip */ }
      },
    })

    client.activate()
    stompRef.current = client

    return () => {
      try {
        client.publish({
          destination: '/app/chat/offline',
          body: JSON.stringify({ sender: user.username }),
        })
      } catch { /* skip */ }
      client.deactivate()
      stompRef.current = null
      subRefs.current  = {}
    }
  }, [user, scrollBottom])

  // ── Xử lý tin nhắn đến (dùng chung group + DM) ───────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleIncoming = useCallback((roomKey, msg) => {
    setMessages(prev => ({
      ...prev,
      [roomKey]: [...(prev[roomKey] || []), msg],
    }))
    setLastMsg(prev => ({ ...prev, [roomKey]: msg }))
    const isViewingRoom =
      viewRef.current === 'chat' &&
      activeConvRef.current?.key === roomKey
    if (!isViewingRoom) {
      setUnread(prev => ({ ...prev, [roomKey]: (prev[roomKey] || 0) + 1 }))
    } else {
      scrollBottom()
    }
  }, [scrollBottom])
  // Sync ref để STOMP useEffect dùng được phiên bản mới nhất
  useEffect(() => { handleIncomingRef.current = handleIncoming }, [handleIncoming])

  // ── Subscribe DM room khi mở ──────────────────────────────────────────────
  const subscribeDm = useCallback((roomKey) => {
    if (!stompRef.current || subRefs.current[roomKey]) return
    subRefs.current[roomKey] = stompRef.current.subscribe(
      `/topic/chat/${roomKey}`,
      (frame) => {
        try { handleIncoming(roomKey, JSON.parse(frame.body)) }
        catch { /* skip */ }
      }
    )
  }, [handleIncoming])

  // ── Open conversation ─────────────────────────────────────────────────────
  const openConv = useCallback((conv) => {
    setActiveConv(conv)
    activeConvRef.current = conv
    setView('chat')
    viewRef.current = 'chat'
    setUnread(prev => ({ ...prev, [conv.key]: 0 }))
    if (!messages[conv.key] || messages[conv.key].length === 0) {
      loadHistory(conv.key)
    } else {
      scrollBottom()
    }
    if (conv.type === 'dm') subscribeDm(conv.key)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [messages, loadHistory, scrollBottom, subscribeDm])

  // ── Load khi mở widget ────────────────────────────────────────────────────
  useEffect(() => {
    if (open && !minimized) {
      loadUsers()
    }
  }, [open, minimized, loadUsers])

  // ── Send message ──────────────────────────────────────────────────────────
  const send = () => {
    const content = input.trim()
    if (!content || !connected || !stompRef.current || !activeConv) return

    stompRef.current.publish({
      destination: `/app/chat/send/${activeConv.key}`,
      body: JSON.stringify({
        room:       activeConv.key,
        sender:     user.username,
        senderName: user.fullName || user.username,
        content,
        type:       'CHAT',
      }),
    })
    setInput('')
    inputRef.current?.focus()
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // ── Filter users ──────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return userList
    return userList.filter(u =>
      (u.fullName || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (ROLE_LABELS[u.role] || '').toLowerCase().includes(q)
    )
  }, [search, userList])

  const totalUnread = Object.values(unread).reduce((s, v) => s + v, 0)

  // ══════════════════════════════════════════════════════════════════════════
  // ── RENDER ────────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1001 }}>

      {/* ── Chat window ──────────────────────────────────────────────────── */}
      {open && (
        <div style={{
          position: 'absolute', bottom: 64, right: 0,
          width: 360,
          borderRadius: 16,
          background: '#fff',
          boxShadow: '0 16px 48px rgba(29,78,216,0.18)',
          border: '1px solid #dbeafe',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          height: minimized ? 52 : 520,
          transition: 'height 0.25s ease',
        }}>

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div style={{
            background: 'linear-gradient(135deg,#1e4570 0%,#1D4ED8 100%)',
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 8,
            flexShrink: 0, userSelect: 'none',
          }}>
            {/* Back button (chỉ hiện khi đang trong view chat) */}
            {view === 'chat' && !minimized && (
              <button
                onClick={() => {
                  setView('list')
                  viewRef.current = 'list'
                  setActiveConv(null)
                  activeConvRef.current = null
                }}
                style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none',
                  borderRadius: 6, width: 26, height: 26, cursor: 'pointer',
                  color: '#fff', fontSize: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ArrowLeftOutlined />
              </button>
            )}

            {/* Title */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                color: '#fff', fontWeight: 700, fontSize: 13.5,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {view === 'chat' && activeConv
                  ? activeConv.name
                  : '💬 Trò chuyện nội bộ'
                }
              </div>
              {!minimized && (
                <div style={{ fontSize: 10.5, color: '#93c5fd', marginTop: 1 }}>
                  {view === 'chat' && activeConv?.type === 'dm'
                    ? (onlineSet.has(activeConv.dmTarget)
                        ? '🟢 Đang hoạt động'
                        : '⚫ Không hoạt động')
                    : `Online: ${onlineCount}`
                  }
                </div>
              )}
            </div>

            {/* Connection dot */}
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: connected ? '#22c55e' : '#f87171',
              boxShadow: connected ? '0 0 6px #22c55e' : 'none',
            }} />

            {/* Minimize */}
            <button
              onClick={() => setMinimized(v => !v)}
              style={{
                background: 'rgba(255,255,255,0.15)', border: 'none',
                borderRadius: 6, width: 26, height: 26, cursor: 'pointer',
                color: '#fff', fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <MinusOutlined />
            </button>

            {/* Close */}
            <button
              onClick={() => { setOpen(false); setView('list'); setSearch('') }}
              style={{
                background: 'rgba(255,255,255,0.15)', border: 'none',
                borderRadius: 6, width: 26, height: 26, cursor: 'pointer',
                color: '#fff', fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <CloseOutlined />
            </button>
          </div>

          {/* ── Body ───────────────────────────────────────────────────── */}
          {!minimized && (
            <>
              {/* ══ VIEW: CONVERSATION LIST ═══════════════════════════════ */}
              {view === 'list' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                  {/* Stats bar */}
                  <div style={{
                    padding: '6px 14px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontSize: 12,
                  }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>
                      Tin nhắn
                      <span style={{
                        marginLeft: 8, background: '#dbeafe',
                        color: '#1D4ED8', borderRadius: 8,
                        padding: '1px 7px', fontSize: 11, fontWeight: 700,
                      }}>
                        🟢 Online {onlineCount}
                      </span>
                    </span>
                    <button
                      onClick={() => { setSearch(''); setTimeout(() => document.getElementById('chat-search')?.focus(), 50) }}
                      style={{
                        background: '#eff6ff', border: '1px solid #bfdbfe',
                        borderRadius: 6, padding: '3px 8px',
                        fontSize: 11, fontWeight: 600, color: '#1D4ED8',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <PlusOutlined style={{ fontSize: 10 }} /> Mới
                    </button>
                  </div>

                  {/* Search bar */}
                  <div style={{ padding: '8px 12px', background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
                    <Input
                      id="chat-search"
                      prefix={<SearchOutlined style={{ color: '#94a3b8', fontSize: 13 }} />}
                      placeholder="Tìm tên, vai trò..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      allowClear
                      size="small"
                      style={{ borderRadius: 8, fontSize: 12, border: '1.5px solid #e2e8f0' }}
                    />
                  </div>

                  {/* Conversation list */}
                  <div style={{ flex: 1, overflowY: 'auto' }}>

                    {/* Group rooms (ẩn khi đang search) */}
                    {!search && (
                      <>
                        <div style={{
                          padding: '6px 14px 4px',
                          fontSize: 10.5, fontWeight: 700, color: '#94a3b8',
                          textTransform: 'uppercase', letterSpacing: '0.6px',
                        }}>
                          Phòng nhóm
                        </div>
                        {myRooms.map(room => {
                          const last = lastMsg[room.key]
                          const cnt  = unread[room.key] || 0
                          return (
                            <ConvRow
                              key={room.key}
                              icon={room.emoji}
                              name={room.label}
                              sub={last ? `${last.senderName || last.sender}: ${last.content}` : undefined}
                              time={last ? fmtTime(last.sentAt) : ''}
                              unread={cnt}
                              color={room.color}
                              onClick={() => openConv({
                                key: room.key, name: room.label,
                                type: 'group', color: room.color, emoji: room.emoji,
                              })}
                            />
                          )
                        })}
                      </>
                    )}

                    {/* Thành viên (tất cả hoặc kết quả search) */}
                    <div style={{
                      padding: '6px 14px 4px',
                      fontSize: 10.5, fontWeight: 700, color: '#94a3b8',
                      textTransform: 'uppercase', letterSpacing: '0.6px',
                    }}>
                      {search ? `Kết quả (${filteredUsers.length})` : 'Thành viên'}
                    </div>

                    {filteredUsers.length === 0 && (
                      <div style={{
                        textAlign: 'center', padding: '20px 0',
                        color: '#94a3b8', fontSize: 12,
                      }}>
                        Không tìm thấy thành viên nào
                      </div>
                    )}

                    {filteredUsers.map(u => {
                      const roomKey = dmRoomKey(user.username, u.username)
                      const last    = lastMsg[roomKey]
                      const cnt     = unread[roomKey] || 0
                      const isOnline = onlineSet.has(u.username)
                      return (
                        <ConvRow
                          key={u.username}
                          name={u.fullName || u.username}
                          sub={last
                            ? (last.sender === user.username ? `Bạn: ${last.content}` : last.content)
                            : (ROLE_LABELS[u.role] ? `[${ROLE_LABELS[u.role]}]` : undefined)
                          }
                          time={last ? fmtTime(last.sentAt) : ''}
                          unread={cnt}
                          online={isOnline}
                          onClick={() => openConv({
                            key:      roomKey,
                            name:     u.fullName || u.username,
                            type:     'dm',
                            dmTarget: u.username,
                            color:    strColor(u.fullName || u.username),
                          })}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ══ VIEW: CHAT THREAD ══════════════════════════════════════ */}
              {view === 'chat' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                  {/* Messages */}
                  <div style={{
                    flex: 1, overflowY: 'auto',
                    padding: '12px 14px',
                    background: '#fafbff',
                  }}>
                    {histLoading && (
                      <div style={{ textAlign: 'center', padding: 20 }}>
                        <Spin indicator={<LoadingOutlined style={{ color: '#1D4ED8' }} />} />
                      </div>
                    )}

                    {!histLoading && (messages[activeConv?.key] || []).length === 0 && (
                      <div style={{
                        textAlign: 'center', padding: '32px 0',
                        color: '#94a3b8', fontSize: 12,
                      }}>
                        <div style={{ fontSize: 30, marginBottom: 8 }}>💬</div>
                        Chưa có tin nhắn nào.
                        <br/>
                        <span style={{ fontSize: 11 }}>Hãy là người đầu tiên nhắn!</span>
                      </div>
                    )}

                    {(messages[activeConv?.key] || []).map((msg, idx) => (
                      <Bubble
                        key={msg.id || `${msg.sender}-${idx}`}
                        msg={msg}
                        isMine={msg.sender === user?.username}
                      />
                    ))}
                    <div ref={bottomRef} />
                  </div>

                  {/* Input */}
                  <div style={{
                    padding: '10px 12px',
                    borderTop: '1px solid #e2e8f0',
                    background: '#fff',
                    display: 'flex', gap: 8, alignItems: 'flex-end',
                    flexShrink: 0,
                  }}>
                    <Input.TextArea
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder={connected ? 'Nhập tin nhắn… (Enter gửi)' : 'Đang kết nối…'}
                      disabled={!connected}
                      autoSize={{ minRows: 1, maxRows: 4 }}
                      maxLength={500}
                      style={{
                        borderRadius: 10, fontSize: 13, resize: 'none',
                        border: '1.5px solid #e2e8f0',
                      }}
                    />
                    <button
                      onClick={send}
                      disabled={!input.trim() || !connected}
                      style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: input.trim() && connected
                          ? 'linear-gradient(135deg,#1D4ED8,#3B82F6)' : '#e2e8f0',
                        border: 'none', cursor: input.trim() && connected ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.15s',
                        boxShadow: input.trim() && connected
                          ? '0 2px 8px rgba(29,78,216,0.3)' : 'none',
                      }}
                    >
                      <SendOutlined style={{
                        color: input.trim() && connected ? '#fff' : '#94a3b8',
                        fontSize: 14,
                      }} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Floating button ───────────────────────────────────────────────── */}
      <Badge
        count={open ? 0 : totalUnread}
        offset={[-4, 4]}
        style={{ background: '#ef4444', boxShadow: 'none', fontSize: 11 }}
      >
        <button
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
          onClick={() => {
            setOpen(v => !v)
            if (!open) { setView('list'); setMinimized(false) }
          }}
          style={{
            width: 50, height: 50, borderRadius: '50%',
            background: open
              ? 'linear-gradient(135deg,#475569,#64748b)'
              : 'linear-gradient(135deg,#1e4570,#1D4ED8)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: btnHover
              ? '0 6px 20px rgba(29,78,216,0.5)'
              : '0 3px 14px rgba(29,78,216,0.38)',
            transform: btnHover ? 'scale(1.08)' : 'scale(1)',
            transition: 'all 0.18s ease',
          }}
        >
          {open
            ? <CloseOutlined  style={{ color: '#fff', fontSize: 18 }} />
            : <MessageOutlined style={{ color: '#fff', fontSize: 20 }} />
          }
        </button>
      </Badge>
    </div>
  )
}
