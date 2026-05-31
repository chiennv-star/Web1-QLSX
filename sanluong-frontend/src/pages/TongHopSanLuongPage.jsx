import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  Table, Button, Typography, message, DatePicker, Tooltip, Tag
} from 'antd'
import {
  SearchOutlined, ReloadOutlined, BarChartOutlined,
  RiseOutlined, TeamOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api/axios'

const { RangePicker } = DatePicker

const fmtSL   = v => (v || 0).toLocaleString('vi-VN')
const fmtCong = (v, d = 4) => (v || 0).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d })

const STAGES = [
  { key: 'PC',   label: 'PC',   slColor: '#4ca4fb', congColor: '#4db3d4', bg: '#EAECF2', border: '#4db3d4' },
  { key: 'PL',   label: 'PL',   slColor: '#1677ff', congColor: '#69b1ff', bg: '#e6f4ff', border: '#91caff' },
  { key: 'DG',   label: 'ĐG',   slColor: '#d48806', congColor: '#ffc53d', bg: '#fffbe6', border: '#ffe58f' },
  { key: 'BBC1', label: 'BBC1', slColor: '#531dab', congColor: '#b37feb', bg: '#f9f0ff', border: '#d3adf7' },
  { key: 'CC',   label: 'CC',   slColor: '#c41d7f', congColor: '#ff85c2', bg: '#fff0f6', border: '#ffadd2' },
]

