package com.sanluong.service;

import com.sanluong.dto.EmployeeDto;
import com.sanluong.dto.EmployeeSelfUpdateDto;
import com.sanluong.entity.Employee;
import com.sanluong.repository.EmployeeRepository;
import com.sanluong.repository.UserRepository;
import com.sanluong.repository.WorkEfficiencyRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.*;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.List;

@Service
public class EmployeeService {

    private final EmployeeRepository repository;
    private final WorkEfficiencyRepository workEfficiencyRepository;
    private final UserRepository userRepository;

    public EmployeeService(EmployeeRepository repository,
                           WorkEfficiencyRepository workEfficiencyRepository,
                           UserRepository userRepository) {
        this.repository = repository;
        this.workEfficiencyRepository = workEfficiencyRepository;
        this.userRepository = userRepository;
    }

    public Page<Employee> search(String search, String toNhom, String tinhTrang, String excludeTinhTrang, int page, int size) {
        List<Employee> all = repository.searchAll(
            isEmpty(search)             ? null : search,
            isEmpty(toNhom)             ? null : toNhom,
            isEmpty(tinhTrang)          ? null : tinhTrang,
            isEmpty(excludeTinhTrang)   ? null : excludeTinhTrang
        );
        int start = page * size;
        int end = Math.min(start + size, all.size());
        List<Employee> content = start < all.size() ? all.subList(start, end) : List.of();
        return new PageImpl<>(content, PageRequest.of(page, size), all.size());
    }

    public Employee patchTinhTrang(Long id, String tinhTrang, String username) {
        Employee e = getById(id);
        e.setTinhTrang(tinhTrang);
        e.setUpdatedBy(username);
        return repository.save(e);
    }

