package com.sanluong.dto;

import java.math.BigDecimal;

public class EmployeeEfficiencyReportDto {
    private Long   weId;           // WorkEfficiency entity ID — dùng để edit
    private String maNhanVien;
    private String hoVaTen;
    private String toNhom;
    private String viTri;
    private long   soCa;            // tổng số phiên làm việc
    private long   soCaTruong;      // số phiên giữ vai trưởng ca
    private BigDecimal tongCong;    // Σ congThucHien
    private BigDecimal tongSanLuong;
    private BigDecimal nangSuatTB;  // TB nangSuat (null nếu không có)
    private long   soLanDat;        // nangSuat >= nangSuatTrungBinh
    private long   soLanKhongDat;   // nangSuat <  nangSuatTrungBinh

    public Long getWeId() { return weId; }
    public void setWeId(Long v) { this.weId = v; }
    public String getMaNhanVien() { return maNhanVien; }
    public void setMaNhanVien(String v) { this.maNhanVien = v; }
    public String getHoVaTen() { return hoVaTen; }
    public void setHoVaTen(String v) { this.hoVaTen = v; }
    public String getToNhom() { return toNhom; }
    public void setToNhom(String v) { this.toNhom = v; }
    public String getViTri() { return viTri; }
    public void setViTri(String v) { this.viTri = v; }
    public long getSoCa() { return soCa; }
    public void setSoCa(long v) { this.soCa = v; }
    public long getSoCaTruong() { return soCaTruong; }
    public void setSoCaTruong(long v) { this.soCaTruong = v; }
    public BigDecimal getTongCong() { return tongCong; }
    public void setTongCong(BigDecimal v) { this.tongCong = v; }
    public BigDecimal getTongSanLuong() { return tongSanLuong; }
    public void setTongSanLuong(BigDecimal v) { this.tongSanLuong = v; }
    public BigDecimal getNangSuatTB() { return nangSuatTB; }
    public void setNangSuatTB(BigDecimal v) { this.nangSuatTB = v; }
    public long getSoLanDat() { return soLanDat; }
    public void setSoLanDat(long v) { this.soLanDat = v; }
    public long getSoLanKhongDat() { return soLanKhongDat; }
    public void setSoLanKhongDat(long v) { this.soLanKhongDat = v; }
}
