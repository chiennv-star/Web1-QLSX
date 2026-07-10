package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "machine_perf_log",
    uniqueConstraints = @UniqueConstraint(columnNames = {"ngay", "ten_may"}))
public class MachinePerfLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ngay", nullable = false)
    private LocalDate ngay;

    @Column(name = "ten_may", length = 100, nullable = false)
    private String tenMay;

    @Column(name = "sl_thuc_te")
    private Double slThucTe;

    @Column(name = "sl_ly_thuyet")
    private Double slLyThuyet;

    @Column(name = "nguyen_nhan_giam_toc", length = 200)
    private String nguyenNhanGiamToc;

    @Column(name = "ghi_chu", length = 500)
    private String ghiChu;

    public MachinePerfLog() {}

    public Long getId() { return id; }
    public LocalDate getNgay() { return ngay; }
    public void setNgay(LocalDate ngay) { this.ngay = ngay; }
    public String getTenMay() { return tenMay; }
    public void setTenMay(String tenMay) { this.tenMay = tenMay; }
    public Double getSlThucTe() { return slThucTe; }
    public void setSlThucTe(Double slThucTe) { this.slThucTe = slThucTe; }
    public Double getSlLyThuyet() { return slLyThuyet; }
    public void setSlLyThuyet(Double slLyThuyet) { this.slLyThuyet = slLyThuyet; }
    public String getNguyenNhanGiamToc() { return nguyenNhanGiamToc; }
    public void setNguyenNhanGiamToc(String nguyenNhanGiamToc) { this.nguyenNhanGiamToc = nguyenNhanGiamToc; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String ghiChu) { this.ghiChu = ghiChu; }
}
