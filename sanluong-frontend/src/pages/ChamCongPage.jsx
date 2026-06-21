import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  Table, Button, message, DatePicker, Select,
  Tabs, Tag, Tooltip, Drawer, Modal, Form, TimePicker, Input, Popconfirm
} from 'antd'
import {
  SearchOutlined, ReloadOutlined, FileDoneOutlined,
  TeamOutlined, ClockCircleOutlined, ApartmentOutlined, LoginOutlined,
  EditOutlined, PlusOutlined, DeleteOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

dayjs.extend(isoWeek)

const { RangePicker } = DatePicker

const TIME_DEPTS = ['ĐG', 'BBC1', 'PCPL1', 'PCPL2', 'PCPL3']
const DEPT_COLOR = { PC: '#1D4ED8', PL: '#1677ff', ĐG: '#d48806', BBC1: '#531dab', PCPL1: '#c41d7f', PCPL2: '#08979c', PCPL3: '#d46b08' }

const fmt4 = v => (v || 0).toLocaleString('vi-VN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
const fmt2 = v => (v || 0).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const calcCong = r => {
  if (!r.gioVao || !r.gioRa || !r.caThucHien) return 0
  const soGio = (dayjs(`2000-01-01T${r.gioRa}`).diff(dayjs(`2000-01-01T${r.gioVao}`), 'minute') - 60) / 60
  if (soGio <= 0) return 0
  return r.caThucHien === 'HC' ? soGio / 8 : soGio <= 7 ? soGio / 7 : 1 + (soGio - 7) / 8
}

const PERIOD_OPTS = [
  { key: 'week',   label: 'Tuần này' },
  { key: 'month',  label: 'Tháng này' },
  { key: 'custom', label: 'Tùy chỉnh' },
]

function getWeekRange()  { return [dayjs().startOf('isoWeek'), dayjs().endOf('isoWeek')] }
function getMonthRange() { return [dayjs().startOf('month'), dayjs().endOf('month')] }

function buildDateList(from, to) {
  const dates = []
  let cur = from.clone()
  while (cur.isBefore(to, 'day') || cur.isSame(to, 'day')) {
    dates.push(cur.format('YYYY-MM-DD'))
    cur = cur.add(1, 'day')
  }
  return dates
}

function DeptLabel({ value }) {
  const color = DEPT_COLOR[value] || '#999'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
      <span style={{ color, fontWeight: 600, fontSize: 12 }}>{value}</span>
    </span>
  )
}

function DeptPills({ value, onChange, counts }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '10px 16px', background: '#fff', borderBottom: '1px solid #F1F5F9' }}>
      {[{ key: 'all', label: 'Tất cả' }, ...TIME_DEPTS.map(d => ({ key: d, label: d }))].map(({ key, label }) => {
        const count = counts[key] || 0
        const isActive = value === key
        const color = key === 'all' ? '#3B82F6' : (DEPT_COLOR[key] || '#666')
        return (
          <button key={key} onClick={() => onChange(key)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            border: `1.5px solid ${isActive ? color : '#E2E8F0'}`,
            borderRadius: 20, padding: '4px 14px', cursor: 'pointer',
            background: isActive ? color : '#fff',
            color: isActive ? '#fff' : '#475569',
            fontWeight: isActive ? 700 : 400,
            fontSize: 13, transition: 'all 0.15s', lineHeight: 1.5,
          }}>
            {key !== 'all' && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: isActive ? 'rgba(255,255,255,0.85)' : color, flexShrink: 0 }} />
            )}
            {label} {count}
          </button>
        )
      })}
    </div>
  )
}

// ── Bảng Tăng Ca components ──────────────────────────────────────────────────

const MARK_BG  = { N: '#F9CB9C', X: '#93E08B', C: '#FFF176', H: '#80E5E5', D: '#EFA6E8', B: '#93BCC0' }
const DOW_TC   = ['CN','T2','T3','T4','T5','T6','T7']
const BRUSH_OPTS = [
  { m: '0', isNum: true,  label: 'Nhập giờ TC' },
  { m: 'N', label: 'N · nghỉ nửa ngày' },
  { m: 'X', label: 'X · nghỉ làm'      },
  { m: 'C', label: 'Ca chiều'           },
  { m: 'H', label: 'Hỗ trợ Cò Mềm'    },
  { m: 'D', label: 'Bắt đầu đi làm'   },
  { m: 'B', label: 'Đi Ba Vì'          },
]

function tcAttendOf(v, m) {
  if (m === 'X') return 0
  if (m === 'N') return 0.5
  return v != null ? 1 : 0
}
const tcR1 = n => Math.round(n * 10) / 10

const TcCell = React.memo(function TcCell({ di, v, m, isWknd, isEven, brush, onChange }) {
  const isNum = brush === '0'
  const bg    = MARK_BG[m] || (isWknd ? (isEven ? '#F7EFDD' : '#FBF4E6') : (isEven ? '#FAFAF7' : '#fff'))
  const tdStyle = {
    background: bg, textAlign: 'center', padding: '2px 1px',
    borderRight: '1px solid #EAE8E0', borderBottom: '1px solid #EAE8E0',
    cursor: isNum ? 'default' : 'pointer', width: 36, minWidth: 36,
  }
  const handleClick = () => {
    if (isNum) return
    onChange(di, v, m === brush ? '.' : brush)
  }
  const handleBlur = e => {
    if (!isNum) return
    const raw = (e.target.value || '').trim().replace(',', '.')
    const n   = raw === '' ? null : parseFloat(raw)
    onChange(di, isNaN(n) ? null : n, m)
  }
  return (
    <td onClick={handleClick} style={tdStyle}>
      {isNum
        ? <input type="text" inputMode="decimal" defaultValue={v != null ? String(v) : ''}
            onBlur={handleBlur} onKeyDown={e => e.key === 'Enter' && e.target.blur()}
            style={{ width: 34, border: 'none', background: 'transparent', textAlign: 'center',
                     fontSize: 12, outline: 'none', padding: '1px 0',
                     color: v == null || v === 0 ? '#C4C8CF' : '#192232', cursor: 'text' }} />
        : <span style={{ fontSize: 12, color: m !== '.' ? '#192232' : v != null ? '#192232' : '#C4C8CF' }}>
            {m !== '.' ? m : v != null ? v : ''}
          </span>
      }
    </td>
  )
}, (p, n) => p.v === n.v && p.m === n.m && p.brush === n.brush && p.isWknd === n.isWknd && p.isEven === n.isEven)

