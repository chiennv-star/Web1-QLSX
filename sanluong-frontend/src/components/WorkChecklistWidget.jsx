import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Badge, Popover, Spin, Tooltip } from 'antd'
import {
  CheckSquareOutlined, ArrowRightOutlined,
  ReloadOutlined, CheckCircleOutlined,
} from '@ant-design/icons'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

// ── Fetch helpers ──────────────────────────────────────────────────────────────

async function fetchLichMoiHomNay() {
  const { data } = await api.get('/work-schedule/new-today/count')
  return data.count || 0
}

async function fetchChoDuyetSL() {
  const { data } = await api.get('/sl-change-request/pending')
  return (data || []).length
}

async function fetchLichHomNay(toNhom) {
  const today = dayjs().format('YYYY-MM-DD')
  const params = { fromDate: today, toDate: today, source: 'PLAN', size: 100 }
  if (toNhom) params.toNhom = toNhom
  const { data } = await api.get('/work-schedule', { params })
  const list = data?.content || (Array.isArray(data) ? data : [])
  return list.filter(w => w.tinhTrang !== 'done').length
}

// Fix lỗi 4: Dùng API đếm trực tiếp tại backend — không giới hạn size
async function fetchHangLoiChuaXuLy() {
  const { data } = await api.get('/hang-loi/count-chua-xu-ly')
  return typeof data === 'number' ? data : 0
}

async function fetchKhoachHomNayKH() {
  const today = dayjs().format('YYYY-MM-DD')
  const { data } = await api.get('/work-schedule', {
    params: { fromDate: today, toDate: today, source: 'PLAN', size: 100 },
  })
  const list = data?.content || (Array.isArray(data) ? data : [])
  return list.filter(w => w.tinhTrang !== 'done').length
}

async function fetchLenhChuaPhatHanh() {
  const { data } = await api.get('/lenh-san-xuat/count-chua-phat-hanh')
  return typeof data?.total === 'number' ? data.total : 0
}

const LENH_CHUA_PHAT_HANH_TASK = {
  id:    'lenh_chua_phat_hanh',
  icon:  '📋',
  label: 'Lệnh chưa phát hành',
  desc:  'Lệnh sản xuất đã có số lô nhưng chưa được phát hành cho tổ',
  route: '/khoach?tab=lenh-sx',
  fetch: fetchLenhChuaPhatHanh,
  color: '#f97316',
}

// ── Task definitions ──────────────────────────────────────────────────────────

// Fix lỗi 3a: bổ sung ADMIN_PL, ADMIN_PC vào map
const TO_NHOM_MAP = {
  ADMIN_PCPL1: 'PCPL1',
  ADMIN_PCPL2: 'PCPL2',
  ADMIN_PCPL3: 'PCPL3',
  ADMIN_DG:    'ĐG',
  ADMIN_BBC1:  'BBC1',
  ADMIN_PL:    'PL',
  ADMIN_PC:    'PC',
}

// Fix lỗi 3b: tất cả role có quyền sửa hàng lỗi
const CAN_EDIT_HANG_LOI = new Set([
  'ADMIN', 'TKSX',
  'ADMIN_KH', 'ADMIN_PC', 'ADMIN_BBC1',
  'ADMIN_PL', 'ADMIN_DG',
  'ADMIN_PCPL1', 'ADMIN_PCPL2', 'ADMIN_PCPL3',
])

const HANG_LOI_TASK = {
  id:        'hang_loi',
  icon:      '⚠️',
  label:     'Hàng xử lý công đoạn',
  desc:      'Chưa xử lý + Đang xử lý (chưa Đã hoàn thành)',
  route:     '/hang-loi',
  fetch:     fetchHangLoiChuaXuLy,
  color:     '#f59e0b',
  hideCount: true,
}

