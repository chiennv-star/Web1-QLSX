package com.sanluong.repository;

import com.sanluong.entity.LenhFieldHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LenhFieldHistoryRepository extends JpaRepository<LenhFieldHistory, Long> {
    List<LenhFieldHistory> findByLenhIdAndFieldNameOrderByChangedAtDesc(Long lenhId, String fieldName);
    List<LenhFieldHistory> findByLenhIdOrderByChangedAtDesc(Long lenhId);
}
