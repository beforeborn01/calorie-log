package com.calorielog.module.ai.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * 火山引擎 doubao（OpenAI 兼容 API）实现。
 * 端点示例：https://ark.cn-beijing.volces.com/api/v3/chat/completions
 */
@Slf4j
public class DoubaoLlmClient implements LlmClient {

    private final String endpoint;
    private final String apiKey;
    private final String model;
    private final RestTemplate http;
    private final ObjectMapper json = new ObjectMapper();

    public DoubaoLlmClient(String endpoint, String apiKey, String model, int timeoutMs) {
        this.endpoint = endpoint;
        this.apiKey = apiKey;
        this.model = model;
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(timeoutMs);
        f.setReadTimeout(timeoutMs);
        this.http = new RestTemplate(f);
    }

    @Override
    public boolean isEnabled() {
        return apiKey != null && !apiKey.isBlank()
                && endpoint != null && !endpoint.isBlank()
                && model != null && !model.isBlank();
    }

    @Override
    public String chat(String systemPrompt, String userPrompt) {
        if (!isEnabled()) return null;
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            Map<String, Object> body = Map.of(
                    "model", model,
                    "messages", List.of(
                            Map.of("role", "system", "content", systemPrompt),
                            Map.of("role", "user", "content", userPrompt)
                    ),
                    // 豆包 seed 系列默认开 reasoning，对结构化匹配任务是额外延迟（实测慢 3x+）
                    "thinking", Map.of("type", "disabled"),
                    "temperature", 0.2,
                    "stream", false
            );

            HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, headers);
            String resp = http.postForObject(endpoint, req, String.class);
            if (resp == null) return null;
            JsonNode root = json.readTree(resp);
            JsonNode choices = root.path("choices");
            if (choices.isArray() && choices.size() > 0) {
                return choices.get(0).path("message").path("content").asText(null);
            }
            log.warn("doubao response has no choices: {}", resp);
            return null;
        } catch (Exception e) {
            log.warn("doubao chat failed: {}", e.getMessage());
            return null;
        }
    }
}
