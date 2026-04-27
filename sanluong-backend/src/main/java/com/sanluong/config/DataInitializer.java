package com.sanluong.config;

import com.sanluong.entity.User;
import com.sanluong.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        create("admin", "admin123", "Quản trị viên", User.Role.ADMIN);
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
