package com.sanluong.service;

import com.sanluong.dto.NangSuatDto;
import com.sanluong.entity.NangSuat;
import com.sanluong.repository.NangSuatRepository;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class NangSuatService {

    private final NangSuatRepository repository;

    public NangSuatService(NangSuatRepository repository) {
        this.repository = repository;
    }

    public Page<NangSuat> search(String keyword, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("maSanPham").ascending());
        String kw = (keyword == null || keyword.isBlank()) ? null : keyword;
        return repository.search(kw, pageable);
    }

    public Optional<NangSuat> findByMaSanPham(String maSanPham) {
        return repository.findByMaSanPham(maSanPham);
    }

    public NangSuat create(NangSuatDto dto) {
        NangSuat n = new NangSuat();
        mapFromDto(n, dto);
        return repository.save(n);
    }

    public NangSuat update(Long id, NangSuatDto dto) {
        NangSuat n = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ID: " + id));
        mapFromDto(n, dto);
        return repository.save(n);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    private void mapFromDto(NangSuat n, NangSuatDto dto) {
        n.setMaSanPham(dto.getMaSanPham());
        n.setTenSanPham(dto.getTenSanPham());
        n.setDangBaoChe(dto.getDangBaoChe());
        n.setToPcpl(dto.getToPcpl());
        n.setSpBbc1(dto.getSpBbc1());
        n.setSpPc(dto.getSpPc());
        n.setSpPl(dto.getSpPl());
        n.setSpDg(dto.getSpDg());
    }
}
