package com.sanluong.config;

import com.sanluong.service.KhoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Sinh sơ đồ vị trí mặc định cho module Định vị kho khi bảng kho_vi_tri chưa có dữ liệu.
 */
@Component
public class KhoViTriSeedRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(KhoViTriSeedRunner.class);

    private final KhoService khoService;

    public KhoViTriSeedRunner(KhoService khoService) {
        this.khoService = khoService;
    }

    @Override
    public void run(String... args) {
        try {
            khoService.seedViTriIfEmpty();
        } catch (Exception ex) {
            log.warn("Không thể seed kho_vi_tri: {}", ex.getMessage());
        }
    }
}
