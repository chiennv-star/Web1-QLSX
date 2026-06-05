import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Table, Button, Space, Input, Select, DatePicker, Modal, Form,
  InputNumber, Tag, Popconfirm, message, Badge, Tooltip, Dropdown,
  Tabs, Checkbox, Drawer, Alert, List as AntList, Typography
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  ReloadOutlined, FireOutlined, ThunderboltOutlined,
  CheckCircleOutlined, CalendarOutlined, SwapOutlined,
  SyncOutlined, InfoCircleOutlined, HistoryOutlined, CheckSquareOutlined,
  LockOutlined, UpOutlined, DownOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import PhongThucHienSelect from '../components/PhongThucHienSelect'

const { Option } = Select
const { RangePicker } = DatePicker

// ── Constants ─────────────────────────────────────────────────────────────────
const TO_OPTIONS = ['PCPL1', 'PCPL2', 'PCPL3', 'BBC1', 'ĐG']

const TO_COLOR = {
  PCPL1: '#237804', PCPL2: '#ad6800', PCPL3: '#0958d9', BBC1: '#7c3aed', 'ĐG': '#b45309',
}

// mapping Tổ TH → Công đoạn mặc định trong Kế hoạch
const TO_CONG_DOAN = { PCPL1: 'PC', PCPL2: 'PC', PCPL3: 'PL', BBC1: 'BBC1', 'ĐG': 'DG' }
const CONG_FIELD_KH = { PC: 'congPc', BBC1: 'congBbc1', PL: 'congPl', DG: 'congDg' }

const TINH_TRANG_CFG = {
  rat_gap: { label: 'Rất Gấp', color: '#cf1322', bg: '#fff1f0', border: '#ffa39e', icon: <FireOutlined /> },
  gap:     { label: 'Gấp',     color: '#FF6600', bg: '#fff2e8', border: '#FF6600', icon: <ThunderboltOutlined /> },
}

const DONE_TAB = '__DONE__'

const GROUP_TABS = [
  { key: '',       label: 'Chưa xếp' },
  { key: 'PCPL1',  label: 'PCPL1' },
  { key: 'PCPL2',  label: 'PCPL2' },
  { key: 'PCPL3',  label: 'PCPL3' },
  { key: 'BBC1',   label: 'BBC1'  },
  { key: 'ĐG',     label: 'ĐG'    },
  { key: DONE_TAB, label: 'Lệnh đã hoàn thiện' },
]

const fmtNum = v => (v != null && v !== '') ? Number(v).toLocaleString('vi-VN') : '—'

