package com.sanluong.repository;

import com.sanluong.entity.MachineRuntimeLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

public interface MachineRuntimeLogRepository extends JpaRepository<MachineRuntimeLog, Long> {

    List<MachineRuntimeLog> findByWorkScheduleIdAndNgayOrderBySortOrderAscIdAsc(Long workScheduleId, LocalDate ngay);

    @Modifying
    @Transactional
    @Query("DELETE FROM MachineRuntimeLog r WHERE r.workScheduleId = :wsId AND r.ngay = :ngay")
    void deleteByWorkScheduleIdAndNgay(Long wsId, LocalDate ngay);

    @Modifying
    @Transactional
    @Query("DELETE FROM MachineRuntimeLog r WHERE r.workScheduleId = :wsId AND r.ngay = :ngay AND r.tenMay = :tenMay")
    void deleteByWorkScheduleIdAndNgayAndTenMay(Long wsId, LocalDate ngay, String tenMay);

    @Query("SELECT r FROM MachineRuntimeLog r WHERE r.workScheduleId IN :wsIds AND r.ngay BETWEEN :from AND :to ORDER BY r.ngay, r.sortOrder, r.id")
    List<MachineRuntimeLog> findForSummary(@Param("wsIds") List<Long> wsIds,
                                            @Param("from") LocalDate from,
                                            @Param("to") LocalDate to);

    List<MachineRuntimeLog> findByWorkScheduleIdInAndNgayOrderBySortOrderAscIdAsc(List<Long> wsIds, LocalDate ngay);
}
