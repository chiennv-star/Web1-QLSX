package com.sanluong.repository;

import com.sanluong.entity.WorkSchedule;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface WorkScheduleRepository extends JpaRepository<WorkSchedule, Long> {

    @Query("""
        SELECT w FROM WorkSchedule w
        WHERE (:fromDate IS NULL OR w.ngayThucHien >= :fromDate)
          AND (:toDate IS NULL OR w.ngayThucHien <= :toDate)
          AND (:maSp IS NULL OR w.maSp LIKE %:maSp%)
          AND (:tenTrinh IS NULL OR w.tenTrinh LIKE %:tenTrinh%)
          AND (:soLo IS NULL OR w.soLo LIKE %:soLo%)
          AND (:tinhTrang IS NULL OR w.tinhTrang = :tinhTrang)
          AND (:congDoan IS NULL OR w.congDoan = :congDoan)
          AND (:source IS NULL
               OR w.source = :source
               OR (:source = 'SCHEDULE' AND w.source IS NULL))
        ORDER BY w.ngayThucHien DESC, w.id DESC
        """)
    Page<WorkSchedule> search(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("maSp") String maSp,
            @Param("tenTrinh") String tenTrinh,
            @Param("soLo") String soLo,
            @Param("tinhTrang") String tinhTrang,
            @Param("congDoan") String congDoan,
            @Param("source") String source,
            Pageable pageable
    );

    @Query("""
        SELECT w FROM WorkSchedule w
        WHERE w.saiLech IS NOT NULL AND w.saiLech <> ''
          AND (:fromDate IS NULL OR w.ngayThucHien >= :fromDate)
          AND (:toDate IS NULL OR w.ngayThucHien <= :toDate)
          AND (:maSp IS NULL OR w.maSp LIKE %:maSp%)
        ORDER BY w.ngayThucHien DESC, w.id DESC
        """)
    Page<WorkSchedule> findDeviations(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("maSp") String maSp,
            Pageable pageable
    );

    // Unique (maSp, tenTrinh, soLo) triplets from PC + BBC1 for auto-fill suggestions
    @Query("""
        SELECT w.maSp, w.tenTrinh, w.soLo FROM WorkSchedule w
        WHERE w.congDoan IN ('PC', 'BBC1')
          AND w.maSp IS NOT NULL AND w.maSp <> ''
        GROUP BY w.maSp, w.tenTrinh, w.soLo
        ORDER BY w.maSp, w.tenTrinh, w.soLo
        """)
    List<Object[]> findDistinctTripletsFromPcAndBbc1();

    // Latest record for a given stage + triplet (maSp, tenTrinh, soLo)
    @Query("""
        SELECT w FROM WorkSchedule w
        WHERE w.congDoan = :congDoan
          AND w.maSp = :maSp
          AND (:tenTrinh IS NULL OR w.tenTrinh = :tenTrinh)
          AND (:soLo IS NULL OR w.soLo = :soLo)
        ORDER BY w.ngayThucHien DESC, w.id DESC
        """)
    List<WorkSchedule> findByCongDoanAndTriplet(
            @Param("congDoan") String congDoan,
            @Param("maSp") String maSp,
            @Param("tenTrinh") String tenTrinh,
            @Param("soLo") String soLo,
            Pageable pageable
    );
}
