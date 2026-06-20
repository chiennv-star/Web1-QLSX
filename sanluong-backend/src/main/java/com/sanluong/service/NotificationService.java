package com.sanluong.service;

import com.sanluong.dto.NotificationDto;
import com.sanluong.entity.Notification;
import com.sanluong.entity.NotificationRead;
import com.sanluong.repository.NotificationReadRepository;
import com.sanluong.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.Collections;

@Service
public class NotificationService {

    private final NotificationRepository repo;
    private final NotificationReadRepository readRepo;

    public NotificationService(NotificationRepository repo, NotificationReadRepository readRepo) {
        this.repo = repo;
        this.readRepo = readRepo;
    }

    public void createLenhSxNewNotification(Long lenhId, String maDonHang, String tenSanPham,
                                             String soLo, String createdBy) {
        Notification n = new Notification();
        n.setType("LENH_SX_NEW");
        n.setTitle("Lệnh sản xuất mới");
        n.setMessage(String.format("%s đã tạo lệnh sản xuất mới: %s (Mã ĐH: %s, Lô: %s)",
                createdBy,
                tenSanPham != null ? tenSanPham : "—",
                maDonHang  != null ? maDonHang  : "—",
                soLo       != null ? soLo       : "—"));
        n.setRefId(lenhId);
        n.setRefInfo(String.format("{\"maDonHang\":\"%s\",\"soLo\":\"%s\"}",
                maDonHang != null ? maDonHang : "",
                soLo      != null ? soLo      : ""));
        n.setCreatedBy(createdBy);
        n.setCreatedAt(LocalDateTime.now());
        repo.save(n);
    }

    public void createHangLoiNotification(Long hangLoiId, String mtpSongAn, String tenHangHoa,
                                           String soLo, String phanLoaiLoi, String createdBy) {
        Notification n = new Notification();
        n.setType("HANG_LOI_NEW");
        n.setTitle("Hàng lỗi mới");
        n.setMessage(String.format("%s đã ghi nhận hàng lỗi: %s (Mã: %s, Lô: %s)%s",
                createdBy,
                tenHangHoa   != null ? tenHangHoa   : "—",
                mtpSongAn    != null ? mtpSongAn    : "—",
                soLo         != null ? soLo         : "—",
                phanLoaiLoi  != null && !phanLoaiLoi.isBlank() ? " — " + phanLoaiLoi : ""));
        n.setRefId(hangLoiId);
        n.setRefInfo(String.format("{\"mtpSongAn\":\"%s\",\"soLo\":\"%s\"}",
                mtpSongAn != null ? mtpSongAn : "",
                soLo      != null ? soLo      : ""));
        n.setCreatedBy(createdBy);
        n.setCreatedAt(LocalDateTime.now());
        repo.save(n);
    }

    public void createDonHangNewNotification(Long donHangId, String maDonHang, String tenSanPham,
                                              java.math.BigDecimal soLuong, String createdBy) {
        Notification n = new Notification();
        n.setType("DON_HANG_NEW");
        n.setTitle("Đơn hàng mới chờ duyệt");
        n.setMessage(String.format("%s đã thêm đơn hàng mới: %s (Mã ĐH: %s, SL: %s) — chờ duyệt",
                createdBy,
                tenSanPham != null ? tenSanPham : "—",
                maDonHang  != null ? maDonHang  : "—",
                soLuong    != null ? soLuong.toPlainString() : "—"));
        n.setRefId(donHangId);
        n.setRefInfo(String.format("{\"maDonHang\":\"%s\"}", maDonHang != null ? maDonHang : ""));
        n.setCreatedBy(createdBy);
        n.setCreatedAt(LocalDateTime.now());
        repo.save(n);
    }

    public void createKeHoachNotification(String action, Long refId,
                                           String maSp, String tenTrinh, String soLo,
                                           java.math.BigDecimal coLo,
                                           java.time.LocalDate ngay, String toNhom, String congDoan,
                                           String createdBy) {
        createKeHoachNotification(action, refId, maSp, tenTrinh, soLo, coLo,
                ngay, toNhom, congDoan, createdBy, null, null);
    }

