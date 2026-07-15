package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "product_master")
public class ProductMaster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_tp", unique = true, nullable = false, length = 50)
    private String maTp;

    @Column(name = "ma_bravo", length = 50)
    private String maBravo;

    @Column(name = "tien_trinh", length = 255)
    private String tienTrinh;

    @Column(name = "sp_cong", precision = 12, scale = 2)
    private java.math.BigDecimal spCong;

    @Column(name = "sl_trung_binh", precision = 12, scale = 2)
    private java.math.BigDecimal slTrungBinh;

    @Column(name = "nang_suat_pc", precision = 12, scale = 4)
    private java.math.BigDecimal nangSuatPc;

    @Column(name = "nang_suat_pl", precision = 12, scale = 4)
    private java.math.BigDecimal nangSuatPl;

    @Column(name = "nang_suat_bbc1", precision = 12, scale = 4)
    private java.math.BigDecimal nangSuatBbc1;

    @Column(name = "nang_suat_dg", precision = 12, scale = 4)
    private java.math.BigDecimal nangSuatDg;

    @Column(name = "may_moc_pc", length = 255)
    private String mayMocPc;

    @Column(name = "toc_do_may_pc")
    private Integer tocDoMayPc;

    @Column(name = "may_moc_pl", length = 255)
    private String mayMocPl;

    @Column(name = "toc_do_may_pl")
    private Integer tocDoMayPl;

    @Column(name = "may_moc_bbc1", length = 255)
    private String mayMocBbc1;

    @Column(name = "toc_do_may_bbc1")
    private Integer tocDoMayBbc1;

    @Column(name = "may_moc_dg", length = 255)
    private String mayMocDg;

    @Column(name = "toc_do_may_dg")
    private Integer tocDoMayDg;

    @Column(name = "loai_san_pham", length = 100)
    private String loaiSanPham;

    @Column(name = "khoi_luong", precision = 12, scale = 4)
    private java.math.BigDecimal khoiLuong;

    @Column(name = "to_nhom_pcpl", length = 20)
    private String toNhomPcpl;

    @Column(name = "ghi_chu", length = 500)
    private String ghiChu;

    @Column(name = "tinh_trang", length = 20)
    private String tinhTrang;

    @Column(name = "nang_suat_pc_me", columnDefinition = "TEXT")
    private String nangSuatPcMe;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public ProductMaster() {}

    @PrePersist
    void prePersist() {
        if (slTrungBinh == null) slTrungBinh = java.math.BigDecimal.valueOf(1000);
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getMaTp() { return maTp; }
    public void setMaTp(String maTp) { this.maTp = maTp; }
    public String getMaBravo() { return maBravo; }
    public void setMaBravo(String maBravo) { this.maBravo = maBravo; }
    public String getTienTrinh() { return tienTrinh; }
    public void setTienTrinh(String tienTrinh) { this.tienTrinh = tienTrinh; }
    public java.math.BigDecimal getSpCong() { return spCong; }
    public void setSpCong(java.math.BigDecimal spCong) { this.spCong = spCong; }
    public java.math.BigDecimal getSlTrungBinh() { return slTrungBinh; }
    public void setSlTrungBinh(java.math.BigDecimal slTrungBinh) { this.slTrungBinh = slTrungBinh; }
    public java.math.BigDecimal getNangSuatPc() { return nangSuatPc; }
    public void setNangSuatPc(java.math.BigDecimal nangSuatPc) { this.nangSuatPc = nangSuatPc; }
    public java.math.BigDecimal getNangSuatPl() { return nangSuatPl; }
    public void setNangSuatPl(java.math.BigDecimal nangSuatPl) { this.nangSuatPl = nangSuatPl; }
    public java.math.BigDecimal getNangSuatBbc1() { return nangSuatBbc1; }
    public void setNangSuatBbc1(java.math.BigDecimal nangSuatBbc1) { this.nangSuatBbc1 = nangSuatBbc1; }
    public java.math.BigDecimal getNangSuatDg() { return nangSuatDg; }
    public void setNangSuatDg(java.math.BigDecimal nangSuatDg) { this.nangSuatDg = nangSuatDg; }
    public String getMayMocPc() { return mayMocPc; }
    public void setMayMocPc(String mayMocPc) { this.mayMocPc = mayMocPc; }
    public Integer getTocDoMayPc() { return tocDoMayPc; }
    public void setTocDoMayPc(Integer tocDoMayPc) { this.tocDoMayPc = tocDoMayPc; }
    public String getMayMocPl() { return mayMocPl; }
    public void setMayMocPl(String mayMocPl) { this.mayMocPl = mayMocPl; }
    public Integer getTocDoMayPl() { return tocDoMayPl; }
    public void setTocDoMayPl(Integer tocDoMayPl) { this.tocDoMayPl = tocDoMayPl; }
    public String getMayMocBbc1() { return mayMocBbc1; }
    public void setMayMocBbc1(String mayMocBbc1) { this.mayMocBbc1 = mayMocBbc1; }
    public Integer getTocDoMayBbc1() { return tocDoMayBbc1; }
    public void setTocDoMayBbc1(Integer tocDoMayBbc1) { this.tocDoMayBbc1 = tocDoMayBbc1; }
    public String getMayMocDg() { return mayMocDg; }
    public void setMayMocDg(String mayMocDg) { this.mayMocDg = mayMocDg; }
    public Integer getTocDoMayDg() { return tocDoMayDg; }
    public void setTocDoMayDg(Integer tocDoMayDg) { this.tocDoMayDg = tocDoMayDg; }
    public String getLoaiSanPham() { return loaiSanPham; }
    public void setLoaiSanPham(String loaiSanPham) { this.loaiSanPham = loaiSanPham; }
    public java.math.BigDecimal getKhoiLuong() { return khoiLuong; }
    public void setKhoiLuong(java.math.BigDecimal khoiLuong) { this.khoiLuong = khoiLuong; }
    public String getToNhomPcpl() { return toNhomPcpl; }
    public void setToNhomPcpl(String toNhomPcpl) { this.toNhomPcpl = toNhomPcpl; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String ghiChu) { this.ghiChu = ghiChu; }
    public String getTinhTrang() { return tinhTrang; }
    public void setTinhTrang(String tinhTrang) { this.tinhTrang = tinhTrang; }
    public String getNangSuatPcMe() { return nangSuatPcMe; }
    public void setNangSuatPcMe(String nangSuatPcMe) { this.nangSuatPcMe = nangSuatPcMe; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
