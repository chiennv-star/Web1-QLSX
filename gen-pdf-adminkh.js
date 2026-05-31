const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')

const FONT      = 'C:/Windows/Fonts/ARIALUNI.ttf'
const FONT_BOLD = 'C:/Windows/Fonts/arialbd.ttf'
const OUT       = path.join(__dirname, 'ADMINKH_VaiTro_QuyenHan.pdf')

const doc = new PDFDocument({ size: 'A4', margin: 45, bufferPages: true })
doc.pipe(fs.createWriteStream(OUT))

// ── helpers ────────────────────────────────────────────────────────────────
const W = 505   // usable width

function heading1(text) {
  doc.moveDown(0.3)
  doc.font(FONT_BOLD).fontSize(16).fillColor('#1D4ED8').text(text, { align: 'center' })
  doc.moveDown(0.15)
  doc.moveTo(45, doc.y).lineTo(550, doc.y).lineWidth(1.5).strokeColor('#1D4ED8').stroke()
  doc.moveDown(0.4)
  doc.fillColor('#000000')
}

function heading2(text) {
  doc.moveDown(0.5)
  doc.font(FONT_BOLD).fontSize(13).fillColor('#1e4570')
  doc.rect(45, doc.y, W, 22).fill('#e8f0fe')
  doc.fillColor('#1e4570').text('  ' + text, 45, doc.y - 19, { width: W })
  doc.moveDown(0.8)
  doc.fillColor('#000000')
}

function bodyText(text, opts = {}) {
  doc.font(FONT).fontSize(10).fillColor('#1a1a1a').text(text, { lineGap: 3, ...opts })
}

function bullet(text, indent = 55) {
  const y = doc.y
  doc.font(FONT).fontSize(10).fillColor('#1D4ED8').text('•', 50, y, { width: 10, continued: false })
  doc.font(FONT).fontSize(10).fillColor('#1a1a1a').text(text, indent, y, { width: W - (indent - 45), lineGap: 2 })
}

function checkBullet(text, color = '#16a34a', symbol = '✓') {
  const y = doc.y
  doc.font(FONT_BOLD).fontSize(10).fillColor(color).text(symbol, 50, y, { width: 15 })
  doc.font(FONT).fontSize(10).fillColor('#1a1a1a').text(text, 68, y, { width: W - 23, lineGap: 2 })
}

function tableRow(col1, col2, col3, isHeader = false) {
  const rowH = 20
  const x1 = 45, w1 = 80
  const x2 = 130, w2 = 200
  const x3 = 335, w3 = 215

  if (doc.y + rowH > 780) doc.addPage()
  const y = doc.y

  const bg = isHeader ? '#1e4570' : (doc._tableRowAlt ? '#f0f4ff' : '#ffffff')
  doc._tableRowAlt = !doc._tableRowAlt
  doc.rect(x1, y, w1 + w2 + w3, rowH).fill(bg)

  const textColor = isHeader ? '#ffffff' : '#1a1a1a'
  const font = isHeader ? FONT_BOLD : FONT

  doc.font(font).fontSize(9.5).fillColor(textColor)
  doc.text(col1, x1 + 4, y + 5, { width: w1 - 4 })
  doc.text(col2, x2 + 4, y + 5, { width: w2 - 4 })
  doc.text(col3, x3 + 4, y + 5, { width: w3 - 4 })

  doc.rect(x1, y, w1 + w2 + w3, rowH).lineWidth(0.4).strokeColor('#c8d8f8').stroke()
  doc.y = y + rowH
}

function simpleTableRow(col1, col2, isHeader = false, w1p = 200) {
  const rowH = 22
  const x1 = 45, w1 = w1p
  const x2 = 45 + w1, w2 = W - w1

  if (doc.y + rowH > 780) doc.addPage()
  const y = doc.y

  const bg = isHeader ? '#1e4570' : (doc._tableRowAlt2 ? '#f0f4ff' : '#ffffff')
  doc._tableRowAlt2 = !doc._tableRowAlt2

  doc.rect(x1, y, W, rowH).fill(bg)

  const textColor = isHeader ? '#ffffff' : '#1a1a1a'
  const font = isHeader ? FONT_BOLD : FONT

  doc.font(font).fontSize(9.5).fillColor(textColor)
  doc.text(col1, x1 + 5, y + 6, { width: w1 - 8 })
  doc.text(col2, x2 + 5, y + 6, { width: w2 - 8 })

  doc.rect(x1, y, W, rowH).lineWidth(0.4).strokeColor('#c8d8f8').stroke()
  doc.y = y + rowH
}

