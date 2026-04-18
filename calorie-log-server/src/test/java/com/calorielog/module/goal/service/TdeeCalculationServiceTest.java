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
    // tdeeTrainingMid = 1648.75 * (1.55 + 0.2) = 1648.75 * 1.75 = 2885.3125
    // tdeeRest        = 1648.75 * (1.55 - 0.1) = 1648.75 * 1.45 = 2390.6875

    @Test
    void computeForGoal_bulk_goal1_male_activity3() {
        User u = user(1, 30, "175", "70", 3);
        TdeeCalculationService.GoalCalculation g = svc.computeForGoal(u, 1);

        assertEquals(new BigDecimal("1648.75"), g.bmr);
        assertEquals(new BigDecimal("2555.56"), g.tdeeBase); // 2555.5625 → HALF_UP → 2555.56
        // goal=1（增肌塑型）训练日 +17.5%，休息日 +12.5%
        // 2885.3125 * 1.175 = 3390.2421875 → 3390.24
        // 2390.6875 * 1.125 = 2689.52343... → 2689.52
        assertEquals(new BigDecimal("3390.24"), g.targetCaloriesTraining);
        assertEquals(new BigDecimal("2689.52"), g.targetCaloriesRest);
        assertEquals(new BigDecimal("30.0"), g.proteinRatio);
        assertEquals(new BigDecimal("45.0"), g.carbRatio);
        assertEquals(new BigDecimal("25.0"), g.fatRatio);
    }

    @Test
    void computeForGoal_cut_goal2_male_activity3() {
        User u = user(1, 30, "175", "70", 3);
        TdeeCalculationService.GoalCalculation g = svc.computeForGoal(u, 2);
        // goal=2（减脂增肌）训练日 -12.5%，休息日 -17.5%
        // 2885.3125 * 0.875 = 2524.6484375 → 2524.65
        // 2390.6875 * 0.825 = 1972.3171875 → 1972.32
        assertEquals(new BigDecimal("2524.65"), g.targetCaloriesTraining);
        assertEquals(new BigDecimal("1972.32"), g.targetCaloriesRest);
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
    void computeDaily_rest_day_uses_minus_0_1_and_rest_multiplier() {
        User u = user(1, 30, "175", "70", 3);
        TdeeCalculationService.DailyCalories d = svc.computeDaily(u, 2, false, 0);
        // tdee = 1648.75 * (1.55 - 0.1) = 2390.6875 → 2390.69
        // target goal=2 休息日 multiplier 0.825 → 2390.6875 * 0.825 = 1972.3171875 → 1972.32
        assertEquals(new BigDecimal("2390.69"), d.tdee);
        assertEquals(new BigDecimal("1972.32"), d.targetCalories);
        assertFalse(d.trainingDay);
    }

    @Test
    void computeDaily_training_low_intensity_uses_plus_0_1() {
        User u = user(1, 30, "175", "70", 3);
        TdeeCalculationService.DailyCalories d = svc.computeDaily(u, 2, true, 1);
        // tdee = 1648.75 * (1.55 + 0.1) = 2720.4375 → 2720.44
        assertEquals(new BigDecimal("2720.44"), d.tdee);
        assertTrue(d.trainingDay);
    }

    @Test
    void computeDaily_training_high_intensity_uses_plus_0_2() {
        User u = user(1, 30, "175", "70", 3);
        TdeeCalculationService.DailyCalories d = svc.computeDaily(u, 1, true, 3);
        // tdee = 1648.75 * 1.75 = 2885.3125 → 2885.31
        // target goal=1 训练 +17.5% → 2885.3125 * 1.175 = 3390.24
        assertEquals(new BigDecimal("2885.31"), d.tdee);
        assertEquals(new BigDecimal("3390.24"), d.targetCalories);
    }
}
