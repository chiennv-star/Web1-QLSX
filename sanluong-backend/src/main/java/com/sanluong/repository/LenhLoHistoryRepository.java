package com.sanluong.repository;

import com.sanluong.entity.LenhLoHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LenhLoHistoryRepository extends JpaRepository<LenhLoHistory, Long> {
    List<LenhLoHistory> findByLenhIdOrderByChangedAtDesc(Long lenhId);

    @Query("SELECT h FROM LenhLoHistory h WHERE h.lenhId IN :lenhIds ORDER BY h.changedAt DESC")
    List<LenhLoHistory> findByLenhIdInOrderByChangedAtDesc(@Param("lenhIds") List<Long> lenhIds);

    @Query("""
        SELECT h FROM LenhLoHistory h
        WHERE h.lenhId IN (
            SELECT e.id FROM LenhSanXuat e WHERE e.maDonHang = :maDonHang
        )
        AND h.soLoMoi = :soLo
        ORDER BY h.changedAt DESC
        """)
    List<LenhLoHistory> findByMaDonHangAndSoLoMoi(
            @Param("maDonHang") String maDonHang,
            @Param("soLo") String soLo);
}
