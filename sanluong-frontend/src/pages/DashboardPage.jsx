import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Table, Button, Space, Input, Select, Tag, Typography,
  Popconfirm, message, Tooltip, Divider, DatePicker,
  Spin, Collapse, Badge, Tabs, Segmented, Dropdown, Modal,
  Drawer, Descriptions, InputNumber
} from 'antd'
import {
  PlusOutlined, SearchOutlined, EditOutlined,
  DeleteOutlined, FileExcelOutlined, ReloadOutlined,
  WarningOutlined, BarChartOutlined, DownOutlined, CalendarOutlined,
  EyeInvisibleOutlined, EyeOutlined, BellOutlined, ExclamationCircleOutlined,
  AccountBookOutlined, UploadOutlined, DownloadOutlined, AppstoreOutlined,
} from '@ant-design/icons'
import { Upload } from 'antd'
import InboxPanel from '../components/InboxPanel'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, Legend,
} from 'recharts'

const { RangePicker } = DatePicker
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const { Option } = Select

const STATUS_COLORS = { done: '#52c41a', doing: '#336666' }
const STATUS_BG     = { done: '#f6ffed', doing: '#e6f2f2' }
const STATUS_BORDER = { done: '#b7eb8f', doing: '#99bbbb' }

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
        <Button size="small" onClick={() => { clearFilters(); confirm() }}>Xóa</Button>
      </Space>
    </div>
  ),
  filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#607080' : undefined }} />,
  onFilter: (value, record) =>
    record[dataIndex]?.toString().toLowerCase().includes(value.toLowerCase()),
})

const colStatus = (dataIndex) => ({
  filters: [
    { text: 'Done',  value: 'done'  },
    { text: 'Doing', value: 'doing' },
    { text: '—',     value: ''      },
  ],
  onFilter: (value, record) => (record[dataIndex] ?? '') === value,
})

const DASHBOARD_STATE_KEY = 'dashboard_page_state'
const SL_SNAPSHOT_KEY = 'sl_value_snapshot'
const SL_SNAPSHOT_TTL = 24 * 60 * 60 * 1000

const cmpDelta = (curr, prev) => {
  const c = parseInt(curr) || 0, p = parseInt(prev) || 0
  if (c > p) return 'up'
  if (c < p) return 'down'
  return null
}
const getDashboardSaved = () => {
  try { return JSON.parse(sessionStorage.getItem(DASHBOARD_STATE_KEY) || 'null') } catch { return null }
}

const StatusTag = ({ value, onClick }) => {
  const handleClick = onClick ? (e) => { e.stopPropagation(); onClick() } : undefined
  if (!value) return (
    <span
      onClick={handleClick}
      style={{
        color: '#bbb', fontSize: 13,
        cursor: onClick ? 'pointer' : 'default',
        padding: '1px 6px',
        borderRadius: 4,
        display: 'inline-block',
        border: onClick ? '1px dashed #d9d9d9' : 'none',
        userSelect: 'none',
      }}
      title={onClick ? 'Nhấn để thêm lịch sản xuất' : undefined}
    >—</span>
  )
  return (
    <span
      onClick={handleClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        display: 'inline-block',
        padding: '1px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.02em',
        color: STATUS_COLORS[value] || '#595959',
        background: STATUS_BG[value] || '#fafafa',
        border: `1px solid ${STATUS_BORDER[value] || '#d9d9d9'}`,
        userSelect: 'none',
      }}
    >
      {value === 'done' ? 'Done' : 'Doing'}
    </span>
  )
}

const fmtNum = v => (v != null && v !== '') ? Number(v).toLocaleString('vi-VN') : '—'

