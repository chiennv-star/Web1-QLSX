import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Table, Button, Space, Input, Select, Tag, Typography,
  Popconfirm, message, Tooltip, Row, Col, Card
} from 'antd'
import {
  PlusOutlined, SearchOutlined, EditOutlined,
  DeleteOutlined, FileExcelOutlined, ReloadOutlined, WarningOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const { Option } = Select

const STATUS_COLORS = { done: 'green', doing: 'orange' }
const STATUS_LABELS = { done: 'Done', doing: 'Doing' }

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
  filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
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

export default function DashboardPage() {
  const { isAdmin, canEditProduction } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const controlsRef = useRef(null)
  const [headerOffset, setHeaderOffset] = useState(0)

  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [deltaMap, setDeltaMap] = useState({})

  // jumpTo = từ DashboardPage nhấn cột PC/PL/BBC1/ĐG → áp dụng filter + highlight
  // backJump = từ "Xem SL" trong WorkSchedulePage → khôi phục trang/filter cũ + highlight
  const jumpInit = location.state?.jumpTo || null
  const backJump = location.state?.backJump || null
  const jumpAny = jumpInit || backJump

  // Khi backJump: khôi phục trạng thái đã lưu trước khi điều hướng đi
  const savedState = backJump ? getDashboardSaved() : null

  const [highlightKey] = useState(
    jumpAny ? { tienTrinh: jumpAny.tienTrinh, lsx: jumpAny.soLo } : null
  )
  const jumpApplied = useRef(false)

  const [filters, setFilters] = useState(
    savedState?.filters || {
      maTp: jumpInit?.maTp || '',
      maBravo: '',
      tienTrinh: jumpInit?.tienTrinh || '',
      lsx: jumpInit?.soLo || '',
      trangThai: ''
    }
  )

  const [pagination, setPagination] = useState({
    current: savedState?.page || 1,
    pageSize: savedState?.pageSize || 20,
    total: 0
  })

  useEffect(() => {
    if (controlsRef.current) setHeaderOffset(controlsRef.current.offsetHeight + 8)
  })

  // Xóa navigation state sau khi đọc xong
  useEffect(() => {
    if (jumpAny) navigate(location.pathname, { replace: true, state: {} })
  }, [])

  // Sau khi data tải xong, scroll đến hàng highlight
  useEffect(() => {
    if (!highlightKey || jumpApplied.current || data.length === 0) return
    const match = data.find(r =>
      (r.tienTrinh || '').trim() === (highlightKey.tienTrinh || '').trim() &&
      (r.lsx || '') === (highlightKey.lsx || '')
    )
    if (match) {
      jumpApplied.current = true
      setTimeout(() => {
        document.getElementById(`prod-row-${match.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 250)
    }
  }, [data])

  const fetchData = useCallback(async (page = 0, size = 20, f = filters) => {
    setLoading(true)
    try {
      const params = { page, size, ...f }
      const { data: res } = await api.get('/production', { params })
      setData(res.content)
      setPagination(p => ({ ...p, total: res.totalElements }))
    } catch {
      message.error('Không thể tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Lưu trạng thái hiện tại vào sessionStorage để có thể khôi phục khi quay lại
  useEffect(() => {
    sessionStorage.setItem(DASHBOARD_STATE_KEY, JSON.stringify({
      filters,
      page: pagination.current,
      pageSize: pagination.pageSize
    }))
  }, [filters, pagination.current, pagination.pageSize])

  useEffect(() => {
    if (savedState) {
      fetchData(savedState.page - 1, savedState.pageSize, savedState.filters)
    } else {
      fetchData(0)
    }
  }, [])

  // Theo dõi thay đổi SL trong 24h
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
        deltas[key] = {
          slPc:   cmpDelta(r.slPc,   entry.slPc),
          pcPl:   cmpDelta(r.pcPl,   entry.pcPl),
          dg2:    cmpDelta(r.dg2,    entry.dg2),
          bbc1_2: cmpDelta(r.bbc1_2, entry.bbc1_2),
        }
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
    fetchData(0)
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/production/${id}`)
      message.success('Đã xóa bản ghi')
      fetchData(pagination.current - 1)
    } catch {
      message.error('Xóa thất bại')
    }
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams(filters)
      const res = await api.get(`/production/export?${params}`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'sanluong.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      message.error('Xuất Excel thất bại')
    }
  }

  const statusTag = (val) =>
    val ? <Tag color={STATUS_COLORS[val]}>{STATUS_LABELS[val] || val}</Tag> : '-'

  const slCellRender = (field) => (v, r) => {
    const sl = parseInt(v) || 0
    const soLuong = r.soLuong || 0
    const exceeds = sl > 0 && soLuong > 0 && sl > soLuong
    const delta = deltaMap[r.id]?.[field]
    const txt = v != null ? String(v) : ''
    return (
      <span>
        <span style={exceeds ? { color: '#722ed1', fontWeight: 600 } : undefined}>{txt}</span>
        {delta === 'up'   && <span style={{ color: '#389e0d', fontSize: 10, marginLeft: 2 }}>▲</span>}
        {delta === 'down' && <span style={{ color: '#cf1322', fontSize: 10, marginLeft: 2 }}>▼</span>}
        {exceeds && <>{' '}<Tooltip title={`SL vượt số lượng (${soLuong})`}><WarningOutlined style={{ color: '#722ed1', fontSize: 11 }} /></Tooltip></>}
      </span>
    )
  }

  const columns = [
    {
      title: 'Mã TP', dataIndex: 'maTp', key: 'maTp', width: 90, fixed: 'left',
      render: v => <strong>{v}</strong>,
      ...colSearch('maTp'),
    },
    { title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 110, fixed: 'left', ...colSearch('maBravo') },
    {
      title: 'Tiến trình', dataIndex: 'tienTrinh', key: 'tienTrinh', width: 200, fixed: 'left',
      render: v => <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{v}</span>,
      ...colSearch('tienTrinh'),
    },
    { title: 'LSX', dataIndex: 'lsx', key: 'lsx', width: 90, fixed: 'left', ...colSearch('lsx') },
    { title: 'Số lượng', dataIndex: 'soLuong', key: 'soLuong', width: 90, align: 'right' },
    {
      title: 'PC', dataIndex: 'pcTrangThai', key: 'pcTrangThai', width: 80, align: 'center',
      render: (v, record) => (
        <Tooltip title="Xem trong Lịch sản xuất PC">
          <span
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/work-schedule', {
              state: { jumpTo: { stage: 'PC', tienTrinh: record.tienTrinh, soLo: record.lsx, maTp: record.maTp } }
            })}
          >
            {statusTag(v)}
          </span>
        </Tooltip>
      ),
      ...colStatus('pcTrangThai'),
    },
    {
      title: 'PL', dataIndex: 'plTrangThai', key: 'plTrangThai', width: 80, align: 'center',
      render: (v, record) => (
        <Tooltip title="Xem trong Lịch sản xuất PL">
          <span
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/work-schedule', {
              state: { jumpTo: { stage: 'PL', tienTrinh: record.tienTrinh, soLo: record.lsx, maTp: record.maTp } }
            })}
          >
            {statusTag(v)}
          </span>
        </Tooltip>
      ),
      ...colStatus('plTrangThai'),
    },
    {
      title: 'ĐG', dataIndex: 'dgTrangThai', key: 'dgTrangThai', width: 80, align: 'center',
      render: (v, record) => (
        <Tooltip title="Xem trong Lịch sản xuất ĐG">
          <span
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/work-schedule', {
              state: { jumpTo: { stage: 'DG', tienTrinh: record.tienTrinh, soLo: record.lsx, maTp: record.maTp } }
            })}
          >
            {statusTag(v)}
          </span>
        </Tooltip>
      ),
      ...colStatus('dgTrangThai'),
    },
    {
      title: 'BBC1', dataIndex: 'bbc1TrangThai', key: 'bbc1TrangThai', width: 80, align: 'center',
      render: (v, record) => (
        <Tooltip title="Xem trong Lịch sản xuất BBC1">
          <span
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/work-schedule', {
              state: { jumpTo: { stage: 'BBC1', tienTrinh: record.tienTrinh, soLo: record.lsx, maTp: record.maTp } }
            })}
          >
            {statusTag(v)}
          </span>
        </Tooltip>
      ),
      ...colStatus('bbc1TrangThai'),
    },
    { title: 'SL PC',   dataIndex: 'slPc',   key: 'slPc',   width: 95,  align: 'right', render: slCellRender('slPc') },
    { title: 'SL PL',   dataIndex: 'pcPl',   key: 'pcPl',   width: 100, align: 'right', render: slCellRender('pcPl'),   ...colSearch('pcPl') },
    { title: 'SL ĐG',  dataIndex: 'dg2',    key: 'dg2',    width: 100, align: 'right', render: slCellRender('dg2'),    ...colSearch('dg2') },
    { title: 'SL BBC1', dataIndex: 'bbc1_2', key: 'bbc1_2', width: 100, align: 'right', render: slCellRender('bbc1_2'), ...colSearch('bbc1_2') },
    { title: 'SP TG',    dataIndex: 'spTrungGian', key: 'spTrungGian', width: 80,  align: 'right' },
    {
      title: 'Chênh lệch BTP', key: 'tongBtp', width: 115, align: 'right',
      render: (_, r) => (parseInt(r.dg2 || 0) || 0) - (parseInt(r.pcPl || 0) || 0)
    },
    { title: 'Công BBC1', dataIndex: 'bbc1_3',   key: 'bbc1_3',   width: 90, align: 'right', render: v => v ?? 0 },
    { title: 'Công PC',   dataIndex: 'pcChiPhi', key: 'pcChiPhi', width: 85, align: 'right', render: v => v ?? 0 },
    { title: 'Công PL',   dataIndex: 'plChiPhi', key: 'plChiPhi', width: 85, align: 'right', render: v => v ?? 0 },
    { title: 'Công ĐG',   dataIndex: 'dgChiPhi', key: 'dgChiPhi', width: 85, align: 'right', render: v => v ?? 0 },
    {
      title: 'Σ Cộng', key: 'sigmaCong', width: 95, align: 'right',
      render: (_, r) => {
        const s = (r.bbc1_3 || 0) + (r.pcChiPhi || 0) + (r.plChiPhi || 0) + (r.dgChiPhi || 0)
        return <strong style={{ color: '#1890ff' }}>{s ? s.toFixed(2) : '0.00'}</strong>
      }
    },
    { title: 'TEM ĐB',      dataIndex: 'temDb',     key: 'temDb',     width: 80,  align: 'right' },
    { title: 'Dở dang PC',   key: 'doDangPc',   width: 105, align: 'right', render: (_, r) => (r.soLuong || 0) - (parseInt(r.slPc)  || 0) },
    { title: 'Dở dang PL',   key: 'doDangPl',   width: 105, align: 'right', render: (_, r) => (parseInt(r.slPc) || 0) - (parseInt(r.pcPl)  || 0) },
    { title: 'Dở dang BBC1', key: 'doDangBbc1', width: 115, align: 'right', render: (_, r) => (r.soLuong || 0) - (parseInt(r.bbc1_2) || 0) },
    { title: 'Dở dang ĐG',  key: 'doDangDg',  width: 105, align: 'right', render: (_, r) => (parseInt(r.pcPl) || 0) - (parseInt(r.dg2) || 0) },
    { title: 'TP Nhập kho', dataIndex: 'tpNhapKho', key: 'tpNhapKho', width: 110, align: 'right' },
    {
      title: 'SP/Công', key: 'soSpCong', width: 100, align: 'right',
      render: (_, r) => {
        const sc = (r.bbc1_3 || 0) + (r.pcChiPhi || 0) + (r.plChiPhi || 0) + (r.dgChiPhi || 0)
        const slDg = parseFloat(r.dg2)
        if (!sc || !slDg) return 0
        return (slDg / sc).toFixed(4)
      }
    },
    {
      title: 'Thao tác', key: 'action', width: 100, fixed: 'right',
      render: (_, record) => (
        <Space>
          {isAdmin() && (
            <Tooltip title="Sửa">
              <Button size="small" icon={<EditOutlined />}
                onClick={() => navigate(`/record/edit/${record.id}`)} />
            </Tooltip>
          )}
          {isAdmin() && (
            <Popconfirm title="Xóa bản ghi này?" onConfirm={() => handleDelete(record.id)}
              okText="Xóa" cancelText="Hủy">
              <Tooltip title="Xóa">
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    },
  ]

  return (
    <>
      <div ref={controlsRef} style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff', paddingBottom: 8 }}>
        <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 12 }}>
          Quản lý Sản lượng
        </Typography.Title>

        <Card style={{ marginBottom: 8 }}>
          <Row gutter={[12, 12]} align="bottom">
            <Col xs={24} sm={12} md={4}>
              <Input placeholder="Mã TP" value={filters.maTp}
                onChange={e => setFilters(f => ({ ...f, maTp: e.target.value }))}
                allowClear onPressEnter={handleSearch} />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Input placeholder="Mã Bravo" value={filters.maBravo}
                onChange={e => setFilters(f => ({ ...f, maBravo: e.target.value }))}
                allowClear onPressEnter={handleSearch} />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Input placeholder="Tiến trình" value={filters.tienTrinh}
                onChange={e => setFilters(f => ({ ...f, tienTrinh: e.target.value }))}
                allowClear onPressEnter={handleSearch} />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Input placeholder="LSX" value={filters.lsx}
                onChange={e => setFilters(f => ({ ...f, lsx: e.target.value }))}
                allowClear onPressEnter={handleSearch} />
            </Col>
            <Col xs={24} sm={12} md={3}>
              <Select placeholder="Trạng thái" style={{ width: '100%' }}
                value={filters.trangThai || undefined} allowClear
                onChange={v => setFilters(f => ({ ...f, trangThai: v || '' }))}>
                <Option value="done">Done</Option>
                <Option value="doing">Doing</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={3}>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>Tìm</Button>
                <Button icon={<ReloadOutlined />}
                  onClick={() => { setFilters({ maTp: '', maBravo: '', tienTrinh: '', lsx: '', trangThai: '' }); fetchData(0, 20, { maTp: '', maBravo: '', tienTrinh: '', lsx: '', trangThai: '' }) }} />
              </Space>
            </Col>
          </Row>
        </Card>

        <Space>
          {canEditProduction() && (
            <Button type="primary" icon={<PlusOutlined />}
              onClick={() => navigate('/record/new')}>
              Thêm mới
            </Button>
          )}
          <Button icon={<FileExcelOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a' }}
            onClick={handleExport}>
            Xuất Excel
          </Button>
        </Space>
      </div>

      <style>{`
        .row-jump-highlight > td { background: #f0fffe !important; border-top: 1px solid #b5f0ea; border-bottom: 1px solid #b5f0ea; transition: background 0.1s; }
        .row-jump-highlight:hover > td { background: #e8fffb !important; }
        .row-sl-exceed > td { background: #f9f0ff !important; }
        .ant-table-thead th.ant-table-cell { text-align: center !important; text-transform: uppercase; }
      `}</style>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 2200 }}
        size="small"
        sticky={{ offsetHeader: headerOffset }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} bản ghi`,
          onChange: (page, pageSize) => {
            setPagination(p => ({ ...p, current: page, pageSize }))
            fetchData(page - 1, pageSize)
          }
        }}
        rowClassName={(record, idx) => {
          const isHighlight = highlightKey &&
            (record.tienTrinh || '').trim() === (highlightKey.tienTrinh || '').trim() &&
            (record.lsx || '') === highlightKey.lsx
          const soLuong = record.soLuong || 0
          const anyExceeds = soLuong > 0 && [
            parseInt(record.slPc) || 0,
            parseInt(record.pcPl) || 0,
            parseInt(record.dg2) || 0,
            parseInt(record.bbc1_2) || 0,
          ].some(sl => sl > soLuong)
          return [
            idx % 2 !== 0 ? 'row-alt' : '',
            isHighlight ? 'row-jump-highlight' : '',
            anyExceeds ? 'row-sl-exceed' : '',
          ].filter(Boolean).join(' ')
        }}
        onRow={record => ({ id: `prod-row-${record.id}` })}
      />
    </>
  )
}
