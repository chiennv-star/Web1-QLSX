import React, { useState, useEffect, useCallback } from 'react'
import {
  Table, Button, Space, Tag, Popconfirm, message,
  Tabs, Badge, Tooltip, Typography, Empty, Row, Col
} from 'antd'
import {
  DeleteOutlined, UndoOutlined, WarningOutlined,
  ShoppingOutlined, BarChartOutlined, CalendarOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { StatusTag } from './DashboardPage'

const fmtDate  = v => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—'
const fmtDateO = v => v ? dayjs(v).format('DD/MM/YYYY') : '—'
const fmtNum   = v => (v != null && v !== '') ? Number(v).toLocaleString('vi-VN') : '—'
const dash     = v => <span style={{ color: '#d9d9d9' }}>—</span>
const cellTxt  = (v, style) => v ? <span style={{ fontSize: 12, ...style }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span>
const boolTag  = v => v
  ? <Tag color="green" style={{ marginRight: 0, fontWeight: 600 }}>Có</Tag>
  : <Tag style={{ marginRight: 0, color: '#94a3b8' }}>Không</Tag>

const TINH_TRANG_DH = {
  rat_gap: { label: 'Rất Gấp', color: '#cf1322', bg: '#fff1f0', border: '#ffa39e' },
  gap:     { label: 'Gấp',     color: '#d46b08', bg: '#fff7e6', border: '#ffd591' },
}
const TINH_TRANG_SX = {
  done:  { label: 'Hoàn thành', color: '#389e0d', bg: '#f6ffed', border: '#b7eb8f' },
  doing: { label: 'Đang SX',    color: '#1677ff', bg: '#e6f4ff', border: '#91caff' },
}
const tinhTrangBadge = (cfgMap, v, fallback) => {
  const cfg = cfgMap[v]
  if (!cfg) return fallback != null ? <span style={{ fontSize: 11 }}>{fallback}</span> : <span style={{ color: '#d9d9d9', fontSize: 11 }}>—</span>
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      color: cfg.color, fontWeight: 700, fontSize: 11,
      borderRadius: 12, padding: '2px 8px',
    }}>{cfg.label}</span>
  )
}

// Bản đồ SL/Công theo công đoạn — dùng để hiển thị 1 cột SL/Công chung cho Lịch Làm Việc
const CONG_FIELD_MAP = { PC: 'congPc', PCPL1: 'congPc', PCPL2: 'congPc', BBC1: 'congBbc1', PL: 'congPl', DG: 'congDg', CC: 'congCc' }
const SL_FIELD_MAP   = { PC: 'slPc',   PCPL1: 'slPc',   PCPL2: 'slPc',  BBC1: 'slBbc1',   PL: 'slPl',   DG: 'slDg',   CC: 'slCc' }

// ── Toolbar khi có hàng được chọn ─────────────────────────────────────────────
function BulkToolbar({ selected, total, onSelectAll, onDeselectAll, onBulkRestore, onBulkDelete, restoring, deleting }) {
  if (!selected.length) return null
  return (
    <div style={{
      background: '#fef3c7', border: '1px solid #f59e0b',
      borderRadius: 6, padding: '6px 12px', marginBottom: 8,
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    }}>
      <span style={{ fontWeight: 700, color: '#92400e', fontSize: 13 }}>
        ✓ Đã chọn <span style={{ color: '#dc2626', fontSize: 15 }}>{selected.length}</span> / {total} bản ghi
      </span>
      <Button size="small" onClick={onSelectAll} style={{ fontSize: 12 }}>Chọn tất cả ({total})</Button>
      <Button size="small" onClick={onDeselectAll} style={{ fontSize: 12 }}>Bỏ chọn</Button>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <Popconfirm
          title={`Khôi phục ${selected.length} bản ghi đã chọn?`}
          okText="Khôi phục" cancelText="Hủy"
          okButtonProps={{ style: { background: '#15803d', borderColor: '#15803d' } }}
          onConfirm={onBulkRestore}
        >
          <Button size="small" type="primary" icon={<UndoOutlined />} loading={restoring}
            style={{ background: '#15803d', borderColor: '#15803d', fontWeight: 600 }}>
            Khôi phục {selected.length} mục
          </Button>
        </Popconfirm>
        <Popconfirm
          title={`Xóa vĩnh viễn ${selected.length} bản ghi?`}
          description="Hành động này KHÔNG THỂ hoàn tác."
          okText="Xóa vĩnh viễn" cancelText="Hủy"
          okButtonProps={{ danger: true }}
          onConfirm={onBulkDelete}
        >
          <Button size="small" danger icon={<DeleteOutlined />} loading={deleting} style={{ fontWeight: 600 }}>
            Xóa vĩnh viễn {selected.length} mục
          </Button>
        </Popconfirm>
      </div>
    </div>
  )
}

