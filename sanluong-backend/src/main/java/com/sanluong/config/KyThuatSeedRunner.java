package com.sanluong.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sanluong.dto.KyThuatBaoTriDto;
import com.sanluong.dto.KyThuatCoDienDto;
import com.sanluong.dto.KyThuatKyThuatDto;
import com.sanluong.dto.KyThuatThuViecDto;
import com.sanluong.service.KyThuatCongNgheService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.List;

/**
 * Nạp dữ liệu lịch sử (06-07/2026) của Tổ Kỹ thuật – Công nghệ từ
 * Bao_cao_To_Ky_thuat_Cong_nghe.html vào DB một lần duy nhất (chỉ khi bảng còn trống).
 * Phân loại (phanLoai) của các bản ghi cũ được suy đoán theo từ khóa — có thể chưa
 * chính xác 100%, admin có thể sửa lại qua giao diện quản lý.
 */
@Component
public class KyThuatSeedRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(KyThuatSeedRunner.class);

    private final KyThuatCongNgheService service;
    private final ObjectMapper objectMapper;

    public KyThuatSeedRunner(KyThuatCongNgheService service, ObjectMapper objectMapper) {
        this.service = service;
        this.objectMapper = objectMapper;
    }

    private record SeedData(
            List<KyThuatCoDienDto> coDien,
            List<KyThuatKyThuatDto> kyThuat,
            List<KyThuatThuViecDto> thuViec,
            List<KyThuatBaoTriDto> baoTri
    ) {}

    @Override
    public void run(String... args) throws Exception {
        if (!service.listCoDien().isEmpty()) {
            return; // đã có dữ liệu, không seed lại
        }
        try (InputStream is = new ClassPathResource("data/ky-thuat-seed.json").getInputStream()) {
            SeedData seed = objectMapper.readValue(is, SeedData.class);
            seed.coDien().forEach(service::createCoDien);
            seed.kyThuat().forEach(service::createKyThuat);
            seed.thuViec().forEach(service::createThuViec);
            seed.baoTri().forEach(service::createBaoTri);
            log.info("Đã nạp dữ liệu khởi tạo Tổ Kỹ thuật – Công nghệ: {} cơ điện, {} kỹ thuật, {} thử việc, {} thiết bị bảo trì",
                    seed.coDien().size(), seed.kyThuat().size(), seed.thuViec().size(), seed.baoTri().size());
        } catch (Exception ex) {
            log.warn("Không thể nạp dữ liệu khởi tạo Tổ Kỹ thuật – Công nghệ: {}", ex.getMessage());
        }
    }
}
