package com.sanluong.service;

import com.sanluong.dto.WorkScheduleSessionDto;
import com.sanluong.entity.WorkScheduleSession;
import com.sanluong.repository.WorkScheduleSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class WorkScheduleSessionService {

    private final WorkScheduleSessionRepository repository;

    public WorkScheduleSessionService(WorkScheduleSessionRepository repository) {
        this.repository = repository;
    }

    public List<WorkScheduleSession> getByScheduleId(Long scheduleId) {
        return repository.findByWorkScheduleIdOrderByNgayAscIdAsc(scheduleId);
    }

    public WorkScheduleSession create(WorkScheduleSessionDto dto) {
        WorkScheduleSession s = new WorkScheduleSession();
        mapFromDto(s, dto);
        return repository.save(s);
    }

    public WorkScheduleSession update(Long id, WorkScheduleSessionDto dto) {
        WorkScheduleSession s = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy session ID: " + id));
        mapFromDto(s, dto);
        return repository.save(s);
    }

    @Transactional
    public void delete(Long id) {
        repository.deleteById(id);
    }

    private LocalDate parseDate(String s) {
        return (s != null && !s.isBlank()) ? LocalDate.parse(s) : null;
    }

    private void mapFromDto(WorkScheduleSession s, WorkScheduleSessionDto dto) {
        s.setWorkScheduleId(dto.getWorkScheduleId());
        s.setNgay(parseDate(dto.getNgay()));
        s.setThoiGianBatDau(dto.getThoiGianBatDau());
        s.setThoiGianKetThuc(dto.getThoiGianKetThuc());
        s.setNhomThucHien(dto.getNhomThucHien());
        s.setNguoiThucHien(dto.getNguoiThucHien());
        s.setSoGioThucHien(dto.getSoGioThucHien());
        s.setCongThucHien(dto.getCongThucHien());
        s.setNgayThucHien(parseDate(dto.getNgayThucHien()));
        s.setSanLuong(dto.getSanLuong());
        s.setNangSuat(dto.getNangSuat());
        s.setNangSuatTrungBinh(dto.getNangSuatTrungBinh());
        s.setVaiTro(dto.getVaiTro());
        s.setGhiChu(dto.getGhiChu());
        s.setKhac(dto.getKhac());
    }
}
