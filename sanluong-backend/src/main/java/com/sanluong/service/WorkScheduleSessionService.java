package com.sanluong.service;

import com.sanluong.dto.DailyProductionDto;
import com.sanluong.dto.EmployeeSessionDetailDto;
import com.sanluong.dto.WorkScheduleSessionDto;
import com.sanluong.entity.ProductMaster;
import com.sanluong.entity.WorkEfficiency;
import com.sanluong.entity.WorkSchedule;
import com.sanluong.entity.WorkScheduleSession;
import com.sanluong.entity.SlChangeRequest;
import com.sanluong.repository.EmployeeRepository;
import com.sanluong.repository.ProductMasterRepository;
import com.sanluong.repository.SlChangeRequestRepository;
import com.sanluong.repository.WorkEfficiencyRepository;
import com.sanluong.repository.WorkScheduleRepository;
import com.sanluong.repository.WorkScheduleSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class WorkScheduleSessionService {

    private final WorkScheduleSessionRepository repository;
    private final WorkScheduleRepository workScheduleRepository;
    private final WorkEfficiencyRepository workEfficiencyRepository;
    private final SlChangeRequestRepository slChangeRequestRepository;
    private final ProductMasterRepository productMasterRepository;
    private final EmployeeRepository employeeRepository;

    public WorkScheduleSessionService(WorkScheduleSessionRepository repository,
                                      WorkScheduleRepository workScheduleRepository,
                                      WorkEfficiencyRepository workEfficiencyRepository,
                                      SlChangeRequestRepository slChangeRequestRepository,
                                      ProductMasterRepository productMasterRepository,
                                      EmployeeRepository employeeRepository) {
        this.repository = repository;
        this.workScheduleRepository = workScheduleRepository;
        this.workEfficiencyRepository = workEfficiencyRepository;
        this.slChangeRequestRepository = slChangeRequestRepository;
        this.productMasterRepository = productMasterRepository;
        this.employeeRepository = employeeRepository;
    }

    public List<WorkScheduleSession> getByScheduleId(Long scheduleId) {
        return repository.findByWorkScheduleIdOrderByNgayAscIdAsc(scheduleId);
    }

    public WorkScheduleSession getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Không tìm thấy session: " + id));
    }

    public WorkScheduleSession create(WorkScheduleSessionDto dto) {
        WorkScheduleSession s = new WorkScheduleSession();
        mapFromDto(s, dto);
        WorkScheduleSession saved = repository.save(s);
        recalculateGroupNs(saved.getWorkScheduleId(), saved.getNgay());
        syncAggregates(saved.getWorkScheduleId());
        recalculateEfficiency(saved.getMaNhanVien());
        return saved;
    }

    public WorkScheduleSession update(Long id, WorkScheduleSessionDto dto) {
        WorkScheduleSession s = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy session ID: " + id));
        String oldMaNv = s.getMaNhanVien();
        mapFromDto(s, dto);
        WorkScheduleSession saved = repository.save(s);
        recalculateGroupNs(saved.getWorkScheduleId(), saved.getNgay());
        syncAggregates(saved.getWorkScheduleId());
        // Nếu đổi nhân viên, cập nhật cả người cũ
        if (oldMaNv != null && !oldMaNv.equals(saved.getMaNhanVien())) {
            recalculateEfficiency(oldMaNv);
        }
        recalculateEfficiency(saved.getMaNhanVien());
        return saved;
    }

    @Transactional
    public void delete(Long id) {
        WorkScheduleSession existing = repository.findById(id).orElse(null);
        Long workScheduleId = existing != null ? existing.getWorkScheduleId() : null;
        String maNv = existing != null ? existing.getMaNhanVien() : null;
        repository.deleteById(id);
        syncAggregates(workScheduleId);
        recalculateEfficiency(maNv);
    }

    /**
     * Tính lại congXxx / slXxx trên WorkSchedule từ tổng hợp tất cả sessions.
     * Công = tổng congThucHien; SL = tổng sanLuong đại diện mỗi ngày (1 giá trị/ngày).
     */
    private void syncAggregates(Long workScheduleId) {
        if (workScheduleId == null) return;
        WorkSchedule ws = workScheduleRepository.findById(workScheduleId).orElse(null);
        if (ws == null || ws.getCongDoan() == null) return;

        List<WorkScheduleSession> sessions = repository.findByWorkScheduleIdOrderByNgayAscIdAsc(workScheduleId);

        BigDecimal totalCong = sessions.stream()
                .filter(s -> s.getCongThucHien() != null)
                .map(WorkScheduleSession::getCongThucHien)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Mỗi ngày chỉ lấy 1 giá trị sanLuong (tất cả session trong ngày dùng chung)
        BigDecimal totalSl = sessions.stream()
                .filter(s -> s.getNgay() != null
                        && s.getSanLuong() != null
                        && s.getSanLuong().compareTo(BigDecimal.ZERO) > 0)
                .collect(Collectors.toMap(
                        s -> s.getNgay().toString(),
                        WorkScheduleSession::getSanLuong,
                        (a, b) -> a))
                .values().stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal cong = totalCong.compareTo(BigDecimal.ZERO) == 0 ? null : totalCong;
        BigDecimal sl   = totalSl.compareTo(BigDecimal.ZERO)   == 0 ? null : totalSl;

        switch (ws.getCongDoan()) {
            case "PC"   -> { ws.setCongPc(cong);   ws.setSlPc(sl);   }
            case "BBC1" -> { ws.setCongBbc1(cong); ws.setSlBbc1(sl); }
            case "PL"   -> { ws.setCongPl(cong);   ws.setSlPl(sl);   }
            case "DG"   -> { ws.setCongDg(cong);   ws.setSlDg(sl);   }
            case "CC"   -> ws.setCongCc(cong);
            default     -> { return; }
        }
        workScheduleRepository.save(ws);
    }

    /** Tính lại soGioTruongCa, soGioPhuMay, soLanDat, soLanKhongDat cho nhân viên */
    private void recalculateEfficiency(String maNhanVien) {
        if (maNhanVien == null || maNhanVien.isBlank()) return;
        List<WorkScheduleSession> sessions = repository.findByMaNhanVienOrderByNgayDescIdDesc(maNhanVien);

        BigDecimal tongTruongCa = sessions.stream()
                .filter(s -> "Trưởng ca".equals(s.getVaiTro()) && s.getThoiGianBatDau() != null && !s.getThoiGianBatDau().isBlank())
                .map(s -> { try { return new BigDecimal(s.getThoiGianBatDau()); } catch (Exception e) { return BigDecimal.ZERO; } })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal tongPhuMay = sessions.stream()
                .filter(s -> "Phụ máy".equals(s.getVaiTro()) && s.getThoiGianBatDau() != null && !s.getThoiGianBatDau().isBlank())
                .map(s -> { try { return new BigDecimal(s.getThoiGianBatDau()); } catch (Exception e) { return BigDecimal.ZERO; } })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long soLanDat = sessions.stream().filter(s ->
                s.getNangSuat() != null && s.getNangSuatTrungBinh() != null
                && s.getNangSuat().compareTo(s.getNangSuatTrungBinh()) >= 0
        ).count();
        long soLanKhongDat = sessions.stream().filter(s ->
                s.getNangSuat() != null && s.getNangSuatTrungBinh() != null
                && s.getNangSuat().compareTo(s.getNangSuatTrungBinh()) < 0
        ).count();

        workEfficiencyRepository.findByMaNhanVien(maNhanVien).ifPresent(we -> {
            we.setSoGioTruongCa(tongTruongCa.compareTo(BigDecimal.ZERO) == 0 ? null : tongTruongCa);
            we.setSoGioPhuMay(tongPhuMay.compareTo(BigDecimal.ZERO) == 0 ? null : tongPhuMay);
            we.setSoLanDat((int) soLanDat);
            we.setSoLanKhongDat((int) soLanKhongDat);
            workEfficiencyRepository.save(we);
        });
    }

    /**
     * Tính lại nangSuat cho tất cả session trong cùng nhóm sản xuất (workScheduleId + ngày).
     * NS nhóm = tổng sanLuong của nhóm / tổng công của nhóm (chia đều cho mọi thành viên).
     */
    private void recalculateGroupNs(Long workScheduleId, java.time.LocalDate ngay) {
        if (workScheduleId == null || ngay == null) return;
        List<WorkScheduleSession> group = repository.findByWorkScheduleIdAndNgay(workScheduleId, ngay);
        if (group.isEmpty()) return;

        // Tìm sanLuong nhóm (session nào đã ghi)
        BigDecimal groupSanLuong = group.stream()
                .filter(s -> s.getSanLuong() != null && s.getSanLuong().compareTo(BigDecimal.ZERO) > 0)
                .map(WorkScheduleSession::getSanLuong)
                .findFirst().orElse(null);

        if (groupSanLuong == null) return; // Chưa ghi sản lượng → giữ nguyên

        // Tổng công nhóm
        BigDecimal totalCong = group.stream()
                .filter(s -> s.getCongThucHien() != null)
                .map(WorkScheduleSession::getCongThucHien)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalCong.compareTo(BigDecimal.ZERO) == 0) return;

        // NS nhóm = sanLuong / tổng công → tất cả nhân viên trong nhóm dùng chung giá trị này
        BigDecimal groupNs = groupSanLuong.divide(totalCong, 4, java.math.RoundingMode.HALF_UP);

        for (WorkScheduleSession s : group) {
            if (s.getCongThucHien() != null && s.getCongThucHien().compareTo(BigDecimal.ZERO) > 0) {
                if (!groupNs.equals(s.getNangSuat())) {
                    s.setNangSuat(groupNs);
                    repository.save(s);
                }
            }
        }

        // Cập nhật lại hiệu quả cho tất cả nhân viên trong nhóm
        group.stream()
                .map(WorkScheduleSession::getMaNhanVien)
                .filter(m -> m != null && !m.isBlank())
                .distinct()
                .forEach(this::recalculateEfficiency);
    }

    /**
     * Backfill nhomThucHien cho tất cả sessions cũ còn null/blank.
     * Logic: congDoan = BBC1 → "BBC1", DG → "ĐG", PL → "PL"
     * (PC không thể tự phân biệt PCPL1/2/3 — bỏ qua)
     */
    @Transactional
    public int fixNhomThucHien() {
        List<WorkScheduleSession> all = repository.findAll();
        Set<Long> scheduleIds = all.stream()
                .map(WorkScheduleSession::getWorkScheduleId).filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, WorkSchedule> wsMap = workScheduleRepository.findAllById(scheduleIds).stream()
                .collect(Collectors.toMap(WorkSchedule::getId, w -> w));

        int fixed = 0;
        for (WorkScheduleSession s : all) {
            if (s.getNhomThucHien() != null && !s.getNhomThucHien().isBlank()) continue;
            if (s.getWorkScheduleId() == null) continue;
            WorkSchedule ws = wsMap.get(s.getWorkScheduleId());
            if (ws == null || ws.getCongDoan() == null) continue;
            String derived = switch (ws.getCongDoan()) {
                case "BBC1" -> "BBC1";
                case "DG"   -> "ĐG";
                case "PL"   -> "PL";
                default     -> null;
            };
            if (derived != null) {
                s.setNhomThucHien(derived);
                repository.save(s);
                fixed++;
            }
        }
        return fixed;
    }

    /**
     * Backfill maNhanVien cho tất cả sessions có nguoiThucHien nhưng maNhanVien = null.
     * Ưu tiên: khớp theo (hoVaTen + nhomThucHien) → fallback khớp theo hoVaTen đơn thuần.
     * Nếu tên trùng nhiều nhóm mà không có nhomThucHien → bỏ qua (để tránh gán sai).
     */
    @Transactional
    public int fixNullMaNhanVien() {
        List<WorkScheduleSession> all = repository.findAll();
        List<com.sanluong.entity.Employee> employees = employeeRepository.findAll();
        // Index: hoVaTen (lowercase) → list of employees
        java.util.Map<String, List<com.sanluong.entity.Employee>> byName = employees.stream()
                .collect(Collectors.groupingBy(e -> e.getHoVaTen().trim().toLowerCase()));

        int fixed = 0;
        for (WorkScheduleSession s : all) {
            if (s.getMaNhanVien() != null && !s.getMaNhanVien().isBlank()) continue;
            if (s.getNguoiThucHien() == null || s.getNguoiThucHien().isBlank()) continue;

            String nameKey = s.getNguoiThucHien().trim().toLowerCase();
            List<com.sanluong.entity.Employee> candidates = byName.getOrDefault(nameKey, List.of());
            if (candidates.isEmpty()) continue;

            com.sanluong.entity.Employee resolved = null;
            if (candidates.size() == 1) {
                resolved = candidates.get(0);
            } else if (s.getNhomThucHien() != null && !s.getNhomThucHien().isBlank()) {
                // Tên trùng → ưu tiên khớp nhóm
                String nhom = s.getNhomThucHien().trim();
                resolved = candidates.stream()
                        .filter(e -> nhom.equalsIgnoreCase(e.getToNhom()))
                        .findFirst().orElse(null);
                // ĐG/DG normalization
                if (resolved == null && ("ĐG".equals(nhom) || "DG".equals(nhom))) {
                    resolved = candidates.stream()
                            .filter(e -> "ĐG".equals(e.getToNhom()) || "DG".equals(e.getToNhom()))
                            .findFirst().orElse(null);
                }
            }
            // Nếu tên trùng mà không xác định được nhóm → bỏ qua tránh gán sai
            if (resolved == null) continue;

            s.setMaNhanVien(resolved.getMaNhanVien());
            repository.save(s);
            fixed++;
        }
        // Tính lại hiệu quả cho các nhân viên vừa được cập nhật
        all.stream()
                .filter(s -> s.getMaNhanVien() != null)
                .map(WorkScheduleSession::getMaNhanVien)
                .distinct()
                .forEach(this::recalculateEfficiency);
        return fixed;
    }

    /**
     * Backfill nangSuat (nhóm) và nangSuatTrungBinh cho tất cả sessions hiện có,
     * sau đó tính lại hiệu quả cho tất cả nhân viên.
     */
    @Transactional
    public int recalculateAllSessions() {
        List<WorkScheduleSession> all = repository.findAll();
        Set<Long> scheduleIds = all.stream()
                .map(WorkScheduleSession::getWorkScheduleId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, WorkSchedule> wsMap = workScheduleRepository.findAllById(scheduleIds).stream()
                .collect(Collectors.toMap(WorkSchedule::getId, w -> w));

        // Nhóm sessions theo (workScheduleId | ngày)
        Map<String, List<WorkScheduleSession>> groups = all.stream()
                .filter(s -> s.getWorkScheduleId() != null && s.getNgay() != null)
                .collect(Collectors.groupingBy(
                        s -> s.getWorkScheduleId() + "|" + s.getNgay(),
                        java.util.LinkedHashMap::new, Collectors.toList()));

        int updated = 0;
        for (List<WorkScheduleSession> group : groups.values()) {
            WorkSchedule ws = wsMap.get(group.get(0).getWorkScheduleId());
            BigDecimal nsTb = ws != null ? computeNsTb(ws) : null;

            // NS nhóm
            BigDecimal groupSanLuong = group.stream()
                    .filter(s -> s.getSanLuong() != null && s.getSanLuong().compareTo(BigDecimal.ZERO) > 0)
                    .map(WorkScheduleSession::getSanLuong)
                    .findFirst().orElse(null);

            BigDecimal groupNs = null;
            if (groupSanLuong != null) {
                BigDecimal totalCong = group.stream()
                        .filter(s -> s.getCongThucHien() != null)
                        .map(WorkScheduleSession::getCongThucHien)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                if (totalCong.compareTo(BigDecimal.ZERO) != 0) {
                    groupNs = groupSanLuong.divide(totalCong, 4, java.math.RoundingMode.HALF_UP);
                }
            }

            for (WorkScheduleSession s : group) {
                boolean changed = false;
                if (groupNs != null && !groupNs.equals(s.getNangSuat())) {
                    s.setNangSuat(groupNs);
                    changed = true;
                }
                if (nsTb != null && !nsTb.equals(s.getNangSuatTrungBinh())) {
                    s.setNangSuatTrungBinh(nsTb);
                    changed = true;
                }
                if (changed) {
                    repository.save(s);
                    updated++;
                }
            }
        }

        // Tính lại hiệu quả cho tất cả nhân viên
        Set<String> maNvSet = all.stream()
                .map(WorkScheduleSession::getMaNhanVien)
                .filter(m -> m != null && !m.isBlank())
                .collect(Collectors.toSet());
        maNvSet.forEach(this::recalculateEfficiency);

        return updated;
    }

    /**
     * NS Trung Bình = slTrungBinh của sản phẩm trong Danh sách sản phẩm (ProductMaster).
     */
    private BigDecimal computeNsTb(WorkSchedule ws) {
        if (ws.getMaSp() == null) return null;
        return productMasterRepository.findByMaTpIgnoreCase(ws.getMaSp())
                .map(ProductMaster::getSlTrungBinh)
                .orElse(null);
    }

    public List<EmployeeSessionDetailDto> getByMaNhanVien(String maNhanVien) {
        List<WorkScheduleSession> sessions = repository.findByMaNhanVienOrderByNgayDescIdDesc(maNhanVien);
        return buildDetailDtos(sessions);
    }

    public List<EmployeeSessionDetailDto> getByMaNhanVienAndDateRange(String maNhanVien,
                                                                       LocalDate from,
                                                                       LocalDate to) {
        List<WorkScheduleSession> sessions = repository.findByMaNhanVienAndDateRange(maNhanVien, from, to);
        return buildDetailDtos(sessions);
    }

    /**
     * Chuyển danh sách session → DTO, tự động tính:
     * - sanLuong: lấy từ nhóm (workScheduleId + ngày) — session nào trong nhóm đã ghi
     * - nangSuat: sanLuong_nhóm / tổng_công_nhóm (chia đều cho mọi thành viên)
     * - nangSuatTrungBinh: từ ProductMaster theo công đoạn
     */
    private List<EmployeeSessionDetailDto> buildDetailDtos(List<WorkScheduleSession> sessions) {
        if (sessions.isEmpty()) return java.util.Collections.emptyList();

        Set<Long> scheduleIds = sessions.stream()
                .map(WorkScheduleSession::getWorkScheduleId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, WorkSchedule> scheduleMap = workScheduleRepository.findAllById(scheduleIds).stream()
                .collect(Collectors.toMap(WorkSchedule::getId, ws -> ws));

        // Batch-load ProductMaster theo maSp để tính NS Trung Bình (tránh N+1)
        Set<String> maTpSet = scheduleMap.values().stream()
                .map(WorkSchedule::getMaSp).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<String, ProductMaster> pmMap = new java.util.HashMap<>();
        for (String maTp : maTpSet) {
            productMasterRepository.findByMaTpIgnoreCase(maTp)
                    .ifPresent(pm -> pmMap.put(maTp.toUpperCase(), pm));
        }

        // Tải tất cả sessions cùng workScheduleId để tính group sanLuong và totalCong
        List<WorkScheduleSession> siblings = repository.findByWorkScheduleIdIn(scheduleIds);

        // Map: "workScheduleId|ngay" → sanLuong nhóm (session đầu tiên có giá trị)
        Map<String, BigDecimal> groupSlMap = new java.util.HashMap<>();
        // Map: "workScheduleId|ngay" → tổng công nhóm
        Map<String, BigDecimal> groupCongMap = new java.util.HashMap<>();

        siblings.stream()
                .filter(s -> s.getNgay() != null)
                .collect(Collectors.groupingBy(s -> s.getWorkScheduleId() + "|" + s.getNgay()))
                .forEach((key, group) -> {
                    // sanLuong nhóm: session đầu tiên có ghi
                    group.stream()
                            .filter(s -> s.getSanLuong() != null && s.getSanLuong().compareTo(BigDecimal.ZERO) > 0)
                            .map(WorkScheduleSession::getSanLuong)
                            .findFirst()
                            .ifPresent(sl -> groupSlMap.put(key, sl));
                    // tổng công nhóm
                    BigDecimal tc = group.stream()
                            .filter(s -> s.getCongThucHien() != null)
                            .map(WorkScheduleSession::getCongThucHien)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    groupCongMap.put(key, tc);
                });

        return sessions.stream().map(s -> {
            WorkSchedule ws = s.getWorkScheduleId() != null ? scheduleMap.get(s.getWorkScheduleId()) : null;
            String groupKey = s.getWorkScheduleId() + "|" + s.getNgay();

            BigDecimal groupSl = groupSlMap.get(groupKey);
            BigDecimal totalCong = groupCongMap.getOrDefault(groupKey, BigDecimal.ZERO);

            // Năng suất nhóm = sanLuong / tổng công
            BigDecimal groupNs = null;
            if (groupSl != null && totalCong.compareTo(BigDecimal.ZERO) > 0) {
                groupNs = groupSl.divide(totalCong, 4, java.math.RoundingMode.HALF_UP);
            }

            // NS Trung Bình = slTrungBinh của sản phẩm trong Danh sách sản phẩm
            BigDecimal nsTb = null;
            if (ws != null && ws.getMaSp() != null) {
                ProductMaster pm = pmMap.get(ws.getMaSp().toUpperCase());
                if (pm != null) nsTb = pm.getSlTrungBinh();
            }

            EmployeeSessionDetailDto dto = new EmployeeSessionDetailDto();
            dto.setId(s.getId());
            dto.setWorkScheduleId(s.getWorkScheduleId());
            dto.setNgay(s.getNgay() != null ? s.getNgay().toString() : null);
            dto.setNgayThucHien(ws != null && ws.getNgayThucHien() != null ? ws.getNgayThucHien().toString() : null);
            dto.setMaSp(ws != null ? ws.getMaSp() : null);
            dto.setTenTrinh(ws != null ? ws.getTenTrinh() : null);
            dto.setSoLo(ws != null ? ws.getSoLo() : null);
            dto.setVaiTro(s.getVaiTro());
            dto.setThoiGianBatDau(s.getThoiGianBatDau());
            dto.setCaSanXuat(s.getCaSanXuat());
            dto.setPhongThucHien(ws != null ? ws.getPhongThucHien() : null);
            dto.setMaNhanVien(s.getMaNhanVien());
            dto.setNguoiThucHien(s.getNguoiThucHien());
            dto.setNhomThucHien(s.getNhomThucHien());
            dto.setCongThucHien(s.getCongThucHien());
            dto.setSanLuong(groupSl);          // sản lượng nhóm
            dto.setNangSuat(groupNs);          // năng suất nhóm
            dto.setNangSuatTrungBinh(nsTb);   // NS TB từ ProductMaster
            dto.setChuY(s.getGhiChu() != null ? s.getGhiChu() : (ws != null ? ws.getChuY() : null));
            return dto;
        }).collect(Collectors.toList());
    }

    public List<DailyProductionDto> getDailyReport(LocalDate from, LocalDate to, String congDoan) {

        // ── 1. Tất cả session trong khoảng ngày ──────────────────────────
        List<WorkScheduleSession> allSessions = repository.findAllSessionsInRange(from, to);

        // ── 2. Fetch schedules ────────────────────────────────────────────
        Set<Long> scheduleIds = allSessions.stream()
                .map(WorkScheduleSession::getWorkScheduleId).collect(Collectors.toSet());
        Map<Long, WorkSchedule> scheduleMap = workScheduleRepository.findAllById(scheduleIds).stream()
                .collect(Collectors.toMap(WorkSchedule::getId, s -> s));

        // ── 3. Fetch PENDING change requests trong khoảng ngày ───────────
        List<SlChangeRequest> pendingList = slChangeRequestRepository
                .findByStatusOrderByRequestedAtDesc("PENDING");
        // key: workScheduleId + "|" + ngay  (primary match)
        Map<String, SlChangeRequest> pendingMap = new java.util.HashMap<>();
        // key: workScheduleSessionId  (fallback when ngay is null/blank)
        Map<Long, SlChangeRequest> pendingBySessionMap = new java.util.HashMap<>();
        for (SlChangeRequest req : pendingList) {
            // Fallback map — luôn thêm theo sessionId
            if (req.getWorkScheduleSessionId() != null) {
                pendingBySessionMap.put(req.getWorkScheduleSessionId(), req);
            }
            if (req.getNgay() == null || req.getNgay().isBlank()) continue;
            try {
                LocalDate d = LocalDate.parse(req.getNgay());
                if (from != null && d.isBefore(from)) continue;
                if (to   != null && d.isAfter(to))   continue;
            } catch (Exception e) { continue; }
            pendingMap.put(req.getWorkScheduleId() + "|" + req.getNgay(), req);
        }

        // ── 4. Nhóm sessions theo (workScheduleId, ngay) ─────────────────
        Map<String, List<WorkScheduleSession>> grouped = new java.util.LinkedHashMap<>();
        for (WorkScheduleSession s : allSessions) {
            String key = s.getWorkScheduleId() + "|" + (s.getNgay() != null ? s.getNgay() : "");
            grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
        }

        List<DailyProductionDto> result = new ArrayList<>();
        for (Map.Entry<String, List<WorkScheduleSession>> entry : grouped.entrySet()) {
            List<WorkScheduleSession> group = entry.getValue();
            WorkScheduleSession rep = group.get(0);
            WorkSchedule w = scheduleMap.get(rep.getWorkScheduleId());
            if (w == null) continue;
            // Tính congDoan hiệu dụng (PC → PCPL1/PCPL2 theo toNhom)
            String effectiveCd = w.getCongDoan();
            if ("PC".equalsIgnoreCase(effectiveCd) && w.getToNhom() != null) {
                String tn = w.getToNhom().toUpperCase();
                if ("PCPL1".equals(tn) || "PCPL2".equals(tn)) effectiveCd = tn;
            }
            if (congDoan != null && !congDoan.isBlank()) {
                // "PC" filter khớp với tất cả PC (PCPL1, PCPL2, PC thuần)
                if ("PC".equalsIgnoreCase(congDoan)) {
                    if (!"PC".equalsIgnoreCase(w.getCongDoan())) continue;
                } else {
                    if (!congDoan.equalsIgnoreCase(effectiveCd)) continue;
                }
            }

            String ngayStr = rep.getNgay() != null ? rep.getNgay().toString() : null;
            String pendingKey = rep.getWorkScheduleId() + "|" + ngayStr;

            // Tổng công thực hiện
            java.math.BigDecimal tongCong = group.stream()
                    .filter(s -> s.getCongThucHien() != null)
                    .map(WorkScheduleSession::getCongThucHien)
                    .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

            // Session có sanLuong (nếu đã lưu)
            WorkScheduleSession slSession = group.stream()
                    .filter(s -> s.getSanLuong() != null
                            && s.getSanLuong().compareTo(java.math.BigDecimal.ZERO) > 0)
                    .findFirst().orElse(null);

            // Danh sách người thực hiện
            String nguoiList = group.stream()
                    .map(WorkScheduleSession::getNguoiThucHien)
                    .filter(n -> n != null && !n.isBlank())
                    .distinct()
                    .collect(Collectors.joining(", "));

            // Primary: match by workScheduleId + ngay; fallback: match by workScheduleSessionId
            SlChangeRequest pendingReq = pendingMap.get(pendingKey);
            if (pendingReq == null) {
                // Fallback: nếu ngay không match, tìm qua sessionId của bất kỳ session trong nhóm
                for (WorkScheduleSession s : group) {
                    SlChangeRequest bySession = pendingBySessionMap.get(s.getId());
                    if (bySession != null) { pendingReq = bySession; break; }
                }
            }

            DailyProductionDto dto = new DailyProductionDto();
            dto.setWorkScheduleId(w.getId());
            dto.setNgay(ngayStr);
            dto.setCongDoan(effectiveCd);
            dto.setMaSp(w.getMaSp());
            dto.setTenTrinh(w.getTenTrinh());
            dto.setSoLo(w.getSoLo());
            dto.setCoLo(w.getCoLo());
            dto.setToNhom(w.getToNhom());
            dto.setNhomThucHien(rep.getNhomThucHien());
            dto.setCaSanXuat(rep.getCaSanXuat());
            dto.setCongThucHien(tongCong.compareTo(java.math.BigDecimal.ZERO) == 0 ? null : tongCong);
            dto.setSoNguoi(group.size());
            dto.setNguoiThucHienList(nguoiList.isBlank() ? null : nguoiList);

            if (pendingReq != null) {
                // Ưu tiên hiện PENDING nếu có change request
                dto.setStatus("PENDING");
                dto.setRequestId(pendingReq.getId());
                dto.setRequestedBy(pendingReq.getRequestedBy());
                dto.setRequestedAt(pendingReq.getRequestedAt() != null ? pendingReq.getRequestedAt().toString() : null);
                dto.setRequestedValue(pendingReq.getNewValue());
                dto.setSanLuong(slSession != null ? slSession.getSanLuong() : null); // SL cũ
                dto.setSessionId(slSession != null ? slSession.getId() : rep.getId());
            } else if (slSession != null) {
                dto.setStatus("SAVED");
                dto.setSessionId(slSession.getId());
                dto.setSanLuong(slSession.getSanLuong());
            } else {
                dto.setStatus("IN_PROGRESS");
                dto.setSessionId(rep.getId());
                dto.setSanLuong(null);
            }

            result.add(dto);
        }

        // ── 5. Sắp xếp: ngày giảm dần → công đoạn (BBC1/PCPL1/PCPL2/PL/ĐG) → PENDING lên đầu ──
        java.util.Map<String, Integer> cdOrder = java.util.Map.of(
                "BBC1", 0, "PCPL1", 1, "PCPL2", 2, "PL", 3, "DG", 4);
        result.sort(Comparator
                .comparing((DailyProductionDto d) -> d.getNgay() != null ? d.getNgay() : "")
                .reversed()
                .thenComparingInt(d -> cdOrder.getOrDefault(d.getCongDoan(), 99))
                .thenComparingInt(d -> switch (d.getStatus() != null ? d.getStatus() : "") {
                    case "PENDING" -> 0;
                    case "SAVED"   -> 1;
                    default        -> 2;
                }));

        return result;
    }

    private LocalDate parseDate(String s) {
        return (s != null && !s.isBlank()) ? LocalDate.parse(s) : null;
    }

    private void mapFromDto(WorkScheduleSession s, WorkScheduleSessionDto dto) {
        s.setWorkScheduleId(dto.getWorkScheduleId());
        s.setNgay(parseDate(dto.getNgay()));
        s.setThoiGianBatDau(dto.getThoiGianBatDau());
        s.setThoiGianKetThuc(dto.getThoiGianKetThuc());
        // Auto-derive nhomThucHien từ WorkSchedule.congDoan nếu DTO không gửi lên
        // Mapping: BBC1 → "BBC1" | DG → "ĐG" | PL → "PL"
        // (PC không thể phân biệt PCPL1/2/3 → giữ nguyên giá trị DTO)
        String nhomTH = dto.getNhomThucHien();
        if ((nhomTH == null || nhomTH.isBlank()) && dto.getWorkScheduleId() != null) {
            nhomTH = workScheduleRepository.findById(dto.getWorkScheduleId())
                    .map(ws -> {
                        if (ws.getCongDoan() == null) return null;
                        return switch (ws.getCongDoan()) {
                            case "BBC1" -> "BBC1";
                            case "DG"   -> "ĐG";
                            case "PL"   -> "PL";
                            default     -> null; // PC: không auto-assign
                        };
                    }).orElse(null);
        }
        s.setNhomThucHien(nhomTH);
        s.setMaNhanVien(dto.getMaNhanVien());
        s.setNguoiThucHien(dto.getNguoiThucHien());
        s.setSoGioThucHien(dto.getSoGioThucHien());
        s.setCongThucHien(dto.getCongThucHien());
        s.setNgayThucHien(parseDate(dto.getNgayThucHien()));
        s.setSanLuong(dto.getSanLuong());
        s.setVaiTro(dto.getVaiTro());
        s.setGhiChu(dto.getGhiChu());
        s.setKhac(dto.getKhac());
        s.setCaSanXuat(dto.getCaSanXuat());
        s.setIsTangCa(dto.isIsTangCa());

        // nangSuat sẽ được tính lại theo nhóm sau khi save (recalculateGroupNs)
        s.setNangSuat(dto.getNangSuat());

        // Auto-derive nangSuatTrungBinh from WorkSchedule (sl/cong per stage)
        BigDecimal nsTb = dto.getNangSuatTrungBinh();
        if (dto.getWorkScheduleId() != null) {
            BigDecimal derived = workScheduleRepository.findById(dto.getWorkScheduleId())
                    .map(this::computeNsTb).orElse(null);
            if (derived != null) nsTb = derived;
        }
        s.setNangSuatTrungBinh(nsTb);
    }
}
