package com.sanluong.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "work_schedule_co_lo_history")
public class WorkScheduleCoLoHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "work_schedule_id", nullable = false)
    private Long workScheduleId;

    @Column(name = "co_lo_cu", precision = 12, scale = 2)
    private BigDecimal coLoCu;

    @Column(name = "co_lo_moi", precision = 12, scale = 2)
    private BigDecimal coLoMoi;

    @Column(name = "ly_do", length = 500)
    private String lyDo;

    @Column(name = "changed_by", length = 100)
    private String changedBy;

    @Column(name = "changed_at")
    private LocalDateTime changedAt;

    public Long getId() { return id; }
    public Long getWorkScheduleId() { return workScheduleId; }
    public void setWorkScheduleId(Long workScheduleId) { this.workScheduleId = workScheduleId; }
    public BigDecimal getCoLoCu() { return coLoCu; }
    public void setCoLoCu(BigDecimal coLoCu) { this.coLoCu = coLoCu; }
    public BigDecimal getCoLoMoi() { return coLoMoi; }
    public void setCoLoMoi(BigDecimal coLoMoi) { this.coLoMoi = coLoMoi; }
    public String getLyDo() { return lyDo; }
    public void setLyDo(String lyDo) { this.lyDo = lyDo; }
    public String getChangedBy() { return changedBy; }
    public void setChangedBy(String changedBy) { this.changedBy = changedBy; }
    public LocalDateTime getChangedAt() { return changedAt; }
    public void setChangedAt(LocalDateTime changedAt) { this.changedAt = changedAt; }
}
