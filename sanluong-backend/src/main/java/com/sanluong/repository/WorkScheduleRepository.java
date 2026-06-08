package com.sanluong.repository;

import com.sanluong.entity.WorkSchedule;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface WorkScheduleRepository extends JpaRepository<WorkSchedule, Long> {

    @Query("SELECT w FROM WorkSchedule w WHERE w.deletedAt IS NOT NULL ORDER BY w.deletedAt DESC")
    List<WorkSchedule> findAllDeleted();

    @Query("""
        SELECT w FROM WorkSchedule w
        WHERE (w.hidden = false OR w.hidden IS NULL)
          AND w.deletedAt IS NULL
          AND (:fromDate IS NULL OR w.ngayThucHien >= :fromDate)
          AND (:toDate IS NULL OR w.ngayThucHien <= :toDate)
          AND (:maSp IS NULL OR w.maSp LIKE %:maSp%)
          AND (:tenTrinh IS NULL OR w.tenTrinh LIKE %:tenTrinh%)
          AND (:soLo IS NULL OR w.soLo LIKE %:soLo%)
          AND (:maBravo IS NULL OR w.maBravo LIKE %:maBravo%)
          AND (:tinhTrang IS NULL OR w.tinhTrang = :tinhTrang)
          AND (:congDoan IS NULL OR w.congDoan = :congDoan)
          AND (:source IS NULL
               OR w.source = :source
               OR (:source = 'SCHEDULE' AND w.source IS NULL))
          AND (:toNhom IS NULL OR w.toNhom = :toNhom)
        ORDER BY w.ngayThucHien DESC, w.id DESC
        """)
    Page<WorkSchedule> search(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("maSp") String maSp,
            @Param("tenTrinh") String tenTrinh,
            @Param("soLo") String soLo,
            @Param("maBravo") String maBravo,
            @Param("tinhTrang") String tinhTrang,
            @Param("congDoan") String congDoan,
            @Param("source") String source,
            @Param("toNhom") String toNhom,
            Pageable pageable
    );

    @Query("""
        SELECT w FROM WorkSchedule w
        WHERE (w.hidden = false OR w.hidden IS NULL)
          AND w.deletedAt IS NULL
          AND (:fromDate IS NULL OR w.ngayThucHien >= :fromDate)
          AND (:toDate IS NULL OR w.ngayThucHien <= :toDate)
          AND (:maSp IS NULL OR w.maSp LIKE %:maSp%)
          AND (:tenTrinh IS NULL OR w.tenTrinh LIKE %:tenTrinh%)
          AND (:soLo IS NULL OR w.soLo LIKE %:soLo%)
          AND (:maBravo IS NULL OR w.maBravo LIKE %:maBravo%)
          AND (:tinhTrang IS NULL OR w.tinhTrang = :tinhTrang)
          AND (:congDoan IS NULL OR w.congDoan = :congDoan)
          AND (:source IS NULL
               OR w.source = :source
               OR (:source = 'SCHEDULE' AND w.source IS NULL))
          AND (:toNhom IS NULL OR w.toNhom = :toNhom)
        """)
    List<WorkSchedule> searchAll(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("maSp") String maSp,
            @Param("tenTrinh") String tenTrinh,
            @Param("soLo") String soLo,
            @Param("maBravo") String maBravo,
            @Param("tinhTrang") String tinhTrang,
            @Param("congDoan") String congDoan,
            @Param("source") String source,
            @Param("toNhom") String toNhom
    );

    @Query("""
        SELECT w FROM WorkSchedule w
        WHERE w.saiLech IS NOT NULL AND w.saiLech <> ''
          AND (:fromDate IS NULL OR w.ngayThucHien >= :fromDate)
          AND (:toDate IS NULL OR w.ngayThucHien <= :toDate)
          AND (:maSp IS NULL OR w.maSp LIKE %:maSp%)
          AND (:tenTrinh IS NULL OR LOWER(w.tenTrinh) LIKE LOWER(CONCAT('%', :tenTrinh, '%')))
          AND (:soLo IS NULL OR w.soLo LIKE %:soLo%)
        ORDER BY w.ngayThucHien DESC, w.id DESC
        """)
    Page<WorkSchedule> findDeviations(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("maSp") String maSp,
            @Param("tenTrinh") String tenTrinh,
            @Param("soLo") String soLo,
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

    // Bulk toNhom lookup for a list of maSp — used to enrich production record list
    @Query("""
        SELECT w.maSp, w.tenTrinh, w.soLo, w.toNhom FROM WorkSchedule w
        WHERE w.congDoan = 'PC'
          AND w.maSp IN :maSps
          AND w.toNhom IS NOT NULL
          AND TRIM(w.toNhom) <> ''
        """)
    List<Object[]> findToNhomForPcBatch(@Param("maSps") List<String> maSps);

    // toNhom lookup for a PC triplet — used to enrich WIP PC records
    @Query("""
        SELECT w.toNhom FROM WorkSchedule w
        WHERE w.congDoan = 'PC'
          AND w.maSp = :maSp
          AND (:tenTrinh IS NULL OR w.tenTrinh = :tenTrinh)
          AND (:soLo IS NULL OR w.soLo = :soLo)
        ORDER BY w.id DESC
        """)
    List<String> findToNhomByPcTriplet(
            @Param("maSp") String maSp,
            @Param("tenTrinh") String tenTrinh,
            @Param("soLo") String soLo,
            Pageable pageable
    );

    // Monthly stats: total SL + distinct lot count per department for a given MM (and optional YY)
    @Query("""
        SELECT w.congDoan,
               SUM(CASE w.congDoan
                   WHEN 'PC'   THEN w.slPc
                   WHEN 'BBC1' THEN w.slBbc1
                   WHEN 'PL'   THEN w.slPl
                   WHEN 'DG'   THEN w.slDg
                   ELSE null END),
               COUNT(DISTINCT w.soLo)
        FROM WorkSchedule w
        WHERE LENGTH(w.soLo) = 6
          AND SUBSTRING(w.soLo, 3, 2) = :month
          AND (:year IS NULL OR SUBSTRING(w.soLo, 5, 2) = :year)
          AND w.congDoan IN ('PC', 'BBC1', 'PL', 'DG')
        GROUP BY w.congDoan
        """)
    List<Object[]> getMonthlyStatsByCongDoan(
            @Param("month") String month,
            @Param("year") String year
    );

    @Query("""
        SELECT w FROM WorkSchedule w
        WHERE w.hidden = true
          AND w.deletedAt IS NULL
          AND (:congDoan IS NULL OR w.congDoan = :congDoan)
          AND (:source IS NULL OR w.source = :source OR (:source = 'SCHEDULE' AND w.source IS NULL))
          AND (:toNhom IS NULL OR w.toNhom = :toNhom)
        ORDER BY w.updatedAt DESC, w.id DESC
        """)
    Page<WorkSchedule> findHidden(
            @Param("congDoan") String congDoan,
            @Param("source") String source,
            @Param("toNhom") String toNhom,
            Pageable pageable
    );

    // Tìm bản ghi SCHEDULE theo congDoan + maBravo + soLo (bỏ qua maDonHang — dùng để update)
    // Fallback: nếu record cũ có maBravo=null (trước khi maBravo là @Column), tìm qua maSp+soLo
    @Query("""
        SELECT w FROM WorkSchedule w
        WHERE (w.source = 'SCHEDULE' OR w.source IS NULL)
          AND w.congDoan = :congDoan
          AND (
            ((:maBravo IS NULL AND w.maBravo IS NULL) OR w.maBravo = :maBravo)
            OR (w.maBravo IS NULL AND :maSp IS NOT NULL AND w.maSp = :maSp)
          )
          AND (:soLo IS NULL AND w.soLo IS NULL OR w.soLo = :soLo)
          AND w.deletedAt IS NULL
        ORDER BY w.id ASC
        """)
    java.util.Optional<WorkSchedule> findFirstScheduleByCongDoanAndKey(
            @Param("congDoan") String congDoan,
            @Param("maBravo")  String maBravo,
            @Param("maSp")     String maSp,
            @Param("soLo")     String soLo
    );

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

    /** Tìm bản ghi PLAN trùng key (ngày + tổ + maSp + maDonHang + soLo) để cộng dồn coLo */
    @Query("""
        SELECT w FROM WorkSchedule w
        WHERE w.source = 'PLAN'
          AND w.ngayThucHien = :ngay
          AND ((:toNhom IS NULL AND w.toNhom IS NULL) OR w.toNhom = :toNhom)
          AND ((:maSp IS NULL AND w.maSp IS NULL) OR w.maSp = :maSp)
          AND ((:maDonHang IS NULL AND w.maDonHang IS NULL) OR w.maDonHang = :maDonHang)
          AND ((:soLo IS NULL AND w.soLo IS NULL) OR w.soLo = :soLo)
        ORDER BY w.id ASC
        """)
    List<WorkSchedule> findPlanByKey(
            @Param("ngay") java.time.LocalDate ngay,
            @Param("toNhom") String toNhom,
            @Param("maSp") String maSp,
            @Param("maDonHang") String maDonHang,
            @Param("soLo") String soLo
    );

    // Đếm số bản ghi kế hoạch bị ảnh hưởng khi đổi lô (native SQL để tránh HQL parser)
    @Query(value = "SELECT COUNT(*) FROM work_schedule WHERE ma_don_hang = :maDonHang AND so_lo = :soLo AND deleted_at IS NULL", nativeQuery = true)
    long countByMaDonHangAndSoLoNative(@Param("maDonHang") String maDonHang, @Param("soLo") String soLo);

    // Cascade update soLo toàn bộ kế hoạch cùng maDonHang + lô cũ (native SQL)
    @Modifying
    @Transactional
    @Query(value = "UPDATE work_schedule SET so_lo = :soLoMoi WHERE ma_don_hang = :maDonHang AND so_lo = :soLoCu AND deleted_at IS NULL", nativeQuery = true)
    int updateSoLoByMaDonHangNative(
            @Param("maDonHang") String maDonHang,
            @Param("soLoCu") String soLoCu,
            @Param("soLoMoi") String soLoMoi);

    @Query("SELECT COUNT(w) FROM WorkSchedule w WHERE w.createdAt >= :from AND w.createdAt < :to AND w.deletedAt IS NULL")
    long countCreatedBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // Tìm PCPL records bị sai toNhom (vd congDoan='PCPL1' nhưng toNhom='PCPL2') — để xóa
    @Modifying
    @Transactional
    @Query("""
        UPDATE WorkSchedule w SET w.deletedAt = CURRENT_TIMESTAMP
        WHERE (w.source = 'SCHEDULE' OR w.source IS NULL)
          AND w.congDoan = :congDoan
          AND w.toNhom = :conflictToNhom
          AND w.maBravo = :maBravo
          AND (:soLo IS NULL AND w.soLo IS NULL OR w.soLo = :soLo)
          AND w.deletedAt IS NULL
        """)
    int softDeleteConflictingPcpl(
        @Param("congDoan")       String congDoan,
        @Param("conflictToNhom") String conflictToNhom,
        @Param("maBravo")        String maBravo,
        @Param("soLo")           String soLo
    );

    // Batch-fetch PCPL1/PCPL2 tinhTrang từ SCHEDULE — dùng để enrich production list
    @Query("""
        SELECT w.maBravo, w.soLo, w.congDoan, w.tinhTrang FROM WorkSchedule w
        WHERE (w.source = 'SCHEDULE' OR w.source IS NULL)
          AND w.congDoan IN ('PCPL1', 'PCPL2')
          AND w.maBravo IN :maBravos
          AND w.deletedAt IS NULL
        """)
    List<Object[]> findPcplStatusBatch(@Param("maBravos") List<String> maBravos);

    // All records sharing same maSp + maDonHang + soLo + toNhom (used for bulk coLo sync)
    @Query("""
        SELECT w FROM WorkSchedule w
        WHERE w.id <> :excludeId
          AND w.maSp = :maSp
          AND w.maDonHang = :maDonHang
          AND (w.soLo = :soLo OR (:soLo IS NULL AND w.soLo IS NULL))
          AND (w.toNhom = :toNhom OR (:toNhom IS NULL AND w.toNhom IS NULL))
        """)
    List<WorkSchedule> findSiblings(
            @Param("excludeId") Long excludeId,
            @Param("maSp") String maSp,
            @Param("maDonHang") String maDonHang,
            @Param("soLo") String soLo,
            @Param("toNhom") String toNhom
    );

    // Kiểm tra tồn tại SCHEDULE theo congDoan + toNhom (nullable) + maBravo + maDonHang + soLo
    @Query("""
        SELECT COUNT(w) > 0 FROM WorkSchedule w
        WHERE (w.source = 'SCHEDULE' OR w.source IS NULL)
          AND w.congDoan = :congDoan
          AND (:toNhom IS NULL OR w.toNhom = :toNhom)
          AND w.maBravo = :maBravo
          AND (:maDonHang IS NULL AND w.maDonHang IS NULL OR w.maDonHang = :maDonHang)
          AND (:soLo IS NULL AND w.soLo IS NULL OR w.soLo = :soLo)
          AND w.deletedAt IS NULL
        """)
    boolean existsScheduleByCongDoanAndKey(
            @Param("congDoan")   String congDoan,
            @Param("toNhom")     String toNhom,
            @Param("maBravo")    String maBravo,
            @Param("maDonHang")  String maDonHang,
            @Param("soLo")       String soLo
    );
}
