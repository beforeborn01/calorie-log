package com.calorielog.common.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Slf4j
@Component
public class JwtUtils {

    public enum TokenType { ACCESS, REFRESH, WECHAT_TEMP }

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-token-expiry}")
    private long accessExpirySec;

    @Value("${jwt.refresh-token-expiry}")
    private long refreshExpirySec;

    @Value("${jwt.issuer}")
    private String issuer;

    private SecretKey key() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(Long userId) {
        return buildToken(userId, TokenType.ACCESS, accessExpirySec);
    }

    public String generateRefreshToken(Long userId) {
        return buildToken(userId, TokenType.REFRESH, refreshExpirySec);
    }

    public String generateWechatTempToken(String openid) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(openid)
                .issuer(issuer)
                .issuedAt(new Date(now))
                .expiration(new Date(now + 600_000L)) // 10 minutes
                .claim("type", TokenType.WECHAT_TEMP.name())
                .signWith(key())
                .compact();
    }

    private String buildToken(Long userId, TokenType type, long expirySec) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(String.valueOf(userId))
                .issuer(issuer)
                .issuedAt(new Date(now))
                .expiration(new Date(now + expirySec * 1000L))
                .claim("type", type.name())
                .signWith(key())
                .compact();
    }

    public Claims parse(String token) {
        Jws<Claims> jws = Jwts.parser()
                .verifyWith(key())
                .build()
                .parseSignedClaims(token);
        return jws.getPayload();
    }

    public boolean isValid(String token) {
        try {
            parse(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public Long extractUserId(String token) {
        return Long.parseLong(parse(token).getSubject());
    }

    public String extractJti(String token) {
        return parse(token).getId();
    }

    public TokenType extractType(String token) {
        String type = parse(token).get("type", String.class);
        return TokenType.valueOf(type);
    }

    public long remainingSeconds(String token) {
        Date exp = parse(token).getExpiration();
        long remain = (exp.getTime() - System.currentTimeMillis()) / 1000L;
        return Math.max(remain, 0L);
    }
}
