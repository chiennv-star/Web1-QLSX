package com.sanluong.controller;

import com.sanluong.dto.ProductMasterDto;
import com.sanluong.entity.ProductMaster;
import com.sanluong.service.ProductMasterService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/product-master")
public class ProductMasterController {

    private final ProductMasterService service;

    public ProductMasterController(ProductMasterService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<ProductMaster>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String toNhomPcpl,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.search(keyword, toNhomPcpl, page, size));
    }

    private Map<String, Object> buildLookupBody(ProductMaster p) {
        java.util.Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("maTp",         p.getMaTp()         != null ? p.getMaTp()         : "");
        body.put("maBravo",      p.getMaBravo()      != null ? p.getMaBravo()      : "");
        body.put("tienTrinh",    p.getTienTrinh()    != null ? p.getTienTrinh()    : "");
        body.put("slTrungBinh",  p.getSlTrungBinh()  != null ? p.getSlTrungBinh()  : java.math.BigDecimal.ONE);
        body.put("nangSuatPc",   p.getNangSuatPc()   != null ? p.getNangSuatPc()   : java.math.BigDecimal.ONE);
        body.put("nangSuatPl",   p.getNangSuatPl()   != null ? p.getNangSuatPl()   : java.math.BigDecimal.ONE);
        body.put("nangSuatBbc1", p.getNangSuatBbc1() != null ? p.getNangSuatBbc1() : java.math.BigDecimal.ONE);
        body.put("nangSuatDg",   p.getNangSuatDg()   != null ? p.getNangSuatDg()   : null);
        body.put("khoiLuong",    p.getKhoiLuong()    != null ? p.getKhoiLuong()    : null);
        body.put("mayMocPc",     p.getMayMocPc()     != null ? p.getMayMocPc()     : "");
        body.put("mayMocPl",     p.getMayMocPl()     != null ? p.getMayMocPl()     : "");
        body.put("mayMocBbc1",   p.getMayMocBbc1()   != null ? p.getMayMocBbc1()   : "");
        body.put("mayMocDg",     p.getMayMocDg()     != null ? p.getMayMocDg()     : "");
        body.put("toNhomPcpl",   p.getToNhomPcpl()   != null ? p.getToNhomPcpl()   : null);
        body.put("loaiSanPham",  p.getLoaiSanPham()  != null ? p.getLoaiSanPham()  : null);
        return body;
    }

    @GetMapping("/lookup-batch")
    public ResponseEntity<Map<String, Map<String, Object>>> lookupBatch(
            @RequestParam List<String> codes) {
        Map<String, Map<String, Object>> result = new java.util.LinkedHashMap<>();
        // Ưu tiên lookup theo maTp
        java.util.Set<String> matched = new java.util.HashSet<>();
        service.findByMaTpIn(codes).forEach(p -> {
            result.put(p.getMaTp(), buildLookupBody(p));
            matched.add(p.getMaTp().toUpperCase());
        });
        // Fallback: với các code chưa tìm được qua maTp, thử lookup theo maBravo
        List<String> notFound = codes.stream()
                .filter(c -> !matched.contains(c.toUpperCase()))
                .collect(java.util.stream.Collectors.toList());
        if (!notFound.isEmpty()) {
            java.util.Map<String, com.sanluong.entity.ProductMaster> byBravo = new java.util.HashMap<>();
            service.findByMaBravoIn(notFound).forEach(p -> {
                if (p.getMaBravo() != null) byBravo.putIfAbsent(p.getMaBravo().toUpperCase(), p);
            });
            notFound.forEach(code -> {
                com.sanluong.entity.ProductMaster p = byBravo.get(code.toUpperCase());
                if (p != null) result.put(code, buildLookupBody(p));
            });
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/lookup/{maTp}")
    public ResponseEntity<?> lookup(@PathVariable String maTp) {
        return service.findByMaTp(maTp)
                .map(p -> ResponseEntity.ok((Object) buildLookupBody(p)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/lookup-by-bravo/{maBravo}")
    public ResponseEntity<?> lookupByBravo(@PathVariable String maBravo) {
        return service.findByMaBravo(maBravo)
                .map(p -> ResponseEntity.ok((Object) buildLookupBody(p)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ProductMaster> create(@Valid @RequestBody ProductMasterDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductMaster> update(@PathVariable Long id,
                                                 @Valid @RequestBody ProductMasterDto dto,
                                                 Authentication auth) {
        String username = auth != null ? auth.getName() : "unknown";
        return ResponseEntity.ok(service.update(id, dto, username));
    }

    @PatchMapping("/{id}/to-nhom-pcpl")
    public ResponseEntity<?> patchToNhomPcpl(@PathVariable Long id,
                                              @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(service.patchToNhomPcpl(id, body.get("value")));
    }

    @PatchMapping("/{id}/loai-san-pham")
    public ResponseEntity<?> patchLoaiSanPham(@PathVariable Long id,
                                               @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(service.patchLoaiSanPham(id, body.get("value")));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<?> getHistory(@PathVariable Long id) {
        return ResponseEntity.ok(service.getHistory(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── Import 2 bước ──────────────────────────────────────────────────────

    /** Bước 1: Đọc Excel → trả preview, chưa ghi DB */
    @PostMapping("/import/preview")
    public ResponseEntity<?> importPreview(@RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(service.previewImport(file));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Bước 2: Xác nhận → ghi DB với danh sách dòng đã chọn */
    @PostMapping("/import/confirm")
    public ResponseEntity<?> importConfirm(
            @RequestBody List<Map<String, Object>> selectedRows,
            Authentication auth) {
        try {
            String username = auth != null ? auth.getName() : "unknown";
            return ResponseEntity.ok(service.confirmImport(selectedRows, username));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Đồng bộ / Khôi phục ───────────────────────────────────────────────

    @PostMapping("/sync-from-song-an")
    public ResponseEntity<Map<String, Object>> syncFromSongAn() {
        return ResponseEntity.ok(service.syncFromSongAn());
    }

    @PostMapping("/reset-sync")
    public ResponseEntity<Map<String, Object>> resetSync() {
        return ResponseEntity.ok(service.resetSyncFields());
    }

    @GetMapping("/loai-san-pham-distinct")
    public ResponseEntity<List<String>> getDistinctLoaiSanPham() {
        return ResponseEntity.ok(service.findDistinctLoaiSanPham());
    }

    @GetMapping("/count-no-bravo")
    public ResponseEntity<Map<String, Object>> countNoBravo() {
        return ResponseEntity.ok(service.countNoBravo());
    }

    @DeleteMapping("/bulk-no-bravo")
    public ResponseEntity<Map<String, Object>> deleteNoBravo() {
        return ResponseEntity.ok(service.deleteNoBravo());
    }

    // ── Cập nhật NS 2 bước ────────────────────────────────────────────────────

    @PostMapping("/update-ns/preview")
    public ResponseEntity<?> updateNsPreview(@RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(service.previewUpdateNs(file));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/update-ns/confirm")
    public ResponseEntity<?> updateNsConfirm(@RequestBody List<Map<String, Object>> selectedRows) {
        try {
            return ResponseEntity.ok(service.confirmUpdateNs(selectedRows));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Cập nhật Loại SP 2 bước ───────────────────────────────────────────────

    @PostMapping("/update-loai-sp/preview")
    public ResponseEntity<?> updateLoaiSpPreview(@RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(service.previewUpdateLoaiSp(file));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/update-loai-sp/confirm")
    public ResponseEntity<?> updateLoaiSpConfirm(@RequestBody List<Map<String, Object>> selectedRows) {
        try {
            return ResponseEntity.ok(service.confirmUpdateLoaiSp(selectedRows));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
