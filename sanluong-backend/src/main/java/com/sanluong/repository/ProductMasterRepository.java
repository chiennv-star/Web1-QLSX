package com.sanluong.repository;

import com.sanluong.entity.ProductMaster;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface ProductMasterRepository extends JpaRepository<ProductMaster, Long> {

    Optional<ProductMaster> findByMaTpIgnoreCase(String maTp);

    Optional<ProductMaster> findByMaBravoIgnoreCase(String maBravo);

    boolean existsByMaTpIgnoreCase(String maTp);

    @Query("""
        SELECT p FROM ProductMaster p
        WHERE (:keyword IS NULL
            OR p.maTp LIKE %:keyword%
            OR p.maBravo LIKE %:keyword%
            OR p.tienTrinh LIKE %:keyword%)
        """)
    Page<ProductMaster> search(@Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT COUNT(p) FROM ProductMaster p WHERE p.maBravo IS NULL OR p.maBravo = ''")
    long countByMaBravoNullOrEmpty();

    @Modifying
    @Transactional
    @Query("DELETE FROM ProductMaster p WHERE p.maBravo IS NULL OR p.maBravo = ''")
    int deleteByMaBravoNullOrEmpty();
}
