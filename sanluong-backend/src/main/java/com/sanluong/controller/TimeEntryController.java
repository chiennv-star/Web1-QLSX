package com.sanluong.controller;

import com.sanluong.entity.TimeEntry;
import com.sanluong.repository.TimeEntryRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/attendance/time-entries")
public class TimeEntryController {

    private final TimeEntryRepository repo;

    public TimeEntryController(TimeEntryRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public ResponseEntity<List<TimeEntry>> list(
            @RequestParam(required = false) String maNhanVien,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        if (maNhanVien != null && !maNhanVien.isBlank())
            return ResponseEntity.ok(repo.findByMaNhanVienAndRange(maNhanVien, fromDate, toDate));
        return ResponseEntity.ok(repo.findByRange(fromDate, toDate));
    }

    @PostMapping
    public ResponseEntity<TimeEntry> create(@RequestBody TimeEntry body) {
        body.setId(null);
        return ResponseEntity.ok(repo.save(body));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable long id, @RequestBody TimeEntry body) {
        return repo.findById(id).map(e -> {
            e.setNgay(body.getNgay());
            e.setGioVao(body.getGioVao());
            e.setGioRa(body.getGioRa());
            e.setCaThucHien(body.getCaThucHien());
            e.setGhiChu(body.getGhiChu());
            return ResponseEntity.ok(repo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.ok(Map.of("deleted", id));
    }

    /** Bulk upsert — upsert theo (maNhanVien + ngay). Trả về số bản ghi tạo mới và cập nhật. */
    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importEntries(@RequestBody List<TimeEntry> entries) {
        int created = 0, updated = 0;
        for (TimeEntry e : entries) {
            if (e.getMaNhanVien() == null || e.getNgay() == null) continue;
            var existing = repo.findByMaNhanVienAndNgay(e.getMaNhanVien(), e.getNgay());
            if (existing.isPresent()) {
                TimeEntry upd = existing.get();
                upd.setGioVao(e.getGioVao());
                upd.setGioRa(e.getGioRa());
                upd.setCaThucHien(e.getCaThucHien());
                upd.setGhiChu(e.getGhiChu());
                repo.save(upd);
                updated++;
            } else {
                e.setId(null);
                repo.save(e);
                created++;
            }
        }
        Map<String, Object> result = new HashMap<>();
        result.put("created", created);
        result.put("updated", updated);
        return ResponseEntity.ok(result);
    }
}
