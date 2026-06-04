import React, { useState, useEffect, useRef } from 'react'
import {
  Table, Button, Space, Input, Modal,
  Form, Popconfirm, message, Tag, Row, Col, InputNumber, Select, Tooltip
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined, AppstoreOutlined
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

export default function ProductMasterPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [keyword, setKeyword] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form] = Form.useForm()

  const toolbarRef = useRef(null)
  const [toolbarH, setToolbarH] = useState(0)
  useEffect(() => {
    if (!toolbarRef.current) return
    const obs = new ResizeObserver(() => setToolbarH(toolbarRef.current?.offsetHeight || 0))
    obs.observe(toolbarRef.current)
    return () => obs.disconnect()
  }, [])

  const fetchData = async (page = 0, size = 20, kw = keyword) => {
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
  }

  useEffect(() => { fetchData(0) }, [])

  const openCreate = () => {
    setEditItem(null)
    form.resetFields()
    form.setFieldsValue({ slTrungBinh: 1000 })
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    form.setFieldsValue({
      ...item,
      slTrungBinh:  item.slTrungBinh  != null ? Number(item.slTrungBinh)  : 1000,
      nangSuatPc:   item.nangSuatPc   != null ? Number(item.nangSuatPc)   : 1000,
      nangSuatPl:   item.nangSuatPl   != null ? Number(item.nangSuatPl)   : 1000,
      nangSuatBbc1: item.nangSuatBbc1 != null ? Number(item.nangSuatBbc1) : 1000,
      mayMocPc:   item.mayMocPc   || '',
      mayMocPl:   item.mayMocPl   || '',
      mayMocBbc1: item.mayMocBbc1 || '',
      mayMocDg:   item.mayMocDg   || '',
    })
    setModalOpen(true)
  }

  const numFields = ['slTrungBinh', 'nangSuatPc', 'nangSuatPl', 'nangSuatBbc1']
  const onSave = async () => {
    try {
      const values = await form.validateFields()
      const payload = { ...values }
      numFields.forEach(k => {
        if (payload[k] != null) {
          const cleaned = String(payload[k]).replace(/\./g, '').replace(',', '.')
          payload[k] = parseFloat(cleaned) || 0
        }
      })
      if (editItem) {
        await api.put(`/product-master/${editItem.id}`, payload)
        message.success('Cập nhật thành công')
      } else {
        await api.post('/product-master', payload)
        message.success('Thêm mới thành công')
      }
      setModalOpen(false)
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

  const numCell = v => v != null
    ? <span style={{ fontWeight: 600 }}>{Number(v).toLocaleString('vi-VN')}</span>
    : <span style={{ color: '#d9d9d9' }}>—</span>

  const columns = [
    {
      title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 120, fixed: 'left',
      render: v => <Tag color="blue" style={{ fontWeight: 700, marginRight: 0, fontFamily: 'monospace' }}>{v || '—'}</Tag>
    },
    {
      title: 'Mã TP', dataIndex: 'maTp', key: 'maTp', width: 100,
      render: v => <span style={{ fontWeight: 600, color: '#595959' }}>{v}</span>
    },
    {
      title: 'Tiến Trình (Tên Sản Phẩm)', dataIndex: 'tienTrinh', key: 'tienTrinh', width: 260,
      render: v => <span style={{ fontWeight: 500 }}>{v}</span>
    },
    {
      title: 'SL Trung Bình', dataIndex: 'slTrungBinh', key: 'slTrungBinh', width: 120, align: 'right',
      render: v => <span style={{ fontWeight: 700, color: '#1E3A5F' }}>{v != null ? Number(v).toLocaleString('vi-VN') : 1}</span>
    },
    { title: 'Năng Suất PC',   dataIndex: 'nangSuatPc',   key: 'nangSuatPc',   width: 120, align: 'right', render: numCell },
    { title: 'Năng Suất PL',   dataIndex: 'nangSuatPl',   key: 'nangSuatPl',   width: 120, align: 'right', render: numCell },
    { title: 'Năng Suất BBC1', dataIndex: 'nangSuatBbc1', key: 'nangSuatBbc1', width: 130, align: 'right', render: numCell },
    { title: 'Máy Móc PC',   dataIndex: 'mayMocPc',   key: 'mayMocPc',   width: 160, render: v => v || <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'Máy Móc PL',   dataIndex: 'mayMocPl',   key: 'mayMocPl',   width: 180, render: v => v || <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'Máy Móc BBC1', dataIndex: 'mayMocBbc1', key: 'mayMocBbc1', width: 160, render: v => v || <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'Máy Móc ĐG',  dataIndex: 'mayMocDg',   key: 'mayMocDg',   width: 140, render: v => v || <span style={{ color: '#d9d9d9' }}>—</span> },
    {
      title: 'Thao Tác', key: 'action', width: 90, fixed: 'right', align: 'center',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Sửa">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Popconfirm title="Xóa mục này?" onConfirm={() => handleDelete(record.id)}
            okText="Xóa" cancelText="Hủy">
            <Tooltip title="Xóa">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ]

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
        .pm-table .ant-table-tbody > tr > td { padding: 7px 10px !important; vertical-align: middle; }
        .pm-table .ant-table-tbody > tr:hover > td { background: #EAECF2 !important; }
        .pm-table .row-stripe td { background: #fafbff !important; }
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
            Quản lý danh sách Mã TP kèm Mã Bravo và Tiến trình.
            Khi nhập Mã TP ở form Sản lượng, hệ thống sẽ tự động điền các thông tin này.
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
                onClick={() => fetchData(0, pagination.pageSize, keyword)}>
                Tìm
              </Button>
              <Button size="small" icon={<ReloadOutlined />}
                onClick={() => { setKeyword(''); fetchData(0) }} />
              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreate}
                style={{ background: '#1D4ED8', borderColor: '#1D4ED8' }}>
                Thêm mã TP
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Table
        className="pm-table"
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 1600 }}
        sticky={{ offsetHeader: toolbarH }}
        rowClassName={(_, i) => i % 2 !== 0 ? 'row-stripe' : ''}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: total => `Tổng ${total} mục`,
          onChange: (page, pageSize) => {
            setPagination(p => ({ ...p, current: page, pageSize }))
            fetchData(page - 1, pageSize)
          }
        }}
      />

      <Modal
        title={editItem ? 'Chỉnh sửa Mã TP' : 'Thêm Mã TP mới'}
        open={modalOpen}
        onOk={onSave}
        onCancel={() => setModalOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Mã TP" name="maTp"
                rules={[{ required: true, message: 'Nhập Mã TP' }]}>
                <Input disabled={Boolean(editItem)} placeholder="Ví dụ: TP364" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Mã Bravo" name="maBravo"
                rules={[{ required: true, message: 'Nhập Mã Bravo' }]}>
                <Input placeholder="Ví dụ: 10601364" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Tiến trình (Tên sản phẩm)" name="tienTrinh"
            rules={[{ required: true, message: 'Nhập tên tiến trình' }]}>
            <Input placeholder="Ví dụ: Xịt khử mùi Wings up 24H 10ml" />
          </Form.Item>

          <Form.Item label="SL Trung bình" name="slTrungBinh"
            rules={[{ required: true, message: 'Nhập SL Trung bình' }]}>
            <InputNumber min={0} max={999999999} formatter={viFormatter} parser={viParser} style={{ width: '100%' }} placeholder="Mặc định: 1000" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Năng suất PC" name="nangSuatPc">
                <InputNumber min={0} max={999999999} formatter={viFormatter} parser={viParser} style={{ width: '100%' }} placeholder="PC" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Năng suất PL" name="nangSuatPl">
                <InputNumber min={0} max={999999999} formatter={viFormatter} parser={viParser} style={{ width: '100%' }} placeholder="PL" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Năng suất BBC1" name="nangSuatBbc1">
                <InputNumber min={0} max={999999999} formatter={viFormatter} parser={viParser} style={{ width: '100%' }} placeholder="BBC1" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Máy Móc PC" name="mayMocPc">
            <Select placeholder="Chọn máy móc PC" allowClear options={[
              { value: 'Máy nhũ hóa 500L', label: 'Máy nhũ hóa 500L' },
              { value: 'Máy Khuấy 1500L',  label: 'Máy Khuấy 1500L' },
              { value: 'Máy Khuấy 700L',   label: 'Máy Khuấy 700L' },
              { value: 'Máy nhũ hóa 100L', label: 'Máy nhũ hóa 100L' },
              { value: 'Thủ Công',         label: 'Thủ Công' },
            ]} />
          </Form.Item>

          <Form.Item label="Máy Móc PL" name="mayMocPl">
            <Select placeholder="Chọn máy móc PL" allowClear options={[
              { value: 'Máy Chiết Tube Hàn Nhiệt', label: 'Máy Chiết Tube Hàn Nhiệt' },
              { value: 'Máy Chiết Tube Hàn Seal',  label: 'Máy Chiết Tube Hàn Seal' },
              { value: 'Máy Chiết Bánh Răng',      label: 'Máy Chiết Bánh Răng' },
              { value: 'Máy Chiết 4 vòi bơm khí', label: 'Máy Chiết 4 vòi bơm khí' },
              { value: 'Máy Chiết 4 vòi bơm từ',  label: 'Máy Chiết 4 vòi bơm từ' },
              { value: 'Máy Chiết 2 vòi',          label: 'Máy Chiết 2 vòi' },
              { value: 'Máy Chiết mặt nạ',         label: 'Máy Chiết mặt nạ' },
              { value: 'Máy Chiết Nhu Động',       label: 'Máy Chiết Nhu Động' },
              { value: 'Máy Chiết Bột',            label: 'Máy Chiết Bột' },
              { value: 'Thủ Công/ Sục ozon',       label: 'Thủ Công/ Sục ozon' },
            ]} />
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
