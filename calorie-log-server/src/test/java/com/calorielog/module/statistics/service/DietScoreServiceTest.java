package com.calorielog.module.statistics.service;

import com.calorielog.module.goal.entity.UserGoal;
import com.calorielog.module.goal.service.GoalService;
import com.calorielog.module.record.entity.DailySummary;
import com.calorielog.module.record.entity.DietRecord;
import com.calorielog.module.record.mapper.DietRecordMapper;
import com.calorielog.module.record.service.DailySummaryService;
import com.calorielog.module.social.service.RankingService;
import com.calorielog.module.statistics.dto.DietScoreResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DietScoreServiceTest {

    @Mock DailySummaryService dailySummaryService;
    @Mock DietRecordMapper dietRecordMapper;
    @Mock GoalService goalService;
    @Mock ObjectProvider<RankingService> rankingProvider;

    @InjectMocks DietScoreService svc;

    private final Long uid = 42L;
    private final LocalDate date = LocalDate.of(2026, 4, 18);

    private UserGoal goal;

    @BeforeEach
    void setupGoal() {
        // goal: 35/40/25 (减脂增肌默认比例)
        goal = new UserGoal();
        goal.setProteinRatio(new BigDecimal("35"));
        goal.setCarbRatio(new BigDecimal("40"));
        goal.setFatRatio(new BigDecimal("25"));
    }

    private DailySummary summary(String target, String total, String protein, String carb, String fat, String fiber) {
        DailySummary s = new DailySummary();
        s.setTargetCalories(bd(target));
        s.setTotalCalories(bd(total));
        s.setTotalProtein(bd(protein));
        s.setTotalCarb(bd(carb));
        s.setTotalFat(bd(fat));
        s.setTotalFiber(bd(fiber));
        return s;
    }

    private DietRecord record(int meal, String foodName, Long foodId, String kcal) {
        DietRecord r = new DietRecord();
        r.setMealType(meal);
        r.setFoodName(foodName);
        r.setFoodId(foodId);
        r.setCalories(bd(kcal));
        return r;
    }

    // ---------- calorie score ----------

    @Test
    void calorieScore_no_target_returns_zero() {
        when(dailySummaryService.getOrInit(uid, date))
                .thenReturn(summary(null, "1000", "50", "120", "30", "10"));
        when(dietRecordMapper.findByDate(uid, date)).thenReturn(List.of());
        when(goalService.findActiveOrNull(uid)).thenReturn(null);

        DietScoreResponse r = svc.compute(uid, date);
        assertEquals(bd("0.00"), r.getCalorieScore());
    }

    @Test
    void calorieScore_within_10_percent_is_30() {
        // target 2000，实际 2100 → 偏差 5% → 30
        when(dailySummaryService.getOrInit(uid, date))
                .thenReturn(summary("2000", "2100", "0", "0", "0", "0"));
        when(dietRecordMapper.findByDate(uid, date)).thenReturn(List.of());
        when(goalService.findActiveOrNull(uid)).thenReturn(null);

        DietScoreResponse r = svc.compute(uid, date);
        assertEquals(bd("30.00"), r.getCalorieScore());
    }

    @Test
    void calorieScore_deviation_15_percent_linear_interpolates_to_22_5() {
        // target 2000，实际 2300 → 偏差 15% → 30 - (15-10)*1.5 = 22.5
        when(dailySummaryService.getOrInit(uid, date))
                .thenReturn(summary("2000", "2300", "0", "0", "0", "0"));
        when(dietRecordMapper.findByDate(uid, date)).thenReturn(List.of());
        when(goalService.findActiveOrNull(uid)).thenReturn(null);

        DietScoreResponse r = svc.compute(uid, date);
        assertEquals(bd("22.50"), r.getCalorieScore());
    }

    @Test
    void calorieScore_deviation_over_20_percent_steep_decline() {
        // target 2000，实际 3000 → 偏差 50% → 15 - (50-20)*0.5 = 0
        when(dailySummaryService.getOrInit(uid, date))
                .thenReturn(summary("2000", "3000", "0", "0", "0", "0"));
        when(dietRecordMapper.findByDate(uid, date)).thenReturn(List.of());
        when(goalService.findActiveOrNull(uid)).thenReturn(null);

        DietScoreResponse r = svc.compute(uid, date);
        assertEquals(bd("0.00"), r.getCalorieScore());
    }

    // ---------- nutrient score ----------

    @Test
    void nutrientScore_no_goal_returns_zero() {
        when(dailySummaryService.getOrInit(uid, date))
                .thenReturn(summary("2000", "1900", "100", "200", "60", "25"));
        when(dietRecordMapper.findByDate(uid, date)).thenReturn(List.of());
        when(goalService.findActiveOrNull(uid)).thenReturn(null);

        DietScoreResponse r = svc.compute(uid, date);
        assertEquals(bd("0.00"), r.getNutrientScore());
    }

    @Test
    void nutrientScore_perfect_fit_is_35() {
        // target 2000, 35/40/25 → 蛋白 175g、碳水 200g、脂肪 55.56g
        // 实际完美匹配 + 25g fiber → 9+9+9 + 8 = 35
        when(dailySummaryService.getOrInit(uid, date))
                .thenReturn(summary("2000", "2000", "175", "200", "55.56", "25"));
        when(dietRecordMapper.findByDate(uid, date)).thenReturn(List.of());
        when(goalService.findActiveOrNull(uid)).thenReturn(goal);

        DietScoreResponse r = svc.compute(uid, date);
        assertEquals(bd("35.00"), r.getNutrientScore());
    }

    @Test
    void nutrientScore_low_fiber_deducts() {
        // 三大营养素达标，fiber 0 → 9+9+9+0 = 27 (capped at 35)
        when(dailySummaryService.getOrInit(uid, date))
                .thenReturn(summary("2000", "2000", "175", "200", "55.56", "0"));
        when(dietRecordMapper.findByDate(uid, date)).thenReturn(List.of());
        when(goalService.findActiveOrNull(uid)).thenReturn(goal);

        DietScoreResponse r = svc.compute(uid, date);
        assertEquals(bd("27.00"), r.getNutrientScore());
    }

    // ---------- meal distribution ----------

    @Test
    void mealDistribution_empty_records_is_zero() {
        when(dailySummaryService.getOrInit(uid, date))
                .thenReturn(summary("2000", "2000", "0", "0", "0", "0"));
        when(dietRecordMapper.findByDate(uid, date)).thenReturn(List.of());
        when(goalService.findActiveOrNull(uid)).thenReturn(null);

        DietScoreResponse r = svc.compute(uid, date);
        assertEquals(bd("0.00"), r.getMealDistributionScore());
    }

    @Test
    void mealDistribution_perfect_ratio_is_20() {
        // 目标 25/35/30/10；total 2000 → 500/700/600/200
        List<DietRecord> list = List.of(
                record(1, "食物A", 1L, "500"),
                record(2, "食物B", 2L, "700"),
                record(3, "食物C", 3L, "600"),
                record(4, "食物D", 4L, "200")
        );
        when(dailySummaryService.getOrInit(uid, date))
                .thenReturn(summary("2000", "2000", "0", "0", "0", "0"));
        when(dietRecordMapper.findByDate(uid, date)).thenReturn(list);
        when(goalService.findActiveOrNull(uid)).thenReturn(null);

        DietScoreResponse r = svc.compute(uid, date);
        assertEquals(bd("20.00"), r.getMealDistributionScore());
    }

    @Test
    void mealDistribution_only_dinner_penalized_heavily() {
        List<DietRecord> list = List.of(record(3, "晚餐", 1L, "2000"));
        when(dailySummaryService.getOrInit(uid, date))
                .thenReturn(summary("2000", "2000", "0", "0", "0", "0"));
        when(dietRecordMapper.findByDate(uid, date)).thenReturn(list);
        when(goalService.findActiveOrNull(uid)).thenReturn(null);

        DietScoreResponse r = svc.compute(uid, date);
        // 偏离：早 25%(扣 5 顶)，午 35%(扣 5 顶)，晚 70%(扣 5 顶)，加餐 10%(扣 (0.10-0.05)*100*0.5=2.5)
        // 20 - (5 + 5 + 5 + 2.5) = 2.5
        assertEquals(bd("2.50"), r.getMealDistributionScore());
    }

    // ---------- variety ----------

    @Test
    void variety_count_uses_distinct_foodId_or_name() {
        // 同 foodId 的两条应合并为 1；不同 foodId 计 2；无 id 按 name 去重
        List<DietRecord> list = new ArrayList<>();
        list.add(record(1, "鸡蛋", 1L, "100"));
        list.add(record(2, "鸡蛋", 1L, "100")); // 相同食物
        list.add(record(2, "鸡胸肉", 2L, "200"));
        list.add(record(3, "自制沙拉", null, "300")); // 无 id
        list.add(record(3, "自制沙拉", null, "50"));  // 同名合并
        list.add(record(4, "苹果", 3L, "50"));
        when(dailySummaryService.getOrInit(uid, date))
                .thenReturn(summary("2000", "800", "0", "0", "0", "0"));
        when(dietRecordMapper.findByDate(uid, date)).thenReturn(list);
        when(goalService.findActiveOrNull(uid)).thenReturn(null);

        DietScoreResponse r = svc.compute(uid, date);
        assertEquals(4, r.getVarietyCount());
        // 1~4 种：3 分
        assertEquals(bd("3.00"), r.getVarietyScore());
    }

    @Test
    void variety_12_or_more_is_full_15() {
        List<DietRecord> list = new ArrayList<>();
        for (long i = 1; i <= 12; i++) list.add(record(1, "食物" + i, i, "50"));
        when(dailySummaryService.getOrInit(uid, date))
                .thenReturn(summary("2000", "600", "0", "0", "0", "0"));
        when(dietRecordMapper.findByDate(uid, date)).thenReturn(list);
        when(goalService.findActiveOrNull(uid)).thenReturn(null);

        DietScoreResponse r = svc.compute(uid, date);
        assertEquals(12, r.getVarietyCount());
        assertEquals(bd("15.00"), r.getVarietyScore());
    }

    @Test
    void variety_8_to_11_is_10() {
        List<DietRecord> list = new ArrayList<>();
        for (long i = 1; i <= 8; i++) list.add(record(1, "食物" + i, i, "50"));
        when(dailySummaryService.getOrInit(uid, date))
                .thenReturn(summary("2000", "400", "0", "0", "0", "0"));
        when(dietRecordMapper.findByDate(uid, date)).thenReturn(list);
        when(goalService.findActiveOrNull(uid)).thenReturn(null);

        DietScoreResponse r = svc.compute(uid, date);
        assertEquals(bd("10.00"), r.getVarietyScore());
    }

    // ---------- total ----------

    @Test
    void totalScore_aggregates_four_dimensions() {
        // target 2000 / 实际 2000 → 热量 30
        // 175/200/55.56/25 → 营养 35
        // 500/700/600/200 perfect meal → 20
        // 4 种食物 → 3
        List<DietRecord> list = List.of(
                record(1, "食物A", 1L, "500"),
                record(2, "食物B", 2L, "700"),
                record(3, "食物C", 3L, "600"),
                record(4, "食物D", 4L, "200")
        );
        when(dailySummaryService.getOrInit(uid, date))
                .thenReturn(summary("2000", "2000", "175", "200", "55.56", "25"));
        when(dietRecordMapper.findByDate(uid, date)).thenReturn(list);
        when(goalService.findActiveOrNull(uid)).thenReturn(goal);

        DietScoreResponse r = svc.compute(uid, date);
        assertEquals(bd("30.00"), r.getCalorieScore());
        assertEquals(bd("35.00"), r.getNutrientScore());
        assertEquals(bd("20.00"), r.getMealDistributionScore());
        assertEquals(bd("3.00"), r.getVarietyScore());
        assertEquals(bd("88.00"), r.getTotalScore());
    }

    private static BigDecimal bd(String s) {
        return s == null ? null : new BigDecimal(s);
    }
}
