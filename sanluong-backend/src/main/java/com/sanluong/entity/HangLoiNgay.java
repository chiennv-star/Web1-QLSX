package com.sanluong.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "hang_loi_ngay")
public class HangLoiNgay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hang_loi_id", nullable = false)
    private HangLoi hangLoi;

    @Column(name = "ngay", nullable = false)
    private LocalDate ngay;

    @Column(name = "sl_tra_ve", precision = 12, scale = 2)
    private BigDecimal slTraVe;

    @Column(name = "sl_dat_sau_xu_ly", precision = 12, scale = 2)
    private BigDecimal slDatSauXuLy;

    @Column(name = "sl_huy", precision = 12, scale = 2)
    private BigDecimal slHuy;

    @Column(name = "ghi_chu", length = 500)
    private String ghiChu;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() { createdAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public HangLoi getHangLoi() { return hangLoi; }
    public void setHangLoi(HangLoi hangLoi) { this.hangLoi = hangLoi; }
    public LocalDate getNgay() { return ngay; }
    public void setNgay(LocalDate ngay) { this.ngay = ngay; }
    public BigDecimal getSlTraVe() { return slTraVe; }
    public void setSlTraVe(BigDecimal slTraVe) { this.slTraVe = slTraVe; }
    public BigDecimal getSlDatSauXuLy() { return slDatSauXuLy; }
    public void setSlDatSauXuLy(BigDecimal slDatSauXuLy) { this.slDatSauXuLy = slDatSauXuLy; }
    public BigDecimal getSlHuy() { return slHuy; }
    public void setSlHuy(BigDecimal slHuy) { this.slHuy = slHuy; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String ghiChu) { this.ghiChu = ghiChu; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
