import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Spin, Progress, Tag, Empty, Typography } from 'antd'
import dayjs from 'dayjs'
import api from '../api/axios'
import { PHAN_LOAI_OPTIONS, phanLoaiColor, trangThaiColor } from './kyThuatConstants'

const { Text } = Typography

function BarList({ items, colorFn, emptyText }) {
  if (!items || !items.length) return <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />
  const max = Math.max(...items.map(i => i.n), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((it, idx) => (
        <div key={idx}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}>
            <span>{it.ten}</span>
            <b style={{ fontFamily: 'monospace' }}>{it.n}</b>
          </div>
          <Progress
            percent={Math.round((it.n / max) * 100)}
            showInfo={false}
            strokeColor={colorFn ? colorFn(it.ten) : '#339999'}
            size="small"
          />
        </div>
      ))}
    </div>
  )
}

function CategoryCard({ title, roleLabel, total, data, alt }) {
  const rows = PHAN_LOAI_OPTIONS.map(o => ({ ten: o.value, n: data?.[o.value] || 0, color: o.color }))
  const max = Math.max(...rows.map(r => r.n), 1)
  return (
    <Card size="small" style={{ background: alt ? '#FAFAFA' : '#fff', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text strong>{title}</Text>
        <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>{total}</Text>
      </div>
      <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>{roleLabel}</Text>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(r => (
          <div key={r.ten}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span>{r.ten}</span><b>{r.n}</b>
            </div>
            <Progress percent={Math.round((r.n / max) * 100)} showInfo={false} strokeColor={r.color} size="small" />
          </div>
        ))}
      </div>
    </Card>
  )
}

export default function KyThuatTongQuanTab() {
  const [dash, setDash] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const { data } = await api.get('/ky-thuat/dashboard')
        setDash(data)
      } catch { /* silent */ }
      finally { setLoading(false) }
    })()
  }, [])

  if (loading || !dash) {
    return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
  }

  const { kpi, catCoDien, catKyThuat, catThuViec, equip, area, status } = dash

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card size="small">
        <Text type="secondary" style={{ fontSize: 12 }}>
          Kỳ dữ liệu: <b>{kpi.dateMin ? dayjs(kpi.dateMin).format('DD/MM/YYYY') : '—'}</b> đến <b>{kpi.dateMax ? dayjs(kpi.dateMax).format('DD/MM/YYYY') : '—'}</b>
        </Text>
        <Row gutter={16} style={{ marginTop: 10 }}>
          <Col span={4}><Statistic title="Tổng đầu việc" value={kpi.total} /></Col>
          <Col span={4}><Statistic title="Cơ điện" value={kpi.codien} valueStyle={{ color: '#0F5A61' }} /></Col>
          <Col span={4}><Statistic title="Kỹ thuật" value={kpi.kythuat} valueStyle={{ color: '#CF8319' }} /></Col>
          <Col span={4}><Statistic title="Thử việc" value={kpi.thuviec} valueStyle={{ color: '#5C6E86' }} /></Col>
          <Col span={4}><Statistic title="Tỷ lệ đã xử lý" value={kpi.resolvedPct} suffix="%" /></Col>
          <Col span={4}><Statistic title="TB đầu việc / ngày" value={kpi.avgPerDay} /></Col>
        </Row>
      </Card>

      <Row gutter={16}>
        <Col span={8}>
          <CategoryCard title="Cơ điện" roleLabel="Sự cố & bảo dưỡng hiện trường" total={kpi.codien} data={catCoDien} />
        </Col>
        <Col span={8}>
          <CategoryCard title="Kỹ thuật phân xưởng" roleLabel="Thẩm định – công nghệ" total={kpi.kythuat} data={catKyThuat} alt />
        </Col>
        <Col span={8}>
          <CategoryCard title="Nhân sự thử việc" roleLabel="Bảo dưỡng – hỗ trợ" total={kpi.thuviec} data={catThuViec} />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={14}>
          <Card size="small" title="Điểm nóng thiết bị (số lần xuất hiện trong nhật ký)">
            <BarList items={equip} emptyText="Chưa có dữ liệu" />
          </Card>
        </Col>
        <Col span={10}>
          <Card size="small" title="Khu vực phát sinh nhiều việc nhất (Cơ điện)" style={{ marginBottom: 16 }}>
            <BarList items={area} emptyText="Chưa có dữ liệu" />
          </Card>
          <Card size="small" title="Trạng thái xử lý (toàn bộ 3 nhóm)">
            {status && status.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {status.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', border: '1px solid #f0f0f0', borderRadius: 6 }}>
                    <Tag color={trangThaiColor(s.ten)} style={{ marginRight: 0 }}>{s.ten}</Tag>
                    <b style={{ fontFamily: 'monospace' }}>{s.n}</b>
                  </div>
                ))}
              </div>
            ) : <Empty description="Chưa có dữ liệu" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
