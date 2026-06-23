package com.sanluong.controller;

import com.sanluong.dto.DonHangDto;
import com.sanluong.dto.DonHangFieldHistoryDto;
import com.sanluong.dto.DonHangSlHistoryDto;
import com.sanluong.service.DonHangService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/don-hang")
public class DonHangController {

    private final DonHangService service;

    public DonHangController(DonHangService service) {
        this.service = service;
    }

    @GetMapping("/by-product")
    public ResponseEntity<List<DonHangDto>> getByProduct(@RequestParam String maBravo) {
        return ResponseEntity.ok(service.findByMaBravo(maBravo));
    }

    @GetMapping
    public ResponseEntity<List<DonHangDto>> getAll(
            @RequestParam(required = false) String tinhTrangDatHang,
            @RequestParam(required = false) String tinhTrangSx) {
        return ResponseEntity.ok(service.findAll(tinhTrangDatHang, tinhTrangSx));
    }

    @PostMapping
    public ResponseEntity<DonHangDto> create(@RequestBody DonHangDto dto, Authentication auth) {
        return ResponseEntity.ok(service.create(dto, auth.getName()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DonHangDto> update(@PathVariable Long id,
                                              @RequestBody DonHangDto dto,
                                              Authentication auth) {
        return ResponseEntity.ok(service.update(id, dto, auth.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        service.delete(id, auth.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/trash")
    public ResponseEntity<List<DonHangDto>> getTrash() {
        return ResponseEntity.ok(service.findTrash());
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<DonHangDto> restore(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(service.restore(id, auth.getName()));
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> deletePermanent(@PathVariable Long id) {
        service.deletePermanent(id);
        return ResponseEntity.noContent().build();
    }

    /** Tự động điền Mã SP + Tên SP từ ProductMaster cho các đơn hàng đang trống */
    @PostMapping("/sync-bravo")
    public ResponseEntity<Map<String, Object>> syncBravo() {
        Map<String, Object> result = service.syncBravoLookup();
        return ResponseEntity.ok(result);
    }

    /** Sync soLuongDaXepKh từ kế hoạch (work_schedule source=PLAN) */
    @PostMapping("/sync-khoach")
    public ResponseEntity<Map<String, Object>> syncFromKhoach() {
        int updated = service.syncFromKhoach();
        return ResponseEntity.ok(Map.of("updated", updated, "message",
                "Đã cập nhật SL Đã Xếp KH cho " + updated + " đơn hàng"));
    }

    /** Đổi SL Đặt Hàng với lưu lịch sử */
    @PostMapping("/{id}/doi-so-luong")
    public ResponseEntity<DonHangDto> doiSoLuong(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        BigDecimal slMoi = new BigDecimal(body.get("slMoi").toString());
        String lyDo = body.containsKey("lyDo") ? body.get("lyDo").toString() : null;
        return ResponseEntity.ok(service.doiSoLuong(id, slMoi, lyDo, auth.getName()));
    }

    /** Lấy lịch sử đổi SL của một đơn hàng */
    @GetMapping("/{id}/lich-su-sl")
    public ResponseEntity<List<DonHangSlHistoryDto>> getLichSuSl(@PathVariable Long id) {
        return ResponseEntity.ok(service.getLichSuDoiSoLuong(id));
    }

    /** Chỉnh sửa field khoá (maBravo/maSp/tenSanPham/maDonHang) với lịch sử */
    @PostMapping("/{id}/doi-field")
    public ResponseEntity<DonHangDto> doiField(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        String fieldName = body.get("fieldName").toString();
        String newValue  = body.containsKey("newValue") && body.get("newValue") != null
                ? body.get("newValue").toString() : null;
        String lyDo      = body.containsKey("lyDo") && body.get("lyDo") != null
                ? body.get("lyDo").toString() : null;
        return ResponseEntity.ok(service.doiField(id, fieldName, newValue, lyDo, auth.getName()));
    }

    /** Lấy lịch sử chỉnh sửa field của đơn hàng */
    @GetMapping("/{id}/field-history")
    public ResponseEntity<List<DonHangFieldHistoryDto>> getFieldHistory(
            @PathVariable Long id,
            @RequestParam(required = false) String field) {
        return ResponseEntity.ok(service.getFieldHistory(id, field));
    }

    /** Danh sách đơn hàng chờ duyệt */
    @GetMapping("/pending")
    public ResponseEntity<List<DonHangDto>> getPending() {
        return ResponseEntity.ok(service.findPending());
    }

    /** Duyệt đơn hàng */
    @PostMapping("/{id}/duyet")
    public ResponseEntity<DonHangDto> duyet(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(service.approve(id, auth.getName()));
    }

    /** Từ chối đơn hàng */
    @PostMapping("/{id}/tu-choi")
    public ResponseEntity<Void> tuChoi(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            Authentication auth) {
        String lyDo = (body != null && body.get("lyDo") != null) ? body.get("lyDo").toString() : null;
        service.reject(id, lyDo, auth.getName());
        return ResponseEntity.noContent().build();
    }

    /** Import đơn hàng từ file Excel */
    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importExcel(
            @RequestParam("file") MultipartFile file,
            Authentication auth) {
        try {
            Map<String, Object> result = service.importFromExcel(file, auth.getName());
            return ResponseEntity.ok(result);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    /** Sync soLuongDaXepKh + ngayPhatLenh cho một đơn hàng cụ thể */
    @PostMapping("/sync-khoach-for")
    public ResponseEntity<?> syncFromKhoachFor(
            @RequestParam String maBravo,
            @RequestParam String maDonHang,
            Authentication auth) {
        DonHangDto result = service.syncFromKhoachFor(maBravo, maDonHang, auth.getName());
        if (result == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(result);
    }
}
