package com.sanluong.repository;

import com.sanluong.entity.ProductionRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

public interface ProductionRecordRepository extends JpaRepository<ProductionRecord, Long> {

    @Query("SELECT r FROM ProductionRecord r WHERE r.deletedAt IS NOT NULL ORDER BY r.deletedAt DESC")
    List<ProductionRecord> findAllDeleted();

    @Query("""
        SELECT r FROM ProductionRecord r
        WHERE r.deletedAt IS NULL
          AND (r.hidden IS NULL OR r.hidden = false)
          AND (:maTp IS NULL OR r.maTp LIKE %:maTp%)
          AND (:maBravo IS NULL OR r.maBravo LIKE %:maBravo%)
          AND (:tienTrinh IS NULL OR r.tienTrinh LIKE %:tienTrinh%)
          AND (:lsx IS NULL OR r.lsx LIKE %:lsx%)
          AND (:trangThai IS NULL OR r.pcTrangThai = :trangThai
                                  OR r.plTrangThai = :trangThai
                                  OR r.dgTrangThai = :trangThai)
        ORDER BY
          SUBSTRING(r.lsx, 5, 2) DESC,
          SUBSTRING(r.lsx, 3, 2) DESC,
          SUBSTRING(r.lsx, 1, 2) DESC,
          r.createdAt DESC
        """)
    Page<ProductionRecord> search(
            @Param("maTp") String maTp,
            @Param("maBravo") String maBravo,
            @Param("tienTrinh") String tienTrinh,
            @Param("lsx") String lsx,
            @Param("trangThai") String trangThai,
            Pageable pageable
    );

    @Query("""
        SELECT r FROM ProductionRecord r
        WHERE r.deletedAt IS NULL
          AND (r.hidden IS NULL OR r.hidden = false)
          AND (:maTp IS NULL OR r.maTp LIKE %:maTp%)
          AND (:maBravo IS NULL OR r.maBravo LIKE %:maBravo%)
          AND (:tienTrinh IS NULL OR r.tienTrinh LIKE %:tienTrinh%)
          AND (:lsx IS NULL OR r.lsx LIKE %:lsx%)
          AND (:trangThai IS NULL OR r.pcTrangThai = :trangThai
                                  OR r.plTrangThai = :trangThai
                                  OR r.dgTrangThai = :trangThai)
        """)
    List<ProductionRecord> searchAll(
            @Param("maTp") String maTp,
            @Param("maBravo") String maBravo,
            @Param("tienTrinh") String tienTrinh,
            @Param("lsx") String lsx,
            @Param("trangThai") String trangThai
    );

    @Query("SELECT r FROM ProductionRecord r WHERE r.deletedAt IS NULL AND (r.hidden IS NULL OR r.hidden = false) AND (r.dgTrangThai = 'doing' OR r.dgTrangThai IS NULL OR r.dgTrangThai = '') ORDER BY r.createdAt DESC")
    List<ProductionRecord> findWipDg();

    @Query("SELECT r FROM ProductionRecord r WHERE r.deletedAt IS NULL AND (r.hidden IS NULL OR r.hidden = false) AND (r.pcTrangThai = 'doing' OR r.pcTrangThai IS NULL OR r.pcTrangThai = '') ORDER BY r.createdAt DESC")
    List<ProductionRecord> findWipPc();

    @Query("SELECT r FROM ProductionRecord r WHERE r.deletedAt IS NULL AND (r.hidden IS NULL OR r.hidden = false) AND (r.plTrangThai = 'doing' OR r.plTrangThai IS NULL OR r.plTrangThai = '') ORDER BY r.createdAt DESC")
    List<ProductionRecord> findWipPl();

    @Query("SELECT r FROM ProductionRecord r WHERE r.deletedAt IS NULL AND (r.hidden IS NULL OR r.hidden = false) AND (r.bbc1TrangThai = 'doing' OR r.bbc1TrangThai IS NULL OR r.bbc1TrangThai = '') ORDER BY r.createdAt DESC")
    List<ProductionRecord> findWipBbc1();

