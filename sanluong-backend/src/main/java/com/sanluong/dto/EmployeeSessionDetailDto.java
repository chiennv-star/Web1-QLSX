package com.sanluong.dto;

import java.math.BigDecimal;

public class EmployeeSessionDetailDto {
    private Long id;
    private Long workScheduleId;
    private String ngay;
    private String ngayThucHien;
    private String maSp;
    private String tenTrinh;
    private String soLo;
    private String vaiTro;
    private String thoiGianBatDau;
    private String maNhanVien;
    private String nguoiThucHien;
    private String nhomThucHien;
    private String caSanXuat;
    private String phongThucHien;
    private BigDecimal congThucHien;
    private BigDecimal sanLuong;
    private BigDecimal nangSuat;
    private BigDecimal nangSuatTrungBinh;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getWorkScheduleId() { return workScheduleId; }
    public void setWorkScheduleId(Long v) { this.workScheduleId = v; }
    public String getMaNhanVien() { return maNhanVien; }
    public void setMaNhanVien(String v) { this.maNhanVien = v; }
    public String getNguoiThucHien() { return nguoiThucHien; }
    public void setNguoiThucHien(String v) { this.nguoiThucHien = v; }
    public String getNhomThucHien() { return nhomThucHien; }
    public void setNhomThucHien(String v) { this.nhomThucHien = v; }
    public String getNgay() { return ngay; }
    public void setNgay(String ngay) { this.ngay = ngay; }
    public String getNgayThucHien() { return ngayThucHien; }
    public void setNgayThucHien(String ngayThucHien) { this.ngayThucHien = ngayThucHien; }
    public String getMaSp() { return maSp; }
    public void setMaSp(String maSp) { this.maSp = maSp; }
    public String getTenTrinh() { return tenTrinh; }
    public void setTenTrinh(String tenTrinh) { this.tenTrinh = tenTrinh; }
    public String getSoLo() { return soLo; }
    public void setSoLo(String soLo) { this.soLo = soLo; }
    public String getVaiTro() { return vaiTro; }
    public void setVaiTro(String vaiTro) { this.vaiTro = vaiTro; }
    public String getCaSanXuat() { return caSanXuat; }
    public void setCaSanXuat(String caSanXuat) { this.caSanXuat = caSanXuat; }
    public String getPhongThucHien() { return phongThucHien; }
    public void setPhongThucHien(String phongThucHien) { this.phongThucHien = phongThucHien; }
    public String getThoiGianBatDau() { return thoiGianBatDau; }
    public void setThoiGianBatDau(String thoiGianBatDau) { this.thoiGianBatDau = thoiGianBatDau; }
    public BigDecimal getCongThucHien() { return congThucHien; }
    public void setCongThucHien(BigDecimal congThucHien) { this.congThucHien = congThucHien; }
    public BigDecimal getSanLuong() { return sanLuong; }
    public void setSanLuong(BigDecimal sanLuong) { this.sanLuong = sanLuong; }
    public BigDecimal getNangSuat() { return nangSuat; }
    public void setNangSuat(BigDecimal nangSuat) { this.nangSuat = nangSuat; }
    public BigDecimal getNangSuatTrungBinh() { return nangSuatTrungBinh; }
    public void setNangSuatTrungBinh(BigDecimal nangSuatTrungBinh) { this.nangSuatTrungBinh = nangSuatTrungBinh; }
}
