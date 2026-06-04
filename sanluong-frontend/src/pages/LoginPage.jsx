import React from 'react'
import { Form, Input, Button, Card, Typography, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const onFinish = async (values) => {
    try {
      const { data } = await api.post('/auth/login', values)
      login(data)
      navigate('/')
    } catch {
      message.error('Tên đăng nhập hoặc mật khẩu không đúng')
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
        width: 400,
        borderRadius: 16,
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.15)',
        overflow: 'hidden',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 60, height: 60,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 28,
            boxShadow: '0 4px 16px rgba(99,102,241,0.5)',
          }}>
            ⚡
          </div>
          <Typography.Title level={3} style={{ margin: 0, color: '#1e1b4b', fontWeight: 700 }}>
            Quản Trị Sản Xuất Song An
          </Typography.Title>
          <Typography.Text type="secondary">Đăng nhập để tiếp tục</Typography.Text>
        </div>

        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: 'Nhập tên đăng nhập' }]}>
            <Input prefix={<UserOutlined />} placeholder="Tên đăng nhập" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
