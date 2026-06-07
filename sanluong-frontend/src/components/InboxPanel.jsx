import React, { useState, useEffect, useCallback } from 'react'
import {
  Drawer, Badge, Button, Collapse, Tag,
  Popconfirm, Empty, Spin, Tooltip, Checkbox,
} from 'antd'
import {
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  CheckOutlined,
  CloseOutlined,
  ArrowRightOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import api from '../api/axios'
import { useNavigate } from 'react-router-dom'

// ── Record card (cho "Đã phát, chờ xếp lịch") ────────────────────────────────
function RecordCard({ r, onClose }) {
  const navigate = useNavigate()
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={() => { navigate(`/record/edit/${r.id}`); onClose() }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '12px 14px',
        marginBottom: 8,
        borderRadius: 8,
        border: `1px solid ${hover ? '#bfdbfe' : '#e2e8f0'}`,
        background: hover ? '#f0f7ff' : '#fff',
        cursor: 'pointer',
        transition: 'all 0.15s',
        boxShadow: hover ? '0 2px 8px rgba(29,78,216,0.10)' : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#1e4570', letterSpacing: '-0.01em' }}>
          {r.maTp}
        </span>
        <Tag style={{
          fontSize: 11, margin: 0, padding: '1px 7px',
          borderRadius: 10, fontWeight: 600,
          background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe',
        }}>
          {r.lsx}
        </Tag>
      </div>
      <div style={{
        fontSize: 12, color: '#475569', marginBottom: 6,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontWeight: 500,
      }}>
        {r.tienTrinh || '—'}
      </div>
      <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#64748b', marginBottom: 6 }}>
        {r.soLuong != null && (
          <span>KH: <b style={{ color: '#111', fontWeight: 700 }}>{Number(r.soLuong).toLocaleString('vi-VN')}</b></span>
        )}
        {r.maDonHang && (
          <span>Đơn: <b style={{ color: '#111', fontWeight: 700 }}>{r.maDonHang}</b></span>
        )}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
        fontSize: 11, color: hover ? '#1d4ed8' : '#94a3b8',
        transition: 'color 0.15s',
        fontWeight: hover ? 600 : 400,
      }}>
        Mở chi tiết <ArrowRightOutlined style={{ fontSize: 9, marginLeft: 3 }} />
      </div>
    </div>
  )
}

// ── Chưa phát lệnh card (checkbox + nút phát lệnh nhanh) ─────────────────────
function ChuaPhatCard({ r, selected, onToggle, onPhatLenh, loading, onClose }) {
  const navigate = useNavigate()
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '10px 12px',
        marginBottom: 8,
        borderRadius: 8,
        border: `1px solid ${selected ? '#0d9488' : hover ? '#99f6e4' : '#e2e8f0'}`,
        background: selected ? '#f0fdfa' : hover ? '#f8fffd' : '#fff',
        transition: 'all 0.15s',
        boxShadow: selected ? '0 0 0 2px rgba(13,148,136,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {/* Checkbox */}
        <Checkbox
          checked={selected}
          onChange={e => { e.stopPropagation(); onToggle(r.id) }}
          style={{ marginTop: 2, flexShrink: 0 }}
        />

        {/* Content — click to navigate */}
        <div
          style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
          onClick={() => { navigate(`/record/edit/${r.id}`); onClose() }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#1e4570' }}>{r.maTp}</span>
            <Tag style={{
              fontSize: 11, margin: 0, padding: '1px 7px',
              borderRadius: 10, fontWeight: 600,
              background: '#f0fdfa', color: '#0d9488', borderColor: '#99f6e4',
            }}>
              {r.lsx}
            </Tag>
          </div>
          <div style={{
            fontSize: 12, color: '#475569', marginBottom: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontWeight: 500,
          }}>
            {r.tienTrinh || '—'}
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#64748b' }}>
            {r.soLuong != null && (
              <span>KH: <b style={{ color: '#111', fontWeight: 700 }}>{Number(r.soLuong).toLocaleString('vi-VN')}</b></span>
            )}
            {r.maDonHang && (
              <span>Đơn: <b style={{ color: '#111', fontWeight: 700 }}>{r.maDonHang}</b></span>
            )}
          </div>
        </div>
      </div>

      {/* Nút Phát lệnh nhanh */}
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="primary"
          size="small"
          icon={<ThunderboltOutlined />}
          loading={loading}
          onClick={e => { e.stopPropagation(); onPhatLenh(r) }}
          style={{
            fontSize: 11, height: 26, borderRadius: 6, fontWeight: 700,
            background: '#0d9488', borderColor: '#0d9488',
          }}
        >
          Phát lệnh
        </Button>
      </div>
    </div>
  )
}

