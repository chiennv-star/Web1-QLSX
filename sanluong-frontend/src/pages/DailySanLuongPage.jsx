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
  RiseOutlined, TeamOutlined, FundOutlined, DeleteOutlined, ExclamationCircleOutlined
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
    // HSCV: tỷ lệ % lô có số lô đã hoàn thành / tổng lô có số lô
    const ydHscvDone = {}, ydHscvTotal = {}
    SUMMARY_DEPTS.forEach(d => {
      todaySL[d.key] = 0; monthSL[d.key] = 0
      ydSL[d.key] = 0
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
      if (r.ngay === yesterday && hasSoLo) {
        ydHscvTotal[cd]++
        if (isDone) ydHscvDone[cd]++
      }
    })
    return { todaySL, monthSL, ydSL, ydHscvDone, ydHscvTotal }
  }, [data, today, yesterday, monthStart])

  const todayRows = useMemo(() =>
    data.filter(r => r.ngay === today && r.status !== 'IN_PROGRESS'),
  [data, today])

  const th = { background: '#c5d8e8', fontWeight: 700, fontSize: 11, padding: '4px 6px', border: '1px solid #a0bdd0', textAlign: 'center', whiteSpace: 'nowrap' }
  const td = (extra = {}) => ({ padding: '3px 6px', border: '1px solid #dde6f0', fontSize: 11, ...extra })
  const secHead = { background: '#d0e4f0', fontWeight: 800, fontSize: 11, textAlign: 'center', padding: '4px 6px', borderBottom: '1px solid #a0bdd0', color: '#1e3a5f' }
  const deptRow = { display: 'flex', justifyContent: 'space-between', padding: '3px 10px', borderBottom: '1px solid #e8eef5', fontSize: 11 }

  return (
    <div style={{ margin: '8px 0 4px', border: '1px solid #a0bdd0', borderRadius: 6, overflow: 'hidden', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', background: '#dce9f5', padding: '5px 12px', alignItems: 'center', borderBottom: '1px solid #a0bdd0' }}>
        <div style={{ fontSize: 11, color: '#334155' }}>Bộ Phận: <strong>QLSX</strong></div>
        <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 13, color: '#1e3a5f', letterSpacing: '0.02em' }}>CÔNG TY CÔNG PHẨM MỸ PHẨM THIÊN NHIÊN SONG AN</div>
        <div style={{ textAlign: 'right', fontSize: 11, color: '#334155' }}>Ngày: <strong>{ref.format('DD/MM/YYYY')}</strong></div>
      </div>

      {/* 3-column body */}
      <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr 190px' }}>

        {/* LEFT */}
        <div style={{ borderRight: '1px solid #a0bdd0' }}>
          <div style={secHead}>SẢN LƯỢNG NGÀY {ref.format('DD/MM')}</div>
          {SUMMARY_DEPTS.map(d => (
            <div key={d.key} style={deptRow}>
              <span style={{ fontWeight: 600, color: '#1e3a5f' }}>{d.label}</span>
              <span style={{ color: '#0284c7', fontWeight: 700 }}>{(stats.todaySL[d.key] || 0).toLocaleString('vi-VN')}</span>
            </div>
          ))}
          <div style={{ ...secHead, borderTop: '1px solid #a0bdd0' }}>TỔNG SẢN LƯỢNG THÁNG</div>
          {SUMMARY_DEPTS.map(d => (
            <div key={d.key} style={deptRow}>
              <span style={{ fontWeight: 600, color: '#1e3a5f' }}>{d.label}</span>
              <span style={{ color: '#0369a1', fontWeight: 700 }}>{(stats.monthSL[d.key] || 0).toLocaleString('vi-VN')}</span>
            </div>
          ))}
        </div>

        {/* MIDDLE */}
        <div style={{ borderRight: '1px solid #a0bdd0', display: 'flex', flexDirection: 'column' }}>
          {/* header cố định */}
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '13%' }} />
              <col style={{ width: '40%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '18%' }} />
            </colgroup>
            <thead>
              <tr>{['BỘ PHẬN', 'TÊN SẢN PHẨM', 'SỐ LÔ', 'CỠ LÔ', 'TÌNH TRẠNG'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
          </table>
          {/* body cuộn khi nhiều dòng */}
          <div style={{ maxHeight: 260, overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '13%' }} />
                <col style={{ width: '40%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '18%' }} />
              </colgroup>
              <tbody>
                {todayRows.length === 0
                  ? <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '12px', fontSize: 11 }}>Không có dữ liệu hôm nay</td></tr>
                  : todayRows.map((r, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f1f7fc' }}>
                      <td style={td({ textAlign: 'center', fontWeight: 700, color: '#0369a1' })}>{r.congDoan || '—'}</td>
                      <td style={td({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })} title={r.tenTrinh}>{r.tenTrinh || '—'}</td>
                      <td style={td({ textAlign: 'center', fontFamily: 'monospace' })}>{r.soLo || '—'}</td>
                      <td style={td({ textAlign: 'right' })}>{r.soLuong != null ? Number(r.soLuong).toLocaleString('vi-VN') : '—'}</td>
                      <td style={td({ textAlign: 'center' })}>
                        {r.status === 'PENDING'
                          ? <span style={{ color: '#d97706', fontWeight: 600, fontSize: 10 }}>⌛ Chưa hoàn thành</span>
                          : r.status === 'IN_PROGRESS'
                            ? <span style={{ color: '#2563eb', fontWeight: 600, fontSize: 10 }}>▶ Đang thực hiện</span>
                            : <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 10 }}>✓ Hoàn thành</span>}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
          {todayRows.length > 10 && (
            <div style={{ textAlign: 'center', fontSize: 10, color: '#64748b', padding: '3px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
              {todayRows.length} dòng — cuộn để xem thêm
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div>
          <div style={secHead}>Sản Lượng {ref.subtract(1,'day').format('DD/MM')}</div>
          {SUMMARY_DEPTS.map(d => (
            <div key={d.key} style={deptRow}>
              <span style={{ fontWeight: 600, color: '#1e3a5f' }}>{d.label}</span>
              <span style={{ color: '#7c3aed', fontWeight: 700 }}>{(stats.ydSL[d.key] || 0).toLocaleString('vi-VN')}</span>
            </div>
          ))}
          <div style={{ ...secHead, borderTop: '1px solid #a0bdd0' }}>HSCV {ref.subtract(1,'day').format('DD/MM')}</div>
          {SUMMARY_DEPTS.map(d => {
            const done  = stats.ydHscvDone[d.key]  || 0
            const total = stats.ydHscvTotal[d.key] || 0
            const pct   = total > 0 ? ((done / total) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%' : '—'
            const label = total > 0 ? `${pct} (${done}/${total})` : '—'
            return (
              <div key={d.key} style={deptRow}>
                <span style={{ fontWeight: 600, color: '#1e3a5f' }}>{d.label}</span>
                <span style={{ color: '#059669', fontWeight: 700 }}>{label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
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
    dayjs().subtract(6, 'day'), dayjs()
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
            // Mở rộng range fetch nếu ngày chọn nằm ngoài range hiện tại
            const prev = dateRange?.[1]?.subtract(1, 'day') ?? d
            const [from, to] = dateRange ?? [d, d]
            const newFrom = d.isBefore(from) ? d.subtract(1, 'day') : from
            const newTo   = d.isAfter(to)   ? d                      : to
            if (!newFrom.isSame(from, 'day') || !newTo.isSame(to, 'day')) {
              const newRange = [newFrom, newTo]
              setDateRange(newRange)
              fetchData(newRange)
            }
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
            const def = [dayjs().subtract(6, 'day'), dayjs()]
            setRefDate(dayjs())
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
  const { isAdmin, isAdminKH } = useAuth()
  const canApprove = isAdmin() || isAdminKH()
  const location = useLocation()

  // Đọc ?tab= từ URL, fallback localStorage, rồi mới default 'daily'
  const tabFromUrl = new URLSearchParams(location.search).get('tab')
  const [activeTab, setActiveTab] = useState(
    tabFromUrl || localStorage.getItem('dailysl_activeTab') || 'daily'
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
    {
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
    },
    {
      key: 'tonghop',
      label: (
        <span>
          <FundOutlined style={{ marginRight: 5 }} />
          Tổng hợp sản lượng
        </span>
      ),
      children: <TongHopTab />,
    },
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
