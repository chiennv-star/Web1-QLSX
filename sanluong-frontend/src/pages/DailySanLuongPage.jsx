import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Table, Button, Space, Typography, message, Select, DatePicker,
  Tooltip, Modal, Input, Badge, Tag, Tabs, Popconfirm, Popover,
  AutoComplete, Drawer, InputNumber, Spin, Divider, Segmented,
} from 'antd'
import SkeletonTable from '../components/SkeletonTable'
import {
  SearchOutlined, ReloadOutlined, BarChartOutlined,
  CheckOutlined, CloseOutlined, ClockCircleOutlined,
  RiseOutlined, TeamOutlined, FundOutlined, DeleteOutlined, ExclamationCircleOutlined,
  FullscreenOutlined, FullscreenExitOutlined, ArrowRightOutlined, PlusOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RcTooltip, Legend,
  LineChart, Line, ReferenceLine, ComposedChart, ReferenceArea,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts'

const { RangePicker } = DatePicker

// ─── Shared constants ────────────────────────────────────────────────────────

const TAB_BAR_H = 42 // height của .sl-page-tabs > .ant-tabs-nav (sticky)

const CONG_DOAN_COLOR = { PCPL1: 'blue', PCPL2: 'geekblue', PL: 'green', DG: 'gold', BBC1: 'purple', CC: 'volcano', PC: 'blue' }

const CONG_DOAN_OPTIONS = [
  { value: '', label: 'Tất cả công đoạn' },
  { value: 'PCPL1', label: 'PCPL 1' },
  { value: 'PCPL2', label: 'PCPL 2' },
  { value: 'PL', label: 'PL' },
  { value: 'DG', label: 'ĐG' },
  { value: 'BBC1', label: 'BBC1' },
]

const STAGES = [
  { key: 'PCPL1', label: 'PCPL1', empGroup: 'PCPL1', slColor: '#1D4ED8', congColor: '#60A5FA', bg: '#EFF6FF', border: '#BFDBFE', headerBg: '#1e5fa3' },
  { key: 'PCPL2', label: 'PCPL2', empGroup: 'PCPL2', slColor: '#0369a1', congColor: '#38bdf8', bg: '#e0f2fe', border: '#7dd3fc', headerBg: '#075985' },
  { key: 'PL',    label: 'PL',    empGroup: 'PCPL3', slColor: '#0e7490', congColor: '#22d3ee', bg: '#ecfeff', border: '#67e8f9', headerBg: '#0e7490' },
  { key: 'DG',    label: 'ĐG',    empGroup: 'ĐG',    slColor: '#b45309', congColor: '#fbbf24', bg: '#fffbeb', border: '#fde68a', headerBg: '#b45309' },
  { key: 'BBC1',  label: 'BBC1',  empGroup: 'BBC1',  slColor: '#6d28d9', congColor: '#c084fc', bg: '#f5f3ff', border: '#c4b5fd', headerBg: '#6d28d9' },
  { key: 'CC',    label: 'CC',    empGroup: 'CC',    slColor: '#9d174d', congColor: '#f472b6', bg: '#fdf2f8', border: '#f9a8d4', headerBg: '#9d174d' },
]

const fmtSL   = v => (v || 0).toLocaleString('vi-VN')
const fmtCong = (v, d = 4) => (v || 0).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d })
const delay   = ms => new Promise(res => setTimeout(res, ms))

// ─── Bảng tổng hợp ngày ──────────────────────────────────────────────────────

const SUMMARY_DEPTS = [
  { key: 'BBC1',  label: 'BBC1'  },
  { key: 'PCPL1', label: 'PCPL1' },
  { key: 'PCPL2', label: 'PCPL2' },
  { key: 'PL',    label: 'PCPL3' },
  { key: 'DG',    label: 'ĐG'    },
]

