import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Layout, Menu, Button, Typography, Space, Avatar, Dropdown, Drawer, Grid, Badge, Tooltip } from 'antd'
import {
  TableOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ScheduleOutlined,
  WarningOutlined,
  CalendarOutlined,
  TrophyOutlined,
  BarChartOutlined,
  FileDoneOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  ArrowLeftOutlined,
  BellOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAutoReload } from '../hooks/useAutoReload'
import api from '../api/axios'
import WorkChecklistWidget from './WorkChecklistWidget'
import ChatWidget from './ChatWidget'

const { Header, Sider, Content } = Layout
const { useBreakpoint } = Grid

// ── Design tokens ─────────────────────────────────────────────────────────────
const NAV = {
  bg:     '#339999',
  logo:   '#277a7a',
  border: 'rgba(255,255,255,0.07)',
}

// ── Shared sidebar inner content ───────────────────────────────────────────────
function SidebarInner({ collapsed, location, menuItems, onNavigate }) {
  return (
    <>
      {/* Brand */}
      <div style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '0 8px',
        background: NAV.logo,
        borderBottom: `1px solid ${NAV.border}`,
        flexShrink: 0,
      }}>
        {!collapsed && (
          <div style={{ lineHeight: 1.3, overflow: 'hidden', textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#F1F5F9', letterSpacing: '0.04em', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
              QTSX SONG AN 🍀
            </div>
          </div>
        )}
      </div>

      {/* Nav menu */}
      <style>{`
        .nav-menu.ant-menu-dark .ant-menu-item { color: #e0ffff !important; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; font-size: 12px; }
        .nav-menu.ant-menu-dark .ant-menu-item .ant-menu-title-content { color: #e0ffff !important; }
        .nav-menu.ant-menu-dark .ant-menu-item:hover { color: #ffffff !important; background: rgba(255,255,255,0.15) !important; }
        .nav-menu.ant-menu-dark .ant-menu-item:hover .ant-menu-title-content { color: #ffffff !important; }
        .nav-menu.ant-menu-dark .ant-menu-item-selected { background: rgba(255,255,255,0.2) !important; color: #ffffff !important; }
        .nav-menu.ant-menu-dark .ant-menu-item-selected .ant-menu-title-content { color: #ffffff !important; }
        .nav-menu.ant-menu-dark .ant-menu-item .anticon { color: #e0ffff !important; }
        .nav-menu.ant-menu-dark .ant-menu-item-selected .anticon { color: #ffffff !important; }
      `}</style>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => onNavigate(key)}
        theme="dark"
        className="nav-menu"
        style={{ background: 'transparent', border: 'none', marginTop: 6, fontSize: 12 }}
      />

      {/* Bottom status */}
      {!collapsed && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '10px 14px',
          borderTop: `1px solid ${NAV.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#22C55E', boxShadow: '0 0 6px #22C55E',
          }} />
          <span style={{ fontSize: 10, color: '#64748B' }}>Hệ thống đang hoạt động</span>
        </div>
      )}
    </>
  )
}

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadByType, setUnreadByType] = useState({})
  const { user, logout, isAdmin, isAdminKH, isTKSX, isQuanDoc, isStageAdmin, canEditHangLoi, isNhanVien, isHCNS, isKeToan } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const pollRef = useRef(null)
  useAutoReload()

  const fetchUnread = useCallback(async () => {
    try {
      const [countRes, byTypeRes] = await Promise.all([
        api.get('/notifications/unread-count'),
        api.get('/notifications/unread-by-type'),
      ])
      setUnreadCount(countRes.data.count || 0)
      setUnreadByType(byTypeRes.data || {})
    } catch { /* non-blocking */ }
  }, [])

  useEffect(() => {
    fetchUnread()
    pollRef.current = setInterval(fetchUnread, 30000)
    return () => clearInterval(pollRef.current)
  }, [fetchUnread])

  // Reset badge khi vào trang thông báo
  useEffect(() => {
    if (location.pathname === '/notifications') {
      fetchUnread()
    }
  }, [location.pathname, fetchUnread])

  const mkBadgeIcon = (icon, count) =>
    count > 0
      ? <Badge count={count} size="small" style={{ background: '#e85d04' }} offset={[6, -2]}>{icon}</Badge>
      : icon

  const mkBadgeLabel = (label, count) =>
    count > 0
      ? <span>{label}<Badge count={count} size="small" style={{ background: '#e85d04', marginLeft: 6 }} /></span>
      : label

  const hangLoi   = unreadByType['HANG_LOI_NEW']  || 0
  const donHang   = unreadByType['DON_HANG_NEW']  || 0
  const lichSxNew = unreadByType['LICH_SX_NEW']   || 0

  const menuItems = isNhanVien()
    ? [
        {
          key: '/work-schedule',
          icon: <ScheduleOutlined />,
          label: 'Lịch làm việc',
        },
        { key: '/work-efficiency', icon: <TrophyOutlined />, label: 'Nhân Viên' },
      ]
    : isHCNS()
    ? [
        { key: '/employees', icon: <UserOutlined />, label: 'Nhân viên' },
      ]
    : isKeToan()
    ? [
        { key: '/',           icon: <TableOutlined />,  label: 'Sản lượng' },
        { key: '/daily-sl',   icon: <BarChartOutlined />, label: 'Sản lượng theo ngày' },
        { key: '/cham-cong',  icon: <FileDoneOutlined />, label: 'Chấm công' },
      ]
    : [
        { key: '/', icon: <TableOutlined />, label: 'Sản lượng' },
        { key: '/daily-sl',        icon: <BarChartOutlined />, label: 'Sản lượng theo ngày' },
        {
          key: '/work-schedule',
          icon: mkBadgeIcon(<ScheduleOutlined />, lichSxNew),
          label: mkBadgeLabel('Lịch làm việc', lichSxNew),
        },
        { key: '/khoach',          icon: <CalendarOutlined />, label: 'Kế hoạch' },
        { key: '/lenh-san-xuat',   icon: <FileDoneOutlined />, label: 'Lệnh Sản Xuất' },
        ...(canEditHangLoi() ? [{
          key: '/hang-loi',
          icon: <WarningOutlined />,
          label: 'Hàng Xử Lý',
        }] : []),
        ...(isAdmin() || isTKSX() || isQuanDoc() ? [
          { key: '/work-efficiency', icon: <TrophyOutlined />, label: 'Nhân Viên' },
        ] : []),
        ...(isAdmin() ? [
          { key: '/cham-cong', icon: <FileDoneOutlined />, label: 'Chấm công' },
        ] : []),
        { key: '/danh-muc',        icon: <AppstoreOutlined />, label: 'Quản Lý Danh Mục' },
        {
          key: '/notifications',
          icon: (
            <Badge count={unreadCount} size="small" style={{ background: '#008080' }} offset={[6, -2]}>
              <BellOutlined />
            </Badge>
          ),
          label: (
            <span>
              Thông báo
              {unreadCount > 0 && (
                <Badge count={unreadCount} size="small" style={{ background: '#008080', marginLeft: 6 }} />
              )}
            </span>
          ),
        },
        ...(isAdmin() ? [{ key: '/trash', icon: <DeleteOutlined style={{ color: '#f87171' }} />, label: <span style={{ color: '#f87171' }}>Thùng Rác</span> }] : []),
      ]

  const userMenu = {
    items: [{
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: () => { logout(); navigate('/login') },
    }],
  }

  const ROLE_LABELS = {
    ADMIN:              'Quản trị viên',
    TKSX:               'Tài khoản SX',
    QUAN_DOC:           'Quản lý (đọc)',
    ADMIN_KH:           'Admin Kế hoạch',
    ADMIN_PC:           'Admin PC',
    ADMIN_BBC1:         'Admin BBC1',
    ADMIN_PL:           'Admin PL',
    ADMIN_DG:           'Admin ĐG',
    ADMIN_PCPL1:        'Admin PCPL1',
    ADMIN_PCPL2:        'Admin PCPL2',
    ADMIN_PCPL3:        'Admin PCPL3',
    NHAN_VIEN:          'Nhân viên',
    NHAN_VIEN_PCPL1:    'Nhân viên PCPL1',
    NHAN_VIEN_PCPL2:    'Nhân viên PCPL2',
    NHAN_VIEN_PCPL3:    'Nhân viên PCPL3',
    NHAN_VIEN_BBC1:     'Nhân viên BBC1',
    NHAN_VIEN_DG:       'Nhân viên ĐG',
    HCNS:               'HCNS',
    KE_TOAN:            'Kế toán',
  }

  const handleNavigate = (key) => {
    navigate(key)
    if (isMobile) setDrawerOpen(false)
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>

      {/* ── Mobile: menu as Drawer overlay ── */}
      {isMobile && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          width={220}
          styles={{
            body: { padding: 0, background: NAV.bg, position: 'relative', overflow: 'hidden' },
            header: { display: 'none' },
          }}
        >
          <SidebarInner
            collapsed={false}
            location={location}
            menuItems={menuItems}
            onNavigate={handleNavigate}
          />
        </Drawer>
      )}

      {/* ── Desktop: fixed Sider ── */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={210}
          style={{
            background: NAV.bg,
            boxShadow: '4px 0 20px rgba(0,0,0,0.35)',
            position: 'relative',
            zIndex: 100,
          }}
        >
          <SidebarInner
            collapsed={collapsed}
            location={location}
            menuItems={menuItems}
            onNavigate={(key) => navigate(key)}
          />
        </Sider>
      )}

      <WorkChecklistWidget />
      <ChatWidget />
      <Layout style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* ── Top Header ── */}
        <Header style={{
          padding: isMobile ? '0 12px 0 8px' : '0 20px 0 16px',
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 8px rgba(29,78,216,0.10)',
          borderBottom: '1.5px solid #DBEAFE',
          height: 52,
          flexShrink: 0,
        }}>
          <Space size={4}>
            {/* Hamburger / collapse toggle */}
            <Button
              type="text"
              icon={isMobile
                ? <MenuUnfoldOutlined />
                : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)
              }
              onClick={() => isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed)}
              style={{ color: '#1D4ED8', fontSize: 17, fontWeight: 600, height: 38 }}
            />
            {/* Back button */}
            {location.pathname !== '/' && (
              <Button
                type="text"
                icon={<ArrowLeftOutlined style={{ color: '#fff' }} />}
                onClick={() => navigate(-1)}
                style={{
                  color: '#fff',
                  fontSize: 14,
                  height: 38,
                  background: '#00CC99',
                  borderRadius: 8,
                  paddingLeft: 10,
                  paddingRight: 14,
                  fontWeight: 600,
                  border: 'none',
                }}
              >
                {!isMobile && 'Quay lại'}
              </Button>
            )}
          </Space>

          <Space size={8} align="center">
          {/* Bell icon */}
          <Tooltip title="Thông báo">
            <Badge count={unreadCount} size="small" style={{ background: '#008080' }}>
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: 18, color: unreadCount > 0 ? '#008080' : '#64748B' }} />}
                onClick={() => navigate('/notifications')}
                style={{ height: 38, padding: '0 8px' }}
              />
            </Badge>
          </Tooltip>

          {/* User info */}
          <Dropdown menu={userMenu} placement="bottomRight">
            <Space style={{ cursor: 'pointer', gap: 8 }} align="center">
              <Avatar
                icon={<UserOutlined />}
                size={34}
                style={{
                  background: 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)',
                  boxShadow: '0 2px 8px rgba(29,78,216,0.35)',
                }}
              />
              {!isMobile && (
                <div style={{ lineHeight: 1.25 }}>
                  <Typography.Text strong style={{ display: 'block', color: '#1E293B', fontSize: 13 }}>
                    {user?.fullName || user?.username}
                  </Typography.Text>
                  <Typography.Text style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
                    {ROLE_LABELS[user?.role] || 'Nhân viên'}
                  </Typography.Text>
                </div>
              )}
            </Space>
          </Dropdown>
          </Space>
        </Header>

        {/* ── Page content ── */}
        <Content style={{
          margin: isMobile ? '6px' : '14px',
          background: '#fff',
          padding: 0,
          borderRadius: 10,
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          boxShadow: '0 2px 16px rgba(29,78,216,0.07)',
          border: '1px solid #DBEAFE',
        }}>
          <style>{`
            @keyframes pageEnter {
              from { opacity: 0; transform: translateY(6px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            .page-transition {
              animation: pageEnter 0.18s ease-out;
            }
          `}</style>
          <div key={location.pathname} className="page-transition" style={{ padding: isMobile ? 10 : 24 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
