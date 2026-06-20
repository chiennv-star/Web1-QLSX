import React from 'react'
import { Form, Input, Button, Card, Typography, message, Alert } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function ForceChangePasswordPage() {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = React.useState(false)

  if (!user) return <Navigate to="/login" replace />
  if (!user.mustChangePassword) return <Navigate to="/" replace />

  const onFinish = async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Mật khẩu xác nhận không khớp')
      return
    }
    setLoading(true)
    try {
      await api.patch('/users/me/change-password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      })
      updateUser({ mustChangePassword: false })
      message.success('Đổi mật khẩu thành công!')
      navigate('/', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.error || 'Đổi mật khẩu thất bại, thử lại.'
      message.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #6366f1 100%)',
    }}>
      <Card style={{
        width: 420,
        borderRadius: 16,
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.15)',
        overflow: 'hidden',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 60, height: 60,
            background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 28,
            boxShadow: '0 4px 16px rgba(245,158,11,0.5)',
          }}>
            <LockOutlined style={{ color: '#fff', fontSize: 26 }} />
          </div>
          <Typography.Title level={4} style={{ margin: 0, color: '#1e1b4b', fontWeight: 700 }}>
            Đổi mật khẩu bắt buộc
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Xin chào <b>{user.fullName || user.username}</b>
          </Typography.Text>
        </div>

        <Alert
          type="warning"
          showIcon
          message="Tài khoản của bạn đang dùng mật khẩu mặc định. Vui lòng đổi mật khẩu mới trước khi tiếp tục."
          style={{ marginBottom: 20, fontSize: 13 }}
        />

        <Form form={form} layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            label="Mật khẩu hiện tại (mặc định)"
            name="oldPassword"
            rules={[{ required: true, message: 'Nhập mật khẩu hiện tại' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu hiện tại" />
          </Form.Item>
          <Form.Item
            label="Mật khẩu mới"
            name="newPassword"
            rules={[
              { required: true, message: 'Nhập mật khẩu mới' },
              { min: 6, message: 'Tối thiểu 6 ký tự' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Tối thiểu 6 ký tự" />
          </Form.Item>
          <Form.Item
            label="Xác nhận mật khẩu mới"
            name="confirmPassword"
            rules={[{ required: true, message: 'Xác nhận mật khẩu mới' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu mới" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 8 }}>
            <Button type="primary" htmlType="submit" block loading={loading}
              style={{ background: '#f59e0b', borderColor: '#f59e0b' }}>
              Xác nhận đổi mật khẩu
            </Button>
          </Form.Item>
          <Button type="link" block onClick={logout} style={{ color: '#94a3b8', fontSize: 12 }}>
            Đăng xuất
          </Button>
        </Form>
      </Card>
    </div>
  )
}
