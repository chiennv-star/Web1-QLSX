import React, { useEffect, useState } from 'react'
import {
  Form, Input, Button, Space, message,
  DatePicker, Select, Table, Tooltip, Tag, Spin, Upload,
} from 'antd'
import {
  SaveOutlined, PlusOutlined, DeleteOutlined, FileTextOutlined,
  ArrowLeftOutlined, UploadOutlined, PaperClipOutlined,
} from '@ant-design/icons'
import api from '../api/axios'
import dayjs from 'dayjs'

const { TextArea } = Input

// ── Helpers ─────────────────────────────────────────────────────────────────
const SectionHeader = ({ title, color = '#0d7377' }) => (
  <div style={{
    background: color, color: '#fff', fontWeight: 800, fontSize: 12,
    padding: '7px 14px', letterSpacing: 0.8, marginBottom: 0,
    borderRadius: '4px 4px 0 0',
  }}>
    {title}
  </div>
)

const SubHeader = ({ label, direction = '→' }) => (
  <div style={{
    background: '#f0f9ff', borderLeft: '3px solid #0ea5e9',
    padding: '4px 10px', fontSize: 11, color: '#0369a1',
    fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
  }}>
    <span>{direction}</span><span>{label}</span>
  </div>
)

const FileUploadField = ({ fileList, onChange, multiple = true, action, headers, accept }) => (
  <Upload
    action={action}
    headers={headers}
    accept={accept}
    multiple={multiple}
    fileList={fileList}
    onChange={({ fileList: next }) => onChange(next)}
    onRemove={(file) => { onChange(fileList.filter(f => f.uid !== file.uid)); return false }}
    showUploadList={{ showPreviewIcon: true, showRemoveIcon: true, showDownloadIcon: true }}
    onPreview={(file) => { if (file.url) window.open(file.url, '_blank') }}
  >
    <Button icon={<UploadOutlined />} size="small">
      Chọn file
    </Button>
    <span style={{ marginLeft: 8, fontSize: 11, color: '#8c8c8c' }}>
      Ảnh · PDF · Word · Excel · Video (tối đa 100MB/file)
    </span>
  </Upload>
)

const FieldRow = ({ num, label, required, children }) => (
  <div style={{ borderBottom: '1px solid #f0f0f0', padding: '10px 14px' }}>
    <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>
      <span style={{
        display: 'inline-block', width: 22, height: 18, lineHeight: '18px',
        textAlign: 'center', background: '#e6f4ff', color: '#1677ff',
        borderRadius: 3, fontWeight: 700, fontSize: 10, marginRight: 6,
      }}>{String(num).padStart(2, '0')}</span>
      {label}
      {required && <span style={{ color: '#ff4d4f', marginLeft: 2 }}>*</span>}
    </div>
    {children}
  </div>
)

