package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notification_reads",
       uniqueConstraints = @UniqueConstraint(columnNames = {"notification_id", "username"}))
public class NotificationRead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "notification_id", nullable = false)
    private Long notificationId;

    @Column(name = "username", length = 100, nullable = false)
    private String username;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    // ── Getters & Setters ──────────────────────────────────────────────────────
    public Long getId() { return id; }
    public Long getNotificationId() { return notificationId; }
    public void setNotificationId(Long notificationId) { this.notificationId = notificationId; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public LocalDateTime getReadAt() { return readAt; }
    public void setReadAt(LocalDateTime readAt) { this.readAt = readAt; }
}
