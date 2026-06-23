package com.sanluong.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
public class LsxExtractService {

    @Value("${app.anthropic.api-key:}")
    private String apiKey;

    private final RestClient restClient = RestClient.create();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Map<String, Object> extractFromImage(MultipartFile file) throws IOException {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Chưa cấu hình Anthropic API key (app.anthropic.api-key trong application.properties)");
        }

        byte[] bytes = file.getBytes();
        String base64Data = Base64.getEncoder().encodeToString(bytes);
        String mediaType = file.getContentType();
        if (mediaType == null || mediaType.isBlank()) mediaType = "image/jpeg";

        Map<String, Object> imageSource = Map.of(
            "type", "base64",
            "media_type", mediaType,
            "data", base64Data
        );
        Map<String, Object> imageContent = Map.of(
            "type", "image",
            "source", imageSource
        );
        Map<String, Object> textContent = Map.of(
            "type", "text",
            "text", buildPrompt()
        );
        Map<String, Object> message = Map.of(
            "role", "user",
            "content", List.of(imageContent, textContent)
        );
        Map<String, Object> requestBody = Map.of(
            "model", "claude-haiku-4-5-20251001",
            "max_tokens", 2048,
            "messages", List.of(message)
        );

        String responseBody = restClient.post()
            .uri("https://api.anthropic.com/v1/messages")
            .header("x-api-key", apiKey)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .body(requestBody)
            .retrieve()
            .body(String.class);

        JsonNode root = objectMapper.readTree(responseBody);
        String text = root.path("content").get(0).path("text").asText();

        // Strip possible markdown code fences
        text = text.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();

        int start = text.indexOf('{');
        int end   = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            text = text.substring(start, end + 1);
        }

        return objectMapper.readValue(text, new TypeReference<>() {});
    }

    private String buildPrompt() {
        return """
            Hãy trích xuất thông tin từ tờ lệnh sản xuất trong ảnh này và trả về JSON theo cấu trúc sau.
            Chỉ trả về JSON hợp lệ, không thêm giải thích hay markdown:
            {
              "tenSanPham": "",
              "maTP": "",
              "soLuongPhaChe": "",
              "quyCach": "",
              "soDangKy": "",
              "hanDung": "",
              "soLoSanXuat": "",
              "ngaySanXuat": "",
              "hanSuDung": "",
              "luuY": "",
              "nguyenVatLieu": [
                {"maVatTu": "", "ten": "", "loNVL": "", "dvt": "", "tyLe": "", "dm1": "", "dmLo": "", "ghiChu": ""}
              ],
              "baoBi": [
                {"maVatTu": "", "ten": "", "loNVL": "", "dvt": "", "tyLe": "", "dm1": "", "dmLo": "", "ghiChu": ""}
              ]
            }
            Nếu không tìm thấy trường nào, để giá trị là chuỗi rỗng "".
            """;
    }
}
