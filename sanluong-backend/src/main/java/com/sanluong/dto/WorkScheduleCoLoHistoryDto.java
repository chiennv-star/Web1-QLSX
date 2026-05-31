package com.sanluong.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class WorkScheduleCoLoHistoryDto {
    private Long id;
    private Long workScheduleId;
    private BigDecimal coLoCu;
    private BigDecimal coLoMoi;
    private String lyDo;
    private String changedBy;
    private LocalDateTime changedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
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
