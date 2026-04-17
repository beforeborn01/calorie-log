package com.calorielog.module.social.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.module.social.dto.InviteLinkResponse;
import com.calorielog.module.social.dto.InvitePreviewResponse;
import com.calorielog.module.user.entity.User;
import com.calorielog.module.user.entity.UserExperience;
import com.calorielog.module.user.mapper.UserExperienceMapper;
import com.calorielog.module.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class InviteService {

    private static final Duration INVITE_TTL = Duration.ofDays(7);
    private static final String KEY_PREFIX = "social:invite:";

    private final StringRedisTemplate redis;
    private final UserMapper userMapper;
    private final UserExperienceMapper experienceMapper;
    private final FriendService friendService;

    @Value("${app.social.invite-base-url:https://calorielog.cn/invite}")
    private String inviteBaseUrl;

    public InviteLinkResponse create(Long userId) {
        String token = generateToken();
        redis.opsForValue().set(KEY_PREFIX + token, String.valueOf(userId), INVITE_TTL);
        InviteLinkResponse r = new InviteLinkResponse();
        r.setToken(token);
        r.setUrl(inviteBaseUrl + "?token=" + token);
        r.setExpiresAt(LocalDateTime.now().plus(INVITE_TTL));
        return r;
    }

    public InvitePreviewResponse preview(String token) {
        Long inviterId = lookup(token);
        InvitePreviewResponse r = new InvitePreviewResponse();
        if (inviterId == null) {
            r.setValid(false);
            return r;
        }
        r.setValid(true);
        r.setInviterUserId(inviterId);
        User u = userMapper.selectById(inviterId);
        r.setInviterNickname(u == null || u.getNickname() == null ? "用户" + inviterId : u.getNickname());
        UserExperience e = experienceMapper.selectOne(
                new QueryWrapper<UserExperience>().eq("user_id", inviterId));
        r.setInviterLevel(e == null || e.getLevel() == null ? 1 : e.getLevel());
        return r;
    }

    public Long accept(Long currentUserId, String token) {
        Long inviterId = lookup(token);
        if (inviterId == null) throw new BizException(ErrorCode.NOT_FOUND, "邀请链接已失效");
        if (inviterId.equals(currentUserId)) throw new BizException(ErrorCode.CANNOT_ADD_SELF);
        if (friendService.isFriend(currentUserId, inviterId)) {
            return inviterId;
        }
        friendService.createFriendship(currentUserId, inviterId);
        // 一次性链接：接受后使其失效，避免同一 token 被多人复用
        redis.delete(KEY_PREFIX + token);
        return inviterId;
    }

    private Long lookup(String token) {
        if (token == null || token.isBlank()) return null;
        String v = redis.opsForValue().get(KEY_PREFIX + token);
        if (v == null) return null;
        try {
            return Long.parseLong(v);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String generateToken() {
        byte[] buf = new byte[16];
        new SecureRandom().nextBytes(buf);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
    }
}
