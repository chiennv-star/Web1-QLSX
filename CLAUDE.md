# CLAUDE.md — Dự án QTSX Song An

> File này được Claude tự động đọc khi mở conversation mới.
> Cập nhật khi có thay đổi kiến trúc, tính năng mới, hoặc bug quan trọng.

---

## 1. Tổng quan dự án

Hệ thống quản lý sản xuất nội bộ cho nhà máy mỹ phẩm Song An.

| Thành phần | Công nghệ |
|---|---|
| Frontend | React 18 + Vite + Ant Design 5 |
| Backend | Spring Boot 3.4.5 + Spring Security + JPA (Java 25) |
| Database | MySQL 8 (utf8mb4) |
| Deploy | GitHub Actions → Docker (ghcr.io) → SSH (push `master` → auto-deploy) |
| Auth | JWT (stateless) |

---

## 2. Cấu trúc repo

```
WEB -1/
├── sanluong-frontend/   # React app
│   └── src/
│       ├── pages/       # Các trang chính (routes trong App.jsx)
│       ├── components/  # Component dùng chung
│       ├── context/     # AuthContext (roles, permissions)
│       ├── hooks/
│       └── api/         # axios instance (baseURL '/api')
├── sanluong-backend/    # Spring Boot
│   └── src/main/java/com/sanluong/
│       ├── controller/
│       ├── service/
│       ├── repository/
│       ├── entity/
│       ├── config/      # SecurityConfig (JWT, CORS, RBAC theo endpoint)
│       ├── security/    # JwtFilter
│       └── dto/
├── docker-compose.yml   # mysql + backend + frontend (dùng khi deploy, không dùng khi dev local)
└── CLAUDE.md
```

---

## 3. Lệnh chạy dự án

**Không có test suite** (không có `sanluong-backend/src/test`, không có script `test`/`lint` trong `package.json`) — đừng cố tìm hoặc chạy lệnh test/lint, chúng không tồn tại.

### Backend (chạy trước, cổng 8080)
```bash
cd sanluong-backend
cp src/main/resources/application.properties.example src/main/resources/application.properties  # lần đầu, rồi sửa DB creds nếu cần
mvn spring-boot:run          # chạy dev
mvn clean package            # build jar
```
- Cần MySQL chạy sẵn tại `localhost:3306`, db `sanluong` (user/pass mặc định `root`/`root`, xem `application.properties`).
- `spring.jpa.hibernate.ddl-auto=update` — schema tự đồng bộ từ entity, không có migration file (Flyway/Liquibase).
- Yêu cầu JDK 25 (`java.version` trong `pom.xml`).

### Frontend (chạy sau, cổng 5173)
```bash
cd sanluong-frontend
npm install
npm run dev       # vite --host, có proxy /api, /uploads, /ws → http://localhost:8080 (xem vite.config.js)
npm run build
npm run preview
```

### Docker (mô phỏng production, không cần cho dev thường ngày)
```bash
docker-compose up -d   # mysql (port 3307), backend (8080), frontend (80) — pull image từ ghcr.io/chiennv-star
```

---

## 4. Mapping quan trọng — congDoan / toNhom

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
Mọi nơi aggregate theo tổ (Tổng hợp sản lượng, Dashboard Giám Đốc, Phân tích...) đều phải áp dụng lại quy tắc resolve này — copy/paste giữa các trang, không có hàm dùng chung, nên khi sửa 1 chỗ phải rà lại các chỗ khác (`DailySanLuongPage.jsx`, `DirectorDashboardPage.jsx`, `WorkScheduleSessionService.java`).