function StageTimelineTab({ filtersRef, searchTick, headerOffset = 120 }) {
  const { isAdminKH, isAdmin } = useAuth()
  const canDelete = isAdmin() || isAdminKH()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [innerView, setInnerView] = useState('bang1')
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchTimeline = async () => {
    const f = filtersRef?.current || {}
    setLoading(true)
    try {
      const params = {}
      if (f.maSp) params.maSp = f.maSp
      if (f.dateRange?.[0]) params.fromDate = f.dateRange[0].format('YYYY-MM-DD')
      if (f.dateRange?.[1]) params.toDate = f.dateRange[1].format('YYYY-MM-DD')
      const { data: res } = await api.get('/work-schedule/stage-timeline', { params })
      setData(res)
    } catch { message.error('Lỗi tải dữ liệu tiến độ') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchTimeline() }, [searchTick])

  const handleDeleteSelected = async () => {
    const selectedRows = data.filter(r => selectedRowKeys.includes(`${r.maSp}|${r.soLo}|${r.tenTrinh || ''}`))
    const ids = selectedRows.flatMap(r => r.ids || [])
    if (!ids.length) return
    setDeleteLoading(true)
    try {
      await api.delete('/work-schedule/bulk', { data: ids })
      message.success(`Đã xóa ${selectedRows.length} sản phẩm`)
      setSelectedRowKeys([])
      fetchTimeline()
    } catch {
      message.error('Xóa thất bại, vui lòng thử lại')
    } finally {
      setDeleteLoading(false)
    }
  }

  const STAGES = ['pc', 'bbc1', 'pl', 'dg', 'cc']
  const STAGE_LABELS = { pc: 'PC', bbc1: 'BBC1', pl: 'PL', dg: 'ĐG', cc: 'CC' }
  const fmtDate = d => d ? dayjs(d).format('DD/MM') : '—'

  // Hoàn thành: cả 4 công đoạn chính (PC/BBC1/PL/ĐG) đều done — CC không tính
  const DONE_STAGES = ['pc', 'bbc1', 'pl', 'dg']
  const filterByStatus = (row, sf) => {
    if (sf === 'all') return true
    if (sf === 'doing') return STAGES.some(s => row[s]?.tinhTrang === 'doing')
    if (sf === 'done')  return DONE_STAGES.every(s => row[s]?.tinhTrang === 'done')
    return true
  }
  const filteredData = data.filter(r => filterByStatus(r, statusFilter))

  const stageColumns = STAGES.map(s => ({
    title: <span style={{ fontWeight: 700 }}>{STAGE_LABELS[s]}</span>,
    key: s,
    children: [
      {
        title: 'BD', key: `${s}_start`, width: 64, align: 'center',
        render: (_, r) => r[s]?.startDate
          ? <span style={{ fontSize: 11 }}>{fmtDate(r[s].startDate)}</span> : <span style={{ color: '#ccc' }}>—</span>
      },
      {
        title: 'KT', key: `${s}_end`, width: 64, align: 'center',
        render: (_, r) => r[s]?.endDate
          ? <span style={{ fontSize: 11 }}>{fmtDate(r[s].endDate)}</span> : <span style={{ color: '#ccc' }}>—</span>
      },
      {
        title: 'Ngày', key: `${s}_days`, width: 58, align: 'center',
        render: (_, r) => {
          const days = r[s]?.soDays
          const tt = r[s]?.tinhTrang
          if (!days) return <span style={{ color: '#ccc' }}>—</span>
          return (
            <Tag color={tt === 'done' ? 'success' : tt === 'doing' ? 'processing' : 'default'}
              style={{ fontSize: 11, padding: '0 5px', margin: 0, cursor: 'default' }}>
              {days}
            </Tag>
          )
        }
      },
      {
        title: 'TT', key: `${s}_tt`, width: 54, align: 'center',
        render: (_, r) => {
          const tt = r[s]?.tinhTrang
          if (!tt) return <span style={{ color: '#ccc' }}>—</span>
          return (
            <Tag
              color={tt === 'done' ? 'success' : 'processing'}
              style={{ fontSize: 10, padding: '0 4px', margin: 0, cursor: 'default', lineHeight: '18px' }}
            >
              {tt === 'done' ? 'Done' : 'Doing'}
            </Tag>
          )
        }
      },
    ]
  }))

  const columns = [
    { title: 'STT', key: 'stt', width: 46, align: 'center', fixed: 'left',
      render: (_, __, idx) => <span style={{ color: '#64748b', fontSize: 11 }}>{idx + 1}</span> },
    { title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', fixed: 'left', width: 95,
      render: v => v ? <Tag color="blue" style={{ fontFamily: 'monospace', marginRight: 0, fontSize: 11 }}>{v}</Tag>
        : <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'Mã SP', dataIndex: 'maSp', key: 'maSp', fixed: 'left', width: 90, ...colSearch('maSp') },
    { title: 'Tên Trình', dataIndex: 'tenTrinh', key: 'tenTrinh', width: 130, ellipsis: true, fixed: 'left', ...colSearch('tenTrinh') },
    { title: 'Số Lô', dataIndex: 'soLo', key: 'soLo', width: 80, ...colSearch('soLo') },
    {
      title: 'Cỡ Lô', dataIndex: 'coLo', key: 'coLo', width: 78, align: 'right',
      render: v => <span style={{ fontWeight: 600 }}>{fmtNum(v)}</span>
    },
    ...stageColumns,
  ]

  const summary = STAGES.map(s => {
    const rows = data.filter(r => r[s]?.soDays > 0)
    const total = rows.reduce((acc, r) => acc + (r[s]?.soDays || 0), 0)
    return {
      stage: STAGE_LABELS[s],
      soSp: rows.length,
      tongNgay: total,
      tbNgay: rows.length > 0 ? (total / rows.length).toFixed(1) : '—',
    }
  })

  const bang2Columns = [
    { title: 'STT', key: 'stt', width: 46, align: 'center', fixed: 'left',
      render: (_, __, idx) => <span style={{ color: '#64748b', fontSize: 11 }}>{idx + 1}</span> },
    { title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', fixed: 'left', width: 95,
      render: v => v ? <Tag color="blue" style={{ fontFamily: 'monospace', marginRight: 0, fontSize: 11 }}>{v}</Tag>
        : <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'Mã SP', dataIndex: 'maSp', key: 'maSp', fixed: 'left', width: 90, ...colSearch('maSp') },
    { title: 'Tên Trình', dataIndex: 'tenTrinh', key: 'tenTrinh', width: 150, ellipsis: true, fixed: 'left', ...colSearch('tenTrinh') },
    { title: 'Số Lô', dataIndex: 'soLo', key: 'soLo', width: 80, ...colSearch('soLo') },
    {
      title: 'Cỡ Lô', dataIndex: 'coLo', key: 'coLo', width: 80, align: 'right',
      render: v => <span style={{ fontWeight: 600 }}>{fmtNum(v)}</span>
    },
    ...STAGES.map(s => ({
      title: <span style={{ fontWeight: 700 }}>{STAGE_LABELS[s]}<br /><span style={{ fontWeight: 400, fontSize: 10 }}>Số ngày</span></span>,
      key: `${s}_days`, width: 80, align: 'center',
      render: (_, r) => {
        const days = r[s]?.soDays
        const tt = r[s]?.tinhTrang
        if (!days) return <span style={{ color: '#ccc' }}>—</span>
        return (
          <Tag color={tt === 'done' ? 'success' : tt === 'doing' ? 'processing' : 'default'}
            style={{ fontSize: 11, padding: '0 5px', margin: 0 }}>
            {days}
          </Tag>
        )
      }
    })),
    {
      title: 'Tổng ngày', key: 'tongNgay', width: 90, align: 'center',
      render: (_, r) => {
        const total = STAGES.reduce((acc, s) => acc + (r[s]?.soDays || 0), 0)
        return total > 0 ? <Tag color="blue" style={{ fontWeight: 700 }}>{total}</Tag> : <span style={{ color: '#ccc' }}>—</span>
      }
    },
  ]

  const rowKey = r => `${r.maSp}|${r.soLo}|${r.tenTrinh || ''}`

  return (
    <div>
      {/* Toggle Bảng 1 / Bảng 2 + đếm kết quả — một hàng nhỏ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
      }}>
        <Space size={8}>
          <Segmented
            size="small"
            value={innerView}
            onChange={v => { setInnerView(v); setSelectedRowKeys([]) }}
            options={[
              { label: 'Bảng 1 — Theo công đoạn', value: 'bang1' },
              { label: 'Bảng 2 — Tổng hợp ngày', value: 'bang2' },
            ]}
          />
          {canDelete && selectedRowKeys.length > 0 && (
            <Popconfirm
              title={`Xóa ${selectedRowKeys.length} sản phẩm đã chọn?`}
              description="Toàn bộ lịch sản xuất (tất cả công đoạn) của các sản phẩm này sẽ bị xóa. Hành động này không thể hoàn tác."
              icon={<ExclamationCircleOutlined style={{ color: '#dc2626' }} />}
              okText="Xóa" cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={handleDeleteSelected}
            >
              <Button size="small" danger icon={<DeleteOutlined />} loading={deleteLoading} style={{ fontWeight: 600 }}>
                Xóa ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
        </Space>
        <Space size={8}>
          <Segmented
            size="small"
            value={statusFilter}
            onChange={v => { setStatusFilter(v); setSelectedRowKeys([]) }}
            options={[
              { label: 'Tất cả', value: 'all' },
              { label: <span style={{ color: '#d46b08' }}>Đang sản xuất</span>, value: 'doing' },
              { label: <span style={{ color: '#389e0d' }}>Hoàn thành</span>, value: 'done' },
            ]}
          />
          <Typography.Text style={{ color: '#64748b', fontSize: 12 }}>
            {filteredData.length} / {data.length} sản phẩm
          </Typography.Text>
        </Space>
      </div>

      {innerView === 'bang1' ? (
        <Table
          className="prod-table"
          columns={columns}
          dataSource={filteredData}
          rowKey={rowKey}
          loading={loading}
          size="small"
          scroll={{ x: 1200 }}
          bordered
          rowHoverable={false}
          sticky={{ offsetHeader: headerOffset }}
          pagination={{ pageSize: 1000, pageSizeOptions: ['100', '500', '1000'], showSizeChanger: true, showTotal: t => `Tổng ${t} sản phẩm`, size: 'small' }}
          rowSelection={canDelete ? { selectedRowKeys, onChange: setSelectedRowKeys } : undefined}
        />
      ) : (
        <Table
          className="prod-table"
          columns={bang2Columns}
          dataSource={filteredData}
          rowKey={rowKey}
          loading={loading}
          size="small"
          scroll={{ x: 900 }}
          bordered
          rowHoverable={false}
          sticky={{ offsetHeader: headerOffset }}
          pagination={{ pageSize: 1000, pageSizeOptions: ['100', '500', '1000'], showSizeChanger: true, showTotal: t => `Tổng ${t} sản phẩm`, size: 'small' }}
          rowSelection={canDelete ? { selectedRowKeys, onChange: setSelectedRowKeys } : undefined}
        />
      )}
    </div>
  )
}

// ── TienDoTab — bảng tiến độ rút gọn ─────────────────────────────────────────
function TienDoTab({ filtersRef, searchTick, headerOffset = 120 }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [textSearch, setTextSearch] = useState('')

  const STAGES = ['pc', 'bbc1', 'pl', 'dg', 'cc']
  const STAGE_LABELS = { pc: 'PC', bbc1: 'BBC1', pl: 'PL', dg: 'ĐG', cc: 'CC' }

  // Hoàn thành: cả 4 công đoạn chính (PC/BBC1/PL/ĐG) đều done — CC không tính
  const DONE_STAGES = ['pc', 'bbc1', 'pl', 'dg']
  const filterByStatus = (row, sf) => {
    if (sf === 'all') return true
    if (sf === 'doing') return STAGES.some(s => row[s]?.tinhTrang === 'doing')
    if (sf === 'done')  return DONE_STAGES.every(s => row[s]?.tinhTrang === 'done')
    return true
  }

  const fetchData = async () => {
    const f = filtersRef?.current || {}
    setLoading(true)
    try {
      const params = {}
      if (f.maSp) params.maSp = f.maSp
      if (f.dateRange?.[0]) params.fromDate = f.dateRange[0].format('YYYY-MM-DD')
      if (f.dateRange?.[1]) params.toDate = f.dateRange[1].format('YYYY-MM-DD')
      const { data: res } = await api.get('/work-schedule/stage-timeline', { params })
      setData(res)
    } catch { message.error('Lỗi tải dữ liệu tiến độ') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [searchTick])

  const rowKey = r => `${r.maSp}|${r.soLo}|${r.tenTrinh || ''}`

  const stageGroups = STAGES.map(s => ({
    title: <span style={{ fontWeight: 700 }}>{STAGE_LABELS[s]}</span>,
    key: s,
    align: 'center',
    onHeaderCell: () => ({ style: { background: '#006666', color: '#fff', textAlign: 'center' } }),
    children: [
      {
        title: 'Ngày', key: `${s}_days`, width: 62, align: 'center',
        onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
        render: (_, r) => {
          const days = r[s]?.soDays
          const tt = r[s]?.tinhTrang
          if (!days) return <span style={{ color: '#d9d9d9' }}>—</span>
          return (
            <Tag color={tt === 'done' ? 'success' : tt === 'doing' ? 'processing' : 'default'}
              style={{ fontSize: 11, padding: '0 5px', margin: 0, minWidth: 28, textAlign: 'center' }}>
              {days}
            </Tag>
          )
        },
      },
      {
        title: 'TT', key: `${s}_tt`, width: 62, align: 'center',
        onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
        render: (_, r) => {
          const tt = r[s]?.tinhTrang
          if (!tt) return <span style={{ color: '#d9d9d9' }}>—</span>
          return (
            <Tag color={tt === 'done' ? 'success' : 'processing'}
              style={{ fontSize: 10, padding: '0 4px', margin: 0, lineHeight: '18px' }}>
              {tt === 'done' ? 'Done' : 'Doing'}
            </Tag>
          )
        },
      },
    ],
  }))

  const filteredData = data.filter(r => {
    if (!filterByStatus(r, statusFilter)) return false
    if (textSearch.trim()) {
      const q = textSearch.trim().toLowerCase()
      return (r.tenTrinh || '').toLowerCase().includes(q)
        || (r.maSp || '').toLowerCase().includes(q)
        || (r.soLo || '').toLowerCase().includes(q)
        || (r.maBravo || '').toLowerCase().includes(q)
    }
    return true
  }).slice().sort((a, b) => {
    const ta = STAGES.reduce((acc, s) => acc + (a[s]?.soDays || 0), 0)
    const tb = STAGES.reduce((acc, s) => acc + (b[s]?.soDays || 0), 0)
    return tb - ta
  })

  const columns = [
    { title: 'STT', key: 'stt', width: 46, align: 'center', fixed: 'left',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: (_, __, idx) => <span style={{ color: '#64748b', fontSize: 11 }}>{idx + 1}</span> },
    { title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', fixed: 'left', width: 95,
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: v => v ? <Tag color="blue" style={{ fontFamily: 'monospace', marginRight: 0, fontSize: 11 }}>{v}</Tag>
        : <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'Mã SP', dataIndex: 'maSp', key: 'maSp', fixed: 'left', width: 88,
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: v => <b style={{ color: '#1d4ed8', fontSize: 12 }}>{v}</b> },
    { title: 'Tên sản phẩm', dataIndex: 'tenTrinh', key: 'tenTrinh', width: 190, ellipsis: true, fixed: 'left',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: v => <span style={{ fontSize: 12 }}>{v || '—'}</span> },
    { title: 'Số Lô', dataIndex: 'soLo', key: 'soLo', width: 80,
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
    { title: 'Cỡ Lô', dataIndex: 'coLo', key: 'coLo', width: 76, align: 'center',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff', textTransform: 'none' } }),
      render: v => <span>{fmtNum(v)}</span> },
    ...stageGroups,
    {
      title: 'Tổng ngày', key: 'tongNgay', width: 88, align: 'center', fixed: 'right',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: (_, r) => {
        const total = STAGES.reduce((acc, s) => acc + (r[s]?.soDays || 0), 0)
        return total > 0
          ? <Tag color="blue" style={{ fontWeight: 700, fontSize: 12 }}>{total}</Tag>
          : <span style={{ color: '#d9d9d9' }}>—</span>
      },
    },
  ]
  const stageTotals = STAGES.reduce((acc, s) => {
    acc[s] = filteredData.reduce((sum, r) => sum + (r[s]?.soDays || 0), 0)
    return acc
  }, {})
  const grandTotal = STAGES.reduce((sum, s) => sum + stageTotals[s], 0)

  return (
    <div>
      <style>{`
        .tiendo-table .ant-table-thead > tr > th { background: #006666 !important; color: #fff !important; font-weight: 700 !important; font-size: 11px !important; padding: 6px 6px !important; text-align: center !important; text-transform: none !important; border-right: 1px solid rgba(255,255,255,0.35) !important; }
        .tiendo-table .ant-table-thead > tr > th::before { display: none !important; }
        .tiendo-table .ant-table-tbody > tr > td { border-right: 1px solid #e2e8f0 !important; border-bottom: 1px solid #e8edf3 !important; }
        .tiendo-table .ant-table-tbody > tr:nth-child(even) > td { background: #f8fffe !important; }
        .tiendo-table .ant-table-tbody > tr:hover > td { background: #e0f7fa !important; }
        .tiendo-table .ant-table-summary > tr > td { background: #e6f7f7 !important; font-weight: 700; border-right: 1px solid #b2dfdb !important; }
      `}</style>
      <div style={{ padding: '6px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Segmented
          size="small"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: 'Tất cả', value: 'all' },
            { label: <span style={{ color: '#d46b08' }}>Đang sản xuất</span>, value: 'doing' },
            { label: <span style={{ color: '#389e0d' }}>Hoàn thành</span>, value: 'done' },
          ]}
        />
        <Input
          size="small"
          placeholder="Tên SP / Mã SP / Số lô…"
          allowClear
          value={textSearch}
          onChange={e => setTextSearch(e.target.value)}
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          style={{ width: 220 }}
        />
        <Typography.Text style={{ color: '#64748b', fontSize: 12, marginLeft: 'auto' }}>{filteredData.length} / {data.length} sản phẩm</Typography.Text>
      </div>
      <Table
        className="tiendo-table"
        columns={columns}
        dataSource={filteredData}
        rowKey={rowKey}
        loading={loading}
        size="small"
        scroll={{ x: 900 }}
        bordered
        sticky={{ offsetHeader: headerOffset }}
        pagination={{ pageSize: 1000, pageSizeOptions: ['100', '500', '1000'], showSizeChanger: true, showTotal: t => `Tổng ${t} sản phẩm`, size: 'small' }}
        summary={() => (
          <Table.Summary.Row style={{ fontWeight: 700 }}>
            <Table.Summary.Cell index={0} colSpan={6} align="center">
              <b style={{ color: '#0d7377' }}>TỔNG THỜI GIAN</b>
            </Table.Summary.Cell>
            {STAGES.flatMap((s, i) => [
              <Table.Summary.Cell key={`${s}_d`} index={6 + i * 2} align="center">
                <Tag color="cyan" style={{ fontWeight: 700 }}>{stageTotals[s] || '—'}</Tag>
              </Table.Summary.Cell>,
              <Table.Summary.Cell key={`${s}_t`} index={7 + i * 2} align="center">
                <span style={{ color: '#888', fontSize: 11 }}>—</span>
              </Table.Summary.Cell>,
            ])}
            <Table.Summary.Cell index={6 + STAGES.length * 2} align="center">
              <Tag color="blue" style={{ fontWeight: 700, fontSize: 12 }}>{grandTotal || '—'}</Tag>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </div>
  )
}

// ── SanLuongKeToanTab ──────────────────────────────────────────────────────────
function SanLuongKeToanTab({ data = [], loading = false, pagination = {}, onPaginationChange,
  doneData = [], doneLoading = false, donePagination = {}, onDonePaginationChange,
  headerOffset = 120, nhapKhoMap = {} }) {
  const mkNkKey = (r) => (r.maBravo || '') + '|' + (r.lsx || '')
  const getNkVal  = (r) => nhapKhoMap[mkNkKey(r)] ?? (r.tpNhapKho ?? 0)
  const [subTab, setSubTab] = useState('doing')

  const fmtCong = v => v != null ? Number(v).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '—'
  const fmtN = v => (v != null && v !== '') ? Number(v).toLocaleString('vi-VN') : '—'

  const stageTag = (val) => {
    if (!val) return <span style={{ color: '#d9d9d9' }}>—</span>
    const done = val === 'done'
    return (
      <span style={{ display: 'inline-block', padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 700,
        color: done ? '#389e0d' : '#d46b08',
        background: done ? '#f0fdf4' : '#fff7e6',
        border: `1px solid ${done ? '#b7eb8f' : '#ffd591'}`,
      }}>
        {done ? 'done' : 'doing'}
      </span>
    )
  }

  const columns = [
    { title: 'STT', key: 'stt', width: 52, fixed: 'left', align: 'center',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: (_, __, idx) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{idx + 1}</span> },
    { title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 105, fixed: 'left',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: v => v ? <span style={{ color: '#1d4ed8' }}>{v}</span> : '—' },
    { title: 'Mã SP', dataIndex: 'maTp', key: 'maTp', width: 95, fixed: 'left',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: v => v ? <span style={{ color: '#595959' }}>{v}</span> : '—' },
    { title: 'Tên sản phẩm', dataIndex: 'tienTrinh', key: 'tienTrinh', width: 210, fixed: 'left',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: v => <span>{v || '—'}</span> },
    { title: 'Mã lô SP', dataIndex: 'lsx', key: 'lsx', width: 145, align: 'center',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: v => v ? <span style={{ fontFamily: 'monospace', color: '#595959' }}>{v}</span> : '—' },
    { title: 'Ngày SX', dataIndex: 'createdAt', key: 'ngaySx', width: 90, align: 'center',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: v => v ? <span style={{ fontSize: 11 }}>{dayjs(v).format('DD/MM/YYYY')}</span> : '—' },
    { title: 'Số Lượng', dataIndex: 'soLuong', key: 'soLuong', width: 90, align: 'center',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: v => <span style={{ color: '#1d4ed8' }}>{fmtN(v)}</span> },
    { title: 'GIAI ĐOẠN', align: 'center',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff', textAlign: 'center' } }),
      children: [
        { title: 'PC',   dataIndex: 'pcTrangThai',   key: 'pc_tt',   width: 80, align: 'center',
          onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }), render: stageTag },
        { title: 'PL',   dataIndex: 'plTrangThai',   key: 'pl_tt',   width: 80, align: 'center',
          onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }), render: stageTag },
        { title: 'ĐG',   dataIndex: 'dgTrangThai',   key: 'dg_tt',   width: 80, align: 'center',
          onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }), render: stageTag },
        { title: 'BBC1', dataIndex: 'bbc1TrangThai', key: 'bbc1_tt', width: 80, align: 'center',
          onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }), render: stageTag },
      ] },
    { title: 'SP Trung Gian', dataIndex: 'pcPl', key: 'spTrungGian', width: 100, align: 'center',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: fmtN },
    { title: 'Tổng BTP', dataIndex: 'dg2', key: 'tongBtp', width: 90, align: 'center',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: v => <span style={{ color: '#389e0d' }}>{fmtN(v)}</span> },
    { title: 'CÔNG CÁC CÔNG ĐOẠN', align: 'center',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff', textAlign: 'center' } }),
      children: [
        { title: 'GNNL', dataIndex: 'temDb',     key: 'temDb',     width: 75, align: 'center',
          onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }), render: fmtCong },
        { title: 'BBC1', dataIndex: 'bbc1_3',    key: 'bbc1_3c',   width: 75, align: 'center',
          onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }), render: fmtCong },
        { title: 'PC',   dataIndex: 'pcChiPhi',  key: 'pcChiPhi',  width: 75, align: 'center',
          onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }), render: fmtCong },
        { title: 'PL',   dataIndex: 'plChiPhi',  key: 'plChiPhi',  width: 75, align: 'center',
          onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }), render: fmtCong },
        { title: 'ĐG',   dataIndex: 'dgChiPhi',  key: 'dgChiPhi',  width: 75, align: 'center',
          onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }), render: fmtCong },
      ] },
    { title: 'BTP Chờ ĐG', dataIndex: 'doDangDg', key: 'doDangDg', width: 100, align: 'center',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: fmtN },
    { title: 'TP Nhập Kho', key: 'tpNhapKho', width: 100, align: 'center',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: (_, r) => <span style={{ color: '#389e0d' }}>{fmtN(getNkVal(r))}</span> },
    { title: 'Chênh lệch BTP/Nhập kho', key: 'chenhLech', width: 140, align: 'center', fixed: 'right',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: (_, r) => {
        const cl = (parseInt(r.dg2) || 0) - getNkVal(r)
        return <span style={{ color: cl !== 0 ? '#cf1322' : '#389e0d' }}>{fmtN(cl)}</span>
      } },
  ]

  const activeData       = subTab === 'done' ? doneData       : data
  const activeLoading    = subTab === 'done' ? doneLoading    : loading
  const activePagination = subTab === 'done' ? donePagination : pagination
  const activeOnChange   = subTab === 'done' ? onDonePaginationChange : onPaginationChange

  return (
    <div>
      <style>{`
        .ketoan-table .ant-table-thead > tr > th { background: #006666 !important; color: #fff !important; font-weight: 700 !important; font-size: 11px !important; padding: 7px 8px !important; text-align: center !important; border-right: 1px solid rgba(255,255,255,0.35) !important; border-bottom: 1px solid rgba(255,255,255,0.35) !important; }
        .ketoan-table .ant-table-thead > tr > th::before { display: none !important; }
        .ketoan-table .ant-table-tbody > tr:nth-child(odd) > td  { background: #fff !important; }
        .ketoan-table .ant-table-tbody > tr:nth-child(even) > td { background: #f8faff !important; }
        .ketoan-table .ant-table-tbody > tr:hover > td { background: #e0f2fe !important; }
        .ketoan-table .ant-table-tbody > tr > td { border-right: 1px solid #e2e8f0 !important; border-bottom: 1px solid #e8edf3 !important; font-weight: 400 !important; font-size: 12px !important; }
        .ketoan-table .ant-table-tbody > tr:hover .ant-table-cell-fix-left,
        .ketoan-table .ant-table-tbody > tr:hover .ant-table-cell-fix-right { background: #e0f2fe !important; }
      `}</style>

      <Tabs
        activeKey={subTab}
        onChange={setSubTab}
        size="small"
        style={{ padding: '0 12px' }}
        items={[
          { key: 'doing', label: <span>⚙️ Đang thực hiện <Badge count={pagination.total || data.length} showZero style={{ background: '#1d4ed8', fontSize: 10 }} /></span> },
          { key: 'done',  label: <span>✅ Đã hoàn thành <Badge count={donePagination.total || doneData.length} showZero style={{ background: '#16a34a', fontSize: 10 }} /></span> },
        ]}
      />

      <Table
        className="ketoan-table"
        columns={columns}
        dataSource={activeData}
        rowKey="id"
        loading={activeLoading}
        size="small"
        scroll={{ x: 1900 }}
        sticky={{ offsetHeader: headerOffset }}
        pagination={{
          ...activePagination,
          size: 'small',
          showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100'],
          showTotal: t => `Tổng ${t} bản ghi`,
          onChange: activeOnChange,
        }}
      />
    </div>
  )
}

// ── Hiệu suất tab ────────────────────────────────────────────────────────────
function HieuSuatTab({ data = [], loading = false, pagination = {}, onPaginationChange,
  doneData = [], doneLoading = false, donePagination = {}, onDonePaginationChange,
  headerOffset = 120, nhapKhoMap = {} }) {
  const getNkHoVal = (r) => nhapKhoMap[(r.maBravo || '') + '|' + (r.lsx || '')] ?? (r.tpNhapKho ?? 0)
  const { isAdmin, isAdminKH, user } = useAuth()
  const canEditNote = () => ['ADMIN', 'ADMIN_KH', 'ADMIN_PL', 'ADMIN_DG'].includes(user?.role)
  const [subTab, setSubTab] = useState('doing')
  const [sortField, setSortField] = useState('hs_pl')
  const [sortOrder, setSortOrder] = useState('descend')
  const [editingNote, setEditingNote] = useState({}) // { [id]: string }
  const [savingNote, setSavingNote]   = useState({})

  const saveNote = async (id, text) => {
    setSavingNote(s => ({ ...s, [id]: true }))
    try {
      await api.patch(`/production/${id}/ghi-chu-hieu-suat`, { ghiChu: text })
      setEditingNote(s => { const n = { ...s }; delete n[id]; return n })
    } catch { message.error('Lưu ghi chú thất bại') }
    finally { setSavingNote(s => ({ ...s, [id]: false })) }
  }

  const trangThaiTag = (v) => {
    if (v === 'done')  return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:10, fontSize:11, fontWeight:700, color:'#16a34a', background:'#f0fdf4', border:'1px solid #86efac' }}>Done</span>
    if (v === 'doing') return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:10, fontSize:11, fontWeight:700, color:'#0369a1', background:'#eff6ff', border:'1px solid #93c5fd' }}>Doing</span>
    return <span style={{ color:'#d9d9d9', fontSize:11 }}>—</span>
  }

  const calcHs = (r) => {
    const slPl      = parseInt(r.pcPl)   || 0
    const slDg      = parseInt(r.dg2)    || 0
    const qaPl      = r.plQaLayMau || 0
    const qaDg      = r.dgQaLayMau || 0
    const nkho      = getNkHoVal(r)
    const coLo      = r.soLuong || 0
    const hsPl      = coLo > 0 ? ((slPl + qaPl) / coLo * 100) : null
    const hsDg      = slPl > 0 ? ((slDg + qaDg) / slPl * 100) : null
    const hsTong    = coLo > 0 ? ((nkho + qaPl + qaDg) / coLo * 100) : null
    return { slPl, slDg, qaPl, qaDg, nkho, coLo, hsPl, hsDg, hsTong }
  }

  const hsColor = (v) => v == null ? '#bbb' : v >= 99 ? '#16a34a' : v >= 95 ? '#d46b08' : '#cf1322'
  const hsBg    = (v) => v == null ? '#f5f5f5' : v >= 99 ? '#f6ffed' : v >= 95 ? '#fff7e6' : '#fff1f0'
  const hsBdr   = (v) => v == null ? '#d9d9d9' : v >= 99 ? '#95de64' : v >= 95 ? '#ffd591' : '#ffa39e'
  const hsFill  = (v) => v == null ? '#e5e7eb' : v >= 99 ? '#52c41a' : v >= 95 ? '#fa8c16' : '#ff4d4f'

  const ProgressBar = ({ value }) => {
    if (value == null) return <span style={{ color: '#bbb', fontSize: 12 }}>—</span>
    const capped = Math.min(value, 110)
    const over   = value > 100
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 14, background: '#f0f0f0', borderRadius: 7, overflow: 'hidden', minWidth: 80 }}>
            <div style={{
              height: '100%', width: `${Math.min(capped / 110 * 100, 100)}%`,
              background: hsFill(value), borderRadius: 7,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <span style={{
            fontWeight: 800, fontSize: 13, minWidth: 52, textAlign: 'right',
            color: hsColor(value),
          }}>
            {value.toFixed(1)}%{over && <span style={{ fontSize: 10, marginLeft: 2, color: '#722ed1' }}>↑</span>}
          </span>
        </div>
      </div>
    )
  }

  const activeData       = subTab === 'done' ? doneData       : data
  const activeLoading    = subTab === 'done' ? doneLoading    : loading
  const activePagination = subTab === 'done' ? donePagination : pagination
  const activeOnChange   = subTab === 'done' ? onDonePaginationChange : onPaginationChange

  const enriched = activeData.map(r => ({ ...r, ...calcHs(r) }))

  // Thống kê phân bố
  const stats = (field) => {
    const vals = enriched.map(r => r[field]).filter(v => v != null)
    if (!vals.length) return null
    const good = vals.filter(v => v >= 99).length
    const mid  = vals.filter(v => v >= 95 && v < 99).length
    const bad  = vals.filter(v => v < 95).length
    const avg  = vals.reduce((a, b) => a + b, 0) / vals.length
    return { good, mid, bad, avg, total: vals.length }
  }

  const stPl   = stats('hsPl')
  const stDg   = stats('hsDg')
  const stTong = stats('hsTong')

  const columns = [
    {
      title: '#', width: 42, align: 'center', fixed: 'left',
      render: (_, __, idx) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{idx + 1}</span>,
    },
    {
      title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 105, fixed: 'left',
      ...colSearch('maBravo'),
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: v => v ? <span style={{ color: '#1d4ed8', fontWeight: 700, fontFamily: 'monospace', fontSize: 12 }}>{v}</span> : '—',
    },
    {
      title: 'Tên sản phẩm', dataIndex: 'tienTrinh', key: 'tienTrinh', width: 220,
      ...colSearch('tienTrinh'),
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: v => <Tooltip title={v}><span style={{ fontSize: 12 }}>{v || '—'}</span></Tooltip>,
    },
    {
      title: 'LSX', dataIndex: 'lsx', key: 'lsx', width: 80, align: 'center',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: v => <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#595959' }}>{v || '—'}</span>,
    },
    {
      title: 'Cỡ lô', dataIndex: 'soLuong', key: 'soLuong', width: 80, align: 'right',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: v => <span style={{ color: '#1d4ed8', fontWeight: 600, fontSize: 12 }}>{v ? Number(v).toLocaleString('vi-VN') : '—'}</span>,
    },
    {
      title: 'TT PL', dataIndex: 'plTrangThai', key: 'plTrangThai', width: 80, align: 'center',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      filters: [{ text: 'Done', value: 'done' }, { text: 'Doing', value: 'doing' }],
      onFilter: (v, r) => r.plTrangThai === v,
      render: trangThaiTag,
    },
    {
      title: 'TT ĐG', dataIndex: 'dgTrangThai', key: 'dgTrangThai', width: 80, align: 'center',
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      filters: [{ text: 'Done', value: 'done' }, { text: 'Doing', value: 'doing' }],
      onFilter: (v, r) => r.dgTrangThai === v,
      render: trangThaiTag,
    },
    {
      title: 'Hiệu suất PL', key: 'hs_pl', width: 220,
      sorter: (a, b) => (a.hsPl ?? -1) - (b.hsPl ?? -1),
      sortOrder: sortField === 'hs_pl' ? sortOrder : undefined,
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: (_, r) => (
        <div style={{
          background: hsBg(r.hsPl), border: `1px solid ${hsBdr(r.hsPl)}`,
          borderRadius: 6, padding: '5px 10px',
        }}>
          <ProgressBar value={r.hsPl} />
          {r.hsPl != null && (
            <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
              ({Number(r.slPl).toLocaleString('vi-VN')} + {Number(r.qaPl).toLocaleString('vi-VN')}) / {Number(r.coLo).toLocaleString('vi-VN')}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Hiệu suất ĐG', key: 'hs_dg', width: 220,
      sorter: (a, b) => (a.hsDg ?? -1) - (b.hsDg ?? -1),
      sortOrder: sortField === 'hs_dg' ? sortOrder : undefined,
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: (_, r) => (
        <div style={{
          background: hsBg(r.hsDg), border: `1px solid ${hsBdr(r.hsDg)}`,
          borderRadius: 6, padding: '5px 10px',
        }}>
          <ProgressBar value={r.hsDg} />
          {r.hsDg != null && (
            <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
              ({Number(r.slDg).toLocaleString('vi-VN')} + {Number(r.qaDg).toLocaleString('vi-VN')}) / {Number(r.slPl).toLocaleString('vi-VN')}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Hiệu suất tổng', key: 'hs_tong', width: 220,
      sorter: (a, b) => (a.hsTong ?? -1) - (b.hsTong ?? -1),
      sortOrder: sortField === 'hs_tong' ? sortOrder : undefined,
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: (_, r) => (
        <div style={{
          background: hsBg(r.hsTong), border: `1px solid ${hsBdr(r.hsTong)}`,
          borderRadius: 6, padding: '5px 10px',
        }}>
          <ProgressBar value={r.hsTong} />
          {r.hsTong != null && (
            <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
              ({Number(r.nkho).toLocaleString('vi-VN')} + {Number(r.qaPl + r.qaDg).toLocaleString('vi-VN')}) / {Number(r.coLo).toLocaleString('vi-VN')}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Ghi chú', key: 'ghiChu', width: 220,
      onHeaderCell: () => ({ style: { background: '#006666', color: '#fff' } }),
      render: (_, r) => {
        const isEditing = r.id in editingNote
        const canEdit   = canEditNote()
        if (isEditing) {
          return (
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
              <Input.TextArea
                autoFocus
                rows={2}
                size="small"
                value={editingNote[r.id]}
                onChange={e => setEditingNote(s => ({ ...s, [r.id]: e.target.value }))}
                onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); saveNote(r.id, editingNote[r.id]) } }}
                style={{ fontSize: 12, resize: 'none', flex: 1 }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button size="small" type="primary" loading={savingNote[r.id]}
                  style={{ background: '#006666', borderColor: '#006666', fontSize: 11, padding: '0 6px' }}
                  onClick={() => saveNote(r.id, editingNote[r.id])}>Lưu</Button>
                <Button size="small" style={{ fontSize: 11, padding: '0 6px' }}
                  onClick={() => setEditingNote(s => { const n = { ...s }; delete n[r.id]; return n })}>Hủy</Button>
              </div>
            </div>
          )
        }
        return (
          <div
            onClick={() => canEdit && setEditingNote(s => ({ ...s, [r.id]: r.ghiChuHieuSuat || '' }))}
            style={{
              minHeight: 32, padding: '4px 8px', borderRadius: 5, fontSize: 12,
              border: canEdit ? '1px dashed #d9d9d9' : 'none',
              cursor: canEdit ? 'text' : 'default',
              color: r.ghiChuHieuSuat ? '#374151' : '#bbb',
              background: r.ghiChuHieuSuat ? '#fefce8' : 'transparent',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}
          >
            {r.ghiChuHieuSuat || (canEdit ? <span style={{ fontSize: 11 }}>Nhấn để thêm ghi chú…</span> : '—')}
          </div>
        )
      },
    },
  ]

  const StatBand = ({ label, s, color }) => !s ? null : (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
      <span style={{ fontWeight: 700, color, fontSize: 13, minWidth: 90 }}>{label}</span>
      <span style={{ color: '#16a34a', fontSize: 12 }}>✅ {s.good} đạt</span>
      <span style={{ color: '#d46b08', fontSize: 12 }}>⚠ {s.mid} gần đạt</span>
      <span style={{ color: '#cf1322', fontSize: 12 }}>❌ {s.bad} chưa đạt</span>
      <span style={{ color: '#888', fontSize: 12, marginLeft: 4 }}>| TB: <strong style={{ color }}>{s.avg.toFixed(1)}%</strong></span>
    </div>
  )

  return (
    <div>
      <style>{`
        .hs-table .ant-table-thead > tr > th { font-size: 12px; padding: 7px 10px; white-space: nowrap; background: #006666 !important; color: #fff !important; }
        .hs-table .ant-table-thead > tr > th::before { display: none !important; }
        .hs-table .ant-table-tbody > tr > td { padding: 5px 8px; vertical-align: middle; }
        .hs-table .ant-table-tbody > tr:hover > td { background: #f8fafc !important; }
      `}</style>

      {/* Sub-tab selector */}
      <Tabs
        activeKey={subTab}
        onChange={key => { setSubTab(key); setSortField('hs_pl'); setSortOrder('descend') }}
        size="small"
        style={{ padding: '0 12px' }}
        items={[
          { key: 'doing', label: <span>⚙️ Đang thực hiện <Badge count={pagination.total || data.length} showZero style={{ background: '#1d4ed8', fontSize: 10 }} /></span> },
          { key: 'done',  label: <span>✅ Đã hoàn thành <Badge count={donePagination.total || doneData.length} showZero style={{ background: '#16a34a', fontSize: 10 }} /></span> },
        ]}
      />

      {/* Summary banner */}
      <div style={{ display: 'flex', gap: 10, padding: '10px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
        <StatBand label="Hiệu suất PL" s={stPl} color="#15803d" />
        <StatBand label="Hiệu suất ĐG" s={stDg} color="#b45309" />
        <StatBand label="Hiệu suất tổng" s={stTong} color="#7c3aed" />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#94a3b8' }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#52c41a', marginRight: 4 }} />≥ 99%</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#fa8c16', marginRight: 4 }} />95–99%</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#ff4d4f', marginRight: 4 }} />{'< 95%'}</span>
        </div>
      </div>

      <Table
        className="hs-table"
        columns={columns}
        dataSource={enriched}
        rowKey="id"
        loading={activeLoading}
        size="small"
        scroll={{ x: 900 }}
        sticky={{ offsetHeader: headerOffset }}
        rowClassName={(r) => {
          const minHs = Math.min(r.hsPl ?? 999, r.hsDg ?? 999)
          if (minHs < 95)  return 'row-alt'
          return ''
        }}
        onChange={(_, __, sorter) => {
          if (sorter?.field || sorter?.columnKey) {
            setSortField(sorter.columnKey || sorter.field)
            setSortOrder(sorter.order || 'descend')
          }
        }}
        pagination={{
          ...activePagination,
          size: 'small',
          showSizeChanger: true,
          pageSizeOptions: ['100', '500', '1000'],
          showTotal: t => `Tổng ${t} bản ghi`,
          style: { margin: '8px 0 0' },
          onChange: activeOnChange,
        }}
      />
    </div>
  )
}

// ── ProductionOverview — tab Tổng quan ───────────────────────────────────────
function ProductionOverview({ data, doneTotal, deltaMap = {}, getNhapKho }) {
  const fmtN = v => v ? Number(v).toLocaleString('vi-VN') : '0'
  const pct  = (a, b) => b > 0 ? Math.min(100, Math.round(a / b * 100)) : 0

  // ── KPI ──────────────────────────────────────────────────────────────────
  const totalKH      = data.reduce((s, r) => s + (r.soLuong || 0), 0)
  const hangLoiCount = data.filter(r => Number(r.hlSoLuongTraVe) > 0).length
  const totalSlPc    = data.reduce((s, r) => s + (parseInt(r.slPc)   || 0), 0)
  const totalSlPl    = data.reduce((s, r) => s + (parseInt(r.pcPl)   || 0), 0)
  const totalSlDg    = data.reduce((s, r) => s + (parseInt(r.dg2)    || 0), 0)
  const totalSlBbc1  = data.reduce((s, r) => s + (parseInt(r.bbc1_2) || 0), 0)
  const ddPc   = data.reduce((s, r) => s + Math.max(0, (r.soLuong||0) - (parseInt(r.slPc)||0)), 0)
  const ddPl   = data.reduce((s, r) => s + Math.max(0, (parseInt(r.slPc)||0) - (parseInt(r.pcPl)||0)), 0)
  const ddDg   = data.reduce((s, r) => s + Math.max(0, (parseInt(r.pcPl)||0) - (parseInt(r.dg2)||0)), 0)
  const ddBbc1 = data.reduce((s, r) => s + Math.max(0, (r.soLuong||0) - (parseInt(r.bbc1_2)||0)), 0)

  // ── Nhập kho ─────────────────────────────────────────────────────────────
  const nhapKhoRows = getNhapKho
    ? data.map(r => ({ ...r, _nk: getNhapKho(r) })).filter(r => r._nk > 0)
    : data.filter(r => (r.tpNhapKho ?? 0) > 0).map(r => ({ ...r, _nk: r.tpNhapKho }))
  const totalNhapKho   = nhapKhoRows.reduce((s, r) => s + r._nk, 0)
  const nhapKhoRecent  = [...nhapKhoRows].sort((a, b) => b._nk - a._nk).slice(0, 8)

  // ── Delta (thay đổi) per stage ────────────────────────────────────────────
  const stageFields = [
    { key: 'PC',   field: 'slPc',   label: 'PC',   accent: '#1d4ed8' },
    { key: 'PL',   field: 'pcPl',   label: 'PL',   accent: '#7c3aed' },
    { key: 'ĐG',   field: 'dg2',    label: 'ĐG',   accent: '#d48806' },
    { key: 'BBC1', field: 'bbc1_2', label: 'BBC1', accent: '#16a34a' },
  ]
  const deltaStats = stageFields.map(s => ({
    ...s,
    tang:  data.filter(r => deltaMap[r.id]?.[s.field] === 'up').length,
    giam:  data.filter(r => deltaMap[r.id]?.[s.field] === 'down').length,
  }))
  const totalTang = deltaStats.reduce((s, d) => s + d.tang, 0)
  const totalGiam = deltaStats.reduce((s, d) => s + d.giam, 0)

  // ── Trạng thái per tổ ────────────────────────────────────────────────────
  const pcpl1Doing = data.filter(r => r.pcpl1TrangThai === 'doing').length
  const pcpl1Done  = data.filter(r => r.pcpl1TrangThai === 'done').length
  const pcpl2Doing = data.filter(r => r.pcpl2TrangThai === 'doing').length
  const pcpl2Done  = data.filter(r => r.pcpl2TrangThai === 'done').length
  const plDoing    = data.filter(r => r.plTrangThai    === 'doing').length
  const plDone     = data.filter(r => r.plTrangThai    === 'done').length
  const dgDoing    = data.filter(r => r.dgTrangThai    === 'doing').length
  const dgDone     = data.filter(r => r.dgTrangThai    === 'done').length
  const bbc1Doing  = data.filter(r => r.bbc1TrangThai  === 'doing').length
  const bbc1Done   = data.filter(r => r.bbc1TrangThai  === 'done').length

  const pcPct   = pct(totalSlPc,   totalKH)
  const plPct   = pct(totalSlPl,   totalKH)
  const dgPct   = pct(totalSlDg,   totalKH)
  const bbc1Pct = pct(totalSlBbc1, totalKH)
  const overallPct = totalKH > 0 ? Math.round((pcPct + plPct + dgPct + bbc1Pct) / 4) : 0

  // ── Phân tích trạng thái lô ──────────────────────────────────────────────
  const hasAnyDoing = r => ['pcpl1TrangThai','pcpl2TrangThai','plTrangThai','dgTrangThai','bbc1TrangThai'].some(k => r[k] === 'doing')
  const hasAnyDone  = r => ['pcpl1TrangThai','pcpl2TrangThai','plTrangThai','dgTrangThai','bbc1TrangThai'].some(k => r[k] === 'done')
  const hasAnyStage = r => hasAnyDoing(r) || hasAnyDone(r)

  const loAngSX       = data.filter(r => hasAnyDoing(r)).length
  const loSapHoanThanh= data.filter(r => !hasAnyDoing(r) && hasAnyDone(r)).length
  const loChuaBatDau  = data.filter(r => !hasAnyStage(r)).length
  const total         = data.length

  // ── Phân tích theo tổ thực hiện ──────────────────────────────────────────
  const toStats = [
    { key: 'PCPL1', label: 'PCPL1', accent: '#3b82f6', doing: pcpl1Doing, done: pcpl1Done },
    { key: 'PCPL2', label: 'PCPL2', accent: '#6366f1', doing: pcpl2Doing, done: pcpl2Done },
    { key: 'PL',    label: 'PL',    accent: '#7c3aed', doing: plDoing,    done: plDone    },
    { key: 'ĐG',    label: 'ĐG',    accent: '#d48806', doing: dgDoing,    done: dgDone    },
    { key: 'BBC1',  label: 'BBC1',  accent: '#16a34a', doing: bbc1Doing,  done: bbc1Done  },
  ]

  // ── Cảnh báo bất thường ──────────────────────────────────────────────────
  const warnings = []

  const loChuaBatDauList = data.filter(r => !hasAnyStage(r))
  if (loChuaBatDauList.length > 0)
    warnings.push({ level: 'warn', icon: '⏸', label: 'Chưa bắt đầu bất kỳ công đoạn nào', count: loChuaBatDauList.length, color: '#d48806', bg: '#fffbeb', border: '#fde68a' })

  const loBtpChoNhieu = data.filter(r => (parseInt(r.slPc)||0) > 0 && (parseInt(r.pcPl)||0) === 0)
  if (loBtpChoNhieu.length > 0)
    warnings.push({ level: 'warn', icon: '📦', label: 'BTP sau PC chưa chuyển sang PL', count: loBtpChoNhieu.length, sl: loBtpChoNhieu.reduce((s, r) => s + Math.max(0, (parseInt(r.slPc)||0) - (parseInt(r.pcPl)||0)), 0), color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe' })

  const loBtpChoDg = data.filter(r => (parseInt(r.pcPl)||0) > 0 && (parseInt(r.dg2)||0) === 0)
  if (loBtpChoDg.length > 0)
    warnings.push({ level: 'info', icon: '🔬', label: 'BTP sau PL chưa qua ĐG', count: loBtpChoDg.length, sl: loBtpChoDg.reduce((s, r) => s + Math.max(0, (parseInt(r.pcPl)||0) - (parseInt(r.dg2)||0)), 0), color: '#d48806', bg: '#fffbeb', border: '#fde68a' })

  if (hangLoiCount > 0)
    warnings.push({ level: 'error', icon: '⚠️', label: 'Có hàng lỗi cần xử lý', count: hangLoiCount, color: '#dc2626', bg: '#fff1f2', border: '#fecdd3' })

  const loSlLechCao = data.filter(r => {
    const pc = parseInt(r.slPc)||0; const pl = parseInt(r.pcPl)||0
    return pc > 0 && pl > 0 && Math.abs(pc - pl) > pc * 0.15
  })
  if (loSlLechCao.length > 0)
    warnings.push({ level: 'info', icon: '📊', label: 'SL lệch >15% giữa PC và PL', count: loSlLechCao.length, color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' })

  // ── Sub-components ────────────────────────────────────────────────────────
  const KpiCard = ({ label, value, sub, bg, badge, icon }) => (
    <div style={{ flex: 1, background: bg, borderRadius: 10, padding: '10px 16px', color: '#fff', textAlign: 'center', minWidth: 100, position: 'relative' }}>
      {badge != null && badge > 0 && (
        <span style={{ position: 'absolute', top: 7, right: 10, background: 'rgba(255,255,255,0.25)', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '1px 7px' }}>{badge}%</span>
      )}
      {icon && <div style={{ fontSize: 18, marginBottom: 2, opacity: 0.9 }}>{icon}</div>}
      <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.85, letterSpacing: '0.05em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.15 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, opacity: 0.75, marginTop: 2 }}>{sub}</div>}
    </div>
  )

  const TtBadge = ({ count, type }) => !count ? null : (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '1px 6px', borderRadius: 999, fontSize: 11, fontWeight: 700,
      background: type === 'doing' ? '#eff6ff' : '#f0fdf4',
      color: type === 'doing' ? '#1d4ed8' : '#16a34a',
      border: `1px solid ${type === 'doing' ? '#bfdbfe' : '#bbf7d0'}`,
    }}>
      {type === 'doing' ? '⚙' : '✓'} {count}
    </span>
  )

  const ProgressBar = ({ value, color, thin }) => (
    <div style={{ height: thin ? 4 : 5, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden', margin: thin ? '3px 0' : '4px 0 2px' }}>
      <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 999, transition: 'width 0.4s ease' }} />
    </div>
  )

  const StageCard = ({ label, doing1, done1, doing2, done2, sl, dd, kh, slColor, accent, tang, giam }) => {
    const progress = pct(sl, kh)
    const doneLo   = (doing2 !== undefined ? pcpl1Done + pcpl2Done : done1)
    const doingLo  = (doing2 !== undefined ? pcpl1Doing + pcpl2Doing : doing1)
    const totalLo  = doingLo + doneLo
    return (
      <div style={{ flex: 1, background: '#fff', borderRadius: 10, border: `1.5px solid ${accent}22`, borderTop: `3px solid ${accent}`, padding: '8px 12px', minWidth: 130 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: accent, letterSpacing: '0.05em' }}>{label}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: progress >= 80 ? '#16a34a' : progress >= 50 ? '#d48806' : '#dc2626', background: progress >= 80 ? '#f0fdf4' : progress >= 50 ? '#fffbeb' : '#fff1f2', padding: '1px 7px', borderRadius: 999, border: `1px solid ${progress >= 80 ? '#bbf7d0' : progress >= 50 ? '#fed7aa' : '#fecdd3'}` }}>{progress}%</span>
        </div>
        {doing2 !== undefined ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 4 }}>
            {[['PCPL1', doing1, done1], ['PCPL2', doing2, done2]].map(([lbl, d, dn]) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ fontSize: 10, color: '#94a3b8', width: 38, flexShrink: 0 }}>{lbl}</span>
                <TtBadge count={d} type="doing" />
                <TtBadge count={dn} type="done" />
                {!d && !dn && <span style={{ fontSize: 11, color: '#cbd5e1' }}>—</span>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 4, marginBottom: 4, minHeight: 24, alignItems: 'center' }}>
            <TtBadge count={doing1} type="doing" />
            <TtBadge count={done1} type="done" />
            {!doing1 && !done1 && <span style={{ fontSize: 11, color: '#cbd5e1' }}>—</span>}
          </div>
        )}
        <ProgressBar value={progress} color={accent} />
        <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, marginBottom: 1 }}>SL thực tế</div>
            <div style={{ fontWeight: 800, fontSize: 12, color: slColor }}>{fmtN(sl)}</div>
          </div>
          <div style={{ width: 1, background: '#f1f5f9', flexShrink: 0 }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, marginBottom: 1 }}>Tồn (dở dang)</div>
            <div style={{ fontWeight: 800, fontSize: 12, color: dd > 0 ? '#d48806' : '#94a3b8' }}>{fmtN(dd)}</div>
          </div>
          <div style={{ width: 1, background: '#f1f5f9', flexShrink: 0 }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, marginBottom: 1 }}>Lô/Tổng</div>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#475569' }}>{doneLo}<span style={{ color: '#94a3b8', fontWeight: 400 }}>/{totalLo || data.length}</span></div>
          </div>
        </div>
        {(tang > 0 || giam > 0) && (
          <div style={{ display: 'flex', gap: 4, marginTop: 5, paddingTop: 5, borderTop: '1px dashed #f1f5f9' }}>
            {tang > 0 && <span style={{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', borderRadius: 4, padding: '2px 0' }}>▲ +{tang} lô</span>}
            {giam > 0 && <span style={{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fff1f2', borderRadius: 4, padding: '2px 0' }}>▼ -{giam} lô</span>}
          </div>
        )}
      </div>
    )
  }

  // ── Section header ────────────────────────────────────────────────────────
  const SectionLabel = ({ children, accent }) => (
    <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8, borderLeft: `3px solid ${accent || '#94a3b8'}`, paddingLeft: 6 }}>{children}</div>
  )

  return (
    <div style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e8f5f0 100%)', padding: '12px 14px 14px' }}>

      {/* ── Row 1: KPI ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <KpiCard label="ĐANG SẢN XUẤT"  value={data.length}        sub="lô"           bg="#006666"  icon="🏭" />
        <KpiCard label="TỔNG KẾ HOẠCH"  value={fmtN(totalKH)}      sub="sản phẩm"     bg="#1d4ed8"  badge={overallPct} icon="📋" />
        <KpiCard label="ĐÃ HOÀN THÀNH"  value={doneTotal}           sub="lô done"      bg="#16a34a"  icon="✅" />
        <KpiCard label="ĐÃ NHẬP KHO"    value={nhapKhoRows.length}  sub={`${fmtN(totalNhapKho)} SP`} bg="#0891b2" icon="📦" />
        <KpiCard label="CÓ HÀNG LỖI"    value={hangLoiCount}        sub="lô"           bg={hangLoiCount > 0 ? '#dc2626' : '#94a3b8'} icon="⚠️" />
      </div>

      {/* ── Row 2: Stage cards ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <StageCard label="PC"   doing1={pcpl1Doing} done1={pcpl1Done} doing2={pcpl2Doing} done2={pcpl2Done} sl={totalSlPc}   dd={ddPc}   kh={totalKH} slColor="#1d4ed8" accent="#1d4ed8" tang={deltaStats[0].tang} giam={deltaStats[0].giam} />
        <StageCard label="PL"   doing1={plDoing}    done1={plDone}                                          sl={totalSlPl}   dd={ddPl}   kh={totalKH} slColor="#7c3aed" accent="#7c3aed" tang={deltaStats[1].tang} giam={deltaStats[1].giam} />
        <StageCard label="ĐG"   doing1={dgDoing}    done1={dgDone}                                          sl={totalSlDg}   dd={ddDg}   kh={totalKH} slColor="#d48806" accent="#d48806" tang={deltaStats[2].tang} giam={deltaStats[2].giam} />
        <StageCard label="BBC1" doing1={bbc1Doing}  done1={bbc1Done}                                        sl={totalSlBbc1} dd={ddBbc1} kh={totalKH} slColor="#16a34a" accent="#16a34a" tang={deltaStats[3].tang} giam={deltaStats[3].giam} />
      </div>

      {/* ── Row 3: Báo cáo tổng hợp công đoạn ── */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '10px 14px', marginBottom: 10 }}>
        <SectionLabel accent="#1d4ed8">Báo cáo tổng hợp theo công đoạn</SectionLabel>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Công đoạn', 'SL thực tế', 'Tồn (dở dang)', '% hoàn thành', 'Tăng (lô)', 'Giảm (lô)', 'Lô đang làm', 'Lô xong'].map((h, i) => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: i === 0 ? 'left' : 'right', fontWeight: 700, color: '#475569', fontSize: 11, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'PC',   sl: totalSlPc,   dd: ddPc,   p: pcPct,   tang: deltaStats[0].tang, giam: deltaStats[0].giam, doing: pcpl1Doing+pcpl2Doing, done: pcpl1Done+pcpl2Done, accent: '#1d4ed8' },
                { label: 'PL',   sl: totalSlPl,   dd: ddPl,   p: plPct,   tang: deltaStats[1].tang, giam: deltaStats[1].giam, doing: plDoing,                done: plDone,               accent: '#7c3aed' },
                { label: 'ĐG',   sl: totalSlDg,   dd: ddDg,   p: dgPct,   tang: deltaStats[2].tang, giam: deltaStats[2].giam, doing: dgDoing,                done: dgDone,               accent: '#d48806' },
                { label: 'BBC1', sl: totalSlBbc1, dd: ddBbc1, p: bbc1Pct, tang: deltaStats[3].tang, giam: deltaStats[3].giam, doing: bbc1Doing,              done: bbc1Done,             accent: '#16a34a' },
              ].map((row, i) => (
                <tr key={row.label} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                  <td style={{ padding: '7px 10px' }}>
                    <span style={{ fontWeight: 800, color: row.accent, fontSize: 12 }}>{row.label}</span>
                  </td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: row.accent }}>{fmtN(row.sl)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, color: row.dd > 0 ? '#d48806' : '#94a3b8' }}>{fmtN(row.dd)}</span>
                  </td>
                  <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      <div style={{ width: 60, height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${row.p}%`, background: row.p >= 80 ? '#16a34a' : row.p >= 50 ? '#d48806' : '#dc2626', borderRadius: 999 }} />
                      </div>
                      <span style={{ fontWeight: 700, color: row.p >= 80 ? '#16a34a' : row.p >= 50 ? '#d48806' : '#dc2626', minWidth: 32 }}>{row.p}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                    {row.tang > 0 ? <span style={{ color: '#16a34a', fontWeight: 700 }}>▲ {row.tang}</span> : <span style={{ color: '#d9d9d9' }}>—</span>}
                  </td>
                  <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                    {row.giam > 0 ? <span style={{ color: '#dc2626', fontWeight: 700 }}>▼ {row.giam}</span> : <span style={{ color: '#d9d9d9' }}>—</span>}
                  </td>
                  <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                    {row.doing > 0 ? <span style={{ fontWeight: 600, color: '#1d4ed8', background: '#eff6ff', borderRadius: 4, padding: '1px 6px', fontSize: 11 }}>⚙ {row.doing}</span> : <span style={{ color: '#d9d9d9' }}>—</span>}
                  </td>
                  <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                    {row.done > 0 ? <span style={{ fontWeight: 600, color: '#16a34a', background: '#f0fdf4', borderRadius: 4, padding: '1px 6px', fontSize: 11 }}>✓ {row.done}</span> : <span style={{ color: '#d9d9d9' }}>—</span>}
                  </td>
                </tr>
              ))}
              <tr style={{ background: '#f0f5ff', borderTop: '2px solid #dbeafe' }}>
                <td style={{ padding: '6px 10px', fontWeight: 800, color: '#1e3a5f', fontSize: 11 }}>TỔNG</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: '#1e3a5f' }}>{fmtN(totalSlPc + totalSlPl + totalSlDg + totalSlBbc1)}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: '#d48806' }}>{fmtN(ddPc + ddPl + ddDg + ddBbc1)}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: '#1e3a5f' }}>{overallPct}%</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>{totalTang > 0 ? `▲ ${totalTang}` : '—'}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>{totalGiam > 0 ? `▼ ${totalGiam}` : '—'}</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Row 4: Nhập kho gần đây + Trạng thái lô + Hoạt động tổ ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>

        {/* Nhập kho gần đây */}
        <div style={{ flex: 1.6, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '10px 12px', minWidth: 0 }}>
          <SectionLabel accent="#0891b2">
            Sản phẩm mới nhập kho
            {nhapKhoRows.length > 0 && <span style={{ marginLeft: 6, background: '#e0f7fa', color: '#0891b2', borderRadius: 999, padding: '0 6px', fontSize: 10, fontWeight: 700 }}>{nhapKhoRows.length} lô · {fmtN(totalNhapKho)} SP</span>}
          </SectionLabel>
          {nhapKhoRecent.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>Chưa có lô nào nhập kho</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Mã Bravo', 'Mã TP', 'Tên sản phẩm', 'LSX', 'SL nhập kho'].map((h, i) => (
                    <th key={h} style={{ padding: '4px 6px', textAlign: i === 4 ? 'right' : 'left', fontWeight: 700, color: '#64748b', fontSize: 10, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nhapKhoRecent.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f8fafc', background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                    <td style={{ padding: '4px 6px', fontFamily: 'monospace', fontWeight: 700, color: '#0369a1', fontSize: 11 }}>{r.maBravo || '—'}</td>
                    <td style={{ padding: '4px 6px', color: '#475569' }}>{r.maTp || '—'}</td>
                    <td style={{ padding: '4px 6px', color: '#1e293b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.tienTrinh || '—'}</td>
                    <td style={{ padding: '4px 6px', fontFamily: 'monospace', color: '#64748b' }}>{r.lsx || '—'}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 800, color: '#0891b2' }}>{fmtN(r._nk)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Trạng thái lô + Per-tổ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>

          {/* Trạng thái lô */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '10px 12px' }}>
            <SectionLabel>Trạng thái lô ({total} lô)</SectionLabel>
            {[
              { label: 'Đang thực hiện',             count: loAngSX,         color: '#1d4ed8', icon: '⚙' },
              { label: 'Chờ hoàn thành',              count: loSapHoanThanh,  color: '#16a34a', icon: '✅' },
              { label: 'Chưa bắt đầu công đoạn nào', count: loChuaBatDau,    color: '#94a3b8', icon: '⏸' },
            ].map(row => {
              const w = total > 0 ? Math.round(row.count / total * 100) : 0
              return (
                <div key={row.label} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: 11, color: '#475569' }}>{row.icon} {row.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: row.color }}>{row.count} <span style={{ fontSize: 10, fontWeight: 500, color: '#94a3b8' }}>({w}%)</span></span>
                  </div>
                  <ProgressBar value={w} color={row.color} thin />
                </div>
              )
            })}
          </div>

          {/* Per-tổ breakdown */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '10px 12px', flex: 1 }}>
            <SectionLabel>Hoạt động theo tổ</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {toStats.map(t => {
                const active = t.doing + t.done
                return (
                  <div key={t.key} style={{ flex: '1 0 60px', textAlign: 'center', background: `${t.accent}08`, border: `1px solid ${t.accent}22`, borderRadius: 8, padding: '5px 4px' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: t.accent, marginBottom: 3 }}>{t.label}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginBottom: 3, flexWrap: 'wrap' }}>
                      {t.doing > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', borderRadius: 999, padding: '1px 4px', border: '1px solid #bfdbfe' }}>⚙{t.doing}</span>}
                      {t.done  > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: '#f0fdf4', color: '#16a34a', borderRadius: 999, padding: '1px 4px', border: '1px solid #bbf7d0' }}>✓{t.done}</span>}
                      {!active && <span style={{ fontSize: 10, color: '#cbd5e1' }}>—</span>}
                    </div>
                    <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{active} lô</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 5: Cảnh báo bất thường ── */}
      {warnings.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '10px 12px' }}>
          <SectionLabel accent="#dc2626">Cảnh báo bất thường ({warnings.length})</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {warnings.map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, background: w.bg, border: `1px solid ${w.border}`, borderRadius: 8, padding: '6px 12px', flexShrink: 0 }}>
                <span style={{ fontSize: 14 }}>{w.icon}</span>
                <div>
                  <div style={{ fontSize: 11, color: w.color, fontWeight: 700 }}>{w.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    <strong>{w.count}</strong> lô
                    {w.sl != null && <> · dở dang <strong>{fmtN(w.sl)}</strong> SP</>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {warnings.length === 0 && data.length > 0 && (
        <div style={{ background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>✅</span>
          <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>Không phát hiện bất thường trong {total} lô đang sản xuất</span>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { isAdmin, isAdminKH, canEditProduction, isStageAdmin, getAllowedNhom, getAllowedStages } = useAuth()
  const getRowJumpStage = () => {
    const nhom = getAllowedNhom()
    if (nhom) return nhom
    const stages = getAllowedStages()
    return stages?.[0] ?? null
  }
  const navigate = useNavigate()
  const location = useLocation()
  const toolbarRef = useRef(null)
  const tabsWrapRef = useRef(null)
  const [toolbarH, setToolbarH] = useState(0)
  const [tabBarH, setTabBarH] = useState(42)
  const headerOffset = toolbarH + tabBarH
  const [statsOpen, setStatsOpen] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [inboxCount, setInboxCount] = useState(0)
  const [activeTab, setActiveTab] = useState('list')
  const [selectedId, setSelectedId] = useState(null)
  const [ctxMenu, setCtxMenu] = useState({ visible: false, x: 0, y: 0, record: null })
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkDelLoading, setBulkDelLoading] = useState(false)

  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [deltaMap, setDeltaMap] = useState({})
  const [hangLoiMap, setHangLoiMap] = useState({})
  const [nhapKhoMap, setNhapKhoMap] = useState({})
  const [qaMap, setQaMap] = useState({})

  // Tab "Đã hoàn thành"
  const [doneData, setDoneData] = useState([])
  const [doneLoading, setDoneLoading] = useState(false)
  const [donePagination, setDonePagination] = useState({ current: 1, pageSize: 1000, total: 0 })
  const donePaginationRef = useRef({ current: 1, pageSize: 1000 })

  // Tab "Tổng kế hồ sơ"
  const [hoSoData, setHoSoData] = useState([])
  const [hoSoLoading, setHoSoLoading] = useState(false)
  const [hoSoPagination, setHoSoPagination] = useState({ current: 1, pageSize: 1000, total: 0 })
  const hoSoPaginationRef = useRef({ current: 1, pageSize: 1000 })

  // Tab "Hiệu suất" — trang độc lập, 1000 rows/page
  const [hsData, setHsData] = useState([])
  const [hsLoading, setHsLoading] = useState(false)
  const [hsPagination, setHsPagination] = useState({ current: 1, pageSize: 1000, total: 0 })
  const hsPaginationRef = useRef({ current: 1, pageSize: 1000 })

  // Tab "Tổng hợp sản lượng"
  const [thData, setThData] = useState([])
  const [thLoading, setThLoading] = useState(false)
  const [thPagination, setThPagination] = useState({ current: 1, pageSize: 3000, total: 0 })
  const thPaginationRef = useRef({ current: 1, pageSize: 3000 })
  const [thFilters, setThFilters] = useState({ maBravo: '', maTp: '', lsx: '', loaiSanPham: '', toThucHien: '' })

  // Tab "Phân Bố Sản Phẩm" — product master map
  const [pmMap, setPmMap] = useState({})
  const [pmLoading, setPmLoading] = useState(false)

  const [statsMonth, setStatsMonth] = useState(null)
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // ── Timeline filter state (dùng chung filter bar) ──────────────
  const [timelineFilters, setTimelineFilters] = useState({ maSp: '', dateRange: null })
  const timelineFiltersRef = useRef({ maSp: '', dateRange: null })
  const [timelineSearchTick, setTimelineSearchTick] = useState(0)

  const handleTimelineSearch = () => {
    timelineFiltersRef.current = { ...timelineFilters }
    setTimelineSearchTick(t => t + 1)
  }
  const handleTimelineReset = () => {
    const empty = { maSp: '', dateRange: null }
    setTimelineFilters(empty)
    timelineFiltersRef.current = empty
    setTimelineSearchTick(t => t + 1)
  }

  const jumpInit = location.state?.jumpTo || null
  const backJump = location.state?.backJump || null
  const jumpAny = jumpInit || backJump
  // Khôi phục trạng thái khi quay lại (backJump hoặc navigate(-1) không có jumpInit)
  const savedState = !jumpInit ? getDashboardSaved() : null
  const [highlightKey] = useState(jumpAny ? { maBravo: jumpAny.maBravo, tienTrinh: jumpAny.tienTrinh, lsx: jumpAny.soLo } : null)
  const jumpApplied = useRef(false)

  const [filters, setFilters] = useState(
    jumpInit ? {
      maTp: jumpInit.maTp || '',
      maBravo: jumpInit.maBravo || '',
      tienTrinh: jumpInit.tienTrinh || '',
      lsx: jumpInit.soLo || '',
      trangThai: ''
    } : savedState?.filters || {
      maTp: '', maBravo: '', tienTrinh: '', lsx: '', trangThai: ''
    }
  )

  const [pagination, setPagination] = useState({
    current: savedState?.page || 1,
    pageSize: savedState?.pageSize || 1000,
    total: 0
  })
  const paginationRef = useRef({ current: savedState?.page || 1, pageSize: savedState?.pageSize || 1000 })

  useEffect(() => {
    if (toolbarRef.current) setToolbarH(toolbarRef.current.offsetHeight)
    if (tabsWrapRef.current) {
      const nav = tabsWrapRef.current.querySelector('.ant-tabs-nav')
      if (nav) setTabBarH(nav.offsetHeight)
    }
  })

  useEffect(() => {
    if (jumpAny) navigate(location.pathname, { replace: true, state: {} })
  }, [])

  useEffect(() => {
    if (!highlightKey || jumpApplied.current || data.length === 0) return
    const match = data.find(r =>
      (highlightKey.maBravo && r.maBravo === highlightKey.maBravo) ||
      (
        (r.tienTrinh || '').trim() === (highlightKey.tienTrinh || '').trim() &&
        (r.lsx || '') === (highlightKey.lsx || '')
      )
    )
    if (match) {
      jumpApplied.current = true
      setTimeout(() => {
        document.getElementById(`prod-row-${match.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 250)
    }
  }, [data])

  const fetchStats = async (monthVal) => {
    if (!monthVal) return
    setStatsLoading(true)
    try {
      const month = monthVal.format('MM')
      const year = monthVal.format('YY')
      const { data: res } = await api.get('/work-schedule/monthly-stats', { params: { month, year } })
      setStats(res)
    } catch {
      message.error('Không thể tải thống kê')
    } finally {
      setStatsLoading(false)
    }
  }

  const parseLsx = (lsx) => {
    if (!lsx || lsx.length !== 6) return 0
    const yy = lsx.slice(4, 6), mm = lsx.slice(2, 4), dd = lsx.slice(0, 2)
    return parseInt(`${yy}${mm}${dd}`, 10)
  }

  const fetchNhapKhoMap = useCallback(async () => {
    try {
      const { data: res } = await api.get('/production/nhap-kho-tong-hop')
      const map = {}
      ;(res || []).forEach(r => { map[(r.maBravo || '') + '|' + (r.lsx || '')] = r.totalNhapKho || 0 })
      setNhapKhoMap(map)
    } catch { /* non-blocking */ }
  }, [])

  const getNhapKho = useCallback((r) => {
    const fromMap = nhapKhoMap[(r.maBravo || '') + '|' + (r.lsx || '')]
    return fromMap || (r.tpNhapKho ?? 0)
  }, [nhapKhoMap])

  const fetchQaMap = useCallback(async (rows) => {
    const maBravos = [...new Set(rows.map(r => r.maBravo).filter(Boolean))]
    if (maBravos.length === 0) return
    try {
      const { data: res } = await api.post('/work-schedule/qa-batch', maBravos)
      setQaMap(prev => ({ ...prev, ...(res || {}) }))
    } catch { /* non-blocking */ }
  }, [])

  const fetchHangLoi = useCallback(async (rows) => {
    const pairs = rows
      .filter(r => r.maTp && r.lsx)
      .map(r => ({ maTp: r.maTp, soLo: r.lsx }))
    if (pairs.length === 0) { setHangLoiMap({}); return }
    try {
      const { data: res } = await api.post('/hang-loi/batch-summary', pairs)
      setHangLoiMap(res || {})
    } catch { /* non-blocking */ }
  }, [])

  const fetchData = useCallback(async (page = 0, size = 20, f = filters, { silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const params = { page, size, ...f, hoanThanh: false }
      const { data: res } = await api.get('/production', { params })
      const sorted = [...res.content].sort((a, b) => parseLsx(b.lsx) - parseLsx(a.lsx))
      setData(sorted)
      setPagination(p => ({ ...p, total: res.totalElements }))
      fetchHangLoi(sorted)
      fetchQaMap(sorted)
    } catch {
      message.error('Không thể tải dữ liệu')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [filters, fetchHangLoi, fetchQaMap])

  const fetchDoneData = useCallback(async (page = 0, size = 1000, f = filters, { silent = false } = {}) => {
    if (!silent) setDoneLoading(true)
    try {
      const params = { page, size, ...f, hoanThanh: true }
      const { data: res } = await api.get('/production', { params })
      const sorted = [...res.content].sort((a, b) => parseLsx(b.lsx) - parseLsx(a.lsx))
      setDoneData(sorted)
      setDonePagination(p => ({ ...p, total: res.totalElements }))
      fetchQaMap(sorted)
    } catch {
      message.error('Không thể tải dữ liệu đã hoàn thành')
    } finally {
      if (!silent) setDoneLoading(false)
    }
  }, [filters, fetchQaMap])

  const fetchHoSoData = useCallback(async (page = 0, size = 1000, f = filters, { silent = false } = {}) => {
    if (!silent) setHoSoLoading(true)
    try {
      const params = { page, size, ...f, hoSoHoanThien: true }
      const { data: res } = await api.get('/production', { params })
      const sorted = [...res.content].sort((a, b) => parseLsx(b.lsx) - parseLsx(a.lsx))
      setHoSoData(sorted)
      setHoSoPagination(p => ({ ...p, total: res.totalElements }))
      fetchQaMap(sorted)
    } catch {
      message.error('Không thể tải dữ liệu tổng kế hồ sơ')
    } finally {
      if (!silent) setHoSoLoading(false)
    }
  }, [filters, fetchQaMap])

  const fetchHsData = useCallback(async (page = 0, size = 1000, f = filters, { silent = false } = {}) => {
    if (!silent) setHsLoading(true)
    try {
      const params = { page, size, ...f, hoanThanh: false }
      const { data: res } = await api.get('/production', { params })
      const sorted = [...res.content].sort((a, b) => parseLsx(b.lsx) - parseLsx(a.lsx))
      setHsData(sorted)
      setHsPagination(p => ({ ...p, total: res.totalElements }))
    } catch {
      message.error('Không thể tải dữ liệu hiệu suất')
    } finally {
      if (!silent) setHsLoading(false)
    }
  }, [filters])

  const fetchThData = useCallback(async (page = 0, size = 3000, f = thFilters) => {
    setThLoading(true)
    try {
      const params = { page, size, ...f }
      const { data: res } = await api.get('/san-luong-tong-hop', { params })
      setThData(res.content)
      setThPagination(p => ({ ...p, total: res.totalElements, current: page + 1, pageSize: size }))
    } catch {
      message.error('Không thể tải dữ liệu tổng hợp sản lượng')
    } finally {
      setThLoading(false)
    }
  }, [thFilters])

  useEffect(() => {
    paginationRef.current = { current: pagination.current, pageSize: pagination.pageSize }
    sessionStorage.setItem(DASHBOARD_STATE_KEY, JSON.stringify({
      filters, page: pagination.current, pageSize: pagination.pageSize
    }))
  }, [filters, pagination.current, pagination.pageSize])

  useEffect(() => {
    donePaginationRef.current = { current: donePagination.current, pageSize: donePagination.pageSize }
  }, [donePagination.current, donePagination.pageSize])

  const loadPmMap = useCallback(async () => {
    if (Object.keys(pmMap).length > 0) return
    setPmLoading(true)
    try {
      const { data: pm } = await api.get('/product-master', { params: { page: 0, size: 9999 } })
      const map = {}
      ;(pm.content || []).forEach(p => { if (p.maBravo) map[p.maBravo] = p })
      setPmMap(map)
    } catch { /* non-blocking */ }
    finally { setPmLoading(false) }
  }, [pmMap])

  useEffect(() => {
    if (activeTab === 'tong_hop' || activeTab === 'phan_tich') loadPmMap()
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePmSaved = useCallback((updated) => {
    if (updated?.maBravo) setPmMap(prev => ({ ...prev, [updated.maBravo]: updated }))
  }, [])

  useEffect(() => {
    if (savedState) fetchData(savedState.page - 1, savedState.pageSize, savedState.filters)
    else fetchData(0)
    fetchDoneData(0)
    fetchHoSoData(0)
    fetchHsData(0)
    fetchNhapKhoMap()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = () => {
      fetchData(paginationRef.current.current - 1, paginationRef.current.pageSize, undefined, { silent: true })
      fetchNhapKhoMap()
    }
    window.addEventListener('app:silent-refresh', handler)
    return () => window.removeEventListener('app:silent-refresh', handler)
  }, [fetchData, fetchNhapKhoMap])

  useEffect(() => {
    if (!data || data.length === 0) return
    const stored = (() => { try { return JSON.parse(localStorage.getItem(SL_SNAPSHOT_KEY) || '{}') } catch { return {} } })()
    const now = Date.now()
    const newStored = { ...stored }
    const deltas = {}
    data.forEach(r => {
      const key = String(r.id)
      const entry = stored[key]
      if (entry && now - entry.ts < SL_SNAPSHOT_TTL) {
        deltas[key] = { slPc: cmpDelta(r.slPc, entry.slPc), pcPl: cmpDelta(r.pcPl, entry.pcPl), dg2: cmpDelta(r.dg2, entry.dg2), bbc1_2: cmpDelta(r.bbc1_2, entry.bbc1_2) }
      } else {
        newStored[key] = { ts: now, slPc: r.slPc, pcPl: r.pcPl, dg2: r.dg2, bbc1_2: r.bbc1_2 }
        deltas[key] = {}
      }
    })
    localStorage.setItem(SL_SNAPSHOT_KEY, JSON.stringify(newStored))
    setDeltaMap(deltas)
  }, [data])

  const handleSearch = () => {
    setPagination(p => ({ ...p, current: 1 }))
    setDonePagination(p => ({ ...p, current: 1 }))
    setHoSoPagination(p => ({ ...p, current: 1 }))
    setHsPagination(p => ({ ...p, current: 1 }))
    fetchData(0)
    fetchDoneData(0)
    fetchHoSoData(0)
    fetchHsData(0)
  }

  const handleReset = () => {
    const empty = { maTp: '', maBravo: '', tienTrinh: '', lsx: '', trangThai: '' }
    setFilters(empty)
    fetchData(0, pagination.pageSize, empty)
    fetchDoneData(0, donePagination.pageSize, empty)
    fetchHoSoData(0, hoSoPagination.pageSize, empty)
    fetchHsData(0, hsPagination.pageSize, empty)
  }

  const handleHide = async (id) => {
    try {
      await api.patch(`/production/${id}/hide`)
      message.success('Đã ẩn bản ghi')
      fetchData(pagination.current - 1)
    } catch { message.error('Ẩn thất bại') }
  }

  const handleHoSoHoanThien = async (id) => {
    try {
      await api.patch(`/production/${id}/ho-so-hoan-thien`)
      message.success('Đã chuyển sang Tổng Kế Hồ Sơ')
      fetchData(pagination.current - 1)
      fetchHoSoData(0)
    } catch { message.error('Thao tác thất bại') }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/production/${id}`)
      message.success('Đã chuyển vào thùng rác')
      fetchData(pagination.current - 1)
    } catch {
      message.error('Xóa thất bại')
    }
  }

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return
    setBulkDelLoading(true)
    try {
      const { data: res } = await api.delete('/production/bulk', { data: selectedIds })
      message.success(`Đã xóa ${res.deleted} bản ghi`)
      setSelectedIds([])
      fetchData(pagination.current - 1)
    } catch { message.error('Xóa thất bại') }
    finally { setBulkDelLoading(false) }
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams(filters)
      const res = await api.get(`/production/export?${params}`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'sanluong.xlsx'; a.click()
      URL.revokeObjectURL(url)
    } catch {
      message.error('Xuất Excel thất bại')
    }
  }

  const slCellRender = (field) => (v, r) => {
    const sl = parseInt(v) || 0
    const soLuong = r.soLuong || 0
    const exceeds = sl > 0 && soLuong > 0 && sl > soLuong
    const delta = deltaMap[r.id]?.[field]
    const txt = v != null ? String(v) : ''
    return (
      <span>
        <span style={exceeds ? { color: '#722ed1', fontWeight: 700 } : { color: '#000011', fontWeight: 500 }}>{txt || '—'}</span>
        {delta === 'up'   && <span style={{ color: '#52c41a', fontSize: 10, marginLeft: 2 }}>▲</span>}
        {delta === 'down' && <span style={{ color: '#cf1322', fontSize: 10, marginLeft: 2 }}>▼</span>}
        {exceeds && <Tooltip title={`Vượt SL kế hoạch (${soLuong})`}><WarningOutlined style={{ color: '#722ed1', fontSize: 10, marginLeft: 3 }} /></Tooltip>}
      </span>
    )
  }

  const goToSchedule = (stage, record) =>
    navigate('/work-schedule', {
      state: { jumpTo: { stage, tienTrinh: record.tienTrinh, soLo: record.lsx, maTp: record.maTp } }
    })

  const columns = [
    {
      title: '#', key: 'stt', width: 46, fixed: 'left', align: 'center',
      render: (_, __, idx) => {
        const ps = pagination.pageSize || 20, cp = pagination.current || 1
        return <span style={{ color: '#aaa', fontSize: 11 }}>{pagination.total - (cp - 1) * ps - idx}</span>
      },
    },
    {
      title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 100, fixed: 'left',
      render: v => <strong style={{ fontFamily: 'monospace', fontSize: 12, color: '#000011' }}>{v || '—'}</strong>,
      ...colSearch('maBravo'),
    },
    {
      title: 'Mã TP', dataIndex: 'maTp', key: 'maTp', width: 82, fixed: 'left',
      render: v => <span style={{ color: '#000011', fontSize: 12 }}>{v}</span>,
      ...colSearch('maTp'),
    },
    {
      title: 'Tiến Trình', dataIndex: 'tienTrinh', key: 'tienTrinh', width: 220, fixed: 'left',
      render: (v, record) => (
        <Tooltip title={(isAdmin() || isAdminKH()) ? `Nhấn để chỉnh sửa: ${v}` : v}>
          <span
            onClick={(isAdmin() || isAdminKH()) ? (e) => { e.stopPropagation(); navigate(`/record/edit/${record.id}`) } : undefined}
            style={{
              display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: 210, fontSize: 12,
              ...((isAdmin() || isAdminKH()) ? { color: '#000011', cursor: 'pointer', fontWeight: 500 } : {}),
            }}
          >{v}</span>
        </Tooltip>
      ),
      ...colSearch('tienTrinh'),
    },
    {
      title: 'LSX', dataIndex: 'lsx', key: 'lsx', width: 80, fixed: 'left', align: 'center',
      render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span>,
      ...colSearch('lsx'),
    },
    {
      title: 'KH', dataIndex: 'soLuong', key: 'soLuong', width: 80, align: 'center',
      render: v => <span style={{ color: '#000011' }}>{v != null ? Number(v).toLocaleString('vi-VN') : '—'}</span>,
    },
    {
      title: 'Mã ĐH', dataIndex: 'maDonHang', key: 'maDonHang', width: 90, align: 'center',
      render: v => v
        ? <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#7c3aed' }}>{v}</span>
        : <span style={{ color: '#d9d9d9' }}>—</span>,
      ...colSearch('maDonHang'),
    },
    // ── Nhóm: Trạng thái công đoạn ────────────────────────────────
    {
      title: <span style={{ color: '#ffffff', fontSize: 11 }}>TRẠNG THÁI CÔNG ĐOẠN</span>,
      children: [
        {
          title: 'PCPL1', dataIndex: 'pcpl1TrangThai', key: 'pcpl1TrangThai', width: 72, align: 'center',
          render: (v, r) => <StatusTag value={v} onClick={() => goToSchedule('PCPL1', r)} />,
          ...colStatus('pcpl1TrangThai'),
        },
        {
          title: 'PCPL2', dataIndex: 'pcpl2TrangThai', key: 'pcpl2TrangThai', width: 72, align: 'center',
          render: (v, r) => <StatusTag value={v} onClick={() => goToSchedule('PCPL2', r)} />,
          ...colStatus('pcpl2TrangThai'),
        },
        {
          title: 'PL', dataIndex: 'plTrangThai', key: 'plTrangThai', width: 68, align: 'center',
          render: (v, r) => <StatusTag value={v} onClick={() => goToSchedule('PL', r)} />,
          ...colStatus('plTrangThai'),
        },
        {
          title: 'ĐG', dataIndex: 'dgTrangThai', key: 'dgTrangThai', width: 68, align: 'center',
          render: (v, r) => <StatusTag value={v} onClick={() => goToSchedule('DG', r)} />,
          ...colStatus('dgTrangThai'),
        },
        {
          title: 'BBC1', dataIndex: 'bbc1TrangThai', key: 'bbc1TrangThai', width: 72, align: 'center',
          render: (v, r) => <StatusTag value={v} onClick={() => goToSchedule('BBC1', r)} />,
          ...colStatus('bbc1TrangThai'),
        },
      ],
    },
    // ── Nhóm: Sản lượng ───────────────────────────────────────────
    {
      title: <span style={{ color: '#ffffff', fontSize: 11 }}>SẢN LƯỢNG</span>,
      children: [
        { title: 'PC',   dataIndex: 'slPc',   key: 'slPc',   width: 88, align: 'center', render: slCellRender('slPc') },
        { title: 'PL',   dataIndex: 'pcPl',   key: 'pcPl',   width: 88, align: 'center', render: slCellRender('pcPl'),   ...colSearch('pcPl') },
        { title: 'ĐG',   dataIndex: 'dg2',    key: 'dg2',    width: 88, align: 'center', render: slCellRender('dg2'),    ...colSearch('dg2') },
        { title: 'BBC1', dataIndex: 'bbc1_2', key: 'bbc1_2', width: 88, align: 'center', render: slCellRender('bbc1_2'), ...colSearch('bbc1_2') },
      ],
    },
    {
      title: 'SP TG', dataIndex: 'pcPl', key: 'spTrungGian', width: 72, align: 'center',
      render: v => <span style={{ color: '#000011' }}>{v ?? '—'}</span>,
    },
    {
      title: 'CL BTP', key: 'clBtp', width: 90, align: 'center',
      render: (_, r) => {
        const val = (parseInt(r.dg2 || 0) || 0) - (parseInt(r.pcPl || 0) || 0)
        const color = val > 0 ? '#cf1322' : val < 0 ? '#389e0d' : '#595959'
        const prefix = val > 0 ? '+' : ''
        return <span style={{ color }}>{val !== 0 ? `${prefix}${val}` : '—'}</span>
      }
    },
    // ── Nhóm: Công ────────────────────────────────────────────────
    {
      title: <span style={{ color: '#ffffff', fontSize: 11 }}>CÔNG</span>,
      children: [
        { title: 'GNNL',  dataIndex: 'temDb',    key: 'temDb_c',  width: 72, align: 'center', render: v => v ? <span style={{ color: '#c41d7f' }}>{Number(v).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> : '—' },
        { title: 'BBC1',  dataIndex: 'bbc1_3',   key: 'bbc1_3',   width: 72, align: 'center', render: v => v ? <span style={{ color: '#722ed1' }}>{v}</span> : '—' },
        { title: 'PC',    dataIndex: 'pcChiPhi', key: 'pcChiPhi', width: 72, align: 'center', render: v => v ? <span style={{ color: '#1677ff' }}>{v}</span> : '—' },
        { title: 'PL',    dataIndex: 'plChiPhi', key: 'plChiPhi', width: 72, align: 'center', render: v => v ? <span style={{ color: '#389e0d' }}>{v}</span> : '—' },
        { title: 'ĐG',    dataIndex: 'dgChiPhi', key: 'dgChiPhi', width: 72, align: 'center', render: v => v ? <span style={{ color: '#d48806' }}>{v}</span> : '—' },
        { title: 'CC',    dataIndex: 'ccChiPhi', key: 'ccChiPhi', width: 72, align: 'center', render: v => v ? <span style={{ color: '#08979c' }}>{v}</span> : '—' },
        {
          title: 'Σ', key: 'sigmaCong', width: 88, align: 'center',
          render: (_, r) => {
            const s = (r.temDb || 0) + (r.bbc1_3 || 0) + (r.pcChiPhi || 0) + (r.plChiPhi || 0) + (r.dgChiPhi || 0) + (r.ccChiPhi || 0)
            return s ? <span style={{ color: '#1D4ED8' }}>{s.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> : <span style={{ color: '#bbb' }}>—</span>
          }
        },
      ],
    },
    // ── Nhóm: Dở dang ─────────────────────────────────────────────
    {
      title: <span style={{ color: '#ffffff', fontSize: 11 }}>DỞ DANG</span>,
      children: [
        { title: 'PC',   key: 'ddPc',   width: 80, align: 'center', render: (_, r) => { const v = (r.soLuong || 0) - (parseInt(r.slPc) || 0); return <span style={{ color: v > 0 ? '#1677ff' : '#aaa' }}>{v}</span> } },
        { title: 'PL',   key: 'ddPl',   width: 80, align: 'center', render: (_, r) => { const v = (parseInt(r.slPc) || 0) - (parseInt(r.pcPl) || 0); return <span style={{ color: v > 0 ? '#389e0d' : '#aaa' }}>{v}</span> } },
        { title: 'BBC1', key: 'ddBbc1', width: 80, align: 'center', render: (_, r) => { const v = (r.soLuong || 0) - (parseInt(r.bbc1_2) || 0); return <span style={{ color: v > 0 ? '#722ed1' : '#aaa' }}>{v}</span> } },
        { title: 'ĐG',   key: 'ddDg',   width: 80, align: 'center', render: (_, r) => { const v = (parseInt(r.pcPl) || 0) - (parseInt(r.dg2) || 0); return <span style={{ color: v > 0 ? '#d48806' : '#aaa' }}>{v}</span> } },
      ],
    },
    { title: 'TP NKho', key: 'tpNhapKho', width: 88, align: 'center', render: (_, r) => { const v = getNhapKho(r); return v > 0 ? v : '—' } },
    { title: 'TEM ĐB',  dataIndex: 'temDb',      key: 'temDb',      width: 76, align: 'center', render: v => v ?? '—' },
    {
      title: <span style={{ color: '#0891b2' }}>QA Lấy mẫu</span>,
      onHeaderCell: () => ({ style: { cursor: 'default' } }),
      children: [
        {
          title: 'Kiểm nghiệm', key: 'qa_kn', width: 80, align: 'center',
          render: (_, r) => {
            const wsKey = (r.maBravo || '') + '|' + (r.lsx || '')
            const ws = qaMap[wsKey]
            const v = (ws ? (ws.kiemNghiem || 0) : 0) || ((r.plQaKiemNghiem || 0) + (r.dgQaKiemNghiem || 0))
            return v > 0
              ? <span style={{ color: '#0891b2' }}>{v.toLocaleString('vi-VN')}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>
          },
        },
        {
          title: 'Lưu mẫu', key: 'qa_lm', width: 72, align: 'center',
          render: (_, r) => {
            const wsKey = (r.maBravo || '') + '|' + (r.lsx || '')
            const ws = qaMap[wsKey]
            const v = (ws ? (ws.luuMau || 0) : 0) || ((r.plQaLuuMau || 0) + (r.dgQaLuuMau || 0))
            return v > 0
              ? <span style={{ color: '#0891b2' }}>{v.toLocaleString('vi-VN')}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>
          },
        },
        {
          title: 'Khác', key: 'qa_khac', width: 60, align: 'center',
          render: (_, r) => {
            const wsKey = (r.maBravo || '') + '|' + (r.lsx || '')
            const ws = qaMap[wsKey]
            const v = (ws ? (ws.khac || 0) : 0) || ((r.plQaKhac || 0) + (r.dgQaKhac || 0))
            return v > 0
              ? <span style={{ color: '#0891b2' }}>{v.toLocaleString('vi-VN')}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>
          },
        },
        {
          title: 'Tổng', key: 'qa_tong', width: 72, align: 'center',
          render: (_, r) => {
            const wsKey = (r.maBravo || '') + '|' + (r.lsx || '')
            const ws = qaMap[wsKey]
            const wsTotal = ws ? (ws.kiemNghiem || 0) + (ws.luuMau || 0) + (ws.khac || 0) : 0
            const recTotal = (r.plQaLayMau || 0) + (r.dgQaLayMau || 0)
            const total = wsTotal || recTotal
            return total > 0
              ? <span style={{ fontWeight: 700, color: '#0891b2' }}>{total.toLocaleString('vi-VN')}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>
          },
        },
      ],
    },
    {
      title: <span style={{ color: '#16a34a' }}>Hiệu suất</span>,
      onHeaderCell: () => ({ style: { cursor: 'default' } }),
      children: [
        {
          title: 'PL', key: 'hs_pl', width: 80, align: 'center',
          render: (_, r) => {
            const slPl = parseInt(r.pcPl) || 0
            const qa   = r.plQaLayMau || 0
            const coLo = r.soLuong || 0
            if (!coLo) return <span style={{ color: '#d9d9d9' }}>—</span>
            const pct = ((slPl + qa) / coLo * 100).toFixed(1)
            const n   = parseFloat(pct)
            const color = n >= 99 ? '#16a34a' : n >= 95 ? '#d46b08' : '#cf1322'
            return <span style={{ fontWeight: 700, color }}>{pct}%</span>
          },
        },
        {
          title: 'ĐG', key: 'hs_dg', width: 80, align: 'center',
          render: (_, r) => {
            const slDg = parseInt(r.dg2)  || 0
            const qa   = r.dgQaLayMau || 0
            const slPl = parseInt(r.pcPl) || 0
            if (!slPl) return <span style={{ color: '#d9d9d9' }}>—</span>
            const pct = ((slDg + qa) / slPl * 100).toFixed(1)
            const n   = parseFloat(pct)
            const color = n >= 99 ? '#16a34a' : n >= 95 ? '#d46b08' : '#cf1322'
            return <span style={{ fontWeight: 700, color }}>{pct}%</span>
          },
        },
        {
          title: 'Tổng', key: 'hs_tong', width: 80, align: 'center',
          render: (_, r) => {
            const coLo = r.soLuong || 0
            if (!coLo) return <span style={{ color: '#d9d9d9' }}>—</span>
            const nkho = getNhapKho(r)
            const qaPl = r.plQaLayMau || 0
            const qaDg = r.dgQaLayMau || 0
            const pct  = ((nkho + qaPl + qaDg) / coLo * 100).toFixed(1)
            const n    = parseFloat(pct)
            const color = n >= 99 ? '#16a34a' : n >= 95 ? '#d46b08' : '#cf1322'
            return <span style={{ fontWeight: 700, color }}>{pct}%</span>
          },
        },
      ],
    },
    {
      title: 'SP/Công', key: 'spCong', width: 88, align: 'center',
      render: (_, r) => {
        const sc = (r.bbc1_3 || 0) + (r.pcChiPhi || 0) + (r.plChiPhi || 0) + (r.dgChiPhi || 0) + (r.ccChiPhi || 0)
        const slDg = parseFloat(r.dg2)
        if (!sc || !slDg) return <span style={{ color: '#bbb' }}>—</span>
        return <span style={{ color: '#1677ff' }}>{(slDg / sc).toLocaleString('vi-VN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</span>
      }
    },
    // ── Nhóm: Xử lý hàng lỗi ─────────────────────────────────────
    {
      title: <span style={{ color: '#ffffff', fontSize: 11 }}>XỬ LÝ HÀNG LỖI</span>,
      onHeaderCell: () => ({ style: { cursor: 'default' } }),
      children: [
        {
          title: 'SL lỗi trả về', key: 'hl_slTraVe', width: 100, align: 'right',
          onCell: (r) => isStageAdmin() ? {} : ({ onClick: () => navigate(`/record/edit/${r.id}`, { state: { openTab: 'hangloi' } }), style: { cursor: 'pointer' } }),
          render: (_, r) => {
            const v = r.hlSoLuongTraVe
            return v != null && Number(v) !== 0
              ? <span style={{ fontWeight: 700, color: '#cf1322' }}>{Number(v).toLocaleString('vi-VN')}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>
          }
        },
        {
          title: 'Lý do trả về', key: 'hl_liDoTraVe', width: 140, ellipsis: true,
          onCell: (r) => isStageAdmin() ? {} : ({ onClick: () => navigate(`/record/edit/${r.id}`, { state: { openTab: 'hangloi' } }), style: { cursor: 'pointer' } }),
          render: (_, r) => r.hlLiDoTraVe
            ? <Tooltip title={r.hlLiDoTraVe}><span style={{ fontSize: 11, color: '#d46b08' }}>{r.hlLiDoTraVe}</span></Tooltip>
            : <span style={{ color: '#d9d9d9' }}>—</span>
        },
        {
          title: 'Hướng xử lý', key: 'hl_huongXuLy', width: 110, ellipsis: true,
          onCell: (r) => isStageAdmin() ? {} : ({ onClick: () => navigate(`/record/edit/${r.id}`, { state: { openTab: 'hangloi' } }), style: { cursor: 'pointer' } }),
          render: (_, r) => r.hlHuongXuLy
            ? <span style={{ fontSize: 11 }}>{r.hlHuongXuLy}</span>
            : <span style={{ color: '#d9d9d9' }}>—</span>
        },
        {
          title: 'Trạng thái XL', key: 'hl_trangThaiXuLy', width: 120, align: 'center',
          onCell: (r) => isStageAdmin() ? {} : ({ onClick: () => navigate(`/record/edit/${r.id}`, { state: { openTab: 'hangloi' } }), style: { cursor: 'pointer' } }),
          render: (_, r) => {
            if (!r.hlTrangThaiXuLy) return <span style={{ color: '#d9d9d9' }}>—</span>
            const isDone = r.hlTrangThaiXuLy === 'Đã hoàn thành'
            return (
              <span style={{
                display: 'inline-block', padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                color: isDone ? '#16a34a' : '#d46b08',
                background: isDone ? '#f0fdf4' : '#fffbeb',
                border: `1px solid ${isDone ? '#bbf7d0' : '#fde68a'}`,
              }}>
                {isDone ? '✓ Đã hoàn thành' : '⟳ Đang xử lý'}
              </span>
            )
          }
        },
        {
          title: 'Lý do chưa TH', key: 'hl_lyDoChua', width: 130, ellipsis: true,
          onCell: (r) => isStageAdmin() ? {} : ({ onClick: () => navigate(`/record/edit/${r.id}`, { state: { openTab: 'hangloi' } }), style: { cursor: 'pointer' } }),
          render: (_, r) => r.hlLyDoChuaThucHien
            ? <Tooltip title={r.hlLyDoChuaThucHien}><span style={{ fontSize: 11, color: '#f97316' }}>{r.hlLyDoChuaThucHien}</span></Tooltip>
            : <span style={{ color: '#d9d9d9' }}>—</span>
        },
        {
          title: 'SL đạt sau XL', key: 'hl_slDat', width: 100, align: 'right',
          onCell: (r) => isStageAdmin() ? {} : ({ onClick: () => navigate(`/record/edit/${r.id}`, { state: { openTab: 'hangloi' } }), style: { cursor: 'pointer' } }),
          render: (_, r) => {
            const v = r.hlSlDatSauXuLy
            return v != null && Number(v) !== 0
              ? <span style={{ fontWeight: 600, color: '#16a34a' }}>{Number(v).toLocaleString('vi-VN')}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>
          }
        },
        {
          title: 'SL hủy', key: 'hl_slHuy', width: 88, align: 'right',
          onCell: (r) => isStageAdmin() ? {} : ({ onClick: () => navigate(`/record/edit/${r.id}`, { state: { openTab: 'hangloi' } }), style: { cursor: 'pointer' } }),
          render: (_, r) => {
            const v = r.hlSlHuy
            return v != null && Number(v) !== 0
              ? <span style={{ fontWeight: 600, color: '#ef4444' }}>{Number(v).toLocaleString('vi-VN')}</span>
              : <span style={{ color: '#d9d9d9' }}>—</span>
          }
        },
      ],
    },
    {
      title: '', key: 'action', width: 90, fixed: 'right', align: 'center',
      render: (_, record) => (isAdmin() || isAdminKH()) ? (
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: 'Chỉnh sửa',
                onClick: () => navigate(`/record/edit/${record.id}`),
              },
              {
                key: 'hide',
                icon: <EyeInvisibleOutlined />,
                label: (
                  <Popconfirm
                    title="Ẩn bản ghi này?"
                    okText="Ẩn" cancelText="Hủy"
                    onConfirm={() => handleHide(record.id)}
                    onClick={e => e.stopPropagation()}
                  >
                    <span onClick={e => e.stopPropagation()}>Ẩn</span>
                  </Popconfirm>
                ),
              },
              ...((isAdmin() || isAdminKH()) ? [{
                key: 'ho_so',
                icon: <AccountBookOutlined style={{ color: '#7c3aed' }} />,
                label: (
                  <Popconfirm
                    title="Chuyển bản ghi này sang Tổng Kế Hồ Sơ?"
                    okText="Chuyển" cancelText="Hủy"
                    onConfirm={() => handleHoSoHoanThien(record.id)}
                    onClick={e => e.stopPropagation()}
                  >
                    <span onClick={e => e.stopPropagation()} style={{ color: '#7c3aed' }}>Hoàn thiện hồ sơ</span>
                  </Popconfirm>
                ),
              }] : []),
              { type: 'divider' },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                danger: true,
                label: (
                  <Popconfirm
                    title="Xóa bản ghi này? Không thể khôi phục!"
                    okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
                    onConfirm={() => handleDelete(record.id)}
                    onClick={e => e.stopPropagation()}
                  >
                    <span onClick={e => e.stopPropagation()}>Xóa</span>
                  </Popconfirm>
                ),
              },
            ],
          }}
        >
          <Button size="small" type="default"
            style={{ fontSize: 11, fontWeight: 600, padding: '0 8px' }}>
            Cập nhật <DownOutlined style={{ fontSize: 9 }} />
          </Button>
        </Dropdown>
      ) : null,
    },
  ]

  // Thống kê tổng cuối bảng
  const totals = data.reduce((acc, r) => {
    acc.slPc   += parseInt(r.slPc)   || 0
    acc.pcPl   += parseInt(r.pcPl)   || 0
    acc.dg2    += parseInt(r.dg2)    || 0
    acc.bbc1_2 += parseInt(r.bbc1_2) || 0
    return acc
  }, { slPc: 0, pcPl: 0, dg2: 0, bbc1_2: 0 })

  return (
    <div onClick={() => ctxMenu.visible && setCtxMenu(m => ({ ...m, visible: false }))} onContextMenu={() => {}}>
      <style>{`
        /* ── Toolbar ── */
        .db-toolbar { position: sticky; top: 0; z-index: 20; }
        /* ── Table header ── */
        .prod-table .ant-table-thead > tr > th {
          background: #006666 !important;
          color: #ffffff !important;
          font-size: 11px; font-weight: 700; text-align: center !important;
          text-transform: uppercase; letter-spacing: 0.05em;
          padding: 7px 6px !important; border-right: 1px solid rgba(255,255,255,0.4) !important; border-bottom: 1px solid rgba(255,255,255,0.4) !important;
          white-space: nowrap;
        }
        .prod-table .ant-table-thead > tr > th::before { display: none !important; }
        .prod-table .ant-table-thead > tr:first-child > th {
          background: #006666 !important;
          color: #ffffff !important;
          font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
        }
        .prod-table .ant-table-thead .ant-table-filter-trigger { color: #ffffff !important; }
        .prod-table .ant-table-thead .ant-table-filter-trigger:hover,
        .prod-table .ant-table-thead .ant-table-filter-trigger.active { color: #ffffff !important; background: rgba(255,255,255,0.2) !important; }
        .prod-table .ant-table-thead .ant-table-column-sorter { color: #ffffff !important; }
        .prod-table .ant-table-thead .ant-table-column-sorter-up.active .anticon,
        .prod-table .ant-table-thead .ant-table-column-sorter-down.active .anticon { color: #ffffff !important; }
        .prod-table .ant-table-thead .anticon { color: #ffffff !important; }
        .prod-table .ant-table-tbody > tr > td { padding: 4px 6px !important; font-size: 12px; font-weight: 400 !important; border-right: 1px solid #f0f0f0; border-bottom: 1px solid #EAECF2 !important; }
        .prod-table .ant-table-tbody > tr:hover > td { background: #EFF6FF !important; }
        .prod-table .row-alt > td { background: #F8FAFF !important; }
        .prod-table .row-highlight > td { background: #f0fff4 !important; outline: 1px solid #86EFAC; }
        .prod-table .row-selected > td { background: #dbeafe !important; outline: 2px solid #3b82f6; outline-offset: -1px; }
        .prod-table .row-chua-phat-lenh > td { background: #FFCC33 !important; }
        .prod-table .row-chua-phat-lenh:hover > td { background: #f5bc00 !important; }
        .prod-table .ant-table-summary > tr > td { background: linear-gradient(90deg, #1f6fa3 0%, #2980b3 100%) !important; color: #ffffff; font-weight: 700; font-size: 12px; padding: 5px 6px !important; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }
        .prod-table .ant-table-footer { padding: 0; }
        /* ── Stats table ── */
        .stats-tbl th { background: #DBEAFE; font-size: 12px; font-weight: 700; padding: 5px 16px; border: 1px solid #BFDBFE; text-align: center; color: #1D4ED8; }
        .stats-tbl td { font-size: 12px; padding: 5px 16px; border: 1px solid #DBEAFE; text-align: right; }
        .stats-tbl td:first-child { background: #EFF6FF; font-weight: 600; text-align: left; color: #1E3A5F; }
        /* ── Context menu ── */
        .db-ctx-menu { position: fixed; z-index: 9999; background: #fff; border-radius: 8px; box-shadow: 0 6px 24px rgba(0,0,0,0.15); border: 1px solid #e2e8f0; padding: 4px 0; min-width: 170px; }
        .db-ctx-menu-item { display: flex; align-items: center; gap: 8px; padding: 8px 16px; cursor: pointer; font-size: 13px; color: #1e293b; transition: background 0.15s; }
        .db-ctx-menu-item:hover { background: #f0f7ff; color: #1D4ED8; }
        .db-ctx-menu-item.danger:hover { background: #fff1f0; color: #dc2626; }
        /* ── Outer tab: Danh sách / Tiến độ ── */
        .db-outer-tabs > .ant-tabs-nav { background: #e8edf5 !important; border-bottom: 2px solid #c5d0e6 !important; position: sticky !important; top: ${toolbarH}px; z-index: 9; }
        .db-outer-tabs > .ant-tabs-nav .ant-tabs-tab { color: #4a5568 !important; font-weight: 600; font-size: 13px; padding: 7px 18px !important; }
        .db-outer-tabs > .ant-tabs-nav .ant-tabs-tab:hover { color: #1d4ed8 !important; }
        .db-outer-tabs > .ant-tabs-nav .ant-tabs-tab-active { background: #1d4ed8 !important; border-radius: 4px 4px 0 0; }
        .db-outer-tabs > .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-btn { color: #ffffff !important; }
        .db-outer-tabs > .ant-tabs-nav .ant-tabs-ink-bar { display: none !important; }
      `}</style>

      {/* ── Context menu ─────────────────────────────────────────── */}
      {ctxMenu.visible && (
        <div
          className="db-ctx-menu"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onMouseLeave={() => setCtxMenu(m => ({ ...m, visible: false }))}
        >
          <div
            className="db-ctx-menu-item"
            onClick={() => { navigate(`/record/edit/${ctxMenu.record?.id}`); setCtxMenu(m => ({ ...m, visible: false })) }}
          >
            <EyeOutlined style={{ fontSize: 14 }} />
            Xem chi tiết
          </div>
          <div
            className="db-ctx-menu-item danger"
            onClick={() => { navigate(`/record/edit/${ctxMenu.record?.id}`, { state: { openTab: 'hangloi' } }); setCtxMenu(m => ({ ...m, visible: false })) }}
          >
            <WarningOutlined style={{ fontSize: 14, color: '#dc2626' }} />
            Hàng lỗi
          </div>
          {(isAdmin() || isAdminKH()) && (<>
            <div style={{ borderTop: '1px solid #f0f0f0', margin: '4px 0' }} />
            <div
              className="db-ctx-menu-item danger"
              onClick={() => {
                const rec = ctxMenu.record
                setCtxMenu(m => ({ ...m, visible: false }))
                Modal.confirm({
                  title: 'Xóa bản ghi này?',
                  content: (
                    <span>
                      <strong>{rec?.tienTrinh || rec?.maTp || `#${rec?.id}`}</strong>
                      {rec?.lsx ? ` — LSX: ${rec.lsx}` : ''}
                      <br /><span style={{ color: '#888', fontSize: 12 }}>Bản ghi sẽ được chuyển vào thùng rác.</span>
                    </span>
                  ),
                  okText: 'Xóa', cancelText: 'Hủy',
                  okButtonProps: { danger: true },
                  onOk: () => handleDelete(rec?.id),
                })
              }}
            >
              <DeleteOutlined style={{ fontSize: 14, color: '#dc2626' }} />
              <span style={{ color: '#dc2626', fontWeight: 600 }}>Xóa bản ghi</span>
            </div>
          </>)}
        </div>
      )}

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="db-toolbar" ref={toolbarRef}>

        {/* Single-row toolbar: title + filters + actions */}
        <div style={{
          background: '#006666',
          padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          {/* Title */}
          <span style={{ fontWeight: 800, fontSize: 15, color: '#fff', whiteSpace: 'nowrap', letterSpacing: 0.3 }}>
            📊 Quản lý Sản lượng
          </span>
          <Badge count={pagination.total} showZero overflowCount={9999}
            style={{ background: 'rgba(255,255,255,0.22)', color: '#fff', boxShadow: 'none', fontWeight: 700 }} />

          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.3)', margin: '0 4px', flexShrink: 0 }} />

          {/* Filters inline */}
          {activeTab !== 'tiendo' && activeTab !== 'tiendogon' ? (
            <>
              <Input placeholder="Mã Bravo" value={filters.maBravo} allowClear
                onChange={e => setFilters(f => ({ ...f, maBravo: e.target.value }))}
                onPressEnter={handleSearch} style={{ width: 96 }} size="small" />
              <Input placeholder="Mã TP" value={filters.maTp} allowClear
                onChange={e => setFilters(f => ({ ...f, maTp: e.target.value }))}
                onPressEnter={handleSearch} style={{ width: 84 }} size="small" />
              <Input placeholder="Tiến trình / Tên SP" value={filters.tienTrinh} allowClear
                onChange={e => setFilters(f => ({ ...f, tienTrinh: e.target.value }))}
                onPressEnter={handleSearch} style={{ width: 190 }} size="small" />
              <Input placeholder="LSX" value={filters.lsx} allowClear
                onChange={e => setFilters(f => ({ ...f, lsx: e.target.value }))}
                onPressEnter={handleSearch} style={{ width: 84 }} size="small" />
              <Select placeholder="Trạng thái" size="small" style={{ width: 108 }}
                value={filters.trangThai || undefined} allowClear
                onChange={v => setFilters(f => ({ ...f, trangThai: v || '' }))}>
                <Option value="done">Done</Option>
                <Option value="doing">Doing</Option>
              </Select>
              <Button type="primary" size="small" icon={<SearchOutlined />} onClick={handleSearch}
                style={{ background: '#1D4ED8', borderColor: '#1D4ED8' }}>Tìm</Button>
              <Button size="small" icon={<ReloadOutlined />} onClick={handleReset}
                style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.45)', color: '#fff' }} />
            </>
          ) : (
            <>
              <Input placeholder="Mã SP" value={timelineFilters.maSp} allowClear
                onChange={e => setTimelineFilters(f => ({ ...f, maSp: e.target.value }))}
                onPressEnter={handleTimelineSearch} style={{ width: 130 }} size="small" />
              <RangePicker size="small" style={{ width: 260 }} format="DD/MM/YYYY"
                placeholder={['Ngày thực hiện từ', 'đến']}
                value={timelineFilters.dateRange}
                onChange={v => setTimelineFilters(f => ({ ...f, dateRange: v }))} />
              <Button type="primary" size="small" icon={<SearchOutlined />}
                onClick={handleTimelineSearch}
                style={{ background: '#1D4ED8', borderColor: '#1D4ED8' }}>Tìm</Button>
              <Button size="small" icon={<ReloadOutlined />} onClick={handleTimelineReset}
                style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.45)', color: '#fff' }} />
            </>
          )}

          {/* Action buttons */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {canEditProduction() && (
              <Button size="small" icon={<PlusOutlined />}
                onClick={() => navigate('/record/new')}
                style={{ background: '#1D4ED8', borderColor: '#60a5fa', color: '#fff', fontWeight: 600 }}>
                Thêm mới
              </Button>
            )}
            {canEditProduction() && activeTab === 'tong_hop' && (
              <Button size="small" icon={<UploadOutlined />}
                onClick={() => setImportOpen(true)}
                style={{ borderColor: '#a78bfa', color: '#a78bfa', background: 'transparent', fontWeight: 600 }}>
                Import
              </Button>
            )}
            <Button size="small" icon={<FileExcelOutlined />}
              onClick={handleExport}
              style={{ borderColor: '#86efac', color: '#86efac', background: 'transparent', fontWeight: 600 }}>
              Xuất Excel
            </Button>
            <Button size="small" icon={<BarChartOutlined />}
              onClick={() => setStatsOpen(v => !v)}
              style={{
                borderColor: statsOpen ? '#fde68a' : '#94a3b8',
                color: statsOpen ? '#fde68a' : '#94a3b8',
                background: statsOpen ? 'rgba(253,230,138,0.12)' : 'transparent',
                fontWeight: 600,
              }}>
              Thống kê <DownOutlined style={{ fontSize: 10, transform: statsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </Button>
            {(isAdmin() || isAdminKH()) && (
              <Tooltip title="Inbox Sản lượng">
                <Badge count={inboxCount} size="small" offset={[-4, 4]}
                  style={{ background: inboxCount > 0 ? '#e85d04' : '#aaa', boxShadow: 'none' }}>
                  <Button
                    size="small"
                    icon={<BellOutlined />}
                    onClick={() => setInboxOpen(v => !v)}
                    style={{
                      borderColor: inboxOpen ? '#fbbf24' : '#94a3b8',
                      color: inboxOpen ? '#fbbf24' : '#94a3b8',
                      background: inboxOpen ? 'rgba(251,191,36,0.12)' : 'transparent',
                      fontWeight: 600,
                    }}
                  />
                </Badge>
              </Tooltip>
            )}
          </div>
        </div>

        {/* ── Thống kê tháng (collapsible) ── */}
        {statsOpen && (
          <div style={{ padding: '10px 16px', background: '#0f172a', borderBottom: '1px solid #1e3a5f', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Space>
              <Typography.Text strong style={{ color: '#93c5fd', fontSize: 12 }}>Thống kê tháng:</Typography.Text>
              <DatePicker picker="month" placeholder="Chọn tháng" value={statsMonth}
                format="MM/YYYY" size="small" style={{ width: 120 }}
                onChange={val => { setStatsMonth(val); if (val) fetchStats(val); else setStats(null) }} />
              <Button size="small" icon={<SearchOutlined />} loading={statsLoading}
                onClick={() => statsMonth && fetchStats(statsMonth)}>Truy xuất</Button>
              {statsLoading && <Spin size="small" />}
            </Space>
            {stats && !statsLoading && (
              <table className="stats-tbl" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th></th>
                    <th>BBC1</th><th>PC</th><th>PL</th><th>ĐG</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Số Lượng</td>
                    <td>{(stats.bbc1?.soLuong ?? 0).toLocaleString('vi-VN')}</td>
                    <td>{(stats.pc?.soLuong  ?? 0).toLocaleString('vi-VN')}</td>
                    <td>{(stats.pl?.soLuong  ?? 0).toLocaleString('vi-VN')}</td>
                    <td>{(stats.dg?.soLuong  ?? 0).toLocaleString('vi-VN')}</td>
                  </tr>
                  <tr>
                    <td>SL LSX</td>
                    <td>{stats.bbc1?.soLuongLsx ?? 0}</td>
                    <td>{stats.pc?.soLuongLsx  ?? 0}</td>
                    <td>{stats.pl?.soLuongLsx  ?? 0}</td>
                    <td>{stats.dg?.soLuongLsx  ?? 0}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── Tabs: Tổng quan | Danh sách | Tiến độ ─────────────────────── */}
      <div ref={tabsWrapRef}>
      <Tabs
        className="db-outer-tabs"
        activeKey={activeTab}
        onChange={key => {
          setActiveTab(key)
          if (key === 'done_list') fetchDoneData(donePaginationRef.current.current - 1, donePaginationRef.current.pageSize)
          if (key === 'ho_so')     fetchHoSoData(hoSoPaginationRef.current.current - 1, hoSoPaginationRef.current.pageSize)
          if (key === 'hieu_suat') fetchHsData(hsPaginationRef.current.current - 1, hsPaginationRef.current.pageSize)
          if (key === 'tong_hop')  fetchThData(0, thPaginationRef.current.pageSize, thFilters)
        }}
        size="small"
        style={{ marginTop: 0 }}
        tabBarStyle={{ paddingLeft: 12, marginBottom: 0 }}
        items={[
          {
            key: 'tong_quan',
            label: <Space size={4}><AppstoreOutlined />Tổng quan</Space>,
            children: <ProductionOverview data={data} doneTotal={donePagination.total} deltaMap={deltaMap} getNhapKho={getNhapKho} />,
          },
          {
            key: 'list',
            label: 'Danh sách',
            children: (
              <>
                <div
                  tabIndex={0}
                  style={{ outline: 'none' }}
                  onKeyDown={(e) => {
                    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
                    e.preventDefault()
                    if (!data.length) return
                    const idx = selectedId != null ? data.findIndex(r => r.id === selectedId) : -1
                    const next = e.key === 'ArrowDown' ? Math.min(idx + 1, data.length - 1) : Math.max(idx - 1, 0)
                    if (next !== idx || idx === -1) {
                      setSelectedId(data[next < 0 ? 0 : next].id)
                      document.getElementById(`prod-row-${data[next < 0 ? 0 : next].id}`)?.scrollIntoView({ block: 'nearest' })
                    }
                  }}
                >
                <Table
                className="prod-table"
                columns={columns}
                dataSource={data}
                rowKey="id"
                loading={loading}
                scroll={{ x: 2100 }}
                size="small"
                sticky={{ offsetHeader: headerOffset }}
                pagination={{
                  ...pagination,
                  size: 'small',
                  showSizeChanger: true,
                  pageSizeOptions: ['100', '500', '1000'],
                  showTotal: total => `Tổng ${total} bản ghi`,
                  style: { margin: '8px 0 0' },
                  onChange: (page, pageSize) => {
                    setPagination(p => ({ ...p, current: page, pageSize }))
                    fetchData(page - 1, pageSize)
                  }
                }}
                rowClassName={(record, idx) => {
                  const isHighlight = highlightKey &&
                    (record.tienTrinh || '').trim() === (highlightKey.tienTrinh || '').trim() &&
                    (record.lsx || '') === highlightKey.lsx
                  return [
                    idx % 2 !== 0 ? 'row-alt' : '',
                    isHighlight ? 'row-highlight' : '',
                    !record.phatLenh ? 'row-chua-phat-lenh' : '',
                    record.id === selectedId ? 'row-selected' : '',
                  ].filter(Boolean).join(' ')
                }}
                onRow={record => ({
                  id: `prod-row-${record.id}`,
                  onClick: (e) => {
                    setSelectedId(record.id)
                    if (isStageAdmin()) navigate('/work-schedule', { state: { jumpTo: { stage: getRowJumpStage(), tienTrinh: record.tienTrinh, soLo: record.lsx, maTp: record.maTp } } })
                  },
                  style: isStageAdmin() ? { cursor: 'pointer' } : { cursor: 'default' },
                  onContextMenu: (e) => {
                    e.preventDefault()
                    setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, record })
                  },
                })}
              />
                </div>
              </>
            )
          },
          {
            key: 'done_list',
            label: (
              <span>
                ✅ Đã hoàn thành
                {donePagination.total > 0 && (
                  <span style={{
                    marginLeft: 6, fontSize: 11, fontWeight: 700,
                    background: '#389e0d', color: '#fff',
                    borderRadius: 10, padding: '0px 6px',
                    display: 'inline-block', lineHeight: '18px',
                  }}>
                    {donePagination.total}
                  </span>
                )}
              </span>
            ),
            children: (
              <div
                tabIndex={0}
                style={{ outline: 'none' }}
                onKeyDown={(e) => {
                  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
                  e.preventDefault()
                  if (!doneData.length) return
                  const idx = selectedId != null ? doneData.findIndex(r => r.id === selectedId) : -1
                  const next = e.key === 'ArrowDown' ? Math.min(idx + 1, doneData.length - 1) : Math.max(idx - 1, 0)
                  const nextIdx = next < 0 ? 0 : next
                  setSelectedId(doneData[nextIdx].id)
                  document.getElementById(`prod-row-done-${doneData[nextIdx].id}`)?.scrollIntoView({ block: 'nearest' })
                }}
              >
              <Table
                className="prod-table"
                columns={columns}
                dataSource={doneData}
                rowKey="id"
                loading={doneLoading}
                scroll={{ x: 2100 }}
                size="small"
                sticky={{ offsetHeader: headerOffset }}
                rowClassName={(record, idx) => [idx % 2 !== 0 ? 'row-alt' : '', record.id === selectedId ? 'row-selected' : ''].filter(Boolean).join(' ')}
                pagination={{
                  ...donePagination,
                  size: 'small',
                  showSizeChanger: true,
                  pageSizeOptions: ['100', '500', '1000'],
                  showTotal: total => `Tổng ${total} bản ghi đã hoàn thành`,
                  style: { margin: '8px 0 0' },
                  onChange: (page, pageSize) => {
                    donePaginationRef.current = { current: page, pageSize }
                    setDonePagination(p => ({ ...p, current: page, pageSize }))
                    fetchDoneData(page - 1, pageSize)
                  }
                }}
                onRow={record => ({
                  id: `prod-row-done-${record.id}`,
                  onClick: (e) => {
                    setSelectedId(record.id)
                    if (isStageAdmin()) navigate('/work-schedule', { state: { jumpTo: { stage: getRowJumpStage(), tienTrinh: record.tienTrinh, soLo: record.lsx, maTp: record.maTp } } })
                  },
                  style: isStageAdmin() ? { cursor: 'pointer' } : { cursor: 'default' },
                  onContextMenu: (e) => {
                    e.preventDefault()
                    setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, record })
                  },
                })}
              />
              </div>
            )
          },
          {
            key: 'ho_so',
            label: (
              <span>
                📋 Tổng Kế Hồ Sơ
                {hoSoPagination.total > 0 && (
                  <span style={{
                    marginLeft: 6, fontSize: 11, fontWeight: 700,
                    background: '#7c3aed', color: '#fff',
                    borderRadius: 10, padding: '0px 6px',
                    display: 'inline-block', lineHeight: '18px',
                  }}>
                    {hoSoPagination.total}
                  </span>
                )}
              </span>
            ),
            children: (
              <div
                tabIndex={0}
                style={{ outline: 'none' }}
                onKeyDown={(e) => {
                  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
                  e.preventDefault()
                  if (!hoSoData.length) return
                  const idx = selectedId != null ? hoSoData.findIndex(r => r.id === selectedId) : -1
                  const next = e.key === 'ArrowDown' ? Math.min(idx + 1, hoSoData.length - 1) : Math.max(idx - 1, 0)
                  const nextIdx = next < 0 ? 0 : next
                  setSelectedId(hoSoData[nextIdx].id)
                  document.getElementById(`prod-row-ho_so-${hoSoData[nextIdx].id}`)?.scrollIntoView({ block: 'nearest' })
                }}
              >
              <Table
                className="prod-table"
                columns={[
                  ...columns.filter(c => c.key !== 'action'),
                  {
                    title: '', key: 'action', width: 110, fixed: 'right', align: 'center',
                    render: (_, record) => (isAdmin() || isAdminKH()) ? (
                      <Popconfirm
                        title="Hoàn lại Danh sách?"
                        okText="Hoàn lại" cancelText="Hủy"
                        onConfirm={async () => {
                          try {
                            await api.patch(`/production/${record.id}/ho-so-hoan-thien`)
                            message.success('Đã hoàn lại Danh sách')
                            fetchHoSoData(hoSoPaginationRef.current.current - 1, hoSoPaginationRef.current.pageSize)
                            fetchData(pagination.current - 1)
                          } catch { message.error('Thao tác thất bại') }
                        }}
                      >
                        <Button size="small" style={{ fontSize: 11, fontWeight: 600, padding: '0 8px', borderColor: '#7c3aed', color: '#7c3aed' }}>
                          Hoàn lại ↩
                        </Button>
                      </Popconfirm>
                    ) : null,
                  }
                ]}
                dataSource={hoSoData}
                rowKey="id"
                loading={hoSoLoading}
                scroll={{ x: 2100 }}
                size="small"
                sticky={{ offsetHeader: headerOffset }}
                rowClassName={(record, idx) => [idx % 2 !== 0 ? 'row-alt' : '', record.id === selectedId ? 'row-selected' : ''].filter(Boolean).join(' ')}
                pagination={{
                  ...hoSoPagination,
                  size: 'small',
                  showSizeChanger: true,
                  pageSizeOptions: ['100', '500', '1000'],
                  showTotal: total => `Tổng ${total} hồ sơ hoàn thiện`,
                  style: { margin: '8px 0 0' },
                  onChange: (page, pageSize) => {
                    hoSoPaginationRef.current = { current: page, pageSize }
                    setHoSoPagination(p => ({ ...p, current: page, pageSize }))
                    fetchHoSoData(page - 1, pageSize)
                  }
                }}
                onRow={record => ({
                  id: `prod-row-ho_so-${record.id}`,
                  onClick: () => setSelectedId(record.id),
                  style: { cursor: 'default' },
                })}
              />
              </div>
            )
          },
          {
            key: 'tiendogon',
            label: <Space size={4}><CalendarOutlined />Tiến độ</Space>,
            children: (
              <TienDoTab
                filtersRef={timelineFiltersRef}
                searchTick={timelineSearchTick}
                headerOffset={headerOffset}
              />
            ),
          },
          {
            key: 'tiendo',
            label: <Space size={4}><CalendarOutlined />Chi tiết tiến độ</Space>,
            children: (
              <StageTimelineTab
                filtersRef={timelineFiltersRef}
                searchTick={timelineSearchTick}
                headerOffset={headerOffset}
              />
            ),
          },
          {
            key: 'ketoan',
            label: <Space size={4}><AccountBookOutlined />Sản Lượng Kế Toán</Space>,
            children: <SanLuongKeToanTab
              data={data}
              loading={loading}
              pagination={pagination}
              onPaginationChange={(page, pageSize) => {
                setPagination(p => ({ ...p, current: page, pageSize }))
                paginationRef.current = { current: page, pageSize }
                fetchData(page - 1, pageSize)
              }}
              doneData={doneData}
              doneLoading={doneLoading}
              donePagination={donePagination}
              onDonePaginationChange={(page, pageSize) => {
                setDonePagination(p => ({ ...p, current: page, pageSize }))
                donePaginationRef.current = { current: page, pageSize }
                fetchDoneData(page - 1, pageSize)
              }}
              nhapKhoMap={nhapKhoMap}
              headerOffset={headerOffset}
            />,
          },
          {
            key: 'hieu_suat',
            label: <Space size={4}><BarChartOutlined style={{ color: '#16a34a' }} /><span style={{ color: '#15803d', fontWeight: 600 }}>Hiệu suất</span></Space>,
            children: <HieuSuatTab
              data={hsData}
              loading={hsLoading}
              pagination={hsPagination}
              onPaginationChange={(page, pageSize) => {
                setHsPagination(p => ({ ...p, current: page, pageSize }))
                hsPaginationRef.current = { current: page, pageSize }
                fetchHsData(page - 1, pageSize)
              }}
              doneData={doneData}
              doneLoading={doneLoading}
              donePagination={donePagination}
              onDonePaginationChange={(page, pageSize) => {
                setDonePagination(p => ({ ...p, current: page, pageSize }))
                donePaginationRef.current = { current: page, pageSize }
                fetchDoneData(page - 1, pageSize)
              }}
              nhapKhoMap={nhapKhoMap}
              headerOffset={headerOffset}
            />,
          },
          ...(isAdmin() ? [{
            key: 'tong_hop',
            label: <Space size={4}><FileExcelOutlined style={{ color: '#7c3aed' }} /><span style={{ color: '#7c3aed', fontWeight: 600 }}>Tổng hợp SL</span></Space>,
            children: <TongHopSanLuongTab
              data={thData}
              loading={thLoading}
              pagination={thPagination}
              filters={thFilters}
              pmMap={pmMap}
              onFilterChange={f => setThFilters(prev => ({ ...prev, ...f }))}
              onSearch={() => fetchThData(0, thPaginationRef.current.pageSize, thFilters)}
              onPaginationChange={(page, pageSize) => {
                thPaginationRef.current = { current: page, pageSize }
                fetchThData(page - 1, pageSize, thFilters)
              }}
              onDeleteSuccess={() => fetchThData(0, thPaginationRef.current.pageSize, thFilters)}
            />,
          }] : []),
          ...(isAdmin() ? [{
            key: 'phan_tich',
            label: <Space size={4}><BarChartOutlined style={{ color: '#b45309' }} /><span style={{ color: '#b45309', fontWeight: 600 }}>Phân Tích SL</span></Space>,
            children: <PhanTichSanLuongTab pmMap={pmMap} />,
          }] : []),
        ]}
      />
      </div>

      {(isAdmin() || isAdminKH()) && (
        <InboxPanel
          open={inboxOpen}
          onClose={() => setInboxOpen(false)}
          onCountChange={setInboxCount}
        />
      )}

      <ImportSanLuongModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          setImportOpen(false)
          setActiveTab('tong_hop')
          fetchThData(0, thPaginationRef.current.pageSize, thFilters)
        }}
      />
    </div>
  )
}

// ── Tổng hợp Sản lượng Tab ────────────────────────────────────────────────────
function TongHopSanLuongTab({ data, loading, pagination, filters, pmMap = {}, onFilterChange, onSearch, onPaginationChange, onDeleteSuccess }) {
  const [delLoading, setDelLoading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [bulkDelLoading, setBulkDelLoading] = useState(false)
  const [detailRecord, setDetailRecord] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editVals, setEditVals] = useState({})
  const [saving, setSaving] = useState(false)
  const [selectedMonths, setSelectedMonths] = useState([])

  const openDetail = (record) => { setDetailRecord(record); setEditMode(false); setEditVals({}) }
  const closeDetail = () => { setDetailRecord(null); setEditMode(false); setEditVals({}) }
  const startEdit = () => {
    const r = detailRecord
    setEditVals({
      soLuong: r.soLuong, pcTrangThai: r.pcTrangThai, plTrangThai: r.plTrangThai,
      dgTrangThai: r.dgTrangThai, bbc1TrangThai: r.bbc1TrangThai,
      slPc: r.slPc, pcPl: r.pcPl, dg2: r.dg2, bbc1_2: r.bbc1_2,
      spTrungGian: r.spTrungGian, tpNhapKho: r.tpNhapKho, slTrungBinh: r.slTrungBinh,
      bbc1_3: r.bbc1_3, pcChiPhi: r.pcChiPhi, plChiPhi: r.plChiPhi,
      dgChiPhi: r.dgChiPhi, ccChiPhi: r.ccChiPhi, temDb: r.temDb,
      plQaLayMau: r.plQaLayMau, dgQaLayMau: r.dgQaLayMau,
      moTa: r.moTa, ghiChuHieuSuat: r.ghiChuHieuSuat,
    })
    setEditMode(true)
  }
  const ev = (field, val) => setEditVals(prev => ({ ...prev, [field]: val }))
  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: updated } = await api.put(`/san-luong-tong-hop/${detailRecord.id}`, editVals)
      message.success('Cập nhật thành công')
      setDetailRecord({ ...detailRecord, ...updated })
      setEditMode(false)
      onDeleteSuccess?.()
    } catch { message.error('Lưu thất bại') }
    finally { setSaving(false) }
  }

  const nsxFromLsx = (lsx) => {
    if (!lsx || lsx.length < 6) return null
    const dd = lsx.slice(0, 2), mm = lsx.slice(2, 4), yy = lsx.slice(4, 6)
    if (!/^\d{2}$/.test(dd) || !/^\d{2}$/.test(mm) || !/^\d{2}$/.test(yy)) return null
    return `${dd}/${mm}/${yy}`
  }
  const [loaiOptions, setLoaiOptions] = useState([])
  const [toOptions] = useState(['PCPL1', 'PCPL2', 'PCPL3', 'ĐG', 'BBC1'])

  useEffect(() => {
    api.get('/product-master/loai-san-pham-distinct').then(r => {
      setLoaiOptions((r.data || []).filter(Boolean))
    }).catch(() => {})
  }, [])

  const handleDelete = async (id) => {
    setDelLoading(true)
    try {
      await api.delete(`/san-luong-tong-hop/${id}`)
      message.success('Đã xóa bản ghi')
      setSelectedRowKeys(prev => prev.filter(k => k !== id))
      onDeleteSuccess?.()
    } catch {
      message.error('Xóa thất bại')
    } finally {
      setDelLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (!selectedRowKeys.length) return
    setBulkDelLoading(true)
    try {
      await api.delete('/san-luong-tong-hop/bulk', { data: selectedRowKeys })
      message.success(`Đã xóa ${selectedRowKeys.length} bản ghi`)
      setSelectedRowKeys([])
      onDeleteSuccess?.()
    } catch {
      message.error('Xóa thất bại')
    } finally {
      setBulkDelLoading(false)
    }
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: keys => setSelectedRowKeys(keys),
    columnWidth: 40,
    fixed: true,
  }

  // Month options derived from loaded data (parse MMYY from LSX)
  const monthOptions = React.useMemo(() => {
    const set = new Set()
    ;(data || []).forEach(r => {
      if (!r.lsx || r.lsx.length < 6) return
      const mm = r.lsx.slice(2, 4), yy = r.lsx.slice(4, 6)
      if (/^\d{2}$/.test(mm) && /^\d{2}$/.test(yy)) set.add(`${mm}/${yy}`)
    })
    return [...set]
      .sort((a, b) => {
        const [am, ay] = a.split('/'), [bm, by] = b.split('/')
        return by !== ay ? Number(by) - Number(ay) : Number(bm) - Number(am)
      })
      .map(v => ({ label: `Tháng ${v}`, value: v }))
  }, [data])

  const displayData = React.useMemo(() => {
    if (!selectedMonths.length) return data || []
    return (data || []).filter(r => {
      if (!r.lsx || r.lsx.length < 6) return false
      const mm = r.lsx.slice(2, 4), yy = r.lsx.slice(4, 6)
      return selectedMonths.includes(`${mm}/${yy}`)
    })
  }, [data, selectedMonths])

  const handleExportExcel = () => {
    const h1 = [
      'Mã Bravo','Mã TP','Tên SP','Loại SP','Tổ TH','LSX','NSX','SL KH','Mã ĐH',
      'Trạng thái','','','',
      'Sản lượng','','','','','',
      'Chi phí công','','','','','',
      'QA Lấy mẫu','',
      'SL TB','Mô tả','Ghi chú HS',
      'Năng suất TB','','','',
      'Máy Móc','','','',
    ]
    const h2 = [
      '','','','','','','','','',
      'PC','PL','ĐG','BBC1',
      'SL PC','SL PL','SL ĐG','SL BBC1','SP TG','TP NKho',
      'BBC1','PC','PL','ĐG','CC','GNNL',
      'PL','ĐG',
      '','','',
      'NS TB (ĐG)','NS PC','NS PL','NS BBC1',
      'PC','PL','BBC1','ĐG',
    ]
    const rows = displayData.map(r => {
      const pm = pmMap[r.maBravo] || {}
      return [
        r.maBravo, r.maTp, r.tienTrinh, r.loaiSanPham, r.toThucHien, r.lsx, nsxFromLsx(r.lsx) || '',
        r.soLuong ?? '', r.maDonHang ?? '',
        r.pcTrangThai ?? '', r.plTrangThai ?? '', r.dgTrangThai ?? '', r.bbc1TrangThai ?? '',
        r.slPc ?? '', r.pcPl ?? '', r.dg2 ?? '', r.bbc1_2 ?? '', r.spTrungGian ?? '', r.tpNhapKho ?? '',
        r.bbc1_3 != null ? Number(r.bbc1_3) : '',
        r.pcChiPhi != null ? Number(r.pcChiPhi) : '',
        r.plChiPhi != null ? Number(r.plChiPhi) : '',
        r.dgChiPhi != null ? Number(r.dgChiPhi) : '',
        r.ccChiPhi != null ? Number(r.ccChiPhi) : '',
        r.temDb != null ? Number(r.temDb) : '',
        r.plQaLayMau ?? '', r.dgQaLayMau ?? '',
        r.slTrungBinh != null ? Number(r.slTrungBinh) : '',
        r.moTa ?? '', r.ghiChuHieuSuat ?? '',
        pm.slTrungBinh != null ? Number(pm.slTrungBinh) : '',
        pm.nangSuatPc != null ? Number(pm.nangSuatPc) : '',
        pm.nangSuatPl != null ? Number(pm.nangSuatPl) : '',
        pm.nangSuatBbc1 != null ? Number(pm.nangSuatBbc1) : '',
        pm.mayMocPc ?? '', pm.mayMocPl ?? '', pm.mayMocBbc1 ?? '', pm.mayMocDg ?? '',
      ]
    })
    const ws = XLSX.utils.aoa_to_sheet([h1, h2, ...rows])
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
      { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
      { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },
      { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } },
      { s: { r: 0, c: 4 }, e: { r: 1, c: 4 } },
      { s: { r: 0, c: 5 }, e: { r: 1, c: 5 } },
      { s: { r: 0, c: 6 }, e: { r: 1, c: 6 } },
      { s: { r: 0, c: 7 }, e: { r: 1, c: 7 } },
      { s: { r: 0, c: 8 }, e: { r: 1, c: 8 } },
      { s: { r: 0, c: 9  }, e: { r: 0, c: 12 } },
      { s: { r: 0, c: 13 }, e: { r: 0, c: 18 } },
      { s: { r: 0, c: 19 }, e: { r: 0, c: 24 } },
      { s: { r: 0, c: 25 }, e: { r: 0, c: 26 } },
      { s: { r: 0, c: 27 }, e: { r: 1, c: 27 } },
      { s: { r: 0, c: 28 }, e: { r: 1, c: 28 } },
      { s: { r: 0, c: 29 }, e: { r: 1, c: 29 } },
      { s: { r: 0, c: 30 }, e: { r: 0, c: 33 } },
      { s: { r: 0, c: 34 }, e: { r: 0, c: 37 } },
    ]
    ws['!cols'] = [
      14,10,28,14,8,12,10,8,14,
      7,7,7,7,
      8,8,8,8,8,8,
      7,7,7,7,7,7,
      7,7,
      8,20,20,
      12,10,10,10,
      22,22,22,22,
    ].map(wch => ({ wch }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tổng hợp SL')
    XLSX.writeFile(wb, `tong_hop_sl_${dayjs().format('YYYYMMDD')}.xlsx`)
  }

  const fmtNS = v => v != null && v !== '' ? Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) : '—'

  const ttRender = v => {
    if (!v) return <span style={{ color: '#d9d9d9' }}>—</span>
    return <Tag color={v === 'done' ? 'success' : 'processing'} style={{ fontSize: 11, padding: '0 5px', margin: 0 }}>{v}</Tag>
  }
  const cpRender = v => v != null ? <span style={{ color: '#c41d7f' }}>{Number(v).toFixed(2)}</span> : '—'
  const qaRender = v => v != null ? <span style={{ color: '#0891b2' }}>{v}</span> : '—'

  const hc = (extra = {}) => () => ({ style: { background: '#006666', color: '#fff', textAlign: 'center', fontWeight: 700, fontSize: 11, padding: '6px 6px', ...extra } })

  const cols = [
    { title: 'Mã Bravo', dataIndex: 'maBravo',   key: 'maBravo',   width: 110, fixed: 'left', onHeaderCell: hc({ textAlign: 'left' }), render: v => <b>{v}</b> },
    { title: 'Mã TP',    dataIndex: 'maTp',       key: 'maTp',      width: 90,  fixed: 'left', onHeaderCell: hc({ textAlign: 'left' }) },
    { title: 'Tên SP',   dataIndex: 'tienTrinh',  key: 'tienTrinh', width: 200, ellipsis: true, onHeaderCell: hc({ textAlign: 'left' }) },
    {
      title: 'Loại SP', dataIndex: 'loaiSanPham', key: 'loaiSanPham', width: 120, ellipsis: true,
      onHeaderCell: hc({ textAlign: 'left' }),
      ...colSearch('loaiSanPham'),
      render: v => v ? <Tag color="geekblue" style={{ fontSize: 11, margin: 0 }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'Tổ TH', dataIndex: 'toThucHien', key: 'toThucHien', width: 90, align: 'center',
      onHeaderCell: hc(),
      filters: ['PCPL1','PCPL2','PCPL3','ĐG','BBC1'].map(v => ({ text: v, value: v })),
      onFilter: (value, record) => (record.toThucHien ?? '') === value,
      render: v => v ? <Tag color="cyan" style={{ fontSize: 11, margin: 0 }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    { title: 'LSX',      dataIndex: 'lsx',        key: 'lsx',       width: 100, onHeaderCell: hc() },
    {
      title: 'NSX', key: 'nsx', width: 88, align: 'center', onHeaderCell: hc(),
      render: (_, r) => {
        const v = nsxFromLsx(r.lsx)
        return v ? <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span>
      },
    },
    { title: 'SL KH',    dataIndex: 'soLuong',    key: 'soLuong',   width: 76, align: 'center', onHeaderCell: hc(), render: v => v ?? '—' },
    { title: 'Mã ĐH',    dataIndex: 'maDonHang',  key: 'maDonHang', width: 120, ellipsis: true, onHeaderCell: hc() },
    {
      title: 'Trạng thái',
      key: 'tt_group',
      onHeaderCell: hc(),
      children: [
        { title: 'PC',   dataIndex: 'pcTrangThai',   key: 'tt_pc',   width: 72, align: 'center', onHeaderCell: hc(), render: ttRender },
        { title: 'PL',   dataIndex: 'plTrangThai',   key: 'tt_pl',   width: 72, align: 'center', onHeaderCell: hc(), render: ttRender },
        { title: 'ĐG',   dataIndex: 'dgTrangThai',   key: 'tt_dg',   width: 72, align: 'center', onHeaderCell: hc(), render: ttRender },
        { title: 'BBC1', dataIndex: 'bbc1TrangThai', key: 'tt_bbc1', width: 72, align: 'center', onHeaderCell: hc(), render: ttRender },
      ]
    },
    {
      title: 'Sản lượng',
      key: 'sl_group',
      onHeaderCell: hc(),
      children: [
        { title: 'SL PC',   dataIndex: 'slPc',        key: 'slPc',  width: 76, align: 'center', onHeaderCell: hc(), render: (v, r) => v ?? r.soLuong ?? '—' },
        { title: 'SL PL',   dataIndex: 'pcPl',        key: 'pcPl',  width: 76, align: 'center', onHeaderCell: hc(), render: v => v ?? '—' },
        { title: 'SL ĐG',   dataIndex: 'dg2',         key: 'dg2',   width: 76, align: 'center', onHeaderCell: hc(), render: v => v ?? '—' },
        { title: 'SL BBC1', dataIndex: 'bbc1_2',      key: 'bbc12', width: 80, align: 'center', onHeaderCell: hc(), render: v => v ?? '—' },
        { title: 'SP TG',   dataIndex: 'spTrungGian', key: 'spTG',  width: 76, align: 'center', onHeaderCell: hc(), render: v => v ?? '—' },
        { title: 'TP NKho', dataIndex: 'tpNhapKho',   key: 'tpNK',  width: 80, align: 'center', onHeaderCell: hc(), render: v => v ?? '—' },
      ]
    },
    {
      title: 'Chi phí công',
      key: 'cp_group',
      onHeaderCell: hc(),
      children: [
        { title: 'BBC1', dataIndex: 'bbc1_3',   key: 'cp_bbc1', width: 68, align: 'center', onHeaderCell: hc(), render: cpRender },
        { title: 'PC',   dataIndex: 'pcChiPhi', key: 'cp_pc',   width: 68, align: 'center', onHeaderCell: hc(), render: cpRender },
        { title: 'PL',   dataIndex: 'plChiPhi', key: 'cp_pl',   width: 68, align: 'center', onHeaderCell: hc(), render: cpRender },
        { title: 'ĐG',   dataIndex: 'dgChiPhi', key: 'cp_dg',   width: 68, align: 'center', onHeaderCell: hc(), render: cpRender },
        { title: 'CC',   dataIndex: 'ccChiPhi', key: 'cp_cc',   width: 68, align: 'center', onHeaderCell: hc(), render: cpRender },
        { title: 'GNNL', dataIndex: 'temDb',    key: 'cp_gnnl', width: 68, align: 'center', onHeaderCell: hc(), render: cpRender },
      ]
    },
    {
      title: 'QA Lấy mẫu',
      key: 'qa_group',
      onHeaderCell: hc(),
      children: [
        { title: 'KN', key: 'qa_kn', width: 55, align: 'center', onHeaderCell: hc(),
          render: (_, r) => {
            const v = (r.plQaKiemNghiem || 0) + (r.dgQaKiemNghiem || 0)
            return v ? <span style={{ color: '#0369a1', fontWeight: 600 }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span>
          }
        },
        { title: 'LM', key: 'qa_lm', width: 55, align: 'center', onHeaderCell: hc(),
          render: (_, r) => {
            const v = (r.plQaLuuMau || 0) + (r.dgQaLuuMau || 0)
            return v ? <span style={{ color: '#0369a1', fontWeight: 600 }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span>
          }
        },
        { title: 'Khác', key: 'qa_khac', width: 55, align: 'center', onHeaderCell: hc(),
          render: (_, r) => {
            const v = (r.plQaKhac || 0) + (r.dgQaKhac || 0)
            return v ? <span style={{ color: '#0369a1', fontWeight: 600 }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span>
          }
        },
        { title: 'Tổng', key: 'qa_tong', width: 60, align: 'center', onHeaderCell: hc(),
          render: (_, r) => {
            const v = (r.plQaLayMau || 0) + (r.dgQaLayMau || 0)
            return v ? <span style={{ color: '#0369a1', fontWeight: 700 }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span>
          }
        },
      ]
    },
    { title: 'SL TB',      dataIndex: 'slTrungBinh',   key: 'slTB',   width: 76, align: 'center', onHeaderCell: hc(), render: v => v ?? '—' },
    { title: 'Mô tả',      dataIndex: 'moTa',           key: 'moTa',   width: 150, ellipsis: true, onHeaderCell: hc({ textAlign: 'left' }), render: v => v || '—' },
    { title: 'Ghi chú HS', dataIndex: 'ghiChuHieuSuat', key: 'ghiChu', width: 160, ellipsis: true, onHeaderCell: hc({ textAlign: 'left' }), render: v => v || '—' },
    {
      title: 'Năng suất TB',
      key: 'ns_group',
      onHeaderCell: hc(),
      children: [
        {
          title: 'NS TB (ĐG)', key: 'ns_tb', width: 100, align: 'right', onHeaderCell: hc(),
          render: (_, r) => { const v = pmMap[r.maBravo]?.slTrungBinh; return v ? <span style={{ color: '#7c3aed', fontWeight: 600 }}>{fmtNS(v)}</span> : <span style={{ color: '#d9d9d9' }}>—</span> },
        },
        {
          title: 'NS PC', key: 'ns_pc', width: 90, align: 'right', onHeaderCell: hc(),
          render: (_, r) => { const v = pmMap[r.maBravo]?.nangSuatPc; return v ? <span style={{ color: '#1d4ed8', fontWeight: 600 }}>{fmtNS(v)}</span> : <span style={{ color: '#d9d9d9' }}>—</span> },
        },
        {
          title: 'NS PL', key: 'ns_pl', width: 90, align: 'right', onHeaderCell: hc(),
          render: (_, r) => { const v = pmMap[r.maBravo]?.nangSuatPl; return v ? <span style={{ color: '#0e7490', fontWeight: 600 }}>{fmtNS(v)}</span> : <span style={{ color: '#d9d9d9' }}>—</span> },
        },
        {
          title: 'NS BBC1', key: 'ns_bbc1', width: 90, align: 'right', onHeaderCell: hc(),
          render: (_, r) => { const v = pmMap[r.maBravo]?.nangSuatBbc1; return v ? <span style={{ color: '#6d28d9', fontWeight: 600 }}>{fmtNS(v)}</span> : <span style={{ color: '#d9d9d9' }}>—</span> },
        },
      ],
    },
    {
      title: 'Máy Móc',
      key: 'mm_group',
      onHeaderCell: hc(),
      children: [
        { title: 'PC',   key: 'mm_pc',   width: 160, ellipsis: true, onHeaderCell: hc({ textAlign: 'left' }), render: (_, r) => pmMap[r.maBravo]?.mayMocPc   || <span style={{ color: '#d9d9d9' }}>—</span> },
        { title: 'PL',   key: 'mm_pl',   width: 160, ellipsis: true, onHeaderCell: hc({ textAlign: 'left' }), render: (_, r) => pmMap[r.maBravo]?.mayMocPl   || <span style={{ color: '#d9d9d9' }}>—</span> },
        { title: 'BBC1', key: 'mm_bbc1', width: 160, ellipsis: true, onHeaderCell: hc({ textAlign: 'left' }), render: (_, r) => pmMap[r.maBravo]?.mayMocBbc1 || <span style={{ color: '#d9d9d9' }}>—</span> },
        { title: 'ĐG',   key: 'mm_dg',   width: 160, ellipsis: true, onHeaderCell: hc({ textAlign: 'left' }), render: (_, r) => pmMap[r.maBravo]?.mayMocDg   || <span style={{ color: '#d9d9d9' }}>—</span> },
      ],
    },
    {
      title: '',
      key: 'actions',
      width: 56,
      fixed: 'right',
      onHeaderCell: hc(),
      render: (_, r) => (
        <Popconfirm title="Xóa bản ghi này?" onConfirm={() => handleDelete(r.id)} okText="Xóa" cancelText="Hủy">
          <Button size="small" danger icon={<DeleteOutlined />} loading={delLoading} />
        </Popconfirm>
      )
    },
  ]

  return (
    <div style={{ padding: '8px 12px' }}>
      <Space style={{ marginBottom: 10 }} wrap>
        <Input
          placeholder="Mã Bravo"
          value={filters.maBravo}
          onChange={e => onFilterChange({ maBravo: e.target.value })}
          onPressEnter={onSearch}
          style={{ width: 130 }}
          size="small"
          allowClear
        />
        <Input
          placeholder="Mã TP"
          value={filters.maTp}
          onChange={e => onFilterChange({ maTp: e.target.value })}
          onPressEnter={onSearch}
          style={{ width: 110 }}
          size="small"
          allowClear
        />
        <Input
          placeholder="LSX / Số lô"
          value={filters.lsx}
          onChange={e => onFilterChange({ lsx: e.target.value })}
          onPressEnter={onSearch}
          style={{ width: 130 }}
          size="small"
          allowClear
        />
        <Select
          placeholder="Loại SP"
          value={filters.loaiSanPham || undefined}
          onChange={v => onFilterChange({ loaiSanPham: v ?? '' })}
          allowClear
          style={{ width: 140 }}
          size="small"
          options={loaiOptions.map(v => ({ label: v, value: v }))}
        />
        <Select
          placeholder="Tổ thực hiện"
          value={filters.toThucHien || undefined}
          onChange={v => onFilterChange({ toThucHien: v ?? '' })}
          allowClear
          style={{ width: 130 }}
          size="small"
          options={toOptions.map(v => ({ label: v, value: v }))}
        />
        <Button size="small" icon={<SearchOutlined />} type="primary" onClick={onSearch}>Tìm</Button>
        <Select
          mode="multiple"
          placeholder="Lọc theo tháng"
          value={selectedMonths}
          onChange={setSelectedMonths}
          allowClear
          style={{ minWidth: 160, maxWidth: 320 }}
          size="small"
          options={monthOptions}
          maxTagCount="responsive"
        />
        {selectedMonths.length > 0 && (
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            {displayData.length} / {(data || []).length} bản ghi
          </span>
        )}
        <Button
          size="small"
          icon={<FileExcelOutlined />}
          onClick={handleExportExcel}
          style={{ borderColor: '#16a34a', color: '#16a34a' }}
        >
          Xuất Excel
        </Button>
        {selectedRowKeys.length > 0 && (
          <Popconfirm
            title={`Xóa ${selectedRowKeys.length} bản ghi đã chọn?`}
            onConfirm={handleBulkDelete}
            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} loading={bulkDelLoading}>
              Xóa {selectedRowKeys.length} bản ghi
            </Button>
          </Popconfirm>
        )}
      </Space>
      <Table
        columns={cols}
        dataSource={displayData}
        rowKey="id"
        rowSelection={rowSelection}
        loading={loading}
        size="small"
        virtual
        scroll={{ x: 3800, y: 'calc(100vh - 310px)' }}
        bordered
        pagination={{
          ...pagination,
          total: selectedMonths.length ? displayData.length : pagination?.total,
          size: 'small',
          showSizeChanger: true,
          pageSizeOptions: ['100', '500', '1000', '3000'],
          showTotal: total => `Tổng ${total} bản ghi`,
          style: { margin: '8px 0 0' },
          onChange: onPaginationChange,
        }}
        rowClassName={(_, idx) => idx % 2 !== 0 ? 'row-alt' : ''}
        onRow={record => ({
          onClick: e => {
            if (e.target.closest('.ant-checkbox-wrapper') || e.target.closest('button') || e.target.closest('.ant-popconfirm')) return
            openDetail(record)
          },
          style: { cursor: 'pointer' },
        })}
      />

      <Modal
        open={!!detailRecord}
        onCancel={closeDetail}
        title={
          <span>
            Chi tiết sản lượng —{' '}
            <span style={{ color: '#0f766e', fontWeight: 700 }}>{detailRecord?.maBravo}</span>
            {detailRecord?.maTp && <span style={{ color: '#6d28d9', marginLeft: 8, fontSize: 13 }}>{detailRecord.maTp}</span>}
          </span>
        }
        width={860}
        centered
        destroyOnClose
        footer={
          editMode
            ? [
                <Button key="cancel" onClick={() => setEditMode(false)}>Hủy</Button>,
                <Button key="save" type="primary" loading={saving} onClick={handleSave}>Lưu</Button>,
              ]
            : [
                <Button key="edit" type="primary" onClick={startEdit}>Chỉnh sửa</Button>,
                <Button key="close" onClick={closeDetail}>Đóng</Button>,
              ]
        }
      >
        {detailRecord && (() => {
          const r = detailRecord
          const fmtTT = v => {
            if (!v) return <span style={{ color: '#d9d9d9' }}>—</span>
            return <Tag color={v === 'done' ? 'success' : 'processing'} style={{ margin: 0 }}>{v}</Tag>
          }
          const fmtNum = v => v != null ? <b style={{ color: '#0f766e' }}>{Number(v).toLocaleString('vi-VN')}</b> : <span style={{ color: '#d9d9d9' }}>—</span>
          const fmtDec = v => v != null ? <span style={{ color: '#c41d7f' }}>{Number(v).toFixed(2)}</span> : <span style={{ color: '#d9d9d9' }}>—</span>
          const fmtQA  = v => v != null ? <span style={{ color: '#0891b2' }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span>
          const labelStyle = { fontWeight: 600, color: '#334155', fontSize: 12 }
          const sectionTitle = (txt, color) => (
            <div style={{ background: color, color: '#fff', fontWeight: 700, fontSize: 12,
              padding: '4px 12px', borderRadius: 4, marginTop: 14, marginBottom: 6 }}>
              {txt}
            </div>
          )
          const EInt = (field) => (
            <InputNumber size="small" style={{ width: '100%' }} value={editVals[field] ?? null}
              onChange={v => ev(field, v)} min={0} />
          )
          const EDec = (field) => (
            <InputNumber size="small" style={{ width: '100%' }} value={editVals[field] ?? null}
              onChange={v => ev(field, v)} step={0.01} />
          )
          const ETT = (field) => (
            <Select size="small" style={{ width: '100%' }} allowClear value={editVals[field] || undefined}
              onChange={v => ev(field, v || null)}
              options={[{ label: 'doing', value: 'doing' }, { label: 'done', value: 'done' }]} />
          )
          const EStr = (field, rows = 1) => rows > 1
            ? <Input.TextArea size="small" rows={rows} value={editVals[field] || ''} onChange={e => ev(field, e.target.value)} />
            : <Input size="small" value={editVals[field] || ''} onChange={e => ev(field, e.target.value)} />

          return (
            <div style={{ fontSize: 13, maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 }}>
              {sectionTitle('Thông tin cơ bản', '#006666')}
              <Descriptions size="small" column={2} bordered labelStyle={labelStyle}>
                <Descriptions.Item label="Mã Bravo">{r.maBravo || '—'}</Descriptions.Item>
                <Descriptions.Item label="Mã TP">{r.maTp || '—'}</Descriptions.Item>
                <Descriptions.Item label="Tên SP" span={2}>{r.tienTrinh || '—'}</Descriptions.Item>
                <Descriptions.Item label="Loại SP">
                  {r.loaiSanPham ? <Tag color="geekblue" style={{ margin: 0 }}>{r.loaiSanPham}</Tag> : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Tổ thực hiện">
                  {r.toThucHien ? <Tag color="cyan" style={{ margin: 0 }}>{r.toThucHien}</Tag> : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="LSX / Số lô">{r.lsx || '—'}</Descriptions.Item>
                <Descriptions.Item label="NSX">{nsxFromLsx(r.lsx) || '—'}</Descriptions.Item>
                <Descriptions.Item label="Mã đơn hàng">{r.maDonHang || '—'}</Descriptions.Item>
                <Descriptions.Item label="SL kế hoạch">
                  {editMode ? EInt('soLuong') : fmtNum(r.soLuong)}
                </Descriptions.Item>
              </Descriptions>

              {sectionTitle('Trạng thái công đoạn', '#0369a1')}
              <Descriptions size="small" column={4} bordered labelStyle={labelStyle}>
                <Descriptions.Item label="PC">{editMode ? ETT('pcTrangThai') : fmtTT(r.pcTrangThai)}</Descriptions.Item>
                <Descriptions.Item label="PL">{editMode ? ETT('plTrangThai') : fmtTT(r.plTrangThai)}</Descriptions.Item>
                <Descriptions.Item label="ĐG">{editMode ? ETT('dgTrangThai') : fmtTT(r.dgTrangThai)}</Descriptions.Item>
                <Descriptions.Item label="BBC1">{editMode ? ETT('bbc1TrangThai') : fmtTT(r.bbc1TrangThai)}</Descriptions.Item>
              </Descriptions>

              {sectionTitle('Sản lượng', '#166534')}
              <Descriptions size="small" column={2} bordered labelStyle={labelStyle}>
                <Descriptions.Item label="SL PC">{editMode ? EInt('slPc') : fmtNum(r.slPc)}</Descriptions.Item>
                <Descriptions.Item label="SL PL">{editMode ? EInt('pcPl') : fmtNum(r.pcPl)}</Descriptions.Item>
                <Descriptions.Item label="SL ĐG">{editMode ? EInt('dg2') : fmtNum(r.dg2)}</Descriptions.Item>
                <Descriptions.Item label="SL BBC1">{editMode ? EInt('bbc1_2') : fmtNum(r.bbc1_2)}</Descriptions.Item>
                <Descriptions.Item label="SP Trung gian">{editMode ? EInt('spTrungGian') : fmtNum(r.spTrungGian)}</Descriptions.Item>
                <Descriptions.Item label="TP Nhập kho">{editMode ? EInt('tpNhapKho') : fmtNum(r.tpNhapKho)}</Descriptions.Item>
                <Descriptions.Item label="SL Trung bình" span={2}>{editMode ? EDec('slTrungBinh') : fmtNum(r.slTrungBinh)}</Descriptions.Item>
              </Descriptions>

              {sectionTitle('Chi phí công', '#7c2d12')}
              <Descriptions size="small" column={3} bordered labelStyle={labelStyle}>
                <Descriptions.Item label="BBC1">{editMode ? EDec('bbc1_3') : fmtDec(r.bbc1_3)}</Descriptions.Item>
                <Descriptions.Item label="PC">{editMode ? EDec('pcChiPhi') : fmtDec(r.pcChiPhi)}</Descriptions.Item>
                <Descriptions.Item label="PL">{editMode ? EDec('plChiPhi') : fmtDec(r.plChiPhi)}</Descriptions.Item>
                <Descriptions.Item label="ĐG">{editMode ? EDec('dgChiPhi') : fmtDec(r.dgChiPhi)}</Descriptions.Item>
                <Descriptions.Item label="CC">{editMode ? EDec('ccChiPhi') : fmtDec(r.ccChiPhi)}</Descriptions.Item>
                <Descriptions.Item label="GNNL">{editMode ? EDec('temDb') : fmtDec(r.temDb)}</Descriptions.Item>
              </Descriptions>

              {sectionTitle('QA Lấy mẫu', '#4c1d95')}
              <Descriptions size="small" column={2} bordered labelStyle={labelStyle}>
                <Descriptions.Item label="PL Tổng">{editMode ? EInt('plQaLayMau') : fmtQA(r.plQaLayMau)}</Descriptions.Item>
                <Descriptions.Item label="ĐG Tổng">{editMode ? EInt('dgQaLayMau') : fmtQA(r.dgQaLayMau)}</Descriptions.Item>
                <Descriptions.Item label="PL Kiểm nghiệm">{editMode ? EInt('plQaKiemNghiem') : fmtQA(r.plQaKiemNghiem)}</Descriptions.Item>
                <Descriptions.Item label="PL Lưu mẫu">{editMode ? EInt('plQaLuuMau') : fmtQA(r.plQaLuuMau)}</Descriptions.Item>
                <Descriptions.Item label="PL Khác">{editMode ? EInt('plQaKhac') : fmtQA(r.plQaKhac)}</Descriptions.Item>
                <Descriptions.Item label="ĐG Kiểm nghiệm">{editMode ? EInt('dgQaKiemNghiem') : fmtQA(r.dgQaKiemNghiem)}</Descriptions.Item>
                <Descriptions.Item label="ĐG Lưu mẫu">{editMode ? EInt('dgQaLuuMau') : fmtQA(r.dgQaLuuMau)}</Descriptions.Item>
                <Descriptions.Item label="ĐG Khác">{editMode ? EInt('dgQaKhac') : fmtQA(r.dgQaKhac)}</Descriptions.Item>
              </Descriptions>

              {sectionTitle('Ghi chú', '#374151')}
              <Descriptions size="small" column={1} bordered labelStyle={labelStyle}>
                <Descriptions.Item label="Mô tả">{editMode ? EStr('moTa', 2) : (r.moTa || '—')}</Descriptions.Item>
                <Descriptions.Item label="Ghi chú HS">{editMode ? EStr('ghiChuHieuSuat', 2) : (r.ghiChuHieuSuat || '—')}</Descriptions.Item>
              </Descriptions>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}

// ── Import Modal ──────────────────────────────────────────────────────────────
function ImportSanLuongModal({ open, onClose, onSuccess }) {
  const [fileList, setFileList] = useState([])
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/san-luong-tong-hop/template', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url
      a.download = 'mau_import_tong_hop_sl.xlsx'; a.click()
      URL.revokeObjectURL(url)
    } catch { message.error('Tải file mẫu thất bại') }
  }

  const handleUpload = async () => {
    if (!fileList.length) { message.warning('Vui lòng chọn file Excel'); return }
    setUploading(true); setResult(null)
    const fd = new FormData()
    fd.append('file', fileList[0].originFileObj)
    try {
      const { data } = await api.post('/san-luong-tong-hop/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
      if (data.created > 0) {
        message.success(`Import thành công: tạo ${data.created} bản ghi${data.skipped ? `, bỏ qua ${data.skipped} trùng` : ''}`)
        onSuccess?.()
      } else {
        message.info(`Không có bản ghi nào được tạo (${data.skipped} bị bỏ qua, ${data.errors?.length} lỗi)`)
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Import thất bại')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setFileList([]); setResult(null); onClose()
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={<span style={{ fontWeight: 700 }}>Import Tổng hợp Sản lượng từ Excel</span>}
      footer={null}
      width={520}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ padding: '10px 14px', background: '#f0f9ff', borderRadius: 6, border: '1px solid #bae6fd', fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Hướng dẫn:</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: '#374151' }}>
            <li>Tải file mẫu, điền dữ liệu vào sheet <b>SanLuong</b></li>
            <li>Cột <b style={{ color: '#1e4570' }}>Mã Bravo</b> và <b style={{ color: '#1e4570' }}>Mã TP</b> là bắt buộc</li>
            <li>Dữ liệu sẽ được thêm vào bảng <b style={{ color: '#7c3aed' }}>Tổng hợp SL</b>, không ảnh hưởng Danh sách</li>
            <li>Bản ghi trùng (Mã Bravo + LSX + Mã ĐH) sẽ bị bỏ qua</li>
          </ul>
        </div>

        <Button
          icon={<DownloadOutlined />}
          onClick={handleDownloadTemplate}
          style={{ borderColor: '#16a34a', color: '#16a34a', width: '100%' }}
        >
          Tải file mẫu (mau_import_tong_hop_sl.xlsx)
        </Button>

        <Upload
          accept=".xlsx,.xls"
          maxCount={1}
          fileList={fileList}
          beforeUpload={() => false}
          onChange={({ fileList: fl }) => setFileList(fl)}
        >
          <Button icon={<UploadOutlined />} style={{ width: '100%' }}>
            Chọn file Excel
          </Button>
        </Upload>

        {fileList.length > 0 && (
          <Button
            type="primary"
            loading={uploading}
            onClick={handleUpload}
            style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
          >
            {uploading ? 'Đang import...' : 'Bắt đầu Import'}
          </Button>
        )}

        {result && (
          <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }}>
            <div style={{ display: 'flex', gap: 20, marginBottom: result.errors?.length ? 8 : 0 }}>
              <span>✅ Tạo mới: <b style={{ color: '#16a34a' }}>{result.created}</b></span>
              <span>⏭ Bỏ qua (trùng): <b style={{ color: '#d97706' }}>{result.skipped}</b></span>
              {result.errors?.length > 0 && <span>❌ Lỗi: <b style={{ color: '#dc2626' }}>{result.errors.length}</b></span>}
            </div>
            {result.errors?.length > 0 && (
              <div style={{ maxHeight: 120, overflowY: 'auto', fontSize: 12, color: '#dc2626' }}>
                {result.errors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Phân Tích Sản Lượng Tab ───────────────────────────────────────────────────
const PIE_COLORS = ['#7b1fa2','#f57c00','#00695c','#1976d2','#c2185b','#0097a7','#d32f2f','#7cb342','#6a1b9a','#004d7f','#d84315','#558b2f','#00796b','#4a148c','#b71c1c']

const MACHINE_COLORS = {
  'Máy Nhũ Hóa 100L': '#00897b',
  'Máy Nhũ Hóa 300L': '#fb8c00',
  'Máy Nhũ Hóa 500L': '#1565c0',
  'Máy Nhũ Hóa 700L': '#d32f2f',
  'Máy Khuấy 700L':   '#e91e63',
  'Máy Khuấy 500L':   '#f57c00',
  'Thủ Công':         '#558b2f',
  '(Chua xac dinh)':  '#9e9e9e',
}
const machineColor = (name, idx) => MACHINE_COLORS[name] ?? PIE_COLORS[idx % PIE_COLORS.length]

function PhanTichSanLuongTab({ pmMap = {} }) {
  const [allData, setAllData] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filterMode, setFilterMode] = useState('all')
  const [customRange, setCustomRange] = useState(null)
  const [activeSubTab, setActiveSubTab] = useState(() => localStorage.getItem('phanTichSL_tab') || 'thoi_gian')
  const [detailGroup, setDetailGroup] = useState(null)

  useEffect(() => {
    if (loaded) return
    setLoading(true)
    api.get('/san-luong-tong-hop', { params: { page: 0, size: 9999 } })
      .then(({ data: res }) => { setAllData(res.content || []); setLoaded(true) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [loaded])

  const numPC      = r => Number(r.slPc)      || 0
  const numPL      = r => Number(r.pcPl)     || 0
  const numDG      = r => Number(r.dg2)      || 0
  const numBBC1    = r => Number(r.bbc1_2)   || 0
  const numTP      = r => numPL(r) + numDG(r) + numBBC1(r)
  const numCongPC  = r => (Number(r.pcChiPhi) || 0) + (Number(r.ccChiPhi) || 0)
  const numCongPL  = r => Number(r.plChiPhi) || 0
  const numCongDG  = r => Number(r.dgChiPhi) || 0
  const numCongBBC1= r => Number(r.bbc1_3)   || 0
  const fmtN    = v => Number(v || 0).toLocaleString('vi-VN')
  const hc = (extra = {}) => () => ({ style: { background: '#006666', color: '#fff', fontWeight: 700, fontSize: 11, padding: '8px 10px', whiteSpace: 'nowrap', ...extra } })

  const lsxToDate = lsx => {
    if (!lsx || lsx.length < 6) return null
    const dd = lsx.slice(0, 2), mm = lsx.slice(2, 4), yy = lsx.slice(4, 6)
    if (!/^\d{2}$/.test(dd) || !/^\d{2}$/.test(mm) || !/^\d{2}$/.test(yy)) return null
    return dayjs(`20${yy}-${mm}-${dd}`)
  }

  // ── Filtered data based on time range ──
  const filteredData = React.useMemo(() => {
    if (filterMode === 'all') return allData
    let from, to = dayjs()
    if (filterMode === 'today') { from = dayjs().startOf('day'); to = dayjs().endOf('day') }
    else if (filterMode === 'yesterday') { from = dayjs().subtract(1, 'day').startOf('day'); to = dayjs().subtract(1, 'day').endOf('day') }
    else if (filterMode === 'this_week') from = dayjs().startOf('week')
    else if (filterMode === 'last_week') { from = dayjs().subtract(1, 'week').startOf('week'); to = dayjs().subtract(1, 'week').endOf('week') }
    else if (filterMode === '1m') from = dayjs().startOf('month')
    else if (filterMode === 'last_month') { from = dayjs().subtract(1, 'month').startOf('month'); to = dayjs().subtract(1, 'month').endOf('month') }
    else if (filterMode === '3m') from = dayjs().subtract(3, 'month')
    else if (filterMode === '6m') from = dayjs().subtract(6, 'month')
    else if (filterMode === 'year') from = dayjs().startOf('year')
    else if (filterMode === 'last_year') { from = dayjs().subtract(1, 'year').startOf('year'); to = dayjs().subtract(1, 'year').endOf('year') }
    else if (filterMode === 'last_year_h1') { from = dayjs().subtract(1, 'year').startOf('year'); to = dayjs().subtract(1, 'year').month(5).endOf('month') }
    else if (filterMode === 'last_year_h2') { from = dayjs().subtract(1, 'year').month(6).startOf('month'); to = dayjs().subtract(1, 'year').endOf('year') }
    else if (filterMode === 'custom' && customRange?.[0] && customRange?.[1]) {
      from = customRange[0].startOf('day')
      to = customRange[1].endOf('day')
    } else return allData
    return allData.filter(r => {
      const d = lsxToDate(r.lsx)
      if (!d) return false
      return !d.isBefore(from) && !d.isAfter(to)
    })
  }, [allData, filterMode, customRange])

  // ── Summary ──
  const summary = React.useMemo(() => ({
    totalRecords: filteredData.length,
    totalSL: filteredData.reduce((s, r) => s + numDG(r), 0),
    uniqueTP: new Set(filteredData.map(r => r.maTp).filter(Boolean)).size,
    uniqueLoai: new Set(filteredData.map(r => r.loaiSanPham).filter(Boolean)).size,
  }), [filteredData])

  // ── Monthly ──
  const monthRows = React.useMemo(() => {
    const map = {}
    filteredData.forEach(r => {
      if (!r.lsx || r.lsx.length < 6) return
      const mm = r.lsx.slice(2, 4), yy = r.lsx.slice(4, 6)
      if (!/^\d{2}$/.test(mm) || !/^\d{2}$/.test(yy)) return
      const key = `${mm}/20${yy}`
      if (!map[key]) map[key] = { thang: key, _mm: Number(mm), _yy: Number(yy), count: 0, pl: 0, dg: 0, bbc1: 0 }
      map[key].count++
      map[key].pl   += numPL(r)
      map[key].dg   += numDG(r)
      map[key].bbc1 += numBBC1(r)
    })
    return Object.values(map)
      .sort((a, b) => a._yy !== b._yy ? a._yy - b._yy : a._mm - b._mm)
      .map(r => ({ ...r, tong: r.pl + r.dg + r.bbc1, tb: r.count > 0 ? Math.round((r.pl + r.dg + r.bbc1) / r.count) : 0 }))
  }, [filteredData])

  const monthTotal = React.useMemo(() => {
    const c = monthRows.reduce((s, r) => s + r.count, 0)
    const pl = monthRows.reduce((s, r) => s + r.pl, 0)
    const dg = monthRows.reduce((s, r) => s + r.dg, 0)
    const bbc1 = monthRows.reduce((s, r) => s + r.bbc1, 0)
    const tong = pl + dg + bbc1
    return { thang: 'TỔNG', count: c, pl, dg, bbc1, tong, tb: c > 0 ? Math.round(tong / c) : 0, _total: true }
  }, [monthRows])

  // ── Product types ──
  const productRows = React.useMemo(() => {
    const map = {}
    const totalSL = filteredData.reduce((s, r) => s + numTP(r), 0)
    filteredData.forEach(r => {
      const loai = r.loaiSanPham || '(Chưa phân loại)'
      if (!map[loai]) map[loai] = { loai, tpSet: new Set(), pl: 0, dg: 0, bbc1: 0 }
      if (r.maTp) map[loai].tpSet.add(r.maTp)
      map[loai].pl   += numPL(r)
      map[loai].dg   += numDG(r)
      map[loai].bbc1 += numBBC1(r)
    })
    const rows = Object.values(map).map(r => {
      const tong = r.pl + r.dg + r.bbc1
      return { ...r, soTp: r.tpSet.size, tong, pct: totalSL > 0 ? (tong / totalSL * 100).toFixed(1) : '0.0', tb: r.tpSet.size > 0 ? Math.round(tong / r.tpSet.size) : 0 }
    }).sort((a, b) => b.tong - a.tong)
    const tot = rows.reduce((s, r) => ({ pl: s.pl + r.pl, dg: s.dg + r.dg, bbc1: s.bbc1 + r.bbc1, soTp: s.soTp + r.soTp }), { pl: 0, dg: 0, bbc1: 0, soTp: 0 })
    return [...rows, { loai: 'TỔNG CỘNG', soTp: tot.soTp, pl: tot.pl, dg: tot.dg, bbc1: tot.bbc1, tong: tot.pl + tot.dg + tot.bbc1, pct: '100', tb: 0, _total: true }]
  }, [filteredData])

  // ── Machines — grouped by actual machine names from pmMap ──
  const machineRows = React.useMemo(() => {
    const map = {}
    const addMachine = (machineName, val, stage) => {
      if (!map[machineName]) map[machineName] = { name: machineName, total: 0, count: 0, max: 0, stages: new Set() }
      map[machineName].total += val
      map[machineName].count++
      if (val > map[machineName].max) map[machineName].max = val
      map[machineName].stages.add(stage)
    }
    filteredData.forEach(r => {
      const pm = pmMap[r.maBravo] || {}
      const plV = numPL(r)
      if (plV > 0) addMachine(pm.mayMocPl || '(Chưa xác định)', plV, 'PL')
      const dgV = numDG(r)
      if (dgV > 0) addMachine(pm.mayMocDg || '(Chưa xác định)', dgV, 'ĐG')
      const bbc1V = numBBC1(r)
      if (bbc1V > 0) addMachine(pm.mayMocBbc1 || '(Chưa xác định)', bbc1V, 'BBC1')
    })
    const totAll = Object.values(map).reduce((s, m) => s + m.total, 0)
    const rows = Object.values(map)
      .map(m => ({ ...m, avg: m.count > 0 ? Math.round(m.total / m.count) : 0, pct: totAll > 0 ? (m.total / totAll * 100).toFixed(1) : '0.0', stages: [...m.stages].join('/') }))
      .sort((a, b) => b.total - a.total)
    const totRow = { name: 'TỔNG', total: totAll, count: rows.reduce((s, r) => s + r.count, 0), avg: 0, max: 0, pct: '100.0', stages: '', _total: true }
    totRow.avg = totRow.count > 0 ? Math.round(totAll / totRow.count) : 0
    return [...rows, totRow]
  }, [filteredData, pmMap])

  // ── Monthly by loaiSanPham, split by to PCPL ──
  const makeMonthByLoai = (data, getVal = numPL) => {
    const map = {}
    const loais = new Set()
    data.forEach(r => {
      if (!r.lsx || r.lsx.length < 6) return
      const mm = r.lsx.slice(2, 4), yy = r.lsx.slice(4, 6)
      if (!/^\d{2}$/.test(mm) || !/^\d{2}$/.test(yy)) return
      const thang = `${mm}/20${yy}`
      const loai = r.loaiSanPham || '(Chua phan loai)'
      loais.add(loai)
      if (!map[thang]) map[thang] = { thang, _mm: Number(mm), _yy: Number(yy) }
      map[thang][loai] = (map[thang][loai] || 0) + getVal(r)
    })
    const rows = Object.values(map).sort((a, b) => a._yy !== b._yy ? a._yy - b._yy : a._mm - b._mm)
    return { rows, loais: [...loais].sort() }
  }
  const monthByLoaiPCPL1 = React.useMemo(() =>
    makeMonthByLoai(filteredData.filter(r => (r.toThucHien || '').toUpperCase() === 'PCPL1'))
  , [filteredData])
  const monthByLoaiPCPL2 = React.useMemo(() =>
    makeMonthByLoai(filteredData.filter(r => (r.toThucHien || '').toUpperCase() === 'PCPL2'))
  , [filteredData])
  const monthByLoaiCongPCPL2 = React.useMemo(() =>
    makeMonthByLoai(filteredData.filter(r => (r.toThucHien || '').toUpperCase() === 'PCPL2'), numCongPL)
  , [filteredData])
  const monthByLoaiCongPCPL1 = React.useMemo(() =>
    makeMonthByLoai(filteredData.filter(r => (r.toThucHien || '').toUpperCase() === 'PCPL1'), numCongPL)
  , [filteredData])

  // ── Cong by loaiSanPham (table) ──
  const congByLoaiRows = React.useMemo(() => {
    const map = {}
    filteredData.forEach(r => {
      const loai = r.loaiSanPham || '(Chưa phân loại)'
      if (!map[loai]) map[loai] = { loai, tpSet: new Set(), pcpl1: 0, pcpl2: 0, pl: 0, dg: 0, bbc1: 0 }
      if (r.maTp) map[loai].tpSet.add(r.maTp)
      const to = (r.toThucHien || '').toUpperCase()
      if (to === 'PCPL1') map[loai].pcpl1 += numCongPC(r)
      else if (to === 'PCPL2') map[loai].pcpl2 += numCongPC(r)
      map[loai].pl   += numCongPL(r)
      map[loai].dg   += numCongDG(r)
      map[loai].bbc1 += numCongBBC1(r)
    })
    const fmtC = v => Number(v || 0).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    const rows = Object.values(map).map(r => {
      const tong = r.pcpl1 + r.pcpl2 + r.pl + r.dg + r.bbc1
      return { ...r, soTp: r.tpSet.size, tong }
    }).sort((a, b) => b.tong - a.tong)
    const tot = rows.reduce((s, r) => ({ pcpl1: s.pcpl1+r.pcpl1, pcpl2: s.pcpl2+r.pcpl2, pl: s.pl+r.pl, dg: s.dg+r.dg, bbc1: s.bbc1+r.bbc1, soTp: s.soTp+r.soTp }), { pcpl1:0, pcpl2:0, pl:0, dg:0, bbc1:0, soTp:0 })
    return [...rows, { loai: 'TỔNG CỘNG', soTp: tot.soTp, pcpl1: tot.pcpl1, pcpl2: tot.pcpl2, pl: tot.pl, dg: tot.dg, bbc1: tot.bbc1, tong: tot.pcpl1+tot.pcpl2+tot.pl+tot.dg+tot.bbc1, _total: true }]
  }, [filteredData])

  // ── Năng suất trung bình theo tổ ──
  const groupNangSuat = React.useMemo(() => {
    const GROUPS = [
      { key: 'PCPL1', label: 'PCPL1', sub: '', color: '#1565c0', border: '#bbdefb',
        recs: filteredData.filter(r => (r.toThucHien || '').toUpperCase() === 'PCPL1'),
        getSL: r => Number(r.soLuong) || 0,
        getCong: r => (Number(r.pcChiPhi) || 0) + (Number(r.plChiPhi) || 0) },
      { key: 'PCPL2', label: 'PCPL2', sub: 'gồm Cân Chia', color: '#0891b2', border: '#cffafe',
        recs: filteredData.filter(r => (r.toThucHien || '').toUpperCase() === 'PCPL2'),
        getSL: r => Number(r.soLuong) || 0,
        getCong: r => (Number(r.pcChiPhi) || 0) + (Number(r.ccChiPhi) || 0) },
      { key: 'PCPL3', label: 'PCPL3 (PL)', sub: '', color: '#7c3aed', border: '#ede9fe',
        recs: filteredData,
        getSL: r => Number(r.pcPl) || 0,
        getCong: r => Number(r.plChiPhi) || 0 },
      { key: 'BBC1', label: 'BBC1', sub: '', color: '#0f766e', border: '#ccfbf1',
        recs: filteredData,
        getSL: r => Number(r.bbc1_2) || 0,
        getCong: r => Number(r.bbc1_3) || 0 },
      { key: 'DG', label: 'ĐG', sub: '', color: '#d97706', border: '#fef3c7',
        recs: filteredData,
        getSL: r => Number(r.dg2) || 0,
        getCong: r => Number(r.dgChiPhi) || 0 },
    ]
    return GROUPS.map(g => {
      let totalSL = 0, totalCong = 0, loCount = 0, nangSuatSum = 0, nangSuatCount = 0
      const detailRecs = []
      g.recs.forEach(r => {
        const sl = g.getSL(r); const cong = g.getCong(r)
        if (cong > 0) { totalSL += sl; totalCong += cong }
        if (sl > 0) loCount++
        if (sl > 0 && cong > 0) { nangSuatSum += sl / cong; nangSuatCount++ }
        if (sl > 0 || cong > 0) detailRecs.push({
          id: r.id, lsx: r.lsx, maTp: r.maTp,
          tenSp: r.tienTrinh || pmMap[r.maBravo]?.tenSanPham || '',
          toThucHien: r.toThucHien || '',
          soLuong: r.soLuong, sl, cong,
          ns: cong > 0 ? Math.round(sl / cong) : null,
        })
      })
      return { ...g, recs: undefined, totalSL, totalCong, loCount, detailRecs,
        nangSuat: totalCong > 0 ? Math.round(totalSL / totalCong) : null,
        nangSuatTB: nangSuatCount > 0 ? Math.round(nangSuatSum / nangSuatCount) : null,
        slTb: loCount > 0 ? Math.round(totalSL / loCount) : null }
    })
  }, [filteredData])

  // ── Monthly cong by to ──
  const monthCongByTo = React.useMemo(() => {
    const map = {}
    filteredData.forEach(r => {
      if (!r.lsx || r.lsx.length < 6) return
      const mm = r.lsx.slice(2, 4), yy = r.lsx.slice(4, 6)
      if (!/^\d{2}$/.test(mm) || !/^\d{2}$/.test(yy)) return
      const thang = `${mm}/20${yy}`
      if (!map[thang]) map[thang] = { thang, _mm: Number(mm), _yy: Number(yy), PCPL1: 0, PCPL2: 0, PL: 0, ĐG: 0, BBC1: 0 }
      const to = (r.toThucHien || '').toUpperCase()
      if (to === 'PCPL1') map[thang].PCPL1 += numCongPC(r)
      else if (to === 'PCPL2') map[thang].PCPL2 += numCongPC(r)
      map[thang].PL   += numCongPL(r)
      map[thang]['ĐG'] += numCongDG(r)
      map[thang].BBC1 += numCongBBC1(r)
    })
    return Object.values(map).sort((a, b) => a._yy !== b._yy ? a._yy - b._yy : a._mm - b._mm)
  }, [filteredData])

  // ── Monthly by PL machine (pha che) ──
  const monthByMachinePl = React.useMemo(() => {
    const map = {}
    const machines = new Set()
    filteredData.forEach(r => {
      if (!r.lsx || r.lsx.length < 6) return
      const mm = r.lsx.slice(2, 4), yy = r.lsx.slice(4, 6)
      if (!/^\d{2}$/.test(mm) || !/^\d{2}$/.test(yy)) return
      const thang = `${mm}/20${yy}`
      const pm = pmMap[r.maBravo] || {}
      const plV = numPL(r)
      if (plV > 0) {
        const mName = pm.mayMocPl || '(Chua xac dinh)'
        machines.add(mName)
        if (!map[thang]) map[thang] = { thang, _mm: Number(mm), _yy: Number(yy) }
        map[thang][mName] = (map[thang][mName] || 0) + plV
      }
    })
    const rows = Object.values(map).sort((a, b) => a._yy !== b._yy ? a._yy - b._yy : a._mm - b._mm)
    return { rows, machines: [...machines].sort() }
  }, [filteredData, pmMap])

  // ── Machine pivot tables by stage ──
  const machineTimeData = React.useMemo(() => {
    const numPCVal = r => numPC(r) || Number(r.soLuong) || 0
    const buildStage = (data, getMachine, getVal) => {
      const monthMap = {}
      const machineSet = new Set()
      data.forEach(r => {
        if (!r.lsx || r.lsx.length < 6) return
        const mm = r.lsx.slice(2, 4), yy = r.lsx.slice(4, 6)
        if (!/^\d{2}$/.test(mm) || !/^\d{2}$/.test(yy)) return
        const val = getVal(r)
        if (val === 0) return
        const thang = `${mm}/20${yy}`
        const mName = getMachine(r) || '(Chua xac dinh)'
        machineSet.add(mName)
        if (!monthMap[thang]) monthMap[thang] = { thang, _mm: Number(mm), _yy: Number(yy) }
        monthMap[thang][mName] = (monthMap[thang][mName] || 0) + val
      })
      const machines = [...machineSet].sort()
      const rows = Object.values(monthMap)
        .sort((a, b) => a._yy !== b._yy ? a._yy - b._yy : a._mm - b._mm)
        .map(r => ({ ...r, _rowTotal: machines.reduce((s, m) => s + (r[m] || 0), 0) }))
      const totRow = { thang: 'TỔNG', _total: true, _rowTotal: 0 }
      machines.forEach(m => { totRow[m] = rows.reduce((s, r) => s + (r[m] || 0), 0); totRow._rowTotal += totRow[m] })
      return { machines, rows: [...rows, totRow] }
    }
    const pcpl1 = filteredData.filter(r => (r.toThucHien || '').toUpperCase() === 'PCPL1')
    const pcpl2 = filteredData.filter(r => (r.toThucHien || '').toUpperCase() === 'PCPL2')
    const getMachinePC  = r => (pmMap[r.maBravo] || {}).mayMocPc
    const getMachinePL  = r => (pmMap[r.maBravo] || {}).mayMocPl
    const getMachineBBC = r => (pmMap[r.maBravo] || {}).mayMocBbc1
    const getMachineDG  = r => (pmMap[r.maBravo] || {}).mayMocDg
    return [
      { key: 'PC_pcpl1', label: 'PC — Thiết Bị Pha Chế (Tổ PCPL1)', color: '#1565c0', ...buildStage(pcpl1, getMachinePC, numPCVal) },
      { key: 'PC_pcpl2', label: 'PC — Thiết Bị Pha Chế (Tổ PCPL2)', color: '#0891b2', ...buildStage(pcpl2, getMachinePC, numPCVal) },
      { key: 'PL',       label: 'PL — Thiết Bị Chiết',               color: '#7b1fa2', ...buildStage(filteredData, getMachinePL,  numPL)    },
      { key: 'BBC1',     label: 'BBC1 — Thiết Bị BBC',                color: '#00695c', ...buildStage(filteredData, getMachineBBC, numBBC1)  },
      { key: 'DG',       label: 'ĐG — Thiết Bị Đóng Gói',            color: '#e65100', ...buildStage(filteredData, getMachineDG,  numDG)    },
    ]
  }, [filteredData, pmMap])

  // ── Machine pivot — Cong thuc hien ──
  const machineTimeDataCong = React.useMemo(() => {
    const buildStage = (data, getMachine, getVal) => {
      const monthMap = {}
      const machineSet = new Set()
      data.forEach(r => {
        if (!r.lsx || r.lsx.length < 6) return
        const mm = r.lsx.slice(2, 4), yy = r.lsx.slice(4, 6)
        if (!/^\d{2}$/.test(mm) || !/^\d{2}$/.test(yy)) return
        const val = getVal(r)
        if (!val) return
        const thang = `${mm}/20${yy}`
        const mName = getMachine(r) || '(Chua xac dinh)'
        machineSet.add(mName)
        if (!monthMap[thang]) monthMap[thang] = { thang, _mm: Number(mm), _yy: Number(yy) }
        monthMap[thang][mName] = (monthMap[thang][mName] || 0) + val
      })
      return {
        machines: [...machineSet].sort(),
        rows: Object.values(monthMap).sort((a, b) => a._yy !== b._yy ? a._yy - b._yy : a._mm - b._mm),
      }
    }
    const pcpl1 = filteredData.filter(r => (r.toThucHien || '').toUpperCase() === 'PCPL1')
    const pcpl2 = filteredData.filter(r => (r.toThucHien || '').toUpperCase() === 'PCPL2')
    const getMachinePC  = r => (pmMap[r.maBravo] || {}).mayMocPc
    const getMachinePL  = r => (pmMap[r.maBravo] || {}).mayMocPl
    const getMachineBBC = r => (pmMap[r.maBravo] || {}).mayMocBbc1
    const getMachineDG  = r => (pmMap[r.maBravo] || {}).mayMocDg
    return [
      { key: 'PC_pcpl1', label: 'PC — Công Pha Chế (Tổ PCPL1)', color: '#1565c0', ...buildStage(pcpl1, getMachinePC,  numCongPC)   },
      { key: 'PC_pcpl2', label: 'PC — Công Pha Chế (Tổ PCPL2)', color: '#0891b2', ...buildStage(pcpl2, getMachinePC,  numCongPC)   },
      { key: 'PL_c',     label: 'PL — Công Chiết',              color: '#7b1fa2', ...buildStage(filteredData, getMachinePL,  numCongPL)   },
      { key: 'BBC1_c',   label: 'BBC1 — Công BBC',              color: '#00695c', ...buildStage(filteredData, getMachineBBC, numCongBBC1) },
      { key: 'DG_c',     label: 'ĐG — Công Đóng Gói',          color: '#e65100', ...buildStage(filteredData, getMachineDG,  numCongDG)   },
    ]
  }, [filteredData, pmMap])

  // ── Top 15 ──
  const top15Rows = React.useMemo(() => {
    const map = {}
    filteredData.forEach(r => {
      const key = `${r.maTp || ''}|${r.lsx || ''}`
      if (!map[key]) map[key] = { maTp: r.maTp, tienTrinh: r.tienTrinh, loaiSanPham: r.loaiSanPham, lsx: r.lsx, pl: 0, dg: 0, bbc1: 0 }
      map[key].pl   += numPL(r)
      map[key].dg   += numDG(r)
      map[key].bbc1 += numBBC1(r)
    })
    return Object.values(map).map(r => ({ ...r, tong: r.pl + r.dg + r.bbc1, thang: (() => {
      if (!r.lsx || r.lsx.length < 6) return ''
      const mm = r.lsx.slice(2, 4), yy = r.lsx.slice(4, 6)
      return /^\d{2}$/.test(mm) && /^\d{2}$/.test(yy) ? `${mm}/20${yy}` : ''
    })() }))
      .sort((a, b) => b.tong - a.tong)
      .slice(0, 15)
  }, [filteredData])

  const totalRowStyle = { background: '#e8f5f5', fontWeight: 700 }
  const onRow = r => r._total ? { style: totalRowStyle } : {}

  // Chart data
  const chartMonthData = monthRows.map(r => ({ name: r.thang, PL: r.pl, ĐG: r.dg, BBC1: r.bbc1 }))
  const chartPieData   = productRows.filter(r => !r._total).slice(0, 10).map(r => ({ name: r.loai, value: r.tong }))
  const chartBarData   = machineRows.filter(r => !r._total).slice(0, 12).map(r => ({ name: r.name, 'Tổng SL': r.total }))

  const CARD_COLORS = ['#006666','#7b1fa2','#0891b2','#b45309']
  const summaryCards = [
    { label: 'Tổng Bản Ghi', value: summary.totalRecords, unit: 'sản phẩm/LSX' },
    { label: 'Tổng Sản Lượng (ĐG)', value: summary.totalSL, unit: 'đơn vị đóng gói' },
    { label: 'Loại Sản Phẩm', value: summary.uniqueLoai, unit: 'loại' },
    { label: 'Sản Phẩm Khác Nhau', value: summary.uniqueTP, unit: 'mã TP' },
  ]

  const PRESETS = [
    { key: 'today', label: 'Hôm nay' },
    { key: 'yesterday', label: 'Hôm qua' },
    { key: 'this_week', label: 'Tuần này' },
    { key: 'last_week', label: 'Tuần trước' },
    { key: '1m', label: 'Tháng này' },
    { key: 'last_month', label: 'Tháng trước' },
    { key: '3m', label: '3 Tháng' },
    { key: '6m', label: '6 Tháng' },
    { key: 'year', label: 'Năm nay' },
    { key: 'last_year', label: 'Năm ngoái' },
    { key: 'last_year_h1', label: '6T đầu năm ngoái' },
    { key: 'last_year_h2', label: '6T cuối năm ngoái' },
    { key: 'all', label: 'Tất cả' },
  ]

  const subItems = [
    {
      key: 'thoi_gian',
      label: <span style={{ color: '#0000CC' }}>Theo Thời Gian</span>,
      children: (
        <div>
          <Table size="small" bordered columns={[
            { title: 'Tháng/Năm', dataIndex: 'thang', key: 'thang', width: 100, onHeaderCell: hc({ textAlign: 'left' }), render: (v, r) => r._total ? <b>{v}</b> : v },
            { title: 'Số Bản Ghi', dataIndex: 'count', key: 'count', width: 100, align: 'right', onHeaderCell: hc(), render: fmtN },
            { title: 'PL', dataIndex: 'pl', key: 'pl', width: 120, align: 'right', onHeaderCell: hc(), render: (v, r) => r._total ? <b style={{ color: '#7b1fa2' }}>{fmtN(v)}</b> : <span style={{ color: '#7b1fa2' }}>{fmtN(v)}</span> },
            { title: 'ĐG', dataIndex: 'dg', key: 'dg', width: 120, align: 'right', onHeaderCell: hc(), render: (v, r) => r._total ? <b style={{ color: '#f57c00' }}>{fmtN(v)}</b> : <span style={{ color: '#f57c00' }}>{fmtN(v)}</span> },
            { title: 'BBC1', dataIndex: 'bbc1', key: 'bbc1', width: 120, align: 'right', onHeaderCell: hc(), render: (v, r) => r._total ? <b style={{ color: '#00695c' }}>{fmtN(v)}</b> : <span style={{ color: '#00695c' }}>{fmtN(v)}</span> },
            { title: 'Tổng SL', dataIndex: 'tong', key: 'tong', width: 130, align: 'right', onHeaderCell: hc(), render: v => <b>{fmtN(v)}</b> },
            { title: 'SL TB/BG', dataIndex: 'tb', key: 'tb', width: 100, align: 'right', onHeaderCell: hc(), render: fmtN },
          ]} dataSource={[...monthRows, monthTotal]} rowKey="thang" pagination={false} onRow={onRow} style={{ marginBottom: 16 }} />
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
            <div style={{ textAlign: 'center', fontWeight: 600, color: '#006666', marginBottom: 8 }}>Xu Hướng Sản Lượng Hàng Tháng (PL / ĐG / BBC1)</div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartMonthData} margin={{ top: 8, right: 20, left: 10, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                <RechartTooltip formatter={(v, n) => [Number(v).toLocaleString('vi-VN'), n]} />
                <Legend />
                <Line type="monotone" dataKey="PL"   stroke="#7b1fa2" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="ĐG"   stroke="#f57c00" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="BBC1"  stroke="#00695c" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ),
    },
    {
      key: 'san_pham',
      label: <span style={{ color: '#0000CC' }}>Theo Sản Phẩm</span>,
      children: (
        <div>
          <Table size="small" bordered columns={[
            { title: 'Loại Sản Phẩm', dataIndex: 'loai', key: 'loai', onHeaderCell: hc({ textAlign: 'left' }), render: (v, r) => r._total ? <b>{v}</b> : v },
            { title: 'Số TP', dataIndex: 'soTp', key: 'soTp', width: 80, align: 'right', onHeaderCell: hc(), render: fmtN },
            { title: 'PL', dataIndex: 'pl', key: 'pl', width: 120, align: 'right', onHeaderCell: hc(), render: v => <span style={{ color: '#7b1fa2' }}>{fmtN(v)}</span> },
            { title: 'ĐG', dataIndex: 'dg', key: 'dg', width: 120, align: 'right', onHeaderCell: hc(), render: v => <span style={{ color: '#f57c00' }}>{fmtN(v)}</span> },
            { title: 'BBC1', dataIndex: 'bbc1', key: 'bbc1', width: 120, align: 'right', onHeaderCell: hc(), render: v => <span style={{ color: '#00695c' }}>{fmtN(v)}</span> },
            { title: 'Tổng SL', dataIndex: 'tong', key: 'tong', width: 130, align: 'right', onHeaderCell: hc(), render: v => <b>{fmtN(v)}</b> },
            { title: '% Tổng', dataIndex: 'pct', key: 'pct', width: 80, align: 'right', onHeaderCell: hc(), render: v => `${v}%` },
            { title: 'SL TB/TP', dataIndex: 'tb', key: 'tb', width: 100, align: 'right', onHeaderCell: hc(), render: (v, r) => r._total ? '—' : fmtN(v) },
          ]} dataSource={productRows} rowKey="loai" pagination={false} onRow={onRow} style={{ marginBottom: 16 }} />
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.08)', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%' }}>
              <div style={{ textAlign: 'center', fontWeight: 600, color: '#006666', marginBottom: 8 }}>Phân Bố Sản Lượng Theo Loại Sản Phẩm</div>
              <ResponsiveContainer width="100%" height={360}>
                <PieChart>
                  <Pie data={chartPieData} cx="50%" cy="50%" outerRadius={140} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(1)}%`} labelLine>
                    {chartPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <RechartTooltip formatter={v => Number(v).toLocaleString('vi-VN')} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          {[{ label: 'Tổ PCPL1', data: monthByLoaiPCPL1 }, { label: 'Tổ PCPL2', data: monthByLoaiPCPL2 }].map(({ label, data }) => (
            <div key={label} style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginTop: 16 }}>
              <div style={{ textAlign: 'center', fontWeight: 600, color: '#006666', marginBottom: 8 }}>
                Xu Hướng SL Hàng Tháng Theo Loại Sản Phẩm — <span style={{ color: '#7b1fa2' }}>{label}</span>
              </div>
              {data.rows.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#aaa', padding: '24px 0' }}>Không có dữ liệu</div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={data.rows} margin={{ top: 8, right: 20, left: 10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="thang" angle={-45} textAnchor="end" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                    <RechartTooltip formatter={(v, n) => [Number(v).toLocaleString('vi-VN'), n]} />
                    <Legend wrapperStyle={{ paddingTop: 8 }} />
                    {data.loais.map((loai, i) => (
                      <Line key={loai} type="monotone" dataKey={loai} stroke={PIE_COLORS[i % PIE_COLORS.length]} dot={false} strokeWidth={2} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          ))}
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginTop: 16 }}>
            <div style={{ textAlign: 'center', fontWeight: 600, color: '#b45309', marginBottom: 8 }}>
              Xu Hướng Công Hàng Tháng Theo Loại Sản Phẩm — <span style={{ color: '#7b1fa2' }}>Tổ PCPL2</span>
            </div>
            {monthByLoaiCongPCPL2.rows.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#aaa', padding: '24px 0' }}>Không có dữ liệu</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={monthByLoaiCongPCPL2.rows} margin={{ top: 8, right: 20, left: 10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="thang" angle={-45} textAnchor="end" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}K` : Number(v).toFixed(1)} />
                  <RechartTooltip formatter={(v, n) => [Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 2 }), n]} />
                  <Legend wrapperStyle={{ paddingTop: 8 }} />
                  {monthByLoaiCongPCPL2.loais.map((loai, i) => (
                    <Line key={loai} type="monotone" dataKey={loai} stroke={PIE_COLORS[i % PIE_COLORS.length]} dot={false} strokeWidth={2} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'may_moc',
      label: <span style={{ color: '#0000CC' }}>Theo Máy Móc</span>,
      children: (
        <div>
          <Table size="small" bordered columns={[
            { title: 'Tên Máy Móc', dataIndex: 'name', key: 'name', ellipsis: true, onHeaderCell: hc({ textAlign: 'left' }), render: (v, r) => r._total ? <b>{v}</b> : <span style={{ color: '#006666', fontWeight: 500 }}>{v}</span> },
            { title: 'Công Đoạn', dataIndex: 'stages', key: 'stages', width: 110, align: 'center', onHeaderCell: hc(), render: v => v ? v.split('/').map(s => <Tag key={s} color={s==='PL'?'purple':s==='ĐG'?'orange':'cyan'} style={{ margin: '1px', fontSize: 11 }}>{s}</Tag>) : '—' },
            { title: 'Tổng SL', dataIndex: 'total', key: 'total', width: 140, align: 'right', onHeaderCell: hc(), render: v => <b>{fmtN(v)}</b> },
            { title: 'Số BG', dataIndex: 'count', key: 'count', width: 80, align: 'right', onHeaderCell: hc(), render: fmtN },
            { title: 'SL TB/BG', dataIndex: 'avg', key: 'avg', width: 110, align: 'right', onHeaderCell: hc(), render: fmtN },
            { title: 'SL Max', dataIndex: 'max', key: 'max', width: 110, align: 'right', onHeaderCell: hc(), render: (v, r) => r._total ? '—' : fmtN(v) },
            { title: '% Tổng', dataIndex: 'pct', key: 'pct', width: 80, align: 'right', onHeaderCell: hc(), render: v => `${v}%` },
          ]} dataSource={machineRows} rowKey="name" pagination={false} onRow={onRow} style={{ marginBottom: 16 }} />
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
            <div style={{ textAlign: 'center', fontWeight: 600, color: '#006666', marginBottom: 8 }}>Sản Lượng Theo Máy Móc (Top 12)</div>
            <ResponsiveContainer width="100%" height={Math.max(300, chartBarData.length * 44 + 60)}>
              <BarChart data={chartBarData} layout="vertical" margin={{ top: 8, right: 80, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 10 }} />
                <RechartTooltip formatter={v => Number(v).toLocaleString('vi-VN')} />
                <Bar dataKey="Tổng SL" fill="#006666" label={{ position: 'right', fontSize: 10, formatter: v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K` }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {monthByMachinePl.machines.length > 0 && (
            <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginTop: 16 }}>
              <div style={{ textAlign: 'center', fontWeight: 600, color: '#006666', marginBottom: 8 }}>Xu Hướng SL Thiết Bị Pha Chế Hàng Tháng</div>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={monthByMachinePl.rows} margin={{ top: 8, right: 20, left: 10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="thang" angle={-45} textAnchor="end" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                  <RechartTooltip formatter={(v, n) => [Number(v).toLocaleString('vi-VN'), n]} />
                  <Legend wrapperStyle={{ paddingTop: 8 }} />
                  {monthByMachinePl.machines.map((m, i) => (
                    <Line key={m} type="monotone" dataKey={m} stroke={machineColor(m, i)} dot={false} strokeWidth={2} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#006666', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #b2dfdb' }}>
              Phân Tích Theo Thời Gian — Sản Lượng Từng Công Đoạn
            </div>
            {machineTimeData.map((stage, si) => (
              <div key={stage.key} style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 6, height: 22, borderRadius: 3, background: stage.color }} />
                  <span style={{ fontWeight: 700, fontSize: 14, color: stage.color }}>{stage.label}</span>
                </div>
                {stage.machines.length === 0 ? (
                  <div style={{ color: '#aaa', fontSize: 13, paddingLeft: 14 }}>Chưa có dữ liệu máy móc</div>
                ) : (
                  <div style={{ background: '#fff', padding: '16px 16px 8px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.07)', border: `1px solid ${stage.color}22` }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={stage.rows.filter(r => !r._total)} margin={{ top: 8, right: 24, left: 10, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="thang" angle={-45} textAnchor="end" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                        <RechartTooltip formatter={(v, n) => [Number(v).toLocaleString('vi-VN'), n]} />
                        <Legend wrapperStyle={{ paddingTop: 8 }} />
                        {stage.machines.map((m, i) => (
                          <Line key={m} type="monotone" dataKey={m} stroke={machineColor(m, i)} dot={false} strokeWidth={2} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 32 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#b45309', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #fde68a' }}>
              Phân Tích Theo Thời Gian — Tổng Công Thực Hiện Từng Công Đoạn
            </div>
            {machineTimeDataCong.map((stage, si) => (
              <div key={stage.key} style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 6, height: 22, borderRadius: 3, background: stage.color }} />
                  <span style={{ fontWeight: 700, fontSize: 14, color: stage.color }}>{stage.label}</span>
                </div>
                {stage.machines.length === 0 ? (
                  <div style={{ color: '#aaa', fontSize: 13, paddingLeft: 14 }}>Chưa có dữ liệu</div>
                ) : (
                  <div style={{ background: '#fff', padding: '16px 16px 8px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.07)', border: `1px solid ${stage.color}22` }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={stage.rows} margin={{ top: 8, right: 24, left: 10, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="thang" angle={-45} textAnchor="end" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}K` : Number(v).toFixed(1)} />
                        <RechartTooltip formatter={(v, n) => [Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 2 }), n]} />
                        <Legend wrapperStyle={{ paddingTop: 8 }} />
                        {stage.machines.map((m, i) => (
                          <Line key={m} type="monotone" dataKey={m} stroke={machineColor(m, i)} dot={false} strokeWidth={2} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: 'top15',
      label: <span style={{ color: '#0000CC' }}>Top 15 SP</span>,
      children: (
        <Table size="small" bordered columns={[
          { title: 'STT', key: 'stt', width: 48, align: 'center', onHeaderCell: hc(), render: (_, __, i) => <b>{i + 1}</b> },
          { title: 'Mã TP', dataIndex: 'maTp', key: 'maTp', width: 90, onHeaderCell: hc(), render: v => <Tag color="pink" style={{ fontSize: 11, margin: 0 }}>{v}</Tag> },
          { title: 'Tên Sản Phẩm', dataIndex: 'tienTrinh', key: 'tienTrinh', ellipsis: true, onHeaderCell: hc({ textAlign: 'left' }) },
          { title: 'Loại SP', dataIndex: 'loaiSanPham', key: 'loaiSanPham', width: 120, onHeaderCell: hc(), render: v => v ? <Tag color="geekblue" style={{ fontSize: 11, margin: 0 }}>{v}</Tag> : '—' },
          { title: 'Tháng', dataIndex: 'thang', key: 'thang', width: 90, align: 'center', onHeaderCell: hc() },
          { title: 'PL', dataIndex: 'pl', key: 'pl', width: 100, align: 'right', onHeaderCell: hc(), render: v => <span style={{ color: '#7b1fa2' }}>{fmtN(v)}</span> },
          { title: 'ĐG', dataIndex: 'dg', key: 'dg', width: 100, align: 'right', onHeaderCell: hc(), render: v => <span style={{ color: '#f57c00' }}>{fmtN(v)}</span> },
          { title: 'BBC1', dataIndex: 'bbc1', key: 'bbc1', width: 100, align: 'right', onHeaderCell: hc(), render: v => <span style={{ color: '#00695c' }}>{fmtN(v)}</span> },
          { title: 'Tổng SL', dataIndex: 'tong', key: 'tong', width: 120, align: 'right', onHeaderCell: hc(), render: v => <b style={{ color: '#0f766e' }}>{fmtN(v)}</b> },
        ]} dataSource={top15Rows} rowKey={(_, i) => i} pagination={false} />
      ),
    },
    {
      key: 'phan_tich_cong',
      label: <span style={{ color: '#0000CC' }}>Phân Tích Công</span>,
      children: (
        <div>
          {/* Bảng Công theo Loại Sản Phẩm */}
          <Table size="small" bordered columns={[
            { title: 'Loại Sản Phẩm', dataIndex: 'loai', key: 'loai', onHeaderCell: hc({ textAlign: 'left' }), render: (v, r) => r._total ? <b>{v}</b> : v },
            { title: 'Số TP', dataIndex: 'soTp', key: 'soTp', width: 70, align: 'right', onHeaderCell: hc(), render: fmtN },
            { title: 'Công PC+CC (PCPL1)', dataIndex: 'pcpl1', key: 'pcpl1', width: 150, align: 'right', onHeaderCell: hc(), render: (v, r) => <span style={{ color: '#1565c0', fontWeight: r._total ? 700 : 400 }}>{Number(v||0).toLocaleString('vi-VN',{maximumFractionDigits:1})}</span> },
            { title: 'Công PC+CC (PCPL2)', dataIndex: 'pcpl2', key: 'pcpl2', width: 150, align: 'right', onHeaderCell: hc(), render: (v, r) => <span style={{ color: '#0891b2', fontWeight: r._total ? 700 : 400 }}>{Number(v||0).toLocaleString('vi-VN',{maximumFractionDigits:1})}</span> },
            { title: 'Công PL', dataIndex: 'pl', key: 'pl', width: 110, align: 'right', onHeaderCell: hc(), render: (v, r) => <span style={{ color: '#7b1fa2', fontWeight: r._total ? 700 : 400 }}>{Number(v||0).toLocaleString('vi-VN',{maximumFractionDigits:1})}</span> },
            { title: 'Công ĐG', dataIndex: 'dg', key: 'dg', width: 110, align: 'right', onHeaderCell: hc(), render: (v, r) => <span style={{ color: '#e65100', fontWeight: r._total ? 700 : 400 }}>{Number(v||0).toLocaleString('vi-VN',{maximumFractionDigits:1})}</span> },
            { title: 'Công BBC1', dataIndex: 'bbc1', key: 'bbc1', width: 110, align: 'right', onHeaderCell: hc(), render: (v, r) => <span style={{ color: '#00695c', fontWeight: r._total ? 700 : 400 }}>{Number(v||0).toLocaleString('vi-VN',{maximumFractionDigits:1})}</span> },
            { title: 'Tổng Công', dataIndex: 'tong', key: 'tong', width: 120, align: 'right', onHeaderCell: hc(), render: (v, r) => <b style={{ color: r._total ? '#b45309' : '#374151' }}>{Number(v||0).toLocaleString('vi-VN',{maximumFractionDigits:1})}</b> },
          ]} dataSource={congByLoaiRows} rowKey="loai" pagination={false} onRow={onRow} style={{ marginBottom: 24 }} />

          {/* Chart: Xu Hướng Công Hàng Tháng Theo Tổ */}
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 24 }}>
            <div style={{ textAlign: 'center', fontWeight: 600, color: '#b45309', marginBottom: 8 }}>Xu Hướng Công Hàng Tháng Theo Tổ</div>
            {monthCongByTo.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#aaa', padding: '24px 0' }}>Không có dữ liệu</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={monthCongByTo} margin={{ top: 8, right: 20, left: 10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="thang" angle={-45} textAnchor="end" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}K` : Number(v).toFixed(1)} />
                  <RechartTooltip formatter={(v, n) => [Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 1 }), n]} />
                  <Legend />
                  <Line type="monotone" dataKey="PCPL1" name="PCPL1 (gồm CC)" stroke="#1565c0" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="PCPL2" name="PCPL2 (gồm CC)" stroke="#0891b2" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="PL"    stroke="#7b1fa2" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="ĐG"    stroke="#e65100" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="BBC1"  stroke="#00695c" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Charts: Xu Hướng Công Theo Loại SP — PCPL1 & PCPL2 */}
          {[{ label: 'Tổ PCPL1', data: monthByLoaiCongPCPL1 }, { label: 'Tổ PCPL2', data: monthByLoaiCongPCPL2 }].map(({ label, data }) => (
            <div key={label} style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 24 }}>
              <div style={{ textAlign: 'center', fontWeight: 600, color: '#b45309', marginBottom: 8 }}>
                Xu Hướng Công Hàng Tháng Theo Loại Sản Phẩm — <span style={{ color: '#7b1fa2' }}>{label}</span>
              </div>
              {data.rows.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#aaa', padding: '24px 0' }}>Không có dữ liệu</div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={data.rows} margin={{ top: 8, right: 20, left: 10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="thang" angle={-45} textAnchor="end" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}K` : Number(v).toFixed(1)} />
                    <RechartTooltip formatter={(v, n) => [Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 1 }), n]} />
                    <Legend wrapperStyle={{ paddingTop: 8 }} />
                    {data.loais.map((loai, i) => (
                      <Line key={loai} type="monotone" dataKey={loai} stroke={PIE_COLORS[i % PIE_COLORS.length]} dot={false} strokeWidth={2} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          ))}

          {/* Charts: Công Theo Máy Móc Từng Công Đoạn */}
          <div style={{ fontWeight: 700, fontSize: 15, color: '#b45309', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #fde68a' }}>
            Phân Tích Công Theo Máy Móc Từng Công Đoạn
          </div>
          {machineTimeDataCong.map((stage, si) => (
            <div key={stage.key} style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 6, height: 22, borderRadius: 3, background: stage.color }} />
                <span style={{ fontWeight: 600, fontSize: 14, color: stage.color }}>{stage.label}</span>
              </div>
              {stage.rows.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#aaa', padding: '16px 0', background: '#fafafa', borderRadius: 6 }}>Chưa có dữ liệu</div>
              ) : (
                <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stage.rows} margin={{ top: 8, right: 20, left: 10, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="thang" angle={-45} textAnchor="end" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}K` : Number(v).toFixed(1)} />
                      <RechartTooltip formatter={(v, n) => [Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 1 }), n]} />
                      <Legend wrapperStyle={{ paddingTop: 8 }} />
                      {stage.machines.map((m, i) => (
                        <Line key={m} type="monotone" dataKey={m} stroke={machineColor(m, i)} dot={false} strokeWidth={2} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'tong_hop_pt',
      label: <span style={{ color: '#0000CC' }}>Tổng Hợp</span>,
      children: (
        <div>
          <div style={{ fontWeight: 600, color: '#006666', marginBottom: 12 }}>Top Máy Móc Theo Sản Lượng</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
            {machineRows.filter(r => !r._total).slice(0, 6).map((m, i) => (
              <div key={m.name} style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', borderLeft: `4px solid ${PIE_COLORS[i % PIE_COLORS.length]}` }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: PIE_COLORS[i % PIE_COLORS.length], lineHeight: 1.4 }}>{m.name}</div>
                <div style={{ fontSize: 11, marginBottom: 10 }}>
                  {m.stages ? m.stages.split('/').map(s => <Tag key={s} color={s==='PL'?'purple':s==='ĐG'?'orange':'cyan'} style={{ margin: '1px 2px 1px 0', fontSize: 10 }}>{s}</Tag>) : null}
                </div>
                {[['Tổng SL', fmtN(m.total)], ['Số BG', fmtN(m.count)], ['SL TB/BG', fmtN(m.avg)], ['% Tổng', `${m.pct}%`]].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
                    <span style={{ color: '#666' }}>{l}</span>
                    <span style={{ fontWeight: 600, color: '#20a0a0' }}>{v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
            <div style={{ fontWeight: 600, color: '#006666', marginBottom: 12 }}>Top 5 Loại Sản Phẩm</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {productRows.filter(r => !r._total).slice(0, 5).map((p, i) => (
                <div key={p.loai} style={{ background: '#f8fffe', borderRadius: 8, padding: 14, border: '1px solid #e0f2f1' }}>
                  <div style={{ fontWeight: 700, color: '#006666', marginBottom: 8 }}>{i + 1}. {p.loai}</div>
                  {[['Số TP', fmtN(p.soTp)], ['SL PL', fmtN(p.pl)], ['SL ĐG', fmtN(p.dg)], ['SL BBC1', fmtN(p.bbc1)], ['Tổng SL', fmtN(p.tong)]].map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: '1px solid #e0f2f1' }}>
                      <span style={{ color: '#666' }}>{l}</span><span style={{ fontWeight: 600, color: '#0f766e' }}>{v}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
            <div style={{ fontWeight: 600, color: '#006666', marginBottom: 4 }}>Năng Suất Trung Bình Của Các Tổ</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>Số lớn = NS TB/lô (trung bình SL÷công từng lô) | NS tổng hợp = Tổng SL ÷ Tổng công | SL của PCPL1/PCPL2 dùng SL kế hoạch (soLuong)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
              {groupNangSuat.map(g => (
                <div key={g.key} onClick={() => setDetailGroup(g.key)} style={{ borderRadius: 8, padding: 14, border: `2px solid ${g.border}`, background: `${g.color}08`, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontWeight: 800, color: g.color, fontSize: 15 }}>{g.label}</span>
                    {g.sub && <span style={{ fontSize: 10, color: '#94a3b8' }}>{g.sub}</span>}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: g.color, fontFamily: 'monospace', marginBottom: 10, letterSpacing: -0.5 }}>
                    {g.nangSuatTB != null ? `${fmtN(g.nangSuatTB)} SL/công` : '—'}
                  </div>
                  {[
                    ['Tổng SL', fmtN(g.totalSL)],
                    ['Số lô phát sinh', fmtN(g.loCount)],
                    ['SL TB/lô', g.slTb != null ? fmtN(g.slTb) : '—'],
                    ['NS tổng hợp', g.nangSuat != null ? `${fmtN(g.nangSuat)} SL/công` : '—'],
                    ['Tổng công', g.totalCong > 0 ? Number(g.totalCong).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'],
                  ].map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: `1px solid ${g.border}` }}>
                      <span style={{ color: '#666' }}>{l}</span>
                      <span style={{ fontWeight: 600, color: g.color }}>{v}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ]

  const detailGrpObj = groupNangSuat.find(g => g.key === detailGroup)
  const detailCols = [
    { title: 'LSX', dataIndex: 'lsx', key: 'lsx', width: 90, fixed: 'left' },
    { title: 'Mã TP', dataIndex: 'maTp', key: 'maTp', width: 80 },
    { title: 'Tên SP', dataIndex: 'tenSp', key: 'tenSp', ellipsis: true, minWidth: 140 },
    { title: 'Tổ TH', dataIndex: 'toThucHien', key: 'toThucHien', width: 80, align: 'center',
      render: v => v ? <span style={{ fontWeight: 600, color: '#0369a1' }}>{v}</span> : '—' },
    { title: 'SL KH', dataIndex: 'soLuong', key: 'soLuong', width: 80, align: 'right',
      render: v => fmtN(v) },
    { title: 'SL tính', dataIndex: 'sl', key: 'sl', width: 90, align: 'right',
      render: v => <span style={{ fontWeight: 600 }}>{fmtN(v)}</span> },
    { title: 'Công', dataIndex: 'cong', key: 'cong', width: 80, align: 'right',
      render: v => v > 0 ? Number(v).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—' },
    { title: 'NS/lô', dataIndex: 'ns', key: 'ns', width: 90, align: 'right',
      render: v => v != null ? <span style={{ color: detailGrpObj?.color, fontWeight: 700 }}>{fmtN(v)}</span> : '—' },
  ]

  return (
    <div style={{ padding: '8px 12px' }}>
      <Modal
        open={!!detailGroup}
        onCancel={() => setDetailGroup(null)}
        title={detailGrpObj ? `Chi tiết: ${detailGrpObj.label} — ${detailGrpObj.detailRecs?.length || 0} lô` : ''}
        width={1000}
        footer={null}
        destroyOnClose
      >
        {detailGrpObj && (
          <div style={{ marginBottom: 8, fontSize: 12, color: '#6b7280' }}>
            NS TB/lô: <b style={{ color: detailGrpObj.color }}>{fmtN(detailGrpObj.nangSuatTB)} SL/công</b>
            &nbsp;|&nbsp; NS tổng hợp: <b style={{ color: detailGrpObj.color }}>{fmtN(detailGrpObj.nangSuat)} SL/công</b>
            &nbsp;|&nbsp; Tổng SL: <b>{fmtN(detailGrpObj.totalSL)}</b>
            &nbsp;|&nbsp; Tổng công: <b>{Number(detailGrpObj.totalCong).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</b>
          </div>
        )}
        <Table
          columns={detailCols}
          dataSource={detailGrpObj?.detailRecs || []}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 20, showTotal: t => `${t} lô` }}
          scroll={{ x: 700 }}
        />
      </Modal>
      <Spin spinning={loading}>
        {/* Time range filter toolbar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', padding: '10px 14px', background: '#f0fafa', borderRadius: 8, border: '1px solid #b2dfdb' }}>
          <span style={{ fontSize: 12, color: '#006666', fontWeight: 700, marginRight: 2 }}>Thời gian:</span>
          {PRESETS.map(p => (
            <Button key={p.key} size="small"
              type={filterMode === p.key ? 'primary' : 'default'}
              style={filterMode === p.key ? { background: '#006666', borderColor: '#006666' } : {}}
              onClick={() => { setFilterMode(p.key); setCustomRange(null) }}
            >{p.label}</Button>
          ))}
          <RangePicker
            size="small"
            format="DD/MM/YYYY"
            value={customRange}
            onChange={r => { if (r) { setCustomRange(r); setFilterMode('custom') } else { setCustomRange(null); setFilterMode('all') } }}
            placeholder={['Từ ngày', 'Đến ngày']}
          />
          {filterMode !== 'all' && (
            <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>
              <b style={{ color: '#006666' }}>{filteredData.length.toLocaleString('vi-VN')}</b> / {allData.length.toLocaleString('vi-VN')} bản ghi
            </span>
          )}
        </div>
        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          {summaryCards.map((c, i) => (
            <div key={c.label} style={{ background: `linear-gradient(135deg, ${CARD_COLORS[i]}, ${CARD_COLORS[i]}cc)`, color: '#fff', padding: '16px 20px', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>{c.label}</div>
              <div style={{ fontSize: 26, fontWeight: 'bold' }}>{fmtN(c.value)}</div>
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>{c.unit}</div>
            </div>
          ))}
        </div>
        <Tabs size="small" items={subItems} activeKey={activeSubTab} onChange={k => { setActiveSubTab(k); localStorage.setItem('phanTichSL_tab', k) }} />
      </Spin>
    </div>
  )
}
