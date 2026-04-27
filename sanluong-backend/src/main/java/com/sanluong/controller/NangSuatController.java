package com.sanluong.controller;

import com.sanluong.dto.NangSuatDto;
import com.sanluong.entity.NangSuat;
import com.sanluong.service.NangSuatService;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/nang-suat")
public class NangSuatController {

    private final NangSuatService service;

    public NangSuatController(NangSuatService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<NangSuat>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.search(keyword, page, size));
    }

    @PostMapping
    public ResponseEntity<NangSuat> create(@RequestBody NangSuatDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NangSuat> update(@PathVariable Long id,
                                            @RequestBody NangSuatDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
