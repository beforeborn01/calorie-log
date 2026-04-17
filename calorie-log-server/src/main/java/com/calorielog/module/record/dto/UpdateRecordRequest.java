package com.calorielog.module.record.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateRecordRequest {
    @Min(1) @Max(4)
    private Integer mealType;

    @Positive
    private BigDecimal quantity;

    private BigDecimal grossQuantity;

    private BigDecimal calories;
    private BigDecimal protein;
    private BigDecimal carbohydrate;
    private BigDecimal fat;
    private BigDecimal dietaryFiber;
    private BigDecimal addedSugar;

    private String foodName;
}
