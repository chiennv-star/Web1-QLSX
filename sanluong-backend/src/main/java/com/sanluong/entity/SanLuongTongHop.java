package com.sanluong.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "san_luong_tong_hop")
public class SanLuongTongHop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_bravo", length = 50)
    private String maBravo;

    @Column(name = "ma_tp", length = 50)
    private String maTp;

    @Column(name = "tien_trinh", length = 255)
    private String tienTrinh;

    @Column(name = "lsx", length = 50)
    private String lsx;

    @Column(name = "so_luong")
    private Integer soLuong;

    @Column(name = "ma_don_hang", length = 100)
    private String maDonHang;

    // Trạng thái công đoạn
    @Column(name = "pc_trang_thai", length = 10)
    private String pcTrangThai;

    @Column(name = "pl_trang_thai", length = 10)
    private String plTrangThai;

    @Column(name = "dg_trang_thai", length = 10)
    private String dgTrangThai;

    @Column(name = "bbc1_trang_thai", length = 10)
    private String bbc1TrangThai;

    // Sản lượng từng công đoạn
    @Column(name = "sl_pc", length = 20)
    private String slPc;

    @Column(name = "pc_pl", length = 20)
    private String pcPl;

    @Column(name = "dg_2", length = 20)
    private String dg2;

    @Column(name = "bbc1_2", length = 20)
    private String bbc1_2;

    @Column(name = "sp_trung_gian")
    private Integer spTrungGian;

    @Column(name = "tp_nhap_kho")
    private Integer tpNhapKho;

    // Chi phí công
    @Column(name = "bbc1_3", precision = 10, scale = 4)
    private BigDecimal bbc1_3;

    @Column(name = "pc_chi_phi", precision = 10, scale = 4)
    private BigDecimal pcChiPhi;

    @Column(name = "pl_chi_phi", precision = 10, scale = 4)
    private BigDecimal plChiPhi;

    @Column(name = "dg_chi_phi", precision = 10, scale = 4)
    private BigDecimal dgChiPhi;

    @Column(name = "cc_chi_phi", precision = 10, scale = 4)
    private BigDecimal ccChiPhi;

    @Column(name = "tem_db", precision = 10, scale = 4)
    private BigDecimal temDb;

    // Hiệu suất & QA
    @Column(name = "sl_trung_binh", precision = 10, scale = 2)
    private BigDecimal slTrungBinh;

    @Column(name = "pl_qa_lay_mau")
    private Integer plQaLayMau;

    @Column(name = "dg_qa_lay_mau")
    private Integer dgQaLayMau;

    @Column(name = "mo_ta", length = 500)
    private String moTa;

    @Column(name = "ghi_chu_hieu_suat", length = 500)
    private String ghiChuHieuSuat;

    // Populated from ProductMaster join — not persisted
    @jakarta.persistence.Transient
    private String loaiSanPham;

    @jakarta.persistence.Transient
    private String toThucHien;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getMaBravo() { return maBravo; }
    public void setMaBravo(String maBravo) { this.maBravo = maBravo; }
    public String getMaTp() { return maTp; }
    public void setMaTp(String maTp) { this.maTp = maTp; }
    public String getTienTrinh() { return tienTrinh; }
    public void setTienTrinh(String tienTrinh) { this.tienTrinh = tienTrinh; }
    public String getLsx() { return lsx; }
    public void setLsx(String lsx) { this.lsx = lsx; }
    public Integer getSoLuong() { return soLuong; }
    public void setSoLuong(Integer soLuong) { this.soLuong = soLuong; }
    public String getMaDonHang() { return maDonHang; }
    public void setMaDonHang(String maDonHang) { this.maDonHang = maDonHang; }
    public String getPcTrangThai() { return pcTrangThai; }
    public void setPcTrangThai(String pcTrangThai) { this.pcTrangThai = pcTrangThai; }
    public String getPlTrangThai() { return plTrangThai; }
    public void setPlTrangThai(String plTrangThai) { this.plTrangThai = plTrangThai; }
    public String getDgTrangThai() { return dgTrangThai; }
    public void setDgTrangThai(String dgTrangThai) { this.dgTrangThai = dgTrangThai; }
    public String getBbc1TrangThai() { return bbc1TrangThai; }
    public void setBbc1TrangThai(String bbc1TrangThai) { this.bbc1TrangThai = bbc1TrangThai; }
    public String getSlPc() { return slPc; }
    public void setSlPc(String slPc) { this.slPc = slPc; }
    public String getPcPl() { return pcPl; }
    public void setPcPl(String pcPl) { this.pcPl = pcPl; }
    public String getDg2() { return dg2; }
    public void setDg2(String dg2) { this.dg2 = dg2; }
    public String getBbc1_2() { return bbc1_2; }
    public void setBbc1_2(String bbc1_2) { this.bbc1_2 = bbc1_2; }
    public Integer getSpTrungGian() { return spTrungGian; }
    public void setSpTrungGian(Integer spTrungGian) { this.spTrungGian = spTrungGian; }
    public Integer getTpNhapKho() { return tpNhapKho; }
    public void setTpNhapKho(Integer tpNhapKho) { this.tpNhapKho = tpNhapKho; }
    public BigDecimal getBbc1_3() { return bbc1_3; }
    public void setBbc1_3(BigDecimal bbc1_3) { this.bbc1_3 = bbc1_3; }
    public BigDecimal getPcChiPhi() { return pcChiPhi; }
    public void setPcChiPhi(BigDecimal pcChiPhi) { this.pcChiPhi = pcChiPhi; }
    public BigDecimal getPlChiPhi() { return plChiPhi; }
    public void setPlChiPhi(BigDecimal plChiPhi) { this.plChiPhi = plChiPhi; }
    public BigDecimal getDgChiPhi() { return dgChiPhi; }
    public void setDgChiPhi(BigDecimal dgChiPhi) { this.dgChiPhi = dgChiPhi; }
    public BigDecimal getCcChiPhi() { return ccChiPhi; }
    public void setCcChiPhi(BigDecimal ccChiPhi) { this.ccChiPhi = ccChiPhi; }
    public BigDecimal getTemDb() { return temDb; }
    public void setTemDb(BigDecimal temDb) { this.temDb = temDb; }
    public BigDecimal getSlTrungBinh() { return slTrungBinh; }
    public void setSlTrungBinh(BigDecimal slTrungBinh) { this.slTrungBinh = slTrungBinh; }
    public Integer getPlQaLayMau() { return plQaLayMau; }
    public void setPlQaLayMau(Integer plQaLayMau) { this.plQaLayMau = plQaLayMau; }
    public Integer getDgQaLayMau() { return dgQaLayMau; }
    public void setDgQaLayMau(Integer dgQaLayMau) { this.dgQaLayMau = dgQaLayMau; }
    public String getMoTa() { return moTa; }
    public void setMoTa(String moTa) { this.moTa = moTa; }
    public String getGhiChuHieuSuat() { return ghiChuHieuSuat; }
    public void setGhiChuHieuSuat(String ghiChuHieuSuat) { this.ghiChuHieuSuat = ghiChuHieuSuat; }
    public String getLoaiSanPham() { return loaiSanPham; }
    public void setLoaiSanPham(String loaiSanPham) { this.loaiSanPham = loaiSanPham; }
    public String getToThucHien() { return toThucHien; }
    public void setToThucHien(String toThucHien) { this.toThucHien = toThucHien; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}
