package com.calorielog.module.user.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.module.user.dto.TokenResponse;
import com.calorielog.module.user.dto.WechatPollResponse;
import com.calorielog.module.user.dto.WechatQrCodeResponse;
import com.calorielog.module.user.entity.User;
import com.calorielog.module.user.mapper.UserMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;

/**
 * 网页微信扫码登录（Phase 6）。
 *
 * Dev 下无真实扫码能力，前端可调 /auth/wechat/mock-confirm 模拟扫码确认。
 * 生产环境替换为 WxJava 生成二维码 + 接收微信回调写 ticket 状态。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WechatQrLoginService {

    private static final String KEY_PREFIX = "wechat:qr:";
    private static final Duration TTL = Duration.ofMinutes(5);

    public enum Status { PENDING, SCANNED, CONFIRMED, EXPIRED }

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final UserMapper userMapper;
    private final AuthService authService;

    @Value("${app.auth.mock-verify-code-enabled:false}")
    private boolean mockEnabled;

    public WechatQrCodeResponse createTicket() {
        String ticket = generateTicket();
        Entry e = new Entry();
        e.status = Status.PENDING;
        writeEntry(ticket, e);

        WechatQrCodeResponse r = new WechatQrCodeResponse();
        r.setTicket(ticket);
        r.setMocked(mockEnabled);
        r.setExpiresAt(LocalDateTime.now().plus(TTL));
        if (mockEnabled) {
            // 返回一个"指向本地 mock-confirm 的"标记 URL，前端据此渲染按钮或二维码
            r.setQrCodeUrl("mock://wechat/confirm?ticket=" + ticket);
        } else {
            // TODO: 生产环境调 WxJava 生成真实二维码 URL（微信开放平台 qrconnect）
            r.setQrCodeUrl("https://open.weixin.qq.com/connect/qrconnect?ticket=" + ticket);
        }
        return r;
    }

    public WechatPollResponse poll(String ticket) {
        Entry e = readEntry(ticket);
        WechatPollResponse resp = new WechatPollResponse();
        if (e == null) {
            resp.setStatus(Status.EXPIRED.name());
            return resp;
        }
        resp.setStatus(e.status.name());
        resp.setNickname(e.nickname);
        if (e.status == Status.CONFIRMED && e.userId != null) {
            User u = userMapper.selectById(e.userId);
            if (u == null) {
                resp.setStatus(Status.EXPIRED.name());
                return resp;
            }
            resp.setToken(authService.issueTokens(u, authService.isProfileComplete(u)));
            // 一次性 ticket：签发后立即失效，避免重复使用
            redis.delete(KEY_PREFIX + ticket);
        }
        return resp;
    }

    /**
     * Dev-only：模拟扫码确认。
     * targetUserId 传任意已存在用户 ID；不存在则报错。
     */
    public void mockConfirm(String ticket, Long targetUserId) {
        if (!mockEnabled) {
            throw new BizException(ErrorCode.FORBIDDEN, "仅 dev 环境可用");
        }
        Entry e = readEntry(ticket);
        if (e == null) throw new BizException(ErrorCode.WECHAT_TEMP_TOKEN_INVALID);
        User u;
        if (targetUserId != null) {
            u = userMapper.selectById(targetUserId);
            if (u == null) throw new BizException(ErrorCode.USER_NOT_FOUND);
        } else {
            // 取第一个存在的用户当做"扫码者"
            u = userMapper.selectOne(new QueryWrapper<User>().eq("status", 1).last("LIMIT 1"));
            if (u == null) throw new BizException(ErrorCode.USER_NOT_FOUND, "无可用账号，请先注册");
        }
        e.status = Status.CONFIRMED;
        e.userId = u.getId();
        e.nickname = u.getNickname();
        writeEntry(ticket, e);
    }

    private Entry readEntry(String ticket) {
        String raw = redis.opsForValue().get(KEY_PREFIX + ticket);
        if (raw == null) return null;
        try {
            return objectMapper.readValue(raw, Entry.class);
        } catch (JsonProcessingException ex) {
            log.warn("qr ticket parse failed: {}", ex.getMessage());
            return null;
        }
    }

    private void writeEntry(String ticket, Entry e) {
        try {
            redis.opsForValue().set(KEY_PREFIX + ticket, objectMapper.writeValueAsString(e), TTL);
        } catch (JsonProcessingException ex) {
            throw new BizException(ErrorCode.INTERNAL_ERROR, "ticket 序列化失败");
        }
    }

    private static String generateTicket() {
        byte[] buf = new byte[16];
        new SecureRandom().nextBytes(buf);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
    }

    public static class Entry {
        public Status status;
        public Long userId;
        public String nickname;
    }
}
