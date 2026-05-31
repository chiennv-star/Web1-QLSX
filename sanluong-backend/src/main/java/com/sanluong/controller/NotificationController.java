package com.sanluong.controller;

import com.sanluong.dto.NotificationDto;
import com.sanluong.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<NotificationDto>> getAll(Authentication auth) {
        return ResponseEntity.ok(service.findAll(auth.getName(), getRole(auth)));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(Authentication auth) {
        return ResponseEntity.ok(Map.of("count", service.countUnread(auth.getName(), getRole(auth))));
    }

    @GetMapping("/unread-by-type")
    public ResponseEntity<Map<String, Long>> unreadByType(Authentication auth) {
        return ResponseEntity.ok(service.countUnreadByType(auth.getName(), getRole(auth)));
    }

    private String getRole(Authentication auth) {
        return auth.getAuthorities().stream()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .findFirst().orElse("");
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long id, Authentication auth) {
        service.markRead(id, auth.getName());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/read-all")
    public ResponseEntity<Void> markAllRead(Authentication auth) {
        service.markAllRead(auth.getName(), getRole(auth));
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/batch")
    public ResponseEntity<Void> deleteBatch(@RequestBody List<Long> ids) {
        if (ids != null && !ids.isEmpty()) service.deleteNotifications(ids);
        return ResponseEntity.noContent().build();
    }
}
