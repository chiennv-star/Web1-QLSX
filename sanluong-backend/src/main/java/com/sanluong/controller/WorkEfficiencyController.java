package com.sanluong.controller;

import com.sanluong.dto.EmployeeEfficiencyReportDto;
import com.sanluong.dto.EmployeeSessionDetailDto;
import com.sanluong.dto.WorkEfficiencyDto;
import com.sanluong.entity.WorkEfficiency;
import com.sanluong.service.WorkEfficiencyService;
import com.sanluong.service.WorkScheduleSessionService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/work-efficiency")
public class WorkEfficiencyController {

    private final WorkEfficiencyService service;
    private final WorkScheduleSessionService sessionService;

    public WorkEfficiencyController(WorkEfficiencyService service,
                                     WorkScheduleSessionService sessionService) {
        this.service = service;
        this.sessionService = sessionService;
    }

    @GetMapping
    public ResponseEntity<Page<WorkEfficiency>> search(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(service.search(search, page, size));
    }

    /** Báo cáo hiệu quả tổng hợp theo khoảng thời gian, tính từ WorkScheduleSession */
    @GetMapping("/report")
    public ResponseEntity<List<EmployeeEfficiencyReportDto>> getReport(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String toNhom) {
        LocalDate from = (fromDate != null && !fromDate.isBlank()) ? LocalDate.parse(fromDate) : null;
        LocalDate to   = (toDate   != null && !toDate.isBlank())   ? LocalDate.parse(toDate)   : null;
        return ResponseEntity.ok(service.getReport(from, to, toNhom));
    }

    /** Chi tiết sessions của một nhân viên trong khoảng ngày */
    @GetMapping("/employee-sessions")
    public ResponseEntity<List<EmployeeSessionDetailDto>> getEmployeeSessions(
            @RequestParam String maNhanVien,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        LocalDate from = (fromDate != null && !fromDate.isBlank()) ? LocalDate.parse(fromDate) : null;
        LocalDate to   = (toDate   != null && !toDate.isBlank())   ? LocalDate.parse(toDate)   : null;
        return ResponseEntity.ok(sessionService.getByMaNhanVienAndDateRange(maNhanVien, from, to));
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorkEfficiency> update(@PathVariable Long id,
                                                  @RequestBody WorkEfficiencyDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/bulk")
    public ResponseEntity<Void> deleteBulk(@RequestBody List<Long> ids) {
        ids.forEach(service::delete);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/sync-all")
    public ResponseEntity<Integer> syncAll() {
        return ResponseEntity.ok(service.syncAll());
    }

    @PostMapping("/sync-to-nhom")
    public ResponseEntity<Integer> syncToNhom() {
        return ResponseEntity.ok(service.syncToNhom());
    }

    /**
     * Backfill nhomThucHien cho tất cả sessions cũ còn null (BBC1, ĐG, PL).
     * Chỉ dành cho Admin. Chạy 1 lần sau khi triển khai.
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/fix-nhom-thuc-hien")
    public ResponseEntity<java.util.Map<String, Integer>> fixNhomThucHien() {
        int fixed = sessionService.fixNhomThucHien();
        return ResponseEntity.ok(java.util.Map.of("fixed", fixed));
    }

    /**
     * Backfill maNhanVien cho sessions có nguoiThucHien nhưng maNhanVien = null.
     * Khớp theo tên + nhóm → fallback tên đơn thuần (nếu tên duy nhất).
     */
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/fix-null-ma-nhan-vien")
    public ResponseEntity<java.util.Map<String, Integer>> fixNullMaNhanVien() {
        int fixed = sessionService.fixNullMaNhanVien();
        return ResponseEntity.ok(java.util.Map.of("fixed", fixed));
    }
}
