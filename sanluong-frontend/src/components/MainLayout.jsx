import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Layout, Menu, Button, Typography, Space, Avatar, Dropdown, Drawer, Grid, Badge, Tooltip, Modal, Form, Input, message } from 'antd'
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
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  TeamOutlined,
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

const KHT_TABS_ALL = [
  { key: 'BBC1',     label: 'BBC1'     },
  { key: 'Cân Chia', label: 'Cân Chia' },
  { key: 'PCPL1',    label: 'PCPL1'    },
  { key: 'PCPL2',    label: 'PCPL2'    },
  { key: 'PCPL3',    label: 'PL'       },
  { key: 'ĐG',       label: 'ĐG'       },
]

// ── Shared sidebar inner content ───────────────────────────────────────────────
function SidebarInner({ collapsed, location, menuItems, onNavigate, selectedKeys }) {
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
        .nav-menu.ant-menu-dark .ant-menu-submenu-title { color: #e0ffff !important; font-weight: 600; text-transform: uppercase !important; letter-spacing: 0.04em; font-size: 12px; }
        .nav-menu.ant-menu-dark .ant-menu-submenu-title:hover { color: #ffffff !important; background: rgba(255,255,255,0.15) !important; }
        .nav-menu.ant-menu-dark .ant-menu-submenu-title .anticon { color: #e0ffff !important; }
        .nav-menu.ant-menu-dark .ant-menu-submenu-open > .ant-menu-submenu-title { color: #e0ffff !important; }
        .nav-menu.ant-menu-dark .ant-menu-submenu-open > .ant-menu-submenu-title .anticon { color: #e0ffff !important; }
        .nav-menu.ant-menu-dark .ant-menu-sub { background: rgba(0,0,0,0.18) !important; }
        .nav-menu.ant-menu-dark .ant-menu-sub .ant-menu-item { font-size: 12px; font-weight: 600; text-transform: none !important; letter-spacing: 0; padding-left: 0 !important; padding-right: 0 !important; color: #cce0f5 !important; border-left: 3px solid transparent; height: 24px !important; line-height: 24px !important; display: flex !important; align-items: center !important; justify-content: flex-start !important; }
        .nav-menu.ant-menu-dark .ant-menu-sub .ant-menu-item .ant-menu-title-content { color: inherit !important; display: flex !important; align-items: center !important; width: 100%; }
        .nav-menu.ant-menu-dark .ant-menu-sub .ant-menu-item .ant-menu-title-content::before { content: "•"; width: 33.33%; text-align: center; flex-shrink: 0; font-size: 12px; opacity: 0.75; }
        .nav-menu.ant-menu-dark .ant-menu-sub .ant-menu-item:hover { color: #e2e8f0 !important; background: rgba(255,255,255,0.07) !important; border-left-color: rgba(20,184,166,0.5) !important; }
        .nav-menu.ant-menu-dark .ant-menu-sub .ant-menu-item-selected { background: rgba(20,184,166,0.12) !important; color: #ffffff !important; border-left: 3px solid #14b8a6 !important; font-weight: 600 !important; }
        .nav-menu.ant-menu-dark .ant-menu-sub .ant-menu-item-selected .ant-menu-title-content { color: #ffffff !important; }
      `}</style>
      <Menu
        mode="inline"
        selectedKeys={selectedKeys}
        defaultOpenKeys={selectedKeys.some(k => k.startsWith('kht:')) ? ['ke-hoach-to-group'] : []}
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
  const [lenhChuaPhatHanh, setLenhChuaPhatHanh] = useState(0)
  const [pwModal, setPwModal] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwForm] = Form.useForm()
  const { user, logout, isAdmin, isAdminKH, isTKSX, isTPSX, isQuanDoc, isStageAdmin, canEditHangLoi, isNhanVien, isHCNS, isKeToan, isManHinh } = useAuth()
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

  const fetchLenhBadge = useCallback(async () => {
    try {
      const { data } = await api.get('/lenh-san-xuat/count-chua-phat-hanh')
      setLenhChuaPhatHanh(data?.total || 0)
    } catch { /* non-blocking */ }
  }, [])

  useEffect(() => {
    fetchUnread()
    fetchLenhBadge()
    pollRef.current = setInterval(() => { fetchUnread(); fetchLenhBadge() }, 30000)
    return () => clearInterval(pollRef.current)
  }, [fetchUnread, fetchLenhBadge])

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

  // Tổ tabs hiển thị theo role (giống KeHoachToPage.visibleTabs)
  // PHẢI khai báo trước menuItems vì menuItems dùng visibleToTabs
  const visibleToTabs = (() => {
    const role = user?.role
    if (role === 'ADMIN_PCPL1') return KHT_TABS_ALL.filter(t => ['PCPL1', 'PCPL3'].includes(t.key))
    if (role === 'ADMIN_PCPL2') return KHT_TABS_ALL.filter(t => ['PCPL2', 'Cân Chia'].includes(t.key))
    if (role === 'ADMIN_PCPL3') return KHT_TABS_ALL.filter(t => t.key === 'PCPL3')
    if (role === 'ADMIN_BBC1')  return KHT_TABS_ALL.filter(t => t.key === 'BBC1')
    if (role === 'ADMIN_DG')    return KHT_TABS_ALL.filter(t => t.key === 'ĐG')
    return KHT_TABS_ALL
  })()

  const menuItems = isNhanVien()
    ? [
        {
          key: '/work-schedule',
          icon: <ScheduleOutlined />,
          label: 'Sản lượng tổ',
        },
        { key: '/work-efficiency', icon: <TrophyOutlined />, label: 'Nhân Viên' },
      ]
    : isManHinh()
    ? [
        { key: '/daily-sl', icon: <BarChartOutlined />, label: 'Báo cáo tổng hợp' },
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
          label: mkBadgeLabel('Sản lượng tổ', lichSxNew),
        },
        { key: '/khoach',          icon: <CalendarOutlined />,  label: 'Kế hoạch' },
        ...(!isAdminKH() ? [{
          key: 'ke-hoach-to-group',
          icon: <TeamOutlined />,
          label: 'Kế Hoạch Tổ',
          children: visibleToTabs.map(t => ({
            key: `kht:${t.key}`,
            label: t.label,
          })),
        }] : []),
        { key: '/lenh-san-xuat', icon: <FileDoneOutlined />, label: 'Lệnh Sản Xuất' },
        ...(canEditHangLoi() ? [{
          key: '/hang-loi',
          icon: <WarningOutlined />,
          label: 'Hàng Xử Lý',
        }] : []),
        ...(isAdmin() || isTKSX() || isTPSX() || isQuanDoc() || isStageAdmin() ? [
          { key: '/work-efficiency', icon: <TrophyOutlined />, label: 'Nhân Viên' },
        ] : []),
        ...(isAdmin() || isTPSX() || isQuanDoc() || isStageAdmin() ? [
          { key: '/cham-cong', icon: <FileDoneOutlined />, label: 'Chấm công' },
        ] : []),
        { key: '/danh-muc',        icon: <AppstoreOutlined />, label: 'Quản Lý Danh Mục' },
        ...(isAdmin() || isTPSX() ? [{
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
        }] : []),
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
    if (key.startsWith('kht:')) {
      const to = key.slice(4)
      sessionStorage.setItem('kehoachto_selectedTo', to)
      navigate('/ke-hoach-to', { state: { selectedTo: to } })
    } else {
      navigate(key)
    }
    if (isMobile) setDrawerOpen(false)
  }

  const selectedKeys = (() => {
    const p = location.pathname
    if (p === '/ke-hoach-to') {
      const saved = sessionStorage.getItem('kehoachto_selectedTo') || ''
      return saved ? [`kht:${saved}`] : [p]
    }
    return [p]
  })()

  const handleChangePw = async () => {
    const values = await pwForm.validateFields()
    if (values.newPassword !== values.confirmPassword)
      return message.error('Mật khẩu xác nhận không khớp')
    setPwSaving(true)
    try {
      await api.patch('/users/me/change-password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      })
      message.success('Đổi mật khẩu thành công')
      setPwModal(false)
      pwForm.resetFields()
    } catch (err) {
      message.error(err?.response?.data?.error || 'Đổi mật khẩu thất bại')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <>
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
            selectedKeys={selectedKeys}
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
            onNavigate={handleNavigate}
            selectedKeys={selectedKeys}
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
          {/* Bell icon — admin + TPSX */}
          {(isAdmin() || isTPSX()) && (
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
          )}

          {/* User info */}
          <Dropdown menu={userMenu} placement="bottomRight">
            <Space style={{ cursor: 'pointer', gap: 8 }} align="center">
              <Tooltip title="Double-click để đổi mật khẩu">
                <Avatar
                  icon={<UserOutlined />}
                  size={34}
                  style={{
                    background: 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)',
                    boxShadow: '0 2px 8px rgba(29,78,216,0.35)',
                  }}
                  onDoubleClick={e => { e.stopPropagation(); pwForm.resetFields(); setPwModal(true) }}
                />
              </Tooltip>
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
          {(() => {
            const isFullHeight = location.pathname === '/ke-hoach-to'
            return (
              <div
                key={location.pathname}
                className="page-transition"
                style={{
                  padding: isFullHeight ? 0 : (isMobile ? 10 : 24),
                  height: isFullHeight ? '100%' : 'auto',
                  overflow: isFullHeight ? 'hidden' : undefined,
                  boxSizing: 'border-box',
                }}
              >
                <Outlet />
              </div>
            )
          })()}
        </Content>
      </Layout>
    </Layout>

    <Modal
      open={pwModal}
      title={<Space><LockOutlined style={{ color: '#1D4ED8' }} /><span>Đổi mật khẩu</span></Space>}
      onOk={handleChangePw}
      onCancel={() => { setPwModal(false); pwForm.resetFields() }}
      okText="Xác nhận" cancelText="Huỷ"
      confirmLoading={pwSaving}
      width={420}
      destroyOnHidden
    >
      <Form form={pwForm} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item label="Mật khẩu hiện tại" name="oldPassword"
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}>
          <Input.Password placeholder="Nhập mật khẩu hiện tại" autoFocus
            iconRender={v => v ? <EyeTwoTone /> : <EyeInvisibleOutlined />} />
        </Form.Item>
        <Form.Item label="Mật khẩu mới" name="newPassword"
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới' }, { min: 6, message: 'Ít nhất 6 ký tự' }]}>
          <Input.Password placeholder="Nhập mật khẩu mới"
            iconRender={v => v ? <EyeTwoTone /> : <EyeInvisibleOutlined />} />
        </Form.Item>
        <Form.Item label="Xác nhận mật khẩu mới" name="confirmPassword"
          rules={[{ required: true, message: 'Vui lòng xác nhận mật khẩu mới' }]}>
          <Input.Password placeholder="Nhập lại mật khẩu mới"
            iconRender={v => v ? <EyeTwoTone /> : <EyeInvisibleOutlined />} />
        </Form.Item>
      </Form>
    </Modal>
    </>
  )
}
