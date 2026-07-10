package com.sanluong.repository;

import com.sanluong.entity.MachinePerfLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MachinePerfLogRepository extends JpaRepository<MachinePerfLog, Long> {

    List<MachinePerfLog> findByNgayBetween(LocalDate start, LocalDate end);

    Optional<MachinePerfLog> findByNgayAndTenMay(LocalDate ngay, String tenMay);

    @Modifying
    @Transactional
    @Query("DELETE FROM MachinePerfLog p WHERE p.ngay = :ngay AND p.tenMay = :tenMay")
    void deleteByNgayAndTenMay(@Param("ngay") LocalDate ngay, @Param("tenMay") String tenMay);
}
