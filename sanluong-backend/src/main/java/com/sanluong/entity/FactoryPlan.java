package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "factory_plan")
public class FactoryPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ngay_thuc_hien")
    private LocalDate ngayThucHien;

    @Column(name = "ma_sp", length = 50)
    private String maSp;

    @Column(name = "ten_san_pham", length = 500)
    private String tenSanPham;

    @Column(name = "so_lo", length = 50)
    private String soLo;

    // PCPL1 | PCPL2 | PCPL3 | BBC1 | ĐG
    @Column(name = "to_thuc_hien", length = 20)
    private String toThucHien;

    @Column(name = "tinh_trang", length = 50)
    private String tinhTrang;

    @Column(name = "may_thuc_hien", length = 100)
    private String mayThucHien;

    @Column(name = "phong_thuc_hien", length = 100)
    private String phongThucHien;

    @Column(name = "so_nguoi_thuc_hien")
    private Integer soNguoiThucHien;

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

    public FactoryPlan() {}

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
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}