// ── Don Hang Trash ────────────────────────────────────────────────────────────
function DonHangTrashTab({ canEdit }) {
  const [data, setData]                     = useState([])
  const [loading, setLoading]               = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [bulkRestoring, setBulkRestoring]   = useState(false)
  const [bulkDeleting, setBulkDeleting]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/don-hang/trash')
      setData(res)
    } catch { message.error('Không thể tải thùng rác') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleRestore = async (id) => {
    try {
      await api.post(`/don-hang/${id}/restore`)
      message.success('Đã khôi phục đơn hàng')
      setData(prev => prev.filter(r => r.id !== id))
    } catch (err) { message.error(err?.response?.data?.message || 'Khôi phục thất bại') }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/don-hang/${id}/permanent`)
      message.success('Đã xóa vĩnh viễn')
      setData(prev => prev.filter(r => r.id !== id))
    } catch { message.error('Xóa thất bại') }
  }

  const handleBulkRestore = async () => {
    setBulkRestoring(true)
    let ok = 0, fail = 0
    for (const id of selectedRowKeys) {
      try { await api.post(`/don-hang/${id}/restore`); ok++ }
      catch { fail++ }
    }
    setData(prev => prev.filter(r => !selectedRowKeys.includes(r.id)))
    setSelectedRowKeys([])
    setBulkRestoring(false)
    fail === 0 ? message.success(`Đã khôi phục ${ok} đơn hàng`)
               : message.warning(`Khôi phục ${ok} thành công, ${fail} thất bại`)
  }

  const handleBulkDelete = async () => {
    setBulkDeleting(true)
    let ok = 0, fail = 0
    for (const id of selectedRowKeys) {
      try { await api.delete(`/don-hang/${id}/permanent`); ok++ }
      catch { fail++ }
    }
    setData(prev => prev.filter(r => !selectedRowKeys.includes(r.id)))
    setSelectedRowKeys([])
    setBulkDeleting(false)
    fail === 0 ? message.success(`Đã xóa vĩnh viễn ${ok} bản ghi`)
               : message.warning(`Xóa ${ok} thành công, ${fail} thất bại`)
  }

  const columns = [
    {
      title: '#', key: 'stt', width: 46, align: 'center',
      render: (_, __, i) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{i + 1}</span>,
    },
    {
      title: 'Xóa lúc', dataIndex: 'deletedAt', key: 'deletedAt', width: 140,
      render: v => <span style={{ fontSize: 12, color: '#ef4444' }}>{fmtDate(v)}</span>,
      sorter: (a, b) => (a.deletedAt || '').localeCompare(b.deletedAt || ''),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Người xóa', dataIndex: 'deletedBy', key: 'deletedBy', width: 110,
      render: v => <span style={{ fontSize: 12, color: '#64748b' }}>{v || '—'}</span>,
    },
    {
      title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 110,
      render: v => v ? <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>{v}</span> : '—',
    },
    {
      title: 'Mã ĐH', dataIndex: 'maDonHang', key: 'maDH', width: 100,
      render: v => v ? <span style={{ fontFamily: 'monospace', color: '#7c3aed', fontWeight: 600 }}>{v}</span> : '—',
    },
    {
      title: 'Mã SP', dataIndex: 'maSp', key: 'maSp', width: 85,
      render: v => v ? <Tag color="blue" style={{ marginRight: 0 }}>{v}</Tag> : '—',
    },
    {
      title: 'Tên Sản Phẩm', dataIndex: 'tenSanPham', key: 'ten', width: 220, ellipsis: true,
      render: v => <span style={{ fontSize: 12 }}>{v || '—'}</span>,
    },
    {
      title: 'SL Đặt', dataIndex: 'soLuongDatHang', key: 'sl', width: 90, align: 'right',
      render: v => <span style={{ fontWeight: 600 }}>{fmtNum(v)}</span>,
    },
    {
      title: 'SL Đã Xếp KH', dataIndex: 'soLuongDaXepKh', key: 'slXep', width: 100, align: 'right',
      render: v => <span style={{ fontSize: 12 }}>{fmtNum(v)}</span>,
    },
    {
      title: 'SL Còn Lại', dataIndex: 'soLuongConLai', key: 'slCon', width: 100, align: 'right',
      render: v => {
        const n = Number(v) || 0
        const color = n < 0 ? '#8c8c8c' : n === 0 ? '#389e0d' : '#cf1322'
        return <span style={{ fontWeight: 700, color, fontSize: 12 }}>{fmtNum(v)}</span>
      },
    },
    {
      title: 'Ngày ĐH', dataIndex: 'ngayDatHang', key: 'ngay', width: 100,
      render: v => v ? <span style={{ fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</span> : '—',
    },
    {
      title: 'Ngày Phát Lệnh', dataIndex: 'ngayPhatLenh', key: 'ngayPhatLenh', width: 105, align: 'center',
      render: v => v ? <span style={{ fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</span> : '—',
    },
    {
      title: 'Tình Trạng ĐH', dataIndex: 'tinhTrangDatHang', key: 'ttDh', width: 100, align: 'center',
      render: v => tinhTrangBadge(TINH_TRANG_DH, v),
    },
    {
      title: 'Tình Trạng SX', dataIndex: 'tinhTrangSx', key: 'ttSx', width: 100, align: 'center',
      render: v => tinhTrangBadge(TINH_TRANG_SX, v, 'Chưa bắt đầu'),
    },
    {
      title: 'SL Sản Xuất', dataIndex: 'slSanXuat', key: 'slSanXuat', width: 95, align: 'right',
      render: v => <span style={{ fontSize: 12 }}>{fmtNum(v)}</span>,
    },
    {
      title: 'Đã Lên Lịch', dataIndex: 'daLenLichLam', key: 'daLenLichLam', width: 90, align: 'center',
      render: boolTag,
    },
    {
      title: 'Đã ĐG & Lịch ĐG', dataIndex: 'daDgVaXepLichDg', key: 'daDg', width: 100, align: 'center',
      render: boolTag,
    },
    {
      title: 'TT Nguyên Liệu', dataIndex: 'ttNguyenLieu', key: 'ttNguyenLieu', width: 110,
      render: v => cellTxt(v),
    },
    {
      title: 'Ngày Về NL', dataIndex: 'ngayVeNguyenLieu', key: 'ngayVeNguyenLieu', width: 95, align: 'center',
      render: v => <span style={{ fontSize: 12 }}>{fmtDateO(v)}</span>,
    },
    {
      title: 'TT BBC1', dataIndex: 'ttBbc1', key: 'ttBbc1', width: 95,
      render: v => cellTxt(v),
    },
    {
      title: 'Ngày Về BBC1', dataIndex: 'ngayVeBbc1', key: 'ngayVeBbc1', width: 95, align: 'center',
      render: v => <span style={{ fontSize: 12 }}>{fmtDateO(v)}</span>,
    },
    {
      title: 'TT BBC2', dataIndex: 'ttBbc2', key: 'ttBbc2', width: 95,
      render: v => cellTxt(v),
    },
    {
      title: 'Ngày Về BBC2', dataIndex: 'ngayVeBbc2', key: 'ngayVeBbc2', width: 95, align: 'center',
      render: v => <span style={{ fontSize: 12 }}>{fmtDateO(v)}</span>,
    },
    {
      title: 'Trạng Thái Duyệt', dataIndex: 'trangThaiDuyet', key: 'trangThaiDuyet', width: 110,
      render: v => cellTxt(v),
    },
    {
      title: 'Ghi Chú', dataIndex: 'ghiChu', key: 'ghiChu', width: 180, ellipsis: true,
      render: v => v ? <span style={{ fontSize: 12, color: '#64748b' }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    ...(canEdit ? [{
      title: '', key: 'action', width: 90, fixed: 'right', align: 'center',
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Khôi phục">
            <Button size="small" type="primary" icon={<UndoOutlined />}
              style={{ background: '#15803d', borderColor: '#15803d' }}
              onClick={() => handleRestore(r.id)} />
          </Tooltip>
          <Popconfirm
            title={<><WarningOutlined style={{ color: '#ef4444' }} /> Xóa vĩnh viễn?</>}
            description="Hành động này không thể hoàn tác."
            okText="Xóa vĩnh viễn" cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ]

  return (
    <div style={{ padding: '8px 0' }}>
      {canEdit && (
        <BulkToolbar
          selected={selectedRowKeys} total={data.length}
          onSelectAll={() => setSelectedRowKeys(data.map(r => r.id))}
          onDeselectAll={() => setSelectedRowKeys([])}
          onBulkRestore={handleBulkRestore} onBulkDelete={handleBulkDelete}
          restoring={bulkRestoring} deleting={bulkDeleting}
        />
      )}
      <Table
        className="trash-table"
        columns={columns} dataSource={data} rowKey="id"
        loading={loading} size="small" scroll={{ x: 2450 }}
        rowSelection={canEdit ? {
          type: 'checkbox', selectedRowKeys,
          onChange: keys => setSelectedRowKeys(keys), columnWidth: 40,
        } : undefined}
        locale={{ emptyText: <Empty description="Thùng rác trống" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        pagination={{ defaultPageSize: 50, showSizeChanger: true, showTotal: t => `${t} bản ghi` }}
      />
    </div>
  )
}

// ── San Luong Trash ───────────────────────────────────────────────────────────
function SanLuongTrashTab({ canEdit }) {
  const [data, setData]                     = useState([])
  const [loading, setLoading]               = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [bulkRestoring, setBulkRestoring]   = useState(false)
  const [bulkDeleting, setBulkDeleting]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/production/trash')
      setData(Array.isArray(res) ? res : (res.content || []))
    } catch { message.error('Không thể tải thùng rác') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleRestore = async (id) => {
    try {
      await api.post(`/production/${id}/restore`)
      message.success('Đã khôi phục bản ghi sản lượng')
      setData(prev => prev.filter(r => r.id !== id))
    } catch (err) { message.error(err?.response?.data?.message || 'Khôi phục thất bại') }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/production/${id}/permanent`)
      message.success('Đã xóa vĩnh viễn')
      setData(prev => prev.filter(r => r.id !== id))
    } catch { message.error('Xóa thất bại') }
  }

  const handleBulkRestore = async () => {
    setBulkRestoring(true)
    let ok = 0, fail = 0
    for (const id of selectedRowKeys) {
      try { await api.post(`/production/${id}/restore`); ok++ }
      catch { fail++ }
    }
    setData(prev => prev.filter(r => !selectedRowKeys.includes(r.id)))
    setSelectedRowKeys([])
    setBulkRestoring(false)
    fail === 0 ? message.success(`Đã khôi phục ${ok} bản ghi sản lượng`)
               : message.warning(`Khôi phục ${ok} thành công, ${fail} thất bại`)
  }

  const handleBulkDelete = async () => {
    setBulkDeleting(true)
    let ok = 0, fail = 0
    for (const id of selectedRowKeys) {
      try { await api.delete(`/production/${id}/permanent`); ok++ }
      catch { fail++ }
    }
    setData(prev => prev.filter(r => !selectedRowKeys.includes(r.id)))
    setSelectedRowKeys([])
    setBulkDeleting(false)
    fail === 0 ? message.success(`Đã xóa vĩnh viễn ${ok} bản ghi`)
               : message.warning(`Xóa ${ok} thành công, ${fail} thất bại`)
  }

  const columns = [
    { title: '#', key: 'stt', width: 46, align: 'center', render: (_, __, i) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{i + 1}</span> },
    { title: 'Xóa lúc', dataIndex: 'deletedAt', key: 'deletedAt', width: 140, defaultSortOrder: 'descend',
      sorter: (a, b) => (a.deletedAt || '').localeCompare(b.deletedAt || ''),
      render: v => <span style={{ fontSize: 12, color: '#ef4444' }}>{fmtDate(v)}</span> },
    { title: 'Người xóa', dataIndex: 'deletedBy', key: 'deletedBy', width: 110,
      render: v => <span style={{ fontSize: 12, color: '#64748b' }}>{v || '—'}</span> },
    { title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 110,
      render: v => v ? <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>{v}</span> : '—' },
    { title: 'Mã TP', dataIndex: 'maTp', key: 'maTp', width: 85,
      render: v => v ? <Tag color="blue" style={{ marginRight: 0 }}>{v}</Tag> : '—' },
    { title: 'Tiến Trình', dataIndex: 'tienTrinh', key: 'ten', width: 220, ellipsis: true,
      render: v => <span style={{ fontSize: 12 }}>{v || '—'}</span> },
    { title: 'LSX', dataIndex: 'lsx', key: 'lsx', width: 90,
      render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || '—'}</span> },
    { title: 'KH', dataIndex: 'soLuong', key: 'sl', width: 90, align: 'right',
      render: v => <span style={{ fontWeight: 600 }}>{fmtNum(v)}</span> },
    { title: 'Mã ĐH', dataIndex: 'maDonHang', key: 'maDonHang', width: 90, align: 'center',
      render: v => v ? <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#7c3aed' }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'Tổ TH', dataIndex: 'toNhom', key: 'toNhom', width: 80, align: 'center',
      render: v => v ? <Tag style={{ marginRight: 0 }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'Loại SP', dataIndex: 'loaiSanPham', key: 'loaiSanPham', width: 100,
      render: v => cellTxt(v) },
    { title: 'Máy Móc', dataIndex: 'mayMoc', key: 'mayMoc', width: 110, ellipsis: true,
      render: v => cellTxt(v) },
    {
      title: <span style={{ fontSize: 11 }}>TRẠNG THÁI CÔNG ĐOẠN</span>,
      children: [
        { title: 'PCPL1', dataIndex: 'pcpl1TrangThai', key: 'pcpl1TrangThai', width: 72, align: 'center', render: v => <StatusTag value={v} /> },
        { title: 'PCPL2', dataIndex: 'pcpl2TrangThai', key: 'pcpl2TrangThai', width: 72, align: 'center', render: v => <StatusTag value={v} /> },
        { title: 'PL',    dataIndex: 'plTrangThai',    key: 'plTrangThai',    width: 68, align: 'center', render: v => <StatusTag value={v} /> },
        { title: 'ĐG',    dataIndex: 'dgTrangThai',    key: 'dgTrangThai',    width: 68, align: 'center', render: v => <StatusTag value={v} /> },
        { title: 'BBC1',  dataIndex: 'bbc1TrangThai',  key: 'bbc1TrangThai',  width: 72, align: 'center', render: v => <StatusTag value={v} /> },
      ],
    },
    {
      title: <span style={{ fontSize: 11 }}>SẢN LƯỢNG</span>,
      children: [
        { title: 'PC',   dataIndex: 'slPc',   key: 'slPc',   width: 88, align: 'center', render: v => <span style={{ fontWeight: 500 }}>{v || '—'}</span> },
        { title: 'PL',   dataIndex: 'pcPl',   key: 'pcPl',   width: 88, align: 'center', render: v => <span style={{ fontWeight: 500 }}>{v || '—'}</span> },
        { title: 'ĐG',   dataIndex: 'dg2',    key: 'dg2',    width: 88, align: 'center', render: v => <span style={{ fontWeight: 500 }}>{v || '—'}</span> },
        { title: 'BBC1', dataIndex: 'bbc1_2', key: 'bbc1_2', width: 88, align: 'center', render: v => <span style={{ fontWeight: 500 }}>{v || '—'}</span> },
      ],
    },
    { title: 'SP TG', dataIndex: 'spTrungGian', key: 'spTrungGian', width: 72, align: 'center', render: v => v ?? dash() },
    { title: 'Tổng BTP', dataIndex: 'tongBtp', key: 'tongBtp', width: 80, align: 'center', render: v => v ?? dash() },
    {
      title: 'CL BTP', key: 'clBtp', width: 80, align: 'center',
      render: (_, r) => {
        const val = (parseInt(r.dg2) || 0) - (parseInt(r.pcPl) || 0)
        const color = val > 0 ? '#cf1322' : val < 0 ? '#389e0d' : '#595959'
        const prefix = val > 0 ? '+' : ''
        return <span style={{ color }}>{val !== 0 ? `${prefix}${val}` : '—'}</span>
      },
    },
    {
      title: <span style={{ fontSize: 11 }}>CÔNG</span>,
      children: [
        { title: 'GNNL', dataIndex: 'temDb',    key: 'temDb_c',  width: 70, align: 'center', render: v => v ? Number(v).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—' },
        { title: 'BBC1', dataIndex: 'bbc1_3',   key: 'bbc1_3',   width: 70, align: 'center', render: v => v ?? '—' },
        { title: 'PC',   dataIndex: 'pcChiPhi', key: 'pcChiPhi', width: 70, align: 'center', render: v => v ?? '—' },
        { title: 'PL',   dataIndex: 'plChiPhi', key: 'plChiPhi', width: 70, align: 'center', render: v => v ?? '—' },
        { title: 'ĐG',   dataIndex: 'dgChiPhi', key: 'dgChiPhi', width: 70, align: 'center', render: v => v ?? '—' },
        { title: 'CC',   dataIndex: 'ccChiPhi', key: 'ccChiPhi', width: 70, align: 'center', render: v => v ?? '—' },
        {
          title: 'Σ', key: 'sigmaCong', width: 84, align: 'center',
          render: (_, r) => {
            const s = (Number(r.temDb) || 0) + (Number(r.bbc1_3) || 0) + (Number(r.pcChiPhi) || 0) + (Number(r.plChiPhi) || 0) + (Number(r.dgChiPhi) || 0) + (Number(r.ccChiPhi) || 0)
            return s ? s.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : <span style={{ color: '#bbb' }}>—</span>
          },
        },
      ],
    },
    {
      title: <span style={{ fontSize: 11 }}>DỞ DANG</span>,
      children: [
        { title: 'PC',   key: 'ddPc',   width: 76, align: 'center', render: (_, r) => { const v = (r.soLuong || 0) - (parseInt(r.slPc) || 0); return <span>{v}</span> } },
        { title: 'PL',   key: 'ddPl',   width: 76, align: 'center', render: (_, r) => { const v = (parseInt(r.slPc) || 0) - (parseInt(r.pcPl) || 0); return <span>{v}</span> } },
        { title: 'BBC1', key: 'ddBbc1', width: 76, align: 'center', render: (_, r) => { const v = (r.soLuong || 0) - (parseInt(r.bbc1_2) || 0); return <span>{v}</span> } },
        { title: 'ĐG',   key: 'ddDg',   width: 76, align: 'center', render: (_, r) => { const v = (parseInt(r.pcPl) || 0) - (parseInt(r.dg2) || 0); return <span>{v}</span> } },
      ],
    },
    { title: 'TP Nhập Kho', dataIndex: 'tpNhapKho', key: 'tpNhapKho', width: 90, align: 'center', render: v => v > 0 ? v : '—' },
    { title: 'TEM ĐB', dataIndex: 'temDb', key: 'temDb', width: 76, align: 'center', render: v => v ?? '—' },
    {
      title: <span style={{ fontSize: 11 }}>QA LẤY MẪU</span>,
      children: [
        { title: 'Kiểm nghiệm', key: 'qa_kn', width: 80, align: 'center', render: (_, r) => { const v = (Number(r.plQaKiemNghiem) || 0) + (Number(r.dgQaKiemNghiem) || 0); return v > 0 ? v.toLocaleString('vi-VN') : dash() } },
        { title: 'Lưu mẫu',     key: 'qa_lm', width: 72, align: 'center', render: (_, r) => { const v = (Number(r.plQaLuuMau)     || 0) + (Number(r.dgQaLuuMau)     || 0); return v > 0 ? v.toLocaleString('vi-VN') : dash() } },
        { title: 'Khác',        key: 'qa_khac', width: 60, align: 'center', render: (_, r) => { const v = (Number(r.plQaKhac)      || 0) + (Number(r.dgQaKhac)      || 0); return v > 0 ? v.toLocaleString('vi-VN') : dash() } },
        { title: 'Tổng',        key: 'qa_tong', width: 72, align: 'center', render: (_, r) => { const v = (Number(r.plQaLayMau)   || 0) + (Number(r.dgQaLayMau)    || 0); return v > 0 ? <b>{v.toLocaleString('vi-VN')}</b> : dash() } },
      ],
    },
    { title: 'Ngày Xuất Kho', dataIndex: 'ngayXuatKho', key: 'ngayXuatKho', width: 100, align: 'center', render: v => <span style={{ fontSize: 12 }}>{fmtDateO(v)}</span> },
    { title: 'TT Nhập Kho', dataIndex: 'tinhTrangNhapKho', key: 'tinhTrangNhapKho', width: 100, render: v => cellTxt(v) },
    { title: 'Tên NTH Nhập Kho', dataIndex: 'tenNthNhapKho', key: 'tenNthNhapKho', width: 130, ellipsis: true, render: v => cellTxt(v) },
    { title: 'Ghi Chú Nhập Kho', dataIndex: 'ghiChuNhapKho', key: 'ghiChuNhapKho', width: 150, ellipsis: true, render: v => cellTxt(v) },
    { title: 'Mô Tả', dataIndex: 'moTa', key: 'moTa', width: 150, ellipsis: true, render: v => cellTxt(v) },
    { title: 'Ghi Chú Hiệu Suất', dataIndex: 'ghiChuHieuSuat', key: 'ghiChuHieuSuat', width: 150, ellipsis: true, render: v => cellTxt(v) },
    {
      title: <span style={{ fontSize: 11 }}>XỬ LÝ HÀNG LỖI</span>,
      children: [
        { title: 'SL lỗi trả về', dataIndex: 'hlSoLuongTraVe', key: 'hl_slTraVe', width: 95, align: 'right',
          render: v => v != null && Number(v) !== 0 ? <span style={{ fontWeight: 700, color: '#cf1322' }}>{Number(v).toLocaleString('vi-VN')}</span> : dash() },
        { title: 'Lý do trả về', dataIndex: 'hlLiDoTraVe', key: 'hl_liDoTraVe', width: 140, ellipsis: true, render: v => cellTxt(v) },
        { title: 'Hướng xử lý', dataIndex: 'hlHuongXuLy', key: 'hl_huongXuLy', width: 110, ellipsis: true, render: v => cellTxt(v) },
        { title: 'Trạng thái XL', dataIndex: 'hlTrangThaiXuLy', key: 'hl_trangThaiXuLy', width: 110, ellipsis: true, render: v => cellTxt(v) },
        { title: 'Lý do chưa TH', dataIndex: 'hlLyDoChuaThucHien', key: 'hl_lyDoChua', width: 130, ellipsis: true, render: v => cellTxt(v) },
        { title: 'SL đạt sau XL', dataIndex: 'hlSlDatSauXuLy', key: 'hl_slDat', width: 95, align: 'right',
          render: v => v != null && Number(v) !== 0 ? <span style={{ fontWeight: 600, color: '#16a34a' }}>{Number(v).toLocaleString('vi-VN')}</span> : dash() },
        { title: 'SL hủy', dataIndex: 'hlSlHuy', key: 'hl_slHuy', width: 80, align: 'right',
          render: v => v != null && Number(v) !== 0 ? <span style={{ fontWeight: 600, color: '#ef4444' }}>{Number(v).toLocaleString('vi-VN')}</span> : dash() },
      ],
    },
    ...(canEdit ? [{
      title: '', key: 'action', width: 90, fixed: 'right', align: 'center',
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Khôi phục">
            <Button size="small" type="primary" icon={<UndoOutlined />}
              style={{ background: '#15803d', borderColor: '#15803d' }}
              onClick={() => handleRestore(r.id)} />
          </Tooltip>
          <Popconfirm title={<><WarningOutlined style={{ color: '#ef4444' }} /> Xóa vĩnh viễn?</>}
            description="Hành động này không thể hoàn tác."
            okText="Xóa vĩnh viễn" cancelText="Hủy" okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ]

  return (
    <div style={{ padding: '8px 0' }}>
      {canEdit && (
        <BulkToolbar
          selected={selectedRowKeys} total={data.length}
          onSelectAll={() => setSelectedRowKeys(data.map(r => r.id))}
          onDeselectAll={() => setSelectedRowKeys([])}
          onBulkRestore={handleBulkRestore} onBulkDelete={handleBulkDelete}
          restoring={bulkRestoring} deleting={bulkDeleting}
        />
      )}
      <Table
        className="trash-table" columns={columns} dataSource={data} rowKey="id"
        loading={loading} size="small" scroll={{ x: 3900 }}
        rowSelection={canEdit ? {
          type: 'checkbox', selectedRowKeys,
          onChange: keys => setSelectedRowKeys(keys), columnWidth: 40,
        } : undefined}
        locale={{ emptyText: <Empty description="Thùng rác trống" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        pagination={{ defaultPageSize: 50, showSizeChanger: true, showTotal: t => `${t} bản ghi` }} />
    </div>
  )
}

// ── Lich Lam Viec Trash ───────────────────────────────────────────────────────
function LichLamViecTrashTab({ canEdit }) {
  const [data, setData]                     = useState([])
  const [loading, setLoading]               = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [bulkRestoring, setBulkRestoring]   = useState(false)
  const [bulkDeleting, setBulkDeleting]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/work-schedule/trash')
      setData(Array.isArray(res) ? res : (res.content || []))
    } catch { message.error('Không thể tải thùng rác') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleRestore = async (id) => {
    try {
      await api.post(`/work-schedule/${id}/restore`)
      message.success('Đã khôi phục bản ghi lịch làm việc')
      setData(prev => prev.filter(r => r.id !== id))
    } catch (err) { message.error(err?.response?.data?.message || 'Khôi phục thất bại') }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/work-schedule/${id}/permanent`)
      message.success('Đã xóa vĩnh viễn')
      setData(prev => prev.filter(r => r.id !== id))
    } catch { message.error('Xóa thất bại') }
  }

  const handleBulkRestore = async () => {
    setBulkRestoring(true)
    let ok = 0, fail = 0
    for (const id of selectedRowKeys) {
      try { await api.post(`/work-schedule/${id}/restore`); ok++ }
      catch { fail++ }
    }
    setData(prev => prev.filter(r => !selectedRowKeys.includes(r.id)))
    setSelectedRowKeys([])
    setBulkRestoring(false)
    fail === 0 ? message.success(`Đã khôi phục ${ok} bản ghi lịch làm việc`)
               : message.warning(`Khôi phục ${ok} thành công, ${fail} thất bại`)
  }

  const handleBulkDelete = async () => {
    setBulkDeleting(true)
    let ok = 0, fail = 0
    for (const id of selectedRowKeys) {
      try { await api.delete(`/work-schedule/${id}/permanent`); ok++ }
      catch { fail++ }
    }
    setData(prev => prev.filter(r => !selectedRowKeys.includes(r.id)))
    setSelectedRowKeys([])
    setBulkDeleting(false)
    fail === 0 ? message.success(`Đã xóa vĩnh viễn ${ok} bản ghi`)
               : message.warning(`Xóa ${ok} thành công, ${fail} thất bại`)
  }

  const columns = [
    { title: '#', key: 'stt', width: 46, align: 'center', render: (_, __, i) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{i + 1}</span> },
    { title: 'Xóa lúc', dataIndex: 'deletedAt', key: 'deletedAt', width: 140, defaultSortOrder: 'descend',
      sorter: (a, b) => (a.deletedAt || '').localeCompare(b.deletedAt || ''),
      render: v => <span style={{ fontSize: 12, color: '#ef4444' }}>{fmtDate(v)}</span> },
    { title: 'Người xóa', dataIndex: 'deletedBy', key: 'deletedBy', width: 110,
      render: v => <span style={{ fontSize: 12, color: '#64748b' }}>{v || '—'}</span> },
    { title: 'Nguồn', dataIndex: 'source', key: 'source', width: 80, align: 'center',
      render: v => v ? <Tag color={v === 'PLAN' ? 'blue' : 'green'} style={{ marginRight: 0 }}>{v}</Tag> : '—' },
    { title: 'Công Đoạn', dataIndex: 'congDoan', key: 'congDoan', width: 85, align: 'center',
      render: v => v ? <Tag color="geekblue" style={{ marginRight: 0 }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 100,
      render: v => v ? <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff', fontSize: 12 }}>{v}</span> : '—' },
    { title: 'Mã SP', dataIndex: 'maSp', key: 'maSp', width: 95,
      render: v => v ? <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v}</span> : '—' },
    { title: 'Tiến Trình', dataIndex: 'tenTrinh', key: 'ten', width: 220, ellipsis: true,
      render: v => <span style={{ fontSize: 12 }}>{v || '—'}</span> },
    { title: 'Số Lô', dataIndex: 'soLo', key: 'soLo', width: 90,
      render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || '—'}</span> },
    { title: 'Mã ĐH', dataIndex: 'maDonHang', key: 'maDonHang', width: 90, align: 'center',
      render: v => v ? <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#7c3aed' }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'Cỡ Lô', dataIndex: 'coLo', key: 'coLo', width: 85, align: 'right',
      render: v => <span style={{ fontSize: 12 }}>{fmtNum(v)}</span> },
    { title: 'Tổ', dataIndex: 'toNhom', key: 'toNhom', width: 80, align: 'center',
      render: v => v ? <Tag style={{ marginRight: 0 }}>{v}</Tag> : '—' },
    { title: 'Ngày TH', dataIndex: 'ngayThucHien', key: 'ngay', width: 100,
      render: v => v ? <span style={{ fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</span> : '—' },
    { title: 'Phòng TH', dataIndex: 'phongThucHien', key: 'phongThucHien', width: 110, align: 'center',
      render: v => cellTxt(v) },
    { title: 'Phòng SX', dataIndex: 'phongSanXuat', key: 'phongSanXuat', width: 110, align: 'center',
      render: v => cellTxt(v) },
    {
      title: 'SL', key: 'sl', width: 85, align: 'right',
      render: (_, r) => { const f = SL_FIELD_MAP[(r.congDoan || '').toUpperCase()]; const v = f ? r[f] : null; return v != null ? <span style={{ fontWeight: 600 }}>{fmtNum(v)}</span> : dash() },
    },
    {
      title: 'Công', key: 'cong', width: 80, align: 'right',
      render: (_, r) => { const f = CONG_FIELD_MAP[(r.congDoan || '').toUpperCase()]; const v = f ? r[f] : null; return v != null ? fmtNum(v) : dash() },
    },
    { title: 'KL/ĐV', dataIndex: 'klDv', key: 'klDv', width: 80, align: 'right', render: v => v != null ? fmtNum(v) : dash() },
    { title: 'Khối Lượng Lô', dataIndex: 'khoiLuongLo', key: 'khoiLuongLo', width: 100, align: 'right', render: v => v != null ? fmtNum(v) : dash() },
    { title: 'Số Mẻ', dataIndex: 'soMe', key: 'soMe', width: 70, align: 'right', render: v => v ?? dash() },
    { title: 'Tình Trạng', dataIndex: 'tinhTrang', key: 'tinhTrang', width: 100, align: 'center', render: v => cellTxt(v) },
    { title: 'SL Nhập Kho', dataIndex: 'tpNhapKho', key: 'tpNhapKho', width: 95, align: 'right', render: v => v > 0 ? v : dash() },
    {
      title: <span style={{ fontSize: 11 }}>QA</span>,
      children: [
        { title: 'Lấy mẫu',   dataIndex: 'qaLayMau',     key: 'qaLayMau',     width: 75, align: 'center', render: v => v ?? dash() },
        { title: 'K.nghiệm',  dataIndex: 'qaKiemNghiem', key: 'qaKiemNghiem', width: 78, align: 'center', render: v => v ?? dash() },
        { title: 'Lưu mẫu',   dataIndex: 'qaLuuMau',     key: 'qaLuuMau',     width: 72, align: 'center', render: v => v ?? dash() },
        { title: 'Khác',      dataIndex: 'qaKhac',       key: 'qaKhac',       width: 60, align: 'center', render: v => v ?? dash() },
      ],
    },
    { title: 'Trưởng Ca', dataIndex: 'truongCa', key: 'truongCa', width: 110, ellipsis: true, render: v => cellTxt(v) },
    { title: 'Người Hỗ Trợ', dataIndex: 'nguoiHoTro', key: 'nguoiHoTro', width: 120, ellipsis: true, render: v => cellTxt(v) },
    { title: 'Chú Ý', dataIndex: 'chuY', key: 'chuY', width: 130, ellipsis: true, render: v => cellTxt(v) },
    { title: 'Sai Lệch', dataIndex: 'saiLech', key: 'saiLech', width: 130, ellipsis: true, render: v => cellTxt(v) },
    ...(canEdit ? [{
      title: '', key: 'action', width: 90, fixed: 'right', align: 'center',
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Khôi phục">
            <Button size="small" type="primary" icon={<UndoOutlined />}
              style={{ background: '#15803d', borderColor: '#15803d' }}
              onClick={() => handleRestore(r.id)} />
          </Tooltip>
          <Popconfirm title={<><WarningOutlined style={{ color: '#ef4444' }} /> Xóa vĩnh viễn?</>}
            description="Hành động này không thể hoàn tác."
            okText="Xóa vĩnh viễn" cancelText="Hủy" okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ]

  return (
    <div style={{ padding: '8px 0' }}>
      {canEdit && (
        <BulkToolbar
          selected={selectedRowKeys} total={data.length}
          onSelectAll={() => setSelectedRowKeys(data.map(r => r.id))}
          onDeselectAll={() => setSelectedRowKeys([])}
          onBulkRestore={handleBulkRestore} onBulkDelete={handleBulkDelete}
          restoring={bulkRestoring} deleting={bulkDeleting}
        />
      )}
      <Table
        className="trash-table" columns={columns} dataSource={data} rowKey="id"
        loading={loading} size="small" scroll={{ x: 2350 }}
        rowSelection={canEdit ? {
          type: 'checkbox', selectedRowKeys,
          onChange: keys => setSelectedRowKeys(keys), columnWidth: 40,
        } : undefined}
        locale={{ emptyText: <Empty description="Thùng rác trống" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        pagination={{ defaultPageSize: 50, showSizeChanger: true, showTotal: t => `${t} bản ghi` }} />
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TrashPage() {
  const { isAdmin } = useAuth()
  const canEdit = isAdmin()

  const [donHangCount, setDonHangCount] = useState(0)
  const [sanLuongCount, setSanLuongCount] = useState(0)
  const [lichLamViecCount, setLichLamViecCount] = useState(0)

  useEffect(() => {
    api.get('/don-hang/trash').then(({ data }) => setDonHangCount(data.length)).catch(() => {})
    api.get('/production/trash').then(({ data }) => setSanLuongCount((Array.isArray(data) ? data : data.content || []).length)).catch(() => {})
    api.get('/work-schedule/trash').then(({ data }) => setLichLamViecCount((Array.isArray(data) ? data : data.content || []).length)).catch(() => {})
  }, [])

  const tabItems = [
    {
      key: 'donhang',
      label: (
        <span>
          <ShoppingOutlined style={{ marginRight: 5 }} />
          Đơn Hàng
          {donHangCount > 0 && <Badge count={donHangCount} style={{ marginLeft: 6, background: '#ef4444' }} />}
        </span>
      ),
      children: <DonHangTrashTab canEdit={canEdit} />,
    },
    {
      key: 'sanluong',
      label: (
        <span>
          <BarChartOutlined style={{ marginRight: 5 }} />
          Sản Lượng
          {sanLuongCount > 0 && <Badge count={sanLuongCount} style={{ marginLeft: 6, background: '#ef4444' }} />}
        </span>
      ),
      children: <SanLuongTrashTab canEdit={canEdit} />,
    },
    {
      key: 'lichlam',
      label: (
        <span>
          <CalendarOutlined style={{ marginRight: 5 }} />
          Lịch Làm Việc
          {lichLamViecCount > 0 && <Badge count={lichLamViecCount} style={{ marginLeft: 6, background: '#ef4444' }} />}
        </span>
      ),
      children: <LichLamViecTrashTab canEdit={canEdit} />,
    },
  ]

  return (
    <>
      <style>{`
        .trash-header {
          background: linear-gradient(90deg, #1a3a5c 0%, #2d1b5e 60%, #7c3aed 100%);
          padding: 10px 20px; display: flex; align-items: center; gap: 12;
        }
        .trash-tabs > .ant-tabs-nav {
          background: linear-gradient(90deg, #1e1b4b 0%, #2e1065 100%) !important;
          padding: 0 12px; margin: 0 !important;
        }
        .trash-tabs > .ant-tabs-nav .ant-tabs-tab {
          color: #c4b5fd !important; font-size: 13px;
          padding: 9px 18px !important; margin: 0 2px !important;
        }
        .trash-tabs > .ant-tabs-nav .ant-tabs-tab:hover { color: #fff !important; background: rgba(124,58,237,0.2) !important; }
        .trash-tabs > .ant-tabs-nav .ant-tabs-tab-active { color: #fff !important; font-weight: 700 !important; background: rgba(124,58,237,0.3) !important; box-shadow: 0 -3px 0 #a78bfa inset; }
        .trash-tabs > .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-btn { color: #fff !important; }
        .trash-tabs > .ant-tabs-nav .ant-tabs-ink-bar { background: #a78bfa !important; }
        .trash-tabs > .ant-tabs-nav::before { border: none !important; }
        .trash-tabs > .ant-tabs-content-holder { padding: 0 12px; }

        .trash-table .ant-table-thead > tr > th {
          background: linear-gradient(90deg, #4c1d95 0%, #6d28d9 100%) !important;
          color: #fff !important; font-size: 11px !important; font-weight: 700 !important;
          text-transform: uppercase; padding: 7px 8px !important; white-space: nowrap;
          border-right: 1px solid #7c3aed !important;
        }
        .trash-table .ant-table-thead > tr > th::before { display: none !important; }
        .trash-table .ant-table-tbody > tr > td { padding: 6px 8px !important; }
        .trash-table .ant-table-tbody > tr:nth-child(even) > td { background: #fdf4ff; }
        .trash-table .ant-table-tbody > tr:hover > td { background: #f3e8ff !important; }
        .trash-table .ant-table-selection-column { background: transparent !important; }
      `}</style>

      {/* Header */}
      <div className="trash-header">
        <DeleteOutlined style={{ color: '#f87171', fontSize: 20 }} />
        <span style={{ fontWeight: 800, fontSize: 16, color: '#fff', marginLeft: 8 }}>
          Thùng Rác
        </span>
        <Typography.Text style={{ color: '#c4b5fd', fontSize: 12, marginLeft: 8 }}>
          Các bản ghi đã xóa — có thể khôi phục hoặc xóa vĩnh viễn
        </Typography.Text>
      </div>

      <Tabs
        className="trash-tabs"
        defaultActiveKey="donhang"
        items={tabItems}
        tabBarStyle={{ marginBottom: 0 }}
      />
    </>
  )
}
