import React, { useEffect, useState, useCallback } from 'react'
import { Button, Tooltip, message, Spin, Tag, Checkbox, Popconfirm } from 'antd'
import {
  BellFilled, CheckOutlined, SwapOutlined, ReloadOutlined,
  FileAddOutlined, WarningOutlined, CheckCircleFilled,
  ClockCircleOutlined, InboxOutlined, EyeOutlined, ShoppingOutlined,
  CalendarOutlined, BarChartOutlined, ArrowRightOutlined,
  DeleteOutlined, CheckSquareOutlined, BorderOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

dayjs.extend(relativeTime)
dayjs.locale('vi')

/* ── Type metadata ──────────────────────────────────────────────────── */
const TYPE_CONFIG = {
  LENH_SX_NEW: {
    Icon: FileAddOutlined,
    iconColor: '#1d4ed8',
    iconBg: 'linear-gradient(135deg,#dbeafe,#bfdbfe)',
    accent: '#2563eb',
    tagColor: '#1d4ed8',
    tagBg: '#eff6ff',
    tagBorder: '#93c5fd',
    label: 'Lệnh SX Mới',
    tabColor: '#2563eb',
    tabBg: '#eff6ff',
  },
  HANG_LOI_NEW: {
    Icon: WarningOutlined,
    iconColor: '#dc2626',
    iconBg: 'linear-gradient(135deg,#fee2e2,#fecaca)',
    accent: '#dc2626',
    tagColor: '#b91c1c',
    tagBg: '#fef2f2',
    tagBorder: '#fca5a5',
    label: 'Hàng Lỗi',
    tabColor: '#dc2626',
    tabBg: '#fef2f2',
  },
  DON_HANG_NEW: {
    Icon: ShoppingOutlined,
    iconColor: '#d97706',
    iconBg: 'linear-gradient(135deg,#fef3c7,#fde68a)',
    accent: '#d97706',
    tagColor: '#92400e',
    tagBg: '#fffbeb',
    tagBorder: '#fcd34d',
    label: 'Đơn Hàng',
    tabColor: '#d97706',
    tabBg: '#fffbeb',
  },
  DOI_LO: {
    Icon: SwapOutlined,
    iconColor: '#0f766e',
    iconBg: 'linear-gradient(135deg,#ccfbf1,#a7f3d0)',
    accent: '#0f766e',
    tagColor: '#0f766e',
    tagBg: '#f0fdfa',
    tagBorder: '#99f6e4',
    label: 'Đổi Lô',
    tabColor: '#0f766e',
    tabBg: '#f0fdfa',
  },
  KE_HOACH: {
    Icon: CalendarOutlined,
    iconColor: '#7c3aed',
    iconBg: 'linear-gradient(135deg,#ede9fe,#ddd6fe)',
    accent: '#7c3aed',
    tagColor: '#5b21b6',
    tagBg: '#f5f3ff',
    tagBorder: '#c4b5fd',
    label: 'Kế Hoạch',
    tabColor: '#7c3aed',
    tabBg: '#f5f3ff',
  },
  SAN_LUONG_NEW: {
    Icon: BarChartOutlined,
    iconColor: '#0369a1',
    iconBg: 'linear-gradient(135deg,#e0f2fe,#bae6fd)',
    accent: '#0369a1',
    tagColor: '#075985',
    tagBg: '#f0f9ff',
    tagBorder: '#7dd3fc',
    label: 'Sản Lượng',
    tabColor: '#0369a1',
    tabBg: '#f0f9ff',
  },
}

const TYPE_KEYS = Object.keys(TYPE_CONFIG)

/* ── Helpers ────────────────────────────────────────────────────────── */
function getRelative(createdAt) {
  const d = dayjs(createdAt)
  const diffMin = dayjs().diff(d, 'minute')
  if (diffMin < 1)  return 'Vừa xong'
  if (diffMin < 60) return `${diffMin} phút trước`
  const diffH = dayjs().diff(d, 'hour')
  if (diffH < 24)   return `${diffH} giờ trước`
  const diffD = dayjs().diff(d, 'day')
  if (diffD < 7)    return `${diffD} ngày trước`
  return d.format('DD/MM/YYYY')
}

function groupByDate(items) {
  const map = {}
  items.forEach(item => {
    const d    = dayjs(item.createdAt)
    const diff = dayjs().startOf('day').diff(d.startOf('day'), 'day')
    const key  = diff === 0 ? 'Hôm nay' : diff === 1 ? 'Hôm qua' : d.format('DD/MM/YYYY')
    ;(map[key] = map[key] || []).push(item)
  })
  return map
}

/* ── Navigation helper ──────────────────────────────────────────────── */
function getNavPath(type, refId) {
  switch (type) {
    case 'SAN_LUONG_NEW': return refId ? `/record/edit/${refId}` : '/'
    case 'LENH_SX_NEW':   return '/lenh-san-xuat'
    case 'DOI_LO':        return '/lenh-san-xuat'
    case 'DON_HANG_NEW':  return '/don-hang'
    case 'HANG_LOI_NEW':  return '/hang-loi'
    case 'KE_HOACH':      return '/work-schedule'
    default:              return null
  }
}

/* ── Single notification card ───────────────────────────────────────── */
function NotifCard({ item, onRead, showType, selectMode, isSelected, onToggleSelect }) {
  const [hover, setHover] = useState(false)
  const navigate = useNavigate()
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.DOI_LO
  const { Icon } = cfg
  const navPath = getNavPath(item.type, item.refId)

  const handleClick = () => {
    if (selectMode) { onToggleSelect(item.id); return }
    if (!item.read) onRead(item.id)
    if (navPath) navigate(navPath)
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        padding: '14px 20px 14px 18px',
        background: isSelected
          ? '#fef3c7'
          : hover
            ? (item.read ? '#f8fafc' : '#e8f5f5')
            : (item.read ? '#fff' : '#f0fafa'),
        borderLeft: `3px solid ${isSelected ? '#f59e0b' : item.read ? '#e2e8f0' : cfg.accent}`,
        borderBottom: '1px solid #f0f4f8',
        cursor: selectMode ? 'pointer' : navPath ? 'pointer' : 'default',
        transition: 'all 0.18s ease',
        position: 'relative',
      }}
    >
      {/* Checkbox khi select mode */}
      {selectMode && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', paddingTop: 2 }}>
          <Checkbox checked={isSelected} onChange={() => onToggleSelect(item.id)} onClick={e => e.stopPropagation()} />
        </div>
      )}

      <div style={{
        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
        background: cfg.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}>
        <Icon style={{ color: cfg.iconColor, fontSize: 18 }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          {showType && (
            <Tag style={{
              margin: 0, fontSize: 11, lineHeight: '18px', padding: '0 7px',
              color: cfg.tagColor, background: cfg.tagBg,
              border: `1px solid ${cfg.tagBorder}`, borderRadius: 4, fontWeight: 600,
            }}>
              {cfg.label}
            </Tag>
          )}
          <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ClockCircleOutlined style={{ fontSize: 10 }} />
            <Tooltip title={getRelative(item.createdAt)}>
              {dayjs(item.createdAt).format('HH:mm DD/MM/YYYY')}
            </Tooltip>
          </span>
          {!item.read && (
            <span style={{
              marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%',
              background: cfg.accent, display: 'inline-block', flexShrink: 0,
            }} />
          )}
        </div>
        <div style={{
          fontSize: 13,
          color: item.read ? '#64748b' : '#1e293b',
          fontWeight: item.read ? 400 : 500,
          lineHeight: 1.55,
          wordBreak: 'break-word',
        }}>
          {item.message}
        </div>

        {/* Navigate hint */}
        {!selectMode && navPath && hover && (
          <div style={{
            fontSize: 11, color: '#1d4ed8', marginTop: 5,
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            Xem chi tiết <ArrowRightOutlined style={{ fontSize: 9 }} />
          </div>
        )}
      </div>

      {!selectMode && !item.read && hover && (
        <Tooltip title="Đánh dấu đã đọc">
          <button
            onClick={e => { e.stopPropagation(); onRead(item.id) }}
            style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6,
              padding: '3px 8px', fontSize: 12, color: '#008080',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            }}
          >
            <EyeOutlined /> Đọc
          </button>
        </Tooltip>
      )}
    </div>
  )
}