    public void createKeHoachNotification(String action, Long refId,
                                           String maSp, String tenTrinh, String soLo,
                                           java.math.BigDecimal coLo,
                                           java.time.LocalDate ngay, String toNhom, String congDoan,
                                           String createdBy,
                                           java.time.LocalDate oldNgay, String oldToNhom) {
        java.time.format.DateTimeFormatter fmt = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String title = switch (action) {
            case "NEW"    -> "Tạo kế hoạch mới";
            case "UPDATE" -> "Cập nhật kế hoạch";
            case "MOVE"   -> "Dời ngày kế hoạch";
            case "DELETE" -> "Xóa kế hoạch";
            default       -> "Kế hoạch thay đổi";
        };

        // Hiển thị tên sản phẩm, nếu không có thì dùng mã SP
        String spLabel = (tenTrinh != null && !tenTrinh.isBlank()) ? tenTrinh : (maSp != null ? maSp : "—");
        String ngayStr    = ngay    != null ? ngay.format(fmt)    : "—";
        String oldNgayStr = oldNgay != null ? oldNgay.format(fmt) : "—";
        String coLoStr    = coLo != null ? coLo.toPlainString() : "—";

        String msg;
        if ("MOVE".equals(action)) {
            boolean dateChanged = !Objects.equals(oldNgay, ngay);
            boolean nhomChanged = !Objects.equals(oldToNhom, toNhom);
            StringBuilder sb = new StringBuilder();
            sb.append(String.format("%s đã dời kế hoạch: %s (Lô: %s, SL: %s)",
                    createdBy, spLabel,
                    soLo != null ? soLo : "—",
                    coLoStr));
            if (dateChanged) sb.append(String.format(", Ngày: %s → %s", oldNgayStr, ngayStr));
            if (nhomChanged) sb.append(String.format(", Tổ: %s → %s",
                    oldToNhom != null ? oldToNhom : "—",
                    toNhom    != null ? toNhom    : "—"));
            msg = sb.toString();
        } else {
            String verb = switch (action) {
                case "NEW"    -> "đã tạo kế hoạch mới";
                case "UPDATE" -> "đã cập nhật kế hoạch";
                case "DELETE" -> "đã xóa kế hoạch";
                default       -> "đã thay đổi kế hoạch";
            };
            msg = String.format("%s %s: %s (Lô: %s, SL: %s, Ngày: %s%s)",
                    createdBy, verb, spLabel,
                    soLo != null ? soLo : "—",
                    coLoStr, ngayStr,
                    toNhom != null && !toNhom.isBlank() ? ", Tổ: " + toNhom : "");
        }

        Notification n = new Notification();
        n.setType("KE_HOACH");
        n.setTitle(title);
        n.setMessage(msg);
        n.setRefId(refId);
        n.setRefInfo(String.format("{\"maSp\":\"%s\",\"soLo\":\"%s\",\"congDoan\":\"%s\",\"action\":\"%s\"}",
                maSp     != null ? maSp     : "",
                soLo     != null ? soLo     : "",
                congDoan != null ? congDoan : "",
                action));
        n.setCreatedBy(createdBy);
        n.setCreatedAt(LocalDateTime.now());
        repo.save(n);
    }

    public void createSanLuongNewNotification(Long recordId, String tienTrinh, String maTp,
                                               String lsx, Integer soLuong, String createdBy) {
        Notification n = new Notification();
        n.setType("SAN_LUONG_NEW");
        n.setTitle("Sản lượng mới");
        String spLabel = (tienTrinh != null && !tienTrinh.isBlank()) ? tienTrinh : (maTp != null ? maTp : "—");
        n.setMessage(String.format("%s đã thêm sản lượng mới: %s (Lô: %s, SL: %s)",
                createdBy,
                spLabel,
                lsx     != null ? lsx               : "—",
                soLuong != null ? soLuong.toString() : "—"));
        n.setRefId(recordId);
        n.setRefInfo(String.format("{\"maTp\":\"%s\",\"lsx\":\"%s\"}",
                maTp != null ? maTp : "",
                lsx  != null ? lsx  : ""));
        n.setCreatedBy(createdBy);
        n.setCreatedAt(LocalDateTime.now());
        repo.save(n);
    }

