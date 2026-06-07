package com.sanluong.repository;

import com.sanluong.entity.TimeEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface TimeEntryRepository extends JpaRepository<TimeEntry, Long> {

    @Query("SELECT t FROM TimeEntry t WHERE t.maNhanVien = :ma AND t.ngay BETWEEN :from AND :to ORDER BY t.ngay DESC")
    List<TimeEntry> findByMaNhanVienAndRange(
            @Param("ma") String maNhanVien,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
