package com.calorielog.module.statistics.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class DailyStatisticsResponse {
    private LocalDate date;
    /** 1训练日 2休息日 null=未设置 */
    private Integer dayType;
    private BigDecimal totalCalories;
    private BigDecimal totalProtein;
    private BigDecimal totalCarb;
    private BigDecimal totalFat;
    private BigDecimal totalFiber;
    private BigDecimal tdee;
    private BigDecimal targetCalories;
    /** 缺口负值 / 盈余正值 */
    private BigDecimal calorieGap;
    /** deficit / surplus / balanced */
    private String calorieStatus;
    /** 状态提示文案，如"当前热量盈余 200 kcal，符合增肌需求" */
    private String statusHint;
    private Integer foodVarietyCount;
    private BigDecimal dietScore;
}
