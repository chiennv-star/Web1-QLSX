import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { DatePicker, Button, Spin, message, Tabs, Table, Tag, Tooltip } from 'antd'
import { SearchOutlined, ReloadOutlined, BarChartOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RcTooltip, Legend,
  ResponsiveContainer, LabelList, Cell,
} from 'recharts'
import { useLocation } from 'react-router-dom'
import api from '../api/axios'

const { RangePicker } = DatePicker

const SS_TO = 'ptkh_selectedTo'

const STAGES = [
  { key: 'PCPL1', label: 'PCPL1', color: '#1D4ED8' },
  { key: 'PCPL2', label: 'PCPL2', color: '#0369a1' },
  { key: 'PL',    label: 'PL',    color: '#0e7490' },
  { key: 'DG',    label: 'ĐG',    color: '#b45309' },
  { key: 'BBC1',  label: 'BBC1',  color: '#6d28d9' },
  { key: 'CC',    label: 'CC',    color: '#9d174d' },
]

const MACHINES_PCPL2 = ['Máy Nhũ hóa 500L', 'Máy Khuấy 700L', 'Máy Nhũ hóa 100L', 'Máy Khuấy 1500L']

const TYPE_COLORS = [
  '#1677ff','#52c41a','#fa8c16','#722ed1','#eb2f96',
  '#13c2c2','#faad14','#f5222d','#a0d911','#2f54eb',
]

const fmtSL = v => (v || 0).toLocaleString('vi-VN')

function resolveStage(r) {
  const nhom = (r.toNhom || '').toUpperCase()
  const cd   = (r.congDoan || '').toUpperCase()
  if (nhom === 'PCPL1') return 'PCPL1'
  if (nhom === 'PCPL2') return 'PCPL2'
  if (nhom === 'PCPL3') return 'PL'
  if (nhom === 'BBC1'  || cd === 'BBC1') return 'BBC1'
  if (nhom === 'ĐG'    || cd === 'DG')   return 'DG'
  if (cd === 'CC') return 'CC'
  if (cd === 'PL') return 'PL'
  if (cd === 'PC') {
    if (nhom === 'PCPL2') return 'PCPL2'
    return 'PCPL1'
  }
  return cd || 'PCPL1'
}

const TO_FILTER_FN = {
  'PCPL1':    r => (r.toNhom || '').toUpperCase() === 'PCPL1',
  'PCPL2':    r => (r.toNhom || '').toUpperCase() === 'PCPL2',
  'PCPL3':    r => (r.toNhom || '').toUpperCase() === 'PCPL3',
  'BBC1':     r => (r.toNhom || '').toUpperCase() === 'BBC1' || (r.congDoan || '').toUpperCase() === 'BBC1',
  'ĐG':       r => (r.toNhom || '').toUpperCase() === 'ĐG'   || (r.congDoan || '').toUpperCase() === 'DG',
  'Cân Chia': r => (r.congDoan || '').toUpperCase() === 'CC',
}

const TO_DISPLAY = {
  'PCPL1': 'PCPL1', 'PCPL2': 'PCPL2', 'PCPL3': 'PL',
  'BBC1': 'BBC1', 'ĐG': 'ĐG', 'Cân Chia': 'Cân Chia',
}

