package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "time_entry")
public class TimeEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_nhan_vien", nullable = false, length = 50)
    private String maNhanVien;

    @Column(name = "ngay", nullable = false)
    private LocalDate ngay;

    @Column(name = "gio_vao")
    private LocalTime gioVao;

    @Column(name = "gio_ra")
    private LocalTime gioRa;

    @Column(name = "ca_thuc_hien", length = 10)
    private String caThucHien;

    @Column(name = "ghi_chu", length = 255)
    private String ghiChu;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getMaNhanVien() { return maNhanVien; }
    public void setMaNhanVien(String maNhanVien) { this.maNhanVien = maNhanVien; }

    public LocalDate getNgay() { return ngay; }
    public void setNgay(LocalDate ngay) { this.ngay = ngay; }

    public LocalTime getGioVao() { return gioVao; }
    public void setGioVao(LocalTime gioVao) { this.gioVao = gioVao; }

    public LocalTime getGioRa() { return gioRa; }
    public void setGioRa(LocalTime gioRa) { this.gioRa = gioRa; }

    public String getCaThucHien() { return caThucHien; }
    public void setCaThucHien(String caThucHien) { this.caThucHien = caThucHien; }

    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String ghiChu) { this.ghiChu = ghiChu; }
}
