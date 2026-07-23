import { useState, useEffect, useCallback } from 'react'
import {
  Tabs, Card, Row, Col, List, Tag, Input, Select, InputNumber,
  DatePicker, Button, Form, Table, Empty, Space, Typography, message, Popconfirm, Spin,
} from 'antd'
import {
  InboxOutlined, ExportOutlined, SwapOutlined, FileSearchOutlined,
  DashboardOutlined, SearchOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api/axios'

const { Text } = Typography

const FONT_LINK_ID = 'kho-industrial-fonts'
function useIndustrialFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return
    const link = document.createElement('link')
    link.id = FONT_LINK_ID
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap'
    document.head.appendChild(link)
  }, [])
}

// ── Design tokens dùng chung cho toàn trang, đồng bộ với bản thiết kế "Định vị kho" ──
const KHO_STYLE = `
.kho-root{
  --concrete:#E3E4DF; --concrete-2:#D3D5CE; --steel:#171C1F; --steel-2:#2A3237; --steel-3:#3D474D;
  --paper:#FFFFFF; --hazard:#F5C21B; --deep:#0E4C5C; --alert:#C8341F; --ok:#2F7D53; --muted:#6B7378; --line:#C3C6BE;
  --sans:'Barlow',system-ui,-apple-system,sans-serif;
  --cond:'Barlow Condensed','Barlow',system-ui,sans-serif;
  --mono:'JetBrains Mono',ui-monospace,'Roboto Mono',monospace;
  font-family:var(--sans); color:var(--steel);
}
.kho-eyebrow{font-family:var(--cond);font-size:12px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);display:flex;align-items:center;gap:8px;margin:0 0 10px}
.kho-eyebrow::after{content:"";flex:1;height:1px;background:var(--line)}
.kho-h{font-family:var(--cond);font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin:0}
.kho-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:18px}
.kho-kpi{background:var(--paper);border:1px solid var(--line);border-left:4px solid var(--deep);border-radius:4px;padding:12px 14px}
.kho-kpi--warn{border-left-color:var(--hazard)}
.kho-kpi--bad{border-left-color:var(--alert)}
.kho-kpi__n{font-family:var(--mono);font-weight:700;font-size:26px;line-height:1.05}
.kho-kpi__l{font-family:var(--cond);font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-top:3px}
.kho-card{background:var(--paper);border:1px solid var(--line);border-radius:4px;padding:14px;margin-bottom:12px}
.kho-plate{background:var(--steel);color:#fff;overflow:hidden;border-radius:4px}
.kho-plate__hz{height:7px;background:repeating-linear-gradient(-45deg,var(--hazard) 0 7px,var(--steel-2) 7px 14px)}
.kho-plate__body{padding:10px 12px}
.kho-plate__code{font-family:var(--mono);font-weight:700;font-size:22px;letter-spacing:.02em;color:var(--hazard);line-height:1}
.kho-plate__meta{margin-top:5px;font-family:var(--cond);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#98A2A8}
.kho-plate--sm .kho-plate__code{font-size:16px}
.kho-plate--sm .kho-plate__body{padding:7px 10px}
.kho-plate--sm .kho-plate__hz{height:5px;background:repeating-linear-gradient(-45deg,var(--hazard) 0 5px,var(--steel-2) 5px 10px)}
.kho-steps{display:flex;gap:6px;margin-bottom:16px}
.kho-step{flex:1;padding:7px 4px 6px;background:var(--concrete-2);border-radius:4px;text-align:center;
  font-family:var(--cond);font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);border-top:3px solid var(--line)}
.kho-step.is-done{color:var(--steel);border-top-color:var(--ok)}
.kho-step.is-now{background:var(--deep);color:#fff;border-top-color:var(--deep)}
.kho-row{background:var(--paper);border:1px solid var(--line);border-radius:4px;padding:11px 12px;margin-bottom:8px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:border-color .12s ease}
.kho-row:hover{border-color:var(--deep)}
.kho-row.is-sel{border-color:var(--deep);background:#EAF3F5}
.kho-row__t{font-weight:600;font-size:14px;line-height:1.25}
.kho-row__s{font-family:var(--mono);font-size:11px;color:var(--muted);margin-top:2px}
.kho-row__n{font-family:var(--mono);font-weight:700;font-size:17px;text-align:right}
.kho-row__u{font-family:var(--cond);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);text-align:right}
.kho-tag{display:inline-block;font-family:var(--cond);font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:2px 7px;border-radius:2px;background:var(--concrete-2);color:var(--steel-3)}
.kho-tag--fifo{background:var(--ok);color:#fff}
.kho-tag--exp{background:var(--alert);color:#fff}
.kho-btn{font-family:var(--cond) !important;font-weight:600 !important;letter-spacing:.08em;text-transform:uppercase;border-radius:4px !important;border:none !important;height:42px !important}
.kho-btn--hazard{background:var(--hazard) !important;color:var(--steel) !important;box-shadow:0 3px 0 #C79C0D}
.kho-btn--hazard:hover,.kho-btn--hazard:focus{background:#f0b90a !important;color:var(--steel) !important}
.kho-btn--dark{background:var(--steel) !important;color:#fff !important}
.kho-btn--dark:hover,.kho-btn--dark:focus{background:var(--steel-2) !important;color:#fff !important}
`

