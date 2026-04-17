package com.calorielog.module.goal.service;

import com.calorielog.module.goal.dto.MealDistributionResponse;
import com.calorielog.module.record.entity.DailySummary;
import com.calorielog.module.record.service.DailySummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MealDistributionService {

    private final DailySummaryService dailySummaryService;

    // 与 DietScoreService / DietSuggestionService 保持同步
    private static final double BREAKFAST = 0.25;
    private static final double LUNCH = 0.35;
    private static final double DINNER = 0.30;
    private static final double SNACK = 0.10;
    private static final double TOLERANCE = 0.05;  // ±5%

    public MealDistributionResponse get(Long userId, LocalDate date) {
        DailySummary s = dailySummaryService.getOrInit(userId, date);
        BigDecimal target = s.getTargetCalories() != null ? s.getTargetCalories() : new BigDecimal("2000");

        MealDistributionResponse resp = new MealDistributionResponse();
        resp.setDate(date);
        resp.setDayType(s.getDayType());
        resp.setTargetCalories(target);
        resp.setMeals(List.of(
                range(1, "早餐", BREAKFAST, target),
                range(2, "午餐", LUNCH, target),
                range(3, "晚餐", DINNER, target),
                range(4, "加餐", SNACK, target)
        ));
        return resp;
    }

    private MealDistributionResponse.MealRange range(int mealType, String label, double ratio, BigDecimal target) {
        double t = target.doubleValue();
        MealDistributionResponse.MealRange r = new MealDistributionResponse.MealRange();
        r.setMealType(mealType);
        r.setLabel(label);
        r.setRatio(BigDecimal.valueOf(ratio));
        r.setMidCalories(round(t * ratio));
        r.setMinCalories(round(t * Math.max(0, ratio - TOLERANCE)));
        r.setMaxCalories(round(t * (ratio + TOLERANCE)));
        return r;
    }

    private static BigDecimal round(double v) {
        return BigDecimal.valueOf(v).setScale(0, RoundingMode.HALF_UP);
    }
}
