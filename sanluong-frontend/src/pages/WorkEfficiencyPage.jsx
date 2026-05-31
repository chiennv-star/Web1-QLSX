import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Table, Button, Space, Input, Typography, message,
  Tag, Drawer, Spin, Tooltip, Progress, DatePicker, Select, Badge,
  Modal, Form, AutoComplete, InputNumber, Popconfirm
} from 'antd'
import {
  SearchOutlined, ReloadOutlined, SyncOutlined,
  UserOutlined, TrophyOutlined, BarChartOutlined,
  RiseOutlined, FallOutlined, CalendarOutlined, EditOutlined,
  PlusOutlined, DeleteOutlined, ExclamationCircleOutlined
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
      flex: '1 1 160px', minWidth: 140,
      background: '#fff', borderRadius: 10,
      border: `1.5px solid ${accent}22`,
      padding: '10px 18px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    }}>
      <div style={{ fontSize: 11, color: '#888', fontWeight: 500, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ── Employee detail drawer ─────────────────────────────────────────────────────
const VAI_TRO_OPTIONS = ['Trưởng ca', 'Phụ máy', 'Công nhân', 'KCS', 'Kỹ thuật'].map(v => ({ value: v }))

function EmployeeDetailDrawer({ open, employee, fromDate, toDate, periodStr, onClose, isAdmin, onRefreshMain }) {
  const navigate = useNavigate()
  const [sessions,  setSessions]  = useState([])
  const [loading,   setLoading]   = useState(false)
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [editingSession,   setEditingSession]   = useState(null) // null = add
  const [sessionSaving,    setSessionSaving]    = useState(false)
  const [sessionForm] = Form.useForm()

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
      vaiTro: record.vaiTro || '',
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
      title: 'Tiến Trình', dataIndex: 'tenTrinh', key: 'tenTrinh',
      render: (v, r) => {
        if (!v) return <span style={{ color: '#bbb' }}>—</span>
        const nhom = employee?.toNhom || ''
        const stage = nhom.startsWith('PCPL') ? 'PC'
                    : nhom === 'ĐG'           ? 'DG'
                    : nhom === 'BBC1'          ? 'BBC1'
                    : null
        if (!stage) return <span style={{ fontSize: 13 }}>{v}</span>
        const stageLabel = stage === 'PC' ? 'PC' : stage === 'DG' ? 'ĐG' : 'BBC1'
        return (
          <Tooltip title={`Xem trên Lịch Sản Xuất ${stageLabel} →`}>
            <Button
              type="link"
              style={{ padding: 0, height: 'auto', fontSize: 13, textAlign: 'left', whiteSpace: 'normal', color: '#1677ff', fontWeight: 500 }}
              onClick={() => {
                navigate('/work-schedule', {
                  state: {
                    jumpTo: {
                      stage,
                      tienTrinh: v,
                      soLo: r.soLo || '',
                      maSp: r.maSp || '',
                    }
                  }
                })
              }}
            >
              {v}
            </Button>
          </Tooltip>
        )
      }
    },
    {
      title: 'Số Lô', dataIndex: 'soLo', key: 'soLo', width: 88,
      render: v => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#595959' }}>{v || '—'}</span>
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
    ...(isAdmin ? [{
      title: 'Thao Tác', key: 'action', width: 80, align: 'center', fixed: 'right',
      render: (_, r) => (
        <Space size={2}>
          <Tooltip title="Sửa phiên">
            <Button size="small" type="text" icon={<EditOutlined />}
              style={{ color: '#1D4ED8' }} onClick={() => openEdit(r)} />
          </Tooltip>
          <Popconfirm
            title="Xóa phiên này?"
            description="Dữ liệu công và năng suất sẽ được tính lại."
            okText="Xóa" cancelText="Huỷ" okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(r.id)}>
            <Button size="small" type="text" icon={<DeleteOutlined />}
              style={{ color: '#ef4444' }} />
          </Popconfirm>
        </Space>
      )
    }] : []),
  ]

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        width={1300}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <UserOutlined style={{ color: '#4db3d4' }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>{employee?.hoVaTen}</span>
            <Tag color="blue" style={{ fontWeight: 700 }}>{employee?.maNhanVien}</Tag>
            {employee?.toNhom && <Tag color="cyan">{employee.toNhom}</Tag>}
            {periodStr && <Tag color="purple" icon={<CalendarOutlined />}>{periodStr}</Tag>}
            {isAdmin && (
              <Button size="small" type="primary" icon={<PlusOutlined />}
                style={{ marginLeft: 8, background: '#1D4ED8', borderColor: '#1D4ED8' }}
                onClick={openAdd}>
                Thêm phiên
              </Button>
            )}
          </div>
        }
        styles={{ body: { padding: '16px', background: '#fafafe' } }}
      >
        {/* Mini KPI strip */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
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

        <style>{`.eff-detail-table .ant-table-thead > tr > th { background: linear-gradient(90deg, #2980b3 0%, #3399CC 100%) !important; color: #ffffff !important; font-size: 11px !important; text-transform: uppercase; padding: 6px 8px !important; border-right: 1px solid #4db3d4 !important; } .eff-detail-table .ant-table-thead > tr > th::before { display: none !important; }`}</style>

        {loading ? (
          <Spin style={{ display: 'block', margin: '60px auto' }} size="large" />
        ) : (
          <Table
            className="eff-detail-table"
            columns={detailColumns}
            dataSource={sessions}
            rowKey="id"
            size="small"
            scroll={{ x: 1260 }}
            pagination={{ pageSize: 50, showTotal: t => `${t} phiên`, showSizeChanger: false }}
            rowClassName={(_, i) => i % 2 === 0 ? '' : 'row-stripe'}
          />
        )}
      </Drawer>

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
          <Form.Item label="Ngày thực hiện" name="ngay"
            rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Vai Trò" name="vaiTro"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}>
            <AutoComplete options={VAI_TRO_OPTIONS} placeholder="Trưởng ca / Phụ máy / Công nhân..." allowClear />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item label="Công thực hiện" name="congThucHien" style={{ flex: 1 }}
              rules={[{ required: true, message: 'Nhập công TH' }]}>
              <InputNumber min={0} step={0.5} precision={4} style={{ width: '100%' }}
                placeholder="VD: 1.0000" />
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
    </>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function WorkEfficiencyPage() {
  const { isAdmin, allowedEfficiencyTabs } = useAuth()

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

  // Toolbar ref for sticky offset
  const toolbarRef = useRef(null)
  const [toolbarH, setToolbarH] = useState(0)

  useEffect(() => {
    if (!toolbarRef.current) return
    const obs = new ResizeObserver(() => setToolbarH(toolbarRef.current?.offsetHeight || 0))
    obs.observe(toolbarRef.current)
    return () => obs.disconnect()
  }, [])

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

  // KPI tổng hợp
  const kpi = useMemo(() => {
    const filtered = search
      ? data.filter(r =>
          r.hoVaTen?.toLowerCase().includes(search.toLowerCase()) ||
          r.maNhanVien?.toLowerCase().includes(search.toLowerCase()))
      : data
    const tongCong = filtered.reduce((a, r) => a + (parseFloat(r.tongCong) || 0), 0)
    const totalDat = filtered.reduce((a, r) => a + (r.soLanDat || 0), 0)
    const totalKhongDat = filtered.reduce((a, r) => a + (r.soLanKhongDat || 0), 0)
    const tyLe = totalDat + totalKhongDat > 0
      ? Math.round(totalDat / (totalDat + totalKhongDat) * 100) : null
    const top = [...filtered].sort((a, b) => (parseFloat(b.tongCong) || 0) - (parseFloat(a.tongCong) || 0))[0]
    return { count: filtered.length, tongCong, tyLe, top, filtered }
  }, [data, search])

  // Filtered + searched data
  const displayData = kpi.filtered

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
      <style>{`
        /* ERP dark tab bar */
        .eff-tabs > .ant-tabs-nav { background: #1e4570 !important; padding: 0 12px; margin: 0 !important; }
        .eff-tabs > .ant-tabs-nav .ant-tabs-tab { color: #CBD5E1 !important; font-size: 12px; padding: 8px 14px !important; margin: 0 2px !important; border-radius: 4px 4px 0 0; }
        .eff-tabs > .ant-tabs-nav .ant-tabs-tab:hover { color: #fff !important; background: rgba(59,130,246,0.15) !important; }
        .eff-tabs > .ant-tabs-nav .ant-tabs-tab-active { color: #fff !important; font-weight: 700 !important; background: rgba(29,78,216,0.25) !important; box-shadow: 0 -3px 0 #60A5FA inset; }
        .eff-tabs > .ant-tabs-nav .ant-tabs-ink-bar { background: #60A5FA !important; }
        .eff-tabs > .ant-tabs-nav::before { border: none !important; }
        /* ERP blue table header */
        .eff-table .ant-table-thead > tr > th { background: linear-gradient(90deg, #2980b3 0%, #3399CC 100%) !important; color: #ffffff !important; font-size: 11px !important; text-transform: uppercase; padding: 7px 8px !important; letter-spacing: 0.4px; border-right: 1px solid #4db3d4 !important; white-space: nowrap; }
        .eff-table .ant-table-thead > tr > th::before { display: none !important; }
        .eff-table .ant-table-tbody > tr > td { padding: 6px 8px !important; font-size: 12px; vertical-align: middle; }
        .eff-table .ant-table-tbody > tr:hover > td { background: #f5f3ff !important; }
        .eff-table .row-stripe td { background: #fafbff !important; }
        .eff-table .ant-table-column-sort { background: transparent !important; }
      `}</style>

      {/* ── Sticky toolbar ── */}
      <div ref={toolbarRef} style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: '#fff', borderBottom: '2px solid #e0e7ff',
        padding: '8px 0 10px',
      }}>
        {/* Row 1: title + period controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#1E3A5F', whiteSpace: 'nowrap' }}>
            <BarChartOutlined style={{ marginRight: 6, color: '#4db3d4' }} />
            Hiệu quả Công việc
          </span>

          {/* Period type toggle */}
          <div style={{ display: 'flex', border: '1px solid #e0e7ff', borderRadius: 8, overflow: 'hidden' }}>
            {PERIOD_TYPES.map(pt => (
              <button key={pt.key} onClick={() => setPeriodType(pt.key)}
                style={{
                  padding: '4px 14px', border: 'none', cursor: 'pointer', fontSize: 13,
                  background: periodType === pt.key ? '#1D4ED8' : '#fff',
                  color: periodType === pt.key ? '#fff' : '#595959',
                  fontWeight: periodType === pt.key ? 700 : 400,
                  transition: 'all .15s',
                }}>
                {pt.label}
              </button>
            ))}
          </div>

          {/* Period picker */}
          {periodType === 'day' && (
            <DatePicker value={dayValue} onChange={v => v && setDayValue(v)}
              format="DD/MM/YYYY" allowClear={false} size="small" style={{ width: 130 }} />
          )}
          {periodType === 'week' && (
            <DatePicker picker="week" value={weekValue} onChange={v => v && setWeekValue(v)}
              allowClear={false} size="small" style={{ width: 150 }}
              format={v => `${v.startOf('week').format('DD/MM')} – ${v.endOf('week').format('DD/MM/YYYY')}`} />
          )}
          {periodType === 'month' && (
            <DatePicker picker="month" value={monthValue} onChange={v => v && setMonthValue(v)}
              format="MM/YYYY" allowClear={false} size="small" style={{ width: 120 }} />
          )}
          {periodType === 'quarter' && (
            <Space size={6}>
              <DatePicker picker="year" value={dayjs().year(quarterYear)}
                onChange={v => v && setQuarterYear(v.year())}
                allowClear={false} size="small" style={{ width: 80 }} format="YYYY" />
              <Select size="small" value={quarterQ} onChange={setQuarterQ} style={{ width: 120 }}>
                {QUARTER_LABELS.map((lbl, i) => (
                  <Option key={i + 1} value={i + 1}>{lbl}</Option>
                ))}
              </Select>
            </Space>
          )}
          {periodType === 'year' && (
            <DatePicker picker="year" value={yearValue} onChange={v => v && setYearValue(v)}
              allowClear={false} size="small" style={{ width: 80 }} format="YYYY" />
          )}

          <Button size="small" type="primary" icon={<SearchOutlined />}
            onClick={() => fetchData(fromDate, toDate, activeGroup)}>
            Tra cứu
          </Button>
          <Button size="small" icon={<ReloadOutlined />}
            onClick={() => fetchData(fromDate, toDate, activeGroup)} />

          {/* Search */}
          <Input size="small" style={{ width: 200 }} allowClear
            placeholder="Tìm mã NV, họ tên..."
            value={search}
            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            onChange={e => setSearch(e.target.value)} />

          {isAdmin() && selectedRowKeys.length > 0 && (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={bulkDeleting}
              onClick={handleBulkDelete}
            >
              Xóa ({selectedRowKeys.length})
            </Button>
          )}

          {isAdmin() && (
            <Tooltip title="Tạo bản ghi cho nhân viên chưa có dữ liệu">
              <Button size="small" icon={<SyncOutlined />} loading={syncing} onClick={handleSyncAll}>
                Đồng bộ NV
              </Button>
            </Tooltip>
          )}
          {isAdmin() && (
            <Tooltip title="Tính lại năng suất và kết quả đạt/không đạt cho tất cả ca làm việc">
              <Button size="small" icon={<RiseOutlined />} loading={recalculating}
                onClick={handleRecalculateNs} style={{ borderColor: '#1D4ED8', color: '#1D4ED8' }}>
                Tính lại NS
              </Button>
            </Tooltip>
          )}
          {isAdmin() && (
            <Tooltip title="Bổ sung nhóm thực hiện cho ca BBC1 / ĐG / PL còn thiếu (chạy 1 lần sau khi cập nhật)">
              <Button size="small" icon={<SyncOutlined />} loading={fixingNhom}
                onClick={handleFixNhomThucHien} style={{ borderColor: '#f97316', color: '#f97316' }}>
                Đồng bộ Nhóm TH
              </Button>
            </Tooltip>
          )}
          {isAdmin() && (
            <Tooltip title="Khôi phục Mã NV cho các ca bị thiếu (khớp theo tên + nhóm thực hiện)">
              <Button size="small" icon={<SyncOutlined />} loading={fixingMaNv}
                onClick={handleFixNullMaNhanVien} style={{ borderColor: '#dc2626', color: '#dc2626' }}>
                Sửa Mã NV Null
              </Button>
            </Tooltip>
          )}

          {periodStr && (
            <Tag color="purple" icon={<CalendarOutlined />} style={{ fontSize: 12, marginLeft: 'auto' }}>
              Kỳ: {periodStr}
            </Tag>
          )}
        </div>

        {/* Row 2: KPI strip */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <KpiCard label="Nhân sự có hoạt động" value={kpi.count} accent="#4db3d4"
            sub={activeGroup || 'Tất cả nhóm'} />
          <KpiCard label="Tổng công thực hiện" value={kpi.tongCong.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} accent="#722ed1"
            sub="Σ công TH trong kỳ" />
          <KpiCard
            label="Tỷ lệ đạt NS trung bình"
            value={kpi.tyLe != null ? `${kpi.tyLe}%` : '—'}
            accent={kpi.tyLe != null ? (kpi.tyLe >= 70 ? '#748090' : '#f97316') : '#aaa'}
            sub="Đạt / (Đạt + Không đạt)" />
          {kpi.top && (
            <KpiCard
              label="Công nhiều nhất"
              value={kpi.top.hoVaTen?.split(' ').slice(-1)[0] || kpi.top.maNhanVien}
              accent="#f97316"
              sub={`${Number(kpi.top.tongCong || 0).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} công — ${kpi.top.maNhanVien}`} />
          )}
        </div>
      </div>

      {/* ── Group tabs + table ── */}
      <div style={{ marginTop: 10 }}>
        {/* Group tab bar */}
        <div style={{
          display: 'flex', gap: 4, background: '#1e4570',
          padding: '6px 12px 0', borderRadius: '8px 8px 0 0',
        }}>
          {GROUPS.map(g => {
            const cnt = g.key === '' ? data.length : data.filter(r => r.toNhom === g.key).length
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

        <Table
          className="eff-table"
          columns={columns}
          dataSource={displayData}
          rowKey="maNhanVien"
          loading={loading}
          size="small"
          scroll={{ x: 1200 }}
          sticky={{ offsetHeader: toolbarH }}
          rowHoverable={false}
          rowClassName={(_, i) => i % 2 !== 0 ? 'row-stripe' : ''}
          rowSelection={isAdmin() ? {
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            columnWidth: 40,
          } : undefined}
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

      {/* ── Detail drawer ── */}
      <EmployeeDetailDrawer
        open={drawerOpen}
        employee={drawerEmployee}
        fromDate={fromDate}
        toDate={toDate}
        periodStr={periodStr}
        onClose={() => setDrawerOpen(false)}
        isAdmin={isAdmin()}
        onRefreshMain={() => fetchData(fromDate, toDate, activeGroup)}
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
