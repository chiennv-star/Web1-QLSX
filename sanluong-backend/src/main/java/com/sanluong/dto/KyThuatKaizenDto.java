package com.sanluong.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class KyThuatKaizenDto {
    private LocalDate ngayGhiNhan;
    private String chiSo;
    private String gtTruoc;
    private String gtSau;
    private BigDecimal quyDoi;
    private String moTa;
    private String nguoiThucHien;

    public LocalDate getNgayGhiNhan() { return ngayGhiNhan; }
    public void setNgayGhiNhan(LocalDate v) { this.ngayGhiNhan = v; }
    public String getChiSo() { return chiSo; }
    public void setChiSo(String v) { this.chiSo = v; }
    public String getGtTruoc() { return gtTruoc; }
    public void setGtTruoc(String v) { this.gtTruoc = v; }
    public String getGtSau() { return gtSau; }
    public void setGtSau(String v) { this.gtSau = v; }
    public BigDecimal getQuyDoi() { return quyDoi; }
    public void setQuyDoi(BigDecimal v) { this.quyDoi = v; }
    public String getMoTa() { return moTa; }
    public void setMoTa(String v) { this.moTa = v; }
    public String getNguoiThucHien() { return nguoiThucHien; }
    public void setNguoiThucHien(String v) { this.nguoiThucHien = v; }
}
