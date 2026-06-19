package com.sanluong.service;

import com.sanluong.dto.ProductMasterDto;
import com.sanluong.entity.ProductMaster;
import com.sanluong.entity.ProductMasterHistory;
import com.sanluong.entity.ProductMasterSongAn;
import com.sanluong.repository.ProductMasterHistoryRepository;
import com.sanluong.repository.ProductMasterRepository;
import com.sanluong.repository.ProductMasterSongAnRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class ProductMasterService {

    private static final Map<String, String> FIELD_LABELS;
    static {
        FIELD_LABELS = new LinkedHashMap<>();
        FIELD_LABELS.put("maBravo",      "Mã Bravo");
        FIELD_LABELS.put("tienTrinh",    "Tên/Tiến trình");
        FIELD_LABELS.put("spCong",       "SP/Công");
        FIELD_LABELS.put("slTrungBinh",  "NS Trung Bình");
        FIELD_LABELS.put("nangSuatPc",   "NS PC");
        FIELD_LABELS.put("nangSuatPl",   "NS PL");
        FIELD_LABELS.put("nangSuatBbc1", "NS BBC1");
        FIELD_LABELS.put("loaiSanPham",  "Loại SP");
        FIELD_LABELS.put("khoiLuong",    "KL/ĐV (g)");
        FIELD_LABELS.put("mayMocPc",     "Máy Móc PC");
        FIELD_LABELS.put("mayMocPl",     "Máy Móc PL");
        FIELD_LABELS.put("mayMocBbc1",   "Máy Móc BBC1");
        FIELD_LABELS.put("mayMocDg",     "Máy Móc ĐG");
        FIELD_LABELS.put("toNhomPcpl",   "Tổ/Nhóm PCPL");
    }

    private final ProductMasterRepository repository;
    private final ProductMasterSongAnRepository songAnRepository;
    private final ProductMasterHistoryRepository historyRepository;

    public ProductMasterService(ProductMasterRepository repository,
                                ProductMasterSongAnRepository songAnRepository,
                                ProductMasterHistoryRepository historyRepository) {
        this.repository = repository;
        this.songAnRepository = songAnRepository;
        this.historyRepository = historyRepository;
    }

    public Page<ProductMaster> search(String keyword, String toNhomPcpl, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("maTp").ascending());
        String kw   = (keyword    == null || keyword.isBlank())    ? null : keyword.trim();
        String pcpl = (toNhomPcpl == null || toNhomPcpl.isBlank()) ? null : toNhomPcpl.trim();
        return repository.search(kw, pcpl, pageable);
    }

    public Optional<ProductMaster> findByMaTp(String maTp) {
        return repository.findByMaTpIgnoreCase(maTp);
    }

    public java.util.List<ProductMaster> findByMaTpIn(java.util.Collection<String> codes) {
        var upperCodes = codes.stream().map(String::toUpperCase).collect(java.util.stream.Collectors.toList());
        return repository.findByMaTpIn(upperCodes);
    }

    public Optional<ProductMaster> findByMaBravo(String maBravo) {
        return repository.findByMaBravoIgnoreCase(maBravo).stream().findFirst();
    }

    public ProductMaster create(ProductMasterDto dto) {
        if (repository.existsByMaTpIgnoreCase(dto.getMaTp())) {
            throw new RuntimeException("Mã TP đã tồn tại: " + dto.getMaTp());
        }
        ProductMaster p = new ProductMaster();
        return repository.save(applyDto(p, dto));
    }

    public ProductMaster update(Long id, ProductMasterDto dto, String changedBy) {
        ProductMaster p = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ID: " + id));
        String changesJson = buildChangesJson(p, dto);
        ProductMaster saved = repository.save(applyDto(p, dto));
        if (changesJson != null) {
            ProductMasterHistory h = new ProductMasterHistory();
            h.setProductMasterId(saved.getId());
            h.setMaTp(saved.getMaTp());
            h.setChangedBy(changedBy != null ? changedBy : "unknown");
            h.setChangedAt(LocalDateTime.now());
            h.setChangesJson(changesJson);
            historyRepository.save(h);
        }
        return saved;
    }

    public List<ProductMasterHistory> getHistory(Long id) {
        return historyRepository.findByProductMasterIdOrderByChangedAtDesc(id);
    }

    private String buildChangesJson(ProductMaster old, ProductMasterDto dto) {
        List<String> entries = new ArrayList<>();
        addChange(entries, "maBravo",      old.getMaBravo(),      dto.getMaBravo());
        addChange(entries, "tienTrinh",    old.getTienTrinh(),    dto.getTienTrinh());
        addChangeBD(entries, "spCong",       old.getSpCong(),       dto.getSpCong());
        addChangeBD(entries, "slTrungBinh",  old.getSlTrungBinh(),  dto.getSlTrungBinh());
        addChangeBD(entries, "nangSuatPc",   old.getNangSuatPc(),   dto.getNangSuatPc());
        addChangeBD(entries, "nangSuatPl",   old.getNangSuatPl(),   dto.getNangSuatPl());
        addChangeBD(entries, "nangSuatBbc1", old.getNangSuatBbc1(), dto.getNangSuatBbc1());
        addChange(entries, "loaiSanPham",  old.getLoaiSanPham(),  dto.getLoaiSanPham());
        addChangeBD(entries, "khoiLuong",    old.getKhoiLuong(),    dto.getKhoiLuong());
        addChange(entries, "mayMocPc",     old.getMayMocPc(),     dto.getMayMocPc());
        addChange(entries, "mayMocPl",     old.getMayMocPl(),     dto.getMayMocPl());
        addChange(entries, "mayMocBbc1",   old.getMayMocBbc1(),   dto.getMayMocBbc1());
        addChange(entries, "mayMocDg",     old.getMayMocDg(),     dto.getMayMocDg());
        addChange(entries, "toNhomPcpl",  old.getToNhomPcpl(),  dto.getToNhomPcpl());
        if (entries.isEmpty()) return null;
        return "[" + String.join(",", entries) + "]";
    }

    private void addChange(List<String> list, String field, String oldVal, String newVal) {
        String o = oldVal == null ? "" : oldVal.trim();
        String n = newVal == null ? "" : newVal.trim();
        if (o.equals(n)) return;
        String label = FIELD_LABELS.getOrDefault(field, field);
        list.add(String.format("{\"field\":\"%s\",\"label\":\"%s\",\"old\":\"%s\",\"new\":\"%s\"}",
                esc(field), esc(label), esc(o), esc(n)));
    }

    private void addChangeBD(List<String> list, String field, BigDecimal oldVal, BigDecimal newVal) {
        String o = oldVal == null ? "" : oldVal.stripTrailingZeros().toPlainString();
        String n = newVal == null ? "" : newVal.stripTrailingZeros().toPlainString();
        if (o.equals(n)) return;
        String label = FIELD_LABELS.getOrDefault(field, field);
        list.add(String.format("{\"field\":\"%s\",\"label\":\"%s\",\"old\":\"%s\",\"new\":\"%s\"}",
                esc(field), esc(label), esc(o), esc(n)));
    }

    private String esc(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private ProductMaster applyDto(ProductMaster p, ProductMasterDto dto) {
        p.setMaTp(dto.getMaTp());
        p.setMaBravo(dto.getMaBravo());
        p.setTienTrinh(dto.getTienTrinh());
        p.setSpCong(dto.getSpCong());
        p.setSlTrungBinh(dto.getSlTrungBinh());
        p.setNangSuatPc(dto.getNangSuatPc());
        p.setNangSuatPl(dto.getNangSuatPl());
        p.setNangSuatBbc1(dto.getNangSuatBbc1());
        p.setMayMocPc(dto.getMayMocPc());
        p.setMayMocPl(dto.getMayMocPl());
        p.setMayMocBbc1(dto.getMayMocBbc1());
        p.setMayMocDg(dto.getMayMocDg());
        p.setLoaiSanPham(dto.getLoaiSanPham());
        p.setKhoiLuong(dto.getKhoiLuong());
        p.setToNhomPcpl(dto.getToNhomPcpl());
        return p;
    }

    public ProductMaster patchToNhomPcpl(Long id, String value) {
        ProductMaster p = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ID: " + id));
        String v = (value == null || value.isBlank()) ? null : value.trim();
        p.setToNhomPcpl(v);
        return repository.save(p);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    public Map<String, Object> countNoBravo() {
        return Map.of("count", repository.countByMaBravoNullOrEmpty());
    }

    @Transactional
    public Map<String, Object> deleteNoBravo() {
        int deleted = repository.deleteByMaBravoNullOrEmpty();
        return Map.of("deleted", deleted);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Cập nhật NS 2 bước: Preview → Confirm
    // Key tra cứu: Mã Bravo; chỉ ghi đè slTrungBinh, nangSuatPc/Pl/Bbc1
    // ─────────────────────────────────────────────────────────────────────────

    public Map<String, Object> previewUpdateNs(MultipartFile file) throws Exception {
        List<Map<String, Object>> rows = new ArrayList<>();

        try (Workbook wb = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);

            // Tìm hàng tiêu đề: thử tối đa 5 hàng đầu
            Row headerRow = null;
            int headerRowIdx = 0;
            for (int ri = 0; ri <= Math.min(4, sheet.getLastRowNum()); ri++) {
                Row r = sheet.getRow(ri);
                if (r == null) continue;
                // Hàng tiêu đề nếu có ít nhất 2 ô chuỗi không rỗng
                int strCount = 0;
                for (int ci = 0; ci < r.getLastCellNum(); ci++) {
                    Cell c = r.getCell(ci);
                    if (c != null && c.getCellType() == CellType.STRING && !c.getStringCellValue().isBlank())
                        strCount++;
                }
                if (strCount >= 2) { headerRow = r; headerRowIdx = ri; break; }
            }
            if (headerRow == null) throw new RuntimeException("File không có dữ liệu hoặc thiếu dòng tiêu đề");

            Map<String, Integer> colMap = new LinkedHashMap<>();
            List<String> allHeaders = new ArrayList<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell c = headerRow.getCell(i);
                if (c == null) continue;
                String orig = getCellAsString(c).trim();
                if (orig.isBlank()) continue;
                allHeaders.add(orig);
                String h = normalizeHeader(orig);
                String field = detectField(h);
                if (field != null) colMap.put(field, i);
            }

            if (!colMap.containsKey("maBravo")) {
                throw new RuntimeException(
                    "Không tìm thấy cột Mã Bravo trong file Excel. " +
                    "Các cột đọc được: " + allHeaders + ". " +
                    "Tên cột chấp nhận: 'Mã Bravo', 'Ma Bravo', 'maBravo', 'Bravo'..."
                );
            }

            final int dataStartRow = headerRowIdx + 1;

            for (int rowIdx = dataStartRow; rowIdx <= sheet.getLastRowNum(); rowIdx++) {
                Row row = sheet.getRow(rowIdx);
                if (row == null) continue;
                String maBravo = trim(getCellStringVal(row, colMap.get("maBravo")));
                if (isBlank(maBravo)) continue;

                BigDecimal newSlTb  = parseCellBigDecimal(row, colMap.get("slTrungBinh"));
                BigDecimal newNsPc  = parseCellBigDecimal(row, colMap.get("nangSuatPc"));
                BigDecimal newNsPl  = parseCellBigDecimal(row, colMap.get("nangSuatPl"));
                BigDecimal newNsBbc = parseCellBigDecimal(row, colMap.get("nangSuatBbc1"));

                Map<String, Object> r = new LinkedHashMap<>();
                r.put("rowNum",          rowIdx + 1);
                r.put("maBravo",         maBravo);
                r.put("newSlTrungBinh",  newSlTb);
                r.put("newNangSuatPc",   newNsPc);
                r.put("newNangSuatPl",   newNsPl);
                r.put("newNangSuatBbc1", newNsBbc);

                List<ProductMaster> found = repository.findByMaBravoIgnoreCase(maBravo);
                if (found.isEmpty()) {
                    r.put("status", "NOT_FOUND");
                } else if (found.size() > 1) {
                    r.put("status", "DUPLICATE");
                    r.put("duplicateCount", found.size());
                } else {
                    ProductMaster p = found.get(0);
                    r.put("existingId",      p.getId());
                    r.put("tienTrinh",       p.getTienTrinh());
                    r.put("oldSlTrungBinh",  p.getSlTrungBinh());
                    r.put("oldNangSuatPc",   p.getNangSuatPc());
                    r.put("oldNangSuatPl",   p.getNangSuatPl());
                    r.put("oldNangSuatBbc1", p.getNangSuatBbc1());

                    boolean changed = nsChanged(p.getSlTrungBinh(), newSlTb)
                            || nsChanged(p.getNangSuatPc(), newNsPc)
                            || nsChanged(p.getNangSuatPl(), newNsPl)
                            || nsChanged(p.getNangSuatBbc1(), newNsBbc);
                    r.put("status", changed ? "CHANGED" : "NO_CHANGE");
                }
                rows.add(r);
            }
        }
        return Map.of("rows", rows);
    }

    @Transactional
    public Map<String, Object> confirmUpdateNs(List<Map<String, Object>> selectedRows) {
        int updated = 0, skipped = 0;
        List<String> errors = new ArrayList<>();

        for (Map<String, Object> row : selectedRows) {
            try {
                Long id = toLong(row.get("existingId"));
                if (id == null) { skipped++; continue; }
                Optional<ProductMaster> opt = repository.findById(id);
                if (opt.isEmpty()) { skipped++; continue; }
                ProductMaster p = opt.get();
                if (row.get("newSlTrungBinh")  != null) p.setSlTrungBinh(toBigDecimal(row.get("newSlTrungBinh")));
                if (row.get("newNangSuatPc")   != null) p.setNangSuatPc(toBigDecimal(row.get("newNangSuatPc")));
                if (row.get("newNangSuatPl")   != null) p.setNangSuatPl(toBigDecimal(row.get("newNangSuatPl")));
                if (row.get("newNangSuatBbc1") != null) p.setNangSuatBbc1(toBigDecimal(row.get("newNangSuatBbc1")));
                repository.save(p);
                updated++;
            } catch (Exception e) {
                errors.add("Dòng " + row.get("rowNum") + ": " + e.getMessage());
            }
        }
        return Map.of("updated", updated, "skipped", skipped, "errors", errors);
    }

    private boolean nsChanged(BigDecimal old, BigDecimal nw) {
        if (nw == null) return false;
        if (old == null) return true;
        return old.compareTo(nw) != 0;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Cập nhật Loại SP 2 bước: Preview → Confirm
    // Key tra cứu: Mã Bravo; chỉ ghi đè loaiSanPham
    // ─────────────────────────────────────────────────────────────────────────

    public Map<String, Object> previewUpdateLoaiSp(MultipartFile file) throws Exception {
        List<Map<String, Object>> rows = new ArrayList<>();

        try (Workbook wb = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);

            Row headerRow = null;
            int headerRowIdx = 0;
            for (int ri = 0; ri <= Math.min(4, sheet.getLastRowNum()); ri++) {
                Row r = sheet.getRow(ri);
                if (r == null) continue;
                int strCount = 0;
                for (int ci = 0; ci < r.getLastCellNum(); ci++) {
                    Cell c = r.getCell(ci);
                    if (c != null && c.getCellType() == CellType.STRING && !c.getStringCellValue().isBlank())
                        strCount++;
                }
                if (strCount >= 2) { headerRow = r; headerRowIdx = ri; break; }
            }
            if (headerRow == null) throw new RuntimeException("File không có dữ liệu hoặc thiếu dòng tiêu đề");

            Integer colBravo = null, colLoai = null;
            List<String> allHeaders = new ArrayList<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell c = headerRow.getCell(i);
                if (c == null) continue;
                String orig = getCellAsString(c).trim();
                if (orig.isBlank()) continue;
                allHeaders.add(orig);
                String h = normalizeHeader(orig);
                if (colBravo == null && detectField(h) != null && detectField(h).equals("maBravo")) colBravo = i;
                if (colLoai  == null && detectField(h) != null && detectField(h).equals("loaiSanPham")) colLoai = i;
            }

            if (colBravo == null) {
                throw new RuntimeException(
                    "Không tìm thấy cột Mã Bravo. Các cột đọc được: " + allHeaders);
            }
            if (colLoai == null) {
                throw new RuntimeException(
                    "Không tìm thấy cột Loại SP. Tên cột chấp nhận: 'Loại SP', 'Loai SP', 'loaiSanPham', 'Bao che'...");
            }

            for (int rowIdx = headerRowIdx + 1; rowIdx <= sheet.getLastRowNum(); rowIdx++) {
                Row row = sheet.getRow(rowIdx);
                if (row == null) continue;
                String maBravo  = trim(getCellStringVal(row, colBravo));
                String newLoai  = trim(getCellStringVal(row, colLoai));
                if (isBlank(maBravo)) continue;

                Map<String, Object> r = new LinkedHashMap<>();
                r.put("rowNum",      rowIdx + 1);
                r.put("maBravo",     maBravo);
                r.put("newLoaiSanPham", newLoai);

                List<ProductMaster> foundLoai = repository.findByMaBravoIgnoreCase(maBravo);
                if (foundLoai.isEmpty()) {
                    r.put("status", "NOT_FOUND");
                } else if (foundLoai.size() > 1) {
                    r.put("status", "DUPLICATE");
                    r.put("duplicateCount", foundLoai.size());
                } else {
                    ProductMaster p = foundLoai.get(0);
                    r.put("existingId",    p.getId());
                    r.put("tienTrinh",     p.getTienTrinh());
                    r.put("oldLoaiSanPham", p.getLoaiSanPham());
                    String oldVal = p.getLoaiSanPham() == null ? "" : p.getLoaiSanPham().trim();
                    String newVal = newLoai == null ? "" : newLoai;
                    r.put("status", oldVal.equals(newVal) ? "NO_CHANGE" : "CHANGED");
                }
                rows.add(r);
            }
        }
        return Map.of("rows", rows);
    }

    @Transactional
    public Map<String, Object> confirmUpdateLoaiSp(List<Map<String, Object>> selectedRows) {
        int updated = 0, skipped = 0;
        List<String> errors = new ArrayList<>();

        for (Map<String, Object> row : selectedRows) {
            try {
                Long id = toLong(row.get("existingId"));
                if (id == null) { skipped++; continue; }
                Optional<ProductMaster> opt = repository.findById(id);
                if (opt.isEmpty()) { skipped++; continue; }
                ProductMaster p = opt.get();
                String newVal = (String) row.get("newLoaiSanPham");
                p.setLoaiSanPham(newVal == null ? null : newVal.trim());
                repository.save(p);
                updated++;
            } catch (Exception e) {
                errors.add("Dòng " + row.get("rowNum") + ": " + e.getMessage());
            }
        }
        return Map.of("updated", updated, "skipped", skipped, "errors", errors);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Import 2 bước: Preview → Confirm
    // Key tra cứu: Mã Bravo (ưu tiên), fallback Mã TP
    // Bổ sung chỉ điền ô đang null/trống, không ghi đè
    // ─────────────────────────────────────────────────────────────────────────

    private static final List<String> ALL_IMPORT_FIELDS = List.of(
        "maBravo", "maTp", "tienTrinh", "loaiSanPham",
        "khoiLuong", "slTrungBinh",
        "nangSuatPc", "nangSuatPl", "nangSuatBbc1",
        "mayMocPc", "mayMocPl", "mayMocBbc1", "mayMocDg"
    );

    /** Bước 1: Đọc Excel, trả về danh sách preview (chưa ghi DB) */
    public Map<String, Object> previewImport(MultipartFile file) throws Exception {
        List<Map<String, Object>> rows = new ArrayList<>();
        List<String> unmappedCols = new ArrayList<>();

        try (Workbook wb = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) throw new RuntimeException("File không có dữ liệu hoặc thiếu dòng tiêu đề");

            Map<String, Integer> colMap = new LinkedHashMap<>();
            Set<Integer> mappedIndices = new HashSet<>();

            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell c = headerRow.getCell(i);
                if (c == null) continue;
                String original = getCellAsString(c).trim();
                if (original.isBlank()) continue;
                String h = normalizeHeader(original);
                String field = detectField(h);
                if (field != null) {
                    colMap.put(field, i);
                    mappedIndices.add(i);
                } else {
                    unmappedCols.add(original);
                }
            }

            for (int rowIdx = 1; rowIdx <= sheet.getLastRowNum(); rowIdx++) {
                Row row = sheet.getRow(rowIdx);
                if (row == null) continue;

                String maBravo = trim(getCellStringVal(row, colMap.get("maBravo")));
                String maTp    = trim(getCellStringVal(row, colMap.get("maTp")));
                if (isBlank(maBravo) && isBlank(maTp)) continue;

                Map<String, Object> r = new LinkedHashMap<>();
                r.put("rowNum",     rowIdx + 1);
                r.put("maBravo",    maBravo);
                r.put("maTp",       maTp);
                r.put("tienTrinh",  getCellStringVal(row, colMap.get("tienTrinh")));
                r.put("loaiSanPham",getCellStringVal(row, colMap.get("loaiSanPham")));
                r.put("khoiLuong",  parseCellBigDecimal(row, colMap.get("khoiLuong")));
                r.put("slTrungBinh",parseCellBigDecimal(row, colMap.get("slTrungBinh")));
                r.put("nangSuatPc", parseCellBigDecimal(row, colMap.get("nangSuatPc")));
                r.put("nangSuatPl", parseCellBigDecimal(row, colMap.get("nangSuatPl")));
                r.put("nangSuatBbc1",parseCellBigDecimal(row, colMap.get("nangSuatBbc1")));
                r.put("mayMocPc",   getCellStringVal(row, colMap.get("mayMocPc")));
                r.put("mayMocPl",   getCellStringVal(row, colMap.get("mayMocPl")));
                r.put("mayMocBbc1", getCellStringVal(row, colMap.get("mayMocBbc1")));
                r.put("mayMocDg",   getCellStringVal(row, colMap.get("mayMocDg")));

                // Tra cứu: ưu tiên Mã Bravo
                Optional<ProductMaster> existing = Optional.empty();
                if (!isBlank(maBravo)) existing = repository.findByMaBravoIgnoreCase(maBravo).stream().findFirst();
                if (existing.isEmpty() && !isBlank(maTp)) existing = repository.findByMaTpIgnoreCase(maTp);

                if (existing.isEmpty()) {
                    if (isBlank(maTp)) {
                        r.put("status", "ERROR");
                        r.put("errorMessage", "Thiếu Mã TP — không thể tạo bản ghi mới");
                        r.put("supplementFields", List.of());
                    } else if (repository.existsByMaTpIgnoreCase(maTp)) {
                        r.put("status", "ERROR");
                        r.put("errorMessage", "Mã TP " + maTp + " đã tồn tại với Mã Bravo khác");
                        r.put("supplementFields", List.of());
                    } else {
                        r.put("status", "NEW");
                        r.put("supplementFields", List.of());
                    }
                } else {
                    ProductMaster p = existing.get();
                    r.put("existingId", p.getId());
                    List<String> toFill = detectSupplementFields(p, r);
                    r.put("supplementFields", toFill);
                    r.put("status", toFill.isEmpty() ? "SKIP" : "SUPPLEMENT");
                }

                rows.add(r);
            }
        }

        return Map.of("rows", rows, "unmappedCols", unmappedCols);
    }

    /** Bước 2: Ghi DB với danh sách dòng đã được người dùng chọn */
    @Transactional
    public Map<String, Object> confirmImport(List<Map<String, Object>> selectedRows, String username) {
        int added = 0, supplemented = 0, skipped = 0;
        List<String> errors = new ArrayList<>();

        for (Map<String, Object> row : selectedRows) {
            String status = (String) row.get("status");
            try {
                if ("NEW".equals(status)) {
                    String maTp = trim((String) row.get("maTp"));
                    if (isBlank(maTp) || repository.existsByMaTpIgnoreCase(maTp)) { skipped++; continue; }
                    ProductMaster p = new ProductMaster();
                    p.setMaTp(maTp);
                    applyAllFields(p, row);
                    repository.save(p);
                    added++;

                } else if ("SUPPLEMENT".equals(status)) {
                    Long id = toLong(row.get("existingId"));
                    if (id == null) { skipped++; continue; }
                    Optional<ProductMaster> opt = repository.findById(id);
                    if (opt.isEmpty()) { skipped++; continue; }
                    ProductMaster p = opt.get();
                    @SuppressWarnings("unchecked")
                    List<String> fields = (List<String>) row.get("supplementFields");
                    if (fields == null || fields.isEmpty()) { skipped++; continue; }
                    applySupplementFields(p, row, fields);
                    repository.save(p);
                    supplemented++;

                } else {
                    skipped++;
                }
            } catch (Exception e) {
                errors.add("Dòng " + row.get("rowNum") + ": " + e.getMessage());
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("added",        added);
        result.put("supplemented", supplemented);
        result.put("skipped",      skipped);
        result.put("errors",       errors);
        result.put("importedBy",   username);
        result.put("importedAt",   LocalDateTime.now().toString());
        return result;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private List<String> detectSupplementFields(ProductMaster p, Map<String, Object> row) {
        List<String> fill = new ArrayList<>();
        if (isBlank(p.getMaBravo())    && !isBlankObj(row.get("maBravo")))    fill.add("maBravo");
        if (isBlank(p.getTienTrinh())  && !isBlankObj(row.get("tienTrinh")))  fill.add("tienTrinh");
        if (isBlank(p.getLoaiSanPham())&& !isBlankObj(row.get("loaiSanPham")))fill.add("loaiSanPham");
        if (p.getKhoiLuong()    == null && row.get("khoiLuong")    != null)   fill.add("khoiLuong");
        if (p.getSlTrungBinh()  == null && row.get("slTrungBinh")  != null)   fill.add("slTrungBinh");
        if (p.getNangSuatPc()   == null && row.get("nangSuatPc")   != null)   fill.add("nangSuatPc");
        if (p.getNangSuatPl()   == null && row.get("nangSuatPl")   != null)   fill.add("nangSuatPl");
        if (p.getNangSuatBbc1() == null && row.get("nangSuatBbc1") != null)   fill.add("nangSuatBbc1");
        if (isBlank(p.getMayMocPc())   && !isBlankObj(row.get("mayMocPc")))   fill.add("mayMocPc");
        if (isBlank(p.getMayMocPl())   && !isBlankObj(row.get("mayMocPl")))   fill.add("mayMocPl");
        if (isBlank(p.getMayMocBbc1()) && !isBlankObj(row.get("mayMocBbc1"))) fill.add("mayMocBbc1");
        if (isBlank(p.getMayMocDg())   && !isBlankObj(row.get("mayMocDg")))   fill.add("mayMocDg");
        return fill;
    }

    private void applyAllFields(ProductMaster p, Map<String, Object> row) {
        p.setMaBravo(trim((String) row.get("maBravo")));
        p.setTienTrinh((String) row.get("tienTrinh"));
        p.setLoaiSanPham((String) row.get("loaiSanPham"));
        p.setKhoiLuong(toBigDecimal(row.get("khoiLuong")));
        p.setSlTrungBinh(toBigDecimal(row.get("slTrungBinh")));
        p.setNangSuatPc(toBigDecimal(row.get("nangSuatPc")));
        p.setNangSuatPl(toBigDecimal(row.get("nangSuatPl")));
        p.setNangSuatBbc1(toBigDecimal(row.get("nangSuatBbc1")));
        p.setMayMocPc((String) row.get("mayMocPc"));
        p.setMayMocPl((String) row.get("mayMocPl"));
        p.setMayMocBbc1((String) row.get("mayMocBbc1"));
        p.setMayMocDg((String) row.get("mayMocDg"));
    }

    private void applySupplementFields(ProductMaster p, Map<String, Object> row, List<String> fields) {
        for (String f : fields) {
            switch (f) {
                case "maBravo"     -> p.setMaBravo(trim((String) row.get("maBravo")));
                case "tienTrinh"   -> p.setTienTrinh((String) row.get("tienTrinh"));
                case "loaiSanPham" -> p.setLoaiSanPham((String) row.get("loaiSanPham"));
                case "khoiLuong"   -> p.setKhoiLuong(toBigDecimal(row.get("khoiLuong")));
                case "slTrungBinh" -> p.setSlTrungBinh(toBigDecimal(row.get("slTrungBinh")));
                case "nangSuatPc"  -> p.setNangSuatPc(toBigDecimal(row.get("nangSuatPc")));
                case "nangSuatPl"  -> p.setNangSuatPl(toBigDecimal(row.get("nangSuatPl")));
                case "nangSuatBbc1"-> p.setNangSuatBbc1(toBigDecimal(row.get("nangSuatBbc1")));
                case "mayMocPc"    -> p.setMayMocPc((String) row.get("mayMocPc"));
                case "mayMocPl"    -> p.setMayMocPl((String) row.get("mayMocPl"));
                case "mayMocBbc1"  -> p.setMayMocBbc1((String) row.get("mayMocBbc1"));
                case "mayMocDg"    -> p.setMayMocDg((String) row.get("mayMocDg"));
            }
        }
    }

    private String detectField(String h) {
        if (h.startsWith("matp") || h.startsWith("masanpham") || h.startsWith("masp")) return "maTp";
        if (h.contains("bravo"))                                               return "maBravo";
        if (h.contains("tientrinh") || h.startsWith("ten"))                   return "tienTrinh";
        if (h.contains("loai") || h.contains("baoche"))                       return "loaiSanPham";
        if (h.contains("khoi") || h.contains("kldv"))                         return "khoiLuong";
        if (h.contains("trungbinh"))                                           return "slTrungBinh";
        if (h.contains("maymoc") && h.endsWith("pc"))                         return "mayMocPc";
        if (h.contains("maymoc") && h.endsWith("pl"))                         return "mayMocPl";
        if (h.contains("maymoc") && h.contains("bbc"))                        return "mayMocBbc1";
        if (h.contains("maymoc") && h.contains("dg"))                         return "mayMocDg";
        if (h.contains("nspc") || h.contains("nangsuatpc") || (h.startsWith("ns") && h.endsWith("pc")))           return "nangSuatPc";
        if (h.contains("nspl") || h.contains("nangsuatpl") || (h.startsWith("ns") && h.endsWith("pl")))           return "nangSuatPl";
        if (h.contains("nsbbc") || h.contains("nangsuatbbc") || (h.startsWith("ns") && h.contains("bbc")))        return "nangSuatBbc1";
        return null;
    }

    private String normalizeHeader(String s) {
        if (s == null) return "";
        String lower = s.toLowerCase().replace("đ", "d");
        String nfd = Normalizer.normalize(lower, Normalizer.Form.NFD);
        return nfd.replaceAll("[^a-z0-9]", "");
    }

    private String getCellAsString(Cell c) {
        if (c == null) return "";
        return switch (c.getCellType()) {
            case STRING  -> c.getStringCellValue().trim();
            case NUMERIC -> {
                double d = c.getNumericCellValue();
                yield (d == Math.floor(d)) ? String.valueOf((long) d) : String.valueOf(d);
            }
            case BOOLEAN -> String.valueOf(c.getBooleanCellValue());
            case FORMULA -> {
                try { yield c.getStringCellValue().trim(); }
                catch (Exception e) { yield String.valueOf(c.getNumericCellValue()); }
            }
            default -> "";
        };
    }

    private String getCellStringVal(Row row, Integer col) {
        if (col == null) return null;
        String v = getCellAsString(row.getCell(col));
        return v.isBlank() ? null : v;
    }

    private BigDecimal parseCellBigDecimal(Row row, Integer col) {
        if (col == null) return null;
        Cell c = row.getCell(col);
        if (c == null) return null;
        try {
            if (c.getCellType() == CellType.NUMERIC) return BigDecimal.valueOf(c.getNumericCellValue());
            String s = getCellAsString(c).replace(",", ".").replaceAll("[^\\d.]", "");
            return s.isBlank() ? null : new BigDecimal(s);
        } catch (Exception e) { return null; }
    }

    private BigDecimal toBigDecimal(Object v) {
        if (v == null) return null;
        if (v instanceof BigDecimal bd) return bd;
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        try { return new BigDecimal(v.toString()); } catch (Exception e) { return null; }
    }

    private Long toLong(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.longValue();
        try { return Long.parseLong(v.toString()); } catch (Exception e) { return null; }
    }

    private String trim(String s) { return s == null ? null : s.trim(); }
    private boolean isBlank(String s) { return s == null || s.isBlank(); }
    private boolean isBlankObj(Object o) { return o == null || (o instanceof String s && s.isBlank()); }

    // ─────────────────────────────────────────────────────────────────────────
    // Đồng bộ từ Song An
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> syncFromSongAn() {
        List<ProductMasterSongAn> songAnList = songAnRepository.findAll();
        int updated = 0, skipped = 0;
        for (ProductMasterSongAn sa : songAnList) {
            Optional<ProductMaster> opt = repository.findByMaTpIgnoreCase(sa.getMaTp());
            if (opt.isEmpty()) { skipped++; continue; }
            ProductMaster p = opt.get();
            boolean changed = false;
            if (notBlank(sa.getMaBravo())    && !sa.getMaBravo().equals(p.getMaBravo()))       { p.setMaBravo(sa.getMaBravo());         changed = true; }
            if (sa.getNangSuatPc()   != null && !sa.getNangSuatPc().equals(p.getNangSuatPc())) { p.setNangSuatPc(sa.getNangSuatPc());   changed = true; }
            if (sa.getNangSuatPl()   != null && !sa.getNangSuatPl().equals(p.getNangSuatPl())) { p.setNangSuatPl(sa.getNangSuatPl());   changed = true; }
            if (sa.getNangSuatBbc1() != null && !sa.getNangSuatBbc1().equals(p.getNangSuatBbc1())) { p.setNangSuatBbc1(sa.getNangSuatBbc1()); changed = true; }
            if (notBlank(sa.getMayMocPc())   && !sa.getMayMocPc().equals(p.getMayMocPc()))     { p.setMayMocPc(sa.getMayMocPc());       changed = true; }
            if (notBlank(sa.getMayMocPl())   && !sa.getMayMocPl().equals(p.getMayMocPl()))     { p.setMayMocPl(sa.getMayMocPl());       changed = true; }
            if (notBlank(sa.getMayMocBbc1()) && !sa.getMayMocBbc1().equals(p.getMayMocBbc1())) { p.setMayMocBbc1(sa.getMayMocBbc1());   changed = true; }
            if (notBlank(sa.getMayMocDg())   && !sa.getMayMocDg().equals(p.getMayMocDg()))     { p.setMayMocDg(sa.getMayMocDg());       changed = true; }
            if (notBlank(sa.getLoaiSanPham()) && !sa.getLoaiSanPham().equals(p.getLoaiSanPham())) { p.setLoaiSanPham(sa.getLoaiSanPham()); changed = true; }
            if (sa.getKhoiLuong()    != null && !sa.getKhoiLuong().equals(p.getKhoiLuong()))   { p.setKhoiLuong(sa.getKhoiLuong());     changed = true; }
            if (sa.getSlTrungBinh()  != null && !sa.getSlTrungBinh().equals(p.getSlTrungBinh())) { p.setSlTrungBinh(sa.getSlTrungBinh()); changed = true; }
            if (notBlank(sa.getTienTrinh())  && !sa.getTienTrinh().equals(p.getTienTrinh()))   { p.setTienTrinh(sa.getTienTrinh());     changed = true; }
            if (changed) { repository.save(p); updated++; } else skipped++;
        }
        return Map.of("updated", updated, "skipped", skipped);
    }

    @Transactional
    public Map<String, Object> resetSyncFields() {
        List<ProductMaster> all = repository.findAll();
        for (ProductMaster p : all) {
            p.setMaBravo(null); p.setNangSuatPc(null); p.setNangSuatPl(null); p.setNangSuatBbc1(null);
            p.setMayMocPc(null); p.setMayMocPl(null); p.setMayMocBbc1(null); p.setMayMocDg(null);
            p.setLoaiSanPham(null); p.setKhoiLuong(null); p.setSlTrungBinh(null); p.setTienTrinh(null);
        }
        repository.saveAll(all);
        return Map.of("reset", all.size());
    }

    private boolean notBlank(String s) { return s != null && !s.isBlank(); }
}
