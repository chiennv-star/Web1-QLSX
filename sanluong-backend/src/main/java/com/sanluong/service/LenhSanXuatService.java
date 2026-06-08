package com.sanluong.service;

import com.sanluong.dto.LenhFieldHistoryDto;
import com.sanluong.dto.LenhLoHistoryDto;
import com.sanluong.dto.LenhSanXuatDto;
import com.sanluong.entity.LenhFieldHistory;
import com.sanluong.entity.LenhLoHistory;
import com.sanluong.entity.LenhSanXuat;
import com.sanluong.entity.ProductionRecord;
import com.sanluong.repository.LenhFieldHistoryRepository;
import com.sanluong.repository.LenhLoHistoryRepository;
import com.sanluong.repository.LenhSanXuatRepository;
import com.sanluong.repository.ProductionRecordRepository;
import com.sanluong.repository.WorkScheduleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class LenhSanXuatService {

    private static final Set<String> LOCKABLE_FIELDS = Set.of("maBravo", "maSp", "tenSanPham", "maDonHang");

    private final LenhSanXuatRepository repo;
    private final LenhLoHistoryRepository historyRepo;
    private final LenhFieldHistoryRepository fieldHistoryRepo;
    private final WorkScheduleRepository workScheduleRepo;
    private final ProductionRecordRepository productionRepo;
    private final NotificationService notificationService;
    private final WorkScheduleService workScheduleService;

    public LenhSanXuatService(LenhSanXuatRepository repo,
                               LenhLoHistoryRepository historyRepo,
                               LenhFieldHistoryRepository fieldHistoryRepo,
                               WorkScheduleRepository workScheduleRepo,
                               ProductionRecordRepository productionRepo,
                               NotificationService notificationService,
                               WorkScheduleService workScheduleService) {
        this.repo = repo;
        this.historyRepo = historyRepo;
        this.fieldHistoryRepo = fieldHistoryRepo;
        this.workScheduleRepo = workScheduleRepo;
        this.productionRepo = productionRepo;
        this.notificationService = notificationService;
        this.workScheduleService = workScheduleService;
    }


    public List<LenhSanXuatDto> findAll(String tinhTrang, String toThucHien,
                                        java.time.LocalDate fromDate, java.time.LocalDate toDate) {
        List<LenhSanXuat> list = repo.findFiltered(tinhTrang, toThucHien, fromDate, toDate);
        return list.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public LenhSanXuatDto create(LenhSanXuatDto dto, String username) {
        // Nếu đã tồn tại bản ghi với cùng key → trả về bản cũ, không tạo duplicate
        if (dto.getMaBravo() != null && dto.getNgayThucHien() != null) {
            java.util.Optional<LenhSanXuat> existing = repo.findExistingKey(
                    dto.getMaBravo(), dto.getMaDonHang(),
                    dto.getNgayThucHien(), dto.getToThucHien(), dto.getSoLo());
            if (existing.isPresent()) {
                return toDto(existing.get());
            }
        }
        LenhSanXuat e = new LenhSanXuat();
        applyDto(e, dto);
        if (e.getThuTu() == null) {
            e.setThuTu((repo.findMaxThuTu() == null ? 0 : repo.findMaxThuTu()) + 1);
        }
        e.setCreatedBy(username);
        e.setUpdatedBy(username);
        LenhSanXuat saved = repo.save(e);
        notificationService.createLenhSxNewNotification(
                saved.getId(), saved.getMaDonHang(), saved.getTenSanPham(), saved.getSoLo(), username);
        autoCreateSanLuong(saved, username);
        return toDto(saved);
    }

    private void autoCreateSanLuong(LenhSanXuat lenh, String username) {
        if (lenh.getMaBravo() == null || lenh.getSoLo() == null) return;

        // Tìm bản ghi Sản lượng hiện có hoặc tạo mới
        java.util.List<ProductionRecord> existing = productionRepo.findByLenhKey(
                lenh.getMaBravo(), lenh.getSoLo(), lenh.getMaDonHang());
        ProductionRecord pr;
        if (!existing.isEmpty()) {
            pr = existing.get(0);
        } else {
            pr = new ProductionRecord();
            pr.setMaBravo(lenh.getMaBravo());
            pr.setMaTp(lenh.getMaSp());
            pr.setTienTrinh(lenh.getTenSanPham());
            pr.setLsx(lenh.getSoLo());
            pr.setMaDonHang(lenh.getMaDonHang());
            pr.setSoLuong(lenh.getSoLuong() != null ? lenh.getSoLuong().intValue() : null);
            pr.setCreatedBy(username);
        }
        // Đánh dấu đã phát lệnh và set trạng thái các công đoạn
        pr.setPhatLenh(true);
        pr.setPcTrangThai("doing");
        pr.setPlTrangThai("doing");
        pr.setDgTrangThai("doing");
        pr.setBbc1TrangThai("doing");
        pr.setUpdatedBy(username);
        productionRepo.save(pr);

        // Tự động tạo bản ghi Lịch SX cho tất cả công đoạn
        String toNhomPcpl = lenh.getToThucHien();
        java.math.BigDecimal coLo = lenh.getSoLuong() != null
                ? new java.math.BigDecimal(lenh.getSoLuong()) : null;
        workScheduleService.autoSyncFromProduction(
                lenh.getMaBravo(), lenh.getMaSp(), lenh.getTenSanPham(),
                lenh.getSoLo(), coLo, lenh.getMaDonHang(), true, toNhomPcpl);
    }

    @Transactional
    public LenhSanXuatDto update(Long id, LenhSanXuatDto dto, String username) {
        LenhSanXuat e = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lệnh sản xuất: " + id));
        String oldMaDonHang = e.getMaDonHang();
        String oldSoLo      = e.getSoLo();
        applyDto(e, dto);
        // Auto-mark daBanHanh when lệnh is linked to Sản lượng (has maBravo + soLo)
        if (e.getMaBravo() != null && e.getSoLo() != null && !Boolean.TRUE.equals(e.getDaBanHanh())) {
            e.setDaBanHanh(true);
        }
        e.setUpdatedBy(username);
        LenhSanXuat saved = repo.save(e);
        if (saved.getMaBravo() != null && saved.getSoLo() != null) {
            int updated = productionRepo.updateByLenhKey(
                    saved.getMaBravo(),
                    oldSoLo != null ? oldSoLo : saved.getSoLo(),
                    oldMaDonHang,
                    saved.getSoLuong() != null ? saved.getSoLuong().intValue() : null,
                    saved.getTenSanPham(),
                    saved.getMaSp(),
                    saved.getMaDonHang(),
                    username);
            if (updated == 0) {
                autoCreateSanLuong(saved, username);
            } else if (Boolean.TRUE.equals(saved.getDaBanHanh())) {
                // ProductionRecord đã tồn tại nhưng chưa sync Lịch SX → sync ngay
                String toNhomPcpl = saved.getToThucHien();
                java.math.BigDecimal coLo = saved.getSoLuong();
                workScheduleService.autoSyncFromProduction(
                        saved.getMaBravo(), saved.getMaSp(), saved.getTenSanPham(),
                        saved.getSoLo(), coLo, saved.getMaDonHang(), true, toNhomPcpl);
            }
        }
        return toDto(saved);
    }

    public int countPendingSync() {
        return (int) repo.findAll().stream()
                .filter(e -> e.getDeletedAt() == null
                          && e.getMaBravo() != null
                          && e.getSoLo() != null
                          && !productionRepo.existsByMaBravoAndLsxAndMaDonHang(
                                  e.getMaBravo(), e.getSoLo(), e.getMaDonHang()))
                .count();
    }

    @Transactional
    public int syncAllSanLuong(String username) {
        List<LenhSanXuat> all = repo.findAll().stream()
                .filter(e -> e.getDeletedAt() == null
                          && e.getMaBravo() != null
                          && e.getSoLo() != null)
                .collect(Collectors.toList());
        int count = 0;
        for (LenhSanXuat lenh : all) {
            boolean changed = false;
            if (!productionRepo.existsByMaBravoAndLsxAndMaDonHang(
                    lenh.getMaBravo(), lenh.getSoLo(), lenh.getMaDonHang())) {
                autoCreateSanLuong(lenh, username);
                count++;
                changed = true;
            }
            // Mark daBanHanh for all lệnh that are linked to Sản lượng
            if (!Boolean.TRUE.equals(lenh.getDaBanHanh())) {
                lenh.setDaBanHanh(true);
                lenh.setUpdatedBy(username);
                changed = true;
            }
            if (changed) repo.save(lenh);
        }
        return count;
    }

    @Transactional
    public void delete(Long id, String username) {
        LenhSanXuat e = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lệnh: " + id));
        LocalDateTime now = LocalDateTime.now();
        e.setDeletedAt(now);
        e.setDeletedBy(username);
        repo.save(e);
        if (e.getMaBravo() != null && e.getSoLo() != null) {
            productionRepo.softDeleteByLenhKey(
                    e.getMaBravo(), e.getSoLo(), e.getMaDonHang(), now, username);
        }
    }

    @Transactional
    public int bulkDelete(List<Long> ids, String username) {
        List<LenhSanXuat> list = repo.findAllById(ids).stream()
                .filter(e -> e.getDeletedAt() == null)
                .collect(Collectors.toList());
        LocalDateTime now = LocalDateTime.now();
        list.forEach(e -> { e.setDeletedAt(now); e.setDeletedBy(username); });
        repo.saveAll(list);
        list.forEach(e -> {
            if (e.getMaBravo() != null && e.getSoLo() != null) {
                productionRepo.softDeleteByLenhKey(
                        e.getMaBravo(), e.getSoLo(), e.getMaDonHang(), now, username);
            }
        });
        return list.size();
    }

    public List<LenhSanXuatDto> findTrash() {
        return repo.findAllDeleted().stream().map(this::toDto).collect(Collectors.toList());
    }

    public LenhSanXuatDto restore(Long id, String username) {
        LenhSanXuat e = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lệnh: " + id));
        e.setDeletedAt(null);
        e.setDeletedBy(null);
        e.setUpdatedBy(username);
        return toDto(repo.save(e));
    }

    public void deletePermanent(Long id) {
        repo.deleteById(id);
    }

    public Map<String, Object> previewDoiLo(Long id) {
        LenhSanXuat e = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lệnh: " + id));
        boolean hasKey = e.getMaDonHang() != null && e.getSoLo() != null;
        long soKhoanLich     = hasKey ? workScheduleRepo.countByMaDonHangAndSoLoNative(e.getMaDonHang(), e.getSoLo()) : 0;
        long soKhoanSanLuong = hasKey ? productionRepo.countByMaDonHangAndLsxNative(e.getMaDonHang(), e.getSoLo())   : 0;
        return Map.of(
                "soLoCu",         e.getSoLo()     != null ? e.getSoLo()     : "",
                "maDonHang",      e.getMaDonHang() != null ? e.getMaDonHang() : "",
                "soKhoanLich",     soKhoanLich,
                "soKhoanSanLuong", soKhoanSanLuong
        );
    }

    @Transactional
    public LenhSanXuatDto doiLo(Long id, String soLoMoi, String lyDo, String username) {
        LenhSanXuat e = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lệnh: " + id));
        String soLoCu = e.getSoLo();

        LenhLoHistory hist = new LenhLoHistory();
        hist.setLenhId(id);
        hist.setSoLoCu(soLoCu);
        hist.setSoLoMoi(soLoMoi);
        hist.setLyDo(lyDo);
        hist.setChangedBy(username);
        hist.setChangedAt(LocalDateTime.now());
        historyRepo.save(hist);

        e.setSoLo(soLoMoi);
        e.setUpdatedBy(username);
        LenhSanXuat saved = repo.save(e);

        if (e.getMaDonHang() != null && soLoCu != null) {
            // Cascade → Kế hoạch/Lịch làm việc
            workScheduleRepo.updateSoLoByMaDonHangNative(e.getMaDonHang(), soLoCu, soLoMoi);
            // Cascade → Sản lượng
            productionRepo.updateLsxByMaDonHangNative(e.getMaDonHang(), soLoCu, soLoMoi);
        }

        // Gửi thông báo cho tất cả admin
        notificationService.createDoiLoNotification(
                id, e.getMaDonHang(), e.getTenSanPham(), soLoCu, soLoMoi, lyDo, username);

        return toDto(saved);
    }

    public List<LenhLoHistoryDto> getLichSuDoiLo(Long id) {
        return historyRepo.findByLenhIdOrderByChangedAtDesc(id)
                .stream().map(this::toHistoryDto).collect(Collectors.toList());
    }

    public List<LenhLoHistoryDto> getDoiLoHistoryByKey(String maDonHang, String soLo) {
        if (maDonHang == null || maDonHang.isBlank() || soLo == null || soLo.isBlank())
            return List.of();
        return historyRepo.findByMaDonHangAndSoLoMoi(maDonHang, soLo)
                .stream().map(this::toHistoryDto).collect(Collectors.toList());
    }

    public LenhSanXuatDto doiField(Long id, String fieldName, String newValue, String lyDo, String username) {
        if (!LOCKABLE_FIELDS.contains(fieldName))
            throw new IllegalArgumentException("Field không được phép chỉnh sửa: " + fieldName);
        LenhSanXuat e = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lệnh: " + id));
        String oldValue = switch (fieldName) {
            case "maBravo"    -> e.getMaBravo();
            case "maSp"       -> e.getMaSp();
            case "tenSanPham" -> e.getTenSanPham();
            case "maDonHang"  -> e.getMaDonHang();
            default           -> null;
        };
        LenhFieldHistory hist = new LenhFieldHistory();
        hist.setLenhId(id);
        hist.setFieldName(fieldName);
        hist.setOldValue(oldValue);
        hist.setNewValue(newValue);
        hist.setLyDo(lyDo);
        hist.setChangedBy(username);
        hist.setChangedAt(LocalDateTime.now());
        fieldHistoryRepo.save(hist);
        switch (fieldName) {
            case "maBravo"    -> e.setMaBravo(newValue);
            case "maSp"       -> e.setMaSp(newValue);
            case "tenSanPham" -> e.setTenSanPham(newValue);
            case "maDonHang"  -> e.setMaDonHang(newValue);
        }
        e.setUpdatedBy(username);
        return toDto(repo.save(e));
    }

    public List<LenhFieldHistoryDto> getFieldHistory(Long id, String fieldName) {
        List<LenhFieldHistory> list = (fieldName != null && !fieldName.isBlank())
                ? fieldHistoryRepo.findByLenhIdAndFieldNameOrderByChangedAtDesc(id, fieldName)
                : fieldHistoryRepo.findByLenhIdOrderByChangedAtDesc(id);
        return list.stream().map(h -> {
            LenhFieldHistoryDto d = new LenhFieldHistoryDto();
            d.setId(h.getId());
            d.setLenhId(h.getLenhId());
            d.setFieldName(h.getFieldName());
            d.setOldValue(h.getOldValue());
            d.setNewValue(h.getNewValue());
            d.setLyDo(h.getLyDo());
            d.setChangedBy(h.getChangedBy());
            d.setChangedAt(h.getChangedAt());
            return d;
        }).collect(Collectors.toList());
    }

    private LenhLoHistoryDto toHistoryDto(LenhLoHistory h) {
        LenhLoHistoryDto d = new LenhLoHistoryDto();
        d.setId(h.getId());
        d.setLenhId(h.getLenhId());
        d.setSoLoCu(h.getSoLoCu());
        d.setSoLoMoi(h.getSoLoMoi());
        d.setLyDo(h.getLyDo());
        d.setChangedBy(h.getChangedBy());
        d.setChangedAt(h.getChangedAt());
        return d;
    }

    // ── Mapping helpers ────────────────────────────────────────────────────────
    private void applyDto(LenhSanXuat e, LenhSanXuatDto d) {
        if (d.getThuTu()            != null) e.setThuTu(d.getThuTu());
        if (d.getMaBravo()          != null) e.setMaBravo(d.getMaBravo());
        if (d.getMaSp()             != null) e.setMaSp(d.getMaSp());
        if (d.getTenSanPham()       != null) e.setTenSanPham(d.getTenSanPham());
        e.setSoLo(d.getSoLo());
        if (d.getMaDonHang() != null) e.setMaDonHang(d.getMaDonHang());
        e.setSoLuong(d.getSoLuong());
        e.setTinhTrang(d.getTinhTrang());
        e.setPhongThucHien(d.getPhongThucHien());
        e.setNgayThucHien(d.getNgayThucHien());
        e.setToThucHien(d.getToThucHien());
        e.setSoNguoiThucHien(d.getSoNguoiThucHien());
        e.setChuY(d.getChuY());
        if (d.getDaLenLichLam()     != null) e.setDaLenLichLam(d.getDaLenLichLam());
        e.setGhiChu(d.getGhiChu());
        if (d.getDaDgVaXepLichDg()  != null) e.setDaDgVaXepLichDg(d.getDaDgVaXepLichDg());
        if (d.getDaBanHanh()        != null) e.setDaBanHanh(d.getDaBanHanh());
        e.setNgayPhatLenh(d.getNgayPhatLenh());
    }

    private LenhSanXuatDto toDto(LenhSanXuat e) {
        LenhSanXuatDto d = new LenhSanXuatDto();
        d.setId(e.getId());
        d.setThuTu(e.getThuTu());
        d.setMaBravo(e.getMaBravo());
        d.setMaSp(e.getMaSp());
        d.setTenSanPham(e.getTenSanPham());
        d.setSoLo(e.getSoLo());
        d.setMaDonHang(e.getMaDonHang());
        d.setSoLuong(e.getSoLuong());
        d.setTinhTrang(e.getTinhTrang());
        d.setPhongThucHien(e.getPhongThucHien());
        d.setNgayThucHien(e.getNgayThucHien());
        d.setToThucHien(e.getToThucHien());
        d.setSoNguoiThucHien(e.getSoNguoiThucHien());
        d.setChuY(e.getChuY());
        d.setDaLenLichLam(e.getDaLenLichLam());
        d.setGhiChu(e.getGhiChu());
        d.setDaDgVaXepLichDg(e.getDaDgVaXepLichDg());
        d.setDaBanHanh(e.getDaBanHanh());
        d.setNgayPhatLenh(e.getNgayPhatLenh());
        d.setDeletedAt(e.getDeletedAt());
        d.setDeletedBy(e.getDeletedBy());
        d.setCreatedAt(e.getCreatedAt());
        d.setUpdatedAt(e.getUpdatedAt());
        d.setCreatedBy(e.getCreatedBy());
        d.setUpdatedBy(e.getUpdatedBy());
        return d;
    }
}
