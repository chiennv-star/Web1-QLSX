import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Table, Button, Space, Input, Select, Tag, Typography,
  Popconfirm, message, Tooltip, Divider, DatePicker,
  Spin, Collapse, Badge, Tabs, Segmented, Dropdown, Modal
} from 'antd'
import {
  PlusOutlined, SearchOutlined, EditOutlined,
  DeleteOutlined, FileExcelOutlined, ReloadOutlined,
  WarningOutlined, BarChartOutlined, DownOutlined, CalendarOutlined,
  EyeInvisibleOutlined, EyeOutlined, BellOutlined, ExclamationCircleOutlined,
  AccountBookOutlined,
} from '@ant-design/icons'
import InboxPanel from '../components/InboxPanel'
import dayjs from 'dayjs'

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
    { title: 'Mã SP', dataIndex: 'maSp', key: 'maSp', fixed: 'left', width: 90, ...colSearch('maSp') },
    { title: 'Tên Trình', dataIndex: 'tenTrinh', key: 'tenTrinh', width: 130, ellipsis: true, ...colSearch('tenTrinh') },
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
    { title: 'Mã SP', dataIndex: 'maSp', key: 'maSp', fixed: 'left', width: 90, ...colSearch('maSp') },
    { title: 'Tên Trình', dataIndex: 'tenTrinh', key: 'tenTrinh', width: 150, ellipsis: true, ...colSearch('tenTrinh') },
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
          sticky={{ offsetHeader: headerOffset + 36 }}
          pagination={{ pageSize: 50, showSizeChanger: true, showTotal: t => `Tổng ${t} sản phẩm`, size: 'small' }}
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
          sticky={{ offsetHeader: headerOffset + 36 }}
          pagination={{ pageSize: 50, showSizeChanger: true, showTotal: t => `Tổng ${t} sản phẩm`, size: 'small' }}
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
    onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff', textAlign: 'center' } }),
    children: [
      {
        title: 'Ngày', key: `${s}_days`, width: 62, align: 'center',
        onHeaderCell: () => ({ style: { background: '#4dd9d9', color: '#fff' } }),
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
        onHeaderCell: () => ({ style: { background: '#4dd9d9', color: '#fff' } }),
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

  const columns = [
    { title: 'Mã SP', dataIndex: 'maSp', key: 'maSp', fixed: 'left', width: 88,
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }),
      render: v => <b style={{ color: '#1d4ed8', fontSize: 12 }}>{v}</b> },
    { title: 'Tên sản phẩm', dataIndex: 'tenTrinh', key: 'tenTrinh', width: 190, ellipsis: true,
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }),
      render: v => <span style={{ fontSize: 12 }}>{v || '—'}</span> },
    { title: 'Số Lô', dataIndex: 'soLo', key: 'soLo', width: 80,
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }),
      render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
    { title: 'Cỡ Lô', dataIndex: 'coLo', key: 'coLo', width: 76, align: 'center',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff', textTransform: 'none' } }),
      render: v => <span>{fmtNum(v)}</span> },
    ...stageGroups,
    {
      title: 'Tổng ngày', key: 'tongNgay', width: 88, align: 'center', fixed: 'right',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }),
      render: (_, r) => {
        const total = STAGES.reduce((acc, s) => acc + (r[s]?.soDays || 0), 0)
        return total > 0
          ? <Tag color="blue" style={{ fontWeight: 700, fontSize: 12 }}>{total}</Tag>
          : <span style={{ color: '#d9d9d9' }}>—</span>
      },
    },
  ]

  const filteredData = data.filter(r => filterByStatus(r, statusFilter))
  const stageTotals = STAGES.reduce((acc, s) => {
    acc[s] = filteredData.reduce((sum, r) => sum + (r[s]?.soDays || 0), 0)
    return acc
  }, {})
  const grandTotal = STAGES.reduce((sum, s) => sum + stageTotals[s], 0)

  return (
    <div>
      <style>{`
        .tiendo-table .ant-table-thead > tr > th { background: #33CCCC !important; color: #fff !important; font-weight: 700 !important; font-size: 11px !important; padding: 6px 6px !important; text-align: center !important; text-transform: none !important; border-right: 1px solid rgba(255,255,255,0.35) !important; }
        .tiendo-table .ant-table-thead > tr > th::before { display: none !important; }
        .tiendo-table .ant-table-tbody > tr > td { border-right: 1px solid #e2e8f0 !important; border-bottom: 1px solid #e8edf3 !important; }
        .tiendo-table .ant-table-tbody > tr:nth-child(even) > td { background: #f8fffe !important; }
        .tiendo-table .ant-table-tbody > tr:hover > td { background: #e0f7fa !important; }
        .tiendo-table .ant-table-summary > tr > td { background: #e6f7f7 !important; font-weight: 700; border-right: 1px solid #b2dfdb !important; }
      `}</style>
      <div style={{ padding: '6px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
        <Typography.Text style={{ color: '#64748b', fontSize: 12 }}>{filteredData.length} / {data.length} sản phẩm</Typography.Text>
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
        sticky={{ offsetHeader: headerOffset + 36 }}
        pagination={{ pageSize: 50, showSizeChanger: true, showTotal: t => `Tổng ${t} sản phẩm`, size: 'small' }}
        summary={() => (
          <Table.Summary.Row style={{ fontWeight: 700 }}>
            <Table.Summary.Cell index={0} colSpan={4} align="center">
              <b style={{ color: '#0d7377' }}>TỔNG THỜI GIAN</b>
            </Table.Summary.Cell>
            {STAGES.flatMap((s, i) => [
              <Table.Summary.Cell key={`${s}_d`} index={4 + i * 2} align="center">
                <Tag color="cyan" style={{ fontWeight: 700 }}>{stageTotals[s] || '—'}</Tag>
              </Table.Summary.Cell>,
              <Table.Summary.Cell key={`${s}_t`} index={5 + i * 2} align="center">
                <span style={{ color: '#888', fontSize: 11 }}>—</span>
              </Table.Summary.Cell>,
            ])}
            <Table.Summary.Cell index={4 + STAGES.length * 2} align="center">
              <Tag color="blue" style={{ fontWeight: 700, fontSize: 12 }}>{grandTotal || '—'}</Tag>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </div>
  )
}

// ── SanLuongKeToanTab ──────────────────────────────────────────────────────────
function SanLuongKeToanTab({ data = [], loading = false, pagination = {}, onPaginationChange, headerOffset = 120 }) {

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
    { title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 105, fixed: 'left',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }),
      render: v => v ? <span style={{ color: '#1d4ed8' }}>{v}</span> : '—' },
    { title: 'Mã SP', dataIndex: 'maTp', key: 'maTp', width: 95, fixed: 'left',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }),
      render: v => v ? <span style={{ color: '#595959' }}>{v}</span> : '—' },
    { title: 'Tên sản phẩm', dataIndex: 'tienTrinh', key: 'tienTrinh', width: 210,
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }),
      render: v => <span>{v || '—'}</span> },
    { title: 'Mã lô SP', dataIndex: 'lsx', key: 'lsx', width: 145, align: 'center',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }),
      render: v => v ? <span style={{ fontFamily: 'monospace', color: '#595959' }}>{v}</span> : '—' },
    { title: 'Ngày SX', dataIndex: 'createdAt', key: 'ngaySx', width: 90, align: 'center',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }),
      render: v => v ? <span style={{ fontSize: 11 }}>{dayjs(v).format('DD/MM/YYYY')}</span> : '—' },
    { title: 'Số Lượng', dataIndex: 'soLuong', key: 'soLuong', width: 90, align: 'center',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }),
      render: v => <span style={{ color: '#1d4ed8' }}>{fmtN(v)}</span> },
    { title: 'GIAI ĐOẠN', align: 'center',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff', textAlign: 'center' } }),
      children: [
        { title: 'PC',   dataIndex: 'pcTrangThai',   key: 'pc_tt',   width: 80, align: 'center',
          onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }), render: stageTag },
        { title: 'PL',   dataIndex: 'plTrangThai',   key: 'pl_tt',   width: 80, align: 'center',
          onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }), render: stageTag },
        { title: 'ĐG',   dataIndex: 'dgTrangThai',   key: 'dg_tt',   width: 80, align: 'center',
          onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }), render: stageTag },
        { title: 'BBC1', dataIndex: 'bbc1TrangThai', key: 'bbc1_tt', width: 80, align: 'center',
          onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }), render: stageTag },
      ] },
    { title: 'SP Trung Gian', dataIndex: 'pcPl', key: 'spTrungGian', width: 100, align: 'center',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }),
      render: fmtN },
    { title: 'Tổng BTP', dataIndex: 'dg2', key: 'tongBtp', width: 90, align: 'center',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }),
      render: v => <span style={{ color: '#389e0d' }}>{fmtN(v)}</span> },
    { title: 'CÔNG CÁC CÔNG ĐOẠN', align: 'center',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff', textAlign: 'center' } }),
      children: [
        { title: 'GNNL', dataIndex: 'temDb',     key: 'temDb',     width: 75, align: 'center',
          onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }), render: fmtCong },
        { title: 'BBC1', dataIndex: 'bbc1_3',    key: 'bbc1_3c',   width: 75, align: 'center',
          onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }), render: fmtCong },
        { title: 'PC',   dataIndex: 'pcChiPhi',  key: 'pcChiPhi',  width: 75, align: 'center',
          onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }), render: fmtCong },
        { title: 'PL',   dataIndex: 'plChiPhi',  key: 'plChiPhi',  width: 75, align: 'center',
          onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }), render: fmtCong },
        { title: 'ĐG',   dataIndex: 'dgChiPhi',  key: 'dgChiPhi',  width: 75, align: 'center',
          onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }), render: fmtCong },
      ] },
    { title: 'BTP Chờ ĐG', dataIndex: 'doDangDg', key: 'doDangDg', width: 100, align: 'center',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }),
      render: fmtN },
    { title: 'TP Nhập Kho', dataIndex: 'tpNhapKho', key: 'tpNhapKho', width: 100, align: 'center',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }),
      render: v => <span style={{ color: '#389e0d' }}>{fmtN(v)}</span> },
    { title: 'Chênh lệch BTP/Nhập kho', key: 'chenhLech', width: 140, align: 'center', fixed: 'right',
      onHeaderCell: () => ({ style: { background: '#33CCCC', color: '#fff' } }),
      render: (_, r) => {
        const cl = (parseInt(r.dg2) || 0) - (r.tpNhapKho || 0)
        return <span style={{ color: cl !== 0 ? '#cf1322' : '#389e0d' }}>{fmtN(cl)}</span>
      } },
  ]

  return (
    <div>
      <style>{`
        .ketoan-table .ant-table-thead > tr > th { background: #33CCCC !important; color: #fff !important; font-weight: 700 !important; font-size: 11px !important; padding: 7px 8px !important; text-align: center !important; border-right: 1px solid rgba(255,255,255,0.35) !important; border-bottom: 1px solid rgba(255,255,255,0.35) !important; }
        .ketoan-table .ant-table-thead > tr > th::before { display: none !important; }
        .ketoan-table .ant-table-tbody > tr:nth-child(odd) > td  { background: #fff !important; }
        .ketoan-table .ant-table-tbody > tr:nth-child(even) > td { background: #f8faff !important; }
        .ketoan-table .ant-table-tbody > tr:hover > td { background: #e0f2fe !important; }
        .ketoan-table .ant-table-tbody > tr > td { border-right: 1px solid #e2e8f0 !important; border-bottom: 1px solid #e8edf3 !important; font-weight: 400 !important; font-size: 12px !important; }
        .ketoan-table .ant-table-tbody > tr:hover .ant-table-cell-fix-left,
        .ketoan-table .ant-table-tbody > tr:hover .ant-table-cell-fix-right { background: #e0f2fe !important; }
      `}</style>

      <Table
        className="ketoan-table"
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 1900 }}
        sticky={{ offsetHeader: headerOffset }}
        pagination={{
          ...pagination,
          size: 'small',
          showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100'],
          showTotal: t => `Tổng ${t} bản ghi`,
          onChange: onPaginationChange,
        }}
      />
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
  const [headerOffset, setHeaderOffset] = useState(0)
  const [statsOpen, setStatsOpen] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [inboxCount, setInboxCount] = useState(0)
  const [activeTab, setActiveTab] = useState('list')
  const [ctxMenu, setCtxMenu] = useState({ visible: false, x: 0, y: 0, record: null })
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkDelLoading, setBulkDelLoading] = useState(false)

  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [deltaMap, setDeltaMap] = useState({})
  const [hangLoiMap, setHangLoiMap] = useState({})

  // Tab "Đã hoàn thành"
  const [doneData, setDoneData] = useState([])
  const [doneLoading, setDoneLoading] = useState(false)
  const [donePagination, setDonePagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const donePaginationRef = useRef({ current: 1, pageSize: 20 })
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
    pageSize: savedState?.pageSize || 20,
    total: 0
  })
  const paginationRef = useRef({ current: savedState?.page || 1, pageSize: savedState?.pageSize || 20 })

  useEffect(() => {
    if (toolbarRef.current) setHeaderOffset(toolbarRef.current.offsetHeight + 4)
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
    } catch {
      message.error('Không thể tải dữ liệu')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [filters, fetchHangLoi])

  const fetchDoneData = useCallback(async (page = 0, size = 20, f = filters, { silent = false } = {}) => {
    if (!silent) setDoneLoading(true)
    try {
      const params = { page, size, ...f, hoanThanh: true }
      const { data: res } = await api.get('/production', { params })
      const sorted = [...res.content].sort((a, b) => parseLsx(b.lsx) - parseLsx(a.lsx))
      setDoneData(sorted)
      setDonePagination(p => ({ ...p, total: res.totalElements }))
    } catch {
      message.error('Không thể tải dữ liệu đã hoàn thành')
    } finally {
      if (!silent) setDoneLoading(false)
    }
  }, [filters])

  useEffect(() => {
    paginationRef.current = { current: pagination.current, pageSize: pagination.pageSize }
    sessionStorage.setItem(DASHBOARD_STATE_KEY, JSON.stringify({
      filters, page: pagination.current, pageSize: pagination.pageSize
    }))
  }, [filters, pagination.current, pagination.pageSize])

  useEffect(() => {
    donePaginationRef.current = { current: donePagination.current, pageSize: donePagination.pageSize }
  }, [donePagination.current, donePagination.pageSize])

  useEffect(() => {
    if (savedState) fetchData(savedState.page - 1, savedState.pageSize, savedState.filters)
    else fetchData(0)
    fetchDoneData(0)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = () => fetchData(paginationRef.current.current - 1, paginationRef.current.pageSize, undefined, { silent: true })
    window.addEventListener('app:silent-refresh', handler)
    return () => window.removeEventListener('app:silent-refresh', handler)
  }, [fetchData])

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
    fetchData(0)
    fetchDoneData(0)
  }

  const handleReset = () => {
    const empty = { maTp: '', maBravo: '', tienTrinh: '', lsx: '', trangThai: '' }
    setFilters(empty)
    fetchData(0, pagination.pageSize, empty)
    fetchDoneData(0, donePagination.pageSize, empty)
  }

  const handleHide = async (id) => {
    try {
      await api.patch(`/production/${id}/hide`)
      message.success('Đã ẩn bản ghi')
      fetchData(pagination.current - 1)
    } catch { message.error('Ẩn thất bại') }
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
          title: 'PCPL1', key: 'pcpl1TrangThai', width: 72, align: 'center',
          render: (_, r) => <StatusTag
            value={r.pcpl1TrangThai}
            onClick={() => goToSchedule('PCPL1', r)}
          />,
        },
        {
          title: 'PCPL2', key: 'pcpl2TrangThai', width: 72, align: 'center',
          render: (_, r) => <StatusTag
            value={r.pcpl2TrangThai}
            onClick={() => goToSchedule('PCPL2', r)}
          />,
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
        {
          title: 'Σ', key: 'sigmaCong', width: 88, align: 'center',
          render: (_, r) => {
            const s = (r.temDb || 0) + (r.bbc1_3 || 0) + (r.pcChiPhi || 0) + (r.plChiPhi || 0) + (r.dgChiPhi || 0)
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
    { title: 'TP NKho', dataIndex: 'tpNhapKho', key: 'tpNhapKho', width: 88, align: 'center', render: v => v ?? '—' },
    { title: 'TEM ĐB',  dataIndex: 'temDb',      key: 'temDb',      width: 76, align: 'center', render: v => v ?? '—' },
    {
      title: 'QA Lấy mẫu', dataIndex: 'qaLayMau', key: 'qaLayMau', width: 90, align: 'center',
      render: v => v != null ? <span style={{ color: '#0891b2' }}>{Number(v).toLocaleString('vi-VN')}</span> : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'SP/Công', key: 'spCong', width: 88, align: 'center',
      render: (_, r) => {
        const sc = (r.bbc1_3 || 0) + (r.pcChiPhi || 0) + (r.plChiPhi || 0) + (r.dgChiPhi || 0)
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
          background: #33CCCC !important;
          color: #ffffff !important;
          font-size: 11px; font-weight: 700; text-align: center !important;
          text-transform: uppercase; letter-spacing: 0.05em;
          padding: 7px 6px !important; border-right: 1px solid rgba(255,255,255,0.4) !important; border-bottom: 1px solid rgba(255,255,255,0.4) !important;
          white-space: nowrap;
        }
        .prod-table .ant-table-thead > tr > th::before { display: none !important; }
        .prod-table .ant-table-thead > tr:first-child > th {
          background: #33CCCC !important;
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
        .db-outer-tabs > .ant-tabs-nav { background: #e8edf5 !important; border-bottom: 2px solid #c5d0e6 !important; }
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

        {/* Dark navy header */}
        <div style={{
          background: '#339999',
          padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#fff', whiteSpace: 'nowrap', letterSpacing: 0.3 }}>
            📊 Quản lý Sản lượng
          </span>
          <Badge count={pagination.total} showZero overflowCount={9999}
            style={{ background: 'rgba(255,255,255,0.22)', color: '#fff', boxShadow: 'none', fontWeight: 700 }} />

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {canEditProduction() && (
              <Button size="small" icon={<PlusOutlined />}
                onClick={() => navigate('/record/new')}
                style={{ background: '#1D4ED8', borderColor: '#60a5fa', color: '#fff', fontWeight: 600 }}>
                Thêm mới
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

        {/* Filter bar — nội dung thay đổi theo tab đang chọn */}
        <div style={{
          background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
          padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          minHeight: 42,
        }}>
          {activeTab !== 'tiendo' && activeTab !== 'tiendogon' ? (
            /* Filter cho tab Danh sách / Đã hoàn thành */
            <>
              <Input placeholder="Mã Bravo" value={filters.maBravo} allowClear
                onChange={e => setFilters(f => ({ ...f, maBravo: e.target.value }))}
                onPressEnter={handleSearch} style={{ width: 100 }} size="small" />
              <Input placeholder="Mã TP" value={filters.maTp} allowClear
                onChange={e => setFilters(f => ({ ...f, maTp: e.target.value }))}
                onPressEnter={handleSearch} style={{ width: 88 }} size="small" />
              <Input placeholder="Tiến trình / Tên SP" value={filters.tienTrinh} allowClear
                onChange={e => setFilters(f => ({ ...f, tienTrinh: e.target.value }))}
                onPressEnter={handleSearch} style={{ width: 200 }} size="small" />
              <Input placeholder="LSX" value={filters.lsx} allowClear
                onChange={e => setFilters(f => ({ ...f, lsx: e.target.value }))}
                onPressEnter={handleSearch} style={{ width: 88 }} size="small" />
              <Select placeholder="Trạng thái" size="small" style={{ width: 108 }}
                value={filters.trangThai || undefined} allowClear
                onChange={v => setFilters(f => ({ ...f, trangThai: v || '' }))}>
                <Option value="done">Done</Option>
                <Option value="doing">Doing</Option>
              </Select>
              <Button type="primary" size="small" icon={<SearchOutlined />} onClick={handleSearch}
                style={{ background: '#1D4ED8', borderColor: '#1D4ED8' }}>Tìm</Button>
              <Button size="small" icon={<ReloadOutlined />} onClick={handleReset} />
            </>
          ) : (activeTab === 'tiendo' || activeTab === 'tiendogon') ? (
            /* Filter cho tab Tiến độ */
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
              <Button size="small" icon={<ReloadOutlined />} onClick={handleTimelineReset} />
            </>
          ) : null}
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

      {/* ── Tabs: Danh sách | Tiến độ ─────────────────────────────── */}
      <Tabs
        className="db-outer-tabs"
        activeKey={activeTab}
        onChange={key => {
          setActiveTab(key)
          if (key === 'done_list') fetchDoneData(donePaginationRef.current.current - 1, donePaginationRef.current.pageSize)
        }}
        size="small"
        style={{ marginTop: 0 }}
        tabBarStyle={{ paddingLeft: 12, marginBottom: 0 }}
        items={[
          {
            key: 'list',
            label: 'Danh sách',
            children: (
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
                  pageSizeOptions: ['20', '50', '100'],
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
                  ].filter(Boolean).join(' ')
                }}
                onRow={record => ({
                  id: `prod-row-${record.id}`,
                  onClick: isStageAdmin() ? () => navigate('/work-schedule', { state: { jumpTo: { stage: getRowJumpStage(), tienTrinh: record.tienTrinh, soLo: record.lsx, maTp: record.maTp } } }) : undefined,
                  style: isStageAdmin() ? { cursor: 'pointer' } : {},
                  onContextMenu: (e) => {
                    e.preventDefault()
                    setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, record })
                  },
                })}
              />
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
              <Table
                className="prod-table"
                columns={columns}
                dataSource={doneData}
                rowKey="id"
                loading={doneLoading}
                scroll={{ x: 2100 }}
                size="small"
                sticky={{ offsetHeader: headerOffset }}
                rowClassName={(_, idx) => idx % 2 !== 0 ? 'row-alt' : ''}
                pagination={{
                  ...donePagination,
                  size: 'small',
                  showSizeChanger: true,
                  pageSizeOptions: ['20', '50', '100'],
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
                  onClick: isStageAdmin() ? () => navigate('/work-schedule', { state: { jumpTo: { stage: getRowJumpStage(), tienTrinh: record.tienTrinh, soLo: record.lsx, maTp: record.maTp } } }) : undefined,
                  style: isStageAdmin() ? { cursor: 'pointer' } : {},
                  onContextMenu: (e) => {
                    e.preventDefault()
                    setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, record })
                  },
                })}
              />
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
              headerOffset={headerOffset}
            />,
          }
        ]}
      />

      {(isAdmin() || isAdminKH()) && (
        <InboxPanel
          open={inboxOpen}
          onClose={() => setInboxOpen(false)}
          onCountChange={setInboxCount}
        />
      )}
    </div>
  )
}
