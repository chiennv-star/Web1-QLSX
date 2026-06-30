package com.sanluong.repository;

import com.sanluong.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    @Query("""
        SELECT e FROM Employee e
        WHERE (:search IS NULL
               OR e.maNhanVien LIKE %:search%
               OR e.hoVaTen LIKE %:search%
               OR e.toNhom LIKE %:search%
               OR e.viTri LIKE %:search%)
        AND (:toNhom IS NULL OR e.toNhom = :toNhom OR e.toNhom2 = :toNhom)
        AND (:tinhTrang IS NULL OR e.tinhTrang = :tinhTrang)
        AND (:excludeTinhTrang IS NULL OR e.tinhTrang IS NULL OR e.tinhTrang <> :excludeTinhTrang)
        ORDER BY e.toNhom, e.hoVaTen
        """)
    List<Employee> searchAll(
        @Param("search") String search,
        @Param("toNhom") String toNhom,
        @Param("tinhTrang") String tinhTrang,
        @Param("excludeTinhTrang") String excludeTinhTrang
    );

    boolean existsByMaNhanVien(String maNhanVien);

    Optional<Employee> findByMaNhanVien(String maNhanVien);
}
