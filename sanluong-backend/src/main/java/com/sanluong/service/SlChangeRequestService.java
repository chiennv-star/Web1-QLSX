package com.sanluong.service;

import com.sanluong.dto.SlChangeRequestDto;
import com.sanluong.entity.SlChangeRequest;
import com.sanluong.entity.WorkScheduleSession;
import com.sanluong.repository.SlChangeRequestRepository;
import com.sanluong.repository.WorkScheduleSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class SlChangeRequestService {

    private final SlChangeRequestRepository requestRepo;
    private final WorkScheduleSessionRepository sessionRepo;
    private final WorkScheduleService scheduleService;

    public SlChangeRequestService(SlChangeRequestRepository requestRepo,
                                   WorkScheduleSessionRepository sessionRepo,
                                   WorkScheduleService scheduleService) {
        this.requestRepo = requestRepo;
        this.sessionRepo = sessionRepo;
        this.scheduleService = scheduleService;
    }

    @Transactional
    public SlChangeRequest create(SlChangeRequestDto dto, String requestedBy) {
        WorkScheduleSession session = sessionRepo.findById(dto.getWorkScheduleSessionId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy session"));

        // Nếu đã có yêu cầu PENDING → cập nhật giá trị mới thay vì tạo mới
        java.util.Optional<SlChangeRequest> existing =
                requestRepo.findByWorkScheduleSessionIdAndStatus(dto.getWorkScheduleSessionId(), "PENDING");
        if (existing.isPresent()) {
            SlChangeRequest req = existing.get();
            req.setNewValue(dto.getNewValue());
            req.setRequestedBy(requestedBy);
            req.setRequestedAt(LocalDateTime.now());
            return requestRepo.save(req);
        }

        SlChangeRequest req = new SlChangeRequest();
        req.setWorkScheduleId(dto.getWorkScheduleId());
        req.setWorkScheduleSessionId(dto.getWorkScheduleSessionId());
        req.setCongDoan(dto.getCongDoan());
        req.setMaSp(dto.getMaSp());
        req.setTenTrinh(dto.getTenTrinh());
        req.setSoLo(dto.getSoLo());
        req.setNgay(dto.getNgay());
        req.setOldValue(session.getSanLuong());
        req.setNewValue(dto.getNewValue());
        req.setRequestedBy(requestedBy);
        return requestRepo.save(req);
    }

    public List<SlChangeRequest> getPending() {
        return requestRepo.findByStatusOrderByRequestedAtDesc("PENDING");
    }

    public List<SlChangeRequest> getForSchedule(Long workScheduleId) {
        return requestRepo.findByWorkScheduleIdOrderByRequestedAtDesc(workScheduleId);
    }

    @Transactional
    public SlChangeRequest approve(Long id, String reviewedBy) {
        SlChangeRequest req = requestRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy yêu cầu"));
        if (!"PENDING".equals(req.getStatus()))
            throw new RuntimeException("Yêu cầu không ở trạng thái chờ duyệt");

        WorkScheduleSession session = sessionRepo.findById(req.getWorkScheduleSessionId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy session"));
        session.setSanLuong(req.getNewValue());
        sessionRepo.save(session);

        // Recalculate total SL — dedup per day (same day's multiple sessions share one sanLuong)
        List<WorkScheduleSession> allSessions =
                sessionRepo.findByWorkScheduleIdOrderByNgayAscIdAsc(req.getWorkScheduleId());
        BigDecimal totalSl = allSessions.stream()
                .filter(s -> s.getSanLuong() != null
                        && s.getSanLuong().compareTo(BigDecimal.ZERO) > 0)
                .collect(java.util.stream.Collectors.toMap(
                        s -> s.getNgay() != null ? s.getNgay().toString() : String.valueOf(s.getId()),
                        WorkScheduleSession::getSanLuong,
                        (a, b) -> a))
                .values().stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        scheduleService.updateSlOnly(req.getWorkScheduleId(), req.getCongDoan(), totalSl);

        req.setStatus("APPROVED");
        req.setReviewedBy(reviewedBy);
        req.setReviewedAt(LocalDateTime.now());
        return requestRepo.save(req);
    }

    @Transactional
    public SlChangeRequest reject(Long id, String reviewedBy, String note) {
        SlChangeRequest req = requestRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy yêu cầu"));
        if (!"PENDING".equals(req.getStatus()))
            throw new RuntimeException("Yêu cầu không ở trạng thái chờ duyệt");

        req.setStatus("REJECTED");
        req.setReviewedBy(reviewedBy);
        req.setReviewedAt(LocalDateTime.now());
        req.setNote(note);
        return requestRepo.save(req);
    }
}
