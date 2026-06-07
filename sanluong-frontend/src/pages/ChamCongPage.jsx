import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  Table, Button, Typography, message, DatePicker, Select,
  Tabs, Tag, Tooltip, Badge, Statistic
} from 'antd'
import {
  SearchOutlined, ReloadOutlined, FileDoneOutlined,
  TeamOutlined, ClockCircleOutlined, RiseOutlined, ApartmentOutlined, LoginOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import api from '../api/axios'

dayjs.extend(isoWeek)

const { RangePicker } = DatePicker

const DEPTS = ['PC', 'PL', 'DG', 'BBC1', 'PCPL1', 'PCPL2', 'PCPL3']
const TIME_DEPTS = ['DG', 'BBC1', 'PCPL1', 'PCPL2', 'PCPL3']
const TIME_DEPT_LABEL = { DG: 'ĐG' }
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
  const [timeRows, setTimeRows] = useState([])
  const [allEmps, setAllEmps]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [timeLoading, setTimeLoading] = useState(false)

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

  useEffect(() => {
    fetchData()
    api.get('/employees', { params: { page: 0, size: 500 } })
      .then(r => setAllEmps(r.data.content || []))
      .catch(() => {})
  }, []) // eslint-disable-line

  const fetchTimeEntries = useCallback(async (range = dateRange) => {
    setTimeLoading(true)
    try {
      const from = range[0].format('YYYY-MM-DD')
      const to   = range[1].format('YYYY-MM-DD')
      const r = await api.get('/attendance/time-entries', { params: { fromDate: from, toDate: to } })
      setTimeRows(r.data)
    } catch {
      message.error('Không thể tải dữ liệu giờ ra/vào')
    } finally {
      setTimeLoading(false)
    }
  }, [dateRange])

  const handleTabChange = (key) => {
    setActiveTab(key)
    if (key === 'congravao') fetchTimeEntries()
  }

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

  // ── Pivot timeRows → 1 hàng/nhân viên (toàn bộ danh sách nhân sự, điền ngayData nếu có) ──
  const timeEmpRows = useMemo(() => {
    const pivot = {}
    const baseList = allEmps.length > 0 ? allEmps : empRows
    baseList.forEach(e => {
      pivot[e.maNhanVien] = { maNhanVien: e.maNhanVien, hoVaTen: e.hoVaTen, toNhom: e.toNhom || '', ngayData: {} }
    })
    timeRows.forEach(t => {
      if (!pivot[t.maNhanVien]) {
        pivot[t.maNhanVien] = { maNhanVien: t.maNhanVien, hoVaTen: t.maNhanVien, toNhom: '', ngayData: {} }
      }
      pivot[t.maNhanVien].ngayData[t.ngay] = t
    })
    return Object.values(pivot).sort((a, b) => (a.maNhanVien || '').localeCompare(b.maNhanVien || ''))
  }, [timeRows, empRows, allEmps])

  // ── Cột bảng Công Ra Vào ─────────────────────────────────────────
  const timeColumns = useMemo(() => {
    const calcCong = r => {
      if (!r.gioVao || !r.gioRa || !r.caThucHien) return 0
      const soGio = (dayjs(`2000-01-01T${r.gioRa}`).diff(dayjs(`2000-01-01T${r.gioVao}`), 'minute') - 60) / 60
      if (soGio <= 0) return 0
      return r.caThucHien === 'HC' ? soGio / 8 : soGio <= 7 ? soGio / 7 : 1 + (soGio - 7) / 8
    }
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
        render: v => v ? <Tag color={DEPT_COLOR[v] || 'default'} style={{ margin: 0, fontSize: 11 }}>{v}</Tag> : '—',
      },
    ]
    const dayCols = dateList.map(date => ({
      title: (
        <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
          <div style={{ fontSize: 10 }}>{dayjs(date).format('ddd')}</div>
          <div style={{ fontSize: 12 }}>{dayjs(date).format('DD/MM')}</div>
        </div>
      ),
      key: date, width: 90, align: 'center',
      render: (_, r) => {
        const t = r.ngayData?.[date]
        if (!t) return <span style={{ color: '#e0e0e0', fontSize: 12 }}>—</span>
        const cong = calcCong(t)
        return (
          <Tooltip title={`${t.gioVao ? t.gioVao.slice(0,5) : '?'} → ${t.gioRa ? t.gioRa.slice(0,5) : '?'} | Ca: ${t.caThucHien || '?'} | Công: ${cong.toFixed(4)}`}>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: 11, color: '#1D4ED8' }}>{t.gioVao ? t.gioVao.slice(0,5) : '—'}</div>
              <div style={{ fontSize: 11, color: '#059669' }}>{t.gioRa ? t.gioRa.slice(0,5) : '—'}</div>
            </div>
          </Tooltip>
        )
      },
    }))
    const summaryCols = [
      {
        title: 'Tổng Công', key: 'tongcong', width: 95, align: 'right', fixed: 'right',
        render: (_, r) => {
          const total = Object.values(r.ngayData || {}).reduce((s, t) => s + calcCong(t), 0)
          return <span style={{ color: '#0033CC', fontSize: 13 }}>{fmt2(total)}</span>
        },
        sorter: (a, b) => {
          const s = r => Object.values(r.ngayData || {}).reduce((s, t) => s + calcCong(t), 0)
          return s(a) - s(b)
        },
        defaultSortOrder: 'descend',
      },
    ]
    return [...fixedCols, ...dayCols, ...summaryCols]
  }, [dateList, timeEmpRows])

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
          <div style={{ fontSize: 12 }}>{dayjs(date).format('DD/MM')}</div>
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
              <div style={{ color: '#0033CC', fontSize: 12 }}>
                {fmt2(Number(dc.congThuong))}
              </div>
              {Number(dc.congTangCa) > 0 && (
                <div style={{ color: '#0033CC', fontSize: 11 }}>
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
        render: (_, r) => <span style={{ color: '#0033CC' }}>{fmt2(Number(r.tongCongThuong))}</span>,
        sorter: (a, b) => Number(a.tongCongThuong) - Number(b.tongCongThuong),
      },
      {
        title: 'Tăng Ca', key: 'tc', width: 80, align: 'right', fixed: 'right',
        render: (_, r) => Number(r.tongCongTangCa) > 0
          ? <span style={{ color: '#0033CC' }}>{fmt2(Number(r.tongCongTangCa))}</span>
          : <span style={{ color: '#e0e0e0' }}>—</span>,
        sorter: (a, b) => Number(a.tongCongTangCa) - Number(b.tongCongTangCa),
      },
      {
        title: 'Tổng Công', key: 'tong', width: 95, align: 'right', fixed: 'right',
        render: (_, r) => (
          <span style={{ color: '#0033CC', fontSize: 13 }}>
            {fmt2(Number(r.tongCong))}
          </span>
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
          <div style={{ fontSize: 12 }}>{dayjs(date).format('DD/MM')}</div>
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
              <div style={{ color: '#0033CC', fontSize: 13 }}>{fmt2(Number(dc.congThuong))}</div>
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
        render: (_, r) => <span style={{ color: '#0033CC' }}>{fmt2(Number(r.tongCongThuong))}</span>,
      },
      {
        title: 'Tăng Ca', key: 'tc', width: 85, align: 'right', fixed: 'right',
        render: (_, r) => Number(r.tongCongTangCa) > 0
          ? <span style={{ color: '#0033CC' }}>{fmt2(Number(r.tongCongTangCa))}</span>
          : <span style={{ color: '#e0e0e0' }}>—</span>,
      },
      {
        title: 'Tổng Công', key: 'tong', width: 100, align: 'right', fixed: 'right',
        render: (_, r) => (
          <span style={{ color: '#0033CC', fontSize: 14 }}>{fmt2(Number(r.tongCong))}</span>
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
            <span style={{ color: '#0000CC' }}>TỔNG TRANG ({pageData.length} NV)</span>
          </Table.Summary.Cell>
          {dateList.map((d, i) => (
            <Table.Summary.Cell key={d} index={i + 3} align="center">
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ color: '#0000CC', fontSize: 11 }}>{fmt2(daySums[d].ct)}</div>
                {daySums[d].tc > 0 && <div style={{ color: '#0000CC', fontSize: 10 }}>+{fmt2(daySums[d].tc)}</div>}
              </div>
            </Table.Summary.Cell>
          ))}
          <Table.Summary.Cell index={dateList.length + 3} align="right">
            <span style={{ color: '#0000CC' }}>{fmt2(totCT)}</span>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={dateList.length + 4} align="right">
            <span style={{ color: '#0000CC' }}>{fmt2(totTC)}</span>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={dateList.length + 5} align="right">
            <span style={{ color: '#0000CC', fontSize: 13 }}>{fmt2(totCT + totTC)}</span>
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
            <span style={{ color: '#0000CC' }}>TỔNG</span>
          </Table.Summary.Cell>
          {dateList.map((_, i) => (
            <Table.Summary.Cell key={i} index={i + 1} />
          ))}
          <Table.Summary.Cell index={dateList.length + 1} align="right">
            <span style={{ color: '#0000CC' }}>{fmt2(totCT)}</span>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={dateList.length + 2} align="right">
            <span style={{ color: '#0000CC' }}>{fmt2(totTC)}</span>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={dateList.length + 3} align="right">
            <span style={{ color: '#0000CC', fontSize: 14 }}>{fmt2(totCT + totTC)}</span>
          </Table.Summary.Cell>
        </Table.Summary.Row>
      </Table.Summary>
    )
  }

  const [deptActiveTab, setDeptActiveTab] = useState('all')
  const [timeActiveTab, setTimeActiveTab] = useState('all')

  const empByDept = useMemo(() => {
    const map = { all: empRows }
    TIME_DEPTS.forEach(d => { map[d] = empRows.filter(r => r.toNhom === d) })
    return map
  }, [empRows])

  const timeByDept = useMemo(() => {
    const map = { all: timeEmpRows }
    TIME_DEPTS.forEach(d => { map[d] = timeEmpRows.filter(r => r.toNhom === d) })
    return map
  }, [timeEmpRows])

  const deptSubTabs = useMemo(() => [
    {
      key: 'all',
      label: <span>Tất Cả ({empRows.length})</span>,
      children: (
        <Table
          className="chamcong-table"
          columns={empColumns}
          dataSource={empRows}
          rowKey="maNhanVien"
          loading={loading}
          size="small"
          scroll={{ x: Math.max(500 + dateList.length * 75, 900) }}
          sticky={{ offsetHeader: stickyH + tabBarH + 40 }}
          pagination={{ defaultPageSize: 50, showSizeChanger: true, pageSizeOptions: ['25','50','100'], showTotal: t => `${t} nhân viên` }}
          summary={empSummary}
          rowClassName={(_, i) => i % 2 !== 0 ? 'row-alt' : ''}
        />
      ),
    },
    ...TIME_DEPTS.map(dept => {
      const rows = empByDept[dept] || []
      const label = TIME_DEPT_LABEL[dept] || dept
      return {
        key: dept,
        label: (
          <span>
            <Tag color={DEPT_COLOR[dept] || 'default'} style={{ margin: 0, marginRight: 4, fontSize: 11 }}>{label}</Tag>
            <small style={{ color: '#666' }}>({rows.length})</small>
          </span>
        ),
        children: rows.length === 0 ? (
          <div style={{ padding: '32px 24px', color: '#bbb', textAlign: 'center' }}>Không có dữ liệu</div>
        ) : (
          <Table
            className="chamcong-table"
            columns={empColumns}
            dataSource={rows}
            rowKey="maNhanVien"
            loading={loading}
            size="small"
            scroll={{ x: Math.max(500 + dateList.length * 75, 900) }}
            sticky={{ offsetHeader: stickyH + tabBarH + 40 }}
            pagination={{ defaultPageSize: 50, showSizeChanger: true, pageSizeOptions: ['25','50','100'], showTotal: t => `${t} nhân viên` }}
            summary={empSummary}
            rowClassName={(_, i) => i % 2 !== 0 ? 'row-alt' : ''}
          />
        ),
      }
    }),
  ], [empRows, empByDept, empColumns, loading, dateList, stickyH, tabBarH, empSummary])

  const timeSubTabs = useMemo(() => [
    {
      key: 'all',
      label: <span>Tất Cả ({timeEmpRows.length})</span>,
      children: (
        <Table
          className="chamcong-table"
          loading={timeLoading}
          dataSource={timeEmpRows}
          rowKey="maNhanVien"
          size="small"
          scroll={{ x: Math.max(340 + dateList.length * 90, 700) }}
          sticky={{ offsetHeader: stickyH + tabBarH + 40 }}
          pagination={{ pageSize: 50, showSizeChanger: true, pageSizeOptions: ['50','100','200'], showTotal: t => `${t} nhân viên` }}
          rowClassName={(_, i) => i % 2 !== 0 ? 'row-alt' : ''}
          locale={{ emptyText: 'Chưa có dữ liệu giờ ra/vào' }}
          columns={timeColumns}
        />
      ),
    },
    ...TIME_DEPTS.map(dept => {
      const rows = timeByDept[dept] || []
      const label = TIME_DEPT_LABEL[dept] || dept
      return {
        key: dept,
        label: (
          <span>
            <Tag color={DEPT_COLOR[dept] || 'default'} style={{ margin: 0, marginRight: 4, fontSize: 11 }}>{label}</Tag>
            <small style={{ color: '#666' }}>({rows.length})</small>
          </span>
        ),
        children: rows.length === 0 ? (
          <div style={{ padding: '32px 24px', color: '#bbb', textAlign: 'center' }}>Không có dữ liệu</div>
        ) : (
          <Table
            className="chamcong-table"
            loading={timeLoading}
            dataSource={rows}
            rowKey="maNhanVien"
            size="small"
            scroll={{ x: Math.max(340 + dateList.length * 90, 700) }}
            sticky={{ offsetHeader: stickyH + tabBarH + 40 }}
            pagination={{ pageSize: 50, showSizeChanger: true, pageSizeOptions: ['50','100','200'], showTotal: t => `${t} nhân viên` }}
            rowClassName={(_, i) => i % 2 !== 0 ? 'row-alt' : ''}
            locale={{ emptyText: 'Chưa có dữ liệu giờ ra/vào' }}
            columns={timeColumns}
          />
        ),
      }
    }),
  ], [timeEmpRows, timeByDept, timeColumns, timeLoading, dateList, stickyH, tabBarH])

  const tabItems = [
    {
      key: 'nhanvien',
      label: <span><TeamOutlined style={{ marginRight: 4 }} />Công Sản Xuất</span>,
      children: (
        <>
          <style>{`
            .dept-sub-tabs > .ant-tabs-nav { background: #f7fdfd; border-bottom: 2px solid #33CCCC; padding: 0 8px; }
            .dept-sub-tabs > .ant-tabs-nav .ant-tabs-tab { font-size: 12px; padding: 6px 14px !important; margin: 0 2px !important; }
            .dept-sub-tabs > .ant-tabs-nav .ant-tabs-tab:hover { color: #FFFF00 !important; }
            .dept-sub-tabs > .ant-tabs-nav .ant-tabs-tab:hover small { color: #FFFF00 !important; }
            .dept-sub-tabs > .ant-tabs-nav .ant-tabs-tab-active { background: #FFCC33 !important; border-radius: 4px 4px 0 0; }
            .dept-sub-tabs > .ant-tabs-nav .ant-tabs-ink-bar { background: #33CCCC !important; height: 2px !important; }
            .dept-sub-tabs > .ant-tabs-nav::before { border-bottom: none !important; }
            .dept-sub-tabs > .ant-tabs-content-holder { padding-top: 0; }
          `}</style>
          <Tabs
            className="dept-sub-tabs"
            activeKey={deptActiveTab}
            onChange={setDeptActiveTab}
            size="small"
            items={deptSubTabs}
            tabBarStyle={{ position: 'sticky', top: stickyH + tabBarH, zIndex: 8, margin: 0 }}
          />
        </>
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
    {
      key: 'congravao',
      label: <span><LoginOutlined style={{ marginRight: 4 }} />Công Ra Vào</span>,
      children: (
        <>
          <style>{`
            .time-sub-tabs > .ant-tabs-nav { background: #f7fdfd; border-bottom: 2px solid #33CCCC; padding: 0 8px; }
            .time-sub-tabs > .ant-tabs-nav .ant-tabs-tab { font-size: 12px; padding: 6px 14px !important; margin: 0 2px !important; }
            .time-sub-tabs > .ant-tabs-nav .ant-tabs-tab:hover { color: #FFFF00 !important; }
            .time-sub-tabs > .ant-tabs-nav .ant-tabs-tab:hover small { color: #FFFF00 !important; }
            .time-sub-tabs > .ant-tabs-nav .ant-tabs-tab-active { background: #FFCC33 !important; border-radius: 4px 4px 0 0; }
            .time-sub-tabs > .ant-tabs-nav .ant-tabs-ink-bar { background: #33CCCC !important; height: 2px !important; }
            .time-sub-tabs > .ant-tabs-nav::before { border-bottom: none !important; }
            .time-sub-tabs > .ant-tabs-content-holder { padding-top: 0; }
          `}</style>
          <Tabs
            className="time-sub-tabs"
            activeKey={timeActiveTab}
            onChange={setTimeActiveTab}
            size="small"
            items={timeSubTabs}
            tabBarStyle={{ position: 'sticky', top: stickyH + tabBarH, zIndex: 8, margin: 0 }}
          />
        </>
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
        .chamcong-tabs > .ant-tabs-nav .ant-tabs-tab { color: #0000CC !important; font-size: 13px; padding: 9px 18px !important; margin: 0 2px !important; border-radius: 6px 6px 0 0; transition: all 0.2s; }
        .chamcong-tabs > .ant-tabs-nav .ant-tabs-tab:hover { color: #0000CC !important; background: rgba(255,255,255,0.2) !important; }
        .chamcong-tabs > .ant-tabs-nav .ant-tabs-tab-active { color: #0000CC !important; background: #FFCC33 !important; font-weight: 400; box-shadow: 0 -3px 0 #0000CC inset; }
        .chamcong-tabs > .ant-tabs-nav .ant-tabs-ink-bar { background: #0000CC !important; height: 3px !important; border-radius: 2px; }
        .chamcong-tabs > .ant-tabs-nav::before { border-bottom: none !important; }

        .chamcong-table .ant-table-thead > tr > th {
          background: #66CCCC !important;
          color: #0000CC !important; text-align: center !important;
          font-size: 11px !important; text-transform: uppercase; letter-spacing: 0.3px;
          padding: 7px 6px !important; border-right: 1px solid #88DDDD !important; white-space: nowrap;
        }
        .chamcong-table .ant-table-thead > tr > th::before { display: none !important; }
        .chamcong-table .ant-table-thead > tr:first-child > th {
          background: #66CCCC !important;
          font-size: 12px !important; font-weight: 400 !important;
        }
        .chamcong-table .ant-table-tbody > tr > td { padding: 5px 6px !important; border-bottom: 1px solid #EAECF2 !important; }
        .chamcong-table .ant-table-tbody > tr.row-alt > td { background: #EAECF2; }
        .chamcong-table .ant-table-tbody > tr:hover > td { background: #DDE1E8 !important; }
        .chamcong-table .ant-table-summary > tr > td {
          background: #66CCCC !important;
          color: #0000CC !important; font-weight: 400; padding: 6px 6px !important;
        }
        .chamcong-table .ant-table-body::-webkit-scrollbar { height: 3px; }
        .chamcong-table .ant-table-body::-webkit-scrollbar-track { background: #f0f4f8; border-radius: 4px; }
        .chamcong-table .ant-table-body::-webkit-scrollbar-thumb { background: #66CCCC; border-radius: 4px; }
        .chamcong-table .ant-table-body::-webkit-scrollbar-thumb:hover { background: #44AAAA; }
      `}</style>

      {/* ── Tabs ── */}
      <Tabs
        className="chamcong-tabs"
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        type="line"
        size="middle"
        tabBarStyle={{ position: 'sticky', top: stickyH, zIndex: 9, margin: 0 }}
        tabBarExtraContent={
          <span style={{ paddingRight: 12, color: '#0000CC', fontSize: 12, fontWeight: 600 }}>
            Bảng Chấm Công Sản Xuất
          </span>
        }
      />
    </>
  )
}
