package com.sanluong.service;

import com.sanluong.dto.KhoKiemKeRequest;
import com.sanluong.entity.KhoNhatKy;
import com.sanluong.entity.KhoTon;
import com.sanluong.entity.KhoViTri;
import com.sanluong.repository.KhoNhatKyRepository;
import com.sanluong.repository.KhoTonRepository;
import com.sanluong.repository.KhoViTriRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class KhoService {

    private static final List<String> SEED_KHU = List.of("A", "B");

    private final KhoViTriRepository viTriRepo;
    private final KhoTonRepository tonRepo;
    private final KhoNhatKyRepository logRepo;

    public KhoService(KhoViTriRepository viTriRepo, KhoTonRepository tonRepo, KhoNhatKyRepository logRepo) {
        this.viTriRepo = viTriRepo;
        this.tonRepo = tonRepo;
        this.logRepo = logRepo;
    }

    /** Sinh sơ đồ vị trí mặc định (Khu A/B x 3 dãy x 3 tầng x 2 ô) nếu bảng vị trí đang trống. */
    @Transactional
    public void seedViTriIfEmpty() {
        if (viTriRepo.count() > 0) return;
        List<KhoViTri> toSave = new ArrayList<>();
        for (String khu : SEED_KHU) {
            for (int d = 1; d <= 3; d++) {
                for (int t = 1; t <= 3; t++) {
                    for (int o = 1; o <= 2; o++) {
                        String daySo = String.format("%02d", d);
                        String tangSo = String.format("%02d", t);
                        String oSo = String.format("%02d", o);
                        KhoViTri vt = new KhoViTri();
                        vt.setMa(khu + "-" + daySo + "-" + tangSo + "-" + oSo);
                        vt.setKhu(khu);
                        vt.setDaySo(daySo);
                        vt.setTangSo(tangSo);
                        vt.setOSo(oSo);
                        toSave.add(vt);
                    }
                }
            }
        }
        viTriRepo.saveAll(toSave);
    }

    public Map<String, Object> getDashboard() {
        List<KhoTon> all = tonRepo.findAll();
        long totalLoc = viTriRepo.count();
        Set<String> usedLoc = all.stream().map(KhoTon::getViTri).collect(Collectors.toSet());
        long skuCount = all.stream().map(KhoTon::getMaHang).distinct().count();
        int fillPercent = totalLoc == 0 ? 0 : (int) Math.round(usedLoc.size() * 100.0 / totalLoc);
        long expCount = all.stream()
                .filter(x -> x.getHanDung() != null && ChronoUnit.DAYS.between(LocalDate.now(), x.getHanDung()) <= 60)
                .count();

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("skuCount", skuCount);
        m.put("fillPercent", fillPercent);
        m.put("freeCount", totalLoc - usedLoc.size());
        m.put("expCount", expCount);
        m.put("totalLoc", totalLoc);
        return m;
    }

    public List<KhoNhatKy> getLog(int limit) {
        return logRepo.findAllByOrderByThoiGianDesc(PageRequest.of(0, Math.max(1, limit)));
    }

    public List<KhoViTri> listViTri() {
        return viTriRepo.findAllByOrderByMaAsc();
    }

    public List<Map<String, Object>> listViTriWithUsage() {
        List<KhoTon> all = tonRepo.findAll();
        Map<String, List<KhoTon>> byLoc = all.stream().collect(Collectors.groupingBy(KhoTon::getViTri));
        return listViTri().stream().map(l -> {
            List<KhoTon> items = byLoc.getOrDefault(l.getMa(), List.of());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("ma", l.getMa());
            row.put("qty", items.stream().mapToInt(KhoTon::getSoLuong).sum());
            row.put("itemCount", items.size());
            return row;
        }).toList();
    }

    public List<KhoTon> itemsAtLocation(String viTri) {
        return tonRepo.findByViTri(viTri);
    }

    public List<Map<String, Object>> search(String keyword) {
        List<KhoTon> rows = (keyword == null || keyword.isBlank())
                ? tonRepo.findAll()
                : tonRepo.findByMaHangContainingIgnoreCaseOrTenHangContainingIgnoreCase(keyword, keyword);

        Map<String, List<KhoTon>> grouped = rows.stream()
                .collect(Collectors.groupingBy(KhoTon::getMaHang, LinkedHashMap::new, Collectors.toList()));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, List<KhoTon>> e : grouped.entrySet()) {
            List<KhoTon> list = e.getValue();
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("maHang", e.getKey());
            row.put("tenHang", list.get(0).getTenHang());
            row.put("dvt", list.get(0).getDvt());
            row.put("tong", list.stream().mapToInt(KhoTon::getSoLuong).sum());
            row.put("soViTri", list.stream().map(KhoTon::getViTri).distinct().count());
            result.add(row);
        }
        return result;
    }

    public List<KhoTon> detail(String maHang) {
        return tonRepo.findByMaHangOrderByHanDungAsc(maHang);
    }

    @Transactional
    public KhoTon nhapKho(String maHang, String tenHang, String viTri, String soLo, LocalDate hanDung,
                           Integer soLuong, String dvt, String actor) {
        if (maHang == null || maHang.isBlank()) throw new IllegalArgumentException("Thiếu mã hàng");
        if (viTri == null || !viTriRepo.existsByMa(viTri))
            throw new IllegalArgumentException("Không có ô " + viTri + " trong sơ đồ kho");
        if (soLuong == null || soLuong < 1) throw new IllegalArgumentException("Số lượng không hợp lệ");

        KhoTon kt = new KhoTon();
        kt.setMaHang(maHang);
        kt.setTenHang(tenHang);
        kt.setViTri(viTri);
        kt.setSoLo(soLo);
        kt.setHanDung(hanDung);
        kt.setSoLuong(soLuong);
        if (dvt != null && !dvt.isBlank()) kt.setDvt(dvt);
        KhoTon saved = tonRepo.save(kt);

        addLog("NHAP", "Nhập " + soLuong + " " + saved.getDvt().toLowerCase() + " " + maHang + " vào " + viTri, actor);
        return saved;
    }

    /** Xem trước lộ trình xuất theo FEFO — không thay đổi dữ liệu. */
    public Map<String, Object> xuatPlan(String maHang, int soLuong) {
        List<KhoTon> rows = tonRepo.findByMaHangOrderByHanDungAsc(maHang);
        List<Map<String, Object>> plan = new ArrayList<>();
        int need = soLuong;
        for (KhoTon r : rows) {
            if (need <= 0) break;
            int take = Math.min(need, r.getSoLuong());
            Map<String, Object> p = new LinkedHashMap<>();
            p.put("stockId", r.getId());
            p.put("viTri", r.getViTri());
            p.put("soLo", r.getSoLo());
            p.put("hanDung", r.getHanDung());
            p.put("conLai", r.getSoLuong());
            p.put("lay", take);
            plan.add(p);
            need -= take;
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("plan", plan);
        result.put("thieu", Math.max(need, 0));
        return result;
    }

    @Transactional
    public int xuatConfirm(String maHang, int soLuong, String actor) {
        List<KhoTon> rows = tonRepo.findByMaHangOrderByHanDungAsc(maHang);
        int need = soLuong;
        int taken = 0;
        for (KhoTon r : rows) {
            if (need <= 0) break;
            int take = Math.min(need, r.getSoLuong());
            r.setSoLuong(r.getSoLuong() - take);
            need -= take;
            taken += take;
            if (r.getSoLuong() <= 0) tonRepo.delete(r);
            else tonRepo.save(r);
        }
        addLog("XUAT", "Xuất " + taken + " " + maHang + " theo FEFO", actor);
        return taken;
    }

    @Transactional
    public KhoTon chuyenO(Long stockId, String viTriDich, String actor) {
        KhoTon item = tonRepo.findById(stockId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lô hàng"));
        if (viTriDich == null || !viTriRepo.existsByMa(viTriDich))
            throw new IllegalArgumentException("Không có ô " + viTriDich + " trong sơ đồ kho");
        if (viTriDich.equals(item.getViTri()))
            throw new IllegalArgumentException("Ô đích trùng ô nguồn");

        String from = item.getViTri();
        item.setViTri(viTriDich);
        KhoTon saved = tonRepo.save(item);
        addLog("CHUYEN", "Chuyển " + saved.getSoLuong() + " " + saved.getMaHang() + " từ " + from + " → " + viTriDich, actor);
        return saved;
    }

    @Transactional
    public Map<String, Object> kiemKe(KhoKiemKeRequest req, String actor) {
        int lech = 0;
        for (KhoKiemKeRequest.Item it : req.getItems()) {
            KhoTon kt = tonRepo.findById(it.getStockId()).orElse(null);
            if (kt == null) continue;
            int thucTe = it.getSoLuongThucTe() == null ? 0 : it.getSoLuongThucTe();
            lech += Math.abs(thucTe - kt.getSoLuong());
            if (thucTe <= 0) tonRepo.delete(kt);
            else { kt.setSoLuong(thucTe); tonRepo.save(kt); }
        }
        addLog("KIEM_KE", "Kiểm kê ô " + req.getViTri() + " — " + (lech > 0 ? "lệch " + lech + " đơn vị" : "khớp sổ sách"), actor);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("lech", lech);
        return result;
    }

    private void addLog(String loai, String noiDung, String actor) {
        KhoNhatKy k = new KhoNhatKy();
        k.setLoai(loai);
        k.setNoiDung(noiDung);
        k.setNguoiThucHien(actor);
        logRepo.save(k);
    }
}
