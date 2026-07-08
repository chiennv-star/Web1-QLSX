package com.sanluong.controller;

import com.sanluong.entity.MachineRuntimeLog;
import com.sanluong.repository.MachineRuntimeLogRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/machine-runtime")
public class MachineRuntimeLogController {

    private final MachineRuntimeLogRepository repo;

    public MachineRuntimeLogController(MachineRuntimeLogRepository repo) {
        this.repo = repo;
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

    private String str(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v != null && !v.toString().isBlank() ? v.toString().trim() : null;
    }
}
