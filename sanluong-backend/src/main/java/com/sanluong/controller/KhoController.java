package com.sanluong.controller;

import com.sanluong.dto.KhoChuyenRequest;
import com.sanluong.dto.KhoKiemKeRequest;
import com.sanluong.dto.KhoNhapRequest;
import com.sanluong.dto.KhoXuatConfirmRequest;
import com.sanluong.entity.KhoNhatKy;
import com.sanluong.entity.KhoTon;
import com.sanluong.entity.KhoViTri;
import com.sanluong.service.KhoService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/kho")
public class KhoController {

    private final KhoService service;

    public KhoController(KhoService service) {
        this.service = service;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> dashboard() {
        return ResponseEntity.ok(service.getDashboard());
    }

    @GetMapping("/log")
    public ResponseEntity<List<KhoNhatKy>> log(@RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(service.getLog(limit));
    }

    @GetMapping("/vi-tri")
    public ResponseEntity<List<KhoViTri>> listViTri() {
        return ResponseEntity.ok(service.listViTri());
    }

    @GetMapping("/vi-tri/usage")
    public ResponseEntity<List<Map<String, Object>>> viTriUsage() {
        return ResponseEntity.ok(service.listViTriWithUsage());
    }

    @GetMapping("/vi-tri/{ma}/items")
    public ResponseEntity<List<KhoTon>> itemsAtLocation(@PathVariable String ma) {
        return ResponseEntity.ok(service.itemsAtLocation(ma));
    }

    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> search(@RequestParam(required = false) String q) {
        return ResponseEntity.ok(service.search(q));
    }

    @GetMapping("/detail")
    public ResponseEntity<List<KhoTon>> detail(@RequestParam String maHang) {
        return ResponseEntity.ok(service.detail(maHang));
    }

    @PostMapping("/nhap")
    public ResponseEntity<KhoTon> nhap(@RequestBody KhoNhapRequest req, Authentication auth) {
        return ResponseEntity.ok(service.nhapKho(
                req.getMaHang(), req.getTenHang(), req.getViTri(), req.getSoLo(),
                req.getHanDung(), req.getSoLuong(), req.getDvt(), auth.getName()));
    }

    @GetMapping("/xuat-plan")
    public ResponseEntity<Map<String, Object>> xuatPlan(@RequestParam String maHang, @RequestParam int soLuong) {
        return ResponseEntity.ok(service.xuatPlan(maHang, soLuong));
    }

    @PostMapping("/xuat-confirm")
    public ResponseEntity<Map<String, Object>> xuatConfirm(@RequestBody KhoXuatConfirmRequest req, Authentication auth) {
        int taken = service.xuatConfirm(req.getMaHang(), req.getSoLuong(), auth.getName());
        return ResponseEntity.ok(Map.of("taken", taken));
    }

    @PostMapping("/chuyen")
    public ResponseEntity<KhoTon> chuyen(@RequestBody KhoChuyenRequest req, Authentication auth) {
        return ResponseEntity.ok(service.chuyenO(req.getStockId(), req.getViTriDich(), auth.getName()));
    }

    @PostMapping("/kiem-ke")
    public ResponseEntity<Map<String, Object>> kiemKe(@RequestBody KhoKiemKeRequest req, Authentication auth) {
        return ResponseEntity.ok(service.kiemKe(req, auth.getName()));
    }
}
