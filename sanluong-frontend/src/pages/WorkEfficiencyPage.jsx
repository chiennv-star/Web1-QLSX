import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Table, Button, Space, Input, Typography, message,
  Tag, Drawer, Spin, Tooltip, Progress, DatePicker, TimePicker, Select, Badge,
  Modal, Form, AutoComplete, InputNumber, Popconfirm, Tabs, Avatar
} from 'antd'
import {
  SearchOutlined, ReloadOutlined, SyncOutlined,
  UserOutlined, TrophyOutlined, BarChartOutlined,
  RiseOutlined, FallOutlined, CalendarOutlined, EditOutlined,
  PlusOutlined, DeleteOutlined, ExclamationCircleOutlined,
  IdcardOutlined, PhoneOutlined, HomeOutlined, TeamOutlined,
  LockOutlined, EyeInvisibleOutlined, EyeTwoTone, CameraOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

dayjs.extend(quarterOfYear)

const { Option } = Select

// ── Period helpers ─────────────────────────────────────────────────────────────
const PERIOD_TYPES = [
  { key: 'day',     label: 'Ngày'  },
  { key: 'week',    label: 'Tuần'  },
  { key: 'month',   label: 'Tháng' },
  { key: 'quarter', label: 'Quý'   },
  { key: 'year',    label: 'Năm'   },
]

const QUARTER_LABELS = ['Q1 (T1–T3)', 'Q2 (T4–T6)', 'Q3 (T7–T9)', 'Q4 (T10–T12)']

function getPeriodRange(periodType, periodValue) {
  if (!periodValue) return { fromDate: null, toDate: null }
  if (periodType === 'day') {
    const d = periodValue.format('YYYY-MM-DD')
    return { fromDate: d, toDate: d }
  }
  if (periodType === 'week') {
    return {
      fromDate: periodValue.startOf('week').format('YYYY-MM-DD'),
      toDate:   periodValue.endOf('week').format('YYYY-MM-DD'),
    }
  }
  if (periodType === 'month') {
    return {
      fromDate: periodValue.startOf('month').format('YYYY-MM-DD'),
      toDate:   periodValue.endOf('month').format('YYYY-MM-DD'),
    }
  }
  if (periodType === 'quarter') {
    const { year, q } = periodValue
    const startMonth = (q - 1) * 3 + 1
    const from = dayjs(`${year}-${String(startMonth).padStart(2, '0')}-01`)
    return {
      fromDate: from.format('YYYY-MM-DD'),
      toDate:   from.endOf('month').add(2, 'month').endOf('month').format('YYYY-MM-DD'),
    }
  }
  if (periodType === 'year') {
    return {
      fromDate: periodValue.startOf('year').format('YYYY-MM-DD'),
      toDate:   periodValue.endOf('year').format('YYYY-MM-DD'),
    }
  }
  return { fromDate: null, toDate: null }
}

function periodLabel(periodType, periodValue) {
  if (!periodValue) return ''
  if (periodType === 'day')     return periodValue.format('DD/MM/YYYY')
  if (periodType === 'week') {
    const from = periodValue.startOf('week').format('DD/MM')
    const to   = periodValue.endOf('week').format('DD/MM/YYYY')
    return `Tuần ${from}–${to}`
  }
  if (periodType === 'month')   return periodValue.format('MM/YYYY')
  if (periodType === 'quarter') return `Q${periodValue.q}/${periodValue.year}`
  if (periodType === 'year')    return periodValue.format('YYYY')
  return ''
}

// ── Group tabs ─────────────────────────────────────────────────────────────────
const ALL_GROUPS = [
  { key: '', label: 'Tất cả' },
  { key: 'PCPL1', label: 'PCPL1', color: '#4db3d4' },
  { key: 'PCPL2', label: 'PCPL2', color: '#748090' },
  { key: 'PCPL3', label: 'PCPL3', color: '#f97316' },
  { key: 'ĐG',    label: 'ĐG',    color: '#eab308' },
  { key: 'BBC1',  label: 'BBC1',   color: '#ec4899' },
]

const GROUP_COLOR = Object.fromEntries(ALL_GROUPS.filter(g => g.color).map(g => [g.key, g.color]))

// ── KPI strip ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent }) {
  return (
    <div style={{
      flex: '1 1 130px', minWidth: 120,
      background: '#fff', borderRadius: 8,
      border: `1.5px solid ${accent}22`,
      padding: '6px 12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: 10, color: '#888', fontWeight: 500, marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: accent, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

// ── Employee profile read-only (admin view) ───────────────────────────────────
const TINH_TRANG_COLOR = { 'Đang làm': '#52c41a', 'Nghỉ việc': '#ff4d4f', 'Tạm nghỉ': '#faad14' }
const GROUP_TAG_COLOR = { PCPL1: '#4db3d4', PCPL2: '#748090', PCPL3: '#f97316', ĐG: '#eab308', BBC1: '#ec4899' }

function ProfileInfoRow({ icon, label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 16px', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ width: 32, height: 32, minWidth: 32, borderRadius: 8, background: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1D4ED8', fontSize: 14 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 600 }}>{children}</div>
      </div>
    </div>
  )
}

function EmployeeProfileReadOnly({ employee: emp }) {
  if (!emp) return null
  const fmtD = v => v ? dayjs(v).format('DD/MM/YYYY') : <span style={{ color: '#cbd5e1' }}>—</span>
  const tinhTrang = emp.tinhTrang || 'Đang làm'
  return (
    <div style={{ maxWidth: 560, margin: '20px auto', padding: '0 12px' }}>
      {/* Header banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e4570 0%, #339999 100%)',
        borderRadius: 14, padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: 18,
        marginBottom: 16, boxShadow: '0 4px 20px rgba(30,69,112,0.18)',
      }}>
        <Avatar size={64} icon={<UserOutlined />}
          style={{ background: 'rgba(255,255,255,0.22)', border: '3px solid rgba(255,255,255,0.5)', fontSize: 28, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {emp.hoVaTen || '—'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <Tag style={{ background: 'rgba(255,255,255,0.18)', border: 'none', color: '#fff', fontFamily: 'monospace', fontWeight: 700, marginRight: 0 }}>
              {emp.maNhanVien || '—'}
            </Tag>
            {emp.toNhom && (
              <Tag style={{ background: GROUP_TAG_COLOR[emp.toNhom] || '#64748b', border: 'none', color: '#fff', fontWeight: 700, marginRight: 0 }}>
                {emp.toNhom}
              </Tag>
            )}
            <Tag style={{
              background: (TINH_TRANG_COLOR[tinhTrang] || '#64748b') + '33',
              border: `1px solid ${TINH_TRANG_COLOR[tinhTrang] || '#64748b'}55`,
              color: TINH_TRANG_COLOR[tinhTrang] || '#fff',
              fontWeight: 700, marginRight: 0, fontSize: 11,
            }}>
              {tinhTrang}
            </Tag>
          </div>
        </div>
      </div>

      {/* Info rows */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <ProfileInfoRow icon={<TeamOutlined />} label="Tổ / Nhóm">
          {emp.toNhom
            ? <Tag color="cyan" style={{ fontWeight: 700, marginRight: 0 }}>{emp.toNhom}</Tag>
            : <span style={{ color: '#cbd5e1' }}>—</span>}
        </ProfileInfoRow>
        <ProfileInfoRow icon={<IdcardOutlined />} label="Vị trí">
          {emp.viTri
            ? <Tag color={emp.viTri?.toLowerCase().includes('trưởng') ? 'gold' : 'geekblue'} style={{ marginRight: 0 }}>{emp.viTri}</Tag>
            : <span style={{ color: '#cbd5e1' }}>—</span>}
        </ProfileInfoRow>
        <ProfileInfoRow icon={<PhoneOutlined />} label="Số điện thoại">
          {emp.sdt
            ? <a href={`tel:${emp.sdt}`} style={{ color: '#1677ff', fontWeight: 600 }}>{emp.sdt}</a>
            : <span style={{ color: '#cbd5e1' }}>—</span>}
        </ProfileInfoRow>
        <ProfileInfoRow icon={<HomeOutlined />} label="Địa chỉ">
          {emp.diaChi || <span style={{ color: '#cbd5e1' }}>—</span>}
        </ProfileInfoRow>
        <ProfileInfoRow icon={<CalendarOutlined />} label="Ngày sinh">
          {fmtD(emp.ngaySinh)}
        </ProfileInfoRow>
        <ProfileInfoRow icon={<CalendarOutlined />} label="Ngày vào công ty">
          {fmtD(emp.thoiGianVaoCongTy)}
        </ProfileInfoRow>
        {emp.ngayNghiViec && (
          <ProfileInfoRow icon={<CalendarOutlined />} label="Ngày nghỉ việc">
            <span style={{ color: '#ef4444', fontWeight: 600 }}>{fmtD(emp.ngayNghiViec)}</span>
          </ProfileInfoRow>
        )}
        {emp.hocVan && (
          <ProfileInfoRow icon={<IdcardOutlined />} label="Học vấn">
            {emp.hocVan}
          </ProfileInfoRow>
        )}
        {emp.ghiChu && (
          <ProfileInfoRow icon={<ExclamationCircleOutlined />} label="Ghi chú">
            <span style={{ color: '#d46b08' }}>{emp.ghiChu}</span>
          </ProfileInfoRow>
        )}
      </div>
    </div>
  )
}

// ── Employee detail drawer ─────────────────────────────────────────────────────
const VAI_TRO_OPTIONS = ['Trưởng ca', 'Phụ máy', 'Công nhân', 'KCS', 'Kỹ thuật'].map(v => ({ value: v }))

function EmployeeDetailDrawer({ open, employee, employees, fromDate, toDate, periodStr, onClose, isAdmin, canEdit, onRefreshMain }) {
  const navigate = useNavigate()
  const [sessions,  setSessions]  = useState([])
  const [loading,   setLoading]   = useState(false)
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [editingSession,   setEditingSession]   = useState(null) // null = add
  const [sessionSaving,    setSessionSaving]    = useState(false)
  const [sessionForm] = Form.useForm()
  const [sessionDetailOpen, setSessionDetailOpen] = useState(false)
  const [selectedSession,   setSelectedSession]   = useState(null)
  const [drawerTab, setDrawerTab] = useState('sx')

  // Time entries (giờ vào/ra)
  const [timeEntries, setTimeEntries] = useState([])
  const [timeLoading, setTimeLoading] = useState(false)
  const [timeModalOpen, setTimeModalOpen] = useState(false)
  const [editingTime, setEditingTime] = useState(null)
  const [timeSaving, setTimeSaving] = useState(false)
  const [timeForm] = Form.useForm()
  const [timeCtxMenu, setTimeCtxMenu] = useState(null) // {x, y, record}

  const fetchTimeEntries = useCallback(async () => {
    if (!employee?.maNhanVien || !fromDate || !toDate) return
    setTimeLoading(true)
    try {
      const { data } = await api.get('/attendance/time-entries', {
        params: { maNhanVien: employee.maNhanVien, fromDate, toDate }
      })
      setTimeEntries(data)
    } catch { message.error('Không thể tải dữ liệu giờ ra/vào') }
    finally { setTimeLoading(false) }
  }, [employee, fromDate, toDate])

  useEffect(() => {
    if (drawerTab === 'time') fetchTimeEntries()
  }, [drawerTab, fetchTimeEntries])

  const openAddTime = () => {
    setEditingTime(null)
    timeForm.resetFields()
    setTimeModalOpen(true)
  }

  const openEditTime = (record) => {
    setEditingTime(record)
    timeForm.setFieldsValue({
      ngay: record.ngay ? dayjs(record.ngay) : null,
      caThucHien: record.caThucHien || undefined,
      gioVao: record.gioVao ? dayjs(record.gioVao, 'HH:mm:ss') : null,
      gioRa: record.gioRa ? dayjs(record.gioRa, 'HH:mm:ss') : null,
      ghiChu: record.ghiChu || '',
    })
    setTimeModalOpen(true)
  }

  const handleTimeSave = async () => {
    try {
      const vals = await timeForm.validateFields()
      setTimeSaving(true)
      const body = {
        maNhanVien: employee.maNhanVien,
        ngay: vals.ngay?.format('YYYY-MM-DD'),
        caThucHien: vals.caThucHien || null,
        gioVao: vals.gioVao?.format('HH:mm:ss') || null,
        gioRa: vals.gioRa?.format('HH:mm:ss') || null,
        ghiChu: vals.ghiChu || null,
      }
      if (editingTime) {
        await api.put(`/attendance/time-entries/${editingTime.id}`, body)
        message.success('Đã cập nhật')
      } else {
        await api.post('/attendance/time-entries', body)
        message.success('Đã thêm')
      }
      setTimeModalOpen(false)
      await fetchTimeEntries()
    } catch (err) {
      if (err?.errorFields) return // AntD validation — ignore
      message.error('Lưu thất bại: ' + (err?.response?.data?.message || err?.message || 'Lỗi không xác định'))
    }
    finally { setTimeSaving(false) }
  }

  const handleTimeDelete = async (id) => {
    try {
      await api.delete(`/attendance/time-entries/${id}`)
      message.success('Đã xoá')
      fetchTimeEntries()
    } catch { message.error('Không thể xoá') }
  }

  // Profile edit
  const [profileEditOpen,   setProfileEditOpen]   = useState(false)
  const [profileEditSaving, setProfileEditSaving] = useState(false)
  const [profileEditForm]   = Form.useForm()

  const fullEmp = useMemo(
    () => employees?.find(e => e.maNhanVien === employee?.maNhanVien) || employee || {},
    [employees, employee]
  )

  useEffect(() => { setDrawerTab('sx') }, [employee?.maNhanVien])

  const openProfileEdit = () => {
    profileEditForm.setFieldsValue({
      hoVaTen:            fullEmp.hoVaTen || '',
      maNhanVien:         fullEmp.maNhanVien || '',
      toNhom:             fullEmp.toNhom || '',
      viTri:              fullEmp.viTri || '',
      sdt:                fullEmp.sdt || '',
      diaChi:             fullEmp.diaChi || '',
      ngaySinh:           fullEmp.ngaySinh ? dayjs(fullEmp.ngaySinh) : null,
      thoiGianVaoCongTy:  fullEmp.thoiGianVaoCongTy ? dayjs(fullEmp.thoiGianVaoCongTy) : null,
      ngayNghiViec:       fullEmp.ngayNghiViec ? dayjs(fullEmp.ngayNghiViec) : null,
      tinhTrang:          fullEmp.tinhTrang || 'Đang làm',
      ghiChu:             fullEmp.ghiChu || '',
      hocVan:             fullEmp.hocVan || '',
    })
    setProfileEditOpen(true)
  }

  const handleProfileEditSave = async () => {
    const values = await profileEditForm.validateFields()
    setProfileEditSaving(true)
    try {
      if (isAdmin) {
        if (!fullEmp.id) { message.error('Không tìm thấy ID nhân viên'); return }
        await api.put(`/employees/${fullEmp.id}`, {
          maNhanVien:        values.maNhanVien,
          hoVaTen:           values.hoVaTen,
          toNhom:            values.toNhom,
          viTri:             values.viTri || null,
          sdt:               values.sdt || null,
          diaChi:            values.diaChi || null,
          ngaySinh:          values.ngaySinh ? values.ngaySinh.format('YYYY-MM-DD') : null,
          thoiGianVaoCongTy: values.thoiGianVaoCongTy ? values.thoiGianVaoCongTy.format('YYYY-MM-DD') : null,
          ngayNghiViec:      values.ngayNghiViec ? values.ngayNghiViec.format('YYYY-MM-DD') : null,
          tinhTrang:         values.tinhTrang || 'Đang làm',
          ghiChu:            values.ghiChu || null,
          hocVan:            values.hocVan || null,
        })
      } else {
        await api.put('/employees/me', {
          sdt:      values.sdt || null,
          diaChi:   values.diaChi || null,
          ngaySinh: values.ngaySinh ? values.ngaySinh.format('YYYY-MM-DD') : null,
          hocVan:   values.hocVan || null,
        })
      }
      message.success('Cập nhật hồ sơ thành công')
      setProfileEditOpen(false)
      onRefreshMain()
    } catch { message.error('Cập nhật hồ sơ thất bại') }
    finally { setProfileEditSaving(false) }
  }

  const loadSessions = useCallback(async () => {
    if (!employee) return
    setLoading(true)
    const params = { maNhanVien: employee.maNhanVien }
    if (fromDate) params.fromDate = fromDate
    if (toDate)   params.toDate   = toDate
    try {
      const { data } = await api.get('/work-efficiency/employee-sessions', { params })
      setSessions(data)
    } catch { message.error('Không thể tải dữ liệu') }
    finally { setLoading(false) }
  }, [employee, fromDate, toDate])

  useEffect(() => { if (open) loadSessions() }, [open, loadSessions])

  const calcSessionCong = (thoiGian, ca) => {
    const t = parseFloat(thoiGian)
    if (!t || !ca) return null
    const divisor = ca === 'HC' ? 8 : 7
    return parseFloat((t / divisor).toFixed(4))
  }

  const openAdd = () => {
    setEditingSession(null)
    sessionForm.resetFields()
    sessionForm.setFieldsValue({ ngay: dayjs(), vaiTro: 'Công nhân' })
    setSessionModalOpen(true)
  }

  const openEdit = (record) => {
    setEditingSession(record)
    sessionForm.setFieldsValue({
      ngay: record.ngay ? dayjs(record.ngay) : null,
      vaiTro: record.vaiTro || null,
      caSanXuat: record.caSanXuat || null,
      thoiGianBatDau: record.thoiGianBatDau ? Number(record.thoiGianBatDau) : null,
      congThucHien: record.congThucHien != null ? Number(record.congThucHien) : null,
      sanLuong: record.sanLuong != null ? Number(record.sanLuong) : null,
    })
    setSessionModalOpen(true)
  }

  const handleSessionSave = async () => {
    const values = await sessionForm.validateFields()
    setSessionSaving(true)
    try {
      const payload = {
        maNhanVien:   employee.maNhanVien,
        nguoiThucHien: employee.hoVaTen,
        nhomThucHien:  employee.toNhom,
        ngay: values.ngay ? values.ngay.format('YYYY-MM-DD') : null,
        vaiTro: values.vaiTro || null,
        caSanXuat: values.caSanXuat || null,
        thoiGianBatDau: values.thoiGianBatDau != null ? String(values.thoiGianBatDau) : null,
        congThucHien: values.congThucHien ?? null,
        sanLuong: values.sanLuong ?? null,
      }
      if (editingSession) {
        // preserve workScheduleId so NS group-calc still works
        payload.workScheduleId = editingSession.workScheduleId
        await api.put(`/work-schedule-session/${editingSession.id}`, payload)
        message.success('Cập nhật phiên thành công')
      } else {
        await api.post('/work-schedule-session', payload)
        message.success('Thêm phiên thành công')
      }
      setSessionModalOpen(false)
      loadSessions()
      if (onRefreshMain) onRefreshMain()
    } catch { message.error('Lưu thất bại') }
    finally { setSessionSaving(false) }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/work-schedule-session/${id}`)
      message.success('Đã xóa phiên')
      loadSessions()
      if (onRefreshMain) onRefreshMain()
    } catch { message.error('Xóa thất bại') }
  }

  const summary = useMemo(() => {
    const tongCong = sessions.reduce((a, s) => a + (parseFloat(s.congThucHien) || 0), 0)
    const dat = sessions.filter(s => s.nangSuat != null && s.nangSuatTrungBinh != null
      && parseFloat(s.nangSuat) >= parseFloat(s.nangSuatTrungBinh)).length
    const khongDat = sessions.filter(s => s.nangSuat != null && s.nangSuatTrungBinh != null
      && parseFloat(s.nangSuat) < parseFloat(s.nangSuatTrungBinh)).length
    const truong = sessions.filter(s => s.vaiTro?.toLowerCase().includes('trưởng')).length
    return { tongCong, dat, khongDat, truong, total: sessions.length }
  }, [sessions])

  const tyLe = summary.dat + summary.khongDat > 0
    ? Math.round(summary.dat / (summary.dat + summary.khongDat) * 100) : null

  const dailyStats = useMemo(() => {
    const map = {}
    sessions.forEach(s => {
      const d = s.ngay || s.ngayThucHien
      if (!d) return
      const key = dayjs(d).format('YYYY-MM-DD')
      if (!map[key]) map[key] = { date: key, items: [], tongCong: 0, chuaNhap: 0 }
      map[key].items.push(s)
      map[key].tongCong += parseFloat(s.congThucHien) || 0
      if (s.congThucHien == null) map[key].chuaNhap++
    })
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date))
  }, [sessions])

  const detailColumns = [
    {
      title: '#', key: 'stt', width: 40, align: 'center',
      render: (_, __, i) => <span style={{ color: '#aaa', fontSize: 11 }}>{i + 1}</span>
    },
    {
      title: 'Ngày TH', key: 'ngay', width: 100, align: 'center',
      render: (_, r) => {
        const d = r.ngay || r.ngayThucHien
        return d ? <span style={{ fontWeight: 600, color: '#1677ff' }}>{dayjs(d).format('DD/MM/YYYY')}</span> : '—'
      }
    },
    {
      title: 'Mã SP', dataIndex: 'maSp', key: 'maSp', width: 85, align: 'center',
      render: v => v ? <Tag color="blue" style={{ marginRight: 0 }}>{v}</Tag> : <span style={{ color: '#bbb' }}>—</span>
    },
    {
      title: 'Tiến Trình', dataIndex: 'tenTrinh', key: 'tenTrinh', width: 180,
      render: (v, r) => {
        if (!v) return <span style={{ color: '#bbb' }}>—</span>
        const nhom = employee?.toNhom || ''
        const stage = nhom.startsWith('PCPL') ? 'PC'
                    : nhom === 'ĐG'           ? 'DG'
                    : nhom === 'BBC1'          ? 'BBC1'
                    : null
        return <span style={{ fontSize: 13, color: '#1677ff', fontWeight: 500 }}>{v}</span>
      }
    },
    {
      title: 'Số Lô', dataIndex: 'soLo', key: 'soLo', width: 88,
      render: v => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#595959' }}>{v || '—'}</span>
    },
    {
      title: 'Ca', dataIndex: 'caSanXuat', key: 'caSanXuat', width: 72, align: 'center',
      render: v => v ? <Tag color="blue" style={{ marginRight: 0, fontSize: 11 }}>{v}</Tag> : <span style={{ color: '#bbb' }}>—</span>
    },
    {
      title: 'Phòng TH', dataIndex: 'phongThucHien', key: 'phongThucHien', width: 110, align: 'center',
      render: v => v ? <span style={{ fontSize: 12 }}>{v}</span> : <span style={{ color: '#bbb' }}>—</span>
    },
    {
      title: 'Vai Trò', dataIndex: 'vaiTro', key: 'vaiTro', width: 115, align: 'center',
      render: v => {
        if (!v) return <span style={{ color: '#bbb' }}>—</span>
        const isTruong = v.toLowerCase().includes('trưởng')
        return <Tag color={isTruong ? 'gold' : 'geekblue'} style={{ marginRight: 0 }}>{v}</Tag>
      }
    },
    {
      title: 'Công TH', dataIndex: 'congThucHien', key: 'congThucHien', width: 95, align: 'right',
      render: v => v != null
        ? <span style={{ fontWeight: 700, color: '#722ed1' }}>{Number(v).toLocaleString('vi-VN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</span>
        : <span style={{ color: '#bbb' }}>—</span>
    },
    {
      title: 'Sản Lượng', dataIndex: 'sanLuong', key: 'sanLuong', width: 100, align: 'right',
      render: v => v != null
        ? <span style={{ fontWeight: 700, color: '#389e0d' }}>{Number(v).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        : <span style={{ color: '#bbb' }}>—</span>
    },
    {
      title: 'Năng Suất', dataIndex: 'nangSuat', key: 'nangSuat', width: 100, align: 'right',
      render: v => v != null
        ? <span style={{ fontWeight: 800, color: '#1D4ED8', fontSize: 13 }}>{Number(v).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        : <span style={{ color: '#bbb' }}>—</span>
    },
    {
      title: 'NS TB', dataIndex: 'nangSuatTrungBinh', key: 'nangSuatTrungBinh', width: 100, align: 'right',
      render: v => v != null
        ? <span style={{ fontWeight: 600, color: '#1677ff' }}>{Number(v).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        : <span style={{ color: '#bbb' }}>—</span>
    },
    {
      title: 'Chú Ý', dataIndex: 'chuY', key: 'chuY', width: 160,
      render: v => v
        ? <span style={{ color: '#d46b08', fontSize: 12 }}>{v}</span>
        : <span style={{ color: '#bbb' }}>—</span>
    },
    {
      title: 'Kết Quả', key: 'ketQua', width: 105, align: 'center',
      render: (_, r) => {
        const ns   = r.nangSuat != null ? Number(r.nangSuat) : null
        const nsTb = r.nangSuatTrungBinh != null ? Number(r.nangSuatTrungBinh) : null
        if (ns == null || nsTb == null) return <span style={{ color: '#bbb' }}>—</span>
        const dat = ns >= nsTb
        return (
          <Tag color={dat ? 'success' : 'error'} style={{ marginRight: 0, fontWeight: 600 }}>
            {dat ? <><RiseOutlined /> Đạt</> : <><FallOutlined /> Không Đạt</>}
          </Tag>
        )
      }
    },
    ...(canEdit ? [{
      title: 'Thao Tác', key: 'action', width: 90, align: 'center', fixed: 'right',
      render: (_, r) => (
        <Button size="small" type="primary" icon={<EditOutlined />}
          style={{ background: '#1D4ED8', borderColor: '#1D4ED8', fontSize: 12 }}
          onClick={e => { e.stopPropagation(); openEdit(r) }}>
          Cập nhật
        </Button>
      )
    }] : []),
  ]

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        rootClassName="eff-detail-drawer"
        width={1300}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <UserOutlined style={{ color: '#4db3d4' }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>{employee?.hoVaTen}</span>
            <Tag color="blue" style={{ fontWeight: 700 }}>{employee?.maNhanVien}</Tag>
            {employee?.toNhom && <Tag color="cyan">{employee.toNhom}</Tag>}
            {periodStr && <Tag color="purple" icon={<CalendarOutlined />}>{periodStr}</Tag>}
            {canEdit && (
              <Button size="small" type="primary" icon={<PlusOutlined />}
                style={{ marginLeft: 8, background: '#1D4ED8', borderColor: '#1D4ED8' }}
                onClick={openAdd}>
                Thêm phiên
              </Button>
            )}
          </div>
        }
        styles={{ body: { padding: 0, background: '#fafafe' } }}
      >
        {/* ── Tab switcher ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
          borderBottom: '2px solid #e0e7ff', background: '#fff',
        }}>
          {[
            { key: 'sx',      label: 'Hồ Sơ Sản Xuất',  icon: <BarChartOutlined /> },
            { key: 'daily',   label: 'Ngày Sản Xuất',    icon: <CalendarOutlined /> },
            { key: 'time',    label: 'Giờ Ra/Vào',        icon: <ClockCircleOutlined /> },
            { key: 'profile', label: 'Hồ Sơ Nhân Viên',  icon: <IdcardOutlined /> },
          ].map(t => (
            <button key={t.key} onClick={() => setDrawerTab(t.key)} style={{
              border: 'none', cursor: 'pointer', background: 'transparent',
              padding: '12px 8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              fontSize: 12, fontWeight: drawerTab === t.key ? 700 : 500,
              color: drawerTab === t.key ? '#1D4ED8' : '#64748b',
              borderBottom: drawerTab === t.key ? '2.5px solid #1D4ED8' : '2.5px solid transparent',
              borderRight: '1px solid #e0e7ff',
              transition: 'all .15s',
            }}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              <span style={{ lineHeight: 1.3, textAlign: 'center' }}>{t.label}</span>
            </button>
          ))}
        </div>

        {drawerTab === 'time' ? (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>Bảng theo dõi giờ ra/vào — {employee?.hoVaTen}</span>
              {canEdit && (
                <Button type="primary" icon={<PlusOutlined />} size="small" onClick={openAddTime}
                  style={{ background: '#1D4ED8', borderColor: '#1D4ED8' }}>
                  Thêm
                </Button>
              )}
            </div>
            <style>{`
              .time-entry-table .ant-table-thead > tr > th {
                background: #FFCC99 !important;
                color: #0000CC !important;
                font-weight: 600 !important;
                text-align: center !important;
                border-right: 1px solid #FFDDBB !important;
                white-space: nowrap;
              }
              .time-entry-table .ant-table-thead > tr > th::before { display: none !important; }
            `}</style>
            <Table
              className="time-entry-table"
              size="small"
              loading={timeLoading}
              dataSource={timeEntries}
              rowKey="id"
              pagination={{ pageSize: 20, size: 'small', showTotal: t => `${t} bản ghi` }}
              locale={{ emptyText: 'Chưa có dữ liệu giờ ra/vào' }}
              columns={[
                {
                  title: 'Ngày', dataIndex: 'ngay', key: 'ngay', width: 110, align: 'center',
                  render: v => v ? dayjs(v).format('DD/MM/YYYY') : '—',
                  sorter: (a, b) => (a.ngay || '').localeCompare(b.ngay || ''),
                  defaultSortOrder: 'descend',
                },
                {
                  title: 'Giờ Vào', dataIndex: 'gioVao', key: 'gioVao', width: 90, align: 'center',
                  render: v => v ? <span style={{ color: '#1D4ED8', fontFamily: 'monospace' }}>{v.slice(0,5)}</span> : <span style={{ color: '#d9d9d9' }}>—</span>,
                },
                {
                  title: 'Giờ Ra', dataIndex: 'gioRa', key: 'gioRa', width: 90, align: 'center',
                  render: v => v ? <span style={{ color: '#059669', fontFamily: 'monospace' }}>{v.slice(0,5)}</span> : <span style={{ color: '#d9d9d9' }}>—</span>,
                },
                {
                  title: 'Ca', dataIndex: 'caThucHien', key: 'caThucHien', width: 70, align: 'center',
                  render: v => v
                    ? <Tag color={v === 'HC' ? 'blue' : v === 'Ca1' ? 'orange' : 'purple'} style={{ marginRight: 0 }}>{v}</Tag>
                    : <span style={{ color: '#d9d9d9' }}>—</span>,
                },
                {
                  title: 'Số Giờ', key: 'soGio', width: 80, align: 'center',
                  render: (_, r) => {
                    if (!r.gioVao || !r.gioRa) return <span style={{ color: '#d9d9d9' }}>—</span>
                    const vao = dayjs(`2000-01-01T${r.gioVao}`)
                    const ra  = dayjs(`2000-01-01T${r.gioRa}`)
                    const diffMin = ra.diff(vao, 'minute') - 60
                    if (diffMin <= 0) return <span style={{ color: '#d9d9d9' }}>—</span>
                    const h = Math.floor(diffMin / 60), m = diffMin % 60
                    return <span style={{ color: '#7c3aed' }}>{h}h{m > 0 ? `${m}p` : ''}</span>
                  },
                },
                {
                  title: 'Số Công', key: 'soCong', width: 90, align: 'center',
                  render: (_, r) => {
                    if (!r.gioVao || !r.gioRa || !r.caThucHien) return <span style={{ color: '#d9d9d9' }}>—</span>
                    const vao = dayjs(`2000-01-01T${r.gioVao}`)
                    const ra  = dayjs(`2000-01-01T${r.gioRa}`)
                    const soGio = (ra.diff(vao, 'minute') - 60) / 60
                    if (soGio <= 0) return <span style={{ color: '#d9d9d9' }}>—</span>
                    let cong
                    if (r.caThucHien === 'HC') {
                      cong = soGio / 8
                    } else {
                      cong = soGio <= 7 ? soGio / 7 : 1 + (soGio - 7) / 8
                    }
                    return <span style={{ color: '#d46b08', fontWeight: 600 }}>{cong.toFixed(4)}</span>
                  },
                },
                {
                  title: 'Ghi Chú', dataIndex: 'ghiChu', key: 'ghiChu', ellipsis: true,
                  render: v => v || <span style={{ color: '#d9d9d9' }}>—</span>,
                },
              ]}
              onRow={canEdit ? (record) => ({
                onClick: (e) => {
                  if (e.target.closest('button')) return
                  openEditTime(record)
                },
                onContextMenu: (e) => {
                  e.preventDefault()
                  setTimeCtxMenu({ x: e.clientX, y: e.clientY, record })
                },
                style: { cursor: 'pointer' },
              }) : undefined}
            />
          </div>
        ) : drawerTab === 'profile' ? (
          <div>
            {canEdit && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0' }}>
                <Button
                  type="primary" icon={<EditOutlined />}
                  style={{ background: '#1D4ED8', borderColor: '#1D4ED8' }}
                  onClick={openProfileEdit}
                >
                  Chỉnh sửa hồ sơ
                </Button>
              </div>
            )}
            <EmployeeProfileReadOnly employee={fullEmp} />
          </div>
        ) : drawerTab === 'daily' ? (
          <div style={{ padding: 16 }}>
            {loading ? (
              <Spin style={{ display: 'block', margin: '60px auto' }} size="large" />
            ) : dailyStats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>Không có dữ liệu</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {dailyStats.map(day => {
                  const pct = day.items.length > 0
                    ? Math.round(((day.items.length - day.chuaNhap) / day.items.length) * 100) : 0
                  return (
                    <div key={day.date} style={{
                      background: '#fff', border: '1px solid #e0e7ff',
                      borderRadius: 12, overflow: 'hidden',
                      boxShadow: '0 1px 4px rgba(29,78,216,0.06)',
                    }}>
                      {/* Header ngày */}
                      <div style={{
                        background: 'linear-gradient(90deg, #1e4570 0%, #2980b3 100%)',
                        padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>
                          <CalendarOutlined style={{ marginRight: 6 }} />
                          {dayjs(day.date).format('dddd, DD/MM/YYYY').replace(/^\w/, c => c.toUpperCase())}
                        </span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Tag style={{ background: 'rgba(255,255,255,0.18)', border: 'none', color: '#fff', fontWeight: 700, marginRight: 0 }}>
                            {day.items.length} phiên
                          </Tag>
                          {day.chuaNhap > 0 && (
                            <Tag color="warning" style={{ marginRight: 0, fontWeight: 600 }}>
                              {day.chuaNhap} chưa nhập công
                            </Tag>
                          )}
                        </div>
                      </div>

                      {/* KPI row */}
                      <div style={{ display: 'flex', padding: '10px 16px', gap: 16, flexWrap: 'wrap', borderBottom: '1px solid #f0f4ff' }}>
                        <div style={{ textAlign: 'center', minWidth: 80 }}>
                          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Tổng công TH</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#722ed1', lineHeight: 1.1 }}>
                            {day.tongCong.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: 80 }}>
                          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Đã nhập công</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#389e0d', lineHeight: 1.1 }}>
                            {day.items.length - day.chuaNhap}
                            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>/{day.items.length}</span>
                          </div>
                        </div>
                        {day.chuaNhap > 0 && (
                          <div style={{ textAlign: 'center', minWidth: 80 }}>
                            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Chưa nhập</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#f97316', lineHeight: 1.1 }}>
                              {day.chuaNhap}
                            </div>
                          </div>
                        )}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 120 }}>
                          <div style={{ width: '100%' }}>
                            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>Tiến độ nhập công</div>
                            <Progress
                              percent={pct} size="small"
                              strokeColor={pct === 100 ? '#389e0d' : '#f97316'}
                              format={p => <span style={{ fontSize: 11 }}>{p}%</span>}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Session list of that day */}
                      <div style={{ padding: '8px 16px 10px' }}>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Chi tiết phiên</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {day.items.map((s, i) => {
                            const ns = s.nangSuat != null ? Number(s.nangSuat) : null
                            const nsTb = s.nangSuatTrungBinh != null ? Number(s.nangSuatTrungBinh) : null
                            const dat = ns != null && nsTb != null ? ns >= nsTb : null
                            return (
                              <div key={s.id} style={{
                                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                                background: '#fafbff', borderRadius: 7, padding: '6px 10px',
                                border: s.congThucHien == null ? '1px solid #fed7aa' : '1px solid #e0e7ff',
                                cursor: 'pointer',
                              }}
                                onClick={() => { setSelectedSession(s); setSessionDetailOpen(true) }}
                              >
                                <span style={{ color: '#94a3b8', fontSize: 11, minWidth: 16 }}>{i + 1}</span>
                                {s.maSp && <Tag color="blue" style={{ marginRight: 0, fontSize: 11 }}>{s.maSp}</Tag>}
                                <span style={{ fontSize: 12, color: '#374151', flex: 1, minWidth: 100 }}>{s.tenTrinh || '—'}</span>
                                {s.vaiTro && (
                                  <Tag color={s.vaiTro.toLowerCase().includes('trưởng') ? 'gold' : 'geekblue'}
                                    style={{ marginRight: 0, fontSize: 11 }}>{s.vaiTro}</Tag>
                                )}
                                {s.caSanXuat && <Tag color="cyan" style={{ marginRight: 0, fontSize: 11 }}>{s.caSanXuat}</Tag>}
                                {s.congThucHien != null ? (
                                  <span style={{ fontWeight: 700, color: '#722ed1', fontSize: 13, minWidth: 60, textAlign: 'right' }}>
                                    {Number(s.congThucHien).toLocaleString('vi-VN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                                  </span>
                                ) : (
                                  <Tag color="warning" style={{ marginRight: 0, fontSize: 11 }}>Chưa nhập</Tag>
                                )}
                                {dat != null && (
                                  <Tag color={dat ? 'success' : 'error'} style={{ marginRight: 0, fontSize: 11 }}>
                                    {dat ? '✓ Đạt' : '✗ Không đạt'}
                                  </Tag>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
        <div style={{ padding: 16 }}>

        {/* Mini KPI strip */}
        <div className="eff-detail-mini-kpi" style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            { label: 'Số phiên làm việc', value: summary.total, accent: '#4db3d4' },
            { label: 'Số ca trưởng',       value: summary.truong, accent: '#f97316' },
            { label: 'Tổng công TH',        value: summary.tongCong.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), accent: '#722ed1' },
            { label: 'Số lần đạt NS',       value: summary.dat, accent: '#748090' },
            { label: 'Số lần không đạt',    value: summary.khongDat, accent: '#ef4444' },
            ...(tyLe != null ? [{ label: 'Tỷ lệ đạt', value: `${tyLe}%`, accent: tyLe >= 70 ? '#748090' : '#f97316' }] : []),
          ].map(k => (
            <div key={k.label} style={{
              flex: '1 1 100px', background: '#fff', border: `1px solid ${k.accent}22`,
              borderRadius: 8, padding: '6px 14px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, color: '#888', fontWeight: 500 }}>{k.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: k.accent }}>{k.value}</div>
            </div>
          ))}
        </div>

        <style>{`
          .eff-detail-table .ant-table-thead > tr > th { background: #FFCC99 !important; color: #7c3a00 !important; font-size: 11px !important; text-transform: uppercase; padding: 6px 8px !important; border-right: 1px solid #f0a060 !important; }
          .eff-detail-table .ant-table-thead > tr > th::before { display: none !important; }
          .eff-detail-table .ant-table-body::-webkit-scrollbar,
          .eff-detail-table .ant-table-content::-webkit-scrollbar,
          .eff-detail-table *::-webkit-scrollbar { height: 1.5px !important; width: 1.5px !important; }
          .eff-detail-table .ant-table-body::-webkit-scrollbar-track,
          .eff-detail-table *::-webkit-scrollbar-track { background: #f0f4f8; border-radius: 4px; }
          .eff-detail-table .ant-table-body::-webkit-scrollbar-thumb,
          .eff-detail-table *::-webkit-scrollbar-thumb { background: #66FFCC; border-radius: 4px; }
        `}</style>

        {loading ? (
          <Spin style={{ display: 'block', margin: '60px auto' }} size="large" />
        ) : (
          <>
            <div className="eff-desktop-view">
              <Table
                className="eff-detail-table"
                columns={detailColumns}
                dataSource={sessions}
                rowKey="id"
                size="small"
                scroll={{ x: 1370, y: 'calc(100vh - 280px)' }}
                pagination={{ pageSize: 50, showTotal: t => `${t} phiên`, showSizeChanger: false }}
                rowClassName={(_, i) => i % 2 === 0 ? '' : 'row-stripe'}
                onRow={(record) => ({
                  onClick: () => { setSelectedSession(record); setSessionDetailOpen(true) },
                  style: { cursor: 'pointer' },
                })}
              />
            </div>

            {/* ── Mobile session cards ── */}
            <div className="eff-mobile-view" style={{ flexDirection: 'column', gap: 8 }}>
              {sessions.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>Không có phiên làm việc</div>
              )}
              {sessions.map(r => {
                const d = r.ngay || r.ngayThucHien
                const ns = r.nangSuat != null ? Number(r.nangSuat) : null
                const nsTb = r.nangSuatTrungBinh != null ? Number(r.nangSuatTrungBinh) : null
                const dat = ns != null && nsTb != null ? ns >= nsTb : null
                return (
                  <div key={r.id} onClick={() => { setSelectedSession(r); setSessionDetailOpen(true) }}
                    style={{ background: '#fff', border: '1px solid #e0e7ff', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                      {d && <span style={{ fontWeight: 600, color: '#1677ff', fontSize: 13 }}>{dayjs(d).format('DD/MM/YYYY')}</span>}
                      {r.maSp && <Tag color="blue" style={{ marginRight: 0 }}>{r.maSp}</Tag>}
                      {r.soLo && <span style={{ fontFamily: 'monospace', color: '#595959', fontSize: 12 }}>{r.soLo}</span>}
                      {dat != null && (
                        <Tag color={dat ? 'success' : 'error'} style={{ marginRight: 0, marginLeft: 'auto', fontSize: 11 }}>
                          {dat ? '✓ Đạt' : '✗ Không Đạt'}
                        </Tag>
                      )}
                    </div>
                    {r.tenTrinh && <div style={{ color: '#1677ff', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{r.tenTrinh}</div>}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12, marginBottom: 4, color: '#595959', alignItems: 'center' }}>
                      {r.vaiTro && <Tag color={r.vaiTro.toLowerCase().includes('trưởng') ? 'gold' : 'geekblue'} style={{ marginRight: 0, fontSize: 11 }}>{r.vaiTro}</Tag>}
                      {r.caSanXuat && <Tag color="blue" style={{ marginRight: 0, fontSize: 11 }}>{r.caSanXuat}</Tag>}
                      {r.phongThucHien && <span>{r.phongThucHien}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#595959', flexWrap: 'wrap', alignItems: 'center' }}>
                      {r.congThucHien != null && <span>Công: <b style={{ color: '#722ed1' }}>{Number(r.congThucHien).toLocaleString('vi-VN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</b></span>}
                      {r.sanLuong != null && <span>SL: <b style={{ color: '#389e0d' }}>{Number(r.sanLuong).toLocaleString('vi-VN')}</b></span>}
                      {ns != null && <span>NS: <b style={{ color: '#1D4ED8', fontSize: 13 }}>{ns.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}</b></span>}
                      {nsTb != null && <span>NS TB: <b style={{ color: '#1677ff' }}>{nsTb.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}</b></span>}
                    </div>
                    {r.chuY && (
                      <div style={{ fontSize: 12, color: '#d46b08', marginTop: 4 }}>⚠ {r.chuY}</div>
                    )}
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>Sửa</Button>
                        <Popconfirm title="Xóa phiên này?" okText="Xóa" cancelText="Huỷ" okButtonProps={{ danger: true }} onConfirm={() => handleDelete(r.id)}>
                          <Button size="small" danger icon={<DeleteOutlined />}>Xóa</Button>
                        </Popconfirm>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
        </div>
        )}
      </Drawer>

      {/* ── Session detail modal (mobile-friendly) ── */}
      <Modal
        open={sessionDetailOpen}
        onCancel={() => setSessionDetailOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <CalendarOutlined style={{ color: '#1D4ED8' }} />
            <span style={{ fontWeight: 700 }}>Chi tiết phiên làm việc</span>
            {selectedSession?.ngay && (
              <Tag color="blue">{dayjs(selectedSession.ngay || selectedSession.ngayThucHien).format('DD/MM/YYYY')}</Tag>
            )}
          </div>
        }
        footer={canEdit ? [
          <Button key="edit" type="primary" icon={<EditOutlined />}
            onClick={() => { setSessionDetailOpen(false); openEdit(selectedSession) }}>
            Cập nhật
          </Button>,
          <Button key="close" onClick={() => setSessionDetailOpen(false)}>Đóng</Button>,
        ] : [
          <Button key="close" type="primary" onClick={() => setSessionDetailOpen(false)}>Đóng</Button>,
        ]}
        width="min(480px, 96vw)"
        centered
        destroyOnClose
        styles={{ body: { padding: '12px 16px' } }}
      >
        {selectedSession && (() => {
          const r = selectedSession
          const ns   = r.nangSuat != null ? Number(r.nangSuat) : null
          const nsTb = r.nangSuatTrungBinh != null ? Number(r.nangSuatTrungBinh) : null
          const dat  = ns != null && nsTb != null ? ns >= nsTb : null
          const SField = ({ label, children }) => (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '9px 12px', background: '#fafbff',
              borderRadius: 8, border: '1px solid #e8eeff',
            }}>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, minWidth: 96, flexShrink: 0 }}>{label}</span>
              <div style={{ textAlign: 'right', fontSize: 13 }}>{children}</div>
            </div>
          )
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <SField label="Ngày TH">
                <span style={{ fontWeight: 700, color: '#1677ff' }}>
                  {r.ngay || r.ngayThucHien ? dayjs(r.ngay || r.ngayThucHien).format('DD/MM/YYYY') : '—'}
                </span>
              </SField>
              <SField label="Mã SP">
                {r.maSp ? <Tag color="blue" style={{ marginRight: 0 }}>{r.maSp}</Tag> : <span style={{ color: '#bbb' }}>—</span>}
              </SField>
              <SField label="Tiến Trình">
                <span style={{ fontWeight: 500, color: '#374151', wordBreak: 'break-word', maxWidth: 220, display: 'inline-block', textAlign: 'right' }}>
                  {r.tenTrinh || <span style={{ color: '#bbb' }}>—</span>}
                </span>
              </SField>
              <SField label="Số Lô">
                <span style={{ fontFamily: 'monospace', color: '#595959' }}>{r.soLo || '—'}</span>
              </SField>
              <SField label="Ca">
                {r.caSanXuat ? <Tag color="blue" style={{ marginRight: 0 }}>{r.caSanXuat}</Tag> : <span style={{ color: '#bbb' }}>—</span>}
              </SField>
              <SField label="Phòng TH">
                <span>{r.phongThucHien || <span style={{ color: '#bbb' }}>—</span>}</span>
              </SField>
              <SField label="Vai Trò">
                {r.vaiTro
                  ? <Tag color={r.vaiTro.toLowerCase().includes('trưởng') ? 'gold' : 'geekblue'} style={{ marginRight: 0 }}>{r.vaiTro}</Tag>
                  : <span style={{ color: '#bbb' }}>—</span>}
              </SField>
              <SField label="Công TH">
                {r.congThucHien != null
                  ? <span style={{ fontWeight: 800, color: '#722ed1', fontSize: 16 }}>{Number(r.congThucHien).toLocaleString('vi-VN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</span>
                  : <span style={{ color: '#bbb' }}>—</span>}
              </SField>
              <SField label="Sản Lượng">
                {r.sanLuong != null
                  ? <span style={{ fontWeight: 700, color: '#389e0d', fontSize: 15 }}>{Number(r.sanLuong).toLocaleString('vi-VN')}</span>
                  : <span style={{ color: '#bbb' }}>—</span>}
              </SField>
              <SField label="Năng Suất">
                {ns != null
                  ? <span style={{ fontWeight: 800, color: '#1D4ED8', fontSize: 16 }}>{ns.toLocaleString('vi-VN')}</span>
                  : <span style={{ color: '#bbb' }}>—</span>}
              </SField>
              <SField label="NS Trung Bình">
                {nsTb != null
                  ? <span style={{ fontWeight: 600, color: '#1677ff' }}>{nsTb.toLocaleString('vi-VN')}</span>
                  : <span style={{ color: '#bbb' }}>—</span>}
              </SField>
              <SField label="Kết Quả">
                {dat != null
                  ? <Tag color={dat ? 'success' : 'error'} style={{ marginRight: 0, fontWeight: 700, fontSize: 13 }}>
                      {dat ? <><RiseOutlined /> Đạt</> : <><FallOutlined /> Không Đạt</>}
                    </Tag>
                  : <span style={{ color: '#bbb' }}>—</span>}
              </SField>
              <SField label="Chú Ý">
                {r.chuY
                  ? <span style={{ color: '#d46b08', fontWeight: 500 }}>{r.chuY}</span>
                  : <span style={{ color: '#bbb' }}>—</span>}
              </SField>
            </div>
          )
        })()}
      </Modal>

      {/* ── Session add/edit modal ── */}
      <Modal
        open={sessionModalOpen}
        title={
          <Space>
            {editingSession ? <EditOutlined style={{ color: '#1D4ED8' }} /> : <PlusOutlined style={{ color: '#1D4ED8' }} />}
            <span>{editingSession ? 'Sửa phiên làm việc' : 'Thêm phiên làm việc'}</span>
            <Tag color="blue">{employee?.maNhanVien}</Tag>
            <span style={{ fontWeight: 600, color: '#1D4ED8', fontSize: 13 }}>{employee?.hoVaTen}</span>
          </Space>
        }
        onOk={handleSessionSave}
        onCancel={() => setSessionModalOpen(false)}
        okText={editingSession ? 'Lưu' : 'Thêm'}
        cancelText="Huỷ"
        confirmLoading={sessionSaving}
        width={480}
        destroyOnClose
      >
        <Form form={sessionForm} layout="vertical" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item label="Ngày thực hiện" name="ngay" style={{ flex: 1 }}
              rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Vai Trò" name="vaiTro" style={{ flex: 1 }}
              rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}>
              <AutoComplete
                placeholder="Chọn hoặc nhập vai trò"
                allowClear
                notFoundContent={null}
                options={['Trưởng ca', 'Phụ máy', 'Công nhân', 'KCS', 'Kỹ thuật', 'Kiểm hàng', 'Đóng gói', 'Vận hành', 'Bảo trì'].map(v => ({ value: v }))}
                filterOption={(input, option) =>
                  (option?.value ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item label="Ca làm việc" name="caSanXuat" style={{ flex: 1 }}>
              <Select placeholder="Chọn ca" allowClear
                onChange={ca => {
                  const tg = sessionForm.getFieldValue('thoiGianBatDau')
                  const cong = calcSessionCong(tg, ca)
                  if (cong != null) sessionForm.setFieldValue('congThucHien', cong)
                }}>
                <Option value="Ca 1">Ca 1</Option>
                <Option value="Ca 2">Ca 2</Option>
                <Option value="HC">Hành Chính</Option>
              </Select>
            </Form.Item>
            <Form.Item label="Thời gian TH (giờ)" name="thoiGianBatDau" style={{ flex: 1 }}>
              <InputNumber min={0} max={24} step={0.5} style={{ width: '100%' }} placeholder="VD: 8"
                onChange={tg => {
                  const ca = sessionForm.getFieldValue('caSanXuat')
                  const cong = calcSessionCong(tg, ca)
                  if (cong != null) sessionForm.setFieldValue('congThucHien', cong)
                }} />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item label="Công thực hiện" name="congThucHien" style={{ flex: 1 }}
              rules={[{ required: true, message: 'Nhập công TH' }]}>
              <InputNumber min={0} step={0.0001} precision={4} style={{ width: '100%' }}
                placeholder="Tự tính theo thời gian + ca" />
            </Form.Item>
            <Form.Item label="Sản lượng nhóm" name="sanLuong" style={{ flex: 1 }}>
              <InputNumber min={0} step={100} precision={0} style={{ width: '100%' }}
                placeholder="VD: 12000 (tuỳ chọn)" />
            </Form.Item>
          </div>
          {editingSession?.maSp && (
            <div style={{ fontSize: 12, color: '#888', marginTop: -8 }}>
              Sản phẩm: <Tag color="blue">{editingSession.maSp}</Tag>
              {editingSession.tenTrinh && <span>{editingSession.tenTrinh}</span>}
            </div>
          )}
        </Form>
      </Modal>

      {/* ── Eff table context menu ── */}
      {effCtxMenu && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
            onClick={() => setEffCtxMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setEffCtxMenu(null) }}
          />
          <div style={{
            position: 'fixed', zIndex: 9999,
            left: effCtxMenu.x, top: effCtxMenu.y,
            background: '#fff', borderRadius: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,.18)',
            minWidth: 160, padding: '4px 0', userSelect: 'none',
          }}>
            <div style={{ padding: '6px 12px 4px', fontSize: 11, color: '#94a3b8', borderBottom: '1px solid #f0f0f0' }}>
              {effCtxMenu.record.hoVaTen}
            </div>
            <div
              style={{ padding: '8px 16px', cursor: 'pointer', color: '#ff4d4f', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
              onMouseEnter={e => e.currentTarget.style.background = '#fff1f0'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => {
                const record = effCtxMenu.record
                setEffCtxMenu(null)
                Modal.confirm({
                  title: `Xóa bản ghi "${record.hoVaTen}"?`,
                  icon: <ExclamationCircleOutlined />,
                  content: 'Thao tác này sẽ xóa bản ghi hiệu quả của nhân viên. Không thể hoàn tác.',
                  okText: 'Xóa', okButtonProps: { danger: true }, cancelText: 'Huỷ',
                  onOk: async () => {
                    if (!record.weId) { message.warning('Không có bản ghi để xóa'); return }
                    try {
                      await api.delete('/work-efficiency/bulk', { data: [record.weId] })
                      message.success('Đã xóa bản ghi')
                      fetchData(fromDate, toDate, activeGroup)
                    } catch { message.error('Xóa thất bại') }
                  },
                })
              }}
            >
              <DeleteOutlined /> Xóa bản ghi
            </div>
          </div>
        </>
      )}

      {/* ── Time entry context menu ── */}
      {timeCtxMenu && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
            onClick={() => setTimeCtxMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setTimeCtxMenu(null) }}
          />
          <div style={{
            position: 'fixed', zIndex: 9999,
            left: timeCtxMenu.x, top: timeCtxMenu.y,
            background: '#fff', borderRadius: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,.18)',
            minWidth: 140, padding: '4px 0', userSelect: 'none',
          }}>
            <div
              style={{
                padding: '8px 16px', cursor: 'pointer', color: '#ff4d4f',
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#fff1f0'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => {
                const id = timeCtxMenu.record.id
                setTimeCtxMenu(null)
                handleTimeDelete(id)
              }}
            >
              <DeleteOutlined /> Xóa bản ghi
            </div>
          </div>
        </>
      )}

      {/* ── Time entry modal ── */}
      <Modal
        open={timeModalOpen}
        title={
          <Space>
            <ClockCircleOutlined style={{ color: '#1D4ED8' }} />
            <span>{editingTime ? 'Sửa giờ ra/vào' : 'Thêm giờ ra/vào'}</span>
            <Tag color="blue">{employee?.maNhanVien}</Tag>
          </Space>
        }
        onOk={handleTimeSave}
        onCancel={() => setTimeModalOpen(false)}
        okText={editingTime ? 'Lưu' : 'Thêm'}
        cancelText="Huỷ"
        confirmLoading={timeSaving}
        width={400}
        destroyOnClose
        footer={(_, { OkBtn, CancelBtn }) => (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {editingTime && (
                <Popconfirm
                  title="Xoá bản ghi này?"
                  okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }}
                  onConfirm={() => { setTimeModalOpen(false); handleTimeDelete(editingTime.id) }}
                >
                  <Button danger icon={<DeleteOutlined />}>Xóa</Button>
                </Popconfirm>
              )}
            </div>
            <Space><CancelBtn /><OkBtn /></Space>
          </div>
        )}
      >
        <Form form={timeForm} layout="vertical" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item label="Ngày" name="ngay" rules={[{ required: true, message: 'Chọn ngày' }]} style={{ flex: 2 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
            </Form.Item>
            <Form.Item label="Ca thực hiện" name="caThucHien" rules={[{ required: true, message: 'Chọn ca' }]} style={{ flex: 1 }}>
              <Select placeholder="Chọn ca">
                <Select.Option value="Ca1">Ca 1</Select.Option>
                <Select.Option value="Ca2">Ca 2</Select.Option>
                <Select.Option value="HC">HC</Select.Option>
              </Select>
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item label="Giờ Vào" name="gioVao" style={{ flex: 1 }}>
              <TimePicker style={{ width: '100%' }} format="HH:mm" placeholder="07:30" />
            </Form.Item>
            <Form.Item label="Giờ Ra" name="gioRa" style={{ flex: 1 }}>
              <TimePicker style={{ width: '100%' }} format="HH:mm" placeholder="17:00" />
            </Form.Item>
          </div>
          <Form.Item label="Ghi Chú" name="ghiChu">
            <Input placeholder="Ghi chú (nếu có)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Profile edit modal ── */}
      <Modal
        open={profileEditOpen}
        onCancel={() => setProfileEditOpen(false)}
        onOk={handleProfileEditSave}
        okText="Lưu"
        cancelText="Huỷ"
        confirmLoading={profileEditSaving}
        title={
          <Space>
            <EditOutlined style={{ color: '#1D4ED8' }} />
            <span>Chỉnh sửa hồ sơ nhân viên</span>
            {fullEmp?.hoVaTen && <span style={{ fontWeight: 700, color: '#1D4ED8' }}>{fullEmp.hoVaTen}</span>}
          </Space>
        }
        width={600}
        destroyOnClose
      >
        <Form form={profileEditForm} layout="vertical" style={{ marginTop: 16 }}>
          {isAdmin && (
            <>
              <div style={{ display: 'flex', gap: 12 }}>
                <Form.Item label="Họ và tên" name="hoVaTen" style={{ flex: 2 }}
                  rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                  <Input placeholder="Nguyễn Văn A" />
                </Form.Item>
                <Form.Item label="Mã nhân viên" name="maNhanVien" style={{ flex: 1 }}
                  rules={[{ required: true, message: 'Vui lòng nhập mã NV' }]}>
                  <Input placeholder="SA082" style={{ fontFamily: 'monospace', textTransform: 'uppercase' }} />
                </Form.Item>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <Form.Item label="Tổ / Nhóm" name="toNhom" style={{ flex: 1 }}
                  rules={[{ required: true, message: 'Vui lòng chọn tổ nhóm' }]}>
                  <AutoComplete
                    options={ALL_GROUPS.filter(g => g.key).map(g => ({ value: g.key }))}
                    placeholder="VD: ĐG"
                    allowClear
                    filterOption={(input, opt) => opt.value.toLowerCase().includes(input.toLowerCase())}
                  />
                </Form.Item>
                <Form.Item label="Vị trí" name="viTri" style={{ flex: 1 }}>
                  <AutoComplete
                    options={['Công nhân', 'Trưởng ca', 'Phó ca', 'Tổ trưởng', 'KCS', 'Kỹ thuật'].map(v => ({ value: v }))}
                    placeholder="VD: Công nhân"
                    allowClear notFoundContent={null}
                    filterOption={(input, opt) => opt.value.toLowerCase().includes(input.toLowerCase())}
                  />
                </Form.Item>
              </div>
            </>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item label="Số điện thoại" name="sdt" style={{ flex: 1 }}>
              <Input placeholder="0901234567" />
            </Form.Item>
            {isAdmin && (
              <Form.Item label="Tình trạng" name="tinhTrang" style={{ flex: 1 }}>
                <Select>
                  <Option value="Đang làm">Đang làm</Option>
                  <Option value="Nghỉ việc">Nghỉ việc</Option>
                  <Option value="Tạm nghỉ">Tạm nghỉ</Option>
                </Select>
              </Form.Item>
            )}
          </div>
          <Form.Item label="Địa chỉ" name="diaChi">
            <Input placeholder="Số nhà, đường, phường/xã, quận/huyện..." />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item label="Ngày sinh" name="ngaySinh" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="DD/MM/YYYY" />
            </Form.Item>
            {isAdmin && (
              <>
                <Form.Item label="Ngày vào công ty" name="thoiGianVaoCongTy" style={{ flex: 1 }}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="DD/MM/YYYY" />
                </Form.Item>
                <Form.Item label="Ngày nghỉ việc" name="ngayNghiViec" style={{ flex: 1 }}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="DD/MM/YYYY" />
                </Form.Item>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item label="Học vấn" name="hocVan" style={{ flex: 1 }}>
              <Input placeholder="VD: Trung cấp, Cao đẳng..." />
            </Form.Item>
            {isAdmin && (
              <Form.Item label="Ghi chú" name="ghiChu" style={{ flex: 2 }}>
                <Input placeholder="Ghi chú nội bộ..." />
              </Form.Item>
            )}
          </div>
        </Form>
      </Modal>
    </>
  )
}

// ── Employee profile card ──────────────────────────────────────────────────────
const TO_NHOM_COLOR = { BBC1: 'blue', ĐG: 'purple', PCPL1: 'cyan', PCPL2: 'geekblue', PCPL3: 'volcano' }

function InfoRow({ label, icon, children }) {
  return (
    <div className="eff-info-row" style={{
      background: '#fff', border: '1px solid #e0e7ff',
      borderRadius: 10, padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 1px 4px rgba(29,78,216,0.05)',
    }}>
      <div className="eff-info-row-icon" style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#1D4ED8', fontSize: 16,
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
          {label}
        </div>
        {children}
      </div>
    </div>
  )
}

function EmployeeProfileCard({ authUser, toNhom, onSaved }) {
  const { login, logout } = useAuth()
  const [inputMaNv, setInputMaNv] = useState('')
  const [saving, setSaving] = useState(false)

  // Đổi mật khẩu
  const [pwModal, setPwModal]   = useState(false)
  const [pwForm]                = Form.useForm()
  const [pwSaving, setPwSaving] = useState(false)

  // Đổi tên đăng nhập
  const [unModal, setUnModal]   = useState(false)
  const [unForm]                = Form.useForm()
  const [unSaving, setUnSaving] = useState(false)

  const handleChangeUsername = async () => {
    const values = await unForm.validateFields()
    setUnSaving(true)
    try {
      await api.patch('/users/me/change-username', { newUsername: values.newUsername })
      message.success('Đổi tên đăng nhập thành công — vui lòng đăng nhập lại')
      setUnModal(false)
      setTimeout(() => logout(), 1200)
    } catch (err) {
      message.error(err?.response?.data?.error || 'Đổi tên đăng nhập thất bại')
    } finally {
      setUnSaving(false)
    }
  }

  // Ảnh đại diện
  const avatarInputRef = useRef(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false)

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) return message.warning('Ảnh tối đa 3MB')
    const reader = new FileReader()
    reader.onload = async (ev) => {
      // Resize xuống max 256x256 qua canvas
      const img = new Image()
      img.onload = async () => {
        const MAX = 256
        const scale = Math.min(MAX / img.width, MAX / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width  = Math.round(img.width  * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        setAvatarUploading(true)
        try {
          await api.patch('/users/me/avatar', { avatar: dataUrl })
          login({ ...authUser, avatar: dataUrl })
          message.success('Cập nhật ảnh đại diện thành công')
        } catch {
          message.error('Tải ảnh thất bại')
        } finally {
          setAvatarUploading(false)
        }
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleChangePw = async () => {
    const values = await pwForm.validateFields()
    if (values.newPassword !== values.confirmPassword) {
      return message.error('Mật khẩu xác nhận không khớp')
    }
    setPwSaving(true)
    try {
      await api.patch('/users/me/change-password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      })
      message.success('Đổi mật khẩu thành công')
      setPwModal(false)
      pwForm.resetFields()
    } catch (err) {
      message.error(err?.response?.data?.error || 'Đổi mật khẩu thất bại')
    } finally {
      setPwSaving(false)
    }
  }

  const hasMaNv = !!authUser?.maNhanVien

  const handleSave = async () => {
    const val = inputMaNv.trim().toUpperCase()
    if (!val) return message.warning('Vui lòng nhập mã nhân viên')
    setSaving(true)
    try {
      const { data } = await api.patch('/users/me/ma-nhan-vien', { maNhanVien: val })
      message.success('Đã liên kết mã nhân viên: ' + data.maNhanVien)
      onSaved?.(data.maNhanVien)
      setInputMaNv('')
    } catch (err) {
      const msg = err?.response?.data?.error || 'Lưu thất bại, vui lòng thử lại'
      message.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="eff-profile-wrapper" style={{ maxWidth: 600, margin: '24px auto', padding: '0 4px' }}>
      {/* hidden file input cho avatar — chấp nhận JPG/PNG/WEBP */}
      <input ref={avatarInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: 'none' }} onChange={handleAvatarChange} />

      {/* ── Header banner ── */}
      <div className="eff-profile-header" style={{
        background: 'linear-gradient(135deg, #1e4570 0%, #339999 100%)',
        borderRadius: 14, padding: '24px 28px',
        display: 'flex', alignItems: 'center', gap: 20,
        marginBottom: 18, boxShadow: '0 4px 20px rgba(30,69,112,0.18)',
      }}>
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          {/* Avatar — click để xem ảnh */}
          <div
            style={{ position: 'relative', cursor: authUser?.avatar ? 'zoom-in' : 'default' }}
            onClick={() => authUser?.avatar && setAvatarPreviewOpen(true)}
          >
            <Avatar
              className="eff-profile-header-avatar"
              size={80}
              src={authUser?.avatar || undefined}
              icon={!authUser?.avatar ? <UserOutlined /> : undefined}
              style={{
                background: 'rgba(255,255,255,0.18)',
                border: '3px solid rgba(255,255,255,0.55)',
                fontSize: 36,
                opacity: avatarUploading ? 0.5 : 1,
                display: 'block',
              }}
            />
            {/* Badge trạng thái góc dưới */}
            <div style={{
              position: 'absolute', bottom: 2, right: 2,
              background: avatarUploading ? '#faad14' : '#00CC99', borderRadius: '50%',
              width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #fff', fontSize: 11, pointerEvents: 'none',
            }}>
              {avatarUploading
                ? <SyncOutlined spin style={{ color: '#fff' }} />
                : <CameraOutlined style={{ color: '#fff' }} />}
            </div>
          </div>
          {/* Nút đổi ảnh — mở file picker */}
          <button
            onClick={() => !avatarUploading && avatarInputRef.current?.click()}
            disabled={avatarUploading}
            style={{
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: 20, color: '#fff', fontSize: 11, fontWeight: 600,
              padding: '2px 10px', cursor: avatarUploading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.02em', whiteSpace: 'nowrap',
            }}
          >
            {avatarUploading ? 'Đang tải...' : 'Đổi ảnh'}
          </button>
        </div>

        {/* Modal xem ảnh đại diện */}
        <Modal
          open={avatarPreviewOpen}
          onCancel={() => setAvatarPreviewOpen(false)}
          footer={[
            <Button key="change" type="primary" icon={<CameraOutlined />}
              onClick={() => { setAvatarPreviewOpen(false); avatarInputRef.current?.click() }}
              style={{ background: '#00CC99', borderColor: '#00CC99' }}
            >
              Đổi ảnh
            </Button>,
            <Button key="close" onClick={() => setAvatarPreviewOpen(false)}>Đóng</Button>,
          ]}
          centered
          width={360}
          styles={{ body: { padding: 0, textAlign: 'center' } }}
        >
          <img
            src={authUser?.avatar}
            alt="Ảnh đại diện"
            style={{ width: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 8 }}
          />
        </Modal>
        <div style={{ minWidth: 0 }}>
          <div className="eff-profile-header-name" style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 6, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {authUser?.fullName || authUser?.username}
          </div>
          <Tag style={{
            background: 'rgba(255,255,255,0.18)', border: 'none',
            color: '#fff', fontFamily: 'monospace', fontWeight: 700, marginRight: 0,
          }}>
            {authUser?.username}
          </Tag>
        </div>
      </div>

      {/* ── Info fields ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <InfoRow label="Tên đăng nhập" icon={<IdcardOutlined />}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: '#1677ff' }}>
              {authUser?.username || '—'}
            </span>
            <Tooltip title="Đổi tên đăng nhập">
              <Button size="small" type="text" icon={<EditOutlined />}
                style={{ color: '#00CC99' }}
                onClick={() => { unForm.resetFields(); setUnModal(true) }} />
            </Tooltip>
          </div>
        </InfoRow>

        <InfoRow label="Họ và tên" icon={<UserOutlined />}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#1E293B' }}>
            {authUser?.fullName || '—'}
          </span>
        </InfoRow>

        <InfoRow label="Mã nhân viên" icon={<TeamOutlined />}>
          {hasMaNv ? (
            <Tag color="cyan" style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, marginRight: 0 }}>
              {authUser.maNhanVien}
            </Tag>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input
                placeholder="VD: SA082"
                value={inputMaNv}
                onChange={e => setInputMaNv(e.target.value.toUpperCase())}
                onPressEnter={handleSave}
                style={{ maxWidth: 160, fontFamily: 'monospace', textTransform: 'uppercase' }}
                maxLength={20}
              />
              <Button type="primary" size="small" loading={saving} onClick={handleSave}>
                Lưu
              </Button>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>Nhập mã NV rồi nhấn Lưu</span>
            </div>
          )}
        </InfoRow>

        <InfoRow label="Tổ nhóm" icon={<TeamOutlined />}>
          {toNhom
            ? <Tag color={TO_NHOM_COLOR[toNhom] || 'default'} style={{ fontWeight: 700, fontSize: 13, marginRight: 0 }}>{toNhom}</Tag>
            : <span style={{ color: '#94a3b8', fontSize: 13 }}>{authUser?.maNhanVien ? 'Đang tải…' : '—'}</span>
          }
        </InfoRow>

        <InfoRow label="Mật khẩu" icon={<LockOutlined />}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#94a3b8', fontSize: 13, letterSpacing: 3 }}>••••••••</span>
            <Button
              size="small" type="primary" icon={<LockOutlined />}
              style={{ background: '#00CC99', borderColor: '#00CC99' }}
              onClick={() => { pwForm.resetFields(); setPwModal(true) }}
            >
              Đổi mật khẩu
            </Button>
          </div>
        </InfoRow>
      </div>

      {/* Modal đổi tên đăng nhập */}
      <Modal
        open={unModal}
        title={
          <Space>
            <IdcardOutlined style={{ color: '#00CC99' }} />
            <span>Đổi tên đăng nhập</span>
          </Space>
        }
        onOk={handleChangeUsername}
        onCancel={() => { setUnModal(false); unForm.resetFields() }}
        okText="Xác nhận"
        cancelText="Huỷ"
        confirmLoading={unSaving}
        width={420}
        destroyOnClose
      >
        <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: '8px 14px', marginBottom: 16, fontSize: 12, color: '#874d00' }}>
          ⚠️ Sau khi đổi tên đăng nhập, bạn sẽ được đăng xuất và cần đăng nhập lại bằng tên mới.
        </div>
        <Form form={unForm} layout="vertical">
          <Form.Item label="Tên đăng nhập hiện tại">
            <Input value={authUser?.username} disabled style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item
            label="Tên đăng nhập mới"
            name="newUsername"
            rules={[
              { required: true, message: 'Vui lòng nhập tên đăng nhập mới' },
              { min: 3, message: 'Tối thiểu 3 ký tự' },
              { pattern: /^[a-zA-Z0-9._\- ]+$/, message: 'Chỉ chứa chữ, số, dấu chấm, gạch ngang' },
            ]}
          >
            <Input placeholder="Nhập tên đăng nhập mới" autoFocus />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal đổi mật khẩu */}
      <Modal
        open={pwModal}
        title={
          <Space>
            <LockOutlined style={{ color: '#00CC99' }} />
            <span>Đổi mật khẩu</span>
          </Space>
        }
        onOk={handleChangePw}
        onCancel={() => { setPwModal(false); pwForm.resetFields() }}
        okText="Xác nhận"
        cancelText="Huỷ"
        confirmLoading={pwSaving}
        width={420}
        destroyOnClose
      >
        <Form form={pwForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="Mật khẩu hiện tại"
            name="oldPassword"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
          >
            <Input.Password
              placeholder="Nhập mật khẩu hiện tại"
              iconRender={v => v ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
            />
          </Form.Item>
          <Form.Item
            label="Mật khẩu mới"
            name="newPassword"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
            ]}
          >
            <Input.Password
              placeholder="Tối thiểu 6 ký tự"
              iconRender={v => v ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
            />
          </Form.Item>
          <Form.Item
            label="Xác nhận mật khẩu mới"
            name="confirmPassword"
            rules={[{ required: true, message: 'Vui lòng xác nhận mật khẩu mới' }]}
          >
            <Input.Password
              placeholder="Nhập lại mật khẩu mới"
              iconRender={v => v ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function WorkEfficiencyPage() {
  const { user, login, isAdmin, isNhanVien, getMaNhanVien, allowedEfficiencyTabs } = useAuth()
  const selfMaNv = getMaNhanVien()

  // Period state
  const [periodType,  setPeriodType]  = useState('month')
  const [dayValue,    setDayValue]    = useState(dayjs())
  const [weekValue,   setWeekValue]   = useState(dayjs())
  const [monthValue,  setMonthValue]  = useState(dayjs())
  const [quarterYear, setQuarterYear] = useState(dayjs().year())
  const [quarterQ,    setQuarterQ]    = useState(Math.ceil((dayjs().month() + 1) / 3))
  const [yearValue,   setYearValue]   = useState(dayjs())

  // Group / search
  const allowed = allowedEfficiencyTabs()
  const allowedKeys = allowed ? allowed : null
  const defaultGroup = allowedKeys ? allowedKeys[0] : ''
  const [activeGroup, setActiveGroup] = useState(defaultGroup)
  const [search, setSearch] = useState('')

  // Data
  const [data,         setData]         = useState([])
  const [loading,      setLoading]      = useState(false)
  const [syncing,        setSyncing]        = useState(false)
  const [recalculating,  setRecalculating]  = useState(false)
  const [fixingNhom,     setFixingNhom]     = useState(false)

  // Detail drawer
  const [drawerOpen, setDrawerOpen]       = useState(false)
  const [drawerEmployee, setDrawerEmployee] = useState(null)

  // Group tab bar ref for sticky offset
  const groupTabRef = useRef(null)
  const [groupTabH, setGroupTabH] = useState(0)

  useEffect(() => {
    if (!groupTabRef.current) return
    const obs = new ResizeObserver(() => setGroupTabH(groupTabRef.current?.offsetHeight || 0))
    obs.observe(groupTabRef.current)
    return () => obs.disconnect()
  }, [])

  const [effCtxMenu, setEffCtxMenu] = useState(null) // {x, y, record}

  // Multi-select + bulk delete
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const handleBulkDelete = () => {
    if (selectedRowKeys.length === 0) return
    Modal.confirm({
      title: `Xóa ${selectedRowKeys.length} nhân viên?`,
      icon: <ExclamationCircleOutlined />,
      content: 'Thao tác này sẽ xóa bản ghi hiệu quả của các nhân viên được chọn. Không thể hoàn tác.',
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Huỷ',
      onOk: async () => {
        setBulkDeleting(true)
        try {
          const ids = selectedRowKeys
            .map(maNv => displayData.find(r => r.maNhanVien === maNv)?.weId)
            .filter(Boolean)
          await api.delete('/work-efficiency/bulk', { data: ids })
          message.success(`Đã xóa ${ids.length} bản ghi`)
          setSelectedRowKeys([])
          fetchData(fromDate, toDate, activeGroup)
        } catch { message.error('Xóa thất bại') }
        finally { setBulkDeleting(false) }
      },
    })
  }

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editRecord,    setEditRecord]    = useState(null)
  const [editSaving,    setEditSaving]    = useState(false)
  const [editForm] = Form.useForm()

  const openEditModal = (record) => {
    setEditRecord(record)
    editForm.setFieldsValue({ toNhom: record.toNhom || '', viTri: record.viTri || '' })
    setEditModalOpen(true)
  }

  const handleEditSave = async () => {
    const values = await editForm.validateFields()
    if (!editRecord?.weId) {
      message.error('Nhân viên này chưa có bản ghi hiệu quả, vui lòng Đồng bộ NV trước')
      return
    }
    setEditSaving(true)
    try {
      await api.put(`/work-efficiency/${editRecord.weId}`, {
        toNhom: values.toNhom || null,
        viTri:  values.viTri  || null,
      })
      message.success('Cập nhật thành công')
      setEditModalOpen(false)
      fetchData(fromDate, toDate, activeGroup)
    } catch { message.error('Cập nhật thất bại') }
    finally { setEditSaving(false) }
  }

  // Computed period range
  const periodValue = useMemo(() => {
    if (periodType === 'day')     return dayValue
    if (periodType === 'week')    return weekValue
    if (periodType === 'month')   return monthValue
    if (periodType === 'quarter') return { year: quarterYear, q: quarterQ }
    if (periodType === 'year')    return yearValue
    return null
  }, [periodType, dayValue, weekValue, monthValue, quarterYear, quarterQ, yearValue])

  const { fromDate, toDate } = useMemo(
    () => getPeriodRange(periodType, periodValue),
    [periodType, periodValue]
  )
  const periodStr = periodLabel(periodType, periodValue)

  const fetchData = useCallback(async (fd = fromDate, td = toDate, grp = activeGroup) => {
    setLoading(true)
    try {
      const params = {}
      if (fd) params.fromDate = fd
      if (td) params.toDate   = td
      if (grp) params.toNhom  = grp
      const { data: res } = await api.get('/work-efficiency/report', { params })
      setData(res)
    } catch {
      message.error('Không thể tải dữ liệu hiệu quả')
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, activeGroup])

  useEffect(() => { fetchData() }, [periodType, dayValue, weekValue, monthValue, quarterYear, quarterQ, yearValue, activeGroup])

  const handleSyncAll = async () => {
    setSyncing(true)
    try {
      const { data: cnt } = await api.post('/work-efficiency/sync-all')
      message.success(`Đã đồng bộ ${cnt} nhân viên mới`)
    } catch { message.error('Đồng bộ thất bại') }
    finally { setSyncing(false) }
  }

  const handleRecalculateNs = async () => {
    setRecalculating(true)
    try {
      const { data: res } = await api.post('/work-schedule-session/recalculate-ns')
      message.success(`Đã tính lại năng suất cho ${res.updated} ca làm việc`)
      fetchData(fromDate, toDate, activeGroup)
    } catch { message.error('Tính lại thất bại') }
    finally { setRecalculating(false) }
  }

  const handleFixNhomThucHien = async () => {
    setFixingNhom(true)
    try {
      const { data: res } = await api.post('/work-efficiency/fix-nhom-thuc-hien')
      message.success(`Đã bổ sung nhóm TH cho ${res.fixed} ca (BBC1, ĐG, PL)`)
      fetchData(fromDate, toDate, activeGroup)
    } catch { message.error('Đồng bộ nhóm thất bại') }
    finally { setFixingNhom(false) }
  }

  const [fixingMaNv, setFixingMaNv] = useState(false)
  const handleFixNullMaNhanVien = async () => {
    setFixingMaNv(true)
    try {
      const { data: res } = await api.post('/work-efficiency/fix-null-ma-nhan-vien')
      message.success(`Đã khôi phục Mã NV cho ${res.fixed} ca bị thiếu`)
      fetchData(fromDate, toDate, activeGroup)
    } catch { message.error('Sửa Mã NV thất bại') }
    finally { setFixingMaNv(false) }
  }

  // Profile tab (for NHAN_VIEN)
  const [profileTab, setProfileTab] = useState('efficiency')

  // All employees list (fetched once, for zero-row merging + profile)
  const [employees, setEmployees] = useState([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const fetchAllEmployees = useCallback(async () => {
    setLoadingEmployees(true)
    try {
      const { data: res } = await api.get('/employees', { params: { page: 0, size: 1000 } })
      setEmployees(res.content || [])
    } catch { /* non-blocking */ }
    finally { setLoadingEmployees(false) }
  }, [])
  useEffect(() => { fetchAllEmployees() }, [fetchAllEmployees])

  // Tự động cập nhật toNhom vào auth context nếu đã có maNhanVien nhưng chưa có toNhom
  useEffect(() => {
    if (!isNhanVien() || !selfMaNv || user?.toNhom || employees.length === 0) return
    const emp = employees.find(e => e.maNhanVien === selfMaNv)
    if (emp?.toNhom) login({ ...user, toNhom: emp.toNhom })
  }, [employees, selfMaNv, user, isNhanVien, login])

  // Self employee info + direct manager (tổ trưởng cùng nhóm)
  const selfEmployee = useMemo(() => {
    if (!isNhanVien() || !selfMaNv) return null
    return employees.find(e => e.maNhanVien === selfMaNv) || null
  }, [employees, selfMaNv, isNhanVien])

  // Tự động mở drawer khi nhân viên vào trang (sau khi load xong danh sách)
  useEffect(() => {
    if (!isNhanVien() || !selfEmployee || drawerOpen) return
    setDrawerEmployee(selfEmployee)
    setDrawerOpen(true)
  }, [selfEmployee])

  const toTruong = useMemo(() => {
    if (!selfEmployee?.toNhom) return null
    return (
      employees.find(e =>
        e.toNhom === selfEmployee.toNhom &&
        e.viTri === 'Tổ trưởng' &&
        e.maNhanVien !== selfEmployee.maNhanVien
      ) ||
      employees.find(e =>
        e.toNhom === selfEmployee.toNhom &&
        e.viTri?.toLowerCase().includes('trưởng') &&
        e.maNhanVien !== selfEmployee.maNhanVien
      ) ||
      null
    )
  }, [employees, selfEmployee])

  // KPI tổng hợp — chỉ tính trên dữ liệu hiển thị (NHAN_VIEN chỉ thấy của mình)
  const kpi = useMemo(() => {
    let filtered = data
    if (isNhanVien()) {
      filtered = selfMaNv ? data.filter(r => r.maNhanVien === selfMaNv) : []
    } else {
      if (activeGroup) filtered = filtered.filter(r => r.toNhom === activeGroup)
      if (search) filtered = filtered.filter(r =>
        r.hoVaTen?.toLowerCase().includes(search.toLowerCase()) ||
        r.maNhanVien?.toLowerCase().includes(search.toLowerCase()))
    }
    const tongCong = filtered.reduce((a, r) => a + (parseFloat(r.tongCong) || 0), 0)
    const totalDat = filtered.reduce((a, r) => a + (r.soLanDat || 0), 0)
    const totalKhongDat = filtered.reduce((a, r) => a + (r.soLanKhongDat || 0), 0)
    const tyLe = totalDat + totalKhongDat > 0
      ? Math.round(totalDat / (totalDat + totalKhongDat) * 100) : null
    const top = [...filtered].sort((a, b) => (parseFloat(b.tongCong) || 0) - (parseFloat(a.tongCong) || 0))[0]
    return { count: filtered.length, tongCong, tyLe, top, filtered }
  }, [data, search, activeGroup, isNhanVien, selfMaNv])

  // Merge report data with full employee list — every employee gets a row
  const mergedData = useMemo(() => {
    const reportMap = new Map(data.map(r => [r.maNhanVien, r]))
    return employees.map(emp => reportMap.get(emp.maNhanVien) || {
      maNhanVien: emp.maNhanVien,
      hoVaTen: emp.hoVaTen,
      toNhom: emp.toNhom,
      viTri: emp.viTri || null,
      soCa: 0,
      soCaTruong: 0,
      tongCong: 0,
      tongSanLuong: 0,
      nangSuatTB: null,
      soLanDat: 0,
      soLanKhongDat: 0,
      weId: null,
    })
  }, [employees, data])

  // displayData: merge → filter group → filter search → filter NHAN_VIEN
  const displayData = useMemo(() => {
    let rows = mergedData
    if (activeGroup) rows = rows.filter(r => r.toNhom === activeGroup)
    if (search) rows = rows.filter(r =>
      r.hoVaTen?.toLowerCase().includes(search.toLowerCase()) ||
      r.maNhanVien?.toLowerCase().includes(search.toLowerCase())
    )
    if (isNhanVien()) rows = selfMaNv ? rows.filter(r => r.maNhanVien === selfMaNv) : []
    return rows
  }, [mergedData, activeGroup, search, selfMaNv, isNhanVien])

  const GROUPS = allowedKeys
    ? ALL_GROUPS.filter(g => g.key !== '' && allowedKeys.includes(g.key))
    : ALL_GROUPS

  // Tỷ lệ đạt render
  const tyLeRender = (dat, khongDat) => {
    const total = dat + khongDat
    if (total === 0) return <span style={{ color: '#bbb' }}>—</span>
    const pct = Math.round(dat / total * 100)
    return (
      <div style={{ minWidth: 90 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
          <span style={{ color: pct >= 70 ? '#748090' : '#f97316', fontWeight: 700 }}>{pct}%</span>
          <span style={{ color: '#aaa' }}>{dat}/{total}</span>
        </div>
        <Progress percent={pct} size="small" showInfo={false}
          strokeColor={pct >= 80 ? '#748090' : pct >= 60 ? '#f97316' : '#ef4444'} />
      </div>
    )
  }

  const columns = [
    {
      title: '#', key: 'stt', width: 44, fixed: 'left', align: 'center',
      render: (_, __, i) => <span style={{ color: '#aaa', fontSize: 12 }}>{i + 1}</span>
    },
    {
      title: 'Mã NV', dataIndex: 'maNhanVien', key: 'maNhanVien', width: 95, fixed: 'left',
      render: (v, r) => (
        <Button type="link" style={{ padding: 0, fontWeight: 700, height: 'auto', color: '#4db3d4' }}
          onClick={() => { setDrawerEmployee(r); setDrawerOpen(true) }}>
          {v}
        </Button>
      )
    },
    {
      title: 'Họ và Tên', dataIndex: 'hoVaTen', key: 'hoVaTen', width: 190, fixed: 'left',
      render: (v, r) => (
        <Button type="link" style={{ padding: 0, fontWeight: 600, height: 'auto', color: '#1D4ED8', textAlign: 'left', whiteSpace: 'normal' }}
          onClick={() => { setDrawerEmployee(r); setDrawerOpen(true) }}>
          {v}
        </Button>
      )
    },
    {
      title: 'Nhóm', dataIndex: 'toNhom', key: 'toNhom', width: 80, align: 'center',
      render: v => v
        ? <Tag color="cyan" style={{ marginRight: 0, fontWeight: 600 }}>{v}</Tag>
        : <span style={{ color: '#bbb' }}>—</span>
    },
    {
      title: 'Vị Trí', dataIndex: 'viTri', key: 'viTri', width: 110, align: 'center',
      render: v => v
        ? <Tag color={v.toLowerCase().includes('trưởng') ? 'gold' : 'geekblue'} style={{ marginRight: 0 }}>{v}</Tag>
        : <span style={{ color: '#bbb' }}>—</span>
    },
    {
      title: 'Số Ca TH', dataIndex: 'soCa', key: 'soCa', width: 90, align: 'right',
      sorter: (a, b) => (a.soCa || 0) - (b.soCa || 0),
      render: v => <span style={{ fontWeight: 700, color: '#1D4ED8' }}>{v || 0}</span>
    },
    {
      title: 'Ca Trưởng', dataIndex: 'soCaTruong', key: 'soCaTruong', width: 95, align: 'right',
      sorter: (a, b) => (a.soCaTruong || 0) - (b.soCaTruong || 0),
      render: v => v > 0
        ? <span style={{ fontWeight: 700, color: '#f97316' }}>{v}</span>
        : <span style={{ color: '#bbb' }}>—</span>
    },
    {
      title: 'Tổng Công', dataIndex: 'tongCong', key: 'tongCong', width: 110, align: 'right',
      defaultSortOrder: 'descend',
      sorter: (a, b) => (parseFloat(a.tongCong) || 0) - (parseFloat(b.tongCong) || 0),
      render: v => v != null
        ? <span style={{ fontWeight: 700, color: '#722ed1', fontSize: 14 }}>{Number(v).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        : <span style={{ color: '#bbb' }}>—</span>
    },
    {
      title: 'Tổng SL', dataIndex: 'tongSanLuong', key: 'tongSanLuong', width: 100, align: 'right',
      sorter: (a, b) => (parseFloat(a.tongSanLuong) || 0) - (parseFloat(b.tongSanLuong) || 0),
      render: v => v != null
        ? <span style={{ fontWeight: 600, color: '#389e0d' }}>{Number(v).toLocaleString('vi-VN')}</span>
        : <span style={{ color: '#bbb' }}>—</span>
    },
    {
      title: 'NS Trung Bình', dataIndex: 'nangSuatTB', key: 'nangSuatTB', width: 120, align: 'right',
      sorter: (a, b) => (parseFloat(a.nangSuatTB) || 0) - (parseFloat(b.nangSuatTB) || 0),
      render: v => v != null
        ? <span style={{ fontWeight: 600, color: '#1677ff' }}>{Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}</span>
        : <span style={{ color: '#bbb' }}>—</span>
    },
    {
      title: 'Đạt / Không Đạt', key: 'dat', width: 90, align: 'center',
      sorter: (a, b) => (a.soLanDat || 0) - (b.soLanDat || 0),
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Số lần đạt năng suất">
            <Tag color="success" style={{ marginRight: 0, fontWeight: 700 }}>{r.soLanDat || 0}</Tag>
          </Tooltip>
          <span style={{ color: '#bbb' }}>/</span>
          <Tooltip title="Số lần không đạt">
            <Tag color="error" style={{ marginRight: 0, fontWeight: 700 }}>{r.soLanKhongDat || 0}</Tag>
          </Tooltip>
        </Space>
      )
    },
    {
      title: 'Tỷ Lệ Đạt', key: 'tyLe', width: 130,
      sorter: (a, b) => {
        const ta = a.soLanDat + a.soLanKhongDat
        const tb = b.soLanDat + b.soLanKhongDat
        return (ta ? a.soLanDat / ta : 0) - (tb ? b.soLanDat / tb : 0)
      },
      render: (_, r) => tyLeRender(r.soLanDat || 0, r.soLanKhongDat || 0)
    },
    ...(isAdmin() ? [{
      title: 'Sửa', key: 'action', width: 64, align: 'center', fixed: 'right',
      render: (_, r) => (
        <Tooltip title="Chỉnh sửa Nhóm / Vị trí">
          <Button
            size="small" type="text" icon={<EditOutlined />}
            style={{ color: '#1D4ED8' }}
            onClick={() => openEditModal(r)}
          />
        </Tooltip>
      )
    }] : []),
  ]

  return (
    <>
      {/* ── Profile tab nav (NHAN_VIEN only) ── */}
      {isNhanVien() && (
        <div className="eff-page-tabs" style={{
          display: 'flex', borderBottom: '2px solid #e0e7ff',
          marginBottom: 0, background: '#fff',
          position: 'sticky', top: 0, zIndex: 21,
        }}>
          {[
            { key: 'efficiency', label: 'Hồ Sơ Sản Xuất', icon: <BarChartOutlined /> },
            { key: 'profile',    label: 'Hồ sơ',    icon: <IdcardOutlined /> },
          ].map(t => (
            <button key={t.key} onClick={() => setProfileTab(t.key)} style={{
              padding: '10px 22px', border: 'none', cursor: 'pointer', background: 'transparent',
              fontSize: 13, fontWeight: profileTab === t.key ? 700 : 500,
              color: profileTab === t.key ? '#1D4ED8' : '#64748b',
              borderBottom: profileTab === t.key ? '2.5px solid #1D4ED8' : '2.5px solid transparent',
              marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s',
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Profile view ── */}
      {isNhanVien() && profileTab === 'profile' && (
        <>
        <style>{`
          @media (max-width: 768px) {
            .eff-profile-wrapper { max-width: 100% !important; padding: 0 10px !important; margin-top: 12px !important; }
            .eff-profile-header { padding: 14px 14px !important; gap: 10px !important; border-radius: 10px !important; }
            .eff-profile-header-avatar.ant-avatar { width: 60px !important; height: 60px !important; line-height: 60px !important; font-size: 26px !important; }
            .eff-profile-header-name { font-size: 16px !important; }
            .eff-info-row { padding: 10px 12px !important; gap: 10px !important; }
            .eff-info-row-icon { width: 30px !important; height: 30px !important; min-width: 30px !important; font-size: 13px !important; }
          }
          @media (max-width: 400px) {
            .eff-profile-header-name { font-size: 14px !important; }
            .eff-info-row { padding: 8px 10px !important; }
          }
        `}</style>
        <EmployeeProfileCard
          authUser={user}
          toNhom={selfEmployee?.toNhom || null}
          onSaved={newMaNv => {
            const emp = employees.find(e => e.maNhanVien === newMaNv)
            login({ ...user, maNhanVien: newMaNv, toNhom: emp?.toNhom || null })
          }}
        />
        </>
      )}

      {/* ── Efficiency view (hidden when profile tab active) ── */}
      <div style={{ display: isNhanVien() && profileTab === 'profile' ? 'none' : 'block' }}>
      <style>{`
        /* ERP dark tab bar */
        .eff-tabs > .ant-tabs-nav { background: #1e4570 !important; padding: 0 12px; margin: 0 !important; }
        .eff-tabs > .ant-tabs-nav .ant-tabs-tab { color: #CBD5E1 !important; font-size: 12px; padding: 8px 14px !important; margin: 0 2px !important; border-radius: 4px 4px 0 0; }
        .eff-tabs > .ant-tabs-nav .ant-tabs-tab:hover { color: #fff !important; background: rgba(59,130,246,0.15) !important; }
        .eff-tabs > .ant-tabs-nav .ant-tabs-tab-active { color: #fff !important; font-weight: 700 !important; background: rgba(29,78,216,0.25) !important; box-shadow: 0 -3px 0 #60A5FA inset; }
        .eff-tabs > .ant-tabs-nav .ant-tabs-ink-bar { background: #60A5FA !important; }
        .eff-tabs > .ant-tabs-nav::before { border: none !important; }
        /* ERP blue table header */
        .eff-table .ant-table-thead > tr > th { background: #99CCCC !important; color: #1a4a4a !important; font-size: 11px !important; text-transform: uppercase; padding: 7px 8px !important; letter-spacing: 0.4px; border-right: 1px solid #4db3d4 !important; white-space: nowrap; }
        .eff-table .ant-table-thead > tr > th::before { display: none !important; }
        .eff-table .ant-table-tbody > tr > td { padding: 6px 8px !important; font-size: 12px; vertical-align: middle; }
        .eff-table .ant-table-tbody > tr:hover > td { background: #f5f3ff !important; }
        .eff-table .row-stripe td { background: #fafbff !important; }
        .eff-table .ant-table-column-sort { background: transparent !important; }

        /* ── Desktop: show table, hide cards ── */
        .eff-desktop-view { display: block; }
        .eff-mobile-view  { display: none !important; }

        /* ── Mobile responsive ── */
        @media (max-width: 768px) {
          /* Show cards, hide tables */
          .eff-desktop-view { display: none !important; }
          .eff-mobile-view  { display: flex !important; }

          /* Toolbar: hide title text, compact row */
          .eff-toolbar-title { display: none !important; }
          .eff-toolbar-row1 { gap: 5px !important; padding: 0 8px !important; margin-bottom: 6px !important; }
          .eff-period-toggle button { padding: 3px 9px !important; font-size: 12px !important; }
          .eff-search-input { width: 100% !important; min-width: 0 !important; flex: 1 1 100% !important; order: 10; }
          /* Hide Kỳ tag — date picker already shows it */
          .eff-period-tag { display: none !important; }

          /* KPI strip: horizontal scroll, 1 row */
          .kpi-strip { flex-wrap: nowrap !important; overflow-x: auto !important; gap: 8px !important; padding: 0 8px !important; -webkit-overflow-scrolling: touch; padding-bottom: 4px !important; }
          .kpi-strip > * { flex: 0 0 auto !important; min-width: 130px !important; max-width: 150px !important; padding: 7px 10px !important; }
          .kpi-strip > * > div:first-child { font-size: 9px !important; }
          .kpi-strip > * > div:nth-child(2) { font-size: 17px !important; }
          .kpi-strip > * > div:nth-child(3) { font-size: 9px !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

          /* Table: tighter on small screen */
          .eff-table .ant-table-thead > tr > th { padding: 5px 5px !important; font-size: 10px !important; }
          .eff-table .ant-table-tbody > tr > td { padding: 5px 5px !important; font-size: 11px !important; }
          .eff-table .ant-table-pagination { padding: 8px !important; }

          /* Detail drawer: full width */
          .eff-detail-drawer .ant-drawer-content-wrapper { width: 100vw !important; }
          .eff-detail-drawer .ant-drawer-body { padding: 10px !important; }
          .eff-detail-mini-kpi { gap: 6px !important; }
          .eff-detail-mini-kpi > * { flex: 1 1 calc(50% - 4px) !important; padding: 5px 8px !important; min-width: 0 !important; }
          .eff-detail-mini-kpi > * > div:first-child { font-size: 9px !important; }
          .eff-detail-mini-kpi > * > div:nth-child(2) { font-size: 15px !important; }

          /* Period control row wrapping */
          .eff-period-row { gap: 6px !important; }

          /* Tab bar for NHAN_VIEN */
          .eff-page-tabs button { padding: 10px 0 !important; flex: 1 !important; justify-content: center !important; font-size: 13px !important; }

          /* Profile card mobile */
          .eff-profile-wrapper { max-width: 100% !important; padding: 0 10px !important; margin-top: 14px !important; }
          .eff-profile-header { padding: 16px 16px !important; gap: 12px !important; }
          .eff-profile-header-avatar { width: 52px !important; height: 52px !important; min-width: 52px !important; font-size: 22px !important; }
          .eff-profile-header-name { font-size: 17px !important; }
          .eff-info-row { padding: 10px 12px !important; gap: 10px !important; }
          .eff-info-row-icon { width: 30px !important; height: 30px !important; font-size: 14px !important; }
          .eff-info-row input { max-width: 120px !important; }
        }

        @media (max-width: 480px) {
          .eff-period-toggle { overflow-x: auto; max-width: 100%; }
          .eff-period-toggle button { padding: 3px 7px !important; font-size: 11px !important; white-space: nowrap; }
          .kpi-strip > * { min-width: 120px !important; padding: 6px 8px !important; }
          .kpi-strip > * > div:nth-child(2) { font-size: 15px !important; }
          /* Session detail modal: bottom-sheet style on small phones */
          .ant-modal-centered .ant-modal { margin-bottom: 0 !important; border-radius: 16px 16px 0 0 !important; }
          .ant-modal-centered .ant-modal-content { border-radius: 16px 16px 0 0 !important; }
          .ant-modal-centered { align-items: flex-end !important; }
        }
      `}</style>


      {/* ── Toolbar: kỳ thời gian + tìm kiếm ── */}
      <div className="eff-toolbar-row1" style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        padding: '8px 14px', background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky', top: isNhanVien() ? 42 : 0, zIndex: 20,
      }}>
        {/* Period type toggle */}
        <div className="eff-period-toggle" style={{
          display: 'inline-flex', border: '1px solid #e2e8f0',
          borderRadius: 7, overflow: 'hidden', background: '#fff', flexShrink: 0,
        }}>
          {PERIOD_TYPES.map(pt => (
            <button key={pt.key} onClick={() => setPeriodType(pt.key)} style={{
              padding: '5px 11px', border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: periodType === pt.key ? 700 : 400,
              background: periodType === pt.key ? '#1D4ED8' : 'transparent',
              color: periodType === pt.key ? '#fff' : '#475569',
              transition: 'all .15s',
            }}>
              {pt.label}
            </button>
          ))}
        </div>

        {/* Date picker theo kỳ */}
        <div className="eff-period-row" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {periodType === 'day' && (
            <DatePicker value={dayValue} onChange={v => v && setDayValue(v)}
              format="DD/MM/YYYY" allowClear={false} size="small" style={{ width: 130 }} />
          )}
          {periodType === 'week' && (
            <DatePicker value={weekValue} onChange={v => v && setWeekValue(v)}
              picker="week" format="[Tuần] w - YYYY" allowClear={false} size="small" style={{ width: 150 }} />
          )}
          {periodType === 'month' && (
            <DatePicker value={monthValue} onChange={v => v && setMonthValue(v)}
              picker="month" format="MM/YYYY" allowClear={false} size="small" style={{ width: 110 }} />
          )}
          {periodType === 'quarter' && (
            <Space size={4}>
              <Select size="small" value={quarterQ} onChange={setQuarterQ} style={{ width: 68 }}>
                {[1,2,3,4].map(q => <Option key={q} value={q}>Q{q}</Option>)}
              </Select>
              <Select size="small" value={quarterYear} onChange={setQuarterYear} style={{ width: 80 }}>
                {Array.from({ length: 5 }, (_, i) => dayjs().year() - 2 + i).map(y =>
                  <Option key={y} value={y}>{y}</Option>
                )}
              </Select>
            </Space>
          )}
          {periodType === 'year' && (
            <DatePicker value={yearValue} onChange={v => v && setYearValue(v)}
              picker="year" format="YYYY" allowClear={false} size="small" style={{ width: 90 }} />
          )}
          <Tag className="eff-period-tag" color="blue" style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>
            {periodStr}
          </Tag>
        </div>

        {/* Tìm kiếm */}
        <Input
          className="eff-search-input"
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          placeholder="Tìm mã NV, họ tên..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          allowClear
          size="small"
          style={{ width: 200, borderRadius: 7 }}
        />

        {/* Reload */}
        <Button size="small" icon={<ReloadOutlined spin={loading} />}
          onClick={() => fetchData(fromDate, toDate, activeGroup)}
          style={{ marginLeft: 'auto', flexShrink: 0 }}
        />
      </div>

      {/* ── Admin toolbar ── */}
      {isAdmin() && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
          padding: '6px 14px', background: '#fff7ed',
          borderBottom: '1px solid #fed7aa',
        }}>
          <span style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginRight: 4 }}>Quản trị:</span>
          <Button size="small" icon={<SyncOutlined spin={syncing} />} loading={syncing}
            onClick={handleSyncAll}>
            Đồng bộ NV
          </Button>
          <Button size="small" icon={<SyncOutlined spin={recalculating} />} loading={recalculating}
            onClick={handleRecalculateNs}>
            Tính lại NS
          </Button>
          <Button size="small" loading={fixingNhom} onClick={handleFixNhomThucHien}>
            Sửa nhóm TH
          </Button>
          <Button size="small" loading={fixingMaNv} onClick={handleFixNullMaNhanVien}>
            Sửa Mã NV null
          </Button>
        </div>
      )}

      {/* ── Group tabs + table ── */}
      <div style={{ marginTop: 0 }}>
        {/* Group tab bar — ẩn với NHAN_VIEN */}
        <div ref={groupTabRef} style={{
          display: isNhanVien() ? 'none' : 'flex', gap: 4, background: '#1e4570',
          padding: '6px 12px 0', borderRadius: '8px 8px 0 0',
          position: 'sticky', top: isNhanVien() ? 0 : 0, zIndex: 19,
        }}>
          {GROUPS.map(g => {
            const cnt = g.key === '' ? mergedData.length : mergedData.filter(r => r.toNhom === g.key).length
            const active = activeGroup === g.key
            return (
              <button key={g.key} onClick={() => setActiveGroup(g.key)}
                style={{
                  padding: '6px 16px', border: 'none', borderRadius: '4px 4px 0 0',
                  cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 400,
                  background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: active ? '#fff' : '#D0D5DC',
                  transition: 'all .15s',
                }}>
                {g.label}
                {cnt > 0 && (
                  <Badge count={cnt} size="small"
                    style={{ marginLeft: 6, background: active ? '#4db3d4' : '#3730a3', fontSize: 10 }} />
                )}
              </button>
            )
          })}
        </div>

        <div className="eff-desktop-view">
        <Table
          className="eff-table"
          columns={columns}
          dataSource={displayData}
          rowKey="maNhanVien"
          loading={loading}
          onRow={(record) => ({
            onClick: () => { setDrawerEmployee(record); setDrawerOpen(true) },
            onContextMenu: isAdmin() ? (e) => { e.preventDefault(); setEffCtxMenu({ x: e.clientX, y: e.clientY, record }) } : undefined,
            style: { cursor: 'pointer' },
          })}
          locale={isNhanVien() && !selfMaNv ? {
            emptyText: (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <IdcardOutlined style={{ fontSize: 40, color: '#cbd5e1', marginBottom: 12, display: 'block' }} />
                <div style={{ color: '#64748b', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Tài khoản chưa liên kết mã nhân viên</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>Vui lòng liên hệ admin để liên kết mã NV, sau đó đăng nhập lại</div>
              </div>
            )
          } : undefined}
          size="small"
          scroll={{ x: 1200 }}
          sticky={{ offsetHeader: groupTabH }}
          rowHoverable={false}
          rowClassName={(_, i) => i % 2 !== 0 ? 'row-stripe' : ''}
          pagination={{
            defaultPageSize: 50,
            pageSizeOptions: ['20', '50', '100'],
            showSizeChanger: true,
            showTotal: t => `Tổng ${t} nhân viên`,
          }}
          summary={pageData => {
            const tc = pageData.reduce((a, r) => a + (parseFloat(r.tongCong) || 0), 0)
            const dat = pageData.reduce((a, r) => a + (r.soLanDat || 0), 0)
            const kdat = pageData.reduce((a, r) => a + (r.soLanKhongDat || 0), 0)
            const ty = dat + kdat > 0 ? Math.round(dat / (dat + kdat) * 100) : null
            return (
              <Table.Summary fixed="bottom">
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={7} align="right">
                    <strong style={{ color: '#a5f3fc' }}>Tổng trang hiện tại</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="right">
                    <strong style={{ color: '#D0D5DC', fontSize: 13 }}>{tc.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={8} />
                  <Table.Summary.Cell index={9} />
                  <Table.Summary.Cell index={10} align="center">
                    <Space size={4}>
                      <Tag color="success" style={{ marginRight: 0 }}>{dat}</Tag>
                      <span style={{ color: '#a5f3fc' }}>/</span>
                      <Tag color="error" style={{ marginRight: 0 }}>{kdat}</Tag>
                    </Space>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={11}>
                    {ty != null && (
                      <span style={{ color: ty >= 70 ? '#90B8D0' : '#fbbf24', fontWeight: 700 }}>{ty}%</span>
                    )}
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )
          }}
        />
        </div>

        {/* ── Mobile employee cards ── */}
        <div className="eff-mobile-view" style={{ flexDirection: 'column', gap: 8, padding: '8px 10px' }}>
          {loading && <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>}
          {!loading && displayData.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>Không có dữ liệu</div>
          )}
          {displayData.map(r => {
            const dat = r.soLanDat || 0
            const kdat = r.soLanKhongDat || 0
            const total = dat + kdat
            const pct = total > 0 ? Math.round(dat / total * 100) : null
            return (
              <div key={r.maNhanVien} onClick={() => { setDrawerEmployee(r); setDrawerOpen(true) }}
                style={{ background: '#fff', border: '1px solid #e0e7ff', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: '#1D4ED8', fontSize: 14 }}>{r.hoVaTen || r.maNhanVien}</span>
                  <Tag color="cyan" style={{ marginRight: 0, fontWeight: 600, fontSize: 11 }}>{r.maNhanVien}</Tag>
                  {r.toNhom && <Tag color="cyan" style={{ marginRight: 0 }}>{r.toNhom}</Tag>}
                  {r.viTri && <Tag color={r.viTri.toLowerCase().includes('trưởng') ? 'gold' : 'geekblue'} style={{ marginRight: 0, fontSize: 11 }}>{r.viTri}</Tag>}
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, flexWrap: 'wrap', alignItems: 'center', color: '#595959' }}>
                  <span>Ca: <b style={{ color: '#1D4ED8' }}>{r.soCa || 0}</b></span>
                  {(r.soCaTruong || 0) > 0 && <span>Trưởng: <b style={{ color: '#f97316' }}>{r.soCaTruong}</b></span>}
                  <span>Công: <b style={{ color: '#722ed1', fontSize: 14 }}>{Number(r.tongCong || 0).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></span>
                  {r.tongSanLuong != null && <span>SL: <b style={{ color: '#389e0d' }}>{Number(r.tongSanLuong).toLocaleString('vi-VN')}</b></span>}
                  {r.nangSuatTB != null && <span>NS: <b style={{ color: '#1677ff' }}>{Number(r.nangSuatTB).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}</b></span>}
                  {pct != null && <Tag color={pct >= 70 ? 'success' : 'warning'} style={{ marginRight: 0 }}>{pct}% đạt</Tag>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      </div>{/* end efficiency view wrapper */}

      {/* ── Detail drawer ── */}
      <EmployeeDetailDrawer
        open={drawerOpen}
        employee={drawerEmployee}
        employees={employees}
        fromDate={fromDate}
        toDate={toDate}
        periodStr={periodStr}
        onClose={() => setDrawerOpen(false)}
        isAdmin={isAdmin()}
        canEdit={isAdmin() || isNhanVien()}
        onRefreshMain={() => { fetchData(fromDate, toDate, activeGroup); fetchAllEmployees() }}
      />

      {/* ── Edit modal ── */}
      <Modal
        open={editModalOpen}
        title={
          <Space>
            <EditOutlined style={{ color: '#1D4ED8' }} />
            <span>Chỉnh sửa nhân viên</span>
            {editRecord && <Tag color="blue">{editRecord.maNhanVien}</Tag>}
            {editRecord?.hoVaTen && <span style={{ fontWeight: 600, color: '#1D4ED8' }}>{editRecord.hoVaTen}</span>}
          </Space>
        }
        onOk={handleEditSave}
        onCancel={() => setEditModalOpen(false)}
        okText="Lưu"
        cancelText="Huỷ"
        confirmLoading={editSaving}
        width={400}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Tổ / Nhóm" name="toNhom">
            <AutoComplete
              options={ALL_GROUPS.filter(g => g.key).map(g => ({ value: g.key, label: g.key }))}
              placeholder="Chọn hoặc nhập nhóm..."
              allowClear
              filterOption={(input, opt) => opt.value.toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item label="Vị Trí" name="viTri">
            <AutoComplete
              options={[
                'Công nhân', 'Trưởng ca', 'Phó ca', 'Tổ trưởng', 'KCS', 'Kỹ thuật',
              ].map(v => ({ value: v, label: v }))}
              placeholder="Chọn hoặc nhập vị trí..."
              allowClear
              filterOption={(input, opt) => opt.value.toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