function locMeta(ma) {
  if (!ma) return ''
  const parts = ma.split('-')
  if (parts.length < 4) return ma
  const [k, d, t, o] = parts
  return `Khu ${k} · Dãy ${d} · Tầng ${t} · Ô ${o}`
}

function Plate({ code, small }) {
  if (!code) return null
  return (
    <div className={`kho-plate ${small ? 'kho-plate--sm' : ''}`}>
      <div className="kho-plate__hz" />
      <div className="kho-plate__body">
        <div className="kho-plate__code">{code}</div>
        <div className="kho-plate__meta">{locMeta(code)}</div>
      </div>
      <div className="kho-plate__hz" />
    </div>
  )
}

function Eyebrow({ children }) {
  return <p className="kho-eyebrow">{children}</p>
}

function StepBar({ labels, current }) {
  return (
    <div className="kho-steps">
      {labels.map((l, i) => {
        const n = i + 1
        const cls = n < current ? 'is-done' : n === current ? 'is-now' : ''
        return <div key={l} className={`kho-step ${cls}`}>{n} · {l}</div>
      })}
    </div>
  )
}

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
      <div className="kho-kpi-grid">
        <div className="kho-kpi"><div className="kho-kpi__n">{dash?.skuCount ?? 0}</div><div className="kho-kpi__l">Mã hàng</div></div>
        <div className="kho-kpi kho-kpi--warn"><div className="kho-kpi__n">{dash?.fillPercent ?? 0}%</div><div className="kho-kpi__l">Lấp đầy</div></div>
        <div className="kho-kpi"><div className="kho-kpi__n">{dash?.freeCount ?? 0}</div><div className="kho-kpi__l">Ô còn trống</div></div>
        <div className="kho-kpi kho-kpi--bad"><div className="kho-kpi__n">{dash?.expCount ?? 0}</div><div className="kho-kpi__l">Lô sắp hết hạn</div></div>
      </div>
      <Eyebrow>Nhật ký gần đây</Eyebrow>
      <List
        size="small"
        dataSource={log}
        locale={{ emptyText: 'Chưa có hoạt động nào' }}
        renderItem={item => (
          <List.Item style={{ borderBottom: '1px solid var(--line)' }}>
            <List.Item.Meta
              title={<span style={{ fontSize: 14 }}>{item.noiDung}</span>}
              description={<span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{dayjs(item.thoiGian).format('HH:mm DD/MM/YYYY')} · {item.nguoiThucHien || ''}</span>}
            />
          </List.Item>
        )}
      />
    </Spin>
  )
}

