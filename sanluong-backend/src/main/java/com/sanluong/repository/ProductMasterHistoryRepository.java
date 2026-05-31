package com.sanluong.repository;

import com.sanluong.entity.ProductMasterHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductMasterHistoryRepository extends JpaRepository<ProductMasterHistory, Long> {
    List<ProductMasterHistory> findByProductMasterIdOrderByChangedAtDesc(Long productMasterId);
}
