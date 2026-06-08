import React, { useState, useEffect, useCallback } from 'react'
import { Table, Input, Select, Tag, Tooltip, message } from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import api from '../api/axios'

const { Option } = Select

const fmtNum  = (v) => v != null && v !== '' ? Number(v).toLocaleString('vi-VN') : '—'

export default function LenhSanXuatPage() {
  const navigate = useNavigate()

  const [data,       setData]       = useState([])
  const [loading,    setLoading]    = useState(false)
  const [searchText, setSearchText] = useState('')
  const [filterLoai, setFilterLoai] = useState(null)
  const [loaiList,   setLoaiList]   = useState([])

  // ── Fetch product master ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/product-master', {
        params: { page: 0, size: 9999 },
      })
      const rows = res.content || []
      setData(rows)
      const loais = [...new Set(rows.map(r => r.loaiSanPham).filter(Boolean))].sort()
      setLoaiList(loais)
    } catch {
      message.error('Không thể tải danh mục sản phẩm')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Navigate to detail page ───────────────────────────────────────────────
  const openDetail = (record) => {
    navigate(`/lenh-san-xuat/${encodeURIComponent(record.maBravo)}`, {
      state: { product: record },
    })
  }

  // ── Filter ────────────────────────────────────────────────────────────────
  const filteredData = () => {
    let rows = data
    if (filterLoai) rows = rows.filter(r => r.loaiSanPham === filterLoai)
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      rows = rows.filter(r =>
        (r.maBravo   || '').toLowerCase().includes(q) ||
        (r.maTp      || '').toLowerCase().includes(q) ||
        (r.tienTrinh || '').toLowerCase().includes(q)
      )
    }
    return rows
  }

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'STT',
      width: 52,
      align: 'center',
      render: (_, __, idx) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{idx + 1}</span>,
    },
    {
      title: 'MÃ BRAVO',
      dataIndex: 'maBravo',
      width: 120,
      render: (v) => v
        ? <span style={{ fontFamily: 'monospace', color: '#0284c7', fontWeight: 700 }}>{v}</span>
        : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'MÃ SP',
      dataIndex: 'maTp',
      width: 100,
      render: (v) => v ? <Tag color="default" style={{ fontWeight: 600 }}>{v}</Tag> : '—',
    },
    {
      title: 'TÊN SẢN PHẨM',
      dataIndex: 'tienTrinh',
      ellipsis: true,
      render: (v) => (
        <Tooltip title={v}>
          <span style={{ fontWeight: 500 }}>{v || '—'}</span>
        </Tooltip>
      ),
    },
    {
      title: 'LOẠI SẢN PHẨM',
      dataIndex: 'loaiSanPham',
      width: 150,
      render: (v) => v
        ? <Tag color="blue">{v}</Tag>
        : <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: 'KL 1 ĐƠN VỊ',
      dataIndex: 'khoiLuong',
      width: 120,
      align: 'right',
      render: (v) => <span style={{ fontWeight: 600, color: '#1e4570' }}>{fmtNum(v)}</span>,
    },
    {
      title: 'CỠ LÔ TỐI ƯU',
      dataIndex: 'slTrungBinh',
      width: 130,
      align: 'right',
      render: (v) => <span style={{ fontWeight: 700, color: '#1e4570' }}>{fmtNum(v)}</span>,
    },
  ]

  const rows = filteredData()

  return (
    <div>
      <style>{`
        .lenh-sx-table .ant-table-thead > tr > th {
          background: #1e4570 !important; color: #fff !important;
          font-weight: 700; font-size: 12px; padding: 8px 10px; white-space: nowrap;
        }
        .lenh-sx-table .ant-table-thead > tr > th::before { display: none !important; }
        .lenh-sx-table .ant-table-tbody > tr > td { font-size: 13px; padding: 6px 10px; }
        .lenh-sx-table .ant-table-tbody > tr:hover > td { background: #eff6ff !important; }
        .lenh-sx-table .ant-table-tbody > tr { cursor: pointer; }
      `}</style>

      {/* ── Sticky header + filter bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', paddingBottom: 10,
        borderBottom: '1px solid #e2e8f0', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', paddingTop: 4 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#1e4570', letterSpacing: '0.02em', marginRight: 8, whiteSpace: 'nowrap' }}>
            LỆNH SẢN XUẤT
          </span>
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Mã Bravo / Mã SP / Tên SP"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            allowClear
            size="small"
            style={{ width: 240 }}
          />
          <Select
            placeholder="Loại sản phẩm"
            value={filterLoai}
            onChange={setFilterLoai}
            allowClear
            size="small"
            style={{ width: 180 }}
          >
            {loaiList.map(l => <Option key={l} value={l}>{l}</Option>)}
          </Select>
          <span
            style={{ cursor: 'pointer', color: '#6b7280', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => { setSearchText(''); setFilterLoai(null); fetchData() }}
          >
            <ReloadOutlined /> Reset
          </span>
          <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: 12 }}>
            {rows.length} sản phẩm — <span style={{ color: '#94a3b8' }}>Nhấp đúp vào hàng để xem chi tiết</span>
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <Table
        className="lenh-sx-table"
        rowKey="id"
        dataSource={rows}
        columns={columns}
        loading={loading}
        size="small"
        scroll={{ x: 900 }}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          pageSizeOptions: ['50', '100', '200'],
          showTotal: (t) => `Tổng ${t} sản phẩm`,
        }}
        onRow={(record) => ({
          onDoubleClick: () => openDetail(record),
        })}
      />
    </div>
  )
}
