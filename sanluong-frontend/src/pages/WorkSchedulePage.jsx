import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Table, Button, Space, Typography, Input, Select, DatePicker, TimePicker,
  Modal, Form, InputNumber, Tag, Popconfirm, message, notification,
  Row, Col, Card, Tabs, Badge, Tooltip, Divider, Drawer, Spin, Dropdown, AutoComplete
} from 'antd'
import SkeletonTable from '../components/SkeletonTable'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  ReloadOutlined, WarningOutlined, CalendarOutlined,
  SyncOutlined, CheckCircleOutlined, EyeOutlined, LinkOutlined,
  CheckOutlined, CloseOutlined, EyeInvisibleOutlined,
  EyeTwoTone, SettingOutlined, DownOutlined, FilterOutlined, UsergroupAddOutlined,
  PrinterOutlined, ClockCircleOutlined, BarChartOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import WipPage from './WipPage'
import PhongThucHienSelect from '../components/PhongThucHienSelect'
import PhongSanXuatSelect, { warmPhongSanXuatCache } from '../components/PhongSanXuatSelect'
import KphModal from './KphModal'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RcTooltip, Legend, ResponsiveContainer, Cell, LabelList,
} from 'recharts'

const { Option } = Select
const { RangePicker } = DatePicker
const { TextArea } = Input

// ── Column filter helpers ─────────────────────────────────────────────────────
const colSearch = (dataIndex) => ({
  filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
    <div style={{ padding: 8 }}>
      <Input
        placeholder="Tìm..."
        value={selectedKeys[0]}
        onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
        onPressEnter={confirm}
        style={{ marginBottom: 8, display: 'block', width: 180 }}
        autoFocus
      />
      <Space>
        <Button type="primary" size="small" onClick={confirm}>Lọc</Button>
        <Button size="small" onClick={() => { clearFilters?.(); confirm() }}>Xóa</Button>
      </Space>
    </div>
  ),
  filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#fff' : 'rgba(255,255,255,0.7)' }} />,
  onFilter: (value, record) =>
    record[dataIndex]?.toString().toLowerCase().includes(value.toLowerCase()),
})

const colStatus = (dataIndex) => ({
  filters: [
    { text: 'Done', value: 'done' },
    { text: 'Doing', value: 'doing' },
    { text: '—', value: '' },
  ],
  filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#fff' : 'rgba(217, 225, 131, 0.7)' }} />,
  onFilter: (value, record) => (record[dataIndex] ?? '') === value,
})

const TINH_TRANG_OPTIONS = [
  { value: 'done', label: 'Done', status: 'success' },
  { value: 'doing', label: 'Doing', status: 'processing' },
]

const NHOM_TAG_COLOR = {
  PCPL1: 'blue',
  PCPL2: 'purple',
  PCPL3: 'volcano',
  PL:    'volcano',
  ĐG:    'green',
  BBC1:  'cyan',
}

const TO_NHOM_OPTIONS = {
  PC:    ['PCPL1', 'PCPL2', 'PCPL3'],
  PCPL1: ['PCPL1', 'PCPL2', 'PCPL3'],
  PCPL2: ['PCPL1', 'PCPL2', 'PCPL3'],
  PL:    ['PCPL1', 'PCPL3'],
  DG:    ['PCPL1', 'PCPL2', 'PCPL3'],
  BBC1:  ['PCPL1', 'PCPL2', 'PCPL3'],
}

const tinhTrangTag = (val) => {
  const opt = TINH_TRANG_OPTIONS.find(o => o.value === val)
  return opt ? <Badge status={opt.status} text={opt.label} /> : (val || '-')
}

const NUM_STYLE  = { color: '#000011', fontWeight: 600, fontSize: 12 }
const TEXT_STYLE = { color: '#000011', fontSize: 12 }
const fmtNum = v => (v != null && v !== '')
  ? <span style={NUM_STYLE}>{Number(v).toLocaleString('vi-VN')}</span>
  : <span style={{ color: '#d9d9d9' }}>—</span>

const slExceedRender = (v, record) => {
  const sl = Number(v) || 0
  const coLo = Number(record.coLo) || 0
  const exceeds = sl > 0 && coLo > 0 && sl > coLo
  const num = fmtNum(v)
  if (!exceeds) return num
  return (
    <span>
      <span style={{ color: '#722ed1', fontWeight: 600, fontSize: 12 }}>{Number(v).toLocaleString('vi-VN')}</span>
      {' '}
      <Tooltip title={`Sản lượng vượt cỡ lô (${Number(record.coLo).toLocaleString('vi-VN')})`}>
        <WarningOutlined style={{ color: '#672ed1', fontSize: 11 }} />
      </Tooltip>
    </span>
  )
}

const STAGE_CONFIG = {
  PCPL1: {
    label: 'Lịch sản xuất PCPL1',
    extraTableCols: [
      { title: 'SL PC', dataIndex: 'slPc', key: 'slPc', width: 95, align: 'center', render: slExceedRender },
      { title: 'Công PC', dataIndex: 'congPc', key: 'congPc', width: 85, align: 'center', render: fmtNum }
    ],
    extraFormFields: [
      { name: 'slPc', label: 'SL PC' },
      { name: 'congPc', label: 'Công PC' }
    ]
  },
  PCPL2: {
    label: 'Lịch sản xuất PCPL2',
    extraTableCols: [
      { title: 'SL PC', dataIndex: 'slPc', key: 'slPc', width: 95, align: 'center', render: slExceedRender },
      { title: 'Công PC', dataIndex: 'congPc', key: 'congPc', width: 85, align: 'center', render: fmtNum }
    ],
    extraFormFields: [
      { name: 'slPc', label: 'SL PC' },
      { name: 'congPc', label: 'Công PC' }
    ]
  },
  BBC1: {
    label: 'Lịch sản xuất BBC1',
    extraTableCols: [
      { title: 'SL BBC1', dataIndex: 'slBbc1', key: 'slBbc1', width: 95, align: 'center', render: slExceedRender },
      { title: 'Công BBC1', dataIndex: 'congBbc1', key: 'congBbc1', width: 88, align: 'center', render: fmtNum }
    ],
    extraFormFields: [
      { name: 'slBbc1', label: 'SL BBC1' },
      { name: 'congBbc1', label: 'Công BBC1' }
    ]
  },
  PL: {
    label: 'Lịch sản xuất PL',
    extraTableCols: [
      { title: 'SL PL', dataIndex: 'slPl', key: 'slPl', width: 90, align: 'center', render: slExceedRender },
      { title: 'Công PL', dataIndex: 'congPl', key: 'congPl', width: 82, align: 'center', render: fmtNum }
    ],
    extraFormFields: [
      { name: 'slPl', label: 'SL PL' },
      { name: 'congPl', label: 'Công PL' }
    ]
  },
  DG: {
    label: 'Lịch sản xuất ĐG',
    extraTableCols: [
      { title: 'SL ĐG', dataIndex: 'slDg', key: 'slDg', width: 90, align: 'center', render: slExceedRender },
      { title: 'Công ĐG', dataIndex: 'congDg', key: 'congDg', width: 82, align: 'center', render: fmtNum }
    ],
    extraFormFields: [
      { name: 'tpNhapKho', label: 'TP NKHO' },
      { name: 'slDg', label: 'SL ĐG' },
      { name: 'congDg', label: 'Công ĐG' }
    ]
  },
  CC: {
    label: 'Lịch cân chia',
    extraTableCols: [
      { title: 'SL Cân Chia', dataIndex: 'slCc', key: 'slCc', width: 105, align: 'right',
        render: v => v != null ? <span style={{ fontWeight: 700, color: '#389e0d' }}>{Number(v).toLocaleString('vi-VN')}</span> : <span style={{ color: '#d9d9d9' }}>—</span> },
      { title: 'Công Cân Chia', dataIndex: 'congCc', key: 'congCc', width: 105, align: 'center', render: fmtNum }
    ],
    extraFormFields: [
      { name: 'slCc',   label: 'SL Cân Chia'   },
      { name: 'congCc', label: 'Công Cân Chia' }
    ]
  }
}


// ── WorkDetailDrawer ──────────────────────────────────────────────────────────
const CONG_FIELD_MAP   = { PC: 'congPc', PCPL1: 'congPc', PCPL2: 'congPc', BBC1: 'congBbc1', PL: 'congPl', DG: 'congDg', CC: 'congCc' }
const SL_FIELD_MAP     = { PC: 'slPc',   PCPL1: 'slPc',   PCPL2: 'slPc',  BBC1: 'slBbc1',   PL: 'slPl',   DG: 'slDg',   CC: 'slCc' }
const NS_LOOKUP_FIELD  = { PC: 'nangSuatPc', PCPL1: 'nangSuatPc', PCPL2: 'nangSuatPc', PL: 'nangSuatPl', BBC1: 'nangSuatBbc1', DG: 'slTrungBinh', CC: 'slTrungBinh' }
const CA_SORT_ORDER    = { 'Ca 1': 0, 'HC': 1, 'Ca 2': 2 }

const NONPROD_ACTS = [
  { name: 'Vệ sinh thiết bị, dụng cụ', cat: 'Vệ sinh' },
  { name: 'Vệ sinh khu vực / 5S', cat: 'Vệ sinh' },
  { name: 'Setup / Chuyển đổi sản phẩm', cat: 'Chuyển đổi' },
  { name: 'Chờ nguyên liệu', cat: 'Chờ' },
  { name: 'Chờ BTP', cat: 'Chờ' },
  { name: 'Chờ lệnh / kế hoạch', cat: 'Chờ' },
  { name: 'Sửa chữa / Bảo trì máy', cat: 'Sự cố' },
  { name: 'Máy hỏng / Dừng máy', cat: 'Sự cố' },
  { name: 'Họp / Đào tạo', cat: 'Hành chính' },
  { name: 'Kiểm kê / Kiểm đếm', cat: 'Hành chính' },
  { name: 'Việc khác', cat: 'Khác' },
]
const NONPROD_CAT_COLOR = {
  'Vệ sinh': '#0891b2', 'Chuyển đổi': '#7c3aed', 'Chờ': '#d97706',
  'Sự cố': '#dc2626', 'Hành chính': '#059669', 'Khác': '#6b7280',
}

function WorkDetailDrawer({ open, schedule, onClose, onSaved, onRefresh, onMachineRuntimeSaved, onShiftPerfSaved }) {
  const { isAdmin, isAdminKH, isStageAdmin, canEditStage, canDeleteSchedule } = useAuth()
  const canEditDetail = canEditStage(schedule?.congDoan)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(null)
  const [maNvErrorKeys, setMaNvErrorKeys] = useState(new Set()) // keys có lỗi maNhanVien
  const [editingKeys, setEditingKeys] = useState(new Set())
  const [dirtyRowKeys, setDirtyRowKeys] = useState(new Set())
  const [batchEditDays, setBatchEditDays] = useState(new Set())
  const [batchSaving, setBatchSaving] = useState(new Set())
  const [savedSlKeys, setSavedSlKeys] = useState(new Set())
  const [slEditOriginal, setSlEditOriginal] = useState({})
  const [slHistory, setSlHistory] = useState({})
  const [contextMenu, setContextMenu] = useState(null)
  const [syncKhLoadingDays, setSyncKhLoadingDays] = useState(new Set())
  const [syncToKhLoading, setSyncToKhLoading] = useState(false)
  const [khToExists, setKhToExists] = useState(false)
  const [nonprodEntries, setNonprodEntries] = useState({})   // ngayKey → [{_id, act, cat, person, min, note}]
  const [nonprodOpenDays, setNonprodOpenDays] = useState(new Set())
  const [nonprodAddingAct, setNonprodAddingAct] = useState(null) // ngayKey đang mở dropdown chọn hoạt động
  const [machineRuntimeMap, setMachineRuntimeMap] = useState({})  // ngayKey → [{_id, id, tuGio, denGio, trangThai, lyDo, ghiChu}]
  const [machineRuntimeOpenDays, setMachineRuntimeOpenDays] = useState(new Set())
  const [machineRuntimeSaving, setMachineRuntimeSaving] = useState(new Set())
  const [machineRuntimeDirtyDays, setMachineRuntimeDirtyDays] = useState(new Set())
  const [shiftPerfMap, setShiftPerfMap] = useState({})           // ngayKey → [{_id, id, caLo, slLyThuyet, slThucTe, nguyenNhan, ghiChu}]
  const [shiftPerfOpenDays, setShiftPerfOpenDays] = useState(new Set())
  const [shiftPerfSaving, setShiftPerfSaving] = useState(new Set())
  const [shiftPerfDirtyDays, setShiftPerfDirtyDays] = useState(new Set())

  const [renamingDay, setRenamingDay] = useState(null)   // ngayKey đang đổi ngày
  const [renameDayVal, setRenameDayVal] = useState('')   // giá trị ngày mới
  const [renameSaving, setRenameSaving] = useState(false)
  // ── Inline edit form ──
  const [infoForm] = Form.useForm()
  const watchedToNhom       = Form.useWatch('toNhom',        infoForm)
  const watchedQaKn         = Form.useWatch('qaKiemNghiem', infoForm)
  const watchedQaLm         = Form.useWatch('qaLuuMau',     infoForm)
  const watchedQaKh         = Form.useWatch('qaKhac',       infoForm)
  const computedQaTotal     = (Number(watchedQaKn) || 0) + (Number(watchedQaLm) || 0) + (Number(watchedQaKh) || 0)
  const [infoSaving, setInfoSaving] = useState(false)
  const [isInfoEditing, setIsInfoEditing] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [lookupStatus, setLookupStatus] = useState(null)
  const lookupTimer = useRef(null)
  const [maBravo, setMaBravo] = useState('')
  const [pcplFromProduct, setPcplFromProduct] = useState(null)
  const [nsTrungBinh, setNsTrungBinh] = useState(null)
  const [openTabs, setOpenTabs] = useState(['list'])
  const [activeTabKey, setActiveTabKey] = useState('list')
  const [daySlMap, setDaySlMap] = useState({})
  const [dayMachineMap, setDayMachineMap] = useState({})
  const [savingDay, setSavingDay] = useState(null)
  const [pendingDays, setPendingDays] = useState([])
  const [employees, setEmployees] = useState([])
  const scrollDivRef = useRef(null)  // ref cho div overflowY:auto bên dưới
  const caChangedRef = useRef({}) // { rowKey: { ngay, maNhanVien, newCa } }
  const sessionsRef = useRef([]) // luôn trỏ tới sessions mới nhất, tránh stale closure trong onBlur
  const pendingSlRef = useRef({}) // track giá trị đang gõ để tránh stale closure trong InputNumber onBlur
  const VAI_TRO_KEY = 'vaitro_options'
  const DEFAULT_VAI_TRO = ['Trưởng ca', 'Phụ máy']
  const [vaiTroOptions, setVaiTroOptions] = useState(() => {
    try { const s = localStorage.getItem(VAI_TRO_KEY); return s ? JSON.parse(s) : DEFAULT_VAI_TRO }
    catch { return DEFAULT_VAI_TRO }
  })
  const [vaiTroModalOpen, setVaiTroModalOpen] = useState(false)
  const [newVaiTroInput, setNewVaiTroInput] = useState('')
  const [multiAddModal, setMultiAddModal] = useState({ open: false, ngayKey: null, nhom: '', subNhom: '', selectedEmps: [], caSX: '', thoiGian: '' })
  const saveVaiTroOptions = (opts) => { setVaiTroOptions(opts); localStorage.setItem(VAI_TRO_KEY, JSON.stringify(opts)) }
  const addVaiTroOption = () => {
    const v = newVaiTroInput.trim()
    if (v && !vaiTroOptions.includes(v)) { saveVaiTroOptions([...vaiTroOptions, v]); setNewVaiTroInput('') }
  }

  useEffect(() => {
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  // Sync ref với sessions mới nhất để tránh stale closure trong onBlur handlers
  useEffect(() => { sessionsRef.current = sessions }, [sessions])

  useEffect(() => {
    if (!open || !schedule) {
      setIsInfoEditing(false)
      setIsDirty(false)
      setLookupStatus(null)
      return
    }
    setIsInfoEditing(false)
    setIsDirty(false)
    setOpenTabs(['list'])
    setActiveTabKey('list')
    setMaBravo('')
    setNsTrungBinh(null)
    setPendingDays([])
    setSessions([])
    setDaySlMap({})
    setEditingKeys(new Set())
    setBatchEditDays(new Set())
    setBatchSaving(new Set())
    setSavedSlKeys(new Set())
    setKhToExists(false)
    setNonprodOpenDays(new Set())
    setNonprodAddingAct(null)
    try {
      const saved = localStorage.getItem(`nonprod_ws_${schedule.id}`)
      setNonprodEntries(saved ? JSON.parse(saved) : {})
    } catch { setNonprodEntries({}) }
    pendingSlRef.current = {}
    fetchSessions()
    api.get(`/product-master/lookup/${encodeURIComponent(schedule.maSp || '')}`)
      .then(r => {
        setMaBravo(r.data.maBravo || '')
        const field = NS_LOOKUP_FIELD[schedule.congDoan] || 'slTrungBinh'
        const val = r.data[field]
        setNsTrungBinh(val != null ? Number(val) : null)
        setPcplFromProduct(r.data.toNhomPcpl || null)
      })
      .catch(() => {})
    api.get('/employees', { params: { page: 0, size: 500 } })
      .then(r => setEmployees(r.data.content || []))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, schedule?.id])

  // Populate inline form when schedule changes (only when not actively editing)
  useEffect(() => {
    if (open && schedule && !isInfoEditing) {
      infoForm.setFieldsValue({
        ...schedule,
        ngayThucHien: schedule.ngayThucHien ? dayjs(schedule.ngayThucHien) : null,
      })
      setLookupStatus(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, schedule?.id, isInfoEditing])

  const handleInfoMaBravoBlur = async (e) => {
    if (!isInfoEditing) return
    const val = e.target.value?.trim()
    if (!val) { setLookupStatus(null); return }
    setLookupStatus('loading')
    try {
      const { data } = await api.get(`/product-master/lookup-by-bravo/${encodeURIComponent(val)}`)
      infoForm.setFieldsValue({ maSp: data.maTp, tenTrinh: data.tienTrinh })
      setPcplFromProduct(data.toNhomPcpl || null)
      setLookupStatus('found')
    } catch { setLookupStatus('not_found') }
  }

  const handleInfoMaSpBlur = async (e) => {
    if (!isInfoEditing) return
    const val = e.target.value?.trim()
    if (!val) { setLookupStatus(null); return }
    setLookupStatus('loading')
    try {
      const { data } = await api.get(`/product-master/lookup/${encodeURIComponent(val)}`)
      infoForm.setFieldsValue({ tenTrinh: data.tienTrinh })
      setPcplFromProduct(data.toNhomPcpl || null)
      setLookupStatus('found')
    } catch { setLookupStatus('not_found') }
  }

  const saveInfo = async () => {
    try {
      const values = await infoForm.validateFields()
      setInfoSaving(true)
      const congField = CONG_FIELD_MAP[schedule?.congDoan]
      const slField   = SL_FIELD_MAP[schedule?.congDoan]
      await api.put(`/work-schedule/${schedule.id}`, {
        // Preserve existing aggregate fields to avoid wiping syncAggregates() values
        slPc: schedule.slPc, congPc: schedule.congPc,
        slBbc1: schedule.slBbc1, congBbc1: schedule.congBbc1,
        slPl: schedule.slPl, congPl: schedule.congPl,
        slDg: schedule.slDg, congDg: schedule.congDg,
        congCc: schedule.congCc,
        // Preserve identity fields not present in form
        maBravo:   schedule.maBravo   ?? null,
        // Form fields override base values
        ...values,
        // Compute qaLayMau = sum of sub-fields
        qaLayMau: (Number(values.qaKiemNghiem) || 0) + (Number(values.qaLuuMau) || 0) + (Number(values.qaKhac) || 0) || null,
        // Current session-computed totals override for this stage
        ...(congField ? { [congField]: tongCong || null } : {}),
        ...(slField   ? { [slField]:   tongSanLuong || null } : {}),
        ngayThucHien: values.ngayThucHien?.format('YYYY-MM-DD'),
        congDoan: schedule.congDoan,
        source: 'SCHEDULE',
      })
      // Riêng tpNhapKho: cập nhật ProductionRecord qua patch-field (transient field, không lưu trong PUT)
      if (schedule.congDoan === 'DG') {
        const newTpNk = values.tpNhapKho ?? null
        if (newTpNk !== (schedule.tpNhapKho ?? null)) {
          await api.patch(`/work-schedule/${schedule.id}/patch-field`, { field: 'tpNhapKho', value: newTpNk })
        }
      }
      notification.success({
        message: 'Lưu thành công',
        description: 'Thông tin lệnh sản xuất đã được cập nhật.',
        placement: 'topRight',
        duration: 3,
      })
      setIsInfoEditing(false)
      setIsDirty(false)
      setLookupStatus(null)
      const hasUnsavedSl = Object.entries(daySlMap).some(([k, v]) => v !== '' && !savedSlKeys.has(k))
      if (dirtyRowKeys.size > 0 || hasUnsavedSl) {
        const parts = []
        if (dirtyRowKeys.size > 0) parts.push(`${dirtyRowKeys.size} dòng nhân viên chưa nhấn "Cập nhật" (nút đỏ)`)
        if (hasUnsavedSl) parts.push('SL ngày chưa được lưu')
        Modal.confirm({
          title: 'Có thay đổi chưa lưu',
          content: `${parts.join(' và ')}. Thoát sẽ mất các thay đổi đó.`,
          okText: 'Thoát không lưu',
          okType: 'danger',
          cancelText: 'Quay lại để lưu',
          onOk: () => { setDirtyRowKeys(new Set()); onSaved() },
        })
      } else {
        onSaved()
      }
    } catch (err) {
      if (err?.response) message.error(err.response.data?.message || 'Lưu thất bại')
    } finally { setInfoSaving(false) }
  }

  const infoLookupIcon = () => {
    if (lookupStatus === 'loading') return <SyncOutlined spin style={{ color: '#1890ff' }} />
    if (lookupStatus === 'found') return <Tooltip title="Đã tự động điền"><CheckCircleOutlined style={{ color: '#52c41a' }} /></Tooltip>
    if (lookupStatus === 'not_found') return <Tag color="orange" style={{ margin: 0 }}>Thủ công</Tag>
    return null
  }

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const [{ data }, khToResp] = await Promise.all([
        api.get('/work-schedule-session', { params: { scheduleId: schedule.id } }),
        api.get('/work-schedule-session', { params: { scheduleId: schedule.id, loaiSession: 'KH_TO' } }).catch(() => ({ data: [] })),
      ])
      const normalized = data.map(normalizeSession)
      setSessions(normalized)
      setKhToExists((khToResp.data || []).length > 0)
      const slMap = {}
      const machineMap = {}
      normalized.forEach(s => {
        const key = s.ngay || 'unknown'
        if (slMap[key] === undefined && s.sanLuong != null) {
          slMap[key] = String(Math.round(parseFloat(s.sanLuong)))
        }
        if (machineMap[key] === undefined && s.khac) {
          machineMap[key] = s.khac
        }
      })
      setDaySlMap(slMap)
      setSavedSlKeys(new Set(Object.keys(slMap)))
      setDayMachineMap(machineMap)
      // Load machine runtime for all days (non-blocking)
      const days = [...new Set(normalized.map(s => s.ngay).filter(Boolean))]
      if (days.length > 0) {
        Promise.allSettled(days.map(ngay => api.get('/machine-runtime', { params: { workScheduleId: schedule.id, ngay } })))
          .then(results => {
            const rtMap = {}
            results.forEach((res, i) => {
              if (res.status === 'fulfilled') rtMap[days[i]] = res.value.data.map(r => ({ ...r, _id: r.id }))
            })
            setMachineRuntimeMap(rtMap)
          })
        Promise.allSettled(days.map(ngay => api.get('/machine-shift-perf', { params: { workScheduleId: schedule.id, ngay } })))
          .then(results => {
            const spMap = {}
            results.forEach((res, i) => {
              if (res.status === 'fulfilled') spMap[days[i]] = res.value.data.map(r => ({ ...r, _id: r.id }))
            })
            setShiftPerfMap(spMap)
          })
      }
    } catch { message.error('Không thể tải dữ liệu chi tiết') }
    finally { setLoading(false) }
  }

  const normalizeSession = (s) => ({
    ...s,
    ngay: s.ngay || '',
    maNhanVien: s.maNhanVien || '',
    nguoiThucHien: s.nguoiThucHien || '',
    nhomThucHien: s.nhomThucHien || '',
    thoiGianBatDau: s.thoiGianBatDau || '',
    congThucHien: s.congThucHien ?? '',
    vaiTro: s.vaiTro || '',
    ghiChu: s.ghiChu || '',
    caSanXuat: s.caSanXuat || '', isTangCa: s.isTangCa || false,
  })

  const tongCong = sessions.reduce((acc, r) => acc + (parseFloat(r.congThucHien) || 0), 0)
  const tongSanLuong = Object.values(daySlMap).reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
  const ngayKeys = [...new Set(sessions.map(s => s.ngay || 'unknown'))].sort()

  // ── Machine runtime helpers ───────────────────────────────────────────────
  const _timeToMin = (t) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const computeRtStats = (entries) => {
    let runMin = 0, downMin = 0
    ;(entries || []).forEach(e => {
      if (!e.tuGio || !e.denGio) return
      const s = _timeToMin(e.tuGio), d = _timeToMin(e.denGio)
      if (d <= s) return
      if (e.trangThai === 'Chạy máy') runMin += d - s; else downMin += d - s
    })
    return { runMin, downMin }
  }
  const _rtMarkClean = (ngay) => setMachineRuntimeDirtyDays(prev => { const n = new Set(prev); n.delete(ngay); return n })
  const _rtMarkDirty = (ngay) => setMachineRuntimeDirtyDays(prev => new Set(prev).add(ngay))
  const loadMachineRuntime = async (ngay) => {
    try {
      const { data } = await api.get('/machine-runtime', { params: { workScheduleId: schedule.id, ngay } })
      setMachineRuntimeMap(prev => ({ ...prev, [ngay]: data.map(r => ({ ...r, _id: r.id })) }))
      _rtMarkClean(ngay)
    } catch {}
  }
  const addMachineRuntimeRow = (ngay) => {
    const _id = 'tmp_' + Date.now()
    setMachineRuntimeMap(prev => ({ ...prev, [ngay]: [...(prev[ngay] || []), { _id, id: null, tuGio: '', denGio: '', trangThai: 'Chạy máy', lyDo: '', ghiChu: '', sanPham: '' }] }))
    _rtMarkDirty(ngay)
  }
  const updateMachineRuntimeRow = (ngay, _id, patch) => {
    setMachineRuntimeMap(prev => ({ ...prev, [ngay]: (prev[ngay] || []).map(r => r._id === _id ? { ...r, ...patch } : r) }))
    _rtMarkDirty(ngay)
  }
  const removeMachineRuntimeRow = (ngay, _id) => {
    setMachineRuntimeMap(prev => ({ ...prev, [ngay]: (prev[ngay] || []).filter(r => r._id !== _id) }))
    _rtMarkDirty(ngay)
  }
  const saveMachineRuntime = async (ngay) => {
    setMachineRuntimeSaving(prev => new Set(prev).add(ngay))
    try {
      const entries = machineRuntimeMap[ngay] || []
      const { data } = await api.post('/machine-runtime/bulk',
        entries.map(({ tuGio, denGio, trangThai, lyDo, ghiChu, sanPham }) => ({ tuGio, denGio, trangThai, lyDo: lyDo || null, ghiChu: ghiChu || null, sanPham: sanPham || null })),
        { params: { workScheduleId: schedule.id, ngay } }
      )
      setMachineRuntimeMap(prev => ({ ...prev, [ngay]: data.map(r => ({ ...r, _id: r.id })) }))
      _rtMarkClean(ngay)
      onMachineRuntimeSaved?.()
      message.success('Đã lưu thời gian chạy máy')
    } catch { message.error('Lưu thời gian chạy máy thất bại') }
    finally { setMachineRuntimeSaving(prev => { const n = new Set(prev); n.delete(ngay); return n }) }
  }

  // ── Shift perf (Sản lượng theo ca) helpers ─────────────────────────────────
  const _spMarkClean = (ngay) => setShiftPerfDirtyDays(prev => { const n = new Set(prev); n.delete(ngay); return n })
  const _spMarkDirty = (ngay) => setShiftPerfDirtyDays(prev => new Set(prev).add(ngay))
  const loadShiftPerf = async (ngay) => {
    try {
      const { data } = await api.get('/machine-shift-perf', { params: { workScheduleId: schedule.id, ngay } })
      setShiftPerfMap(prev => ({ ...prev, [ngay]: data.map(r => ({ ...r, _id: r.id })) }))
      _spMarkClean(ngay)
    } catch {}
  }
  const addShiftPerfRow = (ngay) => {
    const _id = 'tmp_' + Date.now()
    const rows = shiftPerfMap[ngay] || []
    const nextCa = rows.length === 0 ? 'Ca 1' : rows.length === 1 ? 'Ca 2' : ''
    setShiftPerfMap(prev => ({ ...prev, [ngay]: [...rows, { _id, id: null, caLo: nextCa, slLyThuyet: null, slThucTe: null, nguyenNhan: '', ghiChu: '' }] }))
    _spMarkDirty(ngay)
  }
  const updateShiftPerfRow = (ngay, _id, patch) => {
    setShiftPerfMap(prev => ({ ...prev, [ngay]: (prev[ngay] || []).map(r => r._id === _id ? { ...r, ...patch } : r) }))
    _spMarkDirty(ngay)
  }
  const removeShiftPerfRow = (ngay, _id) => {
    setShiftPerfMap(prev => ({ ...prev, [ngay]: (prev[ngay] || []).filter(r => r._id !== _id) }))
    _spMarkDirty(ngay)
  }
  const saveShiftPerf = async (ngay) => {
    setShiftPerfSaving(prev => new Set(prev).add(ngay))
    try {
      const entries = shiftPerfMap[ngay] || []
      const { data } = await api.post('/machine-shift-perf/bulk',
        entries.map(({ caLo, slLyThuyet, slThucTe, nguyenNhan, ghiChu }) => ({ caLo: caLo || null, slLyThuyet: slLyThuyet ?? null, slThucTe: slThucTe ?? null, nguyenNhan: nguyenNhan || null, ghiChu: ghiChu || null })),
        { params: { workScheduleId: schedule.id, ngay } }
      )
      setShiftPerfMap(prev => ({ ...prev, [ngay]: data.map(r => ({ ...r, _id: r.id })) }))
      _spMarkClean(ngay)
      onShiftPerfSaved?.()
      message.success('Đã lưu sản lượng theo ca')
    } catch { message.error('Lưu sản lượng theo ca thất bại') }
    finally { setShiftPerfSaving(prev => { const n = new Set(prev); n.delete(ngay); return n }) }
  }
  const computeShiftPerfStats = (entries) => {
    let sumLT = 0, sumTT = 0
    ;(entries || []).forEach(e => {
      sumLT += e.slLyThuyet || 0
      sumTT += e.slThucTe || 0
    })
    const pPct = sumLT > 0 && sumTT > 0 ? Math.round(sumTT / sumLT * 1000) / 10 : null
    return { sumLT, sumTT, pPct, tonThat: sumLT > 0 ? sumLT - sumTT : 0 }
  }

  // ── Non-productive time helpers ─────────────────────────────────────────────
  const saveNonprod = (entries) => {
    setNonprodEntries(entries)
    try { localStorage.setItem(`nonprod_ws_${schedule?.id}`, JSON.stringify(entries)) } catch {}
  }
  const addNonprodEntry = (ngayKey, act, cat, person = '') => {
    const entry = { _id: `np_${Date.now()}_${Math.random().toString(36).slice(2)}`, act, cat, person, min: 0, note: '' }
    const prev = nonprodEntries[ngayKey] || []
    saveNonprod({ ...nonprodEntries, [ngayKey]: [...prev, entry] })
  }
  const updateNonprodEntry = (ngayKey, _id, patch) => {
    saveNonprod({
      ...nonprodEntries,
      [ngayKey]: (nonprodEntries[ngayKey] || []).map(e => e._id === _id ? { ...e, ...patch } : e),
    })
  }
  const removeNonprodEntry = (ngayKey, _id) => {
    const next = (nonprodEntries[ngayKey] || []).filter(e => e._id !== _id)
    saveNonprod({ ...nonprodEntries, [ngayKey]: next })
  }

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
    const scrollEl = scrollDivRef.current
    const savedTop = scrollEl?.scrollTop ?? 0
    setPendingDays(prev => {
      const taken = new Set([...ngayKeys, ...prev.map(p => p.ngay)])
      let d = dayjs()
      while (taken.has(d.format('YYYY-MM-DD'))) d = d.add(1, 'day')
      return [...prev, { tempId: Date.now(), ngay: d.format('YYYY-MM-DD') }]
    })
    requestAnimationFrame(() => { if (scrollEl) scrollEl.scrollTop = savedTop })
  }

  const addRowToDay = (ngayKey) => {
    const tempId = Date.now()
    setSessions(prev => [...prev, {
      _tempId: tempId, id: null, workScheduleId: schedule.id,
      ngay: ngayKey, maNhanVien: '', nguoiThucHien: '', nhomThucHien: '',
      thoiGianBatDau: '', congThucHien: '', vaiTro: '', ghiChu: '', caSanXuat: '', isTangCa: false,
    }])
    setBatchEditDays(prev => new Set([...prev, ngayKey]))
    setEditingKeys(prev => new Set([...prev, tempId]))
  }

  const confirmMultiAdd = async () => {
    const { ngayKey, nhom, selectedEmps, caSX, thoiGian } = multiAddModal
    if (!selectedEmps.length) { message.warning('Vui lòng chọn ít nhất 1 nhân viên'); return }

    const cong = caSX && thoiGian ? calcCong(thoiGian, caSX) : ''
    const newRows = selectedEmps.map((emp, i) => ({
      _tempId: Date.now() + i, id: null, workScheduleId: schedule.id,
      ngay: ngayKey, maNhanVien: emp.maNhanVien || '', nguoiThucHien: emp.hoVaTen || '',
      nhomThucHien: nhom, thoiGianBatDau: thoiGian,
      congThucHien: cong,
      vaiTro: '', ghiChu: '', caSanXuat: caSX, isTangCa: false,
    }))

    // Thêm vào UI ngay lập tức
    setSessions(prev => [...prev, ...newRows])
    setMultiAddModal({ open: false, ngayKey: null, nhom: '', subNhom: '', selectedEmps: [], caSX: '', thoiGian: '' })

    // Lưu lên backend ngay — không chờ user bấm Lưu
    const saved = []
    const failed = []
    await Promise.allSettled(newRows.map(async (row) => {
      try {
        const { data } = await api.post('/work-schedule-session', {
          workScheduleId: row.workScheduleId,
          ngay:           row.ngay,
          maNhanVien:     row.maNhanVien || null,
          nguoiThucHien:  row.nguoiThucHien || null,
          nhomThucHien:   row.nhomThucHien || null,
          caSanXuat:      row.caSanXuat || null,
          thoiGianBatDau: row.thoiGianBatDau || null,
          congThucHien:   row.congThucHien !== '' ? row.congThucHien : null,
          vaiTro:         null,
          ghiChu:         null,
          isTangCa:       false,
        })
        saved.push({ tempId: row._tempId, data })
      } catch (err) {
        failed.push(row.nguoiThucHien || row.maNhanVien)
      }
    }))

    // Cập nhật id thật cho các row đã lưu thành công
    if (saved.length > 0) {
      setSessions(prev => {
        const updated = prev.map(s => {
          const match = saved.find(sv => sv.tempId === s._tempId)
          return match ? normalizeSession(match.data) : s
        })
        syncCong(updated)
        return updated
      })
      onRefresh?.()
    }
    if (saved.length > 0 && failed.length === 0) {
      notification.success({
        message: 'Thêm thành công',
        description: `Đã thêm ${saved.length} nhân viên vào ca sản xuất.`,
        placement: 'topRight',
        duration: 3,
      })
    } else if (failed.length > 0) {
      message.error(`Lưu thất bại: ${failed.join(', ')}`)
    }
  }

  const calcCong = (thoiGian, ca) => {
    const t = parseFloat(thoiGian)
    if (!t || !ca) return ''
    const divisor = ca === 'HC' ? 8 : 7
    return parseFloat((t / divisor).toFixed(4))
  }

  const updateLocal = (identifier, field, value) => {
    setSessions(prev => prev.map(s =>
      (s.id ? s.id === identifier : s._tempId === identifier)
        ? { ...s, [field]: value } : s
    ))
    setDirtyRowKeys(prev => new Set([...prev, identifier]))
  }

  const updateLocals = (identifier, fields) => {
    setSessions(prev => prev.map(s =>
      (s.id ? s.id === identifier : s._tempId === identifier)
        ? { ...s, ...fields } : s
    ))
    setDirtyRowKeys(prev => new Set([...prev, identifier]))
  }

  const syncCong = async (updatedSessions) => {
    const field = CONG_FIELD_MAP[schedule?.congDoan]
    if (!field || !schedule?.id) return
    const newCong = updatedSessions.reduce((acc, r) => acc + (parseFloat(r.congThucHien) || 0), 0)
    const value = newCong || null
    try {
      await api.patch(`/work-schedule/${schedule.id}/patch-field`, { field, value })
      onRefresh?.()
    } catch { /* silent */ }
  }

  const syncSl = async (newTongSl) => {
    const field = SL_FIELD_MAP[schedule?.congDoan]
    if (!field || !schedule?.id) return
    const value = newTongSl || null
    try {
      await api.patch(`/work-schedule/${schedule.id}/patch-field`, { field, value })
      onRefresh?.()
    } catch { /* silent */ }
  }

  const markMaNvError = (key) => {
    setMaNvErrorKeys(prev => new Set([...prev, key]))
    // Tự xóa sau 4 giây
    setTimeout(() => setMaNvErrorKeys(prev => { const n = new Set(prev); n.delete(key); return n }), 4000)
  }
  const clearMaNvError = (key) => {
    setMaNvErrorKeys(prev => { const n = new Set(prev); n.delete(key); return n })
  }

  // Sau khi đổi Ca trong sản xuất, đồng bộ Ca của worker đó trong KH_TO cho cùng work_schedule+ngày
  const syncKhToForCaChange = async (maNhanVien, ngay, newCa) => {
    if (!maNhanVien || !ngay || !newCa || !schedule?.id) return
    try {
      const { data: khToList } = await api.get('/work-schedule-session', {
        params: { scheduleId: schedule.id, loaiSession: 'KH_TO' },
      })
      const conflicting = khToList.filter(s =>
        s.maNhanVien === maNhanVien && s.ngay === ngay && s.caSanXuat !== newCa
      )
      if (conflicting.length === 0) return
      await Promise.all(conflicting.map(s =>
        api.patch(`/work-schedule-session/${s.id}/ca`, { caSanXuat: newCa })
      ))
      message.info(`Đã đồng bộ ca kế hoạch tổ → ${newCa}`)
    } catch { /* non-critical */ }
  }

  // Đồng bộ Ca từ kế hoạch tổ → sản lượng tổ cho một ngày cụ thể
  const syncCaFromKhTo = async (ngayKey) => {
    if (!schedule?.id || !ngayKey) return
    setSyncKhLoadingDays(prev => new Set([...prev, ngayKey]))
    try {
      const { data: khToList } = await api.get('/work-schedule-session', {
        params: { scheduleId: schedule.id, loaiSession: 'KH_TO' },
      })

      // Lọc KH_TO theo ngày này
      const khForDay = khToList.filter(kh => kh.ngay === ngayKey)
      if (khForDay.length === 0) { message.info('Không có kế hoạch tổ cho ngày này'); return }

      // Map KH_TO: maNhanVien → targetCa (Ca đầu tiên trong kế hoạch)
      const khCaMap = {} // maNhanVien → targetCa
      const khAllMap = {} // maNhanVien → [khToSession, ...]
      for (const kh of khForDay) {
        if (!kh.maNhanVien || !kh.caSanXuat) continue
        if (!khAllMap[kh.maNhanVien]) {
          khAllMap[kh.maNhanVien] = []
          khCaMap[kh.maNhanVien] = kh.caSanXuat // Ca đầu tiên = Ca đúng
        }
        khAllMap[kh.maNhanVien].push(kh)
      }

      // Nhóm session sản xuất theo maNhanVien trong ngày này
      const dayRows = sessions.filter(s => s.id && s.maNhanVien && (s.ngay || '') === ngayKey)
      const prodMap = {} // maNhanVien → [prodSession, ...]
      for (const s of dayRows) {
        if (!prodMap[s.maNhanVien]) prodMap[s.maNhanVien] = []
        prodMap[s.maNhanVien].push(s)
      }

      let updatedCount = 0
      let deletedProdCount = 0
      let deletedKhCount = 0
      const idsToRemove = new Set()
      const patchedIds = {} // id → updatedFields

      // Task 1 + 2: Với mỗi người có trong kế hoạch tổ
      for (const [maNv, targetCa] of Object.entries(khCaMap)) {
        const prodRows = prodMap[maNv] || []
        if (prodRows.length === 0) continue

        // Tìm session đúng Ca và session sai Ca
        const correctRows = prodRows.filter(s => s.caSanXuat === targetCa)
        const wrongRows   = prodRows.filter(s => s.caSanXuat !== targetCa)

        if (correctRows.length > 0) {
          // Đã có session Ca đúng → xóa toàn bộ session Ca sai
          for (const s of wrongRows) {
            await api.delete(`/work-schedule-session/${s.id}`)
            idsToRemove.add(s.id)
            deletedProdCount++
          }
        } else {
          // Chưa có session Ca đúng → cập nhật session đầu tiên, xóa phần còn lại
          const [first, ...rest] = prodRows
          const thoiGian = first.thoiGianBatDau && parseFloat(first.thoiGianBatDau) > 0
            ? parseFloat(first.thoiGianBatDau)
            : (targetCa === 'HC' ? 8 : 7)
          const congThuc = calcCong(String(thoiGian), targetCa)
          await api.patch(`/work-schedule-session/${first.id}/ca`, {
            caSanXuat: targetCa,
            thoiGianBatDau: String(thoiGian),
            congThucHien: congThuc,
          })
          patchedIds[first.id] = { caSanXuat: targetCa, thoiGianBatDau: String(thoiGian), congThucHien: congThuc }
          updatedCount++
          for (const s of rest) {
            await api.delete(`/work-schedule-session/${s.id}`)
            idsToRemove.add(s.id)
            deletedProdCount++
          }
        }
      }

      // Cập nhật local state
      let updatedSessions = sessions
        .filter(s => !idsToRemove.has(s.id))
        .map(s => patchedIds[s.id] ? { ...s, ...patchedIds[s.id] } : s)
      setSessions(updatedSessions)
      if (updatedCount > 0 || deletedProdCount > 0) syncCong(updatedSessions)

      // Task 3: Xóa KH_TO entries có Ca khác với Ca kế hoạch chính (duplicate trong kế hoạch)
      for (const [maNv, khEntries] of Object.entries(khAllMap)) {
        if (khEntries.length <= 1) continue
        const finalCa = khCaMap[maNv]
        const toDelete = khEntries.filter(kh => kh.caSanXuat !== finalCa)
        const results = await Promise.allSettled(toDelete.map(kh => api.delete(`/work-schedule-session/${kh.id}`)))
        deletedKhCount += results.filter(r => r.status === 'fulfilled').length
      }

      const msgs = []
      if (updatedCount > 0) msgs.push(`Cập nhật ${updatedCount} ca sản xuất`)
      if (deletedProdCount > 0) msgs.push(`Xóa ${deletedProdCount} người khỏi ca cũ`)
      if (deletedKhCount > 0) msgs.push(`Xóa ${deletedKhCount} ca kế hoạch trùng`)
      if (msgs.length > 0) message.success(msgs.join(', '))
      else message.info('Không có ca nào cần đồng bộ')
    } catch {
      message.error('Đồng bộ ca thất bại')
    } finally {
      setSyncKhLoadingDays(prev => { const n = new Set(prev); n.delete(ngayKey); return n })
    }
  }

  // Đẩy toàn bộ SCHEDULE sessions → tạo KH_TO tương ứng (nếu chưa tồn tại)
  const handleSyncScheduleToKhTo = async () => {
    if (!schedule?.id) return
    setSyncToKhLoading(true)
    try {
      const { data } = await api.post('/work-schedule-session/sync-schedule-to-kh-to', null, {
        params: { scheduleId: schedule.id },
      })
      setKhToExists(true)
      if (data.created === 0) message.info('Tất cả người thực hiện đã có trong Kế Hoạch Tổ')
      else message.success(`Đã đẩy ${data.created} người thực hiện lên Kế Hoạch Tổ`)
    } catch {
      message.error('Đồng bộ thất bại')
    } finally {
      setSyncToKhLoading(false)
    }
  }

  const saveRow = async (s) => {
    const key = s.id || s._tempId
    setSaving(key)

    // Tự động tìm mã NV nếu chưa có nhưng đã chọn tên
    // Nguyên tắc STRICT: nếu đã chọn nhomThucHien → chỉ tìm trong nhóm đó
    // Không fallback sang nhóm khác để tránh gán sai maNhanVien
    let resolvedMaNv = s.maNhanVien || ''
    if (!resolvedMaNv && s.nguoiThucHien) {
      const exactByName = employees.filter(emp => emp.hoVaTen === s.nguoiThucHien)
      const byGroup = s.nhomThucHien
        ? exactByName.filter(emp => emp.toNhom === s.nhomThucHien)
        : []
      // STRICT: nếu có nhóm → chỉ nhận kết quả trong nhóm; nếu không có nhóm → chỉ nhận khi duy nhất
      const match = byGroup.length > 0
        ? byGroup[0]
        : (!s.nhomThucHien && exactByName.length === 1 ? exactByName[0] : null)

      if (match) {
        resolvedMaNv = match.maNhanVien
      } else {
        // Fallback API — cũng áp dụng strict nhomThucHien
        try {
          const { data } = await api.get('/employees', {
            params: { page: 0, size: 500, search: s.nguoiThucHien }
          })
          const apiCandidates = (data.content || []).filter(emp => emp.hoVaTen === s.nguoiThucHien)
          const apiByGroup = s.nhomThucHien
            ? apiCandidates.filter(emp => emp.toNhom === s.nhomThucHien)
            : []
          const apiMatch = apiByGroup.length > 0
            ? apiByGroup[0]
            : (!s.nhomThucHien && apiCandidates.length === 1 ? apiCandidates[0] : null)
          if (apiMatch) resolvedMaNv = apiMatch.maNhanVien
        } catch { /* non-blocking */ }
      }
      if (resolvedMaNv) updateLocal(key, 'maNhanVien', resolvedMaNv)
    }

    // Bắt buộc: maNhanVien không được trống
    if (!resolvedMaNv || resolvedMaNv.trim() === '') {
      markMaNvError(key)
      message.error({
        content: `Mã Nhân Viên bắt buộc! Nhập trực tiếp hoặc đảm bảo "${s.nguoiThucHien || 'nhân viên'}" đã có trong Danh sách nhân sự với nhóm "${s.nhomThucHien || 'đúng'}".`,
        duration: 6,
      })
      setSaving(null)
      return
    }
    const payload = {
      workScheduleId: schedule.id,
      ngay: s.ngay || null,
      maNhanVien: resolvedMaNv || null,
      nguoiThucHien: s.nguoiThucHien || null,
      nhomThucHien: s.nhomThucHien || null,
      thoiGianBatDau: s.thoiGianBatDau || null,
      congThucHien: s.congThucHien !== '' ? s.congThucHien : null,
      vaiTro: s.vaiTro || null,
      ghiChu: s.ghiChu || null,
      caSanXuat: s.caSanXuat || null, isTangCa: s.isTangCa || false,
      sanLuong: s.sanLuong != null ? s.sanLuong : null,
    }
    try {
      let updatedSessions
      if (s.id) {
        const { data } = await api.put(`/work-schedule-session/${s.id}`, payload)
        setSessions(prev => {
          updatedSessions = prev.map(r => r.id === s.id ? normalizeSession(data) : r)
          return updatedSessions
        })
      } else {
        const { data } = await api.post('/work-schedule-session', payload)
        setSessions(prev => {
          updatedSessions = prev.map(r => r._tempId === s._tempId ? normalizeSession(data) : r)
          return updatedSessions
        })
      }
      if (updatedSessions) syncCong(updatedSessions)
      setEditingKeys(prev => { const next = new Set(prev); next.delete(key); return next })
      setDirtyRowKeys(prev => { const n = new Set(prev); n.delete(key); return n })
      onRefresh?.()
      notification.success({
        message: 'Lưu thành công',
        description: `Đã lưu: ${s.nguoiThucHien || resolvedMaNv}`,
        placement: 'topRight',
        duration: 3,
      })
      // Đồng bộ KH_TO nếu Ca vừa đổi
      const caChange = caChangedRef.current[key]
      if (caChange) {
        delete caChangedRef.current[key]
        syncKhToForCaChange(caChange.maNhanVien, caChange.ngay, caChange.newCa)
      }
    } catch { message.error('Lưu thất bại') }
    finally { setSaving(null) }
  }

  const saveAllForDay = async (ngayKey) => {
    const rows = sessions.filter(s => (s.ngay || 'unknown') === ngayKey)
    if (rows.length === 0) {
      setBatchEditDays(prev => { const n = new Set(prev); n.delete(ngayKey); return n })
      return
    }
    setBatchSaving(prev => new Set([...prev, ngayKey]))
    let hasError = false
    let currentSessions = [...sessions]

    for (const s of rows) {
      const key = s.id || s._tempId
      let resolvedMaNv = s.maNhanVien || ''
      if (!resolvedMaNv && s.nguoiThucHien) {
        const exactByName = employees.filter(emp => emp.hoVaTen === s.nguoiThucHien)
        const byGroup = s.nhomThucHien ? exactByName.filter(emp => emp.toNhom === s.nhomThucHien) : []
        const match = byGroup.length > 0 ? byGroup[0]
          : (!s.nhomThucHien && exactByName.length === 1 ? exactByName[0] : null)
        if (match) resolvedMaNv = match.maNhanVien
      }
      if (!resolvedMaNv?.trim()) {
        markMaNvError(key)
        hasError = true
        continue
      }
      const payload = {
        workScheduleId: schedule.id,
        ngay: s.ngay || null,
        maNhanVien: resolvedMaNv || null,
        nguoiThucHien: s.nguoiThucHien || null,
        nhomThucHien: s.nhomThucHien || null,
        thoiGianBatDau: s.thoiGianBatDau || null,
        congThucHien: s.congThucHien !== '' ? s.congThucHien : null,
        vaiTro: s.vaiTro || null,
        ghiChu: s.ghiChu || null,
        caSanXuat: s.caSanXuat || null,
        isTangCa: s.isTangCa || false,
        sanLuong: s.sanLuong != null ? s.sanLuong : null,
      }
      try {
        if (s.id) {
          const { data } = await api.put(`/work-schedule-session/${s.id}`, payload)
          currentSessions = currentSessions.map(r => r.id === s.id ? normalizeSession(data) : r)
        } else {
          const { data } = await api.post('/work-schedule-session', payload)
          currentSessions = currentSessions.map(r => r._tempId === s._tempId ? normalizeSession(data) : r)
        }
      } catch {
        hasError = true
        message.error(`Lưu thất bại: ${s.nguoiThucHien || 'dòng lỗi'}`)
      }
    }

    setSessions(currentSessions)
    syncCong(currentSessions)
    onRefresh?.()
    setBatchSaving(prev => { const n = new Set(prev); n.delete(ngayKey); return n })
    if (hasError) {
      notification.warning({
        message: 'Lưu chưa hoàn toàn',
        description: 'Một số dòng lưu thất bại hoặc thiếu Mã NV. Kiểm tra các dòng bôi đỏ.',
        placement: 'topRight',
        duration: 5,
      })
    } else {
      setBatchEditDays(prev => { const n = new Set(prev); n.delete(ngayKey); return n })
      const dayRowKeys = rows.map(s => s.id || s._tempId)
      setDirtyRowKeys(prev => { const n = new Set(prev); dayRowKeys.forEach(k => n.delete(k)); return n })
      const ngayLabel = dayjs(ngayKey).isValid() ? dayjs(ngayKey).format('DD/MM/YYYY') : ngayKey
      notification.success({
        message: 'Lưu thành công',
        description: `Đã lưu ${rows.length} dòng ngày ${ngayLabel}.`,
        placement: 'topRight',
        duration: 3,
      })
    }
    // Đồng bộ KH_TO cho các row có Ca thay đổi
    const caChanges = Object.values(caChangedRef.current).filter(c => c.ngay === ngayKey)
    caChanges.forEach(c => {
      Object.keys(caChangedRef.current).forEach(k => {
        if (caChangedRef.current[k] === c) delete caChangedRef.current[k]
      })
      syncKhToForCaChange(c.maNhanVien, c.ngay, c.newCa)
    })
  }

  const deleteRow = async (s) => {
    if (!s.id) {
      const updated = sessions.filter(r => r._tempId !== s._tempId)
      setSessions(updated)
      syncCong(updated)
      onRefresh?.()
      return
    }
    try {
      await api.delete(`/work-schedule-session/${s.id}`)
      const updated = sessions.filter(r => r.id !== s.id)
      setSessions(updated)
      syncCong(updated)
      onRefresh?.()
      message.success('Đã xóa')
    } catch { message.error('Xóa thất bại') }
  }

  const renameDayKey = async (oldKey, newKey) => {
    if (!newKey || newKey === oldKey) { setRenamingDay(null); return }
    const rows = sessions.filter(s => (s.ngay || 'unknown') === oldKey)
    if (rows.length === 0) { setRenamingDay(null); return }
    setRenameSaving(true)
    try {
      await Promise.all(rows.map(s =>
        s.id ? api.put(`/work-schedule-session/${s.id}`, { ...s, ngay: newKey, workScheduleId: schedule.id }) : Promise.resolve()
      ))
      setSessions(prev => prev.map(s => (s.ngay || 'unknown') === oldKey ? { ...s, ngay: newKey } : s))
      setDaySlMap(prev => {
        const next = { ...prev }
        if (next[oldKey] !== undefined) { next[newKey] = next[oldKey]; delete next[oldKey] }
        return next
      })
      setSavedSlKeys(prev => {
        const next = new Set(prev)
        if (next.has(oldKey)) { next.delete(oldKey); next.add(newKey) }
        return next
      })
      setOpenTabs(prev => prev.map(t => t === oldKey ? newKey : t))
      message.success('Đã đổi ngày thành công')
    } catch { message.error('Đổi ngày thất bại') }
    finally { setRenameSaving(false); setRenamingDay(null) }
  }

  const deleteDaySessions = async (ngayKey) => {
    const rows = sessions.filter(s => (s.ngay || 'unknown') === ngayKey)
    try {
      await Promise.all(rows.filter(s => s.id).map(s => api.delete(`/work-schedule-session/${s.id}`)))
      const remainingSessions = sessions.filter(s => (s.ngay || 'unknown') !== ngayKey)
      setSessions(remainingSessions)
      setOpenTabs(prev => prev.filter(t => t !== ngayKey))
      setSavedSlKeys(prev => { const n = new Set(prev); n.delete(ngayKey); return n })
      const nextSlMap = { ...daySlMap }
      delete nextSlMap[ngayKey]
      setDaySlMap(nextSlMap)
      const newTong = Object.values(nextSlMap).reduce((a, v) => a + (parseFloat(v) || 0), 0)
      syncSl(newTong)
      syncCong(remainingSessions)
      message.success('Đã xóa ngày sản xuất')
    } catch { message.error('Xóa ngày thất bại') }
  }

  const saveDaySl = async (ngayKey, overrideVal) => {
    // overrideVal: truyền trực tiếp từ e.target.value để tránh stale closure
    const val = overrideVal != null ? String(overrideVal) : daySlMap[ngayKey]
    if (val === '' || val == null) return
    const parsed = parseInt(val, 10)
    if (isNaN(parsed)) return
    // Đồng bộ state ngay nếu override
    if (overrideVal != null) setDaySlMap(prev => ({ ...prev, [ngayKey]: String(overrideVal) }))
    // Dùng sessionsRef.current để tránh stale closure — luôn trỏ tới sessions mới nhất
    const currentSessions = sessionsRef.current
    const rows = currentSessions.filter(s => (s.ngay || 'unknown') === ngayKey)
    const first = rows.find(r => r.id) // tìm session đầu tiên có id (bỏ qua pending rows)
    if (!first?.id) return
    setSavingDay(ngayKey)

    try {
      // Dùng PATCH /san-luong thay vì PUT để tránh ghi đè dữ liệu khác.
      // Backend tự gọi syncAggregates → cập nhật slDg/slBbc1/slPl/... trên work-schedule.
      await api.patch(`/work-schedule-session/${first.id}/san-luong`, { sanLuong: parsed })
      const effectiveVal = String(overrideVal ?? val)
      setSessions(prev => prev.map(r => r.id === first.id ? { ...r, sanLuong: parsed } : r))
      setDaySlMap(prev => ({ ...prev, [ngayKey]: effectiveVal }))
      const newTongSl = Object.values({ ...daySlMap, [ngayKey]: effectiveVal })
        .reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
      syncSl(newTongSl)
      setSavedSlKeys(prev => new Set([...prev, ngayKey]))
      setSlEditOriginal(prev => { const n = { ...prev }; delete n[ngayKey]; return n })
      setSlHistory(prev => ({
        ...prev,
        [ngayKey]: [...(prev[ngayKey] || []), { value: parsed, savedAt: new Date() }],
      }))
      delete pendingSlRef.current[ngayKey]
      onRefresh?.()
      const ngayLabel = dayjs(ngayKey).isValid() ? dayjs(ngayKey).format('DD/MM/YYYY') : ngayKey
      notification.success({
        message: 'Lưu sản lượng thành công',
        description: `Sản lượng ngày ${ngayLabel}: ${Number(parsed).toLocaleString('vi-VN')}`,
        placement: 'topRight',
        duration: 3,
      })
    } catch (err) {
      message.error(err?.response?.data?.message || err?.message || 'Lưu sản lượng thất bại')
    }
    finally { setSavingDay(null) }
  }

  const saveDayMachine = async (ngayKey, machineVal) => {
    const rows = sessionsRef.current.filter(s => (s.ngay || 'unknown') === ngayKey)
    const first = rows.find(r => r.id)
    if (!first?.id) return
    try {
      await api.patch(`/work-schedule-session/${first.id}/khac`, { khac: machineVal || null })
      setDayMachineMap(prev => ({ ...prev, [ngayKey]: machineVal || '' }))
    } catch { message.error('Lưu máy thực hiện thất bại') }
  }

  const cellStyle = { padding: '5px 8px', border: '1px solid #d9d9d9', verticalAlign: 'middle' }
  const headStyle = { ...cellStyle, background: '#e6f4ff', fontWeight: 600, color: '#1677ff', whiteSpace: 'nowrap' }
  const subHeadStyle = { ...cellStyle, background: '#fff7e6', fontWeight: 600, color: '#1890ff', whiteSpace: 'nowrap' }
  const inputStyle = { width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 12 }

  const qaLayMauForNs = schedule?.congDoan === 'DG' ? (Number(schedule?.qaLayMau) || 0) : 0
  const slForNs = tongSanLuong - qaLayMauForNs
  const nangSuat = tongCong > 0 && slForNs > 0 ? slForNs / tongCong : null

  const HeaderTable = () => {
    const validKeys = ngayKeys.filter(k => k !== 'unknown' && dayjs(k).isValid())
    const ngayBatDau  = validKeys.length > 0 ? dayjs(validKeys[0]) : null
    const ngayKetThuc = validKeys.length > 0 ? dayjs(validKeys[validKeys.length - 1]) : null
    const soNgay      = (ngayBatDau && ngayKetThuc) ? ngayKetThuc.diff(ngayBatDau, 'day') + 1 : null
    return (
      <div style={{ overflowX: 'auto', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Mã Bravo', 'Mã sản phẩm', 'Mã ĐH', 'Tiến Trình', 'Số Lô', 'Số Lượng', 'Sản Lượng', 'Tổng Công', 'Năng Suất', 'NS Trung Bình',
                ...(schedule?.congDoan === 'DG' ? ['SL Nhập Kho'] : []),
                'Ngày Bắt đầu', 'Ngày Kết thúc', 'Tổng Số Ngày TH'].map(h => (
                <th key={h} style={headStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={cellStyle}><Tag color="blue" style={{ fontFamily: 'monospace' }}>{maBravo || '—'}</Tag></td>
              <td style={cellStyle}><span style={{ color: '#3cc6ec', fontWeight: 600 }}>{schedule?.maSp || '—'}</span></td>
              <td style={cellStyle}>{schedule?.maDonHang
                ? <span style={{ color: '#7c3aed', fontFamily: 'monospace', fontWeight: 600 }}>{schedule.maDonHang}</span>
                : <span style={{ color: '#bbb' }}>—</span>}
              </td>
              <td style={{ ...cellStyle, maxWidth: 260 }}>{schedule?.tenTrinh || '—'}</td>
              <td style={cellStyle}>{schedule?.soLo || '—'}</td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>{schedule?.coLo ?? '—'}</td>
              <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: '#389e0d' }}>
                {tongSanLuong ? tongSanLuong.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
              </td>
              <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: '#1677ff' }}>
                {tongCong ? tongCong.toLocaleString('vi-VN', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : '0.0000'}
              </td>
              <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: nangSuat ? '#d46b08' : '#aaa' }}>
                {nangSuat != null ? Math.round(nangSuat).toLocaleString('vi-VN') : '—'}
              </td>
              <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: '#722ed1' }}>
                {nsTrungBinh != null ? Math.round(nsTrungBinh).toLocaleString('vi-VN') : '—'}
              </td>
              {schedule?.congDoan === 'DG' && (
                <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                  {schedule?.tpNhapKho != null ? Number(schedule.tpNhapKho).toLocaleString('vi-VN') : '—'}
                </td>
              )}
              <td style={{ ...cellStyle, textAlign: 'center', color: '#1677ff', fontWeight: 600 }}>
                {ngayBatDau ? ngayBatDau.format('DD/MM/YYYY') : '—'}
              </td>
              <td style={{ ...cellStyle, textAlign: 'center', color: '#f97316', fontWeight: 600 }}>
                {ngayKetThuc ? ngayKetThuc.format('DD/MM/YYYY') : '—'}
              </td>
              <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 700, color: soNgay != null ? '#389e0d' : '#aaa' }}>
                {soNgay != null ? soNgay : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  const renderListTab = () => {
    // pending days chưa có trong sessions
    const pendingOnlyDays = pendingDays.filter(pd => !ngayKeys.includes(pd.ngay))
    const allDayItems = [
      ...ngayKeys.map(k => ({ k, isPending: false, tempId: null })),
      ...pendingOnlyDays.map(pd => ({ k: pd.ngay, isPending: true, tempId: pd.tempId })),
    ]
    return (
      <>
        {allDayItems.length === 0 && (
          <div style={{ textAlign: 'center', color: '#aaa', padding: '30px 0', fontSize: 13 }}>
            Chưa có dữ liệu. Nhấn "+ Thêm ngày" để bắt đầu.
          </div>
        )}

        {allDayItems.map(({ k, isPending, tempId }) => {
          const rows = sessions
            .filter(s => (s.ngay || 'unknown') === k)
            .sort((a, b) => (CA_SORT_ORDER[a.caSanXuat] ?? 3) - (CA_SORT_ORDER[b.caSanXuat] ?? 3))
          const tong = rows.reduce((a, r) => a + (parseFloat(r.congThucHien) || 0), 0)
          const slVal = daySlMap[k] ?? ''
          const slNum = parseFloat(slVal) || 0
          const nsNgay = tong > 0 && slNum > 0 ? Math.round(slNum / tong) : null
          return (
            <div key={isPending ? `pending-${tempId}` : k} style={{
              background: '#fff', border: '1px solid #e2e8f0',
              borderRadius: 12, marginBottom: 14, overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,.05)',
            }}>
              {/* ── Day header — 1 dòng ── */}
              <div className="ws-day-header" style={{
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap',
                background: '#f0fdf4', borderBottom: '1px solid #dcfce7', padding: '7px 12px',
                minWidth: 0,
              }}>
                {/* Date */}
                <input
                  type="date"
                  style={{ border: '1px solid #86efac', borderRadius: 7, padding: '3px 7px', fontSize: 12.5, fontWeight: 700, color: '#15803d', background: 'transparent', flexShrink: 0 }}
                  value={k}
                  onChange={e => {
                    const newDate = e.target.value
                    if (!newDate) return
                    if (isPending) {
                      setPendingDays(prev => prev.map(p => p.tempId === tempId ? { ...p, ngay: newDate } : p))
                    } else {
                      renameDayKey(k, newDate)
                    }
                  }}
                  disabled={!canEditDetail}
                />

                {/* Stats */}
                <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Số dòng: <b style={{ color: '#0f172a' }}>{rows.length}</b>
                </span>
                <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  SL ngày&nbsp;
                  {canEditDetail
                    ? savedSlKeys.has(k) && slVal !== ''
                      ? <>
                          <b style={{ color: '#7c3aed', fontFamily: 'monospace', fontSize: 12.5 }}>{Number(slVal).toLocaleString('vi-VN')}</b>
                          <button
                            style={{ border: '1px solid #d3adf7', borderRadius: 4, background: '#f9f0ff', color: '#722ed1', fontSize: 11, padding: '1px 6px', cursor: 'pointer', fontWeight: 600, lineHeight: '18px' }}
                            onClick={() => setSavedSlKeys(prev => { const n = new Set(prev); n.delete(k); return n })}>
                            Đổi
                          </button>
                        </>
                      : <input
                          type="number" min="0" step="1"
                          style={{ width: 75, border: '1px solid #cbd5e1', borderRadius: 6, padding: '2px 5px', fontSize: 12.5, fontWeight: 700, textAlign: 'right', color: '#0f172a' }}
                          value={slVal}
                          onChange={e => setDaySlMap(prev => ({ ...prev, [k]: e.target.value }))}
                          onBlur={e => { if (e.target.value !== '' && rows.some(r => r.id)) saveDaySl(k, e.target.value) }}
                          onKeyDown={e => { if (e.key === 'Enter' && rows.some(r => r.id)) { e.preventDefault(); saveDaySl(k, e.target.value) } }}
                        />
                    : <b style={{ color: '#7c3aed' }}>{slVal !== '' ? Number(slVal).toLocaleString('vi-VN') : '—'}</b>
                  }
                </span>
                <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Công: <b style={{ color: '#0f172a' }}>{tong ? tong.toFixed(4) : '0'}</b>
                </span>
                <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  NS:&nbsp;
                  {nsNgay != null ? (() => {
                    let color = '#0f172a', arrow = ''
                    if (nsTrungBinh && nsNgay > nsTrungBinh) { color = '#15803d'; arrow = ' ▲' }
                    if (nsTrungBinh && nsNgay < nsTrungBinh) { color = '#dc2626'; arrow = ' ▼' }
                    return <b style={{ color }}>{nsNgay.toLocaleString('vi-VN')}{arrow}</b>
                  })() : <b style={{ color: '#aaa' }}>—</b>}
                </span>
                {/* Máy thực hiện — chỉ ĐG */}
                {schedule?.congDoan === 'DG' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b', flexShrink: 0 }}>
                    Máy:&nbsp;
                    <PhongSanXuatSelect
                      size="small"
                      value={dayMachineMap[k] || null}
                      onChange={v => saveDayMachine(k, v || null)}
                      disabled={!canEditDetail}
                      style={{ width: 170, fontSize: 11 }}
                      placeholder="Chọn máy..."
                    />
                  </span>
                )}
                {/* Machine runtime stats */}
                {(() => {
                  const { runMin, downMin } = computeRtStats(machineRuntimeMap[k])
                  if (runMin === 0 && downMin === 0) return null
                  return <>
                    <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      TG Chạy: <b style={{ color: '#16a34a', fontFamily: 'monospace' }}>{runMin}p</b>
                    </span>
                    <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      TG Nghỉ: <b style={{ color: '#dc2626', fontFamily: 'monospace' }}>{downMin}p</b>
                    </span>
                  </>
                })()}

                {/* Actions */}
                {canEditDetail && (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                    <Button
                      size="small" type="primary" icon={<PlusOutlined />}
                      onClick={() => {
                        addRowToDay(k)
                        if (isPending) setPendingDays(prev => prev.filter(p => p.tempId !== tempId))
                      }}
                      style={{ background: '#4f46e5', borderColor: '#4f46e5', fontSize: 12 }}>
                      + Thêm người
                    </Button>
                    <Button
                      size="small" icon={<UsergroupAddOutlined />}
                      onClick={() => {
                        if (isPending) setPendingDays(prev => prev.filter(p => p.tempId !== tempId))
                        setMultiAddModal({ open: true, ngayKey: k, nhom: '', subNhom: '', selectedEmps: [], caSX: '', thoiGian: '' })
                      }}
                      style={{ fontSize: 12 }}>
                      Nhiều người
                    </Button>
                    {!isPending && rows.some(r => r.id) && (
                      <Tooltip title="Kiểm tra kế hoạch tổ và đồng bộ Ca vào sản xuất. Xóa Ca kế hoạch bị trùng.">
                        <Button
                          size="small" icon={<SyncOutlined />}
                          loading={syncKhLoadingDays.has(k)}
                          onClick={() => syncCaFromKhTo(k)}
                          style={{ fontSize: 12, color: '#0284c7', borderColor: '#7dd3fc' }}>
                          Đồng bộ Ca
                        </Button>
                      </Tooltip>
                    )}
                    {!isPending && rows.some(r => dirtyRowKeys.has(r.id || r._tempId) || !r.id) && (
                      <Button
                        size="small" type="primary" icon={<CheckOutlined />}
                        loading={batchSaving.has(k)}
                        onClick={() => saveAllForDay(k)}
                        style={{ fontSize: 12, background: '#f97316', borderColor: '#ea580c' }}>
                        Lưu tất cả
                      </Button>
                    )}
                    {!isPending && (
                      <Popconfirm
                        title={`Xóa toàn bộ dữ liệu ngày ${dayjs(k).isValid() ? dayjs(k).format('DD/MM/YYYY') : k}?`}
                        description={`Sẽ xóa ${rows.length} bản ghi sản xuất.`}
                        onConfirm={() => deleteDaySessions(k)}
                        okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
                      >
                        <Button size="small" danger type="text" icon={<DeleteOutlined />} style={{ color: '#cbd5e1' }} />
                      </Popconfirm>
                    )}
                    {isPending && (
                      <Button size="small" type="text" danger
                        onClick={() => setPendingDays(prev => prev.filter(p => p.tempId !== tempId))}>✕</Button>
                    )}
                  </div>
                )}
              </div>

              {/* ── Day body ── */}
              <div style={{ padding: '0 0 4px 0' }}>
                {(slHistory[k]?.length > 0) && (
                  <div style={{ fontSize: 11, color: '#8c8c8c', padding: '6px 15px 0', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600 }}>Lịch sử SL:</span>
                    {slHistory[k].map((h, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {i > 0 && <span style={{ color: '#bbb' }}>→</span>}
                        <Tag style={{ margin: 0, fontSize: 11 }} color="purple">{Number(h.value).toLocaleString('vi-VN')}</Tag>
                        <span style={{ color: '#bbb' }}>{dayjs(h.savedAt).format('HH:mm')}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Person table — luôn ở chế độ edit */}
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table className="ws-session-table" style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {['Người thực hiện', 'Mã NV', 'Nhóm/tổ', 'Ca SX', 'Thời gian (giờ)', 'Công thực hiện',
                          <span key="vt">Vai trò{canEditDetail && <SettingOutlined onClick={() => setVaiTroModalOpen(true)} style={{ marginLeft: 5, cursor: 'pointer', color: '#1677ff', fontSize: 10 }} />}</span>,
                          canEditDetail ? '' : null].filter(h => h !== null).map((h, i) => (
                          <th key={i} style={{ ...subHeadStyle, background: '#fdf6e3' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 && (
                        <tr><td colSpan={8} style={{ ...cellStyle, textAlign: 'center', color: '#aaa', padding: 14 }}>
                          Chưa có người — nhấn "+ Thêm người"
                        </td></tr>
                      )}
                      {rows.map(s => {
                        const rowKey = s.id || s._tempId
                        const isSavingRow = saving === rowKey
                        return (
                          <tr key={rowKey}
                            className={!s.id ? 'ws-row-new' : ''}
                            style={dirtyRowKeys.has(rowKey) ? { background: '#fff7ed' } : undefined}
                            onContextMenu={canEditDetail ? e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, s, ngayKey: k }) } : undefined}>
                            <td style={{ ...cellStyle, minWidth: 150 }}>
                              <select style={{ ...inputStyle, cursor: 'pointer' }} value={s.nguoiThucHien}
                                onChange={e => {
                                  const name = e.target.value
                                  const allMatches = employees.filter(emp => emp.hoVaTen === name)
                                  const groupMatches = s.nhomThucHien ? allMatches.filter(emp => emp.toNhom === s.nhomThucHien) : []
                                  const best = groupMatches.length === 1 ? groupMatches[0] : allMatches.length === 1 ? allMatches[0] : null
                                  updateLocals(rowKey, { nguoiThucHien: name, maNhanVien: best ? best.maNhanVien : '' })
                                }}>
                                <option value="">-- Chọn nhân viên --</option>
                                {employees.filter(emp => !s.nhomThucHien || emp.toNhom === s.nhomThucHien || emp.toNhom2 === s.nhomThucHien)
                                  .map(emp => <option key={emp.id} value={emp.hoVaTen}>{emp.hoVaTen}</option>)}
                              </select>
                            </td>
                            <td style={{ ...cellStyle, width: 100 }}>
                              {(() => {
                                const allByName = s.nguoiThucHien ? employees.filter(emp => emp.hoVaTen === s.nguoiThucHien) : []
                                const groupByName = s.nhomThucHien ? allByName.filter(emp => emp.toNhom === s.nhomThucHien) : []
                                const matches = groupByName.length > 0 ? groupByName : allByName
                                if (matches.length > 1) return (
                                  <select style={{ ...inputStyle, cursor: 'pointer', color: '#1890ff', fontWeight: 600 }} value={s.maNhanVien}
                                    onChange={e => updateLocal(rowKey, 'maNhanVien', e.target.value)}>
                                    <option value="">-- Chọn mã --</option>
                                    {matches.map(emp => <option key={emp.id} value={emp.maNhanVien}>{emp.maNhanVien} ({emp.toNhom})</option>)}
                                  </select>
                                )
                                const hasError = maNvErrorKeys.has(rowKey)
                                return (
                                  <>
                                    <input style={{ ...inputStyle, color: '#1890ff', fontWeight: 600, ...(hasError ? { border: '2px solid #ef4444', background: '#fef2f2' } : {}) }}
                                      value={s.maNhanVien} onChange={e => { clearMaNvError(rowKey); updateLocal(rowKey, 'maNhanVien', e.target.value) }} placeholder="Nhập mã NV" />
                                    {hasError && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>⚠ Bắt buộc</div>}
                                  </>
                                )
                              })()}
                            </td>
                            <td style={{ ...cellStyle, minWidth: 110 }}>
                              <select style={{ ...inputStyle, cursor: 'pointer' }} value={s.nhomThucHien}
                                onChange={e => { clearMaNvError(rowKey); updateLocals(rowKey, { nhomThucHien: e.target.value, nguoiThucHien: '', maNhanVien: '' }) }}>
                                <option value="">-- Chọn nhóm --</option>
                                {['PCPL1', 'PCPL2', 'PCPL3', 'BBC1', 'ĐG', 'KT'].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </td>
                            <td style={{ ...cellStyle, width: 100 }}>
                              <select style={{ ...inputStyle, cursor: 'pointer', fontWeight: 600, color: s.caSanXuat === 'HC' ? '#389e0d' : s.caSanXuat ? '#1677ff' : undefined }}
                                value={s.caSanXuat}
                                onChange={e => {
                                  const ca = e.target.value
                                  if (ca !== s.caSanXuat && ca && s.maNhanVien && s.ngay) {
                                    caChangedRef.current[rowKey] = { ngay: s.ngay, maNhanVien: s.maNhanVien, newCa: ca }
                                  }
                                  updateLocals(rowKey, { caSanXuat: ca, congThucHien: calcCong(s.thoiGianBatDau, ca) })
                                }}>
                                <option value="">-- Ca --</option>
                                <option value="Ca 1">Ca 1</option>
                                <option value="Ca 2">Ca 2</option>
                                <option value="HC">Hành Chính</option>
                              </select>
                            </td>
                            <td style={{ ...cellStyle, width: 90 }}>
                              <input style={{ ...inputStyle, textAlign: 'right' }} type="number" step="0.01" min="0" value={s.thoiGianBatDau}
                                onChange={e => { const tg = e.target.value; updateLocals(rowKey, { thoiGianBatDau: tg, congThucHien: calcCong(tg, s.caSanXuat) }) }} />
                            </td>
                            <td style={{ ...cellStyle, width: 110, textAlign: 'right', fontWeight: 700, color: '#0f766e' }}>
                              {(() => { const v = calcCong(s.thoiGianBatDau, s.caSanXuat); return v !== '' ? v : (s.congThucHien !== '' && s.congThucHien != null ? parseFloat(s.congThucHien).toFixed(4) : '—') })()}
                            </td>
                            <td style={{ ...cellStyle, minWidth: 110 }}>
                              <input list={`vaitro-list-${rowKey}`} style={{ ...inputStyle, border: '1px solid #d9d9d9', borderRadius: 3, padding: '1px 5px', background: '#fff' }}
                                value={s.vaiTro} placeholder="Chọn hoặc nhập..." onChange={e => updateLocal(rowKey, 'vaiTro', e.target.value)} />
                              <datalist id={`vaitro-list-${rowKey}`}>{vaiTroOptions.map(v => <option key={v} value={v} />)}</datalist>
                            </td>
                            <td style={{ ...cellStyle, width: 40, textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <Button size="small" type="text" danger icon={<DeleteOutlined />}
                                onClick={() => deleteRow(s)} style={{ padding: '0 4px', color: '#cbd5e1', fontSize: 15 }} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Thời gian không tạo ra sản phẩm ── */}
              {(isAdmin() || isAdminKH() || isStageAdmin()) && (() => {
                const dayEntries = nonprodEntries[k] || []
                const totalMin = dayEntries.reduce((sum, e) => sum + (parseInt(e.min) || 0), 0)
                const isNpOpen = nonprodOpenDays.has(k)
                const actGroups = {}
                dayEntries.forEach(e => {
                  if (!actGroups[e.act]) actGroups[e.act] = { cat: e.cat, entries: [] }
                  actGroups[e.act].entries.push(e)
                })
                return (
                  <div style={{ borderTop: '1px solid #e8f5e9' }}>
                    {/* Toggle header */}
                    <div
                      onClick={() => setNonprodOpenDays(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
                        cursor: 'pointer', fontSize: 12, userSelect: 'none',
                        background: totalMin > 0 ? '#fffbeb' : '#f8fafc',
                        color: totalMin > 0 ? '#92400e' : '#6b7280',
                      }}
                    >
                      <span>⏱</span>
                      <span style={{ fontWeight: 600 }}>Thời gian không tạo sản phẩm</span>
                      {totalMin > 0 && <Tag color="orange" style={{ margin: 0, fontSize: 11 }}>{totalMin} phút</Tag>}
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>{isNpOpen ? '▲ Thu gọn' : '▼ Xem / Nhập'}</span>
                    </div>
                    {/* Panel content */}
                    {isNpOpen && (
                      <div style={{ padding: '8px 14px 12px', background: '#fffef7' }}>
                        {/* Activity groups */}
                        {Object.entries(actGroups).map(([act, { cat, entries: actEntries }]) => {
                          const cc = NONPROD_CAT_COLOR[cat] || '#6b7280'
                          const actTotal = actEntries.reduce((s, e) => s + (parseInt(e.min) || 0), 0)
                          return (
                            <div key={act} style={{ marginBottom: 8, border: `1px solid ${cc}30`, borderRadius: 8, overflow: 'hidden' }}>
                              {/* Activity header */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: cc + '10', fontSize: 12 }}>
                                <span style={{ fontWeight: 700, flex: 1 }}>{act}</span>
                                <span style={{ fontSize: 10, fontWeight: 600, color: cc, background: cc + '20', border: `1px solid ${cc}40`, borderRadius: 10, padding: '1px 7px' }}>{cat}</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: cc, marginLeft: 8 }}>{actTotal} p</span>
                              </div>
                              {/* Entries */}
                              {actEntries.map(entry => (
                                <div key={entry._id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderTop: `1px solid ${cc}20`, fontSize: 12 }}>
                                  <select
                                    style={{ flex: 2, border: '1px solid #e5e7eb', borderRadius: 5, padding: '2px 5px', fontSize: 11, background: '#fff' }}
                                    value={entry.person}
                                    onChange={ev => updateNonprodEntry(k, entry._id, { person: ev.target.value })}
                                  >
                                    <option value="">-- Chọn người --</option>
                                    {employees.map(emp => <option key={emp.id} value={emp.hoVaTen}>{emp.hoVaTen}</option>)}
                                    {entry.person && !employees.find(e => e.hoVaTen === entry.person) && (
                                      <option value={entry.person}>{entry.person}</option>
                                    )}
                                  </select>
                                  <input
                                    type="number" min="0" step="5"
                                    style={{ width: 58, border: '1px solid #e5e7eb', borderRadius: 5, padding: '2px 5px', fontSize: 11, textAlign: 'right' }}
                                    value={entry.min || ''}
                                    onChange={ev => updateNonprodEntry(k, entry._id, { min: parseInt(ev.target.value) || 0 })}
                                    placeholder="phút"
                                  />
                                  <span style={{ fontSize: 11, color: '#6b7280' }}>p</span>
                                  <input
                                    style={{ flex: 3, border: '1px solid #e5e7eb', borderRadius: 5, padding: '2px 5px', fontSize: 11 }}
                                    value={entry.note || ''}
                                    onChange={ev => updateNonprodEntry(k, entry._id, { note: ev.target.value })}
                                    placeholder="Ghi chú..."
                                  />
                                  <button
                                    onClick={() => removeNonprodEntry(k, entry._id)}
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 15, padding: '0 3px', lineHeight: 1 }}
                                  >×</button>
                                </div>
                              ))}
                              {/* + người */}
                              <div style={{ padding: '3px 10px', borderTop: `1px solid ${cc}20` }}>
                                <Button size="small" type="text" icon={<PlusOutlined />}
                                  style={{ fontSize: 11, color: cc, padding: '0 4px' }}
                                  onClick={() => addNonprodEntry(k, act, cat)}>
                                  + người
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                        {/* + Hoạt động */}
                        {nonprodAddingAct === k ? (
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', padding: '4px 0' }}>
                            {NONPROD_ACTS.filter(a => !actGroups[a.name]).map(a => {
                              const cc = NONPROD_CAT_COLOR[a.cat] || '#6b7280'
                              return (
                                <button key={a.name}
                                  onClick={() => { addNonprodEntry(k, a.name, a.cat); setNonprodAddingAct(null) }}
                                  style={{ border: `1px solid ${cc}50`, background: cc + '10', color: cc, borderRadius: 20, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                                  {a.name}
                                </button>
                              )
                            })}
                            <button onClick={() => setNonprodAddingAct(null)}
                              style={{ border: '1px solid #e5e7eb', background: '#f9fafb', borderRadius: 20, padding: '3px 10px', fontSize: 11, cursor: 'pointer', color: '#6b7280' }}>
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <Button size="small" type="dashed" icon={<PlusOutlined />}
                            style={{ fontSize: 11, marginTop: Object.keys(actGroups).length > 0 ? 4 : 0 }}
                            onClick={() => setNonprodAddingAct(k)}>
                            + Hoạt động
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* ── Thời gian chạy máy ── */}
              {(() => {
                const rtEntries = machineRuntimeMap[k] || []
                const { runMin, downMin } = computeRtStats(rtEntries)
                const total = runMin + downMin
                const avail = total > 0 ? (runMin / total * 100).toFixed(1) : null
                const isOpen = machineRuntimeOpenDays.has(k)
                const isSaving = machineRuntimeSaving.has(k)
                const isDirty = machineRuntimeDirtyDays.has(k)
                const PREDEFINED_REASONS = ['Chờ nguyên liệu', 'Hỏng máy', 'Chuyển đổi mã', 'Vệ sinh / bảo trì']
                return (
                  <div style={{ borderTop: '1px solid #e0f2fe' }}>
                    {/* Toggle header */}
                    <div
                      onClick={() => {
                        if (isOpen && isDirty) {
                          Modal.confirm({
                            title: 'Chưa lưu thay đổi',
                            content: 'Bảng thời gian chạy máy có thay đổi chưa được lưu. Thoát mà không lưu?',
                            okText: 'Thoát không lưu',
                            cancelText: 'Ở lại',
                            okType: 'danger',
                            onOk: () => {
                              loadMachineRuntime(k)
                              setMachineRuntimeOpenDays(prev => { const n = new Set(prev); n.delete(k); return n })
                            },
                          })
                          return
                        }
                        setMachineRuntimeOpenDays(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })
                        if (!machineRuntimeOpenDays.has(k) && !machineRuntimeMap[k]) loadMachineRuntime(k)
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
                        cursor: 'pointer', fontSize: 12, userSelect: 'none',
                        background: runMin > 0 || downMin > 0 ? '#f0f9ff' : '#f8fafc',
                        color: '#0369a1',
                      }}
                    >
                      <span>⚙️</span>
                      <span style={{ fontWeight: 600 }}>Thời gian chạy máy</span>
                      {runMin > 0 && <Tag color="success" style={{ margin: 0, fontSize: 11 }}>Chạy {runMin}p</Tag>}
                      {downMin > 0 && <Tag color="error" style={{ margin: 0, fontSize: 11 }}>Nghỉ {downMin}p</Tag>}
                      {avail && <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>A={avail}%</Tag>}
                      {isDirty && <Tag color="warning" style={{ margin: 0, fontSize: 11 }}>Chưa lưu</Tag>}
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>{isOpen ? '▲ Thu gọn' : '▼ Xem / Nhập'}</span>
                    </div>
                    {/* Panel content */}
                    {isOpen && (
                      <div style={{ padding: '10px 14px 14px', background: '#f8fbff' }}>
                        {/* Table */}
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr>
                                {['#', 'Từ giờ', 'Đến giờ', 'Trạng thái', 'Lý do dừng', 'Ghi chú', ''].map((h, i) => (
                                  <th key={i} style={{ padding: '6px 8px', background: '#e0f2fe', color: '#0c4a6e', fontWeight: 600, fontSize: 11, textAlign: 'left', borderBottom: '1px solid #bae6fd', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rtEntries.length === 0 && (
                                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#aaa', padding: '12px 0', fontSize: 12 }}>Chưa có dữ liệu — nhấn "+ Thêm dòng"</td></tr>
                              )}
                              {rtEntries.map((row, idx) => {
                                const isChay = row.trangThai !== 'Dừng máy'
                                return (
                                  <tr key={row._id} style={{ background: idx % 2 === 0 ? '#fff' : '#f0f9ff' }}>
                                    <td style={{ padding: '4px 8px', color: '#94a3b8', fontSize: 11, textAlign: 'center', width: 28 }}>{idx + 1}</td>
                                    <td style={{ padding: '3px 6px', width: 95 }}>
                                      <TimePicker format="HH:mm" size="small" style={{ width: '100%' }}
                                        value={row.tuGio ? dayjs(row.tuGio, 'HH:mm') : null}
                                        onChange={(_, s) => updateMachineRuntimeRow(k, row._id, { tuGio: s })} />
                                    </td>
                                    <td style={{ padding: '3px 6px', width: 95 }}>
                                      <TimePicker format="HH:mm" size="small" style={{ width: '100%' }}
                                        value={row.denGio ? dayjs(row.denGio, 'HH:mm') : null}
                                        onChange={(_, s) => updateMachineRuntimeRow(k, row._id, { denGio: s })} />
                                    </td>
                                    <td style={{ padding: '3px 6px', width: 110 }}>
                                      <select value={row.trangThai || 'Chạy máy'} style={{ width: '100%', border: '1px solid #bae6fd', borderRadius: 5, padding: '3px 5px', fontSize: 12, color: isChay ? '#16a34a' : '#dc2626', fontWeight: 600 }}
                                        onChange={e => updateMachineRuntimeRow(k, row._id, { trangThai: e.target.value, lyDo: '' })}>
                                        <option value="Chạy máy">Chạy máy</option>
                                        <option value="Dừng máy">Dừng máy</option>
                                      </select>
                                    </td>
                                    <td style={{ padding: '3px 6px', width: 170 }}>
                                      {(!isChay && !!row.lyDo && !PREDEFINED_REASONS.includes(row.lyDo)) ? (
                                        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                                          <input
                                            autoFocus
                                            value={row.lyDo}
                                            placeholder="Nhập lý do..."
                                            style={{ flex: 1, border: '1px solid #bae6fd', borderRadius: 5, padding: '3px 6px', fontSize: 12, minWidth: 0 }}
                                            onChange={e => updateMachineRuntimeRow(k, row._id, { lyDo: e.target.value })}
                                          />
                                          <button
                                            onClick={() => updateMachineRuntimeRow(k, row._id, { lyDo: '' })}
                                            title="Quay lại danh sách"
                                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 15, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
                                          >↩</button>
                                        </div>
                                      ) : (
                                        <select value={row.lyDo || ''} disabled={isChay} style={{ width: '100%', border: '1px solid #bae6fd', borderRadius: 5, padding: '3px 5px', fontSize: 12, background: isChay ? '#f3f4f6' : '#fff' }}
                                          onChange={e => updateMachineRuntimeRow(k, row._id, { lyDo: e.target.value })}>
                                          <option value="">—</option>
                                          {PREDEFINED_REASONS.map(o => <option key={o} value={o}>{o}</option>)}
                                          <option value="Khác">Khác...</option>
                                        </select>
                                      )}
                                    </td>
                                    <td style={{ padding: '3px 6px' }}>
                                      <input value={row.ghiChu || ''} placeholder="Ghi chú..." style={{ width: '100%', border: '1px solid #bae6fd', borderRadius: 5, padding: '3px 6px', fontSize: 12 }}
                                        onChange={e => updateMachineRuntimeRow(k, row._id, { ghiChu: e.target.value })} />
                                    </td>
                                    <td style={{ padding: '3px 6px', width: 30, textAlign: 'center' }}>
                                      <button onClick={() => removeMachineRuntimeRow(k, row._id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                        {/* Add row */}
                        <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => addMachineRuntimeRow(k)} style={{ marginTop: 8, fontSize: 11, color: '#0369a1', borderColor: '#bae6fd' }}>
                          + Thêm dòng
                        </Button>
                        {/* Summary */}
                        {(runMin > 0 || downMin > 0) && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 12 }}>
                            {[
                              { label: 'Tổng TG kế hoạch', val: `${total} phút`, color: '#0f4c4c' },
                              { label: 'Tổng TG chạy máy', val: `${runMin} phút`, color: '#16a34a' },
                              { label: 'Tổng TG nghỉ', val: `${downMin} phút`, color: '#dc2626' },
                              { label: 'Availability (A)', val: avail ? `${avail}%` : '—', color: '#4f46e5' },
                            ].map(({ label, val, color }) => (
                              <div key={label} style={{ background: '#fff', border: '1px solid #e0f2fe', borderRadius: 8, padding: '8px 12px' }}>
                                <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginBottom: 2 }}>{label}</div>
                                <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: 'monospace' }}>{val}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Save */}
                        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Button type="primary" size="small" loading={isSaving} onClick={() => saveMachineRuntime(k)}
                            style={{ background: isDirty ? '#0369a1' : '#16a34a', borderColor: isDirty ? '#0369a1' : '#16a34a', fontSize: 12 }}>
                            {isDirty ? 'Lưu' : '✓ Đã lưu'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* ── Sản lượng theo ca / lô sản xuất (P indicator) ── */}
              {(() => {
                const spEntries = shiftPerfMap[k] || []
                const { sumLT, sumTT, pPct, tonThat } = computeShiftPerfStats(spEntries)
                const isOpen = shiftPerfOpenDays.has(k)
                const isSaving = shiftPerfSaving.has(k)
                const isDirtyP = shiftPerfDirtyDays.has(k)
                const LOSS_TYPES = ['— Chọn loại tổn thất —', 'Giảm tốc độ', 'Dừng nhỏ / Ngắt quãng', 'Nhân công / Điều chỉnh', 'Chất lượng / Làm lại', 'Khác']
                const lossColors = { 'Giảm tốc độ': '#dc2626', 'Dừng nhỏ / Ngắt quãng': '#d97706', 'Nhân công / Điều chỉnh': '#7c3aed', 'Chất lượng / Làm lại': '#0369a1', 'Khác': '#6b7280' }
                const pColor = pPct == null ? '#9ca3af' : pPct >= 95 ? '#16a34a' : pPct >= 80 ? '#d97706' : '#dc2626'
                return (
                  <div style={{ borderTop: '1px solid #fde68a' }}>
                    {/* Toggle header */}
                    <div
                      onClick={() => {
                        setShiftPerfOpenDays(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })
                        if (!shiftPerfOpenDays.has(k) && !shiftPerfMap[k]) loadShiftPerf(k)
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, userSelect: 'none', background: spEntries.length > 0 ? '#fffbeb' : '#f8fafc', color: '#92400e' }}
                    >
                      <span>⚡</span>
                      <span style={{ fontWeight: 600 }}>Sản lượng theo ca / lô sản xuất</span>
                      {pPct != null && <Tag color={pPct >= 95 ? 'success' : pPct >= 80 ? 'warning' : 'error'} style={{ margin: 0, fontSize: 11 }}>P = {pPct}%</Tag>}
                      {pPct == null && spEntries.length > 0 && <Tag color="default" style={{ margin: 0, fontSize: 11 }}>P = —</Tag>}
                      {isDirtyP && <Tag color="warning" style={{ margin: 0, fontSize: 11 }}>Chưa lưu</Tag>}
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>{isOpen ? '▲ Thu gọn' : '▼ Xem / Nhập'}</span>
                    </div>
                    {isOpen && (
                      <div style={{ padding: '10px 14px 14px', background: '#fffdf0' }}>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr>
                                {['#', 'Ca / Lô', 'SL lý thuyết', 'SL thực tế sản xuất', 'P ca (%)', 'Tổn thất tốc độ', 'Nguyên nhân giảm tốc', ''].map((h, i) => (
                                  <th key={i} style={{ padding: '5px 7px', background: '#fef3c7', color: '#92400e', fontWeight: 600, fontSize: 11, textAlign: 'left', borderBottom: '1px solid #fde68a', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {spEntries.length === 0 && (
                                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#aaa', padding: '12px 0', fontSize: 12 }}>Chưa có dữ liệu — nhấn "+ Thêm dòng"</td></tr>
                              )}
                              {spEntries.map((row, idx) => {
                                const pCa = row.slLyThuyet > 0 && row.slThucTe != null ? Math.round(row.slThucTe / row.slLyThuyet * 1000) / 10 : null
                                const tt = row.slLyThuyet != null && row.slThucTe != null ? row.slLyThuyet - row.slThucTe : null
                                return (
                                  <tr key={row._id} style={{ background: idx % 2 === 0 ? '#fff' : '#fffbeb' }}>
                                    <td style={{ padding: '4px 7px', color: '#94a3b8', fontSize: 11, textAlign: 'center', width: 24 }}>{idx + 1}</td>
                                    <td style={{ padding: '3px 5px', width: 90 }}>
                                      <select value={row.caLo || ''} style={{ width: '100%', border: '1px solid #fde68a', borderRadius: 5, padding: '3px 5px', fontSize: 12, fontWeight: 600 }}
                                        onChange={e => updateShiftPerfRow(k, row._id, { caLo: e.target.value })}>
                                        <option value="">—</option>
                                        {['Ca 1', 'Ca 2', 'Ca 3', 'Lô 1', 'Lô 2'].map(o => <option key={o} value={o}>{o}</option>)}
                                      </select>
                                    </td>
                                    <td style={{ padding: '3px 5px', width: 110 }}>
                                      <input type="number" value={row.slLyThuyet ?? ''} placeholder="SP tối đa" style={{ width: '100%', border: '1px solid #fde68a', borderRadius: 5, padding: '3px 6px', fontSize: 12, textAlign: 'right' }}
                                        onChange={e => updateShiftPerfRow(k, row._id, { slLyThuyet: e.target.value === '' ? null : Number(e.target.value) })} />
                                    </td>
                                    <td style={{ padding: '3px 5px', width: 130 }}>
                                      <input type="number" value={row.slThucTe ?? ''} placeholder="SP thực tế" style={{ width: '100%', border: '1px solid #fde68a', borderRadius: 5, padding: '3px 6px', fontSize: 12, textAlign: 'right', color: '#1d4ed8', fontWeight: 700 }}
                                        onChange={e => updateShiftPerfRow(k, row._id, { slThucTe: e.target.value === '' ? null : Number(e.target.value) })} />
                                    </td>
                                    <td style={{ padding: '3px 5px', width: 70, textAlign: 'center', fontWeight: 700, color: pCa == null ? '#9ca3af' : pCa >= 95 ? '#16a34a' : pCa >= 80 ? '#d97706' : '#dc2626' }}>
                                      {pCa != null ? `${pCa}%` : '—'}
                                    </td>
                                    <td style={{ padding: '3px 5px', width: 90, textAlign: 'right', color: tt > 0 ? '#dc2626' : '#6b7280', fontWeight: tt > 0 ? 600 : 400 }}>
                                      {tt != null ? Number(tt).toLocaleString('vi-VN') : '—'}
                                    </td>
                                    <td style={{ padding: '3px 5px' }}>
                                      <select value={row.nguyenNhan || ''} style={{ width: '100%', border: '1px solid #fde68a', borderRadius: 5, padding: '3px 5px', fontSize: 11, color: lossColors[row.nguyenNhan] || '#6b7280' }}
                                        onChange={e => updateShiftPerfRow(k, row._id, { nguyenNhan: e.target.value || null })}>
                                        {LOSS_TYPES.map(o => <option key={o} value={o === '— Chọn loại tổn thất —' ? '' : o}>{o}</option>)}
                                      </select>
                                    </td>
                                    <td style={{ padding: '3px 5px', width: 28, textAlign: 'center' }}>
                                      <button onClick={() => removeShiftPerfRow(k, row._id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                        <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => addShiftPerfRow(k)} style={{ marginTop: 8, fontSize: 11, color: '#92400e', borderColor: '#fde68a' }}>
                          + Thêm dòng
                        </Button>
                        {/* Summary */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginTop: 12 }}>
                          {[
                            { label: 'SL lý thuyết tổng', val: sumLT > 0 ? Number(sumLT).toLocaleString('vi-VN') + ' SP' : '— SP', color: '#1e3a5f' },
                            { label: 'SL thực tế tổng', val: sumTT > 0 ? Number(sumTT).toLocaleString('vi-VN') + ' SP' : '— SP', color: '#16a34a' },
                            { label: 'Tổng tổn thất (SP)', val: sumLT > 0 ? Number(tonThat).toLocaleString('vi-VN') + ' SP' : '— SP', color: '#dc2626' },
                            { label: 'P ngày (%)', val: pPct != null ? `${pPct}%` : '—', color: pColor },
                            { label: 'Đánh giá', val: pPct == null ? '—' : pPct >= 95 ? '✓ Đạt' : pPct >= 80 ? '△ Cần cải thiện' : '✗ Chưa đạt', color: pColor },
                          ].map(({ label, val, color }) => (
                            <div key={label} style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 8, padding: '7px 10px' }}>
                              <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginBottom: 2 }}>{label}</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color, fontFamily: 'monospace' }}>{val}</div>
                            </div>
                          ))}
                        </div>
                        {/* 3 loss boxes */}
                        {spEntries.length > 0 && (() => {
                          const byType = { 'Giảm tốc độ': 0, 'Dừng nhỏ / Ngắt quãng': 0, 'Nhân công / Điều chỉnh': 0 }
                          spEntries.forEach(e => {
                            const tt = (e.slLyThuyet || 0) - (e.slThucTe || 0)
                            if (tt > 0 && byType[e.nguyenNhan] !== undefined) byType[e.nguyenNhan] += tt
                          })
                          return (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 8 }}>
                              {[
                                { label: 'SP mất do giảm tốc độ', key: 'Giảm tốc độ', icon: '📉', color: '#dc2626' },
                                { label: 'SP mất do dừng nhỏ / ngắt quãng', key: 'Dừng nhỏ / Ngắt quãng', icon: '⏸', color: '#d97706' },
                                { label: 'SP mất do nhân công / điều chỉnh', key: 'Nhân công / Điều chỉnh', icon: '⚡', color: '#7c3aed' },
                              ].map(({ label, key, icon, color }) => (
                                <div key={key} style={{ background: '#fff', border: `1px solid ${color}22`, borderRadius: 8, padding: '8px 12px' }}>
                                  <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, marginBottom: 3 }}>{icon} {label}</div>
                                  <div style={{ fontSize: 15, fontWeight: 700, color: byType[key] > 0 ? color : '#9ca3af', fontFamily: 'monospace' }}>
                                    {byType[key] > 0 ? Number(byType[key]).toLocaleString('vi-VN') + ' SP' : '— SP'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })()}
                        {/* Save */}
                        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Button type="primary" size="small" loading={isSaving} onClick={() => saveShiftPerf(k)}
                            style={{ background: isDirtyP ? '#d97706' : '#16a34a', borderColor: isDirtyP ? '#d97706' : '#16a34a', fontSize: 12 }}>
                            {isDirtyP ? 'Lưu' : '✓ Đã lưu'}
                          </Button>
                          <Button size="small" danger onClick={() => { setShiftPerfMap(prev => ({ ...prev, [k]: [] })); _spMarkDirty(k) }} style={{ fontSize: 12 }}>
                            Xóa trắng
                          </Button>
                          {!isDirtyP && spEntries.length > 0 && <span style={{ fontSize: 11, color: '#9ca3af' }}>Cập nhật: {spEntries[0]?.updatedAt ? new Date(spEntries[0].updatedAt).toLocaleString('vi-VN') : '—'}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )
        })}

        {canEditDetail && (
          <Button icon={<PlusOutlined />} onClick={addNewDay} type="dashed" block style={{ borderRadius: 12, height: 44, fontSize: 14, fontWeight: 700, color: '#64748b' }}>
            + Thêm ngày
          </Button>
        )}
      </>
    )
  }

  const renderDayTab = (ngayKey) => {
    const detailRows = sessions.filter(s => (s.ngay || 'unknown') === ngayKey)
    const tongCongNgay = detailRows.reduce((a, r) => a + (parseFloat(r.congThucHien) || 0), 0)
    const slVal = daySlMap[ngayKey] ?? ''
    const slNum = parseFloat(slVal) || 0
    const nsNgay = tongCongNgay > 0 && slNum > 0 ? Math.round(slNum / tongCongNgay).toLocaleString('vi-VN') : '—'
    const hasSavedRow = detailRows.some(r => r.id)
    const isInBatchMode = batchEditDays.has(ngayKey)
    const isBatchSaving = batchSaving.has(ngayKey)
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
            <span style={{ fontWeight: 700, color: '#595959' }}>{tongCongNgay ? tongCongNgay.toLocaleString('vi-VN', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : '0.0000'}</span>
          </Space>
          <Space size={6}>
            <span style={{ color: '#595959' }}>Sản lượng ngày:</span>
            {savedSlKeys.has(ngayKey) && slVal !== '' ? (
              <Space size={4}>
                <span style={{ fontWeight: 700, color: '#722ed1', fontFamily: 'monospace', fontSize: 13 }}>
                  {Number(slVal).toLocaleString('vi-VN')}
                </span>
                {canEditDetail && (
                  <Button size="small" icon={<EditOutlined />}
                    style={{ color: '#722ed1', borderColor: '#d3adf7', fontWeight: 600, fontSize: 12 }}
                    onClick={() => {
                      setSlEditOriginal(prev => ({ ...prev, [ngayKey]: slVal }))
                      setSavedSlKeys(prev => { const next = new Set(prev); next.delete(ngayKey); return next })
                    }}>
                    Đổi sản lượng
                  </Button>
                )}
              </Space>
            ) : canEditDetail ? (
              <Space size={4} align="center">
                {slEditOriginal[ngayKey] !== undefined && (
                  <span style={{ color: '#722ed1', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                    {Number(slEditOriginal[ngayKey]).toLocaleString('vi-VN')} →
                  </span>
                )}
                <InputNumber
                  size="small"
                  style={{ width: 110 }}
                  placeholder="Nhập SL..."
                  value={slVal !== '' && slVal != null ? Number(slVal) : undefined}
                  min={0}
                  step={1}
                  formatter={v => v != null && v !== '' ? Number(v).toLocaleString('vi-VN') : ''}
                  parser={v => v ? v.replace(/[^\d]/g, '') : ''}
                  onChange={v => {
                    const str = v != null ? String(v) : ''
                    pendingSlRef.current[ngayKey] = str
                    setDaySlMap(prev => ({ ...prev, [ngayKey]: str }))
                  }}
                  onPressEnter={() => {
                    const cur = pendingSlRef.current[ngayKey] ?? slVal
                    if (cur !== '' && hasSavedRow) saveDaySl(ngayKey, cur || undefined)
                  }}
                  onBlur={() => {
                    const cur = pendingSlRef.current[ngayKey] ?? slVal
                    if (cur !== '' && cur != null && hasSavedRow) saveDaySl(ngayKey, cur || undefined)
                  }}
                />
                <Button size="small" type="primary" loading={savingDay === ngayKey}
                  disabled={slVal === '' || slVal == null || !hasSavedRow}
                  onClick={() => saveDaySl(ngayKey)}>
                  Lưu
                </Button>
                {slEditOriginal[ngayKey] !== undefined && (
                  <Button size="small" danger
                    onClick={() => {
                      setDaySlMap(prev => ({ ...prev, [ngayKey]: slEditOriginal[ngayKey] }))
                      setSavedSlKeys(prev => new Set([...prev, ngayKey]))
                      setSlEditOriginal(prev => { const n = { ...prev }; delete n[ngayKey]; return n })
                    }}>
                    Hủy
                  </Button>
                )}
                {!hasSavedRow && slVal !== '' && (
                  <span style={{ color: '#c61111', fontSize: 12 }}>Cần lưu ít nhất 1 dòng trước</span>
                )}
              </Space>
            ) : (
              <span style={{ color: '#aaa' }}>—</span>
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
                    {sign}{Math.round(delta).toLocaleString('vi-VN')} ({sign}{pct.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%){arrow}
                  </span>
                </span>
              )
            })()}
          </Space>
        </div>
        {(slHistory[ngayKey]?.length > 0) && (
          <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 8, paddingLeft: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600 }}>Lịch sử SL:</span>
            {slHistory[ngayKey].map((h, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {i > 0 && <span style={{ color: '#bbb' }}>→</span>}
                <Tag style={{ margin: 0, fontSize: 11 }} color="purple">
                  {Number(h.value).toLocaleString('vi-VN')}
                </Tag>
                <span style={{ color: '#bbb' }}>
                  {dayjs(h.savedAt).format('HH:mm')}
                </span>
              </span>
            ))}
          </div>
        )}

        <div style={{ overflowX: 'auto', marginBottom: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Người Thực hiện', 'Mã NV', 'Nhóm/tổ', 'Ca SX', 'Thời gian thực hiện', 'Công thực hiện',
                  <span key="vaitro-hdr">Vai Trò{canEditDetail && <SettingOutlined onClick={() => setVaiTroModalOpen(true)} style={{ marginLeft: 5, cursor: 'pointer', color: '#1677ff', fontSize: 11 }} title="Quản lý danh sách vai trò" />}</span>,
                  'Ghi Chú', canEditDetail ? '' : null].filter(h => h !== null).map((h, i) => (
                  <th key={i} style={subHeadStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detailRows.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ ...cellStyle, textAlign: 'center', color: '#aaa', padding: 16 }}>
                    Chưa có dòng nào. Nhấn "+ Thêm dòng".
                  </td>
                </tr>
              )}
              {detailRows.map(s => {
                const key = s.id || s._tempId
                const isSaving = saving === key
                const isEditing = isInBatchMode || editingKeys.has(key)
                const startEdit = () => setEditingKeys(prev => new Set([...prev, key]))
                if (!isEditing) return (
                  <tr key={key} className={!s.id ? 'ws-row-new' : ''} style={{ background: '#fafafa', cursor: canEditDetail ? 'context-menu' : 'default' }}
                    onContextMenu={canEditDetail ? e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, s, ngayKey }) } : undefined}>
                    <td style={{ ...cellStyle, minWidth: 130 }}>{s.nguoiThucHien || <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td style={{ ...cellStyle, width: 90 }}>{s.maNhanVien || <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td style={{ ...cellStyle, minWidth: 100 }}>{s.nhomThucHien || <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td style={{ ...cellStyle, width: 90, textAlign: 'center' }}>
                      {s.caSanXuat
                        ? <Tag color={s.caSanXuat === 'HC' ? 'green' : 'blue'} style={{ marginRight: 0 }}>{s.caSanXuat}</Tag>
                        : <span style={{ color: '#bbb' }}>—</span>}
                    </td>
                    <td style={{ ...cellStyle, width: 90, textAlign: 'right' }}>{s.thoiGianBatDau || <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td style={{ ...cellStyle, width: 110, textAlign: 'right', fontWeight: 600 }}>{(() => { const v = calcCong(s.thoiGianBatDau, s.caSanXuat); return v !== '' ? v : (s.congThucHien != null ? parseFloat(s.congThucHien).toFixed(4) : <span style={{ color: '#bbb' }}>—</span>) })()}</td>
                    <td style={{ ...cellStyle, minWidth: 110 }}>
                      {s.vaiTro
                        ? <Tag color={s.vaiTro === 'Trưởng ca' ? 'gold' : 'geekblue'} style={{ marginRight: 0 }}>{s.vaiTro}</Tag>
                        : <span style={{ color: '#bbb' }}>—</span>}
                    </td>
                    <td style={{ ...cellStyle, minWidth: 150 }}>{s.ghiChu || <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td style={{ ...cellStyle, width: 60, textAlign: 'center' }}>
                      {canEditDetail && (
                        <Button size="small" icon={<EditOutlined />} onClick={startEdit}
                          style={{ fontSize: 11, color: '#1677ff', borderColor: '#91caff' }} />
                      )}
                    </td>
                  </tr>
                )
                return (
                  <tr key={key} className={!s.id ? 'ws-row-new' : ''}
                    onContextMenu={canEditDetail ? e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, s, ngayKey }) } : undefined}>
                    <td style={{ ...cellStyle, minWidth: 150 }}>
                      <select
                        style={{ ...inputStyle, cursor: 'pointer' }}
                        value={s.nguoiThucHien}
                        onChange={e => {
                          const name = e.target.value
                          const allMatches = employees.filter(emp => emp.hoVaTen === name)
                          // Ưu tiên khớp trong nhóm; nếu 1 kết quả duy nhất → auto-fill
                          const groupMatches = s.nhomThucHien
                            ? allMatches.filter(emp => emp.toNhom === s.nhomThucHien)
                            : []
                          const best = groupMatches.length === 1 ? groupMatches[0]
                            : allMatches.length === 1 ? allMatches[0]
                            : null
                          updateLocals(key, {
                            nguoiThucHien: name,
                            maNhanVien: best ? best.maNhanVien : '',
                          })
                        }}
                      >
                        <option value="">-- Chọn nhân viên --</option>
                        {employees
                          .filter(emp => !s.nhomThucHien || emp.toNhom === s.nhomThucHien)
                          .map(emp => (
                            <option key={emp.id} value={emp.hoVaTen}>{emp.hoVaTen}</option>
                          ))
                        }
                      </select>
                    </td>
                    <td style={{ ...cellStyle, width: 100 }}>
                      {(() => {
                        // Ưu tiên khớp trong nhóm → nếu tên duy nhất trong nhóm, không cần dropdown
                        const allByName = s.nguoiThucHien
                          ? employees.filter(emp => emp.hoVaTen === s.nguoiThucHien)
                          : []
                        const groupByName = s.nhomThucHien
                          ? allByName.filter(emp => emp.toNhom === s.nhomThucHien)
                          : []
                        // Dùng group-filtered nếu có; fallback về all nếu group rỗng
                        const matches = groupByName.length > 0 ? groupByName : allByName
                        if (matches.length > 1) {
                          return (
                            <select
                              style={{ ...inputStyle, cursor: 'pointer', color: '#1890ff', fontWeight: 600 }}
                              value={s.maNhanVien}
                              onChange={e => updateLocal(key, 'maNhanVien', e.target.value)}
                            >
                              <option value="">-- Chọn mã --</option>
                              {matches.map(emp => (
                                <option key={emp.id} value={emp.maNhanVien}>{emp.maNhanVien} ({emp.toNhom})</option>
                              ))}
                            </select>
                          )
                        }
                        const hasError = maNvErrorKeys.has(key)
                        return (
                          <>
                            <input
                              style={{
                                ...inputStyle, color: '#1890ff', fontWeight: 600,
                                ...(hasError ? { border: '2px solid #ef4444', background: '#fef2f2' } : {}),
                              }}
                              value={s.maNhanVien}
                              onChange={e => { clearMaNvError(key); updateLocal(key, 'maNhanVien', e.target.value) }}
                              placeholder="Nhập mã NV"
                            />
                            {hasError && (
                              <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2, fontWeight: 600 }}>
                                ⚠ Bắt buộc
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </td>
                    <td style={{ ...cellStyle, minWidth: 110 }}>
                      <select
                        style={{ ...inputStyle, cursor: 'pointer' }}
                        value={s.nhomThucHien}
                        onChange={e => { clearMaNvError(key); updateLocals(key, { nhomThucHien: e.target.value, nguoiThucHien: '', maNhanVien: '' }) }}
                      >
                        <option value="">-- Chọn nhóm --</option>
                        {['PCPL1', 'PCPL2', 'PCPL3', 'BBC1', 'ĐG', 'KT'].map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ ...cellStyle, width: 100 }}>
                      <select
                        style={{ ...inputStyle, cursor: 'pointer', fontWeight: 600, color: s.caSanXuat === 'HC' ? '#389e0d' : s.caSanXuat ? '#1677ff' : undefined }}
                        value={s.caSanXuat}
                        onChange={e => {
                          const ca = e.target.value
                          if (ca !== s.caSanXuat && ca && s.maNhanVien && s.ngay) {
                            caChangedRef.current[key] = { ngay: s.ngay, maNhanVien: s.maNhanVien, newCa: ca }
                          }
                          updateLocals(key, { caSanXuat: ca, congThucHien: calcCong(s.thoiGianBatDau, ca) })
                        }}
                      >
                        <option value="">-- Chọn ca --</option>
                        <option value="Ca 1">Ca 1</option>
                        <option value="Ca 2">Ca 2</option>
                        <option value="HC">Hành Chính</option>
                      </select>
                    </td>
                    <td style={{ ...cellStyle, width: 90 }}>
                      <input style={{ ...inputStyle, textAlign: 'right' }} type="number" step="0.01" min="0"
                        value={s.thoiGianBatDau}
                        onChange={e => {
                          const tg = e.target.value
                          const newCong = calcCong(tg, s.caSanXuat)
                          updateLocals(key, { thoiGianBatDau: tg, congThucHien: newCong })
                        }} />
                    </td>
                    <td style={{ ...cellStyle, width: 110 }}>
                      <input style={{ ...inputStyle, textAlign: 'right' }} type="number" step="0.0001"
                        value={s.congThucHien}
                        onChange={e => updateLocal(key, 'congThucHien', e.target.value)} />
                    </td>
                    <td style={{ ...cellStyle, minWidth: 110 }}>
                      <input
                        list={`vaitro-list-${key}`}
                        style={{ ...inputStyle, border: '1px solid #d9d9d9', borderRadius: 3, padding: '1px 5px', background: '#fff' }}
                        value={s.vaiTro}
                        placeholder="Chọn hoặc nhập..."
                        onChange={e => updateLocal(key, 'vaiTro', e.target.value)}
                      />
                      <datalist id={`vaitro-list-${key}`}>
                        {vaiTroOptions.map(v => <option key={v} value={v} />)}
                      </datalist>
                    </td>
                    <td style={{ ...cellStyle, minWidth: 150 }}>
                      <input style={inputStyle} value={s.ghiChu}
                        onChange={e => updateLocal(key, 'ghiChu', e.target.value)} />
                    </td>
                    <td style={{ ...cellStyle, width: 40, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <Button size="small" type="text" danger icon={<DeleteOutlined />}
                        onClick={() => deleteRow(s)} style={{ padding: '0 4px', color: '#cbd5e1', fontSize: 15 }} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {canEditDetail && (
          isInBatchMode ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                type="primary" icon={<CheckOutlined />} loading={isBatchSaving}
                onClick={() => saveAllForDay(ngayKey)}
                style={{ flex: 1 }}>
                💾 Lưu tất cả
              </Button>
              <Button icon={<PlusOutlined />} onClick={() => addRowToDay(ngayKey)} type="dashed">
                Thêm dòng
              </Button>
              <Button icon={<UsergroupAddOutlined />} type="dashed"
                onClick={() => setMultiAddModal({ open: true, ngayKey, nhom: '', selectedEmps: [], caSX: '', thoiGian: '' })}>
                Nhiều người
              </Button>
              <Button icon={<CloseOutlined />} onClick={() => {
                setSessions(prev => prev.filter(s => (s.ngay || 'unknown') !== ngayKey || s.id))
                setBatchEditDays(prev => { const n = new Set(prev); n.delete(ngayKey); return n })
                setEditingKeys(prev => {
                  const n = new Set(prev)
                  sessions.filter(s => (s.ngay || 'unknown') === ngayKey).forEach(s => n.delete(s.id || s._tempId))
                  return n
                })
              }}>Hủy</Button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              {detailRows.length > 0 && (
                <Button icon={<EditOutlined />} onClick={() => {
                  setBatchEditDays(prev => new Set([...prev, ngayKey]))
                }}>
                  ✏ Cập nhật
                </Button>
              )}
              <Button icon={<PlusOutlined />} onClick={() => addRowToDay(ngayKey)} type="dashed" style={{ flex: 1 }}>
                + Thêm dòng
              </Button>
              <Button icon={<UsergroupAddOutlined />} type="dashed"
                onClick={() => setMultiAddModal({ open: true, ngayKey, nhom: '', selectedEmps: [], caSX: '', thoiGian: '' })}>
                Nhiều người
              </Button>
            </div>
          )
        )}
      </>
    )
  }

  const tabItems = useMemo(() => openTabs.map(key => ({
    key,
    label: key === 'list'
      ? <Space size={4}><EyeOutlined />Chi tiết</Space>
      : (dayjs(key).isValid() ? dayjs(key).format('DD/MM/YYYY') : key),
    closable: key !== 'list',
    children: (
      <>
        {key === 'list' ? renderListTab() : renderDayTab(key)}
      </>
    ),
  })), [openTabs, sessions, daySlMap, savedSlKeys, slEditOriginal, slHistory, pendingDays,
       editingKeys, batchEditDays, batchSaving, saving, savingDay,
       nsTrungBinh, employees, vaiTroOptions, canEditDetail, multiAddModal, maNvErrorKeys,
       tongCong, tongSanLuong, ngayKeys, renamingDay, renameDayVal, renameSaving,
       nonprodEntries, nonprodOpenDays, nonprodAddingAct,
       schedule, contextMenu])

  const handleDrawerClose = () => {
    const hasUnsavedRows = sessions.some(s => !s.id && s._tempId)
    const hasDirtyRows   = dirtyRowKeys.size > 0
    const hasUnsavedSl   = Object.entries(daySlMap).some(([k, v]) => v !== '' && !savedSlKeys.has(k))
    if (isDirty || hasUnsavedRows || hasDirtyRows || hasUnsavedSl) {
      Modal.confirm({
        title: 'Có thay đổi chưa lưu',
        content: isDirty
          ? 'Bạn chưa nhấn "Cập nhật". Thoát sẽ mất các thay đổi vừa nhập.'
          : hasUnsavedSl
            ? 'Có SL ngày chưa được lưu. Thoát sẽ mất dữ liệu sản lượng.'
            : 'Có dòng nhân viên đã chỉnh sửa nhưng chưa nhấn "Cập nhật". Thoát sẽ mất dữ liệu.',
        okText: 'Thoát không lưu',
        okType: 'danger',
        cancelText: 'Quay lại',
        onOk: () => { setIsDirty(false); setDirtyRowKeys(new Set()); onClose() },
      })
    } else {
      onClose()
    }
  }

  return (
    <Drawer
      title={<Space><EyeOutlined /><span>Chi tiết sản xuất — {schedule?.tenTrinh || schedule?.maSp}</span></Space>}
      open={open}
      onClose={handleDrawerClose}
      width="100vw"
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }, wrapper: { transition: 'none' }, mask: { transition: 'none', animationDuration: '0s' } }}
    >
      {/* ── Styles (tách ra ngoài để không bị flex shrink) ── */}
      <style>{`
          .erp-info-form .ant-form-item { margin-bottom: 0 !important; }
          .erp-info-form .ant-form-item-label { display: none !important; }
          .erp-info-form .ant-input, .erp-info-form .ant-input-number-input { font-size: 12px !important; color: #000055 !important; }
          .erp-info-form .ant-select-selector { font-size: 12px !important; }
          .erp-info-form .ant-input-number { width: 100% !important; }
          .erp-info-form .ant-picker { width: 100% !important; font-size: 12px !important; }
          .erp-info-form .ant-picker-input input { color: #000055 !important; }
          .erp-info-form .ant-select-selection-item { color: #000055 !important; }

          /* ── Ô trống: nền #99CCCC, placeholder #669966 ── */
          .erp-info-form input.ant-input:placeholder-shown { background-color: #99CCCC !important; }
          .erp-info-form textarea.ant-input:placeholder-shown { background-color: #99CCCC !important; }
          .erp-info-form .ant-input-affix-wrapper:has(input.ant-input:placeholder-shown) { background-color: #99CCCC !important; }
          .erp-info-form .ant-picker:has(input:placeholder-shown) { background-color: #99CCCC !important; }
          .erp-info-form .ant-select-selector:has(.ant-select-selection-placeholder) { background-color: #99CCCC !important; }
          .erp-info-form .ant-input::placeholder { color: #669966 !important; opacity: 1 !important; }
          .erp-info-form textarea.ant-input::placeholder { color: #669966 !important; opacity: 1 !important; }
          .erp-info-form .ant-picker-input input::placeholder { color: #669966 !important; opacity: 1 !important; }
          .erp-info-form .ant-select-selection-placeholder { color: #669966 !important; }

          /* ── ERP form scroll cap: tắt trên màn hình nhỏ ── */
          @media (max-height: 750px) {
            .erp-form-scroll-cap { max-height: none !important; overflow-y: visible !important; }
          }

          /* ── Mobile: info form grid collapse ── */
          @media (max-width: 768px) {
            .erp-info-grid { grid-template-columns: 80px 1fr !important; }
            .erp-vc-span   { grid-column: 1 / -1 !important; }
            /* Session table: force minWidth so overflowX:auto kicks in */
            .ws-session-table { min-width: 680px !important; }
            /* Day header: allow wrapping */
            .ws-day-header { flex-wrap: wrap !important; gap: 6px !important; }
            /* Drawer header compact on mobile */
            .ws-drawer-header { padding: 6px 10px !important; gap: 8px !important; }
            .ws-drawer-meta   { display: none !important; }
            .ws-drawer-title  { font-size: 12px !important; }
            /* Bigger tap targets inside session table */
            .ws-session-table select, .ws-session-table input { min-height: 32px !important; font-size: 13px !important; }
            .ws-session-table button { min-height: 32px !important; min-width: 32px !important; }
          }

          /* ── Tabs Chi tiết / ngày ── */
          .ws-detail-tabs .ant-tabs-tab {
            background: #f1f5f9 !important;
            border: 1.5px solid #d1d5db !important;
            border-bottom: none !important;
            margin-right: 3px !important;
            padding: 4px 14px !important;
            transition: all 0.18s;
          }
          .ws-detail-tabs .ant-tabs-tab .ant-tabs-tab-btn {
            color: #475569 !important;
            font-weight: 600;
            font-size: 12px;
          }
          .ws-detail-tabs .ant-tabs-tab:hover {
            background: #dbeafe !important;
            border-color: #93c5fd !important;
          }
          .ws-detail-tabs .ant-tabs-tab:hover .ant-tabs-tab-btn { color: #1D4ED8 !important; }
          .ws-detail-tabs .ant-tabs-tab.ant-tabs-tab-active {
            background: #1D4ED8 !important;
            border-color: #1D4ED8 !important;
          }
          .ws-detail-tabs .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
            color: #ffffff !important;
            text-shadow: 0 1px 2px rgba(0,0,0,0.25);
          }
          .ws-detail-tabs .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-remove { color: rgba(255,255,255,0.85) !important; }
          .ws-detail-tabs .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-remove:hover { color: #ffffff !important; }
          .ws-detail-tabs .ant-tabs-nav::before { border-color: #BFDBFE !important; }
        `}</style>

      {/* ── [1] Gradient header — luôn cố định, không bao giờ cuộn ── */}
      <div className="ws-drawer-header" style={{ flexShrink: 0, background: '#006666', padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>⚙️</span>
        <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'nowrap', overflow: 'hidden' }}>
          <span className="ws-drawer-title" style={{ color: '#fff', fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1 }}>
            {schedule?.tenTrinh || schedule?.maSp || 'Chi tiết sản xuất'}
          </span>
          <div className="ws-drawer-meta" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, display: 'flex', gap: 14, flexShrink: 0, whiteSpace: 'nowrap' }}>
            {schedule?.maSp      && <span>SP: <b style={{ color: '#fff' }}>{schedule.maSp}</b></span>}
            {schedule?.soLo      && <span>Lô: <b style={{ color: '#fff' }}>{schedule.soLo}</b></span>}
            {schedule?.congDoan  && <span>Công đoạn: <b style={{ color: '#fff' }}>{schedule.congDoan}</b></span>}
            {schedule?.ngayThucHien && <span>Ngày: <b style={{ color: '#fff' }}>{dayjs(schedule.ngayThucHien).format('DD/MM/YYYY')}</b></span>}
          </div>
        </div>
        {isInfoEditing ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="small"
              onClick={() => { setIsInfoEditing(false); setIsDirty(false); setLookupStatus(null); infoForm.setFieldsValue({ ...schedule, ngayThucHien: schedule?.ngayThucHien ? dayjs(schedule.ngayThucHien) : null }) }}
              style={{ fontWeight: 600, fontSize: 11, background: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.6)', color: '#fff', borderRadius: 6, height: 32 }}>
              Hủy
            </Button>
            <Button type="primary" loading={infoSaving} onClick={saveInfo}
              style={{ flexShrink: 0, background: '#006666', borderColor: '#006666', fontWeight: 700, height: 32, minWidth: 110, fontSize: 12, borderRadius: 6,
                ...(isDirty ? { boxShadow: '0 0 0 3px rgba(0,102,102,0.5)' } : {}) }}>
              Cập nhật
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {sessions.some(s => s.id) && (
              <Tooltip title={khToExists ? 'Đã đẩy lên Kế Hoạch Tổ — nhấn để đồng bộ lại' : '⚠ Chưa đẩy lên Kế Hoạch Tổ — nhấn để đẩy ngay'}>
                <Button
                  size="small" icon={<SyncOutlined />}
                  loading={syncToKhLoading}
                  onClick={handleSyncScheduleToKhTo}
                  style={{ fontSize: 12, borderRadius: 6, fontWeight: 600, color: '#fff', border: '1px solid',
                    ...(khToExists
                      ? { background: '#52c41a', borderColor: '#389e0d' }
                      : { background: '#f97316', borderColor: '#ea580c', boxShadow: '0 0 0 2px #fed7aa' }) }}>
                  {khToExists ? '✓ KH Tổ' : '⚠ Đẩy KH Tổ'}
                </Button>
              </Tooltip>
            )}
            {canEditDetail && (
              <Button onClick={async () => {
                if (tongSanLuong > 0 || sessions.length > 0) {
                  await syncSl(tongSanLuong)
                  await syncCong(sessions)
                }
                setIsInfoEditing(true)
              }}
                style={{ flexShrink: 0, background: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.6)', fontWeight: 700, height: 36, minWidth: 130, fontSize: 12, borderRadius: 6, color: '#fff' }}>
                Cập nhật
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── [2] ERP Info form — giới hạn chiều cao, cuộn nội bộ nếu quá dài ── */}
      <div className="erp-form-scroll-cap" style={{ flexShrink: 0, maxHeight: 230, overflowY: 'auto', borderBottom: '2px solid #e2e8f0', background: '#fff' }}>
        <Form form={infoForm} layout="vertical" className="erp-info-form" onValuesChange={() => { if (isInfoEditing) setIsDirty(true) }}>
          {(() => {
            const LC = ({ children, accent }) => (
              <div style={{
                padding: '6px 10px', background: '#f1f5f9',
                fontWeight: 700, fontSize: 11, color: accent || '#64748b',
                borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', gap: 4,
                textTransform: 'uppercase', letterSpacing: 0.4,
              }}>{children}</div>
            )
            const VC = ({ children, style: s = {}, span }) => (
              <div className={span ? 'erp-vc-span' : undefined} style={{
                padding: '4px 8px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center',
                ...(span ? { gridColumn: `span ${span}` } : {}),
                ...s,
              }}>{children}</div>
            )
            return (
              <div style={{ padding: '10px 16px 10px', background: '#fff' }}>
                <div className="erp-info-grid" style={{ display: 'grid', gridTemplateColumns: '110px 1fr 110px 1fr 110px 1fr 110px 1fr', border: '1px solid #e2e8f0', borderRadius: 7, overflow: 'hidden' }}>

                  {/* Row 1 — Product IDs + Cỡ Lô */}
                  <LC accent="#1677ff">🔷 Mã Bravo{isInfoEditing && <span style={{ marginLeft: 2 }}>{infoLookupIcon()}</span>}</LC>
                  <VC>
                    <Form.Item name="maBravo" noStyle>
                      <Input size="small" onBlur={handleInfoMaBravoBlur} allowClear disabled={!isInfoEditing}
                        style={{ fontWeight: 700, color: '#1677ff', fontFamily: 'monospace', width: '100%' }} />
                    </Form.Item>
                  </VC>
                  <LC accent="#607080">🔹 Mã SP</LC>
                  <VC>
                    <Form.Item name="maSp" noStyle>
                      <Input size="small" onBlur={handleInfoMaSpBlur} allowClear disabled={!isInfoEditing} style={{ fontWeight: 600, color: '#607080', width: '100%' }} />
                    </Form.Item>
                  </VC>
                  <LC accent="#d46b08">🏷 Số Lô</LC>
                  <VC>
                    <Form.Item name="soLo" noStyle>
                      <Input size="small" disabled={!isInfoEditing} style={{ fontFamily: 'monospace', fontWeight: 700, color: '#d46b08', width: '100%' }} />
                    </Form.Item>
                  </VC>
                  <LC accent="#f97316">📦 Cỡ Lô</LC>
                  <VC style={{ borderRight: 'none' }}>
                    <Form.Item name="coLo" noStyle>
                      <InputNumber size="small" min={0} step={1} disabled={!isInfoEditing}
                        formatter={v => v ? Number(v).toLocaleString('vi-VN') : ''}
                        parser={v => v ? v.replace(/[^\d]/g, '') : 0}
                        style={{ width: '100%', fontWeight: 700 }} />
                    </Form.Item>
                  </VC>

                  {/* Row 2 — Tiến trình + Mã ĐH */}
                  <LC>📝 Tiến Trình</LC>
                  <VC span={5}>
                    <Form.Item name="tenTrinh" noStyle>
                      <Input size="small" disabled={!isInfoEditing} style={{ width: '100%', fontSize: 12 }} />
                    </Form.Item>
                  </VC>
                  <LC accent="#7c3aed">📄 Mã ĐH</LC>
                  <VC style={{ borderRight: 'none' }}>
                    <Form.Item name="maDonHang" noStyle>
                      <Input size="small" disabled={!isInfoEditing} placeholder="Mã đơn hàng"
                        style={{ fontFamily: 'monospace', fontWeight: 600, color: '#7c3aed', width: '100%' }} />
                    </Form.Item>
                  </VC>

                  {/* Row 3 — Schedule info */}
                  <LC>📅 Ngày TH</LC>
                  <VC>
                    <Form.Item name="ngayThucHien" noStyle rules={[{ required: true }]}>
                      <DatePicker size="small" format="DD/MM/YYYY" disabled={!isInfoEditing} style={{ width: '100%' }} />
                    </Form.Item>
                  </VC>
                  <LC>🔘 Tình Trạng</LC>
                  <VC>
                    <Form.Item name="tinhTrang" noStyle>
                      <Select size="small" allowClear placeholder="Chọn" disabled={!isInfoEditing} style={{ width: '100%' }}>
                        {TINH_TRANG_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                      </Select>
                    </Form.Item>
                  </VC>
                  <LC accent="#607080">👥 Tổ / Nhóm</LC>
                  <VC>
                    <Form.Item name="toNhom" noStyle>
                      {TO_NHOM_OPTIONS[schedule?.congDoan]
                        ? <Select size="small" allowClear placeholder="Chọn nhóm" disabled={!isInfoEditing} style={{ width: '100%' }}>
                            {TO_NHOM_OPTIONS[schedule?.congDoan].map(o => <Option key={o} value={o}>{o}</Option>)}
                          </Select>
                        : <Input size="small" placeholder="Nhập nhóm" disabled={!isInfoEditing} style={{ width: '100%' }} />}
                    </Form.Item>
                    {isInfoEditing && pcplFromProduct && ['PCPL1', 'PCPL2'].includes(watchedToNhom) && watchedToNhom !== pcplFromProduct && (
                      <div style={{ color: '#d46b08', fontSize: 11, marginTop: 2 }}>
                        ⚠️ Sản phẩm quy định tổ <strong>{pcplFromProduct}</strong>
                      </div>
                    )}
                  </VC>
                  <LC>⚙️ Máy Thực Hiện</LC>
                  <VC>
                    <Form.Item name="phongThucHien" noStyle>
                      <PhongThucHienSelect size="small" disabled={!isInfoEditing} style={{ width: '100%' }} placeholder="VD: Pha chế 06" />
                    </Form.Item>
                  </VC>
                  <LC>🏢 Phòng SX</LC>
                  <VC style={{ borderRight: 'none' }}>
                    <Form.Item name="phongSanXuat" noStyle>
                      <PhongSanXuatSelect size="small" disabled={!isInfoEditing} style={{ width: '100%' }} placeholder="Chọn phòng SX..." />
                    </Form.Item>
                  </VC>

                  {/* Row 4 — Personnel + Notes */}
                  <LC>🙋 Trưởng Ca</LC>
                  <VC>
                    <Form.Item name="truongCa" noStyle>
                      <AutoComplete
                        size="small"
                        placeholder="Họ tên trưởng ca"
                        disabled={!isInfoEditing}
                        style={{ width: '100%' }}
                        options={(watchedToNhom
                          ? employees.filter(e => e.toNhom === watchedToNhom || e.toNhom2 === watchedToNhom)
                          : employees
                        ).map(e => ({ value: e.hoVaTen }))}
                        filterOption={(input, option) =>
                          option.value.toLowerCase().includes(input.toLowerCase())
                        }
                      />
                    </Form.Item>
                  </VC>
                  <LC>👤 Hỗ Trợ</LC>
                  <VC>
                    <Form.Item name="nguoiHoTro" noStyle>
                      <AutoComplete
                        size="small"
                        placeholder="Họ tên (nếu có)"
                        disabled={!isInfoEditing}
                        style={{ width: '100%' }}
                        options={(watchedToNhom
                          ? employees.filter(e => e.toNhom === watchedToNhom || e.toNhom2 === watchedToNhom)
                          : employees
                        ).map(e => ({ value: e.hoVaTen }))}
                        filterOption={(input, option) =>
                          option.value.toLowerCase().includes(input.toLowerCase())
                        }
                      />
                    </Form.Item>
                  </VC>
                  <LC accent="#d97706">⚠ Sai Lệch</LC>
                  <VC>
                    <Form.Item name="saiLech" noStyle>
                      <Input.TextArea size="small" rows={2} disabled={!isInfoEditing} style={{ width: '100%', fontSize: 11, borderColor: '#fbbf24', resize: 'none' }} />
                    </Form.Item>
                  </VC>
                  <LC>💬 Chú Ý</LC>
                  <VC style={{ borderRight: 'none' }}>
                    <Form.Item name="chuY" noStyle>
                      <Input.TextArea size="small" rows={2} disabled={!isInfoEditing} style={{ width: '100%', fontSize: 11, resize: 'none' }} />
                    </Form.Item>
                  </VC>

                  {/* Row 5 — Tổng hợp sản lượng (chỉ đọc) */}
                  <LC accent="#389e0d">📊 Sản Lượng</LC>
                  <VC>
                    <span style={{ fontWeight: 700, color: tongSanLuong ? '#389e0d' : '#aaa', fontFamily: 'monospace', fontSize: 13 }}>
                      {tongSanLuong ? tongSanLuong.toLocaleString('vi-VN') : '—'}
                    </span>
                  </VC>
                  <LC accent="#1677ff">⏱ Tổng Công</LC>
                  <VC>
                    <span style={{ fontWeight: 700, color: tongCong ? '#1677ff' : '#aaa', fontFamily: 'monospace', fontSize: 13 }}>
                      {tongCong ? tongCong.toLocaleString('vi-VN', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : '—'}
                    </span>
                  </VC>
                  <LC accent="#d46b08">⚡ Năng Suất</LC>
                  <VC>
                    {(() => {
                      const ns = tongCong > 0 && slForNs > 0 ? slForNs / tongCong : null
                      return ns != null
                        ? <span style={{ fontWeight: 700, color: '#d46b08', fontFamily: 'monospace', fontSize: 13 }}>{Math.round(ns).toLocaleString('vi-VN')}</span>
                        : <span style={{ color: '#aaa', fontSize: 13 }}>—</span>
                    })()}
                  </VC>
                  <LC accent="#0891b2">🔬 QA Lấy mẫu</LC>
                  <VC span={7} style={{ borderRight: 'none', gap: 12, flexWrap: 'wrap' }}>
                    {[
                      { name: 'qaKiemNghiem', label: 'KN' },
                      { name: 'qaLuuMau',     label: 'Lưu mẫu' },
                      { name: 'qaKhac',       label: 'Khác' },
                    ].map(({ name, label }) => (
                      <span key={name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, color: '#0891b2', fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>
                        <Form.Item name={name} noStyle>
                          <InputNumber size="small" min={0} step={1} disabled={!isInfoEditing}
                            formatter={v => v ? Number(v).toLocaleString('vi-VN') : ''}
                            parser={v => v ? v.replace(/[^\d]/g, '') : 0}
                            style={{ width: 80, fontWeight: 700 }} placeholder="0" />
                        </Form.Item>
                      </span>
                    ))}
                    <span style={{ marginLeft: 8, fontSize: 12, color: '#64748b' }}>
                      Tổng: <b style={{ color: '#0891b2', fontFamily: 'monospace' }}>
                        {computedQaTotal ? computedQaTotal.toLocaleString('vi-VN') : '—'}
                      </b>
                    </span>
                  </VC>

                  {schedule?.congDoan === 'DG' && (
                    <>
                      <LC accent="#15803d">📦 TP NKHO</LC>
                      <VC span={7} style={{ borderRight: 'none' }}>
                        <Form.Item name="tpNhapKho" noStyle>
                          <InputNumber size="small" min={0} step={1} disabled={!isInfoEditing}
                            formatter={v => v ? Number(v).toLocaleString('vi-VN') : ''}
                            parser={v => v ? v.replace(/[^\d]/g, '') : 0}
                            style={{ width: 200, fontWeight: 700, color: '#15803d' }} placeholder="0" />
                        </Form.Item>
                        <span style={{ marginLeft: 8, fontSize: 11, color: '#6b7280' }}>thành phẩm nhập kho</span>
                      </VC>
                    </>
                  )}
                </div>
              </div>
            )
          })()}
        </Form>
      </div>

      {/* ── Header Table (cố định, không cuộn) ── */}
      {/* Gọi là function call thay vì <HeaderTable /> để tránh React unmount/remount DOM khi re-render */}
      <div style={{ flexShrink: 0, padding: '6px 16px 0', borderBottom: '1px solid #e2e8f0', background: '#fafcff' }}>
        {HeaderTable()}
      </div>

      {/* ── BOTTOM 2/3: Sessions tabs ── */}
      <div ref={scrollDivRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
        <Spin spinning={loading} style={{ maxHeight: '100%' }}>
          <Tabs
            className="ws-detail-tabs"
            type="editable-card"
            hideAdd
            activeKey={activeTabKey}
            onChange={setActiveTabKey}
            onEdit={(key, action) => { if (action === 'remove') closeTab(key) }}
            items={tabItems}
            size="small"
            style={{ marginTop: -4 }}
          />
        </Spin>
      </div>

      {/* ── Modal quản lý danh sách Vai Trò ── */}
      <Modal
        title={<Space><SettingOutlined />Quản lý danh sách Vai Trò</Space>}
        open={vaiTroModalOpen}
        onCancel={() => { setVaiTroModalOpen(false); setNewVaiTroInput('') }}
        footer={null}
        width={380}
      >
        <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
          {vaiTroOptions.map((opt, i) => (
            <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag color={opt === 'Trưởng ca' ? 'gold' : opt === 'Phụ máy' ? 'geekblue' : 'default'}
                style={{ flex: 1, margin: 0, padding: '3px 8px', fontSize: 13 }}>{opt}</Tag>
              <Button size="small" danger icon={<DeleteOutlined />}
                onClick={() => saveVaiTroOptions(vaiTroOptions.filter((_, j) => j !== i))} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Input
              value={newVaiTroInput}
              onChange={e => setNewVaiTroInput(e.target.value)}
              placeholder="Nhập vai trò mới..."
              onPressEnter={addVaiTroOption}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={addVaiTroOption}>Thêm</Button>
          </div>
        </Space>
      </Modal>

      {contextMenu && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed', top: contextMenu.y, left: contextMenu.x,
            background: '#fff', border: '1px solid #e8e8e8', borderRadius: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)', zIndex: 9999,
            minWidth: 130, overflow: 'hidden', fontSize: 13,
          }}>
          {!batchEditDays.has(contextMenu.ngayKey) && (
            <div
              style={{ padding: '9px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f0f5ff' }}
              onMouseLeave={e => { e.currentTarget.style.background = '' }}
              onClick={() => {
                setBatchEditDays(prev => new Set([...prev, contextMenu.ngayKey]))
                setContextMenu(null)
              }}>
              <EditOutlined style={{ color: '#1677ff' }} /> Sửa
            </div>
          )}
          <div
            style={{ padding: '9px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: '#cf1322' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fff1f0' }}
            onMouseLeave={e => { e.currentTarget.style.background = '' }}
            onClick={() => { deleteRow(contextMenu.s); setContextMenu(null) }}>
            <DeleteOutlined /> Xóa
          </div>
        </div>
      )}

      {/* ── Modal thêm nhiều người cùng lúc ── */}
      <Modal
        title={<Space><UsergroupAddOutlined />Thêm nhiều người thực hiện</Space>}
        open={multiAddModal.open}
        onOk={confirmMultiAdd}
        onCancel={() => setMultiAddModal({ open: false, ngayKey: null, nhom: '', subNhom: '', selectedEmps: [], caSX: '', thoiGian: '' })}
        okText={`Thêm ${multiAddModal.selectedEmps.length || ''} người`.trim()}
        okButtonProps={{ disabled: !multiAddModal.selectedEmps.length }}
        width={480}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Nhóm/Tổ */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Nhóm / Tổ</div>
            <select
              style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }}
              value={multiAddModal.nhom}
              onChange={e => setMultiAddModal(prev => ({ ...prev, nhom: e.target.value, subNhom: '', selectedEmps: [] }))}
            >
              <option value="">-- Chọn nhóm --</option>
              {['PCPL1', 'PCPL2', 'PCPL3', 'BBC1', 'ĐG'].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Sub-nhóm cho ĐG */}
          {multiAddModal.nhom === 'ĐG' && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Nhóm <span style={{ color: '#999', fontWeight: 400 }}>(tùy chọn)</span></div>
              <select
                style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }}
                value={multiAddModal.subNhom}
                onChange={e => setMultiAddModal(prev => ({ ...prev, subNhom: e.target.value, selectedEmps: [] }))}
              >
                <option value="">-- Tất cả --</option>
                <option value="Tâm Kem">Tâm Kem</option>
                <option value="Loan Đào">Loan Đào</option>
              </select>
            </div>
          )}

          {/* Danh sách nhân viên trong nhóm */}
          {multiAddModal.nhom && (() => {
            const empList = employees.filter(e =>
              e.toNhom === multiAddModal.nhom &&
              (!multiAddModal.subNhom || e.nhom === multiAddModal.subNhom)
            )
            if (!empList.length) return <div style={{ color: '#999', fontSize: 13 }}>Không có nhân viên trong nhóm này.</div>
            const allSelected = empList.every(e => multiAddModal.selectedEmps.some(s => s.id === e.id))
            return (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600 }}>Chọn nhân viên ({empList.length} người)</span>
                  <span
                    style={{ fontSize: 12, color: '#1677ff', cursor: 'pointer' }}
                    onClick={() => setMultiAddModal(prev => ({
                      ...prev,
                      selectedEmps: allSelected ? [] : [...empList],
                    }))}
                  >
                    {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 6, padding: '8px 10px' }}>
                  {empList.map(emp => {
                    const checked = multiAddModal.selectedEmps.some(s => s.id === emp.id)
                    return (
                      <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                        <input type="checkbox" checked={checked} onChange={() => {
                          setMultiAddModal(prev => ({
                            ...prev,
                            selectedEmps: checked
                              ? prev.selectedEmps.filter(s => s.id !== emp.id)
                              : [...prev.selectedEmps, emp],
                          }))
                        }} />
                        <span style={{ fontWeight: 600 }}>{emp.hoVaTen}</span>
                        <span style={{ color: '#999', fontSize: 12 }}>{emp.maNhanVien}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Ca SX + Thời gian (tùy chọn) */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Ca SX <span style={{ color: '#999', fontWeight: 400 }}>(tùy chọn)</span></div>
              <select
                style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }}
                value={multiAddModal.caSX}
                onChange={e => setMultiAddModal(prev => ({ ...prev, caSX: e.target.value }))}
              >
                <option value="">-- Chọn ca --</option>
                <option value="Ca 1">Ca 1</option>
                <option value="Ca 2">Ca 2</option>
                <option value="HC">Hành Chính</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Thời gian (giờ) <span style={{ color: '#999', fontWeight: 400 }}>(tùy chọn)</span></div>
              <input
                type="number" step="0.5" min="0"
                style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14, boxSizing: 'border-box' }}
                value={multiAddModal.thoiGian}
                placeholder="vd: 8"
                onChange={e => setMultiAddModal(prev => ({ ...prev, thoiGian: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </Modal>
    </Drawer>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function WorkScheduleModal({ open, editItem, congDoan, defaultToNhom, extraFormFields = [], onClose, onSaved }) {
  const [form] = Form.useForm()
  const watchedToNhomModal = Form.useWatch('toNhom', form)
  const [lookupStatus, setLookupStatus] = useState(null)
  const [pcplFromProduct, setPcplFromProduct] = useState(null)
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
        if (defaultToNhom) form.setFieldValue('toNhom', defaultToNhom)
        setLookupStatus(null)
        setPcplFromProduct(null)
      }
    }
  }, [open, editItem])

  // Primary: auto-fill Mã SP + Tiến trình khi nhập Mã Bravo
  const handleMaBravoChange = (e) => {
    const val = e.target.value?.trim()
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!val) { setLookupStatus(null); return }
    setLookupStatus('loading')
    timerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/product-master/lookup-by-bravo/${encodeURIComponent(val)}`)
        form.setFieldsValue({ maSp: data.maTp, tenTrinh: data.tienTrinh })
        setPcplFromProduct(data.toNhomPcpl || null)
        setLookupStatus('found')
      } catch {
        setLookupStatus('not_found')
      }
    }, 500)
  }

  // Fallback: auto-fill Tiến trình khi nhập Mã SP
  const handleMaSpChange = (e) => {
    const val = e.target.value?.trim()
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!val) { setLookupStatus(null); return }
    setLookupStatus('loading')
    timerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/product-master/lookup/${encodeURIComponent(val)}`)
        form.setFieldsValue({ tenTrinh: data.tienTrinh })
        setPcplFromProduct(data.toNhomPcpl || null)
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
        await api.put(`/work-schedule/${editItem.id}`, {
          maDonHang: editItem.maDonHang ?? null,
          maBravo:   editItem.maBravo   ?? null,
          ...payload,
        })
        message.success('Cập nhật thành công')
      } else {
        if (payload.maSp) {
          const params = { page: 0, size: 10, congDoan, source: 'SCHEDULE', maSp: payload.maSp }
          if (payload.soLo) params.soLo = payload.soLo
          const { data: existing } = await api.get('/work-schedule', { params })
          const isDuplicate = existing.content?.some(r =>
            r.maSp === payload.maSp &&
            (r.soLo || '') === (payload.soLo || '') &&
            (r.tenTrinh || '').trim() === (payload.tenTrinh || '').trim()
          )
          if (isDuplicate) {
            message.warning('Bản ghi đã tồn tại với Mã SP, Tiến trình và Số Lô này!')
            return
          }
        }
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
      destroyOnHidden
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
            <Form.Item label={<Space size={4}><span>Mã Bravo</span>{lookupIcon()}</Space>} name="maBravo">
              <Input onChange={handleMaBravoChange} placeholder="Nhập để tự điền Mã SP và tiến trình" allowClear />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Form.Item label="Mã SP" name="maSp">
              <Input onChange={handleMaSpChange} placeholder="Tự động điền hoặc nhập tay" allowClear />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Form.Item label="Mã ĐH" name="maDonHang">
              <Input placeholder="Mã đơn hàng" allowClear />
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
            {!['PCPL1', 'PCPL2'].includes(congDoan) && (
              <Form.Item
                label="Tổ/ Nhóm thực hiện"
                name="toNhom"
              >
                {TO_NHOM_OPTIONS[congDoan] ? (
                  <Select allowClear placeholder="Chọn tổ/nhóm">
                    {TO_NHOM_OPTIONS[congDoan].map(o => <Option key={o} value={o}>{o}</Option>)}
                  </Select>
                ) : (
                  <Input />
                )}
              </Form.Item>
            )}
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label="Máy thực hiện" name="phongThucHien">
              <PhongThucHienSelect style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label="Phòng sản xuất" name="phongSanXuat">
              <PhongSanXuatSelect style={{ width: '100%' }} />
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

// ── MobileScheduleCard ────────────────────────────────────────────────────────
function MobileScheduleCard({ record, congDoan, nsMap, onClick }) {
  const slField = SL_FIELD_MAP[congDoan]
  const congField = CONG_FIELD_MAP[congDoan]
  const slVal = slField && record[slField] != null ? Number(record[slField]) : null
  const congVal = congField && record[congField] != null ? Number(record[congField]) : null
  const ns = slVal && congVal && congVal > 0 ? Math.round(slVal / congVal) : null
  const avgNs = nsMap[record.maSp]
  const nsColor = avgNs ? (ns > avgNs ? '#389e0d' : '#cf1322') : '#1D4ED8'
  const nsArrow = avgNs ? (ns > avgNs ? ' ▲' : ' ▼') : ''

  const statusColor = record.tinhTrang === 'done' ? '#52c41a' : record.tinhTrang === 'doing' ? '#fa8c16' : '#d9d9d9'
  const statusLabel = record.tinhTrang === 'done' ? 'Done' : record.tinhTrang === 'doing' ? 'Doing' : '—'

  return (
    <div onClick={onClick} style={{
      background: record.saiLech ? '#fffdf5' : '#fff',
      border: `1px solid ${record.saiLech ? '#ffd591' : '#e2e8f5'}`,
      borderLeft: `4px solid ${statusColor}`,
      borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      transition: 'box-shadow 0.15s',
    }}>
      {/* Row 1: Date, Mã SP, Mã Bravo, Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
        {record.ngayThucHien && (
          <span style={{ fontWeight: 700, color: '#1677ff', fontSize: 13, minWidth: 48 }}>
            {dayjs(record.ngayThucHien).format('DD/MM')}
            <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 400 }}>/{dayjs(record.ngayThucHien).format('YY')}</span>
          </span>
        )}
        {record.maSp && <Tag color="blue" style={{ marginRight: 0, fontWeight: 700, fontSize: 11 }}>{record.maSp}</Tag>}
        {record.maBravo && (
          <Tag style={{ marginRight: 0, fontFamily: 'monospace', fontSize: 10, color: '#374151', borderColor: '#bfdbfe', background: '#eff6ff' }}>
            {record.maBravo}
          </Tag>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: statusColor }}>
          ● {statusLabel}
        </span>
      </div>

      {/* Row 2: Tiến trình */}
      {record.tenTrinh && (
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 6, lineHeight: 1.4 }}>
          {record.tenTrinh}
        </div>
      )}

      {/* Row 3: meta info chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12, alignItems: 'center' }}>
        {record.soLo && (
          <span style={{ color: '#595959', fontFamily: 'monospace' }}>
            Lô: <strong>{record.soLo}</strong>
          </span>
        )}
        {record.toNhom && (
          <span style={{ color: '#595959' }}>Tổ: <strong style={{ color: '#1677ff' }}>{record.toNhom}</strong></span>
        )}
        {record.maDonHang && (
          <span style={{ color: '#7c3aed', fontFamily: 'monospace', fontWeight: 600 }}>{record.maDonHang}</span>
        )}
        {record.coLo != null && record.coLo !== '' && (
          <span style={{ color: '#8c8c8c' }}>CL: {Number(record.coLo).toLocaleString('vi-VN')}</span>
        )}
        {slVal != null && slVal > 0 && (
          <span style={{ color: '#389e0d', fontWeight: 700 }}>
            SL: {slVal.toLocaleString('vi-VN')}
          </span>
        )}
        {ns != null && (
          <span style={{ color: nsColor, fontWeight: 700 }}>
            NS: {ns.toLocaleString('vi-VN')}{nsArrow}
          </span>
        )}
        {record.truongCa && (
          <span style={{ color: '#8c8c8c' }}>TC: <strong style={{ color: '#374151' }}>{record.truongCa}</strong></span>
        )}
      </div>

      {/* Row 4: Sai lệch warning */}
      {record.saiLech && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#d46b08', background: '#fffbe6', borderRadius: 5, padding: '3px 7px', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
          <WarningOutlined style={{ marginTop: 1, flexShrink: 0 }} />
          <span style={{ wordBreak: 'break-word' }}>{record.saiLech}</span>
        </div>
      )}
    </div>
  )
}

// ── WorkScheduleAnalyticsTab ─────────────────────────────────────────────────
const WS_ANALY_STAGES = [
  { key: 'PCPL1', label: 'PCPL1', slField: 'slPc',   congField: 'congPc',   slColor: '#1D4ED8', congColor: '#60A5FA' },
  { key: 'PCPL2', label: 'PCPL2', slField: 'slPc',   congField: 'congPc',   slColor: '#0369a1', congColor: '#38bdf8' },
  { key: 'PL',    label: 'PL',    slField: 'slPl',   congField: 'congPl',   slColor: '#0e7490', congColor: '#22d3ee' },
  { key: 'DG',    label: 'ĐG',    slField: 'slDg',   congField: 'congDg',   slColor: '#b45309', congColor: '#fbbf24' },
  { key: 'BBC1',  label: 'BBC1',  slField: 'slBbc1', congField: 'congBbc1', slColor: '#6d28d9', congColor: '#c084fc' },
  { key: 'CC',    label: 'CC',    slField: 'slCc',   congField: 'congCc',   slColor: '#9d174d', congColor: '#f472b6' },
]
const WS_CD_COLOR = { PCPL1: 'blue', PCPL2: 'geekblue', PL: 'cyan', DG: 'gold', BBC1: 'purple', CC: 'volcano' }

function WorkScheduleAnalyticsTab() {
  const [raw, setRaw]             = useState([])
  const [loading, setLoading]     = useState(false)
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()])
  const [ttFilter, setTtFilter]   = useState('all')
  const [subTab, setSubTab]       = useState('tonghop')
  const [machineMap, setMachineMap] = useState({})

  const fmtN = v => (v || 0).toLocaleString('vi-VN')
  const fmtC = (v, d = 1) => (v || 0).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d })

  const fetchData = useCallback(async (range = dateRange, tt = ttFilter) => {
    setLoading(true)
    try {
      const base = {
        source: 'SCHEDULE',
        fromDate: range?.[0]?.format('YYYY-MM-DD'),
        toDate:   range?.[1]?.format('YYYY-MM-DD'),
        ...(tt !== 'all' ? { tinhTrang: tt } : {}),
        page: 0, size: 2000,
      }
      const results = await Promise.allSettled(
        WS_ANALY_STAGES.map(s => api.get('/work-schedule', { params: { ...base, congDoan: s.key } }))
      )
      const all = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value.data?.content || [])
      setRaw(all)
      const codes = [...new Set(all.map(r => r.maSp).filter(Boolean))]
      if (codes.length > 0) {
        api.get('/product-master/lookup-batch', { params: { codes } }).then(({ data }) => setMachineMap(data)).catch(() => {})
      }
    } catch { message.error('Không thể tải dữ liệu phân tích') }
    finally { setLoading(false) }
  }, [dateRange, ttFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const stageStats = useMemo(() =>
    WS_ANALY_STAGES.map(s => {
      const recs = raw.filter(r => r.congDoan === s.key)
      const sl   = recs.reduce((sum, r) => sum + (Number(r[s.slField])   || 0), 0)
      const cong = recs.reduce((sum, r) => sum + (Number(r[s.congField]) || 0), 0)
      return {
        ...s, soLo: recs.length, sl, cong,
        done:    recs.filter(r => r.tinhTrang === 'done').length,
        doing:   recs.filter(r => r.tinhTrang === 'doing').length,
        pending: recs.filter(r => !r.tinhTrang).length,
      }
    }).filter(s => s.soLo > 0),
  [raw])

  const grandSL   = stageStats.reduce((s, r) => s + r.sl, 0)
  const grandCong = stageStats.reduce((s, r) => s + r.cong, 0)
  const grandLo   = raw.length

  const timeData = useMemo(() => {
    const map = {}
    raw.forEach(r => {
      const d = r.ngayThucHien; if (!d) return
      if (!map[d]) { map[d] = { date: d }; WS_ANALY_STAGES.forEach(s => { map[d][s.key] = 0 }) }
      if (r.congDoan && map[d][r.congDoan] !== undefined)
        map[d][r.congDoan] += Number(r[SL_FIELD_MAP[r.congDoan]] || 0)
    })
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  }, [raw])

  const top15 = useMemo(() => {
    const map = {}
    raw.forEach(r => {
      const k = r.maSp || '?'
      if (!map[k]) map[k] = { name: k, sl: 0, soLo: 0 }
      map[k].sl += Number(r[SL_FIELD_MAP[r.congDoan]] || 0)
      map[k].soLo++
    })
    return Object.values(map).sort((a, b) => b.sl - a.sl).slice(0, 15).reverse()
  }, [raw])

  const loaiSpData = useMemo(() => {
    const map = {}; let total = 0
    raw.forEach(r => {
      const loai = machineMap[r.maSp]?.loaiSanPham || '(Chưa phân loại)'
      const sl = Number(r[SL_FIELD_MAP[r.congDoan]] || 0)
      if (!map[loai]) map[loai] = { loai, sl: 0, soLo: 0, spSet: new Set() }
      map[loai].sl += sl; map[loai].soLo++; map[loai].spSet.add(r.maSp); total += sl
    })
    return Object.values(map)
      .map(r => ({ ...r, soTp: r.spSet.size, tyLe: total > 0 ? r.sl / total * 100 : 0 }))
      .sort((a, b) => b.sl - a.sl)
  }, [raw, machineMap])

  const QUICK = [
    { label: 'Tuần', range: () => [dayjs().startOf('week'), dayjs()] },
    { label: 'Tháng', range: () => [dayjs().startOf('month'), dayjs()] },
    { label: 'Năm', range: () => [dayjs().startOf('year'), dayjs()] },
  ]

  const subTabItems = [
    {
      key: 'tonghop', label: 'Tổng Hợp',
      children: (
        <div style={{ padding: '12px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {[
              { title: 'Sản lượng theo Công đoạn', dataKey: 'sl', fmtTip: v => [v.toLocaleString('vi-VN'), 'Sản lượng'], colorKey: 'slColor', fmtLabel: fmtN },
              { title: 'Tổng Công theo Công đoạn',  dataKey: 'cong', fmtTip: v => [fmtC(v), 'Tổng Công'], colorKey: 'congColor', fmtLabel: fmtC },
            ].map(({ title, dataKey, fmtTip, colorKey, fmtLabel }) => (
              <div key={dataKey} style={{ background: '#f8f9fa', borderRadius: 6, padding: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 12, color: '#333', fontSize: 13 }}>{title}</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stageStats} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fontWeight: 700 }} />
                    <YAxis tickFormatter={v => v.toLocaleString('vi-VN')} tick={{ fontSize: 11 }} />
                    <RcTooltip formatter={fmtTip} />
                    <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
                      {stageStats.map(s => <Cell key={s.key} fill={s[colorKey]} />)}
                      <LabelList dataKey={dataKey} position="top"
                        formatter={v => v > 0 ? fmtLabel(v) : ''}
                        style={{ fontSize: 10, fill: '#444' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
          <Table size="small" dataSource={stageStats} rowKey="key" pagination={false}
            columns={[
              { title: 'Công đoạn', dataIndex: 'label', width: 90,
                render: (v, r) => <Tag color={WS_CD_COLOR[r.key] || 'default'} style={{ fontWeight: 700 }}>{v}</Tag> },
              { title: 'Số lô', dataIndex: 'soLo', align: 'right', width: 72,
                render: v => <span style={{ color: '#374151' }}>{v}</span> },
              { title: 'Tổng SL', dataIndex: 'sl', align: 'right',
                render: (v, r) => <span style={{ fontWeight: 700, color: r.slColor }}>{fmtN(v)}</span> },
              { title: '% SL', key: 'pct', align: 'right', width: 72,
                render: (_, r) => `${grandSL > 0 ? ((r.sl / grandSL) * 100).toFixed(1) : 0}%` },
              { title: 'Tổng Công', dataIndex: 'cong', align: 'right', width: 100,
                render: (v, r) => <span style={{ color: r.congColor, fontWeight: 600 }}>{fmtC(v)}</span> },
              { title: 'SL/Công', align: 'right', width: 82,
                render: (_, r) => r.cong > 0
                  ? <span style={{ color: '#0e7490', fontWeight: 600 }}>{fmtN(Math.round(r.sl / r.cong))}</span>
                  : <span style={{ color: '#bbb' }}>—</span> },
              { title: 'Done', dataIndex: 'done', align: 'right', width: 60,
                render: v => <span style={{ color: '#52c41a', fontWeight: 600 }}>{v}</span> },
              { title: 'Doing', dataIndex: 'doing', align: 'right', width: 60,
                render: v => v > 0 ? <span style={{ color: '#fa8c16', fontWeight: 600 }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span> },
              { title: 'Chưa SX', dataIndex: 'pending', align: 'right', width: 76,
                render: v => v > 0 ? <span style={{ color: '#888' }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span> },
            ]}
            summary={() => {
              const totDone   = stageStats.reduce((s, r) => s + r.done, 0)
              const totDoing  = stageStats.reduce((s, r) => s + r.doing, 0)
              const totPend   = stageStats.reduce((s, r) => s + r.pending, 0)
              return (
                <Table.Summary.Row style={{ background: '#f0fdf4', fontWeight: 700 }}>
                  <Table.Summary.Cell index={0}>TỔNG</Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">{grandLo}</Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right"><span style={{ color: '#1e5fa3' }}>{fmtN(grandSL)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">100%</Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right"><span style={{ color: '#6d28d9' }}>{fmtC(grandCong)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    {grandCong > 0 ? <span style={{ color: '#0e7490' }}>{fmtN(Math.round(grandSL / grandCong))}</span> : '—'}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="right"><span style={{ color: '#52c41a' }}>{totDone}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="right">
                    {totDoing > 0 ? <span style={{ color: '#fa8c16' }}>{totDoing}</span> : <span style={{ color: '#d9d9d9' }}>—</span>}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={8} align="right">
                    {totPend > 0 ? <span style={{ color: '#888' }}>{totPend}</span> : <span style={{ color: '#d9d9d9' }}>—</span>}
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )
            }}
          />
        </div>
      ),
    },
    {
      key: 'thoigian', label: 'Theo Thời Gian',
      children: (
        <div style={{ padding: '12px 0' }}>
          <div style={{ background: '#f8f9fa', borderRadius: 6, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, color: '#333', fontSize: 13 }}>Sản lượng theo ngày (phân theo công đoạn)</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={timeData} margin={{ top: 10, right: 20, left: 10, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0}
                  tickFormatter={v => dayjs(v).format('DD/MM')} />
                <YAxis tickFormatter={v => v.toLocaleString('vi-VN')} tick={{ fontSize: 11 }} />
                <RcTooltip formatter={(v, name) => [v.toLocaleString('vi-VN'), name]}
                  labelFormatter={v => dayjs(v).format('DD/MM/YYYY')} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {WS_ANALY_STAGES.map(s => (
                  <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.slColor} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Table size="small" dataSource={timeData} rowKey="date"
            pagination={{ pageSize: 14, showSizeChanger: false, showTotal: t => `${t} ngày` }}
            columns={[
              { title: 'Ngày', dataIndex: 'date', width: 110, fixed: 'left',
                render: v => <span style={{ fontWeight: 700, color: '#1677ff' }}>{dayjs(v).format('DD/MM/YYYY')}</span> },
              ...WS_ANALY_STAGES.map(s => ({
                title: s.label, dataIndex: s.key, align: 'right', width: 85,
                render: v => v > 0
                  ? <span style={{ color: s.slColor, fontWeight: 600 }}>{v.toLocaleString('vi-VN')}</span>
                  : <span style={{ color: '#d9d9d9' }}>—</span>,
              })),
              { title: 'Tổng SL', align: 'right', width: 100,
                render: (_, r) => {
                  const t = WS_ANALY_STAGES.reduce((s, st) => s + (r[st.key] || 0), 0)
                  return <strong style={{ color: '#389e0d' }}>{t.toLocaleString('vi-VN')}</strong>
                }},
            ]}
          />
        </div>
      ),
    },
    {
      key: 'top15', label: 'Top 15 SP',
      children: (
        <div style={{ padding: '12px 0' }}>
          <div style={{ background: '#f8f9fa', borderRadius: 6, padding: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, color: '#333', fontSize: 13 }}>Top 15 sản phẩm theo sản lượng</div>
            <ResponsiveContainer width="100%" height={Math.max(300, top15.length * 26)}>
              <BarChart data={top15} layout="vertical" margin={{ top: 5, right: 90, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={v => v.toLocaleString('vi-VN')} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={55} tick={{ fontSize: 11 }} />
                <RcTooltip
                  formatter={(v, _, props) => [v.toLocaleString('vi-VN') + ' sp', `${props.payload.name} (${props.payload.soLo} lô)`]}
                />
                <Bar dataKey="sl" fill="#1677ff" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="sl" position="right"
                    formatter={v => v.toLocaleString('vi-VN')}
                    style={{ fontSize: 11, fill: '#333' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ),
    },
    {
      key: 'loaisp', label: 'Theo Loại SP',
      children: (
        <div style={{ padding: '12px 0' }}>
          <Table size="small" dataSource={loaiSpData} rowKey="loai"
            pagination={{ pageSize: 15, showSizeChanger: false }}
            columns={[
              { title: 'Loại SP', dataIndex: 'loai' },
              { title: 'Số SP', dataIndex: 'soTp', align: 'right', width: 72,
                render: v => <span style={{ color: '#374151' }}>{v}</span> },
              { title: 'Số lô', dataIndex: 'soLo', align: 'right', width: 72 },
              { title: 'Tổng SL', dataIndex: 'sl', align: 'right',
                render: v => <span style={{ fontWeight: 700, color: '#1e5fa3' }}>{fmtN(v)}</span> },
              { title: '% SL', dataIndex: 'tyLe', align: 'right', width: 76,
                render: v => `${v.toFixed(1)}%` },
            ]}
            summary={() => {
              const uniSp = [...new Set(raw.map(r => r.maSp).filter(Boolean))].length
              return (
                <Table.Summary.Row style={{ background: '#f0fdf4', fontWeight: 700 }}>
                  <Table.Summary.Cell index={0}>TỔNG</Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">{uniSp}</Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">{raw.length}</Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right"><span style={{ color: '#1e5fa3' }}>{fmtN(grandSL)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">100%</Table.Summary.Cell>
                </Table.Summary.Row>
              )
            }}
          />
        </div>
      ),
    },
  ]

  return (
    <div style={{ padding: '12px 16px' }}>
      {/* Filter bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap',
        background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', border: '1px solid #e5e7eb',
      }}>
        <RangePicker size="small" value={dateRange} format="DD/MM/YYYY"
          placeholder={['Từ ngày', 'Đến ngày']} onChange={v => setDateRange(v)} />
        <Select size="small" value={ttFilter} style={{ width: 120 }}
          onChange={v => setTtFilter(v)}
          options={[
            { value: 'all',   label: 'Tất cả' },
            { value: 'done',  label: 'Done'   },
            { value: 'doing', label: 'Doing'  },
          ]} />
        <Button size="small" type="primary" icon={<SearchOutlined />} loading={loading}
          onClick={() => fetchData(dateRange, ttFilter)}>
          Truy xuất
        </Button>
        <Button size="small" icon={<ReloadOutlined />} onClick={() => {
          const r = [dayjs().startOf('month'), dayjs()]
          setDateRange(r); setTtFilter('all'); fetchData(r, 'all')
        }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {QUICK.map(q => (
            <Button key={q.label} size="small"
              onClick={() => { const r = q.range(); setDateRange(r); fetchData(r, ttFilter) }}>
              {q.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Số lô SX', value: loading ? '—' : grandLo.toLocaleString('vi-VN'), color: '#374151' },
          { label: 'Tổng sản lượng', value: loading ? '—' : fmtN(grandSL), color: '#1e5fa3' },
          { label: 'Tổng công', value: loading ? '—' : fmtC(grandCong), color: '#6d28d9' },
          { label: 'SL / Công TB', value: loading ? '—' : grandCong > 0 ? fmtN(Math.round(grandSL / grandCong)) : '—', color: '#0e7490' },
        ].map(c => (
          <div key={c.label} style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
            padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          }}>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4,
              textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: c.color, lineHeight: 1.1 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <Spin spinning={loading}>
        <Tabs type="card" size="small" activeKey={subTab} onChange={setSubTab} items={subTabItems} />
      </Spin>
    </div>
  )
}

// ── StageAnalyticsTab ────────────────────────────────────────────────────────
const STAGE_MACHINE_FIELD = { PCPL1: 'mayMocPc', PCPL2: 'mayMocPc', PL: 'mayMocPl', DG: 'mayMocDg', BBC1: 'mayMocBbc1' }

function StageAnalyticsTab({ congDoan }) {
  const cfg      = WS_ANALY_STAGES.find(s => s.key === congDoan) || {}
  const slField  = cfg.slField   || SL_FIELD_MAP[congDoan]   || 'slPc'
  const cfField  = cfg.congField || CONG_FIELD_MAP[congDoan] || 'congPc'
  const mmField  = STAGE_MACHINE_FIELD[congDoan]
  const showMM   = congDoan === 'PCPL2' || congDoan === 'PL'
  const stColor  = cfg.slColor   || '#1677ff'
  const stCColor = cfg.congColor || '#60A5FA'

  const [raw, setRaw]               = useState([])
  const [loading, setLoading]       = useState(false)
  const [dateRange, setDateRange]   = useState([dayjs().startOf('month'), dayjs()])
  const [ttFilter, setTtFilter]     = useState('all')
  const [machineMap, setMachineMap] = useState({})

  const fmtN = v => (v || 0).toLocaleString('vi-VN')
  const fmtC = (v, d = 1) => (v || 0).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d })

  const fetchData = useCallback(async (range = dateRange, tt = ttFilter) => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/work-schedule', {
        params: {
          congDoan, source: 'SCHEDULE', page: 0, size: 2000,
          fromDate: range?.[0]?.format('YYYY-MM-DD'),
          toDate:   range?.[1]?.format('YYYY-MM-DD'),
          ...(tt !== 'all' ? { tinhTrang: tt } : {}),
        },
      })
      const content = res.content || []
      setRaw(content)
      const codes = [...new Set(content.map(r => r.maSp).filter(Boolean))]
      if (codes.length > 0) {
        api.get('/product-master/lookup-batch', { params: { codes } })
          .then(({ data }) => setMachineMap(data)).catch(() => {})
      }
    } catch { message.error('Không thể tải dữ liệu phân tích') }
    finally { setLoading(false) }
  }, [congDoan, dateRange, ttFilter]) // eslint-disable-line

  useEffect(() => { fetchData() }, []) // eslint-disable-line

  // Aggregate by product code
  const productData = useMemo(() => {
    const map = {}
    raw.forEach(r => {
      const k = r.maSp || '?'
      if (!map[k]) map[k] = { maSp: k, tenTrinh: r.tenTrinh, sl: 0, cong: 0, soLo: 0, done: 0, doing: 0, pending: 0, mmSet: new Set() }
      map[k].sl   += Number(r[slField]) || 0
      map[k].cong += Number(r[cfField]) || 0
      map[k].soLo++
      if (r.tinhTrang === 'done')       map[k].done++
      else if (r.tinhTrang === 'doing') map[k].doing++
      else                              map[k].pending++
      const mm = mmField ? machineMap[r.maSp]?.[mmField] : null
      if (mm) map[k].mmSet.add(mm)
    })
    return Object.values(map)
      .map(r => ({ ...r, mayMoc: [...r.mmSet].join(', ') }))
      .sort((a, b) => b.sl - a.sl)
  }, [raw, slField, cfField, mmField, machineMap])

  // Daily time series
  const timeData = useMemo(() => {
    const map = {}
    raw.forEach(r => {
      const d = r.ngayThucHien; if (!d) return
      if (!map[d]) map[d] = { date: d, sl: 0, soLo: 0 }
      map[d].sl   += Number(r[slField]) || 0
      map[d].soLo++
    })
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  }, [raw, slField])

  const grandSL   = productData.reduce((s, r) => s + r.sl, 0)
  const grandCong = productData.reduce((s, r) => s + r.cong, 0)
  const grandLo   = raw.length
  const doneCnt   = raw.filter(r => r.tinhTrang === 'done').length
  const doingCnt  = raw.filter(r => r.tinhTrang === 'doing').length
  const pendCnt   = raw.filter(r => !r.tinhTrang).length

  const QUICK = [
    { label: 'Tuần',  range: () => [dayjs().startOf('week'), dayjs()] },
    { label: 'Tháng', range: () => [dayjs().startOf('month'), dayjs()] },
    { label: 'Năm',   range: () => [dayjs().startOf('year'), dayjs()] },
  ]

  const mmColSpan = showMM ? 1 : 0
  const summaryIdxOffset = showMM ? 1 : 0

  return (
    <div style={{ padding: '14px 16px' }}>
      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap',
        background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', border: '1px solid #e5e7eb' }}>
        <RangePicker size="small" value={dateRange} format="DD/MM/YYYY"
          placeholder={['Từ ngày', 'Đến ngày']} onChange={v => setDateRange(v)} />
        <Select size="small" value={ttFilter} style={{ width: 120 }} onChange={v => setTtFilter(v)}
          options={[
            { value: 'all',   label: 'Tất cả' },
            { value: 'done',  label: 'Done'   },
            { value: 'doing', label: 'Doing'  },
          ]} />
        <Button size="small" type="primary" icon={<SearchOutlined />} loading={loading}
          onClick={() => fetchData(dateRange, ttFilter)}>Truy xuất</Button>
        <Button size="small" icon={<ReloadOutlined />} onClick={() => {
          const r = [dayjs().startOf('month'), dayjs()]
          setDateRange(r); setTtFilter('all'); fetchData(r, 'all')
        }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {QUICK.map(q => (
            <Button key={q.label} size="small"
              onClick={() => { const r = q.range(); setDateRange(r); fetchData(r, ttFilter) }}>
              {q.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Số lô SX',      value: loading ? '—' : grandLo.toLocaleString('vi-VN'), color: '#374151' },
          { label: 'Tổng Sản Lượng', value: loading ? '—' : fmtN(grandSL),   color: stColor  },
          { label: 'Tổng Công',      value: loading ? '—' : fmtC(grandCong),  color: stCColor },
          { label: 'SL / Công TB',   value: loading ? '—' : grandCong > 0 ? fmtN(Math.round(grandSL / grandCong)) : '—', color: '#0e7490' },
          { label: 'Tỷ lệ Done',     value: loading ? '—' : grandLo > 0 ? `${Math.round(doneCnt / grandLo * 100)}%` : '—', color: '#15803d' },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
            padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4,
              textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: c.color, lineHeight: 1.1 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <Spin spinning={loading}>
        {/* Daily SL chart */}
        {timeData.length > 0 && (
          <div style={{ background: '#f8f9fa', borderRadius: 6, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 10, color: '#333', fontSize: 13 }}>Sản lượng theo ngày</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={timeData} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0}
                  tickFormatter={v => dayjs(v).format('DD/MM')} />
                <YAxis tickFormatter={v => v.toLocaleString('vi-VN')} tick={{ fontSize: 11 }} />
                <RcTooltip formatter={v => [v.toLocaleString('vi-VN'), 'Sản lượng']}
                  labelFormatter={v => dayjs(v).format('DD/MM/YYYY')} />
                <Bar dataKey="sl" fill={stColor} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="sl" position="top"
                    formatter={v => v > 0 ? v.toLocaleString('vi-VN') : ''}
                    style={{ fontSize: 10, fill: '#444' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Product table */}
        <Table size="small" dataSource={productData} rowKey="maSp"
          pagination={{ pageSize: 20, showSizeChanger: false, showTotal: t => `${t} sản phẩm` }}
          columns={[
            { title: 'Mã SP', dataIndex: 'maSp', width: 90, fixed: 'left',
              render: v => <Tag color="blue" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{v}</Tag> },
            { title: 'Tên Tiến Trình', dataIndex: 'tenTrinh', ellipsis: true },
            { title: 'Số lô', dataIndex: 'soLo', align: 'right', width: 68,
              render: v => <span style={{ color: '#374151' }}>{v}</span> },
            { title: 'Tổng SL', dataIndex: 'sl', align: 'right', width: 110,
              render: v => <span style={{ fontWeight: 700, color: stColor }}>{fmtN(v)}</span> },
            { title: 'Tổng Công', dataIndex: 'cong', align: 'right', width: 90,
              render: v => <span style={{ color: stCColor, fontWeight: 600 }}>{fmtC(v)}</span> },
            { title: 'SL/Công', align: 'right', width: 85,
              render: (_, r) => r.cong > 0
                ? <span style={{ color: '#0e7490', fontWeight: 600 }}>{fmtN(Math.round(r.sl / r.cong))}</span>
                : <span style={{ color: '#d9d9d9' }}>—</span> },
            ...(showMM ? [{
              title: 'Máy sử dụng', dataIndex: 'mayMoc', ellipsis: true,
              render: v => v
                ? <span style={{ fontSize: 11, color: '#5b21b6' }}>{v}</span>
                : <span style={{ color: '#d9d9d9' }}>—</span>,
            }] : []),
            { title: 'Done', dataIndex: 'done', align: 'right', width: 58,
              render: v => v > 0 ? <span style={{ color: '#52c41a', fontWeight: 700 }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span> },
            { title: 'Doing', dataIndex: 'doing', align: 'right', width: 58,
              render: v => v > 0 ? <span style={{ color: '#fa8c16', fontWeight: 700 }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span> },
            { title: 'Chưa SX', dataIndex: 'pending', align: 'right', width: 72,
              render: v => v > 0 ? <span style={{ color: '#888' }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span> },
          ]}
          summary={() => (
            <Table.Summary.Row style={{ background: '#f0fdf4', fontWeight: 700 }}>
              <Table.Summary.Cell index={0} colSpan={2}>TỔNG</Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">{grandLo}</Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right"><span style={{ color: stColor }}>{fmtN(grandSL)}</span></Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right"><span style={{ color: stCColor }}>{fmtC(grandCong)}</span></Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right">
                {grandCong > 0 ? <span style={{ color: '#0e7490' }}>{fmtN(Math.round(grandSL / grandCong))}</span> : '—'}
              </Table.Summary.Cell>
              {showMM && <Table.Summary.Cell index={6} />}
              <Table.Summary.Cell index={6 + summaryIdxOffset} align="right"><span style={{ color: '#52c41a' }}>{doneCnt}</span></Table.Summary.Cell>
              <Table.Summary.Cell index={7 + summaryIdxOffset} align="right">
                {doingCnt > 0 ? <span style={{ color: '#fa8c16' }}>{doingCnt}</span> : <span style={{ color: '#d9d9d9' }}>—</span>}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={8 + summaryIdxOffset} align="right">
                {pendCnt > 0 ? <span style={{ color: '#888' }}>{pendCnt}</span> : <span style={{ color: '#d9d9d9' }}>—</span>}
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Spin>
    </div>
  )
}

// ── StageSummaryBar ──────────────────────────────────────────────────────────
function StageSummaryBar({ congDoan, liveData }) {
  const slField = SL_FIELD_MAP[congDoan]
  const [weekStats, setWeekStats] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(`ws_sumbar_${congDoan}`) !== '0' } catch { return true }
  })

  useEffect(() => {
    let cancelled = false
    setFetching(true)
    const today = dayjs()
    const dow = today.day() // 0=Sun, 1=Mon, ..., 6=Sat
    const daysToMon = dow === 0 ? 6 : dow - 1
    const monThis = today.subtract(daysToMon, 'day').startOf('day')
    const monPrev = monThis.subtract(7, 'day')
    const sunPrev = monThis.subtract(1, 'day')

    Promise.all([
      api.get('/work-schedule', { params: {
        congDoan, source: 'SCHEDULE', tinhTrang: 'done',
        fromDate: monThis.format('YYYY-MM-DD'),
        toDate:   today.format('YYYY-MM-DD'),
        page: 0, size: 500,
      }}),
      api.get('/work-schedule', { params: {
        congDoan, source: 'SCHEDULE', tinhTrang: 'done',
        fromDate: monPrev.format('YYYY-MM-DD'),
        toDate:   sunPrev.format('YYYY-MM-DD'),
        page: 0, size: 500,
      }}),
    ]).then(([currRes, prevRes]) => {
      if (cancelled) return
      const calc = ({ content = [] }) => ({
        count: content.length,
        sl:    content.reduce((s, r) => s + (slField ? Number(r[slField]) || 0 : 0), 0),
        nk:    content.filter(r => Number(r.tpNhapKho) > 0).length,
      })
      setWeekStats({ curr: calc(currRes.data), prev: calc(prevRes.data) })
    }).catch(() => {
      setWeekStats({ curr: { count: 0, sl: 0, nk: 0 }, prev: { count: 0, sl: 0, nk: 0 } })
    }).finally(() => { if (!cancelled) setFetching(false) })
    return () => { cancelled = true }
  }, [congDoan]) // eslint-disable-line react-hooks/exhaustive-deps

  const doDang  = liveData.filter(r => r.tinhTrang === 'doing').length
  const chuaSX  = liveData.filter(r => !r.tinhTrang).length
  const tangSL  = slField ? liveData.filter(r => Number(r[slField]) > 0).length : 0
  const saiLech = liveData.filter(r => r.saiLech).length

  const toggle = () => {
    const next = !open
    setOpen(next)
    try { localStorage.setItem(`ws_sumbar_${congDoan}`, next ? '1' : '0') } catch {}
  }

  const card = (extra = {}) => ({
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
    padding: '7px 14px', minWidth: 108, textAlign: 'center', ...extra,
  })
  const lbl  = (extra = {}) => ({ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 2, ...extra })
  const big  = (extra = {}) => ({ fontSize: 22, fontWeight: 800, lineHeight: 1.15, ...extra })
  const sub  = { fontSize: 11, color: '#94a3b8', marginTop: 1 }

  return (
    <div style={{ background: '#f8faff', borderBottom: '1.5px solid #dde3f5', padding: open ? '6px 12px 10px' : '5px 12px' }}>
      <div
        onClick={toggle}
        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none', marginBottom: open ? 7 : 0 }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 0.8, textTransform: 'uppercase' }}>Tổng hợp</span>
        <span style={{ fontSize: 10, color: '#9ca3af' }}>{open ? '▴ thu gọn' : '▾ xem'}</span>
      </div>

      {open && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'stretch' }}>

          {/* Tuần trước */}
          <div style={card({ borderColor: '#c7d2fe' })}>
            <div style={lbl()}>Tuần trước</div>
            {fetching ? <Spin size="small" style={{ margin: '6px 0' }} /> : (
              <>
                <div style={big({ color: '#4f46e5' })}>{weekStats?.prev?.count ?? 0} <span style={{ fontSize: 12, fontWeight: 500 }}>lô</span></div>
                <div style={sub}>hoàn thành</div>
                {slField && (weekStats?.prev?.sl ?? 0) > 0 && (
                  <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, marginTop: 2 }}>
                    {(weekStats.prev.sl).toLocaleString('vi-VN')} sp
                  </div>
                )}
              </>
            )}
          </div>

          {/* Tuần này */}
          <div style={card({ borderColor: '#93c5fd', background: '#eff6ff' })}>
            <div style={lbl({ color: '#3b82f6' })}>Tuần này</div>
            {fetching ? <Spin size="small" style={{ margin: '6px 0' }} /> : (
              <>
                <div style={big({ color: '#1d4ed8' })}>{weekStats?.curr?.count ?? 0} <span style={{ fontSize: 12, fontWeight: 500 }}>lô</span></div>
                <div style={sub}>hoàn thành</div>
                {slField && (weekStats?.curr?.sl ?? 0) > 0 && (
                  <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, marginTop: 2 }}>
                    {(weekStats.curr.sl).toLocaleString('vi-VN')} sp
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mới tăng SL */}
          {slField && tangSL > 0 && (
            <div style={card({ borderColor: '#86efac', background: '#f0fdf4' })}>
              <div style={lbl({ color: '#16a34a' })}>Mới tăng SL</div>
              <div style={big({ color: '#15803d' })}>{tangSL} <span style={{ fontSize: 12, fontWeight: 500 }}>lô</span></div>
              <div style={sub}>đã có sản lượng</div>
            </div>
          )}

          {/* Dở dang */}
          <div style={card({ borderColor: doDang > 0 ? '#fcd34d' : '#e2e8f0', background: doDang > 0 ? '#fffbeb' : '#fff' })}>
            <div style={lbl({ color: doDang > 0 ? '#d97706' : '#94a3b8' })}>Dở dang</div>
            <div style={big({ color: doDang > 0 ? '#b45309' : '#94a3b8' })}>{doDang} <span style={{ fontSize: 12, fontWeight: 500 }}>lô</span></div>
            <div style={sub}>đang sản xuất</div>
          </div>

          {/* Chưa SX */}
          <div style={card()}>
            <div style={lbl()}>Chưa SX</div>
            <div style={big({ color: '#475569' })}>{chuaSX} <span style={{ fontSize: 12, fontWeight: 500 }}>lô</span></div>
            <div style={sub}>chờ thực hiện</div>
          </div>

          {/* NK tuần này — DG stage */}
          {congDoan === 'DG' && !fetching && (weekStats?.curr?.nk ?? 0) > 0 && (
            <div style={card({ borderColor: '#6ee7b7', background: '#ecfdf5' })}>
              <div style={lbl({ color: '#059669' })}>NK tuần này</div>
              <div style={big({ color: '#065f46' })}>{weekStats.curr.nk} <span style={{ fontSize: 12, fontWeight: 500 }}>lô</span></div>
              <div style={sub}>thành phẩm nhập kho</div>
            </div>
          )}

          {/* Sai lệch */}
          {saiLech > 0 && (
            <div style={card({ borderColor: '#fca5a5', background: '#fff1f2' })}>
              <div style={lbl({ color: '#dc2626' })}>Sai lệch</div>
              <div style={big({ color: '#dc2626' })}>{saiLech} <span style={{ fontSize: 12, fontWeight: 500 }}>lô</span></div>
              <div style={sub}>cần kiểm tra</div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

// ── StageTab ──────────────────────────────────────────────────────────────────
function StageTab({ congDoan, config, forcedNhom = null, onSaved: parentOnSaved, jumpTarget }) {
  const navigate = useNavigate()
  const { canEditStage, getAllowedNhom, isNhanVien, canDeleteSchedule, user, isAdmin, isAdminKH, isStageAdmin } = useAuth()
  const isAnyAdmin = () => isAdmin() || isAdminKH() || isStageAdmin()
  const allowedNhom = forcedNhom || (congDoan === 'PC' ? getAllowedNhom() : null)
  const AUTO_DEFAULT_NHOM = { DG: 'ĐG', BBC1: 'BBC1' }
  const defaultModalNhom = allowedNhom || AUTO_DEFAULT_NHOM[congDoan] || null
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 1000, total: 0 })
  const paginationRef = useRef({ current: 1, pageSize: 1000 })
  const LS_FILTERS   = `ws_filters_${congDoan}`
  const LS_INNER_TAB = `ws_inner_tab_${congDoan}`
  const LS_DETAIL_ID = `ws_detail_id_${congDoan}`
  const [filters, setFilters] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_FILTERS)
      if (saved) {
        const p = JSON.parse(saved)
        return {
          ...p,
          dateRange: p.dateRange
            ? [dayjs(p.dateRange[0]), dayjs(p.dateRange[1])]
            : null,
        }
      }
    } catch {}
    return { dateRange: null, maSp: '', tenTrinh: '', soLo: '', tinhTrang: '', maBravo: '' }
  })
  const [searchTick, setSearchTick] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [headerOffset, setHeaderOffset] = useState(46)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailSchedule, setDetailSchedule] = useState(null)
  const [highlightId, setHighlightId] = useState(null)
  const [nsMap, setNsMap] = useState({})
  const [loaiSpMap, setLoaiSpMap] = useState({})
  const [updatingTT, setUpdatingTT] = useState({})
  const [innerTab, setInnerTab] = useState(() => {
    try { return localStorage.getItem(LS_INNER_TAB) || 'list' } catch { return 'list' }
  })
  // PL có 3 sub-tabs hiển thị danh sách: list (chưa gán tổ), pl_pcpl1, pl_pcpl3
  const isListLikeTab = innerTab === 'list' || (congDoan === 'PL' && (innerTab === 'pl_pcpl1' || innerTab === 'pl_pcpl3'))
  const [hiddenCount, setHiddenCount] = useState(0)
  const [doneCount, setDoneCount] = useState(0)
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  // ── Không SX state (chỉ ADMIN) ──
  const LS_NONPROD = `nonprod_stage_${congDoan}`
  const [nonprodData, setNonprodData] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`nonprod_stage_${congDoan}`)) || [] } catch { return [] }
  })
  const [npForm, setNpForm] = useState(null) // null=đóng, object=form đang mở
  const [npEmployees, setNpEmployees] = useState([]) // danh sách nhân sự cho tab Không SX
  const saveNpData = (arr) => {
    setNonprodData(arr)
    try { localStorage.setItem(LS_NONPROD, JSON.stringify(arr)) } catch {}
  }
  const jumpApplied    = useRef(false)
  const detailRestored = useRef(false)
  const controlsRef    = useRef(null)

  function openDetailDrawer(record) {
    setDetailSchedule(record)
    setDetailOpen(true)
    try { localStorage.setItem(LS_DETAIL_ID, String(record.id)) } catch {}
  }
  function closeDetailDrawer() {
    setDetailOpen(false)
    try { localStorage.removeItem(LS_DETAIL_ID) } catch {}
  }

  const patchTinhTrang = async (record, newTT) => {
    setUpdatingTT(p => ({ ...p, [record.id]: true }))
    try {
      await api.patch(`/work-schedule/${record.id}/tinh-trang`, { tinhTrang: newTT || null })
      if (newTT === 'done') {
        setData(prev => {
          const next = prev.filter(r => r.id !== record.id)
          // Nếu trang hiện tại trống và không phải trang đầu → quay về trang trước
          setPagination(p => {
            const newTotal = Math.max(0, p.total - 1)
            const maxPage = Math.ceil(newTotal / p.pageSize) || 1
            const newCurrent = p.current > maxPage ? maxPage : p.current
            if (newCurrent !== p.current) {
              paginationRef.current = { ...paginationRef.current, current: newCurrent }
              setTimeout(() => fetchData(newCurrent - 1), 0)
            }
            return { ...p, total: newTotal, current: newCurrent }
          })
          return next
        })
        setDoneCount(c => c + 1)
      } else {
        setData(prev => prev.map(r => r.id === record.id ? { ...r, tinhTrang: newTT || null } : r))
        if (record.tinhTrang === 'done') setDoneCount(c => Math.max(0, c - 1))
      }
      parentOnSaved?.()
    } catch { message.error('Cập nhật tình trạng thất bại') }
    finally { setUpdatingTT(p => { const n = { ...p }; delete n[record.id]; return n }) }
  }

  const parseSoLo = (soLo) => {
    if (!soLo || soLo.length !== 6) return 0
    const yy = soLo.slice(4, 6), mm = soLo.slice(2, 4), dd = soLo.slice(0, 2)
    return parseInt(`${yy}${mm}${dd}`, 10)
  }

  const fetchData = useCallback(async (page = 0, size = 1000, f = filters, { silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const params = {
        page, size, congDoan, source: 'SCHEDULE',
        fromDate: f.dateRange?.[0]?.format('YYYY-MM-DD') || undefined,
        toDate: f.dateRange?.[1]?.format('YYYY-MM-DD') || undefined,
        maSp: f.maSp || undefined,
        tenTrinh: f.tenTrinh || undefined,
        soLo: f.soLo || undefined,
        tinhTrang: f.tinhTrang || undefined,
        toNhom: allowedNhom || undefined,
      }
      const { data: res } = await api.get('/work-schedule', { params })
      // Ẩn records bị gán sai tổ: PCPL1 tab ẩn toNhom=PCPL2, PCPL2 tab ẩn toNhom=PCPL1
      const PCPL_CONFLICT = { PCPL1: 'PCPL2', PCPL2: 'PCPL1' }
      const conflictNhom = PCPL_CONFLICT[congDoan]
      const sorted = [...res.content]
        .filter(r => r.tinhTrang !== 'done')
        .filter(r => !conflictNhom || !r.toNhom || r.toNhom !== conflictNhom)
        .sort((a, b) => parseSoLo(b.soLo) - parseSoLo(a.soLo))
      // Auto-gán toNhom cho tab ĐG/BBC1
      const AUTO_NHOM = { DG: 'ĐG', BBC1: 'BBC1' }
      const autoNhomVal = AUTO_NHOM[congDoan]
      let displayData = sorted
      if (autoNhomVal) {
        const withoutNhom = sorted.filter(r => !r.toNhom?.trim())
        if (withoutNhom.length > 0) {
          displayData = sorted.map(r => !r.toNhom?.trim() ? { ...r, toNhom: autoNhomVal } : r)
          api.patch('/work-schedule/bulk-to-nhom', { ids: withoutNhom.map(r => r.id), toNhom: autoNhomVal }).catch(() => {})
        }
      }
      setData(displayData)
      setPagination(p => {
        const next = { ...p, total: res.totalElements }
        paginationRef.current = { current: next.current, pageSize: next.pageSize }
        return next
      })
      // Fetch NS trung bình: 1 request batch thay vì N request riêng lẻ
      const uniqueMaSp = [...new Set(res.content.map(r => r.maSp).filter(Boolean))]
      if (uniqueMaSp.length > 0) {
        const nsField = NS_LOOKUP_FIELD[congDoan] || 'slTrungBinh'
        api.get('/product-master/lookup-batch', { params: { codes: uniqueMaSp } })
          .then(({ data: batchMap }) => {
            const map = {}
            const loaiMap = {}
            uniqueMaSp.forEach(maSp => {
              const entry = batchMap[maSp]
              const ns = entry?.[nsField] != null ? Number(entry[nsField]) : null
              if (ns != null && ns > 0) map[maSp] = ns
              if (entry?.loaiSanPham) loaiMap[maSp] = entry.loaiSanPham
            })
            setNsMap(map)
            setLoaiSpMap(loaiMap)
          })
          .catch(() => {})
      } else {
        setNsMap({})
      }
    } catch { if (!silent) message.error({ content: 'Không thể tải dữ liệu', key: 'ws-fetch-err', duration: 3 }) }
    finally { if (!silent) setLoading(false) }
  }, [congDoan, filters])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(0) }, [congDoan])

  // ── Chỉ số A (machine runtime summary) ──
  const [machineAData, setMachineAData] = useState([])
  const [machineALoading, setMachineALoading] = useState(false)
  const [machineAVersion, setMachineAVersion] = useState(0)
  const [machineADetailRow, setMachineADetailRow] = useState(null)
  const [machineADetailLogs, setMachineADetailLogs] = useState([])
  const [machineADetailLoading, setMachineADetailLoading] = useState(false)
  const [machineADetailSaving, setMachineADetailSaving] = useState(false)
  const [machineAInnerTab, setMachineAInnerTab] = useState('summary')
  const [machineSummaryData, setMachineSummaryData] = useState([])
  const [machineSummaryLoading, setMachineSummaryLoading] = useState(false)
  const [machineParetoData, setMachineParetoData] = useState([])
  const [machineParetoLoading, setMachineParetoLoading] = useState(false)
  const [summaryCustomRange, setSummaryCustomRange] = useState([dayjs().subtract(29, 'day'), dayjs()])
  const [editingGioKh, setEditingGioKh] = useState(null) // { ngay, tenMay, value }
  const PREDEFINED_REASONS_A = ['Chờ nguyên liệu', 'Hỏng máy', 'Chuyển đổi mã', 'Vệ sinh / bảo trì']

  // ── Chi số P (Performance) ──
  const [machinePData, setMachinePData] = useState([])
  const [machinePLoading, setMachinePLoading] = useState(false)
  const [machinePVersion, setMachinePVersion] = useState(0)
  const [machinePInnerTab, setMachinePInnerTab] = useState('summary')
  const [machinePSummaryData, setMachinePSummaryData] = useState([])
  const [machinePSummaryLoading, setMachinePSummaryLoading] = useState(false)
  const [machinePSpeedConfigs, setMachinePSpeedConfigs] = useState({}) // tenMay → { tocDoChuanLabel, slLyThuyet }
  const [machinePShiftSummaryData, setMachinePShiftSummaryData] = useState([]) // aggregated from MachineShiftPerfLog
  const [machinePSummaryCustomRange, setMachinePSummaryCustomRange] = useState([dayjs().subtract(29, 'day'), dayjs()])
  const [editingPCell, setEditingPCell] = useState(null) // { ngay, tenMay, field, value }
  const [addPerfOpen, setAddPerfOpen] = useState(false)
  const [addPerfForm, setAddPerfForm] = useState({ ngay: dayjs().format('YYYY-MM-DD'), tenMay: '', slThucTe: null, slLyThuyet: null, nguyenNhan: '', ghiChu: '' })
  const [savingPerfRow, setSavingPerfRow] = useState(null) // key "ngay|tenMay"
  const [machinePDetailRow, setMachinePDetailRow] = useState(null)
  const [machinePDetailLogs, setMachinePDetailLogs] = useState([])
  const [machinePDetailLoading, setMachinePDetailLoading] = useState(false)
  const [machinePDetailSaving, setMachinePDetailSaving] = useState(false)
  const PREDEFINED_REASONS_P = ['Điều chỉnh thông số giữa ca', 'Công nhân chưa quen thao tác', 'Chờ nguyên liệu / vật tư', 'Máy chạy dưới tốc độ chuẩn', 'Thay khuôn / dụng cụ', 'Lỗi chất lượng phải làm lại', 'Khác']
  const SHIFT_LOSS_TYPES = ['Giảm tốc độ', 'Dừng nhỏ / Ngắt quãng', 'Nhân công / Điều chỉnh', 'Chất lượng / Làm lại', 'Khác']
  const openMachineADetail = async (row) => {
    setMachineADetailRow(row)
    setMachineADetailLogs([])
    const wsIds = row.workScheduleIds?.length ? row.workScheduleIds : (row.workScheduleId ? [row.workScheduleId] : [])
    if (wsIds.length === 0) return
    setMachineADetailLoading(true)
    try {
      const params = new URLSearchParams({ ngay: row.ngay })
      wsIds.forEach(id => params.append('wsIds', id))
      const { data } = await api.get('/machine-runtime/by-wsids?' + params.toString())
      setMachineADetailLogs(data.map(r => ({ ...r, _id: r.id || Math.random() })))
    } catch { message.error('Không tải được dữ liệu') }
    finally { setMachineADetailLoading(false) }
  }
  const saveGioKh = async (ngay, tenMay, gioKh) => {
    if (!gioKh || gioKh <= 0) return
    try {
      await api.put('/machine-runtime/gio-kh', null, { params: { ngay, tenMay, gioKh } })
      setMachineAData(prev => prev.map(r =>
        r.ngay === ngay && r.tenMay === tenMay
          ? { ...r, gioKH: gioKh, availPct: r.gioChay != null ? Math.round(r.gioChay / gioKh * 1000) / 10 : r.availPct }
          : r
      ))
      setEditingGioKh(null)
    } catch { message.error('Không thể lưu giờ KH') }
  }
  const updateALog = (_id, patch) => setMachineADetailLogs(prev => prev.map(r => r._id === _id ? { ...r, ...patch } : r))
  const removeALog = (_id) => setMachineADetailLogs(prev => prev.filter(r => r._id !== _id))
  const addALog = (wsId) => setMachineADetailLogs(prev => [...prev, { _id: Date.now(), id: null, workScheduleId: wsId, tuGio: '', denGio: '', trangThai: 'Chạy máy', lyDo: '', ghiChu: '' }])
  const saveMachineADetail = async () => {
    if (!machineADetailRow) return
    const wsIds = machineADetailRow.workScheduleIds?.length
      ? machineADetailRow.workScheduleIds
      : (machineADetailRow.workScheduleId ? [machineADetailRow.workScheduleId] : [])
    if (wsIds.length === 0) { message.error('Không có WorkSchedule để lưu'); return }
    const defaultWsId = wsIds[0]
    setMachineADetailSaving(true)
    try {
      // Group logs by workScheduleId (new rows → assign to first wsId)
      const grouped = {}
      for (const log of machineADetailLogs) {
        const wid = log.workScheduleId || defaultWsId
        if (!grouped[wid]) grouped[wid] = []
        grouped[wid].push(log)
      }
      // Save each group; also clear wsIds that have no remaining logs
      for (const wsId of wsIds) {
        const logs = grouped[wsId] || []
        await api.post('/machine-runtime/bulk',
          logs.map(({ tuGio, denGio, trangThai, lyDo, ghiChu, sanPham }) => ({ tuGio, denGio, trangThai, lyDo: lyDo || null, ghiChu: ghiChu || null, sanPham: sanPham || null })),
          { params: { workScheduleId: wsId, ngay: machineADetailRow.ngay } }
        )
      }
      setMachineADetailRow(null)
      setMachineAVersion(v => v + 1)
      message.success('Đã lưu thời gian chạy máy')
    } catch { message.error('Lưu thất bại') }
    finally { setMachineADetailSaving(false) }
  }
  const openMachinePDetail = async (row) => {
    setMachinePDetailRow(row)
    setMachinePDetailLogs([])
    const wsIds = row.workScheduleIds?.length ? row.workScheduleIds : (row.workScheduleId ? [row.workScheduleId] : [])
    if (wsIds.length === 0) return
    setMachinePDetailLoading(true)
    try {
      const params = new URLSearchParams({ ngay: row.ngay })
      wsIds.forEach(id => params.append('wsIds', id))
      const { data } = await api.get('/machine-shift-perf/by-wsids?' + params.toString())
      setMachinePDetailLogs(data.map(r => ({ ...r, _id: r.id || Math.random() })))
    } catch { message.error('Không tải được dữ liệu ca') }
    finally { setMachinePDetailLoading(false) }
  }
  const updatePDetailLog = (_id, patch) => setMachinePDetailLogs(prev => prev.map(r => r._id === _id ? { ...r, ...patch } : r))
  const removePDetailLog = (_id) => setMachinePDetailLogs(prev => prev.filter(r => r._id !== _id))
  const addPDetailLog = (wsId) => setMachinePDetailLogs(prev => [...prev, { _id: Date.now(), id: null, workScheduleId: wsId, caLo: '', slLyThuyet: null, slThucTe: null, nguyenNhan: '', ghiChu: '' }])
  const saveMachinePDetail = async () => {
    if (!machinePDetailRow) return
    const wsIds = machinePDetailRow.workScheduleIds?.length
      ? machinePDetailRow.workScheduleIds
      : (machinePDetailRow.workScheduleId ? [machinePDetailRow.workScheduleId] : [])
    if (wsIds.length === 0) { message.error('Không có WorkSchedule để lưu'); return }
    const defaultWsId = wsIds[0]
    setMachinePDetailSaving(true)
    try {
      const grouped = {}
      for (const log of machinePDetailLogs) {
        const wid = log.workScheduleId || defaultWsId
        if (!grouped[wid]) grouped[wid] = []
        grouped[wid].push(log)
      }
      for (const wsId of wsIds) {
        const logs = grouped[wsId] || []
        await api.post('/machine-shift-perf/bulk',
          logs.map(({ caLo, slLyThuyet, slThucTe, nguyenNhan, ghiChu }) => ({ caLo: caLo || null, slLyThuyet: slLyThuyet ?? null, slThucTe: slThucTe ?? null, nguyenNhan: nguyenNhan || null, ghiChu: ghiChu || null })),
          { params: { workScheduleId: wsId, ngay: machinePDetailRow.ngay } }
        )
      }
      setMachinePDetailRow(null)
      setMachinePVersion(v => v + 1)
      message.success('Đã lưu sản lượng theo ca')
    } catch { message.error('Lưu thất bại') }
    finally { setMachinePDetailSaving(false) }
  }
  useEffect(() => {
    if (innerTab !== 'machine_a') return
    const tuNgay = filters.dateRange?.[0]?.format('YYYY-MM-DD') || dayjs().startOf('month').format('YYYY-MM-DD')
    const denNgay = filters.dateRange?.[1]?.format('YYYY-MM-DD') || dayjs().endOf('month').format('YYYY-MM-DD')
    setMachineALoading(true)
    api.get('/machine-runtime/daily-summary', { params: { congDoanKey: congDoan, tuNgay, denNgay } })
      .then(r => setMachineAData(r.data))
      .catch(() => message.error('Không thể tải dữ liệu chỉ số A'))
      .finally(() => setMachineALoading(false))
  }, [innerTab, filters.dateRange, machineAVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load 6-month summary + pareto khi ở tab Chỉ số A
  useEffect(() => {
    if (innerTab !== 'machine_a') return
    const today = dayjs()
    const tuNgay = today.subtract(179, 'day').format('YYYY-MM-DD')
    const denNgay = today.format('YYYY-MM-DD')
    setMachineSummaryLoading(true)
    setMachineParetoLoading(true)
    api.get('/machine-runtime/daily-summary', { params: { congDoanKey: congDoan, tuNgay, denNgay } })
      .then(r => setMachineSummaryData(r.data))
      .catch(() => {})
      .finally(() => setMachineSummaryLoading(false))
    api.get('/machine-runtime/pareto', { params: { congDoanKey: congDoan, tuNgay, denNgay } })
      .then(r => setMachineParetoData(r.data))
      .catch(() => {})
      .finally(() => setMachineParetoLoading(false))
  }, [innerTab, congDoan, machineAVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load Chi số P theo date range ──
  useEffect(() => {
    if (innerTab !== 'machine_p') return
    const tuNgay = filters.dateRange?.[0]?.format('YYYY-MM-DD') || dayjs().startOf('month').format('YYYY-MM-DD')
    const denNgay = filters.dateRange?.[1]?.format('YYYY-MM-DD') || dayjs().endOf('month').format('YYYY-MM-DD')
    setMachinePLoading(true)
    api.get('/machine-perf/daily-summary', { params: { congDoanKey: congDoan, tuNgay, denNgay } })
      .then(r => setMachinePData(r.data))
      .catch(() => message.error('Không thể tải dữ liệu chỉ số P'))
      .finally(() => setMachinePLoading(false))
  }, [innerTab, filters.dateRange, machinePVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load 6-month summary + speed configs + shift summary cho Chi số P ──
  useEffect(() => {
    if (innerTab !== 'machine_p') return
    const today = dayjs()
    const tuNgay = today.subtract(179, 'day').format('YYYY-MM-DD')
    const denNgay = today.format('YYYY-MM-DD')
    setMachinePSummaryLoading(true)
    Promise.allSettled([
      api.get('/machine-perf/daily-summary', { params: { congDoanKey: congDoan, tuNgay, denNgay } })
        .then(r => setMachinePSummaryData(r.data)),
      // Shift-level summary for correct P formula: Σ(SL_TT×T) / Σ(SL_LT×T)
      api.get('/machine-shift-perf/daily-summary', { params: { congDoanKey: congDoan, tuNgay, denNgay } })
        .then(r => setMachinePShiftSummaryData(r.data)),
      api.get('/machine-perf/speed-configs', { params: { congDoanKey: congDoan } })
        .then(r => {
          const map = {}
          r.data.forEach(c => { map[c.tenMay] = { tocDoChuanLabel: c.tocDoChuanLabel, slLyThuyet: c.slLyThuyet } })
          setMachinePSpeedConfigs(map)
        }),
    ]).finally(() => setMachinePSummaryLoading(false))
  }, [innerTab, congDoan, machinePVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch employees cho tab Không SX khi cần
  useEffect(() => {
    if (innerTab !== 'nonprod' || !isAnyAdmin()) return
    if (npEmployees.length > 0) return
    api.get('/employees', { params: { page: 0, size: 500, excludeTinhTrang: 'tam_nghi' } })
      .then(r => setNpEmployees(r.data?.content || []))
      .catch(() => {})
  }, [innerTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Khôi phục detail drawer sau khi data load lần đầu
  useEffect(() => {
    if (data.length === 0 || detailRestored.current) return
    detailRestored.current = true
    try {
      const savedId = localStorage.getItem(LS_DETAIL_ID)
      if (!savedId) return
      const found = data.find(r => String(r.id) === savedId)
      if (found) { setDetailSchedule(found); setDetailOpen(true) }
    } catch {}
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = () => fetchData(0, paginationRef.current.pageSize)
    window.addEventListener('app:force-refresh', handler)
    return () => window.removeEventListener('app:force-refresh', handler)
  }, [fetchData])

  // Sau khi dữ liệu tải xong, tìm hàng khớp jumpTarget và highlight/scroll
  useEffect(() => {
    if (!jumpTarget || jumpApplied.current || data.length === 0) return
    const tienTrinhTarget = (jumpTarget.tienTrinh || '').trim()
    const match = data.find(r => {
      const tienTrinhMatch = (r.tenTrinh || '').trim() === tienTrinhTarget
      if (!tienTrinhMatch) return false
      if (jumpTarget.soLo) return (r.soLo || '') === jumpTarget.soLo
      if (jumpTarget.maSp) return (r.maSp || '') === jumpTarget.maSp
      return true
    })
    if (match) {
      setHighlightId(match.id)
      jumpApplied.current = true
      setTimeout(() => {
        document.getElementById(`ws-row-${match.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
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
      message.success('Đã chuyển vào thùng rác')
      fetchData(pagination.current - 1)
      parentOnSaved?.()
    } catch { message.error('Xóa thất bại') }
  }

  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkHiding, setBulkHiding] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [bulkNhomVal, setBulkNhomVal] = useState(undefined)
  const [bulkNhomSaving, setBulkNhomSaving] = useState(false)
  const [inlineEdit, setInlineEdit] = useState(null) // { id, field }
  const [inlineSaving, setInlineSaving] = useState(false)

  const handleDeleteAll = async () => {
    const ids = data.map(r => r.id)
    if (ids.length === 0) return
    setBulkDeleting(true)
    try {
      const { data: res } = await api.delete('/work-schedule/bulk', { data: ids })
      message.success(`Đã xóa ${res.deleted} bản ghi`)
      setSelectedRowKeys([])
      fetchData(0)
      parentOnSaved?.()
    } catch { message.error('Xóa thất bại') }
    finally { setBulkDeleting(false) }
  }

  const handleBulkDeleteSelected = async () => {
    if (selectedRowKeys.length === 0) return
    setBulkDeleting(true)
    try {
      const { data: res } = await api.delete('/work-schedule/bulk', { data: selectedRowKeys })
      message.success(`Đã xóa ${res.deleted} bản ghi đã chọn`)
      setSelectedRowKeys([])
      fetchData(0)
      parentOnSaved?.()
    } catch { message.error('Xóa thất bại') }
    finally { setBulkDeleting(false) }
  }

  const handleHide = async (id) => {
    try {
      await api.patch(`/work-schedule/${id}/hidden`, { hidden: true })
      setData(prev => prev.filter(r => r.id !== id))
      setHiddenCount(c => c + 1)
      message.success('Đã ẩn bản ghi — xem trong tab "Đã ẩn"')
      parentOnSaved?.()
    } catch { message.error('Ẩn thất bại') }
  }

  const handleBulkHideSelected = async () => {
    if (selectedRowKeys.length === 0) return
    setBulkHiding(true)
    try {
      const count = await api.post('/work-schedule/bulk-hide', selectedRowKeys)
      message.success(`Đã ẩn ${count.data} bản ghi — xem trong tab "Đã ẩn"`)
      setSelectedRowKeys([])
      setHiddenCount(c => c + selectedRowKeys.length)
      fetchData(0)
      parentOnSaved?.()
    } catch { message.error('Ẩn thất bại') }
    finally { setBulkHiding(false) }
  }

  const handleBulkSetNhom = async () => {
    if (!selectedRowKeys.length) return
    setBulkNhomSaving(true)
    try {
      const { data: count } = await api.patch('/work-schedule/bulk-to-nhom', {
        ids: selectedRowKeys,
        toNhom: bulkNhomVal || null,
      })
      message.success(`Đã gán Tổ/Nhóm TH cho ${count} bản ghi`)
      setSelectedRowKeys([])
      setBulkNhomVal(undefined)
      fetchData(0)
    } catch { message.error('Cập nhật Tổ/Nhóm TH thất bại') }
    finally { setBulkNhomSaving(false) }
  }

  const saveInlineEdit = async (id, field, val) => {
    setInlineSaving(true)
    try {
      if (field === 'toNhom') {
        await api.patch('/work-schedule/bulk-to-nhom', { ids: [id], toNhom: val || null })
      } else if (field === 'phongThucHien') {
        await api.patch(`/work-schedule/${id}/phong-thuc-hien`, { phongThucHien: val || null })
      } else if (field === 'phongSanXuat') {
        await api.patch(`/work-schedule/${id}/phong-san-xuat`, { phongSanXuat: val || null })
      } else if (field === 'qaLayMau') {
        await api.patch(`/work-schedule/${id}/patch-field`, { field: 'qaLayMau', value: val ?? null })
      } else if (field === 'qaKiemNghiem' || field === 'qaLuuMau' || field === 'qaKhac') {
        await api.patch(`/work-schedule/${id}/patch-field`, { field, value: val ?? null })
        setData(prev => prev.map(r => {
          if (r.id !== id) return r
          const updated = { ...r, [field]: val ?? null }
          updated.qaLayMau = (updated.qaKiemNghiem || 0) + (updated.qaLuuMau || 0) + (updated.qaKhac || 0)
          return updated
        }))
        setDetailSchedule(prev => {
          if (prev?.id !== id) return prev
          const updated = { ...prev, [field]: val ?? null }
          updated.qaLayMau = (updated.qaKiemNghiem || 0) + (updated.qaLuuMau || 0) + (updated.qaKhac || 0)
          return updated
        })
        setInlineEdit(null)
        parentOnSaved?.()
        return
      } else if (field === 'tpNhapKho') {
        await api.patch(`/work-schedule/${id}/patch-field`, { field: 'tpNhapKho', value: val ?? null })
      }
      setData(prev => prev.map(r => r.id === id ? { ...r, [field]: val ?? null } : r))
      setDetailSchedule(prev => prev?.id === id ? { ...prev, [field]: val ?? null } : prev)
      setInlineEdit(null)
      parentOnSaved?.()
    } catch {
      message.error('Cập nhật thất bại')
    } finally {
      setInlineSaving(false)
    }
  }

  useEffect(() => {
    if (controlsRef.current) setHeaderOffset(46 + controlsRef.current.offsetHeight + 2)
  })

  useEffect(() => {
    try {
      localStorage.setItem(LS_FILTERS, JSON.stringify({
        ...filters,
        dateRange: filters.dateRange
          ? [filters.dateRange[0].format('YYYY-MM-DD'), filters.dateRange[1].format('YYYY-MM-DD')]
          : null,
      }))
    } catch {}
  }, [filters])

  useEffect(() => {
    try { localStorage.setItem(LS_INNER_TAB, innerTab) } catch {}
  }, [innerTab])

  const onSaved = () => { fetchData(0); parentOnSaved?.() }

  const handleReset = () => {
    const reset = { dateRange: null, maSp: '', tenTrinh: '', soLo: '', tinhTrang: '', maBravo: '' }
    setFilters(reset)
    try { localStorage.removeItem(LS_FILTERS) } catch {}
    if (isListLikeTab) fetchData(0, 20, reset)
    else setSearchTick(t => t + 1)
  }

  const handleSearch = () => {
    if (isListLikeTab) fetchData(0)
    else setSearchTick(t => t + 1)
  }

  const handleQuickDate = (unit) => {
    const s = dayjs().startOf(unit), e = dayjs().endOf(unit)
    setFilters(f => ({ ...f, dateRange: [s, e] }))
    setTimeout(() => {
      if (isListLikeTab) fetchData(0)
      else setSearchTick(t => t + 1)
    }, 0)
  }

  const columns = [
    {
      title: 'STT', key: 'stt', width: 48, fixed: 'left', align: 'center',
      render: (_, __, index) => {
        const pageSize = pagination.pageSize || 1000
        const currentPage = pagination.current || 1
        return <span style={{ color: '#8c8c8c', fontSize: 12 }}>{(currentPage - 1) * pageSize + index + 1}</span>
      },
    },
    {
      title: 'Ngày TH', dataIndex: 'ngayThucHien', key: 'ngayThucHien', width: 95, fixed: 'left',
      sorter: (a, b) => (a.ngayThucHien || '').localeCompare(b.ngayThucHien || ''),
      render: v => v ? (
        <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: '#000011' }}>{dayjs(v).format('DD/MM')}</div>
          <div style={{ color: '#8c8c8c', fontSize: 11 }}>{dayjs(v).format('YYYY')}</div>
        </div>
      ) : '—'
    },
    {
      title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 100, fixed: 'left', align: 'center',
      ...colSearch('maBravo'),
      render: v => v ? <Tag color="blue" style={{ fontWeight: 600, marginRight: 0, fontFamily: 'monospace', color: '#000011' }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Mã SP', dataIndex: 'maSp', key: 'maSp', width: 80, fixed: 'left', align: 'center',
      ...colSearch('maSp'),
      render: v => v ? <span style={{ fontWeight: 600, color: '#000011', fontSize: 12 }}>{v}</span> : '—'
    },
    {
      title: 'Loại SP', key: 'loaiSp', width: 110,
      render: (_, r) => {
        const loai = loaiSpMap[r.maSp]
        return loai ? <Tag color="purple" style={{ marginRight: 0, fontSize: 11 }}>{loai}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span>
      },
    },
    {
      title: 'Tiến trình', dataIndex: 'tenTrinh', key: 'tenTrinh', width: 210, fixed: 'left',
      ...colSearch('tenTrinh'),
      render: (v) => (
        <div style={{ color: '#000011', fontWeight: 500, lineHeight: 1.4, wordBreak: 'break-word' }}>
          {v || '—'}
        </div>
      )
    },
    {
      title: 'Số lô', dataIndex: 'soLo', key: 'soLo', width: 82, fixed: 'left',
      ...colSearch('soLo'),
      render: v => <span style={{ color: '#000011', fontFamily: 'monospace', fontSize: 12 }}>{v || '—'}</span>
    },
    {
      title: 'Mã ĐH', dataIndex: 'maDonHang', key: 'maDonHang', width: 90, align: 'center',
      ...colSearch('maDonHang'),
      render: v => v ? <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>{v}</span>
                     : <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Cỡ lô', dataIndex: 'coLo', key: 'coLo', width: 80, align: 'center',
      sorter: (a, b) => (Number(a.coLo) || 0) - (Number(b.coLo) || 0),
      render: v => (v != null && v !== '') ? <span style={NUM_STYLE}>{Number(v).toLocaleString('vi-VN')}</span> : <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Tổ/Nhóm TH', dataIndex: 'toNhom', key: 'toNhom', width: 120, align: 'center',
      filters: ['PCPL1', 'PCPL2', 'PCPL3', 'BBC1', 'ĐG', 'KT'].map(v => ({ text: v, value: v })),
      filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#fff' : 'rgba(255,255,255,0.7)' }} />,
      onFilter: (value, record) => record.toNhom === value,
      render: (v, record) => {
        const canEdit = canEditStage(congDoan) && (!allowedNhom || !record.toNhom?.trim() || record.toNhom.trim() === allowedNhom)
        const isEditing = inlineEdit?.id === record.id && inlineEdit?.field === 'toNhom'
        if (isEditing) {
          return (
            <Select
              size="small"
              autoFocus
              open
              defaultValue={v || undefined}
              style={{ width: 110 }}
              allowClear
              loading={inlineSaving}
              onClick={e => e.stopPropagation()}
              onChange={val => saveInlineEdit(record.id, 'toNhom', val || null)}
              onBlur={() => { if (!inlineSaving) setInlineEdit(null) }}
              options={(TO_NHOM_OPTIONS[congDoan] || ['PCPL1','PCPL2','PCPL3']).map(o => ({ value: o, label: o }))}
            />
          )
        }
        return (
          <div
            onClick={canEdit ? e => { e.stopPropagation(); setInlineEdit({ id: record.id, field: 'toNhom' }) } : undefined}
            style={{ cursor: canEdit ? 'pointer' : 'default' }}
          >
            {v
              ? <Tag color={NHOM_TAG_COLOR[v] || 'blue'} style={{ marginRight: 0, cursor: canEdit ? 'pointer' : 'default' }}>{v}</Tag>
              : canEdit
                ? <Tag style={{ borderStyle: 'dashed', color: '#aaa', marginRight: 0, cursor: 'pointer' }}>Chọn nhóm</Tag>
                : <span style={{ color: '#d9d9d9' }}>—</span>}
          </div>
        )
      }
    },
    {
      title: 'Máy Thực Hiện', dataIndex: 'phongThucHien', key: 'phongThucHien', width: 120, align: 'center',
      ...colSearch('phongThucHien'),
      render: (v, record) => {
        const canEdit = canEditStage(congDoan)
        const isEditing = inlineEdit?.id === record.id && inlineEdit?.field === 'phongThucHien'
        if (isEditing) {
          return (
            <div onClick={e => e.stopPropagation()}>
              <PhongThucHienSelect
                size="small"
                autoFocus
                open
                defaultValue={v || undefined}
                style={{ width: 120 }}
                allowClear
                onChange={val => saveInlineEdit(record.id, 'phongThucHien', val || null)}
                onBlur={() => { if (!inlineSaving) setInlineEdit(null) }}
              />
            </div>
          )
        }
        return (
          <div
            onClick={canEdit ? e => { e.stopPropagation(); setInlineEdit({ id: record.id, field: 'phongThucHien' }) } : undefined}
            style={{ cursor: canEdit ? 'pointer' : 'default' }}
          >
            {v
              ? <Tag color="cyan" style={{ marginRight: 0, cursor: canEdit ? 'pointer' : 'default' }}>{v}</Tag>
              : canEdit
                ? <Tag style={{ borderStyle: 'dashed', color: '#aaa', marginRight: 0, cursor: 'pointer' }}>Chọn máy</Tag>
                : <span style={{ color: '#d9d9d9' }}>—</span>}
          </div>
        )
      }
    },
    {
      title: 'Phòng SX', dataIndex: 'phongSanXuat', key: 'phongSanXuat', width: 120, align: 'center',
      ...colSearch('phongSanXuat'),
      render: (v, record) => {
        const canEdit = canEditStage(congDoan)
        const isEditing = inlineEdit?.id === record.id && inlineEdit?.field === 'phongSanXuat'
        if (isEditing) {
          return (
            <div onClick={e => e.stopPropagation()}>
              <PhongSanXuatSelect
                size="small"
                autoFocus
                open
                defaultValue={v || undefined}
                style={{ width: 120 }}
                allowClear
                onChange={val => saveInlineEdit(record.id, 'phongSanXuat', val || null)}
                onBlur={() => { if (!inlineSaving) setInlineEdit(null) }}
              />
            </div>
          )
        }
        return (
          <div
            onClick={canEdit ? e => { e.stopPropagation(); setInlineEdit({ id: record.id, field: 'phongSanXuat' }) } : undefined}
            style={{ cursor: canEdit ? 'pointer' : 'default' }}
          >
            {v
              ? <Tag color="geekblue" style={{ marginRight: 0, cursor: canEdit ? 'pointer' : 'default' }}>{v}</Tag>
              : canEdit
                ? <Tag style={{ borderStyle: 'dashed', color: '#aaa', marginRight: 0, cursor: 'pointer' }}>Chọn phòng</Tag>
                : <span style={{ color: '#d9d9d9' }}>—</span>}
          </div>
        )
      }
    },
    {
      title: 'Tình trạng', dataIndex: 'tinhTrang', key: 'tinhTrang', width: 112, align: 'center',
      ...colStatus('tinhTrang'),
      render: (v, record) => {
        const canEdit = canEditStage(congDoan) &&
          (!allowedNhom || !record.toNhom?.trim() || record.toNhom.trim() === allowedNhom)
        if (!canEdit) return tinhTrangTag(v)
        return (
          <Select
            size="small"
            value={v || ''}
            loading={!!updatingTT[record.id]}
            onChange={val => patchTinhTrang(record, val || null)}
            style={{ width: 96 }}
            onClick={e => e.stopPropagation()}
          >
            <Option value="">—</Option>
            <Option value="doing"><span style={{ color: '#fa8c16', fontWeight: 600 }}>● Doing</span></Option>
            <Option value="done"><span style={{ color: '#52c41a', fontWeight: 600 }}>✓ Done</span></Option>
          </Select>
        )
      }
    },
    ...config.extraTableCols,
    {
      title: 'SL Nhập Kho', dataIndex: 'tpNhapKho', key: 'tpNhapKho_top', width: 100, align: 'center',
      hidden: congDoan !== 'DG',
      render: (v, record) => {
        const canEdit = canEditStage(congDoan)
        const isEditing = inlineEdit?.id === record.id && inlineEdit?.field === 'tpNhapKho'
        if (isEditing) {
          return (
            <InputNumber
              size="small" autoFocus min={0} step={1}
              defaultValue={v ?? undefined}
              style={{ width: 80 }}
              formatter={val => (val != null && val !== '') ? Number(val).toLocaleString('vi-VN') : ''}
              parser={val => val ? val.replace(/[^\d]/g, '') : ''}
              onClick={e => e.stopPropagation()}
              onPressEnter={e => {
                const num = e.target.value ? parseInt(e.target.value.replace(/[^\d]/g, ''), 10) : null
                saveInlineEdit(record.id, 'tpNhapKho', isNaN(num) ? null : num)
              }}
              onBlur={e => {
                if (!inlineSaving) {
                  const num = e.target.value ? parseInt(e.target.value.replace(/[^\d]/g, ''), 10) : null
                  saveInlineEdit(record.id, 'tpNhapKho', isNaN(num) ? null : num)
                }
              }}
            />
          )
        }
        return (
          <div
            onClick={canEdit ? e => { e.stopPropagation(); setInlineEdit({ id: record.id, field: 'tpNhapKho' }) } : undefined}
            style={{ cursor: canEdit ? 'pointer' : 'default', textAlign: 'right' }}
          >
            {v != null
              ? <span style={{ fontWeight: 700, color: '#15803d' }}>{Number(v).toLocaleString('vi-VN')}</span>
              : canEdit
                ? <Tag style={{ borderStyle: 'dashed', color: '#aaa', marginRight: 0, cursor: 'pointer' }}>Nhập NK</Tag>
                : <span style={{ color: '#d9d9d9' }}>—</span>}
          </div>
        )
      },
    },
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
              {sign}{Math.round(delta).toLocaleString('vi-VN')} ({sign}{pct.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%){arrow}
            </span>
          </span>
        )
      }
    },
    ...[
      { title: 'KN', fieldKey: 'qaKiemNghiem', label: 'KN' },
      { title: 'Lưu mẫu', fieldKey: 'qaLuuMau', label: 'LM' },
      { title: 'Khác', fieldKey: 'qaKhac', label: 'KH' },
    ].map(({ title, fieldKey, label }) => ({
      title,
      dataIndex: fieldKey,
      key: fieldKey,
      width: 88,
      align: 'center',
      render: (v, record) => {
        const canEdit = canEditStage(congDoan)
        const isEditing = inlineEdit?.id === record.id && inlineEdit?.field === fieldKey
        if (isEditing) {
          return (
            <InputNumber
              size="small" autoFocus min={0} step={1}
              defaultValue={v ?? undefined}
              style={{ width: 72 }}
              formatter={val => (val != null && val !== '') ? Number(val).toLocaleString('vi-VN') : ''}
              parser={val => val ? val.replace(/[^\d]/g, '') : ''}
              onClick={e => e.stopPropagation()}
              onPressEnter={e => {
                const num = e.target.value ? parseInt(e.target.value.replace(/[^\d]/g, ''), 10) : null
                saveInlineEdit(record.id, fieldKey, isNaN(num) ? null : num)
              }}
              onBlur={e => {
                if (!inlineSaving) {
                  const num = e.target.value ? parseInt(e.target.value.replace(/[^\d]/g, ''), 10) : null
                  saveInlineEdit(record.id, fieldKey, isNaN(num) ? null : num)
                }
              }}
            />
          )
        }
        return (
          <div
            onClick={canEdit ? e => { e.stopPropagation(); setInlineEdit({ id: record.id, field: fieldKey }) } : undefined}
            style={{ cursor: canEdit ? 'pointer' : 'default', textAlign: 'right' }}
          >
            {v != null
              ? <span style={{ fontWeight: 600, color: '#0891b2' }}>{Number(v).toLocaleString('vi-VN')}</span>
              : canEdit
                ? <Tag style={{ borderStyle: 'dashed', color: '#aaa', marginRight: 0, cursor: 'pointer' }}>{label}</Tag>
                : <span style={{ color: '#d9d9d9' }}>—</span>}
          </div>
        )
      },
    })),
    {
      title: 'Tổng QA', dataIndex: 'qaLayMau', key: 'qaLayMau', width: 80, align: 'center',
      render: v => v != null
        ? <span style={{ fontWeight: 700, color: '#0891b2' }}>{Number(v).toLocaleString('vi-VN')}</span>
        : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Trưởng ca', dataIndex: 'truongCa', key: 'truongCa', width: 110, ellipsis: true,
      ...colSearch('truongCa'),
      render: v => v
        ? <Tooltip title={v}><span style={{ ...TEXT_STYLE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{v}</span></Tooltip>
        : <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Người HT', dataIndex: 'nguoiHoTro', key: 'nguoiHoTro', width: 120, ellipsis: true,
      ...colSearch('nguoiHoTro'),
      render: v => v
        ? <Tooltip title={v}><span style={{ ...TEXT_STYLE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{v}</span></Tooltip>
        : <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Chú ý', dataIndex: 'chuY', key: 'chuY', width: 120, ellipsis: true,
      ...colSearch('chuY'),
      render: v => v
        ? <Tooltip title={v}><span style={TEXT_STYLE}>{v}</span></Tooltip>
        : <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Sai lệch', dataIndex: 'saiLech', key: 'saiLech', width: 90, align: 'center',
      filters: [
        { text: 'Có sai lệch', value: 'yes' },
        { text: 'Không sai lệch', value: 'no' },
      ],
      filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#fff' : 'rgba(255,255,255,0.7)' }} />,
      onFilter: (value, record) => value === 'yes' ? !!record.saiLech : !record.saiLech,
      render: v => v
        ? <Tooltip title={v}><Tag color="orange" icon={<WarningOutlined />} style={{ marginRight: 0 }}>Có</Tag></Tooltip>
        : <Tag color="green" style={{ marginRight: 0 }}>Không</Tag>
    },
    {
      title: 'In Nhãn', key: 'printLabel', width: 72, align: 'center', fixed: 'right',
      render: (_, record) => {
        const STAGE_MAP = {
          PC: 'Pha chế', PCPL1: 'Pha chế', PCPL2: 'Pha chế',
          PL: 'Phân liều',
          BBC1: 'Vệ sinh bao bì',
        }
        const slField = SL_FIELD_MAP[congDoan] || 'slPc'
        const handlePrint = () => {
          const params = new URLSearchParams({
            productName: record.tenTrinh || record.maSp || '',
            batchCode:   record.soLo || '',
            stage:       STAGE_MAP[congDoan] || '',
            quantity:    record[slField] != null ? String(record[slField]) : '',
            personnel:   record.nguoiThucHien || '',
            notes:       record.chuY || '',
          })
          window.open(`/nhan-btp.html?${params.toString()}`, '_blank')
        }
        return (
          <Tooltip title="In nhãn BTP">
            <Button size="small" type="text" icon={<PrinterOutlined />}
              style={{ color: '#2d6a47', fontSize: 15 }}
              onClick={e => { e.stopPropagation(); handlePrint() }}
            />
          </Tooltip>
        )
      }
    },
    {
      key: 'action', width: 100, fixed: 'right', align: 'center',
      title: () => canEditStage(congDoan) && !allowedNhom && canDeleteSchedule() ? (
        <Popconfirm
          title={`Xóa tất cả ${data.length} bản ghi trên trang này?`}
          description={<span style={{ color: '#cf1322', fontWeight: 600 }}>Hành động này không thể hoàn tác!</span>}
          okText="Xóa tất cả" cancelText="Hủy"
          okButtonProps={{ danger: true, loading: bulkDeleting }}
          onConfirm={handleDeleteAll}
        >
          <Tooltip title="Xóa tất cả bản ghi đang hiển thị">
            <Button size="small" type="text" danger icon={<DeleteOutlined />}
              style={{ fontSize: 10, opacity: 0.75 }} loading={bulkDeleting}>
              Tất cả
            </Button>
          </Tooltip>
        </Popconfirm>
      ) : <span style={{ fontWeight: 600, fontSize: 11 }}>Thao tác</span>,
      render: (_, record) => {
        const toNhom = record.toNhom?.trim() || ''
        const canEdit = canEditStage(congDoan) &&
          (!allowedNhom || !toNhom || toNhom === allowedNhom)
        const menuItems = [
          canEdit && {
            key: 'edit',
            label: 'Chỉnh sửa',
            icon: <EditOutlined style={{ color: '#1677ff' }} />,
            onClick: () => { setEditItem(record); setModalOpen(true) }
          },
          canEdit && canDeleteSchedule() && {
            key: 'delete',
            label: (
              <Popconfirm title="Xóa công việc này?" onConfirm={() => handleDelete(record.id)}
                okText="Xóa" cancelText="Hủy">
                <span style={{ color: '#ff4d4f' }}>
                  <DeleteOutlined style={{ marginRight: 6 }} />Xóa
                </span>
              </Popconfirm>
            ),
          },
          !isNhanVien() && {
            key: 'hide',
            label: 'Ẩn bản ghi',
            icon: <EyeInvisibleOutlined style={{ color: '#8c8c8c' }} />,
            onClick: () => handleHide(record.id)
          }
        ].filter(Boolean)
        if (menuItems.length === 0) return <span style={{ color: '#d9d9d9' }}>—</span>
        return (
          <div onClick={e => e.stopPropagation()}>
            <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
              <Button size="small" type="default"
                style={{ fontSize: 11, padding: '0 6px', height: 24 }}>
                Cập nhật <DownOutlined style={{ fontSize: 9 }} />
              </Button>
            </Dropdown>
          </div>
        )
      }
    }
  ]

  return (
    <>
      {/* ── Inner sub-tab bar + shared filter (sticky ở top=46) ── */}
      <div ref={controlsRef} style={{ position: 'sticky', top: 46, zIndex: 10, background: '#fff' }}>
        {/* Tab row */}
        <div className="ws-inner-tabs" style={{
          borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', gap: 0, paddingLeft: 12,
        }}>
          {[
            {
              key: 'list',
              label: congDoan === 'PL'
                ? <span>Danh sách <Badge count={data.filter(r => r.tinhTrang !== 'done' && !r.toNhom?.trim()).length} color="#1677ff" size="small" style={{ marginLeft: 4 }} /></span>
                : 'Danh sách',
              color: '#1677ff',
            },
            ...(congDoan === 'PL' ? [
              {
                key: 'pl_pcpl1',
                color: '#2563eb',
                label: <span>PCPL1 <Badge count={data.filter(r => r.tinhTrang !== 'done' && r.toNhom === 'PCPL1').length} color="#2563eb" size="small" style={{ marginLeft: 4 }} /></span>,
              },
              {
                key: 'pl_pcpl3',
                color: '#7c3aed',
                label: <span>PCPL3 <Badge count={data.filter(r => r.tinhTrang !== 'done' && (r.toNhom === 'PCPL3' || r.toNhom === 'PCPL2')).length} color="#7c3aed" size="small" style={{ marginLeft: 4 }} /></span>,
              },
            ] : []),
            {
              key: 'done',
              color: '#15803d',
              label: (
                <span>
                  <CheckCircleOutlined style={{ marginRight: 5, color: doneCount > 0 ? '#15803d' : undefined }} />
                  Lịch đã hoàn thiện
                  {doneCount > 0 && (
                    <Badge count={doneCount} size="small" color="#15803d" style={{ marginLeft: 5 }} />
                  )}
                </span>
              )
            },
            {
              key: 'hidden',
              color: '#722ed1',
              label: (
                <span>
                  <EyeInvisibleOutlined style={{ marginRight: 5, color: hiddenCount > 0 ? '#722ed1' : undefined }} />
                  Đã ẩn
                  {hiddenCount > 0 && (
                    <Badge count={hiddenCount} size="small" color="#722ed1" style={{ marginLeft: 5 }} />
                  )}
                </span>
              )
            },
            ...(isAnyAdmin() ? [{
              key: 'nonprod',
              color: '#d97706',
              label: (
                <span>
                  <ClockCircleOutlined style={{ marginRight: 5, color: '#d97706' }} />
                  Không SX
                  {nonprodData.length > 0 && (
                    <Badge count={nonprodData.length} size="small" color="#d97706" style={{ marginLeft: 5 }} />
                  )}
                </span>
              )
            }] : []),
            {
              key: 'analytics',
              color: '#0e7490',
              label: (
                <span>
                  <BarChartOutlined style={{ marginRight: 5, color: '#0e7490' }} />
                  Tổng quát
                </span>
              )
            },
            {
              key: 'machine_a',
              color: '#b45309',
              label: <span>⚙ Chỉ số A</span>,
            },
            {
              key: 'machine_p',
              color: '#7c3aed',
              label: <span>⚡ Chỉ số P</span>,
            },
          ].map(tab => (
            <div
              key={tab.key}
              onClick={() => setInnerTab(tab.key)}
              style={{
                padding: '7px 18px',
                cursor: 'pointer',
                fontWeight: innerTab === tab.key ? 700 : 400,
                fontSize: 13,
                color: innerTab === tab.key ? tab.color : '#595959',
                borderBottom: innerTab === tab.key
                  ? `2px solid ${tab.color}`
                  : '2px solid transparent',
                marginBottom: -1,
                userSelect: 'none',
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
            </div>
          ))}
          {/* Thêm mới — chỉ hiện ở tab Danh sách / PCPL1 / PCPL3 */}
          {isListLikeTab && canEditStage(congDoan) && (
            <div style={{ marginLeft: 'auto', paddingRight: 8 }}>
              <Button size="small" type="primary" icon={<PlusOutlined />}
                onClick={() => { setEditItem(null); setModalOpen(true) }}>
                Thêm mới
              </Button>
            </div>
          )}
        </div>

        {/* Shared filter row */}
        <div className="ws-filter-bar" style={{
          background: '#f0f4ff', borderBottom: '2px solid #c5cef5',
          padding: '5px 12px', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap'
        }}>
          <Space.Compact size="small">
            <Button size="small" onClick={() => handleQuickDate('week')}>Tuần</Button>
            <Button size="small" onClick={() => handleQuickDate('month')}>Tháng</Button>
            <Button size="small" onClick={() => handleQuickDate('year')}>Năm</Button>
          </Space.Compact>
          <RangePicker size="small" style={{ width: 224 }} format="DD/MM/YYYY"
            placeholder={['Từ ngày', 'Đến ngày']}
            value={filters.dateRange}
            onChange={v => setFilters(f => ({ ...f, dateRange: v }))} />
          <Input size="small" style={{ width: 96 }} placeholder="Mã SP" value={filters.maSp} allowClear
            onChange={e => setFilters(f => ({ ...f, maSp: e.target.value }))}
            onPressEnter={handleSearch} />
          <Input size="small" style={{ width: 148 }} placeholder="Tiến trình" value={filters.tenTrinh} allowClear
            onChange={e => setFilters(f => ({ ...f, tenTrinh: e.target.value }))}
            onPressEnter={handleSearch} />
          <Input size="small" style={{ width: 110 }} placeholder="Lô sản xuất" value={filters.soLo} allowClear
            onChange={e => setFilters(f => ({ ...f, soLo: e.target.value }))}
            onPressEnter={handleSearch} />
          {innerTab !== 'done' && (
            <Select size="small" style={{ width: 110 }} placeholder="Tình trạng" allowClear
              value={filters.tinhTrang || undefined}
              onChange={v => setFilters(f => ({ ...f, tinhTrang: v || '' }))}>
              <Option value="done">Done</Option>
              <Option value="doing">Doing</Option>
            </Select>
          )}
          {innerTab === 'done' && (
            <Input size="small" style={{ width: 100 }} placeholder="Mã Bravo" value={filters.maBravo} allowClear
              onChange={e => setFilters(f => ({ ...f, maBravo: e.target.value }))}
              onPressEnter={handleSearch} />
          )}
          <Button size="small" type="primary" icon={<SearchOutlined />} onClick={handleSearch}>Tìm</Button>
          <Button size="small" icon={<ReloadOutlined />} onClick={handleReset} />
          {/* Bulk actions — hiện ở tab Danh sách và PCPL1/PCPL3 */}
          {isListLikeTab && canEditStage(congDoan) && selectedRowKeys.length > 0 && (
            <Popconfirm
              title={`Ẩn ${selectedRowKeys.length} bản ghi đã chọn?`}
              okText="Ẩn" cancelText="Hủy"
              okButtonProps={{ loading: bulkHiding }}
              onConfirm={handleBulkHideSelected}
            >
              <Button size="small" icon={<EyeInvisibleOutlined />} loading={bulkHiding}
                style={{ fontWeight: 700, color: '#595959' }}>
                Ẩn đã chọn ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
          {isListLikeTab && canEditStage(congDoan) && selectedRowKeys.length > 0 && (
            <Space.Compact size="small">
              <Select
                size="small"
                placeholder="Gán Tổ/nhóm…"
                allowClear
                value={bulkNhomVal}
                onChange={v => setBulkNhomVal(v ?? null)}
                style={{ width: 120 }}
                options={[
                  { label: 'PCPL1', value: 'PCPL1' },
                  { label: 'PCPL2', value: 'PCPL2' },
                  { label: 'PCPL3', value: 'PCPL3' },
                  { label: 'BBC1',  value: 'BBC1'  },
                  { label: 'ĐG',    value: 'ĐG'    },
                  { label: 'PL',    value: 'PL'    },
                  { label: '(Xóa nhóm)', value: '' },
                ]}
              />
              <Popconfirm
                title={`Gán Tổ/Nhóm TH = "${bulkNhomVal || '(trống)'}" cho ${selectedRowKeys.length} bản ghi?`}
                okText="Gán" cancelText="Hủy"
                disabled={bulkNhomVal === undefined}
                onConfirm={handleBulkSetNhom}
              >
                <Button size="small" type="primary" loading={bulkNhomSaving}
                  disabled={bulkNhomVal === undefined}
                  style={{ fontWeight: 700 }}>
                  Gán ({selectedRowKeys.length})
                </Button>
              </Popconfirm>
            </Space.Compact>
          )}
          {isListLikeTab && canEditStage(congDoan) && selectedRowKeys.length > 0 && canDeleteSchedule() && (
            <Popconfirm
              title={`Xóa ${selectedRowKeys.length} bản ghi đã chọn?`}
              okText="Xóa" cancelText="Hủy"
              okButtonProps={{ danger: true, loading: bulkDeleting }}
              onConfirm={handleBulkDeleteSelected}
            >
              <Button size="small" danger icon={<DeleteOutlined />} loading={bulkDeleting}
                style={{ fontWeight: 700 }}>
                Xóa đã chọn ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
        </div>
      </div>

      {/* ── Tab: Danh sách / PCPL1 / PCPL3 ── */}
      {isListLikeTab && (
        <>
          <StageSummaryBar congDoan={congDoan} liveData={data} />
          {/* ── Desktop table ── */}
          <div className="ws-desktop-view">
          <SkeletonTable
            className="ws-table"
            columns={columns}
            dataSource={data
              .filter(r => r.tinhTrang !== 'done')
              .filter(r => {
                if (congDoan !== 'PL') return true
                if (innerTab === 'list')     return !r.toNhom?.trim()
                if (innerTab === 'pl_pcpl1') return r.toNhom === 'PCPL1'
                if (innerTab === 'pl_pcpl3') return r.toNhom === 'PCPL3' || r.toNhom === 'PCPL2'
                return true
              })
              .sort((a, b) => {
                const slF = SL_FIELD_MAP[congDoan], cF = CONG_FIELD_MAP[congDoan]
                const getPriority = r => {
                  const sl   = slF ? Number(r[slF]) || 0 : 0
                  const cong = cF  ? Number(r[cF])  || 0 : 0
                  const coLo = Number(r.coLo) || 0
                  if (cong > 0 && sl === 0) return 0
                  if (r.saiLech) return 1
                  if (sl > 0 && coLo > 0 && sl > coLo) return 2
                  const avg = nsMap[r.maSp]
                  if (avg != null && avg > 0 && cong > 0 && sl / cong < avg) return 3
                  return 10
                }
                return getPriority(a) - getPriority(b)
              })}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1720 + config.extraTableCols.length * 87 }}
            size="small"
            sticky={{ offsetHeader: headerOffset }}
            rowHoverable={false}
            rowSelection={canEditStage(congDoan) && !allowedNhom && !['ADMIN_PCPL1','ADMIN_PCPL2','ADMIN_PCPL3','ADMIN_DG','ADMIN_BBC1'].includes(user?.role) ? {
              selectedRowKeys,
              onChange: keys => setSelectedRowKeys(keys),
              preserveSelectedRowKeys: true,
            } : undefined}
            rowClassName={record => {
              const slField  = SL_FIELD_MAP[congDoan]
              const congField = CONG_FIELD_MAP[congDoan]
              const sl   = slField   ? Number(record[slField])   || 0 : 0
              const cong = congField ? Number(record[congField]) || 0 : 0
              const coLo = Number(record.coLo) || 0
              const slExceeds  = sl > 0 && coLo > 0 && sl > coLo
              const missingSl  = cong > 0 && sl === 0
              if (record.id === highlightId && record.saiLech) return 'row-has-deviation row-jump-highlight'
              if (record.id === highlightId) return 'row-jump-highlight'
              if (record.saiLech) return 'row-has-deviation'
              if (missingSl) return 'row-missing-sl'
              if (slExceeds) return 'row-sl-exceed'
              return getNsRowClass(record)
            }}
            onRow={record => ({
              id: `ws-row-${record.id}`,
              style: { cursor: 'pointer' },
              onClick: () => openDetailDrawer(record),
            })}
            pagination={false}
          />
          </div>

          {/* ── Mobile card list ── */}
          <div className="ws-mobile-view" style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loading && <div style={{ textAlign: 'center', padding: 32 }}><Spin size="large" /></div>}
            {!loading && data.filter(r => r.tinhTrang !== 'done').length === 0 && (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40, fontSize: 14 }}>Không có dữ liệu</div>
            )}
            {!loading && data
              .filter(r => r.tinhTrang !== 'done')
              .filter(r => {
                if (congDoan !== 'PL') return true
                if (innerTab === 'list')     return !r.toNhom?.trim()
                if (innerTab === 'pl_pcpl1') return r.toNhom === 'PCPL1'
                if (innerTab === 'pl_pcpl3') return r.toNhom === 'PCPL3' || r.toNhom === 'PCPL2'
                return true
              })
              .sort((a, b) => {
                const slF = SL_FIELD_MAP[congDoan], cF = CONG_FIELD_MAP[congDoan]
                const aM = cF && slF && (Number(a[cF])||0) > 0 && (Number(a[slF])||0) === 0
                const bM = cF && slF && (Number(b[cF])||0) > 0 && (Number(b[slF])||0) === 0
                if (aM && !bM) return -1
                if (!aM && bM) return 1
                return 0
              })
              .map(record => (
              <MobileScheduleCard
                key={record.id}
                record={record}
                congDoan={congDoan}
                nsMap={nsMap}
                onClick={() => openDetailDrawer(record)}
              />
            ))}
            {!loading && data.filter(r => r.tinhTrang !== 'done').length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px' }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  {data.length} / {pagination.total} bản ghi — nhấn để xem chi tiết
                </span>
                <Space size={4}>
                  <Button size="small" disabled={pagination.current <= 1}
                    onClick={() => { const p = pagination.current - 1; setPagination(prev => ({ ...prev, current: p })); paginationRef.current = { ...paginationRef.current, current: p }; fetchData(p - 1) }}>
                    ‹ Trước
                  </Button>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{pagination.current}/{Math.ceil(pagination.total / pagination.pageSize) || 1}</span>
                  <Button size="small" disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
                    onClick={() => { const p = pagination.current + 1; setPagination(prev => ({ ...prev, current: p })); paginationRef.current = { ...paginationRef.current, current: p }; fetchData(p - 1) }}>
                    Sau ›
                  </Button>
                </Space>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Tab: Lịch đã hoàn thiện ── */}
      {innerTab === 'done' && (
        <DoneTab
          congDoan={congDoan}
          toNhom={forcedNhom}
          filters={filters}
          searchTick={searchTick}
          headerOffset={headerOffset}
          onUndone={() => fetchData(0)}
          onCountChange={setDoneCount}
          onRowClick={r => openDetailDrawer(r)}
        />
      )}

      {/* ── Tab: Đã ẩn ── */}
      {innerTab === 'hidden' && (
        <HiddenTab
          congDoan={congDoan}
          toNhom={forcedNhom}
          filters={filters}
          headerOffset={headerOffset}
          onUnhide={() => fetchData(0)}
          onCountChange={setHiddenCount}
        />
      )}

      {/* ── Tab: Không SX ── */}
      {innerTab === 'nonprod' && isAnyAdmin() && (() => {
        const NP_TO_LIST = ['PCPL1', 'PCPL2', 'PL', 'BBC1', 'ĐG', 'KT']
        const npFilteredEmps = npForm?.to
          ? npEmployees.filter(e => {
              const g = (e.toNhom || '').toUpperCase()
              const t = npForm.to.toUpperCase()
              return g === t || (t === 'PL' && (g === 'PCPL3' || g === 'PL'))
            })
          : npEmployees
        const totalGio = nonprodData.reduce((s, e) => s + (parseFloat(e.gio) || 0), 0)
        const totalCong = nonprodData.reduce((s, e) => s + (parseFloat(e.cong) || 0), 0)
        return (
          <div style={{ padding: '14px 14px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#92400e' }}>⏱ Thời gian không tạo sản phẩm</span>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>Lưu cục bộ (localStorage)</span>
              <Button size="small" type="primary" icon={<PlusOutlined />} style={{ marginLeft: 'auto', background: '#d97706', borderColor: '#d97706' }}
                onClick={() => setNpForm({ date: dayjs().format('YYYY-MM-DD'), act: '', to: '', person: '', gio: '', cong: '' })}>
                Thêm mới
              </Button>
              {nonprodData.length > 0 && (
                <Popconfirm title="Xóa toàn bộ dữ liệu không SX?" okType="danger" okText="Xóa hết" cancelText="Hủy"
                  onConfirm={() => saveNpData([])}>
                  <Button size="small" danger>Xóa tất cả</Button>
                </Popconfirm>
              )}
            </div>

            {/* Form thêm mới */}
            {npForm && (
              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                {/* Ngày */}
                <div>
                  <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginBottom: 3 }}>Ngày *</div>
                  <input type="date" value={npForm.date || ''} onChange={e => setNpForm(f => ({ ...f, date: e.target.value }))}
                    style={{ border: '1px solid #fcd34d', borderRadius: 5, padding: '5px 8px', fontSize: 12 }} />
                </div>
                {/* Hoạt động — datalist, gõ tự do hoặc chọn preset */}
                <div style={{ flex: 2, minWidth: 200 }}>
                  <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginBottom: 3 }}>Hoạt động / Ghi chú *</div>
                  <input
                    list="np-act-list"
                    value={npForm.act || ''}
                    onChange={e => setNpForm(f => ({ ...f, act: e.target.value }))}
                    placeholder="Nhập hoặc chọn hoạt động..."
                    style={{ border: '1px solid #fcd34d', borderRadius: 5, padding: '5px 8px', fontSize: 12, width: '100%', background: '#fff' }}
                  />
                  <datalist id="np-act-list">
                    {NONPROD_ACTS.map(a => <option key={a.name} value={a.name} />)}
                  </datalist>
                </div>
                {/* Tổ thực hiện */}
                <div>
                  <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginBottom: 3 }}>Tổ TH</div>
                  <select value={npForm.to || ''} onChange={e => setNpForm(f => ({ ...f, to: e.target.value, person: '' }))}
                    style={{ border: '1px solid #fcd34d', borderRadius: 5, padding: '5px 8px', fontSize: 12, background: '#fff', minWidth: 90 }}>
                    <option value="">-- Tổ --</option>
                    {NP_TO_LIST.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {/* Người thực hiện — select từ danh sách nhân sự */}
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginBottom: 3 }}>Người thực hiện</div>
                  <select value={npForm.person || ''} onChange={e => setNpForm(f => ({ ...f, person: e.target.value }))}
                    style={{ border: '1px solid #fcd34d', borderRadius: 5, padding: '5px 8px', fontSize: 12, background: '#fff', width: '100%' }}>
                    <option value="">-- Chọn người --</option>
                    {npFilteredEmps.map(emp => <option key={emp.id} value={emp.hoVaTen}>{emp.hoVaTen}</option>)}
                  </select>
                </div>
                {/* Giờ */}
                <div>
                  <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginBottom: 3 }}>Giờ</div>
                  <input type="number" min="0" step="0.5" value={npForm.gio || ''}
                    onChange={e => {
                      const g = parseFloat(e.target.value) || 0
                      setNpForm(f => ({ ...f, gio: e.target.value, cong: g > 0 ? (g / 8).toFixed(3) : '' }))
                    }}
                    placeholder="0"
                    style={{ border: '1px solid #fcd34d', borderRadius: 5, padding: '5px 8px', fontSize: 12, width: 72, textAlign: 'right', background: '#fff' }} />
                </div>
                {/* Công (auto) */}
                <div>
                  <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginBottom: 3 }}>Công (tự tính)</div>
                  <input readOnly value={npForm.cong || '0'}
                    style={{ border: '1px solid #e5e7eb', borderRadius: 5, padding: '5px 8px', fontSize: 12, width: 72, textAlign: 'right', background: '#fef9c3', color: '#92400e', fontWeight: 700 }} />
                </div>
                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <Button size="small" type="primary" style={{ background: '#d97706', borderColor: '#d97706' }}
                    onClick={() => {
                      if (!npForm.date || !npForm.act) { message.warning('Vui lòng nhập Ngày và Hoạt động'); return }
                      const g = parseFloat(npForm.gio) || 0
                      const entry = {
                        _id: `np_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                        date: npForm.date, act: npForm.act,
                        to: npForm.to, person: npForm.person,
                        gio: g, cong: g > 0 ? parseFloat((g / 8).toFixed(3)) : 0,
                      }
                      saveNpData([...nonprodData, entry])
                      // giữ ngày + tổ để tiếp tục nhập
                      setNpForm(f => ({ ...f, act: '', person: '', gio: '', cong: '' }))
                    }}>Lưu & tiếp</Button>
                  <Button size="small" onClick={() => setNpForm(null)}>Đóng</Button>
                </div>
              </div>
            )}

            {/* Bảng dữ liệu */}
            {nonprodData.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontSize: 13, background: '#fafafa', borderRadius: 8, border: '1px dashed #e5e7eb' }}>
                Chưa có dữ liệu. Nhấn "Thêm mới" để bắt đầu.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#fef3c7' }}>
                      {[
                        { label: 'Ngày', align: 'left' },
                        { label: 'Hoạt động / Ghi chú', align: 'left' },
                        { label: 'Tổ', align: 'center' },
                        { label: 'Người TH', align: 'left' },
                        { label: 'Giờ', align: 'right' },
                        { label: 'Công', align: 'right' },
                        { label: '', align: 'center' },
                      ].map((h, i) => (
                        <th key={i} style={{ padding: '7px 10px', borderBottom: '2px solid #fcd34d', textAlign: h.align, whiteSpace: 'nowrap', fontWeight: 700, color: '#92400e' }}>{h.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...nonprodData].sort((a, b) => (a.date || '').localeCompare(b.date || '')).map((entry, idx) => (
                      <tr key={entry._id} style={{ background: idx % 2 === 0 ? '#fff' : '#fffbf0', borderBottom: '1px solid #fef3c7' }}>
                        <td style={{ padding: '5px 10px', whiteSpace: 'nowrap', fontWeight: 600 }}>{entry.date ? dayjs(entry.date).format('DD/MM/YYYY') : '—'}</td>
                        <td style={{ padding: '5px 10px' }}>{entry.act || '—'}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {entry.to ? <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>{entry.to}</Tag> : '—'}
                        </td>
                        <td style={{ padding: '5px 10px', whiteSpace: 'nowrap' }}>{entry.person || '—'}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{entry.gio || 0}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#d97706' }}>{entry.cong || 0}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                          <button onClick={() => saveNpData(nonprodData.filter(e => e._id !== entry._id))}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 17, lineHeight: 1, padding: '0 4px' }} title="Xóa">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#fef3c7', fontWeight: 700 }}>
                      <td colSpan={4} style={{ padding: '6px 10px', textAlign: 'right', color: '#92400e' }}>Tổng cộng:</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#374151' }}>{totalGio.toFixed(1)} giờ</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#d97706', fontSize: 13 }}>{totalCong.toFixed(3)} công</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Tab: Tổng quát (per-stage analytics) ── */}
      {innerTab === 'analytics' && <StageAnalyticsTab congDoan={congDoan} />}

      {/* ── Tab: Chỉ số A (machine OEE availability) ── */}
      {innerTab === 'machine_a' && (() => {
        const ths = [
          { label: 'STT', w: 40 },
          { label: 'Ngày', w: 90 },
          { label: 'Tên sản phẩm', w: 200 },
          { label: 'Số lô', w: 80 },
          { label: 'Tổ/Nhóm', w: 80 },
          { label: 'Giờ KH (h)', w: 75 },
          { label: 'Giờ chạy thực tế (h)', w: 120 },
          { label: 'Giờ dừng (h)', w: 90 },
          { label: 'A (%)', w: 70 },
          { label: 'Số lần dừng', w: 85 },
          { label: 'Lý do dừng chính', w: 220 },
          { label: 'Ghi chú / CAPA', w: 180 },
        ]
        const year = (filters.dateRange?.[0] || dayjs()).year()
        const tenTo = congDoan === 'BBC1' ? 'BBC1' : congDoan === 'DG' ? 'ĐG' : congDoan === 'CC' ? 'CC' : `Tổ ${congDoan}`
        const NCOLS = ths.length
        const thBase = { padding: '6px 8px', textAlign: 'center', border: '1px solid #4a6fa5', fontWeight: 700, fontSize: 11, letterSpacing: 0.5, color: '#fff' }
        const doRefresh = () => setMachineAVersion(v => v + 1)

        // Group machineAData by machine (for per-machine tabs)
        const machineOrder = []
        const machineMap = {}
        machineAData.forEach(row => {
          if (!machineMap[row.tenMay]) { machineMap[row.tenMay] = []; machineOrder.push(row.tenMay) }
          machineMap[row.tenMay].push(row)
        })

        // Determine active inner tab (fallback to summary if machine not in current filtered data)
        const activeTab = machineAInnerTab === 'summary' || machineOrder.includes(machineAInnerTab)
          ? machineAInnerTab : 'summary'

        // Color helpers for A%
        const aColor = v => v == null ? '#9ca3af' : v >= 90 ? '#16a34a' : v >= 70 ? '#d97706' : '#dc2626'
        const aBg   = v => v == null ? 'transparent' : v >= 90 ? '#f0fdf4' : v >= 70 ? '#fffbeb' : '#fef2f2'

        // A% computation from loaded summary data
        const computeAPct = (tenMay, fromStr, toStr = null) => {
          const rows = machineSummaryData.filter(r =>
            r.tenMay === tenMay && r.ngay >= fromStr && (toStr == null || r.ngay <= toStr)
          )
          const run = rows.reduce((s, r) => s + (r.gioChay || 0), 0)
          const kh  = rows.reduce((s, r) => s + (r.gioKH  || 0), 0)
          return kh > 0 ? Math.round(run * 1000 / kh) / 10 : null
        }

        // Hiệu suất tổng thể của toàn công đoạn (tổng tất cả máy)
        const computeOverallAPct = (fromStr, toStr = null) => {
          const rows = machineSummaryData.filter(r =>
            r.ngay >= fromStr && (toStr == null || r.ngay <= toStr)
          )
          const run = rows.reduce((s, r) => s + (r.gioChay || 0), 0)
          const kh  = rows.reduce((s, r) => s + (r.gioKH  || 0), 0)
          return kh > 0 ? Math.round(run * 1000 / kh) / 10 : null
        }

        // Unique machines from summary data
        const sumMachines = [...new Map(machineSummaryData.map(r => [r.tenMay, { tenMay: r.tenMay, maMay: r.maMay }])).values()]

        const today = dayjs()
        const customFrom = summaryCustomRange?.[0]?.format('YYYY-MM-DD')
        const customTo   = summaryCustomRange?.[1]?.format('YYYY-MM-DD')
        const periods = [
          { key: 'week',   label: 'Tuần (7 ngày)',   from: today.subtract(6,   'day').format('YYYY-MM-DD') },
          { key: 'month',  label: 'Tháng (30 ngày)', from: today.subtract(29,  'day').format('YYYY-MM-DD') },
          { key: 'q3',     label: '3 Tháng',          from: today.subtract(89,  'day').format('YYYY-MM-DD') },
          { key: 'half',   label: '6 Tháng',          from: today.subtract(179, 'day').format('YYYY-MM-DD') },
          { key: 'custom', label: 'Tùy chọn',         from: customFrom, to: customTo, isCustom: true },
        ]

        // Pareto with cumulative %
        let cumul = 0
        const paretoRows = machineParetoData.map(r => {
          cumul += (r.phanTram || 0)
          return { ...r, cumul: Math.round(cumul * 10) / 10 }
        })

        const tabBtn = (active) => ({
          background: active ? '#1e3a5f' : 'transparent',
          color: active ? '#fff' : '#475569',
          border: 'none', borderBottom: active ? '2px solid #1e3a5f' : '2px solid transparent',
          padding: '8px 14px', cursor: 'pointer', fontSize: 12,
          fontWeight: active ? 700 : 400, whiteSpace: 'nowrap', marginBottom: -2,
        })

        // Per-machine day-by-day table
        const renderMachineTable = (tenMay, rows) => (
          <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', tableLayout: 'fixed' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr>
                <th colSpan={NCOLS} style={{ background: '#1e3a5f', color: '#fff', padding: '8px 12px', border: '1px solid #4a6fa5', fontWeight: 800, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  BIỂU MẪU THEO DÕI CHỈ SỐ A (AVAILABILITY) – {tenTo} &nbsp;·&nbsp; {tenMay}
                </th>
              </tr>
              <tr>
                <th colSpan={NCOLS} style={{ background: '#2d4f7c', color: '#dbeafe', padding: '4px 12px', textAlign: 'center', border: '1px solid #4a6fa5', fontWeight: 400, fontSize: 11, fontStyle: 'italic' }}>
                  Availability = Giờ chạy thực tế / Tổng giờ kế hoạch &nbsp;·&nbsp; Mục tiêu ≥ 90% &nbsp;·&nbsp; 2 ca × 8h = 16h/ngày &nbsp;·&nbsp; {year}
                </th>
              </tr>
              <tr>
                <th colSpan={5} style={{ ...thBase, background: '#1e3a5f' }}>THÔNG TIN SẢN XUẤT</th>
                <th colSpan={3} style={{ ...thBase, background: '#166534' }}>GIỜ VẬN HÀNH (h)</th>
                <th colSpan={1} style={{ ...thBase, background: '#b45309' }}>AVAILABILITY</th>
                <th colSpan={3} style={{ ...thBase, background: '#991b1b' }}>SỰ CỐ / DỪNG MÁY</th>
              </tr>
              <tr>
                {ths.map(h => (
                  <th key={h.label} style={{ background: '#f1f5f9', color: '#1e293b', padding: '6px 6px', border: '1px solid #94a3b8', fontWeight: 700, fontSize: 11, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={NCOLS} style={{ textAlign: 'center', padding: '32px 8px', color: '#9ca3af', border: '1px solid #e2e8f0' }}>
                  Không có dữ liệu trong khoảng thời gian đã chọn.
                </td></tr>
              ) : rows.map((row, idx) => {
                const avail = row.availPct
                const rowBg = idx % 2 === 0 ? '#fff' : '#f8fafc'
                const td = (extra = {}) => ({ padding: '6px 6px', border: '1px solid #e2e8f0', background: rowBg, overflow: 'hidden', textOverflow: 'ellipsis', ...extra })
                return (
                  <tr key={idx} onClick={() => openMachineADetail(row)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={td({ textAlign: 'center', color: '#94a3b8', fontSize: 11 })}>{idx + 1}</td>
                    <td style={td({ whiteSpace: 'nowrap', fontWeight: 500 })}>{dayjs(row.ngay).isValid() ? dayjs(row.ngay).format('DD/MM/YYYY') : row.ngay}</td>
                    <td style={td({ fontWeight: 600 })}>{row.workScheduleInfos?.map(w => w.tenTrinh).filter(Boolean).join(' / ') || row.tenMay}</td>
                    <td style={td({ textAlign: 'center', fontFamily: 'monospace', color: '#000099', fontWeight: 600 })}>{row.workScheduleInfos?.map(w => w.soLo).filter(Boolean).join(', ') || '—'}</td>
                    <td style={td({ textAlign: 'center' })}>{row.toNhom || '—'}</td>
                    <td
                      style={td({ textAlign: 'center', fontWeight: 600, cursor: 'pointer', position: 'relative' })}
                      onClick={e => { e.stopPropagation(); setEditingGioKh({ ngay: row.ngay, tenMay: row.tenMay, value: row.gioKH }) }}
                      title="Click để chỉnh sửa giờ KH"
                    >
                      {editingGioKh?.ngay === row.ngay && editingGioKh?.tenMay === row.tenMay ? (
                        <InputNumber
                          size="small" autoFocus min={1} max={24} step={0.5} precision={1}
                          value={editingGioKh.value}
                          style={{ width: 62 }}
                          formatter={v => v != null ? String(v).replace('.', ',') : ''}
                          parser={v => v ? v.replace(',', '.').replace(/[^\d.]/g, '') : ''}
                          onChange={v => setEditingGioKh(prev => ({ ...prev, value: v }))}
                          onPressEnter={() => saveGioKh(editingGioKh.ngay, editingGioKh.tenMay, editingGioKh.value)}
                          onBlur={() => saveGioKh(editingGioKh.ngay, editingGioKh.tenMay, editingGioKh.value)}
                          onClick={e => e.stopPropagation()}
                          onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setEditingGioKh(null) } }}
                        />
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {row.gioKH}
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>✎</span>
                        </span>
                      )}
                    </td>
                    <td style={td({ textAlign: 'center', color: '#16a34a', fontWeight: 700 })}>{row.gioChay}</td>
                    <td style={td({ textAlign: 'center', color: row.gioDung > 0 ? '#dc2626' : '#6b7280', fontWeight: 700 })}>{row.gioDung}</td>
                    <td style={td({ textAlign: 'center', fontWeight: 800, fontSize: 13, color: aColor(avail), background: aBg(avail) })}>
                      {avail != null ? `${avail}%` : '—'}
                    </td>
                    <td style={td({ textAlign: 'center', color: row.soLanDung > 0 ? '#dc2626' : '#6b7280', fontWeight: row.soLanDung > 0 ? 700 : 400 })}>{row.soLanDung}</td>
                    <td style={td({ fontSize: 11, color: '#4b5563' })}>{row.lyDoDung || '—'}</td>
                    <td style={td({ fontSize: 11, color: '#9ca3af' })}>—</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )

        return (
          <div style={{ padding: 0 }}>
            {/* Inner tab bar */}
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid #e2e8f0', background: '#f8fafc', padding: '0 12px', overflowX: 'auto' }}>
              <button style={tabBtn(activeTab === 'summary')} onClick={() => setMachineAInnerTab('summary')}>📊 Tổng hợp</button>
              {machineOrder.map(m => (
                <button key={m} style={tabBtn(activeTab === m)} onClick={() => setMachineAInnerTab(m)}>{m}</button>
              ))}
              <div style={{ flex: 1 }} />
              <button onClick={doRefresh} style={{ border: '1px solid #d97706', background: '#fffbeb', color: '#b45309', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, flexShrink: 0, marginLeft: 8 }}>↺ Làm mới</button>
            </div>

            {/* ── Tab Tổng hợp ── */}
            {activeTab === 'summary' && (
              <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 230px)' }}>
                {/* A% theo giai đoạn */}
                {/* Toolbar tùy chọn khoảng thời gian */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 12, color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>Cột Tùy chọn:</span>
                  <DatePicker.RangePicker
                    value={summaryCustomRange}
                    onChange={v => setSummaryCustomRange(v || [dayjs().subtract(29, 'day'), dayjs()])}
                    format="DD/MM/YYYY"
                    size="small"
                    allowClear={false}
                    disabledDate={d => d && d.isAfter(dayjs(), 'day')}
                    style={{ fontSize: 12 }}
                  />
                  <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Chọn khoảng để tính A% cột cuối</span>
                </div>

                {machineSummaryLoading ? (
                  <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>Đang tải dữ liệu tổng hợp...</div>
                ) : (
                  <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                      <tr>
                        <th colSpan={2 + periods.length} style={{ background: '#1e3a5f', color: '#fff', padding: '8px 12px', border: '1px solid #4a6fa5', fontWeight: 800, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                          TỔNG HỢP CHỈ SỐ A (AVAILABILITY) – {tenTo}
                        </th>
                      </tr>
                      <tr>
                        <th colSpan={2 + periods.length} style={{ background: '#2d4f7c', color: '#dbeafe', padding: '4px 12px', textAlign: 'center', border: '1px solid #4a6fa5', fontWeight: 400, fontSize: 11, fontStyle: 'italic' }}>
                          Công thức: Tổng giờ chạy thực tế / Tổng giờ kế hoạch &nbsp;·&nbsp; Mục tiêu ≥ 90% &nbsp;·&nbsp; Dữ liệu 6 tháng gần nhất
                        </th>
                      </tr>
                      <tr>
                        <th style={{ background: '#1e3a5f', color: '#fff', padding: '7px 10px', border: '1px solid #4a6fa5', fontWeight: 700, fontSize: 12, textAlign: 'left' }}>Tên máy</th>
                        <th style={{ background: '#1e3a5f', color: '#fff', padding: '7px 10px', border: '1px solid #4a6fa5', fontWeight: 700, fontSize: 12, textAlign: 'center', width: 90 }}>Mã máy</th>
                        {periods.map(p => (
                          <th key={p.key} style={{ background: p.isCustom ? '#065f46' : '#b45309', color: '#fff', padding: '7px 10px', border: '1px solid #4a6fa5', fontWeight: 700, fontSize: 12, textAlign: 'center', minWidth: p.isCustom ? 160 : undefined }}>
                            {p.label}
                            {p.isCustom && customFrom && customTo && (
                              <div style={{ fontWeight: 400, fontSize: 10, opacity: 0.85, marginTop: 2 }}>
                                {summaryCustomRange[0].format('DD/MM/YY')} → {summaryCustomRange[1].format('DD/MM/YY')}
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sumMachines.length === 0 ? (
                        <tr><td colSpan={2 + periods.length} style={{ textAlign: 'center', padding: '32px 8px', color: '#9ca3af', fontSize: 13, border: '1px solid #e2e8f0' }}>
                          Không có dữ liệu trong 6 tháng gần nhất. Hãy nhập dữ liệu thời gian chạy máy.
                        </td></tr>
                      ) : sumMachines.map((m, idx) => (
                        <tr key={m.tenMay} style={{ background: '#fff' }}>
                          <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 13 }}>{m.tenMay}</td>
                          <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'center', fontFamily: 'monospace', color: '#000099', fontWeight: 600 }}>{m.maMay || '—'}</td>
                          {periods.map(p => {
                            const v = computeAPct(m.tenMay, p.from, p.to || null)
                            return (
                              <td key={p.key} style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 800, fontSize: 14, color: aColor(v), background: aBg(v) }}>
                                {v != null ? `${v}%` : '—'}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={2} style={{ padding: '10px 12px', background: '#1e3a5f', border: '1px solid #1e3a5f', color: '#fff', fontWeight: 700, fontSize: 13, letterSpacing: 0.3 }}>
                          HIỆU SUẤT TỔNG THỂ – {tenTo}
                        </td>
                        {periods.map(p => {
                          const v = computeOverallAPct(p.from, p.to || null)
                          return (
                            <td key={p.key} style={{ padding: '10px 12px', background: v == null ? '#f8fafc' : aBg(v), border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 800, fontSize: 15, color: v == null ? '#9ca3af' : aColor(v) }}>
                              {v != null ? `${v}%` : '—'}
                            </td>
                          )
                        })}
                      </tr>
                    </tfoot>
                  </table>
                )}

                <div style={{ height: 24 }} />

                {/* Pareto analysis */}
                {machineParetoLoading ? (
                  <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>Đang tải phân tích Pareto...</div>
                ) : (
                  <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                      <tr>
                        <th colSpan={9} style={{ background: '#7f1d1d', color: '#fff', padding: '8px 12px', border: '1px solid #991b1b', fontWeight: 800, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                          PHÂN TÍCH NGUYÊN NHÂN DỪNG MÁY – PARETO ANALYSIS
                        </th>
                      </tr>
                      <tr>
                        <th colSpan={9} style={{ background: '#991b1b', color: '#fecaca', padding: '4px 12px', textAlign: 'center', border: '1px solid #b91c1c', fontWeight: 400, fontSize: 11, fontStyle: 'italic' }}>
                          Dữ liệu 6 tháng gần nhất &nbsp;·&nbsp; Phân tích 80/20 để tập trung Kaizen đúng điểm &nbsp;·&nbsp; Hàng cam = TOP nguyên nhân (cộng dồn ≤ 80%)
                        </th>
                      </tr>
                      <tr>
                        {['STT','Tên máy','Mã máy','Nguyên nhân dừng máy','Số lần dừng','Tổng giờ dừng (h)','% Tổng giờ dừng','Cộng dồn %','Tần suất (lần/tuần)'].map(h => (
                          <th key={h} style={{ background: '#fef2f2', color: '#7f1d1d', padding: '6px 8px', border: '1px solid #fca5a5', fontWeight: 700, fontSize: 11, textAlign: 'center', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paretoRows.length === 0 ? (
                        <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px 8px', color: '#9ca3af', fontSize: 13, border: '1px solid #e2e8f0' }}>
                          Không có dữ liệu dừng máy trong 6 tháng gần nhất.
                        </td></tr>
                      ) : paretoRows.map((row, idx) => {
                        const isKey = row.cumul <= 80
                        const bg = isKey ? (idx % 2 === 0 ? '#fff7ed' : '#ffedd5') : (idx % 2 === 0 ? '#fff' : '#f8fafc')
                        const td = (extra = {}) => ({ padding: '6px 8px', border: '1px solid #e2e8f0', background: bg, ...extra })
                        return (
                          <tr key={idx}>
                            <td style={td({ textAlign: 'center', color: '#94a3b8', fontSize: 11 })}>{row.stt}</td>
                            <td style={td({ fontWeight: isKey ? 600 : 400 })}>{row.tenMay}</td>
                            <td style={td({ textAlign: 'center', fontFamily: 'monospace', color: '#000099', fontWeight: 600 })}>{row.maMay || '—'}</td>
                            <td style={td({ fontWeight: isKey ? 700 : 400, color: isKey ? '#b45309' : '#374151' })}>{row.lyDo}</td>
                            <td style={td({ textAlign: 'center', fontWeight: 700 })}>{row.soLanDung}</td>
                            <td style={td({ textAlign: 'center', fontWeight: 700, color: '#dc2626' })}>{row.tongGioDung}</td>
                            <td style={td({ textAlign: 'center', fontWeight: 700 })}>{row.phanTram}%</td>
                            <td style={td({ textAlign: 'center', fontWeight: isKey ? 800 : 400, color: isKey ? '#dc2626' : '#6b7280' })}>{row.cumul}%</td>
                            <td style={td({ textAlign: 'center' })}>{row.tanSuat}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
                <div style={{ height: 16 }} />
              </div>
            )}

            {/* ── Per-machine tabs ── */}
            {activeTab !== 'summary' && (
              machineALoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Đang tải...</div>
              ) : (
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 230px)' }}>
                  {(machineMap[activeTab] || []).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 8px', color: '#9ca3af', fontSize: 13 }}>
                      Không có dữ liệu. Hãy thay đổi bộ lọc ngày hoặc nhấn ↺ Làm mới.
                    </div>
                  ) : renderMachineTable(activeTab, machineMap[activeTab] || [])}
                </div>
              )
            )}

            {/* Modal chi tiết / chỉnh sửa runtime logs */}
            <Modal
              open={machineADetailRow != null}
              onCancel={() => setMachineADetailRow(null)}
              footer={null} width={780} destroyOnClose={false}
              title={null} closable={false}
              styles={{ body: { padding: 0 } }}
            >
              {machineADetailRow && (() => {
                const dr = machineADetailRow
                const avail = dr.availPct
                const availColor = avail == null ? '#6b7280' : avail >= 90 ? '#16a34a' : '#dc2626'
                const LC = ({ children }) => (
                  <div style={{ padding: '7px 12px', background: '#f1f5f9', fontWeight: 600, fontSize: 12, color: '#64748b', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>{children}</div>
                )
                const VC = ({ children }) => (
                  <div style={{ padding: '6px 12px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', fontSize: 13, minHeight: 36 }}>{children}</div>
                )
                return (
                  <div style={{ borderRadius: 8, overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ background: '#1e3a5f', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>⚙️</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dr.tenMay}</div>
                        <div style={{ color: '#93c5fd', fontSize: 11, marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {dr.maMay && <span>Mã: <b>{dr.maMay}</b></span>}
                          <span>Ngày: <b>{dayjs(dr.ngay).isValid() ? dayjs(dr.ngay).format('DD/MM/YYYY') : dr.ngay}</b></span>
                          {dr.toNhom && <span>Tổ: <b>{dr.toNhom}</b></span>}
                        </div>
                      </div>
                      <button onClick={() => setMachineADetailRow(null)}
                        style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', fontSize: 20, padding: 0, lineHeight: 1 }}>✕</button>
                    </div>

                    {/* Body: 2 cột */}
                    <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                      {/* Cột trái: tóm tắt */}
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden', alignSelf: 'start' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                          <LC>Mã máy</LC><VC><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0369a1' }}>{dr.maMay || '—'}</span></VC>
                          <LC>Tổ / Nhóm</LC><VC>{dr.toNhom || '—'}</VC>
                          <LC>Giờ KH (h)</LC><VC><strong>{dr.gioKH}</strong></VC>
                          <LC>Giờ chạy TT (h)</LC><VC><span style={{ color: '#16a34a', fontWeight: 700 }}>{dr.gioChay}</span></VC>
                          <LC>Giờ dừng (h)</LC><VC><span style={{ color: dr.gioDung > 0 ? '#dc2626' : '#6b7280', fontWeight: 700 }}>{dr.gioDung}</span></VC>
                          <LC>A (%)</LC><VC><span style={{ fontWeight: 800, fontSize: 15, color: availColor }}>{avail != null ? `${avail}%` : '—'}</span></VC>
                          <LC>Số lần dừng</LC><VC><span style={{ color: dr.soLanDung > 0 ? '#dc2626' : '#6b7280', fontWeight: 600 }}>{dr.soLanDung}</span></VC>
                          <LC>Lý do dừng</LC><VC><span style={{ fontSize: 12, color: '#4b5563' }}>{dr.lyDoDung || '—'}</span></VC>
                        </div>
                      </div>

                      {/* Cột phải: Ghi chú / CAPA */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderLeft: '1px solid #e2e8f0', paddingLeft: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: 1, paddingBottom: 8, borderBottom: '2px solid #1e3a5f' }}>
                          Ghi chú / CAPA
                        </div>
                        <textarea
                          rows={5}
                          placeholder="Nhập ghi chú hành động khắc phục (CAPA)..."
                          style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit', color: '#374151' }}
                        />
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: -8 }}>
                          * Ghi chú sẽ được cập nhật khi nhấn Lưu bên dưới.
                        </div>
                      </div>
                    </div>

                    {/* Bảng chi tiết log */}
                    <div style={{ padding: '0 20px 16px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        Chi tiết thời gian chạy máy
                        {machineADetailLogs.length > 0 && <span style={{ background: '#3b82f6', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 11 }}>{machineADetailLogs.length} dòng</span>}
                      </div>
                      {machineADetailLoading ? (
                        <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>Đang tải...</div>
                      ) : (() => {
                        const wsInfos = dr.workScheduleInfos?.length
                          ? dr.workScheduleInfos
                          : (dr.workScheduleId ? [{ id: dr.workScheduleId, maSp: null, tenTrinh: null, soLo: null }] : [])
                        const renderTable = (wsId, logs) => (
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                              <thead>
                                <tr>
                                  {['#', 'Từ giờ', 'Đến giờ', 'Trạng thái', 'Lý do dừng', 'Ghi chú', ''].map((h, i) => (
                                    <th key={i} style={{ padding: '6px 8px', background: '#e0f2fe', color: '#0c4a6e', fontWeight: 600, fontSize: 11, textAlign: 'left', borderBottom: '1px solid #bae6fd' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {logs.length === 0 && (
                                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#aaa', padding: '12px 0', fontSize: 12 }}>Chưa có dữ liệu — nhấn "+ Thêm dòng"</td></tr>
                                )}
                                {logs.map((log, idx) => {
                                  const isChay = log.trangThai !== 'Dừng máy'
                                  return (
                                    <tr key={log._id} style={{ background: idx % 2 === 0 ? '#fff' : '#f0f9ff' }}>
                                      <td style={{ padding: '4px 8px', color: '#94a3b8', fontSize: 11, textAlign: 'center', width: 28 }}>{idx + 1}</td>
                                      <td style={{ padding: '3px 6px', width: 95 }}>
                                        <TimePicker format="HH:mm" size="small" style={{ width: '100%' }}
                                          value={log.tuGio ? dayjs(log.tuGio, 'HH:mm') : null}
                                          onChange={(_, s) => updateALog(log._id, { tuGio: s })} />
                                      </td>
                                      <td style={{ padding: '3px 6px', width: 95 }}>
                                        <TimePicker format="HH:mm" size="small" style={{ width: '100%' }}
                                          value={log.denGio ? dayjs(log.denGio, 'HH:mm') : null}
                                          onChange={(_, s) => updateALog(log._id, { denGio: s })} />
                                      </td>
                                      <td style={{ padding: '3px 6px', width: 110 }}>
                                        <select value={log.trangThai || 'Chạy máy'} style={{ width: '100%', border: '1px solid #bae6fd', borderRadius: 5, padding: '3px 5px', fontSize: 12, color: isChay ? '#16a34a' : '#dc2626', fontWeight: 600 }}
                                          onChange={e => updateALog(log._id, { trangThai: e.target.value, lyDo: '' })}>
                                          <option value="Chạy máy">Chạy máy</option>
                                          <option value="Dừng máy">Dừng máy</option>
                                        </select>
                                      </td>
                                      <td style={{ padding: '3px 6px', width: 160 }}>
                                        {(!isChay && !!log.lyDo && !PREDEFINED_REASONS_A.includes(log.lyDo)) ? (
                                          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                                            <input autoFocus value={log.lyDo} placeholder="Nhập lý do..."
                                              style={{ flex: 1, border: '1px solid #bae6fd', borderRadius: 5, padding: '3px 6px', fontSize: 12 }}
                                              onChange={e => updateALog(log._id, { lyDo: e.target.value })} />
                                            <button onClick={() => updateALog(log._id, { lyDo: '' })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 15, padding: '0 2px' }}>↩</button>
                                          </div>
                                        ) : (
                                          <select value={log.lyDo || ''} disabled={isChay} style={{ width: '100%', border: '1px solid #bae6fd', borderRadius: 5, padding: '3px 5px', fontSize: 12, background: isChay ? '#f3f4f6' : '#fff' }}
                                            onChange={e => updateALog(log._id, { lyDo: e.target.value })}>
                                            <option value="">—</option>
                                            {PREDEFINED_REASONS_A.map(o => <option key={o} value={o}>{o}</option>)}
                                            <option value="Khác">Khác...</option>
                                          </select>
                                        )}
                                      </td>
                                      <td style={{ padding: '3px 6px' }}>
                                        <input value={log.ghiChu || ''} placeholder="Ghi chú..." style={{ width: '100%', border: '1px solid #bae6fd', borderRadius: 5, padding: '3px 6px', fontSize: 12 }}
                                          onChange={e => updateALog(log._id, { ghiChu: e.target.value })} />
                                      </td>
                                      <td style={{ padding: '3px 6px', width: 30, textAlign: 'center' }}>
                                        <button onClick={() => removeALog(log._id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )
                        return (
                          <div>
                            {wsInfos.map(wsInfo => {
                              const wsLogs = machineADetailLogs.filter(l => String(l.workScheduleId) === String(wsInfo.id))
                              return (
                                <div key={wsInfo.id} style={{ marginBottom: 16 }}>
                                  {/* Sub-table header: product info */}
                                  <div style={{ background: '#1e3a5f', color: '#fff', padding: '6px 12px', borderRadius: '6px 6px 0 0', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 0 }}>
                                    {wsInfo.tenTrinh
                                      ? <span style={{ fontWeight: 700, fontSize: 13 }}>{wsInfo.tenTrinh}</span>
                                      : <span style={{ color: '#93c5fd', fontSize: 12 }}>WorkSchedule #{wsInfo.id}</span>
                                    }
                                    {wsInfo.maSp && <span style={{ background: '#2d4f7c', borderRadius: 4, padding: '1px 7px', fontSize: 11, color: '#bae6fd' }}>SP: {wsInfo.maSp}</span>}
                                    {wsInfo.soLo && <span style={{ background: '#2d4f7c', borderRadius: 4, padding: '1px 7px', fontSize: 11, color: '#bae6fd' }}>Lô: {wsInfo.soLo}</span>}
                                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#93c5fd' }}>{wsLogs.length} dòng</span>
                                  </div>
                                  {renderTable(wsInfo.id, wsLogs)}
                                  <button onClick={() => addALog(wsInfo.id)}
                                    style={{ border: '1px dashed #3b82f6', background: '#eff6ff', color: '#1d4ed8', borderRadius: 5, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>
                                    + Thêm dòng
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })()}
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#f8fafc' }}>
                      <button onClick={() => setMachineADetailRow(null)}
                        style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: 6, padding: '7px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>
                        Đóng
                      </button>
                      <button onClick={saveMachineADetail} disabled={machineADetailSaving}
                        style={{ border: 'none', background: machineADetailSaving ? '#93c5fd' : '#1e3a5f', color: '#fff', borderRadius: 6, padding: '7px 22px', cursor: machineADetailSaving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700 }}>
                        {machineADetailSaving ? 'Đang lưu...' : '✓ Lưu'}
                      </button>
                    </div>
                  </div>
                )
              })()}
            </Modal>
          </div>
        )
      })()}

      {/* ── Chỉ số P: Detail modal (chi tiết ca từ work schedule) ── */}
      <Modal open={!!machinePDetailRow} onCancel={() => setMachinePDetailRow(null)} footer={null} width={720} destroyOnClose styles={{ body: { padding: 0 } }}>
        {machinePDetailRow && (() => {
          const dr = machinePDetailRow
          const pval = dr.pPct
          const pColor2 = pval == null ? '#9ca3af' : pval >= 95 ? '#16a34a' : pval >= 80 ? '#d97706' : '#dc2626'
          const LC = ({ children }) => <div style={{ padding: '7px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{children}</div>
          const VC = ({ children }) => <div style={{ padding: '7px 12px', borderBottom: '1px solid #e2e8f0', fontSize: 13 }}>{children}</div>
          return (
            <div>
              {/* Header */}
              <div style={{ background: '#4c1d95', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>⚡</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dr.tenMay}</div>
                  <div style={{ color: '#c4b5fd', fontSize: 11, marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {dr.maMay && <span>Mã: <b>{dr.maMay}</b></span>}
                    <span>Ngày: <b>{dayjs(dr.ngay).isValid() ? dayjs(dr.ngay).format('DD/MM/YYYY') : dr.ngay}</b></span>
                    {dr.toNhom && <span>Tổ: <b>{dr.toNhom}</b></span>}
                  </div>
                </div>
                <button onClick={() => setMachinePDetailRow(null)}
                  style={{ background: 'none', border: 'none', color: '#c4b5fd', cursor: 'pointer', fontSize: 20, padding: 0, lineHeight: 1 }}>✕</button>
              </div>
              {/* Body */}
              <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden', alignSelf: 'start' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr' }}>
                    <LC>Mã máy</LC><VC><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed' }}>{dr.maMay || '—'}</span></VC>
                    <LC>Tổ / Nhóm</LC><VC>{dr.toNhom || '—'}</VC>
                    <LC>Tốc độ chuẩn</LC><VC><span style={{ fontWeight: 600 }}>{dr.tocDoChuanLabel || '—'}</span></VC>
                    <LC>SL lý thuyết</LC><VC><span style={{ fontWeight: 600 }}>{dr.slLyThuyet != null ? Number(dr.slLyThuyet).toLocaleString('vi-VN') : '—'}</span></VC>
                    <LC>SL thực tế</LC><VC><span style={{ color: '#1d4ed8', fontWeight: 700 }}>{dr.slThucTe != null ? Number(dr.slThucTe).toLocaleString('vi-VN') : '—'}</span></VC>
                    <LC>P (%)</LC><VC><span style={{ fontWeight: 800, fontSize: 15, color: pColor2 }}>{pval != null ? `${pval}%` : '—'}</span></VC>
                    <LC>Tổn thất</LC><VC><span style={{ color: dr.tonThat > 0 ? '#dc2626' : '#6b7280', fontWeight: 600 }}>{dr.tonThat != null ? Number(dr.tonThat).toLocaleString('vi-VN') : '—'}</span></VC>
                  </div>
                </div>
                {/* Cột phải: tóm tắt live từ machinePDetailLogs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderLeft: '1px solid #ede9fe', paddingLeft: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#4c1d95', textTransform: 'uppercase', letterSpacing: 1, paddingBottom: 8, borderBottom: '2px solid #4c1d95' }}>
                    Tóm tắt theo ca / lô
                  </div>
                  {machinePDetailLoading ? (
                    <div style={{ color: '#9ca3af', fontSize: 11 }}>Đang tải...</div>
                  ) : machinePDetailLogs.length === 0 ? (
                    <div style={{ color: '#9ca3af', fontSize: 11 }}>Thêm dòng trong bảng bên dưới để xem tóm tắt.</div>
                  ) : (() => {
                    const totalLT = machinePDetailLogs.reduce((s, l) => s + (Number(l.slLyThuyet) || 0), 0)
                    const totalTT = machinePDetailLogs.reduce((s, l) => s + (Number(l.slThucTe) || 0), 0)
                    const pTong = totalLT > 0 ? Math.round(totalTT / totalLT * 1000) / 10 : null
                    const tonThatTong = Math.round((totalLT - totalTT) * 10) / 10
                    const pColor3 = pTong == null ? '#9ca3af' : pTong >= 95 ? '#16a34a' : pTong >= 80 ? '#d97706' : '#dc2626'
                    // Tổn thất by nguyenNhan
                    const byLoss = {}
                    machinePDetailLogs.forEach(l => {
                      const lost = (Number(l.slLyThuyet) || 0) - (Number(l.slThucTe) || 0)
                      if (lost > 0) {
                        const cat = l.nguyenNhan || '(Chưa phân loại)'
                        byLoss[cat] = (byLoss[cat] || 0) + lost
                      }
                    })
                    return (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                          {[
                            { label: 'SL lý thuyết', value: totalLT.toLocaleString('vi-VN'), color: '#374151' },
                            { label: 'SL thực tế', value: totalTT.toLocaleString('vi-VN'), color: '#1d4ed8' },
                            { label: 'P tổng', value: pTong != null ? `${pTong}%` : '—', color: pColor3 },
                            { label: 'Tổn thất', value: tonThatTong > 0 ? tonThatTong.toLocaleString('vi-VN') : '0', color: tonThatTong > 0 ? '#dc2626' : '#6b7280' },
                          ].map(s => (
                            <div key={s.label} style={{ background: '#f5f3ff', borderRadius: 6, padding: '8px 10px' }}>
                              <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>{s.label}</div>
                              <div style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{s.value}</div>
                            </div>
                          ))}
                        </div>
                        {Object.keys(byLoss).length > 0 && (
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#4c1d95', textTransform: 'uppercase', marginBottom: 6 }}>Tổn thất theo loại</div>
                            {Object.entries(byLoss).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
                              <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #ede9fe', fontSize: 11 }}>
                                <span style={{ color: '#374151' }}>{cat}</span>
                                <span style={{ fontWeight: 700, color: '#dc2626' }}>{val.toLocaleString('vi-VN')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
              {/* Bảng chi tiết ca */}
              <div style={{ padding: '0 20px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Chi tiết sản lượng theo ca
                  {machinePDetailLogs.length > 0 && <span style={{ background: '#7c3aed', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 11 }}>{machinePDetailLogs.length} dòng</span>}
                </div>
                {machinePDetailLoading ? (
                  <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>Đang tải...</div>
                ) : (() => {
                  const wsInfos = (dr.workScheduleInfos?.length
                    ? dr.workScheduleInfos
                    : (dr.workScheduleId ? [{ id: dr.workScheduleId, maSp: null, tenTrinh: null, soLo: null }] : [])
                  ).filter(w => !w.ngayThucHien || (
                    w.ngayThucHien <= dr.ngay &&
                    w.ngayThucHien >= dayjs(dr.ngay).subtract(7, 'day').format('YYYY-MM-DD')
                  ))
                  const renderTable = (wsId, logs) => (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr>
                            {['#', 'Ca / Lô', 'SL lý thuyết', 'SL thực tế', 'P ca (%)', 'Nguyên nhân', ''].map((h, i) => (
                              <th key={i} style={{ padding: '6px 8px', background: '#f5f3ff', color: '#4c1d95', fontWeight: 600, fontSize: 11, textAlign: 'left', borderBottom: '1px solid #a78bfa' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {logs.length === 0 && (
                            <tr><td colSpan={7} style={{ textAlign: 'center', color: '#aaa', padding: '12px 0', fontSize: 12 }}>Chưa có dữ liệu — nhấn "+ Thêm dòng"</td></tr>
                          )}
                          {logs.map((log, idx) => {
                            const pCa = log.slLyThuyet > 0 && log.slThucTe != null ? Math.round(log.slThucTe / log.slLyThuyet * 1000) / 10 : null
                            return (
                              <tr key={log._id} style={{ background: idx % 2 === 0 ? '#fff' : '#faf5ff' }}>
                                <td style={{ padding: '4px 8px', color: '#94a3b8', fontSize: 11, textAlign: 'center', width: 28 }}>{idx + 1}</td>
                                <td style={{ padding: '3px 6px', width: 90 }}>
                                  <select value={log.caLo || ''} style={{ width: '100%', border: '1px solid #a78bfa', borderRadius: 5, padding: '3px 5px', fontSize: 12, fontWeight: 600 }}
                                    onChange={e => updatePDetailLog(log._id, { caLo: e.target.value })}>
                                    <option value="">—</option>
                                    {['Ca 1', 'Ca 2', 'Ca 3', 'Lô 1', 'Lô 2'].map(o => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                </td>
                                <td style={{ padding: '3px 6px', width: 110 }}>
                                  <input type="number" value={log.slLyThuyet ?? ''} placeholder="SP tối đa" style={{ width: '100%', border: '1px solid #a78bfa', borderRadius: 5, padding: '3px 6px', fontSize: 12, textAlign: 'right' }}
                                    onChange={e => updatePDetailLog(log._id, { slLyThuyet: e.target.value === '' ? null : Number(e.target.value) })} />
                                </td>
                                <td style={{ padding: '3px 6px', width: 110 }}>
                                  <input type="number" value={log.slThucTe ?? ''} placeholder="SP thực tế" style={{ width: '100%', border: '1px solid #a78bfa', borderRadius: 5, padding: '3px 6px', fontSize: 12, textAlign: 'right', color: '#1d4ed8', fontWeight: 700 }}
                                    onChange={e => updatePDetailLog(log._id, { slThucTe: e.target.value === '' ? null : Number(e.target.value) })} />
                                </td>
                                <td style={{ padding: '3px 6px', width: 70, textAlign: 'center', fontWeight: 700, color: pCa == null ? '#9ca3af' : pCa >= 95 ? '#16a34a' : pCa >= 80 ? '#d97706' : '#dc2626' }}>
                                  {pCa != null ? `${pCa}%` : '—'}
                                </td>
                                <td style={{ padding: '3px 6px' }}>
                                  <select value={log.nguyenNhan || ''} style={{ width: '100%', border: '1px solid #a78bfa', borderRadius: 5, padding: '3px 5px', fontSize: 11 }}
                                    onChange={e => updatePDetailLog(log._id, { nguyenNhan: e.target.value || null })}>
                                    <option value="">— Chọn loại —</option>
                                    {SHIFT_LOSS_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                </td>
                                <td style={{ padding: '3px 6px', width: 30, textAlign: 'center' }}>
                                  <button onClick={() => removePDetailLog(log._id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                  const filledWsInfos = wsInfos.filter(wsInfo =>
                    machinePDetailLogs.some(l => String(l.workScheduleId) === String(wsInfo.id))
                  )
                  const emptyWsInfos = wsInfos.filter(wsInfo =>
                    !machinePDetailLogs.some(l => String(l.workScheduleId) === String(wsInfo.id))
                  )
                  return (
                    <div>
                      {filledWsInfos.length === 0 && emptyWsInfos.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px 0', fontSize: 12 }}>Chưa có dữ liệu — nhấn "+ Thêm dòng" để ghi nhận ca.</div>
                      )}
                      {filledWsInfos.map(wsInfo => {
                        const wsLogs = machinePDetailLogs.filter(l => String(l.workScheduleId) === String(wsInfo.id))
                        return (
                          <div key={wsInfo.id} style={{ marginBottom: 16 }}>
                            <div style={{ background: '#4c1d95', color: '#fff', padding: '6px 12px', borderRadius: '6px 6px 0 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 0 }}>
                              {wsInfo.tenTrinh
                                ? <span style={{ fontWeight: 700, fontSize: 13 }}>{wsInfo.tenTrinh}</span>
                                : <span style={{ color: '#c4b5fd', fontSize: 12 }}>Lô #{wsInfo.id}</span>}
                              {wsInfo.maSp && <span style={{ background: '#5b21b6', borderRadius: 4, padding: '1px 7px', fontSize: 11, color: '#e9d5ff' }}>SP: {wsInfo.maSp}</span>}
                              {wsInfo.soLo && <span style={{ background: '#5b21b6', borderRadius: 4, padding: '1px 7px', fontSize: 11, color: '#e9d5ff' }}>Lô: {wsInfo.soLo}</span>}
                              {wsInfo.ngayThucHien && <span style={{ background: '#3b0764', borderRadius: 4, padding: '1px 7px', fontSize: 11, color: '#ddd6fe' }}>{dayjs(wsInfo.ngayThucHien).format('DD/MM')}</span>}
                              {wsInfo.coLo != null && <span style={{ background: '#3b0764', borderRadius: 4, padding: '1px 7px', fontSize: 11, color: '#ddd6fe' }}>Cỡ lô: {Number(wsInfo.coLo).toLocaleString('vi-VN')}</span>}
                              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#c4b5fd' }}>{wsLogs.length} dòng</span>
                            </div>
                            {renderTable(wsInfo.id, wsLogs)}
                            <button onClick={() => addPDetailLog(wsInfo.id)}
                              style={{ border: '1px dashed #7c3aed', background: '#f5f3ff', color: '#5b21b6', borderRadius: 5, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>
                              + Thêm dòng
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
              {/* Footer */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#f8fafc' }}>
                <button onClick={() => setMachinePDetailRow(null)}
                  style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: 6, padding: '7px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>
                  Đóng
                </button>
                <button onClick={saveMachinePDetail} disabled={machinePDetailSaving}
                  style={{ border: 'none', background: machinePDetailSaving ? '#a78bfa' : '#4c1d95', color: '#fff', borderRadius: 6, padding: '7px 22px', cursor: machinePDetailSaving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700 }}>
                  {machinePDetailSaving ? 'Đang lưu...' : '✓ Lưu'}
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* ── Tab: Chỉ số P (Performance) ── */}
      {innerTab === 'machine_p' && (() => {
        const year = (filters.dateRange?.[0] || dayjs()).year()
        const tenTo = congDoan === 'BBC1' ? 'BBC1' : congDoan === 'DG' ? 'ĐG' : congDoan === 'CC' ? 'CC' : `Tổ ${congDoan}`
        const doRefresh = () => setMachinePVersion(v => v + 1)

        const thsP = [
          { label: 'STT', w: 28 },
          { label: 'Ngày', w: 90 },
          { label: 'Tên sản phẩm', w: 260 },
          { label: 'Số lô', w: 80 },
          { label: 'Tổ/Nhóm', w: 80 },
          { label: 'Tốc độ chuẩn (Lý thuyết)', w: 130 },
          { label: 'SL lý thuyết tối đa', w: 110 },
          { label: 'SL thực tế sản xuất', w: 110 },
          { label: 'P (%)', w: 70 },
          { label: 'Tồn thất tốc độ (SP/ca)', w: 110 },
          { label: 'Nguyên nhân giảm tốc', w: 200 },
          { label: 'Ghi chú / Hành động', w: 180 },
        ]
        const NCOLS_P = thsP.length
        const thBase = { padding: '6px 8px', textAlign: 'center', border: '1px solid #5b21b6', fontWeight: 700, fontSize: 11, letterSpacing: 0.5, color: '#fff' }

        // Group by machine for per-machine tabs
        const machineOrder = []
        const machineMap = {}
        machinePData.forEach(row => {
          if (!machineMap[row.tenMay]) { machineMap[row.tenMay] = []; machineOrder.push(row.tenMay) }
          machineMap[row.tenMay].push(row)
        })

        const activePTab = machinePInnerTab === 'summary' || machineOrder.includes(machinePInnerTab)
          ? machinePInnerTab : 'summary'

        const pColor = v => v == null ? '#9ca3af' : v >= 95 ? '#16a34a' : v >= 80 ? '#d97706' : '#dc2626'
        const pBg   = v => v == null ? 'transparent' : v >= 95 ? '#f0fdf4' : v >= 80 ? '#fffbeb' : '#fef2f2'

        const tabBtn = (active) => ({
          background: active ? '#4c1d95' : 'transparent',
          color: active ? '#fff' : '#475569',
          border: 'none', borderBottom: active ? '2px solid #4c1d95' : '2px solid transparent',
          padding: '8px 14px', cursor: 'pointer', fontSize: 12,
          fontWeight: active ? 700 : 400, whiteSpace: 'nowrap', marginBottom: -2,
        })

        const savePerfField = async (ngay, tenMay, patch) => {
          const key = `${ngay}|${tenMay}`
          setSavingPerfRow(key)
          try {
            const { data: saved } = await api.put('/machine-perf/log', null, {
              params: { ngay, tenMay, ...patch }
            })
            setMachinePData(prev => prev.map(r =>
              r.ngay === ngay && r.tenMay === tenMay ? { ...r, ...saved } : r
            ))
            setMachinePSummaryData(prev => prev.map(r =>
              r.ngay === ngay && r.tenMay === tenMay ? { ...r, ...saved } : r
            ))
          } catch { message.error('Không thể lưu') }
          finally { setSavingPerfRow(null); setEditingPCell(null) }
        }

        const saveSpeedConfig = async (tenMay, patch) => {
          try {
            await api.put('/machine-perf/speed-config', null, { params: { tenMay, ...patch } })
            setMachinePSpeedConfigs(prev => ({ ...prev, [tenMay]: { ...(prev[tenMay] || {}), ...patch } }))
            setMachinePData(prev => prev.map(r => {
              if (r.tenMay !== tenMay) return r
              const slLT = patch.slLyThuyet ?? r.slLyThuyet
              const slTT = r.slThucTe
              const pPct = slLT > 0 && slTT != null ? Math.round(slTT / slLT * 1000) / 10 : r.pPct
              const tonThat = slLT != null && slTT != null ? Math.round((slLT - slTT) * 10) / 10 : r.tonThat
              return { ...r, ...patch, slLyThuyet: slLT, pPct, tonThat }
            }))
          } catch { message.error('Không thể lưu cấu hình tốc độ') }
          finally { setEditingPCell(null) }
        }

        const addPerfRow = async () => {
          const { ngay, tenMay, slThucTe, slLyThuyet, nguyenNhan, ghiChu } = addPerfForm
          if (!ngay || !tenMay) { message.warning('Vui lòng chọn ngày và máy'); return }
          try {
            const { data: saved } = await api.put('/machine-perf/log', null, {
              params: { ngay, tenMay, slThucTe: slThucTe || undefined, slLyThuyet: slLyThuyet || undefined, nguyenNhanGiamToc: nguyenNhan || undefined, ghiChu: ghiChu || undefined }
            })
            message.success('Đã thêm dòng')
            setAddPerfOpen(false)
            setAddPerfForm({ ngay: dayjs().format('YYYY-MM-DD'), tenMay: '', slThucTe: null, slLyThuyet: null, nguyenNhan: '', ghiChu: '' })
            setMachinePData(prev => {
              const exists = prev.find(r => r.ngay === saved.ngay && r.tenMay === saved.tenMay)
              if (exists) return prev.map(r => r.ngay === saved.ngay && r.tenMay === saved.tenMay ? { ...r, ...saved } : r)
              return [...prev, saved].sort((a, b) => b.ngay.localeCompare(a.ngay) || a.tenMay.localeCompare(b.tenMay))
            })
          } catch { message.error('Không thể thêm dòng') }
        }

        const deletePerfRow = async (ngay, tenMay) => {
          try {
            await api.delete('/machine-perf/log', { params: { ngay, tenMay } })
            setMachinePData(prev => prev.filter(r => !(r.ngay === ngay && r.tenMay === tenMay)))
            message.success('Đã xóa')
          } catch { message.error('Không thể xóa') }
        }

        const renderEditableCell = (row, field, displayVal, isNumeric = false) => {
          const key = `${row.ngay}|${row.tenMay}|${field}`
          const isEditing = editingPCell?.key === key
          if (isEditing) {
            return (
              <InputNumber
                size="small" autoFocus style={{ width: '100%' }} min={0}
                value={editingPCell.value}
                formatter={v => v != null ? String(v).replace('.', ',') : ''}
                parser={v => v ? v.replace(',', '.').replace(/[^\d.]/g, '') : ''}
                onChange={v => setEditingPCell(prev => ({ ...prev, value: v }))}
                onPressEnter={() => savePerfField(row.ngay, row.tenMay, { [field]: editingPCell.value })}
                onBlur={() => savePerfField(row.ngay, row.tenMay, { [field]: editingPCell.value })}
                onClick={e => e.stopPropagation()}
                onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setEditingPCell(null) } }}
              />
            )
          }
          return (
            <span
              onClick={e => { e.stopPropagation(); setEditingPCell({ key, value: isNumeric ? (row[field] ?? null) : row[field] }) }}
              style={{ cursor: 'pointer', display: 'block', width: '100%', minHeight: 20 }}
              title="Click để chỉnh sửa"
            >
              {displayVal ?? <span style={{ color: '#d1d5db' }}>—</span>}
              <span style={{ fontSize: 9, color: '#c4b5fd', marginLeft: 3 }}>✎</span>
            </span>
          )
        }

        const renderSelectCell = (row, field, options, displayVal) => {
          const key = `${row.ngay}|${row.tenMay}|${field}`
          const isEditing = editingPCell?.key === key
          if (isEditing) {
            return (
              <select
                autoFocus
                value={editingPCell.value || ''}
                onChange={e => setEditingPCell(prev => ({ ...prev, value: e.target.value }))}
                onBlur={() => savePerfField(row.ngay, row.tenMay, { [field]: editingPCell.value })}
                onClick={e => e.stopPropagation()}
                onKeyDown={e => {
                  if (e.key === 'Enter') savePerfField(row.ngay, row.tenMay, { [field]: editingPCell.value })
                  if (e.key === 'Escape') { e.stopPropagation(); setEditingPCell(null) }
                }}
                style={{ fontSize: 11, width: '100%', border: '1px solid #7c3aed', borderRadius: 4, padding: '2px 4px' }}
              >
                <option value="">-- Chọn nguyên nhân --</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            )
          }
          return (
            <span
              onClick={e => { e.stopPropagation(); setEditingPCell({ key, value: row[field] || '' }) }}
              style={{ cursor: 'pointer', display: 'block', width: '100%', minHeight: 20, fontSize: 11, color: row[field] ? '#374151' : '#d1d5db' }}
              title="Click để chỉnh sửa"
            >
              {displayVal || <span style={{ color: '#d1d5db' }}>—</span>}
              <span style={{ fontSize: 9, color: '#c4b5fd', marginLeft: 3 }}>✎</span>
            </span>
          )
        }

        const renderMachinePTable = (tenMay, rows) => (
          <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', tableLayout: 'fixed' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr>
                <th colSpan={NCOLS_P} style={{ background: '#2e1065', color: '#fff', padding: '8px 12px', border: '1px solid #5b21b6', fontWeight: 800, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  BIỂU MÁY THEO DÕI CHỈ SỐ P (PERFORMANCE) – {tenTo}{tenMay !== '__all' ? ` · ${tenMay}` : ''}
                </th>
              </tr>
              <tr>
                <th colSpan={NCOLS_P} style={{ background: '#3b0764', color: '#e9d5ff', padding: '4px 12px', textAlign: 'center', border: '1px solid #5b21b6', fontWeight: 400, fontSize: 11, fontStyle: 'italic' }}>
                  Performance = Σ(SL thực tế × T chuẩn SP) / Σ(Thời gian chạy) &nbsp;·&nbsp; Mục tiêu ≥ 95% &nbsp;·&nbsp; Tính từ chi tiết ca sản xuất &nbsp;·&nbsp; {year}
                </th>
              </tr>
              <tr>
                <th colSpan={5} style={{ ...thBase, background: '#2e1065' }}>THÔNG TIN SẢN XUẤT</th>
                <th colSpan={3} style={{ ...thBase, background: '#1e3a5f' }}>THÔNG SỐ TỐC ĐỘ</th>
                <th colSpan={2} style={{ ...thBase, background: '#7c3aed' }}>P (%)</th>
                <th colSpan={2} style={{ ...thBase, background: '#5b21b6' }}>PHÂN TÍCH TỔN THẤT</th>
              </tr>
              <tr>
                {thsP.map(h => (
                  <th key={h.label} style={{ background: '#f5f3ff', color: '#1e293b', padding: '6px 6px', border: '1px solid #a78bfa', fontWeight: 700, fontSize: 11, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={NCOLS_P} style={{ textAlign: 'center', padding: '32px 8px', color: '#9ca3af', border: '1px solid #e2e8f0' }}>
                  Chưa có dữ liệu. Nhấn "Thêm dòng" để nhập chỉ số P.
                </td></tr>
              ) : (() => {
                // Expand each row into sub-rows, one per product (wsInfo)
                const expandedRows = []
                rows.forEach((row, parentIdx) => {
                  const d = row.workScheduleInfos?.[0]?.ngayThucHien
                  const wsGroup = (d ? row.workScheduleInfos.filter(w => w.ngayThucHien === d) : row.workScheduleInfos) || []
                  if (wsGroup.length <= 1) {
                    expandedRows.push({ row, wsInfo: wsGroup[0] || null, wsIdx: 0, wsCount: 1, parentIdx })
                  } else {
                    wsGroup.forEach((wsInfo, wsIdx) => {
                      expandedRows.push({ row, wsInfo, wsIdx, wsCount: wsGroup.length, parentIdx })
                    })
                  }
                })
                return expandedRows.map(({ row, wsInfo, wsIdx, wsCount, parentIdx }) => {
                  const pval = row.pPct
                  const rowBg = parentIdx % 2 === 0 ? '#fff' : '#faf5ff'
                  const td = (extra = {}) => ({ padding: '6px 6px', border: '1px solid #e2e8f0', background: rowBg, overflow: 'hidden', textOverflow: 'ellipsis', ...extra })
                  const isSaving = savingPerfRow === `${row.ngay}|${row.tenMay}`
                  return (
                    <tr key={`${parentIdx}-${wsIdx}`} style={{ opacity: isSaving ? 0.6 : 1, cursor: 'pointer' }} title="Click để xem chi tiết sản lượng theo ca" onClick={() => openMachinePDetail(row)}>
                      {wsIdx === 0 && <td rowSpan={wsCount} style={td({ textAlign: 'center', color: '#94a3b8', fontSize: 11 })}>{parentIdx + 1}</td>}
                      {wsIdx === 0 && <td rowSpan={wsCount} style={td({ whiteSpace: 'nowrap', fontWeight: 500 })}>{dayjs(row.ngay).isValid() ? dayjs(row.ngay).format('DD/MM/YYYY') : row.ngay}</td>}
                      <td style={td({ fontWeight: 600 })}>{wsInfo?.tenTrinh || row.tenMay}</td>
                      <td style={td({ textAlign: 'center', fontFamily: 'monospace', color: '#000099', fontWeight: 600 })}>{wsInfo?.soLo || '—'}</td>
                      {wsIdx === 0 && <td rowSpan={wsCount} style={td({ textAlign: 'center' })}>{row.toNhom || '—'}</td>}
                      {/* Tốc độ chuẩn — click để sửa speed config */}
                      {wsIdx === 0 && (
                        <td rowSpan={wsCount} style={td({ textAlign: 'center', fontSize: 11 })}
                          onClick={e => { e.stopPropagation(); setEditingPCell({ key: `${row.ngay}|${row.tenMay}|tocDoChuanLabel`, value: machinePSpeedConfigs[row.tenMay]?.tocDoChuanLabel || '' }) }}
                          title="Click để chỉnh sửa tốc độ chuẩn"
                        >
                          {editingPCell?.key === `${row.ngay}|${row.tenMay}|tocDoChuanLabel` ? (
                            <input
                              autoFocus defaultValue={machinePSpeedConfigs[row.tenMay]?.tocDoChuanLabel || ''}
                              style={{ width: '100%', fontSize: 11, border: '1px solid #7c3aed', borderRadius: 4, padding: '2px 4px' }}
                              onBlur={e => saveSpeedConfig(row.tenMay, { tocDoChuanLabel: e.target.value })}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveSpeedConfig(row.tenMay, { tocDoChuanLabel: e.target.value })
                                if (e.key === 'Escape') { e.stopPropagation(); setEditingPCell(null) }
                              }}
                              onClick={e => e.stopPropagation()}
                              placeholder="VD: 8.000 SP/h"
                            />
                          ) : (
                            <span style={{ cursor: 'pointer' }}>
                              {row.tocDoChuanLabel || <span style={{ color: '#d1d5db' }}>—</span>}
                              <span style={{ fontSize: 9, color: '#c4b5fd', marginLeft: 3 }}>✎</span>
                            </span>
                          )}
                        </td>
                      )}
                      {/* SL lý thuyết */}
                      {wsIdx === 0 && (
                        <td rowSpan={wsCount} style={td({ textAlign: 'right' })} onClick={e => e.stopPropagation()}>
                          {renderEditableCell(row, 'slLyThuyet', row.slLyThuyet != null ? Number(row.slLyThuyet).toLocaleString('vi-VN') : null, true)}
                        </td>
                      )}
                      {/* SL thực tế */}
                      {wsIdx === 0 && (
                        <td rowSpan={wsCount} style={td({ textAlign: 'right', color: '#1d4ed8', fontWeight: 700 })} onClick={e => e.stopPropagation()}>
                          {renderEditableCell(row, 'slThucTe', row.slThucTe != null ? Number(row.slThucTe).toLocaleString('vi-VN') : null, true)}
                        </td>
                      )}
                      {/* P% */}
                      {wsIdx === 0 && (
                        <td rowSpan={wsCount} style={td({ textAlign: 'center', fontWeight: 800, fontSize: 13, color: pColor(pval), background: pBg(pval) })}>
                          {pval != null ? `${pval}%` : '—'}
                        </td>
                      )}
                      {/* Tồn thất */}
                      {wsIdx === 0 && (
                        <td rowSpan={wsCount} style={td({ textAlign: 'right', color: row.tonThat > 0 ? '#dc2626' : '#6b7280', fontWeight: row.tonThat > 0 ? 700 : 400 })}>
                          {row.tonThat != null ? Number(row.tonThat).toLocaleString('vi-VN') : '—'}
                        </td>
                      )}
                      {/* Nguyên nhân */}
                      {wsIdx === 0 && (
                        <td rowSpan={wsCount} style={td({ fontSize: 11 })} onClick={e => e.stopPropagation()}>
                          {renderSelectCell(row, 'nguyenNhanGiamToc', PREDEFINED_REASONS_P, row.nguyenNhanGiamToc)}
                        </td>
                      )}
                      {/* Ghi chú */}
                      {wsIdx === 0 && (
                        <td rowSpan={wsCount} style={td({ fontSize: 11 })}>
                          {renderEditableCell(row, 'ghiChu', row.ghiChu, false)}
                        </td>
                      )}
                    </tr>
                  )
                })
              })()}
            </tbody>
          </table>
        )

        // ── Summary: P% by machine × period ──
        // Source: machinePShiftSummaryData (from MachineShiftPerfLog per ca)
        // Formula: P = Σ(SL_TT × T_chuẩn) / Σ(SL_LT × T_chuẩn) = Σ SL_TT / Σ SL_LT per ca
        const today2 = dayjs()
        const customPFrom = machinePSummaryCustomRange?.[0]?.format('YYYY-MM-DD')
        const customPTo   = machinePSummaryCustomRange?.[1]?.format('YYYY-MM-DD')
        const sumPeriods = [
          { key: 'week',   label: 'Tuần (7 ngày)',   from: today2.subtract(6,   'day').format('YYYY-MM-DD') },
          { key: 'month',  label: 'Tháng (30 ngày)', from: today2.subtract(29,  'day').format('YYYY-MM-DD') },
          { key: 'q3',     label: '3 Tháng',          from: today2.subtract(89,  'day').format('YYYY-MM-DD') },
          { key: 'half',   label: '6 Tháng',          from: today2.subtract(179, 'day').format('YYYY-MM-DD') },
          { key: 'custom', label: 'Tùy chọn',         from: customPFrom, to: customPTo, isCustom: true },
        ]
        // Machines from shift data (primary source)
        const sumMachinesP = [...new Map(machinePShiftSummaryData.map(r => [r.tenMay, { tenMay: r.tenMay, maMay: r.maMay }])).values()]
        const computePPct = (tenMay, fromStr, toStr = null) => {
          const rows = machinePShiftSummaryData.filter(r =>
            r.tenMay === tenMay && r.ngay >= fromStr && (toStr == null || r.ngay <= toStr)
          )
          const sumLT = rows.reduce((s, r) => s + (r.slLyThuyet || 0), 0)
          const sumTT = rows.reduce((s, r) => s + (r.slThucTe || 0), 0)
          return sumLT > 0 ? Math.round(sumTT / sumLT * 1000) / 10 : null
        }
        // P tổng thể của toàn công đoạn (tất cả máy): Σ SL_TT_all / Σ SL_LT_all
        const computeOverallPPct = (fromStr, toStr = null) => {
          const rows = machinePShiftSummaryData.filter(r =>
            r.ngay >= fromStr && (toStr == null || r.ngay <= toStr)
          )
          const sumLT = rows.reduce((s, r) => s + (r.slLyThuyet || 0), 0)
          const sumTT = rows.reduce((s, r) => s + (r.slThucTe || 0), 0)
          return sumLT > 0 ? Math.round(sumTT / sumLT * 1000) / 10 : null
        }

        // Top nguyên nhân tổn thất (from daily log for backward compat)
        const causeAgg = {}
        machinePSummaryData.forEach(r => {
          if (!r.nguyenNhanGiamToc || !r.tonThat) return
          causeAgg[r.nguyenNhanGiamToc] = (causeAgg[r.nguyenNhanGiamToc] || 0) + r.tonThat
        })
        const causeSorted = Object.entries(causeAgg).sort((a, b) => b[1] - a[1])

        const machines = Object.keys(machineMap)

        return (
          <div style={{ padding: 0 }}>
            {/* Inner tab bar */}
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid #e2e8f0', background: '#faf5ff', padding: '0 12px', overflowX: 'auto' }}>
              <button style={tabBtn(activePTab === 'summary')} onClick={() => setMachinePInnerTab('summary')}>📊 Tổng hợp</button>
              {machineOrder.map(m => (
                <button key={m} style={tabBtn(activePTab === m)} onClick={() => setMachinePInnerTab(m)}>{m}</button>
              ))}
              <div style={{ flex: 1 }} />
              <button
                onClick={() => setAddPerfOpen(true)}
                style={{ border: '1px solid #7c3aed', background: '#ede9fe', color: '#5b21b6', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>
                + Thêm dòng
              </button>
              <button onClick={doRefresh} style={{ border: '1px solid #a78bfa', background: '#f5f3ff', color: '#5b21b6', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, flexShrink: 0, marginLeft: 6 }}>↺ Làm mới</button>
            </div>

            <Spin spinning={machinePLoading}>
              {/* ── Tab Tổng hợp ── */}
              {activePTab === 'summary' && (
                <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 230px)' }}>
                  {/* Toolbar tùy chọn khoảng thời gian */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>Cột Tùy chọn:</span>
                    <DatePicker.RangePicker
                      value={machinePSummaryCustomRange}
                      onChange={v => setMachinePSummaryCustomRange(v || [dayjs().subtract(29, 'day'), dayjs()])}
                      format="DD/MM/YYYY"
                      size="small"
                      allowClear={false}
                      disabledDate={d => d && d.isAfter(dayjs(), 'day')}
                      style={{ fontSize: 12 }}
                    />
                    <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Chọn khoảng để tính P% cột cuối</span>
                  </div>

                  <div style={{ padding: 12 }}>
                  <Spin spinning={machinePSummaryLoading}>
                    {/* P% by machine × period table */}
                    {sumMachinesP.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>Chưa có dữ liệu ca sản xuất. Nhập chi tiết ca trong modal Chỉ số P để xem tổng hợp.</div>
                    ) : (
                      <>
                        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
                          <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                              <tr>
                                <th colSpan={2 + sumPeriods.length} style={{ background: '#2e1065', color: '#fff', padding: '8px 12px', border: '1px solid #5b21b6', fontWeight: 800, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                                  TỔNG HỢP CHỈ SỐ P (PERFORMANCE) – {tenTo}
                                </th>
                              </tr>
                              <tr>
                                <th colSpan={2 + sumPeriods.length} style={{ background: '#3b0764', color: '#e9d5ff', padding: '4px 12px', textAlign: 'center', border: '1px solid #5b21b6', fontWeight: 400, fontSize: 11, fontStyle: 'italic' }}>
                                  Công thức: Σ(SL thực tế × T chuẩn) / Σ(SL lý thuyết × T chuẩn) · Mục tiêu ≥ 95% · Dữ liệu 6 tháng gần nhất
                                </th>
                              </tr>
                              <tr>
                                <th style={{ background: '#2e1065', color: '#fff', padding: '7px 10px', border: '1px solid #5b21b6', fontWeight: 700, fontSize: 12, textAlign: 'left' }}>Tên máy</th>
                                <th style={{ background: '#2e1065', color: '#fff', padding: '7px 10px', border: '1px solid #5b21b6', fontWeight: 700, fontSize: 12, textAlign: 'center', width: 90 }}>Mã máy</th>
                                {sumPeriods.map(p => (
                                  <th key={p.key} style={{ background: p.isCustom ? '#065f46' : '#7c3aed', color: '#fff', padding: '7px 10px', border: '1px solid #5b21b6', fontWeight: 700, fontSize: 12, textAlign: 'center', minWidth: p.isCustom ? 160 : undefined }}>
                                    {p.label}
                                    {p.isCustom && customPFrom && customPTo && (
                                      <div style={{ fontWeight: 400, fontSize: 10, opacity: 0.85, marginTop: 2 }}>
                                        {machinePSummaryCustomRange[0].format('DD/MM/YY')} → {machinePSummaryCustomRange[1].format('DD/MM/YY')}
                                      </div>
                                    )}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sumMachinesP.map((m, i) => (
                                <tr key={m.tenMay} style={{ background: i % 2 === 0 ? '#faf5ff' : '#f5f3ff' }}>
                                  <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 13 }}>{m.tenMay}</td>
                                  <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', fontFamily: 'monospace', color: '#7c3aed', textAlign: 'center', fontWeight: 600 }}>{m.maMay || '—'}</td>
                                  {sumPeriods.map(p => {
                                    const v = computePPct(m.tenMay, p.from, p.to || null)
                                    return (
                                      <td key={p.key} style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 800, fontSize: 14, color: pColor(v), background: pBg(v) }}>
                                        {v != null ? `${v}%` : '—'}
                                      </td>
                                    )
                                  })}
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colSpan={2} style={{ padding: '10px 12px', background: '#2e1065', border: '1px solid #2e1065', color: '#fff', fontWeight: 700, fontSize: 13, letterSpacing: 0.3 }}>
                                  HIỆU SUẤT TỔNG THỂ – {tenTo}
                                </td>
                                {sumPeriods.map(p => {
                                  const v = computeOverallPPct(p.from, p.to || null)
                                  return (
                                    <td key={p.key} style={{ padding: '10px 12px', background: v == null ? '#f8fafc' : pBg(v), border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 800, fontSize: 15, color: v == null ? '#9ca3af' : pColor(v) }}>
                                      {v != null ? `${v}%` : '—'}
                                    </td>
                                  )
                                })}
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        <div style={{ height: 16 }} />

                        {/* Top nguyên nhân tổn thất */}
                        {causeSorted.length > 0 && (
                          <>
                            <div style={{ fontWeight: 700, color: '#2e1065', marginBottom: 10, fontSize: 13 }}>📉 Nguyên Nhân Tổn Thất Tốc Độ (6 tháng gần nhất)</div>
                            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                              <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: 500 }}>
                                <thead>
                                  <tr>
                                    <th style={{ padding: '7px 10px', background: '#2e1065', color: '#fff', border: '1px solid #5b21b6', fontWeight: 700, fontSize: 11 }}>STT</th>
                                    <th style={{ padding: '7px 10px', background: '#2e1065', color: '#fff', border: '1px solid #5b21b6', fontWeight: 700, fontSize: 11, textAlign: 'left' }}>Nguyên nhân</th>
                                    <th style={{ padding: '7px 10px', background: '#2e1065', color: '#fff', border: '1px solid #5b21b6', fontWeight: 700, fontSize: 11 }}>Tổng tổn thất (SP)</th>
                                    <th style={{ padding: '7px 10px', background: '#2e1065', color: '#fff', border: '1px solid #5b21b6', fontWeight: 700, fontSize: 11 }}>%</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {causeSorted.map(([cause, val], idx) => {
                                    const total = causeSorted.reduce((s, [, v]) => s + v, 0)
                                    return (
                                      <tr key={cause} style={{ background: idx % 2 === 0 ? '#faf5ff' : '#f5f3ff' }}>
                                        <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>{idx + 1}</td>
                                        <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', fontWeight: 500 }}>{cause}</td>
                                        <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{Number(val).toLocaleString('vi-VN')}</td>
                                        <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 600, color: '#7c3aed' }}>
                                          {total > 0 ? `${Math.round(val / total * 1000) / 10}%` : '—'}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </Spin>
                  </div>
                </div>
              )}

              {/* ── Tabs theo máy ── */}
              {activePTab !== 'summary' && (
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 230px)' }}>
                  {renderMachinePTable(activePTab, machineMap[activePTab] || [])}
                </div>
              )}
            </Spin>

            {/* Modal thêm dòng mới */}
            <Modal
              open={addPerfOpen}
              onCancel={() => setAddPerfOpen(false)}
              onOk={addPerfRow}
              okText="Thêm" cancelText="Hủy"
              title="Thêm dòng Chỉ số P"
              width={480}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ width: 130, fontWeight: 600, fontSize: 13 }}>Ngày *</label>
                  <DatePicker style={{ flex: 1 }} format="DD/MM/YYYY"
                    value={addPerfForm.ngay ? dayjs(addPerfForm.ngay) : null}
                    onChange={d => setAddPerfForm(p => ({ ...p, ngay: d?.format('YYYY-MM-DD') || '' }))}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ width: 130, fontWeight: 600, fontSize: 13 }}>Máy *</label>
                  <AutoComplete
                    style={{ flex: 1 }}
                    value={addPerfForm.tenMay}
                    onChange={v => setAddPerfForm(p => ({ ...p, tenMay: v }))}
                    options={[...new Set([
                      ...machines,
                      ...Object.keys(machinePSpeedConfigs),
                      ...machineSummaryData.map(r => r.tenMay),
                    ])].filter(Boolean).map(m => ({ value: m }))}
                    filterOption={(input, opt) => opt.value.toLowerCase().includes(input.toLowerCase())}
                    placeholder="Chọn hoặc nhập tên máy"
                    allowClear
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ width: 130, fontWeight: 600, fontSize: 13 }}>SL lý thuyết</label>
                  <InputNumber style={{ flex: 1 }} min={0}
                    value={addPerfForm.slLyThuyet}
                    placeholder={addPerfForm.tenMay && machinePSpeedConfigs[addPerfForm.tenMay]?.slLyThuyet ? `Mặc định: ${machinePSpeedConfigs[addPerfForm.tenMay].slLyThuyet}` : 'Số SP tối đa/ngày'}
                    formatter={v => v != null ? String(v).replace('.', ',') : ''}
                    parser={v => v ? v.replace(',', '.').replace(/[^\d.]/g, '') : ''}
                    onChange={v => setAddPerfForm(p => ({ ...p, slLyThuyet: v }))}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ width: 130, fontWeight: 600, fontSize: 13 }}>SL thực tế</label>
                  <InputNumber style={{ flex: 1 }} min={0}
                    value={addPerfForm.slThucTe}
                    placeholder="Số SP đã sản xuất"
                    formatter={v => v != null ? String(v).replace('.', ',') : ''}
                    parser={v => v ? v.replace(',', '.').replace(/[^\d.]/g, '') : ''}
                    onChange={v => setAddPerfForm(p => ({ ...p, slThucTe: v }))}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ width: 130, fontWeight: 600, fontSize: 13 }}>Nguyên nhân</label>
                  <select value={addPerfForm.nguyenNhan} onChange={e => setAddPerfForm(p => ({ ...p, nguyenNhan: e.target.value }))}
                    style={{ flex: 1, fontSize: 13, border: '1px solid #d9d9d9', borderRadius: 6, padding: '4px 8px', height: 32 }}>
                    <option value="">-- Không có / Chưa xác định --</option>
                    {PREDEFINED_REASONS_P.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ width: 130, fontWeight: 600, fontSize: 13 }}>Ghi chú</label>
                  <input value={addPerfForm.ghiChu} onChange={e => setAddPerfForm(p => ({ ...p, ghiChu: e.target.value }))}
                    placeholder="Ghi chú / hành động xử lý"
                    style={{ flex: 1, fontSize: 13, border: '1px solid #d9d9d9', borderRadius: 6, padding: '4px 8px', height: 32 }} />
                </div>
              </div>
            </Modal>
          </div>
        )
      })()}

      <WorkDetailDrawer
        open={detailOpen}
        schedule={detailSchedule}
        onClose={closeDetailDrawer}
        onSaved={() => { closeDetailDrawer(); onSaved() }}
        onRefresh={onSaved}
        onMachineRuntimeSaved={() => setMachineAVersion(v => v + 1)}
        onShiftPerfSaved={() => setMachinePVersion(v => v + 1)}
      />

      <WorkScheduleModal
        open={modalOpen}
        editItem={editItem}
        congDoan={congDoan}
        defaultToNhom={defaultModalNhom}
        extraFormFields={config.extraFormFields}
        onClose={() => setModalOpen(false)}
        onSaved={onSaved}
      />

    </>
  )
}

const parseSoLoNum = (soLo) => {
  if (!soLo || soLo.length !== 6) return 0
  const yy = soLo.slice(4, 6), mm = soLo.slice(2, 4), dd = soLo.slice(0, 2)
  return parseInt(`${yy}${mm}${dd}`, 10)
}

// ── DoneTab ───────────────────────────────────────────────────────────────────
function DoneTab({ congDoan, toNhom, filters, searchTick, headerOffset = 84, onUndone, onCountChange, onRowClick }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 1000, total: 0 })
  const [loaiSpMap, setLoaiSpMap] = useState({})
  const filtersRef = useRef(filters)
  useEffect(() => { filtersRef.current = filters }, [filters])

  const fetchDone = useCallback(async (page = 0, size = 1000) => {
    const f = filtersRef.current
    setLoading(true)
    try {
      const { data: res } = await api.get('/work-schedule', {
        params: {
          source: 'SCHEDULE', congDoan,
          toNhom: toNhom || undefined,
          tinhTrang: 'done', page, size,
          fromDate: f.dateRange?.[0]?.format('YYYY-MM-DD') || undefined,
          toDate: f.dateRange?.[1]?.format('YYYY-MM-DD') || undefined,
          maSp: f.maSp || undefined,
          soLo: f.soLo || undefined,
          tenTrinh: f.tenTrinh || undefined,
          maBravo: f.maBravo || undefined,
        }
      })
      const rows = res.content || []
      setData(rows)
      setPagination(p => ({ ...p, total: res.totalElements, current: page + 1, pageSize: size }))
      onCountChange?.(res.totalElements)
      const codes = [...new Set(rows.map(r => r.maSp).filter(Boolean))]
      if (codes.length > 0) {
        api.get('/product-master/lookup-batch', { params: { codes } })
          .then(({ data: batchMap }) => {
            const loaiMap = {}
            codes.forEach(maSp => { if (batchMap[maSp]?.loaiSanPham) loaiMap[maSp] = batchMap[maSp].loaiSanPham })
            setLoaiSpMap(loaiMap)
          })
          .catch(() => {})
      }
    } catch { message.error({ content: 'Không thể tải lịch đã hoàn thiện', key: 'ws-done-err', duration: 3 }) }
    finally { setLoading(false) }
  }, [congDoan, toNhom])

  useEffect(() => { fetchDone(0) }, [fetchDone])
  useEffect(() => { if (searchTick > 0) fetchDone(0) }, [searchTick, fetchDone])

  const handleUndone = async (id) => {
    try {
      await api.patch(`/work-schedule/${id}/tinh-trang`, { tinhTrang: null })
      const next = data.filter(r => r.id !== id)
      setData(next)
      onCountChange?.(next.length)
      onUndone?.()
      message.success('Đã chuyển lại về Danh sách')
    } catch { message.error('Cập nhật thất bại') }
  }

  const getSlCong = (r) => {
    const cd = (r.congDoan || congDoan || '').toUpperCase()
    if (cd === 'BBC1')  return { sl: r.slBbc1,  cong: r.congBbc1 }
    if (cd === 'DG')    return { sl: r.slDg,    cong: r.congDg   }
    if (cd === 'PL')    return { sl: r.slPl,    cong: r.congPl   }
    if (cd === 'CC')    return { sl: r.slCc,      cong: r.congCc   }
    return { sl: r.slPc, cong: r.congPc }
  }

  const columns = [
    {
      title: 'Ngày TH', dataIndex: 'ngayThucHien', key: 'ngay', width: 90, align: 'center',
      render: v => v ? (
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontWeight: 600 }}>{dayjs(v).format('DD/MM')}</div>
          <div style={{ color: '#8c8c8c', fontSize: 11 }}>{dayjs(v).format('YYYY')}</div>
        </div>
      ) : '—'
    },
    {
      title: 'Tổ/Nhóm', dataIndex: 'toNhom', key: 'toNhom', width: 85,
      render: (v) => {
        const display = v || toNhom || congDoan
        return display ? <Tag color="green" style={{ marginRight: 0 }}>{display}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span>
      }
    },
    {
      title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 105,
      render: v => v ? <Tag color="blue" style={{ fontFamily: 'monospace', marginRight: 0 }}>{v}</Tag>
        : <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Mã SP', dataIndex: 'maSp', key: 'maSp', width: 80,
      render: v => v ? <span style={{ fontWeight: 600, color: '#595959' }}>{v}</span> : '—'
    },
    {
      title: 'Loại SP', key: 'loaiSp', width: 110,
      render: (_, r) => {
        const loai = loaiSpMap[r.maSp]
        return loai ? <Tag color="purple" style={{ marginRight: 0, fontSize: 11 }}>{loai}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span>
      }
    },
    {
      title: 'Tiến trình', dataIndex: 'tenTrinh', key: 'tenTrinh', width: 160,
      render: v => <span style={{ wordBreak: 'break-word' }}>{v || '—'}</span>
    },
    {
      title: 'Số lô', dataIndex: 'soLo', key: 'soLo', width: 90,
      render: v => <span style={{ fontFamily: 'monospace', color: '#595959' }}>{v || '—'}</span>
    },
    {
      title: 'Cỡ lô', dataIndex: 'coLo', key: 'coLo', width: 80, align: 'right',
      render: v => fmtNum(v)
    },
    {
      title: 'Số Lượng', key: 'slDone', width: 105, align: 'right',
      render: (_, r) => {
        const { sl } = getSlCong(r)
        return sl != null
          ? <span style={{ fontWeight: 700, color: '#389e0d' }}>{Number(sl).toLocaleString('vi-VN')}</span>
          : <span style={{ color: '#d9d9d9' }}>—</span>
      }
    },
    {
      title: 'Công', key: 'congDone', width: 95, align: 'right',
      render: (_, r) => {
        const { cong } = getSlCong(r)
        return cong != null
          ? <span style={{ color: '#722ed1' }}>{Number(cong).toLocaleString('vi-VN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</span>
          : <span style={{ color: '#d9d9d9' }}>—</span>
      }
    },
    {
      title: 'Năng suất', key: 'nangSuat', width: 95, align: 'right',
      render: (_, r) => {
        const { sl, cong } = getSlCong(r)
        const slV = Number(sl), congV = Number(cong)
        const qaV = r.congDoan === 'DG' ? (Number(r.qaLayMau) || 0) : 0
        const slNs = slV - qaV
        if (slNs > 0 && congV > 0) {
          return <span style={{ color: '#d46b08', fontWeight: 600 }}>{Math.round(slNs / congV).toLocaleString('vi-VN')}</span>
        }
        return <span style={{ color: '#d9d9d9' }}>—</span>
      }
    },
    {
      title: 'QA lấy mẫu', dataIndex: 'qaLayMau', key: 'qaLayMau', width: 95, align: 'right',
      render: v => v != null && v !== 0 && v !== ''
        ? <span style={{ color: '#0369a1', fontWeight: 600 }}>{Number(v).toLocaleString('vi-VN')}</span>
        : <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Máy Thực Hiện', dataIndex: 'phongThucHien', key: 'phongThucHien', width: 120, align: 'center',
      render: v => v
        ? <Tag color="cyan" style={{ marginRight: 0, fontSize: 11 }}>{v}</Tag>
        : <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Phòng SX', dataIndex: 'phongSanXuat', key: 'phongSanXuat', width: 120, align: 'center',
      render: v => v
        ? <Tag color="geekblue" style={{ marginRight: 0, fontSize: 11 }}>{v}</Tag>
        : <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Sai lệch', dataIndex: 'saiLech', key: 'saiLech', width: 160,
      render: v => v
        ? <span style={{ color: '#dc2626', fontSize: 11, wordBreak: 'break-word' }}>{v}</span>
        : <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Ngày hoàn thiện', dataIndex: 'updatedAt', key: 'updatedAt', width: 120, align: 'center',
      render: v => v ? <span style={{ fontSize: 12, color: '#15803d' }}>{dayjs(v).format('DD/MM/YYYY')}</span> : '—'
    },
    {
      title: 'Kết quả', key: 'ketQua', width: 110, align: 'center',
      render: (_, r) => {
        const { sl } = getSlCong(r)
        const slV = Number(sl) || 0
        const coLoV = Number(r.coLo) || 0
        if (slV === 0 || coLoV === 0) return <span style={{ color: '#d9d9d9' }}>—</span>
        if (slV >= coLoV * 0.95) return <Tag color="success" style={{ marginRight: 0 }}>Đạt</Tag>
        return <Tag color="error" style={{ marginRight: 0 }}>Không đạt</Tag>
      }
    },
    {
      title: 'Thao tác', key: 'action', width: 115, fixed: 'right', align: 'center',
      render: (_, record) => (
        <Tooltip title="Chuyển lại về Danh sách (bỏ done)">
          <Button size="small" icon={<ReloadOutlined />}
            onClick={e => { e.stopPropagation(); handleUndone(record.id) }}>
            Bỏ done
          </Button>
        </Tooltip>
      )
    }
  ]

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{
        position: 'sticky', top: headerOffset, zIndex: 9,
        background: '#f0fdf4', borderBottom: '1px solid #86efac',
        padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 8
      }}>
        <CheckCircleOutlined style={{ color: '#15803d', fontSize: 14 }} />
        <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>
          Lịch đã hoàn thiện — Tổng: {pagination.total}
        </span>
        <Button size="small" icon={<ReloadOutlined />} onClick={() => fetchDone(0)} loading={loading}
          style={{ marginLeft: 'auto' }} />
      </div>

      {/* Desktop */}
      <div className="ws-desktop-view">
        <SkeletonTable
          className="ws-table"
          columns={columns}
          dataSource={[...data]}
          rowKey="id"
          loading={loading}
          size="small"
          scroll={{ x: 1950 }}
          sticky={{ offsetHeader: headerOffset }}
          rowHoverable={false}
          onRow={r => ({
            onClick: () => onRowClick?.(r),
            style: { cursor: onRowClick ? 'pointer' : 'default' },
          })}
          pagination={false}
        />
      </div>

      {/* Mobile cards */}
      <div className="ws-mobile-view" style={{ padding: '8px 10px', flexDirection: 'column', gap: 8 }}>
        {loading && <div style={{ textAlign: 'center', padding: 32 }}><Spin size="large" /></div>}
        {!loading && data.length === 0 && (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40, fontSize: 14 }}>Không có dữ liệu</div>
        )}
        {!loading && data.map(record => {
          const { sl, cong } = getSlCong(record)
          const slV = Number(sl) || 0
          const congV = Number(cong) || 0
          const ns = slV > 0 && congV > 0 ? Math.round(slV / congV) : null
          const coLoV = Number(record.coLo) || 0
          const ketQua = slV > 0 && coLoV > 0 ? (slV >= coLoV * 0.95 ? 'Đạt' : 'Không đạt') : null
          return (
            <div key={record.id} onClick={() => onRowClick?.(record)} style={{
              background: '#f0fdf4', border: '1px solid #86efac', borderLeft: '4px solid #15803d',
              borderRadius: 10, padding: '10px 12px', cursor: onRowClick ? 'pointer' : 'default',
              boxShadow: '0 1px 3px rgba(0,0,0,.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                {record.ngayThucHien && (
                  <span style={{ fontWeight: 700, color: '#15803d', fontSize: 13 }}>
                    {dayjs(record.ngayThucHien).format('DD/MM/YY')}
                  </span>
                )}
                {record.maSp && <Tag color="blue" style={{ marginRight: 0, fontWeight: 700, fontSize: 11 }}>{record.maSp}</Tag>}
                {record.maBravo && <Tag style={{ marginRight: 0, fontFamily: 'monospace', fontSize: 10 }}>{record.maBravo}</Tag>}
                {ketQua && <Tag color={ketQua === 'Đạt' ? 'success' : 'error'} style={{ marginLeft: 'auto', marginRight: 0 }}>{ketQua}</Tag>}
              </div>
              {record.tenTrinh && (
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 5, lineHeight: 1.4 }}>{record.tenTrinh}</div>
              )}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, color: '#595959' }}>
                {record.soLo && <span>Lô: <b style={{ fontFamily: 'monospace' }}>{record.soLo}</b></span>}
                {coLoV > 0 && <span>Cỡ: <b>{coLoV.toLocaleString('vi-VN')}</b></span>}
                {slV > 0 && <span style={{ color: '#389e0d', fontWeight: 700 }}>SL: {slV.toLocaleString('vi-VN')}</span>}
                {congV > 0 && <span>Công: <b>{congV.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</b></span>}
                {ns != null && <span style={{ color: '#d46b08', fontWeight: 700 }}>NS: {ns.toLocaleString('vi-VN')}</span>}
                {record.toNhom && <Tag color="green" style={{ marginRight: 0, fontSize: 11 }}>{record.toNhom}</Tag>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── HiddenTab ─────────────────────────────────────────────────────────────────
function HiddenTab({ congDoan, toNhom, onUnhide, onCountChange, headerOffset = 84, filters = {} }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 1000, total: 0 })
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [updatingTT, setUpdatingTT] = useState({})
  const [loaiSpMap, setLoaiSpMap] = useState({})

  const fetchHidden = useCallback(async (page = 0, size = 1000) => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/work-schedule/hidden', {
        params: { source: 'SCHEDULE', congDoan, toNhom: toNhom || undefined, page, size }
      })
      const rows = res.content || []
      setData(rows)
      setPagination(p => ({ ...p, total: res.totalElements, current: page + 1, pageSize: size }))
      onCountChange?.(res.totalElements)
      const codes = [...new Set(rows.map(r => r.maSp).filter(Boolean))]
      if (codes.length > 0) {
        api.get('/product-master/lookup-batch', { params: { codes } })
          .then(({ data: batchMap }) => {
            const loaiMap = {}
            codes.forEach(maSp => { if (batchMap[maSp]?.loaiSanPham) loaiMap[maSp] = batchMap[maSp].loaiSanPham })
            setLoaiSpMap(loaiMap)
          })
          .catch(() => {})
      }
    } catch { message.error({ content: 'Không thể tải danh sách đã ẩn', key: 'ws-hidden-err', duration: 3 }) }
    finally { setLoading(false) }
  }, [congDoan, toNhom])

  useEffect(() => { fetchHidden(0) }, [fetchHidden])

  const handleUnhide = async (id) => {
    try {
      await api.patch(`/work-schedule/${id}/hidden`, { hidden: false })
      const next = data.filter(r => r.id !== id)
      setData(next)
      setSelectedIds(prev => prev.filter(i => i !== id))
      message.success('Đã bỏ ẩn')
      onCountChange?.(next.length)
      onUnhide?.()
    } catch { message.error('Bỏ ẩn thất bại') }
  }

  const handleBulkUnhide = async () => {
    if (selectedIds.length === 0) { message.warning('Chưa chọn bản ghi nào'); return }
    setBulkLoading(true)
    try {
      await api.post('/work-schedule/bulk-unhide', selectedIds)
      const next = data.filter(r => !selectedIds.includes(r.id))
      setData(next)
      message.success(`Đã bỏ ẩn ${selectedIds.length} bản ghi`)
      setSelectedIds([])
      onCountChange?.(next.length)
      onUnhide?.()
    } catch { message.error('Bỏ ẩn hàng loạt thất bại') }
    finally { setBulkLoading(false) }
  }

  const handleUpdateTinhTrang = async (id, newTT) => {
    setUpdatingTT(p => ({ ...p, [id]: true }))
    try {
      await api.patch(`/work-schedule/${id}/tinh-trang`, { tinhTrang: newTT || null })
      setData(prev => prev.map(r => r.id === id ? { ...r, tinhTrang: newTT || null } : r))
    } catch { message.error('Cập nhật tình trạng thất bại') }
    finally { setUpdatingTT(p => ({ ...p, [id]: false })) }
  }

  const columns = [
    {
      title: 'Ngày TH', dataIndex: 'ngayThucHien', key: 'ngay', width: 90, align: 'center',
      render: v => v ? (
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontWeight: 600 }}>{dayjs(v).format('DD/MM')}</div>
          <div style={{ color: '#8c8c8c', fontSize: 11 }}>{dayjs(v).format('YYYY')}</div>
        </div>
      ) : '—'
    },
    {
      title: 'Công đoạn', dataIndex: 'congDoan', key: 'congDoan', width: 90,
      render: v => v ? <Tag color="purple" style={{ marginRight: 0 }}>{v}</Tag> : '—'
    },
    {
      title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 100,
      render: v => v ? <Tag color="blue" style={{ fontFamily: 'monospace', marginRight: 0 }}>{v}</Tag>
        : <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Mã SP', dataIndex: 'maSp', key: 'maSp', width: 80,
      render: v => v ? <span style={{ fontWeight: 600, color: '#595959' }}>{v}</span> : '—'
    },
    {
      title: 'Loại SP', key: 'loaiSp', width: 110,
      render: (_, r) => {
        const loai = loaiSpMap[r.maSp]
        return loai ? <Tag color="purple" style={{ marginRight: 0, fontSize: 11 }}>{loai}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span>
      }
    },
    {
      title: 'Tiến trình', dataIndex: 'tenTrinh', key: 'tenTrinh', width: 160,
      render: v => <span style={{ wordBreak: 'break-word' }}>{v || '—'}</span>
    },
    {
      title: 'Số lô', dataIndex: 'soLo', key: 'soLo', width: 90,
      render: v => <span style={{ fontFamily: 'monospace', color: '#595959' }}>{v || '—'}</span>
    },
    {
      title: 'Cỡ lô', dataIndex: 'coLo', key: 'coLo', width: 80, align: 'right',
      render: v => fmtNum(v)
    },
    {
      title: 'Tổ/Nhóm', dataIndex: 'toNhom', key: 'toNhom', width: 100,
      render: v => v || <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Tình trạng', dataIndex: 'tinhTrang', key: 'tinhTrang', width: 110, align: 'center',
      render: (v, record) => (
        <Select
          size="small"
          value={v || ''}
          loading={!!updatingTT[record.id]}
          onChange={val => handleUpdateTinhTrang(record.id, val || null)}
          style={{ width: 100 }}
          onClick={e => e.stopPropagation()}
        >
          <Option value="">—</Option>
          <Option value="doing"><span style={{ color: '#fa8c16', fontWeight: 600 }}>● Doing</span></Option>
          <Option value="done"><span style={{ color: '#52c41a', fontWeight: 600 }}>✓ Done</span></Option>
        </Select>
      )
    },
    {
      title: 'Thao tác', key: 'action', width: 90, fixed: 'right', align: 'center',
      render: (_, record) => (
        <Tooltip title="Bỏ ẩn — khôi phục bản ghi">
          <Button size="small" type="primary" ghost icon={<EyeTwoTone />}
            onClick={() => handleUnhide(record.id)}>
            Bỏ ẩn
          </Button>
        </Tooltip>
      )
    }
  ]

  // Lọc client-side theo filters (maSp, tenTrinh, soLo, maBravo)
  const filteredData = useMemo(() => data.filter(r => {
    const f = filters
    if (f.maSp     && !(r.maSp     || '').toLowerCase().includes(f.maSp.toLowerCase()))     return false
    if (f.tenTrinh && !(r.tenTrinh || '').toLowerCase().includes(f.tenTrinh.toLowerCase())) return false
    if (f.soLo     && !(r.soLo     || '').toLowerCase().includes(f.soLo.toLowerCase()))     return false
    if (f.maBravo  && !(r.maBravo  || '').toLowerCase().includes(f.maBravo.toLowerCase()))  return false
    return true
  }), [data, filters])

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Toolbar */}
      <div style={{
        position: 'sticky', top: 84, zIndex: 9,
        background: '#f5f0ff', borderBottom: '2px solid #d3adf7',
        padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
      }}>
        <EyeInvisibleOutlined style={{ color: '#722ed1', fontSize: 15 }} />
        <span style={{ fontSize: 13, color: '#531dab', fontWeight: 600 }}>
          Bản ghi đã ẩn — Tổng: {filteredData.length}{filteredData.length !== data.length ? ` / ${data.length}` : ''}
        </span>
        {selectedIds.length > 0 && (
          <Button
            type="primary"
            size="small"
            icon={<EyeTwoTone />}
            loading={bulkLoading}
            style={{ background: '#722ed1', borderColor: '#722ed1', marginLeft: 8 }}
            onClick={handleBulkUnhide}
          >
            Bỏ ẩn {selectedIds.length} mục đã chọn
          </Button>
        )}
        <Button size="small" icon={<ReloadOutlined />} onClick={() => fetchHidden(0)} loading={loading}
          style={{ marginLeft: 'auto' }} />
      </div>

      <SkeletonTable
        className="ws-table"
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: keys => setSelectedIds(keys),
        }}
        columns={columns}
        dataSource={[...filteredData].sort((a, b) => {
          const slF = SL_FIELD_MAP[congDoan], cF = CONG_FIELD_MAP[congDoan]
          const getPriority = r => {
            const sl   = slF ? Number(r[slF]) || 0 : 0
            const cong = cF  ? Number(r[cF])  || 0 : 0
            const coLo = Number(r.coLo) || 0
            if (cong > 0 && sl === 0) return 0
            if (r.saiLech) return 1
            if (sl > 0 && coLo > 0 && sl > coLo) return 2
            return 10
          }
          return getPriority(a) - getPriority(b)
        })}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 1150 }}
        sticky={{ offsetHeader: headerOffset }}
        rowHoverable={false}
        pagination={false}
      />
    </div>
  )
}

// ── Sync Schedule Button (Admin) ──────────────────────────────────────────────
function SyncScheduleButton() {
  const [syncing, setSyncing] = useState(false)
  const handleSync = async () => {
    setSyncing(true)
    try {
      const { data } = await api.post('/production/sync-schedule-all')
      message.success(`Đồng bộ thành công: tạo mới ${data.created} bản ghi lịch sản xuất`)
      // Force reload với loading indicator để user thấy data cập nhật
      window.dispatchEvent(new CustomEvent('app:force-refresh'))
    } catch (e) { message.error(e?.response?.data?.message || 'Đồng bộ thất bại') }
    finally { setSyncing(false) }
  }
  return (
    <Tooltip title="Tạo bổ sung bản ghi PCPL1/PCPL2/BBC1/PL/ĐG/CC cho tất cả lệnh đã phát">
      <Button size="small" icon={<ReloadOutlined />} loading={syncing} onClick={handleSync}
        style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
        Đồng bộ lịch SX
      </Button>
    </Tooltip>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WorkSchedulePage() {
  const { isAdmin, isStageAdmin, getAllowedStages, getAllowedNhom, user } = useAuth()
  const allowedStages = getAllowedStages()
  const allowedNhom = getAllowedNhom()
  const location = useLocation()
  const navigate = useNavigate()
  const jumpInit = location.state?.jumpTo || null
  const defaultStage = (() => {
    const s = jumpInit?.stage || (allowedNhom === 'PCPL2' ? 'PCPL2' : 'PCPL1')
    if (!allowedStages) return s
    return allowedStages.includes(s) ? s : allowedStages[0]
  })()
  const [activeTab, setActiveTab] = useState(() => {
    if (jumpInit?.stage) return defaultStage
    try {
      const saved = localStorage.getItem('ws_active_tab')
      if (saved && (!allowedStages || allowedStages.length === 0 ||
          allowedStages.includes(saved) ||
          saved === 'deviation')) {
        return saved
      }
    } catch {}
    return defaultStage
  })
  const [jumpTarget] = useState(jumpInit)

  useEffect(() => {
    warmPhongSanXuatCache()
    if (jumpInit) {
      navigate(location.pathname, { replace: true, state: {} })
      localStorage.setItem('ws_active_tab', activeTab)
    }
  }, [])
  const [devCount, setDevCount] = useState(0)
  const [devData, setDevData] = useState([])
  const [devLoading, setDevLoading] = useState(false)
  const [devPagination, setDevPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [devFilters, setDevFilters] = useState({ dateRange: null, maSp: '', tenTrinh: '', soLo: '' })
  const [devModalOpen, setDevModalOpen] = useState(false)
  const [devEditItem, setDevEditItem] = useState(null)
  const [kphModalOpen, setKphModalOpen] = useState(false)
  const [kphRecord, setKphRecord] = useState(null)

  const refreshDevCount = useCallback(async () => {
    try {
      const { data } = await api.get('/work-schedule/deviations', { params: { page: 0, size: 1 } })
      setDevCount(data.totalElements)
    } catch {}
  }, [])

  const handleDevHide = async (id) => {
    try {
      await api.patch(`/work-schedule/${id}/hidden`, { hidden: true })
      message.success('Đã ẩn bản ghi')
      fetchDeviations(devPagination.current - 1, devPagination.pageSize)
      refreshDevCount()
    } catch { message.error('Không thể ẩn') }
  }

  const handleDevDelete = async (id) => {
    try {
      await api.delete(`/work-schedule/${id}`)
      message.success('Đã xóa bản ghi')
      fetchDeviations(devPagination.current - 1, devPagination.pageSize)
      refreshDevCount()
    } catch { message.error('Không thể xóa') }
  }

  const fetchDeviations = useCallback(async (page = 0, size = 20, f = devFilters) => {
    setDevLoading(true)
    try {
      const params = {
        page, size,
        fromDate: f.dateRange?.[0]?.format('YYYY-MM-DD') || undefined,
        toDate: f.dateRange?.[1]?.format('YYYY-MM-DD') || undefined,
        maSp: f.maSp || undefined,
        tenTrinh: f.tenTrinh || undefined,
        soLo: f.soLo || undefined,
      }
      const { data: res } = await api.get('/work-schedule/deviations', { params })
      setDevData(res.content)
      setDevPagination(p => ({ ...p, total: res.totalElements }))
      setDevCount(res.totalElements)
    } catch { message.error('Không thể tải sai lệch') }
    finally { setDevLoading(false) }
  }, [devFilters])

  useEffect(() => { refreshDevCount() }, [])

  useEffect(() => {
    if (activeTab === 'deviation') fetchDeviations(0)
  }, [])

  const deviationColumns = [
    {
      title: 'Ngày', dataIndex: 'ngayThucHien', key: 'ngayThucHien', width: 110,
      sorter: (a, b) => (a.ngayThucHien || '').localeCompare(b.ngayThucHien || ''),
      render: v => v ? dayjs(v).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 110,
      ...colSearch('maBravo'),
      render: v => v ? <Tag color="blue" style={{ fontFamily: 'monospace' }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Mã SP', dataIndex: 'maSp', key: 'maSp', width: 80,
      ...colSearch('maSp'),
      render: v => v ? <span style={{ fontWeight: 600, color: '#595959', fontSize: 12 }}>{v}</span> : '-',
    },
    {
      title: 'Công đoạn', dataIndex: 'congDoan', key: 'congDoan', width: 95,
      filters: [
        { text: 'PCPL1', value: 'PCPL1' },
        { text: 'PCPL2', value: 'PCPL2' },
        { text: 'PL', value: 'PL' },
        { text: 'BBC1', value: 'BBC1' },
        { text: 'ĐG', value: 'DG' },
        { text: 'CC', value: 'CC' },
      ],
      onFilter: (value, record) => record.congDoan === value,
      render: v => v ? <Tag color="purple">{v}</Tag> : '-',
    },
    {
      title: 'TIẾN TRÌNH', dataIndex: 'tenTrinh', key: 'tenTrinh',
      ...colSearch('tenTrinh'),
      render: v => <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{v || '-'}</span>,
    },
    {
      title: 'Số lô', dataIndex: 'soLo', key: 'soLo', width: 90,
      ...colSearch('soLo'),
    },
    {
      title: 'Cỡ lô', dataIndex: 'coLo', key: 'coLo', width: 80, align: 'right',
      sorter: (a, b) => (a.coLo ?? 0) - (b.coLo ?? 0),
    },
    {
      title: 'Nội dung sai lệch', dataIndex: 'saiLech', key: 'saiLech',
      ...colSearch('saiLech'),
      render: v => (
        <Typography.Text style={{ color: '#d46b08', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{v}</Typography.Text>
      ),
    },
    {
      title: 'Tình trạng', dataIndex: 'tinhTrang', key: 'tinhTrang', width: 100,
      filters: TINH_TRANG_OPTIONS.map(o => ({ text: o.label, value: o.value })),
      onFilter: (value, record) => record.tinhTrang === value,
      render: tinhTrangTag,
    },
    {
      title: 'Thao tác', key: 'action', width: 160, align: 'center',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Mở hồ sơ KPH">
            <Button size="small" type="primary" ghost
              style={{ color: '#fa8c16', borderColor: '#fa8c16', fontWeight: 700, fontSize: 11 }}
              onClick={() => { setKphRecord(record); setKphModalOpen(true) }}>
              KPH
            </Button>
          </Tooltip>
          <Tooltip title="Chỉnh sửa lịch">
            <Button size="small" icon={<EditOutlined />}
              onClick={() => { setDevEditItem(record); setDevModalOpen(true) }} />
          </Tooltip>
          <Popconfirm
            title="Ẩn bản ghi này?"
            description="Bản ghi sẽ bị ẩn khỏi tab Sai lệch."
            onConfirm={() => handleDevHide(record.id)}
            okText="Ẩn" cancelText="Hủy"
          >
            <Tooltip title="Ẩn">
              <Button size="small" icon={<EyeInvisibleOutlined />} />
            </Tooltip>
          </Popconfirm>
          <Popconfirm
            title="Xóa bản ghi này?"
            description="Hành động này không thể hoàn tác."
            onConfirm={() => handleDevDelete(record.id)}
            okText="Xóa" okButtonProps={{ danger: true }} cancelText="Hủy"
          >
            <Tooltip title="Xóa">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    },
  ]

  const tabItems = [
    ...Object.entries(STAGE_CONFIG)
      .filter(([stage]) => !allowedStages || allowedStages.includes(stage))
      .map(([stage, config]) => ({
        key: stage,
        label: config.label,
        children: (
          <StageTab
            congDoan={stage}
            config={config}
            onSaved={refreshDevCount}
            jumpTarget={jumpTarget?.stage === stage ? jumpTarget : null}
          />
        ),
      })),
    ...(user?.role !== 'NHAN_VIEN' ? [{
      key: 'wip',
      label: (
        <Space>
          <span>Hàng dở dang</span>
        </Space>
      ),
      children: <WipPage />,
    }] : []),
    ...(!allowedStages || isStageAdmin() ? [{
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
          <div style={{
            background: '#fff7e0', borderBottom: '2px solid #ffd591',
            padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            marginBottom: 0
          }}>
            <Space size={6}>
              <WarningOutlined style={{ color: '#fa8c16', fontSize: 15 }} />
              <Typography.Text style={{ fontSize: 13 }}>
                Công việc <strong>có sai lệch</strong> — tổng hợp từ tất cả công đoạn
              </Typography.Text>
            </Space>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <Space.Compact size="small">
                <Button size="small" onClick={() => {
                  const s = dayjs().startOf('week'); const e = dayjs().endOf('week')
                  setDevFilters(f => ({ ...f, dateRange: [s, e] })); setTimeout(() => fetchDeviations(0), 0)
                }}>Tuần</Button>
                <Button size="small" onClick={() => {
                  const s = dayjs().startOf('month'); const e = dayjs().endOf('month')
                  setDevFilters(f => ({ ...f, dateRange: [s, e] })); setTimeout(() => fetchDeviations(0), 0)
                }}>Tháng</Button>
                <Button size="small" onClick={() => {
                  const s = dayjs().startOf('year'); const e = dayjs().endOf('year')
                  setDevFilters(f => ({ ...f, dateRange: [s, e] })); setTimeout(() => fetchDeviations(0), 0)
                }}>Năm</Button>
              </Space.Compact>
              <RangePicker size="small" style={{ width: 224 }} format="DD/MM/YYYY"
                placeholder={['Từ ngày', 'Đến ngày']}
                value={devFilters.dateRange}
                onChange={v => setDevFilters(f => ({ ...f, dateRange: v }))} />
              <Input size="small" style={{ width: 88 }} placeholder="Mã SP" value={devFilters.maSp} allowClear
                onChange={e => setDevFilters(f => ({ ...f, maSp: e.target.value }))}
                onPressEnter={() => fetchDeviations(0)} />
              <Input size="small" style={{ width: 140 }} placeholder="Tiến trình" value={devFilters.tenTrinh} allowClear
                onChange={e => setDevFilters(f => ({ ...f, tenTrinh: e.target.value }))}
                onPressEnter={() => fetchDeviations(0)} />
              <Input size="small" style={{ width: 100 }} placeholder="Số lô" value={devFilters.soLo} allowClear
                onChange={e => setDevFilters(f => ({ ...f, soLo: e.target.value }))}
                onPressEnter={() => fetchDeviations(0)} />
              <Button size="small" type="primary" icon={<SearchOutlined />}
                onClick={() => fetchDeviations(0)}>Tìm</Button>
              <Button size="small" icon={<ReloadOutlined />} onClick={() => {
                const reset = { dateRange: null, maSp: '', tenTrinh: '', soLo: '' }
                setDevFilters(reset)
                fetchDeviations(0, 20, reset)
              }} />
            </div>
          </div>

          <Table
            className="ws-table ws-dev-table"
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
    }] : []),
  ]

  return (
    <>
      <style>{`
        @keyframes wsRowSlideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ws-row-new { animation: wsRowSlideIn 0.22s cubic-bezier(0.22,1,0.36,1); }
        /* Row highlight classes */
        .ant-table-tbody > tr.row-has-deviation > td { background: #fffdf5 !important; }
        .ant-table-tbody > tr.row-jump-highlight > td { background: #f0fffe !important; border-top: 1px solid #91d5d0; border-bottom: 1px solid #91d5d0; }
        .ant-table-tbody > tr.row-ns-high > td { background: #fafff7 !important; }
        .ant-table-tbody > tr.row-ns-low > td { background: #fffaf9 !important; }
        .ant-table-tbody > tr.row-sl-exceed > td { background: #fdfaff !important; }
        .ant-table-tbody > tr.row-missing-sl > td { background: #fff8e6 !important; }
        .ant-table-tbody > tr.row-sl-under > td { background: #ffccc7 !important; }
        .ant-table-tbody > tr.row-sl-over > td  { background: #bae0ff !important; }
        /* ERP table headers */
        .ws-table .ant-table-thead > tr > th {
          background: #006666 !important;
          background-image: none !important;
          color: #ffffff !important;
          text-align: center !important;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.5px;
          padding: 7px 8px !important;
          white-space: nowrap;
          border-right: 1px solid #004444 !important;
        }
        .ws-table .ant-table-thead > tr > th::before { display: none !important; }
        .ws-table .ant-table-thead > tr > th .ant-table-column-sorter { color: rgba(255,255,255,0.7) !important; }
        .ws-table .ant-table-thead > tr > th .ant-table-column-sorter-up.active .anticon,
        .ws-table .ant-table-thead > tr > th .ant-table-column-sorter-down.active .anticon { color: #fff !important; }
        .ws-table .ant-table-thead > tr > th.ant-table-column-sort { background: #004444 !important; background-image: none !important; }
        .ws-table .ant-table-thead .ant-table-filter-trigger { color: rgba(255,255,255,0.7) !important; }
        .ws-table .ant-table-thead .ant-table-filter-trigger:hover,
        .ws-table .ant-table-thead .ant-table-filter-trigger.active { color: #fff !important; background: rgba(255,255,255,0.18) !important; }
        .ws-table .ant-table-thead .anticon { color: rgba(255,255,255,0.85) !important; }
        .ws-table .ant-table-tbody > tr > td { padding: 5px 8px !important; font-size: 12px; vertical-align: middle; border-bottom: 1px solid #DDE1E8 !important; }
        .ws-table .ant-table-tbody > tr:hover > td { background: #DDE1E8 !important; }
        .ws-table .ant-table-tbody > tr:nth-child(even) > td { background: #EAECF2; }
        .ws-table .ant-table-tbody > tr:nth-child(even):hover > td { background: #DDE1E8 !important; }
        /* ── Deviation table: lighter header ── */
        .ws-dev-table .ant-table-thead > tr > th {
          background: #898989 !important;
          background-image: none !important;
          border-right: 1px solid #a0a0a0 !important;
        }
        .ws-dev-table .ant-table-thead > tr > th.ant-table-column-sort {
          background: #757575 !important;
          background-image: none !important;
        }

        /* Tab bar */
        .ws-tabs > .ant-tabs-nav { margin: 0 !important; background: #006666; padding: 0 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.25); }
        .ws-tabs > .ant-tabs-nav .ant-tabs-tab { color: #ffffff !important; border: none !important; background: transparent !important; padding: 9px 18px !important; font-size: 13px; margin: 0 2px !important; border-radius: 6px 6px 0 0 !important; transition: all 0.2s; }
        .ws-tabs > .ant-tabs-nav .ant-tabs-tab:hover { color: #FDE68A !important; background: rgba(255,255,255,0.15) !important; }
        .ws-tabs > .ant-tabs-nav .ant-tabs-tab-active { color: #fff !important; background: rgba(0,0,0,0.2) !important; font-weight: 700; box-shadow: 0 -3px 0 #FDE68A inset; }
        .ws-tabs > .ant-tabs-nav .ant-tabs-ink-bar { background: #FDE68A !important; height: 3px !important; border-radius: 2px; }
        .ws-tabs > .ant-tabs-nav::before { border-bottom: none !important; }
        .ws-tabs > .ant-tabs-nav .ant-tabs-nav-wrap::before,
        .ws-tabs > .ant-tabs-nav .ant-tabs-nav-wrap::after { box-shadow: none !important; }
        .ws-tabs > .ant-tabs-nav .ant-tabs-nav-more { color: #ffffff !important; }

        /* ── Desktop: show table, hide cards; show inline filter ── */
        .ws-desktop-view        { display: block; }
        .ws-mobile-view         { display: none !important; }
        .ws-mobile-action-row   { display: none !important; }
        .ws-desktop-actions     { display: inline-flex; gap: 6px; align-items: center; }
        .ws-filter-inputs       { display: contents; }

        /* ── Mobile layout (≤768px) ── */
        @media (max-width: 768px) {
          /* Show cards, hide table */
          .ws-desktop-view { display: none !important; }
          .ws-mobile-view  { display: flex !important; }

          /* Tab bar: smaller text, keep scrollable */
          .ws-tabs > .ant-tabs-nav { padding: 0 4px !important; }
          .ws-tabs > .ant-tabs-nav .ant-tabs-tab { padding: 8px 10px !important; font-size: 11px !important; margin: 0 1px !important; }
          .ws-tabs > .ant-tabs-nav-wrap { overflow-x: auto !important; }

          /* Sub-tab bar (Danh sách / Đã ẩn) */
          .ws-inner-tabs > div { padding: 7px 12px !important; font-size: 12px !important; }

          /* Extra content in tab bar: hide text label on mobile */
          .ws-tab-title-text { display: none !important; }

          /* Detail drawer */
          .ant-drawer-body { -webkit-overflow-scrolling: touch; }

          /* Filter bar: compact toggle row */
          .ws-filter-bar { flex-direction: row !important; flex-wrap: nowrap !important; padding: 5px 8px !important; }
          .ws-mobile-action-row { display: flex !important; width: 100%; gap: 6px; align-items: center; }
          .ws-desktop-actions { display: none !important; }

          /* Filter panel: hidden by default, shown when open */
          .ws-filter-inputs { display: none !important; flex-direction: column; gap: 6px; width: 100%; }
          .ws-filter-inputs.ws-filter-inputs-open { display: flex !important; }
          .ws-filter-inputs .ant-picker-range { width: 100% !important; }
          .ws-filter-inputs .ant-input { width: 100% !important; }
          .ws-filter-inputs .ant-select { width: 100% !important; }
        }

        @media (max-width: 480px) {
          .ws-tabs > .ant-tabs-nav .ant-tabs-tab { padding: 7px 7px !important; font-size: 10px !important; }
        }
      `}</style>

      {kphModalOpen ? (
        <KphModal
          workScheduleRecord={kphRecord}
          onClose={() => setKphModalOpen(false)}
          onSaved={() => fetchDeviations(0)}
        />
      ) : (
        <Tabs
          className="ws-tabs"
          activeKey={activeTab}
          onChange={key => {
            setActiveTab(key)
            localStorage.setItem('ws_active_tab', key)
            if (key === 'deviation') fetchDeviations(0)
          }}
          items={tabItems}
          type="line"
          size="middle"
          tabBarExtraContent={
            <Space style={{ paddingRight: 8 }}>
              {isAdmin() && <SyncScheduleButton />}
              <Typography.Text strong className="ws-tab-title-text" style={{ color: '#DDE1E8', fontSize: 14, letterSpacing: 0.3 }}>
                Lịch làm việc sản xuất
              </Typography.Text>
            </Space>
          }
          tabBarStyle={{ position: 'sticky', top: 0, zIndex: 10, margin: 0, paddingBottom: 0 }}
        />
      )}
    </>
  )
}