// ── Add/Edit Modal ─────────────────────────────────────────────────────────────
function LenhModal({ open, editItem, defaultTo, onClose, onSaved, allRecords = [] }) {
  const [form] = Form.useForm()
  const [lookupStatus, setLookupStatus] = useState(null)
  const timerRef = useRef(null)

  // Gợi ý áp dụng số lô hàng loạt
  const [applyLoToAll, setApplyLoToAll] = useState(false)
  const watchSoLo     = Form.useWatch('soLo',      form)
  const watchDonHang  = Form.useWatch('maDonHang', form)

  // Các bản ghi cùng maDonHang chưa có soLo (trừ bản ghi đang sửa)
  const sameOrderPending = React.useMemo(() => {
    const locked = !!(editItem?.daBanHanh || editItem?.soLo)
    if (!watchDonHang || !watchSoLo?.trim() || locked) return []
    return allRecords.filter(r =>
      r.id !== editItem?.id &&
      r.maDonHang === watchDonHang &&
      !r.soLo
    )
  }, [watchDonHang, watchSoLo, allRecords, editItem?.id, editItem?.daBanHanh, editItem?.soLo])

  // Đổi lô state
  const [doiLoMode,    setDoiLoMode]    = useState(false)
  const [soLoMoi,      setSoLoMoi]      = useState('')
  const [lyDoDoiLo,    setLyDoDoiLo]    = useState('')
  const [loHistory,    setLoHistory]    = useState([])
  const [histLoading,  setHistLoading]  = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [doiLoPreview, setDoiLoPreview] = useState(null) // { soLoCu, maBravo, soKhoanMucAnhHuong }

  // Đổi field khoá state
  const [doiFieldForm]                  = Form.useForm()
  const [doiFieldOpen,  setDoiFieldOpen]  = useState(false)
  const [doiFieldMeta,  setDoiFieldMeta]  = useState(null) // { fieldName, currentValue }
  const [doiFieldLoading, setDoiFieldLoading] = useState(false)
  const [fieldHistory,  setFieldHistory]  = useState([])
  const [fieldHistLoading, setFieldHistLoading] = useState(false)

  const FIELD_LABELS = { maBravo: 'Mã Bravo', maSp: 'Mã SP', tenSanPham: 'Tên SP / Tiến Trình', maDonHang: 'Mã Đơn Hàng' }

  const openDoiField = async (fieldName, currentValue) => {
    setDoiFieldMeta({ fieldName, currentValue })
    doiFieldForm.resetFields()
    setFieldHistory([])
    setDoiFieldOpen(true)
    if (editItem?.id) {
      setFieldHistLoading(true)
      try {
        const { data } = await api.get(`/lenh-san-xuat/${editItem.id}/field-history`, { params: { field: fieldName } })
        setFieldHistory(data || [])
      } catch {}
      finally { setFieldHistLoading(false) }
    }
  }

  const handleDoiField = async () => {
    const vals = await doiFieldForm.validateFields()
    setDoiFieldLoading(true)
    try {
      const { data: saved } = await api.post(`/lenh-san-xuat/${editItem.id}/doi-field`, {
        fieldName: doiFieldMeta.fieldName,
        newValue:  vals.newValue?.trim() || null,
        lyDo:      vals.lyDo?.trim()    || null,
      })
      message.success(`Đã cập nhật ${FIELD_LABELS[doiFieldMeta.fieldName]}`)
      form.setFieldValue(doiFieldMeta.fieldName, vals.newValue?.trim() || null)
      setDoiFieldOpen(false)
      onSaved(saved, editItem)
    } catch { message.error('Lưu thất bại') }
    finally { setDoiFieldLoading(false) }
  }

  const [isDirty, setIsDirty] = useState(false)

  // Đã ban hành nếu flag daBanHanh=true HOẶC đã có số lô
  const isBanHanh = !!(editItem?.daBanHanh || editItem?.soLo)

  const [resolvedToNhom, setResolvedToNhom] = useState(null)

  const fetchToNhomFromKhoach = async (lenh) => {
    if (!lenh?.maBravo || !lenh?.ngayThucHien) return
    try {
      const { data: res } = await api.get('/work-schedule', { params: { source: 'PLAN', page: 0, size: 500 } })
      const all = Array.isArray(res) ? res : (res.content || [])
      const ngay = normDate(lenh.ngayThucHien)
      const match = all.find(k =>
        k.maBravo === lenh.maBravo &&
        (lenh.maDonHang ? k.maDonHang === lenh.maDonHang : true) &&
        normDate(k.ngayThucHien) === ngay
      )
      if (match?.toNhom) setResolvedToNhom(match.toNhom)
    } catch {}
  }

  useEffect(() => {
    if (!open) { setDoiLoMode(false); setSoLoMoi(''); setLyDoDoiLo(''); setLoHistory([]); setDoiLoPreview(null); setApplyLoToAll(false); setIsDirty(false); return }
    setIsDirty(false)
    if (editItem) {
      form.setFieldsValue({
        ...editItem,
        ngayThucHien: editItem.ngayThucHien ? dayjs(editItem.ngayThucHien) : null,
        ngayPhatLenh: editItem.ngayPhatLenh ? dayjs(editItem.ngayPhatLenh) : null,
        daLenLichLam: !!editItem.daLenLichLam,
        daDgVaXepLichDg: !!editItem.daDgVaXepLichDg,
      })
      const initial = editItem.toThucHien || defaultTo || null
      setResolvedToNhom(initial)
      if (!initial) fetchToNhomFromKhoach(editItem)
    } else {
      form.resetFields()
      form.setFieldsValue({ daLenLichLam: false, daDgVaXepLichDg: false, ngayPhatLenh: dayjs() })
      setResolvedToNhom(defaultTo || null)
    }
    setLookupStatus(null)
    setDoiLoMode(false)
    setSoLoMoi('')
    setLyDoDoiLo('')
    setLoHistory([])
  }, [open, editItem, defaultTo])

  const loadHistory = useCallback(async () => {
    if (!editItem?.id) return
    setHistLoading(true)
    try {
      const { data } = await api.get(`/lenh-san-xuat/${editItem.id}/lich-su-doi-lo`)
      setLoHistory(data || [])
    } catch { /* silent */ }
    finally { setHistLoading(false) }
  }, [editItem?.id])

  const enterDoiLoMode = async () => {
    setSoLoMoi(editItem?.soLo || '')
    setLyDoDoiLo('')
    setDoiLoPreview(null)
    setDoiLoMode(true)
    loadHistory()
    try {
      const { data } = await api.get(`/lenh-san-xuat/${editItem.id}/doi-lo/preview`)
      setDoiLoPreview(data)
    } catch { /* silent */ }
  }

  const handleBravoChange = (e) => {
    const val = e.target.value?.trim()
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!val) { setLookupStatus(null); return }
    setLookupStatus('loading')
    timerRef.current = setTimeout(async () => {
      try {
        const { data: master } = await api.get(`/product-master/lookup-by-bravo/${encodeURIComponent(val)}`)
        form.setFieldsValue({ maSp: master.maTp, tenSanPham: master.tienTrinh })
        setLookupStatus('found')
      } catch { setLookupStatus('not_found') }
    }, 500)
  }

  const normDate = (val) => {
    if (!val) return null
    if (Array.isArray(val)) return `${val[0]}-${String(val[1]).padStart(2,'0')}-${String(val[2]).padStart(2,'0')}`
    return dayjs(val).isValid() ? dayjs(val).format('YYYY-MM-DD') : null
  }

  const onOk = async () => {
    setSaving(true)
    try {
      // ── Chế độ đổi lô ──
      if (doiLoMode) {
        if (!soLoMoi?.trim()) { message.warning('Nhập số lô mới'); setSaving(false); return }
        const { data: saved } = await api.post(`/lenh-san-xuat/${editItem.id}/doi-lo`, {
          soLoMoi: soLoMoi.trim(), lyDo: lyDoDoiLo.trim() || null,
        })
        message.success(`Đã đổi lô: ${editItem.soLo} → ${soLoMoi.trim()}`)
        setDoiLoMode(false)
        onSaved(saved, editItem, { fromDoiLo: true })
        return
      }

      const values = await form.validateFields()
      const payload = {
        ...values,
        ngayThucHien: values.ngayThucHien ? values.ngayThucHien.format('YYYY-MM-DD') : null,
        ngayPhatLenh: values.ngayPhatLenh ? values.ngayPhatLenh.format('YYYY-MM-DD') : null,
        toThucHien:   resolvedToNhom || null,
      }

      if (editItem) {
        // ── Helper: thực hiện lưu cuối cùng sau xác nhận ──────────────────
        const executeSave = async (withBanHanh) => {
          setSaving(true)
          try {
            const finalPayload = { ...payload }
            if (withBanHanh) finalPayload.daBanHanh = true

            const { data: saved } = await api.put(`/lenh-san-xuat/${editItem.id}`, finalPayload)
            message.success(withBanHanh ? '✓ Đã ban hành lệnh sản xuất' : 'Đã lưu lệnh (chưa ban hành)')

            // Cascade ngày nếu thay đổi (chỉ áp dụng khi ban hành)
            if (withBanHanh) {
              const oldDate = normDate(editItem.ngayThucHien)
              const newDate = finalPayload.ngayThucHien
              if (oldDate && newDate && oldDate !== newDate && finalPayload.maBravo && finalPayload.maDonHang) {
                try {
                  const { data: allRes } = await api.get('/lenh-san-xuat')
                  const allList = Array.isArray(allRes) ? allRes : (allRes.content || [])
                  const toUpdate = allList.filter(r =>
                    r.id !== editItem.id && r.maBravo === finalPayload.maBravo &&
                    r.maDonHang === finalPayload.maDonHang && normDate(r.ngayThucHien) === oldDate
                  )
                  if (toUpdate.length > 0) {
                    await Promise.all(toUpdate.map(r =>
                      api.put(`/lenh-san-xuat/${r.id}`, { ...r, ngayThucHien: newDate })
                    ))
                    message.success(`Đã cập nhật thêm ${toUpdate.length} lệnh cùng nhóm`, 3)
                  }
                } catch {} // best-effort
              }
            }

            // Áp dụng số lô cho các bản ghi cùng đơn hàng nếu được chọn
            if (applyLoToAll && sameOrderPending.length > 0 && finalPayload.soLo) {
              try {
                await Promise.all(sameOrderPending.map(r =>
                  api.put(`/lenh-san-xuat/${r.id}`, { ...r, soLo: finalPayload.soLo })
                ))
                message.success(`Đã gán số lô "${finalPayload.soLo}" cho ${sameOrderPending.length} bản ghi cùng đơn hàng`, 3)
              } catch { /* best-effort */ }
            }

            setIsDirty(false)
            onSaved(saved || { ...editItem, ...finalPayload }, editItem)
          } catch { message.error('Lưu thất bại') }
          finally { setSaving(false) }
        }

        if (!isBanHanh) {
          // ── Chưa ban hành: hiện hộp xác nhận ────────────────────────────
          setSaving(false)
          Modal.confirm({
            title: 'Xác nhận ban hành lệnh sản xuất',
            icon: <CheckCircleOutlined style={{ color: '#16a34a' }} />,
            content: (
              <div style={{ fontSize: 14 }}>
                <div style={{ marginBottom: 6 }}>
                  Lệnh: <b style={{ color: '#1D4ED8' }}>{payload.maBravo}</b>
                  {payload.soLo && (
                    <> — Số lô: <b style={{ fontFamily: 'monospace', color: '#d97706' }}>{payload.soLo}</b></>
                  )}
                </div>
                <div style={{ color: '#64748b', fontSize: 13 }}>
                  Sau khi ban hành, số lô sẽ bị <b>khóa</b> và chỉ có thể đổi qua chức năng Đổi Lô.
                </div>
              </div>
            ),
            okText: '✓ Ban hành',
            cancelText: 'Chỉ lưu',
            okButtonProps: { style: { background: '#16a34a', borderColor: '#16a34a', fontWeight: 700 } },
            cancelButtonProps: { style: { fontWeight: 600 } },
            onOk: () => executeSave(true),
            onCancel: () => executeSave(false),
          })
          return
        }

        // ── Đã ban hành: cập nhật thông thường ──────────────────────────────
        const { data: saved } = await api.put(`/lenh-san-xuat/${editItem.id}`, payload)
        message.success('Đã cập nhật lệnh')
        if (applyLoToAll && sameOrderPending.length > 0 && payload.soLo) {
          try {
            await Promise.all(sameOrderPending.map(r =>
              api.put(`/lenh-san-xuat/${r.id}`, { ...r, soLo: payload.soLo })
            ))
            message.success(`Đã gán số lô "${payload.soLo}" cho ${sameOrderPending.length} bản ghi cùng đơn hàng`, 3)
          } catch { /* best-effort */ }
        }
        setIsDirty(false)
        onSaved(saved || { ...editItem, ...payload }, editItem)
      } else {
        const { data: saved } = await api.post('/lenh-san-xuat', payload)
        message.success('Đã thêm lệnh mới')
        // Áp dụng số lô cho các bản ghi cùng đơn hàng nếu được chọn
        if (applyLoToAll && sameOrderPending.length > 0 && payload.soLo) {
          try {
            await Promise.all(sameOrderPending.map(r =>
              api.put(`/lenh-san-xuat/${r.id}`, { ...r, soLo: payload.soLo })
            ))
            message.success(`Đã gán số lô "${payload.soLo}" cho ${sameOrderPending.length} bản ghi cùng đơn hàng`, 3)
          } catch { /* best-effort */ }
        }
        setIsDirty(false)
        onSaved(saved || payload, null)
      }
    } catch { message.error('Lưu thất bại') }
    finally { setSaving(false) }
  }

  const lookupIcon = () => {
    if (lookupStatus === 'loading')   return <SyncOutlined spin style={{ color: '#1D4ED8' }} />
    if (lookupStatus === 'found')     return <CheckCircleOutlined style={{ color: '#389e0d' }} />
    if (lookupStatus === 'not_found') return <span style={{ color: '#cf1322', fontSize: 11 }}>?</span>
    return null
  }

  const okText = doiLoMode ? 'Xác nhận đổi lô'
    : !editItem ? 'Thêm'
    : isBanHanh ? 'Cập nhật'
    : 'Ban hành'

  const histCols = [
    { title: 'Thời gian', dataIndex: 'changedAt', key: 'at', width: 140,
      render: v => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—' },
    { title: 'Số lô cũ', dataIndex: 'soLoCu', key: 'cu', width: 90,
      render: v => <span style={{ fontFamily: 'monospace', color: '#cf1322' }}>{v || '—'}</span> },
    { title: 'Số lô mới', dataIndex: 'soLoMoi', key: 'moi', width: 90,
      render: v => <span style={{ fontFamily: 'monospace', color: '#389e0d', fontWeight: 700 }}>{v || '—'}</span> },
    { title: 'Lý do', dataIndex: 'lyDo', key: 'ly', ellipsis: true,
      render: v => v || <span style={{ color: '#bbb' }}>—</span> },
    { title: 'Người đổi', dataIndex: 'changedBy', key: 'by', width: 110,
      render: v => <span style={{ fontSize: 11, color: '#64748b' }}>{v || '—'}</span> },
  ]

  const handleClose = () => {
    if (doiLoMode) { setDoiLoMode(false); return }
    if (isDirty) {
      Modal.confirm({
        title: 'Có thay đổi chưa lưu',
        content: 'Bạn chưa nhấn "Cập nhật". Thoát sẽ mất các thay đổi vừa nhập.',
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
      open={open}
      onCancel={handleClose}
      onOk={onOk}
      confirmLoading={saving}
      title={
        <Space>
          {doiLoMode
            ? <SwapOutlined style={{ color: '#d46b08' }} />
            : editItem ? <EditOutlined style={{ color: '#1D4ED8' }} /> : <PlusOutlined style={{ color: '#1D4ED8' }} />}
          <span style={{ fontWeight: 700 }}>
            {doiLoMode ? 'Đổi Lô Sản Xuất'
              : editItem ? 'Chỉnh sửa lệnh sản xuất' : 'Thêm lệnh sản xuất mới'}
          </span>
          {isBanHanh && !doiLoMode && (
            <Tag icon={<CheckSquareOutlined />} color="success" style={{ marginLeft: 4 }}>Đã ban hành</Tag>
          )}
        </Space>
      }
      okText={okText}
      okButtonProps={{
        style: doiLoMode ? { background: '#d46b08', borderColor: '#d46b08' }
          : !editItem || isBanHanh
            ? (isDirty ? { boxShadow: '0 0 0 3px rgba(22,119,255,0.45)', fontWeight: 700 } : {})
            : { background: '#15803d', borderColor: '#15803d',
                ...(isDirty ? { boxShadow: '0 0 0 3px rgba(22,163,74,0.5)', fontWeight: 700 } : {}) }
      }}
      cancelText={doiLoMode ? 'Quay lại' : 'Huỷ'}
      width={doiLoMode ? 720 : 680}
      destroyOnClose
    >
      {/* ── Chế độ đổi lô ─────────────────────────────────────────────────── */}
      {doiLoMode ? (
        <div style={{ paddingTop: 8 }}>
          <Alert
            type="warning"
            showIcon
            message={
              <span>
                Đổi lô sẽ ghi lại lịch sử và cập nhật số lô trên lệnh sản xuất.
                {doiLoPreview != null && (doiLoPreview.soKhoanLich > 0 || doiLoPreview.soKhoanSanLuong > 0) && (
                  <> Đồng thời tự động cập nhật:{' '}
                    {doiLoPreview.soKhoanLich > 0 && (
                      <strong style={{ color: '#d46b08' }}>{doiLoPreview.soKhoanLich} Kế Hoạch</strong>
                    )}
                    {doiLoPreview.soKhoanLich > 0 && doiLoPreview.soKhoanSanLuong > 0 && ', '}
                    {doiLoPreview.soKhoanSanLuong > 0 && (
                      <strong style={{ color: '#d46b08' }}>{doiLoPreview.soKhoanSanLuong} Sản Lượng</strong>
                    )}
                    {' '}có cùng lô này.
                  </>
                )}
                {doiLoPreview != null && doiLoPreview.soKhoanLich === 0 && doiLoPreview.soKhoanSanLuong === 0 && (
                  <> Không có Kế Hoạch hay Sản Lượng nào dùng lô này.</>
                )}
              </span>
            }
            style={{ marginBottom: 16 }}
          />
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>Số lô hiện tại</div>
              <div style={{
                padding: '7px 12px', background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 6, fontFamily: 'monospace', fontWeight: 700, color: '#cf1322', fontSize: 14,
              }}>{editItem?.soLo || '—'}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>
                Số lô mới <span style={{ color: '#cf1322' }}>*</span>
              </div>
              <Input
                value={soLoMoi} onChange={e => setSoLoMoi(e.target.value)}
                placeholder="Nhập số lô mới..."
                style={{ fontFamily: 'monospace', fontWeight: 700, color: '#15803d', fontSize: 14 }}
                autoFocus
              />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>Lý do đổi lô</div>
            <Input.TextArea
              value={lyDoDoiLo} onChange={e => setLyDoDoiLo(e.target.value)}
              placeholder="Nhập lý do đổi lô (không bắt buộc)..."
              autoSize={{ minRows: 2, maxRows: 3 }} maxLength={500}
            />
          </div>

          {/* Lịch sử đổi lô */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <HistoryOutlined style={{ color: '#1D4ED8' }} />
              <span style={{ fontWeight: 700, color: '#1D4ED8', fontSize: 13 }}>Lịch sử đổi lô</span>
              {loHistory.length > 0 && (
                <Badge count={loHistory.length} style={{ background: '#1D4ED8' }} />
              )}
            </div>
            <Table
              columns={histCols}
              dataSource={loHistory}
              rowKey="id"
              size="small"
              loading={histLoading}
              pagination={false}
              locale={{ emptyText: 'Chưa có lịch sử đổi lô' }}
              style={{ maxHeight: 200, overflow: 'auto' }}
            />
          </div>
        </div>
      ) : (
      /* ── Form chỉnh sửa thường ─────────────────────────────────────────── */
      <Form form={form} layout="vertical" style={{ marginTop: 12 }} onValuesChange={() => setIsDirty(true)}>
        {/* Banner đã ban hành */}
        {isBanHanh && (
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
            padding: '8px 14px', marginBottom: 14, display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: '#15803d', fontWeight: 600, fontSize: 13 }}>
              <CheckSquareOutlined style={{ marginRight: 6 }} />
              Lệnh đã được ban hành — Số lô bị khóa
            </span>
            <Button size="small" icon={<SwapOutlined />} onClick={enterDoiLoMode}
              style={{ borderColor: '#d46b08', color: '#d46b08', fontWeight: 600 }}>
              Đổi Lô
            </Button>
          </div>
        )}

        {/* Row 1: Mã Bravo + Mã SP */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item label={<span>Mã Bravo {!isBanHanh && lookupIcon()}</span>} name="maBravo" style={{ flex: 1 }}
            rules={[{ required: true, message: 'Nhập Mã Bravo' }]}>
            {isBanHanh ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff', flex: 1 }}>
                  {form.getFieldValue('maBravo') || '—'}
                </span>
                <Button size="small" icon={<EditOutlined />}
                  style={{ color: '#4338ca', borderColor: '#818cf8', fontSize: 11 }}
                  onClick={() => openDoiField('maBravo', form.getFieldValue('maBravo'))}>
                  Sửa
                </Button>
              </div>
            ) : (
              <Input placeholder="VD: 10602153" onChange={handleBravoChange}
                style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }} />
            )}
          </Form.Item>
          <Form.Item label="Mã SP" name="maSp" style={{ flex: 1 }}>
            {isBanHanh ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 700, color: '#1D4ED8', flex: 1 }}>
                  {form.getFieldValue('maSp') || '—'}
                </span>
                <Button size="small" icon={<EditOutlined />}
                  style={{ color: '#4338ca', borderColor: '#818cf8', fontSize: 11 }}
                  onClick={() => openDoiField('maSp', form.getFieldValue('maSp'))}>
                  Sửa
                </Button>
              </div>
            ) : (
              <Input placeholder="Tự động điền" style={{ color: '#1D4ED8', fontWeight: 600 }} />
            )}
          </Form.Item>
        </div>
        {/* Tên Sản Phẩm */}
        <Form.Item label="Tên Sản Phẩm / Tiến Trình" name="tenSanPham">
          {isBanHanh ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <span style={{ flex: 1, fontSize: 13, color: '#1e293b' }}>
                {form.getFieldValue('tenSanPham') || '—'}
              </span>
              <Button size="small" icon={<EditOutlined />}
                style={{ color: '#4338ca', borderColor: '#818cf8', fontSize: 11, flexShrink: 0 }}
                onClick={() => openDoiField('tenSanPham', form.getFieldValue('tenSanPham'))}>
                Sửa
              </Button>
            </div>
          ) : (
            <Input.TextArea autoSize={{ minRows: 1, maxRows: 3 }} placeholder="Tự động điền khi tra Mã Bravo" />
          )}
        </Form.Item>
        {/* Row 2: Số Lô (locked khi đã ban hành) + Mã Đơn Hàng + Số Lượng + Tình Trạng */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item label="Số Lô" name="soLo" style={{ flex: 1 }}>
            {isBanHanh ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontFamily: 'monospace', fontWeight: 700, color: '#92400e', flex: 1,
                  background: '#fef9c3', padding: '4px 8px', borderRadius: 4,
                  border: '1px solid #fde68a', fontSize: 13,
                }}>
                  {form.getFieldValue('soLo') || '—'}
                </span>
                <Button size="small" icon={<SwapOutlined />}
                  style={{ color: '#d46b08', borderColor: '#ffa940', fontSize: 11 }}
                  onClick={enterDoiLoMode}>
                  Đổi Lô
                </Button>
              </div>
            ) : (
              <Input
                placeholder="VD: 110526"
                style={{
                  fontFamily: 'monospace', fontWeight: 700, fontSize: 15,
                  letterSpacing: 2, color: '#1D4ED8',
                  background: '#EFF6FF', borderColor: '#93C5FD',
                  borderWidth: 2, borderRadius: 6,
                  padding: '6px 10px',
                }}
              />
            )}
          </Form.Item>
          <Form.Item label="Mã Đơn Hàng" name="maDonHang" style={{ flex: 1 }}>
            {isBanHanh ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'monospace', color: '#7c3aed', fontWeight: 600, flex: 1 }}>
                  {form.getFieldValue('maDonHang') || '—'}
                </span>
                <Button size="small" icon={<EditOutlined />}
                  style={{ color: '#4338ca', borderColor: '#818cf8', fontSize: 11 }}
                  onClick={() => openDoiField('maDonHang', form.getFieldValue('maDonHang'))}>
                  Sửa
                </Button>
              </div>
            ) : (
              <Input placeholder="VD: DH-001" style={{ fontFamily: 'monospace' }} />
            )}
          </Form.Item>
          <Form.Item label="Cỡ Lô" name="soLuong" style={{ flex: 1 }}>
            <InputNumber style={{ width: '100%', background: isBanHanh ? '#f5f5f5' : undefined }} min={0}
              disabled={isBanHanh}
              formatter={v => v ? Number(v).toLocaleString('vi-VN') : ''}
              parser={v => v ? v.replace(/[^\d]/g, '') : ''} />
          </Form.Item>
          <Form.Item label="Tình Trạng" name="tinhTrang" style={{ flex: 1 }}>
            <Select allowClear placeholder="Chọn...">
              <Option value="rat_gap"><FireOutlined style={{ color: '#cf1322' }} /> Rất Gấp</Option>
              <Option value="gap"><ThunderboltOutlined style={{ color: '#d46b08' }} /> Gấp</Option>
            </Select>
          </Form.Item>
        </div>
        {/* Gợi ý áp dụng số lô hàng loạt */}
        {sameOrderPending.length > 0 && (
          <div style={{
            margin: '-4px 0 10px',
            padding: '8px 12px',
            background: '#eff6ff',
            border: '1.5px solid #93c5fd',
            borderRadius: 7,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Checkbox
              checked={applyLoToAll}
              onChange={e => setApplyLoToAll(e.target.checked)}
            />
            <div style={{ flex: 1, fontSize: 12, color: '#1e40af' }}>
              <span style={{ fontWeight: 700 }}>Áp dụng số lô "{watchSoLo}" cho {sameOrderPending.length} bản ghi khác</span>
              <span style={{ color: '#3b82f6' }}> cùng Mã Đơn Hàng <strong style={{ fontFamily: 'monospace' }}>{watchDonHang}</strong></span>
              <span style={{ color: '#64748b', fontSize: 11, display: 'block', marginTop: 1 }}>
                {sameOrderPending.slice(0, 3).map(r => r.maBravo || r.tenSanPham || `#${r.id}`).join(', ')}
                {sameOrderPending.length > 3 && ` và ${sameOrderPending.length - 3} bản ghi khác...`}
              </span>
            </div>
          </div>
        )}
        {/* Row 3: Ngày TH + Ngày Phát Lệnh + Tổ TH + Phòng TH */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item label="Ngày Thực Hiện" name="ngayThucHien" style={{ flex: 1 }}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Ngày Phát Lệnh" name="ngayPhatLenh" style={{ flex: 1 }}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Mặc định: ngày nhập lệnh" />
          </Form.Item>
          <Form.Item label="Tổ Thực Hiện" style={{ flex: 1 }}>
            <div style={{ padding: '5px 8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, minHeight: 32, display: 'flex', alignItems: 'center' }}>
              {resolvedToNhom
                ? <Tag style={{ fontWeight: 700, fontSize: 12, marginRight: 0, background: `${TO_COLOR[resolvedToNhom] || '#374151'}20`, color: TO_COLOR[resolvedToNhom] || '#374151', border: `1px solid ${TO_COLOR[resolvedToNhom] || '#374151'}55` }}>{resolvedToNhom}</Tag>
                : <span style={{ color: '#d9d9d9', fontSize: 12 }}>Tự động từ kế hoạch</span>
              }
            </div>
          </Form.Item>
          <Form.Item label="Phòng TH" name="phongThucHien" style={{ flex: 1 }}>
            <PhongThucHienSelect style={{ width: '100%' }} placeholder="Phòng / khu vực..." />
          </Form.Item>
        </div>
        {/* Row 4: Chú Ý */}
        <Form.Item label="Chú Ý" name="chuY">
          <Input placeholder="Lưu ý nhanh..." />
        </Form.Item>
        {/* Ghi Chú */}
        <Form.Item label="Ghi Chú" name="ghiChu">
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="Ghi chú chi tiết..." />
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
      )}

      {/* ── Sub-modal: Chỉnh sửa field khoá ──────────────────────────────── */}
      <Modal
        open={doiFieldOpen}
        onCancel={() => setDoiFieldOpen(false)}
        onOk={handleDoiField}
        confirmLoading={doiFieldLoading}
        title={
          <Space>
            <LockOutlined style={{ color: '#4338ca' }} />
            <span style={{ fontWeight: 700 }}>
              Chỉnh sửa: {FIELD_LABELS[doiFieldMeta?.fieldName] || doiFieldMeta?.fieldName}
            </span>
          </Space>
        }
        okText="Lưu thay đổi"
        cancelText="Huỷ"
        width={520}
        destroyOnClose
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>Giá trị hiện tại</div>
          <div style={{
            padding: '7px 12px', background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 6, fontFamily: 'monospace', color: '#374151',
          }}>
            {doiFieldMeta?.currentValue || <span style={{ color: '#bbb' }}>—</span>}
          </div>
        </div>
        <Form form={doiFieldForm} layout="vertical">
          <Form.Item
            label={<span>Giá trị mới <span style={{ color: '#cf1322' }}>*</span></span>}
            name="newValue"
            rules={[{ required: true, message: 'Nhập giá trị mới' }]}
          >
            {doiFieldMeta?.fieldName === 'tenSanPham'
              ? <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
              : <Input style={{ fontFamily: 'monospace' }} autoFocus />
            }
          </Form.Item>
          <Form.Item label="Lý do chỉnh sửa" name="lyDo"
            rules={[{ required: true, message: 'Nhập lý do' }]}>
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 3 }} maxLength={500} />
          </Form.Item>
        </Form>

        {/* Lịch sử */}
        {(fieldHistory.length > 0 || fieldHistLoading) && (
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <HistoryOutlined style={{ color: '#4338ca' }} />
              <span style={{ fontWeight: 700, color: '#4338ca', fontSize: 13 }}>Lịch sử thay đổi</span>
              {fieldHistory.length > 0 && (
                <Badge count={fieldHistory.length} style={{ background: '#4338ca' }} />
              )}
            </div>
            <AntList
              size="small"
              loading={fieldHistLoading}
              dataSource={fieldHistory}
              locale={{ emptyText: 'Chưa có lịch sử' }}
              style={{ maxHeight: 180, overflowY: 'auto' }}
              renderItem={h => (
                <AntList.Item style={{ padding: '4px 0' }}>
                  <div style={{ width: '100%', fontSize: 12 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', color: '#cf1322', textDecoration: 'line-through' }}>
                        {h.oldValue || '—'}
                      </span>
                      <span style={{ color: '#94a3b8' }}>→</span>
                      <span style={{ fontFamily: 'monospace', color: '#15803d', fontWeight: 700 }}>
                        {h.newValue || '—'}
                      </span>
                    </div>
                    <div style={{ color: '#64748b', marginTop: 2 }}>
                      {h.lyDo && <span style={{ marginRight: 8 }}>{h.lyDo}</span>}
                      <span style={{ color: '#94a3b8' }}>
                        {h.changedBy} · {h.changedAt ? new Date(h.changedAt).toLocaleString('vi-VN') : ''}
                      </span>
                    </div>
                  </div>
                </AntList.Item>
              )}
            />
          </div>
        )}
      </Modal>
    </Modal>
  )
}

// ── KhoachLink Drawer ─────────────────────────────────────────────────────────
function KhoachLinkDrawer({ open, maSp, soLo, tenSanPham, onClose }) {
  const [plans, setPlans]     = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !maSp) return
    setLoading(true)
    const params = { source: 'PLAN', maSp, size: 100 }
    if (soLo) params.soLo = soLo
    api.get('/work-schedule', { params })
      .then(({ data }) => {
        const all = data.content || data || []
        // nếu có soLo thì ưu tiên lọc exact match, fallback toàn bộ maSp
        const filtered = soLo
          ? all.filter(p => !p.soLo || p.soLo === soLo)
          : all
        setPlans(filtered.length > 0 ? filtered : all)
      })
      .catch(() => message.error('Không thể tải kế hoạch'))
      .finally(() => setLoading(false))
  }, [open, maSp, soLo])

  const cols = [
    { title: 'Ngày', dataIndex: 'ngayThucHien', key: 'ngay', width: 95,
      render: v => v ? <span style={{ fontWeight: 600, color: '#1677ff' }}>{dayjs(v).format('DD/MM/YYYY')}</span> : '—' },
    { title: 'Công đoạn', dataIndex: 'congDoan', key: 'congDoan', width: 80,
      render: v => <Tag color="blue" style={{ marginRight: 0 }}>{v}</Tag> },
    { title: 'Tổ / Nhóm', dataIndex: 'toNhom', key: 'toNhom', width: 90,
      render: v => v ? <Tag style={{ background: `${TO_COLOR[v] || '#1D4ED8'}22`, color: TO_COLOR[v] || '#1D4ED8', border: 'none', fontWeight: 700 }}>{v}</Tag> : '—' },
    { title: 'Số Lô', dataIndex: 'soLo', key: 'soLo', width: 90,
      render: v => <span style={{ fontFamily: 'monospace', color: '#d46b08' }}>{v || '—'}</span> },
    { title: 'Cỡ Lô', dataIndex: 'coLo', key: 'coLo', width: 80, align: 'right',
      render: v => fmtNum(v) },
    { title: 'Phòng TH', dataIndex: 'phongThucHien', key: 'phong', width: 90 },
    { title: 'Trạng thái', dataIndex: 'tinhTrang', key: 'tt', width: 110, align: 'center',
      render: v => v === 'done'
        ? <Badge status="success" text={<span style={{ color: '#15803d', fontWeight: 700 }}>✓ Đã xếp lịch</span>} />
        : v === 'rat_gap' ? <Badge status="error" text="Rất gấp" />
        : v === 'gap'     ? <Badge status="warning" text="Gấp" />
        : <span style={{ color: '#d9d9d9' }}>—</span> },
  ]

  return (
    <Drawer open={open} onClose={onClose} width={820}
      title={
        <Space>
          <CalendarOutlined style={{ color: '#1D4ED8' }} />
          <span style={{ fontWeight: 700 }}>Kế hoạch liên kết</span>
          <Tag color="blue">{maSp}</Tag>
          <span style={{ fontSize: 12, color: '#64748b' }}>{tenSanPham}</span>
        </Space>
      }
      styles={{ body: { padding: 16, background: '#fafafe' } }}
    >
      <style>{`.kh-tbl .ant-table-thead > tr > th { background: linear-gradient(90deg, #2980b3 0%, #3399CC 100%) !important; color: #ffffff !important; font-size: 11px !important; padding: 6px 8px !important; } .kh-tbl .ant-table-thead > tr > th::before { display: none !important; }`}</style>
      <Table className="kh-tbl" columns={cols} dataSource={plans} rowKey="id"
        size="small" loading={loading}
        pagination={{ pageSize: 30, showTotal: t => `${t} kế hoạch` }} />
    </Drawer>
  )
}

