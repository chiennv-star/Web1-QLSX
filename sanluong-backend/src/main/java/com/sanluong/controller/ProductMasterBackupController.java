package com.sanluong.controller;

import com.sanluong.entity.ProductMasterBackup;
import com.sanluong.service.ProductMasterBackupService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/product-master-backup")
public class ProductMasterBackupController {

    private final ProductMasterBackupService service;

    public ProductMasterBackupController(ProductMasterBackupService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<ProductMasterBackup>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.search(keyword, page, size));
    }

    @PostMapping("/snapshot")
    public ResponseEntity<java.util.Map<String, Object>> snapshot() {
        return ResponseEntity.ok(service.snapshot());
    }

    @PostMapping("/restore-to-master")
    public ResponseEntity<java.util.Map<String, Object>> restoreToMaster() {
        return ResponseEntity.ok(service.restoreToMaster());
    }
}
