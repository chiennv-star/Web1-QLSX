import React, { useState, useCallback, useEffect } from 'react'
import { Card, Row, Col, Progress, Table, Tag, Spin, Typography, Space, Button, Statistic } from 'antd'
import { ReloadOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons'
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, Tooltip as RechartTooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import api from '../api/axios'

dayjs.locale('vi')

const { Title, Text } = Typography

const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']

const CD_ORDER = ['PCPL1', 'PCPL2', 'PL', 'BBC1', 'DG']
const CD_COLORS = {
  PCPL1: '#3b82f6',
  PCPL2: '#8b5cf6',
  PL:    '#10b981',
  BBC1:  '#f59e0b',
  DG:    '#ef4444',
}
const CD_LABELS = {
  PCPL1: 'PCPL1', PCPL2: 'PCPL2', PL: 'PL', BBC1: 'BBC1', DG: 'ĐG',
}

function resolveCd(r) {
  let cd = (r.congDoan || '').toUpperCase()
  if (cd === 'PC') {
    const nhom = (r.nhomThucHien || r.toNhom || '').toUpperCase()
    if (nhom === 'PCPL1') cd = 'PCPL1'
    else if (nhom === 'PCPL2') cd = 'PCPL2'
    else if (nhom === 'PCPL3' || nhom === 'PL') cd = 'PL'
    else cd = 'PCPL1'
  }
  if (cd === 'PCPL3') cd = 'PL'
  return cd
}

function fmt(n) {
  if (n == null || isNaN(n)) return '0'
  return Number(n).toLocaleString('vi-VN')
}

function KpiCard({ title, value, unit, sub, color, gradient, icon, extra }) {
  return (
    <Card
      style={{
        borderRadius: 14,
        border: `1px solid ${color}33`,
        background: gradient,
        height: '100%',
      }}
      styles={{ body: { padding: '18px 20px' } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
            {title}
          </Text>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1 }}>{value}</span>
            {unit && <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{unit}</span>}
          </div>
          {sub && <Text style={{ fontSize: 12, color: '#94a3b8' }}>{sub}</Text>}
          {extra}
        </div>
        <div style={{ fontSize: 36, opacity: 0.18, userSelect: 'none' }}>{icon}</div>
      </div>
    </Card>
  )
}

const TRANG_THAI_CONFIG = {
  done:  { label: 'Hoàn thành', color: 'green' },
  doing: { label: 'Đang SX',    color: 'blue'  },
  null:  { label: 'Chưa bắt đầu', color: 'default' },
}

export default function DirectorDashboardPage() {
  const today = dayjs()
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  const [todaySessions, setTodaySessions]   = useState([])
  const [monthSessions, setMonthSessions]   = useState([])
  const [trendSessions, setTrendSessions]   = useState([])
  const [nhapKhoMonth, setNhapKhoMonth]     = useState([])
  const [mucTieuThang, setMucTieuThang]     = useState({})
  const [donHang, setDonHang]               = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const todayStr   = today.format('YYYY-MM-DD')
      const monthStart = today.startOf('month').format('YYYY-MM-DD')
      const trendStart = today.subtract(13, 'day').format('YYYY-MM-DD')
      const year       = today.year()

      const [todayRes, monthRes, trendRes, nhapKhoRes, settingsRes, donHangRes] = await Promise.allSettled([
        api.get('/work-schedule-session/daily-report', { params: { fromDate: todayStr,   toDate: todayStr   } }),
        api.get('/work-schedule-session/daily-report', { params: { fromDate: monthStart, toDate: todayStr   } }),
        api.get('/work-schedule-session/daily-report', { params: { fromDate: trendStart, toDate: todayStr   } }),
        api.get('/production/nhap-kho',                { params: { fromDate: monthStart, toDate: todayStr   } }),
        api.get('/app-settings/nhapkho-muctieu',       { params: { year } }),
        api.get('/don-hang'),
      ])

      if (todayRes.status   === 'fulfilled') setTodaySessions(todayRes.value.data   || [])
      if (monthRes.status   === 'fulfilled') setMonthSessions(monthRes.value.data   || [])
      if (trendRes.status   === 'fulfilled') setTrendSessions(trendRes.value.data   || [])
      if (nhapKhoRes.status === 'fulfilled') setNhapKhoMonth(nhapKhoRes.value.data  || [])
      if (settingsRes.status === 'fulfilled') {
        setMucTieuThang(settingsRes.value.data?.mucTieuThang || {})
      }
      if (donHangRes.status === 'fulfilled') {
        const raw = donHangRes.value.data
        setDonHang(Array.isArray(raw) ? raw : (raw?.content || []))
      }

      setLastUpdate(dayjs())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Computed ────────────────────────────────────────────────────────────────

  // Today by congDoan
  const todayByCd = {}
  todaySessions.forEach(r => {
    const cd = resolveCd(r)
    if (!CD_ORDER.includes(cd)) return
    todayByCd[cd] = (todayByCd[cd] || 0) + (r.sanLuong || 0)
  })
  const todayTotal = Object.values(todayByCd).reduce((s, v) => s + v, 0)

  // This month by congDoan
  const monthByCd = {}
  monthSessions.forEach(r => {
    const cd = resolveCd(r)
    if (!CD_ORDER.includes(cd)) return
    monthByCd[cd] = (monthByCd[cd] || 0) + (r.sanLuong || 0)
  })
  const monthTotal = Object.values(monthByCd).reduce((s, v) => s + v, 0)

  // Trend: tổng SP mỗi ngày 14 ngày qua
  const trendByDate = {}
  trendSessions.forEach(r => {
    if (!r.date) return
    trendByDate[r.date] = (trendByDate[r.date] || 0) + (r.sanLuong || 0)
  })
  const trendData = Array.from({ length: 14 }, (_, i) => {
    const d   = today.subtract(13 - i, 'day')
    const key = d.format('YYYY-MM-DD')
    return { date: d.format('DD/MM'), sanLuong: trendByDate[key] || 0 }
  })

  // Bar chart: sản lượng theo công đoạn (today vs month avg)
  const cdCompareData = CD_ORDER.map(cd => ({
    name:     CD_LABELS[cd],
    'Hôm nay': todayByCd[cd] || 0,
    'TB ngày': today.date() > 0 ? Math.round((monthByCd[cd] || 0) / today.date()) : 0,
  }))

  // Nhap kho
  const nhapKhoTotal = nhapKhoMonth.reduce((s, r) => s + (r.tpNhapKho || 0), 0)
  const currentMonth = today.month() + 1
  const mucTieuM     = Number(mucTieuThang[currentMonth] || mucTieuThang[String(currentMonth)] || 0)
  const nhapKhoPercent = mucTieuM > 0 ? Math.min(Math.round((nhapKhoTotal / mucTieuM) * 100), 100) : 0
  const nhapKhoColor = nhapKhoPercent >= 90 ? '#10b981' : nhapKhoPercent >= 60 ? '#f59e0b' : '#ef4444'

  // Don hang
  const activeDonHang    = donHang.filter(r => r.tinhTrangSx !== 'done')
  const completedDonHang = donHang.filter(r => r.tinhTrangSx === 'done')
  const recentDonHang    = [...donHang]
    .sort((a, b) => (b.ngayDatHang || '').localeCompare(a.ngayDatHang || ''))
    .slice(0, 12)

  // Max for bar scale
  const todayMax = Math.max(...CD_ORDER.map(cd => todayByCd[cd] || 0), 1)

  return (
    <div style={{ minHeight: '100%', background: '#f8fafc' }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20, padding: '4px 0',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 6, height: 32, borderRadius: 3,
              background: 'linear-gradient(180deg, #3b82f6, #8b5cf6)',
            }} />
            <div>
              <Title level={4} style={{ margin: 0, color: '#1e293b', lineHeight: 1.2 }}>
                Dashboard Giám Đốc
              </Title>
              <Text style={{ color: '#64748b', fontSize: 12 }}>
                {WEEKDAYS[today.day()]}, {today.format('DD/MM/YYYY')}
              </Text>
            </div>
          </div>
        </div>
        <Space>
          {lastUpdate && (
            <Text style={{ color: '#94a3b8', fontSize: 12 }}>
              Cập nhật lúc {lastUpdate.format('HH:mm')}
            </Text>
          )}
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={load}
            disabled={loading}
            size="small"
            style={{ borderRadius: 8 }}
          >
            Làm mới
          </Button>
        </Space>
      </div>

      <Spin spinning={loading} tip="Đang tải dữ liệu...">
        {/* ── KPI Row ── */}
        <Row gutter={[14, 14]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} xl={6}>
            <KpiCard
              title="Sản lượng hôm nay"
              value={fmt(todayTotal)}
              unit="SP"
              sub={`${CD_ORDER.filter(cd => (todayByCd[cd] || 0) > 0).length} / ${CD_ORDER.length} công đoạn có dữ liệu`}
              color="#1d4ed8"
              gradient="linear-gradient(135deg, #eff6ff 0%, #fff 100%)"
              icon="📦"
            />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <KpiCard
              title={`Sản lượng tháng ${currentMonth}`}
              value={fmt(monthTotal)}
              unit="SP"
              sub={`TB ${today.date() > 0 ? fmt(Math.round(monthTotal / today.date())) : 0} SP/ngày (${today.date()} ngày)`}
              color="#059669"
              gradient="linear-gradient(135deg, #f0fdf4 0%, #fff 100%)"
              icon="📊"
            />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <KpiCard
              title={`Nhập kho tháng ${currentMonth}`}
              value={fmt(nhapKhoTotal)}
              unit="SP"
              sub={`Mục tiêu: ${fmt(mucTieuM)} SP`}
              color="#d97706"
              gradient="linear-gradient(135deg, #fffbeb 0%, #fff 100%)"
              icon="🎯"
              extra={
                <div style={{ marginTop: 6 }}>
                  <Progress
                    percent={nhapKhoPercent}
                    strokeColor={nhapKhoColor}
                    trailColor="#fde68a"
                    size="small"
                    format={p => <span style={{ fontSize: 11, fontWeight: 700, color: nhapKhoColor }}>{p}%</span>}
                  />
                </div>
              }
            />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <KpiCard
              title="Đơn hàng"
              value={activeDonHang.length}
              unit="đang SX"
              sub={`${completedDonHang.length} hoàn thành / ${donHang.length} tổng`}
              color="#db2777"
              gradient="linear-gradient(135deg, #fdf2f8 0%, #fff 100%)"
              icon="📋"
            />
          </Col>
        </Row>

        {/* ── Middle Row ── */}
        <Row gutter={[14, 14]} style={{ marginBottom: 16 }}>

          {/* Left: Today breakdown + bar chart so sánh */}
          <Col xs={24} lg={15}>
            <Card
              title={
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                  ⚙️ Sản lượng hôm nay — so sánh TB tháng
                </span>
              }
              style={{ borderRadius: 14, height: '100%' }}
              styles={{ body: { padding: '14px 18px' } }}
            >
              {/* Horizontal progress bars */}
              <div style={{ marginBottom: 14 }}>
                {CD_ORDER.map(cd => {
                  const val = todayByCd[cd] || 0
                  const pct = Math.round((val / todayMax) * 100)
                  const tbNgay = today.date() > 0 ? Math.round((monthByCd[cd] || 0) / today.date()) : 0
                  const diff   = val - tbNgay
                  return (
                    <div key={cd} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{
                            width: 10, height: 10, borderRadius: 2,
                            background: CD_COLORS[cd], display: 'inline-block', flexShrink: 0,
                          }} />
                          <Text style={{ fontSize: 13, fontWeight: 700, color: CD_COLORS[cd] }}>{CD_LABELS[cd]}</Text>
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          {tbNgay > 0 && (
                            <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                              TB: {fmt(tbNgay)}
                            </Text>
                          )}
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{fmt(val)}</Text>
                            {diff !== 0 && tbNgay > 0 && (
                              <Text style={{ fontSize: 10, fontWeight: 600, color: diff > 0 ? '#10b981' : '#ef4444' }}>
                                {diff > 0 ? <RiseOutlined /> : <FallOutlined />}
                                {' '}{fmt(Math.abs(diff))}
                              </Text>
                            )}
                          </div>
                        </div>
                      </div>
                      <Progress
                        percent={pct}
                        showInfo={false}
                        strokeColor={CD_COLORS[cd]}
                        trailColor={`${CD_COLORS[cd]}18`}
                        size={[undefined, 8]}
                        style={{ marginBottom: 0 }}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Bar chart: hôm nay vs TB ngày */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                <Text style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                  So sánh từng công đoạn: Hôm nay vs Trung bình ngày tháng {currentMonth}
                </Text>
                <div style={{ height: 140, marginTop: 8 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cdCompareData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <RechartTooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                        formatter={(v, name) => [fmt(v) + ' SP', name]}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                      <Bar dataKey="Hôm nay" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="TB ngày" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>
          </Col>

          {/* Right: Trend 14 ngày + NK */}
          <Col xs={24} lg={9}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>

              {/* Trend chart */}
              <Card
                title={<span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>📈 Xu hướng sản lượng 14 ngày</span>}
                style={{ borderRadius: 14, flex: 1 }}
                styles={{ body: { padding: '12px 16px' } }}
              >
                <div style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="slGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={3} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <RechartTooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                        formatter={v => [fmt(v) + ' SP', 'Sản lượng']}
                      />
                      <Area
                        type="monotone"
                        dataKey="sanLuong"
                        stroke="#3b82f6"
                        fill="url(#slGrad)"
                        strokeWidth={2}
                        dot={{ r: 2.5, fill: '#3b82f6', strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* NK progress */}
              <Card
                style={{ borderRadius: 14 }}
                styles={{ body: { padding: '14px 18px' } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <Text style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Nhập kho tháng {currentMonth}
                    </Text>
                    <div style={{ fontSize: 22, fontWeight: 900, color: nhapKhoColor, lineHeight: 1.2, marginTop: 2 }}>
                      {nhapKhoPercent}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Text style={{ fontSize: 12, color: '#94a3b8', display: 'block' }}>Đã nhập</Text>
                    <Text style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{fmt(nhapKhoTotal)}</Text>
                  </div>
                </div>
                <Progress
                  percent={nhapKhoPercent}
                  strokeColor={{
                    '0%': nhapKhoColor,
                    '100%': nhapKhoColor === '#10b981' ? '#34d399' : nhapKhoColor === '#f59e0b' ? '#fcd34d' : '#f87171',
                  }}
                  trailColor="#f1f5f9"
                  size={[undefined, 14]}
                  format={() => null}
                  style={{ marginBottom: 6 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: '#94a3b8' }}>0</Text>
                  <Text style={{ fontSize: 11, color: '#94a3b8' }}>MĐ: {fmt(mucTieuM)} SP</Text>
                </div>
              </Card>

            </div>
          </Col>
        </Row>

        {/* ── Bottom: Orders table ── */}
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>📋 Đơn hàng gần đây</span>
              <Space size={8}>
                <Tag color="blue" style={{ fontSize: 11 }}>{activeDonHang.length} đang SX</Tag>
                <Tag color="green" style={{ fontSize: 11 }}>{completedDonHang.length} hoàn thành</Tag>
                <Tag color="default" style={{ fontSize: 11 }}>{donHang.length} tổng</Tag>
              </Space>
            </div>
          }
          style={{ borderRadius: 14 }}
          styles={{ body: { padding: 0 } }}
        >
          <Table
            dataSource={recentDonHang}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 8, size: 'small', showTotal: total => `${total} đơn hàng` }}
            scroll={{ x: 720 }}
            rowClassName={r => r.tinhTrangSx === 'done' ? '' : 'ant-table-row-active'}
            columns={[
              {
                title: 'Mã ĐH',
                dataIndex: 'maDonHang',
                width: 120,
                render: v => <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#1d4ed8' }}>{v || '—'}</span>,
              },
              {
                title: 'Sản phẩm',
                key: 'tenSanPham',
                ellipsis: true,
                render: (_, r) => (
                  <div>
                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>{r.tenSanPham || '—'}</div>
                    {r.maBravo && <div style={{ fontSize: 11, color: '#8b5cf6', fontFamily: 'monospace' }}>{r.maBravo}</div>}
                  </div>
                ),
              },
              {
                title: 'SL đặt',
                dataIndex: 'soLuongDatHang',
                width: 90,
                align: 'right',
                render: v => <span style={{ fontWeight: 700, color: '#1e293b' }}>{fmt(v)}</span>,
              },
              {
                title: 'Đã xếp KH',
                dataIndex: 'soLuongDaXepKh',
                width: 90,
                align: 'right',
                render: (v, r) => {
                  const pct = r.soLuongDatHang > 0 ? Math.round(((v || 0) / r.soLuongDatHang) * 100) : 0
                  return (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: pct >= 100 ? '#10b981' : '#f59e0b', fontSize: 12 }}>{fmt(v || 0)}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{pct}%</div>
                    </div>
                  )
                },
              },
              {
                title: 'Ngày đặt',
                dataIndex: 'ngayDatHang',
                width: 100,
                render: v => v ? dayjs(v).format('DD/MM/YYYY') : '—',
              },
              {
                title: 'Trạng thái',
                dataIndex: 'tinhTrangSx',
                width: 130,
                render: v => {
                  const cfg = TRANG_THAI_CONFIG[v] || TRANG_THAI_CONFIG['null']
                  return <Tag color={cfg.color} style={{ fontSize: 11, fontWeight: 600 }}>{cfg.label}</Tag>
                },
              },
              {
                title: 'Độ ưu tiên',
                dataIndex: 'tinhTrangDatHang',
                width: 90,
                render: v => {
                  if (v === 'rat_gap') return <Tag color="red" style={{ fontSize: 11 }}>Rất gấp</Tag>
                  if (v === 'gap')     return <Tag color="orange" style={{ fontSize: 11 }}>Gấp</Tag>
                  return null
                },
              },
            ]}
          />
        </Card>
      </Spin>
    </div>
  )
}
