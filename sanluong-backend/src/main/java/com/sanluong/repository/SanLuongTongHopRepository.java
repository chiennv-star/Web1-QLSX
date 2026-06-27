package com.sanluong.repository;

import com.sanluong.entity.SanLuongTongHop;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SanLuongTongHopRepository extends JpaRepository<SanLuongTongHop, Long> {

    @Query(value = """
        SELECT s.* FROM san_luong_tong_hop s
        LEFT JOIN product_master pm ON UPPER(pm.ma_tp) = UPPER(s.ma_tp)
        WHERE (:maBravo     IS NULL OR s.ma_bravo  LIKE CONCAT('%',:maBravo,'%'))
          AND (:maTp        IS NULL OR s.ma_tp     LIKE CONCAT('%',:maTp,'%'))
          AND (:lsx         IS NULL OR s.lsx       LIKE CONCAT('%',:lsx,'%'))
          AND (:loaiSanPham IS NULL OR pm.loai_san_pham = :loaiSanPham)
          AND (:toThucHien  IS NULL OR pm.to_nhom_pcpl  = :toThucHien)
        ORDER BY s.created_at DESC
        """,
        countQuery = """
        SELECT COUNT(*) FROM san_luong_tong_hop s
        LEFT JOIN product_master pm ON UPPER(pm.ma_tp) = UPPER(s.ma_tp)
        WHERE (:maBravo     IS NULL OR s.ma_bravo  LIKE CONCAT('%',:maBravo,'%'))
          AND (:maTp        IS NULL OR s.ma_tp     LIKE CONCAT('%',:maTp,'%'))
          AND (:lsx         IS NULL OR s.lsx       LIKE CONCAT('%',:lsx,'%'))
          AND (:loaiSanPham IS NULL OR pm.loai_san_pham = :loaiSanPham)
          AND (:toThucHien  IS NULL OR pm.to_nhom_pcpl  = :toThucHien)
        """,
        nativeQuery = true)
    Page<SanLuongTongHop> search(
            @Param("maBravo")     String maBravo,
            @Param("maTp")        String maTp,
            @Param("lsx")         String lsx,
            @Param("loaiSanPham") String loaiSanPham,
            @Param("toThucHien")  String toThucHien,
            Pageable pageable);

    boolean existsByMaBravoAndLsxAndMaDonHang(String maBravo, String lsx, String maDonHang);
}
