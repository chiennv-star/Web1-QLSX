package com.sanluong.repository;

import com.sanluong.entity.NhapKhoTongHopNgay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface NhapKhoTongHopNgayRepository extends JpaRepository<NhapKhoTongHopNgay, Long> {

    Optional<NhapKhoTongHopNgay> findBySourceId(Long sourceId);

    @Query("""
        SELECT r FROM NhapKhoTongHopNgay r
        WHERE (:fromDate IS NULL OR r.ngayXuatKho IS NULL OR r.ngayXuatKho >= :fromDate)
          AND (:toDate   IS NULL OR r.ngayXuatKho IS NULL OR r.ngayXuatKho <= :toDate)
        ORDER BY r.ngayXuatKho DESC NULLS LAST, r.id DESC
        """)
    List<NhapKhoTongHopNgay> search(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate")   LocalDate toDate);
}
