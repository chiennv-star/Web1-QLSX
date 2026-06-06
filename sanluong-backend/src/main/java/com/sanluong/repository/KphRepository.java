package com.sanluong.repository;

import com.sanluong.entity.KphRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface KphRepository extends JpaRepository<KphRecord, Long> {
    Optional<KphRecord> findByWorkScheduleId(Long workScheduleId);
}
