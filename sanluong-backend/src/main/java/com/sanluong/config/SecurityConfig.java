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
        "ADMIN_PC", "ADMIN_BBC1", "ADMIN_PL", "ADMIN_DG",
        "ADMIN_PCPL1", "ADMIN_PCPL2", "ADMIN_PCPL3"
    };
    // TKSX: tương đương ADMIN (trừ write lenh-san-xuat)
    // QUAN_DOC: chỉ đọc (GET), không write
    private static final String[] ALL_WRITE_ROLES = {
        "ADMIN", "TKSX", "NHAN_VIEN", "ADMIN_PC", "ADMIN_BBC1", "ADMIN_PL", "ADMIN_DG", "ADMIN_KH",
        "ADMIN_PCPL1", "ADMIN_PCPL2", "ADMIN_PCPL3"
    };
    private static final String[] ALL_ROLES = {
        "ADMIN", "TKSX", "QUAN_DOC", "NHAN_VIEN", "ADMIN_PC", "ADMIN_BBC1", "ADMIN_PL", "ADMIN_DG", "ADMIN_KH",
        "ADMIN_PCPL1", "ADMIN_PCPL2", "ADMIN_PCPL3"
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
                .requestMatchers("/ws/**").permitAll()

                // ── Sản lượng: ADMIN_KH có toàn quyền như ADMIN ───────────────
                .requestMatchers(HttpMethod.DELETE, "/api/production/**").hasAnyRole("ADMIN", "TKSX", "ADMIN_KH")
                .requestMatchers(HttpMethod.PUT, "/api/production/**").hasAnyRole("ADMIN", "TKSX", "ADMIN_KH")
                .requestMatchers(HttpMethod.POST, "/api/production/**").hasAnyRole("ADMIN", "TKSX", "NHAN_VIEN", "ADMIN_KH")
                .requestMatchers(HttpMethod.GET, "/api/production/**").hasAnyRole(ALL_ROLES)

                // ── Lịch làm việc: stage admins chỉnh sửa đúng công đoạn ──────
                // (controller sẽ kiểm tra congDoan cụ thể)
                .requestMatchers(HttpMethod.DELETE, "/api/work-schedule/**").hasAnyRole("ADMIN", "TKSX", "ADMIN_KH", "ADMIN_PC", "ADMIN_BBC1", "ADMIN_PL", "ADMIN_DG", "ADMIN_PCPL1", "ADMIN_PCPL2", "ADMIN_PCPL3")
                .requestMatchers(HttpMethod.PATCH, "/api/work-schedule/**").hasAnyRole(ALL_WRITE_ROLES)
                .requestMatchers(HttpMethod.PUT, "/api/work-schedule/**").hasAnyRole(ALL_WRITE_ROLES)
                .requestMatchers(HttpMethod.POST, "/api/work-schedule/**").hasAnyRole(ALL_WRITE_ROLES)
                .requestMatchers(HttpMethod.GET, "/api/work-schedule/**").hasAnyRole(ALL_ROLES)

                // ── Danh mục: ADMIN_KH có toàn quyền ─────────────────────────
                .requestMatchers(HttpMethod.GET, "/api/product-master/**").hasAnyRole(ALL_ROLES)
                .requestMatchers("/api/product-master/**").hasAnyRole("ADMIN", "TKSX", "ADMIN_KH", "ADMIN_PC", "ADMIN_BBC1", "ADMIN_PL", "ADMIN_DG", "ADMIN_PCPL1", "ADMIN_PCPL2", "ADMIN_PCPL3")

                // ── Duyệt sản lượng: tất cả tạo, ADMIN + ADMIN_KH duyệt ─────
                .requestMatchers(HttpMethod.POST, "/api/sl-change-request").hasAnyRole(ALL_WRITE_ROLES)
                .requestMatchers(HttpMethod.GET, "/api/sl-change-request/for-schedule/**").hasAnyRole(ALL_ROLES)
                .requestMatchers(HttpMethod.GET, "/api/sl-change-request/pending").hasAnyRole("ADMIN", "TKSX", "ADMIN_KH")
                .requestMatchers(HttpMethod.PUT, "/api/sl-change-request/*/approve").hasAnyRole("ADMIN", "TKSX", "ADMIN_KH")
                .requestMatchers(HttpMethod.PUT, "/api/sl-change-request/*/reject").hasAnyRole("ADMIN", "TKSX", "ADMIN_KH")
                .requestMatchers("/api/sl-change-request/**").hasAnyRole("ADMIN", "TKSX")

                // ── Lệnh sản xuất: tất cả xem, ADMIN/ADMIN_KH sửa ─────────
                .requestMatchers(HttpMethod.GET, "/api/lenh-san-xuat/**").hasAnyRole(ALL_ROLES)
                .requestMatchers("/api/lenh-san-xuat/**").hasAnyRole("ADMIN", "ADMIN_KH")

                // ── Đơn hàng: tất cả xem, ADMIN/TKSX/ADMIN_KH sửa ───────────────
                .requestMatchers(HttpMethod.GET, "/api/don-hang/**").hasAnyRole(ALL_ROLES)
                .requestMatchers("/api/don-hang/**").hasAnyRole("ADMIN", "TKSX", "ADMIN_KH")

                // ── Kế hoạch sản xuất xưởng: ADMIN và TKSX tạo/sửa/xóa ──────
                .requestMatchers(HttpMethod.GET, "/api/factory-plan/**").hasAnyRole(ALL_ROLES)
                .requestMatchers("/api/factory-plan/**").hasAnyRole("ADMIN", "TKSX")

                // ── Hàng lỗi: tất cả xem, tất cả ADMIN_* + TKSX sửa ─────────────
                .requestMatchers(HttpMethod.GET, "/api/hang-loi/**").hasAnyRole(ALL_ROLES)
                .requestMatchers("/api/hang-loi/**").hasAnyRole(
                    "ADMIN", "TKSX",
                    "ADMIN_KH", "ADMIN_PC", "ADMIN_BBC1",
                    "ADMIN_PL", "ADMIN_DG",
                    "ADMIN_PCPL1", "ADMIN_PCPL2", "ADMIN_PCPL3"
                )

                // ── Nhân sự: tất cả xem, ADMIN + TKSX + ADMIN_KH thêm/sửa/xóa ──
                .requestMatchers(HttpMethod.GET, "/api/employees/**").hasAnyRole(ALL_ROLES)
                .requestMatchers("/api/employees/**").hasAnyRole("ADMIN", "TKSX", "ADMIN_KH")

                // ── Hiệu quả công việc: tất cả xem, ADMIN và TKSX cập nhật ───
                .requestMatchers(HttpMethod.GET, "/api/work-efficiency/**").hasAnyRole(ALL_ROLES)
                .requestMatchers("/api/work-efficiency/**").hasAnyRole("ADMIN", "TKSX")

                // ── Chấm công: tất cả xem ──────────────────────────────────────
                .requestMatchers(HttpMethod.GET, "/api/attendance/**").hasAnyRole(ALL_ROLES)

                // ── Quản lý người dùng: ADMIN và TKSX ─────────────────────────
                .requestMatchers(HttpMethod.PATCH, "/api/users/me/ma-nhan-vien").hasAnyRole(ALL_ROLES)
                .requestMatchers("/api/users/**").hasAnyRole("ADMIN", "TKSX")

                // ── Chat realtime ─────────────────────────────────────────────
                .requestMatchers("/api/chat/**").hasAnyRole(ALL_ROLES)

                // ── Thông báo: tất cả xem, tất cả đánh dấu đã đọc ────────────
                .requestMatchers("/api/notifications/**").hasAnyRole(ALL_ROLES)

                // ── Phòng thực hiện: tất cả xem, ADMIN + TKSX thêm/sửa/xóa ──
                .requestMatchers(HttpMethod.GET, "/api/phong-thuc-hien/**").hasAnyRole(ALL_ROLES)
                .requestMatchers("/api/phong-thuc-hien/**").hasAnyRole("ADMIN", "TKSX")

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
        config.setAllowedOriginPatterns(List.of("http://localhost:5173", "http://localhost:3000", "http://192.168.*.*:5173", "http://10.*.*.*:5173"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
