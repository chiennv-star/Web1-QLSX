package com.sanluong.service;

import com.sanluong.dto.NonProductiveTimeDto;
import com.sanluong.entity.NonProductiveTime;
import com.sanluong.repository.NonProductiveTimeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class NonProductiveTimeService {

    private final NonProductiveTimeRepository repository;

    public NonProductiveTimeService(NonProductiveTimeRepository repository) {
        this.repository = repository;
    }

    // StageTab: chỉ trả bản ghi không gắn schedule
    public List<NonProductiveTime> list(String congDoan) {
        return repository.findByCongDoanAndWorkScheduleIdIsNullOrderByNgayAsc(congDoan);
    }

    // WorkDetailDrawer: tất cả bản ghi của một schedule
    public List<NonProductiveTime> listBySchedule(Long workScheduleId) {
        return repository.findByWorkScheduleIdOrderByNgayAscIdAsc(workScheduleId);
    }

    public List<NonProductiveTime> createBatch(String congDoan, List<NonProductiveTimeDto> dtos, String username) {
        List<NonProductiveTime> entities = dtos.stream().map(dto -> toEntity(dto, congDoan, null, username))
                .collect(Collectors.toList());
        return repository.saveAll(entities);
    }

    // Xóa và tạo lại toàn bộ bản ghi của một ngày trong một schedule
    @Transactional
    public List<NonProductiveTime> syncDay(Long workScheduleId, LocalDate ngay,
                                           List<NonProductiveTimeDto> dtos, String username) {
        repository.deleteByWorkScheduleIdAndNgay(workScheduleId, ngay);
        List<NonProductiveTime> entities = dtos.stream()
                .map(dto -> {
                    NonProductiveTime e = toEntity(dto, null, workScheduleId, username);
                    e.setNgay(ngay);
                    return e;
                })
                .collect(Collectors.toList());
        return repository.saveAll(entities);
    }

    private NonProductiveTime toEntity(NonProductiveTimeDto dto, String congDoan,
                                       Long workScheduleId, String username) {
        NonProductiveTime e = new NonProductiveTime();
        if (congDoan != null) e.setCongDoan(congDoan);
        e.setWorkScheduleId(workScheduleId);
        if (dto.getNgay() != null) e.setNgay(dto.getNgay());
        e.setHoatDong(dto.getHoatDong());
        e.setToThucHien(dto.getToThucHien());
        e.setNguoiThucHien(dto.getNguoiThucHien());
        e.setPhanLoai(dto.getPhanLoai());
        e.setGhiChu(dto.getGhiChu());
        BigDecimal gio = dto.getGio() != null ? dto.getGio() : BigDecimal.ZERO;
        e.setGio(gio);
        e.setCong(gio.compareTo(BigDecimal.ZERO) > 0
                ? gio.divide(BigDecimal.valueOf(8), 3, RoundingMode.HALF_UP)
                : BigDecimal.ZERO);
        e.setCreatedBy(username);
        return e;
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    public void deleteAllByCongDoan(String congDoan) {
        repository.deleteByCongDoan(congDoan);
    }
}
