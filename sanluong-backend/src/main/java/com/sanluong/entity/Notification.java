package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "type", length = 50, nullable = false)
    private String type; // DOI_LO

    @Column(name = "title", length = 300)
    private String title;

    @Column(name = "message", length = 1000)
    private String message;

    @Column(name = "ref_id")
    private Long refId; // lenhId

    @Column(name = "ref_info", length = 500)
    private String refInfo; // JSON-like extra info (maDonHang, soLoCu, soLoMoi)

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // ── Getters & Setters ──────────────────────────────────────────────────────
    public Long getId() { return id; }
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
}
