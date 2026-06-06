package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(name = "full_name", length = 100)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "ma_nhan_vien", length = 50)
    private String maNhanVien;

    @Column(name = "avatar", columnDefinition = "LONGTEXT")
    private String avatar;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public User() {}

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
    }

    public enum Role { ADMIN, TKSX, QUAN_DOC, NHAN_VIEN, NHAN_VIEN_PCPL1, NHAN_VIEN_PCPL2, NHAN_VIEN_PCPL3, NHAN_VIEN_BBC1, NHAN_VIEN_DG, ADMIN_PC, ADMIN_BBC1, ADMIN_PL, ADMIN_DG, ADMIN_KH, ADMIN_PCPL1, ADMIN_PCPL2, ADMIN_PCPL3, HCNS, KE_TOAN }

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getMaNhanVien() { return maNhanVien; }
    public void setMaNhanVien(String maNhanVien) { this.maNhanVien = maNhanVien; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private final User user = new User();
        public Builder username(String v) { user.username = v; return this; }
        public Builder password(String v) { user.password = v; return this; }
        public Builder fullName(String v) { user.fullName = v; return this; }
        public Builder role(Role v) { user.role = v; return this; }
        public Builder enabled(boolean v) { user.enabled = v; return this; }
        public User build() { return user; }
    }
}
