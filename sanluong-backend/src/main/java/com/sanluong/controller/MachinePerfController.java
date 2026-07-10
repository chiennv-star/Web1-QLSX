package com.sanluong.controller;

import com.sanluong.entity.MachinePerfLog;
import com.sanluong.entity.MachineSpeedConfig;
import com.sanluong.entity.WorkSchedule;
import com.sanluong.repository.MachinePerfLogRepository;
import com.sanluong.repository.MachineSpeedConfigRepository;
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
@RequestMapping("/api/machine-perf")
public class MachinePerfController {

    private final MachinePerfLogRepository perfRepo;
    private final MachineSpeedConfigRepository speedRepo;
    private final WorkScheduleRepository wsRepo;
    private final PhongThucHienRepository phongThucHienRepo;

    public MachinePerfController(MachinePerfLogRepository perfRepo,
                                 MachineSpeedConfigRepository speedRepo,
                                 WorkScheduleRepository wsRepo,
                                 PhongThucHienRepository phongThucHienRepo) {
        this.perfRepo = perfRepo;
        this.speedRepo = speedRepo;
        this.wsRepo = wsRepo;
        this.phongThucHienRepo = phongThucHienRepo;
    }

    // -----------------------------------------------------------------------
    // GET /daily-summary?congDoanKey=&tuNgay=&denNgay=
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

        // Collect unique tenMay values; build toNhom lookup (first non-null per tenMay)
        Set<String> tenMaySet = new LinkedHashSet<>();
        Map<String, String> toNhomMap = new HashMap<>();
        for (WorkSchedule ws : wsList) {
            String tenMay = ws.getPhongThucHien();
            if (tenMay == null || tenMay.isBlank()) continue;
            tenMaySet.add(tenMay);
            if (!toNhomMap.containsKey(tenMay) && ws.getToNhom() != null) {
                toNhomMap.put(tenMay, ws.getToNhom());
            }
        }

        if (tenMaySet.isEmpty()) return ResponseEntity.ok(List.of());

        // Load perf logs for the date range, filter to known machines
        List<MachinePerfLog> allLogs = perfRepo.findByNgayBetween(tuNgay, denNgay);
        List<MachinePerfLog> logs = allLogs.stream()
                .filter(l -> tenMaySet.contains(l.getTenMay()))
                .collect(Collectors.toList());

        // Speed configs: tenMay → config
        Map<String, MachineSpeedConfig> speedMap = new HashMap<>();
        speedRepo.findAll().forEach(cfg -> speedMap.put(cfg.getTenMay(), cfg));

        // maMay lookup: ten → maMay
        Map<String, String> maMayMap = new HashMap<>();
        phongThucHienRepo.findAllSorted().forEach(p -> {
            if (p.getMaMay() != null) maMayMap.put(p.getTen(), p.getMaMay());
        });

        // Build tenMay → List<WorkSchedule> (no date restriction — filter per-row below)
        Map<String, List<WorkSchedule>> tenMayWsMap = new HashMap<>();
        for (WorkSchedule ws : wsList) {
            if (ws.getPhongThucHien() == null || ws.getPhongThucHien().isBlank()) continue;
            tenMayWsMap.computeIfAbsent(ws.getPhongThucHien(), k -> new ArrayList<>()).add(ws);
        }

        // Sort logs: ngay desc, then tenMay asc
        logs.sort((a, b) -> {
            int c = b.getNgay().compareTo(a.getNgay());
            return c != 0 ? c : a.getTenMay().compareTo(b.getTenMay());
        });

