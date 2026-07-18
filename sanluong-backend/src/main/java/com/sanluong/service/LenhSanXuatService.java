package com.sanluong.service;

import com.sanluong.dto.LenhFieldHistoryDto;
import com.sanluong.dto.LenhLoHistoryDto;
import com.sanluong.dto.LenhSanXuatDto;
import com.sanluong.entity.LenhFieldHistory;
import com.sanluong.entity.LenhLoHistory;
import com.sanluong.entity.LenhSanXuat;
import com.sanluong.entity.ProductionRecord;
import com.sanluong.repository.DonHangRepository;
import com.sanluong.repository.LenhFieldHistoryRepository;
import com.sanluong.repository.LenhLoHistoryRepository;
import com.sanluong.repository.LenhSanXuatRepository;
import com.sanluong.repository.ProductMasterRepository;
import com.sanluong.repository.ProductionRecordRepository;
import com.sanluong.repository.WorkScheduleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import com.sanluong.entity.WorkSchedule;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class LenhSanXuatService {

    private static final Set<String> LOCKABLE_FIELDS = Set.of("maBravo", "maSp", "tenSanPham", "maDonHang");

    private final LenhSanXuatRepository repo;
    private final LenhLoHistoryRepository historyRepo;
    private final LenhFieldHistoryRepository fieldHistoryRepo;
    private final WorkScheduleRepository workScheduleRepo;
    private final ProductionRecordRepository productionRepo;
    private final ProductMasterRepository productMasterRepo;
    private final DonHangRepository donHangRepo;
    private final NotificationService notificationService;
    private final WorkScheduleService workScheduleService;

    public LenhSanXuatService(LenhSanXuatRepository repo,
                               LenhLoHistoryRepository historyRepo,
                               LenhFieldHistoryRepository fieldHistoryRepo,
                               WorkScheduleRepository workScheduleRepo,
                               ProductionRecordRepository productionRepo,
                               ProductMasterRepository productMasterRepo,
                               DonHangRepository donHangRepo,
                               NotificationService notificationService,
                               WorkScheduleService workScheduleService) {
        this.repo = repo;
        this.historyRepo = historyRepo;
        this.fieldHistoryRepo = fieldHistoryRepo;
        this.workScheduleRepo = workScheduleRepo;
        this.productionRepo = productionRepo;
        this.productMasterRepo = productMasterRepo;
        this.donHangRepo = donHangRepo;
        this.notificationService = notificationService;
        this.workScheduleService = workScheduleService;
    }


    /** PLAN records đã lên lịch nhưng chưa có số lô — nhóm theo (maBravo+maDonHang+toNhom) */
    @Transactional
    public List<java.util.Map<String, Object>> findPlanWithoutLenh() {
        List<WorkSchedule> plans = workScheduleRepo.findPlanWithoutLenh();
        // Enrich maBravo từ ProductMaster hoặc DonHang cho các record cũ chưa có (lưu vào DB luôn)
        java.util.Set<String> maSpsNeedBravo = plans.stream()
                .filter(w -> (w.getMaBravo() == null || w.getMaBravo().isBlank()) && w.getMaSp() != null && !w.getMaSp().isBlank())
                .map(WorkSchedule::getMaSp)
                .collect(java.util.stream.Collectors.toSet());
        java.util.Map<String, String> bravoMap = new java.util.HashMap<>();
        for (String maSp : maSpsNeedBravo) {
            productMasterRepo.findByMaTpIgnoreCase(maSp)
                    .ifPresent(pm -> { if (pm.getMaBravo() != null) bravoMap.put(maSp.toUpperCase(), pm.getMaBravo()); });
        }
        for (WorkSchedule ws : plans) {
            if ((ws.getMaBravo() == null || ws.getMaBravo().isBlank())) {
                String bravo = (ws.getMaSp() != null) ? bravoMap.get(ws.getMaSp().toUpperCase()) : null;
                // Fallback: tìm từ DonHang theo maDonHang
                if (bravo == null && ws.getMaDonHang() != null) {
                    bravo = donHangRepo.findTopByMaDonHangAndDeletedAtIsNull(ws.getMaDonHang())
                            .map(dh -> dh.getMaBravo())
                            .orElse(null);
                }
                if (bravo != null) {
                    ws.setMaBravo(bravo);
                    workScheduleRepo.save(ws);
                }
            }
        }
        // Nhóm theo (maBravo + maDonHang + toNhom): gộp nhiều ngày của cùng một đơn thành 1 dòng
        java.util.LinkedHashMap<String, java.util.Map<String, Object>> grouped = new java.util.LinkedHashMap<>();
        for (WorkSchedule ws : plans) {
            String key = ws.getMaBravo() + "|" + ws.getMaDonHang() + "|" + ws.getToNhom();
            if (!grouped.containsKey(key)) {
                java.util.Map<String, Object> row = new java.util.HashMap<>();
                row.put("workScheduleId", ws.getId());
                row.put("maBravo",        ws.getMaBravo());
                row.put("maSp",           ws.getMaSp());
                row.put("tenSanPham",     ws.getTenTrinh());
                row.put("soLo",           null); // chưa có số lô
                row.put("maDonHang",      ws.getMaDonHang());
                row.put("soLuong",        ws.getCoLo());
                row.put("ngayThucHien",   ws.getNgayThucHien() != null ? ws.getNgayThucHien().toString() : null);
                row.put("ngayKetThuc",    ws.getNgayThucHien() != null ? ws.getNgayThucHien().toString() : null);
                row.put("toThucHien",     ws.getToNhom());
                row.put("phongThucHien",  ws.getPhongThucHien());
                row.put("tinhTrang",      ws.getTinhTrang());
                row.put("chuY",           ws.getChuY());
                row.put("hasKhoach",      true);
                row.put("daBanHanh",      false);
                row.put("isFromKhoach",   true);
                grouped.put(key, row);
            } else {
                // Cập nhật ngayKetThuc sang ngày muộn nhất
                java.util.Map<String, Object> row = grouped.get(key);
                if (ws.getNgayThucHien() != null) {
                    String existing = (String) row.get("ngayKetThuc");
                    if (existing == null || ws.getNgayThucHien().toString().compareTo(existing) > 0) {
                        row.put("ngayKetThuc", ws.getNgayThucHien().toString());
                    }
                }
            }
        }
        return new java.util.ArrayList<>(grouped.values());
    }

    public List<LenhSanXuatDto> findByMaBravo(String maBravo) {
        return repo.findByMaBravo(maBravo).stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<LenhSanXuatDto> findAll(String tinhTrang, String toThucHien,
                                        java.time.LocalDate fromDate, java.time.LocalDate toDate) {
        List<LenhSanXuat> list = repo.findFiltered(tinhTrang, toThucHien, fromDate, toDate);
        // Build map: lenhId → soLoCu from latest history entry
        List<Long> ids = list.stream().map(LenhSanXuat::getId).collect(Collectors.toList());
        Map<Long, String> soLoCuMap = new HashMap<>();
        if (!ids.isEmpty()) {
            historyRepo.findByLenhIdInOrderByChangedAtDesc(ids).forEach(h -> {
                soLoCuMap.putIfAbsent(h.getLenhId(), h.getSoLoCu());
            });
        }
        return list.stream().map(e -> {
            LenhSanXuatDto dto = toDto(e);
            if (soLoCuMap.containsKey(e.getId())) dto.setSoLoCu(soLoCuMap.get(e.getId()));
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional
    public LenhSanXuatDto create(LenhSanXuatDto dto, String username) {
        // Chặn trùng lặp cứng: cùng maBravo + maDonHang + soLo + toThucHien (bất kể ngày/cỡ lô có khớp hay không)
        // → đây là khóa định danh thực sự của 1 lệnh (giống cách doiLo/update đang cascade). Có bao gồm
        // toThucHien vì 1 lô hợp lệ có thể có nhiều bản ghi khác tổ thực hiện (PCPL1/PL/ĐG/BBC1...).
        if (dto.getMaBravo() != null && dto.getSoLo() != null) {
            java.util.Optional<LenhSanXuat> hardDup = repo.findActiveByMaBravoAndMaDonHangAndSoLo(
                    dto.getMaBravo(), dto.getMaDonHang(), dto.getSoLo(), dto.getToThucHien());
            if (hardDup.isPresent()) {
                return toDto(hardDup.get());
            }
        }
        // Nếu đã tồn tại bản ghi với cùng key → trả về bản cũ, không tạo duplicate
        if (dto.getMaBravo() != null && dto.getNgayThucHien() != null) {
            java.util.Optional<LenhSanXuat> existing = repo.findExistingKey(
                    dto.getMaBravo(), dto.getMaDonHang(),
                    dto.getNgayThucHien(), dto.getToThucHien(), dto.getSoLo());
            if (existing.isPresent()) {
                return toDto(existing.get());
            }
        }
        LenhSanXuat e = new LenhSanXuat();
        applyDto(e, dto);
        if (e.getThuTu() == null) {
            e.setThuTu((repo.findMaxThuTu() == null ? 0 : repo.findMaxThuTu()) + 1);
        }
        // Tự động ban hành nếu đủ thông tin (nhất quán với update())
        if (e.getMaBravo() != null && e.getSoLo() != null) {
            e.setDaBanHanh(true);
        }
        e.setCreatedBy(username);
        e.setUpdatedBy(username);
        LenhSanXuat saved = repo.save(e);
        notificationService.createLenhSxNewNotification(
                saved.getId(), saved.getMaDonHang(), saved.getTenSanPham(), saved.getSoLo(), username);
        autoCreateSanLuong(saved, username);
        return toDto(saved);
    }

    private void autoCreateSanLuong(LenhSanXuat lenh, String username) {
        if (lenh.getMaBravo() == null || lenh.getSoLo() == null) return;

        // Tìm bản ghi Sản lượng hiện có hoặc tạo mới
        java.util.List<ProductionRecord> existing = productionRepo.findByLenhKey(
                lenh.getMaBravo(), lenh.getSoLo(), lenh.getMaDonHang());
        ProductionRecord pr;
        if (!existing.isEmpty()) {
            pr = existing.get(0);
        } else {
            pr = new ProductionRecord();
            pr.setMaBravo(lenh.getMaBravo());
            pr.setMaTp(lenh.getMaSp());
            pr.setTienTrinh(lenh.getTenSanPham());
            pr.setLsx(lenh.getSoLo());
            pr.setMaDonHang(lenh.getMaDonHang());
            pr.setSoLuong(lenh.getSoLuong() != null ? lenh.getSoLuong().intValue() : null);
            pr.setCreatedBy(username);
        }
        // Đánh dấu đã phát lệnh và set trạng thái các công đoạn
        pr.setPhatLenh(true);
        pr.setPcTrangThai("doing");
        pr.setPlTrangThai("doing");
        pr.setDgTrangThai("doing");
        pr.setBbc1TrangThai("doing");
        pr.setUpdatedBy(username);
        productionRepo.save(pr);

        // Tự động tạo bản ghi Lịch SX cho tất cả công đoạn
        String toNhomPcpl = lenh.getToThucHien();
        java.math.BigDecimal coLo = lenh.getSoLuong();
        workScheduleService.autoSyncFromProduction(
                lenh.getMaBravo(), lenh.getMaSp(), lenh.getTenSanPham(),
                lenh.getSoLo(), coLo, lenh.getMaDonHang(), true, toNhomPcpl);
    }

    @Transactional
    public LenhSanXuatDto update(Long id, LenhSanXuatDto dto, String username) {
        LenhSanXuat e = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lệnh sản xuất: " + id));
        String oldMaDonHang = e.getMaDonHang();
        String oldSoLo      = e.getSoLo();
        applyDto(e, dto);
        // Auto-mark daBanHanh when lệnh is linked to Sản lượng (has maBravo + soLo)
        if (e.getMaBravo() != null && e.getSoLo() != null && !Boolean.TRUE.equals(e.getDaBanHanh())) {
            e.setDaBanHanh(true);
        }
        e.setUpdatedBy(username);
        LenhSanXuat saved = repo.save(e);
        if (saved.getMaBravo() != null && saved.getSoLo() != null) {
            int updated = productionRepo.updateByLenhKey(
                    saved.getMaBravo(),
                    oldSoLo != null ? oldSoLo : saved.getSoLo(),
                    oldMaDonHang,
                    saved.getSoLuong() != null ? saved.getSoLuong().intValue() : null,
                    saved.getTenSanPham(),
                    saved.getMaSp(),
                    saved.getMaDonHang(),
                    username);
            if (updated == 0) {
                autoCreateSanLuong(saved, username);
            } else if (Boolean.TRUE.equals(saved.getDaBanHanh())) {
                // ProductionRecord đã tồn tại nhưng chưa sync Lịch SX → sync ngay
                String toNhomPcpl = saved.getToThucHien();
                java.math.BigDecimal coLo = saved.getSoLuong();
                workScheduleService.autoSyncFromProduction(
                        saved.getMaBravo(), saved.getMaSp(), saved.getTenSanPham(),
                        saved.getSoLo(), coLo, saved.getMaDonHang(), true, toNhomPcpl);
            }
        }
        return toDto(saved);
    }

    public int countPendingSync() {
        return (int) repo.findAll().stream()
                .filter(e -> e.getDeletedAt() == null
                          && e.getMaBravo() != null
                          && e.getSoLo() != null
                          && !productionRepo.existsByMaBravoAndLsxAndMaDonHang(
                                  e.getMaBravo(), e.getSoLo(), e.getMaDonHang()))
                .count();
    }

    public int countMissingLichSX() {
        return repo.countMissingLichSX();
    }

    /** Đếm và tạo reminder cho lệnh chưa phát hành */
    public java.util.Map<String, Object> countChuaPhatHanhByTo() {
        List<LenhSanXuat> pending = repo.findAll().stream()
                .filter(e -> e.getDeletedAt() == null && !Boolean.TRUE.equals(e.getDaBanHanh()) && e.getSoLo() != null)
                .collect(Collectors.toList());
        java.util.Map<String, Integer> byTo = new java.util.LinkedHashMap<>();
        for (LenhSanXuat e : pending) {
            String to = e.getToThucHien() != null ? e.getToThucHien() : "Chưa xếp";
            byTo.merge(to, 1, Integer::sum);
        }
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("total", pending.size());
        result.put("byTo", byTo);
        return result;
    }

    public int triggerChuaPhatHanhReminder(String username) {
        int count = (int) repo.findAll().stream()
                .filter(e -> e.getDeletedAt() == null && !Boolean.TRUE.equals(e.getDaBanHanh()) && e.getSoLo() != null)
                .count();
        notificationService.ensureLenhChuaPhatHanhReminder(count, username);
        return count;
    }

    /** Ban hành hàng loạt theo danh sách ID */
    @Transactional
    public int banHanhBulk(List<Long> ids, String username) {
        List<LenhSanXuat> list = repo.findAllById(ids).stream()
                .filter(e -> e.getDeletedAt() == null && !Boolean.TRUE.equals(e.getDaBanHanh()))
                .collect(Collectors.toList());
        list.forEach(e -> { e.setDaBanHanh(true); e.setUpdatedBy(username); });
        repo.saveAll(list);
        // Tạo ProductionRecord + SCHEDULE WorkSchedules cho từng lệnh vừa ban hành
        for (LenhSanXuat lenh : list) {
            if (lenh.getMaBravo() != null && lenh.getSoLo() != null) {
                try {
                    autoCreateSanLuong(lenh, username);
                } catch (Exception ex) {
                    System.err.println("banHanhBulk: lỗi autoCreateSanLuong id=" + lenh.getId()
                            + " — " + ex.getMessage());
                }
            }
        }
        return list.size();
    }

    /** Đồng bộ Lịch SX cho danh sách ID cụ thể */
    public int syncLichSXByIds(List<Long> ids, String username) {
        List<LenhSanXuat> list = repo.findAllById(ids).stream()
                .filter(e -> e.getDeletedAt() == null && e.getMaBravo() != null && e.getSoLo() != null)
                .collect(Collectors.toList());
        int total = 0;
        for (LenhSanXuat lenh : list) {
            try {
                total += workScheduleService.autoSyncFromProduction(
                        lenh.getMaBravo(), lenh.getMaSp(), lenh.getTenSanPham(),
                        lenh.getSoLo(), lenh.getSoLuong(), lenh.getMaDonHang(),
                        Boolean.TRUE.equals(lenh.getDaBanHanh()), lenh.getToThucHien());
            } catch (Exception e) {
                System.err.println("syncLichSXByIds: lỗi record " + lenh.getId()
                        + " — " + e.getMessage());
            }
        }
        return total;
    }

    /** Đồng bộ Lịch SX: tạo WorkSchedule SCHEDULE còn thiếu cho tất cả LenhSanXuat */
    public int syncAllLichSX(String username) {
        List<LenhSanXuat> all = repo.findAll().stream()
                .filter(e -> e.getDeletedAt() == null
                          && e.getMaBravo() != null
                          && e.getSoLo() != null)
                .collect(Collectors.toList());
        int total = 0;
        for (LenhSanXuat lenh : all) {
            try {
                total += workScheduleService.autoSyncFromProduction(
                        lenh.getMaBravo(), lenh.getMaSp(), lenh.getTenSanPham(),
                        lenh.getSoLo(), lenh.getSoLuong(), lenh.getMaDonHang(),
                        Boolean.TRUE.equals(lenh.getDaBanHanh()), lenh.getToThucHien());
            } catch (Exception e) {
                // Bỏ qua record lỗi, tiếp tục xử lý các record còn lại
                System.err.println("syncAllLichSX: lỗi record " + lenh.getId()
                        + " maBravo=" + lenh.getMaBravo() + " soLo=" + lenh.getSoLo()
                        + " — " + e.getMessage());
            }
        }
        return total;
    }

    @Transactional
    public int syncAllSanLuong(String username) {
        List<LenhSanXuat> all = repo.findAll().stream()
                .filter(e -> e.getDeletedAt() == null
                          && e.getMaBravo() != null
                          && e.getSoLo() != null)
                .collect(Collectors.toList());
        int count = 0;
        for (LenhSanXuat lenh : all) {
            if (!productionRepo.existsByMaBravoAndLsxAndMaDonHang(
                    lenh.getMaBravo(), lenh.getSoLo(), lenh.getMaDonHang())) {
                autoCreateSanLuong(lenh, username);
                count++;
            }
        }
        return count;
    }

    @Transactional
    public void delete(Long id, String username) {
        LenhSanXuat e = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lệnh: " + id));
        LocalDateTime now = LocalDateTime.now();
        e.setDeletedAt(now);
        e.setDeletedBy(username);
        repo.save(e);
        if (e.getMaBravo() != null && e.getSoLo() != null) {
            productionRepo.softDeleteByLenhKey(
                    e.getMaBravo(), e.getSoLo(), e.getMaDonHang(), now, username);
        }
    }

    @Transactional
    public int bulkDelete(List<Long> ids, String username) {
        List<LenhSanXuat> list = repo.findAllById(ids).stream()
                .filter(e -> e.getDeletedAt() == null)
                .collect(Collectors.toList());
        LocalDateTime now = LocalDateTime.now();
        list.forEach(e -> { e.setDeletedAt(now); e.setDeletedBy(username); });
        repo.saveAll(list);
        list.forEach(e -> {
            if (e.getMaBravo() != null && e.getSoLo() != null) {
                productionRepo.softDeleteByLenhKey(
                        e.getMaBravo(), e.getSoLo(), e.getMaDonHang(), now, username);
            }
        });
        return list.size();
    }

    public List<LenhSanXuatDto> findTrash() {
        return repo.findAllDeleted().stream().map(this::toDto).collect(Collectors.toList());
    }

    public LenhSanXuatDto restore(Long id, String username) {
        LenhSanXuat e = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lệnh: " + id));
        e.setDeletedAt(null);
        e.setDeletedBy(null);
        e.setUpdatedBy(username);
        return toDto(repo.save(e));
    }

    // ── Gộp bản ghi trùng lặp (maBravo + maDonHang + soLo) ──────────────────────

    /** Quét toàn bộ lệnh đang hoạt động, nhóm theo (maBravo, maDonHang, soLo), trả về các nhóm có ≥ 2 bản ghi */
    public List<Map<String, Object>> previewDuplicates() {
        List<LenhSanXuat> active = repo.findAll().stream()
                .filter(e -> e.getDeletedAt() == null && e.getMaBravo() != null && e.getSoLo() != null)
                .collect(Collectors.toList());

        java.util.LinkedHashMap<String, List<LenhSanXuat>> grouped = new java.util.LinkedHashMap<>();
        for (LenhSanXuat e : active) {
            // Bao gồm toThucHien trong key — 1 lô có thể hợp lệ có nhiều bản ghi khác tổ thực hiện
            // (PCPL1/PL/ĐG/BBC1...), không phải trùng lặp. Chỉ coi là trùng khi cùng tổ.
            String key = e.getMaBravo() + "|" + (e.getMaDonHang() != null ? e.getMaDonHang() : "") + "|" + e.getSoLo()
                    + "|" + (e.getToThucHien() != null ? e.getToThucHien() : "");
            grouped.computeIfAbsent(key, k -> new java.util.ArrayList<>()).add(e);
        }

        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (List<LenhSanXuat> members : grouped.values()) {
            if (members.size() < 2) continue;
            LenhSanXuat first = members.get(0);

            java.math.BigDecimal prodSoLuong = null;
            List<ProductionRecord> pr = productionRepo.findByLenhKey(first.getMaBravo(), first.getSoLo(), first.getMaDonHang());
            if (!pr.isEmpty() && pr.get(0).getSoLuong() != null) {
                prodSoLuong = java.math.BigDecimal.valueOf(pr.get(0).getSoLuong());
            }
            long distinctSoLuong = members.stream().map(LenhSanXuat::getSoLuong)
                    .filter(java.util.Objects::nonNull).distinct().count();

            Map<String, Object> row = new java.util.LinkedHashMap<>();
            row.put("maBravo", first.getMaBravo());
            row.put("maDonHang", first.getMaDonHang());
            row.put("soLo", first.getSoLo());
            row.put("soLuongConflict", distinctSoLuong > 1);
            row.put("productionSoLuong", prodSoLuong);
            row.put("suggestedKeeperId", suggestKeeper(members).getId());
            row.put("members", members.stream().map(this::toDto).collect(Collectors.toList()));
            result.add(row);
        }
        return result;
    }

    /** Ưu tiên bản ghi đã ban hành; sau đó bản ghi cũ nhất (createdAt), rồi id nhỏ nhất */
    private LenhSanXuat suggestKeeper(List<LenhSanXuat> members) {
        List<LenhSanXuat> banHanh = members.stream()
                .filter(e -> Boolean.TRUE.equals(e.getDaBanHanh()))
                .collect(Collectors.toList());
        List<LenhSanXuat> pool = banHanh.isEmpty() ? members : banHanh;
        return pool.stream()
                .min(java.util.Comparator
                        .comparing((LenhSanXuat e) -> e.getCreatedAt() != null ? e.getCreatedAt() : LocalDateTime.MAX)
                        .thenComparing(LenhSanXuat::getId))
                .orElse(members.get(0));
    }

    /**
     * Gộp các bản ghi trùng (mergeIds) vào bản ghi giữ lại (keeperId).
     * Không cascade soft-delete sang ProductionRecord/WorkSchedule vì các bản ghi trùng
     * dùng chung 1 ProductionRecord với bản ghi giữ lại (khớp theo maBravo+soLo+maDonHang).
     */
    @Transactional
    public LenhSanXuatDto mergeDuplicates(Long keeperId, List<Long> mergeIds, String username) {
        if (keeperId == null || mergeIds == null || mergeIds.isEmpty() || mergeIds.contains(keeperId)) {
            throw new IllegalArgumentException("Danh sách bản ghi cần gộp không hợp lệ");
        }
        LenhSanXuat keeper = repo.findById(keeperId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi giữ lại: " + keeperId));
        if (keeper.getDeletedAt() != null) {
            throw new RuntimeException("Bản ghi giữ lại đã bị xóa, không thể gộp vào");
        }
        List<LenhSanXuat> toMerge = repo.findAllById(mergeIds);
        if (toMerge.size() != mergeIds.size()) {
            throw new RuntimeException("Một số bản ghi cần gộp không tồn tại");
        }
        for (LenhSanXuat dup : toMerge) {
            if (dup.getDeletedAt() != null) continue;
            if (!sameLenhKey(keeper, dup)) {
                throw new IllegalArgumentException(
                        "Bản ghi id=" + dup.getId() + " không cùng maBravo/maDonHang/soLo với bản ghi giữ lại");
            }
        }

        // Đối chiếu soLuong (cỡ lô) với ProductionRecord — nguồn dữ liệu downstream đang thực sự được dùng
        java.math.BigDecimal prodSoLuong = null;
        if (keeper.getMaBravo() != null && keeper.getSoLo() != null) {
            List<ProductionRecord> pr = productionRepo.findByLenhKey(keeper.getMaBravo(), keeper.getSoLo(), keeper.getMaDonHang());
            if (!pr.isEmpty() && pr.get(0).getSoLuong() != null) {
                prodSoLuong = java.math.BigDecimal.valueOf(pr.get(0).getSoLuong());
            }
        }
        if (prodSoLuong != null) {
            boolean keeperMatches = keeper.getSoLuong() != null && keeper.getSoLuong().compareTo(prodSoLuong) == 0;
            if (!keeperMatches) {
                final java.math.BigDecimal target = prodSoLuong;
                toMerge.stream()
                        .filter(d -> d.getSoLuong() != null && d.getSoLuong().compareTo(target) == 0)
                        .findFirst()
                        .ifPresent(d -> keeper.setSoLuong(d.getSoLuong()));
            }
        } else if (keeper.getSoLuong() == null) {
            toMerge.stream().filter(d -> d.getSoLuong() != null).findFirst()
                    .ifPresent(d -> keeper.setSoLuong(d.getSoLuong()));
        }

        // Bổ sung các field còn trống trên bản ghi giữ lại từ các bản ghi trùng
        for (LenhSanXuat dup : toMerge) {
            if (isBlank(keeper.getGhiChu()) && !isBlank(dup.getGhiChu())) keeper.setGhiChu(dup.getGhiChu());
            if (isBlank(keeper.getChuY()) && !isBlank(dup.getChuY())) keeper.setChuY(dup.getChuY());
            if (isBlank(keeper.getPhongThucHien()) && !isBlank(dup.getPhongThucHien())) keeper.setPhongThucHien(dup.getPhongThucHien());
            if (isBlank(keeper.getToThucHien()) && !isBlank(dup.getToThucHien())) keeper.setToThucHien(dup.getToThucHien());
            if (isBlank(keeper.getTinhTrang()) && !isBlank(dup.getTinhTrang())) keeper.setTinhTrang(dup.getTinhTrang());
            if (keeper.getNgayThucHien() == null && dup.getNgayThucHien() != null) keeper.setNgayThucHien(dup.getNgayThucHien());
            if (keeper.getNgayKetThuc() == null && dup.getNgayKetThuc() != null) keeper.setNgayKetThuc(dup.getNgayKetThuc());
            if (keeper.getNgayPhatLenh() == null && dup.getNgayPhatLenh() != null) keeper.setNgayPhatLenh(dup.getNgayPhatLenh());
            if (keeper.getSoNguoiThucHien() == null && dup.getSoNguoiThucHien() != null) keeper.setSoNguoiThucHien(dup.getSoNguoiThucHien());
            if (!Boolean.TRUE.equals(keeper.getDaBanHanh()) && Boolean.TRUE.equals(dup.getDaBanHanh())) keeper.setDaBanHanh(true);
            if (!Boolean.TRUE.equals(keeper.getDaLenLichLam()) && Boolean.TRUE.equals(dup.getDaLenLichLam())) keeper.setDaLenLichLam(true);
            if (!Boolean.TRUE.equals(keeper.getDaDgVaXepLichDg()) && Boolean.TRUE.equals(dup.getDaDgVaXepLichDg())) keeper.setDaDgVaXepLichDg(true);
        }
        keeper.setUpdatedBy(username);
        LenhSanXuat savedKeeper = repo.save(keeper);

        // Re-point lịch sử đổi lô / đổi field sang bản ghi giữ lại trước khi xóa mềm
        List<Long> activeMergeIds = toMerge.stream()
                .filter(d -> d.getDeletedAt() == null)
                .map(LenhSanXuat::getId)
                .collect(Collectors.toList());
        if (!activeMergeIds.isEmpty()) {
            historyRepo.repointLenhId(activeMergeIds, keeperId);
            fieldHistoryRepo.repointLenhId(activeMergeIds, keeperId);
        }

        // Xóa mềm các bản ghi trùng — KHÔNG cascade sang ProductionRecord/WorkSchedule
        // (khác với delete()/bulkDelete() vì các bản ghi này dùng chung dữ liệu với bản ghi giữ lại)
        LocalDateTime now = LocalDateTime.now();
        for (LenhSanXuat dup : toMerge) {
            if (dup.getDeletedAt() == null) {
                dup.setDeletedAt(now);
                dup.setDeletedBy(username);
                dup.setUpdatedBy(username);
            }
        }
        repo.saveAll(toMerge);

        return toDto(savedKeeper);
    }

    private boolean sameLenhKey(LenhSanXuat a, LenhSanXuat b) {
        return java.util.Objects.equals(a.getMaBravo(), b.getMaBravo())
                && java.util.Objects.equals(a.getMaDonHang(), b.getMaDonHang())
                && java.util.Objects.equals(a.getSoLo(), b.getSoLo())
                && java.util.Objects.equals(a.getToThucHien(), b.getToThucHien());
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    public void deletePermanent(Long id) {
        repo.deleteById(id);
    }

    public Map<String, Object> previewDoiLo(Long id) {
        LenhSanXuat e = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lệnh: " + id));
        boolean hasKey = e.getMaDonHang() != null && e.getSoLo() != null;
        long soKhoanLich     = hasKey ? workScheduleRepo.countByMaDonHangAndSoLoNative(e.getMaDonHang(), e.getSoLo()) : 0;
        long soKhoanSanLuong = hasKey ? productionRepo.countByMaDonHangAndLsxNative(e.getMaDonHang(), e.getSoLo())   : 0;
        List<LenhSanXuat> siblings = (e.getMaBravo() != null && e.getSoLo() != null)
                ? repo.findAllActiveByMaBravoAndMaDonHangAndSoLo(e.getMaBravo(), e.getMaDonHang(), e.getSoLo())
                : List.of(e);
        List<String> toThucHienList = siblings.stream()
                .map(LenhSanXuat::getToThucHien).filter(java.util.Objects::nonNull).distinct().collect(Collectors.toList());
        return Map.of(
                "soLoCu",         e.getSoLo()     != null ? e.getSoLo()     : "",
                "maDonHang",      e.getMaDonHang() != null ? e.getMaDonHang() : "",
                "soKhoanLich",     soKhoanLich,
                "soKhoanSanLuong", soKhoanSanLuong,
                "soLuongLenh",     siblings.size(),
                "toThucHienList",  toThucHienList
        );
    }

    /**
     * Đổi lô áp dụng cho toàn bộ nhóm (mọi tổ thực hiện của cùng maBravo+maDonHang+soLo cũ),
     * không chỉ riêng bản ghi id được truyền vào — tránh lệch dữ liệu giữa các bản ghi cùng lô
     * (WorkSchedule/ProductionRecord vốn đã cascade theo maDonHang+soLo, không phân biệt tổ).
     */
    @Transactional
    public LenhSanXuatDto doiLo(Long id, String soLoMoi, String lyDo, String username) {
        LenhSanXuat e = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lệnh: " + id));
        String soLoCu = e.getSoLo();

        List<LenhSanXuat> siblings = (e.getMaBravo() != null && soLoCu != null)
                ? repo.findAllActiveByMaBravoAndMaDonHangAndSoLo(e.getMaBravo(), e.getMaDonHang(), soLoCu)
                : List.of(e);
        if (siblings.isEmpty()) siblings = List.of(e);

        LocalDateTime now = LocalDateTime.now();
        for (LenhSanXuat sib : siblings) {
            LenhLoHistory hist = new LenhLoHistory();
            hist.setLenhId(sib.getId());
            hist.setSoLoCu(soLoCu);
            hist.setSoLoMoi(soLoMoi);
            hist.setLyDo(lyDo);
            hist.setChangedBy(username);
            hist.setChangedAt(now);
            historyRepo.save(hist);

            sib.setSoLo(soLoMoi);
            sib.setUpdatedBy(username);
        }
        List<LenhSanXuat> savedAll = repo.saveAll(siblings);
        LenhSanXuat saved = savedAll.stream().filter(s -> s.getId().equals(id)).findFirst().orElse(savedAll.get(0));

        if (e.getMaDonHang() != null && soLoCu != null) {
            // Cascade → Kế hoạch/Lịch làm việc
            workScheduleRepo.updateSoLoByMaDonHangNative(e.getMaDonHang(), soLoCu, soLoMoi);
            // Cascade → Sản lượng
            productionRepo.updateLsxByMaDonHangNative(e.getMaDonHang(), soLoCu, soLoMoi);
        }

        // Gửi thông báo cho tất cả admin
        notificationService.createDoiLoNotification(
                id, e.getMaDonHang(), e.getTenSanPham(), soLoCu, soLoMoi, lyDo, username);

        return toDto(saved);
    }

    public List<LenhLoHistoryDto> getLichSuDoiLo(Long id) {
        return historyRepo.findByLenhIdOrderByChangedAtDesc(id)
                .stream().map(this::toHistoryDto).collect(Collectors.toList());
    }

    public List<LenhLoHistoryDto> getDoiLoHistoryByKey(String maDonHang, String soLo) {
        if (maDonHang == null || maDonHang.isBlank() || soLo == null || soLo.isBlank())
            return List.of();
        return historyRepo.findByMaDonHangAndSoLoMoi(maDonHang, soLo)
                .stream().map(this::toHistoryDto).collect(Collectors.toList());
    }

    public LenhSanXuatDto doiField(Long id, String fieldName, String newValue, String lyDo, String username) {
        if (!LOCKABLE_FIELDS.contains(fieldName))
            throw new IllegalArgumentException("Field không được phép chỉnh sửa: " + fieldName);
        LenhSanXuat e = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lệnh: " + id));
        String oldValue = switch (fieldName) {
            case "maBravo"    -> e.getMaBravo();
            case "maSp"       -> e.getMaSp();
            case "tenSanPham" -> e.getTenSanPham();
            case "maDonHang"  -> e.getMaDonHang();
            default           -> null;
        };
        LenhFieldHistory hist = new LenhFieldHistory();
        hist.setLenhId(id);
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

    public List<LenhFieldHistoryDto> getFieldHistory(Long id, String fieldName) {
        List<LenhFieldHistory> list = (fieldName != null && !fieldName.isBlank())
                ? fieldHistoryRepo.findByLenhIdAndFieldNameOrderByChangedAtDesc(id, fieldName)
                : fieldHistoryRepo.findByLenhIdOrderByChangedAtDesc(id);
        return list.stream().map(h -> {
            LenhFieldHistoryDto d = new LenhFieldHistoryDto();
            d.setId(h.getId());
            d.setLenhId(h.getLenhId());
            d.setFieldName(h.getFieldName());
            d.setOldValue(h.getOldValue());
            d.setNewValue(h.getNewValue());
            d.setLyDo(h.getLyDo());
            d.setChangedBy(h.getChangedBy());
            d.setChangedAt(h.getChangedAt());
            return d;
        }).collect(Collectors.toList());
    }

    private LenhLoHistoryDto toHistoryDto(LenhLoHistory h) {
        LenhLoHistoryDto d = new LenhLoHistoryDto();
        d.setId(h.getId());
        d.setLenhId(h.getLenhId());
        d.setSoLoCu(h.getSoLoCu());
        d.setSoLoMoi(h.getSoLoMoi());
        d.setLyDo(h.getLyDo());
        d.setChangedBy(h.getChangedBy());
        d.setChangedAt(h.getChangedAt());
        return d;
    }

    // ── Mapping helpers ────────────────────────────────────────────────────────
    private void applyDto(LenhSanXuat e, LenhSanXuatDto d) {
        if (d.getThuTu()            != null) e.setThuTu(d.getThuTu());
        if (d.getMaBravo()          != null) e.setMaBravo(d.getMaBravo());
        if (d.getMaSp()             != null) e.setMaSp(d.getMaSp());
        if (d.getTenSanPham()       != null) e.setTenSanPham(d.getTenSanPham());
        e.setSoLo(d.getSoLo());
        if (d.getMaDonHang() != null) e.setMaDonHang(d.getMaDonHang());
        e.setSoLuong(d.getSoLuong());
        e.setTinhTrang(d.getTinhTrang());
        e.setPhongThucHien(d.getPhongThucHien());
        e.setNgayThucHien(d.getNgayThucHien());
        e.setToThucHien(d.getToThucHien());
        e.setSoNguoiThucHien(d.getSoNguoiThucHien());
        e.setChuY(d.getChuY());
        if (d.getDaLenLichLam()     != null) e.setDaLenLichLam(d.getDaLenLichLam());
        e.setGhiChu(d.getGhiChu());
        if (d.getDaDgVaXepLichDg()  != null) e.setDaDgVaXepLichDg(d.getDaDgVaXepLichDg());
        if (d.getDaBanHanh()        != null) e.setDaBanHanh(d.getDaBanHanh());
        e.setNgayKetThuc(d.getNgayKetThuc());
        e.setNgayPhatLenh(d.getNgayPhatLenh());
    }

    private LenhSanXuatDto toDto(LenhSanXuat e) {
        LenhSanXuatDto d = new LenhSanXuatDto();
        d.setId(e.getId());
        d.setThuTu(e.getThuTu());
        d.setMaBravo(e.getMaBravo());
        d.setMaSp(e.getMaSp());
        d.setTenSanPham(e.getTenSanPham());
        d.setSoLo(e.getSoLo());
        d.setMaDonHang(e.getMaDonHang());
        d.setSoLuong(e.getSoLuong());
        d.setTinhTrang(e.getTinhTrang());
        d.setPhongThucHien(e.getPhongThucHien());
        d.setNgayThucHien(e.getNgayThucHien());
        d.setToThucHien(e.getToThucHien());
        d.setSoNguoiThucHien(e.getSoNguoiThucHien());
        d.setChuY(e.getChuY());
        d.setDaLenLichLam(e.getDaLenLichLam());
        d.setGhiChu(e.getGhiChu());
        d.setDaDgVaXepLichDg(e.getDaDgVaXepLichDg());
        d.setDaBanHanh(e.getDaBanHanh());
        d.setNgayKetThuc(e.getNgayKetThuc());
        d.setNgayPhatLenh(e.getNgayPhatLenh());
        d.setDeletedAt(e.getDeletedAt());
        d.setDeletedBy(e.getDeletedBy());
        d.setCreatedAt(e.getCreatedAt());
        d.setUpdatedAt(e.getUpdatedAt());
        d.setCreatedBy(e.getCreatedBy());
        d.setUpdatedBy(e.getUpdatedBy());
        // hasKhoach: kiểm tra tồn tại bản ghi PLAN theo key
        boolean hasKhoach = workScheduleRepo.existsByPlanKey(e.getMaBravo(), e.getMaDonHang(), e.getSoLo());
        d.setHasKhoach(hasKhoach);
        return d;
    }

    @Transactional
    public LenhSanXuatDto createFromWorkSchedule(Long workScheduleId, String soLoInput, String username) {
        WorkSchedule ws = workScheduleRepo.findById(workScheduleId)
                .orElseThrow(() -> new RuntimeException("WorkSchedule not found: " + workScheduleId));
        if (!"PLAN".equals(ws.getSource())) return null;

        String effectiveSoLo = (soLoInput != null && !soLoInput.isBlank()) ? soLoInput.trim() : ws.getSoLo();

        // BƯỚC 1: Cập nhật soLo vào WorkSchedule này VÀ tất cả bản ghi cùng nhóm (maBravo+maDonHang+toNhom)
        // Phải làm TRƯỚC khi check duplicate để row biến mất khỏi tab Chưa xếp
        if (effectiveSoLo != null && !effectiveSoLo.isBlank()) {
            if (!effectiveSoLo.equals(ws.getSoLo())) {
                ws.setSoLo(effectiveSoLo);
                workScheduleRepo.save(ws);
            }
            // Cập nhật tất cả WorkSchedule PLAN cùng nhóm còn thiếu soLo
            List<WorkSchedule> siblings = workScheduleRepo.findPlanSiblingsWithoutSoLo(
                    ws.getMaBravo(), ws.getMaDonHang(), ws.getToNhom(), ws.getId());
            for (WorkSchedule sib : siblings) {
                sib.setSoLo(effectiveSoLo);
                workScheduleRepo.save(sib);
            }
        }

        // BƯỚC 2: Kiểm tra duplicate LenhSanXuat
        if (ws.getMaBravo() != null && ws.getNgayThucHien() != null) {
            // 2a: tìm bản ghi khớp chính xác (cả soLo)
            Optional<LenhSanXuat> existing = repo.findExistingKey(
                    ws.getMaBravo(), ws.getMaDonHang(),
                    ws.getNgayThucHien(), ws.getToNhom(), effectiveSoLo);
            if (existing.isPresent()) return toDto(existing.get());

            // 2b: nếu đang gán soLo mới, tìm bản ghi cũ có soLo=NULL để cập nhật thay vì tạo thêm
            if (effectiveSoLo != null) {
                Optional<LenhSanXuat> nullSoLoExisting = repo.findExistingKey(
                        ws.getMaBravo(), ws.getMaDonHang(),
                        ws.getNgayThucHien(), ws.getToNhom(), null);
                if (nullSoLoExisting.isPresent()) {
                    LenhSanXuat ex = nullSoLoExisting.get();
                    ex.setSoLo(effectiveSoLo);
                    ex.setUpdatedBy(username);
                    return toDto(repo.save(ex));
                }
            }
        }

        // BƯỚC 3: Tạo LenhSanXuat — daBanHanh=false (màu cam) cho đến khi user phát hành thủ công
        LenhSanXuat e = new LenhSanXuat();
        e.setMaBravo(ws.getMaBravo());
        e.setMaSp(ws.getMaSp());
        e.setTenSanPham(ws.getTenTrinh());
        e.setSoLo(effectiveSoLo);
        e.setMaDonHang(ws.getMaDonHang());
        e.setSoLuong(ws.getCoLo());
        e.setNgayThucHien(ws.getNgayThucHien());
        e.setToThucHien(ws.getToNhom());
        e.setPhongThucHien(ws.getPhongThucHien());
        e.setCreatedBy(username);
        e.setUpdatedBy(username);
        Integer maxThu = repo.findMaxThuTu();
        e.setThuTu(maxThu == null ? 1 : maxThu + 1);
        e.setDaBanHanh(false);
        return toDto(repo.save(e));
    }

    public List<Map<String, Object>> statsByProduct(int year) {
        List<Object[]> rows = repo.findStatsByProductYear(year);
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (Object[] r : rows) {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("maBravo",      r[0]);
            m.put("soLo",         r[1] != null ? ((Number) r[1]).longValue() : 0L);
            m.put("tongSoLuong",  r[2] != null ? r[2] : 0);
            m.put("ngayGanNhat",  r[3] != null ? r[3].toString() : null);
            m.put("dangSanXuat",  r[4] != null && ((Number) r[4]).intValue() == 1);
            result.add(m);
        }
        return result;
    }
}
