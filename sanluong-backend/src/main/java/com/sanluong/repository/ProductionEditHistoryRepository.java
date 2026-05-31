package com.sanluong.repository;

import com.sanluong.entity.ProductionEditHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProductionEditHistoryRepository extends JpaRepository<ProductionEditHistory, Long> {
    List<ProductionEditHistory> findByProductionIdOrderByChangedAtDesc(Long productionId);
}
