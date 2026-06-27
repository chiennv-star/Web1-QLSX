package com.sanluong.repository;

import com.sanluong.entity.SanLuongTongHop;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SanLuongTongHopRepository extends JpaRepository<SanLuongTongHop, Long> {

    @Query(value = """
        SELECT s FROM SanLuongTongHop s
        LEFT JOIN ProductMaster pm ON UPPER(pm.maTp) = UPPER(s.maTp)
        WHERE (:maBravo      IS NULL OR LOWER(s.maBravo)   LIKE LOWER(CONCAT('%',:maBravo,'%')))
          AND (:maTp         IS NULL OR LOWER(s.maTp)      LIKE LOWER(CONCAT('%',:maTp,'%')))
          AND (:lsx          IS NULL OR LOWER(s.lsx)       LIKE LOWER(CONCAT('%',:lsx,'%')))
          AND (:loaiSanPham  IS NULL OR pm.loaiSanPham     = :loaiSanPham)
          AND (:toThucHien   IS NULL OR pm.toNhomPcpl      = :toThucHien)
        ORDER BY s.createdAt DESC
        """,
        countQuery = """
        SELECT COUNT(s) FROM SanLuongTongHop s
        LEFT JOIN ProductMaster pm ON UPPER(pm.maTp) = UPPER(s.maTp)
        WHERE (:maBravo      IS NULL OR LOWER(s.maBravo)   LIKE LOWER(CONCAT('%',:maBravo,'%')))
          AND (:maTp         IS NULL OR LOWER(s.maTp)      LIKE LOWER(CONCAT('%',:maTp,'%')))
          AND (:lsx          IS NULL OR LOWER(s.lsx)       LIKE LOWER(CONCAT('%',:lsx,'%')))
          AND (:loaiSanPham  IS NULL OR pm.loaiSanPham     = :loaiSanPham)
          AND (:toThucHien   IS NULL OR pm.toNhomPcpl      = :toThucHien)
        """)
    Page<SanLuongTongHop> search(
            @Param("maBravo")     String maBravo,
            @Param("maTp")        String maTp,
            @Param("lsx")         String lsx,
            @Param("loaiSanPham") String loaiSanPham,
            @Param("toThucHien")  String toThucHien,
            Pageable pageable);

    boolean existsByMaBravoAndLsxAndMaDonHang(String maBravo, String lsx, String maDonHang);
}
