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
  { key: 'PC',   label: 'PC',   slColor: '#1D4ED8', congColor: '#60a5fa', bg: '#eff6ff', border: '#93c5fd', headerBg: '#1e5fa3' },
  { key: 'PL',   label: 'PL',   slColor: '#0e7490', congColor: '#22d3ee', bg: '#ecfeff', border: '#67e8f9', headerBg: '#0e7490' },
  { key: 'DG',   label: 'ĐG',   slColor: '#b45309', congColor: '#fbbf24', bg: '#fffbeb', border: '#fde68a', headerBg: '#b45309' },
  { key: 'BBC1', label: 'BBC1', slColor: '#6d28d9', congColor: '#c084fc', bg: '#f5f3ff', border: '#c4b5fd', headerBg: '#6d28d9' },
  { key: 'CC',   label: 'CC',   slColor: '#9d174d', congColor: '#f472b6', bg: '#fdf2f8', border: '#f9a8d4', headerBg: '#9d174d' },
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
      title: 'NGÀY', dataIndex: 'ngay', key: 'ngay',
      width: 110, fixed: 'left', align: 'center',
      onHeaderCell: () => ({ style: { background: '#1e3a5f', color: '#e0f2fe', fontSize: 11 } }),
      render: v => (
        <span style={{ fontWeight: 700, color: '#1D4ED8' }}>
          {dayjs(v).format('DD/MM/YYYY')}
        </span>
      ),
      sorter: (a, b) => a.ngay.localeCompare(b.ngay),
      defaultSortOrder: 'descend',
    },
    ...STAGES.map(s => ({
      title: <span style={{ fontWeight: 800, letterSpacing: 1.5, fontSize: 12 }}>{s.label}</span>,
      key: s.key,
      align: 'center',
      onHeaderCell: () => ({ style: { background: s.headerBg, color: '#fff', textAlign: 'center', borderLeft: '2px solid rgba(255,255,255,0.2)' } }),
      children: [
        {
          title: 'SL',
          key: `${s.key}_sl`,
          width: 95,
          align: 'right',
          onHeaderCell: () => ({ style: { background: s.headerBg + 'dd', color: '#fff', fontSize: 10, opacity: 0.9 } }),
          render: (_, r) => {
            const val = r[s.key]?.sl
            if (!val) return <span style={{ color: '#d1d5db' }}>—</span>
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
          width: 88,
          align: 'right',
          onHeaderCell: () => ({ style: { background: s.headerBg + 'dd', color: '#fff', fontSize: 10, opacity: 0.9 } }),
          render: (_, r) => {
            const val = r[s.key]?.cong
            if (!val) return <span style={{ color: '#d1d5db' }}>—</span>
            return <span style={{ color: s.congColor, fontWeight: 600 }}>{fmtCong(val)}</span>
          },
        },
      ],
    })),
    {
      title: 'TỔNG SL',
      key: 'grandSl',
      width: 110,
      align: 'right',
      fixed: 'right',
      onHeaderCell: () => ({ style: { background: '#1e3a5f', color: '#7dd3fc', fontSize: 11 } }),
      render: (_, r) => {
        const total = STAGES.reduce((sum, s) => sum + (r[s.key]?.sl || 0), 0)
        return total
          ? <strong style={{ color: '#1D4ED8', fontSize: 13 }}>{fmtSL(total)}</strong>
          : <span style={{ color: '#d1d5db' }}>—</span>
      },
      sorter: (a, b) =>
        STAGES.reduce((s, st) => s + (a[st.key]?.sl || 0), 0) -
        STAGES.reduce((s, st) => s + (b[st.key]?.sl || 0), 0),
    },
    {
      title: 'TỔNG CÔNG',
      key: 'grandCong',
      width: 105,
      align: 'right',
      fixed: 'right',
      onHeaderCell: () => ({ style: { background: '#1e3a5f', color: '#7dd3fc', fontSize: 11 } }),
      render: (_, r) => {
        const total = STAGES.reduce((sum, s) => sum + (r[s.key]?.cong || 0), 0)
        return total
          ? <strong style={{ color: '#0e7490' }}>{fmtCong(total, 2)}</strong>
          : <span style={{ color: '#d1d5db' }}>—</span>
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
          background: 'linear-gradient(135deg, #1e3a5f 0%, #1e4e7a 100%)',
          borderBottom: '3px solid #3b82f6',
          padding: '10px 14px 8px',
          boxShadow: '0 3px 12px rgba(30,58,95,0.25)',
        }}
      >
        {/* Row 1: Tiêu đề + bộ lọc */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{ fontWeight: 800, color: '#7dd3fc', fontSize: 14, whiteSpace: 'nowrap', letterSpacing: 0.3 }}>
            <BarChartOutlined style={{ marginRight: 6 }} />
            Tổng Hợp Sản Lượng
          </span>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)', margin: '0 2px' }} />
          <RangePicker
            size="small"
            value={dateRange}
            onChange={setDateRange}
            format="DD/MM/YYYY"
            allowClear
            placeholder={['Từ ngày', 'Đến ngày']}
            style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.25)' }}
          />
          <Button size="small" type="primary" icon={<SearchOutlined />}
            style={{ background: '#3b82f6', borderColor: '#3b82f6', fontWeight: 600 }}
            onClick={() => fetchData()}>
            Truy xuất
          </Button>
          <Button size="small" icon={<ReloadOutlined />} onClick={handleReset}
            style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', color: '#cbd5e1' }} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
              <strong style={{ color: '#e2e8f0' }}>{pivotData.length}</strong> ngày
            </span>
            <span style={{ fontSize: 13, color: '#7dd3fc', fontWeight: 700, whiteSpace: 'nowrap' }}>
              SL: <strong style={{ color: '#fff', fontSize: 15 }}>{fmtSL(grandSL)}</strong>
            </span>
            <span style={{ fontSize: 13, color: '#7dd3fc', fontWeight: 700, whiteSpace: 'nowrap' }}>
              Công: <strong style={{ color: '#fff', fontSize: 15 }}>{fmtCong(grandCong, 2)}</strong>
            </span>
          </div>
        </div>

        {/* Row 2: KPI strip — mỗi công đoạn */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STAGES.map(s => (
            <div key={s.key} style={{
              background: 'rgba(255,255,255,0.07)',
              border: `1px solid ${s.border}55`,
              borderLeft: `3px solid ${s.headerBg}`,
              borderRadius: 8,
              padding: '5px 12px',
              display: 'flex', alignItems: 'center', gap: 10,
              minWidth: 130,
            }}>
              <div style={{
                fontSize: 13, fontWeight: 800, color: '#fff',
                background: s.headerBg,
                borderRadius: 5, padding: '1px 7px', letterSpacing: 0.8,
              }}>{s.label}</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>SL</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: s.slColor === '#1D4ED8' ? '#60a5fa' : s.slColor, lineHeight: 1.1 }}>
                    {fmtSL(kpi[s.key].sl)}
                  </div>
                </div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.12)', alignSelf: 'stretch' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Công</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: s.congColor, lineHeight: 1.1 }}>
                    {fmtCong(kpi[s.key].cong, 2)}
                  </div>
                </div>
                {kpi[s.key].soPhien > 0 && (
                  <div style={{ fontSize: 9, color: '#64748b', alignSelf: 'flex-end', paddingBottom: 1 }}>
                    {kpi[s.key].soPhien}p
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Tổng tất cả */}
          <div style={{
            background: 'rgba(59,130,246,0.15)',
            border: '1.5px solid #3b82f6',
            borderRadius: 8, padding: '5px 14px',
            display: 'flex', alignItems: 'center', gap: 12,
            minWidth: 150,
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#7dd3fc', display: 'flex', alignItems: 'center', gap: 4 }}>
              <RiseOutlined /> TỔNG
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>SL</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>{fmtSL(grandSL)}</div>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.15)', alignSelf: 'stretch' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Công</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#7dd3fc', lineHeight: 1.1 }}>{fmtCong(grandCong, 2)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CSS ── */}
      <style>{`
        .tonghop-table .ant-table-thead > tr > th {
          color: #ffffff !important;
          text-align: center !important;
          text-transform: uppercase;
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.5px;
          padding: 8px 6px !important;
          border-right: 1px solid rgba(255,255,255,0.15) !important;
          white-space: nowrap;
        }
        .tonghop-table .ant-table-thead > tr > th::before { display: none !important; }
        .tonghop-table .ant-table-thead > tr:first-child > th {
          font-size: 12px !important;
          font-weight: 800 !important;
          letter-spacing: 1.2px;
          padding: 9px 8px !important;
        }
        .tonghop-table .ant-table-thead > tr > th .ant-table-column-sorter { color: rgba(255,255,255,0.6) !important; }
        .tonghop-table .ant-table-thead > tr > th .ant-table-column-sorter-up.active,
        .tonghop-table .ant-table-thead > tr > th .ant-table-column-sorter-down.active { color: #fbbf24 !important; }
        .tonghop-table .ant-table-tbody > tr > td {
          padding: 7px 10px !important;
          border-bottom: 1px solid #f1f5f9 !important;
          vertical-align: middle;
          font-size: 12px;
        }
        .tonghop-table .ant-table-tbody > tr:nth-child(odd) > td { background: #ffffff; }
        .tonghop-table .ant-table-tbody > tr:nth-child(even) > td { background: #f8faff; }
        .tonghop-table .ant-table-tbody > tr:hover > td { background: #eff6ff !important; transition: background 0.15s; }
        .tonghop-table .ant-table-summary > tr > td {
          background: #1e3a5f !important;
          color: #e2e8f0 !important;
          font-weight: 700;
          font-size: 12px;
          padding: 8px 10px !important;
          border-top: 2px solid #3b82f6 !important;
        }
        .tonghop-table .ant-table-fixed-left .ant-table-tbody > tr > td,
        .tonghop-table .ant-table-fixed-right .ant-table-tbody > tr > td {
          border-right: 1px solid #e2e8f0 !important;
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
                  <strong style={{ color: '#7dd3fc', fontSize: 11, letterSpacing: 0.5 }}>TỔNG TRANG</strong>
                </Table.Summary.Cell>
                {STAGES.flatMap((s, i) => [
                  <Table.Summary.Cell key={`sl${i}`} index={i * 2 + 1} align="right">
                    <strong style={{ color: '#bfdbfe' }}>{fmtSL(tot[s.key].sl)}</strong>
                  </Table.Summary.Cell>,
                  <Table.Summary.Cell key={`cong${i}`} index={i * 2 + 2} align="right">
                    <strong style={{ color: '#93c5fd' }}>{fmtCong(tot[s.key].cong, 2)}</strong>
                  </Table.Summary.Cell>,
                ])}
                <Table.Summary.Cell index={11} align="right">
                  <strong style={{ color: '#fff', fontSize: 13 }}>{fmtSL(gSl)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={12} align="right">
                  <strong style={{ color: '#7dd3fc', fontSize: 13 }}>{fmtCong(gCong, 2)}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )
        }}
      />
    </>
  )
}
