package com.sanluong.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;

@RestController
@RequestMapping("/api/files")
public class FileUploadController {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp",
        ".pdf",
        ".doc", ".docx",
        ".xls", ".xlsx",
        ".mp4", ".mov", ".avi", ".mkv", ".webm"
    );

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", defaultValue = "kph") String folder) throws IOException {

        String original = Objects.requireNonNullElse(file.getOriginalFilename(), "file");
        String ext = original.contains(".")
                ? original.substring(original.lastIndexOf('.')).toLowerCase() : "";

        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Loại file không được hỗ trợ: " + ext));
        }

        String stored = UUID.randomUUID() + ext;
        Path dir = Paths.get(uploadDir, folder);
        Files.createDirectories(dir);
        Files.copy(file.getInputStream(), dir.resolve(stored), StandardCopyOption.REPLACE_EXISTING);

        return ResponseEntity.ok(Map.of(
            "url",  "/uploads/" + folder + "/" + stored,
            "name", original,
            "size", file.getSize(),
            "type", Objects.requireNonNullElse(file.getContentType(), "")
        ));
    }
}
