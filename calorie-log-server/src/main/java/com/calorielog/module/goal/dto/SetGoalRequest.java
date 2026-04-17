package com.calorielog.module.goal.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SetGoalRequest {
    /** 1增肌塑型 2减脂增肌 */
    @NotNull @Min(1) @Max(2)
    private Integer goalType;

    /** 手动微调目标热量（训练日），不传则用系统计算 */
    private BigDecimal targetCaloriesTraining;
    private BigDecimal targetCaloriesRest;

    /** 三大营养素比例（和为 100），不传则用系统计算 */
    private BigDecimal proteinRatio;
    private BigDecimal carbRatio;
    private BigDecimal fatRatio;
}
