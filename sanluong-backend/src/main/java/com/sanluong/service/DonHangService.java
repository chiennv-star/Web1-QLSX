package com.sanluong.service;

import com.sanluong.dto.DonHangDto;
import com.sanluong.dto.DonHangFieldHistoryDto;
import com.sanluong.dto.DonHangSlHistoryDto;
import com.sanluong.entity.DonHang;
import com.sanluong.entity.DonHangFieldHistory;
import com.sanluong.entity.DonHangSlHistory;
import com.sanluong.repository.DonHangFieldHistoryRepository;
import com.sanluong.repository.DonHangRepository;
import com.sanluong.repository.DonHangSlHistoryRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DonHangService {

    private static final Set<String> LOCKABLE_FIELDS = Set.of("maBravo", "maSp", "tenSanPham", "maDonHang");

    private final DonHangRepository repo;
    private final DonHangSlHistoryRepository historyRepo;
    private final DonHangFieldHistoryRepository fieldHistoryRepo;
    private final NotificationService notificationService;

    public DonHangService(DonHangRepository repo,
                          DonHangSlHistoryRepository historyRepo,
                          DonHangFieldHistoryRepository fieldHistoryRepo,
                          NotificationService notificationService) {
        this.repo = repo;
        this.historyRepo = historyRepo;
        this.fieldHistoryRepo = fieldHistoryRepo;
        this.notificationService = notificationService;
    }

    public List<DonHangDto> findAll(String tinhTrangDatHang, String tinhTrangSx) {
        List<DonHang> list = (tinhTrangDatHang == null && tinhTrangSx == null)
                ? repo.findAllActive()
                : repo.findFiltered(tinhTrangDatHang, tinhTrangSx);
        return list.stream().map(this::toDto).collect(Collectors.toList());
    }

    public DonHangDto create(DonHangDto dto, String username) {
        DonHang e = new DonHang();
        applyDto(e, dto);
        if (e.getThuTu() == null) {
            Integer max = repo.findMaxThuTu();
            e.setThuTu((max == null ? 0 : max) + 1);
        }
        e.setTrangThaiDuyet("APPROVED");
        e.setCreatedBy(username);
        e.setUpdatedBy(username);
        DonHang saved = repo.save(e);
        notificationService.createDonHangNewNotification(
                saved.getId(), saved.getMaDonHang(), saved.getTenSanPham(),
                saved.getSoLuongDatHang(), username);
        return toDto(saved);
    }

    public List<DonHangDto> findPending() {
        return repo.findAllPending().stream().map(this::toDto).collect(Collectors.toList());
    }


    public DonHangDto approve(Long id, String username) {
        DonHang e = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng: " + id));
        e.setTrangThaiDuyet("APPROVED");
        e.setUpdatedBy(username);
        return toDto(repo.save(e));
    }

    public void reject(Long id, String lyDo, String username) {
        DonHang e = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng: " + id));
        e.setTrangThaiDuyet("REJECTED");
        e.setGhiChu((lyDo != null && !lyDo.isBlank() ? "[Từ chối: " + lyDo + "] " : "[Từ chối] ")
                + (e.getGhiChu() != null ? e.getGhiChu() : ""));
        e.setDeletedAt(LocalDateTime.now());
        e.setDeletedBy(username);
        e.setUpdatedBy(username);
        repo.save(e);
    }

    public DonHangDto update(Long id, DonHangDto dto, String username) {
        DonHang e = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng: " + id));
        applyDto(e, dto);
        e.setUpdatedBy(username);
        return toDto(repo.save(e));
    }

    public void delete(Long id, String username) {
        DonHang e = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng: " + id));
        e.setDeletedAt(LocalDateTime.now());
        e.setDeletedBy(username);
        repo.save(e);
    }

    public List<DonHangDto> findTrash() {
        return repo.findAllDeleted().stream().map(this::toDto).collect(Collectors.toList());
    }

    public DonHangDto restore(Long id, String username) {
        DonHang e = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng: " + id));
        e.setDeletedAt(null);
        e.setDeletedBy(null);
        e.setUpdatedBy(username);
        return toDto(repo.save(e));
    }

    public void deletePermanent(Long id) {
        repo.deleteById(id);
    }

    /** Đổi SL Đặt Hàng với lưu lịch sử */
    public DonHangDto doiSoLuong(Long id, java.math.BigDecimal slMoi, String lyDo, String username) {
        DonHang e = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng: " + id));
        DonHangSlHistory hist = new DonHangSlHistory();
        hist.setDonHangId(id);
        hist.setSlCu(e.getSoLuongDatHang());
        hist.setSlMoi(slMoi);
        hist.setLyDo(lyDo);
        hist.setChangedBy(username);
        hist.setChangedAt(LocalDateTime.now());
        historyRepo.save(hist);
        e.setSoLuongDatHang(slMoi);
        e.setUpdatedBy(username);
        return toDto(repo.save(e));
    }

    /** Lấy lịch sử đổi SL Đặt Hàng của một đơn hàng */
    public List<DonHangSlHistoryDto> getLichSuDoiSoLuong(Long id) {
        return historyRepo.findByDonHangIdOrderByChangedAtDesc(id)
                .stream().map(h -> {
                    DonHangSlHistoryDto d = new DonHangSlHistoryDto();
                    d.setId(h.getId());
                    d.setDonHangId(h.getDonHangId());
                    d.setSlCu(h.getSlCu());
                    d.setSlMoi(h.getSlMoi());
                    d.setLyDo(h.getLyDo());
                    d.setChangedBy(h.getChangedBy());
                    d.setChangedAt(h.getChangedAt());
                    return d;
                }).collect(Collectors.toList());
    }

    /** Sync soLuongDaXepKh từ work_schedule (PLAN) cho tất cả đơn hàng theo composite key maBravo+maDonHang */
    public int syncFromKhoach() {
        List<DonHang> list = repo.findAllActive();
        int updated = 0;
        for (DonHang e : list) {
            if (e.getMaBravo() == null || e.getMaDonHang() == null) continue;
            BigDecimal sumKh = repo.sumCoLoByMaBravoAndMaDonHang(e.getMaBravo(), e.getMaDonHang());
            if (sumKh == null) sumKh = BigDecimal.ZERO;
            java.time.LocalDate earliest = repo.findEarliestNgayThucHien(e.getMaBravo(), e.getMaDonHang());
            BigDecimal slDat = e.getSoLuongDatHang() != null ? e.getSoLuongDatHang() : BigDecimal.ZERO;
            String newSx;
            if (sumKh.compareTo(BigDecimal.ZERO) <= 0) newSx = null;
            else if (sumKh.compareTo(slDat) >= 0)      newSx = "done";
            else                                         newSx = "doing";
            e.setSoLuongDaXepKh(sumKh);
            e.setNgayPhatLenh(earliest);
            e.setTinhTrangSx(newSx);
            repo.save(e);
            updated++;
        }
        return updated;
    }

    /**
     * Cập nhật soLuongDaXepKh, ngayPhatLenh, tinhTrangSx cho một đơn hàng
     * dựa trên tổng coLo và ngày sớm nhất từ work_schedule PLAN.
     */
    public DonHangDto syncFromKhoachFor(String maBravo, String maDonHang, String username) {
        DonHang e = repo.findByMaBravoAndMaDonHang(maBravo, maDonHang)
                .orElse(null);
        if (e == null) return null;

        BigDecimal sumKh = repo.sumCoLoByMaBravoAndMaDonHang(maBravo, maDonHang);
        if (sumKh == null) sumKh = BigDecimal.ZERO;

        java.time.LocalDate earliest = repo.findEarliestNgayThucHien(maBravo, maDonHang);

        BigDecimal slDat = e.getSoLuongDatHang() != null ? e.getSoLuongDatHang() : BigDecimal.ZERO;
        String newSx;
        if (sumKh.compareTo(BigDecimal.ZERO) <= 0) newSx = null;
        else if (sumKh.compareTo(slDat) >= 0)      newSx = "done";
        else                                         newSx = "doing";

        e.setSoLuongDaXepKh(sumKh);
        e.setNgayPhatLenh(earliest);
        e.setTinhTrangSx(newSx);
        e.setUpdatedBy(username);
        return toDto(repo.save(e));
    }

    /** Chỉnh sửa một field khoá (maBravo/maSp/tenSanPham/maDonHang) và lưu lịch sử */
    public DonHangDto doiField(Long id, String fieldName, String newValue, String lyDo, String username) {
        if (!LOCKABLE_FIELDS.contains(fieldName))
            throw new IllegalArgumentException("Field không được phép chỉnh sửa: " + fieldName);
        DonHang e = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng: " + id));
        String oldValue = switch (fieldName) {
            case "maBravo"    -> e.getMaBravo();
            case "maSp"       -> e.getMaSp();
            case "tenSanPham" -> e.getTenSanPham();
            case "maDonHang"  -> e.getMaDonHang();
            default           -> null;
        };
        DonHangFieldHistory hist = new DonHangFieldHistory();
        hist.setDonHangId(id);
        hist.setFieldName(fieldName);
        hist.setOldValue(oldValue);
        hist.setNewValue(newValue);
        hist.setLyDo(lyDo);
        hist.setChangedBy(username);
        hist.setChangedAt(LocalDateTime.now());
        fieldHistoryRepo.save(hist);
        switch (fieldName) {
            case "maBravo"    -> e.setMaBravo(newValue);
            case "maSp"       -> e.setMaSp(newValue);
            case "tenSanPham" -> e.setTenSanPham(newValue);
            case "maDonHang"  -> e.setMaDonHang(newValue);
        }
        e.setUpdatedBy(username);
        return toDto(repo.save(e));
    }

    /** Lấy lịch sử chỉnh sửa của một field cụ thể */
    public List<DonHangFieldHistoryDto> getFieldHistory(Long id, String fieldName) {
        List<DonHangFieldHistory> list = (fieldName != null && !fieldName.isBlank())
                ? fieldHistoryRepo.findByDonHangIdAndFieldNameOrderByChangedAtDesc(id, fieldName)
                : fieldHistoryRepo.findByDonHangIdOrderByChangedAtDesc(id);
        return list.stream().map(h -> {
            DonHangFieldHistoryDto d = new DonHangFieldHistoryDto();
            d.setId(h.getId());
            d.setDonHangId(h.getDonHangId());
            d.setFieldName(h.getFieldName());
            d.setOldValue(h.getOldValue());
            d.setNewValue(h.getNewValue());
            d.setLyDo(h.getLyDo());
            d.setChangedBy(h.getChangedBy());
            d.setChangedAt(h.getChangedAt());
            return d;
        }).collect(Collectors.toList());
    }

    // ── Import từ Excel ───────────────────────────────────────────────────────
    public Map<String, Object> importFromExcel(MultipartFile file, String username) throws Exception {
        int imported = 0, skipped = 0;
        List<String> errors = new ArrayList<>();

        try (Workbook wb = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) throw new RuntimeException("File không có dữ liệu hoặc thiếu dòng tiêu đề");

            // Xây bản đồ cột: tên chuẩn → index
            Map<String, Integer> colMap = new HashMap<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell c = headerRow.getCell(i);
                if (c == null) continue;
                String h = normalizeHeader(getCellAsString(c));
                if (h.contains("bravo"))                                    colMap.put("maBravo", i);
                else if (h.contains("masp") || h.contains("matp"))         colMap.put("maSp", i);
                else if (h.contains("sanpham") || h.contains("tientrinh")) colMap.put("tenSanPham", i);
                else if (h.contains("donhang"))                             colMap.put("maDonHang", i);
                else if (h.contains("ngay"))                                colMap.put("ngayDatHang", i);
                else if (h.contains("soluong"))                             colMap.put("soLuong", i);
            }

            for (int rowIdx = 1; rowIdx <= sheet.getLastRowNum(); rowIdx++) {
                Row row = sheet.getRow(rowIdx);
                if (row == null) continue;

                String maBravo = getCellStringVal(row, colMap.get("maBravo"));
                if (maBravo == null || maBravo.isBlank()) continue;

                String maDonHang   = getCellStringVal(row, colMap.get("maDonHang"));
                BigDecimal soLuong = parseCellNumeric(row, colMap.get("soLuong"));

                // Bỏ qua khi mã Bravo + mã ĐH + số lượng đã tồn tại
                if (maDonHang != null && soLuong != null &&
                    repo.existsByMaBravoAndMaDonHangAndSoLuongDatHangAndDeletedAtIsNull(maBravo, maDonHang, soLuong)) {
                    skipped++;
                    continue;
                }

                try {
                    DonHang e = new DonHang();
                    e.setMaBravo(maBravo);
                    e.setMaSp(getCellStringVal(row, colMap.get("maSp")));
                    e.setTenSanPham(getCellStringVal(row, colMap.get("tenSanPham")));
                    e.setMaDonHang(maDonHang);
                    e.setNgayDatHang(parseCellDate(row, colMap.get("ngayDatHang")));
                    e.setSoLuongDatHang(soLuong);
                    Integer max = repo.findMaxThuTu();
                    e.setThuTu((max == null ? 0 : max) + 1);
                    e.setCreatedBy(username);
                    e.setUpdatedBy(username);
                    repo.save(e);
                    imported++;
                } catch (Exception ex) {
                    errors.add("Dòng " + (rowIdx + 1) + ": " + ex.getMessage());
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("imported", imported);
        result.put("skipped", skipped);
        result.put("errors", errors);
        return result;
    }

    private String normalizeHeader(String s) {
        if (s == null) return "";
        String lower = s.toLowerCase().replace("đ", "d");
        String nfd = Normalizer.normalize(lower, Normalizer.Form.NFD);
        return nfd.replaceAll("[^a-z0-9]", "");
    }

    private String getCellAsString(Cell c) {
        if (c == null) return null;
        return switch (c.getCellType()) {
            case STRING  -> c.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((long) c.getNumericCellValue());
            case BOOLEAN -> String.valueOf(c.getBooleanCellValue());
            default      -> null;
        };
    }

    private String getCellStringVal(Row row, Integer idx) {
        if (idx == null) return null;
        Cell c = row.getCell(idx);
        return getCellAsString(c);
    }

    private LocalDate parseCellDate(Row row, Integer idx) {
        if (idx == null) return null;
        Cell c = row.getCell(idx);
        if (c == null) return null;
        if (c.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(c))
            return c.getLocalDateTimeCellValue().toLocalDate();
        String s = getCellAsString(c);
        if (s == null || s.isBlank()) return null;
        try { return LocalDate.parse(s, DateTimeFormatter.ofPattern("dd/MM/yyyy")); }
        catch (Exception e) {
            try { return LocalDate.parse(s); } catch (Exception e2) { return null; }
        }
    }

    private BigDecimal parseCellNumeric(Row row, Integer idx) {
        if (idx == null) return null;
        Cell c = row.getCell(idx);
        if (c == null) return null;
        if (c.getCellType() == CellType.NUMERIC) return BigDecimal.valueOf(c.getNumericCellValue());
        String s = getCellAsString(c);
        if (s == null || s.isBlank()) return null;
        try { return new BigDecimal(s.replaceAll("[^\\d.]", "")); }
        catch (Exception e) { return null; }
    }

    // ── Mapping ───────────────────────────────────────────────────────────────
    private void applyDto(DonHang e, DonHangDto d) {
        if (d.getThuTu()           != null) e.setThuTu(d.getThuTu());
        if (d.getMaBravo()         != null) e.setMaBravo(d.getMaBravo());
        if (d.getMaSp()            != null) e.setMaSp(d.getMaSp());
        if (d.getTenSanPham()      != null) e.setTenSanPham(d.getTenSanPham());
        e.setSoLo(d.getSoLo());
        if (d.getMaDonHang() != null) e.setMaDonHang(d.getMaDonHang());
        e.setNgayDatHang(d.getNgayDatHang());
        e.setSoLuongDatHang(d.getSoLuongDatHang());
        e.setTinhTrangDatHang(d.getTinhTrangDatHang());
        if (d.getSoLuongDaXepKh()  != null) e.setSoLuongDaXepKh(d.getSoLuongDaXepKh());
        e.setNgayPhatLenh(d.getNgayPhatLenh());
        e.setTinhTrangSx(d.getTinhTrangSx());
        if (d.getDaLenLichLam()    != null) e.setDaLenLichLam(d.getDaLenLichLam());
        e.setGhiChu(d.getGhiChu());
        if (d.getDaDgVaXepLichDg() != null) e.setDaDgVaXepLichDg(d.getDaDgVaXepLichDg());
    }

    private DonHangDto toDto(DonHang e) {
        DonHangDto d = new DonHangDto();
        d.setId(e.getId());
        d.setThuTu(e.getThuTu());
        d.setMaBravo(e.getMaBravo());
        d.setMaSp(e.getMaSp());
        d.setTenSanPham(e.getTenSanPham());
        d.setSoLo(e.getSoLo());
        d.setMaDonHang(e.getMaDonHang());
        d.setNgayDatHang(e.getNgayDatHang());
        d.setSoLuongDatHang(e.getSoLuongDatHang());
        d.setTinhTrangDatHang(e.getTinhTrangDatHang());
        d.setSoLuongDaXepKh(e.getSoLuongDaXepKh());
        d.setNgayPhatLenh(e.getNgayPhatLenh());
        // Compute soLuongConLai
        if (e.getSoLuongDatHang() != null) {
            BigDecimal xep = e.getSoLuongDaXepKh() != null ? e.getSoLuongDaXepKh() : BigDecimal.ZERO;
            d.setSoLuongConLai(e.getSoLuongDatHang().subtract(xep));
        }
        d.setTinhTrangSx(e.getTinhTrangSx());
        d.setDaLenLichLam(e.getDaLenLichLam());
        d.setGhiChu(e.getGhiChu());
        d.setDaDgVaXepLichDg(e.getDaDgVaXepLichDg());
        d.setTrangThaiDuyet(e.getTrangThaiDuyet());
        d.setCreatedAt(e.getCreatedAt());
        d.setUpdatedAt(e.getUpdatedAt());
        d.setCreatedBy(e.getCreatedBy());
        d.setUpdatedBy(e.getUpdatedBy());
        d.setDeletedAt(e.getDeletedAt());
        d.setDeletedBy(e.getDeletedBy());
        return d;
    }
}