// ── Change request card ───────────────────────────────────────────────────────
function RequestCard({ r, onApprove, onReject, actionState }) {
  return (
    <div style={{
      padding: '12px 14px',
      marginBottom: 8,
      borderRadius: 8,
      border: '1px solid #bae0ff',
      background: 'linear-gradient(135deg,#f0f8ff,#e8f3ff)',
      boxShadow: '0 1px 3px rgba(29,78,216,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#1e4570' }}>{r.maSp}</span>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <Tag color="blue" style={{ fontSize: 11, margin: 0, padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>
            {r.congDoan}
          </Tag>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{r.ngay}</span>
        </div>
      </div>
      <div style={{
        fontSize: 12, color: '#475569', marginBottom: 6,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontWeight: 500,
      }}>
        {r.tenTrinh}
      </div>
      <div style={{
        fontSize: 13, marginBottom: 10,
        background: 'rgba(255,255,255,0.6)', borderRadius: 6,
        padding: '6px 10px', border: '1px solid rgba(186,224,255,0.6)',
        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
      }}>
        <span style={{ color: '#64748b', fontSize: 11 }}>SL:</span>
        <span style={{ textDecoration: 'line-through', color: '#f87171', fontWeight: 600 }}>
          {r.oldValue != null ? Number(r.oldValue).toFixed(2) : '—'}
        </span>
        <ArrowRightOutlined style={{ color: '#94a3b8', fontSize: 10 }} />
        <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 14 }}>
          {Number(r.newValue).toFixed(2)}
        </span>
        <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 'auto' }}>
          bởi <b style={{ color: '#334155' }}>{r.requestedBy}</b>
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button
          type="primary" icon={<CheckOutlined />}
          loading={actionState === 'approving'}
          style={{ flex: 1, fontSize: 12, height: 30, borderRadius: 6, fontWeight: 600 }}
          onClick={onApprove}
        >
          Duyệt
        </Button>
        <Popconfirm
          title="Từ chối yêu cầu này?"
          okText="Từ chối" cancelText="Hủy" okButtonProps={{ danger: true }}
          onConfirm={onReject}
        >
          <Button
            danger icon={<CloseOutlined />}
            loading={actionState === 'rejecting'}
            style={{ flex: 1, fontSize: 12, height: 30, borderRadius: 6, fontWeight: 600 }}
          >
            Từ chối
          </Button>
        </Popconfirm>
      </div>
    </div>
  )
}

