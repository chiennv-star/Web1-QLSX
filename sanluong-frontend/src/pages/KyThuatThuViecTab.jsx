import React, { useState, useEffect, useMemo } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, DatePicker, Tag, Space,
  message, Popconfirm, Row, Col, Spin,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api/axios'
import {
  PHAN_LOAI_OPTIONS, TRANG_THAI_OPTIONS,
  phanLoaiColor, trangThaiColor,
} from './kyThuatConstants'

const { TextArea } = Input

export default function KyThuatThuViecTab() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/ky-thuat/thu-viec')
      setData(res)
    } catch { message.error('Tải dữ liệu Thử việc thất bại') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return data
    return data.filter(r =>
      [r.moTa, r.thietBi, r.noiDung, r.nguyenNhan, r.bienPhap, r.nguoiPhuTrach]
        .some(v => (v || '').toLowerCase().includes(kw))
    )
  }, [data, keyword])

  const openAdd = () => { setEditRecord(null); form.resetFields(); form.setFieldsValue({ ngay: dayjs() }); setModalOpen(true) }
  const openEdit = (record) => {
    setEditRecord(record)
    form.setFieldsValue({ ...record, ngay: record.ngay ? dayjs(record.ngay) : null })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload = { ...values, ngay: values.ngay ? values.ngay.format('YYYY-MM-DD') : null }
      if (editRecord) {
        const { data: updated } = await api.put(`/ky-thuat/thu-viec/${editRecord.id}`, payload)
        setData(prev => prev.map(r => r.id === editRecord.id ? updated : r))
        message.success('Cập nhật thành công')
      } else {
        const { data: created } = await api.post('/ky-thuat/thu-viec', payload)
        setData(prev => [created, ...prev])
        message.success('Thêm mới thành công')
      }
      setModalOpen(false)
    } catch { message.error('Lưu thất bại') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/ky-thuat/thu-viec/${id}`)
      setData(prev => prev.filter(r => r.id !== id))
      message.success('Đã xóa')
    } catch { message.error('Xóa thất bại') }
  }

  const columns = [
    { title: 'Ngày', dataIndex: 'ngay', width: 100, render: v => v ? dayjs(v).format('DD/MM/YYYY') : '—',
      sorter: (a, b) => (a.ngay || '').localeCompare(b.ngay || ''), defaultSortOrder: 'descend' },
    { title: 'Mô tả', dataIndex: 'moTa', minWidth: 220 },
    { title: 'Thiết bị', dataIndex: 'thietBi', width: 160 },
    { title: 'Phân loại', dataIndex: 'phanLoai', width: 150,
      render: v => v ? <Tag color={phanLoaiColor(v)} style={{ color: '#fff', background: phanLoaiColor(v) }}>{v}</Tag> : '—' },
    { title: 'Thời gian', dataIndex: 'thoiGian', width: 120 },
    { title: 'Trạng thái', dataIndex: 'trangThai', width: 130, render: v => <Tag color={trangThaiColor(v)}>{v || 'Chưa cập nhật'}</Tag> },
    { title: 'Phụ trách', dataIndex: 'nguoiPhuTrach', width: 130 },
    {
      title: '', key: 'actions', width: 90, fixed: 'right',
      render: (_, record) => (
        <Space size={4} onClick={e => e.stopPropagation()}>
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Xóa bản ghi này?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }} wrap>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm theo mô tả, thiết bị, nội dung…"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          style={{ width: 340 }}
          allowClear
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Thêm nhật ký</Button>
      </Space>
      <Spin spinning={loading}>
        <Table
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={filtered}
          sticky
          scroll={{ x: 1050, y: 520 }}
          pagination={{ pageSize: 20, showTotal: t => `${t} bản ghi` }}
          onRow={record => ({ onClick: () => openEdit(record), style: { cursor: 'pointer' } })}
        />
      </Spin>

      <Modal
        open={modalOpen}
        title={editRecord ? 'Sửa nhật ký Thử việc' : 'Thêm nhật ký Thử việc'}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText="Lưu" cancelText="Hủy"
        width={680}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="Ngày" name="ngay" rules={[{ required: true, message: 'Chọn ngày' }]}>
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Thiết bị" name="thietBi"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Thời gian" name="thoiGian"><Input placeholder="8h00-16h00" /></Form.Item>
            </Col>
          </Row>
          <Form.Item label="Mô tả" name="moTa" rules={[{ required: true, message: 'Nhập mô tả' }]}>
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Phân loại" name="phanLoai">
                <Select allowClear options={PHAN_LOAI_OPTIONS.map(o => ({ value: o.value, label: o.value }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Trạng thái" name="trangThai">
                <Select allowClear options={TRANG_THAI_OPTIONS.map(o => ({ value: o.value, label: o.value }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Nội dung" name="noiDung"><TextArea rows={2} /></Form.Item>
          <Form.Item label="Nguyên nhân" name="nguyenNhan"><TextArea rows={2} /></Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Biện pháp xử lý" name="bienPhap"><TextArea rows={2} /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Người phụ trách" name="nguoiPhuTrach"><Input /></Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
