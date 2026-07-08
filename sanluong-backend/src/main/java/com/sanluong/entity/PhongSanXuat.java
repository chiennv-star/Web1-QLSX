package com.sanluong.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "phong_san_xuat")
public class PhongSanXuat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ten", length = 100, nullable = false, unique = true)
    private String ten;

    @Column(name = "sort_order")
    private Integer sortOrder;

    public PhongSanXuat() {}

    public PhongSanXuat(String ten, Integer sortOrder) {
        this.ten = ten;
        this.sortOrder = sortOrder;
    }

    public Long getId() { return id; }
    public String getTen() { return ten; }
    public void setTen(String ten) { this.ten = ten; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
