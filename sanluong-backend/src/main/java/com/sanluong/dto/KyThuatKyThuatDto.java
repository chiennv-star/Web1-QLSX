package com.sanluong.dto;

import java.time.LocalDate;

public class KyThuatKyThuatDto {
    private LocalDate ngay;
    private String moTa;
    private String phanLoai;
    private String thietBi;
    private String mucDo;
    private String noiDung;
    private String ghiChu;
    private String nguyenNhan;
    private String bienPhap;
    private String trangThai;
    private String nguoiPhuTrach;

    public LocalDate getNgay() { return ngay; }
    public void setNgay(LocalDate v) { this.ngay = v; }
    public String getMoTa() { return moTa; }
    public void setMoTa(String v) { this.moTa = v; }
    public String getPhanLoai() { return phanLoai; }
    public void setPhanLoai(String v) { this.phanLoai = v; }
    public String getThietBi() { return thietBi; }
    public void setThietBi(String v) { this.thietBi = v; }
    public String getMucDo() { return mucDo; }
    public void setMucDo(String v) { this.mucDo = v; }
    public String getNoiDung() { return noiDung; }
    public void setNoiDung(String v) { this.noiDung = v; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String v) { this.ghiChu = v; }
    public String getNguyenNhan() { return nguyenNhan; }
    public void setNguyenNhan(String v) { this.nguyenNhan = v; }
    public String getBienPhap() { return bienPhap; }
    public void setBienPhap(String v) { this.bienPhap = v; }
    public String getTrangThai() { return trangThai; }
    public void setTrangThai(String v) { this.trangThai = v; }
    public String getNguoiPhuTrach() { return nguoiPhuTrach; }
    public void setNguoiPhuTrach(String v) { this.nguoiPhuTrach = v; }
}
