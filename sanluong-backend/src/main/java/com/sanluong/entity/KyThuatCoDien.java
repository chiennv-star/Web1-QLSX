package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "ky_thuat_co_dien")
public class KyThuatCoDien {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ngay")
    private LocalDate ngay;

    @Column(name = "mo_ta", length = 1000)
    private String moTa;

    @Column(name = "thiet_bi", length = 255)
    private String thietBi;

    @Column(name = "khu_vuc", length = 255)
    private String khuVuc;

    @Column(name = "phan_loai", length = 100)
    private String phanLoai;

    @Column(name = "muc_do", length = 50)
    private String mucDo;

    @Column(name = "nguyen_nhan", length = 2000)
    private String nguyenNhan;

    @Column(name = "bien_phap", length = 2000)
    private String bienPhap;

    @Column(name = "linh_kien", length = 500)
    private String linhKien;

    @Column(name = "ket_qua", length = 1000)
    private String ketQua;

    @Column(name = "trang_thai", length = 50)
    private String trangThai;

    @Column(name = "nguoi_phu_trach", length = 255)
    private String nguoiPhuTrach;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public KyThuatCoDien() {}

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
    public String getThietBi() { return thietBi; }
    public void setThietBi(String v) { this.thietBi = v; }
    public String getKhuVuc() { return khuVuc; }
    public void setKhuVuc(String v) { this.khuVuc = v; }
    public String getPhanLoai() { return phanLoai; }
    public void setPhanLoai(String v) { this.phanLoai = v; }
    public String getMucDo() { return mucDo; }
    public void setMucDo(String v) { this.mucDo = v; }
    public String getNguyenNhan() { return nguyenNhan; }
    public void setNguyenNhan(String v) { this.nguyenNhan = v; }
    public String getBienPhap() { return bienPhap; }
    public void setBienPhap(String v) { this.bienPhap = v; }
    public String getLinhKien() { return linhKien; }
    public void setLinhKien(String v) { this.linhKien = v; }
    public String getKetQua() { return ketQua; }
    public void setKetQua(String v) { this.ketQua = v; }
    public String getTrangThai() { return trangThai; }
    public void setTrangThai(String v) { this.trangThai = v; }
    public String getNguoiPhuTrach() { return nguoiPhuTrach; }
    public void setNguoiPhuTrach(String v) { this.nguoiPhuTrach = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
