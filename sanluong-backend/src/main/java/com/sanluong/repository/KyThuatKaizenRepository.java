package com.sanluong.repository;

import com.sanluong.entity.KyThuatKaizen;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KyThuatKaizenRepository extends JpaRepository<KyThuatKaizen, Long> {
    List<KyThuatKaizen> findAllByOrderByNgayGhiNhanDescIdDesc();
}
