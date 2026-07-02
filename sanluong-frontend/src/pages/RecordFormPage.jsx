import React, { useEffect, useRef, useState } from 'react'
import {
  Form, Input, InputNumber, Select, Button,
  Row, Col, Space, message, Tooltip, Tag, Tabs, Badge, Modal, List, Alert, Popconfirm, AutoComplete
} from 'antd'
import {
  SaveOutlined, ArrowLeftOutlined, SyncOutlined, CheckCircleOutlined,
  LinkOutlined, WarningOutlined, EditOutlined,
  PlusOutlined, DeleteOutlined, CalendarOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const { Option } = Select

const TRANG_THAI_OPTIONS = [
  { value: 'done',  label: 'Done'  },
  { value: 'doing', label: 'Doing' },
]

// Stage config: color, accent, label
const STAGES = [
  { key: 'pc',   label: 'PC',   sub: 'Pha chế',  color: '#1677ff', bg: '#e6f4ff', border: '#91caff', statusField: 'pcTrangThai',   slField: 'slPc',   congField: 'pcChiPhi'  },
  { key: 'pl',   label: 'PL',   sub: 'Phân liều', color: '#52c41a', bg: '#f6ffed', border: '#b7eb8f', statusField: 'plTrangThai',   slField: 'pcPl',   congField: 'plChiPhi'  },
  { key: 'dg',   label: 'ĐG',   sub: 'Đóng gói', color: '#fa8c16', bg: '#fff7e6', border: '#ffd591', statusField: 'dgTrangThai',   slField: 'dg2',    congField: 'dgChiPhi'  },
  { key: 'bbc1', label: 'BBC1', sub: 'Bao bì cấp 1', color: '#722ed1', bg: '#f9f0ff', border: '#d3adf7', statusField: 'bbc1TrangThai', slField: 'bbc1_2', congField: 'bbc1_3'   },
]

const statusBadge = (val) => {
  if (val === 'done')  return <span style={{ display:'inline-block', padding:'2px 10px', borderRadius:20, background:'#f6ffed', border:'1px solid #b7eb8f', color:'#389e0d', fontWeight:700, fontSize:12 }}>✓ Done</span>
  if (val === 'doing') return <span style={{ display:'inline-block', padding:'2px 10px', borderRadius:20, background:'#fff7e6', border:'1px solid #ffd591', color:'#d46b08', fontWeight:700, fontSize:12 }}>⟳ Doing</span>
  return <span style={{ color:'#d9d9d9', fontSize:12 }}>—</span>
}

export default function RecordFormPage() {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { isAdmin, isAdminKH, canEditHangLoi, canEditProduction } = useAuth()
  const canEditHL    = canEditHangLoi()
  const canEditProd  = canEditProduction()
  const [isEditing, setIsEditing] = useState(!isEdit) // true khi tạo mới, false khi xem/chỉnh sửa
  const [saving, setSaving] = useState(false)
  const [phatLenh, setPhatLenh] = useState(false)
  const [lookupStatus, setLookupStatus] = useState(null)
  const lookupTimer = useRef(null)
  const [suggestions, setSuggestions] = useState([])
  const [bravoOptions, setBravoOptions] = useState([])
  const bravoTimer = useRef(null)
  const justSelectedBravo = useRef(false)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [productInfo, setProductInfo] = useState(null)
  const [hangLoiList, setHangLoiList] = useState([])
  const [hangLoiLoading, setHangLoiLoading] = useState(false)
  const [hangLoiEdits, setHangLoiEdits] = useState({})
  const [hangLoiSaving, setHangLoiSaving] = useState({})
  const [hlData, setHlData] = useState(null)
  const [activeTab, setActiveTab] = useState(() => {
    try { return location.state?.openTab || 'sanluong' } catch { return 'sanluong' }
  })
  const [historyList, setHistoryList] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [ngayMap, setNgayMap] = useState({})        // hangLoiId → []
  const [ngayLoading, setNgayLoading] = useState({}) // hangLoiId → bool
  const [ngayNew, setNgayNew] = useState({})         // hangLoiId → {ngay,slTraVe,slDatSauXuLy,slHuy,ghiChu}
  const [ngaySaving, setNgaySaving] = useState({})   // hangLoiId+ngayId → bool

  // Watched values for live calculation
  const watchBbc1    = Form.useWatch('bbc1_3',        form) || 0
  const watchPc      = Form.useWatch('pcChiPhi',      form) || 0
  const watchPl      = Form.useWatch('plChiPhi',      form) || 0
  const watchDg      = Form.useWatch('dgChiPhi',      form) || 0
  const watchGnnl    = Form.useWatch('temDb',         form) || 0
  const watchPcStatus   = Form.useWatch('pcTrangThai',   form)
  const watchPlStatus   = Form.useWatch('plTrangThai',   form)
  const watchDgStatus   = Form.useWatch('dgTrangThai',   form)
  const watchBbc1Status = Form.useWatch('bbc1TrangThai', form)
  const watchDg2     = Form.useWatch('dg2',      form) || 0
  const watchPcPl    = Form.useWatch('pcPl',     form) || 0
  const watchSoLuong = Form.useWatch('soLuong',  form) || 0
  const watchMaBravo = Form.useWatch('maBravo',  form) || ''
  const watchMaTp    = Form.useWatch('maTp',     form) || ''
  const watchTienTrinh = Form.useWatch('tienTrinh', form) || ''
  const watchLsx     = Form.useWatch('lsx',      form) || ''
  const watchSlPc       = Form.useWatch('slPc',        form) || 0
  const watchBbc1_2     = Form.useWatch('bbc1_2',      form) || 0
  const watchPlQaLayMau     = Form.useWatch('plQaLayMau',     form) || 0
  const watchDgQaLayMau     = Form.useWatch('dgQaLayMau',     form) || 0
  const watchPlQaLuuMau     = Form.useWatch('plQaLuuMau',     form) || 0
  const watchDgQaLuuMau     = Form.useWatch('dgQaLuuMau',     form) || 0
  const watchPlQaKiemNghiem = Form.useWatch('plQaKiemNghiem', form) || 0
  const watchDgQaKiemNghiem = Form.useWatch('dgQaKiemNghiem', form) || 0
  const watchPlQaKhac       = Form.useWatch('plQaKhac',       form) || 0
  const watchDgQaKhac       = Form.useWatch('dgQaKhac',       form) || 0
  const watchTpNhapKho   = Form.useWatch('tpNhapKho',   form) || 0

  const fetchHangLoiList = async (maTp, lsx) => {
    if (!maTp || !lsx) return
    setHangLoiLoading(true)
    try {
      const { data } = await api.get('/hang-loi/by-product', { params: { maTp, soLo: lsx } })
      setHangLoiList(data || [])
      // Load daily entries for each hang loi
      ;(data || []).forEach(h => fetchNgay(h.id))
      // Khởi tạo edit state từ dữ liệu hiện tại
      const edits = {}
      ;(data || []).forEach(h => {
        edits[h.id] = {
          soLuongTraVe:      h.soLuongTraVe      != null ? Number(h.soLuongTraVe)      : null,
          liDoTraVe:         h.liDoTraVe         || '',
          huongXuLy:         h.huongXuLy         || null,
          trangThaiXuLy:     h.trangThaiXuLy     || null,
          lyDoChuaThucHien:  h.lyDoChuaThucHien  || '',
          slDatSauXuLy:      h.slDatSauXuLy      != null ? Number(h.slDatSauXuLy)      : null,
          slHuy:             h.slHuy             != null ? Number(h.slHuy)             : null,
          ghiChu:            h.ghiChu            || '',
        }
      })
      setHangLoiEdits(edits)
    } catch {}
    finally { setHangLoiLoading(false) }
  }


  const handleHangLoiFieldChange = (id, field, value) => {
    setHangLoiEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  const saveHangLoiRow = async (item) => {
    const edit = hangLoiEdits[item.id] || {}
    setHangLoiSaving(prev => ({ ...prev, [item.id]: true }))
    try {
      await api.put(`/hang-loi/${item.id}`, {
        mtpCoMem:           item.mtpCoMem,
        mtpSongAn:          item.mtpSongAn,
        tenHangHoa:         item.tenHangHoa,
        soLo:               item.soLo,
        soLuong:            item.soLuong,
        phanLoaiLoi:        item.phanLoaiLoi,
        namXuLy:            item.namXuLy,
        ngayBatDau:         item.ngayBatDau,
        ngayKetThuc:        item.ngayKetThuc,
        soLuongTraVe:       edit.soLuongTraVe  !== undefined ? edit.soLuongTraVe  : item.soLuongTraVe,
        liDoTraVe:          edit.liDoTraVe     !== undefined ? edit.liDoTraVe     : item.liDoTraVe,
        huongXuLy:          edit.huongXuLy     !== undefined ? edit.huongXuLy     : item.huongXuLy,
        trangThaiXuLy:      edit.trangThaiXuLy !== undefined ? edit.trangThaiXuLy : item.trangThaiXuLy,
        lyDoChuaThucHien:   edit.lyDoChuaThucHien !== undefined ? edit.lyDoChuaThucHien : item.lyDoChuaThucHien,
        slDatSauXuLy:       edit.slDatSauXuLy  !== undefined ? edit.slDatSauXuLy  : item.slDatSauXuLy,
        slHuy:              edit.slHuy          !== undefined ? edit.slHuy          : item.slHuy,
        ghiChu:             edit.ghiChu         !== undefined ? edit.ghiChu         : item.ghiChu,
      })
      message.success('Đã lưu & tự động cập nhật bản ghi Sản lượng')
      await fetchHangLoiList(form.getFieldValue('maTp'), form.getFieldValue('lsx'))
      // Refresh hl* từ production record sau khi sync
      if (id) {
        api.get(`/production/${id}`).then(({ data }) => setHlData({
          hlSoLuongTraVe:     data.hlSoLuongTraVe,
          hlLiDoTraVe:        data.hlLiDoTraVe,
          hlHuongXuLy:        data.hlHuongXuLy,
          hlTrangThaiXuLy:    data.hlTrangThaiXuLy,
          hlLyDoChuaThucHien: data.hlLyDoChuaThucHien,
          hlSlDatSauXuLy:     data.hlSlDatSauXuLy,
          hlSlHuy:            data.hlSlHuy,
        })).catch(() => {})
      }
    } catch { message.error('Lưu hàng lỗi thất bại') }
    finally { setHangLoiSaving(prev => ({ ...prev, [item.id]: false })) }
  }

  const fetchNgay = async (hangLoiId) => {
    setNgayLoading(prev => ({ ...prev, [hangLoiId]: true }))
    try {
      const { data } = await api.get(`/hang-loi/${hangLoiId}/ngay`)
      setNgayMap(prev => ({ ...prev, [hangLoiId]: data || [] }))
    } catch { /* silent */ }
    finally { setNgayLoading(prev => ({ ...prev, [hangLoiId]: false })) }
  }

  const addNgay = async (item) => {
    const hlId = item.id
    const form0 = ngayNew[hlId] || {}
    if (!form0.ngay) { message.warning('Chọn ngày trả hàng'); return }
    setNgaySaving(prev => ({ ...prev, [`${hlId}_new`]: true }))
    try {
      await api.post(`/hang-loi/${hlId}/ngay`, {
        ngay: form0.ngay, slTraVe: form0.slTraVe || 0,
        slDatSauXuLy: form0.slDatSauXuLy || 0, slHuy: form0.slHuy || 0,
        ghiChu: form0.ghiChu || '',
      })
      message.success('Đã thêm dòng trả hàng')
      setNgayNew(prev => ({ ...prev, [hlId]: {} }))
      await fetchNgay(hlId)
      await fetchHangLoiList(form.getFieldValue('maTp'), form.getFieldValue('lsx'))
      if (id) api.get(`/production/${id}`).then(({ data: d }) => setHlData({
        hlSoLuongTraVe: d.hlSoLuongTraVe, hlLiDoTraVe: d.hlLiDoTraVe,
        hlHuongXuLy: d.hlHuongXuLy, hlTrangThaiXuLy: d.hlTrangThaiXuLy,
        hlLyDoChuaThucHien: d.hlLyDoChuaThucHien,
        hlSlDatSauXuLy: d.hlSlDatSauXuLy, hlSlHuy: d.hlSlHuy,
      })).catch(() => {})
    } catch { message.error('Thêm thất bại') }
    finally { setNgaySaving(prev => ({ ...prev, [`${hlId}_new`]: false })) }
  }

  const deleteNgay = async (item, ngayId) => {
    const hlId = item.id
    setNgaySaving(prev => ({ ...prev, [`${hlId}_${ngayId}`]: true }))
    try {
      await api.delete(`/hang-loi/${hlId}/ngay/${ngayId}`)
      message.success('Đã xóa dòng')
      await fetchNgay(hlId)
      await fetchHangLoiList(form.getFieldValue('maTp'), form.getFieldValue('lsx'))
      if (id) api.get(`/production/${id}`).then(({ data: d }) => setHlData({
        hlSoLuongTraVe: d.hlSoLuongTraVe, hlLiDoTraVe: d.hlLiDoTraVe,
        hlHuongXuLy: d.hlHuongXuLy, hlTrangThaiXuLy: d.hlTrangThaiXuLy,
        hlLyDoChuaThucHien: d.hlLyDoChuaThucHien,
        hlSlDatSauXuLy: d.hlSlDatSauXuLy, hlSlHuy: d.hlSlHuy,
      })).catch(() => {})
    } catch { message.error('Xóa thất bại') }
    finally { setNgaySaving(prev => ({ ...prev, [`${hlId}_${ngayId}`]: false })) }
  }

  const fetchHistory = async () => {
    if (!id) return
    setHistoryLoading(true)
    try {
      const { data } = await api.get(`/production/${id}/history`)
      setHistoryList(data || [])
    } catch { /* silent */ }
    finally { setHistoryLoading(false) }
  }

  const stageStatusMap = {
    pc:   watchPcStatus,
    pl:   watchPlStatus,
    dg:   watchDgStatus,
    bbc1: watchBbc1Status,
  }

  const stageColors = (key) => {
    const isDone = stageStatusMap[key] === 'done'
    if (isDone) return {
      color:  '#16a34a',
      bg:     '#EAECF2',
      border: '#90B8D0',
      hdBg:   '#16a34a',
      labelColor: '#15803d',
    }
    return {
      color:  '#64748b',
      bg:     '#f8fafc',
      border: '#cbd5e1',
      hdBg:   '#94a3b8',
      labelColor: '#64748b',
    }
  }

  const stageSLValues = { pc: parseFloat(watchSlPc) || 0, pl: watchPcPl || 0, dg: watchDg2 || 0, bbc1: watchBbc1_2 || 0 }
  const sigmaCong    = (watchGnnl + watchBbc1 + watchPc + watchPl + watchDg).toFixed(4)
  const chenhLechBtp = (parseInt(watchDg2) || 0) - (parseInt(watchPcPl) || 0)
  const doDangDgCalc = (parseInt(watchSoLuong) || 0) - (parseInt(watchDg2) || 0)
  const spCong       = (() => {
    const sc = parseFloat(sigmaCong), sl = parseFloat(watchDg2)
    return (!sc || !sl) ? 0 : (sl / sc).toFixed(4)
  })()

  useEffect(() => {
    if (isEdit) {
      api.get(`/production/${id}`)
        .then(({ data }) => {
          form.setFieldsValue({
            ...data,
            soLuong:     data.soLuong     ?? 0,
            spTrungGian: data.spTrungGian ?? 0,
            tpNhapKho:   data.tpNhapKho   ?? 0,
            temDb:       data.temDb       ?? 0,
            bbc1_3:      data.bbc1_3      ?? 0,
            pcChiPhi:    data.pcChiPhi    ?? 0,
            plChiPhi:    data.plChiPhi    ?? 0,
            dgChiPhi:    data.dgChiPhi    ?? 0,
            slPc:   data.slPc   != null && data.slPc   !== '' ? String(data.slPc)   : '0',
            dg2:    data.dg2    != null && data.dg2    !== '' ? String(data.dg2)    : '0',
            pcPl:   data.pcPl   != null && data.pcPl   !== '' ? String(data.pcPl)   : '0',
            bbc1_2: data.bbc1_2 != null && data.bbc1_2 !== '' ? String(data.bbc1_2) : '0',
          })
          setPhatLenh(!!data.phatLenh)
          setProductInfo({ maBravo: data.maBravo, maTp: data.maTp, tienTrinh: data.tienTrinh, lsx: data.lsx, soLuong: data.soLuong })
          // Lưu snapshot hl* đã sync từ HangLoi vào production record
          setHlData({
            hlSoLuongTraVe:    data.hlSoLuongTraVe,
            hlLiDoTraVe:       data.hlLiDoTraVe,
            hlHuongXuLy:       data.hlHuongXuLy,
            hlTrangThaiXuLy:   data.hlTrangThaiXuLy,
            hlLyDoChuaThucHien: data.hlLyDoChuaThucHien,
            hlSlDatSauXuLy:    data.hlSlDatSauXuLy,
            hlSlHuy:           data.hlSlHuy,
          })
          fetchHangLoiList(data.maTp, data.lsx)
        })
        .catch(() => message.error('Không thể tải dữ liệu'))
    }
    api.get('/work-schedule/suggestions').then(({ data }) => setSuggestions(data)).catch(() => {})
  }, [id])

  const applyMasterData = (data, { setBravo = false } = {}) => {
    const fields = { tienTrinh: data.tienTrinh }
    if (setBravo) fields.maBravo = data.maBravo
    else         fields.maTp    = data.maTp
    if (data.slTrungBinh != null) fields.slTrungBinh = data.slTrungBinh
    form.setFieldsValue(fields)
  }

  const handleMaBravoChange = (val) => {
    if (justSelectedBravo.current) return
    const trimmed = (typeof val === 'string' ? val : val?.target?.value)?.trim()
    if (lookupTimer.current) clearTimeout(lookupTimer.current)
    if (!trimmed) { setLookupStatus(null); return }
    setLookupStatus('loading')
    lookupTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/product-master/lookup-by-bravo/${encodeURIComponent(trimmed)}`)
        applyMasterData(data)
        setLookupStatus('found')
      } catch { setLookupStatus('not_found') }
    }, 500)
  }

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
    justSelectedBravo.current = true
    const p = option.raw
    const fields = { maBravo: p.maBravo, maTp: p.maTp, tienTrinh: p.tienTrinh || '' }
    if (p.slTrungBinh != null) fields.slTrungBinh = p.slTrungBinh
    form.setFieldsValue(fields)
    setLookupStatus('found')
    setBravoOptions([])
    setTimeout(() => { justSelectedBravo.current = false }, 150)
  }

  const handleMaTpChange = (e) => {
    const val = e.target.value?.trim()
    if (lookupTimer.current) clearTimeout(lookupTimer.current)
    if (!val) { setLookupStatus(null); return }
    setLookupStatus('loading')
    lookupTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/product-master/lookup/${encodeURIComponent(val)}`)
        applyMasterData(data, { setBravo: true })
        setLookupStatus('found')
      } catch { setLookupStatus('not_found') }
    }, 500)
  }

  const handleScheduleSelect = async (value) => {
    if (!value) return
    const [maSp, tenTrinh, soLo] = value.split('|||')
    setScheduleLoading(true)
    try {
      const { data } = await api.get('/work-schedule/lookup-by-triplet', { params: { maSp, tenTrinh, soLo } })
      const nv = { maTp: maSp, tienTrinh: tenTrinh || '', lsx: soLo || '' }
      if (data.pc)   { nv.pcTrangThai   = data.pc.tinhTrang;   if (data.pc.congPc   != null) nv.pcChiPhi   = data.pc.congPc   }
      if (data.bbc1) { nv.bbc1TrangThai = data.bbc1.tinhTrang; if (data.bbc1.slBbc1 != null) nv.bbc1_2 = data.bbc1.slBbc1; if (data.bbc1.congBbc1 != null) nv.bbc1_3 = data.bbc1.congBbc1 }
      if (data.pl)   { nv.plTrangThai   = data.pl.tinhTrang;   if (data.pl.slPl     != null) nv.pcPl   = data.pl.slPl;    if (data.pl.congPl   != null) nv.plChiPhi   = data.pl.congPl   }
      if (data.dg)   { nv.dgTrangThai   = data.dg.tinhTrang;   if (data.dg.slDg     != null) nv.dg2    = data.dg.slDg;    if (data.dg.congDg   != null) nv.dgChiPhi   = data.dg.congDg   }
      form.setFieldsValue(nv)
      setLookupStatus('found')
      try {
        const { data: master } = await api.get(`/product-master/lookup/${encodeURIComponent(maSp)}`)
        const extra = { maBravo: master.maBravo }
        if (master.slTrungBinh != null) extra.slTrungBinh = master.slTrungBinh
        form.setFieldsValue(extra)
      } catch {}
      message.success('Đã tự động điền từ Lịch làm việc')
    } catch { message.error('Không thể lấy dữ liệu Lịch làm việc') }
    finally { setScheduleLoading(false) }
  }

  const syncWorkSchedule = async (values) => {
    const { maBravo, maTp, tienTrinh, lsx, soLuong, maDonHang } = values
    if (!maBravo && !maTp) return
    try {
      const params = {}
      if (maBravo)         params.maBravo   = maBravo
      if (maTp)            params.maSp      = maTp
      if (tienTrinh)       params.tenTrinh  = tienTrinh
      if (lsx)             params.soLo      = lsx
      if (soLuong != null) params.coLo      = soLuong
      if (maDonHang)       params.maDonHang = maDonHang
      const { data: created } = await api.post('/work-schedule/auto-sync', null, { params })
      if (created > 0) message.info(`Đã tự động tạo ${created} bản ghi Lịch làm việc`)
    } catch {}
  }

  const syncHangLoi = async (values) => {
    const { maTp, maBravo, tienTrinh, lsx, soLuong } = values
    if (!maTp) return
    try {
      const { data: exists } = await api.get('/hang-loi/exists', { params: { mtpCoMem: maTp, tenHangHoa: tienTrinh || '', soLo: lsx || '' } })
      if (!exists) {
        await api.post('/hang-loi', { mtpCoMem: maTp || null, mtpSongAn: maBravo || null, tenHangHoa: tienTrinh || null, soLo: lsx || null, soLuong: soLuong ?? null })
        message.info('Đã tự động tạo bản ghi Hàng Lỗi mới')
      }
    } catch {}
  }

  // Tạo thủ công bản ghi hàng lỗi khi tab rỗng
  const handleCreateHangLoi = async () => {
    const values = form.getFieldsValue()
    const { maTp, maBravo, tienTrinh, lsx, soLuong } = values
    if (!maTp) { message.warning('Chưa có Mã TP'); return }
    setHangLoiLoading(true)
    try {
      await api.post('/hang-loi', {
        mtpCoMem: maTp || null, mtpSongAn: maBravo || null,
        tenHangHoa: tienTrinh || null, soLo: lsx || null, soLuong: soLuong ?? null,
      })
      message.success('Đã tạo bản ghi hàng lỗi')
      await fetchHangLoiList(maTp, lsx)
    } catch { message.error('Tạo bản ghi hàng lỗi thất bại') }
    finally { setHangLoiLoading(false) }
  }

  const onFinish = async (values) => {
    setSaving(true)
    try {
      const payload = { ...values, phatLenh: phatLenh || false }
      if (isEdit) {
        await api.put(`/production/${id}`, payload)
        message.success('Cập nhật thành công')
      } else {
        // Kiểm tra duplicate trước khi tạo mới
        if (values.maBravo && values.lsx) {
          const { data: dup } = await api.get('/production/check-duplicate', {
            params: { maBravo: values.maBravo, lsx: values.lsx, maDonHang: values.maDonHang || null },
          })
          if (dup.exists) {
            message.warning(
              `Đã tồn tại bản ghi Sản lượng với Mã Bravo "${values.maBravo}" + LSX "${values.lsx}"` +
              (values.maDonHang ? ` + Mã ĐH "${values.maDonHang}"` : '') + '. Không tạo thêm.'
            )
            setSaving(false)
            return
          }
        }
        await api.post('/production', payload)
        message.success('Thêm mới thành công')
      }
      await syncHangLoi(values)
      navigate('/')
    } catch (err) { message.error(err.response?.data?.message || 'Lưu thất bại') }
    finally { setSaving(false) }
  }

  const ro = isEdit && !isEditing // read-only: chỉ xem, chưa bấm "Sửa lệnh"

  const lookupBadge = () => {
    if (lookupStatus === 'loading')   return <SyncOutlined spin style={{ color: '#1677ff' }} />
    if (lookupStatus === 'found')     return <Tooltip title="Tìm thấy trong danh mục"><CheckCircleOutlined style={{ color: '#52c41a' }} /></Tooltip>
    if (lookupStatus === 'not_found') return <Tooltip title="Không tìm thấy — nhập thủ công"><WarningOutlined style={{ color: '#fa8c16' }} /></Tooltip>
    return null
  }

  const suggestionOptions = suggestions.map(s => ({
    value: `${s.maSp}|||${s.tenTrinh || ''}|||${s.soLo || ''}`,
    label: `${s.maSp}${s.tenTrinh ? ' — ' + s.tenTrinh : ''}${s.soLo ? ' [' + s.soLo + ']' : ''}`
  }))

  const lbl = (text) => (
    <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3 }}>{text}</span>
  )



  return (
    <>
      <style>{`
        /* ── RecordFormPage ERP ── */
        .rfp-form .ant-form-item { margin-bottom: 0; }
        .rfp-form .ant-form-item-label { padding-bottom: 3px !important; }
        .rfp-form .ant-form-item-label > label {
          font-size: 11px !important; font-weight: 700; color: #4b5563;
          text-transform: uppercase; letter-spacing: 0.4px; height: auto !important;
        }
        .rfp-form .ant-input-number { width: 100%; }

        /* Stage cards */
        .sc { border-radius: 6px; overflow: hidden; border: 1.5px solid #e2e8f0; background: #fff; height: 100%; }
        .sc-hd { padding: 7px 12px; display: flex; align-items: center; justify-content: space-between; }
        .sc-bd { padding: 10px 10px 4px; }
        .sc-bd .ant-form-item { margin-bottom: 8px; }
        .sc-bd .ant-form-item-label > label { font-size: 10px !important; color: #6b7280 !important; }

        /* Section header */
        .sec-h { font-size: 13px; font-weight: 800; color: #1e3a5f; text-transform: uppercase;
          letter-spacing: 0.8px; padding: 8px 14px; background: #f8fafc;
          border-bottom: 1px solid #e8edf2; display: flex; align-items: center; gap: 6px; }

        /* Info card */
        .info-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px;
          box-shadow: 0 1px 4px rgba(0,0,0,.05); overflow: hidden; }

        /* Tabs */
        .rfp-tabs > .ant-tabs-nav { background: #fff !important; margin: 0 !important; padding: 0 14px; border-bottom: 2px solid #e2e8f0 !important; }
        .rfp-tabs > .ant-tabs-nav::before { border: none !important; }
        .rfp-tabs > .ant-tabs-nav .ant-tabs-tab { padding: 10px 14px !important; font-size: 12px; }
        .rfp-tabs > .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-btn { color: #1D4ED8 !important; font-weight: 700 !important; }
        .rfp-tabs > .ant-tabs-nav .ant-tabs-ink-bar { background: #1D4ED8 !important; height: 3px !important; }

        /* Calc value */
        .cv { height: 30px; line-height: 30px; padding: 0 10px; border-radius: 4px;
          font-weight: 700; font-size: 13px; font-family: monospace; text-align: right; }

        /* ── Ô trống: nền #99CCCC ── */
        .rfp-form input.ant-input:placeholder-shown { background-color: #99CCCC !important; }
        .rfp-form textarea.ant-input:placeholder-shown { background-color: #99CCCC !important; }
        .rfp-form .ant-input-affix-wrapper:has(input.ant-input:placeholder-shown) { background-color: #99CCCC !important; }
        .rfp-form .ant-input-number:has(input:placeholder-shown) { background-color: #99CCCC !important; }
        .rfp-form .ant-picker:has(input:placeholder-shown) { background-color: #99CCCC !important; }
        .rfp-form .ant-select-selector:has(.ant-select-selection-placeholder) { background-color: #99CCCC !important; }

        /* ── Cỡ chữ đồng nhất 12px cho toàn bộ ô nhập ── */
        .rfp-form .ant-input,
        .rfp-form .ant-input-number-input,
        .rfp-form .ant-select-selection-item,
        .rfp-form .ant-select-selection-placeholder { font-size: 12px !important; }

        /* ── Số trong ô disabled: màu #007700 rõ nét ── */
        .rfp-form .ant-input[disabled],
        .rfp-form .ant-input-number-disabled .ant-input-number-input,
        .rfp-form .ant-input-number-disabled input { color: #007700 !important; -webkit-text-fill-color: #007700 !important; font-weight: 700 !important; }
        .rfp-form .ant-select-disabled .ant-select-selection-item { color: #007700 !important; -webkit-text-fill-color: #007700 !important; font-weight: 700 !important; }
      `}</style>

      {/* ── Sticky top bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '0 16px', height: 48,
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,.08)',
      }}>
        <Button size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}
          style={{ fontWeight: 600, fontSize: 11, background: '#1D4ED8', borderColor: '#1D4ED8', color: '#fff' }}>
          Quay lại
        </Button>
        <div style={{ width: 1, height: 24, background: '#e2e8f0', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          {watchMaBravo && <span style={{ color: '#1D4ED8', fontFamily: 'monospace', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{watchMaBravo}</span>}
          {watchMaTp    && <span style={{ color: '#374151', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{watchMaTp}</span>}
          {watchTienTrinh && <>
            <span style={{ color: '#cbd5e1', flexShrink: 0 }}>·</span>
            <span style={{ color: '#475569', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{watchTienTrinh.length > 60 ? watchTienTrinh.slice(0,60)+'…' : watchTienTrinh}</span>
          </>}
          {watchLsx && <>
            <span style={{ color: '#cbd5e1', flexShrink: 0 }}>·</span>
            <span style={{ color: '#c2410c', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>LSX {watchLsx}</span>
          </>}
          {!watchMaBravo && !watchMaTp && <span style={{ color: '#94a3b8', fontSize: 12 }}>{isEdit ? 'Chỉnh sửa bản ghi' : 'Thêm mới'}</span>}
        </div>
        <Space size={6}>
          {ro && canEditProd && (
            <Button size="small" icon={<EditOutlined />}
              onClick={() => setIsEditing(true)}
              style={{ fontWeight: 700, fontSize: 11, background: '#d97706', borderColor: '#d97706', color: '#fff' }}>
              Sửa lệnh
            </Button>
          )}
          {!ro && isEdit && (
            <Button size="small"
              onClick={() => setIsEditing(false)}
              style={{ fontSize: 11, borderColor: '#d1d5db', color: '#374151' }}>
              Hủy
            </Button>
          )}
          {canEditProd && !ro && (
            <Button type="primary" size="small"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={() => form.submit()}
              style={{ fontWeight: 700, fontSize: 11, background: '#1D4ED8', borderColor: '#1D4ED8' }}>
              {isEdit ? 'Lưu thay đổi' : 'Lưu mới'}
            </Button>
          )}
        </Space>
      </div>

      <div style={{ background: '#f0f2f5', padding: '12px 14px 28px' }}>
        <Form form={form} layout="vertical" onFinish={onFinish} className="rfp-form"
          initialValues={{ soLuong: 0, spTrungGian: 0, tpNhapKho: 0, temDb: 0, bbc1_3: 0, pcChiPhi: 0, plChiPhi: 0, dgChiPhi: 0, slPc: '0', dg2: '0', pcPl: '0', bbc1_2: '0' }}>

          {/* ── Product identity card ── */}
          <div className="info-card" style={{ marginBottom: 10 }}>
            {/* Quick-fill row — hidden but functional */}
            <div style={{ display: 'none' }}>
              <Select showSearch allowClear loading={scheduleLoading}
                onChange={handleScheduleSelect}
                optionFilterProp="label" options={suggestionOptions} />
            </div>
            <Form.Item name="maDonHang" hidden><Input /></Form.Item>
            {/* Identity fields — single row */}
            <div style={{ display: 'flex', alignItems: 'stretch', fontSize: 12 }}>
              {/* Mã Bravo */}
              <div style={{ padding: '8px 12px', borderRight: '1px solid #f0f2f5', minWidth: 150 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
                  * Mã Bravo {lookupBadge()}
                </div>
                <Form.Item name="maBravo" rules={[{ required: true, message: 'Nhập Mã Bravo' }]} style={{ marginBottom: 0 }}>
                  <AutoComplete
                    options={bravoOptions}
                    onSearch={handleBravoSearch}
                    onSelect={handleBravoSelect}
                    onChange={handleMaBravoChange}
                    disabled={ro}
                    placeholder="VD: 10601364"
                    allowClear
                    popupMatchSelectWidth={360}
                    style={{ fontWeight: 800, color: '#1677ff', fontFamily: 'monospace' }}
                  />
                </Form.Item>
              </div>
              {/* Mã TP */}
              <div style={{ padding: '8px 12px', borderRight: '1px solid #f0f2f5', minWidth: 110 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Mã TP</div>
                <Form.Item name="maTp" style={{ marginBottom: 0 }}>
                  <Input onChange={handleMaTpChange} placeholder="Tự động điền" disabled={ro}
                    style={{ fontWeight: 700, color: '#1D4ED8', fontSize: 12 }} />
                </Form.Item>
              </div>
              {/* Tiến trình */}
              <div style={{ flex: 1, padding: '8px 12px', borderRight: '1px solid #f0f2f5' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Tiến trình</div>
                <Form.Item name="tienTrinh" style={{ marginBottom: 0 }}>
                  <Input.TextArea placeholder="Tự động điền hoặc nhập tay" autoSize={{ minRows: 1, maxRows: 2 }} disabled={ro}
                    style={{ fontSize: 12, resize: 'none' }} />
                </Form.Item>
              </div>
              {/* Lô SX */}
              <div style={{ padding: '8px 12px', borderRight: '1px solid #f0f2f5', minWidth: 130 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#d46b08', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Số Lô (LSX)</div>
                <Form.Item name="lsx" style={{ marginBottom: 0 }}>
                  <Input disabled
                    style={{ fontFamily: 'monospace', fontWeight: 700, color: '#d46b08', background: '#fffbf0', border: '1.5px solid #ffd591', borderRadius: 4, cursor: 'not-allowed' }} />
                </Form.Item>
              </div>
              {/* Cỡ lô */}
              <div style={{ padding: '8px 12px', minWidth: 110 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Cỡ lô</div>
                <Form.Item name="soLuong" style={{ marginBottom: 0 }}>
                  <InputNumber style={{ width: '100%', fontWeight: 700 }} min={0} disabled={ro}
                    formatter={v => v ? Number(v).toLocaleString('vi-VN') : '0'}
                    parser={v => v ? v.replace(/[^\d]/g, '') : 0} />
                </Form.Item>
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="info-card">
            <Tabs
              className="rfp-tabs"
              activeKey={activeTab}
              onChange={(key) => { setActiveTab(key); if (key === 'history') fetchHistory() }}
              tabBarExtraContent={
                !ro && (
                  <Space size={6} style={{ paddingRight: 8 }}>
                    <Button type="primary" size="small" icon={<SaveOutlined />} loading={saving}
                      onClick={() => form.submit()}
                      style={{ fontWeight: 700, background: '#1D4ED8', borderColor: '#1D4ED8', fontSize: 11 }}>
                      {isEdit ? 'Cập nhật' : 'Lưu mới'}
                    </Button>
                  </Space>
                )
              }
              items={[
                {
                  key: 'sanluong',
                  label: <span style={{ fontWeight: 600 }}>🏭 Sản lượng</span>,
                  children: (
                    <div style={{ padding: '0 0 16px' }}>

                      {/* ── Stage table ── */}
                      <div>
                        <div className="sec-h">🏭 Trạng thái & Sản lượng công đoạn</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                          <thead>
                            <tr style={{ background: '#f0f4f8', borderBottom: '2px solid #e2e8f0' }}>
                              <th style={{ padding: '7px 14px', textAlign: 'left', fontWeight: 800, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, width: '18%' }}>Công đoạn</th>
                              <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 800, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, width: '22%' }}>Tình trạng</th>
                              <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 800, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, width: '35%' }}>Sản lượng / Tiến độ</th>
                              <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 800, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, width: '25%' }}>Công</th>
                            </tr>
                          </thead>
                          <tbody>
                            {STAGES.map(s => {
                              const isDone  = stageStatusMap[s.key] === 'done'
                              const isDoing = stageStatusMap[s.key] === 'doing'
                              const rowBg   = isDone ? '#f0fdf4' : isDoing ? '#fffbeb' : '#fff'
                              const rowBdr  = isDone ? '#bbf7d0' : isDoing ? '#fde68a' : '#f0f2f5'
                              const slVal   = stageSLValues[s.key] || 0
                              const pct     = watchSoLuong > 0 ? Math.min(100, Math.round((slVal / watchSoLuong) * 100)) : 0
                              const barColor = isDone ? '#16a34a' : s.color
                              return (
                                <tr key={s.key} style={{ borderBottom: `1px solid ${rowBdr}`, background: rowBg }}>
                                  <td style={{ padding: '6px 14px', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <span style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        width: 36, height: 22, borderRadius: 4,
                                        background: isDone ? '#16a34a' : s.color,
                                        color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: 0.5,
                                      }}>{s.label}</span>
                                      <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{s.sub}</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '4px 10px' }}>
                                    <Form.Item name={s.statusField} style={{ marginBottom: 0 }}>
                                      <Select size="small" allowClear placeholder="Chọn" style={{ width: '100%' }} disabled={ro}>
                                        <Option value="done"><span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Done</span></Option>
                                        <Option value="doing"><span style={{ color: '#d46b08', fontWeight: 600 }}>⟳ Doing</span></Option>
                                      </Select>
                                    </Form.Item>
                                  </td>
                                  <td style={{ padding: '4px 10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <Form.Item name={s.slField} style={{ marginBottom: 0, width: 90 }}>
                                        <Input size="small" placeholder="0" disabled={ro} style={{ fontWeight: 700, textAlign: 'right', fontFamily: 'monospace' }} />
                                      </Form.Item>
                                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                                          <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width .3s' }} />
                                        </div>
                                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, minWidth: 34, textAlign: 'right' }}>{pct}%</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td style={{ padding: '4px 10px' }}>
                                    <Form.Item name={s.congField} style={{ marginBottom: 0 }}>
                                      <InputNumber size="small" style={{ width: '100%' }} step={0.0001} precision={4} placeholder="0.0000" disabled={ro} />
                                    </Form.Item>
                                  </td>
                                </tr>
                              )
                            })}
                            <tr style={{ borderBottom: '1px solid #f5e6ff', background: '#fdf4ff' }}>
                              <td style={{ padding: '6px 14px', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    width: 48, height: 22, borderRadius: 4,
                                    background: '#c41d7f', color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: 0.5,
                                  }}>GNNL</span>
                                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>Giao nhận nguyên liệu</span>
                                </div>
                              </td>
                              <td colSpan={2} style={{ padding: '4px 10px', color: '#bbb', fontSize: 13 }}>—</td>
                              <td style={{ padding: '4px 10px' }}>
                                <Form.Item name="temDb" style={{ marginBottom: 0 }}>
                                  <InputNumber size="small" style={{ width: '100%' }} step={0.0001} precision={4} placeholder="0.0000" disabled={ro} />
                                </Form.Item>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* ── Số liệu sản xuất ── */}
                      <div style={{ borderTop: '6px solid #f0f2f5' }}>
                        <div className="sec-h">📊 Số liệu sản xuất</div>

                        {/* Bảng 1: SP trung gian / TP nhập kho / QA lấy mẫu / SL trung bình */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #f0f2f5' }}>
                              <td style={{ padding: '7px 14px', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3, whiteSpace: 'nowrap', width: '22%' }}>SP Trung gian</td>
                              <td style={{ padding: '4px 10px', width: '28%' }}>
                                <Form.Item name="spTrungGian" style={{ marginBottom: 0 }}>
                                  <InputNumber size="small" style={{ width: '100%', fontWeight: 600 }} min={0} disabled={ro}
                                    formatter={v => v ? Number(v).toLocaleString('vi-VN') : '0'}
                                    parser={v => v ? v.replace(/[^\d]/g, '') : 0} />
                                </Form.Item>
                              </td>
                              <td style={{ padding: '7px 14px', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3, whiteSpace: 'nowrap', width: '22%' }}>TP Nhập kho</td>
                              <td style={{ padding: '4px 10px', width: '28%' }}>
                                <Form.Item name="tpNhapKho" style={{ marginBottom: 0 }}>
                                  <InputNumber size="small" style={{ width: '100%', fontWeight: 600 }} min={0} disabled={ro}
                                    formatter={v => v ? Number(v).toLocaleString('vi-VN') : '0'}
                                    parser={v => v ? v.replace(/[^\d]/g, '') : 0} />
                                </Form.Item>
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '7px 14px', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>SL Trung bình</td>
                              <td style={{ padding: '4px 10px' }}>
                                <Form.Item name="slTrungBinh" style={{ marginBottom: 0 }}>
                                  <InputNumber size="small" style={{ width: '100%', fontWeight: 600 }} min={0} disabled={ro} precision={2} />
                                </Form.Item>
                              </td>
                              <td colSpan={2} />
                            </tr>
                          </tbody>
                        </table>

                        {/* Bảng QA Lấy mẫu chi tiết */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, borderTop: '2px solid #e0e7ff' }}>
                          <thead>
                            <tr style={{ background: '#eef2ff' }}>
                              <th style={{ padding: '6px 10px', color: '#4c1d95', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'left', width: '14%' }}>QA Lấy mẫu</th>
                              <th style={{ padding: '6px 10px', color: '#4c1d95', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center', width: '22%' }}>Lưu mẫu</th>
                              <th style={{ padding: '6px 10px', color: '#4c1d95', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center', width: '22%' }}>Kiểm nghiệm</th>
                              <th style={{ padding: '6px 10px', color: '#4c1d95', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center', width: '22%' }}>Khác</th>
                              <th style={{ padding: '6px 10px', color: '#4c1d95', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center', width: '20%' }}>Tổng</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { label: 'PL', luuMau: 'plQaLuuMau', kiemNghiem: 'plQaKiemNghiem', khac: 'plQaKhac', tong: 'plQaLayMau',
                                wLuuMau: watchPlQaLuuMau, wKiemNghiem: watchPlQaKiemNghiem, wKhac: watchPlQaKhac, wTong: watchPlQaLayMau },
                              { label: 'ĐG', luuMau: 'dgQaLuuMau', kiemNghiem: 'dgQaKiemNghiem', khac: 'dgQaKhac', tong: 'dgQaLayMau',
                                wLuuMau: watchDgQaLuuMau, wKiemNghiem: watchDgQaKiemNghiem, wKhac: watchDgQaKhac, wTong: watchDgQaLayMau },
                            ].map(row => (
                              <tr key={row.label} style={{ borderBottom: '1px solid #f0f2f5' }}>
                                <td style={{ padding: '6px 10px', background: '#f8fafc', fontWeight: 700, fontSize: 13, color: '#374151' }}>{row.label}</td>
                                {[
                                  { name: row.luuMau },
                                  { name: row.kiemNghiem },
                                  { name: row.khac },
                                  { name: row.tong },
                                ].map(({ name }) => (
                                  <td key={name} style={{ padding: '4px 6px', textAlign: 'center' }}>
                                    <Form.Item name={name} style={{ marginBottom: 0 }}>
                                      <InputNumber size="small" style={{ width: '100%', fontWeight: 600 }} min={0} disabled={ro}
                                        formatter={v => v ? Number(v).toLocaleString('vi-VN') : '0'}
                                        parser={v => v ? v.replace(/[^\d]/g, '') : 0} />
                                    </Form.Item>
                                  </td>
                                ))}
                              </tr>
                            ))}
                            <tr style={{ background: '#f0f4ff', fontWeight: 700, fontSize: 13 }}>
                              <td style={{ padding: '6px 10px', color: '#4c1d95' }}>Tổng</td>
                              {[
                                watchPlQaLuuMau + watchDgQaLuuMau,
                                watchPlQaKiemNghiem + watchDgQaKiemNghiem,
                                watchPlQaKhac + watchDgQaKhac,
                                watchPlQaLayMau + watchDgQaLayMau,
                              ].map((v, i) => (
                                <td key={i} style={{ padding: '6px 10px', textAlign: 'center', color: '#4c1d95' }}>
                                  {v > 0 ? v.toLocaleString('vi-VN') : '—'}
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>

                        {/* Bảng 2: Chênh lệch BTP / Dở dang ĐG */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, borderTop: '3px solid #f0f2f5' }}>
                          <tbody>
                            <tr>
                              <td style={{ padding: '7px 14px', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3, width: '22%' }}>
                                Chênh lệch BTP <span style={{ fontWeight: 400, color: '#aaa', textTransform: 'none', fontSize: 11 }}>(tự tính)</span>
                              </td>
                              <td style={{ padding: '5px 10px', width: '28%' }}>
                                <div className="cv" style={{
                                  color: chenhLechBtp > 0 ? '#cf1322' : chenhLechBtp < 0 ? '#389e0d' : '#595959',
                                  background: chenhLechBtp > 0 ? '#fff1f0' : chenhLechBtp < 0 ? '#f6ffed' : '#f8f8f8',
                                  border: `1px solid ${chenhLechBtp > 0 ? '#ffa39e' : chenhLechBtp < 0 ? '#b7eb8f' : '#e2e8f0'}`,
                                }}>
                                  {Number(chenhLechBtp).toLocaleString('vi-VN')}
                                </div>
                              </td>
                              <td style={{ padding: '7px 14px', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3, width: '22%' }}>
                                Dở dang ĐG <span style={{ fontWeight: 400, color: '#aaa', textTransform: 'none', fontSize: 11 }}>(tự tính)</span>
                              </td>
                              <td style={{ padding: '5px 10px', width: '28%' }}>
                                <div className="cv" style={{ color: '#d46b08', background: '#fff7e6', border: '1px solid #ffd591' }}>
                                  {Number(doDangDgCalc).toLocaleString('vi-VN')}
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Bảng 3: Hiệu suất */}
                        {(() => {
                          const hsPl   = watchSoLuong > 0
                            ? ((watchPcPl + watchPlQaLayMau) / watchSoLuong * 100)
                            : null
                          const hsDg   = watchPcPl > 0
                            ? ((watchDg2 + watchDgQaLayMau) / watchPcPl * 100)
                            : null
                          const hsTong = watchSoLuong > 0
                            ? ((watchTpNhapKho + watchPlQaLayMau + watchDgQaLayMau) / watchSoLuong * 100)
                            : null
                          const hsColor = (v) => v == null ? '#bbb' : v >= 99 ? '#16a34a' : v >= 95 ? '#d46b08' : '#cf1322'
                          const hsBg    = (v) => v == null ? '#f8f8f8' : v >= 99 ? '#f6ffed' : v >= 95 ? '#fff7e6' : '#fff1f0'
                          const hsBdr   = (v) => v == null ? '#e2e8f0' : v >= 99 ? '#b7eb8f' : v >= 95 ? '#ffd591' : '#ffa39e'
                          return (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, borderTop: '3px solid #f0f2f5' }}>
                              <tbody>
                                <tr>
                                  <td style={{ padding: '7px 14px', background: '#f0fdf4', color: '#15803d', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3, width: '22%' }}>
                                    Hiệu suất PL <span style={{ fontWeight: 400, color: '#aaa', textTransform: 'none', fontSize: 11 }}>(tự tính)</span>
                                  </td>
                                  <td style={{ padding: '5px 10px', width: '28%' }}>
                                    <div className="cv" style={{ color: hsColor(hsPl), background: hsBg(hsPl), border: `1px solid ${hsBdr(hsPl)}` }}>
                                      {hsPl != null ? hsPl.toFixed(1) + '%' : '—'}
                                    </div>
                                  </td>
                                  <td style={{ padding: '7px 14px', background: '#f0fdf4', color: '#15803d', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3, width: '22%' }}>
                                    Hiệu suất ĐG <span style={{ fontWeight: 400, color: '#aaa', textTransform: 'none', fontSize: 11 }}>(tự tính)</span>
                                  </td>
                                  <td style={{ padding: '5px 10px', width: '28%' }}>
                                    <div className="cv" style={{ color: hsColor(hsDg), background: hsBg(hsDg), border: `1px solid ${hsBdr(hsDg)}` }}>
                                      {hsDg != null ? hsDg.toFixed(1) + '%' : '—'}
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td colSpan={4} style={{ padding: '5px 10px', borderTop: '1px solid #f0f2f5' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                      <span style={{ fontWeight: 700, fontSize: 12, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.3, minWidth: 130 }}>
                                        Hiệu suất tổng <span style={{ fontWeight: 400, color: '#aaa', textTransform: 'none', fontSize: 11 }}>(tự tính)</span>
                                      </span>
                                      <div className="cv" style={{ flex: 1, color: hsColor(hsTong), background: hsBg(hsTong), border: `1px solid ${hsBdr(hsTong)}` }}>
                                        {hsTong != null ? hsTong.toFixed(1) + '%' : '—'}
                                      </div>
                                      {hsTong != null && (
                                        <span style={{ fontSize: 11, color: '#888' }}>
                                          (NK {watchTpNhapKho.toLocaleString('vi-VN')} + QA {(watchPlQaLayMau + watchDgQaLayMau).toLocaleString('vi-VN')}) / {watchSoLuong.toLocaleString('vi-VN')}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          )
                        })()}
                      </div>

                      {/* ── Ghi chú ── */}
                      <div style={{ borderTop: '6px solid #f0f2f5' }}>
                        <div className="sec-h">📝 Ghi chú</div>
                        <div style={{ padding: '10px 14px 4px' }}>
                          <Form.Item name="moTa" style={{ marginBottom: 0 }}>
                            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="Nhập ghi chú..." disabled={ro} />
                          </Form.Item>
                        </div>
                      </div>
                    </div>
                  ),
                },
              {
                key: 'hangloi',
                label: (
                  <Badge count={hangLoiList.length} size="small" offset={[6, -2]}
                    color={hangLoiList.some(h => (hangLoiEdits[h.id]?.trangThaiXuLy ?? h.trangThaiXuLy) !== 'Đã hoàn thành') ? '#f97316' : '#52c41a'}>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>⚠ Xử lý hàng lỗi</span>
                  </Badge>
                ),
                disabled: !isEdit && !isAdmin(),
                children: (
                  <div style={{ padding: '14px 16px 16px' }}>
                    {/* Banner hl* đã sync */}
                    {hlData && (hlData.hlTrangThaiXuLy || hlData.hlSoLuongTraVe != null) && (() => {
                      const isDone = hlData.hlTrangThaiXuLy === 'Đã hoàn thành'
                      const acc = isDone ? '#16a34a' : '#d46b08'
                      const bg  = isDone ? '#f0fdf4' : '#fffbeb'
                      const bdr = isDone ? '#bbf7d0' : '#fde68a'
                      const fmtN = v => v != null ? Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) : '—'
                      return (
                        <div style={{ border: `1.5px solid ${bdr}`, borderRadius: 7, background: bg, padding: '7px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: acc, textTransform: 'uppercase', letterSpacing: 0.8, flexShrink: 0 }}>📋 Đã lưu vào bản ghi Sản lượng</span>
                          <span style={{ background: acc, color: '#fff', borderRadius: 10, padding: '1px 9px', fontSize: 10, fontWeight: 700 }}>
                            {isDone ? '✓ Đã hoàn thành' : '⟳ Đang xử lý'}
                          </span>
                          {hlData.hlHuongXuLy && <span style={{ fontSize: 11, color: '#374151' }}>→ {hlData.hlHuongXuLy}</span>}
                          <span style={{ fontSize: 11, color: '#64748b' }}>SL trả về: <strong style={{ color: '#dc2626' }}>{fmtN(hlData.hlSoLuongTraVe)}</strong></span>
                          <span style={{ fontSize: 11, color: '#64748b' }}>Đạt: <strong style={{ color: '#16a34a' }}>{fmtN(hlData.hlSlDatSauXuLy)}</strong></span>
                          <span style={{ fontSize: 11, color: '#64748b' }}>Hủy: <strong style={{ color: '#ef4444' }}>{fmtN(hlData.hlSlHuy)}</strong></span>
                          {hlData.hlLiDoTraVe && <span style={{ fontSize: 10, color: '#6b7280', fontStyle: 'italic' }}>"{hlData.hlLiDoTraVe}"</span>}
                          {!isDone && hlData.hlLyDoChuaThucHien && <span style={{ fontSize: 10, color: '#d46b08', fontWeight: 600 }}>⚠ {hlData.hlLyDoChuaThucHien}</span>}
                        </div>
                      )
                    })()}


                    {/* Tiêu đề + nút tải lại */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                        {hangLoiList.length > 0 ? `${hangLoiList.length} bản ghi hàng lỗi` : 'Chưa có dữ liệu'}
                      </span>
                      <Button size="small" icon={<SyncOutlined />} loading={hangLoiLoading}
                        onClick={() => fetchHangLoiList(form.getFieldValue('maTp'), form.getFieldValue('lsx'))}
                        style={{ fontSize: 10, height: 22, padding: '0 8px' }}>Tải lại</Button>
                    </div>

                    {hangLoiLoading && <div style={{ textAlign: 'center', padding: '16px 0', color: '#94a3b8', fontSize: 12 }}>Đang tải...</div>}

                    {!hangLoiLoading && hangLoiList.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '28px 0' }}>
                        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: canEditHL && isEdit ? 14 : 0 }}>
                          Chưa có bản ghi hàng lỗi nào cho bản ghi này
                        </div>
                        {canEditHL && isEdit && (
                          <Button
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={handleCreateHangLoi}
                            loading={hangLoiLoading}
                            style={{ borderColor: '#f59e0b', color: '#d97706', fontWeight: 600 }}
                          >
                            Tạo bản ghi hàng lỗi
                          </Button>
                        )}
                      </div>
                    )}

                    {!hangLoiLoading && hangLoiList.map((item, idx) => {
                      const edit      = hangLoiEdits[item.id] || {}
                      const isSaving  = !!hangLoiSaving[item.id]
                      const curTT     = edit.trangThaiXuLy !== undefined ? edit.trangThaiXuLy : item.trangThaiXuLy
                      const isDone    = curTT === 'Đã hoàn thành'
                      const isDoing   = curTT === 'Đang xử lý'
                      const rowBg     = isDone ? '#f6ffed' : isDoing ? '#fff7e6' : '#f8fafc'
                      const rowBdr    = isDone ? '#86efac' : isDoing ? '#fcd34d' : '#cbd5e1'
                      const rowAccent = isDone ? '#16a34a' : isDoing ? '#d46b08' : '#607080'
                      const fldLbl = (t, extra) => (
                        <div style={{ fontSize: 11, fontWeight: 700, color: extra?.color || '#475569', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 }}>{t}</div>
                      )

                      return (
                        <div key={item.id} style={{
                          border: `2px solid ${rowBdr}`, borderRadius: 10, background: rowBg,
                          marginBottom: idx < hangLoiList.length - 1 ? 16 : 0,
                          overflow: 'hidden',
                          boxShadow: '0 2px 8px rgba(0,0,0,.06)',
                        }}>
                          {/* Header bar */}
                          <div style={{
                            background: rowAccent, padding: '8px 14px',
                            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                          }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#fff', fontSize: 15 }}>
                              {item.mtpCoMem || item.mtpSongAn}
                            </span>
                            {item.soLo && <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'rgba(255,255,255,.85)', fontSize: 13 }}>Lô: {item.soLo}</span>}
                            {item.namXuLy && <span style={{ fontSize: 12, color: 'rgba(255,255,255,.75)' }}>👤 {item.namXuLy}</span>}
                            {item.phanLoaiLoi && item.phanLoaiLoi.split(',').map(p => p.trim()).filter(Boolean).map(p => (
                              <Tag key={p} style={{ fontSize: 11, background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.4)', color: '#fff', borderRadius: 8 }}>{p}</Tag>
                            ))}
                            <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 13, color: '#fff' }}>
                              {isDone ? '✓ Đã hoàn thành' : isDoing ? '⟳ Đang xử lý' : '— Chưa xác định'}
                            </span>
                          </div>

                          {/* Body */}
                          <fieldset disabled={!canEditHL} style={{ border: 'none', padding: 0, margin: 0 }}>
                          <div style={{ padding: '14px 16px' }}>
                            {!canEditHL && (
                              <div style={{ marginBottom: 8, padding: '4px 10px', background: '#f1f5f9', borderRadius: 4, fontSize: 11, color: '#64748b' }}>
                                Chỉ xem — bạn không có quyền chỉnh sửa hàng lỗi
                              </div>
                            )}
                            {/* Row 1: SL + Lý do + Hướng + Trạng thái */}
                            <Row gutter={[14, 12]} align="bottom">
                              <Col xs={12} sm={6} md={4}>
                                {fldLbl('SL Trả về', { color: '#dc2626' })}
                                <InputNumber style={{ width: '100%', fontWeight: 700 }}
                                  min={0} precision={2} placeholder="0.00"
                                  value={edit.soLuongTraVe !== undefined ? edit.soLuongTraVe : (item.soLuongTraVe != null ? Number(item.soLuongTraVe) : null)}
                                  onChange={v => handleHangLoiFieldChange(item.id, 'soLuongTraVe', v)} />
                              </Col>
                              <Col xs={24} sm={18} md={10}>
                                {fldLbl('Lý do trả về')}
                                <Input placeholder="Nhập lý do trả về..."
                                  value={edit.liDoTraVe !== undefined ? edit.liDoTraVe : (item.liDoTraVe || '')}
                                  onChange={e => handleHangLoiFieldChange(item.id, 'liDoTraVe', e.target.value)} />
                              </Col>
                              <Col xs={12} sm={12} md={5}>
                                {fldLbl('Hướng xử lý')}
                                <Input placeholder="Nhập hướng xử lý..."
                                  value={edit.huongXuLy !== undefined ? edit.huongXuLy : (item.huongXuLy || '')}
                                  onChange={e => handleHangLoiFieldChange(item.id, 'huongXuLy', e.target.value)} />
                              </Col>
                              <Col xs={12} sm={12} md={5}>
                                {fldLbl('Trạng thái XL')}
                                <Select style={{ width: '100%' }} allowClear placeholder="Chọn trạng thái..."
                                  value={edit.trangThaiXuLy !== undefined ? edit.trangThaiXuLy : (item.trangThaiXuLy || null)}
                                  onChange={v => handleHangLoiFieldChange(item.id, 'trangThaiXuLy', v)}>
                                  <Option value="Đang xử lý"><span style={{ color: '#d46b08', fontWeight: 600 }}>⟳ Đang xử lý</span></Option>
                                  <Option value="Đã hoàn thành"><span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Đã hoàn thành</span></Option>
                                </Select>
                              </Col>
                            </Row>

                            {/* Row 2: SL đạt + SL hủy + Lý do chưa TH + Ghi chú + Nút lưu */}
                            <Row gutter={[14, 12]} align="bottom" style={{ marginTop: 12 }}>
                              <Col xs={12} sm={6} md={4}>
                                {fldLbl('SL đạt sau XL', { color: '#16a34a' })}
                                <InputNumber style={{ width: '100%', fontWeight: 600 }}
                                  min={0} precision={2} placeholder="0.00"
                                  value={edit.slDatSauXuLy !== undefined ? edit.slDatSauXuLy : (item.slDatSauXuLy != null ? Number(item.slDatSauXuLy) : null)}
                                  onChange={v => handleHangLoiFieldChange(item.id, 'slDatSauXuLy', v)} />
                              </Col>
                              <Col xs={12} sm={6} md={4}>
                                {fldLbl('SL hủy', { color: '#ef4444' })}
                                <InputNumber style={{ width: '100%', fontWeight: 600 }}
                                  min={0} precision={2} placeholder="0.00"
                                  value={edit.slHuy !== undefined ? edit.slHuy : (item.slHuy != null ? Number(item.slHuy) : null)}
                                  onChange={v => handleHangLoiFieldChange(item.id, 'slHuy', v)} />
                              </Col>
                              <Col xs={24} sm={12} md={8}>
                                {fldLbl(
                                  <span style={{ color: !isDone ? '#f97316' : '#64748b' }}>
                                    {!isDone ? '⚠ Lý do chưa thực hiện' : 'Lý do chưa thực hiện'}
                                  </span>
                                )}
                                <Input
                                  placeholder={isDone ? 'Không có (đã hoàn thành)' : 'Nhập lý do chưa hoàn thành...'}
                                  style={{ borderColor: !isDone && (edit.lyDoChuaThucHien || item.lyDoChuaThucHien) ? '#fbbf24' : undefined }}
                                  value={edit.lyDoChuaThucHien !== undefined ? edit.lyDoChuaThucHien : (item.lyDoChuaThucHien || '')}
                                  onChange={e => handleHangLoiFieldChange(item.id, 'lyDoChuaThucHien', e.target.value)} />
                              </Col>
                              <Col xs={24} sm={16} md={5}>
                                {fldLbl('Ghi chú')}
                                <Input placeholder="Ghi chú bổ sung..."
                                  value={edit.ghiChu !== undefined ? edit.ghiChu : (item.ghiChu || '')}
                                  onChange={e => handleHangLoiFieldChange(item.id, 'ghiChu', e.target.value)} />
                              </Col>
                              {canEditHL && (
                                <Col xs={24} sm={8} md={3} style={{ display: 'flex', alignItems: 'flex-end' }}>
                                  <Button type="primary" block loading={isSaving}
                                    icon={<SaveOutlined />}
                                    onClick={() => saveHangLoiRow(item)}
                                    style={{ fontWeight: 700, background: rowAccent, borderColor: rowAccent, borderRadius: 6, height: 36, fontSize: 13 }}>
                                    Lưu
                                  </Button>
                                </Col>
                              )}
                            </Row>
                          </div>
                          </fieldset>

                          {/* ── Trả lại theo ngày ── */}
                          {(() => {
                            const hlId   = item.id
                            const rows   = ngayMap[hlId] || []
                            const isLoad = !!ngayLoading[hlId]
                            const nf = ngayNew[hlId] || {}
                            const hasRows = rows.length > 0
                            return (
                              <div style={{ borderTop: `1.5px dashed ${rowBdr}`, background: '#f8fafc' }}>
                                {/* Sub-header */}
                                <div style={{
                                  padding: '7px 16px', display: 'flex', alignItems: 'center',
                                  justifyContent: 'space-between', gap: 8,
                                  borderBottom: '1px solid #e8edf2',
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <CalendarOutlined style={{ color: rowAccent, fontSize: 13 }} />
                                    <span style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                      Trả lại theo ngày
                                    </span>
                                    {hasRows && (
                                      <span style={{ background: rowAccent, color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>
                                        {rows.length} dòng
                                      </span>
                                    )}
                                  </div>
                                  <Button size="small" icon={<SyncOutlined spin={isLoad} />} loading={isLoad}
                                    onClick={() => fetchNgay(hlId)}
                                    style={{ fontSize: 10, height: 22, padding: '0 6px' }} />
                                </div>

                                {/* Table rows */}
                                {hasRows && (
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                    <thead>
                                      <tr style={{ background: '#f0f4f8' }}>
                                        <th style={{ padding: '5px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, width: '15%' }}>Ngày</th>
                                        <th style={{ padding: '5px 10px', textAlign: 'right', fontSize: 10, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 0.4, width: '18%' }}>SL Trả về</th>
                                        <th style={{ padding: '5px 10px', textAlign: 'right', fontSize: 10, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.4, width: '18%' }}>SL Đạt sau XL</th>
                                        <th style={{ padding: '5px 10px', textAlign: 'right', fontSize: 10, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 0.4, width: '18%' }}>SL Hủy</th>
                                        <th style={{ padding: '5px 10px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 }}>Ghi chú</th>
                                        <th style={{ width: 40 }} />
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((r, ri) => (
                                        <tr key={r.id} style={{ borderTop: '1px solid #f0f2f5', background: ri % 2 === 0 ? '#fff' : '#fafafa' }}>
                                          <td style={{ padding: '5px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#374151' }}>
                                            {r.ngay ? new Date(r.ngay).toLocaleDateString('vi-VN') : '—'}
                                          </td>
                                          <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 700, color: '#dc2626', fontFamily: 'monospace' }}>
                                            {r.slTraVe != null ? Number(r.slTraVe).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) : '—'}
                                          </td>
                                          <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 700, color: '#16a34a', fontFamily: 'monospace' }}>
                                            {r.slDatSauXuLy != null ? Number(r.slDatSauXuLy).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) : '—'}
                                          </td>
                                          <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 700, color: '#ef4444', fontFamily: 'monospace' }}>
                                            {r.slHuy != null ? Number(r.slHuy).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) : '—'}
                                          </td>
                                          <td style={{ padding: '5px 10px', color: '#6b7280', fontSize: 11 }}>
                                            {r.ghiChu || ''}
                                          </td>
                                          <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                                            {canEditHL && (
                                              <Popconfirm title="Xóa dòng này?" okText="Xóa" cancelText="Hủy"
                                                onConfirm={() => deleteNgay(item, r.id)}>
                                                <Button size="small" danger type="text"
                                                  loading={!!ngaySaving[`${hlId}_${r.id}`]}
                                                  icon={<DeleteOutlined />}
                                                  style={{ height: 22, padding: '0 4px' }} />
                                              </Popconfirm>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                      {/* Tổng */}
                                      <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f0f4f8' }}>
                                        <td style={{ padding: '6px 12px', fontWeight: 800, fontSize: 11, color: '#475569', textTransform: 'uppercase' }}>Tổng</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: '#dc2626', fontFamily: 'monospace' }}>
                                          {rows.reduce((s, r) => s + (Number(r.slTraVe) || 0), 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: '#16a34a', fontFamily: 'monospace' }}>
                                          {rows.reduce((s, r) => s + (Number(r.slDatSauXuLy) || 0), 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: '#ef4444', fontFamily: 'monospace' }}>
                                          {rows.reduce((s, r) => s + (Number(r.slHuy) || 0), 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
                                        </td>
                                        <td colSpan={2} />
                                      </tr>
                                    </tbody>
                                  </table>
                                )}

                                {/* Add new row */}
                                {canEditHL && (
                                  <div style={{ padding: '10px 16px', borderTop: hasRows ? '1px solid #e8edf2' : 'none' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                      + Thêm dòng trả lại
                                    </div>
                                    <Row gutter={[10, 8]} align="bottom">
                                      <Col xs={12} sm={6} md={4}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Ngày *</div>
                                        <Input type="date" size="small" style={{ width: '100%' }}
                                          value={nf.ngay || ''}
                                          onChange={e => setNgayNew(p => ({ ...p, [hlId]: { ...nf, ngay: e.target.value } }))} />
                                      </Col>
                                      <Col xs={12} sm={5} md={4}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>SL Trả về</div>
                                        <InputNumber size="small" style={{ width: '100%' }} min={0} precision={2} placeholder="0"
                                          value={nf.slTraVe}
                                          onChange={v => setNgayNew(p => ({ ...p, [hlId]: { ...nf, slTraVe: v } }))} />
                                      </Col>
                                      <Col xs={12} sm={5} md={4}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>SL Đạt sau XL</div>
                                        <InputNumber size="small" style={{ width: '100%' }} min={0} precision={2} placeholder="0"
                                          value={nf.slDatSauXuLy}
                                          onChange={v => setNgayNew(p => ({ ...p, [hlId]: { ...nf, slDatSauXuLy: v } }))} />
                                      </Col>
                                      <Col xs={12} sm={5} md={4}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>SL Hủy</div>
                                        <InputNumber size="small" style={{ width: '100%' }} min={0} precision={2} placeholder="0"
                                          value={nf.slHuy}
                                          onChange={v => setNgayNew(p => ({ ...p, [hlId]: { ...nf, slHuy: v } }))} />
                                      </Col>
                                      <Col xs={24} sm={10} md={5}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Ghi chú</div>
                                        <Input size="small" placeholder="Ghi chú..." value={nf.ghiChu || ''}
                                          onChange={e => setNgayNew(p => ({ ...p, [hlId]: { ...nf, ghiChu: e.target.value } }))} />
                                      </Col>
                                      <Col xs={24} sm={4} md={3}>
                                        <Button type="primary" size="small" block icon={<PlusOutlined />}
                                          loading={!!ngaySaving[`${hlId}_new`]}
                                          onClick={() => addNgay(item)}
                                          style={{ background: rowAccent, borderColor: rowAccent, fontWeight: 700, fontSize: 11 }}>
                                          Thêm
                                        </Button>
                                      </Col>
                                    </Row>
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      )
                    })}
                  </div>
                ),
              },
              {
                key: 'history',
                label: (
                  <Badge count={historyList.length} size="small" offset={[6, -2]} color="#6366f1" overflowCount={999}>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>🕐 Lịch sử sửa</span>
                  </Badge>
                ),
                disabled: !isEdit && !isAdmin(),
                children: (
                  <div style={{ padding: '14px 16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                        Toàn bộ thay đổi của bản ghi này ({historyList.length} dòng)
                      </span>
                      <Button size="small" icon={<SyncOutlined spin={historyLoading} />}
                        onClick={fetchHistory} loading={historyLoading}>
                        Làm mới
                      </Button>
                    </div>
                    {historyList.length === 0 && !historyLoading && (
                      <div style={{ textAlign: 'center', color: '#9ca3af', padding: '32px 0', fontSize: 13 }}>
                        Chưa có lịch sử chỉnh sửa
                      </div>
                    )}
                    {(() => {
                      // Gom nhóm theo changedAt (cùng lần sửa)
                      const groups = []
                      historyList.forEach(h => {
                        const key = h.changedAt
                        const last = groups[groups.length - 1]
                        if (last && last.key === key) {
                          last.items.push(h)
                        } else {
                          groups.push({ key, changedBy: h.changedBy, changedAt: h.changedAt, items: [h] })
                        }
                      })
                      return groups.map((g, gi) => {
                        const dt = new Date(g.changedAt)
                        const dtStr = dt.toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' })
                        return (
                          <div key={gi} style={{ marginBottom: 14, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                            {/* Group header */}
                            <div style={{ background: '#f1f5f9', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #e5e7eb' }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: '#6366f1' }}>✏ Sửa lệnh</span>
                              <span style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>{g.changedBy}</span>
                              <span style={{ fontSize: 10, color: '#9ca3af' }}>{dtStr}</span>
                              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#6b7280', background: '#e0e7ff', borderRadius: 10, padding: '1px 8px' }}>
                                {g.items.length} trường thay đổi
                              </span>
                            </div>
                            {/* Changed fields */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                              <tbody>
                                {g.items.map((h, hi) => (
                                  <tr key={hi} style={{ borderBottom: hi < g.items.length - 1 ? '1px solid #f3f4f6' : 'none', background: hi % 2 === 0 ? '#fff' : '#fafafa' }}>
                                    <td style={{ padding: '5px 14px', width: '22%', fontWeight: 700, color: '#374151', fontSize: 11 }}>
                                      {h.fieldLabel || h.fieldName}
                                    </td>
                                    <td style={{ padding: '5px 10px', width: '35%' }}>
                                      <span style={{ background: '#fee2e2', color: '#991b1b', padding: '1px 8px', borderRadius: 4, fontFamily: 'monospace', fontSize: 11 }}>
                                        {h.oldValue != null && h.oldValue !== '' ? h.oldValue : <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>trống</span>}
                                      </span>
                                    </td>
                                    <td style={{ padding: '5px 6px', color: '#9ca3af', fontSize: 13, textAlign: 'center', width: '6%' }}>→</td>
                                    <td style={{ padding: '5px 10px', width: '37%' }}>
                                      <span style={{ background: '#dcfce7', color: '#166534', padding: '1px 8px', borderRadius: 4, fontFamily: 'monospace', fontSize: 11 }}>
                                        {h.newValue != null && h.newValue !== '' ? h.newValue : <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>trống</span>}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      })
                    })()}
                  </div>
                ),
              },
            ]}
          />
          </div>{/* end info-card tabs wrapper */}

        </Form>
      </div>

    </>
  )
}
