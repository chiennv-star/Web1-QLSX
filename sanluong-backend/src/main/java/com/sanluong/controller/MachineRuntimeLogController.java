package com.sanluong.controller;

import com.sanluong.entity.MachineGioKhOverride;
import com.sanluong.entity.MachineRuntimeLog;
import com.sanluong.entity.WorkSchedule;
import com.sanluong.repository.MachineGioKhOverrideRepository;
import com.sanluong.repository.MachineRuntimeLogRepository;
import com.sanluong.repository.PhongThucHienRepository;
import com.sanluong.repository.WorkScheduleRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/machine-runtime")
public class MachineRuntimeLogController {

    private final MachineRuntimeLogRepository repo;
    private final WorkScheduleRepository wsRepo;
    private final PhongThucHienRepository phongThucHienRepo;
    private final MachineGioKhOverrideRepository gioKhRepo;

    public MachineRuntimeLogController(MachineRuntimeLogRepository repo,
                                       WorkScheduleRepository wsRepo,
                                       PhongThucHienRepository phongThucHienRepo,
                                       MachineGioKhOverrideRepository gioKhRepo) {
        this.repo = repo;
        this.wsRepo = wsRepo;
        this.phongThucHienRepo = phongThucHienRepo;
        this.gioKhRepo = gioKhRepo;
    }

    @GetMapping
    public ResponseEntity<List<MachineRuntimeLog>> get(
            @RequestParam Long workScheduleId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ngay) {
        return ResponseEntity.ok(repo.findByWorkScheduleIdAndNgayOrderBySortOrderAscIdAsc(workScheduleId, ngay));
    }

    @PostMapping("/bulk")
    @Transactional
    public ResponseEntity<List<MachineRuntimeLog>> bulk(
            @RequestParam Long workScheduleId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ngay,
            @RequestParam(required = false) String tenMay,
            @RequestBody List<Map<String, Object>> rows) {
        // If tenMay provided, only replace entries for that machine; else replace all for the day
        if (tenMay != null && !tenMay.isBlank()) {
            repo.deleteByWorkScheduleIdAndNgayAndTenMay(workScheduleId, ngay, tenMay);
        } else {
            repo.deleteByWorkScheduleIdAndNgay(workScheduleId, ngay);
        }
        int order = 0;
        for (Map<String, Object> row : rows) {
            MachineRuntimeLog log = new MachineRuntimeLog();
            log.setWorkScheduleId(workScheduleId);
            log.setNgay(ngay);
            log.setTuGio(str(row, "tuGio"));
            log.setDenGio(str(row, "denGio"));
            log.setTrangThai(str(row, "trangThai"));
            log.setLyDo(str(row, "lyDo"));
            log.setGhiChu(str(row, "ghiChu"));
            log.setSanPham(str(row, "sanPham"));
            // Use tenMay from query param (preferred) or from row body
            String rowTenMay = tenMay != null && !tenMay.isBlank() ? tenMay : str(row, "tenMay");
            log.setTenMay(rowTenMay);
            log.setSortOrder(order++);
            repo.save(log);
        }
        return ResponseEntity.ok(repo.findByWorkScheduleIdAndNgayOrderBySortOrderAscIdAsc(workScheduleId, ngay));
    }

    /** Load tất cả logs cho nhiều workScheduleId trong cùng 1 ngày (dùng khi nhiều sản phẩm cùng máy) */
    @GetMapping("/by-wsids")
    public ResponseEntity<List<MachineRuntimeLog>> getByWsIds(
            @RequestParam List<Long> wsIds,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ngay) {
        return ResponseEntity.ok(repo.findByWorkScheduleIdInAndNgayOrderBySortOrderAscIdAsc(wsIds, ngay));
    }

    /** Lưu/cập nhật giờ kế hoạch cho ngày × máy cụ thể */
    @PutMapping("/gio-kh")
    @Transactional
    public ResponseEntity<Map<String, Object>> setGioKh(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ngay,
            @RequestParam String tenMay,
            @RequestParam Double gioKh) {
        if (gioKh == null || gioKh <= 0) gioKh = 16.0;
        MachineGioKhOverride o = gioKhRepo.findByNgayAndTenMay(ngay, tenMay)
                .orElse(new MachineGioKhOverride());
        o.setNgay(ngay);
        o.setTenMay(tenMay);
        o.setGioKh(gioKh);
        gioKhRepo.save(o);
        return ResponseEntity.ok(Map.of("ngay", ngay.toString(), "tenMay", tenMay, "gioKh", gioKh));
    }

