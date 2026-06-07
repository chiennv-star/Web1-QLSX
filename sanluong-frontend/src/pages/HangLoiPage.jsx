import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space,
  DatePicker, message, Popconfirm, Row, Col, AutoComplete,
  Spin, Tabs, InputNumber, Tooltip, Badge,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  SearchOutlined, ReloadOutlined, WarningOutlined, SaveOutlined,
  CheckSquareOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const PHAN_LOAI_OPTIONS = [
  { value: 'PCPL',        color: 'green' },
  { value: 'PCPL3',       color: 'red' },
  { value: 'KXĐ',         color: 'orange' },
  { value: 'Đóng gói',    color: 'geekblue' },
  { value: 'Nguyên liệu', color: 'blue' },
  { value: 'Khác',        color: 'default' },
]
const HUONG_XU_LY_OPTIONS = ['Xử lý', 'Bán thanh lý']
const TRANG_THAI_OPTIONS   = ['Đang xử lý', 'Đã hoàn thành']

const phanLoaiColor = (val) =>
  (PHAN_LOAI_OPTIONS.find(o => o.value === val) || {}).color || 'default'

// ── Design tokens (15% larger vs. previous) ───────────────────────────────────
const F = {           // font sizes
  xs:  12,            // tiny label
  sm:  13,            // section header
  md:  15,            // field label / tag
  lg:  16,            // input value text
  xl:  17,            // modal title
}

// Section card wrapper
const mkCard = (accent) => ({
  background: '#fff',
  borderRadius: 8,
  boxShadow: '0 1px 6px rgba(58,85,112,0.10)',
  border: `1px solid ${accent}33`,
  borderLeft: `4px solid ${accent}`,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
})

// Section card header
const mkCardHdr = (accent) => ({
  background: `${accent}12`,
  borderBottom: `1px solid ${accent}28`,
  padding: '7px 14px',
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  color: accent,
  fontWeight: 800,
  fontSize: F.sm,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  flexShrink: 0,
})

const cardBody = {
  padding: '12px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 11,
  flex: 1,
}

// Field wrapper with label
const Fld = ({ label, children, style, urgent }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, ...style }}>
    <span style={{
      fontSize: F.xs, fontWeight: 700, color: urgent ? '#f97316' : '#64748b',
      letterSpacing: '0.3px', userSelect: 'none',
      display: 'flex', alignItems: 'center', gap: 4,
    }}>
      {urgent && <span style={{ color: '#f97316' }}>⚠</span>}{label}
    </span>
    {children}
  </div>
)

const numFmt = { formatter: v => v ? Number(v).toLocaleString('vi-VN') : '', parser: v => v ? v.replace(/[^\d]/g, '') : '' }
const INP = { fontSize: F.lg }

