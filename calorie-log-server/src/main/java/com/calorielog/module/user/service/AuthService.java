package com.calorielog.module.user.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.common.security.JwtAuthenticationFilter;
import com.calorielog.common.utils.IdentifierUtils;
import com.calorielog.common.utils.JwtUtils;
import com.calorielog.module.user.dto.LoginRequest;
import com.calorielog.module.user.dto.RefreshRequest;
import com.calorielog.module.user.dto.RegisterRequest;
import com.calorielog.module.user.dto.TokenResponse;
import com.calorielog.module.user.entity.User;
import com.calorielog.module.user.entity.UserExperience;
import com.calorielog.module.user.mapper.UserExperienceMapper;
import com.calorielog.module.user.mapper.UserMapper;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserMapper userMapper;
    private final UserExperienceMapper userExperienceMapper;
    private final VerifyCodeService verifyCodeService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final StringRedisTemplate redis;

    @Value("${jwt.access-token-expiry}")
    private long accessExpirySec;

    @Transactional
    public TokenResponse register(RegisterRequest req) {
        IdentifierUtils.IdentifierType type = IdentifierUtils.detect(req.getIdentifier());
        if (type == IdentifierUtils.IdentifierType.UNKNOWN) {
            throw new BizException(ErrorCode.IDENTIFIER_FORMAT_INVALID);
        }
        verifyCodeService.verify(req.getIdentifier(), "register", req.getVerifyCode());

        // 检查重复
        User existing = findByIdentifier(req.getIdentifier(), type);
        if (existing != null) {
            throw new BizException(ErrorCode.USER_ALREADY_EXISTS);
        }

        User user = new User();
        if (type == IdentifierUtils.IdentifierType.PHONE) {
            user.setPhone(req.getIdentifier());
        } else {
            user.setEmail(req.getIdentifier());
        }
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        user.setNickname(req.getNickname() != null ? req.getNickname() : defaultNickname(req.getIdentifier()));
        user.setStatus(1);
        user.setGender(0);
        user.setTimezone("Asia/Shanghai");
        userMapper.insert(user);

        initUserExperience(user.getId());

        return issueTokens(user, false);
    }

    @Transactional
    public TokenResponse login(LoginRequest req) {
        IdentifierUtils.IdentifierType type = IdentifierUtils.detect(req.getIdentifier());
        if (type == IdentifierUtils.IdentifierType.UNKNOWN) {
            throw new BizException(ErrorCode.IDENTIFIER_FORMAT_INVALID);
        }
        User user = findByIdentifier(req.getIdentifier(), type);
        if (user == null) {
            throw new BizException(ErrorCode.PASSWORD_INCORRECT);
        }
        if (user.getStatus() != null && user.getStatus() == 0) {
            throw new BizException(ErrorCode.USER_DISABLED);
        }

        if ("password".equalsIgnoreCase(req.getLoginType())) {
            if (req.getPassword() == null
                    || user.getPasswordHash() == null
                    || !passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
                throw new BizException(ErrorCode.PASSWORD_INCORRECT);
            }
        } else if ("code".equalsIgnoreCase(req.getLoginType())) {
            if (type != IdentifierUtils.IdentifierType.PHONE) {
                throw new BizException(ErrorCode.PARAM_INVALID, "验证码登录仅支持手机号");
            }
            verifyCodeService.verify(req.getIdentifier(), "login", req.getVerifyCode());
        } else {
            throw new BizException(ErrorCode.PARAM_INVALID, "loginType 仅支持 password / code");
        }

        return issueTokens(user, isProfileComplete(user));
    }

    public TokenResponse refresh(RefreshRequest req) {
        Claims claims;
        try {
            claims = jwtUtils.parse(req.getRefreshToken());
        } catch (Exception e) {
            throw new BizException(ErrorCode.TOKEN_INVALID);
        }
        String type = claims.get("type", String.class);
        if (!"REFRESH".equals(type)) {
            throw new BizException(ErrorCode.TOKEN_INVALID);
        }
        String jti = claims.getId();
        if (jti != null && Boolean.TRUE.equals(redis.hasKey(JwtAuthenticationFilter.TOKEN_BLACKLIST_PREFIX + jti))) {
            throw new BizException(ErrorCode.TOKEN_REVOKED);
        }
        Long userId = Long.parseLong(claims.getSubject());
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BizException(ErrorCode.USER_NOT_FOUND);
        }
        return issueTokens(user, isProfileComplete(user));
    }

    public void logout(String accessToken) {
        try {
            Claims claims = jwtUtils.parse(accessToken);
            String jti = claims.getId();
            long ttl = Math.max(1L, (claims.getExpiration().getTime() - System.currentTimeMillis()) / 1000L);
            if (jti != null) {
                redis.opsForValue().set(JwtAuthenticationFilter.TOKEN_BLACKLIST_PREFIX + jti, "1", Duration.ofSeconds(ttl));
            }
        } catch (Exception e) {
            log.debug("logout parse token failed: {}", e.getMessage());
        }
    }

    public TokenResponse issueTokens(User user, boolean profileComplete) {
        String access = jwtUtils.generateAccessToken(user.getId());
        String refresh = jwtUtils.generateRefreshToken(user.getId());
        return new TokenResponse(access, refresh, accessExpirySec, user.getId(), profileComplete);
    }

    public User findByIdentifier(String identifier, IdentifierUtils.IdentifierType type) {
        if (type == IdentifierUtils.IdentifierType.PHONE) return userMapper.findByPhone(identifier);
        if (type == IdentifierUtils.IdentifierType.EMAIL) return userMapper.findByEmail(identifier);
        return null;
    }

    public boolean isProfileComplete(User user) {
        return user.getGender() != null && user.getGender() > 0
                && user.getAge() != null
                && user.getHeight() != null
                && user.getWeight() != null
                && user.getActivityLevel() != null;
    }

    private void initUserExperience(Long userId) {
        UserExperience exp = new UserExperience();
        exp.setUserId(userId);
        exp.setTotalExp(0L);
        exp.setLevel(1);
        exp.setContinuousDays(0);
        userExperienceMapper.insert(exp);
    }

    private String defaultNickname(String identifier) {
        if (identifier.length() <= 4) return "用户" + identifier;
        return "用户" + identifier.substring(identifier.length() - 4);
    }

    @Transactional
    public void changePassword(Long userId, String oldPassword, String newPassword) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BizException(ErrorCode.USER_NOT_FOUND);
        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new BizException(ErrorCode.PASSWORD_INCORRECT);
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userMapper.updateById(user);
        invalidateAllTokens(userId);
    }

    @Transactional
    public void resetPassword(String identifier, String verifyCode, String newPassword) {
        IdentifierUtils.IdentifierType type = IdentifierUtils.detect(identifier);
        if (type == IdentifierUtils.IdentifierType.UNKNOWN) {
            throw new BizException(ErrorCode.IDENTIFIER_FORMAT_INVALID);
        }
        verifyCodeService.verify(identifier, "reset_password", verifyCode);
        User user = findByIdentifier(identifier, type);
        if (user == null) throw new BizException(ErrorCode.USER_NOT_FOUND);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userMapper.updateById(user);
        invalidateAllTokens(user.getId());
    }

    private void invalidateAllTokens(Long userId) {
        String key = JwtAuthenticationFilter.TOKEN_INVALIDATE_USER_PREFIX + userId;
        redis.opsForValue().set(key, String.valueOf(System.currentTimeMillis()),
                Duration.ofDays(30));
    }
}
