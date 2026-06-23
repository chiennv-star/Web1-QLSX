package com.sanluong.repository;

import com.sanluong.entity.LenhSanXuat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface LenhSanXuatRepository extends JpaRepository<LenhSanXuat, Long> {

    // Tìm bản ghi Lệnh SX trùng key (maBravo + maDonHang + ngày + tổ + soLo)
    // Dùng để tránh tạo duplicate khi syncAllLenhForDH chạy song song
    @Query("""
        SELECT l FROM LenhSanXuat l
        WHERE l.deletedAt IS NULL
          AND l.maBravo = :maBravo
          AND ((:maDonHang IS NULL AND l.maDonHang IS NULL) OR l.maDonHang = :maDonHang)
          AND l.ngayThucHien = :ngay
          AND ((:toThucHien IS NULL AND l.toThucHien IS NULL) OR l.toThucHien = :toThucHien)
          AND ((:soLo IS NULL AND l.soLo IS NULL) OR l.soLo = :soLo)
        ORDER BY l.id ASC
        """)
    Optional<LenhSanXuat> findExistingKey(
            @org.springframework.data.repository.query.Param("maBravo")    String maBravo,
            @org.springframework.data.repository.query.Param("maDonHang")  String maDonHang,
            @org.springframework.data.repository.query.Param("ngay")       LocalDate ngay,
            @org.springframework.data.repository.query.Param("toThucHien") String toThucHien,
            @org.springframework.data.repository.query.Param("soLo")       String soLo
    );

    @Query("SELECT l FROM LenhSanXuat l WHERE l.deletedAt IS NULL ORDER BY l.thuTu ASC, l.createdAt DESC")
    List<LenhSanXuat> findAllByOrderByThuTuAscCreatedAtDesc();

    @Query("SELECT l FROM LenhSanXuat l WHERE " +
           "l.deletedAt IS NULL AND " +
           "(:tinhTrang IS NULL OR l.tinhTrang = :tinhTrang) AND " +
           "(:toThucHien IS NULL OR l.toThucHien = :toThucHien) AND " +
           "(:fromDate IS NULL OR l.ngayPhatLenh >= :fromDate) AND " +
           "(:toDate IS NULL OR l.ngayPhatLenh <= :toDate) " +
           "ORDER BY l.thuTu ASC, l.createdAt DESC")
    List<LenhSanXuat> findFiltered(
            @org.springframework.data.repository.query.Param("tinhTrang")  String tinhTrang,
            @org.springframework.data.repository.query.Param("toThucHien") String toThucHien,
            @org.springframework.data.repository.query.Param("fromDate")   java.time.LocalDate fromDate,
            @org.springframework.data.repository.query.Param("toDate")     java.time.LocalDate toDate
    );

    @Query("SELECT COALESCE(MAX(l.thuTu), 0) FROM LenhSanXuat l WHERE l.deletedAt IS NULL")
    Integer findMaxThuTu();

    // Tìm lệnh theo maBravo + soLo — dùng khi phát lệnh để lấy toThucHien
    @Query("""
        SELECT l FROM LenhSanXuat l
        WHERE l.deletedAt IS NULL
          AND l.maBravo = :maBravo
          AND ((:soLo IS NULL AND l.soLo IS NULL) OR l.soLo = :soLo)
        ORDER BY l.id DESC
        """)
    java.util.Optional<LenhSanXuat> findFirstByMaBravoAndSoLo(
            @org.springframework.data.repository.query.Param("maBravo") String maBravo,
            @org.springframework.data.repository.query.Param("soLo")    String soLo
    );

    @Query("SELECT l FROM LenhSanXuat l WHERE l.deletedAt IS NULL AND l.maBravo = :maBravo ORDER BY l.ngayThucHien ASC NULLS LAST, l.createdAt ASC")
    List<LenhSanXuat> findByMaBravo(@org.springframework.data.repository.query.Param("maBravo") String maBravo);

    @Query("SELECT l FROM LenhSanXuat l WHERE l.deletedAt IS NOT NULL ORDER BY l.deletedAt DESC")
    List<LenhSanXuat> findAllDeleted();

    @Query(value = """
        SELECT
            l.ma_bravo,
            COUNT(l.id)                                            AS so_lo_count,
            COALESCE(SUM(l.so_luong), 0)                          AS tong_so_luong,
            MAX(l.ngay_thuc_hien)                                  AS ngay_gan_nhat,
            EXISTS (
                SELECT 1 FROM work_schedule w
                WHERE w.ma_bravo = l.ma_bravo
                  AND w.tinh_trang = 'doing'
                  AND w.deleted_at IS NULL
            )                                                      AS dang_san_xuat
        FROM lenh_san_xuat l
        WHERE l.deleted_at IS NULL
          AND YEAR(COALESCE(l.ngay_thuc_hien, l.ngay_phat_lenh, l.created_at)) = :year
        GROUP BY l.ma_bravo
        """, nativeQuery = true)
    List<Object[]> findStatsByProductYear(@org.springframework.data.repository.query.Param("year") int year);

    // Đếm lệnh đã ban hành nhưng chưa có WorkSchedule nào khớp (thiếu lịch SX)
    @Query(value = """
        SELECT COUNT(DISTINCT l.id)
        FROM lenh_san_xuat l
        WHERE l.deleted_at IS NULL
          AND l.da_ban_hanh = true
          AND l.ma_bravo IS NOT NULL
          AND l.so_lo IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM work_schedule w
              WHERE (w.source = 'SCHEDULE' OR w.source IS NULL)
                AND w.ma_bravo = l.ma_bravo
                AND w.so_lo = l.so_lo
                AND w.deleted_at IS NULL
          )
        """, nativeQuery = true)
    int countMissingLichSX();

}
