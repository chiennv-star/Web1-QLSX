package com.sanluong.repository;

import com.sanluong.entity.WorkScheduleCoLoHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkScheduleCoLoHistoryRepository extends JpaRepository<WorkScheduleCoLoHistory, Long> {
    List<WorkScheduleCoLoHistory> findByWorkScheduleIdOrderByChangedAtDesc(Long workScheduleId);
}
