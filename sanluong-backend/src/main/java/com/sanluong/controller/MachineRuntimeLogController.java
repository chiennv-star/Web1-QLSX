package com.sanluong.controller;

import com.sanluong.entity.MachineRuntimeLog;
import com.sanluong.entity.WorkSchedule;
import com.sanluong.repository.MachineRuntimeLogRepository;
import com.sanluong.repository.PhongSanXuatRepository;
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
    private final PhongSanXuatRepository phongRepo;

    public MachineRuntimeLogController(MachineRuntimeLogRepository repo,
                                       WorkScheduleRepository wsRepo,
                                       PhongSanXuatRepository phongRepo) {
        this.repo = repo;
        this.wsRepo = wsRepo;
        this.phongRepo = phongRepo;
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
            @RequestBody List<Map<String, Object>> rows) {
        repo.deleteByWorkScheduleIdAndNgay(workScheduleId, ngay);
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
            log.setSortOrder(order++);
            repo.save(log);
        }
        return ResponseEntity.ok(repo.findByWorkScheduleIdAndNgayOrderBySortOrderAscIdAsc(workScheduleId, ngay));
    }

    /** Tổng hợp OEE Availability theo ngày × máy cho một tổ trong khoảng thời gian */
    @GetMapping("/daily-summary")
    public ResponseEntity<List<Map<String, Object>>> dailySummary(
            @RequestParam String congDoanKey,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate tuNgay,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate denNgay) {

        // Map frontend key → (congDoan DB, toNhom list)
        String cd;
        List<String> toNhoms;
        switch (congDoanKey) {
            case "PCPL1": cd = "PC"; toNhoms = List.of("PCPL1"); break;
            case "PCPL2": cd = "PC"; toNhoms = List.of("PCPL2"); break;
            case "PL":    cd = "PC"; toNhoms = List.of("PL", "PCPL3"); break;
            default:      cd = congDoanKey; toNhoms = null; break;
        }

        List<WorkSchedule> wsList = (toNhoms != null)
                ? wsRepo.findByCongDoanAndToNhomIn(cd, toNhoms)
                : wsRepo.findByCongDoan(cd);

        Map<Long, WorkSchedule> wsMap = wsList.stream()
                .collect(Collectors.toMap(WorkSchedule::getId, w -> w, (a, b) -> a));

        if (wsMap.isEmpty()) return ResponseEntity.ok(List.of());

        List<MachineRuntimeLog> logs = repo.findForSummary(new ArrayList<>(wsMap.keySet()), tuNgay, denNgay);

        // phongThucHien (ten) → maMay
        Map<String, String> maMayMap = new HashMap<>();
        phongRepo.findAllSorted().forEach(p -> {
            if (p.getMaMay() != null) maMayMap.put(p.getTen(), p.getMaMay());
        });

        // Group by ngay|phongThucHien (preserve insertion order = sorted by ngay, sortOrder)
        Map<String, List<MachineRuntimeLog>> grouped = new LinkedHashMap<>();
        Map<String, String> groupToNhom = new HashMap<>();

        for (MachineRuntimeLog log : logs) {
            WorkSchedule ws = wsMap.get(log.getWorkScheduleId());
            if (ws == null) continue;
            String phong = (ws.getPhongThucHien() != null && !ws.getPhongThucHien().isBlank())
                    ? ws.getPhongThucHien() : "(Chưa chọn phòng SX)";
            String key = log.getNgay().toString() + "|" + phong;
            grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(log);
            groupToNhom.putIfAbsent(key, ws.getToNhom() != null ? ws.getToNhom() : congDoanKey);
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
            long totalMin = runMin + downMin;
            Double avail = totalMin > 0 ? Math.round(runMin * 1000.0 / totalMin) / 10.0 : null;
            long soLanDung = dayLogs.stream().filter(l -> "Dừng máy".equals(l.getTrangThai())).count();

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("stt", stt++);
            row.put("ngay", ngayStr);
            row.put("tenMay", tenMay);
            row.put("maMay", maMayMap.getOrDefault(tenMay, ""));
            row.put("toNhom", groupToNhom.get(entry.getKey()));
            row.put("gioKH", 16.0);
            row.put("gioChay", gioChay);
            row.put("gioDung", gioDung);
            row.put("availPct", avail);
            row.put("soLanDung", soLanDung);
            row.put("lyDoDung", String.join("; ", seenReasons));
            row.put("workScheduleId", dayLogs.stream().map(MachineRuntimeLog::getWorkScheduleId).findFirst().orElse(null));
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
