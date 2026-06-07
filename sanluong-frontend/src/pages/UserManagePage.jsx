import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Table, Button, Space, Modal, Form,
  Input, Select, Switch, Popconfirm, message, Tag, Tooltip
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SafetyOutlined, KeyOutlined, WifiOutlined } from '@ant-design/icons'
import api from '../api/axios'

const { Option } = Select

const ROLE_MAP = {
  ADMIN:            { color: 'blue',     label: 'Quản trị viên' },
  TKSX:             { color: 'blue',     label: 'Tài khoản SX' },
  QUAN_DOC:         { color: 'default',  label: 'Quản lý (đọc)' },
  NHAN_VIEN:        { color: 'green',    label: 'Nhân viên' },
  NHAN_VIEN_PCPL1:  { color: 'cyan',     label: 'NV PCPL1' },
  NHAN_VIEN_PCPL2:  { color: 'cyan',     label: 'NV PCPL2' },
  NHAN_VIEN_PCPL3:  { color: 'cyan',     label: 'NV PCPL3' },
  NHAN_VIEN_BBC1:   { color: 'volcano',  label: 'NV BBC1' },
  NHAN_VIEN_DG:     { color: 'gold',     label: 'NV ĐG' },
  ADMIN_KH:         { color: 'cyan',     label: 'Admin Kế hoạch' },
  ADMIN_PC:         { color: 'purple',   label: 'Admin PC' },
  ADMIN_BBC1:       { color: 'volcano',  label: 'Admin BBC1' },
  ADMIN_PL:         { color: 'purple',   label: 'Admin PL' },
  ADMIN_DG:         { color: 'gold',     label: 'Admin ĐG' },
  ADMIN_PCPL1:      { color: 'geekblue', label: 'Admin PCPL1' },
  ADMIN_PCPL2:      { color: 'geekblue', label: 'Admin PCPL2' },
  ADMIN_PCPL3:      { color: 'geekblue', label: 'Admin PCPL3' },
  HCNS:             { color: 'magenta',  label: 'HCNS' },
  KE_TOAN:          { color: 'orange',   label: 'Kế toán' },
}

