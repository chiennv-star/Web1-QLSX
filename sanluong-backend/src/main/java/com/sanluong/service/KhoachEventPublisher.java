package com.sanluong.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class KhoachEventPublisher {

    private final SimpMessagingTemplate ws;

    public KhoachEventPublisher(SimpMessagingTemplate ws) {
        this.ws = ws;
    }

    public void publishKhoachUpdated() {
        try {
            ws.convertAndSend("/topic/khoach-updated", "khoach-updated");
        } catch (Exception ignored) {}
    }
}
