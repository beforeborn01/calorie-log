package com.calorielog.module.goal.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class MealDistributionResponse {
    private LocalDate date;
    private Integer dayType;   // 1训练日 2休息日
    private BigDecimal targetCalories;
    private List<MealRange> meals;

    @Data
    public static class MealRange {
        private Integer mealType;   // 1早 2午 3晚 4加餐
        private String label;
        private BigDecimal ratio;         // 目标占比 0~1
        private BigDecimal minCalories;   // 建议下限
        private BigDecimal maxCalories;   // 建议上限
        private BigDecimal midCalories;   // 推荐值
    }
}
