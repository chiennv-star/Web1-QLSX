package com.sanluong.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "hang_loi")
public class HangLoi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mtp_co_mem", length = 50)
    private String mtpCoMem;

    @Column(name = "mtp_song_an", length = 50)
    private String mtpSongAn;

    @Column(name = "ten_hang_hoa", length = 500)
    private String tenHangHoa;

    @Column(name = "so_lo", length = 100)
    private String soLo;

    @Column(name = "so_luong", precision = 12, scale = 2)
    private BigDecimal soLuong;

    @Column(name = "li_do_tra_ve", length = 1000)
    private String liDoTraVe;

    @Column(name = "nam_xu_ly", length = 200)
    private String namXuLy;

    @Column(name = "huong_xu_ly", length = 100)
    private String huongXuLy;

    @Column(name = "phan_loai_loi", length = 500)
    private String phanLoaiLoi;

    @Column(name = "ngay_bat_dau")
    private LocalDate ngayBatDau;

    @Column(name = "ngay_ket_thuc")
    private LocalDate ngayKetThuc;

    @Column(name = "trang_thai_xu_ly", length = 100)
    private String trangThaiXuLy;

    @Column(name = "ghi_chu", length = 1000)
    private String ghiChu;

    @Column(name = "sl_dat_sau_xu_ly", precision = 12, scale = 2)
    private BigDecimal slDatSauXuLy;

    @Column(name = "sl_huy", precision = 12, scale = 2)
    private BigDecimal slHuy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public HangLoi() {}

    @PrePersist
    void prePersist() { createdAt = LocalDateTime.now(); updatedAt = LocalDateTime.now(); }

    @PreUpdate
    void preUpdate() { updatedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getMtpCoMem() { return mtpCoMem; }
    public void setMtpCoMem(String v) { this.mtpCoMem = v; }
    public String getMtpSongAn() { return mtpSongAn; }
    public void setMtpSongAn(String v) { this.mtpSongAn = v; }
    public String getTenHangHoa() { return tenHangHoa; }
    public void setTenHangHoa(String v) { this.tenHangHoa = v; }
    public String getSoLo() { return soLo; }
    public void setSoLo(String v) { this.soLo = v; }
    public BigDecimal getSoLuong() { return soLuong; }
    public void setSoLuong(BigDecimal v) { this.soLuong = v; }
    public String getLiDoTraVe() { return liDoTraVe; }
    public void setLiDoTraVe(String v) { this.liDoTraVe = v; }
    public String getNamXuLy() { return namXuLy; }
    public void setNamXuLy(String v) { this.namXuLy = v; }
    public String getHuongXuLy() { return huongXuLy; }
    public void setHuongXuLy(String v) { this.huongXuLy = v; }
    public String getPhanLoaiLoi() { return phanLoaiLoi; }
    public void setPhanLoaiLoi(String v) { this.phanLoaiLoi = v; }
    public LocalDate getNgayBatDau() { return ngayBatDau; }
    public void setNgayBatDau(LocalDate v) { this.ngayBatDau = v; }
    public LocalDate getNgayKetThuc() { return ngayKetThuc; }
    public void setNgayKetThuc(LocalDate v) { this.ngayKetThuc = v; }
    public String getTrangThaiXuLy() { return trangThaiXuLy; }
    public void setTrangThaiXuLy(String v) { this.trangThaiXuLy = v; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String v) { this.ghiChu = v; }
    public BigDecimal getSlDatSauXuLy() { return slDatSauXuLy; }
    public void setSlDatSauXuLy(BigDecimal v) { this.slDatSauXuLy = v; }
    public BigDecimal getSlHuy() { return slHuy; }
    public void setSlHuy(BigDecimal v) { this.slHuy = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
