import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Table, Button, Space, Typography, Input, Select, DatePicker,
  Modal, Form, InputNumber, Tag, Popconfirm, message,
  Row, Col, Card, Tabs, Badge, Tooltip, Divider, Drawer, Spin
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  ReloadOutlined, WarningOutlined, CalendarOutlined,
  SyncOutlined, CheckCircleOutlined, EyeOutlined, LinkOutlined,
  CheckOutlined, CloseOutlined, BellOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'

const { Option } = Select
const { RangePicker } = DatePicker
const { TextArea } = Input

const TINH_TRANG_OPTIONS = [
  { value: 'done', label: 'Done', status: 'success' },
  { value: 'doing', label: 'Doing', status: 'processing' },
]

const TO_NHOM_OPTIONS = {
  PC:   ['PCPL1', 'PCPL2', 'PCPL3'],
  DG:   ['Nhóm 1', 'Nhóm 2'],
  BBC1: ['PCPL3', 'Nhóm 1', 'Nhóm 2'],
}

const tinhTrangTag = (val) => {
  const opt = TINH_TRANG_OPTIONS.find(o => o.value === val)
  return opt ? <Badge status={opt.status} text={opt.label} /> : (val || '-')
}

const fmtNum = v => (v != null && v !== '') ? Number(v).toLocaleString('vi-VN') : '—'

const slExceedRender = (v, record) => {
  const sl = Number(v) || 0
  const coLo = Number(record.coLo) || 0
  const exceeds = sl > 0 && coLo > 0 && sl > coLo
  const txt = fmtNum(v)
  if (!exceeds) return txt
  return (
    <span>
      <span style={{ color: '#722ed1', fontWeight: 600 }}>{txt}</span>
      {' '}
      <Tooltip title={`Sản lượng vượt cỡ lô (${fmtNum(record.coLo)})`}>
        <WarningOutlined style={{ color: '#722ed1', fontSize: 11 }} />
      </Tooltip>
    </span>
  )
}

const STAGE_CONFIG = {
  PC: {
    label: 'Lịch sản xuất PC',
    extraTableCols: [
      { title: 'SL PC', dataIndex: 'slPc', key: 'slPc', width: 95, align: 'right', render: slExceedRender },
      { title: 'Công PC', dataIndex: 'congPc', key: 'congPc', width: 85, align: 'right', render: fmtNum }
    ],
    extraFormFields: [
      { name: 'slPc', label: 'SL PC' },
      { name: 'congPc', label: 'Công PC' }
    ]
  },
  BBC1: {
    label: 'Lịch sản xuất BBC1',
    extraTableCols: [
      { title: 'SL BBC1', dataIndex: 'slBbc1', key: 'slBbc1', width: 95, align: 'right', render: slExceedRender },
      { title: 'Công BBC1', dataIndex: 'congBbc1', key: 'congBbc1', width: 88, align: 'right', render: fmtNum }
    ],
    extraFormFields: [
      { name: 'slBbc1', label: 'SL BBC1' },
      { name: 'congBbc1', label: 'Công BBC1' }
    ]
  },
  PL: {
    label: 'Lịch sản xuất PL',
    extraTableCols: [
      { title: 'SL PL', dataIndex: 'slPl', key: 'slPl', width: 90, align: 'right', render: slExceedRender },
      { title: 'Công PL', dataIndex: 'congPl', key: 'congPl', width: 82, align: 'right', render: fmtNum }
    ],
    extraFormFields: [
      { name: 'slPl', label: 'SL PL' },
      { name: 'congPl', label: 'Công PL' }
    ]
  },
  DG: {
    label: 'Lịch sản xuất ĐG',
    extraTableCols: [
      { title: 'SL ĐG', dataIndex: 'slDg', key: 'slDg', width: 90, align: 'right', render: slExceedRender },
      { title: 'Công ĐG', dataIndex: 'congDg', key: 'congDg', width: 82, align: 'right', render: fmtNum }
    ],
    extraFormFields: [
      { name: 'slDg', label: 'SL ĐG' },
      { name: 'congDg', label: 'Công ĐG' }
    ]
  },
  CC: {
    label: 'Lịch cân chia',
    extraTableCols: [
      { title: 'Công Cân Chia', dataIndex: 'congCc', key: 'congCc', width: 105, align: 'right', render: fmtNum }
    ],
    extraFormFields: [
      { name: 'congCc', label: 'Công Cân Chia' }
    ]
  }
}


// ── WorkDetailDrawer ──────────────────────────────────────────────────────────
const CONG_FIELD_MAP   = { PC: 'congPc', BBC1: 'congBbc1', PL: 'congPl', DG: 'congDg', CC: 'congCc' }
const SL_FIELD_MAP     = { PC: 'slPc',   BBC1: 'slBbc1',   PL: 'slPl',   DG: 'slDg' }
const NS_LOOKUP_FIELD  = { PC: 'nangSuatPc', PL: 'nangSuatPl', BBC1: 'nangSuatBbc1', DG: 'slTrungBinh', CC: 'slTrungBinh' }

