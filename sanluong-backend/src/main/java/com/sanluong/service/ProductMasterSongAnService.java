package com.sanluong.service;

import com.sanluong.dto.ProductMasterSongAnDto;
import com.sanluong.entity.ProductMasterSongAn;
import com.sanluong.repository.ProductMasterSongAnRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.*;

@Service
public class ProductMasterSongAnService {

    private final ProductMasterSongAnRepository repository;

    public ProductMasterSongAnService(ProductMasterSongAnRepository repository) {
        this.repository = repository;
    }

    public Page<ProductMasterSongAn> search(String keyword, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("maTp").ascending());
        String kw = (keyword == null || keyword.isBlank()) ? null : keyword;
        return repository.search(kw, pageable);
    }

    public ProductMasterSongAn create(ProductMasterSongAnDto dto) {
        if (repository.existsByMaTpIgnoreCase(dto.getMaTp())) {
            throw new RuntimeException("Mã TP đã tồn tại: " + dto.getMaTp());
        }
        return repository.save(mapToEntity(new ProductMasterSongAn(), dto));
    }

    public ProductMasterSongAn update(Long id, ProductMasterSongAnDto dto) {
        ProductMasterSongAn p = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ID: " + id));
        return repository.save(mapToEntity(p, dto));
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    private ProductMasterSongAn mapToEntity(ProductMasterSongAn p, ProductMasterSongAnDto dto) {
        p.setMaTp(dto.getMaTp());
        p.setMaBravo(dto.getMaBravo());
        p.setTienTrinh(dto.getTienTrinh());
        p.setLoaiSanPham(dto.getLoaiSanPham());
        p.setKhoiLuong(dto.getKhoiLuong());
        p.setSlTrungBinh(dto.getSlTrungBinh());
        p.setNangSuatPc(dto.getNangSuatPc());
        p.setNangSuatPl(dto.getNangSuatPl());
        p.setNangSuatBbc1(dto.getNangSuatBbc1());
        p.setMayMocPc(dto.getMayMocPc());
        p.setMayMocPl(dto.getMayMocPl());
        p.setMayMocBbc1(dto.getMayMocBbc1());
        p.setMayMocDg(dto.getMayMocDg());
        p.setToNhomPcpl(dto.getToNhomPcpl());
        p.setCongGiaoNhan(dto.getCongGiaoNhan());
        p.setCongBbc1(dto.getCongBbc1());
        p.setCongPc(dto.getCongPc());
        p.setCongPl(dto.getCongPl());
        p.setCongDg(dto.getCongDg());
        p.setTongCongTp(dto.getTongCongTp());
        p.setGnTrenSp(dto.getGnTrenSp());
        p.setBbc1TrenSp(dto.getBbc1TrenSp());
        p.setPcplTrenSp(dto.getPcplTrenSp());
        p.setDgTrenSp(dto.getDgTrenSp());
        p.setSpTrenGn(dto.getSpTrenGn());
        p.setSpTrenBbc1(dto.getSpTrenBbc1());
        p.setSpTrenPc(dto.getSpTrenPc());
        p.setSpTrenPl(dto.getSpTrenPl());
        p.setSpTrenDg(dto.getSpTrenDg());
        return p;
    }

    public Map<String, Object> importFromExcel(MultipartFile file) throws Exception {
        int imported = 0, updated = 0, skipped = 0;
        List<String> errors = new ArrayList<>();
        try (Workbook wb = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) throw new RuntimeException("File không có dữ liệu hoặc thiếu dòng tiêu đề");

            Map<String, Integer> colMap = new HashMap<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell c = headerRow.getCell(i);
                if (c == null) continue;
                String h = normalizeHeader(getCellAsString(c));
                if      (h.startsWith("matp") || h.startsWith("masanpham") || h.startsWith("masp")) colMap.put("maTp", i);
                else if (h.contains("bravo"))                                               colMap.put("maBravo", i);
                else if (h.contains("tien") || h.startsWith("ten"))                        colMap.put("tienTrinh", i);
                else if (h.contains("loai") || h.contains("baoche"))                       colMap.put("loaiSanPham", i);
                else if (h.contains("khoi") || h.contains("kldv"))                         colMap.put("khoiLuong", i);
                else if (h.contains("trungbinh"))                                           colMap.put("slTrungBinh", i);
                else if (h.contains("maymoc") && h.endsWith("pc"))                         colMap.put("mayMocPc", i);
                else if (h.contains("maymoc") && h.endsWith("pl"))                         colMap.put("mayMocPl", i);
                else if (h.contains("maymoc") && h.contains("bbc"))                        colMap.put("mayMocBbc1", i);
                else if (h.contains("maymoc") && h.contains("dg"))                         colMap.put("mayMocDg", i);
                else if (h.contains("nspc") || (h.startsWith("ns") && h.endsWith("pc")))   colMap.put("nangSuatPc", i);
                else if (h.contains("nspl") || (h.startsWith("ns") && h.endsWith("pl")))   colMap.put("nangSuatPl", i);
                else if (h.contains("nsbbc") || (h.startsWith("ns") && h.contains("bbc"))) colMap.put("nangSuatBbc1", i);
                else if (h.contains("topcpl") || (h.startsWith("to") && h.contains("pcpl"))) colMap.put("toNhomPcpl", i);
                else if (h.startsWith("cong") && h.contains("giao"))                       colMap.put("congGiaoNhan", i);
                else if (h.startsWith("cong") && h.contains("bbc"))                        colMap.put("congBbc1", i);
                else if (h.startsWith("cong") && h.endsWith("pc") && !h.contains("pcpl"))  colMap.put("congPc", i);
                else if (h.startsWith("cong") && h.endsWith("pl") && !h.contains("pcpl"))  colMap.put("congPl", i);
                else if (h.startsWith("cong") && h.endsWith("dg"))                         colMap.put("congDg", i);
                else if (h.startsWith("tong") && h.contains("cong"))                       colMap.put("tongCongTp", i);
                else if (h.startsWith("gn") && h.endsWith("sp"))                           colMap.put("gnTrenSp", i);
                else if (h.startsWith("bbc") && h.endsWith("sp"))                          colMap.put("bbc1TrenSp", i);
                else if (h.startsWith("pcpl") && h.endsWith("sp"))                         colMap.put("pcplTrenSp", i);
                else if (h.startsWith("dg") && h.endsWith("sp"))                           colMap.put("dgTrenSp", i);
                else if (h.startsWith("sp") && h.endsWith("gn"))                           colMap.put("spTrenGn", i);
                else if (h.startsWith("sp") && h.contains("bbc"))                          colMap.put("spTrenBbc1", i);
                else if (h.startsWith("sp") && h.endsWith("pc"))                           colMap.put("spTrenPc", i);
                else if (h.startsWith("sp") && h.endsWith("pl"))                           colMap.put("spTrenPl", i);
                else if (h.startsWith("sp") && h.endsWith("dg"))                           colMap.put("spTrenDg", i);
            }

            for (int rowIdx = 1; rowIdx <= sheet.getLastRowNum(); rowIdx++) {
                Row row = sheet.getRow(rowIdx);
                if (row == null) continue;
                String maTp = getCellStringVal(row, colMap.get("maTp"));
                if (maTp == null || maTp.isBlank()) continue;
                try {
                    Optional<ProductMasterSongAn> existing = repository.findByMaTpIgnoreCase(maTp);
                    boolean isNew = existing.isEmpty();
                    ProductMasterSongAn p = existing.orElse(new ProductMasterSongAn());
                    p.setMaTp(maTp);
                    p.setMaBravo(getCellStringVal(row, colMap.get("maBravo")));
                    p.setTienTrinh(getCellStringVal(row, colMap.get("tienTrinh")));
                    p.setLoaiSanPham(getCellStringVal(row, colMap.get("loaiSanPham")));
                    p.setKhoiLuong(parseCellBigDecimal(row, colMap.get("khoiLuong")));
                    p.setSlTrungBinh(parseCellBigDecimal(row, colMap.get("slTrungBinh")));
                    p.setNangSuatPc(parseCellBigDecimal(row, colMap.get("nangSuatPc")));
                    p.setNangSuatPl(parseCellBigDecimal(row, colMap.get("nangSuatPl")));
                    p.setNangSuatBbc1(parseCellBigDecimal(row, colMap.get("nangSuatBbc1")));
                    p.setMayMocPc(getCellStringVal(row, colMap.get("mayMocPc")));
                    p.setMayMocPl(getCellStringVal(row, colMap.get("mayMocPl")));
                    p.setMayMocBbc1(getCellStringVal(row, colMap.get("mayMocBbc1")));
                    p.setMayMocDg(getCellStringVal(row, colMap.get("mayMocDg")));
                    p.setToNhomPcpl(getCellStringVal(row, colMap.get("toNhomPcpl")));
                    p.setCongGiaoNhan(parseCellBigDecimal(row, colMap.get("congGiaoNhan")));
                    p.setCongBbc1(parseCellBigDecimal(row, colMap.get("congBbc1")));
                    p.setCongPc(parseCellBigDecimal(row, colMap.get("congPc")));
                    p.setCongPl(parseCellBigDecimal(row, colMap.get("congPl")));
                    p.setCongDg(parseCellBigDecimal(row, colMap.get("congDg")));
                    p.setTongCongTp(parseCellBigDecimal(row, colMap.get("tongCongTp")));
                    p.setGnTrenSp(parseCellBigDecimal(row, colMap.get("gnTrenSp")));
                    p.setBbc1TrenSp(parseCellBigDecimal(row, colMap.get("bbc1TrenSp")));
                    p.setPcplTrenSp(parseCellBigDecimal(row, colMap.get("pcplTrenSp")));
                    p.setDgTrenSp(parseCellBigDecimal(row, colMap.get("dgTrenSp")));
                    p.setSpTrenGn(parseCellInt(row, colMap.get("spTrenGn")));
                    p.setSpTrenBbc1(parseCellInt(row, colMap.get("spTrenBbc1")));
                    p.setSpTrenPc(parseCellInt(row, colMap.get("spTrenPc")));
                    p.setSpTrenPl(parseCellInt(row, colMap.get("spTrenPl")));
                    p.setSpTrenDg(parseCellInt(row, colMap.get("spTrenDg")));
                    repository.save(p);
                    if (isNew) imported++; else updated++;
                } catch (Exception ex) {
                    errors.add("Dòng " + (rowIdx + 1) + ": " + ex.getMessage());
                }
            }
        }
        return Map.of("imported", imported, "updated", updated, "skipped", skipped, "errors", errors);
    }

    private String normalizeHeader(String s) {
        if (s == null) return "";
        String lower = s.toLowerCase().replace("đ", "d");
        String nfd = Normalizer.normalize(lower, Normalizer.Form.NFD);
        return nfd.replaceAll("[^a-z0-9]", "");
    }

    private String getCellAsString(Cell c) {
        if (c == null) return "";
        return switch (c.getCellType()) {
            case STRING  -> c.getStringCellValue().trim();
            case NUMERIC -> {
                double d = c.getNumericCellValue();
                yield (d == Math.floor(d)) ? String.valueOf((long) d) : String.valueOf(d);
            }
            case BOOLEAN -> String.valueOf(c.getBooleanCellValue());
            case FORMULA -> {
                try { yield c.getStringCellValue().trim(); }
                catch (Exception e) { yield String.valueOf(c.getNumericCellValue()); }
            }
            default -> "";
        };
    }

    private String getCellStringVal(Row row, Integer col) {
        if (col == null) return null;
        String v = getCellAsString(row.getCell(col));
        return v.isBlank() ? null : v;
    }

    private BigDecimal parseCellBigDecimal(Row row, Integer col) {
        if (col == null) return null;
        Cell c = row.getCell(col);
        if (c == null) return null;
        try {
            if (c.getCellType() == CellType.NUMERIC) return BigDecimal.valueOf(c.getNumericCellValue());
            String s = getCellAsString(c).replace(",", ".").replaceAll("[^\\d.]", "");
            return s.isBlank() ? null : new BigDecimal(s);
        } catch (Exception e) { return null; }
    }

    private Integer parseCellInt(Row row, Integer col) {
        BigDecimal bd = parseCellBigDecimal(row, col);
        return bd == null ? null : bd.intValue();
    }
}
