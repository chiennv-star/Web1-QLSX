import { useState } from 'react'
import { Input, Button, InputNumber, DatePicker, Select, Tag, Spin } from 'antd'
import { ArrowLeftOutlined, CloseOutlined, SearchOutlined } from '@ant-design/icons'

// Luồng "Nhập kho nhanh" tối ưu 1 tay cho điện thoại — thay thế phần hiển thị của
// AddNhapKhoModal khi màn hình hẹp. Toàn bộ logic tìm SP / tải lô / lưu vẫn nằm ở
// AddNhapKhoModal, component này chỉ nhận state + handler qua props và vẽ 3 màn hình.
export default function NhapKhoQuickEntryMobile({
  step, onBack, onCancel,
  searchVal, setSearchVal, options, searching, onSearch, onSelectProduct,
  recentProducts, onPickRecent,
  selProduct,
  lots, lotsLoading, onSelectLot,
  selected,
  slNK, setSlNK, ngayXuat, setNgayXuat, tinhTrang, setTinhTrang, tenNth, setTenNth, ghiChu, setGhiChu,
  saving, onSave,
  TINH_TRANG_NK_OPTIONS,
}) {
  const [showDate, setShowDate] = useState(false)
  const [showMore, setShowMore] = useState(false)

  const stepTitle = step === 'search' ? 'Tìm sản phẩm' : step === 'lot' ? 'Chọn số lô' : 'Nhập số lượng'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '72vh' }}>
      {/* Header: back / tiêu đề / đóng */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
        {step !== 'search'
          ? <Button type="text" size="large" icon={<ArrowLeftOutlined />} onClick={onBack} />
          : <span style={{ width: 40 }} />}
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 16 }}>{stepTitle}</div>
        <Button type="text" size="large" icon={<CloseOutlined />} onClick={onCancel} />
      </div>

      {/* ── Bước 1: Tìm sản phẩm ── */}
      {step === 'search' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Input
            size="large" autoFocus allowClear
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Mã Bravo hoặc Tên sản phẩm..."
            value={searchVal}
            onChange={e => { setSearchVal(e.target.value); onSearch(e.target.value) }}
            style={{ marginBottom: 16 }}
          />

          {searching && <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>}

          {!searching && searchVal && options.length === 0 && (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>Không tìm thấy sản phẩm</div>
          )}

          {!searching && options.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {options.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => onSelectProduct(opt.record)}
                  style={{ padding: '13px 14px', border: '1px solid #e5e7eb', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                >
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>{opt.record.maBravo}</span>
                  <Tag style={{ marginRight: 0 }}>{opt.record.maTp}</Tag>
                  <span style={{ flex: 1, fontSize: 13, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {opt.record.tienTrinh}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!searchVal && recentProducts.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, margin: '4px 0 8px' }}>
                Gần đây
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentProducts.map(p => (
                  <div
                    key={p.maBravo}
                    onClick={() => onPickRecent(p)}
                    style={{ padding: '13px 14px', border: '1px dashed #d1d5db', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                  >
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>{p.maBravo}</span>
                    <span style={{ flex: 1, fontSize: 13, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.tienTrinh}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Bước 2: Chọn số lô ── */}
      {step === 'lot' && (
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 14, fontSize: 13, color: '#6b7280' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>{selProduct?.maBravo}</span>
            {' · '}{selProduct?.tienTrinh}
          </div>
          {lotsLoading ? (
            <div style={{ textAlign: 'center', padding: 30 }}><Spin /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lots.map(r => {
                const total = r.tpNhapKho || 0
                const conLai = (r.soLuong || 0) - total
                const done = r.soLuong != null && total >= r.soLuong
                return (
                  <div
                    key={r.id}
                    onClick={() => onSelectLot(r)}
                    style={{
                      padding: '14px', borderRadius: 10, cursor: 'pointer',
                      border: done ? '1px solid #e5e7eb' : '1px solid #bae6fd',
                      background: done ? '#fafafa' : '#f0f9ff', opacity: done ? 0.65 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>Lô {r.lsx}</span>
                      {done
                        ? <Tag color="success" style={{ marginRight: 0 }}>Đã đủ ✓</Tag>
                        : <span style={{ color: '#0369a1', fontWeight: 700 }}>còn {conLai.toLocaleString('vi-VN')}</span>}
                    </div>
                  </div>
                )
              })}
              {lots.length === 0 && <div style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>Không có lô nào</div>}
            </div>
          )}
        </div>
      )}

      {/* ── Bước 3: Nhập số lượng ── */}
      {step === 'qty' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 16, fontSize: 13, color: '#6b7280' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>{selected?.maBravo}</span>
            {' · Lô '}{selected?.lsx}
          </div>

          <InputNumber
            size="large" autoFocus min={0} step={1} controls={false}
            inputMode="numeric"
            value={slNK} onChange={setSlNK}
            formatter={val => val != null && val !== '' ? Number(val).toLocaleString('vi-VN') : ''}
            parser={val => val ? val.replace(/[^\d]/g, '') : ''}
            placeholder="0"
            style={{ width: '100%', fontSize: 34, fontWeight: 700, textAlign: 'center', height: 64, marginBottom: 16 }}
          />

          <div onClick={() => setShowDate(v => !v)} style={{ marginBottom: 12, fontSize: 13, color: '#6b7280', cursor: 'pointer' }}>
            📅 {ngayXuat ? ngayXuat.format('DD/MM/YYYY') : 'Hôm nay'} <span style={{ textDecoration: 'underline' }}>· đổi ngày</span>
          </div>
          {showDate && (
            <DatePicker
              style={{ width: '100%', marginBottom: 12 }} format="DD/MM/YYYY"
              value={ngayXuat} onChange={setNgayXuat} placeholder="Chọn ngày"
            />
          )}

          <div onClick={() => setShowMore(v => !v)} style={{ marginBottom: 12, fontSize: 13, color: '#1677ff', cursor: 'pointer', fontWeight: 600 }}>
            {showMore ? '− Ẩn chi tiết' : '+ Thêm chi tiết (tuỳ chọn)'}
          </div>
          {showMore && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <Select
                size="large" style={{ width: '100%' }} value={tinhTrang} onChange={setTinhTrang}
                placeholder="Tình trạng" allowClear
                options={TINH_TRANG_NK_OPTIONS.map(o => ({ value: o, label: o }))}
              />
              <Input
                size="large" value={tenNth} onChange={e => setTenNth(e.target.value)}
                placeholder="Tên người thực hiện"
              />
              <Input.TextArea
                rows={2} value={ghiChu} onChange={e => setGhiChu(e.target.value)}
                placeholder="Ghi chú thêm nếu cần..."
              />
            </div>
          )}

          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            <Button type="primary" size="large" block loading={saving} disabled={slNK == null} onClick={onSave}>
              ✓ Lưu
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
