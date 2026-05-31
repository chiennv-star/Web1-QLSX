package com.sanluong.controller;

import com.sanluong.dto.ChatMessageDto;
import com.sanluong.entity.ChatMessage;
import com.sanluong.entity.User;
import com.sanluong.repository.ChatMessageRepository;
import com.sanluong.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Controller
public class ChatController {

    private final ChatMessageRepository repo;
    private final UserRepository userRepo;

    // Theo dõi người dùng online: username → fullName
    private final Set<String> onlineUsernames = ConcurrentHashMap.newKeySet();

    public ChatController(ChatMessageRepository repo, UserRepository userRepo) {
        this.repo    = repo;
        this.userRepo = userRepo;
    }

    // ── WebSocket: gửi tin nhắn ──────────────────────────────────────────────
    @MessageMapping("/chat/send/{room}")
    @SendTo("/topic/chat/{room}")
    public ChatMessageDto sendMessage(
            @DestinationVariable String room,
            ChatMessageDto msg) {

        if (msg.getContent() == null || msg.getContent().trim().isEmpty()) return null;
        if (msg.getSender()  == null || msg.getSender().trim().isEmpty())  return null;

        ChatMessage entity = new ChatMessage();
        entity.setRoom(room);
        entity.setSender(msg.getSender().trim());
        entity.setSenderName(msg.getSenderName());
        entity.setContent(msg.getContent().trim());
        entity.setSentAt(LocalDateTime.now());
        ChatMessage saved = repo.save(entity);

        return toDto(saved, "CHAT");
    }

    // ── WebSocket: đánh dấu online ───────────────────────────────────────────
    @MessageMapping("/chat/online")
    @SendTo("/topic/chat/presence")
    public Map<String, Object> markOnline(ChatMessageDto msg) {
        onlineUsernames.add(msg.getSender());
        Map<String, Object> presence = new HashMap<>();
        presence.put("type",   "ONLINE");
        presence.put("sender", msg.getSender());
        presence.put("count",  onlineUsernames.size());
        return presence;
    }

    // ── WebSocket: đánh dấu offline ──────────────────────────────────────────
    @MessageMapping("/chat/offline")
    @SendTo("/topic/chat/presence")
    public Map<String, Object> markOffline(ChatMessageDto msg) {
        onlineUsernames.remove(msg.getSender());
        Map<String, Object> presence = new HashMap<>();
        presence.put("type",   "OFFLINE");
        presence.put("sender", msg.getSender());
        presence.put("count",  onlineUsernames.size());
        return presence;
    }

    // ── REST: lịch sử tin nhắn ───────────────────────────────────────────────
    @GetMapping("/api/chat/messages")
    @ResponseBody
    public ResponseEntity<List<ChatMessageDto>> getHistory(
            @RequestParam(defaultValue = "chung") String room) {

        List<ChatMessage> messages = repo.findRecentByRoom(room);
        List<ChatMessage> ordered  = new ArrayList<>(messages);
        Collections.reverse(ordered);
        return ResponseEntity.ok(
            ordered.stream().map(m -> toDto(m, "CHAT")).collect(Collectors.toList())
        );
    }

    // ── REST: danh sách người online ─────────────────────────────────────────
    @GetMapping("/api/chat/online")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getOnlineCount() {
        Map<String, Object> result = new HashMap<>();
        result.put("count",    onlineUsernames.size());
        result.put("usernames", new ArrayList<>(onlineUsernames));
        return ResponseEntity.ok(result);
    }

    // ── REST: danh sách tất cả user để chat ──────────────────────────────────
    @GetMapping("/api/chat/users")
    @ResponseBody
    public ResponseEntity<List<Map<String, String>>> getChatUsers(Authentication auth) {
        String me = auth != null ? auth.getName() : "";
        List<Map<String, String>> result = userRepo.findAll().stream()
            .filter(u -> u.isEnabled() && !u.getUsername().equals(me))
            .map(u -> {
                Map<String, String> m = new HashMap<>();
                m.put("username", u.getUsername());
                m.put("fullName", u.getFullName() != null ? u.getFullName() : u.getUsername());
                m.put("role",     u.getRole() != null ? u.getRole().name() : "");
                m.put("online",   onlineUsernames.contains(u.getUsername()) ? "true" : "false");
                return m;
            })
            .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // ── Helper ───────────────────────────────────────────────────────────────
    private ChatMessageDto toDto(ChatMessage m, String type) {
        ChatMessageDto dto = new ChatMessageDto();
        dto.setId(m.getId());
        dto.setRoom(m.getRoom());
        dto.setSender(m.getSender());
        dto.setSenderName(m.getSenderName());
        dto.setContent(m.getContent());
        dto.setSentAt(m.getSentAt());
        dto.setType(type);
        return dto;
    }
}
