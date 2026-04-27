import React, { useState, useEffect } from 'react'
import {
  Table, Button, Space, Typography, Modal, Form,
  Input, Select, Switch, Popconfirm, message, Tag
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '../api/axios'

const { Option } = Select

export default function UserManagePage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form] = Form.useForm()

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/users')
      setUsers(data)
    } catch {
      message.error('Không thể tải danh sách người dùng')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const openCreate = () => {
    setEditUser(null)
    form.resetFields()
    form.setFieldsValue({ enabled: true, role: 'NHAN_VIEN' })
    setModalOpen(true)
  }

  const openEdit = (user) => {
    setEditUser(user)
    form.setFieldsValue({ ...user, password: '' })
    setModalOpen(true)
  }

  const onSave = async () => {
    try {
      const values = await form.validateFields()
      if (editUser) {
        await api.put(`/users/${editUser.id}`, values)
        message.success('Cập nhật thành công')
      } else {
        await api.post('/users', values)
        message.success('Tạo tài khoản thành công')
      }
      setModalOpen(false)
      fetchUsers()
    } catch (err) {
      if (err?.response) message.error(err.response.data?.message || 'Lưu thất bại')
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/users/${id}`)
      message.success('Đã xóa người dùng')
      fetchUsers()
    } catch {
      message.error('Xóa thất bại')
    }
  }

  const columns = [
    { title: 'Tên đăng nhập', dataIndex: 'username', key: 'username', width: 150 },
    { title: 'Họ tên', dataIndex: 'fullName', key: 'fullName' },
    {
      title: 'Vai trò', dataIndex: 'role', key: 'role', width: 160,
      render: r => {
        const map = {
          ADMIN:      { color: 'blue',     label: 'Quản trị viên' },
          NHAN_VIEN:  { color: 'green',    label: 'Nhân viên' },
          ADMIN_KH:   { color: 'cyan',     label: 'Admin Kế hoạch' },
          ADMIN_PC:   { color: 'purple',   label: 'Admin PC' },
          ADMIN_BBC1: { color: 'purple',   label: 'Admin BBC1' },
          ADMIN_PL:   { color: 'purple',   label: 'Admin PL' },
          ADMIN_DG:   { color: 'purple',   label: 'Admin ĐG' },
        }
        const { color, label } = map[r] || { color: 'default', label: r }
        return <Tag color={color}>{label}</Tag>
      }
    },
    {
      title: 'Trạng thái', dataIndex: 'enabled', key: 'enabled', width: 120,
      render: v => <Tag color={v ? 'green' : 'red'}>{v ? 'Hoạt động' : 'Vô hiệu'}</Tag>
    },
    {
      title: 'Thao tác', key: 'action', width: 120,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Xóa người dùng?" onConfirm={() => handleDelete(record.id)}
            okText="Xóa" cancelText="Hủy">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Quản lý Người dùng
      </Typography.Title>

      <Button type="primary" icon={<PlusOutlined />}
        onClick={openCreate} style={{ marginBottom: 16 }}>
        Thêm người dùng
      </Button>

      <Table columns={columns} dataSource={users} rowKey="id"
        loading={loading} pagination={false} />

      <Modal
        title={editUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
        open={modalOpen}
        onOk={onSave}
        onCancel={() => setModalOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Tên đăng nhập" name="username"
            rules={[{ required: true, message: 'Nhập tên đăng nhập' }]}>
            <Input disabled={Boolean(editUser)} />
          </Form.Item>
          <Form.Item label="Mật khẩu" name="password"
            rules={editUser ? [] : [{ required: true, message: 'Nhập mật khẩu' }]}>
            <Input.Password placeholder={editUser ? 'Để trống nếu không đổi' : ''} />
          </Form.Item>
          <Form.Item label="Họ tên" name="fullName">
            <Input />
          </Form.Item>
          <Form.Item label="Vai trò" name="role"
            rules={[{ required: true, message: 'Chọn vai trò' }]}>
            <Select>
              <Option value="ADMIN">Quản trị viên</Option>
              <Option value="NHAN_VIEN">Nhân viên</Option>
              <Option value="ADMIN_KH">Admin Kế hoạch (sản lượng, kế hoạch, danh mục, WIP)</Option>
              <Option value="ADMIN_PC">Admin PC (chỉ sửa Lịch làm việc PC)</Option>
              <Option value="ADMIN_BBC1">Admin BBC1 (chỉ sửa Lịch làm việc BBC1)</Option>
              <Option value="ADMIN_PL">Admin PL (chỉ sửa Lịch làm việc PL)</Option>
              <Option value="ADMIN_DG">Admin ĐG (chỉ sửa Lịch làm việc ĐG)</Option>
            </Select>
          </Form.Item>
          {editUser && (
            <Form.Item label="Trạng thái" name="enabled" valuePropName="checked">
              <Switch checkedChildren="Hoạt động" unCheckedChildren="Vô hiệu" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  )
}
