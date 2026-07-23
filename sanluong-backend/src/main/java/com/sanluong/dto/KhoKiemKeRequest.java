package com.sanluong.dto;

import java.util.List;

public class KhoKiemKeRequest {
    private String viTri;
    private List<Item> items;

    public String getViTri() { return viTri; }
    public void setViTri(String v) { this.viTri = v; }
    public List<Item> getItems() { return items; }
    public void setItems(List<Item> v) { this.items = v; }

    public static class Item {
        private Long stockId;
        private Integer soLuongThucTe;

        public Long getStockId() { return stockId; }
        public void setStockId(Long v) { this.stockId = v; }
        public Integer getSoLuongThucTe() { return soLuongThucTe; }
        public void setSoLuongThucTe(Integer v) { this.soLuongThucTe = v; }
    }
}
