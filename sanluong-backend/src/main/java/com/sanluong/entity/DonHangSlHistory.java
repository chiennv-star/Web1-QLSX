package com.sanluong.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "don_hang_sl_history")
public class DonHangSlHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "don_hang_id", nullable = false)
    private Long donHangId;

    @Column(name = "sl_cu", precision = 12, scale = 0)
    private BigDecimal slCu;

    @Column(name = "sl_moi", precision = 12, scale = 0)
    private BigDecimal slMoi;

    @Column(name = "ly_do", length = 500)
    private String lyDo;

    @Column(name = "changed_by", length = 100)
    private String changedBy;

    @Column(name = "changed_at")
    private LocalDateTime changedAt;

    public Long getId() { return id; }
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
