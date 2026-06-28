import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Table, Tabs, Tag, Typography, Button, message, Card } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const STATUS_COLORS = { done: 'green', doing: 'orange' }
const STATUS_LABELS = { done: 'Done', doing: 'Doing' }

const KNOWN_MACHINES_PC = ['Máy nhũ hóa 500L', 'Máy Khuấy 1500L', 'Máy Khuấy 700L', 'Máy nhũ hóa 100L', 'Thủ Công']
const KNOWN_MACHINES_PL = [
  'Máy Chiết Tube Hàn Nhiệt', 'Máy Chiết Tube Hàn Seal', 'Máy Chiết Bánh Răng',
  'Máy Chiết 4 vòi bơm khí', 'Máy Chiết 4 vòi bơm từ', 'Máy Chiết 2 vòi',
  'Máy Chiết mặt nạ', 'Máy Chiết Nhu Động', 'Máy Chiết Bột',
]
const KNOWN_MACHINES_DG   = []
const KNOWN_MACHINES_BBC1 = []
const MACHINE_COLORS = ['#5B8FF9', '#61DDAA', '#F6BD16', '#FF6B6B', '#9B59B6', '#36CFC9', '#FF7A45', '#A0D911', '#95A5A6']

function SvgPie({ segments, size = 200 }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (!total) return <div style={{ color: '#999', textAlign: 'center', padding: 16 }}>Không có dữ liệu</div>

  const cx = size / 2, cy = size / 2
  const outerR = size / 2 - 4
  const innerR = size / 3.2
  const cos = (a) => Math.cos(a), sin = (a) => Math.sin(a)

  const nonZero = segments.filter(s => s.value > 0)

  // Special case: single segment (100%) — SVG arc can't draw a full circle
  if (nonZero.length === 1) {
    const seg = nonZero[0]
    return (
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={outerR} fill={seg.color} stroke="#fff" strokeWidth={2.5} />
        <circle cx={cx} cy={cy} r={innerR} fill="#fff" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
          fill={seg.color} fontSize={15} fontWeight={700}>100%</text>
        <title>{seg.name}: {seg.value.toLocaleString('vi-VN')} (100%)</title>
      </svg>
    )
  }

  let angle = -Math.PI / 2
  const paths = nonZero.map((seg) => {
    const sweep = (seg.value / total) * 2 * Math.PI
    const startA = angle
    const endA = angle + sweep
    angle = endA
    const large = sweep > Math.PI ? 1 : 0
    const d = [
      `M ${cx + outerR * cos(startA)} ${cy + outerR * sin(startA)}`,
      `A ${outerR} ${outerR} 0 ${large} 1 ${cx + outerR * cos(endA)} ${cy + outerR * sin(endA)}`,
      `L ${cx + innerR * cos(endA)} ${cy + innerR * sin(endA)}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${cx + innerR * cos(startA)} ${cy + innerR * sin(startA)}`,
      'Z',
    ].join(' ')
    const midA = startA + sweep / 2
    const pct = seg.value / total
    const lr = (outerR + innerR) / 2
    return { d, color: seg.color, pct, lx: cx + lr * cos(midA), ly: cy + lr * sin(midA), name: seg.name, value: seg.value }
  })

  return (
    <svg width={size} height={size}>
      {paths.map((p, i) => (
        <g key={i}>
          <path d={p.d} fill={p.color} stroke="#fff" strokeWidth={2.5}>
            <title>{p.name}: {p.value.toLocaleString('vi-VN')} ({(p.pct * 100).toFixed(1)}%)</title>
          </path>
          {p.pct > 0.06 && (
            <text x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="middle"
              fill="#fff" fontSize={11} fontWeight={700} pointerEvents="none">
              {(p.pct * 100).toFixed(0)}%
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

function MachinePieChart({ data, cfg, knownMachines = KNOWN_MACHINES_PC }) {
  const machineMap = {}
  data.forEach(r => {
    const machine = r.mayMoc?.trim() || 'Chưa phân loại'
    if (!machineMap[machine]) machineMap[machine] = { slTong: 0, congTong: 0, soLo: 0 }
    const doDang = cfg.doDang(r)
    if (doDang > 0) {
      machineMap[machine].slTong += doDang
      machineMap[machine].soLo += 1
      const cdk = cfg.calcCongDuKien(r)
      if (cdk !== '—') machineMap[machine].congTong += parseFloat(cdk)
    }
  })

  let unknownIdx = knownMachines.length
  const rows = Object.entries(machineMap).map(([name, stats]) => {
    const ki = knownMachines.indexOf(name)
    return { name, ...stats, colorIdx: ki >= 0 ? ki : unknownIdx++ }
  }).sort((a, b) => a.colorIdx - b.colorIdx || b.slTong - a.slTong)

  if (rows.length === 0) return null
  const totalSl = rows.reduce((s, r) => s + r.slTong, 0)
  const totalCong = rows.reduce((s, r) => s + r.congTong, 0)
  const totalLo = rows.reduce((s, r) => s + r.soLo, 0)

  const segments = rows.map((r, i) => ({
    name: r.name, value: r.slTong,
    color: MACHINE_COLORS[r.colorIdx < MACHINE_COLORS.length ? r.colorIdx : i % MACHINE_COLORS.length],
  }))

  const thS = { padding: '6px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: 0.4, background: 'linear-gradient(90deg, #2980b3 0%, #3399CC 100%)', color: '#ffffff',
    borderBottom: '2px solid #4db3d4', borderRight: '1px solid #4db3d4', whiteSpace: 'nowrap' }
  const tdS = { padding: '6px 12px', fontSize: 12, borderBottom: '1px solid #f0f0f0' }

  return (
    <Card
      title={<span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}>Phân tích theo {cfg.mayMocLabel}</span>}
      size="small" style={{ marginBottom: 0, borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none', borderBottom: '2px solid #e8eaf6' }}
      styles={{ header: { background: '#DDE1E8', borderBottom: '1px solid #e8eaf6', minHeight: 36, padding: '0 16px' }, body: { padding: '12px 16px' } }}
    >
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontWeight: 600, marginBottom: 6, color: '#595959', fontSize: 13 }}>
            Phân bổ Số Lượng Dở Dang
          </div>
          <SvgPie segments={segments} size={200} />
          <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>
            Tổng: {totalSl.toLocaleString('vi-VN')}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 340 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #f0f0f0' }}>
            <thead>
              <tr>
                <th style={{ ...thS, textAlign: 'left' }}>MMTB</th>
                <th style={{ ...thS, textAlign: 'right' }}>Số Lô</th>
                <th style={{ ...thS, textAlign: 'right' }}>Tổng Số Lượng</th>
                <th style={{ ...thS, textAlign: 'right' }}>Tổng Công Dự Kiến</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const colIdx = r.colorIdx < MACHINE_COLORS.length ? r.colorIdx : i % MACHINE_COLORS.length
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={tdS}>
                      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2,
                        background: MACHINE_COLORS[colIdx], marginRight: 8, verticalAlign: 'middle' }} />
                      {r.name}
                    </td>
                    <td style={{ ...tdS, textAlign: 'right' }}>{r.soLo}</td>
                    <td style={{ ...tdS, textAlign: 'right', fontWeight: 600 }}>{r.slTong.toLocaleString('vi-VN')}</td>
                    <td style={{ ...tdS, textAlign: 'right' }}>{r.congTong.toFixed(4)}</td>
                  </tr>
                )
              })}
              <tr style={{ background: '#e6f7ff', fontWeight: 700 }}>
                <td style={{ ...tdS, borderTop: '2px solid #d9d9d9' }}>Tổng cộng</td>
                <td style={{ ...tdS, textAlign: 'right', borderTop: '2px solid #d9d9d9' }}>{totalLo}</td>
                <td style={{ ...tdS, textAlign: 'right', borderTop: '2px solid #d9d9d9' }}>{totalSl.toLocaleString('vi-VN')}</td>
                <td style={{ ...tdS, textAlign: 'right', borderTop: '2px solid #d9d9d9' }}>{totalCong.toFixed(4)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  )
}

const statusTag = (val) =>
  val ? <Tag color={STATUS_COLORS[val]}>{STATUS_LABELS[val] || val}</Tag> : <Tag>—</Tag>

const STAGE_CFG = {
  dg: {
    label: 'Hàng dở dang đóng gói',
    endpoint: '/production/wip-dg',
    trangThaiField: 'dgTrangThai',
    doDangLabel: 'Dở dang ĐG',
    summaryLabel: 'Tổng dở dang ĐG',
    slLabel: 'SL Trung bình',
    mayMocLabel: 'Máy Móc ĐG',
    doDang: r => (parseInt(r.pcPl) || 0) - (parseInt(r.dg2) || 0),
    renderDoDang: (_, r) => (parseInt(r.pcPl) || 0) - (parseInt(r.dg2) || 0),
    calcCongDuKien: r => {
      const slTb = parseFloat(r.slTrungBinh)
      const doDang = (parseInt(r.pcPl) || 0) - (parseInt(r.dg2) || 0)
      if (!slTb || doDang <= 0) return '—'
      return (doDang / slTb).toFixed(4)
    },
  },
  pc: {
    label: 'Hàng dở dang PC',
    endpoint: '/production/wip-pc',
    trangThaiField: 'pcTrangThai',
    doDangLabel: 'Dở dang PC',
    summaryLabel: 'Tổng dở dang PC',
    slLabel: 'Năng suất PC',
    mayMocLabel: 'Máy Móc PC',
    doDang: r => (r.soLuong || 0) - (parseInt(r.slPc) || 0),
    renderDoDang: (_, r) => (r.soLuong || 0) - (parseInt(r.slPc) || 0),
    calcCongDuKien: r => {
      const ns = parseFloat(r.slTrungBinh)
      const doDang = (r.soLuong || 0) - (parseInt(r.slPc) || 0)
      if (!ns || doDang <= 0) return '—'
      return (doDang / ns).toFixed(4)
    },
  },
  pl: {
    label: 'Hàng dở dang PL',
    endpoint: '/production/wip-pl',
    trangThaiField: 'plTrangThai',
    doDangLabel: 'Dở dang PL',
    summaryLabel: 'Tổng dở dang PL',
    slLabel: 'Năng suất PL',
    mayMocLabel: 'Máy Móc PL',
    doDang: r => (parseInt(r.slPc) || 0) - (parseInt(r.pcPl) || 0),
    renderDoDang: (_, r) => (parseInt(r.slPc) || 0) - (parseInt(r.pcPl) || 0),
    calcCongDuKien: r => {
      const ns = parseFloat(r.slTrungBinh)
      const doDang = (parseInt(r.slPc) || 0) - (parseInt(r.pcPl) || 0)
      if (!ns || doDang <= 0) return '—'
      return (doDang / ns).toFixed(4)
    },
  },
  bbc1: {
    label: 'Hàng dở dang BBC1',
    endpoint: '/production/wip-bbc1',
    trangThaiField: 'bbc1TrangThai',
    doDangLabel: 'Dở dang BBC1',
    summaryLabel: 'Tổng dở dang BBC1',
    slLabel: 'Năng suất BBC1',
    mayMocLabel: 'Máy Móc BBC1',
    doDang: r => (r.soLuong || 0) - (parseInt(r.bbc1_2) || 0),
    renderDoDang: (_, r) => (r.soLuong || 0) - (parseInt(r.bbc1_2) || 0),
    calcCongDuKien: r => {
      const ns = parseFloat(r.slTrungBinh)
      const doDang = (r.soLuong || 0) - (parseInt(r.bbc1_2) || 0)
      if (!ns || doDang <= 0) return '—'
      return (doDang / ns).toFixed(4)
    },
  },
}

function buildColumns(cfg) {
  return [
    {
      title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 110, fixed: 'left', align: 'center',
      render: v => v ? <Tag color="blue" style={{ fontWeight: 700, marginRight: 0, fontFamily: 'monospace' }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Mã SP', dataIndex: 'maTp', key: 'maTp', width: 90,
      render: v => v ? <span style={{ fontWeight: 600, color: '#595959', fontSize: 12 }}>{v}</span> : '—'
    },
    {
      title: 'Tiến Trình', dataIndex: 'tienTrinh', key: 'tienTrinh', width: 220,
      render: v => <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.4 }}>{v}</span>
    },
    { title: 'Số Lô', dataIndex: 'lsx', key: 'lsx', width: 100, render: v => <span style={{ fontFamily: 'monospace', color: '#595959' }}>{v || '—'}</span> },
    { title: 'Cỡ Lô', dataIndex: 'soLuong', key: 'soLuong', width: 85, align: 'right', render: v => v != null ? <span style={{ fontWeight: 500 }}>{Number(v).toLocaleString('vi-VN')}</span> : '—' },
    {
      title: 'Tình Trạng', dataIndex: cfg.trangThaiField, key: cfg.trangThaiField, width: 100, align: 'center',
      render: statusTag
    },
    {
      title: cfg.slLabel, dataIndex: 'slTrungBinh', key: 'slTrungBinh', width: 130, align: 'right',
      render: (v, r) => {
        if (v != null) return <span style={{ color: '#722ed1', fontWeight: 600 }}>{Number(v).toLocaleString('vi-VN')}</span>
        if (cfg.doDang(r) > 0) return <Tag color="warning" style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>Chưa nhập NS</Tag>
        return <span style={{ color: '#d9d9d9' }}>—</span>
      }
    },
    {
      title: cfg.doDangLabel, key: 'doDang', width: 110, align: 'right',
      render: (_, r) => {
        const v = cfg.doDang(r)
        return v > 0 ? <span style={{ fontWeight: 700, color: '#1677ff' }}>{v.toLocaleString('vi-VN')}</span> : <span style={{ color: '#d9d9d9' }}>0</span>
      }
    },
    {
      title: 'Công dự kiến HT', key: 'congDuKien', width: 130, align: 'right',
      render: (_, r) => {
        const v = cfg.calcCongDuKien(r)
        if (v !== '—') return <span style={{ fontWeight: 600, color: '#389e0d' }}>{v}</span>
        if (cfg.doDang(r) > 0 && !r.slTrungBinh) return <Tag color="warning" style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>Chưa nhập NS</Tag>
        return <span style={{ color: '#d9d9d9' }}>—</span>
      }
    },
    {
      title: cfg.mayMocLabel, dataIndex: 'mayMoc', key: 'mayMoc', width: 160,
      render: v => v || <span style={{ color: '#d9d9d9' }}>—</span>
    },
    { title: 'Mô tả', dataIndex: 'moTa', key: 'moTa', render: v => v || <span style={{ color: '#d9d9d9' }}>—</span> },
  ]
}

const STAGE_LIST = [
  { key: 'dg',    label: 'Đóng gói', color: 'blue',     cfg: STAGE_CFG.dg,   toNhomFilter: null },
  { key: 'pcpl1', label: 'PC PCPL1', color: 'purple',   cfg: STAGE_CFG.pc,   toNhomFilter: 'PCPL1' },
  { key: 'pcpl2', label: 'PC PCPL2', color: 'geekblue', cfg: STAGE_CFG.pc,   toNhomFilter: 'PCPL2' },
  { key: 'pl',    label: 'PL',       color: 'cyan',     cfg: STAGE_CFG.pl,   toNhomFilter: null },
  { key: 'bbc1',  label: 'BBC1',     color: 'orange',   cfg: STAGE_CFG.bbc1, toNhomFilter: null },
]

function WipSummaryTab({ onNavigate, tabOffset = 0 }) {
  const [dataMap, setDataMap] = useState({ dg: [], pcpl1: [], pcpl2: [], pl: [], bbc1: [] })
  const [loading, setLoading] = useState(false)
  const stickyRef = useRef(null)
  const [headerOffset, setHeaderOffset] = useState(0)

  useEffect(() => {
    if (stickyRef.current) setHeaderOffset(tabOffset + stickyRef.current.offsetHeight + 8)
  })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [dgRes, pcRes, plRes, bbc1Res] = await Promise.all([
        api.get('/production/wip-dg'),
        api.get('/production/wip-pc'),
        api.get('/production/wip-pl'),
        api.get('/production/wip-bbc1'),
      ])
      const pcAll = pcRes.data
      setDataMap({
        dg: dgRes.data,
        pcpl1: pcAll.filter(r => r.toNhom === 'PCPL1'),
        pcpl2: pcAll.filter(r => r.toNhom === 'PCPL2'),
        pl: plRes.data,
        bbc1: bbc1Res.data,
      })
    } catch {
      message.error('Không thể tải dữ liệu tổng hợp')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const stageRows = STAGE_LIST.map(({ key, label, color, cfg }) => {
    const rows = dataMap[key]
    const tongDoDang = rows.reduce((sum, r) => sum + cfg.doDang(r), 0)
    const tongCDK = rows.reduce((sum, r) => {
      const v = cfg.calcCongDuKien(r)
      return v === '—' ? sum : sum + parseFloat(v)
    }, 0)
    return { key, label, color, tongDoDang, tongCDK, soLo: rows.length }
  })

  const totalDoDang = stageRows.reduce((s, r) => s + r.tongDoDang, 0)
  const totalCDK    = stageRows.reduce((s, r) => s + r.tongCDK, 0)
  const totalLo     = stageRows.reduce((s, r) => s + r.soLo, 0)

  const combinedData = [
    ...dataMap.dg.map(r    => ({ ...r, _stage: 'ĐG',       _stageColor: 'blue',     _stageKey: 'dg',    _doDang: STAGE_CFG.dg.doDang(r),   _cdk: STAGE_CFG.dg.calcCongDuKien(r) })),
    ...dataMap.pcpl1.map(r => ({ ...r, _stage: 'PC PCPL1', _stageColor: 'purple',   _stageKey: 'pcpl1', _doDang: STAGE_CFG.pc.doDang(r),   _cdk: STAGE_CFG.pc.calcCongDuKien(r) })),
    ...dataMap.pcpl2.map(r => ({ ...r, _stage: 'PC PCPL2', _stageColor: 'geekblue', _stageKey: 'pcpl2', _doDang: STAGE_CFG.pc.doDang(r),   _cdk: STAGE_CFG.pc.calcCongDuKien(r) })),
    ...dataMap.pl.map(r    => ({ ...r, _stage: 'PL',       _stageColor: 'cyan',     _stageKey: 'pl',    _doDang: STAGE_CFG.pl.doDang(r),   _cdk: STAGE_CFG.pl.calcCongDuKien(r) })),
    ...dataMap.bbc1.map(r  => ({ ...r, _stage: 'BBC1',     _stageColor: 'orange',   _stageKey: 'bbc1',  _doDang: STAGE_CFG.bbc1.doDang(r), _cdk: STAGE_CFG.bbc1.calcCongDuKien(r) })),
  ]

  const detailColumns = [
    {
      title: 'Công đoạn', key: '_stage', width: 100, fixed: 'left', align: 'center',
      render: (_, r) => (
        <Tag
          color={r._stageColor}
          onClick={() => onNavigate(r._stageKey)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
          title="Nhấn để xem chi tiết"
        >
          {r._stage}
        </Tag>
      )
    },
    { title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 110, align: 'center',
      render: v => v ? <Tag color="blue" style={{ fontWeight: 700, marginRight: 0, fontFamily: 'monospace' }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'Mã SP', dataIndex: 'maTp', key: 'maTp', width: 90,
      render: v => v ? <span style={{ fontWeight: 600, color: '#595959', fontSize: 12 }}>{v}</span> : '—' },
    { title: 'Tiến Trình', dataIndex: 'tienTrinh', key: 'tienTrinh', width: 220,
      render: v => <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.4 }}>{v}</span> },
    { title: 'Số Lô', dataIndex: 'lsx', key: 'lsx', width: 100,
      render: v => <span style={{ fontFamily: 'monospace', color: '#595959' }}>{v || '—'}</span> },
    { title: 'Cỡ Lô', dataIndex: 'soLuong', key: 'soLuong', width: 85, align: 'right',
      render: v => v != null ? <span style={{ fontWeight: 500 }}>{Number(v).toLocaleString('vi-VN')}</span> : '—' },
    { title: 'Dở dang', key: '_doDang', width: 105, align: 'right',
      render: (_, r) => r._doDang > 0 ? <span style={{ fontWeight: 700, color: '#1677ff' }}>{r._doDang.toLocaleString('vi-VN')}</span> : <span style={{ color: '#d9d9d9' }}>0</span> },
    { title: 'Công dự kiến HT', key: '_cdk', width: 140, align: 'right',
      render: (_, r) => {
        if (r._cdk !== '—') return <span style={{ fontWeight: 600, color: '#389e0d' }}>{r._cdk}</span>
        if (r._doDang > 0 && !r.slTrungBinh) return <Tag color="warning" style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>Chưa nhập NS</Tag>
        return <span style={{ color: '#d9d9d9' }}>—</span>
      } },
    { title: 'Mô tả', dataIndex: 'moTa', key: 'moTa', render: v => v || <span style={{ color: '#d9d9d9' }}>—</span> },
  ]

  const tdBase = { padding: '6px 16px', borderBottom: '1px solid #f0f0f0', fontSize: 13 }
  const thDark = { padding: '6px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: 0.4, background: 'linear-gradient(90deg, #2980b3 0%, #3399CC 100%)', color: '#ffffff', borderRight: '1px solid #4db3d4', whiteSpace: 'nowrap' }

  return (
    <>
      <div ref={stickyRef} style={{ position: 'sticky', top: tabOffset, zIndex: 10, background: '#fff', borderBottom: '2px solid #e8eaf6' }}>
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          {/* Unified summary table: info col + data cols */}
          <table style={{ borderCollapse: 'collapse', flex: '0 0 auto' }}>
            <colgroup>
              <col style={{ width: 180 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 180 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...thDark, textAlign: 'center', background: '#1a4a6b', borderRight: '2px solid #4db3d4' }}>Công đoạn</th>
                <th style={{ ...thDark, textAlign: 'right' }}>Số lô dở dang</th>
                <th style={{ ...thDark, textAlign: 'right' }}>Tổng dở dang</th>
                <th style={{ ...thDark, textAlign: 'right' }}>Tổng công dự kiến HT</th>
              </tr>
            </thead>
            <tbody>
              {stageRows.map((r, i) => (
                <tr key={r.key} style={{ background: i % 2 === 0 ? '#fff' : '#EAECF2' }}>
                  <td style={{ ...tdBase, textAlign: 'center', background: i % 2 === 0 ? '#f5f9ff' : '#eaf2fb', borderRight: '2px solid #d0e8f5' }}>
                    <Tag color={r.color} onClick={() => onNavigate(r.key)}
                      style={{ fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                      title="Nhấn để xem chi tiết">
                      {r.label} ↗
                    </Tag>
                  </td>
                  <td style={{ ...tdBase, textAlign: 'right' }}>{r.soLo}</td>
                  <td style={{ ...tdBase, textAlign: 'right', fontWeight: 700, color: '#1677ff' }}>{r.tongDoDang.toLocaleString('vi-VN')}</td>
                  <td style={{ ...tdBase, textAlign: 'right', fontWeight: 600, color: '#389e0d' }}>{r.tongCDK.toFixed(4)}</td>
                </tr>
              ))}
              <tr style={{ background: 'linear-gradient(90deg, #1f6fa3 0%, #2980b3 100%)' }}>
                <td style={{ padding: '7px 16px', textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#ffffff', borderRight: '2px solid #4db3d4' }}>Tổng cộng</td>
                <td style={{ padding: '7px 16px', textAlign: 'right', fontWeight: 700, color: '#fff' }}>{totalLo}</td>
                <td style={{ padding: '7px 16px', textAlign: 'right', fontWeight: 700, color: '#a5f3fc' }}>{totalDoDang.toLocaleString('vi-VN')}</td>
                <td style={{ padding: '7px 16px', textAlign: 'right', fontWeight: 700, color: '#90B8D0' }}>{totalCDK.toFixed(4)}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ flex: 1 }} />
          <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center' }}>
            <Button size="small" icon={<ReloadOutlined />} onClick={fetchAll} loading={loading}>Làm mới</Button>
          </div>
        </div>
      </div>

      <Table
        className="wip-table"
        columns={detailColumns}
        dataSource={combinedData}
        rowKey={(r, i) => `${r.id}_${r._stage}_${i}`}
        loading={loading}
        size="small"
        scroll={{ x: 1100 }}
        sticky={{ offsetHeader: headerOffset }}
        pagination={{ pageSize: 50, showTotal: total => `Tổng ${total} bản ghi` }}
        rowClassName={(_, idx) => idx % 2 === 0 ? '' : 'row-alt'}
      />
    </>
  )
}

function SummaryCard({ data, cfg }) {
  const tongDoDang = data.reduce((sum, r) => sum + cfg.doDang(r), 0)
  const tongCongDuKien = data.reduce((sum, r) => {
    const val = cfg.calcCongDuKien(r)
    return val === '—' ? sum : sum + parseFloat(val)
  }, 0)

  return (
    <div style={{ display: 'flex', flex: 1 }}>
      {[
        { label: cfg.summaryLabel, value: tongDoDang.toLocaleString('vi-VN'), accent: '#4db3d4' },
        { label: 'Tổng công dự kiến HT', value: tongCongDuKien.toFixed(4), accent: '#748090' },
        { label: 'Số lô dở dang', value: data.length, accent: '#f97316' },
      ].map((item, i) => (
        <div key={i} style={{
          flex: 1, padding: '10px 20px', background: '#fafbff',
          borderRight: '1px solid #e8eaf6',
        }}>
          <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{item.label}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: item.accent, letterSpacing: -0.5 }}>{item.value}</div>
        </div>
      ))}
    </div>
  )
}

function WipStageTab({ cfg, tabOffset = 0, showMachineChart = false, knownMachines, toNhomFilter = null }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const controlsRef = useRef(null)
  const [headerOffset, setHeaderOffset] = useState(0)

  useEffect(() => {
    if (controlsRef.current) setHeaderOffset(tabOffset + controlsRef.current.offsetHeight + 8)
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get(cfg.endpoint)
      setData(toNhomFilter ? res.filter(r => r.toNhom === toNhomFilter) : res)
    } catch {
      message.error('Không thể tải dữ liệu hàng dở dang')
    } finally {
      setLoading(false)
    }
  }, [cfg.endpoint, toNhomFilter])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <>
      <div ref={controlsRef} style={{ position: 'sticky', top: tabOffset, zIndex: 10, background: '#fff', borderBottom: '2px solid #e8eaf6' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid #e8eaf6' }}>
          <SummaryCard data={data} cfg={cfg} />
          <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', background: '#fafbff' }}>
            <Button size="small" icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Làm mới</Button>
          </div>
        </div>
      </div>
      {showMachineChart && <MachinePieChart data={data} cfg={cfg} knownMachines={knownMachines} />}
      <Table
        className="wip-table"
        columns={buildColumns(cfg)}
        dataSource={[...data].sort((a, b) => {
          const da = cfg.doDang(a)
          const db = cfg.doDang(b)
          if (da > 0 && db <= 0) return -1
          if (da <= 0 && db > 0) return 1
          if (da > 0 && db > 0) return da - db
          return 0
        })}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 1100 }}
        sticky={{ offsetHeader: headerOffset }}
        pagination={{ pageSize: 50, showTotal: total => `Tổng ${total} bản ghi` }}
        rowClassName={(_, idx) => idx % 2 === 0 ? '' : 'row-alt'}
      />
    </>
  )
}

const TAB_BAR_H = 46

export default function WipPage() {
  const { getAllowedStages, getAllowedNhom } = useAuth()
  const allowedStages = getAllowedStages()
  const allowedNhom = getAllowedNhom()

  let allowedWipKeys = null
  if (allowedStages) {
    allowedWipKeys = []
    for (const s of allowedStages) {
      if (s === 'PC') {
        if (allowedNhom === 'PCPL1') allowedWipKeys.push('pcpl1')
        else if (allowedNhom === 'PCPL2') allowedWipKeys.push('pcpl2')
        else { allowedWipKeys.push('pcpl1'); allowedWipKeys.push('pcpl2') }
      } else {
        allowedWipKeys.push(s.toLowerCase())
      }
    }
  }

  const defaultTab = allowedWipKeys ? allowedWipKeys[0] : 'summary'
  const [activeKey, setActiveKey] = useState(defaultTab)

  // All tab definitions
  const allTabItems = [
    ...(!allowedWipKeys ? [{ key: 'summary', label: 'Tổng hợp', children: <WipSummaryTab onNavigate={setActiveKey} tabOffset={TAB_BAR_H} /> }] : []),
    { key: 'dg',    label: STAGE_CFG.dg.label,    children: <WipStageTab cfg={STAGE_CFG.dg}   tabOffset={TAB_BAR_H} showMachineChart knownMachines={KNOWN_MACHINES_DG} /> },
    { key: 'pcpl1', label: 'Hàng dở dang PCPL1',  children: <WipStageTab cfg={STAGE_CFG.pc} toNhomFilter="PCPL1" tabOffset={TAB_BAR_H} showMachineChart knownMachines={KNOWN_MACHINES_PC} /> },
    { key: 'pcpl2', label: 'Hàng dở dang PCPL2',  children: <WipStageTab cfg={STAGE_CFG.pc} toNhomFilter="PCPL2" tabOffset={TAB_BAR_H} showMachineChart knownMachines={KNOWN_MACHINES_PC} /> },
    { key: 'pl',    label: STAGE_CFG.pl.label,    children: <WipStageTab cfg={STAGE_CFG.pl}   tabOffset={TAB_BAR_H} showMachineChart knownMachines={KNOWN_MACHINES_PL} /> },
    { key: 'bbc1',  label: STAGE_CFG.bbc1.label,  children: <WipStageTab cfg={STAGE_CFG.bbc1} tabOffset={TAB_BAR_H} showMachineChart knownMachines={KNOWN_MACHINES_BBC1} /> },
  ]
  const tabItems = allowedWipKeys
    ? allTabItems.filter(t => allowedWipKeys.includes(t.key))
    : allTabItems

  return (
    <>
      <style>{`
        /* Alternating rows */
        .wip-table .ant-table-tbody > tr.row-alt > td { background: #EAECF2 !important; }
        /* ERP dark table headers */
        .wip-table .ant-table-thead > tr > th {
          background: #66FFCC !important;
          color: #0a3d2e !important;
          text-align: center !important;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.5px;
          padding: 6px 8px !important;
          white-space: nowrap;
          border-right: 1px solid #33e6aa !important;
        }
        .wip-table .ant-table-thead > tr > th::before { display: none !important; }
        .wip-table .ant-table-tbody > tr > td { padding: 5px 8px !important; font-size: 12px; vertical-align: middle; border-bottom: 1px solid #f0f0f0 !important; }
        .wip-table .ant-table-tbody > tr:hover > td { background: #EFF6FF !important; }
        .wip-table .ant-table-body::-webkit-scrollbar,
        .wip-table .ant-table-content::-webkit-scrollbar,
        .wip-table .ant-table-wrapper::-webkit-scrollbar,
        .wip-table *::-webkit-scrollbar { height: 1.5px !important; width: 1.5px !important; }
        .wip-table .ant-table-body::-webkit-scrollbar-track,
        .wip-table .ant-table-content::-webkit-scrollbar-track,
        .wip-table *::-webkit-scrollbar-track { background: #f0f4f8; border-radius: 4px; }
        .wip-table .ant-table-body::-webkit-scrollbar-thumb,
        .wip-table .ant-table-content::-webkit-scrollbar-thumb,
        .wip-table *::-webkit-scrollbar-thumb { background: #66FFCC; border-radius: 4px; }
        .wip-table .ant-table-body::-webkit-scrollbar-thumb:hover,
        .wip-table .ant-table-content::-webkit-scrollbar-thumb:hover,
        .wip-table *::-webkit-scrollbar-thumb:hover { background: #33e6aa; }
        /* ERP navy tab bar */
        .wip-tabs > .ant-tabs-nav { margin: 0 !important; background: #1e4570; padding: 0 12px; }
        .wip-tabs > .ant-tabs-nav .ant-tabs-tab { color: #CBD5E1 !important; border: none !important; background: transparent !important; padding: 8px 16px !important; font-size: 13px; margin: 0 2px !important; border-radius: 4px 4px 0 0 !important; }
        .wip-tabs > .ant-tabs-nav .ant-tabs-tab:hover { color: #fff !important; background: rgba(59,130,246,0.15) !important; }
        .wip-tabs > .ant-tabs-nav .ant-tabs-tab-active { color: #fff !important; background: rgba(29,78,216,0.25) !important; font-weight: 600; box-shadow: 0 -3px 0 #60A5FA inset; }
        .wip-tabs > .ant-tabs-nav .ant-tabs-ink-bar { background: #60A5FA !important; }
        .wip-tabs > .ant-tabs-nav::before { border-bottom: none !important; }
      `}</style>

      <Tabs
        className="wip-tabs"
        activeKey={activeKey}
        onChange={setActiveKey}
        type="line"
        size="middle"
        tabBarExtraContent={
          <Typography.Text strong style={{ color: '#DDE1E8', fontSize: 14, paddingRight: 12, letterSpacing: 0.3 }}>
            Hàng dở dang
          </Typography.Text>
        }
        tabBarStyle={{ position: 'sticky', top: 0, zIndex: 20, marginBottom: 0 }}
        items={tabItems}
      />
    </>
  )
}
