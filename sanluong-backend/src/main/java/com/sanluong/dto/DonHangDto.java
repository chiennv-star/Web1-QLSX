package com.sanluong.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class DonHangDto {

    private Long id;
    private Integer thuTu;
    private String maBravo;
    private String maSp;
    private String tenSanPham;
    private String soLo;
    private String maDonHang;
    private LocalDate ngayDatHang;
    private BigDecimal soLuongDatHang;
    private String tinhTrangDatHang;
    private BigDecimal soLuongDaXepKh;
    private BigDecimal soLuongConLai;      // computed: datHang - daXepKh
    private String tinhTrangSx;
    private LocalDate ngayPhatLenh;
    private Boolean daLenLichLam;
    private String ghiChu;
    private Boolean daDgVaXepLichDg;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;
    private String trangThaiDuyet;
    private LocalDateTime deletedAt;
    private String deletedBy;

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
    public LocalDate getNgayDatHang() { return ngayDatHang; }
    public void setNgayDatHang(LocalDate ngayDatHang) { this.ngayDatHang = ngayDatHang; }
    public BigDecimal getSoLuongDatHang() { return soLuongDatHang; }
    public void setSoLuongDatHang(BigDecimal soLuongDatHang) { this.soLuongDatHang = soLuongDatHang; }
    public String getTinhTrangDatHang() { return tinhTrangDatHang; }
    public void setTinhTrangDatHang(String tinhTrangDatHang) { this.tinhTrangDatHang = tinhTrangDatHang; }
    public BigDecimal getSoLuongDaXepKh() { return soLuongDaXepKh; }
    public void setSoLuongDaXepKh(BigDecimal soLuongDaXepKh) { this.soLuongDaXepKh = soLuongDaXepKh; }
    public BigDecimal getSoLuongConLai() { return soLuongConLai; }
    public void setSoLuongConLai(BigDecimal soLuongConLai) { this.soLuongConLai = soLuongConLai; }
    public String getTinhTrangSx() { return tinhTrangSx; }
    public void setTinhTrangSx(String tinhTrangSx) { this.tinhTrangSx = tinhTrangSx; }
    public LocalDate getNgayPhatLenh() { return ngayPhatLenh; }
    public void setNgayPhatLenh(LocalDate ngayPhatLenh) { this.ngayPhatLenh = ngayPhatLenh; }
    public Boolean getDaLenLichLam() { return daLenLichLam; }
    public void setDaLenLichLam(Boolean daLenLichLam) { this.daLenLichLam = daLenLichLam; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String ghiChu) { this.ghiChu = ghiChu; }
    public Boolean getDaDgVaXepLichDg() { return daDgVaXepLichDg; }
    public void setDaDgVaXepLichDg(Boolean daDgVaXepLichDg) { this.daDgVaXepLichDg = daDgVaXepLichDg; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime v) { this.updatedAt = v; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String v) { this.createdBy = v; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String v) { this.updatedBy = v; }
    public String getTrangThaiDuyet() { return trangThaiDuyet; }
    public void setTrangThaiDuyet(String v) { this.trangThaiDuyet = v; }
    public LocalDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(LocalDateTime v) { this.deletedAt = v; }
    public String getDeletedBy() { return deletedBy; }
    public void setDeletedBy(String v) { this.deletedBy = v; }
}
