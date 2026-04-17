package com.calorielog.common.utils;

import com.calorielog.module.food.entity.Food;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * 营养素计算 & BMR/TDEE 工具类。Phase 1 只用到 scaleByQuantity 部分，Phase 2 补充 BMR/TDEE。
 */
public final class NutritionCalculator {

    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private NutritionCalculator() {}

    /** 给食物的每 100g 营养值 × 摄入量（g）/ 100，返回该次食用的实际营养值。 */
    public static BigDecimal scaleByQuantity(BigDecimal per100g, BigDecimal quantityG) {
        if (per100g == null || quantityG == null) return null;
        return per100g.multiply(quantityG).divide(HUNDRED, 2, RoundingMode.HALF_UP);
    }

    public static class ScaledNutrition {
        public BigDecimal calories;
        public BigDecimal protein;
        public BigDecimal carbohydrate;
        public BigDecimal fat;
        public BigDecimal dietaryFiber;
        public BigDecimal addedSugar;
    }

    public static ScaledNutrition scale(Food food, BigDecimal quantityG) {
        ScaledNutrition s = new ScaledNutrition();
        if (food == null) return s;
        s.calories = scaleByQuantity(food.getCalories(), quantityG);
        s.protein = scaleByQuantity(food.getProtein(), quantityG);
        s.carbohydrate = scaleByQuantity(food.getCarbohydrate(), quantityG);
        s.fat = scaleByQuantity(food.getFat(), quantityG);
        s.dietaryFiber = scaleByQuantity(food.getDietaryFiber(), quantityG);
        s.addedSugar = scaleByQuantity(food.getAddedSugar(), quantityG);
        return s;
    }

    // ------- BMR / TDEE (Phase 2 用) -------

    /**
     * Mifflin-St Jeor BMR
     * 男: 10×体重 + 6.25×身高 - 5×年龄 - 161
     * 女: 10×体重 + 6.25×身高 - 5×年龄 + 5
     * @param gender 1男 2女
     */
    public static double bmrMifflin(int gender, BigDecimal weightKg, BigDecimal heightCm, int age) {
        double w = weightKg.doubleValue();
        double h = heightCm.doubleValue();
        double base = 10 * w + 6.25 * h - 5 * age;
        if (gender == 2) return base + 5;
        return base - 161;
    }

    /** 基础活动系数 */
    public static double baseActivityFactor(int activityLevel) {
        return switch (activityLevel) {
            case 1 -> 1.2;
            case 2 -> 1.375;
            case 3 -> 1.55;
            case 4 -> 1.725;
            default -> 1.375;
        };
    }

    /** 日期类型系数调整：trainingDay=true 时依据强度 +0.1 / +0.2；否则 -0.1 */
    public static double dayTypeAdjustment(boolean trainingDay, int intensity) {
        if (!trainingDay) return -0.1;
        return intensity >= 2 ? 0.2 : 0.1;
    }
}