    @Query("""
        SELECT r FROM ProductionRecord r
        WHERE r.maTp = :maTp
          AND (:tienTrinh IS NULL OR r.tienTrinh = :tienTrinh)
          AND (:lsx IS NULL OR r.lsx = :lsx)
        """)
    List<ProductionRecord> findByTriplet(
            @Param("maTp") String maTp,
            @Param("tienTrinh") String tienTrinh,
            @Param("lsx") String lsx
    );

    @Query("""
        SELECT r FROM ProductionRecord r
        WHERE r.maBravo = :maBravo
          AND (:tienTrinh IS NULL OR r.tienTrinh = :tienTrinh)
          AND (:lsx IS NULL OR r.lsx = :lsx)
        ORDER BY r.id DESC
        """)
    List<ProductionRecord> findByMaBravoAndTienTrinhAndLsx(
            @Param("maBravo")    String maBravo,
            @Param("tienTrinh")  String tienTrinh,
            @Param("lsx")        String lsx
    );

    @Query("""
        SELECT COUNT(r) > 0 FROM ProductionRecord r
        WHERE r.maTp = :maTp
          AND (:tienTrinh IS NULL OR r.tienTrinh = :tienTrinh)
          AND (:lsx IS NULL OR r.lsx = :lsx)
          AND r.soLuong = :soLuong
        """)
    boolean existsByTripletAndSoLuong(
            @Param("maTp") String maTp,
            @Param("tienTrinh") String tienTrinh,
            @Param("lsx") String lsx,
            @Param("soLuong") Integer soLuong
    );

    @Query("SELECT COUNT(r) > 0 FROM ProductionRecord r WHERE r.maBravo = :maBravo AND r.lsx = :lsx AND r.deletedAt IS NULL")
    boolean existsByMaBravoAndLsx(@Param("maBravo") String maBravo, @Param("lsx") String lsx);

    @Query("""
        SELECT r FROM ProductionRecord r
        WHERE r.maBravo = :maBravo
          AND r.lsx = :lsx
          AND (:maDonHang IS NULL AND r.maDonHang IS NULL OR r.maDonHang = :maDonHang)
          AND r.deletedAt IS NULL
        ORDER BY r.id DESC
        """)
    List<ProductionRecord> findByLenhKey(
            @Param("maBravo") String maBravo,
            @Param("lsx") String lsx,
            @Param("maDonHang") String maDonHang);

    @Query("""
        SELECT COUNT(r) > 0 FROM ProductionRecord r
        WHERE r.maBravo = :maBravo
          AND r.lsx = :lsx
          AND (:maDonHang IS NULL AND r.maDonHang IS NULL OR r.maDonHang = :maDonHang)
          AND r.deletedAt IS NULL
        """)
    boolean existsByMaBravoAndLsxAndMaDonHang(
            @Param("maBravo") String maBravo,
            @Param("lsx") String lsx,
            @Param("maDonHang") String maDonHang);

    /** Trả về tập hợp lsx tồn tại từ danh sách cho trước (dùng để đánh dấu hasLsx) */
    @Query("SELECT DISTINCT r.lsx FROM ProductionRecord r WHERE r.lsx IN :lsxList AND r.deletedAt IS NULL")
    List<String> findExistingLsx(@Param("lsxList") List<String> lsxList);

    // Đếm bản ghi sản lượng bị ảnh hưởng khi đổi lô (native SQL)
    @Query(value = "SELECT COUNT(*) FROM production_records WHERE ma_don_hang = :maDonHang AND lsx = :lsx AND deleted_at IS NULL", nativeQuery = true)
    long countByMaDonHangAndLsxNative(@Param("maDonHang") String maDonHang, @Param("lsx") String lsx);

    @Query(value = "SELECT COUNT(*) FROM production_records WHERE (phat_lenh = false OR phat_lenh IS NULL) AND deleted_at IS NULL", nativeQuery = true)
    long countChuaPhatLenhNative();

    // Danh sách chưa phát lệnh (phatLenh = false / null)
    @Query("""
        SELECT r FROM ProductionRecord r
        WHERE (r.phatLenh IS NULL OR r.phatLenh = false)
          AND r.deletedAt IS NULL
          AND (r.hidden IS NULL OR r.hidden = false)
        ORDER BY r.createdAt DESC
        """)
    List<ProductionRecord> findChuaPhatLenhList();

