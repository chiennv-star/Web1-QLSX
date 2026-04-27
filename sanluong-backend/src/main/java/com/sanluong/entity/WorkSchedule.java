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

    @Column(name = "co_lo", precision = 12, scale = 2)
    private BigDecimal coLo;

    @Column(name = "to_nhom", length = 200)
    private String toNhom;

    @Column(name = "phong_thuc_hien", length = 100)
    private String phongThucHien;

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
    @Column(name = "cong_cc", precision = 12, scale = 4)
    private BigDecimal congCc;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

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
    public BigDecimal getCoLo() { return coLo; }
    public void setCoLo(BigDecimal coLo) { this.coLo = coLo; }
    public String getToNhom() { return toNhom; }
    public void setToNhom(String toNhom) { this.toNhom = toNhom; }
    public String getPhongThucHien() { return phongThucHien; }
    public void setPhongThucHien(String phongThucHien) { this.phongThucHien = phongThucHien; }
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
    public BigDecimal getCongCc() { return congCc; }
    public void setCongCc(BigDecimal congCc) { this.congCc = congCc; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}
