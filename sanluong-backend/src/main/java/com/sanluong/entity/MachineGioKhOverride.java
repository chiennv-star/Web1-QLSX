package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "machine_gio_kh_override",
    uniqueConstraints = @UniqueConstraint(columnNames = {"ngay", "ten_may"}))
public class MachineGioKhOverride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ngay", nullable = false)
    private LocalDate ngay;

    @Column(name = "ten_may", length = 100, nullable = false)
    private String tenMay;

    @Column(name = "gio_kh", nullable = false)
    private Double gioKh;

    public MachineGioKhOverride() {}

    public Long getId() { return id; }
    public LocalDate getNgay() { return ngay; }
    public void setNgay(LocalDate ngay) { this.ngay = ngay; }
    public String getTenMay() { return tenMay; }
    public void setTenMay(String tenMay) { this.tenMay = tenMay; }
    public Double getGioKh() { return gioKh; }
    public void setGioKh(Double gioKh) { this.gioKh = gioKh; }
}
