package com.sanluong.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "work_schedule")
public class WorkSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // PLAN | SCHEDULE
    @Column(name = "source", length = 20)
    private String source;

    // PC | BBC1 | PL | DG | CC
    @Column(name = "cong_doan", length = 10)
    private String congDoan;

    @Column(name = "ngay_thuc_hien")
    private LocalDate ngayThucHien;

    @Column(name = "ma_sp", length = 50)
    private String maSp;

    @Column(name = "ten_trinh", length = 255)
    private String tenTrinh;

    @Column(name = "so_lo", length = 50)
    private String soLo;

    @Column(name = "ma_don_hang", length = 50)
    private String maDonHang;

    @Column(name = "co_lo", precision = 12, scale = 2)
    private BigDecimal coLo;

    @Column(name = "to_nhom", length = 200)
    private String toNhom;

    @Column(name = "phong_thuc_hien", length = 100)
    private String phongThucHien;

    @Column(name = "phong_san_xuat", length = 100)
    private String phongSanXuat;

    @Column(name = "kl_dv", precision = 10, scale = 4)
    private java.math.BigDecimal klDv;

    @Column(name = "khoi_luong_lo", precision = 12, scale = 4)
    private java.math.BigDecimal khoiLuongLo;

    @Column(name = "so_me")
    private Integer soMe;

    @Column(name = "truong_ca", length = 100)
    private String truongCa;

    @Column(name = "nguoi_ho_tro", length = 255)
    private String nguoiHoTro;

    @Column(name = "chu_y", length = 500)
    private String chuY;

    @Column(name = "sai_lech", length = 1000)
    private String saiLech;

    @Column(name = "tinh_trang", length = 50)
    private String tinhTrang;

    // PC
    @Column(name = "sl_pc", precision = 12, scale = 4)
    private BigDecimal slPc;

    @Column(name = "cong_pc", precision = 12, scale = 4)
    private BigDecimal congPc;

    // BBC1
    @Column(name = "sl_bbc1", precision = 12, scale = 4)
    private BigDecimal slBbc1;

    @Column(name = "cong_bbc1", precision = 12, scale = 4)
    private BigDecimal congBbc1;

    // PL
    @Column(name = "sl_pl", precision = 12, scale = 4)
    private BigDecimal slPl;

    @Column(name = "cong_pl", precision = 12, scale = 4)
    private BigDecimal congPl;

    // DG
    @Column(name = "sl_dg", precision = 12, scale = 4)
    private BigDecimal slDg;

    @Column(name = "cong_dg", precision = 12, scale = 4)
    private BigDecimal congDg;

    // CC (Cân Chia)
    @Column(name = "sl_cc", precision = 12, scale = 4)
    private BigDecimal slCc;

    @Column(name = "cong_cc", precision = 12, scale = 4)
    private BigDecimal congCc;

    @Column(name = "qa_lay_mau")
    private Integer qaLayMau;

    @Column(name = "qa_kiem_nghiem")
    private Integer qaKiemNghiem;

    @Column(name = "qa_luu_mau")
    private Integer qaLuuMau;

    @Column(name = "qa_khac")
    private Integer qaKhac;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "hidden", nullable = false)
    private boolean hidden = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_by", length = 100)
    private String deletedBy;

    @Column(name = "ma_bravo", length = 50)
    private String maBravo;

    @Column(name = "is_planned", nullable = false)
    private boolean isPlanned = false;

    /** Transient — true nếu tồn tại ProductionRecord có lsx = soLo */
    @Transient
    private boolean hasLsx = false;

    /** Transient — tpNhapKho lấy từ ProductionRecord (enrich khi list ĐG) */
    @Transient
    private Integer tpNhapKho;

    /** Transient — true nếu bản ghi PLAN có bản ghi SCHEDULE tương ứng (cùng soLo + công đoạn hiệu lực)
     *  đã tinhTrang='done' ở Sản lượng tổ — dùng để tô màu card Kế hoạch báo đã sản xuất xong */
    @Transient
    private boolean daHoanThanhSx = false;

    public WorkSchedule() {}

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getCongDoan() { return congDoan; }
    public void setCongDoan(String congDoan) { this.congDoan = congDoan; }
    public LocalDate getNgayThucHien() { return ngayThucHien; }
    public void setNgayThucHien(LocalDate ngayThucHien) { this.ngayThucHien = ngayThucHien; }
    public String getMaSp() { return maSp; }
    public void setMaSp(String maSp) { this.maSp = maSp; }
    public String getTenTrinh() { return tenTrinh; }
    public void setTenTrinh(String tenTrinh) { this.tenTrinh = tenTrinh; }
    public String getSoLo() { return soLo; }
    public void setSoLo(String soLo) { this.soLo = soLo; }
    public String getMaDonHang() { return maDonHang; }
    public void setMaDonHang(String maDonHang) { this.maDonHang = maDonHang; }
    public BigDecimal getCoLo() { return coLo; }
    public void setCoLo(BigDecimal coLo) { this.coLo = coLo; }
    public String getToNhom() { return toNhom; }
    public void setToNhom(String toNhom) { this.toNhom = toNhom; }
    public String getPhongThucHien() { return phongThucHien; }
    public void setPhongThucHien(String phongThucHien) { this.phongThucHien = phongThucHien; }
    public String getPhongSanXuat() { return phongSanXuat; }
    public void setPhongSanXuat(String phongSanXuat) { this.phongSanXuat = phongSanXuat; }
    public java.math.BigDecimal getKlDv() { return klDv; }
    public void setKlDv(java.math.BigDecimal klDv) { this.klDv = klDv; }
    public java.math.BigDecimal getKhoiLuongLo() { return khoiLuongLo; }
    public void setKhoiLuongLo(java.math.BigDecimal khoiLuongLo) { this.khoiLuongLo = khoiLuongLo; }
    public Integer getSoMe() { return soMe; }
    public void setSoMe(Integer soMe) { this.soMe = soMe; }
    public String getTruongCa() { return truongCa; }
    public void setTruongCa(String truongCa) { this.truongCa = truongCa; }
    public String getNguoiHoTro() { return nguoiHoTro; }
    public void setNguoiHoTro(String nguoiHoTro) { this.nguoiHoTro = nguoiHoTro; }
    public String getChuY() { return chuY; }
    public void setChuY(String chuY) { this.chuY = chuY; }
    public String getSaiLech() { return saiLech; }
    public void setSaiLech(String saiLech) { this.saiLech = saiLech; }
    public String getTinhTrang() { return tinhTrang; }
    public void setTinhTrang(String tinhTrang) { this.tinhTrang = tinhTrang; }
    public BigDecimal getSlPc() { return slPc; }
    public void setSlPc(BigDecimal slPc) { this.slPc = slPc; }
    public BigDecimal getCongPc() { return congPc; }
    public void setCongPc(BigDecimal congPc) { this.congPc = congPc; }
    public BigDecimal getSlBbc1() { return slBbc1; }
    public void setSlBbc1(BigDecimal slBbc1) { this.slBbc1 = slBbc1; }
    public BigDecimal getCongBbc1() { return congBbc1; }
    public void setCongBbc1(BigDecimal congBbc1) { this.congBbc1 = congBbc1; }
    public BigDecimal getSlPl() { return slPl; }
    public void setSlPl(BigDecimal slPl) { this.slPl = slPl; }
    public BigDecimal getCongPl() { return congPl; }
    public void setCongPl(BigDecimal congPl) { this.congPl = congPl; }
    public BigDecimal getSlDg() { return slDg; }
    public void setSlDg(BigDecimal slDg) { this.slDg = slDg; }
    public BigDecimal getCongDg() { return congDg; }
    public void setCongDg(BigDecimal congDg) { this.congDg = congDg; }
    public BigDecimal getSlCc() { return slCc; }
    public void setSlCc(BigDecimal slCc) { this.slCc = slCc; }
    public BigDecimal getCongCc() { return congCc; }
    public void setCongCc(BigDecimal congCc) { this.congCc = congCc; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
    public Integer getQaLayMau() { return qaLayMau; }
    public void setQaLayMau(Integer qaLayMau) { this.qaLayMau = qaLayMau; }
    public Integer getQaKiemNghiem() { return qaKiemNghiem; }
    public void setQaKiemNghiem(Integer qaKiemNghiem) { this.qaKiemNghiem = qaKiemNghiem; }
    public Integer getQaLuuMau() { return qaLuuMau; }
    public void setQaLuuMau(Integer qaLuuMau) { this.qaLuuMau = qaLuuMau; }
    public Integer getQaKhac() { return qaKhac; }
    public void setQaKhac(Integer qaKhac) { this.qaKhac = qaKhac; }
    public String getMaBravo() { return maBravo; }
    public void setMaBravo(String maBravo) { this.maBravo = maBravo; }
    public boolean isPlanned() { return isPlanned; }
    public void setPlanned(boolean isPlanned) { this.isPlanned = isPlanned; }
    public boolean isHasLsx() { return hasLsx; }
    public void setHasLsx(boolean hasLsx) { this.hasLsx = hasLsx; }
    public boolean isDaHoanThanhSx() { return daHoanThanhSx; }
    public void setDaHoanThanhSx(boolean daHoanThanhSx) { this.daHoanThanhSx = daHoanThanhSx; }
    public Integer getTpNhapKho() { return tpNhapKho; }
    public void setTpNhapKho(Integer tpNhapKho) { this.tpNhapKho = tpNhapKho; }
    public boolean isHidden() { return hidden; }
    public void setHidden(boolean hidden) { this.hidden = hidden; }
    public LocalDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(LocalDateTime deletedAt) { this.deletedAt = deletedAt; }
    public String getDeletedBy() { return deletedBy; }
    public void setDeletedBy(String deletedBy) { this.deletedBy = deletedBy; }
}
