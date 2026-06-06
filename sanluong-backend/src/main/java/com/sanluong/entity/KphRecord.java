package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "kph_record")
public class KphRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "work_schedule_id")
    private Long workScheduleId;

    // ── Section 1: TRƯỜNG DỮ LIỆU KHI NHẬP MỚI ────────────────────────────
    @Column(name = "ten_nguoi_phat_hien", length = 255)
    private String tenNguoiPhatHien;

    @Column(name = "ngay_gio_phat_hien")
    private LocalDateTime ngayGioPhatHien;

    @Column(name = "ten_san_pham_nguyen_lieu", length = 500)
    private String tenSanPhamNguyenLieu;

    @Column(name = "ma_vat_tu", length = 100)
    private String maVatTu;

    @Column(name = "so_lo", length = 100)
    private String soLo;

    @Column(name = "so_me", length = 50)
    private String soMe;

    @Column(name = "cong_doan", length = 50)
    private String congDoan;

    @Column(name = "mo_ta_van_de", columnDefinition = "TEXT")
    private String moTaVanDe;

    @Column(name = "phuong_an_xu_ly_tuc_thoi", columnDefinition = "TEXT")
    private String phuongAnXuLyTucThoi;

    @Column(name = "nguyen_nhan_ban_dau", columnDefinition = "TEXT")
    private String nguyenNhanBanDau;

    @Column(name = "nguyen_nhan_goc_re", columnDefinition = "TEXT")
    private String nguyenNhanGocRe;

    @Column(name = "de_xuat_khac_phuc_van_de", columnDefinition = "TEXT")
    private String deXuatKhacPhucVanDe;

    @Column(name = "de_xuat_hanh_dong_khac_phuc", columnDefinition = "TEXT")
    private String deXuatHanhDongKhacPhuc;

    @Column(name = "file_dinh_kem_1", columnDefinition = "TEXT")
    private String fileDinhKem1;

    @Column(name = "file_dinh_kem_nhieu", columnDefinition = "TEXT")
    private String fileDinhKemNhieu;

    @Column(name = "ghi_chu", columnDefinition = "TEXT")
    private String ghiChu;

    // ── Section 2: TỔ TRƯỞNG / NHÓM TRƯỞNG PHÊ DUYỆT ─────────────────────
    @Column(name = "ten_nguoi_thuc_hien", length = 255)
    private String tenNguoiThucHien;

    @Column(name = "ma_nhan_vien", length = 50)
    private String maNhanVien;

    @Column(name = "y_kien_to_truong", columnDefinition = "TEXT")
    private String yKienToTruong;

    // ── Section 3: ĐỀ XUẤT PÁN KHẮC PHỤC KPH ─────────────────────────────
    @Column(name = "y_kien_tbp", columnDefinition = "TEXT")
    private String yKienTBP;

    // ── Section 4: QA PHÊ DUYỆT PÁN KHẮC PHỤC KPH ────────────────────────
    @Column(name = "ma_san_pham_vat_tu", length = 100)
    private String maSanPhamVatTu;

    @Column(name = "tom_tat_van_de", columnDefinition = "TEXT")
    private String tomTatVanDe;

    @Column(name = "anh_huong_chat_luong", length = 10)
    private String anhHuongChatLuong;

    @Column(name = "kha_nang_lap_lai", length = 10)
    private String khaNangLapLai;

    @Column(name = "nguyen_nhan_ban_dau_qa", columnDefinition = "TEXT")
    private String nguyenNhanBanDauQA;

    @Column(name = "phuong_an_khac_phuc", columnDefinition = "TEXT")
    private String phuongAnKhacPhuc;

    @Column(name = "file_dinh_kem_2", columnDefinition = "TEXT")
    private String fileDinhKem2;

    @Column(name = "qa_ghi_chu", columnDefinition = "TEXT")
    private String qaGhiChu;

    // ── Metadata ───────────────────────────────────────────────────────────
    @Column(name = "trang_thai", length = 50)
    private String trangThai;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public KphRecord() {}

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (trangThai == null) trangThai = "moi";
    }

    @PreUpdate
    void preUpdate() { updatedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getWorkScheduleId() { return workScheduleId; }
    public void setWorkScheduleId(Long v) { this.workScheduleId = v; }
    public String getTenNguoiPhatHien() { return tenNguoiPhatHien; }
    public void setTenNguoiPhatHien(String v) { this.tenNguoiPhatHien = v; }
    public LocalDateTime getNgayGioPhatHien() { return ngayGioPhatHien; }
    public void setNgayGioPhatHien(LocalDateTime v) { this.ngayGioPhatHien = v; }
    public String getTenSanPhamNguyenLieu() { return tenSanPhamNguyenLieu; }
    public void setTenSanPhamNguyenLieu(String v) { this.tenSanPhamNguyenLieu = v; }
    public String getMaVatTu() { return maVatTu; }
    public void setMaVatTu(String v) { this.maVatTu = v; }
    public String getSoLo() { return soLo; }
    public void setSoLo(String v) { this.soLo = v; }
    public String getSoMe() { return soMe; }
    public void setSoMe(String v) { this.soMe = v; }
    public String getCongDoan() { return congDoan; }
    public void setCongDoan(String v) { this.congDoan = v; }
    public String getMoTaVanDe() { return moTaVanDe; }
    public void setMoTaVanDe(String v) { this.moTaVanDe = v; }
    public String getPhuongAnXuLyTucThoi() { return phuongAnXuLyTucThoi; }
    public void setPhuongAnXuLyTucThoi(String v) { this.phuongAnXuLyTucThoi = v; }
    public String getNguyenNhanBanDau() { return nguyenNhanBanDau; }
    public void setNguyenNhanBanDau(String v) { this.nguyenNhanBanDau = v; }
    public String getNguyenNhanGocRe() { return nguyenNhanGocRe; }
    public void setNguyenNhanGocRe(String v) { this.nguyenNhanGocRe = v; }
    public String getDeXuatKhacPhucVanDe() { return deXuatKhacPhucVanDe; }
    public void setDeXuatKhacPhucVanDe(String v) { this.deXuatKhacPhucVanDe = v; }
    public String getDeXuatHanhDongKhacPhuc() { return deXuatHanhDongKhacPhuc; }
    public void setDeXuatHanhDongKhacPhuc(String v) { this.deXuatHanhDongKhacPhuc = v; }
    public String getFileDinhKem1() { return fileDinhKem1; }
    public void setFileDinhKem1(String v) { this.fileDinhKem1 = v; }
    public String getFileDinhKemNhieu() { return fileDinhKemNhieu; }
    public void setFileDinhKemNhieu(String v) { this.fileDinhKemNhieu = v; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String v) { this.ghiChu = v; }
    public String getTenNguoiThucHien() { return tenNguoiThucHien; }
    public void setTenNguoiThucHien(String v) { this.tenNguoiThucHien = v; }
    public String getMaNhanVien() { return maNhanVien; }
    public void setMaNhanVien(String v) { this.maNhanVien = v; }
    public String getYKienToTruong() { return yKienToTruong; }
    public void setYKienToTruong(String v) { this.yKienToTruong = v; }
    public String getYKienTBP() { return yKienTBP; }
    public void setYKienTBP(String v) { this.yKienTBP = v; }
    public String getMaSanPhamVatTu() { return maSanPhamVatTu; }
    public void setMaSanPhamVatTu(String v) { this.maSanPhamVatTu = v; }
    public String getTomTatVanDe() { return tomTatVanDe; }
    public void setTomTatVanDe(String v) { this.tomTatVanDe = v; }
    public String getAnhHuongChatLuong() { return anhHuongChatLuong; }
    public void setAnhHuongChatLuong(String v) { this.anhHuongChatLuong = v; }
    public String getKhaNangLapLai() { return khaNangLapLai; }
    public void setKhaNangLapLai(String v) { this.khaNangLapLai = v; }
    public String getNguyenNhanBanDauQA() { return nguyenNhanBanDauQA; }
    public void setNguyenNhanBanDauQA(String v) { this.nguyenNhanBanDauQA = v; }
    public String getPhuongAnKhacPhuc() { return phuongAnKhacPhuc; }
    public void setPhuongAnKhacPhuc(String v) { this.phuongAnKhacPhuc = v; }
    public String getFileDinhKem2() { return fileDinhKem2; }
    public void setFileDinhKem2(String v) { this.fileDinhKem2 = v; }
    public String getQaGhiChu() { return qaGhiChu; }
    public void setQaGhiChu(String v) { this.qaGhiChu = v; }
    public String getTrangThai() { return trangThai; }
    public void setTrangThai(String v) { this.trangThai = v; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String v) { this.createdBy = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
