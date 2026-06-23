package com.sanluong.controller;

import com.sanluong.dto.StageTimelineDto;
import com.sanluong.dto.WorkScheduleCoLoHistoryDto;
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

    // Chỉ ADMIN được xóa vĩnh viễn, xóa hàng loạt, hoặc khôi phục dữ liệu
    private void checkAdminPermission(Authentication auth) {
        boolean allowed = auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        if (!allowed) throw new AccessDeniedException("Chỉ Admin được thực hiện thao tác này");
    }

    // Stage admin (PCPL1/2/3, BBC1, PL, DG) không được xóa bản ghi lịch sản xuất
    private static final java.util.Set<String> NO_DELETE_ROLES = java.util.Set.of(
            "ROLE_ADMIN_PCPL1", "ROLE_ADMIN_PCPL2", "ROLE_ADMIN_PCPL3",
            "ROLE_ADMIN_BBC1", "ROLE_ADMIN_PL", "ROLE_ADMIN_DG");

    private void checkDeletePermission(Authentication auth) {
        boolean blocked = auth.getAuthorities().stream()
                .anyMatch(a -> NO_DELETE_ROLES.contains(a.getAuthority()));
        if (blocked) throw new AccessDeniedException("Bạn không có quyền xóa bản ghi lịch sản xuất");
    }

    // Chỉ ADMIN và ADMIN_KH được ghi Kế hoạch (source = PLAN hoặc isPlanned = true)
    private void checkPlanPermission(Authentication auth, String source, boolean isPlanned) {
        if (!"PLAN".equals(source) && !isPlanned) return;
        boolean allowed = auth.getAuthorities().stream().anyMatch(a ->
            "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_ADMIN_KH".equals(a.getAuthority())
        );
        if (!allowed) throw new AccessDeniedException("Chỉ Admin và Admin KH được chỉnh sửa Kế hoạch");
    }

    // ADMIN: toàn quyền
    // ADMIN_KH: chỉ được ghi source=PLAN; không được ghi SCHEDULE
    // NHAN_VIEN*: tất cả trừ CC (hoặc chỉ đúng công đoạn của mình)
    // ADMIN_PC: được PCPL1, PCPL2, CC (và PC cũ cho tương thích PLAN records)
    // ADMIN_PCPL1: được PCPL1 (và PC cũ)
    // ADMIN_PCPL2: được PCPL2, CC (và PC cũ)
    // ADMIN_PCPL3: được PL
    private void checkStagePermission(Authentication auth, String congDoan, String source) {
        checkStagePermission(auth, congDoan, source, false);
    }

    private void checkStagePermission(Authentication auth, String congDoan, String source, boolean isPlanned) {
        for (var a : auth.getAuthorities()) {
            String role = a.getAuthority();
            if ("ROLE_ADMIN".equals(role)) return;
            if ("ROLE_ADMIN_KH".equals(role) && ("PLAN".equals(source) || isPlanned)) return;
            if ("ROLE_NHAN_VIEN".equals(role) && !"CC".equals(congDoan)) return;
            if ("ROLE_NHAN_VIEN_PCPL1".equals(role) && "PCPL1".equals(congDoan)) return;
            if ("ROLE_NHAN_VIEN_PCPL2".equals(role) && "PCPL2".equals(congDoan)) return;
            if ("ROLE_NHAN_VIEN_PCPL3".equals(role) && "PL".equals(congDoan)) return;
            if ("ROLE_NHAN_VIEN_BBC1".equals(role) && "BBC1".equals(congDoan)) return;
            if ("ROLE_NHAN_VIEN_DG".equals(role) && "DG".equals(congDoan)) return;
            if ("ROLE_ADMIN_PC".equals(role) && ("PC".equals(congDoan) || "PCPL1".equals(congDoan) || "PCPL2".equals(congDoan) || "CC".equals(congDoan))) return;
            if ("ROLE_ADMIN_PCPL1".equals(role) && ("PC".equals(congDoan) || "PCPL1".equals(congDoan))) return;
            if ("ROLE_ADMIN_PCPL2".equals(role) && ("PC".equals(congDoan) || "PCPL2".equals(congDoan) || "CC".equals(congDoan))) return;
            if ("ROLE_ADMIN_PCPL3".equals(role) && "PL".equals(congDoan)) return;
            if (congDoan != null && ("ROLE_ADMIN_" + congDoan).equals(role)) return;
        }
        throw new AccessDeniedException("Không có quyền chỉnh sửa công đoạn: " + congDoan);
    }

    // Trả về congDoan filter phù hợp với quyền của user
    // ADMIN/ADMIN_KH/TKSX/QUAN_DOC: không lọc (null = tất cả)
    // Stage admin: buộc filter về công đoạn của mình
    private static final java.util.Map<String, String> STAGE_ADMIN_MAP = java.util.Map.of(
            "ROLE_ADMIN_BBC1",  "BBC1",
            "ROLE_ADMIN_DG",    "DG",
            "ROLE_ADMIN_PCPL1", "PCPL1",
            "ROLE_ADMIN_PCPL2", "PCPL2",
            "ROLE_ADMIN_PCPL3", "PL",
            "ROLE_ADMIN_PL",    "PL"
    );
    private static final java.util.Set<String> UNRESTRICTED_ROLES = java.util.Set.of(
            "ROLE_ADMIN", "ROLE_ADMIN_KH", "ROLE_TKSX", "ROLE_QUAN_DOC", "ROLE_ADMIN_PC"
    );

    private String enforceStageFilter(Authentication auth, String requestedCongDoan) {
        boolean unrestricted = auth.getAuthorities().stream()
                .anyMatch(a -> UNRESTRICTED_ROLES.contains(a.getAuthority()));
        if (unrestricted) return requestedCongDoan;
        for (var a : auth.getAuthorities()) {
            String mapped = STAGE_ADMIN_MAP.get(a.getAuthority());
            if (mapped != null) return mapped; // bỏ qua filter client, dùng quyền server
        }
        return requestedCongDoan;
    }

    // Validate bulk-unhide: mỗi record phải thuộc công đoạn user có quyền
    private void checkAdminOrStageForIds(List<Long> ids, Authentication auth) {
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        if (isAdmin) return;
        for (Long id : ids) {
            WorkSchedule w = service.getById(id);
            checkStagePermission(auth, w.getCongDoan(), w.getSource());
        }
    }

    @GetMapping
    public ResponseEntity<Page<WorkSchedule>> search(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String maSp,
            @RequestParam(required = false) String tenTrinh,
            @RequestParam(required = false) String soLo,
            @RequestParam(required = false) String maBravo,
            @RequestParam(required = false) String maDonHang,
            @RequestParam(required = false) String tinhTrang,
            @RequestParam(required = false) String congDoan,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String toNhom,
            @RequestParam(required = false) Boolean isPlanned,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.search(fromDate, toDate, maSp, tenTrinh, soLo, maBravo, maDonHang, tinhTrang, congDoan, source, toNhom, isPlanned, page, size));
    }

    @GetMapping("/suggestions")
    public ResponseEntity<List<Map<String, String>>> suggestions() {
        return ResponseEntity.ok(service.getSuggestions());
    }

    // Tự động tạo bản ghi SCHEDULE cho 5 công đoạn nếu chưa tồn tại
    // Key dedup: maBravo + soLo + maDonHang
    @PostMapping("/auto-sync")
    public ResponseEntity<Integer> autoSync(
            @RequestParam(required = false) String maBravo,
            @RequestParam(required = false) String maSp,
            @RequestParam(required = false) String tenTrinh,
            @RequestParam(required = false) String soLo,
            @RequestParam(required = false) java.math.BigDecimal coLo,
            @RequestParam(required = false) String maDonHang,
            @RequestParam(required = false, defaultValue = "false") boolean phatLenh,
            @RequestParam(required = false) String toNhomOverride) {
        int created = service.autoSyncFromProduction(maBravo, maSp, tenTrinh, soLo, coLo, maDonHang, phatLenh, toNhomOverride);
        return ResponseEntity.ok(created);
    }

    @GetMapping("/lookup-by-triplet")
    public ResponseEntity<Map<String, Object>> lookupByTriplet(
            @RequestParam String maSp,
            @RequestParam(required = false) String tenTrinh,
            @RequestParam(required = false) String soLo) {
        return ResponseEntity.ok(service.lookupByTriplet(maSp, tenTrinh, soLo));
    }

    @GetMapping("/stage-timeline")
    public ResponseEntity<List<StageTimelineDto>> stageTimeline(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String maSp) {
        return ResponseEntity.ok(service.getStageTimeline(fromDate, toDate, maSp));
    }

    @GetMapping("/monthly-stats")
    public ResponseEntity<Map<String, Object>> monthlyStats(
            @RequestParam String month,
            @RequestParam(required = false) String year) {
        return ResponseEntity.ok(service.getMonthlyStats(month, year));
    }

    @GetMapping("/deviations")
    public ResponseEntity<Page<WorkSchedule>> deviations(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String maSp,
            @RequestParam(required = false) String tenTrinh,
            @RequestParam(required = false) String soLo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.findDeviations(fromDate, toDate, maSp, tenTrinh, soLo, page, size));
    }

    @GetMapping("/new-today/count")
    public ResponseEntity<Map<String, Long>> countNewToday() {
        return ResponseEntity.ok(Map.of("count", service.countCreatedToday()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkSchedule> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<WorkSchedule> create(@Valid @RequestBody WorkScheduleDto dto,
                                                Authentication auth) {
        checkPlanPermission(auth, dto.getSource(), dto.isPlanned());
        checkStagePermission(auth, dto.getCongDoan(), dto.getSource(), dto.isPlanned());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(dto, auth.getName()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorkSchedule> update(@PathVariable Long id,
                                                @Valid @RequestBody WorkScheduleDto dto,
                                                Authentication auth) {
        checkPlanPermission(auth, dto.getSource(), dto.isPlanned());
        checkStagePermission(auth, dto.getCongDoan(), dto.getSource(), dto.isPlanned());
        return ResponseEntity.ok(service.update(id, dto, auth.getName()));
    }

    // Cập nhật một field duy nhất (congPc, congPl, slPc, ...) — dùng cho sync từ session
    @PatchMapping("/{id}/patch-field")
    public ResponseEntity<Void> patchField(@PathVariable Long id,
                                            @RequestBody Map<String, Object> body,
                                            Authentication auth) {
        WorkSchedule w = service.getById(id);
        checkStagePermission(auth, w.getCongDoan(), w.getSource());
        String field = (String) body.get("field");
        Object rawValue = body.get("value");
        java.math.BigDecimal value = rawValue == null ? null
                : new java.math.BigDecimal(rawValue.toString());
        service.patchField(id, field, value);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/ngay-thuc-hien")
    public ResponseEntity<Void> patchNgayThucHien(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        WorkSchedule w = service.getById(id);
        checkStagePermission(auth, w.getCongDoan(), w.getSource());
        String ngayStr = body.get("ngayThucHien") != null ? body.get("ngayThucHien").toString() : null;
        LocalDate ngay = ngayStr != null ? LocalDate.parse(ngayStr) : null;
        service.patchNgayThucHien(id, ngay);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/phong-thuc-hien")
    public ResponseEntity<Void> patchPhongThucHien(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        WorkSchedule w = service.getById(id);
        checkStagePermission(auth, w.getCongDoan(), w.getSource());
        String phong = body.get("phongThucHien") != null ? body.get("phongThucHien").toString() : null;
        service.patchPhongThucHien(id, phong);
        return ResponseEntity.noContent().build();
    }

    // Cập nhật tình trạng và sync ngay sang sản lượng
    @PatchMapping("/{id}/tinh-trang")
    public ResponseEntity<WorkSchedule> patchTinhTrang(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        WorkSchedule w = service.getById(id);
        checkStagePermission(auth, w.getCongDoan(), w.getSource());
        String tinhTrang = body.get("tinhTrang") != null ? body.get("tinhTrang").toString() : null;
        return ResponseEntity.ok(service.patchTinhTrang(id, tinhTrang, auth.getName()));
    }

    @PatchMapping("/{id}/hidden")
    public ResponseEntity<WorkSchedule> setHidden(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        boolean hidden = Boolean.TRUE.equals(body.get("hidden"));
        return ResponseEntity.ok(service.setHidden(id, hidden));
    }

    @PatchMapping("/bulk-to-nhom")
    public ResponseEntity<Integer> bulkSetToNhom(@RequestBody Map<String, Object> body, Authentication auth) {
        @SuppressWarnings("unchecked")
        List<Long> ids = ((List<?>) body.get("ids")).stream()
                .map(o -> Long.valueOf(o.toString())).collect(java.util.stream.Collectors.toList());
        String toNhom = body.get("toNhom") != null ? body.get("toNhom").toString() : null;
        checkAdminOrStageForIds(ids, auth);
        return ResponseEntity.ok(service.bulkSetToNhom(ids, toNhom));
    }

    @PostMapping("/bulk-hide")
    public ResponseEntity<Integer> bulkHide(@RequestBody List<Long> ids, Authentication auth) {
        checkAdminOrStageForIds(ids, auth);
        return ResponseEntity.ok(service.bulkHide(ids));
    }

    @PostMapping("/bulk-unhide")
    public ResponseEntity<Integer> bulkUnhide(@RequestBody List<Long> ids, Authentication auth) {
        checkAdminOrStageForIds(ids, auth);
        return ResponseEntity.ok(service.bulkUnhide(ids));
    }

    @GetMapping("/hidden")
    public ResponseEntity<Page<WorkSchedule>> getHidden(
            @RequestParam(required = false) String congDoan,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String toNhom,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            Authentication auth) {
        // Stage admin chỉ được xem record ẩn của công đoạn mình quản lý
        String filteredCongDoan = enforceStageFilter(auth, congDoan);
        return ResponseEntity.ok(service.findHidden(filteredCongDoan, source, toNhom, page, size));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        checkDeletePermission(auth);
        WorkSchedule existing = service.getById(id);
        checkPlanPermission(auth, existing.getSource(), existing.isPlanned());
        checkStagePermission(auth, existing.getCongDoan(), existing.getSource(), existing.isPlanned());
        service.delete(id, auth.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/trash")
    public ResponseEntity<List<WorkSchedule>> getTrash() {
        return ResponseEntity.ok(service.findTrash());
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<Void> restore(@PathVariable Long id, Authentication auth) {
        checkAdminPermission(auth);
        service.restore(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> deletePermanent(@PathVariable Long id, Authentication auth) {
        checkAdminPermission(auth);
        service.deletePermanent(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/bulk")
    public ResponseEntity<Map<String, Integer>> bulkDelete(@RequestBody List<Long> ids, Authentication auth) {
        int deleted = service.bulkDelete(ids, auth.getName());
        return ResponseEntity.ok(Map.of("deleted", deleted));
    }

    /** Đổi Cỡ Lô với lưu lịch sử */
    @PostMapping("/{id}/doi-co-lo")
    public ResponseEntity<WorkSchedule> doiCoLo(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        java.math.BigDecimal coLoMoi = new java.math.BigDecimal(body.get("coLoMoi").toString());
        String lyDo = body.containsKey("lyDo") ? body.get("lyDo").toString() : null;
        return ResponseEntity.ok(service.doiCoLo(id, coLoMoi, lyDo, auth.getName()));
    }

    /** Lấy lịch sử đổi Cỡ Lô */
    @GetMapping("/{id}/lich-su-co-lo")
    public ResponseEntity<List<WorkScheduleCoLoHistoryDto>> getLichSuCoLo(@PathVariable Long id) {
        return ResponseEntity.ok(service.getLichSuCoLo(id));
    }
}
