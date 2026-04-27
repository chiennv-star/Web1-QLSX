import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Table, Tabs, Tag, Typography, Button, message, Card, Row, Col, Statistic } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import api from '../api/axios'

const STATUS_COLORS = { done: 'green', doing: 'orange' }
const STATUS_LABELS = { done: 'Done', doing: 'Doing' }

const statusTag = (val) =>
  val ? <Tag color={STATUS_COLORS[val]}>{STATUS_LABELS[val] || val}</Tag> : <Tag>—</Tag>

const STAGE_CFG = {
  dg: {
    label: 'Hàng dở dang đóng gói',
    endpoint: '/production/wip-dg',
    trangThaiField: 'dgTrangThai',
    doDangLabel: 'Dở dang ĐG',
    summaryLabel: 'Tổng dở dang ĐG',
    slLabel: 'SL Trung bình',
    mayMocLabel: 'Máy Móc ĐG',
    doDang: r => (parseInt(r.pcPl) || 0) - (parseInt(r.dg2) || 0),
    renderDoDang: (_, r) => (parseInt(r.pcPl) || 0) - (parseInt(r.dg2) || 0),
    calcCongDuKien: r => {
      const slTb = parseFloat(r.slTrungBinh)
      const soLuong = parseInt(r.soLuong)
      if (!slTb || !soLuong) return '—'
      return (soLuong / slTb).toFixed(4)
    },
  },
  pc: {
    label: 'Hàng dở dang PC',
    endpoint: '/production/wip-pc',
    trangThaiField: 'pcTrangThai',
    doDangLabel: 'Dở dang PC',
    summaryLabel: 'Tổng dở dang PC',
    slLabel: 'Năng suất PC',
    mayMocLabel: 'Máy Móc PC',
    doDang: r => (r.soLuong || 0) - (parseInt(r.slPc) || 0),
    renderDoDang: (_, r) => (r.soLuong || 0) - (parseInt(r.slPc) || 0),
    calcCongDuKien: r => {
      const ns = parseFloat(r.slTrungBinh)
      const doDang = (r.soLuong || 0) - (parseInt(r.slPc) || 0)
      if (!ns || doDang <= 0) return '—'
      return (doDang / ns).toFixed(4)
    },
  },
  pl: {
    label: 'Hàng dở dang PL',
    endpoint: '/production/wip-pl',
    trangThaiField: 'plTrangThai',
    doDangLabel: 'Dở dang PL',
    summaryLabel: 'Tổng dở dang PL',
    slLabel: 'Năng suất PL',
    mayMocLabel: 'Máy Móc PL',
    doDang: r => (parseInt(r.slPc) || 0) - (parseInt(r.pcPl) || 0),
    renderDoDang: (_, r) => (parseInt(r.slPc) || 0) - (parseInt(r.pcPl) || 0),
    calcCongDuKien: r => {
      const ns = parseFloat(r.slTrungBinh)
      const doDang = (parseInt(r.slPc) || 0) - (parseInt(r.pcPl) || 0)
      if (!ns || doDang <= 0) return '—'
      return (doDang / ns).toFixed(4)
    },
  },
  bbc1: {
    label: 'Hàng dở dang BBC1',
    endpoint: '/production/wip-bbc1',
    trangThaiField: 'bbc1TrangThai',
    doDangLabel: 'Dở dang BBC1',
    summaryLabel: 'Tổng dở dang BBC1',
    slLabel: 'Năng suất BBC1',
    mayMocLabel: 'Máy Móc BBC1',
    doDang: r => (r.soLuong || 0) - (parseInt(r.bbc1_2) || 0),
    renderDoDang: (_, r) => (r.soLuong || 0) - (parseInt(r.bbc1_2) || 0),
    calcCongDuKien: r => {
      const ns = parseFloat(r.slTrungBinh)
      const doDang = (r.soLuong || 0) - (parseInt(r.bbc1_2) || 0)
      if (!ns || doDang <= 0) return '—'
      return (doDang / ns).toFixed(4)
    },
  },
}

