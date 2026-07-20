import React, { useState, useEffect, useMemo } from 'react'
import {
  Table, Button, Modal, Form, Input, DatePicker, InputNumber, Space,
  message, Popconfirm, Row, Col, Spin,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api/axios'

const numFmt = { formatter: v => v ? Number(v).toLocaleString('vi-VN') : '', parser: v => v ? v.replace(/[^\d]/g, '') : '' }

export default function KyThuatKaizenTab() {
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
      const { data: res } = await api.get('/ky-thuat/kaizen')
      setData(res)
    } catch { message.error('Tải dữ liệu Kaizen thất bại') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return data
    return data.filter(r => [r.chiSo, r.moTa, r.nguoiThucHien].some(v => (v || '').toLowerCase().includes(kw)))
  }, [data, keyword])

  const openAdd = () => { setEditRecord(null); form.resetFields(); form.setFieldsValue({ ngayGhiNhan: dayjs() }); setModalOpen(true) }
  const openEdit = (record) => {
    setEditRecord(record)
    form.setFieldsValue({ ...record, ngayGhiNhan: record.ngayGhiNhan ? dayjs(record.ngayGhiNhan) : null })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload = { ...values, ngayGhiNhan: values.ngayGhiNhan ? values.ngayGhiNhan.format('YYYY-MM-DD') : null }
      if (editRecord) {
        const { data: updated } = await api.put(`/ky-thuat/kaizen/${editRecord.id}`, payload)
        setData(prev => prev.map(r => r.id === editRecord.id ? updated : r))
        message.success('Cập nhật thành công')
      } else {
        const { data: created } = await api.post('/ky-thuat/kaizen', payload)
        setData(prev => [created, ...prev])
        message.success('Thêm mới thành công')
      }
      setModalOpen(false)
    } catch { message.error('Lưu thất bại') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/ky-thuat/kaizen/${id}`)
      setData(prev => prev.filter(r => r.id !== id))
      message.success('Đã xóa')
    } catch { message.error('Xóa thất bại') }
  }

  const columns = [
    { title: 'Ngày', dataIndex: 'ngayGhiNhan', width: 100, render: v => v ? dayjs(v).format('DD/MM/YYYY') : '—',
      sorter: (a, b) => (a.ngayGhiNhan || '').localeCompare(b.ngayGhiNhan || ''), defaultSortOrder: 'descend' },
    { title: 'Chỉ số', dataIndex: 'chiSo', minWidth: 180 },
    { title: 'Trước', dataIndex: 'gtTruoc', width: 120 },
    { title: 'Sau', dataIndex: 'gtSau', width: 120 },
    { title: 'Quy đổi (VNĐ/tháng)', dataIndex: 'quyDoi', width: 160, align: 'right',
      render: v => v != null ? Number(v).toLocaleString('vi-VN') : '—' },
    { title: 'Mô tả cải tiến', dataIndex: 'moTa', minWidth: 200 },
    { title: 'Người thực hiện', dataIndex: 'nguoiThucHien', width: 140 },
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
          placeholder="Tìm theo chỉ số, mô tả, người thực hiện…"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          style={{ width: 320 }}
          allowClear
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Thêm cải tiến</Button>
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
        title={editRecord ? 'Sửa bản ghi Kaizen' : 'Thêm bản ghi Kaizen'}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText="Lưu" cancelText="Hủy"
        width={620}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Ngày ghi nhận" name="ngayGhiNhan" rules={[{ required: true, message: 'Chọn ngày' }]}>
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Người thực hiện" name="nguoiThucHien"><Input /></Form.Item>
            </Col>
          </Row>
          <Form.Item label="Chỉ số đo lường" name="chiSo" rules={[{ required: true, message: 'Nhập chỉ số' }]}>
            <Input placeholder="VD: Thời gian vệ sinh máy chiết (phút/ca)" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="Giá trị trước" name="gtTruoc"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Giá trị sau" name="gtSau"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Quy đổi (VNĐ/tháng)" name="quyDoi">
                <InputNumber style={{ width: '100%' }} {...numFmt} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Mô tả cải tiến" name="moTa"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
