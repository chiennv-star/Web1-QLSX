package com.sanluong.service;

import com.sanluong.dto.ProductionRecordDto;
import com.sanluong.entity.ProductionRecord;
import com.sanluong.repository.ProductionRecordRepository;
import com.sanluong.repository.ProductMasterRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.io.*;
import java.math.BigDecimal;
import java.util.List;

@Service
public class ProductionService {

    private final ProductionRecordRepository repository;
    private final ProductMasterRepository productMasterRepository;

    public ProductionService(ProductionRecordRepository repository,
                             ProductMasterRepository productMasterRepository) {
        this.repository = repository;
        this.productMasterRepository = productMasterRepository;
    }

    public Page<ProductionRecord> search(String maTp, String maBravo, String tienTrinh,
                                         String lsx, String trangThai, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return repository.search(
                isEmpty(maTp) ? null : maTp,
                isEmpty(maBravo) ? null : maBravo,
                isEmpty(tienTrinh) ? null : tienTrinh,
                isEmpty(lsx) ? null : lsx,
                isEmpty(trangThai) ? null : trangThai,
                pageable
        );
    }

    public ProductionRecord getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bản ghi ID: " + id));
    }

    public ProductionRecord create(ProductionRecordDto dto, String username) {
        ProductionRecord record = mapToEntity(dto);
        record.setCreatedBy(username);
        record.setUpdatedBy(username);
        return repository.save(record);
    }

    public ProductionRecord update(Long id, ProductionRecordDto dto, String username) {
        ProductionRecord record = getById(id);
        updateEntity(record, dto);
        record.setUpdatedBy(username);
        return repository.save(record);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    public byte[] exportExcel(String maTp, String maBravo, String tienTrinh,
                               String lsx, String trangThai) throws IOException {
        List<ProductionRecord> records = repository.searchAll(
                isEmpty(maTp) ? null : maTp,
                isEmpty(maBravo) ? null : maBravo,
                isEmpty(tienTrinh) ? null : tienTrinh,
                isEmpty(lsx) ? null : lsx,
                isEmpty(trangThai) ? null : trangThai
        );

        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Sản lượng");
            String[] headers = {
                "Mã TP", "Mã Bravo", "Tiến trình", "LSX", "Số lượng",
                "PC TT", "PL TT", "ĐG TT",
                "BBC1", "SL PCPL", "SL ĐG", "SL BBC1",
                "SP Trung gian", "Tổng BTP", "Công BBC1",
                "Công PC", "Công PL", "Công ĐG", "Σ Cộng",
                "TEM ĐB", "Dở dang ĐG", "TP Nhập kho", "SỐ SP/Cộng",
                "Người tạo", "Ngày tạo"
            };

            CellStyle headerStyle = wb.createCellStyle();
            Font font = wb.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (ProductionRecord r : records) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(nvl(r.getMaTp()));
                row.createCell(1).setCellValue(nvl(r.getMaBravo()));
                row.createCell(2).setCellValue(nvl(r.getTienTrinh()));
                row.createCell(3).setCellValue(nvl(r.getLsx()));
                row.createCell(4).setCellValue(r.getSoLuong() != null ? r.getSoLuong() : 0);
                row.createCell(5).setCellValue(nvl(r.getPcTrangThai()));
                row.createCell(6).setCellValue(nvl(r.getPlTrangThai()));
                row.createCell(7).setCellValue(nvl(r.getDgTrangThai()));
                row.createCell(8).setCellValue(nvl(r.getBbc1_1()));
                row.createCell(9).setCellValue(nvl(r.getPcPl()));
                row.createCell(10).setCellValue(nvl(r.getDg2()));
                row.createCell(11).setCellValue(nvl(r.getBbc1_2()));
                row.createCell(12).setCellValue(r.getSpTrungGian() != null ? r.getSpTrungGian() : 0);
                row.createCell(13).setCellValue(r.getTongBtp() != null ? r.getTongBtp() : 0);
                row.createCell(14).setCellValue(bd(r.getBbc1_3()));
                row.createCell(15).setCellValue(bd(r.getPcChiPhi()));
                row.createCell(16).setCellValue(bd(r.getPlChiPhi()));
                row.createCell(17).setCellValue(bd(r.getDgChiPhi()));
                row.createCell(18).setCellValue(bd(r.getSigmaCong()));
                row.createCell(19).setCellValue(bd(r.getTemDb()));
                row.createCell(20).setCellValue(r.getDoDangDg() != null ? r.getDoDangDg() : 0);
                row.createCell(21).setCellValue(r.getTpNhapKho() != null ? r.getTpNhapKho() : 0);
                row.createCell(22).setCellValue(bd(r.getSoSpCong()));
                row.createCell(23).setCellValue(nvl(r.getCreatedBy()));
                row.createCell(24).setCellValue(r.getCreatedAt() != null ? r.getCreatedAt().toString() : "");
            }

            for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            wb.write(bos);
            return bos.toByteArray();
        }
    }

    private ProductionRecord mapToEntity(ProductionRecordDto dto) {
        ProductionRecord r = new ProductionRecord();
        updateEntity(r, dto);
        return r;
    }

    private void updateEntity(ProductionRecord r, ProductionRecordDto dto) {
        r.setMaTp(dto.getMaTp());
        r.setMaBravo(dto.getMaBravo());
        r.setTienTrinh(dto.getTienTrinh());
        r.setLsx(dto.getLsx());
        r.setSoLuong(dto.getSoLuong());
        r.setPcTrangThai(dto.getPcTrangThai());
        r.setPlTrangThai(dto.getPlTrangThai());
        r.setDgTrangThai(dto.getDgTrangThai());
        r.setBbc1TrangThai(dto.getBbc1TrangThai());
        r.setBbc1_1(dto.getBbc1_1());
        r.setPcPl(dto.getPcPl());
        r.setDg2(dto.getDg2());
        r.setBbc1_2(dto.getBbc1_2());
        r.setSpTrungGian(dto.getSpTrungGian());
        r.setTongBtp(dto.getTongBtp());
        r.setBbc1_3(dto.getBbc1_3());
        r.setPcChiPhi(dto.getPcChiPhi());
        r.setPlChiPhi(dto.getPlChiPhi());
        r.setDgChiPhi(dto.getDgChiPhi());
        r.setTemDb(dto.getTemDb());
        r.setTpNhapKho(dto.getTpNhapKho());
        r.setSoSpCong(dto.getSoSpCong());
        r.setSlTrungBinh(dto.getSlTrungBinh());
        r.setMoTa(dto.getMoTa());
    }

    public List<ProductionRecord> getWipDg() {
        List<ProductionRecord> list = enrichWithSlTrungBinh(repository.findWipDg());
        list.forEach(r -> {
            if (r.getMaTp() != null) {
                productMasterRepository.findByMaTpIgnoreCase(r.getMaTp()).ifPresent(pm ->
                    r.setMayMoc(pm.getMayMocDg()));
            }
        });
        return list;
    }

    public List<ProductionRecord> getWipPc() {
        List<ProductionRecord> list = repository.findWipPc();
        list.forEach(r -> {
            if (r.getMaTp() != null) {
                productMasterRepository.findByMaTpIgnoreCase(r.getMaTp()).ifPresent(pm -> {
                    java.math.BigDecimal ns = pm.getNangSuatPc();
                    r.setSlTrungBinh(ns != null ? ns : java.math.BigDecimal.ONE);
                    r.setMayMoc(pm.getMayMocPc());
                });
            }
        });
        return list;
    }

    public List<ProductionRecord> getWipPl() {
        List<ProductionRecord> list = repository.findWipPl();
        list.forEach(r -> {
            if (r.getMaTp() != null) {
                productMasterRepository.findByMaTpIgnoreCase(r.getMaTp()).ifPresent(pm -> {
                    java.math.BigDecimal ns = pm.getNangSuatPl();
                    r.setSlTrungBinh(ns != null ? ns : java.math.BigDecimal.ONE);
                    r.setMayMoc(pm.getMayMocPl());
                });
            }
        });
        return list;
    }

    public List<ProductionRecord> getWipBbc1() {
        List<ProductionRecord> list = repository.findWipBbc1();
        list.forEach(r -> {
            if (r.getMaTp() != null) {
                productMasterRepository.findByMaTpIgnoreCase(r.getMaTp()).ifPresent(pm -> {
                    java.math.BigDecimal ns = pm.getNangSuatBbc1();
                    r.setSlTrungBinh(ns != null ? ns : java.math.BigDecimal.ONE);
                    r.setMayMoc(pm.getMayMocBbc1());
                });
            }
        });
        return list;
    }

    private List<ProductionRecord> enrichWithSlTrungBinh(List<ProductionRecord> list) {
        list.forEach(r -> {
            if (r.getMaTp() != null) {
                productMasterRepository.findByMaTpIgnoreCase(r.getMaTp()).ifPresent(pm -> {
                    java.math.BigDecimal slTb = pm.getSlTrungBinh();
                    r.setSlTrungBinh(slTb != null ? slTb : java.math.BigDecimal.ONE);
                });
            }
        });
        return list;
    }

    private boolean isEmpty(String s) { return s == null || s.isBlank(); }
    private String nvl(String s) { return s != null ? s : ""; }
    private double bd(BigDecimal b) { return b != null ? b.doubleValue() : 0.0; }
}
