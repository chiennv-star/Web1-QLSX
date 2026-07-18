package com.sanluong.repository;

import com.sanluong.entity.KyThuatKyThuat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KyThuatKyThuatRepository extends JpaRepository<KyThuatKyThuat, Long> {
    List<KyThuatKyThuat> findAllByOrderByNgayDescIdDesc();
}
