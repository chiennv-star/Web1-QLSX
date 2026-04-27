import React, { useEffect, useRef, useState } from 'react'
import {
  Form, Input, InputNumber, Select, Button, Typography,
  Row, Col, Card, Space, message, Tooltip, Tag, Divider
} from 'antd'
import {
  SaveOutlined, ArrowLeftOutlined, SyncOutlined, CheckCircleOutlined,
  LinkOutlined
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios'

const { Option } = Select

const TRANG_THAI_OPTIONS = [
  { value: 'done', label: 'Done' },
  { value: 'doing', label: 'Doing' },
]

export default function RecordFormPage() {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [lookupStatus, setLookupStatus] = useState(null)
  const lookupTimer = useRef(null)

  // Work schedule suggestions
  const [suggestions, setSuggestions] = useState([])
  const [scheduleLoading, setScheduleLoading] = useState(false)

  useEffect(() => {
    if (isEdit) {
      api.get(`/production/${id}`)
        .then(({ data }) => form.setFieldsValue({
          ...data,
          soLuong:    data.soLuong    ?? 0,
          spTrungGian: data.spTrungGian ?? 0,
          tpNhapKho:  data.tpNhapKho  ?? 0,
          temDb:      data.temDb      ?? 0,
          bbc1_3:     data.bbc1_3     ?? 0,
          pcChiPhi:   data.pcChiPhi   ?? 0,
          plChiPhi:   data.plChiPhi   ?? 0,
          dgChiPhi:   data.dgChiPhi   ?? 0,
          dg2:    (data.dg2   && data.dg2   !== '') ? String(data.dg2)   : '0',
          pcPl:   (data.pcPl  && data.pcPl  !== '') ? String(data.pcPl)  : '0',
          bbc1_2: (data.bbc1_2 && data.bbc1_2 !== '') ? String(data.bbc1_2) : '0',
        }))
        .catch(() => message.error('Không thể tải dữ liệu'))
    }
    // Fetch suggestions from work schedule (PC + BBC1)
    api.get('/work-schedule/suggestions')
      .then(({ data }) => setSuggestions(data))
      .catch(() => {})
  }, [id])

  // Auto-fill Mã Bravo + Tiến trình khi nhập Mã TP
  const handleMaTpChange = (e) => {
    const val = e.target.value?.trim()
    if (lookupTimer.current) clearTimeout(lookupTimer.current)
    if (!val) { setLookupStatus(null); return }
    setLookupStatus('loading')
    lookupTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/product-master/lookup/${encodeURIComponent(val)}`)
        form.setFieldsValue({ maBravo: data.maBravo, tienTrinh: data.tienTrinh })
        setLookupStatus('found')
      } catch {
        setLookupStatus('not_found')
      }
    }, 500)
  }

  // Auto-fill toàn bộ form từ lịch làm việc khi chọn bộ (Mã SP, Tiến trình, Số lô)
  const handleScheduleSelect = async (value) => {
    if (!value) return
    const [maSp, tenTrinh, soLo] = value.split('|||')
    setScheduleLoading(true)
    try {
      const { data } = await api.get('/work-schedule/lookup-by-triplet', {
        params: { maSp, tenTrinh, soLo }
      })

      const newValues = {
        maTp: maSp,
        tienTrinh: tenTrinh || '',
        lsx: soLo || '',
      }

      if (data.pc) {
        newValues.pcTrangThai = data.pc.tinhTrang
        if (data.pc.congPc != null) newValues.pcChiPhi = data.pc.congPc
      }
      if (data.bbc1) {
        newValues.bbc1TrangThai = data.bbc1.tinhTrang
        if (data.bbc1.slBbc1 != null) newValues.bbc1_2 = data.bbc1.slBbc1
        if (data.bbc1.congBbc1 != null) newValues.bbc1_3 = data.bbc1.congBbc1
      }
      if (data.pl) {
        newValues.plTrangThai = data.pl.tinhTrang
        if (data.pl.slPl != null) newValues.pcPl = data.pl.slPl
        if (data.pl.congPl != null) newValues.plChiPhi = data.pl.congPl
      }
      if (data.dg) {
        newValues.dgTrangThai = data.dg.tinhTrang
        if (data.dg.slDg != null) newValues.dg2 = data.dg.slDg
        if (data.dg.congDg != null) newValues.dgChiPhi = data.dg.congDg
      }

      form.setFieldsValue(newValues)
      setLookupStatus('found')

      // Also lookup maBravo from product master
      try {
        const { data: master } = await api.get(`/product-master/lookup/${encodeURIComponent(maSp)}`)
        form.setFieldsValue({ maBravo: master.maBravo })
      } catch {}

      message.success('Đã tự động điền từ Lịch làm việc')
    } catch {
      message.error('Không thể lấy dữ liệu Lịch làm việc')
    } finally {
      setScheduleLoading(false)
    }
  }

  const syncHangLoi = async (values) => {
    const { maTp, maBravo, tienTrinh, lsx, soLuong } = values
    if (!maTp) return
    try {
      const { data: exists } = await api.get('/hang-loi/exists', {
        params: { mtpCoMem: maTp, tenHangHoa: tienTrinh || '', soLo: lsx || '' },
      })
      if (!exists) {
        await api.post('/hang-loi', {
          mtpCoMem:   maTp      || null,
          mtpSongAn:  maBravo   || null,
          tenHangHoa: tienTrinh || null,
          soLo:       lsx       || null,
          soLuong:    soLuong   ?? null,
        })
        message.info('Đã tự động tạo bản ghi Hàng Lỗi mới')
      }
    } catch {}
  }

  const onFinish = async (values) => {
    try {
      if (isEdit) {
        await api.put(`/production/${id}`, values)
        message.success('Cập nhật thành công')
        await syncHangLoi(values)
      } else {
        await api.post('/production', values)
        message.success('Thêm mới thành công')
        await syncHangLoi(values)
      }
      navigate('/')
    } catch (err) {
      message.error(err.response?.data?.message || 'Lưu thất bại')
    }
  }

  const watchBbc1    = Form.useWatch('bbc1_3',   form)
  const watchPc      = Form.useWatch('pcChiPhi', form)
  const watchPl      = Form.useWatch('plChiPhi', form)
  const watchDg      = Form.useWatch('dgChiPhi', form)
  const watchDg2     = Form.useWatch('dg2',      form)
  const watchPcPl    = Form.useWatch('pcPl',     form)
  const watchSoLuong = Form.useWatch('soLuong',  form)
  const sigmaCong    = ((watchBbc1 || 0) + (watchPc || 0) + (watchPl || 0) + (watchDg || 0)).toFixed(4)
  const chenhLechBtp = (parseInt(watchDg2 || 0) || 0) - (parseInt(watchPcPl || 0) || 0)
  const doDangDgCalc = (parseInt(watchSoLuong || 0) || 0) - (parseInt(watchDg2 || 0) || 0)
  const spCong = (() => {
    const sc = parseFloat(sigmaCong)
    const slDg = parseFloat(watchDg2)
    if (!sc || !slDg) return 0
    return (slDg / sc).toFixed(4)
  })()

  const lookupIndicator = () => {
    if (lookupStatus === 'loading') return <SyncOutlined spin style={{ color: '#1890ff' }} />
    if (lookupStatus === 'found') return (
      <Tooltip title="Đã tự động điền từ danh mục">
        <CheckCircleOutlined style={{ color: '#52c41a' }} />
      </Tooltip>
    )
    if (lookupStatus === 'not_found') return (
      <Tooltip title="Mã TP chưa có trong danh mục, vui lòng điền thủ công">
        <Tag color="orange" style={{ margin: 0 }}>Nhập thủ công</Tag>
      </Tooltip>
    )
    return null
  }

  const suggestionOptions = suggestions.map(s => ({
    value: `${s.maSp}|||${s.tenTrinh || ''}|||${s.soLo || ''}`,
    label: `${s.maSp}${s.tenTrinh ? ' — ' + s.tenTrinh : ''}${s.soLo ? ' [' + s.soLo + ']' : ''}`
  }))

  return (
    <>
      <Space align="center" style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>Quay lại</Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {isEdit ? 'Chỉnh sửa bản ghi' : 'Thêm bản ghi mới'}
        </Typography.Title>
      </Space>

      {/* Auto-fill từ Lịch làm việc */}
      <Card
        style={{ marginBottom: 16, borderColor: '#1890ff', background: '#f0f9ff' }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <Row gutter={16} align="middle">
          <Col xs={24} md={2}>
            <Space>
              <LinkOutlined style={{ color: '#1890ff', fontSize: 16 }} />
              <Typography.Text strong style={{ color: '#1890ff' }}>
                Lịch làm việc
              </Typography.Text>
            </Space>
          </Col>
          <Col xs={24} md={22}>
            <Select
              showSearch
              allowClear
              loading={scheduleLoading}
              placeholder="Chọn bộ (Mã SP — Tiến trình — Số lô) để tự động điền tình trạng và chi phí..."
              style={{ width: '100%' }}
              onChange={handleScheduleSelect}
              optionFilterProp="label"
              options={suggestionOptions}
            />
          </Col>
        </Row>
      </Card>

      <Form form={form} layout="vertical" onFinish={onFinish}
        initialValues={{
          soLuong: 0, spTrungGian: 0, tpNhapKho: 0, temDb: 0,
          bbc1_3: 0, pcChiPhi: 0, plChiPhi: 0, dgChiPhi: 0,
          dg2: '0', pcPl: '0', bbc1_2: '0',
        }}>

        <Card
          title="Thông tin cơ bản"
          style={{ marginBottom: 16 }}
          extra={
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Nhập Mã TP để tự động điền Mã Bravo và Tiến trình
            </Typography.Text>
          }
        >
          <Row gutter={16}>
            <Col xs={24} sm={12} md={4}>
              <Form.Item
                label={<Space size={4}><span>Mã TP</span>{lookupIndicator()}</Space>}
                name="maTp"
                rules={[{ required: true, message: 'Nhập mã TP' }]}
              >
                <Input onChange={handleMaTpChange} placeholder="Ví dụ: TP364" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="Mã Bravo" name="maBravo">
                <Input placeholder="Tự động điền hoặc nhập tay" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Tiến trình (Tên sản phẩm)" name="tienTrinh">
                <Input.TextArea
                  placeholder="Tự động điền hoặc nhập tay"
                  autoSize={{ minRows: 1, maxRows: 6 }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="LSX" name="lsx">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="Số lượng" name="soLuong">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Trạng thái công đoạn" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={8} md={4}>
              <Form.Item label="PC (Pha chế)" name="pcTrangThai">
                <Select allowClear placeholder="Chọn">
                  {TRANG_THAI_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8} md={4}>
              <Form.Item label="PL (Phân liều)" name="plTrangThai">
                <Select allowClear placeholder="Chọn">
                  {TRANG_THAI_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8} md={4}>
              <Form.Item label="ĐG (Đóng gói)" name="dgTrangThai">
                <Select allowClear placeholder="Chọn">
                  {TRANG_THAI_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8} md={4}>
              <Form.Item label="BBC1" name="bbc1TrangThai">
                <Select allowClear placeholder="Chọn">
                  {TRANG_THAI_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="BBC1" name="bbc1_1">
                <Input placeholder="DDMMYY" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="SL PCPL" name="pcPl">
                <Input placeholder="0" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="SL ĐG" name="dg2">
                <Input placeholder="0" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="SL BBC1" name="bbc1_2">
                <Input placeholder="0" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Số liệu sản xuất" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="SP Trung gian" name="spTrungGian">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="Chênh lệch BTP (tự tính)">
                <InputNumber value={chenhLechBtp}
                  style={{ width: '100%', background: '#f0f9ff', fontWeight: 'bold' }} disabled />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="Dở dang ĐG (tự tính)">
                <InputNumber value={doDangDgCalc}
                  style={{ width: '100%', background: '#fff7e6', fontWeight: 'bold' }} disabled />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="TP Nhập kho" name="tpNhapKho">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="TEM ĐB" name="temDb">
                <InputNumber style={{ width: '100%' }} step={0.01} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Chi phí công đoạn" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="Công BBC1" name="bbc1_3">
                <InputNumber style={{ width: '100%' }} step={0.0001} precision={4} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="Công PC" name="pcChiPhi">
                <InputNumber style={{ width: '100%' }} step={0.0001} precision={4} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="Công PL" name="plChiPhi">
                <InputNumber style={{ width: '100%' }} step={0.0001} precision={4} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="Công ĐG" name="dgChiPhi">
                <InputNumber style={{ width: '100%' }} step={0.0001} precision={4} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="Σ Cộng (tự tính)">
                <InputNumber
                  value={parseFloat(sigmaCong)}
                  style={{ width: '100%', background: '#f0f9ff', fontWeight: 'bold' }}
                  disabled precision={4}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="SP/Công (tự tính)">
                <InputNumber
                  value={parseFloat(spCong)}
                  style={{ width: '100%', background: '#f0f9ff', fontWeight: 'bold' }}
                  disabled precision={4}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Thông tin bổ sung" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Sản lượng trung bình" name="slTrungBinh">
                <InputNumber style={{ width: '100%' }} step={0.01} precision={2} />
              </Form.Item>
            </Col>
            <Col xs={24} md={18}>
              <Form.Item label="Mô tả" name="moTa">
                <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} placeholder="Ghi chú..." />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Space>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} size="large">
            {isEdit ? 'Cập nhật' : 'Lưu mới'}
          </Button>
          <Button size="large" onClick={() => navigate('/')}>Hủy</Button>
        </Space>
      </Form>
    </>
  )
}
