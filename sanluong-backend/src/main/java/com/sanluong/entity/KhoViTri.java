package com.sanluong.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "kho_vi_tri")
public class KhoViTri {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma", unique = true, nullable = false, length = 30)
    private String ma; // vd: A-01-01-01

    @Column(name = "khu", length = 10)
    private String khu;

    @Column(name = "day_so", length = 10)
    private String daySo;

    @Column(name = "tang_so", length = 10)
    private String tangSo;

    @Column(name = "o_so", length = 10)
    private String oSo;

    @Column(name = "active")
    private Boolean active;

    public KhoViTri() {}

    @PrePersist
    void prePersist() {
        if (active == null) active = true;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getMa() { return ma; }
    public void setMa(String ma) { this.ma = ma; }
    public String getKhu() { return khu; }
    public void setKhu(String khu) { this.khu = khu; }
    public String getDaySo() { return daySo; }
    public void setDaySo(String daySo) { this.daySo = daySo; }
    public String getTangSo() { return tangSo; }
    public void setTangSo(String tangSo) { this.tangSo = tangSo; }
    public String getOSo() { return oSo; }
    public void setOSo(String oSo) { this.oSo = oSo; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
