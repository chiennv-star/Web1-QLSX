package com.sanluong.service;

import com.sanluong.dto.WorkScheduleDto;
import com.sanluong.entity.ProductionRecord;
import com.sanluong.entity.WorkSchedule;
import com.sanluong.repository.ProductionRecordRepository;
import com.sanluong.repository.WorkScheduleRepository;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

@Service
public class WorkScheduleService {

    private final WorkScheduleRepository repository;
    private final ProductionRecordRepository productionRepo;

    public WorkScheduleService(WorkScheduleRepository repository,
                                ProductionRecordRepository productionRepo) {
        this.repository = repository;
        this.productionRepo = productionRepo;
    }

    public Page<WorkSchedule> search(LocalDate fromDate, LocalDate toDate,
                                      String maSp, String tenTrinh, String soLo,
                                      String tinhTrang, String congDoan, String source,
                                      int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return repository.search(fromDate, toDate,
                isEmpty(maSp) ? null : maSp,
                isEmpty(tenTrinh) ? null : tenTrinh,
                isEmpty(soLo) ? null : soLo,
                isEmpty(tinhTrang) ? null : tinhTrang,
                isEmpty(congDoan) ? null : congDoan,
                isEmpty(source) ? null : source,
                pageable);
    }

    public Page<WorkSchedule> findDeviations(LocalDate fromDate, LocalDate toDate,
                                              String maSp, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return repository.findDeviations(fromDate, toDate,
                isEmpty(maSp) ? null : maSp,
                pageable);
    }

