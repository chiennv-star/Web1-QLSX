# CLAUDE.md — Dự án QTSX Song An

> File này được Claude tự động đọc khi mở conversation mới.
> Cập nhật khi có thay đổi kiến trúc, tính năng mới, hoặc bug quan trọng.

---

## 1. Tổng quan dự án

Hệ thống quản lý sản xuất nội bộ cho nhà máy mỹ phẩm Song An.

| Thành phần | Công nghệ |
|---|---|
| Frontend | React 18 + Vite + Ant Design 5 |
| Backend | Spring Boot 3.4.5 + Spring Security + JPA |
| Database | MySQL |
| Deploy | GitHub Actions → Docker → SSH (push master → auto-deploy) |
| Auth | JWT |

---

## 2. Cấu trúc repo

```
WEB -1/
├── sanluong-frontend/   # React app
│   └── src/
│       ├── pages/       # Các trang chính
│       ├── components/  # Component dùng chung
│       ├── context/     # AuthContext (roles, permissions)
│       └── api/         # axios instance
├── sanluong-backend/    # Spring Boot
│   └── src/main/java/com/sanluong/
│       ├── controller/
│       ├── service/
│       ├── repository/
│       ├── entity/
│       └── dto/
└── CLAUDE.md
```

---

## 3. Mapping quan trọng — congDoan / toNhom

Đây là điểm dễ gây bug nhất trong hệ thống. Dữ liệu lưu trong DB với `congDoan='PC'` cho tất cả pha chế, `toNhom` phân biệt nhóm con.

| DB congDoan | DB toNhom | Frontend key | Label hiển thị |
|---|---|---|---|
| PC | PCPL1 | `PCPL1` | PCPL1 |
| PC | PCPL2 | `PCPL2` | PCPL2 |
| PC | PCPL3 hoặc PL | `PL` | PL |
| DG | — | `DG` | ĐG |
| BBC1 | — | `BBC1` | BBC1 |
| CC | — | `CC` | CC |

**Quy tắc resolve (áp dụng ở mọi nơi aggregate):**
```javascript
if (cd === 'PC') {
  const nhom = (r.nhomThucHien || r.toNhom)?.toUpperCase()
  if (nhom === 'PCPL1') cd = 'PCPL1'
  else if (nhom === 'PCPL2') cd = 'PCPL2'
  else if (nhom === 'PCPL3' || nhom === 'PL') cd = 'PL'
  else cd = 'PCPL1'  // fallback
}
if (cd === 'PCPL3') cd = 'PL'  // catch-all
```

Backend (`WorkScheduleSessionService.java` — `getDailyReport`):
```java
if ("PC".equalsIgnoreCase(effectiveCd) && w.getToNhom() != null) {
    String tn = w.getToNhom().toUpperCase();
    if ("PCPL1".equals(tn)) effectiveCd = "PCPL1";
    else if ("PCPL2".equals(tn)) effectiveCd = "PCPL2";
    else if ("PCPL3".equals(tn) || "PL".equals(tn)) effectiveCd = "PL";
}
```

---

## 4. Nhóm nhân sự (toNhom)

```javascript
const GROUPS = ['PCPL1', 'PCPL2', 'PCPL3', 'BBC1', 'ĐG', 'KT']
```

- `PCPL3` trong nhân sự = tổ PL trong sản xuất
- `KT` = Tổ Kỹ Thuật (thêm 2026-06), không tham gia production stages
- `tinhTrang` employee: `null/'Đang làm'` | `'tam_nghi'` | `'nghi_viec'`
- Khi đếm nhân sự cho tổng hợp: luôn thêm `excludeTinhTrang: 'tam_nghi'`

---

## 5. Các trang chính

| Trang | File | Mô tả |
|---|---|---|
| Sản lượng theo ngày | `DailySanLuongPage.jsx` | Tab 1: daily, Tab 2: Tổng hợp, Tab 3: Báo cáo, Tab 4: Thống kê |
| Sản lượng tổ | `WorkSchedulePage.jsx` | Lịch sản xuất, nhập sản lượng theo ca |
| Lệnh sản xuất | `LenhSanXuatPage.jsx` | Danh mục sản phẩm + stats năm |
| Quản lý danh mục | `DanhMucPage.jsx` | Nhân sự, mã TP, phòng thực hiện |
| Kế hoạch | `KhoachPage.jsx` | Kế hoạch sản xuất theo đơn hàng |

---

## 6. API endpoints đáng chú ý

| Endpoint | Mô tả |
|---|---|
| `GET /api/lenh-san-xuat/stats-by-product?year=` | Thống kê lô/SL/ngày gần nhất/đang SX theo mã bravo |
| `GET /api/work-schedule-session/daily-report` | Dữ liệu sản lượng theo ngày (dùng cho Tổng hợp) |
| `GET /api/employees?toNhom=&excludeTinhTrang=` | Danh sách nhân sự, hỗ trợ filter tình trạng |

---

## 7. Tính năng đã triển khai

- [x] Tổng hợp sản lượng pivot table theo ngày × công đoạn
- [x] Stats columns trên trang Lệnh sản xuất (SỐ LÔ NĂM, SL NĂM, LÔ GẦN NHẤT, ĐANG SX)
- [x] Highlight hàng thiếu sản lượng (đã nhập công nhưng chưa có SL) — màu nền vàng nhạt, đẩy lên đầu
- [x] Tính năng Tạm Nghỉ cho nhân sự
- [x] Tổ Kỹ Thuật (KT) trong danh sách nhân sự
- [x] Tách bảng tăng ca

---

## 8. Bug đã fix — ghi nhớ để không lặp lại

### PCPL3/PL bị đếm nhầm vào PCPL1
- **Triệu chứng:** Tổng hợp sản lượng PL=0, PCPL1 cao bất thường
- **Nguyên nhân:** `(nhom === 'PCPL1' || nhom === 'PCPL2') ? nhom : 'PCPL1'` — fallthrough nhầm
- **Fix:** Dùng if/else chain đầy đủ, thêm `nhom === 'PL'` vì một số session lưu `nhomThucHien='PL'`
- **File:** `DailySanLuongPage.jsx` (3 chỗ), `WorkScheduleSessionService.java`

### Nhân sự Tam Nghỉ bị đếm vào tổng
- **Triệu chứng:** ĐG hiện 37 thay vì 34, tổng 98 thay vì 95
- **Nguyên nhân:** Gọi `/employees` không có `excludeTinhTrang: 'tam_nghi'`
- **Fix:** Thêm param vào fetch ở `DailySanLuongPage.jsx` line ~1381
- **Giá trị đúng:** `'tam_nghi'` (lowercase underscore, không phải 'Tạm nghỉ')

### Promise.all làm hỏng toàn bộ fetch khi 1 API lỗi
- **Triệu chứng:** "Không thể tải danh mục sản phẩm" khi backend chưa có endpoint mới
- **Fix:** Dùng `Promise.allSettled`, chỉ fail khi API chính reject
- **File:** `LenhSanXuatPage.jsx`

---

## 9. TODO / Tác vụ theo dõi

> Cập nhật phần này khi có yêu cầu mới hoặc hoàn thành

- [ ] _(để trống — bổ sung khi có)_

---

## 10. Quy tắc làm việc

- **Commit:** Chỉ commit local, **chờ user xác nhận** mới push (trừ khi user nói "tự động push")
- **CI/CD:** Kiểm tra Dockerfile/CI config trước khi push nếu có thay đổi infrastructure
- **Deploy:** Push lên `master` → GitHub Actions tự build Docker → deploy qua SSH (~5 phút)
