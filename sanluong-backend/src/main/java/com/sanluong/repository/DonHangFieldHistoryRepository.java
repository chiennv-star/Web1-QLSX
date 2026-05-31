package com.sanluong.repository;

import com.sanluong.entity.DonHangFieldHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DonHangFieldHistoryRepository extends JpaRepository<DonHangFieldHistory, Long> {
    List<DonHangFieldHistory> findByDonHangIdAndFieldNameOrderByChangedAtDesc(Long donHangId, String fieldName);
    List<DonHangFieldHistory> findByDonHangIdOrderByChangedAtDesc(Long donHangId);
}
