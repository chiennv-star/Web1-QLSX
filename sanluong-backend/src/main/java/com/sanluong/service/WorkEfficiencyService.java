package com.sanluong.service;

import com.sanluong.dto.EmployeeEfficiencyReportDto;
import com.sanluong.dto.WorkEfficiencyDto;
import com.sanluong.entity.Employee;
import com.sanluong.entity.WorkEfficiency;
import com.sanluong.entity.WorkSchedule;
import com.sanluong.entity.WorkScheduleSession;
import com.sanluong.repository.EmployeeRepository;
import com.sanluong.repository.ProductMasterRepository;
import com.sanluong.repository.WorkEfficiencyRepository;
import com.sanluong.repository.WorkScheduleRepository;
import com.sanluong.repository.WorkScheduleSessionRepository;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class WorkEfficiencyService {

    private final WorkEfficiencyRepository repository;
    private final EmployeeRepository employeeRepository;
    private final WorkScheduleSessionRepository sessionRepository;
    private final WorkScheduleRepository workScheduleRepository;
    private final ProductMasterRepository productMasterRepository;

    public WorkEfficiencyService(WorkEfficiencyRepository repository,
                                  EmployeeRepository employeeRepository,
                                  WorkScheduleSessionRepository sessionRepository,
                                  WorkScheduleRepository workScheduleRepository,
                                  ProductMasterRepository productMasterRepository) {
        this.repository = repository;
        this.employeeRepository = employeeRepository;
        this.sessionRepository = sessionRepository;
        this.workScheduleRepository = workScheduleRepository;
        this.productMasterRepository = productMasterRepository;
    }

    // Called by EmployeeService after create/update to keep records in sync
    public void syncFromEmployee(Employee emp, String oldMaNhanVien) {
        String searchKey = (oldMaNhanVien != null) ? oldMaNhanVien : emp.getMaNhanVien();
        WorkEfficiency we = repository.findByMaNhanVien(searchKey).orElse(new WorkEfficiency());
        we.setMaNhanVien(emp.getMaNhanVien());
        we.setHoVaTen(emp.getHoVaTen());
        we.setViTri(emp.getViTri());
        we.setToNhom(emp.getToNhom());
        repository.save(we);
    }

    @org.springframework.transaction.annotation.Transactional
    public int syncAll() {
        List<Employee> all = employeeRepository.findAll();
        int created = 0;
        for (Employee emp : all) {
            if (repository.findByMaNhanVien(emp.getMaNhanVien()).isEmpty()) {
                WorkEfficiency we = new WorkEfficiency();
                we.setMaNhanVien(emp.getMaNhanVien());
                we.setHoVaTen(emp.getHoVaTen());
                we.setViTri(emp.getViTri());
                we.setToNhom(emp.getToNhom());
                repository.save(we);
                created++;
            }
        }
        return created;
    }

    @org.springframework.transaction.annotation.Transactional
    public int syncToNhom() {
        List<Employee> all = employeeRepository.findAll();
        int updated = 0;
        for (Employee emp : all) {
            repository.findByMaNhanVien(emp.getMaNhanVien()).ifPresent(we -> {
                we.setToNhom(emp.getToNhom());
                repository.save(we);
            });
            updated++;
        }
        return updated;
    }

    public Page<WorkEfficiency> search(String search, int page, int size) {
        List<WorkEfficiency> all = repository.searchAll(isEmpty(search) ? null : search);
        int start = page * size;
        int end = Math.min(start + size, all.size());
        List<WorkEfficiency> content = start < all.size() ? all.subList(start, end) : List.of();
        return new PageImpl<>(content, PageRequest.of(page, size), all.size());
    }

    public WorkEfficiency update(Long id, WorkEfficiencyDto dto) {
        WorkEfficiency we = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ID: " + id));
        we.setSoGioTruongCa(dto.getSoGioTruongCa());
        we.setSoGioPhuMay(dto.getSoGioPhuMay());
        we.setSoLanDat(dto.getSoLanDat());
        we.setSoLanKhongDat(dto.getSoLanKhongDat());
        if (dto.getToNhom() != null) we.setToNhom(dto.getToNhom());
        if (dto.getViTri()  != null) we.setViTri(dto.getViTri());
        return repository.save(we);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    /**
     * Tổng hợp hiệu quả công việc. Tính động nangSuat và nangSuatTrungBinh
     * thay vì đọc từ stored values (có thể null với dữ liệu cũ).
     */
    public List<EmployeeEfficiencyReportDto> getReport(LocalDate from, LocalDate to, String toNhom) {
        // 1. Tải TẤT CẢ sessions trong kỳ (kể cả không có maNhanVien) để build group maps
        List<WorkScheduleSession> allSessions = sessionRepository.findAllSessionsInRange(from, to);

        // 2. Batch-load WorkSchedule và ProductMaster
        Set<Long> allScheduleIds = allSessions.stream()
                .map(WorkScheduleSession::getWorkScheduleId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, WorkSchedule> scheduleMap = workScheduleRepository.findAllById(allScheduleIds).stream()
                .collect(Collectors.toMap(WorkSchedule::getId, ws -> ws));

        // Load thêm tất cả sessions theo workScheduleId để tránh bỏ sót session ghi sanLuong nằm ngoài kỳ
        List<com.sanluong.entity.WorkScheduleSession> siblingAll =
                allScheduleIds.isEmpty() ? List.of()
                : sessionRepository.findByWorkScheduleIdIn(allScheduleIds);

        Set<String> maTpSet = scheduleMap.values().stream()
                .map(WorkSchedule::getMaSp).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<String, BigDecimal> slTbMap = new HashMap<>();
        for (String maTp : maTpSet) {
            productMasterRepository.findByMaTpIgnoreCase(maTp)
                    .ifPresent(pm -> { if (pm.getSlTrungBinh() != null)
                        slTbMap.put(maTp.toUpperCase(), pm.getSlTrungBinh()); });
        }

        // 3. Build group maps từ sibling sessions (đầy đủ hơn allSessions)
        //    key = "workScheduleId|ngay" → NS nhóm, sanLuong nhóm
        Map<String, BigDecimal> groupNsMap = new HashMap<>();
        Map<String, BigDecimal> groupSlMap = new HashMap<>();
        siblingAll.stream()
                .filter(s -> s.getWorkScheduleId() != null && s.getNgay() != null)
                .collect(Collectors.groupingBy(s -> s.getWorkScheduleId() + "|" + s.getNgay()))
                .forEach((key, group) -> {
                    // Ưu tiên sanLuong thực tế ghi trong session
                    BigDecimal sl = group.stream()
                            .filter(s -> s.getSanLuong() != null && s.getSanLuong().compareTo(BigDecimal.ZERO) > 0)
                            .map(com.sanluong.entity.WorkScheduleSession::getSanLuong).findFirst().orElse(null);

                    // Fallback: nếu session không ghi sanLuong → lấy từ WorkSchedule theo congDoan
                    // BBC1 → slBbc1/congBbc1 | DG(ĐG) → slDg/congDg | PL → slPl/congPl
                    BigDecimal plannedCong = null;
                    if (sl == null && !group.isEmpty()) {
                        WorkSchedule wsF = scheduleMap.get(group.get(0).getWorkScheduleId());
                        if (wsF != null && wsF.getCongDoan() != null) {
                            switch (wsF.getCongDoan()) {
                                case "BBC1":
                                    if (wsF.getSlBbc1() != null && wsF.getSlBbc1().compareTo(BigDecimal.ZERO) > 0) {
                                        sl = wsF.getSlBbc1(); plannedCong = wsF.getCongBbc1();
                                    }
                                    break;
                                case "DG":
                                    if (wsF.getSlDg() != null && wsF.getSlDg().compareTo(BigDecimal.ZERO) > 0) {
                                        sl = wsF.getSlDg(); plannedCong = wsF.getCongDg();
                                    }
                                    break;
                                case "PL":
                                    if (wsF.getSlPl() != null && wsF.getSlPl().compareTo(BigDecimal.ZERO) > 0) {
                                        sl = wsF.getSlPl(); plannedCong = wsF.getCongPl();
                                    }
                                    break;
                                default: break;
                            }
                        }
                    }

                    if (sl != null) {
                        groupSlMap.put(key, sl);
                        // Tổng công thực tế từ sessions; nếu = 0 và có plannedCong → dùng planned
                        BigDecimal tc = group.stream()
                                .filter(s -> s.getCongThucHien() != null)
                                .map(com.sanluong.entity.WorkScheduleSession::getCongThucHien)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                        if (tc.compareTo(BigDecimal.ZERO) == 0 && plannedCong != null
                                && plannedCong.compareTo(BigDecimal.ZERO) > 0) {
                            tc = plannedCong;
                        }
                        if (tc.compareTo(BigDecimal.ZERO) > 0) {
                            groupNsMap.put(key, sl.divide(tc, 4, RoundingMode.HALF_UP));
                        }
                    }
                });

        // Helper: NS thực tế (group NS → fallback stored)
        java.util.function.Function<WorkScheduleSession, BigDecimal> effNs = s -> {
            if (s.getWorkScheduleId() != null && s.getNgay() != null) {
                BigDecimal gns = groupNsMap.get(s.getWorkScheduleId() + "|" + s.getNgay());
                if (gns != null) return gns;
            }
            return s.getNangSuat(); // fallback stored value
        };

        // Helper: NS Trung Bình (ProductMaster.slTrungBinh → fallback stored)
        java.util.function.Function<WorkScheduleSession, BigDecimal> effNsTb = s -> {
            WorkSchedule ws = s.getWorkScheduleId() != null ? scheduleMap.get(s.getWorkScheduleId()) : null;
            if (ws != null && ws.getMaSp() != null) {
                BigDecimal tb = slTbMap.get(ws.getMaSp().toUpperCase());
                if (tb != null) return tb;
            }
            return s.getNangSuatTrungBinh(); // fallback stored value
        };

        // 4. WorkEfficiency map — build TRƯỚC filter để dùng làm fallback cho toNhom
        Map<String, WorkEfficiency> weMap = repository.findAll().stream()
                .collect(Collectors.toMap(WorkEfficiency::getMaNhanVien, w -> w, (a, b) -> a));

        // 5. Lọc sessions có maNhanVien
        List<WorkScheduleSession> sessions = allSessions.stream()
                .filter(s -> s.getMaNhanVien() != null && !s.getMaNhanVien().isBlank())
                .collect(Collectors.toList());

        // Filter nhóm — 3 lớp ưu tiên:
        // L1: session.nhomThucHien khớp (+ chuẩn hoá ĐG↔DG)
        // L2: WorkEfficiency.toNhom của nhân viên khớp (+ chuẩn hoá ĐG↔DG)
        // L3: WorkSchedule.congDoan → BBC1:"BBC1", ĐG:"DG"  (không dùng cho PCPL1/2/3)
        if (!isEmpty(toNhom)) {
            final boolean filterIsDG = "ĐG".equals(toNhom) || "DG".equals(toNhom);
            sessions = sessions.stream().filter(s -> {
                // L1
                String sNhom = s.getNhomThucHien();
                if (sNhom != null) {
                    if (toNhom.equals(sNhom)) return true;
                    if (filterIsDG && ("ĐG".equals(sNhom) || "DG".equals(sNhom))) return true;
                }
                // L2
                WorkEfficiency we2 = weMap.get(s.getMaNhanVien());
                if (we2 != null && we2.getToNhom() != null) {
                    if (toNhom.equals(we2.getToNhom())) return true;
                    if (filterIsDG && ("ĐG".equals(we2.getToNhom()) || "DG".equals(we2.getToNhom()))) return true;
                }
                // L3: congDoan-based (chỉ BBC1 và ĐG/DG — không thể phân biệt PCPL1/2/3)
                if (s.getWorkScheduleId() != null) {
                    WorkSchedule ws3 = scheduleMap.get(s.getWorkScheduleId());
                    if (ws3 != null && ws3.getCongDoan() != null) {
                        String cd = ws3.getCongDoan();
                        if ("BBC1".equals(toNhom) && "BBC1".equals(cd)) return true;
                        if (filterIsDG && "DG".equals(cd)) return true;
                    }
                }
                return false;
            }).collect(Collectors.toList());
        }

        // 6. Group by maNhanVien
        Map<String, List<WorkScheduleSession>> grouped = sessions.stream()
                .collect(Collectors.groupingBy(WorkScheduleSession::getMaNhanVien,
                        LinkedHashMap::new, Collectors.toList()));

        // 7. Tổng hợp từng nhân viên
        List<EmployeeEfficiencyReportDto> result = new ArrayList<>();
        for (Map.Entry<String, List<WorkScheduleSession>> entry : grouped.entrySet()) {
            String maNv = entry.getKey();
            List<WorkScheduleSession> empSessions = entry.getValue();
            WorkEfficiency we = weMap.get(maNv);

            String hoVaTen = (we != null && we.getHoVaTen() != null) ? we.getHoVaTen()
                    : empSessions.stream().map(WorkScheduleSession::getNguoiThucHien)
                        .filter(n -> n != null && !n.isBlank()).findFirst().orElse(maNv);
            String toNhomVal = empSessions.stream().filter(s -> s.getNhomThucHien() != null)
                    .map(WorkScheduleSession::getNhomThucHien).findFirst()
                    .orElse(we != null ? we.getToNhom() : null);
            String viTri = we != null ? we.getViTri() : null;

            long soCa = empSessions.size();
            long soCaTruong = empSessions.stream()
                    .filter(s -> s.getVaiTro() != null && s.getVaiTro().toLowerCase().contains("trưởng")).count();

            BigDecimal tongCong = empSessions.stream().filter(s -> s.getCongThucHien() != null)
                    .map(WorkScheduleSession::getCongThucHien).reduce(BigDecimal.ZERO, BigDecimal::add);

            // tongSl: lấy sanLuong nhóm cho mỗi nhóm nhân viên này tham gia (distinct key)
            BigDecimal tongSl = empSessions.stream()
                    .filter(s -> s.getWorkScheduleId() != null && s.getNgay() != null)
                    .map(s -> s.getWorkScheduleId() + "|" + s.getNgay())
                    .distinct()
                    .map(groupSlMap::get)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // NS TB: benchmark từ ProductMaster.slTrungBinh (nhất quán với cột drawer)
            List<BigDecimal> nsTbList = empSessions.stream()
                    .map(effNsTb).filter(Objects::nonNull).collect(Collectors.toList());
            BigDecimal nsTB = nsTbList.isEmpty() ? null
                    : nsTbList.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                        .divide(BigDecimal.valueOf(nsTbList.size()), 2, RoundingMode.HALF_UP);

            // soLanDat / soLanKhongDat: so sánh NS nhóm với slTrungBinh của sản phẩm
            long soLanDat = empSessions.stream().filter(s -> {
                BigDecimal ns = effNs.apply(s);
                BigDecimal nsTb = effNsTb.apply(s);
                return ns != null && nsTb != null && ns.compareTo(nsTb) >= 0;
            }).count();
            long soLanKhongDat = empSessions.stream().filter(s -> {
                BigDecimal ns = effNs.apply(s);
                BigDecimal nsTb = effNsTb.apply(s);
                return ns != null && nsTb != null && ns.compareTo(nsTb) < 0;
            }).count();

            EmployeeEfficiencyReportDto dto = new EmployeeEfficiencyReportDto();
            dto.setWeId(we != null ? we.getId() : null);
            dto.setMaNhanVien(maNv);
            dto.setHoVaTen(hoVaTen);
            dto.setToNhom(toNhomVal);
            dto.setViTri(viTri);
            dto.setSoCa(soCa);
            dto.setSoCaTruong(soCaTruong);
            dto.setTongCong(tongCong.compareTo(BigDecimal.ZERO) == 0 ? null : tongCong);
            dto.setTongSanLuong(tongSl.compareTo(BigDecimal.ZERO) == 0 ? null : tongSl);
            dto.setNangSuatTB(nsTB);
            dto.setSoLanDat(soLanDat);
            dto.setSoLanKhongDat(soLanKhongDat);
            result.add(dto);
        }

        // 8. Sắp xếp: tổng công giảm dần
        result.sort((a, b) -> {
            BigDecimal ca = a.getTongCong() != null ? a.getTongCong() : BigDecimal.ZERO;
            BigDecimal cb = b.getTongCong() != null ? b.getTongCong() : BigDecimal.ZERO;
            return cb.compareTo(ca);
        });

        return result;
    }

    private boolean isEmpty(String s) { return s == null || s.isBlank(); }
}