/* ── Notification list panel ────────────────────────────────────────── */
function NotifPanel({ items, loading, onRead, onDelete, subTab, setSubTab, typeKey }) {
  const [selectMode,   setSelectMode]   = useState(false)
  const [selectedIds,  setSelectedIds]  = useState(new Set())
  const [deleting,     setDeleting]     = useState(false)

  const unreadCount = items.filter(n => !n.read).length
  const filtered = subTab === 'unread' ? items.filter(n => !n.read)
                 : subTab === 'read'   ? items.filter(n =>  n.read)
                 : items
  const groups   = groupByDate(filtered)
  const showType = typeKey === 'all'

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectGroup = (groupItems) => {
    const ids = groupItems.map(i => i.id)
    const allSelected = ids.every(id => selectedIds.has(id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allSelected) ids.forEach(id => next.delete(id))
      else ids.forEach(id => next.add(id))
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map(i => i.id)))
  }

  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()) }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete([...selectedIds])
      message.success(`Đã xóa ${selectedIds.size} thông báo`)
      exitSelectMode()
    } catch {
      message.error('Xóa thất bại')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {/* Sub-tab row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
        <div style={{
          display: 'flex', gap: 3, padding: '3px',
          background: '#fff', borderRadius: 8,
          border: '1px solid #e2e8f0',
        }}>
          {[
            { key: 'all',    label: 'Tất cả',   count: items.length },
            { key: 'unread', label: 'Chưa đọc', count: unreadCount },
            { key: 'read',   label: 'Đã đọc',   count: items.length - unreadCount },
          ].map(t => {
            const active = subTab === t.key
            return (
              <button key={t.key} onClick={() => { setSubTab(t.key); exitSelectMode() }} style={{
                padding: '5px 14px', borderRadius: 6, border: 'none',
                fontSize: 12, fontWeight: active ? 600 : 400,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                background: active ? '#1e4570' : 'transparent',
                color: active ? '#fff' : '#64748b',
                transition: 'all 0.15s',
              }}>
                {t.label}
                {t.count > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    padding: '0px 5px', borderRadius: 10,
                    background: active ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                    color: active ? '#fff' : (t.key === 'unread' && t.count > 0 ? '#dc2626' : '#64748b'),
                  }}>
                    {t.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {selectMode ? (
            <>
              <button onClick={toggleSelectAll} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 6, border: '1px solid #d9d9d9',
                background: '#fff', cursor: 'pointer', fontSize: 12, color: '#374151',
              }}>
                {selectedIds.size === filtered.length
                  ? <><BorderOutlined /> Bỏ chọn tất cả</>
                  : <><CheckSquareOutlined /> Chọn tất cả ({filtered.length})</>
                }
              </button>

              {selectedIds.size > 0 && (
                <Popconfirm
                  title={`Xóa ${selectedIds.size} thông báo đã chọn?`}
                  description="Hành động này không thể hoàn tác."
                  okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
                  onConfirm={handleDelete}
                >
                  <Button danger size="small" icon={<DeleteOutlined />} loading={deleting}>
                    Xóa ({selectedIds.size})
                  </Button>
                </Popconfirm>
              )}

              <button onClick={exitSelectMode} style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid #d9d9d9',
                background: '#fff', cursor: 'pointer', fontSize: 12, color: '#6b7280',
              }}>
                Hủy
              </button>
            </>
          ) : (
            <>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {filtered.length > 0 ? `${filtered.length} thông báo` : ''}
              </span>
              {filtered.length > 0 && (
                <button onClick={() => setSelectMode(true)} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 6, border: '1px solid #d9d9d9',
                  background: '#fff', cursor: 'pointer', fontSize: 12, color: '#374151',
                }}>
                  <CheckSquareOutlined /> Chọn
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{
        background: '#fff', borderRadius: 12,
        border: '1px solid #e8ecf0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        <Spin spinning={loading} style={{ minHeight: 120 }}>
          {filtered.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '60px 0', gap: 12,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: 'linear-gradient(135deg,#f0f4f8,#e8ecf0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <InboxOutlined style={{ fontSize: 26, color: '#94a3b8' }} />
              </div>
              <div style={{ fontWeight: 600, color: '#475569', fontSize: 13 }}>
                {subTab === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
              </div>
            </div>
          ) : (
            Object.entries(groups).map(([dateLabel, groupItems]) => {
              const groupIds  = groupItems.map(i => i.id)
              const allGroupSel = selectMode && groupIds.length > 0 && groupIds.every(id => selectedIds.has(id))
              const someGroupSel = selectMode && groupIds.some(id => selectedIds.has(id))
              return (
                <div key={dateLabel}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 20px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #f0f4f8',
                    borderTop: '1px solid #f0f4f8',
                  }}>
                    {selectMode && (
                      <Checkbox
                        checked={allGroupSel}
                        indeterminate={someGroupSel && !allGroupSel}
                        onChange={() => toggleSelectGroup(groupItems)}
                      />
                    )}
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: '#64748b',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      {dateLabel}
                    </span>
                    <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                    <span style={{
                      fontSize: 11, color: '#94a3b8',
                      background: '#fff', border: '1px solid #e2e8f0',
                      borderRadius: 10, padding: '1px 8px',
                    }}>
                      {groupItems.length}
                    </span>
                  </div>
                  {groupItems.map(item => (
                    <NotifCard
                      key={item.id} item={item} onRead={onRead} showType={showType}
                      selectMode={selectMode}
                      isSelected={selectedIds.has(item.id)}
                      onToggleSelect={toggleSelect}
                    />
                  ))}
                </div>
              )
            })
          )}
        </Spin>
      </div>
    </>
  )
}

/* ── Main page ──────────────────────────────────────────────────────── */
const ADMIN_KH_HIDDEN_TABS = new Set(['LENH_SX_NEW', 'HANG_LOI_NEW', 'DOI_LO'])

export default function NotificationPage() {
  const { isAdminKH } = useAuth()
  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(false)
  const [typeTab,    setTypeTab]    = useState('all')
  const [subTab,     setSubTab]     = useState('all')
  const [markingAll, setMarkingAll] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/notifications')
      setItems(data || [])
    } catch {
      message.error('Không thể tải thông báo')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`)
      setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch { /* non-blocking */ }
  }

  const handleDeleteBatch = async (ids) => {
    await api.delete('/notifications/batch', { data: ids })
    setItems(prev => prev.filter(n => !ids.includes(n.id)))
  }

  const handleReadAll = async () => {
    setMarkingAll(true)
    try {
      await api.post('/notifications/read-all')
      setItems(prev => prev.map(n => ({ ...n, read: true })))
      message.success('Đã đánh dấu tất cả là đã đọc')
    } catch {
      message.error('Thao tác thất bại')
    } finally {
      setMarkingAll(false)
    }
  }

  const totalUnread = items.filter(n => !n.read).length
  const todayCount  = items.filter(n => dayjs(n.createdAt).isSame(dayjs(), 'day')).length

  /* Compute unread per type */
  const unreadByType = {}
  TYPE_KEYS.forEach(k => {
    unreadByType[k] = items.filter(n => n.type === k && !n.read).length
  })

  /* Items for current type tab */
  const visibleItems = typeTab === 'all'
    ? items
    : items.filter(n => n.type === typeTab)

  /* Type tab definitions */
  const visibleTypeKeys = isAdminKH()
    ? TYPE_KEYS.filter(k => !ADMIN_KH_HIDDEN_TABS.has(k))
    : TYPE_KEYS

  const typeTabs = [
    { key: 'all', label: 'Tất cả', Icon: BellFilled, accent: '#1e4570', bg: '#e8f0fa', unread: totalUnread },
    ...visibleTypeKeys.map(k => ({
      key: k,
      label: TYPE_CONFIG[k].label,
      Icon: TYPE_CONFIG[k].Icon,
      accent: TYPE_CONFIG[k].tabColor,
      bg: TYPE_CONFIG[k].tabBg,
      unread: unreadByType[k],
    })),
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', padding: '0 0 40px' }}>

      {/* ── Header + Tab bar (gộp 1 sticky block) ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'linear-gradient(135deg,#1e4570 0%,#1a5f5f 100%)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        color: '#fff',
      }}>
        {/* Row 1: tiêu đề + stats + nút */}
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16, padding: '8px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <BellFilled style={{ fontSize: 13, color: '#fff' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>Trung tâm Thông báo</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginLeft: 2 }}>Notification Center</span>
          </div>

          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            {[
              { label: 'Tổng',     value: items.length, color: 'rgba(255,255,255,0.85)' },
              { label: 'Chưa đọc', value: totalUnread,  color: totalUnread > 0 ? '#fca5a5' : 'rgba(255,255,255,0.45)' },
              { label: 'Hôm nay',  value: todayCount,   color: '#6ee7b7' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', lineHeight: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <Tooltip title="Làm mới">
              <Button icon={<ReloadOutlined />} onClick={load} loading={loading} size="small" style={{
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
                color: '#fff', borderRadius: 6,
              }} />
            </Tooltip>
            {totalUnread > 0 && (
              <Button icon={<CheckOutlined />} onClick={handleReadAll} loading={markingAll} size="small" style={{
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff', borderRadius: 6, fontWeight: 500, fontSize: 12,
              }}>
                Đọc tất cả
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: tab chips */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.10)',
          padding: '6px 24px 8px',
          overflowX: 'auto',
        }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
            {typeTabs.map(t => {
              const active = typeTab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => { setTypeTab(t.key); setSubTab('all') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px',
                    borderRadius: 20,
                    border: active ? '1.5px solid rgba(255,255,255,0.7)' : '1.5px solid rgba(255,255,255,0.18)',
                    background: active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  <t.Icon style={{ fontSize: 12, color: active ? '#fff' : 'rgba(255,255,255,0.6)' }} />
                  <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? '#fff' : 'rgba(255,255,255,0.7)' }}>
                    {t.label}
                  </span>
                  {t.unread > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, lineHeight: 1,
                      padding: '1px 5px', borderRadius: 10,
                      background: active ? 'rgba(255,255,255,0.3)' : '#dc2626',
                      color: '#fff',
                    }}>
                      {t.unread}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 900, margin: '20px auto 0', padding: '0 16px' }}>

        {/* ── Notification list ── */}
        <NotifPanel
          key={typeTab}
          items={visibleItems}
          loading={loading}
          onRead={handleRead}
          onDelete={handleDeleteBatch}
          subTab={subTab}
          setSubTab={setSubTab}
          typeKey={typeTab}
        />

        {items.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 11, color: '#cbd5e1', textAlign: 'right' }}>
            Cập nhật lúc {dayjs().format('HH:mm DD/MM/YYYY')}
          </div>
        )}
      </div>
    </div>
  )
}
