package com.sanluong.repository;

import com.sanluong.entity.KhoViTri;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface KhoViTriRepository extends JpaRepository<KhoViTri, Long> {
    Optional<KhoViTri> findByMa(String ma);
    boolean existsByMa(String ma);
    List<KhoViTri> findAllByOrderByMaAsc();
}
