package com.sanluong.service;

import com.sanluong.dto.*;
import com.sanluong.entity.*;
import com.sanluong.repository.*;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class KyThuatCongNgheService {

    private final KyThuatCoDienRepository coDienRepo;
    private final KyThuatKyThuatRepository kyThuatRepo;
    private final KyThuatThuViecRepository thuViecRepo;
    private final KyThuatBaoTriRepository baoTriRepo;
    private final KyThuatKaizenRepository kaizenRepo;

    public KyThuatCongNgheService(KyThuatCoDienRepository coDienRepo,
                                   KyThuatKyThuatRepository kyThuatRepo,
                                   KyThuatThuViecRepository thuViecRepo,
                                   KyThuatBaoTriRepository baoTriRepo,
                                   KyThuatKaizenRepository kaizenRepo) {
        this.coDienRepo = coDienRepo;
        this.kyThuatRepo = kyThuatRepo;
        this.thuViecRepo = thuViecRepo;
        this.baoTriRepo = baoTriRepo;
        this.kaizenRepo = kaizenRepo;
    }

    // ── Cơ điện ──────────────────────────────────────────────────────────────
    public List<KyThuatCoDien> listCoDien() { return coDienRepo.findAllByOrderByNgayDescIdDesc(); }

    public KyThuatCoDien createCoDien(KyThuatCoDienDto dto) {
        KyThuatCoDien e = new KyThuatCoDien();
        mapCoDien(e, dto);
        return coDienRepo.save(e);
    }

    public KyThuatCoDien updateCoDien(Long id, KyThuatCoDienDto dto) {
        KyThuatCoDien e = coDienRepo.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy ID: " + id));
        mapCoDien(e, dto);
        return coDienRepo.save(e);
    }

    public void deleteCoDien(Long id) { coDienRepo.deleteById(id); }

    private void mapCoDien(KyThuatCoDien e, KyThuatCoDienDto dto) {
        e.setNgay(dto.getNgay());
        e.setMoTa(dto.getMoTa());
        e.setThietBi(dto.getThietBi());
        e.setKhuVuc(dto.getKhuVuc());
        e.setPhanLoai(dto.getPhanLoai());
        e.setMucDo(dto.getMucDo());
        e.setNguyenNhan(dto.getNguyenNhan());
        e.setBienPhap(dto.getBienPhap());
        e.setLinhKien(dto.getLinhKien());
        e.setKetQua(dto.getKetQua());
        e.setTrangThai(dto.getTrangThai());
        e.setNguoiPhuTrach(dto.getNguoiPhuTrach());
    }

    // ── Kỹ thuật ─────────────────────────────────────────────────────────────
    public List<KyThuatKyThuat> listKyThuat() { return kyThuatRepo.findAllByOrderByNgayDescIdDesc(); }

    public KyThuatKyThuat createKyThuat(KyThuatKyThuatDto dto) {
        KyThuatKyThuat e = new KyThuatKyThuat();
        mapKyThuat(e, dto);
        return kyThuatRepo.save(e);
    }

    public KyThuatKyThuat updateKyThuat(Long id, KyThuatKyThuatDto dto) {
        KyThuatKyThuat e = kyThuatRepo.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy ID: " + id));
        mapKyThuat(e, dto);
        return kyThuatRepo.save(e);
    }

    public void deleteKyThuat(Long id) { kyThuatRepo.deleteById(id); }

    private void mapKyThuat(KyThuatKyThuat e, KyThuatKyThuatDto dto) {
        e.setNgay(dto.getNgay());
        e.setMoTa(dto.getMoTa());
        e.setPhanLoai(dto.getPhanLoai());
        e.setThietBi(dto.getThietBi());
        e.setMucDo(dto.getMucDo());
        e.setNoiDung(dto.getNoiDung());
        e.setGhiChu(dto.getGhiChu());
        e.setNguyenNhan(dto.getNguyenNhan());
        e.setBienPhap(dto.getBienPhap());
        e.setTrangThai(dto.getTrangThai());
        e.setNguoiPhuTrach(dto.getNguoiPhuTrach());
    }

    // ── Thử việc ─────────────────────────────────────────────────────────────
    public List<KyThuatThuViec> listThuViec() { return thuViecRepo.findAllByOrderByNgayDescIdDesc(); }

    public KyThuatThuViec createThuViec(KyThuatThuViecDto dto) {
        KyThuatThuViec e = new KyThuatThuViec();
        mapThuViec(e, dto);
        return thuViecRepo.save(e);
    }

    public KyThuatThuViec updateThuViec(Long id, KyThuatThuViecDto dto) {
        KyThuatThuViec e = thuViecRepo.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy ID: " + id));
        mapThuViec(e, dto);
        return thuViecRepo.save(e);
    }

    public void deleteThuViec(Long id) { thuViecRepo.deleteById(id); }

    private void mapThuViec(KyThuatThuViec e, KyThuatThuViecDto dto) {
        e.setNgay(dto.getNgay());
        e.setMoTa(dto.getMoTa());
        e.setPhanLoai(dto.getPhanLoai());
        e.setThietBi(dto.getThietBi());
        e.setNoiDung(dto.getNoiDung());
        e.setNguyenNhan(dto.getNguyenNhan());
        e.setBienPhap(dto.getBienPhap());
        e.setThoiGian(dto.getThoiGian());
        e.setTrangThai(dto.getTrangThai());
        e.setNguoiPhuTrach(dto.getNguoiPhuTrach());
    }

    // ── Bảo trì ──────────────────────────────────────────────────────────────
    public List<KyThuatBaoTri> listBaoTri() { return baoTriRepo.findAllByOrderByTenThietBiAsc(); }

    public KyThuatBaoTri createBaoTri(KyThuatBaoTriDto dto) {
        KyThuatBaoTri e = new KyThuatBaoTri();
        mapBaoTri(e, dto);
        return baoTriRepo.save(e);
    }

    public KyThuatBaoTri updateBaoTri(Long id, KyThuatBaoTriDto dto) {
        KyThuatBaoTri e = baoTriRepo.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy ID: " + id));
        mapBaoTri(e, dto);
        return baoTriRepo.save(e);
    }

    public void deleteBaoTri(Long id) { baoTriRepo.deleteById(id); }

    private void mapBaoTri(KyThuatBaoTri e, KyThuatBaoTriDto dto) {
        e.setTenThietBi(dto.getTenThietBi());
        e.setLich6tDau(dto.getLich6tDau());
        e.setLich6tCuoi(dto.getLich6tCuoi());
        e.setGhiChu(dto.getGhiChu());
    }

    // ── Kaizen ───────────────────────────────────────────────────────────────
    public List<KyThuatKaizen> listKaizen() { return kaizenRepo.findAllByOrderByNgayGhiNhanDescIdDesc(); }

    public KyThuatKaizen createKaizen(KyThuatKaizenDto dto) {
        KyThuatKaizen e = new KyThuatKaizen();
        mapKaizen(e, dto);
        return kaizenRepo.save(e);
    }

    public KyThuatKaizen updateKaizen(Long id, KyThuatKaizenDto dto) {
        KyThuatKaizen e = kaizenRepo.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy ID: " + id));
        mapKaizen(e, dto);
        return kaizenRepo.save(e);
    }

    public void deleteKaizen(Long id) { kaizenRepo.deleteById(id); }

    private void mapKaizen(KyThuatKaizen e, KyThuatKaizenDto dto) {
        e.setNgayGhiNhan(dto.getNgayGhiNhan());
        e.setChiSo(dto.getChiSo());
        e.setGtTruoc(dto.getGtTruoc());
        e.setGtSau(dto.getGtSau());
        e.setQuyDoi(dto.getQuyDoi());
        e.setMoTa(dto.getMoTa());
        e.setNguoiThucHien(dto.getNguoiThucHien());
    }

    // ── Dashboard tổng hợp ───────────────────────────────────────────────────
    public Map<String, Object> getDashboard() {
        List<KyThuatCoDien> coDien = listCoDien();
        List<KyThuatKyThuat> kyThuat = listKyThuat();
        List<KyThuatThuViec> thuViec = listThuViec();

        Map<String, Object> result = new LinkedHashMap<>();

        List<LocalDate> allDates = Stream.of(
                coDien.stream().map(KyThuatCoDien::getNgay),
                kyThuat.stream().map(KyThuatKyThuat::getNgay),
                thuViec.stream().map(KyThuatThuViec::getNgay)
        ).flatMap(s -> s).filter(Objects::nonNull).collect(Collectors.toList());

        int total = coDien.size() + kyThuat.size() + thuViec.size();
        long resolved = Stream.concat(
                Stream.concat(
                        coDien.stream().map(KyThuatCoDien::getTrangThai),
                        kyThuat.stream().map(KyThuatKyThuat::getTrangThai)
                ),
                thuViec.stream().map(KyThuatThuViec::getTrangThai)
        ).filter(t -> t != null && (t.contains("Đã xử lý") || t.contains("Đã đóng"))).count();

        long distinctDays = allDates.stream().distinct().count();
        LocalDate minDate = allDates.stream().min(Comparator.naturalOrder()).orElse(null);
        LocalDate maxDate = allDates.stream().max(Comparator.naturalOrder()).orElse(null);

        Set<String> equipSet = new HashSet<>();
        Map<String, Long> equipCount = new LinkedHashMap<>();
        Stream.of(
                coDien.stream().map(KyThuatCoDien::getThietBi),
                kyThuat.stream().map(KyThuatKyThuat::getThietBi),
                thuViec.stream().map(KyThuatThuViec::getThietBi)
        ).flatMap(s -> s).filter(t -> t != null && !t.isBlank()).forEach(t -> {
            equipSet.add(t);
            equipCount.merge(t, 1L, Long::sum);
        });

        Map<String, Object> kpi = new LinkedHashMap<>();
        kpi.put("total", total);
        kpi.put("codien", coDien.size());
        kpi.put("kythuat", kyThuat.size());
        kpi.put("thuviec", thuViec.size());
        kpi.put("days", distinctDays);
        kpi.put("resolved", resolved);
        kpi.put("resolvedPct", total > 0 ? Math.round(resolved * 100.0 / total) : 0);
        kpi.put("equipCount", equipSet.size());
        kpi.put("avgPerDay", distinctDays > 0 ? Math.round(total * 10.0 / distinctDays) / 10.0 : 0);
        kpi.put("dateMin", minDate);
        kpi.put("dateMax", maxDate);
        result.put("kpi", kpi);

        result.put("catCoDien", countBy(coDien.stream().map(KyThuatCoDien::getPhanLoai)));
        result.put("catKyThuat", countBy(kyThuat.stream().map(KyThuatKyThuat::getPhanLoai)));
        result.put("catThuViec", countBy(thuViec.stream().map(KyThuatThuViec::getPhanLoai)));

        result.put("equip", topEntries(equipCount, 12));
        result.put("area", topEntries(countBy(coDien.stream().map(KyThuatCoDien::getKhuVuc)), 10));

        Map<String, Long> statusAll = new LinkedHashMap<>();
        Stream.of(
                coDien.stream().map(KyThuatCoDien::getTrangThai),
                kyThuat.stream().map(KyThuatKyThuat::getTrangThai),
                thuViec.stream().map(KyThuatThuViec::getTrangThai)
        ).flatMap(s -> s).forEach(t -> {
            String key = (t == null || t.isBlank()) ? "Chưa cập nhật" : t;
            statusAll.merge(key, 1L, Long::sum);
        });
        result.put("status", topEntries(statusAll, 10));

        return result;
    }

    private Map<String, Long> countBy(Stream<String> values) {
        Map<String, Long> m = new LinkedHashMap<>();
        values.forEach(v -> {
            String key = (v == null || v.isBlank()) ? "Chưa phân loại" : v;
            m.merge(key, 1L, Long::sum);
        });
        return m;
    }

    private List<Map<String, Object>> topEntries(Map<String, Long> m, int limit) {
        return m.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(limit)
                .map(e -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("ten", e.getKey());
                    row.put("n", e.getValue());
                    return row;
                })
                .collect(Collectors.toList());
    }
}
