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

    @Query("SELECT s FROM WorkScheduleSession s WHERE s.workScheduleId IN :ids AND s.loaiSession = 'KH_TO'")
    List<WorkScheduleSession> findKhToByWorkScheduleIdIn(@Param("ids") java.util.Collection<Long> workScheduleIds);

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

    // có công nhưng chưa nhập SL hôm nay
    @Query("SELECT COUNT(DISTINCT s.workScheduleId) FROM WorkScheduleSession s " +
           "WHERE s.ngay = :today AND s.maNhanVien IS NOT NULL " +
           "AND (s.loaiSession IS NULL OR s.loaiSession <> 'KH_TO') " +
           "AND s.workScheduleId NOT IN (" +
           "  SELECT s2.workScheduleId FROM WorkScheduleSession s2 " +
           "  WHERE s2.ngay = :today AND s2.sanLuong IS NOT NULL " +
           "  AND (s2.loaiSession IS NULL OR s2.loaiSession <> 'KH_TO'))")
    long countWithWorkersButNoSanLuongToday(@Param("today") LocalDate today);

    // có SL nhưng không có công nhân hôm nay
    @Query("SELECT COUNT(DISTINCT s.workScheduleId) FROM WorkScheduleSession s " +
           "WHERE s.ngay = :today AND s.sanLuong IS NOT NULL " +
           "AND (s.loaiSession IS NULL OR s.loaiSession <> 'KH_TO') " +
           "AND s.workScheduleId NOT IN (" +
           "  SELECT s2.workScheduleId FROM WorkScheduleSession s2 " +
           "  WHERE s2.ngay = :today AND s2.maNhanVien IS NOT NULL " +
           "  AND (s2.loaiSession IS NULL OR s2.loaiSession <> 'KH_TO'))")
    long countWithSanLuongButNoWorkersToday(@Param("today") LocalDate today);

    // ── KH_TO sessions (Kế Hoạch Tổ "Lịch SX" — dataset riêng) ──────────────

    @Query("SELECT s FROM WorkScheduleSession s WHERE s.workScheduleId = :id AND s.loaiSession = 'KH_TO' ORDER BY s.ngay ASC, s.id ASC")
    List<WorkScheduleSession> findKhToByWorkScheduleId(@Param("id") Long workScheduleId);

    @Query("SELECT s FROM WorkScheduleSession s WHERE s.workScheduleId = :wsId AND s.ngay = :ngay AND s.maNhanVien = :maNv AND s.caSanXuat = :ca AND s.loaiSession = 'KH_TO'")
    List<WorkScheduleSession> findKhToByWsIdNgayMaNvCa(
            @Param("wsId") Long workScheduleId,
            @Param("ngay") LocalDate ngay,
            @Param("maNv") String maNhanVien,
            @Param("ca") String caSanXuat);

    // Tìm KH_TO theo wsId+maNhanVien+ca (không lọc ngày) — dùng khi xóa regular session cần cascade xóa KH_TO dù khác ngày
    @Query("SELECT s FROM WorkScheduleSession s WHERE s.workScheduleId = :wsId AND s.maNhanVien = :maNv AND s.caSanXuat = :ca AND s.loaiSession = 'KH_TO'")
    List<WorkScheduleSession> findKhToByWsIdMaNvCa(
            @Param("wsId") Long workScheduleId,
            @Param("maNv") String maNhanVien,
            @Param("ca") String caSanXuat);

    @Query("SELECT s FROM WorkScheduleSession s WHERE s.workScheduleId = :wsId AND s.ngay = :ngay AND s.maNhanVien = :maNv AND s.caSanXuat = :ca AND (s.loaiSession IS NULL OR s.loaiSession <> 'KH_TO')")
    List<WorkScheduleSession> findRegularByWsIdNgayMaNvCa(
            @Param("wsId") Long workScheduleId,
            @Param("ngay") LocalDate ngay,
            @Param("maNv") String maNhanVien,
            @Param("ca") String caSanXuat);

    @Query("SELECT COUNT(s) > 0 FROM WorkScheduleSession s WHERE s.workScheduleId = :wsId AND s.ngay = :ngay AND s.loaiSession = 'KH_TO'")
    boolean existsKhToByWsIdAndNgay(@Param("wsId") Long wsId, @Param("ngay") LocalDate ngay);
}
