import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Input, Tag, Tooltip, message,
  Form, InputNumber, Badge, Button, Spin,
} from 'antd'
import SkeletonTable from '../components/SkeletonTable'
import {
  ArrowLeftOutlined, EditOutlined,
  CheckCircleFilled, CloseCircleFilled,
  UnorderedListOutlined, TableOutlined,
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
  const [lenhs,       setLenhs]       = useState([])
  const [ordersLoad,  setOrdersLoad]  = useState(true)
  const [editingInfo, setEditingInfo] = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [infoForm]                    = Form.useForm()
  const [activeTab,   setActiveTab]   = useState('lenh')
  const [bom,         setBom]         = useState(null)   // { header, nvl, baoBi, updatedAt }
  const [bomLoad,     setBomLoad]     = useState(false)

  // ── Fetch product ────────────────────────────────────────────────────────
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

  // ── Fetch orders + lệnh song song ────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!maBravo) return
    setOrdersLoad(true)
    try {
      const [ordersRes, lenhsRes] = await Promise.all([
        api.get('/don-hang/by-product',      { params: { maBravo } }),
        api.get('/lenh-san-xuat/by-product', { params: { maBravo } }),
      ])
      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : [])
      setLenhs(Array.isArray(lenhsRes.data)   ? lenhsRes.data  : [])
    } catch {
      message.error('Không thể tải dữ liệu')
    } finally {
      setOrdersLoad(false)
    }
  }, [maBravo])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Fetch BOM (định mức vật tư) ──────────────────────────────────────────
  const fetchBom = useCallback(async () => {
    if (!maBravo) return
    setBomLoad(true)
    try {
      const { data } = await api.get('/lsx/to-lenh/by-bravo', { params: { maBravo } })
      setBom({
        header:  data.header  || {},
        nvl:     Array.isArray(data.nguyenVatLieu) ? data.nguyenVatLieu : [],
        baoBi:   Array.isArray(data.baoBi)         ? data.baoBi         : [],
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      })
    } catch (err) {
      if (err?.response?.status !== 204) message.error('Không thể tải định mức vật tư')
      setBom({ header: {}, nvl: [], baoBi: [], updatedAt: null, updatedBy: null })
    } finally {
      setBomLoad(false)
    }
  }, [maBravo])

  useEffect(() => {
    if (activeTab === 'dinhmuc' && bom === null) fetchBom()
  }, [activeTab, bom, fetchBom])

  // ── Merge: 1 dòng / lệnh sản xuất ────────────────────────────────────────
  const tableRows = useMemo(() => {
    const orderMap = {}
    orders.forEach(o => { if (o.maDonHang) orderMap[o.maDonHang] = o })

    const rows = []
    const ordersWithLenh = new Set()

    lenhs.forEach(l => {
      const order = orderMap[l.maDonHang] || {}
      ordersWithLenh.add(l.maDonHang)
      rows.push({
        _rowKey:          `lenh_${l.id}`,
        _donHangId:       order.id,
        _orderRecord:     order,
        maBravo:          l.maBravo,
        maSp:             l.maSp,
        tenSanPham:       l.tenSanPham,
        maDonHang:        l.maDonHang,
        soLo:             l.soLo,
        soLuongLenh:      l.soLuong,
        toThucHien:       l.toThucHien,
        ngayThucHien:     l.ngayThucHien,
        ngayPhatLenh:     l.ngayPhatLenh,
        soLuongDatHang:   order.soLuongDatHang,
        soLuongConLai:    order.soLuongConLai,
        tinhTrangSx:      order.tinhTrangSx,
        tinhTrangDatHang: order.tinhTrangDatHang,
        ngayDatHang:      order.ngayDatHang,
      })
    })

    // Đơn hàng chưa có lệnh nào → 1 dòng placeholder
    orders.forEach(o => {
      if (!ordersWithLenh.has(o.maDonHang)) {
        rows.push({
          _rowKey:          `order_${o.id}`,
          _donHangId:       o.id,
          _orderRecord:     o,
          maBravo:          o.maBravo,
          maSp:             o.maSp,
          tenSanPham:       o.tenSanPham,
          maDonHang:        o.maDonHang,
          soLo:             null,
          soLuongLenh:      null,
          toThucHien:       null,
          ngayThucHien:     null,
          ngayPhatLenh:     o.ngayPhatLenh,
          soLuongDatHang:   o.soLuongDatHang,
          soLuongConLai:    o.soLuongConLai,
          tinhTrangSx:      o.tinhTrangSx,
          tinhTrangDatHang: o.tinhTrangDatHang,
          ngayDatHang:      o.ngayDatHang,
        })
      }
    })

    rows.sort((a, b) => {
      if (!a.ngayDatHang) return 1
      if (!b.ngayDatHang) return -1
      return new Date(a.ngayDatHang) - new Date(b.ngayDatHang)
    })

    return rows
  }, [orders, lenhs])

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

  // ── Columns ───────────────────────────────────────────────────────────────
  const cols = [
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
      width: 220,
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
      width: 100,
      render: (v) => v
        ? <span style={{ fontFamily: 'monospace', color: '#0f766e', fontWeight: 700 }}>{v}</span>
        : <span style={{ color: '#cbd5e1', fontSize: 11 }}>Chưa có</span>,
    },
    {
      title: 'SL LỆNH',
      dataIndex: 'soLuongLenh',
      width: 100,
      align: 'right',
      render: (v) => v != null
        ? <span style={{ fontWeight: 600, color: '#1e4570' }}>{fmtNum(v)}</span>
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
      title: 'TỔ THỰC HIỆN',
      dataIndex: 'toThucHien',
      width: 120,
      render: (v) => v
        ? <Tag color="cyan" style={{ fontSize: 11 }}>{v}</Tag>
        : '—',
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
      title: 'NGÀY THỰC HIỆN',
      dataIndex: 'ngayThucHien',
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

  const viewStyle = { background: 'transparent', border: 'none', padding: 0 }

  if (productLoad) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  const lenhCount  = lenhs.length
  const orderCount = orders.length

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
        .lenh-detail-table .ant-table-tbody > tr.row-no-lenh > td { background: #fafafa; color: #94a3b8; }
        .lenh-detail-table .ant-table-tbody > tr.row-no-lenh:hover > td { background: #f1f5f9 !important; }
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
        padding: '14px 18px', marginBottom: 20, maxWidth: '50%',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontWeight: 700, color: '#1e4570', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Thông Tin Chung
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

      {/* ── Tab switcher ── */}
      <div style={{
        display: 'flex', border: '1px solid #dde1e8', borderRadius: 8, overflow: 'hidden',
        marginBottom: 16, width: 'fit-content',
      }}>
        {[
          { key: 'lenh',    label: 'Danh mục lệnh',  icon: <UnorderedListOutlined />, color: '#1e4570' },
          { key: 'dinhmuc', label: 'Định mức vật tư', icon: <TableOutlined />,         color: '#0369a1' },
        ].map(({ key, label, icon, color }, idx) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: activeTab === key ? 700 : 500,
              background: activeTab === key ? color : '#fff',
              color: activeTab === key ? '#fff' : '#3a3f47',
              borderRight: idx === 0 ? '1px solid #dde1e8' : 'none',
              transition: '.12s background',
            }}
          >
            {icon} {label}
            {key === 'lenh' && (
              <span style={{
                fontSize: 11, fontWeight: 400, marginLeft: 4,
                color: activeTab === key ? 'rgba(255,255,255,0.75)' : '#94a3b8',
              }}>
                ({lenhCount} lệnh — {orderCount} ĐH)
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'lenh' && (
        <SkeletonTable
          className="lenh-detail-table"
          rowKey="_rowKey"
          dataSource={tableRows}
          columns={cols}
          loading={ordersLoad}
          size="small"
          scroll={{ x: 1700 }}
          rowClassName={(r) => r.soLo == null ? 'row-no-lenh' : ''}
          pagination={tableRows.length > 30
            ? { pageSize: 30, showSizeChanger: true, showTotal: (t) => `${t} dòng` }
            : false
          }
          onRow={(record) => ({
            onClick: () => {
              if (!record._donHangId) return
              navigate(
                `/lenh-san-xuat/${encodeURIComponent(maBravo)}/don-hang/${record._donHangId}`,
                { state: { order: record._orderRecord, product } }
              )
            },
            style: { cursor: record._donHangId ? 'pointer' : 'default' },
          })}
        />
      )}
      {activeTab === 'dinhmuc' && (
        bomLoad
          ? <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
          : <BomView bom={bom} onReload={fetchBom} />
      )}
    </div>
  )
}

const BOM_COLS = [
  { key: 'maVatTu', label: 'Mã vật tư',              w: 100 },
  { key: 'ten',     label: 'Nguyên liệu / Phụ liệu', w: undefined },
  { key: 'dvt',     label: 'ĐVT',                    w: 56  },
  { key: 'tyLe',    label: 'Tỷ lệ (%)',              w: 70  },
  { key: 'dm1',     label: 'ĐM 1 ĐVSP',              w: 120 },
  { key: 'dmLo',    label: 'ĐM theo lô',             w: 120 },
  { key: 'ghiChu',  label: 'Ghi chú',                w: 90  },
]

function BomSection({ rows, label }) {
  return (
    <>
      <tr style={{ background: '#f0f4ff' }}>
        <td colSpan={BOM_COLS.length + 1}
          style={{ padding: '5px 10px', fontWeight: 700, fontSize: 12.5, color: '#1e4570' }}>
          {label}
        </td>
      </tr>
      {rows.length === 0
        ? <tr><td colSpan={BOM_COLS.length + 1}
            style={{ padding: '8px 10px', color: '#9aa0a8', fontSize: 12, fontStyle: 'italic' }}>
            Chưa có dữ liệu
          </td></tr>
        : rows.map((row, i) => (
          <tr key={i} style={{ background: i % 2 === 1 ? '#fafbfc' : '#fff' }}>
            <td style={{ textAlign: 'center', color: '#6b7178', fontSize: 12, width: 34, padding: '5px 4px' }}>
              {i + 1}
            </td>
            {BOM_COLS.map(col => (
              <td key={col.key} style={{
                padding: '5px 8px', fontSize: 13, color: '#1b1d21',
                borderBottom: '1px solid #edf0f4',
                maxWidth: col.w, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {row[col.key] || ''}
              </td>
            ))}
          </tr>
        ))
      }
    </>
  )
}

function BomView({ bom, onReload }) {
  if (!bom) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8', fontSize: 14 }}>
        Chưa có định mức vật tư. Hãy nhập từ tờ lệnh sản xuất của một đơn hàng.
      </div>
    )
  }

  const { header, nvl, baoBi, updatedAt, updatedBy } = bom
  const totalRows = nvl.length + baoBi.length

  return (
    <div>
      {/* Info bar */}
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
        padding: '10px 14px', marginBottom: 14,
      }}>
        {header?.maDonHang && (
          <span style={{ fontSize: 12.5, color: '#6b7178' }}>
            Từ đơn hàng: <strong style={{ color: '#7c3aed' }}>{header.maDonHang}</strong>
          </span>
        )}
        {header?.soLoSanXuat && (
          <span style={{ fontSize: 12.5, color: '#6b7178' }}>
            Lô: <strong style={{ color: '#0f766e' }}>{header.soLoSanXuat}</strong>
          </span>
        )}
        <span style={{
          background: '#e0f2fe', color: '#0369a1',
          borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600,
        }}>
          {totalRows} vật tư
        </span>
        {updatedAt && (
          <span style={{ fontSize: 11.5, color: '#94a3b8', marginLeft: 'auto' }}>
            Cập nhật: {dayjs(updatedAt).format('DD/MM/YYYY HH:mm')}
            {updatedBy && <> bởi <strong>{updatedBy}</strong></>}
          </span>
        )}
        <Button size="small" onClick={onReload} style={{ marginLeft: updatedAt ? 0 : 'auto' }}>
          Tải lại
        </Button>
      </div>

      {/* Table */}
      {totalRows === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8', fontSize: 14 }}>
          Chưa có vật tư nào được nhập.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #dde1e8', borderRadius: 8, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7fa', borderBottom: '2px solid #dde1e8' }}>
                <th style={{ width: 34, padding: '8px 4px', textAlign: 'center', color: '#6b7178', fontSize: 12 }}>Stt</th>
                {BOM_COLS.map(col => (
                  <th key={col.key} style={{
                    padding: '8px 8px', textAlign: 'left',
                    color: '#3a3f47', fontSize: 12.5, fontWeight: 700,
                    width: col.w,
                  }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <BomSection rows={nvl}   label="Nguyên vật liệu" />
            <BomSection rows={baoBi} label="Bao bì" />
          </table>
        </div>
      )}
    </div>
  )
}
