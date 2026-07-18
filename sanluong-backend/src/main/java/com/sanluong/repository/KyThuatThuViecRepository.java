package com.sanluong.repository;

import com.sanluong.entity.KyThuatThuViec;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KyThuatThuViecRepository extends JpaRepository<KyThuatThuViec, Long> {
    List<KyThuatThuViec> findAllByOrderByNgayDescIdDesc();
}