function buildTasks(role) {
  // ── ADMIN ──────────────────────────────────────────────────────────────────
  if (role === 'ADMIN') {
    return [
      {
        id:    'lich_moi_hom_nay',
        icon:  '📆',
        label: 'Lịch sản xuất mới hôm nay',
        desc:  'Lịch vừa được thêm vào trong ngày hôm nay',
        route: '/work-schedule',
        fetch: fetchLichMoiHomNay,
        color: '#0ea5e9',
      },
      {
        id:    'cho_duyet',
        icon:  '⏳',
        label: 'Yêu cầu đổi SL chờ duyệt',
        desc:  'Nhân viên đề nghị chỉnh sửa sản lượng',
        route: '/?inbox=1',
        fetch: fetchChoDuyetSL,
        color: '#8b5cf6',
      },
      LENH_CHUA_PHAT_HANH_TASK,
      HANG_LOI_TASK,
    ]
  }

  // ── TKSX ───────────────────────────────────────────────────────────────────
  if (role === 'TKSX') {
    return [
      {
        id:    'cho_duyet',
        icon:  '⏳',
        label: 'Yêu cầu đổi SL chờ duyệt',
        desc:  'Nhân viên đề nghị chỉnh sửa sản lượng',
        route: '/?inbox=1',
        fetch: fetchChoDuyetSL,
        color: '#8b5cf6',
      },
      LENH_CHUA_PHAT_HANH_TASK,
      HANG_LOI_TASK,
    ]
  }

  // ── ADMIN_KH ───────────────────────────────────────────────────────────────
  if (role === 'ADMIN_KH') {
    return [
      {
        id:    'cho_duyet',
        icon:  '⏳',
        label: 'Yêu cầu đổi SL chờ duyệt',
        desc:  'Nhân viên đề nghị chỉnh sửa sản lượng',
        route: '/?inbox=1',
        fetch: fetchChoDuyetSL,
        color: '#8b5cf6',
      },
      {
        id:    'ke_hoach_hom_nay',
        icon:  '📅',
        label: 'Kế hoạch hôm nay chưa hoàn thành',
        desc:  'Lịch kế hoạch ngày hôm nay chưa được đánh dấu done',
        route: '/work-schedule',
        fetch: fetchKhoachHomNayKH,
        color: '#0ea5e9',
      },
      LENH_CHUA_PHAT_HANH_TASK,
      HANG_LOI_TASK,
    ]
  }

  // ── Stage admins (PCPL1/2/3, DG, BBC1, PL, PC) ────────────────────────────
  const toNhom = TO_NHOM_MAP[role]
  const tasks = [
    {
      id:    'lich_hom_nay',
      icon:  '📅',
      label: `Lịch ${toNhom || ''} hôm nay chưa hoàn thành`,
      desc:  'Các kế hoạch ngày hôm nay chưa đánh dấu xong',
      route: '/work-schedule',
      fetch: () => fetchLichHomNay(toNhom),
      color: '#0ea5e9',
    },
    {
      id:    'san_luong_hom_nay',
      icon:  '📊',
      label: 'Nhập sản lượng hôm nay',
      desc:  'Kiểm tra và cập nhật số liệu sản lượng trong ngày',
      route: '/daily-sl?tab=tonghop',
      fetch: async () => {
        const today = dayjs().format('YYYY-MM-DD')
        const { data } = await api.get('/production', {
          params: { fromDate: today, toDate: today, page: 0, size: 1 },
        })
        const total = data?.totalElements ?? (Array.isArray(data) ? data.length : 0)
        return total === 0 ? 1 : 0
      },
      color: '#10b981',
    },
  ]

  tasks.push(LENH_CHUA_PHAT_HANH_TASK)

  // Fix lỗi 3b: tất cả role trong CAN_EDIT_HANG_LOI đều thấy task hàng lỗi
  if (CAN_EDIT_HANG_LOI.has(role)) {
    tasks.push(HANG_LOI_TASK)
  }

  return tasks
}

// Fix lỗi 3c: bổ sung ADMIN_PC, ADMIN_PL, TKSX vào SHOWN_ROLES
const SHOWN_ROLES = new Set([
  'ADMIN', 'TKSX', 'ADMIN_KH',
  'ADMIN_PC', 'ADMIN_PL',
  'ADMIN_PCPL1', 'ADMIN_PCPL2', 'ADMIN_PCPL3',
  'ADMIN_DG', 'ADMIN_BBC1',
])

