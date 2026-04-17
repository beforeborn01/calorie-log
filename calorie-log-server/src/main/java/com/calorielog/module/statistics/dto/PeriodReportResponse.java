package com.calorielog.module.statistics.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class PeriodReportResponse {
    private String period; // weekly / monthly
    private LocalDate startDate;
    private LocalDate endDate;

    // 饮食汇总
    private Integer daysWithRecords;
    private BigDecimal avgCalories;
    private BigDecimal avgProtein;
    private BigDecimal avgCarb;
    private BigDecimal avgFat;
    private BigDecimal avgFiber;
    private BigDecimal avgCalorieGap;
    private BigDecimal avgDietScore;

    // 体重体脂
    private BigDecimal weightStart;
    private BigDecimal weightEnd;
    private BigDecimal weightChange;
    private BigDecimal bodyFatStart;
    private BigDecimal bodyFatEnd;
    private BigDecimal bodyFatChange;

    // 力量训练
    private Integer strengthTrainingDays;
    private Integer strengthTotalSets;
    private Long strengthTotalReps;
    private BigDecimal strengthTotalVolume;

    // 最优 / 待改进
    private LocalDate bestDate;
    private BigDecimal bestDietScore;
    private LocalDate worstDate;
    private BigDecimal worstDietScore;

    // 日明细（供前端画图）
    private List<DayPoint> dailyPoints;

    @Data
    public static class DayPoint {
        private LocalDate date;
        private BigDecimal calories;
        private BigDecimal calorieGap;
        private BigDecimal dietScore;
        private BigDecimal weight;
        private BigDecimal bodyFat;
    }

    // 月报附加：核心结论文本
    private String conclusion;
}
