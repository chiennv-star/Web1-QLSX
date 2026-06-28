import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Table, Button, Space, Input, Modal,
  Form, Popconfirm, message, Tag, Row, Col, InputNumber, Select, Tooltip
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  ReloadOutlined, AppstoreOutlined, SaveOutlined, CloseOutlined
} from '@ant-design/icons'
import api from '../api/axios'

const viFormatter = v => {
  if (v == null || v === '') return ''
  const [int, dec] = String(v).split('.')
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return dec !== undefined ? `${intFmt},${dec}` : intFmt
}
const viParser = v => {
  if (!v) return ''
  const cleaned = v.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? '' : n
}

const MAY_MOC_PC_OPTIONS = [
  'Máy nhũ hóa 500L', 'Máy nhũ hóa 700L', 'Máy Khuấy 1500L',
  'Máy Khuấy 700L', 'Máy nhũ hóa 100L', 'Thủ Công',
]
const MAY_MOC_PL_OPTIONS = [
  'Máy Chiết Tube Hàn Nhiệt', 'Máy Chiết Tube Hàn Seal',
  'Máy Chiết Bánh Răng', 'Máy Chiết 4 vòi bơm khí',
  'Máy Chiết 4 vòi bơm từ', 'Máy Chiết 2 vòi',
  'Máy Chiết mặt nạ', 'Máy Chiết Nhu Động',
  'Máy Chiết Bột', 'Thủ Công/ Sục ozon',
]
const LOAI_SP_OPTIONS = [
  'Nhũ Tương', 'Dung Dịch', 'Gel', 'Son', 'Sáp', 'Bột',
  'Nước hoa', 'Dầu gội', 'Sữa tắm', 'Tinh dầu', 'Nến',
  'Kem trang điểm', 'Chiết xuất', 'Khác',
]
const TO_NHOM_OPTIONS = ['PCPL1', 'PCPL2', 'PCPL3']

