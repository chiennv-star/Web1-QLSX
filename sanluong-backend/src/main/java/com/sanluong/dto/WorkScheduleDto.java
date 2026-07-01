package com.sanluong.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public class WorkScheduleDto {
    private Long id;
    private String source;
    private String congDoan;
    @NotNull private LocalDate ngayThucHien;
    private String maBravo;
    private String maSp;
    private String tenTrinh;
    private String soLo;
    private String maDonHang;
    private BigDecimal coLo;
    private String toNhom;
    private String phongThucHien;
    private String truongCa;
    private String nguoiHoTro;
    private String chuY;
    private String saiLech;
    private String tinhTrang;
    private BigDecimal slPc;
    private BigDecimal congPc;
    private BigDecimal slBbc1;
    private BigDecimal congBbc1;
    private BigDecimal slPl;
    private BigDecimal congPl;
    private BigDecimal slDg;
    private BigDecimal congDg;
    private BigDecimal slCc;
    private BigDecimal congCc;
    private Integer qaLayMau;
    private Integer qaKiemNghiem;
    private Integer qaLuuMau;
    private Integer qaKhac;
    private boolean isPlanned = false;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public boolean isPlanned() { return isPlanned; }
    public void setPlanned(boolean isPlanned) { this.isPlanned = isPlanned; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getCongDoan() { return congDoan; }
    public void setCongDoan(String congDoan) { this.congDoan = congDoan; }
    public LocalDate getNgayThucHien() { return ngayThucHien; }
    public void setNgayThucHien(LocalDate ngayThucHien) { this.ngayThucHien = ngayThucHien; }
    public String getMaBravo() { return maBravo; }
    public void setMaBravo(String maBravo) { this.maBravo = maBravo; }
    public String getMaSp() { return maSp; }
    public void setMaSp(String maSp) { this.maSp = maSp; }
    public String getTenTrinh() { return tenTrinh; }
    public void setTenTrinh(String tenTrinh) { this.tenTrinh = tenTrinh; }
    public String getSoLo() { return soLo; }
    public void setSoLo(String soLo) { this.soLo = soLo; }
    public String getMaDonHang() { return maDonHang; }
    public void setMaDonHang(String maDonHang) { this.maDonHang = maDonHang; }
    public BigDecimal getCoLo() { return coLo; }
    public void setCoLo(BigDecimal coLo) { this.coLo = coLo; }
    public String getToNhom() { return toNhom; }
    public void setToNhom(String toNhom) { this.toNhom = toNhom; }
    public String getPhongThucHien() { return phongThucHien; }
    public void setPhongThucHien(String phongThucHien) { this.phongThucHien = phongThucHien; }
    public String getTruongCa() { return truongCa; }
    public void setTruongCa(String truongCa) { this.truongCa = truongCa; }
    public String getNguoiHoTro() { return nguoiHoTro; }
    public void setNguoiHoTro(String nguoiHoTro) { this.nguoiHoTro = nguoiHoTro; }
    public String getChuY() { return chuY; }
    public void setChuY(String chuY) { this.chuY = chuY; }
    public String getSaiLech() { return saiLech; }
    public void setSaiLech(String saiLech) { this.saiLech = saiLech; }
    public String getTinhTrang() { return tinhTrang; }
    public void setTinhTrang(String tinhTrang) { this.tinhTrang = tinhTrang; }
    public BigDecimal getSlPc() { return slPc; }
    public void setSlPc(BigDecimal slPc) { this.slPc = slPc; }
    public BigDecimal getCongPc() { return congPc; }
    public void setCongPc(BigDecimal congPc) { this.congPc = congPc; }
    public BigDecimal getSlBbc1() { return slBbc1; }
    public void setSlBbc1(BigDecimal slBbc1) { this.slBbc1 = slBbc1; }
    public BigDecimal getCongBbc1() { return congBbc1; }
    public void setCongBbc1(BigDecimal congBbc1) { this.congBbc1 = congBbc1; }
    public BigDecimal getSlPl() { return slPl; }
    public void setSlPl(BigDecimal slPl) { this.slPl = slPl; }
    public BigDecimal getCongPl() { return congPl; }
    public void setCongPl(BigDecimal congPl) { this.congPl = congPl; }
    public BigDecimal getSlDg() { return slDg; }
    public void setSlDg(BigDecimal slDg) { this.slDg = slDg; }
    public BigDecimal getCongDg() { return congDg; }
    public void setCongDg(BigDecimal congDg) { this.congDg = congDg; }
    public BigDecimal getSlCc() { return slCc; }
    public void setSlCc(BigDecimal slCc) { this.slCc = slCc; }
    public BigDecimal getCongCc() { return congCc; }
    public void setCongCc(BigDecimal congCc) { this.congCc = congCc; }
    public Integer getQaLayMau() { return qaLayMau; }
    public void setQaLayMau(Integer qaLayMau) { this.qaLayMau = qaLayMau; }
    public Integer getQaKiemNghiem() { return qaKiemNghiem; }
    public void setQaKiemNghiem(Integer qaKiemNghiem) { this.qaKiemNghiem = qaKiemNghiem; }
    public Integer getQaLuuMau() { return qaLuuMau; }
    public void setQaLuuMau(Integer qaLuuMau) { this.qaLuuMau = qaLuuMau; }
    public Integer getQaKhac() { return qaKhac; }
    public void setQaKhac(Integer qaKhac) { this.qaKhac = qaKhac; }
}
