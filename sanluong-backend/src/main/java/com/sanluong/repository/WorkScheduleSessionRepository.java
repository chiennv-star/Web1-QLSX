package com.sanluong.repository;

import com.sanluong.entity.WorkScheduleSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface WorkScheduleSessionRepository extends JpaRepository<WorkScheduleSession, Long> {

    // ── SCHEDULE sessions (null = Sản Lượng Tổ, backward compatible) ──────────

    @Query("SELECT s FROM WorkScheduleSession s WHERE s.workScheduleId = :id AND (s.loaiSession IS NULL OR s.loaiSession <> 'KH_TO') ORDER BY s.ngay ASC, s.id ASC")
    List<WorkScheduleSession> findByWorkScheduleIdOrderByNgayAscIdAsc(@Param("id") Long workScheduleId);

    @Query("SELECT s FROM WorkScheduleSession s WHERE s.workScheduleId = :wsId AND s.ngay = :ngay AND (s.loaiSession IS NULL OR s.loaiSession <> 'KH_TO')")
    List<WorkScheduleSession> findByWorkScheduleIdAndNgay(@Param("wsId") Long workScheduleId, @Param("ngay") LocalDate ngay);

    @Query("SELECT s FROM WorkScheduleSession s WHERE s.workScheduleId IN :ids AND (s.loaiSession IS NULL OR s.loaiSession <> 'KH_TO')")
    List<WorkScheduleSession> findByWorkScheduleIdIn(@Param("ids") java.util.Collection<Long> workScheduleIds);

    @Query("SELECT s FROM WorkScheduleSession s WHERE s.maNhanVien = :maNhanVien AND (s.loaiSession IS NULL OR s.loaiSession <> 'KH_TO') ORDER BY s.ngay DESC, s.id DESC")
    List<WorkScheduleSession> findByMaNhanVienOrderByNgayDescIdDesc(@Param("maNhanVien") String maNhanVien);

    @Query("SELECT s FROM WorkScheduleSession s WHERE s.maNhanVien = :maNhanVien AND (s.loaiSession IS NULL OR s.loaiSession <> 'KH_TO') AND (:from IS NULL OR s.ngay >= :from) AND (:to IS NULL OR s.ngay <= :to) ORDER BY s.ngay DESC, s.id DESC")
    List<WorkScheduleSession> findByMaNhanVienAndDateRange(
            @Param("maNhanVien") String maNhanVien,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    @Query("SELECT s FROM WorkScheduleSession s WHERE s.ngay IS NOT NULL AND (s.loaiSession IS NULL OR s.loaiSession <> 'KH_TO') AND (:from IS NULL OR s.ngay >= :from) AND (:to IS NULL OR s.ngay <= :to) ORDER BY s.ngay DESC, s.workScheduleId ASC, s.id ASC")
    List<WorkScheduleSession> findAllSessionsInRange(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    @Query("SELECT s FROM WorkScheduleSession s WHERE s.sanLuong IS NOT NULL AND s.sanLuong > 0 AND (s.loaiSession IS NULL OR s.loaiSession <> 'KH_TO') AND (:from IS NULL OR s.ngay >= :from) AND (:to IS NULL OR s.ngay <= :to) ORDER BY s.ngay DESC, s.id ASC")
    List<WorkScheduleSession> findForDailyReport(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    void deleteByWorkScheduleId(Long workScheduleId);

    // ── KH_TO sessions (Kế Hoạch Tổ "Lịch SX" — dataset riêng) ──────────────

    @Query("SELECT s FROM WorkScheduleSession s WHERE s.workScheduleId = :id AND s.loaiSession = 'KH_TO' ORDER BY s.ngay ASC, s.id ASC")
    List<WorkScheduleSession> findKhToByWorkScheduleId(@Param("id") Long workScheduleId);
}
