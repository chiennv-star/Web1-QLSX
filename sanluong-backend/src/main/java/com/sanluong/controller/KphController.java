package com.sanluong.controller;

import com.sanluong.entity.KphRecord;
import com.sanluong.service.KphService;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/kph")
public class KphController {

    private final KphService service;

    public KphController(KphService service) {
        this.service = service;
    }

    @GetMapping("/by-work-schedule/{wsId}")
    public ResponseEntity<KphRecord> getByWorkScheduleId(@PathVariable Long wsId) {
        return service.findByWorkScheduleId(wsId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<KphRecord> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<KphRecord> create(@RequestBody KphRecord record, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(record, auth.getName()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<KphRecord> update(@PathVariable Long id,
                                             @RequestBody KphRecord record) {
        return ResponseEntity.ok(service.update(id, record));
    }
}