// ══════════════════════════════════════════════════════════════════════════════
// COVER AREA
// ══════════════════════════════════════════════════════════════════════════════
doc.rect(0, 0, 595, 130).fill('#1e4570')
doc.font(FONT_BOLD).fontSize(22).fillColor('#66FFCC')
  .text('TÀI LIỆU VAI TRÒ VÀ QUYỀN HẠN', 45, 30, { align: 'center', width: W + 5 })
doc.font(FONT_BOLD).fontSize(14).fillColor('#ffffff')
  .text('ADMIN KẾ HOẠCH (ADMIN_KH)', 45, 62, { align: 'center', width: W + 5 })
doc.font(FONT).fontSize(10).fillColor('#a0c4e8')
  .text('Hệ thống Quản lý Sản lượng Sản xuất  •  Sơn Gắn', 45, 90, { align: 'center', width: W + 5 })
doc.moveDown(0.2)
doc.font(FONT).fontSize(9).fillColor('#7aafcc')
  .text('Ngày xuất: ' + new Date().toLocaleDateString('vi-VN'), 45, 110, { align: 'center', width: W + 5 })

doc.fillColor('#000000')
doc.y = 148

// ══════════════════════════════════════════════════════════════════════════════
// 1. MÔ TẢ VAI TRÒ
// ══════════════════════════════════════════════════════════════════════════════
heading1('1. MÔ TẢ VAI TRÒ')

bodyText('ADMIN_KH (Admin Kế hoạch) là tài khoản chuyên trách quản lý kế hoạch sản xuất, lệnh sản xuất và giám sát sản lượng. Quyền hạn tương đương ADMIN trong hầu hết các tác vụ nghiệp vụ, ngoại trừ quản lý tài khoản người dùng, chấm công và hiệu quả công việc.')
doc.moveDown(0.3)

bodyText('Điểm đặc biệt so với các role khác:', { continued: false })
doc.moveDown(0.15)
bullet('Là role DUY NHẤT cùng ADMIN được chỉnh sửa Lệnh Sản Xuất (TKSX không có quyền này).')
bullet('Có quyền duyệt / từ chối yêu cầu điều chỉnh sản lượng.')
bullet('Thấy badge đếm số bản ghi sản lượng chưa phát lệnh ngay trên menu.')

// ══════════════════════════════════════════════════════════════════════════════
// 2. MENU HIỂN THỊ
// ══════════════════════════════════════════════════════════════════════════════
heading2('2. MENU HIỂN THỊ KHI ĐĂNG NHẬP')

doc._tableRowAlt2 = false
simpleTableRow('Menu', 'Quyền truy cập', true, 200)
simpleTableRow('Sản lượng  (badge chưa phát lệnh)', 'Xem + Thêm / Sửa / Xóa', false, 200)
simpleTableRow('Sản lượng theo ngày', 'Xem thống kê', false, 200)
simpleTableRow('Lịch làm việc', 'Xem tất cả công đoạn (chỉ đọc)', false, 200)
simpleTableRow('Kế hoạch', 'Xem + Thêm / Sửa / Xóa', false, 200)
simpleTableRow('Hàng Lỗi', 'Xem + Thêm / Sửa / Xóa', false, 200)
simpleTableRow('Quản Lý Danh Mục', 'Xem + Thêm / Sửa / Xóa', false, 200)
simpleTableRow('Thông báo', 'Nhận + đánh dấu đã đọc', false, 200)
simpleTableRow('Hiệu quả công việc', '✗  Không hiển thị', false, 200)
simpleTableRow('Chấm công', '✗  Không hiển thị', false, 200)
simpleTableRow('Thùng rác', '✗  Không hiển thị', false, 200)

// ══════════════════════════════════════════════════════════════════════════════
// 3. QUYỀN CHI TIẾT
// ══════════════════════════════════════════════════════════════════════════════
heading2('3. QUYỀN CHI TIẾT TỪNG CHỨC NĂNG')

// 3.1
doc.font(FONT_BOLD).fontSize(11).fillColor('#1e4570').text('3.1  Sản lượng (Trang chủ /)', { underline: true })
doc.moveDown(0.2)
checkBullet('Xem toàn bộ danh sách sản lượng')
checkBullet('Thêm mới bản ghi sản lượng')
checkBullet('Sửa và xóa bản ghi')
checkBullet('Xuất file Excel báo cáo')
checkBullet('Thấy badge teal đếm số bản ghi chưa phát lệnh sản xuất')
doc.moveDown(0.3)

