package com.sanluong.service;

import com.sanluong.dto.FactoryPlanDto;
import com.sanluong.entity.FactoryPlan;
import com.sanluong.repository.FactoryPlanRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class FactoryPlanService {

    private final FactoryPlanRepository repository;

    public FactoryPlanService(FactoryPlanRepository repository) {
        this.repository = repository;
    }

    public List<FactoryPlan> getByWeek(LocalDate from, LocalDate to) {
        return repository.findByNgayThucHienBetweenOrderByNgayThucHienAscIdAsc(from, to);
    }

    public FactoryPlan create(FactoryPlanDto dto, String username) {
        FactoryPlan p = new FactoryPlan();
        apply(p, dto);
        p.setCreatedBy(username);
        p.setUpdatedBy(username);
        return repository.save(p);
    }

    public FactoryPlan update(Long id, FactoryPlanDto dto, String username) {
        FactoryPlan p = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ID: " + id));
        apply(p, dto);
        p.setUpdatedBy(username);
        return repository.save(p);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    private void apply(FactoryPlan p, FactoryPlanDto dto) {
        p.setNgayThucHien(dto.getNgayThucHien());
        p.setMaSp(dto.getMaSp());
        p.setTenSanPham(dto.getTenSanPham());
        p.setSoLo(dto.getSoLo());
        p.setToThucHien(dto.getToThucHien());
        p.setTinhTrang(dto.getTinhTrang());
        p.setMayThucHien(dto.getMayThucHien());
        p.setPhongThucHien(dto.getPhongThucHien());
        p.setSoNguoiThucHien(dto.getSoNguoiThucHien());
        p.setGhiChu(dto.getGhiChu());
    }
}
