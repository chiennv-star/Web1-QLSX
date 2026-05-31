package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "product_master_history")
public class ProductMasterHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_master_id", nullable = false)
    private Long productMasterId;

    @Column(name = "ma_tp", length = 50)
    private String maTp;

    @Column(name = "changed_by", length = 100)
    private String changedBy;

    @Column(name = "changed_at")
    private LocalDateTime changedAt;

    // JSON array: [{"field":"maBravo","label":"Mã Bravo","old":"X","new":"Y"},...]
    @Column(name = "changes_json", length = 3000)
    private String changesJson;

    public Long getId() { return id; }
    public Long getProductMasterId() { return productMasterId; }
    public void setProductMasterId(Long productMasterId) { this.productMasterId = productMasterId; }
    public String getMaTp() { return maTp; }
    public void setMaTp(String maTp) { this.maTp = maTp; }
    public String getChangedBy() { return changedBy; }
    public void setChangedBy(String changedBy) { this.changedBy = changedBy; }
    public LocalDateTime getChangedAt() { return changedAt; }
    public void setChangedAt(LocalDateTime changedAt) { this.changedAt = changedAt; }
    public String getChangesJson() { return changesJson; }
    public void setChangesJson(String changesJson) { this.changesJson = changesJson; }
}
