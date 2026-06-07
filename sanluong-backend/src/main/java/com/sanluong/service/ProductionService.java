package com.sanluong.service;

import com.sanluong.dto.ProductionRecordDto;
import com.sanluong.entity.ProductionEditHistory;
import com.sanluong.entity.ProductionRecord;
import com.sanluong.repository.LenhSanXuatRepository;
import com.sanluong.repository.ProductionEditHistoryRepository;
import com.sanluong.repository.ProductionRecordRepository;
import com.sanluong.repository.ProductMasterRepository;
import com.sanluong.repository.WorkScheduleRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.io.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class ProductionService {

    private final ProductionRecordRepository repository;
    private final ProductMasterRepository productMasterRepository;
    private final LenhSanXuatRepository lenhSanXuatRepository;
    private final WorkScheduleRepository workScheduleRepository;
    private final ProductionEditHistoryRepository historyRepository;
    private final NotificationService notificationService;

    public ProductionService(ProductionRecordRepository repository,
                             ProductMasterRepository productMasterRepository,
                             LenhSanXuatRepository lenhSanXuatRepository,
                             WorkScheduleRepository workScheduleRepository,
                             ProductionEditHistoryRepository historyRepository,
                             NotificationService notificationService) {
        this.repository = repository;
        this.productMasterRepository = productMasterRepository;
        this.lenhSanXuatRepository = lenhSanXuatRepository;
        this.workScheduleRepository = workScheduleRepository;
        this.historyRepository = historyRepository;
        this.notificationService = notificationService;
    }

    // Tên hiển thị tiếng Việt của từng trường
    private static final Map<String, String> FIELD_LABELS = Map.ofEntries(
        Map.entry("maBravo",       "Mã Bravo"),
        Map.entry("maTp",          "Mã TP"),
        Map.entry("tienTrinh",     "Tiến trình"),
        Map.entry("lsx",           "LSX"),
        Map.entry("soLuong",       "Cỡ lô"),
        Map.entry("pcTrangThai",   "PC – Tình trạng"),
        Map.entry("plTrangThai",   "PL – Tình trạng"),
        Map.entry("dgTrangThai",   "ĐG – Tình trạng"),
        Map.entry("bbc1TrangThai", "BBC1 – Tình trạng"),
        Map.entry("slPc",          "SL PC"),
        Map.entry("pcPl",          "SL PL"),
        Map.entry("dg2",           "SL ĐG"),
        Map.entry("bbc1_2",        "SL BBC1"),
        Map.entry("bbc1_1",        "BBC1 Ngày phối"),
        Map.entry("pcChiPhi",      "Công PC"),
        Map.entry("plChiPhi",      "Công PL"),
        Map.entry("dgChiPhi",      "Công ĐG"),
        Map.entry("bbc1_3",        "Công BBC1"),
        Map.entry("spTrungGian",   "SP Trung gian"),
        Map.entry("tpNhapKho",     "TP Nhập kho"),
        Map.entry("temDb",         "TEM ĐB"),
        Map.entry("slTrungBinh",   "SL Trung bình"),
        Map.entry("moTa",          "Ghi chú"),
        Map.entry("qaLayMau",      "QA Lấy mẫu"),
        Map.entry("phatLenh",      "Phát lệnh")
    );

    private void saveFieldHistory(List<ProductionEditHistory> list, Long productionId,
                                   String field, String oldVal, String newVal,
                                   String changedBy, LocalDateTime changedAt) {
        if (Objects.equals(oldVal, newVal)) return;
        ProductionEditHistory h = new ProductionEditHistory();
        h.setProductionId(productionId);
        h.setFieldName(field);
        h.setFieldLabel(FIELD_LABELS.getOrDefault(field, field));
        h.setOldValue(oldVal);
        h.setNewValue(newVal);
        h.setChangedBy(changedBy);
        h.setChangedAt(changedAt);
        list.add(h);
    }

    private String str(Object v) { return v == null ? null : v.toString().trim(); }

    /**
     * Trả về tất cả ProductionRecord chưa hoàn thành (ít nhất 1 công đoạn chưa done)
     * dùng để gợi ý auto-fill trong form thêm Kế hoạch.
     * Trả về Map gọn: id, tienTrinh, maDonHang, maTp, lsx, soLuong
     */
    public List<Map<String, Object>> getForPlanSuggestions() {
        List<ProductionRecord> all = repository.searchAll(null, null, null, null, null);
        return all.stream()
                .filter(r -> {
                    // Chưa hoàn thành = ít nhất 1 công đoạn chưa done
                    boolean done = "done".equals(r.getPcTrangThai())
                            && "done".equals(r.getPlTrangThai())
                            && "done".equals(r.getDgTrangThai())
                            && "done".equals(r.getBbc1TrangThai());
                    return !done;
                })
                .sorted(Comparator
                        .comparingInt((ProductionRecord r) -> lsxSortKey(r.getLsx())).reversed()
                        .thenComparing(Comparator.comparing(
                                ProductionRecord::getCreatedAt,
                                Comparator.nullsLast(Comparator.reverseOrder()))))
                .map(r -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id",         r.getId());
                    m.put("tienTrinh",  r.getTienTrinh());
                    m.put("maDonHang",  r.getMaDonHang());
                    m.put("maTp",       r.getMaTp());
                    m.put("lsx",        r.getLsx());
                    m.put("soLuong",    r.getSoLuong());
                    return m;
                })
                .collect(Collectors.toList());
    }

    public Page<ProductionRecord> search(String maTp, String maBravo, String tienTrinh,
                                         String lsx, String trangThai, Boolean hoanThanh, int page, int size) {
        List<ProductionRecord> all = repository.searchAll(
                isEmpty(maTp) ? null : maTp,
                isEmpty(maBravo) ? null : maBravo,
                isEmpty(tienTrinh) ? null : tienTrinh,
                isEmpty(lsx) ? null : lsx,
                isEmpty(trangThai) ? null : trangThai
        );
        if (hoanThanh != null) {
            all = all.stream().filter(r -> {
                boolean done = "done".equals(r.getPcTrangThai())
                        && "done".equals(r.getPlTrangThai())
                        && "done".equals(r.getDgTrangThai())
                        && "done".equals(r.getBbc1TrangThai());
                return hoanThanh ? done : !done;
            }).collect(Collectors.toList());
        }
        all.sort(Comparator
                .comparingInt((ProductionRecord r) -> lsxSortKey(r.getLsx())).reversed()
                .thenComparing(Comparator.comparing(
                        ProductionRecord::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder()))));
        int start = page * size;
        int end = Math.min(start + size, all.size());
        List<ProductionRecord> content = start < all.size() ? all.subList(start, end) : List.of();
        enrichToNhom(content);
        return new PageImpl<>(content, PageRequest.of(page, size), all.size());
    }

    private int lsxSortKey(String lsx) {
        if (lsx == null || lsx.length() != 6) return 0;
        try {
            return Integer.parseInt(lsx.substring(4, 6) + lsx.substring(2, 4) + lsx.substring(0, 2));
        } catch (NumberFormatException e) { return 0; }
    }

    public ProductionRecord getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi ID: " + id));
    }

    public boolean existsByKey(String maBravo, String lsx, String maDonHang) {
        return repository.existsByMaBravoAndLsxAndMaDonHang(maBravo, lsx, maDonHang);
    }

    public ProductionRecord create(ProductionRecordDto dto, String username) {
        // Chặn duplicate theo maBravo + lsx + maDonHang
        if (!isEmpty(dto.getMaBravo()) && !isEmpty(dto.getLsx())) {
            if (repository.existsByMaBravoAndLsxAndMaDonHang(
                    dto.getMaBravo(), dto.getLsx(), dto.getMaDonHang())) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.CONFLICT,
                        "Bản ghi Sản lượng đã tồn tại: Mã Bravo '" + dto.getMaBravo()
                        + "' + LSX '" + dto.getLsx()
                        + (dto.getMaDonHang() != null ? "' + Mã ĐH '" + dto.getMaDonHang() : "")
                        + "' đã được ghi nhận!");
            }
        } else if (!isEmpty(dto.getMaTp()) && dto.getSoLuong() != null) {
            String tienTrinhParam = isEmpty(dto.getTienTrinh()) ? null : dto.getTienTrinh();
            String lsxParam = isEmpty(dto.getLsx()) ? null : dto.getLsx();
            boolean exists = repository.existsByTripletAndSoLuong(
                    dto.getMaTp(), tienTrinhParam, lsxParam, dto.getSoLuong());
            if (exists) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.CONFLICT,
                        "Sản phẩm đã tồn tại: Mã TP '" + dto.getMaTp()
                        + "' với cùng Tiến trình, Số Lô và Số Lượng đã được ghi nhận!");
            }
        }
        ProductionRecord record = mapToEntity(dto);
        record.setCreatedBy(username);
        record.setUpdatedBy(username);
        ProductionRecord saved = repository.save(record);
        notificationService.createSanLuongNewNotification(
                saved.getId(), saved.getTienTrinh(), saved.getMaTp(),
                saved.getLsx(), saved.getSoLuong(), username);
        return saved;
    }

    public ProductionRecord update(Long id, ProductionRecordDto dto, String username) {
        ProductionRecord old = getById(id);
        LocalDateTime now = LocalDateTime.now();
        List<ProductionEditHistory> changes = new ArrayList<>();

        // So sánh từng trường và ghi lịch sử thay đổi
        saveFieldHistory(changes, id, "maBravo",       str(old.getMaBravo()),       str(dto.getMaBravo()),       username, now);
        saveFieldHistory(changes, id, "maTp",          str(old.getMaTp()),          str(dto.getMaTp()),          username, now);
        saveFieldHistory(changes, id, "tienTrinh",     str(old.getTienTrinh()),     str(dto.getTienTrinh()),     username, now);
        saveFieldHistory(changes, id, "lsx",           str(old.getLsx()),           str(dto.getLsx()),           username, now);
        saveFieldHistory(changes, id, "soLuong",       str(old.getSoLuong()),       str(dto.getSoLuong()),       username, now);
        saveFieldHistory(changes, id, "pcTrangThai",   str(old.getPcTrangThai()),   str(dto.getPcTrangThai()),   username, now);
        saveFieldHistory(changes, id, "plTrangThai",   str(old.getPlTrangThai()),   str(dto.getPlTrangThai()),   username, now);
        saveFieldHistory(changes, id, "dgTrangThai",   str(old.getDgTrangThai()),   str(dto.getDgTrangThai()),   username, now);
        saveFieldHistory(changes, id, "bbc1TrangThai", str(old.getBbc1TrangThai()), str(dto.getBbc1TrangThai()), username, now);
        saveFieldHistory(changes, id, "slPc",          str(old.getSlPc()),          str(dto.getSlPc()),          username, now);
        saveFieldHistory(changes, id, "pcPl",          str(old.getPcPl()),          str(dto.getPcPl()),          username, now);
        saveFieldHistory(changes, id, "dg2",           str(old.getDg2()),           str(dto.getDg2()),           username, now);
        saveFieldHistory(changes, id, "bbc1_2",        str(old.getBbc1_2()),        str(dto.getBbc1_2()),        username, now);
        saveFieldHistory(changes, id, "bbc1_1",        str(old.getBbc1_1()),        str(dto.getBbc1_1()),        username, now);
        saveFieldHistory(changes, id, "pcChiPhi",      str(old.getPcChiPhi()),      str(dto.getPcChiPhi()),      username, now);
        saveFieldHistory(changes, id, "plChiPhi",      str(old.getPlChiPhi()),      str(dto.getPlChiPhi()),      username, now);
        saveFieldHistory(changes, id, "dgChiPhi",      str(old.getDgChiPhi()),      str(dto.getDgChiPhi()),      username, now);
        saveFieldHistory(changes, id, "bbc1_3",        str(old.getBbc1_3()),        str(dto.getBbc1_3()),        username, now);
        saveFieldHistory(changes, id, "spTrungGian",   str(old.getSpTrungGian()),   str(dto.getSpTrungGian()),   username, now);
        saveFieldHistory(changes, id, "tpNhapKho",     str(old.getTpNhapKho()),     str(dto.getTpNhapKho()),     username, now);
        saveFieldHistory(changes, id, "temDb",         str(old.getTemDb()),         str(dto.getTemDb()),         username, now);
        saveFieldHistory(changes, id, "slTrungBinh",   str(old.getSlTrungBinh()),   str(dto.getSlTrungBinh()),   username, now);
        saveFieldHistory(changes, id, "moTa",          str(old.getMoTa()),          str(dto.getMoTa()),          username, now);
        saveFieldHistory(changes, id, "qaLayMau",      str(old.getQaLayMau()),      str(dto.getQaLayMau()),      username, now);
        saveFieldHistory(changes, id, "phatLenh",      str(old.getPhatLenh()),      str(dto.getPhatLenh()),      username, now);

        updateEntity(old, dto);
        old.setUpdatedBy(username);
        ProductionRecord saved = repository.save(old);

        if (!changes.isEmpty()) historyRepository.saveAll(changes);
        return saved;
    }

    public List<ProductionEditHistory> getHistory(Long productionId) {
        return historyRepository.findByProductionIdOrderByChangedAtDesc(productionId);
    }

    public void delete(Long id, String username) {
        ProductionRecord r = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi ID: " + id));
        r.setDeletedAt(java.time.LocalDateTime.now());
        r.setDeletedBy(username);
        repository.save(r);
    }

    public ProductionRecord phatLenh(Long id, String username) {
        ProductionRecord r = getById(id);
        LocalDateTime now = LocalDateTime.now();
        List<ProductionEditHistory> changes = new ArrayList<>();
        saveFieldHistory(changes, id, "phatLenh", str(r.getPhatLenh()), "true", username, now);
        r.setPhatLenh(true);

        // Tổ thực hiện: LenhSanXuat là nguồn duy nhất — luôn lookup để override giá trị cũ sai
        String toNhomPcpl = null;
        if (!isEmpty(r.getMaBravo())) {
            toNhomPcpl = lenhSanXuatRepository
                    .findFirstByMaBravoAndSoLo(r.getMaBravo(), isEmpty(r.getLsx()) ? null : r.getLsx())
                    .map(l -> isEmpty(l.getToThucHien()) ? null : l.getToThucHien())
                    .orElse(null);
        }
        // Fallback: giữ nguyên toNhom trên record nếu LenhSanXuat chưa có toThucHien
        if (isEmpty(toNhomPcpl)) {
            toNhomPcpl = r.getToNhom();
        }
        // Cập nhật toNhom trên record nếu khác (sửa sai từ code cũ hoặc lần đầu set)
        if (!isEmpty(toNhomPcpl) && !toNhomPcpl.equals(r.getToNhom())) {
            saveFieldHistory(changes, id, "toNhom", str(r.getToNhom()), toNhomPcpl, username, now);
            r.setToNhom(toNhomPcpl);
        }
        // Khi phát lệnh PCPL1 hoặc PCPL2: đặt tinhTrang="doing" (không check isEmpty — override giá trị sai cũ)
        if ("PCPL1".equals(toNhomPcpl) || "PCPL2".equals(toNhomPcpl)) {
            if (!"doing".equals(r.getPcTrangThai())) {
                saveFieldHistory(changes, id, "pcTrangThai", str(r.getPcTrangThai()), "doing", username, now);
                r.setPcTrangThai("doing");
            }
            if (!"doing".equals(r.getPlTrangThai())) {
                saveFieldHistory(changes, id, "plTrangThai", str(r.getPlTrangThai()), "doing", username, now);
                r.setPlTrangThai("doing");
            }
            if (!"doing".equals(r.getDgTrangThai())) {
                saveFieldHistory(changes, id, "dgTrangThai", str(r.getDgTrangThai()), "doing", username, now);
                r.setDgTrangThai("doing");
            }
            if (!"doing".equals(r.getBbc1TrangThai())) {
                saveFieldHistory(changes, id, "bbc1TrangThai", str(r.getBbc1TrangThai()), "doing", username, now);
                r.setBbc1TrangThai("doing");
            }
        }

        r.setUpdatedBy(username);
        ProductionRecord saved = repository.save(r);
        if (!changes.isEmpty()) historyRepository.saveAll(changes);
        // @Transient field bị mất sau JPA merge — khôi phục để frontend nhận đúng toNhom
        if (!isEmpty(toNhomPcpl)) saved.setToNhom(toNhomPcpl);
        return saved;
    }

    public long countChuaPhatLenh() {
        return repository.countChuaPhatLenhNative();
    }

    public java.util.List<ProductionRecord> getChuaPhatLenhList() {
        return repository.findChuaPhatLenhList();
    }

    public java.util.List<ProductionRecord> getDaPhatChuaXepLich() {
        return repository.findDaPhatChuaXepLich();
    }

    public java.util.List<ProductionRecord> findTrash() {
        return repository.findAllDeleted();
    }

    public void restore(Long id) {
        ProductionRecord r = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi ID: " + id));
        // Chặn khôi phục nếu đã có bản ghi active trùng maBravo + lsx + maDonHang
        if (!isEmpty(r.getMaBravo()) && !isEmpty(r.getLsx())) {
            if (repository.existsByMaBravoAndLsxAndMaDonHang(r.getMaBravo(), r.getLsx(), r.getMaDonHang())) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.CONFLICT,
                        "Không thể khôi phục: đã tồn tại bản ghi active với Mã Bravo '"
                        + r.getMaBravo() + "' + LSX '" + r.getLsx() + "'");
            }
        }
        r.setDeletedAt(null);
        r.setDeletedBy(null);
        repository.save(r);
    }

    public void deletePermanent(Long id) {
        repository.deleteById(id);
    }

    public void hide(Long id) {
        ProductionRecord r = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi ID: " + id));
        r.setHidden(true);
        repository.save(r);
    }

    public byte[] exportExcel(String maTp, String maBravo, String tienTrinh,
                               String lsx, String trangThai) throws IOException {
        List<ProductionRecord> records = repository.searchAll(
                isEmpty(maTp) ? null : maTp,
                isEmpty(maBravo) ? null : maBravo,
                isEmpty(tienTrinh) ? null : tienTrinh,
                isEmpty(lsx) ? null : lsx,
                isEmpty(trangThai) ? null : trangThai
        );

        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Sản lượng");
            String[] headers = {
                "Mã TP", "Mã Bravo", "Tiến trình", "LSX", "Số lượng",
                "PC TT", "PL TT", "ĐG TT",
                "BBC1", "SL PCPL", "SL ĐG", "SL BBC1",
                "SP Trung gian", "Tổng BTP", "Công BBC1",
                "Công PC", "Công PL", "Công ĐG", "Σ Cộng",
                "TEM ĐB", "Dở dang ĐG", "TP Nhập kho", "SỐ SP/Cộng",
                "Người tạo", "Ngày tạo"
            };

            CellStyle headerStyle = wb.createCellStyle();
            Font font = wb.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (ProductionRecord r : records) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(nvl(r.getMaTp()));
                row.createCell(1).setCellValue(nvl(r.getMaBravo()));
                row.createCell(2).setCellValue(nvl(r.getTienTrinh()));
                row.createCell(3).setCellValue(nvl(r.getLsx()));
                row.createCell(4).setCellValue(r.getSoLuong() != null ? r.getSoLuong() : 0);
                row.createCell(5).setCellValue(nvl(r.getPcTrangThai()));
                row.createCell(6).setCellValue(nvl(r.getPlTrangThai()));
                row.createCell(7).setCellValue(nvl(r.getDgTrangThai()));
                row.createCell(8).setCellValue(nvl(r.getBbc1_1()));
                row.createCell(9).setCellValue(nvl(r.getPcPl()));
                row.createCell(10).setCellValue(nvl(r.getDg2()));
                row.createCell(11).setCellValue(nvl(r.getBbc1_2()));
                row.createCell(12).setCellValue(r.getSpTrungGian() != null ? r.getSpTrungGian() : 0);
                row.createCell(13).setCellValue(r.getTongBtp() != null ? r.getTongBtp() : 0);
                row.createCell(14).setCellValue(bd(r.getBbc1_3()));
                row.createCell(15).setCellValue(bd(r.getPcChiPhi()));
                row.createCell(16).setCellValue(bd(r.getPlChiPhi()));
                row.createCell(17).setCellValue(bd(r.getDgChiPhi()));
                row.createCell(18).setCellValue(bd(r.getSigmaCong()));
                row.createCell(19).setCellValue(bd(r.getTemDb()));
                row.createCell(20).setCellValue(r.getDoDangDg() != null ? r.getDoDangDg() : 0);
                row.createCell(21).setCellValue(r.getTpNhapKho() != null ? r.getTpNhapKho() : 0);
                row.createCell(22).setCellValue(bd(r.getSoSpCong()));
                row.createCell(23).setCellValue(nvl(r.getCreatedBy()));
                row.createCell(24).setCellValue(r.getCreatedAt() != null ? r.getCreatedAt().toString() : "");
            }

            for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            wb.write(bos);
            return bos.toByteArray();
        }
    }

    private ProductionRecord mapToEntity(ProductionRecordDto dto) {
        ProductionRecord r = new ProductionRecord();
        updateEntity(r, dto);
        return r;
    }

    private void updateEntity(ProductionRecord r, ProductionRecordDto dto) {
        r.setMaTp(dto.getMaTp());
        r.setMaBravo(dto.getMaBravo());
        r.setTienTrinh(dto.getTienTrinh());
        r.setLsx(dto.getLsx());
        r.setMaDonHang(dto.getMaDonHang());
        r.setSoLuong(dto.getSoLuong());
        r.setPcTrangThai(dto.getPcTrangThai());
        r.setPlTrangThai(dto.getPlTrangThai());
        r.setDgTrangThai(dto.getDgTrangThai());
        r.setBbc1TrangThai(dto.getBbc1TrangThai());
        r.setBbc1_1(dto.getBbc1_1());
        r.setSlPc(dto.getSlPc());
        r.setPcPl(dto.getPcPl());
        r.setDg2(dto.getDg2());
        r.setBbc1_2(dto.getBbc1_2());
        r.setSpTrungGian(dto.getSpTrungGian());
        r.setTongBtp(dto.getTongBtp());
        r.setBbc1_3(dto.getBbc1_3());
        r.setPcChiPhi(dto.getPcChiPhi());
        r.setPlChiPhi(dto.getPlChiPhi());
        r.setDgChiPhi(dto.getDgChiPhi());
        r.setTemDb(dto.getTemDb());
        r.setTpNhapKho(dto.getTpNhapKho());
        r.setSoSpCong(dto.getSoSpCong());
        r.setSlTrungBinh(dto.getSlTrungBinh());
        r.setMoTa(dto.getMoTa());
        r.setQaLayMau(dto.getQaLayMau());
        if (dto.getPhatLenh() != null) r.setPhatLenh(dto.getPhatLenh());
    }

    public List<ProductionRecord> getWipDg() {
        List<ProductionRecord> list = enrichWithSlTrungBinh(repository.findWipDg());
        list.forEach(r -> {
            if (r.getMaTp() != null) {
                productMasterRepository.findByMaTpIgnoreCase(r.getMaTp()).ifPresent(pm ->
                    r.setMayMoc(pm.getMayMocDg()));
            }
        });
        return list;
    }

    public List<ProductionRecord> getWipPc() {
        List<ProductionRecord> list = repository.findWipPc();
        org.springframework.data.domain.Pageable limit1 = org.springframework.data.domain.PageRequest.of(0, 1);
        list.forEach(r -> {
            if (r.getMaTp() != null) {
                productMasterRepository.findByMaTpIgnoreCase(r.getMaTp()).ifPresent(pm -> {
                    r.setSlTrungBinh(pm.getNangSuatPc());
                    r.setMayMoc(pm.getMayMocPc());
                });
                String tenTrinh = isEmpty(r.getTienTrinh()) ? null : r.getTienTrinh();
                String soLo = isEmpty(r.getLsx()) ? null : r.getLsx();
                workScheduleRepository.findToNhomByPcTriplet(r.getMaTp(), tenTrinh, soLo, limit1)
                        .stream().filter(t -> t != null && !t.isBlank()).findFirst().ifPresent(r::setToNhom);
            }
        });
        return list;
    }

    public List<ProductionRecord> getWipPl() {
        List<ProductionRecord> list = repository.findWipPl();
        list.forEach(r -> {
            if (r.getMaTp() != null) {
                productMasterRepository.findByMaTpIgnoreCase(r.getMaTp()).ifPresent(pm -> {
                    r.setSlTrungBinh(pm.getNangSuatPl());
                    r.setMayMoc(pm.getMayMocPl());
                });
            }
        });
        return list;
    }

    public List<ProductionRecord> getWipBbc1() {
        List<ProductionRecord> list = repository.findWipBbc1();
        list.forEach(r -> {
            if (r.getMaTp() != null) {
                productMasterRepository.findByMaTpIgnoreCase(r.getMaTp()).ifPresent(pm -> {
                    r.setSlTrungBinh(pm.getNangSuatBbc1());
                    r.setMayMoc(pm.getMayMocBbc1());
                });
            }
        });
        return list;
    }

    private List<ProductionRecord> enrichWithSlTrungBinh(List<ProductionRecord> list) {
        list.forEach(r -> {
            if (r.getMaTp() != null) {
                productMasterRepository.findByMaTpIgnoreCase(r.getMaTp()).ifPresent(pm ->
                    r.setSlTrungBinh(pm.getSlTrungBinh()));
            }
        });
        return list;
    }

    private void enrichToNhom(List<ProductionRecord> content) {
        if (content.isEmpty()) return;
        List<String> maSps = content.stream()
                .map(ProductionRecord::getMaTp)
                .filter(s -> s != null && !s.isBlank())
                .distinct().collect(Collectors.toList());
        if (maSps.isEmpty()) return;
        Map<String, String> toNhomMap = new HashMap<>();
        workScheduleRepository.findToNhomForPcBatch(maSps).forEach(row -> {
            String key = s(row[0]) + "|" + s(row[1]) + "|" + s(row[2]);
            if (row[3] != null && !row[3].toString().isBlank())
                toNhomMap.put(key, row[3].toString());
        });
        content.forEach(r -> {
            String key = s(r.getMaTp()) + "|" + s(r.getTienTrinh()) + "|" + s(r.getLsx());
            r.setToNhom(toNhomMap.get(key));
        });
    }

    private String s(Object o) { return o != null ? o.toString() : ""; }

    private boolean isEmpty(String s) { return s == null || s.isBlank(); }
    private String nvl(String s) { return s != null ? s : ""; }
    private double bd(BigDecimal b) { return b != null ? b.doubleValue() : 0.0; }
}
