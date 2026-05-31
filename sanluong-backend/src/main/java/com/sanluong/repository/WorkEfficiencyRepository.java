package com.sanluong.repository;

import com.sanluong.entity.WorkEfficiency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WorkEfficiencyRepository extends JpaRepository<WorkEfficiency, Long> {

    Optional<WorkEfficiency> findByMaNhanVien(String maNhanVien);

    @Query("""
        SELECT w FROM WorkEfficiency w
        WHERE (:search IS NULL
               OR w.maNhanVien LIKE %:search%
               OR w.hoVaTen LIKE %:search%
               OR w.viTri LIKE %:search%)
        ORDER BY w.hoVaTen
        """)
    List<WorkEfficiency> searchAll(@Param("search") String search);
}
