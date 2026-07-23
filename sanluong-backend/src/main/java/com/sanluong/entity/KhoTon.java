package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "kho_ton")
public class KhoTon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_hang", nullable = false, length = 50)
    private String maHang;

    @Column(name = "ten_hang", length = 255)
    private String tenHang;

    @Column(name = "dvt", length = 20)
    private String dvt;

    @Column(name = "vi_tri", nullable = false, length = 30)
    private String viTri;

    @Column(name = "so_lo", length = 50)
    private String soLo;

    @Column(name = "han_dung")
    private LocalDate hanDung;

    @Column(name = "so_luong", nullable = false)
    private Integer soLuong;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public KhoTon() {}

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (dvt == null) dvt = "Thùng";
    }

    @PreUpdate
    void preUpdate() { updatedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getMaHang() { return maHang; }
    public void setMaHang(String v) { this.maHang = v; }
    public String getTenHang() { return tenHang; }
    public void setTenHang(String v) { this.tenHang = v; }
    public String getDvt() { return dvt; }
    public void setDvt(String v) { this.dvt = v; }
    public String getViTri() { return viTri; }
    public void setViTri(String v) { this.viTri = v; }
    public String getSoLo() { return soLo; }
    public void setSoLo(String v) { this.soLo = v; }
    public LocalDate getHanDung() { return hanDung; }
    public void setHanDung(LocalDate v) { this.hanDung = v; }
    public Integer getSoLuong() { return soLuong; }
    public void setSoLuong(Integer v) { this.soLuong = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
