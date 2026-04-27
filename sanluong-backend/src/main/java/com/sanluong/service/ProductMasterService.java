package com.sanluong.service;

import com.sanluong.dto.ProductMasterDto;
import com.sanluong.entity.ProductMaster;
import com.sanluong.repository.ProductMasterRepository;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class ProductMasterService {

    private final ProductMasterRepository repository;

    public ProductMasterService(ProductMasterRepository repository) {
        this.repository = repository;
    }

    public Page<ProductMaster> search(String keyword, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("maTp").ascending());
        String kw = (keyword == null || keyword.isBlank()) ? null : keyword;
        return repository.search(kw, pageable);
    }

    public Optional<ProductMaster> findByMaTp(String maTp) {
        return repository.findByMaTpIgnoreCase(maTp);
    }

    public ProductMaster create(ProductMasterDto dto) {
        if (repository.existsByMaTpIgnoreCase(dto.getMaTp())) {
            throw new RuntimeException("Mã TP đã tồn tại: " + dto.getMaTp());
        }
        ProductMaster p = new ProductMaster();
        p.setMaTp(dto.getMaTp());
        p.setMaBravo(dto.getMaBravo());
        p.setTienTrinh(dto.getTienTrinh());
        p.setSlTrungBinh(dto.getSlTrungBinh());
        p.setNangSuatPc(dto.getNangSuatPc());
        p.setNangSuatPl(dto.getNangSuatPl());
        p.setNangSuatBbc1(dto.getNangSuatBbc1());
        p.setMayMocPc(dto.getMayMocPc());
        p.setMayMocPl(dto.getMayMocPl());
        p.setMayMocBbc1(dto.getMayMocBbc1());
        p.setMayMocDg(dto.getMayMocDg());
        return repository.save(p);
    }

    public ProductMaster update(Long id, ProductMasterDto dto) {
        ProductMaster p = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ID: " + id));
        p.setMaBravo(dto.getMaBravo());
        p.setTienTrinh(dto.getTienTrinh());
        p.setSlTrungBinh(dto.getSlTrungBinh());
        p.setNangSuatPc(dto.getNangSuatPc());
        p.setNangSuatPl(dto.getNangSuatPl());
        p.setNangSuatBbc1(dto.getNangSuatBbc1());
        p.setMayMocPc(dto.getMayMocPc());
        p.setMayMocPl(dto.getMayMocPl());
        p.setMayMocBbc1(dto.getMayMocBbc1());
        p.setMayMocDg(dto.getMayMocDg());
        return repository.save(p);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
