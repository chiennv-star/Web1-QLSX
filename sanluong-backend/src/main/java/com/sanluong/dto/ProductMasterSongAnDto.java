package com.sanluong.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public class ProductMasterSongAnDto {
    private Long id;
    @NotBlank private String maTp;
    private String maBravo;
    private String tienTrinh;
    private String loaiSanPham;
    private BigDecimal khoiLuong;
    private BigDecimal slTrungBinh;
    private BigDecimal nangSuatPc;
    private BigDecimal nangSuatPl;
    private BigDecimal nangSuatBbc1;
    private String mayMocPc;
    private String mayMocPl;
    private String mayMocBbc1;
    private String mayMocDg;
    private String toNhomPcpl;
    private BigDecimal congGiaoNhan;
    private BigDecimal congBbc1;
    private BigDecimal congPc;
    private BigDecimal congPl;
    private BigDecimal congDg;
    private BigDecimal tongCongTp;
    private BigDecimal gnTrenSp;
    private BigDecimal bbc1TrenSp;
    private BigDecimal pcplTrenSp;
    private BigDecimal dgTrenSp;
    private Integer spTrenGn;
    private Integer spTrenBbc1;
    private Integer spTrenPc;
    private Integer spTrenPl;
    private Integer spTrenDg;

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
}
