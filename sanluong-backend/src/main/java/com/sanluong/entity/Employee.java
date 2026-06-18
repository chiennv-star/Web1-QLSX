package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employees")
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_nhan_vien", length = 50, nullable = false)
    private String maNhanVien;

    @Column(name = "ho_va_ten", length = 200, nullable = false)
    private String hoVaTen;

    @Column(name = "vi_tri", length = 100)
    private String viTri;

    @Column(name = "hoc_van", length = 100)
    private String hocVan;

    @Column(name = "to_nhom", length = 100, nullable = false)
    private String toNhom;

    @Column(name = "nhom", length = 100)
    private String nhom;

    @Column(name = "ngay_sinh")
    private LocalDate ngaySinh;

    @Column(name = "thoi_gian_vao_cong_ty")
    private LocalDate thoiGianVaoCongTy;

    @Column(name = "ngay_nghi_viec")
    private LocalDate ngayNghiViec;

    @Column(name = "tinh_trang", length = 50)
    private String tinhTrang;

    @Column(name = "sdt", length = 20)
    private String sdt;

    @Column(name = "dia_chi", length = 500)
    private String diaChi;

    @Column(name = "ghi_chu", length = 500)
    private String ghiChu;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    public Employee() {}

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
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
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}
