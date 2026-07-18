package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ky_thuat_bao_tri")
public class KyThuatBaoTri {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ten_thiet_bi", length = 255)
    private String tenThietBi;

    @Column(name = "lich_6t_dau", length = 255)
    private String lich6tDau;

    @Column(name = "lich_6t_cuoi", length = 255)
    private String lich6tCuoi;

    @Column(name = "ghi_chu", length = 500)
    private String ghiChu;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public KyThuatBaoTri() {}

    @PrePersist
    void prePersist() { createdAt = LocalDateTime.now(); updatedAt = LocalDateTime.now(); }

    @PreUpdate
    void preUpdate() { updatedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTenThietBi() { return tenThietBi; }
    public void setTenThietBi(String v) { this.tenThietBi = v; }
    public String getLich6tDau() { return lich6tDau; }
    public void setLich6tDau(String v) { this.lich6tDau = v; }
    public String getLich6tCuoi() { return lich6tCuoi; }
    public void setLich6tCuoi(String v) { this.lich6tCuoi = v; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String v) { this.ghiChu = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
