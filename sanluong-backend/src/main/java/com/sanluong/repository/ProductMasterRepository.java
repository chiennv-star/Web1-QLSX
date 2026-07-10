package com.sanluong.repository;

import com.sanluong.entity.ProductMaster;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface ProductMasterRepository extends JpaRepository<ProductMaster, Long> {

    Optional<ProductMaster> findByMaTpIgnoreCase(String maTp);

    @Query("SELECT p FROM ProductMaster p WHERE UPPER(p.maTp) IN :codes")
    List<ProductMaster> findByMaTpIn(@Param("codes") java.util.Collection<String> codes);

    List<ProductMaster> findByMaBravoIgnoreCase(String maBravo);

    @Query("SELECT p FROM ProductMaster p WHERE UPPER(p.maBravo) IN :codes")
    List<ProductMaster> findByMaBravoIn(@Param("codes") java.util.Collection<String> codes);

    boolean existsByMaTpIgnoreCase(String maTp);

    @Query("""
        SELECT p FROM ProductMaster p
        WHERE (:keyword IS NULL
            OR p.maTp LIKE %:keyword%
            OR p.maBravo LIKE %:keyword%
            OR p.tienTrinh LIKE %:keyword%)
        AND (:toNhomPcpl IS NULL OR p.toNhomPcpl = :toNhomPcpl)
        """)
    Page<ProductMaster> search(@Param("keyword") String keyword,
                               @Param("toNhomPcpl") String toNhomPcpl,
                               Pageable pageable);

    @Query("SELECT DISTINCT p.loaiSanPham FROM ProductMaster p WHERE p.loaiSanPham IS NOT NULL AND p.loaiSanPham <> '' ORDER BY p.loaiSanPham")
    List<String> findDistinctLoaiSanPham();

    @Query("SELECT COUNT(p) FROM ProductMaster p WHERE p.maBravo IS NULL OR p.maBravo = ''")
    long countByMaBravoNullOrEmpty();

    @Modifying
    @Transactional
    @Query("DELETE FROM ProductMaster p WHERE p.maBravo IS NULL OR p.maBravo = ''")
    int deleteByMaBravoNullOrEmpty();

    @Modifying
    @Transactional
    @Query("UPDATE ProductMaster p SET p.nangSuatPcMe = :nangSuatPcMe, p.tocDoMayPl = :tocDoMayPl, p.updatedAt = CURRENT_TIMESTAMP WHERE p.toNhomPcpl = 'PCPL2' AND p.loaiSanPham IN ('Dầu gội', 'Sữa tắm')")
    int bulkUpdatePcpl2MeAndTocDoMayPl(@Param("nangSuatPcMe") String nangSuatPcMe, @Param("tocDoMayPl") Integer tocDoMayPl);
}
