package com.sanluong.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sanluong.entity.ToLenhSanXuat;
import com.sanluong.repository.ToLenhSanXuatRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/lsx/to-lenh")
public class ToLenhSanXuatController {

    private final ToLenhSanXuatRepository repo;
    private final ObjectMapper objectMapper;

    public ToLenhSanXuatController(ToLenhSanXuatRepository repo, ObjectMapper objectMapper) {
        this.repo = repo;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/by-bravo")
    public ResponseEntity<?> getByBravo(@RequestParam String maBravo) {
        List<ToLenhSanXuat> list = repo.findByMaBravoOrderByUpdatedAtDesc(maBravo);
        if (list.isEmpty()) return ResponseEntity.noContent().build();
        ToLenhSanXuat entity = list.get(0);
        try {
            Map<String, Object> result = buildResult(entity);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Không thể đọc dữ liệu: " + e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> get(@RequestParam Long donHangId) {
        Optional<ToLenhSanXuat> opt = repo.findByDonHangId(donHangId);
        if (opt.isEmpty()) return ResponseEntity.noContent().build();
        try {
            return ResponseEntity.ok(buildResult(opt.get()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Không thể đọc dữ liệu: " + e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> save(@RequestBody Map<String, Object> body, Authentication auth) {
        try {
            Long donHangId = body.get("donHangId") != null
                ? Long.parseLong(body.get("donHangId").toString()) : null;
            String maBravo = (String) body.get("maBravo");

            if (donHangId == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Thiếu donHangId"));
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> header = (Map<String, Object>) body.get("header");
            Object nvlRaw   = body.get("nguyenVatLieu");
            Object baoBiRaw = body.get("baoBi");

            ToLenhSanXuat entity = repo.findByDonHangId(donHangId).orElse(new ToLenhSanXuat());
            entity.setDonHangId(donHangId);
            entity.setMaBravo(maBravo);
            entity.setUpdatedBy(auth != null ? auth.getName() : null);

            if (entity.getCreatedBy() == null && auth != null) {
                entity.setCreatedBy(auth.getName());
            }

            if (header != null) {
                entity.setTenSanPham(str(header, "tenSanPham"));
                entity.setMaTP(str(header, "maTP"));
                entity.setSoLuongPhaChe(str(header, "soLuongPhaChe"));
                entity.setQuyCach(str(header, "quyCach"));
                entity.setSoDangKy(str(header, "soDangKy"));
                entity.setHanDung(str(header, "hanDung"));
                entity.setSoLoSanXuat(str(header, "soLoSanXuat"));
                entity.setNgaySanXuat(str(header, "ngaySanXuat"));
                entity.setHanSuDung(str(header, "hanSuDung"));
                entity.setLuuY(str(header, "luuY"));
                entity.setMaDonHang(str(header, "maDonHang"));
            }

            entity.setNguyenVatLieuJson(nvlRaw   != null ? objectMapper.writeValueAsString(nvlRaw)   : "[]");
            entity.setBaoBiJson(baoBiRaw != null ? objectMapper.writeValueAsString(baoBiRaw) : "[]");

            ToLenhSanXuat saved = repo.save(entity);
            return ResponseEntity.ok(Map.of(
                "id",        saved.getId(),
                "updatedAt", saved.getUpdatedAt(),
                "updatedBy", saved.getUpdatedBy() != null ? saved.getUpdatedBy() : ""
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Lưu thất bại: " + e.getMessage()));
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> buildResult(ToLenhSanXuat entity) throws Exception {
        Map<String, Object> result = new HashMap<>();
        result.put("id",        entity.getId());
        result.put("donHangId", entity.getDonHangId());
        result.put("maBravo",   entity.getMaBravo());
        result.put("updatedAt", entity.getUpdatedAt());
        result.put("updatedBy", entity.getUpdatedBy());

        Map<String, Object> header = new HashMap<>();
        header.put("tenSanPham",    entity.getTenSanPham());
        header.put("maTP",          entity.getMaTP());
        header.put("soLuongPhaChe", entity.getSoLuongPhaChe());
        header.put("quyCach",       entity.getQuyCach());
        header.put("soDangKy",      entity.getSoDangKy());
        header.put("hanDung",       entity.getHanDung());
        header.put("soLoSanXuat",   entity.getSoLoSanXuat());
        header.put("ngaySanXuat",   entity.getNgaySanXuat());
        header.put("hanSuDung",     entity.getHanSuDung());
        header.put("luuY",          entity.getLuuY());
        header.put("maDonHang",     entity.getMaDonHang());
        result.put("header", header);

        result.put("nguyenVatLieu", entity.getNguyenVatLieuJson() != null
            ? objectMapper.readValue(entity.getNguyenVatLieuJson(), List.class) : List.of());
        result.put("baoBi", entity.getBaoBiJson() != null
            ? objectMapper.readValue(entity.getBaoBiJson(), List.class) : List.of());

        return result;
    }

    private String str(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v != null ? v.toString() : null;
    }
}
