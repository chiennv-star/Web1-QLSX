import React, { useState, useEffect } from 'react'
import {
  Table, Button, Space, Typography, Input, Modal,
  Form, Popconfirm, message, Row, Col, InputNumber, Tag
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined
} from '@ant-design/icons'
import api from '../api/axios'

const fmt = (v) => (v != null && v !== 0 ? Number(v).toLocaleString('vi-VN') : '—')

export default function NangSuatPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [keyword, setKeyword] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form] = Form.useForm()

  const fetchData = async (page = 0, size = 20, kw = keyword) => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/nang-suat', {
        params: { keyword: kw || undefined, page, size }
      })
      setData(res.content)
      setPagination(p => ({ ...p, total: res.totalElements }))
    } catch {
      message.error('Không thể tải dữ liệu năng suất')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData(0) }, [])

  const openCreate = () => {
    setEditItem(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    form.setFieldsValue({
      ...item,
      spBbc1: item.spBbc1 != null ? Number(item.spBbc1) : null,
      spPc: item.spPc != null ? Number(item.spPc) : null,
      spPl: item.spPl != null ? Number(item.spPl) : null,
      spDg: item.spDg != null ? Number(item.spDg) : null,
    })
    setModalOpen(true)
  }

  const onSave = async () => {
    try {
      const values = await form.validateFields()
      if (editItem) {
        await api.put(`/nang-suat/${editItem.id}`, values)
        message.success('Cập nhật thành công')
      } else {
        await api.post('/nang-suat', values)
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
      await api.delete(`/nang-suat/${id}`)
      message.success('Đã xóa')
      fetchData(pagination.current - 1)
    } catch {
      message.error('Xóa thất bại')
    }
  }

  const numCol = (title, key, width = 110) => ({
    title,
    dataIndex: key,
    key,
    width,
    align: 'right',
    render: v => fmt(v),
  })

  const columns = [
    {
      title: 'Mã Bravo', dataIndex: 'maSanPham', key: 'maSanPham', width: 120, fixed: 'left', align: 'center',
      render: v => <Tag color="blue" style={{ fontWeight: 'bold', margin: 0 }}>{v}</Tag>
    },
    { title: 'Tên sản phẩm', dataIndex: 'tenSanPham', key: 'tenSanPham',
      render: v => <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{v}</span>
    },
    numCol('SP/BBC1', 'spBbc1', 100),
    numCol('SP/PC', 'spPc', 100),
    numCol('SP/PL', 'spPl', 100),
    numCol('SP/ĐG', 'spDg', 100),
    {
      title: 'Thao tác', key: 'action', width: 90, fixed: 'right',
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
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff', paddingBottom: 8 }}>
        <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>
          Năng suất sản phẩm
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          Quản lý định mức năng suất theo từng công đoạn: BBC1, Pha chế, Phân liều, Đóng gói.
        </Typography.Paragraph>

        <Row gutter={12} style={{ marginBottom: 4 }} align="middle">
          <Col flex="auto">
            <Input.Search
              placeholder="Tìm theo Mã Bravo hoặc Tên sản phẩm..."
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
                Thêm mới
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
        scroll={{ x: 1100 }}
        sticky
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
        title={editItem ? 'Chỉnh sửa năng suất' : 'Thêm năng suất mới'}
        open={modalOpen}
        onOk={onSave}
        onCancel={() => setModalOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item label="Mã Bravo" name="maSanPham"
                rules={[{ required: true, message: 'Nhập Mã Bravo' }]}>
                <Input placeholder="VD: 10601364" />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item label="Tên sản phẩm" name="tenSanPham"
                rules={[{ required: true, message: 'Nhập tên sản phẩm' }]}>
                <Input placeholder="VD: Xịt khử mùi Wings up 24H 10ml" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="SP/BBC1" name="spBbc1">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="SP/PC" name="spPc">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="SP/PL" name="spPl">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="SP/ĐG" name="spDg">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  )
}
