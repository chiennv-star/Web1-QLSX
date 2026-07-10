package com.sanluong.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "machine_speed_config")
public class MachineSpeedConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ten_may", length = 100, unique = true, nullable = false)
    private String tenMay;

    @Column(name = "toc_do_chuan_label", length = 100)
    private String tocDoChuanLabel;

    @Column(name = "sl_ly_thuyet")
    private Double slLyThuyet;

    public MachineSpeedConfig() {}

    public Long getId() { return id; }
    public String getTenMay() { return tenMay; }
    public void setTenMay(String tenMay) { this.tenMay = tenMay; }
    public String getTocDoChuanLabel() { return tocDoChuanLabel; }
    public void setTocDoChuanLabel(String tocDoChuanLabel) { this.tocDoChuanLabel = tocDoChuanLabel; }
    public Double getSlLyThuyet() { return slLyThuyet; }
    public void setSlLyThuyet(Double slLyThuyet) { this.slLyThuyet = slLyThuyet; }
}
