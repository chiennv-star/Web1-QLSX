package com.sanluong.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "nang_suat")
public class NangSuat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_san_pham", length = 50)
    private String maSanPham;

    @Column(name = "ten_san_pham", length = 255)
    private String tenSanPham;

    @Column(name = "dang_bao_che", length = 100)
    private String dangBaoChe;

    @Column(name = "to_pcpl", length = 50)
    private String toPcpl;

    @Column(name = "sp_bbc1", precision = 12, scale = 2)
    private BigDecimal spBbc1;

    @Column(name = "sp_pc", precision = 12, scale = 2)
    private BigDecimal spPc;

    @Column(name = "sp_pl", precision = 12, scale = 2)
    private BigDecimal spPl;

    @Column(name = "sp_dg", precision = 12, scale = 2)
    private BigDecimal spDg;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public NangSuat() {}

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getMaSanPham() { return maSanPham; }
    public void setMaSanPham(String maSanPham) { this.maSanPham = maSanPham; }
    public String getTenSanPham() { return tenSanPham; }
    public void setTenSanPham(String tenSanPham) { this.tenSanPham = tenSanPham; }
    public String getDangBaoChe() { return dangBaoChe; }
    public void setDangBaoChe(String dangBaoChe) { this.dangBaoChe = dangBaoChe; }
    public String getToPcpl() { return toPcpl; }
    public void setToPcpl(String toPcpl) { this.toPcpl = toPcpl; }
    public BigDecimal getSpBbc1() { return spBbc1; }
    public void setSpBbc1(BigDecimal spBbc1) { this.spBbc1 = spBbc1; }
    public BigDecimal getSpPc() { return spPc; }
    public void setSpPc(BigDecimal spPc) { this.spPc = spPc; }
    public BigDecimal getSpPl() { return spPl; }
    public void setSpPl(BigDecimal spPl) { this.spPl = spPl; }
    public BigDecimal getSpDg() { return spDg; }
    public void setSpDg(BigDecimal spDg) { this.spDg = spDg; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
