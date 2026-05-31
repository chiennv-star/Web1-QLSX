package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "lenh_lo_history")
public class LenhLoHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lenh_id", nullable = false)
    private Long lenhId;

    @Column(name = "so_lo_cu", length = 50)
    private String soLoCu;

    @Column(name = "so_lo_moi", length = 50)
    private String soLoMoi;

    @Column(name = "ly_do", length = 500)
    private String lyDo;

    @Column(name = "changed_by", length = 100)
    private String changedBy;

    @Column(name = "changed_at")
    private LocalDateTime changedAt;

    // ── Getters & Setters ──────────────────────────────────────────────────────
    public Long getId() { return id; }
    public Long getLenhId() { return lenhId; }
    public void setLenhId(Long lenhId) { this.lenhId = lenhId; }
    public String getSoLoCu() { return soLoCu; }
    public void setSoLoCu(String soLoCu) { this.soLoCu = soLoCu; }
    public String getSoLoMoi() { return soLoMoi; }
    public void setSoLoMoi(String soLoMoi) { this.soLoMoi = soLoMoi; }
    public String getLyDo() { return lyDo; }
    public void setLyDo(String lyDo) { this.lyDo = lyDo; }
    public String getChangedBy() { return changedBy; }
    public void setChangedBy(String changedBy) { this.changedBy = changedBy; }
    public LocalDateTime getChangedAt() { return changedAt; }
    public void setChangedAt(LocalDateTime changedAt) { this.changedAt = changedAt; }
}
