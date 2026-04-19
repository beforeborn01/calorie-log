package com.calorielog.module.food.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.common.result.PageResult;
import com.calorielog.module.food.dto.CreateFoodRequest;
import com.calorielog.module.food.dto.FoodResponse;
import com.calorielog.module.food.entity.Food;
import com.calorielog.module.food.mapper.FoodMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FoodService {

    private final FoodMapper foodMapper;
    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    // 热键缓存：仅对内置食物（userId 维度不参与 key，自定义食物命中不缓存以避免脏读）
    private static final String FOOD_SEARCH_CACHE = "food:search:";
    private static final Duration CACHE_TTL = Duration.ofHours(1);

    public PageResult<FoodResponse> search(Long userId, String keyword, int page, int size) {
        if (keyword == null || keyword.isBlank()) {
            return PageResult.of(java.util.Collections.emptyList(), 0, page, size);
        }
        keyword = keyword.trim();
        // 1. 仅对第 1 页、size<=20、keyword 长度 >=2 的通用查询启用缓存
        //    用户态自定义食物不走缓存（createCustom 不做失效更简单）
        boolean cacheable = page == 1 && size <= 20 && keyword.length() >= 2;
        // 自定义食物按 userId 维度命中，必须把 user 纳入 key 避免跨用户泄漏
        String cacheKey = cacheable ? FOOD_SEARCH_CACHE + userId + ":" + keyword + ":" + size : null;
        if (cacheable) {
            String raw = redis.opsForValue().get(cacheKey);
            if (raw != null) {
                try {
                    return objectMapper.readValue(raw, new TypeReference<PageResult<FoodResponse>>() {});
                } catch (Exception ex) {
                    log.warn("food search cache parse failed: {}", ex.getMessage());
                }
            }
        }

        Page<Food> p = new Page<>(page, size);
        var result = foodMapper.searchByKeyword(p, keyword, userId);
        var list = result.getRecords().stream().map(FoodResponse::of).collect(Collectors.toList());
        PageResult<FoodResponse> out = PageResult.of(list, result.getTotal(), result.getCurrent(), result.getSize());

        if (cacheable) {
            try {
                redis.opsForValue().set(cacheKey, objectMapper.writeValueAsString(out), CACHE_TTL);
            } catch (Exception ex) {
                log.warn("food search cache write failed: {}", ex.getMessage());
            }
        }
        return out;
    }

    public FoodResponse getById(Long userId, Long id) {
        Food f = foodMapper.selectById(id);
        if (f == null) throw new BizException(ErrorCode.FOOD_NOT_FOUND);
        if ("user".equals(f.getDataSource()) && (f.getCreatedBy() == null || !f.getCreatedBy().equals(userId))) {
            throw new BizException(ErrorCode.FOOD_NO_PERMISSION);
        }
        return FoodResponse.of(f);
    }

    public FoodResponse createCustom(Long userId, CreateFoodRequest req) {
        Food f = new Food();
        f.setName(req.getName());
        f.setAlias(req.getAlias());
        f.setCategory(req.getCategory());
        f.setUnit("g");
        f.setCalories(req.getCalories());
        f.setProtein(req.getProtein());
        f.setCarbohydrate(req.getCarbohydrate());
        f.setFat(req.getFat());
        f.setDietaryFiber(req.getDietaryFiber());
        f.setAddedSugar(req.getAddedSugar());
        f.setBarcode(req.getBarcode());
        f.setIsHardToWeigh(Boolean.TRUE.equals(req.getIsHardToWeigh()));
        f.setGrossNetRatio(req.getGrossNetRatio());
        f.setDataSource("user");
        f.setCreatedBy(userId);
        foodMapper.insert(f);
        invalidateSearchCache(userId);
        return FoodResponse.of(f);
    }

    private void invalidateSearchCache(Long userId) {
        try {
            var keys = redis.keys(FOOD_SEARCH_CACHE + userId + ":*");
            if (keys != null && !keys.isEmpty()) {
                redis.delete(keys);
            }
        } catch (Exception ex) {
            log.warn("food search cache invalidate failed for user {}: {}", userId, ex.getMessage());
        }
    }
}
