package com.sanluong.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class DonHangSlHistoryDto {
    private Long id;
    private Long donHangId;
    private BigDecimal slCu;
    private BigDecimal slMoi;
    private String lyDo;
    private String changedBy;
    private LocalDateTime changedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDonHangId() { return donHangId; }
    public void setDonHangId(Long donHangId) { this.donHangId = donHangId; }
    public BigDecimal getSlCu() { return slCu; }
    public void setSlCu(BigDecimal slCu) { this.slCu = slCu; }
    public BigDecimal getSlMoi() { return slMoi; }
    public void setSlMoi(BigDecimal slMoi) { this.slMoi = slMoi; }
    public String getLyDo() { return lyDo; }
    public void setLyDo(String lyDo) { this.lyDo = lyDo; }
    public String getChangedBy() { return changedBy; }
    public void setChangedBy(String changedBy) { this.changedBy = changedBy; }
    public LocalDateTime getChangedAt() { return changedAt; }
    public void setChangedAt(LocalDateTime changedAt) { this.changedAt = changedAt; }
}
