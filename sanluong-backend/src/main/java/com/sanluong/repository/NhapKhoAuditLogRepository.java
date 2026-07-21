package com.sanluong.repository;

import com.sanluong.entity.NhapKhoAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface NhapKhoAuditLogRepository extends JpaRepository<NhapKhoAuditLog, Long> {

    @Query("""
        SELECT a FROM NhapKhoAuditLog a
        WHERE (:fromDate IS NULL OR a.changedAt >= :fromDate)
          AND (:toDate   IS NULL OR a.changedAt <= :toDate)
        ORDER BY a.changedAt DESC, a.id DESC
        """)
    List<NhapKhoAuditLog> search(
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate")   LocalDateTime toDate);
}
