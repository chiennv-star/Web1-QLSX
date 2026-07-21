package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Bản sao lịch sử (thêm mới/sửa/xóa) của các lần Nhập Kho ở tab "Ngày Nhập Kho"
 * và "Nhập Kho" — append-only, ghi lại tại thời điểm xảy ra thay đổi.
 * Không có ràng buộc khóa ngoại tới ProductionRecord: xóa bản ghi nguồn không
 * ảnh hưởng các dòng lịch sử đã ghi ở đây. Chỉ ADMIN xem được (xem SecurityConfig).
 */
@Entity
@Table(name = "nhap_kho_audit_log")
public class NhapKhoAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** id của ProductionRecord tại thời điểm ghi log — chỉ để tham chiếu, không phải khóa ngoại */
    @Column(name = "production_record_id")
    private Long productionRecordId;

    @Column(name = "ma_bravo", length = 100)
    private String maBravo;

    @Column(name = "ma_tp", length = 100)
    private String maTp;

    @Column(name = "tien_trinh", length = 500)
    private String tienTrinh;

    @Column(name = "lsx", length = 100)
    private String lsx;

    /** THEM_MOI | SUA | XOA */
    @Column(name = "hanh_dong", length = 20, nullable = false)
    private String hanhDong;

    @Column(name = "tp_nhap_kho")
    private Integer tpNhapKho;

    @Column(name = "ngay_xuat_kho")
    private LocalDate ngayXuatKho;

    @Column(name = "tinh_trang_nhap_kho", length = 100)
    private String tinhTrangNhapKho;

    @Column(name = "ten_nth_nhap_kho", length = 200)
    private String tenNthNhapKho;

    @Column(name = "ghi_chu_nhap_kho", length = 500)
    private String ghiChuNhapKho;

    /** Tóm tắt phần thay đổi, vd "SL Nhập Kho: 500 → 521" — chỉ có ở hành động SUA */
    @Column(name = "thay_doi", length = 1000)
    private String thayDoi;

    @Column(name = "changed_by", length = 100)
    private String changedBy;

    @Column(name = "changed_at")
    private LocalDateTime changedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getProductionRecordId() { return productionRecordId; }
    public void setProductionRecordId(Long v) { this.productionRecordId = v; }
    public String getMaBravo() { return maBravo; }
    public void setMaBravo(String v) { this.maBravo = v; }
    public String getMaTp() { return maTp; }
    public void setMaTp(String v) { this.maTp = v; }
    public String getTienTrinh() { return tienTrinh; }
    public void setTienTrinh(String v) { this.tienTrinh = v; }
    public String getLsx() { return lsx; }
    public void setLsx(String v) { this.lsx = v; }
    public String getHanhDong() { return hanhDong; }
    public void setHanhDong(String v) { this.hanhDong = v; }
    public Integer getTpNhapKho() { return tpNhapKho; }
    public void setTpNhapKho(Integer v) { this.tpNhapKho = v; }
    public LocalDate getNgayXuatKho() { return ngayXuatKho; }
    public void setNgayXuatKho(LocalDate v) { this.ngayXuatKho = v; }
    public String getTinhTrangNhapKho() { return tinhTrangNhapKho; }
    public void setTinhTrangNhapKho(String v) { this.tinhTrangNhapKho = v; }
    public String getTenNthNhapKho() { return tenNthNhapKho; }
    public void setTenNthNhapKho(String v) { this.tenNthNhapKho = v; }
    public String getGhiChuNhapKho() { return ghiChuNhapKho; }
    public void setGhiChuNhapKho(String v) { this.ghiChuNhapKho = v; }
    public String getThayDoi() { return thayDoi; }
    public void setThayDoi(String v) { this.thayDoi = v; }
    public String getChangedBy() { return changedBy; }
    public void setChangedBy(String v) { this.changedBy = v; }
    public LocalDateTime getChangedAt() { return changedAt; }
    public void setChangedAt(LocalDateTime v) { this.changedAt = v; }
}
