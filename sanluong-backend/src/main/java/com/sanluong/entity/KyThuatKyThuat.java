package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "ky_thuat_ky_thuat")
public class KyThuatKyThuat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ngay")
    private LocalDate ngay;

    @Column(name = "mo_ta", length = 1000)
    private String moTa;

    @Column(name = "phan_loai", length = 100)
    private String phanLoai;

    @Column(name = "thiet_bi", length = 255)
    private String thietBi;

    @Column(name = "muc_do", length = 50)
    private String mucDo;

    @Column(name = "noi_dung", length = 4000)
    private String noiDung;

    @Column(name = "ghi_chu", length = 4000)
    private String ghiChu;

    @Column(name = "nguyen_nhan", length = 2000)
    private String nguyenNhan;

    @Column(name = "bien_phap", length = 2000)
    private String bienPhap;

    @Column(name = "trang_thai", length = 50)
    private String trangThai;

    @Column(name = "nguoi_phu_trach", length = 255)
    private String nguoiPhuTrach;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public KyThuatKyThuat() {}

    @PrePersist
    void prePersist() { createdAt = LocalDateTime.now(); updatedAt = LocalDateTime.now(); }

    @PreUpdate
    void preUpdate() { updatedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDate getNgay() { return ngay; }
    public void setNgay(LocalDate v) { this.ngay = v; }
    public String getMoTa() { return moTa; }
    public void setMoTa(String v) { this.moTa = v; }
    public String getPhanLoai() { return phanLoai; }
    public void setPhanLoai(String v) { this.phanLoai = v; }
    public String getThietBi() { return thietBi; }
    public void setThietBi(String v) { this.thietBi = v; }
    public String getMucDo() { return mucDo; }
    public void setMucDo(String v) { this.mucDo = v; }
    public String getNoiDung() { return noiDung; }
    public void setNoiDung(String v) { this.noiDung = v; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String v) { this.ghiChu = v; }
    public String getNguyenNhan() { return nguyenNhan; }
    public void setNguyenNhan(String v) { this.nguyenNhan = v; }
    public String getBienPhap() { return bienPhap; }
    public void setBienPhap(String v) { this.bienPhap = v; }
    public String getTrangThai() { return trangThai; }
    public void setTrangThai(String v) { this.trangThai = v; }
    public String getNguoiPhuTrach() { return nguoiPhuTrach; }
    public void setNguoiPhuTrach(String v) { this.nguoiPhuTrach = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
