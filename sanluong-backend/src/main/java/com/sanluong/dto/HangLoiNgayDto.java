package com.sanluong.dto;

import java.math.BigDecimal;

public class HangLoiNgayDto {
    private String ngay;
    private BigDecimal slTraVe;
    private BigDecimal slDatSauXuLy;
    private BigDecimal slHuy;
    private String ghiChu;

    public String getNgay() { return ngay; }
    public void setNgay(String ngay) { this.ngay = ngay; }
    public BigDecimal getSlTraVe() { return slTraVe; }
    public void setSlTraVe(BigDecimal slTraVe) { this.slTraVe = slTraVe; }
    public BigDecimal getSlDatSauXuLy() { return slDatSauXuLy; }
    public void setSlDatSauXuLy(BigDecimal slDatSauXuLy) { this.slDatSauXuLy = slDatSauXuLy; }
    public BigDecimal getSlHuy() { return slHuy; }
    public void setSlHuy(BigDecimal slHuy) { this.slHuy = slHuy; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String ghiChu) { this.ghiChu = ghiChu; }
}
