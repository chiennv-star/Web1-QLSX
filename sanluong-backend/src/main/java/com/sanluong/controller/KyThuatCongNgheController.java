package com.sanluong.controller;

import com.sanluong.dto.*;
import com.sanluong.entity.*;
import com.sanluong.service.KyThuatCongNgheService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ky-thuat")
public class KyThuatCongNgheController {

    private final KyThuatCongNgheService service;

    public KyThuatCongNgheController(KyThuatCongNgheService service) {
        this.service = service;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> dashboard() {
        return ResponseEntity.ok(service.getDashboard());
    }

    // ── Cơ điện ──────────────────────────────────────────────────────────────
    @GetMapping("/co-dien")
    public ResponseEntity<List<KyThuatCoDien>> listCoDien() {
        return ResponseEntity.ok(service.listCoDien());
    }

    @PostMapping("/co-dien")
    public ResponseEntity<KyThuatCoDien> createCoDien(@RequestBody KyThuatCoDienDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createCoDien(dto));
    }

    @PutMapping("/co-dien/{id}")
    public ResponseEntity<KyThuatCoDien> updateCoDien(@PathVariable Long id, @RequestBody KyThuatCoDienDto dto) {
        return ResponseEntity.ok(service.updateCoDien(id, dto));
    }

    @DeleteMapping("/co-dien/{id}")
    public ResponseEntity<Void> deleteCoDien(@PathVariable Long id) {
        service.deleteCoDien(id);
        return ResponseEntity.noContent().build();
    }

    // ── Kỹ thuật ─────────────────────────────────────────────────────────────
    @GetMapping("/ky-thuat")
    public ResponseEntity<List<KyThuatKyThuat>> listKyThuat() {
        return ResponseEntity.ok(service.listKyThuat());
    }

    @PostMapping("/ky-thuat")
    public ResponseEntity<KyThuatKyThuat> createKyThuat(@RequestBody KyThuatKyThuatDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createKyThuat(dto));
    }

    @PutMapping("/ky-thuat/{id}")
    public ResponseEntity<KyThuatKyThuat> updateKyThuat(@PathVariable Long id, @RequestBody KyThuatKyThuatDto dto) {
        return ResponseEntity.ok(service.updateKyThuat(id, dto));
    }

    @DeleteMapping("/ky-thuat/{id}")
    public ResponseEntity<Void> deleteKyThuat(@PathVariable Long id) {
        service.deleteKyThuat(id);
        return ResponseEntity.noContent().build();
    }

    // ── Thử việc ─────────────────────────────────────────────────────────────
    @GetMapping("/thu-viec")
    public ResponseEntity<List<KyThuatThuViec>> listThuViec() {
        return ResponseEntity.ok(service.listThuViec());
    }

    @PostMapping("/thu-viec")
    public ResponseEntity<KyThuatThuViec> createThuViec(@RequestBody KyThuatThuViecDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createThuViec(dto));
    }

    @PutMapping("/thu-viec/{id}")
    public ResponseEntity<KyThuatThuViec> updateThuViec(@PathVariable Long id, @RequestBody KyThuatThuViecDto dto) {
        return ResponseEntity.ok(service.updateThuViec(id, dto));
    }

    @DeleteMapping("/thu-viec/{id}")
    public ResponseEntity<Void> deleteThuViec(@PathVariable Long id) {
        service.deleteThuViec(id);
        return ResponseEntity.noContent().build();
    }

    // ── Bảo trì ──────────────────────────────────────────────────────────────
    @GetMapping("/bao-tri")
    public ResponseEntity<List<KyThuatBaoTri>> listBaoTri() {
        return ResponseEntity.ok(service.listBaoTri());
    }

    @PostMapping("/bao-tri")
    public ResponseEntity<KyThuatBaoTri> createBaoTri(@RequestBody KyThuatBaoTriDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createBaoTri(dto));
    }

    @PutMapping("/bao-tri/{id}")
    public ResponseEntity<KyThuatBaoTri> updateBaoTri(@PathVariable Long id, @RequestBody KyThuatBaoTriDto dto) {
        return ResponseEntity.ok(service.updateBaoTri(id, dto));
    }

    @DeleteMapping("/bao-tri/{id}")
    public ResponseEntity<Void> deleteBaoTri(@PathVariable Long id) {
        service.deleteBaoTri(id);
        return ResponseEntity.noContent().build();
    }

    // ── Kaizen ───────────────────────────────────────────────────────────────
    @GetMapping("/kaizen")
    public ResponseEntity<List<KyThuatKaizen>> listKaizen() {
        return ResponseEntity.ok(service.listKaizen());
    }

    @PostMapping("/kaizen")
    public ResponseEntity<KyThuatKaizen> createKaizen(@RequestBody KyThuatKaizenDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createKaizen(dto));
    }

    @PutMapping("/kaizen/{id}")
    public ResponseEntity<KyThuatKaizen> updateKaizen(@PathVariable Long id, @RequestBody KyThuatKaizenDto dto) {
        return ResponseEntity.ok(service.updateKaizen(id, dto));
    }

    @DeleteMapping("/kaizen/{id}")
    public ResponseEntity<Void> deleteKaizen(@PathVariable Long id) {
        service.deleteKaizen(id);
        return ResponseEntity.noContent().build();
    }
}
