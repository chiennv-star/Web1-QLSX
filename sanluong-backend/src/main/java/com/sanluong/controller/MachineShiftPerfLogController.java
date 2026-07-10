package com.sanluong.controller;

import com.sanluong.entity.MachineShiftPerfLog;
import com.sanluong.repository.MachineShiftPerfLogRepository;
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

    public MachineShiftPerfLogController(MachineShiftPerfLogRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public ResponseEntity<List<MachineShiftPerfLog>> get(
            @RequestParam Long workScheduleId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ngay) {
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
            @RequestBody List<Map<String, Object>> rows) {
        repo.deleteByWorkScheduleIdAndNgay(workScheduleId, ngay);
        int order = 0;
        for (Map<String, Object> row : rows) {
            MachineShiftPerfLog log = new MachineShiftPerfLog();
            log.setWorkScheduleId(workScheduleId);
            log.setNgay(ngay);
            log.setCaLo(str(row, "caLo"));
            log.setSlLyThuyet(dbl(row, "slLyThuyet"));
            log.setSlThucTe(dbl(row, "slThucTe"));
            log.setNguyenNhan(str(row, "nguyenNhan"));
            log.setGhiChu(str(row, "ghiChu"));
            log.setSortOrder(order++);
            repo.save(log);
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