    // Đã phát lệnh nhưng chưa có WorkSchedule cùng maDonHang → chờ xếp lịch
    @Query("""
        SELECT r FROM ProductionRecord r
        WHERE r.phatLenh = true
          AND r.deletedAt IS NULL
          AND (r.hidden IS NULL OR r.hidden = false)
          AND r.maDonHang IS NOT NULL
          AND r.maDonHang NOT IN (
              SELECT DISTINCT ws.maDonHang FROM WorkSchedule ws
              WHERE ws.maDonHang IS NOT NULL AND ws.deletedAt IS NULL
          )
        ORDER BY r.createdAt DESC
        """)
    List<ProductionRecord> findDaPhatChuaXepLich();

    // Cascade update lsx trên sản lượng khi đổi lô từ Lệnh SX (native SQL)
    @Modifying
    @Transactional
    @Query(value = "UPDATE production_records SET lsx = :lsxMoi WHERE ma_don_hang = :maDonHang AND lsx = :lsxCu AND deleted_at IS NULL", nativeQuery = true)
    int updateLsxByMaDonHangNative(
            @Param("maDonHang") String maDonHang,
            @Param("lsxCu") String lsxCu,
            @Param("lsxMoi") String lsxMoi);

    // Cập nhật soLuong + tienTrinh + maTp + maDonHang khi Lệnh SX được sửa
    // oldMaDonHang dùng trong WHERE (key cũ), newMaDonHang set vào bản ghi
    @Modifying
    @Transactional
    @Query("""
        UPDATE ProductionRecord r SET
          r.soLuong   = :soLuong,
          r.tienTrinh = :tienTrinh,
          r.maTp      = :maTp,
          r.maDonHang = :newMaDonHang,
          r.updatedBy = :username
        WHERE r.maBravo = :maBravo
          AND r.lsx = :lsx
          AND (:oldMaDonHang IS NULL AND r.maDonHang IS NULL OR r.maDonHang = :oldMaDonHang)
          AND r.deletedAt IS NULL
        """)
    int updateByLenhKey(
            @Param("maBravo")      String maBravo,
            @Param("lsx")          String lsx,
            @Param("oldMaDonHang") String oldMaDonHang,
            @Param("soLuong")      Integer soLuong,
            @Param("tienTrinh")    String tienTrinh,
            @Param("maTp")         String maTp,
            @Param("newMaDonHang") String newMaDonHang,
            @Param("username")     String username);

    // Soft-delete Sản Lượng khi Lệnh SX bị xóa
    @Modifying
    @Transactional
    @Query("""
        UPDATE ProductionRecord r SET
          r.deletedAt = :now,
          r.deletedBy = :username
        WHERE r.maBravo = :maBravo
          AND r.lsx = :lsx
          AND (:maDonHang IS NULL AND r.maDonHang IS NULL OR r.maDonHang = :maDonHang)
          AND r.deletedAt IS NULL
        """)
    int softDeleteByLenhKey(
            @Param("maBravo")   String maBravo,
            @Param("lsx")       String lsx,
            @Param("maDonHang") String maDonHang,
            @Param("now")       LocalDateTime now,
            @Param("username")  String username);

    /** Danh sách bản ghi có tpNhapKho, lọc theo ngayXuatKho nếu cung cấp */
    @Query("""
        SELECT r FROM ProductionRecord r
        WHERE r.deletedAt IS NULL
          AND (r.hidden IS NULL OR r.hidden = false)
          AND r.tpNhapKho IS NOT NULL
          AND (:fromDate IS NULL OR r.ngayXuatKho IS NULL OR r.ngayXuatKho >= :fromDate)
          AND (:toDate   IS NULL OR r.ngayXuatKho IS NULL OR r.ngayXuatKho <= :toDate)
        ORDER BY r.ngayXuatKho DESC NULLS LAST, r.id DESC
        """)
    List<ProductionRecord> findNhapKho(
            @Param("fromDate") java.time.LocalDate fromDate,
            @Param("toDate")   java.time.LocalDate toDate);
}
