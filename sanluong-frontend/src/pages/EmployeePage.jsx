import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Table, Button, Space, Input, Popconfirm, message,
  Modal, Form, DatePicker, Row, Col, Tooltip, Tag, AutoComplete, Tabs, Badge, Select,
  Upload, Alert, Progress, Divider
} from 'antd'
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, TeamOutlined,
  UploadOutlined, DownloadOutlined, FileExcelOutlined, CheckCircleOutlined,
  WarningOutlined, InfoCircleOutlined, InboxOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const { Option } = Select

const GROUP_COLORS = { PCPL1: 'green', PCPL2: 'cyan', PCPL3: 'orange', BBC1: 'pink', ĐG: 'gold' }
const GROUPS = ['PCPL1', 'PCPL2', 'PCPL3', 'BBC1', 'ĐG']
const TINH_TRANG_OPTIONS = [
  { value: 'Đang làm', color: 'success' },
  { value: 'Nghỉ việc', color: 'error' },
  { value: 'Tạm nghỉ', color: 'warning' },
]

export default function EmployeePage() {
  const { isAdmin, isAdminKH, isTKSX } = useAuth()
  const canManageEmployees = isAdmin() || isAdminKH() || isTKSX()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [activeGroup, setActiveGroup] = useState('ALL')
  const [groupCounts, setGroupCounts] = useState({})
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  // ── Import state ──────────────────────────────────────────────────────────
  const [importOpen, setImportOpen]       = useState(false)
  const [importFile, setImportFile]       = useState(null)
  const [importing, setImporting]         = useState(false)
  const [importResult, setImportResult]   = useState(null) // { created, skipped, errors, total }

  const toolbarRef = useRef(null)
  const [toolbarH, setToolbarH] = useState(0)
  useEffect(() => {
    if (!toolbarRef.current) return
    const obs = new ResizeObserver(() => setToolbarH(toolbarRef.current?.offsetHeight || 0))
    obs.observe(toolbarRef.current)
    return () => obs.disconnect()
  }, [])

  const fetchData = useCallback(async (page = 0, size = 50, s = search, grp = activeGroup) => {
    setLoading(true)
    try {
      const params = { page, size }
      if (s && s.trim()) params.search = s.trim()
      if (grp !== 'ALL') params.toNhom = grp
      const { data: res } = await api.get('/employees', { params })
      setData(res.content)
      setPagination(p => ({ ...p, total: res.totalElements }))
    } catch {
      message.error('Không thể tải danh sách nhân sự')
    } finally {
      setLoading(false)
    }
  }, [search, activeGroup])

  const fetchGroupCounts = async () => {
    try {
      const results = await Promise.all([
        api.get('/employees', { params: { page: 0, size: 1 } }),
        ...GROUPS.map(g => api.get('/employees', { params: { page: 0, size: 1, toNhom: g } }))
      ])
      const counts = { ALL: results[0].data.totalElements }
      GROUPS.forEach((g, i) => { counts[g] = results[i + 1].data.totalElements })
      setGroupCounts(counts)
    } catch { /* non-blocking */ }
  }

  useEffect(() => { fetchData(); fetchGroupCounts() }, [])

  const handleSearch = () => {
    setPagination(p => ({ ...p, current: 1 }))
    fetchData(0, pagination.pageSize, search, activeGroup)
  }

  const handleGroupChange = (key) => {
    setActiveGroup(key)
    setSearch('')
    setPagination(p => ({ ...p, current: 1 }))
    fetchData(0, pagination.pageSize, '', key)
  }

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    if (activeGroup !== 'ALL') form.setFieldValue('toNhom', activeGroup)
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      maNhanVien: record.maNhanVien,
      hoVaTen: record.hoVaTen,
      viTri: record.viTri,
      hocVan: record.hocVan,
      toNhom: record.toNhom,
      nhom: record.nhom,
      tinhTrang: record.tinhTrang,
      sdt: record.sdt,
      diaChi: record.diaChi,
      ghiChu: record.ghiChu,
      ngaySinh: record.ngaySinh ? dayjs(record.ngaySinh) : null,
      thoiGianVaoCongTy: record.thoiGianVaoCongTy ? dayjs(record.thoiGianVaoCongTy) : null,
      ngayNghiViec: record.ngayNghiViec ? dayjs(record.ngayNghiViec) : null,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    let values
    try { values = await form.validateFields() } catch { return }
    setSaving(true)
    try {
      const payload = {
        ...values,
        ngaySinh: values.ngaySinh ? values.ngaySinh.format('YYYY-MM-DD') : null,
        thoiGianVaoCongTy: values.thoiGianVaoCongTy ? values.thoiGianVaoCongTy.format('YYYY-MM-DD') : null,
        ngayNghiViec: values.ngayNghiViec ? values.ngayNghiViec.format('YYYY-MM-DD') : null,
      }
      if (editing) {
        await api.put(`/employees/${editing.id}`, payload)
        message.success('Cập nhật thành công')
      } else {
        await api.post('/employees', payload)
        message.success('Thêm nhân viên thành công')
      }
      setModalOpen(false)
      fetchData(pagination.current - 1, pagination.pageSize, search, activeGroup)
      fetchGroupCounts()
    } catch {
      message.error('Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/employees/${id}`)
      message.success('Đã xóa nhân viên')
      fetchData(pagination.current - 1, pagination.pageSize, search, activeGroup)
      fetchGroupCounts()
    } catch {
      message.error('Xóa thất bại')
    }
  }

  // ── Import handlers ───────────────────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/employees/import/template', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url; a.download = 'mau-import-nhan-su.xlsx'; a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      message.error('Không tải được file mẫu')
    }
  }

  const handleImportSubmit = async () => {
    if (!importFile) { message.warning('Vui lòng chọn file Excel'); return }
    setImporting(true)
    setImportResult(null)
    try {
      const formData = new FormData()
      formData.append('file', importFile)
      const { data: result } = await api.post('/employees/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImportResult(result)
      if (result.created > 0) {
        fetchData(0, pagination.pageSize, search, activeGroup)
        fetchGroupCounts()
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Import thất bại'
      message.error(msg)
    } finally {
      setImporting(false)
    }
  }

  const handleImportClose = () => {
    setImportOpen(false)
    setImportFile(null)
    setImportResult(null)
  }

  const fmtDate = (v) => v ? dayjs(v).format('DD/MM/YYYY') : <span style={{ color: '#d9d9d9' }}>—</span>

  const tinhTrangTag = (v) => {
    if (!v) return <span style={{ color: '#d9d9d9' }}>—</span>
    const opt = TINH_TRANG_OPTIONS.find(o => o.value === v)
    const color = opt?.color === 'success' ? '#52c41a' : opt?.color === 'error' ? '#ff4d4f' : '#faad14'
    return <Tag color={opt?.color || 'default'} style={{ marginRight: 0, fontWeight: 600 }}>{v}</Tag>
  }

  const columns = [
    {
      title: '#', key: 'stt', width: 44, align: 'center',
      render: (_, __, i) => {
        const offset = ((pagination.current || 1) - 1) * (pagination.pageSize || 50)
        return <span style={{ color: '#aaa', fontSize: 12 }}>{offset + i + 1}</span>
      },
    },
    {
      title: 'Mã NV', dataIndex: 'maNhanVien', key: 'maNhanVien', width: 90,
      render: v => <strong style={{ color: '#1677ff' }}>{v}</strong>
    },
    {
      title: 'Họ và Tên', dataIndex: 'hoVaTen', key: 'hoVaTen', width: 200,
      render: v => <strong>{v}</strong>
    },
    ...(activeGroup === 'ALL' ? [{
      title: 'Tổ/Nhóm', dataIndex: 'toNhom', key: 'toNhom', width: 90,
      render: v => v
        ? <Tag color={GROUP_COLORS[v] || 'blue'} style={{ marginRight: 0, fontWeight: 600 }}>{v}</Tag>
        : <span style={{ color: '#d9d9d9' }}>—</span>
    }] : []),
    ...[{
      title: 'Nhóm', dataIndex: 'nhom', key: 'nhom', width: 110,
      render: (v, record) => {
        if (record.toNhom !== 'ĐG') return <span style={{ color: '#d9d9d9' }}>—</span>
        if (!v) return <span style={{ color: '#d9d9d9' }}>—</span>
        return <Tag color={v === 'Tâm Kem' ? 'purple' : 'volcano'} style={{ marginRight: 0, fontWeight: 600 }}>{v}</Tag>
      }
    }],
    {
      title: 'Vị Trí', dataIndex: 'viTri', key: 'viTri', width: 130,
      render: v => v
        ? <Tag color={v.toLowerCase().includes('trưởng') ? 'gold' : 'geekblue'} style={{ marginRight: 0 }}>{v}</Tag>
        : <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Học Vấn', dataIndex: 'hocVan', key: 'hocVan', width: 110,
      render: v => v || <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'SĐT', dataIndex: 'sdt', key: 'sdt', width: 115,
      render: v => v || <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Ngày Sinh', dataIndex: 'ngaySinh', key: 'ngaySinh', width: 110,
      render: fmtDate
    },
    {
      title: 'Ngày Vào', dataIndex: 'thoiGianVaoCongTy', key: 'thoiGianVaoCongTy', width: 110,
      render: fmtDate
    },
    {
      title: 'Ngày Nghỉ', dataIndex: 'ngayNghiViec', key: 'ngayNghiViec', width: 110,
      render: fmtDate
    },
    {
      title: 'Tình Trạng', dataIndex: 'tinhTrang', key: 'tinhTrang', width: 110,
      render: tinhTrangTag
    },
    {
      title: 'Địa Chỉ', dataIndex: 'diaChi', key: 'diaChi', width: 180, ellipsis: true,
      render: v => v ? <Tooltip title={v}>{v}</Tooltip> : <span style={{ color: '#d9d9d9' }}>—</span>
    },
    {
      title: 'Ghi Chú', dataIndex: 'ghiChu', key: 'ghiChu', width: 180, ellipsis: true,
      render: v => v ? <Tooltip title={v}>{v}</Tooltip> : <span style={{ color: '#d9d9d9' }}>—</span>
    },
    ...(canManageEmployees ? [{
      title: '', key: 'action', width: 80, fixed: 'right', align: 'center',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Sửa">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Popconfirm title="Xóa nhân viên này?" onConfirm={() => handleDelete(record.id)}
            okText="Xóa" cancelText="Hủy">
            <Tooltip title="Xóa">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }] : []),
  ]

  const tabItems = [
    {
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
    },
    ...GROUPS.map(g => ({
      key: g,
      label: (
        <span>
          <Tag color={GROUP_COLORS[g] || 'blue'} style={{ marginRight: 4, fontSize: 11, padding: '0 5px' }}>{g}</Tag>
          {groupCounts[g] != null && (
            <Badge count={groupCounts[g]} overflowCount={999}
              style={{ background: activeGroup === g ? '#1D4ED8' : '#8c8c8c', fontSize: 10 }} />
          )}
        </span>
      ),
    }))
  ]

  return (
    <>
      <style>{`
        .emp-table .ant-table-thead > tr > th {
          background: linear-gradient(90deg, #2980b3 0%, #3399CC 100%) !important; color: #ffffff !important;
          font-size: 11px !important; text-transform: uppercase;
          padding: 7px 10px !important; letter-spacing: 0.4px;
          border-right: 1px solid #4db3d4 !important; white-space: nowrap;
        }
        .emp-table .ant-table-thead > tr > th::before { display: none !important; }
        .emp-table .ant-table-tbody > tr > td { padding: 7px 10px !important; vertical-align: middle; }
        .emp-table .ant-table-tbody > tr:hover > td { background: #EAECF2 !important; }
        .emp-table .row-stripe td { background: #fafbff !important; }
        .emp-group-tabs .ant-tabs-nav { margin-bottom: 0 !important; }
        .emp-group-tabs .ant-tabs-tab { padding: 6px 14px !important; font-size: 12px !important; }
      `}</style>

      {/* Toolbar */}
      <div ref={toolbarRef} style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: '#fff', borderBottom: '2px solid #DDE1E8',
        padding: '10px 0 0', marginBottom: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingBottom: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#1E3A5F', whiteSpace: 'nowrap' }}>
            <TeamOutlined style={{ marginRight: 6, color: '#4db3d4' }} />
            Danh sách Nhân sự
          </span>

          <Input
            size="small"
            style={{ width: 260 }}
            placeholder="Tìm theo mã NV, họ tên, vị trí..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onPressEnter={handleSearch}
            allowClear
            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
          />
          <Button size="small" type="primary" icon={<SearchOutlined />} onClick={handleSearch}>Tìm</Button>
          <Button size="small" icon={<ReloadOutlined />}
            onClick={() => { setSearch(''); fetchData(0, pagination.pageSize, '', activeGroup) }} />

          {canManageEmployees && (
            <Space style={{ marginLeft: 'auto' }}>
              <Button
                size="small"
                icon={<UploadOutlined />}
                onClick={() => { setImportOpen(true); setImportFile(null); setImportResult(null) }}
                style={{ borderColor: '#52c41a', color: '#52c41a' }}
              >
                Import Excel
              </Button>
              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openAdd}
                style={{ background: '#1D4ED8', borderColor: '#1D4ED8' }}>
                Thêm nhân viên{activeGroup !== 'ALL' ? ` ${activeGroup}` : ''}
              </Button>
            </Space>
          )}
        </div>

        {/* Group tabs */}
        <Tabs
          className="emp-group-tabs"
          activeKey={activeGroup}
          onChange={handleGroupChange}
          items={tabItems}
          size="small"
          style={{ paddingLeft: 4 }}
        />
      </div>

      <Table
        className="emp-table"
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 1300 }}
        sticky={{ offsetHeader: toolbarH }}
        rowClassName={(_, i) => i % 2 !== 0 ? 'row-stripe' : ''}
        onRow={record => ({ onDoubleClick: () => openEdit(record), style: { cursor: 'pointer' } })}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100'],
          showTotal: total => `Tổng ${total} nhân viên${activeGroup !== 'ALL' ? ` — Tổ ${activeGroup}` : ''}`,
          onChange: (page, pageSize) => {
            setPagination(p => ({ ...p, current: page, pageSize }))
            fetchData(page - 1, pageSize, search, activeGroup)
          }
        }}
      />

      {/* ── Import Modal ──────────────────────────────────────────────────── */}
      <Modal
        title={
          <Space>
            <FileExcelOutlined style={{ color: '#52c41a', fontSize: 18 }} />
            <span>Import nhân sự từ Excel</span>
          </Space>
        }
        open={importOpen}
        onCancel={handleImportClose}
        footer={
          importResult ? (
            <Button type="primary" onClick={handleImportClose}>Đóng</Button>
          ) : (
            <Space>
              <Button onClick={handleImportClose}>Hủy</Button>
              <Button
                type="primary"
                icon={<UploadOutlined />}
                loading={importing}
                disabled={!importFile}
                onClick={handleImportSubmit}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                {importing ? 'Đang import...' : 'Bắt đầu Import'}
              </Button>
            </Space>
          )
        }
        width={560}
        destroyOnHidden
      >
        {/* Bước 1: Hướng dẫn + tải mẫu */}
        {!importResult && (
          <>
            <Alert
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              style={{ marginBottom: 16, borderRadius: 8 }}
              message="Hướng dẫn import"
              description={
                <ul style={{ marginBottom: 0, paddingLeft: 18, fontSize: 12 }}>
                  <li>Tải file mẫu → điền dữ liệu → upload lên hệ thống</li>
                  <li>Mã NV đã tồn tại → <strong style={{ color: '#faad14' }}>bỏ qua</strong> (không cập nhật)</li>
                  <li>Mã NV chưa có → <strong style={{ color: '#52c41a' }}>tạo mới</strong> với 4 trường: Mã NV, Họ Tên, Tổ/Nhóm, Vị Trí</li>
                  <li>Cột bắt buộc: <strong>Mã NV, Họ và Tên, Tổ/Nhóm</strong></li>
                </ul>
              }
            />

            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadTemplate}
                style={{ borderColor: '#1D4ED8', color: '#1D4ED8' }}
              >
                Tải file mẫu (.xlsx)
              </Button>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* Upload area */}
            <Upload.Dragger
              accept=".xlsx,.xls"
              maxCount={1}
              beforeUpload={(file) => {
                const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
                if (!isExcel) {
                  message.error('Chỉ chấp nhận file .xlsx hoặc .xls')
                  return Upload.LIST_IGNORE
                }
                setImportFile(file)
                return false // ngăn upload tự động
              }}
              onRemove={() => setImportFile(null)}
              fileList={importFile ? [{ uid: '-1', name: importFile.name, status: 'done' }] : []}
              style={{ borderRadius: 8 }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: '#52c41a', fontSize: 40 }} />
              </p>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>
                Kéo thả file vào đây hoặc click để chọn
              </p>
              <p style={{ fontSize: 12, color: '#8c8c8c' }}>
                Chỉ hỗ trợ file Excel (.xlsx, .xls)
              </p>
            </Upload.Dragger>

            {importing && (
              <Progress percent={99} status="active" style={{ marginTop: 12 }} showInfo={false} />
            )}
          </>
        )}

        {/* Bước 2: Kết quả import */}
        {importResult && (
          <div>
            {/* Tổng quan */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16,
            }}>
              {[
                { label: 'Tạo mới',  value: importResult.created,          color: '#52c41a', bg: '#f6ffed', border: '#b7eb8f' },
                { label: 'Bỏ qua',   value: importResult.skipped,          color: '#faad14', bg: '#fffbe6', border: '#ffe58f' },
                { label: 'Lỗi',      value: importResult.errors?.length || 0, color: '#f5222d', bg: '#fff2f0', border: '#ffccc7' },
              ].map(item => (
                <div key={item.label} style={{
                  textAlign: 'center', padding: '12px 8px',
                  borderRadius: 10, border: `1.5px solid ${item.border}`,
                  background: item.bg,
                }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: item.color, lineHeight: 1 }}>
                    {item.value}
                  </div>
                  <div style={{ fontSize: 12, color: '#595959', marginTop: 4 }}>{item.label}</div>
                </div>
              ))}
            </div>

            {/* Success */}
            {importResult.created > 0 && (
              <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                message={`Import thành công: ${importResult.created} nhân viên mới được tạo${importResult.skipped > 0 ? `, ${importResult.skipped} bỏ qua (đã tồn tại)` : ''}`}
                style={{ marginBottom: 10, borderRadius: 8 }}
              />
            )}
            {importResult.created === 0 && importResult.skipped > 0 && (
              <Alert
                type="warning"
                showIcon
                message={`${importResult.skipped} mã NV đã tồn tại — bỏ qua toàn bộ`}
                style={{ marginBottom: 10, borderRadius: 8 }}
              />
            )}

            {/* Errors */}
            {importResult.errors?.length > 0 && (
              <Alert
                type="error"
                showIcon
                icon={<WarningOutlined />}
                message={`${importResult.errors.length} dòng lỗi:`}
                description={
                  <ul style={{ marginBottom: 0, paddingLeft: 18, fontSize: 12, maxHeight: 160, overflowY: 'auto' }}>
                    {importResult.errors.map((e, i) => (
                      <li key={i}>Dòng {e.row}: {e.reason}</li>
                    ))}
                  </ul>
                }
                style={{ borderRadius: 8 }}
              />
            )}

            {/* No data */}
            {importResult.created === 0 && importResult.skipped === 0 && importResult.errors?.length === 0 && (
              <Alert type="warning" message="Không có dữ liệu hợp lệ để import" showIcon style={{ borderRadius: 8 }} />
            )}
          </div>
        )}
      </Modal>

      {/* ── Add / Edit Modal ────────────────────────────────────────────────── */}
      <Modal
        title={editing ? 'Cập nhật nhân viên' : `Thêm nhân viên mới${activeGroup !== 'ALL' ? ` — ${activeGroup}` : ''}`}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Cập nhật' : 'Thêm'}
        cancelText="Hủy"
        confirmLoading={saving}
        width={620}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="maNhanVien" label="Mã nhân viên"
                rules={[{ required: true, message: 'Bắt buộc nhập mã nhân viên' }]}>
                <Input placeholder="VD: SA001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="toNhom" label="Tổ/Nhóm">
                <AutoComplete
                  placeholder="Chọn hoặc nhập tổ/nhóm"
                  options={GROUPS.map(v => ({ value: v }))}
                  filterOption={(input, opt) => opt.value.toLowerCase().includes(input.toLowerCase())}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.toNhom !== cur.toNhom}>
            {({ getFieldValue }) => getFieldValue('toNhom') === 'ĐG' && (
              <Form.Item name="nhom" label="Nhóm (ĐG)">
                <Select placeholder="Chọn nhóm" allowClear>
                  <Option value="Tâm Kem">Tâm Kem</Option>
                  <Option value="Loan Đào">Loan Đào</Option>
                </Select>
              </Form.Item>
            )}
          </Form.Item>

          <Form.Item name="hoVaTen" label="Họ và tên nhân sự"
            rules={[{ required: true, message: 'Bắt buộc nhập họ và tên' }]}>
            <Input placeholder="Nhập họ và tên đầy đủ" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={6}>
              <Form.Item name="viTri" label="Vị trí">
                <AutoComplete
                  placeholder="Chọn hoặc nhập"
                  options={['Tổ trưởng', 'Nhóm trưởng', 'Nhân viên'].map(v => ({ value: v }))}
                  filterOption={(input, opt) => opt.value.toLowerCase().includes(input.toLowerCase())}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="tinhTrang" label="Tình trạng">
                <Select placeholder="Chọn" allowClear>
                  {TINH_TRANG_OPTIONS.map(o => (
                    <Option key={o.value} value={o.value}>{o.value}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="hocVan" label="Học vấn">
                <Input placeholder="Trung cấp..." />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="sdt" label="Số điện thoại">
                <Input placeholder="0901234567" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="ngaySinh" label="Ngày sinh">
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="thoiGianVaoCongTy" label="Ngày vào công ty">
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ngayNghiViec" label="Ngày nghỉ việc">
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="diaChi" label="Địa chỉ">
            <Input placeholder="Nhập địa chỉ..." />
          </Form.Item>

          <Form.Item name="ghiChu" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Ghi chú thêm..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
