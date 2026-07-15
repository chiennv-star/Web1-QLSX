package com.sanluong.repository;

import com.sanluong.entity.NonProductiveTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

public interface NonProductiveTimeRepository extends JpaRepository<NonProductiveTime, Long> {

    // StageTab: chỉ lấy bản ghi không gắn với schedule cụ thể
    List<NonProductiveTime> findByCongDoanAndWorkScheduleIdIsNullOrderByNgayAsc(String congDoan);

    // WorkDetailDrawer: lấy tất cả bản ghi của một schedule
    List<NonProductiveTime> findByWorkScheduleIdOrderByNgayAscIdAsc(Long workScheduleId);

    // Xóa toàn bộ theo schedule + ngày (dùng cho sync-day)
    @Transactional
    void deleteByWorkScheduleIdAndNgay(Long workScheduleId, LocalDate ngay);

    @Transactional
    void deleteByCongDoan(String congDoan);
}
