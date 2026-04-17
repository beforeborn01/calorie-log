package com.calorielog.common.security;

import com.calorielog.common.utils.JwtUtils;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;
    private final StringRedisTemplate stringRedisTemplate;

    public static final String TOKEN_BLACKLIST_PREFIX = "auth:blacklist:jti:";
    public static final String TOKEN_INVALIDATE_USER_PREFIX = "auth:user_invalidated:";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (!StringUtils.hasText(header) || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }
        String token = header.substring(7).trim();
        try {
            Claims claims = jwtUtils.parse(token);
            String type = claims.get("type", String.class);
            if (!"ACCESS".equals(type)) {
                filterChain.doFilter(request, response);
                return;
            }
            String jti = claims.getId();
            if (jti != null && Boolean.TRUE.equals(stringRedisTemplate.hasKey(TOKEN_BLACKLIST_PREFIX + jti))) {
                filterChain.doFilter(request, response);
                return;
            }
            Long userId = Long.parseLong(claims.getSubject());
            String invalidatedAt = stringRedisTemplate.opsForValue().get(TOKEN_INVALIDATE_USER_PREFIX + userId);
            if (invalidatedAt != null) {
                long invalidAtMs = Long.parseLong(invalidatedAt);
                if (claims.getIssuedAt() != null && claims.getIssuedAt().getTime() < invalidAtMs) {
                    filterChain.doFilter(request, response);
                    return;
                }
            }
            UsernamePasswordAuthenticationToken authToken =
                    new UsernamePasswordAuthenticationToken(userId, null, Collections.emptyList());
            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authToken);
        } catch (Exception e) {
            log.debug("JWT auth failed: {}", e.getMessage());
        }
        filterChain.doFilter(request, response);
    }
}