// ── Main Component ───────────────────────────────────────────────────────────
export default function KphModal({ workScheduleRecord, onClose, onSaved }) {
  const [form] = Form.useForm()
  const [kph, setKph] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [phuongAnRows, setPhuongAnRows] = useState([
    { key: '1', stt: '01', phanKhacPhuc: '', phuongAnDanhGia: '', phongBan: '', thoiGian: '' },
  ])
  const [fileList1, setFileList1] = useState([])
  const [fileListNhieu, setFileListNhieu] = useState([])
  const [fileListQA, setFileListQA] = useState([])

  const uploadAction = '/api/files/upload'
  const uploadHeaders = { Authorization: `Bearer ${localStorage.getItem('token')}` }
  const acceptTypes = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.mp4,.mov,.avi,.mkv,.webm'

  const parseFileList = (json) => {
    try {
      const arr = JSON.parse(json || '[]')
      return arr.map((f, i) => ({ uid: f.uid || String(-i - 1), name: f.name, status: 'done', url: f.url }))
    } catch { return [] }
  }
  const serializeFileList = (list) =>
    JSON.stringify(list.filter(f => f.status === 'done').map(f => ({
      uid: f.uid, name: f.name, url: f.url || f.response?.url,
    })))

  // ── Load existing KPH khi mở modal ────────────────────────────────────────
  useEffect(() => {
    if (!workScheduleRecord) return
    setLoading(true)
    api.get(`/kph/by-work-schedule/${workScheduleRecord.id}`)
      .then(r => {
        if (r.status === 200 && r.data) {
          const d = r.data
          setKph(d)
          form.setFieldsValue({
            ...d,
            ngayGioPhatHien: d.ngayGioPhatHien ? dayjs(d.ngayGioPhatHien) : null,
          })
          setFileList1(parseFileList(d.fileDinhKem1))
          setFileListNhieu(parseFileList(d.fileDinhKemNhieu))
          setFileListQA(parseFileList(d.fileDinhKem2))
          if (d.phuongAnKhacPhuc) {
            try {
              const rows = JSON.parse(d.phuongAnKhacPhuc)
              setPhuongAnRows(rows.map((row, i) => ({ ...row, key: String(i + 1) })))
            } catch { /* ignore parse error */ }
          }
        } else {
          form.resetFields()
          setKph(null)
          setPhuongAnRows([{ key: '1', stt: '01', phanKhacPhuc: '', phuongAnDanhGia: '', phongBan: '', thoiGian: '' }])
          setFileList1([]); setFileListNhieu([]); setFileListQA([])
          form.setFieldsValue({
            tenSanPhamNguyenLieu: workScheduleRecord.tenTrinh || '',
            maVatTu: workScheduleRecord.maSp || '',
            soLo: workScheduleRecord.soLo || '',
            congDoan: workScheduleRecord.congDoan || '',
          })
        }
      })
      .catch(() => {
        form.resetFields()
        setKph(null)
        setPhuongAnRows([{ key: '1', stt: '01', phanKhacPhuc: '', phuongAnDanhGia: '', phongBan: '', thoiGian: '' }])
        setFileList1([]); setFileListNhieu([]); setFileListQA([])
        form.setFieldsValue({
          tenSanPhamNguyenLieu: workScheduleRecord.tenTrinh || '',
          maVatTu: workScheduleRecord.maSp || '',
          soLo: workScheduleRecord.soLo || '',
          congDoan: workScheduleRecord.congDoan || '',
        })
      })
      .finally(() => setLoading(false))
  }, [workScheduleRecord])

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    try {
      const values = form.getFieldsValue(true)
      const payload = {
        ...values,
        workScheduleId: workScheduleRecord.id,
        ngayGioPhatHien: values.ngayGioPhatHien
          ? values.ngayGioPhatHien.format('YYYY-MM-DDTHH:mm:ss') : null,
        phuongAnKhacPhuc: JSON.stringify(
          phuongAnRows.filter(r => r.phanKhacPhuc || r.phongBan)
        ),
        fileDinhKem1: serializeFileList(fileList1),
        fileDinhKemNhieu: serializeFileList(fileListNhieu),
        fileDinhKem2: serializeFileList(fileListQA),
      }
      if (kph?.id) {
        await api.put(`/kph/${kph.id}`, payload)
      } else {
        const { data } = await api.post('/kph', payload)
        setKph(data)
      }
      message.success('Đã lưu hồ sơ KPH')
      onSaved?.()
    } catch {
      message.error('Lỗi khi lưu hồ sơ KPH')
    } finally {
      setSaving(false)
    }
  }

  // ── Phương án khắc phục table ──────────────────────────────────────────────
  const paColumns = [
    { title: '#', dataIndex: 'stt', width: 40, align: 'center',
      render: (_, __, i) => <span style={{ color: '#888', fontSize: 11 }}>{String(i + 1).padStart(2, '0')}</span> },
    { title: 'Pán khắc phục vđ KPH', dataIndex: 'phanKhacPhuc', width: 260,
      render: (v, row) => (
        <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} size="small"
          value={v} style={{ fontSize: 12 }}
          onChange={e => updatePaRow(row.key, 'phanKhacPhuc', e.target.value)} />
      )},
    { title: 'Phương án đánh giá', dataIndex: 'phuongAnDanhGia', width: 180,
      render: (v, row) => (
        <Input size="small" value={v} style={{ fontSize: 12 }}
          onChange={e => updatePaRow(row.key, 'phuongAnDanhGia', e.target.value)} />
      )},
    { title: 'Phòng ban', dataIndex: 'phongBan', width: 100,
      render: (v, row) => (
        <Input size="small" value={v} style={{ fontSize: 12 }}
          onChange={e => updatePaRow(row.key, 'phongBan', e.target.value)} />
      )},
    { title: 'Thời gian', dataIndex: 'thoiGian', width: 110,
      render: (v, row) => (
        <Input size="small" value={v} placeholder="VD: 07/06/2026" style={{ fontSize: 12 }}
          onChange={e => updatePaRow(row.key, 'thoiGian', e.target.value)} />
      )},
    { title: '', key: 'del', width: 36, align: 'center',
      render: (_, row) => (
        <Tooltip title="Xóa dòng">
          <Button size="small" danger type="text" icon={<DeleteOutlined />}
            onClick={() => setPhuongAnRows(prev => prev.filter(r => r.key !== row.key))} />
        </Tooltip>
      )},
  ]

  const updatePaRow = (key, field, value) => {
    setPhuongAnRows(prev => prev.map(r => r.key === key ? { ...r, [field]: value } : r))
  }

  const addPaRow = () => {
    const newKey = String(Date.now())
    setPhuongAnRows(prev => [...prev, { key: newKey, stt: '', phanKhacPhuc: '', phuongAnDanhGia: '', phongBan: '', thoiGian: '' }])
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const ws = workScheduleRecord || {}

  return (
    <div style={{
      background: '#f0f2f5', minHeight: '100%', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: '1px solid #e8e8e8',
        padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <Button icon={<ArrowLeftOutlined />} onClick={onClose} style={{ fontWeight: 700 }}>
          Quay lại
        </Button>
        <Space style={{ flex: 1 }}>
          <FileTextOutlined style={{ color: '#fa8c16', fontSize: 16 }} />
          <span style={{ fontWeight: 800, fontSize: 15 }}>Hồ Sơ KPH</span>
          {ws.maSp && <Tag color="blue">{ws.maSp}</Tag>}
          {ws.soLo && <Tag color="purple">Lô: {ws.soLo}</Tag>}
          {ws.congDoan && <Tag color="orange">{ws.congDoan}</Tag>}
          {kph?.id && <Tag color="green" style={{ fontSize: 10 }}>Đã lưu #{kph.id}</Tag>}
        </Space>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
          Lưu hồ sơ
        </Button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '16px 0 40px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 900 }}>
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" style={{ padding: 0 }}>
          <style>{`
            .kph-drawer .ant-form-item { margin-bottom: 0 !important; }
            .kph-drawer .ant-input, .kph-drawer .ant-input-affix-wrapper,
            .kph-drawer .ant-picker, .kph-drawer .ant-select-selector { font-size: 13px !important; }
            .kph-pa-table .ant-table-thead > tr > th {
              background: #e6f4ff !important; color: #1677ff !important;
              font-size: 11px !important; padding: 5px 8px !important; font-weight: 700 !important;
            }
            .kph-pa-table .ant-table-tbody > tr > td { padding: 4px 6px !important; }
          `}</style>

          <div className="kph-drawer">

            {/* ── SECTION 1: TRƯỜNG DỮ LIỆU KHI NHẬP MỚI ───────────────── */}
            <div style={{ margin: '12px 12px 0' }}>
              <SectionHeader title="TRƯỜNG DỮ LIỆU KHI NHẬP MỚI" color="#0d7377" />
              <SubHeader label="ĐẦU VÀO" />
              <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderTop: 'none' }}>

                <FieldRow num={1} label="Tên người phát hiện vấn đề KPH" required>
                  <Form.Item name="tenNguoiPhatHien" noStyle>
                    <Input placeholder="Nhập họ tên..." style={{ fontWeight: 600 }} />
                  </Form.Item>
                </FieldRow>

                <FieldRow num={2} label="Ngày, giờ phát hiện">
                  <Form.Item name="ngayGioPhatHien" noStyle>
                    <DatePicker showTime format="DD/MM/YYYY HH:mm"
                      placeholder="Chọn ngày giờ" style={{ width: '100%' }} />
                  </Form.Item>
                </FieldRow>

                <FieldRow num={3} label="Tên sản phẩm / Tên nguyên liệu" required>
                  <Form.Item name="tenSanPhamNguyenLieu" noStyle>
                    <Input placeholder="Tên sản phẩm hoặc nguyên liệu..." />
                  </Form.Item>
                </FieldRow>

                <FieldRow num={4} label="Mã vật tư">
                  <Form.Item name="maVatTu" noStyle>
                    <Input placeholder="Mã vật tư..." style={{ fontFamily: 'monospace' }} />
                  </Form.Item>
                </FieldRow>

                <FieldRow num={5} label="Số lô" required>
                  <Form.Item name="soLo" noStyle>
                    <Input placeholder="Số lô..." style={{ fontFamily: 'monospace' }} />
                  </Form.Item>
                </FieldRow>

                <FieldRow num={6} label="Số mẻ">
                  <Form.Item name="soMe" noStyle>
                    <Input placeholder="Số mẻ..." style={{ width: 200 }} />
                  </Form.Item>
                </FieldRow>

                <FieldRow num={7} label="Công đoạn">
                  <Form.Item name="congDoan" noStyle>
                    <Select placeholder="Chọn công đoạn" style={{ width: 200 }}
                      options={[
                        { value: 'PC', label: 'PC' },
                        { value: 'PCPL1', label: 'PCPL1' },
                        { value: 'PCPL2', label: 'PCPL2' },
                        { value: 'PCPL3', label: 'PCPL3' },
                        { value: 'BBC1', label: 'BBC1' },
                        { value: 'PL', label: 'PL' },
                        { value: 'DG', label: 'ĐG' },
                        { value: 'CC', label: 'CC' },
                      ]}
                    />
                  </Form.Item>
                </FieldRow>

                <FieldRow num={8} label="Mô tả vấn đề không phù hợp" required>
                  <Form.Item name="moTaVanDe" noStyle>
                    <TextArea rows={3} placeholder="Mô tả chi tiết vấn đề..." />
                  </Form.Item>
                </FieldRow>

                <FieldRow num={9} label="Phương án xử lý tức thời">
                  <Form.Item name="phuongAnXuLyTucThoi" noStyle>
                    <TextArea rows={2} placeholder="Biện pháp xử lý ngay tại chỗ..." />
                  </Form.Item>
                </FieldRow>

                <FieldRow num={10} label="Nguyên nhân ban đầu">
                  <Form.Item name="nguyenNhanBanDau" noStyle>
                    <TextArea rows={2} placeholder="Nguyên nhân sơ bộ..." />
                  </Form.Item>
                </FieldRow>

                <FieldRow num={11} label="Nguyên nhân gốc rễ">
                  <Form.Item name="nguyenNhanGocRe" noStyle>
                    <TextArea rows={2} placeholder="Phân tích nguyên nhân gốc rễ..." />
                  </Form.Item>
                </FieldRow>

                <FieldRow num={12} label="Đề xuất khắc phục vấn đề không phù hợp">
                  <Form.Item name="deXuatKhacPhucVanDe" noStyle>
                    <TextArea rows={2} placeholder="Đề xuất biện pháp khắc phục..." />
                  </Form.Item>
                </FieldRow>

                <FieldRow num={13} label="Đề xuất hành động khắc phục nguyên nhân gốc rễ">
                  <Form.Item name="deXuatHanhDongKhacPhuc" noStyle>
                    <TextArea rows={2} placeholder="Hành động cụ thể để khắc phục nguyên nhân gốc rễ..." />
                  </Form.Item>
                </FieldRow>

                <FieldRow num={14} label="File đính kèm">
                  <FileUploadField
                    fileList={fileList1} onChange={setFileList1} multiple={false}
                    action={uploadAction} headers={uploadHeaders} accept={acceptTypes}
                  />
                </FieldRow>

                <FieldRow num={15} label="File đính kèm (có thể tải nhiều file)">
                  <FileUploadField
                    fileList={fileListNhieu} onChange={setFileListNhieu}
                    action={uploadAction} headers={uploadHeaders} accept={acceptTypes}
                  />
                </FieldRow>

                <FieldRow num={16} label="Ghi chú">
                  <Form.Item name="ghiChu" noStyle>
                    <TextArea rows={2} placeholder="Ghi chú thêm..." />
                  </Form.Item>
                </FieldRow>

              </div>
            </div>

            {/* ── SECTION 2: TỔ TRƯỞNG / NHÓM TRƯỞNG PHÊ DUYỆT ────────── */}
            <div style={{ margin: '10px 12px 0' }}>
              <SectionHeader title="TỔ TRƯỞNG / NHÓM TRƯỞNG PHÊ DUYỆT" color="#1d4ed8" />
              <SubHeader label="ĐẦU RA" direction="←" />
              <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderTop: 'none' }}>

                <FieldRow num={17} label="Tên người thực hiện (người tạo ra vấn đề KPH)">
                  <Form.Item name="tenNguoiThucHien" noStyle>
                    <Input placeholder="Họ tên người thực hiện..." />
                  </Form.Item>
                </FieldRow>

                <FieldRow num={18} label="Mã nhân viên (người tạo ra VĐKPH)">
                  <Form.Item name="maNhanVien" noStyle>
                    <Input placeholder="Mã nhân viên..." style={{ width: 200, fontFamily: 'monospace' }} />
                  </Form.Item>
                </FieldRow>

                <FieldRow num={19} label="Ý kiến của tổ trưởng / trưởng nhóm (Phân chia trách nhiệm nếu có chi phí thiệt hại)">
                  <Form.Item name="yKienToTruong" noStyle>
                    <TextArea rows={2} placeholder="Ý kiến phê duyệt hoặc yêu cầu bổ sung..." />
                  </Form.Item>
                </FieldRow>

              </div>
            </div>

            {/* ── SECTION 3: ĐỀ XUẤT PÁN KHẮC PHỤC KPH ─────────────────── */}
            <div style={{ margin: '10px 12px 0' }}>
              <SectionHeader title="ĐX PÁN KHẮC PHỤC KPH" color="#7c3aed" />
              <SubHeader label="ĐẦU VÀO" />
              <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderTop: 'none' }}>

                <FieldRow num={20} label="Ý kiến của TBP">
                  <Form.Item name="yKienTBP" noStyle>
                    <TextArea rows={2} placeholder="Ý kiến của Trưởng bộ phận..." />
                  </Form.Item>
                </FieldRow>

              </div>
            </div>

            {/* ── SECTION 4: QA PHÊ DUYỆT PÁN KHẮC PHỤC KPH ────────────── */}
            <div style={{ margin: '10px 12px 12px' }}>
              <SectionHeader title="QA PHÊ DUYỆT PÁN KHẮC PHỤC KPH" color="#b45309" />
              <SubHeader label="ĐẦU VÀO" />
              <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderTop: 'none' }}>

                <FieldRow num={21} label="Mã sản phẩm (Mã vật tư)">
                  <Form.Item name="maSanPhamVatTu" noStyle>
                    <Input placeholder="Mã vật tư QA xác nhận..." style={{ fontFamily: 'monospace' }} />
                  </Form.Item>
                </FieldRow>

                <FieldRow num={22} label="Tóm tắt vấn đề không phù hợp">
                  <Form.Item name="tomTatVanDe" noStyle>
                    <TextArea rows={3} placeholder="Tóm tắt toàn bộ vấn đề KPH..." />
                  </Form.Item>
                </FieldRow>

                <FieldRow num={23} label="Vấn đề KPH có ảnh hưởng đến chất lượng sản phẩm không?">
                  <Form.Item name="anhHuongChatLuong" noStyle>
                    <Select style={{ width: 160 }} placeholder="Chọn..."
                      options={[{ value: 'Có', label: 'Có' }, { value: 'Không', label: 'Không' }]} />
                  </Form.Item>
                </FieldRow>

                <FieldRow num={24} label="Vấn đề KPH có khả năng lặp lại ở các lô lân cận / sản phẩm tương tự không?">
                  <Form.Item name="khaNangLapLai" noStyle>
                    <Select style={{ width: 160 }} placeholder="Chọn..."
                      options={[{ value: 'Có', label: 'Có' }, { value: 'Không', label: 'Không' }]} />
                  </Form.Item>
                </FieldRow>

                <FieldRow num={25} label="Nguyên nhân ban đầu">
                  <Form.Item name="nguyenNhanBanDauQA" noStyle>
                    <TextArea rows={2} placeholder="Nguyên nhân theo đánh giá QA..." />
                  </Form.Item>
                </FieldRow>

                <FieldRow num={26} label="Phương án khắc phục vấn đề KPH">
                  <div style={{ marginTop: 6 }}>
                    <Table
                      className="kph-pa-table"
                      columns={paColumns}
                      dataSource={phuongAnRows}
                      pagination={false}
                      size="small"
                      bordered
                      scroll={{ x: 700 }}
                    />
                    <Button size="small" icon={<PlusOutlined />} onClick={addPaRow}
                      style={{ marginTop: 6 }}>
                      Thêm dòng
                    </Button>
                  </div>
                </FieldRow>

                <FieldRow num={27} label="File đính kèm (QA)">
                  <FileUploadField
                    fileList={fileListQA} onChange={setFileListQA}
                    action={uploadAction} headers={uploadHeaders} accept={acceptTypes}
                  />
                </FieldRow>

                <FieldRow num={28} label="QA ghi chú">
                  <Form.Item name="qaGhiChu" noStyle>
                    <TextArea rows={2} placeholder="Ghi chú của QA..." />
                  </Form.Item>
                </FieldRow>

              </div>
            </div>

          </div>
        </Form>
      </Spin>
      </div>
      </div>
    </div>
  )
}
