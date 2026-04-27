package com.sanluong.dto;

import java.math.BigDecimal;

public class WorkScheduleSessionDto {
    private Long id;
    private Long workScheduleId;
    private String ngay;
    private String thoiGianBatDau;
    private String thoiGianKetThuc;
    private String nhomThucHien;
    private String nguoiThucHien;
    private BigDecimal soGioThucHien;
    private BigDecimal congThucHien;
    private String ngayThucHien;
    private BigDecimal sanLuong;
    private BigDecimal nangSuat;
    private BigDecimal nangSuatTrungBinh;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getWorkScheduleId() { return workScheduleId; }
    public void setWorkScheduleId(Long workScheduleId) { this.workScheduleId = workScheduleId; }
    public String getNgay() { return ngay; }
    public void setNgay(String ngay) { this.ngay = ngay; }
    public String getThoiGianBatDau() { return thoiGianBatDau; }
    public void setThoiGianBatDau(String thoiGianBatDau) { this.thoiGianBatDau = thoiGianBatDau; }
    public String getThoiGianKetThuc() { return thoiGianKetThuc; }
    public void setThoiGianKetThuc(String thoiGianKetThuc) { this.thoiGianKetThuc = thoiGianKetThuc; }
    public String getNhomThucHien() { return nhomThucHien; }
    public void setNhomThucHien(String nhomThucHien) { this.nhomThucHien = nhomThucHien; }
    public String getNguoiThucHien() { return nguoiThucHien; }
    public void setNguoiThucHien(String nguoiThucHien) { this.nguoiThucHien = nguoiThucHien; }
    public BigDecimal getSoGioThucHien() { return soGioThucHien; }
    public void setSoGioThucHien(BigDecimal soGioThucHien) { this.soGioThucHien = soGioThucHien; }
    public BigDecimal getCongThucHien() { return congThucHien; }
    public void setCongThucHien(BigDecimal congThucHien) { this.congThucHien = congThucHien; }
    public String getNgayThucHien() { return ngayThucHien; }
    public void setNgayThucHien(String ngayThucHien) { this.ngayThucHien = ngayThucHien; }
    public BigDecimal getSanLuong() { return sanLuong; }
    public void setSanLuong(BigDecimal sanLuong) { this.sanLuong = sanLuong; }
    public BigDecimal getNangSuat() { return nangSuat; }
    public void setNangSuat(BigDecimal nangSuat) { this.nangSuat = nangSuat; }
    public BigDecimal getNangSuatTrungBinh() { return nangSuatTrungBinh; }
    public void setNangSuatTrungBinh(BigDecimal nangSuatTrungBinh) { this.nangSuatTrungBinh = nangSuatTrungBinh; }
    private String vaiTro;
    private String ghiChu;
    private String khac;
    public String getVaiTro() { return vaiTro; }
    public void setVaiTro(String vaiTro) { this.vaiTro = vaiTro; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String ghiChu) { this.ghiChu = ghiChu; }
    public String getKhac() { return khac; }
    public void setKhac(String khac) { this.khac = khac; }
}
