package com.sanluong.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "production_records")
public class ProductionRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ma_tp", length = 50)
    private String maTp;

    @Column(name = "ma_bravo", length = 50)
    private String maBravo;

    @Column(name = "tien_trinh", length = 255)
    private String tienTrinh;

    @Column(name = "lsx", length = 50)
    private String lsx;

    @Column(name = "so_luong")
    private Integer soLuong;

    @Column(name = "sl_pc", length = 20)
    private String slPc;

    @Column(name = "pc_trang_thai", length = 10)
    private String pcTrangThai;

    @Column(name = "pl_trang_thai", length = 10)
    private String plTrangThai;

    @Column(name = "dg_trang_thai", length = 10)
    private String dgTrangThai;

    @Column(name = "bbc1_tinh_trang", length = 10)
    private String bbc1TrangThai;

    @Column(name = "bbc1_1", length = 20)
    private String bbc1_1;

    @Column(name = "pc_pl", length = 20)
    private String pcPl;

    @Column(name = "dg_2", length = 20)
    private String dg2;

    @Column(name = "bbc1_2", length = 20)
    private String bbc1_2;

    @Column(name = "sp_trung_gian")
    private Integer spTrungGian;

    @Column(name = "tong_btp")
    private Integer tongBtp;

    @Column(name = "bbc1_3", precision = 10, scale = 2)
    private BigDecimal bbc1_3;

    @Column(name = "pc_chi_phi", precision = 10, scale = 4)
    private BigDecimal pcChiPhi;

    @Column(name = "pl_chi_phi", precision = 10, scale = 4)
    private BigDecimal plChiPhi;

    @Column(name = "dg_chi_phi", precision = 10, scale = 4)
    private BigDecimal dgChiPhi;

    @Column(name = "sigma_cong", precision = 10, scale = 4)
    private BigDecimal sigmaCong;

    @Column(name = "tem_db", precision = 10, scale = 2)
    private BigDecimal temDb;

    @Column(name = "do_dang_dg")
    private Integer doDangDg;

    @Column(name = "tp_nhap_kho")
    private Integer tpNhapKho;

    @Column(name = "so_sp_cong", precision = 10, scale = 4)
    private BigDecimal soSpCong;

    @Column(name = "sl_trung_binh", precision = 12, scale = 2)
    private java.math.BigDecimal slTrungBinh;

    @jakarta.persistence.Transient
    private String mayMoc;

    @Column(name = "mo_ta", length = 500)
    private String moTa;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    public ProductionRecord() {}

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        recalcTongBtp();
        recalcDoDangDg();
        recalcSigmaCong();
        recalcSoSpCong();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
        recalcTongBtp();
        recalcDoDangDg();
        recalcSigmaCong();
        recalcSoSpCong();
    }

    private void recalcDoDangDg() {
        int sl = (soLuong != null) ? soLuong : 0;
        int slDg = 0;
        try {
            if (dg2 != null && !dg2.isBlank()) slDg = Integer.parseInt(dg2.trim());
        } catch (NumberFormatException ignored) {}
        doDangDg = sl - slDg;
    }

    private void recalcTongBtp() {
        try {
            int slDg = (dg2 != null && !dg2.isBlank()) ? Integer.parseInt(dg2.trim()) : 0;
            int slPl = (pcPl != null && !pcPl.isBlank()) ? Integer.parseInt(pcPl.trim()) : 0;
            tongBtp = slDg - slPl;
        } catch (NumberFormatException e) {
            tongBtp = 0;
        }
    }

    private void recalcSigmaCong() {
        BigDecimal bbc1 = bbc1_3   != null ? bbc1_3   : BigDecimal.ZERO;
        BigDecimal pc   = pcChiPhi != null ? pcChiPhi : BigDecimal.ZERO;
        BigDecimal pl   = plChiPhi != null ? plChiPhi : BigDecimal.ZERO;
        BigDecimal dg   = dgChiPhi != null ? dgChiPhi : BigDecimal.ZERO;
        sigmaCong = bbc1.add(pc).add(pl).add(dg);
    }

    private void recalcSoSpCong() {
        if (sigmaCong == null || sigmaCong.compareTo(BigDecimal.ZERO) == 0
                || dg2 == null || dg2.isBlank()) {
            soSpCong = BigDecimal.ZERO;
            return;
        }
        try {
            BigDecimal slDg = new BigDecimal(dg2.trim());
            if (slDg.compareTo(BigDecimal.ZERO) == 0) {
                soSpCong = BigDecimal.ZERO;
            } else {
                soSpCong = slDg.divide(sigmaCong, 4, java.math.RoundingMode.HALF_UP);
            }
        } catch (NumberFormatException e) {
            soSpCong = BigDecimal.ZERO;
        }
    }

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getMaTp() { return maTp; }
    public void setMaTp(String maTp) { this.maTp = maTp; }
    public String getMaBravo() { return maBravo; }
    public void setMaBravo(String maBravo) { this.maBravo = maBravo; }
    public String getTienTrinh() { return tienTrinh; }
    public void setTienTrinh(String tienTrinh) { this.tienTrinh = tienTrinh; }
    public String getLsx() { return lsx; }
    public void setLsx(String lsx) { this.lsx = lsx; }
    public Integer getSoLuong() { return soLuong; }
    public void setSoLuong(Integer soLuong) { this.soLuong = soLuong; }
    public String getSlPc() { return slPc; }
    public void setSlPc(String slPc) { this.slPc = slPc; }
    public String getPcTrangThai() { return pcTrangThai; }
    public void setPcTrangThai(String pcTrangThai) { this.pcTrangThai = pcTrangThai; }
    public String getPlTrangThai() { return plTrangThai; }
    public void setPlTrangThai(String plTrangThai) { this.plTrangThai = plTrangThai; }
    public String getDgTrangThai() { return dgTrangThai; }
    public void setDgTrangThai(String dgTrangThai) { this.dgTrangThai = dgTrangThai; }
    public String getBbc1TrangThai() { return bbc1TrangThai; }
    public void setBbc1TrangThai(String bbc1TrangThai) { this.bbc1TrangThai = bbc1TrangThai; }
    public String getBbc1_1() { return bbc1_1; }
    public void setBbc1_1(String bbc1_1) { this.bbc1_1 = bbc1_1; }
    public String getPcPl() { return pcPl; }
    public void setPcPl(String pcPl) { this.pcPl = pcPl; }
    public String getDg2() { return dg2; }
    public void setDg2(String dg2) { this.dg2 = dg2; }
    public String getBbc1_2() { return bbc1_2; }
    public void setBbc1_2(String bbc1_2) { this.bbc1_2 = bbc1_2; }
    public Integer getSpTrungGian() { return spTrungGian; }
    public void setSpTrungGian(Integer spTrungGian) { this.spTrungGian = spTrungGian; }
    public Integer getTongBtp() { return tongBtp; }
    public void setTongBtp(Integer tongBtp) { this.tongBtp = tongBtp; }
    public BigDecimal getBbc1_3() { return bbc1_3; }
    public void setBbc1_3(BigDecimal bbc1_3) { this.bbc1_3 = bbc1_3; }
    public BigDecimal getPcChiPhi() { return pcChiPhi; }
    public void setPcChiPhi(BigDecimal pcChiPhi) { this.pcChiPhi = pcChiPhi; }
    public BigDecimal getPlChiPhi() { return plChiPhi; }
    public void setPlChiPhi(BigDecimal plChiPhi) { this.plChiPhi = plChiPhi; }
    public BigDecimal getDgChiPhi() { return dgChiPhi; }
    public void setDgChiPhi(BigDecimal dgChiPhi) { this.dgChiPhi = dgChiPhi; }
    public BigDecimal getSigmaCong() { return sigmaCong; }
    public void setSigmaCong(BigDecimal sigmaCong) { this.sigmaCong = sigmaCong; }
    public BigDecimal getTemDb() { return temDb; }
    public void setTemDb(BigDecimal temDb) { this.temDb = temDb; }
    public Integer getDoDangDg() { return doDangDg; }
    public void setDoDangDg(Integer doDangDg) { this.doDangDg = doDangDg; }
    public Integer getTpNhapKho() { return tpNhapKho; }
    public void setTpNhapKho(Integer tpNhapKho) { this.tpNhapKho = tpNhapKho; }
    public BigDecimal getSoSpCong() { return soSpCong; }
    public void setSoSpCong(BigDecimal soSpCong) { this.soSpCong = soSpCong; }
    public java.math.BigDecimal getSlTrungBinh() { return slTrungBinh; }
    public void setSlTrungBinh(java.math.BigDecimal slTrungBinh) { this.slTrungBinh = slTrungBinh; }
    public String getMayMoc() { return mayMoc; }
    public void setMayMoc(String mayMoc) { this.mayMoc = mayMoc; }
    public String getMoTa() { return moTa; }
    public void setMoTa(String moTa) { this.moTa = moTa; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
}