        List<Map<String, Object>> result = new ArrayList<>();
        int stt = 1;
        for (MachinePerfLog log : logs) {
            MachineSpeedConfig cfg = speedMap.get(log.getTenMay());

            Double slLyThuyet = log.getSlLyThuyet() != null
                    ? log.getSlLyThuyet()
                    : (cfg != null ? cfg.getSlLyThuyet() : null);

            Double pPct = null;
            if (slLyThuyet != null && slLyThuyet > 0 && log.getSlThucTe() != null) {
                pPct = Math.round(log.getSlThucTe() / slLyThuyet * 1000) / 10.0;
            }

            Double tonThat = null;
            if (slLyThuyet != null && log.getSlThucTe() != null) {
                tonThat = Math.round((slLyThuyet - log.getSlThucTe()) * 10) / 10.0;
            }

            // Find WorkSchedules for this machine active within 30 days before the log date
            LocalDate logDate = log.getNgay();
            List<WorkSchedule> relatedWs = tenMayWsMap
                    .getOrDefault(log.getTenMay(), Collections.emptyList()).stream()
                    .filter(ws -> ws.getNgayThucHien() != null
                            && !ws.getNgayThucHien().isAfter(logDate)
                            && !ws.getNgayThucHien().isBefore(logDate.minusDays(30)))
                    .sorted(Comparator.comparing(WorkSchedule::getNgayThucHien).reversed())
                    .collect(Collectors.toList());
            List<Long> wsIds = relatedWs.stream().map(WorkSchedule::getId).collect(Collectors.toList());
            List<Map<String, Object>> wsInfos = new ArrayList<>();
            for (WorkSchedule ws : relatedWs) {
                Map<String, Object> info = new LinkedHashMap<>();
                info.put("id", ws.getId());
                info.put("maSp", ws.getMaSp());
                info.put("tenTrinh", ws.getTenTrinh());
                info.put("soLo", ws.getSoLo());
                info.put("ngayThucHien", ws.getNgayThucHien() != null ? ws.getNgayThucHien().toString() : null);
                info.put("coLo", ws.getCoLo());
                wsInfos.add(info);
            }

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("stt", stt++);
            row.put("ngay", log.getNgay().toString());
            row.put("tenMay", log.getTenMay());
            row.put("maMay", maMayMap.getOrDefault(log.getTenMay(), ""));
            row.put("toNhom", toNhomMap.getOrDefault(log.getTenMay(), ""));
            row.put("tocDoChuanLabel", cfg != null && cfg.getTocDoChuanLabel() != null ? cfg.getTocDoChuanLabel() : "");
            row.put("slLyThuyet", slLyThuyet);
            row.put("slThucTe", log.getSlThucTe());
            row.put("pPct", pPct);
            row.put("tonThat", tonThat);
            row.put("nguyenNhanGiamToc", log.getNguyenNhanGiamToc());
            row.put("ghiChu", log.getGhiChu());
            row.put("workScheduleId", wsIds.isEmpty() ? null : wsIds.get(0));
            row.put("workScheduleIds", wsIds);
            row.put("workScheduleInfos", wsInfos);
            result.add(row);
        }

