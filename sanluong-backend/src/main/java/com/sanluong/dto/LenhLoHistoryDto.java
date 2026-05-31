package com.sanluong.dto;

import java.time.LocalDateTime;

public class LenhLoHistoryDto {
    private Long id;
    private Long lenhId;
    private String soLoCu;
    private String soLoMoi;
    private String lyDo;
    private String changedBy;
    private LocalDateTime changedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getLenhId() { return lenhId; }
    public void setLenhId(Long lenhId) { this.lenhId = lenhId; }
    public String getSoLoCu() { return soLoCu; }
    public void setSoLoCu(String soLoCu) { this.soLoCu = soLoCu; }
    public String getSoLoMoi() { return soLoMoi; }
    public void setSoLoMoi(String soLoMoi) { this.soLoMoi = soLoMoi; }
    public String getLyDo() { return lyDo; }
    public void setLyDo(String lyDo) { this.lyDo = lyDo; }
    public String getChangedBy() { return changedBy; }
    public void setChangedBy(String changedBy) { this.changedBy = changedBy; }
    public LocalDateTime getChangedAt() { return changedAt; }
    public void setChangedAt(LocalDateTime changedAt) { this.changedAt = changedAt; }
}
