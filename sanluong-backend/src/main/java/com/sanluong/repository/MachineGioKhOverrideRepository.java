package com.sanluong.repository;

import com.sanluong.entity.MachineGioKhOverride;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MachineGioKhOverrideRepository extends JpaRepository<MachineGioKhOverride, Long> {
    Optional<MachineGioKhOverride> findByNgayAndTenMay(LocalDate ngay, String tenMay);
    List<MachineGioKhOverride> findByNgayBetween(LocalDate start, LocalDate end);
}
