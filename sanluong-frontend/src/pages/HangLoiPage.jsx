import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space,
  DatePicker, message, Popconfirm, Row, Col, AutoComplete,
  Spin, Tabs, InputNumber,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  SearchOutlined, ReloadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const PHAN_LOAI_OPTIONS = [
  { value: 'PCPL',       color: 'green' },
  { value: 'PCPL3',      color: 'red' },
  { value: 'KXĐ',        color: 'orange' },
  { value: 'Đóng gói',   color: 'geekblue' },
  { value: 'Nguyên liệu',color: 'blue' },
  { value: 'Khác',       color: 'default' },
]
const HUONG_XU_LY_OPTIONS = ['Xử lý', 'Bán thanh lý']
const TRANG_THAI_OPTIONS   = ['Đang xử lý', 'Đã hoàn thành']

const phanLoaiColor = (val) =>
  (PHAN_LOAI_OPTIONS.find(o => o.value === val) || {}).color || 'default'

function HangTraLaiTab() {
  const { canEditHangLoi } = useAuth()
  const canEdit = canEditHangLoi()

  const [data, setData]               = useState([])
  const [loading, setLoading]         = useState(false)
  const [total, setTotal]             = useState(0)
  const [page, setPage]               = useState(0)
  const [modalOpen, setModalOpen]     = useState(false)
  const [editRecord, setEditRecord]   = useState(null)
  const [saving, setSaving]           = useState(false)
  const [savingCell, setSavingCell]   = useState(null)
  const [acOptions, setAcOptions]     = useState([])
  const [acLoading, setAcLoading]     = useState(false)
  const acTimer                        = useRef(null)
  const dataRef                        = useRef(data)
  const [form]                         = Form.useForm()

  const [fromDate, setFromDate]       = useState(null)
  const [toDate, setToDate]           = useState(null)
  const [keyword, setKeyword]         = useState('')
  const [trangThaiFilter, setTrangThaiFilter] = useState('')

  useEffect(() => { dataRef.current = data }, [data])

  const load = useCallback(async (pg = 0) => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/hang-loi', {
        params: {
          fromDate:  fromDate ? fromDate.format('YYYY-MM-DD') : undefined,
          toDate:    toDate   ? toDate.format('YYYY-MM-DD')   : undefined,
          keyword:   keyword || undefined,
          trangThai: trangThaiFilter || undefined,
          page: pg,
          size: 50,
        },
      })
      setData(res.content)
      setTotal(res.totalElements)
      setPage(pg)
    } catch { message.error('Tải dữ liệu thất bại') }
    finally { setLoading(false) }
  }, [fromDate, toDate, keyword, trangThaiFilter])

  useEffect(() => { load(0) }, [])

  const openAdd = () => {
    setEditRecord(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditRecord(record)
    form.setFieldsValue({
      mtpCoMem:     record.mtpCoMem,
      mtpSongAn:    record.mtpSongAn,
      tenHangHoa:   record.tenHangHoa,
      soLo:         record.soLo,
      soLuong:      record.soLuong,
      liDoTraVe:    record.liDoTraVe,
      namXuLy:      record.namXuLy,
      huongXuLy:    record.huongXuLy,
      phanLoaiLoi:  record.phanLoaiLoi ? record.phanLoaiLoi.split(',').map(s => s.trim()).filter(Boolean) : [],
      ngayBatDau:   record.ngayBatDau  ? dayjs(record.ngayBatDau)  : null,
      ngayKetThuc:  record.ngayKetThuc ? dayjs(record.ngayKetThuc) : null,
      trangThaiXuLy:record.trangThaiXuLy,
      ghiChu:       record.ghiChu,
      slDatSauXuLy: record.slDatSauXuLy,
      slHuy:        record.slHuy,
    })
    setModalOpen(true)
  }

  const buildPayload = (values) => ({
    mtpCoMem:      values.mtpCoMem      || null,
    mtpSongAn:     values.mtpSongAn     || null,
    tenHangHoa:    values.tenHangHoa    || null,
    soLo:          values.soLo          || null,
    soLuong:       values.soLuong       ?? null,
    liDoTraVe:     values.liDoTraVe     || null,
    namXuLy:       values.namXuLy       || null,
    huongXuLy:     values.huongXuLy     || null,
    phanLoaiLoi:   Array.isArray(values.phanLoaiLoi)
                     ? values.phanLoaiLoi.join(',')
                     : (values.phanLoaiLoi || null),
    ngayBatDau:    values.ngayBatDau    ? values.ngayBatDau.format('YYYY-MM-DD')  : null,
    ngayKetThuc:   values.ngayKetThuc   ? values.ngayKetThuc.format('YYYY-MM-DD') : null,
    trangThaiXuLy: values.trangThaiXuLy || null,
    ghiChu:        values.ghiChu        || null,
    slDatSauXuLy:  values.slDatSauXuLy  ?? null,
    slHuy:         values.slHuy         ?? null,
  })

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload = buildPayload(values)
      if (editRecord) {
        const { data: updated } = await api.put(`/hang-loi/${editRecord.id}`, payload)
        setData(prev => prev.map(r => r.id === editRecord.id ? updated : r))
        message.success('Cập nhật thành công')
      } else {
        const { data: created } = await api.post('/hang-loi', payload)
        setData(prev => [created, ...prev])
        setTotal(t => t + 1)
        message.success('Thêm mới thành công')
      }
      setModalOpen(false)
    } catch { message.error('Lưu thất bại') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/hang-loi/${id}`)
      setData(prev => prev.filter(r => r.id !== id))
      setTotal(t => t - 1)
      message.success('Đã xóa')
    } catch { message.error('Xóa thất bại') }
  }

  const patchRecord = useCallback(async (recordId, field, value) => {
    const record = dataRef.current.find(r => r.id === recordId)
    if (!record) return
    setSavingCell(`${recordId}-${field}`)
    try {
      const payload = {
        mtpCoMem: record.mtpCoMem, mtpSongAn: record.mtpSongAn,
        tenHangHoa: record.tenHangHoa, soLo: record.soLo,
        soLuong: record.soLuong, liDoTraVe: record.liDoTraVe,
        namXuLy: record.namXuLy, huongXuLy: record.huongXuLy,
        phanLoaiLoi: record.phanLoaiLoi, ngayBatDau: record.ngayBatDau,
        ngayKetThuc: record.ngayKetThuc, trangThaiXuLy: record.trangThaiXuLy,
        ghiChu: record.ghiChu, slDatSauXuLy: record.slDatSauXuLy,
        slHuy: record.slHuy, [field]: value,
      }
      const { data: updated } = await api.put(`/hang-loi/${recordId}`, payload)
      setData(prev => prev.map(r => r.id === recordId ? updated : r))
    } catch { message.error('Lưu thất bại') }
    finally { setSavingCell(null) }
  }, [])

  const searchSchedules = (q) => {
    clearTimeout(acTimer.current)
    if (!q || q.length < 2) { setAcOptions([]); return }
    setAcLoading(true)
    acTimer.current = setTimeout(async () => {
      try {
        const { data: res } = await api.get('/work-schedule', {
          params: { tenTrinh: q, page: 0, size: 15 },
        })
        setAcOptions((res.content || []).map(r => ({
          value: r.tenTrinh || '',
          label: (
            <div>
              <Tag color="blue" style={{ marginRight: 4 }}>{r.maSp}</Tag>
              {r.tenTrinh}
              {r.soLo && <span style={{ color: '#888', marginLeft: 4 }}>({r.soLo})</span>}
            </div>
          ),
          _raw: r,
        })))
      } catch {}
      finally { setAcLoading(false) }
    }, 350)
  }

  const onSelectSchedule = async (val, opt) => {
    const r = opt._raw
    form.setFieldsValue({ tenHangHoa: r.tenTrinh || '', mtpCoMem: r.maSp || '', soLo: r.soLo || '' })
    if (r.maSp) {
      try {
        const { data: pm } = await api.get(`/product-master/lookup/${encodeURIComponent(r.maSp)}`)
        form.setFieldsValue({ mtpSongAn: pm.maBravo || '' })
      } catch {}
    }
    setAcOptions([])
  }

  const columns = [
    {
      title: 'Mã SP',
      dataIndex: 'mtpCoMem',
      width: 90,
      fixed: 'left',
      render: v => v ? <Tag color="blue">{v}</Tag> : '—',
    },
    {
      title: 'Mã Bravo',
      dataIndex: 'mtpSongAn',
      width: 100,
      fixed: 'left',
      render: v => v || '—',
    },
    {
      title: 'Tiến Trình',
      dataIndex: 'tenHangHoa',
      width: 240,
      fixed: 'left',
      render: v => v || '—',
    },
    {
      title: 'Số lô',
      dataIndex: 'soLo',
      width: 110,
      fixed: 'left',
      render: v => v || '—',
    },
    {
      title: 'Số lượng',
      dataIndex: 'soLuong',
      width: 90,
      align: 'right',
      render: v => v ?? '—',
    },
    {
      title: 'Li do trả về',
      dataIndex: 'liDoTraVe',
      width: 180,
      render: v => v || '—',
    },
    {
      title: 'Nam xử lý',
      dataIndex: 'namXuLy',
      width: 130,
      render: v => v || '—',
    },
    {
      title: 'Hướng xử lý',
      dataIndex: 'huongXuLy',
      width: 145,
      render: (val, record) => canEdit ? (
        <Select
          size="small"
          value={val || undefined}
          style={{ width: 128 }}
          loading={savingCell === `${record.id}-huongXuLy`}
          onChange={v => patchRecord(record.id, 'huongXuLy', v ?? null)}
          options={HUONG_XU_LY_OPTIONS.map(o => ({ value: o, label: o }))}
          placeholder="—"
          allowClear
        />
      ) : (val || '—'),
    },
    {
      title: 'Phân loại lỗi',
      dataIndex: 'phanLoaiLoi',
      width: 185,
      render: v => v
        ? v.split(',').map(s => s.trim()).filter(Boolean).map(s =>
            <Tag key={s} color={phanLoaiColor(s)} style={{ marginBottom: 2 }}>{s}</Tag>
          )
        : '—',
    },
    {
      title: 'Ngày bắt đầu',
      dataIndex: 'ngayBatDau',
      width: 120,
      render: v => v ? dayjs(v).format('DD/MM/YYYY') : '—',
    },
    {
      title: 'Ngày kết thúc',
      dataIndex: 'ngayKetThuc',
      width: 120,
      render: v => v ? dayjs(v).format('DD/MM/YYYY') : '—',
    },
    {
      title: 'Trạng thái xử lí',
      dataIndex: 'trangThaiXuLy',
      width: 160,
      render: (val, record) => canEdit ? (
        <Select
          size="small"
          value={val || undefined}
          style={{ width: 142 }}
          loading={savingCell === `${record.id}-trangThaiXuLy`}
          onChange={v => patchRecord(record.id, 'trangThaiXuLy', v ?? null)}
          options={TRANG_THAI_OPTIONS.map(o => ({ value: o, label: o }))}
          placeholder="—"
          allowClear
        />
      ) : (val || '—'),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'ghiChu',
      width: 200,
      render: v => v || '—',
    },
    {
      title: 'SL đạt sau xử lý',
      dataIndex: 'slDatSauXuLy',
      width: 140,
      align: 'right',
      render: v => v ?? '—',
    },
    {
      title: 'SL hủy',
      dataIndex: 'slHuy',
      width: 80,
      align: 'right',
      render: v => v ?? '—',
    },
    ...(canEdit ? [{
      title: '',
      key: 'actions',
      width: 75,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title="Xóa bản ghi này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa" cancelText="Hủy"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ]

  return (
    <>
      <Row gutter={8} style={{ marginBottom: 12 }}>
        <Col>
          <DatePicker
            placeholder="Từ ngày" format="DD/MM/YYYY"
            value={fromDate} onChange={setFromDate} style={{ width: 130 }}
          />
        </Col>
        <Col>
          <DatePicker
            placeholder="Đến ngày" format="DD/MM/YYYY"
            value={toDate} onChange={setToDate} style={{ width: 130 }}
          />
        </Col>
        <Col>
          <Input
            placeholder="Tìm kiếm..." prefix={<SearchOutlined />}
            value={keyword} onChange={e => setKeyword(e.target.value)}
            style={{ width: 200 }} allowClear
          />
        </Col>
        <Col>
          <Select
            placeholder="Trạng thái" value={trangThaiFilter || undefined}
            onChange={v => setTrangThaiFilter(v || '')}
            style={{ width: 160 }} allowClear
            options={TRANG_THAI_OPTIONS.map(o => ({ value: o, label: o }))}
          />
        </Col>
        <Col>
          <Button icon={<SearchOutlined />} onClick={() => load(0)}>Tìm</Button>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={() => {
            setFromDate(null); setToDate(null)
            setKeyword(''); setTrangThaiFilter('')
            load(0)
          }} />
        </Col>
        {canEdit && (
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Thêm mới</Button>
          </Col>
        )}
      </Row>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1900 }}
        size="small"
        pagination={{
          current: page + 1,
          pageSize: 50,
          total,
          showTotal: t => `Tổng ${t} bản ghi`,
          onChange: p => load(p - 1),
        }}
      />

      <Modal
        title={editRecord ? 'Chỉnh sửa hàng lỗi' : 'Thêm hàng lỗi mới'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        width={820}
        okText="Lưu" cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="tenHangHoa" label="Tiến Trình">
                <AutoComplete
                  options={acOptions}
                  onSearch={searchSchedules}
                  onSelect={onSelectSchedule}
                  notFoundContent={acLoading ? <Spin size="small" /> : null}
                  placeholder="Gõ để tìm — tự điền Mã SP, Mã Bravo, Số lô"
                >
                  <Input />
                </AutoComplete>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="mtpCoMem" label="Mã SP">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="mtpSongAn" label="Mã Bravo">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="soLo" label="Số lô">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="soLuong" label="Số lượng">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="liDoTraVe" label="Li do trả về">
                <Input.TextArea rows={1} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="namXuLy" label="Nam xử lý">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="huongXuLy" label="Hướng xử lý">
                <Select
                  allowClear placeholder="Chọn hướng xử lý"
                  options={HUONG_XU_LY_OPTIONS.map(o => ({ value: o, label: o }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="phanLoaiLoi" label="Phân loại lỗi">
                <Select
                  mode="multiple" allowClear placeholder="Chọn phân loại lỗi"
                  options={PHAN_LOAI_OPTIONS.map(o => ({
                    value: o.value,
                    label: <Tag color={o.color}>{o.value}</Tag>,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ngayBatDau" label="Ngày bắt đầu">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ngayKetThuc" label="Ngày kết thúc">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="trangThaiXuLy" label="Trạng thái xử lí">
                <Select
                  allowClear placeholder="Chọn trạng thái"
                  options={TRANG_THAI_OPTIONS.map(o => ({ value: o, label: o }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="ghiChu" label="Ghi chú">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="slDatSauXuLy" label="SL đạt sau xử lý">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="slHuy" label="SL hủy">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  )
}

export default function HangLoiPage() {
  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 16 }}>Hàng Lỗi</h2>
      <Tabs
        defaultActiveKey="hang-tra-lai"
        items={[
          {
            key: 'hang-tra-lai',
            label: 'Hàng Trả lại ĐG - PL',
            children: <HangTraLaiTab />,
          },
        ]}
      />
    </div>
  )
}