// ── Record Detail Drawer ──────────────────────────────────────────────────────
function RecordDetailDrawer({ open, record, onClose, onSaved, onDeleted, canEdit, allRecords = [] }) {
  const [editOpen, setEditOpen] = useState(false)
  const [addOpen,  setAddOpen]  = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!record) return null

  const tt = TINH_TRANG_CFG[record.tinhTrang]

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/lenh-san-xuat/${record.id}`)
      message.success('Đã xóa lệnh')
      onDeleted(record.id)
      onClose()
    } catch { message.error('Xóa thất bại') }
    finally { setDeleting(false) }
  }

  const Row = ({ label, children }) => (
    <>
      <div style={{ color: '#64748b', fontWeight: 600, fontSize: 12, paddingTop: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#1e293b', wordBreak: 'break-word' }}>{children}</div>
    </>
  )

  return (
    <>
      <Drawer
        open={open} onClose={onClose} width={500}
        title={
          <Space>
            <span style={{ fontWeight: 700, color: '#1D4ED8' }}>Chi tiết Lệnh Sản Xuất</span>
            {record.maBravo && (
              <Tag style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff', borderColor: '#91caff' }}>
                {record.maBravo}
              </Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            {canEdit && (
              <Button size="small" icon={<PlusOutlined />}
                onClick={() => setAddOpen(true)}>
                Thêm lệnh
              </Button>
            )}
            {canEdit && (
              <Button size="small" type="primary" icon={<EditOutlined />}
                style={{ background: '#1D4ED8', borderColor: '#1D4ED8' }}
                onClick={() => setEditOpen(true)}>
                Sửa
              </Button>
            )}
            {canEdit && (
              <Popconfirm title="Xóa lệnh này?" okText="Xóa" cancelText="Huỷ" okButtonProps={{ danger: true }}
                onConfirm={handleDelete}>
                <Button size="small" danger icon={<DeleteOutlined />} loading={deleting}>Xóa</Button>
              </Popconfirm>
            )}
          </Space>
        }
        styles={{ body: { padding: 20, background: '#fafafe' } }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', rowGap: 10, columnGap: 16 }}>
          <Row label="Mã Bravo">
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>{record.maBravo || '—'}</span>
          </Row>
          <Row label="Mã SP">
            {record.maSp ? <Tag color="blue" style={{ fontWeight: 600, marginRight: 0 }}>{record.maSp}</Tag> : '—'}
          </Row>
          <Row label="Tên Sản Phẩm">
            <span style={{ fontWeight: 500 }}>{record.tenSanPham || '—'}</span>
          </Row>
          <Row label="Số Lô">
            <span style={{ fontFamily: 'monospace' }}>{record.soLo || '—'}</span>
          </Row>
          <Row label="Mã Đơn Hàng">
            <span style={{ fontFamily: 'monospace', color: '#7c3aed' }}>{record.maDonHang || '—'}</span>
          </Row>
          <Row label="Cỡ Lô">
            <span style={{ fontWeight: 700, fontSize: 14 }}>{fmtNum(record.soLuong)}</span>
          </Row>
          <Row label="Tình Trạng">
            {tt ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12,
                background: tt.bg, border: `1px solid ${tt.border}`,
                color: tt.color, fontWeight: 700, borderRadius: 10, padding: '1px 10px',
              }}>
                {tt.icon} {tt.label}
              </span>
            ) : <span style={{ color: '#94a3b8' }}>—</span>}
          </Row>
          <Row label="Ngày Thực Hiện">
            {record.ngayThucHien
              ? <span style={{ fontWeight: 600, color: '#1677ff' }}>{dayjs(record.ngayThucHien).format('DD/MM/YYYY')}</span>
              : '—'}
          </Row>
          <Row label="Tổ Thực Hiện">
            {record.toThucHien
              ? <Tag style={{ background: `${TO_COLOR[record.toThucHien] || '#1D4ED8'}20`, color: TO_COLOR[record.toThucHien] || '#1D4ED8', border: `1px solid ${TO_COLOR[record.toThucHien] || '#1D4ED8'}55`, fontWeight: 700, marginRight: 0 }}>{record.toThucHien}</Tag>
              : '—'}
          </Row>
          <Row label="Phòng TH">{record.phongThucHien || '—'}</Row>
          <Row label="Số NV TH">
            {record.soNguoiThucHien != null
              ? <span style={{ fontWeight: 700 }}>{record.soNguoiThucHien}</span>
              : '—'}
          </Row>
          <Row label="Chú Ý">
            {record.chuY
              ? <span style={{ color: '#d46b08' }}>{record.chuY}</span>
              : '—'}
          </Row>
          <Row label="Ghi Chú">
            <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'pre-wrap' }}>{record.ghiChu || '—'}</span>
          </Row>
          <Row label="Đã lên lịch làm">
            {record.daLenLichLam
              ? <span style={{ color: '#389e0d', fontWeight: 700 }}>✓ Có</span>
              : <span style={{ color: '#94a3b8' }}>Chưa</span>}
          </Row>
          <Row label="Đã ĐG & lịch ĐG">
            {record.daDgVaXepLichDg
              ? <span style={{ color: '#7c3aed', fontWeight: 700 }}>✓ Có</span>
              : <span style={{ color: '#94a3b8' }}>Chưa</span>}
          </Row>
        </div>
      </Drawer>

      {/* Edit modal */}
      <LenhModal
        open={editOpen}
        editItem={record}
        defaultTo={record.toThucHien}
        onClose={() => setEditOpen(false)}
        onSaved={(saved, prev, opts) => { setEditOpen(false); onSaved(saved, prev, opts) }}
        allRecords={allRecords}
      />

      {/* Add new modal */}
      <LenhModal
        open={addOpen}
        editItem={null}
        defaultTo={record.toThucHien}
        onClose={() => setAddOpen(false)}
        onSaved={(saved) => { setAddOpen(false); onSaved(saved) }}
        allRecords={allRecords}
      />
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LenhSanXuatPage() {
  const { canEditLenh } = useAuth()
  const canEdit = canEditLenh()

  const [data,          setData]          = useState([])
  const [loading,       setLoading]       = useState(false)
  const [saving,        setSaving]        = useState({})
  const [donHangKeys,   setDonHangKeys]   = useState(new Set())
  const [khoachPlans,   setKhoachPlans]   = useState([])

  // Filters
  const [activeTab,    setActiveTab]    = useState('')
  const [tabsVisible,  setTabsVisible]  = useState(() => {
    const saved = localStorage.getItem('lsx_tabs_visible')
    return saved === null ? true : saved === 'true'
  })
  const [dateRange,  setDateRange]  = useState([null, null])
  const [filterMaSp, setFilterMaSp] = useState('')
  const [filterSoLo, setFilterSoLo] = useState('')
  const [filterTT,   setFilterTT]   = useState(null)

  // Inline edit Số Lô (chỉ dùng khi ô trống)
  const [inlineSoLo, setInlineSoLo] = useState(null) // { id, value }

  // Right-click "Đổi lô" từ bảng

  // Modal
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editItem,    setEditItem]    = useState(null)

  // KhoachLink drawer
  const [klOpen,      setKlOpen]      = useState(false)
  const [klRecord,    setKlRecord]    = useState(null)

  // Detail drawer
  const [detailOpen,   setDetailOpen]   = useState(false)
  const [detailRecord, setDetailRecord] = useState(null)

  // Sticky header offset (tab bar + filter bar)
  const headerWrapRef = useRef(null)
  const [headerOffset, setHeaderOffset] = useState(0)

  useEffect(() => {
    if (!headerWrapRef.current) return
    const obs = new ResizeObserver(() => setHeaderOffset(headerWrapRef.current?.offsetHeight || 0))
    obs.observe(headerWrapRef.current)
    return () => obs.disconnect()
  }, [])

  // ── Inline save Số Lô ───────────────────────────────────────────────────────
  const saveInlineSoLo = async (record, newVal) => {
    const trimmed = newVal?.trim() || ''
    setInlineSoLo(null)
    if (trimmed === (record.soLo || '')) return // không thay đổi
    setSaving(prev => ({ ...prev, [record.id]: true }))
    try {
      const { data: saved } = await api.put(`/lenh-san-xuat/${record.id}`, { ...record, soLo: trimmed || null })
      const updated = { ...record, soLo: trimmed || null, ...saved }
      setData(prev => prev.map(r => r.id === record.id ? updated : r))
      if (trimmed) {
        message.success(`Đã gán số lô "${trimmed}" — hãy Ban hành lệnh`)
        setEditItem(updated)
        setModalOpen(true)
      }
    } catch { message.error('Lưu thất bại') }
    finally { setSaving(prev => ({ ...prev, [record.id]: false })) }
  }

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const params = {}
      if (activeTab && activeTab !== DONE_TAB) params.toThucHien = activeTab
      if (filterTT)         params.tinhTrang  = filterTT
      if (dateRange[0])     params.fromDate   = dateRange[0].format('YYYY-MM-DD')
      if (dateRange[1])     params.toDate     = dateRange[1].format('YYYY-MM-DD')
      const [lenhRes, dhRes, planRes] = await Promise.all([
        api.get('/lenh-san-xuat', { params }),
        api.get('/don-hang').catch(() => ({ data: [] })),
        api.get('/work-schedule', { params: { source: 'PLAN', size: 2000 } }).catch(() => ({ data: { content: [] } })),
      ])
      // Build composite key maBravo||maDonHang từ danh sách Đơn Hàng
      const keys = new Set(
        (dhRes.data || [])
          .filter(d => d.maBravo && d.maDonHang)
          .map(d => `${d.maBravo}||${d.maDonHang}`)
      )
      setDonHangKeys(keys)
      const planList = planRes.data?.content || planRes.data || []
      setKhoachPlans(Array.isArray(planList) ? planList : [])
      const records = lenhRes.data || []
      setData(records)
      return records
    } catch { message.error('Không thể tải dữ liệu') }
    finally { setLoading(false) }
  }, [activeTab, filterTT, dateRange])

  // Tự động xóa bản ghi trùng: cùng maBravo + maDonHang + ngayThucHien + toThucHien → giữ id nhỏ nhất
  const deduplicateLenhSX = useCallback(async (records) => {
    const normD = (val) => {
      if (!val) return null
      if (Array.isArray(val)) return `${val[0]}-${String(val[1]).padStart(2,'0')}-${String(val[2]).padStart(2,'0')}`
      return dayjs(val).isValid() ? dayjs(val).format('YYYY-MM-DD') : null
    }
    const seen = new Map()
    const toDelete = []
    for (const r of records) {
      if (!r.maBravo || !r.maDonHang || !r.ngayThucHien) continue
      const key = `${r.maBravo}||${r.maDonHang}||${normD(r.ngayThucHien)}||${r.toThucHien || ''}`
      if (seen.has(key)) {
        const kept = seen.get(key)
        if (r.id < kept.id) { toDelete.push(kept.id); seen.set(key, r) }
        else                 { toDelete.push(r.id) }
      } else {
        seen.set(key, r)
      }
    }
    if (toDelete.length === 0) return
    try {
      await api.delete('/lenh-san-xuat/bulk', { data: toDelete })
      setData(prev => prev.filter(r => !toDelete.includes(r.id)))
      message.warning(`Đã tự động xóa ${toDelete.length} lệnh trùng (cùng Mã Bravo + Mã ĐH + Ngày TH + Tổ TH)`, 4)
    } catch { /* silent */ }
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-refresh mỗi 60 giây + kiểm tra duplicate sau mỗi lần tải
  useEffect(() => {
    const interval = setInterval(async () => {
      const records = await load({ silent: true })
      if (records) deduplicateLenhSX(records)
    }, 60_000)
    return () => clearInterval(interval)
  }, [load, deduplicateLenhSX])

  useEffect(() => {
    const handler = () => load({ silent: true })
    window.addEventListener('app:silent-refresh', handler)
    return () => window.removeEventListener('app:silent-refresh', handler)
  }, [load])

  // ── Client-side extra filter (maSp, soLo, daLenLichLam) ─────────────────
  const displayData = data.filter(r => {
    // Tab "Đã hoàn thiện": chỉ hiện lệnh daLenLichLam=true
    if (activeTab === DONE_TAB) {
      if (!r.daLenLichLam) return false
    } else {
      // Các tab bình thường: ẩn lệnh đã hoàn thiện
      if (r.daLenLichLam) return false
    }
    if (filterMaSp && !r.maSp?.toLowerCase().includes(filterMaSp.toLowerCase())
                   && !r.maBravo?.toLowerCase().includes(filterMaSp.toLowerCase())
                   && !r.tenSanPham?.toLowerCase().includes(filterMaSp.toLowerCase())) return false
    if (filterSoLo && !r.soLo?.toLowerCase().includes(filterSoLo.toLowerCase())) return false
    return true
  })

  // ── Sync daLenLichLam → Kế hoạch tinhTrang ──────────────────────────────
  const syncToKhoach = useCallback(async (record, newDaLenLichLam) => {
    if (!record?.maSp) return
    try {
      const { data: planData } = await api.get('/work-schedule', {
        params: { source: 'PLAN', maSp: record.maSp, size: 100 },
      })
      const plans = (planData.content || planData || []).filter(p =>
        p.maSp === record.maSp &&
        (!record.soLo || !p.soLo || p.soLo === record.soLo)
      )
      if (plans.length === 0) return
      await Promise.all(plans.map(p =>
        api.put(`/work-schedule/${p.id}`, {
          source:       p.source,
          ngayThucHien: p.ngayThucHien,
          congDoan:     p.congDoan,
          toNhom:       p.toNhom,
          maSp:         p.maSp,
          tenTrinh:     p.tenTrinh,
          soLo:         p.soLo,
          coLo:         p.coLo,
          congPc:       p.congPc,
          congBbc1:     p.congBbc1,
          congPl:       p.congPl,
          congDg:       p.congDg,
          congCc:       p.congCc,
          chuY:         p.chuY,
          saiLech:      p.saiLech,
          tinhTrang:    newDaLenLichLam ? 'done'
                          : (p.tinhTrang === 'done' ? null : p.tinhTrang),
        })
      ))
      message.success(`Đã đồng bộ ${plans.length} bản kế hoạch`, 2)
    } catch {
      // best-effort — silent
    }
  }, [])

  // ── Toggle bool field ─────────────────────────────────────────────────────
  const toggleBool = async (id, field, cur) => {
    setSaving(p => ({ ...p, [id]: true }))
    try {
      await api.put(`/lenh-san-xuat/${id}`, { [field]: !cur })
      setData(prev => prev.map(r => r.id === id ? { ...r, [field]: !cur } : r))
      if (field === 'daLenLichLam') {
        const record = data.find(r => r.id === id)
        syncToKhoach(record, !cur)
      }
    } catch { message.error('Lưu thất bại') }
    finally { setSaving(p => { const n = { ...p }; delete n[id]; return n }) }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteRow = async (id) => {
    try {
      await api.delete(`/lenh-san-xuat/${id}`)
      setData(prev => prev.filter(r => r.id !== id))
      setSelectedRowKeys(prev => prev.filter(k => k !== id))
      message.success('Đã xóa lệnh')
    } catch { message.error('Xóa thất bại') }
  }

  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const handleBulkDelete = async (idsToDelete) => {
    setBulkDeleting(true)
    try {
      const { data: res } = await api.delete('/lenh-san-xuat/bulk', { data: idsToDelete })
      setData(prev => prev.filter(r => !idsToDelete.includes(r.id)))
      setSelectedRowKeys([])
      message.success(`Đã xóa ${res.deleted} lệnh vào Thùng Rác`)
    } catch { message.error('Xóa thất bại') }
    finally { setBulkDeleting(false) }
  }

  const [syncingAll, setSyncingAll] = useState(false)
  const handleSyncAllSanLuong = async () => {
    setSyncingAll(true)
    try {
      const { data } = await api.post('/lenh-san-xuat/sync-san-luong')
      if (data.created > 0) {
        message.success(`Đã tạo thêm ${data.created} bản ghi Sản Lượng mới`, 3)
      } else {
        message.info('Tất cả Lệnh SX đã có bản ghi Sản Lượng tương ứng', 2)
      }
    } catch { message.error('Đồng bộ thất bại') }
    finally { setSyncingAll(false) }
  }

  const rowSelection = canEdit ? {
    selectedRowKeys,
    onChange: keys => setSelectedRowKeys(keys),
    getCheckboxProps: r => ({ onClick: e => e.stopPropagation() }),
  } : undefined

  // ── Auto-fill Kế hoạch khi Lệnh có ngayThucHien + toThucHien ────────────
  const autoFillKhoach = useCallback(async (record) => {
    if (!record?.ngayThucHien || !record?.toThucHien) return
    if (!record?.maSp && !record?.soLo) return

    const congDoan = TO_CONG_DOAN[record.toThucHien]
    if (!congDoan) return

    // Normalize date (handle string / Date / array formats từ backend)
    const toDate = (val) => {
      if (!val) return ''
      if (Array.isArray(val)) return `${val[0]}-${String(val[1]).padStart(2,'0')}-${String(val[2]).padStart(2,'0')}`
      return dayjs(val).format('YYYY-MM-DD')
    }
    const targetDate = toDate(record.ngayThucHien)
    const congField  = CONG_FIELD_KH[congDoan]

    // Data từ Lệnh SX sẽ điền vào Kế hoạch
    const fromLenh = {
      maBravo:        record.maBravo          || null,
      maDonHang:      record.maDonHang        || null,
      maSp:           record.maSp            || null,
      tenTrinh:       record.tenSanPham       || null,
      soLo:           record.soLo             || null,
      coLo:           record.soLuong    != null ? Number(record.soLuong) : null,
      chuY:           record.chuY             || null,
      tinhTrang:      (record.tinhTrang && record.tinhTrang !== 'done') ? record.tinhTrang : null,
      phongThucHien:  record.phongThucHien    || null,
    }

    try {
      // Tìm kiếm Kế hoạch theo ngày + tổ + sản phẩm
      const params = { source: 'PLAN', size: 500 }

      const { data: planData } = await api.get('/work-schedule', { params })
      const all = planData.content || planData || []

      // Match: cùng ngày + cùng tổ + cùng sản phẩm + cùng lô (khi có)
      const matched = all.filter(p => {
        const pDate = toDate(p.ngayThucHien)
        if (pDate !== targetDate || p.toNhom !== record.toThucHien) return false
        // Nếu cả hai đều có soLo nhưng khác nhau → không phải cùng lô, bỏ qua
        if (record.soLo && p.soLo && record.soLo !== p.soLo) return false
        // maDonHang lưu trong DB → key đáng tin nhất
        if (record.maDonHang && p.maDonHang)
          return p.maDonHang === record.maDonHang
        // maBravo (@Transient, enriched từ ProductMaster)
        if (record.maBravo && p.maBravo)
          return p.maBravo === record.maBravo
        // maSp lưu trong DB → fallback cuối
        if (record.maSp && p.maSp)
          return p.maSp === record.maSp
        return false
      })

      if (matched.length > 0) {
        // Cập nhật kế hoạch: ghi đè maDonHang + soLo, sync các trường còn lại
        await Promise.all(matched.map(p => {
          const payload = {
            source:       p.source || 'PLAN',
            ngayThucHien: toDate(p.ngayThucHien),
            congDoan:     p.congDoan,
            toNhom:       p.toNhom,
            maBravo:      fromLenh.maBravo    ?? p.maBravo,
            maDonHang:    fromLenh.maDonHang  || p.maDonHang,   // ghi đè nếu lệnh có
            maSp:         fromLenh.maSp       ?? p.maSp,
            tenTrinh:     fromLenh.tenTrinh   ?? p.tenTrinh,
            soLo:         fromLenh.soLo       || p.soLo,        // ghi đè nếu lệnh có
            coLo:          p.coLo          ?? fromLenh.coLo,
            congPc:        p.congPc, congBbc1: p.congBbc1,
            congPl:        p.congPl, congDg:   p.congDg, congCc: p.congCc,
            chuY:          fromLenh.chuY          ?? p.chuY,
            saiLech:       p.saiLech,
            tinhTrang:     fromLenh.tinhTrang      ?? p.tinhTrang,
            phongThucHien: fromLenh.phongThucHien  ?? p.phongThucHien,
          }
          // sync soNguoiThucHien → congField (congPc / congBbc1 / congPl / congDg)
          if (congField && record.soNguoiThucHien != null) {
            payload[congField] = record.soNguoiThucHien
          }
          return api.put(`/work-schedule/${p.id}`, payload)
        }))
        message.success(
          `Đã cập nhật ${matched.length} bản kế hoạch ${record.toThucHien} — ${dayjs(targetDate).format('DD/MM/YYYY')}`, 2
        )
      } else {
        // Tạo bản kế hoạch mới cho tổ + ngày đó
        await api.post('/work-schedule', {
          source:       'PLAN',
          ngayThucHien: targetDate,
          congDoan,
          toNhom:       record.toThucHien,
          ...fromLenh,
          ...(congField ? { [congField]: record.soNguoiThucHien ?? null } : {}),
        })
        message.success(
          `Đã tạo kế hoạch ${record.toThucHien} — ${dayjs(targetDate).format('DD/MM/YYYY')}`, 2
        )
      }
    } catch { /* silent */ }
  }, [])

  // ── Auto-create bản ghi Hàng Lỗi tương ứng ─────────────────────────────
  const syncHangLoi = useCallback(async (lenhRecord) => {
    const { maSp, maBravo, tenSanPham, soLo, soLuong } = lenhRecord
    if (!maSp) return
    try {
      const { data: exists } = await api.get('/hang-loi/exists', {
        params: { mtpCoMem: maSp, tenHangHoa: tenSanPham || '', soLo: soLo || '' }
      })
      if (!exists) {
        await api.post('/hang-loi', {
          mtpCoMem:   maSp        || null,
          mtpSongAn:  maBravo     || null,
          tenHangHoa: tenSanPham  || null,
          soLo:       soLo        || null,
          soLuong:    soLuong     ?? null,
        })
        message.info('Đã tạo bản ghi Hàng Lỗi tương ứng', 2)
      }
    } catch {} // best-effort
  }, [])

  // ── Auto-create bản ghi Sản lượng: đã chuyển sang backend (LenhSanXuatService.autoCreateSanLuong) ────
  const syncSanLuong = useCallback(async (lenhRecord) => {
    const { maBravo, maSp, tenSanPham, soLo, soLuong, maDonHang } = lenhRecord
    if (!maBravo || !soLo) return
    try {
      // Chỉ giữ lại phần sync HangLoi — Sản lượng được backend tự tạo khi lưu Lệnh SX
      syncHangLoi(lenhRecord)
    } catch (err) {
      if (err?.response?.status === 409) {
        // Sản lượng đã tồn tại → vẫn kiểm tra Hàng Lỗi
        syncHangLoi(lenhRecord)
        return
      }
    }
  }, [syncHangLoi])

  // Khi Lệnh SX được sửa: sync lsx + maDonHang vào bản ghi Sản Lượng tương ứng
  const syncSanLuongUpdate = useCallback(async (oldRecord, newPayload) => {
    const oldSoLo = oldRecord.soLo
    const newSoLo = newPayload.soLo
    const newMaDonHang = newPayload.maDonHang || null
    if (!oldRecord.maBravo || !oldSoLo) return
    // Chỉ chạy khi soLo hoặc maDonHang thay đổi
    if (oldSoLo === newSoLo && oldRecord.maDonHang === newMaDonHang) return
    try {
      const { data: page } = await api.get('/production', {
        params: { maBravo: oldRecord.maBravo, lsx: oldSoLo, page: 0, size: 50 },
      })
      const list = page.content || page || []
      if (list.length === 0) return
      await Promise.all(list.map(r =>
        api.put(`/production/${r.id}`, {
          ...r,
          lsx:       newSoLo      || r.lsx,
          maDonHang: newMaDonHang ?? r.maDonHang,
        })
      ))
      message.success(`Đã cập nhật ${list.length} bản ghi Sản Lượng (lô + mã ĐH)`, 2)
    } catch {} // best-effort
  }, [])

  // ── Auto-create/update Đơn Hàng khi Lệnh SX có maDonHang ───────────────
  // Key định danh: maBravo + maDonHang (composite)
  const syncDonHang = useCallback(async (lenhRecord, prevRecord = null) => {
    const { maBravo, maDonHang, maSp, tenSanPham } = lenhRecord
    if (!maDonHang) return
    try {
      const { data: res } = await api.get('/don-hang')
      const allDH = Array.isArray(res) ? res : (res.content || [])

      // Kiểm tra bằng composite key: maBravo + maDonHang
      const alreadyExists = allDH.some(
        dh => dh.maBravo === maBravo && dh.maDonHang === maDonHang
      )
      if (alreadyExists) return

      // Nếu đang sửa lệnh: tìm bản ghi đơn hàng theo key cũ rồi UPDATE thay vì tạo mới
      if (prevRecord?.maBravo && prevRecord?.maDonHang) {
        const prevDH = allDH.find(
          dh => dh.maBravo === prevRecord.maBravo && dh.maDonHang === prevRecord.maDonHang
        )
        if (prevDH) {
          await api.put(`/don-hang/${prevDH.id}`, {
            ...prevDH,
            maBravo,
            maDonHang,
            maSp:       maSp       || prevDH.maSp,
            tenSanPham: tenSanPham || prevDH.tenSanPham,
          })
          message.success(`Đã cập nhật Đơn Hàng: ${maDonHang}`, 2)
          return
        }
      }

      // Tạo mới nếu chưa tồn tại
      await api.post('/don-hang', {
        maBravo:    maBravo    || null,
        maDonHang,
        maSp:       maSp       || null,
        tenSanPham: tenSanPham || null,
      })
      message.success(`Đã tạo Đơn Hàng mới: ${maDonHang}`, 2)
    } catch { /* best-effort */ }
  }, [])

  const openAdd  = () => { setEditItem(null); setModalOpen(true) }
  const openEdit = (r) => { setEditItem(r);   setModalOpen(true) }

  const onSaved = (savedRecord, prevRecord = null, opts = {}) => {
    setModalOpen(false)
    if (savedRecord && detailRecord?.id === savedRecord.id) {
      setDetailRecord(savedRecord)
    }
    load()
    if (savedRecord?.ngayThucHien && savedRecord?.toThucHien) {
      autoFillKhoach(savedRecord)
    }
    if (savedRecord?.maDonHang) {
      syncDonHang(savedRecord, prevRecord)
    }
    // Khi đổi lô: backend cascade đã cập nhật lsx trong production_records
    // → KHÔNG gọi syncSanLuong (tạo mới) hay syncSanLuongUpdate để tránh tạo bản ghi trùng
    if (!opts.fromDoiLo && savedRecord?.maBravo && savedRecord?.soLo) {
      syncSanLuong(savedRecord)
    }
  }

  // ── KPI ───────────────────────────────────────────────────────────────────
  const kpi = {
    ratGap:  data.filter(r => r.tinhTrang === 'rat_gap').length,
    gap:     data.filter(r => r.tinhTrang === 'gap').length,
    daLich:  data.filter(r => r.daLenLichLam).length,
    daDg:    data.filter(r => r.daDgVaXepLichDg).length,
    total:   data.length,
  }

  // ── Kiểm tra lệnh đã xếp kế hoạch chưa ──────────────────────────────────
  const isInKhoach = useCallback((r) => {
    if (!r.maSp || !khoachPlans.length) return false
    return khoachPlans.some(p => {
      if (p.maSp !== r.maSp) return false
      if (r.maDonHang && p.maDonHang && r.maDonHang !== p.maDonHang) return false
      if (r.soLo && p.soLo && r.soLo !== p.soLo) return false
      return true
    })
  }, [khoachPlans])

  // ── Tab items ─────────────────────────────────────────────────────────────
  const tabItems = GROUP_TABS.map(g => {
    let cnt
    if (g.key === DONE_TAB)  cnt = data.filter(r =>  !!r.daLenLichLam).length
    else if (g.key === '')   cnt = data.filter(r => !r.daLenLichLam).length
    else                     cnt = data.filter(r => !r.daLenLichLam && r.toThucHien === g.key).length
    const badgeColor = g.color || (g.key ? TO_COLOR[g.key] || '#1D4ED8' : '#1D4ED8')
    return {
      key: g.key,
      label: (
        <span style={g.color ? { color: activeTab === g.key ? '#fff' : g.color, fontWeight: 700 } : {}}>
          {g.label}
          {cnt > 0 && (
            <Badge count={cnt} size="small"
              style={{ marginLeft: 6, background: badgeColor }} />
          )}
        </span>
      ),
    }
  })

  // ── Table columns ─────────────────────────────────────────────────────────
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
      title: 'Phát Hành', key: 'trangThai', width: 110, align: 'center',
      filters: [
        { text: 'Chưa phát hành', value: 'chua' },
        { text: 'Đã phát hành',   value: 'da'   },
      ],
      onFilter: (value, r) => value === 'da'
        ? !!(r.daBanHanh || r.soLo)
        : !(r.daBanHanh || r.soLo),
      render: (_, r) => (r.daBanHanh || r.soLo)
        ? <Tag color="success" style={{ fontWeight: 700, fontSize: 11, marginRight: 0 }}>✓ Đã phát hành</Tag>
        : <Tag color="warning" style={{ fontWeight: 700, fontSize: 11, marginRight: 0, color: '#92400e' }}>⏳ Chưa phát hành</Tag>,
    },
    {
      title: 'Ngày TH', dataIndex: 'ngayThucHien', key: 'ngay', width: 88, align: 'center',
      sorter: (a, b) => (a.ngayThucHien || '').localeCompare(b.ngayThucHien || ''),
      render: v => v ? (
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#1677ff' }}>{dayjs(v).format('DD/MM')}</div>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>{dayjs(v).format('YYYY')}</div>
        </div>
      ) : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Ngày Phát Lệnh', key: 'ngayPhatLenh', width: 105, align: 'center',
      sorter: (a, b) => {
        const da = a.ngayPhatLenh || (a.createdAt ? a.createdAt.substring(0, 10) : '')
        const db = b.ngayPhatLenh || (b.createdAt ? b.createdAt.substring(0, 10) : '')
        return da.localeCompare(db)
      },
      render: (_, r) => {
        const val = r.ngayPhatLenh || (r.createdAt ? r.createdAt.substring(0, 10) : null)
        const isDefault = !r.ngayPhatLenh && !!r.createdAt
        if (!val) return <span style={{ color: '#d9d9d9' }}>—</span>
        return (
          <Tooltip title={isDefault ? 'Ngày nhập lệnh (chưa đặt ngày phát lệnh)' : 'Ngày phát lệnh'}>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: isDefault ? '#94a3b8' : '#15803d' }}>
                {dayjs(val).format('DD/MM')}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>{dayjs(val).format('YYYY')}</div>
            </div>
          </Tooltip>
        )
      },
    },
    {
      title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 110, fixed: 'left',
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
      render: (v, r) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
          <span style={{ fontSize: 13, color: '#1e293b', fontWeight: 500, lineHeight: 1.4, flex: 1 }}>
            {v || <span style={{ color: '#d9d9d9' }}>—</span>}
          </span>
          <Tooltip title="Xem chi tiết lệnh">
            <InfoCircleOutlined
              onClick={e => { e.stopPropagation(); setDetailRecord(r); setDetailOpen(true) }}
              style={{ fontSize: 13, color: '#94a3b8', cursor: 'pointer', marginTop: 2, flexShrink: 0 }}
            />
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Số Lô', dataIndex: 'soLo', key: 'soLo', width: 120,
      render: (v, r) => {
        const isEditing = canEdit && !r.daBanHanh && !v && inlineSoLo?.id === r.id
        if (isEditing) {
          return (
            <Input
              autoFocus
              size="small"
              defaultValue={inlineSoLo.value}
              style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, width: 100, color: '#1D4ED8' }}
              onBlur={e => saveInlineSoLo(r, e.target.value)}
              onPressEnter={e => saveInlineSoLo(r, e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') setInlineSoLo(null) }}
              onClick={e => e.stopPropagation()}
            />
          )
        }
        return (
          <span
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              cursor: canEdit && !r.daBanHanh && !v ? 'text' : 'default',
            }}
            onClick={e => {
              if (!canEdit || r.daBanHanh || v) return
              e.stopPropagation()
              setInlineSoLo({ id: r.id, value: '' })
            }}
          >
            <span style={{
              fontFamily: 'monospace', fontSize: 12,
              color: v ? '#595959' : '#d9d9d9',
              borderBottom: canEdit && !r.daBanHanh && !v ? '1px dashed #93C5FD' : 'none',
              minWidth: 40, display: 'inline-block',
            }}>
              {v || '—'}
            </span>
            {r.daBanHanh && (
              <Tag color="success" style={{ fontSize: 9, padding: '0 4px', lineHeight: '16px', marginRight: 0 }}>BH</Tag>
            )}
          </span>
        )
      },
    },
    {
      title: 'Mã Đơn Hàng', dataIndex: 'maDonHang', key: 'maDonHang', width: 130,
      render: (v, r) => {
        const noDh = r.maBravo && r.maDonHang && !donHangKeys.has(`${r.maBravo}||${r.maDonHang}`)
        return (
          <div style={{ lineHeight: 1.3 }}>
            {v
              ? <span style={{ fontFamily: 'monospace', color: '#7c3aed', fontWeight: 600, fontSize: 12 }}>{v}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>}
            {noDh && (
              <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 600, marginTop: 2 }}>
                ⚠ Không tìm thấy ĐH
              </div>
            )}
          </div>
        )
      },
    },
    {
      title: 'Kế Hoạch', key: 'khoach', width: 90, align: 'center',
      render: (_, r) => {
        const inKh = isInKhoach(r)
        const matchedPlans = khoachPlans.filter(p => {
          if (p.maSp !== r.maSp) return false
          if (r.maDonHang && p.maDonHang && r.maDonHang !== p.maDonHang) return false
          if (r.soLo && p.soLo && r.soLo !== p.soLo) return false
          return true
        })
        if (inKh) {
          const ngays = [...new Set(matchedPlans.map(p => p.ngayThucHien).filter(Boolean))]
            .sort().slice(0, 3)
            .map(d => dayjs(d).format('DD/MM'))
            .join(', ')
          return (
            <Tooltip title={ngays ? `Đã xếp vào: ${ngays}` : 'Đã có trong Kế hoạch'}>
              <Tag color="success" style={{ margin: 0, fontSize: 11, cursor: 'default' }}>
                ✓ Đã xếp
              </Tag>
            </Tooltip>
          )
        }
        return <span style={{ color: '#d9d9d9', fontSize: 11 }}>— Chưa xếp</span>
      },
    },
    {
      title: 'Cỡ Lô', dataIndex: 'soLuong', key: 'soLuong', width: 95, align: 'right',
      sorter: (a, b) => (Number(a.soLuong) || 0) - (Number(b.soLuong) || 0),
      render: v => v != null ? <span style={{ fontWeight: 700, color: '#374151' }}>{fmtNum(v)}</span> : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Tình Trạng', dataIndex: 'tinhTrang', key: 'tinhTrang', width: 105, align: 'center',
      render: v => {
        const cfg = TINH_TRANG_CFG[v]
        if (!cfg) return <span style={{ color: '#d9d9d9', fontSize: 11 }}>—</span>
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            color: cfg.text || cfg.color, fontWeight: 700, fontSize: 11,
            borderRadius: 12, padding: '2px 10px',
          }}>
            {cfg.icon} {cfg.label}
          </span>
        )
      },
    },
    {
      title: 'Phòng TH', dataIndex: 'phongThucHien', key: 'phong', width: 95,
      render: v => v || <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Tổ TH', dataIndex: 'toThucHien', key: 'to', width: 88, align: 'center',
      render: v => v
        ? <Tag style={{ background: `${TO_COLOR[v] || '#1D4ED8'}20`, color: TO_COLOR[v] || '#1D4ED8', border: `1px solid ${TO_COLOR[v] || '#1D4ED8'}55`, fontWeight: 700, marginRight: 0 }}>{v}</Tag>
        : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Số NV', dataIndex: 'soNguoiThucHien', key: 'soNv', width: 68, align: 'center',
      render: v => v != null ? <span style={{ fontWeight: 700, color: '#374151' }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Chú Ý', dataIndex: 'chuY', key: 'chuY', width: 150,
      render: v => v ? <span style={{ fontSize: 12, color: '#374151' }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Ghi Chú', dataIndex: 'ghiChu', key: 'ghiChu', width: 160,
      render: v => v ? <span style={{ fontSize: 12, color: '#64748b' }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Đã xếp', key: 'daLich', width: 80, align: 'center',
      render: (_, r) => (
        <Tooltip title={r.daLenLichLam ? 'Đã xếp lịch — click để bỏ (chuyển về Chưa xếp)' : 'Chưa xếp — click để đánh dấu đã xếp'}>
          <Checkbox
            checked={!!r.daLenLichLam}
            onClick={e => e.stopPropagation()}
            onChange={() => toggleBool(r.id, 'daLenLichLam', r.daLenLichLam)}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Đã ĐG & lịch ĐG', key: 'daDg', width: 95, align: 'center',
      render: (_, r) => (
        <Tooltip title={r.daDgVaXepLichDg ? 'Đã ĐG & xếp lịch ĐG — click để bỏ' : 'Chưa — click để đánh dấu'}>
          <Checkbox
            checked={!!r.daDgVaXepLichDg}
            onClick={e => e.stopPropagation()}
            onChange={() => toggleBool(r.id, 'daDgVaXepLichDg', r.daDgVaXepLichDg)}
          />
        </Tooltip>
      ),
    },
    ...(canEdit ? [{
      key: 'action', width: 120, fixed: 'right', align: 'center',
      title: () => (
        <Popconfirm
          title={`Xóa tất cả ${displayData.length} lệnh đang hiển thị?`}
          description="Các lệnh sẽ chuyển vào Thùng Rác, có thể khôi phục sau."
          okText="Xóa tất cả" cancelText="Hủy"
          okButtonProps={{ danger: true, loading: bulkDeleting }}
          onConfirm={() => handleBulkDelete(displayData.map(r => r.id))}
        >
          <Tooltip title="Xóa tất cả lệnh đang hiển thị">
            <Button size="small" type="text" danger icon={<DeleteOutlined />}
              style={{ fontSize: 10, opacity: 0.7 }} />
          </Tooltip>
        </Popconfirm>
      ),
      render: (_, r) => (
        <div onClick={e => e.stopPropagation()}>
          <Dropdown.Button
            size="small"
            type="primary"
            style={{ '--btn-bg': (r.daBanHanh || r.soLo) ? '#1D4ED8' : '#15803d' }}
            styles={{ button: { background: (r.daBanHanh || r.soLo) ? '#1D4ED8' : '#15803d', borderColor: (r.daBanHanh || r.soLo) ? '#1D4ED8' : '#15803d', fontWeight: 600 } }}
            icon={<DownOutlined />}
            onClick={() => openEdit(r)}
            menu={{
              items: [{
                key: 'delete',
                label: (
                  <Popconfirm title="Xóa lệnh này?" okText="Xóa" cancelText="Huỷ" okButtonProps={{ danger: true }}
                    onConfirm={() => deleteRow(r.id)}>
                    <span style={{ color: '#ef4444', fontWeight: 600 }}><DeleteOutlined /> Xóa lệnh</span>
                  </Popconfirm>
                ),
              }],
            }}
          >
            <EditOutlined /> {(r.daBanHanh || r.soLo) ? 'Cập nhật' : 'Ban hành'}
          </Dropdown.Button>
        </div>
      ),
    }] : []),
  ]

  // ── Row background ─────────────────────────────────────────────────────────
  const rowClassName = (r) => {
    if (r.tinhTrang === 'rat_gap') return 'lsx-row-rat-gap'
    if (r.tinhTrang === 'gap')     return 'lsx-row-gap'
    if (r.daBanHanh)               return 'lsx-row-ban-hanh'
    if (!r.daBanHanh && !r.soLo)   return 'lsx-row-chua-ban-hanh'
    if (r.maBravo && r.maDonHang && !donHangKeys.has(`${r.maBravo}||${r.maDonHang}`)) return 'lsx-row-no-dh'
    return ''
  }

  return (
    <>
      <style>{`
        /* ── Tab bar (match WorkSchedulePage style) ── */
        .lsx-tabs > .ant-tabs-nav {
          background: #1e4570 !important;
          padding: 0 12px; margin: 0 !important;
        }
        .lsx-tabs > .ant-tabs-nav .ant-tabs-tab {
          color: #CBD5E1 !important; font-size: 13px; padding: 8px 14px !important; margin: 0 2px !important;
          border-radius: 4px 4px 0 0;
        }
        .lsx-tabs > .ant-tabs-nav .ant-tabs-tab:hover { color: #fff !important; background: rgba(59,130,246,0.15) !important; }
        .lsx-tabs > .ant-tabs-nav .ant-tabs-tab-active { color: #fff !important; font-weight: 700 !important; background: rgba(29,78,216,0.25) !important; box-shadow: 0 -3px 0 #60A5FA inset; }
        .lsx-tabs > .ant-tabs-nav .ant-tabs-tab:last-child { border-left: 1px solid rgba(255,255,255,0.15) !important; margin-left: 8px !important; }
        .lsx-tabs > .ant-tabs-nav .ant-tabs-tab:last-child.ant-tabs-tab-active { background: rgba(29,78,216,0.25) !important; box-shadow: 0 -3px 0 #60A5FA inset; }
        .lsx-tabs > .ant-tabs-nav .ant-tabs-ink-bar { background: #60A5FA !important; }
        .lsx-tabs > .ant-tabs-nav::before { border: none !important; }
        .lsx-tabs > .ant-tabs-nav .ant-tabs-nav-more { color: #CBD5E1 !important; }

        /* ── Table ── */
        .lsx-table .ant-table-thead > tr > th {
          background: linear-gradient(90deg, #2980b3 0%, #3399CC 100%) !important; color: #ffffff !important;
          font-size: 11px !important; font-weight: 700 !important; text-transform: uppercase;
          padding: 7px 8px !important; white-space: nowrap; letter-spacing: 0.4px;
          border-right: 1px solid #4db3d4 !important;
        }
        .lsx-table .ant-table-thead > tr > th::before { display: none !important; }
        .lsx-table .ant-table-tbody > tr > td { padding: 6px 8px !important; vertical-align: middle; }
        .lsx-table .ant-table-tbody > tr:hover > td { background: #EAECF2 !important; }
        .lsx-table .ant-table-column-sort { background: transparent !important; }
        .lsx-table .ant-table-summary { background: #f0f4f8 !important; }
        .lsx-table .ant-table-summary td { padding: 5px 8px !important; }

        /* ── Priority row tints ── */
        .lsx-row-rat-gap { background: #fff1f0 !important; }
        .lsx-row-rat-gap:hover > td { background: #ffe4e4 !important; }
        .lsx-row-gap { background: #FF6600 !important; }
        .lsx-row-gap:hover > td { background: #e55a00 !important; }
        /* ── Lệnh CHƯA BAN HÀNH ── */
        .lsx-row-chua-ban-hanh > td { background: #FFCC33 !important; }
        .lsx-row-chua-ban-hanh:hover > td { background: #f5bc00 !important; }

        /* ── Lệnh chưa có Đơn Hàng tương ứng ── */
        .lsx-row-no-dh > td { background: #f5f3ff !important; }
        .lsx-row-no-dh > td:first-child { border-left: 3px solid #7c3aed !important; }
        .lsx-row-no-dh:hover > td { background: #ede9fe !important; }
      `}</style>

      {/* ── Tabs + Filter bar (sticky wrapper) ── */}
      <div ref={headerWrapRef} style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff' }}>
      <div style={{ position: 'relative' }}>
        {tabsVisible && (
          <Tabs
            className="lsx-tabs"
            activeKey={activeTab}
            onChange={k => setActiveTab(k)}
            items={tabItems}
            style={{ marginBottom: 0 }}
            tabBarExtraContent={{
              right: (
                <div style={{ paddingRight: 36, paddingBottom: 4, display: 'flex', alignItems: 'center' }}>
                  <Input
                    size="small"
                    allowClear
                    prefix={<SearchOutlined style={{ color: '#94a3b8', fontSize: 12 }} />}
                    placeholder="Tìm sản phẩm..."
                    value={filterMaSp}
                    onChange={e => setFilterMaSp(e.target.value)}
                    style={{
                      width: 190,
                      background: 'rgba(255,255,255,0.08)',
                      borderColor: 'rgba(255,255,255,0.2)',
                      color: '#e2e8f0',
                      borderRadius: 6,
                    }}
                  />
                </div>
              ),
            }}
          />
        )}
        <Tooltip title={tabsVisible ? 'Ẩn tab nhóm' : 'Hiện tab nhóm'}>
          <Button
            size="small"
            type="text"
            icon={tabsVisible ? <UpOutlined /> : <DownOutlined />}
            onClick={() => setTabsVisible(v => {
              const next = !v
              localStorage.setItem('lsx_tabs_visible', String(next))
              return next
            })}
            style={{
              position: 'absolute',
              right: 8,
              top: tabsVisible ? 6 : 2,
              zIndex: 1,
              fontSize: 11,
              color: '#94a3b8',
              lineHeight: 1,
            }}
          />
        </Tooltip>
      </div>

      {/* ── Filter bar ── */}
      <div style={{
        background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
        padding: '8px 12px', display: 'flex', alignItems: 'center',
        gap: 8, flexWrap: 'wrap',
      }}>
        <RangePicker
          size="small" format="DD/MM/YYYY"
          placeholder={['Từ ngày PL', 'Đến ngày PL']}
          value={dateRange}
          onChange={v => setDateRange(v || [null, null])}
          style={{ width: 230 }}
        />
        <Input size="small" allowClear style={{ width: 140 }}
          placeholder="Mã SP / Bravo / Tên"
          value={filterMaSp} onChange={e => setFilterMaSp(e.target.value)} />
        <Input size="small" allowClear style={{ width: 110 }}
          placeholder="Số lô"
          value={filterSoLo} onChange={e => setFilterSoLo(e.target.value)} />
        <Select size="small" allowClear placeholder="Tình trạng" style={{ width: 120 }}
          value={filterTT} onChange={v => setFilterTT(v ?? null)}>
          <Option value="rat_gap"><FireOutlined style={{ color: '#cf1322' }} /> Rất Gấp</Option>
          <Option value="gap"><ThunderboltOutlined style={{ color: '#d46b08' }} /> Gấp</Option>
        </Select>

        <Button size="small" type="primary" icon={<SearchOutlined />} onClick={load}
          style={{ background: '#1D4ED8', borderColor: '#1D4ED8' }}>
          Tìm
        </Button>
        <Button size="small" icon={<ReloadOutlined />} onClick={load} loading={loading} />


        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* KPI badges */}
          {[
            { label: 'Rất Gấp', val: kpi.ratGap, color: '#cf1322', bg: '#fff1f0', border: '#ffa39e' },
            { label: 'Gấp',     val: kpi.gap,    color: '#FF6600', bg: '#fff2e8', border: '#FF6600' },
            { label: 'Đã lịch', val: kpi.daLich, color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
            { label: 'Đã ĐG',   val: kpi.daDg,   color: '#7c3aed', bg: '#faf5ff', border: '#c4b5fd' },
          ].map(k => (
            <span key={k.label} style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px',
              background: k.bg, border: `1px solid ${k.border}`,
              color: k.color, borderRadius: 10,
            }}>
              {k.label} <span style={{ fontSize: 13 }}>{k.val}</span>
            </span>
          ))}

          {canEdit && (
            <Button size="small" icon={<SyncOutlined />} onClick={handleSyncAllSanLuong}
              loading={syncingAll}
              style={{ fontWeight: 600, borderColor: '#339999', color: '#339999' }}>
              Đồng bộ SL
            </Button>
          )}
          {canEdit && (
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openAdd}
              style={{ background: '#1D4ED8', borderColor: '#1D4ED8', fontWeight: 600 }}>
              Thêm lệnh
            </Button>
          )}
        </div>
      </div>
      </div>{/* end sticky wrapper */}

      {/* ── Table ── */}
      <Table
        className="lsx-table"
        columns={columns}
        dataSource={displayData}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 1884 }}
        sticky={{ offsetHeader: headerOffset }}
        rowHoverable={false}
        rowSelection={rowSelection}
        rowClassName={rowClassName}
        onRow={r => ({
          onClick: () => canEdit ? openEdit(r) : (setDetailRecord(r), setDetailOpen(true)),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          defaultPageSize: 50,
          pageSizeOptions: ['20', '50', '100'],
          showSizeChanger: true,
          showTotal: t => `Tổng ${t} lệnh`,
        }}
        summary={pageData => {
          const total = pageData.length
          const ratGap = pageData.filter(r => r.tinhTrang === 'rat_gap').length
          const gap    = pageData.filter(r => r.tinhTrang === 'gap').length
          const daLich = pageData.filter(r => r.daLenLichLam).length
          return (
            <Table.Summary fixed="bottom">
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={6} align="right">
                  <strong style={{ color: '#1D4ED8', fontSize: 11 }}>Trang hiện tại: {total} lệnh</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} colSpan={2} align="center">
                  {ratGap > 0 && <Tag color="red" style={{ marginRight: 4 }}>Rất Gấp: {ratGap}</Tag>}
                  {gap    > 0 && <Tag color="orange">Gấp: {gap}</Tag>}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8} colSpan={5} />
                <Table.Summary.Cell index={13} align="center">
                  <span style={{ fontSize: 11, color: '#1D4ED8', fontWeight: 600 }}>Đã lịch: {daLich}/{total}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={14} colSpan={3} />
              </Table.Summary.Row>
            </Table.Summary>
          )
        }}
      />

      {/* ── Bulk action bar (hiện khi chọn hàng) ── */}
      {canEdit && selectedRowKeys.length > 0 && (
        <div style={{
          position: 'sticky', bottom: 0, zIndex: 30,
          background: '#1e3a5f', borderTop: '2px solid #3b82f6',
          padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 -4px 16px rgba(29,78,216,0.25)',
        }}>
          <span style={{ color: '#93c5fd', fontWeight: 700, fontSize: 13 }}>
            Đã chọn {selectedRowKeys.length} lệnh
          </span>
          <Popconfirm
            title={`Xóa ${selectedRowKeys.length} lệnh đã chọn?`}
            description="Các lệnh sẽ chuyển vào Thùng Rác, có thể khôi phục sau."
            okText="Xóa" cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleBulkDelete(selectedRowKeys)}
          >
            <Button danger icon={<DeleteOutlined />} loading={bulkDeleting} style={{ fontWeight: 700 }}>
              Xóa đã chọn
            </Button>
          </Popconfirm>
          <Button onClick={() => setSelectedRowKeys([])} style={{ marginLeft: 'auto' }}>
            Bỏ chọn
          </Button>
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      <LenhModal
        open={modalOpen}
        editItem={editItem}
        defaultTo={activeTab || null}
        onClose={() => setModalOpen(false)}
        onSaved={onSaved}
        allRecords={data}
      />

      {/* ── KhoachLink Drawer ── */}
      <KhoachLinkDrawer
        open={klOpen}
        maSp={klRecord?.maSp}
        soLo={klRecord?.soLo}
        tenSanPham={klRecord?.tenSanPham}
        onClose={() => setKlOpen(false)}
      />

      {/* ── Record Detail Drawer ── */}
      <RecordDetailDrawer
        open={detailOpen}
        record={detailRecord}
        canEdit={canEdit}
        onClose={() => setDetailOpen(false)}
        onSaved={(saved) => { load(); if (saved?.ngayThucHien && saved?.toThucHien) autoFillKhoach(saved) }}
        onDeleted={(id) => setData(prev => prev.filter(r => r.id !== id))}
        allRecords={data}
      />
    </>
  )
}
