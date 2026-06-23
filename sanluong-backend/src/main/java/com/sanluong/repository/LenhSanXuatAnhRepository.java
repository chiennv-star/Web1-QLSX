package com.sanluong.repository;

import com.sanluong.entity.LenhSanXuatAnh;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LenhSanXuatAnhRepository extends JpaRepository<LenhSanXuatAnh, Long> {
    List<LenhSanXuatAnh> findByDonHangIdOrderByUploadedAtDesc(Long donHangId);
}
