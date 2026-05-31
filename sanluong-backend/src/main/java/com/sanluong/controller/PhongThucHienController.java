package com.sanluong.controller;

import com.sanluong.entity.PhongThucHien;
import com.sanluong.repository.PhongThucHienRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/phong-thuc-hien")
public class PhongThucHienController {

    private final PhongThucHienRepository repo;

    public PhongThucHienController(PhongThucHienRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public ResponseEntity<List<PhongThucHien>> getAll() {
        return ResponseEntity.ok(repo.findAllSorted());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        String ten = body.get("ten") != null ? body.get("ten").toString().trim() : null;
        if (ten == null || ten.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Tên phòng không được trống"));
        if (repo.existsByTenIgnoreCase(ten))
            return ResponseEntity.badRequest().body(Map.of("message", "Phòng \"" + ten + "\" đã tồn tại"));
        Integer sortOrder = body.get("sortOrder") != null
                ? Integer.parseInt(body.get("sortOrder").toString()) : null;
        PhongThucHien p = new PhongThucHien(ten, sortOrder);
        return ResponseEntity.status(HttpStatus.CREATED).body(repo.save(p));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        PhongThucHien p = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ID: " + id));
        String ten = body.get("ten") != null ? body.get("ten").toString().trim() : null;
        if (ten == null || ten.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Tên phòng không được trống"));
        if (!p.getTen().equalsIgnoreCase(ten) && repo.existsByTenIgnoreCase(ten))
            return ResponseEntity.badRequest().body(Map.of("message", "Phòng \"" + ten + "\" đã tồn tại"));
        p.setTen(ten);
        if (body.get("sortOrder") != null)
            p.setSortOrder(Integer.parseInt(body.get("sortOrder").toString()));
        return ResponseEntity.ok(repo.save(p));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
