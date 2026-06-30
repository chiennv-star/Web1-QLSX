package com.sanluong.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public class EmployeeDto {

    @NotBlank(message = "Mã nhân viên không được để trống")
    private String maNhanVien;

    @NotBlank(message = "Họ và tên không được để trống")
    private String hoVaTen;

    private String viTri;

    private String hocVan;

    @NotBlank(message = "Tổ/Nhóm không được để trống")
    private String toNhom;

    private String toNhom2;

    private String nhom;

    private LocalDate ngaySinh;

    private LocalDate thoiGianVaoCongTy;

    private LocalDate ngayNghiViec;

    private String tinhTrang;

    private String sdt;

    private String diaChi;

    private String ghiChu;

    public String getMaNhanVien() { return maNhanVien; }
    public void setMaNhanVien(String maNhanVien) { this.maNhanVien = maNhanVien; }
    public String getHoVaTen() { return hoVaTen; }
    public void setHoVaTen(String hoVaTen) { this.hoVaTen = hoVaTen; }
    public String getViTri() { return viTri; }
    public void setViTri(String viTri) { this.viTri = viTri; }
    public String getHocVan() { return hocVan; }
    public void setHocVan(String hocVan) { this.hocVan = hocVan; }
    public String getToNhom() { return toNhom; }
    public void setToNhom(String toNhom) { this.toNhom = toNhom; }
    public String getToNhom2() { return toNhom2; }
    public void setToNhom2(String toNhom2) { this.toNhom2 = toNhom2; }
    public String getNhom() { return nhom; }
    public void setNhom(String nhom) { this.nhom = nhom; }
    public LocalDate getNgaySinh() { return ngaySinh; }
    public void setNgaySinh(LocalDate ngaySinh) { this.ngaySinh = ngaySinh; }
    public LocalDate getThoiGianVaoCongTy() { return thoiGianVaoCongTy; }
    public void setThoiGianVaoCongTy(LocalDate thoiGianVaoCongTy) { this.thoiGianVaoCongTy = thoiGianVaoCongTy; }
    public LocalDate getNgayNghiViec() { return ngayNghiViec; }
    public void setNgayNghiViec(LocalDate ngayNghiViec) { this.ngayNghiViec = ngayNghiViec; }
    public String getTinhTrang() { return tinhTrang; }
    public void setTinhTrang(String tinhTrang) { this.tinhTrang = tinhTrang; }
    public String getSdt() { return sdt; }
    public void setSdt(String sdt) { this.sdt = sdt; }
    public String getDiaChi() { return diaChi; }
    public void setDiaChi(String diaChi) { this.diaChi = diaChi; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String ghiChu) { this.ghiChu = ghiChu; }
}