    /** Tổng hợp OEE Availability theo ngày × máy cho một tổ trong khoảng thời gian */
    @GetMapping("/daily-summary")
    public ResponseEntity<List<Map<String, Object>>> dailySummary(
            @RequestParam String congDoanKey,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate tuNgay,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate denNgay) {

        // Map frontend key → WorkSchedule list
        // Hỗ trợ cả record cũ (congDoan="PC") lẫn record mới (congDoan="PCPL1"/"PCPL2"/"PL")
        List<WorkSchedule> wsList;
        switch (congDoanKey) {
            case "PCPL1": wsList = wsRepo.findForMachineSummary("PCPL1", List.of("PCPL1")); break;
            case "PCPL2": wsList = wsRepo.findForMachineSummary("PCPL2", List.of("PCPL2")); break;
            case "PL":    wsList = wsRepo.findForMachineSummary("PL",    List.of("PL", "PCPL3")); break;
            default:      wsList = wsRepo.findByCongDoan(congDoanKey); break;
        }

        Map<Long, WorkSchedule> wsMap = wsList.stream()
                .collect(Collectors.toMap(WorkSchedule::getId, w -> w, (a, b) -> a));

        if (wsMap.isEmpty()) return ResponseEntity.ok(List.of());

        List<MachineRuntimeLog> logs = repo.findForSummary(new ArrayList<>(wsMap.keySet()), tuNgay, denNgay);

        // phongThucHien (ten) → maMay
        Map<String, String> maMayMap = new HashMap<>();
        phongThucHienRepo.findAllSorted().forEach(p -> {
            if (p.getMaMay() != null) maMayMap.put(p.getTen(), p.getMaMay());
        });

        // Giờ KH override: "ngay|tenMay" → gioKh
        Map<String, Double> gioKhMap = new HashMap<>();
        gioKhRepo.findByNgayBetween(tuNgay, denNgay).forEach(o ->
                gioKhMap.put(o.getNgay().toString() + "|" + o.getTenMay(), o.getGioKh()));

        // Group by ngay|phongThucHien (preserve insertion order = sorted by ngay, sortOrder)
        Map<String, List<MachineRuntimeLog>> grouped = new LinkedHashMap<>();
        Map<String, String> groupToNhom = new HashMap<>();
        Map<String, java.util.LinkedHashSet<Long>> groupWsIds = new LinkedHashMap<>();

        for (MachineRuntimeLog log : logs) {
            WorkSchedule ws = wsMap.get(log.getWorkScheduleId());
            if (ws == null) continue;
            // Ưu tiên tenMay trên log (multi-machine), fallback về phongThucHien của WorkSchedule
            String phong;
            if (log.getTenMay() != null && !log.getTenMay().isBlank()) {
                phong = log.getTenMay();
            } else {
                phong = (ws.getPhongThucHien() != null && !ws.getPhongThucHien().isBlank())
                        ? ws.getPhongThucHien() : "(Chưa chọn phòng SX)";
            }
            String key = log.getNgay().toString() + "|" + phong;
            grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(log);
            groupToNhom.putIfAbsent(key, ws.getToNhom() != null ? ws.getToNhom() : congDoanKey);
            groupWsIds.computeIfAbsent(key, k -> new java.util.LinkedHashSet<>()).add(log.getWorkScheduleId());
        }

        List<Map<String, Object>> result = new ArrayList<>();
        int stt = 1;
        for (Map.Entry<String, List<MachineRuntimeLog>> entry : grouped.entrySet()) {
            String[] parts = entry.getKey().split("\\|", 2);
            String ngayStr = parts[0];
            String tenMay = parts[1];
            List<MachineRuntimeLog> dayLogs = entry.getValue();

            long runMin = 0, downMin = 0;
            java.util.LinkedHashSet<String> seenReasons = new java.util.LinkedHashSet<>();

            for (MachineRuntimeLog log : dayLogs) {
                if (log.getTuGio() == null || log.getDenGio() == null) continue;
                int startM = toMin(log.getTuGio()), endM = toMin(log.getDenGio());
                if (endM <= startM) continue;
                int dur = endM - startM;
                if ("Chạy máy".equals(log.getTrangThai())) {
                    runMin += dur;
                } else {
                    downMin += dur;
                    String lyDo = (log.getLyDo() != null && !log.getLyDo().isBlank()) ? log.getLyDo() : "Không rõ";
                    seenReasons.add(lyDo);
                }
            }

            double gioChay = Math.round(runMin / 60.0 * 100.0) / 100.0;
            double gioDung = Math.round(downMin / 60.0 * 100.0) / 100.0;
            double gioKH = gioKhMap.getOrDefault(ngayStr + "|" + tenMay, 16.0);
            long plannedMin = Math.round(gioKH * 60);
            Double avail = plannedMin > 0 ? Math.round(runMin * 1000.0 / plannedMin) / 10.0 : 0.0;
            long soLanDung = dayLogs.stream().filter(l -> "Dừng máy".equals(l.getTrangThai())).count();

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("stt", stt++);
            row.put("ngay", ngayStr);
            row.put("tenMay", tenMay);
            row.put("maMay", maMayMap.getOrDefault(tenMay, ""));
            row.put("toNhom", groupToNhom.get(entry.getKey()));
            row.put("gioKH", gioKH);
            row.put("gioChay", gioChay);
            row.put("gioDung", gioDung);
            row.put("availPct", avail);
            row.put("soLanDung", soLanDung);
            row.put("lyDoDung", String.join("; ", seenReasons));
            List<Long> wsIds = new ArrayList<>(groupWsIds.getOrDefault(entry.getKey(), new java.util.LinkedHashSet<>()));
            row.put("workScheduleId", wsIds.isEmpty() ? null : wsIds.get(0));
            row.put("workScheduleIds", wsIds);
            List<Map<String, Object>> wsInfos = new ArrayList<>();
            for (Long wsId : wsIds) {
                WorkSchedule ws = wsMap.get(wsId);
                if (ws != null) {
                    Map<String, Object> info = new LinkedHashMap<>();
                    info.put("id", ws.getId());
                    info.put("maSp", ws.getMaSp());
                    info.put("tenTrinh", ws.getTenTrinh());
                    info.put("soLo", ws.getSoLo());
                    wsInfos.add(info);
                }
            }
            row.put("workScheduleInfos", wsInfos);
            result.add(row);
        }

        return ResponseEntity.ok(result);
    }

