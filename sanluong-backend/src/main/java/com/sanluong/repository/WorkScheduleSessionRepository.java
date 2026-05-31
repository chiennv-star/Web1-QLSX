package com.sanluong.repository;

import com.sanluong.entity.WorkScheduleSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface WorkScheduleSessionRepository extends JpaRepository<WorkScheduleSession, Long> {
    List<WorkScheduleSession> findByWorkScheduleIdOrderByNgayAscIdAsc(Long workScheduleId);
    void deleteByWorkScheduleId(Long workScheduleId);
    List<WorkScheduleSession> findByMaNhanVienOrderByNgayDescIdDesc(String maNhanVien);
    List<WorkScheduleSession> findByWorkScheduleIdAndNgay(Long workScheduleId, java.time.LocalDate ngay);
    List<WorkScheduleSession> findByWorkScheduleIdIn(java.util.Collection<Long> workScheduleIds);

    @Query("SELECT s FROM WorkScheduleSession s WHERE s.sanLuong IS NOT NULL AND s.sanLuong > 0 " +
           "AND (:from IS NULL OR s.ngay >= :from) " +
           "AND (:to IS NULL OR s.ngay <= :to) " +
           "ORDER BY s.ngay DESC, s.id ASC")
    List<WorkScheduleSession> findForDailyReport(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    /** Tất cả sessions trong khoảng ngày (kể cả chưa có sanLuong) để build báo cáo tổng hợp */
    @Query("SELECT s FROM WorkScheduleSession s WHERE s.ngay IS NOT NULL " +
           "AND (:from IS NULL OR s.ngay >= :from) " +
           "AND (:to IS NULL OR s.ngay <= :to) " +
           "ORDER BY s.ngay DESC, s.workScheduleId ASC, s.id ASC")
    List<WorkScheduleSession> findAllSessionsInRange(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    /** Sessions của một nhân viên trong khoảng ngày — dùng cho drawer chi tiết hiệu quả */
    @Query("SELECT s FROM WorkScheduleSession s WHERE s.maNhanVien = :maNhanVien " +
           "AND (:from IS NULL OR s.ngay >= :from) " +
           "AND (:to IS NULL OR s.ngay <= :to) " +
           "ORDER BY s.ngay DESC, s.id DESC")
    List<WorkScheduleSession> findByMaNhanVienAndDateRange(
            @Param("maNhanVien") String maNhanVien,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