    public void createLichSanXuatNotification(Long scheduleId, String congDoan,
                                               String maSp, String tenTrinh, String soLo,
                                               java.math.BigDecimal coLo,
                                               java.time.LocalDate ngay, String toNhom,
                                               String createdBy) {
        java.time.format.DateTimeFormatter fmt = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String spLabel = (tenTrinh != null && !tenTrinh.isBlank()) ? tenTrinh : (maSp != null ? maSp : "—");
        String ngayStr = ngay != null ? ngay.format(fmt) : "—";
        String coLoStr = coLo != null ? coLo.toPlainString() : "—";

        Notification n = new Notification();
        n.setType("LICH_SX_NEW");
        n.setTitle("Lịch sản xuất mới — " + (congDoan != null ? congDoan : "—"));
        n.setMessage(String.format("%s đã lên lịch sản xuất mới [%s]: %s (Lô: %s, SL: %s, Ngày: %s%s)",
                createdBy,
                congDoan != null ? congDoan : "—",
                spLabel,
                soLo   != null ? soLo   : "—",
                coLoStr,
                ngayStr,
                toNhom != null && !toNhom.isBlank() ? ", Tổ: " + toNhom : ""));
        n.setRefId(scheduleId);
        n.setRefInfo(String.format("{\"congDoan\":\"%s\",\"maSp\":\"%s\",\"soLo\":\"%s\"}",
                congDoan != null ? congDoan : "",
                maSp     != null ? maSp     : "",
                soLo     != null ? soLo     : ""));
        n.setCreatedBy(createdBy);
        n.setCreatedAt(LocalDateTime.now());
        repo.save(n);
    }

    public void createDoiLoNotification(Long lenhId, String maDonHang, String tenSanPham,
                                        String soLoCu, String soLoMoi, String lyDo, String createdBy) {
        Notification n = new Notification();
        n.setType("DOI_LO");
        n.setTitle("Đổi lô sản xuất");
        n.setMessage(String.format("%s đã đổi lô [%s → %s] cho %s (Mã ĐH: %s)%s",
                createdBy,
                soLoCu != null ? soLoCu : "—",
                soLoMoi != null ? soLoMoi : "—",
                tenSanPham != null ? tenSanPham : "",
                maDonHang != null ? maDonHang : "—",
                lyDo != null && !lyDo.isBlank() ? " — Lý do: " + lyDo : ""));
        n.setRefId(lenhId);
        n.setRefInfo(String.format("{\"maDonHang\":\"%s\",\"soLoCu\":\"%s\",\"soLoMoi\":\"%s\"}",
                maDonHang != null ? maDonHang : "",
                soLoCu != null ? soLoCu : "",
                soLoMoi != null ? soLoMoi : ""));
        n.setCreatedBy(createdBy);
        n.setCreatedAt(LocalDateTime.now());
        repo.save(n);
    }

    /**
     * Tạo/cập nhật nhắc nhở "lệnh chưa phát hành" — tối đa 1 lần mỗi ngày.
     * Xóa bản ghi cũ cùng ngày trước khi tạo mới để tránh trùng.
     */
    @Transactional
    public void ensureLenhChuaPhatHanhReminder(int count, String triggeredBy) {
        if (count <= 0) return;
        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        // Nếu đã có reminder hôm nay thì bỏ qua (tránh spam khi user F5 nhiều lần)
        if (repo.existsByTypeAndCreatedAtAfter("LENH_CHUA_PHAT_HANH", startOfDay)) return;
        Notification n = new Notification();
        n.setType("LENH_CHUA_PHAT_HANH");
        n.setTitle("Nhắc nhở: Lệnh chưa phát hành");
        n.setMessage(String.format("Hiện có %d lệnh sản xuất chưa được phát hành — hãy kiểm tra và phát hành.", count));
        n.setCreatedBy(triggeredBy != null ? triggeredBy : "system");
        n.setCreatedAt(LocalDateTime.now());
        repo.save(n);
    }

