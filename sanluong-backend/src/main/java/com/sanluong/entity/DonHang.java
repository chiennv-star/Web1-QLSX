package com.sanluong.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "don_hang")
public class DonHang {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "thu_tu")
    private Integer thuTu;

    @Column(name = "ma_bravo", length = 50)
    private String maBravo;

    @Column(name = "ma_sp", length = 50)
    private String maSp;

    @Column(name = "ten_san_pham", length = 500)
    private String tenSanPham;

    @Column(name = "so_lo", length = 50)
    private String soLo;

    @Column(name = "ma_don_hang", length = 50)
    private String maDonHang;

    @Column(name = "ngay_dat_hang")
    private LocalDate ngayDatHang;

    /** Tổng SL khách đặt */
    @Column(name = "so_luong_dat_hang", precision = 12, scale = 0)
    private BigDecimal soLuongDatHang;

    /** Urgency: gap | rat_gap | null */
    @Column(name = "tinh_trang_dat_hang", length = 20)
    private String tinhTrangDatHang;

    /** Tổng SL đã được xếp vào Kế Hoạch (PLAN) — synced từ work_schedule */
    @Column(name = "so_luong_da_xep_kh", precision = 12, scale = 0)
    private BigDecimal soLuongDaXepKh;

    /** Tình trạng sản xuất: done | doing | null */
    @Column(name = "tinh_trang_sx", length = 20)
    private String tinhTrangSx;

    @Column(name = "da_len_lich_lam")
    private Boolean daLenLichLam = false;

    @Column(name = "ghi_chu", length = 1000)
    private String ghiChu;

    @Column(name = "da_dg_va_xep_lich_dg")
    private Boolean daDgVaXepLichDg = false;

    /** Ngày phát lệnh — ngày sản xuất sớm nhất từ Kế hoạch PLAN */
    @Column(name = "ngay_phat_lenh")
    private LocalDate ngayPhatLenh;

    /** Trạng thái duyệt: PENDING | APPROVED (null = APPROVED cho dữ liệu cũ) */
    @Column(name = "trang_thai_duyet", length = 20)
    private String trangThaiDuyet;

    /** Tình trạng Nguyên Liệu: du | chua_du */
    @Column(name = "tt_nguyen_lieu", length = 20)
    private String ttNguyenLieu;

    @Column(name = "ngay_ve_nguyen_lieu")
    private LocalDate ngayVeNguyenLieu;

    /** Tình trạng BBC1: du | chua_du */
    @Column(name = "tt_bbc1", length = 20)
    private String ttBbc1;

    @Column(name = "ngay_ve_bbc1")
    private LocalDate ngayVeBbc1;

    /** Tình trạng BBC2: du | chua_du */
    @Column(name = "tt_bbc2", length = 20)
    private String ttBbc2;

    @Column(name = "ngay_ve_bbc2")
    private LocalDate ngayVeBbc2;

    /** SL kế hoạch sản xuất (mặc định = soLuongDatHang) */
    @Column(name = "sl_san_xuat", precision = 12, scale = 0)
    private BigDecimal slSanXuat;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_by", length = 100)
    private String deletedBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @PrePersist
    void prePersist() { createdAt = LocalDateTime.now(); updatedAt = LocalDateTime.now(); }

    @PreUpdate
    void preUpdate() { updatedAt = LocalDateTime.now(); }

    // ── Getters & Setters ──────────────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Integer getThuTu() { return thuTu; }
    public void setThuTu(Integer thuTu) { this.thuTu = thuTu; }
    public String getMaBravo() { return maBravo; }
    public void setMaBravo(String maBravo) { this.maBravo = maBravo; }
    public String getMaSp() { return maSp; }
    public void setMaSp(String maSp) { this.maSp = maSp; }
    public String getTenSanPham() { return tenSanPham; }
    public void setTenSanPham(String tenSanPham) { this.tenSanPham = tenSanPham; }
    public String getSoLo() { return soLo; }
    public void setSoLo(String soLo) { this.soLo = soLo; }
    public String getMaDonHang() { return maDonHang; }
    public void setMaDonHang(String maDonHang) { this.maDonHang = maDonHang; }
    public LocalDate getNgayDatHang() { return ngayDatHang; }
    public void setNgayDatHang(LocalDate ngayDatHang) { this.ngayDatHang = ngayDatHang; }
    public BigDecimal getSoLuongDatHang() { return soLuongDatHang; }
    public void setSoLuongDatHang(BigDecimal soLuongDatHang) { this.soLuongDatHang = soLuongDatHang; }
    public String getTinhTrangDatHang() { return tinhTrangDatHang; }
    public void setTinhTrangDatHang(String tinhTrangDatHang) { this.tinhTrangDatHang = tinhTrangDatHang; }
    public BigDecimal getSoLuongDaXepKh() { return soLuongDaXepKh; }
    public void setSoLuongDaXepKh(BigDecimal soLuongDaXepKh) { this.soLuongDaXepKh = soLuongDaXepKh; }
    public String getTinhTrangSx() { return tinhTrangSx; }
    public void setTinhTrangSx(String tinhTrangSx) { this.tinhTrangSx = tinhTrangSx; }
    public LocalDate getNgayPhatLenh() { return ngayPhatLenh; }
    public void setNgayPhatLenh(LocalDate ngayPhatLenh) { this.ngayPhatLenh = ngayPhatLenh; }
    public Boolean getDaLenLichLam() { return daLenLichLam; }
    public void setDaLenLichLam(Boolean daLenLichLam) { this.daLenLichLam = daLenLichLam; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String ghiChu) { this.ghiChu = ghiChu; }
    public Boolean getDaDgVaXepLichDg() { return daDgVaXepLichDg; }
    public void setDaDgVaXepLichDg(Boolean daDgVaXepLichDg) { this.daDgVaXepLichDg = daDgVaXepLichDg; }
    public String getTtNguyenLieu() { return ttNguyenLieu; }
    public void setTtNguyenLieu(String ttNguyenLieu) { this.ttNguyenLieu = ttNguyenLieu; }
    public LocalDate getNgayVeNguyenLieu() { return ngayVeNguyenLieu; }
    public void setNgayVeNguyenLieu(LocalDate ngayVeNguyenLieu) { this.ngayVeNguyenLieu = ngayVeNguyenLieu; }
    public String getTtBbc1() { return ttBbc1; }
    public void setTtBbc1(String ttBbc1) { this.ttBbc1 = ttBbc1; }
    public LocalDate getNgayVeBbc1() { return ngayVeBbc1; }
    public void setNgayVeBbc1(LocalDate ngayVeBbc1) { this.ngayVeBbc1 = ngayVeBbc1; }
    public String getTtBbc2() { return ttBbc2; }
    public void setTtBbc2(String ttBbc2) { this.ttBbc2 = ttBbc2; }
    public LocalDate getNgayVeBbc2() { return ngayVeBbc2; }
    public void setNgayVeBbc2(LocalDate ngayVeBbc2) { this.ngayVeBbc2 = ngayVeBbc2; }
    public BigDecimal getSlSanXuat() { return slSanXuat; }
    public void setSlSanXuat(BigDecimal slSanXuat) { this.slSanXuat = slSanXuat; }
    public String getTrangThaiDuyet() { return trangThaiDuyet; }
    public void setTrangThaiDuyet(String trangThaiDuyet) { this.trangThaiDuyet = trangThaiDuyet; }
    public LocalDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(LocalDateTime deletedAt) { this.deletedAt = deletedAt; }
    public String getDeletedBy() { return deletedBy; }
    public void setDeletedBy(String deletedBy) { this.deletedBy = deletedBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}
