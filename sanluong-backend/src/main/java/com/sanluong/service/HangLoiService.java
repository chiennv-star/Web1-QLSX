package com.sanluong.service;

import com.sanluong.dto.HangLoiDto;
import com.sanluong.dto.HangLoiNgayDto;
import com.sanluong.entity.HangLoi;
import com.sanluong.entity.HangLoiNgay;
import com.sanluong.entity.ProductionRecord;
import com.sanluong.repository.HangLoiNgayRepository;
import com.sanluong.repository.HangLoiRepository;
import com.sanluong.repository.ProductionRecordRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
public class HangLoiService {

    private final HangLoiRepository repository;
    private final HangLoiNgayRepository ngayRepository;
    private final ProductionRecordRepository productionRecordRepository;
    private final NotificationService notificationService;

    public HangLoiService(HangLoiRepository repository,
                          HangLoiNgayRepository ngayRepository,
                          ProductionRecordRepository productionRecordRepository,
                          NotificationService notificationService) {
        this.repository = repository;
        this.ngayRepository = ngayRepository;
        this.productionRecordRepository = productionRecordRepository;
        this.notificationService = notificationService;
    }

    public Page<HangLoi> search(LocalDate fromDate, LocalDate toDate, String keyword, String trangThai, int page, int size) {
        String kw = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        // CHUA_XU_LY: lọc các bản ghi chưa có trạng thái (NULL hoặc rỗng)
        if ("CHUA_XU_LY".equals(trangThai)) {
            return repository.searchChuaXuLy(fromDate, toDate, kw, PageRequest.of(page, size));
        }
        String tt = (trangThai != null && !trangThai.isBlank()) ? trangThai.trim() : null;
        return repository.search(fromDate, toDate, kw, tt, PageRequest.of(page, size));
    }

    public HangLoi create(HangLoiDto dto, String username) {
        HangLoi h = new HangLoi();
        mapFromDto(h, dto);
        HangLoi saved = repository.save(h);
        syncProductionRecord(saved);
        notificationService.createHangLoiNotification(
                saved.getId(), saved.getMtpSongAn(), saved.getTenHangHoa(),
                saved.getSoLo(), saved.getPhanLoaiLoi(), username);
        return saved;
    }

    public HangLoi update(Long id, HangLoiDto dto) {
        HangLoi h = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ID: " + id));
        mapFromDto(h, dto);
        HangLoi saved = repository.save(h);
        syncProductionRecord(saved);
        return saved;
    }

    /**
     * Sau khi lưu HangLoi, tìm ProductionRecord khớp theo maBravo + tên sản phẩm + số lô
     * rồi ghi đầy đủ 7 trường trạng thái hàng lỗi (lấy giá trị từ bản ghi HangLoi mới nhất).
     */
    @Transactional
    public void syncProductionRecord(HangLoi source) {
        String maBravo   = source.getMtpSongAn();   // maBravo trong ProductionRecord
        String tienTrinh = source.getTenHangHoa();   // tên sản phẩm
        String lsx       = source.getSoLo();         // số lô

        if (maBravo == null || maBravo.isBlank()) return;

        // Lấy toàn bộ HangLoi cùng maBravo + soLo để tổng hợp số lượng
        List<HangLoi> nhomHL = (lsx != null && !lsx.isBlank())
                ? repository.findByMtpSongAnInAndSoLoIn(List.of(maBravo), List.of(lsx))
                : List.of(source);

        // Tổng hợp: text → lấy của bản ghi mới nhất (id lớn nhất); số → cộng dồn
        HangLoi latest       = nhomHL.get(0); // danh sách đã sắp DESC theo id
        BigDecimal slTraVe   = BigDecimal.ZERO;
        BigDecimal slDat     = BigDecimal.ZERO;
        BigDecimal slHuy     = BigDecimal.ZERO;
        for (HangLoi h : nhomHL) {
            slTraVe = slTraVe.add(h.getSoLuongTraVe()  != null ? h.getSoLuongTraVe()  : BigDecimal.ZERO);
            slDat   = slDat  .add(h.getSlDatSauXuLy()  != null ? h.getSlDatSauXuLy()  : BigDecimal.ZERO);
            slHuy   = slHuy  .add(h.getSlHuy()          != null ? h.getSlHuy()          : BigDecimal.ZERO);
        }

        // Tìm ProductionRecord khớp: maBravo bắt buộc, tienTrinh + lsx nếu có
        List<ProductionRecord> targets = productionRecordRepository
                .findByMaBravoAndTienTrinhAndLsx(maBravo, tienTrinh, lsx);

        for (ProductionRecord pr : targets) {
            pr.setHlSoLuongTraVe(slTraVe);
            pr.setHlLiDoTraVe(latest.getLiDoTraVe());
            pr.setHlHuongXuLy(latest.getHuongXuLy());
            pr.setHlTrangThaiXuLy(latest.getTrangThaiXuLy());
            pr.setHlLyDoChuaThucHien(latest.getLyDoChuaThucHien());
            pr.setHlSlDatSauXuLy(slDat);
            pr.setHlSlHuy(slHuy);
            productionRecordRepository.save(pr);
        }
    }

