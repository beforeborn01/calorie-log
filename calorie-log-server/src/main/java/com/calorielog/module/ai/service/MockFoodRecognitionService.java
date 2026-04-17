package com.calorielog.module.ai.service;

import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.module.ai.dto.RecognizeResponse;
import com.calorielog.module.food.entity.Food;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;

/**
 * Mock 实现：对同一张图片按 hash 稳定返回一组候选；生产环境应当替换为接真 API 的实现。
 * 启用条件：app.ai.mock-enabled=true（dev 默认开启）。
 */
@Slf4j
@Service
@ConditionalOnProperty(prefix = "app.ai", name = "mock-enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
public class MockFoodRecognitionService implements FoodRecognitionService {

    private static final String CACHE_PREFIX = "ai:recognize:";
    private static final Duration CACHE_TTL = Duration.ofDays(7);
    private static final int MAX_RAW_BYTES = 2 * 1024 * 1024; // 2 MB

    /** 轮询式 mock 候选组 —— 按 hash 第一个 hex 字符选择一组。 */
    private static final String[][] POOLS = new String[][]{
            {"鸡蛋", "西红柿", "馒头"},
            {"鸡胸肉", "西兰花", "糙米饭"},
            {"三文鱼", "牛油果", "全麦面包"},
            {"牛肉", "土豆", "胡萝卜"},
            {"豆腐", "青菜", "米饭"},
            {"鱼香肉丝", "米饭", "番茄蛋汤"},
            {"宫保鸡丁", "米饭"},
            {"麻婆豆腐", "米饭", "清炒时蔬"},
    };

    private final FoodMatcher foodMatcher;
    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    @Override
    public RecognizeResponse recognize(Long userId, String imageBase64) {
        if (imageBase64 == null || imageBase64.isBlank()) {
            throw new BizException(ErrorCode.AI_IMAGE_INVALID);
        }
        String cleaned = stripDataUri(imageBase64);
        byte[] raw;
        try {
            raw = Base64.getDecoder().decode(cleaned);
        } catch (IllegalArgumentException e) {
            throw new BizException(ErrorCode.AI_IMAGE_INVALID);
        }
        if (raw.length == 0) throw new BizException(ErrorCode.AI_IMAGE_INVALID);
        if (raw.length > MAX_RAW_BYTES) throw new BizException(ErrorCode.AI_IMAGE_TOO_LARGE);

        String hash = sha256(raw);
        String cacheKey = CACHE_PREFIX + hash;
        String cached = redis.opsForValue().get(cacheKey);
        if (cached != null) {
            try {
                RecognizeResponse cachedResp = objectMapper.readValue(cached, RecognizeResponse.class);
                cachedResp.setFromCache(true);
                return cachedResp;
            } catch (JsonProcessingException e) {
                log.warn("recognize cache corrupt, regenerate: {}", e.getMessage());
            }
        }

        RecognizeResponse resp = buildMock(userId, hash);
        resp.setFromCache(false);
        try {
            redis.opsForValue().set(cacheKey, objectMapper.writeValueAsString(resp), CACHE_TTL);
        } catch (JsonProcessingException e) {
            log.warn("cache recognize failed: {}", e.getMessage());
        }
        return resp;
    }

    private RecognizeResponse buildMock(Long userId, String hash) {
        int poolIdx = Math.abs(Integer.parseInt(hash.substring(0, 2), 16)) % POOLS.length;
        String[] names = POOLS[poolIdx];

        List<RecognizeResponse.Candidate> candidates = new ArrayList<>(names.length);
        BigDecimal prob = new BigDecimal("0.90");
        for (String name : names) {
            RecognizeResponse.Candidate c = new RecognizeResponse.Candidate();
            c.setName(name);
            c.setProbability(prob);
            Food matched = foodMatcher.matchBest(userId, name);
            if (matched != null) {
                c.setFoodId(matched.getId());
                c.setCaloriesPer100g(matched.getCalories());
                c.setCategory(matched.getCategory());
                c.setNeedManualQuantity(false);
            } else {
                c.setNeedManualQuantity(true);
            }
            candidates.add(c);
            prob = prob.subtract(new BigDecimal("0.15"));
        }

        RecognizeResponse resp = new RecognizeResponse();
        resp.setImageHash(hash);
        resp.setMocked(true);
        resp.setCandidates(candidates);
        return resp;
    }

    static String stripDataUri(String s) {
        int comma = s.indexOf(',');
        if (s.startsWith("data:") && comma > 0) return s.substring(comma + 1).trim();
        return s.trim();
    }

    static String sha256(byte[] raw) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(raw));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    @SuppressWarnings("unused")
    private static String utf8(String s) {
        return new String(s.getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);
    }
}
