import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Table, Button, Space, Typography, message, Select, DatePicker,
  Tooltip, Modal, Input, Badge, Tag, Tabs, Popconfirm
} from 'antd'
import SkeletonTable from '../components/SkeletonTable'
import {
  SearchOutlined, ReloadOutlined, BarChartOutlined,
  CheckOutlined, CloseOutlined, ClockCircleOutlined,
  RiseOutlined, TeamOutlined, FundOutlined, DeleteOutlined, ExclamationCircleOutlined,
  FullscreenOutlined, FullscreenExitOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const { RangePicker } = DatePicker

// ─── Shared constants ────────────────────────────────────────────────────────

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
    data.filter(r => r.ngay === today && r.status !== 'IN_PROGRESS'),
  [data, today])

  const yesterdayRows = useMemo(() =>
    data.filter(r => r.ngay === yesterday && r.status !== 'IN_PROGRESS'),
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
  const { isAdmin, isAdminKH } = useAuth()
  const canApprove = isAdmin() || isAdminKH()

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
    () => localStorage.getItem('daily_congDoan') || ''
  )
  const [filterTienTrinh, setFilterTienTrinh] = useState('')

  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [rejectModal, setRejectModal] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectingId, setRejectingId] = useState(null)
  const [actionLoading, setActionLoading] = useState({})
  const [nsTbMap, setNsTbMap] = useState({}) // maSp → slTrungBinh (năng suất trung bình)
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

  // Lấy slTrungBinh từ ProductMaster cho các maSp xuất hiện trong data
  const fetchNsTb = useCallback(async (rows) => {
    const uniqueMaSp = [...new Set(rows.filter(r => r.maSp).map(r => r.maSp))]
    if (!uniqueMaSp.length) return
    const results = await Promise.allSettled(
      uniqueMaSp.map(maSp =>
        api.get(`/product-master/lookup/${encodeURIComponent(maSp)}`)
           .then(({ data }) => ({ maSp, slTrungBinh: data.slTrungBinh }))
      )
    )
    const map = {}
    results.forEach(r => {
      if (r.status === 'fulfilled' && r.value.slTrungBinh != null) {
        map[r.value.maSp] = Number(r.value.slTrungBinh)
      }
    })
    setNsTbMap(map)
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
    setCongDoan('')
    setFilterTienTrinh('')
    fetchData(def, '')
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
        cd = (nhom === 'PCPL1' || nhom === 'PCPL2') ? nhom : 'PCPL1'
      }
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
      title: 'Mã SP', dataIndex: 'maSp', key: 'maSp', width: 90, align: 'center',
      render: v => v ? <Tag color="blue" style={{ marginRight: 0 }}>{v}</Tag> : <span style={{ color: '#bbb' }}>—</span>,
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
      <div ref={filterRef} style={{ position: 'sticky', top: 0, zIndex: 20 }}>

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
        <Select size="small" value={congDoan} onChange={setCongDoan}
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
        sticky={{ offsetHeader: filterH }}
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
        destroyOnClose
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
      const cd = r.congDoan?.toUpperCase()
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
      width={1100}
      destroyOnClose
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
          return (
            <div key={s.key} style={{
              background: s.bg, border: `1.5px solid ${s.border}`,
              borderRadius: 8, padding: '5px 14px', minWidth: 130,
            }}>
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
          scroll={{ x: 1050 }}
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
  const [dateRange, setDateRange] = useState([dayjs().subtract(13, 'day'), dayjs()])
  const [selectedDay, setSelectedDay] = useState(null)
  const [empCounts, setEmpCounts] = useState({})

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
    Promise.all(STAGES.map(s => api.get('/employees', { params: { page: 0, size: 1, toNhom: s.empGroup } })))
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
    const def = [dayjs().subtract(13, 'day'), dayjs()]
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
        cd = (nhom === 'PCPL1' || nhom === 'PCPL2') ? nhom : 'PCPL1'
      }
      if (!map[date][cd]) map[date][cd] = { sl: 0, cong: 0, soPhien: 0 }
      map[date][cd].sl      += Number(r.sanLuong      || 0)
      map[date][cd].cong    += Number(r.congThucHien  || 0)
      map[date][cd].soPhien += 1
    })
    return Object.values(map).sort((a, b) => b.ngay.localeCompare(a.ngay))
  }, [raw])

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
      onHeaderCell: () => ({ style: { background: '#99CCCC', color: '#1e3a5f', fontSize: 11 } }),
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
      onHeaderCell: () => ({ style: { background: '#99CCCC', color: '#1e3a5f', textAlign: 'center', borderLeft: '2px solid rgba(0,0,0,0.08)' } }),
      children: [
        {
          title: 'SL',
          key: `${s.key}_sl`,
          width: 95, align: 'center',
          onHeaderCell: () => ({ style: { background: '#b3d9d9', color: '#1e3a5f', fontSize: 10 } }),
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
          onHeaderCell: () => ({ style: { background: '#b3d9d9', color: '#1e3a5f', fontSize: 10 } }),
          render: (_, r) => {
            const val = r[s.key]?.cong
            if (!val) return <span style={{ color: '#d1d5db' }}>—</span>
            return <span style={{ color: s.congColor, fontWeight: 600 }}>{fmtCong(val)}</span>
          },
        },
      ],
    })),
    {
      title: 'TỔNG SL', key: 'grandSl', width: 110, align: 'center', fixed: 'right',
      onHeaderCell: () => ({ style: { background: '#99CCCC', color: '#1e3a5f', fontSize: 11 } }),
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
      onHeaderCell: () => ({ style: { background: '#99CCCC', color: '#1e3a5f', fontSize: 11 } }),
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
        position: 'sticky', top: 0, zIndex: 20,
        background: 'linear-gradient(135deg, #FF9933 0%, #FFBB55 100%)',
        borderBottom: '3px solid #e07800',
        boxShadow: '0 3px 12px rgba(200,100,0,0.25)',
      }}>

      {/* Row 1: Tiêu đề + filter + tổng */}
      <div style={{ padding: '9px 16px 8px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: '#5c2e00', whiteSpace: 'nowrap', letterSpacing: 0.3 }}>
          <FundOutlined style={{ marginRight: 6 }} />Tổng Hợp Sản Lượng
        </span>
        <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.15)' }} />
        <RangePicker size="small" value={dateRange} onChange={setDateRange}
          format="DD/MM/YYYY" allowClear placeholder={['Từ ngày', 'Đến ngày']} />
        <Button size="small" type="primary" icon={<SearchOutlined />}
          style={{ background: '#d45f00', borderColor: '#d45f00', fontWeight: 600 }}
          onClick={() => fetchData()}>Truy xuất</Button>
        <Button size="small" icon={<ReloadOutlined />} onClick={handleReset}
          style={{ background: 'rgba(255,255,255,0.25)', borderColor: 'rgba(0,0,0,0.2)', color: '#5c2e00' }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#7a3900' }}><strong style={{ color: '#5c2e00' }}>{pivotData.length}</strong> ngày</span>
          <span style={{ fontSize: 12, color: '#7a3900' }}>Nhân sự: <strong style={{ color: '#5c2e00' }}>{Object.values(empCounts).reduce((a, b) => a + b, 0) || '...'}</strong></span>
          <span style={{ fontSize: 13, color: '#5c2e00', fontWeight: 700 }}>SL: <strong style={{ color: '#5c2e00', fontSize: 15 }}>{fmtSL(grandSL)}</strong></span>
          <span style={{ fontSize: 13, color: '#5c2e00', fontWeight: 700 }}>Công: <strong style={{ color: '#5c2e00', fontSize: 15 }}>{fmtCong(grandCong, 2)}</strong></span>
        </div>
      </div>

      </div>{/* end sticky filter wrapper */}

      <style>{`
        .tonghop-table .ant-table-thead > tr > th {
          background: #99CCCC !important;
          color: #000099 !important; text-align: center !important;
          text-transform: uppercase; font-size: 11px !important; font-weight: 700 !important;
          letter-spacing: 0.5px; padding: 8px 6px !important;
          border-right: 1px solid rgba(0,0,0,0.1) !important; white-space: nowrap;
        }
        .tonghop-table .ant-table-thead > tr:last-child > th {
          background: #b3d9d9 !important;
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
          background: #99CCCC !important; color: #000099 !important;
          font-weight: 700; font-size: 12px; padding: 8px 10px !important;
          border-top: 2px solid #66b3b3 !important;
        }
      `}</style>

      <SkeletonTable
        className="tonghop-table"
        columns={columns}
        dataSource={pivotData}
        rowKey="ngay"
        loading={loading}
        size="small"
        scroll={{ x: 1300 }}
        sticky={{ offsetHeader: filterH }}
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
                  <Table.Summary.Cell key={`sl${i}`} index={i * 2 + 1} align="right">
                    <strong style={{ color: '#fff' }}>{fmtSL(tot[s.key].sl)}</strong>
                  </Table.Summary.Cell>,
                  <Table.Summary.Cell key={`cong${i}`} index={i * 2 + 2} align="right">
                    <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{fmtCong(tot[s.key].cong, 2)}</strong>
                  </Table.Summary.Cell>,
                ])}
                <Table.Summary.Cell index={11} align="right">
                  <strong style={{ color: '#fff', fontSize: 13 }}>{fmtSL(gSl)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={12} align="right">
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

  const fetchData = useCallback(async (range = dateRange) => {
    setLoading(true)
    try {
      const params = {}
      if (range?.[0]) params.fromDate = range[0].format('YYYY-MM-DD')
      if (range?.[1]) params.toDate   = range[1].format('YYYY-MM-DD')
      const { data: res } = await api.get('/work-schedule-session/daily-report', { params })
      setRaw(Array.isArray(res) ? res : [])
    } catch {
      message.error('Không thể tải dữ liệu báo cáo')
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => { fetchData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* Filter bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
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

// ─── Page chính: wrapper Tabs ─────────────────────────────────────────────────

export default function DailySanLuongPage() {
  const { isAdmin, isAdminKH, isManHinh } = useAuth()
  const canApprove = isAdmin() || isAdminKH()
  const manHinh = isManHinh()
  const location = useLocation()

  // Đọc ?tab= từ URL, fallback localStorage, rồi mới default 'daily'
  const tabFromUrl = new URLSearchParams(location.search).get('tab')
  const [activeTab, setActiveTab] = useState(
    manHinh ? 'baocao' : (tabFromUrl || localStorage.getItem('dailysl_activeTab') || 'daily')
  )

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
  ]

  return (
    <>
      <style>{`
        .sl-page-tabs > .ant-tabs-nav {
          background: rgb(32,178,170) !important;
          padding: 0 12px; margin: 0 !important; box-shadow: 0 2px 12px rgba(0,0,0,0.22);
        }
        .sl-page-tabs > .ant-tabs-nav .ant-tabs-tab {
          color: #ffffff !important; border: none !important; background: transparent !important;
          padding: 9px 18px !important; font-size: 13px; margin: 0 2px !important;
          border-radius: 6px 6px 0 0 !important; transition: all 0.2s;
        }
        .sl-page-tabs > .ant-tabs-nav .ant-tabs-tab:hover { color: #99ffe8 !important; background: rgba(0,204,153,0.12) !important; }
        .sl-page-tabs > .ant-tabs-nav .ant-tabs-tab-active { color: #fff !important; background: rgba(0,204,153,0.18) !important; font-weight: 700; box-shadow: 0 -3px 0 #00CC99 inset; }
        .sl-page-tabs > .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-btn { color: #fff !important; }
        .sl-page-tabs > .ant-tabs-nav .ant-tabs-ink-bar { background: #00CC99 !important; height: 3px !important; border-radius: 2px; }
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
