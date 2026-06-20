package com.sanluong.dto;

public class LoginResponse {
    private String token;
    private String username;
    private String fullName;
    private String role;
    private String maNhanVien;
    private String toNhom;
    private String avatar;
    private boolean mustChangePassword;

    public LoginResponse(String token, String username, String fullName, String role,
                         String maNhanVien, String toNhom, String avatar, boolean mustChangePassword) {
        this.token = token;
        this.username = username;
        this.fullName = fullName;
        this.role = role;
        this.maNhanVien = maNhanVien;
        this.toNhom = toNhom;
        this.avatar = avatar;
        this.mustChangePassword = mustChangePassword;
    }

    public String getToken() { return token; }
    public String getUsername() { return username; }
    public String getFullName() { return fullName; }
    public String getRole() { return role; }
    public String getMaNhanVien() { return maNhanVien; }
    public String getToNhom() { return toNhom; }
    public String getAvatar() { return avatar; }
    public boolean isMustChangePassword() { return mustChangePassword; }
}
