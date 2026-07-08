package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "machine_runtime_log")
public class MachineRuntimeLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "work_schedule_id", nullable = false)
    private Long workScheduleId;

    @Column(name = "ngay")
    private LocalDate ngay;

    @Column(name = "tu_gio", length = 5)
    private String tuGio;

    @Column(name = "den_gio", length = 5)
    private String denGio;

    // "Chạy máy" | "Dừng máy"
    @Column(name = "trang_thai", length = 20)
    private String trangThai;

    @Column(name = "ly_do", length = 100)
    private String lyDo;

    @Column(name = "ghi_chu", length = 500)
    private String ghiChu;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public MachineRuntimeLog() {}

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
    public String getTuGio() { return tuGio; }
    public void setTuGio(String tuGio) { this.tuGio = tuGio; }
    public String getDenGio() { return denGio; }
    public void setDenGio(String denGio) { this.denGio = denGio; }
    public String getTrangThai() { return trangThai; }
    public void setTrangThai(String trangThai) { this.trangThai = trangThai; }
    public String getLyDo() { return lyDo; }
    public void setLyDo(String lyDo) { this.lyDo = lyDo; }
    public String getGhiChu() { return ghiChu; }
    public void setGhiChu(String ghiChu) { this.ghiChu = ghiChu; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
