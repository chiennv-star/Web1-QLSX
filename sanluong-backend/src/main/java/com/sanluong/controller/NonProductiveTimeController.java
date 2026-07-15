package com.sanluong.controller;

import com.sanluong.dto.NonProductiveTimeDto;
import com.sanluong.entity.NonProductiveTime;
import com.sanluong.service.NonProductiveTimeService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/non-productive-time")
public class NonProductiveTimeController {

    private final NonProductiveTimeService service;

    public NonProductiveTimeController(NonProductiveTimeService service) {
        this.service = service;
    }

    // StageTab: lấy theo congDoan (không có workScheduleId)
    @GetMapping
    public ResponseEntity<List<NonProductiveTime>> list(@RequestParam String congDoan) {
        return ResponseEntity.ok(service.list(congDoan));
    }

    // WorkDetailDrawer: lấy tất cả bản ghi theo scheduleId
    @GetMapping("/by-schedule/{scheduleId}")
    public ResponseEntity<List<NonProductiveTime>> listBySchedule(@PathVariable Long scheduleId) {
        return ResponseEntity.ok(service.listBySchedule(scheduleId));
    }

    // StageTab: tạo hàng loạt (gắn với congDoan)
    @PostMapping
    public ResponseEntity<List<NonProductiveTime>> create(
            @RequestParam String congDoan,
            @RequestBody List<NonProductiveTimeDto> entries,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.createBatch(congDoan, entries, auth.getName()));
    }

    // WorkDetailDrawer: sync một ngày — xóa cũ rồi tạo mới
    @PostMapping("/by-schedule/{scheduleId}/sync-day")
    public ResponseEntity<List<NonProductiveTime>> syncDay(
            @PathVariable Long scheduleId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ngay,
            @RequestBody List<NonProductiveTimeDto> entries,
            Authentication auth) {
        return ResponseEntity.ok(service.syncDay(scheduleId, ngay, entries, auth.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAll(@RequestParam String congDoan) {
        service.deleteAllByCongDoan(congDoan);
        return ResponseEntity.noContent().build();
    }
}
