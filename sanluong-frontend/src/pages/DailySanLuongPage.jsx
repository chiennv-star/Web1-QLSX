import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Rnd } from 'react-rnd'
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
  FullscreenOutlined, FullscreenExitOutlined, ArrowRightOutlined, PlusOutlined, EyeOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import useCellNav from '../hooks/useCellNav'
import { StageTab, STAGE_CONFIG } from './WorkSchedulePage'
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

// Resolve session → { cd, addSL }
// PCPL1: PC session chỉ đóng góp CÔNG (SL lấy từ PL session PCPL1)
//        PL session nhomThucHien=PCPL1 → cả SL + CÔNG
// PL column: chỉ PL session của nhóm PCPL2/PCPL3 (không lấy PCPL1)
function resolveSession(r) {
  let cd = r.congDoan?.toUpperCase()
  if (!cd) return null
  if (cd === 'PCPL3') cd = 'PL'
  const nhom = (r.nhomThucHien || r.toNhom)?.toUpperCase()
  if (cd === 'PC') {
    if (nhom === 'PCPL2') return { cd: 'PCPL2', addSL: true }
    if (nhom === 'PCPL3' || nhom === 'PL') return { cd: 'PL', addSL: true }
    return { cd: 'PCPL1', addSL: false } // PCPL1 (và fallback): công có, SL không
  }
  if (cd === 'PL') {
    if (nhom === 'PCPL1') return { cd: 'PCPL1', addSL: true }
    return { cd: 'PL', addSL: true }
  }
  return { cd, addSL: true }
}

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

  const getDeptKey = (r) => resolveGdCd(r)

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

