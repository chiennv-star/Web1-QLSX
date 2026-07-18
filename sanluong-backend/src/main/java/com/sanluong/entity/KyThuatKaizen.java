package com.sanluong.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "ky_thuat_kaizen")
public class KyThuatKaizen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ngay_ghi_nhan")
    private LocalDate ngayGhiNhan;

    @Column(name = "chi_so", length = 255)
    private String chiSo;

    @Column(name = "gt_truoc", length = 255)
    private String gtTruoc;

    @Column(name = "gt_sau", length = 255)
    private String gtSau;

    @Column(name = "quy_doi", precision = 14, scale = 2)
    private BigDecimal quyDoi;

    @Column(name = "mo_ta", length = 1000)
    private String moTa;

    @Column(name = "nguoi_thuc_hien", length = 255)
    private String nguoiThucHien;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public KyThuatKaizen() {}

    @PrePersist
    void prePersist() { createdAt = LocalDateTime.now(); updatedAt = LocalDateTime.now(); }

    @PreUpdate
    void preUpdate() { updatedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDate getNgayGhiNhan() { return ngayGhiNhan; }
    public void setNgayGhiNhan(LocalDate v) { this.ngayGhiNhan = v; }
    public String getChiSo() { return chiSo; }
    public void setChiSo(String v) { this.chiSo = v; }
    public String getGtTruoc() { return gtTruoc; }
    public void setGtTruoc(String v) { this.gtTruoc = v; }
    public String getGtSau() { return gtSau; }
    public void setGtSau(String v) { this.gtSau = v; }
    public BigDecimal getQuyDoi() { return quyDoi; }
    public void setQuyDoi(BigDecimal v) { this.quyDoi = v; }
    public String getMoTa() { return moTa; }
    public void setMoTa(String v) { this.moTa = v; }
    public String getNguoiThucHien() { return nguoiThucHien; }
    public void setNguoiThucHien(String v) { this.nguoiThucHien = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
