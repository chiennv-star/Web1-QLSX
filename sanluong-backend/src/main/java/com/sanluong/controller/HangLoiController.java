package com.sanluong.controller;

import com.sanluong.dto.HangLoiDto;
import com.sanluong.entity.HangLoi;
import com.sanluong.service.HangLoiService;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/hang-loi")
public class HangLoiController {

    private final HangLoiService service;

    public HangLoiController(HangLoiService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<HangLoi>> search(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String trangThai,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(service.search(fromDate, toDate, keyword, trangThai, page, size));
    }

    @GetMapping("/exists")
    public ResponseEntity<Boolean> exists(
            @RequestParam String mtpCoMem,
            @RequestParam(required = false) String tenHangHoa,
            @RequestParam(required = false) String soLo) {
        return ResponseEntity.ok(service.existsByTriplet(mtpCoMem, tenHangHoa, soLo));
    }

    @PostMapping
    public ResponseEntity<HangLoi> create(@RequestBody HangLoiDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<HangLoi> update(@PathVariable Long id, @RequestBody HangLoiDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
