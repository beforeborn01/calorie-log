package com.calorielog.module.statistics.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Data
public class DietScoreResponse {
    private LocalDate date;
    private BigDecimal totalScore;
    private BigDecimal calorieScore;         // 0 ~ 30
    private BigDecimal nutrientScore;        // 0 ~ 35
    private BigDecimal mealDistributionScore;// 0 ~ 20
    private BigDecimal varietyScore;         // 0 ~ 15
    private Integer varietyCount;
    private Map<String, Object> nutrientDetail;
}
