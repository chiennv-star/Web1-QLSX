package com.sanluong.controller;

import com.sanluong.entity.LenhSanXuatAnh;
import com.sanluong.repository.LenhSanXuatAnhRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/lsx/anh")
public class LenhSanXuatAnhController {

    private final LenhSanXuatAnhRepository repo;

    public LenhSanXuatAnhController(LenhSanXuatAnhRepository repo) {
        this.repo = repo;
    }

    /** Upload ảnh cho một đơn hàng */
    @PostMapping("/upload")
    public ResponseEntity<?> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam Long donHangId,
            @RequestParam(required = false) String maDonHang,
            Authentication auth) {
        try {
            LenhSanXuatAnh anh = new LenhSanXuatAnh();
            anh.setDonHangId(donHangId);
            anh.setMaDonHang(maDonHang);
            anh.setTenFile(file.getOriginalFilename() != null ? file.getOriginalFilename() : "anh.jpg");
            anh.setContentType(file.getContentType());
            anh.setFileData(file.getBytes());
            anh.setUploadedBy(auth != null ? auth.getName() : null);
            return ResponseEntity.ok(toMeta(repo.save(anh)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Upload thất bại: " + e.getMessage()));
        }
    }

    /** Danh sách ảnh của một đơn hàng (không trả fileData) */
    @GetMapping("/by-don-hang")
    public ResponseEntity<List<Map<String, Object>>> listByDonHang(@RequestParam Long donHangId) {
        return ResponseEntity.ok(
            repo.findByDonHangIdOrderByUploadedAtDesc(donHangId)
                .stream().map(this::toMeta).collect(Collectors.toList())
        );
    }

    /** Trả dữ liệu ảnh binary */
    @GetMapping("/{id}/data")
    public ResponseEntity<byte[]> getData(@PathVariable Long id) {
        return repo.findById(id).map(anh -> {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(anh.getContentType() != null
                ? MediaType.parseMediaType(anh.getContentType()) : MediaType.IMAGE_JPEG);
            return ResponseEntity.ok().headers(headers).body(anh.getFileData());
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Đổi tên file */
    @PatchMapping("/{id}/rename")
    public ResponseEntity<?> rename(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String newName = body.get("tenFile");
        if (newName == null || newName.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Tên không được để trống"));
        return repo.findById(id).map(anh -> {
            anh.setTenFile(newName.trim());
            return ResponseEntity.ok((Object) toMeta(repo.save(anh)));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Xoá ảnh */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> toMeta(LenhSanXuatAnh a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",          a.getId());
        m.put("donHangId",   a.getDonHangId());
        m.put("maDonHang",   a.getMaDonHang());
        m.put("tenFile",     a.getTenFile());
        m.put("contentType", a.getContentType());
        m.put("uploadedAt",  a.getUploadedAt());
        m.put("uploadedBy",  a.getUploadedBy());
        return m;
    }
}
