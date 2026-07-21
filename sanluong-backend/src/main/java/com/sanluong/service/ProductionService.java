package com.sanluong.service;

import com.sanluong.dto.ProductionRecordDto;
import com.sanluong.entity.NhapKhoAuditLog;
import com.sanluong.entity.NhapKhoTongHopNgay;
import com.sanluong.entity.ProductionEditHistory;
import com.sanluong.entity.ProductionRecord;
import com.sanluong.entity.WorkSchedule;
import com.sanluong.entity.WorkScheduleSession;
import com.sanluong.repository.LenhSanXuatRepository;
import com.sanluong.repository.NhapKhoAuditLogRepository;
import com.sanluong.repository.NhapKhoTongHopNgayRepository;
import com.sanluong.repository.ProductionEditHistoryRepository;
import com.sanluong.repository.ProductionRecordRepository;
import com.sanluong.repository.ProductMasterRepository;
import com.sanluong.repository.WorkScheduleRepository;
import com.sanluong.repository.WorkScheduleSessionRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.*;
import org.springframework.data.domain.*;
import org.springframework.web.multipart.MultipartFile;
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
    private final WorkScheduleSessionRepository workScheduleSessionRepository;
    private final WorkScheduleService workScheduleService;
    private final ProductionEditHistoryRepository historyRepository;
    private final NotificationService notificationService;
    private final KhoachEventPublisher khoachEventPublisher;
    private final SanLuongTongHopService sanLuongTongHopService;
    private final NhapKhoTongHopNgayRepository nhapKhoTongHopNgayRepository;
    private final NhapKhoAuditLogRepository nhapKhoAuditLogRepository;

    public ProductionService(ProductionRecordRepository repository,
                             ProductMasterRepository productMasterRepository,
                             LenhSanXuatRepository lenhSanXuatRepository,
                             WorkScheduleRepository workScheduleRepository,
                             WorkScheduleSessionRepository workScheduleSessionRepository,
                             WorkScheduleService workScheduleService,
                             ProductionEditHistoryRepository historyRepository,
                             NotificationService notificationService,
                             KhoachEventPublisher khoachEventPublisher,
                             SanLuongTongHopService sanLuongTongHopService,
                             NhapKhoTongHopNgayRepository nhapKhoTongHopNgayRepository,
                             NhapKhoAuditLogRepository nhapKhoAuditLogRepository) {
        this.repository = repository;
        this.productMasterRepository = productMasterRepository;
        this.lenhSanXuatRepository = lenhSanXuatRepository;
        this.workScheduleRepository = workScheduleRepository;
        this.workScheduleSessionRepository = workScheduleSessionRepository;
        this.workScheduleService = workScheduleService;
        this.historyRepository = historyRepository;
        this.notificationService = notificationService;
        this.khoachEventPublisher = khoachEventPublisher;
        this.sanLuongTongHopService = sanLuongTongHopService;
        this.nhapKhoTongHopNgayRepository = nhapKhoTongHopNgayRepository;
        this.nhapKhoAuditLogRepository = nhapKhoAuditLogRepository;
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
                                         String lsx, String trangThai, Boolean hoanThanh, Boolean hoSoHoanThien, int page, int size) {
        List<ProductionRecord> all = repository.searchAll(
                isEmpty(maTp) ? null : maTp,
                isEmpty(maBravo) ? null : maBravo,
                isEmpty(tienTrinh) ? null : tienTrinh,
                isEmpty(lsx) ? null : lsx,
                isEmpty(trangThai) ? null : trangThai
        );
        if (Boolean.TRUE.equals(hoSoHoanThien)) {
            // Tab TỔNG KẾ HỒ SƠ: chỉ lấy bản ghi được đánh dấu hoSoHoanThien
            all = all.stream().filter(r -> Boolean.TRUE.equals(r.getHoSoHoanThien())).collect(Collectors.toList());
        } else {
            // Mọi tab khác: loại bỏ hoSoHoanThien khỏi kết quả
            all = all.stream().filter(r -> !Boolean.TRUE.equals(r.getHoSoHoanThien())).collect(Collectors.toList());
            if (hoanThanh != null) {
                enrichPcplStatus(all); // phải enrich trước để pcpl1/pcpl2TrangThai không null khi filter
                all = all.stream().filter(r -> {
                    // PC done nếu bất kỳ PCPL1 hoặc PCPL2 done (OR logic)
                    boolean pcDone = "done".equals(r.getPcTrangThai())
                            || "done".equals(r.getPcpl1TrangThai())
                            || "done".equals(r.getPcpl2TrangThai());
                    boolean done = pcDone
                            && "done".equals(r.getPlTrangThai())
                            && "done".equals(r.getDgTrangThai())
                            && "done".equals(r.getBbc1TrangThai());
                    return hoanThanh ? done : !done;
                }).collect(Collectors.toList());
            }
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
        enrichPcplStatus(content);
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

        boolean nowDone = "done".equals(saved.getPcTrangThai())
                && "done".equals(saved.getPlTrangThai())
                && "done".equals(saved.getDgTrangThai())
                && "done".equals(saved.getBbc1TrangThai());
        if (nowDone) {
            sanLuongTongHopService.createFromProductionIfAbsent(saved, username);
        }

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

    public int bulkDelete(List<Long> ids, String username) {
        if (ids == null || ids.isEmpty()) return 0;
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        List<ProductionRecord> list = repository.findAllById(ids);
        list.forEach(r -> { r.setDeletedAt(now); r.setDeletedBy(username); });
        repository.saveAll(list);
        return list.size();
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
        // Fallback: lấy từ WorkSchedule (Kế hoạch PLAN) nếu LenhSanXuat không có toThucHien
        if (isEmpty(toNhomPcpl) && !isEmpty(r.getMaTp())) {
            java.util.List<String> wb = workScheduleRepository.findToNhomByPcTriplet(
                    r.getMaTp(), null, isEmpty(r.getLsx()) ? null : r.getLsx(),
                    org.springframework.data.domain.PageRequest.of(0, 1));
            if (!wb.isEmpty() && !isEmpty(wb.get(0))) toNhomPcpl = wb.get(0);
        }
        // Cập nhật toNhom trên record nếu khác (sửa sai từ code cũ hoặc lần đầu set)
        if (!isEmpty(toNhomPcpl) && !toNhomPcpl.equals(r.getToNhom())) {
            saveFieldHistory(changes, id, "toNhom", str(r.getToNhom()), toNhomPcpl, username, now);
            r.setToNhom(toNhomPcpl);
        }
        // PC, PL, ĐG, BBC1: luôn doing khi phát lệnh (bất kể tổ nào)
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

        r.setUpdatedBy(username);
        ProductionRecord saved = repository.save(r);
        if (!changes.isEmpty()) historyRepository.saveAll(changes);
        // @Transient field bị mất sau JPA merge — khôi phục để frontend nhận đúng toNhom
        if (!isEmpty(toNhomPcpl)) saved.setToNhom(toNhomPcpl);
        // Tự động sync WorkSchedule ngay tại backend — không cần frontend gọi thêm
        java.math.BigDecimal coLo = r.getSoLuong() != null
                ? new java.math.BigDecimal(r.getSoLuong()) : null;
        workScheduleService.autoSyncFromProduction(
                r.getMaBravo(), r.getMaTp(), r.getTienTrinh(),
                r.getLsx(), coLo, r.getMaDonHang(),
                true, toNhomPcpl);
        // Bước 1: đảm bảo tất cả tab lịch sản xuất đã có bản ghi SCHEDULE
        // với key maBravo + maDonHang + soLo. PCPL1/PCPL2 là congDoan riêng biệt.
        if (!isEmpty(r.getMaBravo())) {
            String soLoKey      = isEmpty(r.getLsx())       ? null : r.getLsx();
            String maDonHangKey = isEmpty(r.getMaDonHang()) ? null : r.getMaDonHang();
            String maTpKey      = isEmpty(r.getMaTp())      ? null : r.getMaTp();
            String[] tabStages  = {"PCPL1", "PCPL2", "BBC1", "PL", "DG", "CC"};
            boolean anyCreated = false;
            for (String stage : tabStages) {
                // Bug fix: dùng findFirst (bỏ qua maDonHang) — nhất quán với autoSyncFromProduction
                // tránh tạo bản ghi trùng khi maDonHang trên record khác với record đã có
                boolean exists = workScheduleRepository
                        .findFirstScheduleByCongDoanAndKey(stage, r.getMaBravo(), maTpKey, soLoKey)
                        .isPresent();
                if (!exists) {
                    WorkSchedule ws = new WorkSchedule();
                    ws.setSource("SCHEDULE");
                    ws.setCongDoan(stage);
                    ws.setMaBravo(r.getMaBravo());
                    ws.setMaSp(maTpKey);
                    ws.setTenTrinh(isEmpty(r.getTienTrinh()) ? null : r.getTienTrinh());
                    ws.setSoLo(soLoKey);
                    ws.setMaDonHang(maDonHangKey);
                    ws.setCoLo(coLo);
                    ws.setNgayThucHien(java.time.LocalDate.now());
                    // PCPL1/PCPL2: chỉ set "doing" cho đúng group theo toNhomPcpl
                    // BBC1/PL/DG: luôn doing; CC: không set
                    boolean shouldDoing = !"CC".equals(stage);
                    if (shouldDoing && ("PCPL1".equals(stage) || "PCPL2".equals(stage)) && toNhomPcpl != null) {
                        shouldDoing = stage.equals(toNhomPcpl);
                    }
                    if (shouldDoing) ws.setTinhTrang("doing");
                    workScheduleRepository.save(ws);
                    anyCreated = true;
                }
            }
            if (anyCreated) khoachEventPublisher.publishKhoachUpdated();
        }
        return saved;
    }

    public long countChuaPhatLenh() {
        return repository.countChuaPhatLenhNative();
    }

    /** Tạo bổ sung WorkSchedule SCHEDULE cho tất cả records đã phatLenh nhưng thiếu bản ghi công đoạn */
    public int syncScheduleAll() {
        List<ProductionRecord> daPhat = repository.searchAll(null, null, null, null, null)
                .stream().filter(r -> Boolean.TRUE.equals(r.getPhatLenh()) && r.getDeletedAt() == null)
                .collect(Collectors.toList());
        int total = 0;
        for (ProductionRecord r : daPhat) {
            if (isEmpty(r.getMaBravo()) && isEmpty(r.getMaTp())) continue;
            java.math.BigDecimal coLo = r.getSoLuong() != null
                    ? new java.math.BigDecimal(r.getSoLuong()) : null;
            String toNhomPcpl = null;
            if (!isEmpty(r.getMaBravo())) {
                toNhomPcpl = lenhSanXuatRepository
                        .findFirstByMaBravoAndSoLo(r.getMaBravo(), isEmpty(r.getLsx()) ? null : r.getLsx())
                        .map(l -> isEmpty(l.getToThucHien()) ? null : l.getToThucHien())
                        .orElse(null);
            }
            total += workScheduleService.autoSyncFromProduction(
                    r.getMaBravo(), r.getMaTp(), r.getTienTrinh(),
                    r.getLsx(), coLo, r.getMaDonHang(), true, toNhomPcpl);
        }
        return total;
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

    public java.util.List<ProductionRecord> findHidden() {
        return repository.findAllHidden();
    }

    public void unhide(Long id) {
        ProductionRecord r = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi ID: " + id));
        r.setHidden(false);
        repository.save(r);
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

    public ProductionRecord toggleHoSoHoanThien(Long id, String username) {
        ProductionRecord r = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi ID: " + id));
        boolean next = !Boolean.TRUE.equals(r.getHoSoHoanThien());
        r.setHoSoHoanThien(next);
        r.setHoSoHoanThienAt(next ? LocalDateTime.now() : null);
        r.setUpdatedBy(username);
        return repository.save(r);
    }

    public List<ProductionRecord> getNhapKho(java.time.LocalDate fromDate, java.time.LocalDate toDate) {
        return repository.findNhapKho(fromDate, toDate);
    }

    public List<java.util.Map<String, Object>> getNhapKhoTongHop() {
        List<ProductionRecord> masters = repository.findAllPhatLenh();
        List<ProductionRecord> allNk   = repository.findAllNhapKhoEntries();

        // Group nhapkho entries by "maBravo|lsx|maDonHang" to avoid double-counting
        // when multiple lệnh share the same maBravo+lsx but differ in maDonHang
        java.util.Map<String, Integer>             sumMap     = new java.util.HashMap<>();
        java.util.Map<String, Integer>             cntMap     = new java.util.HashMap<>();
        java.util.Map<String, java.time.LocalDate> maxDateMap = new java.util.HashMap<>();
        for (ProductionRecord r : allNk) {
            String key = mkKey(r.getMaBravo(), r.getLsx(), r.getMaDonHang());
            sumMap.merge(key, r.getTpNhapKho() != null ? r.getTpNhapKho() : 0, Integer::sum);
            cntMap.merge(key, 1, Integer::sum);
            if (r.getNgayXuatKho() != null) {
                maxDateMap.merge(key, r.getNgayXuatKho(),
                        (a, b) -> a.isAfter(b) ? a : b);
            }
        }

        // Track which keys have been assigned to avoid double-counting
        // when multiple master records share the same maBravo+lsx+maDonHang
        java.util.Set<String> assignedKeys = new java.util.HashSet<>();
        java.util.List<java.util.Map<String, Object>> result = new java.util.ArrayList<>();
        for (ProductionRecord r : masters) {
            String key = mkKey(r.getMaBravo(), r.getLsx(), r.getMaDonHang());
            boolean firstAssign = assignedKeys.add(key);
            java.util.Map<String, Object> row = new java.util.LinkedHashMap<>();
            row.put("id",                  r.getId());
            row.put("maBravo",             r.getMaBravo());
            row.put("maTp",                r.getMaTp());
            row.put("tienTrinh",           r.getTienTrinh());
            row.put("lsx",                 r.getLsx());
            row.put("soLuong",             r.getSoLuong());
            row.put("maDonHang",           r.getMaDonHang());
            row.put("dg2",                 r.getDg2());
            row.put("pcPl",                r.getPcPl());
            row.put("totalNhapKho",        firstAssign ? sumMap.getOrDefault(key, 0) : 0);
            row.put("soLanNhapKho",        firstAssign ? cntMap.getOrDefault(key, 0) : 0);
            row.put("ngayNhapKhoMoiNhat",  firstAssign ? maxDateMap.get(key) : null);
            row.put("hoSoHoanThien",       Boolean.TRUE.equals(r.getHoSoHoanThien()));
            result.add(row);
        }
        return result;
    }

    private static String mkKey(String maBravo, String lsx) {
        return (maBravo == null ? "" : maBravo) + "|" + (lsx == null ? "" : lsx);
    }

    private static String mkKey(String maBravo, String lsx, String maDonHang) {
        return (maBravo == null ? "" : maBravo) + "|" + (lsx == null ? "" : lsx) + "|" + (maDonHang == null ? "" : maDonHang);
    }

    public ProductionRecord createNhapKhoEntry(Long sourceId, java.util.Map<String, String> body, String username) {
        ProductionRecord src = repository.findById(sourceId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi ID: " + sourceId));

        // Nếu source đã có tpNhapKho trực tiếp (lần nhập đầu tiên qua PATCH) nhưng chưa có clone →
        // migrate sang clone để recalc tổng đúng khi có nhiều ngày nhập kho
        List<ProductionRecord> existingClones = repository.findNhapKhoClonesByKey(src.getMaBravo(), src.getLsx());
        if (src.getTpNhapKho() != null && existingClones.isEmpty()) {
            ProductionRecord firstClone = new ProductionRecord();
            firstClone.setMaBravo(src.getMaBravo());
            firstClone.setMaTp(src.getMaTp());
            firstClone.setTienTrinh(src.getTienTrinh());
            firstClone.setLsx(src.getLsx());
            firstClone.setSoLuong(src.getSoLuong());
            firstClone.setMaDonHang(src.getMaDonHang());
            firstClone.setTpNhapKho(src.getTpNhapKho());
            firstClone.setNgayXuatKho(src.getNgayXuatKho());
            firstClone.setTinhTrangNhapKho(src.getTinhTrangNhapKho());
            firstClone.setTenNthNhapKho(src.getTenNthNhapKho());
            firstClone.setGhiChuNhapKho(src.getGhiChuNhapKho());
            firstClone.setCreatedAt(java.time.LocalDateTime.now());
            firstClone.setCreatedBy(username);
            ProductionRecord savedFirstClone = repository.save(firstClone);
            syncNhapKhoTongHopNgay(savedFirstClone);
            logNhapKhoAudit(savedFirstClone, "THEM_MOI", null, username);
        }

        ProductionRecord clone = new ProductionRecord();
        clone.setMaBravo(src.getMaBravo());
        clone.setMaTp(src.getMaTp());
        clone.setTienTrinh(src.getTienTrinh());
        clone.setLsx(src.getLsx());
        clone.setSoLuong(src.getSoLuong());
        clone.setMaDonHang(src.getMaDonHang());
        clone.setCreatedAt(java.time.LocalDateTime.now());
        clone.setCreatedBy(username);
        applyNhapKhoFields(clone, body);
        ProductionRecord saved = repository.save(clone);
        syncNhapKhoTongHopNgay(saved);
        logNhapKhoAudit(saved, "THEM_MOI", null, username);
        recalcSourceTpNhapKho(src.getMaBravo(), src.getLsx(), username);
        return saved;
    }

    public void removeFromNhapKho(Long id, String username) {
        ProductionRecord r = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi ID: " + id));
        String maBravo = r.getMaBravo();
        String lsx     = r.getLsx();
        logNhapKhoAudit(r, "XOA", null, username);
        boolean isNhapKhoOnly = r.getPhatLenh() == null || !r.getPhatLenh();
        boolean hasNoSlData = r.getSlPc() == null && r.getDgTrangThai() == null && r.getPcTrangThai() == null;
        if (isNhapKhoOnly && hasNoSlData) {
            r.setDeletedAt(java.time.LocalDateTime.now());
            r.setDeletedBy(username);
        } else {
            r.setTpNhapKho(null);
            r.setNgayXuatKho(null);
            r.setTinhTrangNhapKho(null);
            r.setTenNthNhapKho(null);
            r.setGhiChuNhapKho(null);
            r.setUpdatedBy(username);
        }
        repository.save(r);
        recalcSourceTpNhapKho(maBravo, lsx, username);
    }

    /** Ghi log lịch sử Nhập Kho — độc lập, không xóa/sửa theo khi bản ghi nguồn thay đổi sau này */
    private void logNhapKhoAudit(ProductionRecord entry, String hanhDong, String thayDoi, String username) {
        NhapKhoAuditLog log = new NhapKhoAuditLog();
        log.setProductionRecordId(entry.getId());
        log.setMaBravo(entry.getMaBravo());
        log.setMaTp(entry.getMaTp());
        log.setTienTrinh(entry.getTienTrinh());
        log.setLsx(entry.getLsx());
        log.setHanhDong(hanhDong);
        log.setTpNhapKho(entry.getTpNhapKho());
        log.setNgayXuatKho(entry.getNgayXuatKho());
        log.setTinhTrangNhapKho(entry.getTinhTrangNhapKho());
        log.setTenNthNhapKho(entry.getTenNthNhapKho());
        log.setGhiChuNhapKho(entry.getGhiChuNhapKho());
        log.setThayDoi(thayDoi);
        log.setChangedBy(username);
        log.setChangedAt(LocalDateTime.now());
        nhapKhoAuditLogRepository.save(log);
    }

    private void applyNhapKhoFields(ProductionRecord r, java.util.Map<String, String> body) {
        if (body.containsKey("maBravo")) {
            String v = body.get("maBravo");
            r.setMaBravo(v != null && !v.isBlank() ? v.trim() : null);
        }
        if (body.containsKey("maTp")) {
            String v = body.get("maTp");
            r.setMaTp(v != null && !v.isBlank() ? v.trim() : null);
        }
        if (body.containsKey("tienTrinh")) {
            String v = body.get("tienTrinh");
            r.setTienTrinh(v != null && !v.isBlank() ? v.trim() : null);
        }
        if (body.containsKey("tpNhapKho")) {
            String v = body.get("tpNhapKho");
            r.setTpNhapKho(v != null && !v.isBlank() ? Integer.parseInt(v) : null);
        }
        if (body.containsKey("ngayXuatKho")) {
            String v = body.get("ngayXuatKho");
            r.setNgayXuatKho(v != null && !v.isBlank() ? java.time.LocalDate.parse(v) : null);
        }
        if (body.containsKey("tinhTrangNhapKho")) {
            String v = body.get("tinhTrangNhapKho");
            r.setTinhTrangNhapKho(v != null && !v.isBlank() ? v : null);
        }
        if (body.containsKey("tenNthNhapKho")) {
            String v = body.get("tenNthNhapKho");
            r.setTenNthNhapKho(v != null && !v.isBlank() ? v : null);
        }
        if (body.containsKey("ghiChuNhapKho")) {
            String v = body.get("ghiChuNhapKho");
            r.setGhiChuNhapKho(v != null && !v.isBlank() ? v : null);
        }
    }

    public ProductionRecord updateNhapKho(Long id, java.util.Map<String, String> body, String username) {
        ProductionRecord r = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi ID: " + id));

        // Nếu đây là bản gốc (phatLenh=true) và body có tpNhapKho → tạo clone thay vì patch trực tiếp
        // để bản ghi xuất hiện đúng trong tab "Ngày Nhập Kho" (chỉ hiện clone)
        if (Boolean.TRUE.equals(r.getPhatLenh()) && body.containsKey("tpNhapKho")) {
            ProductionRecord clone = new ProductionRecord();
            clone.setMaBravo(r.getMaBravo());
            clone.setMaTp(r.getMaTp());
            clone.setTienTrinh(r.getTienTrinh());
            clone.setLsx(r.getLsx());
            clone.setSoLuong(r.getSoLuong());
            clone.setMaDonHang(r.getMaDonHang());
            clone.setCreatedAt(java.time.LocalDateTime.now());
            clone.setCreatedBy(username);
            applyNhapKhoFields(clone, body);
            ProductionRecord saved = repository.save(clone);
            syncNhapKhoTongHopNgay(saved);
            logNhapKhoAudit(saved, "THEM_MOI", null, username);
            recalcSourceTpNhapKho(r.getMaBravo(), r.getLsx(), username);
            return saved;
        }

        // Bản clone hoặc patch không có tpNhapKho → cập nhật trực tiếp
        Integer oldTpNhapKho = r.getTpNhapKho();
        java.time.LocalDate oldNgayXuatKho = r.getNgayXuatKho();
        String oldTinhTrang = r.getTinhTrangNhapKho();
        String oldTenNth = r.getTenNthNhapKho();
        String oldGhiChu = r.getGhiChuNhapKho();
        applyNhapKhoFields(r, body);
        r.setUpdatedBy(username);
        ProductionRecord saved = repository.save(r);
        syncNhapKhoTongHopNgay(saved);
        String thayDoi = buildNhapKhoDiff(oldTpNhapKho, oldNgayXuatKho, oldTinhTrang, oldTenNth, oldGhiChu, saved);
        if (thayDoi != null) logNhapKhoAudit(saved, "SUA", thayDoi, username);
        if (body.containsKey("tpNhapKho")) {
            recalcSourceTpNhapKho(r.getMaBravo(), r.getLsx(), username);
        }
        return saved;
    }

    /** So sánh giá trị cũ/mới của các trường nhập kho, trả về chuỗi tóm tắt (null nếu không đổi gì) */
    private String buildNhapKhoDiff(Integer oldTpNhapKho, java.time.LocalDate oldNgayXuatKho,
                                     String oldTinhTrang, String oldTenNth, String oldGhiChu,
                                     ProductionRecord after) {
        List<String> parts = new ArrayList<>();
        if (!Objects.equals(oldTpNhapKho, after.getTpNhapKho()))
            parts.add("SL Nhập Kho: " + fmtOrDash(oldTpNhapKho) + " → " + fmtOrDash(after.getTpNhapKho()));
        if (!Objects.equals(oldNgayXuatKho, after.getNgayXuatKho()))
            parts.add("Ngày xuất: " + fmtOrDash(oldNgayXuatKho) + " → " + fmtOrDash(after.getNgayXuatKho()));
        if (!Objects.equals(oldTinhTrang, after.getTinhTrangNhapKho()))
            parts.add("Tình trạng: " + fmtOrDash(oldTinhTrang) + " → " + fmtOrDash(after.getTinhTrangNhapKho()));
        if (!Objects.equals(oldTenNth, after.getTenNthNhapKho()))
            parts.add("Tên NTH: " + fmtOrDash(oldTenNth) + " → " + fmtOrDash(after.getTenNthNhapKho()));
        if (!Objects.equals(oldGhiChu, after.getGhiChuNhapKho()))
            parts.add("Ghi chú: " + fmtOrDash(oldGhiChu) + " → " + fmtOrDash(after.getGhiChuNhapKho()));
        return parts.isEmpty() ? null : String.join("; ", parts);
    }

    private String fmtOrDash(Object v) { return v == null ? "—" : v.toString(); }

    /**
     * Đồng bộ 1 chiều sang bảng "Tổng hợp theo ngày": tạo/cập nhật bản ghi snapshot
     * ứng với ProductionRecord (clone nhập kho) này. Chỉ đồng bộ khi đây thực sự là
     * một lần nhập kho hợp lệ (không phải bản gốc, có tpNhapKho, chưa bị xóa/ẩn).
     * KHÔNG có chiều ngược lại: xóa ở "Ngày Nhập Kho"/"Nhập Kho" không gọi hàm này
     * nên không ảnh hưởng tới snapshot đã lưu.
     */
    private void syncNhapKhoTongHopNgay(ProductionRecord entry) {
        boolean isClone = entry.getPhatLenh() == null || !entry.getPhatLenh();
        boolean valid = isClone && entry.getTpNhapKho() != null
                && entry.getDeletedAt() == null
                && (entry.getHidden() == null || !entry.getHidden());
        if (!valid) return;
        NhapKhoTongHopNgay snap = nhapKhoTongHopNgayRepository.findBySourceId(entry.getId())
                .orElseGet(NhapKhoTongHopNgay::new);
        snap.setSourceId(entry.getId());
        snap.setMaBravo(entry.getMaBravo());
        snap.setMaTp(entry.getMaTp());
        snap.setTienTrinh(entry.getTienTrinh());
        snap.setLsx(entry.getLsx());
        snap.setTpNhapKho(entry.getTpNhapKho());
        snap.setNgayXuatKho(entry.getNgayXuatKho());
        nhapKhoTongHopNgayRepository.save(snap);
    }

    public List<NhapKhoTongHopNgay> getNhapKhoTongHopNgay(java.time.LocalDate fromDate, java.time.LocalDate toDate) {
        return nhapKhoTongHopNgayRepository.search(fromDate, toDate);
    }

    public void deleteNhapKhoTongHopNgay(Long id) {
        nhapKhoTongHopNgayRepository.deleteById(id);
    }

    public List<NhapKhoAuditLog> getNhapKhoAuditLog(LocalDateTime fromDate, LocalDateTime toDate) {
        return nhapKhoAuditLogRepository.search(fromDate, toDate);
    }

    /** Nạp dữ liệu "Tổng hợp theo ngày" lần đầu từ toàn bộ lần nhập kho đã có sẵn (chỉ chạy khi bảng snapshot còn trống) */
    public void backfillNhapKhoTongHopNgay() {
        if (nhapKhoTongHopNgayRepository.count() > 0) return;
        for (ProductionRecord entry : repository.findAllNhapKhoEntries()) {
            syncNhapKhoTongHopNgay(entry);
        }
    }

    /** Tính lại tổng tpNhapKho từ tất cả clone entries rồi cập nhật lên bản ghi gốc */
    private void recalcSourceTpNhapKho(String maBravo, String lsx, String username) {
        if (maBravo == null || lsx == null) return;
        List<ProductionRecord> clones = repository.findNhapKhoClonesByKey(maBravo, lsx);
        int total = clones.stream()
                .mapToInt(c -> c.getTpNhapKho() != null ? c.getTpNhapKho() : 0)
                .sum();
        List<ProductionRecord> sources = repository.findByMaBravoAndTienTrinhAndLsx(maBravo, null, lsx);
        for (ProductionRecord src : sources) {
            if (Boolean.TRUE.equals(src.getPhatLenh())) {
                src.setTpNhapKho(total > 0 ? total : null);
                src.setUpdatedBy(username);
                repository.save(src);
                break;
            }
        }
    }

    /** Trả về danh sách từng lần nhập kho của bản ghi nguồn (theo maBravo + lsx) */
    public List<java.util.Map<String, Object>> getNhapKhoEntries(Long sourceId) {
        ProductionRecord src = repository.findById(sourceId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi ID: " + sourceId));
        List<ProductionRecord> clones = repository.findNhapKhoClonesByKey(src.getMaBravo(), src.getLsx());

        if (!clones.isEmpty()) {
            return clones.stream()
                    .sorted(java.util.Comparator.comparing(
                            c -> c.getNgayXuatKho() != null ? c.getNgayXuatKho() : java.time.LocalDate.MIN))
                    .map(c -> {
                        java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                        m.put("id", c.getId());
                        m.put("tpNhapKho", c.getTpNhapKho());
                        m.put("ngayXuatKho", c.getNgayXuatKho());
                        m.put("ghiChu", c.getGhiChuNhapKho());
                        return m;
                    }).collect(java.util.stream.Collectors.toList());
        }

        // Chưa có clone (chỉ mới nhập lần đầu trực tiếp trên source)
        if (src.getTpNhapKho() != null) {
            java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", src.getId());
            m.put("tpNhapKho", src.getTpNhapKho());
            m.put("ngayXuatKho", src.getNgayXuatKho());
            m.put("ghiChu", src.getGhiChuNhapKho());
            return java.util.List.of(m);
        }

        return java.util.List.of();
    }

    /** Tính tổng SL Đóng Gói từ các sessions của WorkSchedule ĐG (theo maBravo + lsx) */
    public java.util.Map<String, Object> getDgSanLuong(Long sourceId) {
        ProductionRecord src = repository.findById(sourceId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi ID: " + sourceId));
        if (src.getMaBravo() == null || src.getLsx() == null) {
            return java.util.Map.of("slDg", 0);
        }
        java.util.Optional<WorkSchedule> wsOpt = workScheduleRepository
                .findFirstScheduleByCongDoanAndKey("DG", src.getMaBravo(), null, src.getLsx());
        if (wsOpt.isEmpty()) {
            return java.util.Map.of("slDg", 0);
        }
        BigDecimal total = workScheduleSessionRepository
                .findByWorkScheduleIdOrderByNgayAscIdAsc(wsOpt.get().getId())
                .stream()
                .filter(s -> s.getSanLuong() != null)
                .map(WorkScheduleSession::getSanLuong)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return java.util.Map.of("slDg", total);
    }

    public ProductionRecord updateGhiChuHieuSuat(Long id, String ghiChu) {
        ProductionRecord r = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi ID: " + id));
        r.setGhiChuHieuSuat(ghiChu);
        return repository.save(r);
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

    // ── Import Excel ──────────────────────────────────────────────────────────

    public byte[] generateImportTemplate() throws IOException {
        try (XSSFWorkbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            XSSFCellStyle reqStyle = wb.createCellStyle();
            reqStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte)30,(byte)69,(byte)112}, null));
            reqStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            reqStyle.setBorderBottom(BorderStyle.THIN);
            reqStyle.setAlignment(HorizontalAlignment.CENTER);
            reqStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            XSSFFont reqFont = wb.createFont();
            reqFont.setColor(new XSSFColor(new byte[]{(byte)255,(byte)255,(byte)255}, null));
            reqFont.setBold(true); reqFont.setFontHeightInPoints((short)11);
            reqStyle.setFont(reqFont);

            XSSFCellStyle optStyle = wb.createCellStyle();
            optStyle.cloneStyleFrom(reqStyle);
            optStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte)68,(byte)114,(byte)196}, null));

            // Nhóm Sản lượng — nền xanh lá nhạt
            XSSFCellStyle slStyle = wb.createCellStyle();
            slStyle.cloneStyleFrom(reqStyle);
            slStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte)0,(byte)97,(byte)0}, null));

            // Nhóm Chi phí công — nền cam
            XSSFCellStyle cpStyle = wb.createCellStyle();
            cpStyle.cloneStyleFrom(reqStyle);
            cpStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte)120,(byte)60,(byte)0}, null));

            // Nhóm Hiệu suất / QA — nền tím
            XSSFCellStyle hsStyle = wb.createCellStyle();
            hsStyle.cloneStyleFrom(reqStyle);
            hsStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte)60,(byte)0,(byte)120}, null));

            XSSFCellStyle dataStyle = wb.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN); dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);
            dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            XSSFSheet sheet = wb.createSheet("SanLuong");

            // col 0-9: thông tin cơ bản + trạng thái
            // col 10-16: sản lượng từng công đoạn
            // col 17-21: chi phí công
            // col 22-25: hiệu suất / QA / ghi chú
            String[] headers = {
                "Mã Bravo (*)", "Mã TP (*)", "Tiến Trình / Tên SP",
                "LSX / Số Lô", "Số Lượng KH", "Mã Đơn Hàng",
                "PC Trạng thái", "PL Trạng thái", "ĐG Trạng thái", "BBC1 Trạng thái",
                // Sản lượng
                "SL PC", "BBC1 Ngày phối", "SL PL (PC→PL)", "SL ĐG",
                "SL BBC1", "SP Trung gian", "TP Nhập kho",
                // Chi phí công
                "Công BBC1", "Công PC", "Công PL", "Công ĐG", "Công CC", "Công GNNL",
                // Hiệu suất & QA
                "SL Trung bình", "QA PL Lấy mẫu", "QA ĐG Lấy mẫu", "Mô tả", "Ghi chú hiệu suất"
            };
            // style index per column
            XSSFCellStyle[] colStyles = {
                reqStyle, reqStyle, optStyle, optStyle, optStyle, optStyle,
                optStyle, optStyle, optStyle, optStyle,
                slStyle, slStyle, slStyle, slStyle, slStyle, slStyle, slStyle,
                cpStyle, cpStyle, cpStyle, cpStyle, cpStyle, cpStyle,
                hsStyle, hsStyle, hsStyle, hsStyle, hsStyle
            };
            int[] widths = {
                16, 12, 40, 16, 14, 16, 16, 16, 16, 16,
                12, 14, 15, 12, 12, 14, 14,
                12, 12, 12, 12, 12, 12,
                14, 14, 14, 30, 30
            };

            Row hRow = sheet.createRow(0);
            hRow.setHeightInPoints(22);
            for (int c = 0; c < headers.length; c++) {
                Cell cell = hRow.createCell(c);
                cell.setCellValue(headers[c]);
                cell.setCellStyle(colStyles[c]);
                sheet.setColumnWidth(c, widths[c] * 256);
            }

            // 3 dòng mẫu — chỉ điền các cột cơ bản
            String[][] samples = {
                {"10101205","TP205","Son Lụa Diễm 104","2506001","2000","206150626","doing","doing","","",
                 "","","","","","","","","","","","","","","","","","",""},
                {"10202287","TP287","Xịt khoáng hoa hồng Mineral Rose","2506002","5000","287070626","done","doing","doing","doing",
                 "","","","","","","","","","","","","","","","","","",""},
                {"10108272","TP272","Son dưỡng nhiên 202","2506003","1500","","doing","","","",
                 "","","","","","","","","","","","","","","","","","",""},
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

            // Dropdown doing/done cho các cột trạng thái (6-9)
            String[] ttOptions = {"doing", "done", ""};
            DataValidationHelper dvH = sheet.getDataValidationHelper();
            for (int col : new int[]{6, 7, 8, 9}) {
                DataValidationConstraint c = dvH.createExplicitListConstraint(ttOptions);
                DataValidation dv = dvH.createValidation(c, new CellRangeAddressList(1, 500, col, col));
                dv.setShowErrorBox(false);
                sheet.addValidationData(dv);
            }

            // Hướng dẫn sheet
            XSSFSheet guide = wb.createSheet("Hướng Dẫn");
            String[] notes = {
                "HƯỚNG DẪN IMPORT SẢN LƯỢNG",
                "",
                "Cột bắt buộc (nền xanh đậm) — cột A, B:",
                "  - Mã Bravo (*): mã bravo của sản phẩm",
                "  - Mã TP (*):    mã thành phẩm (Song An)",
                "",
                "Thông tin cơ bản (nền xanh nhạt) — cột C÷J:",
                "  - Tiến Trình / Tên SP",
                "  - LSX / Số Lô",
                "  - Số Lượng KH: số nguyên",
                "  - Mã Đơn Hàng",
                "  - PC/PL/ĐG/BBC1 Trạng thái: 'doing' hoặc 'done'",
                "",
                "Sản lượng công đoạn (nền xanh lá) — cột K÷Q:",
                "  - SL PC, BBC1 Ngày phối, SL PL, SL ĐG, SL BBC1: số nguyên",
                "  - SP Trung gian, TP Nhập kho: số nguyên",
                "",
                "Chi phí công (nền cam) — cột R÷W:",
                "  - Công BBC1, Công PC, Công PL, Công ĐG, Công CC: số thực (vd: 1.25)",
                "  - Công GNNL: số thực (nguyên nhân lỗi / chi phí GNNL)",
                "",
                "Hiệu suất & QA (nền tím) — cột X÷AB:",
                "  - SL Trung bình: số thực",
                "  - QA PL Lấy mẫu: số nguyên (lấy mẫu công đoạn PL)",
                "  - QA ĐG Lấy mẫu: số nguyên (lấy mẫu công đoạn ĐG)",
                "  - Mô tả, Ghi chú hiệu suất: văn bản",
                "",
                "Lưu ý:",
                "  - Bản ghi trùng (Mã Bravo + LSX + Mã Đơn Hàng) sẽ bị bỏ qua",
                "  - Dòng thiếu Mã Bravo hoặc Mã TP sẽ bị bỏ qua",
                "  - Các cột tự tính (Tổng BTP, Dở dang ĐG, Σ Cộng, SP/Công) KHÔNG cần nhập",
                "  - Không xóa dòng header (dòng 1)",
            };
            for (int i = 0; i < notes.length; i++) {
                Row row = guide.createRow(i);
                row.createCell(0).setCellValue(notes[i]);
            }
            guide.setColumnWidth(0, 80 * 256);

            wb.write(out);
            return out.toByteArray();
        }
    }

    public Map<String, Object> importFromExcel(MultipartFile file, String username) throws IOException {
        int created = 0, skipped = 0;
        List<String> errors = new ArrayList<>();

        try (Workbook wb = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                String maBravo = cellStr(row, 0);
                String maTp    = cellStr(row, 1);
                if (maBravo.isBlank() && maTp.isBlank()) continue;
                if (maBravo.isBlank() || maTp.isBlank()) {
                    errors.add("Dòng " + (i + 1) + ": thiếu Mã Bravo hoặc Mã TP");
                    continue;
                }

                // Cột 2-9: thông tin cơ bản + trạng thái
                String tienTrinh  = cellStr(row, 2);
                String lsx        = cellStr(row, 3);
                String soLuongStr = cellStr(row, 4);
                String maDonHang  = cellStr(row, 5);
                String pcTT       = normTT(cellStr(row, 6));
                String plTT       = normTT(cellStr(row, 7));
                String dgTT       = normTT(cellStr(row, 8));
                String bbc1TT     = normTT(cellStr(row, 9));

                // Cột 10-16: sản lượng công đoạn
                String slPc         = cellStr(row, 10);
                String bbc1_1       = cellStr(row, 11);
                String pcPl         = cellStr(row, 12);
                String dg2          = cellStr(row, 13);
                String bbc1_2       = cellStr(row, 14);
                String spTrungGian  = cellStr(row, 15);
                String tpNhapKho    = cellStr(row, 16);

                // Cột 17-21: chi phí công
                String congBbc1  = cellStr(row, 17);
                String congPc    = cellStr(row, 18);
                String congPl    = cellStr(row, 19);
                String congDg    = cellStr(row, 20);
                String congCc    = cellStr(row, 21);

                // Cột 22: chi phí GNNL; cột 23-27: hiệu suất & QA
                String congGnnl       = cellStr(row, 22);
                String slTrungBinh    = cellStr(row, 23);
                String plQaLayMau     = cellStr(row, 24);
                String dgQaLayMau     = cellStr(row, 25);
                String moTa           = cellStr(row, 26);
                String ghiChuHieuSuat = cellStr(row, 27);

                if (existsByKey(maBravo, lsx, maDonHang.isBlank() ? null : maDonHang)) {
                    skipped++;
                    continue;
                }

                ProductionRecordDto dto = new ProductionRecordDto();
                dto.setMaBravo(maBravo);
                dto.setMaTp(maTp);
                dto.setTienTrinh(tienTrinh.isBlank() ? null : tienTrinh);
                dto.setLsx(lsx.isBlank() ? null : lsx);
                dto.setMaDonHang(maDonHang.isBlank() ? null : maDonHang);
                dto.setPcTrangThai(pcTT);
                dto.setPlTrangThai(plTT);
                dto.setDgTrangThai(dgTT);
                dto.setBbc1TrangThai(bbc1TT);

                parseIntCell(soLuongStr,   dto::setSoLuong);
                parseIntCell(spTrungGian,  dto::setSpTrungGian);
                parseIntCell(tpNhapKho,    dto::setTpNhapKho);
                parseBdCell(congBbc1,      dto::setBbc1_3);
                parseBdCell(congPc,        dto::setPcChiPhi);
                parseBdCell(congPl,        dto::setPlChiPhi);
                parseBdCell(congDg,        dto::setDgChiPhi);
                parseBdCell(congCc,        dto::setCcChiPhi);
                parseBdCell(congGnnl,      dto::setTemDb);
                parseBdCell(slTrungBinh,   dto::setSlTrungBinh);
                parseIntCell(plQaLayMau,   dto::setPlQaLayMau);
                parseIntCell(dgQaLayMau,   dto::setDgQaLayMau);

                if (!slPc.isBlank())   dto.setSlPc(slPc);
                if (!bbc1_1.isBlank()) dto.setBbc1_1(bbc1_1);
                if (!pcPl.isBlank())   dto.setPcPl(pcPl);
                if (!dg2.isBlank())    dto.setDg2(dg2);
                if (!bbc1_2.isBlank()) dto.setBbc1_2(bbc1_2);
                if (!moTa.isBlank())           dto.setMoTa(moTa);
                if (!ghiChuHieuSuat.isBlank()) dto.setGhiChuHieuSuat(ghiChuHieuSuat);

                try {
                    create(dto, username);
                    created++;
                } catch (Exception e) {
                    errors.add("Dòng " + (i + 1) + ": " + e.getMessage());
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("created", created);
        result.put("skipped", skipped);
        result.put("errors", errors);
        return result;
    }

    private void parseIntCell(String val, java.util.function.Consumer<Integer> setter) {
        if (val == null || val.isBlank()) return;
        try { setter.accept((int) Double.parseDouble(val)); } catch (NumberFormatException ignored) {}
    }

    private void parseBdCell(String val, java.util.function.Consumer<BigDecimal> setter) {
        if (val == null || val.isBlank()) return;
        try { setter.accept(new BigDecimal(val)); } catch (NumberFormatException ignored) {}
    }

    private String cellStr(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                double d = cell.getNumericCellValue();
                yield d == Math.floor(d) ? String.valueOf((long) d) : String.valueOf(d);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> "";
        };
    }

    private String normTT(String v) {
        if (v == null) return null;
        return switch (v.toLowerCase().trim()) {
            case "doing" -> "doing";
            case "done"  -> "done";
            default      -> null;
        };
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
        r.setGhiChuHieuSuat(dto.getGhiChuHieuSuat());
        r.setQaLayMau(dto.getQaLayMau());
        r.setPlQaLayMau(dto.getPlQaLayMau());
        r.setPlQaKiemNghiem(dto.getPlQaKiemNghiem());
        r.setPlQaLuuMau(dto.getPlQaLuuMau());
        r.setPlQaKhac(dto.getPlQaKhac());
        r.setDgQaLayMau(dto.getDgQaLayMau());
        r.setDgQaKiemNghiem(dto.getDgQaKiemNghiem());
        r.setDgQaLuuMau(dto.getDgQaLuuMau());
        r.setDgQaKhac(dto.getDgQaKhac());
        if (dto.getPhatLenh() != null) r.setPhatLenh(dto.getPhatLenh());
    }

    public List<ProductionRecord> getWipDg() {
        List<ProductionRecord> list = enrichWithSlTrungBinh(repository.findWipDg());
        list.forEach(r -> {
            if (r.getMaTp() != null) {
                productMasterRepository.findByMaTpIgnoreCase(r.getMaTp()).ifPresent(pm -> {
                    r.setMayMoc(pm.getMayMocDg());
                    r.setLoaiSanPham(pm.getLoaiSanPham());
                });
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
                    r.setLoaiSanPham(pm.getLoaiSanPham());
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
                    r.setLoaiSanPham(pm.getLoaiSanPham());
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
                    r.setLoaiSanPham(pm.getLoaiSanPham());
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

    private void enrichPcplStatus(List<ProductionRecord> content) {
        if (content.isEmpty()) return;
        List<String> maBravos = content.stream()
                .map(ProductionRecord::getMaBravo)
                .filter(b -> b != null && !b.isBlank())
                .distinct().collect(Collectors.toList());
        if (maBravos.isEmpty()) return;
        // key = maBravo|soLo|congDoan -> tinhTrang
        Map<String, String> statusMap = new HashMap<>();
        workScheduleRepository.findPcplStatusBatch(maBravos).forEach(row -> {
            String key = s(row[0]) + "|" + s(row[1]) + "|" + s(row[2]);
            if (row[3] != null) statusMap.put(key, row[3].toString());
        });
        content.forEach(r -> {
            String bravo = s(r.getMaBravo());
            String soLo  = s(r.getLsx());
            r.setPcpl1TrangThai(statusMap.get(bravo + "|" + soLo + "|PCPL1"));
            r.setPcpl2TrangThai(statusMap.get(bravo + "|" + soLo + "|PCPL2"));
        });
    }

    private String s(Object o) { return o != null ? o.toString() : ""; }

    private boolean isEmpty(String s) { return s == null || s.isBlank(); }
    private String nvl(String s) { return s != null ? s : ""; }
    private double bd(BigDecimal b) { return b != null ? b.doubleValue() : 0.0; }
}
