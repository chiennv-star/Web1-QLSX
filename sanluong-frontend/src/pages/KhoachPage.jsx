import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  DatePicker, Button, Spin, message, Modal, Form,
  Input, InputNumber, Select, Popconfirm, Space, Row, Col, Tooltip, Tag,
} from 'antd'
import {
  SearchOutlined, ReloadOutlined, PlusOutlined,
  EditOutlined, DeleteOutlined, SyncOutlined, CheckCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

dayjs.extend(isoWeek)

const { RangePicker } = DatePicker
const { TextArea } = Input
const { Option } = Select

const DAY_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

const TO_GROUPS = [
  { key: 'PCPL1', label: 'Tổ 1', headerBg: '#237804', headerText: '#fff', bodyBg: '#f6ffed' },
  { key: 'PCPL2', label: 'Tổ 2', headerBg: '#ad6800', headerText: '#fff', bodyBg: '#fffbe6' },
  { key: 'PCPL3', label: 'Tổ 3', headerBg: '#0958d9', headerText: '#fff', bodyBg: '#e6f4ff' },
]

const GROUP_DEFAULT_CD = { PCPL1: 'PC', PCPL2: 'PC', PCPL3: 'PL' }
const CONG_DOAN_LABEL  = { PC: 'PC – Pha chế', BBC1: 'BBC1 – Chiết', PL: 'PL', DG: 'ĐG – Đóng gói', CC: 'CC – Cân chia' }
const CONG_DOAN_PREFIX = { PC: 'Pha chế', BBC1: 'Chiết', PL: 'PL', DG: 'ĐG', CC: 'CC' }
const CONG_FIELD_MAP   = { PC: 'congPc', BBC1: 'congBbc1', PL: 'congPl', DG: 'congDg', CC: 'congCc' }
const CONG_LABEL_MAP   = { PC: 'Công PC', BBC1: 'Công BBC1', PL: 'Công PL', DG: 'Công ĐG', CC: 'Công CC' }

function getDates(from, to) {
  const dates = []
  let cur = dayjs(from)
  const end = dayjs(to)
  while (!cur.isAfter(end)) {
    dates.push(cur.format('YYYY-MM-DD'))
    cur = cur.add(1, 'day')
  }
  return dates
}

function checkUrgent(r) {
  const t = `${r.tenTrinh || ''} ${r.chuY || ''} ${r.saiLech || ''}`.toUpperCase()
  return t.includes('GẤP') || t.includes('GAP')
}

// ── Plan Modal ────────────────────────────────────────────────────────────────
function PlanModal({ open, editItem, defaultToNhom, defaultDate, onClose, onSaved }) {
  const [form] = Form.useForm()
  const [congDoan, setCongDoan] = useState('PC')
  const [lookupStatus, setLookupStatus] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    if (editItem) {
      const cd = editItem.congDoan || GROUP_DEFAULT_CD[editItem.toNhom] || 'PC'
      setCongDoan(cd)
      const congField = CONG_FIELD_MAP[cd]
      form.setFieldsValue({
        ngayThucHien: editItem.ngayThucHien ? dayjs(editItem.ngayThucHien) : null,
        congDoan:  cd,
        toNhom:    editItem.toNhom || defaultToNhom,
        maSp:      editItem.maSp      || '',
        tenTrinh:  editItem.tenTrinh  || '',
        soLo:      editItem.soLo      || '',
        coLo:      editItem.coLo      != null ? Number(editItem.coLo) : null,
        cong:      editItem[congField] != null ? Number(editItem[congField]) : null,
        chuY:      editItem.chuY      || '',
        saiLech:   editItem.saiLech   || '',
        tinhTrang: editItem.tinhTrang || '',
      })
      setLookupStatus(null)
    } else {
      const cd = GROUP_DEFAULT_CD[defaultToNhom] || 'PC'
      setCongDoan(cd)
      form.resetFields()
      form.setFieldsValue({
        ngayThucHien: defaultDate ? dayjs(defaultDate) : dayjs(),
        congDoan: cd,
        toNhom:   defaultToNhom,
      })
      setLookupStatus(null)
    }
  }, [open, editItem])

  const handleMaSpChange = (e) => {
    const val = e.target.value?.trim()
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!val) { setLookupStatus(null); return }
    setLookupStatus('loading')
    timerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/product-master/lookup/${encodeURIComponent(val)}`)
        form.setFieldsValue({ tenTrinh: data.tienTrinh || '' })
        setLookupStatus('found')
      } catch { setLookupStatus('not_found') }
    }, 500)
  }

  const onOk = async () => {
    try {
      const values = await form.validateFields()
      const cd = values.congDoan
      const congField = CONG_FIELD_MAP[cd]
      const base = editItem ? {
        slPc: editItem.slPc, slBbc1: editItem.slBbc1,
        slPl: editItem.slPl, slDg: editItem.slDg,
      } : {}
      const payload = {
        ...base,
        source:    'PLAN',
        ngayThucHien: values.ngayThucHien?.format('YYYY-MM-DD'),
        congDoan:  cd,
        toNhom:    values.toNhom    || null,
        maSp:      values.maSp      || null,
        tenTrinh:  values.tenTrinh  || null,
        soLo:      values.soLo      || null,
        coLo:      values.coLo      ?? null,
        [congField]: values.cong    ?? null,
        chuY:      values.chuY      || null,
        saiLech:   values.saiLech   || null,
        tinhTrang: values.tinhTrang || null,
      }
      if (editItem) {
        await api.put(`/work-schedule/${editItem.id}`, payload)
        message.success('Cập nhật thành công')
      } else {
        await api.post('/work-schedule', payload)
        message.success('Thêm mới thành công')
      }
      onSaved()
      onClose()
    } catch (err) {
      if (err?.response) message.error(err.response.data?.message || 'Lưu thất bại')
    }
  }

  return (
    <Modal
      title={editItem ? 'Chỉnh sửa kế hoạch' : 'Thêm kế hoạch mới'}
      open={open}
      onOk={onOk}
      onCancel={onClose}
      okText="Lưu"
      cancelText="Hủy"
      width={680}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Ngày thực hiện" name="ngayThucHien" rules={[{ required: true, message: 'Chọn ngày' }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Tổ/Nhóm" name="toNhom" rules={[{ required: true }]}>
              <Select>
                {TO_GROUPS.map(g => <Option key={g.key} value={g.key}>{g.label} ({g.key})</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Công đoạn" name="congDoan" rules={[{ required: true }]}>
              <Select onChange={val => setCongDoan(val)}>
                {Object.entries(CONG_DOAN_LABEL).map(([v, l]) =>
                  <Option key={v} value={v}>{l}</Option>
                )}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label={
                <Space size={4}>
                  <span>Mã SP</span>
                  {lookupStatus === 'loading' && <SyncOutlined spin style={{ color: '#1890ff' }} />}
                  {lookupStatus === 'found'   && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  {lookupStatus === 'not_found' && <Tag color="orange" style={{ margin: 0 }}>Nhập tay</Tag>}
                </Space>
              }
              name="maSp"
            >
              <Input onChange={handleMaSpChange} allowClear placeholder="Tự điền tiến trình" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Số lô" name="soLo">
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Cỡ lô" name="coLo">
              <InputNumber style={{ width: '100%' }} min={0} step={100} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Tiến trình" name="tenTrinh" rules={[{ required: true, message: 'Nhập tiến trình' }]}>
          <TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="Tên sản phẩm / quy trình" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label={CONG_LABEL_MAP[congDoan] || 'Công'} name="cong">
              <InputNumber style={{ width: '100%' }} step={0.5} min={0} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Tình trạng" name="tinhTrang">
              <Select allowClear placeholder="Chọn">
                <Option value="gap">🟣 Gấp</Option>
                <Option value="rat_gap">🔴 Rất gấp</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Chú ý" name="chuY">
          <TextArea rows={2} />
        </Form.Item>

        <Form.Item label="Sai lệch / GẤP" name="saiLech">
          <TextArea rows={2} placeholder="Ghi GẤP hoặc nội dung sai lệch nếu có…"
            style={{ borderColor: '#fa8c16' }} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ── Task item (read mode) ─────────────────────────────────────────────────────
function TaskItem({ record, onEdit, onDelete, bodyBg, canEdit }) {
  const prefix    = CONG_DOAN_PREFIX[record.congDoan] || ''
  const coLo      = record.coLo != null ? Number(record.coLo).toLocaleString('vi-VN') : ''
  const congField = CONG_FIELD_MAP[record.congDoan]
  const cong      = congField ? record[congField] : null
  const congStr   = cong != null ? `(${Math.round(Number(cong))})` : ''
  const isRatGap  = record.tinhTrang === 'rat_gap'
  const isGap     = record.tinhTrang === 'gap'
  const textColor = isRatGap ? '#cf1322' : isGap ? '#531dab' : '#262626'
  const prefixColor = isRatGap ? '#cf1322' : isGap ? '#531dab' : '#389e0d'

  return (
    <div style={{
      position: 'relative',
      padding: '3px 52px 3px 0',
      borderBottom: '1px dashed #e8e8e8',
      lineHeight: 1.45,
      color: textColor,
    }}>
      <span style={{ color: prefixColor, fontWeight: 600, fontSize: 11 }}>
        {prefix}{' '}
      </span>
      {coLo && <span style={{ fontWeight: 700 }}>{coLo} </span>}
      <span>{record.tenTrinh || ''}</span>
      {record.soLo && <span style={{ color: '#8c8c8c', fontSize: 11 }}> – {record.soLo}</span>}
      {congStr && <span style={{ color: '#8c8c8c', fontSize: 11 }}> {congStr}</span>}
      {isRatGap && (
        <Tag color="red" style={{ marginLeft: 4, fontSize: 10, padding: '0 3px', lineHeight: '15px', height: 15, verticalAlign: 'middle' }}>
          Rất gấp
        </Tag>
      )}
      {isGap && (
        <Tag color="purple" style={{ marginLeft: 4, fontSize: 10, padding: '0 3px', lineHeight: '15px', height: 15, verticalAlign: 'middle' }}>
          Gấp
        </Tag>
      )}
      {record.chuY && (
        <div style={{ color: '#d46b08', fontSize: 11, marginTop: 1 }}>⚠ {record.chuY}</div>
      )}
      {/* ── Action buttons — only for ADMIN / ADMIN_KH ── */}
      {canEdit && (
        <span style={{ position: 'absolute', top: 2, right: 0, display: 'flex', gap: 2 }}>
          <Tooltip title="Sửa">
            <Button
              size="small" type="text"
              icon={<EditOutlined style={{ fontSize: 11 }} />}
              style={{ padding: '0 3px', height: 20, color: '#1677ff' }}
              onClick={() => onEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa kế hoạch này?"
            okText="Xóa" cancelText="Hủy"
            onConfirm={() => onDelete(record.id)}
          >
            <Tooltip title="Xóa">
              <Button
                size="small" type="text" danger
                icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                style={{ padding: '0 3px', height: 20 }}
              />
            </Tooltip>
          </Popconfirm>
        </span>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function KhoachPage() {
  const { canEditPlan } = useAuth()
  const canEdit = canEditPlan()

  const defaultFrom = dayjs().startOf('isoWeek')
  const defaultTo   = defaultFrom.add(13, 'day')

  const [dateRange, setDateRange] = useState(() => {
    try {
      const saved = localStorage.getItem('khoach_date_range')
      if (saved) {
        const [f, t] = JSON.parse(saved)
        return [dayjs(f), dayjs(t)]
      }
    } catch {}
    return [defaultFrom, defaultTo]
  })
  const [data, setData]     = useState([])
  const [loading, setLoading] = useState(false)
  const [collapsedWeeks, setCollapsedWeeks] = useState(() => {
    try {
      const saved = localStorage.getItem('khoach_collapsed_weeks')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })

  useEffect(() => {
    if (dateRange?.[0] && dateRange?.[1]) {
      localStorage.setItem('khoach_date_range', JSON.stringify([
        dateRange[0].format('YYYY-MM-DD'),
        dateRange[1].format('YYYY-MM-DD'),
      ]))
    }
  }, [dateRange])

  useEffect(() => {
    localStorage.setItem('khoach_collapsed_weeks', JSON.stringify([...collapsedWeeks]))
  }, [collapsedWeeks])

  const [modalOpen, setModalOpen]         = useState(false)
  const [editItem, setEditItem]           = useState(null)
  const [defaultToNhom, setDefaultToNhom] = useState(null)
  const [defaultDate, setDefaultDate]     = useState(null)

  const fetchData = useCallback(async (range = dateRange) => {
    if (!range?.[0] || !range?.[1]) return
    setLoading(true)
    try {
      const { data: res } = await api.get('/work-schedule', {
        params: {
          page: 0, size: 1000, source: 'PLAN',
          fromDate: range[0].format('YYYY-MM-DD'),
          toDate:   range[1].format('YYYY-MM-DD'),
        },
      })
      setData(res.content || [])
    } catch {
      message.error('Không thể tải dữ liệu kế hoạch')
    } finally { setLoading(false) }
  }, [dateRange])

  useEffect(() => { fetchData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = (toNhom, date = null) => {
    setEditItem(null)
    setDefaultToNhom(toNhom)
    setDefaultDate(date)
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditItem(record)
    setDefaultToNhom(record.toNhom)
    setDefaultDate(record.ngayThucHien)
    setModalOpen(true)
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/work-schedule/${id}`)
      message.success('Đã xóa')
      fetchData()
    } catch { message.error('Xóa thất bại') }
  }

  const addNextWeek = () => {
    const newEnd = dateRange?.[1]
      ? dayjs(dateRange[1]).add(7, 'day')
      : dayjs().add(7, 'day')
    const newRange = [dateRange?.[0] || dayjs(), newEnd]
    setDateRange(newRange)
    fetchData(newRange)
  }

  const toggleWeek = (weekIdx) => {
    setCollapsedWeeks(prev => {
      const next = new Set(prev)
      if (next.has(weekIdx)) next.delete(weekIdx)
      else next.add(weekIdx)
      return next
    })
  }

  const dates = dateRange?.[0] && dateRange?.[1] ? getDates(dateRange[0], dateRange[1]) : []

  // Split dates into weekly chunks (up to 7 days each)
  const weekChunks = []
  for (let i = 0; i < dates.length; i += 7) {
    weekChunks.push({
      weekIdx: Math.floor(i / 7),
      dates: dates.slice(i, Math.min(i + 7, dates.length)),
    })
  }

  // Total visible column count — collapsed weeks take zero space
  const totalCols = weekChunks.reduce((sum, wk) =>
    collapsedWeeks.has(wk.weekIdx) ? sum : sum + wk.dates.length, 0)

  const hiddenWeeks = weekChunks.filter(wk => collapsedWeeks.has(wk.weekIdx))

  const baseCell = { border: '1px solid #d9d9d9', padding: '4px 6px', verticalAlign: 'top' }

  return (
    <div>
      {/* ── Filter bar ── */}
      <div style={{ marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <RangePicker
          value={dateRange}
          format="DD/MM/YYYY"
          onChange={setDateRange}
          placeholder={['Từ ngày', 'Đến ngày']}
          style={{ width: 280 }}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={() => {
          setCollapsedWeeks(new Set())
          fetchData()
        }}>Tìm</Button>
        <Button icon={<ReloadOutlined />} onClick={() => {
          const r = [defaultFrom, defaultTo]
          setDateRange(r)
          setCollapsedWeeks(new Set())
          fetchData(r)
        }} />
        {weekChunks.length > 0 && (
          <Button onClick={() => setCollapsedWeeks(
            collapsedWeeks.size === weekChunks.length
              ? new Set()
              : new Set(weekChunks.map(wk => wk.weekIdx))
          )}>
            {collapsedWeeks.size === weekChunks.length ? 'Hiện tất cả' : 'Ẩn tất cả'}
          </Button>
        )}
      </div>

      {/* ── Hidden weeks chips ── */}
      {hiddenWeeks.length > 0 && (
        <div style={{ marginBottom: 10, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>Tuần đã ẩn:</span>
          {hiddenWeeks.map(wk => {
            const startStr = dayjs(wk.dates[0]).format('DD/MM')
            const endStr   = dayjs(wk.dates[wk.dates.length - 1]).format('DD/MM')
            return (
              <Tag
                key={wk.weekIdx}
                color="default"
                style={{ cursor: 'pointer', fontSize: 11, userSelect: 'none' }}
                onClick={() => toggleWeek(wk.weekIdx)}
              >
                T{wk.weekIdx + 1} ({startStr}–{endStr}) ▶
              </Tag>
            )
          })}
          <Button size="small" type="link" style={{ fontSize: 11, padding: 0 }}
            onClick={() => setCollapsedWeeks(new Set())}>
            Hiện tất cả
          </Button>
        </div>
      )}

      {loading ? (
        <Spin style={{ display: 'block', margin: '80px auto' }} />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          {TO_GROUPS.map(group => {
            const groupRecs = data.filter(r => r.toNhom === group.key)

            const dateMap = {}
            dates.forEach(d => { dateMap[d] = [] })
            groupRecs.forEach(r => {
              if (r.ngayThucHien && dateMap[r.ngayThucHien] !== undefined)
                dateMap[r.ngayThucHien].push(r)
            })

            const maxRows = Math.max(...dates.map(d => dateMap[d].length), 0)

            return (
              <div key={group.key} style={{ marginBottom: 28 }}>
                <table style={{
                  borderCollapse: 'collapse', fontSize: 12,
                  tableLayout: 'fixed', width: '100%',
                  minWidth: totalCols * 40 + 94,
                }}>
                  <colgroup>
                    <col style={{ width: 36 }} />
                    {weekChunks.map(wk =>
                      collapsedWeeks.has(wk.weekIdx)
                        ? null
                        : wk.dates.map(d => <col key={d} style={{ width: 175 }} />)
                    )}
                    <col style={{ width: 58 }} />
                  </colgroup>

                  <thead>
                    {/* Team header */}
                    <tr>
                      <td colSpan={totalCols + 2} style={{
                        background: group.headerBg, color: group.headerText,
                        fontWeight: 700, fontSize: 13, padding: '5px 12px', letterSpacing: 0.4,
                      }}>
                        {group.label} — {group.key}
                      </td>
                    </tr>

                    {/* Week header row — index and extra col span 2 rows */}
                    <tr>
                      <th rowSpan={2} style={{
                        ...baseCell, background: '#f0f0f0',
                        textAlign: 'center', verticalAlign: 'middle',
                      }}>#</th>

                      {weekChunks.map(wk => {
                        const isCollapsed = collapsedWeeks.has(wk.weekIdx)
                        const startStr = dayjs(wk.dates[0]).format('DD/MM')
                        const endStr   = dayjs(wk.dates[wk.dates.length - 1]).format('DD/MM')
                        const weekLabel = `T${wk.weekIdx + 1}`

                        if (isCollapsed) return null

                        // Expanded: week label + hide button
                        return (
                          <th key={wk.weekIdx} colSpan={wk.dates.length} style={{
                            ...baseCell,
                            background: '#dbeeff',
                            textAlign: 'center',
                            padding: '2px 8px',
                            verticalAlign: 'middle',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 600, color: '#1677ff', fontSize: 11 }}>
                                {weekLabel} ({startStr} – {endStr})
                              </span>
                              <Tooltip title="Thu gọn tuần này">
                                <Button
                                  size="small" type="text"
                                  style={{ fontSize: 11, color: '#8c8c8c', padding: '0 4px', height: 20, lineHeight: '20px' }}
                                  onClick={() => toggleWeek(wk.weekIdx)}
                                >
                                  ◀ Ẩn
                                </Button>
                              </Tooltip>
                            </div>
                          </th>
                        )
                      })}

                      {/* Extra column: +1 tuần button — rowSpan=2 to cover date header row */}
                      {group.key === TO_GROUPS[0].key ? (
                        <th rowSpan={2} style={{
                          ...baseCell, background: '#f5f5f5',
                          textAlign: 'center', verticalAlign: 'middle',
                        }}>
                          <Tooltip title="Thêm 7 ngày tiếp theo cho tất cả các tổ">
                            <Button
                              size="small" type="primary" ghost
                              icon={<PlusOutlined />}
                              style={{ fontSize: 11, whiteSpace: 'nowrap' }}
                              onClick={addNextWeek}
                            >
                              +1 tuần
                            </Button>
                          </Tooltip>
                        </th>
                      ) : (
                        <th rowSpan={2} style={{ ...baseCell, background: '#f5f5f5' }} />
                      )}
                    </tr>

                    {/* Date header row — only expanded week dates rendered here */}
                    <tr>
                      {weekChunks.map(wk => {
                        if (collapsedWeeks.has(wk.weekIdx)) return null
                        return wk.dates.map(d => {
                          const djs   = dayjs(d)
                          const isEnd = djs.day() === 0 || djs.day() === 6
                          return (
                            <th key={d} style={{
                              ...baseCell,
                              background:  isEnd ? '#fff7e6' : '#e6f4ff',
                              color:       isEnd ? '#d46b08' : '#1677ff',
                              textAlign:   'center', fontWeight: 700, whiteSpace: 'nowrap',
                            }}>
                              {DAY_VI[djs.day()]}({djs.format('DD/MM/YY')})
                            </th>
                          )
                        })
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {maxRows === 0 && (
                      <tr>
                        <td colSpan={totalCols + 2} style={{
                          ...baseCell, textAlign: 'center',
                          color: '#bbb', padding: 20, background: group.bodyBg,
                        }}>
                          Chưa có kế hoạch — nhấn <strong>Thêm hàng</strong> để bắt đầu
                        </td>
                      </tr>
                    )}

                    {/* Task rows */}
                    {Array.from({ length: maxRows }, (_, rowIdx) => (
                      <tr key={rowIdx}>
                        <td style={{
                          ...baseCell, background: '#fafafa',
                          textAlign: 'center', color: '#8c8c8c', fontWeight: 600,
                        }}>
                          {rowIdx + 1}
                        </td>
                        {weekChunks.map(wk => {
                          if (collapsedWeeks.has(wk.weekIdx)) return null
                          return wk.dates.map(d => {
                            const task      = dateMap[d][rowIdx]
                            const isRatGap  = task?.tinhTrang === 'rat_gap'
                            const isGap     = task?.tinhTrang === 'gap'
                            return (
                              <td key={d} style={{
                                ...baseCell,
                                background: task
                                  ? (isRatGap ? '#fff1f0' : isGap ? '#f9f0ff' : group.bodyBg)
                                  : group.bodyBg,
                                borderLeft: isRatGap ? '3px solid #ff4d4f'
                                  : isGap ? '3px solid #722ed1'
                                  : baseCell.border,
                                wordBreak: 'break-word',
                              }}>
                                {task && (
                                  <TaskItem
                                    record={task}
                                    bodyBg={group.bodyBg}
                                    onEdit={openEdit}
                                    onDelete={handleDelete}
                                    canEdit={canEdit}
                                  />
                                )}
                              </td>
                            )
                          })
                        })}
                        <td style={{ ...baseCell, background: '#fafafa' }} />
                      </tr>
                    ))}

                    {/* "+ per cell" row — only for ADMIN / ADMIN_KH */}
                    {canEdit && (
                      <tr>
                        <td style={{ ...baseCell, background: '#fafafa', textAlign: 'center', color: '#d9d9d9', fontSize: 11 }}>
                          +
                        </td>
                        {weekChunks.map(wk => {
                          if (collapsedWeeks.has(wk.weekIdx)) return null
                          return wk.dates.map(d => (
                            <td key={d} style={{ ...baseCell, background: group.bodyBg, padding: '2px 4px' }}>
                              <Button
                                type="dashed" size="small" block
                                icon={<PlusOutlined />}
                                style={{ fontSize: 11, color: '#8c8c8c', borderColor: '#d9d9d9', height: 22 }}
                                onClick={() => openAdd(group.key, d)}
                              />
                            </td>
                          ))
                        })}
                        <td style={{ ...baseCell, background: '#fafafa' }} />
                      </tr>
                    )}

                    {/* Count row */}
                    <tr>
                      <td style={{ ...baseCell, background: '#f0f0f0', textAlign: 'center', fontWeight: 700, color: '#595959', fontSize: 11 }}>∑</td>
                      {weekChunks.map(wk => {
                        if (collapsedWeeks.has(wk.weekIdx)) return null
                        return wk.dates.map(d => (
                          <td key={d} style={{
                            ...baseCell, background: '#f0f0f0',
                            textAlign: 'center', fontWeight: 700, fontSize: 13,
                            color: dateMap[d].length > 0 ? '#1677ff' : '#d9d9d9',
                          }}>
                            {dateMap[d].length || '—'}
                          </td>
                        ))
                      })}
                      <td style={{ ...baseCell, background: '#f0f0f0' }} />
                    </tr>
                  </tbody>
                </table>

                {/* Thêm hàng button — only for ADMIN / ADMIN_KH */}
                {canEdit && (
                  <Button
                    type="primary" ghost icon={<PlusOutlined />}
                    style={{ marginTop: 6, borderColor: group.headerBg, color: group.headerBg }}
                    onClick={() => openAdd(group.key)}
                  >
                    Thêm hàng {group.label}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <PlanModal
        open={modalOpen}
        editItem={editItem}
        defaultToNhom={defaultToNhom}
        defaultDate={defaultDate}
        onClose={() => setModalOpen(false)}
        onSaved={() => fetchData()}
      />
    </div>
  )
}
