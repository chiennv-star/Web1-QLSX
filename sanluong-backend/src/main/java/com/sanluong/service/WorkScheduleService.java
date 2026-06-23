package com.sanluong.service;

import com.sanluong.dto.LenhSanXuatDto;
import com.sanluong.dto.StageTimelineDto;
import com.sanluong.dto.WorkScheduleCoLoHistoryDto;
import com.sanluong.dto.WorkScheduleDto;
import com.sanluong.entity.ProductionRecord;
import com.sanluong.entity.WorkSchedule;
import com.sanluong.entity.WorkScheduleCoLoHistory;
import com.sanluong.entity.WorkScheduleSession;
import com.sanluong.repository.ProductionRecordRepository;
import com.sanluong.repository.ProductMasterRepository;
import com.sanluong.repository.WorkScheduleCoLoHistoryRepository;
import com.sanluong.repository.WorkScheduleRepository;
import com.sanluong.repository.WorkScheduleSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.Comparator;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class WorkScheduleService {

    private final WorkScheduleRepository repository;
    private final ProductionRecordRepository productionRepo;
    private final ProductMasterRepository productMasterRepository;
    private final WorkScheduleCoLoHistoryRepository coLoHistoryRepo;
    private final KhoachEventPublisher eventPublisher;
    private final WorkScheduleSessionRepository sessionRepository;
    private final NotificationService notificationService;
    private final DonHangService donHangService;

    public WorkScheduleService(WorkScheduleRepository repository,
                                ProductionRecordRepository productionRepo,
                                ProductMasterRepository productMasterRepository,
                                WorkScheduleCoLoHistoryRepository coLoHistoryRepo,
                                KhoachEventPublisher eventPublisher,
                                WorkScheduleSessionRepository sessionRepository,
                                NotificationService notificationService,
                                @Lazy DonHangService donHangService) {
        this.repository = repository;
        this.productionRepo = productionRepo;
        this.productMasterRepository = productMasterRepository;
        this.coLoHistoryRepo = coLoHistoryRepo;
        this.eventPublisher = eventPublisher;
        this.sessionRepository = sessionRepository;
        this.notificationService = notificationService;
        this.donHangService = donHangService;
    }

    /** Enrich hasLsx: đánh dấu các bản ghi có ProductionRecord.lsx = soLo */
    private void enrichHasLsx(List<WorkSchedule> list) {
        List<String> soLos = list.stream()
                .map(WorkSchedule::getSoLo)
                .filter(s -> s != null && !s.isBlank())
                .distinct()
                .collect(Collectors.toList());
        if (soLos.isEmpty()) return;
        Set<String> existingLsx = new HashSet<>(productionRepo.findExistingLsx(soLos));
        list.forEach(w -> {
            if (w.getSoLo() != null) {
                w.setHasLsx(existingLsx.contains(w.getSoLo()));
            }
        });
    }

    /** Enrich maBravo từ ProductMaster cho các bản ghi chưa có (backward compat) */
    private void enrichMaBravo(List<WorkSchedule> list) {
        Set<String> maSps = list.stream()
                .filter(w -> w.getMaBravo() == null && w.getMaSp() != null && !w.getMaSp().isBlank())
                .map(WorkSchedule::getMaSp)
                .collect(Collectors.toSet());
        if (maSps.isEmpty()) return;
        Map<String, String> bravoMap = new java.util.HashMap<>();
        for (String maSp : maSps) {
            productMasterRepository.findByMaTpIgnoreCase(maSp)
                    .ifPresent(pm -> bravoMap.put(maSp.toUpperCase(), pm.getMaBravo()));
        }
        list.forEach(w -> {
            if (w.getMaBravo() == null && w.getMaSp() != null) {
                w.setMaBravo(bravoMap.get(w.getMaSp().toUpperCase()));
            }
        });
    }

    public Page<WorkSchedule> search(LocalDate fromDate, LocalDate toDate,
                                      String maSp, String tenTrinh, String soLo, String maBravo,
                                      String maDonHang, String tinhTrang, String congDoan, String source,
                                      String toNhom, Boolean isPlanned, int page, int size) {
        List<WorkSchedule> all = repository.searchAll(fromDate, toDate,
                isEmpty(maSp) ? null : maSp,
                isEmpty(tenTrinh) ? null : tenTrinh,
                isEmpty(soLo) ? null : soLo,
                isEmpty(maBravo) ? null : maBravo,
                isEmpty(maDonHang) ? null : maDonHang,
                isEmpty(tinhTrang) ? null : tinhTrang,
                isEmpty(congDoan) ? null : congDoan,
                isEmpty(source) ? null : source,
                isEmpty(toNhom) ? null : toNhom,
                isPlanned);
        all.sort(Comparator
                .comparingInt((WorkSchedule w) -> soLoSortKey(w.getSoLo())).reversed()
                .thenComparing(Comparator.comparing(
                        WorkSchedule::getNgayThucHien,
                        Comparator.nullsLast(Comparator.reverseOrder()))));
        int start = page * size;
        int end = Math.min(start + size, all.size());
        List<WorkSchedule> content = start < all.size() ? new ArrayList<>(all.subList(start, end)) : new ArrayList<>();
        enrichMaBravo(content);
        enrichHasLsx(content);
        return new PageImpl<>(content, PageRequest.of(page, size), all.size());
    }

    private int soLoSortKey(String soLo) {
        if (soLo == null || soLo.length() != 6) return 0;
        try {
            return Integer.parseInt(soLo.substring(4, 6) + soLo.substring(2, 4) + soLo.substring(0, 2));
        } catch (NumberFormatException e) { return 0; }
    }

    public WorkSchedule setHidden(Long id, boolean hidden) {
        WorkSchedule w = getById(id);
        w.setHidden(hidden);
        WorkSchedule saved = repository.save(w);
        eventPublisher.publishKhoachUpdated();
        return saved;
    }

    public int bulkHide(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return 0;
        List<WorkSchedule> list = repository.findAllById(ids);
        list.forEach(w -> w.setHidden(true));
        repository.saveAll(list);
        eventPublisher.publishKhoachUpdated();
        return list.size();
    }

    public int bulkUnhide(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return 0;
        List<WorkSchedule> list = repository.findAllById(ids);
        list.forEach(w -> w.setHidden(false));
        repository.saveAll(list);
        eventPublisher.publishKhoachUpdated();
        return list.size();
    }

    public Page<WorkSchedule> findHidden(String congDoan, String source, String toNhom, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<WorkSchedule> result = repository.findHidden(
                isEmpty(congDoan) ? null : congDoan,
                isEmpty(source) ? null : source,
                isEmpty(toNhom) ? null : toNhom,
                pageable);
        enrichMaBravo(new ArrayList<>(result.getContent()));
        return result;
    }

    public Page<WorkSchedule> findDeviations(LocalDate fromDate, LocalDate toDate,
                                              String maSp, String tenTrinh, String soLo,
                                              int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<WorkSchedule> result = repository.findDeviations(fromDate, toDate,
                isEmpty(maSp) ? null : maSp,
                isEmpty(tenTrinh) ? null : tenTrinh,
                isEmpty(soLo) ? null : soLo,
                pageable);
        enrichMaBravo(new ArrayList<>(result.getContent()));
        return result;
    }

    // Returns unique (maSp, tenTrinh, soLo) triplets from PC + BBC1 stages
    public List<Map<String, String>> getSuggestions() {
        List<Object[]> rows = repository.findDistinctTripletsFromPcAndBbc1();
        List<Map<String, String>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, String> map = new HashMap<>();
            map.put("maSp", row[0] != null ? row[0].toString() : null);
            map.put("tenTrinh", row[1] != null ? row[1].toString() : null);
            map.put("soLo", row[2] != null ? row[2].toString() : null);
            result.add(map);
        }
        return result;
    }

    // Returns all 4 stages' data for a given (maSp, tenTrinh, soLo) triplet
    public Map<String, Object> lookupByTriplet(String maSp, String tenTrinh, String soLo) {
        Map<String, Object> result = new HashMap<>();
        result.put("maSp", maSp);
        result.put("tenTrinh", tenTrinh);
        result.put("soLo", soLo);

        String tenTrinhParam = isEmpty(tenTrinh) ? null : tenTrinh;
        String soLoParam = isEmpty(soLo) ? null : soLo;
        Pageable limit1 = PageRequest.of(0, 1);

        for (String stage : new String[]{"PC", "BBC1", "PL", "DG"}) {
            List<WorkSchedule> records = repository.findByCongDoanAndTriplet(
                    stage, maSp, tenTrinhParam, soLoParam, limit1);
            if (!records.isEmpty()) {
                WorkSchedule w = records.get(0);
                Map<String, Object> stageData = new HashMap<>();
                stageData.put("tinhTrang", w.getTinhTrang());
                stageData.put("congPc", w.getCongPc());
                stageData.put("slBbc1", w.getSlBbc1());
                stageData.put("congBbc1", w.getCongBbc1());
                stageData.put("slPl", w.getSlPl());
                stageData.put("congPl", w.getCongPl());
                stageData.put("slDg", w.getSlDg());
                stageData.put("congDg", w.getCongDg());
                result.put(stage.toLowerCase(), stageData);
            }
        }
        return result;
    }

    // Tự động tạo/cập nhật bản ghi SCHEDULE cho từng công đoạn
    // Nếu đã có record (congDoan + maBravo + soLo) → update maDonHang + coLo
    // Nếu chưa có → tạo mới
    // isPhatLenh=true + toNhomOverride=PCPL1/PCPL2 → đặt tinhTrang="doing" cho PC/PL/BBC1/DG (nếu chưa có)
    @org.springframework.transaction.annotation.Transactional
    public int autoSyncFromProduction(String maBravo, String maSp, String tenTrinh,
                                       String soLo, java.math.BigDecimal coLo, String maDonHang,
                                       boolean isPhatLenh, String toNhomOverride) {
        if (isEmpty(maBravo) && isEmpty(maSp)) return 0;
        String maBravoParam   = isEmpty(maBravo)  ? null : maBravo;
        String maSpparam      = isEmpty(maSp)     ? null : maSp;
        String tenTrinhParam  = isEmpty(tenTrinh) ? null : tenTrinh;
        String soLoParam      = isEmpty(soLo)     ? null : soLo;
        String maDonHangParam = isEmpty(maDonHang)? null : maDonHang;
        java.time.LocalDate today = java.time.LocalDate.now();
        int created = 0;

        final String finalPcplNhom = isEmpty(toNhomOverride) ? null : toNhomOverride;

        // Xóa PCPL records sai toNhom TRƯỚC khi sync (vd PCPL1+toNhom=PCPL2 và ngược lại)
        // Phải chạy trước để tránh findFirst tìm ra record sai rồi update thay vì tạo mới
        if (maBravoParam != null) {
            int del1 = repository.softDeleteConflictingPcpl("PCPL1", "PCPL2", maBravoParam, soLoParam);
            int del2 = repository.softDeleteConflictingPcpl("PCPL2", "PCPL1", maBravoParam, soLoParam);
            if (del1 > 0) System.out.println("[autoSync] soft-deleted " + del1
                    + " PCPL1 record(s) conflict PCPL2 — maBravo=" + maBravoParam + " soLo=" + soLoParam);
            if (del2 > 0) System.out.println("[autoSync] soft-deleted " + del2
                    + " PCPL2 record(s) conflict PCPL1 — maBravo=" + maBravoParam + " soLo=" + soLoParam);
        }

        // Khi phát lệnh: sync cả PCPL1 lẫn PCPL2 (giống ĐG/BBC1/PL — không phân biệt tổ)
        // Khi không phát lệnh: chỉ sync tổ được gán; nếu không biết tổ thì chỉ update existing
        java.util.List<String> stages = new java.util.ArrayList<>();
        if (isPhatLenh || "PCPL1".equals(finalPcplNhom) || "PCPL2".equals(finalPcplNhom)) {
            stages.add("PCPL1");
            stages.add("PCPL2");
        } else {
            // Không biết tổ và không phải phát lệnh: thử update existing, không tạo mới
            stages.add("PCPL1");
            stages.add("PCPL2");
        }
        stages.addAll(java.util.Arrays.asList("BBC1", "PL", "DG", "CC"));

        for (String stage : stages) {
            java.util.Optional<WorkSchedule> existing =
                    repository.findFirstScheduleByCongDoanAndKey(stage, maBravoParam, maSpparam, soLoParam);
            if (existing.isPresent()) {
                WorkSchedule w = existing.get();
                boolean changed = false;
                if (maDonHangParam != null && !maDonHangParam.equals(w.getMaDonHang())) {
                    w.setMaDonHang(maDonHangParam);
                    changed = true;
                }
                if (coLo != null && !coLo.equals(w.getCoLo())) {
                    w.setCoLo(coLo);
                    changed = true;
                }
                if (maBravoParam != null && w.getMaBravo() == null) {
                    w.setMaBravo(maBravoParam);
                    changed = true;
                }
                // PCPL1/PCPL2: chỉ set "doing" cho đúng group; nếu không biết group thì cả hai đều doing
                // BBC1/PL/DG: luôn doing khi phát lệnh
                boolean shouldDoing = isPhatLenh && !"CC".equals(stage);
                if (shouldDoing && ("PCPL1".equals(stage) || "PCPL2".equals(stage)) && finalPcplNhom != null) {
                    shouldDoing = stage.equals(finalPcplNhom);
                }
                if (shouldDoing && !"doing".equals(w.getTinhTrang())) {
                    w.setTinhTrang("doing"); changed = true;
                }
                if (changed) repository.save(w);
            } else {
                // Nếu không phải phát lệnh và không biết tổ: không tạo mới PCPL record
                if (("PCPL1".equals(stage) || "PCPL2".equals(stage)) && !isPhatLenh && finalPcplNhom == null) continue;
                WorkSchedule w = new WorkSchedule();
                w.setSource("SCHEDULE");
                w.setCongDoan(stage);
                w.setMaBravo(maBravoParam);
                w.setMaSp(maSpparam);
                w.setTenTrinh(tenTrinhParam);
                w.setSoLo(soLoParam);
                w.setMaDonHang(maDonHangParam);
                w.setCoLo(coLo);
                w.setNgayThucHien(today);
                // PCPL1/PCPL2: chỉ set "doing" cho đúng group; nếu không biết group thì cả hai đều doing
                // BBC1/PL/DG/CC: không thay đổi
                boolean shouldDoing = isPhatLenh && !"CC".equals(stage);
                if (shouldDoing && ("PCPL1".equals(stage) || "PCPL2".equals(stage)) && finalPcplNhom != null) {
                    shouldDoing = stage.equals(finalPcplNhom);
                }
                if (shouldDoing) w.setTinhTrang("doing");
                repository.save(w);
                created++;
            }
        }
        return created;
    }

    public int autoSyncFromProduction(String maBravo, String maSp, String tenTrinh,
                                       String soLo, java.math.BigDecimal coLo, String maDonHang,
                                       boolean isPhatLenh) {
        return autoSyncFromProduction(maBravo, maSp, tenTrinh, soLo, coLo, maDonHang, isPhatLenh, null);
    }

    public int autoSyncFromProduction(String maBravo, String maSp, String tenTrinh,
                                       String soLo, java.math.BigDecimal coLo, String maDonHang) {
        return autoSyncFromProduction(maBravo, maSp, tenTrinh, soLo, coLo, maDonHang, false, null);
    }

    public WorkSchedule getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ID: " + id));
    }

    public long countCreatedToday() {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end   = start.plusDays(1);
        return repository.countCreatedBetween(start, end);
    }

    /** Đổi Cỡ Lô với lưu lịch sử, đồng thời cập nhật các bản ghi cùng maSp + maDonHang + soLo */
    @org.springframework.transaction.annotation.Transactional
    public WorkSchedule doiCoLo(Long id, BigDecimal coLoMoi, String lyDo, String username) {
        WorkSchedule w = getById(id);
        LocalDateTime now = LocalDateTime.now();

        WorkScheduleCoLoHistory hist = new WorkScheduleCoLoHistory();
        hist.setWorkScheduleId(id);
        hist.setCoLoCu(w.getCoLo());
        hist.setCoLoMoi(coLoMoi);
        hist.setLyDo(lyDo);
        hist.setChangedBy(username);
        hist.setChangedAt(now);
        coLoHistoryRepo.save(hist);

        w.setCoLo(coLoMoi);
        w.setUpdatedBy(username);
        WorkSchedule saved = repository.save(w);

        // Cập nhật tất cả bản ghi cùng maSp + maDonHang + soLo + toNhom
        if (!isEmpty(w.getMaSp()) && !isEmpty(w.getMaDonHang())) {
            String soLoParam   = isEmpty(w.getSoLo())   ? null : w.getSoLo();
            String toNhomParam = isEmpty(w.getToNhom()) ? null : w.getToNhom();
            List<WorkSchedule> siblings = repository.findSiblings(id, w.getMaSp(), w.getMaDonHang(), soLoParam, toNhomParam);
            if (!siblings.isEmpty()) {
                List<WorkScheduleCoLoHistory> sibHists = new ArrayList<>();
                for (WorkSchedule sib : siblings) {
                    WorkScheduleCoLoHistory sh = new WorkScheduleCoLoHistory();
                    sh.setWorkScheduleId(sib.getId());
                    sh.setCoLoCu(sib.getCoLo());
                    sh.setCoLoMoi(coLoMoi);
                    sh.setLyDo(lyDo);
                    sh.setChangedBy(username);
                    sh.setChangedAt(now);
                    sibHists.add(sh);
                    sib.setCoLo(coLoMoi);
                    sib.setUpdatedBy(username);
                }
                coLoHistoryRepo.saveAll(sibHists);
                repository.saveAll(siblings);
            }
        }

        eventPublisher.publishKhoachUpdated();
        return saved;
    }

    /** Lấy lịch sử đổi Cỡ Lô của một bản ghi kế hoạch */
    public List<WorkScheduleCoLoHistoryDto> getLichSuCoLo(Long id) {
        return coLoHistoryRepo.findByWorkScheduleIdOrderByChangedAtDesc(id)
                .stream().map(h -> {
                    WorkScheduleCoLoHistoryDto d = new WorkScheduleCoLoHistoryDto();
                    d.setId(h.getId());
                    d.setWorkScheduleId(h.getWorkScheduleId());
                    d.setCoLoCu(h.getCoLoCu());
                    d.setCoLoMoi(h.getCoLoMoi());
                    d.setLyDo(h.getLyDo());
                    d.setChangedBy(h.getChangedBy());
                    d.setChangedAt(h.getChangedAt());
                    return d;
                }).collect(Collectors.toList());
    }

    public WorkSchedule create(WorkScheduleDto dto, String username) {
        // Kế hoạch PLAN: nếu trùng key (ngày + tổ + maSp + maDonHang + soLo) → cộng dồn coLo
        if ("PLAN".equals(dto.getSource()) || dto.isPlanned()) {
            List<WorkSchedule> existing = repository.findPlanByKey(
                    dto.getNgayThucHien(),
                    dto.getToNhom(),
                    isEmpty(dto.getMaSp())      ? null : dto.getMaSp(),
                    isEmpty(dto.getMaDonHang()) ? null : dto.getMaDonHang(),
                    isEmpty(dto.getSoLo())      ? null : dto.getSoLo()
            );
            if (!existing.isEmpty()) {
                WorkSchedule w = existing.get(0);
                // Khôi phục nếu bản ghi đã bị ẩn hoặc xóa mềm
                w.setHidden(false);
                w.setDeletedAt(null);
                if (dto.getCoLo() != null) {
                    BigDecimal current = w.getCoLo() != null ? w.getCoLo() : BigDecimal.ZERO;
                    w.setCoLo(current.add(dto.getCoLo()));
                }
                w.setUpdatedBy(username);
                autoApplyDone(w);
                WorkSchedule saved = repository.save(w);
                notificationService.createKeHoachNotification("UPDATE", saved.getId(),
                        saved.getMaSp(), resolveTenTrinh(saved.getMaSp(), saved.getTenTrinh()), saved.getSoLo(), saved.getCoLo(),
                        saved.getNgayThucHien(), saved.getToNhom(), saved.getCongDoan(), username);
                eventPublisher.publishKhoachUpdated();
                return saved;
            }
        }
        WorkSchedule w = toEntity(dto);
        w.setCreatedBy(username);
        w.setUpdatedBy(username);
        autoApplyDone(w);
        WorkSchedule saved = repository.save(w);
        if ("PLAN".equals(saved.getSource()) || saved.isPlanned()) {
            notificationService.createKeHoachNotification("NEW", saved.getId(),
                    saved.getMaSp(), resolveTenTrinh(saved.getMaSp(), saved.getTenTrinh()), saved.getSoLo(), saved.getCoLo(),
                    saved.getNgayThucHien(), saved.getToNhom(), saved.getCongDoan(), username);
        } else if ("SCHEDULE".equals(saved.getSource())) {
            notificationService.createLichSanXuatNotification(saved.getId(), saved.getCongDoan(),
                    saved.getMaSp(), resolveTenTrinh(saved.getMaSp(), saved.getTenTrinh()), saved.getSoLo(), saved.getCoLo(),
                    saved.getNgayThucHien(), saved.getToNhom(), username);
        }
        syncToProduction(saved);
        eventPublisher.publishKhoachUpdated();
        return saved;
    }

    public WorkSchedule update(Long id, WorkScheduleDto dto, String username) {
        WorkSchedule w = getById(id);
        java.time.LocalDate oldNgay = w.getNgayThucHien();
        String oldToNhom = w.getToNhom();
        applyDto(w, dto);
        w.setUpdatedBy(username);
        autoApplyDone(w);
        WorkSchedule saved = repository.save(w);
        if ("PLAN".equals(saved.getSource()) || saved.isPlanned()) {
            boolean dateChanged = !Objects.equals(oldNgay, saved.getNgayThucHien());
            boolean nhomChanged = !Objects.equals(oldToNhom, saved.getToNhom());
            String action = (dateChanged || nhomChanged) ? "MOVE" : "UPDATE";
            notificationService.createKeHoachNotification(action, saved.getId(),
                    saved.getMaSp(), resolveTenTrinh(saved.getMaSp(), saved.getTenTrinh()), saved.getSoLo(), saved.getCoLo(),
                    saved.getNgayThucHien(), saved.getToNhom(), saved.getCongDoan(), username,
                    oldNgay, oldToNhom);
        }
        syncToProduction(saved);
        // PCPL1/PCPL2: khi toNhom thay đổi → tự ẩn record PCPL đối diện
        if (("PCPL1".equals(saved.getCongDoan()) || "PCPL2".equals(saved.getCongDoan()))
                && !Objects.equals(oldToNhom, saved.getToNhom())) {
            autoHidePcplSibling(saved);
        }
        eventPublisher.publishKhoachUpdated();
        return saved;
    }

    // Tự động đồng bộ Công PC/PL/BBC1/ĐG và tình trạng sang bảng sản lượng
    private void syncToProduction(WorkSchedule w) {
        if (isEmpty(w.getMaSp())) return;
        String stage = w.getCongDoan();
        if (stage == null) return;

        String tienTrinh = isEmpty(w.getTenTrinh()) ? null : w.getTenTrinh();
        String lsx = isEmpty(w.getSoLo()) ? null : w.getSoLo();

        List<ProductionRecord> records = productionRepo.findByTriplet(w.getMaSp(), tienTrinh, lsx);
        if (records.isEmpty()) return;

        // Normalize tinhTrang: blank string → null (represents "-")
        String trangThai = (w.getTinhTrang() != null && !w.getTinhTrang().isBlank())
                ? w.getTinhTrang() : null;

        for (ProductionRecord r : records) {
            switch (stage) {
                case "PC", "PCPL2" -> {
                    if (w.getSlPc()   != null) r.setSlPc(String.valueOf(w.getSlPc().intValue()));
                    if (w.getCongPc() != null) r.setPcChiPhi(w.getCongPc());
                    r.setPcTrangThai(trangThai);
                }
                case "BBC1" -> {
                    if (w.getCongBbc1() != null) r.setBbc1_3(w.getCongBbc1());
                    if (w.getSlBbc1()   != null) r.setBbc1_2(String.valueOf(w.getSlBbc1().intValue()));
                    r.setBbc1TrangThai(trangThai);
                }
                case "PCPL1" -> {
                    // PCPL1 đồng vai trò PC trong bảng sản lượng + QA như PL
                    if (w.getSlPc()   != null) r.setSlPc(String.valueOf(w.getSlPc().intValue()));
                    if (w.getCongPc() != null) r.setPcChiPhi(w.getCongPc());
                    r.setPcTrangThai(trangThai);
                    r.setPlQaLayMau(w.getQaLayMau());
                    int plPcpl1 = r.getPlQaLayMau() != null ? r.getPlQaLayMau() : 0;
                    int dgPcpl1 = r.getDgQaLayMau() != null ? r.getDgQaLayMau() : 0;
                    r.setQaLayMau(plPcpl1 + dgPcpl1 > 0 ? plPcpl1 + dgPcpl1 : null);
                }
                case "PL" -> {
                    if (w.getCongPl() != null) r.setPlChiPhi(w.getCongPl());
                    if (w.getSlPl()   != null) r.setPcPl(String.valueOf(w.getSlPl().intValue()));
                    r.setPlTrangThai(trangThai);
                    r.setPlQaLayMau(w.getQaLayMau());
                    int plPl = r.getPlQaLayMau() != null ? r.getPlQaLayMau() : 0;
                    int dgPl = r.getDgQaLayMau() != null ? r.getDgQaLayMau() : 0;
                    r.setQaLayMau(plPl + dgPl > 0 ? plPl + dgPl : null);
                }
                case "DG" -> {
                    if (w.getCongDg() != null) r.setDgChiPhi(w.getCongDg());
                    if (w.getSlDg()   != null) r.setDg2(String.valueOf(w.getSlDg().intValue()));
                    r.setDgTrangThai(trangThai);
                    r.setDgQaLayMau(w.getQaLayMau());
                    int plDg = r.getPlQaLayMau() != null ? r.getPlQaLayMau() : 0;
                    int dgDg = r.getDgQaLayMau() != null ? r.getDgQaLayMau() : 0;
                    r.setQaLayMau(plDg + dgDg > 0 ? plDg + dgDg : null);
                }
                case "CC" -> {
                    if (w.getCongCc() != null) r.setCcChiPhi(w.getCongCc());
                }
            }
        }
        productionRepo.saveAll(records);
    }

    @org.springframework.transaction.annotation.Transactional
    public void patchField(Long id, String field, java.math.BigDecimal value) {
        WorkSchedule w = getById(id);
        switch (field) {
            case "congPc"   -> w.setCongPc(value);
            case "congBbc1" -> w.setCongBbc1(value);
            case "congPl"   -> w.setCongPl(value);
            case "congDg"   -> w.setCongDg(value);
            case "congCc"   -> w.setCongCc(value);
            case "slPc"     -> w.setSlPc(value);
            case "slBbc1"   -> w.setSlBbc1(value);
            case "slPl"     -> w.setSlPl(value);
            case "slDg"     -> w.setSlDg(value);
            case "slCc"     -> w.setSlCc(value);
            case "qaLayMau" -> w.setQaLayMau(value == null ? null : value.intValue());
            default -> throw new IllegalArgumentException("Unknown patchable field: " + field);
        }
        autoApplyDone(w);
        WorkSchedule saved = repository.save(w);
        syncToProduction(saved);
        eventPublisher.publishKhoachUpdated();
    }

    @org.springframework.transaction.annotation.Transactional
    public void patchNgayThucHien(Long id, java.time.LocalDate ngay) {
        WorkSchedule w = getById(id);
        w.setNgayThucHien(ngay);
        repository.save(w);
        eventPublisher.publishKhoachUpdated();
    }

    @org.springframework.transaction.annotation.Transactional
    public void patchPhongThucHien(Long id, String phong) {
        WorkSchedule w = getById(id);
        w.setPhongThucHien(phong == null || phong.isBlank() ? null : phong.trim());
        repository.save(w);
        eventPublisher.publishKhoachUpdated();
    }

    @org.springframework.transaction.annotation.Transactional
    public WorkSchedule patchTinhTrang(Long id, String tinhTrang, String username) {
        WorkSchedule w = getById(id);
        w.setTinhTrang((tinhTrang != null && !tinhTrang.isBlank()) ? tinhTrang : null);
        w.setUpdatedBy(username);
        WorkSchedule saved = repository.save(w);
        syncToProduction(saved);
        eventPublisher.publishKhoachUpdated();
        return saved;
    }

    @org.springframework.transaction.annotation.Transactional
    public void updateSlOnly(Long workScheduleId, String congDoan, java.math.BigDecimal newSl) {
        WorkSchedule w = getById(workScheduleId);
        switch (congDoan) {
            case "PC", "PCPL1", "PCPL2" -> w.setSlPc(newSl);
            case "BBC1" -> w.setSlBbc1(newSl);
            case "PL"   -> w.setSlPl(newSl);
            case "DG"   -> w.setSlDg(newSl);
            case "CC"   -> w.setSlCc(newSl);
        }
        autoApplyDone(w);
        repository.save(w);
        syncToProduction(w);
    }

    public Map<String, Object> getMonthlyStats(String month, String year) {
        List<Object[]> rows = repository.getMonthlyStatsByCongDoan(
                month, isEmpty(year) ? null : year);
        Map<String, Object> result = new HashMap<>();
        result.put("month", month);
        result.put("year", year);
        for (Object[] row : rows) {
            String congDoan = (String) row[0];
            long slSum = 0L;
            if (row[1] != null) {
                if (row[1] instanceof java.math.BigDecimal bd) slSum = bd.longValue();
                else slSum = ((Number) row[1]).longValue();
            }
            long lotCount = row[2] != null ? ((Number) row[2]).longValue() : 0L;
            Map<String, Long> stageStats = new HashMap<>();
            stageStats.put("soLuong", slSum);
            stageStats.put("soLuongLsx", lotCount);
            result.put(congDoan.toLowerCase(), stageStats);
        }
        return result;
    }

    public void delete(Long id, String username) {
        WorkSchedule w = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi ID: " + id));
        if ("PLAN".equals(w.getSource())) {
            notificationService.createKeHoachNotification("DELETE", w.getId(),
                    w.getMaSp(), resolveTenTrinh(w.getMaSp(), w.getTenTrinh()), w.getSoLo(), w.getCoLo(),
                    w.getNgayThucHien(), w.getToNhom(), w.getCongDoan(), username);
        }
        w.setDeletedAt(java.time.LocalDateTime.now());
        w.setDeletedBy(username);
        repository.save(w);
        eventPublisher.publishKhoachUpdated();
        if (w.getMaBravo() != null && w.getMaDonHang() != null)
            donHangService.syncFromKhoachFor(w.getMaBravo(), w.getMaDonHang(), username);
    }

    public java.util.List<WorkSchedule> findTrash() {
        return repository.findAllDeleted();
    }

    public void restore(Long id) {
        WorkSchedule w = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi ID: " + id));
        w.setDeletedAt(null);
        w.setDeletedBy(null);
        repository.save(w);
        eventPublisher.publishKhoachUpdated();
        if (w.getMaBravo() != null && w.getMaDonHang() != null)
            donHangService.syncFromKhoachFor(w.getMaBravo(), w.getMaDonHang(), "system");
    }

    public void deletePermanent(Long id) {
        repository.deleteById(id);
        eventPublisher.publishKhoachUpdated();
    }

    @org.springframework.transaction.annotation.Transactional
    public int bulkSetToNhom(List<Long> ids, String toNhom) {
        if (ids == null || ids.isEmpty()) return 0;
        List<WorkSchedule> list = repository.findAllById(ids);
        String value = (toNhom == null || toNhom.isBlank()) ? null : toNhom.trim();
        list.forEach(w -> w.setToNhom(value));
        repository.saveAll(list);
        list.forEach(this::autoHidePcplSibling);
        eventPublisher.publishKhoachUpdated();
        return list.size();
    }

    public int bulkDelete(List<Long> ids, String username) {
        if (ids == null || ids.isEmpty()) return 0;
        List<WorkSchedule> list = repository.findAllById(ids).stream()
                .filter(w -> w.getDeletedAt() == null)
                .collect(Collectors.toList());
        if (list.isEmpty()) return 0;
        LocalDateTime now = LocalDateTime.now();
        list.forEach(w -> { w.setDeletedAt(now); w.setDeletedBy(username); });
        repository.saveAll(list);
        eventPublisher.publishKhoachUpdated();
        // Sync lại tinhTrangSx cho các đơn hàng bị ảnh hưởng
        list.stream()
            .filter(w -> w.getMaBravo() != null && w.getMaDonHang() != null)
            .map(w -> w.getMaBravo() + "||" + w.getMaDonHang())
            .distinct()
            .forEach(key -> {
                String[] parts = key.split("\\|\\|", 2);
                donHangService.syncFromKhoachFor(parts[0], parts[1], username);
            });
        return list.size();
    }

    private WorkSchedule toEntity(WorkScheduleDto dto) {
        WorkSchedule w = new WorkSchedule();
        applyDto(w, dto);
        return w;
    }

    private void applyDto(WorkSchedule w, WorkScheduleDto dto) {
        w.setSource(dto.getSource());
        w.setPlanned(dto.isPlanned());
        w.setCongDoan(dto.getCongDoan());
        w.setNgayThucHien(dto.getNgayThucHien());
        w.setMaBravo(dto.getMaBravo());
        w.setMaSp(dto.getMaSp());
        w.setTenTrinh(dto.getTenTrinh());
        w.setSoLo(dto.getSoLo());
        w.setMaDonHang(dto.getMaDonHang());
        w.setCoLo(dto.getCoLo());
        w.setToNhom(dto.getToNhom());
        w.setPhongThucHien(dto.getPhongThucHien());
        w.setTruongCa(dto.getTruongCa());
        w.setNguoiHoTro(dto.getNguoiHoTro());
        w.setChuY(dto.getChuY());
        w.setSaiLech(dto.getSaiLech());
        w.setTinhTrang(dto.getTinhTrang());
        w.setSlPc(dto.getSlPc());
        w.setCongPc(dto.getCongPc());
        w.setSlBbc1(dto.getSlBbc1());
        w.setCongBbc1(dto.getCongBbc1());
        w.setSlPl(dto.getSlPl());
        w.setCongPl(dto.getCongPl());
        w.setSlDg(dto.getSlDg());
        w.setCongDg(dto.getCongDg());
        w.setSlCc(dto.getSlCc());
        w.setCongCc(dto.getCongCc());
        w.setQaLayMau(dto.getQaLayMau());
    }

    // Tự động chuyển tình trạng sang "done" khi SL đạt cỡ lô (PC và BBC1)
    private void autoApplyDone(WorkSchedule w) {
        String stage = w.getCongDoan();
        if (stage == null) return;
        java.math.BigDecimal coLo = w.getCoLo();
        if (coLo == null || coLo.compareTo(java.math.BigDecimal.ZERO) <= 0) return;
        switch (stage) {
            case "PC" -> {
                if (w.getSlPc() != null && w.getSlPc().compareTo(coLo) >= 0)
                    w.setTinhTrang("done");
            }
            case "BBC1" -> {
                if (w.getSlBbc1() != null && w.getSlBbc1().compareTo(coLo) >= 0)
                    w.setTinhTrang("done");
            }
            case "CC" -> {
                if (w.getSlCc() != null && w.getSlCc().compareTo(coLo) >= 0)
                    w.setTinhTrang("done");
            }
        }
    }

    public List<StageTimelineDto> getStageTimeline(LocalDate fromDate, LocalDate toDate, String maSp) {
        List<WorkSchedule> allWs = repository.searchAll(
                fromDate, toDate,
                isEmpty(maSp) ? null : maSp,
                null, null, null, null, null, null, "SCHEDULE", null, null);
        if (allWs.isEmpty()) return List.of();

        List<Long> wsIds = allWs.stream().map(WorkSchedule::getId).collect(Collectors.toList());
        List<WorkScheduleSession> allSessions = sessionRepository.findByWorkScheduleIdIn(wsIds);
        Map<Long, List<WorkScheduleSession>> sessionMap = allSessions.stream()
                .collect(Collectors.groupingBy(WorkScheduleSession::getWorkScheduleId));

        Map<String, List<WorkSchedule>> grouped = allWs.stream()
                .collect(Collectors.groupingBy(w ->
                        (w.getMaSp() != null ? w.getMaSp().trim() : "") + "|||" +
                        (w.getTenTrinh() != null ? w.getTenTrinh().trim() : "") + "|||" +
                        (w.getSoLo() != null ? w.getSoLo().trim() : "")));

        List<StageTimelineDto> result = new ArrayList<>();
        for (Map.Entry<String, List<WorkSchedule>> entry : grouped.entrySet()) {
            String[] parts = entry.getKey().split("\\|\\|\\|", -1);
            StageTimelineDto dto = new StageTimelineDto();
            dto.setMaSp(parts[0]);
            dto.setTenTrinh(parts[1]);
            dto.setSoLo(parts[2]);
            List<WorkSchedule> wsList = entry.getValue();
            dto.setIds(wsList.stream().map(WorkSchedule::getId).collect(Collectors.toList()));
            wsList.stream().map(WorkSchedule::getCoLo).filter(Objects::nonNull).findFirst()
                    .ifPresent(dto::setCoLo);

            for (WorkSchedule ws : wsList) {
                String stage = ws.getCongDoan();
                if (stage == null) continue;
                List<WorkScheduleSession> sessions = sessionMap.getOrDefault(ws.getId(), List.of());
                StageTimelineDto.StageInfo info = buildStageInfo(sessions, ws.getTinhTrang());
                switch (stage) {
                    case "PC", "PCPL1", "PCPL2" -> {
                        StageTimelineDto.StageInfo existing = dto.getPc();
                        if (existing == null) {
                            dto.setPc(info);
                        } else {
                            // merge nhiều bản ghi PC/PCPL1/PCPL2 vào một ô
                            String merged;
                            if ("done".equals(existing.getTinhTrang()) && "done".equals(info.getTinhTrang())) {
                                merged = "done";
                            } else if ("doing".equals(existing.getTinhTrang()) || "doing".equals(info.getTinhTrang())) {
                                merged = "doing";
                            } else {
                                merged = existing.getTinhTrang() != null ? existing.getTinhTrang() : info.getTinhTrang();
                            }
                            existing.setTinhTrang(merged);
                            existing.setSoDays(existing.getSoDays() + info.getSoDays());
                            if (info.getStartDate() != null && (existing.getStartDate() == null || info.getStartDate().isBefore(existing.getStartDate()))) {
                                existing.setStartDate(info.getStartDate());
                            }
                            if (info.getEndDate() != null && (existing.getEndDate() == null || info.getEndDate().isAfter(existing.getEndDate()))) {
                                existing.setEndDate(info.getEndDate());
                            }
                        }
                    }
                    case "BBC1" -> dto.setBbc1(info);
                    case "PL"   -> dto.setPl(info);
                    case "DG"   -> dto.setDg(info);
                    case "CC"   -> dto.setCc(info);
                }
            }
            result.add(dto);
        }

        result.sort(Comparator.comparing(StageTimelineDto::getSoLo,
                Comparator.nullsLast(Comparator.reverseOrder())));
        return result;
    }

    private StageTimelineDto.StageInfo buildStageInfo(List<WorkScheduleSession> sessions, String tinhTrang) {
        StageTimelineDto.StageInfo info = new StageTimelineDto.StageInfo();
        info.setTinhTrang(tinhTrang);
        Set<LocalDate> distinctDays = sessions.stream()
                .filter(s -> s.getNgay() != null)
                .map(WorkScheduleSession::getNgay)
                .collect(Collectors.toSet());
        if (!distinctDays.isEmpty()) {
            info.setStartDate(distinctDays.stream().min(Comparator.naturalOrder()).orElse(null));
            info.setEndDate(distinctDays.stream().max(Comparator.naturalOrder()).orElse(null));
            info.setSoDays(distinctDays.size());
        }
        return info;
    }

    /** Khi gán toNhom cho PCPL1/PCPL2 → tự ẩn record PCPL đối diện cùng lô */
    private void autoHidePcplSibling(WorkSchedule w) {
        if (!("PCPL1".equals(w.getCongDoan()) || "PCPL2".equals(w.getCongDoan()))) return;
        String siblingCongDoan = "PCPL1".equals(w.getCongDoan()) ? "PCPL2" : "PCPL1";
        boolean shouldHide = !isEmpty(w.getToNhom());
        repository.searchAll(null, null,
                isEmpty(w.getMaSp())    ? null : w.getMaSp(),
                null,
                isEmpty(w.getSoLo())    ? null : w.getSoLo(),
                isEmpty(w.getMaBravo()) ? null : w.getMaBravo(),
                null, null, siblingCongDoan, "SCHEDULE", null, null)
            .stream()
            .filter(sib -> w.getMaDonHang() == null || Objects.equals(sib.getMaDonHang(), w.getMaDonHang()))
            .forEach(sib -> {
                sib.setHidden(shouldHide ? Boolean.TRUE : null);
                repository.save(sib);
            });
    }

    private boolean isEmpty(String s) { return s == null || s.isBlank(); }

    private String resolveTenTrinh(String maSp, String tenTrinh) {
        if (tenTrinh != null && !tenTrinh.isBlank()) return tenTrinh;
        if (maSp == null || maSp.isBlank()) return null;
        return productMasterRepository.findByMaTpIgnoreCase(maSp)
                .map(pm -> pm.getTienTrinh())
                .orElse(null);
    }
}
