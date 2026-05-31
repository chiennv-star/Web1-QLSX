package com.sanluong.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages", indexes = {
    @Index(name = "idx_chat_room_sent", columnList = "room, sent_at")
})
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room", length = 50, nullable = false)
    private String room;

    @Column(name = "sender", length = 100, nullable = false)
    private String sender;

    @Column(name = "sender_name", length = 200)
    private String senderName;

    @Column(name = "content", length = 2000, nullable = false)
    private String content;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @PrePersist
    void prePersist() {
        if (sentAt == null) sentAt = LocalDateTime.now();
    }

    public Long getId()                    { return id; }
    public String getRoom()                { return room; }
    public void setRoom(String v)          { this.room = v; }
    public String getSender()              { return sender; }
    public void setSender(String v)        { this.sender = v; }
    public String getSenderName()          { return senderName; }
    public void setSenderName(String v)    { this.senderName = v; }
    public String getContent()             { return content; }
    public void setContent(String v)       { this.content = v; }
    public LocalDateTime getSentAt()       { return sentAt; }
    public void setSentAt(LocalDateTime v) { this.sentAt = v; }
}