function WorkDetailDrawer({ open, schedule, onClose, onSaved }) {
  const { isAdmin } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(null)
  const [editingKeys, setEditingKeys] = useState(new Set())
  const [savedSlKeys, setSavedSlKeys] = useState(new Set())
  const [pendingDaySet, setPendingDaySet] = useState(new Set()) // ngayKeys with PENDING change request
  const [maBravo, setMaBravo] = useState('')
  const [nsTrungBinh, setNsTrungBinh] = useState(null)
  const [openTabs, setOpenTabs] = useState(['list'])
  const [activeTabKey, setActiveTabKey] = useState('list')
  const [daySlMap, setDaySlMap] = useState({})
  const [savingDay, setSavingDay] = useState(null)
  const [pendingDays, setPendingDays] = useState([])
  // Ghi nhớ các field đã sync để tránh overwrite khi schedule prop vẫn stale
  const [scheduleCache, setScheduleCache] = useState({})

  useEffect(() => {
    if (!open || !schedule) return
    setOpenTabs(['list'])
    setActiveTabKey('list')
    setMaBravo('')
    setNsTrungBinh(null)
    setPendingDays([])
    setScheduleCache({})
    setSessions([])
    setDaySlMap({})
    setEditingKeys(new Set())
    setSavedSlKeys(new Set())
    setPendingDaySet(new Set())
    fetchSessions()
    api.get(`/product-master/lookup/${encodeURIComponent(schedule.maSp || '')}`)
      .then(r => {
        setMaBravo(r.data.maBravo || '')
        const field = NS_LOOKUP_FIELD[schedule.congDoan] || 'slTrungBinh'
        const val = r.data[field]
        setNsTrungBinh(val != null ? Number(val) : null)
      })
      .catch(() => {})
  }, [open, schedule])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/work-schedule-session', { params: { scheduleId: schedule.id } })
      const normalized = data.map(normalizeSession)
      setSessions(normalized)
      const slMap = {}
      normalized.forEach(s => {
        const key = s.ngay || 'unknown'
        if (slMap[key] === undefined && s.sanLuong != null) {
          slMap[key] = String(Math.round(parseFloat(s.sanLuong)))
        }
      })
      setDaySlMap(slMap)
      setSavedSlKeys(new Set(Object.keys(slMap)))
      // Load pending change requests for this schedule
      try {
        const { data: changeReqs } = await api.get(`/sl-change-request/for-schedule/${schedule.id}`)
        const pending = new Set(changeReqs.filter(r => r.status === 'PENDING').map(r => r.ngay))
        setPendingDaySet(pending)
      } catch { /* non-blocking */ }
    } catch { message.error('Không thể tải dữ liệu chi tiết') }
    finally { setLoading(false) }
  }

  const normalizeSession = (s) => ({
    ...s,
    ngay: s.ngay || '',
    nguoiThucHien: s.nguoiThucHien || '',
    nhomThucHien: s.nhomThucHien || '',
    thoiGianBatDau: s.thoiGianBatDau || '',
    congThucHien: s.congThucHien ?? '',
    vaiTro: s.vaiTro || '',
    ghiChu: s.ghiChu || '',
  })

  const tongCong = sessions.reduce((acc, r) => acc + (parseFloat(r.congThucHien) || 0), 0)
  const tongSanLuong = Object.values(daySlMap).reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
  const ngayKeys = [...new Set(sessions.map(s => s.ngay || 'unknown'))].sort()

  const openDetail = (ngayKey) => {
    setOpenTabs(prev => prev.includes(ngayKey) ? prev : [...prev, ngayKey])
    setActiveTabKey(ngayKey)
  }

  const closeTab = (ngayKey) => {
    const next = openTabs.filter(t => t !== ngayKey)
    setOpenTabs(next)
    if (activeTabKey === ngayKey) setActiveTabKey(next[next.length - 1])
  }

  const addNewDay = () => {
    setPendingDays(prev => [...prev, { tempId: Date.now(), ngay: dayjs().format('YYYY-MM-DD') }])
  }

  const addRowToDay = (ngayKey) => {
    const tempId = Date.now()
    setSessions(prev => [...prev, {
      _tempId: tempId, id: null, workScheduleId: schedule.id,
      ngay: ngayKey, nguoiThucHien: '', nhomThucHien: '',
      thoiGianBatDau: '', congThucHien: '', vaiTro: '', ghiChu: '',
    }])
    setEditingKeys(prev => new Set([...prev, tempId]))
  }

  const updateLocal = (identifier, field, value) => {
    setSessions(prev => prev.map(s =>
      (s.id ? s.id === identifier : s._tempId === identifier)
        ? { ...s, [field]: value } : s
    ))
  }

  const syncCong = async (updatedSessions) => {
    const field = CONG_FIELD_MAP[schedule?.congDoan]
    if (!field || !schedule?.id) return
    const newCong = updatedSessions.reduce((acc, r) => acc + (parseFloat(r.congThucHien) || 0), 0)
    const value = newCong || null
    const newCache = { ...scheduleCache, [field]: value }
    setScheduleCache(newCache)
    try {
      await api.put(`/work-schedule/${schedule.id}`, { ...schedule, ...newCache })
      onSaved?.()
    } catch { /* silent */ }
  }

  const syncSl = async (newTongSl) => {
    const field = SL_FIELD_MAP[schedule?.congDoan]
    if (!field || !schedule?.id) return
    const value = newTongSl || null
    const newCache = { ...scheduleCache, [field]: value }
    setScheduleCache(newCache)
    try {
      await api.put(`/work-schedule/${schedule.id}`, { ...schedule, ...newCache })
      onSaved?.()
    } catch { /* silent */ }
  }

  const saveRow = async (s) => {
    const key = s.id || s._tempId
    setSaving(key)
    const payload = {
      workScheduleId: schedule.id,
      ngay: s.ngay || null,
      nguoiThucHien: s.nguoiThucHien || null,
      nhomThucHien: s.nhomThucHien || null,
      thoiGianBatDau: s.thoiGianBatDau || null,
      congThucHien: s.congThucHien !== '' ? s.congThucHien : null,
      vaiTro: s.vaiTro || null,
      ghiChu: s.ghiChu || null,
    }
    try {
      let updated
      if (s.id) {
        const { data } = await api.put(`/work-schedule-session/${s.id}`, payload)
        updated = sessions.map(r => r.id === s.id ? normalizeSession(data) : r)
      } else {
        const { data } = await api.post('/work-schedule-session', payload)
        updated = sessions.map(r => r._tempId === s._tempId ? normalizeSession(data) : r)
      }
      setSessions(updated)
      await syncCong(updated)
      setEditingKeys(prev => { const next = new Set(prev); next.delete(key); return next })
      message.success('Đã lưu')
    } catch { message.error('Lưu thất bại') }
    finally { setSaving(null) }
  }

  const deleteRow = async (s) => {
    if (!s.id) {
      const updated = sessions.filter(r => r._tempId !== s._tempId)
      setSessions(updated)
      await syncCong(updated)
      return
    }
    try {
      await api.delete(`/work-schedule-session/${s.id}`)
      const updated = sessions.filter(r => r.id !== s.id)
      setSessions(updated)
      await syncCong(updated)
      message.success('Đã xóa')
    } catch { message.error('Xóa thất bại') }
  }

  const saveDaySl = async (ngayKey) => {
    const val = daySlMap[ngayKey]
    if (val === '' || val === undefined) return
    const rows = sessions.filter(s => (s.ngay || 'unknown') === ngayKey)
    const first = rows[0]
    if (!first?.id) return
    setSavingDay(ngayKey)

    // Non-admin editing an existing SL → submit change request instead
    const hasExistingSl = first.sanLuong != null && first.sanLuong !== ''
    if (!isAdmin() && hasExistingSl) {
      try {
        await api.post('/sl-change-request', {
          workScheduleId: schedule.id,
          workScheduleSessionId: first.id,
          congDoan: schedule.congDoan,
          maSp: schedule.maSp,
          tenTrinh: schedule.tenTrinh,
          soLo: schedule.soLo,
          ngay: ngayKey,
          newValue: parseInt(val, 10),
        })
        setPendingDaySet(prev => new Set([...prev, ngayKey]))
        setSavedSlKeys(prev => new Set([...prev, ngayKey]))
        message.info('Yêu cầu thay đổi đã gửi, chờ quản trị viên duyệt')
      } catch (e) {
        message.error(e?.response?.data?.message || 'Gửi yêu cầu thất bại')
      }
      finally { setSavingDay(null) }
      return
    }

    try {
      const { data } = await api.put(`/work-schedule-session/${first.id}`, {
        workScheduleId: schedule.id,
        ngay: first.ngay || null,
        nguoiThucHien: first.nguoiThucHien || null,
        nhomThucHien: first.nhomThucHien || null,
        thoiGianBatDau: first.thoiGianBatDau || null,
        thoiGianKetThuc: first.thoiGianKetThuc || null,
        congThucHien: first.congThucHien !== '' ? first.congThucHien : null,
        soGioThucHien: first.soGioThucHien != null ? parseFloat(first.soGioThucHien) : null,
        vaiTro: first.vaiTro || null,
        ghiChu: first.ghiChu || null,
        sanLuong: parseInt(val, 10),
        nangSuat: first.nangSuat != null ? parseFloat(first.nangSuat) : null,
        nangSuatTrungBinh: first.nangSuatTrungBinh != null ? parseFloat(first.nangSuatTrungBinh) : null,
      })
      setSessions(prev => prev.map(r => r.id === first.id ? normalizeSession(data) : r))
      const newTongSl = Object.values({ ...daySlMap, [ngayKey]: val })
        .reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
      await syncSl(newTongSl)
      setSavedSlKeys(prev => new Set([...prev, ngayKey]))
      message.success('Đã lưu sản lượng')
    } catch { message.error('Lưu sản lượng thất bại') }
    finally { setSavingDay(null) }
  }

  const cellStyle = { padding: '5px 8px', border: '1px solid #d9d9d9', verticalAlign: 'middle' }
  const headStyle = { ...cellStyle, background: '#e6f4ff', fontWeight: 600, color: '#1677ff', whiteSpace: 'nowrap' }
  const subHeadStyle = { ...cellStyle, background: '#fff7e6', fontWeight: 600, color: '#d46b08', whiteSpace: 'nowrap' }
  const inputStyle = { width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 13 }

  const HeaderTable = () => (
    <div style={{ overflowX: 'auto', marginBottom: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {['Mã sản phẩm', 'Mã Bravo', 'Tiến Trình', 'Số Lô', 'Số Lượng', 'Sản Lượng', 'NS Trung Bình', 'Tổng Công'].map(h => (
              <th key={h} style={headStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cellStyle}><Tag color="blue">{schedule?.maSp || '—'}</Tag></td>
            <td style={cellStyle}>{maBravo || '—'}</td>
            <td style={{ ...cellStyle, maxWidth: 260 }}>{schedule?.tenTrinh || '—'}</td>
            <td style={cellStyle}>{schedule?.soLo || '—'}</td>
            <td style={{ ...cellStyle, textAlign: 'right' }}>{schedule?.coLo ?? '—'}</td>
            <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: '#389e0d' }}>
              {tongSanLuong ? tongSanLuong.toFixed(2) : '—'}
            </td>
            <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: '#722ed1' }}>
              {nsTrungBinh != null ? nsTrungBinh : '—'}
            </td>
            <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: '#1677ff' }}>
              {tongCong ? tongCong.toFixed(4) : '0.0000'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  const renderListTab = () => (
    <>
      <div style={{ overflowX: 'auto', marginBottom: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={subHeadStyle}>Ngày thực hiện</th>
              <th style={{ ...subHeadStyle, textAlign: 'right' }}>Số dòng</th>
              <th style={{ ...subHeadStyle, textAlign: 'right' }}>Tổng công</th>
              <th style={{ ...subHeadStyle, textAlign: 'right' }}>Sản lượng ngày</th>
              <th style={{ ...subHeadStyle, textAlign: 'right' }}>Năng suất</th>
            </tr>
          </thead>
          <tbody>
            {ngayKeys.length === 0 && pendingDays.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...cellStyle, textAlign: 'center', color: '#aaa', padding: 20 }}>
                  Chưa có dữ liệu. Nhấn "Thêm ngày" để bắt đầu.
                </td>
              </tr>
            )}
            {ngayKeys.map(k => {
              const rows = sessions.filter(s => (s.ngay || 'unknown') === k)
              const tong = rows.reduce((a, r) => a + (parseFloat(r.congThucHien) || 0), 0)
              const slVal = daySlMap[k] ?? ''
              const slNum = parseFloat(slVal) || 0
              const nsNgay = tong > 0 && slNum > 0 ? slNum / tong : 0
              const isOpen = openTabs.includes(k)
              return (
                <tr key={k} style={{ cursor: 'pointer', background: isOpen ? '#f6ffed' : '' }}
                  onClick={() => openDetail(k)}>
                  <td style={{ ...cellStyle, color: '#1677ff', fontWeight: 600 }}>
                    {k !== 'unknown' && dayjs(k).isValid() ? dayjs(k).format('DD/MM/YYYY') : k}
                    {isOpen && <Tag color="green" style={{ marginLeft: 6, fontSize: 11 }}>Đang mở</Tag>}
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>{rows.length}</td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>{tong ? tong.toFixed(4) : '—'}</td>
                  <td style={{ ...cellStyle, padding: '2px 4px' }}
                    onClick={e => e.stopPropagation()}>
                    {savedSlKeys.has(k) && slVal !== '' ? (
                      <Space size={2} wrap>
                        <span style={{ fontWeight: 600, minWidth: 60, display: 'inline-block', textAlign: 'right' }}>
                          {Number(slVal).toLocaleString('vi-VN')}
                        </span>
                        {pendingDaySet.has(k)
                          ? <Tag color="orange" style={{ fontSize: 11, marginRight: 0 }}>Chờ duyệt</Tag>
                          : <Button size="small" type="text" icon={<EditOutlined />}
                              onClick={() => setSavedSlKeys(prev => { const next = new Set(prev); next.delete(k); return next })} />
                        }
                      </Space>
                    ) : (
                      <Space size={2}>
                        <input
                          type="number" step="1" min="0"
                          style={{ ...inputStyle, textAlign: 'right', width: 80 }}
                          placeholder="Nhập SL"
                          value={slVal}
                          onChange={e => setDaySlMap(prev => ({ ...prev, [k]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') saveDaySl(k) }}
                        />
                        <Button size="small" type="primary" loading={savingDay === k}
                          disabled={slVal === ''}
                          onClick={() => saveDaySl(k)}>
                          Lưu
                        </Button>
                      </Space>
                    )}
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>
                    {(() => {
                      if (!nsNgay) return '—'
                      let color = '#262626'
                      let arrow = ''
                      if (nsTrungBinh && nsNgay > nsTrungBinh) { color = '#389e0d'; arrow = ' ▲' }
                      if (nsTrungBinh && nsNgay < nsTrungBinh) { color = '#cf1322'; arrow = ' ▼' }
                      if (!nsTrungBinh) return <span style={{ fontWeight: 600, color }}>{nsNgay.toFixed(2)}</span>
                      const delta = nsNgay - nsTrungBinh
                      const pct = (delta / nsTrungBinh) * 100
                      const sign = delta >= 0 ? '+' : ''
                      return (
                        <span style={{ fontWeight: 600, color }}>
                          {Math.round(nsNgay).toLocaleString('vi-VN')}
                          <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 3 }}>
                            {sign}{Math.round(delta).toLocaleString('vi-VN')} ({sign}{pct.toFixed(2)}%){arrow}
                          </span>
                        </span>
                      )
                    })()}
                  </td>
                </tr>
              )
            })}
            {pendingDays.map(pd => {
              const goToTab = () => {
                setPendingDays(prev => prev.filter(p => p.tempId !== pd.tempId))
                openDetail(pd.ngay)
              }
              return (
                <tr key={pd.tempId} style={{ background: '#fffbe6' }}>
                  <td style={{ ...cellStyle, padding: '2px 6px' }}>
                    <Space size={4}>
                      <input type="date" style={{ ...inputStyle, width: 120, fontSize: 13 }} value={pd.ngay}
                        onChange={e => setPendingDays(prev =>
                          prev.map(p => p.tempId === pd.tempId ? { ...p, ngay: e.target.value } : p)
                        )} />
                      <Button
                        size="small" type="primary"
                        style={{ fontSize: 12, padding: '0 8px' }}
                        onClick={goToTab}>
                        Mở →
                      </Button>
                    </Space>
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'right', color: '#aaa' }}>0</td>
                  <td style={{ ...cellStyle, textAlign: 'right', color: '#aaa' }}>—</td>
                  <td style={{ ...cellStyle, padding: '2px 4px' }}>
                    <input type="number" step="1" min="0"
                      style={{ ...inputStyle, textAlign: 'right', width: 80 }}
                      placeholder="Nhập SL"
                      value={daySlMap[pd.ngay] ?? ''}
                      onChange={e => setDaySlMap(prev => ({ ...prev, [pd.ngay]: e.target.value }))} />
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'right', color: '#aaa' }}>—</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Button icon={<PlusOutlined />} onClick={addNewDay} type="dashed" block>Thêm ngày</Button>
    </>
  )

  const renderDayTab = (ngayKey) => {
    const detailRows = sessions.filter(s => (s.ngay || 'unknown') === ngayKey)
    const tongCongNgay = detailRows.reduce((a, r) => a + (parseFloat(r.congThucHien) || 0), 0)
    const slVal = daySlMap[ngayKey] ?? ''
    const slNum = parseFloat(slVal) || 0
    const nsNgay = tongCongNgay > 0 && slNum > 0 ? (slNum / tongCongNgay).toFixed(2) : '—'
    const hasSavedRow = detailRows.some(r => r.id)
    return (
      <>
        {/* ── Thanh sản lượng ngày ── */}
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16,
          background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6,
          padding: '8px 14px', marginBottom: 12, fontSize: 13,
        }}>
          <Space size={6}>
            <span style={{ color: '#595959' }}>Tổng công:</span>
            <span style={{ fontWeight: 700, color: '#1677ff' }}>{tongCongNgay ? tongCongNgay.toFixed(4) : '0.0000'}</span>
          </Space>
          <Space size={6}>
            <span style={{ color: '#595959' }}>Sản lượng ngày:</span>
            {savedSlKeys.has(ngayKey) && slVal !== '' ? (
              <Space size={4}>
                <span style={{ fontWeight: 700, color: '#722ed1' }}>
                  {Number(slVal).toLocaleString('vi-VN')}
                </span>
                {pendingDaySet.has(ngayKey)
                  ? <Tag color="orange" style={{ fontSize: 11, marginRight: 0 }}>Chờ duyệt</Tag>
                  : <Button size="small" type="text" icon={<EditOutlined />}
                      onClick={() => setSavedSlKeys(prev => { const next = new Set(prev); next.delete(ngayKey); return next })} />
                }
              </Space>
            ) : (
              <>
                <input
                  type="number" step="1" min="0"
                  style={{ ...inputStyle, width: 90, border: '1px solid #d9d9d9', borderRadius: 4, padding: '2px 6px', background: '#fff' }}
                  placeholder="Nhập SL"
                  value={slVal}
                  onChange={e => setDaySlMap(prev => ({ ...prev, [ngayKey]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') saveDaySl(ngayKey) }}
                />
                <Button
                  size="small" type="primary"
                  loading={savingDay === ngayKey}
                  disabled={slVal === '' || !hasSavedRow}
                  onClick={() => saveDaySl(ngayKey)}
                >Lưu SL</Button>
                {!hasSavedRow && slVal !== '' && (
                  <span style={{ color: '#fa8c16', fontSize: 12 }}>Cần lưu ít nhất 1 dòng trước</span>
                )}
              </>
            )}
          </Space>
          <Space size={6}>
            <span style={{ color: '#595959' }}>Năng suất:</span>
            {nsNgay === '—' ? <span style={{ fontWeight: 700, color: '#722ed1' }}>—</span> : (() => {
              const nsNum = parseFloat(nsNgay)
              let color = '#722ed1'
              let arrow = ''
              if (nsTrungBinh && nsNum > nsTrungBinh) { color = '#389e0d'; arrow = ' ▲' }
              if (nsTrungBinh && nsNum < nsTrungBinh) { color = '#cf1322'; arrow = ' ▼' }
              if (!nsTrungBinh) return <span style={{ fontWeight: 700, color }}>{nsNgay}</span>
              const delta = nsNum - nsTrungBinh
              const pct = (delta / nsTrungBinh) * 100
              const sign = delta >= 0 ? '+' : ''
              return (
                <span style={{ fontWeight: 700, color }}>
                  {Math.round(nsNum).toLocaleString('vi-VN')}
                  <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 3 }}>
                    {sign}{Math.round(delta).toLocaleString('vi-VN')} ({sign}{pct.toFixed(2)}%){arrow}
                  </span>
                </span>
              )
            })()}
          </Space>
        </div>

        <div style={{ overflowX: 'auto', marginBottom: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Người Thực hiện', 'Nhóm/tổ', 'Thời gian thực hiện', 'Công thực hiện', 'Vai Trò', 'Ghi Chú', ''].map((h, i) => (
                  <th key={i} style={subHeadStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detailRows.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ ...cellStyle, textAlign: 'center', color: '#aaa', padding: 16 }}>
                    Chưa có dòng nào. Nhấn "+ Thêm dòng".
                  </td>
                </tr>
              )}
              {detailRows.map(s => {
                const key = s.id || s._tempId
                const isSaving = saving === key
                const isEditing = editingKeys.has(key)
                const startEdit = () => setEditingKeys(prev => new Set([...prev, key]))
                if (!isEditing) return (
                  <tr key={key} style={{ background: '#fafafa' }}>
                    <td style={{ ...cellStyle, minWidth: 130 }}>{s.nguoiThucHien || <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td style={{ ...cellStyle, minWidth: 100 }}>{s.nhomThucHien || <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td style={{ ...cellStyle, width: 90, textAlign: 'right' }}>{s.thoiGianBatDau || <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td style={{ ...cellStyle, width: 110, textAlign: 'right', fontWeight: 600 }}>{s.congThucHien ?? <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td style={{ ...cellStyle, minWidth: 110 }}>{s.vaiTro || <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td style={{ ...cellStyle, minWidth: 150 }}>{s.ghiChu || <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td style={{ ...cellStyle, width: 90, whiteSpace: 'nowrap' }}>
                      <Space size={4}>
                        <Button size="small" type="default" icon={<EditOutlined />} onClick={startEdit}>Sửa</Button>
                        <Popconfirm title="Xóa dòng này?" okText="Xóa" cancelText="Hủy"
                          onConfirm={() => deleteRow(s)}>
                          <Button size="small" danger>Xóa</Button>
                        </Popconfirm>
                      </Space>
                    </td>
                  </tr>
                )
                return (
                  <tr key={key}>
                    <td style={{ ...cellStyle, minWidth: 130 }}>
                      <input style={inputStyle} value={s.nguoiThucHien}
                        onChange={e => updateLocal(key, 'nguoiThucHien', e.target.value)} />
                    </td>
                    <td style={{ ...cellStyle, minWidth: 100 }}>
                      <input style={inputStyle} value={s.nhomThucHien}
                        onChange={e => updateLocal(key, 'nhomThucHien', e.target.value)} />
                    </td>
                    <td style={{ ...cellStyle, width: 90 }}>
                      <input style={{ ...inputStyle, textAlign: 'right' }} type="number" step="0.01" min="0"
                        value={s.thoiGianBatDau}
                        onChange={e => updateLocal(key, 'thoiGianBatDau', e.target.value)} />
                    </td>
                    <td style={{ ...cellStyle, width: 110 }}>
                      <input style={{ ...inputStyle, textAlign: 'right' }} type="number" step="0.0001"
                        value={s.congThucHien}
                        onChange={e => updateLocal(key, 'congThucHien', e.target.value)} />
                    </td>
                    <td style={{ ...cellStyle, minWidth: 110 }}>
                      <input style={inputStyle} value={s.vaiTro}
                        onChange={e => updateLocal(key, 'vaiTro', e.target.value)} />
                    </td>
                    <td style={{ ...cellStyle, minWidth: 150 }}>
                      <input style={inputStyle} value={s.ghiChu}
                        onChange={e => updateLocal(key, 'ghiChu', e.target.value)} />
                    </td>
                    <td style={{ ...cellStyle, width: 90, whiteSpace: 'nowrap' }}>
                      <Space size={4}>
                        <Button size="small" type="primary" loading={isSaving}
                          onClick={() => saveRow(s)}>Lưu</Button>
                        <Popconfirm title="Xóa dòng này?" okText="Xóa" cancelText="Hủy"
                          onConfirm={() => deleteRow(s)}>
                          <Button size="small" danger>Xóa</Button>
                        </Popconfirm>
                      </Space>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Button icon={<PlusOutlined />} onClick={() => addRowToDay(ngayKey)} type="dashed" block>Thêm dòng</Button>
      </>
    )
  }

  const tabItems = openTabs.map(key => ({
    key,
    label: key === 'list'
      ? <Space size={4}><EyeOutlined />Chi tiết</Space>
      : (dayjs(key).isValid() ? dayjs(key).format('DD/MM/YYYY') : key),
    closable: key !== 'list',
    children: (
      <>
        <HeaderTable />
        {key === 'list' ? renderListTab() : renderDayTab(key)}
      </>
    ),
  }))

  return (
    <Drawer
      title={<Space><EyeOutlined /><span>Chi tiết sản xuất — {schedule?.tenTrinh || schedule?.maSp}</span></Space>}
      open={open}
      onClose={onClose}
      width={1000}
      styles={{ body: { padding: '8px 16px' } }}
    >
      {loading ? <Spin style={{ display: 'block', margin: '40px auto' }} /> : (
        <Tabs
          type="editable-card"
          hideAdd
          activeKey={activeTabKey}
          onChange={setActiveTabKey}
          onEdit={(key, action) => { if (action === 'remove') closeTab(key) }}
          items={tabItems}
          size="small"
          style={{ marginTop: -8 }}
        />
      )}
    </Drawer>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function WorkScheduleModal({ open, editItem, congDoan, extraFormFields = [], onClose, onSaved }) {
  const [form] = Form.useForm()
  const [lookupStatus, setLookupStatus] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (open) {
      if (editItem) {
        form.setFieldsValue({
          ...editItem,
          ngayThucHien: editItem.ngayThucHien ? dayjs(editItem.ngayThucHien) : null,
        })
        setLookupStatus(null)
      } else {
        form.resetFields()
        form.setFieldValue('ngayThucHien', dayjs())
        setLookupStatus(null)
      }
    }
  }, [open, editItem])

  const handleMaSpChange = (e) => {
    const val = e.target.value?.trim()
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!val) { setLookupStatus(null); return }
    setLookupStatus('loading')
    timerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/product-master/lookup/${encodeURIComponent(val)}`)
        form.setFieldsValue({ tenTrinh: data.tienTrinh })
        setLookupStatus('found')
      } catch {
        setLookupStatus('not_found')
      }
    }, 500)
  }

  const onOk = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        ...values,
        ngayThucHien: values.ngayThucHien?.format('YYYY-MM-DD'),
        congDoan,
        source: 'SCHEDULE',
      }
      if (editItem) {
        await api.put(`/work-schedule/${editItem.id}`, payload)
        message.success('Cập nhật thành công')
      } else {
        await api.post('/work-schedule', payload)
        message.success('Thêm mới thành công')
      }
      onSaved()
      onClose()
    } catch (err) {
      if (err?.response) message.error(err.response.data?.message || 'Lưu thất bại')
    }
  }

  const lookupIcon = () => {
    if (lookupStatus === 'loading') return <SyncOutlined spin style={{ color: '#1890ff' }} />
    if (lookupStatus === 'found')
      return <Tooltip title="Đã tự động điền từ danh mục"><CheckCircleOutlined style={{ color: '#52c41a' }} /></Tooltip>
    if (lookupStatus === 'not_found')
      return <Tag color="orange" style={{ margin: 0 }}>Nhập thủ công</Tag>
    return null
  }

  return (
    <Modal
      title={editItem ? 'Chỉnh sửa công việc' : 'Thêm công việc mới'}
      open={open}
      onOk={onOk}
      onCancel={onClose}
      okText="Lưu"
      cancelText="Hủy"
      width={760}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label="Ngày thực hiện" name="ngayThucHien"
              rules={[{ required: true, message: 'Chọn ngày' }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label={<Space size={4}><span>Mã SP</span>{lookupIcon()}</Space>} name="maSp">
              <Input onChange={handleMaSpChange} placeholder="Nhập để tự điền tiến trình" allowClear />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label="Tình trạng" name="tinhTrang">
              <Select allowClear placeholder="Chọn tình trạng">
                {TINH_TRANG_OPTIONS.map(o =>
                  <Option key={o.value} value={o.value}>{o.label}</Option>
                )}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={16}>
            <Form.Item label="TIẾN TRÌNH" name="tenTrinh">
              <Input.TextArea autoSize={{ minRows: 1, maxRows: 3 }}
                placeholder="Tự động điền hoặc nhập tay" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Form.Item label="Số lô" name="soLo">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Form.Item label="Cỡ lô" name="coLo">
              <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
            </Form.Item>
          </Col>
        </Row>

        {extraFormFields.length > 0 && (
          <Row gutter={16}>
            {extraFormFields.map(f => (
              <Col xs={24} sm={12} md={8} key={f.name}>
                <Form.Item label={f.label} name={f.name}>
                  <InputNumber style={{ width: '100%' }} step={0.01} precision={2} />
                </Form.Item>
              </Col>
            ))}
          </Row>
        )}

        <Row gutter={16}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label="Tổ/ Nhóm thực hiện" name="toNhom">
              {TO_NHOM_OPTIONS[congDoan] ? (
                <Select allowClear placeholder="Chọn tổ/nhóm">
                  {TO_NHOM_OPTIONS[congDoan].map(o => <Option key={o} value={o}>{o}</Option>)}
                </Select>
              ) : (
                <Input />
              )}
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label="Phòng thực hiện" name="phongThucHien">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label="Trưởng ca" name="truongCa">
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label="Người hỗ trợ" name="nguoiHoTro">
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Chú ý" name="chuY">
          <TextArea rows={2} />
        </Form.Item>

        <Divider style={{ margin: '8px 0' }}>
          <Space>
            <WarningOutlined style={{ color: '#fa8c16' }} />
            <Typography.Text type="warning">Sai lệch</Typography.Text>
          </Space>
        </Divider>

        <Form.Item
          label={
            <Space>
              <WarningOutlined style={{ color: '#fa8c16' }} />
              <span>Nội dung sai lệch</span>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                (Nếu có → tự động xuất hiện ở tab Sai lệch)
              </Typography.Text>
            </Space>
          }
          name="saiLech"
        >
          <TextArea rows={3} placeholder="Nhập nội dung sai lệch nếu có..."
            style={{ borderColor: '#fa8c16' }} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ── StageTab ──────────────────────────────────────────────────────────────────
function StageTab({ congDoan, config, onSaved: parentOnSaved, jumpTarget }) {
  const navigate = useNavigate()
  const { canEditStage } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState({
    dateRange: null,
    maSp: '',
    tenTrinh: '',
    soLo: jumpTarget?.soLo || '',
    tinhTrang: ''
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [headerOffset, setHeaderOffset] = useState(46)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailSchedule, setDetailSchedule] = useState(null)
  const [highlightId, setHighlightId] = useState(null)
  const [nsMap, setNsMap] = useState({})
  const jumpApplied = useRef(false)
  const controlsRef = useRef(null)

  const fetchData = useCallback(async (page = 0, size = 20, f = filters) => {
    setLoading(true)
    try {
      const params = {
        page, size, congDoan, source: 'SCHEDULE',
        fromDate: f.dateRange?.[0]?.format('YYYY-MM-DD') || undefined,
        toDate: f.dateRange?.[1]?.format('YYYY-MM-DD') || undefined,
        maSp: f.maSp || undefined,
        tenTrinh: f.tenTrinh || undefined,
        soLo: f.soLo || undefined,
        tinhTrang: f.tinhTrang || undefined,
      }
      const { data: res } = await api.get('/work-schedule', { params })
      setData(res.content)
      setPagination(p => ({ ...p, total: res.totalElements }))
      // Fetch NS trung bình cho từng mã SP ngay sau khi có dữ liệu
      const uniqueMaSp = [...new Set(res.content.map(r => r.maSp).filter(Boolean))]
      if (uniqueMaSp.length > 0) {
        const nsField = NS_LOOKUP_FIELD[congDoan] || 'slTrungBinh'
        Promise.all(
          uniqueMaSp.map(maSp =>
            api.get(`/product-master/lookup/${encodeURIComponent(maSp)}`)
              .then(r => ({ maSp, ns: r.data[nsField] != null ? Number(r.data[nsField]) : null }))
              .catch(() => ({ maSp, ns: null }))
          )
        ).then(results => {
          const map = {}
          results.forEach(({ maSp, ns }) => { if (ns != null && ns > 0) map[maSp] = ns })
          setNsMap(map)
        })
      } else {
        setNsMap({})
      }
    } catch { message.error('Không thể tải dữ liệu') }
    finally { setLoading(false) }
  }, [congDoan, filters])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(0) }, [congDoan])

  // Sau khi dữ liệu tải xong, tìm hàng khớp jumpTarget và highlight/scroll
  useEffect(() => {
    if (!jumpTarget || jumpApplied.current || data.length === 0) return
    const match = data.find(r =>
      (r.tenTrinh || '').trim() === (jumpTarget.tienTrinh || '').trim() &&
      (r.soLo || '') === (jumpTarget.soLo || '')
    )
    if (match) {
      setHighlightId(match.id)
      jumpApplied.current = true
      setTimeout(() => {
        document.getElementById(`ws-row-${match.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 250)
    }
  }, [data])

  const getNsRowClass = (record) => {
    const slField = SL_FIELD_MAP[congDoan]
    const congField = CONG_FIELD_MAP[congDoan]
    if (!slField || !congField) return ''
    const sl = Number(record[slField]) || 0
    const cong = Number(record[congField]) || 0
    if (cong === 0) return ''
    const ns = sl / cong
    const avgNs = nsMap[record.maSp]
    if (avgNs == null || avgNs === 0) return ''
    if (ns > avgNs) return 'row-ns-high'
    if (ns < avgNs) return 'row-ns-low'
    return ''
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/work-schedule/${id}`)
      message.success('Đã xóa')
      fetchData(pagination.current - 1)
      parentOnSaved?.()
    } catch { message.error('Xóa thất bại') }
  }

  useEffect(() => {
    if (controlsRef.current) setHeaderOffset(46 + controlsRef.current.offsetHeight + 8)
  })

  const onSaved = () => { fetchData(0); parentOnSaved?.() }

  const columns = [
    {
      title: 'Ngày TH', dataIndex: 'ngayThucHien', key: 'ngayThucHien', width: 95, fixed: 'left',
      render: v => v ? (
        <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{dayjs(v).format('DD/MM')}</div>
          <div style={{ color: '#8c8c8c', fontSize: 11 }}>{dayjs(v).format('YYYY')}</div>
        </div>
      ) : '—'
    },
    {
      title: 'Mã SP', dataIndex: 'maSp', key: 'maSp', width: 80, fixed: 'left', align: 'center',
      render: v => v ? <Tag color="blue" style={{ fontWeight: 600, marginRight: 0 }}>{v}</Tag> : '—'
    },
    {
      title: 'Tiến trình', dataIndex: 'tenTrinh', key: 'tenTrinh', width: 210, fixed: 'left',
      render: (v, record) => (
        <div>
          <div
            style={{ color: '#1677ff', cursor: 'pointer', fontWeight: 500, lineHeight: 1.4, marginBottom: 2, wordBreak: 'break-word' }}
            onClick={() => { setDetailSchedule(record); setDetailOpen(true) }}
          >
            {v || '—'}
          </div>
          <Button
            type="link" size="small" icon={<LinkOutlined />}
            style={{ padding: 0, height: 'auto', fontSize: 11, color: '#52c41a' }}
            onClick={() => navigate('/', { state: { backJump: { tienTrinh: record.tenTrinh, soLo: record.soLo, maTp: record.maSp } } })}
          >
            Xem SL
          </Button>
        </div>
      )
    },
    {
      title: 'Số lô', dataIndex: 'soLo', key: 'soLo', width: 82, fixed: 'left',
      render: v => <span style={{ color: '#595959', fontFamily: 'monospace', fontSize: 12 }}>{v || '—'}</span>
    },
    {
      title: 'Cỡ lô', dataIndex: 'coLo', key: 'coLo', width: 80, align: 'right',
      render: v => (v != null && v !== '') ? <span style={{ fontWeight: 500 }}>{Number(v).toLocaleString('vi-VN')}</span> : <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Tổ/Nhóm TH', dataIndex: 'toNhom', key: 'toNhom', width: 120, ellipsis: true,
      render: v => v ? <span style={{ whiteSpace: 'pre-wrap' }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Phòng TH', dataIndex: 'phongThucHien', key: 'phongThucHien', width: 100,
      render: v => v || <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Trưởng ca', dataIndex: 'truongCa', key: 'truongCa', width: 100,
      render: v => v || <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Người HT', dataIndex: 'nguoiHoTro', key: 'nguoiHoTro', width: 120, ellipsis: true,
      render: v => v ? <span style={{ whiteSpace: 'pre-wrap' }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Chú ý', dataIndex: 'chuY', key: 'chuY', width: 120, ellipsis: true,
      render: v => v
        ? <Tooltip title={v}><span style={{ color: '#8c8c8c' }}>{v}</span></Tooltip>
        : <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Sai lệch', dataIndex: 'saiLech', key: 'saiLech', width: 90, align: 'center',
      render: v => v
        ? <Tooltip title={v}><Tag color="orange" icon={<WarningOutlined />} style={{ marginRight: 0 }}>Có</Tag></Tooltip>
        : <Tag color="green" style={{ marginRight: 0 }}>Không</Tag>
    },
    ...config.extraTableCols,
    {
      title: 'Năng suất', key: 'ns', width: 165, align: 'right',
      render: (_, record) => {
        const slField = SL_FIELD_MAP[congDoan]
        const congField = CONG_FIELD_MAP[congDoan]
        if (!slField || !congField) return <span style={{ color: '#d9d9d9' }}>—</span>
        const sl = Number(record[slField]) || 0
        const cong = Number(record[congField]) || 0
        if (sl === 0 || cong === 0) return <span style={{ color: '#d9d9d9' }}>—</span>
        const ns = sl / cong
        const avgNs = nsMap[record.maSp]
        let color = '#262626'
        let arrow = ''
        if (avgNs && ns > avgNs) { color = '#389e0d'; arrow = ' ▲' }
        if (avgNs && ns < avgNs) { color = '#cf1322'; arrow = ' ▼' }
        if (!avgNs) return <span style={{ fontWeight: 600, color }}>{Math.round(ns).toLocaleString('vi-VN')}</span>
        const delta = ns - avgNs
        const pct = (delta / avgNs) * 100
        const sign = delta >= 0 ? '+' : ''
        return (
          <span style={{ fontWeight: 600, color }}>
            {Math.round(ns).toLocaleString('vi-VN')}
            <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 3 }}>
              {sign}{Math.round(delta).toLocaleString('vi-VN')} ({sign}{pct.toFixed(2)}%){arrow}
            </span>
          </span>
        )
      }
    },
    {
      title: 'Tình trạng', dataIndex: 'tinhTrang', key: 'tinhTrang', width: 100, align: 'center',
      render: tinhTrangTag
    },
    {
      title: 'Thao tác', key: 'action', width: 80, fixed: 'right', align: 'center',
      render: (_, record) => canEditStage(congDoan) ? (
        <Space size={4}>
          <Button size="small" type="text" icon={<EditOutlined />} style={{ color: '#1677ff' }}
            onClick={() => { setEditItem(record); setModalOpen(true) }} />
          <Popconfirm title="Xóa công việc này?" onConfirm={() => handleDelete(record.id)}
            okText="Xóa" cancelText="Hủy">
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ) : null
    }
  ]

  return (
    <>
      <div ref={controlsRef} style={{ position: 'sticky', top: 46, zIndex: 9, background: '#fff', paddingBottom: 8 }}>
        <Card style={{ marginBottom: 8 }}>
          <Row gutter={[12, 8]} align="bottom">
            <Col xs={24} md={8}>
              <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY"
                placeholder={['Từ ngày', 'Đến ngày']}
                value={filters.dateRange}
                onChange={v => setFilters(f => ({ ...f, dateRange: v }))} />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Input placeholder="Mã SP" value={filters.maSp} allowClear
                onChange={e => setFilters(f => ({ ...f, maSp: e.target.value }))}
                onPressEnter={() => fetchData(0)} />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Input placeholder="Tiến trình" value={filters.tenTrinh} allowClear
                onChange={e => setFilters(f => ({ ...f, tenTrinh: e.target.value }))}
                onPressEnter={() => fetchData(0)} />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Input placeholder="Lô sản xuất" value={filters.soLo} allowClear
                onChange={e => setFilters(f => ({ ...f, soLo: e.target.value }))}
                onPressEnter={() => fetchData(0)} />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Select style={{ width: '100%' }} placeholder="Tình trạng" allowClear
                value={filters.tinhTrang || undefined}
                onChange={v => setFilters(f => ({ ...f, tinhTrang: v || '' }))}>
                <Option value="done">Done</Option>
                <Option value="doing">Doing</Option>
              </Select>
            </Col>
            <Col>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchData(0)}>Tìm</Button>
                <Button icon={<ReloadOutlined />} onClick={() => {
                  const reset = { dateRange: null, maSp: '', tenTrinh: '', soLo: '', tinhTrang: '' }
                  setFilters(reset)
                  fetchData(0, 20, reset)
                }} />
                {canEditStage(congDoan) && (
                  <Button type="primary" icon={<PlusOutlined />}
                    onClick={() => { setEditItem(null); setModalOpen(true) }}>
                    Thêm mới
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </Card>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1600 + config.extraTableCols.length * 87 }}
        size="small"
        sticky={{ offsetHeader: headerOffset }}
        rowHoverable={false}
        rowClassName={record => {
          const slField = SL_FIELD_MAP[congDoan]
          const sl = slField ? Number(record[slField]) || 0 : 0
          const coLo = Number(record.coLo) || 0
          const slExceeds = sl > 0 && coLo > 0 && sl > coLo
          if (record.id === highlightId && record.saiLech) return 'row-has-deviation row-jump-highlight'
          if (record.id === highlightId) return 'row-jump-highlight'
          if (record.saiLech) return 'row-has-deviation'
          if (slExceeds) return 'row-sl-exceed'
          return getNsRowClass(record)
        }}
        onRow={record => ({ id: `ws-row-${record.id}` })}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: t => `Tổng ${t} bản ghi`,
          onChange: (p, ps) => {
            setPagination(prev => ({ ...prev, current: p, pageSize: ps }))
            fetchData(p - 1, ps)
          }
        }}
      />

      <WorkScheduleModal
        open={modalOpen}
        editItem={editItem}
        congDoan={congDoan}
        extraFormFields={config.extraFormFields}
        onClose={() => setModalOpen(false)}
        onSaved={onSaved}
      />

      <WorkDetailDrawer
        open={detailOpen}
        schedule={detailSchedule}
        onClose={() => setDetailOpen(false)}
        onSaved={onSaved}
      />
    </>
  )
}

// ── Admin Approval Panel ───────────────────────────────────────────────────────
function AdminApprovalPanel() {
  const [open, setOpen] = useState(false)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [rejectId, setRejectId] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [acting, setActing] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/sl-change-request/pending')
      setRequests(data)
    } catch { message.error('Không thể tải danh sách') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const approve = async (id) => {
    setActing(id)
    try {
      await api.put(`/sl-change-request/${id}/approve`)
      message.success('Đã duyệt')
      setRequests(prev => prev.filter(r => r.id !== id))
    } catch (e) { message.error(e?.response?.data?.message || 'Duyệt thất bại') }
    finally { setActing(null) }
  }

  const reject = async (id) => {
    setActing(id)
    try {
      await api.put(`/sl-change-request/${id}/reject`, { note: rejectNote })
      message.success('Đã từ chối')
      setRequests(prev => prev.filter(r => r.id !== id))
      setRejectId(null)
      setRejectNote('')
    } catch (e) { message.error(e?.response?.data?.message || 'Từ chối thất bại') }
    finally { setActing(null) }
  }

  const count = requests.length
  return (
    <>
      <Tooltip title="Yêu cầu thay đổi sản lượng">
        <Badge count={count} size="small">
          <Button icon={<BellOutlined />} onClick={() => { setOpen(true); load() }}
            type={count > 0 ? 'primary' : 'default'}
            style={{ marginRight: 8 }}>
            Duyệt SL{count > 0 ? ` (${count})` : ''}
          </Button>
        </Badge>
      </Tooltip>

      <Drawer
        title={<Space><BellOutlined />Yêu cầu thay đổi sản lượng chờ duyệt</Space>}
        open={open}
        onClose={() => setOpen(false)}
        width={700}
        extra={<Button size="small" icon={<ReloadOutlined />} onClick={load} loading={loading}>Làm mới</Button>}
      >
        {loading ? <Spin /> : requests.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>Không có yêu cầu nào</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {requests.map(r => (
              <Card key={r.id} size="small" style={{ borderLeft: '4px solid #fa8c16' }}>
                <Row gutter={[8, 4]} align="middle">
                  <Col span={12}>
                    <Space wrap>
                      <Tag color="blue">{r.maSp}</Tag>
                      <Tag color="purple">{r.congDoan}</Tag>
                      <span style={{ fontSize: 12, color: '#595959' }}>LSX: {r.soLo}</span>
                    </Space>
                  </Col>
                  <Col span={12} style={{ textAlign: 'right', fontSize: 12, color: '#595959' }}>
                    {r.requestedBy} · {dayjs(r.requestedAt).format('DD/MM/YYYY HH:mm')}
                  </Col>
                  <Col span={24} style={{ fontSize: 13 }}>
                    <span style={{ color: '#595959' }}>{r.tenTrinh}</span>
                    <span style={{ marginLeft: 8, color: '#8c8c8c', fontSize: 12 }}>
                      Ngày: {r.ngay ? dayjs(r.ngay).format('DD/MM/YYYY') : '—'}
                    </span>
                  </Col>
                  <Col span={24}>
                    <Space size={4} align="center">
                      <span style={{ fontSize: 13, color: '#595959' }}>SL cũ:</span>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {r.oldValue != null ? Number(r.oldValue).toLocaleString('vi-VN') : '—'}
                      </span>
                      <span style={{ color: '#8c8c8c' }}>→</span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1677ff' }}>
                        {Number(r.newValue).toLocaleString('vi-VN')}
                      </span>
                    </Space>
                  </Col>
                  {rejectId === r.id ? (
                    <Col span={24}>
                      <Space.Compact style={{ width: '100%' }}>
                        <Input placeholder="Lý do từ chối (tuỳ chọn)" value={rejectNote}
                          onChange={e => setRejectNote(e.target.value)}
                          onPressEnter={() => reject(r.id)} />
                        <Button type="primary" danger loading={acting === r.id}
                          onClick={() => reject(r.id)}>Xác nhận từ chối</Button>
                        <Button onClick={() => { setRejectId(null); setRejectNote('') }}>Huỷ</Button>
                      </Space.Compact>
                    </Col>
                  ) : (
                    <Col span={24} style={{ textAlign: 'right' }}>
                      <Space>
                        <Button type="primary" icon={<CheckOutlined />} size="small"
                          loading={acting === r.id}
                          onClick={() => approve(r.id)}>Duyệt</Button>
                        <Button danger icon={<CloseOutlined />} size="small"
                          onClick={() => { setRejectId(r.id); setRejectNote('') }}>Từ chối</Button>
                      </Space>
                    </Col>
                  )}
                </Row>
              </Card>
            ))}
          </div>
        )}
      </Drawer>
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WorkSchedulePage() {
  const { isAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const jumpInit = location.state?.jumpTo || null
  const [activeTab, setActiveTab] = useState(jumpInit?.stage || 'PC')
  const [jumpTarget] = useState(jumpInit)

  useEffect(() => {
    if (jumpInit) navigate(location.pathname, { replace: true, state: {} })
  }, [])
  const [devCount, setDevCount] = useState(0)
  const [devData, setDevData] = useState([])
  const [devLoading, setDevLoading] = useState(false)
  const [devPagination, setDevPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [devFilters, setDevFilters] = useState({ dateRange: null, maSp: '' })
  const [devModalOpen, setDevModalOpen] = useState(false)
  const [devEditItem, setDevEditItem] = useState(null)

  const refreshDevCount = useCallback(async () => {
    try {
      const { data } = await api.get('/work-schedule/deviations', { params: { page: 0, size: 1 } })
      setDevCount(data.totalElements)
    } catch {}
  }, [])

  const fetchDeviations = useCallback(async (page = 0, size = 20, f = devFilters) => {
    setDevLoading(true)
    try {
      const params = {
        page, size,
        fromDate: f.dateRange?.[0]?.format('YYYY-MM-DD') || undefined,
        toDate: f.dateRange?.[1]?.format('YYYY-MM-DD') || undefined,
        maSp: f.maSp || undefined,
      }
      const { data: res } = await api.get('/work-schedule/deviations', { params })
      setDevData(res.content)
      setDevPagination(p => ({ ...p, total: res.totalElements }))
      setDevCount(res.totalElements)
    } catch { message.error('Không thể tải sai lệch') }
    finally { setDevLoading(false) }
  }, [devFilters])

  useEffect(() => { refreshDevCount() }, [])

  const deviationColumns = [
    {
      title: 'Ngày', dataIndex: 'ngayThucHien', key: 'ngayThucHien', width: 110,
      render: v => v ? dayjs(v).format('DD/MM/YYYY') : '-'
    },
    {
      title: 'Mã SP', dataIndex: 'maSp', key: 'maSp', width: 90,
      render: v => v ? <Tag color="blue">{v}</Tag> : '-'
    },
    {
      title: 'Công đoạn', dataIndex: 'congDoan', key: 'congDoan', width: 95,
      render: v => v ? <Tag color="purple">{v}</Tag> : '-'
    },
    {
      title: 'TIẾN TRÌNH', dataIndex: 'tenTrinh', key: 'tenTrinh',
      render: v => <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{v || '-'}</span>
    },
    { title: 'Số lô', dataIndex: 'soLo', key: 'soLo', width: 90 },
    { title: 'Cỡ lô', dataIndex: 'coLo', key: 'coLo', width: 80, align: 'right' },
    {
      title: 'Nội dung sai lệch', dataIndex: 'saiLech', key: 'saiLech',
      render: v => (
        <Typography.Text style={{ color: '#d46b08', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{v}</Typography.Text>
      )
    },
    { title: 'Tình trạng', dataIndex: 'tinhTrang', key: 'tinhTrang', width: 100, render: tinhTrangTag },
    {
      title: 'Chi tiết', key: 'action', width: 80,
      render: (_, record) => (
        <Button size="small" icon={<EditOutlined />}
          onClick={() => { setDevEditItem(record); setDevModalOpen(true) }}>
          Xem
        </Button>
      )
    },
  ]

  const tabItems = [
    ...Object.entries(STAGE_CONFIG).map(([stage, config]) => ({
      key: stage,
      label: config.label,
      children: (
        <StageTab
          congDoan={stage}
          config={config}
          onSaved={refreshDevCount}
          jumpTarget={jumpTarget?.stage === stage ? jumpTarget : null}
        />
      )
    })),
    {
      key: 'deviation',
      label: (
        <Space>
          <WarningOutlined style={{ color: '#fa8c16' }} />
          <span>Sai lệch</span>
          {devCount > 0 && <Badge count={devCount} overflowCount={99} />}
        </Space>
      ),
      children: (
        <>
          <Card style={{ marginBottom: 12, borderColor: '#fa8c16', background: '#fffbe6' }}
            styles={{ body: { padding: '8px 16px' } }}>
            <Space>
              <WarningOutlined style={{ color: '#fa8c16', fontSize: 16 }} />
              <Typography.Text>
                Danh sách công việc <strong>có sai lệch</strong> — tổng hợp từ tất cả công đoạn.
              </Typography.Text>
            </Space>
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <Row gutter={[12, 8]} align="bottom">
              <Col xs={24} md={8}>
                <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY"
                  placeholder={['Từ ngày', 'Đến ngày']}
                  value={devFilters.dateRange}
                  onChange={v => setDevFilters(f => ({ ...f, dateRange: v }))} />
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Input placeholder="Mã SP" value={devFilters.maSp} allowClear
                  onChange={e => setDevFilters(f => ({ ...f, maSp: e.target.value }))}
                  onPressEnter={() => fetchDeviations(0)} />
              </Col>
              <Col>
                <Space>
                  <Button type="primary" icon={<SearchOutlined />}
                    onClick={() => fetchDeviations(0)}>Tìm</Button>
                  <Button icon={<ReloadOutlined />} onClick={() => {
                    const reset = { dateRange: null, maSp: '' }
                    setDevFilters(reset)
                    fetchDeviations(0, 20, reset)
                  }} />
                </Space>
              </Col>
            </Row>
          </Card>

          <Table
            columns={deviationColumns}
            dataSource={devData}
            rowKey="id"
            loading={devLoading}
            rowHoverable={false}
            scroll={{ x: 1000 }}
            size="small"
            sticky={{ offsetHeader: 46 }}
            pagination={{
              ...devPagination,
              showSizeChanger: true,
              showTotal: t => `Tổng ${t} sai lệch`,
              onChange: (p, ps) => {
                setDevPagination(prev => ({ ...prev, current: p, pageSize: ps }))
                fetchDeviations(p - 1, ps)
              }
            }}
          />

          <WorkScheduleModal
            open={devModalOpen}
            editItem={devEditItem}
            congDoan={devEditItem?.congDoan}
            extraFormFields={STAGE_CONFIG[devEditItem?.congDoan]?.extraFormFields || []}
            onClose={() => setDevModalOpen(false)}
            onSaved={() => { fetchDeviations(0); refreshDevCount() }}
          />
        </>
      )
    }
  ]

  return (
    <>
      <style>{`
        .ant-table-tbody > tr.row-has-deviation > td { background: #fff7e6 !important; }
        .ant-table-tbody > tr.row-jump-highlight > td { background: #e6fffb !important; border-top: 2px solid #5cdbd3; border-bottom: 2px solid #5cdbd3; }
        .ant-table-tbody > tr.row-ns-high > td { background: #f6ffed !important; }
        .ant-table-tbody > tr.row-ns-low > td { background: #ffb3b0 !important; }
        .ant-table-tbody > tr.row-sl-exceed > td { background: #f9f0ff !important; }
        .ant-table-thead > tr > th.ant-table-cell { text-align: center !important; text-transform: uppercase; font-size: 11px; letter-spacing: 0.4px; color: #595959; background: #fafafa; }
        .ant-table-tbody > tr > td.ant-table-cell { vertical-align: middle; }
        .ant-table-tbody > tr > td { border-bottom: 1px solid #f0f0f0 !important; }
      `}</style>

      <Tabs
        activeKey={activeTab}
        onChange={key => {
          setActiveTab(key)
          if (key === 'deviation') fetchDeviations(0)
        }}
        items={tabItems}
        type="card"
        size="large"
        tabBarExtraContent={
          <Space>
            {isAdmin() && <AdminApprovalPanel />}
            <Typography.Text strong style={{ marginRight: 8, fontSize: 15 }}>
              Lịch làm việc sản xuất
            </Typography.Text>
          </Space>
        }
        tabBarStyle={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff', margin: 0, paddingBottom: 0 }}
      />
    </>
  )
}
