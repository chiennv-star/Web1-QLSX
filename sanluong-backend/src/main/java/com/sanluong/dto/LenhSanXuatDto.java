package com.sanluong.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class LenhSanXuatDto {

    private Long id;
    private Integer thuTu;
    private String maBravo;
    private String maSp;
    private String tenSanPham;
    private String soLo;
    private String maDonHang;
    private BigDecimal soLuong;
    private String tinhTrang;
    private String phongThucHien;
    private LocalDate ngayThucHien;
    private String toThucHien;
    private Integer soNguoiThucHien;
    private String chuY;
    private Boolean daLenLichLam;
    private String ghiChu;
    private Boolean daDgVaXepLichDg;
    private Boolean daBanHanh;
    private LocalDate ngayKetThuc;
    private LocalDate ngayPhatLenh;
    private LocalDateTime deletedAt;
    private String deletedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
    private Boolean hasKhoach;

    // ── Getters & Setters ──────────────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Integer getThuTu() { return thuTu; }
    public void setThuTu(Integer thuTu) { this.thuTu = thuTu; }
    public String getMaBravo() { return maBravo; }
    public void setMaBravo(String maBravo) { this.maBravo = maBravo; }
    public String getMaSp() { return maSp; }
    public void setMaSp(String maSp) { this.maSp = maSp; }
    public String getTenSanPham() { return tenSanPham; }
    public void setTenSanPham(String tenSanPham) { this.tenSanPham = tenSanPham; }
    public String getSoLo() { return soLo; }
    public void setSoLo(String soLo) { this.soLo = soLo; }
    public String getMaDonHang() { return maDonHang; }
    public void setMaDonHang(String maDonHang) { this.maDonHang = maDonHang; }
    public BigDecimal getSoLuong() { return soLuong; }
    public void setSoLuong(BigDecimal soLuong) { this.soLuong = soLuong; }
    public String getTinhTrang() { return tinhTrang; }
    public void setTinhTrang(String tinhTrang) { this.tinhTrang = tinhTrang; }
    public String getPhongThucHien() { return phongThucHien; }
    public void setPhongThucHien(String phongThucHien) { this.phongThucHien = phongThucHien; }
    public LocalDate getNgayThucHien() { return ngayThucHien; }
    public void setNgayThucHien(LocalDate ngayThucHien) { this.ngayThucHien = ngayThucHien; }
    public String getToThucHien() { return toThucHien; }
    public void setToThucHien(String toThucHien) { this.toThucHien = toThucHien; }
    public Integer getSoNguoiThucHien() { return soNguoiThucHien; }
    public void setSoNguoiThucHien(Integer soNguoiThucHien) { this.soNguoiThucHien = soNguoiThucHien; }
    public String getChuY() { return chuY; }
    public void setChuY(String chuY) { this.chuY = chuY; }
    public Boolean getDaLenLichLam() { return daLenLichLam; }
    public void setDaLenLichLam(Boolean daLenLichLam) { this.daLenLichLam = daLenLichLam; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String ghiChu) { this.ghiChu = ghiChu; }
    public Boolean getDaDgVaXepLichDg() { return daDgVaXepLichDg; }
    public void setDaDgVaXepLichDg(Boolean daDgVaXepLichDg) { this.daDgVaXepLichDg = daDgVaXepLichDg; }
    public Boolean getDaBanHanh() { return daBanHanh; }
    public void setDaBanHanh(Boolean daBanHanh) { this.daBanHanh = daBanHanh; }
    public LocalDate getNgayKetThuc() { return ngayKetThuc; }
    public void setNgayKetThuc(LocalDate ngayKetThuc) { this.ngayKetThuc = ngayKetThuc; }
    public LocalDate getNgayPhatLenh() { return ngayPhatLenh; }
    public void setNgayPhatLenh(LocalDate ngayPhatLenh) { this.ngayPhatLenh = ngayPhatLenh; }
    public LocalDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(LocalDateTime deletedAt) { this.deletedAt = deletedAt; }
    public String getDeletedBy() { return deletedBy; }
    public void setDeletedBy(String deletedBy) { this.deletedBy = deletedBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
    public Boolean getHasKhoach() { return hasKhoach; }
    public void setHasKhoach(Boolean hasKhoach) { this.hasKhoach = hasKhoach; }
}
