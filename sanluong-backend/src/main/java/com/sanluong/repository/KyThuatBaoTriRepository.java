package com.sanluong.repository;

import com.sanluong.entity.KyThuatBaoTri;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KyThuatBaoTriRepository extends JpaRepository<KyThuatBaoTri, Long> {
    List<KyThuatBaoTri> findAllByOrderByTenThietBiAsc();
}
