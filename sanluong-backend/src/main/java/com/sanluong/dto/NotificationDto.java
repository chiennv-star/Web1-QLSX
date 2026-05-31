package com.sanluong.dto;

import java.time.LocalDateTime;

public class NotificationDto {
    private Long id;
    private String type;
    private String title;
    private String message;
    private Long refId;
    private String refInfo;
    private String createdBy;
    private LocalDateTime createdAt;
    private boolean read;

    // ── Getters & Setters ──────────────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Long getRefId() { return refId; }
    public void setRefId(Long refId) { this.refId = refId; }
    public String getRefInfo() { return refInfo; }
    public void setRefInfo(String refInfo) { this.refInfo = refInfo; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }
}
