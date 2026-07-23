package com.sanluong.repository;

import com.sanluong.entity.KhoTon;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KhoTonRepository extends JpaRepository<KhoTon, Long> {
    List<KhoTon> findByViTri(String viTri);
    List<KhoTon> findByMaHangOrderByHanDungAsc(String maHang);
    List<KhoTon> findByMaHangContainingIgnoreCaseOrTenHangContainingIgnoreCase(String maHang, String tenHang);
}
