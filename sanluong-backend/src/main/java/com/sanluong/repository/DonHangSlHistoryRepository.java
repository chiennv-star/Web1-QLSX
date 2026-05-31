package com.sanluong.repository;

import com.sanluong.entity.DonHangSlHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DonHangSlHistoryRepository extends JpaRepository<DonHangSlHistory, Long> {
    List<DonHangSlHistory> findByDonHangIdOrderByChangedAtDesc(Long donHangId);
}