const TcRow = React.memo(function TcRow({ emp, stt, dateList, brush, onUpdate, isEven, hidden }) {
  const [cells, setCells] = React.useState(() =>
    Object.fromEntries(dateList.map((_, di) => [di, { v: null, m: '.' }]))
  )
  const cellsRef = React.useRef(cells)
  cellsRef.current = cells

  const rowOT   = React.useMemo(() => dateList.reduce((s, _, di) => { const c = cells[di]; return c?.v != null ? s + c.v : s }, 0), [cells, dateList])
  const rowDays = React.useMemo(() => dateList.reduce((s, _, di) => { const c = cells[di]; return s + tcAttendOf(c?.v ?? null, c?.m ?? '.') }, 0), [cells, dateList])
  React.useEffect(() => { onUpdate(emp.maNhanVien, rowOT, rowDays, cellsRef.current) }, [emp.maNhanVien, rowOT, rowDays, onUpdate])

  const handleChange = React.useCallback((di, v, m) => setCells(prev => ({ ...prev, [di]: { v, m } })), [])

  const altBg  = isEven ? '#FAFAF7' : '#fff'
  const tdBase = { padding: '4px 6px', borderRight: '1px solid #EAE8E0', borderBottom: '1px solid #EAE8E0', fontSize: 12 }
  const stickyTd = { ...tdBase, position: 'sticky', zIndex: 2, background: altBg }
  const overOT = rowOT > 40

  return (
    <tr style={hidden ? { display: 'none' } : undefined}>
      <td style={{ ...stickyTd, left: 0, textAlign: 'center', color: '#8A93A2', minWidth: 36 }}>{stt}</td>
      <td style={{ ...stickyTd, left: 36, fontFamily: 'monospace', fontSize: 11, color: '#4A5567', minWidth: 65 }}>{emp.maNhanVien}</td>
      <td style={{ ...stickyTd, left: 101, fontWeight: 600, minWidth: 160, color: '#192232' }}>{emp.hoVaTen}</td>
      <td style={{ ...tdBase, fontSize: 11, color: '#4A5567', background: altBg, minWidth: 75 }}>{emp.toNhom || '—'}</td>
      {dateList.map((date, di) => {
        const d = dayjs(date)
        const c = cells[di] || { v: null, m: '.' }
        return <TcCell key={di} di={di} v={c.v} m={c.m} isWknd={[0,6].includes(d.day())} isEven={isEven} brush={brush} onChange={handleChange} />
      })}
      <td style={{ ...tdBase, textAlign: 'center', fontWeight: 700, background: overOT ? '#FBEAE7' : '#EAF2EC', color: overOT ? '#B3322A' : '#2E6B53' }}>{rowOT ? tcR1(rowOT) : '0'}</td>
      <td style={{ ...tdBase, textAlign: 'center', fontWeight: 700, background: '#EAF2EC', color: '#2E6B53' }}>{rowDays ? tcR1(rowDays) : '0'}</td>
      <td style={{ ...tdBase, textAlign: 'center', fontWeight: 700, background: '#EAF2EC', color: '#2E6B53' }}>{rowOT ? tcR1(rowOT / 8) : '0'}</td>
    </tr>
  )
})

