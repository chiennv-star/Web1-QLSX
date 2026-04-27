import React, { useState, useEffect, useRef } from 'react'
import {
  Table, Button, Space, Typography, Input, Modal,
  Form, Popconfirm, message, Tag, Row, Col, InputNumber
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined
} from '@ant-design/icons'
import api from '../api/axios'

export default function ProductMasterPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [keyword, setKeyword] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form] = Form.useForm()
  const controlsRef = useRef(null)
  const [headerOffset, setHeaderOffset] = useState(0)

  useEffect(() => {
    if (controlsRef.current) setHeaderOffset(controlsRef.current.offsetHeight + 8)
  })

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
    form.setFieldsValue({ slTrungBinh: 1 })
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    form.setFieldsValue({
      ...item,
      slTrungBinh: item.slTrungBinh != null ? Number(item.slTrungBinh) : 1,
      nangSuatPc: item.nangSuatPc != null ? Number(item.nangSuatPc) : null,
      nangSuatPl: item.nangSuatPl != null ? Number(item.nangSuatPl) : null,
      nangSuatBbc1: item.nangSuatBbc1 != null ? Number(item.nangSuatBbc1) : null,
      mayMocPc: item.mayMocPc || '',
      mayMocPl: item.mayMocPl || '',
      mayMocBbc1: item.mayMocBbc1 || '',
      mayMocDg: item.mayMocDg || '',
    })
    setModalOpen(true)
  }

  const onSave = async () => {
    try {
      const values = await form.validateFields()
      if (editItem) {
        await api.put(`/product-master/${editItem.id}`, values)
        message.success('Cập nhật thành công')
      } else {
        await api.post('/product-master', values)
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

  const columns = [
    {
      title: 'Mã TP', dataIndex: 'maTp', key: 'maTp', width: 120,
      render: v => <Tag color="blue" style={{ fontWeight: 'bold' }}>{v}</Tag>
    },
    { title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 150 },
    { title: 'Tiến trình (Tên sản phẩm)', dataIndex: 'tienTrinh', key: 'tienTrinh' },
    {
      title: 'SL Trung bình', dataIndex: 'slTrungBinh', key: 'slTrungBinh', width: 120, align: 'right',
      render: v => v != null ? Number(v) : 1
    },
    {
      title: 'Năng suất PC', dataIndex: 'nangSuatPc', key: 'nangSuatPc', width: 120, align: 'right',
      render: v => v != null ? Number(v) : 1
    },
    {
      title: 'Năng suất PL', dataIndex: 'nangSuatPl', key: 'nangSuatPl', width: 120, align: 'right',
      render: v => v != null ? Number(v) : 1
    },
    {
      title: 'Năng suất BBC1', dataIndex: 'nangSuatBbc1', key: 'nangSuatBbc1', width: 130, align: 'right',
      render: v => v != null ? Number(v) : 1
    },
    { title: 'Máy Móc PC',   dataIndex: 'mayMocPc',   key: 'mayMocPc',   width: 140, render: v => v || <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'Máy Móc PL',   dataIndex: 'mayMocPl',   key: 'mayMocPl',   width: 140, render: v => v || <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'Máy Móc BBC1', dataIndex: 'mayMocBbc1', key: 'mayMocBbc1', width: 140, render: v => v || <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'Máy Móc ĐG',  dataIndex: 'mayMocDg',   key: 'mayMocDg',   width: 140, render: v => v || <span style={{ color: '#d9d9d9' }}>—</span> },
    {
      title: 'Thao tác', key: 'action', width: 100,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Xóa mục này?" onConfirm={() => handleDelete(record.id)}
            okText="Xóa" cancelText="Hủy">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <>
      <div ref={controlsRef} style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff', paddingBottom: 8 }}>
        <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>
          Danh mục Mã TP
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          Quản lý danh sách Mã TP kèm Mã Bravo và Tiến trình.
          Khi nhập Mã TP ở form Sản lượng, hệ thống sẽ tự động điền các thông tin này.
        </Typography.Paragraph>

        <Row gutter={12} style={{ marginBottom: 4 }} align="middle">
          <Col flex="auto">
            <Input.Search
              placeholder="Tìm theo Mã TP, Mã Bravo hoặc Tiến trình..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onSearch={v => fetchData(0, 20, v)}
              enterButton={<SearchOutlined />}
              allowClear
              onClear={() => { setKeyword(''); fetchData(0, 20, '') }}
            />
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => fetchData(0)} />
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                Thêm mã TP
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        size="middle"
        sticky={{ offsetHeader: headerOffset }}
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
        width={500}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Mã TP" name="maTp"
            rules={[{ required: true, message: 'Nhập Mã TP' }]}>
            <Input disabled={Boolean(editItem)} placeholder="Ví dụ: TP364" />
          </Form.Item>
          <Form.Item label="Mã Bravo" name="maBravo"
            rules={[{ required: true, message: 'Nhập Mã Bravo' }]}>
            <Input placeholder="Ví dụ: 10601364" />
          </Form.Item>
          <Form.Item label="Tiến trình (Tên sản phẩm)" name="tienTrinh"
            rules={[{ required: true, message: 'Nhập tên tiến trình' }]}>
            <Input placeholder="Ví dụ: Xịt khử mùi Wings up 24H 10ml" />
          </Form.Item>
          <Form.Item label="SL Trung bình" name="slTrungBinh"
            rules={[{ required: true, message: 'Nhập SL Trung bình' }]}>
            <InputNumber min={0.01} step={0.01} precision={2} style={{ width: '100%' }} placeholder="Mặc định: 1" />
          </Form.Item>
          <Form.Item label="Năng suất PC" name="nangSuatPc">
            <InputNumber min={0} step={0.0001} precision={4} style={{ width: '100%' }} placeholder="Nhập năng suất PC" />
          </Form.Item>
          <Form.Item label="Năng suất PL" name="nangSuatPl">
            <InputNumber min={0} step={0.0001} precision={4} style={{ width: '100%' }} placeholder="Nhập năng suất PL" />
          </Form.Item>
          <Form.Item label="Năng suất BBC1" name="nangSuatBbc1">
            <InputNumber min={0} step={0.0001} precision={4} style={{ width: '100%' }} placeholder="Nhập năng suất BBC1" />
          </Form.Item>
          <Form.Item label="Máy Móc PC" name="mayMocPc">
            <Input placeholder="Tên máy móc công đoạn PC" />
          </Form.Item>
          <Form.Item label="Máy Móc PL" name="mayMocPl">
            <Input placeholder="Tên máy móc công đoạn PL" />
          </Form.Item>
          <Form.Item label="Máy Móc BBC1" name="mayMocBbc1">
            <Input placeholder="Tên máy móc công đoạn BBC1" />
          </Form.Item>
          <Form.Item label="Máy Móc ĐG" name="mayMocDg">
            <Input placeholder="Tên máy móc công đoạn ĐG" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
