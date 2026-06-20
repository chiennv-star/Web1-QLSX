package com.sanluong.repository;

import com.sanluong.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @Query("SELECT n FROM Notification n ORDER BY n.createdAt DESC")
    List<Notification> findAllOrderByCreatedAtDesc();

    @Query("SELECT n FROM Notification n ORDER BY n.createdAt DESC")
    Page<Notification> findAllOrderByCreatedAtDesc(Pageable pageable);

    // Count unread for a specific user
    @Query("""
        SELECT COUNT(n) FROM Notification n
        WHERE n.id NOT IN (
            SELECT r.notificationId FROM NotificationRead r WHERE r.username = :username
        )
    """)
    long countUnreadForUser(@Param("username") String username);

    // Check if a notification of given type already exists after a timestamp
    boolean existsByTypeAndCreatedAtAfter(String type, LocalDateTime after);

    // Delete all notifications of a given type
    void deleteAllByType(String type);
}
