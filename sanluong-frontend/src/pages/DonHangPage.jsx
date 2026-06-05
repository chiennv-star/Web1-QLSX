import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Table, Button, Space, Input, Select, DatePicker, Modal, Form,
  InputNumber, Tag, Popconfirm, message, Badge, Tooltip, Alert,
  Checkbox, Progress, List as AntList, Typography, Upload, Result, Dropdown, AutoComplete,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  ReloadOutlined, FireOutlined, ThunderboltOutlined, SyncOutlined,
  CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
  EyeInvisibleOutlined, EyeOutlined, TrophyOutlined,
  UploadOutlined, FileExcelOutlined, CloseCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const { Option } = Select
const { RangePicker } = DatePicker

// ── Constants ─────────────────────────────────────────────────────────────────
const TINH_TRANG_DH = {
  rat_gap: { label: 'Rất Gấp', color: '#cf1322', bg: '#fff1f0', border: '#ffa39e', icon: <FireOutlined /> },
  gap:     { label: 'Gấp',     color: '#d46b08', bg: '#fff7e6', border: '#ffd591', icon: <ThunderboltOutlined /> },
}

const TINH_TRANG_SX = {
  done:  { label: 'Hoàn thành', color: '#389e0d', bg: '#f6ffed', border: '#b7eb8f', icon: <CheckCircleOutlined /> },
  doing: { label: 'Đang SX',    color: '#1677ff', bg: '#e6f4ff', border: '#91caff', icon: <ClockCircleOutlined /> },
}

const fmtNum = v => (v != null && v !== '') ? Number(v).toLocaleString('vi-VN') : '—'

// ── Import Excel Modal ─────────────────────────────────────────────────────────
function ImportExcelModal({ open, onClose, onDone }) {
  const [file, setFile]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null) // { imported, skipped, errors }

  const handleClose = () => {
    setFile(null)
    setResult(null)
    setLoading(false)
    onClose()
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post('/don-hang/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
      if ((data.imported || 0) > 0) onDone()
    } catch (err) {
      const msg = err.response?.data?.error || 'Import thất bại'
      setResult({ imported: 0, skipped: 0, errors: [msg] })
    } finally { setLoading(false) }
  }

  const uploadProps = {
    accept: '.xlsx,.xls',
    maxCount: 1,
    beforeUpload: f => { setFile(f); setResult(null); return false },
    onRemove: () => { setFile(null); setResult(null) },
    fileList: file ? [{ uid: '1', name: file.name, status: 'done' }] : [],
  }

  return (
    <Modal
      open={open} onCancel={handleClose} destroyOnClose
      title={
        <Space>
          <FileExcelOutlined style={{ color: '#217346' }} />
          <span style={{ fontWeight: 700 }}>Import Đơn Hàng từ Excel</span>
        </Space>
      }
      footer={
        result ? (
          <Button type="primary" onClick={handleClose}>Đóng</Button>
        ) : (
          <Space>
            <Button onClick={handleClose}>Huỷ</Button>
            <Button type="primary" icon={<UploadOutlined />}
              loading={loading} disabled={!file}
              style={{ background: '#217346', borderColor: '#217346' }}
              onClick={handleImport}>
              Bắt đầu Import
            </Button>
          </Space>
        )
      }
      width={520}
    >
      {!result ? (
        <div style={{ padding: '12px 0' }}>
          <Alert type="info" showIcon style={{ marginBottom: 14 }} message={
            <div style={{ fontSize: 12 }}>
              File Excel cần có dòng tiêu đề ở hàng 1 với các cột:<br />
              <b>Mã Bravo</b>, <b>Mã SP / Mã TP</b>, <b>Tên sản phẩm</b>,{' '}
              <b>Mã đơn hàng</b>, <b>Ngày nhận đơn</b> (dd/MM/yyyy), <b>Số lượng</b>.<br />
              Các đơn hàng có <b>Mã Bravo + Mã Đơn Hàng + Số Lượng đã tồn tại</b> sẽ bị bỏ qua.
            </div>
          } />
          <Upload.Dragger {...uploadProps} style={{ borderColor: '#217346' }}>
            <p style={{ fontSize: 28, color: '#217346', margin: '8px 0 4px' }}>
              <FileExcelOutlined />
            </p>
            <p style={{ fontWeight: 600, color: '#374151', margin: 0 }}>
              Kéo thả hoặc nhấn để chọn file Excel
            </p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 8px' }}>
              Hỗ trợ .xlsx và .xls
            </p>
          </Upload.Dragger>
        </div>
      ) : (
        <div style={{ padding: '12px 0' }}>
          {result.imported > 0 || result.skipped > 0 ? (
            <Result
              status={result.errors?.length > 0 ? 'warning' : 'success'}
              title={`Import hoàn tất`}
              subTitle={
                <div style={{ fontSize: 13 }}>
                  <div>
                    <CheckCircleOutlined style={{ color: '#389e0d' }} />{' '}
                    Đã import: <b style={{ color: '#389e0d' }}>{result.imported}</b> đơn hàng
                  </div>
                  {result.skipped > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <SyncOutlined style={{ color: '#d46b08' }} />{' '}
                      Bỏ qua (đã tồn tại): <b style={{ color: '#d46b08' }}>{result.skipped}</b> đơn
                    </div>
                  )}
                </div>
              }
            />
          ) : (
            <Result status="error" title="Không import được dữ liệu nào" />
          )}
          {result.errors?.length > 0 && (
            <Alert type="error" showIcon style={{ marginTop: 8 }}
              message={`${result.errors.length} dòng lỗi`}
              description={
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              }
            />
          )}
        </div>
      )}
    </Modal>
  )
}

