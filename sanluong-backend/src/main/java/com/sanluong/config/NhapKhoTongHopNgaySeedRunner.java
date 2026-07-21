package com.sanluong.config;

import com.sanluong.service.ProductionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Backfill 1 lần cho bảng snapshot "Tổng hợp theo ngày" (nhap_kho_tong_hop_ngay) từ toàn bộ
 * lần nhập kho đã tồn tại trước khi tính năng đồng bộ 1 chiều được thêm vào — tránh mất
 * trắng dữ liệu lịch sử ở tab "Tổng hợp theo ngày" sau khi deploy.
 */
@Component
public class NhapKhoTongHopNgaySeedRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(NhapKhoTongHopNgaySeedRunner.class);

    private final ProductionService productionService;

    public NhapKhoTongHopNgaySeedRunner(ProductionService productionService) {
        this.productionService = productionService;
    }

    @Override
    public void run(String... args) {
        try {
            productionService.backfillNhapKhoTongHopNgay();
        } catch (Exception ex) {
            log.warn("Không thể backfill nhap_kho_tong_hop_ngay: {}", ex.getMessage());
        }
    }
}
