import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Table, Input, Select, Tag, Tooltip, message, Button, Badge, Progress,
  Modal, Form, DatePicker, InputNumber, Divider, AutoComplete, Spin, Dropdown,
} from 'antd'
import { Rnd } from 'react-rnd'
import SkeletonTable from '../components/SkeletonTable'
import {
  PlusOutlined, SyncOutlined, SearchOutlined,
  ReloadOutlined, EditOutlined, CheckOutlined, FileAddOutlined,
  DeleteOutlined, ThunderboltOutlined, CloseOutlined,
  SaveOutlined, FileTextOutlined, SwapOutlined, HistoryOutlined,
  DownloadOutlined, FileExcelOutlined, FileImageOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import api from '../api/axios'
import * as XLSX from 'xlsx'
import { toPng } from 'html-to-image'
import { useAuth } from '../context/AuthContext'

dayjs.extend(isoWeek)

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
  const { user } = useAuth()
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
  const [loaiSpMap,        setLoaiSpMap]        = useState({}) // maSp → { loaiSanPham, khoiLuong, mayMocPc, ... }
  const [employeeCounts,   setEmployeeCounts]   = useState({})
  const [phanTichSubTab,   setPhanTichSubTab]   = useState('cong')
  const [phanTichPeriod,   setPhanTichPeriod]   = useState('month')
  const [exportLoading,    setExportLoading]    = useState(false)
  const tableWrapRef  = useRef(null)
  const phanTichRef   = useRef(null)
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
    if (activeTab === 'phan_tich') loadEmployeeCounts()
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load ProductMaster fields (loaiSanPham, khoiLuong, mayMoc, nangSuat) theo maSp
  useEffect(() => {
    const allRows = [...lenhData, ...pendingData]
    const codes = [...new Set(allRows.filter(r => r.maSp).map(r => r.maSp))]
    if (!codes.length) return
    api.get('/product-master/lookup-batch', { params: { codes } })
      .then(({ data: batchMap }) => {
        const m = {}
        codes.forEach(sp => { if (batchMap[sp]) m[sp] = batchMap[sp] })
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
    if (activeTab === 'phan_tich') return lenhData
    if (activeTab === 'tat_ca') {
      let list = [...pendingData, ...lenhData]
      if (filterFromPL) list = list.filter(r => r.ngayPhatLenh && r.ngayPhatLenh >= filterFromPL.format('YYYY-MM-DD'))
      if (filterToPL)   list = list.filter(r => r.ngayPhatLenh && r.ngayPhatLenh <= filterToPL.format('YYYY-MM-DD'))
      return applySearch(list)
    }
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
    if (activeTab === 'phan_tich') return lenhData
    if (activeTab === 'tat_ca') return [...pendingData, ...lenhData]
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
  // ── Export helpers ───────────────────────────────────────────────────────────
  const exportMainExcel = useCallback(() => {
    const colDefs = [
      ['Phát hành', r => r.isFromKhoach ? 'Chờ tạo lệnh' : r.daBanHanh ? 'Đã phát hành' : 'Chưa phát hành'],
      ['Ngày TH', r => r.ngayThucHien ? dayjs(r.ngayThucHien).format('DD/MM/YYYY') : ''],
      ['Ngày PL', r => r.ngayPhatLenh ? dayjs(r.ngayPhatLenh).format('DD/MM/YYYY') : ''],
      ['Mã Bravo', r => r.maBravo || ''],
      ['Mã SP', r => r.maSp || ''],
      ['Loại SP', r => loaiSpMap[r.maSp]?.loaiSanPham || ''],
      ['Tên sản phẩm', r => r.tenSanPham || ''],
      ['Số lô', r => r.soLo || ''],
      ['Mã đơn hàng', r => r.maDonHang || ''],
      ['Cỡ lô', r => r.soLuong != null ? Number(r.soLuong) : ''],
      ['Tình trạng', r => {
        if (r.tinhTrang === 'rat_gap') return 'Rất gấp'
        if (r.tinhTrang === 'gap') return 'Gấp'
        if (r.daBanHanh) return 'Hoàn thành'
        return ''
      }],
      ['Phòng TH', r => r.phongThucHien || ''],
      ['Tổ TH', r => r.toThucHien || ''],
    ]
    if (activeTab === 'tat_ca') {
      colDefs.push(
        ['KL/ĐV (G)', r => loaiSpMap[r.maSp]?.khoiLuong != null ? Number(loaiSpMap[r.maSp].khoiLuong) : ''],
        ['NS TB (ĐG)', r => { const v = Number(loaiSpMap[r.maSp]?.nangSuatDg); return v > 1 ? v : '' }],
        ['NS PC', r => { const v = Number(loaiSpMap[r.maSp]?.nangSuatPc); return v > 1 ? v : '' }],
        ['NS PL', r => { const v = Number(loaiSpMap[r.maSp]?.nangSuatPl); return v > 1 ? v : '' }],
        ['NS BBC1', r => { const v = Number(loaiSpMap[r.maSp]?.nangSuatBbc1); return v > 1 ? v : '' }],
        ['Máy móc PC', r => loaiSpMap[r.maSp]?.mayMocPc || ''],
        ['Máy móc PL', r => loaiSpMap[r.maSp]?.mayMocPl || ''],
        ['Máy móc BBC1', r => loaiSpMap[r.maSp]?.mayMocBbc1 || ''],
        ['Máy móc ĐG', r => loaiSpMap[r.maSp]?.mayMocDg || ''],
      )
    }
    const header = colDefs.map(([h]) => h)
    const wsData = [header, ...rows.map(r => colDefs.map(([, fn]) => fn(r)))]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Lệnh SX')
    XLSX.writeFile(wb, `lenh-san-xuat-${dayjs().format('YYYYMMDD-HHmm')}.xlsx`)
  }, [rows, activeTab, loaiSpMap])

  const exportMainImage = useCallback(async () => {
    if (!tableWrapRef.current) return
    setExportLoading(true)
    try {
      const url = await toPng(tableWrapRef.current, { backgroundColor: '#fff', pixelRatio: 2 })
      const a = document.createElement('a')
      a.href = url; a.download = `lenh-san-xuat-${dayjs().format('YYYYMMDD-HHmm')}.png`; a.click()
    } catch { message.error('Xuất ảnh thất bại') }
    finally { setExportLoading(false) }
  }, [])

  const exportPhanTichExcel = useCallback((subTab, { congRows, typeRows, machineList, conflicts, orderAnalysis }) => {
    let aoa
    if (subTab === 'cong') {
      aoa = [
        ['Loại SP', 'Số TP', 'Công PCPL1', 'Công PCPL2', 'Công PL', 'Công ĐG', 'Công BBC1', 'Tổng Công'],
        ...(congRows || []).map(r => [r.loai, r.sku, +r.congPcpl1.toFixed(2), +r.congPcpl2.toFixed(2), +r.congPl.toFixed(2), +r.congDg.toFixed(2), +r.congBbc1.toFixed(2), +r.tongCong.toFixed(2)]),
      ]
    } else if (subTab === 'theo_loai') {
      aoa = [
        ['Loại SP', 'Số lệnh', 'Số SKU', 'Tổng SL', 'Tỉ lệ %', 'Công ĐG', 'Công PC', 'Công PL'],
        ...(typeRows || []).map(r => [r.loai, r.soLenh, r.sku, r.totalSl, +r.tyLe.toFixed(1), +r.congDg.toFixed(2), +r.congPc.toFixed(2), +r.congPl.toFixed(2)]),
      ]
    } else if (subTab === 'tai_may') {
      aoa = [
        ['Máy móc', 'Công đoạn', 'Số công (h)', 'Số lệnh'],
        ...(machineList || []).map(m => [m.machine, m.stageKey, +m.hours.toFixed(2), m.orders]),
      ]
    } else if (subTab === 'nut_that') {
      aoa = [
        ['Mã SP', 'Số lô', 'Tên SP', 'Công PC', 'Công PL', 'Công BBC1', 'Công ĐG', 'Tổng', 'Nút thắt'],
        ...(orderAnalysis || []).filter(r => r.bottleneck).map(r => [
          r.maSp, r.soLo, r.tenSanPham,
          r.tPc != null ? +r.tPc.toFixed(2) : '',
          r.tPl != null ? +r.tPl.toFixed(2) : '',
          r.tBbc != null ? +r.tBbc.toFixed(2) : '',
          r.tDg != null ? +r.tDg.toFixed(2) : '',
          +r.total.toFixed(2), r.bottleneck?.key || '',
        ]),
      ]
    } else if (subTab === 'xung_dot') {
      const xRows = []
      ;(conflicts || []).forEach(c => {
        c.orders.forEach((o, i) => {
          xRows.push([i === 0 ? c.machine : '', i === 0 ? c.stageKey : '', o.maSp, o.soLo, o.ten, +o.t.toFixed(2), i === 0 ? +c.totalH.toFixed(2) : ''])
        })
      })
      aoa = [['Máy móc', 'Công đoạn', 'Mã SP', 'Số lô', 'Tên SP', 'Công (h)', 'Tổng tải'], ...xRows]
    }
    if (!aoa) return
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, subTab)
    XLSX.writeFile(wb, `phan-tich-${subTab}-${dayjs().format('YYYYMMDD-HHmm')}.xlsx`)
  }, [])

  const exportPhanTichImage = useCallback(async () => {
    if (!phanTichRef.current) return
    setExportLoading(true)
    try {
      const url = await toPng(phanTichRef.current, { backgroundColor: '#fff', pixelRatio: 2 })
      const a = document.createElement('a')
      a.href = url; a.download = `phan-tich-${dayjs().format('YYYYMMDD-HHmm')}.png`; a.click()
    } catch { message.error('Xuất ảnh thất bại') }
    finally { setExportLoading(false) }
  }, [])

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
        const loai = loaiSpMap[r.maSp]?.loaiSanPham
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

  // ── Analytics columns (thêm vào tab Tất cả) ───────────────────────────────
  const fmtNS = v => v != null && Number(v) > 1 ? Number(v).toLocaleString('vi-VN') : null
  const analyticsColumns = [
    {
      title: 'KL/ĐV (G)', key: 'kl_dv', width: 88, align: 'right',
      render: (_, r) => {
        const v = loaiSpMap[r.maSp]?.khoiLuong
        return v ? <span style={{ fontWeight: 600, color: '#1e4570' }}>{Number(v).toLocaleString('vi-VN')}</span>
                 : <span style={{ color: '#d1d5db' }}>—</span>
      },
    },
    {
      title: 'NS TB (ĐG)', key: 'ns_dg', width: 96, align: 'right',
      render: (_, r) => {
        const v = fmtNS(loaiSpMap[r.maSp]?.nangSuatDg)
        return v ? <span style={{ fontWeight: 600, color: '#d48806' }}>{v}</span>
                 : <span style={{ color: '#d1d5db' }}>—</span>
      },
    },
    {
      title: 'NS PC (PHA CHẾ)', key: 'ns_pc', width: 120, align: 'right',
      render: (_, r) => {
        const v = fmtNS(loaiSpMap[r.maSp]?.nangSuatPc)
        return v ? <span style={{ fontWeight: 600, color: '#1d4ed8' }}>{v}</span>
                 : <span style={{ color: '#d1d5db' }}>—</span>
      },
    },
    {
      title: 'NS PL (PHÂN LIỀU)', key: 'ns_pl', width: 128, align: 'right',
      render: (_, r) => {
        const v = fmtNS(loaiSpMap[r.maSp]?.nangSuatPl)
        return v ? <span style={{ fontWeight: 600, color: '#7c3aed' }}>{v}</span>
                 : <span style={{ color: '#d1d5db' }}>—</span>
      },
    },
    {
      title: 'NS BBC1 (VS BBC1)', key: 'ns_bbc1', width: 130, align: 'right',
      render: (_, r) => {
        const v = fmtNS(loaiSpMap[r.maSp]?.nangSuatBbc1)
        return v ? <span style={{ fontWeight: 600, color: '#16a34a' }}>{v}</span>
                 : <span style={{ color: '#d1d5db' }}>—</span>
      },
    },
    {
      title: 'MÁY MÓC PC', key: 'mm_pc', width: 160, ellipsis: true,
      render: (_, r) => {
        const v = loaiSpMap[r.maSp]?.mayMocPc
        return v ? <Tooltip title={v}><span style={{ fontSize: 11, color: '#1e4570' }}>{v}</span></Tooltip>
                 : <span style={{ color: '#d1d5db' }}>—</span>
      },
    },
    {
      title: 'MÁY MÓC PL', key: 'mm_pl', width: 160, ellipsis: true,
      render: (_, r) => {
        const v = loaiSpMap[r.maSp]?.mayMocPl
        return v ? <Tooltip title={v}><span style={{ fontSize: 11, color: '#6d28d9' }}>{v}</span></Tooltip>
                 : <span style={{ color: '#d1d5db' }}>—</span>
      },
    },
    {
      title: 'MÁY MÓC BBC1', key: 'mm_bbc1', width: 160, ellipsis: true,
      render: (_, r) => {
        const v = loaiSpMap[r.maSp]?.mayMocBbc1
        return v ? <Tooltip title={v}><span style={{ fontSize: 11, color: '#15803d' }}>{v}</span></Tooltip>
                 : <span style={{ color: '#d1d5db' }}>—</span>
      },
    },
    {
      title: 'MÁY MÓC ĐG', key: 'mm_dg', width: 160, ellipsis: true,
      render: (_, r) => {
        const v = loaiSpMap[r.maSp]?.mayMocDg
        return v ? <Tooltip title={v}><span style={{ fontSize: 11, color: '#b45309' }}>{v}</span></Tooltip>
                 : <span style={{ color: '#d1d5db' }}>—</span>
      },
    },
  ]

  const tatCaTotal = lenhData.length + pendingData.length

  // ── Sub-tabs ───────────────────────────────────────────────────────────────
  const subTabs = [
    { key: 'tat_ca',     label: `Lệnh sản xuất (${tatCaTotal})`,                      warn: false },
    { key: 'chua_xep',   label: `Chưa xếp (${tabCounts.chua_xep})`,                  warn: false },
    ...TO_LIST.map(t => ({ key: t, label: `${t} (${tabCounts[t]})`,                   warn: tabCounts[t] > 0 })),
    { key: 'hoan_thien', label: `Lệnh đã hoàn thiện (${tabCounts.hoan_thien})`,       warn: false },
    ...(user?.role === 'ADMIN' ? [{ key: 'phan_tich', label: `🔬 Phân tích`, warn: false }] : []),
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

          {user?.role === 'ADMIN' && (
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
          )}
          {user?.role === 'ADMIN' && (
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
          )}
          <Button
            type="primary" icon={<PlusOutlined />} size="small"
            onClick={() => { setEditItem(null); setModalOpen(true) }}
            style={{ background: '#1e4570', borderColor: '#1e4570', fontSize: 11 }}
          >
            Thêm lệnh
          </Button>
          {activeTab !== 'phan_tich' && (
            <Dropdown
              menu={{
                items: [
                  { key: 'excel', label: 'Xuất Excel (.xlsx)', icon: <FileExcelOutlined style={{ color: '#217346' }} /> },
                  { key: 'image', label: 'Xuất ảnh PNG', icon: <FileImageOutlined style={{ color: '#0284c7' }} /> },
                ],
                onClick: ({ key }) => key === 'excel' ? exportMainExcel() : exportMainImage(),
              }}
              placement="bottomRight"
            >
              <Button icon={<DownloadOutlined />} size="small" loading={exportLoading} style={{ fontSize: 11 }}>
                Xuất
              </Button>
            </Dropdown>
          )}
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

      {/* ── Phân tích tab ── */}
      {activeTab === 'phan_tich' && (() => {
        const now = dayjs()
        const periodCutoff = {
          week:   now.startOf('isoWeek'),
          month:  now.startOf('month'),
          '3m':   now.subtract(3, 'month').startOf('day'),
          '6m':   now.subtract(6, 'month').startOf('day'),
          year:   now.startOf('year'),
          all:    null,
        }[phanTichPeriod]
        const _seenDh = new Set()
        const trendData = lenhData
          .filter(r => {
            if (!periodCutoff) return true
            const effectiveDate = r.ngayThucHien || r.ngayPhatLenh
            return effectiveDate && effectiveDate >= periodCutoff.format('YYYY-MM-DD')
          })
          .filter(r => {
            // Cùng mã đơn hàng chỉ tính 1 lần
            if (!r.maDonHang) return true
            if (_seenDh.has(r.maDonHang)) return false
            _seenDh.add(r.maDonHang)
            return true
          })
          .map(r => ({ ...r, _pm: loaiSpMap[r.maSp] || {} }))

        const normalizeLoai = raw => {
          if (!raw) return null
          return raw.trim().replace(/\s+/g, ' ')
            .split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : '').join(' ')
        }
        const loaiKeyFn = raw => (raw || '').trim().toLowerCase().replace(/\s+/g, ' ') || '(chưa phân loại)'

        const fmtCong = v => v > 0 ? Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : '—'
        const fmtH    = v => (v != null && v > 0) ? Number(v).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'
        const fmtDays = v => (v != null && v > 0) ? Number(v).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'

        // ── Summary stats ──
        const totalSl    = trendData.reduce((s, r) => s + (Number(r.soLuong) || 0), 0)
        const uniqueLoai = new Set(trendData.map(r => loaiKeyFn(r._pm.loaiSanPham))).size
        const uniqueSku  = new Set(trendData.filter(r => r.maSp).map(r => r.maSp)).size

        // ── Phân Tích Công — split PC by toThucHien (PCPL1/PCPL2) ──
        const congMap = {}
        trendData.forEach(r => {
          const key  = loaiKeyFn(r._pm.loaiSanPham)
          const loai = normalizeLoai(r._pm.loaiSanPham) || '(Chưa phân loại)'
          const sl   = Number(r.soLuong) || 0
          if (!congMap[key]) congMap[key] = { loai, skuSet: new Set(), congPcpl1: 0, congPcpl2: 0, congPl: 0, congDg: 0, congBbc1: 0 }
          const s = congMap[key]
          s.skuSet.add(r.maSp || '?')
          const to   = r.toThucHien
          const nsPc  = Number(r._pm.nangSuatPc)   || 0
          const nsPl  = Number(r._pm.nangSuatPl)   || 0
          const nsBbc = Number(r._pm.nangSuatBbc1) || 0
          const nsDg  = Number(r._pm.nangSuatDg) > 0 ? Number(r._pm.nangSuatDg) : Number(r._pm.slTrungBinh) || 0
          if (to === 'PCPL1' && nsPc  > 0) s.congPcpl1 += sl / nsPc
          if (to === 'PCPL2' && nsPc  > 0) s.congPcpl2 += sl / nsPc
          if (to === 'PCPL3' && nsPl  > 0) s.congPl    += sl / nsPl
          if (to === 'ĐG'    && nsDg  > 0) s.congDg    += sl / nsDg
          if (to === 'BBC1'  && nsBbc > 0) s.congBbc1  += sl / nsBbc
        })
        const congRows = Object.values(congMap).map(s => ({
          ...s, sku: s.skuSet.size,
          tongCong: s.congPcpl1 + s.congPcpl2 + s.congPl + s.congDg + s.congBbc1,
        })).sort((a, b) => b.tongCong - a.tongCong)

        // ── Thống kê theo loại SP ──
        const typeMap = {}
        let totalSlType = 0
        trendData.forEach(r => {
          const key  = loaiKeyFn(r._pm.loaiSanPham)
          const loai = normalizeLoai(r._pm.loaiSanPham) || '(Chưa phân loại)'
          const sl   = Number(r.soLuong) || 0
          totalSlType += sl
          if (!typeMap[key]) typeMap[key] = { loai, soLenh: 0, skuSet: new Set(), totalSl: 0, congDg: 0, congPc: 0, congPl: 0 }
          const s = typeMap[key]
          s.soLenh++; s.skuSet.add(r.maSp); s.totalSl += sl
          const nsDg = Number(r._pm.nangSuatDg) > 0 ? Number(r._pm.nangSuatDg) : (Number(r._pm.slTrungBinh) > 0 ? Number(r._pm.slTrungBinh) : 0)
          if (nsDg > 0) s.congDg += sl / nsDg
          if (Number(r._pm.nangSuatPc) > 0) s.congPc += sl / Number(r._pm.nangSuatPc)
          if (Number(r._pm.nangSuatPl) > 0) s.congPl += sl / Number(r._pm.nangSuatPl)
        })
        const typeRows = Object.values(typeMap)
          .map(s => ({ ...s, sku: s.skuSet.size, tyLe: totalSlType > 0 ? s.totalSl / totalSlType * 100 : 0 }))
          .sort((a, b) => b.totalSl - a.totalSl)
        const TYPE_COLORS = ['#1677ff','#52c41a','#fa8c16','#722ed1','#eb2f96','#13c2c2','#faad14','#f5222d','#a0d911','#2f54eb']
        const colorOf = loai => TYPE_COLORS[typeRows.findIndex(r => r.loai === loai) % TYPE_COLORS.length]

        // ── Bottleneck per lệnh ──
        const stageWorkers = {
          PC:   (employeeCounts['PCPL1'] || 0) + (employeeCounts['PCPL2'] || 0),
          PL:   employeeCounts['PCPL3'] || 0,
          BBC1: employeeCounts['BBC1']  || 0,
          DG:   employeeCounts['ĐG']   || 0,
        }
        const orderAnalysis = trendData.map(r => {
          const sl   = Number(r.soLuong) || 0
          const nsPc  = Number(r._pm.nangSuatPc)   || 0
          const nsPl  = Number(r._pm.nangSuatPl)   || 0
          const nsBbc = Number(r._pm.nangSuatBbc1) || 0
          const nsDg  = Number(r._pm.nangSuatDg) > 0 ? Number(r._pm.nangSuatDg) : Number(r._pm.slTrungBinh) > 0 ? Number(r._pm.slTrungBinh) : 0
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
        const ordersWithData = orderAnalysis.filter(r => r.bottleneck)

        const stageSummaryArr = [
          { key: 'PC',   label: 'Pha Chế',   tField: 'tPc',  color: '#1e40af', bg: '#dbeafe' },
          { key: 'PL',   label: 'Phân Liều', tField: 'tPl',  color: '#92400e', bg: '#fef3c7' },
          { key: 'BBC1', label: 'VS BBC1',   tField: 'tBbc', color: '#991b1b', bg: '#fee2e2' },
          { key: 'DG',   label: 'Đóng Gói', tField: 'tDg',  color: '#6d28d9', bg: '#f5f3ff' },
        ].map(s => {
          const vals    = ordersWithData.filter(r => r[s.tField] != null)
          const totalH  = vals.reduce((sum, r) => sum + r[s.tField], 0)
          const bnCount = ordersWithData.filter(r => r.bottleneck?.key === s.key).length
          return { ...s, totalH, orderCount: vals.length, bnCount, soNguoi: stageWorkers[s.key] || 0 }
        })
        const maxStageH      = Math.max(...stageSummaryArr.map(s => s.totalH)) || 1
        const bottleneckStage = stageSummaryArr.reduce((a, b) => b.totalH > a.totalH ? b : a)

        // ── Tải máy ──
        const STAGE_MACHINE_MAP = [
          { stageKey: 'PC',   machineField: 'mayMocPc',   nsField: 'nangSuatPc'        },
          { stageKey: 'PL',   machineField: 'mayMocPl',   nsField: 'nangSuatPl'        },
          { stageKey: 'BBC1', machineField: 'mayMocBbc1', nsField: 'nangSuatBbc1'      },
          { stageKey: 'DG',   machineField: 'mayMocDg',   nsField: 'nangSuatDg_or_slTB' },
        ]
        const resolveNs = (pm, nsField) =>
          nsField === 'nangSuatDg_or_slTB'
            ? (Number(pm.nangSuatDg) > 0 ? Number(pm.nangSuatDg) : Number(pm.slTrungBinh) || 0)
            : Number(pm[nsField]) || 0

        const machineLoad = {}
        const machineToBravo = {}
        trendData.forEach(r => {
          const sl = Number(r.soLuong) || 0
          STAGE_MACHINE_MAP.forEach(({ stageKey, machineField, nsField }) => {
            const machine = r._pm[machineField]
            const ns      = resolveNs(r._pm, nsField)
            if (!machine || ns === 0) return
            const key = `${stageKey}__${machine}`
            if (!machineLoad[key]) machineLoad[key] = { machine, stageKey, hours: 0, orders: 0 }
            machineLoad[key].hours  += sl / ns
            machineLoad[key].orders += 1
            if (!machineToBravo[key]) machineToBravo[key] = []
            machineToBravo[key].push({ maSp: r.maSp, soLo: r.soLo, ten: r.tenSanPham || r.maSp, t: sl / ns })
          })
        })
        const machineList = Object.values(machineLoad).sort((a, b) => b.hours - a.hours)
        const maxHours    = machineList[0]?.hours || 1
        const dgM   = machineList.filter(m => m.stageKey === 'DG')
        const pcM   = machineList.filter(m => m.stageKey === 'PC')
        const plM   = machineList.filter(m => m.stageKey === 'PL')
        const bbc1M = machineList.filter(m => m.stageKey === 'BBC1')

        const conflicts = Object.entries(machineToBravo)
          .filter(([, orders]) => orders.length > 1)
          .map(([key, orders]) => {
            const [stageKey, machine] = key.split('__')
            const totalH = orders.reduce((s, o) => s + o.t, 0)
            return { machine, stageKey, orders: orders.sort((a, b) => b.t - a.t), totalH }
          })
          .sort((a, b) => b.totalH - a.totalH)

        // ── UI helpers ──
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
                  <span style={{ color: '#fff', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtH(hours)} công{orders > 1 ? ` — ${orders} lệnh` : ''}</span>
                </div>
              </div>
            </div>
          )
        }

        // ── Phân Tích Công columns ──
        const PT_HEADER = { background: '#1e3a5f', color: '#fff', fontWeight: 700, fontSize: 11, padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap', borderRight: '1px solid #2d4e7a' }
        const PT_CELL   = (color) => ({ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color, fontSize: 13 })
        const congColumns = [
          { title: 'LOẠI SẢN PHẨM', dataIndex: 'loai', key: 'loai', width: 170,
            render: v => <Tag color={colorOf(v)} style={{ fontWeight: 600, fontSize: 12 }}>{v}</Tag> },
          { title: 'SỐ TP', dataIndex: 'sku', key: 'sku', width: 70, align: 'center',
            render: v => <span style={{ fontWeight: 700, color: '#374151' }}>{v}</span> },
          { title: 'CÔNG PC (PCPL1)', dataIndex: 'congPcpl1', key: 'cp1', width: 130, align: 'right',
            sorter: (a,b) => a.congPcpl1 - b.congPcpl1,
            render: v => v > 0 ? <span style={{ color: '#1d4ed8', fontWeight: 700 }}>{fmtCong(v)}</span> : <span style={{ color: '#d9d9d9' }}>0</span> },
          { title: 'CÔNG PC (PCPL2)', dataIndex: 'congPcpl2', key: 'cp2', width: 130, align: 'right',
            sorter: (a,b) => a.congPcpl2 - b.congPcpl2,
            render: v => v > 0 ? <span style={{ color: '#0369a1', fontWeight: 700 }}>{fmtCong(v)}</span> : <span style={{ color: '#d9d9d9' }}>0</span> },
          { title: 'CÔNG PL', dataIndex: 'congPl', key: 'cpl', width: 100, align: 'right',
            sorter: (a,b) => a.congPl - b.congPl,
            render: v => v > 0 ? <span style={{ color: '#0e7490', fontWeight: 700 }}>{fmtCong(v)}</span> : <span style={{ color: '#d9d9d9' }}>0</span> },
          { title: 'CÔNG ĐG', dataIndex: 'congDg', key: 'cdg', width: 100, align: 'right',
            sorter: (a,b) => a.congDg - b.congDg,
            render: v => v > 0 ? <span style={{ color: '#7c3aed', fontWeight: 700 }}>{fmtCong(v)}</span> : <span style={{ color: '#d9d9d9' }}>0</span> },
          { title: 'CÔNG BBC1', dataIndex: 'congBbc1', key: 'cb1', width: 100, align: 'right',
            sorter: (a,b) => a.congBbc1 - b.congBbc1,
            render: v => v > 0 ? <span style={{ color: '#991b1b', fontWeight: 700 }}>{fmtCong(v)}</span> : <span style={{ color: '#d9d9d9' }}>0</span> },
          { title: 'TỔNG CÔNG', dataIndex: 'tongCong', key: 'tc', width: 110, align: 'right',
            sorter: (a,b) => a.tongCong - b.tongCong,
            render: v => <span style={{ fontWeight: 800, color: '#111827' }}>{fmtCong(v)}</span> },
        ]
        const congSummary = () => {
          const tot = { cp1: 0, cp2: 0, cpl: 0, cdg: 0, cb1: 0 }
          congRows.forEach(r => { tot.cp1 += r.congPcpl1; tot.cp2 += r.congPcpl2; tot.cpl += r.congPl; tot.cdg += r.congDg; tot.cb1 += r.congBbc1 })
          const tongTat = tot.cp1 + tot.cp2 + tot.cpl + tot.cdg + tot.cb1
          const tdS = { fontWeight: 700, background: '#f0f5ff', padding: '6px 8px', display: 'block' }
          return (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}><span style={tdS}>Tổng ({lenhData.length} lệnh)</span></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right"><span style={{ ...tdS, color: '#1d4ed8' }}>{fmtCong(tot.cp1)}</span></Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right"><span style={{ ...tdS, color: '#0369a1' }}>{fmtCong(tot.cp2)}</span></Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right"><span style={{ ...tdS, color: '#0e7490' }}>{fmtCong(tot.cpl)}</span></Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right"><span style={{ ...tdS, color: '#7c3aed' }}>{fmtCong(tot.cdg)}</span></Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right"><span style={{ ...tdS, color: '#991b1b' }}>{fmtCong(tot.cb1)}</span></Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right"><span style={{ ...tdS, color: '#111827' }}>{fmtCong(tongTat)}</span></Table.Summary.Cell>
            </Table.Summary.Row>
          )
        }

        // ── Theo Loại SP columns ──
        const typeColumns = [
          { title: 'Loại Sản Phẩm', dataIndex: 'loai', key: 'loai', width: 160,
            render: v => <Tag color={colorOf(v)} style={{ fontWeight: 600, fontSize: 12 }}>{v}</Tag> },
          { title: 'Số Lệnh', dataIndex: 'soLenh', key: 'soLenh', width: 80, align: 'center',
            render: v => <span style={{ fontWeight: 700, color: '#374151' }}>{v}</span> },
          { title: 'Số SKU', dataIndex: 'sku', key: 'sku', width: 75, align: 'center',
            render: v => <span style={{ color: '#0369a1', fontWeight: 600 }}>{v}</span> },
          { title: 'Tổng SL', dataIndex: 'totalSl', key: 'totalSl', width: 110, align: 'right',
            sorter: (a, b) => a.totalSl - b.totalSl,
            render: v => <span style={{ fontWeight: 700 }}>{Number(v).toLocaleString('vi-VN')}</span> },
          { title: 'Tỷ Lệ SL', dataIndex: 'tyLe', key: 'tyLe', width: 170, align: 'center',
            sorter: (a, b) => a.tyLe - b.tyLe,
            render: (v, r) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Progress percent={Math.round(v)} size="small" strokeColor={colorOf(r.loai)} style={{ flex: 1, marginBottom: 0 }} showInfo={false} />
                <span style={{ fontWeight: 700, color: colorOf(r.loai), minWidth: 40 }}>{v.toFixed(1)}%</span>
              </div>
            ) },
          { title: 'Công ĐG', dataIndex: 'congDg', key: 'congDg', width: 100, align: 'right',
            sorter: (a, b) => a.congDg - b.congDg,
            render: v => v > 0 ? <span style={{ color: '#7c3aed', fontWeight: 700 }}>{fmtCong(v)}</span> : <span style={{ color: '#d9d9d9' }}>—</span> },
          { title: 'Công PC', dataIndex: 'congPc', key: 'congPc', width: 100, align: 'right',
            sorter: (a, b) => a.congPc - b.congPc,
            render: v => v > 0 ? <span style={{ color: '#1d4ed8', fontWeight: 600 }}>{fmtCong(v)}</span> : <span style={{ color: '#d9d9d9' }}>—</span> },
          { title: 'Công PL', dataIndex: 'congPl', key: 'congPl', width: 100, align: 'right',
            sorter: (a, b) => a.congPl - b.congPl,
            render: v => v > 0 ? <span style={{ color: '#0e7490', fontWeight: 600 }}>{fmtCong(v)}</span> : <span style={{ color: '#d9d9d9' }}>—</span> },
        ]
        const typeSummary = () => {
          const totSl  = typeRows.reduce((s, r) => s + r.totalSl, 0)
          const totDon = typeRows.reduce((s, r) => s + r.soLenh, 0)
          const totDg  = typeRows.reduce((s, r) => s + r.congDg, 0)
          const totPc  = typeRows.reduce((s, r) => s + r.congPc, 0)
          const totPl  = typeRows.reduce((s, r) => s + r.congPl, 0)
          const tdS    = { fontWeight: 700, background: '#f0f5ff', padding: '6px 8px', display: 'block' }
          return (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}><span style={tdS}>Tổng cộng ({totDon} lệnh)</span></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="center"><span style={tdS}>{typeRows.reduce((s, r) => s + r.sku, 0)}</span></Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right"><span style={tdS}>{totSl.toLocaleString('vi-VN')}</span></Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="center"><span style={tdS}>100%</span></Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right"><span style={{ ...tdS, color: '#7c3aed' }}>{fmtCong(totDg)}</span></Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right"><span style={{ ...tdS, color: '#1d4ed8' }}>{fmtCong(totPc)}</span></Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right"><span style={{ ...tdS, color: '#0e7490' }}>{fmtCong(totPl)}</span></Table.Summary.Cell>
            </Table.Summary.Row>
          )
        }

        const PT_INNER_TABS = [
          { key: 'cong',     label: 'Phân Tích Công' },
          { key: 'theo_loai', label: 'Theo Loại SP'  },
          { key: 'tai_may',  label: 'Tải Máy'        },
          { key: 'nut_that', label: 'Nút Thắt'       },
          { key: 'xung_dot', label: 'Xung Đột Máy'   },
        ]

        return (
          <div ref={phanTichRef} style={{ padding: '16px 16px 24px', background: '#fff' }}>

            {/* ── Period selector ── */}
            {(() => {
              const periods = [
                { key: 'week',  label: 'Tuần này' },
                { key: 'month', label: 'Tháng này' },
                { key: '3m',    label: '3 Tháng' },
                { key: '6m',    label: '6 Tháng' },
                { key: 'year',  label: 'Năm nay' },
                { key: 'all',   label: 'Tất cả' },
              ]
              return (
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginRight: 4 }}>Mốc thời gian:</span>
                  {periods.map(p => {
                    const isActive = phanTichPeriod === p.key
                    return (
                      <div key={p.key} onClick={() => setPhanTichPeriod(p.key)}
                        style={{
                          padding: '4px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: isActive ? 700 : 500,
                          background: isActive ? '#0f766e' : '#f1f5f9',
                          color: isActive ? '#fff' : '#374151',
                          border: isActive ? '1px solid #0f766e' : '1px solid #e2e8f0',
                          transition: 'all 0.15s',
                        }}
                      >{p.label}</div>
                    )
                  })}
                  <span style={{ marginLeft: 8, fontSize: 11, color: '#94a3b8' }}>
                    ({trendData.length} lệnh)
                  </span>
                  <span style={{ flex: 1 }} />
                  <Dropdown
                    menu={{
                      items: [
                        { key: 'excel', label: 'Xuất Excel (.xlsx)', icon: <FileExcelOutlined style={{ color: '#217346' }} /> },
                        { key: 'image', label: 'Xuất ảnh PNG', icon: <FileImageOutlined style={{ color: '#0284c7' }} /> },
                      ],
                      onClick: ({ key }) => {
                        if (key === 'excel') exportPhanTichExcel(phanTichSubTab, { congRows, typeRows, machineList, conflicts, orderAnalysis })
                        else exportPhanTichImage()
                      },
                    }}
                    placement="bottomRight"
                  >
                    <Button icon={<DownloadOutlined />} size="small" loading={exportLoading} style={{ fontSize: 11 }}>
                      Xuất
                    </Button>
                  </Dropdown>
                </div>
              )
            })()}

            {/* ── Summary cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'TỔNG BẢN GHI', value: trendData.length.toLocaleString('vi-VN'), sub: 'lệnh sản xuất', bg: 'linear-gradient(135deg,#0f766e,#0891b2)', icon: '📋' },
                { label: 'TỔNG SẢN LƯỢNG', value: totalSl.toLocaleString('vi-VN'), sub: 'đơn vị sản phẩm', bg: 'linear-gradient(135deg,#7c3aed,#a855f7)', icon: '📦' },
                { label: 'LOẠI SẢN PHẨM', value: uniqueLoai, sub: 'loại', bg: 'linear-gradient(135deg,#0369a1,#0ea5e9)', icon: '🗂️' },
                { label: 'SẢN PHẨM KHÁC NHAU', value: uniqueSku, sub: 'mã TP', bg: 'linear-gradient(135deg,#b45309,#f97316)', icon: '🏷️' },
              ].map(c => (
                <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: '14px 16px', color: '#fff' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.8, letterSpacing: 0.5, marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>{c.value}</div>
                  <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* ── Inner sub-tab bar ── */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb', marginBottom: 20 }}>
              {PT_INNER_TABS.map(t => {
                const isA = phanTichSubTab === t.key
                const badge = t.key === 'xung_dot' && conflicts.length > 0
                  ? <span style={{ marginLeft: 5, fontSize: 10, background: '#fbbf24', color: '#78350f', borderRadius: 8, padding: '1px 6px', fontWeight: 700 }}>{conflicts.length}</span>
                  : null
                return (
                  <div key={t.key} onClick={() => setPhanTichSubTab(t.key)}
                    style={{
                      padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: isA ? 700 : 500,
                      color: isA ? '#0f766e' : '#6b7280',
                      borderBottom: isA ? '2px solid #0f766e' : '2px solid transparent',
                      marginBottom: -2, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center',
                      transition: 'all 0.15s',
                    }}
                  >
                    {t.label}{badge}
                  </div>
                )
              })}
            </div>

            {/* ── Tab: Phân Tích Công ── */}
            {phanTichSubTab === 'cong' && (
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                  Công = Cỡ Lô ÷ Năng Suất (sp/công). Cột PCPL1/PCPL2 tính từ lệnh được phân công cho tổ tương ứng.
                </div>
                <Table
                  columns={congColumns}
                  dataSource={congRows}
                  rowKey="loai"
                  size="small"
                  pagination={false}
                  loading={loading}
                  scroll={{ x: 850 }}
                  rowHoverable={false}
                  summary={congSummary}
                  locale={{ emptyText: <span style={{ color: '#d9d9d9' }}>Không có dữ liệu</span> }}
                />
              </div>
            )}

            {/* ── Tab: Theo Loại SP ── */}
            {phanTichSubTab === 'theo_loai' && (
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                  Thống kê số lệnh, SKU, tổng sản lượng và tỷ lệ theo loại sản phẩm.
                </div>
                <Table
                  columns={typeColumns}
                  dataSource={typeRows}
                  rowKey="loai"
                  size="small"
                  pagination={false}
                  loading={loading}
                  scroll={{ x: 900 }}
                  rowHoverable={false}
                  summary={typeSummary}
                  locale={{ emptyText: <span style={{ color: '#d9d9d9' }}>Không có dữ liệu</span> }}
                />
              </div>
            )}

            {/* ── Tab: Tải Máy ── */}
            {phanTichSubTab === 'tai_may' && (
              <div>
                {machineList.length > 0 ? (
                  <>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                      Tổng công tất cả lệnh phân bổ trên từng máy — máy nào nhiều công nhất sẽ là điểm nghẽn thiết bị.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                      {[
                        { key: 'DG',   label: 'Đóng Gói (ĐG)', list: dgM,   color: '#6d28d9' },
                        { key: 'PC',   label: 'Pha Chế (PC)',   list: pcM,   color: '#1e40af' },
                        { key: 'PL',   label: 'Phân Liều (PL)', list: plM,   color: '#92400e' },
                        { key: 'BBC1', label: 'VS BBC1',         list: bbc1M, color: '#991b1b' },
                      ].filter(g => g.list.length > 0).map(g => (
                        <div key={g.key} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: g.color, marginBottom: 12 }}>{g.label}</div>
                          {g.list.map(m => (
                            <BarRow key={m.machine} label={m.machine} hours={m.hours} maxH={maxHours} color={g.color} orders={m.orders} />
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <Callout color="blue">Chưa có dữ liệu máy móc. Vào <b>Quản lý danh mục → Quản lý SP</b> để nhập máy móc cho từng sản phẩm.</Callout>
                )}
              </div>
            )}

            {/* ── Tab: Nút Thắt ── */}
            {phanTichSubTab === 'nut_that' && (
              <div>
                <Callout color="green">
                  <b>Nguyên tắc nút thắt (bottleneck):</b> Thời gian mỗi công đoạn = <b>Cỡ Lô ÷ Năng Suất (NS)</b>. Công đoạn nào lâu nhất chính là <b>nút thắt</b> — nó quyết định tiến độ hoàn thành lệnh.
                </Callout>
                {ordersWithData.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#f8fafc', borderRadius: 8, overflow: 'hidden' }}>
                    <thead>
                      <tr style={{ background: '#e2e8f0' }}>
                        {['Công đoạn','Tổng công','Số người','Ngày HT','Lệnh là nút thắt','Tải (% so cao nhất)'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Công đoạn' ? 'left' : 'right', fontWeight: 600, color: '#374151', borderBottom: '2px solid #cbd5e1', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stageSummaryArr.map((s, i) => {
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                                <div style={{ width: 80, background: '#e2e8f0', borderRadius: 3, height: 8, overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: s.color, borderRadius: 3 }} />
                                </div>
                                <span style={{ color: isBN ? s.color : '#6b7280', fontWeight: isBN ? 700 : 400, minWidth: 36, textAlign: 'right', fontSize: 12 }}>{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                ) : (
                  <Callout color="blue">Chưa có dữ liệu năng suất trong ProductMaster. Vào <b>Quản lý danh mục → Quản lý SP</b> để nhập NS cho từng sản phẩm.</Callout>
                )}
              </div>
            )}

            {/* ── Tab: Xung Đột Máy ── */}
            {phanTichSubTab === 'xung_dot' && (
              <div>
                {conflicts.length > 0 ? (
                  <>
                    <Callout color="amber">
                      <b>{conflicts.length} máy</b> đang phải phục vụ từ 2 lệnh trở lên. Cần lên lịch luân phiên hoặc bổ sung thiết bị.
                    </Callout>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {conflicts.slice(0, 15).map((c, i) => (
                        <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', background: '#fefce8' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontWeight: 700, color: '#92400e', fontSize: 13 }}>⚠ {c.machine}</span>
                            <span style={{ fontSize: 11, color: '#6b7280' }}>[{c.stageKey}]</span>
                            <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', borderRadius: 4, padding: '1px 6px' }}>
                              {fmtH(c.totalH)} công tổng · {c.orders.length} lệnh
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {c.orders.map((o, j) => (
                              <span key={j} style={{ fontSize: 11, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 4, padding: '2px 8px', color: '#374151' }}>
                                {o.soLo ? `[${o.soLo}] ` : ''}{o.ten} — {fmtH(o.t)} công
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <Callout color="green">Không có xung đột máy — mỗi máy chỉ phục vụ 1 lệnh hoặc chưa có dữ liệu máy móc.</Callout>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Table ── */}
      <div ref={tableWrapRef} style={{ display: activeTab === 'phan_tich' ? 'none' : undefined }}>
      <SkeletonTable
        className="lsx-tab-table"
        rowKey={r => r.isFromKhoach ? `ws-${r.workScheduleId}` : `l-${r.id}`}
        dataSource={rows}
        columns={activeTab === 'tat_ca' ? [...baseColumns, ...analyticsColumns] : baseColumns}
        loading={isLoading}
        size="small"
        scroll={{ x: activeTab === 'tat_ca' ? 2900 : 1620, y: tableH }}
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
          {user?.role === 'ADMIN' && (
            <Button
              size="small" icon={<SyncOutlined />}
              loading={bulkLoading === 'lichsx'}
              onClick={handleBulkLichSX}
              style={{ background: '#0891b2', borderColor: '#0891b2', color: '#fff', fontSize: 12 }}
            >
              Đồng bộ Lịch SX ({selectedIds.length})
            </Button>
          )}
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
