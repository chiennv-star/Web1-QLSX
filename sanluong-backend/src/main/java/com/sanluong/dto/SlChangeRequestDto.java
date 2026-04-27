package com.sanluong.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class SlChangeRequestDto {
    // Input fields (create request)
    private Long workScheduleId;
    private Long workScheduleSessionId;
    private String congDoan;
    private String maSp;
    private String tenTrinh;
    private String soLo;
    private String ngay;
    private BigDecimal newValue;

    // Review fields (reject)
    private String note;

    // Response fields
    private Long id;
    private BigDecimal oldValue;
    private String requestedBy;
    private LocalDateTime requestedAt;
    private String status;
    private String reviewedBy;
    private LocalDateTime reviewedAt;

    public Long getWorkScheduleId() { return workScheduleId; }
    public void setWorkScheduleId(Long workScheduleId) { this.workScheduleId = workScheduleId; }
    public Long getWorkScheduleSessionId() { return workScheduleSessionId; }
    public void setWorkScheduleSessionId(Long workScheduleSessionId) { this.workScheduleSessionId = workScheduleSessionId; }
    public String getCongDoan() { return congDoan; }
    public void setCongDoan(String congDoan) { this.congDoan = congDoan; }
    public String getMaSp() { return maSp; }
    public void setMaSp(String maSp) { this.maSp = maSp; }
    public String getTenTrinh() { return tenTrinh; }
    public void setTenTrinh(String tenTrinh) { this.tenTrinh = tenTrinh; }
    public String getSoLo() { return soLo; }
    public void setSoLo(String soLo) { this.soLo = soLo; }
    public String getNgay() { return ngay; }
    public void setNgay(String ngay) { this.ngay = ngay; }
    public BigDecimal getNewValue() { return newValue; }
    public void setNewValue(BigDecimal newValue) { this.newValue = newValue; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public BigDecimal getOldValue() { return oldValue; }
    public void setOldValue(BigDecimal oldValue) { this.oldValue = oldValue; }
    public String getRequestedBy() { return requestedBy; }
    public void setRequestedBy(String requestedBy) { this.requestedBy = requestedBy; }
    public LocalDateTime getRequestedAt() { return requestedAt; }
    public void setRequestedAt(LocalDateTime requestedAt) { this.requestedAt = requestedAt; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }
    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }
}