// ── Widget ────────────────────────────────────────────────────────────────────
export default function WorkChecklistWidget() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [counts,  setCounts]  = useState({})
  const [hover,   setHover]   = useState(false)

  const role  = user?.role
  const tasks = useMemo(() => buildTasks(role), [role])

  const shouldShow = SHOWN_ROLES.has(role)

  const fetchAll = useCallback(async () => {
    if (!shouldShow || tasks.length === 0) return
    setLoading(true)
    const results = {}
    await Promise.allSettled(
      tasks.map(async t => {
        try   { results[t.id] = await t.fetch() }
        catch { results[t.id] = 0 }
      })
    )
    setCounts(results)
    setLoading(false)
  }, [tasks, shouldShow])

  useEffect(() => {
    fetchAll()
    const iv = setInterval(fetchAll, 5 * 60 * 1000) // refresh mỗi 5 phút
    return () => clearInterval(iv)
  }, [fetchAll])

  if (!shouldShow) return null

  const totalPending = tasks.reduce((s, t) => t.hideCount ? s : s + (counts[t.id] || 0), 0)
  const allDone      = totalPending === 0

  // ── Popover content ────────────────────────────────────────────────────────
  const content = (
    <div style={{ width: 310 }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12, paddingBottom: 10,
        borderBottom: '1px solid #e2e8f0',
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
            📋 Việc cần làm hôm nay
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
            {dayjs().format('dddd, DD/MM/YYYY')}
          </div>
        </div>
        <Tooltip title="Làm mới">
          <button
            onClick={e => { e.stopPropagation(); fetchAll() }}
            style={{
              background: 'none', border: '1px solid #e2e8f0', borderRadius: 6,
              cursor: 'pointer', color: '#64748b', fontSize: 13,
              width: 28, height: 28, display: 'flex', alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ReloadOutlined spin={loading} />
          </button>
        </Tooltip>
      </div>

      {/* Task list */}
      <Spin spinning={loading} tip="">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {tasks.map(t => {
            const count = counts[t.id] || 0
            const done  = count === 0
            return (
              <div
                key={t.id}
                onClick={() => { navigate(t.route); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 9, cursor: 'pointer',
                  background: done ? '#f0fdf4' : '#fff',
                  border: `1.5px solid ${done ? '#bbf7d0' : t.color + '44'}`,
                  transition: 'all 0.15s',
                  boxShadow: done ? 'none' : `0 1px 4px ${t.color}18`,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(3px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)' }}
              >
                {/* Icon */}
                <span style={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>{t.icon}</span>

                {/* Label + desc */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, lineHeight: 1.3,
                    color: done ? '#15803d' : '#1e293b',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    textDecoration: done ? 'line-through' : 'none',
                  }}>
                    {t.label}
                  </div>
                  <div style={{
                    fontSize: 10.5, color: '#94a3b8', marginTop: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {t.desc}
                  </div>
                </div>

                {/* Count / Done indicator */}
                {done ? (
                  <CheckCircleOutlined style={{ color: '#22c55e', fontSize: 15, flexShrink: 0 }} />
                ) : t.hideCount ? null : (
                  <div style={{
                    minWidth: 22, height: 22, borderRadius: 11,
                    background: t.color, color: '#fff',
                    fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, padding: '0 5px',
                  }}>
                    {count}
                  </div>
                )}

                {/* Arrow */}
                <ArrowRightOutlined style={{
                  color: done ? '#86efac' : '#cbd5e1',
                  fontSize: 9, flexShrink: 0,
                }} />
              </div>
            )
          })}
        </div>
      </Spin>

      {/* Footer summary */}
      {!loading && (
        <div style={{
          marginTop: 12, paddingTop: 10,
          borderTop: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontSize: 12, fontWeight: 700,
          color: allDone ? '#16a34a' : '#dc2626',
        }}>
          {allDone ? (
            <>
              <CheckCircleOutlined />
              Tất cả công việc đã hoàn thành! 🎉
            </>
          ) : (
            <>
              <span style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 10, padding: '1px 10px', fontSize: 12,
              }}>
                ⚡ {totalPending} việc còn tồn đọng
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )

  // ── Floating button ────────────────────────────────────────────────────────
  return (
    <>
      {/* Pulse ring khi có việc tồn đọng */}
      {!allDone && !open && (
        <style>{`
          @keyframes wc-pulse {
            0%   { box-shadow: 0 0 0 0   rgba(29,78,216,0.45); }
            70%  { box-shadow: 0 0 0 10px rgba(29,78,216,0);   }
            100% { box-shadow: 0 0 0 0   rgba(29,78,216,0);   }
          }
          .wc-btn-pulse { animation: wc-pulse 2s infinite; }
        `}</style>
      )}

      <div style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 1000 }}>
        <Popover
          content={content}
          open={open}
          onOpenChange={setOpen}
          trigger="click"
          placement="topLeft"
          arrow={false}
          styles={{
            body: {
              padding: 16,
              borderRadius: 14,
              boxShadow: '0 12px 40px rgba(29,78,216,0.18)',
              border: '1px solid #dbeafe',
            },
          }}
        >
          <Badge
            count={totalPending}
            offset={[-3, 3]}
            style={{ background: '#ef4444', boxShadow: 'none', fontSize: 11 }}
          >
            <button
              className={!allDone && !open ? 'wc-btn-pulse' : ''}
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              style={{
                width: 50, height: 50, borderRadius: '50%',
                background: allDone
                  ? 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)'
                  : 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: hover
                  ? (allDone ? '0 6px 20px rgba(22,163,74,0.5)' : '0 6px 20px rgba(29,78,216,0.5)')
                  : (allDone ? '0 3px 12px rgba(22,163,74,0.35)' : '0 3px 12px rgba(29,78,216,0.35)'),
                transform: hover ? 'scale(1.08)' : 'scale(1)',
                transition: 'all 0.2s ease',
              }}
            >
              <CheckSquareOutlined style={{ color: '#fff', fontSize: 20 }} />
            </button>
          </Badge>
        </Popover>
      </div>
    </>
  )
}
