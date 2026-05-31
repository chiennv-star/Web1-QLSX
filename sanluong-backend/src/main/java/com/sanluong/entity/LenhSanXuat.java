package com.sanluong.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "lenh_san_xuat")
public class LenhSanXuat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "thu_tu")
    private Integer thuTu;

    @Column(name = "ma_bravo", length = 50)
    private String maBravo;

    @Column(name = "ma_sp", length = 50)
    private String maSp;

    @Column(name = "ten_san_pham", length = 500)
    private String tenSanPham;

    @Column(name = "so_lo", length = 50)
    private String soLo;

    @Column(name = "ma_don_hang", length = 50)
    private String maDonHang;

    @Column(name = "so_luong", precision = 12, scale = 2)
    private BigDecimal soLuong;

    /** gap | rat_gap */
    @Column(name = "tinh_trang", length = 20)
    private String tinhTrang;

    @Column(name = "phong_thuc_hien", length = 100)
    private String phongThucHien;

    @Column(name = "ngay_thuc_hien")
    private LocalDate ngayThucHien;

    /** PCPL1 | PCPL2 | PCPL3 | BBC1 | ĐG */
    @Column(name = "to_thuc_hien", length = 50)
    private String toThucHien;

    @Column(name = "so_nguoi_thuc_hien")
    private Integer soNguoiThucHien;

    @Column(name = "chu_y", length = 500)
    private String chuY;

    @Column(name = "da_len_lich_lam")
    private Boolean daLenLichLam = false;

    @Column(name = "ghi_chu", length = 1000)
    private String ghiChu;

    @Column(name = "da_dg_va_xep_lich_dg")
    private Boolean daDgVaXepLichDg = false;

    @Column(name = "da_ban_hanh")
    private Boolean daBanHanh = false;

    @Column(name = "ngay_phat_lenh")
    private LocalDate ngayPhatLenh;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_by", length = 100)
    private String deletedBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ── Getters & Setters ──────────────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Integer getThuTu() { return thuTu; }
    public void setThuTu(Integer thuTu) { this.thuTu = thuTu; }
    public String getMaBravo() { return maBravo; }
    public void setMaBravo(String maBravo) { this.maBravo = maBravo; }
    public String getMaSp() { return maSp; }
    public void setMaSp(String maSp) { this.maSp = maSp; }
    public String getTenSanPham() { return tenSanPham; }
    public void setTenSanPham(String tenSanPham) { this.tenSanPham = tenSanPham; }
    public String getSoLo() { return soLo; }
    public void setSoLo(String soLo) { this.soLo = soLo; }
    public String getMaDonHang() { return maDonHang; }
    public void setMaDonHang(String maDonHang) { this.maDonHang = maDonHang; }
    public BigDecimal getSoLuong() { return soLuong; }
    public void setSoLuong(BigDecimal soLuong) { this.soLuong = soLuong; }
    public String getTinhTrang() { return tinhTrang; }
    public void setTinhTrang(String tinhTrang) { this.tinhTrang = tinhTrang; }
    public String getPhongThucHien() { return phongThucHien; }
    public void setPhongThucHien(String phongThucHien) { this.phongThucHien = phongThucHien; }
    public LocalDate getNgayThucHien() { return ngayThucHien; }
    public void setNgayThucHien(LocalDate ngayThucHien) { this.ngayThucHien = ngayThucHien; }
    public String getToThucHien() { return toThucHien; }
    public void setToThucHien(String toThucHien) { this.toThucHien = toThucHien; }
    public Integer getSoNguoiThucHien() { return soNguoiThucHien; }
    public void setSoNguoiThucHien(Integer soNguoiThucHien) { this.soNguoiThucHien = soNguoiThucHien; }
    public String getChuY() { return chuY; }
    public void setChuY(String chuY) { this.chuY = chuY; }
    public Boolean getDaLenLichLam() { return daLenLichLam; }
    public void setDaLenLichLam(Boolean daLenLichLam) { this.daLenLichLam = daLenLichLam; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String ghiChu) { this.ghiChu = ghiChu; }
    public Boolean getDaDgVaXepLichDg() { return daDgVaXepLichDg; }
    public void setDaDgVaXepLichDg(Boolean daDgVaXepLichDg) { this.daDgVaXepLichDg = daDgVaXepLichDg; }
    public Boolean getDaBanHanh() { return daBanHanh; }
    public void setDaBanHanh(Boolean daBanHanh) { this.daBanHanh = daBanHanh; }
    public LocalDate getNgayPhatLenh() { return ngayPhatLenh; }
    public void setNgayPhatLenh(LocalDate ngayPhatLenh) { this.ngayPhatLenh = ngayPhatLenh; }
    public LocalDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(LocalDateTime deletedAt) { this.deletedAt = deletedAt; }
    public String getDeletedBy() { return deletedBy; }
    public void setDeletedBy(String deletedBy) { this.deletedBy = deletedBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}
