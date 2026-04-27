package com.sanluong.controller;

import com.sanluong.dto.SlChangeRequestDto;
import com.sanluong.entity.SlChangeRequest;
import com.sanluong.service.SlChangeRequestService;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sl-change-request")
public class SlChangeRequestController {

    private final SlChangeRequestService service;

    public SlChangeRequestController(SlChangeRequestService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<SlChangeRequest> create(
            @RequestBody SlChangeRequestDto dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(dto, userDetails.getUsername()));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<SlChangeRequest>> getPending() {
        return ResponseEntity.ok(service.getPending());
    }

    @GetMapping("/for-schedule/{workScheduleId}")
    public ResponseEntity<List<SlChangeRequest>> getForSchedule(
            @PathVariable Long workScheduleId) {
        return ResponseEntity.ok(service.getForSchedule(workScheduleId));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<SlChangeRequest> approve(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(service.approve(id, userDetails.getUsername()));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<SlChangeRequest> reject(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        String note = body != null ? body.get("note") : null;
        return ResponseEntity.ok(service.reject(id, userDetails.getUsername(), note));
    }
}
