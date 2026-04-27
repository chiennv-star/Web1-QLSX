package com.sanluong.repository;

import com.sanluong.entity.HangLoi;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;

public interface HangLoiRepository extends JpaRepository<HangLoi, Long> {

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
}
