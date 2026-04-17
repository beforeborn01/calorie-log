package com.calorielog.module.user.service;

import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.common.utils.IdentifierUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Service
@RequiredArgsConstructor
public class VerifyCodeService {

    private final StringRedisTemplate redis;

    @Value("${app.auth.mock-verify-code-enabled:false}")
    private boolean mockEnabled;

    @Value("${app.auth.mock-verify-code:123456}")
    private String mockCode;

    @Value("${spring.profiles.active:prod}")
    private String activeProfile;

    private static final String CODE_PREFIX = "auth:verify_code:";
    private static final String LOCK_PREFIX = "auth:verify_code_lock:";
    private static final Duration CODE_TTL = Duration.ofMinutes(5);
    private static final Duration LOCK_TTL = Duration.ofMinutes(1);

    /**
     * Send a verification code. Returns the code when mock mode is enabled; returns null in prod (real SMS/email).
     */
    public String sendCode(String identifier, String scene) {
        IdentifierUtils.IdentifierType type = IdentifierUtils.detect(identifier);
        if (type == IdentifierUtils.IdentifierType.UNKNOWN) {
            throw new BizException(ErrorCode.IDENTIFIER_FORMAT_INVALID);
        }

        String lockKey = LOCK_PREFIX + identifier + ":" + scene;
        Boolean ok = redis.opsForValue().setIfAbsent(lockKey, "1", LOCK_TTL);
        if (Boolean.FALSE.equals(ok)) {
            throw new BizException(ErrorCode.VERIFY_CODE_RATE_LIMIT);
        }

        String code;
        if (mockEnabled && "dev".equals(activeProfile)) {
            code = mockCode;
            log.info("[MOCK] send verify code: identifier={} scene={} code={}", identifier, scene, code);
        } else {
            code = String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000));
            // TODO: integrate with SmsService / MailService in Phase 3
            log.info("TODO: send real code to {} scene={}", identifier, scene);
        }

        redis.opsForValue().set(CODE_PREFIX + scene + ":" + identifier, code, CODE_TTL);

        return (mockEnabled && "dev".equals(activeProfile)) ? code : null;
    }

    public void verify(String identifier, String scene, String code) {
        if (code == null || code.isBlank()) {
            throw new BizException(ErrorCode.VERIFY_CODE_INCORRECT);
        }
        String key = CODE_PREFIX + scene + ":" + identifier;
        String stored = redis.opsForValue().get(key);
        if (stored == null) {
            throw new BizException(ErrorCode.VERIFY_CODE_EXPIRED);
        }
        if (!stored.equals(code)) {
            throw new BizException(ErrorCode.VERIFY_CODE_INCORRECT);
        }
        redis.delete(key);
    }
}
