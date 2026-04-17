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
}
