package com.sanluong.controller;

import com.sanluong.dto.HangLoiDto;
import com.sanluong.dto.HangLoiNgayDto;
import com.sanluong.entity.HangLoi;
import com.sanluong.entity.HangLoiNgay;
import com.sanluong.service.HangLoiService;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/hang-loi")
public class HangLoiController {

    private final HangLoiService service;

    public HangLoiController(HangLoiService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<HangLoi>> search(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String trangThai,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(service.search(fromDate, toDate, keyword, trangThai, page, size));
    }

    /**
     * Batch summary: nhận list {maTp, soLo}, trả về map key="{maTp}_{soLo}" → aggregated HangLoi data
     * Body: [ {"maTp": "TP308", "soLo": "090526"}, ... ]
     */
    @PostMapping("/batch-summary")
    public ResponseEntity<Map<String, Map<String, Object>>> batchSummary(
            @RequestBody List<Map<String, String>> pairs) {
        List<String> maTps = pairs.stream().map(p -> p.get("maTp")).filter(s -> s != null && !s.isBlank()).toList();
        List<String> soLos = pairs.stream().map(p -> p.get("soLo")).filter(s -> s != null && !s.isBlank()).toList();
        return ResponseEntity.ok(service.batchSummary(maTps, soLos));
    }

    @GetMapping("/by-product")
    public ResponseEntity<List<HangLoi>> getByProduct(
            @RequestParam String maTp,
            @RequestParam String soLo) {
        return ResponseEntity.ok(service.getByProduct(maTp, soLo));
    }

    /** Đếm hàng lỗi chưa có trạng thái xử lý — dùng cho WorkChecklistWidget */
    @GetMapping("/count-chua-xu-ly")
    public ResponseEntity<Long> countChuaXuLy() {
        return ResponseEntity.ok(service.countChuaXuLy());
    }

    @GetMapping("/exists")
    public ResponseEntity<Boolean> exists(
            @RequestParam String mtpCoMem,
            @RequestParam(required = false) String tenHangHoa,
            @RequestParam(required = false) String soLo) {
        return ResponseEntity.ok(service.existsByTriplet(mtpCoMem, tenHangHoa, soLo));
    }

    @PutMapping("/bulk-huong")
    public ResponseEntity<Integer> bulkHuong(
            @RequestParam String maBravo,
            @RequestParam String soLo,
            @RequestParam(required = false) String huongXuLy) {
        return ResponseEntity.ok(service.bulkUpdateHuongXuLy(maBravo, soLo, huongXuLy));
    }

    @PostMapping
    public ResponseEntity<HangLoi> create(@RequestBody HangLoiDto dto, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto, auth.getName()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<HangLoi> update(@PathVariable Long id, @RequestBody HangLoiDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── HangLoiNgay endpoints ─────────────────────────────────────────────────

    @GetMapping("/{hangLoiId}/ngay")
    public ResponseEntity<List<HangLoiNgay>> listNgay(@PathVariable Long hangLoiId) {
        return ResponseEntity.ok(service.getNgayByHangLoi(hangLoiId));
    }

    @PostMapping("/{hangLoiId}/ngay")
    public ResponseEntity<HangLoiNgay> createNgay(@PathVariable Long hangLoiId,
                                                    @RequestBody HangLoiNgayDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createNgay(hangLoiId, dto));
    }

    @PutMapping("/{hangLoiId}/ngay/{ngayId}")
    public ResponseEntity<HangLoiNgay> updateNgay(@PathVariable Long hangLoiId,
                                                    @PathVariable Long ngayId,
                                                    @RequestBody HangLoiNgayDto dto) {
        return ResponseEntity.ok(service.updateNgay(hangLoiId, ngayId, dto));
    }

    @DeleteMapping("/{hangLoiId}/ngay/{ngayId}")
    public ResponseEntity<Void> deleteNgay(@PathVariable Long hangLoiId,
                                            @PathVariable Long ngayId) {
        service.deleteNgay(hangLoiId, ngayId);
        return ResponseEntity.noContent().build();
    }
}
