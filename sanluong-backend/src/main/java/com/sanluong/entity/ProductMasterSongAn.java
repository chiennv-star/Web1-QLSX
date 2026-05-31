package com.sanluong.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "product_master_song_an")
public class ProductMasterSongAn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_tp", unique = true, nullable = false, length = 50)
    private String maTp;

    @Column(name = "ma_bravo", length = 50)
    private String maBravo;

    @Column(name = "tien_trinh", length = 255)
    private String tienTrinh;

    @Column(name = "loai_san_pham", length = 100)
    private String loaiSanPham;

    @Column(name = "khoi_luong", precision = 12, scale = 4)
    private BigDecimal khoiLuong;

    @Column(name = "sl_trung_binh", precision = 12, scale = 4)
    private BigDecimal slTrungBinh;

    @Column(name = "nang_suat_pc", precision = 12, scale = 4)
    private BigDecimal nangSuatPc;

    @Column(name = "nang_suat_pl", precision = 12, scale = 4)
    private BigDecimal nangSuatPl;

    @Column(name = "nang_suat_bbc1", precision = 12, scale = 4)
    private BigDecimal nangSuatBbc1;

    @Column(name = "may_moc_pc", length = 255)
    private String mayMocPc;

    @Column(name = "may_moc_pl", length = 255)
    private String mayMocPl;

    @Column(name = "may_moc_bbc1", length = 255)
    private String mayMocBbc1;

    @Column(name = "may_moc_dg", length = 255)
    private String mayMocDg;

    @Column(name = "to_nhom_pcpl", length = 100)
    private String toNhomPcpl;

    @Column(name = "cong_giao_nhan", precision = 12, scale = 4)
    private BigDecimal congGiaoNhan;

    @Column(name = "cong_bbc1", precision = 12, scale = 4)
    private BigDecimal congBbc1;

    @Column(name = "cong_pc", precision = 12, scale = 4)
    private BigDecimal congPc;

    @Column(name = "cong_pl", precision = 12, scale = 4)
    private BigDecimal congPl;

    @Column(name = "cong_dg", precision = 12, scale = 4)
    private BigDecimal congDg;

    @Column(name = "tong_cong_tp", precision = 12, scale = 4)
    private BigDecimal tongCongTp;

    @Column(name = "gn_tren_sp", precision = 14, scale = 7)
    private BigDecimal gnTrenSp;

    @Column(name = "bbc1_tren_sp", precision = 14, scale = 7)
    private BigDecimal bbc1TrenSp;

    @Column(name = "pcpl_tren_sp", precision = 14, scale = 7)
    private BigDecimal pcplTrenSp;

    @Column(name = "dg_tren_sp", precision = 14, scale = 7)
    private BigDecimal dgTrenSp;

    @Column(name = "sp_tren_gn")
    private Integer spTrenGn;

    @Column(name = "sp_tren_bbc1")
    private Integer spTrenBbc1;

    @Column(name = "sp_tren_pc")
    private Integer spTrenPc;

    @Column(name = "sp_tren_pl")
    private Integer spTrenPl;

    @Column(name = "sp_tren_dg")
    private Integer spTrenDg;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public ProductMasterSongAn() {}

    @PrePersist
    void prePersist() {
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
    public String getLoaiSanPham() { return loaiSanPham; }
    public void setLoaiSanPham(String loaiSanPham) { this.loaiSanPham = loaiSanPham; }
    public BigDecimal getKhoiLuong() { return khoiLuong; }
    public void setKhoiLuong(BigDecimal khoiLuong) { this.khoiLuong = khoiLuong; }
    public BigDecimal getSlTrungBinh() { return slTrungBinh; }
    public void setSlTrungBinh(BigDecimal slTrungBinh) { this.slTrungBinh = slTrungBinh; }
    public BigDecimal getNangSuatPc() { return nangSuatPc; }
    public void setNangSuatPc(BigDecimal nangSuatPc) { this.nangSuatPc = nangSuatPc; }
    public BigDecimal getNangSuatPl() { return nangSuatPl; }
    public void setNangSuatPl(BigDecimal nangSuatPl) { this.nangSuatPl = nangSuatPl; }
    public BigDecimal getNangSuatBbc1() { return nangSuatBbc1; }
    public void setNangSuatBbc1(BigDecimal nangSuatBbc1) { this.nangSuatBbc1 = nangSuatBbc1; }
    public String getMayMocPc() { return mayMocPc; }
    public void setMayMocPc(String mayMocPc) { this.mayMocPc = mayMocPc; }
    public String getMayMocPl() { return mayMocPl; }
    public void setMayMocPl(String mayMocPl) { this.mayMocPl = mayMocPl; }
    public String getMayMocBbc1() { return mayMocBbc1; }
    public void setMayMocBbc1(String mayMocBbc1) { this.mayMocBbc1 = mayMocBbc1; }
    public String getMayMocDg() { return mayMocDg; }
    public void setMayMocDg(String mayMocDg) { this.mayMocDg = mayMocDg; }
    public String getToNhomPcpl() { return toNhomPcpl; }
    public void setToNhomPcpl(String toNhomPcpl) { this.toNhomPcpl = toNhomPcpl; }
    public BigDecimal getCongGiaoNhan() { return congGiaoNhan; }
    public void setCongGiaoNhan(BigDecimal congGiaoNhan) { this.congGiaoNhan = congGiaoNhan; }
    public BigDecimal getCongBbc1() { return congBbc1; }
    public void setCongBbc1(BigDecimal congBbc1) { this.congBbc1 = congBbc1; }
    public BigDecimal getCongPc() { return congPc; }
    public void setCongPc(BigDecimal congPc) { this.congPc = congPc; }
    public BigDecimal getCongPl() { return congPl; }
    public void setCongPl(BigDecimal congPl) { this.congPl = congPl; }
    public BigDecimal getCongDg() { return congDg; }
    public void setCongDg(BigDecimal congDg) { this.congDg = congDg; }
    public BigDecimal getTongCongTp() { return tongCongTp; }
    public void setTongCongTp(BigDecimal tongCongTp) { this.tongCongTp = tongCongTp; }
    public BigDecimal getGnTrenSp() { return gnTrenSp; }
    public void setGnTrenSp(BigDecimal gnTrenSp) { this.gnTrenSp = gnTrenSp; }
    public BigDecimal getBbc1TrenSp() { return bbc1TrenSp; }
    public void setBbc1TrenSp(BigDecimal bbc1TrenSp) { this.bbc1TrenSp = bbc1TrenSp; }
    public BigDecimal getPcplTrenSp() { return pcplTrenSp; }
    public void setPcplTrenSp(BigDecimal pcplTrenSp) { this.pcplTrenSp = pcplTrenSp; }
    public BigDecimal getDgTrenSp() { return dgTrenSp; }
    public void setDgTrenSp(BigDecimal dgTrenSp) { this.dgTrenSp = dgTrenSp; }
    public Integer getSpTrenGn() { return spTrenGn; }
    public void setSpTrenGn(Integer spTrenGn) { this.spTrenGn = spTrenGn; }
    public Integer getSpTrenBbc1() { return spTrenBbc1; }
    public void setSpTrenBbc1(Integer spTrenBbc1) { this.spTrenBbc1 = spTrenBbc1; }
    public Integer getSpTrenPc() { return spTrenPc; }
    public void setSpTrenPc(Integer spTrenPc) { this.spTrenPc = spTrenPc; }
    public Integer getSpTrenPl() { return spTrenPl; }
    public void setSpTrenPl(Integer spTrenPl) { this.spTrenPl = spTrenPl; }
    public Integer getSpTrenDg() { return spTrenDg; }
    public void setSpTrenDg(Integer spTrenDg) { this.spTrenDg = spTrenDg; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