    /**
     * Batch summary: mỗi key = "{maTp}_{soLo}", value = aggregated HangLoi data
     * Dùng cho DashboardPage để hiển thị cột XỬ LÝ HÀNG LỖI
     */
    public Map<String, Map<String, Object>> batchSummary(List<String> maTps, List<String> soLos) {
        if (maTps == null || maTps.isEmpty() || soLos == null || soLos.isEmpty())
            return Collections.emptyMap();

        List<String> filteredMaTps = maTps.stream().filter(s -> s != null && !s.isBlank()).toList();
        List<String> filteredSoLos = soLos.stream().filter(s -> s != null && !s.isBlank()).toList();
        if (filteredMaTps.isEmpty() || filteredSoLos.isEmpty()) return Collections.emptyMap();

        List<HangLoi> rows = repository.findByMtpSongAnInAndSoLoIn(filteredMaTps, filteredSoLos);

        // Group by maTp+soLo, aggregate numeric fields, take latest text fields (already ordered by id DESC)
        Map<String, Map<String, Object>> result = new LinkedHashMap<>();
        for (HangLoi h : rows) {
            if (h.getMtpSongAn() == null || h.getSoLo() == null) continue;
            String key = h.getMtpSongAn() + "_" + h.getSoLo();
            result.computeIfAbsent(key, k -> {
                Map<String, Object> m = new HashMap<>();
                m.put("soLuongTraVe",    BigDecimal.ZERO);
                m.put("slDatSauXuLy",    BigDecimal.ZERO);
                m.put("slHuy",           BigDecimal.ZERO);
                m.put("liDoTraVe",       null);
                m.put("huongXuLy",       null);
                m.put("trangThaiXuLy",   null);
                m.put("ghiChu",          null);
                m.put("hangLoiId",       null);
                return m;
            });
            Map<String, Object> agg = result.get(key);
            // Sum numbers
            agg.put("soLuongTraVe", add((BigDecimal) agg.get("soLuongTraVe"), h.getSoLuongTraVe()));
            agg.put("slDatSauXuLy", add((BigDecimal) agg.get("slDatSauXuLy"), h.getSlDatSauXuLy()));
            agg.put("slHuy",        add((BigDecimal) agg.get("slHuy"),        h.getSlHuy()));
            // Take latest text (first in DESC-ordered list = latest id)
            if (agg.get("liDoTraVe")     == null) agg.put("liDoTraVe",     h.getLiDoTraVe());
            if (agg.get("huongXuLy")     == null) agg.put("huongXuLy",     h.getHuongXuLy());
            if (agg.get("trangThaiXuLy") == null) agg.put("trangThaiXuLy", h.getTrangThaiXuLy());
            if (agg.get("ghiChu")        == null) agg.put("ghiChu",        h.getGhiChu());
            if (agg.get("hangLoiId")     == null) agg.put("hangLoiId",     h.getId());
        }
        return result;
    }

    private BigDecimal add(BigDecimal a, BigDecimal b) {
        return (a == null ? BigDecimal.ZERO : a).add(b == null ? BigDecimal.ZERO : b);
    }

    public List<HangLoi> getByProduct(String maTp, String soLo) {
        if (maTp == null || maTp.isBlank()) return Collections.emptyList();
        return repository.findByMtpCoMemAndSoLo(maTp, (soLo != null && !soLo.isBlank()) ? soLo : null);
    }

    @Transactional
    public int bulkUpdateHuongXuLy(String maBravo, String soLo, String huongXuLy) {
        if (maBravo == null || maBravo.isBlank() || soLo == null || soLo.isBlank()) return 0;
        List<HangLoi> list = repository.findByMtpSongAnInAndSoLoIn(List.of(maBravo), List.of(soLo));
        for (HangLoi h : list) {
            h.setHuongXuLy(huongXuLy);
            HangLoi saved = repository.save(h);
            syncProductionRecord(saved);
        }
        return list.size();
    }

    public long countChuaXuLy() {
        return repository.countChuaXuLy();
    }

    public boolean existsByTriplet(String mtpCoMem, String tenHangHoa, String soLo) {
        if (mtpCoMem == null || mtpCoMem.isBlank()) return false;
        return repository.existsByTriplet(mtpCoMem, tenHangHoa, soLo);
    }