function TangCaTab({ empRows, offsetHeader }) {
  const [tcPeriod, setTcPeriod]       = React.useState('week')
  const [tcDateRange, setTcDateRange] = React.useState(getWeekRange())
  const tcDateList = React.useMemo(() => buildDateList(tcDateRange[0], tcDateRange[1]), [tcDateRange])

  const [brush, setBrush]       = React.useState('0')
  const [search, setSearch]     = React.useState('')
  const [posFilter, setPosFilter] = React.useState('all')
  const [stats, setStats]       = React.useState({ ot: 0, days: 0, over40: 0 })
  const [footerDay, setFooterDay] = React.useState([])

  // Đo chiều cao phần trên bảng để tính height động
  const topSectionRef = React.useRef(null)
  const [topSectionH, setTopSectionH] = React.useState(170)
  React.useEffect(() => {
    if (!topSectionRef.current) return
    const obs = new ResizeObserver(([e]) => setTopSectionH(e.contentRect.height))
    obs.observe(topSectionRef.current)
    return () => obs.disconnect()
  }, [])

  const rowTotals     = React.useRef({})
  const rowCells      = React.useRef({})
  const tcDateListRef = React.useRef(tcDateList)
  tcDateListRef.current = tcDateList

  React.useEffect(() => {
    rowTotals.current = {}
    rowCells.current  = {}
    setStats({ ot: 0, days: 0, over40: 0 })
    setFooterDay([])
  }, [empRows, tcDateList])

  const onRowUpdate = React.useCallback((maNV, ot, days, cells) => {
    rowTotals.current[maNV] = { ot, days }
    rowCells.current[maNV]  = cells
    const vals      = Object.values(rowTotals.current)
    const totalOT   = vals.reduce((s, r) => s + r.ot, 0)
    const totalDays = vals.reduce((s, r) => s + r.days, 0)
    const nDays     = tcDateListRef.current.length
    const allCells  = Object.values(rowCells.current)
    const dayTotals = Array.from({ length: nDays }, (_, di) =>
      allCells.reduce((s, c) => s + (c[di]?.v ?? 0), 0)
    )
    setStats({ ot: totalOT, days: totalDays, over40: vals.filter(r => r.ot > 40).length })
    setFooterDay(dayTotals)
  }, [])

  const handleTcPeriod = (key) => {
    setTcPeriod(key)
    if (key === 'week')  setTcDateRange(getWeekRange())
    if (key === 'month') setTcDateRange(getMonthRange())
  }

  // Danh sách vị trí duy nhất từ dữ liệu thực
  const positions = React.useMemo(() =>
    [...new Set(empRows.map(e => e.toNhom).filter(Boolean))].sort(),
  [empRows])

  const posCounts = React.useMemo(() => {
    const c = { all: empRows.length }
    positions.forEach(p => { c[p] = empRows.filter(e => e.toNhom === p).length })
    return c
  }, [empRows, positions])

  const handleCSV = () => {
    const header = ['STT', 'Mã NV', 'Họ và tên', 'Vị trí',
      ...tcDateList.map(d => `${dayjs(d).date()}(${DOW_TC[dayjs(d).day()]})`),
      'Cộng giờ TC', 'Ngày đi làm', 'Ngày công TC',
    ]
    const rows = empRows.map((emp, idx) => {
      const cells = rowCells.current[emp.maNhanVien]
        || Object.fromEntries(tcDateList.map((_, di) => [di, { v: null, m: '.' }]))
      const ot   = tcDateList.reduce((s, _, di) => s + (cells[di]?.v ?? 0), 0)
      const days = tcDateList.reduce((s, _, di) => s + tcAttendOf(cells[di]?.v ?? null, cells[di]?.m ?? '.'), 0)
      return [
        idx + 1, emp.maNhanVien || '', emp.hoVaTen || '', emp.toNhom || '',
        ...tcDateList.map((_, di) => {
          const c = cells[di] || { v: null, m: '.' }
          if (c.m === 'X') return 'X'
          if (c.m !== '.') return c.m + (c.v != null ? ' ' + c.v : '')
          return c.v != null ? c.v : ''
        }),
        tcR1(ot), tcR1(days), tcR1(ot / 8),
      ]
    })
    const csv = '﻿' + [header, ...rows].map(r =>
      r.map(c => { c = String(c); return /[",;\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c }).join(',')
    ).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `TangCa_${tcDateRange[0].format('DD-MM-YYYY')}_${tcDateRange[1].format('DD-MM-YYYY')}.csv`
    a.click()
  }

  const searchLc = search.toLowerCase().trim()

  const thBase = {
    position: 'sticky', top: 0, zIndex: 5, background: '#243042', color: '#fff',
    fontWeight: 600, fontSize: 11, padding: '6px 4px', textAlign: 'center',
    borderRight: '1px solid #3a475d', borderBottom: '1px solid #3a475d', whiteSpace: 'nowrap',
  }
  const tfBase = {
    position: 'sticky', bottom: 0, background: '#E7F0EA', fontWeight: 700,
    fontSize: 12, padding: '6px 4px', textAlign: 'center', borderTop: '2px solid #2E6B53', color: '#2E6B53',
  }

  return (
    <div>
      {/* Phần đo chiều cao để tính height bảng */}
      <div ref={topSectionRef}>

        {/* Sticky header — 2 rows compact */}
        <div style={{ position: 'sticky', top: offsetHeader, zIndex: 8, background: '#fff', borderBottom: '1px solid #F1F5F9' }}>

          {/* Row 1: title + date + search + CSV */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px 4px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, color: '#1E293B', fontSize: 13, whiteSpace: 'nowrap' }}>
              <ClockCircleOutlined style={{ color: '#1D4ED8', fontSize: 12 }} />
              Tăng Ca
            </span>

            <div style={{ display: 'flex', gap: 1, background: '#F1F5F9', borderRadius: 7, padding: 2 }}>
              {PERIOD_OPTS.map(p => (
                <button key={p.key} onClick={() => handleTcPeriod(p.key)} style={{
                  border: 'none', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: 12,
                  background: tcPeriod === p.key ? '#fff' : 'transparent',
                  color: tcPeriod === p.key ? '#1D4ED8' : '#64748B',
                  fontWeight: tcPeriod === p.key ? 700 : 400,
                  boxShadow: tcPeriod === p.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s',
                }}>{p.label}</button>
              ))}
            </div>

            <RangePicker
              size="small" value={tcDateRange}
              onChange={v => { if (v) { setTcDateRange(v); setTcPeriod('custom') } }}
              format="DD/MM/YYYY" allowClear={false}
            />

            <span style={{ fontSize: 11, color: '#64748B' }}>
              <b style={{ color: '#1D4ED8' }}>{tcDateRange[0].format('DD/MM')}</b>
              {' → '}
              <b style={{ color: '#1D4ED8' }}>{tcDateRange[1].format('DD/MM')}</b>
              {' · '}
              <b style={{ color: '#475569' }}>{empRows.length}</b> NV
            </span>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, alignItems: 'center' }}>
              <Input
                size="small"
                placeholder="Tìm tên, mã NV..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                prefix={<SearchOutlined style={{ color: '#94A3B8', fontSize: 11 }} />}
                allowClear
                style={{ width: 165 }}
              />
              <Button size="small" onClick={handleCSV}>Xuất CSV</Button>
            </div>
          </div>

          {/* Row 2: brush bar + vị trí pills cùng hàng */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 14px 5px', flexWrap: 'wrap', borderTop: '1px solid #F1F5F9' }}>
            <span style={{ fontSize: 10, color: '#8A93A2', fontWeight: 700, letterSpacing: '.05em', whiteSpace: 'nowrap' }}>CÔNG CỤ:</span>
            {BRUSH_OPTS.map(b => (
              <button key={b.m} onClick={() => setBrush(b.m)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                border: `1.5px solid ${brush === b.m ? '#243042' : '#E2E8F0'}`,
                borderRadius: 999, padding: '2px 8px 2px 6px', cursor: 'pointer', fontSize: 11,
                background: brush === b.m ? '#f0f4f8' : '#fff',
                fontWeight: brush === b.m ? 700 : 400,
                boxShadow: brush === b.m ? '0 0 0 2px #dde5ef' : 'none',
                whiteSpace: 'nowrap',
              }}>
                {b.isNum
                  ? <b style={{ fontWeight: 800, fontSize: 11 }}>123</b>
                  : MARK_BG[b.m] && <span style={{ width: 12, height: 12, borderRadius: 3, background: MARK_BG[b.m], border: '1px solid rgba(0,0,0,.15)', flexShrink: 0 }} />
                }
                {b.label}
              </button>
            ))}

            {positions.length > 0 && (
              <>
                <div style={{ width: 1, height: 16, background: '#e2e8f0', margin: '0 2px', flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: '#8A93A2', fontWeight: 700, letterSpacing: '.05em', whiteSpace: 'nowrap' }}>VỊ TRÍ:</span>
                {[{ key: 'all', label: 'Tất cả' }, ...positions.map(p => ({ key: p, label: p }))].map(({ key, label }) => {
                  const count = posCounts[key] || 0
                  const isActive = posFilter === key
                  return (
                    <button key={key} onClick={() => setPosFilter(key)} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      border: `1.5px solid ${isActive ? '#243042' : '#E2E0D8'}`,
                      borderRadius: 20, padding: '2px 9px', cursor: 'pointer', fontSize: 11,
                      background: isActive ? '#243042' : '#fff',
                      color: isActive ? '#fff' : '#475569',
                      fontWeight: isActive ? 700 : 400,
                      whiteSpace: 'nowrap',
                      transition: 'all 0.12s',
                    }}>
                      {label} <span style={{ opacity: isActive ? 0.75 : 0.5 }}>{count}</span>
                    </button>
                  )
                })}
              </>
            )}
          </div>
        </div>

        {/* Chips — compact */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '5px 14px 6px', background: '#fff', borderBottom: '1px solid #F1F5F9' }}>
          {[
            { v: empRows.length,    label: 'nhân viên' },
            { v: tcDateList.length, label: 'ngày trong kỳ' },
            { v: tcR1(stats.days),  label: 'tổng ngày công chính', leaf: true },
            { v: tcR1(stats.ot),    label: 'tổng giờ tăng ca' },
            ...(stats.over40 > 0 ? [{ v: stats.over40, label: 'người vượt trần 40h', warn: true }] : []),
          ].map((c, i) => (
            <span key={i} style={{ background: c.warn ? '#FBEAE7' : '#F2F1EC', border: '1px solid #E2E0D8', borderRadius: 8, padding: '3px 10px', fontSize: 11 }}>
              <b style={{ fontSize: 13, fontWeight: 800, marginRight: 3, color: c.warn ? '#B3322A' : c.leaf ? '#2E6B53' : 'inherit' }}>{c.v}</b>
              {c.label}
            </span>
          ))}
        </div>

      </div>{/* /topSectionRef */}

      {/* Table — height tự động theo phần trên */}
      <div style={{ overflowX: 'auto', overflowY: 'auto', height: `calc(100vh - ${offsetHeader + topSectionH}px)`, minHeight: 200 }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: 'max-content' }}>
          <thead>
            <tr>
              <th style={{ ...thBase, left: 0, position: 'sticky', zIndex: 6, minWidth: 36 }}>STT</th>
              <th style={{ ...thBase, left: 36, position: 'sticky', zIndex: 6, minWidth: 65 }}>Mã NV</th>
              <th style={{ ...thBase, left: 101, position: 'sticky', zIndex: 6, minWidth: 160, textAlign: 'left', paddingLeft: 8 }}>Họ và tên</th>
              <th style={{ ...thBase, minWidth: 75 }}>Vị trí</th>
              {tcDateList.map(date => {
                const d = dayjs(date)
                const isWknd = [0,6].includes(d.day())
                return (
                  <th key={date} style={{ ...thBase, background: isWknd ? '#3a3320' : '#243042', color: isWknd ? '#f0d9a0' : '#fff', minWidth: 36, padding: '4px 2px' }}>
                    <div style={{ fontSize: 12 }}>{d.date()}</div>
                    <div style={{ fontSize: 9, opacity: 0.8 }}>{DOW_TC[d.day()]}</div>
                  </th>
                )
              })}
              <th style={{ ...thBase, background: '#314a3f', minWidth: 66, whiteSpace: 'normal', lineHeight: 1.2 }}>Cộng giờ<br/>tăng ca</th>
              <th style={{ ...thBase, background: '#314a3f', minWidth: 66, whiteSpace: 'normal', lineHeight: 1.2 }}>Ngày đi làm<br/>thực tế</th>
              <th style={{ ...thBase, background: '#314a3f', minWidth: 66, whiteSpace: 'normal', lineHeight: 1.2 }}>Ngày công<br/>tăng ca</th>
            </tr>
          </thead>
          <tbody>
            {empRows.map((emp, idx) => {
              const matchSearch = !searchLc || emp.hoVaTen?.toLowerCase().includes(searchLc) || emp.maNhanVien?.toLowerCase().includes(searchLc)
              const matchPos    = posFilter === 'all' || emp.toNhom === posFilter
              const hidden      = !matchSearch || !matchPos
              return (
                <TcRow
                  key={emp.maNhanVien + '_' + (tcDateList[0] || '') + '_' + tcDateList.length}
                  emp={emp} stt={idx + 1} dateList={tcDateList}
                  brush={brush} onUpdate={onRowUpdate} isEven={idx % 2 === 1} hidden={hidden}
                />
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={{ ...tfBase, position: 'sticky', bottom: 0, left: 0, zIndex: 5, textAlign: 'right', paddingRight: 12 }}>TỔNG CỘNG</td>
              {tcDateList.map((_, di) => (
                <td key={di} style={{ ...tfBase, color: footerDay[di] ? '#2E6B53' : '#bbb', background: footerDay[di] ? '#E7F0EA' : '#f4f8f5' }}>
                  {footerDay[di] ? tcR1(footerDay[di]) : ''}
                </td>
              ))}
              <td style={{ ...tfBase, background: '#d8e8dd' }}>{tcR1(stats.ot) || '0'}</td>
              <td style={{ ...tfBase, background: '#d8e8dd' }}>{tcR1(stats.days) || '0'}</td>
              <td style={{ ...tfBase, background: '#d8e8dd' }}>{tcR1(stats.ot / 8) || '0'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ChamCongPage() {
  const { canEditAttendance, getAllowedEmployeeGroups } = useAuth()
  const canEdit = canEditAttendance()
  const allowedGroups = getAllowedEmployeeGroups()
  const lockedDept = allowedGroups?.length === 1 ? allowedGroups[0] : null

  const [period, setPeriod]       = useState('week')
  const [dateRange, setDateRange] = useState(getWeekRange())
  const [deptFilter, setDeptFilter] = useState(lockedDept)
  const [activeTab, setActiveTab] = useState('nhanvien')

  const [empRows, setEmpRows]   = useState([])
  const [deptRows, setDeptRows] = useState([])
  const [timeRows, setTimeRows] = useState([])
  const [allEmps, setAllEmps]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [timeLoading, setTimeLoading] = useState(false)

  const [activeDeptEmp,  setActiveDeptEmp]  = useState('all')
  const [activeDeptTime, setActiveDeptTime] = useState('all')

  const stickyRef = useRef(null)
  const [stickyH, setStickyH] = useState(60)
  useEffect(() => {
    if (!stickyRef.current) return
    const obs = new ResizeObserver(([e]) => setStickyH(e.contentRect.height))
    obs.observe(stickyRef.current)
    return () => obs.disconnect()
  }, [])

  const [tabBarH, setTabBarH] = useState(44)
  useEffect(() => {
    const nav = document.querySelector('.chamcong-tabs > .ant-tabs-nav')
    if (!nav) return
    const obs = new ResizeObserver(([e]) => setTabBarH(e.contentRect.height))
    obs.observe(nav)
    return () => obs.disconnect()
  }, [])

  const fetchData = useCallback(async (range = dateRange, dept = deptFilter) => {
    setLoading(true)
    try {
      const from = range[0].format('YYYY-MM-DD')
      const to   = range[1].format('YYYY-MM-DD')
      const [r1, r2] = await Promise.all([
        api.get('/attendance/timesheet',    { params: { fromDate: from, toDate: to, toNhom: dept || undefined } }),
        api.get('/attendance/dept-summary', { params: { fromDate: from, toDate: to } }),
      ])
      setEmpRows(r1.data)
      setDeptRows(r2.data)
    } catch {
      message.error('Không thể tải dữ liệu chấm công')
    } finally {
      setLoading(false)
    }
  }, [dateRange, deptFilter])

  useEffect(() => {
    fetchData()
    api.get('/employees', { params: { page: 0, size: 500 } })
      .then(r => setAllEmps(r.data.content || []))
      .catch(() => {})
  }, []) // eslint-disable-line

  const fetchTimeEntries = useCallback(async (range = dateRange) => {
    setTimeLoading(true)
    try {
      const from = range[0].format('YYYY-MM-DD')
      const to   = range[1].format('YYYY-MM-DD')
      const r = await api.get('/attendance/time-entries', { params: { fromDate: from, toDate: to } })
      setTimeRows(r.data)
    } catch {
      message.error('Không thể tải dữ liệu giờ ra/vào')
    } finally {
      setTimeLoading(false)
    }
  }, [dateRange])

  const handleTabChange = (key) => {
    setActiveTab(key)
    if (key === 'congravao') fetchTimeEntries()
  }

  const handlePeriod = (key) => {
    setPeriod(key)
    if (key === 'week')  { const r = getWeekRange();  setDateRange(r); fetchData(r) }
    if (key === 'month') { const r = getMonthRange(); setDateRange(r); fetchData(r) }
  }

  const handleReset = () => {
    const r = getWeekRange()
    setPeriod('week'); setDateRange(r); setDeptFilter(lockedDept)
    fetchData(r, lockedDept)
  }

  const dateList = useMemo(() => buildDateList(dateRange[0], dateRange[1]), [dateRange])

  const timeEmpRows = useMemo(() => {
    const pivot = {}
    const baseList = allEmps.length > 0 ? allEmps : empRows
    baseList.forEach(e => {
      pivot[e.maNhanVien] = { maNhanVien: e.maNhanVien, hoVaTen: e.hoVaTen, toNhom: e.toNhom || '', ngayData: {} }
    })
    timeRows.forEach(t => {
      if (!pivot[t.maNhanVien]) {
        pivot[t.maNhanVien] = { maNhanVien: t.maNhanVien, hoVaTen: t.maNhanVien, toNhom: '', ngayData: {} }
      }
      pivot[t.maNhanVien].ngayData[t.ngay] = t
    })
    return Object.values(pivot).sort((a, b) => (a.maNhanVien || '').localeCompare(b.maNhanVien || ''))
  }, [timeRows, empRows, allEmps])

  const allEmpRows = useMemo(() => {
    if (!allEmps.length) return empRows
    const empMap = {}
    empRows.forEach(e => { empMap[e.maNhanVien] = e })
    return allEmps.map(e => empMap[e.maNhanVien] || {
      maNhanVien: e.maNhanVien, hoVaTen: e.hoVaTen, toNhom: e.toNhom || '',
      tongCongThuong: 0, tongCongTangCa: 0, tongCong: 0, soCaLamViec: 0, ngayData: {},
    }).sort((a, b) => (a.maNhanVien || '').localeCompare(b.maNhanVien || ''))
  }, [empRows, allEmps])

  const deptCounts = useMemo(() => {
    const c = { all: allEmpRows.length }
    TIME_DEPTS.forEach(d => { c[d] = allEmpRows.filter(r => r.toNhom === d).length })
    return c
  }, [allEmpRows])

  const timeDeptCounts = useMemo(() => {
    const c = { all: timeEmpRows.length }
    TIME_DEPTS.forEach(d => { c[d] = timeEmpRows.filter(r => r.toNhom === d).length })
    return c
  }, [timeEmpRows])

  const filteredEmpRows = useMemo(() => (
    activeDeptEmp === 'all' ? allEmpRows : allEmpRows.filter(r => r.toNhom === activeDeptEmp)
  ), [allEmpRows, activeDeptEmp])

  const filteredTimeRows = useMemo(() => (
    activeDeptTime === 'all' ? timeEmpRows : timeEmpRows.filter(r => r.toNhom === activeDeptTime)
  ), [timeEmpRows, activeDeptTime])

  // ── Cột bảng nhân viên ───────────────────────────────────────────
  const empColumns = useMemo(() => {
    const fixed = [
      {
        title: 'Mã NV', dataIndex: 'maNhanVien', key: 'ma', width: 75, fixed: 'left',
        render: v => <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: '#64748B' }}>{v}</span>,
      },
      {
        title: 'Họ và Tên', dataIndex: 'hoVaTen', key: 'ten', width: 185, fixed: 'left',
        render: v => <span style={{ fontWeight: 600, fontSize: 13, color: '#1E293B' }}>{v}</span>,
      },
      {
        title: 'Bộ phận', dataIndex: 'toNhom', key: 'bp', width: 88, fixed: 'left',
        render: v => v ? <DeptLabel value={v} /> : <span style={{ color: '#CBD5E1' }}>—</span>,
      },
    ]
    const days = dateList.map(date => {
      const isWeekend = [0, 6].includes(dayjs(date).day())
      return {
        title: (
          <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
            <div style={{ fontSize: 10, color: isWeekend ? '#F87171' : '#94A3B8' }}>{dayjs(date).format('ddd').toUpperCase()}</div>
            <div style={{ fontSize: 12 }}>{dayjs(date).format('DD/MM')}</div>
          </div>
        ),
        key: date, width: 72, align: 'center',
        render: (_, r) => {
          const dc = r.ngayData?.[date]
          if (!dc || (Number(dc.congThuong) === 0 && Number(dc.congTangCa) === 0))
            return <span style={{ color: '#CBD5E1', fontSize: 13 }}>–</span>
          return (
            <Tooltip title={`Thường: ${fmt4(dc.congThuong)} | TC: ${fmt4(dc.congTangCa)} | ${dc.soPhien} phiên`}>
              <div style={{ lineHeight: 1.4 }}>
                <div style={{ color: '#1E293B', fontSize: 12, fontWeight: 500 }}>{fmt2(Number(dc.congThuong))}</div>
                {Number(dc.congTangCa) > 0 && (
                  <div style={{ color: '#0284C7', fontSize: 11 }}>+{fmt2(Number(dc.congTangCa))}</div>
                )}
              </div>
            </Tooltip>
          )
        },
      }
    })
    const summary = [
      {
        title: 'Công Thường', key: 'ct', width: 100, align: 'right', fixed: 'right',
        render: (_, r) => <span style={{ color: '#334155', fontWeight: 600 }}>{fmt2(Number(r.tongCongThuong))}</span>,
        sorter: (a, b) => Number(a.tongCongThuong) - Number(b.tongCongThuong),
      },
      {
        title: 'Tăng Ca', key: 'tc', width: 78, align: 'right', fixed: 'right',
        render: (_, r) => Number(r.tongCongTangCa) > 0
          ? <span style={{ color: '#0284C7', fontWeight: 600 }}>{fmt2(Number(r.tongCongTangCa))}</span>
          : <span style={{ color: '#CBD5E1' }}>–</span>,
        sorter: (a, b) => Number(a.tongCongTangCa) - Number(b.tongCongTangCa),
      },
      {
        title: 'Tổng Cộng', key: 'tong', width: 100, align: 'right', fixed: 'right',
        render: (_, r) => <span style={{ color: '#1D4ED8', fontSize: 13, fontWeight: 700 }}>{fmt2(Number(r.tongCong))}</span>,
        sorter: (a, b) => Number(a.tongCong) - Number(b.tongCong),
        defaultSortOrder: 'descend',
      },
    ]
    return [...fixed, ...days, ...summary]
  }, [dateList, empRows])

  // ── Cột bảng bộ phận ─────────────────────────────────────────────
  const deptColumns = useMemo(() => {
    const fixed = [
      {
        title: 'Bộ Phận', dataIndex: 'boPhan', key: 'bp', width: 120, fixed: 'left',
        render: v => v ? <DeptLabel value={v} /> : <span style={{ color: '#CBD5E1' }}>—</span>,
      },
    ]
    const days = dateList.map(date => {
      const isWeekend = [0, 6].includes(dayjs(date).day())
      return {
        title: (
          <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
            <div style={{ fontSize: 10, color: isWeekend ? '#F87171' : '#94A3B8' }}>{dayjs(date).format('ddd').toUpperCase()}</div>
            <div style={{ fontSize: 12 }}>{dayjs(date).format('DD/MM')}</div>
          </div>
        ),
        key: date, width: 90, align: 'center',
        render: (_, r) => {
          const dc = r.ngayData?.[date]
          if (!dc || (Number(dc.congThuong) === 0 && Number(dc.congTangCa) === 0))
            return <span style={{ color: '#CBD5E1' }}>–</span>
          return (
            <Tooltip title={`Thường: ${fmt4(dc.congThuong)} | TC: ${fmt4(dc.congTangCa)} | ${dc.soPhien} phiên`}>
              <div style={{ lineHeight: 1.4 }}>
                <div style={{ color: '#1E293B', fontSize: 13, fontWeight: 500 }}>{fmt2(Number(dc.congThuong))}</div>
                {Number(dc.congTangCa) > 0 && (
                  <div style={{ color: '#0284C7', fontSize: 11 }}>
                    <ClockCircleOutlined style={{ marginRight: 2 }} />+{fmt2(Number(dc.congTangCa))}
                  </div>
                )}
              </div>
            </Tooltip>
          )
        },
      }
    })
    const summary = [
      {
        title: 'Công Thường', key: 'ct', width: 100, align: 'right', fixed: 'right',
        render: (_, r) => <span style={{ color: '#334155', fontWeight: 600 }}>{fmt2(Number(r.tongCongThuong))}</span>,
      },
      {
        title: 'Tăng Ca', key: 'tc', width: 85, align: 'right', fixed: 'right',
        render: (_, r) => Number(r.tongCongTangCa) > 0
          ? <span style={{ color: '#0284C7', fontWeight: 600 }}>{fmt2(Number(r.tongCongTangCa))}</span>
          : <span style={{ color: '#CBD5E1' }}>–</span>,
      },
      {
        title: 'Tổng Cộng', key: 'tong', width: 100, align: 'right', fixed: 'right',
        render: (_, r) => <span style={{ color: '#1D4ED8', fontSize: 14, fontWeight: 700 }}>{fmt2(Number(r.tongCong))}</span>,
      },
    ]
    return [...fixed, ...days, ...summary]
  }, [dateList])

  // ── Cột bảng Công Ra Vào ─────────────────────────────────────────
  const timeColumns = useMemo(() => {
    const fixed = [
      {
        title: 'Mã NV', dataIndex: 'maNhanVien', key: 'ma', width: 75, fixed: 'left',
        render: v => <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: '#64748B' }}>{v}</span>,
      },
      {
        title: 'Họ và Tên', dataIndex: 'hoVaTen', key: 'ten', width: 185, fixed: 'left',
        render: v => <span style={{ fontWeight: 600, fontSize: 13, color: '#1E293B' }}>{v}</span>,
      },
      {
        title: 'Bộ phận', dataIndex: 'toNhom', key: 'bp', width: 88, fixed: 'left',
        render: v => v ? <DeptLabel value={v} /> : <span style={{ color: '#CBD5E1' }}>—</span>,
      },
    ]
    const days = dateList.map(date => {
      const isWeekend = [0, 6].includes(dayjs(date).day())
      return {
        title: (
          <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
            <div style={{ fontSize: 10, color: isWeekend ? '#F87171' : '#94A3B8' }}>{dayjs(date).format('ddd').toUpperCase()}</div>
            <div style={{ fontSize: 12 }}>{dayjs(date).format('DD/MM')}</div>
          </div>
        ),
        key: date, width: 90, align: 'center',
        render: (_, r) => {
          const t = r.ngayData?.[date]
          if (!t) return <span style={{ color: '#CBD5E1', fontSize: 13 }}>–</span>
          const cong = calcCong(t)
          return (
            <Tooltip title={`${t.gioVao?.slice(0,5) ?? '?'} → ${t.gioRa?.slice(0,5) ?? '?'} | Ca: ${t.caThucHien || '?'} | Công: ${cong.toFixed(4)}`}>
              <div style={{ lineHeight: 1.4 }}>
                <div style={{ fontSize: 11, color: '#1D4ED8', fontWeight: 500 }}>{t.gioVao ? t.gioVao.slice(0,5) : '—'}</div>
                <div style={{ fontSize: 11, color: '#059669', fontWeight: 500 }}>{t.gioRa ? t.gioRa.slice(0,5) : '—'}</div>
              </div>
            </Tooltip>
          )
        },
      }
    })
    return [...fixed, ...days, {
      title: 'Tổng Công', key: 'tongcong', width: 95, align: 'right', fixed: 'right',
      render: (_, r) => {
        const total = Object.values(r.ngayData || {}).reduce((s, t) => s + calcCong(t), 0)
        return <span style={{ color: '#1D4ED8', fontWeight: 700, fontSize: 13 }}>{fmt2(total)}</span>
      },
      sorter: (a, b) => {
        const s = r => Object.values(r.ngayData || {}).reduce((acc, t) => acc + calcCong(t), 0)
        return s(a) - s(b)
      },
      defaultSortOrder: 'descend',
    }]
  }, [dateList])

  // ── Summary rows ──────────────────────────────────────────────────
  const empSummary = (pageData) => {
    const totCT = pageData.reduce((s, r) => s + Number(r.tongCongThuong || 0), 0)
    const totTC = pageData.reduce((s, r) => s + Number(r.tongCongTangCa || 0), 0)
    const daySums = {}
    dateList.forEach(d => {
      daySums[d] = { ct: 0, tc: 0 }
      pageData.forEach(r => {
        const dc = r.ngayData?.[d]
        if (dc) { daySums[d].ct += Number(dc.congThuong || 0); daySums[d].tc += Number(dc.congTangCa || 0) }
      })
    })
    return (
      <Table.Summary fixed="bottom">
        <Table.Summary.Row>
          <Table.Summary.Cell index={0} colSpan={3} align="left">
            <span style={{ fontWeight: 700 }}>Tổng trang · {pageData.length} NV</span>
          </Table.Summary.Cell>
          {dateList.map((d, i) => (
            <Table.Summary.Cell key={d} index={i + 3} align="center">
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{fmt2(daySums[d].ct)}</div>
                {daySums[d].tc > 0 && <div style={{ fontSize: 10 }}>+{fmt2(daySums[d].tc)}</div>}
              </div>
            </Table.Summary.Cell>
          ))}
          <Table.Summary.Cell index={dateList.length + 3} align="right">
            <span style={{ fontWeight: 600 }}>{fmt2(totCT)}</span>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={dateList.length + 4} align="right">
            <span style={{ fontWeight: 600 }}>{fmt2(totTC)}</span>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={dateList.length + 5} align="right">
            <span style={{ fontWeight: 700, fontSize: 13 }}>{fmt2(totCT + totTC)}</span>
          </Table.Summary.Cell>
        </Table.Summary.Row>
      </Table.Summary>
    )
  }

  const deptSummary = (pageData) => {
    const totCT = pageData.reduce((s, r) => s + Number(r.tongCongThuong || 0), 0)
    const totTC = pageData.reduce((s, r) => s + Number(r.tongCongTangCa || 0), 0)
    return (
      <Table.Summary fixed="bottom">
        <Table.Summary.Row>
          <Table.Summary.Cell index={0} align="left">
            <span style={{ fontWeight: 700 }}>Tổng</span>
          </Table.Summary.Cell>
          {dateList.map((_, i) => <Table.Summary.Cell key={i} index={i + 1} />)}
          <Table.Summary.Cell index={dateList.length + 1} align="right">
            <span style={{ fontWeight: 600 }}>{fmt2(totCT)}</span>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={dateList.length + 2} align="right">
            <span style={{ fontWeight: 600 }}>{fmt2(totTC)}</span>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={dateList.length + 3} align="right">
            <span style={{ fontWeight: 700, fontSize: 14 }}>{fmt2(totCT + totTC)}</span>
          </Table.Summary.Cell>
        </Table.Summary.Row>
      </Table.Summary>
    )
  }

  // ── Time detail drawer ────────────────────────────────────────────
  const [timeDetailOpen, setTimeDetailOpen]       = useState(false)
  const [timeDetailEmp, setTimeDetailEmp]         = useState(null)
  const [timeDetailMonth, setTimeDetailMonth]     = useState(dayjs())
  const [timeDetailEntries, setTimeDetailEntries] = useState([])
  const [timeDetailLoading, setTimeDetailLoading] = useState(false)

  const [editEntryModal, setEditEntryModal] = useState(false)
  const [editingEntry, setEditingEntry]     = useState(null)
  const [editingDay, setEditingDay]         = useState(null)
  const [editForm]                          = Form.useForm()
  const [editSaving, setEditSaving]         = useState(false)

  const fetchDetailEntries = useCallback(async (maNhanVien, month) => {
    if (!maNhanVien) return
    setTimeDetailLoading(true)
    try {
      const from = month.startOf('month').format('YYYY-MM-DD')
      const to   = month.endOf('month').format('YYYY-MM-DD')
      const r = await api.get('/attendance/time-entries', { params: { maNhanVien, fromDate: from, toDate: to } })
      setTimeDetailEntries(r.data)
    } catch {
      message.error('Không thể tải chi tiết giờ ra/vào')
    } finally {
      setTimeDetailLoading(false)
    }
  }, [])

  const openTimeDetail = useCallback((record) => {
    const month = dayjs()
    setTimeDetailEmp(record); setTimeDetailMonth(month); setTimeDetailEntries([])
    setTimeDetailOpen(true); fetchDetailEntries(record.maNhanVien, month)
  }, [fetchDetailEntries])

  const openEditEntry = useCallback((entry, dayObj) => {
    setEditingEntry(entry || null); setEditingDay(dayObj)
    editForm.setFieldsValue({
      gioVao:     entry?.gioVao     ? dayjs(`2000-01-01T${entry.gioVao}`)     : null,
      gioRa:      entry?.gioRa      ? dayjs(`2000-01-01T${entry.gioRa}`)      : null,
      caThucHien: entry?.caThucHien || undefined,
      ghiChu:     entry?.ghiChu     || '',
    })
    setEditEntryModal(true)
  }, [editForm])

  const handleSaveEntry = async () => {
    try {
      const values = await editForm.validateFields()
      setEditSaving(true)
      const payload = {
        maNhanVien:  timeDetailEmp.maNhanVien,
        ngay:        editingDay.format('YYYY-MM-DD'),
        gioVao:      values.gioVao ? values.gioVao.format('HH:mm:ss') : null,
        gioRa:       values.gioRa  ? values.gioRa.format('HH:mm:ss')  : null,
        caThucHien:  values.caThucHien || null,
        ghiChu:      values.ghiChu || null,
      }
      if (editingEntry?.id) await api.put(`/attendance/time-entries/${editingEntry.id}`, payload)
      else                  await api.post('/attendance/time-entries', payload)
      message.success('Lưu thành công')
      setEditEntryModal(false)
      fetchDetailEntries(timeDetailEmp.maNhanVien, timeDetailMonth)
    } catch (err) {
      if (err?.response) message.error(err.response.data?.message || 'Lưu thất bại')
    } finally {
      setEditSaving(false)
    }
  }

  const handleDeleteEntry = async () => {
    if (!editingEntry?.id) return
    setEditSaving(true)
    try {
      await api.delete(`/attendance/time-entries/${editingEntry.id}`)
      message.success('Đã xóa bản ghi')
      setEditEntryModal(false)
      fetchDetailEntries(timeDetailEmp.maNhanVien, timeDetailMonth)
    } catch {
      message.error('Xóa thất bại')
    } finally {
      setEditSaving(false)
    }
  }

  const offsetHeader = stickyH + tabBarH
  const PILL_H = 48

  const tabItems = [
    {
      key: 'nhanvien',
      label: <span><TeamOutlined style={{ marginRight: 5 }} />Công Sản Xuất</span>,
      children: (
        <div>
          <div style={{ position: 'sticky', top: offsetHeader, zIndex: 8, background: '#fff' }}>
            <DeptPills value={activeDeptEmp} onChange={setActiveDeptEmp} counts={deptCounts} />
          </div>
          <Table
            className="chamcong-table"
            columns={empColumns}
            dataSource={filteredEmpRows}
            rowKey="maNhanVien"
            loading={loading}
            size="small"
            scroll={{ x: Math.max(348 + dateList.length * 72, 800) }}
            sticky={{ offsetHeader: offsetHeader + PILL_H }}
            pagination={{ defaultPageSize: 50, showSizeChanger: true, pageSizeOptions: ['25','50','100'], showTotal: t => `${t} nhân viên` }}
            summary={empSummary}
            rowClassName={(_, i) => i % 2 !== 0 ? 'row-alt' : ''}
          />
        </div>
      ),
    },
    {
      key: 'bophan',
      label: <span><ApartmentOutlined style={{ marginRight: 5 }} />Tổng Hợp Bộ Phận</span>,
      children: (
        <Table
          className="chamcong-table"
          columns={deptColumns}
          dataSource={deptRows}
          rowKey="boPhan"
          loading={loading}
          size="small"
          scroll={{ x: Math.max(300 + dateList.length * 90, 700) }}
          sticky={{ offsetHeader }}
          pagination={false}
          summary={deptSummary}
          rowClassName={(_, i) => i % 2 !== 0 ? 'row-alt' : ''}
        />
      ),
    },
    {
      key: 'tangca',
      label: <span><ClockCircleOutlined style={{ marginRight: 5 }} />Tăng Ca</span>,
      children: (
        <TangCaTab empRows={allEmpRows} offsetHeader={offsetHeader} />
      ),
    },
    {
      key: 'congravao',
      label: <span><LoginOutlined style={{ marginRight: 5 }} />Công Ra Vào</span>,
      children: (
        <div>
          <div style={{ position: 'sticky', top: offsetHeader, zIndex: 8, background: '#fff' }}>
            <DeptPills value={activeDeptTime} onChange={setActiveDeptTime} counts={timeDeptCounts} />
          </div>
          <Table
            className="chamcong-table"
            loading={timeLoading}
            dataSource={filteredTimeRows}
            rowKey="maNhanVien"
            size="small"
            scroll={{ x: Math.max(348 + dateList.length * 90, 800) }}
            sticky={{ offsetHeader: offsetHeader + PILL_H }}
            pagination={{ pageSize: 50, showSizeChanger: true, pageSizeOptions: ['50','100','200'], showTotal: t => `${t} nhân viên` }}
            rowClassName={(_, i) => i % 2 !== 0 ? 'row-alt' : ''}
            locale={{ emptyText: 'Chưa có dữ liệu giờ ra/vào' }}
            columns={timeColumns}
            onRow={record => ({ onClick: () => openTimeDetail(record), style: { cursor: 'pointer' } })}
          />
        </div>
      ),
    },
  ]

  return (
    <>
      {/* ── Sticky toolbar ── */}
      <div ref={stickyRef} style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: '#fff', borderBottom: '1px solid #E2E8F0',
        padding: '10px 16px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, color: '#1E293B', fontSize: 16, whiteSpace: 'nowrap' }}>
            <FileDoneOutlined style={{ color: '#1D4ED8', fontSize: 16 }} />
            Bảng chấm công
          </span>

          <div style={{ display: 'flex', gap: 2, background: '#F1F5F9', borderRadius: 8, padding: 3 }}>
            {PERIOD_OPTS.map(p => (
              <button key={p.key} onClick={() => handlePeriod(p.key)} style={{
                border: 'none', borderRadius: 6, padding: '4px 14px', cursor: 'pointer', fontSize: 13,
                background: period === p.key ? '#fff' : 'transparent',
                color: period === p.key ? '#1D4ED8' : '#64748B',
                fontWeight: period === p.key ? 700 : 400,
                boxShadow: period === p.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}>{p.label}</button>
            ))}
          </div>

          <RangePicker
            size="small" value={dateRange}
            onChange={v => { if (v) { setDateRange(v); setPeriod('custom') } }}
            format="DD/MM/YYYY" allowClear={false}
          />

          <Button size="small" type="primary" icon={<SearchOutlined />}
            style={{ background: '#1D4ED8', borderColor: '#1D4ED8', fontWeight: 600 }}
            onClick={() => fetchData()}>
            Truy xuất
          </Button>
          <Button size="small" icon={<ReloadOutlined />} onClick={handleReset} />

          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748B' }}>
            <span style={{ fontWeight: 600, color: '#475569' }}>{dateRange[0].format('DD/MM')} → {dateRange[1].format('DD/MM')}</span>
            ·
            <strong style={{ color: '#1D4ED8' }}>{empRows.length}</strong>
            nhân viên
          </span>
        </div>
      </div>

      {/* ── CSS ── */}
      <style>{`
        .chamcong-tabs > .ant-tabs-nav {
          margin: 0 !important; background: #fff;
          padding: 0 16px; border-bottom: 1px solid #E2E8F0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .chamcong-tabs > .ant-tabs-nav .ant-tabs-tab {
          color: #64748B !important; font-size: 13px;
          padding: 12px 4px !important; margin: 0 20px 0 0 !important; font-weight: 500;
        }
        .chamcong-tabs > .ant-tabs-nav .ant-tabs-tab:hover { color: #D97706 !important; }
        .chamcong-tabs > .ant-tabs-nav .ant-tabs-tab-active { color: #B45309 !important; font-weight: 700 !important; background: #FEF3C7 !important; border-radius: 8px 8px 0 0; }
        .chamcong-tabs > .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-btn { color: #B45309 !important; }
        .chamcong-tabs > .ant-tabs-nav .ant-tabs-ink-bar { background: #F59E0B !important; height: 3px !important; border-radius: 2px; }
        .chamcong-tabs > .ant-tabs-nav::before { border-bottom: none !important; }
        .chamcong-tabs .ant-tabs-tabpane { padding: 0 !important; }

        .chamcong-table .ant-table-thead > tr > th {
          background: #F8FAFC !important; color: #475569 !important;
          text-align: center !important; font-size: 11px !important;
          text-transform: uppercase; letter-spacing: 0.4px; font-weight: 600 !important;
          padding: 8px 6px !important; border-right: 1px solid #E2E8F0 !important;
          border-bottom: 2px solid #E2E8F0 !important; white-space: nowrap;
        }
        .chamcong-table .ant-table-thead > tr > th::before { display: none !important; }
        .chamcong-table .ant-table-tbody > tr > td { padding: 6px 8px !important; border-bottom: 1px solid #F1F5F9 !important; }
        .chamcong-table .ant-table-tbody > tr.row-alt > td { background: #F8FAFC; }
        .chamcong-table .ant-table-tbody > tr:hover > td { background: #EFF6FF !important; }
        .chamcong-table .ant-table-summary > tr > td {
          background: #1E293B !important; color: #fff !important;
          font-weight: 700; padding: 8px 8px !important; border-top: 2px solid #E2E8F0 !important;
        }
        .chamcong-table .ant-table-body::-webkit-scrollbar { height: 4px; }
        .chamcong-table .ant-table-body::-webkit-scrollbar-track { background: #F1F5F9; border-radius: 4px; }
        .chamcong-table .ant-table-body::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
        .chamcong-table .ant-table-body::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
      `}</style>

      {/* ── Tabs ── */}
      <Tabs
        className="chamcong-tabs"
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        type="line"
        size="middle"
        tabBarStyle={{ position: 'sticky', top: stickyH, zIndex: 9, margin: 0 }}
      />

      {/* ── Drawer chi tiết giờ ra/vào ── */}
      <Drawer
        open={timeDetailOpen}
        onClose={() => setTimeDetailOpen(false)}
        width={680}
        styles={{ body: { padding: '12px 16px' } }}
        title={
          timeDetailEmp && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{timeDetailEmp.hoVaTen}</span>
              <span style={{ fontFamily: 'monospace', color: '#888', fontSize: 12 }}>({timeDetailEmp.maNhanVien})</span>
              {timeDetailEmp.toNhom && (
                <Tag color={DEPT_COLOR[timeDetailEmp.toNhom] || 'default'} style={{ margin: 0 }}>{timeDetailEmp.toNhom}</Tag>
              )}
            </div>
          )
        }
        destroyOnClose
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Button size="small" onClick={() => { const m = timeDetailMonth.subtract(1,'month'); setTimeDetailMonth(m); if (timeDetailEmp) fetchDetailEntries(timeDetailEmp.maNhanVien, m) }}>‹ Tháng trước</Button>
          <DatePicker picker="month" value={timeDetailMonth} format="MM/YYYY" allowClear={false} size="small"
            onChange={m => { if (!m) return; setTimeDetailMonth(m); if (timeDetailEmp) fetchDetailEntries(timeDetailEmp.maNhanVien, m) }} />
          <Button size="small" onClick={() => { const m = timeDetailMonth.add(1,'month'); setTimeDetailMonth(m); if (timeDetailEmp) fetchDetailEntries(timeDetailEmp.maNhanVien, m) }}>Tháng sau ›</Button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#888' }}>{timeDetailMonth.format('MM/YYYY')}</span>
        </div>

        {(() => {
          const tongCong = timeDetailEntries.reduce((s, t) => s + calcCong(t), 0)
          const tongGio  = timeDetailEntries.reduce((r, t) => {
            if (!t.gioVao || !t.gioRa) return r
            return r + dayjs(`2000-01-01T${t.gioRa}`).diff(dayjs(`2000-01-01T${t.gioVao}`), 'minute') / 60
          }, 0)
          return (
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              {[
                { label: 'Ngày chấm công', value: timeDetailEntries.length, color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
                { label: 'Tổng giờ làm',   value: `${tongGio.toFixed(1)}h`, color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
                { label: 'Tổng công',       value: fmt2(tongCong),           color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
              ].map(({ label, value, color, bg, border }) => (
                <div key={label} style={{ background: bg, border: `1.5px solid ${border}`, borderLeft: `4px solid ${color}`, borderRadius: 8, padding: '6px 14px', minWidth: 110 }}>
                  <div style={{ fontSize: 10, color: '#64748B' }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.2 }}>{value}</div>
                </div>
              ))}
            </div>
          )
        })()}

        {timeDetailLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa' }}>Đang tải...</div>
        ) : (() => {
          const DOW_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
          const firstDay = timeDetailMonth.startOf('month')
          const totalDays = timeDetailMonth.daysInMonth()
          const startDow = (firstDay.day() + 6) % 7
          const entryMap = {}
          timeDetailEntries.forEach(t => { entryMap[dayjs(t.ngay).date()] = t })
          const today = dayjs()
          const isCurrentMonth = timeDetailMonth.isSame(today, 'month')
          const weeks = []
          let dayNum = 1
          const firstWeek = new Array(7).fill(null)
          for (let i = startDow; i < 7 && dayNum <= totalDays; i++) firstWeek[i] = dayNum++
          weeks.push(firstWeek)
          while (dayNum <= totalDays) {
            const w = new Array(7).fill(null)
            for (let i = 0; i < 7 && dayNum <= totalDays; i++) w[i] = dayNum++
            weeks.push(w)
          }
          return (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
                {DOW_LABELS.map((d, i) => (
                  <div key={d} style={{ textAlign: 'center', padding: '5px 2px', fontWeight: 700, fontSize: 12, color: i === 6 ? '#F87171' : '#fff', background: '#1E293B', borderRadius: 4 }}>{d}</div>
                ))}
              </div>
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
                  {week.map((day, di) => {
                    if (!day) return <div key={di} style={{ minHeight: 78, background: '#F8FAFC', borderRadius: 4, border: '1px solid #E2E8F0' }} />
                    const entry = entryMap[day]
                    const isToday = isCurrentMonth && today.date() === day
                    const isSun = di === 6
                    const cong = entry ? calcCong(entry) : 0
                    const dayObj = timeDetailMonth.clone().date(day)
                    return (
                      <div key={di} style={{
                        minHeight: 78, background: entry ? '#EFF6FF' : '#FAFAFA',
                        border: isToday ? '2px solid #1D4ED8' : '1px solid #E2E8F0',
                        borderRadius: 6, padding: '4px 5px', position: 'relative',
                        cursor: canEdit ? 'pointer' : 'default',
                      }} onClick={canEdit ? () => openEditEntry(entry || null, dayObj) : undefined}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 22, height: 22, borderRadius: '50%', marginBottom: 3,
                          background: isToday ? '#1D4ED8' : 'transparent',
                          fontSize: 11, fontWeight: 700,
                          color: isToday ? '#fff' : isSun ? '#EF4444' : '#374151',
                        }}>{day}</div>
                        {canEdit && (
                          <div style={{ position: 'absolute', top: 3, right: 4, fontSize: 10 }}>
                            {entry ? <EditOutlined style={{ color: '#1D4ED8', opacity: 0.5 }} /> : <PlusOutlined style={{ color: '#CBD5E1' }} />}
                          </div>
                        )}
                        {entry ? (
                          <div style={{ lineHeight: 1.5 }}>
                            {entry.caThucHien && <div><Tag style={{ margin: '0 0 2px', fontSize: 10, padding: '0 4px', lineHeight: '16px' }}>{entry.caThucHien}</Tag></div>}
                            <div style={{ fontSize: 11, color: '#1D4ED8', fontWeight: 600 }}>↑ {entry.gioVao ? entry.gioVao.slice(0,5) : '—'}</div>
                            <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>↓ {entry.gioRa ? entry.gioRa.slice(0,5) : '—'}</div>
                            {cong > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706' }}>{fmt2(cong)} công</div>}
                            {entry.ghiChu && <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.ghiChu}</div>}
                          </div>
                        ) : (
                          <div style={{ fontSize: 10, color: '#E2E8F0', marginTop: 4 }}>—</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )
        })()}
      </Drawer>

      {/* ── Modal chỉnh sửa / thêm giờ ra vào ── */}
      <Modal
        open={editEntryModal}
        onCancel={() => setEditEntryModal(false)}
        title={<span style={{ fontWeight: 700, fontSize: 14 }}>{editingEntry ? `Sửa chấm công — ${editingDay?.format('DD/MM/YYYY')}` : `Thêm chấm công — ${editingDay?.format('DD/MM/YYYY')}`}</span>}
        footer={[
          editingEntry && (
            <Popconfirm key="del" title="Xóa bản ghi này?" onConfirm={handleDeleteEntry} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
              <Button danger icon={<DeleteOutlined />} loading={editSaving} style={{ float: 'left' }}>Xóa</Button>
            </Popconfirm>
          ),
          <Button key="cancel" onClick={() => setEditEntryModal(false)}>Hủy</Button>,
          <Button key="save" type="primary" loading={editSaving} onClick={handleSaveEntry}>Lưu</Button>,
        ]}
        destroyOnClose width={360}
      >
        <Form form={editForm} layout="vertical" size="small" style={{ marginTop: 8 }}>
          <Form.Item name="caThucHien" label="Ca thực hiện" rules={[{ required: true, message: 'Vui lòng chọn ca' }]}>
            <Select placeholder="Chọn ca" allowClear>
              <Select.Option value="HC">HC – Hành Chính</Select.Option>
              <Select.Option value="TC">TC – Tăng Ca</Select.Option>
              <Select.Option value="OT">OT – Overtime</Select.Option>
            </Select>
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="gioVao" label="Giờ vào">
              <TimePicker format="HH:mm" minuteStep={5} style={{ width: '100%' }} placeholder="--:--" />
            </Form.Item>
            <Form.Item name="gioRa" label="Giờ ra">
              <TimePicker format="HH:mm" minuteStep={5} style={{ width: '100%' }} placeholder="--:--" />
            </Form.Item>
          </div>
          <Form.Item name="ghiChu" label="Ghi chú">
            <Input placeholder="Ghi chú (tùy chọn)" maxLength={255} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
