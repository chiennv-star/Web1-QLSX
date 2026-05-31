package com.sanluong.repository;

import com.sanluong.entity.HangLoiNgay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface HangLoiNgayRepository extends JpaRepository<HangLoiNgay, Long> {

    List<HangLoiNgay> findByHangLoiIdOrderByNgayDesc(Long hangLoiId);

    @Query("SELECT COALESCE(SUM(n.slTraVe), 0) FROM HangLoiNgay n WHERE n.hangLoi.id = :hangLoiId")
    BigDecimal sumSlTraVe(@Param("hangLoiId") Long hangLoiId);

    @Query("SELECT COALESCE(SUM(n.slDatSauXuLy), 0) FROM HangLoiNgay n WHERE n.hangLoi.id = :hangLoiId")
    BigDecimal sumSlDatSauXuLy(@Param("hangLoiId") Long hangLoiId);

    @Query("SELECT COALESCE(SUM(n.slHuy), 0) FROM HangLoiNgay n WHERE n.hangLoi.id = :hangLoiId")
    BigDecimal sumSlHuy(@Param("hangLoiId") Long hangLoiId);

    long countByHangLoiId(Long hangLoiId);
}
