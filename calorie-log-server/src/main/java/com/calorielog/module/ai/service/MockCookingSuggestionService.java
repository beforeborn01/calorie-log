package com.calorielog.module.ai.service;

import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.module.ai.dto.CookingSuggestionResponse;
import com.calorielog.module.goal.entity.UserGoal;
import com.calorielog.module.goal.service.GoalService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Mock 实现：按食材类别匹配静态方法库；真实实现应调 LLM（豆包/DeepSeek）。
 * 生产环境：关闭 app.ai.mock-enabled，注入 DoubaoCookingSuggestionService。
 */
@Slf4j
@Service
@ConditionalOnProperty(prefix = "app.ai", name = "mock-enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
public class MockCookingSuggestionService implements CookingSuggestionService {

    private static final String CACHE_PREFIX = "ai:cooking:";
    private static final Duration CACHE_TTL = Duration.ofHours(24);

    private final GoalService goalService;
    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    @Override
    public CookingSuggestionResponse suggest(Long userId, String foodName, String preferences) {
        if (foodName == null || foodName.isBlank()) {
            throw new BizException(ErrorCode.PARAM_INVALID, "foodName 必填");
        }

        String goalType = resolveGoalType(userId);
        String normalizedPrefs = preferences == null ? "" : preferences.trim().toLowerCase(Locale.ROOT);
        String cacheKey = CACHE_PREFIX + goalType + ":" + foodName.trim() + ":" + normalizedPrefs;

        String cached = redis.opsForValue().get(cacheKey);
        if (cached != null) {
            try {
                CookingSuggestionResponse r = objectMapper.readValue(cached, CookingSuggestionResponse.class);
                r.setFromCache(true);
                return r;
            } catch (JsonProcessingException e) {
                log.warn("cooking cache corrupt: {}", e.getMessage());
            }
        }

        CookingSuggestionResponse resp = buildStatic(foodName.trim(), goalType, normalizedPrefs);
        resp.setFromCache(false);
        try {
            redis.opsForValue().set(cacheKey, objectMapper.writeValueAsString(resp), CACHE_TTL);
        } catch (JsonProcessingException e) {
            log.warn("cache cooking failed: {}", e.getMessage());
        }
        return resp;
    }

    private String resolveGoalType(Long userId) {
        UserGoal goal = goalService.findActiveOrNull(userId);
        if (goal == null || goal.getGoalType() == null) return "general";
        return goal.getGoalType() == 1 ? "bulk" : "cut";
    }

    private CookingSuggestionResponse buildStatic(String foodName, String goalType, String prefs) {
        List<CookingSuggestionResponse.Method> methods = new ArrayList<>();

        boolean wantQuick = prefs.contains("quick");
        boolean wantLowOil = prefs.contains("low_oil");
        boolean wantNoSmoke = prefs.contains("no_smoke");

        // 通用三套：清蒸 / 煎 / 炖。按目标调配料与用油。
        methods.add(buildSteam(foodName, goalType));
        if (!(wantLowOil && wantNoSmoke)) {
            methods.add(buildPanFry(foodName, goalType));
        }
        if (!wantQuick) {
            methods.add(buildStew(foodName, goalType));
        }

        CookingSuggestionResponse resp = new CookingSuggestionResponse();
        resp.setFoodName(foodName);
        resp.setGoalType(goalType);
        resp.setLlmGenerated(false);
        resp.setMethods(methods);
        return resp;
    }

    private static CookingSuggestionResponse.Method buildSteam(String f, String g) {
        CookingSuggestionResponse.Method m = new CookingSuggestionResponse.Method();
        m.setName("清蒸" + f);
        m.setSteps(List.of(
                f + " 洗净切块，用少许盐、姜丝、料酒腌 10 分钟",
                "水开上锅，大火蒸 8~12 分钟（视块头厚薄）",
                "出锅淋少许生抽与香油，点缀葱花即可"));
        m.setAdvantages("保留原味与蛋白质，几乎零油，最适合减脂期；操作简单不挑锅");
        m.setCaloriesPer100g(baseCalories(f).add(new BigDecimal("5")));
        m.setOilPerServingG(new BigDecimal("0.5"));
        m.setDurationMinutes(15);
        m.setTags(List.of("low_oil", "no_smoke", "quick"));
        m.setFitGoals(List.of("cut", "general"));
        return m;
    }

    private static CookingSuggestionResponse.Method buildPanFry(String f, String g) {
        CookingSuggestionResponse.Method m = new CookingSuggestionResponse.Method();
        m.setName("香煎" + f);
        m.setSteps(List.of(
                f + " 切片/切段，用黑胡椒、盐、少许生抽腌 15 分钟",
                "不粘锅烧热，下少量橄榄油",
                "中火每面各煎 2~3 分钟至表面金黄",
                "起锅前淋少许柠檬汁提味"));
        m.setAdvantages("口感焦香、蛋白质丰富，煎制时脂肪渗出部分；增肌期适合做主菜");
        m.setCaloriesPer100g(baseCalories(f).add(new BigDecimal("35")));
        m.setOilPerServingG("bulk".equals(g) ? new BigDecimal("8") : new BigDecimal("5"));
        m.setDurationMinutes(12);
        m.setTags(List.of("quick"));
        m.setFitGoals(List.of("bulk", "general"));
        return m;
    }

    private static CookingSuggestionResponse.Method buildStew(String f, String g) {
        CookingSuggestionResponse.Method m = new CookingSuggestionResponse.Method();
        m.setName("番茄炖" + f);
        m.setSteps(List.of(
                "番茄去皮切块，炒出沙",
                "加入" + f + " 与适量水，没过食材",
                "小火炖 25 分钟，加盐调味即可"));
        m.setAdvantages("汤汁鲜甜，食材软烂易消化；碳水 / 维生素均衡补充");
        m.setCaloriesPer100g(baseCalories(f).add(new BigDecimal("20")));
        m.setOilPerServingG(new BigDecimal("3"));
        m.setDurationMinutes(30);
        m.setTags(List.of("low_oil"));
        m.setFitGoals(List.of("bulk", "cut", "general"));
        return m;
    }

    private static BigDecimal baseCalories(String f) {
        // 不依赖食物库的粗估
        if (f.contains("鸡") || f.contains("鱼") || f.contains("虾")) return new BigDecimal("140");
        if (f.contains("牛") || f.contains("羊")) return new BigDecimal("180");
        if (f.contains("豆") || f.contains("蛋")) return new BigDecimal("120");
        if (f.contains("米") || f.contains("面")) return new BigDecimal("220");
        return new BigDecimal("100");
    }

    @SuppressWarnings("unused")
    private static List<String> splitPrefs(String raw) {
        return raw == null || raw.isBlank() ? List.of() : Arrays.stream(raw.split(",")).map(String::trim).toList();
    }
}
