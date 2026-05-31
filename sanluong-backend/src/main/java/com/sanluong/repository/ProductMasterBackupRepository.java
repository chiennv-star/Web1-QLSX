package com.sanluong.repository;

import com.sanluong.entity.ProductMasterBackup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductMasterBackupRepository extends JpaRepository<ProductMasterBackup, Long> {

    @Query("""
        SELECT b FROM ProductMasterBackup b
        WHERE (:keyword IS NULL
            OR b.maTp LIKE %:keyword%
            OR b.maBravo LIKE %:keyword%
            OR b.tienTrinh LIKE %:keyword%)
        ORDER BY b.maTp ASC
        """)
    Page<ProductMasterBackup> search(@Param("keyword") String keyword, Pageable pageable);
}
