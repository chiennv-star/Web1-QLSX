package com.sanluong.controller;

import com.sanluong.dto.ProductMasterSongAnDto;
import com.sanluong.entity.ProductMasterSongAn;
import com.sanluong.service.ProductMasterSongAnService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/product-master-song-an")
public class ProductMasterSongAnController {

    private final ProductMasterSongAnService service;

    public ProductMasterSongAnController(ProductMasterSongAnService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<ProductMasterSongAn>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.search(keyword, page, size));
    }

    @PostMapping
    public ResponseEntity<ProductMasterSongAn> create(@Valid @RequestBody ProductMasterSongAnDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductMasterSongAn> update(@PathVariable Long id,
                                                       @Valid @RequestBody ProductMasterSongAnDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importExcel(
            @RequestParam("file") MultipartFile file) {
        try {
            Map<String, Object> result = service.importFromExcel(file);
            return ResponseEntity.ok(result);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }
}