// ── Editable cell ─────────────────────────────────────────────────────────────
function EditableCell({ editing, dataIndex, inputType, inputProps = {}, children, ...restProps }) {
  let input
  if (inputType === 'number') {
    input = <InputNumber min={0} max={999999999} formatter={viFormatter} parser={viParser} style={{ width: '100%' }} size="small" {...inputProps} />
  } else if (inputType === 'select') {
    input = <Select size="small" allowClear style={{ width: '100%' }} {...inputProps} />
  } else if (inputType === 'selectCreatable') {
    input = (
      <Select size="small" allowClear showSearch mode="tags" maxTagCount={1} style={{ width: '100%' }} {...inputProps} />
    )
  } else {
    input = <Input size="small" {...inputProps} />
  }
  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item name={dataIndex} style={{ margin: 0 }}>
          {input}
        </Form.Item>
      ) : children}
    </td>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ProductMasterPage() {
  const [data, setData]           = useState([])
  const [loading, setLoading]     = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [keyword, setKeyword]     = useState('')
  const [editingKey, setEditingKey] = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [form]    = Form.useForm()
  const [addForm] = Form.useForm()

  const toolbarRef = useRef(null)
  const [toolbarH, setToolbarH] = useState(0)
  useEffect(() => {
    if (!toolbarRef.current) return
    const obs = new ResizeObserver(() => setToolbarH(toolbarRef.current?.offsetHeight || 0))
    obs.observe(toolbarRef.current)
    return () => obs.disconnect()
  }, [])

  const fetchData = useCallback(async (page = 0, size = pagination.pageSize, kw = keyword) => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/product-master', {
        params: { keyword: kw || undefined, page, size }
      })
      setData(res.content)
      setPagination(p => ({ ...p, total: res.totalElements }))
    } catch {
      message.error('Không thể tải danh mục')
    } finally {
      setLoading(false)
    }
  }, [keyword, pagination.pageSize])

  useEffect(() => { fetchData(0) }, [])

  const isEditing = record => record.id === editingKey

  const startEdit = record => {
    form.setFieldsValue({
      maBravo:     record.maBravo     || '',
      tienTrinh:   record.tienTrinh   || '',
      spCong:      record.spCong      != null ? Number(record.spCong)      : null,
      slTrungBinh: record.slTrungBinh != null ? Number(record.slTrungBinh) : 1000,
      nangSuatPc:  record.nangSuatPc  != null ? Number(record.nangSuatPc)  : null,
      nangSuatPl:  record.nangSuatPl  != null ? Number(record.nangSuatPl)  : null,
      nangSuatBbc1:record.nangSuatBbc1!= null ? Number(record.nangSuatBbc1): null,
      mayMocPc:    record.mayMocPc    || undefined,
      mayMocPl:    record.mayMocPl    || undefined,
      mayMocBbc1:  record.mayMocBbc1  || '',
      mayMocDg:    record.mayMocDg    || '',
      loaiSanPham: record.loaiSanPham || undefined,
      khoiLuong:   record.khoiLuong   != null ? Number(record.khoiLuong)   : null,
      toNhomPcpl:  record.toNhomPcpl  || undefined,
    })
    setEditingKey(record.id)
  }

  const cancelEdit = () => { setEditingKey(null); form.resetFields() }

  const saveEdit = async (record) => {
    try {
      const values = await form.validateFields()
      const numFields = ['slTrungBinh', 'nangSuatPc', 'nangSuatPl', 'nangSuatBbc1', 'khoiLuong', 'spCong']
      numFields.forEach(k => {
        if (values[k] == null) return
        if (typeof values[k] === 'number') return
        const cleaned = String(values[k]).replace(/\./g, '').replace(',', '.')
        values[k] = parseFloat(cleaned) || 0
      })
      await api.put(`/product-master/${record.id}`, values)
      message.success('Cập nhật thành công')
      setEditingKey(null)
      fetchData(pagination.current - 1)
    } catch (err) {
      if (err?.response) message.error(err.response.data?.message || 'Lưu thất bại')
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/product-master/${id}`)
      message.success('Đã xóa')
      fetchData(pagination.current - 1)
    } catch {
      message.error('Xóa thất bại')
    }
  }

  const openAdd = () => {
    addForm.resetFields()
    addForm.setFieldsValue({ slTrungBinh: 1000 })
    setAddModalOpen(true)
  }

  const onAdd = async () => {
    try {
      const values = await addForm.validateFields()
      const numFields = ['slTrungBinh', 'nangSuatPc', 'nangSuatPl', 'nangSuatBbc1', 'khoiLuong', 'spCong']
      numFields.forEach(k => {
        if (values[k] == null) return
        if (typeof values[k] === 'number') return
        const cleaned = String(values[k]).replace(/\./g, '').replace(',', '.')
        values[k] = parseFloat(cleaned) || 0
      })
      await api.post('/product-master', values)
      message.success('Thêm mới thành công')
      setAddModalOpen(false)
      fetchData(0)
    } catch (err) {
      if (err?.response) message.error(err.response.data?.message || 'Lưu thất bại')
    }
  }

  const numCell = v => v != null
    ? <span style={{ fontWeight: 600 }}>{Number(v).toLocaleString('vi-VN')}</span>
    : <span style={{ color: '#d9d9d9' }}>—</span>

  const editCol = (dataIndex, inputType, inputProps) => ({
    onCell: record => ({
      record, editing: isEditing(record),
      dataIndex, inputType, inputProps,
    })
  })

  const columns = [
    {
      title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 120, fixed: 'left',
      render: v => <Tag color="blue" style={{ fontWeight: 700, marginRight: 0, fontFamily: 'monospace' }}>{v || '—'}</Tag>,
      ...editCol('maBravo', 'text', { placeholder: '10601364' }),
    },
    {
      title: 'Mã TP', dataIndex: 'maTp', key: 'maTp', width: 90, fixed: 'left',
      render: v => <span style={{ fontWeight: 600, color: '#595959' }}>{v}</span>,
      // maTp is the unique key — not editable after creation
    },
    {
      title: 'Tiến Trình (Tên SP)', dataIndex: 'tienTrinh', key: 'tienTrinh', width: 240,
      render: v => <span style={{ fontWeight: 500 }}>{v}</span>,
      ...editCol('tienTrinh', 'text', { placeholder: 'Xịt khử mùi 10ml' }),
    },
    {
      title: 'Loại SP', dataIndex: 'loaiSanPham', key: 'loaiSanPham', width: 120,
      render: v => v ? <Tag color="geekblue" style={{ margin: 0, fontSize: 11 }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span>,
      ...editCol('loaiSanPham', 'select', {
        placeholder: 'Chọn loại',
        options: LOAI_SP_OPTIONS.map(v => ({ value: v, label: v })),
      }),
    },
    {
      title: 'Tổ/Nhóm PCPL', dataIndex: 'toNhomPcpl', key: 'toNhomPcpl', width: 110, align: 'center',
      render: v => v ? <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span>,
      ...editCol('toNhomPcpl', 'select', {
        placeholder: 'PCPL1/2/3',
        options: TO_NHOM_OPTIONS.map(v => ({ value: v, label: v })),
      }),
    },
    {
      title: 'SL TB', dataIndex: 'slTrungBinh', key: 'slTrungBinh', width: 100, align: 'right',
      render: v => <span style={{ fontWeight: 700, color: '#1E3A5F' }}>{v != null ? Number(v).toLocaleString('vi-VN') : 1}</span>,
      ...editCol('slTrungBinh', 'number', { placeholder: '1000' }),
    },
    {
      title: 'SP/Công', dataIndex: 'spCong', key: 'spCong', width: 100, align: 'right',
      render: numCell,
      ...editCol('spCong', 'number', { placeholder: 'SP/công' }),
    },
    {
      title: 'Khối lượng (g)', dataIndex: 'khoiLuong', key: 'khoiLuong', width: 120, align: 'right',
      render: numCell,
      ...editCol('khoiLuong', 'number', { placeholder: 'gram' }),
    },
    {
      title: 'NS PC', dataIndex: 'nangSuatPc', key: 'nangSuatPc', width: 100, align: 'right',
      render: numCell,
      ...editCol('nangSuatPc', 'number'),
    },
    {
      title: 'NS PL', dataIndex: 'nangSuatPl', key: 'nangSuatPl', width: 100, align: 'right',
      render: numCell,
      ...editCol('nangSuatPl', 'number'),
    },
    {
      title: 'NS BBC1', dataIndex: 'nangSuatBbc1', key: 'nangSuatBbc1', width: 100, align: 'right',
      render: numCell,
      ...editCol('nangSuatBbc1', 'number'),
    },
    {
      title: 'Máy PC', dataIndex: 'mayMocPc', key: 'mayMocPc', width: 160,
      render: v => v || <span style={{ color: '#d9d9d9' }}>—</span>,
      ...editCol('mayMocPc', 'select', {
        placeholder: 'Chọn máy PC',
        options: MAY_MOC_PC_OPTIONS.map(v => ({ value: v, label: v })),
      }),
    },
    {
      title: 'Máy PL', dataIndex: 'mayMocPl', key: 'mayMocPl', width: 200,
      render: v => v || <span style={{ color: '#d9d9d9' }}>—</span>,
      ...editCol('mayMocPl', 'select', {
        placeholder: 'Chọn máy PL',
        options: MAY_MOC_PL_OPTIONS.map(v => ({ value: v, label: v })),
      }),
    },
    {
      title: 'Máy BBC1', dataIndex: 'mayMocBbc1', key: 'mayMocBbc1', width: 150,
      render: v => v || <span style={{ color: '#d9d9d9' }}>—</span>,
      ...editCol('mayMocBbc1', 'text', { placeholder: 'Tên máy BBC1' }),
    },
    {
      title: 'Máy ĐG', dataIndex: 'mayMocDg', key: 'mayMocDg', width: 150,
      render: v => v || <span style={{ color: '#d9d9d9' }}>—</span>,
      ...editCol('mayMocDg', 'text', { placeholder: 'Tên máy ĐG' }),
    },
    {
      title: 'Thao Tác', key: 'action', width: 100, fixed: 'right', align: 'center',
      render: (_, record) => {
        const editing = isEditing(record)
        return editing ? (
          <Space size={4}>
            <Tooltip title="Lưu">
              <Button size="small" type="primary" icon={<SaveOutlined />}
                style={{ background: '#16a34a', borderColor: '#16a34a' }}
                onClick={() => saveEdit(record)} />
            </Tooltip>
            <Tooltip title="Hủy">
              <Button size="small" icon={<CloseOutlined />} onClick={cancelEdit} />
            </Tooltip>
          </Space>
        ) : (
          <Space size={4}>
            <Tooltip title="Sửa">
              <Button size="small" icon={<EditOutlined />}
                disabled={editingKey !== null}
                onClick={() => startEdit(record)} />
            </Tooltip>
            <Popconfirm title="Xóa mục này?" onConfirm={() => handleDelete(record.id)}
              okText="Xóa" cancelText="Hủy">
              <Tooltip title="Xóa">
                <Button size="small" danger icon={<DeleteOutlined />}
                  disabled={editingKey !== null} />
              </Tooltip>
            </Popconfirm>
          </Space>
        )
      }
    }
  ]

  const mergedColumns = columns.map(col => {
    if (!col.onCell) return col
    return { ...col, onCell: record => col.onCell(record) }
  })

  return (
    <>
      <style>{`
        .pm-table .ant-table-thead > tr > th {
          background: linear-gradient(90deg, #2980b3 0%, #3399CC 100%) !important; color: #ffffff !important;
          font-size: 11px !important; text-transform: uppercase;
          padding: 7px 10px !important; letter-spacing: 0.4px;
          border-right: 1px solid #4db3d4 !important; white-space: nowrap;
        }
        .pm-table .ant-table-thead > tr > th::before { display: none !important; }
        .pm-table .ant-table-tbody > tr > td { padding: 5px 8px !important; vertical-align: middle; }
        .pm-table .ant-table-tbody > tr:hover > td { background: #EAECF2 !important; }
        .pm-table .row-stripe td { background: #fafbff !important; }
        .pm-table .row-editing td { background: #fffbeb !important; }
        .pm-table .ant-form-item-control-input { min-height: unset; }
      `}</style>

      {/* Toolbar */}
      <div ref={toolbarRef} style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: '#fff', borderBottom: '2px solid #DDE1E8',
        padding: '10px 0 12px', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#1E3A5F', whiteSpace: 'nowrap' }}>
            <AppstoreOutlined style={{ marginRight: 6, color: '#4db3d4' }} />
            Danh mục Mã TP
          </span>
          <span style={{ fontSize: 12, color: '#888' }}>
            Click nút ✏️ trên hàng để sửa trực tiếp tất cả các ô.
          </span>
        </div>
        <Row gutter={12} align="middle">
          <Col flex="auto">
            <Input
              size="small"
              placeholder="Tìm theo Mã TP, Mã Bravo hoặc Tiến trình..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onPressEnter={() => fetchData(0, pagination.pageSize, keyword)}
              allowClear
              onClear={() => { setKeyword(''); fetchData(0, pagination.pageSize, '') }}
              prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            />
          </Col>
          <Col>
            <Space>
              <Button size="small" type="primary" icon={<SearchOutlined />}
                onClick={() => fetchData(0, pagination.pageSize, keyword)}>Tìm</Button>
              <Button size="small" icon={<ReloadOutlined />}
                onClick={() => { setKeyword(''); fetchData(0) }} />
              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openAdd}
                style={{ background: '#1D4ED8', borderColor: '#1D4ED8' }}>
                Thêm mã TP
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Form form={form} component={false}>
        <Table
          className="pm-table"
          components={{ body: { cell: EditableCell } }}
          columns={mergedColumns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          size="small"
          scroll={{ x: 1800 }}
          sticky={{ offsetHeader: toolbarH }}
          rowClassName={(record, i) => {
            if (isEditing(record)) return 'row-editing'
            return i % 2 !== 0 ? 'row-stripe' : ''
          }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: total => `Tổng ${total} mục`,
            onChange: (page, pageSize) => {
              if (editingKey) cancelEdit()
              setPagination(p => ({ ...p, current: page, pageSize }))
              fetchData(page - 1, pageSize)
            }
          }}
        />
      </Form>

      {/* Add new modal */}
      <Modal
        title="Thêm Mã TP mới"
        open={addModalOpen}
        onOk={onAdd}
        onCancel={() => setAddModalOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
        width={600}
      >
        <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Mã TP" name="maTp" rules={[{ required: true, message: 'Nhập Mã TP' }]}>
                <Input placeholder="TP364" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Mã Bravo" name="maBravo" rules={[{ required: true, message: 'Nhập Mã Bravo' }]}>
                <Input placeholder="10601364" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Tổ/Nhóm PCPL" name="toNhomPcpl">
                <Select allowClear placeholder="PCPL1/2/3"
                  options={TO_NHOM_OPTIONS.map(v => ({ value: v, label: v }))} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Tiến trình (Tên sản phẩm)" name="tienTrinh"
            rules={[{ required: true, message: 'Nhập tên tiến trình' }]}>
            <Input placeholder="Xịt khử mùi Wings up 24H 10ml" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Loại sản phẩm" name="loaiSanPham">
                <Select allowClear placeholder="Chọn loại"
                  options={LOAI_SP_OPTIONS.map(v => ({ value: v, label: v }))} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Khối lượng (gram)" name="khoiLuong">
                <InputNumber min={0} formatter={viFormatter} parser={viParser} style={{ width: '100%' }} placeholder="250" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="SP/Công" name="spCong">
                <InputNumber min={0} formatter={viFormatter} parser={viParser} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="SL Trung bình" name="slTrungBinh" rules={[{ required: true }]}>
                <InputNumber min={0} formatter={viFormatter} parser={viParser} style={{ width: '100%' }} placeholder="1000" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Năng suất PC" name="nangSuatPc">
                <InputNumber min={0} formatter={viFormatter} parser={viParser} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Năng suất PL" name="nangSuatPl">
                <InputNumber min={0} formatter={viFormatter} parser={viParser} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Năng suất BBC1" name="nangSuatBbc1">
                <InputNumber min={0} formatter={viFormatter} parser={viParser} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Máy Móc PC" name="mayMocPc">
            <Select placeholder="Chọn máy móc PC" allowClear
              options={MAY_MOC_PC_OPTIONS.map(v => ({ value: v, label: v }))} />
          </Form.Item>

          <Form.Item label="Máy Móc PL" name="mayMocPl">
            <Select placeholder="Chọn máy móc PL" allowClear
              options={MAY_MOC_PL_OPTIONS.map(v => ({ value: v, label: v }))} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Máy Móc BBC1" name="mayMocBbc1">
                <Input placeholder="Tên máy móc BBC1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Máy Móc ĐG" name="mayMocDg">
                <Input placeholder="Tên máy móc ĐG" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  )
}
