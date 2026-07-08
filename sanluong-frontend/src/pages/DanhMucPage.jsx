import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Table, Button, Space, Input, Modal, Form, Select, Switch,
  Popconfirm, message, Tag, Tooltip, Row, Col, DatePicker,
  InputNumber, AutoComplete, Tabs, Badge, Upload, Alert, Result, Drawer, Popover, Timeline, Spin
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  ReloadOutlined, UserOutlined, AppstoreOutlined, TeamOutlined, SafetyOutlined,
  FileExcelOutlined, UploadOutlined, CloseCircleOutlined, EyeOutlined, BarChartOutlined,
  HistoryOutlined, HomeOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { invalidatePhongCache } from '../components/PhongThucHienSelect'

const { Option } = Select

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1: Quản lý người dùng
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_MAP = {
  ADMIN:       { color: 'blue',     label: 'Quản trị viên' },
  NHAN_VIEN:   { color: 'green',    label: 'Nhân viên' },
  ADMIN_KH:    { color: 'cyan',     label: 'Admin Kế hoạch' },
  TKSX:        { color: 'lime',     label: 'TKSX' },
  QUAN_DOC:    { color: 'default',  label: 'Quản lý Đọc' },
  MAN_HINH:    { color: 'cyan',     label: 'Màn hình hiển thị' },
  ADMIN_PC:    { color: 'purple',   label: 'Admin PC' },
  ADMIN_BBC1:  { color: 'volcano',  label: 'Admin BBC1' },
  ADMIN_PL:    { color: 'purple',   label: 'Admin PL' },
  ADMIN_DG:    { color: 'gold',     label: 'Admin ĐG' },
  ADMIN_PCPL1: { color: 'geekblue', label: 'Admin PCPL1' },
  ADMIN_PCPL2: { color: 'geekblue', label: 'Admin PCPL2' },
  ADMIN_PCPL3: { color: 'geekblue', label: 'Admin PCPL3' },
}

