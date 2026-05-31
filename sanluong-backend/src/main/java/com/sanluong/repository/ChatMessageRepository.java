package com.sanluong.repository;

import com.sanluong.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @Query(value = "SELECT * FROM chat_messages WHERE room = :room ORDER BY sent_at DESC LIMIT 60",
           nativeQuery = true)
    List<ChatMessage> findRecentByRoom(@Param("room") String room);
}
