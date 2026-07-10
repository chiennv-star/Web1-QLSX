package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "machine_shift_perf_log")
public class MachineShiftPerfLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "work_schedule_id", nullable = false)
    private Long workScheduleId;

    @Column(name = "ngay")
    private LocalDate ngay;

    @Column(name = "ca_lo", length = 50)
    private String caLo;

    @Column(name = "sl_ly_thuyet")
    private Double slLyThuyet;

    @Column(name = "sl_thuc_te")
    private Double slThucTe;

    @Column(name = "nguyen_nhan", length = 200)
    private String nguyenNhan;

    @Column(name = "ghi_chu", length = 500)
    private String ghiChu;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public MachineShiftPerfLog() {}

    @PrePersist
    void prePersist() { createdAt = LocalDateTime.now(); updatedAt = LocalDateTime.now(); }
    @PreUpdate
    void preUpdate() { updatedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getWorkScheduleId() { return workScheduleId; }
    public void setWorkScheduleId(Long workScheduleId) { this.workScheduleId = workScheduleId; }
    public LocalDate getNgay() { return ngay; }
    public void setNgay(LocalDate ngay) { this.ngay = ngay; }
    public String getCaLo() { return caLo; }
    public void setCaLo(String caLo) { this.caLo = caLo; }
    public Double getSlLyThuyet() { return slLyThuyet; }
    public void setSlLyThuyet(Double slLyThuyet) { this.slLyThuyet = slLyThuyet; }
    public Double getSlThucTe() { return slThucTe; }
    public void setSlThucTe(Double slThucTe) { this.slThucTe = slThucTe; }
    public String getNguyenNhan() { return nguyenNhan; }
    public void setNguyenNhan(String nguyenNhan) { this.nguyenNhan = nguyenNhan; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String ghiChu) { this.ghiChu = ghiChu; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
