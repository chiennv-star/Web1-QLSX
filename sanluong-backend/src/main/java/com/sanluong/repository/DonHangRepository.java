package com.sanluong.repository;

import com.sanluong.entity.DonHang;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DonHangRepository extends JpaRepository<DonHang, Long> {

    /** Chỉ lấy đơn hàng đã duyệt (APPROVED hoặc null = dữ liệu cũ trước khi có trangThaiDuyet) */
    @Query("SELECT d FROM DonHang d WHERE d.deletedAt IS NULL " +
           "AND (d.trangThaiDuyet = 'APPROVED' OR d.trangThaiDuyet IS NULL) " +
           "ORDER BY d.thuTu ASC, d.createdAt DESC")
    List<DonHang> findAllActive();

    @Query("SELECT d FROM DonHang d WHERE " +
           "d.deletedAt IS NULL AND " +
           "(d.trangThaiDuyet = 'APPROVED' OR d.trangThaiDuyet IS NULL) AND " +
           "(:tinhTrangDatHang IS NULL OR d.tinhTrangDatHang = :tinhTrangDatHang) AND " +
           "(:tinhTrangSx      IS NULL OR d.tinhTrangSx      = :tinhTrangSx) " +
           "ORDER BY d.thuTu ASC, d.createdAt DESC")
    List<DonHang> findFiltered(
            @Param("tinhTrangDatHang") String tinhTrangDatHang,
            @Param("tinhTrangSx")      String tinhTrangSx);

    /** Danh sách đơn hàng chờ duyệt */
    @Query("SELECT d FROM DonHang d WHERE d.deletedAt IS NULL AND d.trangThaiDuyet = 'PENDING' " +
           "ORDER BY d.createdAt DESC")
    List<DonHang> findAllPending();

    @Query("SELECT COALESCE(MAX(d.thuTu), 0) FROM DonHang d WHERE d.deletedAt IS NULL")
    Integer findMaxThuTu();

    @Query("SELECT d FROM DonHang d WHERE d.deletedAt IS NOT NULL ORDER BY d.deletedAt DESC")
    List<DonHang> findAllDeleted();

    /** Tổng coLo từ work_schedule source=PLAN cho maSp này */
    @Query(value = "SELECT COALESCE(SUM(ws.co_lo), 0) FROM work_schedule ws " +
                   "WHERE ws.source = 'PLAN' AND ws.ma_sp = :maSp",
           nativeQuery = true)
    java.math.BigDecimal sumCoLoByMaSp(@Param("maSp") String maSp);

    @Query("SELECT d FROM DonHang d WHERE d.deletedAt IS NULL " +
           "AND (d.trangThaiDuyet = 'APPROVED' OR d.trangThaiDuyet IS NULL) " +
           "AND d.maBravo = :maBravo " +
           "ORDER BY d.ngayDatHang ASC NULLS LAST, d.createdAt ASC")
    List<DonHang> findByMaBravo(@Param("maBravo") String maBravo);

    Optional<DonHang> findByMaBravoAndMaDonHang(String maBravo, String maDonHang);

    Optional<DonHang> findTopByMaDonHangAndDeletedAtIsNull(String maDonHang);

    boolean existsByMaBravoAndDeletedAtIsNull(String maBravo);

    boolean existsByMaBravoAndMaDonHangAndSoLuongDatHangAndDeletedAtIsNull(
            String maBravo, String maDonHang, java.math.BigDecimal soLuongDatHang);

    /** Tổng coLo từ PLAN theo maBravo + maDonHang */
    @Query(value = "SELECT COALESCE(SUM(ws.co_lo), 0) FROM work_schedule ws " +
                   "WHERE ws.source = 'PLAN' AND ws.ma_bravo = :maBravo AND ws.ma_don_hang = :maDonHang",
           nativeQuery = true)
    java.math.BigDecimal sumCoLoByMaBravoAndMaDonHang(@Param("maBravo") String maBravo,
                                                       @Param("maDonHang") String maDonHang);

    /** Ngày thực hiện sớm nhất từ PLAN theo maBravo + maDonHang */
    @Query(value = "SELECT MIN(ws.ngay_thuc_hien) FROM work_schedule ws " +
                   "WHERE ws.source = 'PLAN' AND ws.ma_bravo = :maBravo AND ws.ma_don_hang = :maDonHang",
           nativeQuery = true)
    LocalDate findEarliestNgayThucHien(@Param("maBravo") String maBravo,
                                        @Param("maDonHang") String maDonHang);
}