    // Returns unique (maSp, tenTrinh, soLo) triplets from PC + BBC1 stages
    public List<Map<String, String>> getSuggestions() {
        List<Object[]> rows = repository.findDistinctTripletsFromPcAndBbc1();
        List<Map<String, String>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, String> map = new HashMap<>();
            map.put("maSp", row[0] != null ? row[0].toString() : null);
            map.put("tenTrinh", row[1] != null ? row[1].toString() : null);
            map.put("soLo", row[2] != null ? row[2].toString() : null);
            result.add(map);
        }
        return result;
    }

    // Returns all 4 stages' data for a given (maSp, tenTrinh, soLo) triplet
    public Map<String, Object> lookupByTriplet(String maSp, String tenTrinh, String soLo) {
        Map<String, Object> result = new HashMap<>();
        result.put("maSp", maSp);
        result.put("tenTrinh", tenTrinh);
        result.put("soLo", soLo);

        String tenTrinhParam = isEmpty(tenTrinh) ? null : tenTrinh;
        String soLoParam = isEmpty(soLo) ? null : soLo;
        Pageable limit1 = PageRequest.of(0, 1);

        for (String stage : new String[]{"PC", "BBC1", "PL", "DG"}) {
            List<WorkSchedule> records = repository.findByCongDoanAndTriplet(
                    stage, maSp, tenTrinhParam, soLoParam, limit1);
            if (!records.isEmpty()) {
                WorkSchedule w = records.get(0);
                Map<String, Object> stageData = new HashMap<>();
                stageData.put("tinhTrang", w.getTinhTrang());
                stageData.put("congPc", w.getCongPc());
                stageData.put("slBbc1", w.getSlBbc1());
                stageData.put("congBbc1", w.getCongBbc1());
                stageData.put("slPl", w.getSlPl());
                stageData.put("congPl", w.getCongPl());
                stageData.put("slDg", w.getSlDg());
                stageData.put("congDg", w.getCongDg());
                result.put(stage.toLowerCase(), stageData);
            }
        }
        return result;
    }

    public WorkSchedule getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ID: " + id));
    }

    public WorkSchedule create(WorkScheduleDto dto, String username) {
        WorkSchedule w = toEntity(dto);
        w.setCreatedBy(username);
        w.setUpdatedBy(username);
        WorkSchedule saved = repository.save(w);
        syncToProduction(saved);
        return saved;
    }

    public WorkSchedule update(Long id, WorkScheduleDto dto, String username) {
        WorkSchedule w = getById(id);
        applyDto(w, dto);
        w.setUpdatedBy(username);
        WorkSchedule saved = repository.save(w);
        syncToProduction(saved);
        return saved;
    }

    // Tự động đồng bộ Công PC/PL/BBC1/ĐG và tình trạng sang bảng sản lượng
    private void syncToProduction(WorkSchedule w) {
        if (isEmpty(w.getMaSp())) return;
        String stage = w.getCongDoan();
        if (stage == null) return;

        String tienTrinh = isEmpty(w.getTenTrinh()) ? null : w.getTenTrinh();
        String lsx = isEmpty(w.getSoLo()) ? null : w.getSoLo();

        List<ProductionRecord> records = productionRepo.findByTriplet(w.getMaSp(), tienTrinh, lsx);
        if (records.isEmpty()) return;

        for (ProductionRecord r : records) {
            switch (stage) {
                case "PC" -> {
                    if (w.getSlPc()    != null) r.setSlPc(String.valueOf(w.getSlPc().intValue()));
                    if (w.getCongPc()  != null) r.setPcChiPhi(w.getCongPc());
                    if (w.getTinhTrang() != null) r.setPcTrangThai(w.getTinhTrang());
                }
                case "BBC1" -> {
                    if (w.getCongBbc1() != null) r.setBbc1_3(w.getCongBbc1());
                    if (w.getSlBbc1()  != null) r.setBbc1_2(String.valueOf(w.getSlBbc1().intValue()));
                    if (w.getTinhTrang() != null) r.setBbc1TrangThai(w.getTinhTrang());
                }
                case "PL" -> {
                    if (w.getCongPl() != null) r.setPlChiPhi(w.getCongPl());
                    if (w.getSlPl()   != null) r.setPcPl(String.valueOf(w.getSlPl().intValue()));
                    if (w.getTinhTrang() != null) r.setPlTrangThai(w.getTinhTrang());
                }
                case "DG" -> {
                    if (w.getCongDg() != null) r.setDgChiPhi(w.getCongDg());
                    if (w.getSlDg()   != null) r.setDg2(String.valueOf(w.getSlDg().intValue()));
                    if (w.getTinhTrang() != null) r.setDgTrangThai(w.getTinhTrang());
                }
            }
        }
        productionRepo.saveAll(records);
    }

    @org.springframework.transaction.annotation.Transactional
    public void updateSlOnly(Long workScheduleId, String congDoan, java.math.BigDecimal newSl) {
        WorkSchedule w = getById(workScheduleId);
        switch (congDoan) {
            case "PC"   -> w.setSlPc(newSl);
            case "BBC1" -> w.setSlBbc1(newSl);
            case "PL"   -> w.setSlPl(newSl);
            case "DG"   -> w.setSlDg(newSl);
        }
        repository.save(w);
        syncToProduction(w);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    private WorkSchedule toEntity(WorkScheduleDto dto) {
        WorkSchedule w = new WorkSchedule();
        applyDto(w, dto);
        return w;
    }

    private void applyDto(WorkSchedule w, WorkScheduleDto dto) {
        w.setSource(dto.getSource());
        w.setCongDoan(dto.getCongDoan());
        w.setNgayThucHien(dto.getNgayThucHien());
        w.setMaSp(dto.getMaSp());
        w.setTenTrinh(dto.getTenTrinh());
        w.setSoLo(dto.getSoLo());
        w.setCoLo(dto.getCoLo());
        w.setToNhom(dto.getToNhom());
        w.setPhongThucHien(dto.getPhongThucHien());
        w.setTruongCa(dto.getTruongCa());
        w.setNguoiHoTro(dto.getNguoiHoTro());
        w.setChuY(dto.getChuY());
        w.setSaiLech(dto.getSaiLech());
        w.setTinhTrang(dto.getTinhTrang());
        w.setSlPc(dto.getSlPc());
        w.setCongPc(dto.getCongPc());
        w.setSlBbc1(dto.getSlBbc1());
        w.setCongBbc1(dto.getCongBbc1());
        w.setSlPl(dto.getSlPl());
        w.setCongPl(dto.getCongPl());
        w.setSlDg(dto.getSlDg());
        w.setCongDg(dto.getCongDg());
        w.setCongCc(dto.getCongCc());
    }

    private boolean isEmpty(String s) { return s == null || s.isBlank(); }
}