export default function PhanTichKeHoachPage() {
  const location   = useLocation()
  const [raw, setRaw]               = useState([])
  const [loading, setLoading]       = useState(false)
  const [productMap, setProductMap] = useState({})
  const [subTab, setSubTab]         = useState('tonghop')
  const [pickerMode, setPickerMode] = useState('range')  // 'range' | 'month'
  const [activePreset, setActivePreset] = useState('this_week')

  const selectedTo = sessionStorage.getItem(SS_TO) || location.state?.selectedTo || ''

  const mondayOf = d => {
    const dow = d.day()
    return d.subtract(dow === 0 ? 6 : dow - 1, 'day').startOf('day')
  }

  const thisWeekRange = () => {
    const mon = mondayOf(dayjs())
    return [mon, mon.add(6, 'day').endOf('day')]
  }

  const [dateRange, setDateRange] = useState(thisWeekRange)

  const applyPreset = preset => {
    let range
    if (preset === 'last_week') {
      const mon = mondayOf(dayjs()).subtract(7, 'day')
      range = [mon, mon.add(6, 'day').endOf('day')]
    } else if (preset === 'next_week') {
      const mon = mondayOf(dayjs()).add(7, 'day')
      range = [mon, mon.add(6, 'day').endOf('day')]
    } else {
      range = thisWeekRange()
    }
    setActivePreset(preset)
    setPickerMode('range')
    setDateRange(range)
    fetchData(range)
  }

  const handleMonthChange = m => {
    if (!m) return
    const range = [m.startOf('month'), m.endOf('month')]
    setActivePreset(null)
    setDateRange(range)
    fetchData(range)
  }

  const handleWeekChange = w => {
    if (!w) return
    const mon = mondayOf(w)
    const range = [mon, mon.add(6, 'day').endOf('day')]
    setActivePreset(null)
    setDateRange(range)
    fetchData(range)
  }

  const filteredRaw = useMemo(() => {
    if (!selectedTo) return raw
    const fn = TO_FILTER_FN[selectedTo]
    return fn ? raw.filter(fn) : raw
  }, [raw, selectedTo])

  // Dedup theo soLo+congDoan+toNhom: 1 lô xếp nhiều ngày chỉ tính 1 lần
  const dedupedByLo = useMemo(() => {
    const seen = new Set()
    return filteredRaw.filter(r => {
      const key = r.soLo
        ? `${r.maBravo || ''}|${r.soLo}|${(r.congDoan || '').toUpperCase()}|${(r.toNhom || '').toUpperCase()}`
        : `__id_${r.id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [filteredRaw])

  const fetchData = useCallback(async (range = dateRange) => {
    setLoading(true)
    try {
      const params = { page: 0, size: 3000, source: 'PLAN' }
      if (range?.[0]) params.fromDate = range[0].format('YYYY-MM-DD')
      if (range?.[1]) params.toDate   = range[1].format('YYYY-MM-DD')
      const { data: res } = await api.get('/work-schedule', { params })
      const items = res.content || []
      setRaw(items)
      const codes = [...new Set(items.map(r => r.maSp).filter(Boolean))]
      if (codes.length > 0) {
        api.get('/product-master/lookup-batch', { params: { codes } })
          .then(({ data: pm }) => setProductMap(pm))
          .catch(() => {})
      }
    } catch { message.error('Không thể tải dữ liệu phân tích kế hoạch') }
    finally { setLoading(false) }
  }, [dateRange])

  useEffect(() => { fetchData() }, []) // eslint-disable-line

  // ── Group by SP / lô across stages (dùng dedupedByLo) ──────────────────────
  const groupedData = useMemo(() => {
    const map = {}
    dedupedByLo.forEach(r => {
      const key = `${r.maSp || ''}|${r.soLo || ''}`
      if (!map[key]) {
        map[key] = { key, maSp: r.maSp, tenTrinh: r.tenTrinh, soLo: r.soLo }
        STAGES.forEach(s => { map[key][s.key] = 0 })
      }
      const stage = resolveStage(r)
      if (map[key][stage] !== undefined) map[key][stage] += Number(r.coLo || 0)
    })
    return Object.values(map)
  }, [dedupedByLo])

  const grandSL = useMemo(
    () => dedupedByLo.reduce((s, r) => s + Number(r.coLo || 0), 0),
    [dedupedByLo],
  )

  // Tổng SL (dedup theo maBravo+soLo+congDoan+toNhom để tránh cộng 2 lần khi lô trải nhiều ngày)
  const grandSLAll = useMemo(
    () => dedupedByLo.reduce((s, r) => s + Number(r.coLo || 0), 0),
    [dedupedByLo],
  )

  // ── Stage stats ──────────────────────────────────────────────────────────────
  const stageStats = useMemo(() =>
    STAGES.map(s => ({
      key:   s.key,
      label: s.label,
      color: s.color,
      sl:    dedupedByLo.filter(r => resolveStage(r) === s.key).reduce((sum, r) => sum + Number(r.coLo || 0), 0),
      soKH:  dedupedByLo.filter(r => resolveStage(r) === s.key).length,
    })).filter(s => s.sl > 0),
  [dedupedByLo])

  // ── Timeline data (dùng dedupedByLo, lô chỉ hiện ngày đầu được xếp) ────────
  const timeData = useMemo(() => {
    const map = {}
    dedupedByLo.forEach(r => {
      const date = r.ngayThucHien
      if (!date) return
      const stage = resolveStage(r)
      if (!map[date]) { map[date] = { date }; STAGES.forEach(s => { map[date][s.key] = 0 }) }
      if (map[date][stage] !== undefined) map[date][stage] += Number(r.coLo || 0)
    })
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  }, [dedupedByLo])

  // ── By product type ──────────────────────────────────────────────────────────
  const loaiSpData = useMemo(() => {
    const map = {}
    let totalSl = 0
    dedupedByLo.forEach(r => {
      const loai = productMap[r.maSp]?.loaiSanPham || '(Chưa phân loại)'
      const stage = resolveStage(r)
      const sl = Number(r.coLo || 0)
      if (!map[loai]) { map[loai] = { loai, spSet: new Set(), sl: 0 }; STAGES.forEach(s => { map[loai][s.key] = 0 }) }
      map[loai].spSet.add(r.maSp)
      map[loai].sl += sl
      totalSl += sl
      if (map[loai][stage] !== undefined) map[loai][stage] += sl
    })
    return Object.values(map)
      .map(r => ({ ...r, soTp: r.spSet.size, tyLe: totalSl > 0 ? r.sl / totalSl * 100 : 0 }))
      .sort((a, b) => b.sl - a.sl)
  }, [dedupedByLo, productMap])

  // ── Top 15 ──────────────────────────────────────────────────────────────────
  const top15 = useMemo(() =>
    [...groupedData]
      .map(r => ({
        name: r.maSp || '?',
        lo: r.soLo || '',
        sl: STAGES.reduce((sum, s) => sum + (r[s.key] || 0), 0),  // tổng theo stage keys
      }))
      .sort((a, b) => b.sl - a.sl).slice(0, 15).reverse(),
  [groupedData])

  const colorOf = loai => TYPE_COLORS[loaiSpData.findIndex(r => r.loai === loai) % TYPE_COLORS.length] || '#888'

  // ── Lịch Máy (từ filteredRaw, giống Chi Tiết) ───────────────────────────────
  const machineSchedule = useMemo(() => {
    const pcpl2 = filteredRaw.filter(r => resolveStage(r) === 'PCPL2')
    const dates = [...new Set(pcpl2.map(r => r.ngayThucHien).filter(Boolean))].sort()
    const rows = MACHINES_PCPL2.map(machine => {
      const row = { machine }
      dates.forEach(date => {
        row[date] = pcpl2.filter(r => r.ngayThucHien === date && (r.phongThucHien || '') === machine)
      })
      return row
    })
    return { dates, rows }
  }, [filteredRaw])

  // ── Sub-tabs ─────────────────────────────────────────────────────────────────
  const subTabItems = [
    {
      key: 'tonghop',
      label: 'Tổng Hợp',
      children: (
        <div style={{ padding: '12px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ background: '#f8f9fa', borderRadius: 6, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 12, color: '#333', fontSize: 13 }}>
                SL kế hoạch theo Công đoạn
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stageStats} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fontWeight: 700 }} />
                  <YAxis tickFormatter={v => v.toLocaleString('vi-VN')} tick={{ fontSize: 11 }} />
                  <RcTooltip formatter={v => [v.toLocaleString('vi-VN'), 'SL Kế Hoạch']} />
                  <Bar dataKey="sl" radius={[4, 4, 0, 0]}>
                    {stageStats.map(s => <Cell key={s.key} fill={s.color} />)}
                    <LabelList dataKey="sl" position="top"
                      formatter={v => v > 0 ? v.toLocaleString('vi-VN') : ''}
                      style={{ fontSize: 10, fill: '#444' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: '#f8f9fa', borderRadius: 6, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 12, color: '#333', fontSize: 13 }}>
                Tỷ lệ % SL kế hoạch theo Công đoạn
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                {stageStats.map(s => (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 60, fontSize: 12, fontWeight: 700, color: s.color, flexShrink: 0 }}>{s.label}</div>
                    <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 4, height: 22, overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.max(2, grandSL > 0 ? s.sl / grandSL * 100 : 0)}%`,
                        height: '100%', background: s.color, borderRadius: 4,
                        display: 'flex', alignItems: 'center', paddingLeft: 6,
                      }}>
                        <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {grandSL > 0 ? (s.sl / grandSL * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: '#888', minWidth: 70, textAlign: 'right' }}>{fmtSL(s.sl)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Table size="small" dataSource={stageStats} rowKey="key" pagination={false}
            columns={[
              { title: 'Công đoạn', dataIndex: 'label', width: 100,
                render: (v, r) => <Tag color={r.key === 'PCPL1' ? 'blue' : r.key === 'PCPL2' ? 'geekblue' : r.key === 'PL' ? 'cyan' : r.key === 'DG' ? 'gold' : r.key === 'BBC1' ? 'purple' : 'magenta'} style={{ fontWeight: 700 }}>{v}</Tag> },
              { title: 'Số Kế Hoạch', dataIndex: 'soKH', align: 'right', width: 110,
                render: v => <span style={{ color: '#374151' }}>{v}</span> },
              { title: 'Tổng SL KH', dataIndex: 'sl', align: 'right',
                render: (v, r) => <span style={{ fontWeight: 700, color: r.color }}>{fmtSL(v)}</span> },
              { title: '% SL', dataIndex: 'sl', key: 'pct', align: 'right', width: 80,
                render: v => `${grandSL > 0 ? ((v / grandSL) * 100).toFixed(1) : 0}%` },
            ]}
            summary={() => (
              <Table.Summary.Row style={{ background: '#f0fdf4', fontWeight: 700 }}>
                <Table.Summary.Cell index={0}>TỔNG</Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">{dedupedByLo.length}</Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <span style={{ color: '#1e5fa3' }}>{fmtSL(grandSL)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">100%</Table.Summary.Cell>
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
            <div style={{ fontWeight: 600, marginBottom: 12, color: '#333', fontSize: 13 }}>
              SL kế hoạch theo ngày (phân theo công đoạn)
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={timeData} margin={{ top: 10, right: 20, left: 10, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0}
                  tickFormatter={v => dayjs(v).format('DD/MM')} />
                <YAxis tickFormatter={v => v.toLocaleString('vi-VN')} tick={{ fontSize: 11 }} />
                <RcTooltip
                  formatter={(v, name) => [v.toLocaleString('vi-VN'), name]}
                  labelFormatter={v => dayjs(v).format('DD/MM/YYYY')} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {STAGES.map(s => (
                  <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Table size="small" dataSource={timeData} rowKey="date"
            pagination={{ pageSize: 14, showSizeChanger: false, showTotal: t => `${t} ngày` }}
            columns={[
              { title: 'Ngày kế hoạch', dataIndex: 'date', width: 130, fixed: 'left',
                render: v => (
                  <span style={{ fontWeight: 700, color: '#1677ff' }}>
                    {dayjs(v).format('DD/MM/YYYY')} <span style={{ fontWeight: 400, color: '#888', fontSize: 11 }}>({['CN','T2','T3','T4','T5','T6','T7'][dayjs(v).day()]})</span>
                  </span>
                )},
              ...STAGES.map(s => ({
                title: s.label, dataIndex: s.key, align: 'right', width: 90,
                render: v => v > 0
                  ? <span style={{ color: s.color, fontWeight: 600 }}>{fmtSL(v)}</span>
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
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#333', fontSize: 13 }}>SL KH theo Loại SP</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={loaiSpData} margin={{ top: 5, right: 20, left: 10, bottom: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="loai" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tickFormatter={v => v.toLocaleString('vi-VN')} tick={{ fontSize: 11 }} />
                  <RcTooltip formatter={v => [v.toLocaleString('vi-VN'), 'SL KH']} />
                  <Bar dataKey="sl" radius={[4, 4, 0, 0]}>
                    {loaiSpData.map(r => <Cell key={r.loai} fill={colorOf(r.loai)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: '#f8f9fa', borderRadius: 6, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 12, color: '#333', fontSize: 13 }}>Tỷ lệ % sản lượng kế hoạch</div>
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
              { title: 'Tổng SL KH', dataIndex: 'sl', align: 'right', width: 120,
                sorter: (a, b) => a.sl - b.sl,
                render: (v, r) => <span style={{ fontWeight: 700, color: colorOf(r.loai) }}>{fmtSL(v)}</span> },
              { title: 'Tỷ Lệ', dataIndex: 'tyLe', align: 'right', width: 75,
                render: v => `${v.toFixed(1)}%` },
              ...STAGES.map(s => ({
                title: s.label, dataIndex: s.key, align: 'right', width: 85,
                render: v => v > 0
                  ? <span style={{ color: s.color }}>{fmtSL(v)}</span>
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
                      <span style={{ color: s.color }}>{fmtSL(loaiSpData.reduce((sum, r) => sum + (r[s.key] || 0), 0))}</span>
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
      key: 'top15',
      label: 'Top 15 SP',
      children: (
        <div style={{ padding: '12px 0' }}>
          <div style={{ fontWeight: 600, marginBottom: 12, color: '#333', fontSize: 13 }}>
            Top {top15.length} sản phẩm / lô theo SL kế hoạch
          </div>
          <ResponsiveContainer width="100%" height={Math.max(300, top15.length * 32)}>
            <BarChart data={top15} layout="vertical" margin={{ top: 5, right: 80, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={v => v.toLocaleString('vi-VN')} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <RcTooltip
                formatter={(v, _, p) => [v.toLocaleString('vi-VN'), `${p.payload?.name} — Lô ${p.payload?.lo || '—'}`]} />
              <Bar dataKey="sl" fill="#1D4ED8" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="sl" position="right"
                  formatter={v => v.toLocaleString('vi-VN')}
                  style={{ fontSize: 11, fill: '#444' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ),
    },
    {
      key: 'chitiet',
      label: 'Chi Tiết',
      children: (
        <div style={{ padding: '12px 0' }}>
          <Table size="small" dataSource={filteredRaw} rowKey="id"
            scroll={{ x: 'max-content', y: 'calc(100vh - 340px)' }}
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `${t} kế hoạch` }}
            columns={[
              { title: 'Ngày KH', dataIndex: 'ngayThucHien', width: 100, fixed: 'left',
                render: v => v ? <span style={{ fontWeight: 600, color: '#1677ff' }}>{dayjs(v).format('DD/MM/YYYY')}</span> : '—' },
              { title: 'Mã Bravo', dataIndex: 'maBravo', width: 105, fixed: 'left',
                render: v => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#374151' }}>{v || '—'}</span> },
              { title: 'Tên / Tiến trình', dataIndex: 'tenTrinh', width: 220, fixed: 'left',
                render: v => <Tooltip title={v}><span style={{ fontSize: 12, whiteSpace: 'normal', wordBreak: 'break-word' }}>{v || '—'}</span></Tooltip> },
              { title: 'Số lô', dataIndex: 'soLo', width: 90,
                render: v => <span style={{ color: '#6d28d9', fontWeight: 600 }}>{v || '—'}</span> },
              { title: 'Tổ', dataIndex: 'toNhom', width: 80, align: 'center',
                render: v => v ? <Tag color="geekblue" style={{ fontWeight: 700, marginRight: 0 }}>{v}</Tag> : '—' },
              { title: 'Công đoạn', dataIndex: 'congDoan', width: 90, align: 'center',
                render: (v, r) => {
                  const s = resolveStage(r)
                  const tagColor = s === 'PCPL1' ? 'blue' : s === 'PCPL2' ? 'geekblue' : s === 'PL' ? 'cyan' : s === 'DG' ? 'gold' : s === 'BBC1' ? 'purple' : 'magenta'
                  return <Tag color={tagColor} style={{ fontWeight: 700, marginRight: 0 }}>{s}</Tag>
                } },
              { title: 'Cỡ lô (KH)', dataIndex: 'coLo', align: 'right', width: 100,
                sorter: (a, b) => (a.coLo || 0) - (b.coLo || 0),
                render: v => v ? <span style={{ fontWeight: 700, color: '#1e5fa3' }}>{fmtSL(v)}</span> : '—' },
              { title: 'Thiết bị PC', key: 'mayMocPc', width: 120, ellipsis: true,
                render: (_, r) => {
                  const stage = resolveStage(r)
                  const v = (stage === 'PCPL2' || stage === 'PL')
                    ? r.phongThucHien
                    : productMap[r.maSp]?.mayMocPc
                  return v ? <Tooltip title={v}><span style={{ fontSize: 11, color: '#374151' }}>{v}</span></Tooltip> : <span style={{ color: '#d9d9d9' }}>—</span>
                } },
              { title: 'NS PC', key: 'nangSuatPc', align: 'right', width: 80,
                render: (_, r) => {
                  const v = productMap[r.maSp]?.nangSuatPc
                  return v ? <span style={{ color: '#0369a1', fontWeight: 600 }}>{Number(v).toLocaleString('vi-VN')}</span> : <span style={{ color: '#d9d9d9' }}>—</span>
                } },
              { title: 'NS PL', key: 'nangSuatPl', align: 'right', width: 80,
                render: (_, r) => {
                  const v = productMap[r.maSp]?.nangSuatPl
                  return v ? <span style={{ color: '#0e7490', fontWeight: 600 }}>{Number(v).toLocaleString('vi-VN')}</span> : <span style={{ color: '#d9d9d9' }}>—</span>
                } },
              { title: 'Công TH PC', key: 'congThucHienPc', align: 'right', width: 90,
                render: (_, r) => {
                  const ns = Number(productMap[r.maSp]?.nangSuatPc || 0)
                  const cl = Number(r.coLo || 0)
                  if (!ns || !cl) return <span style={{ color: '#d9d9d9' }}>—</span>
                  const v = (cl / ns).toFixed(2)
                  return <span style={{ color: '#0369a1', fontWeight: 600 }}>{v}</span>
                } },
              { title: 'Công TH PL', key: 'congThucHienPl', align: 'right', width: 90,
                render: (_, r) => {
                  const ns = Number(productMap[r.maSp]?.nangSuatPl || 0)
                  const cl = Number(r.coLo || 0)
                  if (!ns || !cl) return <span style={{ color: '#d9d9d9' }}>—</span>
                  const v = (cl / ns).toFixed(2)
                  return <span style={{ color: '#0e7490', fontWeight: 600 }}>{v}</span>
                } },
              { title: 'Số người TH', key: 'soNguoi', align: 'center', width: 100,
                render: (_, r) => {
                  const stage = resolveStage(r)
                  const val = stage === 'PL'   ? r.congPl
                            : stage === 'BBC1' ? r.congBbc1
                            : stage === 'DG'   ? r.congDg
                            : stage === 'CC'   ? r.congCc
                            :                   r.congPc  // PCPL1, PCPL2
                  const n = Number(val || 0)
                  return n > 0
                    ? <span style={{ fontWeight: 700, color: '#7c3aed' }}>{n} người</span>
                    : <span style={{ color: '#d9d9d9' }}>—</span>
                } },
              { title: 'Số ca dự kiến', key: 'soCaDuKien', align: 'right', width: 110,
                render: (_, r) => {
                  const stage = resolveStage(r)
                  const nsPc = Number(productMap[r.maSp]?.nangSuatPc || 0)
                  const nsPl = Number(productMap[r.maSp]?.nangSuatPl || 0)
                  const cl   = Number(r.coLo || 0)
                  const congTH = stage === 'PL'
                    ? (nsPl && cl ? cl / nsPl : 0)
                    : (nsPc && cl ? cl / nsPc : 0)
                  const soNguoi = stage === 'PL'   ? Number(r.congPl   || 0)
                                : stage === 'BBC1' ? Number(r.congBbc1 || 0)
                                : stage === 'DG'   ? Number(r.congDg   || 0)
                                : stage === 'CC'   ? Number(r.congCc   || 0)
                                :                   Number(r.congPc   || 0)
                  if (!congTH || !soNguoi) return <span style={{ color: '#d9d9d9' }}>—</span>
                  const v = (congTH / soNguoi).toFixed(2)
                  return <span style={{ color: '#b45309', fontWeight: 700 }}>{v} ca</span>
                } },
              { title: 'Tình trạng', dataIndex: 'tinhTrang', width: 90, align: 'center',
                render: v => {
                  const cfg = {
                    done:    { color: '#52c41a', label: 'Xong' },
                    doing:   { color: '#1677ff', label: 'Đang' },
                    gap:     { color: '#fa8c16', label: 'Gấp'  },
                    rat_gap: { color: '#f5222d', label: 'Rất gấp' },
                  }[v] || { color: '#aaa', label: v || '—' }
                  return <Tag color={cfg.color} style={{ marginRight: 0, fontWeight: 600 }}>{cfg.label}</Tag>
                } },
            ]}
            summary={() => (
              <Table.Summary.Row style={{ fontWeight: 700, background: '#f0f5ff' }}>
                <Table.Summary.Cell index={0} colSpan={6}>Tổng ({filteredRaw.length} kế hoạch)</Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <span style={{ color: '#1e5fa3' }}>{fmtSL(grandSLAll)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} colSpan={8} />
              </Table.Summary.Row>
            )}
          />
        </div>
      ),
    },
    {
      key: 'lichmay',
      label: 'Lịch Máy',
      children: (
        <div style={{ padding: '12px 0' }}>
          <Table
            size="small"
            dataSource={machineSchedule.rows}
            rowKey="machine"
            pagination={false}
            bordered
            scroll={{ x: 'max-content' }}
            columns={[
              {
                title: 'Máy thực hiện',
                dataIndex: 'machine',
                width: 180,
                fixed: 'left',
                render: v => (
                  <span style={{ fontWeight: 700, fontSize: 12, color: '#0f4c81' }}>{v}</span>
                ),
              },
              ...machineSchedule.dates.map(date => {
                const dow = ['CN','T2','T3','T4','T5','T6','T7'][dayjs(date).day()]
                const isWeekend = dayjs(date).day() === 0 || dayjs(date).day() === 6
                return {
                  key: date,
                  title: (
                    <div style={{ textAlign: 'center', minWidth: 130 }}>
                      <div style={{ fontWeight: 700, color: isWeekend ? '#ef4444' : '#1677ff', fontSize: 12 }}>
                        {dayjs(date).format('DD/MM')}
                      </div>
                      <div style={{ fontSize: 10, color: isWeekend ? '#ef4444' : '#6b7280' }}>{dow}</div>
                    </div>
                  ),
                  dataIndex: date,
                  width: 160,
                  onHeaderCell: () => ({
                    style: { background: isWeekend ? '#fff7f7' : undefined, padding: '4px 8px' },
                  }),
                  onCell: () => ({
                    style: { background: isWeekend ? '#fff7f7' : undefined, verticalAlign: 'top', padding: '4px 6px' },
                  }),
                  render: records => {
                    if (!records?.length) return <span style={{ color: '#d9d9d9' }}>—</span>
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {records.map(r => {
                          const cl       = Number(r.coLo || 0)
                          const nsPc     = Number(productMap[r.maSp]?.nangSuatPc || 0)
                          const soNguoi  = Number(r.congPc || 0)
                          const congTH   = nsPc && cl ? cl / nsPc : 0
                          const soCa     = congTH && soNguoi ? congTH / soNguoi : 0
                          return (
                            <Tooltip
                              key={r.id}
                              title={`${r.tenTrinh || r.maBravo} — Lô ${r.soLo} — ${cl.toLocaleString('vi-VN')} SP`}
                            >
                              <div style={{
                                background: '#1d4ed8',
                                borderLeft: '3px solid rgba(255,255,255,0.4)',
                                borderRadius: '0 4px 4px 0',
                                padding: '4px 6px',
                                fontSize: 11,
                                cursor: 'default',
                                overflow: 'hidden',
                              }}>
                                <div style={{
                                  fontWeight: 700, color: '#ffffff',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  {r.tenTrinh || r.maBravo || '—'}
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>
                                  Lô {r.soLo || '—'} · <span style={{ fontWeight: 600, color: '#ffffff' }}>{cl.toLocaleString('vi-VN')} SP</span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 8px', marginTop: 3, fontSize: 10 }}>
                                  {soNguoi > 0 && (
                                    <span style={{ color: '#ffffff', fontWeight: 700 }}>👤 {soNguoi} người</span>
                                  )}
                                  {congTH > 0 && (
                                    <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>⏱ {congTH.toFixed(2)} công</span>
                                  )}
                                  {soCa > 0 && (
                                    <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>🔄 {soCa.toFixed(2)} ca</span>
                                  )}
                                </div>
                              </div>
                            </Tooltip>
                          )
                        })}
                      </div>
                    )
                  },
                }
              }),
            ]}
            summary={() => (
              <Table.Summary.Row style={{ background: '#f0f5ff' }}>
                <Table.Summary.Cell index={0} style={{ fontWeight: 700, color: '#0f4c81', fontSize: 12, position: 'sticky', left: 0, zIndex: 2, background: '#e8f0fe' }}>
                  Tổng người
                </Table.Summary.Cell>
                {machineSchedule.dates.map((date, i) => {
                  const total = machineSchedule.rows.reduce((sum, row) =>
                    sum + (row[date] || []).reduce((s, r) => s + Number(r.congPc || 0), 0), 0)
                  return (
                    <Table.Summary.Cell key={date} index={i + 1} align="center">
                      {total > 0
                        ? <span style={{ color: '#7c3aed', fontWeight: 700 }}>👤 {total}</span>
                        : <span style={{ color: '#d9d9d9' }}>—</span>}
                    </Table.Summary.Cell>
                  )
                })}
              </Table.Summary.Row>
            )}
          />
        </div>
      ),
    },
  ]

  const toLabel = selectedTo ? (TO_DISPLAY[selectedTo] || selectedTo) : 'Tất cả'

  return (
    <Spin spinning={loading}>
      {/* ── Sticky header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 9,
        background: 'linear-gradient(135deg, #0f4c81 0%, #1976d2 100%)',
        borderBottom: '3px solid #0d3d6e',
        boxShadow: '0 3px 12px rgba(15,76,129,0.35)',
        padding: '9px 16px',
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: '#fff', whiteSpace: 'nowrap' }}>
          <BarChartOutlined style={{ marginRight: 6 }} />Phân Tích Kế Hoạch
          {selectedTo && (
            <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 600, color: '#bfdbfe' }}>
              — {toLabel}
            </span>
          )}
        </span>
        {/* Preset buttons */}
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
        {[{ key: 'last_week', label: 'Tuần trước' }, { key: 'this_week', label: 'Tuần này' }, { key: 'next_week', label: 'Tuần sau' }].map(p => (
          <Button key={p.key} size="small"
            onClick={() => applyPreset(p.key)}
            style={{
              fontWeight: 600, fontSize: 12,
              background: activePreset === p.key ? '#fff' : 'rgba(255,255,255,0.12)',
              borderColor: activePreset === p.key ? '#fff' : 'rgba(255,255,255,0.4)',
              color: activePreset === p.key ? '#1e5fa3' : '#fff',
            }}>{p.label}</Button>
        ))}
        {/* Picker mode */}
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
        {[{ key: 'month', label: 'Tháng' }, { key: 'range', label: 'Khoảng' }].map(m => (
          <Button key={m.key} size="small"
            onClick={() => { setPickerMode(m.key); setActivePreset(null) }}
            style={{
              fontWeight: 600, fontSize: 12,
              background: pickerMode === m.key && !activePreset ? '#fff' : 'rgba(255,255,255,0.12)',
              borderColor: pickerMode === m.key && !activePreset ? '#fff' : 'rgba(255,255,255,0.4)',
              color: pickerMode === m.key && !activePreset ? '#1e5fa3' : '#fff',
            }}>{m.label}</Button>
        ))}
        {/* Dynamic picker */}
        {pickerMode === 'month' && (
          <DatePicker size="small" picker="month" format="MM/YYYY"
            value={dateRange?.[0]}
            onChange={handleMonthChange}
            placeholder="Chọn tháng"
            style={{ width: 120 }}
          />
        )}
        {pickerMode === 'range' && (
          <RangePicker size="small" value={dateRange} onChange={v => { setDateRange(v); setActivePreset(null) }}
            format="DD/MM/YYYY" allowClear placeholder={['Từ ngày', 'Đến ngày']}
          />
        )}
        <Button size="small" type="primary" icon={<SearchOutlined />}
          style={{ background: '#0891b2', borderColor: '#0891b2', fontWeight: 600 }}
          loading={loading}
          onClick={() => fetchData()}>
          Truy xuất
        </Button>
        <Button size="small" icon={<ReloadOutlined />}
          onClick={() => {
            const def = thisWeekRange()
            setActivePreset('this_week')
            setPickerMode('range')
            setDateRange(def)
            fetchData(def)
          }}
          style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: '#bfdbfe', fontSize: 12 }}>
            Kế hoạch: <strong style={{ color: '#fff' }}>{filteredRaw.length}</strong>
          </span>
          <span style={{ color: '#bfdbfe', fontSize: 12 }}>
            Tổng SL: <strong style={{ color: '#fff' }}>{fmtSL(grandSLAll)}</strong>
          </span>
          <span style={{ color: '#bfdbfe', fontSize: 12 }}>
            SP/lô: <strong style={{ color: '#fff' }}>{groupedData.length}</strong>
          </span>
        </div>
      </div>

      {/* ── Stats cards ── */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 10, marginBottom: 14,
        }}>
          {[
            { label: 'Số SP / lô kế hoạch', value: filteredRaw.length,     color: '#1d4ed8' },
            { label: 'Tổng SL kế hoạch',    value: fmtSL(grandSLAll),      color: '#1e5fa3' },
            { label: 'Số loại sản phẩm',     value: groupedData.length,     color: '#6d28d9' },
            { label: 'SL TB / kế hoạch',
              value: filteredRaw.length > 0
                ? Math.round(grandSLAll / filteredRaw.length).toLocaleString('vi-VN')
                : '—',
              color: '#0e7490' },
          ].map(c => (
            <div key={c.label} style={{
              background: '#f8f9fa', borderLeft: `4px solid ${c.color}`,
              padding: '10px 14px', borderRadius: 4,
            }}>
              <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>
                {c.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        <style>{`
          .ptkh-tabs .ant-tabs-tab {
            background: #f1f5f9 !important;
            border-radius: 6px 6px 0 0 !important;
            margin-right: 4px !important;
            padding: 6px 18px !important;
            transition: all .15s;
          }
          .ptkh-tabs .ant-tabs-tab .ant-tabs-tab-btn {
            color: #374151 !important;
            font-weight: 600 !important;
          }
          .ptkh-tabs .ant-tabs-tab:hover {
            background: #dbeafe !important;
            color: #1e5fa3 !important;
          }
          .ptkh-tabs .ant-tabs-tab:hover .ant-tabs-tab-btn {
            color: #1e5fa3 !important;
          }
          .ptkh-tabs .ant-tabs-tab-active {
            background: #1e5fa3 !important;
          }
          .ptkh-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
            color: #fff !important;
            font-weight: 700 !important;
          }
          .ptkh-tabs .ant-tabs-ink-bar { display: none !important; }
          .ptkh-tabs .ant-tabs-nav::before { border-color: #1e5fa3 !important; }
        `}</style>
        <Tabs
          className="ptkh-tabs"
          activeKey={subTab}
          onChange={setSubTab}
          size="small"
          items={subTabItems}
          tabBarStyle={{ marginBottom: 0 }}
        />
      </div>
    </Spin>
  )
}
