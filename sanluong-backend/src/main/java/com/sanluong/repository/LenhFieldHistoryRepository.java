package com.sanluong.repository;

import com.sanluong.entity.LenhFieldHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LenhFieldHistoryRepository extends JpaRepository<LenhFieldHistory, Long> {
    List<LenhFieldHistory> findByLenhIdAndFieldNameOrderByChangedAtDesc(Long lenhId, String fieldName);
    List<LenhFieldHistory> findByLenhIdOrderByChangedAtDesc(Long lenhId);

    // Gộp bản ghi trùng: chuyển lịch sử đổi field của các id bị gộp sang bản ghi giữ lại
    @Modifying
    @Query("UPDATE LenhFieldHistory h SET h.lenhId = :newId WHERE h.lenhId IN :oldIds")
    int repointLenhId(@Param("oldIds") List<Long> oldIds, @Param("newId") Long newId);
}