function UserTab() {
  const [users,     setUsers]     = useState([])
  const [loading,   setLoading]   = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser,  setEditUser]  = useState(null)
  const [form] = Form.useForm()

  const fetchUsers = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const { data } = await api.get('/users')
      setUsers(data)
    } catch { message.error('Không thể tải danh sách người dùng') }
    finally { if (!silent) setLoading(false) }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  useEffect(() => {
    const handler = () => fetchUsers({ silent: true })
    window.addEventListener('app:silent-refresh', handler)
    return () => window.removeEventListener('app:silent-refresh', handler)
  }, [fetchUsers])

  const openCreate = () => {
    setEditUser(null); form.resetFields()
    form.setFieldsValue({ enabled: true, role: 'NHAN_VIEN' })
    setModalOpen(true)
  }
  const openEdit = (user) => {
    setEditUser(user); form.setFieldsValue({ ...user, password: '' })
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
      setModalOpen(false); fetchUsers()
    } catch (err) {
      if (err?.response?.data?.message) message.error(err.response.data.message)
    }
  }
  const onDelete = async (id) => {
    try { await api.delete(`/users/${id}`); message.success('Đã xóa'); fetchUsers() }
    catch { message.error('Xóa thất bại') }
  }
  const onToggle = async (user) => {
    try {
      await api.put(`/users/${user.id}`, { ...user, enabled: !user.enabled })
      fetchUsers()
    } catch { message.error('Cập nhật thất bại') }
  }

  const columns = [
    { title: 'Tên đăng nhập', dataIndex: 'username', key: 'username', width: 160,
      render: v => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>{v}</span> },
    { title: 'Họ Tên', dataIndex: 'fullName', key: 'fullName', width: 200,
      render: v => v || <span style={{ color: '#bbb' }}>—</span> },
    { title: 'Vai Trò', dataIndex: 'role', key: 'role', width: 160,
      render: v => { const cfg = ROLE_MAP[v] || {}; return <Tag color={cfg.color || 'default'}>{cfg.label || v}</Tag> } },
    { title: 'Trạng thái', dataIndex: 'enabled', key: 'enabled', width: 110, align: 'center',
      render: (v, r) => (
        <Switch checked={v} size="small"
          checkedChildren="Hoạt động" unCheckedChildren="Khóa"
          onChange={() => onToggle(r)} />
      ) },
    { title: 'Thao Tác', key: 'action', width: 90, align: 'center', fixed: 'right',
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Sửa"><Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>
          <Popconfirm title="Xóa tài khoản này?" okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }} onConfirm={() => onDelete(r.id)}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ) },
  ]

  return (
    <>
      <div style={{ padding: '10px 16px 8px', display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: '#1D4ED8', borderColor: '#1D4ED8', fontWeight: 600 }}>
          Thêm người dùng
        </Button>
      </div>
      <Table className="dm-table" columns={columns} dataSource={users} rowKey="id"
        loading={loading} size="small" scroll={{ x: 700 }}
        pagination={{ pageSize: 50, showTotal: t => `Tổng ${t} người dùng` }} />

      <Modal open={modalOpen} onOk={onSave} onCancel={() => setModalOpen(false)}
        okText="Lưu" cancelText="Hủy" width={520}
        title={<Space><SafetyOutlined style={{ color: '#1D4ED8' }} /><span>{editUser ? 'Sửa tài khoản' : 'Thêm tài khoản'}</span></Space>}
        destroyOnHidden>
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="Tên đăng nhập" name="username" rules={[{ required: true }]}>
            <Input disabled={!!editUser} style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item label="Mật khẩu" name="password" rules={editUser ? [] : [{ required: true, message: 'Nhập mật khẩu' }]}>
            <Input.Password placeholder={editUser ? 'Để trống nếu không đổi' : ''} />
          </Form.Item>
          <Form.Item label="Họ Tên" name="fullName">
            <Input />
          </Form.Item>
          <Form.Item label="Vai trò" name="role" rules={[{ required: true }]}>
            <Select>
              {Object.entries(ROLE_MAP).map(([k, v]) => (
                <Option key={k} value={k}><Tag color={v.color}>{v.label}</Tag></Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Trạng thái" name="enabled" valuePropName="checked">
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Import Excel Modal — Danh mục Mã TP (2 bước: Preview → Xác nhận)
// ─────────────────────────────────────────────────────────────────────────────

const FIELD_LABEL = {
  maBravo: 'Mã Bravo', maTp: 'Mã TP', tienTrinh: 'Tên/Tiến trình',
  loaiSanPham: 'Loại SP', khoiLuong: 'KL/ĐV (g)', slTrungBinh: 'NS TB',
  nangSuatPc: 'NS PC', nangSuatPl: 'NS PL', nangSuatBbc1: 'NS BBC1',
  mayMocPc: 'Máy PC', mayMocPl: 'Máy PL', mayMocBbc1: 'Máy BBC1', mayMocDg: 'Máy ĐG',
  ghiChu: 'Ghi chú',
}

const STATUS_CFG = {
  NEW:        { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Thêm mới' },
  SUPPLEMENT: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Bổ sung'  },
  SKIP:       { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', label: 'Bỏ qua'   },
  ERROR:      { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Lỗi'       },
}

function ImportProductMasterModal({ open, onClose, onDone }) {
  const [step,        setStep]        = useState('upload')  // 'upload' | 'preview' | 'result'
  const [fileList,    setFileList]    = useState([])
  const [previewing,  setPreviewing]  = useState(false)
  const [confirming,  setConfirming]  = useState(false)
  const [previewRows, setPreviewRows] = useState([])
  const [unmappedCols,setUnmappedCols]= useState([])
  const [selectedKeys,setSelectedKeys]= useState([])
  const [filterStatus,setFilterStatus]= useState('ALL')
  const [result,      setResult]      = useState(null)

  const reset = () => {
    setStep('upload'); setFileList([]); setPreviewRows([])
    setUnmappedCols([]); setSelectedKeys([]); setFilterStatus('ALL'); setResult(null)
  }
  const handleClose = () => { reset(); onClose() }

  // Bước 1: gửi file → nhận preview
  const handlePreview = async () => {
    if (!fileList.length) { message.warning('Vui lòng chọn file Excel'); return }
    setPreviewing(true)
    try {
      const fd = new FormData()
      fd.append('file', fileList[0].originFileObj)
      const { data } = await api.post('/product-master/import/preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const rows = (data.rows || []).map((r, i) => ({ ...r, _key: i }))
      setPreviewRows(rows)
      setUnmappedCols(data.unmappedCols || [])
      // Mặc định chọn tất cả NEW + SUPPLEMENT
      setSelectedKeys(rows.filter(r => r.status === 'NEW' || r.status === 'SUPPLEMENT').map(r => r._key))
      setStep('preview')
    } catch (err) {
      message.error(err?.response?.data?.error || 'Đọc file thất bại')
    } finally {
      setPreviewing(false)
    }
  }

  // Bước 2: gửi các dòng đã chọn → ghi DB
  const handleConfirm = async () => {
    const toSend = previewRows.filter(r => selectedKeys.includes(r._key))
    if (!toSend.length) { message.warning('Chưa chọn dòng nào để import'); return }
    setConfirming(true)
    try {
      const { data } = await api.post('/product-master/import/confirm', toSend)
      setResult(data)
      setStep('result')
      if ((data.added || 0) + (data.supplemented || 0) > 0) onDone()
    } catch (err) {
      message.error(err?.response?.data?.error || 'Xác nhận thất bại')
    } finally {
      setConfirming(false)
    }
  }

  const counts = previewRows.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {})
  const displayRows = filterStatus === 'ALL' ? previewRows : previewRows.filter(r => r.status === filterStatus)
  const selectedActionCount = previewRows.filter(r => selectedKeys.includes(r._key) && (r.status === 'NEW' || r.status === 'SUPPLEMENT')).length

  const previewColumns = [
    { title: 'Dòng', dataIndex: 'rowNum', width: 52, align: 'center',
      render: v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span> },
    { title: 'Trạng thái', dataIndex: 'status', width: 100,
      render: v => {
        const cfg = STATUS_CFG[v] || {}
        return (
          <span style={{
            display: 'inline-block', padding: '1px 8px', borderRadius: 4, fontSize: 11,
            fontWeight: 600, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
          }}>{cfg.label}</span>
        )
      }},
    { title: 'Mã Bravo', dataIndex: 'maBravo', width: 110,
      render: v => v ? <Tag color="blue" style={{ fontWeight: 700, marginRight: 0 }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'Mã TP', dataIndex: 'maTp', width: 90,
      render: v => v ? <span style={{ fontFamily: 'monospace', color: '#1677ff', fontSize: 12 }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'Tên / Tiến Trình', dataIndex: 'tienTrinh', ellipsis: true,
      render: v => <span style={{ fontSize: 12 }}>{v || <span style={{ color: '#d9d9d9' }}>—</span>}</span> },
    { title: 'Thông tin sẽ thay đổi', key: 'changes', width: 220,
      render: (_, r) => {
        if (r.status === 'NEW') return <span style={{ color: '#16a34a', fontSize: 11 }}>Tất cả thông tin</span>
        if (r.status === 'SUPPLEMENT' && r.supplementFields?.length) {
          return (
            <span style={{ fontSize: 11, color: '#d97706' }}>
              {r.supplementFields.map(f => FIELD_LABEL[f] || f).join(' · ')}
            </span>
          )
        }
        if (r.status === 'SKIP') return <span style={{ color: '#94a3b8', fontSize: 11 }}>Đã đầy đủ</span>
        if (r.status === 'ERROR') return <span style={{ color: '#dc2626', fontSize: 11 }}>{r.errorMessage}</span>
        return null
      }},
  ]

  return (
    <Modal
      open={open} onCancel={handleClose} footer={null}
      width={step === 'preview' ? 920 : 560}
      title={
        <Space>
          <FileExcelOutlined style={{ color: '#217346' }} />
          <span>Import Danh mục Mã TP từ Excel</span>
          {step === 'preview' && <Tag color="orange" style={{ marginLeft: 4 }}>Bước 2: Xem trước</Tag>}
          {step === 'result'  && <Tag color="green"  style={{ marginLeft: 4 }}>Hoàn thành</Tag>}
        </Space>
      }
      destroyOnHidden afterClose={reset}
    >

      {/* ── Bước 1: Upload ── */}
      {step === 'upload' && (
        <>
          <Alert type="info" showIcon style={{ marginBottom: 14, fontSize: 12 }}
            message="Định dạng cột Excel (tên cột linh hoạt, hàng 1 là tiêu đề)"
            description={
              <ul style={{ margin: '4px 0 0', paddingLeft: 18, lineHeight: '22px' }}>
                <li><b>Mã Bravo</b> — dùng để tra cứu bản ghi có sẵn</li>
                <li><b>Mã TP</b> — bắt buộc khi thêm mới</li>
                <li><b>Tên / Tiến Trình</b>, <b>Loại SP</b>, <b>KL/ĐV (g)</b></li>
                <li><b>NS Trung Bình</b>, <b>NS PC</b>, <b>NS PL</b>, <b>NS BBC1</b></li>
                <li><b>Máy Móc PC</b>, <b>Máy Móc PL</b>, <b>Máy Móc BBC1</b>, <b>Máy Móc ĐG</b></li>
              </ul>
            }
          />
          <Upload.Dragger accept=".xlsx,.xls" maxCount={1} fileList={fileList}
            beforeUpload={() => false} onChange={({ fileList: fl }) => setFileList(fl)}
            style={{ marginBottom: 14 }}>
            <p className="ant-upload-drag-icon"><UploadOutlined style={{ fontSize: 36, color: '#217346' }} /></p>
            <p className="ant-upload-text" style={{ fontWeight: 600 }}>Kéo thả hoặc click để chọn file Excel</p>
            <p className="ant-upload-hint" style={{ fontSize: 12 }}>.xlsx, .xls</p>
          </Upload.Dragger>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleClose}>Hủy</Button>
            <Button icon={<FileExcelOutlined />}
              style={{ background: '#217346', borderColor: '#217346', color: '#fff', fontWeight: 600 }}
              loading={previewing} disabled={!fileList.length} onClick={handlePreview}>
              Xem trước
            </Button>
          </div>
        </>
      )}

      {/* ── Bước 2: Preview table ── */}
      {step === 'preview' && (
        <>
          {/* Cảnh báo cột không nhận ra */}
          {unmappedCols.length > 0 && (
            <Alert type="warning" showIcon style={{ marginBottom: 10, fontSize: 12 }}
              message={`${unmappedCols.length} cột trong Excel không được nhận ra: ${unmappedCols.join(', ')}`}
            />
          )}

          {/* Thống kê */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            {Object.entries(STATUS_CFG).map(([k, cfg]) => counts[k] ? (
              <div key={k} style={{
                padding: '4px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
                cursor: 'pointer', outline: filterStatus === k ? `2px solid ${cfg.color}` : 'none',
              }} onClick={() => setFilterStatus(filterStatus === k ? 'ALL' : k)}>
                {cfg.label}: {counts[k]}
              </div>
            ) : null)}
            <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
              Tổng: <b style={{ marginLeft: 4 }}>{previewRows.length}</b> dòng
            </div>
          </div>

          {/* Chọn tất / bỏ tất */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Đã chọn: <b>{selectedActionCount}</b> dòng sẽ xử lý</span>
            <Button size="small" onClick={() => setSelectedKeys(previewRows.filter(r => r.status === 'NEW' || r.status === 'SUPPLEMENT').map(r => r._key))}>
              Chọn tất cả
            </Button>
            <Button size="small" onClick={() => setSelectedKeys([])}>Bỏ chọn tất</Button>
            <Button size="small" type="text" style={{ color: '#64748b' }}
              onClick={() => setFilterStatus('ALL')}>
              Xem tất cả ({previewRows.length})
            </Button>
          </div>

          <Table
            size="small"
            dataSource={displayRows}
            columns={previewColumns}
            rowKey="_key"
            scroll={{ x: 800, y: 380 }}
            pagination={false}
            rowSelection={{
              selectedRowKeys: selectedKeys,
              onChange: keys => setSelectedKeys(keys),
              getCheckboxProps: r => ({ disabled: r.status === 'SKIP' || r.status === 'ERROR' }),
            }}
            rowClassName={r => r.status === 'ERROR' ? 'import-row-error' : r.status === 'SKIP' ? 'import-row-skip' : ''}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <Button onClick={() => setStep('upload')}>Quay lại</Button>
            <Space>
              <Button onClick={handleClose}>Hủy</Button>
              <Button type="primary" loading={confirming}
                disabled={selectedActionCount === 0}
                style={{ background: '#217346', borderColor: '#217346', fontWeight: 600 }}
                onClick={handleConfirm}>
                Xác nhận Import {selectedActionCount} dòng
              </Button>
            </Space>
          </div>
        </>
      )}

      {/* ── Bước 3: Kết quả ── */}
      {step === 'result' && result && (
        <>
          <Result
            status={(result.added || 0) + (result.supplemented || 0) > 0 ? 'success' : 'info'}
            title={
              <span>
                Thêm mới <b style={{ color: '#16a34a' }}>{result.added || 0}</b>
                {' · '}
                Bổ sung <b style={{ color: '#d97706' }}>{result.supplemented || 0}</b>
                {' · '}
                Bỏ qua <b style={{ color: '#94a3b8' }}>{result.skipped || 0}</b>
              </span>
            }
            subTitle={
              result.importedBy
                ? `Thực hiện bởi: ${result.importedBy} lúc ${new Date(result.importedAt).toLocaleString('vi-VN')}`
                : undefined
            }
          />
          {result.errors?.length > 0 && (
            <Alert type="error" showIcon icon={<CloseCircleOutlined />}
              style={{ marginBottom: 12, fontSize: 12 }}
              message={`${result.errors.length} lỗi:`}
              description={<ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>} />
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={reset}>Import thêm</Button>
            <Button type="primary" onClick={handleClose}>Đóng</Button>
          </div>
        </>
      )}

      <style>{`
        .import-row-error td { background: #fef2f2 !important; }
        .import-row-skip  td { opacity: 0.55; }
      `}</style>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal: Cập nhật NS từ Excel (2 bước preview → confirm)
// ─────────────────────────────────────────────────────────────────────────────

const NS_CHANGED_CFG  = { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Sẽ cập nhật' }
const NS_NOCHANGE_CFG = { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', label: 'Không đổi'   }
const NS_NOTFOUND_CFG = { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Không tìm thấy' }
const NS_STATUS_CFG   = { CHANGED: NS_CHANGED_CFG, NO_CHANGE: NS_NOCHANGE_CFG, NOT_FOUND: NS_NOTFOUND_CFG }

function NsDiffCell({ oldVal, newVal }) {
  if (newVal == null) return <span style={{ color: '#d9d9d9' }}>—</span>
  const changed = oldVal == null
    ? true
    : Math.abs(Number(oldVal) - Number(newVal)) > 0.00001
  if (!changed) return <span style={{ color: '#94a3b8', fontSize: 12 }}>{Number(newVal).toLocaleString('vi-VN', { maximumFractionDigits: 4 })}</span>
  return (
    <span>
      <span style={{ color: '#94a3b8', textDecoration: 'line-through', fontSize: 11 }}>
        {oldVal != null ? Number(oldVal).toLocaleString('vi-VN', { maximumFractionDigits: 4 }) : '—'}
      </span>
      <span style={{ color: '#16a34a', fontWeight: 700, marginLeft: 6, fontSize: 12 }}>
        → {Number(newVal).toLocaleString('vi-VN', { maximumFractionDigits: 4 })}
      </span>
    </span>
  )
}

function UpdateNsModal({ open, onClose, onDone }) {
  const [step,        setStep]        = useState('upload')  // upload | preview | result
  const [fileList,    setFileList]    = useState([])
  const [previewing,  setPreviewing]  = useState(false)
  const [confirming,  setConfirming]  = useState(false)
  const [previewRows, setPreviewRows] = useState([])
  const [selectedKeys,setSelectedKeys]= useState([])
  const [filterStatus,setFilterStatus]= useState('ALL')
  const [result,      setResult]      = useState(null)

  const reset = () => {
    setStep('upload'); setFileList([]); setPreviewRows([])
    setSelectedKeys([]); setFilterStatus('ALL'); setResult(null)
  }
  const handleClose = () => { reset(); onClose() }

  const handlePreview = async () => {
    if (!fileList.length) { message.warning('Vui lòng chọn file Excel'); return }
    setPreviewing(true)
    try {
      const fd = new FormData()
      fd.append('file', fileList[0].originFileObj)
      const { data } = await api.post('/product-master/update-ns/preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const rows = (data.rows || []).map((r, i) => ({ ...r, _key: i }))
      setPreviewRows(rows)
      setSelectedKeys(rows.filter(r => r.status === 'CHANGED').map(r => r._key))
      setStep('preview')
    } catch (err) {
      const msg = err?.response?.data?.error || 'Đọc file thất bại'
      message.error(msg, 8)
    } finally { setPreviewing(false) }
  }

  const handleConfirm = async () => {
    const toSend = previewRows.filter(r => selectedKeys.includes(r._key))
    if (!toSend.length) { message.warning('Chưa chọn dòng nào'); return }
    setConfirming(true)
    try {
      const { data } = await api.post('/product-master/update-ns/confirm', toSend)
      setResult(data)
      setStep('result')
      if ((data.updated || 0) > 0) onDone()
    } catch (err) {
      message.error(err?.response?.data?.error || 'Xác nhận thất bại')
    } finally { setConfirming(false) }
  }

  const counts = previewRows.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {})
  const displayRows = filterStatus === 'ALL' ? previewRows : previewRows.filter(r => r.status === filterStatus)
  const selectedChangedCount = previewRows.filter(r => selectedKeys.includes(r._key) && r.status === 'CHANGED').length

  const previewColumns = [
    { title: 'Dòng', dataIndex: 'rowNum', width: 52, align: 'center',
      render: v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span> },
    { title: 'Trạng thái', dataIndex: 'status', width: 110,
      render: v => {
        const cfg = NS_STATUS_CFG[v] || {}
        return (
          <span style={{
            display: 'inline-block', padding: '1px 8px', borderRadius: 4, fontSize: 11,
            fontWeight: 600, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
          }}>{cfg.label}</span>
        )
      }},
    { title: 'Mã Bravo', dataIndex: 'maBravo', width: 110,
      render: v => <Tag color="blue" style={{ fontWeight: 700, marginRight: 0 }}>{v}</Tag> },
    { title: 'Tên / Tiến trình', dataIndex: 'tienTrinh', ellipsis: true,
      render: v => <span style={{ fontSize: 12 }}>{v || <span style={{ color: '#d9d9d9' }}>—</span>}</span> },
    { title: 'NS Trung Bình', key: 'slTb', width: 160, align: 'right',
      render: (_, r) => <NsDiffCell oldVal={r.oldSlTrungBinh} newVal={r.newSlTrungBinh} /> },
    { title: 'NS PC', key: 'nsPc', width: 140, align: 'right',
      render: (_, r) => <NsDiffCell oldVal={r.oldNangSuatPc} newVal={r.newNangSuatPc} /> },
    { title: 'NS PL', key: 'nsPl', width: 140, align: 'right',
      render: (_, r) => <NsDiffCell oldVal={r.oldNangSuatPl} newVal={r.newNangSuatPl} /> },
    { title: 'NS BBC1', key: 'nsBbc', width: 140, align: 'right',
      render: (_, r) => <NsDiffCell oldVal={r.oldNangSuatBbc1} newVal={r.newNangSuatBbc1} /> },
  ]

  return (
    <Modal
      open={open} onCancel={handleClose} footer={null}
      width={step === 'preview' ? 1100 : 560}
      title={
        <Space>
          <FileExcelOutlined style={{ color: '#d97706' }} />
          <span>Cập nhật Năng suất (NS) từ Excel</span>
          {step === 'preview' && <Tag color="orange" style={{ marginLeft: 4 }}>Bước 2: Xem trước thay đổi</Tag>}
          {step === 'result'  && <Tag color="green"  style={{ marginLeft: 4 }}>Hoàn thành</Tag>}
        </Space>
      }
      destroyOnHidden afterClose={reset}
    >
      {/* ── Bước 1: Upload ── */}
      {step === 'upload' && (
        <>
          <Alert type="info" showIcon style={{ marginBottom: 14, fontSize: 12 }}
            message="Định dạng file Excel — tra cứu theo Mã Bravo, cập nhật các cột NS"
            description={
              <ul style={{ margin: '4px 0 0', paddingLeft: 18, lineHeight: '22px' }}>
                <li><b>Mã Bravo</b> — bắt buộc, dùng để tìm bản ghi trong hệ thống</li>
                <li><b>NS Trung Bình</b> (hoặc: SL Trung Bình, NS TB...)</li>
                <li><b>NS PC</b> (hoặc: Năng suất PC, NSPC...)</li>
                <li><b>NS PL</b> (hoặc: Năng suất PL, NSPL...)</li>
                <li><b>NS BBC1</b> (hoặc: Năng suất BBC1, NSBBC...)</li>
                <li style={{ color: '#6b7280', marginTop: 4 }}>Chỉ cập nhật các ô có giá trị mới khác giá trị hiện tại</li>
              </ul>
            }
          />
          <Upload.Dragger accept=".xlsx,.xls" maxCount={1} fileList={fileList}
            beforeUpload={() => false} onChange={({ fileList: fl }) => setFileList(fl)}
            style={{ marginBottom: 14 }}>
            <p className="ant-upload-drag-icon"><UploadOutlined style={{ fontSize: 36, color: '#d97706' }} /></p>
            <p className="ant-upload-text" style={{ fontWeight: 600 }}>Kéo thả hoặc click để chọn file Excel</p>
            <p className="ant-upload-hint" style={{ fontSize: 12 }}>.xlsx, .xls</p>
          </Upload.Dragger>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleClose}>Hủy</Button>
            <Button icon={<FileExcelOutlined />}
              style={{ background: '#d97706', borderColor: '#d97706', color: '#fff', fontWeight: 600 }}
              loading={previewing} disabled={!fileList.length} onClick={handlePreview}>
              Xem trước thay đổi
            </Button>
          </div>
        </>
      )}

      {/* ── Bước 2: Preview ── */}
      {step === 'preview' && (
        <>
          {/* Thống kê */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {Object.entries(NS_STATUS_CFG).map(([k, cfg]) => counts[k] ? (
              <div key={k} style={{
                padding: '4px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
                cursor: 'pointer', outline: filterStatus === k ? `2px solid ${cfg.color}` : 'none',
              }} onClick={() => setFilterStatus(filterStatus === k ? 'ALL' : k)}>
                {cfg.label}: {counts[k]}
              </div>
            ) : null)}
            <div style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>
              Tổng: <b>{previewRows.length}</b> dòng từ file
            </div>
          </div>

          {/* Chọn / bỏ */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Đã chọn: <b style={{ color: '#16a34a' }}>{selectedChangedCount}</b> dòng sẽ cập nhật
            </span>
            <Button size="small"
              onClick={() => setSelectedKeys(previewRows.filter(r => r.status === 'CHANGED').map(r => r._key))}>
              Chọn tất cả
            </Button>
            <Button size="small" onClick={() => setSelectedKeys([])}>Bỏ chọn tất</Button>
            <Button size="small" type="text" style={{ color: '#64748b' }}
              onClick={() => setFilterStatus('ALL')}>Xem tất cả ({previewRows.length})</Button>
          </div>

          <Table
            size="small"
            dataSource={displayRows}
            columns={previewColumns}
            rowKey="_key"
            scroll={{ x: 980, y: 380 }}
            pagination={false}
            rowSelection={{
              selectedRowKeys: selectedKeys,
              onChange: keys => setSelectedKeys(keys),
              getCheckboxProps: r => ({ disabled: r.status !== 'CHANGED' }),
            }}
            rowClassName={r =>
              r.status === 'NOT_FOUND' ? 'import-row-error' :
              r.status === 'NO_CHANGE' ? 'import-row-skip' : ''
            }
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <Button onClick={() => setStep('upload')}>Quay lại</Button>
            <Space>
              <Button onClick={handleClose}>Hủy</Button>
              <Button
                loading={confirming}
                disabled={selectedChangedCount === 0}
                style={{ background: '#d97706', borderColor: '#d97706', color: '#fff', fontWeight: 600 }}
                onClick={handleConfirm}>
                Xác nhận cập nhật {selectedChangedCount} dòng
              </Button>
            </Space>
          </div>
        </>
      )}

      {/* ── Bước 3: Kết quả ── */}
      {step === 'result' && result && (
        <>
          <Result
            status={(result.updated || 0) > 0 ? 'success' : 'info'}
            title={
              <span>
                Cập nhật thành công <b style={{ color: '#16a34a' }}>{result.updated || 0}</b> bản ghi
                {(result.skipped || 0) > 0 && <span style={{ color: '#94a3b8', fontWeight: 400 }}> · Bỏ qua {result.skipped}</span>}
              </span>
            }
          />
          {result.errors?.length > 0 && (
            <Alert type="error" showIcon icon={<CloseCircleOutlined />}
              style={{ marginBottom: 12, fontSize: 12 }}
              message={`${result.errors.length} lỗi:`}
              description={<ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>} />
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={reset}>Cập nhật thêm</Button>
            <Button type="primary" onClick={handleClose}>Đóng</Button>
          </div>
        </>
      )}

      <style>{`
        .import-row-error td { background: #fef2f2 !important; }
        .import-row-skip  td { opacity: 0.55; }
      `}</style>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal: Cập nhật Loại SP từ Excel (2 bước preview → confirm)
// ─────────────────────────────────────────────────────────────────────────────

function UpdateLoaiSpModal({ open, onClose, onDone }) {
  const [step,         setStep]         = useState('upload')
  const [fileList,     setFileList]     = useState([])
  const [previewing,   setPreviewing]   = useState(false)
  const [confirming,   setConfirming]   = useState(false)
  const [previewRows,  setPreviewRows]  = useState([])
  const [selectedKeys, setSelectedKeys] = useState([])
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [result,       setResult]       = useState(null)

  const reset = () => {
    setStep('upload'); setFileList([]); setPreviewRows([])
    setSelectedKeys([]); setFilterStatus('ALL'); setResult(null)
  }
  const handleClose = () => { reset(); onClose() }

  const handlePreview = async () => {
    if (!fileList.length) { message.warning('Vui lòng chọn file Excel'); return }
    setPreviewing(true)
    try {
      const fd = new FormData()
      fd.append('file', fileList[0].originFileObj)
      const { data } = await api.post('/product-master/update-loai-sp/preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const rows = (data.rows || []).map((r, i) => ({ ...r, _key: i }))
      setPreviewRows(rows)
      setSelectedKeys(rows.filter(r => r.status === 'CHANGED').map(r => r._key))
      setStep('preview')
    } catch (err) {
      message.error(err?.response?.data?.error || 'Đọc file thất bại', 8)
    } finally { setPreviewing(false) }
  }

  const handleConfirm = async () => {
    const toSend = previewRows.filter(r => selectedKeys.includes(r._key))
    if (!toSend.length) { message.warning('Chưa chọn dòng nào'); return }
    setConfirming(true)
    try {
      const { data } = await api.post('/product-master/update-loai-sp/confirm', toSend)
      setResult(data)
      setStep('result')
      if ((data.updated || 0) > 0) onDone()
    } catch (err) {
      message.error(err?.response?.data?.error || 'Xác nhận thất bại')
    } finally { setConfirming(false) }
  }

  const counts = previewRows.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {})
  const displayRows = filterStatus === 'ALL' ? previewRows : previewRows.filter(r => r.status === filterStatus)
  const selectedChangedCount = previewRows.filter(r => selectedKeys.includes(r._key) && r.status === 'CHANGED').length

  const previewColumns = [
    { title: 'Dòng', dataIndex: 'rowNum', width: 52, align: 'center',
      render: v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span> },
    { title: 'Trạng thái', dataIndex: 'status', width: 120,
      render: v => {
        const cfg = NS_STATUS_CFG[v] || {}
        return (
          <span style={{
            display: 'inline-block', padding: '1px 8px', borderRadius: 4, fontSize: 11,
            fontWeight: 600, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
          }}>{cfg.label}</span>
        )
      }},
    { title: 'Mã Bravo', dataIndex: 'maBravo', width: 120,
      render: v => <Tag color="blue" style={{ fontWeight: 700, marginRight: 0 }}>{v}</Tag> },
    { title: 'Tên / Tiến trình', dataIndex: 'tienTrinh', ellipsis: true,
      render: v => <span style={{ fontSize: 12 }}>{v || <span style={{ color: '#d9d9d9' }}>—</span>}</span> },
    { title: 'Loại SP hiện tại', dataIndex: 'oldLoaiSanPham', width: 160,
      render: v => <span style={{ color: v ? '#374151' : '#d9d9d9', fontSize: 12 }}>{v || '—'}</span> },
    { title: 'Loại SP mới', dataIndex: 'newLoaiSanPham', width: 160,
      render: (v, r) => r.status === 'CHANGED'
        ? <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 12 }}>{v || '—'}</span>
        : <span style={{ color: '#94a3b8', fontSize: 12 }}>{v || '—'}</span> },
  ]

  return (
    <Modal
      open={open} onCancel={handleClose} footer={null}
      width={step === 'preview' ? 900 : 560}
      title={
        <Space>
          <FileExcelOutlined style={{ color: '#0891b2' }} />
          <span>Cập nhật Loại SP từ Excel</span>
          {step === 'preview' && <Tag color="cyan" style={{ marginLeft: 4 }}>Bước 2: Xem trước thay đổi</Tag>}
          {step === 'result'  && <Tag color="green" style={{ marginLeft: 4 }}>Hoàn thành</Tag>}
        </Space>
      }
      destroyOnHidden afterClose={reset}
    >
      {step === 'upload' && (
        <>
          <Alert type="info" showIcon style={{ marginBottom: 14, fontSize: 12 }}
            message="Định dạng file Excel — tra cứu theo Mã Bravo, cập nhật cột Loại SP"
            description={
              <ul style={{ margin: '4px 0 0', paddingLeft: 18, lineHeight: '22px' }}>
                <li><b>Mã Bravo</b> — bắt buộc, dùng để tìm bản ghi trong hệ thống</li>
                <li><b>Loại SP</b> (hoặc: Loai SP, loaiSanPham, Bao che...)</li>
                <li style={{ color: '#6b7280', marginTop: 4 }}>Chỉ cập nhật các ô có giá trị mới khác giá trị hiện tại</li>
              </ul>
            }
          />
          <Upload.Dragger accept=".xlsx,.xls" maxCount={1} fileList={fileList}
            beforeUpload={() => false} onChange={({ fileList: fl }) => setFileList(fl)}
            style={{ marginBottom: 14 }}>
            <p className="ant-upload-drag-icon"><UploadOutlined style={{ fontSize: 36, color: '#0891b2' }} /></p>
            <p className="ant-upload-text" style={{ fontWeight: 600 }}>Kéo thả hoặc click để chọn file Excel</p>
            <p className="ant-upload-hint" style={{ fontSize: 12 }}>.xlsx, .xls</p>
          </Upload.Dragger>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleClose}>Hủy</Button>
            <Button icon={<FileExcelOutlined />}
              style={{ background: '#0891b2', borderColor: '#0891b2', color: '#fff', fontWeight: 600 }}
              loading={previewing} disabled={!fileList.length} onClick={handlePreview}>
              Xem trước thay đổi
            </Button>
          </div>
        </>
      )}

      {step === 'preview' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {Object.entries(NS_STATUS_CFG).map(([k, cfg]) => counts[k] ? (
              <div key={k} style={{
                padding: '4px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
                cursor: 'pointer', outline: filterStatus === k ? `2px solid ${cfg.color}` : 'none',
              }} onClick={() => setFilterStatus(filterStatus === k ? 'ALL' : k)}>
                {cfg.label}: {counts[k]}
              </div>
            ) : null)}
            <div style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>
              Tổng: <b>{previewRows.length}</b> dòng từ file
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Đã chọn: <b style={{ color: '#16a34a' }}>{selectedChangedCount}</b> dòng sẽ cập nhật
            </span>
            <Button size="small"
              onClick={() => setSelectedKeys(previewRows.filter(r => r.status === 'CHANGED').map(r => r._key))}>
              Chọn tất cả
            </Button>
            <Button size="small" onClick={() => setSelectedKeys([])}>Bỏ chọn tất</Button>
            <Button size="small" type="text" style={{ color: '#64748b' }}
              onClick={() => setFilterStatus('ALL')}>Xem tất cả ({previewRows.length})</Button>
          </div>

          <Table
            size="small"
            dataSource={displayRows}
            columns={previewColumns}
            rowKey="_key"
            scroll={{ x: 780, y: 380 }}
            pagination={false}
            rowSelection={{
              selectedRowKeys: selectedKeys,
              onChange: keys => setSelectedKeys(keys),
              getCheckboxProps: r => ({ disabled: r.status !== 'CHANGED' }),
            }}
            rowClassName={r =>
              r.status === 'NOT_FOUND' ? 'import-row-error' :
              r.status === 'NO_CHANGE' ? 'import-row-skip' : ''
            }
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <Button onClick={() => setStep('upload')}>Quay lại</Button>
            <Space>
              <Button onClick={handleClose}>Hủy</Button>
              <Button
                loading={confirming}
                disabled={selectedChangedCount === 0}
                style={{ background: '#0891b2', borderColor: '#0891b2', color: '#fff', fontWeight: 600 }}
                onClick={handleConfirm}>
                Xác nhận cập nhật {selectedChangedCount} dòng
              </Button>
            </Space>
          </div>
        </>
      )}

      {step === 'result' && result && (
        <>
          <Result
            status={(result.updated || 0) > 0 ? 'success' : 'info'}
            title={
              <span>
                Cập nhật thành công <b style={{ color: '#16a34a' }}>{result.updated || 0}</b> bản ghi
                {(result.skipped || 0) > 0 && <span style={{ color: '#94a3b8', fontWeight: 400 }}> · Bỏ qua {result.skipped}</span>}
              </span>
            }
          />
          {result.errors?.length > 0 && (
            <Alert type="error" showIcon icon={<CloseCircleOutlined />}
              style={{ marginBottom: 12, fontSize: 12 }}
              message={`${result.errors.length} lỗi:`}
              description={<ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>} />
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={reset}>Cập nhật thêm</Button>
            <Button type="primary" onClick={handleClose}>Đóng</Button>
          </div>
        </>
      )}

      <style>{`
        .import-row-error td { background: #fef2f2 !important; }
        .import-row-skip  td { opacity: 0.55; }
      `}</style>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 4: Import Excel (dedicated import page)
// ─────────────────────────────────────────────────────────────────────────────

function ImportExcelTab() {
  const [fileList,  setFileList]  = useState([])
  const [importing, setImporting] = useState(false)
  const [result,    setResult]    = useState(null)

  const reset = () => { setFileList([]); setResult(null) }

  const handleImport = async () => {
    if (!fileList.length) { message.warning('Vui lòng chọn file Excel'); return }
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', fileList[0].originFileObj)
      const { data } = await api.post('/product-master-song-an/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
    } catch (err) {
      message.error(err?.response?.data?.error || 'Import thất bại')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div style={{ padding: '28px 36px', maxWidth: 780 }}>
      {/* Header */}
      <div style={{ marginBottom: 22, paddingBottom: 14, borderBottom: '1px solid #e8eaf0' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e4570', marginBottom: 4 }}>
          <FileExcelOutlined style={{ color: '#217346', marginRight: 8 }} />
          Import Danh mục Mã TP Song An từ Excel
        </div>
        <div style={{ color: '#6b7280', fontSize: 12 }}>
          Nhập dữ liệu vào bảng Danh mục Mã TP Song An từ file Excel (.xlsx, .xls). Hàng đầu tiên là tiêu đề cột.
        </div>
      </div>

      {!result ? (
        <>
          {/* Format guide */}
          <Alert
            type="info" showIcon style={{ marginBottom: 20, fontSize: 12 }}
            message="Định dạng cột Excel (tên cột linh hoạt, hàng 1 là tiêu đề)"
            description={
              <div style={{ display: 'flex', gap: 32, marginTop: 6 }}>
                <ul style={{ margin: 0, paddingLeft: 18, lineHeight: '24px' }}>
                  <li><b>Mã TP</b> / <b>Mã sản phẩm</b> — bắt buộc</li>
                  <li><b>Tên sản phẩm</b> / <b>Tên / Tiến Trình</b></li>
                  <li><b>Dạng bào chế</b> / <b>Loại SP</b></li>
                  <li><b>Mã Bravo</b>, <b>KL/ĐV (g)</b></li>
                  <li><b>NS Trung Bình</b>, <b>NS PC</b>, <b>NS PL</b>, <b>NS BBC1</b></li>
                  <li><b>Máy Móc PC</b>, <b>Máy Móc PL</b>, <b>Máy Móc BBC1</b>, <b>Máy Móc ĐG</b></li>
                </ul>
                <ul style={{ margin: 0, paddingLeft: 18, lineHeight: '24px' }}>
                  <li><b>Tổ PCPL</b> — nhóm sản xuất (VD: LOAN, THU CHIẾN)</li>
                  <li><b>Công giao nhận</b>, <b>Công BBC1</b>, <b>Công PC</b>, <b>Công PL</b>, <b>Công ĐG</b></li>
                  <li><b>Tổng công TP</b></li>
                  <li><b>GN/SP</b>, <b>BBC1/SP</b>, <b>PCPL/SP</b>, <b>ĐG/SP</b> — tỉ lệ công/sp</li>
                  <li><b>SP/GN</b>, <b>SP/BBC1</b>, <b>SP/PC</b>, <b>SP/PL</b>, <b>SP/ĐG</b> — sp/ca</li>
                </ul>
              </div>
            }
          />

          {/* Upload area */}
          <Upload.Dragger
            accept=".xlsx,.xls"
            maxCount={1}
            fileList={fileList}
            beforeUpload={() => false}
            onChange={({ fileList: fl }) => setFileList(fl)}
            style={{ marginBottom: 20 }}>
            <p className="ant-upload-drag-icon">
              <UploadOutlined style={{ fontSize: 44, color: '#217346' }} />
            </p>
            <p className="ant-upload-text" style={{ fontWeight: 600 }}>Kéo thả hoặc click để chọn file Excel</p>
            <p className="ant-upload-hint" style={{ fontSize: 12 }}>.xlsx, .xls — tối đa 1 file</p>
          </Upload.Dragger>

          {/* Actions */}
          <Space>
            <Button onClick={reset} disabled={!fileList.length}>Xóa file</Button>
            <Button
              type="primary" icon={<FileExcelOutlined />}
              style={{ background: '#217346', borderColor: '#217346', fontWeight: 600 }}
              loading={importing} disabled={!fileList.length}
              onClick={handleImport}>
              Bắt đầu Import
            </Button>
          </Space>
        </>
      ) : (
        <>
          <Result
            status={(result.imported > 0 || result.updated > 0) ? 'success' : 'info'}
            title={`Thêm mới ${result.imported || 0} · Cập nhật ${result.updated || 0} mã TP Song An`}
            subTitle={result.skipped > 0 ? `Bỏ qua ${result.skipped} dòng` : undefined}
          />
          {result.errors?.length > 0 && (
            <Alert type="error" showIcon icon={<CloseCircleOutlined />}
              style={{ marginBottom: 16, fontSize: 12 }}
              message={`${result.errors.length} lỗi:`}
              description={
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              } />
          )}
          <Button type="primary" ghost onClick={reset}>Import thêm</Button>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2: Danh mục Mã TP
// ─────────────────────────────────────────────────────────────────────────────

// ── ProductMasterDrawer: full-detail drawer ───────────────────────────────────
function ProductMasterDrawer({ open, record, onClose, onEdit }) {
  if (!record) return null
  const fmtN = v => v != null ? <b style={{ color: '#1D4ED8' }}>{Math.round(Number(v)).toLocaleString('vi-VN')}</b> : <span style={{ color: '#d9d9d9' }}>—</span>
  const fmtT = v => v || <span style={{ color: '#d9d9d9' }}>—</span>

  const Section = ({ title, color = '#1D4ED8', children }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 12, color, background: color + '12', borderLeft: `3px solid ${color}`,
        padding: '4px 10px', marginBottom: 8, borderRadius: '0 4px 4px 0' }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', paddingLeft: 4 }}>
        {children}
      </div>
    </div>
  )
  const Row2 = ({ label, value, full }) => (
    <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <span style={{ fontSize: 11, color: '#8c8c8c' }}>{label}</span>
      <div style={{ fontSize: 12, marginTop: 1 }}>{value}</div>
    </div>
  )

  return (
    <Drawer
      open={open} onClose={onClose} width={520}
      title={
        <Space>
          <Tag color="blue" style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{record.maTp}</Tag>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e3a5f' }}>{record.tienTrinh || '—'}</span>
        </Space>
      }
      extra={onEdit && <Button size="small" icon={<EditOutlined />} onClick={() => { onClose(); onEdit(record) }}>Sửa</Button>}
      bodyStyle={{ padding: '16px 20px', background: '#f8faff' }}
    >
      <Section title="Thông tin cơ bản" color="#1D4ED8">
        <Row2 label="Mã Bravo" value={<span style={{ fontFamily: 'monospace', color: '#1677ff', fontWeight: 600 }}>{fmtT(record.maBravo)}</span>} />
        <Row2 label="Loại sản phẩm" value={record.loaiSanPham ? <Tag color="purple" style={{ fontSize: 11 }}>{record.loaiSanPham}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span>} />
        <Row2 label="Tổ/Nhóm PCPL" value={record.toNhomPcpl ? <Tag color={record.toNhomPcpl === 'PCPL1' ? 'geekblue' : 'cyan'} style={{ fontWeight: 600 }}>{record.toNhomPcpl}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span>} />
        <Row2 label="Khối lượng/ĐV (g)" value={fmtN(record.khoiLuong)} />
        <Row2 label="NS Trung Bình (sp/công)" value={fmtN(record.slTrungBinh)} />
        <Row2 label="Tên / Tiến trình" value={<span style={{ fontSize: 12 }}>{fmtT(record.tienTrinh)}</span>} full />
        {record.ghiChu && <Row2 label="Ghi chú" value={<span style={{ fontSize: 12, color: '#6b7280' }}>{record.ghiChu}</span>} full />}
      </Section>

      <Section title="Máy móc" color="#6d28d9">
        <Row2 label="Máy Móc PC"   value={fmtT(record.mayMocPc)} />
        <Row2 label="Máy Móc PL"   value={fmtT(record.mayMocPl)} />
        <Row2 label="Máy Móc BBC1" value={fmtT(record.mayMocBbc1)} />
        <Row2 label="Máy Móc ĐG"   value={fmtT(record.mayMocDg)} />
        <Row2 label="NS PC (sp/công)"   value={fmtN(record.nangSuatPc)} />
        <Row2 label="NS PL (sp/công)"   value={fmtN(record.nangSuatPl)} />
        <Row2 label="NS BBC1 (sp/công)" value={fmtN(record.nangSuatBbc1)} />
      </Section>

      {(() => {
        try {
          const rows = JSON.parse(record.nangSuatPcMe || '[]')
          if (!rows.length) return null
          return (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#1677ff', background: '#e6f4ff', borderLeft: '3px solid #1677ff',
                padding: '4px 10px', marginBottom: 8, borderRadius: '0 4px 4px 0' }}>⚡ NS PC theo số mẻ</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', paddingLeft: 4 }}>
                {rows.map((r, i) => (
                  <div key={i}>
                    <span style={{ fontSize: 11, color: '#8c8c8c' }}>{r.soMe} mẻ</span>
                    <div style={{ fontSize: 12, marginTop: 1, fontWeight: 600, color: '#1D4ED8' }}>
                      {r.nangSuat != null ? Math.round(Number(r.nangSuat)).toLocaleString('vi-VN') : '—'}
                      <span style={{ fontWeight: 400, color: '#64748b', fontSize: 11 }}> sp/công</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        } catch { return null }
      })()}

    </Drawer>
  )
}

function LoaiSpCell({ record, value, canEdit, allOptions, onPatch }) {
  const [inputVal, setInputVal] = useState('')
  const [popOpen,  setPopOpen]  = useState(false)

  if (!canEdit) {
    return value
      ? <Tag color="purple" style={{ marginRight: 0, fontSize: 11 }}>{value}</Tag>
      : <span style={{ color: '#d9d9d9' }}>—</span>
  }

  const handleSelect = opt => {
    onPatch(record, value === opt ? null : opt)
    setPopOpen(false)
  }
  const handleAdd = () => {
    const v = inputVal.trim()
    if (!v) return
    onPatch(record, v)
    setInputVal('')
    setPopOpen(false)
  }

  const content = (
    <div style={{ minWidth: 170 }} onClick={e => e.stopPropagation()}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>Chọn hoặc nhập loại SP mới:</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
        {allOptions.map(opt => (
          <Tag key={opt}
            color={value === opt ? 'purple' : 'default'}
            style={{ cursor: 'pointer', fontWeight: 600, margin: 0, opacity: value === opt ? 1 : 0.65 }}
            onClick={() => handleSelect(opt)}>
            {value === opt ? '✓ ' : ''}{opt}
          </Tag>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <Input size="small" placeholder="Loại mới..." value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          style={{ flex: 1 }}
        />
        <Button size="small" type="primary" disabled={!inputVal.trim()} onClick={handleAdd}>Thêm</Button>
      </div>
      {value && (
        <div style={{ marginTop: 8, textAlign: 'center' }}>
          <span style={{ color: '#cf1322', cursor: 'pointer', fontSize: 12 }}
            onClick={() => { onPatch(record, null); setPopOpen(false) }}>
            ✕ Xóa loại SP
          </span>
        </div>
      )}
    </div>
  )

  return (
    <Popover content={content} trigger="click" open={popOpen} onOpenChange={setPopOpen} placement="bottom">
      <div data-no-row-click style={{ cursor: 'pointer', display: 'inline-block' }}>
        {value
          ? <Tag color="purple" style={{ marginRight: 0, fontSize: 11 }}>{value}</Tag>
          : <span style={{ color: '#94a3b8', fontSize: 11, border: '1px dashed #cbd5e1', borderRadius: 4, padding: '1px 6px' }}>+ Thêm</span>}
      </div>
    </Popover>
  )
}

function ProductMasterTab() {
  const { canEditProductMaster, isAdmin } = useAuth()
  const canEdit = canEditProductMaster()

  const [data,        setData]        = useState([])
  const [loading,     setLoading]     = useState(false)
  const [pagination,  setPagination]  = useState({ current: 1, pageSize: 20, total: 0 })
  const [keyword,     setKeyword]     = useState('')
  const [filterPcpl, setFilterPcpl]  = useState(null)
  const [filterLoaiSp, setFilterLoaiSp] = useState(null)
  const [filterMay,    setFilterMay]    = useState('')
  const [allData,      setAllData]      = useState(null) // loaded when local filters active
  const [allLoaiSp,    setAllLoaiSp]    = useState([])  // tất cả loại SP từ DB
  const [modalOpen,   setModalOpen]   = useState(false)
  const [detailOpen,  setDetailOpen]  = useState(false)
  const [detailItem,  setDetailItem]  = useState(null)
  const [editItem,    setEditItem]    = useState(null)
  const [syncing,           setSyncing]           = useState(false)
  const [resetting,         setResetting]         = useState(false)
  const [importOpen,        setImportOpen]         = useState(false)
  const [updateNsOpen,      setUpdateNsOpen]       = useState(false)
  const [updateLoaiSpOpen,  setUpdateLoaiSpOpen]   = useState(false)
  const [deletingNoBravo,   setDeletingNoBravo]   = useState(false)
  const [history,           setHistory]           = useState([])
  const [historyLoading,    setHistoryLoading]    = useState(false)
  const [newItemId,         setNewItemId]         = useState(null)
  const [nangSuatPcMeRows, setNangSuatPcMeRows] = useState([
    { soMe: 1, nangSuat: null },
    { soMe: 2, nangSuat: null },
    { soMe: 3, nangSuat: null },
  ])
  const [form] = Form.useForm()

  const fetchData = useCallback(async (page = 0, size = 20, kw = keyword, pcpl = filterPcpl, { silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const params = { page, size }
      if (kw?.trim()) params.keyword = kw.trim()
      if (pcpl) params.toNhomPcpl = pcpl
      const { data: res } = await api.get('/product-master', { params })
      setData(res.content)
      setPagination(p => ({ ...p, total: res.totalElements }))
    } catch { message.error('Không thể tải danh mục') }
    finally { if (!silent) setLoading(false) }
  }, [keyword, filterPcpl])

  // Fetch toàn bộ data (không phân trang) để áp filter local
  const fetchAll = useCallback(async (kw = keyword, pcpl = filterPcpl) => {
    setLoading(true)
    try {
      const params = { page: 0, size: 5000 }
      if (kw?.trim()) params.keyword = kw.trim()
      if (pcpl) params.toNhomPcpl = pcpl
      const { data: res } = await api.get('/product-master', { params })
      setAllData(res.content)
    } catch { message.error('Không thể tải danh mục') }
    finally { setLoading(false) }
  }, [keyword, filterPcpl])

  // displayData: áp loaiSp + may filter lên allData (hoặc data nếu chưa load all)
  const normStr = v => (v || '').trim().toLowerCase()
  const displayData = useMemo(() => {
    const base = allData ?? data
    let d = base
    if (filterLoaiSp) d = d.filter(r => normStr(r.loaiSanPham) === normStr(filterLoaiSp))
    if (filterMay?.trim()) {
      const q = filterMay.trim().toLowerCase()
      d = d.filter(r =>
        (r.mayMocPc   || '').toLowerCase().includes(q) ||
        (r.mayMocPl   || '').toLowerCase().includes(q) ||
        (r.mayMocBbc1 || '').toLowerCase().includes(q) ||
        (r.mayMocDg   || '').toLowerCase().includes(q)
      )
    }
    return d
  }, [data, allData, filterLoaiSp, filterMay])

  const hasLocalFilter = !!(filterLoaiSp || filterMay?.trim())

  // Khi local filter thay đổi → load all; khi xóa filter → dùng lại data server
  useEffect(() => {
    if (hasLocalFilter) fetchAll()
    else setAllData(null)
  }, [filterLoaiSp, filterMay]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    api.get('/product-master/loai-san-pham-distinct')
      .then(({ data: list }) => setAllLoaiSp(Array.isArray(list) ? list : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = () => fetchData(pagination.current - 1, pagination.pageSize, undefined, undefined, { silent: true })
    window.addEventListener('app:silent-refresh', handler)
    return () => window.removeEventListener('app:silent-refresh', handler)
  }, [fetchData, pagination.current, pagination.pageSize])

  const onSave = async () => {
    const values = await form.validateFields()
    try {
      const filtered = nangSuatPcMeRows.filter(r => r.nangSuat != null && r.nangSuat !== '')
      values.nangSuatPcMe = filtered.length > 0 ? JSON.stringify(filtered) : null
      if (editItem) {
        await api.put(`/product-master/${editItem.id}`, values)
        message.success('Đã cập nhật')
        // Reload history to show the new entry
        api.get(`/product-master/${editItem.id}/history`)
          .then(res => setHistory(res.data || []))
          .catch(() => {})
      } else {
        const { data: created } = await api.post('/product-master', values)
        message.success('Đã thêm')
        setModalOpen(false)
        // Prepend mã mới lên đầu trang 1 và highlight 4 giây
        setData(prev => [created, ...prev.filter(r => r.id !== created.id)])
        setPagination(p => ({ ...p, current: 1, total: p.total + 1 }))
        setNewItemId(created.id)
        setTimeout(() => setNewItemId(null), 4000)
        return
      }
      setModalOpen(false); fetchData(pagination.current - 1)
    } catch { message.error('Lưu thất bại') }
  }

  const onDelete = async (id) => {
    try { await api.delete(`/product-master/${id}`); message.success('Đã xóa'); fetchData(0) }
    catch { message.error('Xóa thất bại') }
  }

  const onSyncFromSongAn = async () => {
    setSyncing(true)
    try {
      const { data } = await api.post('/product-master/sync-from-song-an')
      message.success(`Đã cập nhật ${data.updated} mã TP (bỏ qua ${data.skipped})`)
      if (data.updated > 0) fetchData(pagination.current - 1, pagination.pageSize)
    } catch { message.error('Đồng bộ thất bại') }
    finally { setSyncing(false) }
  }

  const onResetSync = async () => {
    setResetting(true)
    try {
      const { data } = await api.post('/product-master/reset-sync')
      message.success(`Đã khôi phục ${data.reset} mã TP về trạng thái ban đầu`)
      fetchData(pagination.current - 1, pagination.pageSize)
    } catch { message.error('Khôi phục thất bại') }
    finally { setResetting(false) }
  }

  const onDeleteNoBravo = async () => {
    try {
      const { data: cnt } = await api.get('/product-master/count-no-bravo')
      if (cnt.count === 0) { message.info('Không có bản ghi nào thiếu Mã Bravo'); return }
      Modal.confirm({
        title: `Xóa ${cnt.count} bản ghi không có Mã Bravo?`,
        content: 'Đây là các bản ghi được tạo bởi import lỗi (Mã Bravo trống). Thao tác không thể hoàn tác!',
        okText: `Xóa ${cnt.count} bản ghi`,
        okType: 'danger',
        cancelText: 'Hủy',
        onOk: async () => {
          setDeletingNoBravo(true)
          try {
            const { data } = await api.delete('/product-master/bulk-no-bravo')
            message.success(`Đã xóa ${data.deleted} bản ghi không có Mã Bravo`)
            fetchData(0)
          } catch { message.error('Xóa thất bại') }
          finally { setDeletingNoBravo(false) }
        },
      })
    } catch { message.error('Không thể lấy thông tin') }
  }

  const numCell = v => v != null
    ? <span style={{ fontWeight: 600, color: '#1D4ED8' }}>{Math.round(Number(v)).toLocaleString('vi-VN')}</span>
    : <span style={{ color: '#d9d9d9' }}>—</span>

  const txtCell = v => v
    ? <span style={{ fontSize: 12 }}>{v}</span>
    : <span style={{ color: '#d9d9d9' }}>—</span>

  const patchPcpl = async (record, newValue) => {
    try {
      await api.patch(`/product-master/${record.id}/to-nhom-pcpl`, { value: newValue ?? null })
      setData(prev => prev.map(r => r.id === record.id ? { ...r, toNhomPcpl: newValue ?? null } : r))
    } catch { message.error('Cập nhật thất bại') }
  }

  const patchLoaiSp = async (record, newValue) => {
    try {
      await api.patch(`/product-master/${record.id}/loai-san-pham`, { value: newValue ?? null })
      setData(prev => prev.map(r => r.id === record.id ? { ...r, loaiSanPham: newValue ?? null } : r))
    } catch { message.error('Cập nhật thất bại') }
  }

  const loaiSpOptions = useMemo(() => {
    const defaults = [
      'Nhũ Tương', 'Dung Dịch', 'Gel', 'Serum', 'Toner',
      'Kem O/W', 'Kem W/O', 'Kem chống nắng',
      'Sơn sáp', 'Son môi', 'Sáp', 'Nến',
      'Bột', 'Phấn',
      'Dầu gội', 'Sữa tắm', 'Sữa rửa mặt', 'Sữa tắm dầu gội',
      'Nước tẩy trang', 'Xịt khoáng', 'Nước súc miệng',
      'Chiết xuất', 'Tinh chất',
    ]
    const fromData = data.filter(r => r.loaiSanPham).map(r => r.loaiSanPham)
    return [...new Set([...defaults, ...allLoaiSp, ...fromData])]
  }, [data, allLoaiSp])

  const DEFAULT_NS_ROWS = [
    { soMe: 1, nangSuat: null },
    { soMe: 2, nangSuat: null },
    { soMe: 3, nangSuat: null },
  ]

  const openEdit = (r) => {
    setEditItem(r)
    form.setFieldsValue({
      ...r,
      spCong:       r.spCong       != null ? Number(r.spCong)       : null,
      slTrungBinh:  r.slTrungBinh  != null ? Number(r.slTrungBinh)  : 1000,
      nangSuatPc:   r.nangSuatPc   != null ? Number(r.nangSuatPc)   : null,
      nangSuatPl:   r.nangSuatPl   != null ? Number(r.nangSuatPl)   : null,
      nangSuatBbc1: r.nangSuatBbc1 != null ? Number(r.nangSuatBbc1) : null,
    })
    // Parse nangSuatPcMe JSON
    try {
      const rows = JSON.parse(r.nangSuatPcMe || '[]')
      setNangSuatPcMeRows(rows.length > 0 ? rows.map(x => ({ soMe: x.soMe, nangSuat: x.nangSuat != null ? Number(x.nangSuat) : null })) : DEFAULT_NS_ROWS)
    } catch { setNangSuatPcMeRows(DEFAULT_NS_ROWS) }
    setHistory([])
    setModalOpen(true)
    // Load history async
    setHistoryLoading(true)
    api.get(`/product-master/${r.id}/history`)
      .then(res => setHistory(res.data || []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  }

  const columns = [
    { title: '#', key: 'stt', width: 44, align: 'center',
      render: (_, __, i) => <span style={{ color: '#aaa', fontSize: 11 }}>{(pagination.current - 1) * pagination.pageSize + i + 1}</span> },
    { title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 120, fixed: 'left',
      render: v => v ? <Tag color="blue" style={{ fontWeight: 700, marginRight: 0 }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'Mã TP', dataIndex: 'maTp', key: 'maTp', width: 120,
      render: v => v ? <span style={{ fontFamily: 'monospace', color: '#1677ff' }}>{v}</span> : '—' },
    { title: 'Tên / Tiến Trình', dataIndex: 'tienTrinh', key: 'tienTrinh', width: 240, ellipsis: true,
      render: v => <span style={{ fontSize: 12 }}>{v || '—'}</span> },
    { title: 'Loại SP', dataIndex: 'loaiSanPham', key: 'loaiSanPham', width: 140,
      render: (v, record) => (
        <LoaiSpCell record={record} value={v} canEdit={canEdit} allOptions={loaiSpOptions} onPatch={patchLoaiSp} />
      )},
    { title: 'Tổ/Nhóm PCPL', dataIndex: 'toNhomPcpl', key: 'toNhomPcpl', width: 120, align: 'center',
      render: (v, record) => {
        const opts = [
          { value: 'PCPL1', color: 'geekblue' },
          { value: 'PCPL2', color: 'cyan' },
        ]
        const content = (
          <div style={{ display: 'flex', gap: 6, flexDirection: 'column', minWidth: 90 }} onClick={e => e.stopPropagation()}>
            {opts.map(o => (
              <Tag key={o.value} color={v === o.value ? o.color : 'default'}
                style={{ cursor: 'pointer', fontWeight: 600, textAlign: 'center', margin: 0, opacity: v === o.value ? 1 : 0.55 }}
                onClick={() => patchPcpl(record, v === o.value ? null : o.value)}>
                {v === o.value ? '✓ ' : ''}{o.value}
              </Tag>
            ))}
          </div>
        )
        if (!canEdit) return v ? <Tag color={v === 'PCPL1' ? 'geekblue' : 'cyan'} style={{ marginRight: 0, fontWeight: 600 }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span>
        return (
          <Popover content={content} trigger="click" placement="bottom">
            <div data-no-row-click style={{ cursor: 'pointer', display: 'inline-block' }}>
              {v
                ? <Tag color={v === 'PCPL1' ? 'geekblue' : 'cyan'} style={{ marginRight: 0, fontWeight: 600 }}>{v}</Tag>
                : <span style={{ color: '#bbb', fontSize: 13, letterSpacing: 1 }}>— chọn —</span>}
            </div>
          </Popover>
        )
      }
    },
    { title: 'KL/ĐV (g)', dataIndex: 'khoiLuong', key: 'khoiLuong', width: 100, align: 'right', render: numCell },
    { title: 'SP/Công', dataIndex: 'spCong', key: 'spCong', width: 100, align: 'right', render: numCell },
    { title: 'NS Trung Bình', dataIndex: 'slTrungBinh', key: 'slTrungBinh', width: 120, align: 'right', render: numCell },
    { title: 'NS PC', dataIndex: 'nangSuatPc', key: 'nangSuatPc', width: 100, align: 'right', render: numCell },
    { title: 'NS PL', dataIndex: 'nangSuatPl', key: 'nangSuatPl', width: 100, align: 'right', render: numCell },
    { title: 'NS BBC1', dataIndex: 'nangSuatBbc1', key: 'nangSuatBbc1', width: 100, align: 'right', render: numCell },
    { title: 'Máy Móc PC', dataIndex: 'mayMocPc', key: 'mayMocPc', width: 160, render: txtCell },
    { title: 'Máy Móc PL', dataIndex: 'mayMocPl', key: 'mayMocPl', width: 200, render: txtCell },
    { title: 'Máy Móc BBC1', dataIndex: 'mayMocBbc1', key: 'mayMocBbc1', width: 160, render: txtCell },
    { title: 'Máy Móc ĐG', dataIndex: 'mayMocDg', key: 'mayMocDg', width: 140, render: txtCell },
    { title: 'Ghi chú', dataIndex: 'ghiChu', key: 'ghiChu', width: 200, ellipsis: true, render: txtCell },
    {
      title: '', key: 'action', width: canEdit ? 80 : 50, align: 'center', fixed: 'right',
      render: (_, r) => (
        <Space size={4} onClick={e => e.stopPropagation()}>
          {canEdit && (
            <>
              <Tooltip title="Sửa">
                <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(r)} />
              </Tooltip>
              <Popconfirm title="Xóa mã TP này?" okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }} onConfirm={() => onDelete(r.id)}>
                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          )}
          <Tooltip title="Xem chi tiết">
            <Button size="small" type="text" icon={<EyeOutlined />}
              onClick={() => { setDetailItem(r); setDetailOpen(true) }} />
          </Tooltip>
        </Space>
      )
    },
  ]

  return (
    <>
      <div style={{ padding: '10px 16px 8px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input.Search size="small" placeholder="Tìm Mã TP / Tên..." style={{ width: 220 }}
          value={keyword} onChange={e => setKeyword(e.target.value)}
          onSearch={() => { if (hasLocalFilter) fetchAll(keyword, filterPcpl); else fetchData(0) }} allowClear />
        <Select size="small" allowClear placeholder="Tất cả tổ PCPL" style={{ width: 140 }}
          value={filterPcpl}
          onChange={v => {
            const next = v ?? null; setFilterPcpl(next)
            if (hasLocalFilter) fetchAll(keyword, next)
            else fetchData(0, pagination.pageSize, keyword, next)
          }}
          options={[
            { value: 'PCPL1', label: <><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#2f54eb', marginRight: 6 }} />PCPL1</> },
            { value: 'PCPL2', label: <><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#13c2c2', marginRight: 6 }} />PCPL2</> },
          ]} />
        <Select size="small" allowClear placeholder="Tất cả loại SP" style={{ width: 160 }}
          value={filterLoaiSp} showSearch
          onChange={v => setFilterLoaiSp(v ?? null)}
          filterOption={(input, opt) => (opt.value || '').toLowerCase().includes(input.toLowerCase())}
          options={loaiSpOptions.map(v => ({ value: v, label: v }))} />
        <Input size="small" placeholder="Tìm theo máy..." style={{ width: 150 }}
          value={filterMay} onChange={e => setFilterMay(e.target.value)} allowClear />
        {hasLocalFilter && (
          <span style={{ fontSize: 11, color: '#1677ff', fontStyle: 'italic' }}>
            {displayData.length} kết quả
          </span>
        )}
        <Button size="small" icon={<ReloadOutlined />} onClick={() => {
          if (hasLocalFilter) fetchAll(); else fetchData(0)
        }} />
        {canEdit && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Button size="small" icon={<FileExcelOutlined />}
              style={{ borderColor: '#217346', color: '#217346', fontWeight: 600 }}
              onClick={() => setImportOpen(true)}>
              Import Excel
            </Button>
            <Tooltip title="Cập nhật NS Trung bình, NS PC, NS PL, NS BBC1 từ file Excel theo Mã Bravo">
              <Button size="small" icon={<FileExcelOutlined />}
                style={{ borderColor: '#d97706', color: '#d97706', fontWeight: 600 }}
                onClick={() => setUpdateNsOpen(true)}>
                Cập nhật NS
              </Button>
            </Tooltip>
            <Button type="primary" size="small" icon={<PlusOutlined />}
              style={{ background: '#1D4ED8', borderColor: '#1D4ED8', fontWeight: 600 }}
              onClick={() => { setEditItem(null); form.resetFields(); setNangSuatPcMeRows([{soMe:1,nangSuat:null},{soMe:2,nangSuat:null},{soMe:3,nangSuat:null}]); setModalOpen(true) }}>
              Thêm Mã TP
            </Button>
          </div>
        )}
      </div>
      <Table className="dm-table" columns={columns} dataSource={displayData} rowKey="id"
        loading={loading} size="small" scroll={{ x: 1500 }}
        sticky={{ offsetHeader: 44 }}
        rowClassName={r => r.id === newItemId ? 'row-new-highlight' : ''}
        onRow={record => ({
          style: { cursor: 'pointer' },
          onClick: (e) => {
            if (e.target.closest('[data-no-row-click]')) return
            canEdit ? openEdit(record) : (() => { setDetailItem(record); setDetailOpen(true) })()
          },
        })}
        pagination={hasLocalFilter ? {
          size: 'small', showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100', '200'],
          defaultPageSize: 50,
          showTotal: t => `${t} mã TP (đã lọc)`,
        } : {
          ...pagination, size: 'small', showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100'],
          showTotal: t => `Tổng ${t} mã TP`,
          onChange: (p, ps) => { setPagination(prev => ({ ...prev, current: p, pageSize: ps })); fetchData(p - 1, ps, keyword, filterPcpl) }
        }} />

      <ProductMasterDrawer
        open={detailOpen} record={detailItem}
        onClose={() => setDetailOpen(false)}
        onEdit={canEdit ? (r) => { setDetailOpen(false); openEdit(r) } : null}
      />

      <ImportProductMasterModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={() => fetchData(0)}
      />

      <UpdateNsModal
        open={updateNsOpen}
        onClose={() => setUpdateNsOpen(false)}
        onDone={() => fetchData(pagination.current - 1, pagination.pageSize)}
      />

      <UpdateLoaiSpModal
        open={updateLoaiSpOpen}
        onClose={() => setUpdateLoaiSpOpen(false)}
        onDone={() => fetchData(pagination.current - 1, pagination.pageSize)}
      />

      <Modal open={modalOpen} onOk={onSave} onCancel={() => setModalOpen(false)}
        okText="Lưu" cancelText="Hủy" width={680}
        title={<Space><AppstoreOutlined style={{ color: '#1D4ED8' }} /><span>{editItem ? 'Sửa Mã TP' : 'Thêm Mã TP'}</span></Space>}
        destroyOnHidden>
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="Mã TP" name="maTp" rules={[{ required: true, message: 'Nhập Mã TP' }]}>
                <Input style={{ fontFamily: 'monospace', fontWeight: 700 }} disabled={!!editItem} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Mã Bravo" name="maBravo">
                <Input style={{ fontFamily: 'monospace' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="SP/Công" name="spCong">
                <InputNumber style={{ width: '100%' }} min={0}
                  formatter={v => v ? Math.round(Number(v)).toLocaleString('vi-VN') : ''}
                  parser={v => v ? v.replace(/[^\d]/g, '') : ''} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="NS Trung Bình (sp/công)" name="slTrungBinh">
                <InputNumber style={{ width: '100%' }} min={0}
                  formatter={v => v ? Math.round(Number(v)).toLocaleString('vi-VN') : ''}
                  parser={v => v ? v.replace(/[^\d]/g, '') : ''} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Tên / Tiến Trình" name="tienTrinh" rules={[{ required: true, message: 'Nhập tên tiến trình' }]}>
            <Input.TextArea autoSize={{ minRows: 2 }} />
          </Form.Item>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="Loại sản phẩm" name="loaiSanPham">
                <AutoComplete
                  placeholder="Chọn hoặc nhập loại SP..."
                  options={loaiSpOptions.map(v => ({ value: v }))}
                  filterOption={(input, opt) => opt.value.toLowerCase().includes(input.toLowerCase())}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Tổ/Nhóm PCPL" name="toNhomPcpl">
                <Select placeholder="Chọn tổ PCPL" allowClear options={[
                  { value: 'PCPL1', label: 'PCPL1' },
                  { value: 'PCPL2', label: 'PCPL2' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Khối lượng 1 đơn vị (gram)" name="khoiLuong">
                <InputNumber style={{ width: '100%' }} min={0} step={0.1}
                  placeholder="VD: 50, 100, 250..."
                  formatter={v => v ? Math.round(Number(v)).toLocaleString('vi-VN') : ''}
                  parser={v => v ? v.replace(/[^\d]/g, '') : ''} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="Năng suất PC (sp/công)" name="nangSuatPc">
                <InputNumber style={{ width: '100%' }} min={0}
                  formatter={v => v ? Math.round(Number(v)).toLocaleString('vi-VN') : ''}
                  parser={v => v ? v.replace(/[^\d]/g, '') : ''} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Năng suất PL (sp/công)" name="nangSuatPl">
                <InputNumber style={{ width: '100%' }} min={0}
                  formatter={v => v ? Math.round(Number(v)).toLocaleString('vi-VN') : ''}
                  parser={v => v ? v.replace(/[^\d]/g, '') : ''} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Năng suất BBC1 (sp/công)" name="nangSuatBbc1">
                <InputNumber style={{ width: '100%' }} min={0}
                  formatter={v => v ? Math.round(Number(v)).toLocaleString('vi-VN') : ''}
                  parser={v => v ? v.replace(/[^\d]/g, '') : ''} />
              </Form.Item>
            </Col>
          </Row>

          {/* ── Năng suất PC theo số mẻ ── */}
          <div style={{ marginBottom: 12, border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ background: '#e6f4ff', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #bae0ff' }}>
              <span style={{ fontWeight: 700, fontSize: 12, color: '#1677ff' }}>⚡ Năng suất PC theo số mẻ (sp/công)</span>
              <Button size="small" icon={<PlusOutlined />} type="link"
                onClick={() => setNangSuatPcMeRows(prev => [...prev, { soMe: (prev[prev.length - 1]?.soMe || 0) + 1, nangSuat: null }])}>
                Thêm mẻ
              </Button>
            </div>
            {nangSuatPcMeRows.map((row, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderBottom: idx < nangSuatPcMeRows.length - 1 ? '1px solid #f0f0f0' : 'none', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                <span style={{ fontSize: 12, color: '#475569', fontWeight: 700, minWidth: 44, textAlign: 'center',
                  background: '#f1f5f9', borderRadius: 4, padding: '2px 6px' }}>
                  {row.soMe} mẻ
                </span>
                <InputNumber
                  size="small" style={{ flex: 1 }} value={row.nangSuat} min={0}
                  placeholder="Nhập năng suất..."
                  formatter={v => v ? Math.round(Number(v)).toLocaleString('vi-VN') : ''}
                  parser={v => v ? v.replace(/[^\d]/g, '') : ''}
                  onChange={val => setNangSuatPcMeRows(prev => prev.map((r, i) => i === idx ? { ...r, nangSuat: val } : r))}
                />
                <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 42 }}>sp/công</span>
                <Button size="small" type="text" danger icon={<CloseCircleOutlined />}
                  onClick={() => setNangSuatPcMeRows(prev => prev.filter((_, i) => i !== idx))} />
              </div>
            ))}
            {nangSuatPcMeRows.length === 0 && (
              <div style={{ padding: '10px 12px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                Chưa có dữ liệu. Nhấn "Thêm mẻ" để thêm.
              </div>
            )}
          </div>

          <Form.Item label="Máy Móc PC" name="mayMocPc">
            <Select placeholder="Chọn máy móc PC" allowClear showSearch options={[
              { value: 'Máy nhũ hóa 500L',  label: 'Máy nhũ hóa 500L' },
              { value: 'Máy Khuấy 1500L',   label: 'Máy Khuấy 1500L' },
              { value: 'Máy Khuấy 700L',    label: 'Máy Khuấy 700L' },
              { value: 'Máy nhũ hóa 100L',  label: 'Máy nhũ hóa 100L' },
              { value: 'Thủ Công',          label: 'Thủ Công' },
            ]} />
          </Form.Item>

          <Form.Item label="Máy Móc PL" name="mayMocPl">
            <Select placeholder="Chọn máy móc PL" allowClear showSearch options={[
              { value: 'Máy Chiết Tube Hàn Nhiệt', label: 'Máy Chiết Tube Hàn Nhiệt' },
              { value: 'Máy Chiết Tube Hàn Seal',  label: 'Máy Chiết Tube Hàn Seal' },
              { value: 'Máy Chiết Bánh Răng',      label: 'Máy Chiết Bánh Răng' },
              { value: 'Máy Chiết 4 vòi bơm khí',  label: 'Máy Chiết 4 vòi bơm khí' },
              { value: 'Máy Chiết 4 vòi bơm từ',   label: 'Máy Chiết 4 vòi bơm từ' },
              { value: 'Máy Chiết 2 vòi',           label: 'Máy Chiết 2 vòi' },
              { value: 'Máy Chiết mặt nạ',          label: 'Máy Chiết mặt nạ' },
              { value: 'Máy Chiết Nhu Động',        label: 'Máy Chiết Nhu Động' },
              { value: 'Máy Chiết Bột',             label: 'Máy Chiết Bột' },
              { value: 'Thủ Công/ Sục ozon',        label: 'Thủ Công/ Sục ozon' },
            ]} />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Máy Móc BBC1" name="mayMocBbc1">
                <Input placeholder="Tên máy móc BBC1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Máy Móc ĐG" name="mayMocDg">
                <Input placeholder="Tên máy móc ĐG" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Ghi chú" name="ghiChu">
                <Input.TextArea rows={2} placeholder="Ghi chú thêm về sản phẩm..." maxLength={500} showCount />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {/* ── Lịch sử chỉnh sửa ── */}
        {editItem && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 10px', background: '#f8fafc',
              borderRadius: 6, borderLeft: '3px solid #1D4ED8',
              marginBottom: 10,
            }}>
              <HistoryOutlined style={{ color: '#1D4ED8', fontSize: 13 }} />
              <span style={{ fontWeight: 700, fontSize: 12, color: '#1e3a5f' }}>Lịch sử chỉnh sửa</span>
              {!historyLoading && history.length > 0 && (
                <Tag style={{ marginLeft: 'auto', fontSize: 11 }} color="blue">{history.length} lần</Tag>
              )}
            </div>
            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}><Spin size="small" /></div>
            ) : history.length === 0 ? (
              <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '8px 0' }}>
                Chưa có lịch sử chỉnh sửa
              </div>
            ) : (
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                <Timeline style={{ padding: '4px 0 0 4px' }}
                  items={history.map(h => {
                    let changes = []
                    try { changes = JSON.parse(h.changesJson) } catch {}
                    return {
                      dot: <HistoryOutlined style={{ fontSize: 11, color: '#1D4ED8' }} />,
                      children: (
                        <div style={{ paddingBottom: 8 }}>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                            <b style={{ color: '#1e293b' }}>{h.changedBy}</b>
                            {' · '}{dayjs(h.changedAt).format('HH:mm DD/MM/YYYY')}
                          </div>
                          {changes.map((c, i) => (
                            <div key={i} style={{
                              fontSize: 11, padding: '2px 6px', marginBottom: 2,
                              background: '#f1f5f9', borderRadius: 4,
                              display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center',
                            }}>
                              <span style={{ color: '#475569', fontWeight: 600 }}>{c.label}:</span>
                              <span style={{ color: '#94a3b8', textDecoration: 'line-through' }}>
                                {c.old || '—'}
                              </span>
                              <span style={{ color: '#475569' }}>→</span>
                              <span style={{ color: '#16a34a', fontWeight: 600 }}>{c.new || '—'}</span>
                            </div>
                          ))}
                        </div>
                      ),
                    }
                  })}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Danh mục Mã TP Song An (full fields from Excel)
// ─────────────────────────────────────────────────────────────────────────────

function SongAnDrawer({ open, record, onClose }) {
  if (!record) return null
  const fmtN = v => v != null ? <b style={{ color: '#1D4ED8' }}>{Math.round(Number(v)).toLocaleString('vi-VN')}</b> : <span style={{ color: '#d9d9d9' }}>—</span>
  const fmtT = v => v || <span style={{ color: '#d9d9d9' }}>—</span>

  const Section = ({ title, color = '#1D4ED8', children }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 12, color, background: color + '12', borderLeft: `3px solid ${color}`,
        padding: '4px 10px', marginBottom: 8, borderRadius: '0 4px 4px 0' }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', paddingLeft: 4 }}>
        {children}
      </div>
    </div>
  )
  const Row2 = ({ label, value, full }) => (
    <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <span style={{ fontSize: 11, color: '#8c8c8c' }}>{label}</span>
      <div style={{ fontSize: 12, marginTop: 1 }}>{value}</div>
    </div>
  )

  return (
    <Drawer open={open} onClose={onClose} width={520}
      title={
        <Space>
          <Tag color="blue" style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{record.maTp}</Tag>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e3a5f' }}>{record.tienTrinh || '—'}</span>
        </Space>
      }
      bodyStyle={{ padding: '16px 20px', background: '#f8faff' }}>
      <Section title="Thông tin cơ bản" color="#1D4ED8">
        <Row2 label="Mã TP" value={record.maBravo ? <Tag color="green" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{record.maBravo}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span>} />
        <Row2 label="Loại sản phẩm" value={record.loaiSanPham ? <Tag color="purple" style={{ fontSize: 11 }}>{record.loaiSanPham}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span>} />
        <Row2 label="Khối lượng/ĐV (g)" value={fmtN(record.khoiLuong)} />
        <Row2 label="NS Trung Bình (sp/công)" value={fmtN(record.slTrungBinh)} />
        <Row2 label="Tên / Tiến trình" value={<span style={{ fontSize: 12 }}>{fmtT(record.tienTrinh)}</span>} full />
      </Section>
      <Section title="Máy móc" color="#6d28d9">
        <Row2 label="Máy Móc PC"   value={fmtT(record.mayMocPc)} />
        <Row2 label="Máy Móc PL"   value={fmtT(record.mayMocPl)} />
        <Row2 label="Máy Móc BBC1" value={fmtT(record.mayMocBbc1)} />
        <Row2 label="Máy Móc ĐG"   value={fmtT(record.mayMocDg)} />
        <Row2 label="NS PC (sp/công)"   value={fmtN(record.nangSuatPc)} />
        <Row2 label="NS PL (sp/công)"   value={fmtN(record.nangSuatPl)} />
        <Row2 label="NS BBC1 (sp/công)" value={fmtN(record.nangSuatBbc1)} />
      </Section>
      <Section title="Tổ nhóm & Công" color="#059669">
        <Row2 label="Tổ PCPL"        value={fmtT(record.toNhomPcpl)} full />
        <Row2 label="Công Giao Nhận" value={fmtN(record.congGiaoNhan)} />
        <Row2 label="Công BBC1"      value={fmtN(record.congBbc1)} />
        <Row2 label="Công PC"        value={fmtN(record.congPc)} />
        <Row2 label="Công PL"        value={fmtN(record.congPl)} />
        <Row2 label="Công ĐG"        value={fmtN(record.congDg)} />
        <Row2 label="Tổng Công TP"   value={fmtN(record.tongCongTp)} />
      </Section>
      <Section title="Tỉ lệ Công / SP" color="#d97706">
        <Row2 label="GN / SP"   value={fmtN(record.gnTrenSp)} />
        <Row2 label="BBC1 / SP" value={fmtN(record.bbc1TrenSp)} />
        <Row2 label="PCPL / SP" value={fmtN(record.pcplTrenSp)} />
        <Row2 label="ĐG / SP"   value={fmtN(record.dgTrenSp)} />
      </Section>
      <Section title="Năng suất SP / Ca" color="#dc2626">
        <Row2 label="SP / GN"   value={fmtN(record.spTrenGn)} />
        <Row2 label="SP / BBC1" value={fmtN(record.spTrenBbc1)} />
        <Row2 label="SP / PC"   value={fmtN(record.spTrenPc)} />
        <Row2 label="SP / PL"   value={fmtN(record.spTrenPl)} />
        <Row2 label="SP / ĐG"   value={fmtN(record.spTrenDg)} />
      </Section>
    </Drawer>
  )
}

const SONG_AN_COL_GROUPS = [
  { label: 'Thông tin cơ bản', keys: ['maBravo', 'tienTrinh', 'loaiSanPham', 'toNhomPcpl', 'khoiLuong', 'slTrungBinh'] },
  { label: 'Năng suất',        keys: ['nangSuatPc', 'nangSuatPl', 'nangSuatBbc1'] },
  { label: 'Máy móc',          keys: ['mayMocPc', 'mayMocPl', 'mayMocBbc1', 'mayMocDg'] },
  { label: 'Công',             keys: ['congGiaoNhan', 'congBbc1', 'congPc', 'congPl', 'congDg', 'tongCongTp'] },
  { label: 'Tỉ lệ Công/SP',   keys: ['gnTrenSp', 'bbc1TrenSp', 'pcplTrenSp', 'dgTrenSp'] },
  { label: 'SP/Ca',            keys: ['spTrenGn', 'spTrenBbc1', 'spTrenPc', 'spTrenPl', 'spTrenDg'] },
]
const ALL_SONG_AN_KEYS = SONG_AN_COL_GROUPS.flatMap(g => g.keys)

function ProductMasterSongAnTab() {
  const { canEditProductMaster } = useAuth()
  const canEdit = canEditProductMaster()

  const [data,        setData]        = useState([])
  const [loading,     setLoading]     = useState(false)
  const [pagination,  setPagination]  = useState({ current: 1, pageSize: 20, total: 0 })
  const [keyword,     setKeyword]     = useState('')
  const [detailOpen,  setDetailOpen]  = useState(false)
  const [detailItem,  setDetailItem]  = useState(null)
  const [importOpen,  setImportOpen]  = useState(false)
  const [hiddenCols,  setHiddenCols]  = useState(new Set(['mayMocPc', 'mayMocPl', 'mayMocBbc1', 'mayMocDg', 'gnTrenSp', 'bbc1TrenSp', 'pcplTrenSp', 'dgTrenSp', 'spTrenGn', 'spTrenBbc1', 'spTrenPc', 'spTrenPl', 'spTrenDg']))

  const fetchData = useCallback(async (page = 0, size = 20, kw = keyword, { silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const params = { page, size }
      if (kw?.trim()) params.keyword = kw.trim()
      const { data: res } = await api.get('/product-master-song-an', { params })
      setData(res.content)
      setPagination(p => ({ ...p, total: res.totalElements }))
    } catch { message.error('Không thể tải danh mục Song An') }
    finally { if (!silent) setLoading(false) }
  }, [keyword])

  useEffect(() => { fetchData() }, [])

  const onDelete = async (id) => {
    try { await api.delete(`/product-master-song-an/${id}`); message.success('Đã xóa'); fetchData(0) }
    catch { message.error('Xóa thất bại') }
  }

  const numCell = v => v != null
    ? <span style={{ fontWeight: 600, color: '#1D4ED8' }}>{Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 7 })}</span>
    : <span style={{ color: '#d9d9d9' }}>—</span>
  const txtCell = v => v
    ? <span style={{ fontSize: 12 }}>{v}</span>
    : <span style={{ color: '#d9d9d9' }}>—</span>

  const toggleCol = key => setHiddenCols(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })
  const toggleGroup = (keys, checked) => setHiddenCols(prev => {
    const next = new Set(prev)
    keys.forEach(k => checked ? next.delete(k) : next.add(k))
    return next
  })

  const allColumns = [
    { title: '#', key: 'stt', width: 44, align: 'center',
      render: (_, __, i) => <span style={{ color: '#aaa', fontSize: 11 }}>{(pagination.current - 1) * pagination.pageSize + i + 1}</span> },
    { title: 'Mã Bravo', dataIndex: 'maTp', key: 'maTp', width: 120, fixed: 'left',
      render: v => <Tag color="blue" style={{ fontWeight: 700, marginRight: 0, fontFamily: 'monospace' }}>{v}</Tag> },
    { title: 'Mã TP', dataIndex: 'maBravo', key: 'maBravo', width: 110,
      render: v => v ? <Tag color="green" style={{ fontWeight: 700, marginRight: 0 }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'Tên / Tiến Trình', dataIndex: 'tienTrinh', key: 'tienTrinh', width: 220, ellipsis: true, render: txtCell },
    { title: 'Loại SP', dataIndex: 'loaiSanPham', key: 'loaiSanPham', width: 120,
      render: v => v ? <Tag color="purple" style={{ marginRight: 0, fontSize: 11 }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'Tổ PCPL', dataIndex: 'toNhomPcpl', key: 'toNhomPcpl', width: 100, render: txtCell },
    { title: 'KL/ĐV (g)', dataIndex: 'khoiLuong', key: 'khoiLuong', width: 90, align: 'right', render: numCell },
    { title: 'NS TB', dataIndex: 'slTrungBinh', key: 'slTrungBinh', width: 90, align: 'right', render: numCell },
    { title: 'NS PC', dataIndex: 'nangSuatPc', key: 'nangSuatPc', width: 90, align: 'right', render: numCell },
    { title: 'NS PL', dataIndex: 'nangSuatPl', key: 'nangSuatPl', width: 90, align: 'right', render: numCell },
    { title: 'NS BBC1', dataIndex: 'nangSuatBbc1', key: 'nangSuatBbc1', width: 90, align: 'right', render: numCell },
    { title: 'Máy PC', dataIndex: 'mayMocPc', key: 'mayMocPc', width: 140, ellipsis: true, render: txtCell },
    { title: 'Máy PL', dataIndex: 'mayMocPl', key: 'mayMocPl', width: 160, ellipsis: true, render: txtCell },
    { title: 'Máy BBC1', dataIndex: 'mayMocBbc1', key: 'mayMocBbc1', width: 130, ellipsis: true, render: txtCell },
    { title: 'Máy ĐG', dataIndex: 'mayMocDg', key: 'mayMocDg', width: 120, ellipsis: true, render: txtCell },
    { title: 'Công GN', dataIndex: 'congGiaoNhan', key: 'congGiaoNhan', width: 85, align: 'right', render: numCell },
    { title: 'Công BBC1', dataIndex: 'congBbc1', key: 'congBbc1', width: 85, align: 'right', render: numCell },
    { title: 'Công PC', dataIndex: 'congPc', key: 'congPc', width: 80, align: 'right', render: numCell },
    { title: 'Công PL', dataIndex: 'congPl', key: 'congPl', width: 80, align: 'right', render: numCell },
    { title: 'Công ĐG', dataIndex: 'congDg', key: 'congDg', width: 80, align: 'right', render: numCell },
    { title: 'Tổng Công', dataIndex: 'tongCongTp', key: 'tongCongTp', width: 90, align: 'right', render: numCell },
    { title: 'GN/SP', dataIndex: 'gnTrenSp', key: 'gnTrenSp', width: 80, align: 'right', render: numCell },
    { title: 'BBC1/SP', dataIndex: 'bbc1TrenSp', key: 'bbc1TrenSp', width: 80, align: 'right', render: numCell },
    { title: 'PCPL/SP', dataIndex: 'pcplTrenSp', key: 'pcplTrenSp', width: 80, align: 'right', render: numCell },
    { title: 'ĐG/SP', dataIndex: 'dgTrenSp', key: 'dgTrenSp', width: 75, align: 'right', render: numCell },
    { title: 'SP/GN', dataIndex: 'spTrenGn', key: 'spTrenGn', width: 75, align: 'right', render: numCell },
    { title: 'SP/BBC1', dataIndex: 'spTrenBbc1', key: 'spTrenBbc1', width: 75, align: 'right', render: numCell },
    { title: 'SP/PC', dataIndex: 'spTrenPc', key: 'spTrenPc', width: 70, align: 'right', render: numCell },
    { title: 'SP/PL', dataIndex: 'spTrenPl', key: 'spTrenPl', width: 70, align: 'right', render: numCell },
    { title: 'SP/ĐG', dataIndex: 'spTrenDg', key: 'spTrenDg', width: 70, align: 'right', render: numCell },
    {
      title: '', key: 'action', width: canEdit ? 60 : 44, align: 'center', fixed: 'right',
      render: (_, r) => (
        <Space size={4} onClick={e => e.stopPropagation()}>
          <Tooltip title="Xem chi tiết">
            <Button size="small" type="text" icon={<EyeOutlined />}
              onClick={() => { setDetailItem(r); setDetailOpen(true) }} />
          </Tooltip>
          {canEdit && (
            <Popconfirm title="Xóa mã TP này?" okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }} onConfirm={() => onDelete(r.id)}>
              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      )
    },
  ]

  const columns = allColumns.filter(c => !hiddenCols.has(c.key))
  const visibleCount = ALL_SONG_AN_KEYS.filter(k => !hiddenCols.has(k)).length

  const colPickerContent = (
    <div style={{ minWidth: 220 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
        <Button size="small" onClick={() => setHiddenCols(new Set())} style={{ fontSize: 11 }}>Hiện tất cả</Button>
        <Button size="small" onClick={() => setHiddenCols(new Set(ALL_SONG_AN_KEYS))} style={{ fontSize: 11 }}>Ẩn tất cả</Button>
      </div>
      {SONG_AN_COL_GROUPS.map(g => {
        const allVisible = g.keys.every(k => !hiddenCols.has(k))
        const allHidden  = g.keys.every(k =>  hiddenCols.has(k))
        return (
          <div key={g.label} style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <input type="checkbox" checked={allVisible}
                ref={el => { if (el) el.indeterminate = !allVisible && !allHidden }}
                onChange={e => toggleGroup(g.keys, e.target.checked)}
                style={{ cursor: 'pointer' }} />
              <span style={{ fontWeight: 700, fontSize: 12, color: '#1e4570' }}>{g.label}</span>
            </div>
            <div style={{ paddingLeft: 18 }}>
              {g.keys.map(k => {
                const col = allColumns.find(c => c.key === k)
                return col ? (
                  <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1, cursor: 'pointer', fontSize: 12 }}>
                    <input type="checkbox" checked={!hiddenCols.has(k)} onChange={() => toggleCol(k)} style={{ cursor: 'pointer' }} />
                    {col.title}
                  </label>
                ) : null
              })}
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <>
      <div style={{ padding: '10px 16px 8px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <Input.Search size="small" placeholder="Tìm Mã TP / Tên / Tổ..." style={{ width: 260 }}
          value={keyword} onChange={e => setKeyword(e.target.value)}
          onSearch={() => fetchData(0)} allowClear />
        <Button size="small" icon={<ReloadOutlined />} onClick={() => fetchData(0)} />
        <Popover content={colPickerContent} trigger="click" placement="bottomLeft">
          <Button size="small" style={{ fontWeight: 600, color: '#1D4ED8', borderColor: '#1D4ED8' }}>
            Cột ({visibleCount}/{ALL_SONG_AN_KEYS.length})
          </Button>
        </Popover>
        {canEdit && (
          <div style={{ marginLeft: 'auto' }}>
            <Tooltip title="Import dữ liệu từ file Excel vào danh mục Song An">
              <Button size="small" icon={<FileExcelOutlined />}
                style={{ borderColor: '#217346', color: '#217346', fontWeight: 600 }}
                onClick={() => setImportOpen(true)}>
                Import Excel
              </Button>
            </Tooltip>
          </div>
        )}
      </div>

      <Table className="dm-table" columns={columns} dataSource={data} rowKey="id"
        loading={loading} size="small" scroll={{ x: 'max-content' }}
        sticky={{ offsetHeader: 44 }}
        onRow={record => ({
          style: { cursor: 'pointer' },
          onClick: () => { setDetailItem(record); setDetailOpen(true) },
        })}
        pagination={{
          ...pagination, size: 'small', showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100'],
          showTotal: t => `Tổng ${t} mã TP Song An`,
          onChange: (p, ps) => { setPagination(prev => ({ ...prev, current: p, pageSize: ps })); fetchData(p - 1, ps) }
        }} />

      <SongAnDrawer open={detailOpen} record={detailItem} onClose={() => setDetailOpen(false)} />

      {/* Import Modal */}
      <Modal open={importOpen} onCancel={() => setImportOpen(false)} footer={null} width={540}
        title={<Space><FileExcelOutlined style={{ color: '#217346' }} /><span>Import Mã TP Song An từ Excel</span></Space>}
        destroyOnHidden>
        <SongAnImportContent onDone={() => { fetchData(0); setImportOpen(false) }} onClose={() => setImportOpen(false)} />
      </Modal>
    </>
  )
}

function SongAnImportContent({ onDone, onClose }) {
  const [fileList,  setFileList]  = useState([])
  const [importing, setImporting] = useState(false)
  const [result,    setResult]    = useState(null)

  const reset = () => { setFileList([]); setResult(null) }

  const handleImport = async () => {
    if (!fileList.length) { message.warning('Vui lòng chọn file Excel'); return }
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', fileList[0].originFileObj)
      const { data } = await api.post('/product-master-song-an/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(data)
      if ((data.imported || 0) > 0 || (data.updated || 0) > 0) onDone()
    } catch (err) {
      message.error(err?.response?.data?.error || 'Import thất bại')
    } finally {
      setImporting(false)
    }
  }

  if (result) return (
    <>
      <Result
        status={(result.imported > 0 || result.updated > 0) ? 'success' : 'info'}
        title={`Thêm mới ${result.imported || 0} · Cập nhật ${result.updated || 0} mã TP Song An`}
        subTitle={result.skipped > 0 ? `Bỏ qua ${result.skipped} dòng` : undefined}
      />
      {result.errors?.length > 0 && (
        <Alert type="error" showIcon icon={<CloseCircleOutlined />} style={{ marginBottom: 16, fontSize: 12 }}
          message={`${result.errors.length} lỗi:`}
          description={<ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>} />
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <Button onClick={reset}>Import thêm</Button>
        <Button type="primary" onClick={onClose}>Đóng</Button>
      </div>
    </>
  )

  return (
    <>
      <Upload.Dragger accept=".xlsx,.xls" maxCount={1} fileList={fileList}
        beforeUpload={() => false} onChange={({ fileList: fl }) => setFileList(fl)}
        style={{ marginBottom: 16 }}>
        <p className="ant-upload-drag-icon"><UploadOutlined style={{ fontSize: 32, color: '#217346' }} /></p>
        <p className="ant-upload-text">Kéo thả hoặc click để chọn file Excel</p>
        <p className="ant-upload-hint" style={{ fontSize: 12 }}>.xlsx, .xls</p>
      </Upload.Dragger>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button onClick={onClose}>Hủy</Button>
        <Button type="primary" icon={<FileExcelOutlined />}
          style={{ background: '#217346', borderColor: '#217346' }}
          loading={importing} onClick={handleImport}>Import</Button>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Danh mục Năng Suất (bảng nang_suat)
// ─────────────────────────────────────────────────────────────────────────────

function NangSuatTab() {
  const [data,       setData]       = useState([])
  const [loading,    setLoading]    = useState(false)
  const [keyword,    setKeyword]    = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })

  const fetchData = useCallback(async (page = 0, size = pagination.pageSize, kw = keyword) => {
    setLoading(true)
    try {
      const params = { page, size }
      if (kw?.trim()) params.keyword = kw.trim()
      const { data: res } = await api.get('/nang-suat', { params })
      setData(res.content)
      setPagination(p => ({ ...p, total: res.totalElements }))
    } catch { message.error('Không thể tải danh mục năng suất') }
    finally { setLoading(false) }
  }, [keyword, pagination.pageSize])

  useEffect(() => { fetchData() }, [])

  const numCell = v => v != null
    ? <span style={{ fontWeight: 600, color: '#1D4ED8' }}>{Math.round(Number(v)).toLocaleString('vi-VN')}</span>
    : <span style={{ color: '#d9d9d9' }}>—</span>

  const columns = [
    { title: '#', key: 'stt', width: 44, align: 'center',
      render: (_, __, i) => <span style={{ color: '#aaa', fontSize: 11 }}>{(pagination.current - 1) * pagination.pageSize + i + 1}</span> },
    { title: 'Mã SP', dataIndex: 'maSanPham', key: 'maSanPham', width: 130, fixed: 'left',
      render: v => <Tag color="blue" style={{ fontWeight: 700, marginRight: 0, fontFamily: 'monospace' }}>{v || '—'}</Tag> },
    { title: 'Tên Sản Phẩm', dataIndex: 'tenSanPham', key: 'tenSanPham', width: 280, ellipsis: true,
      render: v => <span style={{ fontSize: 12 }}>{v || '—'}</span> },
    { title: 'Dạng Bào Chế', dataIndex: 'dangBaoChe', key: 'dangBaoChe', width: 150,
      render: v => v ? <Tag color="purple" style={{ marginRight: 0, fontSize: 11 }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'Tổ PCPL', dataIndex: 'toPcpl', key: 'toPcpl', width: 120,
      render: v => v ? <Tag color="cyan" style={{ marginRight: 0, fontSize: 11 }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'NS PC', dataIndex: 'spPc', key: 'spPc', width: 110, align: 'right', render: numCell },
    { title: 'NS PL', dataIndex: 'spPl', key: 'spPl', width: 110, align: 'right', render: numCell },
    { title: 'NS BBC1', dataIndex: 'spBbc1', key: 'spBbc1', width: 110, align: 'right', render: numCell },
    { title: 'NS ĐG', dataIndex: 'spDg', key: 'spDg', width: 110, align: 'right', render: numCell },
  ]

  return (
    <>
      <div style={{ padding: '10px 16px 8px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <Input.Search size="small" placeholder="Tìm Mã SP / Tên..." style={{ width: 260 }}
          value={keyword} onChange={e => setKeyword(e.target.value)}
          onSearch={kw => fetchData(0, pagination.pageSize, kw)} allowClear
          onClear={() => { setKeyword(''); fetchData(0, pagination.pageSize, '') }} />
        <Button size="small" icon={<ReloadOutlined />} onClick={() => fetchData(0)} />
        <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 12 }}>
          Tổng: <b>{pagination.total}</b> sản phẩm
        </span>
      </div>

      <Table className="dm-table" columns={columns} dataSource={data} rowKey="id"
        loading={loading} size="small" scroll={{ x: 1200 }}
        sticky={{ offsetHeader: 44 }}
        pagination={{
          ...pagination, size: 'small', showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100'],
          showTotal: t => `Tổng ${t} sản phẩm`,
          onChange: (p, ps) => { setPagination(prev => ({ ...prev, current: p, pageSize: ps })); fetchData(p - 1, ps) }
        }} />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Bản sao Product Master (product_master_backup)
// ─────────────────────────────────────────────────────────────────────────────

function ProductMasterBackupTab() {
  const [data,         setData]         = useState([])
  const [loading,      setLoading]      = useState(false)
  const [keyword,      setKeyword]      = useState('')
  const [pagination,   setPagination]   = useState({ current: 1, pageSize: 20, total: 0 })
  const [snapshotAt,   setSnapshotAt]   = useState(null)
  const [snapshotting, setSnapshotting] = useState(false)
  const [restoring,    setRestoring]    = useState(false)

  const fetchData = useCallback(async (page = 0, size = pagination.pageSize, kw = keyword) => {
    setLoading(true)
    try {
      const params = { page, size }
      if (kw?.trim()) params.keyword = kw.trim()
      const { data: res } = await api.get('/product-master-backup', { params })
      setData(res.content)
      setPagination(p => ({ ...p, total: res.totalElements }))
      if (res.content.length > 0 && res.content[0].snapshotAt) {
        setSnapshotAt(res.content[0].snapshotAt)
      }
    } catch { message.error('Không thể tải bản sao') }
    finally { setLoading(false) }
  }, [keyword, pagination.pageSize])

  useEffect(() => { fetchData() }, [])

  const onSnapshot = async () => {
    setSnapshotting(true)
    try {
      const { data } = await api.post('/product-master-backup/snapshot')
      message.success(`Đã tạo bản sao ${data.saved} mã TP lúc ${new Date(data.snapshotAt).toLocaleString('vi-VN')}`)
      fetchData(0)
    } catch { message.error('Tạo bản sao thất bại') }
    finally { setSnapshotting(false) }
  }

  const onRestore = async () => {
    setRestoring(true)
    try {
      const { data } = await api.post('/product-master-backup/restore-to-master')
      message.success(`Đã khôi phục ${data.restored} mã TP về Danh mục Mã TP (bỏ qua ${data.skipped})`)
    } catch { message.error('Khôi phục thất bại') }
    finally { setRestoring(false) }
  }

  const numCell = v => v != null
    ? <span style={{ fontWeight: 600, color: '#1D4ED8' }}>{Math.round(Number(v)).toLocaleString('vi-VN')}</span>
    : <span style={{ color: '#d9d9d9' }}>—</span>
  const txtCell = v => v ? <span style={{ fontSize: 12 }}>{v}</span> : <span style={{ color: '#d9d9d9' }}>—</span>

  const columns = [
    { title: '#', key: 'stt', width: 44, align: 'center',
      render: (_, __, i) => <span style={{ color: '#aaa', fontSize: 11 }}>{(pagination.current - 1) * pagination.pageSize + i + 1}</span> },
    { title: 'Mã TP', dataIndex: 'maTp', key: 'maTp', width: 100, fixed: 'left',
      render: v => <Tag color="blue" style={{ fontWeight: 700, marginRight: 0 }}>{v}</Tag> },
    { title: 'Mã Bravo', dataIndex: 'maBravo', key: 'maBravo', width: 120,
      render: v => v ? <span style={{ fontFamily: 'monospace', color: '#1677ff' }}>{v}</span> : '—' },
    { title: 'Tên / Tiến Trình', dataIndex: 'tienTrinh', key: 'tienTrinh', width: 240, ellipsis: true,
      render: v => <span style={{ fontSize: 12 }}>{v || '—'}</span> },
    { title: 'Loại SP', dataIndex: 'loaiSanPham', key: 'loaiSanPham', width: 120,
      render: v => v ? <Tag color="purple" style={{ marginRight: 0, fontSize: 11 }}>{v}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'KL/ĐV (g)', dataIndex: 'khoiLuong', key: 'khoiLuong', width: 100, align: 'right', render: numCell },
    { title: 'NS TB', dataIndex: 'slTrungBinh', key: 'slTrungBinh', width: 110, align: 'right', render: numCell },
    { title: 'NS PC', dataIndex: 'nangSuatPc', key: 'nangSuatPc', width: 100, align: 'right', render: numCell },
    { title: 'NS PL', dataIndex: 'nangSuatPl', key: 'nangSuatPl', width: 100, align: 'right', render: numCell },
    { title: 'NS BBC1', dataIndex: 'nangSuatBbc1', key: 'nangSuatBbc1', width: 100, align: 'right', render: numCell },
    { title: 'Máy Móc PC', dataIndex: 'mayMocPc', key: 'mayMocPc', width: 160, render: txtCell },
    { title: 'Máy Móc PL', dataIndex: 'mayMocPl', key: 'mayMocPl', width: 200, render: txtCell },
    { title: 'Máy Móc BBC1', dataIndex: 'mayMocBbc1', key: 'mayMocBbc1', width: 160, render: txtCell },
    { title: 'Máy Móc ĐG', dataIndex: 'mayMocDg', key: 'mayMocDg', width: 140, render: txtCell },
  ]

  return (
    <>
      <div style={{ padding: '10px 16px 8px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <Input.Search size="small" placeholder="Tìm Mã TP / Mã Bravo / Tên..." style={{ width: 260 }}
          value={keyword} onChange={e => setKeyword(e.target.value)}
          onSearch={kw => fetchData(0, pagination.pageSize, kw)} allowClear
          onClear={() => { setKeyword(''); fetchData(0, pagination.pageSize, '') }} />
        <Button size="small" icon={<ReloadOutlined />} onClick={() => fetchData(0)} />
        {snapshotAt && (
          <span style={{ fontSize: 11, color: '#64748b' }}>
            Snapshot lúc: <b>{new Date(snapshotAt).toLocaleString('vi-VN')}</b>
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Tooltip title="Tạo bản sao mới từ Danh mục Mã TP hiện tại (ghi đè bản sao cũ)">
            <Button size="small" icon={<ReloadOutlined />}
              style={{ borderColor: '#7c3aed', color: '#7c3aed', fontWeight: 600 }}
              loading={snapshotting} onClick={onSnapshot}>
              Tạo bản sao
            </Button>
          </Tooltip>
          <Popconfirm
            title="Khôi phục về Danh mục Mã TP?"
            description="Dữ liệu trong Danh mục Mã TP sẽ bị ghi đè bởi bản sao này. Không thể hoàn tác!"
            okText="Xác nhận khôi phục"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={onRestore}
          >
            <Button size="small" icon={<CloseCircleOutlined />}
              style={{ borderColor: '#dc2626', color: '#dc2626', fontWeight: 600 }}
              loading={restoring}>
              Khôi phục về Danh mục
            </Button>
          </Popconfirm>
        </div>
      </div>

      {data.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div>Chưa có bản sao nào. Bấm <b style={{ color: '#7c3aed' }}>Tạo bản sao</b> để lưu trạng thái hiện tại của Danh mục Mã TP.</div>
        </div>
      )}

      {data.length > 0 && (
        <Table className="dm-table" columns={columns} dataSource={data} rowKey="id"
          loading={loading} size="small" scroll={{ x: 1800 }}
          sticky={{ offsetHeader: 44 }}
          pagination={{
            ...pagination, size: 'small', showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
            showTotal: t => `Tổng ${t} mã TP (bản sao)`,
            onChange: (p, ps) => { setPagination(prev => ({ ...prev, current: p, pageSize: ps })); fetchData(p - 1, ps) }
          }} />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3: Danh sách nhân sự
// ─────────────────────────────────────────────────────────────────────────────

const GROUP_COLORS = { PCPL1: 'green', PCPL2: 'cyan', PCPL3: 'orange', BBC1: 'pink', ĐG: 'gold', KT: 'geekblue' }
const GROUPS = ['PCPL1', 'PCPL2', 'PCPL3', 'BBC1', 'ĐG', 'KT']

function EmployeeTab() {
  const { isAdmin, isStageAdmin, getAllowedEmployeeGroups } = useAuth()
  const allowedGroups = getAllowedEmployeeGroups() // null = tất cả, array = chỉ nhóm được phép

  // Nhóm mặc định: nếu bị hạn chế thì vào tab nhóm đầu tiên được phép
  const defaultGroup = allowedGroups ? allowedGroups[0] : 'ALL'
  // Danh sách tab hiển thị
  const visibleGroups = allowedGroups ? allowedGroups : GROUPS

  const [data,        setData]        = useState([])
  const [loading,     setLoading]     = useState(false)
  const [search,      setSearch]      = useState('')
  const [activeGroup, setActiveGroup] = useState(defaultGroup)
  const [groupCounts, setGroupCounts] = useState({})
  const [pagination,  setPagination]  = useState({ current: 1, pageSize: 50, total: 0 })
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editing,     setEditing]     = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [form] = Form.useForm()

  const canManage = isAdmin() || isStageAdmin()

  const fetchData = useCallback(async (page = 0, size = 50, s = search, grp = activeGroup, { silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const params = { page, size }
      if (s?.trim()) params.search = s.trim()
      if (grp === 'TAM_NGHI') {
        params.tinhTrang = 'tam_nghi'
      } else if (grp !== 'ALL') {
        params.toNhom = grp
        params.excludeTinhTrang = 'tam_nghi'
      } else {
        params.excludeTinhTrang = 'tam_nghi'
      }
      const { data: res } = await api.get('/employees', { params })
      setData(res.content)
      setPagination(p => ({ ...p, total: res.totalElements }))
    } catch { message.error('Không thể tải danh sách nhân sự') }
    finally { if (!silent) setLoading(false) }
  }, [search, activeGroup])

  const fetchGroupCounts = async () => {
    try {
      const targets = allowedGroups || GROUPS
      const requests = allowedGroups
        ? [
            ...targets.map(g => api.get('/employees', { params: { page: 0, size: 1, toNhom: g, excludeTinhTrang: 'tam_nghi' } })),
            api.get('/employees', { params: { page: 0, size: 1, tinhTrang: 'tam_nghi' } }),
          ]
        : [
            api.get('/employees', { params: { page: 0, size: 1, excludeTinhTrang: 'tam_nghi' } }),
            ...GROUPS.map(g => api.get('/employees', { params: { page: 0, size: 1, toNhom: g, excludeTinhTrang: 'tam_nghi' } })),
            api.get('/employees', { params: { page: 0, size: 1, tinhTrang: 'tam_nghi' } }),
          ]
      const results = await Promise.all(requests)
      if (allowedGroups) {
        const counts = {}
        targets.forEach((g, i) => { counts[g] = results[i].data.totalElements })
        counts.TAM_NGHI = results[targets.length].data.totalElements
        setGroupCounts(counts)
      } else {
        const counts = { ALL: results[0].data.totalElements }
        GROUPS.forEach((g, i) => { counts[g] = results[i + 1].data.totalElements })
        counts.TAM_NGHI = results[GROUPS.length + 1].data.totalElements
        setGroupCounts(counts)
      }
    } catch { /* non-blocking */ }
  }

  useEffect(() => { fetchData(); fetchGroupCounts() }, [])

  useEffect(() => {
    const handler = () => fetchData(pagination.current - 1, pagination.pageSize, undefined, activeGroup, { silent: true })
    window.addEventListener('app:silent-refresh', handler)
    return () => window.removeEventListener('app:silent-refresh', handler)
  }, [fetchData, pagination.current, pagination.pageSize, activeGroup])

  const handleGroupChange = (key) => {
    setActiveGroup(key)
    setSearch('')
    setPagination(p => ({ ...p, current: 1 }))
    fetchData(0, pagination.pageSize, '', key)
  }

  const openEdit = (r) => {
    setEditing(r)
    form.setFieldsValue({
      ...r,
      ngaySinh:           r.ngaySinh           ? dayjs(r.ngaySinh)           : null,
      thoiGianVaoCongTy:  r.thoiGianVaoCongTy  ? dayjs(r.thoiGianVaoCongTy)  : null,
      ngayNghiViec:       r.ngayNghiViec       ? dayjs(r.ngayNghiViec)       : null,
    })
    setModalOpen(true)
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    // Pre-fill group: nếu đang ở tab cụ thể hoặc chỉ có 1 nhóm được phép
    const grp = activeGroup !== 'ALL' ? activeGroup : (allowedGroups?.length === 1 ? allowedGroups[0] : null)
    if (grp) form.setFieldValue('toNhom', grp)
    setModalOpen(true)
  }

  const onSave = async () => {
    setSaving(true)
    try {
      const values = await form.validateFields()
      const payload = {
        ...values,
        ngaySinh:          values.ngaySinh          ? values.ngaySinh.format('YYYY-MM-DD')          : null,
        thoiGianVaoCongTy: values.thoiGianVaoCongTy ? values.thoiGianVaoCongTy.format('YYYY-MM-DD') : null,
        ngayNghiViec:      values.ngayNghiViec      ? values.ngayNghiViec.format('YYYY-MM-DD')      : null,
      }
      if (editing) {
        await api.put(`/employees/${editing.id}`, payload)
        message.success('Đã cập nhật nhân sự')
      } else {
        await api.post('/employees', payload)
        message.success('Đã thêm nhân sự')
      }
      setModalOpen(false)
      fetchData(pagination.current - 1, pagination.pageSize, search, activeGroup)
      fetchGroupCounts()
    } catch { message.error('Lưu thất bại') }
    finally { setSaving(false) }
  }

  const onDelete = async (id) => {
    try {
      await api.delete(`/employees/${id}`)
      message.success('Đã xóa')
      fetchData(0, pagination.pageSize, search, activeGroup)
      fetchGroupCounts()
    } catch { message.error('Xóa thất bại') }
  }

  const setTinhTrang = async (id, tinhTrang) => {
    try {
      await api.patch(`/employees/${id}/tinh-trang`, { tinhTrang })
      message.success(tinhTrang === 'tam_nghi' ? '✓ Đã chuyển sang Tạm nghỉ' : '✓ Đã chuyển về Đang làm')
      fetchData(0, pagination.pageSize, search, activeGroup)
      fetchGroupCounts()
    } catch {
      // fallback: dùng PUT toàn bộ record nếu PATCH chưa có
      try {
        const emp = data.find(e => e.id === id)
        if (emp) {
          await api.put(`/employees/${id}`, { ...emp, tinhTrang: tinhTrang || null })
          message.success(tinhTrang === 'tam_nghi' ? '✓ Đã chuyển sang Tạm nghỉ' : '✓ Đã chuyển về Đang làm')
          fetchData(0, pagination.pageSize, search, activeGroup)
          fetchGroupCounts()
        }
      } catch { message.error('Cập nhật thất bại') }
    }
  }

  const columns = [
    { title: '#', key: 'stt', width: 48, align: 'center',
      render: (_, __, i) => <span style={{ color: '#aaa', fontSize: 11 }}>{(pagination.current - 1) * pagination.pageSize + i + 1}</span> },
    { title: 'Mã NV', dataIndex: 'maNhanVien', key: 'maNhanVien', width: 100,
      render: v => v ? <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>{v}</span> : '—' },
    { title: 'Họ Tên', dataIndex: 'hoVaTen', key: 'hoVaTen', width: 180, fixed: 'left',
      render: v => <span style={{ fontWeight: 600 }}>{v || '—'}</span> },
    ...(activeGroup === 'ALL' ? [{ title: 'Tổ / Nhóm', key: 'toNhom', width: 120, align: 'center',
      render: (_, r) => (
        <Space size={2} wrap>
          {r.toNhom ? <Tag color={GROUP_COLORS[r.toNhom] || 'default'} style={{ marginRight: 0 }}>{r.toNhom}</Tag> : '—'}
          {r.toNhom2 ? <Tag color={GROUP_COLORS[r.toNhom2] || 'default'} style={{ marginRight: 0 }}>{r.toNhom2}</Tag> : null}
        </Space>
      ) }] : [
      { title: 'Tổ Phụ', key: 'toNhom2', width: 90, align: 'center',
        render: (_, r) => r.toNhom2 ? <Tag color={GROUP_COLORS[r.toNhom2] || 'default'} style={{ marginRight: 0 }}>{r.toNhom2}</Tag> : <span style={{ color: '#d9d9d9' }}>—</span> }
    ]),
    { title: 'Nhóm', dataIndex: 'nhom', key: 'nhom', width: 110, align: 'center',
      render: (v, record) => {
        if (record.toNhom !== 'ĐG') return <span style={{ color: '#d9d9d9' }}>—</span>
        if (!v) return <span style={{ color: '#d9d9d9' }}>—</span>
        return <Tag color={v === 'Tâm Kem' ? 'purple' : 'volcano'} style={{ marginRight: 0, fontWeight: 600 }}>{v}</Tag>
      } },
    { title: 'Vị Trí', dataIndex: 'viTri', key: 'viTri', width: 120,
      render: v => v || '—' },
    { title: 'Học Vấn', dataIndex: 'hocVan', key: 'hocVan', width: 100,
      render: v => v || '—' },
    { title: 'SĐT', dataIndex: 'sdt', key: 'sdt', width: 110,
      render: v => v ? <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> : '—' },
    { title: 'Ngày Sinh', dataIndex: 'ngaySinh', key: 'ngaySinh', width: 100,
      render: v => v ? dayjs(v).format('DD/MM/YYYY') : '—' },
    { title: 'Ngày Vào', dataIndex: 'thoiGianVaoCongTy', key: 'thoiGianVaoCongTy', width: 100,
      render: v => v ? dayjs(v).format('DD/MM/YYYY') : '—' },
    { title: 'Ngày Nghỉ', dataIndex: 'ngayNghiViec', key: 'ngayNghiViec', width: 100,
      render: v => v ? <span style={{ color: '#ef4444' }}>{dayjs(v).format('DD/MM/YYYY')}</span> : '—' },
    { title: 'Tình Trạng', dataIndex: 'tinhTrang', key: 'tinhTrang', width: 120, align: 'center',
      render: v => {
        if (!v) return <Tag color="success">Đang làm</Tag>
        if (v === 'nghi_viec') return <Tag color="error">Nghỉ việc</Tag>
        if (v === 'tam_nghi')  return <Tag color="warning" style={{ fontWeight: 600 }}>🌿 Tạm nghỉ</Tag>
        return <Tag>{v}</Tag>
      } },
    { title: 'Địa Chỉ', dataIndex: 'diaChi', key: 'diaChi', width: 160, ellipsis: true,
      render: v => v ? <span style={{ fontSize: 12 }}>{v}</span> : '—' },
    { title: 'Ghi Chú', dataIndex: 'ghiChu', key: 'ghiChu', ellipsis: true,
      render: v => v ? <span style={{ fontSize: 12, color: '#64748b' }}>{v}</span> : '—' },
    ...(canManage ? [{
      title: '', key: 'action', width: 120, align: 'center', fixed: 'right',
      render: (_, r) => (
        <Space size={4}>
          {r.tinhTrang === 'tam_nghi' ? (
            <Tooltip title="Đi làm lại">
              <Popconfirm
                title={<span><b>{r.hoVaTen}</b> đi làm lại?</span>}
                okText="Xác nhận" cancelText="Hủy"
                onConfirm={() => setTinhTrang(r.id, null)}
              >
                <Button size="small" type="primary" ghost
                  style={{ borderColor: '#16a34a', color: '#16a34a', fontWeight: 600, fontSize: 11 }}>
                  ▶ Đi làm lại
                </Button>
              </Popconfirm>
            </Tooltip>
          ) : (
            <Tooltip title="Chuyển sang Tạm nghỉ (thai sản, chế độ...)">
              <Popconfirm
                title={<span>Chuyển <b>{r.hoVaTen}</b> sang Tạm nghỉ?</span>}
                description="Nhân sự vẫn được lưu, có thể chuyển lại khi đi làm."
                okText="Tạm nghỉ" cancelText="Hủy"
                okButtonProps={{ style: { background: '#d97706', borderColor: '#d97706' } }}
                onConfirm={() => setTinhTrang(r.id, 'tam_nghi')}
              >
                <Button size="small" type="default"
                  style={{ borderColor: '#d97706', color: '#d97706', fontWeight: 600, fontSize: 11 }}>
                  🌿 Tạm nghỉ
                </Button>
              </Popconfirm>
            </Tooltip>
          )}
          <Tooltip title="Sửa"><Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>
          <Popconfirm title="Xóa nhân sự này?" okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }} onConfirm={() => onDelete(r.id)}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }] : []),
  ]

  const groupTabItems = [
    // Tab "Tất cả" chỉ hiện khi không bị hạn chế nhóm
    ...(!allowedGroups ? [{
      key: 'ALL',
      label: (
        <span>
          Tất cả
          {groupCounts.ALL != null && (
            <Badge count={groupCounts.ALL} overflowCount={999}
              style={{ marginLeft: 6, background: activeGroup === 'ALL' ? '#1D4ED8' : '#aaa', fontSize: 10 }} />
          )}
        </span>
      ),
    }] : []),
    ...visibleGroups.map(g => ({
      key: g,
      label: (
        <span>
          <Tag color={GROUP_COLORS[g]} style={{ marginRight: 4, fontSize: 11, padding: '0 5px' }}>{g}</Tag>
          {groupCounts[g] != null && (
            <Badge count={groupCounts[g]} overflowCount={999}
              style={{ background: activeGroup === g ? '#1D4ED8' : '#8c8c8c', fontSize: 10 }} />
          )}
        </span>
      ),
    })),
    {
      key: 'TAM_NGHI',
      label: (
        <span style={{ color: activeGroup === 'TAM_NGHI' ? '#d97706' : undefined }}>
          🌿 Tạm Nghỉ
          {groupCounts.TAM_NGHI > 0 && (
            <Badge count={groupCounts.TAM_NGHI} overflowCount={99}
              style={{ marginLeft: 6, background: activeGroup === 'TAM_NGHI' ? '#d97706' : '#a8a8a8', fontSize: 10 }} />
          )}
        </span>
      ),
    },
  ]

  return (
    <>
      <style>{`
        .emp-inner-tabs .ant-tabs-nav { margin-bottom: 0 !important; border-bottom: 2px solid #e8eaf0; }
        .emp-inner-tabs .ant-tabs-tab { padding: 6px 14px !important; font-size: 12px !important; }
      `}</style>

      {/* Toolbar */}
      <div style={{ padding: '10px 16px 0', borderBottom: '1px solid #e8eaf0' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingBottom: 8 }}>
          <Input.Search size="small" placeholder="Tìm tên / mã NV / tổ..." style={{ width: 260 }}
            value={search} onChange={e => setSearch(e.target.value)}
            onSearch={() => fetchData(0, pagination.pageSize, search, activeGroup)} allowClear />
          <Button size="small" icon={<ReloadOutlined />}
            onClick={() => { setSearch(''); fetchData(0, pagination.pageSize, '', activeGroup) }}
            loading={loading} />
          {canManage && (
            <Button type="primary" size="small" icon={<PlusOutlined />}
              style={{ marginLeft: 'auto', background: '#1D4ED8', borderColor: '#1D4ED8', fontWeight: 600 }}
              onClick={openCreate}>
              Thêm nhân sự{activeGroup !== 'ALL' ? ` ${activeGroup}` : ''}
            </Button>
          )}
        </div>

        {/* Group tabs */}
        <Tabs
          className="emp-inner-tabs"
          activeKey={activeGroup}
          onChange={handleGroupChange}
          items={groupTabItems}
          size="small"
          style={{ paddingLeft: 2 }}
        />
      </div>

      <Table className="dm-table" columns={columns} dataSource={data} rowKey="id"
        loading={loading} size="small" scroll={{ x: 1400 }}
        sticky={{ offsetHeader: 44 }}
        onRow={record => ({ onDoubleClick: () => openEdit(record), style: { cursor: 'pointer' } })}
        pagination={{
          ...pagination, size: 'small', showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100'],
          showTotal: t => `Tổng ${t} nhân sự${activeGroup !== 'ALL' ? ` — Tổ ${activeGroup}` : ''}`,
          onChange: (p, ps) => {
            setPagination(prev => ({ ...prev, current: p, pageSize: ps }))
            fetchData(p - 1, ps, search, activeGroup)
          }
        }} />

      <Modal open={modalOpen} onOk={onSave} onCancel={() => setModalOpen(false)}
        okText="Lưu" cancelText="Hủy" width={640} confirmLoading={saving}
        title={<Space><TeamOutlined style={{ color: '#1D4ED8' }} /><span>{editing ? 'Sửa nhân sự' : `Thêm nhân sự${activeGroup !== 'ALL' ? ` — ${activeGroup}` : ''}`}</span></Space>}
        okButtonProps={{ disabled: !canManage }}
        destroyOnHidden>
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="Mã NV" name="maNhanVien" rules={[{ required: true, message: 'Nhập mã NV' }]}>
                <Input style={{ fontFamily: 'monospace' }} disabled={!!editing} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item label="Họ Và Tên" name="hoVaTen" rules={[{ required: true, message: 'Nhập họ tên' }]}><Input /></Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="Tổ / Nhóm" name="toNhom" rules={[{ required: true, message: 'Chọn tổ' }]}>
                <Select allowClear={!allowedGroups} placeholder="Chọn tổ..."
                  disabled={allowedGroups?.length === 1}>
                  {(allowedGroups || Object.keys(GROUP_COLORS)).map(k => (
                    <Option key={k} value={k}><Tag color={GROUP_COLORS[k]}>{k}</Tag></Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Tổ Phụ (nếu có)" name="toNhom2">
                <Select allowClear placeholder="Chọn tổ phụ...">
                  {Object.keys(GROUP_COLORS).map(k => (
                    <Option key={k} value={k}><Tag color={GROUP_COLORS[k]}>{k}</Tag></Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.toNhom !== cur.toNhom}>
              {({ getFieldValue }) => getFieldValue('toNhom') === 'ĐG' && (
                <Col span={8}>
                  <Form.Item label="Nhóm" name="nhom">
                    <Select allowClear placeholder="Chọn nhóm...">
                      <Option value="Tâm Kem"><Tag color="purple">Tâm Kem</Tag></Option>
                      <Option value="Loan Đào"><Tag color="volcano">Loan Đào</Tag></Option>
                    </Select>
                  </Form.Item>
                </Col>
              )}
            </Form.Item>
            <Col span={8}>
              <Form.Item label="Vị Trí" name="viTri"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Học Vấn" name="hocVan"><Input /></Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Số Điện Thoại" name="sdt"><Input style={{ fontFamily: 'monospace' }} /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Ngày Sinh" name="ngaySinh">
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Ngày Vào Công Ty" name="thoiGianVaoCongTy">
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Ngày Nghỉ Việc" name="ngayNghiViec">
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Tình Trạng" name="tinhTrang">
                <Select allowClear placeholder="Đang làm">
                  <Option value="tam_nghi">🌿 Tạm nghỉ (thai sản / chế độ)</Option>
                  <Option value="nghi_viec">Nghỉ việc</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Địa Chỉ" name="diaChi"><Input /></Form.Item>
            </Col>
          </Row>
          <Form.Item label="Ghi Chú" name="ghiChu">
            <Input.TextArea autoSize={{ minRows: 2 }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Quản lý Phòng sản xuất
// ─────────────────────────────────────────────────────────────────────────────
function PhongSanXuatTab() {
  const { isAdmin, isTKSX } = useAuth()
  const canEdit = isAdmin() || isTKSX()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const fetch = async () => {
    setLoading(true)
    try { const { data: r } = await api.get('/phong-san-xuat'); setData(r) }
    catch { message.error('Không thể tải danh sách phòng') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true) }
  const openEdit = (r) => { setEditing(r); form.setFieldsValue({ ten: r.ten, sortOrder: r.sortOrder }); setModalOpen(true) }

  const onSave = async () => {
    try {
      const values = await form.validateFields()
      if (editing) {
        await api.put(`/phong-san-xuat/${editing.id}`, values)
        message.success('Cập nhật thành công')
      } else {
        await api.post('/phong-san-xuat', values)
        message.success('Thêm thành công')
      }
      setModalOpen(false)
      fetch()
    } catch (err) {
      if (err?.response?.data?.message) message.error(err.response.data.message)
    }
  }

  const onDelete = async (id) => {
    try {
      await api.delete(`/phong-san-xuat/${id}`)
      message.success('Đã xóa')
      fetch()
    } catch { message.error('Xóa thất bại') }
  }

  const columns = [
    { title: '#', key: 'stt', width: 50, align: 'center',
      render: (_, __, i) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{i + 1}</span> },
    { title: 'Tên phòng sản xuất', dataIndex: 'ten', key: 'ten',
      render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Thứ tự', dataIndex: 'sortOrder', key: 'sortOrder', width: 90, align: 'center',
      render: v => v ?? <span style={{ color: '#d9d9d9' }}>—</span> },
    ...(canEdit ? [{
      title: '', key: 'action', width: 110, align: 'center',
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title={`Xóa phòng "${r.ten}"?`} onConfirm={() => onDelete(r.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }] : []),
  ]

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#1e4570' }}>
          Danh sách Phòng sản xuất
        </span>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetch} />
          {canEdit && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
              Thêm phòng
            </Button>
          )}
        </Space>
      </div>

      <Table
        className="dm-table"
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={false}
        style={{ maxWidth: 600 }}
      />

      <Modal
        title={editing ? 'Sửa phòng sản xuất' : 'Thêm phòng sản xuất'}
        open={modalOpen}
        onOk={onSave}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Lưu' : 'Thêm'}
        cancelText="Hủy"
        width={400}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="ten" label="Tên phòng sản xuất" rules={[{ required: true, message: 'Nhập tên phòng' }]}>
            <Input placeholder="VD: Xưởng A, Khu sản xuất 1..." autoFocus />
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự hiển thị" extra="Số nhỏ hơn hiển thị trước (tuỳ chọn)">
            <InputNumber min={0} max={9999} style={{ width: '100%' }} placeholder="VD: 1" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page chính: Quản Lý Danh Mục
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Quản lý Phòng Thực Hiện
// ─────────────────────────────────────────────────────────────────────────────
function PhongThucHienTab() {
  const { isAdmin, isTKSX } = useAuth()
  const canEdit = isAdmin() || isTKSX()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const fetch = async () => {
    setLoading(true)
    try { const { data: r } = await api.get('/phong-thuc-hien'); setData(r) }
    catch { message.error('Không thể tải danh sách phòng') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true) }
  const openEdit = (r) => { setEditing(r); form.setFieldsValue({ ten: r.ten, sortOrder: r.sortOrder }); setModalOpen(true) }

  const onSave = async () => {
    try {
      const values = await form.validateFields()
      if (editing) {
        await api.put(`/phong-thuc-hien/${editing.id}`, values)
        message.success('Cập nhật thành công')
      } else {
        await api.post('/phong-thuc-hien', values)
        message.success('Thêm thành công')
      }
      setModalOpen(false)
      invalidatePhongCache()
      fetch()
    } catch (err) {
      if (err?.response?.data?.message) message.error(err.response.data.message)
    }
  }

  const onDelete = async (id) => {
    try {
      await api.delete(`/phong-thuc-hien/${id}`)
      message.success('Đã xóa')
      invalidatePhongCache()
      fetch()
    } catch { message.error('Xóa thất bại') }
  }

  const columns = [
    { title: '#', key: 'stt', width: 50, align: 'center',
      render: (_, __, i) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{i + 1}</span> },
    { title: 'Tên phòng / khu vực', dataIndex: 'ten', key: 'ten',
      render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Thứ tự', dataIndex: 'sortOrder', key: 'sortOrder', width: 90, align: 'center',
      render: v => v ?? <span style={{ color: '#d9d9d9' }}>—</span> },
    ...(canEdit ? [{
      title: '', key: 'action', width: 110, align: 'center',
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title={`Xóa phòng "${r.ten}"?`} onConfirm={() => onDelete(r.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }] : []),
  ]

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#1e4570' }}>
          Danh sách Phòng / Khu vực sản xuất
        </span>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetch} />
          {canEdit && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
              Thêm phòng
            </Button>
          )}
        </Space>
      </div>

      <Table
        className="dm-table"
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={false}
        style={{ maxWidth: 600 }}
      />

      <Modal
        title={editing ? 'Sửa phòng thực hiện' : 'Thêm phòng thực hiện'}
        open={modalOpen}
        onOk={onSave}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Lưu' : 'Thêm'}
        cancelText="Hủy"
        width={400}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="ten" label="Tên phòng / khu vực" rules={[{ required: true, message: 'Nhập tên phòng' }]}>
            <Input placeholder="VD: Pha chế 09, Khu D..." autoFocus />
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự hiển thị" extra="Số nhỏ hơn hiển thị trước (tuỳ chọn)">
            <InputNumber min={0} max={9999} style={{ width: '100%' }} placeholder="VD: 9" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default function DanhMucPage() {
  const { isAdmin, canEditProductMaster } = useAuth()

  const tabItems = [
    ...(isAdmin() ? [{
      key: 'users',
      label: <span><UserOutlined style={{ marginRight: 5 }} />Quản lý người dùng</span>,
      children: <UserTab />,
    }] : []),
    {
      key: 'product-master',
      label: <span><AppstoreOutlined style={{ marginRight: 5 }} />Danh mục Mã TP</span>,
      children: <ProductMasterTab />,
    },
    {
      key: 'product-master-backup',
      label: <span><SafetyOutlined style={{ marginRight: 5, color: '#dc2626' }} />Bản sao Danh mục TP</span>,
      children: <ProductMasterBackupTab />,
    },
    {
      key: 'employees',
      label: <span><TeamOutlined style={{ marginRight: 5 }} />Danh sách nhân sự</span>,
      children: <EmployeeTab />,
    },
    {
      key: 'phong-thuc-hien',
      label: <span><HomeOutlined style={{ marginRight: 5 }} />Phòng Thực Hiện</span>,
      children: <PhongThucHienTab />,
    },
    {
      key: 'phong-san-xuat',
      label: <span><HomeOutlined style={{ marginRight: 5 }} />Phòng Sản Xuất</span>,
      children: <PhongSanXuatTab />,
    },
  ]

  return (
    <>
      <style>{`
        /* ── Tab nav bar ── */
        .danhmuc-tabs > .ant-tabs-nav {
          background: #1e4570 !important;
          padding: 0 12px; margin: 0 !important; position: sticky; top: 0; z-index: 20;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
        }
        .danhmuc-tabs > .ant-tabs-nav .ant-tabs-tab {
          color: #CBD5E1 !important; font-size: 13px;
          padding: 9px 18px !important; margin: 0 2px !important; border-radius: 4px 4px 0 0;
        }
        .danhmuc-tabs > .ant-tabs-nav .ant-tabs-tab:hover { color: #fff !important; background: rgba(59,130,246,0.15) !important; }
        .danhmuc-tabs > .ant-tabs-nav .ant-tabs-tab-active { color: #fff !important; font-weight: 700 !important; background: rgba(29,78,216,0.25) !important; box-shadow: 0 -3px 0 #60A5FA inset; }
        .danhmuc-tabs > .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-btn { color: #fff !important; }
        .danhmuc-tabs > .ant-tabs-nav .ant-tabs-ink-bar { background: #60A5FA !important; }
        .danhmuc-tabs > .ant-tabs-nav::before { border: none !important; }
        /* Cho phép sticky table header trong tab */
        .danhmuc-tabs .ant-tabs-content-holder,
        .danhmuc-tabs .ant-tabs-content,
        .danhmuc-tabs .ant-tabs-tabpane { overflow: visible !important; }

        /* ── Table shared style ── */
        .dm-table .ant-table-thead > tr > th {
          background: #009999 !important;
          color: #fff !important; font-size: 11px !important; font-weight: 700 !important;
          text-transform: uppercase; padding: 7px 8px !important; white-space: nowrap;
          border-right: 1px solid #007a7a !important;
        }
        .dm-table .ant-table-thead > tr > th::before { display: none !important; }
        .dm-table .ant-table-tbody > tr > td { padding: 5px 8px !important; }
        .dm-table .ant-table-tbody > tr:nth-child(even) > td { background: #f8fafc; }
        .dm-table .ant-table-tbody > tr:hover > td { background: #EFF6FF !important; }
      `}</style>

      <Tabs
        className="danhmuc-tabs"
        defaultActiveKey={isAdmin() ? 'users' : 'product-master'}
        items={tabItems}
        tabBarStyle={{ marginBottom: 0 }}
      />
    </>
  )
}
