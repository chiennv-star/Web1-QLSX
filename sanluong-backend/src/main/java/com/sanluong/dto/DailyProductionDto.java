package com.sanluong.dto;

import java.math.BigDecimal;

public class DailyProductionDto {
    private Long sessionId;
    private Long workScheduleId;
    private String ngay;
    private String congDoan;
    private String maSp;
    private String tenTrinh;
    private String soLo;
    private String toNhom;
    private String nhomThucHien;
    private String nguoiThucHien;
    private String maNhanVien;
    private String caSanXuat;
    private String vaiTro;
    private String thoiGianBatDau;
    private BigDecimal sanLuong;
    private BigDecimal requestedValue;   // newValue của change request (khi status=PENDING)
    private BigDecimal congThucHien;
    private BigDecimal nangSuat;
    private BigDecimal nangSuatTrungBinh;
    private String status;        // "SAVED" | "PENDING" | "IN_PROGRESS"
    private Long requestId;       // ID của SlChangeRequest (khi PENDING)
    private String requestedBy;
    private String requestedAt;
    private Integer soNguoi;      // số người thực hiện trong ngày
    private String nguoiThucHienList; // danh sách người TH, cách nhau dấu phẩy

    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }
    public Long getWorkScheduleId() { return workScheduleId; }
    public void setWorkScheduleId(Long workScheduleId) { this.workScheduleId = workScheduleId; }
    public String getNgay() { return ngay; }
    public void setNgay(String ngay) { this.ngay = ngay; }
    public String getCongDoan() { return congDoan; }
    public void setCongDoan(String congDoan) { this.congDoan = congDoan; }
    public String getMaSp() { return maSp; }
    public void setMaSp(String maSp) { this.maSp = maSp; }
    public String getTenTrinh() { return tenTrinh; }
    public void setTenTrinh(String tenTrinh) { this.tenTrinh = tenTrinh; }
    public String getSoLo() { return soLo; }
    public void setSoLo(String soLo) { this.soLo = soLo; }
    public String getToNhom() { return toNhom; }
    public void setToNhom(String toNhom) { this.toNhom = toNhom; }
    public String getNhomThucHien() { return nhomThucHien; }
    public void setNhomThucHien(String nhomThucHien) { this.nhomThucHien = nhomThucHien; }
    public String getNguoiThucHien() { return nguoiThucHien; }
    public void setNguoiThucHien(String nguoiThucHien) { this.nguoiThucHien = nguoiThucHien; }
    public String getMaNhanVien() { return maNhanVien; }
    public void setMaNhanVien(String maNhanVien) { this.maNhanVien = maNhanVien; }
    public String getCaSanXuat() { return caSanXuat; }
    public void setCaSanXuat(String caSanXuat) { this.caSanXuat = caSanXuat; }
    public String getVaiTro() { return vaiTro; }
    public void setVaiTro(String vaiTro) { this.vaiTro = vaiTro; }
    public String getThoiGianBatDau() { return thoiGianBatDau; }
    public void setThoiGianBatDau(String thoiGianBatDau) { this.thoiGianBatDau = thoiGianBatDau; }
    public BigDecimal getSanLuong() { return sanLuong; }
    public void setSanLuong(BigDecimal sanLuong) { this.sanLuong = sanLuong; }
    public BigDecimal getRequestedValue() { return requestedValue; }
    public void setRequestedValue(BigDecimal requestedValue) { this.requestedValue = requestedValue; }
    public BigDecimal getCongThucHien() { return congThucHien; }
    public void setCongThucHien(BigDecimal congThucHien) { this.congThucHien = congThucHien; }
    public BigDecimal getNangSuat() { return nangSuat; }
    public void setNangSuat(BigDecimal nangSuat) { this.nangSuat = nangSuat; }
    public BigDecimal getNangSuatTrungBinh() { return nangSuatTrungBinh; }
    public void setNangSuatTrungBinh(BigDecimal nangSuatTrungBinh) { this.nangSuatTrungBinh = nangSuatTrungBinh; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Long getRequestId() { return requestId; }
    public void setRequestId(Long requestId) { this.requestId = requestId; }
    public String getRequestedBy() { return requestedBy; }
    public void setRequestedBy(String requestedBy) { this.requestedBy = requestedBy; }
    public String getRequestedAt() { return requestedAt; }
    public void setRequestedAt(String requestedAt) { this.requestedAt = requestedAt; }
    public Integer getSoNguoi() { return soNguoi; }
    public void setSoNguoi(Integer soNguoi) { this.soNguoi = soNguoi; }
    public String getNguoiThucHienList() { return nguoiThucHienList; }
    public void setNguoiThucHienList(String nguoiThucHienList) { this.nguoiThucHienList = nguoiThucHienList; }
}
