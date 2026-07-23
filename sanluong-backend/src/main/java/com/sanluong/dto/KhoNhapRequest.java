package com.sanluong.dto;

import java.time.LocalDate;

public class KhoNhapRequest {
    private String maHang;
    private String tenHang;
    private String viTri;
    private String soLo;
    private LocalDate hanDung;
    private Integer soLuong;
    private String dvt;

    public String getMaHang() { return maHang; }
    public void setMaHang(String v) { this.maHang = v; }
    public String getTenHang() { return tenHang; }
    public void setTenHang(String v) { this.tenHang = v; }
    public String getViTri() { return viTri; }
    public void setViTri(String v) { this.viTri = v; }
    public String getSoLo() { return soLo; }
    public void setSoLo(String v) { this.soLo = v; }
    public LocalDate getHanDung() { return hanDung; }
    public void setHanDung(LocalDate v) { this.hanDung = v; }
    public Integer getSoLuong() { return soLuong; }
    public void setSoLuong(Integer v) { this.soLuong = v; }
    public String getDvt() { return dvt; }
    public void setDvt(String v) { this.dvt = v; }
}
