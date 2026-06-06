package com.sanluong.service;

import com.sanluong.entity.KphRecord;
import com.sanluong.repository.KphRepository;
import org.springframework.stereotype.Service;
import java.util.Optional;

@Service
public class KphService {

    private final KphRepository repository;

    public KphService(KphRepository repository) {
        this.repository = repository;
    }

    public Optional<KphRecord> findByWorkScheduleId(Long wsId) {
        return repository.findByWorkScheduleId(wsId);
    }

    public KphRecord findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("KPH record not found: " + id));
    }

    public KphRecord create(KphRecord record, String username) {
        record.setCreatedBy(username);
        return repository.save(record);
    }

    public KphRecord update(Long id, KphRecord payload) {
        KphRecord existing = findById(id);
        existing.setTenNguoiPhatHien(payload.getTenNguoiPhatHien());
        existing.setNgayGioPhatHien(payload.getNgayGioPhatHien());
        existing.setTenSanPhamNguyenLieu(payload.getTenSanPhamNguyenLieu());
        existing.setMaVatTu(payload.getMaVatTu());
        existing.setSoLo(payload.getSoLo());
        existing.setSoMe(payload.getSoMe());
        existing.setCongDoan(payload.getCongDoan());
        existing.setMoTaVanDe(payload.getMoTaVanDe());
        existing.setPhuongAnXuLyTucThoi(payload.getPhuongAnXuLyTucThoi());
        existing.setNguyenNhanBanDau(payload.getNguyenNhanBanDau());
        existing.setNguyenNhanGocRe(payload.getNguyenNhanGocRe());
        existing.setDeXuatKhacPhucVanDe(payload.getDeXuatKhacPhucVanDe());
        existing.setDeXuatHanhDongKhacPhuc(payload.getDeXuatHanhDongKhacPhuc());
        existing.setFileDinhKem1(payload.getFileDinhKem1());
        existing.setFileDinhKemNhieu(payload.getFileDinhKemNhieu());
        existing.setGhiChu(payload.getGhiChu());
        existing.setTenNguoiThucHien(payload.getTenNguoiThucHien());
        existing.setMaNhanVien(payload.getMaNhanVien());
        existing.setYKienToTruong(payload.getYKienToTruong());
        existing.setYKienTBP(payload.getYKienTBP());
        existing.setMaSanPhamVatTu(payload.getMaSanPhamVatTu());
        existing.setTomTatVanDe(payload.getTomTatVanDe());
        existing.setAnhHuongChatLuong(payload.getAnhHuongChatLuong());
        existing.setKhaNangLapLai(payload.getKhaNangLapLai());
        existing.setNguyenNhanBanDauQA(payload.getNguyenNhanBanDauQA());
        existing.setPhuongAnKhacPhuc(payload.getPhuongAnKhacPhuc());
        existing.setFileDinhKem2(payload.getFileDinhKem2());
        existing.setQaGhiChu(payload.getQaGhiChu());
        if (payload.getTrangThai() != null) existing.setTrangThai(payload.getTrangThai());
        return repository.save(existing);
    }
}
