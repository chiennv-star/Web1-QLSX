package com.sanluong.service;

import com.sanluong.dto.HangLoiDto;
import com.sanluong.entity.HangLoi;
import com.sanluong.repository.HangLoiRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
public class HangLoiService {

    private final HangLoiRepository repository;

    public HangLoiService(HangLoiRepository repository) {
        this.repository = repository;
    }

    public Page<HangLoi> search(LocalDate fromDate, LocalDate toDate, String keyword, String trangThai, int page, int size) {
        String kw = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        String tt = (trangThai != null && !trangThai.isBlank()) ? trangThai.trim() : null;
        return repository.search(fromDate, toDate, kw, tt, PageRequest.of(page, size));
    }

    public HangLoi create(HangLoiDto dto) {
        HangLoi h = new HangLoi();
        mapFromDto(h, dto);
        return repository.save(h);
    }

    public HangLoi update(Long id, HangLoiDto dto) {
        HangLoi h = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ID: " + id));
        mapFromDto(h, dto);
        return repository.save(h);
    }

    public boolean existsByTriplet(String mtpCoMem, String tenHangHoa, String soLo) {
        if (mtpCoMem == null || mtpCoMem.isBlank()) return false;
        return repository.existsByTriplet(mtpCoMem, tenHangHoa, soLo);
    }

    @Transactional
    public void delete(Long id) {
        repository.deleteById(id);
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
    }
}
