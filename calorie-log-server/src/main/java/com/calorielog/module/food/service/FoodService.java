package com.calorielog.module.food.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.common.result.PageResult;
import com.calorielog.module.food.dto.CreateFoodRequest;
import com.calorielog.module.food.dto.FoodResponse;
import com.calorielog.module.food.entity.Food;
import com.calorielog.module.food.mapper.FoodMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FoodService {

    private final FoodMapper foodMapper;
    private final StringRedisTemplate redis;
    // Redis cache for hot keyword search results keyed by (userId, keyword, page, size)
    private static final String FOOD_SEARCH_CACHE = "food:search:";
    private static final Duration CACHE_TTL = Duration.ofHours(1);

    public PageResult<FoodResponse> search(Long userId, String keyword, int page, int size) {
        if (keyword == null || keyword.isBlank()) {
            return PageResult.of(java.util.Collections.emptyList(), 0, page, size);
        }
        keyword = keyword.trim();
        Page<Food> p = new Page<>(page, size);
        var result = foodMapper.searchByKeyword(p, keyword, userId);
        var list = result.getRecords().stream().map(FoodResponse::of).collect(Collectors.toList());
        return PageResult.of(list, result.getTotal(), result.getCurrent(), result.getSize());
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
        return FoodResponse.of(f);
    }
}