// 3.2
doc.font(FONT_BOLD).fontSize(11).fillColor('#1e4570').text('3.2  Lệnh Sản Xuất  ⭐ Đặc quyền so với TKSX', { underline: true })
doc.moveDown(0.2)
checkBullet('Tạo mới lệnh sản xuất')
checkBullet('Chỉnh sửa thông tin lệnh sản xuất')
checkBullet('Xóa lệnh sản xuất')
doc.moveDown(0.1)
doc.font(FONT).fontSize(9).fillColor('#dc2626')
  .text('  ★  TKSX không có quyền sửa lệnh sản xuất. Đây là đặc quyền riêng của ADMIN và ADMIN_KH.', 55, doc.y, { width: W - 10 })
doc.moveDown(0.4)

// 3.3
doc.font(FONT_BOLD).fontSize(11).fillColor('#1e4570').text('3.3  Kế hoạch sản xuất (/khoach)', { underline: true })
doc.moveDown(0.2)
checkBullet('Xem kế hoạch theo tuần / tháng')
checkBullet('Thêm mới kế hoạch')
checkBullet('Sửa và xóa kế hoạch')
doc.moveDown(0.3)

// 3.4
doc.font(FONT_BOLD).fontSize(11).fillColor('#1e4570').text('3.4  Duyệt điều chỉnh sản lượng', { underline: true })
doc.moveDown(0.2)
checkBullet('Xem danh sách yêu cầu điều chỉnh đang chờ duyệt')
checkBullet('Duyệt (Approve) yêu cầu điều chỉnh sản lượng')
checkBullet('Từ chối (Reject) yêu cầu điều chỉnh sản lượng')
doc.moveDown(0.3)

// 3.5
doc.font(FONT_BOLD).fontSize(11).fillColor('#1e4570').text('3.5  Hàng lỗi (/hang-loi)', { underline: true })
doc.moveDown(0.2)
checkBullet('Xem danh sách hàng lỗi')
checkBullet('Thêm mới bản ghi hàng lỗi')
checkBullet('Sửa và xóa bản ghi')
doc.moveDown(0.3)

// 3.6
doc.font(FONT_BOLD).fontSize(11).fillColor('#1e4570').text('3.6  Danh mục sản phẩm (/danh-muc)', { underline: true })
doc.moveDown(0.2)
checkBullet('Xem danh mục mã sản phẩm')
checkBullet('Thêm mới / sửa / xóa danh mục')
doc.moveDown(0.3)

// 3.7
doc.font(FONT_BOLD).fontSize(11).fillColor('#1e4570').text('3.7  Quản lý nhân sự', { underline: true })
doc.moveDown(0.2)
checkBullet('Xem toàn bộ danh sách nhân viên (không giới hạn tổ/nhóm)')
checkBullet('Thêm mới nhân viên')
checkBullet('Sửa thông tin nhân viên')
checkBullet('Xóa nhân viên')
checkBullet('Import danh sách nhân sự từ file Excel')
doc.moveDown(0.3)

// 3.8
doc.font(FONT_BOLD).fontSize(11).fillColor('#1e4570').text('3.8  Đơn hàng', { underline: true })
doc.moveDown(0.2)
checkBullet('Xem danh sách đơn hàng')
checkBullet('Thêm mới / sửa / xóa đơn hàng')
doc.moveDown(0.3)

// 3.9
doc.font(FONT_BOLD).fontSize(11).fillColor('#1e4570').text('3.9  Lịch làm việc (/work-schedule)', { underline: true })
doc.moveDown(0.2)
checkBullet('Xem tất cả công đoạn: PC, PL, DG, BBC1...')
checkBullet('Không có quyền chỉnh sửa lịch làm việc (chỉ đọc)', '#dc2626', '✗')
doc.moveDown(0.3)

// ══════════════════════════════════════════════════════════════════════════════
// 4. SO SÁNH VỚI CÁC ROLE KHÁC
// ══════════════════════════════════════════════════════════════════════════════
heading2('4. SO SÁNH QUYỀN HẠN VỚI CÁC ROLE KHÁC')

doc._tableRowAlt = false
tableRow('Chức năng', 'ADMIN', 'ADMIN_KH', true)
tableRow('ADMIN_KH', 'TKSX', 'QUAN_DOC', true)