export default function UserManagePage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form] = Form.useForm()
  const watchedRole = Form.useWatch('role', form)

  const [pwModal, setPwModal] = useState(false)
  const [pwUser, setPwUser] = useState(null)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwForm] = Form.useForm()

  const openChangePw = (user) => {
    setPwUser(user)
    pwForm.resetFields()
    setPwModal(true)
  }

  const handleChangePw = async () => {
    try {
      const { newPassword } = await pwForm.validateFields()
      setPwSaving(true)
      await api.put(`/users/${pwUser.id}`, {
        username: pwUser.username,
        fullName: pwUser.fullName,
        role: pwUser.role,
        enabled: pwUser.enabled,
        maNhanVien: pwUser.maNhanVien,
        password: newPassword,
      })
      message.success(`Đã đổi mật khẩu cho "${pwUser.username}"`)
      setPwModal(false)
    } catch (err) {
      if (err?.response) message.error(err.response.data?.message || 'Đổi mật khẩu thất bại')
    } finally {
      setPwSaving(false)
    }
  }

  const toolbarRef = useRef(null)
  const [toolbarH, setToolbarH] = useState(0)
  useEffect(() => {
    if (!toolbarRef.current) return
    const obs = new ResizeObserver(() => setToolbarH(toolbarRef.current?.offsetHeight || 0))
    obs.observe(toolbarRef.current)
    return () => obs.disconnect()
  }, [])

  const [onlineSet, setOnlineSet] = useState(new Set())
  const pollOnlineRef = useRef(null)
  const fetchOnline = useCallback(async () => {
    try {
      const { data } = await api.get('/chat/online')
      setOnlineSet(new Set(data.usernames || []))
    } catch { /* non-blocking */ }
  }, [])
  useEffect(() => {
    fetchOnline()
    pollOnlineRef.current = setInterval(fetchOnline, 30000)
    return () => clearInterval(pollOnlineRef.current)
  }, [fetchOnline])

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
    {
      title: 'Tên Đăng Nhập', dataIndex: 'username', key: 'username', width: 160,
      render: v => <span style={{ fontWeight: 700, color: '#1677ff', fontFamily: 'monospace' }}>{v}</span>
    },
    {
      title: 'Họ Tên', dataIndex: 'fullName', key: 'fullName',
      render: v => v ? <span style={{ fontWeight: 500 }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Mã NV', dataIndex: 'maNhanVien', key: 'maNhanVien', width: 100,
      render: (v, r) => r.role?.startsWith('NHAN_VIEN') && v
        ? <Tag color="cyan" style={{ marginRight: 0, fontFamily: 'monospace' }}>{v}</Tag>
        : <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Vai Trò', dataIndex: 'role', key: 'role', width: 160,
      render: r => {
        const { color, label } = ROLE_MAP[r] || { color: 'default', label: r }
        return <Tag color={color} style={{ marginRight: 0, fontWeight: 600 }}>{label}</Tag>
      }
    },
    {
      title: 'Trạng Thái', dataIndex: 'enabled', key: 'enabled', width: 110, align: 'center',
      render: v => <Tag color={v ? 'green' : 'red'} style={{ marginRight: 0, fontWeight: 600 }}>{v ? 'Hoạt động' : 'Vô hiệu'}</Tag>
    },
    {
      title: 'Online', key: 'online', width: 90, align: 'center',
      render: (_, record) => onlineSet.has(record.username)
        ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              width: 9, height: 9, borderRadius: '50%',
              background: '#22c55e', boxShadow: '0 0 6px #22c55e',
              display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>Online</span>
          </span>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              width: 9, height: 9, borderRadius: '50%',
              background: '#d1d5db', display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{ fontSize: 11, color: '#9ca3af' }}>—</span>
          </span>
        ),
      sorter: (a, b) => (onlineSet.has(b.username) ? 1 : 0) - (onlineSet.has(a.username) ? 1 : 0),
    },
    {
      title: 'Thao Tác', key: 'action', width: 120, align: 'center',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Sửa">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title="Đổi mật khẩu">
            <Button size="small" icon={<KeyOutlined />} onClick={() => openChangePw(record)}
              style={{ color: '#d48806', borderColor: '#d48806' }} />
          </Tooltip>
          <Popconfirm title="Xóa người dùng?" onConfirm={() => handleDelete(record.id)}
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
        .um-table .ant-table-thead > tr > th {
          background: #009999 !important; color: #ffffff !important;
          font-size: 11px !important; text-transform: uppercase;
          padding: 7px 12px !important; letter-spacing: 0.4px;
          border-right: 1px solid #007a7a !important;
        }
        .um-table .ant-table-thead > tr > th::before { display: none !important; }
        .um-table .ant-table-tbody > tr > td { padding: 8px 12px !important; vertical-align: middle; }
        .um-table .ant-table-tbody > tr:hover > td { background: #EAECF2 !important; }
        .um-table .row-stripe td { background: #fafbff !important; }
      `}</style>

      {/* Toolbar */}
      <div ref={toolbarRef} style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: '#fff', borderBottom: '2px solid #DDE1E8',
        padding: '10px 0 12px', marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontWeight: 800, fontSize: 16, color: '#1E3A5F' }}>
          <SafetyOutlined style={{ marginRight: 6, color: '#4db3d4' }} />
          Quản lý Người dùng
        </span>
        {onlineSet.size > 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: '#f0fdf4', border: '1px solid #86efac',
            borderRadius: 20, padding: '3px 10px',
          }}>
            <WifiOutlined style={{ color: '#16a34a', fontSize: 12 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>
              {onlineSet.size} đang online
            </span>
          </span>
        )}
        <Button type="primary" icon={<PlusOutlined />} size="small" onClick={openCreate}
          style={{ marginLeft: 'auto', background: '#1D4ED8', borderColor: '#1D4ED8' }}>
          Thêm người dùng
        </Button>
      </div>

      <Table
        className="um-table"
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        size="small"
        sticky={{ offsetHeader: toolbarH }}
        rowClassName={(_, i) => i % 2 !== 0 ? 'row-stripe' : ''}
        pagination={{
          showTotal: t => `Tổng ${t} người dùng`,
          showSizeChanger: true,
          defaultPageSize: 50,
        }}
      />

      <Modal
        title={
          <span>
            <KeyOutlined style={{ color: '#d48806', marginRight: 8 }} />
            Đổi mật khẩu — <span style={{ fontFamily: 'monospace', color: '#1677ff' }}>{pwUser?.username}</span>
          </span>
        }
        open={pwModal}
        onOk={handleChangePw}
        onCancel={() => setPwModal(false)}
        okText="Đổi mật khẩu"
        cancelText="Hủy"
        confirmLoading={pwSaving}
        width={400}
      >
        <Form form={pwForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Mật khẩu mới" name="newPassword"
            rules={[
              { required: true, message: 'Nhập mật khẩu mới' },
              { min: 6, message: 'Ít nhất 6 ký tự' },
            ]}>
            <Input.Password placeholder="Nhập mật khẩu mới" autoComplete="new-password" />
          </Form.Item>
          <Form.Item label="Xác nhận mật khẩu" name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Xác nhận mật khẩu' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp'))
                },
              }),
            ]}>
            <Input.Password placeholder="Nhập lại mật khẩu" autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
        open={modalOpen}
        onOk={onSave}
        onCancel={() => setModalOpen(false)}
        okText="Lưu"
        cancelText="Hủy"
        width={480}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Tên đăng nhập" name="username"
            rules={[{ required: true, message: 'Nhập tên đăng nhập' }]}>
            <Input disabled={Boolean(editUser)} placeholder="VD: adminPCPL1" />
          </Form.Item>
          <Form.Item label="Mật khẩu" name="password"
            rules={editUser ? [] : [{ required: true, message: 'Nhập mật khẩu' }]}>
            <Input.Password placeholder={editUser ? 'Để trống nếu không đổi' : 'Nhập mật khẩu'} />
          </Form.Item>
          <Form.Item label="Họ tên" name="fullName">
            <Input placeholder="Họ và tên đầy đủ" />
          </Form.Item>
          <Form.Item label="Vai trò" name="role"
            rules={[{ required: true, message: 'Chọn vai trò' }]}>
            <Select>
              <Option value="ADMIN">Quản trị viên (toàn quyền)</Option>
              <Option value="TKSX">Tài khoản SX (như ADMIN, trừ Lệnh Sản Xuất)</Option>
              <Option value="QUAN_DOC">Quản lý đọc (chỉ xem, không sửa)</Option>
              <optgroup label="── Nhân viên ──" />
              <Option value="NHAN_VIEN">Nhân viên (tất cả nhóm)</Option>
              <Option value="NHAN_VIEN_PCPL1">Nhân viên PCPL1</Option>
              <Option value="NHAN_VIEN_PCPL2">Nhân viên PCPL2</Option>
              <Option value="NHAN_VIEN_PCPL3">Nhân viên PCPL3</Option>
              <Option value="NHAN_VIEN_BBC1">Nhân viên BBC1</Option>
              <Option value="NHAN_VIEN_DG">Nhân viên ĐG</Option>
              <optgroup label="── Admin công đoạn ──" />
              <Option value="ADMIN_KH">Admin Kế hoạch (sản lượng, kế hoạch, danh mục, WIP)</Option>
              <Option value="ADMIN_PC">Admin PC (Lịch làm việc PC, xem toàn bộ Hiệu quả)</Option>
              <Option value="ADMIN_BBC1">Admin BBC1 (Lịch làm việc BBC1, chỉ xem Hiệu quả BBC1)</Option>
              <Option value="ADMIN_PL">Admin PL (Lịch làm việc PL, xem toàn bộ Hiệu quả PL)</Option>
              <Option value="ADMIN_DG">Admin ĐG (Lịch làm việc ĐG, chỉ xem Hiệu quả ĐG)</Option>
              <Option value="ADMIN_PCPL1">Admin PCPL1 (Lịch làm việc, chỉ xem Hiệu quả PCPL1)</Option>
              <Option value="ADMIN_PCPL2">Admin PCPL2 (Lịch làm việc, chỉ xem Hiệu quả PCPL2)</Option>
              <Option value="ADMIN_PCPL3">Admin PCPL3 (Lịch làm việc, chỉ xem Hiệu quả PCPL3)</Option>
              <optgroup label="── Bộ phận hỗ trợ ──" />
              <Option value="HCNS">HCNS (chỉ xem nhân viên)</Option>
              <Option value="KE_TOAN">Kế toán (sản lượng, sản lượng theo ngày, chấm công)</Option>
            </Select>
          </Form.Item>
          {watchedRole?.startsWith('NHAN_VIEN') && (
            <Form.Item label="Mã nhân viên" name="maNhanVien"
              rules={[{ required: true, message: 'Nhập mã NV (VD: SA150)' }]}
              extra="Nhập đúng mã NV trong danh sách nhân sự để liên kết dữ liệu">
              <Input placeholder="VD: SA150" style={{ textTransform: 'uppercase' }}
                onChange={e => form.setFieldValue('maNhanVien', e.target.value.toUpperCase())} />
            </Form.Item>
          )}
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
