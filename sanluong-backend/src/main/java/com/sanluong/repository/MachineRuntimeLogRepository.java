package com.sanluong.repository;

import com.sanluong.entity.MachineRuntimeLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

public interface MachineRuntimeLogRepository extends JpaRepository<MachineRuntimeLog, Long> {

    List<MachineRuntimeLog> findByWorkScheduleIdAndNgayOrderBySortOrderAscIdAsc(Long workScheduleId, LocalDate ngay);

    @Modifying
    @Transactional
    @Query("DELETE FROM MachineRuntimeLog r WHERE r.workScheduleId = :wsId AND r.ngay = :ngay")
    void deleteByWorkScheduleIdAndNgay(Long wsId, LocalDate ngay);
}
