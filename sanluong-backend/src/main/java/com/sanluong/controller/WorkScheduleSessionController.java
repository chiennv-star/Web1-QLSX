package com.sanluong.controller;

import com.sanluong.dto.DailyProductionDto;
import com.sanluong.dto.EmployeeSessionDetailDto;
import com.sanluong.dto.WorkScheduleSessionDto;
import com.sanluong.entity.WorkScheduleSession;
import com.sanluong.service.WorkScheduleSessionService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/work-schedule-session")
public class WorkScheduleSessionController {

    private final WorkScheduleSessionService service;

    public WorkScheduleSessionController(WorkScheduleSessionService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<WorkScheduleSession>> getByScheduleId(
            @RequestParam Long scheduleId) {
        return ResponseEntity.ok(service.getByScheduleId(scheduleId));
    }

    @PostMapping
    public ResponseEntity<WorkScheduleSession> create(@RequestBody WorkScheduleSessionDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorkScheduleSession> update(@PathVariable Long id,
                                                       @RequestBody WorkScheduleSessionDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/by-employee")
    public ResponseEntity<List<EmployeeSessionDetailDto>> getByEmployee(
            @RequestParam String maNhanVien) {
        return ResponseEntity.ok(service.getByMaNhanVien(maNhanVien));
    }

    /** Backfill nangSuat + nangSuatTrungBinh cho tất cả sessions và tính lại soLanDat/soLanKhongDat */
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/recalculate-ns")
    public ResponseEntity<Map<String, Integer>> recalculateNs() {
        int updated = service.recalculateAllSessions();
        Map<String, Integer> result = new HashMap<>();
        result.put("updated", updated);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/daily-report")
    public ResponseEntity<List<DailyProductionDto>> getDailyReport(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String congDoan) {
        LocalDate from = (fromDate != null && !fromDate.isBlank()) ? LocalDate.parse(fromDate) : null;
        LocalDate to   = (toDate   != null && !toDate.isBlank())   ? LocalDate.parse(toDate)   : null;
        return ResponseEntity.ok(service.getDailyReport(from, to, congDoan));
    }
}
