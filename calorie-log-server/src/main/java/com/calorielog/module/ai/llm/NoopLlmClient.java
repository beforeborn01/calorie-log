package com.calorielog.module.ai.llm;

import lombok.extern.slf4j.Slf4j;

/** 占位实现，当未配置 LLM provider 时启用，所有调用都返回 null */
@Slf4j
public class NoopLlmClient implements LlmClient {
    @Override
    public boolean isEnabled() {
        return false;
    }

    @Override
    public String chat(String systemPrompt, String userPrompt) {
        log.debug("LLM disabled (no api key); returning null");
        return null;
    }
}
