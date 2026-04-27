package com.sanluong.dto;

import java.time.LocalDate;

public class FactoryPlanDto {

    private LocalDate ngayThucHien;
    private String maSp;
    private String tenSanPham;
    private String soLo;
    private String toThucHien;
    private String tinhTrang;
    private String mayThucHien;
    private String phongThucHien;
    private Integer soNguoiThucHien;
    private String ghiChu;

    public LocalDate getNgayThucHien() { return ngayThucHien; }
    public void setNgayThucHien(LocalDate ngayThucHien) { this.ngayThucHien = ngayThucHien; }
    public String getMaSp() { return maSp; }
    public void setMaSp(String maSp) { this.maSp = maSp; }
    public String getTenSanPham() { return tenSanPham; }
    public void setTenSanPham(String tenSanPham) { this.tenSanPham = tenSanPham; }
    public String getSoLo() { return soLo; }
    public void setSoLo(String soLo) { this.soLo = soLo; }
    public String getToThucHien() { return toThucHien; }
    public void setToThucHien(String toThucHien) { this.toThucHien = toThucHien; }
    public String getTinhTrang() { return tinhTrang; }
    public void setTinhTrang(String tinhTrang) { this.tinhTrang = tinhTrang; }
    public String getMayThucHien() { return mayThucHien; }
    public void setMayThucHien(String mayThucHien) { this.mayThucHien = mayThucHien; }
    public String getPhongThucHien() { return phongThucHien; }
    public void setPhongThucHien(String phongThucHien) { this.phongThucHien = phongThucHien; }
    public Integer getSoNguoiThucHien() { return soNguoiThucHien; }
    public void setSoNguoiThucHien(Integer soNguoiThucHien) { this.soNguoiThucHien = soNguoiThucHien; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String ghiChu) { this.ghiChu = ghiChu; }
}
