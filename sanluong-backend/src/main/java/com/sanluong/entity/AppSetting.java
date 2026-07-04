package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "app_settings")
public class AppSetting {

    @Id
    @Column(name = "setting_key", length = 100)
    private String key;

    @Column(name = "setting_value", columnDefinition = "TEXT")
    private String value;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public AppSetting() {}

    public AppSetting(String key, String value, String updatedBy) {
        this.key       = key;
        this.value     = value;
        this.updatedBy = updatedBy;
        this.updatedAt = LocalDateTime.now();
    }

    public String getKey()                        { return key; }
    public void   setKey(String key)              { this.key = key; }
    public String getValue()                      { return value; }
    public void   setValue(String value)          { this.value = value; }
    public String getUpdatedBy()                  { return updatedBy; }
    public void   setUpdatedBy(String updatedBy)  { this.updatedBy = updatedBy; }
    public LocalDateTime getUpdatedAt()           { return updatedAt; }
    public void   setUpdatedAt(LocalDateTime t)   { this.updatedAt = t; }
}
