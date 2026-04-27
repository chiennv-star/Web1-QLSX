package com.sanluong.controller;

import com.sanluong.dto.ProductMasterDto;
import com.sanluong.entity.ProductMaster;
import com.sanluong.service.ProductMasterService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/product-master")
public class ProductMasterController {

    private final ProductMasterService service;

    public ProductMasterController(ProductMasterService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<ProductMaster>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.search(keyword, page, size));
    }

    // Endpoint tìm theo Mã TP để auto-fill form
    @GetMapping("/lookup/{maTp}")
    public ResponseEntity<?> lookup(@PathVariable String maTp) {
        return service.findByMaTp(maTp)
                .map(p -> {
                    java.util.Map<String, Object> body = new java.util.LinkedHashMap<>();
                    body.put("maBravo",      p.getMaBravo()      != null ? p.getMaBravo()      : "");
                    body.put("tienTrinh",    p.getTienTrinh()    != null ? p.getTienTrinh()    : "");
                    body.put("slTrungBinh",  p.getSlTrungBinh()  != null ? p.getSlTrungBinh()  : java.math.BigDecimal.ONE);
                    body.put("nangSuatPc",   p.getNangSuatPc()   != null ? p.getNangSuatPc()   : java.math.BigDecimal.ONE);
                    body.put("nangSuatPl",   p.getNangSuatPl()   != null ? p.getNangSuatPl()   : java.math.BigDecimal.ONE);
                    body.put("nangSuatBbc1", p.getNangSuatBbc1() != null ? p.getNangSuatBbc1() : java.math.BigDecimal.ONE);
                    body.put("mayMocPc",    p.getMayMocPc()    != null ? p.getMayMocPc()    : "");
                    body.put("mayMocPl",    p.getMayMocPl()    != null ? p.getMayMocPl()    : "");
                    body.put("mayMocBbc1",  p.getMayMocBbc1()  != null ? p.getMayMocBbc1()  : "");
                    body.put("mayMocDg",    p.getMayMocDg()    != null ? p.getMayMocDg()    : "");
                    return ResponseEntity.ok((Object) body);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ProductMaster> create(@Valid @RequestBody ProductMasterDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductMaster> update(@PathVariable Long id,
                                                 @Valid @RequestBody ProductMasterDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