    @Transactional
    public void delete(Long id) {
        repository.deleteById(id);
    }

    // ── HangLoiNgay CRUD ──────────────────────────────────────────────────────

    public List<HangLoiNgay> getNgayByHangLoi(Long hangLoiId) {
        return ngayRepository.findByHangLoiIdOrderByNgayDesc(hangLoiId);
    }

    @Transactional
    public HangLoiNgay createNgay(Long hangLoiId, HangLoiNgayDto dto) {
        HangLoi hangLoi = repository.findById(hangLoiId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy HangLoi ID: " + hangLoiId));
        HangLoiNgay ngay = new HangLoiNgay();
        ngay.setHangLoi(hangLoi);
        mapNgayFromDto(ngay, dto);
        HangLoiNgay saved = ngayRepository.save(ngay);
        recalcTotals(hangLoi);
        syncProductionRecord(hangLoi);
        return saved;
    }

    @Transactional
    public HangLoiNgay updateNgay(Long hangLoiId, Long ngayId, HangLoiNgayDto dto) {
        HangLoiNgay ngay = ngayRepository.findById(ngayId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy HangLoiNgay ID: " + ngayId));
        if (!ngay.getHangLoi().getId().equals(hangLoiId))
            throw new RuntimeException("HangLoiNgay không thuộc HangLoi này");
        mapNgayFromDto(ngay, dto);
        HangLoiNgay saved = ngayRepository.save(ngay);
        HangLoi hangLoi = repository.findById(hangLoiId).orElseThrow();
        recalcTotals(hangLoi);
        syncProductionRecord(hangLoi);
        return saved;
    }

    @Transactional
    public void deleteNgay(Long hangLoiId, Long ngayId) {
        HangLoiNgay ngay = ngayRepository.findById(ngayId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy HangLoiNgay ID: " + ngayId));
        if (!ngay.getHangLoi().getId().equals(hangLoiId))
            throw new RuntimeException("HangLoiNgay không thuộc HangLoi này");
        ngayRepository.deleteById(ngayId);
        HangLoi hangLoi = repository.findById(hangLoiId).orElseThrow();
        recalcTotals(hangLoi);
        syncProductionRecord(hangLoi);
    }

    private void recalcTotals(HangLoi hangLoi) {
        long count = ngayRepository.countByHangLoiId(hangLoi.getId());
        if (count == 0) return; // keep manual values if no daily entries
        hangLoi.setSoLuongTraVe(ngayRepository.sumSlTraVe(hangLoi.getId()));
        hangLoi.setSlDatSauXuLy(ngayRepository.sumSlDatSauXuLy(hangLoi.getId()));
        hangLoi.setSlHuy(ngayRepository.sumSlHuy(hangLoi.getId()));
        repository.save(hangLoi);
    }

    private void mapNgayFromDto(HangLoiNgay ngay, HangLoiNgayDto dto) {
        ngay.setNgay(dto.getNgay() != null ? LocalDate.parse(dto.getNgay()) : null);
        ngay.setSlTraVe(dto.getSlTraVe());
        ngay.setSlDatSauXuLy(dto.getSlDatSauXuLy());
        ngay.setSlHuy(dto.getSlHuy());
        ngay.setGhiChu(dto.getGhiChu());
    }

    private LocalDate parseDate(String s) {
        return (s != null && !s.isBlank()) ? LocalDate.parse(s) : null;
    }

    private void mapFromDto(HangLoi h, HangLoiDto dto) {
        h.setMtpCoMem(dto.getMtpCoMem());
        h.setMtpSongAn(dto.getMtpSongAn());
        h.setTenHangHoa(dto.getTenHangHoa());
        h.setSoLo(dto.getSoLo());
        h.setSoLuong(dto.getSoLuong());
        h.setLiDoTraVe(dto.getLiDoTraVe());
        h.setNamXuLy(dto.getNamXuLy());
        h.setHuongXuLy(dto.getHuongXuLy());
        h.setPhanLoaiLoi(dto.getPhanLoaiLoi());
        h.setNgayBatDau(parseDate(dto.getNgayBatDau()));
        h.setNgayKetThuc(parseDate(dto.getNgayKetThuc()));
        h.setTrangThaiXuLy(dto.getTrangThaiXuLy());
        h.setGhiChu(dto.getGhiChu());
        h.setSlDatSauXuLy(dto.getSlDatSauXuLy());
        h.setSlHuy(dto.getSlHuy());
        h.setSoLuongTraVe(dto.getSoLuongTraVe());
        h.setLyDoChuaThucHien(dto.getLyDoChuaThucHien());
    }
}
