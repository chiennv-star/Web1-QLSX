package com.sanluong.controller;

import com.sanluong.dto.FactoryPlanDto;
import com.sanluong.entity.FactoryPlan;
import com.sanluong.service.FactoryPlanService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/factory-plan")
public class FactoryPlanController {

    private final FactoryPlanService service;

    public FactoryPlanController(FactoryPlanService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<FactoryPlan>> getByWeek(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(service.getByWeek(from, to));
    }

    @PostMapping
    public ResponseEntity<FactoryPlan> create(
            @RequestBody FactoryPlanDto dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(dto, userDetails.getUsername()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FactoryPlan> update(
            @PathVariable Long id,
            @RequestBody FactoryPlanDto dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(service.update(id, dto, userDetails.getUsername()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
