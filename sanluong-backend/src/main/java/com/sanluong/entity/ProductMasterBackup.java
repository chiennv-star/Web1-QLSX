package com.sanluong.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "product_master_backup")
public class ProductMasterBackup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_tp", length = 50)
    private String maTp;

    @Column(name = "ma_bravo", length = 50)
    private String maBravo;

    @Column(name = "tien_trinh", length = 255)
    private String tienTrinh;

    @Column(name = "sl_trung_binh", precision = 12, scale = 2)
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

    @Column(name = "loai_san_pham", length = 100)
    private String loaiSanPham;

    @Column(name = "khoi_luong", precision = 12, scale = 4)
    private BigDecimal khoiLuong;

    @Column(name = "snapshot_at")
    private LocalDateTime snapshotAt;

    public ProductMasterBackup() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getMaTp() { return maTp; }
    public void setMaTp(String maTp) { this.maTp = maTp; }
    public String getMaBravo() { return maBravo; }
    public void setMaBravo(String maBravo) { this.maBravo = maBravo; }
    public String getTienTrinh() { return tienTrinh; }
    public void setTienTrinh(String tienTrinh) { this.tienTrinh = tienTrinh; }
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
    public String getLoaiSanPham() { return loaiSanPham; }
    public void setLoaiSanPham(String loaiSanPham) { this.loaiSanPham = loaiSanPham; }
    public BigDecimal getKhoiLuong() { return khoiLuong; }
    public void setKhoiLuong(BigDecimal khoiLuong) { this.khoiLuong = khoiLuong; }
    public LocalDateTime getSnapshotAt() { return snapshotAt; }
    public void setSnapshotAt(LocalDateTime snapshotAt) { this.snapshotAt = snapshotAt; }
}
