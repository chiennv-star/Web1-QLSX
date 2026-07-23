package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Bản sao độc lập của từng lần nhập kho, phục vụ tab "Tổng hợp theo ngày".
 * Đồng bộ 1 chiều: được tạo/cập nhật khi ProductionRecord (clone nhập kho) được lưu,
 * nhưng KHÔNG bị xóa theo khi bản ghi nguồn ở "Ngày Nhập Kho" / "Nhập Kho" bị xóa.
 */
@Entity
@Table(name = "nhap_kho_tong_hop_ngay")
public class NhapKhoTongHopNgay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** id của ProductionRecord (clone nhập kho) đã sinh ra bản ghi này — dùng để upsert */
    @Column(name = "source_id", unique = true)
    private Long sourceId;

    @Column(name = "ma_bravo", length = 100)
    private String maBravo;

    @Column(name = "ma_tp", length = 100)
    private String maTp;

    @Column(name = "tien_trinh", length = 500)
    private String tienTrinh;

    @Column(name = "lsx", length = 100)
    private String lsx;

    @Column(name = "tp_nhap_kho")
    private Integer tpNhapKho;

    @Column(name = "ngay_xuat_kho")
    private LocalDate ngayXuatKho;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Transient
    private String loaiSanPham;

    public NhapKhoTongHopNgay() {}

    @PrePersist
    void prePersist() { createdAt = LocalDateTime.now(); updatedAt = LocalDateTime.now(); }

    @PreUpdate
    void preUpdate() { updatedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getSourceId() { return sourceId; }
    public void setSourceId(Long v) { this.sourceId = v; }
    public String getMaBravo() { return maBravo; }
    public void setMaBravo(String v) { this.maBravo = v; }
    public String getMaTp() { return maTp; }
    public void setMaTp(String v) { this.maTp = v; }
    public String getTienTrinh() { return tienTrinh; }
    public void setTienTrinh(String v) { this.tienTrinh = v; }
    public String getLsx() { return lsx; }
    public void setLsx(String v) { this.lsx = v; }
    public Integer getTpNhapKho() { return tpNhapKho; }
    public void setTpNhapKho(Integer v) { this.tpNhapKho = v; }
    public LocalDate getNgayXuatKho() { return ngayXuatKho; }
    public void setNgayXuatKho(LocalDate v) { this.ngayXuatKho = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public String getLoaiSanPham() { return loaiSanPham; }
    public void setLoaiSanPham(String v) { this.loaiSanPham = v; }
}
