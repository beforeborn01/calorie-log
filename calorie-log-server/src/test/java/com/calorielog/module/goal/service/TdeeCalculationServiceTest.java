package com.calorielog.module.goal.service;

import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.module.user.entity.User;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class TdeeCalculationServiceTest {

    private final TdeeCalculationService svc = new TdeeCalculationService();

    private static User user(int gender, int age, String h, String w, int activity) {
        User u = new User();
        u.setGender(gender);
        u.setAge(age);
        u.setHeight(new BigDecimal(h));
        u.setWeight(new BigDecimal(w));
        u.setActivityLevel(activity);
        return u;
    }

    // BMR reference for 男 30y 175cm 70kg = 1648.75
    // baseFactor activity=3 → 1.55
    // tdeeBase = 1648.75 * 1.55 = 2555.5625

    @Test
    void computeForGoal_bulk_goal1_male_activity3() {
        User u = user(1, 30, "175", "70", 3);
        TdeeCalculationService.GoalCalculation g = svc.computeForGoal(u, 1);

        assertEquals(new BigDecimal("1648.75"), g.bmr);
        assertEquals(new BigDecimal("2555.56"), g.tdeeBase); // 2555.5625 → HALF_UP → 2555.56
        // goal=1（增肌塑型）固定每日目标 +15%
        // 2555.5625 * 1.15 = 2938.896875 → 2938.90
        assertEquals(new BigDecimal("2938.90"), g.targetCalories);
        assertEquals(new BigDecimal("2938.90"), g.targetCaloriesTraining);
        assertEquals(new BigDecimal("2938.90"), g.targetCaloriesRest);
        assertEquals(new BigDecimal("30.0"), g.proteinRatio);
        assertEquals(new BigDecimal("45.0"), g.carbRatio);
        assertEquals(new BigDecimal("25.0"), g.fatRatio);
    }

    @Test
    void computeForGoal_cut_goal2_male_activity3() {
        User u = user(1, 30, "175", "70", 3);
        TdeeCalculationService.GoalCalculation g = svc.computeForGoal(u, 2);
        // goal=2（减脂增肌）固定每日目标 -15%
        // 2555.5625 * 0.85 = 2172.228125 → 2172.23
        assertEquals(new BigDecimal("2172.23"), g.targetCalories);
        assertEquals(new BigDecimal("2172.23"), g.targetCaloriesTraining);
        assertEquals(new BigDecimal("2172.23"), g.targetCaloriesRest);
        assertEquals(new BigDecimal("35.0"), g.proteinRatio);
        assertEquals(new BigDecimal("40.0"), g.carbRatio);
        assertEquals(new BigDecimal("25.0"), g.fatRatio);
    }

    @Test
    void computeForGoal_female_has_lower_tdee_than_male_same_biometrics() {
        User male = user(1, 28, "170", "60", 3);
        User female = user(2, 28, "170", "60", 3);
        TdeeCalculationService.GoalCalculation g1 = svc.computeForGoal(male, 2);
        TdeeCalculationService.GoalCalculation g2 = svc.computeForGoal(female, 2);
        // male BMR - female BMR = 166.0 → tdeeBase 差 166 * 1.55 = 257.3
        double diff = g1.tdeeBase.subtract(g2.tdeeBase).doubleValue();
        assertEquals(257.3, diff, 0.01);
    }

    @Test
    void computeForGoal_invalid_goalType_throws() {
        User u = user(1, 30, "175", "70", 3);
        BizException ex = assertThrows(BizException.class, () -> svc.computeForGoal(u, 99));
        assertEquals(ErrorCode.PARAM_INVALID.getCode(), ex.getCode());
    }

    @Test
    void computeForGoal_profile_incomplete_throws() {
        User u = new User();
        u.setGender(1);
        u.setAge(30);
        // 缺 height/weight/activityLevel
        BizException ex = assertThrows(BizException.class, () -> svc.computeForGoal(u, 1));
        assertEquals(ErrorCode.GOAL_PROFILE_INCOMPLETE.getCode(), ex.getCode());
    }

    @Test
    void computeForGoal_gender_zero_counts_as_incomplete() {
        User u = user(0, 30, "175", "70", 3);
        BizException ex = assertThrows(BizException.class, () -> svc.computeForGoal(u, 1));
        assertEquals(ErrorCode.GOAL_PROFILE_INCOMPLETE.getCode(), ex.getCode());
    }

    // ---------- computeDaily ----------

    @Test
    void computeDaily_rest_day_uses_baseline_and_fixed_goal_multiplier() {
        User u = user(1, 30, "175", "70", 3);
        TdeeCalculationService.DailyCalories d = svc.computeDaily(u, 2, false, 0);
        // tdee = 1648.75 * 1.55 = 2555.5625 → 2555.56
        // target goal=2 固定 multiplier 0.85 → 2555.5625 * 0.85 = 2172.228125 → 2172.23
        assertEquals(new BigDecimal("2555.56"), d.tdee);
        assertEquals(new BigDecimal("2172.23"), d.targetCalories);
        assertFalse(d.trainingDay);
    }

    @Test
    void computeDaily_training_low_intensity_keeps_baseline_tdee() {
        User u = user(1, 30, "175", "70", 3);
        TdeeCalculationService.DailyCalories d = svc.computeDaily(u, 2, true, 1);
        assertEquals(new BigDecimal("2555.56"), d.tdee);
        assertTrue(d.trainingDay);
    }

    @Test
    void computeDaily_training_high_intensity_keeps_baseline_tdee() {
        User u = user(1, 30, "175", "70", 3);
        TdeeCalculationService.DailyCalories d = svc.computeDaily(u, 1, true, 3);
        // target goal=1 固定 +15% → 2555.5625 * 1.15 = 2938.90
        assertEquals(new BigDecimal("2555.56"), d.tdee);
        assertEquals(new BigDecimal("2938.90"), d.targetCalories);
    }
}
