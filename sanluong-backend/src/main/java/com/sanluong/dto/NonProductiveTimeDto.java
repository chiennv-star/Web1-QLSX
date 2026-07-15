package com.sanluong.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class NonProductiveTimeDto {
    private LocalDate ngay;
    private String hoatDong;
    private String toThucHien;
    private String nguoiThucHien;
    private BigDecimal gio;
    private String phanLoai;
    private String ghiChu;

    public LocalDate getNgay() { return ngay; }
    public void setNgay(LocalDate ngay) { this.ngay = ngay; }
    public String getHoatDong() { return hoatDong; }
    public void setHoatDong(String hoatDong) { this.hoatDong = hoatDong; }
    public String getToThucHien() { return toThucHien; }
    public void setToThucHien(String toThucHien) { this.toThucHien = toThucHien; }
    public String getNguoiThucHien() { return nguoiThucHien; }
    public void setNguoiThucHien(String nguoiThucHien) { this.nguoiThucHien = nguoiThucHien; }
    public BigDecimal getGio() { return gio; }
    public void setGio(BigDecimal gio) { this.gio = gio; }
    public String getPhanLoai() { return phanLoai; }
    public void setPhanLoai(String phanLoai) { this.phanLoai = phanLoai; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String ghiChu) { this.ghiChu = ghiChu; }
}
