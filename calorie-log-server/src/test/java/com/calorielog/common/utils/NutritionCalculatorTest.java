package com.calorielog.common.utils;

import com.calorielog.module.food.entity.Food;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class NutritionCalculatorTest {

    // ---------- scaleByQuantity ----------

    @Test
    void scaleByQuantity_null_per100g_returnsNull() {
        assertNull(NutritionCalculator.scaleByQuantity(null, bd("150")));
    }

    @Test
    void scaleByQuantity_null_quantity_returnsNull() {
        assertNull(NutritionCalculator.scaleByQuantity(bd("100"), null));
    }

    @Test
    void scaleByQuantity_math_half_up_2_decimals() {
        // 144 * 150 / 100 = 216.00
        assertEquals(bd("216.00"),
                NutritionCalculator.scaleByQuantity(bd("144"), bd("150")));
        // 2.85 * 33 / 100 = 0.9405 → 0.94
        assertEquals(bd("0.94"),
                NutritionCalculator.scaleByQuantity(bd("2.85"), bd("33")));
    }

    @Test
    void scale_with_food_populates_all_fields() {
        Food f = new Food();
        f.setCalories(bd("144"));
        f.setProtein(bd("13.3"));
        f.setCarbohydrate(bd("2.8"));
        f.setFat(bd("8.8"));
        f.setDietaryFiber(bd("0"));
        f.setAddedSugar(bd("0"));
        NutritionCalculator.ScaledNutrition s = NutritionCalculator.scale(f, bd("150"));
        assertEquals(bd("216.00"), s.calories);
        assertEquals(bd("19.95"), s.protein);
        assertEquals(bd("4.20"), s.carbohydrate);
        assertEquals(bd("13.20"), s.fat);
    }

    @Test
    void scale_null_food_returns_empty_response() {
        NutritionCalculator.ScaledNutrition s = NutritionCalculator.scale(null, bd("100"));
        assertNotNull(s);
        assertNull(s.calories);
    }

    // ---------- BMR (Mifflin-St Jeor) ----------
    //
    // 标准 Mifflin-St Jeor：
    //   男性: BMR = 10·w + 6.25·h - 5·age + 5
    //   女性: BMR = 10·w + 6.25·h - 5·age - 161
    // 项目中 gender 约定：1=男 2=女

    @Test
    void bmrMifflin_male_30y_175cm_70kg() {
        // 10*70 + 6.25*175 - 5*30 + 5 = 700 + 1093.75 - 150 + 5 = 1648.75
        double bmr = NutritionCalculator.bmrMifflin(1, bd("70"), bd("175"), 30);
        assertEquals(1648.75, bmr, 0.001);
    }

    @Test
    void bmrMifflin_female_25y_162cm_55kg() {
        // 10*55 + 6.25*162 - 5*25 - 161 = 550 + 1012.5 - 125 - 161 = 1276.5
        double bmr = NutritionCalculator.bmrMifflin(2, bd("55"), bd("162"), 25);
        assertEquals(1276.5, bmr, 0.001);
    }

    @Test
    void bmrMifflin_male_and_female_differ_by_166_same_biometrics() {
        // 同身高/体重/年龄下，男性 BMR 比女性高 166 kcal（5 - (-161) = 166）
        double male = NutritionCalculator.bmrMifflin(1, bd("60"), bd("170"), 28);
        double female = NutritionCalculator.bmrMifflin(2, bd("60"), bd("170"), 28);
        assertEquals(166.0, male - female, 0.001);
    }

    // ---------- baseActivityFactor ----------

    @ParameterizedTest
    @CsvSource({
            "1, 1.2",
            "2, 1.375",
            "3, 1.55",
            "4, 1.725",
            "0, 1.375", // default fallback
            "99, 1.375",
    })
    void baseActivityFactor(int level, double expected) {
        assertEquals(expected, NutritionCalculator.baseActivityFactor(level), 0.0001);
    }

    // ---------- dayTypeAdjustment ----------

    @Test
    void dayTypeAdjustment_rest_day_is_negative() {
        assertEquals(-0.1, NutritionCalculator.dayTypeAdjustment(false, 0), 0.0001);
        assertEquals(-0.1, NutritionCalculator.dayTypeAdjustment(false, 3), 0.0001);
    }

    @Test
    void dayTypeAdjustment_training_low_intensity() {
        // intensity < 2 → +0.1
        assertEquals(0.1, NutritionCalculator.dayTypeAdjustment(true, 1), 0.0001);
        assertEquals(0.1, NutritionCalculator.dayTypeAdjustment(true, 0), 0.0001);
    }

    @Test
    void dayTypeAdjustment_training_mid_or_high() {
        // intensity >= 2 → +0.2
        assertEquals(0.2, NutritionCalculator.dayTypeAdjustment(true, 2), 0.0001);
        assertEquals(0.2, NutritionCalculator.dayTypeAdjustment(true, 3), 0.0001);
    }

    private static BigDecimal bd(String s) {
        return new BigDecimal(s);
    }
}
