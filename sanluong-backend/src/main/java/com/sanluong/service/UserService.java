package com.sanluong.service;

import com.sanluong.dto.UserDto;
import com.sanluong.entity.User;
import com.sanluong.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<User> getAll() {
        return userRepository.findAll();
    }

    public User create(UserDto dto) {
        if (userRepository.existsByUsername(dto.getUsername())) {
            throw new RuntimeException("Username đã tồn tại: " + dto.getUsername());
        }
        User user = User.builder()
                .username(dto.getUsername())
                .password(passwordEncoder.encode(dto.getPassword()))
                .fullName(dto.getFullName())
                .role(dto.getRole())
                .enabled(true)
                .build();
        if (dto.getMaNhanVien() != null && !dto.getMaNhanVien().isBlank()) {
            user.setMaNhanVien(dto.getMaNhanVien().trim());
        }
        return userRepository.save(user);
    }

    public User update(Long id, UserDto dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));
        user.setFullName(dto.getFullName());
        user.setRole(dto.getRole());
        user.setEnabled(dto.isEnabled());
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(dto.getPassword()));
        }
        user.setMaNhanVien(dto.getMaNhanVien() != null && !dto.getMaNhanVien().isBlank()
                ? dto.getMaNhanVien().trim() : null);
        return userRepository.save(user);
    }

    public void delete(Long id) {
        userRepository.deleteById(id);
    }

    public User changeUsername(String currentUsername, String newUsername) {
        if (newUsername == null || newUsername.isBlank())
            throw new RuntimeException("Tên đăng nhập mới không được để trống");
        String trimmed = newUsername.trim();
        if (trimmed.length() < 3)
            throw new RuntimeException("Tên đăng nhập phải có ít nhất 3 ký tự");
        if (userRepository.existsByUsername(trimmed))
            throw new RuntimeException("Tên đăng nhập đã tồn tại");
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));
        user.setUsername(trimmed);
        return userRepository.save(user);
    }

    public User updateAvatar(String username, String avatarDataUrl) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));
        user.setAvatar(avatarDataUrl);
        return userRepository.save(user);
    }

    public void changePassword(String username, String oldPassword, String newPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new RuntimeException("Mật khẩu hiện tại không đúng");
        }
        if (newPassword == null || newPassword.length() < 6) {
            throw new RuntimeException("Mật khẩu mới phải có ít nhất 6 ký tự");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public User linkMaNhanVien(String username, String maNhanVien) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));
        if (user.getMaNhanVien() != null && !user.getMaNhanVien().isBlank()) {
            throw new RuntimeException("Mã nhân viên đã được liên kết, chỉ admin mới có quyền thay đổi");
        }
        user.setMaNhanVien(maNhanVien != null && !maNhanVien.isBlank() ? maNhanVien.trim().toUpperCase() : null);
        return userRepository.save(user);
    }
}