    // Các loại thông báo bị ẩn với từng role
    private static final Map<String, Set<String>> EXCLUDED_TYPES_BY_ROLE = Map.of(
        "ADMIN_KH", Set.of("LENH_SX_NEW", "DON_HANG_NEW", "KE_HOACH")
    );

    private Set<String> excludedTypes(String role) {
        return EXCLUDED_TYPES_BY_ROLE.getOrDefault(role, Collections.emptySet());
    }

    public List<NotificationDto> findAll(String username, String role) {
        Set<String> excluded = excludedTypes(role);
        Set<Long> readIds = readRepo.findReadIdsByUsername(username);
        return repo.findAllOrderByCreatedAtDesc()
                .stream()
                .filter(n -> !excluded.contains(n.getType()))
                .map(n -> toDto(n, readIds.contains(n.getId())))
                .collect(Collectors.toList());
    }

    public long countUnread(String username, String role) {
        Set<String> excluded = excludedTypes(role);
        Set<Long> readIds = readRepo.findReadIdsByUsername(username);
        return repo.findAllOrderByCreatedAtDesc().stream()
                .filter(n -> !excluded.contains(n.getType()))
                .filter(n -> !readIds.contains(n.getId()))
                .count();
    }

    public Map<String, Long> countUnreadByType(String username, String role) {
        Set<String> excluded = excludedTypes(role);
        Set<Long> readIds = readRepo.findReadIdsByUsername(username);
        Map<String, Long> result = new HashMap<>();
        repo.findAllOrderByCreatedAtDesc().stream()
                .filter(n -> !excluded.contains(n.getType()))
                .filter(n -> !readIds.contains(n.getId()))
                .forEach(n -> result.merge(n.getType(), 1L, Long::sum));
        return result;
    }

    @Transactional
    public void markRead(Long notificationId, String username) {
        if (!readRepo.existsByNotificationIdAndUsername(notificationId, username)) {
            NotificationRead r = new NotificationRead();
            r.setNotificationId(notificationId);
            r.setUsername(username);
            r.setReadAt(LocalDateTime.now());
            readRepo.save(r);
        }
    }

    @Transactional
    public void deleteNotifications(List<Long> ids) {
        readRepo.deleteByNotificationIdIn(ids);
        repo.deleteAllById(ids);
    }

    @Transactional
    public void markAllRead(String username, String role) {
        Set<String> excluded = excludedTypes(role);
        Set<Long> readIds = readRepo.findReadIdsByUsername(username);
        LocalDateTime now = LocalDateTime.now();
        repo.findAllOrderByCreatedAtDesc().stream()
                .filter(n -> !excluded.contains(n.getType()))
                .filter(n -> !readIds.contains(n.getId()))
                .forEach(n -> {
                    NotificationRead r = new NotificationRead();
                    r.setNotificationId(n.getId());
                    r.setUsername(username);
                    r.setReadAt(now);
                    readRepo.save(r);
                });
    }

    private NotificationDto toDto(Notification n, boolean read) {
        NotificationDto d = new NotificationDto();
        d.setId(n.getId());
        d.setType(n.getType());
        d.setTitle(n.getTitle());
        d.setMessage(n.getMessage());
        d.setRefId(n.getRefId());
        d.setRefInfo(n.getRefInfo());
        d.setCreatedBy(n.getCreatedBy());
        d.setCreatedAt(n.getCreatedAt());
        d.setRead(read);
        return d;
    }
}
