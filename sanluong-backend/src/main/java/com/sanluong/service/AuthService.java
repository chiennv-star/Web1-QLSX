package com.sanluong.service;

import com.sanluong.dto.LoginRequest;
import com.sanluong.dto.LoginResponse;
import com.sanluong.entity.User;
import com.sanluong.repository.EmployeeRepository;
import com.sanluong.repository.UserRepository;
import com.sanluong.security.JwtUtil;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final JwtUtil jwtUtil;

    public AuthService(AuthenticationManager authenticationManager,
                       UserRepository userRepository,
                       EmployeeRepository employeeRepository,
                       JwtUtil jwtUtil) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.employeeRepository = employeeRepository;
        this.jwtUtil = jwtUtil;
    }

    public LoginResponse login(LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        String username = auth.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        String token = jwtUtil.generateToken(username, user.getRole().name());

        String maNhanVien = user.getMaNhanVien();
        String toNhom = null;
        if (maNhanVien != null && !maNhanVien.isBlank()) {
            toNhom = employeeRepository.findByMaNhanVien(maNhanVien)
                    .map(e -> e.getToNhom()).orElse(null);
        }
        return new LoginResponse(token, username, user.getFullName(), user.getRole().name(), maNhanVien, toNhom, user.getAvatar());
    }
}