function DailySummaryPanel({ data, refDate: refDateProp }) {
  const ref        = refDateProp ? dayjs(refDateProp) : dayjs()
  const today      = ref.format('YYYY-MM-DD')
  const yesterday  = ref.subtract(1, 'day').format('YYYY-MM-DD')
  const monthStart = ref.startOf('month').format('YYYY-MM-DD')

  const [isFullscreen, setIsFullscreen] = useState(false)
  const panelRef      = useRef(null)
  const scrollRef     = useRef(null)
  const isPausedRef   = useRef(false)
  const scrollRefYd   = useRef(null)
  const isPausedRefYd = useRef(false)

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      panelRef.current?.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  const getDeptKey = (r) => {
    let cd = r.congDoan?.toUpperCase()
    if (cd === 'PC') {
      const nhom = (r.nhomThucHien || r.toNhom)?.toUpperCase()
      cd = nhom === 'PCPL2' ? 'PCPL2' : 'PCPL1'
    }
    return cd
  }

  const stats = useMemo(() => {
    const todaySL = {}, monthSL = {}, ydSL = {}
    const todayHscvDone = {}, todayHscvTotal = {}
    const ydHscvDone = {}, ydHscvTotal = {}
    SUMMARY_DEPTS.forEach(d => {
      todaySL[d.key] = 0; monthSL[d.key] = 0
      ydSL[d.key] = 0
      todayHscvDone[d.key] = 0; todayHscvTotal[d.key] = 0
      ydHscvDone[d.key] = 0; ydHscvTotal[d.key] = 0
    })
    data.forEach(r => {
      const cd = getDeptKey(r)
      if (!SUMMARY_DEPTS.find(d => d.key === cd)) return
      const isDone    = r.status !== 'PENDING' && r.status !== 'IN_PROGRESS'
      const hasSoLo   = !!(r.soLo || '').trim()
      const sl = Number(r.sanLuong || 0)
      if (isDone) {
        if (r.ngay === today)         todaySL[cd] += sl
        if (r.ngay >= monthStart)     monthSL[cd] += sl
        if (r.ngay === yesterday)     ydSL[cd] += sl
      }
      const ns   = r.nangSuat != null ? Number(r.nangSuat)
        : (r.congThucHien && r.sanLuong ? Number(r.sanLuong) / Number(r.congThucHien) : null)
      const nsTb = r.nangSuatTrungBinh != null ? Number(r.nangSuatTrungBinh) : null
      const isDat = isDone && ns != null && nsTb != null && ns >= nsTb
      if (r.ngay === today && hasSoLo && isDone) {
        todayHscvTotal[cd]++
        if (isDat) todayHscvDone[cd]++
      }
      if (r.ngay === yesterday && hasSoLo && isDone) {
        ydHscvTotal[cd]++
        if (isDat) ydHscvDone[cd]++
      }
    })
    return { todaySL, monthSL, ydSL, todayHscvDone, todayHscvTotal, ydHscvDone, ydHscvTotal }
  }, [data, today, yesterday, monthStart])

  const todayRows = useMemo(() =>
    data.filter(r => r.ngay === today),
  [data, today])

  const yesterdayRows = useMemo(() =>
    data.filter(r => r.ngay === yesterday),
  [data, yesterday])

  // Tự động cuộn bảng giữa khi có nhiều dòng
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = 0
    if (todayRows.length <= 6) return
    let active = true
    const run = async () => {
      while (active) {
        await delay(40)
        if (!active || isPausedRef.current) continue
        el.scrollTop += 1
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
          await delay(2500)
          if (!active) break
          el.scrollTop = 0
          await delay(800)
        }
      }
    }
    run()
    return () => { active = false }
  }, [todayRows.length])

  useEffect(() => {
    const el = scrollRefYd.current
    if (!el) return
    el.scrollTop = 0
    if (yesterdayRows.length <= 6) return
    let active = true
    const run = async () => {
      while (active) {
        await delay(40)
        if (!active || isPausedRefYd.current) continue
        el.scrollTop += 1
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
          await delay(2500)
          if (!active) break
          el.scrollTop = 0
          await delay(800)
        }
      }
    }
    run()
    return () => { active = false }
  }, [yesterdayRows.length])

  const [clock, setClock] = useState(() => dayjs().format('HH:mm'))
  useEffect(() => {
    const t = setInterval(() => setClock(dayjs().format('HH:mm')), 1000)
    return () => clearInterval(t)
  }, [])

  const maxMonthSL    = Math.max(...SUMMARY_DEPTS.map(d => stats.monthSL[d.key] || 0), 1)
  const totalMonthSL  = SUMMARY_DEPTS.reduce((s, d) => s + (stats.monthSL[d.key] || 0), 0)

  // ── Design tokens ────────────────────────────────────────────────────────
  const BG      = '#0a1628'
  const BG_SEC  = '#0d1e35'
  const ACCENT  = '#00cccc'
  const BORDER  = 'rgba(0,204,204,0.3)'
  const TEXT    = '#e2e8f0'
  const DIM     = '#7da5c0'

  const secTitle = {
    fontSize: 12, fontWeight: 800, color: ACCENT, letterSpacing: '0.1em',
    textTransform: 'uppercase', padding: '8px 14px 6px',
    borderBottom: `1px solid ${BORDER}`, background: 'rgba(0,204,204,0.07)',
  }
  const thStyle = {
    background: 'rgba(0,204,204,0.12)', color: ACCENT,
    fontWeight: 700, fontSize: 12, padding: '7px 10px',
    borderBottom: `1px solid ${BORDER}`, textAlign: 'center',
    whiteSpace: 'nowrap', letterSpacing: '0.04em',
  }
  const tdStyle = (extra = {}) => ({
    padding: '7px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)',
    fontSize: 13, color: TEXT, ...extra,
  })

  const BarItem = ({ d, compact }) => {
    const val = stats.monthSL[d.key] || 0
    const pct = Math.round((val / maxMonthSL) * 100)
    return (
      <div style={{ marginBottom: compact ? 4 : 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span className="dsp-dept-label" style={{ fontSize: compact ? 11 : 13, fontWeight: 700, color: TEXT }}>{d.label}</span>
          <span className="dsp-dept-val" style={{ fontSize: compact ? 12 : 14, fontWeight: 800, color: '#fff' }}>{val.toLocaleString('vi-VN')}</span>
        </div>
        <div className="dsp-bar-wrap" style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: compact ? 6 : 8, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4,
            background: `linear-gradient(90deg,${ACCENT},#00ffcc)`, transition: 'width 0.6s ease' }} />
        </div>
      </div>
    )
  }

  const DeptTable = ({ titleEl, rows, valFn, hscvFn }) => (
    <div style={{ background: BG_SEC, borderRadius: 8, border: `1px solid ${BORDER}`, overflow: 'hidden', flex: 1 }}>
      <div className="dsp-sec-title" style={secTitle}>{titleEl}</div>
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '4px 10px', borderBottom: `1px solid ${BORDER}` }}>
          {['BỘ PHẬN','SẢN LƯỢNG','Hiệu Suất CV'].map((h, i) => (
            <span key={h} style={{ fontSize: 10, color: DIM, fontWeight: 700, textAlign: i > 0 ? 'right' : 'left' }}>{h}</span>
          ))}
        </div>
        {rows.map(d => {
          const { sl, hscv, hscvColor } = valFn(d)
          return (
            <div key={d.key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              padding: '5px 10px', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
              <span className="dsp-dept-label" style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{d.label}</span>
              <span className="dsp-dept-val" style={{ fontSize: 14, fontWeight: 800, color: sl > 0 ? '#4ade80' : DIM, textAlign: 'right' }}>
                {sl.toLocaleString('vi-VN')}
              </span>
              <span style={{ textAlign: 'right' }}>
                {hscvColor === DIM
                  ? <span style={{ fontSize: 12, color: DIM }}>—</span>
                  : <span style={{
                      fontSize: 11, fontWeight: 700, color: '#0d1117',
                      background: hscvColor, borderRadius: 20,
                      padding: '2px 8px', display: 'inline-block',
                    }}>{hscv}</span>
                }
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        .dsp-tv { box-sizing: border-box; }

        /* ── Fullscreen: toàn màn hình TV ── */
        .dsp-tv:fullscreen {
          display: flex !important; flex-direction: column !important;
          width: 100vw !important; height: 100vh !important;
          overflow: hidden !important; border-radius: 0 !important;
          margin: 0 !important; padding: 0 !important;
        }
        /* Body không scroll ngoài — tất cả section fit vừa màn hình */
        .dsp-tv:fullscreen .dsp-tv-body {
          flex: 1 1 0 !important; min-height: 0 !important; height: 0 !important;
          overflow: hidden !important;
          display: grid !important;
          grid-template-columns: 71% 29% !important;
          grid-template-rows: 1fr !important;
          gap: 8px !important;
          padding: 8px !important;
          box-sizing: border-box !important;
        }
        /* Cột trái: 2 bảng chi tiết stack dọc, mỗi bảng 50% */
        .dsp-tv:fullscreen .dsp-fs-left {
          display: flex !important; flex-direction: column !important;
          overflow: hidden !important; min-height: 0 !important;
          gap: 8px !important;
        }
        .dsp-tv:fullscreen .dsp-chi-tiet-box {
          flex: 1 1 0 !important; min-height: 0 !important;
          display: flex !important; flex-direction: column !important;
          overflow: hidden !important;
        }
        /* Scroll area của chi tiết lô fill hết phần còn lại */
        .dsp-tv:fullscreen .dsp-tv-scroll {
          flex: 1 1 0 !important; min-height: 0 !important;
          max-height: none !important; overflow-y: auto !important;
        }
        /* Cột phải: tổng SL + ngày hôm nay/qua */
        .dsp-tv:fullscreen .dsp-fs-right {
          display: flex !important; flex-direction: column !important;
          gap: 8px !important; overflow: hidden !important; min-height: 0 !important;
        }
        /* Tổng SL: compact, không co giãn */
        .dsp-tv:fullscreen .dsp-tong-sl-box { flex: 0 0 auto !important; }
        /* 2 bảng dưới: xếp dọc, chiếm hết phần còn lại */
        .dsp-tv:fullscreen .dsp-bottom-tables {
          flex: 1 1 0 !important; min-height: 0 !important;
          display: flex !important; flex-direction: column !important;
          gap: 8px !important; overflow: hidden !important;
        }
        .dsp-tv:fullscreen .dsp-bottom-tables > div {
          flex: 1 1 0 !important; min-height: 0 !important; overflow: hidden !important;
        }

        /* Font scale theo viewport */
        .dsp-tv:fullscreen .dsp-tv-title  { font-size: 1.9vw !important; }
        .dsp-tv:fullscreen .dsp-tv-clock  { font-size: 3.2vw !important; }
        .dsp-tv:fullscreen .dsp-tv-sub    { font-size: 0.85vw !important; }
        .dsp-tv:fullscreen .dsp-sec-title { font-size: 0.85vw !important; padding: 0.5vh 0.9vw !important; }
        .dsp-tv:fullscreen table th       { font-size: 0.85vw !important; padding: 0.4vh 0.6vw !important; }
        .dsp-tv:fullscreen table td       { font-size: 0.95vw !important; padding: 0.45vh 0.6vw !important; }
        .dsp-tv:fullscreen .dsp-dept-label { font-size: 1vw !important; }
        .dsp-tv:fullscreen .dsp-dept-val   { font-size: 1.1vw !important; }
        .dsp-tv:fullscreen .dsp-bar-wrap   { height: 6px !important; }

        /* Normal mode: scroll dọc bình thường */
        .dsp-fs-left, .dsp-fs-right { display: contents; }
        .dsp-tv-scroll { max-height: 240px; overflow-y: auto; }

        @keyframes dsp-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .dsp-live-dot { animation: dsp-pulse 1.8s infinite; }
      `}</style>

      <div ref={panelRef} className="dsp-tv"
        style={{ background: BG, borderRadius: 10, overflow: 'hidden',
          border: `1px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          margin: '8px 0 4px', display: 'flex', flexDirection: 'column' }}
      >
        {/* ── HEADER ── */}
        <div style={{ background: '#061020', padding: '10px 20px',
          borderBottom: `2px solid ${BORDER}`, display: 'grid',
          gridTemplateColumns: 'auto 1fr auto', gap: 16, alignItems: 'center', flexShrink: 0 }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ background: ACCENT, color: '#061020', fontWeight: 900,
              fontSize: 11, padding: '3px 10px', borderRadius: 4, letterSpacing: '0.06em' }}>
              BỘ PHẬN
            </div>
            <div style={{ color: ACCENT, fontWeight: 900, fontSize: 18, lineHeight: 1 }}>QLSX</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="dsp-tv-title" style={{ fontWeight: 900, fontSize: 22,
              color: '#fff', letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.2 }}>
              CÔNG TY CỔ PHẦN MỸ PHẨM THIÊN NHIÊN SONG AN
            </div>
            <div className="dsp-tv-sub" style={{ fontSize: 11, color: DIM, letterSpacing: '0.15em', marginTop: 3 }}>
              BẢNG THEO DÕI SẢN LƯỢNG SẢN XUẤT
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="dsp-tv-clock" style={{ fontSize: 32, fontWeight: 900,
              color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {clock}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 11, color: DIM }}>
                {['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'][ref.day()]},&nbsp;{ref.format('DD/MM/YYYY')}
              </span>
              <div className="dsp-live-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, letterSpacing: '0.08em' }}>TRỰC TIẾP</span>
              <button onClick={toggleFullscreen}
                title={isFullscreen ? 'Thoát toàn màn hình (Esc)' : 'Toàn màn hình'}
                style={{ background: 'rgba(0,204,204,0.15)', border: `1px solid ${BORDER}`,
                  borderRadius: 5, color: ACCENT, cursor: 'pointer', padding: '3px 8px',
                  fontSize: 14, display: 'flex', alignItems: 'center', lineHeight: 1 }}
              >
                {isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              </button>
            </div>
          </div>
        </div>

        {/* ── BODY: normal=scroll dọc / fullscreen=2 cột cố định ── */}
        <div className="dsp-tv-body" style={{ flex: 1, overflowY: 'auto' }}>

          {/* CỘT TRÁI (fullscreen) / KHỐI 1 (normal): Chi tiết lô SX hôm nay + hôm qua */}
          <div className="dsp-fs-left">

            {/* ── Chi tiết hôm nay ── */}
            <div className="dsp-chi-tiet-box"
              style={{ margin: '10px 12px 0', background: BG_SEC, borderRadius: 8,
                border: `1px solid ${BORDER}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
              <div className="dsp-sec-title" style={{ ...secTitle, flexShrink: 0 }}>
                Chi tiết lô sản xuất hôm nay · {ref.format('DD/MM')}
                {todayRows.length > 0 && (
                  <span style={{ float: 'right', color: DIM, fontWeight: 400, fontSize: 11,
                    textTransform: 'none', letterSpacing: 0 }}>Theo thời gian thực</span>
                )}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', flexShrink: 0 }}>
                <colgroup>
                  <col style={{ width: '12%' }} /><col style={{ width: '36%' }} />
                  <col style={{ width: '13%' }} /><col style={{ width: '12%' }} />
                  <col style={{ width: '27%' }} />
                </colgroup>
                <thead>
                  <tr>{['BỘ PHẬN','TÊN SẢN PHẨM','SỐ LÔ','CỠ LÔ','TÌNH TRẠNG'].map(h =>
                    <th key={h} style={thStyle}>{h}</th>)}</tr>
                </thead>
              </table>
              <div ref={scrollRef} className="dsp-tv-scroll"
                onMouseEnter={() => { isPausedRef.current = true }}
                onMouseLeave={() => { isPausedRef.current = false }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '12%' }} /><col style={{ width: '36%' }} />
                    <col style={{ width: '13%' }} /><col style={{ width: '12%' }} />
                    <col style={{ width: '27%' }} />
                  </colgroup>
                  <tbody>
                    {todayRows.length === 0
                      ? <tr><td colSpan={5} style={{ textAlign: 'center', color: DIM, padding: '24px 0', fontSize: 13 }}>
                          <div style={{ fontSize: 24, marginBottom: 6 }}>⬜</div>
                          Chưa có lô sản xuất nào hôm nay
                        </td></tr>
                      : todayRows.map((r, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)' }}>
                          <td style={tdStyle({ textAlign: 'center', fontWeight: 800, color: ACCENT })}>{r.congDoan || '—'}</td>
                          <td style={tdStyle({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 })} title={r.tenTrinh}>{r.tenTrinh || '—'}</td>
                          <td style={tdStyle({ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#93c5fd' })}>{r.soLo || '—'}</td>
                          <td style={tdStyle({ textAlign: 'right', fontWeight: 700 })}>{r.coLo != null ? Number(r.coLo).toLocaleString('vi-VN') : '—'}</td>
                          <td style={tdStyle({ textAlign: 'center', padding: '5px 6px' })}>
                            {r.status === 'PENDING'
                              ? <span style={{ background: 'rgba(234,179,8,0.15)', color: '#fbbf24', fontWeight: 700, fontSize: 12, padding: '3px 8px', borderRadius: 4 }}>⌛ Chưa HT</span>
                              : r.status === 'IN_PROGRESS'
                                ? <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontWeight: 700, fontSize: 12, padding: '3px 8px', borderRadius: 4 }}>▶ Đang TH</span>
                                : <span style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', fontWeight: 700, fontSize: 12, padding: '3px 8px', borderRadius: 4 }}>✓ Hoàn thành</span>}
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
              {todayRows.length > 6 && (
                <div style={{ textAlign: 'center', fontSize: 11, color: DIM, padding: '3px',
                  borderTop: `1px solid ${BORDER}`, fontStyle: 'italic', flexShrink: 0 }}>
                  {todayRows.length} dòng — tự động cuộn · di chuyển chuột để tạm dừng
                </div>
              )}
            </div>

            {/* ── Chi tiết hôm qua ── */}
            <div className="dsp-chi-tiet-box"
              style={{ margin: '0 12px 10px', background: BG_SEC, borderRadius: 8,
                border: `1px solid ${BORDER}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
              <div className="dsp-sec-title" style={{ ...secTitle, flexShrink: 0 }}>
                Chi tiết lô sản xuất hôm qua · {ref.subtract(1,'day').format('DD/MM')}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', flexShrink: 0 }}>
                <colgroup>
                  <col style={{ width: '12%' }} /><col style={{ width: '36%' }} />
                  <col style={{ width: '13%' }} /><col style={{ width: '12%' }} />
                  <col style={{ width: '27%' }} />
                </colgroup>
                <thead>
                  <tr>{['BỘ PHẬN','TÊN SẢN PHẨM','SỐ LÔ','CỠ LÔ','TÌNH TRẠNG'].map(h =>
                    <th key={h} style={thStyle}>{h}</th>)}</tr>
                </thead>
              </table>
              <div ref={scrollRefYd} className="dsp-tv-scroll"
                onMouseEnter={() => { isPausedRefYd.current = true }}
                onMouseLeave={() => { isPausedRefYd.current = false }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '12%' }} /><col style={{ width: '36%' }} />
                    <col style={{ width: '13%' }} /><col style={{ width: '12%' }} />
                    <col style={{ width: '27%' }} />
                  </colgroup>
                  <tbody>
                    {yesterdayRows.length === 0
                      ? <tr><td colSpan={5} style={{ textAlign: 'center', color: DIM, padding: '24px 0', fontSize: 13 }}>
                          Không có dữ liệu hôm qua
                        </td></tr>
                      : yesterdayRows.map((r, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)' }}>
                          <td style={tdStyle({ textAlign: 'center', fontWeight: 800, color: ACCENT })}>{r.congDoan || '—'}</td>
                          <td style={tdStyle({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 })} title={r.tenTrinh}>{r.tenTrinh || '—'}</td>
                          <td style={tdStyle({ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#93c5fd' })}>{r.soLo || '—'}</td>
                          <td style={tdStyle({ textAlign: 'right', fontWeight: 700 })}>{r.coLo != null ? Number(r.coLo).toLocaleString('vi-VN') : '—'}</td>
                          <td style={tdStyle({ textAlign: 'center', padding: '5px 6px' })}>
                            {r.status === 'PENDING'
                              ? <span style={{ background: 'rgba(234,179,8,0.15)', color: '#fbbf24', fontWeight: 700, fontSize: 12, padding: '3px 8px', borderRadius: 4 }}>⌛ Chưa HT</span>
                              : r.status === 'IN_PROGRESS'
                                ? <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontWeight: 700, fontSize: 12, padding: '3px 8px', borderRadius: 4 }}>▶ Đang TH</span>
                                : <span style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', fontWeight: 700, fontSize: 12, padding: '3px 8px', borderRadius: 4 }}>✓ Hoàn thành</span>}
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
              {yesterdayRows.length > 6 && (
                <div style={{ textAlign: 'center', fontSize: 11, color: DIM, padding: '3px',
                  borderTop: `1px solid ${BORDER}`, fontStyle: 'italic', flexShrink: 0 }}>
                  {yesterdayRows.length} dòng — tự động cuộn · di chuyển chuột để tạm dừng
                </div>
              )}
            </div>

          </div>

          {/* CỘT PHẢI (fullscreen) / KHỐI 2+3 (normal) */}
          <div className="dsp-fs-right">

            {/* Tổng SL tháng — 2 cột progress bars để tiết kiệm chiều cao */}
            <div className="dsp-tong-sl-box"
              style={{ margin: '10px 12px 0', background: BG_SEC, borderRadius: 8,
                border: `1px solid ${BORDER}`, overflow: 'hidden' }}
            >
              <div className="dsp-sec-title" style={secTitle}>
                Tổng sản lượng tháng {ref.format('M')}
                <span style={{ float: 'right', color: '#4ade80', fontWeight: 700,
                  fontSize: 12, textTransform: 'none', letterSpacing: 0 }}>
                  Tổng {totalMonthSL.toLocaleString('vi-VN')}
                </span>
              </div>
              <div style={{ padding: '8px 14px 10px' }}>
                {SUMMARY_DEPTS.map(d => <BarItem key={d.key} d={d} />)}
              </div>
            </div>

            {/* Ngày hôm nay + hôm qua */}
            <div className="dsp-bottom-tables"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '10px 12px 12px' }}
            >
              <DeptTable
                titleEl={<>Ngày hôm nay · {ref.format('DD/MM')}</>}
                rows={SUMMARY_DEPTS}
                valFn={d => {
                  const done  = stats.todayHscvDone[d.key]  || 0
                  const total = stats.todayHscvTotal[d.key] || 0
                  const pct   = total > 0 ? Math.round(done / total * 100) : null
                  return {
                    sl: stats.todaySL[d.key] || 0,
                    hscv: pct != null ? `${pct}% (${done}/${total})` : '—',
                    hscvColor: pct == null ? DIM : pct >= 75 ? '#4ade80' : pct >= 50 ? '#facc15' : '#f87171',
                  }
                }}
              />
              <DeptTable
                titleEl={<>Ngày hôm qua · {ref.subtract(1,'day').format('DD/MM')}</>}
                rows={SUMMARY_DEPTS}
                valFn={d => {
                  const done  = stats.ydHscvDone[d.key]  || 0
                  const total = stats.ydHscvTotal[d.key] || 0
                  const pct   = total > 0 ? Math.round(done / total * 100) : null
                  return {
                    sl: stats.ydSL[d.key] || 0,
                    hscv: pct != null ? `${pct}% (${done}/${total})` : '—',
                    hscvColor: pct == null ? DIM : pct >= 75 ? '#4ade80' : pct >= 50 ? '#facc15' : '#f87171',
                  }
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 14, padding: '6px 12px 10px', justifyContent: 'center' }}>
              {[['#f87171','< 50%','Thấp'],['#facc15','50–75%','Trung bình'],['#4ade80','≥ 75%','Tốt']].map(([c, range, label]) => (
                <span key={range} style={{ fontSize: 11, color: DIM, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />
                  <span style={{ color: c, fontWeight: 700 }}>{range}</span>
                  <span>· {label}</span>
                </span>
              ))}
            </div>

          </div>
        </div>{/* end body */}
      </div>
    </>
  )
}

// ─── Tab 1: Sản lượng theo ngày (chi tiết) ───────────────────────────────────

function DailyDetailTab() {
  const { isAdmin, isAdminKH, getLockedCongDoan } = useAuth()
  const navigate = useNavigate()
  const canApprove = isAdmin() || isAdminKH()
  const lockedCongDoan = getLockedCongDoan()

  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState(() => {
    try {
      const saved = localStorage.getItem('daily_dateRange')
      if (saved) { const [f, t] = JSON.parse(saved); return [dayjs(f), dayjs(t)] }
    } catch {}
    return [dayjs().subtract(6, 'day'), dayjs()]
  })
  const [congDoan, setCongDoan] = useState(
    () => lockedCongDoan || localStorage.getItem('daily_congDoan') || ''
  )
  const [filterTienTrinh, setFilterTienTrinh] = useState('')

  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [rejectModal, setRejectModal] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectingId, setRejectingId] = useState(null)
  const [actionLoading, setActionLoading] = useState({})
  const [nsTbMap, setNsTbMap] = useState({}) // maSp → slTrungBinh (năng suất trung bình)
  const [loaiSpMap, setLoaiSpMap] = useState({}) // maSp → loaiSanPham
  const filterRef = useRef(null)
  const [filterH, setFilterH] = useState(0)
  useEffect(() => {
    if (!filterRef.current) return
    const obs = new ResizeObserver(() => setFilterH(filterRef.current?.offsetHeight || 0))
    obs.observe(filterRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => { fetchData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (dateRange?.[0] && dateRange?.[1]) {
      localStorage.setItem('daily_dateRange', JSON.stringify([
        dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD'),
      ]))
    }
  }, [dateRange])

  useEffect(() => { localStorage.setItem('daily_congDoan', congDoan) }, [congDoan])

  // Lấy slTrungBinh và loaiSanPham từ ProductMaster — 1 request batch thay vì N request riêng
  const fetchNsTb = useCallback(async (rows) => {
    const uniqueMaSp = [...new Set(rows.filter(r => r.maSp).map(r => r.maSp))]
    if (!uniqueMaSp.length) return
    try {
      const { data: batchMap } = await api.get('/product-master/lookup-batch', { params: { codes: uniqueMaSp } })
      const nsMap = {}, loaiMap = {}
      uniqueMaSp.forEach(maSp => {
        const ns = batchMap[maSp]?.slTrungBinh
        if (ns != null) nsMap[maSp] = Number(ns)
        const loai = batchMap[maSp]?.loaiSanPham
        if (loai) loaiMap[maSp] = loai
      })
      setNsTbMap(nsMap)
      setLoaiSpMap(loaiMap)
    } catch {}
  }, [])

  const fetchData = useCallback(async (range = dateRange, cd = congDoan, { silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const params = {}
      if (range?.[0]) params.fromDate = range[0].format('YYYY-MM-DD')
      if (range?.[1]) params.toDate = range[1].format('YYYY-MM-DD')
      if (cd) params.congDoan = cd
      const { data: res } = await api.get('/work-schedule-session/daily-report', { params })
      setData(res)
      fetchNsTb(res)
    } catch {
      message.error('Không thể tải dữ liệu sản lượng theo ngày')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [dateRange, congDoan, fetchNsTb])

  useEffect(() => {
    const handler = () => fetchData(undefined, undefined, { silent: true })
    window.addEventListener('app:silent-refresh', handler)
    return () => window.removeEventListener('app:silent-refresh', handler)
  }, [fetchData])

  const handleReset = () => {
    const def = [dayjs().subtract(6, 'day'), dayjs()]
    setDateRange(def)
    setCongDoan(lockedCongDoan || '')
    setFilterTienTrinh('')
    fetchData(def, lockedCongDoan || '')
  }

  const handleApprove = async (requestId) => {
    setActionLoading(p => ({ ...p, [requestId]: 'approving' }))
    try {
      await api.put(`/sl-change-request/${requestId}/approve`)
      message.success('Đã duyệt — sản lượng đã được lưu')
      fetchData()
    } catch (e) {
      message.error(e?.response?.data?.message || 'Duyệt thất bại')
    } finally {
      setActionLoading(p => { const n = { ...p }; delete n[requestId]; return n })
    }
  }

  const openReject = (requestId) => {
    setRejectingId(requestId)
    setRejectNote('')
    setRejectModal(true)
  }

  const handleReject = async () => {
    setActionLoading(p => ({ ...p, [rejectingId]: 'rejecting' }))
    try {
      await api.put(`/sl-change-request/${rejectingId}/reject`, { note: rejectNote })
      message.warning('Đã từ chối yêu cầu')
      setRejectModal(false)
      fetchData()
    } catch (e) {
      message.error(e?.response?.data?.message || 'Từ chối thất bại')
    } finally {
      setActionLoading(p => { const n = { ...p }; delete n[rejectingId]; return n })
    }
  }

  const handleDeleteSelected = async () => {
    setDeleteLoading(true)
    try {
      // selectedRowKeys dạng "s-{sessionId}" — lấy sessionId
      const ids = selectedRowKeys
        .filter(k => k.startsWith('s-'))
        .map(k => Number(k.slice(2)))
      await Promise.all(ids.map(id => api.delete(`/work-schedule-session/${id}`)))
      message.success(`Đã xóa ${ids.length} bản ghi`)
      setSelectedRowKeys([])
      fetchData()
    } catch {
      message.error('Xóa thất bại, vui lòng thử lại')
    } finally {
      setDeleteLoading(false)
    }
  }

  const summary = useMemo(() => {
    const totals = { PCPL1: 0, PCPL2: 0, PL: 0, DG: 0, BBC1: 0, total: 0, pending: 0, inProgress: 0 }
    data.forEach(r => {
      if (r.status === 'PENDING') { totals.pending++; return }
      if (r.status === 'IN_PROGRESS') { totals.inProgress++; return }
      let cd = r.congDoan?.toUpperCase()
      if (cd === 'PC') {
        const nhom = (r.nhomThucHien || r.toNhom)?.toUpperCase()
        if (nhom === 'PCPL1') cd = 'PCPL1'
        else if (nhom === 'PCPL2') cd = 'PCPL2'
        else if (nhom === 'PCPL3' || nhom === 'PL') cd = 'PL'
        else cd = 'PCPL1'
      }
      if (cd === 'PCPL3') cd = 'PL'
      const sl = Number(r.sanLuong || 0)
      if (totals[cd] !== undefined) totals[cd] += sl
      totals.total += sl
    })
    return totals
  }, [data])

  const dateKeys = useMemo(() => {
    const seen = []
    data.forEach(r => { if (r.ngay && !seen.includes(r.ngay)) seen.push(r.ngay) })
    return seen
  }, [data])

  const pageSummaryTotals = (pageData) => {
    const sl = pageData.filter(r => r.status !== 'PENDING').reduce((a, r) => a + Number(r.sanLuong || 0), 0)
    const cong = pageData.reduce((a, r) => a + Number(r.congThucHien || 0), 0)
    return { sl, cong }
  }

  const pendingCount = data.filter(r => r.status === 'PENDING').length

  const SUMMARY_CARDS = [
    { label: 'Tổng SL PCPL1', key: 'PCPL1', color: '#1677ff', bg: '#e6f4ff', border: '#91caff' },
    { label: 'Tổng SL PCPL2', key: 'PCPL2', color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' },
    { label: 'Tổng SL PL',    key: 'PL',    color: '#389e0d', bg: '#f6ffed', border: '#b7eb8f' },
    { label: 'Tổng SL ĐG',    key: 'DG',    color: '#d48806', bg: '#fffbe6', border: '#ffe58f' },
    { label: 'Tổng SL BBC1',  key: 'BBC1',  color: '#531dab', bg: '#f9f0ff', border: '#d3adf7' },
  ]

  const columns = [
    {
      title: 'Ngày', dataIndex: 'ngay', key: 'ngay', width: 110, fixed: 'left',
      render: v => v
        ? <span style={{ fontWeight: 700, color: '#1677ff' }}>{dayjs(v).format('DD/MM/YYYY')}</span>
        : '—',
    },
    {
      title: 'Trạng Thái', dataIndex: 'status', key: 'status', width: 120, align: 'center',
      render: (v, r) => {
        if (v === 'PENDING') return (
          <Tooltip title={`Yêu cầu bởi: ${r.requestedBy || '—'} · ${r.requestedAt ? dayjs(r.requestedAt).format('DD/MM HH:mm') : ''}`}>
            <Tag icon={<ClockCircleOutlined />} color="warning" style={{ marginRight: 0, fontWeight: 600 }}>Chờ duyệt</Tag>
          </Tooltip>
        )
        if (v === 'IN_PROGRESS') return (
          <Tag color="processing" style={{ marginRight: 0, fontWeight: 600 }}>Đang thực hiện</Tag>
        )
        return <Tag color="success" style={{ marginRight: 0, fontWeight: 600 }}>Đã lưu</Tag>
      },
    },
    {
      title: 'Công Đoạn', dataIndex: 'congDoan', key: 'congDoan', width: 100, align: 'center',
      render: (v, r) => {
        if (!v) return '—'
        // Fallback: nếu BE cũ trả "PC", dùng toNhom để hiển thị đúng
        const label = v === 'PC' ? ((r.nhomThucHien || r.toNhom) || 'PC') : v
        return <Tag color={CONG_DOAN_COLOR[label] || CONG_DOAN_COLOR[v] || 'default'} style={{ fontWeight: 700, marginRight: 0, minWidth: 40, textAlign: 'center' }}>{label}</Tag>
      },
    },
    {
      title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 100, align: 'center',
      render: v => v ? <Tag color="blue" style={{ marginRight: 0 }}>{v}</Tag> : <span style={{ color: '#bbb' }}>—</span>,
    },
    {
      title: 'Loại SP', key: 'loaiSp', width: 120,
      render: (_, r) => {
        const loai = loaiSpMap[r.maSp]
        return loai ? <Tag color="purple" style={{ marginRight: 0, fontSize: 11 }}>{loai}</Tag> : <span style={{ color: '#bbb' }}>—</span>
      },
    },
    {
      title: 'Tiến Trình', dataIndex: 'tenTrinh', key: 'tenTrinh', width: 260,
      render: v => v
        ? <span style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.4 }}>{v}</span>
        : <span style={{ color: '#bbb' }}>—</span>,
    },
    {
      title: 'Số Lô', dataIndex: 'soLo', key: 'soLo', width: 88, align: 'center',
      render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || '—'}</span>,
    },
    {
      title: 'Tổ / Nhóm', key: 'nhom', width: 110, align: 'center',
      render: (_, r) => {
        const nhom = r.toNhom || r.nhomThucHien
        return nhom
          ? <Tag color="cyan" style={{ marginRight: 0 }}>{nhom}</Tag>
          : <span style={{ color: '#bbb' }}>—</span>
      },
    },
    {
      title: 'Ca SX', dataIndex: 'caSanXuat', key: 'caSanXuat', width: 84, align: 'center',
      render: v => v
        ? <Tag color="orange" style={{ marginRight: 0, fontSize: 11 }}>{v}</Tag>
        : <span style={{ color: '#bbb' }}>—</span>,
    },
    {
      title: 'Vai Trò', dataIndex: 'vaiTro', key: 'vaiTro', width: 110, align: 'center',
      render: v => {
        if (!v) return <span style={{ color: '#bbb' }}>—</span>
        const isTruong = v.toLowerCase().includes('trưởng')
        return <Tag color={isTruong ? 'gold' : 'geekblue'} style={{ marginRight: 0 }}>{v}</Tag>
      },
    },
    {
      title: 'Người TH', key: 'nguoiTH', width: 160, ellipsis: true,
      render: (_, r) => {
        const list = r.nguoiThucHienList || r.nguoiThucHien
        const soNguoi = r.soNguoi
        if (!list) return <span style={{ color: '#bbb' }}>—</span>
        return (
          <Tooltip title={list}>
            <span>
              {list.length > 22 ? list.slice(0, 20) + '…' : list}
              {soNguoi > 1 && <Tag style={{ marginLeft: 4, fontSize: 10, padding: '0 4px' }} color="geekblue">{soNguoi} người</Tag>}
            </span>
          </Tooltip>
        )
      },
    },
    {
      title: 'Công TH (Σ)', dataIndex: 'congThucHien', key: 'congThucHien', width: 100, align: 'center',
      render: v => v != null
        ? <span style={{ color: 'rgb(0,0,205)', fontWeight: 400 }}>{Number(v).toLocaleString('vi-VN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</span>
        : <span style={{ color: '#bbb' }}>—</span>,
    },
    {
      title: 'Sản Lượng', key: 'sanLuong', width: 130, align: 'center',
      render: (_, r) => {
        if (r.status === 'PENDING') {
          return (
            <Tooltip title={`SL cũ: ${r.sanLuong != null ? Number(r.sanLuong).toLocaleString('vi-VN') : '—'} → Yêu cầu thay đổi`}>
              <span style={{ fontWeight: 700, color: '#d48806', fontSize: 14 }}>
                {Number(r.requestedValue || 0).toLocaleString('vi-VN')}
                <span style={{ fontSize: 10, marginLeft: 3, color: '#fa8c16' }}>(YC)</span>
              </span>
            </Tooltip>
          )
        }
        if (r.status === 'IN_PROGRESS') {
          return <span style={{ color: '#bbb', fontSize: 12 }}>Chưa nhập</span>
        }
        return r.sanLuong != null
          ? <span style={{ fontWeight: 400, color: 'rgb(0,0,205)', fontSize: 14 }}>{Number(r.sanLuong).toLocaleString('vi-VN')}</span>
          : <span style={{ color: '#bbb' }}>—</span>
      },
      sorter: (a, b) => Number(a.sanLuong || a.requestedValue || 0) - Number(b.sanLuong || b.requestedValue || 0),
    },
    {
      title: 'Năng Suất', key: 'nangSuat', width: 105, align: 'right',
      sorter: (a, b) => {
        const ns = r => r.nangSuat != null ? Number(r.nangSuat)
          : (r.congThucHien && r.sanLuong ? Number(r.sanLuong) / Number(r.congThucHien) : 0)
        return ns(a) - ns(b)
      },
      render: (_, r) => {
        if (r.status === 'PENDING' || r.status === 'IN_PROGRESS') return <span style={{ color: '#bbb' }}>—</span>
        const ns = r.nangSuat != null ? Number(r.nangSuat)
          : (r.congThucHien && r.sanLuong ? Number(r.sanLuong) / Number(r.congThucHien) : null)
        if (ns == null) return <span style={{ color: '#bbb' }}>—</span>
        const nsTb = r.nangSuatTrungBinh != null ? Number(r.nangSuatTrungBinh)
          : (r.maSp ? nsTbMap[r.maSp] ?? null : null)
        const color = nsTb != null ? (ns >= nsTb ? '#16a34a' : '#dc2626') : '#595959'
        return (
          <Tooltip title={nsTb != null ? `NS trung bình: ${Number(nsTb).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}` : 'Chưa có NS trung bình'}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color }}>
              {ns.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
            </span>
          </Tooltip>
        )
      },
    },
    {
      title: 'Kết Quả', key: 'ketQua', width: 110, align: 'center',
      render: (_, r) => {
        if (r.status === 'PENDING' || r.status === 'IN_PROGRESS') return <span style={{ color: '#bbb' }}>—</span>
        const ns = r.nangSuat != null ? Number(r.nangSuat)
          : (r.congThucHien && r.sanLuong ? Number(r.sanLuong) / Number(r.congThucHien) : null)
        const nsTb = r.nangSuatTrungBinh != null ? Number(r.nangSuatTrungBinh)
          : (r.maSp ? nsTbMap[r.maSp] ?? null : null)
        if (ns == null || nsTb == null) return <span style={{ color: '#bbb', fontSize: 11 }}>Chưa có NS TB</span>
        const dat = ns >= nsTb
        return (
          <Tooltip title={`NS: ${ns.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} / NS TB: ${nsTb.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}`}>
            <Tag color={dat ? 'success' : 'error'} style={{ marginRight: 0, fontWeight: 700 }}>
              {dat ? '✓ Đạt' : '✗ Không đạt'}
            </Tag>
          </Tooltip>
        )
      },
    },
    {
      title: 'Lịch SX', key: 'goToSchedule', width: 68, fixed: 'right', align: 'center',
      render: (_, r) => {
        const stage = resolveCongDoan(r)
        if (!stage || !r.tenTrinh) return <span style={{ color: '#d9d9d9' }}>—</span>
        return (
          <Tooltip title={`Xem trong Lịch sản xuất ${stage}`}>
            <Button
              size="small"
              type="link"
              icon={<ArrowRightOutlined />}
              style={{ color: '#1677ff', padding: '0 4px' }}
              onClick={e => {
                e.stopPropagation()
                navigate('/work-schedule', { state: { jumpTo: { stage, tienTrinh: r.tenTrinh, soLo: r.soLo, maSp: r.maSp } } })
              }}
            />
          </Tooltip>
        )
      },
    },
    ...(canApprove ? [{
      title: 'Duyệt', key: 'action', width: 110, fixed: 'right', align: 'center',
      render: (_, r) => {
        if (r.status !== 'PENDING') return <span style={{ color: '#bbb', fontSize: 12 }}>—</span>
        return (
          <Space size={4}>
            <Tooltip title="Duyệt — lưu sản lượng">
              <Button
                size="small" type="primary" icon={<CheckOutlined />}
                loading={actionLoading[r.requestId] === 'approving'}
                disabled={!!actionLoading[r.requestId]}
                onClick={() => handleApprove(r.requestId)}
                style={{ background: '#389e0d', borderColor: '#389e0d' }}
              />
            </Tooltip>
            <Tooltip title="Từ chối">
              <Button
                size="small" danger icon={<CloseOutlined />}
                loading={actionLoading[r.requestId] === 'rejecting'}
                disabled={!!actionLoading[r.requestId]}
                onClick={() => openReject(r.requestId)}
              />
            </Tooltip>
          </Space>
        )
      }
    }] : []),
  ]

  const filteredData = filterTienTrinh.trim()
    ? data.filter(r => (r.tenTrinh || '').toLowerCase().includes(filterTienTrinh.trim().toLowerCase()))
    : data

  return (
    <>
      {/* Bộ lọc + KPI (sticky wrapper) */}
      <div ref={filterRef} style={{ position: 'sticky', top: TAB_BAR_H, zIndex: 9 }}>

      {/* Dark header */}
      <div style={{
        background: '#003d30',
        padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: '#fff', whiteSpace: 'nowrap' }}>
          📋 Sản lượng theo ngày
        </span>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginLeft: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#86efac', fontWeight: 600 }}>
            Đã lưu: <strong>{summary.total.toLocaleString('vi-VN')}</strong>
          </span>
          {pendingCount > 0 && (
            <span style={{ fontSize: 12, color: '#fcd34d', fontWeight: 600 }}>
              Chờ duyệt: <strong>{pendingCount}</strong>
            </span>
          )}
          {summary.inProgress > 0 && (
            <span style={{ fontSize: 12, color: '#93c5fd', fontWeight: 600 }}>
              Đang TH: <strong>{summary.inProgress}</strong>
            </span>
          )}
          <span style={{ fontSize: 12, color: '#cbd5e1' }}>
            <strong style={{ color: '#fff' }}>{data.length}</strong> lô/ngày
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{
        background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
        padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        <RangePicker size="small" value={dateRange} onChange={setDateRange}
          format="DD/MM/YYYY" allowClear placeholder={['Từ ngày', 'Đến ngày']} />
        <Select size="small" value={congDoan} onChange={lockedCongDoan ? undefined : setCongDoan}
          disabled={!!lockedCongDoan}
          options={CONG_DOAN_OPTIONS} style={{ width: 160 }} />
        <Input
          size="small" allowClear placeholder="Tiến trình..."
          value={filterTienTrinh} onChange={e => setFilterTienTrinh(e.target.value)}
          style={{ width: 200 }}
        />
        <Button size="small" type="primary" icon={<SearchOutlined />} onClick={() => fetchData()}
          style={{ background: '#00CC99', borderColor: '#00CC99' }}>Truy xuất</Button>
        <Button size="small" icon={<ReloadOutlined />} onClick={handleReset} />

        {selectedRowKeys.length > 0 && (
          <Popconfirm
            title={`Xóa ${selectedRowKeys.filter(k => k.startsWith('s-')).length} bản ghi đã chọn?`}
            description="Hành động này không thể hoàn tác."
            icon={<ExclamationCircleOutlined style={{ color: '#dc2626' }} />}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={handleDeleteSelected}
          >
            <Button
              size="small" danger
              icon={<DeleteOutlined />}
              loading={deleteLoading}
              style={{ fontWeight: 600 }}
            >
              Xóa ({selectedRowKeys.filter(k => k.startsWith('s-')).length})
            </Button>
          </Popconfirm>
        )}

        {/* KPI inline */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SUMMARY_CARDS.map(({ label, key, color, bg, border }) => (
            <span key={key} style={{
              fontSize: 11, fontWeight: 700, padding: '2px 10px',
              background: bg, border: `1px solid ${border}`,
              color, borderRadius: 10,
            }}>
              {label}: <strong>{Number(summary[key]).toLocaleString('vi-VN')}</strong>
            </span>
          ))}
        </div>
      </div>
      </div>{/* end sticky filter wrapper */}

      <style>{`
        .daily-sl-table .ant-table-thead > tr > th {
          background: linear-gradient(90deg, #55bbbb 0%, #66CCCC 100%) !important;
          color: #ffffff !important; text-align: center !important;
          text-transform: uppercase; font-size: 11px !important;
          letter-spacing: 0.4px; padding: 7px 8px !important;
          border-right: 1px solid rgba(255,255,255,0.2) !important;
        }
        .daily-sl-table .ant-table-thead > tr > th::before { display: none !important; }
        .daily-sl-table .ant-table-thead > tr > th .ant-table-column-sorter { color: rgba(255,255,255,0.8) !important; }
        .daily-sl-table .ant-table-thead > tr > th.ant-table-column-sort { background: linear-gradient(90deg, #44aaaa 0%, #55bbbb 100%) !important; }
        .daily-sl-table .row-group-even td { background: #EAECF2 !important; }
        .daily-sl-table .row-group-odd  td { background: #ffffff !important; }
        .daily-sl-table .row-pending     td { background: #fffbe6 !important; }
        .daily-sl-table .row-in-progress td { background: #f0f9ff !important; }
        .daily-sl-table .ant-table-tbody > tr > td { font-size: 12px; border-bottom: 1px solid #dcfce7 !important; }
        .daily-sl-table .ant-table-tbody > tr:hover > td { background: #DDE1E8 !important; }
      `}</style>

      <SkeletonTable
        className="daily-sl-table"
        columns={columns}
        dataSource={filteredData}
        rowKey={r => r.status === 'PENDING' ? `req-${r.requestId}` : `s-${r.sessionId}`}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          getCheckboxProps: r => ({
            disabled: r.status === 'PENDING',
            title: r.status === 'PENDING' ? 'Không thể xóa bản ghi đang chờ duyệt' : undefined,
          }),
        }}
        loading={loading}
        size="small"
        scroll={{ x: 1600 }}
        sticky={{ offsetHeader: TAB_BAR_H + filterH }}
        rowClassName={record => {
          if (record.status === 'PENDING') return 'row-pending'
          if (record.status === 'IN_PROGRESS') return 'row-in-progress'
          const idx = dateKeys.indexOf(record.ngay)
          return idx % 2 === 0 ? 'row-group-even' : 'row-group-odd'
        }}
        pagination={{
          defaultPageSize: 100,
          showSizeChanger: true,
          pageSizeOptions: ['50', '100', '200', '500'],
          showTotal: total => `Tổng ${total} bản ghi`,
        }}
      />

      <Modal
        title="Từ chối yêu cầu sản lượng"
        open={rejectModal}
        onOk={handleReject}
        onCancel={() => setRejectModal(false)}
        okText="Xác nhận từ chối"
        cancelText="Hủy"
        okButtonProps={{ danger: true, loading: actionLoading }}
        destroyOnHidden
      >
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 10 }}>
          Lý do từ chối (không bắt buộc):
        </Typography.Text>
        <Input.TextArea
          rows={3}
          value={rejectNote}
          onChange={e => setRejectNote(e.target.value)}
          placeholder="Nhập lý do từ chối..."
          maxLength={500}
        />
      </Modal>
    </>
  )
}

// ─── Modal chi tiết một ngày ─────────────────────────────────────────────────

function DayDetailModal({ open, date, rows, onClose }) {
  const kpi = useMemo(() => {
    const totals = {}
    STAGES.forEach(s => { totals[s.key] = { sl: 0, cong: 0, soPhien: 0 } })
    rows.forEach(r => {
      let cd = r.congDoan?.toUpperCase()
      if (cd === 'PC') {
        const nhom = (r.nhomThucHien || r.toNhom)?.toUpperCase()
        if (nhom === 'PCPL1') cd = 'PCPL1'
        else if (nhom === 'PCPL2') cd = 'PCPL2'
        else if (nhom === 'PCPL3' || nhom === 'PL') cd = 'PL'
        else cd = 'PCPL1'
      }
      if (cd === 'PCPL3') cd = 'PL'
      if (totals[cd]) {
        totals[cd].sl      += Number(r.sanLuong     || 0)
        totals[cd].cong    += Number(r.congThucHien || 0)
        totals[cd].soPhien += 1
      }
    })
    return totals
  }, [rows])

  const grandSL   = STAGES.reduce((s, st) => s + kpi[st.key].sl,   0)
  const grandCong = STAGES.reduce((s, st) => s + kpi[st.key].cong, 0)

  const cols = [
    {
      title: 'Công đoạn', dataIndex: 'congDoan', key: 'cd', width: 90, align: 'center',
      filters: STAGES.map(s => ({ text: s.label, value: s.key })),
      onFilter: (v, r) => r.congDoan?.toUpperCase() === v,
      render: v => v ? <Tag color={CONG_DOAN_COLOR[v] || 'default'} style={{ fontWeight: 700, marginRight: 0 }}>{v}</Tag> : '—',
    },
    {
      title: 'Mã SP', dataIndex: 'maSp', key: 'maSp', width: 88, align: 'center',
      render: v => v ? <Tag color="blue" style={{ marginRight: 0 }}>{v}</Tag> : <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: 'Tiến trình / Tên SP', dataIndex: 'tenTrinh', key: 'tenTrinh', width: 240,
      render: v => v ? <span style={{ fontSize: 12, lineHeight: 1.4 }}>{v}</span> : <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: 'Số lô', dataIndex: 'soLo', key: 'soLo', width: 82, align: 'center',
      render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || '—'}</span>,
    },
    {
      title: 'Tổ', key: 'to', width: 80, align: 'center',
      render: (_, r) => {
        const v = r.toNhom || r.nhomThucHien
        return v ? <Tag color="cyan" style={{ marginRight: 0 }}>{v}</Tag> : <span style={{ color: '#ccc' }}>—</span>
      },
    },
    {
      title: 'Ca', dataIndex: 'caSanXuat', key: 'ca', width: 70, align: 'center',
      render: v => v ? <Tag color="orange" style={{ marginRight: 0, fontSize: 11 }}>{v}</Tag> : <span style={{ color: '#ccc' }}>—</span>,
    },
    {
      title: 'Người TH', key: 'nguoi', width: 150, ellipsis: true,
      render: (_, r) => {
        const list = r.nguoiThucHienList || r.nguoiThucHien
        return list
          ? <Tooltip title={list}><span style={{ fontSize: 12 }}>{list.length > 22 ? list.slice(0, 20) + '…' : list}</span></Tooltip>
          : <span style={{ color: '#ccc' }}>—</span>
      },
    },
    {
      title: 'Công TH', dataIndex: 'congThucHien', key: 'cong', width: 95, align: 'center',
      render: v => v != null
        ? <span style={{ color: 'rgb(0,0,205)', fontWeight: 400, fontFamily: 'monospace' }}>{fmtCong(v)}</span>
        : <span style={{ color: '#ccc' }}>—</span>,
      sorter: (a, b) => (a.congThucHien || 0) - (b.congThucHien || 0),
    },
    {
      title: 'Sản lượng', dataIndex: 'sanLuong', key: 'sl', width: 100, align: 'center',
      render: v => v != null
        ? <span style={{ fontWeight: 400, color: 'rgb(0,0,205)', fontSize: 13 }}>{fmtSL(Number(v))}</span>
        : <span style={{ color: '#ccc' }}>—</span>,
      sorter: (a, b) => (Number(a.sanLuong) || 0) - (Number(b.sanLuong) || 0),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Năng suất', key: 'ns', width: 90, align: 'right',
      render: (_, r) => {
        const ns = r.nangSuat != null ? Number(r.nangSuat)
          : (r.congThucHien && r.sanLuong ? Number(r.sanLuong) / Number(r.congThucHien) : null)
        return ns != null
          ? <span style={{ fontSize: 12, color: '#595959', fontFamily: 'monospace' }}>{ns.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</span>
          : <span style={{ color: '#ccc' }}>—</span>
      },
      sorter: (a, b) => {
        const ns = r => r.nangSuat != null ? Number(r.nangSuat)
          : (r.congThucHien && r.sanLuong ? Number(r.sanLuong) / Number(r.congThucHien) : 0)
        return ns(a) - ns(b)
      },
    },
  ]

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="95vw"
      style={{ top: 16, maxWidth: 1800 }}
      destroyOnHidden
      styles={{ body: { padding: 0, background: '#f4f6f9' } }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#00CC99' }}>
            Chi tiết sản lượng ngày
          </span>
          <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 18, color: '#374151' }}>
            {date ? dayjs(date).format('DD/MM/YYYY') : ''}
          </span>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
            ({rows.length} phiên làm việc)
          </span>
        </div>
      }
    >
      <style>{`
        .day-modal-kpi { display: flex; gap: 8px; flex-wrap: wrap; padding: 12px 16px; background: #fff; border-bottom: 1px solid #e2e8f0; }
        .day-detail-tbl .ant-table-thead > tr > th {
          background: linear-gradient(90deg, #007a61 0%, #00997a 100%) !important;
          color: #fff !important; font-size: 11px !important; font-weight: 700 !important;
          text-transform: uppercase; padding: 6px 8px !important; white-space: nowrap;
          border-right: 1px solid #00CC99 !important;
        }
        .day-detail-tbl .ant-table-thead > tr > th::before { display: none !important; }
        .day-detail-tbl .ant-table-tbody > tr > td { padding: 5px 8px !important; font-size: 12px; }
        .day-detail-tbl .ant-table-tbody > tr:nth-child(even) > td { background: #f8fafc; }
        .day-detail-tbl .ant-table-tbody > tr:hover > td { background: #dbeafe !important; }
        .day-detail-tbl .ant-table-summary > tr > td {
          background: #003d30 !important; color: #fff !important;
          font-weight: 700 !important; padding: 6px 8px !important;
        }
      `}</style>

      {/* KPI per stage */}
      <div className="day-modal-kpi">
        {STAGES.map(s => {
          const d = kpi[s.key]
          if (!d.soPhien) return null
          const stageRows = rows.filter(r => {
            let cd = r.congDoan?.toUpperCase()
            if (cd === 'PC') {
              const nhom = (r.nhomThucHien || r.toNhom)?.toUpperCase()
              if (nhom === 'PCPL1') cd = 'PCPL1'
              else if (nhom === 'PCPL2') cd = 'PCPL2'
              else if (nhom === 'PCPL3' || nhom === 'PL') cd = 'PL'
              else cd = 'PCPL1'
            }
            if (cd === 'PCPL3') cd = 'PL'
            return cd === s.key
          })
          const miniCols = [
            { title: 'Mã SP', dataIndex: 'maSp', width: 75, align: 'center',
              render: v => <Tag color="blue" style={{ marginRight: 0, fontSize: 11 }}>{v || '—'}</Tag> },
            { title: 'Tên SP / Tiến trình', dataIndex: 'tenTrinh',
              render: v => <span style={{ fontSize: 11, wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: 1.4 }}>{v || '—'}</span> },
            { title: 'Số lô', dataIndex: 'soLo', width: 72, align: 'center',
              render: v => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{v || '—'}</span> },
            { title: 'Ca', dataIndex: 'caSanXuat', width: 58, align: 'center',
              render: v => v ? <Tag color="orange" style={{ marginRight: 0, fontSize: 10 }}>{v}</Tag> : '—' },
            { title: 'Người TH', key: 'nguoi', width: 160,
              render: (_, r) => { const t = r.nguoiThucHienList || r.nguoiThucHien; return <span style={{ fontSize: 11, wordBreak: 'break-word', whiteSpace: 'normal' }}>{t || '—'}</span> } },
            { title: 'Công', dataIndex: 'congThucHien', width: 68, align: 'center',
              render: v => <span style={{ color: '#1d4ed8', fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>{v != null ? fmtCong(v) : '—'}</span> },
            { title: 'SL', dataIndex: 'sanLuong', width: 75, align: 'center',
              render: v => <span style={{ color: s.slColor, fontWeight: 700, fontSize: 12 }}>{v != null ? fmtSL(Number(v)) : '—'}</span> },
          ]
          const popContent = (
            <div style={{ width: 'min(860px, 80vw)' }}>
              <Table
                size="small"
                columns={miniCols}
                dataSource={stageRows}
                rowKey={r => r.sessionId || r.requestId || Math.random()}
                pagination={false}
                scroll={{ y: 320 }}
                style={{ fontSize: 11 }}
                summary={() => (
                  <Table.Summary fixed="bottom">
                    <Table.Summary.Row>
                      <Table.Summary.Cell colSpan={5} align="right">
                        <strong style={{ fontSize: 11, color: '#555' }}>Tổng ({stageRows.length} phiên)</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell align="center">
                        <strong style={{ color: '#1d4ed8', fontFamily: 'monospace' }}>{fmtCong(d.cong, 2)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell align="center">
                        <strong style={{ color: s.slColor }}>{fmtSL(d.sl)}</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </div>
          )
          return (
            <Popover
              key={s.key}
              content={popContent}
              title={<span style={{ fontWeight: 700, color: s.slColor }}>Chi tiết {s.label} — {stageRows.length} phiên</span>}
              trigger="click"
              placement="bottomLeft"
              overlayStyle={{ maxWidth: 'min(900px, 85vw)' }}
            >
              <div style={{
                background: s.bg, border: `1.5px solid ${s.border}`,
                borderRadius: 8, padding: '5px 14px', minWidth: 130,
                cursor: 'pointer', transition: 'box-shadow 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 0 2px ${s.slColor}55`}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <Tag style={{ margin: 0, fontWeight: 700, fontSize: 11, background: s.slColor, color: '#fff', border: 'none' }}>{s.label}</Tag>
                  <span style={{ fontSize: 10, color: '#888' }}>{d.soPhien} phiên</span>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 9, color: '#999', fontWeight: 600 }}>SẢN LƯỢNG</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: s.slColor, lineHeight: 1.2 }}>{fmtSL(d.sl)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: '#999', fontWeight: 600 }}>CÔNG TH</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: s.congColor, lineHeight: 1.2 }}>{fmtCong(d.cong, 2)}</div>
                  </div>
                </div>
              </div>
            </Popover>
          )
        })}
        <div style={{
          background: 'linear-gradient(135deg,#EAECF2,#DDE1E8)', border: '2px solid #00CC99',
          borderRadius: 8, padding: '5px 14px', minWidth: 140,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#00CC99', marginBottom: 3 }}>TỔNG CỘNG</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div>
              <div style={{ fontSize: 9, color: '#999', fontWeight: 600 }}>SẢN LƯỢNG</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#00CC99', lineHeight: 1.2 }}>{fmtSL(grandSL)}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#999', fontWeight: 600 }}>CÔNG TH</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#00CC99', lineHeight: 1.2 }}>{fmtCong(grandCong, 2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail table */}
      <div style={{ padding: '0 0 8px' }}>
        <Table
          className="day-detail-tbl"
          columns={cols}
          dataSource={rows}
          rowKey={r => r.sessionId || r.requestId || Math.random()}
          size="small"
          scroll={{ x: 1200 }}
          pagination={false}
          summary={() => (
            <Table.Summary fixed="bottom">
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={7} align="right">
                  <strong style={{ color: '#99ffe8', fontSize: 11 }}>Tổng trang</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  <strong style={{ color: '#80ffdd' }}>{fmtCong(grandCong)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8} align="right">
                  <strong style={{ color: '#99ffe8', fontSize: 13 }}>{fmtSL(grandSL)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={9} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </div>
    </Modal>
  )
}

// ─── Tab 2: Tổng hợp sản lượng (pivot theo ngày) ─────────────────────────────

function TongHopTab() {
  const [raw, setRaw]         = useState([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()])
  const [selectedDay, setSelectedDay] = useState(null)
  const [empCounts, setEmpCounts] = useState({})
  const [machineMap, setMachineMap] = useState({})
  const [innerTab, setInnerTab] = useState('pivot')

  const filterRef = useRef(null)
  const [filterH, setFilterH] = useState(0)
  useEffect(() => {
    if (!filterRef.current) return
    const obs = new ResizeObserver(() => setFilterH(filterRef.current?.offsetHeight || 0))
    obs.observe(filterRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    fetchData()
    Promise.all(STAGES.map(s => api.get('/employees', { params: { page: 0, size: 1, toNhom: s.empGroup, excludeTinhTrang: 'tam_nghi' } })))
      .then(results => {
        const counts = {}
        STAGES.forEach((s, i) => { counts[s.key] = results[i].data.totalElements })
        setEmpCounts(counts)
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = useCallback(async (range = dateRange, { silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const params = {}
      if (range?.[0]) params.fromDate = range[0].format('YYYY-MM-DD')
      if (range?.[1]) params.toDate   = range[1].format('YYYY-MM-DD')
      const { data: res } = await api.get('/work-schedule-session/daily-report', { params })
      setRaw(res)
      const codes = [...new Set(res.map(r => r.maSp).filter(Boolean))]
      if (codes.length > 0) {
        api.get('/product-master/lookup-batch', { params: { codes } })
          .then(({ data: bm }) => setMachineMap(bm))
          .catch(() => {})
      }
    } catch {
      message.error('Không thể tải dữ liệu tổng hợp')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    const handler = () => fetchData(undefined, { silent: true })
    window.addEventListener('app:silent-refresh', handler)
    return () => window.removeEventListener('app:silent-refresh', handler)
  }, [fetchData])

  const handleReset = () => {
    const def = [dayjs().startOf('month'), dayjs()]
    setDateRange(def)
    fetchData(def)
  }

  const pivotData = useMemo(() => {
    const map = {}
    raw.forEach(r => {
      if (r.status === 'PENDING' || r.status === 'IN_PROGRESS') return
      const date = r.ngay
      if (!date) return
      if (!map[date]) map[date] = { ngay: date }
      let cd = r.congDoan?.toUpperCase()
      if (!cd) return
      if (cd === 'PC') {
        const nhom = (r.nhomThucHien || r.toNhom)?.toUpperCase()
        if (nhom === 'PCPL1') cd = 'PCPL1'
        else if (nhom === 'PCPL2') cd = 'PCPL2'
        else if (nhom === 'PCPL3' || nhom === 'PL') cd = 'PL'
        else cd = 'PCPL1'
      }
      if (cd === 'PCPL3') cd = 'PL'
      if (!map[date][cd]) map[date][cd] = { sl: 0, cong: 0, soPhien: 0, _mm: new Set() }
      map[date][cd].sl      += Number(r.sanLuong      || 0)
      map[date][cd].cong    += Number(r.congThucHien  || 0)
      map[date][cd].soPhien += 1
      const mkey = (cd === 'PCPL1' || cd === 'PCPL2') ? 'mayMocPc'
        : cd === 'PL' ? 'mayMocPl' : cd === 'DG' ? 'mayMocDg'
        : cd === 'BBC1' ? 'mayMocBbc1' : null
      if (mkey && r.maSp && machineMap[r.maSp]?.[mkey]) map[date][cd]._mm.add(machineMap[r.maSp][mkey])
    })
    const rows = Object.values(map)
    rows.forEach(row => STAGES.forEach(s => {
      if (row[s.key]) {
        row[s.key].mayMoc = row[s.key]._mm.size > 0 ? [...row[s.key]._mm].join(', ') : null
        delete row[s.key]._mm
      }
    }))
    return rows.sort((a, b) => b.ngay.localeCompare(a.ngay))
  }, [raw, machineMap])

  const kpi = useMemo(() => {
    const totals = {}
    STAGES.forEach(s => { totals[s.key] = { sl: 0, cong: 0, soPhien: 0 } })
    pivotData.forEach(row => {
      STAGES.forEach(s => {
        totals[s.key].sl      += row[s.key]?.sl      || 0
        totals[s.key].cong    += row[s.key]?.cong    || 0
        totals[s.key].soPhien += row[s.key]?.soPhien || 0
      })
    })
    return totals
  }, [pivotData])

  const grandSL   = STAGES.reduce((s, st) => s + kpi[st.key].sl,   0)
  const grandCong = STAGES.reduce((s, st) => s + kpi[st.key].cong, 0)

  const columns = [
    {
      title: 'NGÀY', dataIndex: 'ngay', key: 'ngay',
      width: 110, fixed: 'left', align: 'center',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#ffffff', fontSize: 11 } }),
      render: v => (
        <span style={{ fontWeight: 700, color: '#1D4ED8' }}>
          {dayjs(v).format('DD/MM/YYYY')}
        </span>
      ),
      sorter: (a, b) => a.ngay.localeCompare(b.ngay),
      defaultSortOrder: 'descend',
    },
    ...STAGES.map(s => ({
      title: (
        <span style={{ fontWeight: 800, letterSpacing: 1.5, fontSize: 12 }}>
          {s.label}{empCounts[s.key] != null ? ` (${empCounts[s.key]})` : ''}
        </span>
      ),
      key: s.key,
      align: 'center',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#ffffff', textAlign: 'center', borderLeft: '2px solid rgba(255,255,255,0.2)' } }),
      children: [
        {
          title: 'SL',
          key: `${s.key}_sl`,
          width: 95, align: 'center',
          onHeaderCell: () => ({ style: { background: '#29a3a3', color: '#ffffff', fontSize: 10 } }),
          render: (_, r) => {
            const val = r[s.key]?.sl
            if (!val) return <span style={{ color: '#d1d5db' }}>—</span>
            return (
              <Tooltip title={`${r[s.key]?.soPhien || 0} phiên làm việc`}>
                <span style={{ fontWeight: 700, color: s.slColor }}>{fmtSL(val)}</span>
              </Tooltip>
            )
          },
          sorter: (a, b) => (a[s.key]?.sl || 0) - (b[s.key]?.sl || 0),
        },
        {
          title: 'Công',
          key: `${s.key}_cong`,
          width: 88, align: 'center',
          onHeaderCell: () => ({ style: { background: '#29a3a3', color: '#ffffff', fontSize: 10 } }),
          render: (_, r) => {
            const val = r[s.key]?.cong
            if (!val) return <span style={{ color: '#d1d5db' }}>—</span>
            return <span style={{ color: s.congColor, fontWeight: 600 }}>{fmtCong(val)}</span>
          },
        },
        {
          title: 'Máy',
          key: `${s.key}_may`,
          width: 110, align: 'left',
          onHeaderCell: () => ({ style: { background: '#1e7a7a', color: '#ffffff', fontSize: 10 } }),
          render: (_, r) => {
            const mayMoc = r[s.key]?.mayMoc
            if (!mayMoc) return <span style={{ color: '#d1d5db' }}>—</span>
            return (
              <Tooltip title={mayMoc}>
                <span style={{ fontSize: 11, color: '#444', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                  {mayMoc}
                </span>
              </Tooltip>
            )
          },
        },
      ],
    })),
    {
      title: 'TỔNG SL', key: 'grandSl', width: 110, align: 'center', fixed: 'right',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#ffffff', fontSize: 11 } }),
      render: (_, r) => {
        const total = STAGES.reduce((sum, s) => sum + (r[s.key]?.sl || 0), 0)
        return total
          ? <span style={{ color: 'rgb(0,0,205)', fontWeight: 400, fontSize: 13 }}>{fmtSL(total)}</span>
          : <span style={{ color: '#d1d5db' }}>—</span>
      },
      sorter: (a, b) =>
        STAGES.reduce((s, st) => s + (a[st.key]?.sl || 0), 0) -
        STAGES.reduce((s, st) => s + (b[st.key]?.sl || 0), 0),
    },
    {
      title: `TỔNG CÔNG (${Object.values(empCounts).reduce((a, b) => a + b, 0) || '...'})`, key: 'grandCong', width: 120, align: 'center', fixed: 'right',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#ffffff', fontSize: 11 } }),
      render: (_, r) => {
        const total = STAGES.reduce((sum, s) => sum + (r[s.key]?.cong || 0), 0)
        return total
          ? <span style={{ color: 'rgb(0,0,205)', fontWeight: 400 }}>{fmtCong(total, 2)}</span>
          : <span style={{ color: '#d1d5db' }}>—</span>
      },
    },
  ]

  return (
    <>
      {/* Bộ lọc + KPI (sticky wrapper) */}
      <div ref={filterRef} style={{
        position: 'sticky', top: TAB_BAR_H, zIndex: 9,
        background: '#BBBBBB',
        borderBottom: '3px solid #999999',
        boxShadow: '0 3px 12px rgba(0,0,0,0.15)',
      }}>

      {/* Row 1: Tiêu đề + filter + tổng */}
      <div style={{ padding: '9px 16px 8px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: '#222222', whiteSpace: 'nowrap', letterSpacing: 0.3 }}>
          <FundOutlined style={{ marginRight: 6 }} />Tổng Hợp Sản Lượng
        </span>
        <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.15)' }} />
        <RangePicker size="small" value={dateRange} onChange={setDateRange}
          format="DD/MM/YYYY" allowClear placeholder={['Từ ngày', 'Đến ngày']} />
        <Button size="small" type="primary" icon={<SearchOutlined />}
          style={{ background: '#555555', borderColor: '#444444', fontWeight: 600 }}
          onClick={() => fetchData()}>Truy xuất</Button>
        <Button size="small" icon={<ReloadOutlined />} onClick={handleReset}
          style={{ background: 'rgba(255,255,255,0.35)', borderColor: 'rgba(0,0,0,0.25)', color: '#222222' }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#444444' }}><strong style={{ color: '#222222' }}>{pivotData.length}</strong> ngày</span>
          <span style={{ fontSize: 12, color: '#444444' }}>Nhân sự: <strong style={{ color: '#222222' }}>{Object.values(empCounts).reduce((a, b) => a + b, 0) || '...'}</strong></span>
          <span style={{ fontSize: 13, color: '#222222', fontWeight: 700 }}>SL: <strong style={{ color: '#222222', fontSize: 15 }}>{fmtSL(grandSL)}</strong></span>
          <span style={{ fontSize: 13, color: '#222222', fontWeight: 700 }}>Công: <strong style={{ color: '#222222', fontSize: 15 }}>{fmtCong(grandCong, 2)}</strong></span>
        </div>
      </div>

      {/* Row 2: Inner tabs */}
      <div style={{ padding: '4px 16px 6px', display: 'flex', gap: 6, borderTop: '1px solid rgba(0,0,0,0.12)' }}>
        {[
          { key: 'pivot',    label: '📊 Bảng Tổng Hợp' },
          { key: 'phanTich', label: '📈 Phân Tích' },
        ].map(t => (
          <button key={t.key} onClick={() => setInnerTab(t.key)}
            style={{
              padding: '4px 14px', cursor: 'pointer', fontSize: 12, borderRadius: 6,
              border: `1.5px solid ${innerTab === t.key ? '#333333' : 'rgba(0,0,0,0.2)'}`,
              color: innerTab === t.key ? '#111111' : 'rgba(0,0,0,0.55)',
              background: innerTab === t.key ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.18)',
              fontWeight: innerTab === t.key ? 700 : 500,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      </div>{/* end sticky filter wrapper */}

      {innerTab === 'pivot' && (<>
      <style>{`
        .tonghop-table .ant-table-thead > tr > th {
          background: #33CCCC !important;
          color: #ffffff !important; text-align: center !important;
          text-transform: uppercase; font-size: 11px !important; font-weight: 700 !important;
          letter-spacing: 0.5px; padding: 8px 6px !important;
          border-right: 1px solid rgba(255,255,255,0.18) !important; white-space: nowrap;
        }
        .tonghop-table .ant-table-thead > tr:last-child > th {
          background: #29a3a3 !important;
        }
        .tonghop-table .ant-table-thead > tr > th::before { display: none !important; }
        .tonghop-table .ant-table-thead > tr:first-child > th {
          font-size: 12px !important; font-weight: 800 !important;
          letter-spacing: 1.2px; padding: 9px 8px !important;
        }
        .tonghop-table .ant-table-thead > tr > th .ant-table-column-sorter { color: rgba(255,255,255,0.6) !important; }
        .tonghop-table .ant-table-tbody > tr > td {
          padding: 7px 10px !important; font-size: 12px; color: #000099 !important;
          border-bottom: 1px solid #f1f5f9 !important; vertical-align: middle;
        }
        .tonghop-table .ant-table-tbody > tr:nth-child(odd) > td  { background: #ffffff; }
        .tonghop-table .ant-table-tbody > tr:nth-child(even) > td { background: #ffffff; }
        .tonghop-table .ant-table-tbody > tr:hover > td { background: #99CCCC !important; }
        .tonghop-table .ant-table-summary > tr > td {
          background: #33CCCC !important; color: #ffffff !important;
          font-weight: 700; font-size: 12px; padding: 8px 10px !important;
          border-top: 2px solid #29a3a3 !important;
        }
      `}</style>

      <SkeletonTable
        className="tonghop-table"
        columns={columns}
        dataSource={pivotData}
        rowKey="ngay"
        loading={loading}
        size="small"
        scroll={{ x: 2200 }}
        sticky={{ offsetHeader: TAB_BAR_H + filterH }}
        onRow={record => ({
          onClick: () => setSelectedDay(record.ngay),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          defaultPageSize: 31,
          showSizeChanger: true,
          pageSizeOptions: ['14', '31', '60', '90'],
          showTotal: total => `Tổng ${total} ngày`,
        }}
        summary={pageData => {
          const tot = {}
          STAGES.forEach(s => { tot[s.key] = { sl: 0, cong: 0 } })
          pageData.forEach(r => {
            STAGES.forEach(s => {
              tot[s.key].sl   += r[s.key]?.sl   || 0
              tot[s.key].cong += r[s.key]?.cong || 0
            })
          })
          const gSl   = STAGES.reduce((sum, s) => sum + tot[s.key].sl,   0)
          const gCong = STAGES.reduce((sum, s) => sum + tot[s.key].cong, 0)
          return (
            <Table.Summary fixed="bottom">
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} align="center">
                  <strong style={{ color: '#fff', fontSize: 11, letterSpacing: 0.5 }}>TỔNG TRANG</strong>
                </Table.Summary.Cell>
                {STAGES.flatMap((s, i) => [
                  <Table.Summary.Cell key={`sl${i}`} index={i * 3 + 1} align="right">
                    <strong style={{ color: '#fff' }}>{fmtSL(tot[s.key].sl)}</strong>
                  </Table.Summary.Cell>,
                  <Table.Summary.Cell key={`cong${i}`} index={i * 3 + 2} align="right">
                    <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{fmtCong(tot[s.key].cong, 2)}</strong>
                  </Table.Summary.Cell>,
                  <Table.Summary.Cell key={`may${i}`} index={i * 3 + 3} />,
                ])}
                <Table.Summary.Cell index={19} align="right">
                  <strong style={{ color: '#fff', fontSize: 13 }}>{fmtSL(gSl)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={20} align="right">
                  <strong style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{fmtCong(gCong, 2)}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )
        }}
      />

      <DayDetailModal
        open={!!selectedDay}
        date={selectedDay}
        rows={raw.filter(r => r.ngay === selectedDay && r.status !== 'PENDING' && r.status !== 'IN_PROGRESS')}
        onClose={() => setSelectedDay(null)}
      />
      </>)}

      {innerTab === 'phanTich' && (
        <div style={{ padding: '12px 16px' }}>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Tổng sản lượng', value: fmtSL(grandSL),   color: '#1e5fa3' },
              { label: 'Tổng công',      value: fmtCong(grandCong, 2), color: '#6d28d9' },
              { label: 'Số ngày',        value: pivotData.length,  color: '#b45309' },
              { label: 'SL / ngày TB',   value: fmtSL(Math.round(grandSL / (pivotData.length || 1))), color: '#0e7490' },
            ].map(c => (
              <div key={c.label} style={{ background: '#f8f9fa', borderLeft: `4px solid ${c.color}`, padding: '12px 16px', borderRadius: 4 }}>
                <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ background: '#f8f9fa', borderRadius: 6, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 12, color: '#333', fontSize: 13 }}>Sản lượng theo Công đoạn</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={STAGES.map(s => ({ name: s.label, sl: kpi[s.key]?.sl || 0 }))}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700 }} />
                  <YAxis tickFormatter={v => v.toLocaleString('vi-VN')} tick={{ fontSize: 11 }} />
                  <RcTooltip formatter={v => [v.toLocaleString('vi-VN'), 'Sản lượng']} />
                  <Bar dataKey="sl" name="Sản lượng" radius={[4, 4, 0, 0]}>
                    {STAGES.map(s => <Cell key={s.key} fill={s.slColor} />)}
                    <LabelList dataKey="sl" position="top" formatter={v => v > 0 ? v.toLocaleString('vi-VN') : ''} style={{ fontSize: 10, fill: '#444' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: '#f8f9fa', borderRadius: 6, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 12, color: '#333', fontSize: 13 }}>Xu hướng sản lượng theo ngày</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={[...pivotData].reverse().map(r => ({
                    ngay: dayjs(r.ngay).format('DD/MM'),
                    sl: STAGES.reduce((sum, s) => sum + (r[s.key]?.sl || 0), 0),
                  }))}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ngay" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tickFormatter={v => v.toLocaleString('vi-VN')} tick={{ fontSize: 11 }} />
                  <RcTooltip formatter={v => [v.toLocaleString('vi-VN'), 'Tổng SL']} />
                  <Line type="monotone" dataKey="sl" stroke="#1D4ED8" strokeWidth={2} dot={pivotData.length <= 14} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bảng phân tích theo công đoạn + máy móc */}
          <Table
            size="small"
            dataSource={STAGES.map(s => ({
              key:      s.key,
              label:    s.label,
              sl:       kpi[s.key]?.sl      || 0,
              cong:     kpi[s.key]?.cong    || 0,
              soPhien:  kpi[s.key]?.soPhien || 0,
              mayMoc:   [...new Set(
                pivotData.flatMap(r => r[s.key]?.mayMoc ? r[s.key].mayMoc.split(', ') : [])
              )].join(', '),
            })).filter(r => r.sl > 0)}
            pagination={false}
            columns={[
              {
                title: 'Công đoạn', dataIndex: 'label', width: 100,
                render: (v, r) => <Tag color={CONG_DOAN_COLOR[r.key] || 'default'} style={{ fontWeight: 700 }}>{v}</Tag>,
              },
              { title: 'Số phiên', dataIndex: 'soPhien', align: 'right', width: 90 },
              {
                title: 'Tổng SL', dataIndex: 'sl', align: 'right',
                render: v => <span style={{ fontWeight: 700, color: '#1e5fa3' }}>{fmtSL(v)}</span>,
              },
              {
                title: '% SL', dataIndex: 'sl', key: 'pct', align: 'right', width: 80,
                render: v => `${grandSL > 0 ? ((v / grandSL) * 100).toFixed(1) : 0}%`,
              },
              {
                title: 'Tổng Công', dataIndex: 'cong', align: 'right', width: 110,
                render: v => <span style={{ color: '#6d28d9' }}>{fmtCong(v, 2)}</span>,
              },
              {
                title: 'SL/Công', align: 'right', width: 90,
                render: (_, r) => r.cong > 0
                  ? <span style={{ color: '#0e7490', fontWeight: 600 }}>{(r.sl / r.cong).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}</span>
                  : <span style={{ color: '#bbb' }}>—</span>,
              },
              {
                title: 'Máy Móc', dataIndex: 'mayMoc', ellipsis: true,
                render: v => v
                  ? <Tooltip title={v}><span style={{ fontSize: 12, color: '#555' }}>{v}</span></Tooltip>
                  : <span style={{ color: '#bbb' }}>—</span>,
              },
            ]}
            summary={() => (
              <Table.Summary.Row style={{ background: '#f0fdf4', fontWeight: 700 }}>
                <Table.Summary.Cell index={0}>TỔNG</Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">{STAGES.reduce((s, st) => s + (kpi[st.key]?.soPhien || 0), 0)}</Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right"><span style={{ color: '#1e5fa3' }}>{fmtSL(grandSL)}</span></Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">100%</Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right"><span style={{ color: '#6d28d9' }}>{fmtCong(grandCong, 2)}</span></Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  {grandCong > 0 ? <span style={{ color: '#0e7490' }}>{(grandSL / grandCong).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}</span> : '—'}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} />
              </Table.Summary.Row>
            )}
          />
        </div>
      )}
    </>
  )
}

// ─── Tab: Tổng hợp Chi tiết (grouped by SP+lô) ───────────────────────────────
function TongHopChiTietTab() {
  const [raw, setRaw]             = useState([])
  const [loading, setLoading]     = useState(false)
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()])
  const [machineMap, setMachineMap] = useState({})
  const [search, setSearch]       = useState('')
  const filterRef = useRef(null)
  const [filterH, setFilterH]     = useState(0)
  useEffect(() => {
    if (!filterRef.current) return
    const obs = new ResizeObserver(() => setFilterH(filterRef.current?.offsetHeight || 0))
    obs.observe(filterRef.current)
    return () => obs.disconnect()
  }, [])

  const fetchData = useCallback(async (range = dateRange) => {
    setLoading(true)
    try {
      const params = {}
      if (range?.[0]) params.fromDate = range[0].format('YYYY-MM-DD')
      if (range?.[1]) params.toDate   = range[1].format('YYYY-MM-DD')
      const { data: res } = await api.get('/work-schedule-session/daily-report', { params })
      const done = res.filter(r => r.status !== 'PENDING' && r.status !== 'IN_PROGRESS')
      setRaw(done)
      const codes = [...new Set(done.map(r => r.maSp).filter(Boolean))]
      if (codes.length > 0) {
        api.get('/product-master/lookup-batch', { params: { codes } })
          .then(({ data: bm }) => setMachineMap(bm))
          .catch(() => {})
      }
    } catch { message.error('Không thể tải dữ liệu chi tiết') }
    finally { setLoading(false) }
  }, [dateRange])

  useEffect(() => { fetchData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const groupedData = useMemo(() => {
    const map = {}
    raw.forEach(r => {
      if (!r.ngay) return  // bỏ qua session không có ngày (nhất quán với TongHopTab)
      const key = `${r.maSp || ''}|${r.soLo || ''}`
      if (!map[key]) {
        map[key] = { key, maSp: r.maSp, tenTrinh: r.tenTrinh, soLo: r.soLo, coLo: r.coLo }
        STAGES.forEach(s => { map[key][s.key] = { sl: 0, cong: 0, soPhien: 0, _mm: new Set() } })
      }
      let cd = r.congDoan?.toUpperCase()
      if (!cd) return
      if (cd === 'PC') {
        const nhom = (r.nhomThucHien || r.toNhom)?.toUpperCase()
        if (nhom === 'PCPL1') cd = 'PCPL1'
        else if (nhom === 'PCPL2') cd = 'PCPL2'
        else if (nhom === 'PCPL3' || nhom === 'PL') cd = 'PL'
        else cd = 'PCPL1'
      }
      if (cd === 'PCPL3') cd = 'PL'
      if (!map[key][cd]) return
      map[key][cd].sl      += Number(r.sanLuong     || 0)
      map[key][cd].cong    += Number(r.congThucHien || 0)
      map[key][cd].soPhien += 1
      const mkey = (cd === 'PCPL1' || cd === 'PCPL2') ? 'mayMocPc'
        : cd === 'PL' ? 'mayMocPl' : cd === 'DG' ? 'mayMocDg'
        : cd === 'BBC1' ? 'mayMocBbc1' : null
      if (mkey && r.maSp && machineMap[r.maSp]?.[mkey]) map[key][cd]._mm.add(machineMap[r.maSp][mkey])
    })
    const rows = Object.values(map)
    rows.forEach(row => STAGES.forEach(s => {
      if (row[s.key]) {
        row[s.key].mayMoc = row[s.key]._mm.size > 0 ? [...row[s.key]._mm].join(', ') : null
        delete row[s.key]._mm
      }
    }))
    return rows.sort((a, b) => {
      const sa = STAGES.reduce((sum, st) => sum + (a[st.key]?.sl || 0), 0)
      const sb = STAGES.reduce((sum, st) => sum + (b[st.key]?.sl || 0), 0)
      return sb - sa
    })
  }, [raw, machineMap])

  const displayData = useMemo(() => {
    if (!search.trim()) return groupedData
    const q = search.trim().toLowerCase()
    return groupedData.filter(r =>
      (r.maSp || '').toLowerCase().includes(q) ||
      (r.tenTrinh || '').toLowerCase().includes(q) ||
      (r.soLo || '').toLowerCase().includes(q)
    )
  }, [groupedData, search])

  const grandSL   = displayData.reduce((s, r) => s + STAGES.reduce((ss, st) => ss + (r[st.key]?.sl || 0), 0), 0)
  const grandCong = displayData.reduce((s, r) => s + STAGES.reduce((ss, st) => ss + (r[st.key]?.cong || 0), 0), 0)

  const columns = [
    { title: 'STT', key: 'stt', width: 46, align: 'center', fixed: 'left',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff', fontSize: 11 } }),
      render: (_, __, idx) => <span style={{ color: '#64748b', fontSize: 11 }}>{idx + 1}</span> },
    { title: 'Mã SP', dataIndex: 'maSp', key: 'maSp', width: 100, fixed: 'left',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: v => <b style={{ color: '#1d4ed8' }}>{v || '—'}</b> },
    { title: 'Tên SP', dataIndex: 'tenTrinh', key: 'tenTrinh', width: 200, fixed: 'left', ellipsis: true,
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }) },
    { title: 'Số Lô', dataIndex: 'soLo', key: 'soLo', width: 90, align: 'center',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || '—'}</span> },
    { title: 'Cỡ Lô', dataIndex: 'coLo', key: 'coLo', width: 80, align: 'right',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: v => v != null ? Number(v).toLocaleString('vi-VN') : '—' },
    ...STAGES.map(s => ({
      title: <span style={{ fontWeight: 800, fontSize: 12 }}>{s.label}</span>,
      key: s.key,
      align: 'center',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff', textAlign: 'center', borderLeft: '2px solid rgba(255,255,255,0.2)' } }),
      children: [
        {
          title: 'SL', key: `${s.key}_sl`, width: 90, align: 'right',
          onHeaderCell: () => ({ style: { background: '#29a3a3', color: '#fff', fontSize: 10 } }),
          render: (_, r) => {
            const val = r[s.key]?.sl
            if (!val) return <span style={{ color: '#d1d5db' }}>—</span>
            return (
              <Tooltip title={`${r[s.key]?.soPhien || 0} phiên`}>
                <span style={{ fontWeight: 700, color: s.slColor }}>{fmtSL(val)}</span>
              </Tooltip>
            )
          },
        },
        {
          title: 'Công', key: `${s.key}_cong`, width: 80, align: 'right',
          onHeaderCell: () => ({ style: { background: '#29a3a3', color: '#fff', fontSize: 10 } }),
          render: (_, r) => {
            const val = r[s.key]?.cong
            if (!val) return <span style={{ color: '#d1d5db' }}>—</span>
            return <span style={{ color: s.congColor, fontWeight: 600 }}>{fmtCong(val)}</span>
          },
        },
        {
          title: 'Máy', key: `${s.key}_may`, width: 110, align: 'left',
          onHeaderCell: () => ({ style: { background: '#1e7a7a', color: '#fff', fontSize: 10 } }),
          render: (_, r) => {
            const mm = r[s.key]?.mayMoc
            if (!mm) return <span style={{ color: '#d1d5db' }}>—</span>
            return (
              <Tooltip title={mm}>
                <span style={{ fontSize: 11, color: '#444', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{mm}</span>
              </Tooltip>
            )
          },
        },
      ],
    })),
    { title: 'TỔNG SL', key: 'grandSl', width: 100, align: 'right', fixed: 'right',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff', fontSize: 11 } }),
      render: (_, r) => {
        const total = STAGES.reduce((s, st) => s + (r[st.key]?.sl || 0), 0)
        return total ? <span style={{ color: '#1d4ed8', fontWeight: 700, fontSize: 13 }}>{fmtSL(total)}</span>
          : <span style={{ color: '#d1d5db' }}>—</span>
      },
    },
    { title: 'TỔNG CÔNG', key: 'grandCong', width: 110, align: 'right', fixed: 'right',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff', fontSize: 11 } }),
      render: (_, r) => {
        const total = STAGES.reduce((s, st) => s + (r[st.key]?.cong || 0), 0)
        return total ? <span style={{ color: '#6d28d9', fontWeight: 600 }}>{fmtCong(total, 2)}</span>
          : <span style={{ color: '#d1d5db' }}>—</span>
      },
    },
  ]

  return (
    <>
      <style>{`
        .chitet-table .ant-table-thead > tr > th { background: #006666 !important; color: #fff !important; font-size: 11px !important; font-weight: 700 !important; padding: 6px 6px !important; text-align: center !important; border-right: 1px solid rgba(255,255,255,0.35) !important; }
        .chitet-table .ant-table-thead > tr > th::before { display: none !important; }
        .chitet-table .ant-table-tbody > tr > td { border-right: 1px solid #e2e8f0 !important; border-bottom: 1px solid #e8edf3 !important; }
        .chitet-table .ant-table-tbody > tr:nth-child(even) > td { background: #f8fffe !important; }
        .chitet-table .ant-table-tbody > tr:hover > td { background: #e0f7fa !important; }
        .chitet-table .ant-table-summary > tr > td { background: #e6f7f7 !important; font-weight: 700; border-right: 1px solid #b2dfdb !important; }
      `}</style>

      <div ref={filterRef} style={{ position: 'sticky', top: TAB_BAR_H, zIndex: 9, background: 'linear-gradient(135deg, #006666 0%, #008080 100%)', borderBottom: '3px solid #004d4d', boxShadow: '0 3px 12px rgba(0,80,80,0.25)' }}>
        <div style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#fff', whiteSpace: 'nowrap' }}>
            <FundOutlined style={{ marginRight: 6 }} />Tổng Hợp Chi Tiết
          </span>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.3)' }} />
          <RangePicker size="small" value={dateRange} onChange={setDateRange} format="DD/MM/YYYY" allowClear placeholder={['Từ ngày', 'Đến ngày']} />
          <Button size="small" type="primary" icon={<SearchOutlined />}
            style={{ background: '#1D4ED8', borderColor: '#1D4ED8', fontWeight: 600 }}
            onClick={() => fetchData()}>Truy xuất</Button>
          <Button size="small" icon={<ReloadOutlined />}
            onClick={() => { const def = [dayjs().startOf('month'), dayjs()]; setDateRange(def); fetchData(def) }}
            style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }} />
          <Input size="small" placeholder="Tìm mã SP / tên SP / số lô…" allowClear value={search}
            onChange={e => setSearch(e.target.value)} prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            style={{ width: 230 }} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
              <strong style={{ color: '#fff' }}>{displayData.length}</strong> sản phẩm/lô
            </span>
            <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>SL: <strong>{fmtSL(grandSL)}</strong></span>
            <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>Công: <strong>{fmtCong(grandCong, 2)}</strong></span>
          </div>
        </div>
      </div>

      <Table
        className="chitet-table"
        columns={columns}
        dataSource={displayData}
        rowKey="key"
        loading={loading}
        size="small"
        bordered
        rowHoverable={false}
        scroll={{ x: 2200 }}
        sticky={{ offsetHeader: TAB_BAR_H + filterH }}
        pagination={{ pageSize: 500, showSizeChanger: true, pageSizeOptions: ['100', '500', '1000'], showTotal: t => `Tổng ${t} sản phẩm`, size: 'small' }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={5} align="center">
              <b style={{ color: '#0d7377' }}>TỔNG CỘNG</b>
            </Table.Summary.Cell>
            {STAGES.flatMap((s, i) => [
              <Table.Summary.Cell key={`sl${i}`} index={5 + i * 3} align="right">
                <span style={{ fontWeight: 700, color: s.slColor }}>{fmtSL(displayData.reduce((sum, r) => sum + (r[s.key]?.sl || 0), 0))}</span>
              </Table.Summary.Cell>,
              <Table.Summary.Cell key={`cong${i}`} index={6 + i * 3} align="right">
                <span style={{ color: s.congColor, fontWeight: 600 }}>{fmtCong(displayData.reduce((sum, r) => sum + (r[s.key]?.cong || 0), 0), 2)}</span>
              </Table.Summary.Cell>,
              <Table.Summary.Cell key={`may${i}`} index={7 + i * 3} />,
            ])}
            <Table.Summary.Cell index={5 + STAGES.length * 3} align="right">
              <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{fmtSL(grandSL)}</span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={5 + STAGES.length * 3 + 1} align="right">
              <span style={{ fontWeight: 600, color: '#6d28d9' }}>{fmtCong(grandCong, 2)}</span>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </>
  )
}

// ─── Tab: Phân Tích Chi Tiết ─────────────────────────────────────────────────
function PhanTichChiTietTab() {
  const [raw, setRaw]             = useState([])
  const [loading, setLoading]     = useState(false)
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()])
  const [machineMap, setMachineMap] = useState({})
  const [subTab, setSubTab]       = useState('tonghop')

  const fetchData = useCallback(async (range = dateRange) => {
    setLoading(true)
    try {
      const params = {}
      if (range?.[0]) params.fromDate = range[0].format('YYYY-MM-DD')
      if (range?.[1]) params.toDate   = range[1].format('YYYY-MM-DD')
      const { data: res } = await api.get('/work-schedule-session/daily-report', { params })
      const done = res.filter(r => r.status !== 'PENDING' && r.status !== 'IN_PROGRESS')
      setRaw(done)
      const codes = [...new Set(done.map(r => r.maSp).filter(Boolean))]
      if (codes.length > 0) {
        api.get('/product-master/lookup-batch', { params: { codes } })
          .then(({ data: bm }) => setMachineMap(bm))
          .catch(() => {})
      }
    } catch { message.error('Không thể tải dữ liệu phân tích chi tiết') }
    finally { setLoading(false) }
  }, [dateRange])

  useEffect(() => { fetchData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const groupedData = useMemo(() => {
    const map = {}
    raw.forEach(r => {
      if (!r.ngay) return  // nhất quán với TongHopTab
      const key = `${r.maSp || ''}|${r.soLo || ''}`
      if (!map[key]) {
        map[key] = { key, maSp: r.maSp, tenTrinh: r.tenTrinh, soLo: r.soLo, coLo: r.coLo }
        STAGES.forEach(s => { map[key][s.key] = { sl: 0, cong: 0, soPhien: 0, _mm: new Set() } })
      }
      let cd = r.congDoan?.toUpperCase()
      if (!cd) return
      if (cd === 'PC') {
        const nhom = (r.nhomThucHien || r.toNhom)?.toUpperCase()
        if (nhom === 'PCPL1') cd = 'PCPL1'
        else if (nhom === 'PCPL2') cd = 'PCPL2'
        else if (nhom === 'PCPL3' || nhom === 'PL') cd = 'PL'
        else cd = 'PCPL1'
      }
      if (cd === 'PCPL3') cd = 'PL'
      if (!map[key][cd]) return
      map[key][cd].sl      += Number(r.sanLuong     || 0)
      map[key][cd].cong    += Number(r.congThucHien || 0)
      map[key][cd].soPhien += 1
      const mkey = (cd === 'PCPL1' || cd === 'PCPL2') ? 'mayMocPc'
        : cd === 'PL' ? 'mayMocPl' : cd === 'DG' ? 'mayMocDg'
        : cd === 'BBC1' ? 'mayMocBbc1' : null
      if (mkey && r.maSp && machineMap[r.maSp]?.[mkey]) map[key][cd]._mm.add(machineMap[r.maSp][mkey])
    })
    const rows = Object.values(map)
    rows.forEach(row => STAGES.forEach(s => {
      if (row[s.key]) {
        row[s.key].mayMoc = row[s.key]._mm.size > 0 ? [...row[s.key]._mm].join(', ') : null
        delete row[s.key]._mm
      }
    }))
    return rows
  }, [raw, machineMap])

  const grandSL   = groupedData.reduce((s, r) => s + STAGES.reduce((ss, st) => ss + (r[st.key]?.sl || 0), 0), 0)
  const grandCong = groupedData.reduce((s, r) => s + STAGES.reduce((ss, st) => ss + (r[st.key]?.cong || 0), 0), 0)

  const stageStats = useMemo(() =>
    STAGES.map(s => ({
      key:     s.key,
      label:   s.label,
      slColor: s.slColor,
      congColor: s.congColor,
      sl:      groupedData.reduce((sum, r) => sum + (r[s.key]?.sl   || 0), 0),
      cong:    groupedData.reduce((sum, r) => sum + (r[s.key]?.cong || 0), 0),
      soSp:    groupedData.filter(r => (r[s.key]?.sl || 0) > 0).length,
      mayMoc:  [...new Set(groupedData.flatMap(r => r[s.key]?.mayMoc ? r[s.key].mayMoc.split(', ') : []))].join(', '),
    })).filter(s => s.sl > 0),
  [groupedData])

  const top15 = useMemo(() =>
    [...groupedData]
      .map(r => ({ name: r.maSp || '?', lo: r.soLo || '', sl: STAGES.reduce((s, st) => s + (r[st.key]?.sl || 0), 0) }))
      .sort((a, b) => b.sl - a.sl).slice(0, 15).reverse(),
  [groupedData])

  // ── Theo Thời Gian ──
  const timeData = useMemo(() => {
    const map = {}
    raw.forEach(r => {
      if (!r.ngay) return
      const cd = resolveCongDoan(r)
      if (!map[r.ngay]) { map[r.ngay] = { date: r.ngay }; STAGES.forEach(s => { map[r.ngay][s.key] = 0 }) }
      if (map[r.ngay][cd] !== undefined) map[r.ngay][cd] += Number(r.sanLuong || 0)
    })
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  }, [raw])

  // ── Theo Loại SP ──
  const loaiSpData = useMemo(() => {
    const map = {}
    let totalSl = 0
    raw.forEach(r => {
      const loai = machineMap[r.maSp]?.loaiSanPham || '(Chưa phân loại)'
      const cd = resolveCongDoan(r)
      const sl = Number(r.sanLuong || 0)
      if (!map[loai]) { map[loai] = { loai, spSet: new Set(), sl: 0 }; STAGES.forEach(s => { map[loai][s.key] = 0 }) }
      map[loai].spSet.add(r.maSp)
      map[loai].sl += sl
      totalSl += sl
      if (map[loai][cd] !== undefined) map[loai][cd] += sl
    })
    return Object.values(map)
      .map(r => ({ ...r, soTp: r.spSet.size, tyLe: totalSl > 0 ? r.sl / totalSl * 100 : 0 }))
      .sort((a, b) => b.sl - a.sl)
  }, [raw, machineMap])

  // ── Phân Tích Công thực tế ──
  const congByLoai = useMemo(() => {
    const map = {}
    raw.forEach(r => {
      const loai = machineMap[r.maSp]?.loaiSanPham || '(Chưa phân loại)'
      const cd = resolveCongDoan(r)
      const cong = Number(r.congThucHien || 0)
      if (!map[loai]) map[loai] = { loai, spSet: new Set(), congPcpl1: 0, congPcpl2: 0, congPl: 0, congDg: 0, congBbc1: 0 }
      map[loai].spSet.add(r.maSp)
      if (cd === 'PCPL1')      map[loai].congPcpl1 += cong
      else if (cd === 'PCPL2') map[loai].congPcpl2 += cong
      else if (cd === 'PL')    map[loai].congPl    += cong
      else if (cd === 'DG')    map[loai].congDg    += cong
      else if (cd === 'BBC1')  map[loai].congBbc1  += cong
    })
    return Object.values(map)
      .map(r => ({ ...r, soTp: r.spSet.size, tongCong: r.congPcpl1 + r.congPcpl2 + r.congPl + r.congDg + r.congBbc1 }))
      .sort((a, b) => b.tongCong - a.tongCong)
  }, [raw, machineMap])

  const congTotals = useMemo(() =>
    congByLoai.reduce((t, r) => ({
      cp1: t.cp1 + r.congPcpl1, cp2: t.cp2 + r.congPcpl2,
      cpl: t.cpl + r.congPl,   cdg: t.cdg + r.congDg,
      cb1: t.cb1 + r.congBbc1, tt:  t.tt  + r.tongCong,
    }), { cp1: 0, cp2: 0, cpl: 0, cdg: 0, cb1: 0, tt: 0 }),
  [congByLoai])

  // ── Theo Máy Móc ──
  const machineData = useMemo(() => {
    const map = {}
    raw.forEach(r => {
      const cd = resolveCongDoan(r)
      const mkey = (cd === 'PCPL1' || cd === 'PCPL2') ? 'mayMocPc'
        : cd === 'PL' ? 'mayMocPl' : cd === 'DG' ? 'mayMocDg'
        : cd === 'BBC1' ? 'mayMocBbc1' : null
      if (!mkey || !r.maSp) return
      const machine = machineMap[r.maSp]?.[mkey]
      if (!machine) return
      const key = `${cd}__${machine}`
      if (!map[key]) map[key] = { machine, stage: cd, soPhien: 0, totalSl: 0, totalCong: 0, spSet: new Set() }
      map[key].soPhien++
      map[key].totalSl   += Number(r.sanLuong || 0)
      map[key].totalCong += Number(r.congThucHien || 0)
      map[key].spSet.add(r.maSp)
    })
    return Object.values(map).map(r => ({ ...r, soTp: r.spSet.size })).sort((a, b) => b.totalSl - a.totalSl)
  }, [raw, machineMap])

  const TYPE_COLORS = ['#1677ff','#52c41a','#fa8c16','#722ed1','#eb2f96','#13c2c2','#faad14','#f5222d','#a0d911','#2f54eb']
  const colorOf = loai => TYPE_COLORS[loaiSpData.findIndex(r => r.loai === loai) % TYPE_COLORS.length] || '#888'
  const fmtC1 = v => (v || 0).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  const subTabItems = [
    {
      key: 'tonghop',
      label: 'Tổng Hợp',
      children: (
        <div style={{ padding: '12px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ background: '#f8f9fa', borderRadius: 6, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 12, color: '#333', fontSize: 13 }}>Sản lượng theo Công đoạn</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stageStats} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fontWeight: 700 }} />
                  <YAxis tickFormatter={v => v.toLocaleString('vi-VN')} tick={{ fontSize: 11 }} />
                  <RcTooltip formatter={v => [v.toLocaleString('vi-VN'), 'Sản lượng']} />
                  <Bar dataKey="sl" radius={[4, 4, 0, 0]}>
                    {stageStats.map(s => <Cell key={s.key} fill={s.slColor} />)}
                    <LabelList dataKey="sl" position="top" formatter={v => v > 0 ? v.toLocaleString('vi-VN') : ''} style={{ fontSize: 10, fill: '#444' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: '#f8f9fa', borderRadius: 6, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 12, color: '#333', fontSize: 13 }}>Tổng Công theo Công đoạn</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stageStats} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fontWeight: 700 }} />
                  <YAxis tickFormatter={v => v.toLocaleString('vi-VN')} tick={{ fontSize: 11 }} />
                  <RcTooltip formatter={v => [fmtC1(v), 'Tổng Công']} />
                  <Bar dataKey="cong" radius={[4, 4, 0, 0]}>
                    {stageStats.map(s => <Cell key={s.key} fill={s.congColor} />)}
                    <LabelList dataKey="cong" position="top" formatter={v => v > 0 ? fmtC1(v) : ''} style={{ fontSize: 10, fill: '#444' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <Table size="small" dataSource={stageStats} pagination={false}
            columns={[
              { title: 'Công đoạn', dataIndex: 'label', width: 100,
                render: (v, r) => <Tag color={CONG_DOAN_COLOR[r.key] || 'default'} style={{ fontWeight: 700 }}>{v}</Tag> },
              { title: 'Số SP/lô', dataIndex: 'soSp', align: 'right', width: 90,
                render: v => <span style={{ color: '#374151' }}>{v}</span> },
              { title: 'Tổng SL', dataIndex: 'sl', align: 'right',
                render: (v, r) => <span style={{ fontWeight: 700, color: r.slColor }}>{fmtSL(v)}</span> },
              { title: '% SL', dataIndex: 'sl', key: 'pct', align: 'right', width: 80,
                render: v => `${grandSL > 0 ? ((v / grandSL) * 100).toFixed(1) : 0}%` },
              { title: 'Tổng Công', dataIndex: 'cong', align: 'right', width: 110,
                render: (v, r) => <span style={{ color: r.congColor, fontWeight: 600 }}>{fmtCong(v, 2)}</span> },
              { title: 'SL/Công', align: 'right', width: 90,
                render: (_, r) => r.cong > 0
                  ? <span style={{ color: '#0e7490', fontWeight: 600 }}>{(r.sl / r.cong).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}</span>
                  : <span style={{ color: '#bbb' }}>—</span> },
              { title: 'Máy Móc', dataIndex: 'mayMoc', ellipsis: true,
                render: v => v ? <Tooltip title={v}><span style={{ fontSize: 12, color: '#555' }}>{v}</span></Tooltip>
                  : <span style={{ color: '#bbb' }}>—</span> },
            ]}
            summary={() => (
              <Table.Summary.Row style={{ background: '#f0fdf4', fontWeight: 700 }}>
                <Table.Summary.Cell index={0}>TỔNG</Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">{groupedData.length}</Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right"><span style={{ color: '#1e5fa3' }}>{fmtSL(grandSL)}</span></Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">100%</Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right"><span style={{ color: '#6d28d9' }}>{fmtCong(grandCong, 2)}</span></Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  {grandCong > 0 ? <span style={{ color: '#0e7490' }}>{(grandSL / grandCong).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}</span> : '—'}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} />
              </Table.Summary.Row>
            )}
          />
        </div>
      ),
    },
    {
      key: 'thoigian',
      label: 'Theo Thời Gian',
      children: (
        <div style={{ padding: '12px 0' }}>
          <div style={{ background: '#f8f9fa', borderRadius: 6, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, color: '#333', fontSize: 13 }}>Sản lượng theo ngày (phân theo công đoạn)</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={timeData} margin={{ top: 10, right: 20, left: 10, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0}
                  tickFormatter={v => dayjs(v).format('DD/MM')} />
                <YAxis tickFormatter={v => v.toLocaleString('vi-VN')} tick={{ fontSize: 11 }} />
                <RcTooltip formatter={(v, name) => [v.toLocaleString('vi-VN'), name]} labelFormatter={v => dayjs(v).format('DD/MM/YYYY')} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {STAGES.map(s => <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.slColor} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Table size="small" dataSource={timeData} rowKey="date"
            pagination={{ pageSize: 14, showSizeChanger: false, showTotal: t => `${t} ngày` }}
            columns={[
              { title: 'Ngày', dataIndex: 'date', width: 110, fixed: 'left',
                render: v => <span style={{ fontWeight: 700, color: '#1677ff' }}>{dayjs(v).format('DD/MM/YYYY')}</span> },
              ...STAGES.map(s => ({
                title: s.label, dataIndex: s.key, align: 'right', width: 90,
                render: v => v > 0 ? <span style={{ color: s.slColor, fontWeight: 600 }}>{fmtSL(v)}</span>
                  : <span style={{ color: '#d9d9d9' }}>—</span>,
              })),
              { title: 'Tổng SL', align: 'right', width: 110,
                render: (_, r) => {
                  const t = STAGES.reduce((s, st) => s + (r[st.key] || 0), 0)
                  return <strong style={{ color: '#389e0d' }}>{fmtSL(t)}</strong>
                }},
            ]}
          />
        </div>
      ),
    },
    {
      key: 'loaisp',
      label: 'Theo Loại SP',
      children: (
        <div style={{ padding: '12px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ background: '#f8f9fa', borderRadius: 6, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#333', fontSize: 13 }}>SL theo Loại SP</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={loaiSpData} margin={{ top: 5, right: 20, left: 10, bottom: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="loai" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tickFormatter={v => v.toLocaleString('vi-VN')} tick={{ fontSize: 11 }} />
                  <RcTooltip formatter={v => [v.toLocaleString('vi-VN'), 'SL']} />
                  <Bar dataKey="sl" radius={[4, 4, 0, 0]}>
                    {loaiSpData.map(r => <Cell key={r.loai} fill={colorOf(r.loai)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: '#f8f9fa', borderRadius: 6, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 12, color: '#333', fontSize: 13 }}>Tỷ lệ % sản lượng</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {loaiSpData.map(r => (
                  <div key={r.loai} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 120, fontSize: 12, color: '#374151', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.loai}>{r.loai}</div>
                    <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 4, height: 20, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.max(2, r.tyLe)}%`, height: '100%', background: colorOf(r.loai), borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
                        <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.tyLe.toFixed(1)}%</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: '#888', minWidth: 70, textAlign: 'right' }}>{fmtSL(r.sl)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Table size="small" dataSource={loaiSpData} rowKey="loai" pagination={false}
            columns={[
              { title: 'Loại Sản Phẩm', dataIndex: 'loai', width: 160,
                render: v => <Tag color={colorOf(v)} style={{ fontWeight: 600, fontSize: 12 }}>{v}</Tag> },
              { title: 'Số TP', dataIndex: 'soTp', align: 'center', width: 70,
                render: v => <span style={{ fontWeight: 700, color: '#374151' }}>{v}</span> },
              { title: 'Tổng SL', dataIndex: 'sl', align: 'right', width: 110,
                sorter: (a, b) => a.sl - b.sl,
                render: (v, r) => <span style={{ fontWeight: 700, color: colorOf(r.loai) }}>{fmtSL(v)}</span> },
              { title: 'Tỷ Lệ', dataIndex: 'tyLe', align: 'right', width: 75,
                render: v => `${v.toFixed(1)}%` },
              ...STAGES.map(s => ({
                title: s.label, dataIndex: s.key, align: 'right', width: 85,
                render: v => v > 0 ? <span style={{ color: s.slColor }}>{fmtSL(v)}</span>
                  : <span style={{ color: '#d9d9d9' }}>—</span>,
              })),
            ]}
            summary={() => {
              const totalSl = loaiSpData.reduce((s, r) => s + r.sl, 0)
              return (
                <Table.Summary.Row style={{ fontWeight: 700, background: '#f0f9ff' }}>
                  <Table.Summary.Cell index={0}>TỔNG</Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="center">{loaiSpData.reduce((s, r) => s + r.soTp, 0)}</Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right"><span style={{ color: '#1e5fa3' }}>{fmtSL(totalSl)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">100%</Table.Summary.Cell>
                  {STAGES.map((s, i) => (
                    <Table.Summary.Cell key={s.key} index={4 + i} align="right">
                      <span style={{ color: s.slColor }}>{fmtSL(loaiSpData.reduce((sum, r) => sum + (r[s.key] || 0), 0))}</span>
                    </Table.Summary.Cell>
                  ))}
                </Table.Summary.Row>
              )
            }}
          />
        </div>
      ),
    },
    {
      key: 'cong',
      label: 'Phân Tích Công',
      children: (
        <div style={{ padding: '12px 0' }}>
          <div style={{ marginBottom: 10, padding: '8px 12px', background: '#eff6ff', borderRadius: 6, border: '1px solid #bfdbfe', fontSize: 12, color: '#1e40af' }}>
            Công thực tế được tổng hợp từ dữ liệu đã nhập trong kỳ — không phải ước tính từ năng suất.
          </div>
          <Table size="small" dataSource={congByLoai} rowKey="loai" pagination={false}
            columns={[
              { title: 'LOẠI SẢN PHẨM', dataIndex: 'loai', width: 160,
                render: v => <Tag color={colorOf(v)} style={{ fontWeight: 600, fontSize: 12 }}>{v}</Tag> },
              { title: 'SỐ TP', dataIndex: 'soTp', align: 'center', width: 70,
                render: v => <span style={{ fontWeight: 700, color: '#374151' }}>{v}</span> },
              { title: 'CÔNG PC (PCPL1)', dataIndex: 'congPcpl1', align: 'right', width: 135,
                sorter: (a, b) => a.congPcpl1 - b.congPcpl1,
                render: v => v > 0 ? <span style={{ color: '#1d4ed8', fontWeight: 700 }}>{fmtC1(v)}</span>
                  : <span style={{ color: '#d9d9d9' }}>0</span> },
              { title: 'CÔNG PC (PCPL2)', dataIndex: 'congPcpl2', align: 'right', width: 135,
                sorter: (a, b) => a.congPcpl2 - b.congPcpl2,
                render: v => v > 0 ? <span style={{ color: '#0369a1', fontWeight: 700 }}>{fmtC1(v)}</span>
                  : <span style={{ color: '#d9d9d9' }}>0</span> },
              { title: 'CÔNG PL', dataIndex: 'congPl', align: 'right', width: 100,
                sorter: (a, b) => a.congPl - b.congPl,
                render: v => v > 0 ? <span style={{ color: '#0e7490', fontWeight: 700 }}>{fmtC1(v)}</span>
                  : <span style={{ color: '#d9d9d9' }}>0</span> },
              { title: 'CÔNG ĐG', dataIndex: 'congDg', align: 'right', width: 100,
                sorter: (a, b) => a.congDg - b.congDg,
                render: v => v > 0 ? <span style={{ color: '#7c3aed', fontWeight: 700 }}>{fmtC1(v)}</span>
                  : <span style={{ color: '#d9d9d9' }}>0</span> },
              { title: 'CÔNG BBC1', dataIndex: 'congBbc1', align: 'right', width: 105,
                sorter: (a, b) => a.congBbc1 - b.congBbc1,
                render: v => v > 0 ? <span style={{ color: '#991b1b', fontWeight: 700 }}>{fmtC1(v)}</span>
                  : <span style={{ color: '#d9d9d9' }}>0</span> },
              { title: 'TỔNG CÔNG', dataIndex: 'tongCong', align: 'right', width: 115,
                sorter: (a, b) => a.tongCong - b.tongCong,
                render: v => <span style={{ fontWeight: 800, color: '#111827' }}>{fmtC1(v)}</span> },
            ]}
            summary={() => (
              <Table.Summary.Row style={{ fontWeight: 700, background: '#f0f5ff' }}>
                <Table.Summary.Cell index={0} colSpan={2}>Tổng ({raw.length} phiên)</Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right"><span style={{ color: '#1d4ed8' }}>{fmtC1(congTotals.cp1)}</span></Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right"><span style={{ color: '#0369a1' }}>{fmtC1(congTotals.cp2)}</span></Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right"><span style={{ color: '#0e7490' }}>{fmtC1(congTotals.cpl)}</span></Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right"><span style={{ color: '#7c3aed' }}>{fmtC1(congTotals.cdg)}</span></Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right"><span style={{ color: '#991b1b' }}>{fmtC1(congTotals.cb1)}</span></Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right"><span style={{ color: '#111827' }}>{fmtC1(congTotals.tt)}</span></Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </div>
      ),
    },
    {
      key: 'top15',
      label: 'Top 15 SP',
      children: (
        <div style={{ padding: '12px 0' }}>
          <div style={{ fontWeight: 600, marginBottom: 12, color: '#333', fontSize: 13 }}>Top {top15.length} sản phẩm / lô theo sản lượng</div>
          <ResponsiveContainer width="100%" height={Math.max(300, top15.length * 30)}>
            <BarChart data={top15} layout="vertical" margin={{ top: 5, right: 80, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={v => v.toLocaleString('vi-VN')} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <RcTooltip formatter={(v, _, p) => [v.toLocaleString('vi-VN'), `${p.payload?.name} — Lô ${p.payload?.lo || '—'}`]} />
              <Bar dataKey="sl" fill="#1D4ED8" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="sl" position="right" formatter={v => v.toLocaleString('vi-VN')} style={{ fontSize: 11, fill: '#444' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ),
    },
    {
      key: 'maymoc',
      label: 'Theo Máy Móc',
      children: (
        <div style={{ padding: '12px 0' }}>
          <Table size="small" dataSource={machineData} rowKey={r => `${r.stage}__${r.machine}`}
            pagination={{ pageSize: 20, showSizeChanger: false, showTotal: t => `${t} máy` }}
            columns={[
              { title: 'Máy Móc', dataIndex: 'machine', width: 200,
                render: v => <span style={{ fontWeight: 600, color: '#1e40af' }}>{v}</span> },
              { title: 'Công đoạn', dataIndex: 'stage', width: 100, align: 'center',
                render: v => <Tag color={CONG_DOAN_COLOR[v] || 'default'} style={{ fontWeight: 700, marginRight: 0 }}>{v}</Tag> },
              { title: 'Số SP', dataIndex: 'soTp', align: 'center', width: 70,
                render: v => <span style={{ fontWeight: 700 }}>{v}</span> },
              { title: 'Số Phiên', dataIndex: 'soPhien', align: 'center', width: 80,
                render: v => <span style={{ color: '#0369a1' }}>{v}</span> },
              { title: 'Tổng SL', dataIndex: 'totalSl', align: 'right', width: 110,
                sorter: (a, b) => a.totalSl - b.totalSl,
                render: v => <span style={{ fontWeight: 700, color: '#1e5fa3' }}>{fmtSL(v)}</span> },
              { title: 'Tổng Công', dataIndex: 'totalCong', align: 'right', width: 110,
                sorter: (a, b) => a.totalCong - b.totalCong,
                render: v => <span style={{ fontWeight: 600, color: '#6d28d9' }}>{fmtC1(v)}</span> },
              { title: 'SL/Công', align: 'right', width: 90,
                render: (_, r) => r.totalCong > 0
                  ? <span style={{ color: '#0e7490', fontWeight: 600 }}>{(r.totalSl / r.totalCong).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}</span>
                  : <span style={{ color: '#bbb' }}>—</span> },
            ]}
          />
        </div>
      ),
    },
  ]

  return (
    <>
      <div style={{ position: 'sticky', top: TAB_BAR_H, zIndex: 9, background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)', borderBottom: '3px solid #1e3a5f', boxShadow: '0 3px 12px rgba(30,58,95,0.3)', padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: '#fff', whiteSpace: 'nowrap' }}>
          <BarChartOutlined style={{ marginRight: 6 }} />Phân Tích Chi Tiết
        </span>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.3)' }} />
        <RangePicker size="small" value={dateRange} onChange={setDateRange} format="DD/MM/YYYY" allowClear placeholder={['Từ ngày', 'Đến ngày']} />
        <Button size="small" type="primary" icon={<SearchOutlined />}
          style={{ background: '#0891b2', borderColor: '#0891b2', fontWeight: 600 }}
          loading={loading}
          onClick={() => fetchData()}>Truy xuất</Button>
        <Button size="small" icon={<ReloadOutlined />}
          onClick={() => { const def = [dayjs().startOf('month'), dayjs()]; setDateRange(def); fetchData(def) }}
          style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: '#bfdbfe', fontSize: 12 }}>Phiên: <strong style={{ color: '#fff' }}>{raw.length}</strong></span>
          <span style={{ color: '#bfdbfe', fontSize: 12 }}>SL: <strong style={{ color: '#fff' }}>{fmtSL(grandSL)}</strong></span>
          <span style={{ color: '#bfdbfe', fontSize: 12 }}>Công: <strong style={{ color: '#fff' }}>{fmtCong(grandCong, 1)}</strong></span>
        </div>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Số sản phẩm / lô', value: groupedData.length,    color: '#1d4ed8' },
            { label: 'Tổng sản lượng',   value: fmtSL(grandSL),        color: '#1e5fa3' },
            { label: 'Tổng công',        value: fmtCong(grandCong, 1),  color: '#6d28d9' },
            { label: 'SL / Công TB', value: grandCong > 0 ? (grandSL / grandCong).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : '—', color: '#0e7490' },
          ].map(c => (
            <div key={c.label} style={{ background: '#f8f9fa', borderLeft: `4px solid ${c.color}`, padding: '10px 14px', borderRadius: 4 }}>
              <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
        <Tabs activeKey={subTab} onChange={setSubTab} size="small" items={subTabItems}
          tabBarStyle={{ borderBottom: '2px solid #e2e8f0', marginBottom: 0 }} />
      </div>
    </>
  )
}

// ─── Tab 3: Báo cáo tổng hợp ngày ───────────────────────────────────────────

function BaoCaoTab() {
  const [raw, setRaw]       = useState([])
  const [loading, setLoading] = useState(false)
  const [refDate, setRefDate] = useState(dayjs())
  const [dateRange, setDateRange] = useState([
    dayjs().startOf('month'), dayjs().endOf('month')
  ])

  const fetchData = useCallback(async (range = dateRange, { silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const params = {}
      if (range?.[0]) params.fromDate = range[0].format('YYYY-MM-DD')
      if (range?.[1]) params.toDate   = range[1].format('YYYY-MM-DD')
      const { data: res } = await api.get('/work-schedule-session/daily-report', { params })
      setRaw(Array.isArray(res) ? res : [])
    } catch {
      if (!silent) message.error('Không thể tải dữ liệu báo cáo')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [dateRange])

  useEffect(() => { fetchData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh mỗi 60 giây
  useEffect(() => {
    const t = setInterval(() => fetchData(undefined, { silent: true }), 60_000)
    return () => clearInterval(t)
  }, [fetchData])

  // Lắng nghe event silent-refresh từ các module khác
  useEffect(() => {
    const handler = () => fetchData(undefined, { silent: true })
    window.addEventListener('app:silent-refresh', handler)
    return () => window.removeEventListener('app:silent-refresh', handler)
  }, [fetchData])

  return (
    <div>
      {/* Filter bar */}
      <div style={{
        position: 'sticky', top: TAB_BAR_H, zIndex: 9,
        background: '#f0fdf4', borderBottom: '2px solid #86efac',
        padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: '#15803d', whiteSpace: 'nowrap' }}>
          <RiseOutlined style={{ marginRight: 6 }} />Báo cáo tổng hợp ngày
        </span>
        <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600, whiteSpace: 'nowrap' }}>Xem ngày:</span>
        <DatePicker
          size="small" value={refDate} format="DD/MM/YYYY" allowClear={false}
          onChange={d => {
            if (!d) return
            setRefDate(d)
            const newRange = [d.startOf('month'), d.endOf('month')]
            setDateRange(newRange)
            fetchData(newRange)
          }}
        />
        <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>Khoảng tải:</span>
        <DatePicker.RangePicker
          size="small" value={dateRange} onChange={setDateRange}
          format="DD/MM/YYYY" allowClear placeholder={['Từ ngày', 'Đến ngày']}
        />
        <Button size="small" type="primary" icon={<SearchOutlined />}
          loading={loading}
          style={{ background: '#16a34a', borderColor: '#16a34a' }}
          onClick={() => fetchData()}
        >Truy xuất</Button>
        <Button size="small" icon={<ReloadOutlined />}
          onClick={() => {
            const today = dayjs()
            const def = [today.startOf('month'), today.endOf('month')]
            setRefDate(today)
            setDateRange(def)
            fetchData(def)
          }}
        />
      </div>

      <div style={{ padding: '12px 16px' }}>
        {loading
          ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Đang tải...</div>
          : <DailySummaryPanel data={raw} refDate={refDate} />
        }
      </div>
    </div>
  )
}

// ─── Tab 4: Thống kê sản xuất ────────────────────────────────────────────────

const TO_CONFIG_TK = [
  { key: 'BBC1',  label: 'BBC1',  mau: '#6d28d9' },
  { key: 'PCPL1', label: 'PCPL1', mau: '#1d4ed8' },
  { key: 'PCPL2', label: 'PCPL2', mau: '#0369a1' },
  { key: 'PL',    label: 'PL',    mau: '#0e7490' },
  { key: 'DG',    label: 'ĐG',    mau: '#b45309' },
]
const MT_DAT_TK = 95

const NHOM_COLOR_TK = {
  'Ngôi sao':           '#10b981',
  'Chắc chắn':          '#0ea5e9',
  'Nhanh nhưng lỗi':    '#f59e0b',
  'Ưu tiên cải thiện':  '#ef4444',
}
const NHOM_TU_VAN_TK = {
  'Ngôi sao':           'Giữ chuẩn — nhân rộng cách làm cho các tổ khác',
  'Chắc chắn':          'Chất lượng ổn — tập trung tăng năng suất',
  'Nhanh nhưng lỗi':    'Siết kiểm soát chất lượng tại nguồn (kiểm tra đầu chuyền, hướng dẫn công việc)',
  'Ưu tiên cải thiện':  'Phân tích nguyên nhân lỗi theo Pareto trước, sau đó mới tối ưu năng suất',
}
const NHOM_MO_TA_TK = {
  'Ngôi sao':           'giữ chuẩn, nhân rộng cách làm',
  'Chắc chắn':          'chắc nhưng chậm, tăng năng suất',
  'Nhanh nhưng lỗi':    'siết kiểm soát chất lượng',
  'Ưu tiên cải thiện':  'cả chất lượng lẫn năng suất',
}

function ThongKeSanXuatTab() {
  const [raw, setRaw]         = useState([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()])

  const fetchData = useCallback(async (range = dateRange, { silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const params = {}
      if (range?.[0]) params.fromDate = range[0].format('YYYY-MM-DD')
      if (range?.[1]) params.toDate   = range[1].format('YYYY-MM-DD')
      const { data: res } = await api.get('/work-schedule-session/daily-report', { params })
      setRaw(Array.isArray(res) ? res : [])
    } catch {
      if (!silent) message.error('Không thể tải dữ liệu thống kê')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [dateRange])

  useEffect(() => { fetchData() }, []) // eslint-disable-line

  // ── Tính FPY + hiệu quả per tổ ───────────────────────────────────────────
  const toStats = useMemo(() => {
    const map = {}
    TO_CONFIG_TK.forEach(t => { map[t.key] = { ...t, tongLo: 0, dat: 0, khongDat: 0, chuaNhap: 0, tongSl: 0, tongCong: 0 } })
    raw.forEach(r => {
      let key = r.congDoan?.toUpperCase()
      if (key === 'PCPL3' || key === 'CC') key = 'PL'
      if (!map[key]) return
      const isDone = r.status === 'SAVED' || r.status === 'PENDING'
      const hasSoLo = !!(r.soLo || '').trim()
      const sl   = Number(r.sanLuong   || 0)
      const cong = Number(r.congThucHien || 0)
      const ns   = r.nangSuat != null ? Number(r.nangSuat) : (cong > 0 && sl > 0 ? sl / cong : null)
      const nsTb = r.nangSuatTrungBinh != null ? Number(r.nangSuatTrungBinh) : null
      if (isDone && hasSoLo) {
        map[key].tongLo++
        if (ns != null && nsTb != null) { if (ns >= nsTb) map[key].dat++; else map[key].khongDat++ }
        else map[key].chuaNhap++
        map[key].tongSl   += sl
        map[key].tongCong += cong
      } else {
        map[key].chuaNhap++
      }
    })
    return Object.values(map).map(t => {
      const base    = t.dat + t.khongDat
      const tyLeDat = base > 0 ? +(t.dat / base * 100).toFixed(1) : null
      const ns      = t.tongCong > 0 ? +(t.tongSl / t.tongCong).toFixed(1) : null
      return { ...t, tyLeDat, nangSuat: ns, datMucTieu: tyLeDat != null && tyLeDat >= MT_DAT_TK }
    }).sort((a, b) => (b.tyLeDat ?? -1) - (a.tyLeDat ?? -1))
  }, [raw])

  const kpi = useMemo(() => {
    const dat      = toStats.reduce((s, t) => s + t.dat, 0)
    const khongDat = toStats.reduce((s, t) => s + t.khongDat, 0)
    const base     = dat + khongDat
    const tongSl   = toStats.reduce((s, t) => s + t.tongSl, 0)
    const tongCong = toStats.reduce((s, t) => s + t.tongCong, 0)
    return {
      tongLo:    toStats.reduce((s, t) => s + t.tongLo, 0),
      dat, khongDat,
      chuaNhap:  toStats.reduce((s, t) => s + t.chuaNhap, 0),
      tyLeDat:   base > 0 ? +(dat / base * 100).toFixed(1) : null,
      ns:        tongCong > 0 ? +(tongSl / tongCong).toFixed(1) : null,
      tongSl, tongCong,
    }
  }, [toStats])

  const maxNs     = Math.max(...toStats.map(t => t.nangSuat ?? 0), 0.001)
  const maxTongSl = Math.max(...toStats.map(t => t.tongSl ?? 0), 1)
  const toWithChq = useMemo(() => toStats.map(t => {
    const nsCh = t.nangSuat != null ? +(t.nangSuat / maxNs * 100).toFixed(1) : 0
    const chq  = t.tyLeDat  != null ? +((t.tyLeDat * nsCh) / 100).toFixed(1) : null
    const onDinh = t.tongLo > 0 ? +((t.dat + t.khongDat) / t.tongLo * 100).toFixed(1) : 0
    const slCh   = +(t.tongSl / maxTongSl * 100).toFixed(1)
    return { ...t, nsChuanHoa: nsCh, chq, onDinh, slChuanHoa: slCh }
  }), [toStats, maxNs, maxTongSl])

  // ── FPY trend theo ngày ───────────────────────────────────────────────────
  const trendData = useMemo(() => {
    const byDate = {}
    raw.forEach(r => {
      if (!r.ngay) return
      if (!(r.status === 'SAVED' || r.status === 'PENDING') || !(r.soLo || '').trim()) return
      if (!byDate[r.ngay]) byDate[r.ngay] = { dat: 0, khongDat: 0 }
      const sl = Number(r.sanLuong || 0), cong = Number(r.congThucHien || 0)
      const ns = r.nangSuat != null ? Number(r.nangSuat) : (cong > 0 && sl > 0 ? sl / cong : null)
      const nsTb = r.nangSuatTrungBinh != null ? Number(r.nangSuatTrungBinh) : null
      if (ns != null && nsTb != null) { if (ns >= nsTb) byDate[r.ngay].dat++; else byDate[r.ngay].khongDat++ }
    })
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([ngay, v]) => {
      const base = v.dat + v.khongDat
      return { ngay: ngay.slice(5).replace('-', '/'), fpy: base > 0 ? +(v.dat / base * 100).toFixed(1) : null }
    }).filter(d => d.fpy != null)
  }, [raw])

  // ── Pareto: sản phẩm / trình lỗi nhiều nhất ──────────────────────────────
  const paretoData = useMemo(() => {
    const map = {}
    raw.forEach(r => {
      if (!(r.status === 'SAVED' || r.status === 'PENDING') || !(r.soLo || '').trim()) return
      const sl = Number(r.sanLuong || 0), cong = Number(r.congThucHien || 0)
      const ns = r.nangSuat != null ? Number(r.nangSuat) : (cong > 0 && sl > 0 ? sl / cong : null)
      const nsTb = r.nangSuatTrungBinh != null ? Number(r.nangSuatTrungBinh) : null
      if (ns != null && nsTb != null && ns < nsTb) {
        const key = (r.tenTrinh || r.maSp || 'Không rõ').slice(0, 18)
        map[key] = (map[key] || 0) + 1
      }
    })
    const sorted = Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 7)
    const total = sorted.reduce((s, [, v]) => s + v, 0)
    let cum = 0
    return sorted.map(([name, count]) => { cum += count / total * 100; return { name, count, cum: +cum.toFixed(1) } })
  }, [raw])

  // ── Dữ liệu bubble matrix ─────────────────────────────────────────────────
  const bubbleData = useMemo(() => toWithChq.filter(t => t.nangSuat != null && t.tyLeDat != null).map(t => ({
    label: t.label, x: t.nangSuat, y: t.tyLeDat,
    z: Math.max(t.tongSl / maxTongSl * 100, 8),
    mau: t.mau, nhom: nhomOf(t),
  })), [toWithChq, maxTongSl])

  // ── Dữ liệu radar 4 chiều ────────────────────────────────────────────────
  const radarData = useMemo(() => [
    { subject: 'Chất lượng', ...Object.fromEntries(TO_CONFIG_TK.map(t => { const f = toWithChq.find(x => x.key === t.key); return [t.key, f?.tyLeDat ?? 0] })) },
    { subject: 'Năng suất',  ...Object.fromEntries(TO_CONFIG_TK.map(t => { const f = toWithChq.find(x => x.key === t.key); return [t.key, f?.nsChuanHoa ?? 0] })) },
    { subject: 'Sản lượng',  ...Object.fromEntries(TO_CONFIG_TK.map(t => { const f = toWithChq.find(x => x.key === t.key); return [t.key, f?.slChuanHoa ?? 0] })) },
    { subject: 'Ổn định',    ...Object.fromEntries(TO_CONFIG_TK.map(t => { const f = toWithChq.find(x => x.key === t.key); return [t.key, f?.onDinh ?? 0] })) },
  ], [toWithChq])

  function nhomOf(t) {
    if (t.tyLeDat == null) return null
    if (t.tyLeDat >= MT_DAT_TK && t.nsChuanHoa >= 50) return 'Ngôi sao'
    if (t.tyLeDat >= MT_DAT_TK)                        return 'Chắc chắn'
    if (t.nsChuanHoa >= 50)                            return 'Nhanh nhưng lỗi'
    return 'Ưu tiên cải thiện'
  }

  const best     = toStats.find(t => t.tyLeDat != null)
  const worst    = [...toStats].reverse().find(t => t.tyLeDat != null)
  const bestChq  = toWithChq.reduce((b, t) => t.chq != null && (b == null || t.chq > b.chq) ? t : b, null)
  const chqTb    = (() => { const v = toWithChq.filter(t => t.chq != null); return v.length ? +(v.reduce((s, t) => s + t.chq, 0) / v.length).toFixed(1) : null })()
  const chqSorted = [...toWithChq].sort((a, b) => (b.chq ?? -1) - (a.chq ?? -1))
  const kyText   = `${dateRange[0]?.format('DD/MM')} – ${dateRange[1]?.format('DD/MM/YYYY')}`

  // ── Shared sub-components ─────────────────────────────────────────────────
  const TD = ({ children, align = 'right', style = {} }) => (
    <td style={{ padding: '8px 12px', textAlign: align, fontSize: 12, borderBottom: '1px solid #f1f5f9', ...style }}>{children}</td>
  )
  const TH = ({ children, align = 'left' }) => (
    <th style={{ padding: '8px 12px', fontWeight: 700, fontSize: 11, color: '#64748b', textAlign: align, borderBottom: '2px solid #e2e8f0', background: '#f8fafc', whiteSpace: 'nowrap' }}>{children}</th>
  )

  const KpiCard = ({ label, value, unit, meta, accent, featured }) => (
    <div style={{ background: featured ? accent : '#fff', border: `1.5px solid ${accent}${featured ? 'ff' : '30'}`, borderLeft: featured ? 'none' : `4px solid ${accent}`, borderRadius: 12, padding: '14px 16px', boxShadow: featured ? `0 4px 14px ${accent}44` : 'none' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: featured ? '#fff' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: featured ? '#fff' : '#0f172a', lineHeight: 1 }}>
        {value}
        {unit && <span style={{ fontSize: 13, fontWeight: 400, color: featured ? '#ffffffaa' : '#94a3b8', marginLeft: 4 }}>{unit}</span>}
      </div>
      {meta && <div style={{ fontSize: 11, color: featured ? '#ffffffcc' : '#94a3b8', marginTop: 4 }}>{meta}</div>}
    </div>
  )

  const SectionHeader = ({ icon, title, sub, right }) => (
    <div style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, boxShadow: '0 4px 16px #0f766e44' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '3px 10px', fontSize: 13, fontWeight: 700 }}>{icon}</span>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>{title}</span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', paddingLeft: 2 }}>{sub}</div>
      </div>
      {right && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div>}
    </div>
  )

  const Panel = ({ title, sub, right, children, noPad }) => (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{title}</div>
          {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{sub}</div>}
        </div>
        {right && <div style={{ fontSize: 11, color: '#64748b' }}>{right}</div>}
      </div>
      <div style={noPad ? {} : { padding: '12px 16px' }}>{children}</div>
    </div>
  )

  const BubbleTip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    const nhom = d?.nhom
    return (
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 12px #0002' }}>
        <div style={{ fontWeight: 800, color: d?.mau, fontSize: 14, marginBottom: 4 }}>{d?.label}</div>
        <div>Năng suất: <b>{d?.x}</b> SP/h</div>
        <div>Chất lượng: <b>{d?.y}%</b></div>
        {nhom && <div style={{ marginTop: 4, padding: '2px 8px', borderRadius: 20, background: NHOM_COLOR_TK[nhom] + '20', color: NHOM_COLOR_TK[nhom], fontSize: 11, fontWeight: 700, display: 'inline-block' }}>{nhom}</div>}
      </div>
    )
  }

  const BubbleDot = (props) => {
    const { cx, cy, payload } = props
    const r = Math.sqrt(Math.max(payload.z, 5)) * 5
    const nhom = payload.nhom
    const fill = nhom ? NHOM_COLOR_TK[nhom] : payload.mau
    return (
      <g>
        <circle cx={cx} cy={cy} r={r} fill={fill} fillOpacity={0.18} stroke={fill} strokeWidth={2.5} />
        <text x={cx} y={cy - 1} textAnchor="middle" dominantBaseline="middle" fill={fill} fontSize={Math.min(r * 0.7, 13)} fontWeight={800}>{payload.label}</text>
      </g>
    )
  }

  const fpyBarColor = v => v >= MT_DAT_TK ? '#10b981' : v >= 90 ? '#f59e0b' : '#ef4444'

  const badgeOf = (t) => {
    if (t.tyLeDat == null) return <span style={{ color: '#d1d5db' }}>—</span>
    if (t.tyLeDat >= MT_DAT_TK) return <span style={{ background: '#d1fae5', color: '#065f46', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Đạt mục tiêu</span>
    if (t.tyLeDat >= 90)        return <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Cần theo dõi</span>
    return                              <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Cần cải thiện</span>
  }

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      {/* Filter bar */}
      <div style={{ position: 'sticky', top: TAB_BAR_H, zIndex: 9, background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', boxShadow: '0 1px 4px #0001' }}>
        <RangePicker size="small" value={dateRange} onChange={setDateRange} format="DD/MM/YYYY" allowClear={false} />
        <Button size="small" type="primary" icon={<SearchOutlined />} loading={loading}
          style={{ background: '#0f766e', borderColor: '#0f766e' }} onClick={() => fetchData()}>Truy xuất</Button>
        <Button size="small" icon={<ReloadOutlined />} onClick={() => { const d = [dayjs().startOf('month'), dayjs()]; setDateRange(d); fetchData(d) }} />
        <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>
          Mục tiêu FPY: <b style={{ color: '#0f766e' }}>{MT_DAT_TK}%</b>
        </span>
      </div>

      {loading
        ? <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8', fontSize: 14 }}>Đang tải dữ liệu...</div>
        : (
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ══════ PHẦN 1: First Pass Yield ══════ */}
          <SectionHeader
            icon="✓"
            title="Thống kê tỷ lệ Đạt / Không đạt theo tổ"
            sub={`Kỳ ${kyText} · Sản lượng theo ngày · Chỉ tiêu First Pass Yield`}
            right={<span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>Mục tiêu {MT_DAT_TK}%</span>}
          />

          {/* KPI row FPY */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
            <KpiCard label="Lô đã đánh giá"    value={kpi.tongLo}  meta={`Tổng phát sinh ${kpi.tongLo} lô`} accent="#4f46e5" />
            <KpiCard label="Tỷ lệ đạt chung"   value={kpi.tyLeDat != null ? kpi.tyLeDat + '%' : '—'} meta={`${kpi.dat} lô đạt · Mục tiêu ${MT_DAT_TK}%`} accent="#10b981" featured={kpi.tyLeDat != null && kpi.tyLeDat >= MT_DAT_TK} />
            <KpiCard label="Tỷ lệ không đạt"   value={kpi.tyLeDat != null ? (100 - kpi.tyLeDat).toFixed(1) + '%' : '—'} meta={`${kpi.khongDat} lô không đạt`} accent="#ef4444" />
            <KpiCard label="Chưa nhập kết quả" value={kpi.chuaNhap} unit="lô" meta="Cần đôn đốc nhập liệu" accent="#f59e0b" />
            <KpiCard label="Tổ dẫn đầu"        value={best?.label ?? '—'} meta={best ? `${best.tyLeDat}% · Kiểm nghiệm` : ''} accent="#10b981" />
            <KpiCard label="Tổ cần cải thiện"  value={worst?.label ?? '—'} meta={worst ? `${worst.tyLeDat}% · Dán nhãn` : ''} accent="#ef4444" />
          </div>

          {/* Chart row 1: Stacked + Horizontal FPY */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Panel title="Số lô Đạt / Không đạt theo tổ" sub="Cột chồng — quy mô đánh giá và mức độ huyết đối của từng tổ">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={toStats} margin={{ top: 8, right: 8, left: -12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <RcTooltip
                    formatter={(v, name) => [v + ' lô', name === 'khongDat' ? 'Không đạt' : name === 'dat' ? 'Đạt' : 'Chưa nhập']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Legend formatter={n => n === 'khongDat' ? 'Không đạt' : n === 'dat' ? 'Đạt' : 'Chưa nhập'} iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="khongDat" stackId="a" fill="#ef4444" name="khongDat" />
                  <Bar dataKey="dat"      stackId="a" fill="#10b981" name="dat" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Tỷ lệ đạt (%) theo tổ" sub={`Xếp hạng chất lượng — đường đứt là mục tiêu ${MT_DAT_TK}%`}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart layout="vertical" data={[...toStats].filter(t => t.tyLeDat != null).sort((a, b) => (b.tyLeDat ?? 0) - (a.tyLeDat ?? 0))}
                  margin={{ top: 8, right: 52, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => v} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={42} axisLine={false} tickLine={false} />
                  <RcTooltip formatter={v => [v + '%', 'FPY']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <ReferenceLine x={MT_DAT_TK} stroke="#0f766e" strokeDasharray="5 4" label={{ value: `${MT_DAT_TK}%`, fill: '#0f766e', fontSize: 10, position: 'top' }} />
                  <Bar dataKey="tyLeDat" name="FPY" radius={[0, 6, 6, 0]}>
                    {[...toStats].filter(t => t.tyLeDat != null).sort((a, b) => (b.tyLeDat ?? 0) - (a.tyLeDat ?? 0)).map(t => (
                      <Cell key={t.key} fill={fpyBarColor(t.tyLeDat)} />
                    ))}
                    <LabelList dataKey="tyLeDat" position="right" formatter={v => v + '%'} style={{ fontSize: 11, fontWeight: 700, fill: '#1e293b' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          {/* Chart row 2: FPY trend + Pareto */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Panel title="Xu hướng tỷ lệ đạt theo ngày" sub="Theo dõi chất lượng để phát hiện ngày biến thường">
              {trendData.length < 2
                ? <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 12 }}>Cần ít nhất 2 ngày có dữ liệu</div>
                : (
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={trendData} margin={{ top: 8, right: 16, left: -16, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="ngay" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis domain={[50, 100]} tick={{ fontSize: 10 }} tickFormatter={v => v + '%'} axisLine={false} tickLine={false} />
                    <RcTooltip formatter={v => [v + '%', 'FPY']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <ReferenceArea y1={MT_DAT_TK} y2={100} fill="#d1fae5" fillOpacity={0.35} />
                    <ReferenceLine y={MT_DAT_TK} stroke="#0f766e" strokeDasharray="5 4"
                      label={{ value: `${MT_DAT_TK}%`, fill: '#0f766e', fontSize: 10, position: 'right' }} />
                    <Line type="monotone" dataKey="fpy" stroke="#0d9488" strokeWidth={2.5}
                      dot={{ r: 3.5, fill: '#0d9488', stroke: '#fff', strokeWidth: 1.5 }}
                      activeDot={{ r: 6 }} name="FPY" connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel title="Pareto — sản phẩm lỗi nhiều nhất" sub="Sắp xếp lô số lượng không đạt từ nhóm sản phẩm gây phần lớn lô không đạt">
              {paretoData.length === 0
                ? <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 12 }}>Không có lô không đạt trong kỳ</div>
                : (
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={paretoData} margin={{ top: 8, right: 40, left: -16, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" interval={0} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => v + '%'} axisLine={false} tickLine={false} />
                    <RcTooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                      formatter={(v, name) => name === 'cum' ? [v + '%', 'Tích lũy'] : [v + ' lô', 'Không đạt']} />
                    <ReferenceLine yAxisId="right" y={80} stroke="#f59e0b" strokeDasharray="4 3" label={{ value: '80%', fill: '#f59e0b', fontSize: 10, position: 'right' }} />
                    <Bar yAxisId="left" dataKey="count" fill="#ef4444" name="count" radius={[3, 3, 0, 0]} opacity={0.85} />
                    <Line yAxisId="right" type="monotone" dataKey="cum" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} name="cum" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </Panel>
          </div>

          {/* Detail table FPY */}
          <Panel title="Chi tiết theo tổ" sub="Sắp xếp theo tỷ lệ đạt tổng hợp trong kỳ" right="Sắp xếp theo tỷ lệ đạt ↓" noPad>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <TH>#</TH><TH>Tổ</TH>
                <TH align="right">Tổng lô</TH><TH align="right">Đạt</TH>
                <TH align="right">Không đạt</TH><TH align="right">Chưa nhập</TH>
                <TH align="right">Tỷ lệ đạt</TH><TH align="right">So MT</TH>
                <TH>Đánh giá</TH>
              </tr></thead>
              <tbody>
                {toStats.map((t, i) => {
                  const delta = t.tyLeDat != null ? +(t.tyLeDat - MT_DAT_TK).toFixed(1) : null
                  return (
                    <tr key={t.key} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <TD align="left">
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 800, background: i === 0 ? '#f59e0b' : '#f1f5f9', color: i === 0 ? '#fff' : '#64748b' }}>{i + 1}</span>
                      </TD>
                      <TD align="left"><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: t.mau, marginRight: 6 }} /><b>{t.label}</b></TD>
                      <TD>{t.tongLo}</TD>
                      <TD style={{ color: '#047857', fontWeight: 700 }}>{t.dat}</TD>
                      <TD style={{ color: '#b91c1c', fontWeight: 700 }}>{t.khongDat}</TD>
                      <TD style={{ color: '#94a3b8' }}>{t.chuaNhap}</TD>
                      <TD>
                        {t.tyLeDat != null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, minWidth: 70, height: 7, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: t.tyLeDat + '%', background: fpyBarColor(t.tyLeDat), borderRadius: 4 }} />
                            </div>
                            <b style={{ minWidth: 44, textAlign: 'right', fontSize: 13 }}>{t.tyLeDat}%</b>
                          </div>
                        ) : <span style={{ color: '#d1d5db' }}>—</span>}
                      </TD>
                      <TD style={{ fontWeight: 700, color: delta == null ? '#d1d5db' : delta >= 0 ? '#047857' : '#b91c1c' }}>
                        {delta != null ? (delta >= 0 ? '+' : '') + delta : '—'}
                      </TD>
                      <TD align="left">{badgeOf(t)}</TD>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div style={{ padding: '8px 16px', fontSize: 11, color: '#94a3b8', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
              <b>Tỷ lệ đạt (First Pass Yield)</b> = Số lô đạt ÷ (Số lô đạt + Số lô không đạt). Lô "Chưa nhập" không tính vào mẫu số. Mục tiêu kỳ này: <b>{MT_DAT_TK}%</b>. Tổ dưới 90% cần phân tích nguyên nhân theo biểu đồ Pareto.
            </div>
          </Panel>

          {/* ══════ PHẦN 2: Hiệu quả sản xuất (OEE rút gọn) ══════ */}
          <SectionHeader
            icon="◎"
            title="Đánh giá hiệu quả sản xuất theo tổ"
            sub={`Kỳ ${kyText} · Kết hợp Chất lượng × Năng suất (OEE rút gọn)`}
            right={<span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>Mục tiêu CL {MT_DAT_TK}%</span>}
          />

          {/* KPI row OEE */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
            <KpiCard label="Năng suất TB xưởng"  value={kpi.ns ?? '—'}        meta="SP / giờ công" accent="#4f46e5" />
            <KpiCard label="Chỉ số HQ trung bình" value={chqTb ?? '—'}         meta="Thang 0–100" accent="#0f766e" featured />
            <KpiCard label="Tổ hiệu quả nhất"     value={bestChq?.label ?? '—'} meta={bestChq ? `CHQ ${bestChq.chq} · ${bestChq.label}` : ''} accent="#10b981" />
            <KpiCard label="Tổng sản lượng"        value={kpi.tongSl.toLocaleString('vi-VN')} meta={`${kpi.tongLo} lô đã đánh giá`} accent="#0ea5e9" />
            <KpiCard label="Tổng giờ công"          value={kpi.tongCong.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} unit="h" meta="Đầu vào lao động" accent="#6d28d9" />
            <KpiCard label="Đạt mục tiêu CL"        value={toWithChq.filter(t => t.datMucTieu).length} unit={`/ ${TO_CONFIG_TK.length}tổ`} meta={`Chất lượng ≥ ${MT_DAT_TK}%`} accent="#10b981" />
          </div>

          {/* Bubble matrix FULL WIDTH */}
          <Panel title="Ma trận hiệu quả · Năng suất × Chất lượng"
            sub="Mỗi bong bóng là một tổ — vị trí cho biết phải làm gì để đạt theo. Kích thước bóng = tổng sản lượng">
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              {Object.entries(NHOM_COLOR_TK).map(([nhom, color]) => (
                <span key={nhom} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                  <b style={{ color }}>{nhom}</b>
                  <span style={{ color: '#94a3b8' }}>— {NHOM_MO_TA_TK[nhom]}</span>
                </span>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={360}>
              <ScatterChart margin={{ top: 16, right: 60, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" dataKey="x" name="Năng suất"
                  tick={{ fontSize: 11 }}
                  label={{ value: 'Năng suất (SP / giờ công) →', position: 'insideBottom', offset: -20, fontSize: 12, fill: '#64748b' }}
                  axisLine={false} tickLine={false} />
                <YAxis type="number" dataKey="y" name="Chất lượng" domain={[60, 100]}
                  tick={{ fontSize: 11 }} tickFormatter={v => v + '%'}
                  label={{ value: 'Tỷ lệ đạt % ↑', angle: -90, position: 'insideLeft', offset: 16, fontSize: 12, fill: '#64748b' }}
                  axisLine={false} tickLine={false} />
                <ZAxis type="number" dataKey="z" range={[400, 4000]} />
                {/* Vùng xanh phía trên mục tiêu: "Tốt" */}
                <ReferenceArea y1={MT_DAT_TK} y2={100} fill="#d1fae5" fillOpacity={0.35} ifOverflow="extendDomain" />
                <ReferenceLine y={MT_DAT_TK} stroke="#0f766e" strokeDasharray="6 4"
                  label={{ value: `Mục tiêu CL ${MT_DAT_TK}%`, fill: '#0f766e', fontSize: 11, fontWeight: 700, position: 'right' }} />
                <RcTooltip content={<BubbleTip />} />
                {bubbleData.map(d => (
                  <Scatter key={d.label} data={[d]} shape={<BubbleDot />} name={d.label} />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </Panel>

          {/* CHQ bar + Radar side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
            <Panel title="Chỉ số hiệu quả tổng hợp (CHQ) theo tổ"
              sub={`CHQ = Tỷ lệ đạt × Hiệu năng chuẩn hoá ÷ 100 · màu theo nhóm phân tổ`}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart layout="vertical" data={chqSorted.filter(t => t.chq != null)}
                  margin={{ top: 8, right: 52, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fontWeight: 600 }} width={44} axisLine={false} tickLine={false} />
                  <RcTooltip formatter={v => [v, 'CHQ']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="chq" name="CHQ" radius={[0, 8, 8, 0]}>
                    {chqSorted.filter(t => t.chq != null).map(t => {
                      const nhom = nhomOf(t)
                      return <Cell key={t.key} fill={nhom ? NHOM_COLOR_TK[nhom] : t.mau} />
                    })}
                    <LabelList dataKey="chq" position="right" style={{ fontSize: 12, fontWeight: 800, fill: '#1e293b' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="So sánh đa chiều" sub="4 trục đã chuẩn hoá 0–100: Chất lượng · Năng suất · Sản lượng · Ổn định">
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData} margin={{ top: 4, right: 24, left: 24, bottom: 4 }}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8, fill: '#94a3b8' }} />
                  {TO_CONFIG_TK.map(t => (
                    <Radar key={t.key} name={t.label} dataKey={t.key} stroke={t.mau} fill={t.mau} fillOpacity={0.1} strokeWidth={2} />
                  ))}
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <RcTooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          {/* Scorecard table OEE */}
          <Panel title="Phiếu điểm hiệu quả & khuyến nghị" sub="Sắp xếp theo CHQ — chỉ số hiệu quả tổng hợp" noPad>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <TH>#</TH><TH>Tổ</TH>
                <TH align="right">Sản lượng</TH><TH align="right">Giờ công</TH>
                <TH align="right">Năng suất</TH><TH align="right">Tỷ lệ đạt</TH>
                <TH align="right">CHQ</TH><TH>Nhóm</TH><TH>Khuyến nghị</TH>
              </tr></thead>
              <tbody>
                {chqSorted.map((t, i) => {
                  const nhom = nhomOf(t)
                  const nsBar = maxNs > 0 ? (t.nangSuat ?? 0) / maxNs * 100 : 0
                  return (
                    <tr key={t.key} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <TD align="left">
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 800, background: i === 0 ? '#f59e0b' : '#f1f5f9', color: i === 0 ? '#fff' : '#64748b' }}>{i + 1}</span>
                      </TD>
                      <TD align="left"><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: t.mau, marginRight: 6 }} /><b>{t.label}</b></TD>
                      <TD>{t.tongSl.toLocaleString('vi-VN')}</TD>
                      <TD>{t.tongCong.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}</TD>
                      <TD>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, minWidth: 50, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: nsBar + '%', background: t.mau, borderRadius: 3 }} />
                          </div>
                          <b style={{ fontSize: 12 }}>{t.nangSuat ?? '—'}</b>
                        </div>
                      </TD>
                      <TD style={{ fontWeight: 700, color: t.tyLeDat == null ? '#94a3b8' : t.datMucTieu ? '#047857' : '#b45309' }}>
                        {t.tyLeDat != null ? t.tyLeDat + '%' : '—'}
                      </TD>
                      <TD><b style={{ fontSize: 16, color: nhom ? NHOM_COLOR_TK[nhom] : '#1e293b' }}>{t.chq ?? '—'}</b></TD>
                      <TD align="left">
                        {nhom
                          ? <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: NHOM_COLOR_TK[nhom] + '20', color: NHOM_COLOR_TK[nhom] }}>{nhom}</span>
                          : <span style={{ color: '#d1d5db' }}>—</span>}
                      </TD>
                      <TD align="left" style={{ fontSize: 11, color: '#475569', maxWidth: 240 }}>
                        {nhom ? NHOM_TU_VAN_TK[nhom] : '—'}
                      </TD>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div style={{ padding: '8px 16px', fontSize: 11, color: '#94a3b8', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
              <b>CHQ</b> = Tỷ lệ đạt × Hiệu năng chuẩn hoá ÷ 100. Năng suất chuẩn hóa: tổ cao nhất = 100%.
              Nhóm <b style={{ color: NHOM_COLOR_TK['Ngôi sao'] }}>Ngôi sao</b>: CL ≥ {MT_DAT_TK}% và Hiệu năng ≥ 50%.
            </div>
          </Panel>

        </div>
      )}
    </div>
  )
}

// ─── Tab: Phân tích sản lượng tương tác ──────────────────────────────────────

const STAGE_COLORS = {
  PCPL1: '#1D4ED8', PCPL2: '#0369a1', PL: '#0e7490',
  DG: '#b45309', BBC1: '#6d28d9', CC: '#9d174d',
}

function resolveCongDoan(r) {
  let cd = (r.congDoan || '').toUpperCase()
  if (cd === 'PC') {
    const nhom = (r.nhomThucHien || r.toNhom)?.toUpperCase()
    if (nhom === 'PCPL1') return 'PCPL1'
    if (nhom === 'PCPL2') return 'PCPL2'
    if (nhom === 'PCPL3' || nhom === 'PL') return 'PL'
    return 'PCPL1'
  }
  if (cd === 'PCPL3') return 'PL'
  return cd
}

const QUICK_RANGES = [
  { label: 'Hôm nay',    range: () => [dayjs(), dayjs()] },
  { label: 'Tuần này',   range: () => [dayjs().startOf('week'), dayjs()] },
  { label: 'Tuần trước', range: () => [dayjs().subtract(1,'week').startOf('week'), dayjs().subtract(1,'week').endOf('week')] },
  { label: 'Tháng này',  range: () => [dayjs().startOf('month'), dayjs()] },
  { label: 'Tháng trước',range: () => [dayjs().subtract(1,'month').startOf('month'), dayjs().subtract(1,'month').endOf('month')] },
  { label: '3 tháng',    range: () => [dayjs().subtract(2,'month').startOf('month'), dayjs()] },
]

const LOAI_COLORS = ['#0284c7','#0891b2','#059669','#d97706','#7c3aed','#db2777','#dc2626','#65a30d','#0f766e','#9333ea','#c2410c','#0369a1']

const ANALYSIS_STAGES = [
  { key: 'PC',   label: 'PC',   color: '#1D4ED8', match: cd => cd === 'PCPL1' || cd === 'PCPL2' },
  { key: 'PL',   label: 'PL',   color: '#0e7490', match: cd => cd === 'PL' },
  { key: 'BBC1', label: 'BBC1', color: '#6d28d9', match: cd => cd === 'BBC1' },
  { key: 'DG',   label: 'ĐG',   color: '#b45309', match: cd => cd === 'DG' },
]

function PhanTichSanLuongTab() {
  const { getLockedCongDoan } = useAuth()
  const lockedCongDoan = getLockedCongDoan()
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()])
  const [stageFilter, setStageFilter] = useState(lockedCongDoan || '')
  const [loading, setLoading] = useState(false)
  const [raw, setRaw] = useState([])
  const [loaiSpMap, setLoaiSpMap] = useState({})
  const [innerTab, setInnerTab] = useState('stage')
  const [sortBy, setSortBy] = useState('output-desc')
  const [activeQuickRange, setActiveQuickRange] = useState('Tháng này')

  const fetchData = useCallback(async (range = dateRange) => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/work-schedule-session/daily-report', {
        params: {
          fromDate: range[0].format('YYYY-MM-DD'),
          toDate:   range[1].format('YYYY-MM-DD'),
        }
      })
      const rows = res.filter(r => r.status !== 'PENDING' && r.status !== 'IN_PROGRESS')
      setRaw(rows)
      const codes = [...new Set(rows.map(r => r.maSp).filter(Boolean))]
      if (codes.length > 0) {
        api.get('/product-master/lookup-batch', { params: { codes } })
          .then(({ data: batchMap }) => {
            const m = {}
            codes.forEach(maSp => { if (batchMap[maSp]?.loaiSanPham) m[maSp] = batchMap[maSp].loaiSanPham })
            setLoaiSpMap(m)
          })
          .catch(() => {})
      }
    } catch {
      message.error('Không thể tải dữ liệu phân tích')
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => { fetchData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Aggregate by công đoạn
  const stageData = useMemo(() => {
    const map = {}
    raw.forEach(r => {
      if (!r.ngay) return  // nhất quán với TongHopTab
      const cd = resolveCongDoan(r)
      if (!cd) return
      if (stageFilter && cd !== stageFilter) return
      if (!map[cd]) map[cd] = { key: cd, sl: 0, cong: 0, products: [] }
      map[cd].sl += Number(r.sanLuong || 0)
      map[cd].cong += Number(r.congThucHien || 0)
      map[cd].products.push(r)
    })
    return Object.values(map).sort((a, b) => b.sl - a.sl)
  }, [raw, stageFilter])

  // All products flat
  const productRows = useMemo(() => {
    const rows = raw
      .filter(r => !stageFilter || resolveCongDoan(r) === stageFilter)
      .map(r => ({
        ...r,
        cd: resolveCongDoan(r),
        sl: Number(r.sanLuong || 0),
        cong: Number(r.congThucHien || 0),
      }))
    switch (sortBy) {
      case 'output-asc':  return [...rows].sort((a, b) => a.sl - b.sl)
      case 'name-asc':    return [...rows].sort((a, b) => (a.tenTrinh || '').localeCompare(b.tenTrinh || '', 'vi'))
      case 'stage':       return [...rows].sort((a, b) => a.cd.localeCompare(b.cd))
      default:            return [...rows].sort((a, b) => b.sl - a.sl)
    }
  }, [raw, stageFilter, sortBy])

  // Aggregate by loại SP + breakdown theo công đoạn
  const loaiData = useMemo(() => {
    const map = {}
    raw.forEach(r => {
      if (stageFilter && resolveCongDoan(r) !== stageFilter) return
      const loai = (r.maSp && loaiSpMap[r.maSp]) ? loaiSpMap[r.maSp] : '(Chưa phân loại)'
      if (!map[loai]) {
        const byStage = {}
        ANALYSIS_STAGES.forEach(s => { byStage[s.key] = { sl: 0, cong: 0 } })
        map[loai] = { key: loai, sl: 0, cong: 0, products: [], byStage }
      }
      const sl = Number(r.sanLuong || 0)
      const cong = Number(r.congThucHien || 0)
      map[loai].sl += sl
      map[loai].cong += cong
      map[loai].products.push(r)
      const cd = resolveCongDoan(r)
      const stg = ANALYSIS_STAGES.find(s => s.match(cd))
      if (stg) { map[loai].byStage[stg.key].sl += sl; map[loai].byStage[stg.key].cong += cong }
    })
    return Object.values(map).sort((a, b) => b.sl - a.sl)
  }, [raw, stageFilter, loaiSpMap])

  const totalSl = stageData.reduce((s, r) => s + r.sl, 0)

  const statCards = [
    { label: 'Tổng sản lượng', value: fmtSL(totalSl) },
    { label: 'Tổng sản phẩm', value: productRows.length },
    { label: 'Công đoạn HĐ', value: stageData.length },
    { label: 'Tổng công', value: fmtCong(stageData.reduce((s, r) => s + r.cong, 0), 2) },
  ]

  return (
    <div style={{ padding: '12px 16px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12,
        background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 8, padding: '10px 16px' }}>
        <span style={{ fontWeight: 700, color: '#0f766e', whiteSpace: 'nowrap' }}>📊 Khoảng thời gian:</span>
        <RangePicker
          value={dateRange}
          onChange={v => { if (v) { setDateRange(v); setActiveQuickRange(null) } }}
          format="DD/MM/YYYY"
          size="small"
          allowClear={false}
          style={{ width: 230 }}
        />
        <Select
          size="small"
          value={stageFilter}
          onChange={lockedCongDoan ? undefined : setStageFilter}
          disabled={!!lockedCongDoan}
          style={{ width: 145 }}
          options={[
            { value: '', label: 'Tất cả công đoạn' },
            ...STAGES.map(s => ({ value: s.key, label: s.label })),
          ]}
        />
        <Button size="small" type="primary" icon={<SearchOutlined />}
          style={{ background: '#0f766e', borderColor: '#0f766e' }}
          onClick={() => fetchData(dateRange)} loading={loading}>
          Xem
        </Button>
        <Button size="small" icon={<ReloadOutlined />} onClick={() => fetchData(dateRange)} loading={loading} />
      </div>
      {/* Quick range buttons */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {QUICK_RANGES.map(q => {
          const isActive = activeQuickRange === q.label
          return (
            <Button key={q.label} size="small"
              style={{
                fontSize: 12, borderRadius: 12,
                borderColor: isActive ? '#0f766e' : '#99f6e4',
                color: isActive ? '#fff' : '#0f766e',
                background: isActive ? '#0f766e' : '#f0fdfa',
                fontWeight: isActive ? 700 : 400,
              }}
              onClick={() => {
                const r = q.range()
                setDateRange(r)
                setActiveQuickRange(q.label)
                fetchData(r)
              }}>
              {q.label}
            </Button>
          )
        })}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        {statCards.map(c => (
          <div key={c.label} style={{ background: '#f8f9fa', borderLeft: '4px solid #20a39e',
            padding: '12px 16px', borderRadius: 4 }}>
            <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#0f766e' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Inner tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          { key: 'stage', label: '📈 Theo Công đoạn' },
          { key: 'loaisp', label: '🧪 Theo Loại SP' },
          { key: 'product', label: '📦 Theo Sản phẩm' },
        ].map(t => {
          const isActive = innerTab === t.key
          return (
            <button key={t.key} onClick={() => setInnerTab(t.key)}
              style={{
                padding: '8px 18px', cursor: 'pointer',
                fontWeight: 600, fontSize: 13, borderRadius: 8,
                border: `2px solid ${isActive ? '#0f766e' : '#d1d5db'}`,
                color: isActive ? '#fff' : '#555',
                background: isActive ? '#0f766e' : '#f9fafb',
                transition: 'all 0.15s',
              }}>
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab: theo công đoạn */}
      {innerTab === 'stage' && (
        <div>
          {stageData.length === 0 && !loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
              <div>Không có dữ liệu cho ngày đã chọn</div>
            </div>
          ) : (
            <>
              {/* Bar chart */}
              <div style={{ background: '#f8f9fa', borderRadius: 4, padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 12, color: '#333' }}>Sản lượng theo Công đoạn</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stageData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="key" tick={{ fontSize: 12, fontWeight: 700 }} />
                    <YAxis tickFormatter={v => v.toLocaleString('vi-VN')} tick={{ fontSize: 11 }} />
                    <RcTooltip formatter={(v, n) => [v.toLocaleString('vi-VN'), n === 'sl' ? 'Sản lượng' : 'Công']} />
                    <Bar dataKey="sl" name="sl" radius={[4, 4, 0, 0]}>
                      {stageData.map(entry => (
                        <Cell key={entry.key} fill={STAGE_COLORS[entry.key] || '#20a39e'} />
                      ))}
                      <LabelList dataKey="sl" position="top" formatter={v => v > 0 ? v.toLocaleString('vi-VN') : ''} style={{ fontSize: 11, fill: '#444' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table by stage */}
              <Table
                size="small"
                dataSource={stageData}
                rowKey="key"
                loading={loading}
                pagination={false}
                columns={[
                  {
                    title: 'Công đoạn', dataIndex: 'key', width: 100,
                    render: v => <Tag color={CONG_DOAN_COLOR[v] || 'default'} style={{ fontWeight: 700 }}>{v}</Tag>
                  },
                  {
                    title: 'Số sản phẩm', dataIndex: 'products', align: 'right', width: 110,
                    render: v => v.length
                  },
                  {
                    title: 'Tổng sản lượng', dataIndex: 'sl', align: 'right',
                    render: v => <span style={{ fontWeight: 700, color: '#0f766e' }}>{fmtSL(v)}</span>
                  },
                  {
                    title: '% Sản lượng', dataIndex: 'sl', key: 'pct', align: 'right', width: 110,
                    render: v => <span>{totalSl > 0 ? ((v / totalSl) * 100).toFixed(1) : 0}%</span>
                  },
                  {
                    title: 'Tổng công', dataIndex: 'cong', align: 'right', width: 110,
                    render: v => <span style={{ color: '#722ed1' }}>{fmtCong(v, 2)}</span>
                  },
                ]}
                summary={() => (
                  <Table.Summary.Row style={{ background: '#f0fdfa', fontWeight: 700 }}>
                    <Table.Summary.Cell index={0}>TỔNG CỘNG</Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">{productRows.length}</Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <span style={{ color: '#0f766e' }}>{fmtSL(totalSl)}</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">100%</Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right">
                      <span style={{ color: '#722ed1' }}>{fmtCong(stageData.reduce((s, r) => s + r.cong, 0), 2)}</span>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </>
          )}
        </div>
      )}

      {/* Tab: theo loại SP */}
      {innerTab === 'loaisp' && (
        <div>
          {loaiData.length === 0 && !loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
              <div>Không có dữ liệu cho khoảng thời gian đã chọn</div>
            </div>
          ) : (
            <>
              <div style={{ background: '#f8f9fa', borderRadius: 4, padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 12, color: '#333' }}>Sản lượng theo Loại SP</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={loaiData} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="key" tick={{ fontSize: 11, fontWeight: 600 }} angle={-15} textAnchor="end" interval={0} />
                    <YAxis tickFormatter={v => v.toLocaleString('vi-VN')} tick={{ fontSize: 11 }} />
                    <RcTooltip formatter={(v, n) => [v.toLocaleString('vi-VN'), n === 'sl' ? 'Sản lượng' : 'Công']} />
                    <Bar dataKey="sl" name="sl" radius={[4, 4, 0, 0]}>
                      {loaiData.map((entry, idx) => (
                        <Cell key={entry.key} fill={LOAI_COLORS[idx % LOAI_COLORS.length]} />
                      ))}
                      <LabelList dataKey="sl" position="top" formatter={v => v > 0 ? v.toLocaleString('vi-VN') : ''} style={{ fontSize: 11, fill: '#444' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ color: '#0000CC' }}>
              <Table
                size="small"
                dataSource={loaiData}
                rowKey="key"
                loading={loading}
                pagination={false}
                scroll={{ x: 1320 }}
                bordered
                components={{ header: { cell: props => <th {...props} style={{ ...props.style, background: '#00CC99', color: '#fff' }} /> } }}
                columns={[
                  {
                    title: 'Loại SP', dataIndex: 'key', width: 155, fixed: 'left',
                    render: (v, _, idx) => (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 12, height: 12, borderRadius: 2, background: LOAI_COLORS[idx % LOAI_COLORS.length], display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600 }}>{v}</span>
                      </span>
                    )
                  },
                  { title: 'Số SP', dataIndex: 'products', align: 'right', width: 65, render: v => v.length },
                  {
                    title: 'Sản lượng theo công đoạn',
                    children: ANALYSIS_STAGES.map(s => ({
                      title: <span style={{ color: s.color, fontWeight: 700 }}>{s.label}</span>,
                      key: `sl_${s.key}`,
                      align: 'right',
                      width: 90,
                      render: (_, r) => {
                        const v = r.byStage[s.key]?.sl || 0
                        return v > 0
                          ? <span style={{ color: s.color, fontWeight: 600 }}>{fmtSL(v)}</span>
                          : <span style={{ color: '#d9d9d9', fontSize: 11 }}>—</span>
                      },
                    })),
                  },
                  {
                    title: 'Tổng SL', dataIndex: 'sl', align: 'right', width: 105,
                    render: v => <span style={{ fontWeight: 700, color: '#0f766e' }}>{fmtSL(v)}</span>
                  },
                  {
                    title: '% SL', dataIndex: 'sl', key: 'pct', align: 'right', width: 75,
                    render: v => <span>{totalSl > 0 ? ((v / totalSl) * 100).toFixed(1) : 0}%</span>
                  },
                  {
                    title: 'Công theo công đoạn',
                    children: ANALYSIS_STAGES.map(s => ({
                      title: <span style={{ color: s.color, fontWeight: 700 }}>{s.label}</span>,
                      key: `cong_${s.key}`,
                      align: 'right',
                      width: 90,
                      render: (_, r) => {
                        const v = r.byStage[s.key]?.cong || 0
                        return v > 0
                          ? <span style={{ color: s.color, fontWeight: 600 }}>{fmtCong(v, 2)}</span>
                          : <span style={{ color: '#d9d9d9', fontSize: 11 }}>—</span>
                      },
                    })),
                  },
                  {
                    title: 'Tổng công', dataIndex: 'cong', align: 'right', width: 100,
                    render: v => <span style={{ color: '#722ed1', fontWeight: 600 }}>{fmtCong(v, 2)}</span>
                  },
                ]}
                summary={() => {
                  const totalCong = loaiData.reduce((s, r) => s + r.cong, 0)
                  const stageTotals = ANALYSIS_STAGES.map(s =>
                    loaiData.reduce((sum, r) => sum + (r.byStage[s.key]?.sl || 0), 0)
                  )
                  const stageCongTotals = ANALYSIS_STAGES.map(s =>
                    loaiData.reduce((sum, r) => sum + (r.byStage[s.key]?.cong || 0), 0)
                  )
                  return (
                    <Table.Summary.Row style={{ background: '#f0fdfa', fontWeight: 700 }}>
                      <Table.Summary.Cell index={0}>TỔNG CỘNG</Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">{loaiData.reduce((s, r) => s + r.products.length, 0)}</Table.Summary.Cell>
                      {stageTotals.map((v, i) => (
                        <Table.Summary.Cell key={i} index={2 + i} align="right">
                          <span style={{ color: ANALYSIS_STAGES[i].color, fontWeight: 700 }}>{v > 0 ? fmtSL(v) : '—'}</span>
                        </Table.Summary.Cell>
                      ))}
                      <Table.Summary.Cell index={6} align="right">
                        <span style={{ color: '#0f766e' }}>{fmtSL(totalSl)}</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7} align="right">100%</Table.Summary.Cell>
                      {stageCongTotals.map((v, i) => (
                        <Table.Summary.Cell key={`sc${i}`} index={8 + i} align="right">
                          <span style={{ color: ANALYSIS_STAGES[i].color, fontWeight: 700 }}>{v > 0 ? fmtCong(v, 2) : '—'}</span>
                        </Table.Summary.Cell>
                      ))}
                      <Table.Summary.Cell index={12} align="right">
                        <span style={{ color: '#722ed1' }}>{fmtCong(totalCong, 2)}</span>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )
                }}
              />
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: theo sản phẩm */}
      {innerTab === 'product' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: '#666' }}>Sắp xếp theo:</span>
            <Select
              size="small"
              value={sortBy}
              onChange={setSortBy}
              style={{ width: 200 }}
              options={[
                { value: 'output-desc', label: 'Sản lượng (Cao → Thấp)' },
                { value: 'output-asc',  label: 'Sản lượng (Thấp → Cao)' },
                { value: 'name-asc',    label: 'Tên sản phẩm (A → Z)' },
                { value: 'stage',       label: 'Công đoạn' },
              ]}
            />
          </div>

          {productRows.length === 0 && !loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
              <div>Không có dữ liệu</div>
            </div>
          ) : (
            <Table
              size="small"
              dataSource={productRows}
              rowKey={(r, i) => `${r.cd}-${r.soLo}-${i}`}
              loading={loading}
              pagination={{ pageSize: 50, showSizeChanger: false, showTotal: t => `${t} sản phẩm` }}
              columns={[
                {
                  title: '#', key: 'idx', width: 45, align: 'center',
                  render: (_, __, i) => <span style={{ color: '#999', fontSize: 11 }}>{i + 1}</span>
                },
                {
                  title: 'CĐ', dataIndex: 'cd', width: 75,
                  render: v => <Tag color={CONG_DOAN_COLOR[v] || 'default'} style={{ marginRight: 0, fontWeight: 700, fontSize: 11 }}>{v}</Tag>
                },
                {
                  title: 'Mã SP', dataIndex: 'maSp', width: 75,
                  render: v => v ? <span style={{ fontWeight: 600, color: '#595959', fontSize: 12 }}>{v}</span> : '—'
                },
                {
                  title: 'Tên sản phẩm / Tiến trình', dataIndex: 'tenTrinh',
                  render: v => <span style={{ wordBreak: 'break-word' }}>{v || '—'}</span>
                },
                {
                  title: 'Số lô', dataIndex: 'soLo', width: 90,
                  render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || '—'}</span>
                },
                {
                  title: 'Sản lượng', dataIndex: 'sl', width: 110, align: 'right',
                  render: v => <span style={{ fontWeight: 700, color: '#0f766e' }}>{fmtSL(v)}</span>
                },
                {
                  title: '% Tổng', key: 'pct', width: 80, align: 'right',
                  render: (_, r) => <span style={{ fontSize: 12 }}>{totalSl > 0 ? ((r.sl / totalSl) * 100).toFixed(1) : 0}%</span>
                },
                {
                  title: 'Công', dataIndex: 'cong', width: 90, align: 'right',
                  render: v => <span style={{ color: '#722ed1', fontSize: 12 }}>{fmtCong(v, 2)}</span>
                },
              ]}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Nhập Kho ───────────────────────────────────────────────────────────

const TINH_TRANG_NK_OPTIONS = ['Done', 'Chốt']

// ─── Modal thêm sản phẩm nhập kho ────────────────────────────────────────────

function AddNhapKhoModal({ open, onClose, onAdded }) {
  const [searchVal,   setSearchVal]   = useState('')
  const [searching,   setSearching]   = useState(false)
  const [options,     setOptions]     = useState([])
  const [selProduct,  setSelProduct]  = useState(null)   // { maBravo, maTp, tienTrinh }
  const [lots,        setLots]        = useState([])
  const [lotsLoading, setLotsLoading] = useState(false)
  const [selected,    setSelected]    = useState(null)   // ProductionRecord đã chọn lô
  const [slNK,        setSlNK]        = useState(null)
  const [ngayXuat,    setNgayXuat]    = useState(null)
  const [tinhTrang,   setTinhTrang]   = useState(undefined)
  const [tenNth,      setTenNth]      = useState('')
  const [ghiChu,      setGhiChu]      = useState('')
  const [saving,      setSaving]      = useState(false)
  const debounceRef = useRef(null)

  // Bước 1: tìm sản phẩm — deduplicate theo maBravo
  const doSearch = useCallback((query) => {
    if (!query.trim()) { setOptions([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const [r1, r2] = await Promise.allSettled([
          api.get('/production', { params: { maBravo: query, size: 30 } }),
          api.get('/production', { params: { tienTrinh: query, size: 30 } }),
        ])
        const items = [
          ...(r1.status === 'fulfilled' ? r1.value.data.content : []),
          ...(r2.status === 'fulfilled' ? r2.value.data.content : []),
        ]
        const seen = new Map()
        items.forEach(item => { if (!seen.has(item.maBravo)) seen.set(item.maBravo, item) })
        setOptions([...seen.values()].map(item => ({
          value: item.maBravo,
          label: (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', maxWidth: 460 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff', minWidth: 72 }}>{item.maBravo}</span>
              <Tag style={{ marginRight: 0, fontSize: 11, lineHeight: '16px' }}>{item.maTp}</Tag>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: '#374151' }}>{item.tienTrinh}</span>
            </div>
          ),
          record: item,
        })))
      } catch { /* silent */ }
      finally { setSearching(false) }
    }, 300)
  }, [])

  // Bước 1 → chọn sản phẩm → tải danh sách lô
  const handleSelectProduct = (_val, option) => {
    const rec = option.record
    setSelProduct({ maBravo: rec.maBravo, maTp: rec.maTp, tienTrinh: rec.tienTrinh })
    setSearchVal(`${rec.maBravo} — ${rec.tienTrinh}`)
    setSelected(null)
    setLots([])
    setSlNK(null); setNgayXuat(null); setTinhTrang(undefined); setTenNth(''); setGhiChu('')
    // Tải tất cả lô của sản phẩm này
    setLotsLoading(true)
    api.get('/production', { params: { maBravo: rec.maBravo, size: 200 } })
      .then(({ data: res }) => setLots(res.content || []))
      .catch(() => {})
      .finally(() => setLotsLoading(false))
  }

  // Bước 2 → chọn lô → điền form
  const handleSelectLot = (lotId) => {
    const rec = lots.find(r => String(r.id) === String(lotId))
    if (!rec) return
    setSelected(rec)
    if (rec.tpNhapKho   != null) setSlNK(rec.tpNhapKho)
    if (rec.ngayXuatKho != null) setNgayXuat(dayjs(rec.ngayXuatKho))
    if (rec.tinhTrangNhapKho)    setTinhTrang(rec.tinhTrangNhapKho)
    if (rec.tenNthNhapKho)       setTenNth(rec.tenNthNhapKho)
    if (rec.ghiChuNhapKho)       setGhiChu(rec.ghiChuNhapKho)
  }

  const handleSave = async () => {
    if (!selected) return message.warning('Chưa chọn số lô')
    if (slNK == null) return message.warning('Nhập SL Nhập Kho')
    setSaving(true)
    try {
      const body = {
        tpNhapKho:        String(slNK),
        ngayXuatKho:      ngayXuat ? ngayXuat.format('YYYY-MM-DD') : '',
        tinhTrangNhapKho: tinhTrang || '',
        tenNthNhapKho:    tenNth.trim(),
        ghiChuNhapKho:    ghiChu.trim(),
      }
      // Nếu lô đã có nhập kho trước đó VÀ ngày khác → tạo bản ghi mới
      const existingDate = selected.ngayXuatKho ? dayjs(selected.ngayXuatKho) : null
      const isNewEntry = selected.tpNhapKho != null
        && existingDate != null
        && ngayXuat != null
        && !existingDate.isSame(ngayXuat, 'day')

      const { data: updated } = isNewEntry
        ? await api.post(`/production/${selected.id}/nhap-kho-entry`, body)
        : await api.patch(`/production/${selected.id}/nhap-kho`, body)

      message.success(isNewEntry ? 'Đã thêm lần nhập kho mới' : 'Đã lưu nhập kho')
      onAdded(updated)
      doClose()
    } catch { message.error('Lưu thất bại') }
    finally { setSaving(false) }
  }

  const doClose = () => {
    setSearchVal(''); setOptions([]); setSelProduct(null); setLots([]); setSelected(null)
    setSlNK(null); setNgayXuat(null); setTinhTrang(undefined); setTenNth(''); setGhiChu('')
    onClose()
  }

  return (
    <Modal
      title="Thêm sản phẩm nhập kho"
      open={open}
      onCancel={doClose}
      onOk={handleSave}
      okText="Lưu"
      okButtonProps={{ loading: saving, disabled: !selected || slNK == null }}
      width={540}
      destroyOnClose
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>

        {/* Bước 1: Tìm sản phẩm */}
        <div>
          <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 13 }}>
            <span style={{ background: '#1677ff', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, marginRight: 6 }}>1</span>
            Tìm sản phẩm <span style={{ color: '#ef4444' }}>*</span>
          </div>
          <AutoComplete
            style={{ width: '100%' }}
            options={options}
            value={searchVal}
            onChange={val => {
              setSearchVal(val)
              setSelProduct(null); setLots([]); setSelected(null)
              setSlNK(null); setNgayXuat(null); setTinhTrang(undefined); setTenNth(''); setGhiChu('')
              doSearch(val)
            }}
            onSelect={handleSelectProduct}
            placeholder="Gõ Mã Bravo hoặc Tên sản phẩm..."
            notFoundContent={searching ? <Spin size="small" /> : searchVal ? 'Không tìm thấy' : null}
            popupMatchSelectWidth={500}
          />
        </div>

        {/* Bước 2: Chọn số lô */}
        {selProduct && (
          <div>
            <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 13 }}>
              <span style={{ background: lots.length ? '#1677ff' : '#d1d5db', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, marginRight: 6 }}>2</span>
              Chọn số lô <span style={{ color: '#ef4444' }}>*</span>
              {lots.length > 0 && <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 6, fontSize: 12 }}>({lots.length} lô)</span>}
            </div>
            <Select
              style={{ width: '100%' }}
              placeholder={lotsLoading ? 'Đang tải lô...' : 'Chọn số lô...'}
              loading={lotsLoading}
              value={selected ? String(selected.id) : undefined}
              onChange={handleSelectLot}
              showSearch
              optionFilterProp="label"
              notFoundContent={lotsLoading ? <Spin size="small" /> : 'Không có lô nào'}
              options={lots.map(r => ({
                value: String(r.id),
                label: `Lô ${r.lsx}`,
                render: r,
              }))}
              optionRender={opt => {
                const r = opt.data.render
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, minWidth: 70 }}>Lô {r.lsx}</span>
                    <span style={{ color: '#6b7280' }}>KH: {r.soLuong?.toLocaleString('vi-VN') ?? '—'}</span>
                    {r.tpNhapKho != null
                      ? <Tag color="green" style={{ marginLeft: 'auto', fontSize: 11 }}>Đã NK: {r.tpNhapKho.toLocaleString('vi-VN')}</Tag>
                      : <Tag color="default" style={{ marginLeft: 'auto', fontSize: 11 }}>Chưa NK</Tag>
                    }
                  </div>
                )
              }}
            />
          </div>
        )}

        {/* Thông tin lô đã chọn */}
        {selected && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#374151', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div>
              <strong>Mã Bravo:</strong>{' '}
              <span style={{ fontFamily: 'monospace', color: '#1677ff', fontWeight: 700 }}>{selected.maBravo}</span>
              <span style={{ margin: '0 8px', color: '#d1d5db' }}>|</span>
              <strong>Mã SP:</strong> {selected.maTp}
            </div>
            <div><strong>Tên SP:</strong> {selected.tienTrinh}</div>
            <div>
              <strong>Số lô:</strong> {selected.lsx}
              <span style={{ margin: '0 8px', color: '#d1d5db' }}>|</span>
              <strong>SL kế hoạch:</strong> {selected.soLuong?.toLocaleString('vi-VN')}
            </div>
          </div>
        )}

        {/* Bước 3: Nhập thông tin nhập kho */}
        {selected && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 13 }}>SL Nhập Kho <span style={{ color: '#ef4444' }}>*</span></div>
              <InputNumber
                style={{ width: '100%' }} min={0} step={1}
                value={slNK} onChange={setSlNK}
                formatter={val => val != null ? Number(val).toLocaleString('vi-VN') : ''}
                parser={val => val ? val.replace(/[^\d]/g, '') : ''}
                placeholder="0"
                autoFocus
              />
            </div>
            <div>
              <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Ngày xuất</div>
              <DatePicker
                style={{ width: '100%' }} format="DD/MM/YYYY"
                value={ngayXuat} onChange={setNgayXuat}
                placeholder="Chọn ngày"
              />
            </div>
            <div>
              <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Tình trạng</div>
              <Select
                style={{ width: '100%' }} value={tinhTrang} onChange={setTinhTrang}
                placeholder="— Chọn —" allowClear
                options={TINH_TRANG_NK_OPTIONS.map(o => ({ value: o, label: o }))}
              />
            </div>
            <div>
              <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Tên NTH</div>
              <Input
                value={tenNth} onChange={e => setTenNth(e.target.value)}
                placeholder="Nhập tên NTH"
                onPressEnter={handleSave}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Ghi chú</div>
              <Input.TextArea
                rows={2} value={ghiChu} onChange={e => setGhiChu(e.target.value)}
                placeholder="Ghi chú thêm nếu cần..."
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── NhapKhoSummaryView ───────────────────────────────────────────────────────

const _thS = { padding: '5px 7px', border: '1px solid #004d4d', fontSize: 11, whiteSpace: 'nowrap', textAlign: 'center' }
const _tdS = { padding: '3px 6px', border: '1px solid #e5e7eb', fontSize: 12 }
const _tfS = { padding: '5px 7px', border: '1px solid #005555', fontSize: 12 }

const EDITABLE_NK_MONTHS = new Set([1, 2, 3, 4, 5, 6])

function CellPopoverContent({ records, day, month, year, onSave, onClose }) {
  const [localVals, setLocalVals] = useState(() =>
    Object.fromEntries(records.map(r => [r.id, r.tpNhapKho ?? 0]))
  )
  const [saving, setSaving] = useState({})

  const handleSave = async (id) => {
    setSaving(s => ({ ...s, [id]: true }))
    try {
      await onSave(id, 'tpNhapKho', localVals[id] ?? 0)
      message.success('Đã lưu')
      onClose()
    } catch {
      message.error('Lưu thất bại')
    } finally {
      setSaving(s => { const n = { ...s }; delete n[id]; return n })
    }
  }

  return (
    <div style={{ minWidth: 300, maxWidth: 380 }}>
      <div style={{ fontWeight: 700, marginBottom: 10, color: '#006666', borderBottom: '1px solid #e5e7eb', paddingBottom: 6, fontSize: 13 }}>
        📅 Ngày {String(day).padStart(2, '0')}/{String(month).padStart(2, '0')}/{year}
      </div>
      {records.length === 0 ? (
        <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>
          Chưa có bản ghi nào cho ngày này
        </div>
      ) : (
        records.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#1677ff', fontFamily: 'monospace', fontWeight: 700 }}>{r.maBravo}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>
                Lô {r.lsx}{r.tienTrinh ? ` — ${r.tienTrinh.slice(0, 22)}` : ''}
              </div>
            </div>
            <InputNumber
              size="small" min={0}
              value={localVals[r.id]}
              formatter={v => v != null && v !== '' ? Number(v).toLocaleString('vi-VN') : ''}
              parser={v => v ? v.replace(/[^\d]/g, '') : ''}
              onChange={v => setLocalVals(prev => ({ ...prev, [r.id]: v ?? 0 }))}
              onPressEnter={() => handleSave(r.id)}
              style={{ width: 110 }}
            />
            <Button
              size="small" type="primary"
              loading={!!saving[r.id]}
              onClick={() => handleSave(r.id)}
            >
              Lưu
            </Button>
          </div>
        ))
      )}
    </div>
  )
}

function NhapKhoSummaryView({ data, year, mucTieu, onMucTieuChange, loading, onSaveField }) {
  const [editMT, setEditMT] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const [editPopover, setEditPopover] = useState(null) // { day, month }

  const dayMonthRecords = useMemo(() => {
    const dm = {}
    data.forEach(r => {
      if (!r.ngayXuatKho) return
      const dt = dayjs(r.ngayXuatKho)
      if (dt.year() !== year) return
      const key = `${dt.date()}_${dt.month() + 1}`
      if (!dm[key]) dm[key] = []
      dm[key].push(r)
    })
    return dm
  }, [data, year])

  const pivot = useMemo(() => {
    const p = {}
    for (let d = 1; d <= 31; d++) p[d] = {}
    data.forEach(r => {
      if (!r.ngayXuatKho) return
      const dt = dayjs(r.ngayXuatKho)
      if (dt.year() !== year) return
      const d = dt.date(), m = dt.month() + 1
      p[d][m] = (p[d][m] || 0) + (r.tpNhapKho || 0)
    })
    return p
  }, [data, year])

  const monthTotals = useMemo(() => {
    const t = {}
    for (let m = 1; m <= 12; m++)
      t[m] = Object.values(pivot).reduce((s, row) => s + (row[m] || 0), 0)
    return t
  }, [pivot])

  const grandTotal = Object.values(monthTotals).reduce((s, v) => s + v, 0)
  const conThieu   = mucTieu > 0 ? mucTieu - grandTotal : null
  const surplus    = conThieu != null && conThieu < 0

  const now = dayjs()
  const curMonth = now.year() === year ? now.month() + 1 : (now.year() < year ? 0 : 13)

  const daysInMonth = m => dayjs(`${year}-${String(m).padStart(2,'0')}-01`).daysInMonth()
  const isFuture   = m => m > curMonth
  const fmt        = v => v ? Number(v).toLocaleString('vi-VN') : ''

  const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12]

  return (
    <Spin spinning={loading}>
      <div style={{ overflowX: 'auto', borderRadius: 6, border: '1px solid #e5e7eb' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ background: '#006666', color: '#fff' }}>
              <th style={{ ..._thS, width: 44, background: '#004d4d' }}>Ngày</th>
              {MONTHS.map(m => (
                <th key={m} style={{ ..._thS, minWidth: 80, opacity: isFuture(m) ? 0.55 : 1 }}>
                  Tháng {m}{EDITABLE_NK_MONTHS.has(m) && onSaveField ? <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 2 }}>✏</span> : null}
                </th>
              ))}
              <th style={{ ..._thS, background: '#003333', minWidth: 90 }}>Tổng</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
              const rowTotal = MONTHS.reduce((s, m) =>
                s + (day <= daysInMonth(m) && !isFuture(m) ? (pivot[day][m] || 0) : 0), 0)
              const hasData = rowTotal > 0
              return (
                <tr
                  key={day}
                  onClick={() => setSelectedDay(prev => prev === day ? null : day)}
                  style={{
                    background: selectedDay === day ? '#e0f2fe' : day % 2 === 0 ? '#f9fafb' : '#fff',
                    cursor: 'pointer',
                    outline: selectedDay === day ? '2px solid #0ea5e9' : undefined,
                    outlineOffset: selectedDay === day ? '-1px' : undefined,
                  }}
                >
                  <td style={{ ..._tdS, textAlign: 'center', fontWeight: 600, color: '#374151', background: selectedDay === day ? '#bae6fd' : '#f0fdf4' }}>
                    {day}
                  </td>
                  {MONTHS.map(m => {
                    const valid   = day <= daysInMonth(m)
                    const future  = isFuture(m)
                    const val     = valid && !future ? (pivot[day][m] || 0) : null
                    const editable = EDITABLE_NK_MONTHS.has(m) && valid && !future && !!onSaveField
                    const isPopOpen = editPopover?.day === day && editPopover?.month === m
                    const cellContent = !valid
                      ? '—'
                      : future
                        ? <span style={{ fontSize: 10 }}>#N/A</span>
                        : val > 0 ? fmt(val) : <span style={{ fontSize: 10 }}>0</span>

                    if (editable) {
                      const cellRecords = dayMonthRecords[`${day}_${m}`] || []
                      return (
                        <td key={m} style={{
                          ..._tdS, textAlign: 'right', padding: 0,
                          color: val > 0 ? '#15803d' : '#d1d5db',
                          fontWeight: val > 0 ? 700 : 400,
                        }}>
                          <Popover
                            trigger="click"
                            open={isPopOpen}
                            onOpenChange={open => {
                              if (open) setEditPopover({ day, month: m })
                              else setEditPopover(null)
                            }}
                            content={
                              <CellPopoverContent
                                records={cellRecords}
                                day={day}
                                month={m}
                                year={year}
                                onSave={onSaveField}
                                onClose={() => setEditPopover(null)}
                              />
                            }
                          >
                            <div
                              onClick={e => e.stopPropagation()}
                              style={{
                                padding: '3px 6px', textAlign: 'right', cursor: 'pointer',
                                borderRadius: 2, transition: 'background .12s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#dcfce7'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              {cellContent}
                            </div>
                          </Popover>
                        </td>
                      )
                    }

                    return (
                      <td key={m} style={{
                        ..._tdS, textAlign: 'right',
                        background: !valid ? '#f3f4f6' : undefined,
                        color: !valid ? '#d1d5db' : future ? '#cbd5e1' : val > 0 ? '#15803d' : '#d1d5db',
                        fontWeight: val > 0 ? 700 : 400,
                      }}>
                        {cellContent}
                      </td>
                    )
                  })}
                  <td style={{ ..._tdS, textAlign: 'right', fontWeight: hasData ? 700 : 400, color: hasData ? '#1d4ed8' : '#e5e7eb', background: '#eff6ff' }}>
                    {hasData ? fmt(rowTotal) : ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#006666', color: '#fff', fontWeight: 700 }}>
              <td style={{ ..._tfS, color: '#fff', textAlign: 'left', fontSize: 11, letterSpacing: 0.3 }}>TỔNG NK</td>
              {MONTHS.map(m => (
                <td key={m} style={{ ..._tfS, color: '#fff', textAlign: 'right', opacity: isFuture(m) ? 0.55 : 1 }}>
                  {isFuture(m) ? <span style={{ fontSize: 10 }}>#N/A</span> : monthTotals[m] > 0 ? fmt(monthTotals[m]) : <span style={{ opacity: 0.5 }}>0</span>}
                </td>
              ))}
              <td style={{ ..._tfS, textAlign: 'right', background: '#003333', color: '#fff', fontSize: 13 }}>{fmt(grandTotal) || '0'}</td>
            </tr>
            <tr style={{ background: '#fefce8' }}>
              <td style={{ ..._tfS, color: '#92400e', fontWeight: 700, textAlign: 'left', fontSize: 11 }}>Mục tiêu</td>
              <td colSpan={12} style={{ ..._tfS, color: '#374151', textAlign: 'center' }}>
                {editMT ? (
                  <InputNumber
                    autoFocus size="small" min={0} step={100000}
                    value={mucTieu || undefined}
                    formatter={v => v ? Number(v).toLocaleString('vi-VN') : ''}
                    parser={v => v ? v.replace(/[^\d]/g, '') : ''}
                    onChange={v => onMucTieuChange(v || 0)}
                    onBlur={() => setEditMT(false)}
                    onPressEnter={() => setEditMT(false)}
                    style={{ width: 180 }}
                  />
                ) : (
                  <span
                    onClick={() => setEditMT(true)}
                    style={{ cursor: 'pointer', color: mucTieu > 0 ? '#92400e' : '#ccc', fontWeight: 700 }}
                  >
                    {mucTieu > 0 ? mucTieu.toLocaleString('vi-VN') : '✏ Nhấn để nhập mục tiêu năm'}
                  </span>
                )}
              </td>
              <td style={{ ..._tfS, textAlign: 'right', background: '#fef08a', color: '#92400e', fontWeight: 700 }}>
                {mucTieu > 0 ? mucTieu.toLocaleString('vi-VN') : '—'}
              </td>
            </tr>
            <tr style={{ background: surplus ? '#dcfce7' : '#fee2e2' }}>
              <td style={{ ..._tfS, fontWeight: 700, fontSize: 11, color: surplus ? '#15803d' : '#dc2626', textAlign: 'left' }}>
                {conThieu == null ? 'Còn thiếu' : surplus ? '✔ Vượt KH' : 'Còn thiếu'}
              </td>
              <td colSpan={12} style={{ ..._tfS, color: '#6b7280', fontSize: 11, textAlign: 'center' }}>
                {conThieu != null
                  ? surplus
                    ? `Vượt ${Math.abs(conThieu).toLocaleString('vi-VN')} so với mục tiêu`
                    : `Cần thêm ${conThieu.toLocaleString('vi-VN')} để đạt mục tiêu`
                  : 'Chưa có mục tiêu'}
              </td>
              <td style={{ ..._tfS, textAlign: 'right', fontWeight: 700, color: surplus ? '#15803d' : conThieu == null ? '#9ca3af' : '#dc2626' }}>
                {conThieu != null ? Math.abs(conThieu).toLocaleString('vi-VN') : '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Spin>
  )
}

// ─── NhapKhoTongHopTable ─────────────────────────────────────────────────────

function NhapKhoTongHopTable({ data, loading, onRowClick }) {
  const fmtN = v => v != null ? Number(v).toLocaleString('vi-VN') : '—'

  const columns = [
    {
      title: '#', key: 'stt', width: 46, align: 'center', fixed: 'left',
      render: (_, __, i) => <span style={{ color: '#bbb', fontSize: 11 }}>{i + 1}</span>,
    },
    {
      title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 110, fixed: 'left',
      render: v => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>{v || '—'}</span>,
    },
    {
      title: 'Mã SP', dataIndex: 'maTp', key: 'maTp', width: 80, align: 'center',
      render: v => v ? <Tag style={{ marginRight: 0 }}>{v}</Tag> : '—',
    },
    {
      title: 'Tên sản phẩm', dataIndex: 'tienTrinh', key: 'tienTrinh', width: 240, ellipsis: true,
      render: v => <Tooltip title={v}><span>{v || '—'}</span></Tooltip>,
    },
    {
      title: 'Số lô', dataIndex: 'lsx', key: 'lsx', width: 90, align: 'center',
      render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || '—'}</span>,
    },
    {
      title: 'SL Lệnh', dataIndex: 'soLuong', key: 'soLuong', width: 95, align: 'right',
      render: v => <span style={{ color: '#374151' }}>{fmtN(v)}</span>,
    },
    {
      title: 'SL ĐG', dataIndex: 'dg2', key: 'dg2', width: 95, align: 'right',
      render: v => v ? <span style={{ color: '#6b7280' }}>{Number(v).toLocaleString('vi-VN')}</span> : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Tổng NK', dataIndex: 'totalNhapKho', key: 'totalNhapKho', width: 110, align: 'right',
      render: (v, r) => {
        const total = v || 0
        if (total === 0) return <Tag style={{ borderStyle: 'dashed', color: '#d97706', marginRight: 0 }}>Chưa NK</Tag>
        const dg2V = parseInt(r.dg2) || 0
        const done = dg2V > 0 && total >= dg2V
        return (
          <span style={{ fontWeight: 700, color: done ? '#15803d' : '#1677ff' }}>
            {total.toLocaleString('vi-VN')}
          </span>
        )
      },
    },
    {
      title: 'Số lần', dataIndex: 'soLanNhapKho', key: 'soLanNhapKho', width: 75, align: 'center',
      render: v => v > 0
        ? <Tag color="blue" style={{ marginRight: 0 }}>{v} lần</Tag>
        : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Ngày NK mới nhất', dataIndex: 'ngayNhapKhoMoiNhat', key: 'ngayNhapKhoMoiNhat', width: 140, align: 'center',
      render: v => v
        ? <span style={{ color: '#374151', fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</span>
        : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Còn lại', key: 'conLai', width: 100, align: 'right',
      render: (_, r) => {
        const dg2V = parseInt(r.dg2) || 0
        const total = r.totalNhapKho || 0
        if (dg2V === 0) return <span style={{ color: '#d9d9d9' }}>—</span>
        const conLai = dg2V - total
        if (conLai <= 0) return <Tag color="success" style={{ marginRight: 0 }}>Hoàn tất</Tag>
        return <span style={{ color: '#cf1322', fontWeight: 600 }}>{conLai.toLocaleString('vi-VN')}</span>
      },
    },
    {
      title: 'Mã ĐH', dataIndex: 'maDonHang', key: 'maDonHang', width: 120,
      render: v => v ? <span style={{ fontSize: 12, color: '#6b7280' }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
  ]

  const totalNK = data.reduce((s, r) => s + (r.totalNhapKho || 0), 0)

  return (
    <Table
      size="small"
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      scroll={{ x: 1150 }}
      sticky={{ offsetHeader: TAB_BAR_H }}
      pagination={{ pageSize: 200, showSizeChanger: true, pageSizeOptions: ['100', '200', '500'], showTotal: t => `Tổng ${t} lô`, size: 'small' }}
      rowClassName={r => (r.totalNhapKho || 0) === 0 ? 'nk-tonghop-chua' : ''}
      onRow={record => ({
        onClick: () => onRowClick && onRowClick(record),
        style: { cursor: onRowClick ? 'pointer' : 'default' },
      })}
      summary={() => (
        <Table.Summary fixed="bottom">
          <Table.Summary.Row style={{ background: '#f0fdf4' }}>
            <Table.Summary.Cell colSpan={7} align="right">
              <strong style={{ color: '#374151' }}>Tổng ({data.length} lô)</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell align="right">
              <strong style={{ color: '#15803d' }}>{totalNK.toLocaleString('vi-VN')}</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell colSpan={4} />
          </Table.Summary.Row>
        </Table.Summary>
      )}
    />
  )
}

// ─── NhapKhoTab ───────────────────────────────────────────────────────────────

function NhapKhoTab() {
  const [data,          setData]          = useState([])
  const [loading,       setLoading]       = useState(false)
  const [saving,        setSaving]        = useState({})
  const [dateRange,     setDateRange]     = useState([null, null])
  const [editCell,      setEditCell]      = useState(null)
  const [addModalOpen,  setAddModalOpen]  = useState(false)
  const [drawerRecId,   setDrawerRecId]   = useState(null)
  const [viewMode,      setViewMode]      = useState('list')
  const [summaryYear,   setSummaryYear]   = useState(dayjs().year())
  const [summaryData,   setSummaryData]   = useState([])
  const [summaryLoading,setSummaryLoading]= useState(false)
  const [mucTieu,       setMucTieu]       = useState(() => parseInt(localStorage.getItem('nhapkho_muctieu') || '0', 10))
  const [ctxMenu,       setCtxMenu]       = useState(null)   // { x, y, record }
  const [tongHopData,   setTongHopData]   = useState([])
  const [tongHopLoading,setTongHopLoading]= useState(false)
  const [searchText,    setSearchText]    = useState('')
  const [tongHopDrawer, setTongHopDrawer] = useState(null)  // record từ tong-hop
  const [filterMaBravo, setFilterMaBravo] = useState('')
  const [filterMaSp,    setFilterMaSp]    = useState('')
  const [filterTinhTrang, setFilterTinhTrang] = useState('')

  const drawerRecord = drawerRecId != null ? data.find(r => r.id === drawerRecId) ?? null : null

  // Đóng context menu khi click ra ngoài
  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [ctxMenu])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (dateRange[0]) params.fromDate = dateRange[0].format('YYYY-MM-DD')
      if (dateRange[1]) params.toDate   = dateRange[1].format('YYYY-MM-DD')
      const { data: res } = await api.get('/production/nhap-kho', { params })
      setData(res)
    } catch { message.error('Không tải được danh sách nhập kho') }
    finally { setLoading(false) }
  }, [dateRange])

  useEffect(() => { load() }, [load])

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const { data: res } = await api.get('/production/nhap-kho', {
        params: { fromDate: `${summaryYear}-01-01`, toDate: `${summaryYear}-12-31` }
      })
      setSummaryData(res)
    } catch { message.error('Không tải được dữ liệu tổng hợp') }
    finally { setSummaryLoading(false) }
  }, [summaryYear])

  useEffect(() => { if (viewMode === 'summary') fetchSummary() }, [viewMode, fetchSummary])

  const saveSummaryField = useCallback(async (id, field, value) => {
    const body = { [field]: value != null ? String(value) : '' }
    const { data: updated } = await api.patch(`/production/${id}/nhap-kho`, body)
    setSummaryData(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r))
  }, [])

  const fetchTongHop = useCallback(async () => {
    setTongHopLoading(true)
    try {
      const { data: res } = await api.get('/production/nhap-kho-tong-hop')
      setTongHopData(res)
    } catch { message.error('Không tải được danh sách nhập kho tổng hợp') }
    finally { setTongHopLoading(false) }
  }, [])

  useEffect(() => { if (viewMode === 'tong-hop') fetchTongHop() }, [viewMode, fetchTongHop])

  const handleMucTieu = (v) => {
    setMucTieu(v)
    localStorage.setItem('nhapkho_muctieu', String(v))
  }

  const saveField = async (id, field, value) => {
    setSaving(s => ({ ...s, [`${id}_${field}`]: true }))
    try {
      const body = { [field]: value != null ? String(value) : '' }
      const { data: updated } = await api.patch(`/production/${id}/nhap-kho`, body)
      setData(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r))
      setEditCell(null)
    } catch { message.error('Cập nhật thất bại') }
    finally { setSaving(s => { const n = { ...s }; delete n[`${id}_${field}`]; return n }) }
  }

  const handleAdded = (updated) => {
    setData(prev => {
      const exists = prev.find(r => r.id === updated.id)
      return exists ? prev.map(r => r.id === updated.id ? { ...r, ...updated } : r) : [updated, ...prev]
    })
  }

  const removeRow = async (record) => {
    try {
      await api.delete(`/production/${record.id}/nhap-kho`)
      setData(prev => prev.filter(r => r.id !== record.id))
      if (drawerRecId === record.id) setDrawerRecId(null)
      message.success('Đã xóa khỏi danh sách nhập kho')
    } catch { message.error('Xóa thất bại') }
  }

  const fmtN = v => v != null ? Number(v).toLocaleString('vi-VN') : '—'

  const searchLower = searchText.trim().toLowerCase()

  // Sắp xếp: có ngày → mới nhất trước; không có ngày → cuối, theo số lô giảm dần
  const sortedData = useMemo(() => [...data].sort((a, b) => {
    const aD = a.ngayXuatKho, bD = b.ngayXuatKho
    if (aD && bD) return bD.localeCompare(aD)   // cùng có ngày: ngày mới hơn trước
    if (aD) return -1                             // a có ngày, b không → a trước
    if (bD) return 1                              // b có ngày, a không → b trước
    return (parseInt(b.lsx) || 0) - (parseInt(a.lsx) || 0)  // cùng chưa có ngày: số lô lớn hơn trước
  }), [data])

  const filteredListData = useMemo(() => {
    let result = sortedData
    if (searchLower)
      result = result.filter(r =>
        (r.tienTrinh || '').toLowerCase().includes(searchLower) ||
        (r.lsx || '').toLowerCase().includes(searchLower)
      )
    if (filterMaBravo.trim())
      result = result.filter(r => (r.maBravo || '').toLowerCase().includes(filterMaBravo.trim().toLowerCase()))
    if (filterMaSp.trim())
      result = result.filter(r => (r.maTp || '').toLowerCase().includes(filterMaSp.trim().toLowerCase()))
    if (filterTinhTrang)
      result = result.filter(r => filterTinhTrang === '__chua__'
        ? !r.tinhTrangNhapKho
        : (r.tinhTrangNhapKho || '') === filterTinhTrang)
    return result
  }, [sortedData, searchLower, filterMaBravo, filterMaSp, filterTinhTrang])

  const filteredTongHopData = useMemo(() => {
    if (!searchLower) return tongHopData
    return tongHopData.filter(r =>
      (r.tienTrinh || '').toLowerCase().includes(searchLower) ||
      (r.lsx || '').toLowerCase().includes(searchLower)
    )
  }, [tongHopData, searchLower])

  const columns = [
    {
      title: '#', key: 'stt', width: 46, align: 'center', fixed: 'left',
      render: (_, __, i) => <span style={{ color: '#bbb', fontSize: 11 }}>{i + 1}</span>,
    },
    {
      title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 100, fixed: 'left',
      render: v => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>{v || '—'}</span>,
    },
    {
      title: 'Mã SP', dataIndex: 'maTp', key: 'maTp', width: 80, align: 'center',
      render: v => v ? <Tag style={{ marginRight: 0 }}>{v}</Tag> : '—',
    },
    {
      title: 'Tên sản phẩm', dataIndex: 'tienTrinh', key: 'tienTrinh', width: 240, ellipsis: true,
      render: v => <Tooltip title={v}><span>{v || '—'}</span></Tooltip>,
    },
    {
      title: 'Số lô', dataIndex: 'lsx', key: 'lsx', width: 90, align: 'center',
      render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || '—'}</span>,
    },
    {
      title: 'SL Nhập Kho', dataIndex: 'tpNhapKho', key: 'tpNhapKho', width: 120, align: 'right',
      render: (v, r) => {
        const isEditing = editCell?.id === r.id && editCell?.field === 'tpNhapKho'
        if (isEditing) {
          return (
            <InputNumber
              size="small" autoFocus min={0} step={1} style={{ width: 100 }}
              defaultValue={v ?? undefined}
              formatter={val => val != null && val !== '' ? Number(val).toLocaleString('vi-VN') : ''}
              parser={val => val ? val.replace(/[^\d]/g, '') : ''}
              onClick={e => e.stopPropagation()}
              onPressEnter={e => {
                const num = e.target.value ? parseInt(e.target.value.replace(/[^\d]/g, ''), 10) : null
                saveField(r.id, 'tpNhapKho', isNaN(num) ? null : num)
              }}
              onBlur={e => {
                if (!saving[`${r.id}_tpNhapKho`]) {
                  const num = e.target.value ? parseInt(e.target.value.replace(/[^\d]/g, ''), 10) : null
                  saveField(r.id, 'tpNhapKho', isNaN(num) ? null : num)
                }
              }}
            />
          )
        }
        return (
          <div
            onClick={e => { e.stopPropagation(); setEditCell({ id: r.id, field: 'tpNhapKho' }) }}
            style={{ cursor: 'pointer', textAlign: 'right' }}
          >
            {v != null
              ? <span style={{ fontWeight: 700, color: '#15803d' }}>{Number(v).toLocaleString('vi-VN')}</span>
              : <Tag style={{ borderStyle: 'dashed', color: '#aaa', marginRight: 0, cursor: 'pointer' }}>Nhập</Tag>}
          </div>
        )
      },
    },
    {
      title: 'Ngày xuất', dataIndex: 'ngayXuatKho', key: 'ngayXuatKho', width: 120, align: 'center',
      render: (v, r) => {
        const isEditing = editCell?.id === r.id && editCell?.field === 'ngayXuatKho'
        const isSaving  = saving[`${r.id}_ngayXuatKho`]
        if (isEditing) {
          return (
            <DatePicker
              size="small" autoFocus style={{ width: 108 }}
              defaultValue={v ? dayjs(v) : undefined}
              format="DD/MM/YYYY"
              onClick={e => e.stopPropagation()}
              onChange={d => saveField(r.id, 'ngayXuatKho', d ? d.format('YYYY-MM-DD') : '')}
              onBlur={() => !isSaving && setEditCell(null)}
            />
          )
        }
        return (
          <div
            onClick={e => { e.stopPropagation(); setEditCell({ id: r.id, field: 'ngayXuatKho' }) }}
            style={{ cursor: 'pointer', color: v ? '#374151' : '#d9d9d9', textAlign: 'center' }}
          >
            {v ? dayjs(v).format('DD/MM/YYYY') : <Tag style={{ borderStyle: 'dashed', color: '#aaa', marginRight: 0 }}>Chọn ngày</Tag>}
          </div>
        )
      },
    },
    {
      title: 'Tình trạng', dataIndex: 'tinhTrangNhapKho', key: 'tinhTrangNhapKho', width: 110, align: 'center',
      render: (v, r) => {
        const isEditing = editCell?.id === r.id && editCell?.field === 'tinhTrangNhapKho'
        if (isEditing) {
          return (
            <Select
              size="small" autoFocus open style={{ width: 100 }}
              defaultValue={v || undefined}
              placeholder="Chọn..."
              onClick={e => e.stopPropagation()}
              onChange={val => saveField(r.id, 'tinhTrangNhapKho', val || '')}
              onBlur={() => setEditCell(null)}
              options={[
                { value: '', label: '—' },
                ...TINH_TRANG_NK_OPTIONS.map(o => ({ value: o, label: o })),
              ]}
            />
          )
        }
        return (
          <div
            onClick={e => { e.stopPropagation(); setEditCell({ id: r.id, field: 'tinhTrangNhapKho' }) }}
            style={{ cursor: 'pointer' }}
          >
            {v
              ? <Tag color={v === 'Done' ? 'success' : 'warning'} style={{ marginRight: 0, fontWeight: 700 }}>{v}</Tag>
              : <Tag style={{ borderStyle: 'dashed', color: '#aaa', marginRight: 0 }}>—</Tag>}
          </div>
        )
      },
    },
    {
      title: 'Tên NTH', dataIndex: 'tenNthNhapKho', key: 'tenNthNhapKho', width: 160, align: 'center',
      render: (v, r) => {
        const isEditing = editCell?.id === r.id && editCell?.field === 'tenNthNhapKho'
        if (isEditing) {
          return (
            <Input
              size="small" autoFocus style={{ width: 140 }}
              defaultValue={v || ''}
              onClick={e => e.stopPropagation()}
              onPressEnter={e => saveField(r.id, 'tenNthNhapKho', e.target.value.trim())}
              onBlur={e => { if (!saving[`${r.id}_tenNthNhapKho`]) saveField(r.id, 'tenNthNhapKho', e.target.value.trim()) }}
            />
          )
        }
        return (
          <div
            onClick={e => { e.stopPropagation(); setEditCell({ id: r.id, field: 'tenNthNhapKho' }) }}
            style={{ cursor: 'pointer' }}
          >
            {v
              ? <span style={{ color: '#374151' }}>{v}</span>
              : <Tag style={{ borderStyle: 'dashed', color: '#aaa', marginRight: 0 }}>—</Tag>}
          </div>
        )
      },
    },
    {
      title: 'Ghi chú', dataIndex: 'ghiChuNhapKho', key: 'ghiChuNhapKho', width: 200,
      render: (v, r) => {
        const isEditing = editCell?.id === r.id && editCell?.field === 'ghiChuNhapKho'
        if (isEditing) {
          return (
            <Input
              size="small" autoFocus style={{ width: 180 }}
              defaultValue={v || ''}
              onClick={e => e.stopPropagation()}
              onPressEnter={e => saveField(r.id, 'ghiChuNhapKho', e.target.value.trim())}
              onBlur={e => { if (!saving[`${r.id}_ghiChuNhapKho`]) saveField(r.id, 'ghiChuNhapKho', e.target.value.trim()) }}
            />
          )
        }
        return (
          <Tooltip title={v}>
            <div
              onClick={e => { e.stopPropagation(); setEditCell({ id: r.id, field: 'ghiChuNhapKho' }) }}
              style={{ cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {v
                ? <span style={{ color: '#6b7280', fontSize: 12 }}>{v}</span>
                : <Tag style={{ borderStyle: 'dashed', color: '#aaa', marginRight: 0 }}>—</Tag>}
            </div>
          </Tooltip>
        )
      },
    },
  ]

  const totalSl    = data.reduce((s, r) => s + (r.tpNhapKho || 0), 0)
  const doneCount  = data.filter(r => r.tinhTrangNhapKho === 'Done').length
  const chotCount  = data.filter(r => r.tinhTrangNhapKho === 'Chốt').length

  return (
    <div style={{ padding: '12px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, color: '#006666', fontSize: 14 }}>📦 Nhập Kho Thành Phẩm</span>
        <Segmented
          size="small"
          value={viewMode}
          onChange={setViewMode}
          options={[
            { label: 'Ngày Nhập Kho', value: 'list' },
            { label: 'Nhập Kho', value: 'tong-hop' },
            { label: 'Tổng hợp theo ngày', value: 'summary' },
          ]}
        />
        {viewMode === 'list' ? (
          <>
            <RangePicker
              size="small" format="DD/MM/YYYY"
              value={dateRange}
              onChange={r => setDateRange(r || [null, null])}
              placeholder={['Từ ngày xuất', 'Đến ngày']}
              allowEmpty={[true, true]}
              style={{ width: 260 }}
            />
            <Input
              size="small" allowClear placeholder="Mã Bravo"
              value={filterMaBravo} onChange={e => setFilterMaBravo(e.target.value)}
              style={{ width: 110 }}
            />
            <Input
              size="small" allowClear placeholder="Mã SP"
              value={filterMaSp} onChange={e => setFilterMaSp(e.target.value)}
              style={{ width: 90 }}
            />
            <Input.Search
              size="small" allowClear placeholder="Tên SP / Số lô..."
              value={searchText} onChange={e => setSearchText(e.target.value)}
              style={{ width: 190 }}
            />
            <Select
              size="small" allowClear placeholder="Tình trạng"
              value={filterTinhTrang || undefined}
              onChange={v => setFilterTinhTrang(v || '')}
              style={{ width: 120 }}
              options={[
                ...TINH_TRANG_NK_OPTIONS.map(o => ({ value: o, label: o })),
                { value: '__chua__', label: 'Chưa' },
              ]}
            />
            <Button size="small" icon={<ReloadOutlined />} onClick={load} loading={loading}>Tải lại</Button>
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>
              Thêm sản phẩm
            </Button>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
              <span>Tổng: <strong style={{ color: '#15803d' }}>{fmtN(totalSl)}</strong></span>
              <Tag color="success">Done: {doneCount}</Tag>
              <Tag color="warning">Chốt: {chotCount}</Tag>
              <span style={{ color: '#bbb' }}>Chưa: {data.length - doneCount - chotCount}</span>
            </div>
          </>
        ) : viewMode === 'tong-hop' ? (
          <>
            <Input.Search
              size="small" allowClear placeholder="Tên SP / Số lô..."
              value={searchText} onChange={e => setSearchText(e.target.value)}
              style={{ width: 200 }}
            />
            <Button size="small" icon={<ReloadOutlined />} onClick={fetchTongHop} loading={tongHopLoading}>Tải lại</Button>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
              <span>Tổng lệnh: <strong style={{ color: '#1d4ed8' }}>{filteredTongHopData.length}</strong></span>
              <span>Đã NK: <strong style={{ color: '#15803d' }}>{filteredTongHopData.filter(r => (r.totalNhapKho || 0) > 0).length}</strong></span>
              <span>Chưa NK: <strong style={{ color: '#d97706' }}>{filteredTongHopData.filter(r => (r.totalNhapKho || 0) === 0).length}</strong></span>
            </div>
          </>
        ) : (
          <>
            <DatePicker
              picker="year"
              size="small"
              value={dayjs().year(summaryYear)}
              onChange={d => d && setSummaryYear(d.year())}
              allowClear={false}
              style={{ width: 100 }}
            />
            <Button size="small" icon={<ReloadOutlined />} onClick={fetchSummary} loading={summaryLoading}>Tải lại</Button>
            <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: 12 }}>
              Tổng năm {summaryYear}: <strong style={{ color: '#15803d' }}>
                {summaryData.reduce((s, r) => s + (r.tpNhapKho || 0), 0).toLocaleString('vi-VN')}
              </strong>
            </span>
          </>
        )}
      </div>

      {viewMode === 'summary' ? (
        <NhapKhoSummaryView
          data={summaryData}
          year={summaryYear}
          mucTieu={mucTieu}
          onMucTieuChange={handleMucTieu}
          loading={summaryLoading}
          onSaveField={saveSummaryField}
        />
      ) : viewMode === 'tong-hop' ? (
        <NhapKhoTongHopTable data={filteredTongHopData} loading={tongHopLoading} onRowClick={setTongHopDrawer} />
      ) : (
      <Table
        size="small"
        rowKey="id"
        columns={columns}
        dataSource={filteredListData}
        loading={loading}
        scroll={{ x: 1100 }}
        sticky={{ offsetHeader: TAB_BAR_H }}
        pagination={{ pageSize: 200, showSizeChanger: true, pageSizeOptions: ['100', '200', '500'], showTotal: t => `Tổng ${t} lô`, size: 'small' }}
        rowHoverable
        rowClassName={() => 'nhapkho-row'}
        onRow={record => ({
          onClick: () => {
            if (editCell?.id === record.id) return
            setDrawerRecId(record.id)
          },
          onContextMenu: (e) => {
            e.preventDefault()
            setCtxMenu({ x: e.clientX, y: e.clientY, record })
          },
          style: { cursor: 'pointer' },
        })}
        summary={() => (
          <Table.Summary fixed="bottom">
            <Table.Summary.Row style={{ background: '#f0fdf4' }}>
              <Table.Summary.Cell colSpan={5} align="right">
                <strong style={{ color: '#374151' }}>Tổng ({data.length} lô)</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell align="right">
                <strong style={{ color: '#15803d' }}>{fmtN(totalSl)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell colSpan={3} />
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
      )}

      {/* Context menu chuột phải */}
      {ctxMenu && (
        <div
          style={{
            position: 'fixed', zIndex: 9999,
            top: ctxMenu.y, left: ctxMenu.x,
            background: '#fff', borderRadius: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            border: '1px solid #f0f0f0',
            minWidth: 180, overflow: 'hidden',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ padding: '6px 0', fontSize: 12, color: '#6b7280', borderBottom: '1px solid #f3f4f6', paddingLeft: 12, paddingBottom: 6 }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{ctxMenu.record.maBravo}</span>
            {' '}Lô {ctxMenu.record.lsx}
          </div>
          <Popconfirm
            title="Xóa khỏi Nhập Kho?"
            description="Hàng này sẽ bị xóa khỏi danh sách nhập kho."
            onConfirm={() => { removeRow(ctxMenu.record); setCtxMenu(null) }}
            onCancel={() => setCtxMenu(null)}
            okText="Xóa" cancelText="Thôi"
            okButtonProps={{ danger: true }}
          >
            <div style={{
              padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              color: '#ef4444', fontWeight: 500,
              transition: 'background .15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              🗑 Xóa khỏi Nhập Kho
            </div>
          </Popconfirm>
        </div>
      )}

      {/* Drawer chi tiết Nhập Kho (tong-hop) */}
      <Drawer
        title={
          tongHopDrawer
            ? <span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>{tongHopDrawer.maBravo}</span>
                {' '}<Tag style={{ marginLeft: 4 }}>{tongHopDrawer.maTp}</Tag>
              </span>
            : 'Chi tiết nhập kho'
        }
        open={tongHopDrawer != null}
        onClose={() => setTongHopDrawer(null)}
        width={400}
        destroyOnClose
      >
        {tongHopDrawer && (() => {
          const r = tongHopDrawer
          const fmtN = v => v != null ? Number(v).toLocaleString('vi-VN') : '—'
          const dg2V = parseInt(r.dg2) || 0
          const total = r.totalNhapKho || 0
          const conLai = dg2V > 0 ? dg2V - total : null
          const done = dg2V > 0 && total >= dg2V
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#f9fafb', borderRadius: 6, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <div><span style={{ color: '#6b7280', minWidth: 120, display: 'inline-block' }}>Tên sản phẩm:</span> <strong>{r.tienTrinh || '—'}</strong></div>
                <div><span style={{ color: '#6b7280', minWidth: 120, display: 'inline-block' }}>Số lô:</span> <span style={{ fontFamily: 'monospace' }}>{r.lsx || '—'}</span></div>
                <div><span style={{ color: '#6b7280', minWidth: 120, display: 'inline-block' }}>Mã ĐH:</span> <span>{r.maDonHang || '—'}</span></div>
              </div>

              <Divider style={{ margin: 0 }}>Sản lượng</Divider>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>SL Lệnh (cỡ lô):</span>
                  <strong>{fmtN(r.soLuong)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>SL Đóng Gói:</span>
                  <span style={{ color: '#374151', fontWeight: 600 }}>{fmtN(r.dg2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
                  <span style={{ color: '#6b7280' }}>Tổng Nhập Kho:</span>
                  <span style={{ fontWeight: 700, fontSize: 15, color: done ? '#15803d' : total > 0 ? '#1677ff' : '#d97706' }}>
                    {total > 0 ? total.toLocaleString('vi-VN') : 'Chưa NK'}
                  </span>
                </div>
                {conLai != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Còn lại:</span>
                    {conLai <= 0
                      ? <Tag color="success" style={{ marginRight: 0 }}>Hoàn tất</Tag>
                      : <span style={{ color: '#cf1322', fontWeight: 600 }}>{conLai.toLocaleString('vi-VN')}</span>}
                  </div>
                )}
              </div>

              <Divider style={{ margin: 0 }}>Lịch sử nhập kho</Divider>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Số lần nhập kho:</span>
                  {r.soLanNhapKho > 0
                    ? <Tag color="blue" style={{ marginRight: 0 }}>{r.soLanNhapKho} lần</Tag>
                    : <span style={{ color: '#bbb' }}>—</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Ngày NK mới nhất:</span>
                  <span style={{ color: '#374151' }}>
                    {r.ngayNhapKhoMoiNhat ? dayjs(r.ngayNhapKhoMoiNhat).format('DD/MM/YYYY') : '—'}
                  </span>
                </div>
              </div>
            </div>
          )
        })()}
      </Drawer>

      {/* Modal thêm */}
      <AddNhapKhoModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdded={handleAdded}
      />

      {/* Drawer chi tiết */}
      <Drawer
        title={
          drawerRecord
            ? <span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>{drawerRecord.maBravo}</span>
                {' '}<Tag style={{ marginLeft: 4 }}>{drawerRecord.maTp}</Tag>
              </span>
            : 'Chi tiết nhập kho'
        }
        open={drawerRecId != null}
        onClose={() => { setDrawerRecId(null); setEditCell(null) }}
        width={400}
        destroyOnClose={false}
      >
        {drawerRecord && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Thông tin cơ bản */}
            <div style={{ background: '#f9fafb', borderRadius: 6, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              <div><span style={{ color: '#6b7280', minWidth: 110, display: 'inline-block' }}>Tên sản phẩm:</span> <strong>{drawerRecord.tienTrinh || '—'}</strong></div>
              <div><span style={{ color: '#6b7280', minWidth: 110, display: 'inline-block' }}>Số lô:</span> <span style={{ fontFamily: 'monospace' }}>{drawerRecord.lsx || '—'}</span></div>
              <div><span style={{ color: '#6b7280', minWidth: 110, display: 'inline-block' }}>SL kế hoạch:</span> {drawerRecord.soLuong?.toLocaleString('vi-VN') || '—'}</div>
            </div>

            <Divider style={{ margin: '0' }}>Thông tin nhập kho</Divider>

            {/* SL Nhập Kho */}
            <div>
              <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 13, color: '#374151' }}>SL Nhập Kho</div>
              {editCell?.id === drawerRecord.id && editCell?.field === 'tpNhapKho_drawer' ? (
                <InputNumber
                  autoFocus min={0} step={1} style={{ width: '100%' }}
                  defaultValue={drawerRecord.tpNhapKho ?? undefined}
                  formatter={val => val != null && val !== '' ? Number(val).toLocaleString('vi-VN') : ''}
                  parser={val => val ? val.replace(/[^\d]/g, '') : ''}
                  onPressEnter={e => {
                    const num = e.target.value ? parseInt(e.target.value.replace(/[^\d]/g, ''), 10) : null
                    saveField(drawerRecord.id, 'tpNhapKho', isNaN(num) ? null : num)
                  }}
                  onBlur={e => {
                    if (!saving[`${drawerRecord.id}_tpNhapKho`]) {
                      const num = e.target.value ? parseInt(e.target.value.replace(/[^\d]/g, ''), 10) : null
                      saveField(drawerRecord.id, 'tpNhapKho', isNaN(num) ? null : num)
                    }
                  }}
                />
              ) : (
                <div
                  onClick={() => setEditCell({ id: drawerRecord.id, field: 'tpNhapKho_drawer' })}
                  style={{ cursor: 'pointer', padding: '4px 8px', border: '1px dashed #d9d9d9', borderRadius: 4, minHeight: 32, display: 'flex', alignItems: 'center' }}
                >
                  {drawerRecord.tpNhapKho != null
                    ? <span style={{ fontWeight: 700, color: '#15803d', fontSize: 15 }}>{drawerRecord.tpNhapKho.toLocaleString('vi-VN')}</span>
                    : <span style={{ color: '#bbb' }}>Nhấn để nhập...</span>}
                </div>
              )}
            </div>

            {/* Ngày xuất */}
            <div>
              <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 13, color: '#374151' }}>Ngày xuất</div>
              {editCell?.id === drawerRecord.id && editCell?.field === 'ngayXuatKho_drawer' ? (
                <DatePicker
                  autoFocus style={{ width: '100%' }} format="DD/MM/YYYY"
                  defaultValue={drawerRecord.ngayXuatKho ? dayjs(drawerRecord.ngayXuatKho) : undefined}
                  onChange={d => saveField(drawerRecord.id, 'ngayXuatKho', d ? d.format('YYYY-MM-DD') : '')}
                  onBlur={() => !saving[`${drawerRecord.id}_ngayXuatKho`] && setEditCell(null)}
                />
              ) : (
                <div
                  onClick={() => setEditCell({ id: drawerRecord.id, field: 'ngayXuatKho_drawer' })}
                  style={{ cursor: 'pointer', padding: '4px 8px', border: '1px dashed #d9d9d9', borderRadius: 4, minHeight: 32, display: 'flex', alignItems: 'center' }}
                >
                  {drawerRecord.ngayXuatKho
                    ? <span style={{ color: '#374151' }}>{dayjs(drawerRecord.ngayXuatKho).format('DD/MM/YYYY')}</span>
                    : <span style={{ color: '#bbb' }}>Nhấn để chọn ngày...</span>}
                </div>
              )}
            </div>

            {/* Tình trạng */}
            <div>
              <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 13, color: '#374151' }}>Tình trạng</div>
              <Select
                style={{ width: '100%' }}
                value={drawerRecord.tinhTrangNhapKho || undefined}
                placeholder="— Chọn —" allowClear
                onChange={val => saveField(drawerRecord.id, 'tinhTrangNhapKho', val || '')}
                options={TINH_TRANG_NK_OPTIONS.map(o => ({ value: o, label: o }))}
              />
            </div>

            {/* Tên NTH */}
            <div>
              <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 13, color: '#374151' }}>Tên NTH</div>
              {editCell?.id === drawerRecord.id && editCell?.field === 'tenNthNhapKho_drawer' ? (
                <Input
                  autoFocus defaultValue={drawerRecord.tenNthNhapKho || ''}
                  onPressEnter={e => saveField(drawerRecord.id, 'tenNthNhapKho', e.target.value.trim())}
                  onBlur={e => { if (!saving[`${drawerRecord.id}_tenNthNhapKho`]) saveField(drawerRecord.id, 'tenNthNhapKho', e.target.value.trim()) }}
                />
              ) : (
                <div
                  onClick={() => setEditCell({ id: drawerRecord.id, field: 'tenNthNhapKho_drawer' })}
                  style={{ cursor: 'pointer', padding: '4px 8px', border: '1px dashed #d9d9d9', borderRadius: 4, minHeight: 32, display: 'flex', alignItems: 'center' }}
                >
                  {drawerRecord.tenNthNhapKho
                    ? <span style={{ color: '#374151' }}>{drawerRecord.tenNthNhapKho}</span>
                    : <span style={{ color: '#bbb' }}>Nhấn để nhập...</span>}
                </div>
              )}
            </div>

            {/* Ghi chú */}
            <div>
              <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 13, color: '#374151' }}>Ghi chú</div>
              {editCell?.id === drawerRecord.id && editCell?.field === 'ghiChuNhapKho_drawer' ? (
                <Input.TextArea
                  autoFocus rows={3} defaultValue={drawerRecord.ghiChuNhapKho || ''}
                  onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); saveField(drawerRecord.id, 'ghiChuNhapKho', e.target.value.trim()) } }}
                  onBlur={e => { if (!saving[`${drawerRecord.id}_ghiChuNhapKho`]) saveField(drawerRecord.id, 'ghiChuNhapKho', e.target.value.trim()) }}
                />
              ) : (
                <div
                  onClick={() => setEditCell({ id: drawerRecord.id, field: 'ghiChuNhapKho_drawer' })}
                  style={{ cursor: 'pointer', padding: '4px 8px', border: '1px dashed #d9d9d9', borderRadius: 4, minHeight: 60, whiteSpace: 'pre-wrap', fontSize: 13 }}
                >
                  {drawerRecord.ghiChuNhapKho
                    ? <span style={{ color: '#374151' }}>{drawerRecord.ghiChuNhapKho}</span>
                    : <span style={{ color: '#bbb' }}>Nhấn để nhập ghi chú...</span>}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}

// ─── Page chính: wrapper Tabs ─────────────────────────────────────────────────

export default function DailySanLuongPage() {
  const { user, isAdmin, isAdminKH, isManHinh, isTKSX, isTPSX } = useAuth()
  const canApprove     = isAdmin() || isAdminKH()
  const canViewAnalytics = isAdmin() || isTKSX() || isTPSX()
  const canViewNhapKho = isAdmin() || isAdminKH() || user?.role === 'ADMIN_DG'
  const manHinh = isManHinh()
  const location = useLocation()

  // Đọc ?tab= từ URL, fallback localStorage, rồi mới default 'daily'
  const tabFromUrl = new URLSearchParams(location.search).get('tab')
  const [activeTab, setActiveTab] = useState(() => {
    if (manHinh) return 'baocao'
    const t = tabFromUrl || localStorage.getItem('dailysl_activeTab') || 'daily'
    if (!canViewAnalytics && (t === 'thongke' || t === 'phantich')) return 'daily'
    if (!canViewNhapKho && t === 'nhapkho') return 'daily'
    return t
  })

  // Cập nhật activeTab khi URL thay đổi
  useEffect(() => {
    const t = new URLSearchParams(location.search).get('tab')
    if (t) setActiveTab(t)
  }, [location.search])

  // Lưu tab đang active vào localStorage
  useEffect(() => {
    localStorage.setItem('dailysl_activeTab', activeTab)
  }, [activeTab])

  // Đếm pending để hiển thị badge trên tab
  const [pendingCount, setPendingCount] = useState(0)
  useEffect(() => {
    api.get('/work-schedule-session/daily-report', {
      params: { fromDate: dayjs().subtract(6, 'day').format('YYYY-MM-DD'), toDate: dayjs().format('YYYY-MM-DD') }
    }).then(({ data }) => {
      setPendingCount(data.filter(r => r.status === 'PENDING').length)
    }).catch(() => {})
  }, [])

  const tabItems = [
    ...(!manHinh ? [{
      key: 'daily',
      label: (
        <span>
          <BarChartOutlined style={{ marginRight: 5 }} />
          Sản lượng theo ngày
          {canApprove && pendingCount > 0 && (
            <Badge count={pendingCount} style={{ marginLeft: 6, background: '#fa8c16' }} />
          )}
        </span>
      ),
      children: <DailyDetailTab />,
    }] : []),
    ...(!manHinh ? [{
      key: 'tonghop',
      label: (
        <span>
          <FundOutlined style={{ marginRight: 5 }} />
          Tổng hợp sản lượng
        </span>
      ),
      children: <TongHopTab />,
    }] : []),
    ...(!manHinh ? [{
      key: 'tonghop_chitet',
      label: (
        <span>
          <FundOutlined style={{ marginRight: 5 }} />
          Tổng hợp Chi tiết
        </span>
      ),
      children: <TongHopChiTietTab />,
    }] : []),
    ...(!manHinh ? [{
      key: 'phantich_chitet',
      label: (
        <span>
          <BarChartOutlined style={{ marginRight: 5 }} />
          Phân Tích Chi Tiết
        </span>
      ),
      children: <PhanTichChiTietTab />,
    }] : []),
    {
      key: 'baocao',
      label: (
        <span>
          <RiseOutlined style={{ marginRight: 5 }} />
          Báo cáo tổng hợp ngày
        </span>
      ),
      children: <BaoCaoTab />,
    },
    ...(canViewAnalytics ? [{
      key: 'thongke',
      label: (
        <span>
          <BarChartOutlined style={{ marginRight: 5 }} />
          Thống kê sản xuất
        </span>
      ),
      children: <ThongKeSanXuatTab />,
    }] : []),
    ...(canViewAnalytics ? [{
      key: 'phantich',
      label: (
        <span>
          <FundOutlined style={{ marginRight: 5 }} />
          Phân tích sản lượng
        </span>
      ),
      children: <PhanTichSanLuongTab />,
    }] : []),
    ...(canViewNhapKho ? [{
      key: 'nhapkho',
      label: (
        <span>
          📦 Nhập Kho
        </span>
      ),
      children: <NhapKhoTab />,
    }] : []),
  ]

  return (
    <>
      <style>{`
        .sl-page-tabs > .ant-tabs-nav {
          background: #33CCCC !important;
          padding: 0 12px; margin: 0 !important; box-shadow: 0 2px 12px rgba(0,0,0,0.22);
          position: sticky !important; top: 0; z-index: 10;
        }
        .sl-page-tabs > .ant-tabs-nav .ant-tabs-tab {
          color: #ffffff !important; border: none !important; background: transparent !important;
          padding: 9px 18px !important; font-size: 13px; margin: 0 2px !important;
          border-radius: 6px 6px 0 0 !important; transition: all 0.2s;
        }
        .sl-page-tabs > .ant-tabs-nav .ant-tabs-tab:hover { color: #e0ffff !important; background: rgba(255,255,255,0.15) !important; }
        .sl-page-tabs > .ant-tabs-nav .ant-tabs-tab-active { color: #0e7490 !important; background: #ffffff !important; font-weight: 700; border-radius: 6px 6px 0 0 !important; }
        .sl-page-tabs > .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-btn { color: #0e7490 !important; }
        .sl-page-tabs > .ant-tabs-nav .ant-tabs-ink-bar { background: #0e7490 !important; height: 3px !important; border-radius: 2px; }
        .sl-page-tabs > .ant-tabs-nav::before { border-bottom: none !important; }
        .sl-page-tabs > .ant-tabs-nav .ant-tabs-nav-more { color: #ffffff !important; }
        .sl-page-tabs > .ant-tabs-content-holder { padding-top: 0; }
      `}</style>
      <Tabs
        className="sl-page-tabs"
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="middle"
        style={{ marginTop: -8 }}
        tabBarStyle={{ marginBottom: 0 }}
      />
    </>
  )
}
