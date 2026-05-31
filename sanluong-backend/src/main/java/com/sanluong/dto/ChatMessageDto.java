package com.sanluong.dto;

import java.time.LocalDateTime;

public class ChatMessageDto {

    private Long id;
    private String room;
    private String sender;
    private String senderName;
    private String content;
    private LocalDateTime sentAt;
    private String type; // "CHAT" | "JOIN" | "LEAVE"

    public ChatMessageDto() {}

    public Long getId()                    { return id; }
    public void setId(Long v)              { this.id = v; }
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
    public String getType()                { return type; }
    public void setType(String v)          { this.type = v; }
}
