package com.calorielog.common.config;

import com.calorielog.common.security.CurrentUser;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * 最外层请求日志：method + path + query + status + duration + userId。
 * 排在 Jwt 过滤器之后执行（@Order 越大越靠后 return），但在整条链 finally 里收尾。
 * 阈值超 1000ms 打 WARN，正常打 DEBUG；404/5xx 一律 WARN 方便排查。
 */
@Slf4j
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final long SLOW_THRESHOLD_MS = 1000L;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri.startsWith("/actuator") || uri.equals("/favicon.ico");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        long start = System.currentTimeMillis();
        try {
            chain.doFilter(request, response);
        } finally {
            long cost = System.currentTimeMillis() - start;
            int status = response.getStatus();
            Long uid = CurrentUser.userIdOrNull();
            String q = request.getQueryString();
            String path = request.getRequestURI() + (q == null ? "" : "?" + q);
            if (status >= 500 || status == 404) {
                log.warn("HTTP {} {} uid={} -> {} {}ms", request.getMethod(), path, uid, status, cost);
            } else if (cost >= SLOW_THRESHOLD_MS) {
                log.warn("SLOW {} {} uid={} -> {} {}ms", request.getMethod(), path, uid, status, cost);
            } else {
                log.info("{} {} uid={} -> {} {}ms", request.getMethod(), path, uid, status, cost);
            }
        }
    }
}
