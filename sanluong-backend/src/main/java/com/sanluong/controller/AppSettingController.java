package com.sanluong.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sanluong.entity.AppSetting;
import com.sanluong.repository.AppSettingRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/app-settings")
public class AppSettingController {

    private final AppSettingRepository repo;
    private final ObjectMapper mapper;

    public AppSettingController(AppSettingRepository repo, ObjectMapper mapper) {
        this.repo   = repo;
        this.mapper = mapper;
    }

    /** GET /api/app-settings/nhapkho-muctieu?year=2026 — tất cả xem */
    @GetMapping("/nhapkho-muctieu")
    public ResponseEntity<Map<String, Object>> get(@RequestParam int year) {
        long       mucTieu     = parseLong(valueOf("nhapkho_muctieu_" + year));
        Map<?, ?>  mucTieuThang = parseJson(valueOf("nhapkho_muctieu_thang_" + year));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("mucTieu",     mucTieu);
        result.put("mucTieuThang", mucTieuThang);
        return ResponseEntity.ok(result);
    }

    /** PUT /api/app-settings/nhapkho-muctieu?year=2026 — ADMIN_KH / TKSX / QUAN_DOC */
    @PutMapping("/nhapkho-muctieu")
    public ResponseEntity<?> put(@RequestParam int year,
                                  @RequestBody Map<String, Object> body,
                                  Principal principal) {
        String by = principal != null ? principal.getName() : "unknown";

        if (body.containsKey("mucTieu")) {
            save("nhapkho_muctieu_" + year, String.valueOf(toLong(body.get("mucTieu"))), by);
        }
        if (body.containsKey("mucTieuThang")) {
            try {
                save("nhapkho_muctieu_thang_" + year,
                     mapper.writeValueAsString(body.get("mucTieuThang")), by);
            } catch (JsonProcessingException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid mucTieuThang"));
            }
        }
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private String valueOf(String key) {
        return repo.findById(key).map(AppSetting::getValue).orElse(null);
    }

    private void save(String key, String value, String updatedBy) {
        AppSetting s = repo.findById(key).orElse(new AppSetting());
        s.setKey(key);
        s.setValue(value);
        s.setUpdatedBy(updatedBy);
        s.setUpdatedAt(LocalDateTime.now());
        repo.save(s);
    }

    private long parseLong(String s) {
        if (s == null) return 0L;
        try { return Long.parseLong(s); } catch (Exception e) { return 0L; }
    }

    @SuppressWarnings("unchecked")
    private Map<?, ?> parseJson(String s) {
        if (s == null) return Map.of();
        try { return mapper.readValue(s, Map.class); } catch (Exception e) { return Map.of(); }
    }

    private long toLong(Object o) {
        if (o instanceof Number) return ((Number) o).longValue();
        try { return Long.parseLong(String.valueOf(o)); } catch (Exception e) { return 0L; }
    }
}
