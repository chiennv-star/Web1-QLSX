-- Tạo bảng lenh_san_xuat (chạy nếu backend chưa tự tạo)
CREATE TABLE IF NOT EXISTS lenh_san_xuat (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    thu_tu              INT,
    ma_bravo            VARCHAR(50),
    ma_sp               VARCHAR(50),
    ten_san_pham        VARCHAR(500),
    so_lo               VARCHAR(50),
    so_luong            DECIMAL(12, 2),
    tinh_trang          VARCHAR(20),
    phong_thuc_hien     VARCHAR(100),
    ngay_thuc_hien      DATE,
    to_thuc_hien        VARCHAR(50),
    so_nguoi_thuc_hien  INT,
    chu_y               VARCHAR(500),
    da_len_lich_lam     TINYINT(1) DEFAULT 0,
    ghi_chu             VARCHAR(1000),
    da_dg_va_xep_lich_dg TINYINT(1) DEFAULT 0,
    created_at          DATETIME,
    updated_at          DATETIME,
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
