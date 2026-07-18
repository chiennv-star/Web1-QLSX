export const PHAN_LOAI_OPTIONS = [
  { value: 'Thẩm định / Hiệu chuẩn', color: '#0F5A61' },
  { value: 'Sửa chữa sự cố',         color: '#AE421B' },
  { value: 'Bảo dưỡng / Vệ sinh',    color: '#4E7C6E' },
  { value: 'Lắp đặt / Cải tạo',      color: '#8A6D3B' },
  { value: 'Quy trình / Đào tạo',    color: '#5C6E86' },
  { value: 'Hỗ trợ sản xuất',        color: '#CF8319' },
  { value: 'Khác',                   color: '#8A9299' },
]

export const MUC_DO_OPTIONS = [
  { value: 'Thấp',        color: 'green' },
  { value: 'Trung bình',  color: 'gold' },
  { value: 'Cao',         color: 'red' },
]

export const TRANG_THAI_OPTIONS = [
  { value: 'Chưa cập nhật', color: 'default' },
  { value: 'Đang xử lý',    color: 'processing' },
  { value: 'Đã xử lý',      color: 'success' },
  { value: 'Đã đóng',       color: 'blue' },
]

export const phanLoaiColor = (val) =>
  (PHAN_LOAI_OPTIONS.find(o => o.value === val) || {}).color || '#8A9299'

export const mucDoColor = (val) =>
  (MUC_DO_OPTIONS.find(o => o.value === val) || {}).color || 'default'

export const trangThaiColor = (val) =>
  (TRANG_THAI_OPTIONS.find(o => o.value === val) || {}).color || 'default'
