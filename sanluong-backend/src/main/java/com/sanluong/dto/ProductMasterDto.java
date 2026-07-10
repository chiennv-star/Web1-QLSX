package com.sanluong.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public class ProductMasterDto {
    private Long id;
    @NotBlank private String maTp;
    private String maBravo;
    private String tienTrinh;
    private BigDecimal spCong;
    private BigDecimal slTrungBinh;
    private BigDecimal nangSuatPc;
    private BigDecimal nangSuatPl;
    private BigDecimal nangSuatBbc1;
    private String mayMocPc;
    private Integer tocDoMayPc;
    private String mayMocPl;
    private Integer tocDoMayPl;
    private String mayMocBbc1;
    private Integer tocDoMayBbc1;
    private String mayMocDg;
    private Integer tocDoMayDg;
    private String loaiSanPham;
    private BigDecimal khoiLuong;
    private String toNhomPcpl;
    private String ghiChu;
    private String nangSuatPcMe;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getMaTp() { return maTp; }
    public void setMaTp(String maTp) { this.maTp = maTp; }
    public String getMaBravo() { return maBravo; }
    public void setMaBravo(String maBravo) { this.maBravo = maBravo; }
    public String getTienTrinh() { return tienTrinh; }
    public void setTienTrinh(String tienTrinh) { this.tienTrinh = tienTrinh; }
    public BigDecimal getSpCong() { return spCong; }
    public void setSpCong(BigDecimal spCong) { this.spCong = spCong; }
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
    public BigDecimal getKhoiLuong() { return khoiLuong; }
    public void setKhoiLuong(BigDecimal khoiLuong) { this.khoiLuong = khoiLuong; }
    public String getToNhomPcpl() { return toNhomPcpl; }
    public void setToNhomPcpl(String toNhomPcpl) { this.toNhomPcpl = toNhomPcpl; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String ghiChu) { this.ghiChu = ghiChu; }
    public String getNangSuatPcMe() { return nangSuatPcMe; }
    public void setNangSuatPcMe(String nangSuatPcMe) { this.nangSuatPcMe = nangSuatPcMe; }
}
