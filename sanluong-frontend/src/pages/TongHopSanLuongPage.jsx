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
  { key: 'PCPL1', label: 'PCPL 1', slColor: '#1d4ed8', congColor: '#3b82f6', bg: '#eff6ff', border: '#93c5fd', headerBg: '#1d4ed8', kpiBg: '#1d4ed8', kpiBorder: '#93c5fd' },
  { key: 'PCPL2', label: 'PCPL 2', slColor: '#0369a1', congColor: '#0ea5e9', bg: '#e0f2fe', border: '#7dd3fc', headerBg: '#0369a1', kpiBg: '#0369a1', kpiBorder: '#7dd3fc' },
  { key: 'PL',    label: 'PL',     slColor: '#0e7490', congColor: '#06b6d4', bg: '#ecfeff', border: '#67e8f9', headerBg: '#0e7490', kpiBg: '#0e7490', kpiBorder: '#67e8f9' },
  { key: 'DG',    label: 'ĐG',     slColor: '#b45309', congColor: '#f59e0b', bg: '#fffbeb', border: '#fde68a', headerBg: '#b45309', kpiBg: '#b45309', kpiBorder: '#fde68a' },
  { key: 'BBC1',  label: 'BBC1',   slColor: '#6d28d9', congColor: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd', headerBg: '#6d28d9', kpiBg: '#6d28d9', kpiBorder: '#c4b5fd' },
  { key: 'CC',    label: 'CC',     slColor: '#be185d', congColor: '#ec4899', bg: '#fdf2f8', border: '#f9a8d4', headerBg: '#be185d', kpiBg: '#be185d', kpiBorder: '#f9a8d4' },
]

export default function TongHopSanLuongPage() {
  const [raw, setRaw]         = useState([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState(() => {
    try {
      const saved = localStorage.getItem('tonghop_dateRange')
      if (saved) {
        const [f, t] = JSON.parse(saved)
        return [dayjs(f), dayjs(t)]
      }
    } catch {}
    return [dayjs().subtract(13, 'day'), dayjs()]
  })

  const stickyRef = useRef(null)
  const [stickyH, setStickyH] = useState(110)
  useEffect(() => {
    if (!stickyRef.current) return
    const obs = new ResizeObserver(([e]) => setStickyH(e.contentRect.height))
    obs.observe(stickyRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (dateRange?.[0] && dateRange?.[1]) {
      localStorage.setItem('tonghop_dateRange', JSON.stringify([
        dateRange[0].format('YYYY-MM-DD'),
        dateRange[1].format('YYYY-MM-DD'),
      ]))
    }
  }, [dateRange])

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
    localStorage.removeItem('tonghop_dateRange')
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
      let cd = r.congDoan?.toUpperCase()
      if (!cd) return
      // Fallback: nếu BE cũ vẫn trả "PC", tách theo nhomThucHien / toNhom
      if (cd === 'PC') {
        const nhom = (r.nhomThucHien || r.toNhom)?.toUpperCase()
        cd = (nhom === 'PCPL1' || nhom === 'PCPL2') ? nhom : 'PCPL1'
      }
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
          ? <strong style={{ color: '#1D4ED8' }}>{fmtCong(total, 2)}</strong>
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
          background: '#fff',
          borderBottom: '2px solid #e2e8f0',
          padding: '10px 14px 10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        {/* Row 1: Tiêu đề + bộ lọc */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, color: '#1e3a5f', fontSize: 15, whiteSpace: 'nowrap', letterSpacing: 0.3 }}>
            <BarChartOutlined style={{ marginRight: 6, color: '#3b82f6' }} />
            Tổng Hợp Sản Lượng
          </span>
          <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 2px' }} />
          <RangePicker
            size="small"
            value={dateRange}
            onChange={setDateRange}
            format="DD/MM/YYYY"
            allowClear
            placeholder={['Từ ngày', 'Đến ngày']}
          />
          <Button size="small" type="primary" icon={<SearchOutlined />}
            style={{ background: '#1d4ed8', borderColor: '#1d4ed8', fontWeight: 600 }}
            onClick={() => fetchData()}>
            Truy xuất
          </Button>
          <Button size="small" icon={<ReloadOutlined />} onClick={handleReset} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
              <strong style={{ color: '#1e293b' }}>{pivotData.length}</strong> ngày &nbsp;·&nbsp;
              SL: <strong style={{ color: '#1D4ED8', fontSize: 14 }}>{fmtSL(grandSL)}</strong>
              &nbsp;&nbsp;
              Công: <strong style={{ color: '#1D4ED8', fontSize: 14 }}>{fmtCong(grandCong, 2)}</strong>
            </span>
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
          border-right: 1px solid rgba(255,255,255,0.18) !important;
          white-space: nowrap;
        }
        .tonghop-table .ant-table-thead > tr > th::before { display: none !important; }
        .tonghop-table .ant-table-thead > tr:first-child > th {
          font-size: 12px !important;
          font-weight: 800 !important;
          letter-spacing: 1.2px;
          padding: 10px 8px !important;
        }
        .tonghop-table .ant-table-thead > tr > th .ant-table-column-sorter { color: rgba(255,255,255,0.55) !important; }
        .tonghop-table .ant-table-thead > tr > th .ant-table-column-sorter-up.active,
        .tonghop-table .ant-table-thead > tr > th .ant-table-column-sorter-down.active { color: #fde68a !important; }
        .tonghop-table .ant-table-tbody > tr > td {
          padding: 8px 12px !important;
          border-bottom: 1px solid #e2e8f0 !important;
          vertical-align: middle;
          font-size: 13px;
        }
        .tonghop-table .ant-table-tbody > tr:nth-child(odd) > td  { background: #ffffff; }
        .tonghop-table .ant-table-tbody > tr:nth-child(even) > td { background: #f8faff; }
        .tonghop-table .ant-table-tbody > tr:hover > td { background: #eff6ff !important; transition: background 0.12s; }
        .tonghop-table .ant-table-summary > tr > td {
          background: #1e3a5f !important;
          color: #e2e8f0 !important;
          font-weight: 700 !important;
          font-size: 13px !important;
          padding: 9px 12px !important;
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
        scroll={{ x: 1500 }}
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
                    <strong style={{ color: '#1D4ED8' }}>{fmtSL(tot[s.key].sl)}</strong>
                  </Table.Summary.Cell>,
                  <Table.Summary.Cell key={`cong${i}`} index={i * 2 + 2} align="right">
                    <strong style={{ color: '#1D4ED8' }}>{fmtCong(tot[s.key].cong, 2)}</strong>
                  </Table.Summary.Cell>,
                ])}
                <Table.Summary.Cell index={13} align="right">
                  <strong style={{ color: '#1D4ED8', fontSize: 13 }}>{fmtSL(gSl)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={14} align="right">
                  <strong style={{ color: '#1D4ED8', fontSize: 13 }}>{fmtCong(gCong, 2)}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )
        }}
      />
    </>
  )
}
