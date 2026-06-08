package com.sanluong.controller;

import com.sanluong.dto.LenhFieldHistoryDto;
import com.sanluong.dto.LenhLoHistoryDto;
import com.sanluong.dto.LenhSanXuatDto;
import com.sanluong.service.LenhSanXuatService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/lenh-san-xuat")
public class LenhSanXuatController {

    private final LenhSanXuatService service;

    public LenhSanXuatController(LenhSanXuatService service) {
        this.service = service;
    }

    @GetMapping("/chua-co-lenh")
    public ResponseEntity<List<java.util.Map<String, Object>>> getChuaCoLenh() {
        return ResponseEntity.ok(service.findPlanWithoutLenh());
    }

    @GetMapping("/by-product")
    public ResponseEntity<List<LenhSanXuatDto>> getByProduct(@RequestParam String maBravo) {
        return ResponseEntity.ok(service.findByMaBravo(maBravo));
    }

    @GetMapping
    public ResponseEntity<List<LenhSanXuatDto>> getAll(
            @RequestParam(required = false) String tinhTrang,
            @RequestParam(required = false) String toThucHien,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        java.time.LocalDate from = fromDate != null ? java.time.LocalDate.parse(fromDate) : null;
        java.time.LocalDate to   = toDate   != null ? java.time.LocalDate.parse(toDate)   : null;
        return ResponseEntity.ok(service.findAll(tinhTrang, toThucHien, from, to));
    }

    @PostMapping
    public ResponseEntity<LenhSanXuatDto> create(@RequestBody LenhSanXuatDto dto, Authentication auth) {
        return ResponseEntity.ok(service.create(dto, auth.getName()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LenhSanXuatDto> update(@PathVariable Long id,
                                                  @RequestBody LenhSanXuatDto dto,
                                                  Authentication auth) {
        return ResponseEntity.ok(service.update(id, dto, auth.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        service.delete(id, auth.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/trash")
    public ResponseEntity<List<LenhSanXuatDto>> getTrash() {
        return ResponseEntity.ok(service.findTrash());
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<LenhSanXuatDto> restore(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(service.restore(id, auth.getName()));
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> deletePermanent(@PathVariable Long id) {
        service.deletePermanent(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/bulk")
    public ResponseEntity<Map<String, Integer>> bulkDelete(@RequestBody List<Long> ids, Authentication auth) {
        int deleted = service.bulkDelete(ids, auth.getName());
        return ResponseEntity.ok(Map.of("deleted", deleted));
    }

    @GetMapping("/{id}/doi-lo/preview")
    public ResponseEntity<Map<String, Object>> previewDoiLo(@PathVariable Long id) {
        return ResponseEntity.ok(service.previewDoiLo(id));
    }

    @GetMapping("/doi-lo-history")
    public ResponseEntity<List<com.sanluong.dto.LenhLoHistoryDto>> doiLoHistoryByKey(
            @RequestParam(required = false) String maDonHang,
            @RequestParam(required = false) String soLo) {
        return ResponseEntity.ok(service.getDoiLoHistoryByKey(maDonHang, soLo));
    }

    @PostMapping("/{id}/doi-lo")
    public ResponseEntity<LenhSanXuatDto> doiLo(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        String soLoMoi = body.get("soLoMoi");
        String lyDo    = body.get("lyDo");
        return ResponseEntity.ok(service.doiLo(id, soLoMoi, lyDo, auth.getName()));
    }

    @GetMapping("/{id}/lich-su-doi-lo")
    public ResponseEntity<List<LenhLoHistoryDto>> lichSuDoiLo(@PathVariable Long id) {
        return ResponseEntity.ok(service.getLichSuDoiLo(id));
    }

    @PostMapping("/{id}/doi-field")
    public ResponseEntity<LenhSanXuatDto> doiField(
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

    @GetMapping("/{id}/field-history")
    public ResponseEntity<List<LenhFieldHistoryDto>> getFieldHistory(
            @PathVariable Long id,
            @RequestParam(required = false) String field) {
        return ResponseEntity.ok(service.getFieldHistory(id, field));
    }

    @GetMapping("/pending-sync-count")
    public ResponseEntity<Map<String, Integer>> pendingSyncCount() {
        return ResponseEntity.ok(Map.of("count", service.countPendingSync()));
    }

    @PostMapping("/sync-san-luong")
    public ResponseEntity<Map<String, Integer>> syncSanLuong(Authentication auth) {
        int created = service.syncAllSanLuong(auth.getName());
        return ResponseEntity.ok(Map.of("created", created));
    }

    @PostMapping("/from-work-schedule/{workScheduleId}")
    public ResponseEntity<LenhSanXuatDto> createFromWorkSchedule(
            @PathVariable Long workScheduleId,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {
        String soLo = (body != null) ? body.get("soLo") : null;
        LenhSanXuatDto dto = service.createFromWorkSchedule(workScheduleId, soLo, auth.getName());
        return dto != null ? ResponseEntity.ok(dto) : ResponseEntity.noContent().build();
    }
}
