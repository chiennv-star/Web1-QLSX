package com.sanluong.controller;

import com.sanluong.dto.WorkScheduleDto;
import com.sanluong.entity.WorkSchedule;
import com.sanluong.service.WorkScheduleService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/work-schedule")
public class WorkScheduleController {

    private final WorkScheduleService service;

    public WorkScheduleController(WorkScheduleService service) {
        this.service = service;
    }

    // Chỉ ADMIN và ADMIN_KH được ghi Kế hoạch (source = PLAN)
    private void checkPlanPermission(Authentication auth, String source) {
        if (!"PLAN".equals(source)) return;
        boolean allowed = auth.getAuthorities().stream().anyMatch(a ->
            "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_ADMIN_KH".equals(a.getAuthority())
        );
        if (!allowed) throw new AccessDeniedException("Chỉ Admin và Admin KH được chỉnh sửa Kế hoạch");
    }

    // ADMIN: toàn quyền
    // ADMIN_KH: toàn quyền Kế hoạch (đã qua checkPlanPermission)
    // NHAN_VIEN: tất cả trừ CC
    // ADMIN_PC: được PC và CC
    // ADMIN_*: chỉ được công đoạn của mình
    private void checkStagePermission(Authentication auth, String congDoan) {
        for (var a : auth.getAuthorities()) {
            String role = a.getAuthority();
            if ("ROLE_ADMIN".equals(role)) return;
            if ("ROLE_ADMIN_KH".equals(role)) return;
            if ("ROLE_NHAN_VIEN".equals(role) && !"CC".equals(congDoan)) return;
            if ("ROLE_ADMIN_PC".equals(role) && ("PC".equals(congDoan) || "CC".equals(congDoan))) return;
            if (congDoan != null && ("ROLE_ADMIN_" + congDoan).equals(role)) return;
        }
        throw new AccessDeniedException("Không có quyền chỉnh sửa công đoạn: " + congDoan);
    }

    @GetMapping
    public ResponseEntity<Page<WorkSchedule>> search(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String maSp,
            @RequestParam(required = false) String tenTrinh,
            @RequestParam(required = false) String soLo,
            @RequestParam(required = false) String tinhTrang,
            @RequestParam(required = false) String congDoan,
            @RequestParam(required = false) String source,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.search(fromDate, toDate, maSp, tenTrinh, soLo, tinhTrang, congDoan, source, page, size));
    }

    @GetMapping("/suggestions")
    public ResponseEntity<List<Map<String, String>>> suggestions() {
        return ResponseEntity.ok(service.getSuggestions());
    }

    @GetMapping("/lookup-by-triplet")
    public ResponseEntity<Map<String, Object>> lookupByTriplet(
            @RequestParam String maSp,
            @RequestParam(required = false) String tenTrinh,
            @RequestParam(required = false) String soLo) {
        return ResponseEntity.ok(service.lookupByTriplet(maSp, tenTrinh, soLo));
    }

    @GetMapping("/deviations")
    public ResponseEntity<Page<WorkSchedule>> deviations(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String maSp,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.findDeviations(fromDate, toDate, maSp, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkSchedule> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<WorkSchedule> create(@Valid @RequestBody WorkScheduleDto dto,
                                                Authentication auth) {
        checkPlanPermission(auth, dto.getSource());
        checkStagePermission(auth, dto.getCongDoan());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(dto, auth.getName()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorkSchedule> update(@PathVariable Long id,
                                                @Valid @RequestBody WorkScheduleDto dto,
                                                Authentication auth) {
        checkPlanPermission(auth, dto.getSource());
        checkStagePermission(auth, dto.getCongDoan());
        return ResponseEntity.ok(service.update(id, dto, auth.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        WorkSchedule existing = service.getById(id);
        checkPlanPermission(auth, existing.getSource());
        checkStagePermission(auth, existing.getCongDoan());
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
