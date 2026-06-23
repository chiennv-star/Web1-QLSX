import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Rnd } from 'react-rnd'
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
      open={open} onCancel={handleClose} destroyOnHidden transitionName=""
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
              File Excel cần có dòng tiêu đề ở hàng 1. <b>Chỉ bắt buộc cột Mã Bravo</b>, các cột còn lại là tuỳ chọn:<br />
              <span style={{ color: '#cf1322' }}>* </span><b>Mã Bravo</b> (bắt buộc) — tự động tra Mã SP và Tên SP từ danh mục<br />
              <b>Mã đơn hàng</b>, <b>Ngày nhận đơn</b> (dd/MM/yyyy), <b>Số lượng</b>,{' '}
              <b>Mã SP / Mã TP</b>, <b>Tên sản phẩm</b> (tuỳ chọn)<br />
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
      open={open} onCancel={handleClose} onOk={onOk} transitionName=""
      title={
        <Space>
          {editItem ? <EditOutlined style={{ color: '#1D4ED8' }} /> : <PlusOutlined style={{ color: '#1D4ED8' }} />}
          <span style={{ fontWeight: 700 }}>
            {editItem ? 'Chỉnh sửa đơn hàng' : 'Thêm đơn hàng mới'}
          </span>
        </Space>
      }
      okText={editItem ? 'Cập nhật' : 'Thêm'} cancelText="Huỷ"
      width={700} destroyOnHidden
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

