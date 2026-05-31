package com.sanluong.controller;

import com.sanluong.service.AttendanceService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceService service;

    public AttendanceController(AttendanceService service) {
        this.service = service;
    }

    /** Bảng chấm công nhân viên: mỗi người x mỗi ngày */
    @GetMapping("/timesheet")
    public ResponseEntity<List<AttendanceService.EmployeeRow>> getTimesheet(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String toNhom) {
        return ResponseEntity.ok(service.getTimesheet(fromDate, toDate, toNhom));
    }

    /** Tổng hợp công theo bộ phận */
    @GetMapping("/dept-summary")
    public ResponseEntity<List<AttendanceService.DeptRow>> getDeptSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(service.getDeptSummary(fromDate, toDate));
    }
}
