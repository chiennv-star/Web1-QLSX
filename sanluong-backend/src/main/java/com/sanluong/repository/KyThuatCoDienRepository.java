package com.sanluong.repository;

import com.sanluong.entity.KyThuatCoDien;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KyThuatCoDienRepository extends JpaRepository<KyThuatCoDien, Long> {
    List<KyThuatCoDien> findAllByOrderByNgayDescIdDesc();
}