    /** Phân tích Pareto nguyên nhân dừng máy — trả về danh sách sắp xếp theo tổng giờ dừng giảm dần */
    @GetMapping("/pareto")
    public ResponseEntity<List<Map<String, Object>>> pareto(
            @RequestParam String congDoanKey,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate tuNgay,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate denNgay) {

        List<WorkSchedule> wsList;
        switch (congDoanKey) {
            case "PCPL1": wsList = wsRepo.findForMachineSummary("PCPL1", List.of("PCPL1")); break;
            case "PCPL2": wsList = wsRepo.findForMachineSummary("PCPL2", List.of("PCPL2")); break;
            case "PL":    wsList = wsRepo.findForMachineSummary("PL",    List.of("PL", "PCPL3")); break;
            default:      wsList = wsRepo.findByCongDoan(congDoanKey); break;
        }
        Map<Long, WorkSchedule> wsMap = wsList.stream()
                .collect(Collectors.toMap(WorkSchedule::getId, w -> w, (a, b) -> a));
        if (wsMap.isEmpty()) return ResponseEntity.ok(List.of());

        Map<String, String> maMayMap = new HashMap<>();
        phongThucHienRepo.findAllSorted().forEach(p -> {
            if (p.getMaMay() != null) maMayMap.put(p.getTen(), p.getMaMay());
        });

        List<MachineRuntimeLog> logs = repo.findForSummary(new ArrayList<>(wsMap.keySet()), tuNgay, denNgay);

        // Aggregate: key = tenMay + § + lyDo, value = [count, totalMinutes]
        Map<String, long[]> groups = new LinkedHashMap<>();
        long totalDownMin = 0;

        for (MachineRuntimeLog log : logs) {
            if (!"Dừng máy".equals(log.getTrangThai())) continue;
            if (log.getTuGio() == null || log.getDenGio() == null) continue;
            int s = toMin(log.getTuGio()), e = toMin(log.getDenGio());
            if (e <= s) continue;
            int dur = e - s;
            totalDownMin += dur;
            WorkSchedule ws = wsMap.get(log.getWorkScheduleId());
            if (ws == null) continue;
            String tenMay = (log.getTenMay() != null && !log.getTenMay().isBlank())
                    ? log.getTenMay()
                    : (ws.getPhongThucHien() != null && !ws.getPhongThucHien().isBlank()
                        ? ws.getPhongThucHien() : "(Chưa chọn)");
            String lyDo = log.getLyDo() != null && !log.getLyDo().isBlank() ? log.getLyDo() : "Không rõ";
            long[] g = groups.computeIfAbsent(tenMay + "§" + lyDo, k -> new long[]{0, 0});
            g[0]++;
            g[1] += dur;
        }

        long days = denNgay.toEpochDay() - tuNgay.toEpochDay() + 1;
        double weeks = Math.max(1.0, days / 7.0);
        final long totalMin = totalDownMin;

        List<Map.Entry<String, long[]>> sorted = new ArrayList<>(groups.entrySet());
        sorted.sort((a, b) -> Long.compare(b.getValue()[1], a.getValue()[1]));

        List<Map<String, Object>> result = new ArrayList<>();
        int stt = 1;
        for (Map.Entry<String, long[]> entry : sorted) {
            String[] parts = entry.getKey().split("§", 2);
            String tenMay = parts[0];
            String lyDo = parts.length > 1 ? parts[1] : "Không rõ";
            long cnt = entry.getValue()[0];
            long min = entry.getValue()[1];
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("stt", stt++);
            row.put("tenMay", tenMay);
            row.put("maMay", maMayMap.getOrDefault(tenMay, ""));
            row.put("lyDo", lyDo);
            row.put("soLanDung", cnt);
            row.put("tongGioDung", Math.round(min / 60.0 * 10) / 10.0);
            row.put("phanTram", totalMin > 0 ? Math.round(min * 1000.0 / totalMin) / 10.0 : 0.0);
            row.put("tanSuat", Math.round(cnt * 10.0 / weeks) / 10.0);
            result.add(row);
        }
        return ResponseEntity.ok(result);
    }

    private int toMin(String t) {
        String[] parts = t.split(":");
        return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
    }

    private String str(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v != null && !v.toString().isBlank() ? v.toString().trim() : null;
    }
}
