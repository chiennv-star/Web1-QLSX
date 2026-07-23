package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "kho_nhat_ky")
public class KhoNhatKy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "loai", length = 20)
    private String loai; // NHAP / XUAT / CHUYEN / KIEM_KE

    @Column(name = "noi_dung", length = 500)
    private String noiDung;

    @Column(name = "nguoi_thuc_hien", length = 100)
    private String nguoiThucHien;

    @Column(name = "thoi_gian")
    private LocalDateTime thoiGian;

    public KhoNhatKy() {}

    @PrePersist
    void prePersist() {
        if (thoiGian == null) thoiGian = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getLoai() { return loai; }
    public void setLoai(String v) { this.loai = v; }
    public String getNoiDung() { return noiDung; }
    public void setNoiDung(String v) { this.noiDung = v; }
    public String getNguoiThucHien() { return nguoiThucHien; }
    public void setNguoiThucHien(String v) { this.nguoiThucHien = v; }
    public LocalDateTime getThoiGian() { return thoiGian; }
    public void setThoiGian(LocalDateTime v) { this.thoiGian = v; }
}
