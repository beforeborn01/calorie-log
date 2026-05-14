package com.calorielog.module.training.stats.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Data
public class UserStatsResponse {
    private Integer totalWorkouts;
    private BigDecimal totalVolume;
    private Integer currentStreak;
    private Integer longestStreak;
    private BigDecimal weeklyAverage;
    private LocalDateTime lastWorkoutDate;
    private Map<Long, PRValue> personalRecords;
    private LocalDateTime updatedAt;
    /** 今日运动总消耗 kcal（来自 t_daily_summary.exercise_calories） */
    private BigDecimal todayExerciseCalories;
    /** 今日饮食卡 - (TDEE + 运动) 的净赤字；正数=赤字、负数=盈余。前端展示 */
    private BigDecimal todayNetDeficit;

    @Data
    public static class PRValue {
        private BigDecimal weight;
        private LocalDateTime date;
    }
}
