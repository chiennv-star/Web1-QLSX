package com.sanluong.dto;

import java.math.BigDecimal;

public class WorkEfficiencyDto {

    private BigDecimal soGioTruongCa;
    private BigDecimal soGioPhuMay;
    private Integer soLanDat;
    private Integer soLanKhongDat;
    private String toNhom;
    private String viTri;

    public BigDecimal getSoGioTruongCa() { return soGioTruongCa; }
    public void setSoGioTruongCa(BigDecimal soGioTruongCa) { this.soGioTruongCa = soGioTruongCa; }
    public BigDecimal getSoGioPhuMay() { return soGioPhuMay; }
    public void setSoGioPhuMay(BigDecimal soGioPhuMay) { this.soGioPhuMay = soGioPhuMay; }
    public Integer getSoLanDat() { return soLanDat; }
    public void setSoLanDat(Integer soLanDat) { this.soLanDat = soLanDat; }
    public Integer getSoLanKhongDat() { return soLanKhongDat; }
    public void setSoLanKhongDat(Integer soLanKhongDat) { this.soLanKhongDat = soLanKhongDat; }
    public String getToNhom() { return toNhom; }
    public void setToNhom(String toNhom) { this.toNhom = toNhom; }
    public String getViTri() { return viTri; }
    public void setViTri(String viTri) { this.viTri = viTri; }
}
