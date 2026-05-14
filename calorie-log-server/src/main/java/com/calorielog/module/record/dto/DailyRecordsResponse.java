package com.calorielog.module.record.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class DailyRecordsResponse {
    private LocalDate date;

    private List<DietRecordResponse> breakfast;
    private List<DietRecordResponse> lunch;
    private List<DietRecordResponse> dinner;
    private List<DietRecordResponse> snacks;

    private BigDecimal totalCalories;
    private BigDecimal totalProtein;
    private BigDecimal totalCarb;
    private BigDecimal totalFat;
    private BigDecimal totalFiber;

    /** Phase 1 暂用写死的 2000，Phase 2 替换为 TDEE 计算 */
    private BigDecimal targetCalories;

    /** 基础代谢 + 活动消耗（来自 user profile + activityLevel） */
    private BigDecimal tdee;
    /** 当日运动总消耗 kcal（来自 t_workout_session 完成累加） */
    private BigDecimal exerciseCalories;
    /** 净赤字 = tdee + exerciseCalories − totalCalories；正=赤字（减脂）、负=盈余 */
    private BigDecimal netDeficit;
}
