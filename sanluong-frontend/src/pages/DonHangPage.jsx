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
import * as XLSX from 'xlsx'
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
              <span style={{ color: '#cf1322' }}>* </span><b>Mã Bravo</b> (bắt buộc) — phải tồn tại trong danh mục Mã TP, tự động tra Mã SP và Tên SP<br />
              <b>Mã đơn hàng</b>, <b>Ngày nhận đơn</b> (dd/MM/yyyy), <b>Số lượng</b>,{' '}
              <b>Mã SP / Mã TP</b>, <b>Tên sản phẩm</b> (tuỳ chọn)<br />
              Mã Bravo <b>chưa có trong danh mục</b> sẽ bị báo lỗi và bỏ qua. Các đơn hàng có <b>Mã Bravo + Mã Đơn Hàng + Số Lượng đã tồn tại</b> sẽ bị bỏ qua.
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
    // ── Kiểm tra Mã Bravo tồn tại trong Danh mục ───────────────────────────
    if (lookupStatus === 'not_found') {
      message.error(`Mã Bravo "${values.maBravo}" không tồn tại trong Danh mục Mã TP. Không thể thêm đơn hàng.`)
      return
    }
    if (lookupStatus === 'loading') {
      message.warning('Đang kiểm tra Mã Bravo, vui lòng đợi vài giây rồi thử lại.')
      return
    }
    // Khi tạo mới: nếu chưa lookup thành công → chặn (maBravo chưa xác nhận)
    if (!editItem && lookupStatus !== 'found') {
      message.error('Vui lòng nhập Mã Bravo hợp lệ và đợi hệ thống xác nhận trước khi thêm.')
      return
    }
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
  const [showHidden,        setShowHidden]        = useState(false)
  const [activeTab,         setActiveTab]         = useState('active') // 'active' | 'done' | 'trend' | 'analysis'
  const [productMasterMap,  setProductMasterMap]  = useState({})
  const [loadingMaster,     setLoadingMaster]     = useState(false)
  const [analysisFullscreen, setAnalysisFullscreen] = useState(false)
  const [employeeCounts,    setEmployeeCounts]    = useState({})
  const [collapsedLoaiSp,   setCollapsedLoaiSp]   = useState(new Set())

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

  // ── Load product master cho tab Xu hướng ─────────────────────────────────
  const loadProductMaster = useCallback(async ({ force = false } = {}) => {
    if (!force && Object.keys(productMasterMap).length > 0) return
    setLoadingMaster(true)
    try {
      const { data: pm } = await api.get('/product-master', { params: { page: 0, size: 9999 } })
      const map = {}
      ;(pm.content || []).forEach(p => { if (p.maBravo) map[p.maBravo] = p })
      setProductMasterMap(map)
    } catch { /* non-blocking */ }
    finally { setLoadingMaster(false) }
  }, [productMasterMap])

  const loadEmployeeCounts = useCallback(async () => {
    if (Object.keys(employeeCounts).length > 0) return
    try {
      const groups = ['PCPL1', 'PCPL2', 'PCPL3', 'BBC1', 'ĐG']
      const results = await Promise.all(
        groups.map(g => api.get('/employees', { params: { page: 0, size: 1, toNhom: g, excludeTinhTrang: 'tam_nghi' } }))
      )
      const counts = {}
      groups.forEach((g, i) => { counts[g] = results[i].data.totalElements || 0 })
      setEmployeeCounts(counts)
    } catch { /* non-blocking */ }
  }, [employeeCounts])

  useEffect(() => {
    if (activeTab === 'trend' || activeTab === 'analysis' || activeTab === 'pc-pl') {
      loadProductMaster({ force: true })
      loadEmployeeCounts()
    }
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const exportExcel = (rows, sheetName, filename) => {
    const wsData = [
      ['#', 'Mã Bravo', 'Mã SP', 'Tên Sản Phẩm', 'Ngày Đặt Hàng', 'Mã Đơn Hàng',
       'SL Đặt Hàng', 'Tình Trạng ĐH', 'SL Đã Xếp KH', 'SL Còn Lại',
       'Tình Trạng SX', 'Tổ Thực Hiện', 'Đã Lên Lịch', 'Đã ĐG & Lịch ĐG', 'Ghi Chú'],
      ...rows.map((r, i) => [
        i + 1,
        r.maBravo       || '',
        r.maSp          || '',
        r.tenSanPham    || '',
        r.ngayDatHang   ? dayjs(r.ngayDatHang).format('DD/MM/YYYY') : '',
        r.maDonHang     || '',
        Number(r.soLuongDatHang) || 0,
        r.tinhTrangDatHang === 'rat_gap' ? 'Rất Gấp' : r.tinhTrangDatHang === 'gap' ? 'Gấp' : '',
        Number(r.soLuongDaXepKh) || 0,
        Number(r.soLuongConLai)  || 0,
        r.tinhTrangSx === 'done' ? 'Hoàn thành' : r.tinhTrangSx === 'doing' ? 'Đang SX' : 'Chưa bắt đầu',
        (r.toThucHienList || []).join(', '),
        r.daLenLichLam     ? 'Có' : '',
        r.daDgVaXepLichDg  ? 'Có' : '',
        r.ghiChu || '',
      ]),
    ]
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [5, 14, 10, 36, 13, 15, 13, 12, 13, 12, 14, 18, 12, 14, 30].map(w => ({ wch: w }))
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, filename)
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
        <Button.Group size="small">
          {[['T', 'week'], ['M', 'month'], ['N', 'year']].map(([label, unit]) => (
            <Button key={unit}
              type={dateRange[0] && dateRange[1] && dateRange[0].isSame(dayjs().startOf(unit), 'day') && dateRange[1].isSame(dayjs().endOf(unit), 'day') ? 'primary' : 'default'}
              onClick={() => setDateRange([dayjs().startOf(unit), dayjs().endOf(unit)])}>
              {label}
            </Button>
          ))}
        </Button.Group>

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
          <Dropdown
            menu={{
              items: [
                {
                  key: 'export-active',
                  icon: <FileExcelOutlined style={{ color: '#217346' }} />,
                  label: <span style={{ fontWeight: 600 }}>Đơn Hàng ({displayData.length} dòng)</span>,
                  onClick: () => exportExcel(
                    displayData,
                    'Đơn Hàng',
                    `DonHang_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`
                  ),
                },
                {
                  key: 'export-done',
                  icon: <FileExcelOutlined style={{ color: '#16a34a' }} />,
                  label: <span style={{ fontWeight: 600 }}>Đã Hoàn Thành ({completedData.length} dòng)</span>,
                  onClick: () => exportExcel(
                    completedData,
                    'Đã Hoàn Thành',
                    `DonHang_HoanThanh_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`
                  ),
                },
              ],
            }}
          >
            <Button size="small" icon={<FileExcelOutlined />}
              style={{ borderColor: '#217346', color: '#217346', fontWeight: 600 }}>
              Xuất Excel ▾
            </Button>
          </Dropdown>
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
          { key: 'active',   label: '📋 Đơn Hàng',      count: displayData.length + (showHidden ? 0 : hiddenIds.size) },
          { key: 'done',     label: '🏆 Đã Hoàn Thành', count: completedData.length },
          ...(isAdmin() ? [
            { key: 'trend',    label: '📊 Xu Hướng',     count: displayData.length },
            { key: 'analysis', label: '🔬 Phân Tích',    count: displayData.length },
            { key: 'pc-pl',    label: '⚙ Chi Tiết PC/PL', count: displayData.length },
          ] : []),
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
        {(activeTab === 'trend' || activeTab === 'analysis' || activeTab === 'pc-pl') && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', paddingRight: 12 }}>
            <Tooltip title="Tải lại dữ liệu Năng Suất & Loại SP từ Danh Mục TP">
              <Button
                size="small" icon={<ReloadOutlined />}
                loading={loadingMaster}
                onClick={() => loadProductMaster({ force: true })}
                style={{ fontSize: 12, color: '#1677ff', borderColor: '#1677ff' }}
              >
                Cập nhật NS
              </Button>
            </Tooltip>
          </div>
        )}
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
      ) : activeTab === 'trend' ? (
      /* ── Tab: Xu Hướng ── */
      (() => {
        const trendData = displayData.map(r => ({ ...r, _pm: productMasterMap[r.maBravo] || {} }))
        const fmtNS = v => v != null ? Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) : '—'
        const trendColumns = [
          {
            title: '#', key: 'stt', width: 44, fixed: 'left', align: 'center',
            render: (_, __, i) => <span style={{ fontSize: 11, color: '#94a3b8' }}>{i + 1}</span>,
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
            title: 'Tên Sản Phẩm', dataIndex: 'tenSanPham', key: 'tenSanPham', width: 210, fixed: 'left',
            ellipsis: true,
            render: v => <span style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{v || <span style={{ color: '#d9d9d9' }}>—</span>}</span>,
          },
          {
            title: 'Loại SP', key: 'loaiSp', width: 110,
            render: (_, r) => r._pm.loaiSanPham
              ? <span style={{ fontSize: 12, color: '#374151' }}>{r._pm.loaiSanPham}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
          {
            title: 'Mã Đơn Hàng', dataIndex: 'maDonHang', key: 'maDonHang', width: 115, align: 'center',
            render: v => v
              ? <span style={{ fontFamily: 'monospace', color: 'rgb(0,0,205)', fontWeight: 600, fontSize: 12 }}>{v}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
          {
            title: 'SL Đặt', dataIndex: 'soLuongDatHang', key: 'slDat', width: 95, align: 'right',
            sorter: (a, b) => (Number(a.soLuongDatHang) || 0) - (Number(b.soLuongDatHang) || 0),
            render: v => <span style={{ fontWeight: 700, color: '#374151' }}>{fmtNum(v)}</span>,
          },
          {
            title: 'SL Còn Lại', dataIndex: 'soLuongConLai', key: 'slCon', width: 100, align: 'right',
            sorter: (a, b) => (Number(a.soLuongConLai) || 0) - (Number(b.soLuongConLai) || 0),
            render: v => {
              const n = Number(v) || 0
              return <span style={{ fontWeight: 700, color: n > 0 ? '#cf1322' : '#389e0d' }}>{fmtNum(v)}</span>
            },
          },
          {
            title: 'Tình Trạng', key: 'ttSx', width: 115, align: 'center',
            render: (_, r) => {
              const cfg = TINH_TRANG_SX[r.tinhTrangSx]
              if (!cfg) return <span style={{ color: '#94a3b8', fontSize: 11 }}>Chưa bắt đầu</span>
              return <Badge status={r.tinhTrangSx === 'done' ? 'success' : 'processing'} text={<span style={{ fontWeight: 600, color: cfg.color, fontSize: 11 }}>{cfg.label}</span>} />
            },
          },
          {
            title: 'KL/ĐV (g)', key: 'khoiLuong', width: 95, align: 'right',
            render: (_, r) => <span style={{ color: '#0369a1', fontWeight: 600 }}>{fmtNum(r._pm.khoiLuong)}</span>,
          },
          {
            title: 'NS TB (ĐG)', key: 'nsTb', width: 100, align: 'right',
            render: (_, r) => r._pm.slTrungBinh
              ? <span style={{ color: '#7c3aed', fontWeight: 700 }}>{fmtNS(r._pm.slTrungBinh)}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
          {
            title: 'NS PC (Pha Chế)', key: 'nsPc', width: 120, align: 'right',
            render: (_, r) => r._pm.nangSuatPc
              ? <span style={{ color: '#1d4ed8', fontWeight: 600 }}>{fmtNS(r._pm.nangSuatPc)}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
          {
            title: 'NS PL (Phân Liều)', key: 'nsPl', width: 130, align: 'right',
            render: (_, r) => r._pm.nangSuatPl
              ? <span style={{ color: '#0e7490', fontWeight: 600 }}>{fmtNS(r._pm.nangSuatPl)}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
          {
            title: 'NS BBC1 (VS BBC1)', key: 'nsBbc1', width: 130, align: 'right',
            render: (_, r) => r._pm.nangSuatBbc1
              ? <span style={{ color: '#6d28d9', fontWeight: 600 }}>{fmtNS(r._pm.nangSuatBbc1)}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
          {
            title: 'Máy Móc PC', key: 'mmPc', width: 170,
            render: (_, r) => r._pm.mayMocPc
              ? <span style={{ fontSize: 12, color: '#374151' }}>{r._pm.mayMocPc}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
          {
            title: 'Máy Móc PL', key: 'mmPl', width: 170,
            render: (_, r) => r._pm.mayMocPl
              ? <span style={{ fontSize: 12, color: '#374151' }}>{r._pm.mayMocPl}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
          {
            title: 'Máy Móc BBC1', key: 'mmBbc1', width: 170,
            render: (_, r) => r._pm.mayMocBbc1
              ? <span style={{ fontSize: 12, color: '#374151' }}>{r._pm.mayMocBbc1}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
          {
            title: 'Máy Móc ĐG', key: 'mmDg', width: 170,
            render: (_, r) => r._pm.mayMocDg
              ? <span style={{ fontSize: 12, color: '#374151' }}>{r._pm.mayMocDg}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
        ]
        return (
          <Table
            className="dh-table"
            columns={trendColumns}
            dataSource={trendData}
            rowKey="id"
            loading={loading || loadingMaster}
            size="small"
            scroll={{ x: 2310 }}
            sticky={{ offsetHeader: headerOffset }}
            rowHoverable={false}
            rowClassName={rowClassName}
            onRow={r => ({ onClick: () => openDetail(r), style: { cursor: 'pointer' } })}
            pagination={{
              defaultPageSize: 50,
              pageSizeOptions: ['20', '50', '100'],
              showSizeChanger: true,
              showTotal: t => `${t} đơn hàng`,
            }}
            locale={{ emptyText: <span style={{ color: '#d9d9d9' }}>Không có dữ liệu</span> }}
          />
        )
      })()
      ) : activeTab === 'analysis' ? (
      /* ── Tab: Phân Tích Năng Suất & Tải Máy ── */
      (() => {
        const trendData = displayData.map(r => ({ ...r, _pm: productMasterMap[r.maBravo] || {} }))

        // ── Thống kê theo loại SP ─────────────────────────────────────────
        // normalizeLoai: capitalize chữ đầu mỗi từ (không dùng \b vì không hỗ trợ tiếng Việt)
        const normalizeLoai = raw => {
          if (!raw) return null
          return raw.trim().replace(/\s+/g, ' ')
            .split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : '').join(' ')
        }
        // loaiKey dùng để group (lowercase), loaiDisplay để hiển thị (title-case)
        const loaiKey = raw => (raw || '').trim().toLowerCase().replace(/\s+/g, ' ') || '(chưa phân loại)'
        const typeMap = {}
        let totalSlDat = 0
        trendData.forEach(r => {
          const key  = loaiKey(r._pm.loaiSanPham)
          const loai = normalizeLoai(r._pm.loaiSanPham) || '(Chưa phân loại)'
          const slDat = Number(r.soLuongDatHang) || 0
          const slCon = Number(r.soLuongConLai)  || 0
          totalSlDat += slDat
          if (!typeMap[key]) typeMap[key] = { loai, donHang: 0, skuSet: new Set(), slDat: 0, slCon: 0, congDg: 0, congPc: 0, congPl: 0 }
          const s = typeMap[key]
          s.donHang++
          s.skuSet.add(r.maBravo)
          s.slDat += slDat
          s.slCon += slCon
          if (r._pm.slTrungBinh && Number(r._pm.slTrungBinh) > 0) s.congDg += slDat / Number(r._pm.slTrungBinh)
          if (r._pm.nangSuatPc  && Number(r._pm.nangSuatPc)  > 0) s.congPc += slDat / Number(r._pm.nangSuatPc)
          if (r._pm.nangSuatPl  && Number(r._pm.nangSuatPl)  > 0) s.congPl += slDat / Number(r._pm.nangSuatPl)
        })
        const typeRows = Object.values(typeMap)
          .map(s => ({ ...s, sku: s.skuSet.size, tyLe: totalSlDat > 0 ? s.slDat / totalSlDat * 100 : 0 }))
          .sort((a, b) => b.slDat - a.slDat)
        const TYPE_COLORS = ['#1677ff','#52c41a','#fa8c16','#722ed1','#eb2f96','#13c2c2','#faad14','#f5222d','#a0d911','#2f54eb']
        const colorOf = loai => TYPE_COLORS[typeRows.findIndex(r => r.loai === loai) % TYPE_COLORS.length]
        const fmtCong = v => v > 0 ? Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : '—'
        const typeColumns = [
          {
            title: 'Loại Sản Phẩm', dataIndex: 'loai', key: 'loai', width: 160,
            render: (v) => <Tag color={colorOf(v)} style={{ fontWeight: 600, fontSize: 12 }}>{v}</Tag>,
          },
          {
            title: 'Số Đơn', dataIndex: 'donHang', key: 'donHang', width: 80, align: 'center',
            render: v => <span style={{ fontWeight: 700, color: '#374151' }}>{v}</span>,
          },
          {
            title: 'Số SKU', dataIndex: 'sku', key: 'sku', width: 75, align: 'center',
            render: v => <span style={{ color: '#0369a1', fontWeight: 600 }}>{v}</span>,
          },
          {
            title: 'SL Đặt', dataIndex: 'slDat', key: 'slDat', width: 110, align: 'right',
            sorter: (a, b) => a.slDat - b.slDat,
            render: v => <span style={{ fontWeight: 700 }}>{Number(v).toLocaleString('vi-VN')}</span>,
          },
          {
            title: 'SL Còn Lại', dataIndex: 'slCon', key: 'slCon', width: 110, align: 'right',
            render: v => <span style={{ fontWeight: 700, color: v > 0 ? '#cf1322' : '#389e0d' }}>{Number(v).toLocaleString('vi-VN')}</span>,
          },
          {
            title: 'Tỷ Lệ SL', dataIndex: 'tyLe', key: 'tyLe', width: 170, align: 'center',
            sorter: (a, b) => a.tyLe - b.tyLe,
            render: (v, r) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Progress percent={Math.round(v)} size="small" strokeColor={colorOf(r.loai)}
                  style={{ flex: 1, marginBottom: 0 }} showInfo={false} />
                <span style={{ fontWeight: 700, color: colorOf(r.loai), minWidth: 40 }}>{v.toFixed(1)}%</span>
              </div>
            ),
          },
          {
            title: 'Công ĐG', dataIndex: 'congDg', key: 'congDg', width: 100, align: 'right',
            sorter: (a, b) => a.congDg - b.congDg,
            render: v => v > 0
              ? <span style={{ color: '#7c3aed', fontWeight: 700 }}>{fmtCong(v)}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
          {
            title: 'Công PC', dataIndex: 'congPc', key: 'congPc', width: 100, align: 'right',
            sorter: (a, b) => a.congPc - b.congPc,
            render: v => v > 0
              ? <span style={{ color: '#1d4ed8', fontWeight: 600 }}>{fmtCong(v)}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
          {
            title: 'Công PL', dataIndex: 'congPl', key: 'congPl', width: 100, align: 'right',
            sorter: (a, b) => a.congPl - b.congPl,
            render: v => v > 0
              ? <span style={{ color: '#0e7490', fontWeight: 600 }}>{fmtCong(v)}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
        ]
        const typeSummary = () => {
          const totSlDat = typeRows.reduce((s, r) => s + r.slDat, 0)
          const totSlCon = typeRows.reduce((s, r) => s + r.slCon, 0)
          const totDon   = typeRows.reduce((s, r) => s + r.donHang, 0)
          const totDg    = typeRows.reduce((s, r) => s + r.congDg, 0)
          const totPc    = typeRows.reduce((s, r) => s + r.congPc, 0)
          const totPl    = typeRows.reduce((s, r) => s + r.congPl, 0)
          const tdStyle  = { fontWeight: 700, background: '#f0f5ff', padding: '6px 8px' }
          return (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}><span style={{ ...tdStyle, display:'block' }}>Tổng cộng ({totDon} đơn)</span></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="center"><span style={tdStyle}>{typeRows.reduce((s, r) => s + r.sku, 0)}</span></Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right"><span style={tdStyle}>{totSlDat.toLocaleString('vi-VN')}</span></Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right"><span style={{ ...tdStyle, color: '#cf1322' }}>{totSlCon.toLocaleString('vi-VN')}</span></Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="center"><span style={tdStyle}>100%</span></Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right"><span style={{ ...tdStyle, color: '#7c3aed' }}>{fmtCong(totDg)}</span></Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right"><span style={{ ...tdStyle, color: '#1d4ed8' }}>{fmtCong(totPc)}</span></Table.Summary.Cell>
              <Table.Summary.Cell index={7} align="right"><span style={{ ...tdStyle, color: '#0e7490' }}>{fmtCong(totPl)}</span></Table.Summary.Cell>
            </Table.Summary.Row>
          )
        }

        const fmtH  = v  => (v != null && v > 0) ? Number(v).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'
        const fmtN  = v  => v != null ? Number(v).toLocaleString('vi-VN') : '—'

        /* Tính thời gian SX mỗi đơn — 4 công đoạn */
        const BN_CFG = {
          PC:   { label: 'Pha Chế',   bg: '#dbeafe', color: '#1e40af' },
          PL:   { label: 'Phân Liều', bg: '#fef3c7', color: '#92400e' },
          BBC1: { label: 'VS BBC1',   bg: '#fee2e2', color: '#991b1b' },
          DG:   { label: 'Đóng Gói', bg: '#f5f3ff', color: '#6d28d9' },
        }
        // Số nhân sự mỗi tổ (đã loại tạm nghỉ), map sang 4 công đoạn
        const stageWorkers = {
          PC:   (employeeCounts['PCPL1'] || 0) + (employeeCounts['PCPL2'] || 0),
          PL:   employeeCounts['PCPL3'] || 0,
          BBC1: employeeCounts['BBC1']  || 0,
          DG:   employeeCounts['ĐG']   || 0,
        }
        const fmtDays = v => (v != null && v > 0) ? Number(v).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'
        const orderAnalysis = trendData.map(r => {
          const sl   = Number(r.soLuongConLai)   || 0
          const nsPc  = Number(r._pm.nangSuatPc)  || 0
          const nsPl  = Number(r._pm.nangSuatPl)  || 0
          const nsBbc = Number(r._pm.nangSuatBbc1) || 0
          const nsDg  = Number(r._pm.slTrungBinh)  || 0  // slTrungBinh = NS TB = NS Đóng Gói
          const tPc  = nsPc  > 0 ? sl / nsPc  : null
          const tPl  = nsPl  > 0 ? sl / nsPl  : null
          const tBbc = nsBbc > 0 ? sl / nsBbc : null
          const tDg  = nsDg  > 0 ? sl / nsDg  : null
          const times = [
            tPc  != null ? { key: 'PC',   t: tPc  } : null,
            tPl  != null ? { key: 'PL',   t: tPl  } : null,
            tBbc != null ? { key: 'BBC1', t: tBbc } : null,
            tDg  != null ? { key: 'DG',   t: tDg  } : null,
          ].filter(Boolean)
          const bottleneck = times.length > 0 ? times.reduce((a, b) => b.t > a.t ? b : a) : null
          const total = times.reduce((s, x) => s + x.t, 0)
          return { ...r, tPc, tPl, tBbc, tDg, total, bottleneck }
        }).sort((a, b) => b.total - a.total)

        const ordersWithData    = orderAnalysis.filter(r => r.bottleneck)
        const ordersWithoutData = trendData.filter(r => !orderAnalysis.find(x => x.id === r.id)?.bottleneck)

        /* Bảng tổng hợp giờ từng công đoạn */
        const stageSummary = [
          { key: 'PC',   label: 'Pha Chế',   tField: 'tPc',  color: '#1e40af', bg: '#dbeafe' },
          { key: 'PL',   label: 'Phân Liều', tField: 'tPl',  color: '#92400e', bg: '#fef3c7' },
          { key: 'BBC1', label: 'VS BBC1',   tField: 'tBbc', color: '#991b1b', bg: '#fee2e2' },
          { key: 'DG',   label: 'Đóng Gói', tField: 'tDg',  color: '#6d28d9', bg: '#f5f3ff' },
        ].map(s => {
          const vals = ordersWithData.filter(r => r[s.tField] != null)
          const totalH = vals.reduce((sum, r) => sum + r[s.tField], 0)
          const bnCount = ordersWithData.filter(r => r.bottleneck?.key === s.key).length
          const soNguoi = stageWorkers[s.key] || 0
          return { ...s, totalH, orderCount: vals.length, bnCount, soNguoi }
        })
        const maxStageH = Math.max(...stageSummary.map(s => s.totalH)) || 1
        const bottleneckStage = stageSummary.reduce((a, b) => b.totalH > a.totalH ? b : a)

        /* Tải máy — 4 công đoạn */
        const STAGE_MACHINE_MAP = [
          { stageKey: 'PC',   machineField: 'mayMocPc',   nsField: 'nangSuatPc'  },
          { stageKey: 'PL',   machineField: 'mayMocPl',   nsField: 'nangSuatPl'  },
          { stageKey: 'BBC1', machineField: 'mayMocBbc1', nsField: 'nangSuatBbc1' },
          { stageKey: 'DG',   machineField: 'mayMocDg',   nsField: 'slTrungBinh' },
        ]
        const machineLoad = {}
        trendData.forEach(r => {
          const sl = Number(r.soLuongConLai) || 0
          STAGE_MACHINE_MAP.forEach(({ stageKey, machineField, nsField }) => {
            const machine = r._pm[machineField]
            const ns = Number(r._pm[nsField]) || 0
            if (!machine || ns === 0) return
            const key = `${stageKey}__${machine}`
            if (!machineLoad[key]) machineLoad[key] = { machine, stageKey, hours: 0, orders: 0 }
            machineLoad[key].hours  += sl / ns
            machineLoad[key].orders += 1
          })
        })
        const machineList = Object.values(machineLoad).sort((a, b) => b.hours - a.hours)
        const maxHours    = machineList[0]?.hours || 1
        const bbc1M = machineList.filter(m => m.stageKey === 'BBC1')
        const pcM   = machineList.filter(m => m.stageKey === 'PC')
        const plM   = machineList.filter(m => m.stageKey === 'PL')
        const dgM   = machineList.filter(m => m.stageKey === 'DG')

        /* Xung đột máy */
        const machineToBravo = {}
        trendData.forEach(r => {
          const sl = Number(r.soLuongConLai) || 0
          STAGE_MACHINE_MAP.forEach(({ stageKey, machineField, nsField }) => {
            const machine = r._pm[machineField]
            const ns = Number(r._pm[nsField]) || 0
            if (!machine || ns === 0) return
            const key = `${stageKey}__${machine}`
            if (!machineToBravo[key]) machineToBravo[key] = []
            machineToBravo[key].push({ bravo: r.maBravo, ten: r.tenSanPham || r.maBravo, t: sl / ns })
          })
        })
        const conflicts = Object.entries(machineToBravo)
          .filter(([, orders]) => orders.length > 1)
          .map(([key, orders]) => {
            const [stageKey, machine] = key.split('__')
            const totalH = orders.reduce((s, o) => s + o.t, 0)
            return { machine, stageKey, orders: orders.sort((a, b) => b.t - a.t), totalH }
          })
          .sort((a, b) => b.totalH - a.totalH)

        /* Cơ hội song song: đơn nút thắt VS BBC1 dùng máy khác nhau */
        const bbc1Groups = {}
        ordersWithData.forEach(r => {
          if (r.bottleneck?.key !== 'BBC1' || !r._pm.mayMocBbc1) return
          if (!bbc1Groups[r._pm.mayMocBbc1]) bbc1Groups[r._pm.mayMocBbc1] = []
          bbc1Groups[r._pm.mayMocBbc1].push(r)
        })
        const parallelMachines = Object.keys(bbc1Groups)

        /* Đề xuất thứ tự */
        const RANK_COLOR = ['#0f766e', '#f59e0b', '#3b82f6']

        const SecTitle = ({ n, title, sub }) => (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, borderBottom: '2px solid #e5e7eb', paddingBottom: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{n}. {title}</span>
            </div>
            {sub && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{sub}</div>}
          </div>
        )
        const Callout = ({ color = 'green', children }) => {
          const map = { green: ['#ecfdf5','#10b981'], amber: ['#fffbeb','#f59e0b'], blue: ['#eff6ff','#3b82f6'], red: ['#fef2f2','#dc2626'] }
          const [bg, border] = map[color] || map.green
          return <div style={{ background: bg, borderLeft: `4px solid ${border}`, padding: '12px 16px', borderRadius: '0 6px 6px 0', marginBottom: 14, fontSize: 13 }}>{children}</div>
        }
        const BarRow = ({ label, hours, maxH, color, orders }) => {
          const pct = maxH > 0 ? Math.max(4, Math.round((hours / maxH) * 100)) : 4
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 210, fontSize: 12, color: '#374151', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={label}>{label}</div>
              <div style={{ flex: 1, background: '#f1f3f5', borderRadius: 4, height: 24, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                  <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtH(hours)} h{orders > 1 ? ` — ${orders} đơn` : ''}</span>
                </div>
              </div>
            </div>
          )
        }

        const innerContent = (
          <div style={{ padding: analysisFullscreen ? '24px 32px' : '20px 16px', maxWidth: analysisFullscreen ? '100%' : 1100, minHeight: analysisFullscreen ? '100vh' : undefined, background: '#fff' }}>

            {/* Thanh tiêu đề + nút fullscreen */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f766e' }}>🔬 Phân Tích Năng Suất &amp; Tải Máy</div>
              <button
                onClick={() => setAnalysisFullscreen(f => !f)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: analysisFullscreen ? '#fef2f2' : '#f0fdf4',
                  color: analysisFullscreen ? '#dc2626' : '#0f766e',
                  border: `1px solid ${analysisFullscreen ? '#fca5a5' : '#86efac'}`,
                  borderRadius: 6, padding: '5px 14px', cursor: 'pointer',
                  fontWeight: 600, fontSize: 13,
                }}
              >
                {analysisFullscreen ? '✕ Đóng' : '⛶ Mở toàn màn hình'}
              </button>
            </div>

            {/* ── Bảng thống kê loại SP ── */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📊</span>
                <span>Thống Kê Xu Hướng Theo Loại Sản Phẩm</span>
                <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b' }}>— Công = SL Đặt ÷ Năng Suất (người/ngày)</span>
              </div>
              <Table
                columns={typeColumns}
                dataSource={typeRows}
                rowKey="loai"
                size="small"
                pagination={false}
                loading={loading || loadingMaster}
                scroll={{ x: 1010 }}
                rowHoverable={false}
                summary={typeSummary}
                locale={{ emptyText: <span style={{ color: '#d9d9d9' }}>Không có dữ liệu</span> }}
              />
            </div>

            {/* Intro callout */}
            <Callout color="green">
              <b>Nguyên tắc nút thắt (bottleneck):</b> Thời gian mỗi công đoạn = <b>SL Còn Lại ÷ Năng Suất (NS)</b>. Công đoạn nào lâu nhất chính là <b>nút thắt</b> — nó quyết định tiến độ hoàn thành cả đơn.
            </Callout>

            {/* ── Section 1: Thời gian SX ── */}
            <div style={{ marginBottom: 36 }}>
              <SecTitle n="1" title="Thời gian sản xuất theo công đoạn (công)" sub="t = SL Còn Lại ÷ NS (sp/công). Ngày HT = Tổng công ÷ Số người tổ. Nút thắt là công đoạn lâu nhất của từng đơn." />

              {/* ── Bảng tổng hợp giờ từng công đoạn ── */}
              {ordersWithData.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Tổng giờ toàn bộ đơn hàng theo từng công đoạn</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#f8fafc', borderRadius: 8, overflow: 'hidden' }}>
                    <thead>
                      <tr style={{ background: '#e2e8f0' }}>
                        {['Công đoạn','Tổng công','Số người','Ngày HT','Đơn là nút thắt','Tải (% so cao nhất)'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Công đoạn' ? 'left' : 'right', fontWeight: 600, color: '#374151', borderBottom: '2px solid #cbd5e1', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stageSummary.map((s, i) => {
                        const pct = maxStageH > 0 ? Math.round((s.totalH / maxStageH) * 100) : 0
                        const isBN = s.key === bottleneckStage.key
                        return (
                          <tr key={s.key} style={{ background: isBN ? s.bg : (i % 2 === 0 ? '#fff' : '#f8fafc'), borderLeft: isBN ? `3px solid ${s.color}` : '3px solid transparent' }}>
                            <td style={{ padding: '9px 12px', fontWeight: 700, color: s.color, display: 'flex', alignItems: 'center', gap: 6 }}>
                              {s.label}
                              {isBN && <span style={{ fontSize: 10, background: s.color, color: '#fff', borderRadius: 4, padding: '1px 6px' }}>NÚT THẮT</span>}
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: s.color }}>{fmtH(s.totalH)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#374151', fontWeight: 600 }}>
                              {s.soNguoi > 0 ? s.soNguoi : <span style={{ color: '#d1d5db', fontSize: 11 }}>—</span>}
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: s.soNguoi > 0 ? (isBN ? s.color : '#059669') : '#d1d5db' }}>
                              {s.soNguoi > 0 ? <>{fmtDays(s.totalH / s.soNguoi)} <span style={{ fontWeight: 400, fontSize: 11 }}>ngày</span></> : '—'}
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#374151' }}>{s.bnCount}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                                <div style={{ width: 80, background: '#e2e8f0', borderRadius: 3, height: 8, overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: s.color, borderRadius: 3 }} />
                                </div>
                                <span style={{ minWidth: 32, color: '#374151', fontWeight: 600 }}>{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      <tr style={{ background: '#f1f5f9', borderTop: '2px solid #cbd5e1' }}>
                        <td style={{ padding: '9px 12px', fontWeight: 700, color: '#111827' }}>Tổng cộng</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>{fmtH(stageSummary.reduce((s, x) => s + x.totalH, 0))}</td>
                        <td colSpan={4} style={{ padding: '9px 12px', textAlign: 'right', color: '#6b7280', fontSize: 12 }}>{ordersWithData.length} đơn có dữ liệu NS</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              {loadingMaster ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Đang tải dữ liệu năng suất...</div> : (() => {
                // Group ordersWithData by loại SP — key: lowercase, display: title-case mỗi từ
                const normDisplay = raw => raw
                  ? raw.trim().replace(/\s+/g, ' ').split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : '').join(' ')
                  : null
                const normKey = raw => (raw || '').trim().toLowerCase().replace(/\s+/g, ' ')
                const loaiGroups = {}   // key → { display, orders[] }
                ordersWithData.forEach(r => {
                  const key     = normKey(r._pm?.loaiSanPham)  || '(chưa phân loại)'
                  const display = normDisplay(r._pm?.loaiSanPham) || '(Chưa phân loại)'
                  if (!loaiGroups[key]) loaiGroups[key] = { display, orders: [] }
                  loaiGroups[key].orders.push(r)
                })
                const groupList = Object.entries(loaiGroups)
                  .map(([, { display, orders }]) => ({ loai: display, orders, totalH: orders.reduce((s, x) => s + x.total, 0) }))
                  .sort((a, b) => b.totalH - a.totalH)

                const thStyle = { padding: '8px 8px', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap', background: '#f3f4f6' }
                const TABLE_COLS = ['Mã Bravo','Sản phẩm','SL Còn Lại','t. Pha Chế (h)','t. Phân Liều (h)','t. VS BBC1 (h)','t. Đóng Gói (h)','Tổng (h)','Nút thắt','Ngày HT']
                const toggleGroup = (loai) => setCollapsedLoaiSp(prev => {
                  const next = new Set(prev)
                  next.has(loai) ? next.delete(loai) : next.add(loai)
                  return next
                })
                const allCollapsed = groupList.every(g => collapsedLoaiSp.has(g.loai))

                return (
                  <div>
                    {/* Title row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Chi tiết đơn hàng</div>
                      <button
                        onClick={() => setCollapsedLoaiSp(allCollapsed ? new Set() : new Set(groupList.map(g => g.loai)))}
                        style={{ fontSize: 12, color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: 4, padding: '2px 10px', cursor: 'pointer' }}
                      >
                        {allCollapsed ? 'Mở tất cả' : 'Thu gọn tất cả'}
                      </button>
                    </div>

                    {groupList.map(group => {
                      const isCollapsed = collapsedLoaiSp.has(group.loai)
                      const groupBn = group.orders.filter(r => r.bottleneck).length
                      return (
                        <div key={group.loai} style={{ marginBottom: 10, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                          {/* Group header */}
                          <div
                            onClick={() => toggleGroup(group.loai)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: '#f8fafc', cursor: 'pointer', userSelect: 'none', borderBottom: isCollapsed ? 'none' : '1px solid #e5e7eb' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{group.loai}</span>
                              <span style={{ fontSize: 11, color: '#6b7280', background: '#e5e7eb', borderRadius: 10, padding: '1px 8px' }}>{group.orders.length} đơn</span>
                              {groupBn > 0 && <span style={{ fontSize: 11, color: '#dc2626', background: '#fee2e2', borderRadius: 10, padding: '1px 8px' }}>{groupBn} nút thắt</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f766e' }}>{fmtH(group.totalH)} h</span>
                              <span style={{ fontSize: 16, color: '#9ca3af', lineHeight: 1 }}>{isCollapsed ? '▶' : '▼'}</span>
                            </div>
                          </div>

                          {/* Group table */}
                          {!isCollapsed && (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                              <thead>
                                <tr>
                                  {TABLE_COLS.map(h => (
                                    <th key={h} style={{ ...thStyle, textAlign: h.startsWith('t.') || h === 'Tổng (h)' || h === 'SL Còn Lại' || h === 'Ngày HT' ? 'right' : 'left' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {group.orders.map((r, i) => {
                                  const bn = r.bottleneck ? BN_CFG[r.bottleneck.key] : null
                                  return (
                                    <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                      <td style={{ padding: '8px 8px', fontFamily: 'monospace', color: '#1677ff', fontWeight: 700, fontSize: 12 }}>{r.maBravo}</td>
                                      <td style={{ padding: '8px 8px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.tenSanPham}>{r.tenSanPham || '—'}</td>
                                      <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>{fmtN(r.soLuongConLai)}</td>
                                      <td style={{ padding: '8px 8px', textAlign: 'right', color: r.bottleneck?.key === 'PC'   ? '#1e40af' : '#374151', fontWeight: r.bottleneck?.key === 'PC'   ? 700 : 400 }}>{fmtH(r.tPc)}</td>
                                      <td style={{ padding: '8px 8px', textAlign: 'right', color: r.bottleneck?.key === 'PL'   ? '#92400e' : '#374151', fontWeight: r.bottleneck?.key === 'PL'   ? 700 : 400 }}>{fmtH(r.tPl)}</td>
                                      <td style={{ padding: '8px 8px', textAlign: 'right', color: r.bottleneck?.key === 'BBC1' ? '#991b1b' : '#374151', fontWeight: r.bottleneck?.key === 'BBC1' ? 700 : 400 }}>{fmtH(r.tBbc)}</td>
                                      <td style={{ padding: '8px 8px', textAlign: 'right', color: r.bottleneck?.key === 'DG'   ? '#6d28d9' : '#374151', fontWeight: r.bottleneck?.key === 'DG'   ? 700 : 400 }}>{fmtH(r.tDg)}</td>
                                      <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700 }}>{fmtH(r.total)}</td>
                                      <td style={{ padding: '8px 8px' }}>
                                        {bn && <span style={{ background: bn.bg, color: bn.color, fontWeight: 600, padding: '2px 8px', borderRadius: 4, fontSize: 12, whiteSpace: 'nowrap' }}>
                                          {bn.label} {fmtH(r.bottleneck.t)}h
                                        </span>}
                                      </td>
                                      <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                                        {(() => {
                                          if (!r.bottleneck) return <span style={{ color: '#d1d5db' }}>—</span>
                                          const w = stageWorkers[r.bottleneck.key] || 0
                                          if (w === 0) return <span style={{ color: '#d1d5db', fontSize: 11 }}>—</span>
                                          const days = r.bottleneck.t / w
                                          return <span style={{ fontWeight: 700, color: bn?.color || '#374151' }}>{fmtDays(days)} <span style={{ fontWeight: 400, fontSize: 11 }}>ngày</span></span>
                                        })()}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                              <tfoot>
                                {(() => {
                                  const sumPc  = group.orders.reduce((s, x) => s + (x.tPc  || 0), 0)
                                  const sumPl  = group.orders.reduce((s, x) => s + (x.tPl  || 0), 0)
                                  const sumBbc = group.orders.reduce((s, x) => s + (x.tBbc || 0), 0)
                                  const sumDg  = group.orders.reduce((s, x) => s + (x.tDg  || 0), 0)
                                  const sumAll = group.orders.reduce((s, x) => s + (x.total || 0), 0)
                                  const tdSum  = (v, bold) => (
                                    <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: bold ? 700 : 600, color: '#0f766e', background: '#f0fdf4', borderTop: '2px solid #bbf7d0' }}>
                                      {v > 0 ? fmtH(v) : <span style={{ color: '#d1d5db' }}>—</span>}
                                    </td>
                                  )
                                  return (
                                    <tr>
                                      <td colSpan={2} style={{ padding: '7px 8px', fontWeight: 700, color: '#0f766e', background: '#f0fdf4', borderTop: '2px solid #bbf7d0', fontSize: 12 }}>Tổng nhóm</td>
                                      <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: '#0f766e', background: '#f0fdf4', borderTop: '2px solid #bbf7d0' }}>
                                        {group.orders.reduce((s, x) => s + (Number(x.soLuongConLai) || 0), 0).toLocaleString('vi-VN')}
                                      </td>
                                      {tdSum(sumPc)}
                                      {tdSum(sumPl)}
                                      {tdSum(sumBbc)}
                                      {tdSum(sumDg)}
                                      {tdSum(sumAll, true)}
                                      <td colSpan={2} style={{ background: '#f0fdf4', borderTop: '2px solid #bbf7d0' }} />
                                    </tr>
                                  )
                                })()}
                              </tfoot>
                            </table>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
              {ordersWithoutData.length > 0 && (
                <Callout color="amber">
                  <b>Lưu ý:</b> {ordersWithoutData.length} đơn chưa có đủ dữ liệu năng suất: {ordersWithoutData.slice(0,5).map(r => r.maBravo || r.maSp).join(', ')}{ordersWithoutData.length > 5 ? '...' : ''}. Cần bổ sung NS trong Danh mục TP trước khi phân tích.
                </Callout>
              )}
            </div>

            {/* ── Section 2: Tải máy ── */}
            <div style={{ marginBottom: 36 }}>
              <SecTitle n="2" title="Tải máy — đâu là máy nghẽn nhất" sub="Tổng giờ mỗi máy phải gánh nếu chạy toàn bộ đơn trong danh sách" />
              {bbc1M.length > 0 && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', marginBottom: 8, marginTop: 4 }}>Máy Vệ Sinh BBC1 (VS BBC1)</div>
                  {bbc1M.map(m => <BarRow key={m.machine} label={m.machine} hours={m.hours} maxH={maxHours} color="#dc2626" orders={m.orders} />)}
                </>
              )}
              {dgM.length > 0 && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#6d28d9', marginBottom: 8, marginTop: 16 }}>Máy Đóng Gói (ĐG)</div>
                  {dgM.map(m => <BarRow key={m.machine} label={m.machine} hours={m.hours} maxH={maxHours} color="#7c3aed" orders={m.orders} />)}
                </>
              )}
              {pcM.length > 0 && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, marginTop: 16 }}>Máy Pha Chế (PC)</div>
                  {pcM.map(m => <BarRow key={m.machine} label={m.machine} hours={m.hours} maxH={maxHours} color="#0f766e" orders={m.orders} />)}
                </>
              )}
              {plM.length > 0 && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, marginTop: 16 }}>Máy Phân Liều (PL)</div>
                  {plM.map(m => <BarRow key={m.machine} label={m.machine} hours={m.hours} maxH={maxHours} color="#f59e0b" orders={m.orders} />)}
                </>
              )}
              {machineList.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13, padding: '12px 0' }}>Chưa có dữ liệu máy móc.</div>}
              {machineList.length > 0 && (
                <Callout color="green">
                  {bbc1M.length > 0
                    ? <><b>Đọc biểu đồ:</b> Máy VS BBC1 <b>{bbc1M[0].machine} ({fmtH(bbc1M[0].hours)}h)</b>{bbc1M[1] ? ` và ${bbc1M[1].machine} (${fmtH(bbc1M[1].hours)}h)` : ''} đang gánh khối lượng lớn. Dồn chú ý vào lịch chạy các máy này trước.</>
                    : <><b>Đọc biểu đồ:</b> Không có đơn hàng dùng máy VS BBC1 trong danh sách hiện tại.</>
                  }
                </Callout>
              )}
            </div>

            {/* ── Section 3: Xung đột & Song song ── */}
            <div style={{ marginBottom: 36 }}>
              <SecTitle n="3" title="Xung đột & cơ hội chạy song song" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                  <div style={{ fontWeight: 600, color: '#991b1b', marginBottom: 10, fontSize: 14 }}>⚠ Xung đột cần xử lý</div>
                  {conflicts.length === 0
                    ? <div style={{ fontSize: 13, color: '#6b7280' }}>Không phát hiện xung đột máy giữa các đơn.</div>
                    : <ul style={{ paddingLeft: 18, fontSize: 13, color: '#4b5563' }}>
                        {conflicts.slice(0, 6).map(c => (
                          <li key={`${c.stageKey}_${c.machine}`} style={{ marginBottom: 6 }}>
                            <b>{c.machine}</b> ({BN_CFG[c.stageKey]?.label || c.stageKey}): phải làm {c.orders.length} đơn liên tiếp —{' '}
                            {c.orders.map(o => `${o.ten?.slice(0,15) || o.bravo} (${fmtH(o.t)}h)`).join(' → ')} = <b>{fmtH(c.totalH)}h</b>
                          </li>
                        ))}
                      </ul>
                  }
                </div>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                  <div style={{ fontWeight: 600, color: '#065f46', marginBottom: 10, fontSize: 14 }}>✓ Cơ hội chạy song song</div>
                  {parallelMachines.length < 2
                    ? <div style={{ fontSize: 13, color: '#6b7280' }}>
                        {ordersWithoutData.length > 0
                          ? 'Nhiều đơn thiếu dữ liệu NS — bổ sung để phân tích song song chính xác hơn.'
                          : 'Các đơn hiện tại dùng chung máy VS BBC1 hoặc không có máy VS BBC1 → không phát hiện cơ hội song song rõ ràng.'
                        }
                        {ordersWithData.filter(r => !r.bottleneck || r.bottleneck.key !== 'BBC1').length > 0 && (
                          <span> Đơn nút thắt <b>Phân Liều / Pha Chế / Đóng Gói</b> không chiếm máy VS BBC1 → có thể chạy song song với đơn VS BBC1 đang chạy.</span>
                        )}
                      </div>
                    : <ul style={{ paddingLeft: 18, fontSize: 13, color: '#4b5563' }}>
                        {parallelMachines.map((m, i) => (
                          parallelMachines.slice(i + 1).map(m2 => (
                            <li key={`${m}__${m2}`} style={{ marginBottom: 6 }}>
                              <b>{bbc1Groups[m]?.[0]?.tenSanPham?.slice(0,16) || m.slice(0,20)}</b> ({m.slice(0,25)}) &amp; <b>{bbc1Groups[m2]?.[0]?.tenSanPham?.slice(0,16) || m2.slice(0,20)}</b> ({m2.slice(0,25)}) — dùng <b>máy chiết khác nhau</b> → chạy song song được.
                            </li>
                          ))
                        ))}
                        {ordersWithData.filter(r => r.bottleneck && r.bottleneck.key !== 'BBC1').length > 0 && (
                          <li style={{ marginBottom: 6 }}>Đơn nút thắt <b>pha loãng / pha chế</b> ({ordersWithData.filter(r => r.bottleneck?.key !== 'BBC1').length} đơn) không chiếm máy chiết → chèn vào lúc máy chiết đang bận.</li>
                        )}
                      </ul>
                  }
                </div>
              </div>
            </div>

            {/* ── Section 4: Thứ tự ưu tiên ── */}
            <div style={{ marginBottom: 24 }}>
              <SecTitle n="4" title="Đề xuất thứ tự xếp đơn" sub="Ưu tiên đơn khối lượng lớn / nút thắt dài để giải phóng máy sớm, đơn nhỏ chèn vào khe trống" />
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                {[['#0f766e','Ưu tiên 1 — đơn lớn, máy chiết'],['#f59e0b','Ưu tiên 2 — nút thắt pha loãng'],['#3b82f6','Ưu tiên 3 — đơn nhỏ, chèn khe']].map(([c,l]) => (
                  <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 11, height: 11, borderRadius: 2, background: c, display: 'inline-block' }} />{l}
                  </span>
                ))}
              </div>
              {ordersWithData.map((r, i) => {
                const bn   = r.bottleneck ? BN_CFG[r.bottleneck.key] : null
                // Ưu tiên 1: nút thắt BBC1 hoặc DG và tổng > 10h; Ưu tiên 2: PL; Ưu tiên 3: còn lại
                const pri  = (r.bottleneck?.key === 'BBC1' || r.bottleneck?.key === 'DG') && r.total > 10 ? 0
                           : r.bottleneck?.key === 'PL' ? 1
                           : 2
                const circ = RANK_COLOR[pri]
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: circ, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{r.tenSanPham || r.maBravo}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        {r.maBravo} · SL còn {fmtN(r.soLuongConLai)}
                        {r._pm.mayMocBbc1 && <> · Máy VS BBC1: <b>{r._pm.mayMocBbc1}</b></>}
                        {r._pm.mayMocDg   && <> · Máy ĐG: <b>{r._pm.mayMocDg}</b></>}
                        {r.bottleneck && <> · nút thắt: <span style={{ color: bn?.color, fontWeight: 600 }}>{bn?.label} {fmtH(r.bottleneck.t)}h</span></>}
                      </div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#0f766e', whiteSpace: 'nowrap' }}>{fmtH(r.total)} h</div>
                  </div>
                )
              })}
              {ordersWithData.length === 0 && (
                <Callout color="amber">Chưa có đủ dữ liệu năng suất để xếp thứ tự. Vui lòng bổ sung NS trong Danh mục TP.</Callout>
              )}
            </div>

          </div>
        )

        return analysisFullscreen ? (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            zIndex: 9998, background: '#fff', overflowY: 'auto',
          }}
            onClick={e => e.stopPropagation()}
          >
            {innerContent}
          </div>
        ) : innerContent
      })()
      ) : activeTab === 'pc-pl' ? (
      /* ── Tab: Chi Tiết PC/PL ── */
      (() => {
        const fmtNS2 = v => (v != null && v > 0) ? Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) : '—'
        const fmtH2  = v => (v != null && v > 0) ? Number(v).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'
        const fmtD   = v => (v != null && v > 0) ? Number(v).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'

        const workersPc = (employeeCounts['PCPL1'] || 0) + (employeeCounts['PCPL2'] || 0)
        const workersPl = employeeCounts['PCPL3'] || 0

        const pcPlData = displayData
          .map(r => {
            const pm    = productMasterMap[r.maBravo] || {}
            const sl    = Number(r.soLuongConLai) || 0
            const nsPc  = Number(pm.nangSuatPc) || 0
            const nsPl  = Number(pm.nangSuatPl) || 0
            const congPc = nsPc > 0 ? sl / nsPc : null
            const congPl = nsPl > 0 ? sl / nsPl : null
            let bottleneck = null
            if (congPc != null && congPl != null) bottleneck = congPc >= congPl ? 'PC' : 'PL'
            else if (congPc != null) bottleneck = 'PC'
            else if (congPl != null) bottleneck = 'PL'
            const bnWorkers = bottleneck === 'PC' ? workersPc : bottleneck === 'PL' ? workersPl : 0
            const maxCong   = Math.max(congPc || 0, congPl || 0)
            const ngayHt    = bnWorkers > 0 && maxCong > 0 ? maxCong / bnWorkers : null
            return { ...r, _pm: pm, congPc, congPl, bottleneck, ngayHt }
          })
          .filter(r => r._pm.nangSuatPc || r._pm.nangSuatPl || r._pm.mayMocPc || r._pm.mayMocPl)
          .sort((a, b) => (b.congPc || 0) + (b.congPl || 0) - ((a.congPc || 0) + (a.congPl || 0)))

        const BN_PC = { bg: '#dbeafe', color: '#1e40af', label: 'Pha Chế' }
        const BN_PL = { bg: '#fef3c7', color: '#92400e', label: 'Phân Liều' }

        const totSlDat  = pcPlData.reduce((s, r) => s + (Number(r.soLuongDatHang) || 0), 0)
        const totSlCon  = pcPlData.reduce((s, r) => s + (Number(r.soLuongConLai)  || 0), 0)
        const totCongPc = pcPlData.reduce((s, r) => s + (r.congPc || 0), 0)
        const totCongPl = pcPlData.reduce((s, r) => s + (r.congPl || 0), 0)

        const pcPlCols = [
          {
            title: '#', key: 'stt', width: 44, fixed: 'left', align: 'center',
            render: (_, __, i) => <span style={{ fontSize: 11, color: '#94a3b8' }}>{i + 1}</span>,
          },
          {
            title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 115, fixed: 'left', align: 'center',
            render: v => v
              ? <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff', fontSize: 12 }}>{v}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
          {
            title: 'Mã SP', dataIndex: 'maSp', key: 'maSp', width: 80, align: 'center',
            render: v => v ? <Tag color="blue" style={{ marginRight: 0, fontWeight: 600 }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
          {
            title: 'Tên Sản Phẩm', dataIndex: 'tenSanPham', key: 'tenSanPham', width: 200, fixed: 'left', ellipsis: true,
            render: v => <span style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{v || <span style={{ color: '#d9d9d9' }}>—</span>}</span>,
          },
          {
            title: 'Loại SP', key: 'loaiSp', width: 110,
            render: (_, r) => r._pm.loaiSanPham
              ? <span style={{ fontSize: 12, color: '#374151' }}>{r._pm.loaiSanPham}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
          {
            title: 'Mã Đơn Hàng', dataIndex: 'maDonHang', key: 'maDonHang', width: 115, align: 'center',
            render: v => v
              ? <span style={{ fontFamily: 'monospace', color: 'rgb(0,0,205)', fontWeight: 600, fontSize: 12 }}>{v}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
          {
            title: 'SL Đặt', dataIndex: 'soLuongDatHang', key: 'slDat', width: 95, align: 'right',
            sorter: (a, b) => (Number(a.soLuongDatHang) || 0) - (Number(b.soLuongDatHang) || 0),
            render: v => <span style={{ fontWeight: 700, color: '#374151' }}>{fmtNum(v)}</span>,
          },
          {
            title: 'SL Còn Lại', dataIndex: 'soLuongConLai', key: 'slCon', width: 100, align: 'right',
            sorter: (a, b) => (Number(a.soLuongConLai) || 0) - (Number(b.soLuongConLai) || 0),
            render: v => {
              const n = Number(v) || 0
              return <span style={{ fontWeight: 700, color: n > 0 ? '#cf1322' : '#389e0d' }}>{fmtNum(v)}</span>
            },
          },
          {
            title: 'Tình Trạng', key: 'ttSx', width: 120, align: 'center',
            render: (_, r) => {
              const cfg = TINH_TRANG_SX[r.tinhTrangSx]
              if (!cfg) return <span style={{ color: '#94a3b8', fontSize: 11 }}>Chưa bắt đầu</span>
              return <Badge status={r.tinhTrangSx === 'done' ? 'success' : 'processing'} text={<span style={{ fontWeight: 600, color: cfg.color, fontSize: 11 }}>{cfg.label}</span>} />
            },
          },
          {
            title: 'KL/ĐV (g)', key: 'khoiLuong', width: 90, align: 'right',
            render: (_, r) => <span style={{ color: '#0369a1', fontWeight: 600 }}>{fmtNum(r._pm.khoiLuong)}</span>,
          },
          /* ── Nhóm PC ── */
          {
            title: <span style={{ color: '#1e40af' }}>NS PC (sp/công)</span>,
            key: 'nsPc', width: 120, align: 'right',
            sorter: (a, b) => (Number(a._pm.nangSuatPc) || 0) - (Number(b._pm.nangSuatPc) || 0),
            render: (_, r) => r._pm.nangSuatPc
              ? <span style={{ color: '#1d4ed8', fontWeight: 600 }}>{fmtNS2(r._pm.nangSuatPc)}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
          {
            title: <span style={{ color: '#1e40af' }}>Máy Móc PC</span>,
            key: 'mmPc', width: 175,
            render: (_, r) => r._pm.mayMocPc
              ? <span style={{ fontSize: 12, color: '#374151' }}>{r._pm.mayMocPc}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
          {
            title: <span style={{ color: '#1e40af' }}>Công PC (h)</span>,
            key: 'congPc', width: 110, align: 'right',
            sorter: (a, b) => (a.congPc || 0) - (b.congPc || 0),
            render: (_, r) => r.congPc != null
              ? <span style={{ fontWeight: r.bottleneck === 'PC' ? 700 : 400, color: r.bottleneck === 'PC' ? '#1e40af' : '#374151' }}>{fmtH2(r.congPc)}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
          /* ── Nhóm PL ── */
          {
            title: <span style={{ color: '#92400e' }}>NS PL (sp/công)</span>,
            key: 'nsPl', width: 120, align: 'right',
            sorter: (a, b) => (Number(a._pm.nangSuatPl) || 0) - (Number(b._pm.nangSuatPl) || 0),
            render: (_, r) => r._pm.nangSuatPl
              ? <span style={{ color: '#0e7490', fontWeight: 600 }}>{fmtNS2(r._pm.nangSuatPl)}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
          {
            title: <span style={{ color: '#92400e' }}>Máy Móc PL</span>,
            key: 'mmPl', width: 175,
            render: (_, r) => r._pm.mayMocPl
              ? <span style={{ fontSize: 12, color: '#374151' }}>{r._pm.mayMocPl}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
          {
            title: <span style={{ color: '#92400e' }}>Công PL (h)</span>,
            key: 'congPl', width: 110, align: 'right',
            sorter: (a, b) => (a.congPl || 0) - (b.congPl || 0),
            render: (_, r) => r.congPl != null
              ? <span style={{ fontWeight: r.bottleneck === 'PL' ? 700 : 400, color: r.bottleneck === 'PL' ? '#92400e' : '#374151' }}>{fmtH2(r.congPl)}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>,
          },
          /* ── Phân tích ── */
          {
            title: 'Nút Thắt', key: 'bn', width: 110, align: 'center',
            filters: [{ text: 'Pha Chế', value: 'PC' }, { text: 'Phân Liều', value: 'PL' }, { text: 'Chưa có', value: '' }],
            onFilter: (val, r) => val === '' ? !r.bottleneck : r.bottleneck === val,
            render: (_, r) => {
              if (!r.bottleneck) return <span style={{ color: '#d9d9d9', fontSize: 11 }}>—</span>
              const cfg = r.bottleneck === 'PC' ? BN_PC : BN_PL
              return <span style={{ background: cfg.bg, color: cfg.color, fontWeight: 600, padding: '2px 8px', borderRadius: 4, fontSize: 12, whiteSpace: 'nowrap' }}>{cfg.label}</span>
            },
          },
          {
            title: 'Ngày HT (dự tính)',
            key: 'ngayHt', width: 130, align: 'right',
            sorter: (a, b) => (a.ngayHt || 0) - (b.ngayHt || 0),
            render: (_, r) => r.ngayHt != null
              ? <span style={{ fontWeight: 700, color: '#0f766e' }}>{fmtD(r.ngayHt)} <span style={{ fontWeight: 400, fontSize: 11 }}>ngày</span></span>
              : <span style={{ color: '#d9d9d9', fontSize: 11 }}>—</span>,
          },
        ]

        const summaryPcPl = () => {
          const s = { fontWeight: 700, background: '#f0f5ff', padding: '6px 8px' }
          return (
            <Table.Summary fixed="bottom">
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}><span style={{ ...s, display: 'block' }}>Tổng ({pcPlData.length} đơn)</span></Table.Summary.Cell>
                <Table.Summary.Cell index={4} />
                <Table.Summary.Cell index={5} />
                <Table.Summary.Cell index={6} align="right"><span style={s}>{totSlDat.toLocaleString('vi-VN')}</span></Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right"><span style={{ ...s, color: '#cf1322' }}>{totSlCon.toLocaleString('vi-VN')}</span></Table.Summary.Cell>
                <Table.Summary.Cell index={8} colSpan={2} />
                <Table.Summary.Cell index={10} />
                <Table.Summary.Cell index={11} />
                <Table.Summary.Cell index={12} align="right"><span style={{ ...s, color: '#1d4ed8' }}>{fmtH2(totCongPc)}</span></Table.Summary.Cell>
                <Table.Summary.Cell index={13} />
                <Table.Summary.Cell index={14} />
                <Table.Summary.Cell index={15} align="right"><span style={{ ...s, color: '#0e7490' }}>{fmtH2(totCongPl)}</span></Table.Summary.Cell>
                <Table.Summary.Cell index={16} colSpan={2} />
              </Table.Summary.Row>
            </Table.Summary>
          )
        }

        const noBnCount = pcPlData.filter(r => !r.bottleneck).length

        return (
          <div>
            {/* KPI bar */}
            <div style={{ display: 'flex', gap: 12, padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                {[
                  { label: 'Đơn có PC/PL', val: pcPlData.length, color: '#1677ff' },
                  { label: 'SL Còn Lại', val: totSlCon.toLocaleString('vi-VN'), color: '#cf1322' },
                  { label: 'Tổng Công PC', val: `${fmtH2(totCongPc)} h`, color: '#1e40af' },
                  { label: 'Tổng Công PL', val: `${fmtH2(totCongPl)} h`, color: '#92400e' },
                  { label: 'Nút thắt PC', val: pcPlData.filter(r => r.bottleneck === 'PC').length, color: '#1e40af' },
                  { label: 'Nút thắt PL', val: pcPlData.filter(r => r.bottleneck === 'PL').length, color: '#92400e' },
                  workersPc > 0 ? { label: 'Ngày HT PC (ước)', val: `${fmtD(totCongPc / workersPc)} ngày`, color: '#1d4ed8' } : null,
                  workersPl > 0 ? { label: 'Ngày HT PL (ước)', val: `${fmtD(totCongPl / workersPl)} ngày`, color: '#0e7490' } : null,
                ].filter(Boolean).map(k => (
                  <div key={k.label} style={{ background: '#fff', border: `1px solid ${k.color}33`, borderRadius: 8, padding: '6px 14px', minWidth: 110 }}>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{k.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: k.color }}>{k.val}</div>
                  </div>
                ))}
              </div>
              {noBnCount > 0 && (
                <div style={{ fontSize: 12, color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 6, padding: '4px 12px' }}>
                  ⚠ {noBnCount} đơn chưa đủ NS để tính nút thắt
                </div>
              )}
            </div>

            <Table
              className="dh-table"
              columns={pcPlCols}
              dataSource={pcPlData}
              rowKey="id"
              loading={loading || loadingMaster}
              size="small"
              scroll={{ x: 1980 }}
              sticky={{ offsetHeader: headerOffset }}
              rowHoverable={false}
              rowClassName={rowClassName}
              onRow={r => ({ onClick: () => openDetail(r), style: { cursor: 'pointer' } })}
              pagination={{
                defaultPageSize: 50,
                pageSizeOptions: ['20', '50', '100'],
                showSizeChanger: true,
                showTotal: t => `${t} đơn hàng`,
              }}
              summary={summaryPcPl}
              locale={{ emptyText: <span style={{ color: '#d9d9d9' }}>Không có đơn hàng nào có dữ liệu PC/PL</span> }}
            />

            {/* ── Bảng Thống Kê Tải Máy ── */}
            {(() => {
              const buildGroups = (dataArr, machineKey, congKey, nsKey) => {
                const map = {}
                dataArr.forEach(r => {
                  if (!r._pm[machineKey] && !(Number(r._pm[nsKey]) > 0)) return
                  const m = r._pm[machineKey] || '(Chưa nhập máy)'
                  if (!map[m]) map[m] = { machine: m, orders: [] }
                  map[m].orders.push(r)
                })
                return Object.values(map).map(g => ({
                  ...g,
                  key: g.machine,
                  sodon: g.orders.length,
                  totSl: g.orders.reduce((s, r) => s + (Number(r.soLuongConLai) || 0), 0),
                  totCong: g.orders.reduce((s, r) => s + (r[congKey] || 0), 0),
                  orders: [...g.orders].sort((a, b) => (b[congKey] || 0) - (a[congKey] || 0)),
                })).sort((a, b) => b.totCong - a.totCong)
              }

              const pcGroups = buildGroups(pcPlData, 'mayMocPc', 'congPc', 'nangSuatPc')
              const plGroups = buildGroups(pcPlData, 'mayMocPl', 'congPl', 'nangSuatPl')
              const maxPcCong = pcGroups.length > 0 ? Math.max(...pcGroups.map(g => g.totCong)) : 1
              const maxPlCong = plGroups.length > 0 ? Math.max(...plGroups.map(g => g.totCong)) : 1

              const thTd = (accent, border) => ({ padding: '6px 10px', textAlign: 'left', color: accent, fontWeight: 700, borderBottom: `1px solid ${border}`, background: 'transparent', fontSize: 11, whiteSpace: 'nowrap' })
              const thTdR = (accent, border) => ({ ...thTd(accent, border), textAlign: 'right' })
              const thTdC = (accent, border) => ({ ...thTd(accent, border), textAlign: 'center' })

              const MachinePanel = ({ groups, maxCong, accent, bg, border, congKey, nsKey, nsLabel }) => (
                <div style={{ flex: 1, minWidth: 560, border: `1px solid ${border}`, borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ background: bg, padding: '10px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 700, color: accent, fontSize: 14 }}>⚙ {nsLabel === 'NS PC' ? 'Tải Máy Pha Chế (PC)' : 'Tải Máy Phân Liều (PL)'}</span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                      {groups.length} loại máy · {groups.reduce((s, g) => s + g.sodon, 0)} đơn · {fmtH2(groups.reduce((s, g) => s + g.totCong, 0))} h
                    </span>
                  </div>
                  {groups.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#d1d5db', fontSize: 13 }}>Không có dữ liệu</div>
                  ) : groups.map((g, gi) => {
                    const pct = maxCong > 0 ? Math.round((g.totCong / maxCong) * 100) : 0
                    return (
                      <div key={g.machine} style={{ borderBottom: gi < groups.length - 1 ? `1px solid ${border}` : 'none' }}>
                        {/* Machine header row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: gi % 2 === 0 ? '#fff' : '#f9fafb' }}>
                          <span style={{ fontWeight: 700, color: accent, fontSize: 13, minWidth: 180 }}>{g.machine}</span>
                          <span style={{ fontSize: 12, color: '#6b7280' }}>{g.sodon} đơn</span>
                          <span style={{ fontSize: 12, color: '#374151', marginLeft: 8 }}>SL: <b>{g.totSl.toLocaleString('vi-VN')}</b></span>
                          <span style={{ fontSize: 12, color: accent, marginLeft: 8, fontWeight: 700 }}>{fmtH2(g.totCong)} h</span>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                            <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 4, height: 7, overflow: 'hidden', maxWidth: 160 }}>
                              <div style={{ width: `${pct}%`, background: accent, height: '100%', borderRadius: 4 }} />
                            </div>
                            <span style={{ fontSize: 11, color: '#6b7280' }}>{pct}%</span>
                          </div>
                        </div>
                        {/* Detail table */}
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: `${bg}cc` }}>
                                <th style={{ ...thTdC(accent, border), width: 30 }}>#</th>
                                <th style={thTd(accent, border)}>Mã Bravo</th>
                                <th style={thTd(accent, border)}>Tên Sản Phẩm</th>
                                <th style={thTd(accent, border)}>Số Lô</th>
                                <th style={thTd(accent, border)}>Mã Đơn Hàng</th>
                                <th style={thTdR(accent, border)}>SL Còn Lại</th>
                                <th style={thTdR(accent, border)}>{nsLabel}</th>
                                <th style={thTdR(accent, border)}>TG Hoàn Thành</th>
                              </tr>
                            </thead>
                            <tbody>
                              {g.orders.map((r, ri) => (
                                <tr
                                  key={r.id}
                                  style={{ background: ri % 2 === 0 ? '#fff' : '#f8fafc', cursor: 'pointer' }}
                                  onClick={() => openDetail(r)}
                                >
                                  <td style={{ padding: '5px 10px', textAlign: 'center', color: '#9ca3af' }}>{ri + 1}</td>
                                  <td style={{ padding: '5px 10px', color: '#1677ff', fontWeight: 600, whiteSpace: 'nowrap' }}>{r.maBravo || '—'}</td>
                                  <td style={{ padding: '5px 10px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.tenSanPham}>{r.tenSanPham || '—'}</td>
                                  <td style={{ padding: '5px 10px', whiteSpace: 'nowrap', color: '#374151' }}>{r.soLo || '—'}</td>
                                  <td style={{ padding: '5px 10px', whiteSpace: 'nowrap', color: '#374151' }}>{r.maDonHang || '—'}</td>
                                  <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 600 }}>{Number(r.soLuongConLai || 0).toLocaleString('vi-VN')}</td>
                                  <td style={{ padding: '5px 10px', textAlign: 'right', color: '#6b7280' }}>{fmtNS2(r._pm[nsKey])}</td>
                                  <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 700, color: r[congKey] > 0 ? accent : '#d1d5db' }}>
                                    {r[congKey] > 0 ? `${fmtH2(r[congKey])} h` : '—'}
                                  </td>
                                </tr>
                              ))}
                              <tr style={{ background: bg, borderTop: `1px solid ${border}` }}>
                                <td colSpan={5} style={{ padding: '5px 10px', fontWeight: 700, color: accent, fontSize: 11 }}>Tổng ({g.sodon} đơn)</td>
                                <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 700, color: accent }}>{g.totSl.toLocaleString('vi-VN')}</td>
                                <td />
                                <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 700, color: accent }}>{fmtH2(g.totCong)} h</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })}
                  {/* Grand total */}
                  <div style={{ background: bg, borderTop: `2px solid ${border}`, padding: '8px 12px', display: 'flex', gap: 24 }}>
                    <span style={{ fontWeight: 700, color: accent }}>Tổng cộng</span>
                    <span style={{ color: '#374151' }}>{groups.reduce((s, g) => s + g.sodon, 0)} đơn</span>
                    <span style={{ color: '#374151' }}>SL: <b>{groups.reduce((s, g) => s + g.totSl, 0).toLocaleString('vi-VN')}</b></span>
                    <span style={{ color: accent, fontWeight: 700 }}>{fmtH2(groups.reduce((s, g) => s + g.totCong, 0))} h</span>
                  </div>
                </div>
              )

              return (
                <div style={{ padding: '16px 16px 20px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <MachinePanel groups={pcGroups} maxCong={maxPcCong} accent="#1e40af" bg="#eff6ff" border="#dbeafe" congKey="congPc" nsKey="nangSuatPc" nsLabel="NS PC" />
                  <MachinePanel groups={plGroups} maxCong={maxPlCong} accent="#92400e" bg="#fffbeb" border="#fde68a" congKey="congPl" nsKey="nangSuatPl" nsLabel="NS PL" />
                </div>
              )
            })()}
          </div>
        )
      })()
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
