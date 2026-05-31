import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Button, Select, DatePicker, Input, InputNumber, Popconfirm,
  message, Spin, Typography, Space, Tag, Tooltip
} from 'antd'
import {
  PlusOutlined, SaveOutlined, DeleteOutlined, EditOutlined,
  CloseOutlined, ReloadOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

dayjs.extend(isoWeek)

const { Option } = Select

const TO_OPTIONS = ['PCPL1', 'PCPL2', 'PCPL3', 'BBC1', 'ĐG']
const TINH_TRANG_OPTIONS = ['Gấp', 'Rất gấp']
const TINH_TRANG_COLOR = { 'Gấp': 'orange', 'Rất gấp': 'red' }
const THU_LABEL = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']

const getThu = (date) => {
  if (!date) return '—'
  return THU_LABEL[dayjs(date).isoWeekday()] || '—'
}

const cellStyle = { padding: '4px 8px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle', fontSize: 13 }
const headStyle = { padding: '6px 8px', background: '#fafafa', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#595959', borderBottom: '2px solid #e8e8e8', whiteSpace: 'nowrap' }

export default function FactoryPlanPage() {
  const { isAdmin } = useAuth()

  const [weekStart, setWeekStart] = useState(() => dayjs().startOf('isoWeek'))
  const [rows, setRows] = useState([])
  const [drafts, setDrafts] = useState({})   // key -> field values being edited
  const [editingKeys, setEditingKeys] = useState(new Set())
  const [saving, setSaving] = useState(null)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef({})

  const weekEnd = weekStart.add(6, 'day')

  const fetchWeek = useCallback(async (ws = weekStart) => {
    setLoading(true)
    try {
      const { data } = await api.get('/factory-plan', {
        params: { from: ws.format('YYYY-MM-DD'), to: ws.add(6, 'day').format('YYYY-MM-DD') }
      })
      setRows(data)
      setEditingKeys(new Set())
      setDrafts({})
    } catch {
      message.error('Không thể tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => { fetchWeek(weekStart) }, [weekStart])

  const rowKey = (r) => r.id != null ? r.id : r._tempId

  const startEdit = (r) => {
    const k = rowKey(r)
    setDrafts(prev => ({ ...prev, [k]: { ...r } }))
    setEditingKeys(prev => new Set([...prev, k]))
  }

  const cancelEdit = (r) => {
    const k = rowKey(r)
    if (r.id == null) {
      setRows(prev => prev.filter(x => rowKey(x) !== k))
    }
    setEditingKeys(prev => { const n = new Set(prev); n.delete(k); return n })
    setDrafts(prev => { const n = { ...prev }; delete n[k]; return n })
  }

  const updateDraft = (k, field, val) => {
    setDrafts(prev => ({ ...prev, [k]: { ...prev[k], [field]: val } }))
  }

  const handleMaSpChange = (k, val) => {
    updateDraft(k, 'maSp', val)
    updateDraft(k, 'tenSanPham', '')
    clearTimeout(debounceRef.current[k])
    if (!val || val.length < 2) return
    debounceRef.current[k] = setTimeout(async () => {
      try {
        const { data } = await api.get(`/product-master/lookup/${encodeURIComponent(val)}`)
        setDrafts(prev => ({
          ...prev,
          [k]: { ...prev[k], tenSanPham: data.tienTrinh || '' }
        }))
      } catch { /* not found — leave blank */ }
    }, 400)
  }

  const saveRow = async (r) => {
    const k = rowKey(r)
    const draft = drafts[k] || {}
    if (!draft.ngayThucHien) { message.warning('Vui lòng chọn ngày thực hiện'); return }

    setSaving(k)
    try {
      const body = {
        ngayThucHien: dayjs(draft.ngayThucHien).format('YYYY-MM-DD'),
        maSp: draft.maSp || null,
        tenSanPham: draft.tenSanPham || null,
        soLo: draft.soLo || null,
        toThucHien: draft.toThucHien || null,
        tinhTrang: draft.tinhTrang || null,
        mayThucHien: draft.mayThucHien || null,
        phongThucHien: draft.phongThucHien || null,
        soNguoiThucHien: draft.soNguoiThucHien || null,
        ghiChu: draft.ghiChu || null,
      }
      let saved
      if (r.id != null) {
        const { data } = await api.put(`/factory-plan/${r.id}`, body)
        saved = data
        setRows(prev => prev.map(x => x.id === r.id ? saved : x))
      } else {
        const { data } = await api.post('/factory-plan', body)
        saved = data
        setRows(prev => prev.map(x => rowKey(x) === k ? saved : x))
      }
      setEditingKeys(prev => { const n = new Set(prev); n.delete(k); return n })
      setDrafts(prev => { const n = { ...prev }; delete n[k]; return n })
      message.success('Đã lưu')
    } catch (e) {
      message.error(e?.response?.data?.message || 'Lưu thất bại')
    } finally {
      setSaving(null)
    }
  }

  const deleteRow = async (r) => {
    if (r.id == null) {
      setRows(prev => prev.filter(x => rowKey(x) !== rowKey(r)))
      return
    }
    try {
      await api.delete(`/factory-plan/${r.id}`)
      setRows(prev => prev.filter(x => x.id !== r.id))
      message.success('Đã xóa')
    } catch {
      message.error('Xóa thất bại')
    }
  }

  const addRow = () => {
    const tempId = Date.now()
    const newRow = { _tempId: tempId, id: null, ngayThucHien: weekStart.toDate(), maSp: '', tenSanPham: '', soLo: '', toThucHien: null, tinhTrang: '', mayThucHien: '', phongThucHien: '', soNguoiThucHien: null, ghiChu: '' }
    setRows(prev => [...prev, newRow])
    setDrafts(prev => ({ ...prev, [tempId]: { ...newRow } }))
    setEditingKeys(prev => new Set([...prev, tempId]))
  }

  return (
    <div>
      <style>{`
        .fp-table { border-collapse: collapse; width: 100%; }
        .fp-table td, .fp-table th { border: 1px solid #f0f0f0; }
        .fp-table tr:hover td { background: #fafafa; }
        .fp-table tr.editing-row td { background: #fffbe6; }
        .fp-input { width: 100%; border: 1px solid #d9d9d9; border-radius: 4px; padding: 2px 6px; font-size: 13px; outline: none; box-sizing: border-box; }
        .fp-input:focus { border-color: #4096ff; box-shadow: 0 0 0 2px rgba(64,150,255,0.1); }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Kế hoạch Sản xuất Xưởng</Typography.Title>
        <Space wrap>
          <DatePicker
            picker="week"
            value={weekStart}
            format={(d) => `${d.startOf('isoWeek').format('DD/MM')} – ${d.endOf('isoWeek').format('DD/MM/YYYY')}`}
            onChange={(d) => { if (d) setWeekStart(d.startOf('isoWeek')) }}
            allowClear={false}
            style={{ width: 200 }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => fetchWeek(weekStart)}>Tải lại</Button>
          {isAdmin() && (
            <Button type="primary" icon={<PlusOutlined />} onClick={addRow}>Thêm hàng</Button>
          )}
        </Space>
      </div>

      {/* Week label */}
      <div style={{ marginBottom: 12, color: '#64f5b1', fontSize: 13 }}>
        Tuần: <strong>{weekStart.format('DD/MM/YYYY')}</strong> – <strong>{weekEnd.format('DD/MM/YYYY')}</strong>
      </div>

      <Spin spinning={loading}>
        <div style={{ overflowX: 'auto' }}>
          <table className="fp-table">
            <thead>
              <tr>
                <th style={{ ...headStyle, width: 80 }}>Thứ</th>
                <th style={{ ...headStyle, width: 105 }}>Ngày TH</th>
                <th style={{ ...headStyle, width: 90 }}>Mã SP</th>
                <th style={{ ...headStyle, minWidth: 200 }}>Tên Sản Phẩm</th>
                <th style={{ ...headStyle, width: 100 }}>Số Lô</th>
                <th style={{ ...headStyle, width: 105 }}>Tổ Thực Hiện</th>
                <th style={{ ...headStyle, width: 110 }}>Tình Trạng</th>
                <th style={{ ...headStyle, width: 120 }}>Máy Thực Hiện</th>
                <th style={{ ...headStyle, width: 120 }}>Phòng Thực Hiện</th>
                <th style={{ ...headStyle, width: 60 }}>Số Người</th>
                <th style={{ ...headStyle, minWidth: 130 }}>Ghi chú</th>
                <th style={{ ...headStyle, width: 85, textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={12} style={{ ...cellStyle, textAlign: 'center', color: '#bbb', padding: 24 }}>
                    Chưa có kế hoạch — nhấn <strong>Thêm hàng</strong> để thêm mới
                  </td>
                </tr>
              )}
              {rows.map(r => {
                const k = rowKey(r)
                const isEditing = editingKeys.has(k)
                const d = drafts[k] || r

                if (isEditing) {
                  return (
                    <tr key={k} className="editing-row">
                      <td style={cellStyle}>
                        <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                          {d.ngayThucHien ? getThu(d.ngayThucHien) : '—'}
                        </span>
                      </td>
                      <td style={cellStyle}>
                        <DatePicker
                          size="small"
                          value={d.ngayThucHien ? dayjs(d.ngayThucHien) : null}
                          format="DD/MM/YYYY"
                          style={{ width: '100%' }}
                          disabledDate={date => date.isBefore(weekStart, 'day') || date.isAfter(weekEnd, 'day')}
                          onChange={val => updateDraft(k, 'ngayThucHien', val ? val.toDate() : null)}
                          allowClear={false}
                        />
                      </td>
                      <td style={cellStyle}>
                        <input
                          className="fp-input"
                          value={d.maSp || ''}
                          placeholder="VD: TP223"
                          onChange={e => handleMaSpChange(k, e.target.value)}
                        />
                      </td>
                      <td style={cellStyle}>
                        <input
                          className="fp-input"
                          value={d.tenSanPham || ''}
                          placeholder="Tự điền từ Mã SP..."
                          onChange={e => updateDraft(k, 'tenSanPham', e.target.value)}
                          style={{ color: d.tenSanPham ? '#3ac0e2' : '#bbb' }}
                        />
                      </td>
                      <td style={cellStyle}>
                        <input
                          className="fp-input"
                          value={d.soLo || ''}
                          placeholder="Số lô"
                          onChange={e => updateDraft(k, 'soLo', e.target.value)}
                        />
                      </td>
                      <td style={cellStyle}>
                        <Select
                          size="small"
                          style={{ width: '100%' }}
                          value={d.toThucHien || undefined}
                          placeholder="Chọn tổ"
                          onChange={val => updateDraft(k, 'toThucHien', val)}
                          allowClear
                        >
                          {TO_OPTIONS.map(o => <Option key={o} value={o}>{o}</Option>)}
                        </Select>
                      </td>
                      <td style={cellStyle}>
                        <Select
                          size="small"
                          style={{ width: '100%' }}
                          value={d.tinhTrang || undefined}
                          placeholder="Chọn tình trạng"
                          onChange={val => updateDraft(k, 'tinhTrang', val ?? null)}
                          allowClear
                        >
                          {TINH_TRANG_OPTIONS.map(o => <Option key={o} value={o}>{o}</Option>)}
                        </Select>
                      </td>
                      <td style={cellStyle}>
                        <input
                          className="fp-input"
                          value={d.mayThucHien || ''}
                          placeholder="Máy"
                          onChange={e => updateDraft(k, 'mayThucHien', e.target.value)}
                        />
                      </td>
                      <td style={cellStyle}>
                        <input
                          className="fp-input"
                          value={d.phongThucHien || ''}
                          placeholder="Phòng"
                          onChange={e => updateDraft(k, 'phongThucHien', e.target.value)}
                        />
                      </td>
                      <td style={cellStyle}>
                        <InputNumber
                          size="small"
                          style={{ width: '100%' }}
                          min={0}
                          value={d.soNguoiThucHien ?? undefined}
                          onChange={val => updateDraft(k, 'soNguoiThucHien', val)}
                        />
                      </td>
                      <td style={cellStyle}>
                        <input
                          className="fp-input"
                          value={d.ghiChu || ''}
                          placeholder="Ghi chú"
                          onChange={e => updateDraft(k, 'ghiChu', e.target.value)}
                        />
                      </td>
                      <td style={{ ...cellStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <Space size={4}>
                          <Tooltip title="Lưu">
                            <Button
                              size="small" type="primary" icon={<SaveOutlined />}
                              loading={saving === k}
                              onClick={() => saveRow(r)}
                            />
                          </Tooltip>
                          <Tooltip title="Hủy">
                            <Button
                              size="small" icon={<CloseOutlined />}
                              onClick={() => cancelEdit(r)}
                            />
                          </Tooltip>
                        </Space>
                      </td>
                    </tr>
                  )
                }

                // Read-only row
                return (
                  <tr key={k}>
                    <td style={{ ...cellStyle, color: '#b91515', textAlign: 'center', fontWeight: 500 }}>
                      {getThu(r.ngayThucHien)}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                      {r.ngayThucHien ? dayjs(r.ngayThucHien).format('DD/MM/YYYY') : '—'}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                      {r.maSp ? <Tag color="blue" style={{ fontWeight: 600, marginRight: 0 }}>{r.maSp}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span>}
                    </td>
                    <td style={{ ...cellStyle, color: '#1677ff', fontWeight: 500 }}>
                      {r.tenSanPham || <span style={{ color: '#d9d9d9' }}>—</span>}
                    </td>
                    <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: 12 }}>
                      {r.soLo || <span style={{ color: '#d9d9d9' }}>—</span>}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                      {r.toThucHien
                        ? <Tag color="purple" style={{ marginRight: 0 }}>{r.toThucHien}</Tag>
                        : <span style={{ color: '#d9d9d9' }}>—</span>}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                      {r.tinhTrang
                        ? <Tag color={TINH_TRANG_COLOR[r.tinhTrang] || 'default'} style={{ marginRight: 0 }}>{r.tinhTrang}</Tag>
                        : <span style={{ color: '#d9d9d9' }}>—</span>}
                    </td>
                    <td style={cellStyle}>{r.mayThucHien || <span style={{ color: '#d9d9d9' }}>—</span>}</td>
                    <td style={cellStyle}>{r.phongThucHien || <span style={{ color: '#d9d9d9' }}>—</span>}</td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>
                      {r.soNguoiThucHien ?? <span style={{ color: '#d9d9d9' }}>—</span>}
                    </td>
                    <td style={{ ...cellStyle, color: '#3dedf4' }}>
                      {r.ghiChu || <span style={{ color: '#d9d9d9' }}>—</span>}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <Space size={4}>
                        {isAdmin() && (
                          <Tooltip title="Sửa">
                            <Button size="small" type="text" icon={<EditOutlined />}
                              style={{ color: '#27c265' }}
                              onClick={() => startEdit(r)} />
                          </Tooltip>
                        )}
                        <Popconfirm
                          title="Xóa hàng này?"
                          onConfirm={() => deleteRow(r)}
                          okText="Xóa" cancelText="Hủy"
                          disabled={!isAdmin()}
                        >
                          <Tooltip title={isAdmin() ? 'Xóa' : 'Chỉ admin được xóa'}>
                            <Button size="small" type="text" danger icon={<DeleteOutlined />}
                              disabled={!isAdmin()} />
                          </Tooltip>
                        </Popconfirm>
                      </Space>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Spin>

      <div style={{ marginTop: 12, color: '#bbb', fontSize: 12 }}>
        Tổng: {rows.length} hàng
      </div>
    </div>
  )
}
