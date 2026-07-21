package com.sanluong.repository;

import com.sanluong.entity.WorkScheduleFieldHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkScheduleFieldHistoryRepository extends JpaRepository<WorkScheduleFieldHistory, Long> {
    List<WorkScheduleFieldHistory> findByWorkScheduleIdOrderByChangedAtDesc(Long workScheduleId);
}
