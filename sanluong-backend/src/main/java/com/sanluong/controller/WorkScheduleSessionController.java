package com.sanluong.controller;

import com.sanluong.dto.DailyProductionDto;
import com.sanluong.dto.EmployeeSessionDetailDto;
import com.sanluong.dto.WorkScheduleSessionDto;
import com.sanluong.entity.WorkSchedule;
import com.sanluong.entity.WorkScheduleSession;
import com.sanluong.repository.WorkScheduleRepository;
import com.sanluong.service.WorkScheduleSessionService;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Set;

@RestController
@RequestMapping("/api/work-schedule-session")
public class WorkScheduleSessionController {

    private final WorkScheduleSessionService service;
    private final WorkScheduleRepository workScheduleRepository;

    public WorkScheduleSessionController(WorkScheduleSessionService service,
                                         WorkScheduleRepository workScheduleRepository) {
        this.service = service;
        this.workScheduleRepository = workScheduleRepository;
    }

    // ── Roles được phép ghi theo từng công đoạn (mirror WorkScheduleController) ──
    private void checkStageWritePermission(Authentication auth, String congDoan, String source, boolean isPlanned) {
        for (var a : auth.getAuthorities()) {
            String role = a.getAuthority();
            if ("ROLE_ADMIN".equals(role)) return;
            if ("ROLE_ADMIN_KH".equals(role)) return;
            if ("ROLE_TKSX".equals(role)) return;
            if (("PLAN".equals(source) || isPlanned) && role.startsWith("ROLE_ADMIN_")) return;
            if ("ROLE_NHAN_VIEN".equals(role) && !"CC".equals(congDoan)) return;
            if ("ROLE_NHAN_VIEN_PCPL1".equals(role) && "PCPL1".equals(congDoan)) return;
            if ("ROLE_NHAN_VIEN_PCPL2".equals(role) && "PCPL2".equals(congDoan)) return;
            if ("ROLE_NHAN_VIEN_PCPL3".equals(role) && "PL".equals(congDoan)) return;
            if ("ROLE_NHAN_VIEN_BBC1".equals(role)  && "BBC1".equals(congDoan)) return;
            if ("ROLE_NHAN_VIEN_DG".equals(role)    && "DG".equals(congDoan))   return;
            if ("ROLE_ADMIN_PC".equals(role) && Set.of("PC","PCPL1","PCPL2","CC").contains(congDoan)) return;
            if ("ROLE_ADMIN_PCPL1".equals(role) && Set.of("PC","PCPL1").contains(congDoan)) return;
            if ("ROLE_ADMIN_PCPL2".equals(role) && Set.of("PC","PCPL2","CC").contains(congDoan)) return;
            if ("ROLE_ADMIN_PCPL3".equals(role) && "PL".equals(congDoan)) return;
            if (congDoan != null && ("ROLE_ADMIN_" + congDoan).equals(role)) return;
        }
        throw new AccessDeniedException("Không có quyền chỉnh sửa công đoạn: " + congDoan);
    }

    private WorkSchedule resolveSchedule(Long scheduleId) {
        return workScheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lịch sản xuất"));
    }

    @GetMapping
    public ResponseEntity<List<WorkScheduleSession>> getByScheduleId(
            @RequestParam Long scheduleId,
            @RequestParam(required = false) String loaiSession) {
        return ResponseEntity.ok(service.getByScheduleId(scheduleId, loaiSession));
    }

    @PostMapping
    public ResponseEntity<WorkScheduleSession> create(@RequestBody WorkScheduleSessionDto dto,
                                                       Authentication auth) {
        WorkSchedule schedule = resolveSchedule(dto.getWorkScheduleId());
        checkStageWritePermission(auth, schedule.getCongDoan(), schedule.getSource(), schedule.isPlanned());
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorkScheduleSession> update(@PathVariable Long id,
                                                       @RequestBody WorkScheduleSessionDto dto,
                                                       Authentication auth) {
        WorkScheduleSession existing = service.getById(id);
        WorkSchedule schedule = resolveSchedule(existing.getWorkScheduleId());
        checkStageWritePermission(auth, schedule.getCongDoan(), schedule.getSource(), schedule.isPlanned());
        return ResponseEntity.ok(service.update(id, dto));
    }

    @PatchMapping("/{id}/san-luong")
    public ResponseEntity<Void> patchSanLuong(@PathVariable Long id,
                                               @RequestBody Map<String, Object> body,
                                               Authentication auth) {
        WorkScheduleSession existing = service.getById(id);
        WorkSchedule schedule = resolveSchedule(existing.getWorkScheduleId());
        checkStageWritePermission(auth, schedule.getCongDoan(), schedule.getSource(), schedule.isPlanned());
        Object raw = body.get("sanLuong");
        java.math.BigDecimal value = null;
        if (raw != null && !raw.toString().trim().isEmpty()) {
            try { value = new java.math.BigDecimal(raw.toString().trim()); }
            catch (NumberFormatException e) { return ResponseEntity.badRequest().build(); }
        }
        service.patchSanLuong(id, value);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/ca")
    public ResponseEntity<Void> patchCa(@PathVariable Long id,
                                         @RequestBody Map<String, Object> body,
                                         Authentication auth) {
        WorkScheduleSession existing = service.getById(id);
        WorkSchedule schedule = resolveSchedule(existing.getWorkScheduleId());
        checkStageWritePermission(auth, schedule.getCongDoan(), schedule.getSource(), schedule.isPlanned());
        Object caRaw = body.get("caSanXuat");
        String caSanXuat = caRaw != null ? caRaw.toString() : null;
        Object tgRaw = body.get("thoiGianBatDau");
        Object ctRaw = body.get("congThucHien");
        java.math.BigDecimal ct = null;
        if (ctRaw != null && !ctRaw.toString().trim().isEmpty()) {
            try { ct = new java.math.BigDecimal(ctRaw.toString().trim()); }
            catch (NumberFormatException e) { return ResponseEntity.badRequest().build(); }
        }
        service.patchCa(id, caSanXuat, tgRaw != null ? tgRaw.toString() : null, ct);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/ghi-chu")
    public ResponseEntity<Void> patchGhiChu(@PathVariable Long id,
                                              @RequestBody Map<String, Object> body,
                                              Authentication auth) {
        WorkScheduleSession existing = service.getById(id);
        WorkSchedule schedule = resolveSchedule(existing.getWorkScheduleId());
        checkStageWritePermission(auth, schedule.getCongDoan(), schedule.getSource(), schedule.isPlanned());
        String ghiChu = body.get("ghiChu") != null ? body.get("ghiChu").toString() : null;
        service.patchGhiChu(id, ghiChu);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        WorkScheduleSession existing = service.getById(id);
        WorkSchedule schedule = resolveSchedule(existing.getWorkScheduleId());
        checkStageWritePermission(auth, schedule.getCongDoan(), schedule.getSource(), schedule.isPlanned());
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
