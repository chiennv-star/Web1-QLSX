package com.sanluong.controller;

import com.sanluong.dto.WorkScheduleSessionDto;
import com.sanluong.entity.WorkScheduleSession;
import com.sanluong.service.WorkScheduleSessionService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/work-schedule-session")
public class WorkScheduleSessionController {

    private final WorkScheduleSessionService service;

    public WorkScheduleSessionController(WorkScheduleSessionService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<WorkScheduleSession>> getByScheduleId(
            @RequestParam Long scheduleId) {
        return ResponseEntity.ok(service.getByScheduleId(scheduleId));
    }

    @PostMapping
    public ResponseEntity<WorkScheduleSession> create(@RequestBody WorkScheduleSessionDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorkScheduleSession> update(@PathVariable Long id,
                                                       @RequestBody WorkScheduleSessionDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
