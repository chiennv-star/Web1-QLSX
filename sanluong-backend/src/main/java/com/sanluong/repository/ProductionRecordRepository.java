package com.sanluong.repository;

import com.sanluong.entity.ProductionRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProductionRecordRepository extends JpaRepository<ProductionRecord, Long> {

    @Query("""
        SELECT r FROM ProductionRecord r
        WHERE (:maTp IS NULL OR r.maTp LIKE %:maTp%)
          AND (:maBravo IS NULL OR r.maBravo LIKE %:maBravo%)
          AND (:tienTrinh IS NULL OR r.tienTrinh LIKE %:tienTrinh%)
          AND (:lsx IS NULL OR r.lsx LIKE %:lsx%)
          AND (:trangThai IS NULL OR r.pcTrangThai = :trangThai
                                  OR r.plTrangThai = :trangThai
                                  OR r.dgTrangThai = :trangThai)
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
        WHERE (:maTp IS NULL OR r.maTp LIKE %:maTp%)
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

    @Query("SELECT r FROM ProductionRecord r WHERE r.dgTrangThai = 'doing' OR r.dgTrangThai IS NULL OR r.dgTrangThai = '' ORDER BY r.createdAt DESC")
    List<ProductionRecord> findWipDg();

    @Query("SELECT r FROM ProductionRecord r WHERE r.pcTrangThai = 'doing' OR r.pcTrangThai IS NULL OR r.pcTrangThai = '' ORDER BY r.createdAt DESC")
    List<ProductionRecord> findWipPc();

    @Query("SELECT r FROM ProductionRecord r WHERE r.plTrangThai = 'doing' OR r.plTrangThai IS NULL OR r.plTrangThai = '' ORDER BY r.createdAt DESC")
    List<ProductionRecord> findWipPl();

    @Query("SELECT r FROM ProductionRecord r WHERE r.bbc1TrangThai = 'doing' OR r.bbc1TrangThai IS NULL OR r.bbc1TrangThai = '' ORDER BY r.createdAt DESC")
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
}
