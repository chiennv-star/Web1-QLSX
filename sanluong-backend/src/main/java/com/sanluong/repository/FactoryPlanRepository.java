package com.sanluong.repository;

import com.sanluong.entity.FactoryPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface FactoryPlanRepository extends JpaRepository<FactoryPlan, Long> {
    List<FactoryPlan> findByNgayThucHienBetweenOrderByNgayThucHienAscIdAsc(LocalDate from, LocalDate to);
}
