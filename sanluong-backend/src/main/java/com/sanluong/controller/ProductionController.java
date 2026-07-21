package com.sanluong.controller;

import com.sanluong.dto.ProductionRecordDto;
import com.sanluong.entity.ProductionEditHistory;
import com.sanluong.entity.ProductionRecord;
import com.sanluong.service.ProductionService;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/production")
public class ProductionController {

    private final ProductionService productionService;

    public ProductionController(ProductionService productionService) {
        this.productionService = productionService;
    }

    @GetMapping
    public ResponseEntity<Page<ProductionRecord>> search(
            @RequestParam(required = false) String maTp,
            @RequestParam(required = false) String maBravo,
            @RequestParam(required = false) String tienTrinh,
            @RequestParam(required = false) String lsx,
            @RequestParam(required = false) String trangThai,
            @RequestParam(required = false) Boolean hoanThanh,
            @RequestParam(required = false) Boolean hoSoHoanThien,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(productionService.search(maTp, maBravo, tienTrinh, lsx, trangThai, hoanThanh, hoSoHoanThien, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductionRecord> getById(@PathVariable Long id) {
        return ResponseEntity.ok(productionService.getById(id));
    }

    /** Gợi ý cho form Kế hoạch: trả về các LSX chưa hoàn thành */
    @GetMapping("/for-plan-suggestions")
    public ResponseEntity<List<Map<String, Object>>> forPlanSuggestions() {
        return ResponseEntity.ok(productionService.getForPlanSuggestions());
    }

    /** Kiểm tra duplicate trước khi tạo mới từ UI */
    @GetMapping("/check-duplicate")
    public ResponseEntity<Map<String, Object>> checkDuplicate(
            @RequestParam(required = false) String maBravo,
            @RequestParam(required = false) String lsx,
            @RequestParam(required = false) String maDonHang) {
        boolean exists = maBravo != null && !maBravo.isBlank() && lsx != null && !lsx.isBlank()
                && productionService.existsByKey(maBravo, lsx, maDonHang);
        return ResponseEntity.ok(Map.of("exists", exists));
    }

    @PostMapping
    public ResponseEntity<ProductionRecord> create(@RequestBody ProductionRecordDto dto,
                                                    Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(productionService.create(dto, auth.getName()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductionRecord> update(@PathVariable Long id,
                                                    @RequestBody ProductionRecordDto dto,
                                                    Authentication auth) {
        return ResponseEntity.ok(productionService.update(id, dto, auth.getName()));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<ProductionEditHistory>> getHistory(@PathVariable Long id) {
        return ResponseEntity.ok(productionService.getHistory(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        productionService.delete(id, auth.getName());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/bulk")
    public ResponseEntity<java.util.Map<String, Integer>> bulkDelete(
            @RequestBody java.util.List<Long> ids, Authentication auth) {
        int deleted = productionService.bulkDelete(ids, auth.getName());
        return ResponseEntity.ok(java.util.Map.of("deleted", deleted));
    }

    @GetMapping("/chua-phat-lenh/count")
    public ResponseEntity<java.util.Map<String, Long>> countChuaPhatLenh() {
        long count = productionService.countChuaPhatLenh();
        return ResponseEntity.ok(java.util.Map.of("count", count));
    }

    @GetMapping("/inbox/chua-phat-lenh")
    public ResponseEntity<List<ProductionRecord>> inboxChuaPhatLenh() {
        return ResponseEntity.ok(productionService.getChuaPhatLenhList());
    }

    @GetMapping("/inbox/cho-xep-lich")
    public ResponseEntity<List<ProductionRecord>> inboxChoXepLich() {
        return ResponseEntity.ok(productionService.getDaPhatChuaXepLich());
    }

    @GetMapping("/trash")
    public ResponseEntity<List<ProductionRecord>> getTrash() {
        return ResponseEntity.ok(productionService.findTrash());
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<Void> restore(@PathVariable Long id) {
        productionService.restore(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> deletePermanent(@PathVariable Long id) {
        productionService.deletePermanent(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/phat-lenh")
    public ResponseEntity<ProductionRecord> phatLenh(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(productionService.phatLenh(id, auth.getName()));
    }

    /** Tạo bổ sung WorkSchedule SCHEDULE cho tất cả records đã phatLenh nhưng thiếu bản ghi công đoạn */
    @PostMapping("/sync-schedule-all")
    public ResponseEntity<Map<String, Integer>> syncScheduleAll() {
        int created = productionService.syncScheduleAll();
        return ResponseEntity.ok(Map.of("created", created));
    }

    @PatchMapping("/{id}/ho-so-hoan-thien")
    public ResponseEntity<ProductionRecord> hoSoHoanThien(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(productionService.toggleHoSoHoanThien(id, auth.getName()));
    }

    @PatchMapping("/{id}/hide")
    public ResponseEntity<Void> hide(@PathVariable Long id) {
        productionService.hide(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/hidden")
    public ResponseEntity<List<ProductionRecord>> getHidden() {
        return ResponseEntity.ok(productionService.findHidden());
    }

    @PatchMapping("/{id}/unhide")
    public ResponseEntity<Void> unhide(@PathVariable Long id) {
        productionService.unhide(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/ghi-chu-hieu-suat")
    public ResponseEntity<ProductionRecord> updateGhiChuHieuSuat(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(productionService.updateGhiChuHieuSuat(id, body.get("ghiChu")));
    }

    @GetMapping("/wip-dg")
    public ResponseEntity<List<ProductionRecord>> getWipDg() {
        return ResponseEntity.ok(productionService.getWipDg());
    }

    @GetMapping("/wip-pc")
    public ResponseEntity<List<ProductionRecord>> getWipPc() {
        return ResponseEntity.ok(productionService.getWipPc());
    }

    @GetMapping("/wip-pl")
    public ResponseEntity<List<ProductionRecord>> getWipPl() {
        return ResponseEntity.ok(productionService.getWipPl());
    }

    @GetMapping("/wip-bbc1")
    public ResponseEntity<List<ProductionRecord>> getWipBbc1() {
        return ResponseEntity.ok(productionService.getWipBbc1());
    }

    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate() throws java.io.IOException {
        byte[] data = productionService.generateImportTemplate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=mau_import_sanluong.xlsx")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }

    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importExcel(
            @RequestParam("file") MultipartFile file,
            Authentication auth) throws java.io.IOException {
        Map<String, Object> result = productionService.importFromExcel(file, auth.getName());
        return ResponseEntity.ok(result);
    }

    /** Tạo bản ghi nhập kho mới bằng cách clone thông tin sản phẩm từ bản ghi nguồn */
    @PostMapping("/{sourceId}/nhap-kho-entry")
    public ResponseEntity<ProductionRecord> createNhapKhoEntry(
            @PathVariable Long sourceId,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(productionService.createNhapKhoEntry(sourceId, body, auth.getName()));
    }

    /** Trả về danh sách từng lần nhập kho của bản ghi nguồn */
    @GetMapping("/{id}/nhap-kho-entries")
    public ResponseEntity<List<java.util.Map<String, Object>>> getNhapKhoEntries(@PathVariable Long id) {
        return ResponseEntity.ok(productionService.getNhapKhoEntries(id));
    }

    /** Tổng SL Đóng Gói từ sessions WorkSchedule ĐG của sản phẩm */
    @GetMapping("/{id}/dg-san-luong")
    public ResponseEntity<java.util.Map<String, Object>> getDgSanLuong(@PathVariable Long id) {
        return ResponseEntity.ok(productionService.getDgSanLuong(id));
    }

    /** Xóa hàng khỏi danh sách nhập kho (xóa mềm nếu là bản ghi nhập kho đơn thuần, ngược lại chỉ xóa các trường NK) */
    @DeleteMapping("/{id}/nhap-kho")
    public ResponseEntity<Void> removeFromNhapKho(@PathVariable Long id, Authentication auth) {
        productionService.removeFromNhapKho(id, auth.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/nhap-kho-tong-hop")
    public ResponseEntity<List<java.util.Map<String, Object>>> getNhapKhoTongHop() {
        return ResponseEntity.ok(productionService.getNhapKhoTongHop());
    }

    /**
     * "Tổng hợp theo ngày" — bản sao độc lập, đồng bộ 1 chiều từ "Ngày Nhập Kho"/"Nhập Kho".
     * Xóa ở đây (DELETE bên dưới) không ảnh hưởng bản ghi nguồn; xóa ở nguồn cũng không
     * ảnh hưởng dữ liệu đã đồng bộ sang đây.
     */
    @GetMapping("/nhap-kho-tong-hop-ngay")
    public ResponseEntity<List<com.sanluong.entity.NhapKhoTongHopNgay>> getNhapKhoTongHopNgay(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        java.time.LocalDate from = fromDate != null && !fromDate.isBlank() ? java.time.LocalDate.parse(fromDate) : null;
        java.time.LocalDate to   = toDate   != null && !toDate.isBlank()   ? java.time.LocalDate.parse(toDate)   : null;
        return ResponseEntity.ok(productionService.getNhapKhoTongHopNgay(from, to));
    }

    @DeleteMapping("/nhap-kho-tong-hop-ngay/{id}")
    public ResponseEntity<Void> deleteNhapKhoTongHopNgay(@PathVariable Long id) {
        productionService.deleteNhapKhoTongHopNgay(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Lịch sử thêm mới/sửa/xóa của tab "Ngày Nhập Kho" và "Nhập Kho" — bản sao độc lập,
     * append-only, không đổi theo khi bản ghi nguồn bị xóa/sửa sau đó. Chỉ ADMIN xem được
     * (xem SecurityConfig).
     */
    @GetMapping("/nhap-kho-audit-log")
    public ResponseEntity<List<com.sanluong.entity.NhapKhoAuditLog>> getNhapKhoAuditLog(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        java.time.LocalDateTime from = fromDate != null && !fromDate.isBlank()
                ? java.time.LocalDate.parse(fromDate).atStartOfDay() : null;
        java.time.LocalDateTime to = toDate != null && !toDate.isBlank()
                ? java.time.LocalDate.parse(toDate).atTime(23, 59, 59) : null;
        return ResponseEntity.ok(productionService.getNhapKhoAuditLog(from, to));
    }

    @GetMapping("/nhap-kho")
    public ResponseEntity<List<ProductionRecord>> getNhapKho(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        java.time.LocalDate from = fromDate != null && !fromDate.isBlank() ? java.time.LocalDate.parse(fromDate) : null;
        java.time.LocalDate to   = toDate   != null && !toDate.isBlank()   ? java.time.LocalDate.parse(toDate)   : null;
        return ResponseEntity.ok(productionService.getNhapKho(from, to));
    }

    @PatchMapping("/{id}/nhap-kho")
    public ResponseEntity<ProductionRecord> updateNhapKho(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        return ResponseEntity.ok(productionService.updateNhapKho(id, body, auth.getName()));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(required = false) String maTp,
            @RequestParam(required = false) String maBravo,
            @RequestParam(required = false) String tienTrinh,
            @RequestParam(required = false) String lsx,
            @RequestParam(required = false) String trangThai) throws IOException {
        byte[] data = productionService.exportExcel(maTp, maBravo, tienTrinh, lsx, trangThai);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=sanluong.xlsx")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }
}
