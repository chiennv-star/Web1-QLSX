package com.sanluong.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "non_productive_time")
public class NonProductiveTime {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Tab công đoạn (PCPL1/PCPL2/BBC1/PL/DG...) — phạm vi hiển thị của bản ghi
    @Column(name = "cong_doan", length = 20, nullable = false)
    private String congDoan;

    @Column(name = "ngay", nullable = false)
    private LocalDate ngay;

    @Column(name = "hoat_dong", length = 255, nullable = false)
    private String hoatDong;

    @Column(name = "to_thuc_hien", length = 20)
    private String toThucHien;

    @Column(name = "nguoi_thuc_hien", length = 100)
    private String nguoiThucHien;

    @Column(name = "gio", precision = 8, scale = 2)
    private BigDecimal gio;

    @Column(name = "cong", precision = 8, scale = 3)
    private BigDecimal cong;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // null = bản ghi từ StageTab; non-null = bản ghi từ WorkDetailDrawer (per-schedule)
    @Column(name = "work_schedule_id")
    private Long workScheduleId;

    @Column(name = "phan_loai", length = 50)
    private String phanLoai;

    @Column(name = "ghi_chu", length = 500)
    private String ghiChu;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public NonProductiveTime() {}

    @PrePersist
    void prePersist() { createdAt = LocalDateTime.now(); updatedAt = LocalDateTime.now(); }

    @PreUpdate
    void preUpdate() { updatedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCongDoan() { return congDoan; }
    public void setCongDoan(String congDoan) { this.congDoan = congDoan; }
    public LocalDate getNgay() { return ngay; }
    public void setNgay(LocalDate ngay) { this.ngay = ngay; }
    public String getHoatDong() { return hoatDong; }
    public void setHoatDong(String hoatDong) { this.hoatDong = hoatDong; }
    public String getToThucHien() { return toThucHien; }
    public void setToThucHien(String toThucHien) { this.toThucHien = toThucHien; }
    public String getNguoiThucHien() { return nguoiThucHien; }
    public void setNguoiThucHien(String nguoiThucHien) { this.nguoiThucHien = nguoiThucHien; }
    public BigDecimal getGio() { return gio; }
    public void setGio(BigDecimal gio) { this.gio = gio; }
    public BigDecimal getCong() { return cong; }
    public void setCong(BigDecimal cong) { this.cong = cong; }
    public Long getWorkScheduleId() { return workScheduleId; }
    public void setWorkScheduleId(Long workScheduleId) { this.workScheduleId = workScheduleId; }
    public String getPhanLoai() { return phanLoai; }
    public void setPhanLoai(String phanLoai) { this.phanLoai = phanLoai; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String ghiChu) { this.ghiChu = ghiChu; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
