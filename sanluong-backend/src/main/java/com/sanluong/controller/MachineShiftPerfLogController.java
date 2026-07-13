package com.sanluong.controller;

import com.sanluong.entity.MachineShiftPerfLog;
import com.sanluong.entity.WorkSchedule;
import com.sanluong.repository.MachineShiftPerfLogRepository;
import com.sanluong.repository.PhongThucHienRepository;
import com.sanluong.repository.WorkScheduleRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/machine-shift-perf")
public class MachineShiftPerfLogController {

    private final MachineShiftPerfLogRepository repo;
    private final WorkScheduleRepository wsRepo;
    private final PhongThucHienRepository phongThucHienRepo;

    public MachineShiftPerfLogController(MachineShiftPerfLogRepository repo,
                                          WorkScheduleRepository wsRepo,
                                          PhongThucHienRepository phongThucHienRepo) {
        this.repo = repo;
        this.wsRepo = wsRepo;
        this.phongThucHienRepo = phongThucHienRepo;
    }

    // -----------------------------------------------------------------------
    // GET /daily-summary?congDoanKey=&tuNgay=&denNgay=
    // Aggregates MachineShiftPerfLog by (ngay, tenMay) for correct P formula:
    // P = Σ(SL_TT × T_chuẩn) / Σ(SL_LT × T_chuẩn) = Σ SL_TT / Σ SL_LT (per ca, weighted)
    // -----------------------------------------------------------------------
    @GetMapping("/daily-summary")
    public ResponseEntity<List<Map<String, Object>>> dailySummary(
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

        // wsId → tenMay (phongThucHien), toNhom
        Map<Long, String> wsToTenMay = new HashMap<>();
        Map<String, String> toNhomMap = new HashMap<>();
        for (WorkSchedule ws : wsList) {
            if (ws.getPhongThucHien() == null || ws.getPhongThucHien().isBlank()) continue;
            wsToTenMay.put(ws.getId(), ws.getPhongThucHien());
            toNhomMap.putIfAbsent(ws.getPhongThucHien(), ws.getToNhom());
        }
        if (wsToTenMay.isEmpty()) return ResponseEntity.ok(List.of());

        // maMay lookup
        Map<String, String> maMayMap = new HashMap<>();
        phongThucHienRepo.findAllSorted().forEach(p -> {
            if (p.getMaMay() != null) maMayMap.put(p.getTen(), p.getMaMay());
        });

        // Load all shift logs in date range, group by (ngay, tenMay)
        List<MachineShiftPerfLog> allLogs = repo.findByNgayBetween(tuNgay, denNgay);

        // key = "ngay|tenMay" → [sumTT, sumLT]
        Map<String, double[]> sums = new LinkedHashMap<>();
        Map<String, LocalDate> keyDate = new LinkedHashMap<>();
        Map<String, String> keyTenMay = new LinkedHashMap<>();

        for (MachineShiftPerfLog log : allLogs) {
            String tenMay = wsToTenMay.get(log.getWorkScheduleId());
            if (tenMay == null) continue;
            if (log.getSlThucTe() == null && log.getSlLyThuyet() == null) continue;
            String key = log.getNgay().toString() + "|" + tenMay;
            sums.computeIfAbsent(key, k -> new double[]{0.0, 0.0});
            if (log.getSlThucTe()  != null) sums.get(key)[0] += log.getSlThucTe();
            if (log.getSlLyThuyet() != null) sums.get(key)[1] += log.getSlLyThuyet();
            keyDate.put(key, log.getNgay());
            keyTenMay.put(key, tenMay);
        }

        // Sort: ngay desc, tenMay asc
        List<String> keys = new ArrayList<>(sums.keySet());
        keys.sort((a, b) -> {
            int c = keyDate.get(b).compareTo(keyDate.get(a));
            return c != 0 ? c : keyTenMay.get(a).compareTo(keyTenMay.get(b));
        });

        List<Map<String, Object>> result = new ArrayList<>();
        int stt = 1;
        for (String key : keys) {
            double slTT = sums.get(key)[0];
            double slLT = sums.get(key)[1];
            Double pPct = slLT > 0 ? Math.round(slTT / slLT * 1000) / 10.0 : null;
            String tenMay = keyTenMay.get(key);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("stt", stt++);
            row.put("ngay", keyDate.get(key).toString());
            row.put("tenMay", tenMay);
            row.put("maMay", maMayMap.getOrDefault(tenMay, ""));
            row.put("toNhom", toNhomMap.getOrDefault(tenMay, ""));
            row.put("slThucTe", Math.round(slTT * 10) / 10.0);
            row.put("slLyThuyet", Math.round(slLT * 10) / 10.0);
            row.put("pPct", pPct);
            result.add(row);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping
    public ResponseEntity<List<MachineShiftPerfLog>> get(
            @RequestParam Long workScheduleId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ngay,
            @RequestParam(required = false) String tenMay) {
        if (tenMay != null && !tenMay.isBlank()) {
            return ResponseEntity.ok(repo.findByWorkScheduleIdAndNgayAndTenMayOrderBySortOrderAscIdAsc(workScheduleId, ngay, tenMay.trim()));
        }
        return ResponseEntity.ok(repo.findByWorkScheduleIdAndNgayOrderBySortOrderAscIdAsc(workScheduleId, ngay));
    }

    @GetMapping("/by-wsids")
    public ResponseEntity<List<MachineShiftPerfLog>> getByWsIds(
            @RequestParam List<Long> wsIds,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ngay) {
        return ResponseEntity.ok(repo.findByWorkScheduleIdInAndNgayOrderBySortOrderAscIdAsc(wsIds, ngay));
    }

    @PostMapping("/bulk")
    @Transactional
    public ResponseEntity<List<MachineShiftPerfLog>> bulk(
            @RequestParam Long workScheduleId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ngay,
            @RequestParam(required = false) String tenMay,
            @RequestBody List<Map<String, Object>> rows) {
        String normalizedMay = (tenMay != null && !tenMay.isBlank()) ? tenMay.trim() : null;
        if (normalizedMay != null) {
            repo.deleteByWorkScheduleIdAndNgayAndTenMay(workScheduleId, ngay, normalizedMay);
        } else {
            repo.deleteByWorkScheduleIdAndNgay(workScheduleId, ngay);
        }
        int order = 0;
        for (Map<String, Object> row : rows) {
            MachineShiftPerfLog log = new MachineShiftPerfLog();
            log.setWorkScheduleId(workScheduleId);
            log.setNgay(ngay);
            log.setTenMay(normalizedMay);
            log.setCaLo(str(row, "caLo"));
            log.setSlLyThuyet(dbl(row, "slLyThuyet"));
            log.setSlThucTe(dbl(row, "slThucTe"));
            log.setNguyenNhan(str(row, "nguyenNhan"));
            log.setGhiChu(str(row, "ghiChu"));
            log.setSortOrder(order++);
            repo.save(log);
        }
        if (normalizedMay != null) {
            return ResponseEntity.ok(repo.findByWorkScheduleIdAndNgayAndTenMayOrderBySortOrderAscIdAsc(workScheduleId, ngay, normalizedMay));
        }
        return ResponseEntity.ok(repo.findByWorkScheduleIdAndNgayOrderBySortOrderAscIdAsc(workScheduleId, ngay));
    }

    private String str(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v != null && !v.toString().isBlank() ? v.toString().trim() : null;
    }

    private Double dbl(Map<String, Object> m, String key) {
        Object v = m.get(key);
        if (v == null) return null;
        try { return Double.parseDouble(v.toString()); } catch (Exception e) { return null; }
    }
}
