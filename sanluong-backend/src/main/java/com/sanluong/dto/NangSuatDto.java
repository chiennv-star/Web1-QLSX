package com.sanluong.dto;

import java.math.BigDecimal;

public class NangSuatDto {
    private Long id;
    private String maSanPham;
    private String tenSanPham;
    private String dangBaoChe;
    private String toPcpl;
    private BigDecimal spBbc1;
    private BigDecimal spPc;
    private BigDecimal spPl;
    private BigDecimal spDg;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getMaSanPham() { return maSanPham; }
    public void setMaSanPham(String maSanPham) { this.maSanPham = maSanPham; }
    public String getTenSanPham() { return tenSanPham; }
    public void setTenSanPham(String tenSanPham) { this.tenSanPham = tenSanPham; }
    public String getDangBaoChe() { return dangBaoChe; }
    public void setDangBaoChe(String dangBaoChe) { this.dangBaoChe = dangBaoChe; }
    public String getToPcpl() { return toPcpl; }
    public void setToPcpl(String toPcpl) { this.toPcpl = toPcpl; }
    public BigDecimal getSpBbc1() { return spBbc1; }
    public void setSpBbc1(BigDecimal spBbc1) { this.spBbc1 = spBbc1; }
    public BigDecimal getSpPc() { return spPc; }
    public void setSpPc(BigDecimal spPc) { this.spPc = spPc; }
    public BigDecimal getSpPl() { return spPl; }
    public void setSpPl(BigDecimal spPl) { this.spPl = spPl; }
    public BigDecimal getSpDg() { return spDg; }
    public void setSpDg(BigDecimal spDg) { this.spDg = spDg; }
}
