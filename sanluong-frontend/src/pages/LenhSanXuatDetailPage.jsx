import React, { useState, useEffect, useCallback } from 'react'
import {
  Table, Input, Tag, Tooltip, message,
  Form, InputNumber, Badge, Button, Spin,
} from 'antd'
import {
  ArrowLeftOutlined, EditOutlined,
  CheckCircleFilled, CloseCircleFilled,
} from '@ant-design/icons'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import dayjs from 'dayjs'
import api from '../api/axios'

const fmtNum  = (v) => v != null && v !== '' ? Number(v).toLocaleString('vi-VN') : '—'
const fmtDate = (v) => v ? dayjs(v).format('DD/MM/YYYY') : '—'

export default function LenhSanXuatDetailPage() {
  const { maBravo }   = useParams()
  const navigate      = useNavigate()
  const location      = useLocation()

  const [product,     setProduct]     = useState(location.state?.product || null)
  const [productLoad, setProductLoad] = useState(!location.state?.product)
  const [orders,      setOrders]      = useState([])
  const [ordersLoad,  setOrdersLoad]  = useState(false)
  const [editingInfo, setEditingInfo] = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [infoForm]                    = Form.useForm()

  // ── Fetch product if not passed via state ────────────────────────────────
  useEffect(() => {
    if (product) {
      infoForm.setFieldsValue({
        maBravo:     product.maBravo,
        maTp:        product.maTp,
        tienTrinh:   product.tienTrinh,
        loaiSanPham: product.loaiSanPham,
        khoiLuong:   product.khoiLuong   != null ? Number(product.khoiLuong)   : null,
        slTrungBinh: product.slTrungBinh != null ? Number(product.slTrungBinh) : null,
      })
      return
    }
    setProductLoad(true)
    api.get(`/product-master/lookup-by-bravo/${encodeURIComponent(maBravo)}`)
      .then(({ data }) => {
        setProduct(data)
        infoForm.setFieldsValue({
          maBravo:     data.maBravo,
          maTp:        data.maTp,
          tienTrinh:   data.tienTrinh,
          loaiSanPham: data.loaiSanPham,
          khoiLuong:   data.khoiLuong   != null ? Number(data.khoiLuong)   : null,
          slTrungBinh: data.slTrungBinh != null ? Number(data.slTrungBinh) : null,
        })
      })
      .catch(() => message.error('Không tìm thấy sản phẩm'))
      .finally(() => setProductLoad(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maBravo])

  // ── Fetch orders ─────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    if (!maBravo) return
    setOrdersLoad(true)
    try {
      const { data: rows } = await api.get('/don-hang/by-product', { params: { maBravo } })
      setOrders(Array.isArray(rows) ? rows : [])
    } catch {
      message.error('Không thể tải danh sách đơn hàng')
    } finally {
      setOrdersLoad(false)
    }
  }, [maBravo])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // ── Save product info ─────────────────────────────────────────────────────
  const handleSaveInfo = async () => {
    try {
      const values = await infoForm.validateFields()
      setSaving(true)
      await api.put(`/product-master/${product.id}`, { ...product, ...values })
      message.success('Cập nhật thành công')
      setProduct(prev => ({ ...prev, ...values }))
      setEditingInfo(false)
    } catch (err) {
      if (err?.response) message.error(err.response.data?.message || 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  // ── Order table columns ───────────────────────────────────────────────────
  const orderCols = [
    {
      title: 'STT',
      width: 48,
      align: 'center',
      render: (_, __, idx) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{idx + 1}</span>,
    },
    {
      title: 'MÃ BRAVO',
      dataIndex: 'maBravo',
      width: 110,
      render: (v) => v
        ? <span style={{ fontFamily: 'monospace', color: '#0284c7', fontWeight: 700 }}>{v}</span>
        : '—',
    },
    {
      title: 'MÃ SP',
      dataIndex: 'maSp',
      width: 90,
      render: (v) => v ? <Tag color="default">{v}</Tag> : '—',
    },
    {
      title: 'TÊN SẢN PHẨM',
      dataIndex: 'tenSanPham',
      ellipsis: true,
      render: (v) => <Tooltip title={v}><span>{v || '—'}</span></Tooltip>,
    },
    {
      title: 'MÃ ĐƠN HÀNG',
      dataIndex: 'maDonHang',
      width: 130,
      render: (v) => v
        ? <span style={{ color: '#7c3aed', fontWeight: 600 }}>{v}</span>
        : '—',
    },
    {
      title: 'SỐ LÔ',
      dataIndex: 'soLo',
      width: 90,
      render: (v) => v
        ? <span style={{ fontFamily: 'monospace', color: '#7c3aed', fontWeight: 600 }}>{v}</span>
        : '—',
    },
    {
      title: 'SL ĐẶT HÀNG',
      dataIndex: 'soLuongDatHang',
      width: 120,
      align: 'right',
      render: (v) => <span style={{ fontWeight: 600 }}>{fmtNum(v)}</span>,
    },
    {
      title: 'SL CÒN LẠI',
      dataIndex: 'soLuongConLai',
      width: 110,
      align: 'right',
      render: (v) => {
        if (v == null) return '—'
        const n = Number(v)
        return (
          <span style={{ fontWeight: 600, color: n <= 0 ? '#16a34a' : '#dc2626' }}>
            {fmtNum(v)}
          </span>
        )
      },
    },
    {
      title: 'TÌNH TRẠNG SX',
      dataIndex: 'tinhTrangSx',
      width: 140,
      render: (v) => {
        if (v === 'done')  return <Badge status="success"    text={<span style={{ color: '#16a34a', fontWeight: 600, fontSize: 12 }}>Hoàn thành</span>} />
        if (v === 'doing') return <Badge status="processing" text={<span style={{ color: '#0284c7', fontWeight: 600, fontSize: 12 }}>Đang sản xuất</span>} />
        return <Badge status="default" text={<span style={{ color: '#94a3b8', fontSize: 12 }}>Chưa sản xuất</span>} />
      },
    },
    {
      title: 'ĐỘ ƯU TIÊN',
      dataIndex: 'tinhTrangDatHang',
      width: 110,
      render: (v) => {
        if (v === 'rat_gap') return <Tag color="red">Rất gấp</Tag>
        if (v === 'gap')     return <Tag color="orange">Gấp</Tag>
        return <span style={{ color: '#94a3b8' }}>—</span>
      },
    },
    {
      title: 'NGÀY ĐẶT HÀNG',
      dataIndex: 'ngayDatHang',
      width: 130,
      render: (v) => fmtDate(v),
    },
    {
      title: 'NGÀY PHÁT LỆNH',
      dataIndex: 'ngayPhatLenh',
      width: 130,
      render: (v) => fmtDate(v),
    },
  ]

  // ── Shared input style ────────────────────────────────────────────────────
  const viewStyle = { background: 'transparent', border: 'none', padding: 0 }

  if (productLoad) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <style>{`
        .lenh-detail-table .ant-table-thead > tr > th {
          background: #334155 !important; color: #fff !important;
          font-weight: 700; font-size: 12px; padding: 7px 10px; white-space: nowrap;
        }
        .lenh-detail-table .ant-table-thead > tr > th::before { display: none !important; }
        .lenh-detail-table .ant-table-tbody > tr > td { font-size: 13px; padding: 6px 10px; }
        .lenh-detail-table .ant-table-tbody > tr:hover > td { background: #f1f5f9 !important; }
      `}</style>

      {/* ── Back + title bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ background: '#1e4570', color: '#fff', border: 'none', fontWeight: 600 }}
        >
          Quay lại
        </Button>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#1e4570' }}>
          {product?.tienTrinh || maBravo}
        </span>
        <Tag color="blue" style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>
          {maBravo}
        </Tag>
      </div>

      {/* ── Thông tin chung ── */}
      <div style={{
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
        padding: '14px 18px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontWeight: 700, color: '#1e4570', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Thông Tin Chung Cơ Cấu Tướng
          </span>
          {!editingInfo ? (
            <span
              style={{ cursor: 'pointer', color: '#0284c7', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setEditingInfo(true)}
            >
              <EditOutlined /> Chỉnh sửa
            </span>
          ) : (
            <div style={{ display: 'flex', gap: 12 }}>
              <span
                style={{ cursor: 'pointer', color: '#16a34a', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={handleSaveInfo}
              >
                <CheckCircleFilled /> {saving ? 'Đang lưu…' : 'Lưu'}
              </span>
              <span
                style={{ cursor: 'pointer', color: '#dc2626', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => {
                  setEditingInfo(false)
                  infoForm.setFieldsValue({
                    maBravo:     product?.maBravo,
                    maTp:        product?.maTp,
                    tienTrinh:   product?.tienTrinh,
                    loaiSanPham: product?.loaiSanPham,
                    khoiLuong:   product?.khoiLuong   != null ? Number(product.khoiLuong)   : null,
                    slTrungBinh: product?.slTrungBinh != null ? Number(product.slTrungBinh) : null,
                  })
                }}
              >
                <CloseCircleFilled /> Hủy
              </span>
            </div>
          )}
        </div>

        <Form form={infoForm} layout="vertical" size="small">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px 24px' }}>
            <Form.Item name="maBravo" label="Mã Bravo">
              <Input
                disabled={!editingInfo}
                style={editingInfo ? undefined : { ...viewStyle, fontWeight: 700, color: '#0284c7', fontFamily: 'monospace' }}
              />
            </Form.Item>
            <Form.Item name="loaiSanPham" label="Loại Sản Phẩm">
              <Input disabled={!editingInfo} style={editingInfo ? undefined : viewStyle} />
            </Form.Item>
            <Form.Item name="maTp" label="Mã SP">
              <Input disabled={!editingInfo} style={editingInfo ? undefined : { ...viewStyle, fontWeight: 600 }} />
            </Form.Item>
            <Form.Item name="tienTrinh" label="Tên Sản Phẩm">
              <Input disabled={!editingInfo} style={editingInfo ? undefined : { ...viewStyle, fontWeight: 500 }} />
            </Form.Item>
            <Form.Item name="khoiLuong" label="KL 1 Đơn Vị">
              <InputNumber
                disabled={!editingInfo}
                style={{ width: '100%', ...(editingInfo ? {} : viewStyle) }}
                formatter={v => v ? Number(v).toLocaleString('vi-VN') : ''}
                parser={v => v ? Number(v.replace(/\./g, '').replace(',', '.')) : null}
              />
            </Form.Item>
            <Form.Item name="slTrungBinh" label="Cỡ Lô Tối Ưu">
              <InputNumber
                disabled={!editingInfo}
                style={{ width: '100%', ...(editingInfo ? {} : viewStyle) }}
                formatter={v => v ? Number(v).toLocaleString('vi-VN') : ''}
                parser={v => v ? Number(v.replace(/\./g, '').replace(',', '.')) : null}
              />
            </Form.Item>
          </div>
        </Form>
      </div>

      {/* ── Danh mục các lệnh ── */}
      <div style={{ fontWeight: 700, color: '#1e4570', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
        Danh Mục Các Lệnh
        <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 12, marginLeft: 8 }}>
          ({orders.length} đơn hàng — sắp xếp theo ngày đặt hàng)
        </span>
      </div>
      <Table
        className="lenh-detail-table"
        rowKey="id"
        dataSource={orders}
        columns={orderCols}
        loading={ordersLoad}
        size="small"
        scroll={{ x: 1300 }}
        pagination={orders.length > 30
          ? { pageSize: 30, showSizeChanger: true, showTotal: (t) => `${t} đơn hàng` }
          : false
        }
      />
    </div>
  )
}
