package com.sanluong.repository;

import com.sanluong.entity.SlChangeRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SlChangeRequestRepository extends JpaRepository<SlChangeRequest, Long> {
    List<SlChangeRequest> findByStatusOrderByRequestedAtDesc(String status);
    List<SlChangeRequest> findByWorkScheduleIdOrderByRequestedAtDesc(Long workScheduleId);
    boolean existsByWorkScheduleSessionIdAndStatus(Long sessionId, String status);
}
