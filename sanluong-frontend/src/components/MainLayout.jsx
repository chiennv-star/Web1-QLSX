import React, { useState } from 'react'
import { Layout, Menu, Button, Typography, Space, Avatar, Dropdown } from 'antd'
import {
  TableOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BookOutlined,
  ScheduleOutlined,
  InboxOutlined,
  WarningOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const { Header, Sider, Content } = Layout

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout, isAdmin, isAdminKH } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    {
      key: '/',
      icon: <TableOutlined />,
      label: 'Sản lượng',
    },
    {
      key: '/work-schedule',
      icon: <ScheduleOutlined />,
      label: 'Lịch làm việc',
    },
    {
      key: '/wip',
      icon: <InboxOutlined />,
      label: 'Hàng dở dang',
    },
    {
      key: '/khoach',
      icon: <CalendarOutlined />,
      label: 'Kế hoạch',
    },
    {
      key: '/hang-loi',
      icon: <WarningOutlined />,
      label: 'Hàng Lỗi',
    },
    ...(isAdmin() || isAdminKH() ? [{
      key: '/product-master',
      icon: <BookOutlined />,
      label: 'Danh mục Mã TP',
    }] : []),
    ...(isAdmin() ? [{
      key: '/users',
      icon: <UserOutlined />,
      label: 'Quản lý người dùng',
    }] : []),
  ]

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Đăng xuất',
        onClick: () => { logout(); navigate('/login') },
      },
    ],
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}
        style={{ background: '#001529' }}>
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: collapsed ? 14 : 16,
          padding: '0 8px',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          {collapsed ? 'SL' : 'Quản lý Sản lượng'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <Header style={{
          padding: '0 16px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
          flexShrink: 0
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Dropdown menu={userMenu} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ background: '#1890ff' }} />
              <Typography.Text strong>
                {user?.fullName || user?.username}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                ({user?.role === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên'})
              </Typography.Text>
            </Space>
          </Dropdown>
        </Header>

        <Content style={{ margin: '16px', background: '#fff', padding: 0, borderRadius: 8, flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <div style={{ padding: 24 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
