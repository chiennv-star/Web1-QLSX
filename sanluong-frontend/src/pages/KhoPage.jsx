import { useState, useEffect, useCallback } from 'react'
import {
  Tabs, Card, Row, Col, Statistic, List, Tag, Input, Select, InputNumber,
  DatePicker, Button, Form, Table, Empty, Space, Typography, message, Popconfirm, Spin,
} from 'antd'
import {
  InboxOutlined, ExportOutlined, SwapOutlined, FileSearchOutlined,
  DashboardOutlined, SearchOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api/axios'

const { Text } = Typography

function daysLeft(dateStr) {
  if (!dateStr) return null
  return dayjs(dateStr).diff(dayjs().startOf('day'), 'day')
}

// ───────────────────────── Tổng quan ─────────────────────────
function TongQuanTab() {
  const [dash, setDash] = useState(null)
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [d, l] = await Promise.all([
        api.get('/kho/dashboard'),
        api.get('/kho/log', { params: { limit: 8 } }),
      ])
      setDash(d.data)
      setLog(l.data)
    } catch {
      message.error('Không tải được dữ liệu tổng quan')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <Spin spinning={loading}>
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Mã hàng" value={dash?.skuCount ?? 0} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Lấp đầy" value={dash?.fillPercent ?? 0} suffix="%" /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Ô còn trống" value={dash?.freeCount ?? 0} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Lô sắp hết hạn" value={dash?.expCount ?? 0} valueStyle={{ color: (dash?.expCount ?? 0) > 0 ? '#c8341f' : undefined }} /></Card></Col>
      </Row>
      <Card size="small" title="Nhật ký gần đây">
        <List
          size="small"
          dataSource={log}
          locale={{ emptyText: 'Chưa có hoạt động nào' }}
          renderItem={item => (
            <List.Item>
              <List.Item.Meta
                title={item.noiDung}
                description={`${dayjs(item.thoiGian).format('HH:mm DD/MM/YYYY')} · ${item.nguoiThucHien || ''}`}
              />
            </List.Item>
          )}
        />
      </Card>
    </Spin>
  )
}

