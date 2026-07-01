package com.sanluong.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ProductionRecordDto {
    private Long id;
    private String maTp;
    private String maBravo;
    private String tienTrinh;
    private String lsx;
    private String maDonHang;
    private Integer soLuong;
    private String pcTrangThai;
    private String plTrangThai;
    private String dgTrangThai;
    private String bbc1TrangThai;
    private String bbc1_1;
    private String slPc;
    private String pcPl;
    private String dg2;
    private String bbc1_2;
    private Integer spTrungGian;
    private Integer tongBtp;
    private BigDecimal bbc1_3;
    private BigDecimal pcChiPhi;
    private BigDecimal plChiPhi;
    private BigDecimal dgChiPhi;
    private BigDecimal ccChiPhi;
    private BigDecimal sigmaCong;
    private BigDecimal temDb;
    private Integer doDangDg;
    private Integer tpNhapKho;
    private BigDecimal soSpCong;
    private BigDecimal slTrungBinh;
    private String moTa;
    private String ghiChuHieuSuat;
    // ── Hàng lỗi (auto-sync từ HangLoi) ──
    private BigDecimal hlSoLuongTraVe;
    private String hlLiDoTraVe;
    private String hlHuongXuLy;
    private String hlTrangThaiXuLy;
    private String hlLyDoChuaThucHien;
    private BigDecimal hlSlDatSauXuLy;
    private BigDecimal hlSlHuy;
    private Integer qaLayMau;
    private Integer plQaLayMau;
    private Integer plQaKiemNghiem;
    private Integer plQaLuuMau;
    private Integer plQaKhac;
    private Integer dgQaLayMau;
    private Integer dgQaKiemNghiem;
    private Integer dgQaLuuMau;
    private Integer dgQaKhac;
    private Boolean phatLenh;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getMaTp() { return maTp; }
    public void setMaTp(String maTp) { this.maTp = maTp; }
    public String getMaBravo() { return maBravo; }
    public void setMaBravo(String maBravo) { this.maBravo = maBravo; }
    public String getTienTrinh() { return tienTrinh; }
    public void setTienTrinh(String tienTrinh) { this.tienTrinh = tienTrinh; }
    public String getLsx() { return lsx; }
    public void setLsx(String lsx) { this.lsx = lsx; }
    public String getMaDonHang() { return maDonHang; }
    public void setMaDonHang(String maDonHang) { this.maDonHang = maDonHang; }
    public Integer getSoLuong() { return soLuong; }
    public void setSoLuong(Integer soLuong) { this.soLuong = soLuong; }
    public String getPcTrangThai() { return pcTrangThai; }
    public void setPcTrangThai(String pcTrangThai) { this.pcTrangThai = pcTrangThai; }
    public String getPlTrangThai() { return plTrangThai; }
    public void setPlTrangThai(String plTrangThai) { this.plTrangThai = plTrangThai; }
    public String getDgTrangThai() { return dgTrangThai; }
    public void setDgTrangThai(String dgTrangThai) { this.dgTrangThai = dgTrangThai; }
    public String getBbc1TrangThai() { return bbc1TrangThai; }
    public void setBbc1TrangThai(String bbc1TrangThai) { this.bbc1TrangThai = bbc1TrangThai; }
    public String getBbc1_1() { return bbc1_1; }
    public void setBbc1_1(String bbc1_1) { this.bbc1_1 = bbc1_1; }
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
    public Integer getTongBtp() { return tongBtp; }
    public void setTongBtp(Integer tongBtp) { this.tongBtp = tongBtp; }
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
    public BigDecimal getSigmaCong() { return sigmaCong; }
    public void setSigmaCong(BigDecimal sigmaCong) { this.sigmaCong = sigmaCong; }
    public BigDecimal getTemDb() { return temDb; }
    public void setTemDb(BigDecimal temDb) { this.temDb = temDb; }
    public Integer getDoDangDg() { return doDangDg; }
    public void setDoDangDg(Integer doDangDg) { this.doDangDg = doDangDg; }
    public Integer getTpNhapKho() { return tpNhapKho; }
    public void setTpNhapKho(Integer tpNhapKho) { this.tpNhapKho = tpNhapKho; }
    public BigDecimal getSoSpCong() { return soSpCong; }
    public void setSoSpCong(BigDecimal soSpCong) { this.soSpCong = soSpCong; }
    public BigDecimal getSlTrungBinh() { return slTrungBinh; }
    public void setSlTrungBinh(BigDecimal slTrungBinh) { this.slTrungBinh = slTrungBinh; }
    public String getMoTa() { return moTa; }
    public void setMoTa(String moTa) { this.moTa = moTa; }
    public String getGhiChuHieuSuat() { return ghiChuHieuSuat; }
    public void setGhiChuHieuSuat(String v) { this.ghiChuHieuSuat = v; }
    public BigDecimal getHlSoLuongTraVe() { return hlSoLuongTraVe; }
    public void setHlSoLuongTraVe(BigDecimal v) { this.hlSoLuongTraVe = v; }
    public String getHlLiDoTraVe() { return hlLiDoTraVe; }
    public void setHlLiDoTraVe(String v) { this.hlLiDoTraVe = v; }
    public String getHlHuongXuLy() { return hlHuongXuLy; }
    public void setHlHuongXuLy(String v) { this.hlHuongXuLy = v; }
    public String getHlTrangThaiXuLy() { return hlTrangThaiXuLy; }
    public void setHlTrangThaiXuLy(String v) { this.hlTrangThaiXuLy = v; }
    public String getHlLyDoChuaThucHien() { return hlLyDoChuaThucHien; }
    public void setHlLyDoChuaThucHien(String v) { this.hlLyDoChuaThucHien = v; }
    public BigDecimal getHlSlDatSauXuLy() { return hlSlDatSauXuLy; }
    public void setHlSlDatSauXuLy(BigDecimal v) { this.hlSlDatSauXuLy = v; }
    public BigDecimal getHlSlHuy() { return hlSlHuy; }
    public void setHlSlHuy(BigDecimal v) { this.hlSlHuy = v; }
    public Integer getQaLayMau() { return qaLayMau; }
    public void setQaLayMau(Integer qaLayMau) { this.qaLayMau = qaLayMau; }
    public Integer getPlQaLayMau() { return plQaLayMau; }
    public void setPlQaLayMau(Integer v) { this.plQaLayMau = v; }
    public Integer getPlQaKiemNghiem() { return plQaKiemNghiem; }
    public void setPlQaKiemNghiem(Integer v) { this.plQaKiemNghiem = v; }
    public Integer getPlQaLuuMau() { return plQaLuuMau; }
    public void setPlQaLuuMau(Integer v) { this.plQaLuuMau = v; }
    public Integer getPlQaKhac() { return plQaKhac; }
    public void setPlQaKhac(Integer v) { this.plQaKhac = v; }
    public Integer getDgQaLayMau() { return dgQaLayMau; }
    public void setDgQaLayMau(Integer v) { this.dgQaLayMau = v; }
    public Integer getDgQaKiemNghiem() { return dgQaKiemNghiem; }
    public void setDgQaKiemNghiem(Integer v) { this.dgQaKiemNghiem = v; }
    public Integer getDgQaLuuMau() { return dgQaLuuMau; }
    public void setDgQaLuuMau(Integer v) { this.dgQaLuuMau = v; }
    public Integer getDgQaKhac() { return dgQaKhac; }
    public void setDgQaKhac(Integer v) { this.dgQaKhac = v; }
    public Boolean getPhatLenh() { return phatLenh; }
    public void setPhatLenh(Boolean phatLenh) { this.phatLenh = phatLenh; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}