// ── Add / Edit Modal ───────────────────────────────────────────────────────────
function DonHangModal({ open, editItem, onClose, onSaved, existingMaDonHangs = [] }) {
  const [form]          = Form.useForm()
  const [lookupStatus,  setLookupStatus]  = useState(null)
  const timerRef = useRef(null)
  const [bravoOptions, setBravoOptions]   = useState([])
  const bravoTimer   = useRef(null)
  const justSelected = useRef(false)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editItem) {
      form.setFieldsValue({
        ...editItem,
        ngayDatHang: editItem.ngayDatHang ? dayjs(editItem.ngayDatHang) : null,
        daLenLichLam:    !!editItem.daLenLichLam,
        daDgVaXepLichDg: !!editItem.daDgVaXepLichDg,
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ daLenLichLam: false, daDgVaXepLichDg: false })
    }
    setLookupStatus(null)
    setIsDirty(false)
  }, [open, editItem])

  const handleBravoSearch = (val) => {
    if (bravoTimer.current) clearTimeout(bravoTimer.current)
    if (!val || val.length < 2) { setBravoOptions([]); return }
    bravoTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/product-master', { params: { keyword: val, page: 0, size: 12 } })
        const items = (data.content || []).filter(p => p.maBravo)
        setBravoOptions(items.map(p => ({
          value: p.maBravo,
          label: (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontWeight: 800, color: '#1677ff', fontFamily: 'monospace', minWidth: 80 }}>{p.maBravo}</span>
              {p.tienTrinh && <span style={{ color: '#6b7280', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.tienTrinh}</span>}
            </div>
          ),
          raw: p,
        })))
      } catch { setBravoOptions([]) }
    }, 300)
  }

  const handleBravoSelect = (val, option) => {
    justSelected.current = true
    const p = option.raw
    form.setFieldsValue({
      maBravo:    p.maBravo,
      maSp:       p.maTp       || '',
      tenSanPham: p.tienTrinh  || '',
    })
    setLookupStatus('found')
    setBravoOptions([])
    setTimeout(() => { justSelected.current = false }, 150)
  }

  const handleBravoChange = (val) => {
    if (justSelected.current) return
    const trimmed = (typeof val === 'string' ? val : val?.target?.value)?.trim()
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!trimmed) { setLookupStatus(null); return }
    setLookupStatus('loading')
    timerRef.current = setTimeout(async () => {
      try {
        const { data: master } = await api.get(`/product-master/lookup-by-bravo/${encodeURIComponent(trimmed)}`)
        form.setFieldsValue({ maSp: master.maTp, tenSanPham: master.tienTrinh })
        setLookupStatus('found')
      } catch { setLookupStatus('not_found') }
    }, 500)
  }

  const lookupIcon = () => {
    if (lookupStatus === 'loading')   return <SyncOutlined spin style={{ color: '#1D4ED8' }} />
    if (lookupStatus === 'found')     return <CheckCircleOutlined style={{ color: '#389e0d' }} />
    if (lookupStatus === 'not_found') return <ExclamationCircleOutlined style={{ color: '#cf1322' }} />
    return null
  }

  const onOk = async () => {
    const values = await form.validateFields()
    // ── Kiểm tra trùng mã đơn hàng ──────────────────────────────────────────
    if (values.maDonHang && existingMaDonHangs.includes(values.maDonHang)) {
      message.error(`Mã đơn hàng "${values.maDonHang}" đã tồn tại! Không thể lưu.`)
      return
    }
    const slDatHang = Number(values.soLuongDatHang) || 0
    const slXepKh   = Number(values.soLuongDaXepKh)  || 0
    const autoTinhTrangSx = slDatHang > 0 && slXepKh >= slDatHang ? 'done' : 'doing'
    const payload = {
      ...values,
      ngayDatHang: values.ngayDatHang ? values.ngayDatHang.format('YYYY-MM-DD') : null,
      tinhTrangSx: autoTinhTrangSx,
    }
    try {
      if (editItem) {
        await api.put(`/don-hang/${editItem.id}`, payload)
        message.success('Đã cập nhật đơn hàng')
        setIsDirty(false)
        onSaved(payload)
      } else {
        await api.post('/don-hang', payload)
        message.success('Đã thêm đơn hàng thành công')
        setIsDirty(false)
        onSaved(payload)
      }
    } catch { message.error('Lưu thất bại') }
  }

  const handleClose = () => {
    if (isDirty) {
      Modal.confirm({
        title: 'Có thay đổi chưa lưu',
        content: editItem
          ? 'Bạn chưa nhấn "Cập nhật". Thoát sẽ mất các thay đổi vừa nhập.'
          : 'Bạn chưa nhấn "Thêm". Thoát sẽ mất các thông tin vừa nhập.',
        okText: 'Thoát không lưu',
        okType: 'danger',
        cancelText: 'Quay lại',
        onOk: () => { setIsDirty(false); onClose() },
      })
    } else {
      onClose()
    }
  }

  return (
    <Modal
      open={open} onCancel={handleClose} onOk={onOk}
      title={
        <Space>
          {editItem ? <EditOutlined style={{ color: '#1D4ED8' }} /> : <PlusOutlined style={{ color: '#1D4ED8' }} />}
          <span style={{ fontWeight: 700 }}>
            {editItem ? 'Chỉnh sửa đơn hàng' : 'Thêm đơn hàng mới'}
          </span>
        </Space>
      }
      okText={editItem ? 'Cập nhật' : 'Thêm'} cancelText="Huỷ"
      width={700} destroyOnClose
      okButtonProps={isDirty ? { style: { boxShadow: '0 0 0 3px rgba(22,119,255,0.45)', fontWeight: 700 } } : {}}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }} autoComplete="off"
        onValuesChange={() => setIsDirty(true)}>
        {/* Mã Bravo + Mã SP */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item label={<span>Mã Bravo {lookupIcon()}</span>} name="maBravo" style={{ flex: 1 }}
            rules={[{ required: true, message: 'Nhập Mã Bravo' }]}>
            <AutoComplete
              options={bravoOptions}
              onSearch={handleBravoSearch}
              onSelect={handleBravoSelect}
              onChange={handleBravoChange}
              placeholder="VD: 10602153 hoặc nhập tên sản phẩm"
              allowClear
              popupMatchSelectWidth={420}
              style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}
            >
              <Input autoComplete="off" />
            </AutoComplete>
          </Form.Item>
          <Form.Item label="Mã SP" name="maSp" style={{ flex: 1 }}>
            <Input placeholder="Tự động điền" autoComplete="off" style={{ color: '#1D4ED8', fontWeight: 600 }} />
          </Form.Item>
        </div>

        {/* Tên SP */}
        <Form.Item label="Tên Sản Phẩm / Tiến Trình" name="tenSanPham">
          <Input.TextArea autoSize={{ minRows: 1, maxRows: 3 }} placeholder="Tự động điền khi tra Mã Bravo" />
        </Form.Item>

        {/* Mã Đơn Hàng + Ngày ĐH */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item label="Mã Đơn Hàng" name="maDonHang" style={{ flex: 1 }}
            rules={[{ required: true, message: 'Nhập Mã Đơn Hàng' }]}>
            <Input placeholder="VD: DH-001" autoComplete="off" style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item label="Ngày Đặt Hàng" name="ngayDatHang" style={{ flex: 1 }} rules={[{ required: true, message: 'Vui lòng chọn ngày đặt hàng' }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
        </div>

        {/* SL Đặt + Tình Trạng ĐH */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item label="Số Lượng Đặt Hàng" name="soLuongDatHang" style={{ flex: 1 }}
            rules={[{ required: true, message: 'Nhập số lượng đặt hàng' }]}>
            <InputNumber style={{ width: '100%' }} min={0} placeholder="VD: 5000"
              formatter={v => v ? Number(v).toLocaleString('vi-VN') : ''}
              parser={v => v ? v.replace(/[^\d]/g, '') : ''} />
          </Form.Item>
          <Form.Item label="Tình Trạng Đặt Hàng" name="tinhTrangDatHang" style={{ flex: 1 }}>
            <Select allowClear placeholder="Chọn...">
              <Option value="rat_gap"><FireOutlined style={{ color: '#cf1322' }} /> Rất Gấp</Option>
              <Option value="gap"><ThunderboltOutlined style={{ color: '#d46b08' }} /> Gấp</Option>
            </Select>
          </Form.Item>
        </div>

        {/* SL Đã Xếp KH — hidden, giá trị mặc định 0 khi thêm mới */}
        <Form.Item name="soLuongDaXepKh" hidden><InputNumber /></Form.Item>

        {/* Ghi Chú */}
        <Form.Item label="Ghi Chú" name="ghiChu">
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="Ghi chú, lưu ý..." />
        </Form.Item>

        {/* Checkboxes */}
        <div style={{ display: 'flex', gap: 32 }}>
          <Form.Item name="daLenLichLam" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox><span style={{ fontWeight: 600, color: '#1D4ED8' }}>Đã lên lịch làm</span></Checkbox>
          </Form.Item>
          <Form.Item name="daDgVaXepLichDg" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox><span style={{ fontWeight: 600, color: '#7c3aed' }}>Đã ĐG và xếp lịch ĐG</span></Checkbox>
          </Form.Item>
        </div>
      </Form>
    </Modal>
  )
}

// ── DonHang Detail Modal (edit + linked Lệnh SX) ─────────────────────────────
function DonHangDetailModal({ open, record, onClose, onSaved }) {
  const { isAdmin, isAdminKH } = useAuth()
  const canEdit = isAdmin() || isAdminKH()

  const [form]                        = Form.useForm()
  const [doiSlForm]                   = Form.useForm()
  const [lenhList, setLenhList]       = useState([])
  const [lenhLoading, setLenhLoading] = useState(false)
  const [saving, setSaving]           = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [editVals, setEditVals]       = useState({})
  const [addingRow, setAddingRow]     = useState(false)
  const [newVals, setNewVals]         = useState({})
  const [khoachList, setKhoachList]   = useState([])
  const [khoachLoading, setKhoachLoading] = useState(false)
  const [doiSlOpen, setDoiSlOpen]     = useState(false)
  const [doiSlLoading, setDoiSlLoading] = useState(false)
  const [lichSuSl, setLichSuSl]       = useState([])
  const [lichSuLoading, setLichSuLoading] = useState(false)

  useEffect(() => {
    if (!open || !record) return
    form.setFieldsValue({
      maBravo:          record.maBravo          || '',
      maSp:             record.maSp             || '',
      tenSanPham:       record.tenSanPham        || '',
      soLo:             record.soLo             || '',
      maDonHang:        record.maDonHang         || '',
      ngayDatHang:      record.ngayDatHang ? dayjs(record.ngayDatHang) : null,
      soLuongDatHang:   record.soLuongDatHang,
      tinhTrangDatHang: record.tinhTrangDatHang  || null,
      tinhTrangSx:      record.tinhTrangSx       || null,
      ghiChu:           record.ghiChu            || '',
      daLenLichLam:     !!record.daLenLichLam,
      daDgVaXepLichDg:  !!record.daDgVaXepLichDg,
      ngayPhatLenh:     record.ngayPhatLenh ? dayjs(record.ngayPhatLenh) : null,
    })
    setEditingId(null); setAddingRow(false); setNewVals({})
    loadLenhs()
    loadKhoach()
  }, [open, record])

  const loadLenhs = async () => {
    if (!record) return
    setLenhLoading(true)
    try {
      const { data: res } = await api.get('/lenh-san-xuat')
      const all = Array.isArray(res) ? res : (res.content || [])
      setLenhList(all.filter(l =>
        (record.maDonHang && l.maDonHang === record.maDonHang) ||
        (!record.maDonHang && record.soLo && l.soLo === record.soLo)
      ))
    } catch {}
    finally { setLenhLoading(false) }
  }

  const loadKhoach = async () => {
    if (!record?.maDonHang && !record?.maBravo) return
    setKhoachLoading(true)
    try {
      const { data: res } = await api.get('/work-schedule', { params: { source: 'PLAN', page: 0, size: 1000 } })
      const all = Array.isArray(res) ? res : (res.content || [])
      setKhoachList(all.filter(r => {
        // maDonHang lưu trong DB → ưu tiên cao nhất
        if (record.maDonHang && r.maDonHang)
          return r.maDonHang === record.maDonHang
        // Fallback: maBravo (@Transient, enriched từ ProductMaster)
        if (record.maBravo && r.maBravo)
          return r.maBravo === record.maBravo
        return false
      }))
    } catch {}
    finally { setKhoachLoading(false) }
  }

  const totalSl       = lenhList.reduce((s, l) => s + (Number(l.soLuong) || 0), 0)
  const khoachTotalSl = khoachList.reduce((s, r) => s + (Number(r.coLo)  || 0), 0)
  // SL Đã Xếp KH: chỉ tính PCPL1+PCPL2, mỗi tổ chỉ tính lần đầu xuất hiện
  const khoachSlXep = (() => {
    const seen = new Set()
    let total = 0
    for (const r of khoachList) {
      if (r.toNhom !== 'PCPL1' && r.toNhom !== 'PCPL2') continue
      if (!r.maDonHang && !r.maSp) continue
      const key = `${r.maSp || r.maBravo}||${r.maDonHang}||${r.toNhom}||${r.soLo}`
      if (seen.has(key)) continue
      seen.add(key)
      total += Number(r.coLo) || 0
    }
    return total
  })()

  const normDateDH = (val) => {
    if (!val) return null
    if (Array.isArray(val)) return `${val[0]}-${String(val[1]).padStart(2,'0')}-${String(val[2]).padStart(2,'0')}`
    return dayjs(val).isValid() ? dayjs(val).format('YYYY-MM-DD') : null
  }
  // Enrich lenhList: nếu lệnh chưa có toThucHien thì lấy từ khoachList (1 giá trị)
  const lenhListDisplay = lenhList.map(l => {
    if (l.toThucHien) return l
    const lDate = normDateDH(l.ngayThucHien)
    const match = khoachList.find(k => k.maBravo === l.maBravo && normDateDH(k.ngayThucHien) === lDate)
    return match ? { ...l, toThucHien: match.toNhom } : l
  })

  // Tổ thực hiện từ kế hoạch (unique toNhom)
  const toThucHienArr = [...new Set(khoachList.map(r => r.toNhom).filter(Boolean))]
  const TO_COLORS_MODAL = { PCPL1: '#374151', PCPL2: '#546e7a', PCPL3: '#607d8b', BBC1: '#7c3aed', DG: '#0369a1', PC: '#166534', PL: '#92400e' }

  const openDoiSl = async () => {
    setDoiSlOpen(true)
    doiSlForm.resetFields()
    setLichSuLoading(true)
    try {
      const { data } = await api.get(`/don-hang/${record.id}/lich-su-sl`)
      setLichSuSl(Array.isArray(data) ? data : [])
    } catch { setLichSuSl([]) }
    finally { setLichSuLoading(false) }
  }

  const handleDoiSl = async () => {
    let vals
    try { vals = await doiSlForm.validateFields() } catch { return }
    setDoiSlLoading(true)
    try {
      const { data: updated } = await api.post(`/don-hang/${record.id}/doi-so-luong`, {
        slMoi: Number(vals.slMoi),
        lyDo:  vals.lyDo || '',
      })
      message.success('Đã đổi SL Đặt Hàng thành công')
      setDoiSlOpen(false)
      // reload lịch sử và cập nhật form
      form.setFieldsValue({ soLuongDatHang: updated.soLuongDatHang })
      onSaved(updated)
    } catch { message.error('Đổi SL thất bại') }
    finally { setDoiSlLoading(false) }
  }

  const handleSave = async () => {
    let values
    try { values = await form.validateFields() } catch { return }
    if (!values.maBravo?.trim()) {
      message.error('Mã Bravo không được để trống!')
      return
    }
    if (!values.maDonHang?.trim()) {
      message.error('Mã Đơn Hàng không được để trống!')
      return
    }
    if (!values.soLuongDatHang || Number(values.soLuongDatHang) <= 0) {
      message.error('Số Lượng Đặt Hàng không được để trống!')
      return
    }
    const slDatHang = Number(values.soLuongDatHang) || 0
    const slXep     = khoachSlXep > 0 ? khoachSlXep : totalSl
    const autoTinhTrangSx = slDatHang > 0 && slXep >= slDatHang ? 'done' : 'doing'
    setSaving(true)
    try {
      const payload = {
        ...values,
        ngayDatHang:    values.ngayDatHang ? values.ngayDatHang.format('YYYY-MM-DD') : null,
        ngayPhatLenh:   values.ngayPhatLenh ? values.ngayPhatLenh.format('YYYY-MM-DD') : null,
        soLuongDaXepKh: slXep > 0 ? slXep : (values.soLuongDaXepKh ?? 0),
        tinhTrangSx:    autoTinhTrangSx,
      }
      await api.put(`/don-hang/${record.id}`, payload)
      message.success('Đã cập nhật đơn hàng')
      onSaved(payload)
    } catch { message.error('Lưu thất bại') }
    finally { setSaving(false) }
  }

  const startEdit = (r) => {
    setEditingId(r.id)
    setEditVals({
      ngayThucHien: r.ngayThucHien ? dayjs(r.ngayThucHien) : null,
      maBravo: r.maBravo || '', maSp: r.maSp || '',
      tenSanPham: r.tenSanPham || '', soLo: r.soLo || '',
      soLuong: r.soLuong ?? null, ghiChu: r.ghiChu || '',
    })
  }

  const saveEdit = async (id) => {
    const lenh = lenhList.find(l => l.id === id)
    if (!lenh) return
    try {
      const { data: saved } = await api.put(`/lenh-san-xuat/${id}`, {
        ...lenh, ...editVals,
        ngayThucHien: editVals.ngayThucHien ? editVals.ngayThucHien.format('YYYY-MM-DD') : null,
      })
      setLenhList(prev => prev.map(l => l.id === id ? saved : l))
      setEditingId(null)
      syncSoLoToKhoach(saved.maBravo, record.maDonHang || saved.maDonHang, saved.ngayThucHien, saved.soLo)
    } catch { message.error('Lưu thất bại') }
  }

  const deleteLenh = async (id) => {
    try {
      await api.delete(`/lenh-san-xuat/${id}`)
      setLenhList(prev => prev.filter(l => l.id !== id))
    } catch { message.error('Xóa thất bại') }
  }

  // Đồng bộ Lệnh SX theo kế hoạch: xóa lệnh không còn kế hoạch, bổ sung lệnh còn thiếu
  const [syncing, setSyncing] = useState(false)
  const syncLenhWithKhoach = async () => {
    if (!khoachList.length && !lenhList.length) return
    // Nếu không có kế hoạch → không xóa lệnh SX (kế hoạch chưa tạo, không phải lỗi)
    if (!khoachList.length) {
      message.info('Không có kế hoạch tương ứng — không thể đồng bộ')
      return
    }
    setSyncing(true)
    try {
      // Lệnh SX không có kế hoạch tương ứng (khớp ngày + tổ + soLo) → xóa
      const toDelete = lenhList.filter(l => {
        const lDate = normDateDH(l.ngayThucHien)
        return !khoachList.some(k =>
          normDateDH(k.ngayThucHien) === lDate &&
          k.toNhom === l.toThucHien &&
          (!k.soLo || !l.soLo || k.soLo === l.soLo)
        )
      })
      // Kế hoạch chưa có lệnh SX tương ứng (khớp ngày + tổ + soLo) → tạo mới
      const toAdd = khoachList.filter(k => {
        const kDate = normDateDH(k.ngayThucHien)
        return !lenhList.some(l =>
          normDateDH(l.ngayThucHien) === kDate &&
          l.toThucHien === k.toNhom &&
          (!k.soLo || !l.soLo || l.soLo === k.soLo)
        )
      })
      // Kế hoạch đã có lệnh nhưng cỡ lô khác → cập nhật soLuong = coLo
      const toUpdate = khoachList.flatMap(k => {
        if (k.coLo == null) return []
        const kDate = normDateDH(k.ngayThucHien)
        return lenhList.filter(l =>
          normDateDH(l.ngayThucHien) === kDate &&
          l.toThucHien === k.toNhom &&
          (!k.soLo || !l.soLo || l.soLo === k.soLo) &&
          Number(l.soLuong) !== Number(k.coLo)
        ).map(l => ({ ...l, soLuong: k.coLo }))
      })

      if (toDelete.length > 0)
        await Promise.all(toDelete.map(l => api.delete(`/lenh-san-xuat/${l.id}`)))
      if (toAdd.length > 0)
        await Promise.all(toAdd.map(k => api.post('/lenh-san-xuat', {
          maBravo:      record.maBravo       || null,
          maDonHang:    record.maDonHang     || null,
          maSp:         k.maSp              || record.maSp      || null,
          tenSanPham:   k.tenTrinh          || record.tenSanPham|| null,
          soLo:         k.soLo              || null,
          soLuong:      k.coLo != null ? k.coLo : null,
          toThucHien:   k.toNhom            || null,
          ngayThucHien: normDateDH(k.ngayThucHien),
        })))
      if (toUpdate.length > 0)
        await Promise.all(toUpdate.map(l => api.put(`/lenh-san-xuat/${l.id}`, l)))

      const changed = toDelete.length + toAdd.length + toUpdate.length
      if (changed > 0) {
        message.success(`Đồng bộ: xóa ${toDelete.length}, thêm ${toAdd.length}, cập nhật cỡ lô ${toUpdate.length} lệnh SX`)
        loadLenhs()
      } else {
        message.info('Lệnh SX đã khớp với kế hoạch')
      }
    } catch { message.error('Đồng bộ thất bại') }
    finally { setSyncing(false) }
  }

  // Đồng bộ soLo từ Lệnh SX về Kế hoạch (PLAN) cùng maBravo + maDonHang + ngayThucHien
  const syncSoLoToKhoach = async (maBravo, maDonHang, ngayThucHien, soLo) => {
    if (!soLo || !maBravo || !ngayThucHien) return
    const normDate = (val) => {
      if (!val) return null
      if (Array.isArray(val)) return `${val[0]}-${String(val[1]).padStart(2,'0')}-${String(val[2]).padStart(2,'0')}`
      return dayjs(val).isValid() ? dayjs(val).format('YYYY-MM-DD') : null
    }
    const targetDate = normDate(ngayThucHien)
    try {
      const { data: res } = await api.get('/work-schedule', { params: { source: 'PLAN', page: 0, size: 1000 } })
      const all = Array.isArray(res) ? res : (res.content || [])
      const toUpdate = all.filter(r =>
        r.maBravo === maBravo &&
        (maDonHang ? r.maDonHang === maDonHang : true) &&
        normDate(r.ngayThucHien) === targetDate &&
        r.soLo !== soLo
      )
      if (toUpdate.length > 0) {
        await Promise.all(toUpdate.map(r => api.put(`/work-schedule/${r.id}`, { ...r, soLo })))
        message.success(`Đã cập nhật số lô "${soLo}" cho ${toUpdate.length} bản ghi Kế Hoạch`, 3)
      }
    } catch {} // best-effort
  }

  const saveNewRow = async () => {
    try {
      const { data: created } = await api.post('/lenh-san-xuat', {
        maBravo:      newVals.maBravo    || record.maBravo    || null,
        maSp:         newVals.maSp       || record.maSp       || null,
        tenSanPham:   newVals.tenSanPham || record.tenSanPham || null,
        soLo:         newVals.soLo       || record.soLo       || null,
        maDonHang:    record.maDonHang   || null,
        soLuong:      newVals.soLuong    ?? null,
        ngayThucHien: newVals.ngayThucHien ? newVals.ngayThucHien.format('YYYY-MM-DD') : null,
        ghiChu:       newVals.ghiChu     || null,
      })
      setLenhList(prev => [...prev, created])
      setAddingRow(false); setNewVals({})
      message.success('Đã thêm Lệnh SX mới')
      syncSoLoToKhoach(created.maBravo, record.maDonHang || created.maDonHang, created.ngayThucHien, created.soLo)
    } catch { message.error('Thêm thất bại') }
  }

  if (!record) return null

  const fmtN  = v => v != null ? Number(v).toLocaleString('vi-VN') : '—'
  const isEd  = id => editingId === id
  const numFmt = { formatter: v => v ? Number(v).toLocaleString('vi-VN') : '', parser: v => v ? v.replace(/[^\d]/g, '') : '' }

  // ── inline edit cell builder ──────────────────────────────────────────────
  const cellInp = (field, r, inputEl) => {
    const isNew = r._isNew
    if (!isNew && !isEd(r.id)) return null // signal: use default read render
    const val    = isNew ? newVals[field]   : editVals[field]
    const setVal = nv => isNew
      ? setNewVals(p => ({ ...p, [field]: nv }))
      : setEditVals(p => ({ ...p, [field]: nv }))
    return inputEl(val, setVal)
  }

  const mkTxt = (field, style = {}) => (r) => {
    const inp = cellInp(field, r, (val, set) =>
      <Input size="small" value={val} onChange={e => set(e.target.value)} style={{ width: '100%', ...style }} />
    )
    return inp
  }

  const TO_COLOR_DH = { PCPL1: '#374151', PCPL2: '#374151', PCPL3: '#374151', BBC1: '#7c3aed', DG: '#0369a1', PC: '#166534', PL: '#92400e' }

  // ── Lệnh SX table columns ────────────────────────────────────────────────
  const lenhCols = [
    {
      title: 'Ngày SX', dataIndex: 'ngayThucHien', width: 112,
      render: (v, r) => {
        const inp = cellInp('ngayThucHien', r, (val, set) =>
          <DatePicker size="small" value={val} format="DD/MM/YY" style={{ width: 100 }} onChange={set} />
        )
        if (inp) return inp
        return v
          ? <span style={{ fontSize: 12, color: '#1677ff', fontWeight: 600 }}>{dayjs(v).format('DD/MM/YYYY')}</span>
          : <span style={{ color: '#d9d9d9' }}>—</span>
      },
    },
    {
      title: 'Mã Bravo', dataIndex: 'maBravo', width: 108,
      render: (v, r) => {
        const inp = cellInp('maBravo', r, (val, set) =>
          <Input size="small" value={val} onChange={e => set(e.target.value)} style={{ fontFamily: 'monospace', width: 98 }} />
        )
        if (inp) return inp
        return v
          ? <span style={{ fontFamily: 'monospace', color: '#1677ff', fontWeight: 700, fontSize: 12 }}>{v}</span>
          : <span style={{ color: '#d9d9d9' }}>—</span>
      },
    },
    {
      title: 'Mã SP', dataIndex: 'maSp', width: 78,
      render: (v, r) => {
        const inp = cellInp('maSp', r, (val, set) =>
          <Input size="small" value={val} onChange={e => set(e.target.value)} style={{ width: 68 }} />
        )
        if (inp) return inp
        return v ? <Tag color="blue" style={{ marginRight: 0, fontSize: 11 }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span>
      },
    },
    {
      title: 'Tên Sản Phẩm', dataIndex: 'tenSanPham',
      render: (v, r) => {
        const inp = mkTxt('tenSanPham')(r)
        if (inp) return inp
        return <span style={{ fontSize: 12 }}>{v || <span style={{ color: '#d9d9d9' }}>—</span>}</span>
      },
    },
    {
      title: 'Số Lô', dataIndex: 'soLo', width: 92,
      render: (v, r) => {
        const inp = cellInp('soLo', r, (val, set) =>
          <Input size="small" value={val} onChange={e => set(e.target.value)} style={{ fontFamily: 'monospace', width: 82 }} />
        )
        if (inp) return inp
        return v ? <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span>
      },
    },
    {
      title: 'Cỡ Lô', dataIndex: 'soLuong', width: 102, align: 'right',
      render: (v, r) => {
        const inp = cellInp('soLuong', r, (val, set) =>
          <InputNumber size="small" value={val} min={0} style={{ width: 92 }} {...numFmt} onChange={set} />
        )
        if (inp) return inp
        return v != null
          ? <span style={{ fontWeight: 700, color: '#374151', fontSize: 13 }}>{fmtN(v)}</span>
          : <span style={{ color: '#d9d9d9' }}>—</span>
      },
    },
    {
      title: 'Tổ TH', dataIndex: 'toThucHien', width: 80, align: 'center',
      render: v => v
        ? <Tag style={{ fontWeight: 700, fontSize: 11, marginRight: 0, background: `${TO_COLOR_DH[v] || '#374151'}15`, color: TO_COLOR_DH[v] || '#374151', border: `1px solid ${TO_COLOR_DH[v] || '#374151'}40` }}>{v}</Tag>
        : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Ghi Chú', dataIndex: 'ghiChu',
      render: (v, r) => {
        const inp = mkTxt('ghiChu')(r)
        if (inp) return inp
        return <span style={{ fontSize: 12, color: '#64748b' }}>{v || <span style={{ color: '#d9d9d9' }}>—</span>}</span>
      },
    },
    ...(canEdit ? [{
      title: '', width: 96, align: 'center',
      render: (_, r) => {
        if (r._isNew) return (
          <Space size={3}>
            <Button size="small" type="primary"
              style={{ background: '#22c55e', borderColor: '#22c55e', fontSize: 11 }}
              onClick={saveNewRow}>Thêm</Button>
            <Button size="small" style={{ fontSize: 11 }}
              onClick={() => { setAddingRow(false); setNewVals({}) }}>Bỏ</Button>
          </Space>
        )
        if (isEd(r.id)) return (
          <Space size={3}>
            <Button size="small" type="primary"
              style={{ background: '#1D4ED8', borderColor: '#1D4ED8', fontSize: 11 }}
              onClick={() => saveEdit(r.id)}>Lưu</Button>
            <Button size="small" style={{ fontSize: 11 }}
              onClick={() => setEditingId(null)}>Bỏ</Button>
          </Space>
        )
        return null
      },
    }] : []),
  ]

  const tableData = [...lenhListDisplay, ...(addingRow ? [{ id: '__new__', _isNew: true }] : [])]

  // ── Info grid helpers ─────────────────────────────────────────────────────
  const LCell = ({ children }) => (
    <div style={{ padding: '7px 10px', background: '#f1f5f9', fontWeight: 600, fontSize: 12, color: '#64748b', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>
      {children}
    </div>
  )
  const VCell = ({ children, last }) => (
    <div style={{ padding: '5px 8px', borderBottom: '1px solid #e2e8f0', ...(last ? {} : { borderRight: '1px solid #e2e8f0' }), display: 'flex', alignItems: 'center' }}>
      {children}
    </div>
  )

  return (
    <Modal open={open} onCancel={onClose} footer={null} title={null}
      width={1000} destroyOnClose styles={{ body: { padding: 0 } }}
      wrapClassName="dh-detail-modal">
      <style>{`
        .dh-detail-modal .ant-modal-content { padding: 0 !important; border-radius: 10px !important; overflow: hidden; }
        .dh-detail-modal .ant-modal-body    { padding: 0 !important; }
        .dh-detail-modal .ant-form-item     { margin-bottom: 0 !important; }
        .dh-lenh-tbl .ant-table-thead > tr > th { background: linear-gradient(90deg, #2980b3 0%, #3399CC 100%) !important; color: #ffffff !important; font-size: 11px !important; font-weight: 700 !important; padding: 5px 8px !important; text-transform: uppercase; border-right: 1px solid #4db3d4 !important; }
        .dh-lenh-tbl .ant-table-thead > tr > th::before { display: none !important; }
        .dh-lenh-tbl .ant-table-tbody > tr > td { padding: 4px 6px !important; vertical-align: middle; }
        .dh-lenh-tbl .ant-table-tbody > tr:hover > td { background: #EAECF2 !important; }
        .dh-lenh-tbl ._new-row td { background: #f0fdf4 !important; }
        @keyframes dhRowSlideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dh-lenh-tbl ._new-row { animation: dhRowSlideIn 0.22s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      {/* Header */}
      <div style={{ background: '#1e4570', padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>📦</span>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>
            {record.tenSanPham || 'Chi tiết Đơn Hàng'}
          </div>
          <div style={{ color: '#93c5fd', fontSize: 11, marginTop: 1, display: 'flex', gap: 10 }}>
            {record.maBravo   && <span>Bravo: <b>{record.maBravo}</b></span>}
            {record.maSp      && <span>SP: <b>{record.maSp}</b></span>}
            {record.maDonHang && <span>ĐH: <b style={{ color: '#c4b5fd' }}>{record.maDonHang}</b></span>}
          </div>
        </div>
      </div>

      <Form form={form} component="div" autoComplete="off">
        {/* ── Info grid ── */}
        <div style={{ padding: '12px 16px 8px', background: '#fff' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 130px 1fr', border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
            <LCell>Tên Sản Phẩm</LCell>
            <VCell>
              <Form.Item name="tenSanPham" noStyle>
                <Input size="small" style={{ fontSize: 13, width: '100%' }} />
              </Form.Item>
            </VCell>
            <LCell><span style={{ color: '#cf1322', marginRight: 3 }}>*</span>Mã Bravo</LCell>
            <VCell last>
              <Form.Item name="maBravo" noStyle>
                <Input size="small" style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff', fontSize: 13, width: '100%' }} />
              </Form.Item>
            </VCell>

            <LCell><span style={{ color: '#cf1322', marginRight: 3 }}>*</span>Số Lượng ĐH</LCell>
            <VCell>
              <Form.Item name="soLuongDatHang" noStyle>
                <InputNumber size="small" style={{ width: '100%', fontSize: 13 }} min={0} {...numFmt} disabled />
              </Form.Item>
            </VCell>
            <LCell>Mã SP</LCell>
            <VCell last>
              <Form.Item name="maSp" noStyle>
                <Input size="small" style={{ color: '#1D4ED8', fontWeight: 600, fontSize: 13, width: '100%' }} />
              </Form.Item>
            </VCell>

            <LCell>Ngày Đặt ĐH</LCell>
            <VCell>
              <Form.Item name="ngayDatHang" noStyle>
                <DatePicker size="small" format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </VCell>
            <LCell><span style={{ color: '#cf1322', marginRight: 3 }}>*</span>Mã Đơn Hàng</LCell>
            <VCell last>
              <Form.Item name="maDonHang" noStyle>
                <Input size="small" style={{ fontFamily: 'monospace', color: '#7c3aed', fontWeight: 700, fontSize: 13, width: '100%' }} />
              </Form.Item>
            </VCell>

            <LCell>SL Đã Xếp KH</LCell>
            <VCell>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  {khoachLoading
                    ? <SyncOutlined spin style={{ color: '#1D4ED8', fontSize: 13 }} />
                    : <span style={{ fontWeight: 700, fontSize: 14, color:
                        record.soLuongDatHang > 0 && khoachSlXep > record.soLuongDatHang
                          ? '#f97316'
                          : khoachSlXep > 0 ? '#1D4ED8' : '#94a3b8'
                      }}>
                        {fmtN(khoachSlXep || null)}
                      </span>
                  }
                  {record.soLuongDatHang > 0 && (
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>/ {fmtN(record.soLuongDatHang)}</span>
                  )}
                  <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400 }}>
                    ({khoachList.length} bản ghi KH)
                  </span>
                </div>
                {totalSl > 0 && (
                  <span style={{ fontSize: 10, color: '#64748b' }}>
                    Lệnh SX: <b style={{ color: '#374151' }}>{fmtN(totalSl)}</b>
                  </span>
                )}
              </div>
            </VCell>
            <LCell>Tình Trạng SX</LCell>
            <VCell last>
              <Form.Item noStyle shouldUpdate={(prev, cur) => prev.soLuongDatHang !== cur.soLuongDatHang}>
                {({ getFieldValue }) => {
                  const slDH  = Number(getFieldValue('soLuongDatHang')) || 0
                  const slXep = khoachSlXep > 0 ? khoachSlXep : totalSl
                  const isDone = slDH > 0 && slXep >= slDH
                  return isDone ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '2px 10px', borderRadius: 10,
                      background: '#f6ffed', border: '1px solid #b7eb8f',
                      color: '#389e0d', fontWeight: 700, fontSize: 12 }}>
                      <CheckCircleOutlined /> Hoàn thành
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '2px 10px', borderRadius: 10,
                      background: '#e6f4ff', border: '1px solid #91caff',
                      color: '#1677ff', fontWeight: 700, fontSize: 12 }}>
                      <ClockCircleOutlined /> Đang SX
                    </span>
                  )
                }}
              </Form.Item>
            </VCell>

            <LCell>Ghi Chú</LCell>
            <VCell>
              <Form.Item name="ghiChu" noStyle>
                <Input.TextArea size="small" autoSize={{ minRows: 1, maxRows: 3 }} style={{ fontSize: 12, width: '100%' }} />
              </Form.Item>
            </VCell>
            <LCell>Tình Trạng ĐH</LCell>
            <VCell last>
              <Form.Item name="tinhTrangDatHang" noStyle>
                <Select size="small" allowClear placeholder="Chọn..." style={{ width: '100%' }}>
                  <Option value="rat_gap"><FireOutlined style={{ color: '#cf1322' }} /> Rất Gấp</Option>
                  <Option value="gap"><ThunderboltOutlined style={{ color: '#d46b08' }} /> Gấp</Option>
                </Select>
              </Form.Item>
            </VCell>

            <LCell>Tổ Thực Hiện</LCell>
            <VCell last style={{ gridColumn: 'span 3' }}>
              {khoachLoading
                ? <SyncOutlined spin style={{ color: '#1D4ED8', fontSize: 12 }} />
                : toThucHienArr.length > 0
                  ? <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {toThucHienArr.map(t => (
                        <Tag key={t} style={{ fontWeight: 700, fontSize: 12, marginRight: 0, background: `${TO_COLORS_MODAL[t] || '#374151'}15`, color: TO_COLORS_MODAL[t] || '#374151', border: `1px solid ${TO_COLORS_MODAL[t] || '#374151'}45` }}>{t}</Tag>
                      ))}
                    </div>
                  : <span style={{ color: '#d9d9d9', fontSize: 12 }}>Chưa xếp kế hoạch</span>
              }
            </VCell>

            <LCell>Đã lên lịch SX</LCell>
            <VCell>
              <Form.Item name="daLenLichLam" valuePropName="checked" noStyle>
                <Checkbox><span style={{ fontSize: 12, color: '#1D4ED8', fontWeight: 600 }}>Đã lên lịch làm</span></Checkbox>
              </Form.Item>
            </VCell>
            <LCell>Đã lên lịch ĐG</LCell>
            <VCell last>
              <Form.Item name="daDgVaXepLichDg" valuePropName="checked" noStyle>
                <Checkbox><span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>Đã ĐG & lịch ĐG</span></Checkbox>
              </Form.Item>
            </VCell>
          </div>
        </div>

        {/* ── Lệnh SX table ── */}
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#1D4ED8', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            📋 Lệnh Sản Xuất liên kết
            {totalSl > 0 && (
              <span style={{ fontWeight: 400, fontSize: 11, color: '#1D4ED8', background: '#EAECF2', padding: '1px 8px', borderRadius: 8, border: '1px solid #D0D5DC' }}>
                Tổng Cỡ Lô: <b>{fmtN(totalSl)}</b>
              </span>
            )}
            <Tooltip title="Đồng bộ với kế hoạch: xóa lệnh không còn lịch, bổ sung lệnh còn thiếu">
              <Button size="small" type="default" loading={syncing} icon={<SyncOutlined />}
                style={{ marginLeft: 'auto', fontSize: 11, color: '#0369a1', borderColor: '#bae6fd', background: '#f0f9ff' }}
                onClick={syncLenhWithKhoach}>
                Đồng bộ KH
              </Button>
            </Tooltip>
          </div>
          <Table className="dh-lenh-tbl"
            columns={lenhCols} dataSource={tableData} rowKey="id"
            loading={lenhLoading} pagination={false} size="small"
            rowClassName={r => r._isNew ? '_new-row' : ''}
            locale={{ emptyText: <span style={{ color: '#d9d9d9', fontSize: 12 }}>Chưa có Lệnh SX</span> }}
            footer={canEdit ? () => (
              <Button size="small" type="dashed" icon={<PlusOutlined />}
                style={{ fontSize: 11, color: '#1D4ED8', borderColor: '#D0D5DC', visibility: addingRow ? 'hidden' : 'visible' }}
                onClick={() => {
                  setNewVals({
                    maBravo:    record.maBravo    || '',
                    maSp:       record.maSp       || '',
                    tenSanPham: record.tenSanPham || '',
                  })
                  setAddingRow(true)
                }}>
                Thêm mới
              </Button>
            ) : undefined}
          />
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '10px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#94a3b8', marginRight: 'auto' }}>ID: #{record.id}</span>
          <Button onClick={onClose} style={{ borderColor: '#D0D5DC', color: '#64748b' }}>Đóng</Button>
          {canEdit && (
            <Button type="primary" loading={saving} onClick={handleSave}
              style={{ background: 'linear-gradient(135deg, #1D4ED8, #2563EB)', borderColor: '#1D4ED8', fontWeight: 700 }}>
              Cập Nhật
            </Button>
          )}
        </div>
      </Form>

      {/* ── Đổi SL Modal ── */}
      <Modal
        open={doiSlOpen} onCancel={() => setDoiSlOpen(false)}
        onOk={handleDoiSl} okText="Xác nhận đổi SL" cancelText="Hủy"
        confirmLoading={doiSlLoading} destroyOnClose
        title={<Space><ThunderboltOutlined style={{ color: '#d46b08' }} /><span style={{ fontWeight: 700 }}>Đổi Số Lượng Đặt Hàng</span></Space>}
        width={480}
      >
        <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fff7e6', borderRadius: 6, border: '1px solid #ffd591', fontSize: 13 }}>
          SL hiện tại: <b style={{ color: '#d46b08', fontSize: 15 }}>{fmtN(record.soLuongDatHang)}</b>
        </div>
        <Form form={doiSlForm} layout="vertical" autoComplete="off">
          <Form.Item label="Số Lượng Mới" name="slMoi"
            rules={[{ required: true, message: 'Nhập số lượng mới' }, { type: 'number', min: 1, message: 'Phải lớn hơn 0' }]}>
            <InputNumber style={{ width: '100%' }} min={1} placeholder="Nhập số lượng mới"
              formatter={v => v ? Number(v).toLocaleString('vi-VN') : ''}
              parser={v => v ? v.replace(/[^\d]/g, '') : ''} />
          </Form.Item>
          <Form.Item label="Lý do thay đổi" name="lyDo"
            rules={[{ required: true, message: 'Nhập lý do thay đổi' }]}>
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="VD: Khách hàng điều chỉnh đơn hàng ngày ..." />
          </Form.Item>
        </Form>
        {/* Lịch sử đổi SL */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#374151', marginBottom: 6 }}>Lịch sử thay đổi SL</div>
          {lichSuLoading
            ? <SyncOutlined spin style={{ color: '#1D4ED8' }} />
            : lichSuSl.length === 0
              ? <span style={{ color: '#94a3b8', fontSize: 12 }}>Chưa có lịch sử thay đổi</span>
              : <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {lichSuSl.map(h => (
                    <div key={h.id} style={{ padding: '5px 10px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>
                          <span style={{ color: '#94a3b8' }}>{h.slCu != null ? Number(h.slCu).toLocaleString('vi-VN') : '—'}</span>
                          {' → '}
                          <b style={{ color: '#1D4ED8' }}>{h.slMoi != null ? Number(h.slMoi).toLocaleString('vi-VN') : '—'}</b>
                        </span>
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>
                          {h.changedBy} · {h.changedAt ? dayjs(h.changedAt).format('DD/MM/YY HH:mm') : ''}
                        </span>
                      </div>
                      {h.lyDo && <div style={{ color: '#64748b', marginTop: 2 }}>{h.lyDo}</div>}
                    </div>
                  ))}
                </div>
          }
        </div>
      </Modal>

    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DonHangPage() {
  const { isAdmin, isAdminKH } = useAuth()
  const canEdit = isAdmin() || isAdminKH()

  const [data,        setData]       = useState([])
  const [loading,     setLoading]    = useState(false)
  const [syncing,     setSyncing]    = useState(false)
  const [saving,      setSaving]     = useState({})

  // Filters
  const [dateRange,   setDateRange]  = useState([null, null])
  const [filterMaSp,  setFilterMaSp] = useState('')
  const [filterDH,    setFilterDH]   = useState(null)
  const [filterSx,    setFilterSx]   = useState(null)

  // Add modal
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editItem,   setEditItem]   = useState(null)
  // Import Excel modal
  const [importOpen, setImportOpen] = useState(false)
  // Detail modal (edit + Lệnh SX)
  const [detailOpen,   setDetailOpen]   = useState(false)
  const [detailRecord, setDetailRecord] = useState(null)

  // Hidden orders (right-click → Ẩn)
  const [hiddenIds, setHiddenIds] = useState(() => {
    try {
      const saved = localStorage.getItem('donhang_hidden_ids')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  useEffect(() => {
    localStorage.setItem('donhang_hidden_ids', JSON.stringify([...hiddenIds]))
  }, [hiddenIds])
  const [showHidden, setShowHidden] = useState(false)
  const [activeTab,  setActiveTab]  = useState('active') // 'active' | 'done'

  // Sticky header offset
  const headerWrapRef = useRef(null)
  const [headerOffset, setHeaderOffset] = useState(0)
  useEffect(() => {
    if (!headerWrapRef.current) return
    const obs = new ResizeObserver(() => setHeaderOffset(headerWrapRef.current?.offsetHeight || 0))
    obs.observe(headerWrapRef.current)
    return () => obs.disconnect()
  }, [])

  // Context menu
  const [ctxMenu, setCtxMenu] = useState({ visible: false, x: 0, y: 0, record: null })
  useEffect(() => {
    if (!ctxMenu.visible) return
    const hide = () => setCtxMenu(m => ({ ...m, visible: false }))
    document.addEventListener('click', hide)
    return () => document.removeEventListener('click', hide)
  }, [ctxMenu.visible])

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterDH) params.tinhTrangDatHang = filterDH
      if (filterSx) params.tinhTrangSx      = filterSx

      // Fetch đồng thời đơn hàng + WorkSchedule PLAN để tính SL đã xếp KH (cùng nguồn với tab Kế Hoạch)
      const [dhRes, khRes, lenhRes] = await Promise.all([
        api.get('/don-hang', { params }),
        api.get('/work-schedule', { params: { source: 'PLAN', page: 0, size: 2000 } }),
        api.get('/lenh-san-xuat'),
      ])
      const allKhoach = (khRes.data?.content || []).filter(r => r.maBravo && r.maDonHang)

      // Đếm số lệnh SX theo composite key maBravo + maDonHang
      const allLenh = Array.isArray(lenhRes.data) ? lenhRes.data : (lenhRes.data?.content || [])
      const lenhCountMap = {}
      allLenh.forEach(l => {
        if (!l.maBravo || !l.maDonHang) return
        const k = `${l.maBravo}||${l.maDonHang}`
        lenhCountMap[k] = (lenhCountMap[k] || 0) + 1
      })

      // Tính lại soLuongDaXepKh và tinhTrangSx từ Kế hoạch PLAN (coLo) — đồng bộ với BẢNG ĐƠN HÀNG
      const computeTinhTrangSx = (slXep, slDat) => {
        if (slXep <= 0)      return null     // chưa xếp → để trống
        if (slXep >= slDat)  return 'done'   // đủ hoặc vượt → Hoàn thành
        return 'doing'                        // còn thiếu  → Đang SX
      }

      const enriched = (dhRes.data || []).map(dh => {
        const matched = allKhoach.filter(r =>
          r.maBravo === dh.maBravo && r.maDonHang === dh.maDonHang
        )
        const _seen = new Set()
        let slXep = 0
        for (const r of matched) {
          if (r.toNhom !== 'PCPL1' && r.toNhom !== 'PCPL2') continue
          if (!r.maBravo || !r.maDonHang || !r.toNhom || !r.soLo) continue
          const _key = `${r.maBravo}||${r.maDonHang}||${r.toNhom}||${r.soLo}`
          if (_seen.has(_key)) continue
          _seen.add(_key)
          slXep += Number(r.coLo) || 0
        }
        const slDat = Number(dh.soLuongDatHang) || 0
        const newSx = computeTinhTrangSx(slXep, slDat)
        const toThucHienList = [...new Set(matched.map(r => r.toNhom).filter(Boolean))]
        const hasKhoach = matched.length > 0
        const soLenh = lenhCountMap[`${dh.maBravo}||${dh.maDonHang}`] || 0

        return { ...dh, soLuongDaXepKh: slXep, soLuongConLai: slDat - slXep, tinhTrangSx: newSx, soLenh, toThucHienList, hasKhoach }
      })

      setData(enriched)

      // Cập nhật DB ngầm cho các bản ghi có tinhTrangSx thay đổi
      const changed = enriched.filter(dh => {
        const orig = (dhRes.data || []).find(r => r.id === dh.id)
        return orig && orig.tinhTrangSx !== dh.tinhTrangSx
      })
      if (changed.length > 0) {
        Promise.all(changed.map(dh =>
          api.put(`/don-hang/${dh.id}`, { ...dh })
        )).catch(() => {/* best-effort */})
      }
    } catch { message.error('Không thể tải dữ liệu đơn hàng') }
    finally { setLoading(false) }
  }, [filterDH, filterSx])

  useEffect(() => { load() }, [load])

  // ── Client-side filter ────────────────────────────────────────────────────
  const baseFilter = r => {
    if (filterMaSp && !r.maSp?.toLowerCase().includes(filterMaSp.toLowerCase())
                   && !r.maBravo?.toLowerCase().includes(filterMaSp.toLowerCase())
                   && !r.tenSanPham?.toLowerCase().includes(filterMaSp.toLowerCase())) return false
    if (dateRange[0] && r.ngayDatHang && dayjs(r.ngayDatHang).isBefore(dateRange[0], 'day')) return false
    if (dateRange[1] && r.ngayDatHang && dayjs(r.ngayDatHang).isAfter(dateRange[1], 'day')) return false
    return true
  }
  // Active table: not done, not hidden (or show hidden toggle)
  const displayData = data.filter(r =>
    r.tinhTrangSx !== 'done' &&
    (showHidden || !hiddenIds.has(r.id)) &&
    baseFilter(r)
  )
  // Completed table: tinhTrangSx === 'done' (always from full data, no hidden filter)
  const completedData = data.filter(r => r.tinhTrangSx === 'done' && baseFilter(r))

  // ── Sync from Kế Hoạch ────────────────────────────────────────────────────
  const syncKhoach = async () => {
    setSyncing(true)
    try {
      const { data: res } = await api.post('/don-hang/sync-khoach')
      message.success(res.message || 'Đồng bộ thành công')
      load()
    } catch { message.error('Đồng bộ thất bại') }
    finally { setSyncing(false) }
  }

  // ── Toggle bool ───────────────────────────────────────────────────────────
  const toggleBool = async (id, field, cur) => {
    setSaving(p => ({ ...p, [id]: true }))
    try {
      await api.put(`/don-hang/${id}`, { [field]: !cur })
      setData(prev => prev.map(r => r.id === id ? { ...r, [field]: !cur } : r))
    } catch { message.error('Lưu thất bại') }
    finally { setSaving(p => { const n = { ...p }; delete n[id]; return n }) }
  }

  const deleteRow = async (id) => {
    try {
      await api.delete(`/don-hang/${id}`)
      setData(prev => prev.filter(r => r.id !== id))
      message.success('Đã xóa đơn hàng')
      window.dispatchEvent(new CustomEvent('app:donhang-updated'))
    } catch { message.error('Xóa thất bại') }
  }

  const openAdd    = () => { setEditItem(null); setModalOpen(true) }
  const openEdit   = (r) => { setEditItem(r);   setModalOpen(true) }
  const openDetail = (r) => { setDetailRecord(r); setDetailOpen(true) }

  // Khi lưu đơn hàng: đồng bộ ngược lại các bản ghi WorkSchedule PLAN có cùng maBravo+maDonHang
  const syncToKhoach = useCallback(async (dhPayload) => {
    const { maBravo, maSp, tenSanPham, maDonHang, soLuongDatHang } = dhPayload
    if (!maBravo || !maDonHang) return
    try {
      const { data: res } = await api.get('/work-schedule', {
        params: { source: 'PLAN', page: 0, size: 1000 },
      })
      const all = Array.isArray(res) ? res : (res.content || [])
      const matched = all.filter(r => r.maBravo === maBravo && r.maDonHang === maDonHang)
      if (matched.length > 0) {
        await Promise.all(matched.map(r => api.put(`/work-schedule/${r.id}`, {
          ...r,
          maSp:      maSp       || r.maSp,
          tenTrinh:  tenSanPham || r.tenTrinh,
          coLo:      soLuongDatHang != null ? soLuongDatHang : r.coLo,
        })))
        message.success(`Đã cập nhật ${matched.length} bản ghi Kế Hoạch tương ứng`, 2)
      }
    } catch { /* best-effort */ }
  }, [])

  const notifyDonHangUpdated = () => window.dispatchEvent(new CustomEvent('app:donhang-updated'))
  const onSaved       = (payload) => { setModalOpen(false);  load(); notifyDonHangUpdated(); if (payload) { syncToKhoach(payload) } }
  const onDetailSaved = (payload) => { setDetailOpen(false); load(); notifyDonHangUpdated(); if (payload) { syncToKhoach(payload) } }

  // ── KPIs — tất cả tính từ data đã qua baseFilter để đồng bộ với các tab ──
  const filteredAll = data.filter(r => baseFilter(r))
  const kpi = {
    total:   filteredAll.length,
    ratGap:  filteredAll.filter(r => r.tinhTrangDatHang === 'rat_gap').length,
    gap:     filteredAll.filter(r => r.tinhTrangDatHang === 'gap').length,
    done:    completedData.length,   // completedData đã có baseFilter
    daLich:  filteredAll.filter(r => r.daLenLichLam).length,
    daDg:    filteredAll.filter(r => r.daDgVaXepLichDg).length,
    tongDat: filteredAll.reduce((s, r) => s + (Number(r.soLuongDatHang) || 0), 0),
    tongXep: filteredAll.reduce((s, r) => s + (Number(r.soLuongDaXepKh) || 0), 0),
  }

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      title: '#', key: 'stt', width: 44, fixed: 'left', align: 'center',
      render: (_, r, i) => (
        <div style={{ position: 'relative' }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{i + 1}</span>
          {saving[r.id] && <SyncOutlined spin style={{ position: 'absolute', top: 0, right: -2, fontSize: 9, color: '#1D4ED8' }} />}
        </div>
      ),
    },
    {
      title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 115, fixed: 'left',
      render: v => v
        ? <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff', fontSize: 12 }}>{v}</span>
        : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Mã SP', dataIndex: 'maSp', key: 'maSp', width: 85,
      render: v => v ? <Tag color="blue" style={{ marginRight: 0, fontWeight: 600 }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Tên Sản Phẩm', dataIndex: 'tenSanPham', key: 'tenSanPham', width: 220,
      render: v => (
        <span style={{ fontSize: 13, color: '#1e293b', fontWeight: 500, lineHeight: 1.4 }}>
          {v || <span style={{ color: '#d9d9d9' }}>—</span>}
        </span>
      ),
    },
    {
      title: 'Ngày Đặt Hàng', dataIndex: 'ngayDatHang', key: 'ngayDatHang', width: 110, align: 'center',
      sorter: (a, b) => (a.ngayDatHang || '').localeCompare(b.ngayDatHang || ''),
      render: v => v
        ? <span style={{ fontSize: 12, color: '#374151' }}>{dayjs(v).format('DD/MM/YYYY')}</span>
        : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Số Lệnh', dataIndex: 'soLenh', key: 'soLenh', width: 90, align: 'center',
      sorter: (a, b) => (a.soLenh || 0) - (b.soLenh || 0),
      render: v => v > 0
        ? <span style={{ fontWeight: 700, fontSize: 13, color: '#1677ff' }}>{v}</span>
        : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Mã Đơn Hàng', dataIndex: 'maDonHang', key: 'maDonHang', width: 115,
      render: v => v
        ? <span style={{ fontFamily: 'monospace', color: '#7c3aed', fontWeight: 600, fontSize: 12 }}>{v}</span>
        : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'SL Đặt Hàng', dataIndex: 'soLuongDatHang', key: 'slDat', width: 110, align: 'right',
      sorter: (a, b) => (Number(a.soLuongDatHang) || 0) - (Number(b.soLuongDatHang) || 0),
      render: v => v != null
        ? <span style={{ fontWeight: 800, color: '#374151', fontSize: 13 }}>{fmtNum(v)}</span>
        : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Tình Trạng ĐH', dataIndex: 'tinhTrangDatHang', key: 'ttDh', width: 115, align: 'center',
      render: v => {
        const cfg = TINH_TRANG_DH[v]
        if (!cfg) return <span style={{ color: '#d9d9d9', fontSize: 11 }}>—</span>
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            color: cfg.color, fontWeight: 700, fontSize: 11,
            borderRadius: 12, padding: '2px 10px',
          }}>
            {cfg.icon} {cfg.label}
          </span>
        )
      },
    },
    {
      title: 'SL Còn Lại', dataIndex: 'soLuongConLai', key: 'slCon', width: 110, align: 'right',
      sorter: (a, b) => (Number(a.soLuongConLai) || 0) - (Number(b.soLuongConLai) || 0),
      render: v => {
        const n = Number(v) || 0
        const color = n < 0 ? '#8c8c8c' : n === 0 ? '#389e0d' : '#cf1322'
        return <span style={{ fontWeight: 700, color, fontSize: 13 }}>{fmtNum(v)}</span>
      },
    },
    {
      title: 'Tình Trạng', key: 'ttSx', width: 130, align: 'center',
      render: (_, r) => {
        // Có lệnh SX nhưng không còn kế hoạch → đã xóa kế hoạch
        if (!r.hasKhoach && (r.soLenh || 0) > 0) {
          return <span style={{ fontSize: 11, color: '#6b7280' }}>Đã xóa kế hoạch</span>
        }
        const cfg = TINH_TRANG_SX[r.tinhTrangSx]
        if (!cfg) return <span style={{ color: '#d9d9d9', fontSize: 11 }}>Chưa bắt đầu</span>
        return (
          <Badge
            status={r.tinhTrangSx === 'done' ? 'success' : 'processing'}
            text={<span style={{ fontWeight: 600, color: cfg.color, fontSize: 11 }}>{cfg.label}</span>}
          />
        )
      },
    },
    {
      title: 'Tổ Thực Hiện', dataIndex: 'toThucHienList', key: 'toTH', width: 130, align: 'center',
      render: v => {
        const list   = Array.isArray(v) ? v : []
        const colors = { PCPL1: '#374151', PCPL2: '#546e7a', PCPL3: '#607d8b', BBC1: '#7c3aed', DG: '#0369a1', PC: '#166534', PL: '#92400e' }
        if (list.length === 0) return <span style={{ color: '#d9d9d9' }}>—</span>
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
            {list.map(t => (
              <Tag key={t} style={{ fontWeight: 700, fontSize: 11, marginRight: 0, background: `${colors[t] || '#374151'}18`, color: colors[t] || '#374151', border: `1px solid ${colors[t] || '#374151'}45` }}>{t}</Tag>
            ))}
          </div>
        )
      },
    },
    {
      title: 'Đã Lên Lịch', key: 'daLich', width: 90, align: 'center',
      render: (_, r) => (
        <Tooltip title={r.daLenLichLam ? 'Đã lên lịch — click để bỏ' : 'Chưa lên lịch — click để đánh dấu'}>
          <Checkbox
            checked={!!r.daLenLichLam}
            onClick={e => e.stopPropagation()}
            onChange={() => toggleBool(r.id, 'daLenLichLam', r.daLenLichLam)}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Ghi Chú', dataIndex: 'ghiChu', key: 'ghiChu', width: 180,
      render: v => v ? <span style={{ fontSize: 12, color: '#64748b' }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Đã ĐG & Lịch ĐG', key: 'daDg', width: 100, align: 'center',
      render: (_, r) => (
        <Tooltip title={r.daDgVaXepLichDg ? 'Đã ĐG — click để bỏ' : 'Chưa — click để đánh dấu'}>
          <Checkbox
            checked={!!r.daDgVaXepLichDg}
            onClick={e => e.stopPropagation()}
            onChange={() => toggleBool(r.id, 'daDgVaXepLichDg', r.daDgVaXepLichDg)}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Thao Tác', key: 'action', width: 88, fixed: 'right', align: 'center',
      render: (_, r) => (
        <div onClick={e => e.stopPropagation()}>
          {canEdit ? (
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  {
                    key: 'edit',
                    icon: <EditOutlined style={{ color: '#1D4ED8' }} />,
                    label: <span style={{ color: '#1D4ED8', fontWeight: 600 }}>Chỉnh sửa</span>,
                    onClick: () => openDetail(r),
                  },
                  { type: 'divider' },
                  hiddenIds.has(r.id) ? {
                    key: 'show',
                    icon: <EyeOutlined style={{ color: '#22c55e' }} />,
                    label: <span style={{ color: '#22c55e', fontWeight: 600 }}>Hiện đơn hàng</span>,
                    onClick: () => {
                      setHiddenIds(prev => { const n = new Set(prev); n.delete(r.id); return n })
                      message.success('Đã hiện lại đơn hàng')
                    },
                  } : {
                    key: 'hide',
                    icon: <EyeInvisibleOutlined style={{ color: '#64748b' }} />,
                    label: <span style={{ color: '#64748b', fontWeight: 600 }}>Ẩn đơn hàng</span>,
                    onClick: () => {
                      setHiddenIds(prev => new Set([...prev, r.id]))
                      message.success('Đã ẩn đơn hàng')
                    },
                  },
                  { type: 'divider' },
                  {
                    key: 'delete',
                    icon: <DeleteOutlined style={{ color: '#ef4444' }} />,
                    label: (
                      <Popconfirm
                        title="Xóa đơn hàng này?"
                        okText="Xóa" cancelText="Huỷ"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => deleteRow(r.id)}
                        onClick={e => e.stopPropagation()}
                      >
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>Xóa</span>
                      </Popconfirm>
                    ),
                  },
                ],
              }}
            >
              <Button size="small"
                style={{ fontSize: 11, fontWeight: 600, color: '#1D4ED8', borderColor: '#bfdbfe', background: '#eff6ff' }}>
                Cập nhật ▾
              </Button>
            </Dropdown>
          ) : (
            <Button size="small" type="text" icon={<EditOutlined />}
              style={{ color: '#94a3b8' }} onClick={() => openDetail(r)} />
          )}
        </div>
      ),
    },
  ]

  const rowClassName = (r) => {
    if (r.tinhTrangDatHang === 'rat_gap') return 'dh-row-rat-gap'
    if (r.tinhTrangDatHang === 'gap')     return 'dh-row-gap'
    return ''
  }

  return (
    <>
      <style>{`
        .dh-table .ant-table-thead > tr > th {
          background: linear-gradient(90deg, #2980b3 0%, #3399CC 100%) !important; color: #ffffff !important;
          font-size: 11px !important; font-weight: 700 !important; text-transform: uppercase;
          padding: 7px 8px !important; white-space: nowrap; letter-spacing: 0.4px;
          border-right: 1px solid #4db3d4 !important;
        }
        .dh-table .ant-table-thead > tr > th::before { display: none !important; }
        .dh-table .ant-table-tbody > tr > td { padding: 6px 8px !important; vertical-align: middle; }
        .dh-table .ant-table-tbody > tr:hover > td { background: #EAECF2 !important; }
        .dh-table .ant-table-column-sort { background: transparent !important; }
        .dh-row-rat-gap { background: #fff1f0 !important; }
        .dh-row-rat-gap:hover > td { background: #ffe4e4 !important; }
        .dh-row-gap { background: #fffbe6 !important; }
        .dh-row-gap:hover > td { background: #fff4cc !important; }
        .dh-row-done { background: #f0fdf4 !important; }
        .dh-row-done:hover > td { background: #dcfce7 !important; }
        .dh-row-hidden { opacity: 0.5; }
        .dh-table-done .ant-table-thead > tr > th { background: #166534 !important; border-right: 1px solid #15803d !important; }
      `}</style>

      {/* ── Sticky header wrapper ── */}
      <div ref={headerWrapRef} style={{ position: 'sticky', top: 0, zIndex: 20 }}>

      {/* ── Header & KPI strip ── */}
      <div style={{
        background: '#1e4570',
        padding: '10px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>
            📦 Đơn Hàng
          </span>
          {/* KPI badges */}
          {[
            { label: 'Tổng ĐH',    val: kpi.total,  color: '#DDE1E8', bg: 'rgba(255,255,255,0.15)', tab: null },
            { label: 'Rất Gấp',    val: kpi.ratGap, color: '#ffa39e', bg: 'rgba(255,163,158,0.2)',  tab: null },
            { label: 'Gấp',        val: kpi.gap,    color: '#ffd591', bg: 'rgba(255,213,145,0.2)',  tab: null },
            { label: 'Hoàn thành', val: kpi.done,   color: '#b7eb8f', bg: 'rgba(183,235,143,0.2)',  tab: 'done' },
            { label: 'Đã lịch',    val: kpi.daLich, color: '#91caff', bg: 'rgba(145,202,255,0.2)',  tab: null },
          ].map(k => (
            <span key={k.label}
              onClick={k.tab ? () => setActiveTab(k.tab) : undefined}
              style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px',
                background: k.tab === activeTab ? 'rgba(255,255,255,0.35)' : k.bg,
                border: `1px solid ${k.color}${k.tab === activeTab ? 'cc' : '55'}`,
                color: k.color, borderRadius: 10,
                cursor: k.tab ? 'pointer' : 'default',
                boxShadow: k.tab === activeTab ? `0 0 0 2px ${k.color}55` : 'none',
              }}>
              {k.label} <span style={{ fontSize: 14 }}>{k.val}</span>
            </span>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#91caff' }}>
              Tổng ĐH: <b>{fmtNum(kpi.tongDat)}</b>
            </span>
            <span style={{ fontSize: 11, color: '#b7eb8f' }}>
              Đã xếp KH: <b>{fmtNum(kpi.tongXep)}</b>
            </span>
            <span style={{ fontSize: 11, color: '#ffd591' }}>
              Còn lại: <b style={{ color: kpi.tongDat - kpi.tongXep > 0 ? '#ffa39e' : '#b7eb8f' }}>
                {fmtNum(kpi.tongDat - kpi.tongXep)}
              </b>
            </span>
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div style={{
        background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
        padding: '8px 12px', display: 'flex', alignItems: 'center',
        gap: 8, flexWrap: 'wrap',
      }}>
        <RangePicker size="small" format="DD/MM/YYYY" placeholder={['Từ ngày ĐH', 'Đến ngày ĐH']}
          value={dateRange} onChange={v => setDateRange(v || [null, null])} style={{ width: 230 }} />

        <Input size="small" allowClear style={{ width: 160 }}
          placeholder="Mã SP / Bravo / Tên SP"
          prefix={<SearchOutlined style={{ color: '#bbb' }} />}
          value={filterMaSp} onChange={e => setFilterMaSp(e.target.value)} />

        <Select size="small" allowClear placeholder="Tình trạng ĐH" style={{ width: 135 }}
          value={filterDH} onChange={v => setFilterDH(v ?? null)}>
          <Option value="rat_gap"><FireOutlined style={{ color: '#cf1322' }} /> Rất Gấp</Option>
          <Option value="gap"><ThunderboltOutlined style={{ color: '#d46b08' }} /> Gấp</Option>
        </Select>

        <Select size="small" allowClear placeholder="Tình trạng SX" style={{ width: 135 }}
          value={filterSx} onChange={v => setFilterSx(v ?? null)}>
          <Option value="doing"><ClockCircleOutlined style={{ color: '#1677ff' }} /> Đang SX</Option>
          <Option value="done"><CheckCircleOutlined style={{ color: '#389e0d' }} /> Hoàn thành</Option>
        </Select>

        <Button size="small" type="primary" icon={<SearchOutlined />} onClick={load}
          style={{ background: '#1D4ED8', borderColor: '#1D4ED8' }}>
          Tìm
        </Button>
        <Button size="small" icon={<ReloadOutlined />} onClick={load} loading={loading} />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {hiddenIds.size > 0 && (
            <Tooltip title={showHidden ? 'Ẩn lại các đơn đã ẩn' : `Hiển thị ${hiddenIds.size} đơn đã ẩn`}>
              <Button size="small"
                icon={showHidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={() => setShowHidden(v => !v)}
                style={{ borderColor: showHidden ? '#cf1322' : '#64748b', color: showHidden ? '#cf1322' : '#64748b' }}>
                {showHidden ? 'Ẩn lại' : `Đơn ẩn (${hiddenIds.size})`}
              </Button>
            </Tooltip>
          )}
          {showHidden && hiddenIds.size > 0 && (
            <Tooltip title="Bỏ ẩn tất cả các đơn hàng">
              <Button size="small" onClick={() => { setHiddenIds(new Set()); setShowHidden(false) }}
                style={{ borderColor: '#f97316', color: '#f97316' }}>
                Bỏ ẩn tất cả
              </Button>
            </Tooltip>
          )}
          {canEdit && (
            <>
              <Button size="small" icon={<FileExcelOutlined />}
                onClick={() => setImportOpen(true)}
                style={{ borderColor: '#217346', color: '#217346', fontWeight: 600 }}>
                Import Excel
              </Button>
              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openAdd}
                style={{ background: '#1D4ED8', borderColor: '#1D4ED8', fontWeight: 600 }}>
                Thêm đơn hàng
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', background: '#fff', paddingLeft: 12 }}>
        {[
          { key: 'active',  label: '📋 Đơn Hàng',      count: displayData.length + (showHidden ? 0 : hiddenIds.size) },
          { key: 'done',    label: '🏆 Đã Hoàn Thành', count: completedData.length },
        ].map(tab => (
          <div key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              color: activeTab === tab.key ? '#1D4ED8' : '#94a3b8',
              borderBottom: activeTab === tab.key ? '2px solid #1D4ED8' : '2px solid transparent',
              marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.15s',
            }}>
            {tab.label}
            <span style={{
              fontSize: 11, fontWeight: 700,
              background: activeTab === tab.key ? (tab.danger ? '#dc2626' : '#1D4ED8')
                        : (tab.danger && tab.count > 0 ? '#fee2e2' : '#e2e8f0'),
              color: activeTab === tab.key ? '#fff'
                   : (tab.danger && tab.count > 0 ? '#dc2626' : '#64748b'),
              borderRadius: 10, padding: '1px 7px', minWidth: 20, textAlign: 'center',
            }}>
              {tab.count}
            </span>
          </div>
        ))}
      </div>
      </div>{/* end sticky header wrapper */}

      {/* ── Table ── */}
      {activeTab === 'active' ? (
      <Table
        className="dh-table"
        columns={columns}
        dataSource={displayData}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 1980 }}
        sticky={{ offsetHeader: headerOffset }}
        rowHoverable={false}
        rowClassName={r => {
          const base = rowClassName(r)
          return hiddenIds.has(r.id) ? `${base} dh-row-hidden`.trim() : base
        }}
        onRow={r => ({
          onClick: () => openDetail(r),
          style: { cursor: 'pointer' },
          onContextMenu: e => {
            e.preventDefault()
            setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, record: r })
          },
        })}
        pagination={{
          defaultPageSize: 50,
          pageSizeOptions: ['20', '50', '100'],
          showSizeChanger: true,
          showTotal: t => `Tổng ${t} đơn hàng`,
        }}
        summary={pageData => {
          const tongDat = pageData.reduce((s, r) => s + (Number(r.soLuongDatHang) || 0), 0)
          const tongXep = pageData.reduce((s, r) => s + (Number(r.soLuongDaXepKh) || 0), 0)
          const conLai  = tongDat - tongXep
          const pct     = tongDat > 0 ? Math.round(tongXep / tongDat * 100) : 0
          return (
            <Table.Summary fixed="bottom">
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4} align="right">
                  <strong style={{ color: '#1D4ED8', fontSize: 11 }}>Trang hiện tại ({pageData.length} đơn):</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <strong style={{ color: '#374151' }}>{fmtNum(tongDat)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} />
                <Table.Summary.Cell index={6} align="right">
                  <div>
                    <strong style={{ color: '#1D4ED8' }}>{fmtNum(tongXep)}</strong>
                    <Progress percent={pct} size="small" showInfo={false}
                      strokeColor={pct >= 100 ? '#389e0d' : '#607080'} style={{ marginBottom: 0 }} />
                  </div>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  <strong style={{ color: conLai > 0 ? '#cf1322' : '#389e0d' }}>{fmtNum(conLai)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8} colSpan={6} />
              </Table.Summary.Row>
            </Table.Summary>
          )
        }}
      />
      ) : activeTab === 'done' ? (
      /* ── Tab: Đã Hoàn Thành ── */
      <Table
        className="dh-table dh-table-done"
        columns={columns}
        dataSource={completedData}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 1980 }}
        sticky={{ offsetHeader: headerOffset }}
        rowHoverable={false}
        rowClassName={() => 'dh-row-done'}
        onRow={r => ({
          onClick: () => openDetail(r),
          style: { cursor: 'pointer' },
          onContextMenu: e => {
            e.preventDefault()
            setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, record: r })
          },
        })}
        pagination={{
          defaultPageSize: 20,
          pageSizeOptions: ['10', '20', '50'],
          showSizeChanger: true,
          showTotal: t => `${t} đơn đã hoàn thành`,
        }}
        locale={{ emptyText: <span style={{ color: '#d9d9d9' }}>Chưa có đơn hàng hoàn thành</span> }}
      />
      ) : null}

      {/* ── Context Menu ── */}
      {ctxMenu.visible && (
        <div
          style={{
            position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, zIndex: 9999,
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6,
            boxShadow: '0 6px 16px rgba(0,0,0,0.15)', minWidth: 180, overflow: 'hidden',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div
            style={{ padding: '8px 14px', fontSize: 11, color: '#94a3b8', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}
          >
            {ctxMenu.record?.tenSanPham || ctxMenu.record?.maBravo || 'Đơn hàng'}
          </div>
          {hiddenIds.has(ctxMenu.record?.id) ? (
            <div
              style={{ padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
              onClick={() => {
                setHiddenIds(prev => { const n = new Set(prev); n.delete(ctxMenu.record.id); return n })
                setCtxMenu(m => ({ ...m, visible: false }))
                message.success('Đã hiện lại đơn hàng')
              }}
            >
              <EyeOutlined style={{ color: '#22c55e' }} /> Hiện đơn hàng
            </div>
          ) : (
            <div
              style={{ padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
              onClick={() => {
                setHiddenIds(prev => new Set([...prev, ctxMenu.record.id]))
                setCtxMenu(m => ({ ...m, visible: false }))
                message.success('Đã ẩn đơn hàng')
              }}
            >
              <EyeInvisibleOutlined style={{ color: '#64748b' }} /> Ẩn đơn hàng
            </div>
          )}
          <div
            style={{ padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1677ff' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
            onClick={() => {
              openDetail(ctxMenu.record)
              setCtxMenu(m => ({ ...m, visible: false }))
            }}
          >
            <EditOutlined style={{ color: '#1677ff' }} /> Xem chi tiết
          </div>
        </div>
      )}

      {/* ── Import Excel Modal ── */}
      <ImportExcelModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={() => { load(); window.dispatchEvent(new CustomEvent('app:donhang-updated')) }}
      />

      {/* ── Add Modal ── */}
      <DonHangModal
        open={modalOpen}
        editItem={editItem}
        onClose={() => setModalOpen(false)}
        onSaved={onSaved}
        existingMaDonHangs={data
          .map(r => r.maDonHang)
          .filter(Boolean)
          .filter(id => id !== editItem?.maDonHang)}
      />

      {/* ── Detail Modal (edit + Lệnh SX) ── */}
      <DonHangDetailModal
        open={detailOpen}
        record={detailRecord}
        onClose={() => setDetailOpen(false)}
        onSaved={onDetailSaved}
      />
    </>
  )
}
