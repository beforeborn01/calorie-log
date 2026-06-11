package com.calorielog.module.goal.service;

import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.common.utils.NutritionCalculator;
import com.calorielog.module.user.entity.User;
import lombok.Data;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * TDEE 计算核心逻辑（架构文档 6.1 节）：
 *   BMR (Mifflin-St Jeor) → 日常活动系数 → 生活基线消耗 → 固定饮食目标。
 *
 * <p>已记录运动消耗单独进入能量收支，避免在 TDEE 和 exerciseCalories 中重复计算训练消耗。</p>
 */
@Service
public class TdeeCalculationService {

    /**
     * 根据用户 + 目标类型计算全套数值。当前产品口径下饮食目标不再按计划训练日浮动；
     * 为兼容旧表结构，training/rest 两个字段写同一个固定目标。
     */
    public GoalCalculation computeForGoal(User user, int goalType) {
        requireProfile(user);
        double bmr = NutritionCalculator.bmrMifflin(
                user.getGender(), user.getWeight(), user.getHeight(), user.getAge());
        double baseFactor = NutritionCalculator.baseActivityFactor(user.getActivityLevel());
        double baselineTdee = bmr * baseFactor;

        double targetCalories;
        double proteinRatio;
        double carbRatio;
        double fatRatio;

        if (goalType == 1) {
            // 增肌塑型：每日饮食目标 = 生活基线消耗 +15%
            targetCalories = baselineTdee * 1.15;
            proteinRatio = 30; carbRatio = 45; fatRatio = 25;
        } else if (goalType == 2) {
            // 减脂增肌：每日饮食目标 = 生活基线消耗 -15%
            targetCalories = baselineTdee * 0.85;
            proteinRatio = 35; carbRatio = 40; fatRatio = 25;
        } else {
            throw new BizException(ErrorCode.PARAM_INVALID, "goalType 仅支持 1(增肌) 或 2(减脂)");
        }

        GoalCalculation gc = new GoalCalculation();
        gc.bmr = round(bmr);
        gc.tdeeBase = round(baselineTdee);
        gc.targetCalories = round(targetCalories);
        gc.targetCaloriesTraining = gc.targetCalories;
        gc.targetCaloriesRest = gc.targetCalories;
        gc.proteinRatio = BigDecimal.valueOf(proteinRatio);
        gc.carbRatio = BigDecimal.valueOf(carbRatio);
        gc.fatRatio = BigDecimal.valueOf(fatRatio);
        return gc;
    }

    /** 某一天的生活基线消耗与固定饮食目标。已记录运动消耗在 DailySummary 里单独累加。 */
    public DailyCalories computeDaily(User user, int goalType, boolean trainingDay, int intensity) {
        requireProfile(user);
        double bmr = NutritionCalculator.bmrMifflin(
                user.getGender(), user.getWeight(), user.getHeight(), user.getAge());
        double baseFactor = NutritionCalculator.baseActivityFactor(user.getActivityLevel());
        double tdee = bmr * baseFactor;

        double multiplier;
        if (goalType == 1) {
            multiplier = 1.15;
        } else {
            multiplier = 0.85;
        }
        double target = tdee * multiplier;

        DailyCalories d = new DailyCalories();
        d.tdee = round(tdee);
        d.targetCalories = round(target);
        d.trainingDay = trainingDay;
        d.intensity = intensity;
        return d;
    }

    private static BigDecimal round(double v) {
        return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_UP);
    }

    private static void requireProfile(User u) {
        if (u.getGender() == null || u.getGender() == 0
                || u.getAge() == null
                || u.getHeight() == null
                || u.getWeight() == null
                || u.getActivityLevel() == null) {
            throw new BizException(ErrorCode.GOAL_PROFILE_INCOMPLETE);
        }
    }

    @Data
    public static class GoalCalculation {
        public BigDecimal bmr;
        public BigDecimal tdeeBase;
        public BigDecimal targetCalories;
        public BigDecimal targetCaloriesTraining;
        public BigDecimal targetCaloriesRest;
        public BigDecimal proteinRatio;
        public BigDecimal carbRatio;
        public BigDecimal fatRatio;
    }

    @Data
    public static class DailyCalories {
        public BigDecimal tdee;
        public BigDecimal targetCalories;
        public boolean trainingDay;
        public int intensity;
    }
}
