import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Table, Input, Select, Tag, Tooltip, message, Button, Badge,
  Modal, Form, DatePicker, InputNumber, Divider, AutoComplete, Spin,
} from 'antd'
import { Rnd } from 'react-rnd'
import SkeletonTable from '../components/SkeletonTable'
import {
  PlusOutlined, SyncOutlined, SearchOutlined,
  ReloadOutlined, EditOutlined, CheckOutlined, FileAddOutlined,
  DeleteOutlined, ThunderboltOutlined, CloseOutlined,
  SaveOutlined, FileTextOutlined, SwapOutlined, HistoryOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api/axios'

const { Option } = Select

const fmtNum = (v) => v != null && v !== '' ? Number(v).toLocaleString('vi-VN') : '—'

const TO_LIST  = ['PCPL1', 'PCPL2', 'PCPL3', 'BBC1', 'ĐG']
const TO_COLOR = { PCPL1: 'cyan', PCPL2: 'geekblue', PCPL3: 'blue', BBC1: 'orange', 'ĐG': 'purple' }

// ── LenhModal layout helpers ──────────────────────────────────────────────────
const LLCell = ({ children }) => (
  <div style={{
    padding: '7px 10px', background: '#f1f5f9', fontWeight: 600, fontSize: 12,
    color: '#64748b', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
    display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
  }}>
    {children}
  </div>
)
const LVCell = ({ children, last, span }) => (
  <div style={{
    padding: '5px 8px', borderBottom: '1px solid #e2e8f0', minWidth: 0,
    ...(last ? {} : { borderRight: '1px solid #e2e8f0' }),
    ...(span ? { gridColumn: `span ${span}` } : {}),
    display: 'flex', alignItems: 'center',
  }}>
    {children}
  </div>
)

// ── Isolated input per row — avoids parent re-render on keystroke ─────────────
function SoLoInputCell({ workScheduleId, valRef, onPressEnter }) {
  const [val, setVal] = useState('')
  const handleChange = (e) => {
    setVal(e.target.value)
    valRef.current[workScheduleId] = e.target.value
  }
  return (
    <Input
      size="small"
      placeholder="Nhập số lô"
      value={val}
      onChange={handleChange}
      onPressEnter={onPressEnter}
      style={{ width: 100, fontFamily: 'monospace', fontSize: 12 }}
    />
  )
}

// ── Đổi lô Modal ─────────────────────────────────────────────────────────────
function DoiLoModal({ open, record, onClose, onSaved }) {
  const [soLoMoi,  setSoLoMoi]  = useState('')
  const [lyDo,     setLyDo]     = useState('')
  const [preview,  setPreview]  = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    if (!open || !record?.id) return
    setSoLoMoi(''); setLyDo(''); setPreview(null)
    setLoading(true)
    api.get(`/lenh-san-xuat/${record.id}/doi-lo/preview`)
      .then(({ data }) => setPreview(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, record])

  const handleSubmit = async () => {
    const lo = soLoMoi.trim()
    if (!lo) { message.warning('Vui lòng nhập số lô mới'); return }
    if (lo === record?.soLo) { message.warning('Số lô mới phải khác số lô hiện tại'); return }
    setSaving(true)
    try {
      await api.post(`/lenh-san-xuat/${record.id}/doi-lo`, { soLoMoi: lo, lyDo: lyDo.trim() || null })
      message.success(`Đã đổi lô: ${record.soLo} → ${lo}`)
      onSaved()
      onClose()
    } catch (err) {
      message.error(err?.response?.data?.message || 'Đổi lô thất bại')
    } finally { setSaving(false) }
  }

  if (!record) return null
  return (
    <Modal
      open={open} onCancel={onClose} title={null} destroyOnHidden
      width={480}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" loading={saving} onClick={handleSubmit}
            icon={<SwapOutlined />} danger>
            Xác nhận đổi lô
          </Button>
        </div>
      }
    >
      <div style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', padding: '12px 16px', margin: '-20px -24px 16px', borderRadius: '8px 8px 0 0' }}>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>Đổi Số Lô</div>
        <div style={{ color: '#c4b5fd', fontSize: 11, marginTop: 2 }}>
          {record.tenSanPham} · {record.maSp}
          {record.maDonHang && <span> · ĐH {record.maDonHang}</span>}
        </div>
      </div>

      {/* Lô hiện tại */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 8, padding: '8px 12px' }}>
          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>Lô hiện tại</div>
          <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: '#7c3aed' }}>{record.soLo || '—'}</div>
        </div>
        <SwapOutlined style={{ color: '#94a3b8', fontSize: 18 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Số lô mới <span style={{ color: '#ef4444' }}>*</span></div>
          <Input
            value={soLoMoi} onChange={e => setSoLoMoi(e.target.value)}
            placeholder="Nhập số lô mới..."
            autoFocus
            style={{ fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed', borderColor: '#7c3aed' }}
            onPressEnter={handleSubmit}
          />
        </div>
      </div>

      {/* Lý do */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Lý do (tuỳ chọn)</div>
        <Input.TextArea value={lyDo} onChange={e => setLyDo(e.target.value)}
          placeholder="VD: nhầm lô, đổi lô theo yêu cầu Bravo..."
          rows={2} style={{ resize: 'none' }} />
      </div>

      {/* Preview */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '8px 0' }}><SyncOutlined spin /> Đang kiểm tra...</div>
      ) : preview && (
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
          <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 6 }}>⚠ Sẽ cập nhật đồng thời:</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <span>📅 <b>{preview.soKhoanLich}</b> khoản Lịch SX</span>
            <span>📊 <b>{preview.soKhoanSanLuong}</b> khoản Sản Lượng</span>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Lịch sử đổi lô Modal ──────────────────────────────────────────────────────
function LichSuDoiLoModal({ open, record, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !record?.id) return
    setLoading(true)
    api.get(`/lenh-san-xuat/${record.id}/lich-su-doi-lo`)
      .then(({ data }) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [open, record])

  if (!record) return null
  return (
    <Modal open={open} onCancel={onClose} title={null} footer={<Button onClick={onClose}>Đóng</Button>}
      destroyOnHidden width={520}>
      <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)', padding: '12px 16px', margin: '-20px -24px 16px', borderRadius: '8px 8px 0 0' }}>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>Lịch sử đổi lô</div>
        <div style={{ color: '#93c5fd', fontSize: 11, marginTop: 2 }}>
          {record.tenSanPham} · {record.maSp}
          {record.soLo && <span> · Lô hiện tại: <b style={{ color: '#bfdbfe' }}>{record.soLo}</b></span>}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}><SyncOutlined spin /> Đang tải...</div>
      ) : history.length === 0 ? (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: 24 }}>Chưa có lịch sử đổi lô</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {history.map((h, i) => (
            <div key={h.id || i} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', background: i === 0 ? '#faf5ff' : '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#9ca3af', textDecoration: 'line-through' }}>{h.soLoCu || '—'}</span>
                <SwapOutlined style={{ color: '#7c3aed', fontSize: 12 }} />
                <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: '#7c3aed' }}>{h.soLoMoi}</span>
                {i === 0 && <span style={{ fontSize: 10, background: '#ede9fe', color: '#6d28d9', borderRadius: 4, padding: '1px 6px', marginLeft: 4 }}>Mới nhất</span>}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {h.lyDo && <span>📝 {h.lyDo}</span>}
                {h.changedBy && <span>👤 {h.changedBy}</span>}
                {h.changedAt && <span>🕐 {dayjs(h.changedAt).format('DD/MM/YYYY HH:mm')}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
function LenhModal({ open, editItem, onClose, onSaved }) {
  const [form]   = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [bravoOptions, setBravoOptions] = useState([])
  const [bravoStatus,  setBravoStatus]  = useState(null) // null | 'loading' | 'found' | 'not_found'
  const bravoTimerRef       = useRef(null)
  const justSelectedBravo   = useRef(false)

  useEffect(() => {
    if (!open) return
    setBravoOptions([])
    setBravoStatus(null)
    if (editItem) {
      form.setFieldsValue({
        ...editItem,
        ngayThucHien: editItem.ngayThucHien ? dayjs(editItem.ngayThucHien) : null,
        ngayKetThuc:  editItem.ngayKetThuc  ? dayjs(editItem.ngayKetThuc)  : null,
        ngayPhatLenh: editItem.ngayPhatLenh ? dayjs(editItem.ngayPhatLenh) : null,
        soLuong: editItem.soLuong != null ? Number(editItem.soLuong) : null,
      })
    } else {
      form.resetFields()
    }
  }, [open, editItem, form])

  const handleBravoSearch = (val) => {
    if (bravoTimerRef.current) clearTimeout(bravoTimerRef.current)
    if (!val || val.length < 2) { setBravoOptions([]); return }
    bravoTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/product-master', { params: { keyword: val, page: 0, size: 12 } })
        const items = (data.content || []).filter(p => p.maBravo)
        setBravoOptions(items.map(p => ({
          value: p.maBravo,
          label: (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontWeight: 700, color: '#1677ff', fontFamily: 'monospace', minWidth: 90, flexShrink: 0 }}>{p.maBravo}</span>
              {p.tienTrinh && <span style={{ color: '#6b7280', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.tienTrinh}</span>}
            </div>
          ),
          raw: p,
        })))
      } catch { setBravoOptions([]) }
    }, 300)
  }

  const handleBravoSelect = (val, option) => {
    justSelectedBravo.current = true
    const p = option.raw
    form.setFieldsValue({ maBravo: p.maBravo, maSp: p.maTp || '', tenSanPham: p.tienTrinh || '' })
    setBravoStatus('found')
    setBravoOptions([])
    setTimeout(() => { justSelectedBravo.current = false }, 150)
  }

  const handleBravoChange = (val) => {
    if (justSelectedBravo.current) return
    const trimmed = (typeof val === 'string' ? val : val?.target?.value)?.trim()
    if (bravoTimerRef.current) clearTimeout(bravoTimerRef.current)
    if (!trimmed) { setBravoStatus(null); return }
    setBravoStatus('loading')
    bravoTimerRef.current = setTimeout(async () => {
      try {
        const { data: master } = await api.get(`/product-master/lookup-by-bravo/${encodeURIComponent(trimmed)}`)
        form.setFieldsValue({ maSp: master.maTp || '', tenSanPham: master.tienTrinh || '' })
        setBravoStatus('found')
      } catch { setBravoStatus('not_found') }
    }, 500)
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        ...values,
        ngayThucHien: values.ngayThucHien ? values.ngayThucHien.format('YYYY-MM-DD') : null,
        ngayKetThuc:  values.ngayKetThuc  ? values.ngayKetThuc.format('YYYY-MM-DD')  : null,
        ngayPhatLenh: values.ngayPhatLenh ? values.ngayPhatLenh.format('YYYY-MM-DD') : null,
      }
      setSaving(true)
      if (editItem?.id) {
        await api.put(`/lenh-san-xuat/${editItem.id}`, { ...editItem, ...payload })
        message.success('Cập nhật lệnh thành công')
      } else {
        await api.post('/lenh-san-xuat', payload)
        message.success('Thêm lệnh thành công')
      }
      onSaved()
      onClose()
    } catch (err) {
      if (err?.response) message.error(err.response.data?.message || 'Lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={null}
      onCancel={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" loading={saving} onClick={handleOk}>
            {editItem ? 'Lưu' : 'Thêm'}
          </Button>
        </div>
      }
      width={760}
      destroyOnHidden
      styles={{ body: { padding: 0 } }}
    >
      {/* Header */}
      <div style={{ background: '#1e3a5f', padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '8px 8px 0 0' }}>
        <span style={{ fontSize: 20 }}>📋</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {editItem ? (editItem.tenSanPham || editItem.maBravo || 'Cập nhật Lệnh Sản Xuất') : 'Thêm Lệnh Sản Xuất'}
          </div>
          {editItem && (
            <div style={{ color: '#93c5fd', fontSize: 11, marginTop: 1, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {editItem.maBravo   && <span>Bravo: <b style={{ color: '#bfdbfe' }}>{editItem.maBravo}</b></span>}
              {editItem.maSp      && <span>SP: <b style={{ color: '#bfdbfe' }}>{editItem.maSp}</b></span>}
              {editItem.maDonHang && <span>ĐH: <b style={{ color: '#c4b5fd' }}>{editItem.maDonHang}</b></span>}
            </div>
          )}
        </div>
      </div>

      <Form form={form} component="div" autoComplete="off" style={{ padding: '12px 16px 8px' }}>
        {/* Grid chính */}
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 110px 1fr', border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>

          {/* Row 1: Mã Bravo — Mã SP */}
          <LLCell>
            <span>Mã Bravo</span>
            {bravoStatus === 'loading'   && <Spin size="small" style={{ marginLeft: 4 }} />}
            {bravoStatus === 'found'     && <span style={{ color: '#52c41a', fontSize: 10 }}>✓</span>}
            {bravoStatus === 'not_found' && <span style={{ color: '#ff4d4f', fontSize: 10 }}>✗</span>}
          </LLCell>
          <LVCell>
            <Form.Item name="maBravo" noStyle>
              <AutoComplete
                options={bravoOptions}
                onSearch={handleBravoSearch}
                onSelect={handleBravoSelect}
                onChange={handleBravoChange}
                placeholder="VD: 10203251"
                allowClear
                size="small"
                popupMatchSelectWidth={340}
                style={{ width: '100%', fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}
              />
            </Form.Item>
          </LVCell>
          <LLCell>Mã SP</LLCell>
          <LVCell last>
            <Form.Item name="maSp" noStyle>
              <Input size="small" placeholder="VD: TP251"
                style={{ width: '100%', color: '#1D4ED8', fontWeight: 600 }} />
            </Form.Item>
          </LVCell>

          {/* Row 2: Tên sản phẩm (full width) */}
          <LLCell>Tên sản phẩm</LLCell>
          <LVCell span={3} last>
            <Form.Item name="tenSanPham" noStyle>
              <Input size="small" placeholder="Tự điền khi chọn mã Bravo" style={{ width: '100%' }} />
            </Form.Item>
          </LVCell>

          {/* Row 3: Số lô — Mã đơn hàng */}
          <LLCell>Số lô</LLCell>
          <LVCell>
            <Form.Item name="soLo" noStyle>
              <Input size="small" placeholder="VD: 080626" style={{ width: '100%', fontFamily: 'monospace' }} />
            </Form.Item>
          </LVCell>
          <LLCell>Mã đơn hàng</LLCell>
          <LVCell last>
            <Form.Item name="maDonHang" noStyle>
              <Input size="small" placeholder="VD: 251250526" style={{ width: '100%', fontFamily: 'monospace' }} />
            </Form.Item>
          </LVCell>

          {/* Row 4: Cỡ lô — Ưu tiên */}
          <LLCell>Cỡ lô</LLCell>
          <LVCell>
            <Form.Item name="soLuong" noStyle>
              <InputNumber size="small" style={{ width: '100%' }}
                formatter={v => v ? Number(v).toLocaleString('vi-VN') : ''}
                parser={v => v ? Number(v.replace(/\./g, '').replace(',', '.')) : null}
              />
            </Form.Item>
          </LVCell>
          <LLCell>Ưu tiên</LLCell>
          <LVCell last>
            <Form.Item name="tinhTrang" noStyle>
              <Select size="small" allowClear placeholder="Không gấp" style={{ width: '100%' }}>
                <Option value="gap">Gấp</Option>
                <Option value="rat_gap">Rất gấp</Option>
              </Select>
            </Form.Item>
          </LVCell>

          {/* Row 5: Tổ thực hiện — Phòng TH */}
          <LLCell>Tổ thực hiện</LLCell>
          <LVCell>
            <Form.Item name="toThucHien" noStyle>
              <Select size="small" allowClear placeholder="Chưa phân công" style={{ width: '100%' }}>
                {TO_LIST.map(t => <Option key={t} value={t}>{t}</Option>)}
              </Select>
            </Form.Item>
          </LVCell>
          <LLCell>Phòng TH</LLCell>
          <LVCell last>
            <Form.Item name="phongThucHien" noStyle>
              <Input size="small" style={{ width: '100%' }} />
            </Form.Item>
          </LVCell>

          {/* Row 6: Ngày TH — Ngày kết thúc — Ngày phát lệnh */}
          <LLCell>Ngày TH</LLCell>
          <LVCell>
            <Form.Item name="ngayThucHien" noStyle>
              <DatePicker size="small" style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </LVCell>
          <LLCell>Ngày kết thúc</LLCell>
          <LVCell last>
            <Form.Item name="ngayKetThuc" noStyle>
              <DatePicker size="small" style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </LVCell>

          <LLCell>Ngày phát lệnh</LLCell>
          <LVCell span={3} last>
            <Form.Item name="ngayPhatLenh" noStyle>
              <DatePicker size="small" style={{ width: 180 }} format="DD/MM/YYYY" />
            </Form.Item>
          </LVCell>

        </div>

        {/* Chú ý + Ghi chú */}
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
          <LLCell>Chú ý</LLCell>
          <LVCell last>
            <Form.Item name="chuY" noStyle>
              <Input.TextArea rows={2} style={{ width: '100%', resize: 'none' }} />
            </Form.Item>
          </LVCell>
          <LLCell style={{ borderBottom: 'none' }}>Ghi chú</LLCell>
          <LVCell last style={{ borderBottom: 'none' }}>
            <Form.Item name="ghiChu" noStyle>
              <Input.TextArea rows={2} style={{ width: '100%', resize: 'none' }} />
            </Form.Item>
          </LVCell>
        </div>
      </Form>
    </Modal>
  )
}

// ── Detail Modal (double-click row) ──────────────────────────────────────────
function LenhDetailModal({ open, record, onClose, onSaved }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const defaultRnd = useMemo(() => {
    const w = Math.min(window.innerWidth * 0.72, 860)
    const h = Math.min(window.innerHeight * 0.82, 680)
    return { x: Math.max(20, (window.innerWidth - w) / 2), y: 40, width: w, height: h }
  }, [])
  const [rnd, setRnd] = useState(defaultRnd)

  useEffect(() => {
    if (!open || !record) return
    form.setFieldsValue({
      tenSanPham:     record.tenSanPham     || '',
      maBravo:        record.maBravo        || '',
      maSp:           record.maSp           || '',
      soLo:           record.soLo           || '',
      maDonHang:      record.maDonHang      || '',
      soLuong:        record.soLuong        ?? null,
      ngayThucHien:   record.ngayThucHien   ? dayjs(record.ngayThucHien)  : null,
      ngayKetThuc:    record.ngayKetThuc    ? dayjs(record.ngayKetThuc)   : null,
      ngayPhatLenh:   record.ngayPhatLenh   ? dayjs(record.ngayPhatLenh)  : null,
      toThucHien:     record.toThucHien     || null,
      phongThucHien:  record.phongThucHien  || '',
      tinhTrang:      record.tinhTrang      || null,
      chuY:           record.chuY           || '',
    })
  }, [open, record, form])

  const handleSave = async () => {
    let values
    try { values = await form.validateFields() } catch { return }
    setSaving(true)
    try {
      if (record.isFromKhoach) {
        const soLoVal = (values.soLo || '').trim()
        if (!soLoVal) { message.warning('Vui lòng nhập số lô'); setSaving(false); return }
        await api.post(`/lenh-san-xuat/from-work-schedule/${record.workScheduleId}`, { soLo: soLoVal })
        message.success('Đã tạo lệnh sản xuất')
      } else {
        const payload = {
          ...values,
          ngayThucHien:  values.ngayThucHien  ? values.ngayThucHien.format('YYYY-MM-DD')  : null,
          ngayKetThuc:   values.ngayKetThuc   ? values.ngayKetThuc.format('YYYY-MM-DD')   : null,
          ngayPhatLenh:  values.ngayPhatLenh  ? values.ngayPhatLenh.format('YYYY-MM-DD')  : null,
        }
        await api.put(`/lenh-san-xuat/${record.id}`, payload)
        message.success('Đã cập nhật lệnh sản xuất')
      }
      onSaved()
      onClose()
    } catch { message.error(record.isFromKhoach ? 'Tạo lệnh thất bại' : 'Lưu thất bại') }
    finally { setSaving(false) }
  }

  if (!open || !record) return null

  const LCell = ({ children }) => (
    <div style={{ padding: '7px 10px', background: '#f1f5f9', fontWeight: 600, fontSize: 12,
      color: '#64748b', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
      display: 'flex', alignItems: 'center' }}>
      {children}
    </div>
  )
  const VCell = ({ children, last, span }) => (
    <div style={{ padding: '5px 8px', borderBottom: '1px solid #e2e8f0',
      ...(last ? {} : { borderRight: '1px solid #e2e8f0' }),
      ...(span ? { gridColumn: `span ${span}` } : {}),
      display: 'flex', alignItems: 'center' }}>
      {children}
    </div>
  )

  const numFmt = {
    formatter: v => v ? Number(v).toLocaleString('vi-VN') : '',
    parser:    v => v ? v.replace(/[^\d]/g, '') : '',
  }

  return (
    <Modal open={open} onCancel={onClose} footer={null} title={null}
      width="100%" destroyOnHidden
      styles={{ body: { padding: 0 }, wrapper: { pointerEvents: 'none' } }}
      style={{ top: 0, padding: 0, margin: 0, maxWidth: 'none', pointerEvents: 'none' }}
      wrapClassName="lsx-detail-modal"
      modalRender={modal => (
        <Rnd
          size={{ width: rnd.width, height: rnd.height }}
          position={{ x: rnd.x, y: rnd.y }}
          onDragStop={(_, d) => setRnd(b => ({ ...b, x: d.x, y: d.y }))}
          onResizeStop={(_, __, ref, ___, pos) => setRnd({ width: ref.offsetWidth, height: ref.offsetHeight, x: pos.x, y: pos.y })}
          minWidth={560} minHeight={300}
          bounds="window"
          dragHandleClassName="lsx-modal-drag"
          style={{ pointerEvents: 'all', zIndex: 1000 }}
          enableResizing={{ bottom: true, right: true, bottomRight: true, left: true, bottomLeft: true, top: false, topLeft: false, topRight: false }}
        >
          {modal}
        </Rnd>
      )}
    >
      <style>{`
        .lsx-detail-modal { pointer-events: none !important; }
        .lsx-detail-modal .ant-modal { width: 100% !important; height: 100% !important; margin: 0 !important; top: 0 !important; padding: 0 !important; max-width: none !important; pointer-events: all; }
        .lsx-detail-modal .ant-modal-content { padding: 0 !important; border-radius: 10px !important; overflow: hidden; height: 100%; display: flex; flex-direction: column; box-shadow: 0 8px 40px rgba(0,0,0,0.28); }
        .lsx-detail-modal .ant-modal-body    { padding: 0 !important; flex: 1; overflow-y: auto; min-height: 0; }
        .lsx-detail-modal .ant-form-item     { margin-bottom: 0 !important; }
        .lsx-modal-drag                      { cursor: move; user-select: none; }
      `}</style>

      {/* Header */}
      <div className="lsx-modal-drag" style={{
        background: record.isFromKhoach
          ? 'linear-gradient(135deg, #065f46 0%, #0891b2 100%)'
          : 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
        padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <FileTextOutlined style={{ fontSize: 22, color: '#93c5fd' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {record.tenSanPham || 'Chi tiết Lệnh Sản Xuất'}
          </div>
          <div style={{ color: '#93c5fd', fontSize: 11, marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {record.maBravo   && <span>Bravo: <b style={{ color: '#bfdbfe' }}>{record.maBravo}</b></span>}
            {record.maSp      && <span>SP: <b style={{ color: '#bfdbfe' }}>{record.maSp}</b></span>}
            {record.soLo      && <span>Lô: <b style={{ color: '#c4b5fd' }}>{record.soLo}</b></span>}
            {record.maDonHang && <span>ĐH: <b style={{ color: '#c4b5fd' }}>{record.maDonHang}</b></span>}
          </div>
        </div>
        <Button type="text" icon={<CloseOutlined />} onClick={onClose}
          style={{ color: '#93c5fd', flexShrink: 0 }} />
      </div>

      {/* Status bar */}
      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '6px 18px', display: 'flex', gap: 16, alignItems: 'center' }}>
        {record.isFromKhoach
          ? <span style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: 11, padding: '2px 10px', borderRadius: 10, border: '1px solid #bae6fd' }}>📋 Chờ tạo lệnh — Nhập số lô để tạo</span>
          : record.daBanHanh
            ? <span style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 11, padding: '2px 10px', borderRadius: 10, border: '1px solid #bbf7d0' }}>✓ Đã phát hành</span>
            : <span style={{ background: '#fff3e0', color: '#e65100', fontWeight: 700, fontSize: 11, padding: '2px 10px', borderRadius: 10, border: '1px solid #ffcc80' }}>⌛ Chưa phát hành</span>
        }
        {record.tinhTrang === 'rat_gap' && <Tag color="red" style={{ margin: 0 }}>🔥 Rất Gấp</Tag>}
        {record.tinhTrang === 'gap'     && <Tag color="orange" style={{ margin: 0 }}>⚡ Gấp</Tag>}
        {record.hasKhoach && <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 700 }}>✓ Đã xếp kế hoạch</span>}
      </div>

      {/* Form body */}
      <Form form={form} component="div" autoComplete="off" style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 130px 1fr', border: '1px solid #e2e8f0', borderRadius: 7, overflow: 'hidden', marginBottom: 12 }}>
          <LCell>Tên Sản Phẩm</LCell>
          <VCell span={3} last>
            <Form.Item name="tenSanPham" noStyle>
              <Input size="small" style={{ fontSize: 13, width: '100%' }} />
            </Form.Item>
          </VCell>

          <LCell>Mã Bravo</LCell>
          <VCell>
            <Form.Item name="maBravo" noStyle>
              <Input size="small" style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7', fontSize: 13, width: '100%' }} />
            </Form.Item>
          </VCell>
          <LCell>Mã SP</LCell>
          <VCell last>
            <Form.Item name="maSp" noStyle>
              <Input size="small" style={{ color: '#1D4ED8', fontWeight: 600, fontSize: 13, width: '100%' }} />
            </Form.Item>
          </VCell>

          <LCell>Số Lô {record.isFromKhoach && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}</LCell>
          <VCell>
            <Form.Item name="soLo" noStyle>
              <Input
                size="small"
                placeholder={record.isFromKhoach ? 'Nhập số lô để tạo lệnh...' : ''}
                autoFocus={record.isFromKhoach}
                style={{
                  fontFamily: 'monospace', color: '#7c3aed', fontWeight: 700, fontSize: 13, width: '100%',
                  ...(record.isFromKhoach ? { borderColor: '#7c3aed', boxShadow: '0 0 0 2px rgba(124,58,237,0.15)' } : {}),
                }}
              />
            </Form.Item>
          </VCell>
          <LCell>Mã Đơn Hàng</LCell>
          <VCell last>
            <Form.Item name="maDonHang" noStyle>
              <Input size="small" style={{ fontFamily: 'monospace', color: '#0891b2', fontWeight: 600, fontSize: 13, width: '100%' }} />
            </Form.Item>
          </VCell>

          <LCell>Cỡ Lô</LCell>
          <VCell>
            <Form.Item name="soLuong" noStyle>
              <InputNumber size="small" style={{ width: '100%' }} min={0} {...numFmt} />
            </Form.Item>
          </VCell>
          <LCell>Tổ Thực Hiện</LCell>
          <VCell last>
            <Form.Item name="toThucHien" noStyle>
              <Select size="small" allowClear placeholder="Chọn tổ..." style={{ width: '100%' }}>
                {['PCPL1','PCPL2','PCPL3','BBC1','ĐG'].map(t => <Option key={t} value={t}>{t}</Option>)}
              </Select>
            </Form.Item>
          </VCell>

          <LCell>Ngày TH</LCell>
          <VCell>
            <Form.Item name="ngayThucHien" noStyle>
              <DatePicker size="small" format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
          </VCell>
          <LCell>Ngày Kết Thúc</LCell>
          <VCell last>
            <Form.Item name="ngayKetThuc" noStyle>
              <DatePicker size="small" format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
          </VCell>

          <LCell>Ngày Phát Lệnh</LCell>
          <VCell>
            <Form.Item name="ngayPhatLenh" noStyle>
              <DatePicker size="small" format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
          </VCell>
          <LCell>Tình Trạng</LCell>
          <VCell last>
            <Form.Item name="tinhTrang" noStyle>
              <Select size="small" allowClear placeholder="Chọn..." style={{ width: '100%' }}>
                <Option value="rat_gap">🔥 Rất Gấp</Option>
                <Option value="gap">⚡ Gấp</Option>
              </Select>
            </Form.Item>
          </VCell>

          <LCell>Phòng TH</LCell>
          <VCell>
            <Form.Item name="phongThucHien" noStyle>
              <Input size="small" style={{ fontSize: 12, width: '100%' }} />
            </Form.Item>
          </VCell>
          <LCell>Chú Ý</LCell>
          <VCell last>
            <Form.Item name="chuY" noStyle>
              <Input size="small" style={{ fontSize: 12, width: '100%' }} />
            </Form.Item>
          </VCell>
        </div>

        {/* Footer buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
          <Button onClick={onClose} size="small">Đóng</Button>
          <Button type="primary" icon={record.isFromKhoach ? <FileAddOutlined /> : <SaveOutlined />} size="small"
            loading={saving} onClick={handleSave}
            style={{ background: record.isFromKhoach ? '#0891b2' : '#1d4ed8', borderColor: record.isFromKhoach ? '#0891b2' : '#1d4ed8' }}>
            {record.isFromKhoach ? 'Tạo Lệnh' : 'Lưu thay đổi'}
          </Button>
        </div>
      </Form>
    </Modal>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LenhSanXuatTab() {
  // LenhSanXuat records (tabs PCPL1..ĐG + hoàn thiện)
  const [lenhData,     setLenhData]     = useState([])
  // WorkSchedule PLAN records chưa có LenhSanXuat (tab Chưa xếp)
  const [pendingData,  setPendingData]  = useState([])
  const [loading,      setLoading]      = useState(false)
  const [pendingLoad,  setPendingLoad]  = useState(false)

  const [activeTab,    setActiveTab]    = useState('chua_xep')
  const [searchText,   setSearchText]   = useState('')
  const [filterSoLo,   setFilterSoLo]   = useState('')
  const [filterTT,     setFilterTT]     = useState(null)
  const [filterFromPL, setFilterFromPL] = useState(null)
  const [filterToPL,   setFilterToPL]   = useState(null)
  const [quickDaLich,  setQuickDaLich]  = useState(false)
  const [quickDaDG,    setQuickDaDG]    = useState(false)
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editItem,     setEditItem]     = useState(null)
  const [actionId,     setActionId]     = useState(null)
  const [selectedKeys, setSelectedKeys] = useState([])
  const [bulkLoading,  setBulkLoading]  = useState(null) // 'banhanh' | 'lichsx' | 'delete'
  const [detailOpen,   setDetailOpen]   = useState(false)
  const [detailRecord, setDetailRecord] = useState(null)
  const [doiLoOpen,    setDoiLoOpen]    = useState(false)
  const [doiLoRecord,  setDoiLoRecord]  = useState(null)
  const [lichSuOpen,   setLichSuOpen]   = useState(false)
  const [lichSuRecord, setLichSuRecord] = useState(null)
  const [tableH, setTableH] = useState(500)
  const [loaiSpMap, setLoaiSpMap] = useState({}) // maSp → loaiSanPham
  const tableWrapRef = useRef(null)
  // useRef để lưu giá trị soLo — không gây re-render khi gõ, tránh input mất focus
  const soLoRef = useRef({})

  useEffect(() => {
    const calcH = () => {
      if (tableWrapRef.current) {
        const top = tableWrapRef.current.getBoundingClientRect().top
        setTableH(Math.max(300, window.innerHeight - top - 80))
      }
    }
    calcH()
    window.addEventListener('resize', calcH)
    return () => window.removeEventListener('resize', calcH)
  }, [])

  const [missingLichSxCount, setMissingLichSxCount] = useState(0)

  const fetchMissingCount = useCallback(async () => {
    try {
      const { data: res } = await api.get('/lenh-san-xuat/pending-sync-count')
      setMissingLichSxCount(res.count || 0)
    } catch { /* non-blocking */ }
  }, [])

  const fetchLenh = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/lenh-san-xuat')
      setLenhData(Array.isArray(res) ? res : [])
      // Kích hoạt reminder nếu có lệnh chưa phát hành (fire-and-forget, tối đa 1 lần/ngày)
      api.post('/lenh-san-xuat/check-reminder').catch(() => {})
    } catch {
      message.error('Không thể tải danh sách lệnh sản xuất')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPending = useCallback(async () => {
    setPendingLoad(true)
    try {
      const { data: res } = await api.get('/lenh-san-xuat/chua-co-lenh')
      setPendingData(Array.isArray(res) ? res : [])
    } catch {
      message.error('Không thể tải danh sách kế hoạch chưa có lệnh')
    } finally {
      setPendingLoad(false)
    }
  }, [])

  const fetchAll = useCallback(() => {
    fetchLenh()
    fetchPending()
    fetchMissingCount()
  }, [fetchLenh, fetchPending, fetchMissingCount])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Load loaiSanPham từ ProductMaster theo maSp
  useEffect(() => {
    const allRows = [...lenhData, ...pendingData]
    const codes = [...new Set(allRows.filter(r => r.maSp).map(r => r.maSp))]
    if (!codes.length) return
    api.get('/product-master/lookup-batch', { params: { codes } })
      .then(({ data: batchMap }) => {
        const m = {}
        codes.forEach(sp => { if (batchMap[sp]?.loaiSanPham) m[sp] = batchMap[sp].loaiSanPham })
        setLoaiSpMap(m)
      })
      .catch(() => {})
  }, [lenhData, pendingData])

  // ── Tab counts ─────────────────────────────────────────────────────────────
  const tabCounts = useMemo(() => {
    const c = { chua_xep: pendingData.length, hoan_thien: 0 }
    TO_LIST.forEach(t => { c[t] = 0 })
    lenhData.forEach(r => {
      if (r.daBanHanh) c.hoan_thien++
      else if (r.soLo && r.toThucHien && c[r.toThucHien] !== undefined) c[r.toThucHien]++
    })
    return c
  }, [lenhData, pendingData])

  // ── Filter helper ──────────────────────────────────────────────────────────
  const applySearch = (list) => {
    let out = list
    if (filterTT) out = out.filter(r => r.tinhTrang === filterTT)
    if (filterSoLo.trim()) {
      const q = filterSoLo.trim().toLowerCase()
      out = out.filter(r => (r.soLo || '').toLowerCase().includes(q))
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      out = out.filter(r =>
        (r.maBravo    || '').toLowerCase().includes(q) ||
        (r.maSp       || '').toLowerCase().includes(q) ||
        (r.tenSanPham || '').toLowerCase().includes(q) ||
        (r.maDonHang  || '').toLowerCase().includes(q)
      )
    }
    return out
  }

  // ── Rows for current tab ───────────────────────────────────────────────────
  const rows = useMemo(() => {
    if (activeTab === 'chua_xep') {
      return applySearch(pendingData)
    }
    let list = lenhData.filter(r =>
      activeTab === 'hoan_thien'
        ? r.daBanHanh === true
        : r.daBanHanh !== true && r.soLo && r.toThucHien === activeTab
    )
    if (filterFromPL) list = list.filter(r => r.ngayPhatLenh && r.ngayPhatLenh >= filterFromPL.format('YYYY-MM-DD'))
    if (filterToPL)   list = list.filter(r => r.ngayPhatLenh && r.ngayPhatLenh <= filterToPL.format('YYYY-MM-DD'))
    if (quickDaLich)  list = list.filter(r => r.daLenLichLam)
    if (quickDaDG)    list = list.filter(r => r.daDgVaXepLichDg)
    return applySearch(list)
  }, [lenhData, pendingData, activeTab, filterFromPL, filterToPL, filterTT, quickDaLich, quickDaDG, filterSoLo, searchText])

  // ── Quick-filter counts ────────────────────────────────────────────────────
  const baseList = useMemo(() => {
    if (activeTab === 'chua_xep') return pendingData
    let list = lenhData.filter(r =>
      activeTab === 'hoan_thien'
        ? r.daBanHanh === true
        : r.daBanHanh !== true && r.soLo && r.toThucHien === activeTab
    )
    if (filterFromPL) list = list.filter(r => r.ngayPhatLenh && r.ngayPhatLenh >= filterFromPL.format('YYYY-MM-DD'))
    if (filterToPL)   list = list.filter(r => r.ngayPhatLenh && r.ngayPhatLenh <= filterToPL.format('YYYY-MM-DD'))
    return list
  }, [lenhData, pendingData, activeTab, filterFromPL, filterToPL])

  const cntRatGap = useMemo(() => baseList.filter(r => r.tinhTrang === 'rat_gap').length, [baseList])
  const cntGap    = useMemo(() => baseList.filter(r => r.tinhTrang === 'gap').length,     [baseList])
  const cntDaLich = useMemo(() => baseList.filter(r => r.daLenLichLam).length,            [baseList])
  const cntDaDG   = useMemo(() => baseList.filter(r => r.daDgVaXepLichDg).length,         [baseList])

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleBanHanh = async (record) => {
    setActionId(record.id)
    try {
      await api.put(`/lenh-san-xuat/${record.id}`, { ...record, daBanHanh: true })
      message.success('Đã phát hành lệnh')
      await fetchLenh()
    } catch (err) {
      message.error(err?.response?.data?.message || 'Phát hành thất bại')
    } finally {
      setActionId(null)
    }
  }

  const handleTaoLenh = async (record) => {
    const soLo = (soLoRef.current[record.workScheduleId] || '').trim()
    if (!soLo) {
      message.warning('Vui lòng nhập số lô trước khi tạo lệnh')
      return
    }
    setActionId(record.workScheduleId)
    try {
      await api.post(`/lenh-san-xuat/from-work-schedule/${record.workScheduleId}`, { soLo })
      message.success('Đã tạo lệnh sản xuất')
      delete soLoRef.current[record.workScheduleId]
      await fetchAll()
    } catch (err) {
      message.error(err?.response?.data?.message || 'Tạo lệnh thất bại')
    } finally {
      setActionId(null)
    }
  }

  // Lấy danh sách numeric ID từ selectedKeys (chỉ lấy l-{id}, bỏ ws-{id})
  const selectedIds = selectedKeys
    .filter(k => typeof k === 'string' && k.startsWith('l-'))
    .map(k => Number(k.replace('l-', '')))
    .filter(Boolean)

  const handleBulkBanHanh = async () => {
    if (!selectedIds.length) { message.warning('Chưa có lệnh nào được chọn'); return }
    setBulkLoading('banhanh')
    try {
      const { data: r } = await api.post('/lenh-san-xuat/ban-hanh/bulk', selectedIds)
      message.success(`Đã ban hành ${r.updated} lệnh`)
      setSelectedKeys([])
      await fetchLenh()
    } catch { message.error('Ban hành hàng loạt thất bại') }
    finally { setBulkLoading(null) }
  }

  const handleBulkLichSX = async () => {
    if (!selectedIds.length) { message.warning('Chưa có lệnh nào được chọn'); return }
    setBulkLoading('lichsx')
    try {
      const { data: r } = await api.post('/lenh-san-xuat/sync-lich-sx/bulk', selectedIds)
      message.success(`Đã tạo ${r.created} bản ghi Lịch SX còn thiếu`)
      setSelectedKeys([])
    } catch { message.error('Đồng bộ Lịch SX thất bại') }
    finally { setBulkLoading(null) }
  }

  const handleBulkDelete = async () => {
    if (!selectedIds.length) { message.warning('Chưa có lệnh nào được chọn'); return }
    setBulkLoading('delete')
    try {
      const { data: r } = await api.delete('/lenh-san-xuat/bulk', { data: selectedIds })
      message.success(`Đã xóa ${r.deleted} lệnh`)
      setSelectedKeys([])
      await fetchLenh()
    } catch { message.error('Xóa hàng loạt thất bại') }
    finally { setBulkLoading(null) }
  }

  const reset = () => {
    setSearchText(''); setFilterSoLo(''); setFilterTT(null)
    setFilterFromPL(null); setFilterToPL(null)
    setQuickDaLich(false); setQuickDaDG(false); setSelectedKeys([])
  }

  // ── Shared column definitions ──────────────────────────────────────────────
  const baseColumns = [
    {
      title: '#', width: 44, align: 'center',
      render: (_, __, i) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{i + 1}</span>,
    },
    {
      title: 'PHÁT HÀNH', dataIndex: 'daBanHanh', width: 140,
      render: (v, r) => {
        if (r.isFromKhoach)
          return <span style={{ background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, fontSize: 11, padding: '2px 8px', borderRadius: 4, display: 'inline-block' }}>📋 Chờ tạo lệnh</span>
        return v
          ? <span style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 11, padding: '2px 8px', borderRadius: 4, display: 'inline-block' }}>✓ Đã phát hành</span>
          : <span style={{ background: '#fff3e0', color: '#e65100', fontWeight: 700, fontSize: 11, padding: '2px 8px', borderRadius: 4, display: 'inline-block' }}>⌛ Chưa phát hành</span>
      },
    },
    {
      title: 'NGÀY TH', dataIndex: 'ngayThucHien', width: 96,
      render: (v, r) => {
        if (!v) return <span style={{ color: '#d1d5db' }}>—</span>
        const d = dayjs(v)
        const hasSuffix = r.ngayKetThuc && r.ngayKetThuc !== v
        return (
          <Tooltip title={hasSuffix ? `${d.format('DD/MM/YYYY')} → ${dayjs(r.ngayKetThuc).format('DD/MM/YYYY')}` : undefined}>
            <span style={{ fontWeight: 700, color: '#0f766e', fontSize: 12, lineHeight: 1.3 }}>
              {d.format('DD/MM')}<br />
              <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 11 }}>{d.format('YYYY')}</span>
            </span>
          </Tooltip>
        )
      },
    },
    {
      title: 'NGÀY PHÁT LỆNH', dataIndex: 'ngayPhatLenh', width: 108,
      render: (v) => v
        ? <span style={{ fontWeight: 700, color: '#7c3aed', fontSize: 12, lineHeight: 1.3 }}>
            {dayjs(v).format('DD/MM')}<br /><span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 11 }}>{dayjs(v).format('YYYY')}</span>
          </span>
        : <span style={{ color: '#d1d5db' }}>—</span>,
    },
    {
      title: 'MÃ BRAVO', dataIndex: 'maBravo', width: 110,
      render: (v) => v
        ? <span style={{ fontFamily: 'monospace', color: '#0284c7', fontWeight: 700, fontSize: 12 }}>{v}</span>
        : <span style={{ color: '#d1d5db' }}>—</span>,
    },
    {
      title: 'MÃ SP', dataIndex: 'maSp', width: 76,
      render: (v) => v ? <Tag color="default" style={{ fontWeight: 600, fontSize: 11 }}>{v}</Tag> : '—',
    },
    {
      title: 'LOẠI SP', key: 'loaiSp', width: 120,
      render: (_, r) => {
        const loai = loaiSpMap[r.maSp]
        return loai ? <Tag color="purple" style={{ marginRight: 0, fontSize: 11 }}>{loai}</Tag> : <span style={{ color: '#d1d5db' }}>—</span>
      },
    },
    {
      title: 'TÊN SẢN PHẨM', dataIndex: 'tenSanPham', width: 280,
      render: (v, r) => (
        <Tooltip title={`${v || ''}${r.chuY ? ' ⚠ ' + r.chuY : ''}`}>
          <span style={{ fontWeight: 500, fontSize: 12 }}>
            {v || '—'}
            {r.chuY && <span style={{ color: '#ef4444', marginLeft: 4, fontSize: 11 }}>⚠</span>}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'SỐ LÔ', dataIndex: 'soLo', width: 120,
      render: (v, r) => {
        if (r.isFromKhoach) {
          return (
            <SoLoInputCell
              key={r.workScheduleId}
              workScheduleId={r.workScheduleId}
              valRef={soLoRef}
              onPressEnter={() => handleTaoLenh(r)}
            />
          )
        }
        if (!v) return <span style={{ color: '#d1d5db' }}>—</span>
        return (
          <div style={{ fontFamily: 'monospace', lineHeight: 1.4 }}>
            {r.soLoCu && (
              <div style={{ fontSize: 10, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 3 }}>
                <del>{r.soLoCu}</del>
                <span>→</span>
              </div>
            )}
            <span style={{ color: '#7c3aed', fontWeight: 700, fontSize: 12 }}>{v}</span>
          </div>
        )
      },
    },
    {
      title: 'MÃ ĐƠN HÀNG', dataIndex: 'maDonHang', width: 120,
      render: (v) => v
        ? <span style={{ color: '#0891b2', fontWeight: 600, fontSize: 12 }}>{v}</span>
        : <span style={{ color: '#d1d5db' }}>—</span>,
    },
    {
      title: 'KẾ HOẠCH', dataIndex: 'hasKhoach', width: 96, align: 'center',
      render: (v, r) => {
        if (r.daBanHanh) return <span style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 11, padding: '2px 8px', borderRadius: 4, display: 'inline-block' }}>✓ Hoàn thành</span>
        if (v) return <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 700 }}>✓ Đã xếp</span>
        return <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>
      },
    },
    {
      title: 'CỠ LÔ', dataIndex: 'soLuong', width: 88, align: 'right',
      render: (v) => <span style={{ fontWeight: 700, color: '#1e4570', fontSize: 12 }}>{fmtNum(v)}</span>,
    },
    {
      title: 'TÌNH TRẠNG', dataIndex: 'tinhTrang', width: 100, align: 'center',
      render: (v, r) => {
        if (v === 'rat_gap') return <Tag color="red"    style={{ fontSize: 11 }}>Rất gấp</Tag>
        if (v === 'gap')     return <Tag color="orange" style={{ fontSize: 11 }}>Gấp</Tag>
        if (r.daBanHanh)     return <Tag color="green"  style={{ fontSize: 11 }}>Hoàn thành</Tag>
        return <span style={{ color: '#d1d5db' }}>—</span>
      },
    },
    {
      title: 'PHÒNG TH', dataIndex: 'phongThucHien', width: 86,
      render: (v) => v ? <span style={{ fontSize: 11 }}>{v}</span> : <span style={{ color: '#d1d5db' }}>—</span>,
    },
    {
      title: 'TỔ TH', dataIndex: 'toThucHien', width: 76,
      render: (v) => v
        ? <Tag color={TO_COLOR[v] || 'default'} style={{ fontWeight: 700, fontSize: 11 }}>{v}</Tag>
        : <span style={{ color: '#d1d5db' }}>—</span>,
    },
    {
      title: '', key: 'act', width: 152, align: 'center', fixed: 'right',
      render: (_, r) => {
        if (r.isFromKhoach) {
          return (
            <Button
              size="small" type="primary" icon={<FileAddOutlined />}
              loading={actionId === r.workScheduleId}
              onClick={() => handleTaoLenh(r)}
              style={{ background: '#0891b2', borderColor: '#0891b2', fontSize: 11 }}
            >
              Tạo lệnh
            </Button>
          )
        }
        if (r.daBanHanh) {
          return (
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                size="small" icon={<SwapOutlined />}
                onClick={() => { setDoiLoRecord(r); setDoiLoOpen(true) }}
                style={{ fontSize: 10, borderColor: '#7c3aed', color: '#7c3aed', padding: '0 6px' }}
              >
                Đổi lô
              </Button>
              <Button
                size="small" icon={<EditOutlined />}
                onClick={() => { setEditItem(r); setModalOpen(true) }}
                style={{ fontSize: 10, padding: '0 6px' }}
              >
                Cập nhật
              </Button>
              <Tooltip title={r.soLoCu ? 'Xem lịch sử đổi lô' : 'Chưa có lịch sử đổi lô'}>
                <Button
                  size="small" type="text" icon={<HistoryOutlined />}
                  onClick={() => { setLichSuRecord(r); setLichSuOpen(true) }}
                  style={{ color: r.soLoCu ? '#7c3aed' : '#cbd5e1', padding: '0 4px' }}
                />
              </Tooltip>
            </div>
          )
        }
        return (
          <Button
            size="small" type="primary" icon={<CheckOutlined />}
            loading={actionId === r.id}
            onClick={() => handleBanHanh(r)}
            style={{ background: '#1e4570', borderColor: '#1e4570', fontSize: 11 }}
          >
            Ban hành
          </Button>
        )
      },
    },
  ]

  // ── Sub-tabs ───────────────────────────────────────────────────────────────
  const subTabs = [
    { key: 'chua_xep',   label: `Chưa xếp (${tabCounts.chua_xep})`,                  warn: false },
    ...TO_LIST.map(t => ({ key: t, label: `${t} (${tabCounts[t]})`,                   warn: tabCounts[t] > 0 })),
    { key: 'hoan_thien', label: `Lệnh đã hoàn thiện (${tabCounts.hoan_thien})`,       warn: false },
  ]

  const isLoading = loading || pendingLoad

  return (
    <div>
      <style>{`
        .lsx-tab-table .ant-table-thead > tr > th {
          background: #1e3a5f !important; color: #fff !important;
          font-weight: 700; font-size: 11px; padding: 7px 8px; white-space: nowrap;
        }
        .lsx-tab-table .ant-table-thead > tr > th::before { display: none !important; }
        .lsx-tab-table .ant-table-tbody > tr > td { font-size: 12px; padding: 5px 8px; }
        .lsx-tab-table .ant-table-tbody > tr:hover > td { background: #eff6ff !important; }
        .lsx-tab-table tr.ant-table-row-selected > td { background: #dbeafe !important; }
        .lsx-tab-table tr.lsx-row-pending > td { background: rgba(255,153,0,0.10) !important; }
        .lsx-tab-table tr.lsx-row-pending > td:first-child { border-left: 3px solid #FF9900 !important; }
        .lsx-tab-table tr.lsx-row-pending:hover > td { background: rgba(255,153,0,0.18) !important; }
      `}</style>

      {/* ── Sticky control bar ── */}
      <div style={{
        position: 'sticky', top: 50, zIndex: 20,
        background: '#fff', borderBottom: '1px solid #e2e8f0',
      }}>
        {/* Filter row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: '8px 0 6px' }}>
          <DatePicker
            placeholder="Từ ngày PL" size="small" format="DD/MM/YYYY"
            value={filterFromPL} onChange={setFilterFromPL}
            style={{ width: 128 }} allowClear
            disabled={activeTab === 'chua_xep'}
          />
          <span style={{ color: '#94a3b8', fontSize: 12 }}>→</span>
          <DatePicker
            placeholder="Đến ngày PL" size="small" format="DD/MM/YYYY"
            value={filterToPL} onChange={setFilterToPL}
            style={{ width: 128 }} allowClear
            disabled={activeTab === 'chua_xep'}
          />
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Mã SP / Bravo / Tên / ĐH..."
            value={searchText} onChange={e => setSearchText(e.target.value)}
            allowClear size="small" style={{ width: 210 }}
          />
          <Input
            placeholder="Số lô" value={filterSoLo}
            onChange={e => setFilterSoLo(e.target.value)}
            allowClear size="small" style={{ width: 110 }}
          />
          <Select
            placeholder="Tình trạng" value={filterTT} onChange={setFilterTT}
            allowClear size="small" style={{ width: 120 }}
          >
            <Option value="rat_gap">Rất gấp</Option>
            <Option value="gap">Gấp</Option>
          </Select>
          <span onClick={reset} style={{ cursor: 'pointer', color: '#6b7280', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}>
            <ReloadOutlined /> Reset
          </span>

          <span style={{ width: 1, height: 18, background: '#e5e7eb', margin: '0 4px' }} />

          <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700, padding: '2px 7px', borderRadius: 4, border: '1px solid #fca5a5', background: '#fff5f5' }}>
            Rất Gấp {cntRatGap}
          </span>
          <span style={{ fontSize: 11, color: '#d97706', fontWeight: 700, padding: '2px 7px', borderRadius: 4, border: '1px solid #fcd34d', background: '#fffbeb' }}>
            Gấp {cntGap}
          </span>
          <span
            onClick={() => setQuickDaLich(v => !v)}
            style={{ cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, border: `1px solid ${quickDaLich ? '#3b82f6' : '#e5e7eb'}`, background: quickDaLich ? '#eff6ff' : '#fff', color: quickDaLich ? '#2563eb' : '#6b7280' }}
          >
            Đã lịch {cntDaLich}
          </span>
          <span
            onClick={() => setQuickDaDG(v => !v)}
            style={{ cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, border: `1px solid ${quickDaDG ? '#8b5cf6' : '#e5e7eb'}`, background: quickDaDG ? '#f5f3ff' : '#fff', color: quickDaDG ? '#7c3aed' : '#6b7280' }}
          >
            Đã ĐG {cntDaDG}
          </span>

          <span style={{ flex: 1 }} />

          <Button
            icon={<SyncOutlined />} size="small"
            onClick={async () => {
              try {
                const { data: r } = await api.post('/lenh-san-xuat/sync-san-luong')
                message.success(`Đã đồng bộ ${r.created} lệnh`)
                fetchAll()
              } catch { message.error('Đồng bộ thất bại') }
            }}
            style={{ fontSize: 11 }}
          >
            Đồng bộ SL
          </Button>
          <Badge count={missingLichSxCount} size="small" offset={[-4, 4]}>
            <Button
              icon={<SyncOutlined />} size="small"
              onClick={async () => {
                try {
                  const { data: r } = await api.post('/lenh-san-xuat/sync-lich-sx')
                  message.success(`Đã tạo ${r.created} bản ghi Lịch SX còn thiếu`)
                  setMissingLichSxCount(0)
                  fetchAll()
                } catch { message.error('Đồng bộ Lịch SX thất bại') }
              }}
              style={{ fontSize: 11 }}
            >
              Đồng bộ Lịch SX
            </Button>
          </Badge>
          <Button
            type="primary" icon={<PlusOutlined />} size="small"
            onClick={() => { setEditItem(null); setModalOpen(true) }}
            style={{ background: '#1e4570', borderColor: '#1e4570', fontSize: 11 }}
          >
            Thêm lệnh
          </Button>
          <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 4 }}>
            {rows.length} lệnh
          </span>
        </div>

        {/* Sub-tab bar */}
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', borderTop: '1px solid #e2e8f0' }}>
          {subTabs.map(t => {
            const isActive = activeTab === t.key
            const warnColor   = '#ea580c'
            const warnBg      = '#fff7ed'
            const warnBorder  = '#fb923c'
            return (
              <div
                key={t.key}
                onClick={() => { setActiveTab(t.key); setSelectedKeys([]) }}
                style={{
                  padding: '8px 14px',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: isActive ? 700 : (t.warn ? 700 : 400),
                  color: isActive ? '#fff' : (t.warn ? warnColor : '#64748b'),
                  background: isActive ? (t.warn ? warnColor : '#1e3a5f') : (t.warn ? warnBg : 'transparent'),
                  borderBottom: isActive
                    ? `2px solid ${t.warn ? warnColor : '#1e3a5f'}`
                    : t.warn ? `2px solid ${warnBorder}` : '2px solid transparent',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                  borderRadius: isActive ? '4px 4px 0 0' : 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {t.warn && !isActive && <span style={{ fontSize: 11 }}>⚠</span>}
                {t.label}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Table ── */}
      <div ref={tableWrapRef}>
      <SkeletonTable
        className="lsx-tab-table"
        rowKey={r => r.isFromKhoach ? `ws-${r.workScheduleId}` : `l-${r.id}`}
        dataSource={rows}
        columns={baseColumns}
        loading={isLoading}
        size="small"
        scroll={{ x: 1620, y: tableH }}
        onRow={r => ({
          onDoubleClick: () => { setDetailRecord(r); setDetailOpen(true) },
          style: { cursor: 'pointer' },
        })}
        rowClassName={r => (!r.isFromKhoach && r.daBanHanh === false && r.soLo) ? 'lsx-row-pending' : ''}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: setSelectedKeys,
          selections: [
            {
              key: 'select-all-pages',
              text: 'Chọn tất cả trang',
              onSelect: () => {
                const allKeys = rows.map(r => r.isFromKhoach ? `ws-${r.workScheduleId}` : `l-${r.id}`)
                setSelectedKeys(allKeys)
              },
            },
            { key: 'deselect-all', text: 'Bỏ chọn tất cả', onSelect: () => setSelectedKeys([]) },
          ],
        }}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          pageSizeOptions: ['50', '100', '200'],
          showTotal: (t) => `Tổng ${t} lệnh`,
        }}
      />
      </div>

      <DoiLoModal
        open={doiLoOpen}
        record={doiLoRecord}
        onClose={() => setDoiLoOpen(false)}
        onSaved={fetchAll}
      />

      <LichSuDoiLoModal
        open={lichSuOpen}
        record={lichSuRecord}
        onClose={() => setLichSuOpen(false)}
      />

      <LenhDetailModal
        open={detailOpen}
        record={detailRecord}
        onClose={() => setDetailOpen(false)}
        onSaved={fetchAll}
      />

      <LenhModal
        open={modalOpen}
        editItem={editItem}
        onClose={() => { setModalOpen(false); setEditItem(null) }}
        onSaved={fetchAll}
      />

      {/* ── Bulk action bar ── */}
      {selectedKeys.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000,
          background: '#1e3a5f', color: '#fff',
          borderRadius: 10, padding: '10px 20px',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, marginRight: 4 }}>
            Đã chọn {selectedKeys.length} lệnh
          </span>
          <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.3)' }} />
          {activeTab !== 'chua_xep' && activeTab !== 'hoan_thien' && (
            <Button
              size="small" icon={<CheckOutlined />}
              loading={bulkLoading === 'banhanh'}
              onClick={handleBulkBanHanh}
              style={{ background: '#16a34a', borderColor: '#16a34a', color: '#fff', fontSize: 12 }}
            >
              Ban hành ({selectedIds.length})
            </Button>
          )}
          <Button
            size="small" icon={<SyncOutlined />}
            loading={bulkLoading === 'lichsx'}
            onClick={handleBulkLichSX}
            style={{ background: '#0891b2', borderColor: '#0891b2', color: '#fff', fontSize: 12 }}
          >
            Đồng bộ Lịch SX ({selectedIds.length})
          </Button>
          <Button
            size="small" icon={<DeleteOutlined />}
            loading={bulkLoading === 'delete'}
            onClick={handleBulkDelete}
            danger
            style={{ fontSize: 12 }}
          >
            Xóa ({selectedIds.length})
          </Button>
          <Button
            size="small" type="text"
            onClick={() => setSelectedKeys([])}
            style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}
          >
            Bỏ chọn
          </Button>
        </div>
      )}
    </div>
  )
}
