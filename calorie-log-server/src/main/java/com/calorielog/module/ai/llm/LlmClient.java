package com.calorielog.module.ai.llm;

import java.util.List;

/**
 * LLM 客户端抽象。
 * 未配置 API key 时使用 {@link NoopLlmClient}，所有 isEnabled() = false，调用方应跳过。
 */
public interface LlmClient {

    /** 是否可用（已配置 API key 等） */
    boolean isEnabled();

    /**
     * 简化的 chat 调用：发送 prompt，返回 assistant content。
     * 实现方负责重试 / 超时 / 错误日志；任何异常或不可用都返回 null。
     */
    String chat(String systemPrompt, String userPrompt);
}
