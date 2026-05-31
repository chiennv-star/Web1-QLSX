package com.sanluong.repository;

import com.sanluong.entity.HangLoi;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface HangLoiRepository extends JpaRepository<HangLoi, Long> {

    @Query("""
        SELECT h FROM HangLoi h
        WHERE h.mtpSongAn IN :maTps
          AND h.soLo IN :soLos
        ORDER BY h.id DESC
        """)
    List<HangLoi> findByMtpSongAnInAndSoLoIn(
            @Param("maTps") List<String> maTps,
            @Param("soLos") List<String> soLos
    );

    @Query("""
        SELECT h FROM HangLoi h
        WHERE h.mtpCoMem = :maTp
          AND (:soLo IS NULL OR h.soLo = :soLo)
        ORDER BY h.id DESC
        """)
    List<HangLoi> findByMtpCoMemAndSoLo(
            @Param("maTp") String maTp,
            @Param("soLo") String soLo
    );

    @Query("""
        SELECT CASE WHEN COUNT(h) > 0 THEN TRUE ELSE FALSE END
        FROM HangLoi h
        WHERE h.mtpCoMem = :mtpCoMem
          AND h.tenHangHoa = :tenHangHoa
          AND h.soLo = :soLo
        """)
    boolean existsByTriplet(
            @Param("mtpCoMem")   String mtpCoMem,
            @Param("tenHangHoa") String tenHangHoa,
            @Param("soLo")       String soLo
    );

    @Query("""
        SELECT h FROM HangLoi h
        WHERE (:fromDate IS NULL OR h.ngayBatDau >= :fromDate)
          AND (:toDate   IS NULL OR h.ngayBatDau <= :toDate)
          AND (:keyword  IS NULL OR h.tenHangHoa LIKE CONCAT('%', :keyword, '%')
                                 OR h.mtpCoMem   LIKE CONCAT('%', :keyword, '%')
                                 OR h.soLo        LIKE CONCAT('%', :keyword, '%'))
          AND (:trangThai IS NULL OR h.trangThaiXuLy = :trangThai)
        ORDER BY h.id DESC
        """)
    Page<HangLoi> search(
            @Param("fromDate")   LocalDate fromDate,
            @Param("toDate")     LocalDate toDate,
            @Param("keyword")    String keyword,
            @Param("trangThai")  String trangThai,
            Pageable pageable
    );

    /** Tìm kiếm bản ghi chưa có trạng thái xử lý (NULL hoặc rỗng) */
    @Query("""
        SELECT h FROM HangLoi h
        WHERE (:fromDate IS NULL OR h.ngayBatDau >= :fromDate)
          AND (:toDate   IS NULL OR h.ngayBatDau <= :toDate)
          AND (:keyword  IS NULL OR h.tenHangHoa LIKE CONCAT('%', :keyword, '%')
                                 OR h.mtpCoMem   LIKE CONCAT('%', :keyword, '%')
                                 OR h.soLo        LIKE CONCAT('%', :keyword, '%'))
          AND (h.trangThaiXuLy IS NULL OR TRIM(h.trangThaiXuLy) = '')
        ORDER BY h.id DESC
        """)
    Page<HangLoi> searchChuaXuLy(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate")   LocalDate toDate,
            @Param("keyword")  String keyword,
            Pageable pageable
    );

    /** Đếm bản ghi chưa hoàn thành: NULL/rỗng + "Đang xử lý" */
    @Query("SELECT COUNT(h) FROM HangLoi h WHERE h.trangThaiXuLy IS NULL OR TRIM(h.trangThaiXuLy) = '' OR h.trangThaiXuLy = 'Đang xử lý'")
    long countChuaXuLy();
}
