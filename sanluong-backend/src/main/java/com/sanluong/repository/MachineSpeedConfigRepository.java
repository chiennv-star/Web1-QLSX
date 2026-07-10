package com.sanluong.repository;

import com.sanluong.entity.MachineSpeedConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MachineSpeedConfigRepository extends JpaRepository<MachineSpeedConfig, Long> {

    Optional<MachineSpeedConfig> findByTenMay(String tenMay);
}
