import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  Table, Button, Typography, message, DatePicker, Select,
  Tabs, Tag, Tooltip, Badge, Statistic
} from 'antd'
import {
  SearchOutlined, ReloadOutlined, FileDoneOutlined,
  TeamOutlined, ClockCircleOutlined, RiseOutlined, ApartmentOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import api from '../api/axios'

dayjs.extend(isoWeek)

const { RangePicker } = DatePicker

const DEPTS = ['PC', 'PL', 'DG', 'BBC1', 'PCPL1', 'PCPL2', 'PCPL3']
const DEPT_COLOR = { PC: '#1D4ED8', PL: '#1677ff', DG: '#d48806', BBC1: '#531dab', PCPL1: '#c41d7f', PCPL2: '#08979c', PCPL3: '#d46b08' }

const fmt4 = v => (v || 0).toLocaleString('vi-VN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
const fmt2 = v => (v || 0).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const PERIOD_OPTS = [
  { key: 'week',   label: 'Tuần này' },
  { key: 'month',  label: 'Tháng này' },
  { key: 'custom', label: 'Tùy chỉnh' },
]

function getWeekRange() {
  return [dayjs().startOf('isoWeek'), dayjs().endOf('isoWeek')]
}
function getMonthRange() {
  return [dayjs().startOf('month'), dayjs().endOf('month')]
}

// ── Tạo danh sách ngày trong khoảng ──────────────────────────────────────────
function buildDateList(from, to) {
  const dates = []
  let cur = from.clone()
  while (cur.isBefore(to, 'day') || cur.isSame(to, 'day')) {
    dates.push(cur.format('YYYY-MM-DD'))
    cur = cur.add(1, 'day')
  }
  return dates
}

// ── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, accent }) {
  return (
    <div style={{
      background: '#fff', border: `1.5px solid ${accent}22`,
      borderLeft: `4px solid ${accent}`,
      borderRadius: 10, padding: '8px 16px', minWidth: 150,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{icon} {label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: accent, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function ChamCongPage() {
  const [period, setPeriod]       = useState('week')
  const [dateRange, setDateRange] = useState(getWeekRange())
  const [deptFilter, setDeptFilter] = useState(null)
  const [activeTab, setActiveTab] = useState('nhanvien')

  const [empRows, setEmpRows]   = useState([])
  const [deptRows, setDeptRows] = useState([])
  const [loading, setLoading]   = useState(false)

  const stickyRef = useRef(null)
  const [stickyH, setStickyH] = useState(120)
  useEffect(() => {
    if (!stickyRef.current) return
    const obs = new ResizeObserver(([e]) => setStickyH(e.contentRect.height))
    obs.observe(stickyRef.current)
    return () => obs.disconnect()
  }, [])

  const [tabBarH, setTabBarH] = useState(44)
  useEffect(() => {
    const nav = document.querySelector('.chamcong-tabs > .ant-tabs-nav')
    if (!nav) return
    const obs = new ResizeObserver(([e]) => setTabBarH(e.contentRect.height))
    obs.observe(nav)
    return () => obs.disconnect()
  }, [])

  const fetchData = useCallback(async (range = dateRange, dept = deptFilter) => {
    setLoading(true)
    try {
      const from = range[0].format('YYYY-MM-DD')
      const to   = range[1].format('YYYY-MM-DD')
      const [r1, r2] = await Promise.all([
        api.get('/attendance/timesheet',   { params: { fromDate: from, toDate: to, toNhom: dept || undefined } }),
        api.get('/attendance/dept-summary', { params: { fromDate: from, toDate: to } }),
      ])
      setEmpRows(r1.data)
      setDeptRows(r2.data)
    } catch {
      message.error('Không thể tải dữ liệu chấm công')
    } finally {
      setLoading(false)
    }
  }, [dateRange, deptFilter])

  useEffect(() => { fetchData() }, []) // eslint-disable-line

  const handlePeriod = (key) => {
    setPeriod(key)
    if (key === 'week')  { const r = getWeekRange();  setDateRange(r); fetchData(r) }
    if (key === 'month') { const r = getMonthRange(); setDateRange(r); fetchData(r) }
  }

  const handleReset = () => {
    const r = getWeekRange()
    setPeriod('week'); setDateRange(r); setDeptFilter(null)
    fetchData(r, null)
  }

  // Danh sách ngày trong khoảng
  const dateList = useMemo(() => buildDateList(dateRange[0], dateRange[1]), [dateRange])

  // ── KPI tổng ─────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const tongCongThuong = empRows.reduce((s, r) => s + Number(r.tongCongThuong || 0), 0)
    const tongCongTangCa = empRows.reduce((s, r) => s + Number(r.tongCongTangCa || 0), 0)
    const soNV = empRows.length
    const soCa = empRows.reduce((s, r) => s + (r.soCaLamViec || 0), 0)
    return { tongCongThuong, tongCongTangCa, tongCong: tongCongThuong + tongCongTangCa, soNV, soCa }
  }, [empRows])

  // ── Cột bảng nhân viên ───────────────────────────────────────────
  const empColumns = useMemo(() => {
    const fixedCols = [
      {
        title: 'Mã NV', dataIndex: 'maNhanVien', key: 'ma', width: 80, fixed: 'left',
        render: v => <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600 }}>{v}</span>,
      },
      {
        title: 'Họ và Tên', dataIndex: 'hoVaTen', key: 'ten', width: 160, fixed: 'left',
        render: v => <span style={{ fontWeight: 600, fontSize: 12 }}>{v}</span>,
      },
      {
        title: 'Bộ phận', dataIndex: 'toNhom', key: 'bp', width: 80, fixed: 'left', align: 'center',
        render: v => <Tag color={DEPT_COLOR[v] || 'default'} style={{ margin: 0, fontSize: 11 }}>{v}</Tag>,
      },
    ]

    const dayCols = dateList.map(date => ({
      title: (
        <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
          <div style={{ fontSize: 10 }}>{dayjs(date).format('ddd')}</div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{dayjs(date).format('DD/MM')}</div>
        </div>
      ),
      key: date,
      width: 75,
      align: 'center',
      render: (_, r) => {
        const dc = r.ngayData?.[date]
        if (!dc || (Number(dc.congThuong) === 0 && Number(dc.congTangCa) === 0))
          return <span style={{ color: '#e0e0e0', fontSize: 12 }}>—</span>
        return (
          <Tooltip title={`Thường: ${fmt4(dc.congThuong)} | Tăng ca: ${fmt4(dc.congTangCa)} | ${dc.soPhien} phiên`}>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontWeight: 700, color: '#0033CC', fontSize: 12 }}>
                {fmt2(Number(dc.congThuong))}
              </div>
              {Number(dc.congTangCa) > 0 && (
                <div style={{ color: '#0033CC', fontSize: 11, fontWeight: 600 }}>
                  +{fmt2(Number(dc.congTangCa))}
                </div>
              )}
            </div>
          </Tooltip>
        )
      },
    }))

    const summaryCols = [
      {
        title: 'Công Thường', key: 'ct', width: 95, align: 'right', fixed: 'right',
        render: (_, r) => <span style={{ fontWeight: 700, color: '#0033CC' }}>{fmt2(Number(r.tongCongThuong))}</span>,
        sorter: (a, b) => Number(a.tongCongThuong) - Number(b.tongCongThuong),
      },
      {
        title: 'Tăng Ca', key: 'tc', width: 80, align: 'right', fixed: 'right',
        render: (_, r) => Number(r.tongCongTangCa) > 0
          ? <span style={{ fontWeight: 700, color: '#0033CC' }}>{fmt2(Number(r.tongCongTangCa))}</span>
          : <span style={{ color: '#e0e0e0' }}>—</span>,
        sorter: (a, b) => Number(a.tongCongTangCa) - Number(b.tongCongTangCa),
      },
      {
        title: 'Tổng Công', key: 'tong', width: 95, align: 'right', fixed: 'right',
        render: (_, r) => (
          <strong style={{ color: '#0033CC', fontSize: 13 }}>
            {fmt2(Number(r.tongCong))}
          </strong>
        ),
        sorter: (a, b) => Number(a.tongCong) - Number(b.tongCong),
        defaultSortOrder: 'descend',
      },
    ]

    return [...fixedCols, ...dayCols, ...summaryCols]
  }, [dateList, empRows])

  // ── Cột bảng bộ phận ─────────────────────────────────────────────
  const deptColumns = useMemo(() => {
    const fixedCols = [
      {
        title: 'Bộ Phận', dataIndex: 'boPhan', key: 'bp', width: 100, fixed: 'left', align: 'center',
        render: v => (
          <Tag color={DEPT_COLOR[v] || 'default'} style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{v}</Tag>
        ),
      },
    ]

    const dayCols = dateList.map(date => ({
      title: (
        <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
          <div style={{ fontSize: 10 }}>{dayjs(date).format('ddd')}</div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{dayjs(date).format('DD/MM')}</div>
        </div>
      ),
      key: date,
      width: 90,
      align: 'center',
      render: (_, r) => {
        const dc = r.ngayData?.[date]
        if (!dc || (Number(dc.congThuong) === 0 && Number(dc.congTangCa) === 0))
          return <span style={{ color: '#e0e0e0' }}>—</span>
        return (
          <Tooltip title={`Thường: ${fmt4(dc.congThuong)} | TC: ${fmt4(dc.congTangCa)} | ${dc.soPhien} phiên`}>
            <div style={{ lineHeight: 1.4 }}>
              <div style={{ fontWeight: 700, color: '#0033CC', fontSize: 13 }}>{fmt2(Number(dc.congThuong))}</div>
              {Number(dc.congTangCa) > 0 && (
                <div style={{ color: '#0033CC', fontSize: 11 }}>
                  <ClockCircleOutlined style={{ marginRight: 2 }} />+{fmt2(Number(dc.congTangCa))}
                </div>
              )}
            </div>
          </Tooltip>
        )
      },
    }))

    const summaryCols = [
      {
        title: 'Công Thường', key: 'ct', width: 100, align: 'right', fixed: 'right',
        render: (_, r) => <strong style={{ color: '#0033CC' }}>{fmt2(Number(r.tongCongThuong))}</strong>,
      },
      {
        title: 'Tăng Ca', key: 'tc', width: 85, align: 'right', fixed: 'right',
        render: (_, r) => Number(r.tongCongTangCa) > 0
          ? <strong style={{ color: '#0033CC' }}>{fmt2(Number(r.tongCongTangCa))}</strong>
          : <span style={{ color: '#e0e0e0' }}>—</span>,
      },
      {
        title: 'Tổng Công', key: 'tong', width: 100, align: 'right', fixed: 'right',
        render: (_, r) => (
          <strong style={{ color: '#0033CC', fontSize: 14 }}>{fmt2(Number(r.tongCong))}</strong>
        ),
      },
    ]

    return [...fixedCols, ...dayCols, ...summaryCols]
  }, [dateList])

  // ── Summary row ───────────────────────────────────────────────────
  const empSummary = (pageData) => {
    const totCT = pageData.reduce((s, r) => s + Number(r.tongCongThuong || 0), 0)
    const totTC = pageData.reduce((s, r) => s + Number(r.tongCongTangCa || 0), 0)
    const daySums = {}
    dateList.forEach(d => {
      daySums[d] = { ct: 0, tc: 0 }
      pageData.forEach(r => {
        const dc = r.ngayData?.[d]
        if (dc) { daySums[d].ct += Number(dc.congThuong || 0); daySums[d].tc += Number(dc.congTangCa || 0) }
      })
    })
    return (
      <Table.Summary fixed="bottom">
        <Table.Summary.Row>
          <Table.Summary.Cell index={0} colSpan={3} align="center">
            <strong style={{ color: '#ffffff' }}>TỔNG TRANG ({pageData.length} NV)</strong>
          </Table.Summary.Cell>
          {dateList.map((d, i) => (
            <Table.Summary.Cell key={d} index={i + 3} align="center">
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontWeight: 700, color: '#ffffff', fontSize: 11 }}>{fmt2(daySums[d].ct)}</div>
                {daySums[d].tc > 0 && <div style={{ color: '#ffffff', fontSize: 10 }}>+{fmt2(daySums[d].tc)}</div>}
              </div>
            </Table.Summary.Cell>
          ))}
          <Table.Summary.Cell index={dateList.length + 3} align="right">
            <strong style={{ color: '#ffffff' }}>{fmt2(totCT)}</strong>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={dateList.length + 4} align="right">
            <strong style={{ color: '#ffffff' }}>{fmt2(totTC)}</strong>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={dateList.length + 5} align="right">
            <strong style={{ color: '#ffffff', fontSize: 13 }}>{fmt2(totCT + totTC)}</strong>
          </Table.Summary.Cell>
        </Table.Summary.Row>
      </Table.Summary>
    )
  }

  const deptSummary = (pageData) => {
    const totCT = pageData.reduce((s, r) => s + Number(r.tongCongThuong || 0), 0)
    const totTC = pageData.reduce((s, r) => s + Number(r.tongCongTangCa || 0), 0)
    return (
      <Table.Summary fixed="bottom">
        <Table.Summary.Row>
          <Table.Summary.Cell index={0} align="center">
            <strong style={{ color: '#ffffff' }}>TỔNG</strong>
          </Table.Summary.Cell>
          {dateList.map((_, i) => (
            <Table.Summary.Cell key={i} index={i + 1} />
          ))}
          <Table.Summary.Cell index={dateList.length + 1} align="right">
            <strong style={{ color: '#ffffff' }}>{fmt2(totCT)}</strong>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={dateList.length + 2} align="right">
            <strong style={{ color: '#ffffff' }}>{fmt2(totTC)}</strong>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={dateList.length + 3} align="right">
            <strong style={{ color: '#ffffff', fontSize: 14 }}>{fmt2(totCT + totTC)}</strong>
          </Table.Summary.Cell>
        </Table.Summary.Row>
      </Table.Summary>
    )
  }

  const tabItems = [
    {
      key: 'nhanvien',
      label: <span><TeamOutlined style={{ marginRight: 4 }} />Chấm Công Nhân Viên</span>,
      children: (
        <Table
          className="chamcong-table"
          columns={empColumns}
          dataSource={empRows}
          rowKey="maNhanVien"
          loading={loading}
          size="small"
          scroll={{ x: Math.max(500 + dateList.length * 75, 900) }}
          sticky={{ offsetHeader: stickyH + tabBarH }}
          pagination={{ defaultPageSize: 50, showSizeChanger: true, pageSizeOptions: ['25','50','100'], showTotal: t => `${t} nhân viên` }}
          summary={empSummary}
          rowClassName={(_, i) => i % 2 !== 0 ? 'row-alt' : ''}
        />
      ),
    },
    {
      key: 'bophan',
      label: <span><ApartmentOutlined style={{ marginRight: 4 }} />Tổng Hợp Bộ Phận</span>,
      children: (
        <Table
          className="chamcong-table"
          columns={deptColumns}
          dataSource={deptRows}
          rowKey="boPhan"
          loading={loading}
          size="small"
          scroll={{ x: Math.max(300 + dateList.length * 90, 700) }}
          sticky={{ offsetHeader: stickyH + tabBarH }}
          pagination={false}
          summary={deptSummary}
          rowClassName={(_, i) => i % 2 !== 0 ? 'row-alt' : ''}
        />
      ),
    },
  ]

  return (
    <>
      {/* ── Sticky toolbar ── */}
      <div
        ref={stickyRef}
        style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: '#fff', borderBottom: '2px solid #D0D5DC',
          padding: '8px 0 10px', marginBottom: 12,
        }}
      >
        {/* Row 1: tiêu đề + bộ lọc */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontWeight: 700, color: '#1D4ED8', fontSize: 15, whiteSpace: 'nowrap' }}>
            <FileDoneOutlined style={{ marginRight: 6, color: '#1D4ED8' }} />
            Bảng Chấm Công
          </span>

          {/* Period quick-select */}
          <div style={{ display: 'flex', gap: 4, background: '#EAECF2', borderRadius: 6, padding: '3px 4px' }}>
            {PERIOD_OPTS.map(p => (
              <button key={p.key} onClick={() => handlePeriod(p.key)} style={{
                border: 'none', borderRadius: 5, padding: '3px 12px', cursor: 'pointer', fontSize: 12,
                background: period === p.key ? '#1D4ED8' : 'transparent',
                color: period === p.key ? '#fff' : '#475569',
                fontWeight: period === p.key ? 700 : 400,
                transition: 'all 0.15s',
              }}>{p.label}</button>
            ))}
          </div>

          <RangePicker
            size="small" value={dateRange}
            onChange={v => { if (v) { setDateRange(v); setPeriod('custom') } }}
            format="DD/MM/YYYY" allowClear={false}
          />

          <Select
            size="small" placeholder="Bộ phận" allowClear style={{ width: 120 }}
            value={deptFilter} onChange={setDeptFilter}
            options={DEPTS.map(d => ({ value: d, label: d }))}
          />

          <Button size="small" type="primary" icon={<SearchOutlined />}
            style={{ background: '#1D4ED8', borderColor: '#1D4ED8' }}
            onClick={() => fetchData()}>
            Truy xuất
          </Button>
          <Button size="small" icon={<ReloadOutlined />} onClick={handleReset} />

          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#888' }}>
            {dateRange[0].format('DD/MM')} – {dateRange[1].format('DD/MM/YYYY')} ·{' '}
            <strong style={{ color: '#1D4ED8' }}>{dateList.length}</strong> ngày ·{' '}
            <strong style={{ color: '#1D4ED8' }}>{empRows.length}</strong> nhân viên
          </span>
        </div>

      </div>

      {/* ── CSS ── */}
      <style>{`
        .chamcong-tabs > .ant-tabs-nav { margin: 0 !important; background: #66CCCC; padding: 0 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
        .chamcong-tabs > .ant-tabs-nav .ant-tabs-tab { color: #ffffff !important; font-size: 13px; padding: 9px 18px !important; margin: 0 2px !important; border-radius: 6px 6px 0 0; transition: all 0.2s; }
        .chamcong-tabs > .ant-tabs-nav .ant-tabs-tab:hover { color: #fff !important; background: rgba(255,255,255,0.2) !important; }
        .chamcong-tabs > .ant-tabs-nav .ant-tabs-tab-active { color: #fff !important; background: rgba(255,255,255,0.25) !important; font-weight: 700; box-shadow: 0 -3px 0 #ffffff inset; }
        .chamcong-tabs > .ant-tabs-nav .ant-tabs-ink-bar { background: #ffffff !important; height: 3px !important; border-radius: 2px; }
        .chamcong-tabs > .ant-tabs-nav::before { border-bottom: none !important; }

        .chamcong-table .ant-table-thead > tr > th {
          background: #66CCCC !important;
          color: #ffffff !important; text-align: center !important;
          font-size: 11px !important; text-transform: uppercase; letter-spacing: 0.3px;
          padding: 7px 6px !important; border-right: 1px solid #88DDDD !important; white-space: nowrap;
        }
        .chamcong-table .ant-table-thead > tr > th::before { display: none !important; }
        .chamcong-table .ant-table-thead > tr:first-child > th {
          background: #66CCCC !important;
          font-size: 12px !important; font-weight: 700 !important;
        }
        .chamcong-table .ant-table-tbody > tr > td { padding: 5px 6px !important; border-bottom: 1px solid #EAECF2 !important; }
        .chamcong-table .ant-table-tbody > tr.row-alt > td { background: #EAECF2; }
        .chamcong-table .ant-table-tbody > tr:hover > td { background: #DDE1E8 !important; }
        .chamcong-table .ant-table-summary > tr > td {
          background: #66CCCC !important;
          color: #ffffff !important; font-weight: 700; padding: 6px 6px !important;
        }
        .chamcong-table .ant-table-body::-webkit-scrollbar { height: 5px; }
        .chamcong-table .ant-table-body::-webkit-scrollbar-track { background: #f0f4f8; border-radius: 4px; }
        .chamcong-table .ant-table-body::-webkit-scrollbar-thumb { background: #66CCCC; border-radius: 4px; }
        .chamcong-table .ant-table-body::-webkit-scrollbar-thumb:hover { background: #44AAAA; }
      `}</style>

      {/* ── Tabs ── */}
      <Tabs
        className="chamcong-tabs"
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        type="line"
        size="middle"
        tabBarStyle={{ position: 'sticky', top: stickyH, zIndex: 9, margin: 0 }}
        tabBarExtraContent={
          <span style={{ paddingRight: 12, color: '#ffffff', fontSize: 12, fontWeight: 600 }}>
            Bảng Chấm Công Sản Xuất
          </span>
        }
      />
    </>
  )
}
