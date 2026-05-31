package com.sanluong.service;

import com.sanluong.entity.Employee;
import com.sanluong.entity.WorkScheduleSession;
import com.sanluong.repository.EmployeeRepository;
import com.sanluong.repository.WorkScheduleSessionRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AttendanceService {

    private final WorkScheduleSessionRepository sessionRepo;
    private final EmployeeRepository employeeRepo;

    public AttendanceService(WorkScheduleSessionRepository sessionRepo,
                             EmployeeRepository employeeRepo) {
        this.sessionRepo = sessionRepo;
        this.employeeRepo = employeeRepo;
    }

    // ── DTO nội bộ ──────────────────────────────────────────────────

    public static class DayCong {
        public BigDecimal congThuong = BigDecimal.ZERO;
        public BigDecimal congTangCa = BigDecimal.ZERO;
        public int soPhien = 0;
    }

    public static class EmployeeRow {
        public String maNhanVien;
        public String hoVaTen;
        public String toNhom;
        public String viTri;
        public Map<String, DayCong> ngayData = new LinkedHashMap<>();
        public BigDecimal tongCongThuong = BigDecimal.ZERO;
        public BigDecimal tongCongTangCa = BigDecimal.ZERO;
        public BigDecimal tongCong       = BigDecimal.ZERO;
        public int soCaLamViec = 0;
    }

    public static class DeptRow {
        public String boPhan;
        public Map<String, DayCong> ngayData = new LinkedHashMap<>();
        public BigDecimal tongCongThuong = BigDecimal.ZERO;
        public BigDecimal tongCongTangCa = BigDecimal.ZERO;
        public BigDecimal tongCong       = BigDecimal.ZERO;
        public int soNguoi = 0;
    }

    // ── Timesheet nhân viên ──────────────────────────────────────────

    public List<EmployeeRow> getTimesheet(LocalDate from, LocalDate to, String toNhom) {

        List<WorkScheduleSession> sessions = sessionRepo.findAllSessionsInRange(from, to);

        // Build employee lookup
        Map<String, Employee> empMap = employeeRepo.findAll().stream()
                .collect(Collectors.toMap(Employee::getMaNhanVien, e -> e, (a, b) -> a));

        // Group by maNhanVien
        Map<String, EmployeeRow> rowMap = new LinkedHashMap<>();

        for (WorkScheduleSession s : sessions) {
            String ma = s.getMaNhanVien();
            if (ma == null || ma.isBlank()) continue;

            Employee emp = empMap.get(ma);
            String nhom = emp != null ? emp.getToNhom() : (s.getNhomThucHien() != null ? s.getNhomThucHien() : "—");

            // Filter by toNhom if specified
            if (toNhom != null && !toNhom.isBlank() && !toNhom.equalsIgnoreCase(nhom)) continue;

            EmployeeRow row = rowMap.computeIfAbsent(ma, k -> {
                EmployeeRow r = new EmployeeRow();
                r.maNhanVien = ma;
                r.hoVaTen = emp != null ? emp.getHoVaTen() : s.getNguoiThucHien();
                r.toNhom  = nhom;
                r.viTri   = emp != null ? emp.getViTri() : null;
                return r;
            });

            String dateKey = s.getNgay() != null ? s.getNgay().toString() : "";
            if (dateKey.isBlank()) continue;

            DayCong dc = row.ngayData.computeIfAbsent(dateKey, k -> new DayCong());
            BigDecimal cong = s.getCongThucHien() != null ? s.getCongThucHien() : BigDecimal.ZERO;

            if (s.isIsTangCa()) {
                dc.congTangCa = dc.congTangCa.add(cong);
                row.tongCongTangCa = row.tongCongTangCa.add(cong);
            } else {
                dc.congThuong = dc.congThuong.add(cong);
                row.tongCongThuong = row.tongCongThuong.add(cong);
            }
            dc.soPhien++;
            row.soCaLamViec++;
        }

        // Compute tongCong
        for (EmployeeRow row : rowMap.values()) {
            row.tongCong = row.tongCongThuong.add(row.tongCongTangCa);
        }

        return rowMap.values().stream()
                .sorted(Comparator.comparing((EmployeeRow r) -> r.toNhom)
                        .thenComparing(r -> r.maNhanVien))
                .collect(Collectors.toList());
    }

    // ── Tổng hợp bộ phận ─────────────────────────────────────────────

    public List<DeptRow> getDeptSummary(LocalDate from, LocalDate to) {

        List<WorkScheduleSession> sessions = sessionRepo.findAllSessionsInRange(from, to);

        Map<String, Employee> empMap = employeeRepo.findAll().stream()
                .collect(Collectors.toMap(Employee::getMaNhanVien, e -> e, (a, b) -> a));

        // nhomThucHien → DeptRow
        Map<String, DeptRow> rowMap = new LinkedHashMap<>();

        // Track unique employees per dept+day for soNguoi
        Map<String, Set<String>> deptDayEmp = new HashMap<>();

        for (WorkScheduleSession s : sessions) {
            String ma = s.getMaNhanVien();
            Employee emp = ma != null ? empMap.get(ma) : null;
            // Determine boPhan: from session nhomThucHien OR employee toNhom
            String bp = s.getNhomThucHien();
            if (bp == null || bp.isBlank()) bp = (emp != null ? emp.getToNhom() : null);
            if (bp == null || bp.isBlank()) continue;

            DeptRow row = rowMap.computeIfAbsent(bp, k -> {
                DeptRow r = new DeptRow();
                r.boPhan = k;
                return r;
            });

            String dateKey = s.getNgay() != null ? s.getNgay().toString() : "";
            if (dateKey.isBlank()) continue;

            DayCong dc = row.ngayData.computeIfAbsent(dateKey, k -> new DayCong());
            BigDecimal cong = s.getCongThucHien() != null ? s.getCongThucHien() : BigDecimal.ZERO;

            if (s.isIsTangCa()) {
                dc.congTangCa = dc.congTangCa.add(cong);
                row.tongCongTangCa = row.tongCongTangCa.add(cong);
            } else {
                dc.congThuong = dc.congThuong.add(cong);
                row.tongCongThuong = row.tongCongThuong.add(cong);
            }
            dc.soPhien++;

            // count unique employees
            if (ma != null) {
                deptDayEmp.computeIfAbsent(bp + "|" + dateKey, k -> new HashSet<>()).add(ma);
            }
        }

        for (DeptRow row : rowMap.values()) {
            row.tongCong = row.tongCongThuong.add(row.tongCongTangCa);
            // soNguoi = max unique employees on any single day for this dept
            row.soNguoi = deptDayEmp.entrySet().stream()
                    .filter(e -> e.getKey().startsWith(row.boPhan + "|"))
                    .mapToInt(e -> e.getValue().size())
                    .max().orElse(0);
        }

        return rowMap.values().stream()
                .sorted(Comparator.comparing(r -> r.boPhan))
                .collect(Collectors.toList());
    }
}
