package com.sanluong.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

// Chạy TRƯỚC DataInitializer (@Order(2)) để cập nhật schema nếu cần
@Component
@Order(1)
public class SchemaMigrator implements CommandLineRunner {

    private final DataSource dataSource;

    public SchemaMigrator(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) {
        runMigration("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL",
                "Đã cập nhật cột 'role' sang VARCHAR(50).");
        runMigration("ALTER TABLE product_master ADD COLUMN sl_trung_binh DECIMAL(12,2) NOT NULL DEFAULT 1",
                "Đã thêm cột 'sl_trung_binh' vào product_master.");
        runMigration("ALTER TABLE work_schedule_session ADD COLUMN khac VARCHAR(500)",
                "Đã thêm cột 'khac' vào work_schedule_session.");
        runMigration("ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0",
                "Đã thêm cột 'must_change_password' vào users.");
    }

    private void runMigration(String sql, String successMsg) {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.execute(sql);
            System.out.println("[SchemaMigrator] " + successMsg);
        } catch (Exception e) {
            System.out.println("[SchemaMigrator] Bỏ qua migration: " + e.getMessage());
        }
    }
}