function buildColumns(cfg) {
  return [
    { title: 'Mã SP', dataIndex: 'maTp', key: 'maTp', width: 90, fixed: 'left', render: v => <strong>{v}</strong> },
    { title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 110 },
    {
      title: 'Tiến Trình', dataIndex: 'tienTrinh', key: 'tienTrinh', width: 220,
      render: v => <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{v}</span>
    },
    { title: 'Số Lô', dataIndex: 'lsx', key: 'lsx', width: 100 },
    { title: 'Cỡ Lô', dataIndex: 'soLuong', key: 'soLuong', width: 80, align: 'right' },
    {
      title: 'Tình Trạng', dataIndex: cfg.trangThaiField, key: cfg.trangThaiField, width: 100, align: 'center',
      render: statusTag
    },
    {
      title: cfg.slLabel, dataIndex: 'slTrungBinh', key: 'slTrungBinh', width: 120, align: 'right',
      render: v => v ?? '—'
    },
    {
      title: cfg.doDangLabel, key: 'doDang', width: 110, align: 'right',
      render: cfg.renderDoDang
    },
    {
      title: 'Công dự kiến HT', key: 'congDuKien', width: 130, align: 'right',
      render: (_, r) => cfg.calcCongDuKien(r)
    },
    {
      title: cfg.mayMocLabel, dataIndex: 'mayMoc', key: 'mayMoc', width: 160,
      render: v => v || <span style={{ color: '#d9d9d9' }}>—</span>
    },
    { title: 'Mô tả', dataIndex: 'moTa', key: 'moTa', render: v => v || '—' },
  ]
}

const STAGE_LIST = [
  { key: 'dg',   label: 'Đóng gói', color: 'blue',   cfg: null },
  { key: 'pc',   label: 'PC',       color: 'purple', cfg: null },
  { key: 'pl',   label: 'PL',       color: 'cyan',   cfg: null },
  { key: 'bbc1', label: 'BBC1',     color: 'orange', cfg: null },
]
STAGE_LIST[0].cfg = STAGE_CFG.dg
STAGE_LIST[1].cfg = STAGE_CFG.pc
STAGE_LIST[2].cfg = STAGE_CFG.pl
STAGE_LIST[3].cfg = STAGE_CFG.bbc1

