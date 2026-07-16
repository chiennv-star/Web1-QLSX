package com.sanluong.service;

import com.sanluong.entity.ProductMaster;
import com.sanluong.entity.ProductMasterBackup;
import com.sanluong.repository.ProductMasterBackupRepository;
import com.sanluong.repository.ProductMasterRepository;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class ProductMasterBackupService {

    private final ProductMasterBackupRepository backupRepository;
    private final ProductMasterRepository masterRepository;

    public ProductMasterBackupService(ProductMasterBackupRepository backupRepository,
                                      ProductMasterRepository masterRepository) {
        this.backupRepository = backupRepository;
        this.masterRepository = masterRepository;
    }

    public Page<ProductMasterBackup> search(String keyword, int page, int size) {
        String kw = (keyword == null || keyword.isBlank()) ? null : keyword;
        return backupRepository.search(kw, PageRequest.of(page, size));
    }

    /** Xóa backup cũ, copy toàn bộ product_master → product_master_backup */
    @Transactional
    public Map<String, Object> snapshot() {
        backupRepository.deleteAll();
        List<ProductMaster> masters = masterRepository.findAll();
        LocalDateTime now = LocalDateTime.now();
        List<ProductMasterBackup> backups = masters.stream().map(m -> {
            ProductMasterBackup b = new ProductMasterBackup();
            b.setMaTp(m.getMaTp());
            b.setMaBravo(m.getMaBravo());
            b.setTienTrinh(m.getTienTrinh());
            b.setSlTrungBinh(m.getSlTrungBinh());
            b.setSpCong(m.getSpCong());
            b.setNangSuatPc(m.getNangSuatPc());
            b.setNangSuatPl(m.getNangSuatPl());
            b.setNangSuatBbc1(m.getNangSuatBbc1());
            b.setNangSuatDg(m.getNangSuatDg());
            b.setMayMocPc(m.getMayMocPc());
            b.setTocDoMayPc(m.getTocDoMayPc());
            b.setMayMocPl(m.getMayMocPl());
            b.setTocDoMayPl(m.getTocDoMayPl());
            b.setMayMocBbc1(m.getMayMocBbc1());
            b.setTocDoMayBbc1(m.getTocDoMayBbc1());
            b.setMayMocDg(m.getMayMocDg());
            b.setTocDoMayDg(m.getTocDoMayDg());
            b.setLoaiSanPham(m.getLoaiSanPham());
            b.setKhoiLuong(m.getKhoiLuong());
            b.setToNhomPcpl(m.getToNhomPcpl());
            b.setGhiChu(m.getGhiChu());
            b.setTinhTrang(m.getTinhTrang());
            b.setNangSuatPcMe(m.getNangSuatPcMe());
            b.setSnapshotAt(now);
            return b;
        }).collect(java.util.stream.Collectors.toList());
        backupRepository.saveAll(backups);
        return Map.of("saved", backups.size(), "snapshotAt", now.toString());
    }

    /** Ghi đè product_master từ backup (khớp theo maTp) */
    @Transactional
    public Map<String, Object> restoreToMaster() {
        List<ProductMasterBackup> backups = backupRepository.findAll();
        int restored = 0, skipped = 0;
        for (ProductMasterBackup b : backups) {
            var opt = masterRepository.findByMaTpIgnoreCase(b.getMaTp());
            if (opt.isEmpty()) { skipped++; continue; }
            ProductMaster m = opt.get();
            m.setMaBravo(b.getMaBravo());
            m.setTienTrinh(b.getTienTrinh());
            m.setSlTrungBinh(b.getSlTrungBinh());
            m.setSpCong(b.getSpCong());
            m.setNangSuatPc(b.getNangSuatPc());
            m.setNangSuatPl(b.getNangSuatPl());
            m.setNangSuatBbc1(b.getNangSuatBbc1());
            m.setNangSuatDg(b.getNangSuatDg());
            m.setMayMocPc(b.getMayMocPc());
            m.setTocDoMayPc(b.getTocDoMayPc());
            m.setMayMocPl(b.getMayMocPl());
            m.setTocDoMayPl(b.getTocDoMayPl());
            m.setMayMocBbc1(b.getMayMocBbc1());
            m.setTocDoMayBbc1(b.getTocDoMayBbc1());
            m.setMayMocDg(b.getMayMocDg());
            m.setTocDoMayDg(b.getTocDoMayDg());
            m.setLoaiSanPham(b.getLoaiSanPham());
            m.setKhoiLuong(b.getKhoiLuong());
            m.setToNhomPcpl(b.getToNhomPcpl());
            m.setGhiChu(b.getGhiChu());
            m.setTinhTrang(b.getTinhTrang());
            m.setNangSuatPcMe(b.getNangSuatPcMe());
            masterRepository.save(m);
            restored++;
        }
        return Map.of("restored", restored, "skipped", skipped);
    }
}