export default function TongHopSanLuongPage() {
  const [raw, setRaw]         = useState([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState([dayjs().subtract(13, 'day'), dayjs()])

  const stickyRef = useRef(null)
  const [stickyH, setStickyH] = useState(110)
  useEffect(() => {
    if (!stickyRef.current) return
    const obs = new ResizeObserver(([e]) => setStickyH(e.contentRect.height))
    obs.observe(stickyRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => { fetchData() }, []) // eslint-disable-line

  const fetchData = useCallback(async (range = dateRange) => {
    setLoading(true)
    try {
      const params = {}
      if (range?.[0]) params.fromDate = range[0].format('YYYY-MM-DD')
      if (range?.[1]) params.toDate   = range[1].format('YYYY-MM-DD')
      const { data: res } = await api.get('/work-schedule-session/daily-report', { params })
      setRaw(res)
    } catch {
      message.error('Không thể tải dữ liệu tổng hợp')
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  const handleReset = () => {
    const def = [dayjs().subtract(13, 'day'), dayjs()]
    setDateRange(def)
    fetchData(def)
  }

  /* ── Pivot: group by ngay → congDoan → { sl, cong, soPhien } ── */
  const pivotData = useMemo(() => {
    const map = {}
    raw.forEach(r => {
      if (r.status === 'PENDING' || r.status === 'IN_PROGRESS') return
      const date = r.ngay
      if (!date) return
      if (!map[date]) map[date] = { ngay: date }
      const cd = r.congDoan?.toUpperCase()
      if (!cd) return
      if (!map[date][cd]) map[date][cd] = { sl: 0, cong: 0, soPhien: 0 }
      map[date][cd].sl      += Number(r.sanLuong      || 0)
      map[date][cd].cong    += Number(r.congThucHien  || 0)
      map[date][cd].soPhien += 1
    })
    return Object.values(map).sort((a, b) => b.ngay.localeCompare(a.ngay))
  }, [raw])

  /* ── KPI tổng toàn kỳ ── */
  const kpi = useMemo(() => {
    const totals = {}
    STAGES.forEach(s => { totals[s.key] = { sl: 0, cong: 0, soPhien: 0 } })
    pivotData.forEach(row => {
      STAGES.forEach(s => {
        totals[s.key].sl      += row[s.key]?.sl      || 0
        totals[s.key].cong    += row[s.key]?.cong    || 0
        totals[s.key].soPhien += row[s.key]?.soPhien || 0
      })
    })
    return totals
  }, [pivotData])

  const grandSL   = STAGES.reduce((s, st) => s + kpi[st.key].sl,   0)
  const grandCong = STAGES.reduce((s, st) => s + kpi[st.key].cong, 0)

  /* ── Cột bảng ── */
  const columns = [
    {
      title: 'Ngày', dataIndex: 'ngay', key: 'ngay',
      width: 110, fixed: 'left', align: 'center',
      render: v => (
        <span style={{ fontWeight: 700, color: '#1677ff' }}>
          {dayjs(v).format('DD/MM/YYYY')}
        </span>
      ),
      sorter: (a, b) => a.ngay.localeCompare(b.ngay),
      defaultSortOrder: 'descend',
    },
    ...STAGES.map(s => ({
      title: <span style={{ letterSpacing: 1 }}>{s.label}</span>,
      key: s.key,
      children: [
        {
          title: 'SL',
          key: `${s.key}_sl`,
          width: 95,
          align: 'right',
          render: (_, r) => {
            const val = r[s.key]?.sl
            if (!val) return <span style={{ color: '#e0e0e0' }}>—</span>
            return (
              <Tooltip title={`${r[s.key]?.soPhien || 0} phiên làm việc`}>
                <span style={{ fontWeight: 700, color: s.slColor }}>
                  {fmtSL(val)}
                </span>
              </Tooltip>
            )
          },
          sorter: (a, b) => (a[s.key]?.sl || 0) - (b[s.key]?.sl || 0),
        },
        {
          title: 'Công',
          key: `${s.key}_cong`,
          width: 90,
          align: 'right',
          render: (_, r) => {
            const val = r[s.key]?.cong
            if (!val) return <span style={{ color: '#e0e0e0' }}>—</span>
            return <span style={{ color: s.congColor }}>{fmtCong(val)}</span>
          },
        },
      ],
    })),
    {
      title: 'Tổng SL',
      key: 'grandSl',
      width: 110,
      align: 'right',
      fixed: 'right',
      render: (_, r) => {
        const total = STAGES.reduce((sum, s) => sum + (r[s.key]?.sl || 0), 0)
        return total
          ? <strong style={{ color: '#248be6', fontSize: 13 }}>{fmtSL(total)}</strong>
          : <span style={{ color: '#e0e0e0' }}>—</span>
      },
      sorter: (a, b) =>
        STAGES.reduce((s, st) => s + (a[st.key]?.sl || 0), 0) -
        STAGES.reduce((s, st) => s + (b[st.key]?.sl || 0), 0),
    },
    {
      title: 'Tổng Công',
      key: 'grandCong',
      width: 105,
      align: 'right',
      fixed: 'right',
      render: (_, r) => {
        const total = STAGES.reduce((sum, s) => sum + (r[s.key]?.cong || 0), 0)
        return total
          ? <strong style={{ color: '#248be6' }}>{fmtCong(total, 2)}</strong>
          : <span style={{ color: '#e0e0e0' }}>—</span>
      },
    },
  ]

  return (
    <>
      {/* ── Sticky header ── */}
      <div
        ref={stickyRef}
        style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: '#fff',
          borderBottom: '2px solid #D0D5DC',
          padding: '8px 0 10px',
          marginBottom: 10,
        }}
      >
        {/* Row 1: Tiêu đề + bộ lọc */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontWeight: 700, color: '#63abea', fontSize: 15, whiteSpace: 'nowrap' }}>
            <BarChartOutlined style={{ marginRight: 6, color: '#6dadec' }} />
            Bảng Tổng Hợp Sản Lượng
          </span>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>Khoảng thời gian:</Typography.Text>
          <RangePicker
            size="small"
            value={dateRange}
            onChange={setDateRange}
            format="DD/MM/YYYY"
            allowClear
            placeholder={['Từ ngày', 'Đến ngày']}
          />
          <Button size="small" type="primary" icon={<SearchOutlined />}
            style={{ background: '#6dadec', borderColor: '#6dadec' }}
            onClick={() => fetchData()}>
            Truy xuất
          </Button>
          <Button size="small" icon={<ReloadOutlined />} onClick={handleReset} />
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>
            <strong style={{ color: '#1D4ED8' }}>{pivotData.length}</strong> ngày ·{' '}
            Tổng SL: <strong style={{ color: '#1D4ED8' }}>{fmtSL(grandSL)}</strong> ·{' '}
            Tổng Công: <strong style={{ color: '#4db3d4' }}>{fmtCong(grandCong, 2)}</strong>
          </span>
        </div>

        {/* Row 2: KPI strip — mỗi công đoạn */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {STAGES.map(s => (
            <div key={s.key} style={{
              background: s.bg, border: `1px solid ${s.border}`,
              borderRadius: 10, padding: '5px 14px',
              display: 'flex', flexDirection: 'column', minWidth: 140,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Tag color={s.slColor} style={{ margin: 0, fontWeight: 700, fontSize: 11 }}>{s.label}</Tag>
                <span style={{ fontSize: 10, color: '#888' }}>
                  <TeamOutlined style={{ marginRight: 2 }} />{kpi[s.key].soPhien} phiên
                </span>
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 9, color: '#999', fontWeight: 600 }}>SẢN LƯỢNG</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: s.slColor, lineHeight: 1.2 }}>
                    {fmtSL(kpi[s.key].sl)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: '#999', fontWeight: 600 }}>CÔNG TH</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: s.congColor, lineHeight: 1.2 }}>
                    {fmtCong(kpi[s.key].cong, 2)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Tổng tất cả */}
          <div style={{
            background: 'linear-gradient(135deg, #EAECF2, #DDE1E8)',
            border: '2px solid #4db3d4',
            borderRadius: 10, padding: '5px 14px',
            display: 'flex', flexDirection: 'column', minWidth: 150,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#1D4ED8', marginBottom: 2 }}>
              <RiseOutlined style={{ marginRight: 4 }} />TỔNG TẤT CẢ
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              <div>
                <div style={{ fontSize: 9, color: '#999', fontWeight: 600 }}>SẢN LƯỢNG</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1D4ED8', lineHeight: 1.2 }}>
                  {fmtSL(grandSL)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#999', fontWeight: 600 }}>CÔNG TH</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8', lineHeight: 1.2 }}>
                  {fmtCong(grandCong, 2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CSS ── */}
      <style>{`
        .tonghop-table .ant-table-thead > tr > th {
          background: linear-gradient(90deg, #2980b3 0%, #3399CC 100%) !important;
          color: #ffffff !important;
          text-align: center !important;
          text-transform: uppercase;
          font-size: 11px !important;
          letter-spacing: 0.4px;
          padding: 7px 6px !important;
          border-right: 1px solid #4db3d4 !important;
          white-space: nowrap;
        }
        .tonghop-table .ant-table-thead > tr > th::before { display: none !important; }
        .tonghop-table .ant-table-thead > tr:first-child > th {
          background: linear-gradient(90deg, #3093e9 0%, #3093e9 100%) !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          letter-spacing: 1px;
        }
        .tonghop-table .ant-table-thead > tr > th .ant-table-column-sorter { color: #a7f3d0 !important; }
        .tonghop-table .ant-table-tbody > tr > td {
          padding: 6px 8px !important;
          border-bottom: 1px solid #EAECF2 !important;
          vertical-align: middle;
        }
        .tonghop-table .ant-table-tbody > tr:nth-child(even) > td { background: #EAECF2; }
        .tonghop-table .ant-table-tbody > tr:hover > td { background: #EFF6FF !important; }
        .tonghop-table .ant-table-summary > tr > td {
          background: linear-gradient(90deg, #1f6fa3 0%, #2980b3 100%) !important;
          color: #ffffff !important;
          font-weight: 700;
          font-size: 12px;
          padding: 7px 8px !important;
        }
      `}</style>

      {/* ── Bảng pivot ── */}
      <Table
        className="tonghop-table"
        columns={columns}
        dataSource={pivotData}
        rowKey="ngay"
        loading={loading}
        size="small"
        scroll={{ x: 1300 }}
        sticky={{ offsetHeader: stickyH }}
        pagination={{
          defaultPageSize: 31,
          showSizeChanger: true,
          pageSizeOptions: ['14', '31', '60', '90'],
          showTotal: total => `Tổng ${total} ngày`,
        }}
        summary={pageData => {
          const tot = {}
          STAGES.forEach(s => { tot[s.key] = { sl: 0, cong: 0 } })
          pageData.forEach(r => {
            STAGES.forEach(s => {
              tot[s.key].sl   += r[s.key]?.sl   || 0
              tot[s.key].cong += r[s.key]?.cong || 0
            })
          })
          const gSl   = STAGES.reduce((sum, s) => sum + tot[s.key].sl,   0)
          const gCong = STAGES.reduce((sum, s) => sum + tot[s.key].cong, 0)

          return (
            <Table.Summary fixed="bottom">
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} align="center">
                  <strong style={{ color: '#a7f3d0' }}>TỔNG TRANG</strong>
                </Table.Summary.Cell>
                {STAGES.flatMap((s, i) => [
                  <Table.Summary.Cell key={`sl${i}`} index={i * 2 + 1} align="right">
                    <strong>{fmtSL(tot[s.key].sl)}</strong>
                  </Table.Summary.Cell>,
                  <Table.Summary.Cell key={`cong${i}`} index={i * 2 + 2} align="right">
                    <strong>{fmtCong(tot[s.key].cong, 2)}</strong>
                  </Table.Summary.Cell>,
                ])}
                <Table.Summary.Cell index={11} align="right">
                  <strong style={{ color: '#4db3d4', fontSize: 13 }}>{fmtSL(gSl)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={12} align="right">
                  <strong style={{ color: '#4db3d4' }}>{fmtCong(gCong, 2)}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )
        }}
      />
    </>
  )
}
