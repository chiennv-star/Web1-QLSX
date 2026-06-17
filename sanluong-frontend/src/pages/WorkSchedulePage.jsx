import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Table, Button, Space, Typography, Input, Select, DatePicker,
  Modal, Form, InputNumber, Tag, Popconfirm, message,
  Row, Col, Card, Tabs, Badge, Tooltip, Divider, Drawer, Spin, Dropdown, AutoComplete
} from 'antd'
import SkeletonTable from '../components/SkeletonTable'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  ReloadOutlined, WarningOutlined, CalendarOutlined,
  SyncOutlined, CheckCircleOutlined, EyeOutlined, LinkOutlined,
  CheckOutlined, CloseOutlined, BellOutlined, EyeInvisibleOutlined,
  EyeTwoTone, SettingOutlined, DownOutlined, FilterOutlined, UsergroupAddOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import WipPage from './WipPage'
import PhongThucHienSelect from '../components/PhongThucHienSelect'
import KphModal from './KphModal'

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

const TO_NHOM_OPTIONS = {
  PC:    ['PCPL1', 'PCPL2', 'PCPL3', 'ĐG', 'BBC1'],
  PCPL1: ['PCPL1', 'PCPL2', 'PCPL3', 'ĐG', 'BBC1'],
  PCPL2: ['PCPL1', 'PCPL2', 'PCPL3', 'ĐG', 'BBC1'],
  PL:    ['PCPL1', 'PCPL2', 'PCPL3', 'ĐG', 'BBC1'],
  DG:    ['PCPL1', 'PCPL2', 'PCPL3', 'ĐG', 'BBC1'],
  BBC1:  ['PCPL1', 'PCPL2', 'PCPL3', 'ĐG', 'BBC1'],
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
      { name: 'slDg', label: 'SL ĐG' },
      { name: 'congDg', label: 'Công ĐG' }
    ]
  },
  CC: {
    label: 'Lịch cân chia',
    extraTableCols: [
      { title: 'Công Cân Chia', dataIndex: 'congCc', key: 'congCc', width: 105, align: 'center', render: fmtNum }
    ],
    extraFormFields: [
      { name: 'congCc', label: 'Công Cân Chia' }
    ]
  }
}


// ── WorkDetailDrawer ──────────────────────────────────────────────────────────
const CONG_FIELD_MAP   = { PC: 'congPc', PCPL1: 'congPc', PCPL2: 'congPc', BBC1: 'congBbc1', PL: 'congPl', DG: 'congDg', CC: 'congCc' }
const SL_FIELD_MAP     = { PC: 'slPc',   PCPL1: 'slPc',   PCPL2: 'slPc',  BBC1: 'slBbc1',   PL: 'slPl',   DG: 'slDg' }
const NS_LOOKUP_FIELD  = { PC: 'nangSuatPc', PCPL1: 'nangSuatPc', PCPL2: 'nangSuatPc', PL: 'nangSuatPl', BBC1: 'nangSuatBbc1', DG: 'slTrungBinh', CC: 'slTrungBinh' }

