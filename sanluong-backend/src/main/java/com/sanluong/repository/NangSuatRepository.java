package com.sanluong.repository;

import com.sanluong.entity.NangSuat;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface NangSuatRepository extends JpaRepository<NangSuat, Long> {

    Optional<NangSuat> findByMaSanPham(String maSanPham);

    @Query("""
        SELECT n FROM NangSuat n
        WHERE (:keyword IS NULL
            OR n.maSanPham LIKE %:keyword%
            OR n.tenSanPham LIKE %:keyword%
            OR n.dangBaoChe LIKE %:keyword%
            OR n.toPcpl LIKE %:keyword%)
        """)
    Page<NangSuat> search(@Param("keyword") String keyword, Pageable pageable);
}
