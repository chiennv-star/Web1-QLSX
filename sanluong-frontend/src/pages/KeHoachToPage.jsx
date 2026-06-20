import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Select, Spin, message, DatePicker, Tooltip, Button, Tag, Popconfirm } from 'antd'
import { ReloadOutlined, TeamOutlined, ProjectOutlined, WarningOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

dayjs.extend(isoWeek)

const { Option } = Select
const SHIFTS  = ['Ca 1', 'Ca 2', 'Hành Chính', 'Tùy chọn']
const DOW     = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

const CA_STYLE = {
  'Ca 1':       { bg: '#fffbeb', border: '#fde68a' },
  'Ca 2':       { bg: '#eff6ff', border: '#bfdbfe' },
  'Hành Chính': { bg: '#f0fdf4', border: '#bbf7d0' },
  'Tùy chọn':   { bg: '#faf5ff', border: '#ddd6fe' },
}
// Mapping ca kế hoạch ↔ ca session
const CA_TO_SESSION   = { 'Ca 1': 'Ca 1', 'Ca 2': 'Ca 2', 'Hành Chính': 'HC', 'Tùy chọn': null }
const CA_FROM_SESSION = { 'Ca 1': 'Ca 1', 'Ca 2': 'Ca 2', 'HC': 'Hành Chính' }
const DEFAULT_GIO     = { 'Ca 1': 7, 'Ca 2': 7, 'HC': 8 }
const SS_TO        = 'kehoachto_selectedTo'
const SS_WEEK      = 'kehoachto_weekStart'
const SS_SOURCE    = 'kehoachto_planSource'
const SS_TIME_MODE = 'kehoachto_timeMode'
const SS_MONTH     = 'kehoachto_monthStart'
const SS_ASSIGNS   = 'kehoachto_assigns'

const TIME_MODES = [
  { key: 'week',  label: 'Tuần'   },
  { key: 'month', label: 'Tháng'  },
  { key: 'all',   label: 'Tất cả' },
]

const PLAN_SOURCES = [
  { key: 'PLAN',     label: 'Kế hoạch' },
  { key: 'SCHEDULE', label: 'Lịch SX'  },
]

const TO_TABS = [
  { key: 'BBC1',     label: 'BBC1',     schedCongDoan: 'BBC1'  },
  { key: 'Cân Chia', label: 'Cân Chia', congDoanKey: 'CC', schedCongDoan: 'CC'   },
  { key: 'PCPL1',    label: 'PCPL1',    schedCongDoan: 'PCPL1' },
  { key: 'PCPL2',    label: 'PCPL2',    schedCongDoan: 'PCPL2' },
  { key: 'PCPL3',    label: 'PL',       schedCongDoan: 'PL'    },
  { key: 'ĐG',       label: 'ĐG',       schedCongDoan: 'DG'    },
]

function initials(name = '') {
  const parts = name.trim().split(/\s+/)
  return ((parts[parts.length - 2] || '')[0] || '').toUpperCase() +
         ((parts[parts.length - 1] || '')[0] || '').toUpperCase()
}
function fmtDay(d) { return dayjs(d).format('DD/MM') }
function dowOf(d)  { return DOW[dayjs(d).day()] }

// ── Assign Card ───────────────────────────────────────────────────────────────
function AssignCard({ a, employees, dup, onDropPerson, onDragOver, onRemovePerson, onUpdate, onRemove, isFirst, isLast, onMoveUp, onMoveDown, onClone, onDragStartPersonMove }) {
  const caStyle = CA_STYLE[a.ca] || CA_STYLE['Ca 1']
  return (
    <div style={{
      border: `1px solid ${caStyle.border}`,
      background: caStyle.bg,
      borderRadius: 10, padding: '9px 10px',
      display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap', marginBottom: 7,
    }}>
      {/* Info */}
      <div style={{ flex: '1 1 150px', minWidth: 140 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', lineHeight: 1.3 }}>
          {a.ten}
        </div>
        <div style={{ fontSize: 10.5, color: '#94a3b8', fontFamily: 'monospace', marginTop: 2, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          {a.maSp && <span>{a.maSp}</span>}
          {a.maDonHang && <span style={{ color: '#818cf8' }}>ĐH {a.maDonHang}</span>}
          {a.soLo && (
            <span style={{ background: '#ede9fe', color: '#6d28d9', borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>
              Lô {a.soLo}
            </span>
          )}
          {a.coLo && (
            <span style={{ color: '#475569' }}>SL {Number(a.coLo).toLocaleString('vi-VN')}</span>
          )}
        </div>
        <div style={{ marginTop: 3, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {a.toNhom && (
            <span style={{ fontSize: 10, fontWeight: 800, background: '#ccfbf1', color: '#0f766e', borderRadius: 4, padding: '1px 6px' }}>
              {a.toNhom}
            </span>
          )}
          {a.congDoan && (
            <span style={{ fontSize: 10, fontWeight: 700, background: '#e0f2fe', color: '#0369a1', borderRadius: 4, padding: '1px 6px' }}>
              {a.congDoan}
            </span>
          )}
          {a.isUrgent && (
            <span style={{ fontSize: 10, fontWeight: 700, background: '#fef2f2', color: '#dc2626', borderRadius: 4, padding: '1px 6px' }}>
              ⚠ Gấp
            </span>
          )}
        </div>
      </div>

      {/* Shift */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <Select
          value={a.ca}
          size="small"
          style={{ width: 108 }}
          onChange={v => onUpdate(a.id, 'ca', v)}
          popupMatchSelectWidth={false}
        >
          {SHIFTS.map(s => <Option key={s} value={s}>{s}</Option>)}
        </Select>
        {a.ca === 'Tùy chọn' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="time"
              value={a.caStart || ''}
              onChange={e => onUpdate(a.id, 'caStart', e.target.value)}
              style={{
                width: 48, fontSize: 11, border: '1px solid #ddd6fe',
                borderRadius: 5, padding: '2px 4px', color: '#6d28d9',
                outline: 'none', background: '#fff',
              }}
            />
            <span style={{ fontSize: 10, color: '#94a3b8' }}>–</span>
            <input
              type="time"
              value={a.caEnd || ''}
              onChange={e => onUpdate(a.id, 'caEnd', e.target.value)}
              style={{
                width: 48, fontSize: 11, border: '1px solid #ddd6fe',
                borderRadius: 5, padding: '2px 4px', color: '#6d28d9',
                outline: 'none', background: '#fff',
              }}
            />
          </div>
        )}
      </div>

      {/* People drop zone */}
      <div
        onDragOver={onDragOver}
        onDrop={e => onDropPerson(e, a.id)}
        onDragEnter={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#6366f1' }}
        onDragLeave={e => { e.currentTarget.style.borderColor = 'transparent' }}
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center',
          flex: '2 1 190px', minWidth: 170,
          border: '2px dashed transparent', borderRadius: 8, padding: '2px 4px',
          transition: 'border-color 0.15s',
        }}
      >
        {a.mas.map(ma => {
          const emp        = employees.find(e => e.maNhanVien === ma)
          const isConflict = dup.has(`${ma}|${a.ngay}|${a.ca}`)
          return (
            <span
              key={ma}
              draggable
              onDragStart={e => onDragStartPersonMove(e, ma, a.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: isConflict ? '#fef2f2' : '#eef2ff',
                border: `1px solid ${isConflict ? '#fca5a5' : '#c7d2fe'}`,
                color: isConflict ? '#b91c1c' : '#3730a3',
                borderRadius: 999, padding: '2px 5px 2px 3px', fontSize: 11.5, fontWeight: 700,
                cursor: 'grab',
              }}
            >
              <span style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: isConflict ? '#fecaca' : '#c7d2fe',
                color: isConflict ? '#b91c1c' : '#4338ca',
                fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {initials(emp?.hoVaTen || ma)}
              </span>
              {emp?.hoVaTen || ma}
              <span
                style={{ cursor: 'pointer', opacity: 0.55, marginLeft: 1, fontSize: 10 }}
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onRemovePerson(a.id, ma) }}
              >✕</span>
            </span>
          )
        })}
        <span style={{ border: '1.5px dashed #cbd5e1', borderRadius: 999, padding: '2px 8px', fontSize: 10.5, color: '#94a3b8', userSelect: 'none' }}>
          ⤵ kéo người
        </span>
      </div>

      {/* Note */}
      <input
        value={a.note || ''}
        placeholder="Ghi chú..."
        onChange={e => onUpdate(a.id, 'note', e.target.value)}
        style={{
          flex: '1 1 110px', minWidth: 100,
          border: '1px solid #e2e8f0', borderRadius: 8,
          padding: '5px 8px', fontSize: 12, color: '#334155', outline: 'none',
        }}
      />

      {/* Move + Delete */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Tooltip title="Lên trên">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            style={{
              border: 'none', background: 'transparent',
              cursor: isFirst ? 'default' : 'pointer',
              color: isFirst ? '#e2e8f0' : '#94a3b8',
              fontSize: 14, padding: '1px 4px', borderRadius: 4, lineHeight: 1,
            }}
          >↑</button>
        </Tooltip>
        <Tooltip title="Xuống dưới">
          <button
            onClick={onMoveDown}
            disabled={isLast}
            style={{
              border: 'none', background: 'transparent',
              cursor: isLast ? 'default' : 'pointer',
              color: isLast ? '#e2e8f0' : '#94a3b8',
              fontSize: 14, padding: '1px 4px', borderRadius: 4, lineHeight: 1,
            }}
          >↓</button>
        </Tooltip>
        <Tooltip title="Nhân bản hàng này">
          <span
            onClick={() => onClone(a.id)}
            style={{ cursor: 'pointer', color: '#94a3b8', fontSize: 14, marginTop: 2, userSelect: 'none' }}
          >⧉</span>
        </Tooltip>
        <Popconfirm
          title="Xóa card này?"
          okText="Xóa"
          cancelText="Huỷ"
          okButtonProps={{ danger: true, size: 'small' }}
          onConfirm={() => onRemove(a.id)}
        >
          <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#cbd5e1', fontSize: 15, marginTop: 2, padding: 0, lineHeight: 1 }}>🗑</button>
        </Popconfirm>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function KeHoachToPage() {
  const { user } = useAuth()

  // ── Visible tabs theo role ─────────────────────────────────────────────────
  const visibleTabs = (() => {
    const role = user?.role
    if (role === 'ADMIN_PCPL1') return TO_TABS.filter(t => ['PCPL1', 'PCPL3'].includes(t.key))
    if (role === 'ADMIN_PCPL2') return TO_TABS.filter(t => t.key === 'PCPL2')
    if (role === 'ADMIN_PCPL3') return TO_TABS.filter(t => t.key === 'PCPL3')
    if (role === 'ADMIN_BBC1')  return TO_TABS.filter(t => t.key === 'BBC1')
    if (role === 'ADMIN_DG')    return TO_TABS.filter(t => t.key === 'ĐG')
    return TO_TABS
  })()

  // ── Persist: đọc từ sessionStorage khi mount ──────────────────────────────
  const [selectedTo, setSelectedToState] = useState(() => sessionStorage.getItem(SS_TO) || '')
  const [weekStart, setWeekStartState]   = useState(() => {
    const saved = sessionStorage.getItem(SS_WEEK)
    return saved ? dayjs(saved).startOf('isoWeek') : dayjs().startOf('isoWeek')
  })

  const [planSource, setPlanSourceState] = useState(
    () => sessionStorage.getItem(SS_SOURCE) || 'PLAN'
  )
  const [timeMode, setTimeModeState] = useState(
    () => sessionStorage.getItem(SS_TIME_MODE) || 'week'
  )
  const [monthStart, setMonthStartState] = useState(() => {
    const saved = sessionStorage.getItem(SS_MONTH)
    return saved ? dayjs(saved).startOf('month') : dayjs().startOf('month')
  })

  function setSelectedTo(v) {
    sessionStorage.setItem(SS_TO, v || '')
    setSelectedToState(v)
  }
  function setWeekStart(v) {
    sessionStorage.setItem(SS_WEEK, v.format('YYYY-MM-DD'))
    setWeekStartState(v)
  }
  function setPlanSource(v) {
    sessionStorage.setItem(SS_SOURCE, v)
    setPlanSourceState(v)
  }
  function setTimeMode(v) {
    sessionStorage.setItem(SS_TIME_MODE, v)
    setTimeModeState(v)
  }
  function setMonthStart(v) {
    sessionStorage.setItem(SS_MONTH, v.format('YYYY-MM-DD'))
    setMonthStartState(v)
  }

  const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'))

  // ── Data ───────────────────────────────────────────────────────────────────
  const [plans, setPlans]         = useState([])   // source=PLAN work-schedule records
  const [employees, setEmployees] = useState([])
  const [loading, setLoading]     = useState(false)

  // ── Secondary filter ───────────────────────────────────────────────────────
  const [filterDay, setFilterDay] = useState('')

  // ── Planning state — lưu riêng theo từng tổ, persist sang sessionStorage ──
  const uidRef = useRef((() => {
    try {
      const saved = sessionStorage.getItem(SS_ASSIGNS)
      if (!saved) return 1
      const parsed = JSON.parse(saved)
      const allIds = Object.values(parsed).flat().map(a => a.id || 0)
      return allIds.length > 0 ? Math.max(...allIds) + 1 : 1
    } catch { return 1 }
  })())
  const [assignsByTo, setAssignsByTo] = useState(() => {
    try {
      const saved = sessionStorage.getItem(SS_ASSIGNS)
      return saved ? JSON.parse(saved) : {}
    } catch { return {} }
  })

  // assigns / setAssigns luôn trỏ vào tổ đang chọn
  const assigns = (selectedTo ? assignsByTo[selectedTo] : null) || []
  function setAssigns(updater) {
    if (!selectedTo) return
    setAssignsByTo(prev => {
      const cur  = prev[selectedTo] || []
      const next = typeof updater === 'function' ? updater(cur) : updater
      return { ...prev, [selectedTo]: next }
    })
  }

  // Persist assigns sang sessionStorage mỗi khi có thay đổi
  useEffect(() => {
    try { sessionStorage.setItem(SS_ASSIGNS, JSON.stringify(assignsByTo)) } catch {}
  }, [assignsByTo])

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [selectedDay, setSelectedDay] = useState(() => fmtDay(dayjs()))
  const [viewMode, setViewMode]       = useState('viec')
  // Tổ hiển thị trong panel nhân viên — có thể khác tab chính
  const [empTo, setEmpTo] = useState(selectedTo)
  // Khi đổi tab chính → reset empTo về tab mới
  useEffect(() => { setEmpTo(selectedTo) }, [selectedTo])

  // ── Drag ───────────────────────────────────────────────────────────────────
  const dragKind    = useRef(null)
  const dragPayload = useRef(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchPlans = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page: 0, size: 2000, source: planSource }
      if (timeMode === 'week') {
        params.fromDate = weekStart.format('YYYY-MM-DD')
        params.toDate   = weekStart.add(6, 'day').format('YYYY-MM-DD')
      } else if (timeMode === 'month') {
        params.fromDate = monthStart.startOf('month').format('YYYY-MM-DD')
        params.toDate   = monthStart.endOf('month').format('YYYY-MM-DD')
      }
      const { data } = await api.get('/work-schedule', { params })
      const plansList = data?.content || []
      setPlans(plansList)
      return plansList
    } catch {
      message.error('Không thể tải kế hoạch')
      return []
    } finally {
      setLoading(false)
    }
  }, [weekStart, monthStart, timeMode, planSource])

  const fetchEmployees = useCallback(async () => {
    try {
      const { data } = await api.get('/employees', { params: { size: 500 } })
      setEmployees((data?.content || []).filter(e => !e.ngayNghiViec))
    } catch {
      message.error('Không thể tải nhân viên')
    }
  }, [])

  // Sau khi fetchPlans xong, fetch sessions để populate sessionIds và lock status vào assigns
  const fetchSessionsForWeek = useCallback(async (plansList) => {
    if (!plansList?.length) return
    // date range chỉ dùng khi ở chế độ tuần
    const fromDate = timeMode === 'week' ? weekStart.format('YYYY-MM-DD') : null
    const toDate   = timeMode === 'week' ? weekStart.add(6, 'day').format('YYYY-MM-DD') : null
    try {
      // Fetch sessions theo từng plan (batch)
      const wsIds = [...new Set(plansList.map(p => p.id))]
      const sessionParams = planSource === 'SCHEDULE'
        ? (id) => ({ scheduleId: id, loaiSession: 'KH_TO' })
        : (id) => ({ scheduleId: id })
      const results = await Promise.allSettled(
        wsIds.map(id => api.get('/work-schedule-session', { params: sessionParams(id) }))
      )
      // Gom tất cả sessions; nếu có range thì lọc, không thì lấy hết
      const allSessions = results.flatMap(r =>
        r.status === 'fulfilled' ? (r.value.data || []) : []
      ).filter(s => !fromDate || (s.ngay >= fromDate && s.ngay <= toDate))

      if (!allSessions.length) return

      // Update sessionIds vào assigns đang có
      setAssignsByTo(prev => {
        const updated = {}
        Object.keys(prev).forEach(toKey => {
          updated[toKey] = (prev[toKey] || []).map(assign => {
            if (!assign.wsId || !assign.ngayFull) return assign
            const caSession = CA_TO_SESSION[assign.ca]
            const matching  = allSessions.filter(s =>
              s.workScheduleId === assign.wsId &&
              s.ngay === assign.ngayFull &&
              (s.caSanXuat === caSession || !caSession)
            )
            if (!matching.length) return assign
            const newSessionIds = { ...assign.sessionIds }
            // Luôn overwrite từ backend để đảm bảo locked status mới nhất
            matching.forEach(s => {
              if (s.maNhanVien) {
                newSessionIds[s.maNhanVien] = { id: s.id, locked: s.sanLuong != null }
              }
            })
            // Đảm bảo mas chứa đủ người có session
            const existingMas = new Set(assign.mas)
            matching.forEach(s => { if (s.maNhanVien) existingMas.add(s.maNhanVien) })
            return { ...assign, mas: [...existingMas], sessionIds: newSessionIds }
          })
        })
        return updated
      })

      // Rebuild assign cards từ sessions cho các ngày chưa có assign
      setAssignsByTo(prev => {
        const updated = { ...prev }
        // Group sessions by (wsId, ngay, ca)
        const grouped = {}
        allSessions.forEach(s => {
          const key = `${s.workScheduleId}|${s.ngay}|${s.caSanXuat}`
          if (!grouped[key]) grouped[key] = []
          grouped[key].push(s)
        })
        Object.values(grouped).forEach(group => {
          const first   = group[0]
          const plan    = plansList.find(p => p.id === first.workScheduleId)
          if (!plan) return
          const ngay    = dayjs(first.ngay).format('DD/MM')
          const ca      = CA_FROM_SESSION[first.caSanXuat] || 'Ca 1'
          // Map congDoan → tab key (e.g. 'PL' → 'PCPL3', 'CC' → 'Cân Chia')
          const toKeyFromCd = TO_TABS.find(t => t.schedCongDoan === plan.congDoan)?.key
          const toKey       = toKeyFromCd || plan.toNhom || ''
          const existing = (updated[toKey] || []).find(a =>
            a.wsId === first.workScheduleId && a.ngayFull === first.ngay && a.ca === ca
          )
          if (existing) return  // đã có → fetchSessionsForWeek đã update ở trên
          const sessionIds = {}
          group.forEach(s => {
            if (s.maNhanVien) sessionIds[s.maNhanVien] = { id: s.id, locked: s.sanLuong != null }
          })
          const newAssign = {
            id:         uidRef.current++,
            wsId:       plan.id,
            ten:        plan.tenTrinh || plan.maBravo || plan.maSp || '(Không tên)',
            maSp:       plan.maSp        || '',
            maBravo:    plan.maBravo     || '',
            maDonHang:  plan.maDonHang   || '',
            soLo:       plan.soLo        || '',
            coLo:       plan.coLo        || null,
            toNhom:     plan.toNhom      || '',
            congDoan:   plan.congDoan    || '',
            isUrgent:   isUrgent(plan),
            ngay,
            ngayFull:   first.ngay,
            ca,
            caStart:    '',
            caEnd:      '',
            mas:        group.map(s => s.maNhanVien).filter(Boolean),
            sessionIds,
            note:       '',
          }
          if (!updated[toKey]) updated[toKey] = []
          updated[toKey] = [...updated[toKey], newAssign]
        })
        return updated
      })
    } catch {
      // Silent — assigns vẫn hoạt động ở local state
    }
  }, [weekStart, timeMode])

  // Gọi tất cả khi mount hoặc tuần / nguồn thay đổi
  const fetchAll = useCallback(async () => {
    await Promise.all([fetchPlans(), fetchEmployees()])
  }, [fetchPlans, fetchEmployees])

  useEffect(() => {
    fetchPlans().then(plansList => {
      if (plansList) fetchSessionsForWeek(plansList)
    })
  }, [fetchPlans, fetchSessionsForWeek])
  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  // Auto-select tab khi role chỉ được xem 1 tab
  useEffect(() => {
    if (visibleTabs.length === 1 && selectedTo !== visibleTabs[0].key) {
      setSelectedTo(visibleTabs[0].key)
    }
  }, [user?.role]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Panel resize ──────────────────────────────────────────────────────────
  const [leftW,  setLeftW]  = useState(300)
  const [splitY, setSplitY] = useState(320)
  const [p1Open, setP1Open] = useState(true)
  const [p2Open, setP2Open] = useState(true)
  const resizeDrag = useRef(null)

  useEffect(() => {
    const onMove = e => {
      const d = resizeDrag.current
      if (!d) return
      if (d.kind === 'col') {
        setLeftW(Math.max(180, Math.min(560, d.initW + e.clientX - d.startX)))
      } else {
        setSplitY(Math.max(100, Math.min(580, d.initH + e.clientY - d.startY)))
      }
    }
    const onUp = () => { resizeDrag.current = null }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',  onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',  onUp)
    }
  }, [])

  // ── Derived ────────────────────────────────────────────────────────────────
  const isUrgent = p => {
    const t = `${p.tenTrinh || ''} ${p.chuY || ''} ${p.saiLech || ''}`.toUpperCase()
    return t.includes('GẤP') || t.includes('GAP')
  }

  // Helper: lấy tab config của selectedTo
  const selectedTab = TO_TABS.find(t => t.key === selectedTo)

  // Lọc plans: theo tổ (selectedTo) và ngày (filterDay)
  const filteredPlans = plans.filter(p => {
    if (selectedTo) {
      if (planSource === 'SCHEDULE') {
        // Lịch SX: filter theo congDoan (WorkSchedulePage dùng cùng convention)
        // PCPL3 tab có schedCongDoan='PL' (không phải 'PCPL3')
        if (p.congDoan !== selectedTab?.schedCongDoan) return false
        // Với PCPL1/PCPL2: ẩn bản ghi đã gán tổ kia
        if (selectedTo === 'PCPL1' && p.toNhom === 'PCPL2') return false
        if (selectedTo === 'PCPL2' && p.toNhom === 'PCPL1') return false
      } else {
        // Kế hoạch: Cân Chia dùng congDoan, còn lại dùng toNhom
        if (selectedTab?.congDoanKey) {
          if (p.congDoan !== selectedTab.congDoanKey) return false
        } else {
          if (p.toNhom !== selectedTo) return false
        }
      }
    }
    if (filterDay) {
      const d = p.ngayThucHien ? fmtDay(p.ngayThucHien) : ''
      if (d !== filterDay) return false
    }
    return true
  })

  // Nhân viên theo tổ panel nhân viên (có thể khác tab chính)
  // Cân Chia → hiển thị tất cả nhân viên (CC không có team riêng)
  const displayEmps = empTo
    ? (() => {
        const tab = TO_TABS.find(t => t.key === empTo)
        if (tab?.congDoanKey) return employees
        return employees.filter(e => e.toNhom === empTo)
      })()
    : employees

  // ── Conflict detection ─────────────────────────────────────────────────────
  function getConflictSet() {
    const seen = {}, dup = new Set()
    assigns.forEach(a => a.mas.forEach(m => {
      const k = `${m}|${a.ngay}|${a.ca}`
      if (seen[k]) dup.add(k); else seen[k] = true
    }))
    return dup
  }
  const dup          = getConflictSet()
  const conflictCount = dup.size

  // ── Drag handlers ──────────────────────────────────────────────────────────
  function onDragStartProduct(e, plan) {
    dragKind.current    = 'product'
    dragPayload.current = plan
    e.dataTransfer.effectAllowed = 'copy'
  }
  function onDragStartPerson(e, emp) {
    dragKind.current    = 'person'
    dragPayload.current = emp
    e.dataTransfer.effectAllowed = 'copy'
  }
  function onDragStartPersonMove(e, ma, fromAssignId) {
    dragKind.current    = 'personMove'
    dragPayload.current = { ma, fromAssignId }
    e.dataTransfer.effectAllowed = 'move'
  }
  function onDragOver(e) { e.preventDefault() }

  function getFullDate(dayStr) {
    const d = days.find(day => fmtDay(day) === dayStr)
    return d ? d.format('YYYY-MM-DD') : null
  }

  function onDropProduct(e, dayStr) {
    e.preventDefault()
    if (dragKind.current !== 'product') return
    const p = dragPayload.current
    const ngay = dayStr || selectedDay
    setAssigns(prev => [...prev, {
      id: uidRef.current++,
      wsId: p.id,
      ten: p.tenTrinh || p.maBravo || p.maSp || '(Chưa có tên)',
      maSp: p.maSp || '',
      maBravo: p.maBravo || '',
      maDonHang: p.maDonHang || '',
      soLo: p.soLo || '',
      coLo: p.coLo || null,
      toNhom: p.toNhom || '',
      congDoan: p.congDoan || '',
      isUrgent: isUrgent(p),
      ngay,
      ngayFull: getFullDate(ngay),
      ca: 'Ca 1',
      caStart: '',
      caEnd: '',
      mas: [],
      sessionIds: {},
      note: '',
    }])
  }

  async function onDropPerson(e, assignId) {
    e.preventDefault()
    if (dragKind.current === 'person') {
      const emp = dragPayload.current
      const assign = assigns.find(a => a.id === assignId)
      if (!assign) return
      if (assign.mas.includes(emp.maNhanVien)) return

      // Optimistic UI
      setAssigns(prev => prev.map(a =>
        a.id === assignId ? { ...a, mas: [...a.mas, emp.maNhanVien] } : a
      ))

      // Không có wsId hoặc ngayFull → chỉ lưu local
      if (!assign.wsId || !assign.ngayFull) return

      const caSession = CA_TO_SESSION[assign.ca]
      const thoiGian  = DEFAULT_GIO[caSession] ?? 7
      const congThuc  = parseFloat((thoiGian / (caSession === 'HC' ? 8 : 7)).toFixed(2))

      try {
        const { data } = await api.post('/work-schedule-session', {
          workScheduleId: assign.wsId,
          ngay:           assign.ngayFull,
          maNhanVien:     emp.maNhanVien,
          nguoiThucHien:  emp.hoVaTen || emp.maNhanVien,
          nhomThucHien:   emp.toNhom  || assign.toNhom || null,
          caSanXuat:      caSession,
          thoiGianBatDau: thoiGian,
          congThucHien:   congThuc,
          ...(planSource === 'SCHEDULE' ? { loaiSession: 'KH_TO' } : {}),
        })
        setAssigns(prev => prev.map(a =>
          a.id === assignId
            ? { ...a, sessionIds: { ...a.sessionIds, [emp.maNhanVien]: { id: data.id, locked: false } } }
            : a
        ))
      } catch (err) {
        if (err.response?.status === 409) {
          // Session đã tồn tại → fetch session hiện có để lấy ID và lock status
          try {
            const { data: existingSessions } = await api.get('/work-schedule-session', {
              params: { scheduleId: assign.wsId, ...(planSource === 'SCHEDULE' ? { loaiSession: 'KH_TO' } : {}) }
            })
            const found = Array.isArray(existingSessions)
              ? existingSessions.find(s => s.maNhanVien === emp.maNhanVien && s.ngay === assign.ngayFull)
              : null
            if (found?.id) {
              setAssigns(prev => prev.map(a =>
                a.id === assignId
                  ? { ...a, sessionIds: { ...a.sessionIds, [emp.maNhanVien]: { id: found.id, locked: found.sanLuong != null && String(found.sanLuong).trim() !== '' } } }
                  : a
              ))
            }
          } catch { /* không tìm được → vẫn giữ trong UI, locked=false */ }
        } else {
          // Rollback
          setAssigns(prev => prev.map(a =>
            a.id === assignId ? { ...a, mas: a.mas.filter(m => m !== emp.maNhanVien) } : a
          ))
          message.error('Không thể thêm người — thử lại')
        }
      }
    } else if (dragKind.current === 'personMove') {
      // Di chuyển người giữa các card — chỉ local (session không đổi)
      const { ma, fromAssignId } = dragPayload.current
      if (fromAssignId === assignId) return
      setAssigns(prev => prev.map(a => {
        if (a.id === fromAssignId) return { ...a, mas: a.mas.filter(m => m !== ma) }
        if (a.id === assignId && !a.mas.includes(ma)) return { ...a, mas: [...a.mas, ma] }
        return a
      }))
    }
  }

  async function removePerson(assignId, ma) {
    const assign = assigns.find(a => a.id === assignId)
    const sessionInfo = assign?.sessionIds?.[ma]

    if (!sessionInfo) {
      // Chưa có session → xóa local
      setAssigns(prev => prev.map(a =>
        a.id === assignId ? { ...a, mas: a.mas.filter(m => m !== ma) } : a
      ))
      return
    }

    try {
      await api.delete(`/work-schedule-session/${sessionInfo.id}`)
      setAssigns(prev => prev.map(a => {
        if (a.id !== assignId) return a
        const newSessionIds = { ...a.sessionIds }
        delete newSessionIds[ma]
        return { ...a, mas: a.mas.filter(m => m !== ma), sessionIds: newSessionIds }
      }))
    } catch (err) {
      const status = err?.response?.status
      const msg = err?.response?.data?.message || err?.response?.data || ''
      message.error(`Xóa thất bại (${status || '?'}): ${msg || 'Thử lại'}`)
      console.error('[removePerson] delete session', sessionInfo.id, err?.response)
    }
  }

  async function removeAssign(assignId) {
    const assign = assigns.find(a => a.id === assignId)
    if (!assign) return

    const sessionIdsToDelete = Object.values(assign.sessionIds || {})
      .filter(s => s?.id)
      .map(s => s.id)

    try {
      if (sessionIdsToDelete.length > 0) {
        await Promise.all(sessionIdsToDelete.map(id => api.delete(`/work-schedule-session/${id}`)))
      }
      setAssigns(prev => prev.filter(a => a.id !== assignId))
    } catch (err) {
      const status = err?.response?.status
      const msg = err?.response?.data?.message || err?.response?.data || ''
      message.error(`Xóa card thất bại (${status || '?'}): ${msg || 'Thử lại'}`)
      console.error('[removeAssign] delete sessions', sessionIdsToDelete, err?.response)
    }
  }
  function updateAssign(assignId, key, val) {
    setAssigns(prev => prev.map(a =>
      a.id === assignId ? { ...a, [key]: val } : a
    ))
  }

  // Di chuyển lên / xuống trong cùng một ngày
  function moveAssign(assignId, direction) {
    setAssigns(prev => {
      const dayStr = prev.find(a => a.id === assignId)?.ngay
      if (!dayStr) return prev
      const dayIdx = prev.reduce((acc, a, i) => { if (a.ngay === dayStr) acc.push(i); return acc }, [])
      const posInDay = dayIdx.findIndex(i => prev[i].id === assignId)
      if (direction === 'up'   && posInDay === 0)               return prev
      if (direction === 'down' && posInDay === dayIdx.length - 1) return prev
      const thisIdx = dayIdx[posInDay]
      const swapIdx = direction === 'up' ? dayIdx[posInDay - 1] : dayIdx[posInDay + 1]
      const next = [...prev]
      ;[next[thisIdx], next[swapIdx]] = [next[swapIdx], next[thisIdx]]
      return next
    })
  }

  // Nhân bản một hàng trong cùng ngày
  function cloneAssign(assignId) {
    setAssigns(prev => {
      const idx = prev.findIndex(a => a.id === assignId)
      if (idx < 0) return prev
      const orig   = prev[idx]
      const cloned = { ...orig, id: uidRef.current++, mas: [...orig.mas] }
      const next   = [...prev]
      next.splice(idx + 1, 0, cloned)
      return next
    })
  }

  // Nhân bản một ngày → sang ngày kế tiếp trong tuần
  function cloneDay(dayStr) {
    const dayIdx = days.findIndex(d => fmtDay(d) === dayStr)
    if (dayIdx < 0 || dayIdx >= days.length - 1) {
      message.warning('Không thể nhân bản: đã là ngày cuối tuần.')
      return
    }
    const nextDay     = fmtDay(days[dayIdx + 1])
    const dayAssigns  = assigns.filter(a => a.ngay === dayStr)
    if (dayAssigns.length === 0) {
      message.info('Ngày này chưa có công việc nào để nhân bản.')
      return
    }
    const cloned = dayAssigns.map(a => ({ ...a, id: uidRef.current++, ngay: nextDay, mas: [...a.mas] }))
    setAssigns(prev => [...prev, ...cloned])
    message.success(`Đã nhân bản ${cloned.length} việc → ${DOW[days[dayIdx + 1].day()]} ${nextDay}`)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '12px 20px', background: '#eef1f6', height: '100%', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden', boxSizing: 'border-box' }}>

      {/* ── Hàng 1: Tab bộ phận + controls gộp chung ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>

        {/* Tab buttons bộ phận */}
        {visibleTabs.map(tab => {
          const isSel      = selectedTo === tab.key
          const tabAssigns = assignsByTo[tab.key] || []
          return (
            <button
              key={tab.key}
              onClick={() => setSelectedTo(tab.key)}
              style={{
                border: `1.5px solid ${isSel ? '#4f46e5' : '#cbd5e1'}`,
                background: isSel ? '#4f46e5' : '#fff',
                color: isSel ? '#fff' : '#475569',
                borderRadius: 9, padding: '5px 14px',
                cursor: 'pointer', fontWeight: 700, fontSize: 12.5,
                display: 'flex', alignItems: 'center', gap: 5,
                boxShadow: isSel ? '0 2px 8px #4f46e533' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <TeamOutlined style={{ fontSize: 11 }} />
              {tab.label}
              {tabAssigns.length > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 800,
                  background: isSel ? '#818cf8' : '#e2e8f0',
                  color: isSel ? '#fff' : '#64748b',
                  borderRadius: 999, padding: '1px 5px',
                }}>
                  {tabAssigns.length}
                </span>
              )}
            </button>
          )
        })}

        {/* Divider dọc */}
        <div style={{ width: 1, height: 22, background: '#cbd5e1', flexShrink: 0 }} />

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 800, color: '#1e293b', flexShrink: 0 }}>
          <ProjectOutlined style={{ color: '#6366f1', fontSize: 15 }} />
          <span style={{ fontSize: 14 }}>Kế Hoạch Tổ</span>
          {selectedTo && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', background: '#eef2ff', borderRadius: 6, padding: '1px 7px' }}>
              {TO_TABS.find(t => t.key === selectedTo)?.label || selectedTo}
            </span>
          )}
        </div>

        {/* Time mode */}
        <div style={{ display: 'flex', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 7, overflow: 'hidden', flexShrink: 0 }}>
          {TIME_MODES.map(m => (
            <button key={m.key} onClick={() => setTimeMode(m.key)} style={{
              border: 'none', cursor: 'pointer', padding: '4px 9px',
              fontWeight: 700, fontSize: 11,
              background: timeMode === m.key ? '#0f766e' : 'transparent',
              color: timeMode === m.key ? '#fff' : '#64748b',
            }}>{m.label}</button>
          ))}
        </div>

        {timeMode === 'week' && (
          <DatePicker picker="week" value={weekStart}
            onChange={v => v && setWeekStart(v.startOf('isoWeek'))}
            size="small" format="[Tuần] WW · YYYY" allowClear={false} style={{ width: 130, flexShrink: 0 }} />
        )}
        {timeMode === 'month' && (
          <DatePicker picker="month" value={monthStart}
            onChange={v => v && setMonthStart(v.startOf('month'))}
            size="small" format="MM/YYYY" allowClear={false} style={{ width: 85, flexShrink: 0 }} />
        )}

        <Button size="small" icon={<ReloadOutlined />} onClick={fetchAll} loading={loading} style={{ flexShrink: 0 }}>
          Tải lại
        </Button>

        {conflictCount > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
            background: '#fef2f2', border: '1px solid #fecaca',
            color: '#b91c1c', borderRadius: 7, padding: '3px 9px', fontSize: 11.5, fontWeight: 600,
          }}>
            <WarningOutlined /> {conflictCount} xung đột
          </div>
        )}

        {/* View toggle — đẩy sang phải */}
        <div style={{ marginLeft: 'auto', display: 'flex', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
          {['viec', 'nguoi'].map(v => (
            <button key={v} onClick={() => setViewMode(v)} style={{
              border: 'none', cursor: 'pointer', padding: '5px 12px',
              fontWeight: 600, fontSize: 12,
              background: viewMode === v ? '#4f46e5' : '#fff',
              color: viewMode === v ? '#fff' : '#64748b',
            }}>
              {v === 'viec' ? 'Theo việc' : 'Theo người'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main area: left panels + resize handle + right panel ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, alignItems: 'stretch' }}>

        {/* ── Left column: ① + ② stacked ── */}
        <div style={{ width: leftW, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 0 }}>

          {/* ① Kế hoạch tổng */}
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
            display: 'flex', flexDirection: 'column',
            flex: p1Open ? (p2Open ? `0 0 ${splitY}px` : '1 1 0') : '0 0 38px',
            overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', flexShrink: 0, borderBottom: p1Open ? '1px solid #f1f5f9' : 'none' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', flex: 1 }}>
                ① Kế hoạch tổng — kéo sản phẩm
              </span>
              <div style={{ display: 'flex', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                {PLAN_SOURCES.map(s => (
                  <button key={s.key} onClick={() => setPlanSource(s.key)} style={{
                    border: 'none', cursor: 'pointer', padding: '3px 8px',
                    fontSize: 10.5, fontWeight: 700,
                    background: planSource === s.key ? '#4f46e5' : 'transparent',
                    color: planSource === s.key ? '#fff' : '#64748b',
                  }}>{s.label}</button>
                ))}
              </div>
              <button onClick={() => setP1Open(v => !v)} title={p1Open ? 'Thu nhỏ' : 'Mở rộng'} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>
                {p1Open ? '▴' : '▾'}
              </button>
            </div>

            {p1Open && (
              <>
                <div style={{ fontSize: 10.5, color: '#94a3b8', padding: '5px 13px 4px', flexShrink: 0 }}>
                  {selectedTo
                    ? <span>Đang xem: <b style={{ color: '#0f766e' }}>{TO_TABS.find(t => t.key === selectedTo)?.label || selectedTo}</b> · Kéo thả vào ngày bên phải.</span>
                    : 'Chọn tổ ở tab trên rồi kéo thả vào ngày.'}
                </div>
                <div style={{ padding: '0 12px 7px', flexShrink: 0 }}>
                  <Select value={filterDay || undefined} placeholder="Tất cả ngày" allowClear onChange={v => setFilterDay(v || '')} style={{ width: '100%' }} size="small" popupMatchSelectWidth={false}>
                    {days.map(d => <Option key={fmtDay(d)} value={fmtDay(d)}>{dowOf(d)} {fmtDay(d)}</Option>)}
                  </Select>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {loading ? (
                    <div style={{ padding: 16, textAlign: 'center' }}><Spin size="small" /></div>
                  ) : !selectedTo ? (
                    <div style={{ color: '#94a3b8', fontSize: 12, padding: '10px 0' }}>— Chọn tổ để xem kế hoạch —</div>
                  ) : filteredPlans.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: 12, padding: '10px 0' }}>
                      {(() => {
                        const hasAny = planSource === 'SCHEDULE'
                          ? plans.some(p => p.congDoan === selectedTab?.schedCongDoan)
                          : (selectedTab?.congDoanKey ? plans.some(p => p.congDoan === selectedTab.congDoanKey) : plans.some(p => p.toNhom === selectedTo))
                        return hasAny ? 'Không có kết quả khớp bộ lọc.' : `Không có dữ liệu từ "${PLAN_SOURCES.find(s => s.key === planSource)?.label}" cho tổ ${TO_TABS.find(t => t.key === selectedTo)?.label || selectedTo} tuần này.`
                      })()}
                    </div>
                  ) : filteredPlans.map(p => {
                    const pDay = p.ngayThucHien ? dayjs(p.ngayThucHien) : null
                    const urgent = isUrgent(p)
                    return (
                      <div key={p.id} draggable onDragStart={e => onDragStartProduct(e, p)}
                        style={{ border: `1px solid ${urgent ? '#fca5a5' : '#d1fae5'}`, background: urgent ? '#fff5f5' : '#ecfdf5', borderRadius: 10, padding: '8px 10px', cursor: 'grab' }}>
                        <div style={{ fontWeight: 700, fontSize: 12.5, color: urgent ? '#b91c1c' : '#065f46', lineHeight: 1.35 }}>
                          {p.tenTrinh || p.maBravo || p.maSp || '(Chưa có tên)'}
                        </div>
                        <div style={{ fontSize: 10.5, color: '#64748b', fontFamily: 'monospace', marginTop: 2, display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                          {p.maSp && <span>{p.maSp}</span>}
                          {p.maDonHang && <span style={{ color: '#818cf8' }}>ĐH {p.maDonHang}</span>}
                          {p.soLo && <span style={{ background: '#ede9fe', color: '#6d28d9', borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>Lô {p.soLo}</span>}
                          {p.coLo && <span style={{ color: '#475569' }}>SL {Number(p.coLo).toLocaleString('vi-VN')}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                          {p.toNhom && <span style={{ fontSize: 10, fontWeight: 800, background: '#ccfbf1', color: '#0f766e', borderRadius: 4, padding: '1px 6px' }}>{p.toNhom}</span>}
                          {p.congDoan && <span style={{ fontSize: 10, fontWeight: 700, background: '#e0f2fe', color: '#0369a1', borderRadius: 4, padding: '1px 6px' }}>{p.congDoan}</span>}
                          {pDay && <span style={{ fontSize: 10, fontWeight: 700, background: '#f1f5f9', color: '#475569', borderRadius: 4, padding: '1px 6px' }}>{DOW[pDay.day()]} {fmtDay(pDay)}</span>}
                          {urgent && <span style={{ fontSize: 10, fontWeight: 800, background: '#fef2f2', color: '#dc2626', borderRadius: 4, padding: '1px 6px' }}>⚠ Gấp</span>}
                          {p.tinhTrang && <span style={{ fontSize: 10, background: p.tinhTrang === 'done' ? '#dcfce7' : '#fef9c3', color: p.tinhTrang === 'done' ? '#166534' : '#854d0e', borderRadius: 4, padding: '1px 6px' }}>{p.tinhTrang}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Drag handle dọc giữa ① và ② */}
          {p1Open && p2Open && (
            <div
              onMouseDown={e => { resizeDrag.current = { kind: 'row', startY: e.clientY, initH: splitY } }}
              style={{ height: 10, flexShrink: 0, cursor: 'row-resize', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#d1d5db' }} />
            </div>
          )}

          {/* ② Nhân viên trong tổ */}
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
            display: 'flex', flexDirection: 'column',
            flex: p2Open ? '1 1 0' : '0 0 38px',
            overflow: 'hidden', minHeight: 38,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', flexShrink: 0, borderBottom: p2Open ? '1px solid #f1f5f9' : 'none' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', flex: 1 }}>
                ② Nhân viên trong tổ — kéo người
              </span>
              {p2Open && empTo && <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{displayEmps.length} người</span>}
              <button onClick={() => setP2Open(v => !v)} title={p2Open ? 'Thu nhỏ' : 'Mở rộng'} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>
                {p2Open ? '▴' : '▾'}
              </button>
            </div>

            {p2Open && (
              <>
                <div style={{ padding: '6px 12px 4px', display: 'flex', flexWrap: 'wrap', gap: 4, flexShrink: 0 }}>
                  {visibleTabs.map(tab => {
                    const isSel = empTo === tab.key
                    return (
                      <button key={tab.key} onClick={() => setEmpTo(tab.key)} style={{
                        border: `1.5px solid ${isSel ? '#0f766e' : '#e2e8f0'}`,
                        background: isSel ? '#0f766e' : '#f8fafc',
                        color: isSel ? '#fff' : '#64748b',
                        borderRadius: 999, padding: '2px 9px', cursor: 'pointer', fontWeight: 700, fontSize: 11,
                      }}>{tab.label}</button>
                    )
                  })}
                </div>
                <div style={{ fontSize: 10.5, color: '#94a3b8', padding: '0 13px 5px', flexShrink: 0 }}>
                  {empTo
                    ? <span>Tổ <b style={{ color: '#0f766e' }}>{TO_TABS.find(t => t.key === empTo)?.label || empTo}</b> · {displayEmps.length} người · kéo thả vào card bên phải.</span>
                    : 'Chọn tổ để xem nhân viên.'}
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 10px', display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start' }}>
                  {!empTo ? (
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>— Chưa chọn tổ —</div>
                  ) : displayEmps.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>Không có nhân viên trong tổ {TO_TABS.find(t => t.key === empTo)?.label || empTo}.</div>
                  ) : displayEmps.map(emp => {
                    const isTN = (emp.viTri || '').toLowerCase().includes('tổ trưởng') || (emp.viTri || '').toUpperCase() === 'TN'
                    return (
                      <div key={emp.maNhanVien} draggable onDragStart={e => onDragStartPerson(e, emp)} title={`${emp.maNhanVien} · ${emp.toNhom || ''}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, border: `1px solid ${isTN ? '#fde68a' : '#e2e8f0'}`, background: isTN ? '#fffbeb' : '#f8fafc', borderRadius: 999, padding: '4px 10px 4px 4px', fontSize: 12, fontWeight: 600, cursor: 'grab', userSelect: 'none' }}>
                        <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: isTN ? '#fde68a' : '#c7d2fe', color: isTN ? '#92400e' : '#4338ca', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {initials(emp.hoVaTen)}
                        </span>
                        {emp.hoVaTen}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Drag handle ngang giữa left và right */}
        <div
          onMouseDown={e => { resizeDrag.current = { kind: 'col', startX: e.clientX, initW: leftW } }}
          style={{ width: 12, flexShrink: 0, cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ width: 4, height: 48, borderRadius: 2, background: '#d1d5db' }} />
        </div>

        {/* ── ③ Right column: Kế hoạch chi tiết ── */}
        <div style={{ flex: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', color: '#64748b', padding: '10px 14px 6px', textTransform: 'uppercase', flexShrink: 0 }}>
            ③ Kế hoạch chi tiết — chọn ngày để xếp
          </div>

          {viewMode === 'viec' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px 8px', flexShrink: 0 }}>
                <Button size="small" icon={<LeftOutlined />} onClick={() => setWeekStart(weekStart.subtract(1, 'week').startOf('isoWeek'))} style={{ flexShrink: 0 }} />
                <DatePicker picker="week" value={weekStart} onChange={v => v && setWeekStart(v.startOf('isoWeek'))} size="small" format={v => `Tuần ${v.isoWeek()} · ${v.format('MM/YYYY')}`} allowClear={false} style={{ flex: 1, minWidth: 0 }} />
                <Button size="small" icon={<RightOutlined />} onClick={() => setWeekStart(weekStart.add(1, 'week').startOf('isoWeek'))} style={{ flexShrink: 0 }} />
                {!weekStart.isSame(dayjs().startOf('isoWeek'), 'day') && (
                  <Button size="small" onClick={() => setWeekStart(dayjs().startOf('isoWeek'))} style={{ flexShrink: 0, fontSize: 11, padding: '0 8px' }}>Nay</Button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', padding: '0 14px 10px', flexShrink: 0 }}>
                {days.map(d => {
                  const dayStr  = fmtDay(d)
                  const isSel   = dayStr === selectedDay
                  const isToday = d.isSame(dayjs(), 'day')
                  return (
                    <button key={dayStr} onClick={() => setSelectedDay(dayStr)} style={{
                      border: `1.5px solid ${isSel ? '#4f46e5' : isToday ? '#a5b4fc' : '#e2e8f0'}`,
                      background: isSel ? '#4f46e5' : isToday ? '#eef2ff' : '#fff',
                      color: isSel ? '#fff' : '#475569',
                      borderRadius: 10, padding: '5px 13px',
                      cursor: 'pointer', fontWeight: 800, fontSize: 12.5, lineHeight: 1.3, position: 'relative',
                    }}>
                      <div style={{ fontSize: 10, color: isSel ? '#c7d2fe' : isToday ? '#6366f1' : '#94a3b8', fontWeight: 800 }}>{DOW[d.day()]}</div>
                      {dayStr}
                      {isToday && !isSel && <span style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: '#6366f1', display: 'block' }} />}
                    </button>
                  )
                })}
              </div>

              <div style={{ fontSize: 11, color: '#94a3b8', padding: '0 14px 6px', flexShrink: 0 }}>
                Kéo sản phẩm vào ô ngày · kéo người vào card công việc
              </div>

              <div style={{ flex: 1, overflowY: 'auto', margin: '0 12px 12px', padding: 6, borderRadius: 12, background: '#f1f5f9' }}>
                {[...days].reverse().map(d => {
                  const dayStr     = fmtDay(d)
                  const dayAssigns = assigns.filter(a => a.ngay === dayStr)
                  const isSel      = dayStr === selectedDay
                  return (
                    <div key={dayStr} style={{ border: `1px solid ${isSel ? '#6366f1' : '#e2e8f0'}`, boxShadow: isSel ? '0 0 0 3px #c7d2fe' : 'none', background: '#fff', borderRadius: 12, padding: '10px 12px', margin: '10px 4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 13, color: '#334155', marginBottom: 8 }}>
                        <span>{DOW[d.day()]} · {dayStr}</span>
                        {isSel && <span style={{ fontSize: 10, fontWeight: 800, background: '#eef2ff', color: '#4338ca', borderRadius: 999, padding: '2px 10px' }}>Đang xếp</span>}
                        {dayAssigns.length > 0 && <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{dayAssigns.length} việc</span>}
                        {(() => {
                          const ni = days.findIndex(d2 => fmtDay(d2) === dayStr)
                          const nd = ni >= 0 && ni < days.length - 1 ? days[ni + 1] : null
                          return (
                            <Tooltip title={nd ? `Sao chép sang ${DOW[nd.day()]} ${fmtDay(nd)}` : 'Đã là ngày cuối tuần'}>
                              <button onClick={() => cloneDay(dayStr)} disabled={!nd} style={{ marginLeft: 'auto', border: '1px solid #e2e8f0', background: nd ? '#f8fafc' : '#f1f5f9', borderRadius: 7, padding: '3px 9px', fontSize: 11, fontWeight: 600, color: nd ? '#64748b' : '#cbd5e1', cursor: nd ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 4 }}>
                                ⧉ Nhân bản
                              </button>
                            </Tooltip>
                          )
                        })()}
                      </div>
                      {dayAssigns.map((a, idx) => (
                        <AssignCard key={a.id} a={a} employees={employees} dup={dup}
                          onDropPerson={onDropPerson} onDragOver={onDragOver} onRemovePerson={removePerson}
                          onUpdate={updateAssign} onRemove={removeAssign}
                          isFirst={idx === 0} isLast={idx === dayAssigns.length - 1}
                          onMoveUp={() => moveAssign(a.id, 'up')} onMoveDown={() => moveAssign(a.id, 'down')}
                          onClone={cloneAssign} onDragStartPersonMove={onDragStartPersonMove} />
                      ))}
                      <div
                        onDragOver={onDragOver} onDrop={e => onDropProduct(e, dayStr)}
                        onDragEnter={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.color = '#4f46e5' }}
                        onDragLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = ''; e.currentTarget.style.color = '#94a3b8' }}
                        style={{ border: '2px dashed #cbd5e1', borderRadius: 10, padding: '8px', textAlign: 'center', fontSize: 11.5, color: '#94a3b8', marginTop: 4, transition: 'all 0.15s' }}
                      >
                        + kéo sản phẩm vào ngày này
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!selectedTo ? (
                <div style={{ color: '#94a3b8', fontSize: 12, padding: 12 }}>Chọn tổ ở thanh trên.</div>
              ) : displayEmps.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 12, padding: 12 }}>Không có nhân viên trong tổ {selectedTo}.</div>
              ) : displayEmps.map(emp => {
                const empAssigns = assigns.filter(a => a.mas.includes(emp.maNhanVien))
                const isTN       = (emp.viTri || '').toLowerCase().includes('tổ trưởng') || (emp.viTri || '').toUpperCase() === 'TN'
                return (
                  <div key={emp.maNhanVien} style={{ border: '1px solid #e2e8f0', borderRadius: 11, padding: '11px 13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, marginBottom: 7 }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: isTN ? '#fde68a' : '#c7d2fe', color: isTN ? '#92400e' : '#4338ca', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {initials(emp.hoVaTen)}
                      </span>
                      <span style={{ color: '#475569', fontSize: 12 }}>{emp.maNhanVien}</span>
                      <span>{emp.hoVaTen}</span>
                      {isTN && <span style={{ fontSize: 10, fontWeight: 700, background: '#fde68a', color: '#92400e', borderRadius: 4, padding: '1px 6px' }}>Tổ trưởng</span>}
                      <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#64748b', background: '#f1f5f9', borderRadius: 999, padding: '2px 9px' }}>{empAssigns.length} việc</span>
                    </div>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 0, margin: 0 }}>
                      {empAssigns.length === 0 ? (
                        <li style={{ color: '#94a3b8', fontSize: 12 }}>Chưa được xếp việc nào</li>
                      ) : empAssigns.map(a => {
                        const isConflict = dup.has(`${emp.maNhanVien}|${a.ngay}|${a.ca}`)
                        return (
                          <li key={a.id} style={{ fontSize: 12.5, color: '#334155', display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10.5, fontWeight: 700, borderRadius: 5, padding: '2px 7px', background: (CA_STYLE[a.ca] || CA_STYLE['Ca 1']).bg, color: '#334155' }}>
                              {a.ngay} {a.ca}{a.ca === 'Tùy chọn' && a.caStart && a.caEnd && ` ${a.caStart}–${a.caEnd}`}
                            </span>
                            {a.ten}
                            {a.note && <span style={{ color: '#94a3b8', fontSize: 11.5 }}>· {a.note}</span>}
                            {isConflict && <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 11 }}>⚠ trùng</span>}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
