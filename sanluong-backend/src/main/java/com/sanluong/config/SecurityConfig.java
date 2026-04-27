package com.sanluong.config;

import com.sanluong.security.JwtFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    // Stage admin roles (without ROLE_ prefix for hasAnyRole())
    private static final String[] STAGE_ADMIN_ROLES = {
        "ADMIN_PC", "ADMIN_BBC1", "ADMIN_PL", "ADMIN_DG"
    };
    private static final String[] ALL_WRITE_ROLES = {
        "ADMIN", "NHAN_VIEN", "ADMIN_PC", "ADMIN_BBC1", "ADMIN_PL", "ADMIN_DG", "ADMIN_KH"
    };
    private static final String[] ALL_ROLES = {
        "ADMIN", "NHAN_VIEN", "ADMIN_PC", "ADMIN_BBC1", "ADMIN_PL", "ADMIN_DG", "ADMIN_KH"
    };

    public SecurityConfig(JwtFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()

                // ── Sản lượng: ADMIN_KH có toàn quyền như ADMIN ───────────────
                .requestMatchers(HttpMethod.DELETE, "/api/production/**").hasAnyRole("ADMIN", "ADMIN_KH")
                .requestMatchers(HttpMethod.PUT, "/api/production/**").hasAnyRole("ADMIN", "ADMIN_KH")
                .requestMatchers(HttpMethod.POST, "/api/production/**").hasAnyRole("ADMIN", "NHAN_VIEN", "ADMIN_KH")
                .requestMatchers(HttpMethod.GET, "/api/production/**").hasAnyRole(ALL_ROLES)

                // ── Lịch làm việc: stage admins chỉnh sửa đúng công đoạn ──────
                // (controller sẽ kiểm tra congDoan cụ thể)
                .requestMatchers(HttpMethod.DELETE, "/api/work-schedule/**").hasAnyRole("ADMIN", "ADMIN_PC", "ADMIN_BBC1", "ADMIN_PL", "ADMIN_DG")
                .requestMatchers(HttpMethod.PUT, "/api/work-schedule/**").hasAnyRole(ALL_WRITE_ROLES)
                .requestMatchers(HttpMethod.POST, "/api/work-schedule/**").hasAnyRole(ALL_WRITE_ROLES)
                .requestMatchers(HttpMethod.GET, "/api/work-schedule/**").hasAnyRole(ALL_ROLES)

                // ── Danh mục: ADMIN_KH có toàn quyền ─────────────────────────
                .requestMatchers(HttpMethod.GET, "/api/product-master/**").hasAnyRole(ALL_ROLES)
                .requestMatchers("/api/product-master/**").hasAnyRole("ADMIN", "ADMIN_KH")

                // ── Duyệt sản lượng: tất cả tạo, chỉ ADMIN duyệt ────────────
                .requestMatchers(HttpMethod.POST, "/api/sl-change-request").hasAnyRole(ALL_WRITE_ROLES)
                .requestMatchers(HttpMethod.GET, "/api/sl-change-request/for-schedule/**").hasAnyRole(ALL_ROLES)
                .requestMatchers("/api/sl-change-request/**").hasRole("ADMIN")

                // ── Kế hoạch sản xuất xưởng: chỉ ADMIN tạo/sửa/xóa ─────────
                .requestMatchers(HttpMethod.GET, "/api/factory-plan/**").hasAnyRole(ALL_ROLES)
                .requestMatchers("/api/factory-plan/**").hasRole("ADMIN")

                // ── Hàng lỗi: tất cả xem, chỉ ADMIN/ADMIN_PL/ADMIN_DG thêm/sửa/xóa ─
                .requestMatchers(HttpMethod.GET, "/api/hang-loi/**").hasAnyRole(ALL_ROLES)
                .requestMatchers("/api/hang-loi/**").hasAnyRole("ADMIN", "ADMIN_PL", "ADMIN_DG")

                // ── Quản lý người dùng: chỉ ADMIN ─────────────────────────────
                .requestMatchers("/api/users/**").hasRole("ADMIN")

                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173", "http://localhost:3000"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
