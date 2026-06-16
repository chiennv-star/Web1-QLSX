import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  DatePicker, Button, Spin, message, Modal, Form, Alert,
  Input, InputNumber, Select, Space, Row, Col, Tooltip, Tag, Dropdown, Tabs, List, Badge, Progress, Popover, AutoComplete,
} from 'antd'
import {
  SearchOutlined, ReloadOutlined, PlusOutlined,
  DeleteOutlined, SyncOutlined, CheckCircleOutlined,
  CopyOutlined, ScissorOutlined, CloseCircleOutlined, FileTextOutlined,
  CalendarOutlined, ShoppingOutlined, HistoryOutlined, SwapOutlined, BarChartOutlined,
  FormOutlined, UnorderedListOutlined, CheckSquareOutlined,
  FullscreenOutlined, FullscreenExitOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import PhongThucHienSelect from '../components/PhongThucHienSelect'
import DonHangPage from './DonHangPage'
import LenhSanXuatTab from './LenhSanXuatTab'

dayjs.extend(isoWeek)

const { RangePicker } = DatePicker
const { TextArea } = Input
const { Option } = Select

const DAY_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

const TO_GROUPS = [
  { key: 'PCPL1', label: 'PCPL1', headerBg: '#37474f', headerText: '#fff', bodyBg: '#f5f6f7' },
  { key: 'PCPL2', label: 'PCPL2', headerBg: '#546e7a', headerText: '#fff', bodyBg: '#f8f9fa' },
  { key: 'PCPL3', label: 'PCPL3', headerBg: '#607d8b', headerText: '#fff', bodyBg: '#f5f7f8' },
]

const GROUP_DEFAULT_CD = { PCPL1: 'PC', PCPL2: 'PC', PCPL3: 'PL' }
const CONG_DOAN_LABEL  = { PC: 'PC – Pha chế', BBC1: 'BBC1 – Chiết', PL: 'PL', DG: 'ĐG – Đóng gói', CC: 'CC – Cân chia' }
const CONG_DOAN_PREFIX = { PC: 'Pha chế', BBC1: 'Chiết', PL: 'PL', DG: 'ĐG', CC: 'CC' }
const CONG_FIELD_MAP   = { PC: 'congPc', BBC1: 'congBbc1', PL: 'congPl', DG: 'congDg', CC: 'congCc' }
const CONG_LABEL_MAP   = { PC: 'Số người thực hiện', BBC1: 'Công BBC1', PL: 'Số người thực hiện', DG: 'Công ĐG', CC: 'Công CC' }

function getDates(from, to) {
  const dates = []
  let cur = dayjs(from)
  const end = dayjs(to)
  while (!cur.isAfter(end)) {
    dates.push(cur.format('YYYY-MM-DD'))
    cur = cur.add(1, 'day')
  }
  return dates
}

function checkUrgent(r) {
  const t = `${r.tenTrinh || ''} ${r.chuY || ''} ${r.saiLech || ''}`.toUpperCase()
  return t.includes('GẤP') || t.includes('GAP')
}

// ── Plan Modal ────────────────────────────────────────────────────────────────
function PlanModal({ open, editItem, defaultToNhom, defaultDate, onClose, onSaved, onReloadData, donHangList = [], donHangLoading = false }) {
  const [form]         = Form.useForm()
  const [doiCoLoForm]  = Form.useForm()
  const [congDoan, setCongDoan] = useState('PC')
  const [lookupStatus,   setLookupStatus]   = useState(null) // maSp lookup
  const [bravoStatus,    setBravoStatus]    = useState(null) // maBravo lookup
  const [donHangStatus,  setDonHangStatus]  = useState(null) // maDonHang lookup
  const timerRef      = useRef(null)
  const bravoTimerRef = useRef(null)
  const donHangTimerRef = useRef(null)
  const soLoTimerRef  = useRef(null)
  const [doiCoLoOpen,    setDoiCoLoOpen]    = useState(false)
  const [doiCoLoLoading, setDoiCoLoLoading] = useState(false)
  const [lichSuCoLo,     setLichSuCoLo]     = useState([])
  const [lichSuLoading,  setLichSuLoading]  = useState(false)
  // Theo dõi coLo hiện tại sau khi đổi — tránh hiển thị giá trị cũ từ editItem
  const [currentCoLo,    setCurrentCoLo]    = useState(editItem?.coLo ?? null)
  const [soLuongDon,     setSoLuongDon]     = useState(null)
  const [loHistory,      setLoHistory]      = useState([])
  const [loHistoryOpen,  setLoHistoryOpen]  = useState(false)
  const [bravoPickerOpen, setBravoPickerOpen] = useState(false) // gợi ý đơn hàng khi gõ bravo
  const [bravoInput,      setBravoInput]      = useState('')    // giá trị đang gõ
  const [bravoOptions,    setBravoOptions]    = useState([])    // autocomplete suggestions
  const justSelectedBravo = useRef(false)
  const [isDirty, setIsDirty] = useState(false)
  const [dhPickerOpen,    setDhPickerOpen]    = useState(false) // gợi ý đơn hàng khi gõ maDonHang
  const [dhInput,         setDhInput]         = useState('')    // giá trị đang gõ maDonHang
  const [soLoSuggestions,    setSoLoSuggestions]    = useState([])    // danh sách soLo gợi ý từ PCPL1/PCPL2
  const [soLoLookupLoading,  setSoLoLookupLoading]  = useState(false) // đang tra cứu soLo từ PC

  // Đồng bộ currentCoLo khi mở modal với editItem mới
  useEffect(() => {
    setCurrentCoLo(editItem?.coLo ?? null)
  }, [editItem?.id]) // chỉ reset khi mở record khác, không reset sau doiCoLo

  useEffect(() => {
    if (!open) return
    setIsDirty(false)
    if (editItem) {
      const cd = editItem.congDoan || GROUP_DEFAULT_CD[editItem.toNhom] || 'PC'
      setCongDoan(cd)
      const congField = CONG_FIELD_MAP[cd]
      form.setFieldsValue({
        maBravo:   editItem.maBravo   || '',
        maDonHang: editItem.maDonHang || '',
        ngayThucHien: editItem.ngayThucHien ? dayjs(editItem.ngayThucHien) : null,
        congDoan:  cd,
        toNhom:    editItem.toNhom || defaultToNhom,
        maSp:      editItem.maSp      || '',
        tenTrinh:  editItem.tenTrinh  || '',
        soLo:      editItem.soLo      || '',
        coLo:      editItem.coLo      != null ? Number(editItem.coLo) : null,
        cong:          editItem[congField]         != null ? Number(editItem[congField]) : null,
        phongThucHien: editItem.phongThucHien      || '',
        chuY:          editItem.chuY               || '',
        saiLech:       editItem.saiLech            || '',
        tinhTrang:     editItem.tinhTrang          || '',
      })
      setLookupStatus(null)
      setBravoStatus(null)
      setDonHangStatus(null)
      setSoLuongDon(null)
      setDhPickerOpen(false)
      setDhInput('')

      // Auto-fetch SL đơn từ DonHang
      if (editItem.maBravo && editItem.maDonHang) {
        api.get('/don-hang').then(({ data }) => {
          const list = Array.isArray(data) ? data : (data.content || [])
          const dh = list.find(d => d.maBravo === editItem.maBravo && d.maDonHang === editItem.maDonHang)
          if (dh) setSoLuongDon(dh.soLuongDatHang)
        }).catch(() => {})
      }

      setLoHistory([])
    } else {
      const cd = GROUP_DEFAULT_CD[defaultToNhom] || 'PC'
      setCongDoan(cd)
      form.resetFields()
      form.setFieldsValue({
        ngayThucHien: defaultDate ? dayjs(defaultDate) : dayjs(),
        congDoan: cd,
        toNhom:   defaultToNhom,
      })
      setLookupStatus(null)
      setBravoStatus(null)
      setDonHangStatus(null)
      setSoLuongDon(null)
      setLoHistory([])
      setDhPickerOpen(false)
      setDhInput('')
      setSoLoSuggestions([])
    }
  }, [open, editItem])

  // Lookup by Mã Bravo → auto-fill maSp + tenTrinh + mở gợi ý đơn hàng
  const handleBravoChange = (val) => {
    if (justSelectedBravo.current) return
    const trimmed = (typeof val === 'string' ? val : val?.target?.value)?.trim()
    setBravoInput(trimmed || '')
    setBravoPickerOpen(!!trimmed)
    if (bravoTimerRef.current) clearTimeout(bravoTimerRef.current)
    if (!trimmed) { setBravoStatus(null); return }
    setBravoStatus('loading')
    bravoTimerRef.current = setTimeout(async () => {
      try {
        const { data: master } = await api.get(`/product-master/lookup-by-bravo/${encodeURIComponent(trimmed)}`)
        form.setFieldsValue({ maSp: master.maTp || '', tenTrinh: master.tienTrinh || '' })
        setBravoStatus('found')
        setLookupStatus(null)
      } catch { setBravoStatus('not_found') }
    }, 500)
  }

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
    justSelectedBravo.current = true
    const p = option.raw
    form.setFieldsValue({ maBravo: p.maBravo, maSp: p.maTp || '', tenTrinh: p.tienTrinh || '' })
    setBravoStatus('found')
    setBravoOptions([])
    setBravoPickerOpen(false)
    setTimeout(() => { justSelectedBravo.current = false }, 150)
  }

  // Lookup by Mã Đơn Hàng → auto-fill maBravo + maSp + soLuongDon from DonHang
  const handleMaDonHangChange = (e) => {
    const val = e.target.value?.trim()
    setDhInput(val || '')
    setDhPickerOpen(true)
    if (donHangTimerRef.current) clearTimeout(donHangTimerRef.current)
    if (!val) { setDonHangStatus(null); setSoLuongDon(null); return }
    setDonHangStatus('loading')
    donHangTimerRef.current = setTimeout(async () => {
      try {
        const { data: dhRes } = await api.get('/don-hang')
        const dhList = Array.isArray(dhRes) ? dhRes : (dhRes.content || [])
        const dh = dhList.find(d => d.maDonHang === val)
        if (dh) {
          setDonHangStatus('found')
          const updates = {}
          if (!form.getFieldValue('maBravo') && dh.maBravo) {
            updates.maBravo = dh.maBravo
            setBravoStatus('found')
          }
          if (!form.getFieldValue('maSp') && dh.maSp) {
            updates.maSp = dh.maSp
            setLookupStatus('found')
          }
          if (!form.getFieldValue('tenTrinh') && dh.tenSanPham) {
            updates.tenTrinh = dh.tenSanPham
          }
          if (Object.keys(updates).length > 0) form.setFieldsValue(updates)
          setSoLuongDon(dh.soLuongDatHang)
          if (!form.getFieldValue('coLo') && dh.soLuongDatHang != null) {
            form.setFieldsValue({ coLo: Number(dh.soLuongDatHang) })
          }
        } else {
          setDonHangStatus('not_found')
          setSoLuongDon(null)
        }
      } catch { setDonHangStatus(null) }
    }, 500)
  }

  // Lookup by Số Lô — no longer uses Lệnh SX
  const handleSoLoChange = (_e) => {
    // Removed: was looking up maDonHang from Lệnh SX
  }

  // Tra cứu soLo từ PCPL1/PCPL2 cho PCPL3 — lọc theo maDonHang + coLo
  const lookupSoLoFromPC = useCallback(async (maDonHang, coLo) => {
    if (!maDonHang) return
    setSoLoLookupLoading(true)
    setSoLoSuggestions([])
    form.setFieldsValue({ soLo: '' })
    try {
      const { data } = await api.get('/work-schedule', {
        params: { maDonHang, congDoan: 'PC', source: 'PLAN', page: 0, size: 100 }
      })
      const records = (data.content || []).filter(r => r.soLo)
      const filtered = coLo != null
        ? records.filter(r => Number(r.coLo) === Number(coLo))
        : records
      const uniqueSoLo = [...new Set(filtered.map(r => r.soLo))]
      if (uniqueSoLo.length === 1) {
        form.setFieldsValue({ soLo: uniqueSoLo[0] })
      } else if (uniqueSoLo.length > 1) {
        setSoLoSuggestions(uniqueSoLo)
      }
    } catch { /* silent */ }
    finally { setSoLoLookupLoading(false) }
  }, [form])

  // Lookup by Mã SP → auto-fill tenTrinh
  const handleMaSpChange = (e) => {
    const val = e.target.value?.trim()
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!val) { setLookupStatus(null); return }
    setLookupStatus('loading')
    timerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/product-master/lookup/${encodeURIComponent(val)}`)
        form.setFieldsValue({ tenTrinh: data.tienTrinh || '' })
        setLookupStatus('found')
      } catch { setLookupStatus('not_found') }
    }, 500)
  }

  const openDoiCoLo = async () => {
    setDoiCoLoOpen(true)
    doiCoLoForm.resetFields()
    setLichSuLoading(true)
    try {
      const [{ data: histData }, { data: record }] = await Promise.all([
        api.get(`/work-schedule/${editItem.id}/lich-su-co-lo`),
        api.get(`/work-schedule/${editItem.id}`),
      ])
      setLichSuCoLo(Array.isArray(histData) ? histData : [])
      // Luôn lấy coLo mới nhất từ DB, tránh stale từ editItem prop
      const freshCoLo = record.coLo != null ? Number(record.coLo) : null
      setCurrentCoLo(freshCoLo)
      form.setFieldsValue({ coLo: freshCoLo })
      // Nếu DB có coLo khác với data page-load → refresh card ngoài lịch
      const pageCoLo = editItem?.coLo != null ? Number(editItem.coLo) : null
      if (freshCoLo !== pageCoLo) onReloadData?.()
    } catch { setLichSuCoLo([]) }
    finally { setLichSuLoading(false) }
  }

  const handleDoiCoLo = async () => {
    let vals
    try { vals = await doiCoLoForm.validateFields() } catch { return }
    setDoiCoLoLoading(true)
    try {
      const { data: updated } = await api.post(`/work-schedule/${editItem.id}/doi-co-lo`, {
        coLoMoi: Number(vals.coLoMoi),
        lyDo:    vals.lyDo || '',
      })
      message.success('Đã đổi Cỡ Lô thành công')
      setDoiCoLoOpen(false)
      const newCoLo = updated.coLo != null ? Number(updated.coLo) : null
      form.setFieldsValue({ coLo: newCoLo })
      setCurrentCoLo(newCoLo)  // cập nhật label "Cỡ lô hiện tại" ngay lập tức
      await onSaved({ ...editItem, coLo: updated.coLo })
    } catch { message.error('Đổi Cỡ Lô thất bại') }
    finally { setDoiCoLoLoading(false) }
  }

  const onOk = async () => {
    try {
      const values = await form.validateFields()
      const cd = values.congDoan
      const congField = CONG_FIELD_MAP[cd]
      const base = editItem ? {
        slPc: editItem.slPc, slBbc1: editItem.slBbc1,
        slPl: editItem.slPl, slDg: editItem.slDg,
      } : {}
      const payload = {
        ...base,
        source:    'PLAN',
        ngayThucHien: values.ngayThucHien?.format('YYYY-MM-DD'),
        congDoan:  cd,
        toNhom:    values.toNhom    || null,
        maBravo:   values.maBravo   || null,
        maDonHang: values.maDonHang?.trim() || (editItem ? editItem.maDonHang : null) || null,
        maSp:      values.maSp      || null,
        tenTrinh:  values.tenTrinh  || null,
        soLo:      values.soLo || editItem?.soLo || null,
        coLo:      values.coLo      ?? editItem?.coLo ?? null,
        [congField]:   values.cong          ?? null,
        phongThucHien: values.phongThucHien || null,
        chuY:          values.chuY          || null,
        saiLech:       values.saiLech       || null,
        tinhTrang:     values.tinhTrang     || null,
      }
      if (editItem) {
        await api.put(`/work-schedule/${editItem.id}`, payload)
        message.success('Cập nhật thành công')
      } else {
        const { data: newWs } = await api.post('/work-schedule', payload)
        message.success('Thêm mới thành công')
        // Auto-create LenhSanXuat nếu là PLAN record
        if (payload.source === 'PLAN' && newWs?.id) {
          api.post(`/lenh-san-xuat/from-work-schedule/${newWs.id}`).catch(() => {})
        }
      }
      setIsDirty(false)
      onSaved(payload)
      onClose()
    } catch (err) {
      if (err?.response) message.error(err.response.data?.message || 'Lưu thất bại')
    }
  }

  const handleClose = () => {
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
      title={editItem ? 'Chỉnh sửa kế hoạch' : 'Thêm kế hoạch mới'}
      open={open}
      onOk={onOk}
      onCancel={handleClose}
      okText={editItem ? 'Cập nhật' : 'Lưu'}
      cancelText="Hủy"
      width={740}
      destroyOnClose
      okButtonProps={isDirty ? {
        style: { boxShadow: '0 0 0 3px rgba(22,119,255,0.45)', fontWeight: 700 }
      } : {}}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }} onValuesChange={() => setIsDirty(true)}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Ngày thực hiện" name="ngayThucHien" rules={[{ required: true, message: 'Chọn ngày' }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Tổ/Nhóm" name="toNhom" rules={[{ required: true }]}>
              <Select>
                {TO_GROUPS.map(g => <Option key={g.key} value={g.key}>{g.label}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Công đoạn" name="congDoan" rules={[{ required: true }]}>
              <Select onChange={val => setCongDoan(val)}>
                {Object.entries(CONG_DOAN_LABEL).map(([v, l]) =>
                  <Option key={v} value={v}>{l}</Option>
                )}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={8} style={{ position: 'relative' }}>
            <Form.Item
              label={
                <Space size={4}>
                  <span>Mã Bravo</span>
                  {!editItem && bravoStatus === 'loading'   && <SyncOutlined spin style={{ color: '#1677ff' }} />}
                  {!editItem && bravoStatus === 'found'     && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  {!editItem && bravoStatus === 'not_found' && <Tag color="red" style={{ margin: 0, fontSize: 10 }}>?</Tag>}
                </Space>
              }
              name="maBravo"
            >
              {editItem ? (
                <Input
                  disabled
                  placeholder="VD: 10602153"
                  style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff', background: '#f8fafc' }}
                />
              ) : (
                <AutoComplete
                  options={bravoOptions}
                  onSearch={handleBravoSearch}
                  onSelect={handleBravoSelect}
                  onChange={handleBravoChange}
                  allowClear
                  placeholder="Gõ tên SP hoặc mã Bravo..."
                  popupMatchSelectWidth={380}
                  style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}
                />
              )}
            </Form.Item>
            {/* ── Dropdown gợi ý đơn hàng theo maBravo ── */}
            {!editItem && bravoPickerOpen && (() => {
              const q = (bravoInput || '').toLowerCase()
              const filtered = q
                ? donHangList.filter(dh => dh.maBravo && dh.maBravo.toLowerCase().includes(q))
                : []
              if (filtered.length === 0) return null
              return (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1050,
                  background: '#fff', border: '1px solid #d9d9d9',
                  borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.13)',
                  maxHeight: 280, overflowY: 'auto', marginTop: -16,
                }}>
                  <div style={{
                    padding: '6px 10px', fontWeight: 700, fontSize: 11,
                    color: '#1d4ed8', borderBottom: '1px solid #f0f0f0',
                    background: '#f8fbff',
                  }}>
                    📋 {filtered.length} đơn hàng — nhấn để điền tự động
                  </div>
                  {filtered.map(dh => (
                    <div
                      key={dh.id}
                      onMouseDown={e => {
                        // mousedown trước blur → không bị đóng bởi onBlur
                        e.preventDefault()
                        const updates = {}
                        if (dh.tenSanPham || dh.maSp) updates.tenTrinh  = dh.tenSanPham || dh.maSp
                        if (dh.maDonHang)              updates.maDonHang = dh.maDonHang
                        if (dh.maSp)                   updates.maSp      = dh.maSp
                        if (dh.soLo)                   updates.soLo      = dh.soLo
                        if (dh.soLuongDatHang != null) {
                          updates.coLo = Number(dh.soLuongDatHang)
                          setSoLuongDon(dh.soLuongDatHang)
                        }
                        form.setFieldsValue(updates)
                        setBravoPickerOpen(false)
                        setBravoInput('')
                        setBravoStatus('found')
                        if (dh.maDonHang) setDonHangStatus('found')
                        if (congDoan === 'PL') lookupSoLoFromPC(dh.maDonHang, dh.soLuongDatHang)
                      }}
                      style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <div style={{ fontWeight: 600, fontSize: 12, color: '#1e293b', lineHeight: 1.4 }}>
                        {dh.tenSanPham || dh.maSp || '(Chưa có tên)'}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                        <span style={{ fontFamily: 'monospace', color: '#1677ff', fontWeight: 600 }}>
                          {dh.maDonHang || '—'}
                        </span>
                        {dh.soLuongDatHang != null && (
                          <span style={{ marginLeft: 8, color: '#389e0d', fontWeight: 600 }}>
                            SL: {Number(dh.soLuongDatHang).toLocaleString('vi-VN')}
                          </span>
                        )}
                        {dh.soLo && <span style={{ marginLeft: 8, color: '#8c8c8c' }}>Lô: {dh.soLo}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </Col>
          <Col span={10} style={{ position: 'relative' }}>
            <Form.Item
              label={
                <Space size={4}>
                  <span>Mã Đơn Hàng</span>
                  {!editItem && donHangStatus === 'loading'   && <SyncOutlined spin style={{ color: '#1677ff' }} />}
                  {!editItem && donHangStatus === 'found'     && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  {!editItem && donHangStatus === 'not_found' && <Tag color="orange" style={{ margin: 0, fontSize: 10 }}>Không tìm thấy</Tag>}
                </Space>
              }
              name="maDonHang"
              rules={[{ required: true, message: 'Nhập mã đơn hàng' }]}
            >
              <Input
                onChange={editItem ? undefined : handleMaDonHangChange}
                onBlur={editItem ? undefined : () => setTimeout(() => setDhPickerOpen(false), 200)}
                onFocus={editItem ? undefined : (e) => { setDhInput(e.target.value?.trim() || ''); setDhPickerOpen(true) }}
                disabled={!!editItem}
                allowClear={!editItem}
                placeholder="VD: DH-002"
                autoComplete="off"
                style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff', background: editItem ? '#f8fafc' : undefined }}
              />
            </Form.Item>
            {/* ── Dropdown gợi ý đơn hàng theo maDonHang ── */}
            {!editItem && dhPickerOpen && (() => {
              const q = (dhInput || '').toLowerCase()
              const matchFn = dh => !q || dh.maDonHang.toLowerCase().includes(q) || (dh.maBravo || '').toLowerCase().includes(q) || (dh.tenSanPham || '').toLowerCase().includes(q)
              const activeDh = donHangList.filter(dh => dh.tinhTrangSx !== 'done' && dh.maDonHang && matchFn(dh)).slice(0, 20)
              const doneDh   = q ? donHangList.filter(dh => dh.tinhTrangSx === 'done' && dh.maDonHang && matchFn(dh)).slice(0, 10) : []
              const filtered = [...activeDh, ...doneDh]
              if (filtered.length === 0) return null
              return (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1050,
                  background: '#fff', border: '1px solid #d9d9d9',
                  borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.13)',
                  maxHeight: 300, overflowY: 'auto', marginTop: -16,
                }}>
                  <div style={{
                    padding: '6px 10px', fontWeight: 700, fontSize: 11,
                    color: '#1d4ed8', borderBottom: '1px solid #f0f0f0',
                    background: '#f8fbff',
                  }}>
                    📋 {activeDh.length} đơn hàng chưa hoàn thành{doneDh.length > 0 ? ` · ${doneDh.length} đã hoàn thành PC` : ''} — nhấn để điền tự động
                  </div>
                  {filtered.map((dh, dhIdx) => {
                    const isDoneDh = dh.tinhTrangSx === 'done'
                    const isFirstDone = isDoneDh && dhIdx === activeDh.length
                    const slConLai = dh.slConLai ?? ((Number(dh.soLuongDatHang) || 0) - (Number(dh.slDaXepKh) || 0))
                    const isRatGap = dh.tinhTrangDatHang === 'rat_gap'
                    const isGap    = dh.tinhTrangDatHang === 'gap'
                    return (
                      <React.Fragment key={dh.id}>
                        {isFirstDone && (
                          <div style={{ padding: '4px 10px', fontSize: 10, color: '#888', background: '#f5f5f5', borderBottom: '1px solid #e8e8e8', fontStyle: 'italic' }}>
                            — Đã hoàn thành pha chế — có thể xếp lịch phân liều —
                          </div>
                        )}
                        <div
                          onMouseDown={e => {
                            e.preventDefault()
                            const updates = {}
                            if (dh.maDonHang)              updates.maDonHang = dh.maDonHang
                            if (dh.maBravo)                updates.maBravo   = dh.maBravo
                            if (dh.tenSanPham || dh.maSp)  updates.tenTrinh  = dh.tenSanPham || dh.maSp
                            if (dh.maSp)                   updates.maSp      = dh.maSp
                            if (dh.soLo)                   updates.soLo      = dh.soLo
                            if (dh.soLuongDatHang != null) {
                              updates.coLo = Number(dh.soLuongDatHang)
                              setSoLuongDon(dh.soLuongDatHang)
                            }
                            form.setFieldsValue(updates)
                            setDhPickerOpen(false)
                            setDhInput('')
                            setDonHangStatus('found')
                            if (dh.maBravo) setBravoStatus('found')
                            if (congDoan === 'PL') lookupSoLoFromPC(dh.maDonHang, dh.soLuongDatHang)
                          }}
                          style={{ padding: '7px 10px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', transition: 'background 0.1s', opacity: isDoneDh ? 0.7 : 1, background: isDoneDh ? '#fafff8' : undefined }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                          onMouseLeave={e => e.currentTarget.style.background = isDoneDh ? '#fafff8' : ''}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: '#1677ff' }}>
                              {dh.maDonHang}
                            </span>
                            {dh.maBravo && (
                              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#8c8c8c' }}>
                                · {dh.maBravo}
                              </span>
                            )}
                            {isRatGap && <Tag color="red" style={{ margin: 0, fontSize: 10, lineHeight: '16px' }}>Rất GẤP</Tag>}
                            {!isRatGap && isGap && <Tag color="orange" style={{ margin: 0, fontSize: 10, lineHeight: '16px' }}>GẤP</Tag>}
                            {isDoneDh && <Tag color="success" style={{ margin: 0, fontSize: 10, lineHeight: '16px' }}>✓ Đã xếp PC</Tag>}
                          </div>
                          <div style={{ fontSize: 11, color: '#374151', marginTop: 2, lineHeight: 1.4 }}>
                            {dh.tenSanPham || dh.maSp || '(Chưa có tên)'}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 1, display: 'flex', gap: 10 }}>
                            {dh.soLuongDatHang != null && (
                              <span>SL ĐH: <b style={{ color: '#1e293b' }}>{Number(dh.soLuongDatHang).toLocaleString('vi-VN')}</b></span>
                            )}
                            {slConLai > 0 && (
                              <span style={{ color: '#d97706' }}>Còn lại: <b>{slConLai.toLocaleString('vi-VN')}</b></span>
                            )}
                            {slConLai <= 0 && dh.soLuongDatHang != null && (
                              <span style={{ color: '#16a34a' }}>✓ Đã xếp đủ</span>
                            )}
                            {dh.soLo && <span style={{ color: '#8c8c8c' }}>Lô: {dh.soLo}</span>}
                          </div>
                        </div>
                      </React.Fragment>
                    )
                  })}
                </div>
              )
            })()}
          </Col>
          <Col span={6}>
            <Form.Item label="Mã SP" name="maSp">
              <Input
                onChange={editItem ? undefined : handleMaSpChange}
                disabled={!!editItem}
                allowClear={!editItem}
                placeholder="Tự điền khi tra Bravo"
                style={{ background: editItem ? '#f8fafc' : undefined }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Tiến trình" name="tenTrinh" rules={[{ required: true, message: 'Nhập tiến trình' }]}>
          <TextArea
            disabled={!!editItem}
            autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="Tên sản phẩm / quy trình"
            style={{ background: editItem ? '#f8fafc' : undefined, color: editItem ? '#374151' : undefined }}
          />
        </Form.Item>

        <Row gutter={12}>
          <Col span={6}>
            <Form.Item label={CONG_LABEL_MAP[congDoan] || 'Công'} name="cong"
              rules={[{ required: true, message: 'Bắt buộc nhập' }]}>
              <InputNumber style={{ width: '100%' }} step={0.5} min={0} />
            </Form.Item>
          </Col>
          <Col span={6}>
            {editItem?.coLo != null && editItem?.id ? (
              <Form.Item label="Cỡ lô"
                help={soLuongDon != null
                  ? <span style={{ fontSize: 10, color: '#1D4ED8' }}>SL đơn: {Number(soLuongDon).toLocaleString('vi-VN')}</span>
                  : <span style={{ fontSize: 10, color: '#94a3b8' }}>Đã khoá — dùng "Đổi Cỡ Lô"</span>}>
                <Space.Compact style={{ width: '100%' }}>
                  <div style={{
                    flex: 1, height: 32, lineHeight: '32px', padding: '0 11px',
                    border: '1px solid #d9d9d9', borderRadius: '6px 0 0 6px',
                    background: '#f5f5f5', color: '#000', fontSize: 14,
                    overflow: 'hidden', whiteSpace: 'nowrap',
                  }}>
                    {currentCoLo != null ? Number(currentCoLo).toLocaleString('vi-VN') : Number(editItem.coLo).toLocaleString('vi-VN')}
                  </div>
                  <Tooltip title="Thay đổi Cỡ Lô và lưu lịch sử">
                    <Button type="default"
                      style={{ color: '#d46b08', borderColor: '#ffd591', background: '#fff7e6', fontSize: 11, padding: '0 8px' }}
                      onClick={openDoiCoLo}>
                      Đổi
                    </Button>
                  </Tooltip>
                </Space.Compact>
              </Form.Item>
            ) : (
              <Form.Item label="Cỡ lô" name="coLo"
                help={soLuongDon != null
                  ? <span style={{ fontSize: 10, color: '#1D4ED8' }}>SL đơn: {Number(soLuongDon).toLocaleString('vi-VN')}</span>
                  : undefined}>
                <InputNumber style={{ width: '100%' }} min={0} step={100} />
              </Form.Item>
            )}
          </Col>
          <Col span={6}>
            <Form.Item
              label={
                <Space size={4}>
                  <span>Số lô</span>
                  {!editItem && congDoan === 'PL' && soLoLookupLoading &&
                    <SyncOutlined spin style={{ color: '#1677ff' }} />}
                  {!editItem && congDoan === 'PL' && !soLoLookupLoading && soLoSuggestions.length > 1 &&
                    <Tag color="orange" style={{ margin: 0, fontSize: 10 }}>Nhiều lô</Tag>}
                </Space>
              }
              name="soLo"
            >
              {!editItem && congDoan === 'PL' && soLoSuggestions.length > 1 ? (
                <Select placeholder="Chọn số lô từ PC" allowClear>
                  {soLoSuggestions.map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select>
              ) : (
                <Input
                  placeholder={!editItem && congDoan === 'PL' && soLoLookupLoading ? 'Đang tra cứu…' : 'VD: 180626'}
                  style={{ fontFamily: 'monospace', fontWeight: 700 }}
                />
              )}
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Phòng Sản Xuất" name="phongThucHien"
              rules={[{ required: true, message: 'Bắt buộc chọn phòng' }]}>
              <PhongThucHienSelect style={{ width: '100%' }} placeholder="VD: Phòng 1, Khu A..." />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={7}>
            <Form.Item label="Tình trạng" name="tinhTrang">
              <Select allowClear placeholder="Chọn">
                <Option value="gap">🟣 Gấp</Option>
                <Option value="rat_gap">🔴 Rất gấp</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={17}>
            <Form.Item label="Chú ý" name="chuY">
              <TextArea rows={1} autoSize={{ minRows: 1, maxRows: 3 }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Sai lệch / GẤP" name="saiLech" style={{ marginBottom: 0 }}>
          <TextArea rows={2} placeholder="Ghi GẤP hoặc nội dung sai lệch nếu có…"
            style={{ borderColor: '#fa8c16' }} />
        </Form.Item>
      </Form>

      {/* ── Lịch sử đổi lô (chỉ hiển thị khi có data) ── */}
      {loHistory.length > 0 && (
        <div style={{ marginTop: 16, padding: '12px 14px', background: '#fff7e6', borderRadius: 8, border: '1px solid #ffd591' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Space>
              <SwapOutlined style={{ color: '#d46b08' }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: '#d46b08' }}>
                Lô đã được đổi {loHistory.length} lần
              </span>
              <Badge count={loHistory.length} color="#d46b08" size="small" />
            </Space>
            <Button
              size="small" type="link"
              icon={<HistoryOutlined />}
              onClick={() => setLoHistoryOpen(true)}
              style={{ color: '#d46b08', padding: 0 }}
            >
              Xem lịch sử
            </Button>
          </div>
          {/* Hiển thị bản ghi mới nhất */}
          {(() => {
            const h = loHistory[0]
            return (
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                Lần gần nhất:{' '}
                <span style={{ background: '#fee2e2', color: '#991b1b', padding: '1px 8px', borderRadius: 20, fontFamily: 'monospace', fontWeight: 700 }}>
                  {h.soLoCu || '—'}
                </span>
                {' '}→{' '}
                <span style={{ background: '#dcfce7', color: '#166534', padding: '1px 8px', borderRadius: 20, fontFamily: 'monospace', fontWeight: 700 }}>
                  {h.soLoMoi}
                </span>
                {h.lyDo && <span> · <em>{h.lyDo}</em></span>}
                <span style={{ marginLeft: 8 }}>
                  bởi <strong style={{ color: '#374151' }}>{h.changedBy}</strong>
                </span>
              </div>
            )
          })()}
        </div>
      )}

      {/* ── Modal lịch sử đổi lô ── */}
      <Modal
        open={loHistoryOpen}
        onCancel={() => setLoHistoryOpen(false)}
        footer={null}
        title={
          <Space>
            <SwapOutlined style={{ color: '#d46b08' }} />
            <span style={{ fontWeight: 700 }}>Lịch sử đổi Lô SX</span>
            <Badge count={loHistory.length} color="#d46b08" />
          </Space>
        }
        width={560}
      >
        <List
          size="small"
          dataSource={loHistory}
          renderItem={h => (
            <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f0f2f5' }}>
              <div style={{ width: '100%', fontSize: 13 }}>
                <Space style={{ marginBottom: 4 }}>
                  <span style={{ background: '#fee2e2', color: '#991b1b', padding: '1px 10px', borderRadius: 20, fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>
                    {h.soLoCu || '—'}
                  </span>
                  <span style={{ color: '#8c8c8c' }}>→</span>
                  <span style={{ background: '#dcfce7', color: '#166534', padding: '1px 10px', borderRadius: 20, fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>
                    {h.soLoMoi}
                  </span>
                </Space>
                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#6b7280' }}>
                  <span>
                    {h.changedAt ? new Date(Array.isArray(h.changedAt)
                      ? new Date(h.changedAt[0], h.changedAt[1]-1, h.changedAt[2], h.changedAt[3]||0, h.changedAt[4]||0)
                      : h.changedAt).toLocaleString('vi-VN') : ''}
                  </span>
                  <span>Bởi: <strong style={{ color: '#374151' }}>{h.changedBy}</strong></span>
                  {h.lyDo && <span>Lý do: <em style={{ color: '#374151' }}>{h.lyDo}</em></span>}
                </div>
              </div>
            </List.Item>
          )}
        />
      </Modal>

      {/* ── Đổi Cỡ Lô Sub-Modal ── */}
      <Modal
        open={doiCoLoOpen} onCancel={() => setDoiCoLoOpen(false)}
        onOk={handleDoiCoLo} okText="Xác nhận đổi Cỡ Lô" cancelText="Hủy"
        confirmLoading={doiCoLoLoading} destroyOnClose
        title={<Space><ScissorOutlined style={{ color: '#d46b08' }} /><span style={{ fontWeight: 700 }}>Đổi Cỡ Lô Kế Hoạch</span></Space>}
        width={460}
      >
        <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fff7e6', borderRadius: 6, border: '1px solid #ffd591', fontSize: 13 }}>
          Cỡ lô hiện tại: <b style={{ color: '#d46b08', fontSize: 15 }}>
            {currentCoLo != null ? Number(currentCoLo).toLocaleString('vi-VN') : '—'}
          </b>
        </div>
        <Form form={doiCoLoForm} layout="vertical">
          <Form.Item label="Cỡ Lô Mới" name="coLoMoi"
            rules={[{ required: true, message: 'Nhập cỡ lô mới' }, { type: 'number', min: 1, message: 'Phải lớn hơn 0' }]}>
            <InputNumber style={{ width: '100%' }} min={1} step={100} placeholder="Nhập cỡ lô mới"
              formatter={v => v ? Number(v).toLocaleString('vi-VN') : ''}
              parser={v => v ? v.replace(/[^\d]/g, '') : ''} />
          </Form.Item>
          <Form.Item label="Lý do thay đổi" name="lyDo"
            rules={[{ required: true, message: 'Nhập lý do thay đổi' }]}>
            <TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="VD: Điều chỉnh cỡ lô theo yêu cầu sản xuất..." />
          </Form.Item>
        </Form>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#374151', marginBottom: 6 }}>Lịch sử thay đổi Cỡ Lô</div>
          {lichSuLoading
            ? <SyncOutlined spin style={{ color: '#1D4ED8' }} />
            : lichSuCoLo.length === 0
              ? <span style={{ color: '#94a3b8', fontSize: 12 }}>Chưa có lịch sử thay đổi</span>
              : <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {lichSuCoLo.map(h => (
                    <div key={h.id} style={{ padding: '5px 10px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>
                          <span style={{ color: '#94a3b8' }}>{h.coLoCu != null ? Number(h.coLoCu).toLocaleString('vi-VN') : '—'}</span>
                          {' → '}
                          <b style={{ color: '#1D4ED8' }}>{h.coLoMoi != null ? Number(h.coLoMoi).toLocaleString('vi-VN') : '—'}</b>
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

// ── Task item (read mode) ─────────────────────────────────────────────────────
function TaskItem({ record, onEdit, onDelete, bodyBg, canEdit, onDragStart, onCopy, isCopied, noDonHang, soLuongDon, isMultiSelectMode, isSelected, onToggleSelect, onSaveCoLo }) {
  const prefix    = CONG_DOAN_PREFIX[record.congDoan] || ''
  const coLo      = record.coLo != null ? Number(record.coLo).toLocaleString('vi-VN') : ''
  const slDon     = soLuongDon != null ? Number(soLuongDon).toLocaleString('vi-VN') : null

  // ── Inline coLo editor state ──────────────────────────────────────────────
  const [coLoEdit,   setCoLoEdit]   = useState(false)   // đang chỉnh sửa
  const [coLoInput,  setCoLoInput]  = useState('')       // giá trị nhập
  const [coLoSaving, setCoLoSaving] = useState(false)
  const [coLoSaved,  setCoLoSaved]  = useState(false)   // flash "Đã lưu"

  const startCoLoEdit = (e) => {
    e.stopPropagation()
    setCoLoInput(record.coLo != null ? String(record.coLo) : '')
    setCoLoEdit(true)
    setCoLoSaved(false)
  }
  const cancelCoLoEdit = (e) => { e.stopPropagation(); setCoLoEdit(false) }
  const saveCoLo = async (e) => {
    e.stopPropagation()
    setCoLoSaving(true)
    try {
      const newVal = coLoInput !== '' ? Number(coLoInput) : null
      await api.put(`/work-schedule/${record.id}`, { ...record, coLo: newVal })
      setCoLoEdit(false)
      onSaveCoLo?.()
      message.success('Đã lưu cỡ lô — hãy cập nhật kế hoạch')
      onEdit({ ...record, coLo: newVal })
    } catch { message.error('Lưu coLo thất bại') }
    finally { setCoLoSaving(false) }
  }
  const congField = CONG_FIELD_MAP[record.congDoan]
  const cong      = congField ? record[congField] : null
  const congStr   = cong != null ? `(${Math.round(Number(cong))})` : ''
  const isRatGap  = record.tinhTrang === 'rat_gap'
  const isGap     = record.tinhTrang === 'gap'
  const isDone    = record.tinhTrang === 'done'

  const textColor   = isRatGap ? '#cf1322' : isGap ? '#531dab' : isDone ? '#15803d' : noDonHang ? '#6d28d9' : '#262626'
  const prefixColor = isRatGap ? '#cf1322' : isGap ? '#531dab' : isDone ? '#15803d' : noDonHang ? '#7c3aed' : '#389e0d'
  const cardBg      = isRatGap ? '#fff1f0' : isGap ? '#f5f0ff' : isDone ? '#f0fdf4' : noDonHang ? '#f5f3ff' : '#fff'
  const cardBorder  = isRatGap ? '#ffa39e' : isGap ? '#c4b5fd' : isDone ? '#86efac' : noDonHang ? '#c4b5fd' : '#d9d9d9'
  const cardAccent  = isRatGap ? '#ff4d4f' : isGap ? '#7c3aed' : isDone ? '#22c55e' : noDonHang ? '#7c3aed' : '#52c41a'

  const contextMenuItems = canEdit ? [
    {
      key: 'copy', icon: <CopyOutlined />,
      label: 'Sao chép bản ghi',
      onClick: () => onCopy(record),
    },
    { type: 'divider' },
    {
      key: 'delete', icon: <DeleteOutlined />,
      label: <span style={{ color: '#ef4444' }}>Xóa bản ghi</span>,
      onClick: () => Modal.confirm({
        title: 'Xóa kế hoạch này?',
        okText: 'Xóa', cancelText: 'Hủy', okButtonProps: { danger: true },
        onOk: () => onDelete(record),
      }),
      danger: true,
    },
  ] : []

  const card = (
    <div
      draggable={canEdit && !isMultiSelectMode}
      onDragStart={canEdit && !isMultiSelectMode ? (e) => { e.stopPropagation(); onDragStart(record) } : undefined}
      style={{
        position: 'relative',
        padding: '3px 7px',
        marginBottom: 2,
        borderRadius: 4,
        background: coLoEdit ? '#66FF99' : isSelected ? '#fff7e6' : isCopied ? '#fffbe6' : record.hasLsx ? '#66FF99' : cardBg,
        border: coLoEdit ? '1.5px solid #22c55e' : isSelected ? '1.5px solid #fa8c16' : isCopied ? '1.5px dashed #faad14' : record.hasLsx ? '1px solid #22c55e' : `1px solid ${cardBorder}`,
        borderLeft: `3px solid ${coLoEdit ? '#16a34a' : isSelected ? '#fa8c16' : isCopied ? '#faad14' : record.hasLsx ? '#16a34a' : cardAccent}`,
        lineHeight: 1.45,
        color: textColor,
        cursor: isMultiSelectMode ? 'pointer' : canEdit ? 'pointer' : 'default',
        userSelect: 'none',
        boxShadow: isSelected ? '0 0 0 2px #ffe7ba' : isCopied ? '0 0 0 2px #fffbe6' : undefined,
      }}
      onClick={isMultiSelectMode ? () => onToggleSelect(record.id) : canEdit ? () => onEdit(record) : undefined}>
      {isMultiSelectMode && (
        <span style={{
          position: 'absolute', top: 3, right: 5,
          fontSize: 14, color: isSelected ? '#fa8c16' : '#d9d9d9',
          lineHeight: 1,
        }}>
          {isSelected ? '☑' : '☐'}
        </span>
      )}
      <span style={{ color: prefixColor, fontWeight: 600, fontSize: 11 }}>
        {prefix}{' '}
      </span>
      {/* ── Inline coLo editor ── */}
      {canEdit && !isMultiSelectMode ? (
        <span onClick={e => e.stopPropagation()} style={{ display: 'inline' }}>
          {coLoSaved ? (
            <span style={{ color: '#15803d', fontWeight: 700, fontSize: 11, marginRight: 4 }}>✓ Đã lưu </span>
          ) : coLoEdit ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginRight: 4 }}>
              <input
                autoFocus
                value={coLoInput}
                onChange={e => setCoLoInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveCoLo(e); if (e.key === 'Escape') cancelCoLoEdit(e) }}
                style={{
                  width: 72, padding: '1px 5px', fontSize: 12, fontWeight: 700,
                  background: '#66FF99', border: '1.5px solid #22c55e', borderRadius: 3,
                  outline: 'none',
                }}
              />
              <button
                onClick={saveCoLo}
                disabled={coLoSaving}
                style={{
                  fontSize: 10, padding: '1px 6px', cursor: 'pointer', lineHeight: '16px',
                  background: '#15803d', color: '#fff', border: 'none', borderRadius: 3, fontWeight: 700,
                }}>
                {coLoSaving ? '...' : 'Lưu'}
              </button>
              <button
                onClick={cancelCoLoEdit}
                style={{
                  fontSize: 11, padding: '0 5px', cursor: 'pointer', lineHeight: '16px',
                  background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 3, color: '#6b7280',
                }}>
                ✕
              </button>
            </span>
          ) : (
            <span style={{ fontWeight: 700, marginRight: 2 }}>
              {coLo
                ? <>{coLo}{slDon && <span style={{ fontWeight: 400, color: '#8c8c8c', fontSize: 11 }}>/{slDon}</span>}{' '}</>
                : null}
              <span
                onClick={startCoLoEdit}
                title="Yêu cầu chỉnh sửa coLo"
                style={{
                  fontSize: 10, cursor: 'pointer', color: '#1677ff',
                  padding: '0 3px', borderRadius: 2,
                  border: '1px solid #91caff', background: '#e6f4ff',
                  fontWeight: 600, verticalAlign: 'middle', lineHeight: '14px',
                  display: 'inline-block',
                }}>
                {coLo ? 'Sửa' : '+ coLo'}
              </span>
              {' '}
            </span>
          )}
        </span>
      ) : (
        coLo && (
          <span style={{ fontWeight: 700 }}>
            {coLo}
            {slDon && <span style={{ fontWeight: 400, color: '#8c8c8c', fontSize: 11 }}>/{slDon}</span>}
            {' '}
          </span>
        )
      )}
      <span style={{ textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.8 : 1 }}>
        {record.tenTrinh || ''}
      </span>
      {record.soLo && <span style={{ color: '#8c8c8c', fontSize: 11 }}> – {record.soLo}</span>}
      {congStr && <span style={{ color: '#8c8c8c', fontSize: 11 }}> {congStr}</span>}
      {isDone && (
        <Tag color="success" style={{ marginLeft: 4, fontSize: 10, padding: '0 4px', lineHeight: '16px', height: 16, verticalAlign: 'middle' }}>
          ✓ Đã xếp lịch
        </Tag>
      )}
      {isRatGap && (
        <Tag color="red" style={{ marginLeft: 4, fontSize: 10, padding: '0 3px', lineHeight: '15px', height: 15, verticalAlign: 'middle' }}>
          Rất gấp
        </Tag>
      )}
      {isGap && (
        <Tag color="purple" style={{ marginLeft: 4, fontSize: 10, padding: '0 3px', lineHeight: '15px', height: 15, verticalAlign: 'middle' }}>
          Gấp
        </Tag>
      )}
      {record.maDonHang && (
        <div style={{ color: '#8c8c8c', fontSize: 10, marginTop: 1 }}>
          <span style={{ color: '#bfbfbf' }}>ĐH: </span>
          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1677ff' }}>{record.maDonHang}</span>
        </div>
      )}
      {noDonHang && (
        <div style={{ color: '#7c3aed', fontSize: 10, fontWeight: 700, marginTop: 2 }}>
          ⚠ Không tìm thấy ĐH
        </div>
      )}
      {record.phongThucHien && (
        <div style={{ color: '#607080', fontSize: 10, marginTop: 1 }}>🏢 {record.phongThucHien}</div>
      )}
      {record.chuY && (
        <div style={{ color: '#d46b08', fontSize: 11, marginTop: 1 }}>⚠ {record.chuY}</div>
      )}
    </div>
  )

  if (!canEdit || isMultiSelectMode) return card
  return (
    <Dropdown menu={{ items: contextMenuItems }} trigger={['contextMenu']}>
      {card}
    </Dropdown>
  )
}

// ── Tổng hợp: Plan Summary Row ───────────────────────────────────────────────
function PlanSummaryRow({ record }) {
  const grp      = TO_GROUPS.find(g => g.key === record.toNhom)
  const isRatGap = record.tinhTrang === 'rat_gap'
  const isGap    = record.tinhTrang === 'gap'
  const isDone   = record.tinhTrang === 'done'
  return (
    <div style={{
      padding: '7px 14px',
      borderBottom: '1px solid #f0f2f5',
      borderLeft: `3px solid ${isRatGap ? '#ef4444' : isGap ? '#7c3aed' : isDone ? '#22c55e' : '#d9d9d9'}`,
      background: isRatGap ? '#fff5f5' : isGap ? '#f9f5ff' : isDone ? '#f0fdf4' : '#fff',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <Space size={4}>
          <span style={{
            display: 'inline-block', padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700,
            background: grp?.headerBg || '#8c8c8c', color: '#fff',
          }}>{record.toNhom}</span>
          {record.coLo && (
            <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
              {Number(record.coLo).toLocaleString('vi-VN')}
            </span>
          )}
          {isRatGap && <Tag color="red"    style={{ margin: 0, fontSize: 10 }}>Rất gấp</Tag>}
          {isGap    && <Tag color="purple" style={{ margin: 0, fontSize: 10 }}>Gấp</Tag>}
          {isDone   && <Tag color="success" style={{ margin: 0, fontSize: 10 }}>✓ Xếp lịch</Tag>}
        </Space>
        {record.maDonHang && (
          <span style={{ fontSize: 10, color: '#1677ff', fontFamily: 'monospace' }}>{record.maDonHang}</span>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.4 }}>
        {record.tenTrinh || record.maSp || '—'}
        {record.soLo && <span style={{ color: '#8c8c8c', fontSize: 11, marginLeft: 6 }}>· Lô: {record.soLo}</span>}
      </div>
      {record.chuY && <div style={{ fontSize: 11, color: '#d97706', marginTop: 2 }}>⚠ {record.chuY}</div>}
    </div>
  )
}

// ── Tổng hợp: Main Content ────────────────────────────────────────────────────
function KhoachTongHopContent({ onViewCalendar }) {
  const [data,      setData]      = useState([])
  const [loading,   setLoading]   = useState(false)
  const [lastFetch, setLastFetch] = useState(null)
  const [activeDay, setActiveDay] = useState('today')

  const today       = dayjs()
  const todayStr    = today.format('YYYY-MM-DD')
  const tomorrowStr = today.add(1, 'day').format('YYYY-MM-DD')
  const weekStart   = today.startOf('isoWeek').format('YYYY-MM-DD')
  const weekEnd     = today.endOf('isoWeek').format('YYYY-MM-DD')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const now = dayjs()
    const fromDate = now.subtract(3, 'day').format('YYYY-MM-DD')
    const toDate   = now.add(28, 'day').format('YYYY-MM-DD')
    try {
      const { data: res } = await api.get('/work-schedule', {
        params: { page: 0, size: 2000, source: 'PLAN', fromDate, toDate },
      })
      setData(res.content || [])
      setLastFetch(new Date())
    } catch { message.error('Không thể tải dữ liệu tổng hợp') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, []) // eslint-disable-line

  // ── Metrics ────────────────────────────────────────────────────────────────
  const active       = data.filter(r => r.ngayThucHien >= todayStr && r.tinhTrang !== 'done')
  const doneThisWeek = data.filter(r => r.tinhTrang === 'done' && r.ngayThucHien >= weekStart && r.ngayThucHien <= weekEnd)
  const urgent       = data.filter(r => (r.tinhTrang === 'rat_gap' || r.tinhTrang === 'gap') && r.ngayThucHien >= todayStr)
  const totalCoLo    = active.reduce((s, r) => s + (Number(r.coLo) || 0), 0)

  const todayRecs    = data.filter(r => r.ngayThucHien === todayStr)
  const tomorrowRecs = data.filter(r => r.ngayThucHien === tomorrowStr)

  const byGroup = TO_GROUPS.map(g => {
    const recs        = data.filter(r => r.toNhom === g.key && r.ngayThucHien >= todayStr)
    const done        = recs.filter(r => r.tinhTrang === 'done').length
    const total       = recs.length
    const urgentCount = recs.filter(r => r.tinhTrang === 'rat_gap' || r.tinhTrang === 'gap').length
    const coLo        = recs.reduce((s, r) => s + (Number(r.coLo) || 0), 0)
    return { ...g, total, done, urgentCount, coLo, percent: total > 0 ? Math.round((done / total) * 100) : 0 }
  })

  const next7 = Array.from({ length: 7 }, (_, i) => {
    const d  = today.add(i, 'day')
    const ds = d.format('YYYY-MM-DD')
    return { date: d, dateStr: ds, recs: data.filter(r => r.ngayThucHien === ds) }
  })

  const fmtNum     = v => v != null ? Number(v).toLocaleString('vi-VN') : '—'
  const urgentSort = { rat_gap: 0, gap: 1, doing: 2, done: 4 }
  const displayRecs = (activeDay === 'today' ? todayRecs : tomorrowRecs)
    .slice().sort((a, b) => (urgentSort[a.tinhTrang] ?? 3) - (urgentSort[b.tinhTrang] ?? 3))

  return (
    <Spin spinning={loading}>
      <div style={{ padding: '8px 0' }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 14, flexWrap: 'wrap', gap: 8,
        }}>
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0C4A70' }}>Tổng hợp Kế hoạch Sản xuất</span>
            <span style={{ marginLeft: 12, fontSize: 12, color: '#8c8c8c' }}>
              {today.format('dddd, DD/MM/YYYY')}
            </span>
            {lastFetch && (
              <span style={{ marginLeft: 10, fontSize: 11, color: '#b8b8b8' }}>
                · Cập nhật lúc {dayjs(lastFetch).format('HH:mm:ss')}
              </span>
            )}
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
            <Button type="primary" icon={<CalendarOutlined />} onClick={onViewCalendar}
              style={{ background: '#0C4A70', borderColor: '#0C4A70' }}>
              Xem lịch biểu
            </Button>
          </Space>
        </div>

        {/* ── KPI Cards ── */}
        <Row gutter={[10, 10]} style={{ marginBottom: 14 }}>
          <Col xs={12} sm={6}>
            <div style={{ background: 'linear-gradient(135deg,#e0f2fe,#bae6fd)', borderRadius: 10, padding: '13px 14px', border: '1px solid #7dd3fc' }}>
              <div style={{ fontSize: 10, color: '#0369a1', fontWeight: 700, letterSpacing: 0.4, marginBottom: 4 }}>ĐANG THỰC HIỆN</div>
              <div style={{ fontSize: 34, fontWeight: 800, color: '#0c4a6e', lineHeight: 1 }}>{active.length}</div>
              <div style={{ fontSize: 11, color: '#0369a1', marginTop: 4 }}>lô trong kế hoạch</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)', borderRadius: 10, padding: '13px 14px', border: '1px solid #86efac' }}>
              <div style={{ fontSize: 10, color: '#15803d', fontWeight: 700, letterSpacing: 0.4, marginBottom: 4 }}>HOÀN THÀNH TUẦN NÀY</div>
              <div style={{ fontSize: 34, fontWeight: 800, color: '#14532d', lineHeight: 1 }}>{doneThisWeek.length}</div>
              <div style={{ fontSize: 11, color: '#15803d', marginTop: 4 }}>lô đã xếp lịch xong</div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{
              background: urgent.length > 0 ? 'linear-gradient(135deg,#fff7ed,#fed7aa)' : 'linear-gradient(135deg,#f8fafc,#f1f5f9)',
              borderRadius: 10, padding: '13px 14px',
              border: urgent.length > 0 ? '1px solid #fdba74' : '1px solid #e2e8f0',
            }}>
              <div style={{ fontSize: 10, color: urgent.length > 0 ? '#c2410c' : '#94a3b8', fontWeight: 700, letterSpacing: 0.4, marginBottom: 4 }}>LÔ GẤP / RẤT GẤP</div>
              <div style={{ fontSize: 34, fontWeight: 800, color: urgent.length > 0 ? '#9a3412' : '#94a3b8', lineHeight: 1 }}>{urgent.length}</div>
              <div style={{ fontSize: 11, color: urgent.length > 0 ? '#c2410c' : '#94a3b8', marginTop: 4 }}>
                {urgent.length > 0 ? 'cần ưu tiên xử lý' : 'không có lô gấp'}
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ background: 'linear-gradient(135deg,#f3e8ff,#e9d5ff)', borderRadius: 10, padding: '13px 14px', border: '1px solid #c4b5fd' }}>
              <div style={{ fontSize: 10, color: '#7e22ce', fontWeight: 700, letterSpacing: 0.4, marginBottom: 4 }}>TỔNG CỠ LÔ</div>
              <div style={{ fontSize: totalCoLo >= 1000000 ? 20 : totalCoLo >= 100000 ? 26 : 34, fontWeight: 800, color: '#581c87', lineHeight: 1 }}>
                {fmtNum(totalCoLo)}
              </div>
              <div style={{ fontSize: 11, color: '#7e22ce', marginTop: 4 }}>đang trong kế hoạch</div>
            </div>
          </Col>
        </Row>

        {/* ── Hôm nay / Ngày mai + Tiến độ theo tổ ── */}
        <Row gutter={[10, 10]}>
          <Col xs={24} lg={15}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ background: '#0C4A70', display: 'flex', padding: '0 6px' }}>
                {['today', 'tomorrow'].map(day => (
                  <div
                    key={day}
                    onClick={() => setActiveDay(day)}
                    style={{
                      padding: '9px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      color: activeDay === day ? '#fff' : 'rgba(255,255,255,0.55)',
                      borderBottom: activeDay === day ? '3px solid #60a5fa' : '3px solid transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    {day === 'today'
                      ? `Hôm nay — ${today.format('DD/MM')} (${todayRecs.length})`
                      : `Ngày mai — ${today.add(1, 'day').format('DD/MM')} (${tomorrowRecs.length})`
                    }
                  </div>
                ))}
              </div>
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {displayRecs.length === 0
                  ? <div style={{ padding: '28px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      Không có kế hoạch nào
                    </div>
                  : displayRecs.map(r => <PlanSummaryRow key={r.id} record={r} />)
                }
              </div>
            </div>
          </Col>

          <Col xs={24} lg={9}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ background: '#37474f', color: '#fff', padding: '9px 14px', fontSize: 12, fontWeight: 700 }}>
                Tiến độ theo tổ (từ hôm nay)
              </div>
              <div style={{ padding: '12px 14px' }}>
                {byGroup.map(g => (
                  <div key={g.key} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <Space size={6}>
                        <span style={{
                          display: 'inline-block', width: 60, padding: '2px 0',
                          textAlign: 'center', borderRadius: 4,
                          background: g.headerBg, color: g.headerText,
                          fontWeight: 700, fontSize: 11,
                        }}>{g.key}</span>
                        <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{g.done}/{g.total}</span>
                        {g.urgentCount > 0 && (
                          <Tag color="red" style={{ margin: 0, fontSize: 10, padding: '0 4px' }}>
                            {g.urgentCount} gấp
                          </Tag>
                        )}
                      </Space>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>
                        {g.coLo > 0 ? fmtNum(g.coLo) : '—'} sp
                      </span>
                    </div>
                    <Progress
                      percent={g.percent}
                      size="small"
                      strokeColor={g.percent === 100 ? '#22c55e' : g.percent >= 60 ? '#3b82f6' : g.headerBg}
                      trailColor="#e2e8f0"
                      format={p => <span style={{ fontSize: 11, color: '#6b7280', minWidth: 32, display: 'inline-block', textAlign: 'right' }}>{p}%</span>}
                    />
                  </div>
                ))}
                {byGroup.every(g => g.total === 0) && (
                  <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>
                    Chưa có dữ liệu
                  </div>
                )}
              </div>
            </div>
          </Col>
        </Row>

        {/* ── Lịch 7 ngày tới ── */}
        <div style={{ marginTop: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ background: '#475569', color: '#fff', padding: '9px 14px', fontSize: 12, fontWeight: 700 }}>
            Lịch 7 ngày tới
          </div>
          <div style={{ display: 'flex', overflowX: 'auto', padding: '10px 8px', gap: 6 }}>
            {next7.map(({ date, dateStr, recs }) => {
              const isWeekend  = date.day() === 0 || date.day() === 6
              const isToday    = dateStr === todayStr
              const urgentRecs = recs.filter(r => r.tinhTrang === 'rat_gap' || r.tinhTrang === 'gap')
              return (
                <div key={dateStr} style={{
                  flex: '0 0 auto', minWidth: 110,
                  border: isToday ? '2px solid #1d4ed8' : '1px solid #e2e8f0',
                  borderRadius: 8, overflow: 'hidden',
                  boxShadow: isToday ? '0 0 0 3px #bfdbfe' : 'none',
                }}>
                  <div style={{
                    background: isToday ? '#1d4ed8' : isWeekend ? '#e9ecef' : '#f8fafc',
                    color: isToday ? '#fff' : isWeekend ? '#5d4037' : '#374151',
                    padding: '5px 8px', textAlign: 'center', fontWeight: 700, fontSize: 11,
                    borderBottom: '1px solid #e2e8f0',
                  }}>
                    {DAY_VI[date.day()]} {date.format('DD/MM')}
                    {isToday && <div style={{ fontSize: 9, fontWeight: 400, opacity: 0.9 }}>● Hôm nay</div>}
                  </div>
                  <div style={{ padding: '5px 5px', minHeight: 50 }}>
                    {recs.length === 0
                      ? <div style={{ color: '#d1d5db', fontSize: 11, textAlign: 'center', paddingTop: 8 }}>—</div>
                      : recs.map(r => (
                          <div key={r.id} style={{
                            fontSize: 10, marginBottom: 2, padding: '2px 5px',
                            borderRadius: 3, lineHeight: 1.3,
                            background: r.tinhTrang === 'rat_gap' ? '#fee2e2'
                              : r.tinhTrang === 'gap' ? '#f5f0ff'
                              : r.tinhTrang === 'done' ? '#f0fdf4'
                              : '#f8fafc',
                            border: r.tinhTrang === 'rat_gap' ? '1px solid #fca5a5'
                              : r.tinhTrang === 'gap' ? '1px solid #c4b5fd'
                              : '1px solid #e2e8f0',
                            color: r.tinhTrang === 'rat_gap' ? '#991b1b'
                              : r.tinhTrang === 'gap' ? '#5b21b6'
                              : '#374151',
                          }}>
                            <span style={{ fontWeight: 700 }}>{r.toNhom}</span>
                            {r.coLo ? <span style={{ marginLeft: 3, color: '#0369a1', fontWeight: 600 }}>{Number(r.coLo).toLocaleString('vi-VN')}</span> : ''}
                          </div>
                        ))
                    }
                    {urgentRecs.length > 0 && (
                      <div style={{ fontSize: 9, color: '#ef4444', textAlign: 'center', marginTop: 2, fontWeight: 700 }}>
                        ⚡ {urgentRecs.length} GẤP
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </Spin>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function KhoachContent({ miniPickerMode = false, filterSlot = null }) {
  const { canEditPlan } = useAuth()
  const canEdit = canEditPlan()

  const defaultFrom = dayjs().startOf('isoWeek')                    // Thứ 2 của tuần hiện tại
  const defaultTo   = dayjs().endOf('isoWeek').add(2, 'week')        // Chủ nhật của tuần thứ 2 sau
  // V1 và V2 dùng key riêng để không ghi đè nhau
  const dateRangeKey      = miniPickerMode ? 'khoach_v2_date_range'       : 'khoach_date_range'
  const collapsedWeeksKey = miniPickerMode ? 'khoach_v2_collapsed_weeks'   : 'khoach_collapsed_weeks'
  const collapsedGroupsKey = miniPickerMode ? 'khoach_v2_collapsed_groups' : 'khoach_collapsed_groups'

  const saveDateRange = useCallback((range) => {
    if (range?.[0] && range?.[1]) {
      localStorage.setItem(dateRangeKey, JSON.stringify([
        range[0].format('YYYY-MM-DD'),
        range[1].format('YYYY-MM-DD'),
      ]))
    }
  }, [dateRangeKey])

  const [dateRange, setDateRange] = useState([defaultFrom, defaultTo])
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [data, setData]     = useState([])
  const [loading, setLoading] = useState(false)
  const [collapsedWeeks, setCollapsedWeeks] = useState(() => {
    try {
      const saved = localStorage.getItem(collapsedWeeksKey)
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    try {
      const saved = localStorage.getItem(collapsedGroupsKey)
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  // ĐƠN HÀNG panel — chỉ adminKH/admin, persisted
  const [showDonHang, setShowDonHang] = useState(() => {
    try { return localStorage.getItem('khoach_show_dh') === '1' } catch { return false }
  })
  const [donHangList, setDonHangList] = useState([])
  const [donHangLoading, setDonHangLoading] = useState(false)

  useEffect(() => {
    saveDateRange(dateRange)
  }, [dateRange]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem(collapsedWeeksKey, JSON.stringify([...collapsedWeeks]))
  }, [collapsedWeeks]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    localStorage.setItem(collapsedGroupsKey, JSON.stringify([...collapsedGroups]))
  }, [collapsedGroups]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    localStorage.setItem('khoach_show_dh', showDonHang ? '1' : '0')
    if (showDonHang) fetchDonHang()
  }, [showDonHang])

  const fetchDonHang = useCallback(async () => {
    setDonHangLoading(true)
    try {
      const { data: res } = await api.get('/don-hang', { params: { page: 0, size: 1000 } })
      setDonHangList(Array.isArray(res) ? res : (res.content || []))
    } catch { /* silent */ }
    finally { setDonHangLoading(false) }
  }, [])

  const [modalOpen, setModalOpen]         = useState(false)
  const [editItem, setEditItem]           = useState(null)
  const [defaultToNhom, setDefaultToNhom] = useState(null)
  const [defaultDate, setDefaultDate]     = useState(null)

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  const dragRef                           = useRef(null)
  const dragDonHangRef                    = useRef(null)
  const [dragOverCell, setDragOverCell]   = useState(null) // `${date}__${toNhom}`
  const [isDraggingDh, setIsDraggingDh]  = useState(false)

  // ── Click-to-schedule (chọn đơn hàng → click ô ngày) ──────────────────────
  const [selectedDonHang, setSelectedDonHang] = useState(null)
  const isSelectDhMode = !!selectedDonHang

  // pendingScheduleCell: ô đã chọn từ nút +, chờ user click đơn hàng để xếp vào đó
  const [pendingScheduleCell, setPendingScheduleCell] = useState(null) // { date, toNhom }
  const isPendingCellMode = !!pendingScheduleCell

  // ── Context menu (right-click trên header ngày) ───────────────────────────
  const [ctxMenu, setCtxMenu] = useState(null) // { date, groupKey, x, y }

  // ── Mini-picker (V2 mode) ─────────────────────────────────────────────────
  // pickerCell: { date, toNhom } — ô đang mở mini-picker
  const [pickerCell,   setPickerCell]   = useState(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const v2ScrollRef = useRef(null)
  const v1ScrollRef = useRef(null)
  const v1MirrorRef = useRef(null)
  const v1SyncingRef = useRef(false)

  // V2: tự động load danh sách đơn hàng khi mount
  useEffect(() => {
    if (miniPickerMode) fetchDonHang()
  }, [miniPickerMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // V2: khôi phục vị trí cuộn sau khi dữ liệu load xong
  useEffect(() => {
    if (!loading && miniPickerMode && v2ScrollRef.current) {
      const saved = sessionStorage.getItem('v2ScrollTop')
      if (saved) {
        requestAnimationFrame(() => {
          if (v2ScrollRef.current) v2ScrollRef.current.scrollTop = parseInt(saved, 10)
        })
      }
    }
  }, [loading, miniPickerMode])

  const handleMiniPickerSelect = async (dh, date, toNhom) => {
    setPickerCell(null)
    setPickerSearch('')
    if (!dh.maDonHang) { message.warning('Đơn hàng chưa có mã đơn hàng'); return }
    const cd = GROUP_DEFAULT_CD[toNhom] || 'PC'
    const payload = {
      source: 'PLAN', ngayThucHien: date, toNhom, congDoan: cd,
      maBravo: dh.maBravo || null, maSp: dh.maSp || null,
      tenTrinh: dh.tenSanPham || null, maDonHang: dh.maDonHang || null,
      soLo: dh.soLo || null,
      coLo: dh.soLuongDatHang != null ? Number(dh.soLuongDatHang) : null,
      tinhTrang: dh.tinhTrangDatHang || null,
    }
    try {
      await api.post('/work-schedule', payload)
      message.success(`Đã xếp "${(dh.tenSanPham || dh.maDonHang || '').substring(0, 30)}" → ${toNhom} · ${dayjs(date).format('DD/MM/YYYY')}`)
      const sy = window.scrollY
      await fetchData(undefined, { silent: true })
      requestAnimationFrame(() => window.scrollTo({ top: sy, behavior: 'instant' }))
      syncToDonHang(payload).then(() => fetchDonHang())
    } catch { message.error('Xếp kế hoạch thất bại') }
  }

// ── Multi-select delete ───────────────────────────────────────────────────
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())

  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(v => !v)
    setSelectedIds(new Set())
  }

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    // Collect all visible record ids from current data
    const allIds = data.map(r => r.id)
    if (selectedIds.size === allIds.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }

  // Chọn/bỏ chọn toàn bộ bản ghi trong 1 cột ngày của 1 tổ
  const handleSelectByDateGroup = (d, groupKey) => {
    const ids = data.filter(r => r.ngayThucHien === d && r.toNhom === groupKey).map(r => r.id)
    if (ids.length === 0) return
    const allSelected = ids.every(id => selectedIds.has(id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allSelected) { ids.forEach(id => next.delete(id)) }
      else              { ids.forEach(id => next.add(id)) }
      return next
    })
  }

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return
    Modal.confirm({
      title: `Xóa ${selectedIds.size} bản ghi kế hoạch?`,
      content: 'Các bản ghi đã chọn sẽ bị xóa vĩnh viễn.',
      okText: 'Xóa tất cả', cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          // Lấy danh sách các đơn hàng bị ảnh hưởng trước khi xóa
          const affected = data
            .filter(r => selectedIds.has(r.id) && r.maBravo && r.maDonHang)
            .map(r => `${r.maBravo}||${r.maDonHang}`)
          const uniqueDH = [...new Set(affected)]

          await Promise.all([...selectedIds].map(id => api.delete(`/work-schedule/${id}`)))
          message.success(`Đã xóa ${selectedIds.size} bản ghi`)
          setSelectedIds(new Set())
          setIsMultiSelectMode(false)
          const sy = window.scrollY
          await fetchData(undefined, { silent: true })
          requestAnimationFrame(() => window.scrollTo({ top: sy, behavior: 'instant' }))
          fetchDonHang()
        } catch { message.error('Xóa thất bại') }
      },
    })
  }

  const handleSelectDonHang = async (dh) => {
    if (!dh.maDonHang) {
      message.warning('Đơn hàng chưa có mã đơn hàng, không thể xếp kế hoạch')
      return
    }
    // Chế độ xếp từ nút + → xếp ngay vào ô đã chọn
    if (pendingScheduleCell) {
      const { date, toNhom } = pendingScheduleCell
      setPendingScheduleCell(null)
      const cd = GROUP_DEFAULT_CD[toNhom] || 'PC'
      const payload = {
        source: 'PLAN', ngayThucHien: date, toNhom, congDoan: cd,
        maBravo: dh.maBravo || null, maSp: dh.maSp || null,
        tenTrinh: dh.tenSanPham || null, maDonHang: dh.maDonHang || null,
        soLo: dh.soLo || null, coLo: dh.soLuongDatHang != null ? Number(dh.soLuongDatHang) : null, tinhTrang: dh.tinhTrangDatHang || null,
      }
      try {
        await api.post('/work-schedule', payload)
        message.success(`Đã xếp "${(dh.tenSanPham || dh.maDonHang || '').substring(0, 30)}" → ${toNhom} · ${dayjs(date).format('DD/MM/YYYY')}`)
        const sy = window.scrollY
        await fetchData(undefined, { silent: true })
        requestAnimationFrame(() => window.scrollTo({ top: sy, behavior: 'instant' }))
        syncToDonHang(payload).then(() => fetchDonHang())
      } catch { message.error('Xếp kế hoạch thất bại') }
      return
    }
    // Chế độ bình thường: toggle chọn đơn để click vào ô ngày
    setSelectedDonHang(prev => prev?.id === dh.id ? null : dh)
  }

  const handlePlusSelectMode = (date, toNhom) => {
    setPendingScheduleCell({ date, toNhom })
    if (!showDonHang) setShowDonHang(true)
    // Scroll xuống Bảng Đơn Hàng
    setTimeout(() => {
      const el = document.getElementById('bang-don-hang')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
  }

  const handleScheduleSelected = async (toDate, toNhom) => {
    if (!selectedDonHang) return
    if (scheduleSelectInFlightRef.current) return
    scheduleSelectInFlightRef.current = true
    const dh = selectedDonHang
    setSelectedDonHang(null)
    const cd = GROUP_DEFAULT_CD[toNhom] || 'PC'
    const payload = {
      source:       'PLAN',
      ngayThucHien: toDate,
      toNhom,
      congDoan:     cd,
      maBravo:      dh.maBravo    || null,
      maSp:         dh.maSp       || null,
      tenTrinh:     dh.tenSanPham || null,
      maDonHang:    dh.maDonHang  || null,
      soLo:         dh.soLo       || null,
      coLo:         dh.soLuongDatHang != null ? Number(dh.soLuongDatHang) : null,
      tinhTrang:    dh.tinhTrangDatHang || null,
    }
    try {
      await api.post('/work-schedule', payload)
      message.success(`Đã xếp "${(dh.tenSanPham || dh.maDonHang || '').substring(0, 30)}" → ${toNhom} · ${dayjs(toDate).format('DD/MM/YYYY')}`)
      { const sy = window.scrollY; await fetchData(undefined, { silent: true }); requestAnimationFrame(() => window.scrollTo({ top: sy, behavior: 'instant' })) }
      syncToDonHang(payload).then(() => fetchDonHang())
    } catch { message.error('Xếp kế hoạch thất bại') }
    finally { scheduleSelectInFlightRef.current = false }
  }

  const handleDragStart = (record) => { dragRef.current = record }

  const handleDonHangDragStart = (dh) => {
    if (!dh.maDonHang) return
    dragDonHangRef.current = dh
    setIsDraggingDh(true)
  }
  const handleDonHangDragEnd = () => {
    dragDonHangRef.current = null
    setIsDraggingDh(false)
  }

  const handleDrop = async (toDate, toNhom) => {
    setDragOverCell(null)

    // ── Drop từ BẢNG ĐƠN HÀNG → tạo mới bản ghi Kế Hoạch ──
    const dh = dragDonHangRef.current
    if (dh) {
      dragDonHangRef.current = null
      setIsDraggingDh(false)
      const cd = GROUP_DEFAULT_CD[toNhom] || 'PC'
      const payload = {
        source:        'PLAN',
        ngayThucHien:  toDate,
        toNhom,
        congDoan:      cd,
        maBravo:       dh.maBravo    || null,
        maSp:          dh.maSp       || null,
        tenTrinh:      dh.tenSanPham || null,
        maDonHang:     dh.maDonHang  || null,
        soLo:          dh.soLo       || null,
        coLo:          dh.soLuongDatHang != null ? Number(dh.soLuongDatHang) : null,
        tinhTrang:     dh.tinhTrangDatHang || null,
      }
      try {
        await api.post('/work-schedule', payload)
        message.success(
          `Đã thêm "${(dh.tenSanPham || dh.maDonHang || '').substring(0, 30)}" → ${toNhom} · ${dayjs(toDate).format('DD/MM/YYYY')}`
        )
        { const sy = window.scrollY; await fetchData(undefined, { silent: true }); requestAnimationFrame(() => window.scrollTo({ top: sy, behavior: 'instant' })) }
        syncToDonHang(payload).then(() => fetchDonHang())
      } catch { message.error('Kéo thả thất bại') }
      return
    }

    // ── Drop nội bộ → di chuyển bản ghi Kế Hoạch ──
    const rec = dragRef.current
    dragRef.current = null
    if (!rec) return
    if (rec.ngayThucHien === toDate && rec.toNhom === toNhom) return
    try {
      await api.put(`/work-schedule/${rec.id}`, {
        ...rec,
        ngayThucHien: toDate,
        toNhom,
      })
      message.success(`Đã chuyển sang ${dayjs(toDate).format('DD/MM/YYYY')}${toNhom !== rec.toNhom ? ` · ${toNhom}` : ''}`)
      { const sy = window.scrollY; await fetchData(undefined, { silent: true }); requestAnimationFrame(() => window.scrollTo({ top: sy, behavior: 'instant' })) }
      syncToDonHang({ ...rec, ngayThucHien: toDate, toNhom }).then(() => fetchDonHang())
    } catch { message.error('Kéo thả thất bại') }
  }

  // ── Copy / Paste ─────────────────────────────────────────────────────────────
  const [copiedRecord, setCopiedRecord]   = useState(null)

  const handleCopy = (record) => {
    setCopiedRecord(record)
    message.open({
      key: 'copy-hint',
      type: 'info',
      icon: <CopyOutlined />,
      content: (
        <span>
          Đã sao chép <b>{record.tenTrinh?.substring(0, 30) || 'bản ghi'}</b>
          {' '}— click vào ô ngày muốn dán · <b>Esc</b> để hủy
        </span>
      ),
      duration: 0,
    })
  }

  const scheduleSelectInFlightRef = useRef(false)
  const pasteInFlightRef = useRef(false)

  const handlePaste = async (toDate, toNhom) => {
    if (!copiedRecord) return
    if (pasteInFlightRef.current) return   // chặn double-call do event bubble
    pasteInFlightRef.current = true
    const src = copiedRecord
    setCopiedRecord(null)
    message.destroy('copy-hint')
    try {
      const congField = CONG_FIELD_MAP[src.congDoan]
      const payload = {
        source:        'PLAN',
        ngayThucHien:  toDate,
        toNhom,
        congDoan:      src.congDoan      || null,
        maBravo:       src.maBravo       || null,
        maDonHang:     src.maDonHang     || null,
        maSp:          src.maSp          || null,
        tenTrinh:      src.tenTrinh      || null,
        soLo:          src.soLo          || null,
        coLo:          src.coLo          ?? null,
        phongThucHien: src.phongThucHien || null,
        chuY:          src.chuY          || null,
        saiLech:       src.saiLech       || null,
        tinhTrang:     src.tinhTrang     || null,
        ...(congField ? { [congField]: src[congField] ?? null } : {}),
      }
      await api.post('/work-schedule', payload)
      message.success(`Đã dán vào ${dayjs(toDate).format('DD/MM/YYYY')}${toNhom !== src.toNhom ? ` · ${toNhom}` : ''}`)
      { const sy = window.scrollY; await fetchData(undefined, { silent: true }); requestAnimationFrame(() => window.scrollTo({ top: sy, behavior: 'instant' })) }
      syncToDonHang(payload).then(() => fetchDonHang())
    } catch { message.error('Dán thất bại') }
    finally { pasteInFlightRef.current = false }
  }

  // Cancel copy / select-dh / multi-select mode on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (copiedRecord) { setCopiedRecord(null); message.destroy('copy-hint') }
        if (selectedDonHang) setSelectedDonHang(null)
        if (pendingScheduleCell) setPendingScheduleCell(null)
        if (isMultiSelectMode) { setIsMultiSelectMode(false); setSelectedIds(new Set()) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [copiedRecord, selectedDonHang, pendingScheduleCell, isMultiSelectMode])

  const fetchData = useCallback(async (range = dateRange, { silent = false } = {}) => {
    if (!range?.[0] || !range?.[1]) return
    if (!silent) setLoading(true)
    try {
      const { data: res } = await api.get('/work-schedule', {
        params: {
          page: 0, size: 1000, source: 'PLAN',
          fromDate: range[0].format('YYYY-MM-DD'),
          toDate:   range[1].format('YYYY-MM-DD'),
        },
      })
      setData(res.content || [])
    } catch {
      if (!silent) message.error('Không thể tải dữ liệu kế hoạch')
    } finally { if (!silent) setLoading(false) }
  }, [dateRange])

  // Build composite key Set maBravo||maDonHang từ danh sách Đơn Hàng
  const donHangKeys = useMemo(() =>
    new Set(donHangList.filter(d => d.maBravo && d.maDonHang).map(d => `${d.maBravo}||${d.maDonHang}`))
  , [donHangList])

  // Map maBravo||maDonHang → soLuongDatHang
  const donHangMap = useMemo(() => {
    const m = {}
    donHangList.forEach(d => {
      if (d.maBravo && d.maDonHang) m[`${d.maBravo}||${d.maDonHang}`] = d.soLuongDatHang
    })
    return m
  }, [donHangList])

  useEffect(() => { fetchData(); if (canEdit) fetchDonHang() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Silent refresh sau khi inline-edit coLo
  const handleSaveCoLo = useCallback(async () => {
    const sy = window.scrollY
    const v2Top = v2ScrollRef.current?.scrollTop ?? 0
    await fetchData(undefined, { silent: true })
    requestAnimationFrame(() => {
      window.scrollTo({ top: sy, behavior: 'instant' })
      if (v2ScrollRef.current) v2ScrollRef.current.scrollTop = v2Top
    })
  }, [fetchData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll về hôm nay đã bị tắt theo yêu cầu

  useEffect(() => {
    const handler = () => fetchData(undefined, { silent: true })
    window.addEventListener('app:silent-refresh', handler)
    return () => window.removeEventListener('app:silent-refresh', handler)
  }, [fetchData])

  useEffect(() => {
    const handler = () => { if (showDonHang) fetchDonHang() }
    window.addEventListener('app:donhang-updated', handler)
    return () => window.removeEventListener('app:donhang-updated', handler)
  }, [fetchDonHang, showDonHang])


  const openAdd = (toNhom, date = null) => {
    setEditItem(null)
    setDefaultToNhom(toNhom)
    setDefaultDate(date)
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditItem(record)
    setDefaultToNhom(record.toNhom)
    setDefaultDate(record.ngayThucHien)
    setModalOpen(true)
  }

  const handleDelete = async (record) => {
    try {
      await api.delete(`/work-schedule/${record.id}`)
      message.success('Đã xóa kế hoạch')
      { const sy = window.scrollY; await fetchData(undefined, { silent: true }); requestAnimationFrame(() => window.scrollTo({ top: sy, behavior: 'instant' })) }
      fetchDonHang()
    } catch { message.error('Xóa thất bại') }
  }

  // Cập nhật ngayPhatLenh + soLuongDaXepKh trong Đơn Hàng sau khi thêm/sửa Kế hoạch
  const syncToDonHang = useCallback(async (payload) => {
    const { maBravo, maDonHang } = payload || {}
    if (!maBravo || !maDonHang) return
    try {
      await api.post('/don-hang/sync-khoach-for', null, {
        params: { maBravo, maDonHang },
      })
    } catch {} // best-effort
  }, [])

  const addNextWeek = () => {
    const newEnd = dateRange?.[1]
      ? dayjs(dateRange[1]).add(7, 'day')
      : dayjs().add(7, 'day')
    const newRange = [dateRange?.[0] || dayjs(), newEnd]
    setDateRange(newRange)
    saveDateRange(newRange)  // lưu ngay, không chờ useEffect
    fetchData(newRange)
  }

  const toggleWeek = (weekIdx) => {
    setCollapsedWeeks(prev => {
      const next = new Set(prev)
      if (next.has(weekIdx)) next.delete(weekIdx)
      else next.add(weekIdx)
      return next
    })
  }

  const dates = dateRange?.[0] && dateRange?.[1] ? getDates(dateRange[0], dateRange[1]) : []

  // Split dates into weekly chunks (up to 7 days each)
  const weekChunks = []
  for (let i = 0; i < dates.length; i += 7) {
    weekChunks.push({
      weekIdx: Math.floor(i / 7),
      dates: dates.slice(i, Math.min(i + 7, dates.length)),
    })
  }

  // Total visible column count — collapsed weeks take zero space
  const totalCols = weekChunks.reduce((sum, wk) =>
    collapsedWeeks.has(wk.weekIdx) ? sum : sum + wk.dates.length, 0)

  const hiddenWeeks = weekChunks.filter(wk => collapsedWeeks.has(wk.weekIdx))

  const baseCell = { border: '1px solid #d9d9d9', padding: '4px 6px', verticalAlign: 'top' }

  return (
    <div>
      {/* ── Copy-mode banner ── */}
      {copiedRecord && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: '#fffbe6', border: '1px solid #faad14',
          padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 10,
          borderRadius: 0,
        }}>
          <CopyOutlined style={{ color: '#faad14', fontSize: 15 }} />
          <span style={{ fontWeight: 600, color: '#7c5c00', fontSize: 13 }}>
            Đang sao chép: <i style={{ fontStyle: 'normal', color: '#d46b08' }}>{copiedRecord.tenTrinh?.substring(0, 50) || 'bản ghi'}</i>
          </span>
          <span style={{ color: '#8c6c00', fontSize: 12 }}>— Click vào ô ngày bất kỳ để dán</span>
          <Button size="small" icon={<CloseCircleOutlined />}
            style={{ marginLeft: 'auto', color: '#8c6c00', borderColor: '#faad14' }}
            onClick={() => { setCopiedRecord(null); message.destroy('copy-hint') }}>
            Hủy (Esc)
          </Button>
        </div>
      )}

      {/* ── DonHang drag banner ── */}
      {isDraggingDh && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: '#f0fdf4', border: '1px solid #86efac',
          padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 10,
          borderRadius: 0,
        }}>
          <FileTextOutlined style={{ color: '#15803d', fontSize: 15 }} />
          <span style={{ fontWeight: 600, color: '#15803d', fontSize: 13 }}>
            Kéo đơn hàng: <i style={{ fontStyle: 'normal', color: '#166534' }}>{dragDonHangRef.current?.tenSanPham?.substring(0, 50) || dragDonHangRef.current?.maDonHang || ''}</i>
          </span>
          <span style={{ color: '#166534', fontSize: 12 }}>— Thả vào ô ngày để tạo kế hoạch</span>
        </div>
      )}

      {/* ── Multi-select delete banner ── */}
      {isMultiSelectMode && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: '#fff7e6', border: '1px solid #ffd591',
          padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <CheckSquareOutlined style={{ color: '#fa8c16', fontSize: 15 }} />
          <span style={{ fontWeight: 600, color: '#ad4e00', fontSize: 13 }}>
            Chế độ chọn nhiều:{' '}
            <i style={{ fontStyle: 'normal', color: '#d46b08', background: '#ffe7ba', padding: '1px 8px', borderRadius: 4 }}>
              {selectedIds.size} bản ghi đã chọn
            </i>
          </span>
          <span style={{ color: '#fa8c16', fontSize: 12 }}>— Click vào bản ghi để chọn / bỏ chọn</span>
          <Button size="small" onClick={handleSelectAll}
            style={{ marginLeft: 'auto', color: '#ad4e00', borderColor: '#ffd591' }}>
            {selectedIds.size === data.length && data.length > 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </Button>
          {selectedIds.size > 0 && (
            <Button size="small" danger icon={<DeleteOutlined />} onClick={handleDeleteSelected}>
              Xóa {selectedIds.size} bản ghi
            </Button>
          )}
          <Button size="small" icon={<CloseCircleOutlined />}
            style={{ color: '#ad4e00', borderColor: '#ffd591' }}
            onClick={toggleMultiSelectMode}>
            Hủy (Esc)
          </Button>
        </div>
      )}

      {/* ── Pending cell banner (nút + → chọn đơn hàng) ── */}
      {isPendingCellMode && !isDraggingDh && !isSelectDhMode && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: '#f6ffed', border: '1px solid #b7eb8f',
          padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 10,
          borderRadius: 0,
        }}>
          <UnorderedListOutlined style={{ color: '#52c41a', fontSize: 15 }} />
          <span style={{ fontWeight: 600, color: '#237804', fontSize: 13 }}>
            Đang xếp vào:{' '}
            <i style={{ fontStyle: 'normal', color: '#389e0d', background: '#d9f7be', padding: '1px 8px', borderRadius: 4 }}>
              {pendingScheduleCell.toNhom} · {dayjs(pendingScheduleCell.date).format('DD/MM/YYYY')}
            </i>
          </span>
          <span style={{ color: '#52c41a', fontSize: 12 }}>— Click vào đơn hàng bên dưới để xếp</span>
          <Button size="small" icon={<CloseCircleOutlined />}
            style={{ marginLeft: 'auto', color: '#237804', borderColor: '#b7eb8f' }}
            onClick={() => setPendingScheduleCell(null)}>
            Hủy (Esc)
          </Button>
        </div>
      )}

      {/* ── Select-DonHang banner (click mode) ── */}
      {isSelectDhMode && !isDraggingDh && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: '#f0f5ff', border: '1px solid #adc6ff',
          padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 10,
          borderRadius: 0,
        }}>
          <CalendarOutlined style={{ color: '#2f54eb', fontSize: 15 }} />
          <span style={{ fontWeight: 600, color: '#1d3c8a', fontSize: 13 }}>
            Xếp kế hoạch: <i style={{ fontStyle: 'normal', color: '#2f54eb' }}>{selectedDonHang.tenSanPham?.substring(0, 50) || selectedDonHang.maDonHang}</i>
          </span>
          <span style={{ color: '#4872c4', fontSize: 12 }}>— Click vào ô ngày muốn xếp</span>
          <Button size="small" icon={<CloseCircleOutlined />}
            style={{ marginLeft: 'auto', color: '#1d3c8a', borderColor: '#adc6ff' }}
            onClick={() => setSelectedDonHang(null)}>
            Hủy (Esc)
          </Button>
        </div>
      )}

      {/* ── Filter bar controls (portal → tab nav khi filterSlot có, fallback sticky) ── */}
      {(() => {
        const filterControls = (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
            ...(filterSlot ? { padding: '0 8px' } : { marginBottom: hiddenWeeks.length > 0 ? 6 : 0 }) }}>
            <Button
              icon={<CalendarOutlined />}
              onClick={() => setShowDatePicker(v => !v)}
              style={{
                borderColor: showDatePicker ? '#1D4ED8' : '#d9d9d9',
                color: showDatePicker ? '#1D4ED8' : '#595959',
                fontWeight: 500,
                minWidth: 200,
              }}
            >
              {dateRange?.[0]?.format('DD/MM/YYYY') || '...'}&nbsp;→&nbsp;{dateRange?.[1]?.format('DD/MM/YYYY') || '...'}
            </Button>
            {showDatePicker && (
              <RangePicker
                value={dateRange}
                format="DD/MM/YYYY"
                onChange={r => { if (r) { setDateRange(r); saveDateRange(r) }; setShowDatePicker(false) }}
                placeholder={['Từ ngày', 'Đến ngày']}
                style={{ width: 260 }}
                autoFocus
                open
                onOpenChange={open => { if (!open) setShowDatePicker(false) }}
              />
            )}
            <Button type="primary" icon={<SearchOutlined />} onClick={() => {
              setCollapsedWeeks(new Set())
              fetchData()
            }}>Tìm</Button>
            <Button icon={<ReloadOutlined />} onClick={() => {
              const r = [defaultFrom, defaultTo]
              setDateRange(r)
              saveDateRange(r)
              setCollapsedWeeks(new Set())
              fetchData(r)
              setShowDatePicker(false)
            }} />
            {weekChunks.length > 0 && (
              <Button onClick={() => setCollapsedWeeks(
                collapsedWeeks.size === weekChunks.length
                  ? new Set()
                  : new Set(weekChunks.map(wk => wk.weekIdx))
              )}>
                {collapsedWeeks.size === weekChunks.length ? 'Hiện tất cả' : 'Ẩn tất cả'}
              </Button>
            )}
            {canEdit && !miniPickerMode && (
              <Tooltip title={showDonHang ? 'Ẩn bảng Đơn Hàng' : 'Hiện bảng Đơn Hàng'}>
                <Button
                  icon={<FileTextOutlined />}
                  type={showDonHang ? 'primary' : 'default'}
                  style={showDonHang ? { borderColor: '#2d6a2d', background: '#2d6a2d' } : { borderColor: '#2d6a2d', color: '#2d6a2d' }}
                  onClick={() => setShowDonHang(v => {
                    const next = !v
                    if (next) setTimeout(() => {
                      const el = document.getElementById('bang-don-hang')
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }, 150)
                    return next
                  })}
                >
                  ĐƠN HÀNG
                </Button>
              </Tooltip>
            )}
            {canEdit && (
              <Tooltip title={isMultiSelectMode ? 'Thoát chế độ chọn nhiều' : 'Chọn nhiều bản ghi để xóa'}>
                <Button
                  icon={<CheckSquareOutlined />}
                  type={isMultiSelectMode ? 'primary' : 'default'}
                  danger={isMultiSelectMode}
                  onClick={toggleMultiSelectMode}
                >
                  Chọn nhiều
                </Button>
              </Tooltip>
            )}
          </div>
        )

        const hiddenWeeksRow = hiddenWeeks.length > 0 && (
          <div style={{ padding: '4px 0 2px', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>Tuần đã ẩn:</span>
            {hiddenWeeks.map(wk => {
              const startStr = dayjs(wk.dates[0]).format('DD/MM')
              const endStr   = dayjs(wk.dates[wk.dates.length - 1]).format('DD/MM')
              return (
                <Tag
                  key={wk.weekIdx}
                  color="default"
                  style={{ cursor: 'pointer', fontSize: 11, userSelect: 'none' }}
                  onClick={() => toggleWeek(wk.weekIdx)}
                >
                  T{wk.weekIdx + 1} ({startStr}–{endStr}) ▶
                </Tag>
              )
            })}
            <Button size="small" type="link" style={{ fontSize: 11, padding: 0 }}
              onClick={() => setCollapsedWeeks(new Set())}>
              Hiện tất cả
            </Button>
          </div>
        )

        if (filterSlot) {
          // Filter controls đã được portal vào tab nav — chỉ giữ hiddenWeeks sticky nếu có
          return (
            <>
              {createPortal(filterControls, filterSlot)}
              {hiddenWeeks.length > 0 && (
                <div style={{
                  position: 'sticky', top: 47, zIndex: 10,
                  background: '#fff', padding: '4px 0 4px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                }}>
                  {hiddenWeeksRow}
                </div>
              )}
            </>
          )
        }

        // Fallback: render sticky filter bar + hiddenWeeks trong content area
        return (
          <div style={{
            position: 'sticky', top: 47, zIndex: 10,
            background: '#fff', paddingTop: 8, paddingBottom: 4,
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          }}>
            {filterControls}
            {hiddenWeeksRow}
          </div>
        )
      })()}

      {loading ? (
        <Spin style={{ display: 'block', margin: '80px auto' }} />
      ) : miniPickerMode ? (
        /* ══════════════════════════════════════════════════════════════
           V2 LAYOUT: Hàng dọc — rows = dates, columns = groups
           ══════════════════════════════════════════════════════════════ */
        (() => {
          // Build map: date → group → records[]
          const dgMap = {}
          dates.forEach(d => {
            dgMap[d] = {}
            TO_GROUPS.forEach(g => { dgMap[d][g.key] = [] })
          })
          data.forEach(r => {
            if (r.ngayThucHien && dgMap[r.ngayThucHien] && r.toNhom && dgMap[r.ngayThucHien][r.toNhom])
              dgMap[r.ngayThucHien][r.toNhom].push(r)
          })

          const thStyle = {
            padding: '6px 8px', fontWeight: 700, fontSize: 12,
            border: '1px solid #d9d9d9', textAlign: 'center',
            whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 3,
          }
          const tdDate = {
            padding: '6px 8px', border: '1px solid #e8e8e8',
            background: '#f5f6f7', fontWeight: 700, fontSize: 12,
            whiteSpace: 'nowrap', verticalAlign: 'top',
            position: 'sticky', left: 0, zIndex: 2,
            minWidth: 72,
          }
          const tdCell = {
            padding: '3px 4px', border: '1px solid #e8e8e8',
            verticalAlign: 'top', minWidth: 180, minHeight: 36,
          }

          return (
            <div
              ref={v2ScrollRef}
              onScroll={(e) => sessionStorage.setItem('v2ScrollTop', e.currentTarget.scrollTop)}
              style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 99px)' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 80 }} />
                  {TO_GROUPS.map(g => <col key={g.key} />)}
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, background: '#37474f', color: '#fff', left: 0, zIndex: 4 }}>
                      Ngày
                    </th>
                    {TO_GROUPS.map(g => (
                      <th key={g.key} style={{ ...thStyle, background: g.headerBg, color: g.headerText }}>
                        {g.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weekChunks.map(wk => {
                    const isWkCollapsed = collapsedWeeks.has(wk.weekIdx)
                    return (
                      <React.Fragment key={wk.weekIdx}>
                        {/* Week separator row */}
                        <tr>
                          <td colSpan={TO_GROUPS.length + 1}
                            style={{
                              padding: '3px 10px', background: '#e8edf5',
                              border: '1px solid #c5d0e6',
                              fontSize: 11, fontWeight: 700, color: '#4a5568',
                              cursor: 'pointer', userSelect: 'none',
                            }}
                            onClick={() => setCollapsedWeeks(prev => {
                              const next = new Set(prev)
                              if (next.has(wk.weekIdx)) next.delete(wk.weekIdx)
                              else next.add(wk.weekIdx)
                              return next
                            })}
                          >
                            {isWkCollapsed ? '▶' : '▼'}{' '}
                            Tuần {wk.weekIdx} &nbsp;·&nbsp;
                            {dayjs(wk.dates[0]).format('DD/MM')} – {dayjs(wk.dates[wk.dates.length - 1]).format('DD/MM/YYYY')}
                            {isWkCollapsed && <span style={{ marginLeft: 8, color: '#1677ff' }}>— đã ẩn</span>}
                          </td>
                        </tr>
                        {!isWkCollapsed && wk.dates.map(d => {
                          const djs   = dayjs(d)
                          const isEnd = djs.day() === 0 || djs.day() === 6
                          // Tổng số người thực hiện mỗi nhóm trong ngày d (dùng congField như V1)
                          const dayTotals = TO_GROUPS.map(g => {
                            const recs = dgMap[d]?.[g.key] || []
                            return recs.reduce((s, r) => {
                              // Fallback về group default khi congDoan chưa được set
                              const cd = r.congDoan || GROUP_DEFAULT_CD[g.key]
                              const field = CONG_FIELD_MAP[cd]
                              return s + (field ? (Number(r[field]) || 0) : 0)
                            }, 0)
                          })
                          const dayGrandTotal = dayTotals.reduce((s, t) => s + t, 0)
                          // Hiện hàng tổng khi có bất kỳ record nào trong ngày (kể cả khi chưa nhập số người)
                          const hasTotals = TO_GROUPS.some(g => (dgMap[d]?.[g.key] || []).length > 0)
                          return (
                            <React.Fragment key={d}>
                            <tr style={{ background: isEnd ? '#fafafa' : '#fff' }}>
                              {/* Date cell — sticky left */}
                              <td style={{
                                ...tdDate,
                                background: isEnd ? '#e9e9e9' : '#f5f6f7',
                                color: isEnd ? '#5d4037' : '#37474f',
                              }}>
                                <div style={{ fontWeight: 800 }}>{DAY_VI[djs.day()]}</div>
                                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>{djs.format('DD/MM/YY')}</div>
                              </td>

                              {/* One cell per group */}
                              {TO_GROUPS.map(group => {
                                const recs        = dgMap[d][group.key] || []
                                const isPasteMode = !!copiedRecord
                                const isOpen      = pickerCell?.date === d && pickerCell?.toNhom === group.key
                                const filtered    = donHangList.filter(dh => {
                                  if (!pickerSearch) return true
                                  const q = pickerSearch.toLowerCase()
                                  return (dh.tenSanPham || '').toLowerCase().includes(q) ||
                                    (dh.maDonHang || '').toLowerCase().includes(q) ||
                                    (dh.maSp      || '').toLowerCase().includes(q) ||
                                    (dh.maBravo   || '').toLowerCase().includes(q)
                                })
                                const cellKey    = `${d}__${group.key}`
                                const isDragOver = dragOverCell === cellKey

                                return (
                                  <td key={group.key}
                                    onDragEnter={canEdit ? (e) => e.preventDefault() : undefined}
                                    onDragOver={canEdit ? (e) => { e.preventDefault(); setDragOverCell(cellKey) } : undefined}
                                    onDragLeave={canEdit ? (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCell(null) } : undefined}
                                    onDrop={canEdit ? (e) => { e.preventDefault(); handleDrop(d, group.key) } : undefined}
                                    style={{
                                      ...tdCell,
                                      background: isDragOver
                                        ? (isDraggingDh ? '#bbf7d0' : '#bae0ff')
                                        : isSelectDhMode ? '#eff6ff'
                                        : isPasteMode ? '#fffbe6'
                                        : isEnd ? '#fafafa' : group.bodyBg,
                                      outline: isDragOver
                                        ? (isDraggingDh ? '2px dashed #16a34a' : '2px dashed #1677ff')
                                        : isSelectDhMode ? '1.5px dashed #2f54eb'
                                        : isPasteMode ? '1.5px dashed #faad14'
                                        : 'none',
                                      outlineOffset: -2,
                                    }}>
                                    {/* Existing records */}
                                    {recs.map(task => {
                                      const isRec = true
                                      return isMultiSelectMode ? (
                                        <div key={task.id}
                                          onClick={() => handleToggleSelect(task.id)}
                                          style={{ cursor: 'pointer' }}>
                                          <TaskItem
                                            record={task} bodyBg={group.bodyBg}
                                            onEdit={openEdit} onDelete={handleDelete}
                                            canEdit={canEdit} onDragStart={handleDragStart}
                                            onCopy={handleCopy} isCopied={copiedRecord?.id === task.id}
                                            noDonHang={canEdit && !!(task.maBravo && task.maDonHang && !donHangKeys.has(`${task.maBravo}||${task.maDonHang}`))}
                                            soLuongDon={canEdit && task.maBravo && task.maDonHang ? donHangMap[`${task.maBravo}||${task.maDonHang}`] : null}
                                            isMultiSelectMode={isMultiSelectMode}
                                            isSelected={selectedIds.has(task.id)}
                                            onToggleSelect={handleToggleSelect}
                                            onSaveCoLo={handleSaveCoLo}
                                          />
                                        </div>
                                      ) : (
                                        <TaskItem
                                          key={task.id} record={task} bodyBg={group.bodyBg}
                                          onEdit={openEdit} onDelete={handleDelete}
                                          canEdit={canEdit} onDragStart={handleDragStart}
                                          onCopy={handleCopy} isCopied={copiedRecord?.id === task.id}
                                          noDonHang={canEdit && !!(task.maBravo && task.maDonHang && !donHangKeys.has(`${task.maBravo}||${task.maDonHang}`))}
                                          soLuongDon={canEdit && task.maBravo && task.maDonHang ? donHangMap[`${task.maBravo}||${task.maDonHang}`] : null}
                                          isMultiSelectMode={isMultiSelectMode}
                                          isSelected={selectedIds.has(task.id)}
                                          onToggleSelect={handleToggleSelect}
                                          onSaveCoLo={handleSaveCoLo}
                                        />
                                      )
                                    })}

                                    {/* Add button / mini picker */}
                                    {canEdit && !isMultiSelectMode && (
                                      isSelectDhMode || copiedRecord ? (
                                        <Button type="dashed" size="small" block
                                          icon={isSelectDhMode ? <CalendarOutlined /> : <CopyOutlined />}
                                          style={{ fontSize: 11, height: 22, marginTop: recs.length ? 2 : 0,
                                            color: isSelectDhMode ? '#2f54eb' : '#d46b08',
                                            borderColor: isSelectDhMode ? '#2f54eb' : '#faad14', fontWeight: 600,
                                          }}
                                          onClick={(e) => { e.stopPropagation(); isSelectDhMode ? handleScheduleSelected(d, group.key) : handlePaste(d, group.key) }}
                                        />
                                      ) : (
                                        <Popover
                                          open={isOpen}
                                          onOpenChange={(v) => {
                                            if (v) { setPickerCell({ date: d, toNhom: group.key }); setPickerSearch('') }
                                            else setPickerCell(null)
                                          }}
                                          trigger="click"
                                          placement="bottomLeft"
                                          overlayStyle={{ width: 340 }}
                                          content={
                                            <div>
                                              <div style={{ fontWeight: 700, fontSize: 12, color: '#1d4ed8', marginBottom: 6 }}>
                                                📋 {group.label} · {djs.format('DD/MM/YYYY')}
                                              </div>
                                              <Input size="small"
                                                placeholder="Tìm theo tên SP, mã ĐH..."
                                                prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                                                value={pickerSearch}
                                                onChange={e => setPickerSearch(e.target.value)}
                                                autoFocus
                                                style={{ marginBottom: 6 }}
                                              />
                                              <div style={{ maxHeight: 240, overflowY: 'auto', borderTop: '1px solid #f0f0f0' }}>
                                                {donHangLoading ? (
                                                  <div style={{ textAlign: 'center', padding: 12, color: '#999' }}>Đang tải...</div>
                                                ) : filtered.length === 0 ? (
                                                  <div style={{ textAlign: 'center', padding: 12, color: '#bbb', fontSize: 12 }}>Không tìm thấy đơn hàng</div>
                                                ) : filtered.map(dh => (
                                                  <div key={dh.id}
                                                    onClick={() => handleMiniPickerSelect(dh, d, group.key)}
                                                    style={{ padding: '6px 8px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', transition: 'background 0.12s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                                                    onMouseLeave={e => e.currentTarget.style.background = ''}
                                                  >
                                                    <div style={{ fontWeight: 600, fontSize: 12, color: '#1e293b', lineHeight: 1.4 }}>
                                                      {dh.tenSanPham || dh.maSp || '(Chưa có tên)'}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                                                      <span style={{ fontFamily: 'monospace', color: '#1677ff', fontWeight: 600 }}>{dh.maDonHang || '—'}</span>
                                                      {dh.soLuongDatHang != null && (
                                                        <span style={{ marginLeft: 8, color: '#389e0d', fontWeight: 600 }}>
                                                          SL: {Number(dh.soLuongDatHang).toLocaleString('vi-VN')}
                                                        </span>
                                                      )}
                                                      {dh.soLo && <span style={{ marginLeft: 8, color: '#8c8c8c' }}>Lô: {dh.soLo}</span>}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                              <div style={{ marginTop: 6, borderTop: '1px solid #f0f0f0', paddingTop: 6 }}>
                                                <Button size="small" block type="dashed" icon={<FormOutlined />}
                                                  onClick={() => { setPickerCell(null); openAdd(group.key, d) }}>
                                                  Nhập thủ công
                                                </Button>
                                              </div>
                                            </div>
                                          }
                                        >
                                          <Button type="dashed" size="small" block icon={<PlusOutlined />}
                                            style={{
                                              fontSize: 11, height: 22, marginTop: recs.length ? 2 : 0,
                                              color: isDragOver ? '#16a34a' : isOpen ? '#1677ff' : '#c0c0c0',
                                              borderColor: isDragOver ? '#16a34a' : isOpen ? '#91caff' : '#e8e8e8',
                                              background: isOpen ? '#e6f4ff' : 'transparent',
                                            }}
                                          />
                                        </Popover>
                                      )
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                            {/* Hàng tổng hợp cuối mỗi ngày */}
                            {hasTotals && (
                              <tr style={{ background: isEnd ? '#f0f0ee' : '#f5f6ff' }}>
                                <td style={{
                                  ...tdDate, fontSize: 11, fontWeight: 700,
                                  color: dayGrandTotal > 0 ? '#1677ff' : '#94a3b8',
                                  textAlign: 'center',
                                  background: isEnd ? '#e4e4e2' : '#ebebf8',
                                  padding: '2px 4px', lineHeight: 1.3,
                                }} title="Tổng số người thực hiện cả ngày">
                                  <div style={{ fontSize: 9, color: '#8c8c8c', fontWeight: 400 }}>∑</div>
                                  <div>{dayGrandTotal > 0 ? dayGrandTotal : '—'}</div>
                                </td>
                                {TO_GROUPS.map((g, gi) => {
                                  const total = dayTotals[gi]
                                  const recCount = (dgMap[d]?.[g.key] || []).length
                                  return (
                                    <td key={g.key} style={{
                                      border: '1px solid #e8e8e8',
                                      padding: '2px 8px',
                                      textAlign: 'right',
                                      fontSize: 11, fontWeight: 700,
                                      color: total > 0 ? '#1677ff' : recCount > 0 ? '#faad14' : '#d9d9d9',
                                    }}>
                                      {total > 0
                                        ? total
                                        : recCount > 0
                                          ? <Tooltip title="Chưa nhập số người thực hiện">
                                              <span style={{ fontSize: 10, fontWeight: 400, cursor: 'help' }}>? người</span>
                                            </Tooltip>
                                          : '—'}
                                    </td>
                                  )
                                })}
                              </tr>
                            )}
                            </React.Fragment>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })()
      ) : (
        /* ══════════════════════════════════════════════════════════════
           V1 LAYOUT: Hàng ngang — rows = record slots, cols = dates
           ══════════════════════════════════════════════════════════════ */
        <div style={{ position: 'relative' }}>
        <div
          ref={v1ScrollRef}
          onScroll={(e) => {
            if (v1SyncingRef.current) return
            v1SyncingRef.current = true
            if (v1MirrorRef.current) v1MirrorRef.current.scrollLeft = e.currentTarget.scrollLeft
            v1SyncingRef.current = false
          }}
          style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 155px)' }}>
          {TO_GROUPS.map(group => {
            const groupRecs = data.filter(r => r.toNhom === group.key)

            const dateMap = {}
            dates.forEach(d => { dateMap[d] = [] })
            groupRecs.forEach(r => {
              if (r.ngayThucHien && dateMap[r.ngayThucHien] !== undefined)
                dateMap[r.ngayThucHien].push(r)
            })

            const maxRows        = Math.max(...dates.map(d => dateMap[d].length), 0)
            const displayRows    = Math.max(maxRows, 1)
            const isGroupCollapsed = collapsedGroups.has(group.key)
            const toggleGroup = () => setCollapsedGroups(prev => {
              const next = new Set(prev)
              if (next.has(group.key)) next.delete(group.key)
              else next.add(group.key)
              return next
            })

            return (
              <div key={group.key} style={{ marginBottom: 8 }}>
                <table style={{
                  borderCollapse: 'collapse', fontSize: 12,
                  tableLayout: 'fixed', width: '100%',
                  minWidth: totalCols * 40 + 94,
                }}>
                  {!isGroupCollapsed && (
                    <colgroup>
                      <col style={{ width: 36 }} />
                      {weekChunks.map(wk =>
                        collapsedWeeks.has(wk.weekIdx)
                          ? null
                          : wk.dates.map(d => <col key={d} style={{ width: 219 }} />)
                      )}
                      <col style={{ width: 58 }} />
                    </colgroup>
                  )}

                  <thead>
                    {/* Team header — sticky group label + spanning content */}
                    <tr>
                      <td
                        onClick={toggleGroup}
                        style={{
                          position: 'sticky', top: 0, left: 0, zIndex: 8,
                          background: group.headerBg, color: group.headerText,
                          fontWeight: 800, fontSize: 10, textAlign: 'center',
                          padding: '5px 2px', cursor: 'pointer', userSelect: 'none',
                          borderRight: '1px solid rgba(255,255,255,0.25)',
                          whiteSpace: 'nowrap', minWidth: 36,
                          boxShadow: '2px 0 6px rgba(0,0,0,0.15)',
                        }}
                      >
                        {group.key}
                      </td>
                      <td
                        colSpan={isGroupCollapsed ? 1 : totalCols + 1}
                        style={{
                          position: 'sticky', top: 0, zIndex: 7,
                          background: group.headerBg, color: group.headerText,
                          fontWeight: 700, fontSize: 13, padding: '5px 12px', letterSpacing: 0.4,
                          cursor: 'pointer', userSelect: 'none',
                        }}
                        onClick={toggleGroup}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            display: 'inline-block', width: 18, textAlign: 'center',
                            fontSize: 12, transition: 'transform 0.2s',
                            transform: isGroupCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                          }}>▼</span>
                          <span>{group.label} — {group.key}</span>
                          {isGroupCollapsed && (
                            <span style={{ fontWeight: 400, fontSize: 11, opacity: 0.75, marginLeft: 6 }}>
                              ({groupRecs.length} bản ghi · click để mở)
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Week + date header rows — hidden when group collapsed */}
                    {!isGroupCollapsed && <>
                    <tr>
                      <th rowSpan={2} style={{
                        ...baseCell, background: '#e8e8e8',
                        textAlign: 'center', verticalAlign: 'middle',
                        position: 'sticky', top: 28, left: 0, zIndex: 6,
                        boxShadow: '2px 2px 6px rgba(0,0,0,0.1)',
                      }}>#</th>

                      {weekChunks.map(wk => {
                        const isCollapsed = collapsedWeeks.has(wk.weekIdx)
                        const startStr = dayjs(wk.dates[0]).format('DD/MM')
                        const endStr   = dayjs(wk.dates[wk.dates.length - 1]).format('DD/MM')
                        const weekLabel = `T${wk.weekIdx + 1}`

                        if (isCollapsed) return null

                        // Expanded: week label + hide button
                        return (
                          <th key={wk.weekIdx} colSpan={wk.dates.length} style={{
                            ...baseCell,
                            background: '#1e3a5f',
                            textAlign: 'center',
                            padding: '2px 8px',
                            verticalAlign: 'middle',
                            position: 'sticky', top: 28, zIndex: 3,
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, color: '#bfdbfe', fontSize: 11, letterSpacing: 0.3 }}>
                                {weekLabel} ({startStr} – {endStr})
                              </span>
                              <Tooltip title="Thu gọn tuần này">
                                <Button
                                  size="small" type="text"
                                  style={{ fontSize: 11, color: '#93c5fd', padding: '0 4px', height: 20, lineHeight: '20px' }}
                                  onClick={() => toggleWeek(wk.weekIdx)}
                                >
                                  ◀ Ẩn
                                </Button>
                              </Tooltip>
                            </div>
                          </th>
                        )
                      })}

                      {/* Extra column: +1 tuần button — rowSpan=2 to cover date header row */}
                      {group.key === TO_GROUPS[0].key ? (
                        <th rowSpan={2} style={{
                          ...baseCell, background: '#f5f5f5',
                          textAlign: 'center', verticalAlign: 'middle',
                          position: 'sticky', top: 0, zIndex: 3,
                        }}>
                          <Tooltip title="Thêm 7 ngày tiếp theo cho tất cả các tổ">
                            <Button
                              size="small" type="primary" ghost
                              icon={<PlusOutlined />}
                              style={{ fontSize: 11, whiteSpace: 'nowrap' }}
                              onClick={addNextWeek}
                            >
                              +1 tuần
                            </Button>
                          </Tooltip>
                        </th>
                      ) : (
                        <th rowSpan={2} style={{ ...baseCell, background: '#f5f5f5', position: 'sticky', top: 28, zIndex: 3 }} />
                      )}
                    </tr>

                    {/* Date header row — only expanded week dates rendered here */}
                    <tr>
                      {weekChunks.map(wk => {
                        if (collapsedWeeks.has(wk.weekIdx)) return null
                        return wk.dates.map(d => {
                          const djs        = dayjs(d)
                          const dayIdx     = djs.day()
                          const isSunday   = dayIdx === 0
                          const isSaturday = dayIdx === 6
                          const colIds     = isMultiSelectMode ? dateMap[d].map(r => r.id) : []
                          const hasRecs    = colIds.length > 0
                          const allColSel  = hasRecs && colIds.every(id => selectedIds.has(id))
                          const someColSel = hasRecs && !allColSel && colIds.some(id => selectedIds.has(id))

                          let bg    = '#dbeafe'   // weekday: blue-100
                          let color = '#1e40af'   // weekday: blue-800
                          if (isSunday)   { bg = '#fee2e2'; color = '#991b1b' }  // red — day off
                          else if (isSaturday) { bg = '#fef3c7'; color = '#92400e' } // amber — half-day

                          if (isMultiSelectMode && allColSel)  { bg = '#ffe7ba'; color = '#ad4e00' }
                          else if (isMultiSelectMode && someColSel) { bg = '#fff7e6'; color = '#ad4e00' }

                          return (
                            <th key={d}
                              onClick={isMultiSelectMode && hasRecs ? () => handleSelectByDateGroup(d, group.key) : undefined}
                              onContextMenu={e => {
                                e.preventDefault()
                                e.stopPropagation()
                                const rect = e.currentTarget.getBoundingClientRect()
                                const menuW = 210
                                const x = Math.min(window.innerWidth - menuW - 8, Math.max(4, rect.left + rect.width / 2 - menuW / 2))
                                setCtxMenu({ date: d, groupKey: group.key, x, y: rect.bottom + 4 })
                              }}
                              style={{
                                ...baseCell,
                                background: bg,
                                color,
                                textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap',
                                cursor: isMultiSelectMode && hasRecs ? 'pointer' : 'default',
                                outline: isMultiSelectMode && allColSel ? '1.5px solid #fa8c16' : 'none',
                                outlineOffset: -2,
                                userSelect: 'none',
                                padding: '3px 6px',
                                position: 'sticky', top: 56, zIndex: 2,
                              }}>
                              {isMultiSelectMode && hasRecs && (
                                <span style={{ fontSize: 12, marginRight: 3, verticalAlign: 'middle' }}>
                                  {allColSel ? '☑' : someColSel ? '⊟' : '☐'}
                                </span>
                              )}
                              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5 }}>
                                {DAY_VI[dayIdx]}
                                {isSunday && <span style={{ fontSize: 9, marginLeft: 3, opacity: 0.8 }}>●</span>}
                              </div>
                              <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.85 }}>
                                {djs.format('DD/MM/YY')}
                              </div>
                            </th>
                          )
                        })
                      })}
                    </tr>
                    </>}
                  </thead>

                  {!isGroupCollapsed && <tbody>
                    {/* Task rows (+ 1 extra empty buffer row at the end) */}
                    {Array.from({ length: displayRows }, (_, rowIdx) => (
                      <tr key={rowIdx}>
                        <td style={{
                          ...baseCell,
                          background: rowIdx === displayRows - 1 ? '#f0f0f0' : '#f5f5f5',
                          textAlign: 'center', color: '#8c8c8c', fontWeight: 700,
                          fontSize: 11,
                          position: 'sticky', left: 0, zIndex: 2,
                          boxShadow: '2px 0 6px rgba(0,0,0,0.06)',
                        }}>
                          {(rowIdx === displayRows - 1 && dates.every(d => !dateMap[d]?.[rowIdx])) ? '+' : rowIdx + 1}
                        </td>
                        {weekChunks.map(wk => {
                          if (collapsedWeeks.has(wk.weekIdx)) return null
                          return wk.dates.map(d => {
                            const task        = dateMap[d][rowIdx]
                            const isRatGap    = task?.tinhTrang === 'rat_gap'
                            const isGap       = task?.tinhTrang === 'gap'
                            const isDone      = task?.tinhTrang === 'done'
                            const cellKey     = `${d}__${group.key}`
                            const isDragOver  = dragOverCell === cellKey
                            const isPasteMode = !!copiedRecord
                            const isBufferRow = rowIdx === displayRows - 1 // last always-empty row
                            const isThisPending = isPendingCellMode && pendingScheduleCell?.date === d && pendingScheduleCell?.toNhom === group.key
                            return (
                              <td key={d}
                                onDragEnter={canEdit ? (e) => { e.preventDefault() } : undefined}
                                onDragOver={canEdit ? (e) => { e.preventDefault(); e.stopPropagation(); setDragOverCell(cellKey) } : undefined}
                                onDragLeave={canEdit ? (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCell(null) } : undefined}
                                onDrop={canEdit ? (e) => { e.preventDefault(); handleDrop(d, group.key) } : undefined}
                                onClick={
                                  isMultiSelectMode ? (task ? () => handleToggleSelect(task.id) : undefined)
                                  : isPasteMode ? () => handlePaste(d, group.key)
                                  : isSelectDhMode ? () => handleScheduleSelected(d, group.key)
                                  : undefined  // buffer row: Dropdown handles click; normal empty row: Dropdown too
                                }
                                style={{
                                  ...baseCell,
                                  background: isDragOver
                                    ? (isDraggingDh ? '#bbf7d0' : '#bae0ff')
                                    : isMultiSelectMode && task && selectedIds.has(task.id)
                                      ? '#fff7e6'
                                      : isSelectDhMode
                                        ? '#eff6ff'
                                        : isPasteMode
                                          ? '#fffbe6'
                                          : task
                                            ? (isRatGap ? '#fff0f0' : isGap ? '#f5f0ff' : isDone ? '#f0fdf4' : group.bodyBg)
                                            : isBufferRow ? '#fafafa' : group.bodyBg,
                                  outline: isDragOver
                                    ? (isDraggingDh ? '2px dashed #16a34a' : '2px dashed #1677ff')
                                    : isMultiSelectMode && task && selectedIds.has(task.id)
                                      ? '1.5px solid #fa8c16'
                                      : isSelectDhMode
                                        ? '1.5px dashed #2f54eb'
                                        : isPasteMode
                                          ? '1.5px dashed #faad14'
                                          : 'none',
                                  outlineOffset: -2,
                                  cursor: isMultiSelectMode ? (task ? 'pointer' : 'default') : isPasteMode || isSelectDhMode ? 'copy' : isDraggingDh ? 'copy' : 'default',
                                  wordBreak: 'break-word',
                                  padding: task ? '3px 4px' : '2px 4px',
                                  minHeight: 28,
                                  transition: 'background 0.15s',
                                  position: 'relative',
                                }}>
                                {task ? (
                                  <TaskItem
                                    record={task}
                                    bodyBg={group.bodyBg}
                                    onEdit={openEdit}
                                    onDelete={handleDelete}
                                    canEdit={canEdit}
                                    onDragStart={handleDragStart}
                                    onCopy={handleCopy}
                                    isCopied={copiedRecord?.id === task.id}
                                    noDonHang={canEdit && !!(task.maBravo && task.maDonHang && !donHangKeys.has(`${task.maBravo}||${task.maDonHang}`))}
                                    soLuongDon={canEdit && task.maBravo && task.maDonHang ? donHangMap[`${task.maBravo}||${task.maDonHang}`] : null}
                                    isMultiSelectMode={isMultiSelectMode}
                                    isSelected={selectedIds.has(task.id)}
                                    onToggleSelect={handleToggleSelect}
                                    onSaveCoLo={handleSaveCoLo}
                                  />
                                ) : canEdit && !isMultiSelectMode && (
                                  /* Empty cell content */
                                  (isSelectDhMode || copiedRecord) ? (
                                    /* Copy / select-DH mode: single action button */
                                    <Button
                                      type="dashed" size="small" block
                                      icon={isSelectDhMode ? <CalendarOutlined /> : <CopyOutlined />}
                                      style={{
                                        fontSize: 11, height: 22,
                                        color: isDragOver ? '#16a34a' : isSelectDhMode ? '#2f54eb' : '#d46b08',
                                        borderColor: isDragOver ? '#16a34a' : isSelectDhMode ? '#2f54eb' : '#faad14',
                                        fontWeight: 600,
                                      }}
                                      onClick={(e) => { e.stopPropagation(); isSelectDhMode ? handleScheduleSelected(d, group.key) : handlePaste(d, group.key) }}
                                    />
                                  ) : miniPickerMode ? (
                                    /* V2: mini order picker Popover */
                                    (() => {
                                      const cellId = `${d}__${group.key}`
                                      const isOpen = pickerCell?.date === d && pickerCell?.toNhom === group.key
                                      const filtered = donHangList.filter(dh => {
                                        if (!pickerSearch) return true
                                        const q = pickerSearch.toLowerCase()
                                        return (
                                          (dh.tenSanPham || '').toLowerCase().includes(q) ||
                                          (dh.maDonHang  || '').toLowerCase().includes(q) ||
                                          (dh.maSp       || '').toLowerCase().includes(q) ||
                                          (dh.maBravo    || '').toLowerCase().includes(q)
                                        )
                                      })
                                      return (
                                        <Popover
                                          open={isOpen}
                                          onOpenChange={(v) => {
                                            if (v) { setPickerCell({ date: d, toNhom: group.key }); setPickerSearch('') }
                                            else setPickerCell(null)
                                          }}
                                          trigger="click"
                                          placement="bottomLeft"
                                          overlayStyle={{ width: 340 }}
                                          content={
                                            <div>
                                              <div style={{ fontWeight: 700, fontSize: 12, color: '#1d4ed8', marginBottom: 6 }}>
                                                📋 Chọn đơn hàng → {group.key} · {dayjs(d).format('DD/MM/YYYY')}
                                              </div>
                                              <Input
                                                size="small"
                                                placeholder="Tìm theo tên SP, mã ĐH, mã SP..."
                                                prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                                                value={pickerSearch}
                                                onChange={e => setPickerSearch(e.target.value)}
                                                autoFocus
                                                style={{ marginBottom: 6 }}
                                              />
                                              <div style={{ maxHeight: 240, overflowY: 'auto', borderTop: '1px solid #f0f0f0' }}>
                                                {donHangLoading ? (
                                                  <div style={{ textAlign: 'center', padding: 12, color: '#999' }}>Đang tải...</div>
                                                ) : filtered.length === 0 ? (
                                                  <div style={{ textAlign: 'center', padding: 12, color: '#bbb', fontSize: 12 }}>Không tìm thấy đơn hàng</div>
                                                ) : filtered.map(dh => (
                                                  <div key={dh.id}
                                                    onClick={() => handleMiniPickerSelect(dh, d, group.key)}
                                                    style={{
                                                      padding: '6px 8px',
                                                      cursor: 'pointer',
                                                      borderBottom: '1px solid #f5f5f5',
                                                      transition: 'background 0.12s',
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                                                    onMouseLeave={e => e.currentTarget.style.background = ''}
                                                  >
                                                    <div style={{ fontWeight: 600, fontSize: 12, color: '#1e293b', lineHeight: 1.4 }}>
                                                      {dh.tenSanPham || dh.maSp || '(Chưa có tên)'}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                                                      <span style={{ fontFamily: 'monospace', color: '#1677ff', fontWeight: 600 }}>{dh.maDonHang || '—'}</span>
                                                      {dh.soLuongDatHang != null && (
                                                        <span style={{ marginLeft: 8, color: '#389e0d', fontWeight: 600 }}>
                                                          SL: {Number(dh.soLuongDatHang).toLocaleString('vi-VN')}
                                                        </span>
                                                      )}
                                                      {dh.soLo && <span style={{ marginLeft: 8, color: '#8c8c8c' }}>Lô: {dh.soLo}</span>}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                              <div style={{ marginTop: 6, borderTop: '1px solid #f0f0f0', paddingTop: 6 }}>
                                                <Button size="small" block type="dashed" icon={<FormOutlined />}
                                                  onClick={() => { setPickerCell(null); openAdd(group.key, d) }}>
                                                  Nhập thủ công
                                                </Button>
                                              </div>
                                            </div>
                                          }
                                        >
                                          <Button
                                            type="dashed" size="small" block
                                            icon={<PlusOutlined />}
                                            style={{
                                              fontSize: 11, height: 22,
                                              color: isDragOver ? '#16a34a' : isOpen ? '#1677ff' : '#c0c0c0',
                                              borderColor: isDragOver ? '#16a34a' : isOpen ? '#91caff' : '#e8e8e8',
                                              background: isOpen ? '#e6f4ff' : 'transparent',
                                            }}
                                          />
                                        </Popover>
                                      )
                                    })()
                                  ) : (
                                    /* V1: Dropdown 2 lựa chọn */
                                    <Dropdown
                                      trigger={['click']}
                                      placement="bottomLeft"
                                      menu={{
                                        items: [
                                          {
                                            key: 'manual',
                                            icon: <FormOutlined style={{ color: '#1677ff' }} />,
                                            label: (
                                              <span>
                                                <span style={{ fontWeight: 600, fontSize: 12 }}>Thủ công</span>
                                                <span style={{ color: '#8c8c8c', fontSize: 11, marginLeft: 6 }}>Nhập tay qua form</span>
                                              </span>
                                            ),
                                            onClick: () => openAdd(group.key, d),
                                          },
                                          {
                                            key: 'select',
                                            icon: <UnorderedListOutlined style={{ color: '#52c41a' }} />,
                                            label: (
                                              <span>
                                                <span style={{ fontWeight: 600, fontSize: 12 }}>Chọn từ đơn hàng</span>
                                                <span style={{ color: '#8c8c8c', fontSize: 11, marginLeft: 6 }}>Click đơn bên dưới</span>
                                              </span>
                                            ),
                                            onClick: () => handlePlusSelectMode(d, group.key),
                                          },
                                        ],
                                      }}
                                    >
                                      <Button
                                        type="dashed" size="small" block
                                        icon={isThisPending ? <UnorderedListOutlined /> : <PlusOutlined />}
                                        style={{
                                          fontSize: 11, height: 22,
                                          color: isDragOver ? '#16a34a' : isThisPending ? '#52c41a' : '#c0c0c0',
                                          borderColor: isDragOver ? '#16a34a' : isThisPending ? '#b7eb8f' : '#e8e8e8',
                                          fontWeight: isThisPending ? 600 : 400,
                                          background: 'transparent',
                                        }}
                                      />
                                    </Dropdown>
                                  )
                                )}
                              </td>
                            )
                          })
                        })}
                        <td style={{ ...baseCell, background: rowIdx === displayRows - 1 ? '#f5f5f5' : '#fafafa' }} />
                      </tr>
                    ))}

                    {/* Count row — tổng số người thực hiện trong ngày */}
                    <tr>
                      <td style={{ ...baseCell, background: '#f0f0f0', textAlign: 'center', fontWeight: 700, color: '#595959', fontSize: 11 }}>∑</td>
                      {weekChunks.map(wk => {
                        if (collapsedWeeks.has(wk.weekIdx)) return null
                        return wk.dates.map(d => {
                          const total = dateMap[d].reduce((sum, r) => {
                            const field = CONG_FIELD_MAP[r.congDoan]
                            return sum + (field ? (Number(r[field]) || 0) : 0)
                          }, 0)
                          return (
                            <td key={d} style={{
                              ...baseCell, background: '#f0f0f0',
                              textAlign: 'center', fontWeight: 700, fontSize: 13,
                              color: total > 0 ? '#1677ff' : '#d9d9d9',
                            }}>
                              {total > 0 ? total : '—'}
                            </td>
                          )
                        })
                      })}
                      <td style={{ ...baseCell, background: '#f0f0f0' }} />
                    </tr>
                  </tbody>}
                </table>

              </div>
            )
          })}
        </div>
        {/* Mirror scrollbar — nằm SAU content để luôn hiển thị ở đáy */}
        <div
          ref={v1MirrorRef}
          onScroll={(e) => {
            if (v1SyncingRef.current) return
            v1SyncingRef.current = true
            if (v1ScrollRef.current) v1ScrollRef.current.scrollLeft = e.currentTarget.scrollLeft
            v1SyncingRef.current = false
          }}
          style={{
            position: 'sticky', bottom: 0, zIndex: 15,
            overflowX: 'auto', overflowY: 'hidden',
            height: 14, background: 'rgba(240,244,255,0.96)',
            borderTop: '1px solid #d0d7f0',
            boxShadow: '0 -2px 6px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ height: 1, width: totalCols * 175 + 94 }} />
        </div>
        </div>
      )}  {/* end V1 layout / end loading conditional */}

      {/* ── Bảng ĐƠN HÀNG độc lập — chỉ admin/adminKH, ẩn ở V2 ── */}
      {canEdit && showDonHang && !miniPickerMode && (() => {
        const sortDonHang = (a, b) => {
          const ab = (a.maBravo || '').localeCompare(b.maBravo || '')
          return ab !== 0 ? ab : (a.maDonHang || '').localeCompare(b.maDonHang || '')
        }
        const activeDhList = donHangList.filter(dh => dh.tinhTrangSx !== 'done').sort(sortDonHang)
        const doneDhList   = donHangList.filter(dh => dh.tinhTrangSx === 'done').sort(sortDonHang)
        const matched = [...activeDhList, ...doneDhList]

        // For each matched order, calculate SL đã xếp KH — chỉ tính PCPL1+PCPL2 (tổ pha chế chính)
        const slXepMap = {}
        data.forEach(r => {
          if (!r.maBravo || !r.maDonHang) return
          if (r.toNhom !== 'PCPL1' && r.toNhom !== 'PCPL2') return
          const k = `${r.maBravo}||${r.maDonHang}`
          slXepMap[k] = (slXepMap[k] || 0) + (Number(r.coLo) || 0)
        })

        // Which toNhom handles this order in the current kế hoạch
        const toNhomMap = {}
        data.forEach(r => {
          if (!r.maBravo || !r.maDonHang) return
          const k = `${r.maBravo}||${r.maDonHang}`
          if (!toNhomMap[k]) toNhomMap[k] = new Set()
          toNhomMap[k].add(r.toNhom)
        })

        const fmtNum = v => (v != null && v !== '') ? Number(v).toLocaleString('vi-VN') : '—'

        const thStyle = {
          border: '1px solid #b7ddb7', background: '#2d6a2d', color: '#fff',
          padding: '5px 8px', fontWeight: 700, fontSize: 11, textAlign: 'center',
          whiteSpace: 'nowrap',
        }
        const tdStyle = {
          border: '1px solid #d4edda', padding: '4px 8px',
          fontSize: 12, verticalAlign: 'middle',
        }

        return (
          <div id="bang-don-hang" style={{ marginTop: 20, overflowX: 'auto' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: isPendingCellMode ? '#237804' : '#2d6a2d',
              color: '#fff', padding: '6px 14px',
              borderRadius: '4px 4px 0 0', fontWeight: 700, fontSize: 13, letterSpacing: 0.4,
              transition: 'background 0.2s',
              outline: isPendingCellMode ? '3px solid #52c41a' : 'none',
              outlineOffset: -1,
            }}>
              <FileTextOutlined />
              <span>BẢNG ĐƠN HÀNG</span>
              {isPendingCellMode && (
                <span style={{ marginLeft: 8, fontWeight: 400, fontSize: 11, background: 'rgba(255,255,255,0.18)', padding: '1px 8px', borderRadius: 4 }}>
                  ↑ Click vào đơn để xếp vào {pendingScheduleCell.toNhom} · {dayjs(pendingScheduleCell.date).format('DD/MM/YYYY')}
                </span>
              )}
              <span style={{ fontWeight: 400, fontSize: 11, opacity: 0.8, marginLeft: 8 }}>
                ({donHangLoading ? '…' : `${activeDhList.length} chưa xong${doneDhList.length > 0 ? ` · ${doneDhList.length} đã hoàn thành` : ''}`})
              </span>
              <span style={{ fontWeight: 400, fontSize: 11, opacity: 0.65, marginLeft: 12, fontStyle: 'italic' }}>
                ⠿ Kéo hàng vào ô ngày để tạo kế hoạch
              </span>
              <Button
                size="small" type="text" icon={<ReloadOutlined />}
                style={{ marginLeft: 'auto', color: '#fff', opacity: 0.8 }}
                loading={donHangLoading}
                onClick={fetchDonHang}
              />
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 36 }}>#</th>
                  <th style={{ ...thStyle, width: 72 }}>TỔ</th>
                  <th style={{ ...thStyle, width: 110 }}>MÃ BRAVO</th>
                  <th style={{ ...thStyle, width: 80 }}>MÃ SP</th>
                  <th style={{ ...thStyle }}>TÊN SẢN PHẨM</th>
                  <th style={{ ...thStyle, width: 110 }}>MÃ ĐƠN HÀNG</th>
                  <th style={{ ...thStyle, width: 110 }}>NGÀY ĐẶT HÀNG</th>
                  <th style={{ ...thStyle, width: 90 }}>SL ĐẶT HÀNG</th>
                  <th style={{ ...thStyle, width: 90 }}>T.TRẠNG ĐH</th>
                  <th style={{ ...thStyle, width: 90 }}>SL ĐÃ XẾP KH</th>
                  <th style={{ ...thStyle, width: 90 }}>SL CÒN LẠI</th>
                  <th style={{ ...thStyle, width: 100 }}>T.TRẠNG SX</th>
                </tr>
              </thead>
              <tbody>
                {matched.length === 0 && !donHangLoading && (
                  <tr>
                    <td colSpan={12} style={{ ...tdStyle, textAlign: 'center', color: '#bbb', padding: 20 }}>
                      Chưa có đơn hàng nào — thêm trong tab Đơn Hàng
                    </td>
                  </tr>
                )}
                {matched.map((dh, idx) => {
                  const k = `${dh.maBravo}||${dh.maDonHang}`
                  const slXep = slXepMap[k] || 0
                  const slConLai = (Number(dh.soLuongDatHang) || 0) - slXep
                  const toNhoms = [...(toNhomMap[k] || [])]
                  const isDone  = dh.tinhTrangSx === 'done'
                  const isDoing = dh.tinhTrangSx === 'doing'
                  const rowBg = isDone ? (idx % 2 === 0 ? '#fafafa' : '#f5f5f5') : (idx % 2 === 0 ? '#f6fcf6' : '#fff')
                  const isRatGap = dh.tinhTrangDatHang === 'rat_gap'
                  const isGap   = dh.tinhTrangDatHang === 'gap'
                  const hasMaDonHang = !!dh.maDonHang
                  const isSelected  = selectedDonHang?.id === dh.id
                  const isFirstDoneRow = isDone && idx === activeDhList.length
                  return (
                    <React.Fragment key={dh.id}>
                    {isFirstDoneRow && (
                      <tr>
                        <td colSpan={12} style={{ padding: '5px 10px', background: '#f0f0f0', color: '#888', fontSize: 11, textAlign: 'center', fontStyle: 'italic', borderTop: '2px solid #d9d9d9' }}>
                          — Đơn hàng đã hoàn thành pha chế — kéo vào PCPL3 để xếp lịch phân liều —
                        </td>
                      </tr>
                    )}
                    <tr
                      draggable={hasMaDonHang}
                      onDragStart={() => handleDonHangDragStart(dh)}
                      onDragEnd={handleDonHangDragEnd}
                      onClick={() => handleSelectDonHang(dh)}
                      style={{
                        background: isSelected ? '#dbeafe' : isPendingCellMode && hasMaDonHang ? '#f6ffed' : rowBg,
                        cursor: hasMaDonHang ? 'pointer' : 'not-allowed',
                        opacity: !hasMaDonHang ? 0.5 : isDone ? 0.65 : 1,
                        outline: isSelected ? '2px solid #2f54eb' : isPendingCellMode && hasMaDonHang ? '1px solid #b7eb8f' : 'none',
                        outlineOffset: -1,
                        transition: 'background 0.15s, outline 0.15s',
                      }}
                      title={hasMaDonHang
                        ? isPendingCellMode
                          ? `Click để xếp vào ${pendingScheduleCell.toNhom} · ${dayjs(pendingScheduleCell.date).format('DD/MM/YYYY')}`
                          : (isSelected ? 'Đang chọn — click ô ngày để xếp kế hoạch' : 'Click để chọn xếp kế hoạch, hoặc kéo thả vào ô ngày')
                        : 'Cần có mã đơn hàng để xếp kế hoạch'}
                    >
                      <td style={{ ...tdStyle, textAlign: 'center', color: '#3aa8ed', fontWeight: 600 }}>
                        {isSelected
                          ? <CheckCircleOutlined style={{ color: '#2f54eb', fontSize: 14 }} />
                          : hasMaDonHang
                            ? <span style={{ display: 'block', fontSize: 10, color: '#3aa8ed', lineHeight: 1, marginBottom: 2 }}>⠿</span>
                            : <span style={{ fontSize: 10, color: '#f5222d' }}>!</span>
                        }
                        <span style={{ fontSize: 11 }}>{idx + 1}</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {toNhoms.map(tn => {
                          const grp = TO_GROUPS.find(g => g.key === tn)
                          return (
                            <span key={tn} style={{
                              display: 'inline-block', padding: '1px 6px', borderRadius: 3, fontSize: 10, margin: '1px',
                              background: grp?.headerBg || '#3aa8ed', color: grp?.headerText || '#fff', fontWeight: 700,
                            }}>{tn}</span>
                          )
                        })}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>
                        {dh.maBravo || <span style={{ color: '#bbb' }}>—</span>}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {dh.maSp
                          ? <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 3, background: '#e6f4ff', color: '#0958d9', fontFamily: 'monospace', fontWeight: 600, fontSize: 11 }}>{dh.maSp}</span>
                          : <span style={{ color: '#bbb' }}>—</span>}
                      </td>
                      <td style={{ ...tdStyle, color: '#3aa8ed' }}>{dh.tenSanPham || <span style={{ color: '#bbb' }}>—</span>}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600, color: '#7c5c00', textAlign: 'center' }}>
                        {dh.maDonHang || <span style={{ color: '#bbb' }}>—</span>}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', color: '#3aa8ed', fontSize: 11 }}>
                        {dh.ngayDatHang ? dayjs(dh.ngayDatHang).format('DD/MM/YYYY') : '—'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#262626' }}>
                        {fmtNum(dh.soLuongDatHang)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {isRatGap && <Tag color="red"    style={{ margin: 0, fontSize: 10 }}>🔥 Rất Gấp</Tag>}
                        {isGap    && <Tag color="orange" style={{ margin: 0, fontSize: 10 }}>⚡ Gấp</Tag>}
                        {!isRatGap && !isGap && <span style={{ color: '#53c6e9' }}>—</span>}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#3aa8ed' }}>
                        {fmtNum(slXep || null)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: slConLai > 0 ? '#cf1322' : '#3aa8ed' }}>
                        {fmtNum(slConLai > 0 ? slConLai : null)}
                        {slConLai <= 0 && slXep > 0 && <Tag color="success" style={{ margin: '0 0 0 4px', fontSize: 10 }}>Đủ</Tag>}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {isDone  && <Tag color="success" style={{ margin: 0, fontSize: 10 }}>✓ Hoàn thành</Tag>}
                        {isDoing && <Tag color="blue"    style={{ margin: 0, fontSize: 10 }}>⏳ Đang SX</Tag>}
                        {!isDone && !isDoing && <span style={{ color: '#bbb' }}>—</span>}
                      </td>
                    </tr>
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })()}

      <PlanModal
        open={modalOpen}
        editItem={editItem}
        defaultToNhom={defaultToNhom}
        defaultDate={defaultDate}
        donHangList={donHangList}
        donHangLoading={donHangLoading}
        onClose={() => setModalOpen(false)}
        onReloadData={() => fetchData(undefined, { silent: true })}
        onSaved={async (payload) => {
          const scrollY = window.scrollY
          await fetchData(undefined, { silent: true })
          requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'instant' }))
          syncToDonHang(payload).then(() => fetchDonHang())
        }}
      />

      {/* ── Context menu: right-click trên header ngày ── */}
      {ctxMenu && (
        <>
          {/* overlay trong suốt để đóng khi click ra ngoài */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
            onClick={() => setCtxMenu(null)}
            onContextMenu={e => { e.preventDefault(); setCtxMenu(null) }}
          />
          <div style={{
            position: 'fixed',
            top: ctxMenu.y,
            left: ctxMenu.x,
            zIndex: 9999,
            background: '#fff',
            boxShadow: '0 6px 24px rgba(0,0,0,0.14)',
            borderRadius: 8,
            padding: '4px 0',
            minWidth: 200,
            border: '1px solid #e2e8f0',
            userSelect: 'none',
          }}>
            {/* header nhỏ: ngày được click */}
            <div style={{
              padding: '6px 14px 4px',
              fontSize: 11,
              color: '#64748b',
              fontWeight: 600,
              borderBottom: '1px solid #f1f5f9',
              marginBottom: 2,
            }}>
              {DAY_VI[dayjs(ctxMenu.date).day()]} {dayjs(ctxMenu.date).format('DD/MM/YYYY')}
              <span style={{
                marginLeft: 8, padding: '1px 7px', borderRadius: 10, fontSize: 10,
                background: '#dbeafe', color: '#1e40af', fontWeight: 700,
              }}>{ctxMenu.groupKey}</span>
            </div>
            {/* action: Thêm kế hoạch */}
            <div
              style={{
                padding: '8px 14px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                color: '#1d4ed8', fontWeight: 600, fontSize: 13,
                borderRadius: 4, margin: '0 4px',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => {
                setEditItem(null)
                setDefaultToNhom(ctxMenu.groupKey)
                setDefaultDate(ctxMenu.date)
                setModalOpen(true)
                setCtxMenu(null)
              }}
            >
              <PlusOutlined style={{ fontSize: 13 }} />
              Thêm kế hoạch
            </div>
          </div>
        </>
      )}

    </div>
  )
}

// ── Các tab key hợp lệ ────────────────────────────────────────────────────────
const VALID_TAB_KEYS = ['tong-hop', 'khoach', 'khoach-v2', 'don-hang']

// Đọc tab hiện tại từ URL (?tab=...). Fallback về 'tong-hop' nếu không hợp lệ.
function getTabFromUrl() {
  const tab = new URLSearchParams(window.location.search).get('tab')
  return VALID_TAB_KEYS.includes(tab) ? tab : 'tong-hop'
}

// Ghi tab vào URL mà không reload trang (replaceState thay vì pushState
// để tránh tạo history entry thừa khi auto-reload ghi lại URL liên tục)
function setTabInUrl(tabKey) {
  const url = new URL(window.location.href)
  url.searchParams.set('tab', tabKey)
  window.history.replaceState({ tab: tabKey }, '', url)
}

// ── Wrapper: gộp Kế hoạch + Lệnh SX + Đơn Hàng ──────────────────────────────
export default function KhoachPage() {
  const { isAdmin, isAdminKH, isStageAdmin } = useAuth()
  const canViewExtra = isAdmin() || isAdminKH() || isStageAdmin()

  // Khởi tạo từ URL → auto-reload sẽ đọc lại đúng tab cũ
  const [activeTab, setActiveTab] = useState(getTabFromUrl)
  const [lenhSxKey, setLenhSxKey] = useState(0)
  const [filterSlot, setFilterSlot] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  // Khi user click tab: cập nhật state + ghi vào URL
  const handleTabChange = (key) => {
    setActiveTab(key)
    setTabInUrl(key)
    if (key === 'lenh-sx') setLenhSxKey(k => k + 1)
  }

  // Đồng bộ nếu URL thay đổi từ bên ngoài (ví dụ: browser back/forward)
  useEffect(() => {
    const onPopState = () => setActiveTab(getTabFromUrl())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Reset filterSlot khi rời khỏi tab khoach
  useEffect(() => {
    if (activeTab !== 'khoach') setFilterSlot(null)
  }, [activeTab])

  // Đảm bảo URL luôn có ?tab= ngay khi mount lần đầu
  useEffect(() => {
    setTabInUrl(activeTab)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const tabItems = useMemo(() => [
    {
      key: 'tong-hop',
      label: <span><BarChartOutlined style={{ marginRight: 5 }} />Tổng hợp</span>,
      children: <KhoachTongHopContent onViewCalendar={() => handleTabChange('khoach')} />,
    },
    {
      key: 'khoach',
      label: <span><CalendarOutlined style={{ marginRight: 5 }} />Kế hoạch</span>,
      children: <KhoachContent filterSlot={filterSlot} />,
    },
    ...(canViewExtra ? [
      {
        key: 'lenh-sx',
        label: <span><UnorderedListOutlined style={{ marginRight: 5 }} />Lệnh Sản Xuất</span>,
        children: <LenhSanXuatTab key={lenhSxKey} />,
      },
      {
        key: 'don-hang',
        label: <span><ShoppingOutlined style={{ marginRight: 5 }} />Đơn Hàng</span>,
        children: <DonHangPage />,
      },
    ] : []),
  ], [canViewExtra, filterSlot]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={containerRef} style={{ background: '#fff', height: isFullscreen ? '100vh' : undefined, overflow: isFullscreen ? 'auto' : undefined }}>
      <style>{`
        /* ── Tab button styles ── */
        .khoach-tabs .ant-tabs-tab {
          background: #37add8 !important;
          border-radius: 6px 6px 0 0 !important;
          padding: 6px 18px !important;
          margin-right: 4px !important;
          color: #fff !important;
          font-weight: 600;
          border: none !important;
          transition: background 0.18s, box-shadow 0.18s, transform 0.12s;
          box-shadow: 0 2px 6px rgba(0,0,0,0.10);
        }
        .khoach-tabs .ant-tabs-tab:hover {
          background: #115F8C !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.22) !important;
          transform: translateY(-1px);
        }
        .khoach-tabs .ant-tabs-tab.ant-tabs-tab-active {
          background: #0C4A70 !important;
          box-shadow: 0 3px 10px rgba(0,0,0,0.28) !important;
        }
        .khoach-tabs .ant-tabs-tab .ant-tabs-tab-btn,
        .khoach-tabs .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn { color: #fff !important; }
        .khoach-tabs .ant-tabs-ink-bar { display: none !important; }
        .khoach-tabs .ant-tabs-nav::before { border-bottom: 2px solid #37b1e6 !important; }
        .khoach-tabs > .ant-tabs-content-holder { padding-top: 4px; }

        /* ── Sticky tab nav ── */
        .khoach-tabs .ant-tabs-nav {
          position: sticky !important;
          top: 0 !important;
          z-index: 25 !important;
          background: #fff !important;
          margin-bottom: 0 !important;
          padding-bottom: 6px !important;
          box-shadow: 0 2px 8px rgba(29,78,216,0.08) !important;
        }

        /* Cho phép sticky hoạt động và bảng đơn hàng extend scroll height */
        .khoach-tabs .ant-tabs-content-holder,
        .khoach-tabs .ant-tabs-content {
          overflow: visible !important;
        }
        .khoach-tabs .ant-tabs-tabpane {
          overflow: visible !important;
          height: auto !important;
          min-height: 0 !important;
        }

        /* ── Hiệu ứng chuyển tab: fade + trượt nhẹ lên ── */
        .khoach-tabs .ant-tabs-tabpane-active {
          animation: khoachTabFadeIn 0.22s ease both;
        }
        @keyframes khoachTabFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Ô trống trong task row — dùng ::after để không block drag events ── */
        td.kh-cell-empty::after {
          content: '＋';
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; font-weight: 300; color: #d0d0d0;
          pointer-events: none; user-select: none;
          transition: color 0.15s, opacity 0.15s;
        }
        td.kh-cell-empty:hover::after { color: #93b7fc; }
      `}</style>
      <Tabs
        className="khoach-tabs"
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        size="middle"
        style={{ marginTop: -8 }}
        tabBarStyle={{ marginBottom: 0 }}
        tabBarExtraContent={{
          left: (
            <Tooltip title={isFullscreen ? 'Thoát toàn màn hình (Esc)' : 'Mở rộng toàn màn hình'}>
              <Button
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={toggleFullscreen}
                style={{ marginRight: 8, marginLeft: 4 }}
              />
            </Tooltip>
          ),
          right: activeTab === 'khoach'
            ? <div ref={setFilterSlot} style={{ display: 'flex', alignItems: 'center' }} />
            : null,
        }}
      />
    </div>
  )
}