        return ResponseEntity.ok(result);
    }

    // -----------------------------------------------------------------------
    // PUT /log?ngay=&tenMay=&slThucTe=&slLyThuyet=&nguyenNhanGiamToc=&ghiChu=
    // -----------------------------------------------------------------------
    @PutMapping("/log")
    @Transactional
    public ResponseEntity<Map<String, Object>> putLog(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ngay,
            @RequestParam String tenMay,
            @RequestParam(required = false) Double slThucTe,
            @RequestParam(required = false) Double slLyThuyet,
            @RequestParam(required = false) String nguyenNhanGiamToc,
            @RequestParam(required = false) String ghiChu) {

        MachinePerfLog log = perfRepo.findByNgayAndTenMay(ngay, tenMay)
                .orElse(new MachinePerfLog());
        log.setNgay(ngay);
        log.setTenMay(tenMay);
        // Partial update: only overwrite fields that were explicitly provided
        if (slThucTe != null) log.setSlThucTe(slThucTe);
        if (slLyThuyet != null) log.setSlLyThuyet(slLyThuyet);
        if (nguyenNhanGiamToc != null) log.setNguyenNhanGiamToc(nguyenNhanGiamToc.isBlank() ? null : nguyenNhanGiamToc.trim());
        if (ghiChu != null) log.setGhiChu(ghiChu.isBlank() ? null : ghiChu.trim());
        log = perfRepo.save(log);

        // Resolve effective slLyThuyet (log override → speedConfig)
        Double effectiveLyThuyet = log.getSlLyThuyet();
        if (effectiveLyThuyet == null) {
            MachineSpeedConfig cfg = speedRepo.findByTenMay(tenMay).orElse(null);
            if (cfg != null) effectiveLyThuyet = cfg.getSlLyThuyet();
        }

        Double pPct = null;
        if (effectiveLyThuyet != null && effectiveLyThuyet > 0 && log.getSlThucTe() != null) {
            pPct = Math.round(log.getSlThucTe() / effectiveLyThuyet * 1000) / 10.0;
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", log.getId());
        resp.put("ngay", log.getNgay().toString());
        resp.put("tenMay", log.getTenMay());
        resp.put("slThucTe", log.getSlThucTe());
        resp.put("slLyThuyet", log.getSlLyThuyet());
        resp.put("pPct", pPct);
        resp.put("nguyenNhanGiamToc", log.getNguyenNhanGiamToc());
        resp.put("ghiChu", log.getGhiChu());
        return ResponseEntity.ok(resp);
    }

    // -----------------------------------------------------------------------
    // DELETE /log?ngay=&tenMay=
    // -----------------------------------------------------------------------
    @DeleteMapping("/log")
    @Transactional
    public ResponseEntity<Map<String, Object>> deleteLog(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ngay,
            @RequestParam String tenMay) {
        perfRepo.deleteByNgayAndTenMay(ngay, tenMay);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // -----------------------------------------------------------------------
    // PUT /speed-config?tenMay=&tocDoChuanLabel=&slLyThuyet=
    // -----------------------------------------------------------------------
    @PutMapping("/speed-config")
    @Transactional
    public ResponseEntity<Map<String, Object>> putSpeedConfig(
            @RequestParam String tenMay,
            @RequestParam(required = false) String tocDoChuanLabel,
            @RequestParam(required = false) Double slLyThuyet) {

        MachineSpeedConfig cfg = speedRepo.findByTenMay(tenMay)
                .orElse(new MachineSpeedConfig());
        cfg.setTenMay(tenMay);
        cfg.setTocDoChuanLabel(tocDoChuanLabel != null && !tocDoChuanLabel.isBlank() ? tocDoChuanLabel.trim() : null);
        cfg.setSlLyThuyet(slLyThuyet);
        cfg = speedRepo.save(cfg);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", cfg.getId());
        resp.put("tenMay", cfg.getTenMay());
        resp.put("tocDoChuanLabel", cfg.getTocDoChuanLabel());
        resp.put("slLyThuyet", cfg.getSlLyThuyet());
        return ResponseEntity.ok(resp);
    }

    // -----------------------------------------------------------------------
    // GET /speed-configs?congDoanKey=
    // -----------------------------------------------------------------------
    @GetMapping("/speed-configs")
    public ResponseEntity<List<Map<String, Object>>> speedConfigs(
            @RequestParam String congDoanKey) {

        List<WorkSchedule> wsList;
        switch (congDoanKey) {
            case "PCPL1": wsList = wsRepo.findForMachineSummary("PCPL1", List.of("PCPL1")); break;
            case "PCPL2": wsList = wsRepo.findForMachineSummary("PCPL2", List.of("PCPL2")); break;
            case "PL":    wsList = wsRepo.findForMachineSummary("PL",    List.of("PL", "PCPL3")); break;
            default:      wsList = wsRepo.findByCongDoan(congDoanKey); break;
        }

        Set<String> tenMaySet = new LinkedHashSet<>();
        for (WorkSchedule ws : wsList) {
            if (ws.getPhongThucHien() != null && !ws.getPhongThucHien().isBlank()) {
                tenMaySet.add(ws.getPhongThucHien());
            }
        }

        List<MachineSpeedConfig> allConfigs = speedRepo.findAll();
        List<MachineSpeedConfig> filtered = tenMaySet.isEmpty()
                ? allConfigs
                : allConfigs.stream().filter(c -> tenMaySet.contains(c.getTenMay())).collect(Collectors.toList());

        List<Map<String, Object>> result = new ArrayList<>();
        for (MachineSpeedConfig cfg : filtered) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("tenMay", cfg.getTenMay());
            row.put("tocDoChuanLabel", cfg.getTocDoChuanLabel());
            row.put("slLyThuyet", cfg.getSlLyThuyet());
            result.add(row);
        }
        return ResponseEntity.ok(result);
    }
}
