package com.sanluong.repository;

import com.sanluong.entity.WorkScheduleSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkScheduleSessionRepository extends JpaRepository<WorkScheduleSession, Long> {
    List<WorkScheduleSession> findByWorkScheduleIdOrderByNgayAscIdAsc(Long workScheduleId);
    void deleteByWorkScheduleId(Long workScheduleId);
}