// ───────────────────────── Nhập kho ─────────────────────────
function NhapKhoTab({ viTriList, onChanged }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [dangChua, setDangChua] = useState(null)

  const handleViTriChange = async (ma) => {
    if (!ma) { setDangChua(null); return }
    try {
      const { data } = await api.get(`/kho/vi-tri/${ma}/items`)
      const tong = data.reduce((a, b) => a + (b.soLuong || 0), 0)
      setDangChua(tong)
    } catch { setDangChua(null) }
  }

  const onFinish = async (values) => {
    setSaving(true)
    try {
      await api.post('/kho/nhap', {
        maHang: values.maHang,
        tenHang: values.tenHang,
        viTri: values.viTri,
        soLo: values.soLo,
        hanDung: values.hanDung ? values.hanDung.format('YYYY-MM-DD') : null,
        soLuong: values.soLuong,
        dvt: values.dvt || 'Thùng',
      })
      message.success(`Đã nhập ${values.soLuong} ${values.dvt || 'thùng'} vào ${values.viTri}`)
      form.resetFields()
      setDangChua(null)
      onChanged()
    } catch (err) {
      message.error(err?.response?.data?.message || 'Nhập kho thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card size="small" style={{ maxWidth: 480 }}>
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ dvt: 'Thùng', soLuong: 10 }}>
        <Form.Item label="Mã hàng" name="maHang" rules={[{ required: true, message: 'Nhập mã hàng' }]}>
          <Input placeholder="Vd: SP-1001" />
        </Form.Item>
        <Form.Item label="Tên hàng" name="tenHang">
          <Input placeholder="Tên sản phẩm" />
        </Form.Item>
        <Form.Item label="Vị trí cất" name="viTri" rules={[{ required: true, message: 'Chọn vị trí' }]}>
          <Select
            showSearch
            placeholder="Chọn ô vị trí"
            options={viTriList.map(v => ({ value: v.ma, label: v.ma }))}
            onChange={handleViTriChange}
          />
        </Form.Item>
        {dangChua !== null && (
          <Text type="secondary" style={{ display: 'block', marginTop: -12, marginBottom: 12 }}>
            Đang chứa: {dangChua > 0 ? `${dangChua} đơn vị` : 'trống'}
          </Text>
        )}
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="Số lượng" name="soLuong" rules={[{ required: true, message: 'Nhập số lượng' }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Đơn vị tính" name="dvt">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="Số lô" name="soLo">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Hạn dùng" name="hanDung">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
        </Row>
        <Button type="primary" htmlType="submit" loading={saving} block icon={<InboxOutlined />}>
          Lưu phiếu nhập
        </Button>
      </Form>
    </Card>
  )
}

// ───────────────────────── Tìm hàng + Xuất kho ─────────────────────────
function TimHangTab({ onChanged }) {
  const [q, setQ] = useState('')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [detailRows, setDetailRows] = useState([])
  const [xuatQty, setXuatQty] = useState(10)
  const [plan, setPlan] = useState(null)
  const [xuatLoading, setXuatLoading] = useState(false)

  const runSearch = useCallback(async (keyword) => {
    setLoading(true)
    try {
      const { data } = await api.get('/kho/search', { params: { q: keyword || undefined } })
      setList(data)
    } catch {
      message.error('Tìm kiếm thất bại')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { runSearch('') }, [runSearch])

  const openDetail = async (maHang) => {
    setSelected(maHang)
    setPlan(null)
    try {
      const { data } = await api.get('/kho/detail', { params: { maHang } })
      setDetailRows(data)
    } catch {
      message.error('Không tải được chi tiết')
    }
  }

  const drawPlan = async () => {
    if (!selected || !xuatQty) return
    try {
      const { data } = await api.get('/kho/xuat-plan', { params: { maHang: selected, soLuong: xuatQty } })
      setPlan(data)
    } catch {
      message.error('Không lập được lộ trình xuất')
    }
  }

  const confirmXuat = async () => {
    setXuatLoading(true)
    try {
      const { data } = await api.post('/kho/xuat-confirm', { maHang: selected, soLuong: xuatQty })
      message.success(`Đã xuất ${data.taken} đơn vị`)
      setPlan(null)
      await openDetail(selected)
      await runSearch(q)
      onChanged()
    } catch (err) {
      message.error(err?.response?.data?.message || 'Xuất kho thất bại')
    } finally {
      setXuatLoading(false)
    }
  }

  return (
    <Row gutter={16}>
      <Col xs={24} md={10}>
        <Input.Search
          placeholder="Gõ mã hoặc tên hàng…"
          value={q}
          onChange={e => setQ(e.target.value)}
          onSearch={runSearch}
          enterButton={<SearchOutlined />}
          style={{ marginBottom: 12 }}
        />
        <List
          loading={loading}
          bordered
          dataSource={list}
          locale={{ emptyText: 'Không có kết quả' }}
          renderItem={item => (
            <List.Item
              onClick={() => openDetail(item.maHang)}
              style={{ cursor: 'pointer', background: selected === item.maHang ? '#e6f4ff' : undefined, padding: '10px 12px' }}
            >
              <List.Item.Meta title={item.tenHang || item.maHang} description={`${item.maHang} · ${item.soViTri} vị trí`} />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700 }}>{item.tong}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{item.dvt}</div>
              </div>
            </List.Item>
          )}
        />
      </Col>
      <Col xs={24} md={14}>
        {!selected ? (
          <Empty description="Chọn một mã hàng để xem chi tiết" style={{ marginTop: 40 }} />
        ) : (
          <Card size="small" title={`Chi tiết ${selected}`}>
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={detailRows}
              columns={[
                { title: 'Vị trí', dataIndex: 'viTri' },
                { title: 'Lô', dataIndex: 'soLo' },
                {
                  title: 'Hạn dùng', dataIndex: 'hanDung',
                  render: (v, r, i) => {
                    const d = daysLeft(v)
                    return (
                      <Space size={4}>
                        {v ? dayjs(v).format('DD/MM/YYYY') : '—'}
                        {i === 0 && <Tag color="green">Lấy trước</Tag>}
                        {d !== null && d <= 45 && <Tag color="red">Còn {d} ngày</Tag>}
                      </Space>
                    )
                  },
                },
                { title: 'SL', dataIndex: 'soLuong', align: 'right' },
              ]}
              style={{ marginBottom: 16 }}
            />
            <Card size="small" type="inner" title="Xuất kho (FEFO)">
              <Space style={{ marginBottom: 12 }}>
                <Text>Số lượng cần xuất</Text>
                <InputNumber min={1} value={xuatQty} onChange={setXuatQty} />
                <Button onClick={drawPlan}>Lập lộ trình</Button>
              </Space>
              {plan && (
                <>
                  <Table
                    size="small"
                    rowKey="stockId"
                    pagination={false}
                    dataSource={plan.plan}
                    columns={[
                      { title: 'Vị trí', dataIndex: 'viTri' },
                      { title: 'Lô', dataIndex: 'soLo' },
                      { title: 'Hạn dùng', dataIndex: 'hanDung', render: v => v ? dayjs(v).format('DD/MM/YYYY') : '—' },
                      { title: 'Lấy', dataIndex: 'lay', align: 'right' },
                    ]}
                    style={{ marginBottom: 12 }}
                  />
                  {plan.thieu > 0 && <Text type="danger">Thiếu {plan.thieu} đơn vị so với tồn kho</Text>}
                  <Popconfirm title="Xác nhận đã lấy đủ hàng theo lộ trình?" onConfirm={confirmXuat}>
                    <Button type="primary" danger icon={<ExportOutlined />} loading={xuatLoading} block style={{ marginTop: 12 }}>
                      Xác nhận đã lấy đủ
                    </Button>
                  </Popconfirm>
                </>
              )}
            </Card>
          </Card>
        )}
      </Col>
    </Row>
  )
}

// ───────────────────────── Chuyển ô ─────────────────────────
function ChuyenOTab({ viTriList, onChanged }) {
  const [from, setFrom] = useState(null)
  const [items, setItems] = useState([])
  const [selItem, setSelItem] = useState(null)
  const [to, setTo] = useState(null)
  const [saving, setSaving] = useState(false)

  const loadFrom = async (ma) => {
    setFrom(ma)
    setSelItem(null)
    setTo(null)
    if (!ma) { setItems([]); return }
    try {
      const { data } = await api.get(`/kho/vi-tri/${ma}/items`)
      setItems(data)
    } catch { message.error('Không tải được danh sách hàng tại ô') }
  }

  const confirm = async () => {
    setSaving(true)
    try {
      await api.post('/kho/chuyen', { stockId: selItem.id, viTriDich: to })
      message.success(`Đã chuyển sang ${to}`)
      setSelItem(null); setTo(null)
      await loadFrom(from)
      onChanged()
    } catch (err) {
      message.error(err?.response?.data?.message || 'Chuyển ô thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Row gutter={16}>
      <Col xs={24} md={12}>
        <Form layout="vertical">
          <Form.Item label="Lấy hàng từ ô">
            <Select
              showSearch allowClear placeholder="Chọn ô nguồn"
              value={from}
              options={viTriList.map(v => ({ value: v.ma, label: v.ma }))}
              onChange={loadFrom}
            />
          </Form.Item>
        </Form>
        {from && (
          <List
            bordered
            dataSource={items}
            locale={{ emptyText: 'Ô đang trống' }}
            renderItem={it => (
              <List.Item
                onClick={() => setSelItem(it)}
                style={{ cursor: 'pointer', background: selItem?.id === it.id ? '#e6f4ff' : undefined }}
              >
                <List.Item.Meta title={it.tenHang || it.maHang} description={`${it.maHang} · Lô ${it.soLo || '—'}`} />
                <div style={{ fontWeight: 700 }}>{it.soLuong}</div>
              </List.Item>
            )}
          />
        )}
      </Col>
      <Col xs={24} md={12}>
        {selItem && (
          <Form layout="vertical">
            <Form.Item label="Chuyển tới ô">
              <Select
                showSearch placeholder="Chọn ô đích"
                value={to}
                options={viTriList.filter(v => v.ma !== from).map(v => ({ value: v.ma, label: v.ma }))}
                onChange={setTo}
              />
            </Form.Item>
            <Button type="primary" icon={<SwapOutlined />} disabled={!to} loading={saving} onClick={confirm} block>
              Xác nhận chuyển
            </Button>
          </Form>
        )}
      </Col>
    </Row>
  )
}

// ───────────────────────── Kiểm kê ─────────────────────────
function KiemKeTab({ viTriList, onChanged }) {
  const [ma, setMa] = useState(null)
  const [items, setItems] = useState([])
  const [actuals, setActuals] = useState({})
  const [saving, setSaving] = useState(false)

  const loadItems = async (v) => {
    setMa(v)
    if (!v) { setItems([]); setActuals({}); return }
    try {
      const { data } = await api.get(`/kho/vi-tri/${v}/items`)
      setItems(data)
      const init = {}
      data.forEach(it => { init[it.id] = it.soLuong })
      setActuals(init)
    } catch { message.error('Không tải được danh sách hàng tại ô') }
  }

  const chot = async () => {
    setSaving(true)
    try {
      const payload = {
        viTri: ma,
        items: items.map(it => ({ stockId: it.id, soLuongThucTe: actuals[it.id] ?? it.soLuong })),
      }
      const { data } = await api.post('/kho/kiem-ke', payload)
      message.success(data.lech > 0 ? `Đã ghi nhận lệch ${data.lech} đơn vị` : 'Kiểm kê khớp sổ sách')
      await loadItems(ma)
      onChanged()
    } catch (err) {
      message.error(err?.response?.data?.message || 'Kiểm kê thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <Form layout="vertical">
        <Form.Item label="Quét / chọn ô cần kiểm">
          <Select
            showSearch allowClear placeholder="Chọn ô vị trí"
            value={ma}
            options={viTriList.map(v => ({ value: v.ma, label: v.ma }))}
            onChange={loadItems}
          />
        </Form.Item>
      </Form>
      {ma && items.length === 0 && <Empty description="Ô trống" />}
      {items.map(it => {
        const actual = actuals[it.id] ?? it.soLuong
        const diff = actual - it.soLuong
        return (
          <Card key={it.id} size="small" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 600 }}>{it.tenHang || it.maHang}</div>
            <Text type="secondary">{it.maHang} · Lô {it.soLo || '—'} · Sổ sách: {it.soLuong}</Text>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <InputNumber
                value={actual}
                onChange={v => setActuals(prev => ({ ...prev, [it.id]: v }))}
                style={{ width: 120 }}
              />
              {diff === 0
                ? <Tag color="green">Khớp sổ sách</Tag>
                : <Tag color="red">Lệch {diff > 0 ? '+' : ''}{diff}</Tag>}
            </div>
          </Card>
        )
      })}
      {items.length > 0 && (
        <Button type="primary" block loading={saving} onClick={chot} icon={<FileSearchOutlined />}>
          Chốt kết quả kiểm kê
        </Button>
      )}
    </div>
  )
}

// ───────────────────────── Trang chính ─────────────────────────
export default function KhoPage() {
  const [viTriList, setViTriList] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    api.get('/kho/vi-tri').then(({ data }) => setViTriList(data)).catch(() => {})
  }, [])

  const bump = () => setRefreshKey(k => k + 1)

  return (
    <div>
      <Tabs
        defaultActiveKey="tong-quan"
        items={[
          { key: 'tong-quan', label: <span><DashboardOutlined /> Tổng quan</span>, children: <TongQuanTab key={refreshKey} /> },
          { key: 'nhap-kho', label: <span><InboxOutlined /> Nhập kho</span>, children: <NhapKhoTab viTriList={viTriList} onChanged={bump} /> },
          { key: 'tim-hang', label: <span><SearchOutlined /> Tìm hàng / Xuất kho</span>, children: <TimHangTab onChanged={bump} /> },
          { key: 'chuyen-o', label: <span><SwapOutlined /> Chuyển ô</span>, children: <ChuyenOTab viTriList={viTriList} onChanged={bump} /> },
          { key: 'kiem-ke', label: <span><FileSearchOutlined /> Kiểm kê</span>, children: <KiemKeTab viTriList={viTriList} onChanged={bump} /> },
        ]}
      />
    </div>
  )
}