// ── DonHang Detail Modal (edit + Kế Hoạch) ───────────────────────────────────
function DonHangDetailModal({ open, record, onClose, onSaved }) {
  const { isAdmin, isAdminKH } = useAuth()
  const canEdit = isAdmin() || isAdminKH()

  const defaultRnd = useMemo(() => {
    const w = Math.min(window.innerWidth * 0.92, 1400)
    const h = Math.min(window.innerHeight * 0.88, 800)
    return { x: Math.max(20, (window.innerWidth - w) / 2), y: 20, width: w, height: h }
  }, [])
  const [rndBounds, setRndBounds] = useState({ w: defaultRnd.width, h: defaultRnd.height, x: defaultRnd.x, y: defaultRnd.y })

  const [form]                        = Form.useForm()
  const [doiSlForm]                   = Form.useForm()
  const [saving, setSaving]           = useState(false)
  const [khoachList, setKhoachList]   = useState([])
  const [khoachLoading, setKhoachLoading] = useState(false)
  const [doiSlOpen, setDoiSlOpen]     = useState(false)
  const [doiSlLoading, setDoiSlLoading] = useState(false)
  const [lichSuSl, setLichSuSl]       = useState([])
  const [lichSuLoading, setLichSuLoading] = useState(false)
  const [autoFilling, setAutoFilling] = useState(false)

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
    loadKhoach()
    // Tự động tra và lưu Mã SP + Tên SP nếu đang trống
    const needMaSp  = !record.maSp      || record.maSp.trim() === ''
    const needTenSp = !record.tenSanPham || record.tenSanPham.trim() === ''
    if ((needMaSp || needTenSp) && record.maBravo) {
      autoFillFromBravo(record, needMaSp, needTenSp)
    }
  }, [open, record])

  const autoFillFromBravo = async (rec, needMaSp, needTenSp) => {
    setAutoFilling(true)
    try {
      const { data: pm } = await api.get(`/product-master/lookup-by-bravo/${encodeURIComponent(rec.maBravo)}`)
      if (!pm || (!pm.maTp && !pm.tienTrinh)) return
      const patch = {}
      if (needMaSp  && pm.maTp)       patch.maSp       = pm.maTp
      if (needTenSp && pm.tienTrinh)  patch.tenSanPham  = pm.tienTrinh
      if (Object.keys(patch).length === 0) return
      form.setFieldsValue(patch)
      // Lưu luôn vào DB
      await api.put(`/don-hang/${rec.id}`, {
        ...rec,
        ngayDatHang:  rec.ngayDatHang  || null,
        ngayPhatLenh: rec.ngayPhatLenh || null,
        ...patch,
      })
      onSaved({ ...rec, ...patch })
    } catch {}
    finally { setAutoFilling(false) }
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
    const slXep     = khoachSlXep
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

  if (!record) return null

  const fmtN  = v => v != null ? Number(v).toLocaleString('vi-VN') : '—'
  const numFmt = { formatter: v => v ? Number(v).toLocaleString('vi-VN') : '', parser: v => v ? v.replace(/[^\d]/g, '') : '' }

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
      width="100%" destroyOnHidden transitionName=""
      styles={{ body: { padding: 0 }, wrapper: { pointerEvents: 'none' } }}
      style={{ top: 0, padding: 0, margin: 0, maxWidth: 'none', pointerEvents: 'none' }}
      wrapClassName="dh-detail-modal"
      modalRender={modal => (
        <Rnd
          size={{ width: rndBounds.w, height: rndBounds.h }}
          position={{ x: rndBounds.x, y: rndBounds.y }}
          onDragStop={(_, d) => setRndBounds(b => ({ ...b, x: d.x, y: d.y }))}
          onResizeStop={(_, __, ref, ___, pos) => setRndBounds({ w: ref.offsetWidth, h: ref.offsetHeight, x: pos.x, y: pos.y })}
          minWidth={700} minHeight={300}
          bounds="window"
          dragHandleClassName="dh-modal-drag-handle"
          style={{ pointerEvents: 'all', zIndex: 1000 }}
          enableResizing={{ bottom: true, right: true, bottomRight: true, left: true, bottomLeft: true, top: false, topLeft: false, topRight: false }}
        >
          {modal}
        </Rnd>
      )}
    >
      <style>{`
        .dh-detail-modal { pointer-events: none !important; }
        .dh-detail-modal .ant-modal { width: 100% !important; height: 100% !important; margin: 0 !important; top: 0 !important; padding: 0 !important; max-width: none !important; pointer-events: all; }
        .dh-detail-modal .ant-modal-content { padding: 0 !important; border-radius: 10px !important; overflow: hidden; height: 100%; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.22); }
        .dh-detail-modal .ant-modal-body    { padding: 0 !important; flex: 1; overflow-y: auto; min-height: 0; }
        .dh-detail-modal .ant-form-item     { margin-bottom: 0 !important; }
        .dh-modal-drag-handle               { cursor: move; user-select: none; }
      `}</style>

      {/* Header */}
      <div className="dh-modal-drag-handle" style={{ background: '#1e4570', padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>📦</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            {record.tenSanPham || 'Chi tiết Đơn Hàng'}
            {autoFilling && <span style={{ fontSize: 11, fontWeight: 400, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 4 }}><SyncOutlined spin />Đang tự điền Mã SP...</span>}
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
                <InputNumber size="small" style={{ width: '100%', fontSize: 13 }} min={0} {...numFmt} />
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
              </div>
            </VCell>
            <LCell>Tình Trạng SX</LCell>
            <VCell last>
              <Form.Item noStyle shouldUpdate={(prev, cur) => prev.soLuongDatHang !== cur.soLuongDatHang}>
                {({ getFieldValue }) => {
                  const slDH  = Number(getFieldValue('soLuongDatHang')) || 0
                  const slXep = khoachSlXep
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

        {/* ── Bảng Kế Hoạch liên kết (Lệnh SX) ── */}
        {(() => {
          const TO_ORDER = { PCPL1: 1, PCPL2: 2, PL: 3, DG: 4, BBC1: 5, CC: 6, PC: 7 }
          const TO_COLOR = { PCPL1: '#374151', PCPL2: '#546e7a', PL: '#92400e', DG: '#0369a1', BBC1: '#7c3aed', CC: '#b45309', PC: '#166534' }
          const sorted = [...khoachList].sort((a, b) => {
            const ta = TO_ORDER[a.toNhom] ?? 99
            const tb = TO_ORDER[b.toNhom] ?? 99
            if (ta !== tb) return ta - tb
            return (a.ngayThucHien || '').localeCompare(b.ngayThucHien || '')
          })
          const totalCoLo = khoachList
            .filter(r => r.toNhom === 'PCPL1' || r.toNhom === 'PCPL2')
            .reduce((s, r) => s + (Number(r.coLo) || 0), 0)

          const khCols = [
            {
              title: 'Ngày SX', dataIndex: 'ngayThucHien', key: 'ngay', width: 90, align: 'center',
              render: v => v ? <span style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8' }}>{dayjs(v).format('DD/MM/YYYY')}</span> : <span style={{ color: '#d9d9d9' }}>—</span>
            },
            {
              title: 'Mã Bravo', dataIndex: 'maBravo', key: 'bravo', width: 100,
              render: v => v ? <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: '#1677ff' }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span>
            },
            {
              title: 'Mã SP', dataIndex: 'maSp', key: 'masp', width: 80,
              render: v => v ? <Tag style={{ fontWeight: 700, fontSize: 11, margin: 0 }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span>
            },
            {
              title: 'Tên Sản Phẩm', dataIndex: 'tenTrinh', key: 'ten', ellipsis: true,
              render: v => <span style={{ fontSize: 12 }}>{v || '—'}</span>
            },
            {
              title: 'Số Lô', dataIndex: 'soLo', key: 'solo', width: 90, align: 'center',
              render: v => v ? <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span>
            },
            {
              title: 'Cỡ Lô', dataIndex: 'coLo', key: 'colo', width: 90, align: 'right',
              render: v => <span style={{ fontWeight: 700, fontSize: 13, color: v > 0 ? '#1D4ED8' : '#d9d9d9' }}>{v > 0 ? Number(v).toLocaleString('vi-VN') : '—'}</span>
            },
            {
              title: 'Tổ TH', dataIndex: 'toNhom', key: 'to', width: 80, align: 'center',
              render: v => v ? <Tag style={{ fontWeight: 700, fontSize: 11, margin: 0, background: `${TO_COLOR[v] || '#374151'}15`, color: TO_COLOR[v] || '#374151', border: `1px solid ${TO_COLOR[v] || '#374151'}40` }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span>
            },
            {
              title: 'Ghi Chú', dataIndex: 'chuY', key: 'ghi', ellipsis: true,
              render: v => <span style={{ fontSize: 11, color: '#64748b' }}>{v || ''}</span>
            },
          ]

          return (
            <div style={{ margin: '0 16px 12px', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ background: '#1e4570', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>📋 Kế Hoạch liên kết</span>
                {totalCoLo > 0 && (
                  <Tag style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 11 }}>
                    Tổng Cỡ Lô: {Number(totalCoLo).toLocaleString('vi-VN')}
                  </Tag>
                )}
                <Button
                  size="small" icon={<SyncOutlined spin={khoachLoading} />}
                  loading={khoachLoading}
                  onClick={loadKhoach}
                  style={{ marginLeft: 'auto', borderColor: 'rgba(255,255,255,0.4)', color: '#fff', background: 'transparent', fontSize: 11 }}
                >
                  Làm mới
                </Button>
              </div>

              {khoachList.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  {khoachLoading ? <SyncOutlined spin /> : 'Chưa có bản ghi kế hoạch nào liên kết'}
                </div>
              ) : (
                <Table
                  columns={khCols}
                  dataSource={sorted}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  scroll={{ x: 700 }}
                  style={{ fontSize: 12 }}
                  rowClassName={(_, i) => i % 2 !== 0 ? 'kh-row-alt' : ''}
                />
              )}
              <style>{`
                .kh-row-alt > td { background: #f8faff !important; }
                .ant-table-small .ant-table-thead > tr > th { background: #f1f5f9 !important; font-size: 11px !important; font-weight: 700 !important; color: #475569 !important; padding: 5px 8px !important; }
              `}</style>
            </div>
          )
        })()}

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
        confirmLoading={doiSlLoading} destroyOnHidden transitionName=""
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

      {/* Resize corner hint */}
      <div style={{ position: 'absolute', bottom: 4, right: 4, color: '#cbd5e1', fontSize: 12, pointerEvents: 'none', lineHeight: 1 }}>⤡</div>

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
  const [syncingBravo, setSyncingBravo] = useState(false)
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
      const [dhRes, khRes] = await Promise.all([
        api.get('/don-hang', { params }),
        api.get('/work-schedule', { params: { source: 'PLAN', page: 0, size: 2000 } }),
      ])
      const allKhoach = (khRes.data?.content || []).filter(r => r.maBravo && r.maDonHang)

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

        return { ...dh, soLuongDaXepKh: slXep, soLuongConLai: slDat - slXep, tinhTrangSx: newSx, toThucHienList, hasKhoach }
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

  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [bulkDeleting,    setBulkDeleting]    = useState(false)

  const bulkDeleteRows = async () => {
    setBulkDeleting(true)
    try {
      await Promise.all(selectedRowKeys.map(id => api.delete(`/don-hang/${id}`)))
      setData(prev => prev.filter(r => !selectedRowKeys.includes(r.id)))
      message.success(`Đã xóa ${selectedRowKeys.length} đơn hàng`)
      setSelectedRowKeys([])
      window.dispatchEvent(new CustomEvent('app:donhang-updated'))
    } catch { message.error('Xóa thất bại') }
    finally { setBulkDeleting(false) }
  }

  const rowSelection = canEdit ? {
    selectedRowKeys,
    onChange: keys => setSelectedRowKeys(keys),
    getCheckboxProps: () => ({ onClick: e => e.stopPropagation() }),
  } : undefined

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

  const syncBravo = async () => {
    setSyncingBravo(true)
    try {
      const { data: res } = await api.post('/don-hang/sync-bravo')
      message.success(res.message || 'Đã điền Mã SP + Tên SP thành công')
      load()
    } catch { message.error('Sync thất bại') }
    finally { setSyncingBravo(false) }
  }

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
      title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 115, fixed: 'left', align: 'center',
      render: v => v
        ? <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff', fontSize: 12 }}>{v}</span>
        : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Mã SP', dataIndex: 'maSp', key: 'maSp', width: 85, align: 'center',
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
      title: 'Mã Đơn Hàng', dataIndex: 'maDonHang', key: 'maDonHang', width: 115, align: 'center',
      render: v => v
        ? <span style={{ fontFamily: 'monospace', color: 'rgb(0,0,205)', fontWeight: 600, fontSize: 12 }}>{v}</span>
        : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'SL Đặt Hàng', dataIndex: 'soLuongDatHang', key: 'slDat', width: 110, align: 'center',
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
      title: 'SL Còn Lại', dataIndex: 'soLuongConLai', key: 'slCon', width: 110, align: 'center',
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
        const colors = { PCPL1: 'rgb(0,0,139)', PCPL2: 'rgb(0,0,139)', PCPL3: 'rgb(0,0,139)', BBC1: 'rgb(0,0,139)', DG: 'rgb(0,0,139)', PC: 'rgb(0,0,139)', PL: 'rgb(0,0,139)' }
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
          background: #006666 !important; color: #ffffff !important;
          font-size: 11px !important; font-weight: 700 !important; text-transform: uppercase;
          padding: 7px 8px !important; white-space: nowrap; letter-spacing: 0.4px;
          border-right: 1px solid rgba(255,255,255,0.3) !important;
        }
        .dh-table .ant-table-thead > tr > th::before { display: none !important; }
        .dh-table .ant-table-tbody > tr > td { padding: 6px 8px !important; vertical-align: middle; background: #ECECEC !important; }
        .dh-table .ant-table-tbody > tr:nth-child(odd) > td { background: #ECECEC !important; }
        .dh-table .ant-table-tbody > tr:hover > td { background: #EAECF2 !important; }
        .dh-table .ant-table-column-sort { background: transparent !important; }
        .dh-row-rat-gap { background: #fff1f0 !important; }
        .dh-row-rat-gap:hover > td { background: #ffe4e4 !important; }
        .dh-row-gap { background: #fffbe6 !important; }
        .dh-row-gap:hover > td { background: #fff4cc !important; }
        .dh-row-done { background: #f0fdf4 !important; }
        .dh-row-done:hover > td { background: #dcfce7 !important; }
        .dh-row-hidden { opacity: 0.5; }
        .dh-table-done .ant-table-thead > tr > th { background: #006666 !important; border-right: 1px solid #005555 !important; }
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
          {canEdit && selectedRowKeys.length > 0 && (
            <Popconfirm
              title={`Xóa ${selectedRowKeys.length} đơn hàng đã chọn?`}
              description="Hành động này không thể hoàn tác."
              okText="Xóa" cancelText="Huỷ"
              okButtonProps={{ danger: true, loading: bulkDeleting }}
              onConfirm={bulkDeleteRows}
            >
              <Button size="small" danger icon={<DeleteOutlined />} loading={bulkDeleting}
                style={{ fontWeight: 600 }}>
                Xóa {selectedRowKeys.length} đã chọn
              </Button>
            </Popconfirm>
          )}
          {canEdit && (
            <>
              <Tooltip title="Tự động điền Mã SP và Tên Sản Phẩm cho các đơn hàng đang trống (tra từ danh mục Mã Bravo)">
                <Button size="small" icon={<SyncOutlined />}
                  loading={syncingBravo} onClick={syncBravo}
                  style={{ borderColor: '#0369a1', color: '#0369a1', fontWeight: 600 }}>
                  Sync Mã SP
                </Button>
              </Tooltip>
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
            onClick={() => { setActiveTab(tab.key); setSelectedRowKeys([]) }}
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
        rowSelection={rowSelection}
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
        rowSelection={rowSelection}
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