function WipSummaryTab({ onNavigate, tabOffset = 0 }) {
  const [dataMap, setDataMap] = useState({ dg: [], pc: [], pl: [], bbc1: [] })
  const [loading, setLoading] = useState(false)
  const stickyRef = useRef(null)
  const [headerOffset, setHeaderOffset] = useState(0)

  useEffect(() => {
    if (stickyRef.current) setHeaderOffset(tabOffset + stickyRef.current.offsetHeight + 8)
  })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [dgRes, pcRes, plRes, bbc1Res] = await Promise.all([
        api.get('/production/wip-dg'),
        api.get('/production/wip-pc'),
        api.get('/production/wip-pl'),
        api.get('/production/wip-bbc1'),
      ])
      setDataMap({ dg: dgRes.data, pc: pcRes.data, pl: plRes.data, bbc1: bbc1Res.data })
    } catch {
      message.error('Không thể tải dữ liệu tổng hợp')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const stageRows = STAGE_LIST.map(({ key, label, color, cfg }) => {
    const rows = dataMap[key]
    const tongDoDang = rows.reduce((sum, r) => sum + cfg.doDang(r), 0)
    const tongCDK = rows.reduce((sum, r) => {
      const v = cfg.calcCongDuKien(r)
      return v === '—' ? sum : sum + parseFloat(v)
    }, 0)
    return { key, label, color, tongDoDang, tongCDK, soLo: rows.length }
  })

  const totalDoDang = stageRows.reduce((s, r) => s + r.tongDoDang, 0)
  const totalCDK    = stageRows.reduce((s, r) => s + r.tongCDK, 0)
  const totalLo     = stageRows.reduce((s, r) => s + r.soLo, 0)

  const combinedData = [
    ...dataMap.dg.map(r   => ({ ...r, _stage: 'ĐG',   _stageColor: 'blue',   _stageKey: 'dg',   _doDang: STAGE_CFG.dg.doDang(r),   _cdk: STAGE_CFG.dg.calcCongDuKien(r) })),
    ...dataMap.pc.map(r   => ({ ...r, _stage: 'PC',   _stageColor: 'purple', _stageKey: 'pc',   _doDang: STAGE_CFG.pc.doDang(r),   _cdk: STAGE_CFG.pc.calcCongDuKien(r) })),
    ...dataMap.pl.map(r   => ({ ...r, _stage: 'PL',   _stageColor: 'cyan',   _stageKey: 'pl',   _doDang: STAGE_CFG.pl.doDang(r),   _cdk: STAGE_CFG.pl.calcCongDuKien(r) })),
    ...dataMap.bbc1.map(r => ({ ...r, _stage: 'BBC1', _stageColor: 'orange', _stageKey: 'bbc1', _doDang: STAGE_CFG.bbc1.doDang(r), _cdk: STAGE_CFG.bbc1.calcCongDuKien(r) })),
  ]

  const detailColumns = [
    {
      title: 'Công đoạn', key: '_stage', width: 100, fixed: 'left', align: 'center',
      render: (_, r) => (
        <Tag
          color={r._stageColor}
          onClick={() => onNavigate(r._stageKey)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
          title="Nhấn để xem chi tiết"
        >
          {r._stage}
        </Tag>
      )
    },
    { title: 'Mã SP',      dataIndex: 'maTp',      key: 'maTp',      width: 90,  render: v => <strong>{v}</strong> },
    { title: 'Mã Bravo',   dataIndex: 'maBravo',   key: 'maBravo',   width: 110 },
    { title: 'Tiến Trình', dataIndex: 'tienTrinh', key: 'tienTrinh', width: 220,
      render: v => <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{v}</span> },
    { title: 'Số Lô',      dataIndex: 'lsx',        key: 'lsx',       width: 100 },
    { title: 'Cỡ Lô',     dataIndex: 'soLuong',    key: 'soLuong',   width: 80, align: 'right' },
    { title: 'Dở dang',    key: '_doDang',           width: 100, align: 'right', render: (_, r) => r._doDang },
    { title: 'Công dự kiến HT', key: '_cdk',         width: 140, align: 'right', render: (_, r) => r._cdk },
    { title: 'Mô tả',      dataIndex: 'moTa',       key: 'moTa',      render: v => v || '—' },
  ]

  const thStyle = { padding: '7px 14px', textAlign: 'center', textTransform: 'uppercase',
    fontSize: 12, fontWeight: 600, background: '#fafafa', borderBottom: '1px solid #f0f0f0' }
  const tdBase = { padding: '6px 14px', borderBottom: '1px solid #f0f0f0', fontSize: 13 }

  return (
    <>
      <style>{`.ant-table-thead th.ant-table-cell { text-align: center !important; text-transform: uppercase; }`}</style>
      <div ref={stickyRef} style={{ position: 'sticky', top: tabOffset, zIndex: 10, background: '#fff', paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
        <Row gutter={48} style={{ marginBottom: 12 }}>
          <Col><Statistic title="Tổng dở dang (tất cả công đoạn)" value={totalDoDang.toLocaleString()} /></Col>
          <Col><Statistic title="Tổng công dự kiến HT" value={totalCDK.toFixed(4)} /></Col>
          <Col><Statistic title="Tổng số lô dở dang" value={totalLo} /></Col>
        </Row>

        <table style={{ borderCollapse: 'collapse', width: 680, marginBottom: 8, border: '1px solid #f0f0f0' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 160, textAlign: 'center' }}>Công đoạn</th>
              <th style={{ ...thStyle, width: 160, textAlign: 'right'  }}>Số lô dở dang</th>
              <th style={{ ...thStyle, width: 160, textAlign: 'right'  }}>Tổng dở dang</th>
              <th style={{ ...thStyle, width: 200, textAlign: 'right'  }}>Tổng công dự kiến HT</th>
            </tr>
          </thead>
          <tbody>
            {stageRows.map((r, i) => (
              <tr key={r.key} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ ...tdBase, textAlign: 'center' }}>
                  <Tag color={r.color} onClick={() => onNavigate(r.key)}
                    style={{ fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                    title="Nhấn để xem chi tiết">
                    {r.label} ↗
                  </Tag>
                </td>
                <td style={{ ...tdBase, textAlign: 'right' }}>{r.soLo}</td>
                <td style={{ ...tdBase, textAlign: 'right' }}>{r.tongDoDang.toLocaleString()}</td>
                <td style={{ ...tdBase, textAlign: 'right' }}>{r.tongCDK.toFixed(4)}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700, background: '#f0f5ff' }}>
              <td style={{ ...tdBase, textAlign: 'center', borderTop: '2px solid #d9d9d9' }}>Tổng cộng</td>
              <td style={{ ...tdBase, textAlign: 'right',  borderTop: '2px solid #d9d9d9' }}>{totalLo}</td>
              <td style={{ ...tdBase, textAlign: 'right',  borderTop: '2px solid #d9d9d9' }}>{totalDoDang.toLocaleString()}</td>
              <td style={{ ...tdBase, textAlign: 'right',  borderTop: '2px solid #d9d9d9' }}>{totalCDK.toFixed(4)}</td>
            </tr>
          </tbody>
        </table>

        <Button icon={<ReloadOutlined />} onClick={fetchAll} loading={loading} style={{ marginBottom: 4 }}>
          Làm mới
        </Button>
      </div>

      <Table
        columns={detailColumns}
        dataSource={combinedData}
        rowKey={(r, i) => `${r.id}_${r._stage}_${i}`}
        loading={loading}
        size="small"
        scroll={{ x: 1100 }}
        sticky={{ offsetHeader: headerOffset }}
        pagination={{ pageSize: 50, showTotal: total => `Tổng ${total} bản ghi` }}
        rowClassName={(_, idx) => idx % 2 === 0 ? '' : 'row-alt'}
      />
    </>
  )
}

function SummaryCard({ data, cfg }) {
  const tongDoDang = data.reduce((sum, r) => sum + cfg.doDang(r), 0)
  const tongCongDuKien = data.reduce((sum, r) => {
    const val = cfg.calcCongDuKien(r)
    return val === '—' ? sum : sum + parseFloat(val)
  }, 0)

  return (
    <Card style={{ marginBottom: 16 }} size="small">
      <Row gutter={32}>
        <Col><Statistic title={cfg.summaryLabel} value={tongDoDang} /></Col>
        <Col><Statistic title="Tổng công dự kiến hoàn thành" value={tongCongDuKien.toFixed(4)} /></Col>
        <Col><Statistic title="Số lô đang dở dang" value={data.length} /></Col>
      </Row>
    </Card>
  )
}

function WipStageTab({ cfg, tabOffset = 0 }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const controlsRef = useRef(null)
  const [headerOffset, setHeaderOffset] = useState(0)

  useEffect(() => {
    if (controlsRef.current) setHeaderOffset(tabOffset + controlsRef.current.offsetHeight + 8)
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get(cfg.endpoint)
      setData(res)
    } catch {
      message.error('Không thể tải dữ liệu hàng dở dang')
    } finally {
      setLoading(false)
    }
  }, [cfg.endpoint])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <>
      <div ref={controlsRef} style={{ position: 'sticky', top: tabOffset, zIndex: 10, background: '#fff', paddingBottom: 8 }}>
        <SummaryCard data={data} cfg={cfg} />
        <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading} style={{ marginBottom: 8 }}>
          Làm mới
        </Button>
      </div>
      <style>{`.ant-table-thead th.ant-table-cell { text-align: center !important; text-transform: uppercase; }`}</style>
      <Table
        columns={buildColumns(cfg)}
        dataSource={data}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 1100 }}
        sticky={{ offsetHeader: headerOffset }}
        pagination={{ pageSize: 50, showTotal: total => `Tổng ${total} bản ghi` }}
        rowClassName={(_, idx) => idx % 2 === 0 ? '' : 'row-alt'}
      />
    </>
  )
}

const TAB_BAR_H = 46

export default function WipPage() {
  const [activeKey, setActiveKey] = useState('summary')

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 12 }}>
        Hàng dở dang
      </Typography.Title>
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        tabBarStyle={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff', marginBottom: 0 }}
        items={[
          { key: 'summary', label: 'Tổng hợp',          children: <WipSummaryTab onNavigate={setActiveKey} tabOffset={TAB_BAR_H} /> },
          { key: 'dg',      label: STAGE_CFG.dg.label,   children: <WipStageTab cfg={STAGE_CFG.dg}   tabOffset={TAB_BAR_H} /> },
          { key: 'pc',      label: STAGE_CFG.pc.label,   children: <WipStageTab cfg={STAGE_CFG.pc}   tabOffset={TAB_BAR_H} /> },
          { key: 'pl',      label: STAGE_CFG.pl.label,   children: <WipStageTab cfg={STAGE_CFG.pl}   tabOffset={TAB_BAR_H} /> },
          { key: 'bbc1',    label: STAGE_CFG.bbc1.label, children: <WipStageTab cfg={STAGE_CFG.bbc1} tabOffset={TAB_BAR_H} /> },
        ]}
      />
    </>
  )
}
