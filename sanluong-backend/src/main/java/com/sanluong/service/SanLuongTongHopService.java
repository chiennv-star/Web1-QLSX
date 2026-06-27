package com.sanluong.service;

import com.sanluong.entity.SanLuongTongHop;
import com.sanluong.repository.SanLuongTongHopRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.*;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.math.BigDecimal;
import java.util.*;

@Service
public class SanLuongTongHopService {

    private final SanLuongTongHopRepository repo;

    public SanLuongTongHopService(SanLuongTongHopRepository repo) {
        this.repo = repo;
    }

    public Page<SanLuongTongHop> search(String maBravo, String maTp, String lsx, int page, int size) {
        String mb = (maBravo == null || maBravo.isBlank()) ? null : maBravo.trim();
        String mt = (maTp    == null || maTp.isBlank())    ? null : maTp.trim();
        String ls = (lsx     == null || lsx.isBlank())     ? null : lsx.trim();
        return repo.search(mb, mt, ls, PageRequest.of(page, size));
    }

    public void delete(Long id) {
        repo.findById(id).ifPresent(repo::delete);
    }

    // ── Template Excel ────────────────────────────────────────────────────────

    public byte[] generateTemplate() throws IOException {
        try (XSSFWorkbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            XSSFCellStyle reqStyle = wb.createCellStyle();
            reqStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte)30,(byte)69,(byte)112}, null));
            reqStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            reqStyle.setBorderBottom(BorderStyle.THIN);
            reqStyle.setAlignment(HorizontalAlignment.CENTER);
            reqStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            XSSFFont reqFont = wb.createFont();
            reqFont.setColor(new XSSFColor(new byte[]{(byte)255,(byte)255,(byte)255}, null));
            reqFont.setBold(true); reqFont.setFontHeightInPoints((short)11);
            reqStyle.setFont(reqFont);

            XSSFCellStyle optStyle = wb.createCellStyle();
            optStyle.cloneStyleFrom(reqStyle);
            optStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte)68,(byte)114,(byte)196}, null));

            XSSFCellStyle slStyle = wb.createCellStyle();
            slStyle.cloneStyleFrom(reqStyle);
            slStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte)0,(byte)97,(byte)0}, null));

            XSSFCellStyle cpStyle = wb.createCellStyle();
            cpStyle.cloneStyleFrom(reqStyle);
            cpStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte)120,(byte)60,(byte)0}, null));

            XSSFCellStyle hsStyle = wb.createCellStyle();
            hsStyle.cloneStyleFrom(reqStyle);
            hsStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte)60,(byte)0,(byte)120}, null));

            XSSFCellStyle dataStyle = wb.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN); dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);
            dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            XSSFSheet sheet = wb.createSheet("SanLuong");

            // col 0-9: thông tin cơ bản + trạng thái
            // col 10-16: sản lượng từng công đoạn
            // col 17-22: chi phí công (thêm Công GNNL)
            // col 23-27: hiệu suất / QA / ghi chú
            String[] headers = {
                "Mã Bravo (*)", "Mã TP (*)", "Tiến Trình / Tên SP",
                "LSX / Số Lô", "Số Lượng KH", "Mã Đơn Hàng",
                "PC Trạng thái", "PL Trạng thái", "ĐG Trạng thái", "BBC1 Trạng thái",
                // Sản lượng
                "SL PC", "SL PL (PC→PL)", "SL ĐG",
                "SL BBC1", "SP Trung gian", "TP Nhập kho",
                // Chi phí công
                "Công BBC1", "Công PC", "Công PL", "Công ĐG", "Công CC", "Công GNNL",
                // Hiệu suất & QA
                "SL Trung bình", "QA PL Lấy mẫu", "QA ĐG Lấy mẫu", "Mô tả", "Ghi chú hiệu suất"
            };
            XSSFCellStyle[] colStyles = {
                reqStyle, reqStyle, optStyle, optStyle, optStyle, optStyle,
                optStyle, optStyle, optStyle, optStyle,
                slStyle, slStyle, slStyle, slStyle, slStyle, slStyle,
                cpStyle, cpStyle, cpStyle, cpStyle, cpStyle, cpStyle,
                hsStyle, hsStyle, hsStyle, hsStyle, hsStyle
            };
            int[] widths = {
                16, 12, 40, 16, 14, 16, 16, 16, 16, 16,
                12, 15, 12, 12, 14, 14,
                12, 12, 12, 12, 12, 12,
                14, 14, 14, 30, 30
            };

            Row hRow = sheet.createRow(0);
            hRow.setHeightInPoints(22);
            for (int c = 0; c < headers.length; c++) {
                Cell cell = hRow.createCell(c);
                cell.setCellValue(headers[c]);
                cell.setCellStyle(colStyles[c]);
                sheet.setColumnWidth(c, widths[c] * 256);
            }

            String[][] samples = {
                {"10101205","TP205","Son Lụa Diễm 104","2506001","2000","206150626","doing","doing","","",
                 "","","","","","","","","","","","","","","","",""},
                {"10202287","TP287","Xịt khoáng hoa hồng Mineral Rose","2506002","5000","287070626","done","doing","doing","doing",
                 "","","","","","","","","","","","","","","","",""},
            };
            XSSFCellStyle dataStyleRow = wb.createCellStyle();
            dataStyleRow.cloneStyleFrom(dataStyle);
            for (int r = 0; r < samples.length; r++) {
                Row row = sheet.createRow(r + 1);
                row.setHeightInPoints(18);
                for (int c = 0; c < samples[r].length; c++) {
                    Cell cell = row.createCell(c);
                    cell.setCellValue(samples[r][c]);
                    cell.setCellStyle(dataStyleRow);
                }
            }

            String[] ttOptions = {"doing", "done", ""};
            DataValidationHelper dvH = sheet.getDataValidationHelper();
            for (int col : new int[]{6, 7, 8, 9}) {
                DataValidationConstraint c = dvH.createExplicitListConstraint(ttOptions);
                DataValidation dv = dvH.createValidation(c, new CellRangeAddressList(1, 500, col, col));
                dv.setShowErrorBox(false);
                sheet.addValidationData(dv);
            }

            XSSFSheet guide = wb.createSheet("Hướng Dẫn");
            String[] notes = {
                "HƯỚNG DẪN IMPORT TỔNG HỢP SẢN LƯỢNG",
                "",
                "Cột bắt buộc (nền xanh đậm) — cột A, B:",
                "  - Mã Bravo (*): mã bravo của sản phẩm",
                "  - Mã TP (*):    mã thành phẩm (Song An)",
                "",
                "Thông tin cơ bản (nền xanh nhạt) — cột C÷J:",
                "  - Tiến Trình / Tên SP",
                "  - LSX / Số Lô",
                "  - Số Lượng KH: số nguyên",
                "  - Mã Đơn Hàng",
                "  - PC/PL/ĐG/BBC1 Trạng thái: 'doing' hoặc 'done'",
                "",
                "Sản lượng công đoạn (nền xanh lá) — cột K÷P:",
                "  - SL PC, SL PL, SL ĐG, SL BBC1: số nguyên",
                "  - SP Trung gian, TP Nhập kho: số nguyên",
                "",
                "Chi phí công (nền cam) — cột R÷W:",
                "  - Công BBC1, Công PC, Công PL, Công ĐG, Công CC: số thực (vd: 1.25)",
                "  - Công GNNL: số thực (chi phí GNNL)",
                "",
                "Hiệu suất & QA (nền tím) — cột X÷AB:",
                "  - SL Trung bình: số thực",
                "  - QA PL Lấy mẫu: số nguyên",
                "  - QA ĐG Lấy mẫu: số nguyên",
                "  - Mô tả, Ghi chú hiệu suất: văn bản",
                "",
                "Lưu ý:",
                "  - Bản ghi trùng (Mã Bravo + LSX + Mã Đơn Hàng) sẽ bị bỏ qua",
                "  - Dòng thiếu Mã Bravo hoặc Mã TP sẽ bị bỏ qua",
                "  - Không xóa dòng header (dòng 1)",
            };
            for (int i = 0; i < notes.length; i++) {
                Row row = guide.createRow(i);
                row.createCell(0).setCellValue(notes[i]);
            }
            guide.setColumnWidth(0, 80 * 256);

            wb.write(out);
            return out.toByteArray();
        }
    }

    // ── Import từ Excel ───────────────────────────────────────────────────────

    public Map<String, Object> importFromExcel(MultipartFile file, String username) throws IOException {
        int created = 0, skipped = 0;
        List<String> errors = new ArrayList<>();

        try (Workbook wb = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                String maBravo = cellStr(row, 0);
                String maTp    = cellStr(row, 1);
                if (maBravo.isBlank() && maTp.isBlank()) continue;
                if (maBravo.isBlank() || maTp.isBlank()) {
                    errors.add("Dòng " + (i + 1) + ": thiếu Mã Bravo hoặc Mã TP");
                    continue;
                }

                String tienTrinh  = cellStr(row, 2);
                String lsx        = cellStr(row, 3);
                String soLuongStr = cellStr(row, 4);
                String maDonHang  = cellStr(row, 5);
                String pcTT       = normTT(cellStr(row, 6));
                String plTT       = normTT(cellStr(row, 7));
                String dgTT       = normTT(cellStr(row, 8));
                String bbc1TT     = normTT(cellStr(row, 9));

                String slPc        = cellStr(row, 10);
                String pcPl        = cellStr(row, 11);
                String dg2         = cellStr(row, 12);
                String bbc1_2      = cellStr(row, 13);
                String spTrungGian = cellStr(row, 14);
                String tpNhapKho   = cellStr(row, 15);

                String congBbc1 = cellStr(row, 16);
                String congPc   = cellStr(row, 17);
                String congPl   = cellStr(row, 18);
                String congDg   = cellStr(row, 19);
                String congCc   = cellStr(row, 20);
                String congGnnl = cellStr(row, 21);

                String slTrungBinh    = cellStr(row, 22);
                String plQaLayMau     = cellStr(row, 23);
                String dgQaLayMau     = cellStr(row, 24);
                String moTa           = cellStr(row, 25);
                String ghiChuHieuSuat = cellStr(row, 26);

                String maDonHangKey = maDonHang.isBlank() ? null : maDonHang;
                if (repo.existsByMaBravoAndLsxAndMaDonHang(maBravo, lsx.isBlank() ? null : lsx, maDonHangKey)) {
                    skipped++;
                    continue;
                }

                SanLuongTongHop e = new SanLuongTongHop();
                e.setMaBravo(maBravo);
                e.setMaTp(maTp);
                e.setTienTrinh(tienTrinh.isBlank() ? null : tienTrinh);
                e.setLsx(lsx.isBlank() ? null : lsx);
                e.setMaDonHang(maDonHangKey);
                e.setPcTrangThai(pcTT);
                e.setPlTrangThai(plTT);
                e.setDgTrangThai(dgTT);
                e.setBbc1TrangThai(bbc1TT);
                e.setCreatedBy(username);
                e.setUpdatedBy(username);

                parseIntCell(soLuongStr,  e::setSoLuong);
                parseIntCell(spTrungGian, e::setSpTrungGian);
                parseIntCell(tpNhapKho,   e::setTpNhapKho);
                parseIntCell(plQaLayMau,  e::setPlQaLayMau);
                parseIntCell(dgQaLayMau,  e::setDgQaLayMau);
                parseBdCell(congBbc1,     e::setBbc1_3);
                parseBdCell(congPc,       e::setPcChiPhi);
                parseBdCell(congPl,       e::setPlChiPhi);
                parseBdCell(congDg,       e::setDgChiPhi);
                parseBdCell(congCc,       e::setCcChiPhi);
                parseBdCell(congGnnl,     e::setTemDb);
                parseBdCell(slTrungBinh,  e::setSlTrungBinh);

                if (!slPc.isBlank())   e.setSlPc(slPc);
                if (!pcPl.isBlank())   e.setPcPl(pcPl);
                if (!dg2.isBlank())    e.setDg2(dg2);
                if (!bbc1_2.isBlank()) e.setBbc1_2(bbc1_2);
                if (!moTa.isBlank())           e.setMoTa(moTa);
                if (!ghiChuHieuSuat.isBlank()) e.setGhiChuHieuSuat(ghiChuHieuSuat);

                try {
                    repo.save(e);
                    created++;
                } catch (Exception ex) {
                    errors.add("Dòng " + (i + 1) + ": " + ex.getMessage());
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("created", created);
        result.put("skipped", skipped);
        result.put("errors", errors);
        return result;
    }

    private void parseIntCell(String val, java.util.function.Consumer<Integer> setter) {
        if (val == null || val.isBlank()) return;
        try { setter.accept((int) Double.parseDouble(val)); } catch (NumberFormatException ignored) {}
    }

    private void parseBdCell(String val, java.util.function.Consumer<BigDecimal> setter) {
        if (val == null || val.isBlank()) return;
        try { setter.accept(new BigDecimal(val)); } catch (NumberFormatException ignored) {}
    }

    private String cellStr(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                double d = cell.getNumericCellValue();
                yield d == Math.floor(d) ? String.valueOf((long) d) : String.valueOf(d);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> "";
        };
    }

    private String normTT(String v) {
        if (v == null) return null;
        return switch (v.toLowerCase().trim()) {
            case "doing" -> "doing";
            case "done"  -> "done";
            default      -> null;
        };
    }
}