`work_schedule_session.cong_thuc_hien` = số công (thường ≤ 1.0/người/ca) của **từng người** trong 1 buổi; `getDailyReport` group theo `(workScheduleId, ngay)` rồi **SUM** toàn bộ `cong_thuc_hien` của nhóm. Một dòng nhập sai (VD số bị gõ nhầm gấp hàng nghìn lần) sẽ kéo lệch `%CÔNG` của cả tổ trong mọi báo cáo tổng hợp — khi thấy `%CÔNG` một tổ bất thường so với `%SL`, nghi ngờ đầu tiên là 1 session có `cong_thuc_hien` outlier, không phải lỗi công thức.

---

## 5. Nhóm nhân sự (toNhom)

```javascript
const GROUPS = ['PCPL1', 'PCPL2', 'PCPL3', 'BBC1', 'ĐG', 'KT']
```

- `PCPL3` trong nhân sự = tổ PL trong sản xuất
- `KT` = Tổ Kỹ Thuật (thêm 2026-06), không tham gia production stages
- `tinhTrang` employee: `null/'Đang làm'` | `'tam_nghi'` | `'nghi_viec'`
- Khi đếm nhân sự cho tổng hợp: luôn thêm `excludeTinhTrang: 'tam_nghi'`

---

## 6. Phân quyền theo Role (RBAC)

Danh sách role đầy đủ nằm ở `SecurityConfig.java` (`ALL_ROLES`): `ADMIN, TKSX, TPSX, ADMIN_KH, QUAN_DOC, GD, MAN_HINH, HCNS, KE_TOAN, NHAN_VIEN` (+ biến thể `NHAN_VIEN_PCPL1/2/3/BBC1/DG`), và stage-admin `ADMIN_PC/PCPL1/PCPL2/PCPL3/PL/BBC1/DG`.

Phân quyền được enforce ở **3 lớp độc lập, phải sửa đồng bộ cả 3** khi thêm role/route mới:
1. **Backend** `SecurityConfig.java` — `authorizeHttpRequests` + `hasAnyRole(...)` theo từng endpoint (chặn thật, nguồn sự thật).
2. **Frontend routing** `App.jsx` — `<PrivateRoute allowedRoles={[...]}>` quanh từng `<Route>` (chặn điều hướng).
3. **Frontend logic** `context/AuthContext.jsx` — tập hợp hàm helper (`isAdmin`, `canEditXxx`, `getAllowedStages`, `getAllowedEmployeeGroups`, `getLockedCongDoan`, `allowedEfficiencyTabs`...) quyết định ẩn/hiện nút, tab, cột, và lọc dữ liệu theo `toNhom`/`congDoan` được phép xem.

Vài quy tắc hay bị quên:
- `QUAN_DOC` = chỉ đọc **toàn hệ thống** (backend chỉ cho GET, không có quyền write) — role xem tổng hợp cho quản lý cấp cao, gần như thấy hết tab nhưng không sửa được gì.
- Stage-admin (`ADMIN_PCPL1`, `ADMIN_DG`, `ADMIN_BBC1`...) chỉ thấy/sửa được đúng tổ của mình — dùng `getAllowedStages()` / `getLockedCongDoan()` để lọc, không hardcode role check rải rác trong page.
- `TKSX` gần như tương đương `ADMIN` trừ quyền ghi ở Lệnh Sản Xuất.
- Khi thêm 1 trang/route mới cần hạn chế quyền: thêm `allowedRoles` ở `App.jsx`, thêm `hasAnyRole` tương ứng ở `SecurityConfig.java`, và nếu cần lọc dữ liệu con thì thêm helper trong `AuthContext.jsx`.

---

## 7. Các trang chính

