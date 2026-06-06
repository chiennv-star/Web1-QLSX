package com.sanluong.dto;

import java.time.LocalDate;

public class EmployeeSelfUpdateDto {

    private String sdt;
    private String diaChi;
    private LocalDate ngaySinh;
    private String hocVan;

    public String getSdt() { return sdt; }
    public void setSdt(String sdt) { this.sdt = sdt; }

    public String getDiaChi() { return diaChi; }
    public void setDiaChi(String diaChi) { this.diaChi = diaChi; }

    public LocalDate getNgaySinh() { return ngaySinh; }
    public void setNgaySinh(LocalDate ngaySinh) { this.ngaySinh = ngaySinh; }

    public String getHocVan() { return hocVan; }
    public void setHocVan(String hocVan) { this.hocVan = hocVan; }
}