    public Employee getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên ID: " + id));
    }

    public Employee create(EmployeeDto dto, String username) {
        Employee e = toEntity(dto);
        e.setCreatedBy(username);
        e.setUpdatedBy(username);
        Employee saved = repository.save(e);
        syncToWorkEfficiency(saved, null);
        return saved;
    }

    public Employee update(Long id, EmployeeDto dto, String username) {
        Employee e = getById(id);
        String oldMaNhanVien = e.getMaNhanVien();
        applyDto(e, dto);
        e.setUpdatedBy(username);
        Employee saved = repository.save(e);
        syncToWorkEfficiency(saved, oldMaNhanVien);
        return saved;
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    public Employee updateSelf(String username, EmployeeSelfUpdateDto dto) {
        String maNhanVien = userRepository.findByUsername(username)
            .map(u -> u.getMaNhanVien())
            .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản: " + username));
        if (maNhanVien == null || maNhanVien.isBlank())
            throw new RuntimeException("Tài khoản chưa liên kết mã nhân viên");
        Employee e = repository.findByMaNhanVien(maNhanVien)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên: " + maNhanVien));
        e.setSdt(dto.getSdt());
        e.setDiaChi(dto.getDiaChi());
        e.setNgaySinh(dto.getNgaySinh());
        e.setHocVan(dto.getHocVan());
        e.setUpdatedBy(username);
        return repository.save(e);
    }

    private void syncToWorkEfficiency(Employee emp, String oldMaNhanVien) {
        String searchKey = (oldMaNhanVien != null) ? oldMaNhanVien : emp.getMaNhanVien();
        com.sanluong.entity.WorkEfficiency we =
                workEfficiencyRepository.findByMaNhanVien(searchKey)
                        .orElse(new com.sanluong.entity.WorkEfficiency());
        we.setMaNhanVien(emp.getMaNhanVien());
        we.setHoVaTen(emp.getHoVaTen());
        we.setViTri(emp.getViTri());
        workEfficiencyRepository.save(we);
    }

    private Employee toEntity(EmployeeDto dto) {
        Employee e = new Employee();
        applyDto(e, dto);
        return e;
    }

    private void applyDto(Employee e, EmployeeDto dto) {
        e.setMaNhanVien(dto.getMaNhanVien());
        e.setHoVaTen(dto.getHoVaTen());
        e.setViTri(dto.getViTri());
        e.setHocVan(dto.getHocVan());
        e.setToNhom(dto.getToNhom());
        e.setNgaySinh(dto.getNgaySinh());
        e.setThoiGianVaoCongTy(dto.getThoiGianVaoCongTy());
        e.setNgayNghiViec(dto.getNgayNghiViec());
        e.setTinhTrang(dto.getTinhTrang());
        e.setSdt(dto.getSdt());
        e.setDiaChi(dto.getDiaChi());
        e.setGhiChu(dto.getGhiChu());
    }

    private boolean isEmpty(String s) { return s == null || s.isBlank(); }

    // ─────────────────────────────────────────────────────────────────────────
    // IMPORT FROM EXCEL
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Import nhân sự từ file Excel (.xlsx / .xls).
     * - Mã NV đã tồn tại → bỏ qua (không update)
     * - Mã NV chưa có    → tạo mới với 4 trường: Mã NV, Họ Tên, Tổ/Nhóm, Vị Trí
     * Trả về { created, skipped, errors, total }
     */
    public Map<String, Object> importFromExcel(MultipartFile file, String username) throws IOException {
        int created = 0, skipped = 0;
        List<Map<String, Object>> errors = new ArrayList<>();

        try (Workbook wb = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null || isRowEmpty(row)) continue;

                String maNV   = getCellString(row, 0);
                String hoTen  = getCellString(row, 1);
                String toNhom = getCellString(row, 2);

                // Validate required
                if (isEmpty(maNV)) {
                    errors.add(errorRow(i + 1, "Thiếu Mã NV")); continue;
                }
                if (isEmpty(hoTen)) {
                    errors.add(errorRow(i + 1, "Thiếu Họ và Tên")); continue;
                }
                if (isEmpty(toNhom)) {
                    errors.add(errorRow(i + 1, "Thiếu Tổ/Nhóm")); continue;
                }

                maNV   = maNV.trim();
                hoTen  = hoTen.trim();
                toNhom = toNhom.trim();

                // Mã NV đã tồn tại → bỏ qua
                if (repository.findByMaNhanVien(maNV).isPresent()) {
                    skipped++;
                    continue;
                }

                // Tạo mới với 4 trường cơ bản
                Employee e = new Employee();
                e.setMaNhanVien(maNV);
                e.setHoVaTen(hoTen);
                e.setToNhom(toNhom);
                e.setViTri(getCellString(row, 3));
                e.setTinhTrang("Đang làm");
                e.setCreatedBy(username);
                e.setUpdatedBy(username);

                repository.save(e);
                syncToWorkEfficiency(e, null);
                created++;
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("created", created);
        result.put("skipped", skipped);
        result.put("errors",  errors);
        result.put("total",   created + skipped + errors.size());
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GENERATE TEMPLATE
    // ─────────────────────────────────────────────────────────────────────────
    public byte[] generateImportTemplate() throws IOException {
        try (XSSFWorkbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            // ── Style header ──────────────────────────────────────────────
            XSSFCellStyle headerStyle = wb.createCellStyle();
            headerStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte)30, (byte)69, (byte)112}, null));
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            XSSFFont headerFont = wb.createFont();
            headerFont.setColor(new XSSFColor(new byte[]{(byte)255,(byte)255,(byte)255}, null));
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 11);
            headerStyle.setFont(headerFont);

            XSSFCellStyle reqStyle = wb.createCellStyle();
            reqStyle.cloneStyleFrom(headerStyle);
            reqStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte)192, (byte)0, (byte)0}, null));

            XSSFCellStyle dataStyle = wb.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);
            dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            // ── Sheet DATA ────────────────────────────────────────────────
            XSSFSheet sheet = wb.createSheet("NhanSu");
            String[] headers = {
                "Mã NV (*)", "Họ và Tên (*)", "Tổ/Nhóm (*)", "Vị Trí"
            };
            int[] widths = {14, 30, 14, 18};

            // Header row
            Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(22);
            for (int c = 0; c < headers.length; c++) {
                Cell cell = headerRow.createCell(c);
                cell.setCellValue(headers[c]);
                cell.setCellStyle(c < 3 ? reqStyle : headerStyle);
                sheet.setColumnWidth(c, widths[c] * 256);
            }

            // 3 sample rows
            String[][] samples = {
                {"SA001", "Nguyễn Thị An", "PCPL1", "Nhân viên"},
                {"SA002", "Trần Văn Bình", "PCPL2", "Tổ trưởng"},
                {"SA003", "Lê Thị Cúc",   "BBC1",  "Nhân viên"},
            };
            for (int r = 0; r < samples.length; r++) {
                Row row = sheet.createRow(r + 1);
                row.setHeightInPoints(18);
                for (int c = 0; c < samples[r].length; c++) {
                    Cell cell = row.createCell(c);
                    cell.setCellValue(samples[r][c]);
                    cell.setCellStyle(dataStyle);
                }
            }

            // Dropdown: Tổ/Nhóm (col 2)
            DataValidationHelper dvHelper = sheet.getDataValidationHelper();
            DataValidationConstraint toNhomConstraint = dvHelper.createExplicitListConstraint(
                new String[]{"PCPL1", "PCPL2", "PCPL3", "BBC1", "ĐG"});
            DataValidation toNhomDv = dvHelper.createValidation(
                toNhomConstraint, new CellRangeAddressList(1, 500, 2, 2));
            toNhomDv.setShowErrorBox(true);
            sheet.addValidationData(toNhomDv);

            // Dropdown: Vị Trí (col 3)
            DataValidationConstraint vtConstraint = dvHelper.createExplicitListConstraint(
                new String[]{"Nhân viên", "Tổ trưởng", "Nhóm trưởng"});
            DataValidation vtDv = dvHelper.createValidation(
                vtConstraint, new CellRangeAddressList(1, 500, 3, 3));
            vtDv.setShowErrorBox(false);
            sheet.addValidationData(vtDv);

            // ── Sheet HUONG_DAN ───────────────────────────────────────────
            XSSFSheet guide = wb.createSheet("Hướng Dẫn");
            String[] notes = {
                "HƯỚNG DẪN IMPORT NHÂN SỰ",
                "",
                "1. Điền dữ liệu vào sheet 'NhanSu' (xem các dòng mẫu)",
                "2. Cột có (*) là bắt buộc: Mã NV, Họ và Tên, Tổ/Nhóm",
                "3. Mã NV đã tồn tại → BỎ QUA (không cập nhật)",
                "4. Mã NV chưa có   → TẠO MỚI với 4 trường: Mã NV, Họ Tên, Tổ/Nhóm, Vị Trí",
                "5. Tổ/Nhóm hợp lệ: PCPL1, PCPL2, PCPL3, BBC1, ĐG",
                "6. Vị Trí gợi ý: Nhân viên, Tổ trưởng, Nhóm trưởng (hoặc nhập tự do)",
                "7. Xóa các dòng mẫu trước khi import (hoặc để nguyên, hệ thống bỏ qua nếu trùng mã)",
            };
            for (int r = 0; r < notes.length; r++) {
                Row row = guide.createRow(r);
                Cell cell = row.createCell(0);
                cell.setCellValue(notes[r]);
                if (r == 0) {
                    XSSFCellStyle titleStyle = wb.createCellStyle();
                    XSSFFont titleFont = wb.createFont();
                    titleFont.setBold(true);
                    titleFont.setFontHeightInPoints((short) 13);
                    titleStyle.setFont(titleFont);
                    cell.setCellStyle(titleStyle);
                }
            }
            guide.setColumnWidth(0, 80 * 256);

            wb.write(out);
            return out.toByteArray();
        }
    }

    // ── Excel helpers ─────────────────────────────────────────────────────────
    private String getCellString(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    // Ô date được format trực tiếp trong Excel
                    yield DateTimeFormatter.ofPattern("dd/MM/yyyy")
                        .format(cell.getLocalDateTimeCellValue().toLocalDate());
                }
                long lv = (long) cell.getNumericCellValue();
                yield String.valueOf(lv);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try { yield cell.getStringCellValue().trim(); }
                catch (Exception ex) { yield String.valueOf((long) cell.getNumericCellValue()); }
            }
            default      -> null;
        };
    }

    private boolean isRowEmpty(Row row) {
        for (int c = 0; c <= 2; c++) {
            Cell cell = row.getCell(c, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
            if (cell != null && cell.getCellType() != CellType.BLANK) return false;
        }
        return true;
    }

    private Map<String, Object> errorRow(int row, String reason) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("row", row);
        m.put("reason", reason);
        return m;
    }
}
