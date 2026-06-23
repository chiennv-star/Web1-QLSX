package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "to_lenh_san_xuat")
public class ToLenhSanXuat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "don_hang_id")
    private Long donHangId;

    @Column(name = "ma_bravo", length = 50)
    private String maBravo;

    // Các trường header
    @Column(name = "ten_san_pham", length = 500)
    private String tenSanPham;

    @Column(name = "ma_tp", length = 50)
    private String maTP;

    @Column(name = "so_luong_pha_che", length = 100)
    private String soLuongPhaChe;

    @Column(name = "quy_cach", length = 200)
    private String quyCach;

    @Column(name = "so_dang_ky", length = 100)
    private String soDangKy;

    @Column(name = "han_dung", length = 100)
    private String hanDung;

    @Column(name = "so_lo_san_xuat", length = 100)
    private String soLoSanXuat;

    @Column(name = "ngay_san_xuat", length = 50)
    private String ngaySanXuat;

    @Column(name = "han_su_dung", length = 100)
    private String hanSuDung;

    @Column(name = "luu_y", length = 1000)
    private String luuY;

    @Column(name = "ma_don_hang", length = 100)
    private String maDonHang;

    // Toàn bộ nguyên vật liệu + bao bì lưu dưới dạng JSON
    @Column(name = "nguyen_vat_lieu_json", columnDefinition = "TEXT")
    private String nguyenVatLieuJson;

    @Column(name = "bao_bi_json", columnDefinition = "TEXT")
    private String baoBiJson;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @PrePersist
    void prePersist() { createdAt = LocalDateTime.now(); updatedAt = LocalDateTime.now(); }

    @PreUpdate
    void preUpdate() { updatedAt = LocalDateTime.now(); }

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDonHangId() { return donHangId; }
    public void setDonHangId(Long donHangId) { this.donHangId = donHangId; }
    public String getMaBravo() { return maBravo; }
    public void setMaBravo(String maBravo) { this.maBravo = maBravo; }
    public String getTenSanPham() { return tenSanPham; }
    public void setTenSanPham(String tenSanPham) { this.tenSanPham = tenSanPham; }
    public String getMaTP() { return maTP; }
    public void setMaTP(String maTP) { this.maTP = maTP; }
    public String getSoLuongPhaChe() { return soLuongPhaChe; }
    public void setSoLuongPhaChe(String soLuongPhaChe) { this.soLuongPhaChe = soLuongPhaChe; }
    public String getQuyCach() { return quyCach; }
    public void setQuyCach(String quyCach) { this.quyCach = quyCach; }
    public String getSoDangKy() { return soDangKy; }
    public void setSoDangKy(String soDangKy) { this.soDangKy = soDangKy; }
    public String getHanDung() { return hanDung; }
    public void setHanDung(String hanDung) { this.hanDung = hanDung; }
    public String getSoLoSanXuat() { return soLoSanXuat; }
    public void setSoLoSanXuat(String soLoSanXuat) { this.soLoSanXuat = soLoSanXuat; }
    public String getNgaySanXuat() { return ngaySanXuat; }
    public void setNgaySanXuat(String ngaySanXuat) { this.ngaySanXuat = ngaySanXuat; }
    public String getHanSuDung() { return hanSuDung; }
    public void setHanSuDung(String hanSuDung) { this.hanSuDung = hanSuDung; }
    public String getLuuY() { return luuY; }
    public void setLuuY(String luuY) { this.luuY = luuY; }
    public String getMaDonHang() { return maDonHang; }
    public void setMaDonHang(String maDonHang) { this.maDonHang = maDonHang; }
    public String getNguyenVatLieuJson() { return nguyenVatLieuJson; }
    public void setNguyenVatLieuJson(String nguyenVatLieuJson) { this.nguyenVatLieuJson = nguyenVatLieuJson; }
    public String getBaoBiJson() { return baoBiJson; }
    public void setBaoBiJson(String baoBiJson) { this.baoBiJson = baoBiJson; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}
