import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { DatePicker, Button, Spin, message, Tabs, Table, Tag, Tooltip, Modal, Switch } from 'antd'
import { SearchOutlined, ReloadOutlined, BarChartOutlined, SettingOutlined, PlusOutlined, DeleteOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RcTooltip, Legend,
  ResponsiveContainer, LabelList, Cell,
} from 'recharts'
import { useLocation } from 'react-router-dom'
import api from '../api/axios'
import PhongThucHienSelect from '../components/PhongThucHienSelect'

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
const MACHINES_PL_DEFAULT = [
  'Máy Chiết 4 Vòi Bơm Từ',
  'Máy Chiết Bánh Răng',
  'Máy Chiết Bắng Răng',
  'Máy Chiết Tube Hàn Nhiệt',
  'Máy Chiết Tube Hàn Seal',
  'Máy Dập 1 Vòi',
  'Máy Chiết 4 Vòi Bơm Khí',
]
const LS_MACHINE_KEY = 'ptkh_pl_machine_config'

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

  const [machineConfig, setMachineConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_MACHINE_KEY)) || { hidden: [], custom: [] } }
    catch { return { hidden: [], custom: [] } }
  })
  const [machineModalOpen, setMachineModalOpen] = useState(false)
  const [newMachineName, setNewMachineName] = useState('')

  const saveMachineConfig = cfg => {
    setMachineConfig(cfg)
    localStorage.setItem(LS_MACHINE_KEY, JSON.stringify(cfg))
  }
  const toggleMachineHidden = (name, hide) => {
    const hidden = hide ? [...machineConfig.hidden, name] : machineConfig.hidden.filter(m => m !== name)
    saveMachineConfig({ ...machineConfig, hidden })
  }
  const addMachine = () => {
    const name = newMachineName.trim()
    if (!name) return
    const all = [...MACHINES_PL_DEFAULT, ...machineConfig.custom]
    if (all.includes(name)) { message.warning('Máy đã tồn tại'); return }
    saveMachineConfig({ ...machineConfig, custom: [...machineConfig.custom, name] })
    setNewMachineName('')
  }
  const removeMachine = name => {
    saveMachineConfig({
      hidden: machineConfig.hidden.filter(m => m !== name),
      custom: machineConfig.custom.filter(m => m !== name),
    })
  }

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

  const fetchData = useCallback(async (range = dateRange, { silent = false } = {}) => {
    if (!silent) setLoading(true)
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
    } catch { if (!silent) message.error('Không thể tải dữ liệu phân tích kế hoạch') }
    finally { if (!silent) setLoading(false) }
  }, [dateRange])

  useEffect(() => { fetchData() }, []) // eslint-disable-line

  // Tự cập nhật theo nhịp chung của app (giống bảng Kế hoạch) — khi Kế hoạch thay đổi,
  // Phân tích kế hoạch (cùng nguồn /work-schedule?source=PLAN) sẽ đồng bộ trong vòng 2s, không chớp loading
  useEffect(() => {
    const handler = () => fetchData(undefined, { silent: true })
    window.addEventListener('app:silent-refresh', handler)
    return () => window.removeEventListener('app:silent-refresh', handler)
  }, [fetchData])

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
    const isPL = selectedTo === 'PL' || selectedTo === 'PCPL3'
    const stageKey = isPL ? 'PL' : 'PCPL2'
    const records = filteredRaw.filter(r => resolveStage(r) === stageKey)
    const dates = [...new Set(records.map(r => r.ngayThucHien).filter(Boolean))].sort()
    const allMachines = isPL
      ? [...MACHINES_PL_DEFAULT, ...machineConfig.custom]
      : [...MACHINES_PCPL2]
    const visibleMachines = allMachines.filter(m => !machineConfig.hidden.includes(m))
    const rows = visibleMachines.map(machine => {
      const row = { machine }
      dates.forEach(date => {
        row[date] = records.filter(r => r.ngayThucHien === date && (r.phongThucHien || '') === machine)
      })
      return row
    })
    return { dates, rows, allMachines, visibleMachines, isPL }
  }, [filteredRaw, machineConfig, selectedTo])

  const totalCongPc = useMemo(() =>
    dedupedByLo.reduce((s, r) => {
      const ns = Number(productMap[r.maSp]?.nangSuatPc || 0)
      const cl = Number(r.coLo || 0)
      return s + (ns && cl ? cl / ns : 0)
    }, 0),
  [dedupedByLo, productMap])

  const totalCongPl = useMemo(() =>
    dedupedByLo.reduce((s, r) => {
      const ns = Number(productMap[r.maSp]?.nangSuatPl || 0)
      const cl = Number(r.coLo || 0)
      return s + (ns && cl ? cl / ns : 0)
    }, 0),
  [dedupedByLo, productMap])

  const peakDay = useMemo(() =>
    timeData.reduce((best, d) => {
      const tot = STAGES.reduce((s, st) => s + (d[st.key] || 0), 0)
      return (!best || tot > best.total) ? { date: d.date, total: tot } : best
    }, null),
  [timeData])

  const machineLoadData = useMemo(() =>
    machineSchedule.rows.map(row => {
      const daysUsed     = machineSchedule.dates.filter(d => row[d]?.length > 0).length
      const totalBatches = machineSchedule.dates.reduce((s, d) => s + (row[d]?.length || 0), 0)
      const totalSL      = machineSchedule.dates.reduce((s, d) =>
        s + (row[d] || []).reduce((ss, r) => ss + Number(r.coLo || 0), 0), 0)
      const totalCong    = machineSchedule.dates.reduce((s, d) =>
        s + (row[d] || []).reduce((ss, r) => {
          const ns = Number(productMap[r.maSp]?.nangSuatPc || 0)
          const cl = Number(r.coLo || 0)
          return ss + (ns && cl ? cl / ns : 0)
        }, 0), 0)
      return { machine: row.machine, daysUsed, totalBatches, totalSL, totalCong }
    }).filter(m => m.totalBatches > 0),
  [machineSchedule, productMap])

  const busiestMachine = useMemo(() =>
    [...machineLoadData].sort((a, b) => b.totalBatches - a.totalBatches)[0] || null,
  [machineLoadData])

  const activeStages = useMemo(() =>
    STAGES.filter(s => stageStats.some(ss => ss.key === s.key)),
  [stageStats])

  const avgBatchSize = useMemo(() =>
    dedupedByLo.length > 0 ? Math.round(grandSLAll / dedupedByLo.length) : 0,
  [dedupedByLo, grandSLAll])

  // ── Danh sách đơn hàng phân tích ─────────────────────────────────────────────
  const orderListData = useMemo(() => {
    const map = {}
    dedupedByLo.forEach(r => {
      const key = r.maDonHang ? r.maDonHang : `__${r.maBravo}|${r.soLo || r.id}`
      if (!map[key]) {
        map[key] = {
          key, maDonHang: r.maDonHang || null,
          maBravo: r.maBravo, tenTrinh: r.tenTrinh,
          records: [], soLoSet: new Set(), soLoSLMap: new Map(), stageSet: new Set(),
          doneCount: 0, doingCount: 0, pendingCount: 0, gapCount: 0, ratGapCount: 0,
          congPc: 0, congPl: 0, ngayMin: null, ngayMax: null,
        }
      }
      const e = map[key]
      e.records.push(r)
      if (r.soLo) {
        e.soLoSet.add(r.soLo)
        if (!e.soLoSLMap.has(r.soLo)) e.soLoSLMap.set(r.soLo, Number(r.coLo || 0))
      }
      e.stageSet.add(resolveStage(r))
      const tt = r.tinhTrang || 'pending'
      if (tt === 'done') e.doneCount++
      else if (tt === 'doing') e.doingCount++
      else if (tt === 'gap') e.gapCount++
      else if (tt === 'rat_gap') e.ratGapCount++
      else e.pendingCount++
      const nsPc = Number(productMap[r.maSp]?.nangSuatPc || 0)
      const nsPl = Number(productMap[r.maSp]?.nangSuatPl || 0)
      const cl   = Number(r.coLo || 0)
      if (nsPc && cl) e.congPc += cl / nsPc
      if (nsPl && cl) e.congPl += cl / nsPl
      if (r.ngayThucHien) {
        if (!e.ngayMin || r.ngayThucHien < e.ngayMin) e.ngayMin = r.ngayThucHien
        if (!e.ngayMax || r.ngayThucHien > e.ngayMax) e.ngayMax = r.ngayThucHien
      }
    })
    return Object.values(map).map(e => {
      const total = e.records.length
      const slValues = [...e.soLoSLMap.values()]
      const totalSL  = slValues.length > 0
        ? slValues.reduce((s, v) => s + v, 0)
        : e.records.reduce((s, r) => s + Number(r.coLo || 0), 0)
      const ttPriority = e.ratGapCount > 0 ? 'rat_gap'
        : e.gapCount > 0 ? 'gap'
        : e.doingCount > 0 ? 'doing'
        : e.doneCount === total && total > 0 ? 'done'
        : 'pending'
      return {
        key: e.key, maDonHang: e.maDonHang, maBravo: e.maBravo, tenTrinh: e.tenTrinh,
        soLoCount: e.soLoSet.size || 1, stages: [...e.stageSet], totalSL,
        totalStages: total,
        doneCount: e.doneCount, doingCount: e.doingCount,
        gapCount: e.gapCount, ratGapCount: e.ratGapCount,
        congPc: e.congPc, congPl: e.congPl,
        ngayMin: e.ngayMin, ngayMax: e.ngayMax, ttPriority,
        pctDone: total > 0 ? e.doneCount / total * 100 : 0,
        soNgay: (e.ngayMin && e.ngayMax && e.ngayMin !== e.ngayMax)
          ? dayjs(e.ngayMax).diff(dayjs(e.ngayMin), 'day') + 1 : 1,
      }
    }).sort((a, b) => {
      const pri = { rat_gap: 0, gap: 1, doing: 2, pending: 3, done: 4 }
      const pa = pri[a.ttPriority] ?? 3
      const pb = pri[b.ttPriority] ?? 3
      if (pa !== pb) return pa - pb
      return b.totalSL - a.totalSL
    })
  }, [dedupedByLo, productMap])

  // ── Sub-tabs ─────────────────────────────────────────────────────────────────
  const subTabItems = [
    {
      key: 'tonghop',
      label: 'Tổng Hợp',
      children: (
        <div style={{ padding: '12px 0' }}>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Số lô kế hoạch',   value: dedupedByLo.length,                              unit: 'lô',      color: '#1d4ed8' },
              { label: 'Tổng SL kế hoạch', value: fmtSL(grandSLAll),                               unit: 'SP',      color: '#1e5fa3' },
              { label: 'SL trung bình/lô', value: avgBatchSize > 0 ? fmtSL(avgBatchSize) : '—',    unit: 'SP / lô', color: '#0891b2' },
              { label: 'Số ngày sản xuất', value: timeData.length,                                  unit: 'ngày',    color: '#7c3aed' },
              { label: 'Số loại sản phẩm', value: loaiSpData.length,                                unit: 'loại SP', color: '#6d28d9' },
              { label: 'Công PC dự kiến',  value: totalCongPc > 0 ? totalCongPc.toFixed(1) : '—',  unit: 'công',    color: '#0369a1' },
            ].map(c => (
              <div key={c.label} style={{
                background: '#fff', border: '1px solid #e5e7eb',
                borderLeft: `4px solid ${c.color}`, borderRadius: 6,
                padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: c.color, lineHeight: 1.1 }}>{c.value}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{c.unit}</div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14, marginBottom: 14 }}>
            <div style={{ background: '#f8f9fa', borderRadius: 6, padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1f2937', marginBottom: 10 }}>Phân bổ SL theo ngày</div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={timeData} margin={{ top: 5, right: 20, left: 5, bottom: 35 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-40} textAnchor="end" interval={0}
                    tickFormatter={v => dayjs(v).format('DD/MM')} />
                  <YAxis tickFormatter={v => v.toLocaleString('vi-VN')} tick={{ fontSize: 10 }} width={65} />
                  <RcTooltip formatter={v => [v.toLocaleString('vi-VN'), 'SL KH']}
                    labelFormatter={v => dayjs(v).format('DD/MM/YYYY')} />
                  {activeStages.length === 1
                    ? (
                      <Bar dataKey={activeStages[0].key} fill={activeStages[0].color} radius={[3, 3, 0, 0]}>
                        <LabelList dataKey={activeStages[0].key} position="top"
                          formatter={v => v > 0 ? v.toLocaleString('vi-VN') : ''}
                          style={{ fontSize: 9, fill: '#444' }} />
                      </Bar>
                    ) : (
                      <>
                        {activeStages.map(s => (
                          <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} />
                        ))}
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </>
                    )
                  }
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: '#f8f9fa', borderRadius: 6, padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1f2937', marginBottom: 12 }}>
                Cơ cấu theo loại SP
                <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 11, marginLeft: 6 }}>({loaiSpData.length} loại)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {loaiSpData.slice(0, 7).map(r => (
                  <div key={r.loai} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 100, fontSize: 11, color: '#374151', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.loai}>{r.loai}</div>
                    <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 3, height: 18, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.max(2, r.tyLe)}%`, height: '100%', background: colorOf(r.loai), borderRadius: 3, display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
                        <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>{r.tyLe.toFixed(1)}%</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: '#6b7280', minWidth: 60, textAlign: 'right' }}>{fmtSL(r.sl)}</span>
                  </div>
                ))}
                {loaiSpData.length > 7 && (
                  <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', fontStyle: 'italic' }}>
                    + {loaiSpData.length - 7} loại khác
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Analysis tables */}
          <div style={{ display: 'grid', gridTemplateColumns: machineLoadData.length > 0 ? '1fr 1fr' : '1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1f2937', marginBottom: 8 }}>Phân tích theo loại sản phẩm</div>
              <Table size="small" dataSource={loaiSpData} rowKey="loai" pagination={false}
                columns={[
                  { title: 'Loại SP', dataIndex: 'loai', ellipsis: true,
                    render: v => <span style={{ fontWeight: 600, fontSize: 12, color: colorOf(v) }}>{v}</span> },
                  { title: 'Số lô', dataIndex: 'soTp', align: 'center', width: 65,
                    render: v => <strong>{v}</strong> },
                  { title: 'Tổng SL', dataIndex: 'sl', align: 'right', width: 110, sorter: (a, b) => a.sl - b.sl,
                    render: (v, r) => <span style={{ fontWeight: 700, color: colorOf(r.loai) }}>{fmtSL(v)}</span> },
                  { title: '%', dataIndex: 'tyLe', align: 'right', width: 60,
                    render: v => `${v.toFixed(1)}%` },
                ]}
                summary={() => (
                  <Table.Summary.Row style={{ fontWeight: 700, background: '#f0f9ff' }}>
                    <Table.Summary.Cell index={0}>TỔNG</Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="center">{loaiSpData.reduce((s, r) => s + r.soTp, 0)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right"><span style={{ color: '#1e5fa3' }}>{fmtSL(grandSLAll)}</span></Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">100%</Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </div>
            {machineLoadData.length > 0 && (
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1f2937', marginBottom: 8 }}>Tình trạng sử dụng máy</div>
                <Table size="small" dataSource={machineLoadData} rowKey="machine" pagination={false}
                  columns={[
                    { title: 'Máy thực hiện', dataIndex: 'machine', ellipsis: true, width: 150,
                      render: v => <span style={{ fontWeight: 600, fontSize: 11, color: '#000077' }}>{v}</span> },
                    { title: 'Số ngày', dataIndex: 'daysUsed', align: 'center', width: 70,
                      sorter: (a, b) => a.daysUsed - b.daysUsed,
                      render: v => <Tag color="geekblue" style={{ marginRight: 0, fontWeight: 700 }}>{v}</Tag> },
                    { title: 'Số lô', dataIndex: 'totalBatches', align: 'center', width: 60,
                      sorter: (a, b) => a.totalBatches - b.totalBatches,
                      render: v => <strong>{v}</strong> },
                    { title: 'Tổng SL', dataIndex: 'totalSL', align: 'right',
                      sorter: (a, b) => a.totalSL - b.totalSL,
                      render: v => <span style={{ fontWeight: 700, color: '#009999' }}>{fmtSL(v)}</span> },
                    { title: 'Công DK', dataIndex: 'totalCong', align: 'right', width: 85,
                      render: v => v > 0
                        ? <span style={{ color: '#7c3aed', fontWeight: 700 }}>{v.toFixed(1)}</span>
                        : <span style={{ color: '#d9d9d9' }}>—</span> },
                  ]}
                  summary={() => {
                    const totBatches = machineLoadData.reduce((s, r) => s + r.totalBatches, 0)
                    const totSL      = machineLoadData.reduce((s, r) => s + r.totalSL, 0)
                    const totCong    = machineLoadData.reduce((s, r) => s + r.totalCong, 0)
                    return (
                      <Table.Summary.Row style={{ fontWeight: 700, background: '#f0f5ff' }}>
                        <Table.Summary.Cell index={0}>{machineLoadData.length} máy</Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="center">{machineSchedule.dates.length} ngày</Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="center">{totBatches}</Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="right"><span style={{ color: '#1e5fa3' }}>{fmtSL(totSL)}</span></Table.Summary.Cell>
                        <Table.Summary.Cell index={4} align="right">
                          <span style={{ color: '#7c3aed' }}>{totCong > 0 ? totCong.toFixed(1) : '—'}</span>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    )
                  }}
                />
              </div>
            )}
          </div>

          {/* Highlights */}
          {dedupedByLo.length > 0 && (
            <div style={{ background: '#f8f9fa', borderRadius: 6, padding: 12, border: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Điểm nổi bật</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {peakDay && (
                  <div style={{ background: '#eff6ff', borderRadius: 6, padding: '10px 14px', minWidth: 150 }}>
                    <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Ngày cao điểm</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1d4ed8' }}>{dayjs(peakDay.date).format('DD/MM/YYYY')}</div>
                    <div style={{ fontSize: 11, color: '#60a5fa', marginTop: 2 }}>{fmtSL(peakDay.total)} SP</div>
                  </div>
                )}
                {loaiSpData[0] && (
                  <div style={{ background: '#faf5ff', borderRadius: 6, padding: '10px 14px', minWidth: 170 }}>
                    <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Loại SP nhiều nhất</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#7c3aed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{loaiSpData[0].loai}</div>
                    <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 2 }}>{loaiSpData[0].tyLe.toFixed(1)}% · {fmtSL(loaiSpData[0].sl)} SP</div>
                  </div>
                )}
                {busiestMachine && (
                  <div style={{ background: '#f0fdfa', borderRadius: 6, padding: '10px 14px', minWidth: 170 }}>
                    <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Máy bận nhất</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0e7490', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{busiestMachine.machine}</div>
                    <div style={{ fontSize: 11, color: '#22d3ee', marginTop: 2 }}>{busiestMachine.totalBatches} lô · {fmtSL(busiestMachine.totalSL)} SP</div>
                  </div>
                )}
                {totalCongPc > 0 && (
                  <div style={{ background: '#f0f9ff', borderRadius: 6, padding: '10px 14px', minWidth: 150 }}>
                    <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Công PC dự kiến</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0369a1' }}>{totalCongPc.toFixed(1)} công</div>
                    {timeData.length > 0 && (
                      <div style={{ fontSize: 11, color: '#7dd3fc', marginTop: 2 }}>TB {(totalCongPc / timeData.length).toFixed(1)} công / ngày</div>
                    )}
                  </div>
                )}
                {totalCongPl > 0 && (
                  <div style={{ background: '#ecfdf5', borderRadius: 6, padding: '10px 14px', minWidth: 150 }}>
                    <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Công PL dự kiến</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0e7490' }}>{totalCongPl.toFixed(1)} công</div>
                    {timeData.length > 0 && (
                      <div style={{ fontSize: 11, color: '#6ee7b7', marginTop: 2 }}>TB {(totalCongPl / timeData.length).toFixed(1)} công / ngày</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
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
      key: 'donhang',
      label: 'Danh Sách ĐH',
      children: (() => {
        const ttCfg = {
          rat_gap: { color: '#f5222d', bg: '#fff1f0', label: 'Rất gấp' },
          gap:     { color: '#fa8c16', bg: '#fff7e6', label: 'Gấp' },
          doing:   { color: '#1677ff', bg: '#e6f4ff', label: 'Đang SX' },
          done:    { color: '#52c41a', bg: '#f6ffed', label: 'Done' },
          pending: { color: '#9ca3af', bg: '#f9fafb', label: 'Chờ' },
        }
        const kpiCards = [
          { label: 'Tổng đơn hàng',   value: orderListData.length,                                                         unit: 'đơn',  color: '#1d4ed8' },
          { label: 'Rất gấp / Gấp',   value: orderListData.filter(r => r.ttPriority === 'rat_gap' || r.ttPriority === 'gap').length, unit: 'đơn', color: '#f5222d' },
          { label: 'Đang sản xuất',   value: orderListData.filter(r => r.ttPriority === 'doing').length,                   unit: 'đơn',  color: '#1677ff' },
          { label: 'Chưa bắt đầu',    value: orderListData.filter(r => r.ttPriority === 'pending').length,                 unit: 'đơn',  color: '#6b7280' },
          { label: 'Đã hoàn thành',   value: orderListData.filter(r => r.ttPriority === 'done').length,                    unit: 'đơn',  color: '#52c41a' },
          { label: 'Tổng SL kế hoạch',value: fmtSL(orderListData.reduce((s, r) => s + r.totalSL, 0)),                     unit: 'SP',   color: '#0369a1' },
        ]
        const orderColumns = [
          { title: '#', key: 'stt', width: 40, align: 'center', fixed: 'left',
            render: (_, __, i) => <span style={{ fontSize: 11, color: '#94a3b8' }}>{i + 1}</span> },
          { title: 'Mã ĐH', dataIndex: 'maDonHang', width: 105, fixed: 'left',
            render: v => v
              ? <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed', fontSize: 12 }}>{v}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span> },
          { title: 'Mã Bravo', dataIndex: 'maBravo', width: 100, fixed: 'left',
            render: v => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#374151', fontSize: 11 }}>{v || '—'}</span> },
          { title: 'Tên sản phẩm', dataIndex: 'tenTrinh', width: 210, fixed: 'left', ellipsis: true,
            render: v => <Tooltip title={v}><span style={{ fontSize: 12 }}>{v || '—'}</span></Tooltip> },
          { title: 'Số lô', dataIndex: 'soLoCount', align: 'center', width: 65,
            sorter: (a, b) => a.soLoCount - b.soLoCount,
            render: v => <Tag color="geekblue" style={{ fontWeight: 700, marginRight: 0 }}>{v}</Tag> },
          { title: 'Tổng SL KH', dataIndex: 'totalSL', align: 'right', width: 115,
            sorter: (a, b) => a.totalSL - b.totalSL,
            render: v => <span style={{ fontWeight: 700, color: '#1e5fa3' }}>{fmtSL(v)}</span> },
          { title: 'Ngày KH', key: 'ngayKh', width: 150, align: 'center',
            render: (_, r) => {
              if (!r.ngayMin) return <span style={{ color: '#d9d9d9' }}>—</span>
              if (r.ngayMin === r.ngayMax)
                return <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{dayjs(r.ngayMin).format('DD/MM/YYYY')}</span>
              return <span style={{ fontSize: 11, color: '#374151' }}>{dayjs(r.ngayMin).format('DD/MM')} → {dayjs(r.ngayMax).format('DD/MM')}</span>
            } },
          { title: 'Số ngày', dataIndex: 'soNgay', align: 'center', width: 70,
            sorter: (a, b) => a.soNgay - b.soNgay,
            render: v => <span style={{ color: '#6d28d9', fontWeight: 600 }}>{v}n</span> },
          { title: 'Tiến độ', key: 'tiendo', width: 150, align: 'left',
            sorter: (a, b) => a.pctDone - b.pctDone,
            render: (_, r) => {
              const pct = r.pctDone
              const barColor = pct >= 100 ? '#52c41a' : pct > 0 ? '#1677ff' : '#e5e7eb'
              return (
                <div style={{ minWidth: 130 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 10, color: '#6b7280' }}>
                    <span>{r.doneCount}/{r.totalStages} công đoạn</span>
                    <span style={{ fontWeight: 700, color: barColor }}>{pct.toFixed(0)}%</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 4, height: 7, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: barColor, borderRadius: 4 }} />
                  </div>
                </div>
              )
            } },
          { title: 'Done', key: 'done', align: 'center', width: 58,
            sorter: (a, b) => a.doneCount - b.doneCount,
            render: (_, r) => r.doneCount > 0
              ? <Tag color="success" style={{ marginRight: 0, fontWeight: 700 }}>{r.doneCount}</Tag>
              : <span style={{ color: '#d9d9d9' }}>—</span> },
          { title: 'Đang', key: 'dang', align: 'center', width: 58,
            render: (_, r) => r.doingCount > 0
              ? <Tag color="processing" style={{ marginRight: 0, fontWeight: 700 }}>{r.doingCount}</Tag>
              : <span style={{ color: '#d9d9d9' }}>—</span> },
          { title: 'Gấp', key: 'gap', align: 'center', width: 58,
            render: (_, r) => {
              const n = r.gapCount + r.ratGapCount
              return n > 0
                ? <Tag color="error" style={{ marginRight: 0, fontWeight: 700 }}>{n}</Tag>
                : <span style={{ color: '#d9d9d9' }}>—</span>
            } },
          { title: 'Công đoạn', key: 'stages', width: 145,
            render: (_, r) => (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {r.stages.map(s => {
                  const st = STAGES.find(x => x.key === s)
                  return (
                    <Tag key={s} style={{
                      marginRight: 0, fontSize: 10, fontWeight: 700, lineHeight: '18px',
                      background: (st?.color || '#888') + '18',
                      color: st?.color || '#888',
                      borderColor: (st?.color || '#888') + '55',
                    }}>{s}</Tag>
                  )
                })}
              </div>
            ) },
          { title: 'Tình trạng', key: 'tinhTrang', align: 'center', width: 100,
            sorter: (a, b) => {
              const pri = { rat_gap: 0, gap: 1, doing: 2, pending: 3, done: 4 }
              return (pri[a.ttPriority] ?? 3) - (pri[b.ttPriority] ?? 3)
            },
            render: (_, r) => {
              const c = ttCfg[r.ttPriority] || ttCfg.pending
              return (
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                  fontSize: 11, fontWeight: 700,
                  background: c.bg, color: c.color,
                  border: `1px solid ${c.color}40`,
                }}>{c.label}</span>
              )
            } },
          { title: 'Công PC', key: 'congPc', align: 'right', width: 82,
            sorter: (a, b) => a.congPc - b.congPc,
            render: (_, r) => r.congPc > 0
              ? <span style={{ color: '#0369a1', fontWeight: 700 }}>{r.congPc.toFixed(1)}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span> },
          { title: 'Công PL', key: 'congPl', align: 'right', width: 82,
            sorter: (a, b) => a.congPl - b.congPl,
            render: (_, r) => r.congPl > 0
              ? <span style={{ color: '#0e7490', fontWeight: 700 }}>{r.congPl.toFixed(1)}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span> },
        ]
        return (
          <div style={{ padding: '12px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
              {kpiCards.map(c => (
                <div key={c.label} style={{
                  background: '#fff', border: '1px solid #e5e7eb',
                  borderLeft: `4px solid ${c.color}`, borderRadius: 6,
                  padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                  <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>{c.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: c.color, lineHeight: 1.1 }}>{c.value}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{c.unit}</div>
                </div>
              ))}
            </div>
            <Table
              size="small"
              dataSource={orderListData}
              rowKey="key"
              scroll={{ x: 1480, y: 'calc(100vh - 420px)' }}
              pagination={{ pageSize: 25, showSizeChanger: true, showTotal: t => `${t} đơn hàng` }}
              rowClassName={r => r.ttPriority === 'rat_gap' ? 'row-rat-gap' : r.ttPriority === 'gap' ? 'row-gap' : ''}
              columns={orderColumns}
              summary={() => {
                const totSL  = orderListData.reduce((s, r) => s + r.totalSL, 0)
                const totLo  = orderListData.reduce((s, r) => s + r.soLoCount, 0)
                const totPc  = orderListData.reduce((s, r) => s + r.congPc, 0)
                const totPl  = orderListData.reduce((s, r) => s + r.congPl, 0)
                const totDone  = orderListData.reduce((s, r) => s + r.doneCount, 0)
                const totDoing = orderListData.reduce((s, r) => s + r.doingCount, 0)
                const totGap   = orderListData.reduce((s, r) => s + r.gapCount + r.ratGapCount, 0)
                return (
                  <Table.Summary.Row style={{ fontWeight: 700, background: '#f0f5ff', fontSize: 12 }}>
                    <Table.Summary.Cell index={0} colSpan={4}>TỔNG ({orderListData.length} đơn hàng)</Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="center"><strong style={{ color: '#1d4ed8' }}>{totLo}</strong></Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right"><span style={{ color: '#1e5fa3' }}>{fmtSL(totSL)}</span></Table.Summary.Cell>
                    <Table.Summary.Cell index={6} colSpan={2} />
                    <Table.Summary.Cell index={8} align="center" />
                    <Table.Summary.Cell index={9} align="center">
                      {totDone > 0 && <Tag color="success" style={{ marginRight: 0 }}>{totDone}</Tag>}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={10} align="center">
                      {totDoing > 0 && <Tag color="processing" style={{ marginRight: 0 }}>{totDoing}</Tag>}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={11} align="center">
                      {totGap > 0 && <Tag color="error" style={{ marginRight: 0 }}>{totGap}</Tag>}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={12} colSpan={2} />
                    <Table.Summary.Cell index={14} align="right">
                      <span style={{ color: '#0369a1' }}>{totPc > 0 ? totPc.toFixed(1) : '—'}</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={15} align="right">
                      <span style={{ color: '#0e7490' }}>{totPl > 0 ? totPl.toFixed(1) : '—'}</span>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )
              }}
            />
          </div>
        )
      })(),
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              {machineConfig.hidden.filter(m => machineSchedule.allMachines.includes(m)).length > 0 && (
                <span style={{ fontSize: 12, color: '#888' }}>
                  {machineConfig.hidden.filter(m => machineSchedule.allMachines.includes(m)).length} máy đang ẩn
                  {' · '}
                  <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }}
                    onClick={() => saveMachineConfig({
                      ...machineConfig,
                      hidden: machineConfig.hidden.filter(m => !machineSchedule.allMachines.includes(m)),
                    })}>
                    Hiện tất cả
                  </Button>
                </span>
              )}
            </div>
            <Button size="small" icon={<SettingOutlined />} onClick={() => setMachineModalOpen(true)}>
              Quản lý máy
            </Button>
          </div>
          <Modal
            title="Quản lý danh sách máy"
            open={machineModalOpen}
            onCancel={() => setMachineModalOpen(false)}
            footer={null}
            width={420}
          >
            <div style={{ marginBottom: 12, fontSize: 12, color: '#888' }}>Bật/tắt để ẩn hoặc hiện máy. Máy tự thêm có thể xóa.</div>
            {machineSchedule.allMachines.map(name => {
              const isCustom = machineConfig.custom.includes(name)
              const isVisible = !machineConfig.hidden.includes(name)
              return (
                <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ fontSize: 13, color: isVisible ? '#000077' : '#bbb' }}>{name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Switch size="small" checked={isVisible} onChange={checked => toggleMachineHidden(name, !checked)} />
                    {isCustom && (
                      <Button type="link" danger size="small" icon={<DeleteOutlined />}
                        style={{ padding: 0 }} onClick={() => removeMachine(name)} />
                    )}
                  </div>
                </div>
              )
            })}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <PhongThucHienSelect
                value={newMachineName || undefined}
                onChange={v => setNewMachineName(v || '')}
                size="small"
                placeholder="Chọn phòng thực hiện..."
                style={{ flex: 1 }}
              />
              <Button type="primary" icon={<PlusOutlined />} size="small" onClick={addMachine}>Thêm</Button>
            </div>
          </Modal>
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
                onHeaderCell: () => ({ style: { background: '#009999', color: '#ffffff' } }),
                render: v => (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 12, color: '#000077' }}>{v}</span>
                    <Tooltip title="Ẩn hàng này">
                      <Button
                        type="text"
                        size="small"
                        icon={<EyeInvisibleOutlined />}
                        style={{ color: '#bbb', flexShrink: 0, padding: '0 2px' }}
                        onClick={() => toggleMachineHidden(v, true)}
                      />
                    </Tooltip>
                  </div>
                ),
              },
              ...machineSchedule.dates.map(date => {
                const dow = ['CN','T2','T3','T4','T5','T6','T7'][dayjs(date).day()]
                const isWeekend = dayjs(date).day() === 0 || dayjs(date).day() === 6
                return {
                  key: date,
                  title: (
                    <div style={{ textAlign: 'center', width: 190 }}>
                      <div style={{ fontWeight: 700, color: '#ffffff', fontSize: 13 }}>
                        {dayjs(date).format('DD/MM')}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>{dow}</div>
                    </div>
                  ),
                  dataIndex: date,
                  width: 210,
                  onHeaderCell: () => ({
                    style: { background: isWeekend ? '#cc7700' : '#009999', padding: '6px 8px' },
                  }),
                  onCell: () => ({
                    style: { background: '#f8fafc', verticalAlign: 'top', padding: '5px 7px' },
                  }),
                  render: records => {
                    if (!records?.length) return <span style={{ color: '#cbd5e1', display: 'block', textAlign: 'center', fontSize: 16, lineHeight: '40px' }}>—</span>
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {records.map(r => {
                          const cl      = Number(r.coLo || 0)
                          const nsPc    = Number(productMap[r.maSp]?.nangSuatPc || 0)
                          const soNguoi = Number(r.congPc || 0)
                          const congTH  = nsPc && cl ? cl / nsPc : 0
                          const soCa    = congTH && soNguoi ? congTH / soNguoi : 0
                          return (
                            <div key={r.id} style={{
                              background: '#fff',
                              border: '1px solid #bfdbfe',
                              borderLeft: '4px solid #009999',
                              borderRadius: '0 7px 7px 0',
                              padding: '7px 9px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                            }}>
                              {/* Tên sản phẩm — tự xuống dòng */}
                              <div style={{
                                fontWeight: 700, color: '#1a3a6b', fontSize: 12,
                                lineHeight: 1.4, wordBreak: 'break-word',
                              }}>
                                {r.tenTrinh || r.maBravo || '—'}
                              </div>
                              {/* Lô + SL */}
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, marginBottom: 6 }}>
                                Lô <b style={{ color: '#1e5fa3' }}>{r.soLo || '—'}</b>
                                {' · '}
                                <b style={{ color: '#0369a1' }}>{cl.toLocaleString('vi-VN')} SP</b>
                              </div>
                              {/* Stats chips */}
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                <span style={{
                                  background: '#ede9fe', color: '#6d28d9',
                                  padding: '3px 8px', borderRadius: 12,
                                  fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap',
                                }}>
                                  👤 {soNguoi > 0 ? soNguoi : '—'}
                                </span>
                                <span style={{
                                  background: '#dbeafe', color: '#1d4ed8',
                                  padding: '3px 8px', borderRadius: 12,
                                  fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap',
                                }}>
                                  ⏱ {congTH > 0 ? congTH.toFixed(2) : '—'}
                                </span>
                                <span style={{
                                  background: '#dcfce7', color: '#15803d',
                                  padding: '3px 8px', borderRadius: 12,
                                  fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap',
                                }}>
                                  🔄 {soCa > 0 ? soCa.toFixed(2) : '—'}
                                </span>
                              </div>
                            </div>
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
