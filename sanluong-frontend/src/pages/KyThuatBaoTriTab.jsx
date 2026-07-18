import React, { useState, useEffect, useMemo } from 'react'
import {
  Table, Button, Modal, Form, Input, Space, message, Popconfirm, Spin,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import api from '../api/axios'

export default function KyThuatBaoTriTab() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/ky-thuat/bao-tri')
      setData(res)
    } catch { message.error('Tải danh mục bảo trì thất bại') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return data
    return data.filter(r => (r.tenThietBi || '').toLowerCase().includes(kw))
  }, [data, keyword])

  const openAdd = () => { setEditRecord(null); form.resetFields(); setModalOpen(true) }
  const openEdit = (record) => { setEditRecord(record); form.setFieldsValue(record); setModalOpen(true) }

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      if (editRecord) {
        const { data: updated } = await api.put(`/ky-thuat/bao-tri/${editRecord.id}`, values)
        setData(prev => prev.map(r => r.id === editRecord.id ? updated : r))
        message.success('Cập nhật thành công')
      } else {
        const { data: created } = await api.post('/ky-thuat/bao-tri', values)
        setData(prev => [...prev, created])
        message.success('Thêm mới thành công')
      }
      setModalOpen(false)
    } catch { message.error('Lưu thất bại') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/ky-thuat/bao-tri/${id}`)
      setData(prev => prev.filter(r => r.id !== id))
      message.success('Đã xóa')
    } catch { message.error('Xóa thất bại') }
  }

  const columns = [
    { title: '#', key: 'stt', width: 44, render: (_, __, i) => i + 1 },
    { title: 'Tên máy móc thiết bị', dataIndex: 'tenThietBi', minWidth: 220 },
    { title: 'Lịch 6 tháng đầu', dataIndex: 'lich6tDau', width: 180, render: v => v || <span style={{ color: '#bbb' }}>—</span> },
    { title: 'Lịch 6 tháng cuối', dataIndex: 'lich6tCuoi', width: 180, render: v => v || <span style={{ color: '#bbb' }}>—</span> },
    { title: 'Ghi chú', dataIndex: 'ghiChu', width: 200 },
    {
      title: '', key: 'actions', width: 90, fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Xóa thiết bị này?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }} wrap>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm theo tên thiết bị…"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Thêm thiết bị</Button>
      </Space>
      <Spin spinning={loading}>
        <Table
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={filtered}
          sticky
          scroll={{ x: 800, y: 520 }}
          pagination={{ pageSize: 30, showTotal: t => `${t} thiết bị` }}
        />
      </Spin>

      <Modal
        open={modalOpen}
        title={editRecord ? 'Sửa thiết bị bảo trì' : 'Thêm thiết bị bảo trì'}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText="Lưu" cancelText="Hủy"
        width={520}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Tên máy móc thiết bị" name="tenThietBi" rules={[{ required: true, message: 'Nhập tên thiết bị' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Lịch bảo trì 6 tháng đầu" name="lich6tDau">
            <Input placeholder="VD: Tháng 3/2026" />
          </Form.Item>
          <Form.Item label="Lịch bảo trì 6 tháng cuối" name="lich6tCuoi">
            <Input placeholder="VD: Tháng 9/2026" />
          </Form.Item>
          <Form.Item label="Ghi chú" name="ghiChu">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
