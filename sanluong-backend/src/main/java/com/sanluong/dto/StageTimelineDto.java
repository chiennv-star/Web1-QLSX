package com.sanluong.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class StageTimelineDto {

    private String maSp;
    private String maBravo;
    private String tenTrinh;
    private String soLo;
    private BigDecimal coLo;
    private List<Long> ids;

    private StageInfo pc;
    private StageInfo bbc1;
    private StageInfo pl;
    private StageInfo dg;
    private StageInfo cc;

    public static class StageInfo {
        private String tinhTrang;
        private LocalDate startDate;
        private LocalDate endDate;
        private int soDays;

        public String getTinhTrang() { return tinhTrang; }
        public void setTinhTrang(String tinhTrang) { this.tinhTrang = tinhTrang; }
        public LocalDate getStartDate() { return startDate; }
        public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
        public LocalDate getEndDate() { return endDate; }
        public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
        public int getSoDays() { return soDays; }
        public void setSoDays(int soDays) { this.soDays = soDays; }
    }

    public String getMaSp() { return maSp; }
    public void setMaSp(String maSp) { this.maSp = maSp; }
    public String getMaBravo() { return maBravo; }
    public void setMaBravo(String maBravo) { this.maBravo = maBravo; }
    public String getTenTrinh() { return tenTrinh; }
    public void setTenTrinh(String tenTrinh) { this.tenTrinh = tenTrinh; }
    public String getSoLo() { return soLo; }
    public void setSoLo(String soLo) { this.soLo = soLo; }
    public BigDecimal getCoLo() { return coLo; }
    public void setCoLo(BigDecimal coLo) { this.coLo = coLo; }
    public StageInfo getPc() { return pc; }
    public void setPc(StageInfo pc) { this.pc = pc; }
    public StageInfo getBbc1() { return bbc1; }
    public void setBbc1(StageInfo bbc1) { this.bbc1 = bbc1; }
    public StageInfo getPl() { return pl; }
    public void setPl(StageInfo pl) { this.pl = pl; }
    public StageInfo getDg() { return dg; }
    public void setDg(StageInfo dg) { this.dg = dg; }
    public StageInfo getCc() { return cc; }
    public void setCc(StageInfo cc) { this.cc = cc; }
    public List<Long> getIds() { return ids; }
    public void setIds(List<Long> ids) { this.ids = ids; }
}