| Trang | File | Mô tả |
|---|---|---|
| Sản lượng theo ngày | `DailySanLuongPage.jsx` | Tab 1: daily, Tab 2: Tổng hợp, Tab 3: Báo cáo, Tab 4: Thống kê |
| Sản lượng tổ | `WorkSchedulePage.jsx` | Lịch sản xuất, nhập sản lượng theo ca |
| Lệnh sản xuất | `LenhSanXuatPage.jsx` | Danh mục sản phẩm + stats năm |
| Quản lý danh mục | `DanhMucPage.jsx` | Nhân sự, mã TP, phòng thực hiện |
| Kế hoạch | `KhoachPage.jsx` | Kế hoạch sản xuất theo đơn hàng |
| Dashboard Giám Đốc | `DirectorDashboardPage.jsx` | Tổng quan/Phòng đang dùng/Phòng Kế Hoạch — aggregate lại theo `resolveGdCd` riêng, xem mục 4 |
| Kho | `KhoPage.jsx`, `NhapKhoQuickEntryMobile.jsx` | Nhập kho, có luồng nhập nhanh tối ưu mobile |
| Chấm công | `ChamCongPage.jsx` | Công ra vào giờ, tách riêng bảng tăng ca |
| Kỹ thuật – Công nghệ | `KyThuatCongNghePage.jsx` + các `KyThuat*Tab.jsx` | Bảo trì, cơ điện, kaizen, thợ việc |

---

## 8. API endpoints đáng chú ý

| Endpoint | Mô tả |
|---|---|
| `GET /api/lenh-san-xuat/stats-by-product?year=` | Thống kê lô/SL/ngày gần nhất/đang SX theo mã bravo |
| `GET /api/work-schedule-session/daily-report` | Dữ liệu sản lượng theo ngày (dùng cho hầu hết các trang tổng hợp/dashboard, xem mục 4) |
| `GET /api/employees?toNhom=&excludeTinhTrang=` | Danh sách nhân sự, hỗ trợ filter tình trạng |

---

## 9. Tính năng đã triển khai

- [x] Tổng hợp sản lượng pivot table theo ngày × công đoạn
- [x] Stats columns trên trang Lệnh sản xuất (SỐ LÔ NĂM, SL NĂM, LÔ GẦN NHẤT, ĐANG SX)
- [x] Highlight hàng thiếu sản lượng (đã nhập công nhưng chưa có SL) — màu nền vàng nhạt, đẩy lên đầu
- [x] Tính năng Tạm Nghỉ cho nhân sự
- [x] Tổ Kỹ Thuật (KT) trong danh sách nhân sự
- [x] Tách bảng tăng ca
- [x] Dashboard Giám Đốc (tổng quan sản xuất, phòng đang dùng, phòng kế hoạch)
- [x] Luồng Nhập Kho nhanh tối ưu di động
- [x] Đồng bộ 1 chiều Nhập Kho → Sản lượng tổ/Sản lượng (khóa sửa tay SL Nhập Kho)
- [x] Role `QUAN_DOC`: cấp quyền xem toàn bộ tab (chỉ đọc)

---

## 10. Bug đã fix — ghi nhớ để không lặp lại

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

## 11. TODO / Tác vụ theo dõi

> Cập nhật phần này khi có yêu cầu mới hoặc hoàn thành

- [ ] **Chưa xong:** Dashboard Giám Đốc hiển thị `%CÔNG` của ĐG bất thường cao (~76% trong khi `%SL` chỉ ~27%) do 1 session `work_schedule_session` (id=7798, NV HD008, lô TP463/080726.M2) có `cong_thuc_hien=2552.1250` — sai gấp hàng nghìn lần so với các session khác (~0.01–0.99). Đã xác nhận là lỗi nhập liệu, chưa xác nhận đã sửa trên đúng môi trường (user báo "đã sửa" nhưng DB local kiểm tra lại vẫn thấy giá trị cũ) — cần verify lại trước khi đóng.

---

## 12. Quy tắc làm việc

- **Commit:** Chỉ commit local, **chờ user xác nhận** mới push (trừ khi user nói "tự động push")
- **CI/CD:** Kiểm tra Dockerfile/CI config trước khi push nếu có thay đổi infrastructure
- **Deploy:** Push lên `master` → GitHub Actions tự build Docker → deploy qua SSH (~5 phút)
