package com.calorielog.module.ai.llm;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 通过 app.llm.* 配置选择 LLM 实现。
 * 未填 api-key 时自动使用 Noop，整个补录流程仍可工作（只是没有兜底）。
 */
@Slf4j
@Configuration
public class LlmConfig {

    @Value("${app.llm.provider:doubao}")
    private String provider;

    @Value("${app.llm.doubao.endpoint:https://ark.cn-beijing.volces.com/api/v3/chat/completions}")
    private String doubaoEndpoint;

    @Value("${app.llm.doubao.api-key:}")
    private String doubaoApiKey;

    @Value("${app.llm.doubao.model:}")
    private String doubaoModel;

    @Value("${app.llm.timeout-ms:8000}")
    private int timeoutMs;

    @Bean
    public LlmClient llmClient() {
        if (!"doubao".equalsIgnoreCase(provider)) {
            log.info("LLM provider {} not supported yet; using noop", provider);
            return new NoopLlmClient();
        }
        if (doubaoApiKey == null || doubaoApiKey.isBlank() || doubaoModel == null || doubaoModel.isBlank()) {
            log.info("LLM doubao api-key/model not configured; using noop (set app.llm.doubao.api-key & model to enable)");
            return new NoopLlmClient();
        }
        log.info("LLM enabled: doubao model={}", doubaoModel);
        return new DoubaoLlmClient(doubaoEndpoint, doubaoApiKey, doubaoModel, timeoutMs);
    }
}
