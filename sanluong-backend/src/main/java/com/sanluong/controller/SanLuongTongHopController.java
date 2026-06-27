package com.sanluong.controller;

import com.sanluong.entity.SanLuongTongHop;
import com.sanluong.service.SanLuongTongHopService;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/san-luong-tong-hop")
public class SanLuongTongHopController {

    private final SanLuongTongHopService service;

    public SanLuongTongHopController(SanLuongTongHopService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<SanLuongTongHop>> search(
            @RequestParam(required = false) String maBravo,
            @RequestParam(required = false) String maTp,
            @RequestParam(required = false) String lsx,
            @RequestParam(required = false) String loaiSanPham,
            @RequestParam(required = false) String toThucHien,
            @RequestParam(defaultValue = "0")    int page,
            @RequestParam(defaultValue = "100")  int size) {
        return ResponseEntity.ok(service.search(maBravo, maTp, lsx, loaiSanPham, toThucHien, page, size));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/bulk")
    public ResponseEntity<Map<String, Object>> deleteBulk(@RequestBody List<Long> ids) {
        int deleted = service.deleteBulk(ids);
        return ResponseEntity.ok(Map.of("deleted", deleted));
    }

    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate() throws IOException {
        byte[] data = service.generateTemplate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=mau_import_tong_hop_sl.xlsx")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }

    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importExcel(
            @RequestParam("file") MultipartFile file,
            Authentication auth) throws IOException {
        Map<String, Object> result = service.importFromExcel(file, auth.getName());
        return ResponseEntity.ok(result);
    }
}
