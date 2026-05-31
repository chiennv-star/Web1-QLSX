package com.sanluong.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "work_efficiency")
public class WorkEfficiency {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_nhan_vien", length = 50)
    private String maNhanVien;

    @Column(name = "ho_va_ten", length = 200)
    private String hoVaTen;

    @Column(name = "vi_tri", length = 100)
    private String viTri;

    @Column(name = "to_nhom", length = 100)
    private String toNhom;

    @Column(name = "so_gio_truong_ca", precision = 10, scale = 2)
    private BigDecimal soGioTruongCa;

    @Column(name = "so_gio_phu_may", precision = 10, scale = 2)
    private BigDecimal soGioPhuMay;

    @Column(name = "so_lan_dat")
    private Integer soLanDat;

    @Column(name = "so_lan_khong_dat")
    private Integer soLanKhongDat;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() { createdAt = LocalDateTime.now(); updatedAt = LocalDateTime.now(); }

    @PreUpdate
    void preUpdate() { updatedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getMaNhanVien() { return maNhanVien; }
    public void setMaNhanVien(String maNhanVien) { this.maNhanVien = maNhanVien; }
    public String getHoVaTen() { return hoVaTen; }
    public void setHoVaTen(String hoVaTen) { this.hoVaTen = hoVaTen; }
    public String getViTri() { return viTri; }
    public void setViTri(String viTri) { this.viTri = viTri; }
    public String getToNhom() { return toNhom; }
    public void setToNhom(String toNhom) { this.toNhom = toNhom; }
    public BigDecimal getSoGioTruongCa() { return soGioTruongCa; }
    public void setSoGioTruongCa(BigDecimal soGioTruongCa) { this.soGioTruongCa = soGioTruongCa; }
    public BigDecimal getSoGioPhuMay() { return soGioPhuMay; }
    public void setSoGioPhuMay(BigDecimal soGioPhuMay) { this.soGioPhuMay = soGioPhuMay; }
    public Integer getSoLanDat() { return soLanDat; }
    public void setSoLanDat(Integer soLanDat) { this.soLanDat = soLanDat; }
    public Integer getSoLanKhongDat() { return soLanKhongDat; }
    public void setSoLanKhongDat(Integer soLanKhongDat) { this.soLanKhongDat = soLanKhongDat; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