// ───────────────────────── Nhập kho ─────────────────────────
function NhapKhoTab({ viTriList, onChanged }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [viTriChon, setViTriChon] = useState(null)
  const [dangChua, setDangChua] = useState(null)
  const [maHang, setMaHang] = useState('')

  const step = viTriChon ? 3 : maHang ? 2 : 1

  const handleViTriChange = async (ma) => {
    setViTriChon(ma)
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
      setViTriChon(null)
      setDangChua(null)
      setMaHang('')
      onChanged()
    } catch (err) {
      message.error(err?.response?.data?.message || 'Nhập kho thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <StepBar labels={['Mã hàng', 'Vị trí', 'Số lượng']} current={step} />
      <div className="kho-card">
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ dvt: 'Thùng', soLuong: 10 }}>
          <Eyebrow>Mã hàng</Eyebrow>
          <Form.Item label="Mã hàng" name="maHang" rules={[{ required: true, message: 'Nhập mã hàng' }]}>
            <Input placeholder="Vd: SP-1001" onChange={e => setMaHang(e.target.value)} />
          </Form.Item>
          <Form.Item label="Tên hàng" name="tenHang">
            <Input placeholder="Tên sản phẩm" />
          </Form.Item>

          <Eyebrow>Vị trí cất</Eyebrow>
          <Form.Item label="Vị trí" name="viTri" rules={[{ required: true, message: 'Chọn vị trí' }]}>
            <Select
              showSearch
              placeholder="Chọn ô vị trí"
              options={viTriList.map(v => ({ value: v.ma, label: v.ma }))}
              onChange={handleViTriChange}
            />
          </Form.Item>
          {viTriChon && (
            <div style={{ marginBottom: 14 }}>
              <Plate code={viTriChon} small />
              <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                Đang chứa: {dangChua > 0 ? `${dangChua} đơn vị` : 'trống'}
              </Text>
            </div>
          )}

          <Eyebrow>Số lượng</Eyebrow>
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
          <Button className="kho-btn kho-btn--hazard" htmlType="submit" loading={saving} block icon={<InboxOutlined />}>
            Lưu phiếu nhập
          </Button>
        </Form>
      </div>
    </div>
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
        {loading ? <Spin /> : list.length === 0 ? <Empty description="Không có kết quả" /> : (
          <div>
            {list.map(item => (
              <div
                key={item.maHang}
                className={`kho-row ${selected === item.maHang ? 'is-sel' : ''}`}
                onClick={() => openDetail(item.maHang)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="kho-row__t">{item.tenHang || item.maHang}</div>
                  <div className="kho-row__s">{item.maHang} · {item.soViTri} vị trí</div>
                </div>
                <div>
                  <div className="kho-row__n">{item.tong}</div>
                  <div className="kho-row__u">{item.dvt}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Col>
      <Col xs={24} md={14}>
        {!selected ? (
          <Empty description="Chọn một mã hàng để xem chi tiết" style={{ marginTop: 40 }} />
        ) : (
          <div className="kho-card">
            <Eyebrow>Chi tiết {selected}</Eyebrow>
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={detailRows}
              columns={[
                { title: 'Vị trí', dataIndex: 'viTri', render: v => <span style={{ fontFamily: 'var(--mono)' }}>{v}</span> },
                { title: 'Lô', dataIndex: 'soLo' },
                {
                  title: 'Hạn dùng', dataIndex: 'hanDung',
                  render: (v, r, i) => {
                    const d = daysLeft(v)
                    return (
                      <Space size={4}>
                        {v ? dayjs(v).format('DD/MM/YYYY') : '—'}
                        {i === 0 && <span className="kho-tag kho-tag--fifo">Lấy trước</span>}
                        {d !== null && d <= 45 && <span className="kho-tag kho-tag--exp">Còn {d} ngày</span>}
                      </Space>
                    )
                  },
                },
                { title: 'SL', dataIndex: 'soLuong', align: 'right' },
              ]}
              style={{ marginBottom: 16 }}
            />
            <Eyebrow>Xuất kho (FEFO)</Eyebrow>
            <Space style={{ marginBottom: 12 }}>
              <Text>Số lượng cần xuất</Text>
              <InputNumber min={1} value={xuatQty} onChange={setXuatQty} />
              <Button onClick={drawPlan}>Lập lộ trình</Button>
            </Space>
            {plan && (
              <>
                {plan.plan.map((p, i) => (
                  <div key={p.stockId} className="kho-row" style={{ cursor: 'default', alignItems: 'stretch', gap: 12 }}>
                    <Plate code={p.viTri} small />
                    <div style={{ flex: 1 }}>
                      <div className="kho-row__t">Điểm dừng {i + 1}</div>
                      <div className="kho-row__s">Lô {p.soLo || '—'} · HD {p.hanDung ? dayjs(p.hanDung).format('DD/MM/YYYY') : '—'} · còn {p.conLai}</div>
                    </div>
                    <div>
                      <div className="kho-row__n">{p.lay}</div>
                      <div className="kho-row__u">Lấy</div>
                    </div>
                  </div>
                ))}
                {plan.thieu > 0 && <Text type="danger">Thiếu {plan.thieu} đơn vị so với tồn kho</Text>}
                <Popconfirm title="Xác nhận đã lấy đủ hàng theo lộ trình?" onConfirm={confirmXuat}>
                  <Button className="kho-btn kho-btn--dark" icon={<ExportOutlined />} loading={xuatLoading} block style={{ marginTop: 12 }}>
                    Xác nhận đã lấy đủ
                  </Button>
                </Popconfirm>
              </>
            )}
          </div>
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

  const step = to ? 3 : selItem ? 2 : 1

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
    <div style={{ maxWidth: 640 }}>
      <StepBar labels={['Ô nguồn', 'Ô đích', 'Xác nhận']} current={step} />
      <Eyebrow>Lấy hàng từ ô</Eyebrow>
      <Select
        showSearch allowClear placeholder="Chọn ô nguồn"
        style={{ width: '100%', marginBottom: 14 }}
        value={from}
        options={viTriList.map(v => ({ value: v.ma, label: v.ma }))}
        onChange={loadFrom}
      />
      {from && (
        items.length === 0 ? <Empty description="Ô đang trống" /> : (
          <div style={{ marginBottom: 16 }}>
            {items.map(it => (
              <div
                key={it.id}
                className={`kho-row ${selItem?.id === it.id ? 'is-sel' : ''}`}
                onClick={() => setSelItem(it)}
              >
                <div style={{ flex: 1 }}>
                  <div className="kho-row__t">{it.tenHang || it.maHang}</div>
                  <div className="kho-row__s">{it.maHang} · Lô {it.soLo || '—'}</div>
                </div>
                <div className="kho-row__n">{it.soLuong}</div>
              </div>
            ))}
          </div>
        )
      )}
      {selItem && (
        <>
          <Eyebrow>Chuyển tới ô</Eyebrow>
          <Select
            showSearch placeholder="Chọn ô đích"
            style={{ width: '100%', marginBottom: 14 }}
            value={to}
            options={viTriList.filter(v => v.ma !== from).map(v => ({ value: v.ma, label: v.ma }))}
            onChange={setTo}
          />
          {to && <div style={{ marginBottom: 14 }}><Plate code={to} small /></div>}
          <Button className="kho-btn kho-btn--hazard" icon={<SwapOutlined />} disabled={!to} loading={saving} onClick={confirm} block>
            Xác nhận chuyển
          </Button>
        </>
      )}
    </div>
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
      <Eyebrow>Quét / chọn ô cần kiểm</Eyebrow>
      <Select
        showSearch allowClear placeholder="Chọn ô vị trí"
        style={{ width: '100%', marginBottom: 14 }}
        value={ma}
        options={viTriList.map(v => ({ value: v.ma, label: v.ma }))}
        onChange={loadItems}
      />
      {ma && <div style={{ marginBottom: 14 }}><Plate code={ma} small /></div>}
      {ma && items.length === 0 && <Empty description="Ô trống" />}
      {items.map(it => {
        const actual = actuals[it.id] ?? it.soLuong
        const diff = actual - it.soLuong
        return (
          <div key={it.id} className="kho-card">
            <div style={{ fontWeight: 600, fontSize: 15 }}>{it.tenHang || it.maHang}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{it.maHang} · Lô {it.soLo || '—'} · Sổ sách: <strong>{it.soLuong}</strong></Text>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <InputNumber
                value={actual}
                onChange={v => setActuals(prev => ({ ...prev, [it.id]: v }))}
                style={{ width: 120 }}
              />
              {diff === 0
                ? <span className="kho-tag kho-tag--fifo">Khớp sổ sách</span>
                : <span className="kho-tag kho-tag--exp">Lệch {diff > 0 ? '+' : ''}{diff}</span>}
            </div>
          </div>
        )
      })}
      {items.length > 0 && (
        <Button className="kho-btn kho-btn--hazard" block loading={saving} onClick={chot} icon={<FileSearchOutlined />}>
          Chốt kết quả kiểm kê
        </Button>
      )}
    </div>
  )
}

// ───────────────────────── Trang chính ─────────────────────────
export default function KhoPage() {
  useIndustrialFonts()
  const [viTriList, setViTriList] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    api.get('/kho/vi-tri').then(({ data }) => setViTriList(data)).catch(() => {})
  }, [])

  const bump = () => setRefreshKey(k => k + 1)

  return (
    <div className="kho-root">
      <style>{KHO_STYLE}</style>
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
