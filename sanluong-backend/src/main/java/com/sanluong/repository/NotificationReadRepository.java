package com.sanluong.repository;

import com.sanluong.entity.NotificationRead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

public interface NotificationReadRepository extends JpaRepository<NotificationRead, Long> {

    boolean existsByNotificationIdAndUsername(Long notificationId, String username);

    List<NotificationRead> findByUsername(String username);

    @Query("SELECT r.notificationId FROM NotificationRead r WHERE r.username = :username")
    Set<Long> findReadIdsByUsername(@Param("username") String username);

    @Modifying
    @Transactional
    @Query("DELETE FROM NotificationRead r WHERE r.username = :username")
    void deleteAllByUsername(@Param("username") String username);

    @Modifying
    @Transactional
    @Query("DELETE FROM NotificationRead r WHERE r.notificationId IN :ids")
    void deleteByNotificationIdIn(@Param("ids") List<Long> ids);
}
