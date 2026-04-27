package com.sanluong.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public class ProductMasterDto {
    private Long id;
    @NotBlank private String maTp;
    private String maBravo;
    private String tienTrinh;
    private BigDecimal slTrungBinh;
    private BigDecimal nangSuatPc;
    private BigDecimal nangSuatPl;
    private BigDecimal nangSuatBbc1;
    private String mayMocPc;
    private String mayMocPl;
    private String mayMocBbc1;
    private String mayMocDg;

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
}
