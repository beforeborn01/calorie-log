package com.calorielog.module.ai.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.calorielog.module.food.entity.Food;
import com.calorielog.module.food.mapper.FoodMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 识别结果名称 → t_food 最佳匹配。直接复用 FoodMapper 的全文搜索。
 */
@Component
@RequiredArgsConstructor
public class FoodMatcher {

    private final FoodMapper foodMapper;

    public Food matchBest(Long userId, String name) {
        if (name == null || name.isBlank()) return null;
        List<Food> hits = foodMapper.searchByKeyword(new Page<>(1, 1), name.trim(), userId).getRecords();
        return hits.isEmpty() ? null : hits.get(0);
    }
}
