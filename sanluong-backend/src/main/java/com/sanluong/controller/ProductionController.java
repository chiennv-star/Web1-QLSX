package com.sanluong.controller;

import com.sanluong.dto.ProductionRecordDto;
import com.sanluong.entity.ProductionRecord;
import com.sanluong.service.ProductionService;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/production")
public class ProductionController {

    private final ProductionService productionService;

    public ProductionController(ProductionService productionService) {
        this.productionService = productionService;
    }

    @GetMapping
    public ResponseEntity<Page<ProductionRecord>> search(
            @RequestParam(required = false) String maTp,
            @RequestParam(required = false) String maBravo,
            @RequestParam(required = false) String tienTrinh,
            @RequestParam(required = false) String lsx,
            @RequestParam(required = false) String trangThai,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(productionService.search(maTp, maBravo, tienTrinh, lsx, trangThai, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductionRecord> getById(@PathVariable Long id) {
        return ResponseEntity.ok(productionService.getById(id));
    }

    @PostMapping
    public ResponseEntity<ProductionRecord> create(@RequestBody ProductionRecordDto dto,
                                                    Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(productionService.create(dto, auth.getName()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductionRecord> update(@PathVariable Long id,
                                                    @RequestBody ProductionRecordDto dto,
                                                    Authentication auth) {
        return ResponseEntity.ok(productionService.update(id, dto, auth.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        productionService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/wip-dg")
    public ResponseEntity<List<ProductionRecord>> getWipDg() {
        return ResponseEntity.ok(productionService.getWipDg());
    }

    @GetMapping("/wip-pc")
    public ResponseEntity<List<ProductionRecord>> getWipPc() {
        return ResponseEntity.ok(productionService.getWipPc());
    }

    @GetMapping("/wip-pl")
    public ResponseEntity<List<ProductionRecord>> getWipPl() {
        return ResponseEntity.ok(productionService.getWipPl());
    }

    @GetMapping("/wip-bbc1")
    public ResponseEntity<List<ProductionRecord>> getWipBbc1() {
        return ResponseEntity.ok(productionService.getWipBbc1());
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(required = false) String maTp,
            @RequestParam(required = false) String maBravo,
            @RequestParam(required = false) String tienTrinh,
            @RequestParam(required = false) String lsx,
            @RequestParam(required = false) String trangThai) throws IOException {
        byte[] data = productionService.exportExcel(maTp, maBravo, tienTrinh, lsx, trangThai);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=sanluong.xlsx")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }
}