// Re-draw with proper headers
doc.y -= 22 // remove last header, redo

doc._tableRowAlt = false
const cols = ['Chức năng', 'ADMIN', 'ADMIN_KH', 'TKSX', 'QUAN_DOC']
// 5-col table
function fiveCol(c1, c2, c3, c4, c5, isHdr = false) {
  const rowH = 21
  if (doc.y + rowH > 780) doc.addPage()
  const y = doc.y
  const bg = isHdr ? '#1e4570' : (doc._tableRowAlt5 ? '#f0f4ff' : '#ffffff')
  doc._tableRowAlt5 = !doc._tableRowAlt5
  doc.rect(45, y, W, rowH).fill(bg)
  const tc = isHdr ? '#ffffff' : '#1a1a1a'
  const fn = isHdr ? FONT_BOLD : FONT
  const ws = [155, 65, 70, 70, 70]
  const xs = [45, 205, 275, 350, 425]
  const vals = [c1, c2, c3, c4, c5]
  doc.font(fn).fontSize(9).fillColor(tc)
  vals.forEach((v, i) => doc.text(v, xs[i] + 4, y + 6, { width: ws[i] - 6 }))
  doc.rect(45, y, W, rowH).lineWidth(0.4).strokeColor('#c8d8f8').stroke()
  doc.y = y + rowH
}

fiveCol('Chức năng', 'ADMIN', 'ADMIN_KH', 'TKSX', 'QUAN_DOC', true)
fiveCol('Xem sản lượng',              '✓', '✓', '✓', '✓')
fiveCol('Thêm/Sửa sản lượng',        '✓', '✓', '✓', '✗')
fiveCol('Lệnh Sản Xuất (write)',      '✓', '✓', '✗', '✗')
fiveCol('Kế hoạch (write)',           '✓', '✓', '✓', '✗')
fiveCol('Duyệt điều chỉnh SL',       '✓', '✓', '✓', '✗')
fiveCol('Hàng lỗi (write)',           '✓', '✓', '✓', '✗')
fiveCol('Danh mục SP (write)',        '✓', '✓', '✓', '✗')
fiveCol('Nhân sự (write)',            '✓', '✓', '✓', '✗')
fiveCol('Đơn hàng (write)',           '✓', '✓', '✓', '✗')
fiveCol('Kế hoạch xưởng (write)',     '✓', '✗', '✓', '✗')
fiveCol('Lịch làm việc (sửa)',        '✓', '✗', '✓', '✗')
fiveCol('Quản lý tài khoản',         '✓', '✗', '✓', '✗')
fiveCol('Chấm công',                  '✓', '✗', '✗', '✗')
fiveCol('Hiệu quả công việc',        '✓', '✗', '✗', '✗')
fiveCol('Thùng rác',                  '✓', '✗', '✗', '✗')

// ══════════════════════════════════════════════════════════════════════════════
// 5. NHỮNG GÌ KHÔNG CÓ QUYỀN
// ══════════════════════════════════════════════════════════════════════════════
heading2('5. NHỮNG GÌ ADMIN_KH KHÔNG CÓ QUYỀN')

doc.moveDown(0.1)
checkBullet('Quản lý tài khoản người dùng (tạo / sửa / xóa user) — chỉ ADMIN và TKSX', '#dc2626', '✗')
checkBullet('Chấm công nhân viên — chỉ ADMIN', '#dc2626', '✗')
checkBullet('Xem / cập nhật Hiệu quả công việc — chỉ ADMIN', '#dc2626', '✗')
checkBullet('Tạo / sửa Kế hoạch xưởng (factory-plan) — chỉ ADMIN và TKSX', '#dc2626', '✗')
checkBullet('Sửa Lịch làm việc của bất kỳ công đoạn nào (chỉ xem được)', '#dc2626', '✗')
checkBullet('Truy cập Thùng rác — chỉ ADMIN', '#dc2626', '✗')

// ══════════════════════════════════════════════════════════════════════════════
// FOOTER
// ══════════════════════════════════════════════════════════════════════════════
const pageCount = doc.bufferedPageRange().count
for (let i = 0; i < pageCount; i++) {
  doc.switchToPage(i)
  doc.font(FONT).fontSize(8).fillColor('#94a3b8')
    .text(`Trang ${i + 1} / ${pageCount}  |  Hệ thống Quản lý Sản lượng  |  Tài liệu nội bộ`, 45, 820, { width: W, align: 'center' })
}

doc.end()
console.log('PDF saved to: ' + OUT)
