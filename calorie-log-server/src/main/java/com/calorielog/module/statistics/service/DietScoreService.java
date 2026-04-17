package com.calorielog.module.statistics.service;

import com.calorielog.module.goal.entity.UserGoal;
import com.calorielog.module.goal.service.GoalService;
import com.calorielog.module.record.entity.DailySummary;
import com.calorielog.module.record.entity.DietRecord;
import com.calorielog.module.record.mapper.DietRecordMapper;
import com.calorielog.module.record.service.DailySummaryService;
import com.calorielog.module.statistics.dto.DietScoreResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 饮食评分（100 分制，架构 6.2 节）：
 *   热量达标度 30 + 营养素合规性 35 + 餐次分配 20 + 食物多样性 15
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DietScoreService {

    private final DailySummaryService dailySummaryService;
    private final DietRecordMapper dietRecordMapper;
    private final GoalService goalService;

    /** 餐次推荐占比：早 25% / 午 35% / 晚 30% / 加餐 10% */
    private static final Map<Integer, Double> MEAL_TARGET_RATIO = Map.of(
            1, 0.25, 2, 0.35, 3, 0.30, 4, 0.10);
    /** 每餐允许的偏差（占目标热量的百分比） */
    private static final double MEAL_TOLERANCE = 0.05;

    public DietScoreResponse compute(Long userId, LocalDate date) {
        DailySummary s = dailySummaryService.getOrInit(userId, date);
        List<DietRecord> records = dietRecordMapper.findByDate(userId, date);
        UserGoal goal = goalService.findActiveOrNull(userId);

        double calorieScore = scoreCalorie(s);
        NutrientBreakdown nutrient = scoreNutrients(s, goal);
        double mealScore = scoreMealDistribution(records, s);
        VarietyScore variety = scoreVariety(records);

        double total = calorieScore + nutrient.score + mealScore + variety.score;

        DietScoreResponse resp = new DietScoreResponse();
        resp.setDate(date);
        resp.setTotalScore(round(total));
        resp.setCalorieScore(round(calorieScore));
        resp.setNutrientScore(round(nutrient.score));
        resp.setMealDistributionScore(round(mealScore));
        resp.setVarietyScore(round(variety.score));
        resp.setVarietyCount(variety.count);
        resp.setNutrientDetail(nutrient.detail);
        return resp;
    }

    /** 写回 t_daily_summary.diet_score，异步触发避免阻塞主流程 */
    @Async
    public void recomputeAsync(Long userId, LocalDate date) {
        try {
            DietScoreResponse resp = compute(userId, date);
            dailySummaryService.updateDietScore(userId, date, resp.getTotalScore());
        } catch (Exception e) {
            log.warn("diet score async recompute failed: userId={} date={}", userId, date, e);
        }
    }

    /**
     * 热量达标度（30 分）
     *   偏差 ≤10%  → 30
     *   偏差 10~20% → 30 → 15 线性
     *   偏差 >20%  → 15 以下，每多 1% 扣 0.5，下限 0
     */
    private double scoreCalorie(DailySummary s) {
        if (s.getTargetCalories() == null || s.getTargetCalories().signum() == 0) return 0;
        if (s.getTotalCalories() == null) return 0;
        double total = s.getTotalCalories().doubleValue();
        double target = s.getTargetCalories().doubleValue();
        double deviationPct = Math.abs(total - target) / target * 100.0;
        if (deviationPct <= 10) return 30;
        if (deviationPct <= 20) {
            // 10% → 30，20% → 15
            return 30 - (deviationPct - 10) * 1.5;
        }
        return Math.max(0, 15 - (deviationPct - 20) * 0.5);
    }

    private NutrientBreakdown scoreNutrients(DailySummary s, UserGoal goal) {
        NutrientBreakdown br = new NutrientBreakdown();
        br.detail = new HashMap<>();
        if (s.getTargetCalories() == null || goal == null) {
            br.score = 0;
            return br;
        }
        double target = s.getTargetCalories().doubleValue();
        double proteinTargetG = target * goal.getProteinRatio().doubleValue() / 100.0 / 4.0;  // 1g 蛋白 = 4kcal
        double carbTargetG = target * goal.getCarbRatio().doubleValue() / 100.0 / 4.0;
        double fatTargetG = target * goal.getFatRatio().doubleValue() / 100.0 / 9.0;

        double pro = num(s.getTotalProtein());
        double carb = num(s.getTotalCarb());
        double fat = num(s.getTotalFat());
        double fiber = num(s.getTotalFiber());

        // 各 9 分满分，合计 27，留 8 分给膳食纤维达标（每人每日推荐 25~30g 这里用 25）
        double proteinScore = fitScore(pro, proteinTargetG, 9);
        double carbScore = fitScore(carb, carbTargetG, 9);
        double fatScore = fitScore(fat, fatTargetG, 9);
        double fiberScore = fiber >= 25 ? 8 : fiber / 25.0 * 8;

        // 添加糖超标扣分（>50g 减 5；>75g 减 10），使用 t_diet_record 聚合时未拿 added_sugar，这里暂扣 0
        // Phase 3 可接入真实 added_sugar 合计

        double score = proteinScore + carbScore + fatScore + fiberScore;
        br.score = Math.min(35, score);
        br.detail.put("protein", roundDouble(proteinScore));
        br.detail.put("carbohydrate", roundDouble(carbScore));
        br.detail.put("fat", roundDouble(fatScore));
        br.detail.put("fiber", roundDouble(fiberScore));
        br.detail.put("proteinTargetG", roundDouble(proteinTargetG));
        br.detail.put("carbTargetG", roundDouble(carbTargetG));
        br.detail.put("fatTargetG", roundDouble(fatTargetG));
        return br;
    }

    /** 单项拟合度：落在 [0.85×, 1.15×] 给满分；每偏离 1% 扣 0.1；低于 0 截断 */
    private static double fitScore(double actual, double target, double full) {
        if (target <= 0) return 0;
        double dev = Math.abs(actual - target) / target * 100.0;
        if (dev <= 15) return full;
        double penalty = (dev - 15) * 0.1;
        return Math.max(0, full - penalty);
    }

    private double scoreMealDistribution(List<DietRecord> records, DailySummary s) {
        if (records.isEmpty() || s.getTotalCalories() == null || s.getTotalCalories().signum() == 0) return 0;
        double total = s.getTotalCalories().doubleValue();
        Map<Integer, Double> caloriesByMeal = new HashMap<>();
        for (DietRecord r : records) {
            if (r.getMealType() == null) continue;
            double v = r.getCalories() == null ? 0 : r.getCalories().doubleValue();
            caloriesByMeal.merge(r.getMealType(), v, Double::sum);
        }
        double score = 20;
        for (Map.Entry<Integer, Double> entry : MEAL_TARGET_RATIO.entrySet()) {
            double actualRatio = caloriesByMeal.getOrDefault(entry.getKey(), 0.0) / total;
            double deviation = Math.abs(actualRatio - entry.getValue());
            // 每餐允许 5% 误差，超出每 1% 扣 0.5
            if (deviation > MEAL_TOLERANCE) {
                score -= Math.min(5, (deviation - MEAL_TOLERANCE) * 100 * 0.5);
            }
        }
        return Math.max(0, score);
    }

    private VarietyScore scoreVariety(List<DietRecord> records) {
        long distinct = records.stream()
                .filter(r -> r.getFoodName() != null)
                .map(r -> r.getFoodId() != null ? String.valueOf(r.getFoodId()) : r.getFoodName())
                .distinct()
                .count();
        VarietyScore v = new VarietyScore();
        v.count = (int) distinct;
        if (distinct >= 12) v.score = 15;
        else if (distinct >= 8) v.score = 10;
        else if (distinct >= 5) v.score = 6;
        else if (distinct >= 1) v.score = 3;
        else v.score = 0;
        return v;
    }

    private static double num(BigDecimal v) { return v == null ? 0 : v.doubleValue(); }
    private static BigDecimal round(double v) { return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_UP); }
    private static double roundDouble(double v) { return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_UP).doubleValue(); }

    private static class NutrientBreakdown {
        double score;
        Map<String, Object> detail;
    }

    private static class VarietyScore {
        double score;
        int count;
    }
}