// ─── Modal chi tiết bản ghi sản xuất ─────────────────────────────────────────
function RecordDetailModal({ open, record, onClose }) {
  const [sessions, setSessions]     = useState([])
  const [sessLoading, setSessLoading] = useState(false)

  useEffect(() => {
    if (!open || !record?.workScheduleId) { setSessions([]); return }
    setSessLoading(true)
    api.get('/work-schedule-session', { params: { scheduleId: record.workScheduleId } })
      .then(({ data }) => {
        const dayStr = record.ngay
        setSessions(data.filter(s => {
          const sDay = s.ngay || s.ngayThucHien
          if (!sDay) return false
          const sd = typeof sDay === 'string' ? sDay.slice(0, 10) : String(sDay).slice(0, 10)
          return sd === dayStr
        }))
      })
      .catch(() => setSessions([]))
      .finally(() => setSessLoading(false))
  }, [open, record?.workScheduleId, record?.ngay])

  const totalCong = sessions.reduce((s, r) => s + Number(r.congThucHien || 0), 0)
  const sl        = Number(record?.sanLuong || 0)
  const ns        = totalCong > 0 && sl > 0 ? sl / totalCong : null

  const sessCols = [
    { title: '#', width: 36, align: 'center',
      render: (_, __, i) => <span style={{ color: '#aaa', fontSize: 11 }}>{i + 1}</span> },
    { title: 'Người thực hiện', dataIndex: 'nguoiThucHien', key: 'nguoi', width: 170,
      render: v => v || <span style={{ color: '#ccc' }}>—</span> },
    { title: 'Vai trò', dataIndex: 'vaiTro', key: 'vaiTro', width: 110, align: 'center',
      render: v => !v ? <span style={{ color: '#ccc' }}>—</span>
        : <Tag color={v.toLowerCase().includes('trưởng') ? 'gold' : 'geekblue'} style={{ marginRight: 0 }}>{v}</Tag> },
    { title: 'Ca', dataIndex: 'caSanXuat', key: 'ca', width: 66, align: 'center',
      render: v => v ? <Tag color="orange" style={{ marginRight: 0, fontSize: 11 }}>{v}</Tag> : <span style={{ color: '#ccc' }}>—</span> },
    { title: 'Giờ', key: 'gio', width: 96, align: 'center',
      render: (_, r) => {
        const bd = r.thoiGianBatDau, kt = r.thoiGianKetThuc
        return (!bd && !kt)
          ? <span style={{ color: '#ccc' }}>—</span>
          : <span style={{ fontSize: 11, fontFamily: 'monospace' }}>{bd || '?'}–{kt || '?'}</span>
      }},
    { title: 'Giờ TH', dataIndex: 'soGioThucHien', key: 'soGio', width: 70, align: 'center',
      render: v => v != null ? <span style={{ fontFamily: 'monospace' }}>{Number(v).toFixed(2)}</span> : <span style={{ color: '#ccc' }}>—</span> },
    { title: 'Công TH', dataIndex: 'congThucHien', key: 'cong', width: 88, align: 'center',
      render: v => v != null
        ? <span style={{ color: '#1d4ed8', fontWeight: 700, fontFamily: 'monospace' }}>{Number(v).toFixed(4)}</span>
        : <span style={{ color: '#ccc' }}>—</span> },
    { title: 'Tăng ca', dataIndex: 'isTangCa', key: 'tc', width: 66, align: 'center',
      render: v => v ? <Tag color="red" style={{ marginRight: 0, fontSize: 10 }}>TC</Tag> : <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'Ghi chú', dataIndex: 'ghiChu', key: 'gc',
      render: v => v ? <span style={{ fontSize: 11, color: '#555' }}>{v}</span> : <span style={{ color: '#ccc' }}>—</span> },
  ]

  if (!record) return null
  const infoItems = [
    { label: 'Mã Bravo',  value: record.maBravo },
    { label: 'Số Lô',     value: record.soLo },
    { label: 'Cỡ Lô',     value: record.coLo != null ? Number(record.coLo).toLocaleString('vi-VN') + ' SP' : null },
    { label: 'Công Đoạn', value: record.congDoan },
    { label: 'Tổ/Nhóm',  value: record.toNhom || record.nhomThucHien },
    { label: 'Ngày SX',   value: record.ngay ? dayjs(record.ngay).format('DD/MM/YYYY') : null },
    { label: 'Ca SX',     value: record.caSanXuat },
    { label: 'Phòng TH',  value: record.phongThucHien },
    { label: 'Sản lượng', value: record.sanLuong != null ? Number(record.sanLuong).toLocaleString('vi-VN') + ' SP' : 'Chưa nhập' },
  ]

  return (
    <Modal open={open} onCancel={onClose}
      footer={<Button onClick={onClose}>Đóng</Button>}
      width={900}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tag color={CONG_DOAN_COLOR[record.congDoan] || 'default'} style={{ fontWeight: 700, fontSize: 13, marginRight: 0 }}>
            {record.congDoan}
          </Tag>
          <span style={{ fontWeight: 700, color: '#1a3a6b', fontSize: 14 }}>
            {record.tenTrinh || record.maBravo || '—'}
          </span>
        </div>
      }
      destroyOnClose
    >
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px 20px',
        marginBottom: 14, background: '#f8faff', border: '1px solid #dbeafe',
        borderRadius: 8, padding: '10px 14px',
      }}>
        {infoItems.map(({ label, value }) => (
          <div key={label} style={{ fontSize: 12 }}>
            <span style={{ color: '#6b7280', marginRight: 4 }}>{label}:</span>
            <b style={{ color: value && value !== 'Chưa nhập' ? '#1a3a6b' : (value === 'Chưa nhập' ? '#dc2626' : '#d1d5db') }}>
              {value || '—'}
            </b>
          </div>
        ))}
      </div>

      <div style={{ fontWeight: 600, color: '#1d4ed8', fontSize: 12, marginBottom: 6 }}>
        Chi tiết thực hiện ngày {record.ngay ? dayjs(record.ngay).format('DD/MM/YYYY') : '—'}
        <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>({sessions.length} phiên)</span>
      </div>
      <Table size="small" dataSource={sessions} columns={sessCols} rowKey="id"
        loading={sessLoading} pagination={false} scroll={{ x: 800 }}
        summary={() => sessions.length > 0 && (
          <Table.Summary.Row style={{ background: '#eff6ff', fontWeight: 700 }}>
            <Table.Summary.Cell index={0} colSpan={6} align="right">
              <span style={{ color: '#374151', fontSize: 11 }}>Tổng cộng</span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={6} align="center">
              <span style={{ color: '#1d4ed8', fontFamily: 'monospace' }}>{totalCong.toFixed(4)}</span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={7} colSpan={2} align="center">
              {ns != null && (
                <span style={{ color: '#059669', fontSize: 11 }}>
                  NS: {ns.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} SP/công
                </span>
              )}
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </Modal>
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
  const [detailRecord, setDetailRecord] = useState(null)
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
      const cd = resolveGdCd(r)
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
      render: (v, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontWeight: 700, color: '#1677ff' }}>{v ? dayjs(v).format('DD/MM/YYYY') : '—'}</span>
          <Tooltip title="Xem chi tiết">
            <EyeOutlined
              style={{ color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}
              onClick={e => { e.stopPropagation(); setDetailRecord(r) }}
            />
          </Tooltip>
        </div>
      ),
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
      title: 'Phòng TH', dataIndex: 'phongThucHien', key: 'phongThucHien', width: 130,
      render: v => v
        ? <Tooltip title={v}><span style={{ fontSize: 11, color: '#444', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{v}</span></Tooltip>
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

  const handleCellEdit = useCallback((row) => {
    const record = filteredData[row]
    if (record) setDetailRecord(record)
  }, [filteredData])
  const cellNav = useCellNav({ rowCount: filteredData.length, colCount: columns.length, onEdit: handleCellEdit })
  const navColumns = cellNav.withNav(columns)

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
          format="DD/MM/YYYY" allowClear placeholder={['Từ ngày', 'Đến ngày']}
          presets={[
            { label: 'Hôm nay',    value: [dayjs(), dayjs()] },
            { label: 'Hôm qua',    value: [dayjs().subtract(1,'day'), dayjs().subtract(1,'day')] },
            { label: 'Tuần này',   value: [dayjs().startOf('isoWeek'), dayjs().endOf('isoWeek')] },
            { label: 'Tuần trước', value: [dayjs().subtract(1,'week').startOf('isoWeek'), dayjs().subtract(1,'week').endOf('isoWeek')] },
            { label: 'Tháng này',  value: [dayjs().startOf('month'), dayjs()] },
            { label: 'Tháng trước', value: [dayjs().subtract(1,'month').startOf('month'), dayjs().subtract(1,'month').endOf('month')] },
          ]}
        />
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

      <div {...cellNav.wrapProps}>
      <SkeletonTable
        className="daily-sl-table"
        columns={navColumns}
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
      </div>

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

      <RecordDetailModal
        open={!!detailRecord}
        record={detailRecord}
        onClose={() => setDetailRecord(null)}
      />
    </>
  )
}

// ─── Modal chi tiết một ngày ─────────────────────────────────────────────────

function DayDetailModal({ open, date, rows, onClose }) {
  const kpi = useMemo(() => {
    const totals = {}
    STAGES.forEach(s => { totals[s.key] = { sl: 0, cong: 0, soPhien: 0 } })
    rows.forEach(r => {
      const resolved = resolveSession(r)
      if (!resolved) return
      const { cd, addSL } = resolved
      if (totals[cd]) {
        totals[cd].sl      += addSL ? Number(r.sanLuong || 0) : 0
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
          const stageRows = rows.filter(r => resolveSession(r)?.cd === s.key)
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
      const resolved = resolveSession(r)
      if (!resolved) return
      const { cd, addSL } = resolved
      if (!map[date][cd]) map[date][cd] = { sl: 0, cong: 0, soPhien: 0, _mm: new Set() }
      map[date][cd].sl      += addSL ? Number(r.sanLuong || 0) : 0
      map[date][cd].cong    += Number(r.congThucHien || 0)
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
      render: v => {
        const d = dayjs(v)
        const isSun = d.day() === 0
        return (
          <span style={{
            fontWeight: 700,
            color: isSun ? '#dc2626' : '#1D4ED8',
            background: isSun ? '#fef2f2' : 'transparent',
            borderRadius: 4,
            padding: isSun ? '1px 5px' : undefined,
            display: 'inline-block',
          }}>
            {d.format('DD/MM/YYYY')}
            {isSun && <span style={{ fontSize: 10, marginLeft: 4, fontWeight: 600, opacity: 0.8 }}>CN</span>}
          </span>
        )
      },
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
          format="DD/MM/YYYY" allowClear placeholder={['Từ ngày', 'Đến ngày']}
          presets={[
            { label: 'Hôm nay',    value: [dayjs(), dayjs()] },
            { label: 'Hôm qua',    value: [dayjs().subtract(1,'day'), dayjs().subtract(1,'day')] },
            { label: 'Tuần này',   value: [dayjs().startOf('isoWeek'), dayjs().endOf('isoWeek')] },
            { label: 'Tuần trước', value: [dayjs().subtract(1,'week').startOf('isoWeek'), dayjs().subtract(1,'week').endOf('isoWeek')] },
            { label: 'Tháng này',  value: [dayjs().startOf('month'), dayjs()] },
            { label: 'Tháng trước', value: [dayjs().subtract(1,'month').startOf('month'), dayjs().subtract(1,'month').endOf('month')] },
          ]}
        />
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
      const resolved = resolveSession(r)
      if (!resolved) return
      const { cd, addSL } = resolved
      if (!map[key][cd]) return
      map[key][cd].sl      += addSL ? Number(r.sanLuong || 0) : 0
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

  // Điều hướng ô bằng phím mũi tên — bảng chỉ đọc, không có onEdit
  const cellNav = useCellNav({ rowCount: displayData.length, colCount: 5 + STAGES.length * 3 + 2 })

  const columns = [
    { title: 'STT', key: 'stt', width: 46, align: 'center', fixed: 'left',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff', fontSize: 11 } }),
      onCell: (_, i) => cellNav.cellProps(i, 0),
      render: (_, __, idx) => <span style={{ color: '#64748b', fontSize: 11 }}>{idx + 1}</span> },
    { title: 'Mã SP', dataIndex: 'maSp', key: 'maSp', width: 100, fixed: 'left',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      onCell: (_, i) => cellNav.cellProps(i, 1),
      render: v => <b style={{ color: '#1d4ed8' }}>{v || '—'}</b> },
    { title: 'Tên SP', dataIndex: 'tenTrinh', key: 'tenTrinh', width: 200, fixed: 'left', ellipsis: true,
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      onCell: (_, i) => cellNav.cellProps(i, 2) },
    { title: 'Số Lô', dataIndex: 'soLo', key: 'soLo', width: 90, align: 'center',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      onCell: (_, i) => cellNav.cellProps(i, 3),
      render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || '—'}</span> },
    { title: 'Cỡ Lô', dataIndex: 'coLo', key: 'coLo', width: 80, align: 'right',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      onCell: (_, i) => cellNav.cellProps(i, 4),
      render: v => v != null ? Number(v).toLocaleString('vi-VN') : '—' },
    ...STAGES.map((s, si) => ({
      title: <span style={{ fontWeight: 800, fontSize: 12 }}>{s.label}</span>,
      key: s.key,
      align: 'center',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff', textAlign: 'center', borderLeft: '2px solid rgba(255,255,255,0.2)' } }),
      children: [
        {
          title: 'SL', key: `${s.key}_sl`, width: 90, align: 'right',
          onHeaderCell: () => ({ style: { background: '#29a3a3', color: '#fff', fontSize: 10 } }),
          onCell: (_, i) => cellNav.cellProps(i, 5 + si * 3),
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
          onCell: (_, i) => cellNav.cellProps(i, 5 + si * 3 + 1),
          render: (_, r) => {
            const val = r[s.key]?.cong
            if (!val) return <span style={{ color: '#d1d5db' }}>—</span>
            return <span style={{ color: s.congColor, fontWeight: 600 }}>{fmtCong(val)}</span>
          },
        },
        {
          title: 'Máy', key: `${s.key}_may`, width: 110, align: 'left',
          onHeaderCell: () => ({ style: { background: '#1e7a7a', color: '#fff', fontSize: 10 } }),
          onCell: (_, i) => cellNav.cellProps(i, 5 + si * 3 + 2),
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
      onCell: (_, i) => cellNav.cellProps(i, 5 + STAGES.length * 3),
      render: (_, r) => {
        const total = STAGES.reduce((s, st) => s + (r[st.key]?.sl || 0), 0)
        return total ? <span style={{ color: '#1d4ed8', fontWeight: 700, fontSize: 13 }}>{fmtSL(total)}</span>
          : <span style={{ color: '#d1d5db' }}>—</span>
      },
    },
    { title: 'TỔNG CÔNG', key: 'grandCong', width: 110, align: 'right', fixed: 'right',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff', fontSize: 11 } }),
      onCell: (_, i) => cellNav.cellProps(i, 5 + STAGES.length * 3 + 1),
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

      <div {...cellNav.wrapProps}>
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
      </div>
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
      const resolved = resolveSession(r)
      if (!resolved) return
      const { cd, addSL } = resolved
      if (!map[key][cd]) return
      map[key][cd].sl      += addSL ? Number(r.sanLuong || 0) : 0
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

  // Điều hướng ô bằng phím mũi tên — các bảng chỉ đọc trong từng sub-tab
  const cellNavStage    = useCellNav({ rowCount: stageStats.length,  colCount: 7 })
  const cellNavTime     = useCellNav({ rowCount: timeData.length,    colCount: 1 + STAGES.length + 1 })
  const cellNavLoaiSp   = useCellNav({ rowCount: loaiSpData.length,  colCount: 4 + STAGES.length })
  const cellNavCong     = useCellNav({ rowCount: congByLoai.length,  colCount: 8 })
  const cellNavMachine  = useCellNav({ rowCount: machineData.length, colCount: 7 })

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
          <div {...cellNavStage.wrapProps}>
          <Table size="small" dataSource={stageStats} pagination={false}
            columns={[
              { title: 'Công đoạn', dataIndex: 'label', width: 100,
                onCell: (_, i) => cellNavStage.cellProps(i, 0),
                render: (v, r) => <Tag color={CONG_DOAN_COLOR[r.key] || 'default'} style={{ fontWeight: 700 }}>{v}</Tag> },
              { title: 'Số SP/lô', dataIndex: 'soSp', align: 'right', width: 90,
                onCell: (_, i) => cellNavStage.cellProps(i, 1),
                render: v => <span style={{ color: '#374151' }}>{v}</span> },
              { title: 'Tổng SL', dataIndex: 'sl', align: 'right',
                onCell: (_, i) => cellNavStage.cellProps(i, 2),
                render: (v, r) => <span style={{ fontWeight: 700, color: r.slColor }}>{fmtSL(v)}</span> },
              { title: '% SL', dataIndex: 'sl', key: 'pct', align: 'right', width: 80,
                onCell: (_, i) => cellNavStage.cellProps(i, 3),
                render: v => `${grandSL > 0 ? ((v / grandSL) * 100).toFixed(1) : 0}%` },
              { title: 'Tổng Công', dataIndex: 'cong', align: 'right', width: 110,
                onCell: (_, i) => cellNavStage.cellProps(i, 4),
                render: (v, r) => <span style={{ color: r.congColor, fontWeight: 600 }}>{fmtCong(v, 2)}</span> },
              { title: 'SL/Công', align: 'right', width: 90,
                onCell: (_, i) => cellNavStage.cellProps(i, 5),
                render: (_, r) => r.cong > 0
                  ? <span style={{ color: '#0e7490', fontWeight: 600 }}>{(r.sl / r.cong).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}</span>
                  : <span style={{ color: '#bbb' }}>—</span> },
              { title: 'Máy Móc', dataIndex: 'mayMoc', ellipsis: true,
                onCell: (_, i) => cellNavStage.cellProps(i, 6),
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
          <div {...cellNavTime.wrapProps}>
          <Table size="small" dataSource={timeData} rowKey="date"
            pagination={{ pageSize: 14, showSizeChanger: false, showTotal: t => `${t} ngày` }}
            columns={[
              { title: 'Ngày', dataIndex: 'date', width: 110, fixed: 'left',
                onCell: (_, i) => cellNavTime.cellProps(i, 0),
                render: v => <span style={{ fontWeight: 700, color: '#1677ff' }}>{dayjs(v).format('DD/MM/YYYY')}</span> },
              ...STAGES.map((s, si) => ({
                title: s.label, dataIndex: s.key, align: 'right', width: 90,
                onCell: (_, i) => cellNavTime.cellProps(i, 1 + si),
                render: v => v > 0 ? <span style={{ color: s.slColor, fontWeight: 600 }}>{fmtSL(v)}</span>
                  : <span style={{ color: '#d9d9d9' }}>—</span>,
              })),
              { title: 'Tổng SL', align: 'right', width: 110,
                onCell: (_, i) => cellNavTime.cellProps(i, 1 + STAGES.length),
                render: (_, r) => {
                  const t = STAGES.reduce((s, st) => s + (r[st.key] || 0), 0)
                  return <strong style={{ color: '#389e0d' }}>{fmtSL(t)}</strong>
                }},
            ]}
          />
          </div>
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
          <div {...cellNavLoaiSp.wrapProps}>
          <Table size="small" dataSource={loaiSpData} rowKey="loai" pagination={false}
            columns={[
              { title: 'Loại Sản Phẩm', dataIndex: 'loai', width: 160,
                onCell: (_, i) => cellNavLoaiSp.cellProps(i, 0),
                render: v => <Tag color={colorOf(v)} style={{ fontWeight: 600, fontSize: 12 }}>{v}</Tag> },
              { title: 'Số TP', dataIndex: 'soTp', align: 'center', width: 70,
                onCell: (_, i) => cellNavLoaiSp.cellProps(i, 1),
                render: v => <span style={{ fontWeight: 700, color: '#374151' }}>{v}</span> },
              { title: 'Tổng SL', dataIndex: 'sl', align: 'right', width: 110,
                sorter: (a, b) => a.sl - b.sl,
                onCell: (_, i) => cellNavLoaiSp.cellProps(i, 2),
                render: (v, r) => <span style={{ fontWeight: 700, color: colorOf(r.loai) }}>{fmtSL(v)}</span> },
              { title: 'Tỷ Lệ', dataIndex: 'tyLe', align: 'right', width: 75,
                onCell: (_, i) => cellNavLoaiSp.cellProps(i, 3),
                render: v => `${v.toFixed(1)}%` },
              ...STAGES.map((s, si) => ({
                title: s.label, dataIndex: s.key, align: 'right', width: 85,
                onCell: (_, i) => cellNavLoaiSp.cellProps(i, 4 + si),
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
          <div {...cellNavCong.wrapProps}>
          <Table size="small" dataSource={congByLoai} rowKey="loai" pagination={false}
            columns={[
              { title: 'LOẠI SẢN PHẨM', dataIndex: 'loai', width: 160,
                onCell: (_, i) => cellNavCong.cellProps(i, 0),
                render: v => <Tag color={colorOf(v)} style={{ fontWeight: 600, fontSize: 12 }}>{v}</Tag> },
              { title: 'SỐ TP', dataIndex: 'soTp', align: 'center', width: 70,
                onCell: (_, i) => cellNavCong.cellProps(i, 1),
                render: v => <span style={{ fontWeight: 700, color: '#374151' }}>{v}</span> },
              { title: 'CÔNG PC (PCPL1)', dataIndex: 'congPcpl1', align: 'right', width: 135,
                sorter: (a, b) => a.congPcpl1 - b.congPcpl1,
                onCell: (_, i) => cellNavCong.cellProps(i, 2),
                render: v => v > 0 ? <span style={{ color: '#1d4ed8', fontWeight: 700 }}>{fmtC1(v)}</span>
                  : <span style={{ color: '#d9d9d9' }}>0</span> },
              { title: 'CÔNG PC (PCPL2)', dataIndex: 'congPcpl2', align: 'right', width: 135,
                sorter: (a, b) => a.congPcpl2 - b.congPcpl2,
                onCell: (_, i) => cellNavCong.cellProps(i, 3),
                render: v => v > 0 ? <span style={{ color: '#0369a1', fontWeight: 700 }}>{fmtC1(v)}</span>
                  : <span style={{ color: '#d9d9d9' }}>0</span> },
              { title: 'CÔNG PL', dataIndex: 'congPl', align: 'right', width: 100,
                sorter: (a, b) => a.congPl - b.congPl,
                onCell: (_, i) => cellNavCong.cellProps(i, 4),
                render: v => v > 0 ? <span style={{ color: '#0e7490', fontWeight: 700 }}>{fmtC1(v)}</span>
                  : <span style={{ color: '#d9d9d9' }}>0</span> },
              { title: 'CÔNG ĐG', dataIndex: 'congDg', align: 'right', width: 100,
                sorter: (a, b) => a.congDg - b.congDg,
                onCell: (_, i) => cellNavCong.cellProps(i, 5),
                render: v => v > 0 ? <span style={{ color: '#7c3aed', fontWeight: 700 }}>{fmtC1(v)}</span>
                  : <span style={{ color: '#d9d9d9' }}>0</span> },
              { title: 'CÔNG BBC1', dataIndex: 'congBbc1', align: 'right', width: 105,
                sorter: (a, b) => a.congBbc1 - b.congBbc1,
                onCell: (_, i) => cellNavCong.cellProps(i, 6),
                render: v => v > 0 ? <span style={{ color: '#991b1b', fontWeight: 700 }}>{fmtC1(v)}</span>
                  : <span style={{ color: '#d9d9d9' }}>0</span> },
              { title: 'TỔNG CÔNG', dataIndex: 'tongCong', align: 'right', width: 115,
                sorter: (a, b) => a.tongCong - b.tongCong,
                onCell: (_, i) => cellNavCong.cellProps(i, 7),
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
          <div {...cellNavMachine.wrapProps}>
          <Table size="small" dataSource={machineData} rowKey={r => `${r.stage}__${r.machine}`}
            pagination={{ pageSize: 20, showSizeChanger: false, showTotal: t => `${t} máy` }}
            columns={[
              { title: 'Máy Móc', dataIndex: 'machine', width: 200,
                onCell: (_, i) => cellNavMachine.cellProps(i, 0),
                render: v => <span style={{ fontWeight: 600, color: '#1e40af' }}>{v}</span> },
              { title: 'Công đoạn', dataIndex: 'stage', width: 100, align: 'center',
                onCell: (_, i) => cellNavMachine.cellProps(i, 1),
                render: v => <Tag color={CONG_DOAN_COLOR[v] || 'default'} style={{ fontWeight: 700, marginRight: 0 }}>{v}</Tag> },
              { title: 'Số SP', dataIndex: 'soTp', align: 'center', width: 70,
                onCell: (_, i) => cellNavMachine.cellProps(i, 2),
                render: v => <span style={{ fontWeight: 700 }}>{v}</span> },
              { title: 'Số Phiên', dataIndex: 'soPhien', align: 'center', width: 80,
                onCell: (_, i) => cellNavMachine.cellProps(i, 3),
                render: v => <span style={{ color: '#0369a1' }}>{v}</span> },
              { title: 'Tổng SL', dataIndex: 'totalSl', align: 'right', width: 110,
                sorter: (a, b) => a.totalSl - b.totalSl,
                onCell: (_, i) => cellNavMachine.cellProps(i, 4),
                render: v => <span style={{ fontWeight: 700, color: '#1e5fa3' }}>{fmtSL(v)}</span> },
              { title: 'Tổng Công', dataIndex: 'totalCong', align: 'right', width: 110,
                sorter: (a, b) => a.totalCong - b.totalCong,
                onCell: (_, i) => cellNavMachine.cellProps(i, 5),
                render: v => <span style={{ fontWeight: 600, color: '#6d28d9' }}>{fmtC1(v)}</span> },
              { title: 'SL/Công', align: 'right', width: 90,
                onCell: (_, i) => cellNavMachine.cellProps(i, 6),
                render: (_, r) => r.totalCong > 0
                  ? <span style={{ color: '#0e7490', fontWeight: 600 }}>{(r.totalSl / r.totalCong).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}</span>
                  : <span style={{ color: '#bbb' }}>—</span> },
            ]}
          />
          </div>
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
    // Cross-ref: PCPL1 SP list và PL công per maSp
    const pcpl1SpSl = {}   // maSp → có SL trong PCPL1
    const plCongPerSp = {} // maSp → tổng cong của PL
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
        // Ghi nhận để cross-ref PCPL1↔PL
        if (key === 'PCPL1' && sl > 0 && r.maSp) pcpl1SpSl[r.maSp] = true
        if (key === 'PL' && r.maSp) plCongPerSp[r.maSp] = (plCongPerSp[r.maSp] || 0) + cong
      } else {
        map[key].chuaNhap++
      }
    })
    // PL công chỉ cho các SP có SL trong PCPL1 (khớp logic modal)
    const pcpl1PlCongTk = Object.keys(pcpl1SpSl).reduce((s, maSp) => s + (plCongPerSp[maSp] || 0), 0)
    return Object.values(map).map(t => {
      const base    = t.dat + t.khongDat
      const tyLeDat = base > 0 ? +(t.dat / base * 100).toFixed(1) : null
      // PCPL1: tổng công = PC cong + PL cong cross-ref (giống Dashboard GĐ)
      const effectiveCong = t.key === 'PCPL1' ? (t.tongCong + pcpl1PlCongTk) : t.tongCong
      const ns      = effectiveCong > 0 ? +(t.tongSl / effectiveCong).toFixed(1) : null
      return { ...t, tongCong: effectiveCong, tyLeDat, nangSuat: ns, datMucTieu: tyLeDat != null && tyLeDat >= MT_DAT_TK }
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
  return resolveGdCd(r)
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

  // Điều hướng ô bằng phím mũi tên — 3 bảng chỉ đọc theo sub-tab (stage/loaisp/product)
  const cellNavStage2 = useCellNav({ rowCount: stageData.length,   colCount: 5 })
  const cellNavLoai2   = useCellNav({ rowCount: loaiData.length,   colCount: 4 + ANALYSIS_STAGES.length * 2 + 1 })
  const cellNavProduct = useCellNav({ rowCount: productRows.length, colCount: 8 })

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
              <div {...cellNavStage2.wrapProps}>
              <Table
                size="small"
                dataSource={stageData}
                rowKey="key"
                loading={loading}
                pagination={false}
                columns={[
                  {
                    title: 'Công đoạn', dataIndex: 'key', width: 100,
                    onCell: (_, i) => cellNavStage2.cellProps(i, 0),
                    render: v => <Tag color={CONG_DOAN_COLOR[v] || 'default'} style={{ fontWeight: 700 }}>{v}</Tag>
                  },
                  {
                    title: 'Số sản phẩm', dataIndex: 'products', align: 'right', width: 110,
                    onCell: (_, i) => cellNavStage2.cellProps(i, 1),
                    render: v => v.length
                  },
                  {
                    title: 'Tổng sản lượng', dataIndex: 'sl', align: 'right',
                    onCell: (_, i) => cellNavStage2.cellProps(i, 2),
                    render: v => <span style={{ fontWeight: 700, color: '#0f766e' }}>{fmtSL(v)}</span>
                  },
                  {
                    title: '% Sản lượng', dataIndex: 'sl', key: 'pct', align: 'right', width: 110,
                    onCell: (_, i) => cellNavStage2.cellProps(i, 3),
                    render: v => <span>{totalSl > 0 ? ((v / totalSl) * 100).toFixed(1) : 0}%</span>
                  },
                  {
                    title: 'Tổng công', dataIndex: 'cong', align: 'right', width: 110,
                    onCell: (_, i) => cellNavStage2.cellProps(i, 4),
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
              </div>
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
              <div {...cellNavLoai2.wrapProps}>
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
                    onCell: (_, i) => cellNavLoai2.cellProps(i, 0),
                    render: (v, _, idx) => (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 12, height: 12, borderRadius: 2, background: LOAI_COLORS[idx % LOAI_COLORS.length], display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600 }}>{v}</span>
                      </span>
                    )
                  },
                  { title: 'Số SP', dataIndex: 'products', align: 'right', width: 65,
                    onCell: (_, i) => cellNavLoai2.cellProps(i, 1),
                    render: v => v.length },
                  {
                    title: 'Sản lượng theo công đoạn',
                    children: ANALYSIS_STAGES.map((s, si) => ({
                      title: <span style={{ color: s.color, fontWeight: 700 }}>{s.label}</span>,
                      key: `sl_${s.key}`,
                      align: 'right',
                      width: 90,
                      onCell: (_, i) => cellNavLoai2.cellProps(i, 2 + si),
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
                    onCell: (_, i) => cellNavLoai2.cellProps(i, 2 + ANALYSIS_STAGES.length),
                    render: v => <span style={{ fontWeight: 700, color: '#0f766e' }}>{fmtSL(v)}</span>
                  },
                  {
                    title: '% SL', dataIndex: 'sl', key: 'pct', align: 'right', width: 75,
                    onCell: (_, i) => cellNavLoai2.cellProps(i, 3 + ANALYSIS_STAGES.length),
                    render: v => <span>{totalSl > 0 ? ((v / totalSl) * 100).toFixed(1) : 0}%</span>
                  },
                  {
                    title: 'Công theo công đoạn',
                    children: ANALYSIS_STAGES.map((s, si) => ({
                      title: <span style={{ color: s.color, fontWeight: 700 }}>{s.label}</span>,
                      key: `cong_${s.key}`,
                      align: 'right',
                      width: 90,
                      onCell: (_, i) => cellNavLoai2.cellProps(i, 4 + ANALYSIS_STAGES.length + si),
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
                    onCell: (_, i) => cellNavLoai2.cellProps(i, 4 + ANALYSIS_STAGES.length * 2),
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
            <div {...cellNavProduct.wrapProps}>
            <Table
              size="small"
              dataSource={productRows}
              rowKey={(r, i) => `${r.cd}-${r.soLo}-${i}`}
              loading={loading}
              pagination={{ pageSize: 50, showSizeChanger: false, showTotal: t => `${t} sản phẩm` }}
              columns={[
                {
                  title: '#', key: 'idx', width: 45, align: 'center',
                  onCell: (_, i) => cellNavProduct.cellProps(i, 0),
                  render: (_, __, i) => <span style={{ color: '#999', fontSize: 11 }}>{i + 1}</span>
                },
                {
                  title: 'CĐ', dataIndex: 'cd', width: 75,
                  onCell: (_, i) => cellNavProduct.cellProps(i, 1),
                  render: v => <Tag color={CONG_DOAN_COLOR[v] || 'default'} style={{ marginRight: 0, fontWeight: 700, fontSize: 11 }}>{v}</Tag>
                },
                {
                  title: 'Mã SP', dataIndex: 'maSp', width: 75,
                  onCell: (_, i) => cellNavProduct.cellProps(i, 2),
                  render: v => v ? <span style={{ fontWeight: 600, color: '#595959', fontSize: 12 }}>{v}</span> : '—'
                },
                {
                  title: 'Tên sản phẩm / Tiến trình', dataIndex: 'tenTrinh',
                  onCell: (_, i) => cellNavProduct.cellProps(i, 3),
                  render: v => <span style={{ wordBreak: 'break-word' }}>{v || '—'}</span>
                },
                {
                  title: 'Số lô', dataIndex: 'soLo', width: 90,
                  onCell: (_, i) => cellNavProduct.cellProps(i, 4),
                  render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || '—'}</span>
                },
                {
                  title: 'Sản lượng', dataIndex: 'sl', width: 110, align: 'right',
                  onCell: (_, i) => cellNavProduct.cellProps(i, 5),
                  render: v => <span style={{ fontWeight: 700, color: '#0f766e' }}>{fmtSL(v)}</span>
                },
                {
                  title: '% Tổng', key: 'pct', width: 80, align: 'right',
                  onCell: (_, i) => cellNavProduct.cellProps(i, 6),
                  render: (_, r) => <span style={{ fontSize: 12 }}>{totalSl > 0 ? ((r.sl / totalSl) * 100).toFixed(1) : 0}%</span>
                },
                {
                  title: 'Công', dataIndex: 'cong', width: 90, align: 'right',
                  onCell: (_, i) => cellNavProduct.cellProps(i, 7),
                  render: v => <span style={{ color: '#722ed1', fontSize: 12 }}>{fmtCong(v, 2)}</span>
                },
              ]}
            />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Sử dụng máy theo ngày (chỉ số A / P) ────────────────────────────────

const GIO_CHUAN_CA = 8 // giờ chuẩn / ca — dùng làm mẫu số cho chỉ số A

function timeToMinutes(t) {
  if (!t) return null
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t).trim())
  if (!m) return null
  const h = Number(m[1]), mi = Number(m[2])
  if (Number.isNaN(h) || Number.isNaN(mi)) return null
  return h * 60 + mi
}

// Hợp các khung giờ (union) để tránh đếm trùng khi nhiều người cùng dùng 1 máy
function mergeIntervalMinutes(intervals) {
  if (!intervals.length) return 0
  const sorted = [...intervals].sort((a, b) => a[0] - b[0])
  let total = 0
  let [curS, curE] = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    const [s, e] = sorted[i]
    if (s <= curE) { if (e > curE) curE = e }
    else { total += curE - curS; curS = s; curE = e }
  }
  total += curE - curS
  return total
}

const TO_NHOM_OPTIONS = [
  { value: 'PCPL1', label: 'PCPL1' },
  { value: 'PCPL2', label: 'PCPL2' },
  { value: 'PL', label: 'PL' },
  { value: 'DG', label: 'ĐG' },
  { value: 'BBC1', label: 'BBC1' },
]

const GRP_HDR = (label, bg) => ({
  title: label,
  onHeaderCell: () => ({ style: { background: bg, color: '#fff', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' } }),
})

const MU_TINH_TRANG_LABEL = { done: 'Done', doing: 'Doing' }

// ─── MachineUsageDetailModal — chi tiết 1 dòng bảng Chỉ số A, lấy từ Sản lượng tổ / Chi tiết sản xuất ──
function MachineUsageDetailModal({ open, row, onClose }) {
  const wsList = row?.workScheduleInfos || []
  const [activeId, setActiveId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [runtimeLogs, setRuntimeLogs] = useState([])
  const [shiftPerf, setShiftPerf] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) setActiveId(wsList[0]?.id ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row])

  useEffect(() => {
    if (!open || !activeId || !row) return
    setLoading(true)
    Promise.all([
      api.get(`/work-schedule/${activeId}`),
      api.get('/machine-runtime', { params: { workScheduleId: activeId, ngay: row.ngay } }),
      api.get('/machine-shift-perf', { params: { workScheduleId: activeId, ngay: row.ngay, tenMay: row.may } }),
    ])
      .then(([wsRes, rtRes, spRes]) => {
        setDetail(wsRes.data)
        setRuntimeLogs(rtRes.data || [])
        setShiftPerf(spRes.data || [])
      })
      .catch(() => message.error('Không thể tải chi tiết bản ghi'))
      .finally(() => setLoading(false))
  }, [open, activeId, row])

  if (!row) return null

  const LC = ({ children }) => (
    <div style={{ padding: '7px 10px', background: '#f1f5f9', fontWeight: 600, fontSize: 12, color: '#64748b', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>{children}</div>
  )
  const VC = ({ children, last, span }) => (
    <div style={{ padding: '5px 8px', borderBottom: '1px solid #e2e8f0', ...(last ? {} : { borderRight: '1px solid #e2e8f0' }), display: 'flex', alignItems: 'center', ...(span ? { gridColumn: `span ${span}` } : {}) }}>{children}</div>
  )
  const th = { padding: '6px 8px', border: '1px solid #94a3b8', fontWeight: 700, fontSize: 11, textAlign: 'center', background: '#f1f5f9', color: '#1e293b' }
  const td = { padding: '6px 8px', border: '1px solid #e2e8f0', fontSize: 12 }

  return (
    <Modal open={open} onCancel={onClose} footer={null} title={null} width={880} destroyOnHidden styles={{ body: { padding: 0 } }}>
      <div style={{ background: '#1e4570', padding: '11px 18px' }}>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>
          ⚙ {detail?.tenTrinh || row.may}
        </div>
        <div style={{ color: '#93c5fd', fontSize: 11, marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {detail?.maBravo && <span>Bravo: <b>{detail.maBravo}</b></span>}
          {detail?.maSp && <span>SP: <b>{detail.maSp}</b></span>}
          <span>Ngày: <b>{dayjs(row.ngay).format('DD/MM/YYYY')}</b></span>
          <span>Máy: <b>{row.may}</b></span>
        </div>
      </div>

      {wsList.length > 1 && (
        <Tabs
          size="small"
          activeKey={activeId != null ? String(activeId) : undefined}
          onChange={k => setActiveId(Number(k))}
          items={wsList.map(w => ({ key: String(w.id), label: `Lô ${w.soLo || w.id}` }))}
          style={{ padding: '4px 16px 0' }}
        />
      )}

      <Spin spinning={loading}>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 110px 1fr', border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden', marginBottom: 18 }}>
            <LC>Mã Bravo</LC><VC><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>{detail?.maBravo || '—'}</span></VC>
            <LC>Mã SP</LC><VC last>{detail?.maSp || '—'}</VC>
            <LC>Số Lô</LC><VC><span style={{ fontFamily: 'monospace' }}>{detail?.soLo || '—'}</span></VC>
            <LC>Mã ĐH</LC><VC last><span style={{ fontFamily: 'monospace', color: '#7c3aed' }}>{detail?.maDonHang || '—'}</span></VC>
            <LC>Cỡ Lô</LC><VC>{detail?.coLo != null ? Number(detail.coLo).toLocaleString('vi-VN') : '—'}</VC>
            <LC>Tình Trạng</LC><VC last>{detail?.tinhTrang ? (MU_TINH_TRANG_LABEL[detail.tinhTrang] || detail.tinhTrang) : '—'}</VC>
            <LC>Tổ/Nhóm</LC><VC><Tag color="blue" style={{ marginRight: 0 }}>{detail?.toNhom || row.toNhom || '—'}</Tag></VC>
            <LC>Phòng SX</LC><VC last>{detail?.phongSanXuat || '—'}</VC>
            <LC>Trưởng ca</LC><VC>{detail?.truongCa || '—'}</VC>
            <LC>Hỗ trợ</LC><VC last>{detail?.nguoiHoTro || '—'}</VC>
            {detail?.saiLech && <><LC>⚠ Sai lệch</LC><VC span={3} last>{detail.saiLech}</VC></>}
            {detail?.chuY && <><LC>💬 Chú ý</LC><VC span={3} last>{detail.chuY}</VC></>}
          </div>

          <div style={{ fontWeight: 700, fontSize: 13, color: '#1e3a5f', marginBottom: 6 }}>⚙ Máy Thực Hiện</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18 }}>
            <thead>
              <tr>
                {['Từ giờ', 'Đến giờ', 'Trạng thái', 'Lý do dừng', 'Ghi chú'].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {runtimeLogs.length === 0 ? (
                <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#94a3b8' }}>Chưa có dữ liệu</td></tr>
              ) : runtimeLogs.map(r => (
                <tr key={r.id}>
                  <td style={{ ...td, textAlign: 'center' }}>{r.tuGio || '—'}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{r.denGio || '—'}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <Tag color={r.trangThai === 'Chạy máy' ? 'success' : 'error'} style={{ marginRight: 0 }}>{r.trangThai || '—'}</Tag>
                  </td>
                  <td style={td}>{r.lyDo || '—'}</td>
                  <td style={td}>{r.ghiChu || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ fontWeight: 700, fontSize: 13, color: '#1e3a5f', marginBottom: 6 }}>⚡ Sản lượng theo ca</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Ca / Lô', 'Tốc độ LT (sp/phút)', 'Tốc độ TT (sp/phút)', 'P ca (%)', 'Nguyên nhân', 'Ghi chú'].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {shiftPerf.length === 0 ? (
                <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#94a3b8' }}>Chưa có dữ liệu</td></tr>
              ) : shiftPerf.map(r => {
                const lt = Number(r.slLyThuyet) || 0, tt = Number(r.slThucTe) || 0
                const p = lt > 0 ? Math.round(tt / lt * 100) : null
                return (
                  <tr key={r.id}>
                    <td style={{ ...td, textAlign: 'center' }}>{r.caLo || '—'}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{r.slLyThuyet != null ? Number(r.slLyThuyet).toLocaleString('vi-VN') : '—'}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#1d4ed8', fontWeight: 600 }}>{r.slThucTe != null ? Number(r.slThucTe).toLocaleString('vi-VN') : '—'}</td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: p == null ? '#94a3b8' : p >= 95 ? '#16a34a' : p >= 80 ? '#d97706' : '#dc2626' }}>{p != null ? `${p}%` : '—'}</td>
                    <td style={td}>{r.nguyenNhan || '—'}</td>
                    <td style={td}>{r.ghiChu || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Spin>
    </Modal>
  )
}

const MACHINE_USAGE_TO_LIST = [
  { key: 'PCPL1', label: 'PCPL1' },
  { key: 'PCPL2', label: 'PCPL2' },
  { key: 'BBC1',  label: 'BBC1'  },
  { key: 'PL',    label: 'PL'    },
  { key: 'DG',    label: 'ĐG'    },
  { key: 'CC',    label: 'Cân Chia' },
]

function MachineUsageTimeTab() {
  const [selectedTo, setSelectedTo] = useState('PCPL1')
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, padding: '10px 14px 0', flexWrap: 'wrap' }}>
        {MACHINE_USAGE_TO_LIST.map(t => (
          <div key={t.key}
            onClick={() => setSelectedTo(t.key)}
            style={{
              padding: '6px 16px', cursor: 'pointer', fontSize: 13, borderRadius: '6px 6px 0 0',
              fontWeight: selectedTo === t.key ? 700 : 400,
              color: selectedTo === t.key ? '#0e7490' : '#595959',
              background: selectedTo === t.key ? '#fff' : '#f0f4ff',
              border: '1px solid #e2e8f0', borderBottom: selectedTo === t.key ? '1px solid #fff' : '1px solid #e2e8f0',
              marginBottom: -1, userSelect: 'none',
            }}>
            {t.label}
          </div>
        ))}
      </div>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '0 0 6px 6px' }}>
        <StageTab
          key={selectedTo}
          congDoan={selectedTo}
          config={STAGE_CONFIG[selectedTo]}
          restrictToMachineTabs
        />
      </div>
    </div>
  )
}

function MachineUsageTab() {
  const [dateRange, setDateRange] = useState([dayjs().subtract(6, 'day'), dayjs()])
  const [loading, setLoading] = useState(false)
  const [machineARaw, setMachineARaw] = useState([])
  const [machinePRaw, setMachinePRaw] = useState([])
  const [mayFilter, setMayFilter] = useState([])
  const [toNhomFilter, setToNhomFilter] = useState([])
  const [activeQuickRange, setActiveQuickRange] = useState('Tuần này')
  const [detailRow, setDetailRow] = useState(null)

  const fetchData = useCallback(async (range = dateRange) => {
    setLoading(true)
    try {
      const tuNgay = range[0].format('YYYY-MM-DD')
      const denNgay = range[1].format('YYYY-MM-DD')

      const cdKeys = ['PCPL1', 'PCPL2', 'PL', 'DG', 'BBC1']
      const [aResults, pResults] = await Promise.all([
        Promise.allSettled(
          cdKeys.map(k => api.get('/machine-runtime/daily-summary', { params: { congDoanKey: k, tuNgay, denNgay } }))
        ),
        Promise.allSettled(
          cdKeys.map(k => api.get('/machine-perf/daily-summary', { params: { congDoanKey: k, tuNgay, denNgay } }))
        ),
      ])

      const aData = aResults
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value.data || [])
      setMachineARaw(aData)

      const pData = pResults
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value.data || [])
      pData.sort((a, b) => (b.ngay || '').localeCompare(a.ngay || '') || (a.tenMay || '').localeCompare(b.tenMay || '', 'vi'))
      setMachinePRaw(pData)
    } catch {
      message.error('Không thể tải dữ liệu sử dụng máy')
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => { fetchData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const machineARows = useMemo(() => machineARaw.map(r => ({
    key: r.ngay + '||' + (r.tenMay || '') + '||' + (r.toNhom || ''),
    ngay: r.ngay,
    may: r.tenMay || '',
    toNhom: r.toNhom || '',
    usageHours: r.gioChay ?? 0,
    plannedHours: r.gioKH ?? 0,
    gioDung: r.gioDung ?? 0,
    aIndex: (r.gioKH ?? 0) > 0 ? (r.gioChay ?? 0) / r.gioKH : null,
    availPct: r.availPct,
    soLanDung: r.soLanDung ?? 0,
    lyDoDung: r.lyDoDung || '',
    workScheduleInfos: r.workScheduleInfos || [],
  })).sort((a, b) => a.ngay < b.ngay ? 1 : a.ngay > b.ngay ? -1 : a.may.localeCompare(b.may, 'vi')),
  [machineARaw])

  const filteredMachineA = useMemo(() => {
    let data = machineARows
    if (mayFilter.length) data = data.filter(r => mayFilter.includes(r.may))
    if (toNhomFilter.length) data = data.filter(r => toNhomFilter.includes(r.toNhom))
    return data
  }, [machineARows, mayFilter, toNhomFilter])

  // Bảng P: dữ liệu từ /machine-perf/daily-summary — giống hệt WorkSchedulePage
  const filteredRowsP = useMemo(() => {
    let data = machinePRaw
    // Chỉ hiển thị những row đã nhập đủ thông số: SL thực tế phải có
    data = data.filter(r => r.slThucTe != null)
    if (mayFilter.length) data = data.filter(r => mayFilter.includes(r.tenMay))
    if (toNhomFilter.length) data = data.filter(r => toNhomFilter.includes(r.toNhom))
    return data
  }, [machinePRaw, mayFilter, toNhomFilter])

  const mayOptions = useMemo(
    () => [...new Set([
      ...machineARows.map(r => r.may),
      ...machinePRaw.map(r => r.tenMay).filter(Boolean),
    ])].sort((a, b) => a.localeCompare(b, 'vi')).map(m => ({ value: m, label: m })),
    [machineARows, machinePRaw]
  )

  const withA = filteredMachineA.filter(r => r.aIndex != null)
  const withP = filteredRowsP.filter(r => r.pPct != null)
  const avgA = withA.length ? withA.reduce((s, r) => s + r.aIndex, 0) / withA.length : null
  const avgPPct = withP.length ? withP.reduce((s, r) => s + r.pPct, 0) / withP.length : null
  const totalUsageHours = filteredMachineA.reduce((s, r) => s + r.usageHours, 0)
  const machineCount = new Set([...filteredMachineA.map(r => r.may), ...filteredRowsP.map(r => r.tenMay)]).size

  const aColor = v => {
    if (v == null) return '#94a3b8'
    if (v >= 0.85) return '#059669'
    if (v >= 0.6) return '#d97706'
    return '#dc2626'
  }
  const pColor = v => v == null ? '#9ca3af' : v >= 95 ? '#16a34a' : v >= 80 ? '#d97706' : '#dc2626'
  const pBg = v => v == null ? 'transparent' : v >= 95 ? '#f0fdf4' : v >= 80 ? '#fffbeb' : '#fef2f2'
  const fmtA = v => v == null ? '—' : (v * 100).toFixed(1) + '%'
  const fmtH = v => v == null ? '—' : v.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  const statCards = [
    { label: 'Chỉ số A trung bình', value: fmtA(avgA), color: aColor(avgA) },
    { label: 'Chỉ số P trung bình', value: avgPPct != null ? avgPPct.toFixed(1) + '%' : '—', color: pColor(avgPPct) },
    { label: 'Tổng giờ máy chạy',   value: fmtH(totalUsageHours) + ' h', color: '#0f766e' },
    { label: 'Số máy theo dõi',     value: machineCount, color: '#0f766e' },
  ]

  const TableHeader = ({ title, subtitle, bg }) => (
    <div style={{
      background: bg,
      borderRadius: '6px 6px 0 0',
      padding: '10px 18px 8px',
      marginBottom: 0,
    }}>
      <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}>{title}</div>
      {subtitle && <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2 }}>{subtitle}</div>}
    </div>
  )

  return (
    <div style={{ padding: '12px 16px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8,
        background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 8, padding: '10px 16px' }}>
        <span style={{ fontWeight: 700, color: '#0f766e', whiteSpace: 'nowrap' }}>⏱️ Khoảng thời gian:</span>
        <RangePicker
          value={dateRange}
          onChange={v => { if (v) { setDateRange(v); setActiveQuickRange(null); fetchData(v) } }}
          format="DD/MM/YYYY"
          size="small"
          allowClear={false}
          style={{ width: 230 }}
        />
        <Select
          mode="multiple"
          size="small"
          allowClear
          placeholder="Tất cả tổ/nhóm"
          value={toNhomFilter}
          onChange={setToNhomFilter}
          style={{ minWidth: 160, maxWidth: 260 }}
          options={TO_NHOM_OPTIONS}
          maxTagCount={3}
        />
        <Select
          mode="multiple"
          size="small"
          allowClear
          placeholder="Tất cả máy"
          value={mayFilter}
          onChange={setMayFilter}
          style={{ minWidth: 180, maxWidth: 340 }}
          options={mayOptions}
          maxTagCount={2}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 10 }}>
        {statCards.map(c => (
          <div key={c.label} style={{ background: '#f8f9fa', borderLeft: `4px solid ${c.color}`, padding: '12px 16px', borderRadius: 4 }}>
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 18 }}>
        A = Giờ chạy thực tế / Giờ kế hoạch (từ bảng Chỉ số A trong Sản lượng tổ) &nbsp;·&nbsp;
        P = SL thực tế / SL lý thuyết — nhập từ bảng Chỉ số P trong Sản lượng tổ
      </div>

      {/* Bảng A — unified (tất cả máy gộp 1 bảng) */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', background: '#fff', border: '1px solid #bae6fd', marginBottom: 28 }}>
          <span style={{ color: '#1677ff' }}>Đang tải...</span>
        </div>
      ) : (() => {
        if (filteredMachineA.length === 0) {
          return (
            <div style={{ textAlign: 'center', padding: '40px 0', background: '#fff', border: '1px solid #bae6fd', marginBottom: 28, color: '#9ca3af' }}>
              Chưa có dữ liệu Chỉ số A trong khoảng thời gian này.
            </div>
          )
        }
        const aColorPct = v => v == null ? '#94a3b8' : v >= 85 ? '#059669' : v >= 60 ? '#d97706' : '#dc2626'
        const aBgPct   = v => v == null ? 'transparent' : v >= 85 ? '#f0fdf4' : v >= 60 ? '#fffbeb' : '#fef2f2'
        const thBase = { padding: '6px 8px', textAlign: 'center', border: '1px solid #4a6fa5', fontWeight: 700, fontSize: 11, letterSpacing: 0.5, color: '#fff' }
        const ths = [
          { label: 'STT', w: 40 }, { label: 'Ngày', w: 90 },
          { label: 'Máy thực hiện', w: 180 },
          { label: 'Tên sản phẩm', w: 220 }, { label: 'Số lô', w: 80 },
          { label: 'Tổ/Nhóm', w: 80 }, { label: 'Giờ KH (h)', w: 75 },
          { label: 'Giờ chạy TT (h)', w: 110 }, { label: 'Giờ dừng (h)', w: 90 },
          { label: 'A (%)', w: 70 }, { label: 'Số lần dừng', w: 85 },
          { label: 'Lý do dừng chính', w: 220 },
        ]
        const NCOLS = ths.length
        return (
          <div style={{ overflowX: 'auto', marginBottom: 24 }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', tableLayout: 'fixed' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr>
                  <th colSpan={NCOLS} style={{ background: '#1e3a5f', color: '#fff', padding: '8px 12px', border: '1px solid #4a6fa5', fontWeight: 800, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    BIỂU MẪU THEO DÕI CHỈ SỐ A (AVAILABILITY)
                  </th>
                </tr>
                <tr>
                  <th colSpan={NCOLS} style={{ background: '#2d4f7c', color: '#dbeafe', padding: '4px 12px', textAlign: 'center', border: '1px solid #4a6fa5', fontWeight: 400, fontSize: 11, fontStyle: 'italic' }}>
                    Availability = Giờ chạy thực tế / Tổng giờ kế hoạch · Mục tiêu ≥ 85%
                  </th>
                </tr>
                <tr>
                  <th colSpan={6} style={{ ...thBase, background: '#1e3a5f' }}>THÔNG TIN SẢN XUẤT</th>
                  <th colSpan={3} style={{ ...thBase, background: '#166534' }}>GIỜ VẬN HÀNH (h)</th>
                  <th colSpan={1} style={{ ...thBase, background: '#b45309' }}>AVAILABILITY</th>
                  <th colSpan={2} style={{ ...thBase, background: '#991b1b' }}>SỰ CỐ / DỪNG MÁY</th>
                </tr>
                <tr>
                  {ths.map(h => (
                    <th key={h.label} style={{ background: '#f1f5f9', color: '#1e293b', padding: '6px 6px', border: '1px solid #94a3b8', fontWeight: 700, fontSize: 11, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: h.w }}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMachineA.map((row, idx) => {
                  const avail = row.availPct
                  const rowBg = idx % 2 === 0 ? '#fff' : '#f8fafc'
                  const hasDetail = (row.workScheduleInfos?.length || 0) > 0
                  const td = (extra = {}) => ({ padding: '6px 6px', border: '1px solid #e2e8f0', background: rowBg, overflow: 'hidden', textOverflow: 'ellipsis', ...extra })
                  return (
                    <tr
                      key={row.key}
                      onClick={hasDetail ? () => setDetailRow(row) : undefined}
                      title={hasDetail ? 'Xem chi tiết sản xuất' : undefined}
                      style={{ cursor: hasDetail ? 'pointer' : 'default' }}
                    >
                      <td style={td({ textAlign: 'center', color: '#94a3b8', fontSize: 11 })}>{idx + 1}</td>
                      <td style={td({ whiteSpace: 'nowrap', fontWeight: 500 })}>{dayjs(row.ngay).isValid() ? dayjs(row.ngay).format('DD/MM/YYYY') : row.ngay}</td>
                      <td style={td({ fontWeight: 600, color: '#1e3a5f' })}>{row.may || '—'}</td>
                      <td style={td({ fontWeight: 600 })}>{row.workScheduleInfos?.map(w => w.tenTrinh).filter(Boolean).join(' / ') || '—'}</td>
                      <td style={td({ textAlign: 'center', fontFamily: 'monospace', color: '#000099', fontWeight: 600 })}>{row.workScheduleInfos?.map(w => w.soLo).filter(Boolean).join(', ') || '—'}</td>
                      <td style={td({ textAlign: 'center' })}>{row.toNhom ? <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>{row.toNhom}</Tag> : '—'}</td>
                      <td style={td({ textAlign: 'center', fontWeight: 600 })}>{row.plannedHours}</td>
                      <td style={td({ textAlign: 'center', color: '#16a34a', fontWeight: 700 })}>{row.usageHours}</td>
                      <td style={td({ textAlign: 'center', color: row.gioDung > 0 ? '#dc2626' : '#6b7280', fontWeight: 700 })}>{row.gioDung > 0 ? row.gioDung : '—'}</td>
                      <td style={td({ textAlign: 'center', fontWeight: 800, fontSize: 13, color: aColorPct(avail), background: aBgPct(avail) })}>
                        {avail != null ? `${avail}%` : '—'}
                      </td>
                      <td style={td({ textAlign: 'center', color: row.soLanDung > 0 ? '#dc2626' : '#6b7280', fontWeight: row.soLanDung > 0 ? 700 : 400 })}>{row.soLanDung > 0 ? row.soLanDung : '—'}</td>
                      <td style={td({ fontSize: 11, color: '#4b5563' })}>{row.lyDoDung || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })()}

      {/* Bảng P — giống hệt WorkSchedulePage */}
      <TableHeader
        bg="#1e3a5f"
        title="BẢNG 2 — CHỈ SỐ P (HIỆU SUẤT THỰC HIỆN)"
        subtitle={`Performance = Σ(SL thực tế × T chuẩn SP) / Σ(Thời gian chạy) · Mục tiêu ≥ 95% · Tính từ chi tiết ca sản xuất · ${dayjs().year()}`}
      />
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', background: '#fff', border: '1px solid #4a6fa5', borderTop: 'none' }}>
          <span style={{ color: '#1677ff' }}>Đang tải...</span>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #4a6fa5', borderTop: 'none', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th colSpan={5} style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #4a6fa5', fontWeight: 700, fontSize: 11, letterSpacing: 0.5, color: '#fff', background: '#1e3a5f' }}>THÔNG TIN SẢN XUẤT</th>
                <th colSpan={3} style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #4a6fa5', fontWeight: 700, fontSize: 11, letterSpacing: 0.5, color: '#fff', background: '#166534' }}>THÔNG SỐ TỐC ĐỘ</th>
                <th colSpan={2} style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #4a6fa5', fontWeight: 700, fontSize: 11, letterSpacing: 0.5, color: '#fff', background: '#b45309' }}>P (%)</th>
                <th colSpan={2} style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #4a6fa5', fontWeight: 700, fontSize: 11, letterSpacing: 0.5, color: '#fff', background: '#991b1b' }}>PHÂN TÍCH TỔN THẤT</th>
              </tr>
              <tr>
                {[
                  { label: 'STT', w: 28 }, { label: 'Ngày', w: 90 }, { label: 'Tên sản phẩm', w: 260 },
                  { label: 'Số lô', w: 80 }, { label: 'Tổ/Nhóm', w: 80 },
                  { label: 'Tốc độ chuẩn (Lý thuyết)', w: 130 }, { label: 'SL lý thuyết tối đa', w: 110 }, { label: 'SL thực tế sản xuất', w: 110 },
                  { label: 'P (%)', w: 70 }, { label: 'Tổn thất tốc độ (SP/ca)', w: 110 },
                  { label: 'Nguyên nhân giảm tốc', w: 200 }, { label: 'Ghi chú / Hành động', w: 180 },
                ].map(h => (
                  <th key={h.label} style={{ background: '#f1f5f9', color: '#1e293b', padding: '6px 6px', border: '1px solid #94a3b8', fontWeight: 700, fontSize: 11, textAlign: 'center', whiteSpace: 'nowrap', minWidth: h.w }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRowsP.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '32px 8px', color: '#9ca3af', border: '1px solid #e2e8f0' }}>
                    Chưa có dữ liệu chỉ số P trong khoảng thời gian này.
                  </td>
                </tr>
              ) : (() => {
                const expandedRows = []
                filteredRowsP.forEach((row, parentIdx) => {
                  const wsGroup = row.workScheduleInfos || []
                  if (wsGroup.length <= 1) {
                    expandedRows.push({ row, wsInfo: wsGroup[0] || null, wsIdx: 0, wsCount: 1, parentIdx })
                  } else {
                    wsGroup.forEach((wsInfo, wsIdx) => {
                      expandedRows.push({ row, wsInfo, wsIdx, wsCount: wsGroup.length, parentIdx })
                    })
                  }
                })
                return expandedRows.map(({ row, wsInfo, wsIdx, wsCount, parentIdx }) => {
                  const pval = row.pPct
                  const rowBg = parentIdx % 2 === 0 ? '#fff' : '#f8fafc'
                  const td = (extra = {}) => ({ padding: '6px 6px', border: '1px solid #e2e8f0', background: rowBg, overflow: 'hidden', textOverflow: 'ellipsis', ...extra })
                  return (
                    <tr key={`${parentIdx}-${wsIdx}`}>
                      {wsIdx === 0 && <td rowSpan={wsCount} style={td({ textAlign: 'center', color: '#94a3b8', fontSize: 11 })}>{parentIdx + 1}</td>}
                      {wsIdx === 0 && <td rowSpan={wsCount} style={td({ whiteSpace: 'nowrap', fontWeight: 500 })}>{dayjs(row.ngay).isValid() ? dayjs(row.ngay).format('DD/MM/YYYY') : row.ngay}</td>}
                      <td style={td({ fontWeight: 600 })}>{wsInfo?.tenTrinh || row.tenMay}</td>
                      <td style={td({ textAlign: 'center', fontFamily: 'monospace', color: '#000099', fontWeight: 600 })}>{wsInfo?.soLo || '—'}</td>
                      {wsIdx === 0 && <td rowSpan={wsCount} style={td({ textAlign: 'center' })}>{row.toNhom || '—'}</td>}
                      {wsIdx === 0 && <td rowSpan={wsCount} style={td({ textAlign: 'center', fontSize: 11 })}>{row.tocDoChuanLabel || <span style={{ color: '#d1d5db' }}>—</span>}</td>}
                      {wsIdx === 0 && (
                        <td rowSpan={wsCount} style={td({ textAlign: 'right' })}>
                          {row.slLyThuyet != null ? Number(row.slLyThuyet).toLocaleString('vi-VN') : <span style={{ color: '#d1d5db' }}>—</span>}
                        </td>
                      )}
                      {wsIdx === 0 && (
                        <td rowSpan={wsCount} style={td({ textAlign: 'right', color: '#1d4ed8', fontWeight: 700 })}>
                          {row.slThucTe != null ? Number(row.slThucTe).toLocaleString('vi-VN') : <span style={{ color: '#d1d5db' }}>—</span>}
                        </td>
                      )}
                      {wsIdx === 0 && (
                        <td rowSpan={wsCount} style={td({ textAlign: 'center', fontWeight: 800, fontSize: 13, color: pColor(pval), background: pBg(pval) })}>
                          {pval != null ? `${pval}%` : '—'}
                        </td>
                      )}
                      {wsIdx === 0 && (
                        <td rowSpan={wsCount} style={td({ textAlign: 'right', color: row.tonThat > 0 ? '#dc2626' : '#6b7280', fontWeight: row.tonThat > 0 ? 700 : 400 })}>
                          {row.tonThat != null ? Number(row.tonThat).toLocaleString('vi-VN') : '—'}
                        </td>
                      )}
                      {wsIdx === 0 && <td rowSpan={wsCount} style={td({ fontSize: 11 })}>{row.nguyenNhanGiamToc || <span style={{ color: '#d1d5db' }}>—</span>}</td>}
                      {wsIdx === 0 && <td rowSpan={wsCount} style={td({ fontSize: 11 })}>{row.ghiChu || <span style={{ color: '#d1d5db' }}>—</span>}</td>}
                    </tr>
                  )
                })
              })()}
            </tbody>
          </table>
        </div>
      )}

      <MachineUsageDetailModal open={!!detailRow} row={detailRow} onClose={() => setDetailRow(null)} />
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

  const isDirty = () =>
    searchVal.trim() !== '' ||
    selProduct != null ||
    selected != null ||
    slNK != null ||
    ngayXuat != null ||
    !!tinhTrang ||
    tenNth.trim() !== '' ||
    ghiChu.trim() !== ''

  const handleCancel = () => {
    if (!isDirty()) { doClose(); return }
    Modal.confirm({
      title: 'Hủy thêm sản phẩm nhập kho?',
      content: 'Dữ liệu bạn vừa nhập chưa được lưu. Bạn có chắc muốn đóng?',
      okText: 'Đóng, không lưu',
      okButtonProps: { danger: true },
      cancelText: 'Tiếp tục nhập',
      onOk: doClose,
    })
  }

  return (
    <Modal
      title="Thêm sản phẩm nhập kho"
      open={open}
      onCancel={handleCancel}
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
                formatter={val => val != null && val !== '' ? Number(val).toLocaleString('vi-VN') : ''}
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

function NhapKhoSummaryView({ data, year, mucTieu, onMucTieuChange, mucTieuThang = {}, onMucTieuThangChange, loading, onSaveField, canEdit = false, onDeleteRow }) {
  const [editMT, setEditMT] = useState(false)
  const [editMTMonth, setEditMTMonth] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [editPopover, setEditPopover] = useState(null) // { day, month }
  const [dayDetailModal, setDayDetailModal] = useState(null) // { day, month }

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
  const hasMucTieuThang = Object.values(mucTieuThang).some(v => v > 0)
  const hasTarget  = mucTieu > 0 || hasMucTieuThang

  const now = dayjs()
  const curMonth = now.year() === year ? now.month() + 1 : (now.year() < year ? 0 : 13)

  const daysInMonth = m => dayjs(`${year}-${String(m).padStart(2,'0')}-01`).daysInMonth()
  const isFuture   = m => m > curMonth
  const fmt        = v => v ? Number(v).toLocaleString('vi-VN') : ''
  const isSundayCell = (d, m) => d <= daysInMonth(m) && dayjs(`${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`).day() === 0
  const workingDaysInMonth = m => { let n = 0; for (let d = 1; d <= daysInMonth(m); d++) if (!isSundayCell(d, m)) n++; return Math.max(1, n) }
  const workingDaysLeft = () => { let n = 0; for (let d = now.date() + 1; d <= daysInMonth(curMonth); d++) if (!isSundayCell(d, curMonth)) n++; return Math.max(1, n) }
  const actualDaysInMonth = m => { let n = 0; for (let d = 1; d <= 31; d++) if ((pivot[d]?.[m] || 0) > 0) n++; return n }

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
              // Check if this day is Sunday in the current month (or earliest valid month) for row-level hint
              const isSundayRow = MONTHS.some(m => !isFuture(m) && isSundayCell(day, m))
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
                  <td style={{ ..._tdS, textAlign: 'center', fontWeight: 600,
                    color: isSundayRow ? '#9333ea' : '#374151',
                    background: selectedDay === day ? '#bae6fd' : isSundayRow ? '#faf5ff' : '#f0fdf4',
                  }}>
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
                      const sunEdit = isSundayCell(day, m)
                      return (
                        <td key={m} style={{
                          ..._tdS, textAlign: 'right', padding: 0,
                          background: sunEdit ? '#faf5ff' : undefined,
                          color: sunEdit ? '#a855f7' : val > 0 ? '#15803d' : '#d1d5db',
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

                    const clickable = valid && !future && val > 0
                    const sunCell  = valid && !future && isSundayCell(day, m)
                    return (
                      <td key={m}
                        onClick={clickable ? e => { e.stopPropagation(); setDayDetailModal({ day, month: m }) } : undefined}
                        style={{
                          ..._tdS, textAlign: 'right',
                          background: !valid ? '#f3f4f6' : sunCell ? '#faf5ff' : undefined,
                          color: !valid ? '#d1d5db' : future ? '#cbd5e1' : sunCell ? '#a855f7' : val > 0 ? '#15803d' : '#d1d5db',
                          fontWeight: val > 0 ? 700 : 400,
                          cursor: clickable ? 'pointer' : 'default',
                          textDecoration: clickable ? 'underline dotted' : undefined,
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
            {/* TỔNG NK */}
            <tr style={{ background: '#006666', color: '#fff', fontWeight: 700 }}>
              <td style={{ ..._tfS, color: '#fff', textAlign: 'left', fontSize: 11, letterSpacing: 0.3 }}>TỔNG NK</td>
              {MONTHS.map(m => (
                <td key={m} style={{ ..._tfS, color: '#fff', textAlign: 'right', opacity: isFuture(m) ? 0.55 : 1 }}>
                  {isFuture(m) ? <span style={{ fontSize: 10 }}>#N/A</span> : monthTotals[m] > 0 ? fmt(monthTotals[m]) : <span style={{ opacity: 0.5 }}>0</span>}
                </td>
              ))}
              <td style={{ ..._tfS, textAlign: 'right', background: '#003333', color: '#fff', fontSize: 13 }}>{fmt(grandTotal) || '0'}</td>
            </tr>

            {/* Trung bình nhập kho ngày — tổng SL nhập kho tháng / số ngày thực tế có phát sinh NK trong tháng */}
            <tr style={{ background: '#ecfdf5' }}>
              <td style={{ ..._tfS, color: '#047857', fontWeight: 700, textAlign: 'left', fontSize: 11 }}>
                <Tooltip title="Tổng SL nhập kho trong tháng / số ngày thực tế có phát sinh nhập kho trong tháng">
                  <span style={{ cursor: 'help', borderBottom: '1px dotted #047857' }}>TB nhập kho/ngày</span>
                </Tooltip>
              </td>
              {MONTHS.map(m => {
                if (isFuture(m)) return (
                  <td key={m} style={{ ..._tfS, textAlign: 'right', color: '#cbd5e1', fontSize: 10 }}>#N/A</td>
                )
                const total = monthTotals[m] || 0
                const days  = actualDaysInMonth(m)
                const avg   = days > 0 ? total / days : 0
                return (
                  <td key={m} style={{ ..._tfS, textAlign: 'right', color: avg > 0 ? '#047857' : '#d1d5db', fontWeight: avg > 0 ? 600 : 400 }}>
                    {avg > 0 ? Math.round(avg).toLocaleString('vi-VN') : '0'}
                  </td>
                )
              })}
              <td style={{ ..._tfS, textAlign: 'right', background: '#d1fae5', color: '#047857', fontWeight: 700 }}>
                {(() => {
                  const totalDays = MONTHS.reduce((s, m) => s + (isFuture(m) ? 0 : actualDaysInMonth(m)), 0)
                  const avg = totalDays > 0 ? grandTotal / totalDays : 0
                  return avg > 0 ? Math.round(avg).toLocaleString('vi-VN') : '0'
                })()}
              </td>
            </tr>

            {hasTarget ? (
              <>
                {/* Mục tiêu tháng — mỗi tháng tự nhập riêng */}
                <tr style={{ background: '#fefce8' }}>
                  <td style={{ ..._tfS, color: '#92400e', fontWeight: 700, textAlign: 'left', fontSize: 11 }}>Mục tiêu tháng</td>
                  {MONTHS.map(m => {
                    const mt = Number(mucTieuThang[m] || 0)
                    return (
                      <td key={m} style={{ ..._tfS, textAlign: 'right', color: mt > 0 ? '#92400e' : '#d1d5db', fontWeight: mt > 0 ? 600 : 400, padding: 0 }}>
                        {editMTMonth === m ? (
                          <InputNumber
                            autoFocus size="small" min={0} step={10000}
                            value={mt || undefined}
                            formatter={v => v ? Number(v).toLocaleString('vi-VN') : ''}
                            parser={v => v ? v.replace(/[^\d]/g, '') : ''}
                            onChange={v => onMucTieuThangChange?.(m, v || 0)}
                            onBlur={() => setEditMTMonth(null)}
                            onPressEnter={() => setEditMTMonth(null)}
                            style={{ width: '100%', borderRadius: 0 }}
                            controls={false}
                          />
                        ) : (
                          <Tooltip title={canEdit ? 'Nhấn để nhập mục tiêu tháng' : undefined}>
                            <div
                              onClick={() => canEdit && setEditMTMonth(m)}
                              style={{ padding: '3px 6px', cursor: canEdit ? 'pointer' : 'default', textAlign: 'right' }}
                              onMouseEnter={e => canEdit && (e.currentTarget.style.background = '#fef3c7')}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              {mt > 0 ? fmt(mt) : <span style={{ fontSize: 10 }}>—</span>}
                            </div>
                          </Tooltip>
                        )}
                      </td>
                    )
                  })}
                  <td style={{ ..._tfS, textAlign: 'right', background: '#fef08a', color: '#92400e', fontWeight: 700 }}>
                    {editMT ? (
                      <InputNumber
                        autoFocus size="small" min={0} step={100000}
                        value={mucTieu || undefined}
                        formatter={v => v ? Number(v).toLocaleString('vi-VN') : ''}
                        parser={v => v ? v.replace(/[^\d]/g, '') : ''}
                        onChange={v => onMucTieuChange(v || 0)}
                        onBlur={() => setEditMT(false)}
                        onPressEnter={() => setEditMT(false)}
                        style={{ width: 130 }}
                      />
                    ) : (
                      <Tooltip title={canEdit ? 'Mục tiêu năm — Nhấn để sửa' : undefined}>
                        <span onClick={() => canEdit && setEditMT(true)} style={{ cursor: canEdit ? 'pointer' : 'default' }}>
                          {mucTieu > 0 ? mucTieu.toLocaleString('vi-VN') : '—'}
                        </span>
                      </Tooltip>
                    )}
                  </td>
                </tr>

                {/* Còn thiếu tháng — cảnh báo màu */}
                <tr>
                  <td style={{ ..._tfS, fontWeight: 700, fontSize: 11, textAlign: 'left' }}>
                    <Tooltip title="Xanh (+): Đạt/vượt mục tiêu · Vàng: Còn thiếu ≤ 30% · Đỏ: Còn thiếu > 30%">
                      <span style={{ cursor: 'help', borderBottom: '1px dotted #999' }}>Còn thiếu tháng</span>
                    </Tooltip>
                  </td>
                  {MONTHS.map(m => {
                    if (isFuture(m)) return (
                      <td key={m} style={{ ..._tfS, textAlign: 'right', color: '#cbd5e1', fontSize: 10 }}>#N/A</td>
                    )
                    const mt = Number(mucTieuThang[m] || 0)
                    if (mt === 0) return <td key={m} style={{ ..._tfS, textAlign: 'right', color: '#d1d5db' }}>—</td>
                    const ct  = mt - (monthTotals[m] || 0)
                    const pct = ct / mt
                    const bg    = ct <= 0 ? '#f0fdf4' : pct > 0.3 ? '#fee2e2' : '#fef9c3'
                    const color = ct <= 0 ? '#15803d' : pct > 0.3 ? '#dc2626' : '#d97706'
                    return (
                      <td key={m} style={{ ..._tfS, textAlign: 'right', fontWeight: 700, background: bg, color }}>
                        {ct <= 0 ? `+${fmt(Math.abs(ct))}` : fmt(ct)}
                      </td>
                    )
                  })}
                  <td style={{ ..._tfS, textAlign: 'right', fontWeight: 700,
                    background: surplus ? '#dcfce7' : '#fee2e2',
                    color: surplus ? '#15803d' : '#dc2626' }}>
                    {conThieu != null ? (surplus ? `+${fmt(Math.abs(conThieu))}` : fmt(conThieu)) : '—'}
                  </td>
                </tr>

                {/* NK cần/ngày */}
                <tr style={{ background: '#f0f9ff' }}>
                  <td style={{ ..._tfS, fontWeight: 700, fontSize: 11, color: '#0369a1', textAlign: 'left' }}>
                    <Tooltip title="Quá khứ: NK TB/ngày đạt được · Tháng hiện tại: NK/ngày cần đạt thêm (đỏ=thiếu) · Tương lai: mục tiêu TB/ngày cần đạt">
                      <span style={{ cursor: 'help', borderBottom: '1px dotted #0369a1' }}>NK cần/ngày</span>
                    </Tooltip>
                  </td>
                  {MONTHS.map(m => {
                    const mt = Number(mucTieuThang[m] || 0)
                    if (isFuture(m)) {
                      const rate = mt > 0 ? mt / workingDaysInMonth(m) : 0
                      return (
                        <td key={m} style={{ ..._tfS, textAlign: 'right', color: '#94a3b8', fontSize: 11 }}>
                          {rate > 0 ? Math.round(rate).toLocaleString('vi-VN') : '—'}
                        </td>
                      )
                    }
                    if (m === curMonth) {
                      if (mt === 0) return <td key={m} style={{ ..._tfS, textAlign: 'right', color: '#94a3b8' }}>—</td>
                      const ct   = mt - (monthTotals[m] || 0)
                      const wdLeft = workingDaysLeft()
                      const rate = ct > 0 ? ct / wdLeft : 0
                      return (
                        <td key={m} style={{ ..._tfS, textAlign: 'right', fontWeight: 700,
                          color: ct > 0 ? '#dc2626' : '#15803d',
                          background: ct > 0 ? '#fff1f2' : '#f0fdf4' }}>
                          {ct > 0 ? Math.round(rate).toLocaleString('vi-VN') : '0'}
                        </td>
                      )
                    }
                    const rate = (monthTotals[m] || 0) / workingDaysInMonth(m)
                    return (
                      <td key={m} style={{ ..._tfS, textAlign: 'right', color: '#0369a1', fontSize: 11 }}>
                        {Math.round(rate).toLocaleString('vi-VN')}
                      </td>
                    )
                  })}
                  {/* NK/ngày cần để đạt mục tiêu năm */}
                  {(() => {
                    if (now.year() !== year || conThieu == null || conThieu <= 0) {
                      return (
                        <td style={{ ..._tfS, textAlign: 'right', fontWeight: 700,
                          color: surplus ? '#15803d' : '#94a3b8' }}>
                          {surplus ? '0' : '—'}
                        </td>
                      )
                    }
                    const daysLeft = Math.max(1, dayjs(`${year}-12-31`).diff(now.startOf('day'), 'day') + 1)
                    return (
                      <td style={{ ..._tfS, textAlign: 'right', fontWeight: 700, color: '#dc2626', background: '#fff1f2' }}>
                        {Math.round(conThieu / daysLeft).toLocaleString('vi-VN')}
                      </td>
                    )
                  })()}
                </tr>
              </>
            ) : (
              /* Chưa có mục tiêu — hiển thị row để nhập */
              <tr style={{ background: '#fefce8' }}>
                <td style={{ ..._tfS, color: '#92400e', fontWeight: 700, textAlign: 'left', fontSize: 11 }}>Mục tiêu tháng</td>
                {MONTHS.map(m => (
                  <td key={m} style={{ ..._tfS, textAlign: 'right', color: '#d1d5db', padding: 0 }}>
                    <Tooltip title="Nhấn để nhập mục tiêu tháng">
                      <div
                        onClick={() => setEditMTMonth(m)}
                        style={{ padding: '3px 6px', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fef3c7'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {editMTMonth === m ? (
                          <InputNumber
                            autoFocus size="small" min={0} step={10000}
                            formatter={v => v ? Number(v).toLocaleString('vi-VN') : ''}
                            parser={v => v ? v.replace(/[^\d]/g, '') : ''}
                            onChange={v => onMucTieuThangChange?.(m, v || 0)}
                            onBlur={() => setEditMTMonth(null)}
                            onPressEnter={() => setEditMTMonth(null)}
                            style={{ width: '100%', borderRadius: 0 }}
                            controls={false}
                          />
                        ) : <span style={{ fontSize: 10 }}>—</span>}
                      </div>
                    </Tooltip>
                  </td>
                ))}
                <td style={{ ..._tfS, textAlign: 'right', background: '#fef08a', color: '#92400e', fontWeight: 700 }}>
                  {editMT ? (
                    <InputNumber
                      autoFocus size="small" min={0} step={100000}
                      value={mucTieu || undefined}
                      formatter={v => v ? Number(v).toLocaleString('vi-VN') : ''}
                      parser={v => v ? v.replace(/[^\d]/g, '') : ''}
                      onChange={v => onMucTieuChange(v || 0)}
                      onBlur={() => setEditMT(false)}
                      onPressEnter={() => setEditMT(false)}
                      style={{ width: 130 }}
                    />
                  ) : canEdit ? (
                    <Tooltip title="Mục tiêu năm — Nhấn để sửa">
                      <span onClick={() => setEditMT(true)} style={{ cursor: 'pointer', color: '#ccc' }}>✏</span>
                    </Tooltip>
                  ) : null}
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* Modal chi tiết sản phẩm nhập kho theo ngày */}
      <Modal
        open={dayDetailModal != null}
        onCancel={() => setDayDetailModal(null)}
        footer={<Button onClick={() => setDayDetailModal(null)}>Đóng</Button>}
        width={620}
        title={dayDetailModal ? (
          <span style={{ color: '#006666', fontWeight: 700 }}>
            📅 Sản phẩm nhập kho ngày {String(dayDetailModal.day).padStart(2,'0')}/{String(dayDetailModal.month).padStart(2,'0')}/{year}
          </span>
        ) : null}
        destroyOnClose
      >
        {dayDetailModal && (() => {
          const records = dayMonthRecords[`${dayDetailModal.day}_${dayDetailModal.month}`] || []
          const total = records.reduce((s, r) => s + (r.tpNhapKho || 0), 0)
          return records.length === 0 ? (
            <div style={{ color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>Không có dữ liệu</div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#006666', color: '#fff' }}>
                    {['#','Mã Bravo','Mã SP','Tên sản phẩm','Số lô','SL NK'].map((h, i) => (
                      <th key={i} style={{ padding: '6px 8px', textAlign: i >= 5 ? 'right' : 'left', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                    {onDeleteRow && <th style={{ padding: '6px 8px', width: 36 }} />}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '5px 8px', color: '#9ca3af', fontSize: 11 }}>{i + 1}</td>
                      <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>{r.maBravo || '—'}</td>
                      <td style={{ padding: '5px 8px', color: '#374151' }}>{r.maTp || '—'}</td>
                      <td style={{ padding: '5px 8px', color: '#374151', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.tienTrinh || '—'}</td>
                      <td style={{ padding: '5px 8px', fontFamily: 'monospace', color: '#6d28d9' }}>{r.lsx || '—'}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                        {r.tpNhapKho != null ? Number(r.tpNhapKho).toLocaleString('vi-VN') : '—'}
                      </td>
                      {onDeleteRow && (
                        <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                          <Popconfirm
                            title="Xóa dòng này khỏi Tổng hợp theo ngày?"
                            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
                            onConfirm={() => onDeleteRow(r.id)}
                          >
                            <DeleteOutlined style={{ color: '#ef4444', cursor: 'pointer', fontSize: 13 }} />
                          </Popconfirm>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f0fdf4', fontWeight: 700 }}>
                    <td colSpan={5} style={{ padding: '6px 8px', color: '#374151' }}>Tổng ({records.length} sản phẩm)</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#15803d', fontSize: 14 }}>{total.toLocaleString('vi-VN')}</td>
                    {onDeleteRow && <td />}
                  </tr>
                </tfoot>
              </table>
            </>
          )
        })()}
      </Modal>
    </Spin>
  )
}

// ─── NhapKhoTongHopTable ─────────────────────────────────────────────────────

function NhapKhoTongHopTable({ data, loading, onRowClick, filterH = 0 }) {
  const fmtN = v => v != null ? Number(v).toLocaleString('vi-VN') : '—'

  // Điều hướng ô bằng phím mũi tên — không có ô nào sửa tại chỗ, Enter/click đúp/icon 👁 đều mở panel Chi tiết
  const handleCellEdit = useCallback((row) => {
    const record = data[row]
    if (record && onRowClick) onRowClick(record)
  }, [data, onRowClick])
  const cellNav = useCellNav({ rowCount: data.length, colCount: 12, onEdit: handleCellEdit })

  const columns = [
    {
      title: '#', key: 'stt', width: 60, align: 'center', fixed: 'left',
      onCell: (_, i) => cellNav.cellProps(i, 0),
      render: (_, r, i) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
          <span style={{ color: '#bbb', fontSize: 11 }}>{i + 1}</span>
          {onRowClick && (
            <Tooltip title="Xem chi tiết">
              <EyeOutlined
                style={{ color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}
                onClick={e => { e.stopPropagation(); onRowClick(r) }}
              />
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 110, fixed: 'left',
      onCell: (_, i) => cellNav.cellProps(i, 1),
      render: v => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>{v || '—'}</span>,
    },
    {
      title: 'Mã SP', dataIndex: 'maTp', key: 'maTp', width: 80, align: 'center',
      onCell: (_, i) => cellNav.cellProps(i, 2),
      render: v => v ? <Tag style={{ marginRight: 0 }}>{v}</Tag> : '—',
    },
    {
      title: 'Tên sản phẩm', dataIndex: 'tienTrinh', key: 'tienTrinh', width: 260,
      onCell: (_, i) => cellNav.cellProps(i, 3),
      render: v => <span style={{ whiteSpace: 'normal', wordBreak: 'break-word', fontSize: 12 }}>{v || '—'}</span>,
    },
    {
      title: 'Số lô', dataIndex: 'lsx', key: 'lsx', width: 90, align: 'center',
      onCell: (_, i) => cellNav.cellProps(i, 4),
      render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || '—'}</span>,
    },
    {
      title: 'SL Lệnh', dataIndex: 'soLuong', key: 'soLuong', width: 95, align: 'right',
      onCell: (_, i) => cellNav.cellProps(i, 5),
      render: v => <span style={{ color: '#374151' }}>{fmtN(v)}</span>,
    },
    {
      title: 'SL ĐG', dataIndex: 'dg2', key: 'dg2', width: 95, align: 'right',
      onCell: (_, i) => cellNav.cellProps(i, 6),
      render: v => v ? <span style={{ color: '#6b7280' }}>{Number(v).toLocaleString('vi-VN')}</span> : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Tổng NK', dataIndex: 'totalNhapKho', key: 'totalNhapKho', width: 110, align: 'right',
      onCell: (_, i) => cellNav.cellProps(i, 7),
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
      onCell: (_, i) => cellNav.cellProps(i, 8),
      render: v => v > 0
        ? <Tag color="blue" style={{ marginRight: 0 }}>{v} lần</Tag>
        : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Ngày NK mới nhất', dataIndex: 'ngayNhapKhoMoiNhat', key: 'ngayNhapKhoMoiNhat', width: 140, align: 'center',
      onCell: (_, i) => cellNav.cellProps(i, 9),
      render: v => v
        ? <span style={{ color: '#374151', fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</span>
        : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Còn lại', key: 'conLai', width: 100, align: 'right',
      onCell: (_, i) => cellNav.cellProps(i, 10),
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
      onCell: (_, i) => cellNav.cellProps(i, 11),
      render: v => v ? <span style={{ fontSize: 12, color: '#6b7280' }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
  ]

  const totalNK = data.reduce((s, r) => s + (r.totalNhapKho || 0), 0)

  return (
    <div {...cellNav.wrapProps}>
    <Table
      size="small"
      rowKey="id"
      className="nhapkho-table"
      columns={columns}
      dataSource={data}
      loading={loading}
      scroll={{ x: 1150 }}
      sticky={{ offsetHeader: TAB_BAR_H + filterH }}
      pagination={{ pageSize: 200, showSizeChanger: true, pageSizeOptions: ['100', '200', '500'], showTotal: t => `Tổng ${t} lô`, size: 'small' }}
      rowClassName={r => (r.totalNhapKho || 0) === 0 ? 'nk-tonghop-chua' : ''}
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
    </div>
  )
}

// ─── NhapKhoDetailPanel ───────────────────────────────────────────────────────

function NhapKhoDetailPanel({ record: initialRecord, onClose, onSaved, canEdit = true, canDelete = true }) {
  const [localRecord, setLocalRecord] = useState(initialRecord)
  const [slNK,       setSlNK]       = useState(null)
  const [ngayNK,     setNgayNK]     = useState(dayjs())
  const [tinhTrang,  setTinhTrang]  = useState('')
  const [tenNth,     setTenNth]     = useState('')
  const [ghiChu,     setGhiChu]     = useState('')
  const [saving, setSaving] = useState(false)
  const [entries, setEntries] = useState([])
  const [dgSl,   setDgSl]   = useState(null)   // null = loading/unknown, number = fetched
  const [deletingId, setDeletingId] = useState(null)
  const [bravoEditing, setBravoEditing] = useState(false)
  const [bravoVal, setBravoVal] = useState('')
  const [bravoOpts, setBravoOpts] = useState([])
  const [bravoSaving, setBravoSaving] = useState(false)
  const [editingField, setEditingField] = useState(null) // 'lsx' | 'maDonHang' | null
  const [fieldVal, setFieldVal] = useState('')
  const [fieldSaving, setFieldSaving] = useState(false)

  const startEditField = (field) => {
    setEditingField(field)
    setFieldVal(localRecord[field] || '')
  }

  const saveField = async (field) => {
    setFieldSaving(true)
    try {
      const { data: updated } = await api.patch(`/production/${localRecord.id}/nhap-kho`, { [field]: fieldVal.trim() })
      setLocalRecord(prev => ({ ...prev, ...updated, [field]: fieldVal.trim() }))
      setEditingField(null)
      onSaved()
    } catch { message.error('Cập nhật thất bại') }
    finally { setFieldSaving(false) }
  }

  const fetchEntries = async (id) => {
    try {
      const res = await api.get(`/production/${id}/nhap-kho-entries`)
      setEntries(res.data || [])
    } catch { setEntries([]) }
  }

  const fetchDgSl = async (id) => {
    try {
      const res = await api.get(`/production/${id}/dg-san-luong`)
      const v = Number(res.data?.slDg || 0)
      setDgSl(v > 0 ? v : null)
    } catch { setDgSl(null) }
  }

  useEffect(() => {
    setLocalRecord(initialRecord)
    setEntries([])
    setDgSl(null)
    if (initialRecord?.id) {
      fetchEntries(initialRecord.id)
      fetchDgSl(initialRecord.id)
    }
  }, [initialRecord])

  const searchBravoOpts = async (kw) => {
    if (!kw || kw.trim().length < 1) { setBravoOpts([]); return }
    try {
      const { data: res } = await api.get('/product-master', { params: { keyword: kw.trim(), size: 20 } })
      setBravoOpts((res.content || []).map(p => ({
        value: p.maBravo,
        label: (
          <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff', minWidth: 80 }}>{p.maBravo}</span>
            <span style={{ color: '#374151' }}>{p.tienTrinh}</span>
            <span style={{ marginLeft: 'auto', color: '#888', fontSize: 11 }}>{p.maTp}</span>
          </div>
        ),
        maTp: p.maTp,
        tienTrinh: p.tienTrinh,
      })))
    } catch { setBravoOpts([]) }
  }

  const saveBravo = async (maBravo, maTp = '', tienTrinh = '') => {
    setBravoSaving(true)
    try {
      if (maBravo && !maTp) {
        try {
          const { data: pm } = await api.get('/product-master/lookup-batch', { params: { codes: maBravo } })
          const e = pm?.[maBravo] || pm?.[maBravo.toUpperCase()] || Object.values(pm || {})[0]
          if (e) { maTp = e.maTp || ''; tienTrinh = e.tienTrinh || '' }
        } catch { /* silent */ }
      }
      const { data: updated } = await api.patch(`/production/${localRecord.id}/nhap-kho`, { maBravo, maTp, tienTrinh })
      setLocalRecord(prev => ({ ...prev, ...updated, maBravo, maTp, tienTrinh }))
      setBravoEditing(false)
      setBravoOpts([])
      onSaved()
    } catch { message.error('Cập nhật Mã Bravo thất bại') }
    finally { setBravoSaving(false) }
  }

  const handleDeleteEntry = async (entry) => {
    setDeletingId(entry.id)
    try {
      await api.delete(`/production/${entry.id}/nhap-kho`)
      message.success('Đã xóa lần nhập kho')
      const res = await api.get(`/production/${localRecord.id}/nhap-kho-entries`)
      const fresh = res.data || []
      setEntries(fresh)
      const newTotal = fresh.reduce((s, e) => s + (e.tpNhapKho || 0), 0)
      setLocalRecord(prev => ({
        ...prev,
        totalNhapKho: newTotal,
        soLanNhapKho: fresh.length,
      }))
      onSaved()
    } catch { message.error('Xóa thất bại') }
    finally { setDeletingId(null) }
  }

  const hasUnsavedNhapKho = () => slNK != null || !!tinhTrang || tenNth.trim() !== '' || ghiChu.trim() !== ''

  const handleCloseAttempt = () => {
    if (hasUnsavedNhapKho()) {
      Modal.confirm({
        title: 'Dữ liệu nhập kho chưa được lưu',
        content: 'Bạn đã nhập thông tin ở form "Nhập kho" nhưng chưa bấm "Lưu nhập kho". Thoát ra sẽ mất dữ liệu vừa nhập. Bạn có chắc muốn thoát?',
        okText: 'Thoát, không lưu',
        cancelText: 'Ở lại',
        okButtonProps: { danger: true },
        onOk: onClose,
      })
    } else {
      onClose()
    }
  }

  const r      = localRecord
  const fmtN   = v => v != null ? Number(v).toLocaleString('vi-VN') : '—'
  const slDgRef = dgSl != null ? dgSl : (parseInt(r.dg2) || 0)
  const total  = r.totalNhapKho || 0
  const conLai = slDgRef > 0 ? slDgRef - total : null
  const done   = slDgRef > 0 && total >= slDgRef

  const LCell = ({ children }) => (
    <div style={{ padding: '7px 10px', background: '#f1f5f9', fontWeight: 600, fontSize: 12, color: '#64748b', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>{children}</div>
  )
  const VCell = ({ children, last }) => (
    <div style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0', ...(last ? {} : { borderRight: '1px solid #e2e8f0' }), display: 'flex', alignItems: 'center', fontSize: 13 }}>{children}</div>
  )

  const handleSave = async () => {
    if (!slNK) return message.warning('Nhập SL Nhập Kho')
    setSaving(true)
    try {
      const body = {
        tpNhapKho:        String(slNK),
        ngayXuatKho:      ngayNK ? ngayNK.format('YYYY-MM-DD') : '',
        tinhTrangNhapKho: tinhTrang || '',
        tenNthNhapKho:    tenNth.trim(),
        ghiChuNhapKho:    ghiChu.trim(),
      }
      const isNewEntry = (r.soLanNhapKho || 0) > 0
      if (isNewEntry) {
        await api.post(`/production/${r.id}/nhap-kho-entry`, body)
      } else {
        await api.patch(`/production/${r.id}/nhap-kho`, body)
      }
      message.success(isNewEntry ? 'Đã thêm lần nhập kho mới' : 'Đã lưu nhập kho')
      setLocalRecord(prev => ({
        ...prev,
        totalNhapKho:        (prev.totalNhapKho || 0) + slNK,
        soLanNhapKho:        (prev.soLanNhapKho || 0) + 1,
        ngayNhapKhoMoiNhat:  ngayNK ? ngayNK.format('YYYY-MM-DD') : prev.ngayNhapKhoMoiNhat,
      }))
      setSlNK(null)
      setNgayNK(dayjs())
      setTinhTrang('')
      setTenNth('')
      setGhiChu('')
      fetchEntries(r.id)
      onSaved()
    } catch { message.error('Lưu thất bại') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1050, pointerEvents: 'none' }}>
      <style>{`.nk-th-drag { cursor: move; user-select: none; }`}</style>
      <Rnd
        key={r.id}
        default={{
          x: Math.max(20, (window.innerWidth - 1020) / 2),
          y: Math.max(20, (window.innerHeight - 600) / 2),
          width: 1020,
          height: 600,
        }}
        minWidth={500} minHeight={400}
        bounds="window"
        dragHandleClassName="nk-th-drag"
        style={{ pointerEvents: 'all', zIndex: 1050 }}
        enableResizing={{ bottom: true, right: true, bottomRight: true, left: true, bottomLeft: true, top: false, topLeft: false, topRight: false }}
      >
        <div style={{ borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.24)', background: '#fff', display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <div className="nk-th-drag" style={{ background: '#1e4570', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 20 }}>📦</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.tienTrinh || 'Chi tiết nhập kho'}
              </div>
              <div style={{ color: '#93c5fd', fontSize: 11, marginTop: 2, display: 'flex', gap: 10 }}>
                {r.maBravo   && <span>Bravo: <b>{r.maBravo}</b></span>}
                {r.maTp      && <span>SP: <b>{r.maTp}</b></span>}
                {r.maDonHang && <span>ĐH: <b style={{ color: '#c4b5fd' }}>{r.maDonHang}</b></span>}
              </div>
            </div>
            <button onClick={handleCloseAttempt}
              style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', fontSize: 18, padding: 0, lineHeight: 1, flexShrink: 0 }}>✕</button>
          </div>

          {/* Body — 2 cột */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Cột trái: thông tin */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                <LCell>Số lô</LCell>
                <VCell last>
                  {editingField === 'lsx' ? (
                    <div style={{ display: 'flex', gap: 4, width: '100%', alignItems: 'center' }}>
                      <Input
                        autoFocus size="small" value={fieldVal}
                        onChange={e => setFieldVal(e.target.value)}
                        onPressEnter={() => saveField('lsx')}
                        style={{ flex: 1, fontFamily: 'monospace' }}
                      />
                      <Button size="small" type="primary" loading={fieldSaving} onClick={() => saveField('lsx')}>Lưu</Button>
                      <Button size="small" onClick={() => setEditingField(null)}>Hủy</Button>
                    </div>
                  ) : (
                    <span
                      onClick={canEdit ? () => startEditField('lsx') : undefined}
                      style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6d28d9', cursor: canEdit ? 'pointer' : 'default', textDecoration: canEdit ? 'underline dotted' : 'none' }}>
                      {r.lsx || <span style={{ color: '#bbb', fontFamily: 'inherit', fontWeight: 400 }}>{canEdit ? 'Nhấn để sửa...' : '—'}</span>}
                    </span>
                  )}
                </VCell>
                <LCell>Mã đơn hàng</LCell>
                <VCell last>
                  {editingField === 'maDonHang' ? (
                    <div style={{ display: 'flex', gap: 4, width: '100%', alignItems: 'center' }}>
                      <Input
                        autoFocus size="small" value={fieldVal}
                        onChange={e => setFieldVal(e.target.value)}
                        onPressEnter={() => saveField('maDonHang')}
                        style={{ flex: 1, fontFamily: 'monospace' }}
                      />
                      <Button size="small" type="primary" loading={fieldSaving} onClick={() => saveField('maDonHang')}>Lưu</Button>
                      <Button size="small" onClick={() => setEditingField(null)}>Hủy</Button>
                    </div>
                  ) : (
                    <span
                      onClick={canEdit ? () => startEditField('maDonHang') : undefined}
                      style={{ fontFamily: 'monospace', color: '#7c3aed', cursor: canEdit ? 'pointer' : 'default', textDecoration: canEdit ? 'underline dotted' : 'none' }}>
                      {r.maDonHang || <span style={{ color: '#bbb', fontFamily: 'inherit', fontWeight: 400 }}>{canEdit ? 'Nhấn để sửa...' : '—'}</span>}
                    </span>
                  )}
                </VCell>
                <LCell>Mã Bravo</LCell>
                <VCell last>
                  {bravoEditing ? (
                    <div style={{ display: 'flex', gap: 4, width: '100%', alignItems: 'center' }}>
                      <AutoComplete
                        autoFocus
                        options={bravoOpts}
                        value={bravoVal}
                        style={{ flex: 1 }}
                        size="small"
                        placeholder="Mã Bravo..."
                        onChange={v => { setBravoVal(v); setBravoOpts([]); searchBravoOpts(v) }}
                        onSelect={(val, opt) => { setBravoVal(val); saveBravo(val, opt.maTp || '', opt.tienTrinh || '') }}
                      />
                      <Button size="small" type="primary" loading={bravoSaving}
                        onClick={() => saveBravo(bravoVal)}>Lưu</Button>
                      <Button size="small" onClick={() => { setBravoEditing(false); setBravoOpts([]) }}>Hủy</Button>
                    </div>
                  ) : (
                    <span
                      onClick={canEdit ? () => { setBravoVal(r.maBravo || ''); setBravoEditing(true) } : undefined}
                      style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8', cursor: canEdit ? 'pointer' : 'default', textDecoration: canEdit ? 'underline dotted' : 'none' }}>
                      {r.maBravo || <span style={{ color: '#bbb', fontFamily: 'inherit', fontWeight: 400 }}>{canEdit ? 'Nhấn để sửa...' : '—'}</span>}
                    </span>
                  )}
                </VCell>
                <LCell>Tổng NK</LCell>
                <VCell last>
                  <span style={{ fontWeight: 700, fontSize: 15, color: done ? '#15803d' : total > 0 ? '#1677ff' : '#d97706' }}>
                    {total > 0 ? total.toLocaleString('vi-VN') : 'Chưa NK'}
                  </span>
                </VCell>
                {conLai != null && <>
                  <LCell>Còn lại</LCell>
                  <VCell last>
                    {conLai <= 0
                      ? <Tag color="success" style={{ marginRight: 0 }}>Hoàn tất</Tag>
                      : <span style={{ color: '#cf1322', fontWeight: 700 }}>{conLai.toLocaleString('vi-VN')}</span>}
                  </VCell>
                </>}
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Sản lượng</div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                  <LCell>SL Lệnh (cỡ lô)</LCell>
                  <VCell last><strong>{fmtN(r.soLuong)}</strong></VCell>
                  <LCell>SL Đóng Gói</LCell>
                  <VCell last>
                    {dgSl != null
                      ? <span style={{ color: '#374151', fontWeight: 600 }}>{dgSl.toLocaleString('vi-VN')}</span>
                      : <span style={{ color: '#374151', fontWeight: 600 }}>{fmtN(r.dg2)}</span>
                    }
                  </VCell>
                </div>
              </div>

              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Lịch sử nhập kho
                  {entries.length > 0 && <Tag color="blue" style={{ marginRight: 0, fontWeight: 700 }}>{entries.length} lần</Tag>}
                </div>
                {entries.length === 0 ? (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '12px', color: '#bbb', fontSize: 13, textAlign: 'center' }}>Chưa có lịch sử nhập kho</div>
                ) : (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '22px 78px 62px 68px 80px 1fr 26px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                      {['#', 'Ngày NK', 'SL', 'Tình trạng', 'Tên NTH', 'Ghi chú', ''].map((h, i) => (
                        <div key={i} style={{ padding: '5px 6px', fontSize: 10, fontWeight: 700, color: '#64748b', borderRight: i < 6 ? '1px solid #e2e8f0' : 'none', textAlign: i === 2 ? 'right' : 'left' }}>{h}</div>
                      ))}
                    </div>
                    <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                      {entries.map((e, i) => (
                        <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '22px 78px 62px 68px 80px 1fr 26px', borderBottom: i < entries.length - 1 ? '1px solid #f0f4f8' : 'none', background: i % 2 === 0 ? '#fff' : '#fafbfc', alignItems: 'center' }}>
                          <div style={{ padding: '4px 5px', fontSize: 11, color: '#94a3b8', borderRight: '1px solid #f0f4f8' }}>{i + 1}</div>
                          <div style={{ padding: '4px 6px', fontSize: 11, color: '#374151', borderRight: '1px solid #f0f4f8' }}>
                            {e.ngayXuatKho ? dayjs(e.ngayXuatKho).format('DD/MM/YYYY') : '—'}
                          </div>
                          <div style={{ padding: '4px 6px', fontSize: 11, fontWeight: 600, color: '#1d4ed8', textAlign: 'right', borderRight: '1px solid #f0f4f8' }}>
                            {e.tpNhapKho != null ? Number(e.tpNhapKho).toLocaleString('vi-VN') : '—'}
                          </div>
                          <div style={{ padding: '4px 6px', fontSize: 11, borderRight: '1px solid #f0f4f8' }}>
                            {e.tinhTrangNhapKho
                              ? <span style={{ background: e.tinhTrangNhapKho === 'Hoàn tất' ? '#dcfce7' : '#fef3c7', color: e.tinhTrangNhapKho === 'Hoàn tất' ? '#15803d' : '#92400e', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 700 }}>{e.tinhTrangNhapKho}</span>
                              : <span style={{ color: '#d1d5db' }}>—</span>}
                          </div>
                          <div style={{ padding: '4px 6px', fontSize: 11, color: '#374151', borderRight: '1px solid #f0f4f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {e.tenNthNhapKho || <span style={{ color: '#d1d5db' }}>—</span>}
                          </div>
                          <div style={{ padding: '4px 6px', fontSize: 11, color: '#374151', borderRight: '1px solid #f0f4f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {e.ghiChuNhapKho || <span style={{ color: '#d1d5db' }}>—</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {canDelete && (
                              <Popconfirm
                                title="Xóa lần nhập kho này?"
                                onConfirm={() => handleDeleteEntry(e)}
                                okText="Xóa"
                                cancelText="Hủy"
                                okButtonProps={{ danger: true }}
                                placement="left"
                              >
                                <button
                                  disabled={deletingId === e.id}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px', display: 'flex', alignItems: 'center', opacity: deletingId === e.id ? 0.4 : 1 }}
                                >
                                  <DeleteOutlined style={{ fontSize: 12 }} />
                                </button>
                              </Popconfirm>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cột phải: form nhập kho */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderLeft: '1px solid #e2e8f0', paddingLeft: 20 }}>
              {canEdit ? (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1e4570', textTransform: 'uppercase', letterSpacing: 1, paddingBottom: 8, borderBottom: '2px solid #1e4570' }}>
                    {(r.soLanNhapKho || 0) > 0
                      ? `Thêm lần nhập kho #${(r.soLanNhapKho || 0) + 1}`
                      : 'Nhập kho lần đầu'}
                  </div>

                  <div>
                    <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#374151' }}>
                      SL Nhập Kho <span style={{ color: '#cf1322' }}>*</span>
                    </div>
                    <InputNumber
                      style={{ width: '100%' }}
                      size="large"
                      min={0}
                      value={slNK}
                      onChange={setSlNK}
                      formatter={val => val != null && val !== '' ? Number(val).toLocaleString('vi-VN') : ''}
                      parser={val => val ? val.replace(/[^\d]/g, '') : ''}
                      placeholder="Nhập số lượng nhập kho..."
                    />
                    {(dgSl != null || r.dg2) && (
                      <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
                        SL Đóng Gói: <b>{dgSl != null ? dgSl.toLocaleString('vi-VN') : fmtN(r.dg2)}</b>
                        {conLai != null && conLai > 0 && (
                          <span style={{ marginLeft: 8, color: '#cf1322' }}>· Còn lại: <b>{conLai.toLocaleString('vi-VN')}</b></span>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#374151' }}>Ngày Nhập Kho</div>
                    <DatePicker
                      style={{ width: '100%' }}
                      size="large"
                      value={ngayNK}
                      onChange={setNgayNK}
                      format="DD/MM/YYYY"
                      placeholder="Chọn ngày nhập kho"
                    />
                  </div>

                  <div>
                    <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#374151' }}>Tình trạng</div>
                    <Select
                      style={{ width: '100%' }}
                      size="large"
                      allowClear
                      value={tinhTrang || undefined}
                      onChange={v => setTinhTrang(v || '')}
                      placeholder="Chọn tình trạng..."
                      options={[
                        { value: 'Hoàn tất', label: 'Hoàn tất' },
                        { value: 'Chốt', label: 'Chốt' },
                        { value: 'Chờ xử lý', label: 'Chờ xử lý' },
                      ]}
                    />
                  </div>

                  <div>
                    <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#374151' }}>Tên NTH</div>
                    <Input
                      size="large"
                      value={tenNth}
                      onChange={e => setTenNth(e.target.value)}
                      placeholder="Tên người thực hiện..."
                    />
                  </div>

                  <div>
                    <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 13, color: '#374151' }}>Ghi chú</div>
                    <Input.TextArea
                      rows={2}
                      value={ghiChu}
                      onChange={e => setGhiChu(e.target.value)}
                      placeholder="Ghi chú..."
                    />
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                    <Button
                      type="primary"
                      size="large"
                      loading={saving}
                      onClick={handleSave}
                      icon={<PlusOutlined />}
                      block
                      style={{ background: '#1e4570', borderColor: '#1e4570', fontWeight: 700, height: 44 }}
                    >
                      {(r.soLanNhapKho || 0) > 0 ? 'Thêm lần nhập kho' : 'Lưu nhập kho'}
                    </Button>
                  </div>
                </>
              ) : (
                <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', margin: 'auto' }}>
                  Bạn không có quyền chỉnh sửa nhập kho
                </div>
              )}
            </div>

          </div>
        </div>
      </Rnd>
    </div>
  )
}

// ─── NhapKhoAuditLogView ─────────────────────────────────────────────────────
// Bản sao lịch sử thêm mới/sửa/xóa của tab "Ngày Nhập Kho" và "Nhập Kho" — append-only,
// độc lập với bản chính (xóa bản chính không làm mất log). Chỉ ADMIN xem được.
function NhapKhoAuditLogView({ data, loading, onReload, filterH = 0 }) {
  const HANH_DONG_TAG = {
    THEM_MOI:    <Tag color="green">Thêm mới</Tag>,
    SUA:         <Tag color="blue">Sửa</Tag>,
    XOA:         <Tag color="red">Xóa</Tag>,
    DONG_BO_SLT: <Tag color="purple">Đồng bộ SLT</Tag>,
  }
  const cellNav = useCellNav({ rowCount: data.length, colCount: 14 })
  const columns = [
    { title: '#', key: 'stt', width: 46, align: 'center', onCell: (_, i) => cellNav.cellProps(i, 0), render: (_, __, i) => i + 1 },
    {
      title: 'Thời gian', dataIndex: 'changedAt', key: 'changedAt', width: 140,
      onCell: (_, i) => cellNav.cellProps(i, 1),
      render: v => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—',
      sorter: (a, b) => (a.changedAt || '').localeCompare(b.changedAt || ''),
      defaultSortOrder: 'descend',
    },
    { title: 'Hành động', dataIndex: 'hanhDong', key: 'hanhDong', width: 100, align: 'center',
      onCell: (_, i) => cellNav.cellProps(i, 2),
      render: v => HANH_DONG_TAG[v] || v },
    { title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 100,
      onCell: (_, i) => cellNav.cellProps(i, 3),
      render: v => v ? <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>{v}</span> : '—' },
    { title: 'Mã SP', dataIndex: 'maTp', key: 'maTp', width: 90, onCell: (_, i) => cellNav.cellProps(i, 4) },
    { title: 'Tiến trình', dataIndex: 'tienTrinh', key: 'tienTrinh', width: 220, ellipsis: true, onCell: (_, i) => cellNav.cellProps(i, 5) },
    { title: 'Số lô', dataIndex: 'lsx', key: 'lsx', width: 90,
      onCell: (_, i) => cellNav.cellProps(i, 6),
      render: v => <span style={{ fontFamily: 'monospace' }}>{v || '—'}</span> },
    { title: 'SL NK', dataIndex: 'tpNhapKho', key: 'tpNhapKho', width: 90, align: 'right',
      onCell: (_, i) => cellNav.cellProps(i, 7),
      render: v => v != null ? Number(v).toLocaleString('vi-VN') : '—' },
    { title: 'Ngày xuất', dataIndex: 'ngayXuatKho', key: 'ngayXuatKho', width: 100,
      onCell: (_, i) => cellNav.cellProps(i, 8),
      render: v => v ? dayjs(v).format('DD/MM/YYYY') : '—' },
    { title: 'Tình trạng', dataIndex: 'tinhTrangNhapKho', key: 'tinhTrangNhapKho', width: 100, onCell: (_, i) => cellNav.cellProps(i, 9) },
    { title: 'Tên NTH', dataIndex: 'tenNthNhapKho', key: 'tenNthNhapKho', width: 110, onCell: (_, i) => cellNav.cellProps(i, 10) },
    { title: 'Ghi chú', dataIndex: 'ghiChuNhapKho', key: 'ghiChuNhapKho', width: 150, ellipsis: true, onCell: (_, i) => cellNav.cellProps(i, 11) },
    { title: 'Thay đổi', dataIndex: 'thayDoi', key: 'thayDoi', width: 260, ellipsis: true,
      onCell: (_, i) => cellNav.cellProps(i, 12),
      render: v => v || <span style={{ color: '#d1d5db' }}>—</span> },
    { title: 'Người thực hiện', dataIndex: 'changedBy', key: 'changedBy', width: 130, onCell: (_, i) => cellNav.cellProps(i, 13) },
  ]
  return (
    <div>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          Lịch sử thêm mới/sửa/xóa — bản sao độc lập, không đổi khi bản chính bị xóa. Chỉ ADMIN xem được.
        </span>
        <Button size="small" icon={<ReloadOutlined />} onClick={onReload}>Tải lại</Button>
      </div>
      <div {...cellNav.wrapProps}>
      <Table
        size="small" rowKey="id" className="nhapkho-table" columns={columns} dataSource={data}
        loading={loading} scroll={{ x: 1500 }}
        sticky={{ offsetHeader: TAB_BAR_H + filterH }}
        pagination={{ pageSize: 50, showSizeChanger: true, showTotal: t => `${t} bản ghi` }}
      />
      </div>
    </div>
  )
}

// ─── NhapKhoTab ───────────────────────────────────────────────────────────────

function NhapKhoTab() {
  const { canEditNhapKhoTarget, isAdmin, user } = useAuth()
  // Chỉ ADMIN được sửa/xóa dữ liệu đã có; ADMIN_DG được thêm sản phẩm mới;
  // TKSX/ADMIN_KH/NHAN_VIEN/Quản đốc chỉ xem
  const canEdit = isAdmin()
  const canAdd = isAdmin() || user?.role === 'ADMIN_DG'
  const canDelete = isAdmin()
  const [auditData, setAuditData] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)
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
  const [mucTieu,       setMucTieu]       = useState(0)
  const [mucTieuThang,  setMucTieuThang]  = useState({})
  const [ctxMenu,       setCtxMenu]       = useState(null)   // { x, y, record }
  const [tongHopData,   setTongHopData]   = useState([])
  const [tongHopLoading,setTongHopLoading]= useState(false)
  const [searchText,    setSearchText]    = useState('')
  const [tongHopDrawer, setTongHopDrawer] = useState(null)  // record từ tong-hop
  const [filterMaBravo, setFilterMaBravo] = useState('')
  const [filterMaSp,    setFilterMaSp]    = useState('')
  const [filterTinhTrang, setFilterTinhTrang] = useState('')
  // State cho edit maBravo inline
  const [bravoEdit, setBravoEdit] = useState(null)  // { id, maBravo, maTp, tienTrinh }
  const [bravoSearch, setBravoSearch] = useState([]) // autocomplete options
  const [bravoSearching, setBravoSearching] = useState(false)

  const [drawerEntries, setDrawerEntries] = useState([])
  const [drawerDgSl, setDrawerDgSl] = useState(null)

  const filterRef = useRef(null)
  const [filterH, setFilterH] = useState(0)
  useEffect(() => {
    if (!filterRef.current) return
    const obs = new ResizeObserver(() => setFilterH(filterRef.current?.offsetHeight || 0))
    obs.observe(filterRef.current)
    return () => obs.disconnect()
  }, [])

  const drawerRecord = drawerRecId != null ? data.find(r => r.id === drawerRecId) ?? null : null

  useEffect(() => {
    if (drawerRecId == null) { setDrawerEntries([]); setDrawerDgSl(null); return }
    api.get(`/production/${drawerRecId}/nhap-kho-entries`).then(r => setDrawerEntries(r.data || [])).catch(() => {})
    api.get(`/production/${drawerRecId}/dg-san-luong`).then(r => {
      const v = Number(r.data?.slDg || 0); setDrawerDgSl(v > 0 ? v : null)
    }).catch(() => {})
  }, [drawerRecId])

  // Đóng context menu khi click ra ngoài
  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [ctxMenu])

  // Fetch mục tiêu nhập kho từ server (đồng bộ mọi tài khoản)
  useEffect(() => {
    api.get('/app-settings/nhapkho-muctieu', { params: { year: summaryYear } })
      .then(r => {
        setMucTieu(Number(r.data.mucTieu || 0))
        setMucTieuThang(r.data.mucTieuThang || {})
      })
      .catch(() => {})
  }, [summaryYear])

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
      const { data: res } = await api.get('/production/nhap-kho-tong-hop-ngay', {
        params: { fromDate: `${summaryYear}-01-01`, toDate: `${summaryYear}-12-31` }
      })
      setSummaryData(res)
    } catch { message.error('Không tải được dữ liệu tổng hợp') }
    finally { setSummaryLoading(false) }
  }, [summaryYear])

  const deleteSummaryRow = useCallback(async (id) => {
    try {
      await api.delete(`/production/nhap-kho-tong-hop-ngay/${id}`)
      setSummaryData(prev => prev.filter(r => r.id !== id))
      message.success('Đã xóa khỏi Tổng hợp theo ngày')
    } catch { message.error('Xóa thất bại') }
  }, [])

  useEffect(() => { if (viewMode === 'summary') fetchSummary() }, [viewMode, fetchSummary])

  const fetchAuditLog = useCallback(async () => {
    setAuditLoading(true)
    try {
      const { data: res } = await api.get('/production/nhap-kho-audit-log')
      setAuditData(res || [])
    } catch { message.error('Không tải được lịch sử Nhập Kho') }
    finally { setAuditLoading(false) }
  }, [])

  useEffect(() => { if (viewMode === 'audit' && isAdmin()) fetchAuditLog() }, [viewMode, isAdmin, fetchAuditLog])

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
    api.put('/app-settings/nhapkho-muctieu', { mucTieu: v || 0 }, { params: { year: summaryYear } }).catch(() => {})
  }

  const handleMucTieuThang = (month, val) => {
    setMucTieuThang(prev => {
      const next = { ...prev, [month]: val || 0 }
      api.put('/app-settings/nhapkho-muctieu', { mucTieuThang: next }, { params: { year: summaryYear } }).catch(() => {})
      return next
    })
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

  const searchBravo = useCallback(async (keyword) => {
    if (!keyword || keyword.trim().length < 1) { setBravoSearch([]); return }
    setBravoSearching(true)
    try {
      const { data: res } = await api.get('/product-master', { params: { keyword: keyword.trim(), size: 20 } })
      const items = res.content || []
      setBravoSearch(items.map(p => ({
        value: p.maBravo,
        label: (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff', minWidth: 80 }}>{p.maBravo}</span>
            <span style={{ color: '#374151' }}>{p.tienTrinh}</span>
            <span style={{ marginLeft: 'auto', color: '#888', fontSize: 11 }}>{p.maTp}</span>
          </div>
        ),
        maTp: p.maTp,
        tienTrinh: p.tienTrinh,
      })))
    } catch { setBravoSearch([]) }
    finally { setBravoSearching(false) }
  }, [])

  const handleBravoEditStart = useCallback(async (r) => {
    if (!canEdit) return
    setBravoEdit({ id: r.id, maBravo: r.maBravo || '', maTp: r.maTp || '', tienTrinh: r.tienTrinh || '' })
    // Luôn lookup từ danh mục khi có Mã Bravo để điền/xác nhận Tên SP và Mã SP
    if (r.maBravo) {
      try {
        const { data: pm } = await api.get('/product-master/lookup-batch', { params: { codes: r.maBravo } })
        const entry = pm?.[r.maBravo] || pm?.[r.maBravo.toUpperCase()] || Object.values(pm || {})[0]
        if (entry) {
          setBravoEdit(prev => prev?.id === r.id ? {
            ...prev,
            maTp:      entry.maTp      || prev.maTp      || '',
            tienTrinh: entry.tienTrinh || prev.tienTrinh || '',
          } : prev)
        }
      } catch { /* silent */ }
    }
  }, [])

  const saveBravoEdit = async () => {
    if (!bravoEdit) return
    let { id, maBravo, maTp, tienTrinh } = bravoEdit
    // Auto-lookup nếu user gõ tay mà chưa chọn từ dropdown
    if (maBravo && !maTp) {
      try {
        const { data: pm } = await api.get('/product-master/lookup-batch', { params: { codes: maBravo } })
        const entry = pm?.[maBravo] || pm?.[maBravo.toUpperCase()] || Object.values(pm || {})[0]
        if (entry) { maTp = entry.maTp || ''; tienTrinh = entry.tienTrinh || '' }
      } catch { /* không tìm thấy, tiếp tục với giá trị hiện tại */ }
    }
    setSaving(s => ({ ...s, [`${id}_maBravo`]: true }))
    try {
      const body = { maBravo, maTp: maTp || '', tienTrinh: tienTrinh || '' }
      const { data: updated } = await api.patch(`/production/${id}/nhap-kho`, body)
      setData(prev => prev.map(r => r.id === id ? { ...r, ...updated, maBravo, maTp, tienTrinh } : r))
      setBravoEdit(null)
      setBravoSearch([])
    } catch { message.error('Cập nhật Mã Bravo thất bại') }
    finally { setSaving(s => { const n = { ...s }; delete n[`${id}_maBravo`]; return n }) }
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

  // Sản phẩm đã "Tổng kết hồ sơ" bên trang Sản lượng → chuyển từ tab "Nhập Kho" sang tab "Sản phẩm đã hoàn thành"
  const filteredTongHopActive = useMemo(
    () => filteredTongHopData.filter(r => !r.hoSoHoanThien),
    [filteredTongHopData]
  )
  const filteredTongHopDone = useMemo(
    () => filteredTongHopData.filter(r => r.hoSoHoanThien),
    [filteredTongHopData]
  )

  // Điều hướng ô bằng phím mũi tên — cột theo đúng thứ tự khai báo trong `columns` bên dưới
  const NK_COL_FIELDS = ['stt', 'maBravo', 'maTp', 'tienTrinh', 'lsx', 'tpNhapKho', 'ngayXuatKho', 'tinhTrangNhapKho', 'tenNthNhapKho', 'ghiChuNhapKho']
  const NK_EDITABLE_FIELDS = ['tpNhapKho', 'ngayXuatKho', 'tinhTrangNhapKho', 'tenNthNhapKho', 'ghiChuNhapKho']
  const handleCellEdit = useCallback((row, col) => {
    if (!canEdit) return
    const record = filteredListData[row]
    if (!record) return
    const field = NK_COL_FIELDS[col]
    if (field === 'maBravo') { handleBravoEditStart(record); return }
    if (NK_EDITABLE_FIELDS.includes(field)) setEditCell({ id: record.id, field })
  }, [canEdit, filteredListData, handleBravoEditStart])
  const cellNav = useCellNav({ rowCount: filteredListData.length, colCount: NK_COL_FIELDS.length, onEdit: handleCellEdit })

  const columns = [
    {
      title: '#', key: 'stt', width: 60, align: 'center', fixed: 'left',
      onCell: (_, i) => cellNav.cellProps(i, 0),
      render: (_, r, i) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
          <span style={{ color: '#bbb', fontSize: 11 }}>{i + 1}</span>
          <Tooltip title="Xem chi tiết">
            <EyeOutlined
              style={{ color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}
              onClick={e => { e.stopPropagation(); setDrawerRecId(r.id) }}
            />
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 130, fixed: 'left',
      onCell: (_, i) => cellNav.cellProps(i, 1),
      render: (v, r) => {
        const isEditing = canEdit && bravoEdit?.id === r.id
        if (isEditing) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 220 }} onClick={e => e.stopPropagation()}>
              <AutoComplete
                autoFocus size="small"
                style={{ width: '100%' }}
                options={bravoSearch}
                value={bravoEdit.maBravo}
                onChange={val => setBravoEdit(prev => ({ ...prev, maBravo: val, maTp: '', tienTrinh: '' }))}
                onSearch={searchBravo}
                onSelect={(val, opt) => {
                  setBravoEdit(prev => ({ ...prev, maBravo: val, maTp: opt.maTp || '', tienTrinh: opt.tienTrinh || '' }))
                  setBravoSearch([])
                }}
                notFoundContent={bravoSearching ? <Spin size="small" /> : null}
                placeholder="Mã Bravo..."
                popupMatchSelectWidth={420}
              />
              {(bravoEdit.maTp || bravoEdit.tienTrinh) && (
                <div style={{ fontSize: 11, color: '#15803d', padding: '2px 4px', background: '#f0fdf4', borderRadius: 4 }}>
                  <strong>{bravoEdit.maTp}</strong>{bravoEdit.maTp && bravoEdit.tienTrinh ? ' · ' : ''}{bravoEdit.tienTrinh}
                </div>
              )}
              <div style={{ display: 'flex', gap: 4 }}>
                <Button size="small" type="primary" style={{ flex: 1, fontSize: 11 }}
                  loading={saving[`${r.id}_maBravo`]}
                  onClick={saveBravoEdit}>Lưu</Button>
                <Button size="small" style={{ fontSize: 11 }}
                  onClick={() => { setBravoEdit(null); setBravoSearch([]) }}>Hủy</Button>
              </div>
            </div>
          )
        }
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>{v || '—'}</span>
            {canEdit && <span style={{ fontSize: 10, color: '#d1d5db' }}>✎</span>}
          </div>
        )
      },
    },
    {
      title: 'Mã SP', dataIndex: 'maTp', key: 'maTp', width: 80, align: 'center',
      onCell: (_, i) => cellNav.cellProps(i, 2),
      render: v => v ? <Tag style={{ marginRight: 0 }}>{v}</Tag> : '—',
    },
    {
      title: 'Tên sản phẩm', dataIndex: 'tienTrinh', key: 'tienTrinh', width: 260,
      onCell: (_, i) => cellNav.cellProps(i, 3),
      render: v => <span style={{ whiteSpace: 'normal', wordBreak: 'break-word', fontSize: 12 }}>{v || '—'}</span>,
    },
    {
      title: 'Số lô', dataIndex: 'lsx', key: 'lsx', width: 90, align: 'center',
      onCell: (_, i) => cellNav.cellProps(i, 4),
      render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || '—'}</span>,
    },
    {
      title: 'SL Nhập Kho', dataIndex: 'tpNhapKho', key: 'tpNhapKho', width: 120, align: 'right',
      onCell: (_, i) => cellNav.cellProps(i, 5),
      render: (v, r) => {
        const isEditing = canEdit && editCell?.id === r.id && editCell?.field === 'tpNhapKho'
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
          <div style={{ textAlign: 'right' }}>
            {v != null
              ? <span style={{ fontWeight: 700, color: '#15803d' }}>{Number(v).toLocaleString('vi-VN')}</span>
              : canEdit ? <Tag style={{ borderStyle: 'dashed', color: '#aaa', marginRight: 0 }}>Nhập</Tag> : <span style={{ color: '#d1d5db' }}>—</span>}
          </div>
        )
      },
    },
    {
      title: 'Ngày xuất', dataIndex: 'ngayXuatKho', key: 'ngayXuatKho', width: 120, align: 'center',
      onCell: (_, i) => cellNav.cellProps(i, 6),
      render: (v, r) => {
        const isEditing = canEdit && editCell?.id === r.id && editCell?.field === 'ngayXuatKho'
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
          <div style={{ color: v ? '#374151' : '#d9d9d9', textAlign: 'center' }}>
            {v ? dayjs(v).format('DD/MM/YYYY') : (canEdit ? <Tag style={{ borderStyle: 'dashed', color: '#aaa', marginRight: 0 }}>Chọn ngày</Tag> : '—')}
          </div>
        )
      },
    },
    {
      title: 'Tình trạng', dataIndex: 'tinhTrangNhapKho', key: 'tinhTrangNhapKho', width: 110, align: 'center',
      onCell: (_, i) => cellNav.cellProps(i, 7),
      render: (v, r) => {
        const isEditing = canEdit && editCell?.id === r.id && editCell?.field === 'tinhTrangNhapKho'
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
          <div>
            {v
              ? <Tag color={v === 'Done' ? 'success' : 'warning'} style={{ marginRight: 0, fontWeight: 700 }}>{v}</Tag>
              : <Tag style={{ borderStyle: 'dashed', color: '#aaa', marginRight: 0 }}>—</Tag>}
          </div>
        )
      },
    },
    {
      title: 'Tên NTH', dataIndex: 'tenNthNhapKho', key: 'tenNthNhapKho', width: 160, align: 'center',
      onCell: (_, i) => cellNav.cellProps(i, 8),
      render: (v, r) => {
        const isEditing = canEdit && editCell?.id === r.id && editCell?.field === 'tenNthNhapKho'
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
          <div>
            {v
              ? <span style={{ color: '#374151' }}>{v}</span>
              : <Tag style={{ borderStyle: 'dashed', color: '#aaa', marginRight: 0 }}>—</Tag>}
          </div>
        )
      },
    },
    {
      title: 'Ghi chú', dataIndex: 'ghiChuNhapKho', key: 'ghiChuNhapKho', width: 200,
      onCell: (_, i) => cellNav.cellProps(i, 9),
      render: (v, r) => {
        const isEditing = canEdit && editCell?.id === r.id && editCell?.field === 'ghiChuNhapKho'
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
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
    <div style={{ padding: '0 16px 12px' }}>
      {/* Header - sticky */}
      <div ref={filterRef} style={{
        position: 'sticky', top: TAB_BAR_H, zIndex: 9,
        background: '#fff', borderBottom: '2px solid #b2f5f5',
        boxShadow: '0 2px 8px rgba(0,102,102,0.10)',
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '8px 16px', margin: '0 -16px 8px',
      }}>
        <span style={{ fontWeight: 700, color: '#006666', fontSize: 14 }}>📦 Nhập Kho Thành Phẩm</span>
        <Segmented
          size="small"
          className="nhapkho-segmented"
          value={viewMode}
          onChange={setViewMode}
          options={[
            { label: 'Ngày Nhập Kho', value: 'list' },
            { label: 'Nhập Kho', value: 'tong-hop' },
            { label: '✅ Sản phẩm đã hoàn thành', value: 'hoan-thanh' },
            { label: 'Tổng hợp theo ngày', value: 'summary' },
            ...(isAdmin() ? [{ label: '📜 Lịch sử NK', value: 'audit' }] : []),
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
            {canAdd && (
              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>
                Thêm sản phẩm
              </Button>
            )}
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
              <span>Tổng lệnh: <strong style={{ color: '#1d4ed8' }}>{filteredTongHopActive.length}</strong></span>
              <span>Đã NK: <strong style={{ color: '#15803d' }}>{filteredTongHopActive.filter(r => (r.totalNhapKho || 0) > 0).length}</strong></span>
              <span>Chưa NK: <strong style={{ color: '#d97706' }}>{filteredTongHopActive.filter(r => (r.totalNhapKho || 0) === 0).length}</strong></span>
            </div>
          </>
        ) : viewMode === 'hoan-thanh' ? (
          <>
            <Input.Search
              size="small" allowClear placeholder="Tên SP / Số lô..."
              value={searchText} onChange={e => setSearchText(e.target.value)}
              style={{ width: 200 }}
            />
            <Button size="small" icon={<ReloadOutlined />} onClick={fetchTongHop} loading={tongHopLoading}>Tải lại</Button>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
              <span>✅ Đã hoàn thành: <strong style={{ color: '#15803d' }}>{filteredTongHopDone.length}</strong></span>
              <span>Đã NK: <strong style={{ color: '#15803d' }}>{filteredTongHopDone.filter(r => (r.totalNhapKho || 0) > 0).length}</strong></span>
              <span>Chưa NK: <strong style={{ color: '#d97706' }}>{filteredTongHopDone.filter(r => (r.totalNhapKho || 0) === 0).length}</strong></span>
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
          mucTieuThang={mucTieuThang}
          onMucTieuThangChange={handleMucTieuThang}
          loading={summaryLoading}
          onSaveField={canEdit ? saveSummaryField : undefined}
          canEdit={canEditNhapKhoTarget()}
          onDeleteRow={canDelete ? deleteSummaryRow : undefined}
        />
      ) : viewMode === 'tong-hop' ? (
        <NhapKhoTongHopTable data={filteredTongHopActive} loading={tongHopLoading} onRowClick={setTongHopDrawer} filterH={filterH} />
      ) : viewMode === 'hoan-thanh' ? (
        <NhapKhoTongHopTable data={filteredTongHopDone} loading={tongHopLoading} onRowClick={setTongHopDrawer} filterH={filterH} />
      ) : viewMode === 'audit' ? (
        <NhapKhoAuditLogView data={auditData} loading={auditLoading} onReload={fetchAuditLog} filterH={filterH} />
      ) : (
      <div {...cellNav.wrapProps}>
      <Table
        size="small"
        rowKey="id"
        className="nhapkho-table"
        columns={columns}
        dataSource={filteredListData}
        loading={loading}
        scroll={{ x: 1100 }}
        sticky={{ offsetHeader: TAB_BAR_H + filterH }}
        pagination={{ pageSize: 200, showSizeChanger: true, pageSizeOptions: ['100', '200', '500'], showTotal: t => `Tổng ${t} lô`, size: 'small' }}
        rowHoverable
        rowClassName={() => 'nhapkho-row'}
        onRow={record => ({
          onContextMenu: (e) => {
            e.preventDefault()
            if (canDelete) setCtxMenu({ x: e.clientX, y: e.clientY, record })
          },
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
      </div>
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

      {/* Panel nổi chi tiết + nhập kho Nhập Kho (tong-hop) */}
      {tongHopDrawer && (
        <NhapKhoDetailPanel
          record={tongHopDrawer}
          onClose={() => setTongHopDrawer(null)}
          onSaved={fetchTongHop}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}

      {/* Modal thêm */}
      <AddNhapKhoModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdded={handleAdded}
      />

      {/* Modal chi tiết nhập kho — layout 2 cột kiểu DonHang */}
      <Modal
        open={drawerRecId != null}
        onCancel={() => { setDrawerRecId(null); setEditCell(null) }}
        footer={null}
        width={720}
        destroyOnClose={false}
        title={null}
        closable={false}
        styles={{ body: { padding: 0 } }}
      >
        {drawerRecord && (() => {
          const r = drawerRecord
          const total = r.tpNhapKho || 0
          const slDgVal = drawerDgSl != null ? drawerDgSl : (parseInt(r.dg2) || 0)
          const conLai = slDgVal > 0 ? slDgVal - total : null
          const done = slDgVal > 0 && total >= slDgVal
          const LC = ({ children }) => (
            <div style={{ padding: '7px 12px', background: '#f1f5f9', fontWeight: 600, fontSize: 12, color: '#64748b', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>{children}</div>
          )
          const VC = ({ children }) => (
            <div style={{ padding: '6px 12px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', fontSize: 13, minHeight: 38 }}>{children}</div>
          )
          return (
            <div style={{ borderRadius: 8, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ background: '#1e4570', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>📦</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.tienTrinh || 'Chi tiết nhập kho'}
                  </div>
                  <div style={{ color: '#93c5fd', fontSize: 11, marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {r.maBravo   && <span>Bravo: <b>{r.maBravo}</b></span>}
                    {r.maTp      && <span>SP: <b>{r.maTp}</b></span>}
                    {r.maDonHang && <span>ĐH: <b style={{ color: '#c4b5fd' }}>{r.maDonHang}</b></span>}
                  </div>
                </div>
                <button onClick={() => { setDrawerRecId(null); setEditCell(null) }}
                  style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', fontSize: 20, padding: 0, lineHeight: 1, flexShrink: 0 }}>✕</button>
              </div>

              {/* Body — 2 cột */}
              <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                {/* Cột trái: thông tin */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden', alignSelf: 'start' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr' }}>
                    <LC>Tên sản phẩm</LC>
                    <VC>
                      {bravoEdit?.id === r.id ? (
                        <Input size="small" value={bravoEdit.tienTrinh}
                          onChange={e => setBravoEdit(prev => ({ ...prev, tienTrinh: e.target.value }))}
                          style={{ width: '100%', fontSize: 12 }} placeholder="Tên sản phẩm..." />
                      ) : (
                        <span onClick={() => handleBravoEditStart(r)}
                          style={{ fontSize: 12, lineHeight: 1.4, cursor: canEdit ? 'pointer' : 'default', textDecoration: canEdit ? 'underline dotted' : 'none' }}>
                          {r.tienTrinh || <span style={{ color: '#bbb' }}>{canEdit ? 'Nhấn để sửa...' : '—'}</span>}
                        </span>
                      )}
                    </VC>
                    <LC>Số lô</LC>
                    <VC>
                      {canEdit && editCell?.id === r.id && editCell?.field === 'lsx_drawer' ? (
                        <Input autoFocus size="small" defaultValue={r.lsx || ''}
                          style={{ fontFamily: 'monospace' }}
                          onPressEnter={e => saveField(r.id, 'lsx', e.target.value.trim())}
                          onBlur={e => { if (!saving[`${r.id}_lsx`]) saveField(r.id, 'lsx', e.target.value.trim()) }}
                        />
                      ) : (
                        <span onClick={canEdit ? () => setEditCell({ id: r.id, field: 'lsx_drawer' }) : undefined}
                          style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6d28d9', cursor: canEdit ? 'pointer' : 'default', textDecoration: canEdit ? 'underline dotted' : 'none' }}>
                          {r.lsx || <span style={{ color: '#bbb', fontFamily: 'inherit', fontWeight: 400 }}>{canEdit ? 'Nhấn để sửa...' : '—'}</span>}
                        </span>
                      )}
                    </VC>
                    <LC>Mã đơn hàng</LC>
                    <VC>
                      {canEdit && editCell?.id === r.id && editCell?.field === 'maDonHang_drawer' ? (
                        <Input autoFocus size="small" defaultValue={r.maDonHang || ''}
                          style={{ fontFamily: 'monospace' }}
                          onPressEnter={e => saveField(r.id, 'maDonHang', e.target.value.trim())}
                          onBlur={e => { if (!saving[`${r.id}_maDonHang`]) saveField(r.id, 'maDonHang', e.target.value.trim()) }}
                        />
                      ) : (
                        <span onClick={canEdit ? () => setEditCell({ id: r.id, field: 'maDonHang_drawer' }) : undefined}
                          style={{ fontFamily: 'monospace', color: '#7c3aed', cursor: canEdit ? 'pointer' : 'default', textDecoration: canEdit ? 'underline dotted' : 'none' }}>
                          {r.maDonHang || <span style={{ color: '#bbb', fontFamily: 'inherit', fontWeight: 400 }}>{canEdit ? 'Nhấn để sửa...' : '—'}</span>}
                        </span>
                      )}
                    </VC>
                    <LC>Mã Bravo</LC>
                    <VC>
                      {bravoEdit?.id === r.id ? (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', width: '100%' }}>
                          <AutoComplete
                            autoFocus
                            options={bravoSearch}
                            value={bravoEdit.maBravo}
                            onChange={val => setBravoEdit(prev => ({ ...prev, maBravo: val, maTp: '', tienTrinh: '' }))}
                            onSearch={searchBravo}
                            onSelect={(val, opt) => { setBravoEdit(prev => ({ ...prev, maBravo: val, maTp: opt.maTp || '', tienTrinh: opt.tienTrinh || '' })); setBravoSearch([]) }}
                            style={{ flex: 1 }}
                            size="small"
                            notFoundContent={bravoSearching ? <Spin size="small" /> : null}
                          />
                          <Button size="small" type="primary" onClick={saveBravoEdit} loading={saving[`${r.id}_maBravo`]}>Lưu</Button>
                          <Button size="small" onClick={() => { setBravoEdit(null); setBravoSearch([]) }}>Hủy</Button>
                        </div>
                      ) : (
                        <span
                          onClick={() => handleBravoEditStart(r)}
                          style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8', cursor: canEdit ? 'pointer' : 'default', textDecoration: canEdit ? 'underline dotted' : 'none' }}>
                          {r.maBravo || <span style={{ color: '#bbb', fontFamily: 'inherit', fontWeight: 400 }}>{canEdit ? 'Nhấn để sửa...' : '—'}</span>}
                        </span>
                      )}
                    </VC>
                    <LC>Mã SP</LC>
                    <VC>
                      {bravoEdit?.id === r.id ? (
                        <Input size="small" value={bravoEdit.maTp}
                          onChange={e => setBravoEdit(prev => ({ ...prev, maTp: e.target.value }))}
                          style={{ width: '100%', fontWeight: 600, color: '#1d4ed8' }} placeholder="Mã SP..." />
                      ) : (
                        <span onClick={() => handleBravoEditStart(r)}
                          style={{ fontWeight: 600, color: '#1d4ed8', cursor: canEdit ? 'pointer' : 'default', textDecoration: canEdit ? 'underline dotted' : 'none' }}>
                          {r.maTp || <span style={{ color: '#bbb', fontWeight: 400 }}>{canEdit ? 'Nhấn để sửa...' : '—'}</span>}
                        </span>
                      )}
                    </VC>
                    <LC>SL Kế Hoạch</LC>
                    <VC><span style={{ fontWeight: 600, color: '#374151' }}>{r.soLuong?.toLocaleString('vi-VN') || '—'}</span></VC>
                    <LC>SL Đóng Gói</LC>
                    <VC>{slDgVal > 0 ? <span style={{ fontWeight: 600, color: '#374151' }}>{slDgVal.toLocaleString('vi-VN')}</span> : <span style={{ color: '#bbb' }}>—</span>}</VC>
                    <LC>Tổng đã NK</LC>
                    <VC>
                      <span style={{ fontWeight: 700, fontSize: 15, color: done ? '#15803d' : total > 0 ? '#1677ff' : '#d97706' }}>
                        {total > 0 ? total.toLocaleString('vi-VN') : 'Chưa NK'}
                      </span>
                    </VC>
                    {conLai != null && <>
                      <LC>Còn lại</LC>
                      <VC>{conLai <= 0 ? <Tag color="success" style={{ marginRight: 0 }}>Hoàn tất</Tag> : <span style={{ color: '#cf1322', fontWeight: 700 }}>{conLai.toLocaleString('vi-VN')}</span>}</VC>
                    </>}
                  </div>
                </div>

                {/* Cột phải: nhập liệu */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 12, color: '#374151' }}>SL Nhập Kho</div>
                    {canEdit && editCell?.id === r.id && editCell?.field === 'tpNhapKho_drawer' ? (
                      <InputNumber autoFocus min={0} step={1} style={{ width: '100%' }}
                        defaultValue={r.tpNhapKho ?? undefined}
                        formatter={val => val != null && val !== '' ? Number(val).toLocaleString('vi-VN') : ''}
                        parser={val => val ? val.replace(/[^\d]/g, '') : ''}
                        onPressEnter={e => { const n = parseInt(e.target.value.replace(/[^\d]/g, ''), 10); saveField(r.id, 'tpNhapKho', isNaN(n) ? null : n) }}
                        onBlur={e => { if (!saving[`${r.id}_tpNhapKho`]) { const n = parseInt(e.target.value.replace(/[^\d]/g, ''), 10); saveField(r.id, 'tpNhapKho', isNaN(n) ? null : n) } }}
                      />
                    ) : (
                      <div onClick={canEdit ? () => setEditCell({ id: r.id, field: 'tpNhapKho_drawer' }) : undefined}
                        style={{ cursor: canEdit ? 'pointer' : 'default', padding: '4px 8px', border: '1px dashed #d9d9d9', borderRadius: 4, minHeight: 32, display: 'flex', alignItems: 'center' }}>
                        {r.tpNhapKho != null
                          ? <span style={{ fontWeight: 700, color: '#15803d', fontSize: 15 }}>{r.tpNhapKho.toLocaleString('vi-VN')}</span>
                          : <span style={{ color: '#bbb' }}>{canEdit ? 'Nhấn để nhập...' : '—'}</span>}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 12, color: '#374151' }}>Ngày nhập kho</div>
                    {canEdit && editCell?.id === r.id && editCell?.field === 'ngayXuatKho_drawer' ? (
                      <DatePicker autoFocus style={{ width: '100%' }} format="DD/MM/YYYY"
                        defaultValue={r.ngayXuatKho ? dayjs(r.ngayXuatKho) : undefined}
                        onChange={d => saveField(r.id, 'ngayXuatKho', d ? d.format('YYYY-MM-DD') : '')}
                        onBlur={() => !saving[`${r.id}_ngayXuatKho`] && setEditCell(null)}
                      />
                    ) : (
                      <div onClick={canEdit ? () => setEditCell({ id: r.id, field: 'ngayXuatKho_drawer' }) : undefined}
                        style={{ cursor: canEdit ? 'pointer' : 'default', padding: '4px 8px', border: '1px dashed #d9d9d9', borderRadius: 4, minHeight: 32, display: 'flex', alignItems: 'center' }}>
                        {r.ngayXuatKho
                          ? <span style={{ color: '#374151' }}>{dayjs(r.ngayXuatKho).format('DD/MM/YYYY')}</span>
                          : <span style={{ color: '#bbb' }}>{canEdit ? 'Nhấn để chọn ngày...' : '—'}</span>}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 12, color: '#374151' }}>Tình trạng</div>
                    <Select style={{ width: '100%' }} value={r.tinhTrangNhapKho || undefined}
                      placeholder="— Chọn —" allowClear
                      disabled={!canEdit}
                      onChange={val => saveField(r.id, 'tinhTrangNhapKho', val || '')}
                      options={TINH_TRANG_NK_OPTIONS.map(o => ({ value: o, label: o }))}
                    />
                  </div>

                  <div>
                    <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 12, color: '#374151' }}>Tên NTH</div>
                    {canEdit && editCell?.id === r.id && editCell?.field === 'tenNthNhapKho_drawer' ? (
                      <Input autoFocus defaultValue={r.tenNthNhapKho || ''}
                        onPressEnter={e => saveField(r.id, 'tenNthNhapKho', e.target.value.trim())}
                        onBlur={e => { if (!saving[`${r.id}_tenNthNhapKho`]) saveField(r.id, 'tenNthNhapKho', e.target.value.trim()) }}
                      />
                    ) : (
                      <div onClick={canEdit ? () => setEditCell({ id: r.id, field: 'tenNthNhapKho_drawer' }) : undefined}
                        style={{ cursor: canEdit ? 'pointer' : 'default', padding: '4px 8px', border: '1px dashed #d9d9d9', borderRadius: 4, minHeight: 32, display: 'flex', alignItems: 'center' }}>
                        {r.tenNthNhapKho ? <span style={{ color: '#374151' }}>{r.tenNthNhapKho}</span> : <span style={{ color: '#bbb' }}>{canEdit ? 'Nhấn để nhập...' : '—'}</span>}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 12, color: '#374151' }}>Ghi chú</div>
                    {canEdit && editCell?.id === r.id && editCell?.field === 'ghiChuNhapKho_drawer' ? (
                      <Input.TextArea autoFocus rows={3} defaultValue={r.ghiChuNhapKho || ''}
                        onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); saveField(r.id, 'ghiChuNhapKho', e.target.value.trim()) } }}
                        onBlur={e => { if (!saving[`${r.id}_ghiChuNhapKho`]) saveField(r.id, 'ghiChuNhapKho', e.target.value.trim()) }}
                      />
                    ) : (
                      <div onClick={canEdit ? () => setEditCell({ id: r.id, field: 'ghiChuNhapKho_drawer' }) : undefined}
                        style={{ cursor: canEdit ? 'pointer' : 'default', padding: '4px 8px', border: '1px dashed #d9d9d9', borderRadius: 4, minHeight: 60, whiteSpace: 'pre-wrap', fontSize: 13 }}>
                        {r.ghiChuNhapKho ? <span style={{ color: '#374151' }}>{r.ghiChuNhapKho}</span> : <span style={{ color: '#bbb' }}>{canEdit ? 'Nhấn để nhập ghi chú...' : '—'}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section: Lịch sử nhập kho */}
              <div style={{ background: '#1e4570', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>📋 Lịch sử nhập kho</span>
                {drawerEntries.length > 0 && <Tag color="blue" style={{ marginRight: 0, fontWeight: 700 }}>{drawerEntries.length} lần</Tag>}
                <Button size="small" style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
                  onClick={() => api.get(`/production/${r.id}/nhap-kho-entries`).then(res => setDrawerEntries(res.data || [])).catch(() => {})}>
                  Làm mới
                </Button>
              </div>
              <div style={{ padding: '12px 20px', maxHeight: 200, overflowY: 'auto', minHeight: 52 }}>
                {drawerEntries.length === 0 ? (
                  <div style={{ color: '#bbb', fontSize: 13, textAlign: 'center', padding: '8px 0' }}>Chưa có lịch sử nhập kho</div>
                ) : (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '22px 80px 70px 72px 90px 1fr 26px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                      {['#','Ngày NK','Số lượng','Tình trạng','Tên NTH','Ghi chú',''].map((h, i) => (
                        <div key={i} style={{ padding: '5px 6px', fontSize: 10, fontWeight: 700, color: '#64748b', borderRight: i < 6 ? '1px solid #e2e8f0' : 'none', textAlign: i === 2 ? 'right' : 'left' }}>{h}</div>
                      ))}
                    </div>
                    {drawerEntries.map((e, i) => (
                      <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '22px 80px 70px 72px 90px 1fr 26px', borderBottom: i < drawerEntries.length - 1 ? '1px solid #f0f4f8' : 'none', background: i % 2 === 0 ? '#fff' : '#fafbfc', alignItems: 'center' }}>
                        <div style={{ padding: '4px 5px', fontSize: 11, color: '#94a3b8', borderRight: '1px solid #f0f4f8' }}>{i + 1}</div>
                        <div style={{ padding: '4px 6px', fontSize: 11, color: '#374151', borderRight: '1px solid #f0f4f8' }}>{e.ngayXuatKho ? dayjs(e.ngayXuatKho).format('DD/MM/YYYY') : '—'}</div>
                        <div style={{ padding: '4px 6px', fontSize: 11, fontWeight: 600, color: '#1d4ed8', textAlign: 'right', borderRight: '1px solid #f0f4f8' }}>
                          {e.tpNhapKho != null ? Number(e.tpNhapKho).toLocaleString('vi-VN') : '—'}
                        </div>
                        <div style={{ padding: '4px 6px', fontSize: 11, borderRight: '1px solid #f0f4f8' }}>
                          {e.tinhTrangNhapKho
                            ? <span style={{ background: e.tinhTrangNhapKho === 'Hoàn tất' ? '#dcfce7' : '#fef3c7', color: e.tinhTrangNhapKho === 'Hoàn tất' ? '#15803d' : '#92400e', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 700 }}>{e.tinhTrangNhapKho}</span>
                            : <span style={{ color: '#d1d5db' }}>—</span>}
                        </div>
                        <div style={{ padding: '4px 6px', fontSize: 11, color: '#374151', borderRight: '1px solid #f0f4f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.tenNthNhapKho || <span style={{ color: '#d1d5db' }}>—</span>}
                        </div>
                        <div style={{ padding: '4px 6px', fontSize: 11, color: '#374151', borderRight: '1px solid #f0f4f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.ghiChuNhapKho || <span style={{ color: '#d1d5db' }}>—</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {canDelete && (
                            <Popconfirm title="Xóa lần nhập kho này?" okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }} placement="left"
                              onConfirm={() => api.delete(`/production/${e.id}/nhap-kho`).then(() => {
                                message.success('Đã xóa')
                                api.get(`/production/${r.id}/nhap-kho-entries`).then(res => {
                                  const fresh = res.data || []
                                  setDrawerEntries(fresh)
                                  const newTotal = fresh.reduce((s, x) => s + (x.tpNhapKho || 0), 0)
                                  setData(prev => prev.map(x => x.id === r.id ? { ...x, tpNhapKho: newTotal || null, soLanNhapKho: fresh.length } : x))
                                }).catch(() => {})
                              }).catch(() => message.error('Xóa thất bại'))}>
                              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2, display: 'flex', alignItems: 'center' }}>
                                <DeleteOutlined style={{ fontSize: 12 }} />
                              </button>
                            </Popconfirm>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '10px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={() => { setDrawerRecId(null); setEditCell(null) }}>Đóng</Button>
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}

// ─── Tab: Dashboard Giám Đốc Sản Xuất ────────────────────────────────────────

const GD_PERIODS = [
  { key: 'today',      label: 'Hôm nay',    range: () => [dayjs(), dayjs()] },
  { key: 'yesterday',  label: 'Hôm qua',    range: () => [dayjs().subtract(1,'day'), dayjs().subtract(1,'day')] },
  { key: 'week',       label: 'Tuần này',   range: () => [dayjs().startOf('isoWeek'), dayjs()] },
  { key: 'last_week',  label: 'Tuần trước', range: () => [dayjs().subtract(1,'week').startOf('isoWeek'), dayjs().subtract(1,'week').endOf('isoWeek')] },
  { key: 'month',      label: 'Tháng này',  range: () => [dayjs().startOf('month'), dayjs()] },
  { key: 'last_month', label: 'Tháng trước',range: () => [dayjs().subtract(1,'month').startOf('month'), dayjs().subtract(1,'month').endOf('month')] },
  { key: 'q3',         label: '3 Tháng',    range: () => [dayjs().subtract(3, 'month'), dayjs()] },
  { key: 'h6',         label: '6 Tháng',    range: () => [dayjs().subtract(6, 'month'), dayjs()] },
  { key: 'year',       label: 'Năm nay',    range: () => [dayjs().startOf('year'), dayjs()] },
]

const GD_TO = [
  { key: 'PCPL1', label: 'PCPL1', slColor: '#1d4ed8', bg: '#eff6ff' },
  { key: 'PCPL2', label: 'PCPL2', slColor: '#0369a1', bg: '#e0f2fe' },
  { key: 'PL',    label: 'PL',    slColor: '#0e7490', bg: '#ecfeff' },
  { key: 'DG',    label: 'ĐG',    slColor: '#b45309', bg: '#fffbeb' },
  { key: 'BBC1',  label: 'BBC1',  slColor: '#6d28d9', bg: '#f5f3ff' },
]

// ─── Phòng sử dụng ────────────────────────────────────────────────────────────

const PHONG_ROOMS = [
  {id:'pc01', name:'Phòng Pha Chế 01', area:31.5, zone:'Pha chế'},
  {id:'pc02', name:'Phòng Pha Chế 02', area:19.5, zone:'Pha chế'},
  {id:'pc03', name:'Phòng Pha Chế 03', area:26.0, zone:'Pha chế'},
  {id:'pc04', name:'Pha Chế 04',       area:19.1, zone:'Pha chế'},
  {id:'pc05', name:'Phòng Pha Chế 05', area:40.5, zone:'Pha chế'},
  {id:'pcan', name:'Phòng Cân',        area:16.2, zone:'Pha chế'},
  {id:'pl01', name:'Phân Liều 01',              area:24.2, zone:'Phân liều'},
  {id:'pl02', name:'Phân Liều 02',              area:12.9, zone:'Phân liều'},
  {id:'pl03', name:'Phòng Phân Liều 03',        area:17.5, zone:'Phân liều'},
  {id:'pl04', name:'Phòng Phân Liều 04',        area:8.6,  zone:'Phân liều'},
  {id:'pl05', name:'Phân Liều 05',              area:31.1, zone:'Phân liều'},
  {id:'bt',   name:'Phòng Biệt Trữ',            area:60.0, zone:'Biệt trữ'},
  {id:'btbtp',name:'Biệt Trữ Bán Thành Phẩm',  area:12.5, zone:'Biệt trữ'},
  {id:'btnl', name:'Biệt Trữ NL',               area:8.3,  zone:'Biệt trữ'},
  {id:'al1',  name:'Airlock 1', area:4.0,  zone:'Airlock'},
  {id:'al2',  name:'Airlock 2', area:12.9, zone:'Airlock'},
  {id:'al3',  name:'Airlock 3', area:2.7,  zone:'Airlock'},
  {id:'al4',  name:'Airlock 4', area:12.5, zone:'Airlock'},
  {id:'vsbc1', name:'Vệ Sinh Bao Bì Cấp 1', area:22.0, zone:'Vệ sinh & thay đồ'},
  {id:'vsbbnl',name:'VSBB Nguyên Liệu',     area:8.9,  zone:'Vệ sinh & thay đồ'},
  {id:'giatqa',name:'Giặt QA',              area:9.5,  zone:'Vệ sinh & thay đồ'},
  {id:'ruadc', name:'Rửa DC',               area:19.9, zone:'Vệ sinh & thay đồ'},
  {id:'dcsach',name:'ĐC Sạch',              area:11.6, zone:'Vệ sinh & thay đồ'},
  {id:'tdnu2', name:'Thay Đồ Nữ 2',         area:4.0,  zone:'Vệ sinh & thay đồ'},
  {id:'tdnam2',name:'Thay Đồ Nam 2',         area:7.5,  zone:'Vệ sinh & thay đồ'},
  {id:'rac',   name:'Rác',                   area:3.0,  zone:'Vệ sinh & thay đồ'},
  {id:'hoanthien', name:'Phòng Hoàn Thiện Sản Phẩm', area:145.4, zone:'Khu vực khác'},
  {id:'hanhlang',  name:'Hành Lang',                  area:42.2,  zone:'Khu vực khác'},
  {id:'quandoc',   name:'Quản Đốc',                   area:12.8,  zone:'Khu vực khác'},
  {id:'ipc',       name:'IPC',                         area:11.6,  zone:'Khu vực khác'},
]
const PHONG_ZONES = ['Pha chế','Phân liều','Biệt trữ','Airlock','Vệ sinh & thay đồ','Khu vực khác']
// Các phòng hạ tầng luôn trong trạng thái hoạt động (không phụ thuộc kế hoạch hay toggle)
const ALWAYS_ACTIVE_ROOMS = new Set([
  'pcan',                                             // Phòng Cân
  'pl04',                                             // Phòng hồ sơ tổ trưởng
  'bt','btnl',                                        // Biệt trữ
  'al1','al2','al3','al4',                            // Airlock
  'vsbc1','vsbbnl','giatqa','ruadc','dcsach',         // Vệ sinh
  'tdnu2','tdnam2','rac',                             // Thay đồ / Rác
  'hoanthien','hanhlang','quandoc','ipc',             // Khu vực khác
])
const WEEKDAYS_VI = ['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7']

// Ghi chú cố định cho một số phòng đặc biệt
const ROOM_DEFAULT_NOTES = {
  'pl04': 'Phòng hồ sơ tổ trưởng',
}

// Keyword để tìm máy mặc định theo phòng (match label case-insensitive)
const ROOM_DEFAULT_MACHINE_KEYWORDS = {
  'pc05': '500l',          // Máy nhũ hóa 500L
  'pl02': 'tube hàn',     // Máy đóng tube hàn nhiệt
  'pl03': '1500l',         // Máy Khuấy 1500L
}

// Mapping: phongThucHien name (lowercase) → PHONG_ROOMS id
const PHONG_TH_TO_ROOM = {
  'pha chế 01': 'pc01', 'pha chế 1': 'pc01', 'phòng pha chế 01': 'pc01',
  'pha chế 02': 'pc02', 'pha chế 2': 'pc02', 'phòng pha chế 02': 'pc02',
  'pha chế 03': 'pc03', 'pha chế 3': 'pc03', 'phòng pha chế 03': 'pc03',
  'pha chế 04': 'pc04', 'pha chế 4': 'pc04', 'phòng pha chế 04': 'pc04',
  'pha chế 05': 'pc05', 'pha chế 5': 'pc05', 'phòng pha chế 05': 'pc05',
  'máy nhũ hóa 500l': 'pc05', 'máy nhũ hoá 500l': 'pc05',
  'máy khuấy 700l':  'pc01',
  'máy khuấy 1500l': 'pc02',
  'máy chiết báng răng': 'btbtp', 'máy chiết bang rang': 'btbtp',
  'máy chiết tube hàn nhiệt': 'pl02', 'máy chiết tube han nhiet': 'pl02',
  'máy chiết đóng tube hàn nhiệt': 'pl02', 'máy chiết dong tube han nhiet': 'pl02',
  'máy chiết 4 vòi bơm khí': 'pl01', 'máy chiết 4 voi bom khi': 'pl01',
  'máy chiết 4 vòi bơm từ':  'pl05', 'máy chiết 4 voi bom tu':  'pl05',
  // alias tên phòng cũ (phân liệu → phân liều) để khớp bản ghi DB cũ
  'phân liệu 01': 'pl01', 'phòng phân liệu 01': 'pl01',
  'phân liệu 02': 'pl02', 'phòng phân liệu 02': 'pl02',
  'phân liệu 03': 'pl03', 'phòng phân liệu 03': 'pl03',
  'phân liệu 04': 'pl04', 'phòng phân liệu 04': 'pl04',
  'phân liệu 05': 'pl05', 'phòng phân liệu 05': 'pl05',
  // alias tên mới
  'phân liều 01': 'pl01', 'phòng phân liều 01': 'pl01',
  'phân liều 02': 'pl02', 'phòng phân liều 02': 'pl02',
  'phân liều 03': 'pl03', 'phòng phân liều 03': 'pl03',
  'phân liều 04': 'pl04', 'phòng phân liều 04': 'pl04',
  'phân liều 05': 'pl05', 'phòng phân liều 05': 'pl05',
  'biệt trữ bán thành phẩm': 'btbtp',
}

// Grid coords for floor plan hotspots — grid is 46 cols × 34 rows
// g = [col_start, col_end, row_start, row_end] (1-based)
const FP_COLS = 46, FP_ROWS = 34
const FLOOR_PLAN_ROOMS_GRID = [
  {id:'pc05',     g:[2,6,9,17]},
  {id:'btbtp',    g:[7,10,9,11]},
  {id:'al4',      g:[7,10,11,14]},
  {id:'pl05',     g:[7,10,14,17]},
  {id:'hoanthien',g:[11,19,9,17]},
  {id:'pl04',     g:[2,6,17,19]},
  {id:'bt',       g:[7,17,17,24]},
  {id:'vsbc1',    g:[17,20,17,21]},
  {id:'giatqa',   g:[20,22,17,21]},
  {id:'quandoc',  g:[22,25,17,21]},
  {id:'pl03',     g:[2,6,19,21]},
  {id:'vsbbnl',   g:[22,25,21,23]},
  {id:'pl02',     g:[2,6,21,24]},
  {id:'btnl',     g:[22,25,23,25]},
  {id:'rac',      g:[2,4,24,26]},
  {id:'al3',      g:[4,6,24,26]},
  {id:'pl01',     g:[7,10,24,26]},
  {id:'pc04',     g:[10,13,24,26]},
  {id:'pc03',     g:[13,17,24,26]},
  {id:'al2',      g:[17,20,21,26]},
  {id:'al1',      g:[20,22,21,26]},
  {id:'tdnu2',    g:[22,25,25,27]},
  {id:'hanhlang', g:[7,22,26,27]},
  {id:'ruadc',    g:[2,6,27,31]},
  {id:'dcsach',   g:[6,9,27,31]},
  {id:'ipc',      g:[9,12,27,31]},
  {id:'pc02',     g:[12,15,27,31]},
  {id:'pc01',     g:[15,19,27,31]},
  {id:'pcan',     g:[19,21,27,31]},
  {id:'tdnam2',   g:[22,25,27,31]},
  {id:'pc06',     g:[43,46,14,18]},
]

function PhongSuDungPanel({ storageKey = 'phong_usage', autoFromSchedule = false }) {
  const todayStr = dayjs().format('YYYY-MM-DD')
  const [currentDate, setCurrentDate] = useState(todayStr)
  const [currentData, setCurrentData] = useState({})
  const [showHistory, setShowHistory] = useState(false)
  const [historyDates, setHistoryDates] = useState([])
  const [machineOptions, setMachineOptions] = useState([])
  const [scheduleRoomIds, setScheduleRoomIds] = useState(new Set())
  const [scheduleRoomInfo, setScheduleRoomInfo] = useState({}) // roomId → "tenTrinh – soLo ..."
  const [viewMode, setViewMode] = useState('list')

  const loadDate = (dateStr) => {
    try {
      const raw = localStorage.getItem(storageKey + ':' + dateStr)
      setCurrentData(raw ? JSON.parse(raw) : {})
    } catch { setCurrentData({}) }
  }
  const saveData = (dateStr, data) => {
    try { localStorage.setItem(storageKey + ':' + dateStr, JSON.stringify(data)) } catch {}
  }

  useEffect(() => { loadDate(currentDate) }, [currentDate])
  useEffect(() => {
    api.get('/phong-thuc-hien').then(r => setMachineOptions((r.data || []).map(m => ({ value: m.id, label: m.ten })))).catch(() => {})
  }, [])
  useEffect(() => {
    if (!autoFromSchedule) return
    setScheduleRoomIds(new Set())
    setScheduleRoomInfo({})
    api.get('/work-schedule', { params: { page: 0, size: 500, source: 'PLAN', fromDate: currentDate, toDate: currentDate } })
      .then(({ data }) => {
        const ids = new Set()
        const infoMap = {}
        const roomNameMap = Object.fromEntries(PHONG_ROOMS.map(r => [r.name.toLowerCase(), r.id]))
        const lookupRoom = (str) => {
          const key = str.trim().toLowerCase()
          let rid = roomNameMap[key] || PHONG_TH_TO_ROOM[key]
          if (!rid && key.startsWith('phòng ')) rid = roomNameMap[key.slice(6)] || PHONG_TH_TO_ROOM[key.slice(6)]
          return rid
        }
        const addInfo = (rid, r) => {
          const info = [r.tenTrinh, r.soLo].filter(Boolean).join(' – ')
          if (!info) return
          infoMap[rid] = infoMap[rid] ? infoMap[rid] + '\n' + info : info
        }
        ;(data.content || []).forEach(r => {
          if (r.phongThucHien) {
            const name = r.phongThucHien.trim()
            let rid = lookupRoom(name)
            if (!rid) {
              const dashIdx = name.indexOf(' - ')
              if (dashIdx !== -1) rid = lookupRoom(name.substring(dashIdx + 3))
            }
            if (rid) { ids.add(rid); addInfo(rid, r) }
          }
          if (r.phongSanXuat) {
            const rid = lookupRoom(r.phongSanXuat)
            if (rid) { ids.add(rid); addInfo(rid, r) }
          }
        })
        setScheduleRoomIds(ids)
        setScheduleRoomInfo(infoMap)
      }).catch(() => {})
  }, [currentDate, autoFromSchedule])

  const shiftDate = (delta) => setCurrentDate(dayjs(currentDate).add(delta, 'day').format('YYYY-MM-DD'))

  const toggleRoom = (roomId) => {
    const now = new Date().toISOString()
    const prev = currentData[roomId] || {inUse: false, note: ''}
    const next = { ...currentData, [roomId]: { ...prev, inUse: !prev.inUse, updatedAt: now } }
    setCurrentData(next)
    saveData(currentDate, next)
  }
  const updateNote = (roomId, note) => {
    const now = new Date().toISOString()
    const prev = currentData[roomId] || {inUse: false, note: '', machines: []}
    const next = { ...currentData, [roomId]: { ...prev, note, updatedAt: now } }
    setCurrentData(next)
    saveData(currentDate, next)
  }
  const updateMachines = (roomId, mIds) => {
    const now = new Date().toISOString()
    const prev = currentData[roomId] || {inUse: false, note: '', machines: []}
    const next = { ...currentData, [roomId]: { ...prev, machines: mIds, inUse: mIds.length > 0, updatedAt: now } }
    setCurrentData(next)
    saveData(currentDate, next)
  }

  const openHistory = () => {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(storageKey + ':')) {
        const d = k.replace(storageKey + ':', '')
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) keys.push(d)
      }
    }
    keys.sort((a, b) => b.localeCompare(a))
    setHistoryDates(keys.slice(0, 30))
    setShowHistory(true)
  }

  const isRoomActive = (id) => {
    if (ALWAYS_ACTIVE_ROOMS.has(id)) return true
    if (scheduleRoomIds.has(id)) return true
    if (currentData[id]?.inUse) return true
    const storedMachines = currentData[id]?.machines
    if (storedMachines !== undefined) return storedMachines.length > 0
    // Phòng có default machine keyword → coi như đang hoạt động nếu máy tồn tại
    const kw = ROOM_DEFAULT_MACHINE_KEYWORDS[id]
    if (kw && machineOptions.some(o => o.label.toLowerCase().includes(kw.toLowerCase()))) return true
    return false
  }
  const totalRooms = PHONG_ROOMS.length
  const activeRooms = PHONG_ROOMS.filter(r => isRoomActive(r.id)).length
  const activeArea  = PHONG_ROOMS.filter(r => isRoomActive(r.id)).reduce((s, r) => s + r.area, 0)
  const fillPct = Math.round(activeRooms / totalRooms * 100)
  const isToday = currentDate === todayStr
  const fmtD = (ds) => { const [y,m,d] = ds.split('-'); return `${d}/${m}/${y}` }

  return (
    <div style={{ background: '#f4f5f7', paddingTop: 4, paddingBottom: 32 }}>
      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { val: `${activeRooms} / ${totalRooms}`, lbl: 'Phòng đang sử dụng', color: '#4f46e5' },
          { val: `${activeArea.toFixed(1)}`, lbl: 'm² đang vận hành', color: '#16a34a' },
          { val: `${fillPct}%`, lbl: 'Tỷ lệ lấp đầy phòng', color: '#1c2430' },
        ].map(c => (
          <div key={c.lbl} style={{ background: '#fff', border: '1px solid #e2e5ea', borderRadius: 12, padding: '12px 18px', flex: 1, minWidth: 140 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color: c.color }}>{c.val}</div>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginTop: 2 }}>{c.lbl}</div>
          </div>
        ))}
      </div>

      {/* Date nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap', background: '#99FFFF', border: '1px solid #00bcd4', borderRadius: 14, padding: '10px 16px' }}>
        <button onClick={() => shiftDate(-1)} style={{ width: 38, height: 38, borderRadius: '50%', border: '1px solid #00bcd4', background: '#fff', cursor: 'pointer', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>‹</button>
        <div style={{ fontWeight: 800, fontSize: 18, minWidth: 200, textAlign: 'center', color: '#1c2430', letterSpacing: 0.3 }}>
          {fmtD(currentDate)} · {WEEKDAYS_VI[dayjs(currentDate).day()]}{isToday ? ' · Hôm nay' : ''}
        </div>
        <button onClick={() => shiftDate(1)} style={{ width: 38, height: 38, borderRadius: '50%', border: '1px solid #00bcd4', background: '#fff', cursor: 'pointer', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>›</button>
        <input type="date" value={currentDate} onChange={e => e.target.value && setCurrentDate(e.target.value)}
          style={{ border: '1px solid #00bcd4', borderRadius: 8, padding: '6px 10px', fontSize: 14, background: '#fff' }} />
        <button onClick={() => setCurrentDate(todayStr)}
          style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Hôm nay</button>
        <button onClick={openHistory}
          style={{ background: '#fff', color: '#374151', border: '1px solid #00bcd4', borderRadius: 20, padding: '7px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>🕘 Lịch sử</button>
      </div>

      {/* View mode toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[
          { key: 'list', label: '📋 Danh sách phòng' },
          { key: 'map',  label: '🗺️ Sơ đồ mặt bằng' },
        ].map(v => (
          <button key={v.key} onClick={() => setViewMode(v.key)} style={{
            padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            border: 'none', cursor: 'pointer',
            background: viewMode === v.key ? '#0e7490' : '#fff',
            color: viewMode === v.key ? '#fff' : '#374151',
            boxShadow: viewMode === v.key ? '0 2px 8px rgba(14,116,144,.3)' : '0 1px 3px rgba(0,0,0,.08)',
          }}>{v.label}</button>
        ))}
      </div>

      {/* Floor plan */}
      {viewMode === 'map' && (
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #dbe0e6', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.06)', marginBottom: 16 }}>
          <div style={{ minWidth: 900 }}>
            <img src="/mat-bang.png" alt="Sơ đồ mặt bằng" style={{ display: 'block', width: '100%', height: 'auto', userSelect: 'none' }} />
          </div>
        </div>
      )}

      {/* Zone grids */}
      {viewMode === 'list' && PHONG_ZONES.map(zone => {
        const rooms = PHONG_ROOMS.filter(r => r.zone === zone)
        if (!rooms.length) return null
        const zoneActive = rooms.filter(r => isRoomActive(r.id)).length
        return (
          <div key={zone} style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 10px' }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#4f46e5', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>{zone}</span>
              <span style={{ fontSize: 12, color: '#9aa2b1', fontWeight: 500 }}>{zoneActive}/{rooms.length} đang hoạt động</span>
              <div style={{ flex: 1, borderTop: '1px solid #e2e5ea' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
              {rooms.map(r => {
                const st = currentData[r.id] || {inUse: false, note: ''}
                const effectiveMachines = (() => {
                  if (st.machines !== undefined) return st.machines
                  const kw = ROOM_DEFAULT_MACHINE_KEYWORDS[r.id]
                  if (!kw) return []
                  const match = machineOptions.find(o => o.label.toLowerCase().includes(kw.toLowerCase()))
                  return match ? [match.value] : []
                })()
                const isActive = isRoomActive(r.id)
                const alwaysOn = ALWAYS_ACTIVE_ROOMS.has(r.id)
                const fromSchedule = scheduleRoomIds.has(r.id) && !st.inUse && !alwaysOn
                const toggleOn = isActive  // toggle visual reflects real active state
                return (
                  <div key={r.id} style={{
                    background: isActive ? '#99FFFF' : '#fff',
                    border: `1px solid ${isActive ? '#00bcd4' : '#e2e5ea'}`,
                    borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
                    boxShadow: '0 1px 3px rgba(16,24,40,.06)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: '#9aa2b1', fontFamily: 'monospace', marginTop: 2 }}>{r.area.toFixed(1)} m²</div>
                      </div>
                      <label style={{ position: 'relative', width: 40, height: 22, flexShrink: 0, cursor: alwaysOn ? 'default' : 'pointer', opacity: alwaysOn ? 0.6 : 1 }}>
                        <input type="checkbox" checked={toggleOn} disabled={alwaysOn} onChange={alwaysOn ? undefined : () => toggleRoom(r.id)}
                          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
                        <span style={{ position: 'absolute', inset: 0, background: toggleOn ? '#16a34a' : '#f1f2f4', border: `1px solid ${toggleOn ? '#16a34a' : '#e2e5ea'}`, borderRadius: 999, display: 'block' }}>
                          <span style={{ position: 'absolute', width: 16, height: 16, top: 2, left: toggleOn ? 20 : 2, background: '#fff', borderRadius: '50%', transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,.25)', display: 'block' }} />
                        </span>
                      </label>
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, alignSelf: 'flex-start', background: fromSchedule ? '#e0f7ff' : isActive ? '#eafaf0' : '#f1f2f4', color: fromSchedule ? '#0284c7' : isActive ? '#16a34a' : '#9aa2b1' }}>
                      {fromSchedule ? 'THEO KẾ HOẠCH' : isActive ? 'ĐANG SỬ DỤNG' : 'TRỐNG'}
                    </span>
                    {machineOptions.length > 0 && (
                      <Select
                        mode="multiple"
                        size="small"
                        placeholder="Máy thực hiện..."
                        style={{ width: '100%' }}
                        value={effectiveMachines}
                        onChange={ids => updateMachines(r.id, ids)}
                        options={machineOptions}
                        optionFilterProp="label"
                      />
                    )}
                    {(() => {
                      const hasStored = r.id in currentData && 'note' in currentData[r.id]
                      const autoNote = hasStored ? (currentData[r.id].note || '') : (scheduleRoomInfo[r.id] || ROOM_DEFAULT_NOTES[r.id] || '')
                      return (
                        <textarea
                          key={r.id + '|' + currentDate + '|' + (scheduleRoomInfo[r.id] || '')}
                          defaultValue={autoNote}
                          placeholder="Ghi chú: LSX / tổ / ca..."
                          onBlur={e => updateNote(r.id, e.target.value)}
                          rows={autoNote.includes('\n') ? autoNote.split('\n').length + 1 : 2}
                          style={{ width: '100%', border: '1px solid #e2e5ea', borderRadius: 8, padding: '5px 8px', fontSize: 12, color: '#1c2430', background: autoNote && !hasStored ? '#fffbe6' : '#fafbfc', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5 }}
                        />
                      )
                    })()}
                    {currentData[r.id]?.updatedAt && (
                      <div style={{ fontSize: 10.5, color: '#9aa2b1', fontFamily: 'monospace' }}>
                        Cập nhật: {new Date(currentData[r.id].updatedAt).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* History modal */}
      {showHistory && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowHistory(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,32,.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 20px', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.25)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e5ea', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Lịch sử theo ngày</span>
              <button onClick={() => setShowHistory(false)} style={{ border: 'none', background: '#f1f2f4', width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '8px 10px' }}>
              {historyDates.length === 0
                ? <div style={{ padding: 24, textAlign: 'center', color: '#9aa2b1', fontSize: 12.5 }}>Chưa có dữ liệu nào được ghi nhận.</div>
                : historyDates.map(ds => {
                  let count = 0
                  try { const raw = localStorage.getItem(storageKey + ':' + ds); if (raw) count = Object.values(JSON.parse(raw)).filter(v => v.inUse).length } catch {}
                  return (
                    <div key={ds} onClick={() => { setShowHistory(false); setCurrentDate(ds) }}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 10, cursor: 'pointer', gap: 10, background: ds === currentDate ? '#eef0fe' : undefined, border: ds === currentDate ? '1px solid #c7c9fb' : '1px solid transparent' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtD(ds)}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>{WEEKDAYS_VI[dayjs(ds).day()]}</div>
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, color: '#4f46e5' }}>{count}/{totalRooms}</div>
                    </div>
                  )
                })
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function resolveGdCd(r) {
  const rawCd = r.congDoan?.toUpperCase()
  const nhom = (r.nhomThucHien || r.toNhom)?.toUpperCase()
  let cd = rawCd
  if (rawCd === 'PC') {
    if (nhom === 'PCPL1') cd = 'PCPL1'
    else if (nhom === 'PCPL2') cd = 'PCPL2'
    else if (nhom === 'PCPL3' || nhom === 'PL') cd = 'PL'
    else cd = 'PCPL1'
  } else if (rawCd === 'PCPL3') {
    cd = 'PL'
  } else if (rawCd === 'PL') {
    // Công đoạn Phân liều (PL) do tổ PCPL1 hoặc PCPL3 thực hiện — bản ghi của PCPL1
    // tính vào tổ PCPL1, nhóm 'PL' chỉ tính đúng bản ghi của tổ PCPL3
    if (nhom === 'PCPL1') cd = 'PCPL1'
    else if (nhom === 'PCPL3') cd = 'PL'
  } else if (rawCd === 'CC') {
    cd = nhom === 'PCPL2' ? 'PCPL2' : 'PCPL1'
  }
  return cd
}

function DashboardGDTab() {
  const [raw, setRaw]           = useState([])
  const [loading, setLoading]   = useState(false)
  const [period, setPeriod]     = useState('month')
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()])
  const [loaiMap, setLoaiMap]     = useState({}) // maSp → loaiSanPham
  const [machineMap, setMachineMap] = useState({}) // maSp → {pc, pl, bbc1, dg}
  const [analysisTab, setAnalysisTab] = useState('chung')
  const [trendTab, setTrendTab] = useState('chung')
  const [gdSubTab, setGdSubTab] = useState('tongquan')
  const [drillTeam, setDrillTeam] = useState(null)
  const [ref2025ByTo, setRef2025ByTo]     = useState(null)
  const [refH1_26ByTo, setRefH1_26ByTo]   = useState(null)

  useEffect(() => {
    api.get('/san-luong-tong-hop', { params: { page: 0, size: 9999 } })
      .then(({ data: res }) => {
        const rows = res.content || []
        const mk = () => ({ PCPL1: { sl: 0, cong: 0 }, PCPL2: { sl: 0, cong: 0 }, PL: { sl: 0, cong: 0 }, DG: { sl: 0, cong: 0 }, BBC1: { sl: 0, cong: 0 } })
        const acc2025 = mk(), accH1_26 = mk()
        rows.forEach(r => {
          const lsx = r.lsx || ''
          if (lsx.length < 6) return
          const mm = lsx.slice(2, 4), yy = lsx.slice(4, 6)
          if (!/^\d{2}$/.test(mm) || !/^\d{2}$/.test(yy)) return
          const is2025  = yy === '25'
          const isH1_26 = yy === '26' && Number(mm) <= 6
          if (!is2025 && !isH1_26) return
          const acc = is2025 ? acc2025 : accH1_26
          const to = (r.toThucHien || '').toUpperCase()
          if (to === 'PCPL1') {
            acc.PCPL1.sl   += Number(r.soLuong) || 0
            acc.PCPL1.cong += (Number(r.pcChiPhi) || 0) + (Number(r.plChiPhi) || 0)
          }
          if (to === 'PCPL2') {
            acc.PCPL2.sl   += Number(r.soLuong) || 0
            acc.PCPL2.cong += (Number(r.pcChiPhi) || 0) + (Number(r.ccChiPhi) || 0)
          }
          acc.PL.sl   += Number(r.pcPl)    || 0
          acc.PL.cong += Number(r.plChiPhi) || 0
          acc.DG.sl   += Number(r.dg2)     || 0
          acc.DG.cong += Number(r.dgChiPhi) || 0
          acc.BBC1.sl   += Number(r.bbc1_2) || 0
          acc.BBC1.cong += Number(r.bbc1_3) || 0
        })
        const toNS = acc => Object.fromEntries(
          Object.entries(acc).map(([k, { sl, cong }]) => [k, cong > 0 ? Math.round(sl / cong) : null])
        )
        setRef2025ByTo(toNS(acc2025))
        setRefH1_26ByTo(toNS(accH1_26))
      })
      .catch(() => {})
  }, []) // eslint-disable-line

  const fetchGD = useCallback(async (range = dateRange) => {
    setLoading(true)
    try {
      const { data } = await api.get('/work-schedule-session/daily-report', {
        params: { fromDate: range[0].format('YYYY-MM-DD'), toDate: range[1].format('YYYY-MM-DD') },
      })
      const rows = Array.isArray(data) ? data.filter(r => r.status === 'SAVED' || r.status === 'PENDING') : []
      setRaw(rows)
      const codes = [...new Set(rows.map(r => r.maSp).filter(Boolean))]
      if (codes.length > 0) {
        api.get('/product-master/lookup-batch', { params: { codes } })
          .then(({ data: bm }) => {
            const lm = {}, mm = {}
            codes.forEach(c => {
              if (bm[c]?.loaiSanPham) lm[c] = bm[c].loaiSanPham
              if (bm[c]) mm[c] = { pc: bm[c].mayMocPc, pl: bm[c].mayMocPl, bbc1: bm[c].mayMocBbc1, dg: bm[c].mayMocDg }
            })
            setLoaiMap(lm)
            setMachineMap(mm)
          })
          .catch(() => {})
      }
    } catch { message.error('Không thể tải dữ liệu') }
    finally { setLoading(false) }
  }, [dateRange])

  useEffect(() => { fetchGD() }, []) // eslint-disable-line

  const handlePeriod = (key) => {
    const p = GD_PERIODS.find(x => x.key === key)
    const r = p.range()
    setPeriod(key); setDateRange(r); fetchGD(r)
  }

  const { byTo, kpi, dailyTrend, byLoai, byMay, teamProductMap } = useMemo(() => {
    const byTo = {}
    GD_TO.forEach(t => { byTo[t.key] = { sl: 0, cong: 0, congPc: 0, congPl: 0, congCc: 0, lo: 0 } })
    const teamProductMap = {}
    GD_TO.forEach(t => { teamProductMap[t.key] = {} })
    const dayMap = {}, loaiAgg = {}, mayAgg = {}
    const days = new Set(), cas = new Set()
    let totalSl = 0, totalCong = 0, slDg = 0

    const getMachine = (cd, mSp) => {
      if (!mSp) return null
      if (cd === 'PCPL1' || cd === 'PCPL2') return mSp.pc
      if (cd === 'PL') return mSp.pl
      if (cd === 'DG') return mSp.dg
      if (cd === 'BBC1') return mSp.bbc1
      return null
    }

    raw.forEach(r => {
      const cd = resolveGdCd(r)
      if (!byTo[cd]) return
      const rawCongDoan = r.congDoan?.toUpperCase()
      const isCC = rawCongDoan === 'CC'
      // Bản ghi công đoạn PL/PCPL3 được gom vào tổ PCPL1 khi toNhom=PCPL1 (tự làm phân liều
      // cho SP của mình) — công của bản ghi này phải tính là "Công PL", không phải "Công PC"
      const isPlStage = rawCongDoan === 'PL' || rawCongDoan === 'PCPL3'
      const sl   = isCC ? 0 : Number(r.sanLuong || 0)
      const cong = Number(r.congThucHien  || 0)
      byTo[cd].sl += sl; byTo[cd].cong += cong; byTo[cd].lo++
      if (isCC) byTo[cd].congCc += cong
      else if (isPlStage) byTo[cd].congPl += cong
      else byTo[cd].congPc += cong
      totalSl += sl; totalCong += cong
      // teamProductMap: gộp dữ liệu theo tổ + mã SP (cho drill-down)
      const maSp_dr = r.maSp || '?'
      if (!teamProductMap[cd][maSp_dr]) {
        teamProductMap[cd][maSp_dr] = { maSp: maSp_dr, maBravo: r.maBravo || '', tenTrinh: r.tenTrinh || '', sl: 0, cong: 0, congPc: 0, congPl: 0, congCc: 0, loCount: new Set() }
      }
      const _tp = teamProductMap[cd][maSp_dr]
      _tp.sl += sl; _tp.cong += cong
      if (!_tp.maBravo && r.maBravo) _tp.maBravo = r.maBravo
      if (!_tp.tenTrinh && r.tenTrinh) _tp.tenTrinh = r.tenTrinh
      if (r.soLo) _tp.loCount.add(r.soLo)
      if (isCC) _tp.congCc += cong
      else if (isPlStage) _tp.congPl += cong
      else _tp.congPc += cong
      if (cd === 'DG') slDg += sl
      if (r.ngay) {
        days.add(r.ngay)
        if (!dayMap[r.ngay]) {
          dayMap[r.ngay] = { ngay: r.ngay, sl: 0, cong: 0 }
          GD_TO.forEach(t => { dayMap[r.ngay][t.key] = { sl: 0, cong: 0 } })
        }
        dayMap[r.ngay].sl += sl; dayMap[r.ngay].cong += cong
        if (dayMap[r.ngay][cd]) {
          dayMap[r.ngay][cd].sl += sl; dayMap[r.ngay][cd].cong += cong
        }
      }
      if (r.caSanXuat) cas.add(r.ngay + '_' + r.caSanXuat)
      // Phân tích theo loại SP
      const loai = loaiMap[r.maSp] || '(Chưa phân loại)'
      if (!loaiAgg[loai]) { loaiAgg[loai] = { loai, sl: 0, cong: 0 }; GD_TO.forEach(t => { loaiAgg[loai][t.key] = { sl: 0, cong: 0 } }) }
      loaiAgg[loai].sl += sl; loaiAgg[loai].cong += cong
      if (loaiAgg[loai][cd]) { loaiAgg[loai][cd].sl += sl; loaiAgg[loai][cd].cong += cong }
      // Phân tích theo máy móc
      const rawMay = getMachine(cd, machineMap[r.maSp]) || '(Chưa có máy)'
      const mayList = rawMay.split(',').map(m => m.trim()).filter(Boolean)
      mayList.forEach(may => {
        if (!mayAgg[may]) { mayAgg[may] = { may, sl: 0, cong: 0 }; GD_TO.forEach(t => { mayAgg[may][t.key] = { sl: 0, cong: 0 } }) }
        mayAgg[may].sl += sl / mayList.length
        mayAgg[may].cong += cong / mayList.length
        if (mayAgg[may][cd]) { mayAgg[may][cd].sl += sl / mayList.length; mayAgg[may][cd].cong += cong / mayList.length }
      })
    })

    return {
      byTo,
      teamProductMap,
      kpi: { tongSl: totalSl, slDg, tongCong: totalCong, nsTb: totalCong > 0 ? slDg / totalCong : 0, soNgay: days.size, soCa: cas.size },
      dailyTrend: Object.values(dayMap).sort((a, b) => a.ngay.localeCompare(b.ngay))
        .map(d => ({ ...d, label: dayjs(d.ngay).format('DD/MM') })),
      byLoai: Object.values(loaiAgg).sort((a, b) => b.sl - a.sl),
      byMay: Object.values(mayAgg).sort((a, b) => b.sl - a.sl),
    }
  }, [raw, loaiMap, machineMap])

  // PL: SL/Công thực tế của tổ PCPL3 (byTo['PL'] đã được gom đúng theo resolveGdCd,
  // không loại trừ SP trùng mã với PCPL1 — mỗi tổ hiển thị đúng phần việc của mình)
  const barData = GD_TO.map(t => ({
    name: t.label,
    sl:   byTo[t.key]?.sl   || 0,
    cong: byTo[t.key]?.cong || 0,
  }))

  return (
    <div style={{ padding: '16px 20px', background: '#f0f4f8', minHeight: 'calc(100vh - 50px)' }}>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f2a4a 0%, #1e3a5f 60%, #0e7490 100%)',
        borderRadius: 12, padding: '18px 24px', marginBottom: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      }}>
        <div>
          <div style={{ color: '#7dd3fc', fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 4 }}>
            QTSX SONG AN · PRODUCTION INTELLIGENCE
          </div>
          <div style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>Dashboard Giám Đốc Sản Xuất</div>
          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
            {dateRange[0]?.format('DD/MM/YYYY')} – {dateRange[1]?.format('DD/MM/YYYY')}
            {' · '}{raw.length.toLocaleString('vi-VN')} ca · {kpi.soNgay} ngày sản xuất
          </div>
        </div>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => fetchGD()}
          style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 8 }} />
      </div>

      {/* ── Sub-tab selector ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { key: 'tongquan', label: '📊 Tổng quan sản xuất' },
          { key: 'phong',    label: '🏠 Phòng đang sử dụng' },
          { key: 'kehoach',  label: '📋 Phòng Kế Hoạch' },
        ].map(t => (
          <button key={t.key} onClick={() => setGdSubTab(t.key)} style={{
            padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            border: 'none', cursor: 'pointer', transition: 'all .15s',
            background: gdSubTab === t.key ? '#0e7490' : '#fff',
            color: gdSubTab === t.key ? '#fff' : '#374151',
            boxShadow: gdSubTab === t.key ? '0 2px 8px rgba(14,116,144,.3)' : '0 1px 3px rgba(0,0,0,.08)',
          }}>{t.label}</button>
        ))}
      </div>

      {gdSubTab === 'phong'    && <PhongSuDungPanel storageKey="phong_usage" />}
      {gdSubTab === 'kehoach'  && <PhongSuDungPanel storageKey="phong_kehoach" autoFromSchedule />}
      {gdSubTab === 'tongquan' && <>

      {/* ── Period selector ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {GD_PERIODS.map(p => (
          <Button key={p.key} size="small"
            onClick={() => handlePeriod(p.key)}
            style={{
              borderRadius: 20, fontWeight: 600, fontSize: 12,
              background: period === p.key ? '#0e7490' : '#fff',
              borderColor: period === p.key ? '#0e7490' : '#d9d9d9',
              color: period === p.key ? '#fff' : '#374151',
            }}>
            {p.label}
          </Button>
        ))}
        <RangePicker size="small" value={dateRange} format="DD/MM/YYYY"
          onChange={r => { if (r) { setDateRange(r); setPeriod(null); fetchGD(r) } }}
          style={{ marginLeft: 8, borderRadius: 8 }} />
      </div>

      <Spin spinning={loading}>

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
          {[
            { label: 'SL ĐÓNG GÓI', val: fmtSL(kpi.slDg), unit: 'sản phẩm (ĐG)', icon: '📦', grad: 'linear-gradient(135deg,#1e3a8a,#1d4ed8)', acc: '#93c5fd' },
            { label: 'TỔNG CÔNG',       val: fmtCong(kpi.tongCong, 2), unit: 'công', icon: '👷', grad: 'linear-gradient(135deg,#064e3b,#059669)', acc: '#6ee7b7' },
            { label: 'NĂNG SUẤT TB',    val: kpi.nsTb > 0 ? kpi.nsTb.toLocaleString('vi-VN',{maximumFractionDigits:1}) : '—', unit: 'SP / công', icon: '⚡', grad: 'linear-gradient(135deg,#78350f,#d97706)', acc: '#fde68a' },
            { label: 'SỐ NGÀY SX',      val: kpi.soNgay, unit: 'ngày', icon: '📅', grad: 'linear-gradient(135deg,#3b0764,#7c3aed)', acc: '#d8b4fe' },
          ].map(c => (
            <div key={c.label} style={{ background: c.grad, borderRadius: 8, padding: '8px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', color: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 20, lineHeight: 1 }}>{c.icon}</div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, color: c.acc, textTransform: 'uppercase', marginBottom: 1 }}>{c.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.1 }}>{c.val}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{c.unit}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Chart + Table ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 12, marginBottom: 12 }}>

          {/* Bar chart SL by tổ */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e3a5f', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChartOutlined style={{ color: '#0e7490', fontSize: 16 }} />
              Sản lượng theo Tổ / Công đoạn
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={barData} layout="vertical" margin={{ left: 6, right: 50, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={v => v >= 1000 ? (v/1000).toFixed(0)+'k' : v} fontSize={11} tick={{ fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="name" width={48} fontSize={12} fontWeight={700} />
                <RcTooltip formatter={v => [v.toLocaleString('vi-VN') + ' SP', 'Sản lượng']} />
                <Bar dataKey="sl" name="Sản lượng" radius={[0, 6, 6, 0]}>
                  {GD_TO.map((t, i) => <Cell key={i} fill={t.slColor} />)}
                  <LabelList dataKey="sl" position="right" fontSize={11} fontWeight={700}
                    formatter={v => v > 0 ? v.toLocaleString('vi-VN') : ''} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Breakdown table */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e3a5f', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TeamOutlined style={{ color: '#0e7490', fontSize: 16 }} />
              Chi tiết Sản lượng &amp; Công theo Tổ
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Tổ', 'Sản Lượng', 'Công', 'NS (SP/cg)', '% SL', '% Công', 'NS TB 2025', 'NS 6T-2026'].map(h => (
                    <th key={h} style={{ padding: '7px 10px', textAlign: h === 'Tổ' ? 'left' : 'right', fontWeight: 700, color: '#64748b', fontSize: 10, borderBottom: '2px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GD_TO.map((t, i) => {
                  const d   = byTo[t.key] || { sl: 0, cong: 0 }
                  // PCPL1: tổng công = Công PC + Công PL (tự làm phân liều), không tính Công CC
                  const effectiveCong = t.key === 'PCPL1' ? ((byTo['PCPL1']?.congPc || 0) + (byTo['PCPL1']?.congPl || 0)) : d.cong
                  const ns  = effectiveCong > 0 ? d.sl / effectiveCong : 0
                  const pSl   = kpi.tongSl   > 0 ? d.sl   / kpi.tongSl   * 100 : 0
                  const pCong = kpi.tongCong > 0 ? d.cong / kpi.tongCong * 100 : 0
                  return (
                    <tr key={t.key}
                      onClick={() => setDrillTeam(t.key)}
                      style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 4, height: 22, borderRadius: 2, background: t.slColor, flexShrink: 0 }} />
                          <div>
                            <span style={{ fontWeight: 800, color: t.slColor, fontSize: 13 }}>{t.label}</span>
                            {t.key === 'PCPL1' && <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 500, marginTop: 1 }}>gồm Công PL</div>}
                            {t.key === 'PCPL2' && <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 500, marginTop: 1 }}>gồm Cân Chia</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                        {d.sl > 0 ? d.sl.toLocaleString('vi-VN') : <span style={{ color: '#d9d9d9' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', color: '#374151' }}>
                        {effectiveCong > 0 ? effectiveCong.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : <span style={{ color: '#d9d9d9' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', color: '#475569' }}>
                        {ns > 0 ? ns.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : <span style={{ color: '#d9d9d9' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right' }}>
                        {pSl > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                            <div style={{ width: 48, height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(pSl, 100)}%`, height: '100%', background: t.slColor, borderRadius: 3 }} />
                            </div>
                            <span style={{ color: t.slColor, fontWeight: 700, minWidth: 38, textAlign: 'right' }}>{pSl.toFixed(1)}%</span>
                          </div>
                        ) : <span style={{ color: '#d9d9d9' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', color: '#64748b' }}>
                        {pCong > 0 ? pCong.toFixed(1) + '%' : <span style={{ color: '#d9d9d9' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', color: '#475569' }}>
                        {ref2025ByTo
                          ? (ref2025ByTo[t.key] != null
                            ? ref2025ByTo[t.key].toLocaleString('vi-VN')
                            : <span style={{ color: '#d9d9d9' }}>—</span>)
                          : <span style={{ color: '#d9d9d9' }}>…</span>}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', color: '#475569' }}>
                        {refH1_26ByTo
                          ? (refH1_26ByTo[t.key] != null
                            ? refH1_26ByTo[t.key].toLocaleString('vi-VN')
                            : <span style={{ color: '#d9d9d9' }}>—</span>)
                          : <span style={{ color: '#d9d9d9' }}>…</span>}
                      </td>
                    </tr>
                  )
                })}
                <tr style={{ background: '#f0f9ff', borderTop: '2px solid #bae6fd' }}>
                  <td style={{ padding: '10px', fontWeight: 800, color: '#0e7490', fontSize: 12, paddingLeft: 14 }}>TRUNG BÌNH</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 900, color: '#0e7490', fontSize: 14 }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 400, marginBottom: 1 }}>SL ĐG</div>
                    {kpi.slDg > 0 ? kpi.slDg.toLocaleString('vi-VN') : <span style={{ color: '#d9d9d9' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#0e7490' }}>{kpi.tongCong > 0 ? kpi.tongCong.toLocaleString('vi-VN',{minimumFractionDigits:2,maximumFractionDigits:2}) : <span style={{ color: '#d9d9d9' }}>—</span>}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#0e7490' }}>{kpi.nsTb > 0 ? kpi.nsTb.toLocaleString('vi-VN',{maximumFractionDigits:1}) : '—'}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                </tr>
              </tbody>
            </table>
            <div style={{ padding: '6px 14px 8px', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
              * Dữ liệu sản lượng bắt đầu nhập từ tháng 6/2026; NS TB 2025 và NS 6T-2026 được tính từ dữ liệu trên bảng sản lượng chung
            </div>
          </div>
        </div>

        {/* ── Trend chart ── */}
        {dailyTrend.length > 1 && (() => {
          const TREND_TABS = [{ key: 'chung', label: 'Chung' }, ...GD_TO.map(t => ({ key: t.key, label: t.label }))]
          const activeTrendGdTo = GD_TO.find(t => t.key === trendTab)
          const trendData = trendTab === 'chung'
            ? dailyTrend
            : dailyTrend
                .map(d => ({ ...d, sl: d[trendTab]?.sl || 0, cong: d[trendTab]?.cong || 0 }))
                .filter(d => d.sl > 0 || d.cong > 0)
          const lineColor  = activeTrendGdTo?.slColor || '#1d4ed8'
          const barColor   = activeTrendGdTo ? activeTrendGdTo.slColor + '44' : '#bfdbfe'
          return (
            <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <RiseOutlined style={{ color: '#0e7490', fontSize: 16 }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: '#1e3a5f' }}>Xu hướng sản lượng theo ngày</span>
                <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', flexWrap: 'wrap' }}>
                  {TREND_TABS.map(t => {
                    const gdTo = GD_TO.find(g => g.key === t.key)
                    return (
                      <button key={t.key} onClick={() => setTrendTab(t.key)}
                        style={{
                          padding: '3px 11px', borderRadius: 16, fontSize: 11, fontWeight: 700,
                          cursor: 'pointer', border: 'none',
                          background: trendTab === t.key ? (gdTo?.slColor || '#0e7490') : '#f1f5f9',
                          color: trendTab === t.key ? '#fff' : '#475569',
                          transition: 'all 0.15s',
                        }}>
                        {t.label}
                      </button>
                    )
                  })}
                </div>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400, whiteSpace: 'nowrap' }}>
                  Cột = SL · Đường cam = Công
                </span>
              </div>
              {trendData.length > 1 ? (
                <ResponsiveContainer width="100%" height={210}>
                  <ComposedChart data={trendData} margin={{ left: 0, right: 24, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" fontSize={11} tick={{ fill: '#64748b' }} />
                    <YAxis yAxisId="sl" tickFormatter={v => v >= 1000 ? (v/1000).toFixed(0)+'k' : v} fontSize={11} tick={{ fill: lineColor }} />
                    <YAxis yAxisId="cong" orientation="right" fontSize={11} tick={{ fill: '#059669' }} />
                    <RcTooltip formatter={(v, n) => [v.toLocaleString('vi-VN') + (n === 'sl' ? ' SP' : ' công'), n === 'sl' ? 'Sản lượng' : 'Công']} />
                    <Legend formatter={v => v === 'sl' ? 'Sản lượng (SP)' : 'Công (ca)'} wrapperStyle={{ fontSize: 12 }} />
                    <Bar yAxisId="sl" dataKey="sl" name="sl" fill={barColor} radius={[3,3,0,0]} />
                    <Line yAxisId="sl" type="monotone" dataKey="sl" name="sl" stroke={lineColor} strokeWidth={2.5} dot={{ r: 3, fill: lineColor }} legendType="none" />
                    <Line yAxisId="cong" type="monotone" dataKey="cong" name="cong" stroke="#059669" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
                  Không có dữ liệu cho tổ {activeTrendGdTo?.label} trong khoảng thời gian này
                </div>
              )}
            </div>
          )
        })()}

        {/* ── Phân tích sản lượng ── */}
        {(byLoai.length > 0 || byMay.length > 0) && (() => {
          const TABS = [{ key: 'chung', label: 'Chung' }, ...GD_TO.map(t => ({ key: t.key, label: t.label }))]
          const activeStage = analysisTab === 'chung' ? null : analysisTab

          // Data theo tab đang chọn
          const loaiRows = activeStage
            ? byLoai.map(l => ({ ...l, sl: l[activeStage]?.sl || 0, cong: l[activeStage]?.cong || 0 }))
              .filter(l => l.sl > 0).sort((a, b) => b.sl - a.sl)
            : byLoai

          const mayRows = activeStage
            ? byMay.map(m => ({ ...m, sl: m[activeStage]?.sl || 0, cong: m[activeStage]?.cong || 0 }))
              .filter(m => m.sl > 0).sort((a, b) => b.sl - a.sl)
            : byMay

          const totalSl   = loaiRows.reduce((s, r) => s + r.sl,   0)
          const totalCong = loaiRows.reduce((s, r) => s + r.cong, 0)
          const totalMaySl   = mayRows.reduce((s, r) => s + r.sl,   0)
          const totalMayCong = mayRows.reduce((s, r) => s + r.cong, 0)

          const fmtN = v => v > 0 ? Math.round(v).toLocaleString('vi-VN') : '—'
          const fmtC = v => v > 0 ? v.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
          const fmtP = (v, total) => total > 0 && v > 0 ? (v / total * 100).toFixed(1) + '%' : '—'

          const LOAI_COLORS = ['#1d4ed8','#0369a1','#0e7490','#b45309','#6d28d9','#059669','#be123c','#92400e']
          const MAY_COLORS  = ['#0f766e','#0369a1','#7c3aed','#b45309','#047857','#0e7490','#be123c','#92400e','#1d4ed8','#6d28d9']

          return (
            <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
              {/* Header + tab bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BarChartOutlined style={{ color: '#0e7490' }} />
                  Phân tích Sản lượng theo Loại SP &amp; Máy móc
                </div>
                <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', flexWrap: 'wrap' }}>
                  {TABS.map(t => {
                    const gdTo = GD_TO.find(g => g.key === t.key)
                    return (
                      <button key={t.key} onClick={() => setAnalysisTab(t.key)}
                        style={{
                          padding: '3px 11px', borderRadius: 16, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                          background: analysisTab === t.key ? (gdTo?.slColor || '#0e7490') : '#f1f5f9',
                          color: analysisTab === t.key ? '#fff' : '#475569',
                          transition: 'all 0.15s',
                        }}>
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 20 }}>

                {/* Bảng loại SP */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                    Theo Loại Sản Phẩm
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Loại SP', 'SL', 'Công', '% SL', '% Công'].map(h => (
                          <th key={h} style={{ padding: '6px 8px', textAlign: h === 'Loại SP' ? 'left' : 'right', fontWeight: 700, color: '#64748b', fontSize: 10, borderBottom: '2px solid #e2e8f0', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loaiRows.map((row, i) => (
                        <tr key={row.loai} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '8px 8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 3, height: 16, borderRadius: 2, background: LOAI_COLORS[i % LOAI_COLORS.length], flexShrink: 0 }} />
                              <span style={{ fontWeight: 600, color: '#1e3a5f', fontSize: 12 }}>{row.loai}</span>
                            </div>
                            <div style={{ height: 3, background: '#f1f5f9', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                              <div style={{ width: `${totalSl > 0 ? row.sl / totalSl * 100 : 0}%`, height: '100%', background: LOAI_COLORS[i % LOAI_COLORS.length], borderRadius: 2 }} />
                            </div>
                          </td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{fmtN(row.sl)}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', color: '#374151' }}>{fmtC(row.cong)}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', color: LOAI_COLORS[i % LOAI_COLORS.length], fontWeight: 700 }}>{fmtP(row.sl, totalSl)}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', color: '#64748b' }}>{fmtP(row.cong, totalCong)}</td>
                        </tr>
                      ))}
                      {loaiRows.length === 0 && (
                        <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Không có dữ liệu</td></tr>
                      )}
                      <tr style={{ background: '#f0f9ff', borderTop: '2px solid #bae6fd' }}>
                        <td style={{ padding: '7px 8px', fontWeight: 800, color: '#0e7490', fontSize: 11 }}>TỔNG</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 900, color: '#0e7490' }}>{fmtN(totalSl)}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: '#0e7490' }}>{fmtC(totalCong)}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', color: '#94a3b8' }}>100%</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', color: '#94a3b8' }}>100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Phân tích máy móc */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                    Theo Máy Móc Sử Dụng
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Máy', 'SL', 'Công', 'NS', '% SL', '% Công'].map(h => (
                          <th key={h} style={{ padding: '6px 7px', textAlign: h === 'Máy' ? 'left' : 'right', fontWeight: 700, color: '#64748b', fontSize: 10, borderBottom: '2px solid #e2e8f0', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mayRows.map((row, i) => {
                        const ns = row.cong > 0 ? row.sl / row.cong : 0
                        return (
                          <tr key={row.may} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={{ padding: '8px 7px', minWidth: 140 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 3, height: 16, borderRadius: 2, background: MAY_COLORS[i % MAY_COLORS.length], flexShrink: 0 }} />
                                <span style={{ fontWeight: 600, color: '#1e3a5f', fontSize: 12, wordBreak: 'break-word' }}>{row.may}</span>
                              </div>
                              <div style={{ height: 3, background: '#f1f5f9', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                                <div style={{ width: `${totalMaySl > 0 ? row.sl / totalMaySl * 100 : 0}%`, height: '100%', background: MAY_COLORS[i % MAY_COLORS.length], borderRadius: 2 }} />
                              </div>
                            </td>
                            <td style={{ padding: '8px 7px', textAlign: 'right', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>{fmtN(row.sl)}</td>
                            <td style={{ padding: '8px 7px', textAlign: 'right', color: '#374151', whiteSpace: 'nowrap' }}>{fmtC(row.cong)}</td>
                            <td style={{ padding: '8px 7px', textAlign: 'right', color: '#475569', whiteSpace: 'nowrap' }}>{ns > 0 ? Math.round(ns).toLocaleString('vi-VN') : '—'}</td>
                            <td style={{ padding: '8px 7px', textAlign: 'right', color: MAY_COLORS[i % MAY_COLORS.length], fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtP(row.sl, totalMaySl)}</td>
                            <td style={{ padding: '8px 7px', textAlign: 'right', color: '#64748b', whiteSpace: 'nowrap' }}>{fmtP(row.cong, totalMayCong)}</td>
                          </tr>
                        )
                      })}
                      {mayRows.length === 0 && (
                        <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Không có dữ liệu — kiểm tra mục Máy móc trong danh mục SP</td></tr>
                      )}
                      <tr style={{ background: '#f0fff4', borderTop: '2px solid #bbf7d0' }}>
                        <td style={{ padding: '7px 7px', fontWeight: 800, color: '#059669', fontSize: 11 }}>TỔNG</td>
                        <td style={{ padding: '7px 7px', textAlign: 'right', fontWeight: 900, color: '#059669' }}>{fmtN(totalMaySl)}</td>
                        <td style={{ padding: '7px 7px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>{fmtC(totalMayCong)}</td>
                        <td style={{ padding: '7px 7px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                        <td style={{ padding: '7px 7px', textAlign: 'right', color: '#94a3b8' }}>100%</td>
                        <td style={{ padding: '7px 7px', textAlign: 'right', color: '#94a3b8' }}>100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          )
        })()}

      </Spin>
      </>}

      {/* ── Drill-down: chi tiết sản phẩm theo tổ ── */}
      {drillTeam && (() => {
        const gdTo = GD_TO.find(t => t.key === drillTeam)
        const isPcpl1 = drillTeam === 'PCPL1'
        const isPcpl2 = drillTeam === 'PCPL2'
        const showBreakdown = isPcpl1 || isPcpl2
        // Chi tiết PL: lấy toàn bộ SP thuộc tổ PCPL3 (resolveGdCd đã map PCPL3/PL → 'PL')
        const products = Object.values(teamProductMap[drillTeam] || {}).filter(p => p.sl > 0)
          .sort((a, b) => b.sl - a.sl)
        const colCount = showBreakdown ? 6 : 5
        return (
          <Modal
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 4, height: 18, borderRadius: 2, background: gdTo?.slColor }} />
                <span>Chi tiết sản phẩm — {gdTo?.label}</span>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400, marginLeft: 4 }}>({products.length} mã SP)</span>
              </div>
            }
            open={!!drillTeam}
            onCancel={() => setDrillTeam(null)}
            footer={null}
            width={showBreakdown ? 1100 : 950}
            styles={{ body: { padding: '16px 20px', maxHeight: '75vh', overflowY: 'auto' } }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {[
                    { label: 'Sản phẩm', align: 'left' },
                    { label: 'Số lô', align: 'left' },
                    { label: 'SL', align: 'right' },
                    ...(isPcpl1 ? [{ label: 'Công PC', align: 'right' }, { label: 'Công PL', align: 'right' }] : []),
                    ...(isPcpl2 ? [{ label: 'Công PC', align: 'right' }, { label: 'Công CC', align: 'right' }] : []),
                    ...(!showBreakdown ? [{ label: 'Công', align: 'right' }] : []),
                    { label: 'Tổng Công', align: 'right' },
                  ].map(h => (
                    <th key={h.label} style={{ padding: '7px 10px', textAlign: h.align, fontWeight: 700, color: '#64748b', fontSize: 10, borderBottom: '2px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => {
                  const congPl = isPcpl1 ? (p.congPl || 0) : 0
                  const totalCong = isPcpl1 ? (p.congPc + congPl) : p.cong
                  const fmtCong = n => n > 0 ? n.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
                  const lots = [...p.loCount]
                  return (
                    <tr key={p.maSp} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                      {/* Sản phẩm: Mã SP + Mã Bravo + Tên SP */}
                      <td style={{ padding: '9px 10px', minWidth: 180 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: 'monospace', color: gdTo?.slColor, fontWeight: 700 }}>{p.maSp}</span>
                          {p.maBravo && <span style={{ fontFamily: 'monospace', color: '#1677ff', fontSize: 11, background: '#eff6ff', padding: '1px 5px', borderRadius: 3 }}>{p.maBravo}</span>}
                        </div>
                        {p.tenTrinh && <div style={{ fontSize: 10, color: '#64748b', marginTop: 2, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.tenTrinh}</div>}
                      </td>
                      {/* Số lô */}
                      <td style={{ padding: '9px 10px', maxWidth: 200 }}>
                        {lots.length > 0
                          ? <div style={{ fontSize: 10, color: '#475569', lineHeight: 1.6, wordBreak: 'break-word' }}>
                              {lots.map((lo) => (
                                <span key={lo} style={{ display: 'inline-block', background: '#f1f5f9', borderRadius: 3, padding: '0 5px', marginRight: 3, marginBottom: 2 }}>{lo}</span>
                              ))}
                            </div>
                          : <span style={{ color: '#cbd5e1', fontSize: 11 }}>—</span>
                        }
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {p.sl > 0 ? p.sl.toLocaleString('vi-VN') : '—'}
                      </td>
                      {isPcpl1 && <>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: '#374151' }}>{fmtCong(p.congPc)}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: '#0e7490', fontWeight: congPl > 0 ? 600 : 400 }}>{fmtCong(congPl)}</td>
                      </>}
                      {isPcpl2 && <>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: '#374151' }}>{fmtCong(p.congPc)}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: '#b45309', fontWeight: p.congCc > 0 ? 600 : 400 }}>{fmtCong(p.congCc)}</td>
                      </>}
                      {!showBreakdown && <td style={{ padding: '9px 10px', textAlign: 'right', color: '#374151' }}>{fmtCong(p.cong)}</td>}
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{fmtCong(totalCong)}</td>
                    </tr>
                  )
                })}
                {products.length === 0 && (
                  <tr><td colSpan={colCount} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>Không có dữ liệu</td></tr>
                )}
              </tbody>
              {/* Hàng tổng */}
              {products.length > 0 && (() => {
                const fmtCong = n => n > 0 ? n.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'
                const sumSl      = products.reduce((s, p) => s + p.sl, 0)
                const sumCongPc  = products.reduce((s, p) => s + p.congPc, 0)
                const sumCongCc  = products.reduce((s, p) => s + p.congCc, 0)
                const sumCongPl  = isPcpl1 ? products.reduce((s, p) => s + (p.congPl || 0), 0) : 0
                const sumCong    = products.reduce((s, p) => s + p.cong, 0)
                const sumTotal   = isPcpl1 ? (sumCongPc + sumCongPl) : sumCong
                const cellStyle  = { padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: 12 }
                return (
                  <tfoot>
                    <tr style={{ background: '#f0f9ff', borderTop: '2px solid #bae6fd' }}>
                      <td style={{ padding: '9px 10px', fontWeight: 700, color: '#0f172a', fontSize: 12 }}>TỔNG</td>
                      <td style={{ padding: '9px 10px', fontSize: 11, color: '#64748b' }}>{products.length} mã SP</td>
                      <td style={{ ...cellStyle, color: gdTo?.slColor || '#0f172a' }}>{sumSl > 0 ? sumSl.toLocaleString('vi-VN') : '—'}</td>
                      {isPcpl1 && <>
                        <td style={cellStyle}>{fmtCong(sumCongPc)}</td>
                        <td style={{ ...cellStyle, color: '#0e7490' }}>{fmtCong(sumCongPl)}</td>
                      </>}
                      {isPcpl2 && <>
                        <td style={cellStyle}>{fmtCong(sumCongPc)}</td>
                        <td style={{ ...cellStyle, color: '#b45309' }}>{fmtCong(sumCongCc)}</td>
                      </>}
                      {!showBreakdown && <td style={cellStyle}>{fmtCong(sumCong)}</td>}
                      <td style={{ ...cellStyle, color: '#0369a1' }}>{fmtCong(sumTotal)}</td>
                    </tr>
                  </tfoot>
                )
              })()}
            </table>
          </Modal>
        )
      })()}

    </div>
  )
}

// ─── Page chính: wrapper Tabs ─────────────────────────────────────────────────

export default function DailySanLuongPage() {
  const { user, isAdmin, isAdminKH, isQuanDoc, isManHinh, isTKSX, isTPSX, isGiamDoc } = useAuth()
  const canApprove     = isAdmin() || isAdminKH()
  const canViewAnalytics = isAdmin() || isTKSX() || isTPSX()
  const canViewNhapKho = isAdmin() || isAdminKH() || isQuanDoc() || user?.role === 'ADMIN_DG'
  const canViewDashboardGD = isAdmin() || isGiamDoc?.()
  const manHinh = isManHinh()
  const location = useLocation()

  // Đọc ?tab= từ URL, fallback localStorage, rồi mới default 'daily'
  const tabFromUrl = new URLSearchParams(location.search).get('tab')
  const [activeTab, setActiveTab] = useState(() => {
    if (manHinh) return 'baocao'
    const t = tabFromUrl || localStorage.getItem('dailysl_activeTab') || 'daily'
    if (!canViewAnalytics && (t === 'thongke' || t === 'phantich' || t === 'suDungMay')) return 'daily'
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
    ...(canViewAnalytics ? [{
      key: 'suDungMay',
      label: (
        <span>
          <ClockCircleOutlined style={{ marginRight: 5 }} />
          Sử dụng máy
        </span>
      ),
      children: <MachineUsageTab />,
    }] : []),
    ...(canViewAnalytics ? [{
      key: 'thoiGianSuDungMay',
      label: (
        <span>
          <SettingOutlined style={{ marginRight: 5 }} />
          Thời gian sử dụng máy
        </span>
      ),
      children: <MachineUsageTimeTab />,
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
    ...(canViewDashboardGD ? [{
      key: 'dashboardgd',
      label: (
        <span>
          <RiseOutlined style={{ marginRight: 5 }} />
          Dashboard GĐ
        </span>
      ),
      children: <DashboardGDTab />,
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
