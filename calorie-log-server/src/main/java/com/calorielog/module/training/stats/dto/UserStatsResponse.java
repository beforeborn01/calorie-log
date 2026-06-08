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
    /** 今日当前差额 = 生活消耗 + 运动消耗 - 饮食摄入；正数=缺口、负数=超出。 */
    private BigDecimal todayNetDeficit;

    @Data
    public static class PRValue {
        private BigDecimal weight;
        private LocalDateTime date;
    }
}
