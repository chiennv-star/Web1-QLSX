package com.sanluong.repository;

import com.sanluong.entity.PhongThucHien;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PhongThucHienRepository extends JpaRepository<PhongThucHien, Long> {

    @Query("SELECT p FROM PhongThucHien p ORDER BY COALESCE(p.sortOrder, 9999), p.ten")
    List<PhongThucHien> findAllSorted();

    boolean existsByTenIgnoreCase(String ten);
}
