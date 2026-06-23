package com.sanluong.repository;

import com.sanluong.entity.ToLenhSanXuat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ToLenhSanXuatRepository extends JpaRepository<ToLenhSanXuat, Long> {

    Optional<ToLenhSanXuat> findByDonHangId(Long donHangId);
}