// ── Main InboxPanel ───────────────────────────────────────────────────────────
export default function InboxPanel({ open, onClose, onCountChange }) {
  const [loading, setLoading]         = useState(false)
  const [choXepLich, setChoXepLich]   = useState([])
  const [choDuyet, setChoDuyet]       = useState([])
  const [chuaPhat, setChuaPhat]       = useState([])
  const [activeKeys, setActiveKeys]   = useState(['1', '2', '3'])
  const [actionState, setActionState] = useState({})

  // Trạng thái phát lệnh
  const [selectedIds, setSelectedIds]     = useState(new Set())
  const [phatLenhState, setPhatLenhState] = useState({}) // id → loading
  const [batchLoading, setBatchLoading]   = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [r1, r2, r3] = await Promise.all([
        api.get('/production/inbox/cho-xep-lich'),
        api.get('/sl-change-request/pending'),
        api.get('/production/inbox/chua-phat-lenh'),
      ])
      setChoXepLich(r1.data || [])
      setChoDuyet(r2.data || [])
      setChuaPhat(r3.data || [])
      setSelectedIds(new Set())
    } catch { /* non-blocking */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    onCountChange?.(choXepLich.length + choDuyet.length + chuaPhat.length)
  }, [choXepLich, choDuyet, chuaPhat, onCountChange])

  const handleApprove = async (id) => {
    setActionState(p => ({ ...p, [id]: 'approving' }))
    try {
      await api.put(`/sl-change-request/${id}/approve`)
      setChoDuyet(p => p.filter(r => r.id !== id))
    } catch { /* non-blocking */ }
    finally { setActionState(p => { const n = { ...p }; delete n[id]; return n }) }
  }

  const handleReject = async (id) => {
    setActionState(p => ({ ...p, [id]: 'rejecting' }))
    try {
      await api.put(`/sl-change-request/${id}/reject`)
      setChoDuyet(p => p.filter(r => r.id !== id))
    } catch { /* non-blocking */ }
    finally { setActionState(p => { const n = { ...p }; delete n[id]; return n }) }
  }

  const syncWorkSchedule = async (r) => {
    const { maBravo, maTp, tienTrinh, lsx, soLuong, maDonHang } = r
    if (!maBravo && !maTp) return
    const params = { phatLenh: true }
    if (maBravo)         params.maBravo   = maBravo
    if (maTp)            params.maSp      = maTp
    if (tienTrinh)       params.tenTrinh  = tienTrinh
    if (lsx)             params.soLo      = lsx
    if (soLuong != null) params.coLo      = soLuong
    if (maDonHang)       params.maDonHang = maDonHang
    try {
      const { data: created } = await api.post('/work-schedule/auto-sync', null, { params })
      if (created > 0) message.info(`Đã tự động tạo ${created} bản ghi Lịch làm việc`)
    } catch { /* non-blocking */ }
  }

  const syncHangLoi = async (r) => {
    const { maTp, maBravo, tienTrinh, lsx, soLuong } = r
    if (!maTp) return
    try {
      const { data: exists } = await api.get('/hang-loi/exists', {
        params: { mtpCoMem: maTp, tenHangHoa: tienTrinh || '', soLo: lsx || '' },
      })
      if (!exists) {
        await api.post('/hang-loi', {
          mtpCoMem: maTp || null, mtpSongAn: maBravo || null,
          tenHangHoa: tienTrinh || null, soLo: lsx || null, soLuong: soLuong ?? null,
        })
        message.info('Đã tự động tạo bản ghi Hàng Lỗi mới')
      }
    } catch { /* non-blocking */ }
  }

  // Phát lệnh đơn lẻ
  const handlePhatLenh = async (record) => {
    const { id } = record
    setPhatLenhState(p => ({ ...p, [id]: true }))
    try {
      await api.patch(`/production/${id}/phat-lenh`)
      message.success('Đã phát lệnh thành công!')
      setChuaPhat(p => p.filter(r => r.id !== id))
      setSelectedIds(p => { const n = new Set(p); n.delete(id); return n })
      onClose()
      // Sync chạy background sau khi đóng
      syncHangLoi(record)
      syncWorkSchedule(record)
    } catch { message.error('Phát lệnh thất bại') }
    finally { setPhatLenhState(p => { const n = { ...p }; delete n[id]; return n }) }
  }

  // Phát lệnh đồng loạt
  const handlePhatLenhBatch = async () => {
    if (selectedIds.size === 0) return
    setBatchLoading(true)
    const ids = [...selectedIds]
    const records = chuaPhat.filter(r => ids.includes(r.id))
    try {
      await Promise.all(ids.map(id => api.patch(`/production/${id}/phat-lenh`)))
      message.success(`Đã phát lệnh ${ids.length} bản ghi`)
      setChuaPhat(p => p.filter(r => !ids.includes(r.id)))
      setSelectedIds(new Set())
      onClose()
      // Sync chạy background sau khi đóng
      records.forEach(r => { syncHangLoi(r); syncWorkSchedule(r) })
    } catch { message.error('Phát lệnh thất bại') }
    finally { setBatchLoading(false) }
  }

  // Toggle checkbox
  const handleToggle = (id) => {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  // Chọn / bỏ chọn tất cả
  const allSelected = chuaPhat.length > 0 && chuaPhat.every(r => selectedIds.has(r.id))
  const someSelected = chuaPhat.some(r => selectedIds.has(r.id))
  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(chuaPhat.map(r => r.id)))
    }
  }

  const totalCount = choXepLich.length + choDuyet.length + chuaPhat.length

  const sectionLabel = (icon, text, count, color) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {React.cloneElement(icon, { style: { color, fontSize: 14 } })}
      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{text}</span>
      {count > 0 && (
        <Badge count={count} style={{ background: color, boxShadow: 'none', fontSize: 11 }} />
      )}
    </div>
  )

  const emptyNode = (
    <Empty
      description={<span style={{ fontSize: 12, color: '#94a3b8' }}>Không có mục nào</span>}
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      style={{ padding: '16px 0', margin: 0 }}
    />
  )

  // Section "Chưa phát lệnh" với batch controls
  const chuaPhatChildren = chuaPhat.length === 0 ? emptyNode : (
    <div>
      {/* Batch controls */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 4px 10px 4px',
        borderBottom: '1px solid #f0fdf9',
        marginBottom: 8,
      }}>
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected && !allSelected}
          onChange={handleToggleAll}
        >
          <span style={{ fontSize: 12, color: '#475569' }}>Chọn tất cả</span>
        </Checkbox>
        {someSelected && (
          <Button
            type="primary"
            size="small"
            icon={<ThunderboltOutlined />}
            loading={batchLoading}
            onClick={handlePhatLenhBatch}
            style={{
              marginLeft: 'auto',
              fontSize: 11, height: 28, borderRadius: 6, fontWeight: 700,
              background: '#0d9488', borderColor: '#0d9488',
            }}
          >
            Phát lệnh ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Cards */}
      {chuaPhat.map(r => (
        <ChuaPhatCard
          key={r.id}
          r={r}
          selected={selectedIds.has(r.id)}
          onToggle={handleToggle}
          onPhatLenh={handlePhatLenh}
          loading={!!phatLenhState[r.id]}
          onClose={onClose}
        />
      ))}
    </div>
  )

  const collapseItems = [
    {
      key: '1',
      label: sectionLabel(<ClockCircleOutlined />, 'Đã phát, chờ xếp lịch', choXepLich.length, '#d97706'),
      children: choXepLich.length === 0
        ? emptyNode
        : choXepLich.map(r => <RecordCard key={r.id} r={r} onClose={onClose} />),
    },
    {
      key: '2',
      label: sectionLabel(<ExclamationCircleOutlined />, 'Chờ duyệt sản lượng', choDuyet.length, '#1d4ed8'),
      children: choDuyet.length === 0
        ? emptyNode
        : choDuyet.map(r => (
          <RequestCard
            key={r.id} r={r}
            actionState={actionState[r.id]}
            onApprove={() => handleApprove(r.id)}
            onReject={() => handleReject(r.id)}
          />
        )),
    },
    {
      key: '3',
      label: sectionLabel(<StopOutlined />, 'Chưa phát lệnh', chuaPhat.length, '#0f766e'),
      children: chuaPhatChildren,
    },
  ]

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🔔</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>Inbox Sản lượng</span>
          {totalCount > 0 && (
            <Badge
              count={totalCount}
              style={{ background: '#e85d04', boxShadow: 'none', fontSize: 12 }}
            />
          )}
          <Tooltip title="Làm mới">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              size="small"
              onClick={fetchAll}
              loading={loading}
              style={{ marginLeft: 'auto', color: '#64748b' }}
            />
          </Tooltip>
        </div>
      }
      placement="right"
      width={480}
      open={open}
      onClose={onClose}
      styles={{
        header: { padding: '14px 20px', borderBottom: '1px solid #e8ecf0' },
        body: { padding: '14px 16px', overflowY: 'auto', background: '#f8fafc' },
      }}
      maskClosable
    >
      <Spin spinning={loading} tip="Đang tải...">
        <Collapse
          activeKey={activeKeys}
          onChange={setActiveKeys}
          items={collapseItems}
          bordered={false}
          style={{ background: 'transparent' }}
          expandIconPosition="end"
          styles={{
            header: {
              background: '#fff',
              borderRadius: 10,
              marginBottom: 4,
              border: '1px solid #e2e8f0',
              padding: '10px 14px',
            },
            body: {
              padding: '10px 4px 4px 4px',
              background: 'transparent',
            },
          }}
        />
      </Spin>

      {!loading && totalCount === 0 && (
        <div style={{
          textAlign: 'center', marginTop: 40, padding: '24px 0',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>
            ✅
          </div>
          <span style={{ fontWeight: 600, color: '#475569', fontSize: 13 }}>
            Không có mục nào cần xử lý
          </span>
        </div>
      )}
    </Drawer>
  )
}
