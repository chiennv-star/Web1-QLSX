package com.sanluong.repository;

import com.sanluong.entity.PhongSanXuat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PhongSanXuatRepository extends JpaRepository<PhongSanXuat, Long> {

    @Query("SELECT p FROM PhongSanXuat p ORDER BY COALESCE(p.sortOrder, 9999), p.ten")
    List<PhongSanXuat> findAllSorted();

    boolean existsByTenIgnoreCase(String ten);
}