// ─────────────────────────────────────────────────────────────────────────────
function HangTraLaiTab({ stickyTop = 0 }) {
  const { canEditHangLoi } = useAuth()
  const canEdit = canEditHangLoi()

  const filterRef = useRef(null)
  const [filterH, setFilterH] = useState(0)
  useEffect(() => {
    if (!filterRef.current) return
    const obs = new ResizeObserver(() => setFilterH(filterRef.current?.offsetHeight || 0))
    obs.observe(filterRef.current)
    return () => obs.disconnect()
  }, [])

  const [data, setData]             = useState([])
  const [loading, setLoading]       = useState(false)
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(0)
  const [modalOpen, setModalOpen]   = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [saving, setSaving]         = useState(false)
  const [savingCell, setSavingCell] = useState(null)
  const [acOptions, setAcOptions]   = useState([])
  const [acLoading, setAcLoading]   = useState(false)
  const acTimer                      = useRef(null)
  const dataRef                      = useRef(data)
  const [form]                       = Form.useForm()

  const [fromDate, setFromDate] = useState(null)
  const [toDate, setToDate]     = useState(null)
  const [keyword, setKeyword]   = useState('')
  const _initTab                = localStorage.getItem('hangLoi_subTab') || 'chua-xu-ly'
  const [subTab, setSubTab]     = useState(_initTab)
  const subTabRef               = useRef(_initTab)
  const pageRef                 = useRef(0)
  const [tabCounts, setTabCounts] = useState({ 'chua-xu-ly': 0, 'dang-xu-ly': 0, 'da-hoan-thanh': 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [bulkDeleting, setBulkDeleting] = useState(false)

  useEffect(() => { dataRef.current = data }, [data])
  useEffect(() => { subTabRef.current = subTab }, [subTab])
  useEffect(() => { pageRef.current = page }, [page])

  // Map tab key → trangThai param gửi lên backend
  const tabToTrangThai = (tab) => {
    if (tab === 'chua-xu-ly')   return 'CHUA_XU_LY'
    if (tab === 'dang-xu-ly')   return 'Đang xử lý'
    if (tab === 'da-hoan-thanh') return 'Đã hoàn thành'
    return 'CHUA_XU_LY'
  }

  const load = useCallback(async (pg = 0, tabOverride, { silent = false } = {}) => {
    const tab = tabOverride ?? subTabRef.current
    if (!silent) setLoading(true)
    try {
      const { data: res } = await api.get('/hang-loi', {
        params: {
          fromDate:  fromDate ? fromDate.format('YYYY-MM-DD') : undefined,
          toDate:    toDate   ? toDate.format('YYYY-MM-DD')   : undefined,
          keyword:   keyword || undefined,
          trangThai: tabToTrangThai(tab),
          page: pg, size: 50,
        },
      })
      setData(res.content)
      setTotal(res.totalElements)
      setPage(pg)
      // Cập nhật count cho tab hiện tại
      setTabCounts(prev => ({ ...prev, [tab]: res.totalElements }))
    } catch { message.error('Tải dữ liệu thất bại') }
    finally { if (!silent) setLoading(false) }
  }, [fromDate, toDate, keyword])

  useEffect(() => { load(0) }, [])

  useEffect(() => {
    const handler = () => load(pageRef.current, undefined, { silent: true })
    window.addEventListener('app:silent-refresh', handler)
    return () => window.removeEventListener('app:silent-refresh', handler)
  }, [load])

  const switchSubTab = (tab) => {
    setSubTab(tab)
    subTabRef.current = tab
    localStorage.setItem('hangLoi_subTab', tab)
    setSelectedRowKeys([])
    load(0, tab)
  }

  const openAdd = () => { setEditRecord(null); form.resetFields(); setModalOpen(true) }

  const openEdit = (record) => {
    setEditRecord(record)
    form.setFieldsValue({
      mtpCoMem:      record.mtpCoMem,
      mtpSongAn:     record.mtpSongAn,
      tenHangHoa:    record.tenHangHoa,
      soLo:          record.soLo,
      soLuong:       record.soLuong,
      liDoTraVe:     record.liDoTraVe,
      namXuLy:       record.namXuLy,
      huongXuLy:     record.huongXuLy,
      phanLoaiLoi:   record.phanLoaiLoi ? record.phanLoaiLoi.split(',').map(s => s.trim()).filter(Boolean) : [],
      ngayBatDau:    record.ngayBatDau  ? dayjs(record.ngayBatDau)  : null,
      ngayKetThuc:   record.ngayKetThuc ? dayjs(record.ngayKetThuc) : null,
      trangThaiXuLy:     record.trangThaiXuLy,
      lyDoChuaThucHien:  record.lyDoChuaThucHien,
      ghiChu:            record.ghiChu,
      slDatSauXuLy:      record.slDatSauXuLy,
      slHuy:             record.slHuy,
      soLuongTraVe:      record.soLuongTraVe,
    })
    setModalOpen(true)
  }

  const buildPayload = (values) => ({
    mtpCoMem:      values.mtpCoMem      || null,
    mtpSongAn:     values.mtpSongAn     || null,
    tenHangHoa:    values.tenHangHoa    || null,
    soLo:          values.soLo          || null,
    soLuong:       values.soLuong       ?? null,
    liDoTraVe:     values.liDoTraVe     || null,
    namXuLy:       values.namXuLy       || null,
    huongXuLy:     values.huongXuLy     || null,
    phanLoaiLoi:   Array.isArray(values.phanLoaiLoi)
                     ? values.phanLoaiLoi.join(',') : (values.phanLoaiLoi || null),
    ngayBatDau:    values.ngayBatDau    ? values.ngayBatDau.format('YYYY-MM-DD')  : null,
    ngayKetThuc:   values.ngayKetThuc   ? values.ngayKetThuc.format('YYYY-MM-DD') : null,
    trangThaiXuLy:    values.trangThaiXuLy    || null,
    lyDoChuaThucHien: values.lyDoChuaThucHien || null,
    ghiChu:           values.ghiChu           || null,
    slDatSauXuLy:     values.slDatSauXuLy     ?? null,
    slHuy:            values.slHuy            ?? null,
    soLuongTraVe:     values.soLuongTraVe     ?? null,
  })

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload = buildPayload(values)
      if (editRecord) {
        const { data: updated } = await api.put(`/hang-loi/${editRecord.id}`, payload)
        setData(prev => prev.map(r => r.id === editRecord.id ? updated : r))
        message.success('Cập nhật thành công — đã đồng bộ sang bản ghi Sản lượng')
      } else {
        const { data: created } = await api.post('/hang-loi', payload)
        setData(prev => [created, ...prev])
        setTotal(t => t + 1)
        message.success('Thêm mới thành công — đã đồng bộ sang bản ghi Sản lượng')
      }
      setModalOpen(false)
    } catch { message.error('Lưu thất bại') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/hang-loi/${id}`)
      setData(prev => prev.filter(r => r.id !== id))
      setTotal(t => t - 1)
      message.success('Đã xóa')
    } catch { message.error('Xóa thất bại') }
  }

  const handleBulkDelete = async () => {
    if (!selectedRowKeys.length) return
    setBulkDeleting(true)
    let successCount = 0
    let failCount = 0
    for (const id of selectedRowKeys) {
      try {
        await api.delete(`/hang-loi/${id}`)
        successCount++
      } catch {
        failCount++
      }
    }
    setData(prev => prev.filter(r => !selectedRowKeys.includes(r.id)))
    setTotal(t => t - successCount)
    setSelectedRowKeys([])
    setBulkDeleting(false)
    if (failCount === 0) {
      message.success(`Đã xóa ${successCount} bản ghi`)
    } else {
      message.warning(`Xóa ${successCount} thành công, ${failCount} thất bại`)
    }
  }

  const patchRecord = useCallback(async (recordId, field, value) => {
    const record = dataRef.current.find(r => r.id === recordId)
    if (!record) return
    setSavingCell(`${recordId}-${field}`)
    try {
      const payload = {
        mtpCoMem: record.mtpCoMem, mtpSongAn: record.mtpSongAn,
        tenHangHoa: record.tenHangHoa, soLo: record.soLo,
        soLuong: record.soLuong, liDoTraVe: record.liDoTraVe,
        namXuLy: record.namXuLy, huongXuLy: record.huongXuLy,
        phanLoaiLoi: record.phanLoaiLoi, ngayBatDau: record.ngayBatDau,
        ngayKetThuc: record.ngayKetThuc, trangThaiXuLy: record.trangThaiXuLy,
        lyDoChuaThucHien: record.lyDoChuaThucHien,
        ghiChu: record.ghiChu, slDatSauXuLy: record.slDatSauXuLy,
        slHuy: record.slHuy, soLuongTraVe: record.soLuongTraVe, [field]: value,
      }
      const { data: updated } = await api.put(`/hang-loi/${recordId}`, payload)
      if (field === 'trangThaiXuLy') {
        // Xác định tab đích dựa theo giá trị mới
        const targetTab = value === 'Đã hoàn thành' ? 'da-hoan-thanh'
                        : value === 'Đang xử lý'    ? 'dang-xu-ly'
                        : 'chua-xu-ly'
        const currentTab = subTabRef.current
        if (targetTab !== currentTab) {
          // Bản ghi chuyển sang tab khác — xóa khỏi danh sách hiện tại
          setData(prev => prev.filter(r => r.id !== recordId))
          setTotal(t => t - 1)
          const msg = targetTab === 'da-hoan-thanh' ? '✓ Đã hoàn thành — chuyển sang tab Đã hoàn thành'
                    : targetTab === 'dang-xu-ly'    ? '↩ Chuyển sang Đang xử lý'
                    : '↩ Chuyển về Chưa xử lý'
          message.success(msg)
          setSubTab(targetTab)
          subTabRef.current = targetTab
          localStorage.setItem('hangLoi_subTab', targetTab)
          load(0, targetTab)
        } else {
          setData(prev => prev.map(r => r.id === recordId ? updated : r))
        }
      } else {
        setData(prev => prev.map(r => r.id === recordId ? updated : r))
      }
    } catch { message.error('Lưu thất bại') }
    finally { setSavingCell(null) }
  }, [load])

  const searchSchedules = (q) => {
    clearTimeout(acTimer.current)
    if (!q || q.length < 2) { setAcOptions([]); return }
    setAcLoading(true)
    acTimer.current = setTimeout(async () => {
      try {
        const { data: res } = await api.get('/work-schedule', {
          params: { tenTrinh: q, page: 0, size: 15 },
        })
        setAcOptions((res.content || []).map(r => ({
          value: r.tenTrinh || '',
          label: (
            <div style={{ fontSize: 13 }}>
              <Tag color="blue" style={{ marginRight: 4 }}>{r.maSp}</Tag>
              {r.tenTrinh}
              {r.soLo && <span style={{ color: '#888', marginLeft: 4 }}>({r.soLo})</span>}
            </div>
          ),
          _raw: r,
        })))
      } catch {}
      finally { setAcLoading(false) }
    }, 350)
  }

  const onSelectSchedule = async (val, opt) => {
    const r = opt._raw
    form.setFieldsValue({ tenHangHoa: r.tenTrinh || '', mtpCoMem: r.maSp || '', soLo: r.soLo || '' })
    if (r.maSp) {
      try {
        const { data: pm } = await api.get(`/product-master/lookup/${encodeURIComponent(r.maSp)}`)
        form.setFieldsValue({ mtpSongAn: pm.maBravo || '' })
      } catch {}
    }
    setAcOptions([])
  }

  const dash = <span style={{ color: '#d9d9d9' }}>—</span>
  const fmtN = v => v != null ? Number(v).toLocaleString('vi-VN') : null

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Mã SP', dataIndex: 'mtpCoMem', width: 90, fixed: 'left',
      render: v => v ? <Tag color="blue" style={{ marginRight: 0, fontWeight: 700, fontSize: 13 }}>{v}</Tag> : dash,
    },
    {
      title: 'Mã Bravo', dataIndex: 'mtpSongAn', width: 115, fixed: 'left',
      render: v => v ? <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>{v}</span> : dash,
    },
    {
      title: 'Tiến Trình', dataIndex: 'tenHangHoa', width: 260, fixed: 'left',
      render: v => v ? <span style={{ fontWeight: 500, fontSize: 13 }}>{v}</span> : dash,
    },
    {
      title: 'Số Lô', dataIndex: 'soLo', width: 115, fixed: 'left',
      render: v => v ? <span style={{ fontFamily: 'monospace', color: '#2232b0', fontSize: 13 }}>{v}</span> : dash,
    },
    {
      title: 'Số Lượng', dataIndex: 'soLuong', width: 100, align: 'right',
      render: v => v != null ? <span style={{ fontWeight: 700, color: '#1f1fe7', fontSize: 13 }}>{fmtN(v)}</span> : dash,
    },
    {
      title: 'SL Trả Về', dataIndex: 'soLuongTraVe', width: 100, align: 'right',
      render: v => v != null ? <span style={{ fontWeight: 700, color: '#dc2626', fontSize: 13 }}>{fmtN(v)}</span> : dash,
    },
    {
      title: 'Lý Do Trả Về', dataIndex: 'liDoTraVe', width: 210,
      render: v => v ? <span style={{ fontSize: 13 }}>{v}</span> : dash,
    },
    {
      title: 'Người Xử Lý', dataIndex: 'namXuLy', width: 145,
      render: v => v ? <span style={{ fontSize: 13 }}>{v}</span> : dash,
    },
    {
      title: 'Hướng Xử Lý', dataIndex: 'huongXuLy', width: 155,
      render: (val, record) => canEdit ? (
        <div onClick={e => e.stopPropagation()}>
          <AutoComplete
            key={val || ''}
            size="small"
            defaultValue={val || ''}
            style={{ width: 138 }}
            options={HUONG_XU_LY_OPTIONS.map(o => ({ value: o, label: o }))}
            placeholder="—"
            filterOption={(input, opt) => opt.value.toLowerCase().includes(input.toLowerCase())}
            onSelect={v => patchRecord(record.id, 'huongXuLy', v || null)}
            onBlur={e => {
              const v = e.target.value?.trim()
              if (v !== (val || '')) patchRecord(record.id, 'huongXuLy', v || null)
            }}
          />
        </div>
      ) : (val ? <Tag color="blue" style={{ marginRight: 0 }}>{val}</Tag> : dash),
    },
    {
      title: 'Phân Loại Lỗi', dataIndex: 'phanLoaiLoi', width: 190,
      render: v => v
        ? v.split(',').map(s => s.trim()).filter(Boolean).map(s =>
            <Tag key={s} color={phanLoaiColor(s)} style={{ marginBottom: 2, marginRight: 2, fontSize: 12 }}>{s}</Tag>
          )
        : dash,
    },
    {
      title: 'Ngày BĐ', dataIndex: 'ngayBatDau', width: 105,
      render: v => v ? <span style={{ color: '#1677ff', fontSize: 13 }}>{dayjs(v).format('DD/MM/YYYY')}</span> : dash,
    },
    {
      title: 'Ngày KT', dataIndex: 'ngayKetThuc', width: 105,
      render: v => v ? <span style={{ color: '#f97316', fontSize: 13 }}>{dayjs(v).format('DD/MM/YYYY')}</span> : dash,
    },
    {
      title: 'Trạng Thái', dataIndex: 'trangThaiXuLy', width: 165,
      render: (val, record) => canEdit ? (
        <div onClick={e => e.stopPropagation()}>
          <Select size="small" value={val || undefined} style={{ width: 148 }}
            loading={savingCell === `${record.id}-trangThaiXuLy`}
            onChange={v => patchRecord(record.id, 'trangThaiXuLy', v ?? null)}
            options={TRANG_THAI_OPTIONS.map(o => ({ value: o, label: o }))}
            placeholder="—" allowClear />
        </div>
      ) : (val
        ? <Badge status={val === 'Đã hoàn thành' ? 'success' : 'processing'}
            text={<span style={{ fontSize: 13 }}>{val}</span>} />
        : dash),
    },
    {
      title: 'Lý Do Chưa TH', dataIndex: 'lyDoChuaThucHien', width: 200,
      render: v => v
        ? <span style={{ fontSize: 12, color: '#d46b08', fontStyle: 'italic' }}>⚠ {v}</span>
        : dash,
    },
    {
      title: 'Ghi Chú', dataIndex: 'ghiChu', width: 200,
      render: v => v ? <span style={{ fontSize: 13, color: '#64748b' }}>{v}</span> : dash,
    },
    {
      title: 'SL Đạt sau XL', dataIndex: 'slDatSauXuLy', width: 130, align: 'right',
      render: v => v != null ? <span style={{ fontWeight: 600, color: '#1D4ED8', fontSize: 13 }}>{fmtN(v)}</span> : dash,
    },
    {
      title: 'SL Hủy', dataIndex: 'slHuy', width: 95, align: 'right',
      render: v => v != null ? <span style={{ fontWeight: 600, color: '#ef4444', fontSize: 13 }}>{fmtN(v)}</span> : dash,
    },
    ...(canEdit ? [{
      title: '', key: 'actions', width: 75, fixed: 'right',
      render: (_, record) => (
        <Space size={4} onClick={e => e.stopPropagation()}>
          <Tooltip title="Sửa">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Popconfirm title="Xóa bản ghi này?" onConfirm={() => handleDelete(record.id)}
            okText="Xóa" cancelText="Hủy">
            <Tooltip title="Xóa">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ]

  // ── Accent colors ─────────────────────────────────────────────────────────
  const A = {
    slate:  '#475569',
    orange: '#f97316',
    blue:   '#1677ff',
    green:  '#22c55e',
    purple: '#3a7fed',
  }

  const TAB_COLORS = {
    'chua-xu-ly':   '#ef4444',
    'dang-xu-ly':   '#f97316',
    'da-hoan-thanh': '#16a34a',
  }

  const tabBtnStyle = (key) => ({
    padding: '5px 20px', borderRadius: '6px 6px 0 0', border: '1.5px solid',
    cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all 0.18s',
    borderBottom: 'none',
    ...(subTab === key
      ? { background: TAB_COLORS[key], borderColor: TAB_COLORS[key], color: '#fff' }
      : { background: '#f1f5f9', borderColor: '#d1d5db', color: '#64748b' }),
  })

  return (
    <>
      {/* ── Sub-tabs ── */}
      <div ref={filterRef} style={{
        position: 'sticky', top: stickyTop, zIndex: 9,
        background: '#fff', paddingTop: 8,
        borderBottom: '1px solid #e0f2e9',
      }}>
        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 0 }}>
          <button style={tabBtnStyle('chua-xu-ly')} onClick={() => switchSubTab('chua-xu-ly')}>
            <Badge count={tabCounts['chua-xu-ly']} size="small" offset={[6, -2]}
              style={{ background: '#ef4444', fontSize: 10 }}>
              ⚠ Chưa xử lý
            </Badge>
          </button>
          <button style={tabBtnStyle('dang-xu-ly')} onClick={() => switchSubTab('dang-xu-ly')}>
            ⟳ Đang xử lý
          </button>
          <button style={tabBtnStyle('da-hoan-thanh')} onClick={() => switchSubTab('da-hoan-thanh')}>
            ✓ Đã hoàn thành
          </button>
        </div>

        {/* Filter bar */}
        <div style={{
          background: subTab === 'da-hoan-thanh' ? '#f0fdf4' : subTab === 'dang-xu-ly' ? '#fff7ed' : '#fef2f2',
          borderTop: `2px solid ${TAB_COLORS[subTab] || '#ef4444'}`,
          padding: '6px 0 8px' }}>
          <Row gutter={8} align="middle" wrap={false}>
            <Col><DatePicker size="small" placeholder="Từ ngày" format="DD/MM/YYYY"
              value={fromDate} onChange={setFromDate} style={{ width: 130 }} /></Col>
            <Col><DatePicker size="small" placeholder="Đến ngày" format="DD/MM/YYYY"
              value={toDate} onChange={setToDate} style={{ width: 130 }} /></Col>
            <Col><Input size="small" placeholder="Tìm kiếm..." value={keyword}
              onChange={e => setKeyword(e.target.value)}
              prefix={<SearchOutlined style={{ color: '#bbb' }} />}
              style={{ width: 200 }} allowClear /></Col>
            <Col><Button size="small" type="primary" icon={<SearchOutlined />} onClick={() => load(0)}>Tìm</Button></Col>
            <Col><Button size="small" icon={<ReloadOutlined />} onClick={() => {
              setFromDate(null); setToDate(null); setKeyword(''); load(0)
            }} /></Col>
            {canEdit && (
              <Col flex="auto" style={{ textAlign: 'right' }}>
                <Space size={8}>
                  {selectedRowKeys.length > 0 && (
                    <Popconfirm
                      title={`Xóa ${selectedRowKeys.length} bản ghi đã chọn?`}
                      description="Hành động này không thể hoàn tác."
                      onConfirm={handleBulkDelete}
                      okText="Xóa tất cả"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        loading={bulkDeleting}
                        style={{ fontWeight: 600 }}
                      >
                        Xóa {selectedRowKeys.length} mục
                      </Button>
                    </Popconfirm>
                  )}
                  {subTab !== 'da-hoan-thanh' && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}
                      style={{ background: '#1D4ED8', borderColor: '#1D4ED8', fontWeight: 600 }}>
                      Thêm mới
                    </Button>
                  )}
                </Space>
              </Col>
            )}
          </Row>
        </div>
      </div>

      {/* ── Table ── */}
      <Table
        className="hl-table"
        rowKey="id" columns={columns} dataSource={data} loading={loading}
        scroll={{ x: 2000 }} sticky={{ offsetHeader: stickyTop + filterH }} size="small"
        rowClassName={(_, i) => i % 2 !== 0 ? 'row-stripe' : ''}
        rowSelection={canEdit ? {
          type: 'checkbox',
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
          columnWidth: 40,
          selections: [
            {
              key: 'select-page',
              text: 'Chọn trang này',
              onSelect: () => setSelectedRowKeys(data.map(r => r.id)),
            },
            {
              key: 'deselect-all',
              text: 'Bỏ chọn tất cả',
              onSelect: () => setSelectedRowKeys([]),
            },
          ],
        } : undefined}
        onRow={(record) => ({
          onClick: (e) => {
            if (e.target.closest('.ant-btn, .ant-select, .ant-popconfirm, .ant-popover, .ant-checkbox-wrapper')) return
            openEdit(record)
          },
          style: { cursor: 'pointer' },
        })}
        pagination={{
          current: page + 1, pageSize: 50, total,
          showTotal: t => `Tổng ${t} bản ghi`,
          onChange: p => load(p - 1),
        }}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          ADD / EDIT MODAL  — Card-based 2-row × 3-column layout
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={1060}
        footer={null}
        title={null}
        wrapClassName="hl-modal"
        styles={{ body: { padding: 0 } }}
        destroyOnClose
      >
        <Form form={form} layout="horizontal" component="div">

          {/* ── Modal header ── */}
          <div style={{
            background: '#1e4570',
            padding: '13px 20px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <WarningOutlined style={{ color: '#fbbf24', fontSize: 22 }} />
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: F.xl, letterSpacing: '0.3px' }}>
                {editRecord ? 'CHỈNH SỬA BẢN GHI HÀNG LỖI' : 'THÊM BẢN GHI HÀNG LỖI MỚI'}
              </div>
              <div style={{ color: '#93c5fd', fontSize: 12, marginTop: 1 }}>
                Điền đầy đủ thông tin — dữ liệu được lưu tức thời
              </div>
            </div>
          </div>

          {/* ══ LEFT / RIGHT split ══════════════════════════════════════════ */}
          <div style={{ display: 'flex', gap: 12, padding: 14, background: '#f1f5f9', alignItems: 'stretch' }}>

            {/* ═══════════════ LEFT PANEL (65%) ═══════════════ */}
            <div style={{ flex: 65, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>

              {/* ── Card: Nhận diện sản phẩm ── */}
              <div style={mkCard(A.slate)}>
                <div style={mkCardHdr(A.slate)}>
                  <span>📦</span> Nhận diện sản phẩm
                </div>
                <div style={{ ...cardBody, gap: 9 }}>
                  <Fld label="TIẾN TRÌNH / TÊN SẢN PHẨM">
                    <Form.Item name="tenHangHoa" noStyle>
                      <AutoComplete options={acOptions} onSearch={searchSchedules}
                        onSelect={onSelectSchedule} style={{ width: '100%' }}
                        notFoundContent={acLoading ? <Spin size="small" /> : null}
                        placeholder="Gõ để tìm — tự điền Mã SP, Mã Bravo, Số lô">
                        <Input style={INP} />
                      </AutoComplete>
                    </Form.Item>
                  </Fld>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Fld label="MÃ SP" style={{ flex: 1 }}>
                      <Form.Item name="mtpCoMem" noStyle>
                        <Input style={{ ...INP, fontWeight: 700, color: '#1677ff' }} placeholder="TP449" />
                      </Form.Item>
                    </Fld>
                    <Fld label="MÃ BRAVO" style={{ flex: 1 }}>
                      <Form.Item name="mtpSongAn" noStyle>
                        <Input style={{ ...INP, fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }} placeholder="10204449" />
                      </Form.Item>
                    </Fld>
                  </div>
                </div>
              </div>

              {/* ── Row: Lô sản xuất + Thời gian ── */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>

                {/* Card: Lô sản xuất — orange */}
                <div style={{ ...mkCard(A.orange), flex: 3 }}>
                  <div style={mkCardHdr(A.orange)}>
                    <span>🏭</span> Lô sản xuất
                  </div>
                  <div style={{ ...cardBody, gap: 9 }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <Fld label="SỐ LÔ (LSX)" style={{ flex: 1.4 }}>
                        <Form.Item name="soLo" noStyle>
                          <Input style={{ ...INP, fontFamily: 'monospace', letterSpacing: '0.5px' }} placeholder="110526" />
                        </Form.Item>
                      </Fld>
                      <Fld label="CỠ LÔ / SỐ LƯỢNG" style={{ flex: 1 }}>
                        <Form.Item name="soLuong" noStyle>
                          <InputNumber style={{ ...INP, width: '100%', fontWeight: 700, color: '#722ed1' }}
                            min={0} {...numFmt} />
                        </Form.Item>
                      </Fld>
                      <Fld label="TÌNH TRẠNG" style={{ flex: 1.3 }}>
                        <Form.Item name="trangThaiXuLy" noStyle>
                          <Select allowClear placeholder="Chọn" style={{ width: '100%', fontSize: F.lg }}
                            options={TRANG_THAI_OPTIONS.map(o => ({ value: o, label: o }))} />
                        </Form.Item>
                      </Fld>
                    </div>
                  </div>
                </div>

                {/* Card: Thời gian — blue */}
                <div style={{ ...mkCard(A.blue), flex: 2 }}>
                  <div style={mkCardHdr(A.blue)}>
                    <span>📅</span> Thời gian thực hiện
                  </div>
                  <div style={{ ...cardBody, gap: 9 }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <Fld label="★ NGÀY BẮT ĐẦU" style={{ flex: 1 }}>
                        <Form.Item name="ngayBatDau" noStyle>
                          <DatePicker style={{ width: '100%', fontSize: F.lg }} format="DD/MM/YYYY" />
                        </Form.Item>
                      </Fld>
                      <Fld label="NGÀY KẾT THÚC" style={{ flex: 1 }}>
                        <Form.Item name="ngayKetThuc" noStyle>
                          <DatePicker style={{ width: '100%', fontSize: F.lg }} format="DD/MM/YYYY" />
                        </Form.Item>
                      </Fld>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Card: Phân loại & xử lý ── */}
              <div style={mkCard(A.slate)}>
                <div style={mkCardHdr(A.slate)}>
                  <span>🔧</span> Phân loại &amp; xử lý
                </div>
                <div style={{ ...cardBody, gap: 9 }}>
                  <Fld label="PHÂN LOẠI LỖI">
                    <Form.Item name="phanLoaiLoi" noStyle>
                      <Select mode="multiple" allowClear placeholder="Chọn phân loại"
                        style={{ width: '100%', fontSize: F.lg }}
                        options={PHAN_LOAI_OPTIONS.map(o => ({
                          value: o.value,
                          label: <Tag color={o.color} style={{ marginRight: 0 }}>{o.value}</Tag>,
                        }))} />
                    </Form.Item>
                  </Fld>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Fld label="NGƯỜI XỬ LÝ" style={{ flex: 1 }}>
                      <Form.Item name="namXuLy" noStyle>
                        <Input style={INP} placeholder="Họ tên..." />
                      </Form.Item>
                    </Fld>
                    <Fld label="HƯỚNG XỬ LÝ" style={{ flex: 1 }}>
                      <Form.Item name="huongXuLy" noStyle>
                        <AutoComplete allowClear placeholder="Chọn hoặc nhập tự do..."
                          style={{ width: '100%' }}
                          options={HUONG_XU_LY_OPTIONS.map(o => ({ value: o, label: o }))}
                          filterOption={(input, opt) => opt.value.toLowerCase().includes(input.toLowerCase())} />
                      </Form.Item>
                    </Fld>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Fld label="SL HÀNG TRẢ VỀ" style={{ flex: 1 }}>
                      <Form.Item name="soLuongTraVe" noStyle>
                        <InputNumber style={{ ...INP, width: '100%', fontWeight: 700, color: '#dc2626' }} min={0} {...numFmt} />
                      </Form.Item>
                    </Fld>
                    <Fld label="SL ĐẠT SAU XL" style={{ flex: 1 }}>
                      <Form.Item name="slDatSauXuLy" noStyle>
                        <InputNumber style={{ ...INP, width: '100%', fontWeight: 700, color: A.slate }} min={0} {...numFmt} />
                      </Form.Item>
                    </Fld>
                    <Fld label="SL HỦY" style={{ flex: 1 }}>
                      <Form.Item name="slHuy" noStyle>
                        <InputNumber style={{ ...INP, width: '100%', fontWeight: 700, color: '#ef4444' }} min={0} {...numFmt} />
                      </Form.Item>
                    </Fld>
                  </div>
                  <Fld label="⚠ LÝ DO CHƯA THỰC HIỆN" urgent>
                    <Form.Item name="lyDoChuaThucHien" noStyle>
                      <Input style={{ ...INP, borderColor: '#fbbf24' }}
                        placeholder="Nhập lý do nếu chưa hoàn thành xử lý..." />
                    </Form.Item>
                  </Fld>
                </div>
              </div>
            </div>

            {/* ═══════════════ RIGHT PANEL (35%) ═══════════════ */}
            <div style={{ flex: 35, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>

              {/* Card: Ghi chú & sai lệch — orange, fills height */}
              <div style={{ ...mkCard(A.orange), flex: 1 }}>
                <div style={mkCardHdr(A.orange)}>
                  <span>📝</span> Nhận xét &amp; Ghi chú
                </div>
                <div style={{ ...cardBody, gap: 12, flex: 1 }}>
                  <Fld label="⚠  NỘI DUNG SAI LỆCH" urgent style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Form.Item name="liDoTraVe" noStyle>
                      <Input.TextArea
                        style={{ fontSize: F.lg, resize: 'none', borderColor: '#fb923c', flex: 1, minHeight: 90 }}
                        placeholder="Nếu có → xuất hiện tab Sai lệch..." />
                    </Form.Item>
                  </Fld>
                  <Fld label="CHÚ Ý / GHI CHÚ NỘI BỘ" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Form.Item name="ghiChu" noStyle>
                      <Input.TextArea
                        style={{ fontSize: F.lg, resize: 'none', flex: 1, minHeight: 80 }}
                        placeholder="Ghi chú nội bộ..." />
                    </Form.Item>
                  </Fld>
                </div>
              </div>

              {/* ── Save / Cancel buttons ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Button
                  type="primary" size="large" loading={saving}
                  icon={<SaveOutlined />} onClick={handleSave}
                  style={{
                    background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)',
                    borderColor: '#1D4ED8', height: 54,
                    fontSize: 15, fontWeight: 800, letterSpacing: '0.4px',
                    borderRadius: 8, boxShadow: '0 3px 10px rgba(44,62,80,0.28)',
                  }}
                >
                  Lưu thông tin
                </Button>
                <Button size="large" onClick={() => setModalOpen(false)}
                  style={{
                    height: 42, fontSize: 14, fontWeight: 600,
                    borderRadius: 8, color: '#64748b', borderColor: '#D0D5DC',
                  }}
                >
                  Hủy
                </Button>
                {editRecord && (
                  <div style={{
                    textAlign: 'center', fontSize: 11, color: '#94a3b8',
                    background: '#fff', borderRadius: 6, padding: '7px 10px',
                    border: '1px solid #e2e8f0',
                  }}>
                    <div>ID: <b style={{ color: '#475569' }}>#{editRecord.id}</b></div>
                    {editRecord.updatedAt && (
                      <div style={{ marginTop: 2 }}>
                        Cập nhật lần cuối:<br />
                        <b style={{ color: '#475569' }}>{dayjs(editRecord.updatedAt).format('DD/MM/YYYY HH:mm')}</b>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Form>
      </Modal>
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HangLoiPage() {
  const headerRef = React.useRef(null)
  const [tabBarHeight, setTabBarHeight] = React.useState(0)

  React.useEffect(() => {
    if (headerRef.current) setTabBarHeight(headerRef.current.offsetHeight)
  }, [])

  return (
    <>
      <style>{`
        /* ── Table ── */
        .hl-table .ant-table-thead > tr > th {
          background: #009999 !important; color: #ffffff !important;
          font-size: 12px !important; font-weight: 700 !important;
          text-transform: uppercase; padding: 8px 10px !important;
          letter-spacing: 0.4px; border-right: 1px solid #007a7a !important;
          white-space: nowrap;
        }
        .hl-table .ant-table-thead > tr > th::before { display: none !important; }
        .hl-table .ant-table-tbody > tr > td { padding: 7px 10px !important; vertical-align: middle; }
        .hl-table .ant-table-tbody > tr:hover > td { background: #EAECF2 !important; }
        .hl-table .row-stripe td { background: #fafbff !important; }

        /* ── Tabs ── */
        .hl-tabs > .ant-tabs-nav {
          background: #1e4570 !important;
          padding: 0 12px; margin: 0 !important;
        }
        .hl-tabs > .ant-tabs-nav .ant-tabs-tab {
          color: #CBD5E1 !important; font-size: 14px;
          padding: 9px 18px !important; margin: 0 2px !important;
          border-radius: 4px 4px 0 0;
        }
        .hl-tabs > .ant-tabs-nav .ant-tabs-tab:hover  { color: #fff !important; background: rgba(59,130,246,0.15) !important; }
        .hl-tabs > .ant-tabs-nav .ant-tabs-tab-active { color: #fff !important; font-weight: 700 !important; background: rgba(29,78,216,0.25) !important; box-shadow: 0 -3px 0 #60A5FA inset; }
        .hl-tabs > .ant-tabs-nav .ant-tabs-ink-bar   { background: #60A5FA !important; }
        .hl-tabs > .ant-tabs-nav::before             { border: none !important; }

        /* ── Modal ── */
        .hl-modal .ant-modal-content { padding: 0 !important; border-radius: 10px !important; overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.18) !important; }
        .hl-modal .ant-modal-body    { padding: 0 !important; }
        .hl-modal .ant-form-item     { margin-bottom: 0 !important; }

        /* ── Ant overrides inside modal ── */
        .hl-modal .ant-input,
        .hl-modal .ant-input-number-input,
        .hl-modal .ant-picker-input > input { font-size: 16px !important; }
        .hl-modal .ant-select-selection-item { font-size: 15px !important; }
        .hl-modal .ant-input-number { width: 100%; }
      `}</style>

      <Tabs
        className="hl-tabs"
        defaultActiveKey="hang-tra-lai"
        renderTabBar={(props, DefaultTabBar) => (
          <div ref={headerRef} style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff' }}>
            <div style={{
              padding: '10px 0 6px', borderBottom: '2px solid #DDE1E8',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontWeight: 800, fontSize: 17, color: '#1E3A5F' }}>
                <WarningOutlined style={{ marginRight: 6, color: '#f97316' }} />
                Hàng Lỗi
              </span>
            </div>
            <DefaultTabBar {...props} style={{ marginBottom: 0 }} />
          </div>
        )}
        items={[{
          key: 'hang-tra-lai',
          label: 'Hàng Trả lại ĐG - PL',
          children: <HangTraLaiTab stickyTop={tabBarHeight} />,
        }]}
      />
    </>
  )
}