function WorkDetailDrawer({ open, schedule, onClose, onSaved, onRefresh }) {
  const { isAdmin, isAdminKH, isStageAdmin, canEditStage, canDeleteSchedule } = useAuth()
  const canEditDetail = canEditStage(schedule?.congDoan)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(null)
  const [maNvErrorKeys, setMaNvErrorKeys] = useState(new Set()) // keys có lỗi maNhanVien
  const [editingKeys, setEditingKeys] = useState(new Set())
  const [batchEditDays, setBatchEditDays] = useState(new Set())
  const [batchSaving, setBatchSaving] = useState(new Set())
  const [savedSlKeys, setSavedSlKeys] = useState(new Set())
  const [slEditOriginal, setSlEditOriginal] = useState({})
  const [slHistory, setSlHistory] = useState({})
  const [contextMenu, setContextMenu] = useState(null)
  const [pendingDaySet, setPendingDaySet] = useState(new Set())
  const [renamingDay, setRenamingDay] = useState(null)   // ngayKey đang đổi ngày
  const [renameDayVal, setRenameDayVal] = useState('')   // giá trị ngày mới
  const [renameSaving, setRenameSaving] = useState(false)
  // ── Inline edit form ──
  const [infoForm] = Form.useForm()
  const watchedToNhom = Form.useWatch('toNhom', infoForm)
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
  const [savingDay, setSavingDay] = useState(null)
  const [pendingDays, setPendingDays] = useState([])
  const [employees, setEmployees] = useState([])
  const scrollDivRef = useRef(null)  // ref cho div overflowY:auto bên dưới
  const VAI_TRO_KEY = 'vaitro_options'
  const DEFAULT_VAI_TRO = ['Trưởng ca', 'Phụ máy']
  const [vaiTroOptions, setVaiTroOptions] = useState(() => {
    try { const s = localStorage.getItem(VAI_TRO_KEY); return s ? JSON.parse(s) : DEFAULT_VAI_TRO }
    catch { return DEFAULT_VAI_TRO }
  })
  const [vaiTroModalOpen, setVaiTroModalOpen] = useState(false)
  const [newVaiTroInput, setNewVaiTroInput] = useState('')
  const [multiAddModal, setMultiAddModal] = useState({ open: false, ngayKey: null, nhom: '', selectedEmps: [], caSX: '', thoiGian: '' })
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
    setPendingDaySet(new Set())
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
        // Current session-computed totals override for this stage
        ...(congField ? { [congField]: tongCong || null } : {}),
        ...(slField   ? { [slField]:   tongSanLuong || null } : {}),
        ngayThucHien: values.ngayThucHien?.format('YYYY-MM-DD'),
        congDoan: schedule.congDoan,
        source: 'SCHEDULE',
      })
      message.success('Đã lưu thông tin')
      setIsInfoEditing(false)
      setIsDirty(false)
      setLookupStatus(null)
      onSaved()
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
      const { data } = await api.get('/work-schedule-session', { params: { scheduleId: schedule.id } })
      const normalized = data.map(normalizeSession)
      setSessions(normalized)
      const slMap = {}
      normalized.forEach(s => {
        const key = s.ngay || 'unknown'
        if (slMap[key] === undefined && s.sanLuong != null) {
          slMap[key] = String(Math.round(parseFloat(s.sanLuong)))
        }
      })
      setDaySlMap(slMap)
      setSavedSlKeys(new Set(Object.keys(slMap)))
      // Load pending change requests for this schedule
      try {
        const { data: changeReqs } = await api.get(`/sl-change-request/for-schedule/${schedule.id}`)
        const pending = new Set(changeReqs.filter(r => r.status === 'PENDING').map(r => r.ngay))
        setPendingDaySet(pending)
      } catch { /* non-blocking */ }
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
    setPendingDays(prev => [...prev, { tempId: Date.now(), ngay: dayjs().format('YYYY-MM-DD') }])
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

  const confirmMultiAdd = () => {
    const { ngayKey, nhom, selectedEmps, caSX, thoiGian } = multiAddModal
    if (!selectedEmps.length) { message.warning('Vui lòng chọn ít nhất 1 nhân viên'); return }
    const newRows = selectedEmps.map((emp, i) => ({
      _tempId: Date.now() + i, id: null, workScheduleId: schedule.id,
      ngay: ngayKey, maNhanVien: emp.maNhanVien || '', nguoiThucHien: emp.hoVaTen || '',
      nhomThucHien: nhom, thoiGianBatDau: thoiGian,
      congThucHien: caSX && thoiGian ? calcCong(thoiGian, caSX) : '',
      vaiTro: '', ghiChu: '', caSanXuat: caSX, isTangCa: false,
    }))
    setSessions(prev => [...prev, ...newRows])
    setBatchEditDays(prev => new Set([...prev, ngayKey]))
    setEditingKeys(prev => {
      const n = new Set(prev)
      newRows.forEach(r => n.add(r._tempId))
      return n
    })
    setMultiAddModal({ open: false, ngayKey: null, nhom: '', selectedEmps: [], caSX: '', thoiGian: '' })
  }

  const calcCong = (thoiGian, ca) => {
    const t = parseFloat(thoiGian)
    if (!t || !ca) return ''
    const divisor = ca === 'HC' ? 8 : 7
    return parseFloat((t / divisor).toFixed(2))
  }

  const updateLocal = (identifier, field, value) => {
    setSessions(prev => prev.map(s =>
      (s.id ? s.id === identifier : s._tempId === identifier)
        ? { ...s, [field]: value } : s
    ))
  }

  const updateLocals = (identifier, fields) => {
    setSessions(prev => prev.map(s =>
      (s.id ? s.id === identifier : s._tempId === identifier)
        ? { ...s, ...fields } : s
    ))
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
      onRefresh?.()
      message.success('Đã lưu')
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
      message.warning('Một số dòng lưu thất bại hoặc thiếu Mã NV')
    } else {
      setBatchEditDays(prev => { const n = new Set(prev); n.delete(ngayKey); return n })
      message.success('Đã lưu tất cả')
    }
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

  const saveDaySl = async (ngayKey) => {
    const val = daySlMap[ngayKey]
    if (val === '' || val === undefined) return
    const rows = sessions.filter(s => (s.ngay || 'unknown') === ngayKey)
    const first = rows[0]
    if (!first?.id) return
    setSavingDay(ngayKey)

    // Stage admin → luôn phải gửi yêu cầu phê duyệt, chỉ ADMIN/ADMIN_KH lưu trực tiếp
    const hasExistingSl = first.sanLuong != null && first.sanLuong !== ''
    const needsApproval = isStageAdmin() || (!canEditDetail && hasExistingSl)
    if (needsApproval) {
      try {
        await api.post('/sl-change-request', {
          workScheduleId: schedule.id,
          workScheduleSessionId: first.id,
          congDoan: schedule.congDoan,
          maSp: schedule.maSp,
          tenTrinh: schedule.tenTrinh,
          soLo: schedule.soLo,
          ngay: ngayKey,
          newValue: parseInt(val, 10),
        })
        setPendingDaySet(prev => new Set([...prev, ngayKey]))
        setSavedSlKeys(prev => new Set([...prev, ngayKey]))
        message.info('Yêu cầu thay đổi đã gửi, chờ quản trị viên duyệt')
      } catch (e) {
        message.error(e?.response?.data?.message || 'Gửi yêu cầu thất bại')
      }
      finally { setSavingDay(null) }
      return
    }

    try {
      const { data } = await api.put(`/work-schedule-session/${first.id}`, {
        workScheduleId: schedule.id,
        ngay: first.ngay || null,
        nguoiThucHien: first.nguoiThucHien || null,
        maNhanVien: first.maNhanVien || null,
        nhomThucHien: first.nhomThucHien || null,
        caSanXuat: first.caSanXuat || null,
        thoiGianBatDau: first.thoiGianBatDau || null,
        thoiGianKetThuc: first.thoiGianKetThuc || null,
        congThucHien: first.congThucHien !== '' ? first.congThucHien : null,
        soGioThucHien: first.soGioThucHien != null ? parseFloat(first.soGioThucHien) : null,
        vaiTro: first.vaiTro || null,
        ghiChu: first.ghiChu || null,
        sanLuong: parseInt(val, 10),
        nangSuat: first.nangSuat != null ? parseFloat(first.nangSuat) : null,
        nangSuatTrungBinh: first.nangSuatTrungBinh != null ? parseFloat(first.nangSuatTrungBinh) : null,
      })
      setSessions(prev => prev.map(r => r.id === first.id ? normalizeSession(data) : r))
      const newTongSl = Object.values({ ...daySlMap, [ngayKey]: val })
        .reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
      syncSl(newTongSl)
      setSavedSlKeys(prev => new Set([...prev, ngayKey]))
      setSlEditOriginal(prev => { const n = { ...prev }; delete n[ngayKey]; return n })
      setSlHistory(prev => ({
        ...prev,
        [ngayKey]: [...(prev[ngayKey] || []), { value: parseInt(val, 10), savedAt: new Date() }],
      }))
      onRefresh?.()
      message.success('Đã lưu sản lượng')
    } catch (err) {
      message.error(err?.response?.data?.message || err?.message || 'Lưu sản lượng thất bại')
    }
    finally { setSavingDay(null) }
  }

  const cellStyle = { padding: '5px 8px', border: '1px solid #d9d9d9', verticalAlign: 'middle' }
  const headStyle = { ...cellStyle, background: '#e6f4ff', fontWeight: 600, color: '#1677ff', whiteSpace: 'nowrap' }
  const subHeadStyle = { ...cellStyle, background: '#fff7e6', fontWeight: 600, color: '#1890ff', whiteSpace: 'nowrap' }
  const inputStyle = { width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 12 }

  const nangSuat = tongCong > 0 && tongSanLuong > 0 ? tongSanLuong / tongCong : null

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

  const renderListTab = () => (
    <>
      <div style={{ overflowX: 'auto', marginBottom: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={subHeadStyle}>Ngày thực hiện</th>
              <th style={{ ...subHeadStyle, textAlign: 'right' }}>Số dòng</th>
              <th style={{ ...subHeadStyle, textAlign: 'right' }}>Tổng công</th>
              <th style={{ ...subHeadStyle, textAlign: 'right' }}>Sản lượng ngày</th>
              <th style={{ ...subHeadStyle, textAlign: 'right' }}>Năng suất</th>
              {canEditDetail && <th style={{ ...subHeadStyle, textAlign: 'center', width: 36 }}></th>}
            </tr>
          </thead>
          <tbody>
            {ngayKeys.length === 0 && pendingDays.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...cellStyle, textAlign: 'center', color: '#aaa', padding: 20 }}>
                  Chưa có dữ liệu. Nhấn "Thêm ngày" để bắt đầu.
                </td>
              </tr>
            )}
            {ngayKeys.map(k => {
              const rows = sessions.filter(s => (s.ngay || 'unknown') === k)
              const tong = rows.reduce((a, r) => a + (parseFloat(r.congThucHien) || 0), 0)
              const slVal = daySlMap[k] ?? ''
              const slNum = parseFloat(slVal) || 0
              const nsNgay = tong > 0 && slNum > 0 ? slNum / tong : 0
              const isOpen = openTabs.includes(k)
              return (
                <tr key={k} style={{ cursor: 'pointer', background: isOpen ? '#f6ffed' : '' }}
                  onClick={() => openDetail(k)}>
                  <td style={{ ...cellStyle, color: '#1677ff', fontWeight: 600 }}>
                    {renamingDay === k ? (
                      <Space size={4} onClick={e => e.stopPropagation()}>
                        <input type="date" style={{ ...inputStyle, width: 130, fontSize: 12 }}
                          value={renameDayVal}
                          onChange={e => setRenameDayVal(e.target.value)}
                          autoFocus
                        />
                        <Button size="small" type="primary" loading={renameSaving}
                          disabled={!renameDayVal}
                          onClick={() => renameDayKey(k, renameDayVal)}
                          style={{ fontSize: 11, padding: '0 6px' }}>✓</Button>
                        <Button size="small" onClick={() => setRenamingDay(null)}
                          style={{ fontSize: 11, padding: '0 6px' }}>✕</Button>
                      </Space>
                    ) : (
                      <Space size={4}>
                        <span>{k !== 'unknown' && dayjs(k).isValid() ? dayjs(k).format('DD/MM/YYYY') : k}</span>
                        {isOpen && <Tag color="green" style={{ margin: 0, fontSize: 11 }}>Đang mở</Tag>}
                        {canEditDetail && (
                          <Button size="small" type="text" icon={<EditOutlined />}
                            onClick={e => { e.stopPropagation(); setRenamingDay(k); setRenameDayVal(k) }}
                            style={{ color: '#8c8c8c', padding: '0 2px', height: 18, minWidth: 18, fontSize: 11 }}
                          />
                        )}
                      </Space>
                    )}
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>{rows.length}</td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>{tong ? tong.toLocaleString('vi-VN', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : '—'}</td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>
                    {slVal !== '' && slVal != null
                      ? <span style={{ fontWeight: 600, color: '#722ed1' }}>{Number(slVal).toLocaleString('vi-VN')}</span>
                      : <span style={{ color: '#aaa' }}>—</span>}
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>
                    {(() => {
                      if (!nsNgay) return '—'
                      let color = '#262626'
                      let arrow = ''
                      if (nsTrungBinh && nsNgay > nsTrungBinh) { color = '#389e0d'; arrow = ' ▲' }
                      if (nsTrungBinh && nsNgay < nsTrungBinh) { color = '#cf1322'; arrow = ' ▼' }
                      if (!nsTrungBinh) return <span style={{ fontWeight: 600, color }}>{Math.round(nsNgay).toLocaleString('vi-VN')}</span>
                      const delta = nsNgay - nsTrungBinh
                      const pct = (delta / nsTrungBinh) * 100
                      const sign = delta >= 0 ? '+' : ''
                      return (
                        <span style={{ fontWeight: 600, color }}>
                          {Math.round(nsNgay).toLocaleString('vi-VN')}
                          <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 3 }}>
                            {sign}{Math.round(delta).toLocaleString('vi-VN')} ({sign}{pct.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%){arrow}
                          </span>
                        </span>
                      )
                    })()}
                  </td>
                  {canEditDetail && (
                    <td style={{ ...cellStyle, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <Popconfirm
                        title={`Xóa toàn bộ dữ liệu ngày ${k !== 'unknown' && dayjs(k).isValid() ? dayjs(k).format('DD/MM/YYYY') : k}?`}
                        description={`Sẽ xóa ${rows.length} bản ghi sản xuất.`}
                        onConfirm={() => deleteDaySessions(k)}
                        okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
                      >
                        <Button size="small" type="text" danger icon={<DeleteOutlined />}
                          style={{ padding: '0 4px', height: 20 }} />
                      </Popconfirm>
                    </td>
                  )}
                </tr>
              )
            })}
            {pendingDays.map(pd => {
              const goToTab = () => {
                setPendingDays(prev => prev.filter(p => p.tempId !== pd.tempId))
                openDetail(pd.ngay)
              }
              return (
                <tr key={pd.tempId} className="ws-row-new" style={{ background: '#fffbe6' }}>
                  <td style={{ ...cellStyle, padding: '2px 6px' }}>
                    <Space size={4}>
                      <input type="date" style={{ ...inputStyle, width: 120, fontSize: 12 }} value={pd.ngay}
                        onChange={e => setPendingDays(prev =>
                          prev.map(p => p.tempId === pd.tempId ? { ...p, ngay: e.target.value } : p)
                        )} />
                      <Button
                        size="small" type="primary"
                        style={{ fontSize: 12, padding: '0 8px' }}
                        onClick={goToTab}>
                        Mở →
                      </Button>
                    </Space>
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'right', color: '#aaa' }}>0</td>
                  <td style={{ ...cellStyle, textAlign: 'right', color: '#aaa' }}>—</td>
                  <td style={{ ...cellStyle, textAlign: 'right', color: '#aaa' }}>—</td>
                  <td style={{ ...cellStyle, textAlign: 'right', color: '#aaa' }}>—</td>
                  {canEditDetail && <td style={cellStyle} />}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {canEditDetail && <Button icon={<PlusOutlined />} onClick={addNewDay} type="dashed" block>Thêm ngày</Button>}
    </>
  )

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
                {canEditDetail && !pendingDaySet.has(ngayKey) && (
                  <Button size="small" icon={<EditOutlined />}
                    style={{ color: '#722ed1', borderColor: '#d3adf7', fontWeight: 600, fontSize: 12 }}
                    onClick={() => {
                      setSlEditOriginal(prev => ({ ...prev, [ngayKey]: slVal }))
                      setSavedSlKeys(prev => { const next = new Set(prev); next.delete(ngayKey); return next })
                    }}>
                    Sửa
                  </Button>
                )}
                {pendingDaySet.has(ngayKey) && <Tag color="orange" style={{ fontSize: 11, marginRight: 0 }}>Chờ duyệt</Tag>}
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
                  placeholder="Nhập SL mới..."
                  value={slVal !== '' && slVal != null ? Number(slVal) : undefined}
                  min={0}
                  step={1}
                  formatter={v => v != null && v !== '' ? Number(v).toLocaleString('vi-VN') : ''}
                  parser={v => v ? v.replace(/[^\d]/g, '') : ''}
                  onChange={v => setDaySlMap(prev => ({ ...prev, [ngayKey]: v != null ? String(v) : '' }))}
                  onPressEnter={() => saveDaySl(ngayKey)}
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
                  'Ghi Chú'].map((h, i) => (
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
                    <td style={{ ...cellStyle, width: 110, textAlign: 'right', fontWeight: 600 }}>{s.congThucHien ?? <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td style={{ ...cellStyle, minWidth: 110 }}>
                      {s.vaiTro
                        ? <Tag color={s.vaiTro === 'Trưởng ca' ? 'gold' : 'geekblue'} style={{ marginRight: 0 }}>{s.vaiTro}</Tag>
                        : <span style={{ color: '#bbb' }}>—</span>}
                    </td>
                    <td style={{ ...cellStyle, minWidth: 150 }}>{s.ghiChu || <span style={{ color: '#bbb' }}>—</span>}</td>
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
                        {['PCPL1', 'PCPL2', 'PCPL3', 'BBC1', 'ĐG'].map(v => (
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
                          const newCong = calcCong(s.thoiGianBatDau, ca)
                          updateLocals(key, { caSanXuat: ca, congThucHien: newCong })
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
       pendingDaySet, editingKeys, batchEditDays, batchSaving, saving, savingDay,
       nsTrungBinh, employees, vaiTroOptions, canEditDetail, multiAddModal, maNvErrorKeys,
       tongCong, tongSanLuong, ngayKeys, renamingDay, renameDayVal, renameSaving,
       schedule, contextMenu])

  const handleDrawerClose = () => {
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
    <Drawer
      title={<Space><EyeOutlined /><span>Chi tiết sản xuất — {schedule?.tenTrinh || schedule?.maSp}</span></Space>}
      open={open}
      onClose={handleDrawerClose}
      width="100vw"
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' } }}
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
      <div style={{ flexShrink: 0, background: '#006666', padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>⚙️</span>
        <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'nowrap', overflow: 'hidden' }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1 }}>
            {schedule?.tenTrinh || schedule?.maSp || 'Chi tiết sản xuất'}
          </span>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, display: 'flex', gap: 14, flexShrink: 0, whiteSpace: 'nowrap' }}>
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
        ) : canEditDetail ? (
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
        ) : null}
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
              <div style={{
                padding: '4px 8px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center',
                ...(span ? { gridColumn: `span ${span}` } : {}),
                ...s,
              }}>{children}</div>
            )
            return (
              <div style={{ padding: '10px 16px 10px', background: '#fff' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 110px 1fr 110px 1fr 110px 1fr', border: '1px solid #e2e8f0', borderRadius: 7, overflow: 'hidden' }}>

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
                  <LC>🏢 Phòng TH</LC>
                  <VC style={{ borderRight: 'none' }}>
                    <Form.Item name="phongThucHien" noStyle>
                      <PhongThucHienSelect size="small" disabled={!isInfoEditing} style={{ width: '100%' }} placeholder="VD: Pha chế 06" />
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
                          ? employees.filter(e => e.toNhom === watchedToNhom)
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
                          ? employees.filter(e => e.toNhom === watchedToNhom)
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
                      const ns = tongCong > 0 && tongSanLuong > 0 ? tongSanLuong / tongCong : null
                      return ns != null
                        ? <span style={{ fontWeight: 700, color: '#d46b08', fontFamily: 'monospace', fontSize: 13 }}>{Math.round(ns).toLocaleString('vi-VN')}</span>
                        : <span style={{ color: '#aaa', fontSize: 13 }}>—</span>
                    })()}
                  </VC>
                  <LC accent="#0891b2">🔬 QA Lấy mẫu</LC>
                  <VC style={{ borderRight: 'none' }}>
                    <Form.Item name="qaLayMau" noStyle>
                      <InputNumber size="small" min={0} step={1} disabled={!isInfoEditing}
                        formatter={v => v ? Number(v).toLocaleString('vi-VN') : ''}
                        parser={v => v ? v.replace(/[^\d]/g, '') : 0}
                        style={{ width: '100%', fontWeight: 700 }} placeholder="0" />
                    </Form.Item>
                  </VC>
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
        {loading ? <Spin style={{ display: 'block', margin: '40px auto' }} /> : (
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
        )}
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
        onCancel={() => setMultiAddModal({ open: false, ngayKey: null, nhom: '', selectedEmps: [], caSX: '', thoiGian: '' })}
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
              onChange={e => setMultiAddModal(prev => ({ ...prev, nhom: e.target.value, selectedEmps: [] }))}
            >
              <option value="">-- Chọn nhóm --</option>
              {['PCPL1', 'PCPL2', 'PCPL3', 'BBC1', 'ĐG'].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Danh sách nhân viên trong nhóm */}
          {multiAddModal.nhom && (() => {
            const empList = employees.filter(e => e.toNhom === multiAddModal.nhom)
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
      destroyOnClose
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
            <Form.Item label="Phòng thực hiện" name="phongThucHien">
              <PhongThucHienSelect style={{ width: '100%' }} />
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

// ── StageTab ──────────────────────────────────────────────────────────────────
function StageTab({ congDoan, config, forcedNhom = null, onSaved: parentOnSaved, jumpTarget }) {
  const navigate = useNavigate()
  const { canEditStage, getAllowedNhom, isNhanVien, canDeleteSchedule, user } = useAuth()
  const allowedNhom = forcedNhom || (congDoan === 'PC' ? getAllowedNhom() : null)
  const AUTO_DEFAULT_NHOM = { DG: 'ĐG', BBC1: 'BBC1' }
  const defaultModalNhom = allowedNhom || AUTO_DEFAULT_NHOM[congDoan] || null
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 1000, total: 0 })
  const paginationRef = useRef({ current: 1, pageSize: 1000 })
  const [filters, setFilters] = useState({
    dateRange: null,
    maSp: '',
    tenTrinh: '',
    soLo: '',
    tinhTrang: ''
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [headerOffset, setHeaderOffset] = useState(46)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailSchedule, setDetailSchedule] = useState(null)
  const [highlightId, setHighlightId] = useState(null)
  const [nsMap, setNsMap] = useState({})
  const [updatingTT, setUpdatingTT] = useState({})
  const [innerTab, setInnerTab] = useState('list')
  const [hiddenCount, setHiddenCount] = useState(0)
  const [doneCount, setDoneCount] = useState(0)
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const jumpApplied = useRef(false)
  const controlsRef = useRef(null)

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
      // Fetch NS trung bình cho từng mã SP ngay sau khi có dữ liệu
      const uniqueMaSp = [...new Set(res.content.map(r => r.maSp).filter(Boolean))]
      if (uniqueMaSp.length > 0) {
        const nsField = NS_LOOKUP_FIELD[congDoan] || 'slTrungBinh'
        Promise.all(
          uniqueMaSp.map(maSp =>
            api.get(`/product-master/lookup/${encodeURIComponent(maSp)}`)
              .then(r => ({ maSp, ns: r.data[nsField] != null ? Number(r.data[nsField]) : null }))
              .catch(() => ({ maSp, ns: null }))
          )
        ).then(results => {
          const map = {}
          results.forEach(({ maSp, ns }) => { if (ns != null && ns > 0) map[maSp] = ns })
          setNsMap(map)
        })
      } else {
        setNsMap({})
      }
    } catch { if (!silent) message.error({ content: 'Không thể tải dữ liệu', key: 'ws-fetch-err', duration: 3 }) }
    finally { if (!silent) setLoading(false) }
  }, [congDoan, filters])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(0) }, [congDoan])

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
        if (congDoan === 'PL' && val === 'PCPL1') {
          await api.patch(`/work-schedule/${id}/hidden`, { hidden: true })
          setData(prev => prev.filter(r => r.id !== id))
          setHiddenCount(c => c + 1)
          setInlineEdit(null)
          message.success('Đã gán PCPL1 và chuyển sang "Đã ẩn"')
          parentOnSaved?.()
          return
        }
      } else if (field === 'phongThucHien') {
        await api.patch(`/work-schedule/${id}/phong-thuc-hien`, { phongThucHien: val || null })
      } else if (field === 'qaLayMau') {
        await api.patch(`/work-schedule/${id}/patch-field`, { field: 'qaLayMau', value: val ?? null })
      }
      setData(prev => prev.map(r => r.id === id ? { ...r, [field]: val ?? null } : r))
      setInlineEdit(null)
      parentOnSaved?.()
    } catch {
      message.error('Cập nhật thất bại')
    } finally {
      setInlineSaving(false)
    }
  }

  useEffect(() => {
    if (controlsRef.current) setHeaderOffset(46 + 38 + controlsRef.current.offsetHeight + 2)
  })

  const onSaved = () => { fetchData(0); parentOnSaved?.() }

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
      filters: ['PCPL1', 'PCPL2', 'PCPL3', 'BBC1', 'ĐG'].map(v => ({ text: v, value: v })),
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
              options={['PCPL1','PCPL2','PCPL3','BBC1','ĐG','PL'].map(o => ({ value: o, label: o }))}
            />
          )
        }
        return (
          <div
            onClick={canEdit ? e => { e.stopPropagation(); setInlineEdit({ id: record.id, field: 'toNhom' }) } : undefined}
            style={{ cursor: canEdit ? 'pointer' : 'default' }}
          >
            {v
              ? <Tag color="blue" style={{ marginRight: 0, cursor: canEdit ? 'pointer' : 'default' }}>{v}</Tag>
              : canEdit
                ? <Tag style={{ borderStyle: 'dashed', color: '#aaa', marginRight: 0, cursor: 'pointer' }}>Chọn nhóm</Tag>
                : <span style={{ color: '#d9d9d9' }}>—</span>}
          </div>
        )
      }
    },
    {
      title: 'Phòng TH', dataIndex: 'phongThucHien', key: 'phongThucHien', width: 120, align: 'center',
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
                ? <Tag style={{ borderStyle: 'dashed', color: '#aaa', marginRight: 0, cursor: 'pointer' }}>Chọn phòng</Tag>
                : <span style={{ color: '#d9d9d9' }}>—</span>}
          </div>
        )
      }
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
    ...config.extraTableCols,
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
    {
      title: 'QA Lấy mẫu', dataIndex: 'qaLayMau', key: 'qaLayMau', width: 96, align: 'center',
      render: (v, record) => {
        const canEdit = canEditStage(congDoan)
        const isEditing = inlineEdit?.id === record.id && inlineEdit?.field === 'qaLayMau'
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
                saveInlineEdit(record.id, 'qaLayMau', isNaN(num) ? null : num)
              }}
              onBlur={e => {
                if (!inlineSaving) {
                  const num = e.target.value ? parseInt(e.target.value.replace(/[^\d]/g, ''), 10) : null
                  saveInlineEdit(record.id, 'qaLayMau', isNaN(num) ? null : num)
                }
              }}
            />
          )
        }
        return (
          <div
            onClick={canEdit ? e => { e.stopPropagation(); setInlineEdit({ id: record.id, field: 'qaLayMau' }) } : undefined}
            style={{ cursor: canEdit ? 'pointer' : 'default', textAlign: 'right' }}
          >
            {v != null
              ? <span style={{ fontWeight: 600, color: '#0891b2' }}>{Number(v).toLocaleString('vi-VN')}</span>
              : canEdit
                ? <Tag style={{ borderStyle: 'dashed', color: '#aaa', marginRight: 0, cursor: 'pointer' }}>Nhập QA</Tag>
                : <span style={{ color: '#d9d9d9' }}>—</span>}
          </div>
        )
      },
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
      {/* ── Inner sub-tab bar (sticky ở top=46) ── */}
      <div className="ws-inner-tabs" style={{
        position: 'sticky', top: 46, zIndex: 10,
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', gap: 0,
        paddingLeft: 12,
      }}>
        {[
          { key: 'list', label: 'Danh sách', color: '#1677ff' },
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
          }
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
      </div>

      {/* ── Tab: Danh sách ── */}
      {innerTab === 'list' && (
        <>
          {(() => {
            const activeFilterCount = [
              filters.dateRange, filters.maSp, filters.tenTrinh, filters.soLo, filters.tinhTrang
            ].filter(Boolean).length
            const handleReset = () => {
              const reset = { dateRange: null, maSp: '', tenTrinh: '', soLo: '', tinhTrang: '' }
              setFilters(reset)
              fetchData(0, 20, reset)
            }
            return (
              <div ref={controlsRef} className="ws-filter-bar" style={{
                position: 'sticky', top: 84, zIndex: 9,
                background: '#f0f4ff', borderBottom: '2px solid #c5cef5',
                padding: '6px 12px', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap'
              }}>
                {/* Mobile-only toggle row */}
                <div className="ws-mobile-action-row">
                  <Button size="small"
                    type={activeFilterCount > 0 ? 'primary' : 'default'}
                    icon={<FilterOutlined />}
                    onClick={() => setFilterPanelOpen(v => !v)}
                  >
                    Bộ lọc{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                  </Button>
                  <div style={{ flex: 1 }} />
                  {canEditStage(congDoan) && (
                    <Button size="small" type="primary" icon={<PlusOutlined />}
                      onClick={() => { setEditItem(null); setModalOpen(true) }} />
                  )}
                  <Button size="small" type="primary" icon={<SearchOutlined />} onClick={() => fetchData(0)} />
                  <Button size="small" icon={<ReloadOutlined />} onClick={handleReset} />
                </div>

                {/* Filter inputs — desktop: always; mobile: collapsible */}
                <div className={`ws-filter-inputs${filterPanelOpen ? ' ws-filter-inputs-open' : ''}`}>
                  <RangePicker size="small" style={{ width: 224 }} format="DD/MM/YYYY"
                    placeholder={['Từ ngày', 'Đến ngày']}
                    value={filters.dateRange}
                    onChange={v => setFilters(f => ({ ...f, dateRange: v }))} />
                  <Input size="small" style={{ width: 96 }} placeholder="Mã SP" value={filters.maSp} allowClear
                    onChange={e => setFilters(f => ({ ...f, maSp: e.target.value }))}
                    onPressEnter={() => fetchData(0)} />
                  <Input size="small" style={{ width: 148 }} placeholder="Tiến trình" value={filters.tenTrinh} allowClear
                    onChange={e => setFilters(f => ({ ...f, tenTrinh: e.target.value }))}
                    onPressEnter={() => fetchData(0)} />
                  <Input size="small" style={{ width: 110 }} placeholder="Lô sản xuất" value={filters.soLo} allowClear
                    onChange={e => setFilters(f => ({ ...f, soLo: e.target.value }))}
                    onPressEnter={() => fetchData(0)} />
                  <Select size="small" style={{ width: 110 }} placeholder="Tình trạng" allowClear
                    value={filters.tinhTrang || undefined}
                    onChange={v => setFilters(f => ({ ...f, tinhTrang: v || '' }))}>
                    <Option value="done">Done</Option>
                    <Option value="doing">Doing</Option>
                  </Select>
                  {/* Desktop-only: action buttons inline */}
                  <span className="ws-desktop-actions">
                    <Button size="small" type="primary" icon={<SearchOutlined />} onClick={() => fetchData(0)}>Tìm</Button>
                    <Button size="small" icon={<ReloadOutlined />} onClick={handleReset} />
                    {canEditStage(congDoan) && selectedRowKeys.length > 0 && (
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
                    {canEditStage(congDoan) && selectedRowKeys.length > 0 && (
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
                    {canEditStage(congDoan) && selectedRowKeys.length > 0 && canDeleteSchedule() && (
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
                    {canEditStage(congDoan) && (
                      <Button size="small" type="primary" icon={<PlusOutlined />}
                        onClick={() => { setEditItem(null); setModalOpen(true) }}>
                        Thêm mới
                      </Button>
                    )}
                  </span>
                </div>
              </div>
            )
          })()}

          {/* ── Desktop table ── */}
          <div className="ws-desktop-view">
          <SkeletonTable
            className="ws-table"
            columns={columns}
            dataSource={data.filter(r => r.tinhTrang !== 'done')}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1600 + config.extraTableCols.length * 87 }}
            size="small"
            sticky={{ offsetHeader: headerOffset }}
            rowHoverable={false}
            rowSelection={canEditStage(congDoan) && !allowedNhom && !['ADMIN_PCPL1','ADMIN_PCPL2','ADMIN_PCPL3','ADMIN_DG','ADMIN_BBC1'].includes(user?.role) ? {
              selectedRowKeys,
              onChange: keys => setSelectedRowKeys(keys),
              preserveSelectedRowKeys: true,
            } : undefined}
            rowClassName={record => {
              const slField = SL_FIELD_MAP[congDoan]
              const sl = slField ? Number(record[slField]) || 0 : 0
              const coLo = Number(record.coLo) || 0
              const slExceeds = sl > 0 && coLo > 0 && sl > coLo
              if (record.id === highlightId && record.saiLech) return 'row-has-deviation row-jump-highlight'
              if (record.id === highlightId) return 'row-jump-highlight'
              if (record.saiLech) return 'row-has-deviation'
              if (slExceeds) return 'row-sl-exceed'
              return getNsRowClass(record)
            }}
            onRow={record => ({
              id: `ws-row-${record.id}`,
              style: { cursor: 'pointer' },
              onClick: () => {
                setDetailSchedule(record)
                setDetailOpen(true)
              },
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
            {!loading && data.filter(r => r.tinhTrang !== 'done').map(record => (
              <MobileScheduleCard
                key={record.id}
                record={record}
                congDoan={congDoan}
                nsMap={nsMap}
                onClick={() => { setDetailSchedule(record); setDetailOpen(true) }}
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
          onUndone={() => fetchData(0)}
          onCountChange={setDoneCount}
          onRowClick={r => { setDetailSchedule(r); setDetailOpen(true) }}
        />
      )}

      {/* ── Tab: Đã ẩn ── */}
      {innerTab === 'hidden' && (
        <HiddenTab
          congDoan={congDoan}
          toNhom={forcedNhom}
          onUnhide={() => fetchData(0)}
          onCountChange={setHiddenCount}
        />
      )}

      <WorkDetailDrawer
        open={detailOpen}
        schedule={detailSchedule}
        onClose={() => setDetailOpen(false)}
        onSaved={() => { setDetailOpen(false); onSaved() }}
        onRefresh={onSaved}
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

// ── DoneTab ───────────────────────────────────────────────────────────────────
function DoneTab({ congDoan, toNhom, onUndone, onCountChange, onRowClick }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 1000, total: 0 })
  const [filters, setFilters] = useState({ dateRange: null, maSp: '', soLo: '', tenTrinh: '', maBravo: '' })

  const fetchDone = useCallback(async (page = 0, size = 1000, f = filters) => {
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
      setData(res.content || [])
      setPagination(p => ({ ...p, total: res.totalElements, current: page + 1, pageSize: size }))
      onCountChange?.(res.totalElements)
    } catch { message.error({ content: 'Không thể tải lịch đã hoàn thiện', key: 'ws-done-err', duration: 3 }) }
    finally { setLoading(false) }
  }, [congDoan, toNhom, filters])

  useEffect(() => { fetchDone(0) }, [fetchDone])

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
      title: 'Tiến trình', dataIndex: 'tenTrinh', key: 'tenTrinh',
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
      title: 'Ngày hoàn thiện', dataIndex: 'updatedAt', key: 'updatedAt', width: 120, align: 'center',
      render: v => v ? <span style={{ fontSize: 12, color: '#15803d' }}>{dayjs(v).format('DD/MM/YYYY')}</span> : '—'
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
      {/* Toolbar */}
      <div style={{
        position: 'sticky', top: 84, zIndex: 9,
        background: '#f0fdf4', borderBottom: '2px solid #86efac',
        padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
      }}>
        <CheckCircleOutlined style={{ color: '#15803d', fontSize: 15 }} />
        <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>
          Lịch đã hoàn thiện — Tổng: {pagination.total}
        </span>
        <RangePicker size="small" style={{ width: 210 }} format="DD/MM/YYYY"
          placeholder={['Từ ngày', 'Đến ngày']}
          value={filters.dateRange}
          onChange={v => setFilters(f => ({ ...f, dateRange: v }))} />
        <Input size="small" style={{ width: 90 }} placeholder="Mã SP" allowClear
          value={filters.maSp}
          onChange={e => setFilters(f => ({ ...f, maSp: e.target.value }))}
          onPressEnter={() => fetchDone(0)} />
        <Input size="small" style={{ width: 100 }} placeholder="Số lô" allowClear
          value={filters.soLo}
          onChange={e => setFilters(f => ({ ...f, soLo: e.target.value }))}
          onPressEnter={() => fetchDone(0)} />
        <Input size="small" style={{ width: 160 }} placeholder="Tên sản phẩm" allowClear
          value={filters.tenTrinh}
          onChange={e => setFilters(f => ({ ...f, tenTrinh: e.target.value }))}
          onPressEnter={() => fetchDone(0)} />
        <Input size="small" style={{ width: 110 }} placeholder="Mã Bravo" allowClear
          value={filters.maBravo}
          onChange={e => setFilters(f => ({ ...f, maBravo: e.target.value }))}
          onPressEnter={() => fetchDone(0)} />
        <Button size="small" type="primary" icon={<SearchOutlined />}
          style={{ background: '#15803d', borderColor: '#15803d' }}
          onClick={() => fetchDone(0)}>Tìm</Button>
        <Button size="small" icon={<ReloadOutlined />} onClick={() => fetchDone(0)} loading={loading}
          style={{ marginLeft: 'auto' }} />
      </div>

      <SkeletonTable
        className="ws-table"
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 900 }}
        sticky={{ offsetHeader: 46 }}
        rowHoverable={false}
        onRow={r => ({
          onClick: () => onRowClick?.(r),
          style: { cursor: onRowClick ? 'pointer' : 'default' },
        })}
        pagination={false}
      />
    </div>
  )
}

// ── HiddenTab ─────────────────────────────────────────────────────────────────
function HiddenTab({ congDoan, toNhom, onUnhide, onCountChange }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 1000, total: 0 })
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)

  const fetchHidden = useCallback(async (page = 0, size = 1000) => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/work-schedule/hidden', {
        params: { source: 'SCHEDULE', congDoan, toNhom: toNhom || undefined, page, size }
      })
      setData(res.content || [])
      setPagination(p => ({ ...p, total: res.totalElements, current: page + 1, pageSize: size }))
      onCountChange?.(res.totalElements)
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
      title: 'Tiến trình', dataIndex: 'tenTrinh', key: 'tenTrinh',
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
      title: 'Tình trạng', dataIndex: 'tinhTrang', key: 'tinhTrang', width: 90, align: 'center',
      render: tinhTrangTag
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
          Bản ghi đã ẩn — Tổng: {pagination.total}
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
        dataSource={data}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 900 }}
        sticky={{ offsetHeader: 46 }}
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

// ── Admin Approval Panel ───────────────────────────────────────────────────────
function AdminApprovalPanel() {
  const [open, setOpen] = useState(false)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [rejectId, setRejectId] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [acting, setActing] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/sl-change-request/pending')
      setRequests(data)
    } catch { message.error('Không thể tải danh sách') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const approve = async (id) => {
    setActing(id)
    try {
      await api.put(`/sl-change-request/${id}/approve`)
      message.success('Đã duyệt')
      setRequests(prev => prev.filter(r => r.id !== id))
    } catch (e) { message.error(e?.response?.data?.message || 'Duyệt thất bại') }
    finally { setActing(null) }
  }

  const reject = async (id) => {
    setActing(id)
    try {
      await api.put(`/sl-change-request/${id}/reject`, { note: rejectNote })
      message.success('Đã từ chối')
      setRequests(prev => prev.filter(r => r.id !== id))
      setRejectId(null)
      setRejectNote('')
    } catch (e) { message.error(e?.response?.data?.message || 'Từ chối thất bại') }
    finally { setActing(null) }
  }

  const count = requests.length
  return (
    <>
      <Tooltip title="Yêu cầu thay đổi sản lượng">
        <Badge count={count} size="small">
          <Button icon={<BellOutlined />} onClick={() => { setOpen(true); load() }}
            type={count > 0 ? 'primary' : 'default'}
            style={{ marginRight: 8 }}>
            Duyệt SL{count > 0 ? ` (${count})` : ''}
          </Button>
        </Badge>
      </Tooltip>

      <Drawer
        title={<Space><BellOutlined />Yêu cầu thay đổi sản lượng chờ duyệt</Space>}
        open={open}
        onClose={() => setOpen(false)}
        width={700}
        extra={<Button size="small" icon={<ReloadOutlined />} onClick={load} loading={loading}>Làm mới</Button>}
      >
        {loading ? <Spin /> : requests.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>Không có yêu cầu nào</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {requests.map(r => (
              <Card key={r.id} size="small" style={{ borderLeft: '4px solid #fa8c16' }}>
                <Row gutter={[8, 4]} align="middle">
                  <Col span={12}>
                    <Space wrap>
                      <Tag color="blue">{r.maSp}</Tag>
                      <Tag color="purple">{r.congDoan}</Tag>
                      <span style={{ fontSize: 12, color: '#595959' }}>LSX: {r.soLo}</span>
                    </Space>
                  </Col>
                  <Col span={12} style={{ textAlign: 'right', fontSize: 12, color: '#595959' }}>
                    {r.requestedBy} · {dayjs(r.requestedAt).format('DD/MM/YYYY HH:mm')}
                  </Col>
                  <Col span={24} style={{ fontSize: 13 }}>
                    <span style={{ color: '#595959' }}>{r.tenTrinh}</span>
                    <span style={{ marginLeft: 8, color: '#8c8c8c', fontSize: 12 }}>
                      Ngày: {r.ngay ? dayjs(r.ngay).format('DD/MM/YYYY') : '—'}
                    </span>
                  </Col>
                  <Col span={24}>
                    <Space size={4} align="center">
                      <span style={{ fontSize: 13, color: '#595959' }}>SL cũ:</span>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {r.oldValue != null ? Number(r.oldValue).toLocaleString('vi-VN') : '—'}
                      </span>
                      <span style={{ color: '#8c8c8c' }}>→</span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1677ff' }}>
                        {Number(r.newValue).toLocaleString('vi-VN')}
                      </span>
                    </Space>
                  </Col>
                  {rejectId === r.id ? (
                    <Col span={24}>
                      <Space.Compact style={{ width: '100%' }}>
                        <Input placeholder="Lý do từ chối (tuỳ chọn)" value={rejectNote}
                          onChange={e => setRejectNote(e.target.value)}
                          onPressEnter={() => reject(r.id)} />
                        <Button type="primary" danger loading={acting === r.id}
                          onClick={() => reject(r.id)}>Xác nhận từ chối</Button>
                        <Button onClick={() => { setRejectId(null); setRejectNote('') }}>Huỷ</Button>
                      </Space.Compact>
                    </Col>
                  ) : (
                    <Col span={24} style={{ textAlign: 'right' }}>
                      <Space>
                        <Button type="primary" icon={<CheckOutlined />} size="small"
                          loading={acting === r.id}
                          onClick={() => approve(r.id)}>Duyệt</Button>
                        <Button danger icon={<CloseOutlined />} size="small"
                          onClick={() => { setRejectId(r.id); setRejectNote('') }}>Từ chối</Button>
                      </Space>
                    </Col>
                  )}
                </Row>
              </Card>
            ))}
          </div>
        )}
      </Drawer>
    </>
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
              {isAdmin() && <AdminApprovalPanel />}
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
