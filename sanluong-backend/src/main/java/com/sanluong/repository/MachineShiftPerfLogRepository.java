package com.sanluong.repository;

import com.sanluong.entity.MachineShiftPerfLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

public interface MachineShiftPerfLogRepository extends JpaRepository<MachineShiftPerfLog, Long> {

    List<MachineShiftPerfLog> findByWorkScheduleIdAndNgayOrderBySortOrderAscIdAsc(Long workScheduleId, LocalDate ngay);

    List<MachineShiftPerfLog> findByWorkScheduleIdInAndNgayOrderBySortOrderAscIdAsc(List<Long> workScheduleIds, LocalDate ngay);

    List<MachineShiftPerfLog> findByNgayBetween(LocalDate tuNgay, LocalDate denNgay);

    @Transactional
    void deleteByWorkScheduleIdAndNgay(Long workScheduleId, LocalDate ngay);
}
