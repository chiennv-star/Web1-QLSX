package com.sanluong.controller;

import com.sanluong.dto.UserDto;
import com.sanluong.entity.User;
import com.sanluong.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<User>> getAll() {
        return ResponseEntity.ok(userService.getAll());
    }

    @PostMapping
    public ResponseEntity<User> create(@Valid @RequestBody UserDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> update(@PathVariable Long id, @Valid @RequestBody UserDto dto) {
        return ResponseEntity.ok(userService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/me/change-username")
    public ResponseEntity<Map<String, String>> changeUsername(
            Principal principal,
            @RequestBody Map<String, String> body) {
        try {
            userService.changeUsername(principal.getName(), body.get("newUsername"));
            return ResponseEntity.ok(Map.of("message", "Đổi tên đăng nhập thành công"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/me/avatar")
    public ResponseEntity<Map<String, String>> updateAvatar(
            Principal principal,
            @RequestBody Map<String, String> body) {
        try {
            userService.updateAvatar(principal.getName(), body.get("avatar"));
            return ResponseEntity.ok(Map.of("message", "Cập nhật ảnh thành công"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/me/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            Principal principal,
            @RequestBody Map<String, String> body) {
        try {
            userService.changePassword(
                    principal.getName(),
                    body.get("oldPassword"),
                    body.get("newPassword")
            );
            return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/me/ma-nhan-vien")
    public ResponseEntity<Map<String, String>> linkMaNhanVien(
            Principal principal,
            @RequestBody Map<String, String> body) {
        try {
            String maNhanVien = body.get("maNhanVien");
            User updated = userService.linkMaNhanVien(principal.getName(), maNhanVien);
            return ResponseEntity.ok(Map.of("maNhanVien", updated.getMaNhanVien() != null ? updated.getMaNhanVien() : ""));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
