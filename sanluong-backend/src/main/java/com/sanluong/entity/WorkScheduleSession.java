package com.sanluong.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "work_schedule_session")
public class WorkScheduleSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "work_schedule_id", nullable = false)
    private Long workScheduleId;

    @Column(name = "ngay")
    private LocalDate ngay;

    @Column(name = "thoi_gian_bat_dau", length = 10)
    private String thoiGianBatDau;

    @Column(name = "thoi_gian_ket_thuc", length = 10)
    private String thoiGianKetThuc;

    @Column(name = "nhom_thuc_hien", length = 100)
    private String nhomThucHien;

    @Column(name = "ma_nhan_vien", length = 50)
    private String maNhanVien;

    @Column(name = "nguoi_thuc_hien", length = 255)
    private String nguoiThucHien;

    @Column(name = "so_gio_thuc_hien", precision = 8, scale = 2)
    private BigDecimal soGioThucHien;

    @Column(name = "cong_thuc_hien", precision = 10, scale = 4)
    private BigDecimal congThucHien;

    @Column(name = "ngay_thuc_hien")
    private LocalDate ngayThucHien;

    @Column(name = "san_luong", precision = 12, scale = 2)
    private BigDecimal sanLuong;

    @Column(name = "nang_suat", precision = 12, scale = 4)
    private BigDecimal nangSuat;

    @Column(name = "nang_suat_trung_binh", precision = 12, scale = 4)
    private BigDecimal nangSuatTrungBinh;

    @Column(name = "vai_tro", length = 100)
    private String vaiTro;

    @Column(name = "ghi_chu", length = 500)
    private String ghiChu;

    @Column(name = "khac", length = 500)
    private String khac;

    @Column(name = "ca_san_xuat", length = 20)
    private String caSanXuat;

    @Column(name = "is_tang_ca", nullable = false)
    private boolean isTangCa = false;

    @Column(name = "phong_san_xuat", length = 100)
    private String phongSanXuat;

    // null = SCHEDULE (Sản Lượng Tổ, backward compatible); 'KH_TO' = Kế Hoạch Tổ riêng
    @Column(name = "loai_session", length = 20)
    private String loaiSession;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public WorkScheduleSession() {}

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
    public Long getWorkScheduleId() { return workScheduleId; }
    public void setWorkScheduleId(Long workScheduleId) { this.workScheduleId = workScheduleId; }
    public LocalDate getNgay() { return ngay; }
    public void setNgay(LocalDate ngay) { this.ngay = ngay; }
    public String getThoiGianBatDau() { return thoiGianBatDau; }
    public void setThoiGianBatDau(String thoiGianBatDau) { this.thoiGianBatDau = thoiGianBatDau; }
    public String getThoiGianKetThuc() { return thoiGianKetThuc; }
    public void setThoiGianKetThuc(String thoiGianKetThuc) { this.thoiGianKetThuc = thoiGianKetThuc; }
    public String getNhomThucHien() { return nhomThucHien; }
    public void setNhomThucHien(String nhomThucHien) { this.nhomThucHien = nhomThucHien; }
    public String getMaNhanVien() { return maNhanVien; }
    public void setMaNhanVien(String maNhanVien) { this.maNhanVien = maNhanVien; }
    public String getNguoiThucHien() { return nguoiThucHien; }
    public void setNguoiThucHien(String nguoiThucHien) { this.nguoiThucHien = nguoiThucHien; }
    public BigDecimal getSoGioThucHien() { return soGioThucHien; }
    public void setSoGioThucHien(BigDecimal soGioThucHien) { this.soGioThucHien = soGioThucHien; }
    public BigDecimal getCongThucHien() { return congThucHien; }
    public void setCongThucHien(BigDecimal congThucHien) { this.congThucHien = congThucHien; }
    public LocalDate getNgayThucHien() { return ngayThucHien; }
    public void setNgayThucHien(LocalDate ngayThucHien) { this.ngayThucHien = ngayThucHien; }
    public BigDecimal getSanLuong() { return sanLuong; }
    public void setSanLuong(BigDecimal sanLuong) { this.sanLuong = sanLuong; }
    public BigDecimal getNangSuat() { return nangSuat; }
    public void setNangSuat(BigDecimal nangSuat) { this.nangSuat = nangSuat; }
    public BigDecimal getNangSuatTrungBinh() { return nangSuatTrungBinh; }
    public void setNangSuatTrungBinh(BigDecimal nangSuatTrungBinh) { this.nangSuatTrungBinh = nangSuatTrungBinh; }
    public String getVaiTro() { return vaiTro; }
    public void setVaiTro(String vaiTro) { this.vaiTro = vaiTro; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String ghiChu) { this.ghiChu = ghiChu; }
    public String getKhac() { return khac; }
    public void setKhac(String khac) { this.khac = khac; }
    public String getCaSanXuat() { return caSanXuat; }
    public void setCaSanXuat(String caSanXuat) { this.caSanXuat = caSanXuat; }
    public boolean isIsTangCa() { return isTangCa; }
    public void setIsTangCa(boolean isTangCa) { this.isTangCa = isTangCa; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public String getLoaiSession() { return loaiSession; }
    public void setLoaiSession(String loaiSession) { this.loaiSession = loaiSession; }
    public String getPhongSanXuat() { return phongSanXuat; }
    public void setPhongSanXuat(String phongSanXuat) { this.phongSanXuat = phongSanXuat; }
}
