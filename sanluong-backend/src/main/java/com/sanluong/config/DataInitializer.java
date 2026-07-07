package com.sanluong.config;

import com.sanluong.entity.PhongThucHien;
import com.sanluong.entity.User;
import com.sanluong.repository.PhongThucHienRepository;
import com.sanluong.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PhongThucHienRepository phongRepo;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder,
                           PhongThucHienRepository phongRepo) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.phongRepo = phongRepo;
    }

    private static final String[][] DEFAULT_PHONG = {
        {"Pha chế 01", "1"}, {"Pha chế 02", "2"}, {"Pha chế 03", "3"},
        {"Pha chế 04", "4"}, {"Pha chế 05", "5"}, {"Pha chế 06", "6"},
        {"Pha chế 07", "7"}, {"Pha chế 08", "8"},
        {"Khu A", "10"}, {"Khu B", "11"}, {"Khu C", "12"},
        {"Phòng sạch", "20"}, {"Phòng bán sạch", "21"},
        {"BBC1", "30"}, {"Đóng gói", "31"},
    };

    @Override
    public void run(String... args) {
        create("admin",    "SongAn@2025", "Quản trị viên",       User.Role.ADMIN);
        create("ChienNV",  "ChienNV123",  "ChienNV",             User.Role.ADMIN);
        create("TKSX",     "TKSX",        "Tài khoản Sản Xuất",  User.Role.TKSX);
        create("QuanDoc",  "QuanDoc123",  "Quản lý Đọc",         User.Role.QUAN_DOC);
        initPhong();
    }

    private void initPhong() {
        for (String[] row : DEFAULT_PHONG) {
            if (!phongRepo.existsByTenIgnoreCase(row[0])) {
                phongRepo.save(new PhongThucHien(row[0], Integer.parseInt(row[1])));
            }
        }
    }

    private void create(String username, String password, String fullName, User.Role role) {
        if (!userRepository.existsByUsername(username)) {
            User u = User.builder()
                    .username(username)
                    .password(passwordEncoder.encode(password))
                    .fullName(fullName)
                    .role(role)
                    .enabled(true)
                    .build();
            userRepository.save(u);
            System.out.println("Đã tạo tài khoản: " + username);
        }
    }
}
