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
 *   BMR (Mifflin-St Jeor) → 基础活动系数 → 日期类型调整 → TDEE → 目标热量 → 营养素比例
 */
@Service
public class TdeeCalculationService {

    /**
     * 根据用户 + 目标类型计算全套数值。训练日/休息日均输出，供 t_user_goal 一次性存下。
     */
    public GoalCalculation computeForGoal(User user, int goalType) {
        requireProfile(user);
        double bmr = NutritionCalculator.bmrMifflin(
                user.getGender(), user.getWeight(), user.getHeight(), user.getAge());
        double baseFactor = NutritionCalculator.baseActivityFactor(user.getActivityLevel());

        // 训练日按中等强度（+0.2）估算基础 TDEE；实际每日 target 会在 /statistics/daily 时按当日强度重算
        double tdeeTrainingMid = bmr * (baseFactor + 0.2);
        double tdeeRest = bmr * (baseFactor - 0.1);

        double targetTraining;
        double targetRest;
        double proteinRatio;
        double carbRatio;
        double fatRatio;

        if (goalType == 1) {
            // 增肌塑型：训练日 +17.5% / 休息日 +12.5%
            targetTraining = tdeeTrainingMid * 1.175;
            targetRest = tdeeRest * 1.125;
            proteinRatio = 30; carbRatio = 45; fatRatio = 25;
        } else if (goalType == 2) {
            // 减脂增肌：训练日 -12.5% / 休息日 -17.5%
            targetTraining = tdeeTrainingMid * 0.875;
            targetRest = tdeeRest * 0.825;
            proteinRatio = 35; carbRatio = 40; fatRatio = 25;
        } else {
            throw new BizException(ErrorCode.PARAM_INVALID, "goalType 仅支持 1(增肌) 或 2(减脂)");
        }

        GoalCalculation gc = new GoalCalculation();
        gc.bmr = round(bmr);
        gc.tdeeBase = round(bmr * baseFactor);
        gc.targetCaloriesTraining = round(targetTraining);
        gc.targetCaloriesRest = round(targetRest);
        gc.proteinRatio = BigDecimal.valueOf(proteinRatio);
        gc.carbRatio = BigDecimal.valueOf(carbRatio);
        gc.fatRatio = BigDecimal.valueOf(fatRatio);
        return gc;
    }

    /**
     * 某一天的实际 TDEE 与目标热量。trainingDay + intensity 由 GoalService 按规则 + 例外表推导。
     */
    public DailyCalories computeDaily(User user, int goalType, boolean trainingDay, int intensity) {
        requireProfile(user);
        double bmr = NutritionCalculator.bmrMifflin(
                user.getGender(), user.getWeight(), user.getHeight(), user.getAge());
        double baseFactor = NutritionCalculator.baseActivityFactor(user.getActivityLevel());
        double adjustment = NutritionCalculator.dayTypeAdjustment(trainingDay, intensity);
        double tdee = bmr * (baseFactor + adjustment);

        double multiplier;
        if (goalType == 1) {
            multiplier = trainingDay ? 1.175 : 1.125;
        } else {
            multiplier = trainingDay ? 0.875 : 0.825;
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
